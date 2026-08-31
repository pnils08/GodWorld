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
 *   node scripts/notebooklmPush.js --file output/lore-quarantine/foo.md --kind lore --tag Y2C103 --no-audio
 *
 * --kind lore (pipeline.59): a graded lore piece is not cycle-scoped the way an
 * edition is, so --cycle is not required — the piece's own Y<n>C<m> tag carries
 * the placement and titles the source `Lore: <slug> (Y<n>C<m>)`. Audio is always
 * off for lore (the overview focus/path are cycle-named) and the notebook summary
 * is opt-in rather than default-on, writing to a slug-named path so a lore push
 * can never overwrite an edition's output/nlm_summary_c<N>.md.
 *
 * Config: config/notebooklm.json { profile, notebookId, driveDest, audioFormat }
 * Plan: docs/plans/2026-07-10-notebooklm-bridge-deploy.md
 */

require('/root/GodWorld/lib/env');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = '/root/GodWorld';
const NLM = path.join(ROOT, '.venv/nlm/bin/nlm');
const CONFIG_PATH = path.join(ROOT, 'config/notebooklm.json');
const AUDIO_RETRY_INTERVAL_MS = 30 * 1000;
const AUDIO_RETRY_MAX = 24; // 12 minutes — audio overviews typically render in 2-6
const DISCORD_ATTACH_CAP = 8 * 1024 * 1024; // webhook attachment limit; bigger files go link-only
const DIRECTION_GUIDE_PATH = path.join(ROOT, 'config/audio_direction_weekly.md');

function degrade(reason) {
  console.log('NOTEBOOKLM PUSH FAILED (non-blocking): ' + reason);
  process.exit(0);
}

const KINDS = ['edition', 'lore'];

function parseArgs(argv) {
  const args = { kind: 'edition', audio: false, dryRun: false };
  let summary = null; // resolved per-kind below when neither flag is passed
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--file') args.file = argv[++i];
    else if (argv[i] === '--cycle') args.cycle = argv[++i];
    else if (argv[i] === '--kind') args.kind = argv[++i];
    else if (argv[i] === '--tag') args.tag = argv[++i];
    else if (argv[i] === '--notebook') args.notebook = argv[++i]; // disposable-notebook smoke target
    else if (argv[i] === '--audio') args.audio = true;
    else if (argv[i] === '--no-audio') args.audio = false;
    else if (argv[i] === '--summary') summary = true;
    else if (argv[i] === '--no-summary') summary = false;
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  const usage = 'Usage: node scripts/notebooklmPush.js --file <path> {--cycle <N> | --kind lore --tag Y<n>C<m>} [--audio|--no-audio] [--summary|--no-summary] [--dry-run]';
  if (KINDS.indexOf(args.kind) === -1) {
    console.error('--kind must be one of: ' + KINDS.join(', '));
    process.exit(1);
  }
  if (!args.file) {
    console.error(usage);
    process.exit(1); // usage errors DO exit non-zero — only runtime bridge failures degrade
  }
  if (args.kind === 'lore') {
    // A lore piece names its own cycle placement; --cycle carries no meaning here.
    // --tag is authoritative and comes from the grading step — a lore piece
    // legitimately mentions several cycles in its body, so a content scan is a
    // warned last resort, never the primary source.
    if (!args.tag) args.tag = scanTag(args.file);
    if (!args.tag) {
      console.error('--kind lore requires --tag Y<n>C<m> (no Y<n>C<m> found in the file either)');
      process.exit(1);
    }
    if (!/^Y\d+C\d+$/.test(args.tag)) {
      console.error('--tag must be Y<n>C<m> form, got: ' + args.tag);
      process.exit(1);
    }
    args.audio = false; // audio focus + download path are cycle-named; lore has no cycle
    args.summary = summary === true;
  } else {
    if (!args.cycle) {
      console.error(usage);
      process.exit(1);
    }
    args.summary = summary !== false;
  }
  return args;
}

