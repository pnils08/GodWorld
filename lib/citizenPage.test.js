/**
 * citizenPage.test.js — offline coverage for the per-citizen Supermemory page.
 *
 * Run: node lib/citizenPage.test.js   (exits 0 pass / 1 fail)
 *
 * NO live API / NO sheet I/O — deterministic CI. Live isolation + round-trip is the throwaway
 * smoke (write two tags, confirm cross-tag search doesn't leak, delete) run manually; the live
 * AW pointer write is exercised at bot-wiring against a sentinel, never a real citizen in CI.
 * Here: the two gotcha-prone pure pieces — page-tag derivation and AW column math.
 */
const cp = require('./citizenPage');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
function throws(fn) { try { fn(); return false; } catch (e) { return true; } }

console.log('Test 1: pageTagFor derivation');
{
  assert('POP-00042 -> cp-POP-00042', cp.pageTagFor('POP-00042') === 'cp-POP-00042');
  assert('lowercase normalizes', cp.pageTagFor('pop-00042') === 'cp-POP-00042');
  assert('whitespace trimmed', cp.pageTagFor('  POP-00007  ') === 'cp-POP-00007');
  assert('parent tag constant', cp.PARENT_TAG === 'citizen-pages');
}

console.log('\nTest 2: pageTagFor rejects bad input (no silent write to wrong/parent tag)');
{
  assert('empty throws', throws(() => cp.pageTagFor('')));
  assert('null throws', throws(() => cp.pageTagFor(null)));
  assert('non-POPID throws', throws(() => cp.pageTagFor('citizen-pages')));
  assert('malformed POPID throws', throws(() => cp.pageTagFor('POP-XYZ')));
  assert('BIZID throws', throws(() => cp.pageTagFor('BIZ-00035')));
}

console.log('\nTest 3: AW column math lock (col-index gotcha guard)');
{
  assert('col 0 -> A', cp.colLetter_(0) === 'A');
  assert('col 25 -> Z', cp.colLetter_(25) === 'Z');
  assert('col 26 -> AA', cp.colLetter_(26) === 'AA');
  assert('col 47 -> AV (DialState)', cp.colLetter_(47) === 'AV');
  assert('col 48 -> AW (SMPageId, the write target)', cp.colLetter_(48) === 'AW');
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
