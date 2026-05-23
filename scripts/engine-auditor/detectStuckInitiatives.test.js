/**
 * detectStuckInitiatives.test.js — standalone test for v1.2.0 snapshot-walk +
 * vote-cycle ceiling logic. Covers the S216 civic.7 phase-advance fix and the
 * S216 engine.12 carry-forward poisoning fix.
 *
 * Run: node scripts/engine-auditor/detectStuckInitiatives.test.js
 * Exits 0 on pass, 1 on failure.
 */

const detector = require('./detectStuckInitiatives');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function makeAudit(cycle, initiatives) {
  return {
    cycle,
    snapshots: { Initiative_Tracker: initiatives },
  };
}

function makeRow(id, phase, voteCycle, opts = {}) {
  return {
    InitiativeID: id,
    Name: opts.name || `Initiative ${id}`,
    ImplementationPhase: phase,
    Status: opts.status || 'passed',
    VoteCycle: voteCycle,
    AffectedNeighborhoods: opts.neighborhoods || '',
    PolicyDomain: opts.domain || 'general',
    LastUpdated: opts.lastUpdated || '',
  };
}

console.log('Test 1: phase advanced this cycle (S216 civic.7) — INIT-005-style');
{
  // Current cycle has phase B; prior cycle had phase A. cyclesInState=0.
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-005', 'design-development-active', 80)] },
    prior: [
      makeAudit(92, [makeRow('INIT-005', 'design-phase', 80)]),
      makeAudit(91, [makeRow('INIT-005', 'design-phase', 80)]),
    ],
  };
  const found = detector.detect(ctx);
  assert('phase-advance produces no stuck pattern (cyclesInState=0 < threshold)', found.length === 0, `got ${found.length} patterns`);
  const cis = detector.computeCyclesInState(ctx.snapshot.Initiative_Tracker[0], ctx);
  assert('computeCyclesInState returns 0 directly', cis === 0, `got ${cis}`);
}

console.log('\nTest 2: stable phase with deep snapshot history — exact count');
{
  // Initiative in same phase across 4 priors. Snapshot walk returns 4.
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-X', 'active', 89)] },
    prior: [
      makeAudit(92, [makeRow('INIT-X', 'active', 89)]),
      makeAudit(91, [makeRow('INIT-X', 'active', 89)]),
      makeAudit(90, [makeRow('INIT-X', 'active', 89)]),
      makeAudit(89, [makeRow('INIT-X', 'active', 89)]),
      makeAudit(88, [makeRow('INIT-X', 'pre-active', 89)]),
    ],
  };
  const cis = detector.computeCyclesInState(ctx.snapshot.Initiative_Tracker[0], ctx);
  assert('snapshot walk hits transition at C88; returns 4', cis === 4, `got ${cis}`);
  const found = detector.detect(ctx);
  assert('emits 1 pattern', found.length === 1);
  assert('severity medium (4-5 range)', found[0].severity === 'medium', found[0].severity);
}

console.log('\nTest 3: carry-forward poisoning case (S216 engine.12) — INIT-001-style');
{
  // Only 2 priors retained. Both show same phase. VoteCycle=78, cycle=93.
  // Snapshot count=2. sinceVote=15. Result = max(2, 15) = 15. NOT 89.
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-001', 'disbursement-active', 78)] },
    prior: [
      makeAudit(92, [makeRow('INIT-001', 'disbursement-active', 78)]),
      makeAudit(91, [makeRow('INIT-001', 'disbursement-active', 78)]),
    ],
  };
  const cis = detector.computeCyclesInState(ctx.snapshot.Initiative_Tracker[0], ctx);
  assert('vote-cycle ceiling caps at 15 (cycle - voteCycle), not poisoned 89', cis === 15, `got ${cis}`);
  const found = detector.detect(ctx);
  assert('still flagged as stuck (cyclesInState >= threshold)', found.length === 1);
  assert('severity high (>=6)', found[0].severity === 'high', found[0].severity);
}

console.log('\nTest 4: stable phase, snapshot count exceeds vote ceiling');
{
  // Edge case: 3 priors all same phase, voteCycle=92 (only 1 cycle since vote).
  // Snapshot count=3 > sinceVote=1. max() returns 3.
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-Y', 'active', 92)] },
    prior: [
      makeAudit(92, [makeRow('INIT-Y', 'active', 92)]),
      makeAudit(91, [makeRow('INIT-Y', 'active', 92)]),
      makeAudit(90, [makeRow('INIT-Y', 'active', 92)]),
    ],
  };
  const cis = detector.computeCyclesInState(ctx.snapshot.Initiative_Tracker[0], ctx);
  assert('snapshot count beats vote-cycle ceiling', cis === 3, `got ${cis}`);
}

console.log('\nTest 5: cold-start — initiative absent from all priors');
{
  // No prior audit contains the initiative. Falls into vote-cycle fallback.
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-NEW', 'active', 88)] },
    prior: [
      makeAudit(92, [makeRow('INIT-OTHER', 'active', 80)]),
      makeAudit(91, [makeRow('INIT-OTHER', 'active', 80)]),
    ],
  };
  const cis = detector.computeCyclesInState(ctx.snapshot.Initiative_Tracker[0], ctx);
  assert('cold-start uses vote-cycle (93-88=5)', cis === 5, `got ${cis}`);
}

