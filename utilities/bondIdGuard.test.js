/**
 * engine.128 tail — BondId collision guard.
 *
 * The failure this locks out: an ID generator that draws N characters from the
 * RNG and returns them with no uniqueness check. BondId is read as a lookup key
 * (phase05-citizens/bondEngine.js:1670), so a duplicate does not error — it
 * silently resolves to the wrong bond. 53 of them survived 100+ cycles.
 *
 * Run: node utilities/bondIdGuard.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, 'safeRand.js'), 'utf8');
const sandbox = { Math, console };
vm.createContext(sandbox);
for (const fn of ['uniqueGeneratedId_', 'seedGeneratedIds_']) {
  const m = src.match(new RegExp('function ' + fn + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
  assert.ok(m, 'could not extract ' + fn + ' from safeRand.js');
  vm.runInContext(m[0], sandbox);
}
const { uniqueGeneratedId_, seedGeneratedIds_ } = sandbox;

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  ok   ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ' — ' + e.message); }
}

console.log('engine.128 tail — BondId collision guard');

check('a clean generator passes straight through', () => {
  const ctx = {};
  let n = 0;
  const out = [];
  for (let i = 0; i < 100; i++) out.push(uniqueGeneratedId_(ctx, 'bond', () => 'ID' + (n++)));
  assert.strictEqual(new Set(out).size, 100);
});

// The actual regression: a generator that keeps handing back the same value —
// which is what a degenerate RNG does. The old code returned it every time.
check('a repeating generator cannot mint the same id twice', () => {
  const ctx = {};
  const seq = ['DUP', 'DUP', 'DUP', 'FRESH'];
  let i = 0;
  const a = uniqueGeneratedId_(ctx, 'bond', () => seq[Math.min(i++, seq.length - 1)]);
  const b = uniqueGeneratedId_(ctx, 'bond', () => seq[Math.min(i++, seq.length - 1)]);
  assert.strictEqual(a, 'DUP');
  assert.strictEqual(b, 'FRESH', 'guard returned a duplicate key');
});

// Cross-cycle is the case that actually bit: c102 and c103 minting the same id.
check('an id already persisted on the sheet cannot be re-minted', () => {
  const ctx = {};
  seedGeneratedIds_(ctx, 'bond', ['2F64328E', '27AA730E', 'C794FFED']);
  const seq = ['2F64328E', 'NEW1'];
  let i = 0;
  const got = uniqueGeneratedId_(ctx, 'bond', () => seq[Math.min(i++, seq.length - 1)]);
  assert.strictEqual(got, 'NEW1', 'guard re-minted a persisted BondId');
});

// It must fail loud, not mint a known duplicate. A silent duplicate is the
// original defect.
check('a fully degenerate generator throws instead of minting a duplicate', () => {
  const ctx = {};
  uniqueGeneratedId_(ctx, 'bond', () => 'STUCK');
  assert.throws(
    () => uniqueGeneratedId_(ctx, 'bond', () => 'STUCK'),
    /consecutive collisions/,
    'expected a loud throw on a stuck generator'
  );
});

check('separate buckets do not collide with each other', () => {
  const ctx = {};
  const a = uniqueGeneratedId_(ctx, 'bond', () => 'SHARED');
  const b = uniqueGeneratedId_(ctx, 'household', () => 'SHARED');
  assert.strictEqual(a, 'SHARED');
  assert.strictEqual(b, 'SHARED');
});

check('seedGeneratedIds_ tolerates empty and null input', () => {
  const ctx = {};
  seedGeneratedIds_(ctx, 'bond', null);
  seedGeneratedIds_(ctx, 'bond', []);
  seedGeneratedIds_(ctx, 'bond', ['', null, undefined, 'REAL']);
  const seq = ['REAL', 'OTHER'];
  let i = 0;
  assert.strictEqual(uniqueGeneratedId_(ctx, 'bond', () => seq[Math.min(i++, 1)]), 'OTHER');
});

check('genFn is required', () => {
  assert.throws(() => uniqueGeneratedId_({}, 'bond', null), /genFn required/);
});

// The guard must not need a real ctx — some callers pass null.
check('works with a null ctx', () => {
  let n = 0;
  const id = uniqueGeneratedId_(null, 'bond', () => 'X' + (n++));
  assert.ok(id);
});

console.log(failures ? '\nbondIdGuard.test.js: FAIL (' + failures + ')'
                     : '\nbondIdGuard.test.js: PASS');
process.exit(failures ? 1 : 0);
