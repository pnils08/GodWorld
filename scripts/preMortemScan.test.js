/**
 * preMortemScan.test.js — S246 ES-7 / G-PM7.
 * Covers the classification core that had real bugs in the first live run:
 * enclosingFunction must skip control-flow keywords (the if()/for() trap that
 * produced false CRITICALs), and the canonical-neighborhood set membership.
 *
 * Run: node scripts/preMortemScan.test.js
 */

const { enclosingFunction, CANONICAL_HOODS } = require('./preMortemScan');

let passed = 0, failed = 0;
function assertEq(label, actual, expected) {
  if (actual === expected) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); failed++; }
}

console.log('Test 1: enclosingFunction skips control-flow keywords (the if()/for() trap)');
{
  // A Math.random hit inside an if-block nested in manualRunVote must resolve to
  // manualRunVote, NOT "if" — the bug that produced 2 false CRITICALs live.
  const lines = [
    'function manualRunVote(initiativeId) {',          // 0
    '  var x = 1;',                                     // 1
    '  if (x > 0) {',                                   // 2
    '    var rng = Math.random;',                       // 3 (hit)
    '  }',                                              // 4
    '}',                                                // 5
  ];
  assertEq('hit inside if() resolves to manualRunVote', enclosingFunction(lines, 4), 'manualRunVote');
}

console.log('\nTest 2: enclosingFunction skips for/while/switch too');
{
  const lines = [
    'function testGen_() {',           // 0
    '  for (var i = 0; i < 3; i++) {', // 1
    '    foo(Math.random);',           // 2 (hit at line 3)
    '  }',                             // 3
    '}',                               // 4
  ];
  assertEq('hit inside for() resolves to testGen_', enclosingFunction(lines, 3), 'testGen_');
}

console.log('\nTest 3: enclosingFunction handles assignment + method-shorthand defs');
{
  assertEq('name = function form', enclosingFunction(['  doThing = function () {', '   y();'], 2), 'doThing');
  assertEq('bare method-shorthand form', enclosingFunction(['  helper(a, b) {', '   z();'], 2), 'helper');
}

console.log('\nTest 4: top-level hit (no enclosing function) returns null');
{
  assertEq('no function above → null', enclosingFunction(['var g = Math.random;'], 1), null);
}

console.log('\nTest 5: CANONICAL_HOODS membership');
{
  assertEq('canon-12 Temescal canonical', CANONICAL_HOODS.has('temescal'), true);
  assertEq('Map-17 Adams Point canonical', CANONICAL_HOODS.has('adams point'), true);
  assertEq('child Lakeshore canonical', CANONICAL_HOODS.has('lakeshore'), true);
  assertEq('East Oakland NOT canonical (stray)', CANONICAL_HOODS.has('east oakland'), false);
  assertEq('Jingletown NOT canonical (stray)', CANONICAL_HOODS.has('jingletown'), false);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
