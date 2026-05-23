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

console.log('\nTest 7: G-RC9 — prior remedy-overshot verdict emits improvement');
{
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [], Neighborhood_Map: [] },
    prior: [{
      cycle: 92,
      snapshots: { Initiative_Tracker: [], Neighborhood_Map: [] },
      patterns: [
        {
          type: 'stuck-initiative',
          severity: 'high',
          affectedEntities: { initiatives: ['INIT-002'], neighborhoods: ['Fruitvale'], citizens: [], councilSeats: [] },
          measurement: {
            available: true,
            verdict: 'remedy-overshot',
            expectedField: 'Neighborhood_Map.Sentiment',
            expected: 0.05,
            observed: 0.20,
            priorRemedyType: 'advance-initiative',
          },
        },
      ],
    }],
  };
  const found = detector.detect(ctx);
  const overshoot = found.find(f => f.evidence.fields.priorVerdict === 'remedy-overshot');
  assert('remedy-overshot improvement emitted', !!overshoot);
  assert('priorPatternType = stuck-initiative', overshoot && overshoot.evidence.fields.priorPatternType === 'stuck-initiative');
  assert('observed = 0.20', overshoot && overshoot.evidence.fields.observed === 0.20);
  assert('affectedEntities propagated from prior pattern', overshoot && overshoot.affectedEntities.initiatives.includes('INIT-002'));
}

console.log('\nTest 8: G-RC9 — remedy-firing-as-expected also emits improvement');
{
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [], Neighborhood_Map: [] },
    prior: [{
      cycle: 92,
      snapshots: { Initiative_Tracker: [], Neighborhood_Map: [] },
      patterns: [{
        type: 'math-imbalance',
        affectedEntities: { initiatives: [], neighborhoods: ['West Oakland'], citizens: [], councilSeats: [] },
        measurement: { available: true, verdict: 'remedy-firing-as-expected',
                       expectedField: 'Neighborhood_Map.RetailVitality', expected: 0.5, observed: 0.6 },
      }],
    }],
  };
  const found = detector.detect(ctx);
  const fired = found.find(f => f.evidence.fields.priorVerdict === 'remedy-firing-as-expected');
  assert('remedy-firing-as-expected improvement emitted', !!fired);
}

console.log('\nTest 9: G-RC9 — negative verdicts NOT emitted');
{
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [], Neighborhood_Map: [] },
    prior: [{
      cycle: 92,
      snapshots: { Initiative_Tracker: [], Neighborhood_Map: [] },
      patterns: [
        { type: 'stuck-initiative', affectedEntities: { initiatives: ['INIT-A'], neighborhoods: [], citizens: [], councilSeats: [] },
          measurement: { available: true, verdict: 'remedy-not-firing', expectedField: 'X.Y', expected: 1, observed: 0 } },
        { type: 'stuck-initiative', affectedEntities: { initiatives: ['INIT-B'], neighborhoods: [], citizens: [], councilSeats: [] },
          measurement: { available: true, verdict: 'remedy-firing-insufficient', expectedField: 'X.Y', expected: 1, observed: 0.3 } },
      ],
    }],
  };
  const found = detector.detect(ctx);
  const negEmitted = found.filter(f => f.evidence.fields.priorVerdict === 'remedy-not-firing'
                                      || f.evidence.fields.priorVerdict === 'remedy-firing-insufficient');
  assert('negative verdicts produce no improvement patterns', negEmitted.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
