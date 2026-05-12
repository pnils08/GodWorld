/**
 * detectAnomalies.test.js — coverage for the 4 anomaly subchecks (citizen-income
 * spike/drop, approval-flip, crime-outlier 3σ, migration-shift).
 *
 * Run: node scripts/engine-auditor/detectAnomalies.test.js
 * Exits 0 on pass, 1 on failure.
 */

const detector = require('./detectAnomalies');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: citizen-income spike (ratio >= 2.0) with peers also moving — cover-as-story');
{
  // Income jumps from 50k to 110k (ratio 2.2). Peers in same neighborhood
  // also moved 30%+ → peerShare >= 0.3 → cover-as-story / high confidence.
  const ledger = [
    { POPID: 'POP-001', Income: 110000, Neighborhood: 'Temescal' },
    { POPID: 'POP-002', Income: 105000, Neighborhood: 'Temescal' }, // 50k→105k (2.1x)
    { POPID: 'POP-003', Income: 100000, Neighborhood: 'Temescal' }, // 50k→100k (2.0x)
    { POPID: 'POP-004', Income: 50000, Neighborhood: 'Other' },
  ];
  const ctx = {
    cycle: 93,
    snapshot: { Simulation_Ledger: ledger, Civic_Office_Ledger: [], Crime_Metrics: [], Neighborhood_Map: [] },
    prior: [{ cycle: 92, citizenIncomes: { 'POP-001': 50000, 'POP-002': 50000, 'POP-003': 50000, 'POP-004': 50000 }, snapshots: {} }],
  };
  const found = detector.detect(ctx);
  const incomes = found.filter(f => f.evidence.fields.subCheck === 'citizen-income');
  assert('income anomalies emitted', incomes.length >= 1, `got ${incomes.length}`);
  const pop001 = incomes.find(f => f.evidence.fields.POPID === 'POP-001');
  assert('POP-001 anomaly present', !!pop001);
  assert('triagePath = cover-as-story (peerShare ≥ 0.3)', pop001 && pop001.triagePath === 'cover-as-story', pop001 && pop001.triagePath);
  assert('confidence = high', pop001 && pop001.confidence === 'high');
}

console.log('\nTest 2: citizen-income drop, isolated peer → route-to-engine-debug');
{
  const ledger = [
    { POPID: 'POP-A', Income: 20000, Neighborhood: 'Temescal' },
    { POPID: 'POP-B', Income: 100000, Neighborhood: 'Temescal' },
    { POPID: 'POP-C', Income: 100000, Neighborhood: 'Temescal' },
    { POPID: 'POP-D', Income: 100000, Neighborhood: 'Temescal' },
    { POPID: 'POP-E', Income: 100000, Neighborhood: 'Temescal' },
  ];
  const ctx = {
    cycle: 93,
    snapshot: { Simulation_Ledger: ledger, Civic_Office_Ledger: [], Crime_Metrics: [], Neighborhood_Map: [] },
    prior: [{ cycle: 92, citizenIncomes: { 'POP-A': 100000, 'POP-B': 100000, 'POP-C': 100000, 'POP-D': 100000, 'POP-E': 100000 }, snapshots: {} }],
  };
  const found = detector.detect(ctx);
  const popA = found.find(f => f.evidence.fields.POPID === 'POP-A');
  assert('isolated 80% drop emitted', !!popA);
  assert('triagePath = route-to-engine-debug (peerShare < 0.05)', popA && popA.triagePath === 'route-to-engine-debug', popA && popA.triagePath);
  assert('severity = high (ratio <= 0.3)', popA && popA.severity === 'high', popA && popA.severity);
}

