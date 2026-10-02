#!/usr/bin/env node
'use strict';

/**
 * Run: node scripts/careJusticeAccounting.test.js
 *
 * engine.254 Tasks 2–3. Synthetic receipts and counts only — no sheet access.
 * Asserts invariants A–J of docs/plans/2026-09-21-care-and-justice-system.md
 * §Schema against utilities/careJusticeAccounting.js.
 */

const acct = require('../utilities/careJusticeAccounting');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) {
    passed++;
    console.log('ok ' + label);
  } else {
    failed++;
    console.log('FAIL ' + label + ': ' + (detail || 'condition false'));
  }
}

function throws(label, fn, match) {
  try {
    fn();
    assert(label, false, 'did not throw');
  } catch (e) {
    assert(label, !match || String(e.message).indexOf(match) >= 0, e.message);
  }
}

const SCOPES = [
  { scope: 'neighborhood', neighborhood: 'Rockridge', coveredPopulation: 2000 },
  { scope: 'neighborhood', neighborhood: 'Fruitvale', coveredPopulation: 3000 },
  { scope: 'unallocated', coveredPopulation: 95000 },
];
const OK = { hospital: 'ok', judicial: 'ok' };

function build(extra) {
  return acct.buildCareJusticeCensus_(Object.assign({ cycle: 110, scopes: SCOPES, sources: OK }, extra));
}

function find(rows, system, scope, hood, type) {
  return rows.filter(r => r.System === system && r.GeographicScope === scope &&
    r.Neighborhood === (hood || '') && r.IntakeType === type)[0];
}

function clean(label, rows) {
  const bad = acct.validateCareJusticeCensus_(rows);
  assert(label + ' — books balance (A, B, C)', bad.length === 0, bad.join('; '));
}

// ── Shape: dense rows ───────────────────────────────────────────────────────
{
  const { rows } = build({});
  // hospital 6 types + all = 7, judicial 1 + all = 2; 3 disjoint scopes + city = 4.
  assert('dense: every typed row written for every scope, zero included', rows.length === (7 + 2) * 4, 'rows ' + rows.length);
  assert('G: known none is an explicit 0 on the typed row',
    find(rows, 'hospital', 'neighborhood', 'Fruitvale', 'heat').TotalIntakes === 0);
  assert('every row carries its own Completeness', rows.every(r => r.Completeness === 'complete'));
  assert('row values follow the 22 headers',
    acct.careJusticeCensusRowValues_(rows[0]).length === 22 && acct.CARE_JUSTICE_CENSUS_HEADERS.length === 22);
  assert('coverage: city = hood table + remainder', find(rows, 'hospital', 'city', '', 'all').CoveredPopulation === 100000);
  assert('unallocated row names no neighbourhood',
    find(rows, 'hospital', 'unallocated', '', 'all').PopulationBasis === 'tracked-outside-table');
  clean('empty Cycle', rows);
}

// ── A, B, C, J: a named admission plus other-resident demand ────────────────
{
  const { rows } = build({
    receipts: [
      { system: 'hospital', kind: 'intake', sourceEventId: 'ambulance:ev1:POP-1', popId: 'POP-1', neighborhood: 'Rockridge', intakeType: 'injury' },
      { system: 'hospital', kind: 'intake', sourceEventId: 'health-engine:C110:illness:POP-2', popId: 'POP-2', neighborhood: 'Rockridge', intakeType: 'illness' },
    ],
    trackedOpen: [
      { system: 'hospital', popId: 'POP-1', neighborhood: 'Rockridge', intakeType: 'injury', statusNow: 'injured' },
      { system: 'hospital', popId: 'POP-2', neighborhood: 'Rockridge', intakeType: 'illness', statusNow: 'hospitalized' },
    ],
    otherResident: [
      { system: 'hospital', scope: 'neighborhood', neighborhood: 'Rockridge', intakeType: 'illness', intakes: 4, exits: 1, beds: 3 },
      { system: 'hospital', scope: 'unallocated', intakeType: 'illness', intakes: 40, exits: 10, beds: 30 },
    ],
  });
  const ill = find(rows, 'hospital', 'neighborhood', 'Rockridge', 'illness');
  assert('A: total = tracked + other', ill.TotalIntakes === 5 && ill.TrackedIntakes === 1 && ill.OtherResidentIntakes === 4);
  assert('B: closing follows the movements', ill.ClosingOccupancy === 4 && ill.TrackedOccupancy === 1 && ill.OtherResidentOccupancy === 3);
  const inj = find(rows, 'hospital', 'neighborhood', 'Rockridge', 'injury');
  assert('J: an injured admission is an intake with no bed', inj.TotalIntakes === 1 && inj.ClosingOccupancy === 1 && inj.BedsOccupied === 0);
  assert('J: beds count hospitalized + critical only', ill.BedsOccupied === 4);
  const city = find(rows, 'hospital', 'city', '', 'all');
  assert('C: city row is the sum of the disjoint scopes', city.TotalIntakes === 46 && city.ClosingOccupancy === 35 && city.BedsOccupied === 34);
  clean('named + other-resident', rows);
}

