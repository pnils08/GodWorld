/**
 * engine.128 regression — ctx.rng entropy guard.
 *
 * The bug this locks out: a PRNG whose arithmetic silently leaves float64
 * safe-integer range, loses its low-order bits, and collapses every seed into
 * one shared short attractor cycle. It never throws and never fails a cycle —
 * the engine reports 130 phases OK while the world draws its life events from
 * a ~10k-value pool. Only a statistical assertion catches that class, so these
 * are the assertions.
 *
 * Run: node utilities/cycleModes.rng.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// cycleModes.js is Apps Script (globals, no module.exports). Load the two pure
// functions under test into a sandbox rather than duplicating them here — a
// copied implementation would pass while the real one rotted.
const src = fs.readFileSync(path.join(__dirname, 'cycleModes.js'), 'utf8');
const sandbox = { Math, Logger: { log() {} }, console };
vm.createContext(sandbox);
for (const fn of ['hashInt32_', 'hashString_', 'seededRng_', 'seededRngFor_']) {
  const m = src.match(new RegExp('function ' + fn + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
  assert.ok(m, 'could not extract ' + fn + ' from cycleModes.js');
  vm.runInContext(m[0], sandbox);
}
const { seededRng_, seededRngFor_, hashInt32_ } = sandbox;

let failures = 0;
function check(name, fn) {
  try { fn(); console.log('  ok   ' + name); }
  catch (e) { failures++; console.log('  FAIL ' + name + ' — ' + e.message); }
}

console.log('engine.128 — ctx.rng entropy guard');

// 1. Distinctness. The old LCG produced ~17k distinct values per 100k draws.
// A sound 32-bit generator loses only to the birthday bound (~1.2% here).
check('100k draws yield >99% distinct values', () => {
  const r = seededRng_(102);
  const seen = new Set();
  for (let i = 0; i < 100000; i++) seen.add(r());
  assert.ok(seen.size > 99000,
    'only ' + seen.size + '/100000 distinct — generator is degenerate');
});

// 2. No shared attractor. This is the assertion that would have caught the bug:
// seeds 102, 103 and 1 all walked the SAME 10,466-value ring, so their streams
// were identical once both had entered it.
check('different seeds do not converge into a shared cycle', () => {
  const N = 40000;
  const a = new Set();
  const ra = seededRng_(102);
  for (let i = 0; i < N; i++) a.add(ra());
  const rb = seededRng_(103);
  let shared = 0;
  for (let i = 0; i < N; i++) if (a.has(rb())) shared++;
  // Independent 32-bit streams collide by chance at roughly N/2^32 per draw.
  assert.ok(shared < N * 0.05,
    shared + '/' + N + ' values shared with a different seed — streams converge');
});

// 3. Same seed still reproduces. Determinism is the whole point of ctx.rng;
// the fix must not trade it away.
check('same seed reproduces the same stream', () => {
  const a = [], b = [];
  const ra = seededRng_(104), rb = seededRng_(104);
  for (let i = 0; i < 500; i++) { a.push(ra()); b.push(rb()); }
  assert.deepStrictEqual(a, b);
});

// 4. Range.
check('all draws land in [0,1)', () => {
  const r = seededRng_(7);
  for (let i = 0; i < 20000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, 'out of range: ' + v);
  }
});

// 5. Rough uniformity across 10 buckets — a degenerate stream clumps.
check('draws are roughly uniform across 10 buckets', () => {
  const r = seededRng_(2026);
  const buckets = new Array(10).fill(0);
  const N = 100000;
  for (let i = 0; i < N; i++) buckets[Math.floor(r() * 10)]++;
  for (let i = 0; i < 10; i++) {
    const share = buckets[i] / N;
    assert.ok(share > 0.085 && share < 0.115,
      'bucket ' + i + ' holds ' + (share * 100).toFixed(1) + '% — expected ~10%');
  }
});

// 6. hashInt32_ carried the same precision defect (x * 0x45d9f3b ~ 3.1e17).
// Adjacent seeds must not produce adjacent hashes.
check('hashInt32_ avalanches on adjacent seeds', () => {
  const h1 = hashInt32_(102), h2 = hashInt32_(103);
  assert.notStrictEqual(h1, h2);
  assert.ok(Math.abs(h1 - h2) > 1000,
    'adjacent seeds hash to adjacent values (' + h1 + ' vs ' + h2 + ') — no avalanche');
});

// 7. Salted streams are independent — engine phases rely on rngFor(salt).
check('seededRngFor_ salts produce independent streams', () => {
  const N = 20000;
  const a = new Set();
  const ra = seededRngFor_(104, 'bonds');
  for (let i = 0; i < N; i++) a.add(ra());
  const rb = seededRngFor_(104, 'weather');
  let shared = 0;
  for (let i = 0; i < N; i++) if (a.has(rb())) shared++;
  assert.ok(shared < N * 0.05, shared + '/' + N + ' shared across salts');
});

// 8. The draw counter that sizes cycle exposure.
check('rng exposes a draw counter', () => {
  const r = seededRng_(1);
  assert.strictEqual(r.draws, 0);
  for (let i = 0; i < 250; i++) r();
  assert.strictEqual(r.draws, 250);
});

console.log(failures ? '\ncycleModes.rng.test.js: FAIL (' + failures + ')'
                     : '\ncycleModes.rng.test.js: PASS');
process.exit(failures ? 1 : 0);
