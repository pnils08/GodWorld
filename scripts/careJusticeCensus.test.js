#!/usr/bin/env node
'use strict';

/**
 * Run: node scripts/careJusticeCensus.test.js
 *
 * engine.254 Task 8 Revision 2. persistCareJusticeCensus_ against fake tabs —
 * synthetic rows only, no sheet access. The census is derived from the two care
 * ledgers by Cycle stamp; these tests walk it through first census, an ordinary
 * week, a missed week, a re-run, a broken tab and the stay dial.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const jl = require('../phase05-citizens/judicialLifecycle.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { passed++; console.log('ok ' + label); }
  else { failed++; console.log('FAIL ' + label + ': ' + (detail === undefined ? 'condition false' : detail)); }
}
function throws(label, fn, match) {
  try { fn(); assert(label, false, 'did not throw'); }
  catch (e) { assert(label, String(e.message).indexOf(match) >= 0, e.message); }
}

const box = { Logger: { log() {} }, persistWithRetry_: fn => fn(),
  requireTab_: (ss, name) => { const t = ss.getSheetByName(name); if (!t) throw new Error(name + ' tab missing'); return t; } };
vm.createContext(box);
for (const file of ['utilities/careJusticeAccounting.js', 'phase04-events/careJusticeService.js',
  'phase10-persistence/buildCyclePacket.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), box, { filename: file });
}
const HEADERS = Array.from(box.CARE_JUSTICE_CENSUS_HEADERS);
const HOSPITAL_HEADER = ['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause', 'AdmitCycle', 'StatusNow',
  'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare', 'IntakeType', 'SourceSystem',
  'SourceEventId', 'TransferFromId', 'PriorStatus'];
const JUDICIAL_HEADER = jl.JUDICIAL_CASE_FIELDS_.slice();
const HOODS = { Alder: 1000, Birch: 500, Cedar: 800 };
const BLOCK = (Object.keys(HOODS).length + 2) * 9; // 45

function tab(header) {
  const rows = [header.slice()];
  const blank = r => !r || r.every(v => String(v === null || v === undefined ? '' : v) === '');
  return { rows,
    getLastRow: () => { let n = rows.length; while (n > 0 && blank(rows[n - 1])) n--; return n; },
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getRange: (r, c, n, w) => ({
      getValues: () => { const out = []; for (let i = 0; i < n; i++) {
        const src = rows[r - 1 + i] || []; const row = []; for (let j = 0; j < w; j++) row.push(src[c - 1 + j] === undefined ? '' : src[c - 1 + j]); out.push(row); } return out; },
      setValues: values => values.forEach((v, i) => { rows[r - 1 + i] = v.slice(); })
    }) };
}
// A world: three hoods, both ledgers, the census tab, a tracked ledger.
function world(opts) {
  const o = opts || {};
  const w = { hospital: tab(HOSPITAL_HEADER), judicial: tab(JUDICIAL_HEADER), census: tab(HEADERS),
    people: [['P1', 'active', 'Alder']], stays: { hospital: 2, judicial: 2 },
    intakes: { Alder: [2, 1], Birch: [0, 0], Cedar: [1, 3] }, missing: {} };
  return Object.assign(w, o);
}
function hrow(id, pop, hood, admit, status, o) {
  const x = Object.assign({ discharge: '', outcome: '', type: '', system: '', event: '', from: '' }, o || {});
  return [id, pop, 'Synthetic', hood, 'synthetic cause', admit, status, admit, x.discharge, x.outcome, '',
    x.type, x.system, x.event, x.from, ''];
}
function jrow(o) {
  const c = Object.assign({ CaseId: '', POPID: '', Name: 'Synthetic', Neighborhood: 'Alder', ChargeCause: 'synthetic',
    ChargeGravity: 'serious', EntryType: 'arrest', OpenCycle: '', ArrestCycle: '', DecisionCycle: '', StatusNow: 'pending',
    LastTransitionCycle: '', HeldUntilCycle: '', ResolveCycle: '', Outcome: '', CyclesHeld: '', PriorStatus: 'Active',
    SourceSystem: 'patrol', SourceEventId: '', TransferToId: '', Counterparty: '' }, o);
  return JUDICIAL_HEADER.map(f => c[f]);
}
function run(w, cycle, extra) {
  const hoods = {};
  for (const h of Object.keys(HOODS)) hoods[h] = { tablePopulation: HOODS[h], hospitalIntakes: w.intakes[h][0], judicialIntakes: w.intakes[h][1] };
  const ctx = Object.assign({
    config: { careJusticeOtherHospitalStayCycles: w.stays.hospital, careJusticeOtherCustodyStayCycles: w.stays.judicial },
    summary: { cycleId: cycle, careJusticeDemand: { cycle, hoods }, careJusticeWriteStatus: { hospital: 'ok', judicial: 'ok' },
      hospitalEvents: [], judicialEvents: [] },
    ledger: { headers: ['POPID', 'Status', 'Neighborhood'], rows: w.people },
    ss: { getSheetByName: name => w.missing[name] ? null : ({ Hospital_Ledger: w.hospital, Judicial_Ledger: w.judicial, Care_Justice_Census: w.census })[name] || null }
  }, {});
  if (extra) extra(ctx);
  return box.persistCareJusticeCensus_(ctx);
}
function block(w, cycle) {
  return w.census.rows.slice(1).filter(r => Number(r[0]) === cycle).map(r => { const x = {}; HEADERS.forEach((h, i) => { x[h] = r[i]; }); return x; });
}
function cell(w, cycle, system, scope, hood, type) {
  return block(w, cycle).filter(r => r.System === system && r.GeographicScope === scope && r.Neighborhood === (hood || '') && r.IntakeType === type)[0];
}
const text = rows => JSON.stringify(rows);

// ── 1. First census: an old open row with blank L–O is a correction, never an intake ──
{
  const w = world();
  w.hospital.rows.push(hrow('H-C106-P1', 'P1', 'Alder', 106, 'hospitalized'));
  w.people[0][1] = 'hospitalized';
  const res = run(w, 110);
  const u = cell(w, 110, 'hospital', 'neighborhood', 'Alder', 'unclassified');
  assert('1 first census writes one block', res.action === 'write' && block(w, 110).length === BLOCK && w.census.rows.length === 1 + BLOCK);
  assert('1 old open row: correction +1, no intake, closing 1, one bed, complete',
    u.Corrections === 1 && u.TrackedIntakes === 0 && u.TotalIntakes === 0 && u.OpeningOccupancy === 0 &&
    u.TrackedOccupancy === 1 && u.ClosingOccupancy === 1 && u.BedsOccupied === 1 && u.Completeness === 'complete', text(u));
  const ill = cell(w, 110, 'hospital', 'neighborhood', 'Alder', 'illness');
  assert('1 the ward is not empty the week counting begins: stay × intake, (stay − 1) × intake as corrections',
    ill.OtherResidentIntakes === 2 && ill.OtherResidentOccupancy === 4 && ill.Corrections === 2 && ill.Exits === 0 && ill.BedsOccupied === 4, text(ill));
  const arr = cell(w, 110, 'judicial', 'neighborhood', 'Cedar', 'arrest');
  assert('1 custody seeds the same way and carries no beds', arr.OtherResidentOccupancy === 6 && arr.Corrections === 3 && arr.BedsOccupied === '');
  const city = cell(w, 110, 'hospital', 'city', '', 'all');
  assert('1 the city row is the covered sum, on the new basis',
    city.CoveredPopulation === 2300 && city.PopulationBasis === 'covered-sum' && city.ClosingOccupancy === 1 + 4 + 0 + 2 && city.MethodVersion === 'cj-2', text(city));
  assert('1 rows written are the validator\'s own balance', box.validateCareJusticeCensus_(block(w, 110)).length === 0);
}

// ── 2. The old row leaves in the first census Cycle — by discharge and by ghost release ──
for (const outcome of ['recovered', 'recovered-reconciled']) {
  const w = world();
  w.hospital.rows.push(hrow('H-C106-P1', 'P1', 'Alder', 106, 'active', { discharge: 110, outcome }));
  let res;
  try { res = run(w, 110, ctx => { ctx.summary.hospitalEvents = [{ popId: 'P1', to: 'active', kind: 'transition', cycle: 110 }]; }); }
  catch (e) { res = { error: e.message }; }
  const u = cell(w, 110, 'hospital', 'neighborhood', 'Alder', 'unclassified') || {};
  assert('2 first-Cycle old-row exit (' + outcome + '): correction +1, exit 1, closing 0, complete, no throw',
    !res.error && u.Corrections === 1 && u.Exits === 1 && u.ClosingOccupancy === 0 && u.TrackedOccupancy === 0 && u.Completeness === 'complete',
    res.error || text(u));
}

// ── 3 + 4. Second Cycle opens from the first's closing; an admission is counted once ──
{
  const w = world();
  w.hospital.rows.push(hrow('H-C106-P1', 'P1', 'Alder', 106, 'hospitalized'));
  run(w, 110);
  run(w, 111);
  const u = cell(w, 111, 'hospital', 'neighborhood', 'Alder', 'unclassified');
  const ill = cell(w, 111, 'hospital', 'neighborhood', 'Alder', 'illness');
  assert('3 second Cycle: opening = last closing, no corrections', u.OpeningOccupancy === 1 && u.Corrections === 0 && u.ClosingOccupancy === 1);
  assert('3 other residents: one seed cohort leaves, level at constant intake', ill.OpeningOccupancy === 4 && ill.Exits === 2 && ill.Corrections === 0 && ill.ClosingOccupancy === 4, text(ill));
  w.hospital.rows.push(hrow('H-C112-P2', 'P2', 'Alder', 112, 'injured', { type: 'illness', system: 'health-engine', event: 'health-engine:C112:illness:P2' }));
  run(w, 112, ctx => { ctx.summary.hospitalEvents = [{ popId: 'P2', to: 'injured', kind: 'intake', sourceEventId: 'health-engine:C112:illness:P2' }]; });
  const a = cell(w, 112, 'hospital', 'neighborhood', 'Alder', 'illness');
  assert('4 an admission with no discharge anywhere: one tracked intake, drawn from the hood\'s number, not added to it',
    a.TrackedIntakes === 1 && a.OtherResidentIntakes === 1 && a.TotalIntakes === 2 && a.TrackedOccupancy === 1 && a.Completeness === 'complete', text(a));
  assert('16 an injured admission holds no bed: beds − other occupancy = tracked beds',
    a.BedsOccupied - a.OtherResidentOccupancy === 0 && a.ClosingOccupancy - a.OtherResidentOccupancy === 1);
  const u2 = cell(w, 112, 'hospital', 'neighborhood', 'Alder', 'unclassified');
  assert('16 a hospitalized row is one tracked bed', u2.BedsOccupied - u2.OtherResidentOccupancy === 1);

  // ── 5. Ledgers written, census missing, run again for that Cycle: the same rows ──
  const twin = world();
  w.hospital.rows.slice(1).forEach(r => twin.hospital.rows.push(r.slice()));
  run(twin, 110); run(twin, 111);
  run(twin, 112); // a late run with no receipts left in memory
  assert('5 a census computed after the fact equals the uninterrupted one', text(block(twin, 112)) === text(block(w, 112)));

  // ── 6. Re-run of a complete Cycle ──
  const before = text(w.census.rows);
  const again = run(w, 112);
  assert('6 complete Cycle re-run writes nothing', again.action === 'skip' && text(w.census.rows) === before);
  w.hospital.rows[1][6] = 'recovering'; // StatusNow has moved on since: beds are not derivable any more
  assert('6 …also after a StatusNow moved (stored BedsOccupied kept)', run(w, 112).action === 'skip' && text(w.census.rows) === before);
  w.hospital.rows[1][6] = 'hospitalized';
  const at = w.census.rows.findIndex(r => Number(r[0]) === 112 && r[1] === 'hospital' && r[3] === 'Alder' && r[4] === 'illness');
  w.census.rows[at][HEADERS.indexOf('Exits')] += 1;
  const tampered = text(w.census.rows);
  throws('6 a complete block that differs is never replaced', () => run(w, 112), 'stored rows stand');
  assert('6 …and is left exactly as found', text(w.census.rows) === tampered);

  // ── 10. A write that landed and is retried ──
  const r = world();
  box.persistWithRetry_ = fn => { fn(); return fn(); };
  const second = run(r, 110);
  box.persistWithRetry_ = fn => fn();
  assert('10 the retried unit finds its own block and writes no second one', second.action === 'skip' && block(r, 110).length === BLOCK && r.census.rows.length === 1 + BLOCK);
}

// ── 7. A missed Cycle ──
{
  const w = world({ people: [['P1', 'active', 'Alder'], ['P2', 'active', 'Alder'], ['P3', 'active', 'Alder'], ['P4', 'active', 'Alder'], ['P5', 'active', 'Alder']] });
  const ev = p => 'health-engine:C:illness:' + p;
  w.hospital.rows.push(hrow('H-C109-P1', 'P1', 'Alder', 109, 'hospitalized', { type: 'illness', system: 'health-engine', event: ev('P1') })); // leaves in the gap
  w.hospital.rows.push(hrow('H-C109-P2', 'P2', 'Alder', 109, 'hospitalized', { type: 'illness', system: 'health-engine', event: ev('P2') })); // in care across the gap
  run(w, 110); run(w, 111);
  // Cycle 112: the census does not run. The ledgers do.
  w.hospital.rows[1][8] = 112; w.hospital.rows[1][6] = 'active'; w.hospital.rows[1][9] = 'recovered';
  w.hospital.rows.push(hrow('H-C112-P3', 'P3', 'Alder', 112, 'hospitalized', { type: 'illness', system: 'health-engine', event: ev('P3') })); // admitted in the gap, still open
  w.hospital.rows.push(hrow('H-C112-P4', 'P4', 'Alder', 112, 'active', { type: 'illness', system: 'health-engine', event: ev('P4'), discharge: 112, outcome: 'recovered' })); // in and out inside the gap
  w.intakes.Alder = [5, 1];
  const res = run(w, 113);
  const gap = block(w, 112), now = cell(w, 113, 'hospital', 'neighborhood', 'Alder', 'illness');
  assert('7 the missed Cycle is written unavailable, blank, with no covered population',
    gap.length === BLOCK && gap.every(r => r.Completeness === 'unavailable' && r.TotalIntakes === '' && r.ClosingOccupancy === '' && r.CoveredPopulation === ''));
  assert('7 the restart opens from the last written closing, never from zero', now.OpeningOccupancy === 2 + 4 && res.completeness.hospital === 'incomplete' && now.Completeness === 'incomplete', text(now));
  assert('7 tracked: +1 admitted in the gap, −1 discharged in it, 0 for the one in care across it, nothing for in-and-out',
    now.TrackedIntakes === 0 && now.TrackedOccupancy === 2 && now.Corrections === 0 /* +1 −1 tracked */ + 1 /* other: 4 + 5 − 10 */ && now.Exits === 0, text(now));
  assert('7 the restart balances and closes on the ledger\'s open rows', box.validateCareJusticeCensus_(block(w, 113)).length === 0 && now.ClosingOccupancy === 2 + 10);
  assert('7 other residents: the gap cohort is estimated at the first numbered Cycle after it', now.OtherResidentIntakes === 5 && now.OtherResidentOccupancy === 10, text(now));
  assert('7 custody restarts incomplete too', cell(w, 113, 'judicial', 'neighborhood', 'Cedar', 'arrest').Completeness === 'incomplete');
  w.intakes.Alder = [1, 1];
  run(w, 114);
  const next = cell(w, 114, 'hospital', 'neighborhood', 'Alder', 'illness');
  assert('7 the next Cycle is ordinary and the estimate is out of a 2-Cycle window', next.Completeness === 'complete' && next.OtherResidentOccupancy === 5 + 1 && next.Exits === 5, text(next));
  assert('7 rows are in Cycle order', w.census.rows.slice(1).every((r, i, a) => i === 0 || Number(a[i - 1][0]) <= Number(r[0])));
}
{
  // The same gap at stay 3: the estimate holds its size while it is in the window.
  const w = world({ stays: { hospital: 3, judicial: 2 } });
  w.intakes.Alder = [2, 1]; run(w, 110); run(w, 111); // 112 missed
  w.intakes.Alder = [5, 1]; run(w, 113);
  w.intakes.Alder = [1, 1]; run(w, 114);
  w.intakes.Alder = [1, 1]; run(w, 115);
  const o = c => cell(w, c, 'hospital', 'neighborhood', 'Alder', 'illness').OtherResidentOccupancy;
  assert('7 stay 3: 113 = 2 + est 5 + 5; 114 = est 5 + 5 + 1 (the estimate did not resize); 115 = 5 + 1 + 1', o(113) === 12 && o(114) === 11 && o(115) === 7, [o(113), o(114), o(115)].join(','));
}