console.log('\nTest 6: empty priors array');
{
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-Z', 'active', 90)] },
    prior: [],
  };
  const cis = detector.computeCyclesInState(ctx.snapshot.Initiative_Tracker[0], ctx);
  assert('empty priors → vote-cycle fallback (93-90=3)', cis === 3, `got ${cis}`);
}

console.log('\nTest 7: missing VoteCycle, cold-start');
{
  // No vote cycle, no priors → cyclesInState=0.
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-Q', 'active', '')] },
    prior: [],
  };
  const cis = detector.computeCyclesInState(ctx.snapshot.Initiative_Tracker[0], ctx);
  assert('missing voteCycle → 0', cis === 0, `got ${cis}`);
  const found = detector.detect(ctx);
  assert('not flagged (below threshold)', found.length === 0);
}

console.log('\nTest 8: VoteCycle in the future (forward-looking) — rejected');
{
  // Defensive: if VoteCycle is somehow > current cycle (shouldn't happen but
  // rows can be malformed), the <= cycle guard rejects it.
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-FUTURE', 'active', 99)] },
    prior: [],
  };
  const cis = detector.computeCyclesInState(ctx.snapshot.Initiative_Tracker[0], ctx);
  assert('future voteCycle → 0', cis === 0, `got ${cis}`);
}

console.log('\nTest 9: phase advance with intermediate matching priors');
{
  // Phase A this cycle. C92 had A (count 1), C91 had B (transition).
  // Walk: C92 match (1), C91 mismatch → break, return 1.
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-T', 'A', 80)] },
    prior: [
      makeAudit(92, [makeRow('INIT-T', 'A', 80)]),
      makeAudit(91, [makeRow('INIT-T', 'B', 80)]),
      makeAudit(90, [makeRow('INIT-T', 'B', 80)]),
    ],
  };
  const cis = detector.computeCyclesInState(ctx.snapshot.Initiative_Tracker[0], ctx);
  assert('walks until transition; returns consecutive count', cis === 1, `got ${cis}`);
}

console.log('\nTest 10: not active and no phase — skipped entirely');
{
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-DEAD', '', 80, { status: 'closed' })] },
    prior: [],
  };
  const found = detector.detect(ctx);
  assert('non-active, no phase → not in output', found.length === 0);
}

console.log('\nTest 11: v1.3.0 — prior remedy-firing-as-expected downgrades severity to low');
{
  // INIT-001 disbursement-active C78, current C94, sinceVote=16 → severity high.
  // Prior C93 audit carries a stuck-initiative pattern on INIT-001 with
  // measurement.verdict='remedy-firing-as-expected'. v1.3.0 downgrades to low.
  const priorAudit = {
    cycle: 93,
    snapshots: { Initiative_Tracker: [makeRow('INIT-001', 'disbursement-active', 78)] },
    patterns: [
      {
        type: 'stuck-initiative',
        affectedEntities: { initiatives: ['INIT-001'] },
        measurement: { verdict: 'remedy-firing-as-expected' },
      },
    ],
  };
  const ctx = {
    cycle: 94,
    snapshot: { Initiative_Tracker: [makeRow('INIT-001', 'disbursement-active', 78)] },
    prior: [priorAudit, makeAudit(92, [makeRow('INIT-001', 'disbursement-active', 78)])],
  };
  const found = detector.detect(ctx);
  assert('still emits stuck-initiative pattern', found.length === 1);
  assert('severity downgraded to low (remedy firing positive)', found[0].severity === 'low', found[0].severity);
  assert('evidence.remedyFiringPositive=true', found[0].evidence.remedyFiringPositive === true);
  assert('evidence.priorRemedyVerdict carried', found[0].evidence.priorRemedyVerdict === 'remedy-firing-as-expected');
  assert('description annotates the downgrade', found[0].description.indexOf('remedy-firing-as-expected') >= 0);
}

console.log('\nTest 12: v1.3.0 — prior remedy-overshot also downgrades');
{
  const priorAudit = {
    cycle: 93,
    snapshots: { Initiative_Tracker: [makeRow('INIT-002', 'pilot_evaluation', 82)] },
    patterns: [
      {
        type: 'stuck-initiative',
        affectedEntities: { initiatives: ['INIT-002'] },
        measurement: { verdict: 'remedy-overshot' },
      },
    ],
  };
  const ctx = {
    cycle: 94,
    snapshot: { Initiative_Tracker: [makeRow('INIT-002', 'pilot_evaluation', 82)] },
    prior: [priorAudit],
  };
  const found = detector.detect(ctx);
  assert('emits 1 pattern', found.length === 1);
  assert('severity downgraded to low (overshot is positive)', found[0].severity === 'low');
  assert('priorRemedyVerdict=remedy-overshot', found[0].evidence.priorRemedyVerdict === 'remedy-overshot');
}

