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
 *   node scripts/dumpBeatTabs.js <cycle> [--quiet]   (the cycle may be omitted only when meta.json
 *   already carries a positive Cycle — pipeline.73 step 2; the dump never stamps null or 0)
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
const { livedEventsFrom, LIVED_WINDOW } = require('../lib/wakePerception'); // pipeline.73 step 2 — the wake's own event set

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
  'Faith_Ledger',             // Elliot Graye — the week's faith events (Phase4-FaithEvents → ensureFaithLedger)
  'Cycle_Weather',            // Noah
  'Household_Ledger',         // every hood story — who lives there, what they pay
  'Story_Seed_Deck',          // the engine's per-desk seeds: Citizens + Businesses attached
  'Story_Hook_Deck',          // the engine's hooks: SuggestedJournalist + SuggestedAngle
];

// Lazy-created tabs (engine.119: the cycle never creates a tab; the closure
// intent creates Business_Archive on first use). Absent on the live sheet is a
// legal state — dumped as an empty file, never an abort.
const OPTIONAL_TABS = [
  'Business_Archive',         // business — closures + exit metadata (engine.96 Phase11)
  'Cultural_Ledger',          // Kai / Sharon — fame scores + trajectories per cultural figure
  'Oakland_Sports_Feed',      // sports seats — raw feed rows (A's AND Oaks; FranchiseStability, EconomicFootprint survive here)
  // Chicago_Sports_Feed is NOT dumped: dead legacy tab (Bulls rows end C91; Chicago is retired from the sim). The Oaks live on Oakland_Sports_Feed.
  'Initiative_Tracker',       // Carmen / Luis — votes, phases, budgets (the civic record raw)
  'Civic_Office_Ledger',      // Carmen / Jax — office holders, approvals, Status=scandal
  'Election_Log',             // Carmen — outcomes and margins
  'Reflection_Intake',        // civic.38 — Civic visibility only; never petition signatures
  // engine.254 Task 10 — the city's money, the court and the care/custody trail.
  // All three are cumulative (Cycle-stamped rows); empty on the live sheet
  // until their first fire, and an empty tab dumps as an empty file.
  'City_Treasury',            // Carmen / business — Cycle · Entry · Amount · Counterparty · BalanceAfter · Note
  'Judicial_Ledger',          // Rachel / Carmen — every case: charge, status, outcome, cycles held
  'Care_Justice_Census',      // Rachel / Lila / Maria — per-hood trail: intakes, occupancy, beds (tracked vs other residents)
];

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const cycleArg = args.find(a => !a.startsWith('--')) || null;
function log(...m) { if (!quiet) console.error(...m); }

// pipeline.73 step 2 — two derived files beside the tabs (not tabs: never listed in ALL_TABS).
// LifeHistory_Log.jsonl = the raw tab's rows for the stamped Cycle and the one before, header keys verbatim.
// Lived_Events.jsonl     = the lived wake's news-grade events for that window, names joined from the
//                          same Simulation_Ledger read (the archive for the deceased).
const hdrOf = (rows) => (rows && rows[0]) || [];
function toObjects(rows) { const h = hdrOf(rows); return (rows || []).slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))); }
function lifeWindowRows(logRaw, stamp) {
  const h = hdrOf(logRaw), iC = h.indexOf('Cycle');
  if (iC < 0) throw new Error('LifeHistory_Log has no Cycle column');
  const lo = stamp - LIVED_WINDOW;
  return toObjects([h].concat((logRaw || []).slice(1).filter(r => { const c = Number(r[iC]); return c >= lo && c <= stamp; })));
}
function livedEventRows(src, stamp) {
  const people = new Map();
  for (const rows of [src.archive || [], src.ledger || []]) {   // ledger second: a living row wins over an archived one
    const h = hdrOf(rows), f = (n) => h.indexOf(n);
    const iP = f('POPID'), iF = f('First'), iL = f('Last'), iN = f('Neighborhood'), iR = f('RoleType');
    for (const r of rows.slice(1)) {
      const pop = String(r[iP] || '').toUpperCase(); if (!pop) continue;
      people.set(pop, { name: [r[iF], r[iL]].filter(Boolean).join(' ').trim(), hood: iN >= 0 ? String(r[iN] || '') : '', role: iR >= 0 ? String(r[iR] || '') : '' });
    }
  }
  return livedEventsFrom(src, stamp).map(ev => {
    const s = people.get(ev.subject) || {};
    const out = { id: ev.id, kind: ev.kind, cycle: ev.cycle, subject: ev.subject, subjectName: s.name || ev.deceasedName || '', neighborhood: s.hood || '', roleType: s.role || '' };
    if (ev.phase) out.phase = ev.phase;
    if (ev.cause) out.cause = ev.cause;
    if (ev.deceasedName) out.deceasedName = ev.deceasedName;
    out.recipients = (ev.recipients || []).map(r => ({ pop: r.pop, rel: r.rel, name: (people.get(r.pop) || {}).name || '' }));
    return out;
  });
}
module.exports = { lifeWindowRows, livedEventRows, toObjects, resolveStamp, requireCols, publishGeneration };