// ── 8. Too many missing Cycles; a tab ahead of the engine ──
{
  const w = world();
  run(w, 110);
  const before = text(w.census.rows);
  throws('8 nine missing Cycles is a broken tab, not a gap', () => run(w, 120), '9 Cycles missing');
  assert('8 …and nothing is written', text(w.census.rows) === before);
  const ok = run(w, 119);
  assert('8 eight missing Cycles are written unavailable and the census restarts', ok.action === 'write' && block(w, 115).length === BLOCK && block(w, 119).length === BLOCK && w.census.rows.length === 1 + BLOCK * 10);
  throws('8 a tab holding a later Cycle is refused', () => run(w, 118), 'later than Cycle 118');
  // …and again inside the retried unit, on its own fresh read.
  const planRows = [{ Cycle: 118, System: 'hospital', GeographicScope: 'city', Neighborhood: '', IntakeType: 'all' }];
  throws('8 the write step refuses it on its own read', () => box.careJusticeWritePlan_(
    [{ row: 2, values: [119, 'hospital', 'city', '', 'all'].concat(HEADERS.slice(5).map(() => '')) }], 2,
    { rows: planRows, gapBlocks: [] }), 'later than Cycle 118');
}

// ── 9. Broken blocks ──
{
  const w = world();
  run(w, 110); run(w, 111);
  const full = text(block(w, 111));
  w.census.rows.length -= 5; // a short tail run
  const res = run(w, 111);
  assert('9 a short tail run is rewritten in place to a whole block', res.action === 'write' && text(block(w, 111)) === full && w.census.rows.length === 1 + 2 * BLOCK);
  w.census.rows.push(HEADERS.map(() => ' ')); // a stray space below the data
  run(w, 112);
  assert('9 whitespace below the data is not a row', block(w, 112).length === BLOCK && w.census.rows.length === 1 + 3 * BLOCK);
  // A stray cell far below the data must not push the last block out of the tail read.
  const far = world(); run(far, 110);
  const seed = cell(far, 110, 'hospital', 'neighborhood', 'Alder', 'illness').OtherResidentOccupancy;
  while (far.census.rows.length < 3000) far.census.rows.push(HEADERS.map(() => ''));
  far.census.rows[2999] = HEADERS.map((h, i) => i === 7 ? ' ' : '');
  run(far, 111);
  const second = cell(far, 111, 'hospital', 'neighborhood', 'Alder', 'illness');
  assert('9 a stray cell at row 3000: the next Cycle still opens from the last block and lands right after it',
    second.OpeningOccupancy === seed && second.Corrections === 0 && Number(far.census.rows[1 + BLOCK][0]) === 111, text(second));
  // A row with content and no Cycle is foreign: refused, never overwritten.
  const orphan = world();
  orphan.census.rows.push(HEADERS.map((h, i) => i === 1 ? 'orphan data' : ''));
  throws('9 a nonblank row with a blank Cycle is refused on a fresh tab', () => run(orphan, 110), 'holds "orphan data"');
  assert('9 …and left as found', orphan.census.rows.length === 2 && orphan.census.rows[1][1] === 'orphan data');
  const orphan2 = world(); run(orphan2, 110);
  orphan2.census.rows.push(HEADERS.map(() => '')); orphan2.census.rows.push(HEADERS.map((h, i) => i === 9 ? 7 : ''));
  const kept = text(orphan2.census.rows);
  throws('9 …and below an existing block', () => run(orphan2, 111), 'where the census would write');
  assert('9 …with nothing written', text(orphan2.census.rows) === kept);
  const dup = world(); run(dup, 110);
  dup.census.rows[5] = dup.census.rows[4].slice(); dup.census.rows[5][HEADERS.indexOf('Completeness')] = 'incomplete';
  throws('9 a duplicate key is refused', () => run(dup, 110), 'duplicate row');
  const tail = world(); run(tail, 110); run(tail, 111);
  const moved = tail.census.rows.splice(1, BLOCK); tail.census.rows.push(...moved); // Cycle 110's rows now follow 111's
  tail.census.rows[1][HEADERS.indexOf('Completeness')] = 'incomplete';
  throws('9 a run with another Cycle\'s rows after it is refused', () => run(tail, 111), 'follow Cycle 111');
}

