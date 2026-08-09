/**
 * applyGriefWorldConfig.test.js — offline migration contract.
 * Run: node scripts/applyGriefWorldConfig.test.js
 */

const M = require('./applyGriefWorldConfig.js');

let pass = 0, fail = 0;
function check(name, condition) {
  if (condition) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.error('  FAIL ' + name); }
}
function throws(fn, pattern) {
  try { fn(); } catch (err) { return pattern.test(String(err && err.message)); }
  return false;
}

check('six approved rows are defined', M.CONFIG_ROWS.length === 6);
check('approved keys are unique', new Set(M.CONFIG_ROWS.map(row => row[0])).size === 6);

const empty = M.inspectConfig([['Key', 'Value', 'Description']]);
check('empty config plans all six additions', empty.additions.length === 6 && empty.existing.length === 0);

const partialValues = [
  ['Key', 'Value', 'Description'],
  ['cycleCount', 112, 'current Cycle'],
  M.CONFIG_ROWS[0].slice(),
  M.CONFIG_ROWS[1].slice()
];
const partial = M.inspectConfig(partialValues);
check('matching rows are kept', partial.existing.length === 2);
check('only missing rows are added', partial.additions.length === 4);
check('unrelated config rows are preserved', partialValues[1][0] === 'cycleCount');

const complete = M.inspectConfig([['Key', 'Value', 'Description'], ...M.CONFIG_ROWS.map(row => row.slice())]);
check('complete exact config is idempotent', complete.additions.length === 0 && complete.existing.length === 6);

const conflict = [['Key', 'Value', 'Description'], ['griefDurationCycles', 99, 'wrong']];
check('conflicting value fails loud', throws(() => M.inspectConfig(conflict), /conflicts/));
const duplicate = [['Key', 'Value', 'Description'], ['x', 1, ''], ['x', 1, '']];
check('duplicate key fails loud', throws(() => M.inspectConfig(duplicate), /duplicate key/));
check('wrong header fails loud', throws(() => M.inspectConfig([['Name', 'Value']]), /header/));

const dry = M.parseArgs(['node', 'migration', '--sheet-id', 'sandbox-id']);
check('dry-run is default', dry.apply === false);
check('missing explicit target rejected', throws(() => M.parseArgs(['node', 'migration']), /sheet-id is required/));
check('mismatched confirmation rejected', throws(() => M.parseArgs([
  'node', 'migration', '--sheet-id', 'sandbox-id', '--apply', '--confirm-sheet-id', 'other-id'
]), /matching --sheet-id/));
const apply = M.parseArgs([
  'node', 'migration', '--sheet-id', 'sandbox-id', '--apply', '--confirm-sheet-id', 'sandbox-id'
]);
check('matching explicit confirmation accepted', apply.apply === true);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
