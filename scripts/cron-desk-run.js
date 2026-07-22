#!/usr/bin/env node
/**
 * Single-Desk Headless Run (chain) — scripts/cron-desk-run.js
 *
 * Task 4 of docs/plans/2026-07-20-headless-newsroom-pipeline.md. The atomic unit
 * of the continuous newsroom: ONE journalist wakes, writes, is canon-gated, and
 * the result is routed. Chains the two proven pieces:
 *   1. cron-desk-writer.js  (writer-worker; model per desk-model-map.json)
 *   2. cron-rhea-gate.js    (independent headless Rhea canon/fact gate)
 * then routes: pass -> output/cron-compare/published/ ; flagged -> .../flagged/.
 *
 * This is glue over verified scripts — no model logic of its own. In Phase 2 a
 * per-wake cron calls this per active journalist; "published" articles then
 * ingest to canon (ingest mechanism = open question in the plan).
 *
 * Usage:
 *   node scripts/cron-desk-run.js --desk sports
 *   node scripts/cron-desk-run.js --desk business --gate-model haiku
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const COMPARE = path.join(ROOT, 'output', 'cron-compare');
const PUBLISHED = path.join(COMPARE, 'published');
const FLAGGED = path.join(COMPARE, 'flagged');

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const DESK = arg('--desk', 'sports');
const GATE_MODEL = arg('--gate-model', 'sonnet');   // authoritative gate; 'haiku' to cost-test

const log = (...a) => console.log('[run]', new Date().toISOString(), ...a);

function detectCycle() {
  try {
    const nums = fs.readdirSync(path.join(ROOT, 'output'))
      .map(f => (f.match(/^world_summary_c(\d+)\.md$/) || [])[1])
      .filter(Boolean).map(Number);
    if (nums.length) return String(Math.max(...nums));
  } catch (_) {}
  return 'current';
}
function deskRoute(desk) {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'desk-model-map.json'), 'utf8'));
  return m[desk] || m._default;
}
const slug = m => m.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }

function main() {
  const cycle = arg('--cycle', null) || detectCycle();
  const route = deskRoute(DESK);
  const draftName = DESK + '_c' + cycle + '_' + slug(route.model) + '.md';
  const draftPath = path.join(COMPARE, draftName);
  const base = draftName.replace(/\.md$/, '');

  console.log('Single-Desk Headless Run — ' + DESK + ' c' + cycle);
  console.log('===================================');
  console.log('write: ' + route.provider + '/' + route.model + ' · gate: ' + GATE_MODEL);

  // 1. WRITE (model resolved from the desk-model-map inside the writer)
  log('writing...');
  execFileSync('node', [path.join(__dirname, 'cron-desk-writer.js'), '--desk', DESK],
    { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
  if (!fs.existsSync(draftPath)) throw new Error('writer produced no draft at ' + path.relative(ROOT, draftPath));

  // 2. GATE (independent Rhea; non-zero exit = flagged/parse, not fatal here)
  log('gating...');
  try {
    execFileSync('node', [path.join(__dirname, 'cron-rhea-gate.js'), '--draft', path.relative(ROOT, draftPath),
      '--model', GATE_MODEL, '--cycle', cycle], { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
  } catch (_) { /* gate exits 2 (flagged) / 3 (parse) — verdict json is still written */ }

  const rhea = readJson(path.join(COMPARE, base + '.rhea.json'));
  const scorecard = readJson(path.join(COMPARE, base + '.scorecard.json'));

  // 3. ROUTE
  const pass = rhea && rhea.pass === true;
  const destDir = pass ? PUBLISHED : FLAGGED;
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(draftPath, path.join(destDir, draftName));
  if (!pass) {
    fs.writeFileSync(path.join(FLAGGED, base + '.flags.json'),
      JSON.stringify({ draft: draftName, flags: (rhea && rhea.flags) || [], summary: (rhea && rhea.summary) || 'no rhea verdict' }, null, 2));
  }

  const record = {
    desk: DESK, cycle, provider: route.provider, model: route.model, gateModel: GATE_MODEL,
    disposition: pass ? 'published' : 'flagged',
    rheaPass: rhea ? rhea.pass : null,
    rheaFlagCount: rhea ? rhea.flagCount : null,
    rheaHighSeverity: rhea ? rhea.highSeverityCount : null,
    scorecard: scorecard ? {
      reporterVoice: scorecard.reporterVoice, factsCorrect: scorecard.factsCorrect,
      hallucinationCount: scorecard.hallucinationCount, wordCount: scorecard.wordCount,
      apiCostUsd: scorecard.apiCostUsd
    } : null,
    gateCostUsd: rhea ? rhea.apiCostUsd : null,
    draft: path.relative(ROOT, path.join(destDir, draftName)),
    ranAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(COMPARE, base + '.run.json'), JSON.stringify(record, null, 2));

  console.log('\n=== disposition: ' + record.disposition.toUpperCase() + ' ===');
  console.log(JSON.stringify(record, null, 2));
}

try { main(); }
catch (err) { console.error('[run] Fatal:', err.message); process.exit(1); }