// ── 9b. Rows below the census: reported on every outcome, after the block stands ──
{
  const TAIL = BLOCK * box.CARE_JUSTICE_TAIL_BLOCKS;
  const blankRow = () => HEADERS.map(() => '');
  const orphanRow = v => HEADERS.map((h, i) => i === 9 ? v : '');
  // Put `value` on sheet row `sheetRow`, padding with blank rows.
  const place = (w, sheetRow, value) => {
    while (w.census.rows.length < sheetRow) w.census.rows.push(blankRow());
    w.census.rows[sheetRow - 1] = orphanRow(value);
  };
  // Record every read of the census tab as [firstRow, rowCount, width].
  const watch = w => {
    const reads = [], real = w.census.getRange;
    w.census.getRange = (r, c, n, wd) => { const rng = real(r, c, n, wd);
      return { getValues: () => { reads.push([r, n, wd]); return rng.getValues(); }, setValues: rng.setValues }; };
    return reads;
  };
  const clean = world(); run(clean, 110); run(clean, 111);

  // Skip: the stored block is equal and an orphan sits right under it.
  const skip = world(); run(skip, 110);
  place(skip, 1 + BLOCK + 1, 'left by hand');
  const skipKept = text(skip.census.rows);
  throws('9b an orphan under an equal block is reported on the re-run', () => run(skip, 110),
    'Cycle 110 stands; row ' + (1 + BLOCK + 1) + ' below it holds "left by hand" with no Cycle');
  assert('9b …with the block and the orphan left as found', text(skip.census.rows) === skipKept);

  // Append: the orphan sits past the cells the next block covers.
  const far = world(); run(far, 110);
  const farRow = 1 + 2 * BLOCK + 20;
  place(far, farRow, 'far orphan');
  throws('9b an orphan past the append span is reported after the block lands', () => run(far, 111),
    'Cycle 111 stands; row ' + farRow + ' below it holds "far orphan" with no Cycle');
  assert('9b …the Cycle\'s block is whole and equal to a clean run\'s', text(block(far, 111)) === text(block(clean, 111)));
  assert('9b …and the orphan is left as found', far.census.rows[farRow - 1][9] === 'far orphan');

  // In-place rewrite of a whole-length run, orphan right under it.
  const same = world(); run(same, 110); run(same, 111);
  same.census.rows[1 + BLOCK][HEADERS.indexOf('Completeness')] = 'incomplete';
  place(same, 1 + 2 * BLOCK + 1, 'under rewrite');
  throws('9b an orphan under an equal-length rewrite is reported after the rewrite', () => run(same, 111),
    'Cycle 111 stands; row ' + (1 + 2 * BLOCK + 1) + ' below it holds "under rewrite" with no Cycle');
  assert('9b …the run was rewritten whole', text(block(same, 111)) === text(block(clean, 111)));

  // A short run rewritten to a whole block that ends just above the orphan.
  const short = world(); run(short, 110); run(short, 111);
  short.census.rows.length -= 5;
  place(short, 1 + 2 * BLOCK + 1, 'under short run');
  throws('9b an orphan just under a short-run rewrite is reported after the rewrite', () => run(short, 111),
    'Cycle 111 stands; row ' + (1 + 2 * BLOCK + 1) + ' below it holds "under short run" with no Cycle');
  assert('9b …the short run is a whole block again', text(block(short, 111)) === text(block(clean, 111)));

  // A healthy tab ends on a census row: nothing below the block is read.
  const healthy = world(); run(healthy, 110);
  const healthyReads = watch(healthy);
  const wrote = run(healthy, 111), again = run(healthy, 111);
  assert('9b a tab ending on a census row: write and re-run both pass and read nothing below the block',
    wrote.action === 'write' && again.action === 'skip' && healthyReads.length > 0 &&
    healthyReads.every(([r, n]) => r + n - 1 <= 1 + 2 * BLOCK), text(healthyReads));

  // Whitespace inside the window is not a row: looked at, never reported.
  const ws = world(); run(ws, 110);
  place(ws, 1 + 2 * BLOCK + 10, ' ');
  const wsReads = watch(ws);
  const wsSkip = run(ws, 110), wsWrite = run(ws, 111);
  assert('9b a whitespace cell below the census is read and not reported, on a skip and on a write',
    wsSkip.action === 'skip' && wsWrite.action === 'write' && block(ws, 111).length === BLOCK &&
    wsReads.some(([r, n, wd]) => wd === HEADERS.length && r === 1 + BLOCK + 1 && n === BLOCK + 10) &&
    wsReads.some(([r, n, wd]) => wd === HEADERS.length && r === 1 + 2 * BLOCK + 1 && n === 10), text(wsReads));

  // Past the window: silent this Cycle, the read stays inside the window, seen once the census grows.
  const beyond = world(); run(beyond, 110);
  const beyondRow = 1 + BLOCK + TAIL + 3;
  place(beyond, beyondRow, 'beyond the window');
  const beyondReads = watch(beyond);
  const quiet = run(beyond, 110);
  // The column-A scan (width 1) runs the tab's length as before; no full-width read leaves the window.
  const wide = beyondReads.filter(([r, n, wd]) => wd === HEADERS.length);
  assert('9b an orphan past the window is not reported that Cycle and no full-width read reaches it',
    quiet.action === 'skip' && wide.some(([r]) => r === 1 + BLOCK + 1) &&
    wide.every(([r, n]) => r + n - 1 <= 1 + BLOCK + TAIL), text(beyondReads));
  throws('9b …and is reported once the census has grown to within the window', () => run(beyond, 111),
    'Cycle 111 stands; row ' + beyondRow + ' below it holds "beyond the window" with no Cycle');
}