// ── D: replay ───────────────────────────────────────────────────────────────
{
  const rc = { system: 'hospital', kind: 'intake', sourceEventId: 'ambulance:ev9:POP-3', popId: 'POP-3', neighborhood: 'Fruitvale', intakeType: 'injury' };
  const open = [{ system: 'hospital', popId: 'POP-3', neighborhood: 'Fruitvale', intakeType: 'injury', statusNow: 'injured' }];
  const once = build({ receipts: [rc], trackedOpen: open });
  const twice = build({ receipts: [rc, Object.assign({}, rc)], trackedOpen: open });
  assert('D: same SourceEventId folded twice = folded once',
    twice.duplicates === 1 && JSON.stringify(twice.rows) === JSON.stringify(once.rows));

  // Already persisted by an earlier run of the same Cycle: no second intake.
  const rerun = build({
    receipts: [rc], seenKeys: once.keys, trackedOpen: open,
    opening: { [acct.careJusticeCellKey_('hospital', 'neighborhood', 'Fruitvale', 'injury')]: { tracked: 1, other: 0 } },
  });
  const row = find(rerun.rows, 'hospital', 'neighborhood', 'Fruitvale', 'injury');
  assert('D: a key persisted earlier adds no intake', rerun.duplicates === 1 && row.TotalIntakes === 0 && row.ClosingOccupancy === 1);
  clean('replay', rerun.rows);
  throws('a receipt without SourceEventId is refused', () => build({ receipts: [{ system: 'hospital', kind: 'intake', intakeType: 'injury' }] }), 'SourceEventId');
}

// ── E: second admission after the first closed; transition is not intake ────
{
  const k = acct.careJusticeCellKey_('hospital', 'neighborhood', 'Fruitvale', 'illness');
  const { rows, transitions } = build({
    opening: { [k]: { tracked: 1, other: 0 } },
    receipts: [
      { system: 'hospital', kind: 'exit', sourceEventId: 'health-engine:C105:illness:POP-4', popId: 'POP-4', neighborhood: 'Fruitvale', intakeType: 'illness' },
      { system: 'hospital', kind: 'intake', sourceEventId: 'health-engine:C110:illness:POP-4', popId: 'POP-4', neighborhood: 'Fruitvale', intakeType: 'illness' },
      { system: 'hospital', kind: 'transition', sourceEventId: 'health-engine:C110:illness:POP-4', popId: 'POP-4', neighborhood: 'Fruitvale', intakeType: 'illness' },
    ],
    trackedOpen: [{ system: 'hospital', popId: 'POP-4', neighborhood: 'Fruitvale', intakeType: 'illness', statusNow: 'critical' }],
  });
  const row = find(rows, 'hospital', 'neighborhood', 'Fruitvale', 'illness');
  assert('E: same POPID, distinct receipt after close = second intake', row.TotalIntakes === 1 && row.Exits === 1 && row.ClosingOccupancy === 1);
  assert('E: a transition inside an open row moves no count', transitions === 1 && row.BedsOccupied === 1);
  clean('readmission', rows);
}

// ── F: reconcile is a correction, never an intake; legacy rows unclassified ─
{
  const { rows } = build({
    receipts: [{ system: 'hospital', kind: 'correction', sourceEventId: 'reconcile:C110:POP-5', popId: 'POP-5', neighborhood: 'Rockridge', intakeType: '' }],
    trackedOpen: [{ system: 'hospital', popId: 'POP-5', neighborhood: 'Rockridge', intakeType: '', statusNow: 'injured' }],
  });
  const row = find(rows, 'hospital', 'neighborhood', 'Rockridge', 'unclassified');
  assert('F: reconcile raises Corrections and occupancy, not intake',
    row.Corrections === 1 && row.ClosingOccupancy === 1 && row.TotalIntakes === 0);
  assert('blank IntakeType counts as unclassified, never inferred', find(rows, 'hospital', 'city', '', 'unclassified').ClosingOccupancy === 1);
  clean('reconcile', rows);
  throws('an unknown IntakeType is refused', () => build({
    receipts: [{ system: 'hospital', kind: 'intake', sourceEventId: 'x:1:POP-5', neighborhood: 'Rockridge', intakeType: 'flu-ish' }] }), 'unknown IntakeType');
}