console.log('\nTest 13: v1.3.0 — prior remedy-not-firing leaves severity unchanged');
{
  const priorAudit = {
    cycle: 93,
    snapshots: { Initiative_Tracker: [makeRow('INIT-006', 'construction-active', 83)] },
    patterns: [
      {
        type: 'stuck-initiative',
        affectedEntities: { initiatives: ['INIT-006'] },
        measurement: { verdict: 'remedy-not-firing' },
      },
    ],
  };
  const ctx = {
    cycle: 94,
    snapshot: { Initiative_Tracker: [makeRow('INIT-006', 'construction-active', 83)] },
    prior: [priorAudit],
  };
  const found = detector.detect(ctx);
  assert('emits 1 pattern', found.length === 1);
  assert('severity stays high (negative verdict, genuinely stuck)', found[0].severity === 'high', found[0].severity);
  assert('no remedyFiringPositive flag', found[0].evidence.remedyFiringPositive == null);
}

console.log('\nTest 14: v1.3.0 — prior remedy-firing-insufficient leaves severity unchanged');
{
  // remedy-firing-insufficient is NOT in POSITIVE_REMEDY_VERDICTS set.
  const priorAudit = {
    cycle: 93,
    snapshots: { Initiative_Tracker: [makeRow('INIT-X', 'active', 85)] },
    patterns: [
      {
        type: 'stuck-initiative',
        affectedEntities: { initiatives: ['INIT-X'] },
        measurement: { verdict: 'remedy-firing-insufficient' },
      },
    ],
  };
  const ctx = {
    cycle: 94,
    snapshot: { Initiative_Tracker: [makeRow('INIT-X', 'active', 85)] },
    prior: [priorAudit],
  };
  const found = detector.detect(ctx);
  assert('emits 1 pattern', found.length === 1);
  assert('severity stays high (insufficient is not positive)', found[0].severity === 'high', found[0].severity);
}

console.log('\nTest 15: v1.3.0 — no prior audit at cycle-1 → no downgrade attempted');
{
  const ctx = {
    cycle: 94,
    snapshot: { Initiative_Tracker: [makeRow('INIT-A', 'active', 78)] },
    prior: [
      // priors but none at cycle-1
      makeAudit(91, [makeRow('INIT-A', 'active', 78)]),
      makeAudit(90, [makeRow('INIT-A', 'active', 78)]),
    ],
  };
  const found = detector.detect(ctx);
  assert('emits stuck pattern by vote-cycle (16cy)', found.length === 1);
  assert('severity high (no positive prior found)', found[0].severity === 'high');
  assert('no remedyFiringPositive flag', found[0].evidence.remedyFiringPositive == null);
}

console.log('\nTest 16: v1.3.0 — prior pattern on different InitiativeID does not downgrade');
{
  const priorAudit = {
    cycle: 93,
    snapshots: { Initiative_Tracker: [makeRow('INIT-OTHER', 'active', 80)] },
    patterns: [
      {
        type: 'stuck-initiative',
        affectedEntities: { initiatives: ['INIT-OTHER'] },
        measurement: { verdict: 'remedy-firing-as-expected' },
      },
    ],
  };
  const ctx = {
    cycle: 94,
    snapshot: { Initiative_Tracker: [makeRow('INIT-TARGET', 'active', 78)] },
    prior: [priorAudit],
  };
  const found = detector.detect(ctx);
  assert('emits 1 pattern for INIT-TARGET', found.length === 1);
  assert('severity high (positive verdict was on a different id)', found[0].severity === 'high');
}

console.log('\nTest 17: v1.3.0 — findPriorPositiveRemedyIds returns correct map');
{
  const ctx = {
    cycle: 94,
    prior: [
      {
        cycle: 93,
        patterns: [
          { type: 'stuck-initiative', affectedEntities: { initiatives: ['A'] }, measurement: { verdict: 'remedy-firing-as-expected' } },
          { type: 'stuck-initiative', affectedEntities: { initiatives: ['B'] }, measurement: { verdict: 'remedy-overshot' } },
          { type: 'stuck-initiative', affectedEntities: { initiatives: ['C'] }, measurement: { verdict: 'remedy-not-firing' } },
          { type: 'math-imbalance', affectedEntities: { initiatives: ['D'] }, measurement: { verdict: 'remedy-firing-as-expected' } },
          { type: 'stuck-initiative', affectedEntities: { initiatives: ['E', 'F'] }, measurement: { verdict: 'remedy-firing-as-expected' } },
        ],
      },
    ],
  };
  const map = detector.findPriorPositiveRemedyIds(ctx);
  assert('A in map', map.has('A'));
  assert('B in map', map.has('B'));
  assert('C not in map (negative verdict)', !map.has('C'));
  assert('D not in map (wrong pattern type)', !map.has('D'));
  assert('E in map (multi-id pattern)', map.has('E'));
  assert('F in map (multi-id pattern)', map.has('F'));
  assert('map size 4', map.size === 4, `got ${map.size}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