// ── 11. Completeness is checked ──
{
  const w = world();
  w.hospital.rows.push(hrow('H-C110-P1', 'P1', 'Alder', 110, 'hospitalized', { type: 'illness', system: 'ambulance', event: 'ambulance:x:P1' }));
  run(w, 110, ctx => { ctx.summary.careJusticeWriteStatus.hospital = 'failed'; });
  assert('11 a failed writer marks its system incomplete and leaves the other alone',
    cell(w, 110, 'hospital', 'neighborhood', 'Birch', 'heat').Completeness === 'incomplete' && cell(w, 110, 'hospital', 'city', '', 'all').Completeness === 'incomplete' &&
    cell(w, 110, 'judicial', 'city', '', 'all').Completeness === 'complete');
  const lost = world();
  run(lost, 110, ctx => { ctx.summary.hospitalEvents = [{ popId: 'P9', to: 'hospitalized', kind: 'intake', sourceEventId: 'ambulance:lost:P9' }]; });
  assert('11 an intake receipt with no ledger row marks the system incomplete', cell(lost, 110, 'hospital', 'city', '', 'all').Completeness === 'incomplete');
  const stuck = world();
  stuck.judicial.rows.push(jrow({ CaseId: 'J-C109-P1', POPID: 'P1', OpenCycle: 109, ArrestCycle: 109, StatusNow: 'held', SourceEventId: 'patrol:a:P1' }));
  run(stuck, 110, ctx => { ctx.summary.judicialEvents = [{ system: 'judicial', kind: 'exit', popId: 'P1', sourceEventId: 'patrol:a:P1' }]; });
  assert('11 an exit receipt whose case is still open marks custody incomplete', cell(stuck, 110, 'judicial', 'city', '', 'all').Completeness === 'incomplete');
  const gone = world({ missing: { Hospital_Ledger: true } });
  run(gone, 110);
  const g = cell(gone, 110, 'hospital', 'neighborhood', 'Alder', 'illness');
  assert('11 a missing tab is unavailable: blank, never zero', g.Completeness === 'unavailable' && g.TotalIntakes === '' && cell(gone, 110, 'hospital', 'city', '', 'all').ClosingOccupancy === '' &&
    cell(gone, 110, 'judicial', 'neighborhood', 'Cedar', 'arrest').Completeness === 'complete');
  const unrun = world();
  run(unrun, 110, ctx => { delete ctx.summary.careJusticeWriteStatus; });
  assert('11 a Cycle whose packet phase never reached its writers is not a clean Cycle',
    cell(unrun, 110, 'hospital', 'city', '', 'all').Completeness === 'incomplete' && cell(unrun, 110, 'judicial', 'city', '', 'all').Completeness === 'incomplete');
  // A valid close and reopen in one Cycle: the exit landed on its own row, whatever opened after.
  const reopen = world();
  reopen.hospital.rows.push(hrow('H-C108-P1', 'P1', 'Alder', 108, 'active', { type: 'illness', system: 'ambulance', event: 'ambulance:old:P1', discharge: 110, outcome: 'recovered' }));
  reopen.hospital.rows.push(hrow('H-C110-P1', 'P1', 'Alder', 110, 'hospitalized', { type: 'illness', system: 'ambulance', event: 'ambulance:new:P1' }));
  reopen.judicial.rows.push(jrow({ CaseId: 'J-C108-P1', POPID: 'P1', OpenCycle: 108, ArrestCycle: 108, StatusNow: 'released', ResolveCycle: 110, Outcome: 'released', SourceEventId: 'patrol:old:P1' }));
  reopen.judicial.rows.push(jrow({ CaseId: 'J-C110-P1', POPID: 'P1', OpenCycle: 110, ArrestCycle: 110, StatusNow: 'pending', SourceEventId: 'patrol:new:P1' }));
  run(reopen, 110, ctx => {
    ctx.summary.hospitalEvents = [{ popId: 'P1', to: 'active', kind: 'transition' }, { popId: 'P1', to: 'hospitalized', kind: 'intake', sourceEventId: 'ambulance:new:P1' }];
    ctx.summary.judicialEvents = [{ system: 'judicial', kind: 'exit', popId: 'P1', sourceEventId: 'patrol:old:P1' }, { system: 'judicial', kind: 'intake', popId: 'P1', sourceEventId: 'patrol:new:P1' }];
  });
  const ro = cell(reopen, 110, 'hospital', 'neighborhood', 'Alder', 'illness'), rj = cell(reopen, 110, 'judicial', 'neighborhood', 'Alder', 'arrest');
  assert('11 a same-Cycle close and reopen is one exit, one intake, one person in care — and complete',
    ro.TrackedIntakes === 1 && ro.TrackedOccupancy === 1 && ro.Completeness === 'complete' &&
    rj.TrackedIntakes === 1 && rj.TrackedOccupancy === 1 && rj.Completeness === 'complete', text(ro) + text(rj));
  // The exit receipt is matched to its own row: another row of the same citizen closing does not cover it.
  const masked = world();
  masked.judicial.rows.push(jrow({ CaseId: 'J-C108-P1', POPID: 'P1', OpenCycle: 108, ArrestCycle: 108, StatusNow: 'released', ResolveCycle: 110, Outcome: 'released', SourceEventId: 'patrol:A:P1' }));
  masked.judicial.rows.push(jrow({ CaseId: 'J-C110-P1', POPID: 'P1', OpenCycle: 110, ArrestCycle: 110, StatusNow: 'pending', SourceEventId: 'patrol:B:P1' }));
  run(masked, 110, ctx => { ctx.summary.judicialEvents = [
    { system: 'judicial', kind: 'intake', popId: 'P1', sourceEventId: 'patrol:B:P1' },
    { system: 'judicial', kind: 'exit', popId: 'P1', sourceEventId: 'patrol:B:P1' }]; });
  assert('11 an exit aimed at a still-open case is lost, even when another case of that citizen closed', cell(masked, 110, 'judicial', 'city', '', 'all').Completeness === 'incomplete');
  const twice = world();
  twice.hospital.rows.push(hrow('H-C108-P1', 'P1', 'Alder', 108, 'active', { type: 'illness', system: 'ambulance', event: 'ambulance:A:P1', discharge: 110, outcome: 'recovered' }));
  twice.hospital.rows.push(hrow('H-C110-P1', 'P1', 'Alder', 110, 'hospitalized', { type: 'illness', system: 'ambulance', event: 'ambulance:B:P1' }));
  run(twice, 110, ctx => { ctx.summary.hospitalEvents = [{ popId: 'P1', to: 'active', kind: 'transition' },
    { popId: 'P1', to: 'hospitalized', kind: 'intake', sourceEventId: 'ambulance:B:P1' }, { popId: 'P1', to: 'active', kind: 'transition' }]; });
  assert('11 two hospital exits for one citizen need two rows closed', cell(twice, 110, 'hospital', 'city', '', 'all').Completeness === 'incomplete');
  const flaky = world(); let reads = 0;
  flaky.hospital.getDataRange = () => ({ getValues: () => { reads++; throw new Error('Service Spreadsheets failed while accessing document'); } });
  run(flaky, 110);
  assert('11 a ledger that cannot be read is unavailable, and the other system is still counted',
    reads >= 1 && cell(flaky, 110, 'hospital', 'city', '', 'all').Completeness === 'unavailable' && cell(flaky, 110, 'judicial', 'city', '', 'all').Completeness === 'complete');
  const bad = world(); bad.hospital.rows[0][13] = 'EventId';
  run(bad, 110);
  assert('11 an unreadable header is unavailable too', cell(bad, 110, 'hospital', 'city', '', 'all').Completeness === 'unavailable');
  const odd = world();
  odd.judicial.rows.push(jrow({ CaseId: 'J-C109-P1', POPID: 'P1', OpenCycle: 109, ArrestCycle: 109, StatusNow: 'released', SourceEventId: 'patrol:b:P1' }));
  run(odd, 110);
  assert('11 an arrested open row outside pending / held marks custody incomplete', cell(odd, 110, 'judicial', 'neighborhood', 'Alder', 'arrest').Completeness === 'incomplete');
}

