/**
 * detectMathImbalances.test.js — coverage for v1.1.0 delta-from-prior decay
 * detection + coverage-gap retype.
 *
 * Run: node scripts/engine-auditor/detectMathImbalances.test.js
 * Exits 0 on pass, 1 on failure.
 */

const detector = require('./detectMathImbalances');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function makeAudit(cycle, snap) {
  return { cycle, snapshots: snap };
}

console.log('Test 1: small delta C92→C93 — no pattern (the v1.0.0 false-positive case)');
{
  // Mimics the actual C92→C93 data: Sentiment ±0.01-0.02, CrimeIndex +1.
  // v1.0.0 absolute thresholds (Sentiment<0.4, CrimeIndex>0.6) flagged every
  // neighborhood. v1.1.0 delta thresholds should produce no patterns.
  const ctx = {
    cycle: 93,
    snapshot: {
      Neighborhood_Map: [
        { Neighborhood: 'Downtown', Sentiment: 0.02, RetailVitality: 5, CrimeIndex: 5 },
        { Neighborhood: 'Temescal', Sentiment: -0.01, RetailVitality: 8, CrimeIndex: 3 },
      ],
      Initiative_Tracker: [],
      WorldEvents_V3_Ledger: [],
      Edition_Coverage_Ratings: [],
    },
    prior: [makeAudit(92, {
      Neighborhood_Map: [
        { Neighborhood: 'Downtown', Sentiment: 0, RetailVitality: 6.56, CrimeIndex: 4 },
        { Neighborhood: 'Temescal', Sentiment: 0, RetailVitality: 8.64, CrimeIndex: 2 },
      ],
    })],
  };
  const found = detector.detect(ctx);
  const decayPatterns = found.filter(p => p.type === 'math-imbalance' && p.evidence.fields.decaySignals);
  assert('no decay patterns from typical C92→C93 noise', decayPatterns.length === 0, `got ${decayPatterns.length}`);
}

console.log('\nTest 2: real decay (Sentiment drops, Crime jumps) → pattern flagged');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Neighborhood_Map: [
        { Neighborhood: 'West Oakland', Sentiment: -0.10, RetailVitality: 2.0, CrimeIndex: 8 },
      ],
      Initiative_Tracker: [],
      WorldEvents_V3_Ledger: [],
      Edition_Coverage_Ratings: [],
    },
    prior: [makeAudit(92, {
      Neighborhood_Map: [
        { Neighborhood: 'West Oakland', Sentiment: 0.05, RetailVitality: 4.5, CrimeIndex: 4 },
      ],
    })],
  };
  // dSent = -0.15 (≤ -0.02), dRetail = -2.5 (≤ -0.5), dCrime = +4 (≥ 2). 3 signals.
  const found = detector.detect(ctx);
  const decayPatterns = found.filter(p => p.type === 'math-imbalance' && p.evidence.fields.decaySignals);
  assert('decay pattern emitted', decayPatterns.length === 1);
  assert('severity high (3 signals, no matching initiative)',
    decayPatterns[0] && decayPatterns[0].severity === 'high',
    decayPatterns[0] && decayPatterns[0].severity);
}

console.log('\nTest 3: decay + matching active initiative → severity low');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Neighborhood_Map: [
        { Neighborhood: 'West Oakland', Sentiment: -0.10, RetailVitality: 2.0, CrimeIndex: 8 },
      ],
      Initiative_Tracker: [
        { InitiativeID: 'INIT-001', Name: 'Stab Fund', Status: 'passed', ImplementationPhase: 'disbursement-active', AffectedNeighborhoods: 'West Oakland' },
      ],
      WorldEvents_V3_Ledger: [],
      Edition_Coverage_Ratings: [],
    },
    prior: [makeAudit(92, {
      Neighborhood_Map: [
        { Neighborhood: 'West Oakland', Sentiment: 0.05, RetailVitality: 4.5, CrimeIndex: 4 },
      ],
    })],
  };
  const found = detector.detect(ctx);
  const decayPatterns = found.filter(p => p.type === 'math-imbalance' && p.evidence.fields.decaySignals);
  assert('decay pattern emitted', decayPatterns.length === 1);
  assert('severity low (mitigator present despite decay)',
    decayPatterns[0] && decayPatterns[0].severity === 'low',
    decayPatterns[0] && decayPatterns[0].severity);
  assert('matchingActiveInitiatives includes INIT-001',
    decayPatterns[0] && decayPatterns[0].evidence.fields.matchingActiveInitiatives.includes('INIT-001'));
}

