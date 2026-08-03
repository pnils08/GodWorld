#!/usr/bin/env node
/**
 * testCommuteFlows.js — engine.93 Task 9 sandbox proof for the commute matrix.
 *
 * The coupling: people work where they don't live. Before this, every hood
 * signal treated a citizen's whole day as happening on their own block.
 *
 * Proves (the Task 9 acceptance criteria + the coverage-honesty contract):
 *   1. DETERMINISM — seeded employment yields a byte-identical matrix across
 *      two runs (the spec's headline requirement).
 *   2. Cross-hood flows are counted in the right direction (home -> work).
 *   3. Self-employed / unemployed citizens land on the diagonal, not dropped.
 *   4. Child-area workplaces fold to their core hood ('Old Oakland' -> 'Downtown').
 *   5. Non-hood workplaces ('City-wide', Chicago) are EXCLUDED and COUNTED,
 *      never guessed into a neighborhood.
 *   6. An unknown BIZ-ID is counted unresolved, never silently dropped.
 *   7. Inactive citizens (deceased/departed/traded) do not commute.
 *   8. commuteOriginsFor_ names upstream hoods above the worker threshold —
 *      the disruption blast-radius seam.
 *   9. commuteInboundExternal_ excludes a hood's own local workers.
 *
 * USAGE: node scripts/testCommuteFlows.js
 * Exit 0 = pass; 1 = failure.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '..', 'phase02-world-state', 'commuteFlowEngine.js');

let failures = 0;
function check(label, cond, detail) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (cond || !detail ? '' : ' — ' + detail));
  if (!cond) failures++;
}

const BIZ_HEADER = ['BIZ_ID', 'Name', 'Sector', 'Neighborhood'];
const BIZ_ROWS = [
  ['BIZ-00001', 'Downtown Tower', 'Tech', 'Downtown'],
  ['BIZ-00002', 'Piedmont Clinic', 'Health', 'Old Oakland'], // child-area fold case (engine.99: spelling aliases retired, hierarchy folds remain)
  ['BIZ-00003', 'City Authority', 'Gov', 'City-wide'],           // non-hood
  ['BIZ-00004', 'Chicago Office', 'Media', 'Chicago'],           // non-Oakland
  ['BIZ-00005', 'Temescal Shop', 'Retail', 'Temescal'],
];

const LEDGER_HEADERS = ['POPID', 'Neighborhood', 'EmployerBizId', 'Status'];

function makeSandbox() {
  const sandbox = { Logger: { log: () => {} }, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox, { filename: SRC });
  return sandbox;
}

function run(citizenRows) {
  const sandbox = makeSandbox();
  const ctx = {
    summary: {},
    ledger: { headers: LEDGER_HEADERS, rows: citizenRows },
    ss: {
      getSheetByName: (n) => (n === 'Business_Ledger'
        ? { getDataRange: () => ({ getValues: () => [BIZ_HEADER].concat(BIZ_ROWS) }) }
        : null),
    },
  };
  sandbox.buildCommuteFlows_(ctx);
  return { ctx, S: ctx.summary, sandbox };
}

console.log('engine.93 Task 9 — commute-flow matrix sandbox\n');

// Fixture: five hoods' worth of commuting patterns.
const CITIZENS = [
  ['POP-00001', 'Fruitvale', 'BIZ-00001', 'Active'],      // Fruitvale -> Downtown
  ['POP-00002', 'Fruitvale', 'BIZ-00001', 'Active'],      // Fruitvale -> Downtown
  ['POP-00003', 'Fruitvale', 'BIZ-00001', 'Active'],      // Fruitvale -> Downtown (3 total)
  ['POP-00004', 'Temescal', 'BIZ-00001', 'Active'],       // Temescal  -> Downtown
  ['POP-00005', 'Downtown', 'BIZ-00001', 'Active'],       // Downtown  -> Downtown (local)
  ['POP-00006', 'West Oakland', 'BIZ-00002', 'Active'],   // -> Downtown (child-area fold)
  ['POP-00007', 'Rockridge', 'SELF_EMPLOYED', 'Active'],  // diagonal
  ['POP-00008', 'Laurel', '', 'Active'],                  // no employer -> diagonal
  ['POP-00009', 'Chinatown', 'BIZ-00003', 'Active'],      // City-wide -> excluded
  ['POP-00010', 'Chinatown', 'BIZ-00004', 'Active'],      // Chicago -> excluded
  ['POP-00011', 'Chinatown', 'BIZ-09999', 'Active'],      // unknown BIZ -> unresolved
  ['POP-00012', 'Fruitvale', 'BIZ-00001', 'deceased'],    // must not commute
  ['POP-00013', 'Fruitvale', 'BIZ-00001', 'Traded'],      // must not commute
];

const a = run(CITIZENS.map(r => r.slice()));
const flows = a.S.commuteFlows;
const stats = a.S.commuteFlowStats;

// 1. Determinism — the headline requirement.
const b = run(CITIZENS.map(r => r.slice()));
check('determinism: two runs produce a byte-identical matrix',
  JSON.stringify(a.S.commuteFlows) === JSON.stringify(b.S.commuteFlows),
  'matrices diverged');
check('determinism: inbound totals identical too',
  JSON.stringify(a.S.commuteInbound) === JSON.stringify(b.S.commuteInbound));
check('determinism: origin keys are sorted',
  JSON.stringify(Object.keys(flows)) === JSON.stringify(Object.keys(flows).slice().sort()));

// 2. Direction + counts.
check('3 Fruitvale residents counted commuting into Downtown',
  flows.Fruitvale && flows.Fruitvale.Downtown === 3,
  JSON.stringify(flows.Fruitvale));
check('the flow is directional (Downtown has no Fruitvale destination)',
  !flows.Downtown || flows.Downtown.Fruitvale === undefined);

// 3. Diagonal for self-employed / unemployed.
check('self-employed citizen works in their own hood',
  flows.Rockridge && flows.Rockridge.Rockridge === 1);
check('citizen with no employer works in their own hood',
  flows.Laurel && flows.Laurel.Laurel === 1);

// 4. Child-area fold (engine.99 Cohort 2: spelling aliases retired — drift is
// fixed at the ledger; geographic hierarchy folds child areas to core hoods).
check("Business_Ledger 'Old Oakland' folds to core hood 'Downtown'",
  flows['West Oakland'] && flows['West Oakland']['Downtown'] === 1,
  JSON.stringify(flows['West Oakland']));

// 5 + 6. Coverage honesty — excluded AND counted, never guessed.
check('City-wide workplace excluded from the matrix',
  !flows.Chinatown || flows.Chinatown['City-wide'] === undefined);
check('non-Oakland workplace excluded from the matrix',
  !flows.Chinatown || flows.Chinatown.Chicago === undefined);
check('excluded workplaces are counted, not silently dropped',
  stats.nonHoodWorkplace === 2, 'got ' + stats.nonHoodWorkplace);
check('unknown BIZ-ID counted unresolved',
  stats.unknownBiz === 1 && stats.unresolved === 3,
  'unknownBiz=' + stats.unknownBiz + ' unresolved=' + stats.unresolved);
check('no unresolved citizen was guessed onto the diagonal',
  !flows.Chinatown || Object.keys(flows.Chinatown).length === 0);

// 7. Inactive citizens.
check('deceased and traded citizens do not commute',
  flows.Fruitvale.Downtown === 3 && stats.citizens === 11,
  'citizens counted: ' + stats.citizens);

// 8 + 9. The consumer seams.
const sandbox = a.sandbox;
const upstream = sandbox.commuteOriginsFor_(a.S, 'Downtown', 3);
check('commuteOriginsFor_ names a hood above the worker threshold',
  upstream.indexOf('Fruitvale') !== -1);
check('commuteOriginsFor_ excludes a hood below the threshold',
  upstream.indexOf('Temescal') === -1, 'Temescal sends only 1 worker');
check('commuteOriginsFor_ excludes the hood itself',
  upstream.indexOf('Downtown') === -1);

const inboundDT = sandbox.commuteInboundExternal_(a.S, 'Downtown');
check('inbound count excludes the hood\'s own local workers',
  inboundDT === 5, 'expected 5 (3 Fruitvale + 1 Temescal + 1 West Oakland via Old Oakland fold), got ' + inboundDT);
check('a hood nobody commutes to reports zero inbound',
  sandbox.commuteInboundExternal_(a.S, 'Laurel') === 0);

// Degenerate inputs must not throw.
const empty = run([]);
check('empty ledger yields an empty matrix, no throw',
  JSON.stringify(empty.S.commuteFlows) === '{}' && empty.S.commuteFlowStats.citizens === 0);

console.log('\n' + (failures === 0
  ? 'testCommuteFlows.js: all assertions passed'
  : 'testCommuteFlows.js: ' + failures + ' assertion(s) FAILED'));
process.exit(failures === 0 ? 0 : 1);
