#!/usr/bin/env node
/**
 * notebooklmPush.js — push a published artifact into NotebookLM (research.23)
 *
 * The bridge to Mike's actual edition-ingest path: adds the artifact as a
 * source to the Bay Tribune notebook; on --audio also generates the audio
 * overview, downloads it, uploads it to Drive and pings the Discord webhook
 * (both drops, Mike-direct S310); and captures the notebook's own summary
 * of the edition to output/nlm_summary_c{N}.md.
 *
 * NON-BLOCKING BY CONTRACT: any failure prints
 *   NOTEBOOKLM PUSH FAILED (non-blocking): <reason>
 * and exits 0. /post-publish never blocks on this bridge — auth expiry
 * (cookies rot every 2-4 weeks), rate limits, and NotebookLM internal-API
 * changes are all expected failure modes, not pipeline errors.
 *
 * Usage:
 *   node scripts/notebooklmPush.js --file editions/foo_c101.txt --cycle 101 [--audio] [--no-summary]
 *
 * Config: config/notebooklm.json { profile, notebookId, driveDest, audioFormat }
 * Plan: docs/plans/2026-07-10-notebooklm-bridge-deploy.md
 */

require('/root/GodWorld/lib/env');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = '/root/GodWorld';
const NLM = path.join(ROOT, '.venv/nlm/bin/nlm');
const CONFIG_PATH = path.join(ROOT, 'config/notebooklm.json');
const AUDIO_RETRY_INTERVAL_MS = 30 * 1000;
const AUDIO_RETRY_MAX = 24; // 12 minutes — audio overviews typically render in 2-6
const DISCORD_ATTACH_CAP = 8 * 1024 * 1024; // webhook attachment limit; bigger files go link-only

function degrade(reason) {
  console.log('NOTEBOOKLM PUSH FAILED (non-blocking): ' + reason);
  process.exit(0);
}

function parseArgs(argv) {
  const args = { audio: false, summary: true };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--file') args.file = argv[++i];
    else if (argv[i] === '--cycle') args.cycle = argv[++i];
    else if (argv[i] === '--audio') args.audio = true;
    else if (argv[i] === '--no-summary') args.summary = false;
  }
  if (!args.file || !args.cycle) {
    console.error('Usage: node scripts/notebooklmPush.js --file <path> --cycle <N> [--audio] [--no-summary]');
    process.exit(1); // usage errors DO exit non-zero — only runtime bridge failures degrade
  }
  return args;
}

