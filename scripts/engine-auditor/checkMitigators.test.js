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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
