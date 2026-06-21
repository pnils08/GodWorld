/**
 * chaosCarsDecay.test.js — engine.11 chaos-cars T4.1 decay model coverage.
 * Pairs with utilities/chaosCarsDecay.js. Run: node utilities/chaosCarsDecay.test.js
 * Claspignored via *.test.js (Node-only).
 */
'use strict';

const d = require('./chaosCarsDecay');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: exports + rule shape');
assert('DECAY_RULES present', d.DECAY_RULES && typeof d.DECAY_RULES === 'object');
assert('chaosDecayResidualOneCycle_ is fn', typeof d.chaosDecayResidualOneCycle_ === 'function');
assert('chaosResidualAfter_ is fn', typeof d.chaosResidualAfter_ === 'function');
for (const col of ['Sentiment', 'CrimeIndex', 'RetailVitality', 'EventAttractiveness', 'Annual_Revenue', 'Employee_Count']) {
  const r = d.DECAY_RULES[col];
  assert(`${col}: has up+down fractions in [0,1]`,
    r && r.up >= 0 && r.up <= 1 && r.down >= 0 && r.down <= 1);
}

console.log('\nTest 2: locked asymmetry — GOOD direction reverts faster');
// mood/retail/event/revenue: good=up → up > down
for (const col of ['Sentiment', 'RetailVitality', 'EventAttractiveness', 'Annual_Revenue']) {
  assert(`${col}: up-revert > down-revert`, d.DECAY_RULES[col].up > d.DECAY_RULES[col].down);
}
// crime: good=down → down > up
assert('CrimeIndex: down-revert > up-revert', d.DECAY_RULES.CrimeIndex.down > d.DECAY_RULES.CrimeIndex.up);

console.log('\nTest 3: one-cycle revert moves toward 0 by the right fraction');
{
  // Sentiment +0.10 (good, fast 0.6): next = 0.10*(1-0.6)=0.04
  const n = d.chaosDecayResidualOneCycle_(0.10, 'Sentiment');
  assert('Sentiment +0.10 → 0.04', Math.abs(n - 0.04) < 1e-9, `got ${n}`);
  // Sentiment -0.10 (bad, slow 0.15): next = -0.10*(0.85) = -0.085
  const n2 = d.chaosDecayResidualOneCycle_(-0.10, 'Sentiment');
  assert('Sentiment -0.10 → -0.085 (lingers)', Math.abs(n2 + 0.085) < 1e-9, `got ${n2}`);
  assert('bad swing lingers more than good (|−| > |+| after 1 cycle)', Math.abs(n2) > Math.abs(n));
}

console.log('\nTest 4: permanence + snap-to-zero');
{
  assert('Employee_Count residual is permanent', d.chaosDecayResidualOneCycle_(-2, 'Employee_Count') === -2);
  assert('Employee_Count permanent over many cycles', d.chaosResidualAfter_(-2, 'Employee_Count', 50) === -2);
  // a tiny residual under epsilon snaps to 0
  assert('sub-epsilon snaps to 0', d.chaosDecayResidualOneCycle_(0.005, 'Sentiment') === 0);
  assert('0 stays 0', d.chaosDecayResidualOneCycle_(0, 'Sentiment') === 0);
  assert('unknown column → no decay (returns residual)', d.chaosDecayResidualOneCycle_(5, 'Nonsense') === 5);
}

console.log('\nTest 5: closed-form parity with iterated one-cycle');
{
  for (const [col, init] of [['Sentiment', -0.12], ['Annual_Revenue', 20], ['CrimeIndex', -0.10]]) {
    let iter = init;
    for (let i = 0; i < 6; i++) iter = d.chaosDecayResidualOneCycle_(iter, col);
    const closed = d.chaosResidualAfter_(init, col, 6);
    assert(`${col}: closed-form ≈ 6× iterated (${closed} vs ${iter})`, Math.abs(closed - iter) < 1e-9 || (closed === 0 && iter === 0));
  }
}

console.log('\n' + '─'.repeat(60));
if (failed === 0) { console.log(`✓ all ${passed} assertions passed`); process.exit(0); }
else { console.error(`✗ ${failed}/${passed + failed} failed`); process.exit(1); }
