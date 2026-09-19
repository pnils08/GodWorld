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

// 2.0.0: the initiative check needs the prior audit (direction) and a city of
// hoods to take a median from. `city` pads the map so the median is stable.
function city(extra) {
  return [
    { Neighborhood: 'Rockridge', Sentiment: 0.60, CrimeIndex: 0.40, RetailVitality: 9 },
    { Neighborhood: 'Laurel', Sentiment: 0.55, CrimeIndex: 0.50, RetailVitality: 7 },
    { Neighborhood: 'Dimond', Sentiment: 0.50, CrimeIndex: 0.60, RetailVitality: 6 },
  ].concat(extra);
}
function priorAudit(inits, hoods, patterns) {
  return { cycle: 99, patterns: patterns || [], snapshots: { Initiative_Tracker: inits, Neighborhood_Map: city(hoods) } };
}

console.log('Test 1: active health initiative, affected sentiment below the city and falling — incoherence');
{
  const init = { InitiativeID: 'INIT-005', Name: 'Health Center', ImplementationPhase: 'operational',
    PolicyDomain: 'health', AffectedNeighborhoods: 'Temescal, Fruitvale' };
  const ctx = {
    cycle: 100,
    snapshot: {
      Initiative_Tracker: [init],
      Neighborhood_Map: city([
        { Neighborhood: 'Temescal', Sentiment: 0.20 },
        { Neighborhood: 'Fruitvale', Sentiment: 0.25 },
      ]),
      Civic_Office_Ledger: [],
    },
    prior: [priorAudit([init], [
      { Neighborhood: 'Temescal', Sentiment: 0.40 },
      { Neighborhood: 'Fruitvale', Sentiment: 0.45 },
    ])],
  };
  const found = detector.detect(ctx);
  const inc = found.find(f => f.evidence.fields.InitiativeID === 'INIT-005');
  assert('incoherence emitted', !!inc);
  assert('contradicting list has 2 entries', inc && inc.evidence.fields.contradicting.length === 2);
  assert('severity = high (>= 2 contradicting)', inc && inc.severity === 'high');
  assert('priorCycle recorded', inc && inc.evidence.fields.priorCycle === 99);
}

console.log('\nTest 2: active safety initiative, affected CrimeIndex above the city and RISING — incoherence');
{
  const init = { InitiativeID: 'INIT-CRIME', Name: 'Crime Reduction', ImplementationPhase: 'implementation-active',
    PolicyDomain: 'safety', AffectedNeighborhoods: 'West Oakland' };
  const ctx = {
    cycle: 100,
    snapshot: { Initiative_Tracker: [init], Neighborhood_Map: city([{ Neighborhood: 'West Oakland', CrimeIndex: 0.90 }]), Civic_Office_Ledger: [] },
    prior: [priorAudit([init], [{ Neighborhood: 'West Oakland', CrimeIndex: 0.80 }],
      [{ type: 'incoherence', affectedEntities: { initiatives: ['INIT-CRIME'] } }])],
  };
  const found = detector.detect(ctx);
  const inc = found.find(f => f.evidence.fields.InitiativeID === 'INIT-CRIME');
  assert('crime contradiction emitted', !!inc);
  assert('severity = medium (1 contradiction)', inc && inc.severity === 'medium');
  assert('cyclesInState counts the prior finding', inc && inc.cyclesInState === 1);
}