// ── 12 + 13. Repair rows and out-of-band closes ──
{
  const w = world({ people: [['P1', 'active', 'Alder'], ['P2', 'active', 'Alder']] });
  w.hospital.rows.push(hrow('H-C110-P1', 'P1', 'Alder', 110, 'injured', { type: 'unclassified', system: 'reconcile', event: 'reconcile:C110:unclassified:P1' }));
  run(w, 110);
  const u = cell(w, 110, 'hospital', 'neighborhood', 'Alder', 'unclassified');
  assert('12 a same-Cycle repair row is a correction, never an intake (F)', u.Corrections === 1 && u.TotalIntakes === 0 && u.ClosingOccupancy === 1 && u.BedsOccupied === 0 && u.Completeness === 'complete', text(u));
  w.hospital.rows.push(hrow('H-C109-P2', 'P2', 'Alder', 109, 'hospitalized', { type: 'unclassified', system: 'reconcile', event: 'reconcile:C111:unclassified:P2' }));
  run(w, 111);
  const v = cell(w, 111, 'hospital', 'neighborhood', 'Alder', 'unclassified');
  assert('12 a repair row dated before the Cycle enters through the opening difference', v.OpeningOccupancy === 1 && v.Corrections === 1 && v.TotalIntakes === 0 && v.ClosingOccupancy === 2 && v.Completeness === 'complete', text(v));
  w.hospital.rows[2][8] = 110; w.hospital.rows[2][6] = 'active'; // closed out of band, back-dated
  run(w, 112);
  const x = cell(w, 112, 'hospital', 'neighborhood', 'Alder', 'unclassified');
  assert('13 a row closed out of band is a negative correction; closing = open rows', x.OpeningOccupancy === 2 && x.Corrections === -1 && x.Exits === 0 && x.ClosingOccupancy === 1 && x.Completeness === 'complete', text(x));
  assert('13 the books still balance', box.validateCareJusticeCensus_(block(w, 112)).length === 0);
}

