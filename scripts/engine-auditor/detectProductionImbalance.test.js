/**
 * detectProductionImbalance.test.js — domain skew (one domain at many events
 * while others at zero) + migration without economic driver.
 *
 * Run: node scripts/engine-auditor/detectProductionImbalance.test.js
 * Exits 0 on pass, 1 on failure.
 */

const detector = require('./detectProductionImbalance');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: one domain dominant (15 events), others ≤1 — high severity');
{
  const events = [
    ...Array.from({ length: 22 }, () => ({ Cycle: '93', Domain: 'sports' })),
    { Cycle: '93', Domain: 'civic' },
    { Cycle: '93', Domain: 'health' },
  ];
  const ctx = {
    cycle: 93,
    snapshot: { WorldEvents_V3_Ledger: events, Neighborhood_Map: [] },
  };
  const found = detector.detect(ctx);
  const skew = found.find(f => f.evidence.fields.topDomain === 'sports');
  assert('domain-skew emitted', !!skew);
  assert('severity high (top >= 20)', skew && skew.severity === 'high', skew && skew.severity);
  assert('topDomainCount = 22', skew && skew.evidence.fields.topDomainCount === 22);
  assert('lowDomains includes civic + health', skew && skew.evidence.fields.lowDomains.length === 2);
}

console.log('\nTest 2: balanced production — no pattern');
{
  const events = [
    ...Array.from({ length: 5 }, () => ({ Cycle: '93', Domain: 'sports' })),
    ...Array.from({ length: 5 }, () => ({ Cycle: '93', Domain: 'civic' })),
    ...Array.from({ length: 4 }, () => ({ Cycle: '93', Domain: 'health' })),
  ];
  const ctx = {
    cycle: 93,
    snapshot: { WorldEvents_V3_Ledger: events, Neighborhood_Map: [] },
  };
  const found = detector.detect(ctx);
  const skew = found.find(f => f.evidence.fields.topDomain);
  assert('balanced production → no skew', !skew);
}

console.log('\nTest 3: medium severity skew (10 events with 8x ratio)');
{
  const events = [
    ...Array.from({ length: 10 }, () => ({ Cycle: '93', Domain: 'crime' })),
    { Cycle: '93', Domain: 'culture' },
  ];
  const ctx = {
    cycle: 93,
    snapshot: { WorldEvents_V3_Ledger: events, Neighborhood_Map: [] },
  };
  const found = detector.detect(ctx);
  const skew = found.find(f => f.evidence.fields.topDomain);
  assert('skew emitted', !!skew);
  assert('severity medium (top < 20)', skew && skew.severity === 'medium');
}

console.log('\nTest 4: only 1 domain present → no skew check (entries < 2)');
{
  const events = Array.from({ length: 50 }, () => ({ Cycle: '93', Domain: 'sports' }));
  const ctx = {
    cycle: 93,
    snapshot: { WorldEvents_V3_Ledger: events, Neighborhood_Map: [] },
  };
  const found = detector.detect(ctx);
  const skew = found.find(f => f.evidence.fields.topDomain);
  assert('single-domain events → no skew check fires', !skew);
}

console.log('\nTest 5: migration in ≥3 neighborhoods with zero economic events');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      WorldEvents_V3_Ledger: [
        { Cycle: '93', Domain: 'sports' },
      ],
      Neighborhood_Map: [
        { Neighborhood: 'A', MigrationFlow: -0.4 },
        { Neighborhood: 'B', MigrationFlow: 0.5 },
        { Neighborhood: 'C', MigrationFlow: -0.35 },
        { Neighborhood: 'D', MigrationFlow: 0.1 }, // not migrating (< 0.3)
      ],
    },
  };
  const found = detector.detect(ctx);
  const mig = found.find(f => f.evidence.fields.subCheck === 'migration-without-economic-cause');
  assert('migration-without-economic emitted', !!mig);
  assert('migratingCount = 3', mig && mig.evidence.fields.migratingCount === 3);
}

console.log('\nTest 6: migration but economic event present → no migration anomaly');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      WorldEvents_V3_Ledger: [{ Cycle: '93', Domain: 'economic' }],
      Neighborhood_Map: [
        { Neighborhood: 'A', MigrationFlow: -0.4 },
        { Neighborhood: 'B', MigrationFlow: 0.5 },
        { Neighborhood: 'C', MigrationFlow: -0.35 },
      ],
    },
  };
  const found = detector.detect(ctx);
  const mig = found.find(f => f.evidence.fields.subCheck === 'migration-without-economic-cause');
  assert('economic event present → migration anomaly suppressed', !mig);
}

console.log('\nTest 7: migration in only 2 neighborhoods → below threshold');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      WorldEvents_V3_Ledger: [],
      Neighborhood_Map: [
        { Neighborhood: 'A', MigrationFlow: -0.4 },
        { Neighborhood: 'B', MigrationFlow: 0.5 },
      ],
    },
  };
  const found = detector.detect(ctx);
  const mig = found.find(f => f.evidence.fields.subCheck === 'migration-without-economic-cause');
  assert('< 3 migrating → no migration anomaly', !mig);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
