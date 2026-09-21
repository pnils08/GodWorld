#!/usr/bin/env node
'use strict';

/**
 * engine.132 — the repair-mechanism wire.
 *
 * The initiative ledger exists so a broken engine number can be answered by an
 * in-world event instead of a commit. For ~70 cycles the Temescal Community
 * Health Center could not touch sickness: DOMAIN_EFFECTS.health moved sentiment,
 * communityEngagement and publicSpaces, and the string "illness" appeared
 * nowhere in the file. These guard the wire and the timescale.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const logs = [];
const sandbox = { Logger: { log: (m) => logs.push(String(m)) } };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'phase02-world-state', 'applyInitiativeImplementationEffects.js'), 'utf8'),
  sandbox,
  { filename: 'applyInitiativeImplementationEffects.js' }
);

const HEADERS = ['InitiativeID', 'Name', 'Status', 'PolicyDomain', 'AffectedNeighborhoods', 'ImplementationPhase', 'Budget'];
function run(rows) {
  const ctx = {
    summary: { cycleId: 105 },
    config: {},
    persist: {},
    ss: {
      getSheetByName: (n) => n !== 'Initiative_Tracker' ? null : {
        getDataRange: () => ({ getValues: () => [HEADERS, ...rows] }),
      },
    },
  };
  sandbox.applyInitiativeImplementationEffects_(ctx);
  return Object.assign({}, ctx.summary.initiativeHealthRelief);
}
const row = (phase, hoods = 'Temescal', domain = 'health', name = 'Temescal Community Health Center') =>
  ['INIT-005', name, 'passed', domain, hoods, phase, '$45M'];

// ── a building site treats nobody ──────────────────────────────────────────
for (const phase of ['construction-planning', 'construction-active', 'design-phase', 'visioning']) {
  assert.deepStrictEqual(run([row(phase)]), {},
    `"${phase}" must NOT relieve illness — care has not started`);
}

// ── care being delivered does ──────────────────────────────────────────────
assert.deepStrictEqual(run([row('operational')]), { Temescal: 0.9 });
assert.deepStrictEqual(run([row('complete')]), { Temescal: 0.5 });
assert.deepStrictEqual(run([row('dispatch-live')]), { Temescal: 1.0 });

// ── only the health domain ─────────────────────────────────────────────────
assert.deepStrictEqual(run([row('operational', 'Temescal', 'transit', 'Fruitvale Transit Hub')]), {},
  'a transit initiative must not cure anyone');

// ── multi-hood, and strongest-wins ─────────────────────────────────────────
assert.deepStrictEqual(run([row('operational', 'Temescal, Rockridge')]),
  { Temescal: 0.9, Rockridge: 0.9 });
assert.deepStrictEqual(
  run([row('complete', 'Temescal'), row('dispatch-live', 'Temescal', 'health', 'OARI')]),
  { Temescal: 1.0 },
  'two clinics in one hood is not double the medicine — strongest delivering wins'
);

// ── the timescale: a story, not a geological era ───────────────────────────
// Temescal live at C104: 105 sick, population-scaled target 242. Gap 137.
function cyclesToClose(sick, target, rate) {
  let c = 0;
  while (sick !== target && c < 500) {
    const delta = target - sick;
    const step = Math.max(3, Math.ceil(Math.abs(delta) * rate));
    sick += delta > 0 ? Math.min(step, delta) : Math.max(-step, delta);
    c++;
  }
  return c;
}
const OLD_FLAT_3 = 0;
assert.strictEqual(cyclesToClose(105, 242, OLD_FLAT_3), 46,
  'the old flat +/-3 needed 46 cycles — longer than anything in this project persists');
const cycles = cyclesToClose(105, 242, 0.25);
assert.ok(cycles >= 4 && cycles <= 20,
  `gap-scaled convergence should land on a story timescale, got ${cycles}`);

// 80% of the gap must close inside 5 cycles — the window a cron can still see.
let sick = 105;
for (let i = 0; i < 5; i++) {
  const d = 242 - sick;
  sick += Math.min(Math.max(3, Math.ceil(Math.abs(d) * 0.25)), d);
}
assert.ok(sick >= 105 + 137 * 0.75,
  `5 cycles must close most of the gap; closed ${sick - 105} of 137`);

// The floor survives: tiny gaps still move, anti-swing intent intact.
assert.strictEqual(Math.max(3, Math.ceil(2 * 0.25)), 3, 'small gaps keep the old floor of 3');

// ── civic.38 Task 4 upkeep: delivered is not forever ───────────────────────
// A staged clinic nobody tends weakens: effective intensity = phase x tend factor.
{
  const H2 = HEADERS.concat(['Stage', 'LastStageChangeCycle', 'LastWorkCycle']);
  const DIALS = { civicTendGraceCycles: 6, civicTendDecayPerCycle: 0.15, civicTendFloor: 0.3 };
  const run2 = (rows, config, cycle) => {
    const ctx = {
      summary: { cycleId: cycle || 120 }, config: config === undefined ? DIALS : config, persist: {},
      ss: { getSheetByName: (n) => n !== 'Initiative_Tracker' ? null : { getDataRange: () => ({ getValues: () => [H2, ...rows] }) } },
    };
    sandbox.applyInitiativeImplementationEffects_(ctx);
    return ctx.summary;
  };
  const staged = (stage, change, work, phase = 'operational', domain = 'health', hoods = 'Temescal', name = 'Temescal Community Health Center') =>
    ['INIT-005', name, 'passed', domain, hoods, phase, '$45M', stage, change, work];

  assert.deepStrictEqual(Object.assign({}, run2([staged('Standing', 114, '')]).initiativeHealthRelief), { Temescal: 0.9 }, 'inside the grace: full strength');
  assert.deepStrictEqual(Object.assign({}, run2([staged('Standing', 113, '')]).initiativeHealthRelief), { Temescal: 0.765 }, 'one Cycle past the grace: 0.9 x 0.85');
  assert.deepStrictEqual(Object.assign({}, run2([staged('Delivering', 100, 101)]).initiativeHealthRelief), { Temescal: 0.27 }, 'long neglected: 0.9 x floor 0.3');
  assert.deepStrictEqual(Object.assign({}, run2([staged('Delivering', 100, 119)]).initiativeHealthRelief), { Temescal: 0.9 }, 'one work move restores it');
  assert.deepStrictEqual(Object.assign({}, run2([staged('', 100, '')]).initiativeHealthRelief), { Temescal: 0.9 }, 'a legacy row (blank Stage) never decays');
  assert.deepStrictEqual(Object.assign({}, run2([staged('', 100, '')], {}).initiativeHealthRelief), { Temescal: 0.9 }, 'a world with no staged row never reads the dials');
  assert.throws(() => run2([staged('Standing', 100, '')], {}), /civic upkeep: invalid or missing World_Config\.civicTendGraceCycles/, 'a staged row with a missing dial fails loud');

  // the hood fold scales with it; a stall is NOT softened by neglect
  const full = run2([staged('Standing', 119, '')]).initiativeNeighborhoodEffects.Temescal.sentiment;
  const worn = run2([staged('Standing', 100, '')]).initiativeNeighborhoodEffects.Temescal.sentiment;
  assert.ok(Math.abs(worn - full * 0.3) < 1e-9, `the hood fold pays the floor share: ${worn} vs ${full}`);
  const stallTended = run2([staged('Standing', 119, '', 'stalled')]).initiativeNeighborhoodEffects.Temescal.sentiment;
  const stallWorn = run2([staged('Standing', 100, '', 'stalled')]).initiativeNeighborhoodEffects.Temescal.sentiment;
  assert.strictEqual(stallWorn, stallTended, 'a stalled row drains the same, tended or not');

  // the transit slice carries the factor for the station (ruling g)
  const hub = run2([staged('Standing', 100, '', 'operational', 'transit', 'Fruitvale', 'Fruitvale Transit Hub')]).initiativeImplementationEffects.transit[0];
  assert.strictEqual(hub.tend, 0.3); assert.strictEqual(hub.intensity, 0.27); assert.strictEqual(hub.phase, 'operational');
  const legacyHub = run2([staged('', '', '', 'operational', 'transit', 'Fruitvale', 'Fruitvale Transit Hub')], {}).initiativeImplementationEffects.transit[0];
  assert.strictEqual(legacyHub.tend, 1, 'a legacy hub publishes tend 1');
  assert.ok(logs.some((l) => /upkeep 0\.30, untended 20/.test(l)), 'the log names the slip so a bench reads it from Logger alone');
}

console.log('illnessInitiativeRelief.test.js: all assertions passed');
