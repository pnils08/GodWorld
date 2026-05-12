/**
 * detectIncoherence.test.js — implemented initiative vs contradicting metric +
 * high approval despite low district sentiment.
 *
 * Run: node scripts/engine-auditor/detectIncoherence.test.js
 * Exits 0 on pass, 1 on failure.
 */

const detector = require('./detectIncoherence');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: implemented health initiative but neighborhood sentiment low — incoherence');
{
  const ctx = {
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-005', Name: 'Health Center',
        ImplementationPhase: 'operational',
        PolicyDomain: 'health',
        AffectedNeighborhoods: 'Temescal, Fruitvale',
      }],
      Neighborhood_Map: [
        { Neighborhood: 'Temescal', Sentiment: 0.20 }, // contradicts 'up' direction
        { Neighborhood: 'Fruitvale', Sentiment: 0.25 },
      ],
      Civic_Office_Ledger: [],
    },
  };
  const found = detector.detect(ctx);
  const inc = found.find(f => f.evidence.fields.InitiativeID === 'INIT-005');
  assert('incoherence emitted', !!inc);
  assert('contradicting list has 2 entries', inc && inc.evidence.fields.contradicting.length === 2);
  assert('severity = high (>= 2 contradicting)', inc && inc.severity === 'high');
}

console.log('\nTest 2: implemented crime initiative but CrimeIndex high — contradicts down-direction');
{
  const ctx = {
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-CRIME', Name: 'Crime Reduction',
        ImplementationPhase: 'implemented',
        PolicyDomain: 'crime',
        AffectedNeighborhoods: 'West Oakland',
      }],
      Neighborhood_Map: [{ Neighborhood: 'West Oakland', CrimeIndex: 0.85 }],
      Civic_Office_Ledger: [],
    },
  };
  const found = detector.detect(ctx);
  const inc = found.find(f => f.evidence.fields.InitiativeID === 'INIT-CRIME');
  assert('crime contradiction emitted', !!inc);
  assert('severity = medium (1 contradiction)', inc && inc.severity === 'medium');
}

console.log('\nTest 3: implemented initiative + healthy neighborhood metric → no incoherence');
{
  const ctx = {
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-OK', PolicyDomain: 'health',
        ImplementationPhase: 'operational',
        AffectedNeighborhoods: 'Rockridge',
      }],
      Neighborhood_Map: [{ Neighborhood: 'Rockridge', Sentiment: 0.80 }],
      Civic_Office_Ledger: [],
    },
  };
  const found = detector.detect(ctx);
  assert('no incoherence when metric is healthy', found.length === 0);
}

console.log('\nTest 4: high approval (>= 0.7) despite low district sentiment (<= 0.35) — incoherence');
{
  const ctx = {
    snapshot: {
      Initiative_Tracker: [],
      Neighborhood_Map: [{ Neighborhood: 'Temescal', Sentiment: 0.30 }],
      Civic_Office_Ledger: [
        { OfficeId: 'COUNCIL-D7', Approval: 0.75, District: 'Temescal' },
      ],
    },
  };
  const found = detector.detect(ctx);
  const flip = found.find(f => f.affectedEntities.councilSeats.includes('COUNCIL-D7'));
  assert('council-vs-district incoherence emitted', !!flip);
  assert('severity = low', flip && flip.severity === 'low');
}

console.log('\nTest 5: not-yet-implemented initiative → skipped');
{
  const ctx = {
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-PLAN', PolicyDomain: 'health',
        ImplementationPhase: 'voting', // doesn't match implement/complet/operational/active
        AffectedNeighborhoods: 'Temescal',
      }],
      Neighborhood_Map: [{ Neighborhood: 'Temescal', Sentiment: 0.20 }],
      Civic_Office_Ledger: [],
    },
  };
  const found = detector.detect(ctx);
  const inits = found.filter(f => f.evidence.fields.InitiativeID === 'INIT-PLAN');
  assert('non-implemented initiative not in incoherence', inits.length === 0);
}

console.log('\nTest 6: domain not in DOMAIN_METRIC map → skipped');
{
  const ctx = {
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-EXOTIC', PolicyDomain: 'arts-and-culture',
        ImplementationPhase: 'operational',
        AffectedNeighborhoods: 'Temescal',
      }],
      Neighborhood_Map: [{ Neighborhood: 'Temescal', Sentiment: 0.20 }],
      Civic_Office_Ledger: [],
    },
  };
  const found = detector.detect(ctx);
  const inits = found.filter(f => f.evidence.fields.InitiativeID === 'INIT-EXOTIC');
  assert('unmapped policy domain → skipped', inits.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
