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
  // Non-passed status ('in-progress') so the G-W54 vote-passed-terminal
  // suppression (v1.4.0) does not apply — this case exercises the severity
  // ladder, not the settled-program suppression.
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-X', 'active', 89, { status: 'in-progress' })] },
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

console.log('\nTest 3: carry-forward poisoning math (S216 engine.12) + G-W54 suppression — INIT-001 live case');
{
  // Only 2 priors retained. Both show same phase. VoteCycle=78, cycle=93.
  // Snapshot count=2. sinceVote=15. computeCyclesInState = max(2, 15) = 15.
  // The S216 carry-forward-poisoning math still holds (15, not poisoned 89).
  // BUT v1.4.0 G-W54: INIT-001 Status=passed + 15 cycles since vote > 3, so it
  // is vote-passed-terminal and exits stuck-detection entirely — no pattern.
  // This is the literal C95 contamination case (Stab Fund flagged stuck for 17
  // cycles, anchored Beverly Hayes as a relocation case across canon).
  const ctx = {
    cycle: 93,
    snapshot: { Initiative_Tracker: [makeRow('INIT-001', 'disbursement-active', 78)] },
    prior: [
      makeAudit(92, [makeRow('INIT-001', 'disbursement-active', 78)]),
      makeAudit(91, [makeRow('INIT-001', 'disbursement-active', 78)]),
    ],
  };
  const cis = detector.computeCyclesInState(ctx.snapshot.Initiative_Tracker[0], ctx);
  assert('cyclesInState math unchanged: vote-cycle ceiling 15, not poisoned 89', cis === 15, `got ${cis}`);
  const found = detector.detect(ctx);
  assert('G-W54 suppresses the settled passed initiative (no stuck pattern)', found.length === 0, `got ${found.length} patterns`);
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
  // Non-passed status ('in-progress') isolates the v1.3.0 downgrade mechanism
  // from the v1.4.0 G-W54 vote-passed-terminal suppression (which would suppress
  // a passed initiative before severity is computed). v1.3.0 is status-agnostic:
  // the prior C93 stuck-initiative pattern with verdict='remedy-firing-as-expected'
  // downgrades the current high severity to low.
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
    snapshot: { Initiative_Tracker: [makeRow('INIT-001', 'disbursement-active', 78, { status: 'in-progress' })] },
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
    snapshot: { Initiative_Tracker: [makeRow('INIT-002', 'pilot_evaluation', 82, { status: 'in-progress' })] },
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
    snapshot: { Initiative_Tracker: [makeRow('INIT-006', 'construction-active', 83, { status: 'in-progress' })] },
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
    snapshot: { Initiative_Tracker: [makeRow('INIT-X', 'active', 85, { status: 'in-progress' })] },
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
    snapshot: { Initiative_Tracker: [makeRow('INIT-A', 'active', 78, { status: 'in-progress' })] },
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
    snapshot: { Initiative_Tracker: [makeRow('INIT-TARGET', 'active', 78, { status: 'in-progress' })] },
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

console.log('\nTest 18: v1.4.0 G-W54 — passed + settled (sinceVote > 3) suppressed');
{
  // INIT-001 live case: Status=passed, VoteCycle=78, cycle=95 → sinceVote=17.
  // Deep snapshot history would otherwise flag it HIGH; G-W54 suppresses.
  const ctx = {
    cycle: 95,
    snapshot: { Initiative_Tracker: [makeRow('INIT-001', 'disbursement-active', 78, { status: 'passed' })] },
    prior: [
      makeAudit(94, [makeRow('INIT-001', 'disbursement-active', 78)]),
      makeAudit(93, [makeRow('INIT-001', 'disbursement-active', 78)]),
      makeAudit(92, [makeRow('INIT-001', 'disbursement-active', 78)]),
    ],
  };
  const found = detector.detect(ctx);
  assert('settled passed initiative emits no stuck pattern', found.length === 0, `got ${found.length}`);
}

console.log('\nTest 19: v1.4.0 G-W54 — boundary, sinceVote === 3 is NOT suppressed (> N, not >= N)');
{
  // Passed, VoteCycle=92, cycle=95 → sinceVote=3. Rule is strictly > 3, so this
  // is still inside the launch window and remains coverable. Needs deep snapshot
  // history to reach the stuck threshold within the window.
  const ctx = {
    cycle: 95,
    snapshot: { Initiative_Tracker: [makeRow('INIT-FRESH', 'pilot', 92, { status: 'passed' })] },
    prior: [
      makeAudit(94, [makeRow('INIT-FRESH', 'pilot', 92)]),
      makeAudit(93, [makeRow('INIT-FRESH', 'pilot', 92)]),
      makeAudit(92, [makeRow('INIT-FRESH', 'pilot', 92)]),
      makeAudit(91, [makeRow('INIT-FRESH', 'pilot', 92)]),
    ],
  };
  assert('isVotePassedTerminal false at sinceVote=3', detector.isVotePassedTerminal(ctx.snapshot.Initiative_Tracker[0], ctx.cycle) === false);
  const found = detector.detect(ctx);
  assert('boundary case still flagged (launch window coverable)', found.length === 1, `got ${found.length}`);
}

console.log('\nTest 20: v1.4.0 G-W54 — sinceVote === 4 IS suppressed (first cycle past the window)');
{
  const ctx = {
    cycle: 95,
    snapshot: { Initiative_Tracker: [makeRow('INIT-SETTLED', 'pilot', 91, { status: 'passed' })] },
    prior: [
      makeAudit(94, [makeRow('INIT-SETTLED', 'pilot', 91)]),
      makeAudit(93, [makeRow('INIT-SETTLED', 'pilot', 91)]),
      makeAudit(92, [makeRow('INIT-SETTLED', 'pilot', 91)]),
      makeAudit(91, [makeRow('INIT-SETTLED', 'pilot', 91)]),
    ],
  };
  assert('isVotePassedTerminal true at sinceVote=4', detector.isVotePassedTerminal(ctx.snapshot.Initiative_Tracker[0], ctx.cycle) === true);
  const found = detector.detect(ctx);
  assert('first cycle past the window is suppressed', found.length === 0, `got ${found.length}`);
}

console.log('\nTest 21: v1.4.0 G-W54 — non-passed initiative is NOT suppressed (INIT-003-style)');
{
  // INIT-003 live: Status=visioning-complete (not passed), stuck in vote-ready.
  // A non-passed initiative stuck in a phase is legitimate drama — keep flagging.
  const ctx = {
    cycle: 95,
    snapshot: { Initiative_Tracker: [makeRow('INIT-003', 'vote-ready', 88, { status: 'visioning-complete' })] },
    prior: [
      makeAudit(94, [makeRow('INIT-003', 'vote-ready', 88)]),
      makeAudit(93, [makeRow('INIT-003', 'vote-ready', 88)]),
      makeAudit(92, [makeRow('INIT-003', 'vote-ready', 88)]),
    ],
  };
  assert('isVotePassedTerminal false for non-passed status', detector.isVotePassedTerminal(ctx.snapshot.Initiative_Tracker[0], ctx.cycle) === false);
  const found = detector.detect(ctx);
  assert('non-passed stuck initiative still flagged', found.length === 1, `got ${found.length}`);
}

console.log('\nTest 22: v1.4.0 G-W54 — isVotePassedTerminal unit cases');
{
  assert('passed + sinceVote 17 → terminal', detector.isVotePassedTerminal({ Status: 'passed', VoteCycle: 78 }, 95) === true);
  assert('Passed (case-insensitive) → terminal', detector.isVotePassedTerminal({ Status: 'Passed', VoteCycle: 78 }, 95) === true);
  assert('announced status → not terminal', detector.isVotePassedTerminal({ Status: 'announced', VoteCycle: 78 }, 95) === false);
  assert('empty status → not terminal', detector.isVotePassedTerminal({ Status: '', VoteCycle: 78 }, 95) === false);
  assert('passed but missing VoteCycle → not terminal', detector.isVotePassedTerminal({ Status: 'passed', VoteCycle: '' }, 95) === false);
  assert('passed but future VoteCycle → not terminal', detector.isVotePassedTerminal({ Status: 'passed', VoteCycle: 99 }, 95) === false);
  assert('passed + "C78" cycle hint format → terminal', detector.isVotePassedTerminal({ Status: 'passed', VoteCycle: 'C78' }, 95) === true);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