// Warned fallback only — see parseArgs. Returns the first Y<n>C<m> in the file.
function scanTag(file) {
  try {
    const m = fs.readFileSync(file, 'utf-8').match(/Y\d+C\d+/);
    if (!m) return null;
    console.log('WARNING: --tag not supplied; using first Y<n>C<m> found in the file: ' + m[0]);
    return m[0];
  } catch (_) {
    return null;
  }
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

// Reuse-or-add the audio-direction guide as an archive-notebook source
// (pipeline.51). Title carries a content hash so guide edits re-upload and an
// unchanged guide reuses the existing source. Non-blocking: any failure
// returns null and the audio overview proceeds undirected.
function ensureDirectionSource(notebookId) {
  if (!fs.existsSync(DIRECTION_GUIDE_PATH)) return null;
  try {
    const hash = crypto.createHash('sha256')
      .update(fs.readFileSync(DIRECTION_GUIDE_PATH, 'utf-8'))
      .digest('hex');
    const title = '00_AUDIO_DIRECTION_GUIDE — weekly — ' + hash.slice(0, 12);
    const list = nlm(['source', 'list', notebookId, '--json']);
    if (list.ok) {
      try {
        const sources = JSON.parse(list.out);
        const found = (Array.isArray(sources) ? sources : []).find(
          (s) => s && (s.title === title || s.name === title)
        );
        if (found && (found.id || found.source_id)) return found.id || found.source_id;
      } catch (_) { /* fall through to add */ }
    }
    const add = nlm(['source', 'add', notebookId, '--file', DIRECTION_GUIDE_PATH, '--title', title, '--wait']);
    if (!add.ok) {
      console.log('AUDIO DIRECTION GUIDE SKIPPED (non-blocking): ' + add.out.slice(0, 200));
      return null;
    }
    const m = add.out.match(/Source ID:\s*(\S+)/);
    return m ? m[1] : null;
  } catch (e) {
    console.log('AUDIO DIRECTION GUIDE SKIPPED (non-blocking): ' + e.message);
    return null;
  }
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
  if (args.notebook) config.notebookId = args.notebook;
  if (!config.notebookId) degrade('config has no notebookId');

  const baseName = path.basename(args.file, path.extname(args.file));
  const title = args.kind === 'lore'
    ? 'Lore: ' + baseName + ' (' + args.tag + ')'
    : 'C' + args.cycle + ' — ' + baseName;

  if (args.dryRun) {
    console.log('[DRY] Would add source to notebook ' + config.notebookId);
    console.log('[DRY]   title: ' + title);
    console.log('[DRY]   file:  ' + args.file);
    console.log('[DRY]   audio: ' + args.audio + ', summary: ' + args.summary);
    console.log('NotebookLM push DRY RUN complete (' + args.kind + ')');
    return;
  }

  // 1. Source add
  const add = nlm(['source', 'add', config.notebookId, '--file', args.file, '--title', title, '--wait']);
  if (!add.ok) degrade('source add failed: ' + add.out.slice(0, 300));
  const idMatch = add.out.match(/Source ID: (\S+)/);
  const sourceId = idMatch ? idMatch[1] : null;
  console.log('Source added: ' + title + (sourceId ? ' (' + sourceId + ')' : ''));

  // 2. Audio overview (editions only — quota is scarce, /post-publish passes --audio for --type edition)
  if (args.audio) {
    await generateAndDeliverEditionAudio({
      notebookId: config.notebookId,
      sourceId: sourceId,
      cycle: args.cycle,
      config: config,
      format: config.audioFormat || 'deep_dive',
      length: 'default',
      label: 'Audio overview — Edition C' + args.cycle,
      focus: 'Edition C' + args.cycle,
    });
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
      const summaryLabel = args.kind === 'lore' ? args.tag + ' lore — ' + baseName : 'C' + args.cycle;
      const summaryPath = args.kind === 'lore'
        ? path.join(ROOT, 'output', 'nlm_summary_lore_' + baseName + '.md')
        : path.join(ROOT, 'output', 'nlm_summary_c' + args.cycle + '.md');
      fs.writeFileSync(summaryPath, '# NotebookLM summary — ' + summaryLabel + '\n\n' + q.out + '\n');
      console.log('Summary saved: ' + summaryPath);
    }
  }

  console.log('NotebookLM push complete for ' + (args.kind === 'lore' ? 'lore ' + args.tag + ' — ' + baseName : 'C' + args.cycle));
}