function nlm(cliArgs, opts) {
  const res = spawnSync(NLM, cliArgs, {
    encoding: 'utf-8',
    timeout: (opts && opts.timeoutMs) || 180 * 1000,
    env: Object.assign({}, process.env, { NO_COLOR: '1' }),
  });
  if (res.error) return { ok: false, out: String(res.error.message || res.error) };
  const out = (res.stdout || '') + (res.stderr || '');
  return { ok: res.status === 0, out: out.trim() };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv);

  if (!fs.existsSync(args.file)) degrade('artifact not found: ' + args.file);
  if (!fs.existsSync(NLM)) degrade('nlm CLI not installed at ' + NLM);
  if (!fs.existsSync(CONFIG_PATH)) degrade('config/notebooklm.json missing — run plan Task 3');

  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch (e) {
    degrade('config parse error: ' + e.message);
  }
  if (!config.notebookId) degrade('config has no notebookId');

  const baseName = path.basename(args.file, path.extname(args.file));
  const title = 'C' + args.cycle + ' — ' + baseName;

  // 1. Source add
  const add = nlm(['source', 'add', config.notebookId, '--file', args.file, '--title', title, '--wait']);
  if (!add.ok) degrade('source add failed: ' + add.out.slice(0, 300));
  const idMatch = add.out.match(/Source ID: (\S+)/);
  const sourceId = idMatch ? idMatch[1] : null;
  console.log('Source added: ' + title + (sourceId ? ' (' + sourceId + ')' : ''));

  // 2. Audio overview (editions only — quota is scarce, /post-publish passes --audio for --type edition)
  if (args.audio) {
    // Scope to the just-added source — the notebook holds the whole archive; an
    // unscoped overview would podcast ALL editions, not this cycle's.
    const audioArgs = ['audio', 'create', config.notebookId, '--format', config.audioFormat || 'deep_dive', '--confirm'];
    if (sourceId) audioArgs.push('--source-ids', sourceId);
    audioArgs.push('--focus', 'Edition C' + args.cycle);
    const create = nlm(audioArgs);
    if (!create.ok) {
      console.log('NOTEBOOKLM AUDIO SKIPPED (non-blocking): create failed: ' + create.out.slice(0, 300));
    } else {
      const audioPath = path.join(ROOT, 'output/audio', 'nlm_overview_c' + args.cycle + '.m4a');
      fs.mkdirSync(path.dirname(audioPath), { recursive: true });
      let downloaded = false;
      for (let i = 0; i < AUDIO_RETRY_MAX; i++) {
        await sleep(AUDIO_RETRY_INTERVAL_MS);
        const dl = nlm(['download', 'audio', config.notebookId, '--output', audioPath, '--no-progress'], { timeoutMs: 300 * 1000 });
        if (dl.ok && fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
          downloaded = true;
          break;
        }
      }
      if (!downloaded) {
        console.log('NOTEBOOKLM AUDIO SKIPPED (non-blocking): render did not finish within ' + (AUDIO_RETRY_MAX * AUDIO_RETRY_INTERVAL_MS / 60000) + ' min');
      } else {
        console.log('Audio downloaded: ' + audioPath);
        await deliver(audioPath, args.cycle, config);
      }
    }
  }

  // 3. Summary capture (Mike-direct S310: the notebook writes the best edition summaries — keep them)
  if (args.summary) {
    const q = nlm(
      ['notebook', 'query', config.notebookId,
       'Summarize the new source "' + title + '" — lead stories, key citizens named, civic decisions, and anything that changed since prior editions.'],
      { timeoutMs: 180 * 1000 }
    );
    if (!q.ok) {
      console.log('NOTEBOOKLM SUMMARY SKIPPED (non-blocking): ' + q.out.slice(0, 300));
    } else {
      const summaryPath = path.join(ROOT, 'output', 'nlm_summary_c' + args.cycle + '.md');
      fs.writeFileSync(summaryPath, '# NotebookLM summary — C' + args.cycle + '\n\n' + q.out + '\n');
      console.log('Summary saved: ' + summaryPath);
    }
  }

  console.log('NotebookLM push complete for C' + args.cycle);
}

async function deliver(audioPath, cycle, config) {
  // Drive drop
  let driveLink = null;
  const up = spawnSync('node', [path.join(ROOT, 'scripts/saveToDrive.js'), audioPath, config.driveDest || 'edition'], {
    encoding: 'utf-8',
    timeout: 300 * 1000,
  });
  const upOut = ((up.stdout || '') + (up.stderr || '')).trim();
  if (up.status !== 0) {
    console.log('NOTEBOOKLM DRIVE DROP SKIPPED (non-blocking): ' + upOut.slice(0, 300));
  } else {
    const m = upOut.match(/Link: (\S+)/);
    driveLink = m ? m[1] : null;
    console.log('Drive drop done' + (driveLink ? ': ' + driveLink : ''));
  }

  // Discord drop
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('NOTEBOOKLM DISCORD DROP SKIPPED (non-blocking): DISCORD_WEBHOOK_URL not set');
    return;
  }
  try {
    const content = '🎧 **Audio overview — Edition C' + cycle + '**' + (driveLink ? '\n' + driveLink : '');
    const size = fs.statSync(audioPath).size;
    if (size < DISCORD_ATTACH_CAP) {
      const form = new FormData();
      form.append('payload_json', JSON.stringify({ content }));
      form.append('files[0]', new Blob([fs.readFileSync(audioPath)], { type: 'audio/mp4' }), path.basename(audioPath));
      const res = await fetch(webhookUrl, { method: 'POST', body: form });
      if (!res.ok) throw new Error('webhook HTTP ' + res.status);
    } else {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content + '\n(file too large to attach — ' + Math.round(size / 1024 / 1024) + 'MB)' }),
      });
      if (!res.ok) throw new Error('webhook HTTP ' + res.status);
    }
    console.log('Discord drop done');
  } catch (e) {
    console.log('NOTEBOOKLM DISCORD DROP SKIPPED (non-blocking): ' + e.message);
  }
}

main().catch((e) => degrade('unexpected: ' + e.message));
