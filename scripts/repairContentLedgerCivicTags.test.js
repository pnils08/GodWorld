/**
 * repairContentLedgerCivicTags.test.js — offline contract tests.
 *
 * Run: node scripts/repairContentLedgerCivicTags.test.js
 */

const { HDR } = require('./draftContentRows.js');
const r = require('./repairContentLedgerCivicTags.js');

let pass = 0, fail = 0;
function check(name, condition) {
  if (condition) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.error('  FAIL ' + name); }
}

check('repairs source:civic only when it is first',
  r.repairFirstTag('source:civic,auth:library-s325') ===
  'source:civicNews,auth:library-s325');
check('leaves canonical source:civicNews unchanged',
  r.repairFirstTag('source:civicNews,auth:library-s325') === null);
check('leaves later source:civic tag unchanged',
  r.repairFirstTag('source:qol,source:civic') === null);
check('leaves empty tags unchanged', r.repairFirstTag('') === null);

const values = [
  HDR,
  ['line', 'civic.oari', '', 'read the posted notice twice', 1,
    'band!=child', 'source:civic,auth:library-s325', '', 'yes'],
  ['line', 'already.good', '', 'waited outside the meeting room', 1,
    '', 'source:civicNews,auth:library-s325', '', 'yes'],
  ['line', 'other.pool', '', 'carried a folded flyer home', 1,
    '', 'source:qol,source:civic', '', 'yes'],
  ['line', 'bad.pool', '', 'held an invalid row', 1,
    'unknownField=1', 'source:qol', '', 'yes']
];
const plan = r.planRepairs(values);
check('plans exactly one repair', plan.length === 1);
check('preserves sheet row number', plan[0].rowNumber === 2);
check('preserves PoolKey', plan[0].poolKey === 'civic.oari');
check('changes only the intended first tag',
  plan[0].after === 'source:civicNews,auth:library-s325');
check('loader audit finds civic + unrelated invalid row',
  r.findRejectedRows(values, false).length === 2);
check('post-repair loader audit leaves only unrelated invalid row',
  r.findRejectedRows(values, true).length === 1 &&
  r.findRejectedRows(values, true)[0].poolKey === 'bad.pool');

{
  const dry = r.parseArgs(['node', 'repair', '--sheet-id', 'sandbox-id']);
  check('dry-run is default', dry.apply === false);
  let missingRejected = false, mismatchRejected = false;
  try { r.parseArgs(['node', 'repair']); } catch (_) { missingRejected = true; }
  try {
    r.parseArgs(['node', 'repair', '--sheet-id', 'sandbox-id', '--apply',
      '--confirm-sheet-id', 'other-id']);
  } catch (_) { mismatchRejected = true; }
  const apply = r.parseArgs(['node', 'repair', '--sheet-id', 'sandbox-id',
    '--apply', '--confirm-sheet-id', 'sandbox-id']);
  check('missing sheet id rejected', missingRejected);
  check('mismatched confirmation rejected', mismatchRejected);
  check('matching explicit confirmation accepted', apply.apply === true);
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
