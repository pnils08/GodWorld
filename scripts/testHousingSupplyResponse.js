#!/usr/bin/env node
/**
 * testHousingSupplyResponse.js — engine.93 Task 10 sandbox proof.
 *
 * The coupling: households moving change what a neighborhood costs. Before this,
 * HousingPressure moved only on a hood's city-relative trajectory score — three
 * families arriving on the same block changed nothing.
 *
 * migrationTrackingEngine publishes per-hood deltas (+0.1 per arriving
 * household, −0.05 per departing one) into S.relocationPressureDeltas;
 * neighborhoodTrajectoryEngine — the ONLY writer of the HousingPressure column —
 * folds them into its existing pressure computation. This proves that seam
 * without a sheet or a network call: the Neighborhood_Map read is a fake, and
 * the writes are captured as intents.
 *
 * Asserts (the Task 10 acceptance criteria):
 *   1. Three seeded arrivals into one hood raise its pressure by the expected
 *      delta, on top of the trajectory movement that would have happened anyway.
 *   2. A departure hood's pressure eases.
 *   3. An untouched hood is unaffected.
 *   4. Exactly one 'relocation-pressure' attribution row, naming the hoods.
 *   5. The delta bus is cleared, and a second pass does NOT re-apply it
 *      (without the clear, one move would ratchet a hood to the ceiling).
 *   6. The 0–10 clamp holds against an absurd delta.
 *
 * USAGE: node scripts/testHousingSupplyResponse.js
 * Exit 0 = all assertions pass; exit 1 = a failure.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..', 'phase05-citizens', 'neighborhoodTrajectoryEngine.js');

const ARRIVE = 'Temescal';   // seeded destination
const DEPART = 'Fruitvale';  // seeded origin
const UNTOUCHED = 'Rockridge';
const HOODS = [ARRIVE, DEPART, UNTOUCHED];

// migrationTrackingEngine's published constants — mirrored here so a change to
// them fails this test loudly instead of drifting silently.
const PRESSURE_IN = 0.1;
const PRESSURE_OUT = -0.05;

let failures = 0;
function check(label, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (cond || !detail ? '' : ' — ' + detail));
  if (!cond) failures++;
}

const HEADER = ['Neighborhood', 'Sentiment', 'RetailVitality', 'CrimeIndex',
  'EventAttractiveness', 'MigrationFlow', 'NeighborhoodTrajectory',
  'TrajectoryMomentum', 'TrajectoryStartCycle', 'HousingPressure',
  'MedianRent', 'MedianIncome'];

// Identical starting state for all three hoods, so any divergence in the result
// is caused by the relocation deltas and nothing else.
function fakeSheet(startingPressure) {
  const rows = HOODS.map(h => [h, 0.5, 1.0, 0, 1.0, 0, 'steady', 5, 1, startingPressure, 2000, 60000]);
  return {
    getDataRange: () => ({ getValues: () => [HEADER].concat(rows) }),
  };
}

function run(deltas, startingPressure) {
  const intents = [];
  const ripples = [];
  const sandbox = {
    Logger: { log: () => {} },
    console,
    queueCellIntent_: (ctx, tab, row, col, value) => { intents.push({ tab, row, col, value }); },
    recordRipple_: (ctx, e) => { ripples.push(e); return true; },
    recordHookRipple_: () => true,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: SRC });

  const ctx = {
    ss: { getSheetByName: (n) => (n === 'Neighborhood_Map' ? fakeSheet(startingPressure) : null) },
    summary: { cycleId: 500 },
    config: { cycleCount: 500 },
  };
  if (deltas) ctx.summary.relocationPressureDeltas = deltas;
  sandbox.processNeighborhoodTrajectory_(ctx);

  // HousingPressure is column 10 (1-indexed) in HEADER.
  const pressureCol = HEADER.indexOf('HousingPressure') + 1;
  const pressureByHood = {};
  intents.filter(i => i.col === pressureCol).forEach(i => {
    pressureByHood[HOODS[i.row - 2]] = i.value;
  });
  // A hood whose pressure did not change emits no intent — fall back to the
  // trajectory-only value we can read from the summary export.
  HOODS.forEach(h => {
    if (pressureByHood[h] === undefined) {
      const t = (ctx.summary.neighborhoodTrajectory || {})[h];
      if (t && t.pressure !== undefined) pressureByHood[h] = t.pressure;
    }
  });
  return { ctx, ripples, pressureByHood, sandbox };
}

console.log('engine.93 Task 10 — housing-supply response sandbox\n');

const START = 5;

// Baseline: no moves. All three hoods take the identical trajectory-only path.
const base = run(null, START);
const basePressure = base.pressureByHood[ARRIVE];
check('baseline: all hoods land on the same trajectory-only pressure',
  base.pressureByHood[ARRIVE] === base.pressureByHood[DEPART] &&
  base.pressureByHood[DEPART] === base.pressureByHood[UNTOUCHED],
  JSON.stringify(base.pressureByHood));
check('baseline writes no relocation-pressure ripple',
  base.ripples.filter(r => r.causeType === 'relocation-pressure').length === 0);

// Seeded: three households into ARRIVE, one out of DEPART.
const seededDeltas = {
  [ARRIVE]: PRESSURE_IN * 3,
  [DEPART]: PRESSURE_OUT,
};
const seeded = run(Object.assign({}, seededDeltas), START);

const arriveShift = seeded.pressureByHood[ARRIVE] - basePressure;
check('3 arrivals raise the destination hood by 3x the per-move delta',
  Math.abs(arriveShift - PRESSURE_IN * 3) < 1e-9,
  'expected ' + (PRESSURE_IN * 3).toFixed(3) + ', got ' + arriveShift.toFixed(3));

const departShift = seeded.pressureByHood[DEPART] - basePressure;
check('a departure eases the origin hood',
  Math.abs(departShift - PRESSURE_OUT) < 1e-9,
  'expected ' + PRESSURE_OUT + ', got ' + departShift.toFixed(3));

check('a hood with no moves is unaffected',
  seeded.pressureByHood[UNTOUCHED] === basePressure,
  'moved to ' + seeded.pressureByHood[UNTOUCHED] + ' from ' + basePressure);

// Attribution.
const relRows = seeded.ripples.filter(r => r.causeType === 'relocation-pressure');
check('exactly one relocation-pressure row for the cycle batch', relRows.length === 1,
  'got ' + relRows.length);
check('the row names both affected hoods, neighborhood-scoped',
  relRows.length === 1 && relRows[0].targetScope === 'neighborhood' &&
  relRows[0].targetIds.indexOf(ARRIVE) !== -1 &&
  relRows[0].targetIds.indexOf(DEPART) !== -1 &&
  relRows[0].targetIds.indexOf(UNTOUCHED) === -1);
check('the row reads as world-facing prose naming direction',
  relRows.length === 1 && /tighter in/.test(relRows[0].causeDetail) &&
  /easier in/.test(relRows[0].causeDetail) &&
  relRows[0].causeDetail.indexOf('{') === -1);

// Consume-and-clear.
check('delta bus cleared after consumption',
  Object.keys(seeded.ctx.summary.relocationPressureDeltas || {}).length === 0);

// Re-run with the SAME (now-consumed) ctx summary: no delta may re-apply.
const rerunSandbox = seeded.sandbox;
const rerunIntents = [];
const rerunCtx = {
  ss: { getSheetByName: () => fakeSheet(START) },
  summary: seeded.ctx.summary,
  config: { cycleCount: 501 },
};
rerunSandbox.queueCellIntent_ = (c, tab, row, col, value) => { rerunIntents.push({ row, col, value }); };
rerunSandbox.processNeighborhoodTrajectory_(rerunCtx);
const pressureCol = HEADER.indexOf('HousingPressure') + 1;
const rerunArrive = rerunIntents.filter(i => i.col === pressureCol && i.row === 2).map(i => i.value)[0];
check('re-run does not re-apply the consumed delta (no ratchet)',
  rerunArrive === undefined || Math.abs(rerunArrive - basePressure) < 1e-9,
  'expected trajectory-only ' + basePressure + ', got ' + rerunArrive);

// Clamp: an absurd delta cannot escape the 0–10 column contract.
const clamped = run({ [ARRIVE]: 999, [DEPART]: -999 }, START);
check('0-10 clamp holds against an absurd delta',
  clamped.pressureByHood[ARRIVE] === 10 && clamped.pressureByHood[DEPART] === 0,
  JSON.stringify({ high: clamped.pressureByHood[ARRIVE], low: clamped.pressureByHood[DEPART] }));

// Malformed entries must not poison a hood.
const malformed = run({ [ARRIVE]: NaN, [DEPART]: 'not-a-number' }, START);
check('NaN / non-numeric deltas are skipped, not applied',
  Number.isFinite(malformed.pressureByHood[ARRIVE]) &&
  Number.isFinite(malformed.pressureByHood[DEPART]) &&
  malformed.pressureByHood[ARRIVE] === basePressure);

console.log('\n' + (failures === 0
  ? 'testHousingSupplyResponse.js: all assertions passed'
  : 'testHousingSupplyResponse.js: ' + failures + ' assertion(s) FAILED'));
process.exit(failures === 0 ? 0 : 1);
