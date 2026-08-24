#!/usr/bin/env node
/**
 * deliver-articles.js — drop the newsroom's articles into Mike's Discord.
 *
 * Mike-direct 2026-08-23: "I'd rather have access to the articles." No meta
 * reports — the articles themselves, the evening they are written, published
 * and flagged alike, each labeled with its disposition and (for flagged) the
 * gate's findings in one line each.
 *
 * Scans output/cron-compare/{staged,flagged} for articles modified in the
 * last --hours (default 8) and posts each as a Discord message with the
 * article text attached as a file. Also posts editions/cycle_pulse_c*.txt
 * modified in the window (Saturday's paper).
 *
 * Read-only over the newsroom artifacts; writes nothing but a state file so
 * re-runs never double-post. NOT CANON, no sheet writes.
 *
 * Usage:
 *   node scripts/deliver-articles.js [--hours=8] [--dry-run]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { sendDiscordFile, sendDiscordText } = require('./notebooklmPush');

const ROOT = path.resolve(__dirname, '..');
const COMPARE = path.join(ROOT, 'output', 'cron-compare');
const EDITIONS = path.join(ROOT, 'editions');
const STATE_PATH = path.join(ROOT, 'output', 'article-delivery-state.json');

function arg(name, fallback) {
  const hit = process.argv.find(a => a.startsWith(name + '='));
  return hit ? hit.split('=')[1] : fallback;
}
const DRY = process.argv.includes('--dry-run');
const HOURS = Number(arg('--hours', 8));

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch (_) { return { delivered: {} }; }
}
function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

// `sports_c104_p-slayer_packet-v2_...` → { desk: 'sports', cycle: '104', persona: 'p-slayer' }
function parseStem(base) {
  const m = base.match(/^([a-z]+)_c(\d+)_([a-z0-9-]+)_/i);
  return m ? { desk: m[1], cycle: m[2], persona: m[3] } : { desk: '?', cycle: '?', persona: base };
}

function bylineFor(file, fallbackPersona) {
  // staged sidecar carries the byline; flagged drafts fall back to the persona slug
  const sidecar = file.replace(/\.staged(-\d{3,4})?\.md$/, '.staged.json');
  try {
    const side = JSON.parse(fs.readFileSync(sidecar, 'utf8'));
    if (side.byline) return side.byline;
  } catch (_) { /* no sidecar */ }
  return fallbackPersona.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function flagLines(file) {
  const stem = path.basename(file).replace(/(?:-\d{3,4})?\.md$/, '');
  const flagFile = path.join(path.dirname(file), stem + '.flags.json');
  try {
    const data = JSON.parse(fs.readFileSync(flagFile, 'utf8'));
    const flags = Array.isArray(data.flags) ? data.flags : [];
    if (!flags.length && data.summary) return [data.summary];
    return flags.map(f => (f.severity ? '[' + f.severity + '] ' : '') + (f.issue || f.claim || ''));
  } catch (_) { return []; }
}

// Reader copy: article prose only — the INTAKE block and self-score comment
// are machine sidecars, not for the reader.
function readerCopy(text) {
  return text.replace(/## INTAKE[\s\S]*$/, '').replace(/<!--\s*SELF-SCORE[\s\S]*?-->/g, '').trim();
}

async function post(content, filePath, state, key) {
  if (DRY) { console.log('(dry-run) would post: ' + key); return; }
  const ok = filePath ? await sendDiscordFile(filePath, content) : await sendDiscordText(content);
  if (ok) { state.delivered[key] = new Date().toISOString(); saveState(state); }
}

async function main() {
  const cutoff = Date.now() - HOURS * 3600e3;
  const state = loadState();
  const scratch = fs.mkdtempSync(path.join(require('os').tmpdir(), 'articles-'));
  let posted = 0;

  const dirs = [
    { dir: path.join(COMPARE, 'staged'), label: '✅ PUBLISHED-TRACK', re: /\.staged(?:-\d{3,4})?\.md$/ },
    { dir: path.join(COMPARE, 'flagged'), label: '🚫 GATE-FLAGGED', re: /(?<!\.flags)\.md$/ },
  ];
  for (const spec of dirs) {
    if (!fs.existsSync(spec.dir)) continue;
    for (const name of fs.readdirSync(spec.dir).sort()) {
      const file = path.join(spec.dir, name);
      if (!spec.re.test(name)) continue;
      if (fs.statSync(file).mtimeMs < cutoff) continue;
      if (state.delivered[name]) continue;
      const meta = parseStem(name);
      const byline = bylineFor(file, meta.persona);
      const lines = [
        spec.label + ' — **' + byline + '** | ' + meta.desk + ' desk | C' + meta.cycle,
      ];
      if (spec.label.includes('FLAGGED')) {
        const flags = flagLines(file);
        for (const f of flags.slice(0, 5)) lines.push('> gate: ' + f.slice(0, 300));
        if (!flags.length) lines.push('> gate: (no findings recorded)');
      }
      const copyPath = path.join(scratch, name.replace(/\.staged(-\d{3,4})?\.md$/, '.md'));
      fs.writeFileSync(copyPath, readerCopy(fs.readFileSync(file, 'utf8')) + '\n');
      await post(lines.join('\n'), copyPath, state, name);
      posted++;
      console.log('delivered: ' + name);
    }
  }

  if (fs.existsSync(EDITIONS)) {
    for (const name of fs.readdirSync(EDITIONS).sort()) {
      if (!/^cycle_pulse_c\d+\.txt$/.test(name)) continue;
      const file = path.join(EDITIONS, name);
      if (fs.statSync(file).mtimeMs < cutoff) continue;
      if (state.delivered[name]) continue;
      await post('🗞️ **THE CYCLE PULSE — the week\'s edition** (`' + name + '`)', file, state, name);
      posted++;
      console.log('delivered: ' + name);
    }
  }

  console.log(posted ? posted + ' item(s) delivered' : 'nothing new to deliver');
}

main().catch(e => { console.error('deliver-articles failed: ' + e.message); process.exit(1); });
