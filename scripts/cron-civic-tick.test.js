#!/usr/bin/env node
/**
 * cron-civic-tick.test.js — civic.39 Tasks 1-2: the week-boundary stage machine
 * (state file + tick) and the deferred-verdict apply gate.
 *
 * Synthetic fixtures only: a temp ROOT per scenario, no network, no Sheets, no
 * model calls. The functions under test are the pure/derivation layer of
 * scripts/cron-civic-run.js (decideApply, refreshWeekState, saveWeekState) —
 * the exec paths (closeDeterministic / runGate / maybeApply) are exercised by
 * the Sunday dry-run, not here.
 *
 * Plan: docs/plans/2026-09-21-civic-sunday-stage-machine.md
 *   Acceptance 1 — a killed/corrupt seat leaves the deterministic checks,
 *     fold, sweep and stamping running; only that seat is pending.
 *   Acceptance 2 — tick twice: the second run does nothing (no state rewrite).
 *   Acceptance 7 — an unreachable clerk/sanity model defers; a real FAIL blocks.
 *
 * Run: node scripts/cron-civic-tick.test.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

const civicRun = require('./cron-civic-run');
const {
  WEEK_STAGES, VERDICT_CUTOFF_MS,
  blankWeekState, refreshWeekState, saveWeekState, weekStatePath, decideApply,
} = civicRun;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.error('  ✗ ' + name + '\n    ' + e.message); }
}

const CYCLE = 500; // synthetic — no such cycle exists in the world

function mkRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'civic39-tick-'));
  fs.mkdirSync(path.join(root, 'output', 'cron-civic'), { recursive: true });
  fs.mkdirSync(path.join(root, 'output', 'civic-voice'), { recursive: true });
  fs.mkdirSync(path.join(root, 'output', 'city-civic-database'), { recursive: true });
  return root;
}
function writeJson(root, rel, obj) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
  return p;
}
function fireEngine(root, ageMs) {
  const a = writeJson(root, 'output/world_summary_c' + CYCLE + '.md', null) // placeholder, replaced below
  ;
  fs.writeFileSync(a, '# world summary c' + CYCLE + '\n');
  const b = writeJson(root, 'output/engine_audit_c' + CYCLE + '.json', { cycle: CYCLE });
  if (ageMs) {
    const t = new Date(Date.now() - ageMs);
    fs.utimesSync(a, t, t);
    fs.utimesSync(b, t, t);
  }
}

// ────────────────────────────────────────────────────────────────────────────
console.log('\ndecideApply — the apply rule (rulings 1+3+4)');
// ────────────────────────────────────────────────────────────────────────────

test('deterministic failure blocks, whatever the verdicts say', () => {
  const d = decideApply({ dryOk: true, deterministicPass: false, clerkStatus: 'pass', sanityStatus: 'pass' });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.blocked, true);
});

test('dry-run failure blocks', () => {
  const d = decideApply({ dryOk: false, deterministicPass: true, clerkStatus: 'pass', sanityStatus: 'pass' });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.blocked, true);
});

test('a clerk FAIL blocks at any time — even past the cutoff', () => {
  const d = decideApply({
    dryOk: true, deterministicPass: true, clerkStatus: 'fail', sanityStatus: 'pass',
    firedAt: new Date(Date.now() - 24 * 3600e3).toISOString(),
  });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.blocked, true);
});

test('a sanity-read FAIL blocks at any time — even past the cutoff', () => {
  const d = decideApply({
    dryOk: true, deterministicPass: true, clerkStatus: 'pass', sanityStatus: 'fail',
    firedAt: new Date(Date.now() - 24 * 3600e3).toISOString(),
  });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.blocked, true);
});

test('both verdicts in and clean → apply via verdicts', () => {
  const d = decideApply({ dryOk: true, deterministicPass: true, clerkStatus: 'pass', sanityStatus: 'pass' });
  assert.strictEqual(d.apply, true);
  assert.strictEqual(d.via, 'verdicts');
});

test('empty-week skips count as settled verdicts', () => {
  const d = decideApply({ dryOk: true, deterministicPass: true, clerkStatus: 'skipped-empty', sanityStatus: 'skipped-empty' });
  assert.strictEqual(d.apply, true);
  assert.strictEqual(d.via, 'verdicts');
});

test('a deferred verdict holds the apply while the window is open', () => {
  const d = decideApply({
    dryOk: true, deterministicPass: true, clerkStatus: 'deferred', sanityStatus: 'pass',
    firedAt: new Date().toISOString(),
  });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.blocked, false);          // waiting, not failing
  assert.deepStrictEqual(d.waitingOn, ['clerk:deferred']);
});

test('a missing verdict holds the apply while the window is open', () => {
  const d = decideApply({
    dryOk: true, deterministicPass: true, clerkStatus: 'missing', sanityStatus: 'skipped',
    firedAt: new Date().toISOString(),
  });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.blocked, false);
  assert.deepStrictEqual(d.waitingOn, ['clerk:missing', 'sanity-read:skipped']);
});

test('6h after the engine fire the missing verdict stops holding the apply — flagged', () => {
  const d = decideApply({
    dryOk: true, deterministicPass: true, clerkStatus: 'deferred', sanityStatus: 'pass',
    firedAt: new Date(Date.now() - VERDICT_CUTOFF_MS - 60e3).toISOString(),
  });
  assert.strictEqual(d.apply, true);
  assert.strictEqual(d.via, 'cutoff');
  assert.deepStrictEqual(d.missingVerdicts, ['clerk:deferred']);
});

test('no fire timestamp → no cutoff → the apply waits', () => {
  const d = decideApply({ dryOk: true, deterministicPass: true, clerkStatus: 'deferred', sanityStatus: 'deferred', firedAt: null });
  assert.strictEqual(d.apply, false);
  assert.strictEqual(d.blocked, false);
});

// ────────────────────────────────────────────────────────────────────────────
console.log('\nrefreshWeekState — stage statuses derived from disk');
// ────────────────────────────────────────────────────────────────────────────

test('empty root: every stage waiting, no engine fire', () => {
  const root = mkRoot();
  const s = refreshWeekState(blankWeekState(CYCLE), root);
  assert.strictEqual(s.engineFiredAt, null);
  for (const name of WEEK_STAGES) assert.strictEqual(s.stages[name].status, 'waiting', name);
});

test('engine artifacts flip prep/directive to ready and stamp engineFiredAt', () => {
  const root = mkRoot();
  fireEngine(root);
  const s = refreshWeekState(blankWeekState(CYCLE), root);
  assert.ok(s.engineFiredAt, 'engineFiredAt stamped');
  assert.strictEqual(s.stages.prep.status, 'ready');
  assert.strictEqual(s.stages.directive.status, 'ready');
  assert.strictEqual(s.stages['mayor-open'].status, 'waiting');
  assert.strictEqual(s.stages['close-det'].status, 'waiting');
});

test('acceptance 1: a killed seat is pending — hearing done, close-det ready on the arrived voices', () => {
  const root = mkRoot();
  fireEngine(root);
  writeJson(root, 'output/civic-voice/mayor_open_c' + CYCLE + '.json', { statements: [] });
  writeJson(root, 'output/civic-voice/council_d1_c' + CYCLE + '.json', { statements: [] });
  writeJson(root, 'output/cron-civic/hearing_c' + CYCLE + '.json', {
    stage: 'hearing', cycle: CYCLE,
    results: [
      { slug: 'council_d1', ok: true },
      { slug: 'council_d7', ok: false, error: 'invalid JSON from model' },
    ],
  });
  const s = refreshWeekState(blankWeekState(CYCLE), root);
  assert.strictEqual(s.stages['mayor-open'].status, 'done');
  assert.strictEqual(s.stages.hearing.status, 'done');
  assert.deepStrictEqual(s.stages.hearing.inputs.pending, ['council_d7']);
  assert.strictEqual(s.stages['close-det'].status, 'ready', 'close-det does not wait on the killed seat');
});

test('gate + clerk records derive the verdict stages; fresh fire holds the apply', () => {
  const root = mkRoot();
  fireEngine(root);
  writeJson(root, 'output/cron-civic/gate_c' + CYCLE + '.json', {
    cycle: CYCLE, pass: true, deterministicPass: true, sanityStatus: 'deferred', failures: [],
  });
  writeJson(root, 'output/city-civic-database/clerk_audit_c' + CYCLE + '.json', { overall: 'pass', checks: [] });
  const s = refreshWeekState(blankWeekState(CYCLE), root);
  assert.strictEqual(s.stages['close-det'].status, 'done');
  assert.strictEqual(s.stages['close-det'].inputs.deterministicPass, true);
  assert.strictEqual(s.stages['verdict-clerk'].status, 'done');
  assert.strictEqual(s.stages['verdict-sanity'].status, 'deferred');
  assert.strictEqual(s.stages.apply.status, 'waiting');
  assert.strictEqual(s.stages.apply.inputs.decision.apply, false);
  assert.strictEqual(s.stages.apply.inputs.decision.blocked, false);
});

test('acceptance 7: past the 6h cutoff the apply goes ready via cutoff, flagged', () => {
  const root = mkRoot();
  fireEngine(root, VERDICT_CUTOFF_MS + 60e3);
  writeJson(root, 'output/cron-civic/gate_c' + CYCLE + '.json', {
    cycle: CYCLE, pass: true, deterministicPass: true, sanityStatus: 'deferred', failures: [],
  });
  writeJson(root, 'output/city-civic-database/clerk_audit_c' + CYCLE + '.json', { overall: 'pass', checks: [] });
  const s = refreshWeekState(blankWeekState(CYCLE), root);
  assert.strictEqual(s.stages.apply.status, 'ready');
  assert.strictEqual(s.stages.apply.inputs.decision.apply, true);
  assert.strictEqual(s.stages.apply.inputs.decision.via, 'cutoff');
  assert.deepStrictEqual(s.stages.apply.inputs.decision.missingVerdicts, ['sanity-read:deferred']);
});

test('a FAIL verdict marks the apply stage failed (blocked), never ready', () => {
  const root = mkRoot();
  fireEngine(root, VERDICT_CUTOFF_MS + 60e3);
  writeJson(root, 'output/cron-civic/gate_c' + CYCLE + '.json', {
    cycle: CYCLE, pass: false, deterministicPass: true, sanityStatus: 'fail',
    failures: [{ check: 'sanity-read', detail: 'phase moved backwards' }],
  });
  writeJson(root, 'output/city-civic-database/clerk_audit_c' + CYCLE + '.json', { overall: 'pass', checks: [] });
  const s = refreshWeekState(blankWeekState(CYCLE), root);
  assert.strictEqual(s.stages['verdict-sanity'].status, 'failed');
  assert.strictEqual(s.stages.apply.status, 'failed');
  assert.strictEqual(s.stages.apply.inputs.decision.apply, false);
});

test('a deterministic gate failure blocks the apply even with clean verdicts', () => {
  const root = mkRoot();
  fireEngine(root);
  writeJson(root, 'output/cron-civic/gate_c' + CYCLE + '.json', {
    cycle: CYCLE, pass: false, deterministicPass: false, sanityStatus: 'missing',
    failures: [{ check: 'validator', detail: 'HARD violation' }],
  });
  writeJson(root, 'output/city-civic-database/clerk_audit_c' + CYCLE + '.json', { overall: 'pass', checks: [] });
  const s = refreshWeekState(blankWeekState(CYCLE), root);
  assert.strictEqual(s.stages.apply.status, 'failed');
  assert.strictEqual(s.stages.apply.inputs.decision.blocked, true);
});

test('an applied close record closes the week', () => {
  const root = mkRoot();
  fireEngine(root);
  writeJson(root, 'output/cron-civic/gate_c' + CYCLE + '.json', {
    cycle: CYCLE, pass: true, deterministicPass: true, sanityStatus: 'pass', failures: [],
  });
  writeJson(root, 'output/city-civic-database/clerk_audit_c' + CYCLE + '.json', { overall: 'pass', checks: [] });
  writeJson(root, 'output/cron-civic/close_c' + CYCLE + '.json', { stage: 'close', cycle: CYCLE, applied: true });
  const s = refreshWeekState(blankWeekState(CYCLE), root);
  assert.strictEqual(s.stages.apply.status, 'done');
});

test('a prior FAIL verdict survives a --no-sanity record shape (sanity object fallback)', () => {
  const root = mkRoot();
  fireEngine(root, VERDICT_CUTOFF_MS + 60e3);
  // old record shape: no sanityStatus field, sanity {pass:false}
  writeJson(root, 'output/cron-civic/gate_c' + CYCLE + '.json', {
    cycle: CYCLE, pass: false, failures: [{ check: 'sanity-read', detail: 'x' }], sanity: { pass: false, issues: ['x'] },
  });
  writeJson(root, 'output/city-civic-database/clerk_audit_c' + CYCLE + '.json', { overall: 'pass', checks: [] });
  const s = refreshWeekState(blankWeekState(CYCLE), root);
  assert.strictEqual(s.stages['verdict-sanity'].status, 'failed');
  assert.strictEqual(s.stages.apply.status, 'failed');
});

// ────────────────────────────────────────────────────────────────────────────
console.log('\nacceptance 2 — idempotency');
// ────────────────────────────────────────────────────────────────────────────

test('a second refresh on an unchanged week changes nothing (no dirty flag)', () => {
  const root = mkRoot();
  fireEngine(root);
  writeJson(root, 'output/cron-civic/hearing_c' + CYCLE + '.json', {
    stage: 'hearing', cycle: CYCLE, results: [{ slug: 'council_d1', ok: false, error: 'killed' }],
  });
  const s = refreshWeekState(blankWeekState(CYCLE), root);
  assert.ok(s._dirty, 'first derivation is dirty');
  delete s._dirty;
  refreshWeekState(s, root);
  assert.ok(!s._dirty, 'second derivation over the same disk state is a no-op');
});

test('saveWeekState does not rewrite the file when nothing changed', () => {
  const root = mkRoot();
  const s = refreshWeekState(blankWeekState(CYCLE), root); // all waiting, no fire
  // all stages already 'waiting' in the blank state → nothing derived differently
  const wrote1 = saveWeekState(s, root);
  const p = weekStatePath(CYCLE, root);
  if (!wrote1) fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n'); // first save may be a no-op; force the file
  const before = fs.readFileSync(p, 'utf8');
  delete s._dirty;
  const wrote2 = saveWeekState(s, root);
  assert.strictEqual(wrote2, false, 'no rewrite without changes');
  assert.strictEqual(fs.readFileSync(p, 'utf8'), before, 'file untouched');
});

test('every WEEK_STAGE has a record in a blank state', () => {
  const s = blankWeekState(CYCLE);
  for (const name of WEEK_STAGES) {
    assert.ok(s.stages[name], name);
    assert.strictEqual(s.stages[name].status, 'waiting');
    assert.strictEqual(s.stages[name].attempts, 0);
  }
});

// ────────────────────────────────────────────────────────────────────────────
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