async function generateAndDeliverEditionAudio(opts) {
  const notebookId = opts.notebookId;
  const sourceId = opts.sourceId;
  const cycle = opts.cycle;
  const config = opts.config;
  const format = opts.format || (config && config.audioFormat) || 'deep_dive';
  const length = opts.length || 'default';
  if (!sourceId) {
    console.log('NOTEBOOKLM AUDIO SKIPPED (non-blocking): no source id');
    return null;
  }
  const directionId = ensureDirectionSource(notebookId);
  const audioArgs = [
    'audio', 'create', notebookId,
    '--format', format,
    '--length', length,
    '--confirm',
  ];
  const ids = [sourceId, directionId].filter(Boolean);
  audioArgs.push('--source-ids', ids.join(','));
  audioArgs.push('--focus', (opts.focus || ('Edition C' + cycle)) + (directionId
    ? '. Follow the 00_AUDIO_DIRECTION_GUIDE source for host persona, tone, and thematic allocation.'
    : ''));
  const create = nlm(audioArgs);
  if (!create.ok) {
    console.log('NOTEBOOKLM AUDIO SKIPPED (non-blocking): create failed: ' + String(create.out || '').slice(0, 300));
    return null;
  }
  const audioPath = opts.outputPath || path.join(ROOT, 'output/audio', 'nlm_overview_c' + cycle + '.m4a');
  fs.mkdirSync(path.dirname(audioPath), { recursive: true });
  let downloaded = false;
  for (let i = 0; i < AUDIO_RETRY_MAX; i++) {
    await sleep(AUDIO_RETRY_INTERVAL_MS);
    const dl = nlm(['download', 'audio', notebookId, '--output', audioPath, '--no-progress'], { timeoutMs: 300 * 1000 });
    if (dl.ok && fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
      downloaded = true;
      break;
    }
  }
  if (!downloaded) {
    console.log('NOTEBOOKLM AUDIO SKIPPED (non-blocking): render did not finish within ' +
      (AUDIO_RETRY_MAX * AUDIO_RETRY_INTERVAL_MS / 60000) + ' min');
    return null;
  }
  console.log('Audio downloaded: ' + audioPath);
  const delivery = await deliver(audioPath, cycle, config, {
    label: opts.label || ('Audio overview — Edition C' + cycle),
    content: opts.content || ('🎧 **The Cycle Pulse — Y2C' + cycle + '**'),
    driveDest: opts.driveDest,
  });
  return { audioPath, driveLink: delivery && delivery.driveLink };
}

async function sendDiscordText(content) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('NOTEBOOKLM DISCORD DROP SKIPPED (non-blocking): DISCORD_WEBHOOK_URL not set');
    return false;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('webhook HTTP ' + res.status);
    console.log('Discord drop done');
    return true;
  } catch (e) {
    console.log('NOTEBOOKLM DISCORD DROP SKIPPED (non-blocking): ' + e.message);
    return false;
  }
}

// Post a file to the configured Discord webhook (multipart). Same
// non-blocking contract as sendDiscordText.
async function sendDiscordFile(filePath, content) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('NOTEBOOKLM DISCORD DROP SKIPPED (non-blocking): DISCORD_WEBHOOK_URL not set');
    return false;
  }
  try {
    const fd = new FormData();
    fd.append('payload_json', JSON.stringify({ content }));
    fd.append('files[0]',
      new Blob([fs.readFileSync(filePath)], { type: 'text/markdown' }),
      path.basename(filePath));
    const res = await fetch(webhookUrl, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('webhook HTTP ' + res.status);
    console.log('Discord file drop done: ' + path.basename(filePath));
    return true;
  } catch (e) {
    console.log('NOTEBOOKLM DISCORD DROP SKIPPED (non-blocking): ' + e.message);
    return false;
  }
}

async function deliver(audioPath, cycle, config, opts) {
  const options = opts || {};
  // Drive drop
  let driveLink = null;
  const up = spawnSync('node', [
    path.join(ROOT, 'scripts/saveToDrive.js'),
    audioPath,
    options.driveDest || config.driveDest || 'edition',
  ], {
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
    return { driveLink };
  }
  try {
    const label = options.label || ('Audio overview — Edition C' + cycle);
    const content = (options.content || ('🎧 **' + label + '**')) + (driveLink ? '\n' + driveLink : '');
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
  return { driveLink };
}

if (require.main === module) {
  main().catch((e) => degrade('unexpected: ' + e.message));
}

module.exports = {
  ROOT,
  NLM,
  nlm,
  sleep,
  deliver,
  generateAndDeliverEditionAudio,
  sendDiscordText,
  sendDiscordFile,
};
