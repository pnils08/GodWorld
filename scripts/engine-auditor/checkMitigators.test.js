/**
 * checkMitigators.test.js — covers the G-ER2 binding fix (S244 ES-2/ES-3).
 *
 * The Downtown math-imbalance pattern in C95 carried
 * affectedEntities.initiatives:["INIT-006"] (the detector bound it) yet the
 * enricher reported mitigatorState.mitigators:[] / gap:"no-mitigator" because
 * the pattern's inferred category did not equal the initiative's category. The
 * old guards dropped the explicitly-bound initiative; the fix trusts the
 * detector's binding and uses the initiative's own category for effect compute.
 *
 * Run: node scripts/engine-auditor/checkMitigators.test.js
 * Exits 0 on pass, 1 on failure.
 */

const { enrich } = require('./checkMitigators');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// ctx with INIT-006 in the tracker under a DIFFERENT policy domain than the
// pattern's inferred category, so the old category-match guard would drop it.
function makeCtx() {
  return {
    snapshot: {
      Initiative_Tracker: [
        {
          InitiativeID: 'INIT-006',
          Name: 'Downtown Retail Recovery',
          PolicyDomain: 'economic',           // → rowCategory 'economic'
          Status: 'passed',
          ImplementationPhase: 'active',
          AffectedNeighborhoods: 'Downtown',
        },
      ],
      Neighborhood_Map: [],
      Crime_Metrics: [],
    },
    prior: [],
  };
}

console.log('Test 1: G-ER2 — detector-bound initiative binds despite category mismatch');
{
  // Pattern category resolves to 'safety' via the "crime" description keyword,
  // mismatching INIT-006's 'economic' domain. Old code → no-mitigator.
  const pattern = {
    type: 'math-imbalance',
    severity: 'low',
    description: 'Downtown: crime rising despite 1 active mitigator(s) [INIT-006]',
    affectedEntities: { citizens: [], neighborhoods: ['Downtown'], initiatives: ['INIT-006'], councilSeats: [] },
    evidence: { fields: {} },
  };
  enrich([pattern], makeCtx());
  const ms = pattern.mitigatorState;
  assert('mitigatorState present', !!ms);
  assert('binds the linked initiative (mitigators.length === 1)', ms.mitigators.length === 1, JSON.stringify(ms.mitigators));
  assert('bound initiative is INIT-006', ms.mitigators[0] && ms.mitigators[0].initiativeId === 'INIT-006');
  assert('exists === true', ms.exists === true);
  assert('gap is NOT no-mitigator', ms.gap !== 'no-mitigator', `gap=${ms.gap}`);
  assert('recommendedAction is not "propose new initiative"', ms.recommendedAction !== 'propose new initiative', ms.recommendedAction);
}

console.log('\nTest 2: control — no linked initiative + no resolvable category → no-mitigator');
{
  const pattern = {
    type: 'math-imbalance',
    severity: 'low',
    description: 'Some neighborhood drift with no policy keywords and no linked initiative',
    affectedEntities: { citizens: [], neighborhoods: ['Nowhere'], initiatives: [], councilSeats: [] },
    evidence: { fields: {} },
  };
  enrich([pattern], makeCtx());
  assert('no-mitigator when nothing binds', pattern.mitigatorState.gap === 'no-mitigator', pattern.mitigatorState.gap);
  assert('mitigators empty', pattern.mitigatorState.mitigators.length === 0);
}

console.log('\nTest 3: control — improvement pattern stays not-applicable');
{
  const pattern = {
    type: 'improvement',
    severity: 'low',
    description: 'Baylight advanced a phase',
    affectedEntities: { citizens: [], neighborhoods: [], initiatives: ['INIT-006'], councilSeats: [] },
    evidence: { fields: {} },
  };
  enrich([pattern], makeCtx());
  assert('improvement → not-applicable', pattern.mitigatorState.gap === 'not-applicable', pattern.mitigatorState.gap);
}