// ── G: unavailable is not zero ──────────────────────────────────────────────
{
  const { rows } = build({ sources: { hospital: 'ok', judicial: 'missing' } });
  const j = rows.filter(r => r.System === 'judicial');
  assert('G: missing source → unavailable with blank counts',
    j.length === 8 && j.every(r => r.Completeness === 'unavailable' && r.TotalIntakes === '' && r.ClosingOccupancy === ''));
  assert('G: no city total labelled complete over a missing source',
    find(rows, 'judicial', 'city', '', 'all').Completeness === 'unavailable');
  assert('G: the other system is untouched', find(rows, 'hospital', 'city', '', 'all').Completeness === 'complete');
  clean('one source missing', rows);

  const forged = JSON.parse(JSON.stringify(rows));
  forged.filter(r => r.System === 'judicial')[0].TotalIntakes = 0;
  assert('G: a zero written on an unavailable row is caught',
    acct.validateCareJusticeCensus_(forged).some(v => v.indexOf('G ') === 0));
}

// ── Incomplete: the ledger disagrees with the movements ─────────────────────
{
  const { rows } = build({
    receipts: [{ system: 'hospital', kind: 'intake', sourceEventId: 'ambulance:ev2:POP-6', popId: 'POP-6', neighborhood: 'Rockridge', intakeType: 'injury' }],
    trackedOpen: [], // the admission row never landed
  });
  assert('a lost write marks the scope incomplete, never complete',
    find(rows, 'hospital', 'neighborhood', 'Rockridge', 'all').Completeness === 'incomplete' &&
    find(rows, 'hospital', 'neighborhood', 'Rockridge', 'heat').Completeness === 'incomplete');
  assert('incomplete reaches the city row', find(rows, 'hospital', 'city', '', 'all').Completeness === 'incomplete');
  assert('other scopes stay complete', find(rows, 'hospital', 'neighborhood', 'Fruitvale', 'all').Completeness === 'complete');
  assert('a flagged failed write marks the system incomplete',
    build({ incomplete: { judicial: true } }).rows.filter(r => r.System === 'judicial').every(r => r.Completeness === 'incomplete'));
}

// ── B + H: one judicial case, Cycle by Cycle, then a transfer to treatment ──
{
  const k = acct.careJusticeCellKey_('judicial', 'neighborhood', 'Fruitvale', 'arrest');
  const held = [{ system: 'judicial', popId: 'POP-7', neighborhood: 'Fruitvale', intakeType: 'arrest', statusNow: 'pending' }];

  const c0 = build({
    receipts: [{ system: 'judicial', kind: 'intake', sourceEventId: 'patrol:ev5:POP-7', popId: 'POP-7', neighborhood: 'Fruitvale', intakeType: 'arrest' }],
    trackedOpen: held,
  });
  const r0 = find(c0.rows, 'judicial', 'neighborhood', 'Fruitvale', 'arrest');
  assert('B: arrest enters custody the Cycle it happens', r0.TotalIntakes === 1 && r0.ClosingOccupancy === 1 && r0.OccupancyMeasure === 'in-custody');
  assert('judicial rows carry no bed count', r0.BedsOccupied === '');
  clean('arrest Cycle', c0.rows);

  const c1 = build({
    opening: { [k]: { tracked: 1, other: 0 } },
    receipts: [{ system: 'judicial', kind: 'transition', sourceEventId: 'patrol:ev5:POP-7', popId: 'POP-7', neighborhood: 'Fruitvale', intakeType: 'arrest' }],
    trackedOpen: [Object.assign({}, held[0], { statusNow: 'held' })],
  });
  const r1 = find(c1.rows, 'judicial', 'neighborhood', 'Fruitvale', 'arrest');
  assert('B: the decision moves no count', r1.TotalIntakes === 0 && r1.OpeningOccupancy === 1 && r1.ClosingOccupancy === 1);
  clean('decision Cycle', c1.rows);

  const c2 = build({
    opening: { [k]: { tracked: 1, other: 0 } },
    receipts: [{ system: 'judicial', kind: 'exit', sourceEventId: 'patrol:ev5:POP-7', popId: 'POP-7', neighborhood: 'Fruitvale', intakeType: 'arrest' }],
    trackedOpen: [],
  });
  const r2 = find(c2.rows, 'judicial', 'neighborhood', 'Fruitvale', 'arrest');
  assert('B: release is one exit', r2.Exits === 1 && r2.TransfersOut === 0 && r2.ClosingOccupancy === 0);
  clean('release Cycle', c2.rows);

  // Diverted to a treatment bed: one person, out of custody, into care.
  const tr = build({
    opening: { [k]: { tracked: 1, other: 0 } },
    receipts: [
      { system: 'judicial', kind: 'transfer-out', sourceEventId: 'patrol:ev5:POP-7', popId: 'POP-7', neighborhood: 'Fruitvale', intakeType: 'arrest' },
      { system: 'hospital', kind: 'transfer-in', sourceEventId: 'patrol:ev5:POP-7', popId: 'POP-7', neighborhood: 'Fruitvale', intakeType: 'substance-treatment' },
    ],
    trackedOpen: [{ system: 'hospital', popId: 'POP-7', neighborhood: 'Fruitvale', intakeType: 'substance-treatment', statusNow: 'hospitalized' }],
  });
  const jOut = find(tr.rows, 'judicial', 'neighborhood', 'Fruitvale', 'arrest');
  const hIn = find(tr.rows, 'hospital', 'neighborhood', 'Fruitvale', 'substance-treatment');
  assert('H: transfer out of custody is not also an exit', jOut.TransfersOut === 1 && jOut.Exits === 0 && jOut.ClosingOccupancy === 0);
  assert('H: transfer into care is not an intake', hIn.TransfersIn === 1 && hIn.TotalIntakes === 0 && hIn.ClosingOccupancy === 1 && hIn.BedsOccupied === 1);
  assert('H: one shared SourceEventId, two movements, no duplicate', tr.duplicates === 0);
  clean('transfer to treatment', tr.rows);
}