console.log('\nTest 4: only 1 decay signal → no pattern (requires 2+)');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Neighborhood_Map: [
        { Neighborhood: 'Downtown', Sentiment: -0.10, RetailVitality: 6.5, CrimeIndex: 4 },
      ],
      Initiative_Tracker: [],
      WorldEvents_V3_Ledger: [],
      Edition_Coverage_Ratings: [],
    },
    prior: [makeAudit(92, {
      Neighborhood_Map: [
        { Neighborhood: 'Downtown', Sentiment: 0.02, RetailVitality: 6.56, CrimeIndex: 4 },
      ],
    })],
  };
  const found = detector.detect(ctx);
  const decayPatterns = found.filter(p => p.type === 'math-imbalance' && p.evidence.fields.decaySignals);
  assert('only Sentiment decayed; no pattern', decayPatterns.length === 0);
}

console.log('\nTest 5: no prior audit → decay subcheck skipped');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Neighborhood_Map: [
        { Neighborhood: 'Downtown', Sentiment: -0.5, RetailVitality: 0, CrimeIndex: 10 },
      ],
      Initiative_Tracker: [],
      WorldEvents_V3_Ledger: [],
      Edition_Coverage_Ratings: [],
    },
    prior: [],
  };
  const found = detector.detect(ctx);
  const decayPatterns = found.filter(p => p.type === 'math-imbalance' && p.evidence.fields.decaySignals);
  assert('no prior = no decay subcheck (1.0.0 absolute-threshold path retired)', decayPatterns.length === 0);
}

console.log('\nTest 6: production-without-consumption → type=coverage-gap (NOT math-imbalance)');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Neighborhood_Map: [],
      Initiative_Tracker: [],
      WorldEvents_V3_Ledger: Array.from({ length: 6 }, () => ({ Cycle: '93', Domain: 'faith' })),
      Edition_Coverage_Ratings: [
        { Cycle: '92', Domain: 'CIVIC' },
        { Cycle: '92', Domain: 'SPORTS' },
      ],
    },
    prior: [],
  };
  const found = detector.detect(ctx);
  const coverageGap = found.find(p => p.type === 'coverage-gap');
  assert('coverage-gap pattern emitted (not math-imbalance)', !!coverageGap);
  assert('subCheck = production-without-consumption',
    coverageGap && coverageGap.evidence.fields.subCheck === 'production-without-consumption');
  assert('domain = faith', coverageGap && coverageGap.evidence.fields.domain === 'faith');
  // Confirm it's NOT showing up as math-imbalance
  const mathPatterns = found.filter(p => p.type === 'math-imbalance' && p.evidence.fields.subCheck === 'production-without-consumption');
  assert('no math-imbalance pattern with production-without-consumption subcheck', mathPatterns.length === 0);
}

console.log('\nTest 7: growth-without-pressure subcheck still emits as math-imbalance');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Neighborhood_Map: [
        { Neighborhood: 'Rockridge', Sentiment: 0.6, RetailVitality: 0.7, CrimeIndex: 0.2 },
        { Neighborhood: 'Piedmont', Sentiment: 0.7, RetailVitality: 0.8, CrimeIndex: 0.1 },
      ],
      Initiative_Tracker: [],
      WorldEvents_V3_Ledger: [],
      Edition_Coverage_Ratings: [],
    },
    prior: [],
  };
  const found = detector.detect(ctx);
  const growth = found.find(p => p.type === 'math-imbalance' && p.evidence.fields.subCheck === 'growth-without-pressure');
  assert('growth-without-pressure flagged as math-imbalance (engine signal, not editorial)', !!growth);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
