/**
 * generateTribuneFraming.test.js — covers the G-ER5 improvement-side fix
 * (S244 ES-3). Improvement patterns were marked gap:not-applicable by
 * checkMitigators and then handed EMPTY tribuneFraming — burying good news the
 * SKILL Step 6 says to surface. The fix threads positive, IMPROVEMENT-tagged
 * handles. Fixtures mirror the two real C95 improvement patterns.
 *
 * Run: node scripts/engine-auditor/generateTribuneFraming.test.js
 * Exits 0 on pass, 1 on failure.
 */

const { enrich } = require('./generateTribuneFraming');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function anyHandle(storyHandles) {
  return Object.values(storyHandles).some(h => h !== null);
}

console.log('Test 1: G-ER5 — Baylight phase-advance improvement gets threaded framing');
{
  const pattern = {
    type: 'improvement',
    severity: 'low',
    description: 'Initiative "Baylight District — Final Council Vote" advanced: construction-active → active-construction-phase-2-planning',
    affectedEntities: {
      citizens: ['Mike Paulson (POP-00527)', 'Mark Aitken (POP-00003)', 'Talia Finch (POP-00592)'],
      neighborhoods: ['Jack London', 'Downtown'],
      initiatives: ['INIT-006'],
      councilSeats: [],
    },
    evidence: { sheet: 'Initiative_Tracker', fields: { InitiativeID: 'INIT-006', Name: 'Baylight District — Final Council Vote', fromPhase: 'construction-active', toPhase: 'active-construction-phase-2-planning' } },
    mitigatorState: { exists: false, mitigators: [], gap: 'not-applicable', recommendedAction: 'none' },
  };
  enrich([pattern], {});
  const tf = pattern.tribuneFraming;
  assert('tribuneFraming present', !!tf);
  assert('tagged IMPROVEMENT', tf.tag === 'IMPROVEMENT');
  assert('storyHandles non-empty (not buried)', anyHandle(tf.storyHandles), JSON.stringify(tf.storyHandles));
  assert('a handle names the initiative', JSON.stringify(tf.storyHandles).includes('Baylight'));
  assert('a handle carries the phase advance', JSON.stringify(tf.storyHandles).includes('active-construction-phase-2-planning'));
  assert('handle carries IMPROVEMENT tag', Object.values(tf.storyHandles).filter(Boolean).every(h => h.tag === 'IMPROVEMENT'));
  assert('threeLayer.engine non-empty', !!tf.threeLayerCoverage.engine);
  assert('threeLayer.simulation names a neighborhood', /Jack London|Downtown/.test(tf.threeLayerCoverage.simulation));
  assert('capabilityHooks non-empty', tf.capabilityHooks.length > 0, JSON.stringify(tf.capabilityHooks));
  // Baylight → economic category → business desk applicable
  assert('business angle present (development = economic)', !!tf.storyHandles.business);
}

console.log('\nTest 2: G-ER5 — crime-overshoot improvement routes to safety/civic');
{
  const pattern = {
    type: 'improvement',
    severity: 'low',
    description: 'Remedy overshot expectation on Crime_Metrics.ViolentCrimeIndex: observed -1 (expected -0.05)',
    affectedEntities: {
      citizens: ['Elias Varek (POP-00789)', 'Ernesto Quintero (POP-00050)'],
      neighborhoods: ['West Oakland', 'Fruitvale', 'East Oakland'],
      initiatives: ['INIT-002'],
      councilSeats: [],
    },
    evidence: { sheet: 'Crime_Metrics', fields: { expectedField: 'Crime_Metrics.ViolentCrimeIndex', priorVerdict: 'remedy-overshot' } },
    mitigatorState: { exists: false, mitigators: [], gap: 'not-applicable', recommendedAction: 'none' },
  };
  enrich([pattern], {});
  const tf = pattern.tribuneFraming;
  assert('tagged IMPROVEMENT', tf.tag === 'IMPROVEMENT');
  assert('storyHandles non-empty', anyHandle(tf.storyHandles));
  assert('civic handle present (safety → civic desk)', !!tf.storyHandles.civic);
  assert('threeLayer.userActions credits the outcome', /positive outcome|good news|cover the milestone/i.test(tf.threeLayerCoverage.userActions));
  assert('capabilityHooks mention the initiative', JSON.stringify(tf.capabilityHooks).includes('INIT-002'));
}

console.log('\nTest 3: control — anomaly stays empty (not-applicable, no story handle)');
{
  const pattern = {
    type: 'anomaly',
    severity: 'low',
    description: 'Unexplained metric blip',
    affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
    evidence: { fields: {} },
    mitigatorState: { exists: false, mitigators: [], gap: 'not-applicable', recommendedAction: 'none' },
  };
  enrich([pattern], {});
  const tf = pattern.tribuneFraming;
  assert('anomaly storyHandles all null', !anyHandle(tf.storyHandles));
  assert('anomaly not tagged IMPROVEMENT', tf.tag !== 'IMPROVEMENT');
}

console.log('\nTest 4: control — ailment pattern still gets ailment framing');
{
  const pattern = {
    type: 'stuck-initiative',
    severity: 'high',
    cyclesInState: 4,
    description: 'INIT-009 stalled in planning',
    affectedEntities: { citizens: ['Someone (POP-1)'], neighborhoods: ['Temescal'], initiatives: ['INIT-009'], councilSeats: [] },
    evidence: { fields: {} },
    mitigatorState: { exists: true, mitigators: [{ initiativeId: 'INIT-009', name: 'X', implementationPhase: 'planning', cyclesInPhase: 4 }], gap: 'mitigator-stuck', recommendedAction: 'advance INIT-009', ailmentCategory: 'civic' },
  };
  enrich([pattern], {});
  const tf = pattern.tribuneFraming;
  assert('ailment storyHandles non-empty', anyHandle(tf.storyHandles));
  assert('ailment NOT tagged IMPROVEMENT', tf.tag !== 'IMPROVEMENT');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
