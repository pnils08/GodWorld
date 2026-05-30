/**
 * buildCitizenCards.test.js — T6 canon.3 Errors-gate contract
 *
 * Verifies emitErrorGateDump:
 *   - dump file path uses c<CYCLE> when env or base_context supplies cycle
 *   - dump file path falls back to ts<epoch> when neither source available
 *   - dumped JSON payload carries all fields per plan T6 step 2 shape
 *   - cycle resolution precedence: env CYCLE > env CYCLE_NUMBER > base_context.json > timestamp
 *
 * Does NOT exercise process.exit — gate caller (main) owns the exit decision;
 * emitErrorGateDump only writes the dump and returns the path.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var ROOT = path.resolve(__dirname, '..');
var BASE_CTX_PATH = path.join(ROOT, 'output/desk-packets/base_context.json');

// Bypass require.main === module guard — the script auto-runs main() otherwise.
// Resetting via delete-and-require so each test gets a clean module state for
// process.env mutations (the gate reads env at call time, not at require time,
// but the precedence test re-imports anyway to be safe).
function freshRequire() {
  delete require.cache[require.resolve('./buildCitizenCards.js')];
  return require('./buildCitizenCards.js');
}

function passing(name, fn) {
  try {
    fn();
    console.log('  PASS  ' + name);
    return 1;
  } catch (e) {
    console.error('  FAIL  ' + name);
    console.error('        ' + (e.message || e));
    return 0;
  }
}

function cleanup(p) {
  try { fs.unlinkSync(p); } catch (_) {}
}

var passed = 0;
var total = 0;

console.log('\n[T6] buildCitizenCards.js — Errors-gate contract\n');

// -----------------------------------------------------------------
// Group 1 — Cycle resolution precedence
// -----------------------------------------------------------------
console.log('Group 1 — Cycle resolution precedence');

total++; passed += passing('env CYCLE wins when set', function () {
  process.env.CYCLE = '99';
  delete process.env.CYCLE_NUMBER;
  var mod = freshRequire();
  var p = mod.emitErrorGateDump({ total_attempted: 1, written: 0, errors: 1, failures: [] });
  assert.ok(p.endsWith('citizen_card_failures_c99.json'), 'expected c99 in path, got: ' + p);
  cleanup(p);
});

total++; passed += passing('env CYCLE_NUMBER used when CYCLE absent', function () {
  delete process.env.CYCLE;
  process.env.CYCLE_NUMBER = '88';
  var mod = freshRequire();
  var p = mod.emitErrorGateDump({ total_attempted: 1, written: 0, errors: 1, failures: [] });
  assert.ok(p.endsWith('citizen_card_failures_c88.json'), 'expected c88 in path, got: ' + p);
  cleanup(p);
});

total++; passed += passing('numeric "c" prefix stripped before re-applying', function () {
  process.env.CYCLE = 'c77';
  delete process.env.CYCLE_NUMBER;
  var mod = freshRequire();
  var p = mod.emitErrorGateDump({ total_attempted: 1, written: 0, errors: 1, failures: [] });
  assert.ok(p.endsWith('citizen_card_failures_c77.json'), 'expected c77 (no double prefix), got: ' + p);
  cleanup(p);
});

total++; passed += passing('timestamp fallback when no env + no base_context', function () {
  delete process.env.CYCLE;
  delete process.env.CYCLE_NUMBER;
  // Move aside any existing base_context.json so the catch-fallback fires
  var savedBc = null;
  try { savedBc = fs.readFileSync(BASE_CTX_PATH, 'utf-8'); fs.unlinkSync(BASE_CTX_PATH); } catch (_) {}
  try {
    var mod = freshRequire();
    var p = mod.emitErrorGateDump({ total_attempted: 1, written: 0, errors: 1, failures: [] });
    assert.ok(/citizen_card_failures_ts\d+\.json$/.test(p), 'expected ts<epoch> path, got: ' + p);
    cleanup(p);
  } finally {
    if (savedBc) fs.writeFileSync(BASE_CTX_PATH, savedBc);
  }
});

total++; passed += passing('base_context.json read when env absent and file present', function () {
  delete process.env.CYCLE;
  delete process.env.CYCLE_NUMBER;
  var savedBc = null;
  try { savedBc = fs.readFileSync(BASE_CTX_PATH, 'utf-8'); } catch (_) {}
  fs.mkdirSync(path.dirname(BASE_CTX_PATH), { recursive: true });
  fs.writeFileSync(BASE_CTX_PATH, JSON.stringify({ cycle: 55 }));
  try {
    var mod = freshRequire();
    var p = mod.emitErrorGateDump({ total_attempted: 1, written: 0, errors: 1, failures: [] });
    assert.ok(p.endsWith('citizen_card_failures_c55.json'), 'expected c55, got: ' + p);
    cleanup(p);
  } finally {
    if (savedBc) fs.writeFileSync(BASE_CTX_PATH, savedBc); else cleanup(BASE_CTX_PATH);
  }
});

// -----------------------------------------------------------------
// Group 2 — Dump payload shape
// -----------------------------------------------------------------
console.log('\nGroup 2 — Dump payload shape');

total++; passed += passing('payload carries cycle + timestamp + counts + failures array', function () {
  process.env.CYCLE = '94';
  delete process.env.CYCLE_NUMBER;
  var mod = freshRequire();
  var failures = [
    { popid: 'POP-00001', name: 'Test One', error_message: '401 Unauthorized', http_status: 401 },
    { popid: 'POP-00002', name: 'Test Two', error_message: 'connect ETIMEDOUT', http_status: null }
  ];
  var p = mod.emitErrorGateDump({ total_attempted: 10, written: 8, errors: 2, failures: failures });
  var payload = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert.strictEqual(payload.cycle, '94');
  assert.ok(payload.timestamp && /^\d{4}-\d{2}-\d{2}T/.test(payload.timestamp), 'timestamp ISO');
  assert.strictEqual(payload.total_attempted, 10);
  assert.strictEqual(payload.written, 8);
  assert.strictEqual(payload.errors, 2);
  assert.strictEqual(payload.failures.length, 2);
  assert.deepStrictEqual(payload.failures[0], failures[0]);
  cleanup(p);
});

total++; passed += passing('empty failures array tolerated', function () {
  process.env.CYCLE = '94';
  var mod = freshRequire();
  var p = mod.emitErrorGateDump({ total_attempted: 1, written: 0, errors: 1, failures: [] });
  var payload = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert.deepStrictEqual(payload.failures, []);
  cleanup(p);
});

total++; passed += passing('missing failures key defaults to []', function () {
  process.env.CYCLE = '94';
  var mod = freshRequire();
  var p = mod.emitErrorGateDump({ total_attempted: 1, written: 0, errors: 1 });
  var payload = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert.deepStrictEqual(payload.failures, []);
  cleanup(p);
});

// -----------------------------------------------------------------
// Group 3 — File location + safety
// -----------------------------------------------------------------
console.log('\nGroup 3 — File location + safety');

total++; passed += passing('dump file lives at output/ root, not nested', function () {
  process.env.CYCLE = '94';
  var mod = freshRequire();
  var p = mod.emitErrorGateDump({ total_attempted: 1, written: 0, errors: 1, failures: [] });
  var rel = path.relative(ROOT, p);
  assert.strictEqual(rel, path.join('output', 'citizen_card_failures_c94.json'),
    'expected output/citizen_card_failures_c94.json, got: ' + rel);
  cleanup(p);
});

total++; passed += passing('dump returns string path, not undefined', function () {
  process.env.CYCLE = '94';
  var mod = freshRequire();
  var p = mod.emitErrorGateDump({ total_attempted: 1, written: 0, errors: 1, failures: [] });
  assert.strictEqual(typeof p, 'string');
  assert.ok(p.length > 0);
  cleanup(p);
});

// -----------------------------------------------------------------
// Group 4 — classify401Action (S247 ambiguous-401 decision)
// -----------------------------------------------------------------
console.log('\nGroup 4 — classify401Action (rate-limit-as-401 vs real auth)');

total++; passed += passing('probe 200 + attempts remain → retry-rate-limit', function () {
  var mod = freshRequire();
  assert.strictEqual(mod.classify401Action(200, 0, 3), 'retry-rate-limit');
  assert.strictEqual(mod.classify401Action(200, 2, 3), 'retry-rate-limit');
});

total++; passed += passing('probe 200 + retries exhausted → fail-rate-limit-exhausted', function () {
  var mod = freshRequire();
  assert.strictEqual(mod.classify401Action(200, 3, 3), 'fail-rate-limit-exhausted');
  assert.strictEqual(mod.classify401Action(200, 5, 3), 'fail-rate-limit-exhausted');
});

total++; passed += passing('probe 401 → fail-auth (real auth failure, preserves S197 fail-fast)', function () {
  var mod = freshRequire();
  assert.strictEqual(mod.classify401Action(401, 0, 3), 'fail-auth');
  assert.strictEqual(mod.classify401Action(401, 3, 3), 'fail-auth');
});

total++; passed += passing('probe non-200/non-401 (e.g. 500) → fail-auth (cannot confirm key valid)', function () {
  var mod = freshRequire();
  assert.strictEqual(mod.classify401Action(500, 0, 3), 'fail-auth');
  assert.strictEqual(mod.classify401Action(0, 1, 3), 'fail-auth');
});

total++; passed += passing('boundary: last allowed retry attempt vs first exhausted', function () {
  var mod = freshRequire();
  // maxRetries=3 → attempts 0,1,2 retry; attempt 3 (the WRITE_MAX_RETRIES-th) exhausts
  assert.strictEqual(mod.classify401Action(200, 2, 3), 'retry-rate-limit');
  assert.strictEqual(mod.classify401Action(200, 3, 3), 'fail-rate-limit-exhausted');
});

// -----------------------------------------------------------------
// Summary
// -----------------------------------------------------------------
console.log('\n[T6] ' + passed + '/' + total + ' assertions passed');
if (passed !== total) {
  process.exit(1);
}
