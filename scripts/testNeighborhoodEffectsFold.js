#!/usr/bin/env node
/**
 * testNeighborhoodEffectsFold.js — engine.93 Task 6 sandbox proof for the
 * per-hood political consequence fold.
 *
 * WHY a VM harness and not a live cycle: `applyCityDynamics_` is Apps Script
 * (GAS globals, no module system), so it can't be `require`d. This loads the
 * real source into a Node VM with the handful of GAS globals it touches stubbed,
 * seeds the two effect buses, and runs the real function. No sheet, no network,
 * no clasp — the assertions are on in-memory state.
 *
 * What it proves (the Task 6 acceptance criteria):
 *   1. A seeded initiative effect lands as a measurable delta on its target hood
 *      and NOT on an untargeted hood.
 *   2. A seeded approval effect lands on its target hood's sentiment/engagement.
 *   3. Exactly one attributed Ripple row per bus, scoped to the hoods that
 *      actually received deltas.
 *   4. Both buses are cleared after the fold, and a second run applies nothing
 *      (no double-apply) — the consume-and-clear contract.
 *   5. A malformed bus entry (NaN / non-object) is skipped, not NaN-poisoned.
 *
 * USAGE: node scripts/testNeighborhoodEffectsFold.js
 * Exit 0 = all assertions pass; exit 1 = a failure.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..', 'phase02-world-state', 'applyCityDynamics.js');

// Target hoods: 'Downtown' is seeded, 'Rockridge' is the untouched control.
const TARGET = 'Downtown';
const CONTROL = 'Rockridge';

let failures = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log('  PASS  ' + label);
  } else {
    failures++;
    console.log('  FAIL  ' + label + (detail ? ' — ' + detail : ''));
  }
}

function buildContext(rippleSink) {
  const sandbox = {
    Logger: { log: () => {} },
    console,
    // recordRipple_ is the real attribution seam; capture instead of queueing.
    recordRipple_: (ctx, e) => { rippleSink.push(e); return true; },
    // Optional globals applyCityDynamics_ feature-detects; absent = skipped path.
    getNeighborhoodDemographics_: undefined,
    aggregateDemographics_: undefined,
    queueAppendIntent_: undefined,
    queueEnsureTabIntent_: undefined,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: SRC });
  return sandbox;
}

function freshCtx(buses) {
  return {
    summary: Object.assign({
      cycleId: 999,
      season: 'Spring',
      weather: { type: 'clear', impact: 1 },
    }, buses),
    config: {},
  };
}

function run(label, buses) {
  const ripples = [];
  const sandbox = buildContext(ripples);
  const ctx = freshCtx(buses);
  sandbox.applyCityDynamics_(ctx);
  return { ctx, ripples, sandbox, nd: ctx.summary.neighborhoodDynamics || {} };
}

console.log('engine.93 Task 6 — per-hood fold sandbox\n');

// ── Baseline: no buses seeded ────────────────────────────────────────────────
const base = run('baseline', {});
if (!base.nd[TARGET] || !base.nd[CONTROL]) {
  console.log('FATAL: expected hoods missing from neighborhoodDynamics — ' +
    'the fixture hood names are wrong for this build.');
  process.exit(1);
}
const baseTarget = base.nd[TARGET];
const baseControl = base.nd[CONTROL];
check('baseline produces neighborhoodDynamics for both fixture hoods',
  Number.isFinite(baseTarget.sentiment) && Number.isFinite(baseControl.sentiment));
check('baseline writes no fold ripple rows',
  base.ripples.filter(r => r.causeType === 'neighborhood-fold').length === 0);

// ── Seeded run ───────────────────────────────────────────────────────────────
const INITIATIVE_DELTA = { traffic: 0.04, retail: 0.03, sentiment: 0.05 };
const APPROVAL_DELTA = { sentiment: -0.012, communityEngagement: -0.006 };

const seeded = run('seeded', {
  initiativeNeighborhoodEffects: { [TARGET]: Object.assign({}, INITIATIVE_DELTA) },
  approvalNeighborhoodEffects: { [TARGET]: Object.assign({}, APPROVAL_DELTA) },
});
const seedTarget = seeded.nd[TARGET];
const seedControl = seeded.nd[CONTROL];

// 1 + 2: deltas land on the target hood, in the right direction and magnitude.
const expectedSentimentShift = INITIATIVE_DELTA.sentiment + APPROVAL_DELTA.sentiment;
const actualSentimentShift = seedTarget.sentiment - baseTarget.sentiment;
check('initiative + approval sentiment lands on the target hood',
  Math.abs(actualSentimentShift - expectedSentimentShift) < 1e-9,
  'expected ' + expectedSentimentShift.toFixed(6) + ', got ' + actualSentimentShift.toFixed(6));
check('initiative traffic delta lands on the target hood',
  Math.abs((seedTarget.traffic - baseTarget.traffic) - INITIATIVE_DELTA.traffic) < 1e-9,
  'got ' + (seedTarget.traffic - baseTarget.traffic).toFixed(6));
check('initiative retail delta lands on the target hood',
  Math.abs((seedTarget.retail - baseTarget.retail) - INITIATIVE_DELTA.retail) < 1e-9);
check('approval communityEngagement delta lands on the target hood',
  Math.abs((seedTarget.communityEngagement - baseTarget.communityEngagement) -
    APPROVAL_DELTA.communityEngagement) < 1e-9);

// The control hood must be untouched — this is the whole point of the plan:
// consequence lands where it was targeted instead of dissolving city-wide.
check('untargeted control hood is unchanged',
  Math.abs(seedControl.sentiment - baseControl.sentiment) < 1e-12 &&
  Math.abs(seedControl.traffic - baseControl.traffic) < 1e-12,
  'control drifted — the fold is leaking beyond its target');

// 3: exactly one attributed row per bus, scoped to the hoods that got deltas.
const foldRows = seeded.ripples.filter(r => r.causeType === 'neighborhood-fold');
check('exactly two fold ripple rows (one per bus)', foldRows.length === 2,
  'got ' + foldRows.length);
const initRow = foldRows.find(r => r.causeId === 'initiativeNeighborhoodEffects');
const apprRow = foldRows.find(r => r.causeId === 'approvalNeighborhoodEffects');
check('initiative fold row targets exactly the seeded hood',
  !!initRow && Array.isArray(initRow.targetIds) &&
  initRow.targetIds.length === 1 && initRow.targetIds[0] === TARGET);
check('approval fold row targets exactly the seeded hood',
  !!apprRow && Array.isArray(apprRow.targetIds) &&
  apprRow.targetIds.length === 1 && apprRow.targetIds[0] === TARGET);
check('fold rows are neighborhood-scoped and name their source engine',
  !!initRow && initRow.targetScope === 'neighborhood' &&
  initRow.sourceEngine === 'applyCityDynamics.foldNeighborhoodEffects');
check('fold rows carry world-facing prose, not JSON',
  !!initRow && typeof initRow.causeDetail === 'string' &&
  initRow.causeDetail.indexOf('{') === -1 && initRow.causeDetail.indexOf(TARGET) !== -1);

// 4: consume-and-clear + no double-apply.
check('initiative bus cleared after the fold',
  Object.keys(seeded.ctx.summary.initiativeNeighborhoodEffects || {}).length === 0);
check('approval bus cleared after the fold',
  Object.keys(seeded.ctx.summary.approvalNeighborhoodEffects || {}).length === 0);

// Re-run the same ctx with the buses now consumed. NOTE on the assertion shape:
// applyCityDynamics_ rebuilds every hood's metrics from cluster state on each
// call — it does not accumulate onto the previous value — so the proof of
// consume-and-clear is that the second pass lands back on the NEVER-SEEDED
// baseline. A double-apply would hold the seeded value or climb past it.
// (An earlier version of this test asserted "no movement between passes", which
// would have passed for a broken fold that re-applied its delta every cycle.)
const secondRipples = [];
const sandbox2 = buildContext(secondRipples);
sandbox2.applyCityDynamics_(seeded.ctx);
const afterSentiment = (seeded.ctx.summary.neighborhoodDynamics || {})[TARGET].sentiment;
check('re-run on the consumed ctx returns to the un-seeded baseline (no double-apply)',
  Math.abs(afterSentiment - baseTarget.sentiment) < 1e-12,
  'expected baseline ' + baseTarget.sentiment.toFixed(6) + ', got ' + afterSentiment.toFixed(6));
check('re-run writes no fold ripple rows',
  secondRipples.filter(r => r.causeType === 'neighborhood-fold').length === 0);

// 5: malformed bus entries are skipped, never NaN-poisoning a hood.
const malformed = run('malformed', {
  initiativeNeighborhoodEffects: {
    [TARGET]: { traffic: NaN, retail: 'not-a-number', sentiment: 0.02 },
    [CONTROL]: 'this is not an object',
  },
  approvalNeighborhoodEffects: { [TARGET]: null },
});
const malTarget = malformed.nd[TARGET];
check('NaN / non-numeric bus fields are skipped, not applied',
  Number.isFinite(malTarget.traffic) && Number.isFinite(malTarget.retail) &&
  Number.isFinite(malTarget.sentiment),
  'a hood metric went non-finite');
check('the valid field in a partly-malformed entry still applies',
  Math.abs((malTarget.sentiment - baseTarget.sentiment) - 0.02) < 1e-9);
check('non-object bus entry is skipped without throwing',
  Number.isFinite(malformed.nd[CONTROL].sentiment));

console.log('\n' + (failures === 0
  ? 'testNeighborhoodEffectsFold.js: all assertions passed'
  : 'testNeighborhoodEffectsFold.js: ' + failures + ' assertion(s) FAILED'));
process.exit(failures === 0 ? 0 : 1);
