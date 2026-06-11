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

console.log('\nTest 6b: G-RC8 — multi-word error template emits ONE coalesced pattern, not N per-token');
{
  // Pre-v1.1.0 failure mode: a stable error template recurring across cycles
  // tokenized into multiple ≥4-char tokens, each producing an independent
  // pattern (1 root issue → 8 audit patterns). Post-v1.1.0 row-provenance
  // dedup coalesces tokens that always co-occur in the same rows.
  const errText = 'transformer outage uptown infrastructure shortfall';
  const ctx = {
    cycle: 93,
    snapshot: {
      Riley_Digest: [
        { Cycle: 91, Issues: errText, PatternFlag: '' },
        { Cycle: 92, Issues: errText, PatternFlag: '' },
        { Cycle: 93, Issues: errText, PatternFlag: '' },
      ],
      Initiative_Tracker: [],
    },
  };
  const found = require('./detectRepeatingEvents').detect(ctx);
  assert('exactly one pattern emitted (coalesced)', found.length === 1, `got ${found.length}`);
  const p = found[0];
  // Primary token tie-break: PatternFlag absent → first-appearance order.
  // First ≥4-char token of "transformer outage uptown infrastructure shortfall"
  // is "transformer".
  assert('primary token = "transformer" (first-seen)', p && p.evidence.fields.recurringIssue === 'transformer', p && p.evidence.fields.recurringIssue);
  assert('recurringTokens field carries the full coalesced group',
    p && Array.isArray(p.evidence.fields.recurringTokens) && p.evidence.fields.recurringTokens.length === 5,
    p && p.evidence.fields.recurringTokens && p.evidence.fields.recurringTokens.length);
  // Sanity — all 5 are members.
  const tokens = new Set(p && p.evidence.fields.recurringTokens);
  assert('all 5 co-occurring tokens present',
    tokens.has('transformer') && tokens.has('outage') && tokens.has('uptown')
    && tokens.has('infrastructure') && tokens.has('shortfall'));
}

console.log('\nTest 6c: G-RC8 — disjoint tokens NOT coalesced (different provenance)');
{
  // Two unrelated recurring issues across cycles should produce TWO patterns,
  // not one — the dedup is provenance-based, not blanket-merge.
  const ctx = {
    cycle: 93,
    snapshot: {
      Riley_Digest: [
        { Cycle: 91, Issues: 'transit problem', PatternFlag: 'transit' },
        { Cycle: 92, Issues: 'transit problem', PatternFlag: 'transit' },
        { Cycle: 93, Issues: 'transit problem', PatternFlag: 'transit' },
        { Cycle: 91, Issues: 'flooding alert', PatternFlag: 'flood' },
        { Cycle: 92, Issues: 'flooding alert', PatternFlag: 'flood' },
        { Cycle: 93, Issues: 'flooding alert', PatternFlag: 'flood' },
      ],
      Initiative_Tracker: [],
    },
  };
  const found = require('./detectRepeatingEvents').detect(ctx);
  // 'transit' rows have provenance {91:0, 92:1, 93:2}; 'flooding' rows have
  // {91:3, 92:4, 93:5}. Different provenance → two groups → two patterns.
  assert('two distinct patterns (disjoint provenance)', found.length === 2, `got ${found.length}`);
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

// ────────────────────────────────────────────────────────────────────────────
// Test 7: ES-2a (G-EC35) — leaked stack trace stripped, civic clause preserved
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 7: G-EC35 — error-clause strip (crash tokens out, civic story kept)');
{
  // The live KONO cell: a raw JS stack trace glued onto a real civic clause,
  // recurring every cycle (the crash fired every cycle).
  const glued = "[Phase2-CityDynamics] Cannot read properties of undefined (reading 'neighborhoodDynamics'), CIVIC – Inflow Strain – KONO – high";
  const ctx = {
    cycle: 96,
    snapshot: {
      Riley_Digest: [
        { Cycle: 94, Issues: glued, PatternFlag: '' },
        { Cycle: 95, Issues: glued, PatternFlag: '' },
        { Cycle: 96, Issues: glued, PatternFlag: '' },
      ],
      Initiative_Tracker: [],
    },
  };
  const found = detector.detect(ctx);
  const allTokens = found.flatMap(f => f.evidence.fields.recurringTokens || []).join(' ');

  // (a) The real civic story STILL surfaces (errors-are-stories: signal preserved).
  assert('KONO inflow-strain civic story preserved', /strain|inflow|kono|civic/.test(allTokens),
    `tokens="${allTokens}"`);
  // (b) No stack-trace token leaks into a civic pattern.
  const crash = /neighborhooddynamics|citydynamics|phase2|cannot|properties|undefined|reading|handler/;
  assert('no crash-trace token surfaces as a civic ailment', !crash.test(allTokens),
    `leaked in "${allTokens}"`);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 8: pure-error row contributes nothing (no civic clause to keep)
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 8: G-EC35 — pure stack-trace row emits no pattern');
{
  const err = "[Phase2-CityDynamics] Cannot read properties of undefined (reading 'neighborhoodDynamics')";
  const ctx = {
    cycle: 96,
    snapshot: {
      Riley_Digest: [
        { Cycle: 94, Issues: err, PatternFlag: '' },
        { Cycle: 95, Issues: err, PatternFlag: '' },
        { Cycle: 96, Issues: err, PatternFlag: '' },
      ],
      Initiative_Tracker: [],
    },
  };
  assert('pure error trace → 0 patterns', detector.detect(ctx).length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