// ── An investigation is not custody ────────────────────────────────────────
{
  const { rows } = build({
    trackedOpen: [{ system: 'judicial', popId: 'POP-9', neighborhood: 'Rockridge', intakeType: 'arrest', statusNow: 'investigating' }],
  });
  const row = find(rows, 'judicial', 'neighborhood', 'Rockridge', 'arrest');
  assert('an open investigation counts zero in custody and leaves the scope complete',
    row.ClosingOccupancy === 0 && row.Completeness === 'complete');
  clean('investigation only', rows);
}

// ── I: zero named events, nonzero other-resident demand ─────────────────────
{
  const { rows } = build({
    otherResident: [
      { system: 'hospital', scope: 'neighborhood', neighborhood: 'Fruitvale', intakeType: 'illness', intakes: 6, beds: 6 },
      { system: 'judicial', scope: 'unallocated', intakeType: 'arrest', intakes: 12, exits: 5 },
    ],
  });
  const h = find(rows, 'hospital', 'neighborhood', 'Fruitvale', 'illness');
  assert('I: demand is recorded with no named citizen', h.TotalIntakes === 6 && h.TrackedIntakes === 0 && h.OtherResidentOccupancy === 6);
  assert('I: judicial other-resident custody', find(rows, 'judicial', 'city', '', 'arrest').ClosingOccupancy === 7);
  clean('other-resident only', rows);
  throws('other-resident demand cannot name a hood outside the table', () => build({
    otherResident: [{ system: 'hospital', scope: 'neighborhood', neighborhood: 'Atlantis', intakeType: 'illness', intakes: 1 }] }), 'unknown neighborhood');
}

// ── Coverage guards ─────────────────────────────────────────────────────────
{
  const { rows } = build({
    receipts: [{ system: 'hospital', kind: 'intake', sourceEventId: 'ambulance:ev3:POP-8', popId: 'POP-8', neighborhood: 'Not In Table', intakeType: 'injury' }],
    trackedOpen: [{ system: 'hospital', popId: 'POP-8', neighborhood: 'Not In Table', intakeType: 'injury', statusNow: 'injured' }],
  });
  assert('a tracked citizen outside the hood table is counted once, in unallocated',
    find(rows, 'hospital', 'unallocated', '', 'injury').TrackedIntakes === 1 &&
    find(rows, 'hospital', 'city', '', 'injury').TotalIntakes === 1);
  clean('outside the table', rows);
  throws('city is derived, never supplied', () => acct.buildCareJusticeCensus_({
    cycle: 1, sources: OK, scopes: [{ scope: 'city', coveredPopulation: 1 }] }), 'derived');
  throws('the unallocated scope is required', () => acct.buildCareJusticeCensus_({
    cycle: 1, sources: OK, scopes: [SCOPES[0]] }), 'unallocated');
  throws('CoveredPopulation is never defaulted', () => acct.buildCareJusticeCensus_({
    cycle: 1, sources: OK, scopes: [{ scope: 'unallocated' }] }), 'CoveredPopulation');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
