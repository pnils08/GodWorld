/**
 * commuteFlowEngine — unresolved-class accounting (chase §S-E A6, S409).
 *
 * C105 logged "705/915 resolved, 210 unresolved" and the gap read it as a
 * fifth of the commute model running blind. Live check: 210 = 143 employers
 * at 'City-wide' (by design, no hood) + 67 citizens on the UNTRACKED
 * off-ledger sentinel, which the engine filed as a dangling BIZ-ID. Real
 * failures were 0. This proves each class lands in its own counter and the
 * log line says which are by-design.
 *
 * Run: node scripts/commuteFlowEngine.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const logs = [];
global.Logger = { log(m) { logs.push(String(m)); } };
const src = fs.readFileSync(path.resolve(__dirname, '../phase02-world-state/commuteFlowEngine.js'), 'utf8');
const E = new Function(src + '\nreturn { buildCommuteFlows_: buildCommuteFlows_ };')();

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

function sheetOf(values) {
  return { getDataRange() { return { getValues() { return values; } }; } };
}
const biz = [
  ['BIZ_ID', 'Name', 'Neighborhood', 'Employee_Count', 'Growth_Rate'],
  ['BIZ-1', 'Temescal Bakery', 'Temescal', 4, 2],
  ['BIZ-2', 'Oakland City Schools', 'City-wide', 900, 1],
  ['BIZ-3', 'Old Oakland Grill', 'Old Oakland', 6, 3],
  ['BIZ-4', 'No Hood Co', '', 2, 0],
];
const headers = ['POPID', 'Neighborhood', 'EmployerBizId', 'Status'];
const rows = [
  ['POP-1', 'Temescal', 'BIZ-1', 'Active'],        // same-hood
  ['POP-2', 'Fruitvale', 'BIZ-1', 'Active'],       // cross-hood
  ['POP-3', 'Downtown', 'BIZ-3', 'Active'],        // child fold Old Oakland -> Downtown (same-hood)
  ['POP-4', 'Rockridge', 'BIZ-2', 'Active'],       // city-wide -> nonHoodWorkplace
  ['POP-5', 'Laurel', 'UNTRACKED', 'Active'],      // off-ledger sentinel
  ['POP-6', 'Laurel', 'UNTRACKED', 'Active'],
  ['POP-7', 'KONO', 'BIZ-999', 'Active'],          // dangling biz-id -> unknownBiz
  ['POP-8', 'KONO', 'BIZ-4', 'Active'],            // biz without hood -> unknownHood
  ['POP-9', 'Uptown', '', 'Active'],               // no employer -> home
  ['POP-10', 'Uptown', 'SELF_EMPLOYED', 'Active'], // self-employed -> home
  ['POP-11', 'Uptown', 'BIZ-1', 'Deceased'],       // skipped
];
const ctx = {
  summary: {},
  ss: { getSheetByName(n) { return n === 'Business_Ledger' ? sheetOf(biz) : null; } },
  ledger: { headers, rows },
};
E.buildCommuteFlows_(ctx);
const st = ctx.summary.commuteFlowStats;

console.log('unresolved classes:');
check('citizens counted excludes deceased', st.citizens === 10, JSON.stringify(st));
check('resolved = 5 (2 employer-hood + 1 folded + 2 home)', st.resolved === 5, JSON.stringify(st));
check('unresolved = 5', st.unresolved === 5, JSON.stringify(st));
check('city-wide employer -> nonHoodWorkplace, not a failure', st.nonHoodWorkplace === 1);
check('UNTRACKED -> offLedger (2), never unknownBiz', st.offLedger === 2 && st.unknownBiz === 1, JSON.stringify(st));
check('dangling BIZ-ID -> unknownBiz (1)', st.unknownBiz === 1);
check('business with blank hood -> unknownHood (1)', st.unknownHood === 1);
check('noEmployer/SELF_EMPLOYED sit on the diagonal (2)', st.noEmployer === 2 && st.sameHood === 4, JSON.stringify(st));
check('Old Oakland folds to Downtown', ctx.summary.commuteFlows.Downtown && ctx.summary.commuteFlows.Downtown.Downtown === 1);
check('UNTRACKED never lands in the matrix', !Object.keys(ctx.summary.commuteInbound).includes('UNTRACKED'));

console.log('\nlog line:');
const line = logs.find(l => /buildCommuteFlows_ v1\.1/.test(l)) || '';
check('log names v1.1 and the breakdown', /5 unresolved \(1 city-wide\/non-hood, 2 off-ledger, 1 dangling biz-id, 1 biz without hood\)/.test(line), line);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
