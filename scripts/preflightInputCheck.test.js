/**
 * preflightInputCheck.test.js — S246 ES-7 / G-PF1.
 * Covers the §Placeholder Convention decision tree (the deterministic core that
 * decides READY vs NOT READY on the initiative tracker).
 *
 * Run: node scripts/preflightInputCheck.test.js
 */

const { classifyInitiativeRow, blank } = require('./preflightInputCheck');

let passed = 0, failed = 0;
function assertEq(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); failed++; }
}

const real = {
  InitiativeID: 'INIT-001', Name: 'W Oakland Stab Fund', Status: 'passed',
  ImplementationPhase: 'disbursement-active', PolicyDomain: 'housing', AffectedNeighborhoods: 'West Oakland',
};
const placeholder = { InitiativeID: 'INIT-004', Name: '', Status: '', ImplementationPhase: '', PolicyDomain: '', AffectedNeighborhoods: '' };
const partial = { InitiativeID: 'INIT-009', Name: 'Half-entered', Status: 'announced', ImplementationPhase: '', PolicyDomain: '', AffectedNeighborhoods: '' };
const bloat = { InitiativeID: '', Name: '', Status: '', ImplementationPhase: '', PolicyDomain: '', AffectedNeighborhoods: '' };

console.log('Test 1: §Placeholder Convention classes');
assertEq('full row → real', classifyInitiativeRow(real).cls, 'real');
assertEq('only InitiativeID → placeholder', classifyInitiativeRow(placeholder).cls, 'placeholder');
assertEq('ID+Name, missing critical → partial-real', classifyInitiativeRow(partial).cls, 'partial-real');
assertEq('fully empty → bloat', classifyInitiativeRow(bloat).cls, 'bloat');

console.log('\nTest 2: partial-real lists missing engine-critical fields');
assertEq('partial missing = Phase/PolicyDomain/AffectedNeighborhoods',
  classifyInitiativeRow(partial).missing, ['ImplementationPhase', 'PolicyDomain', 'AffectedNeighborhoods']);

console.log('\nTest 3: a real row missing ONE critical field is partial-real (NOT READY)');
const oneMissing = Object.assign({}, real, { AffectedNeighborhoods: '' });
assertEq('missing only AffectedNeighborhoods → partial-real', classifyInitiativeRow(oneMissing).cls, 'partial-real');
assertEq('lists the one missing field', classifyInitiativeRow(oneMissing).missing, ['AffectedNeighborhoods']);

console.log('\nTest 4: blank() helper');
assertEq('empty string blank', blank(''), true);
assertEq('whitespace blank', blank('   '), true);
assertEq('null blank', blank(null), true);
assertEq('value not blank', blank('x'), false);
assertEq('zero not blank', blank(0), false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