console.log('\nTest 3: approval flip > 20pts (100-scale)');
{
  const council = [
    { OfficeId: 'COUNCIL-D1', Holder: 'Smith', Approval: 75, District: 'D1' },
  ];
  const ctx = {
    cycle: 93,
    snapshot: { Simulation_Ledger: [], Civic_Office_Ledger: council, Crime_Metrics: [], Neighborhood_Map: [] },
    prior: [{ cycle: 92, snapshots: { Civic_Office_Ledger: [{ OfficeId: 'COUNCIL-D1', Approval: 50 }] } }],
  };
  const found = detector.detect(ctx);
  const flip = found.find(f => f.evidence.fields.subCheck === 'approval-flip');
  assert('approval flip emitted', !!flip);
  assert('delta = 25', flip && parseFloat(flip.evidence.fields.delta) === 25);
  assert('triagePath = cover-as-story', flip && flip.triagePath === 'cover-as-story');
}

console.log('\nTest 4: crime outlier 3σ from 6-cycle mean');
{
  // 6 priors with mean ≈ 5, sd ≈ 1; current = 12 → z >= 6
  const priorAudits = [88, 89, 90, 91, 92].map(c => ({
    cycle: c,
    snapshots: { Crime_Metrics: [{ Neighborhood: 'West Oakland', ViolentCrimeIndex: 5 + (c % 2) }] },
  }));
  // Need 3+ priors; with 5 priors of values [5,6,5,6,5], mean=5.4, sd≈0.49
  const ctx = {
    cycle: 93,
    snapshot: { Simulation_Ledger: [], Civic_Office_Ledger: [], Crime_Metrics: [{ Neighborhood: 'West Oakland', ViolentCrimeIndex: 12 }], Neighborhood_Map: [] },
    prior: priorAudits,
  };
  const found = detector.detect(ctx);
  const crime = found.find(f => f.evidence.fields.subCheck === 'crime-outlier');
  assert('crime outlier emitted', !!crime);
  assert('z-score >= 3', crime && Math.abs(parseFloat(crime.evidence.fields.zScore)) >= 3, crime && crime.evidence.fields.zScore);
  assert('severity high (|z| >= 4)', crime && crime.severity === 'high', crime && crime.severity);
}

console.log('\nTest 5: migration shift > 0.3');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Simulation_Ledger: [], Civic_Office_Ledger: [], Crime_Metrics: [],
      Neighborhood_Map: [{ Neighborhood: 'Fruitvale', MigrationFlow: -0.4 }],
    },
    prior: [{ cycle: 92, snapshots: { Neighborhood_Map: [{ Neighborhood: 'Fruitvale', MigrationFlow: 0.05 }] } }],
  };
  const found = detector.detect(ctx);
  const mig = found.find(f => f.evidence.fields.subCheck === 'migration-shift');
  assert('migration shift emitted', !!mig);
  assert('delta = -0.45', mig && parseFloat(mig.evidence.fields.delta) === -0.45);
}

console.log('\nTest 6: crime outlier with < 3 priors → skipped');
{
  const ctx = {
    cycle: 93,
    snapshot: { Simulation_Ledger: [], Civic_Office_Ledger: [], Crime_Metrics: [{ Neighborhood: 'X', ViolentCrimeIndex: 100 }], Neighborhood_Map: [] },
    prior: [
      { cycle: 92, snapshots: { Crime_Metrics: [{ Neighborhood: 'X', ViolentCrimeIndex: 5 }] } },
      { cycle: 91, snapshots: { Crime_Metrics: [{ Neighborhood: 'X', ViolentCrimeIndex: 5 }] } },
    ],
  };
  const found = detector.detect(ctx);
  const crime = found.find(f => f.evidence.fields.subCheck === 'crime-outlier');
  assert('< 3 priors → no crime outlier emitted', !crime);
}

console.log('\nTest 7: empty priors — only same-cycle subchecks possible (none should fire without prior)');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Simulation_Ledger: [{ POPID: 'POP-X', Income: 999999, Neighborhood: 'Y' }],
      Civic_Office_Ledger: [], Crime_Metrics: [], Neighborhood_Map: [],
    },
    prior: [],
  };
  const found = detector.detect(ctx);
  assert('no patterns when no priors', found.length === 0, `got ${found.length}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