// ── 14. The stay dial ──
for (const stay of [1, 2, 3]) {
  const w = world({ stays: { hospital: stay, judicial: 2 } });
  w.intakes = { Alder: [0, 0], Birch: [0, 0], Cedar: [0, 0] };
  const seen = [];
  for (let c = 110; c <= 117; c++) {
    w.intakes.Birch = [c === 112 ? 1 : 0, 0];
    run(w, c);
    seen.push(cell(w, c, 'hospital', 'neighborhood', 'Birch', 'illness').OtherResidentOccupancy);
  }
  assert('14 one admission into an empty one-person cell stays exactly ' + stay + ' Cycle(s)',
    seen.filter(n => n === 1).length === stay && seen.filter(n => n !== 0 && n !== 1).length === 0 && seen[2] === 1, seen.join(','));
}
{
  const w = world({ stays: { hospital: 3, judicial: 1 } });
  run(w, 110);
  const a = cell(w, 110, 'hospital', 'neighborhood', 'Alder', 'illness'), j = cell(w, 110, 'judicial', 'neighborhood', 'Cedar', 'arrest');
  assert('14 the two keys move independently (hospital 3, custody 1)', a.OtherResidentOccupancy === 6 && a.Corrections === 4 && j.OtherResidentOccupancy === 3 && j.Corrections === 0);
  w.intakes.Alder = [9, 1]; run(w, 111);
  const up = cell(w, 111, 'hospital', 'neighborhood', 'Alder', 'illness');
  assert('14 rising intake never yields negative exits', up.Exits === 2 && up.Corrections === 0 && up.OtherResidentOccupancy === 2 + 2 + 9, text(up));
  w.stays.hospital = 1; run(w, 112);
  const down = cell(w, 112, 'hospital', 'neighborhood', 'Alder', 'illness');
  assert('14 the dial turned down lands as exits that Cycle', down.OtherResidentOccupancy === 9 && down.Exits === 13 && down.Corrections === 0, text(down));
  w.stays.hospital = 3; run(w, 113);
  const back = cell(w, 113, 'hospital', 'neighborhood', 'Alder', 'illness');
  assert('14 the dial turned up lands as corrections that Cycle', back.OtherResidentOccupancy === 27 && back.Exits === 0 && back.Corrections === 9, text(back));
  for (const bad of [0, 9, 'two', '', 1.5]) {
    const k = world(); k.stays.hospital = bad;
    throws('14 a stay of ' + JSON.stringify(bad) + ' throws', () => run(k, 110), 'careJusticeOtherHospitalStayCycles');
  }
  const w2 = box.careJusticeOtherWindow_;
  assert('14 window arithmetic: missing Cycles take the first known Cycle after them',
    w2(0, 3, [null, null]).closing === 9 && w2(0, 3, [null, 4]).closing === 11 && w2(9, 0, [3, 0]).exits === 6 && w2(2, 5, [1, 1]).corrections === 0);
}