function readMeta(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }

const posInt = (v) => { if (v === null || v === undefined || String(v).trim() === '') return null; const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
// The Cycle this dump is stamped with: the request, never below the prior meta (G-PF35), always a
// positive integer. A blank / null / zero prior stamp is "none", not Cycle 0.
function resolveStamp(priorMeta, cycleArg) {
  const prior = posInt(priorMeta && priorMeta.cycle);
  const wanted = cycleArg == null ? null : posInt(cycleArg);
  if (cycleArg != null && wanted == null) throw new Error('cycle argument "' + cycleArg + '" is not a positive integer');
  const stamp = wanted == null ? prior : (prior != null && wanted < prior ? prior : wanted);
  if (stamp == null) throw new Error('no positive Cycle to stamp — pass the fired Cycle (no prior meta.json carries one)');
  return stamp;
}
// A header-first raw read with the named columns; mustHaveRows = a data row is required too.
function requireCols(tab, raw, cols, mustHaveRows) {
  if (!Array.isArray(raw)) throw new Error(tab + ' did not return rows');
  const h = (raw[0] || []).map(String);
  const miss = cols.filter(c => h.indexOf(c) < 0);
  if (miss.length) throw new Error(tab + ' is missing column(s): ' + miss.join(', '));
  if (mustHaveRows && raw.length < 2) throw new Error(tab + ' has no data rows');
  return raw;
}
// One generation, published by a directory swap: the whole new dir (files, meta, prev/) is built
// beside the live one, then the live dir is renamed aside and the new one renamed in. A failure
// before the swap leaves the live dump untouched; prev/ is copied, never moved, until the swap.
function publishGeneration(outDir, files, meta, advancing, fsx) {
  const F = fsx || fs;
  const next = outDir + '.next', old = outDir + '.old';
  F.rmSync(next, { recursive: true, force: true });
  F.mkdirSync(path.join(next, 'prev'), { recursive: true });
  for (const k of Object.keys(files)) F.writeFileSync(path.join(next, k + '.jsonl'), files[k].length ? files[k].join('\n') + '\n' : '');
  F.writeFileSync(path.join(next, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
  const live = F.existsSync(outDir) ? F.readdirSync(outDir) : [];
  if (advancing) {
    for (const f of live) if (/\.(jsonl|json)$/.test(f)) F.copyFileSync(path.join(outDir, f), path.join(next, 'prev', f));
  } else if (F.existsSync(path.join(outDir, 'prev'))) {
    for (const f of F.readdirSync(path.join(outDir, 'prev'))) F.copyFileSync(path.join(outDir, 'prev', f), path.join(next, 'prev', f));
  }
  F.rmSync(old, { recursive: true, force: true });
  if (F.existsSync(outDir)) F.renameSync(outDir, old);
  F.renameSync(next, outDir);
  F.rmSync(old, { recursive: true, force: true });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  resolveStamp(readMeta(META), cycleArg); // fail before any Sheet read when no positive Cycle can be stamped

  // Every required beat tab must exist — a missing one is a schema event, not a
  // soft skip. Optional (lazy-created) tabs absent from the sheet dump empty.
  const titles = new Set((await sheets.listSheets()).map(s => s.title));
  const missing = BEAT_TABS.filter(t => !titles.has(t));
  if (missing.length) {
    console.error('dumpBeatTabs: ABORT — tab(s) missing from the live sheet: ' + missing.join(', '));
    process.exit(1);
  }
  const ALL_TABS = BEAT_TABS.concat(OPTIONAL_TABS);

  // Read everything first; write nothing until every read succeeded, so a
  // mid-run failure never leaves a half-rotated dump.
  const data = {};
  for (const tab of ALL_TABS) {
    if (!titles.has(tab)) { data[tab] = []; log('dumpBeatTabs: ' + tab + ' not on the sheet yet (optional) — dumping empty.'); continue; }
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
  const stamp = resolveStamp(priorMeta, cycleArg);
  const priorCycle = posInt(priorMeta && priorMeta.cycle);
  if (cycleArg && priorCycle != null && Number(cycleArg) < priorCycle) {
    console.error(`dumpBeatTabs: REFUSING to stamp backward — asked for cycle ${cycleArg}, dump is at ${priorCycle}. `
      + `Rows refreshed from the live sheet; meta keeps cycle ${priorCycle}.`);
  }

  // pipeline.73 step 2 — the derived files, from the EFFECTIVE stamp; every input read and checked
  // before anything is written.
  log('dumpBeatTabs: reading LifeHistory_Log, Hospital_Ledger, Simulation_Ledger for the lived window…');
  const logRaw = requireCols('LifeHistory_Log', await sheets.getRawSheetData('LifeHistory_Log'), ['POPID', 'EventTag', 'EventText', 'Cycle'], true);
  const hospRaw = requireCols('Hospital_Ledger', await sheets.getRawSheetData('Hospital_Ledger'), ['AdmissionId', 'POPID', 'AdmitCycle', 'DischargeCycle', 'Cause'], false);
  const ledgerRaw = requireCols('Simulation_Ledger', await sheets.getRawSheetData('Simulation_Ledger'), ['POPID', 'First', 'Last', 'Neighborhood', 'RoleType', 'HouseholdId', 'Status', 'BirthYear'], true);
  const lifeRows = lifeWindowRows(logRaw, stamp);
  const anyDeath = lifeRows.some(r => /^Death$/i.test(String(r.EventTag || '').trim()));
  const archiveRaw = anyDeath ? requireCols('Citizen_Archive', await sheets.getRawSheetData('Citizen_Archive'), ['POPID', 'First', 'Last', 'HouseholdId', 'SpouseId'], true) : [];
  const bondsRaw = anyDeath ? requireCols('Relationship_Bond_Ledger', await sheets.getRawSheetData('Relationship_Bond_Ledger'), ['CitizenA', 'CitizenB', 'Intensity', 'Status'], false) : [];
  const livedRows = livedEventRows({ log: logRaw, hospital: hospRaw, ledger: ledgerRaw, archive: archiveRaw, bonds: bondsRaw }, stamp);

  const files = {};
  for (const tab of ALL_TABS) files[tab] = data[tab].map(r => JSON.stringify(r));
  files.LifeHistory_Log = lifeRows.map(r => JSON.stringify(r));
  files.Lived_Events = livedRows.map(r => JSON.stringify(r));
  const counts = Object.fromEntries(Object.keys(files).map(k => [k, files[k].length])); // LifeHistory_Log = the window rows written
  const advancing = priorCycle != null && stamp > priorCycle;
  const meta = {
    source: 'beat tabs (' + ALL_TABS.length + ') + LifeHistory_Log window (Cycle ' + (stamp - LIVED_WINDOW) + '–' + stamp + ') + Lived_Events (derived)',
    cycle: stamp,
    prevCycle: advancing ? priorCycle : (readMeta(path.join(PREV_DIR, 'meta.json')) || {}).cycle ?? null,
    rows: counts,
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/dumpBeatTabs.js',
    note: 'pipeline.68 Task 1 — beat-tab dump for the slice builders. Stable filenames, overwritten each cycle; prior cycle kept in prev/. Published as one generation (directory swap).',
  };
  publishGeneration(OUT_DIR, files, meta, advancing);

  log(`dumpBeatTabs: wrote ${ALL_TABS.length} tabs + 2 derived → ${path.relative(ROOT, OUT_DIR)}/` + (advancing ? ` (prior cycle ${priorCycle} kept in prev/)` : ''));
  if (!quiet) console.log(JSON.stringify({ ok: true, cycle: meta.cycle, prevCycle: meta.prevCycle, rows: counts }));
}

if (require.main === module) main().catch(err => { console.error('dumpBeatTabs: FAILED —', err.message); process.exit(1); });