console.log('\nTest 2b: CrimeIndex above the city but FALLING — the program is working, no incoherence (C107 OARI case)');
{
  const init = { InitiativeID: 'INIT-002', Name: 'OARI', ImplementationPhase: 'implementation-active',
    PolicyDomain: 'safety', AffectedNeighborhoods: 'West Oakland, East Oakland, Fruitvale' };
  const ctx = {
    cycle: 100,
    snapshot: { Initiative_Tracker: [init], Neighborhood_Map: city([
      { Neighborhood: 'West Oakland', CrimeIndex: 0.97 },
      { Neighborhood: 'East Oakland', CrimeIndex: 0.97 },
      { Neighborhood: 'Fruitvale', CrimeIndex: 0.89 },
    ]), Civic_Office_Ledger: [] },
    prior: [priorAudit([init], [
      { Neighborhood: 'West Oakland', CrimeIndex: 1.10 },
      { Neighborhood: 'East Oakland', CrimeIndex: 1.11 },
      { Neighborhood: 'Fruitvale', CrimeIndex: 1.00 },
    ])],
  };
  const found = detector.detect(ctx);
  assert('no incoherence while the metric improves', found.filter(f => f.type === 'incoherence').length === 0);
}

console.log('\nTest 2c: no prior audit — direction unknown, no finding');
{
  const init = { InitiativeID: 'INIT-CRIME', ImplementationPhase: 'operational', PolicyDomain: 'crime', AffectedNeighborhoods: 'West Oakland' };
  const ctx = { cycle: 100, snapshot: { Initiative_Tracker: [init], Neighborhood_Map: city([{ Neighborhood: 'West Oakland', CrimeIndex: 0.95 }]), Civic_Office_Ledger: [] } };
  assert('no finding without a prior snapshot', detector.detect(ctx).length === 0);
}

console.log('\nTest 2d: initiative not active in the prior snapshot — not judged yet');
{
  const init = { InitiativeID: 'INIT-NEW', ImplementationPhase: 'operational', PolicyDomain: 'crime', AffectedNeighborhoods: 'West Oakland' };
  const was = Object.assign({}, init, { ImplementationPhase: 'passed' });
  const ctx = {
    cycle: 100,
    snapshot: { Initiative_Tracker: [init], Neighborhood_Map: city([{ Neighborhood: 'West Oakland', CrimeIndex: 0.95 }]), Civic_Office_Ledger: [] },
    prior: [priorAudit([was], [{ Neighborhood: 'West Oakland', CrimeIndex: 0.70 }])],
  };
  assert('first active cycle is skipped', detector.detect(ctx).length === 0);
}

console.log('\nTest 3: active initiative + healthy, steady metric → no incoherence');
{
  const init = { InitiativeID: 'INIT-OK', PolicyDomain: 'health', ImplementationPhase: 'operational', AffectedNeighborhoods: 'Rockridge' };
  const ctx = {
    cycle: 100,
    snapshot: { Initiative_Tracker: [init], Neighborhood_Map: city([]), Civic_Office_Ledger: [] },
    prior: [priorAudit([init], [])],
  };
  const found = detector.detect(ctx);
  assert('no incoherence when metric is healthy', found.length === 0);
}

console.log('\nTest 3b: housing initiative — HousingPressure RISING above the city is the contradiction');
{
  const init = { InitiativeID: 'INIT-H', PolicyDomain: 'housing', ImplementationPhase: 'operational', AffectedNeighborhoods: 'KONO' };
  const hoods = (hp) => [{ Neighborhood: 'Rockridge', HousingPressure: 0 }, { Neighborhood: 'Laurel', HousingPressure: 1 },
    { Neighborhood: 'Dimond', HousingPressure: 0 }, { Neighborhood: 'KONO', HousingPressure: hp }];
  const ctx = {
    cycle: 100,
    snapshot: { Initiative_Tracker: [init], Neighborhood_Map: hoods(4), Civic_Office_Ledger: [] },
    prior: [{ cycle: 99, patterns: [], snapshots: { Initiative_Tracker: [init], Neighborhood_Map: hoods(2) } }],
  };
  const inc = detector.detect(ctx).find(f => f.evidence.fields.InitiativeID === 'INIT-H');
  assert('rising housing pressure under a housing initiative flags', !!inc);
  assert('expected direction is down', inc && inc.evidence.fields.expected === 'HousingPressure down');
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
