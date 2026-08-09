/**
 * applyApprovalCeilingConfig.test.js — offline migration contract.
 * Run: node scripts/applyApprovalCeilingConfig.test.js
 */

const M = require('./applyApprovalCeilingConfig.js');

let pass = 0;
let fail = 0;
function check(name, condition) {
  if (condition) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.error('  FAIL ' + name); }
}
function throws(fn, pattern) {
  try { fn(); } catch (error) { return pattern.test(String(error && error.message)); }
  return false;
}

check('eight approved config rows are defined', M.CONFIG_ROWS.length === 8);
check('approved config keys are unique', new Set(M.CONFIG_ROWS.map(row => row[0])).size === 8);
check('three owned civic columns are defined', M.CIVIC_COLUMNS.length === 3);

const emptyConfig = M.inspectConfig([['Key', 'Value', 'Description']]);
check('empty config plans all additions', emptyConfig.additions.length === 8);
const completeConfig = M.inspectConfig([
  ['Key', 'Value', 'Description'],
  ...M.CONFIG_ROWS.map(row => row.slice())
]);
check('complete config is idempotent', completeConfig.additions.length === 0 && completeConfig.existing.length === 8);
check('config conflict fails loud', throws(() => M.inspectConfig([
  ['Key', 'Value', 'Description'],
  ['approvalCeilingThreshold', 99, 'wrong']
]), /conflicts/));
check('config duplicate fails loud', throws(() => M.inspectConfig([
  ['Key', 'Value', 'Description'], ['x', 1, ''], ['x', 1, '']
]), /duplicate key/));

const baseHeader = ['OfficeId', 'Title', 'Status', 'Approval'];
const freshHeader = M.inspectCivicHeader(baseHeader);
check('fresh civic header appends all columns', freshHeader.additions.length === 3 && freshHeader.startIndex === 4);
const partialHeader = M.inspectCivicHeader(baseHeader.concat(['HighApprovalStreak']));
check('interrupted prefix appends only remainder', partialHeader.additions.length === 2 && partialHeader.existing.length === 1);
const completeHeader = M.inspectCivicHeader(baseHeader.concat(M.CIVIC_COLUMNS));
check('complete civic header is idempotent', completeHeader.additions.length === 0 && completeHeader.existing.length === 3);
check('out-of-order civic headers fail loud', throws(() => M.inspectCivicHeader(
  baseHeader.concat(['AutoScandalUntilCycle', 'HighApprovalStreak'])
), /prefix|contiguous|append edge/));
check('missing base civic header fails loud', throws(() => M.inspectCivicHeader(['OfficeId', 'Status']), /missing base header/));

check('column labels cross Z correctly', M.columnLabel(0) === 'A' && M.columnLabel(25) === 'Z' && M.columnLabel(26) === 'AA');
const dry = M.parseArgs(['node', 'migration', '--sheet-id', 'sandbox-id']);
check('dry-run is default', dry.apply === false);
check('missing explicit target rejected', throws(() => M.parseArgs(['node', 'migration']), /sheet-id is required/));
check('mismatched confirmation rejected', throws(() => M.parseArgs([
  'node', 'migration', '--sheet-id', 'sandbox-id', '--apply', '--confirm-sheet-id', 'other-id'
]), /matching --sheet-id/));
const apply = M.parseArgs([
  'node', 'migration', '--sheet-id', 'sandbox-id', '--apply', '--confirm-sheet-id', 'sandbox-id'
]);
check('matching confirmation accepted', apply.apply === true);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