// ── 15. Coverage ──
{
  const w = world({ people: [['P1', 'hospitalized', 'Elsewhere'], ['P2', 'active', 'Alder'], ['P3', 'deceased', 'Nowhere'], ['P4', 'active', '']] });
  w.hospital.rows.push(hrow('H-C110-P1', 'P1', 'Elsewhere', 110, 'hospitalized', { type: 'injury', system: 'ambulance', event: 'ambulance:y:P1' }));
  run(w, 110);
  const un = cell(w, 110, 'hospital', 'unallocated', '', 'injury'), all = cell(w, 110, 'hospital', 'unallocated', '', 'all');
  assert('15 unallocated covers the living tracked citizens outside the table hoods',
    un.CoveredPopulation === 2 && un.PopulationBasis === 'tracked-outside-table' && un.TrackedIntakes === 1 && un.OtherResidentIntakes === 0 &&
    un.OtherResidentOccupancy === 0 && un.Completeness === 'complete' && all.ClosingOccupancy === 1, text(un));
  const city = cell(w, 110, 'hospital', 'city', '', 'injury');
  assert('15 the city row is table sum + that count, and counts the citizen once', city.CoveredPopulation === 2302 && city.TrackedIntakes === 1 && city.TotalIntakes === 1);
}

// ── 17 + 18. Custody rows ──
{
  const w = world({ people: [['P1', 'active', 'Alder'], ['P2', 'detained', 'Alder'], ['P3', 'hospitalized', 'Alder'], ['P4', 'detained', 'Alder']] });
  w.judicial.rows.push(jrow({ CaseId: 'J-C110-P1', POPID: 'P1', EntryType: 'investigation', OpenCycle: 110, StatusNow: 'investigating', SourceSystem: 'conduct', SourceEventId: 'conduct:a:P1' }));
  w.judicial.rows.push(jrow({ CaseId: 'J-C109-P2', POPID: 'P2', EntryType: 'investigation', OpenCycle: 109, ArrestCycle: 110, DecisionCycle: 111, StatusNow: 'pending', SourceSystem: 'conduct', SourceEventId: 'conduct:b:P2' }));
  w.judicial.rows.push(jrow({ CaseId: 'J-C110-P3', POPID: 'P3', OpenCycle: 110, ArrestCycle: 110, StatusNow: 'diverted', ResolveCycle: 110, Outcome: 'diverted', TransferToId: 'H-C110-P3', SourceEventId: 'patrol:c:P3' }));
  w.judicial.rows.push(jrow({ CaseId: 'J-C110-P4', POPID: 'P4', OpenCycle: 110, ArrestCycle: 110, StatusNow: 'pending', SourceSystem: 'reconcile', SourceEventId: 'reconcile:C110:P4' }));
  w.hospital.rows.push(hrow('H-C110-P3', 'P3', 'Alder', 110, 'hospitalized', { type: 'mental-health-crisis', system: 'judicial-transfer', event: 'patrol:c:P3', from: 'J-C110-P3' }));
  run(w, 110);
  const a = cell(w, 110, 'judicial', 'neighborhood', 'Alder', 'arrest');
  assert('17 an investigation moves nothing; its conversion is an intake; a reconcile case is a correction',
    a.TrackedIntakes === 2 /* the conversion and the diverted arrest */ && a.TrackedOccupancy === 2 /* P2 and P4 */ && a.TransfersOut === 1 && a.Exits === 0 &&
    a.Corrections === 1 /* P4 */ + 0 /* window: modelled 1, tracked 2 → other 0 */ && a.Completeness === 'complete', text(a));
  const m = cell(w, 110, 'hospital', 'neighborhood', 'Alder', 'mental-health-crisis');
  assert('17 a diversion to a bed is a transfer out and a transfer in — no hospital intake (H)', m.TransfersIn === 1 && m.TotalIntakes === 0 && m.ClosingOccupancy === 1 && m.BedsOccupied === 1, text(m));
  const d = world();
  d.hospital.rows.push(hrow('H-C110-P1', 'P1', 'Alder', 110, 'hospitalized', { type: 'illness', system: 'ambulance', event: 'ambulance:same:P1' }));
  d.hospital.rows.push(hrow('H-C110-P1-2', 'P1', 'Alder', 110, 'hospitalized', { type: 'illness', system: 'ambulance', event: 'ambulance:same:P1' }));
  run(d, 110);
  assert('18 two rows sharing a SourceEventId: one intake counted, the system incomplete',
    cell(d, 110, 'hospital', 'neighborhood', 'Alder', 'illness').TrackedIntakes === 1 && cell(d, 110, 'hospital', 'city', '', 'all').Completeness === 'incomplete');
}

// ── Guards ──
{
  const w = world();
  throws('no demand, no census', () => run(w, 110, ctx => { delete ctx.summary.careJusticeDemand; }), 'S.careJusticeDemand missing');
  assert('dry-run and replay write nothing', run(w, 110, ctx => { ctx.mode = { dryRun: true }; }) === null && run(w, 110, ctx => { ctx.mode = { replay: true }; }) === null && w.census.rows.length === 1);
  const h = world(); h.census.rows[0][3] = 'Hood';
  throws('a census tab with the wrong header is refused', () => run(h, 110), 'Neighborhood header missing');
  throws('no census tab is a visible failure', () => run(world({ missing: { Care_Justice_Census: true } }), 110), 'Care_Justice_Census tab missing');
  const demand = { cycle: 110, hoods: { Alder: { hospitalIntakes: 1, judicialIntakes: 1 }, Birch: { hospitalIntakes: 0, judicialIntakes: 0 } } };
  throws('the other-resident helper refuses a hood with no tracked count when asked for every hood',
    () => box.careJusticeOtherResident_(demand, { Alder: { hospital: { illness: 0 }, judicial: { arrest: 0 } } }, true), 'count missing for Birch');
}

console.log('\ncareJusticeCensus: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
