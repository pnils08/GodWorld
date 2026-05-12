/**
 * detectImprovements.test.js — initiative phase advance + neighborhood sentiment
 * positive shift detection.
 *
 * Run: node scripts/engine-auditor/detectImprovements.test.js
 * Exits 0 on pass, 1 on failure.
 */

const detector = require('./detectImprovements');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function makeAudit(cycle, snap) { return { cycle, snapshots: snap }; }

console.log('Test 1: initiative phase advanced — improvement emitted');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-005', Name: 'Health Center',
        ImplementationPhase: 'design-development-active',
        AffectedNeighborhoods: 'Temescal',
      }],
      Neighborhood_Map: [],
    },
    prior: [makeAudit(92, {
      Initiative_Tracker: [{ InitiativeID: 'INIT-005', ImplementationPhase: 'design-phase' }],
      Neighborhood_Map: [],
    })],
  };
  const found = detector.detect(ctx);
  const phaseAdvance = found.find(f => f.evidence.fields.fromPhase === 'design-phase');
  assert('phase-advance improvement emitted', !!phaseAdvance);
  assert('toPhase = design-development-active', phaseAdvance && phaseAdvance.evidence.fields.toPhase === 'design-development-active');
  assert('severity = low', phaseAdvance && phaseAdvance.severity === 'low');
}

console.log('\nTest 2: neighborhood sentiment rose >= 0.1');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [],
      Neighborhood_Map: [{ Neighborhood: 'Rockridge', Sentiment: 0.65 }],
    },
    prior: [makeAudit(92, {
      Initiative_Tracker: [],
      Neighborhood_Map: [{ Neighborhood: 'Rockridge', Sentiment: 0.5 }],
    })],
  };
  const found = detector.detect(ctx);
  const sent = found.find(f => f.evidence.fields.Neighborhood === 'Rockridge');
  assert('sentiment-rise improvement emitted', !!sent);
  assert('sentimentDelta = 0.15', sent && parseFloat(sent.evidence.fields.sentimentDelta) === 0.15);
}

console.log('\nTest 3: small sentiment rise (< 0.1) → no pattern');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [],
      Neighborhood_Map: [{ Neighborhood: 'Temescal', Sentiment: 0.55 }],
    },
    prior: [makeAudit(92, {
      Initiative_Tracker: [],
      Neighborhood_Map: [{ Neighborhood: 'Temescal', Sentiment: 0.50 }],
    })],
  };
  const found = detector.detect(ctx);
  assert('0.05 rise below threshold → no pattern', found.length === 0);
}

console.log('\nTest 4: phase unchanged → no improvement');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [{
        InitiativeID: 'INIT-001',
        ImplementationPhase: 'disbursement-active',
      }],
      Neighborhood_Map: [],
    },
    prior: [makeAudit(92, {
      Initiative_Tracker: [{ InitiativeID: 'INIT-001', ImplementationPhase: 'disbursement-active' }],
      Neighborhood_Map: [],
    })],
  };
  const found = detector.detect(ctx);
  assert('stable-phase initiative → no improvement', found.length === 0);
}

console.log('\nTest 5: no prior audit → no improvements at all');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [{ InitiativeID: 'INIT-X', ImplementationPhase: 'whatever' }],
      Neighborhood_Map: [{ Neighborhood: 'A', Sentiment: 0.8 }],
    },
    prior: [],
  };
  const found = detector.detect(ctx);
  assert('no priors → no improvements', found.length === 0);
}

console.log('\nTest 6: new initiative not in prior → skipped (no comparison possible)');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Initiative_Tracker: [{ InitiativeID: 'INIT-NEW', ImplementationPhase: 'voting' }],
      Neighborhood_Map: [],
    },
    prior: [makeAudit(92, {
      Initiative_Tracker: [{ InitiativeID: 'INIT-OTHER', ImplementationPhase: 'design' }],
      Neighborhood_Map: [],
    })],
  };
  const found = detector.detect(ctx);
  assert('new initiative without prior → skipped', found.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
