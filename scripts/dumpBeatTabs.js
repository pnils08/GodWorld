#!/usr/bin/env node
/**
 * scripts/dumpBeatTabs.js — the beat tabs → local disk (JSONL), one free read
 * per cycle.
 *
 * pipeline.68 Task 1 (S433, builder ruling: gate the facts, not the color).
 * Every scripts/build*Slice.js is disk-first by design and read only the
 * engine summary + desk_signal — zero sheet tabs — so the health, transit,
 * schools, safety, environment, faith and business reporters were handed a
 * decay index instead of their beat. This dump puts the beat's own tabs on
 * disk where those builders already look, so a slice can fire inside the
 * cycle run (Step 5.56, right after dumpLedger.js) or standalone against the
 * same files. Nothing in these tabs is confidential (builder, 2026-09-07).
 *
 * Mirrors scripts/dumpLedger.js: same env load, same lib/sheets client,
 * same monotonic cycle stamp (G-PF35 — never stamp backward), read-only.
 *
 * Usage:
 *   node scripts/dumpBeatTabs.js [cycle] [--quiet]
 *
 * Outputs:
 *   output/beats/<Tab>.jsonl   — one row object per line, header keys verbatim
 *   output/beats/meta.json     — cycle, generatedAt, rows per tab
 *   output/beats/prev/         — the prior cycle's dump, kept so a builder can
 *                                compute "what moved" (Transit_Metrics,
 *                                Crime_Metrics deltas) without a second read.
 *                                Rotated only when the cycle advances; a
 *                                same-cycle re-run overwrites in place.
 */

'use strict';

require('/root/GodWorld/lib/env');  // GODWORLD_SHEET_ID + GOOGLE_APPLICATION_CREDENTIALS
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'output', 'beats');
const PREV_DIR = path.join(OUT_DIR, 'prev');
const META = path.join(OUT_DIR, 'meta.json');

// The beat tabs and who they feed (plan Task 4 names the columns per seat).
const BEAT_TABS = [
  'Business_Ledger',          // business / food — with Employment_Roster for the faces
  'Employment_Roster',
  'Casino_Ledger',            // business — casino activity (builder, S433)
  'Transit_Metrics',          // Trevor
  'Crime_Metrics',            // Rachel
  'Neighborhood_Demographics',// Angela (schools), Lila (Sick)
  // Youth_Events is NOT dumped: dead by ruling (phase05-citizens/runYouthEngine.js:105, last row C102) — a reporter would print C102 as news. Angela reads Neighborhood_Demographics.
  'Hospital_Ledger',          // Lila — who is in the hospital
  'Health_Cause_Queue',       // Lila
  'Community_Programs',       // Elliot Graye, Maria
  'Faith_Organizations',      // Elliot Graye
  'Cycle_Weather',            // Noah
  'Household_Ledger',         // every hood story — who lives there, what they pay
  'Story_Seed_Deck',          // the engine's per-desk seeds: Citizens + Businesses attached
  'Story_Hook_Deck',          // the engine's hooks: SuggestedJournalist + SuggestedAngle
];

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const cycleArg = args.find(a => !a.startsWith('--')) || null;
function log(...m) { if (!quiet) console.error(...m); }

function readMeta(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }

function rotatePrev(priorMeta, stamp) {
  // Keep exactly one prior dump, and only when the cycle actually advanced.
  if (!priorMeta || !Number.isFinite(stamp) || !Number.isFinite(Number(priorMeta.cycle))) return false;
  if (Number(priorMeta.cycle) >= stamp) return false;
  fs.rmSync(PREV_DIR, { recursive: true, force: true });
  fs.mkdirSync(PREV_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f === 'prev') continue;
    fs.renameSync(path.join(OUT_DIR, f), path.join(PREV_DIR, f));
  }
  return true;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Every beat tab must exist — a missing one is a schema event, not a soft skip.
  const titles = new Set((await sheets.listSheets()).map(s => s.title));
  const missing = BEAT_TABS.filter(t => !titles.has(t));
  if (missing.length) {
    console.error('dumpBeatTabs: ABORT — tab(s) missing from the live sheet: ' + missing.join(', '));
    process.exit(1);
  }

  // Read everything first; write nothing until every read succeeded, so a
  // mid-run failure never leaves a half-rotated dump.
  const data = {};
  for (const tab of BEAT_TABS) {
    log('dumpBeatTabs: reading ' + tab + '…');
    const rows = await sheets.getSheetAsObjects(tab);
    if (!Array.isArray(rows)) {
      console.error('dumpBeatTabs: ABORT — ' + tab + ' did not return a row array.');
      process.exit(1);
    }
    data[tab] = rows;   // 0 rows is a legal state (Hospital_Ledger can be empty); the file is written empty
  }

  // G-PF35 monotonic stamp, same rule as dumpLedger.js.
  const priorMeta = readMeta(META);
  const priorCycle = priorMeta ? Number(priorMeta.cycle) : NaN;
  const wanted = cycleArg ? Number(cycleArg) : null;
  let stamp = wanted;
  if (Number.isFinite(priorCycle) && Number.isFinite(wanted) && wanted < priorCycle) {
    console.error(`dumpBeatTabs: REFUSING to stamp backward — asked for cycle ${wanted}, dump is at ${priorCycle}. `
      + `Rows refreshed from the live sheet; meta keeps cycle ${priorCycle}.`);
    stamp = priorCycle;
  }
  if (!Number.isFinite(wanted) && Number.isFinite(priorCycle)) stamp = priorCycle;

  const rotated = rotatePrev(priorMeta, stamp);

  const counts = {};
  for (const tab of BEAT_TABS) {
    const lines = data[tab].map(r => JSON.stringify(r));
    fs.writeFileSync(path.join(OUT_DIR, tab + '.jsonl'), lines.length ? lines.join('\n') + '\n' : '');
    counts[tab] = data[tab].length;
  }
  const meta = {
    source: 'beat tabs (' + BEAT_TABS.length + ')',
    cycle: Number.isFinite(stamp) ? stamp : null,
    prevCycle: rotated ? Number(priorMeta.cycle) : (fs.existsSync(path.join(PREV_DIR, 'meta.json')) ? Number((readMeta(path.join(PREV_DIR, 'meta.json')) || {}).cycle) : null),
    rows: counts,
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/dumpBeatTabs.js',
    note: 'pipeline.68 Task 1 — beat-tab dump for the slice builders. Stable filenames, overwritten each cycle; prior cycle kept in prev/.',
  };
  fs.writeFileSync(META, JSON.stringify(meta, null, 2) + '\n');

  log(`dumpBeatTabs: wrote ${BEAT_TABS.length} tabs → ${path.relative(ROOT, OUT_DIR)}/` + (rotated ? ` (prior cycle ${priorMeta.cycle} kept in prev/)` : ''));
  if (!quiet) console.log(JSON.stringify({ ok: true, cycle: meta.cycle, prevCycle: meta.prevCycle, rows: counts }));
}

main().catch(err => { console.error('dumpBeatTabs: FAILED —', err.message); process.exit(1); });
