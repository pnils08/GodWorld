/**
 * detectRepeatingEvents.test.js — Riley_Digest issues recurring across
 * RECUR_WINDOW (3) cycles, cross-referenced to stuck initiatives in matching
 * policy domain.
 *
 * Run: node scripts/engine-auditor/detectRepeatingEvents.test.js
 * Exits 0 on pass, 1 on failure.
 */

const detector = require('./detectRepeatingEvents');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: same issue in 3+ cycles + stuck initiative in matching domain → high severity');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Riley_Digest: [
        { Cycle: 91, Issues: 'transit congestion downtown', PatternFlag: '' },
        { Cycle: 92, Issues: 'transit delays persistent', PatternFlag: 'transit' },
        { Cycle: 93, Issues: 'transit problems continue', PatternFlag: 'transit' },
      ],
      Initiative_Tracker: [{
        InitiativeID: 'INIT-T', Name: 'Transit Hub',
        PolicyDomain: 'transit',
        ImplementationPhase: 'planning',
      }],
    },
  };
  const found = detector.detect(ctx);
  const transit = found.find(f => f.evidence.fields.recurringIssue === 'transit');
  assert('transit recurrence emitted', !!transit, JSON.stringify(found.map(f => f.evidence.fields)));
  assert('severity high (stuck initiative)', transit && transit.severity === 'high');
  assert('stuckInitiativeCount = 1', transit && transit.evidence.fields.stuckInitiativeCount === 1);
}

console.log('\nTest 2: recurring issue with active initiative in matching domain → suppressed');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Riley_Digest: [
        { Cycle: 91, Issues: 'health crisis', PatternFlag: 'health' },
        { Cycle: 92, Issues: 'health concerns', PatternFlag: 'health' },
        { Cycle: 93, Issues: 'health pressure', PatternFlag: 'health' },
      ],
      Initiative_Tracker: [{
        InitiativeID: 'INIT-H', PolicyDomain: 'health',
        ImplementationPhase: 'design-development-active',
      }],
    },
  };
  const found = detector.detect(ctx);
  const health = found.find(f => f.evidence.fields.recurringIssue === 'health');
  assert('active matching initiative suppresses (no stuck) → no pattern', !health);
}

console.log('\nTest 3: recurring issue with no matching policy domain → medium severity');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Riley_Digest: [
        { Cycle: 91, Issues: 'noise complaints again', PatternFlag: '' },
        { Cycle: 92, Issues: 'noise complaints continue', PatternFlag: '' },
        { Cycle: 93, Issues: 'noise complaints persist', PatternFlag: '' },
      ],
      Initiative_Tracker: [],
    },
  };
  const found = detector.detect(ctx);
  const noise = found.find(f => f.evidence.fields.recurringIssue === 'noise');
  assert('no-initiative recurrence emitted', !!noise);
  assert('severity = medium (no matching/stuck initiatives)', noise && noise.severity === 'medium');
  assert('matchedPolicyDomain = null', noise && noise.evidence.fields.matchedPolicyDomain === null);
}

console.log('\nTest 4: only 2-cycle recurrence (below RECUR_WINDOW=3) → no pattern');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Riley_Digest: [
        { Cycle: 92, Issues: 'housing concerns', PatternFlag: '' },
        { Cycle: 93, Issues: 'housing problems', PatternFlag: '' },
      ],
      Initiative_Tracker: [],
    },
  };
  const found = detector.detect(ctx);
  assert('2-cycle recurrence below threshold → no patterns', found.length === 0);
}

console.log('\nTest 5: empty digest → no patterns');
{
  const ctx = {
    cycle: 93,
    snapshot: { Riley_Digest: [], Initiative_Tracker: [] },
  };
  const found = detector.detect(ctx);
  assert('empty Riley_Digest → no patterns', found.length === 0);
}

console.log('\nTest 6: short tokens (< 4 chars) ignored');
{
  const ctx = {
    cycle: 93,
    snapshot: {
      Riley_Digest: [
        { Cycle: 91, Issues: 'a b c d e', PatternFlag: '' },
        { Cycle: 92, Issues: 'x y z', PatternFlag: '' },
        { Cycle: 93, Issues: 'p q r', PatternFlag: '' },
      ],
      Initiative_Tracker: [],
    },
  };
  const found = detector.detect(ctx);
  assert('short tokens filtered → no recurrence', found.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
