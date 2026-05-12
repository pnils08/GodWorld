/**
 * detectCascadeFailures.test.js — initiative active with affected neighborhoods
 * showing no signal (Sentiment flat/negative + zero events this cycle).
 *
 * Run: node scripts/engine-auditor/detectCascadeFailures.test.js
 * Exits 0 on pass, 1 on failure.
 */

const detector = require('./detectCascadeFailures');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: active initiative, all affected neighborhoods silent → high severity');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-X', Name: 'Test Init',
        Status: 'active', ImplementationPhase: 'implementation',
        AffectedNeighborhoods: 'Temescal, Fruitvale',
      }],
      Neighborhood_Map: [
        { Neighborhood: 'Temescal', Sentiment: 0.20 },
        { Neighborhood: 'Fruitvale', Sentiment: 0.30 },
      ],
      WorldEvents_V3_Ledger: [],
    },
  };
  const found = detector.detect(ctx);
  assert('cascade-failure emitted', found.length === 1);
  assert('severity = high (all neighborhoods silent)', found[0] && found[0].severity === 'high', found[0] && found[0].severity);
  assert('silentNeighborhoods includes both', found[0] && found[0].evidence.fields.silentNeighborhoods.length === 2);
}

console.log('\nTest 2: half neighborhoods silent (>=50%) → medium severity');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-Y', Name: 'Test',
        Status: 'launched', ImplementationPhase: '',
        AffectedNeighborhoods: 'A, B, C, D',
      }],
      Neighborhood_Map: [
        { Neighborhood: 'A', Sentiment: 0.20 }, // silent (low + 0 events)
        { Neighborhood: 'B', Sentiment: 0.30 }, // silent
        { Neighborhood: 'C', Sentiment: 0.80 }, // not silent (high sentiment)
        { Neighborhood: 'D', Sentiment: 0.85 }, // not silent
      ],
      WorldEvents_V3_Ledger: [],
    },
  };
  const found = detector.detect(ctx);
  // 2 silent / 4 total = 50%, threshold is silent.length >= affected.length / 2, so 2 >= 2 → emit
  assert('emitted (silent >= half)', found.length === 1);
  assert('severity = medium (not all silent)', found[0] && found[0].severity === 'medium');
}

console.log('\nTest 3: most neighborhoods showing signal → no pattern');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-Z', Name: 'Healthy',
        Status: 'active', ImplementationPhase: 'rollout',
        AffectedNeighborhoods: 'A, B, C',
      }],
      Neighborhood_Map: [
        { Neighborhood: 'A', Sentiment: 0.80 },
        { Neighborhood: 'B', Sentiment: 0.75 },
        { Neighborhood: 'C', Sentiment: 0.20 },
      ],
      WorldEvents_V3_Ledger: [],
    },
  };
  const found = detector.detect(ctx);
  assert('no cascade-failure (only 1/3 silent)', found.length === 0);
}

console.log('\nTest 4: events in neighborhood counts as signal');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-W', Name: 'Event-driven',
        Status: 'active',
        AffectedNeighborhoods: 'Downtown',
      }],
      Neighborhood_Map: [{ Neighborhood: 'Downtown', Sentiment: 0.20 }],
      WorldEvents_V3_Ledger: [
        { Cycle: 93, Neighborhood: 'Downtown' },
        { Cycle: 93, Neighborhood: 'Downtown' },
      ],
    },
  };
  const found = detector.detect(ctx);
  assert('events present → not silent → no pattern', found.length === 0);
}

console.log('\nTest 5: passive initiative (Status=passed only) — not flagged');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-P', Name: 'Passive',
        Status: 'passed', // doesn't match active/implement/launched/rollout
        ImplementationPhase: 'voting',
        AffectedNeighborhoods: 'A, B',
      }],
      Neighborhood_Map: [
        { Neighborhood: 'A', Sentiment: 0.20 },
        { Neighborhood: 'B', Sentiment: 0.30 },
      ],
      WorldEvents_V3_Ledger: [],
    },
  };
  const found = detector.detect(ctx);
  assert('passive initiative skipped', found.length === 0);
}

console.log('\nTest 6: empty AffectedNeighborhoods → skipped');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-EMPTY', Name: 'No targets',
        Status: 'active', AffectedNeighborhoods: '',
      }],
      Neighborhood_Map: [],
      WorldEvents_V3_Ledger: [],
    },
  };
  const found = detector.detect(ctx);
  assert('no AffectedNeighborhoods → skipped', found.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