console.log('\nTest 4: control — linked id missing from tracker is skipped (no crash)');
{
  const pattern = {
    type: 'math-imbalance',
    severity: 'low',
    description: 'Downtown: crime rising despite 1 active mitigator(s) [INIT-999]',
    affectedEntities: { citizens: [], neighborhoods: ['Downtown'], initiatives: ['INIT-999'], councilSeats: [] },
    evidence: { fields: {} },
  };
  enrich([pattern], makeCtx());
  assert('unknown linked id → no-mitigator, no crash', pattern.mitigatorState.gap === 'no-mitigator', pattern.mitigatorState.gap);
}

console.log('Test 5 (engine.124): a contribution row beats a swamped net delta');
{
  const prior = [{ snapshots: { Neighborhood_Map: [{ Neighborhood: 'West Oakland', RetailVitality: '5.0' }] } }];
  const base = {
    cycle: 105,
    prior,
    snapshot: {
      Initiative_Tracker: [{ InitiativeID: 'INIT-001', Name: 'West Oakland Stabilization Fund', PolicyDomain: 'economic',
        Status: 'passed', ImplementationPhase: 'disbursement-active', AffectedNeighborhoods: 'West Oakland' }],
      Neighborhood_Map: [{ Neighborhood: 'West Oakland', RetailVitality: '0.61' }],   // net −4.39 (the C104 table)
      Crime_Metrics: [],
    },
  };
  const mk = () => ({ type: 'math-imbalance', severity: 'medium', description: 'RetailVitality decay',
    affectedEntities: { citizens: [], neighborhoods: ['West Oakland'], initiatives: ['INIT-001'], councilSeats: [] },
    evidence: { sheet: 'Neighborhood_Map', rows: [], fields: {} } });

  // (a) ledger present, row for this initiative at this cycle → firing + swamped
  const withRow = JSON.parse(JSON.stringify(base));
  withRow.snapshot.Ripple_Ledger = [
    { Cycle: '105', CauseType: 'initiative-implementation', CauseId: 'West Oakland Stabilization Fund', EffectType: 'retail/sentiment/nightlife', TargetIds: 'West Oakland', Magnitude: '1' },
    { Cycle: '104', CauseType: 'initiative-implementation', CauseId: 'West Oakland Stabilization Fund', EffectType: 'retail/sentiment/nightlife', TargetIds: 'West Oakland', Magnitude: '1' },
  ];
  let p = mk(); enrich([p], withRow);
  let ev = p.mitigatorState.mitigators[0].effectEvidence;
  assert('ledger row → effects-firing', ev.verdict === 'effects-firing', ev.verdict);
  assert('contribution recorded (this cycle only)', ev.contribution && ev.contribution.fired && ev.contribution.rows === 1, JSON.stringify(ev.contribution));
  assert('net delta still reported (−4.39 → 0 positive move)', ev.netDelta === 0, String(ev.netDelta));
  assert('netSwamped flagged', ev.netSwamped === true);
  assert('expectedField unchanged (RetailVitality is the real fold target)', ev.expectedField === 'Neighborhood_Map.RetailVitality');
  assert('gap is not the stuck class', p.mitigatorState.gap !== 'mitigator-stuck', p.mitigatorState.gap);

  // (b) ledger present, NO row this cycle → the engine did not apply it → not-firing
  const noRow = JSON.parse(JSON.stringify(base));
  noRow.snapshot.Ripple_Ledger = [
    { Cycle: '104', CauseType: 'initiative-implementation', CauseId: 'West Oakland Stabilization Fund', EffectType: 'retail', TargetIds: 'West Oakland', Magnitude: '1' },
  ];
  p = mk(); enrich([p], noRow);
  ev = p.mitigatorState.mitigators[0].effectEvidence;
  assert('no row this cycle → effects-not-firing', ev.verdict === 'effects-not-firing', ev.verdict);
  assert('netSwamped false when nothing fired', ev.netSwamped === false);

  // (c) ledger absent from snapshot (pre-S428 fixture) → legacy net-delta read
  p = mk(); enrich([p], JSON.parse(JSON.stringify(base)));
  ev = p.mitigatorState.mitigators[0].effectEvidence;
  assert('no ledger → legacy net read → effects-not-firing', ev.verdict === 'effects-not-firing', ev.verdict);
  assert('no ledger → contribution undefined', ev.contribution === undefined);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
