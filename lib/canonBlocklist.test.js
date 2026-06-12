/**
 * canonBlocklist.test.js — contract test for lib/canonBlocklist.js
 *
 * Canon.2 P4 Task 4.3 — `docs/archive/plans/2026-05-12-canon-2-faith-scrub.md`.
 *
 * Run: node lib/canonBlocklist.test.js
 */

const cb = require('./canonBlocklist');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); passed++; }
  else { console.error('  FAIL ' + label + (detail ? ': ' + detail : '')); failed++; }
}

function expectThrow(label, fn, expectedSubstring) {
  try {
    fn();
    console.error('  FAIL ' + label + ': expected throw, did not throw');
    failed++;
  } catch (e) {
    if (expectedSubstring && e.message.indexOf(expectedSubstring) < 0) {
      console.error('  FAIL ' + label + ': message missing "' + expectedSubstring + '" — got "' + e.message + '"');
      failed++;
    } else {
      console.log('  ok   ' + label);
      passed++;
    }
  }
}

function expectNoThrow(label, fn) {
  try {
    fn();
    console.log('  ok   ' + label);
    passed++;
  } catch (e) {
    console.error('  FAIL ' + label + ': unexpected throw — ' + e.message);
    failed++;
  }
}

console.log('═══ canonBlocklist contract test');

console.log('\nTest 1: loadFaithBlocklist returns non-empty sets');
{
  const bl = cb.loadFaithBlocklist();
  assert('orgs is a Set', bl.orgs instanceof Set);
  assert('leaders is a Set', bl.leaders instanceof Set);
  assert('orgs.size >= 16', bl.orgs.size >= 16, 'got ' + bl.orgs.size);
  assert('leaders.size >= 16', bl.leaders.size >= 16, 'got ' + bl.leaders.size);
  assert('orgs contains "Acts Full Gospel Church"', bl.orgs.has('Acts Full Gospel Church'));
  assert('leaders contains "Bishop Robert Jackson Sr."', bl.leaders.has('Bishop Robert Jackson Sr.'));
  assert('orgs contains retired "Greater Hope Pentecostal Church"', bl.orgs.has('Greater Hope Pentecostal Church'));
  assert('leaders contains retired "Bishop Calvin Reeves Sr."', bl.leaders.has('Bishop Calvin Reeves Sr.'));
}

console.log('\nTest 2: checkFaithRow throws on blocklisted Organization');
expectThrow(
  'real org "Acts Full Gospel Church" rejected',
  () => cb.checkFaithRow({ organization: 'Acts Full Gospel Church', leader: 'Foo Bar' }),
  'Acts Full Gospel Church'
);

console.log('\nTest 3: checkFaithRow passes a clean canon row');
expectNoThrow(
  'canon org + canon leader pass',
  () => cb.checkFaithRow({ organization: 'New Covenant Pentecostal Assembly', leader: 'Bishop Robert Jaston' })
);

console.log('\nTest 4: checkFaithRow throws on blocklisted Leader even when Organization is canon');
expectThrow(
  'canon org + real leader "Bishop Robert Jackson Sr." rejected on leader',
  () => cb.checkFaithRow({ organization: 'New Covenant Pentecostal Assembly', leader: 'Bishop Robert Jackson Sr.' }),
  'Bishop Robert Jackson Sr.'
);

console.log('\nTest 5: case-insensitive substring match (defense in depth)');
expectThrow(
  'lowercase real org caught',
  () => cb.checkFaithRow({ organization: 'acts full gospel church', leader: 'Foo' }),
  'Tier-3'
);

console.log('\n' + '═'.repeat(60));
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
