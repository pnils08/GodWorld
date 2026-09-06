/**
 * archiveCitizenRestore.test.js — engine.90 Commit 9 restore planner contract.
 * Proves: noop when Active; flip when Traded still on SL; restore from the
 * latest ReturnEligible snapshot (padded right when SL grew, Status/ReturnedCycle/
 * LastUpdated set, health cells cleared, MigrationDestination cleared only for a
 * canon hood, [Return] LifeHistory line); fail-loud on deceased, missing,
 * duplicate SL rows, non-Traded SL states, layout drift; archive untouched.
 * Run: node scripts/archiveCitizenRestore.test.js
 */
const fs = require('fs'), path = require('path'), assert = require('assert');
global.Logger = { log() {} };
const src = fs.readFileSync(path.resolve(__dirname, '../utilities/archiveCitizenExits.js'), 'utf8');
const M = new Function('module', src + '\nreturn { restoreCitizenPlan_ };')(undefined);
const P = M.restoreCitizenPlan_;

const slH = ['POPID', 'First', 'Last', 'Status', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'MigrationDestination', 'MigratedCycle', 'ReturnedCycle', 'StatusStartCycle', 'HealthCause', 'NewColAddedLater'];
const oldH = slH.slice(0, 12); // snapshot taken before NewColAddedLater existed
const META = ['ArchiveReason', 'ExitCycle', 'SourceEventId', 'LastActiveStatus', 'ReturnEligible', 'SchemaVersion', 'ArchiveNote'];
const arH = oldH.concat(META);
const snap = (pop, first, last, hood, dest, reason, exit) => [pop, first, last, reason === 'deceased' ? 'deceased' : 'Traded', 'old | 2026-01-01 — [Trade] traded away', '2026-01-01', hood, dest, 90, '', '105', 'a thing', reason, exit, 'x', reason === 'deceased' ? 'deceased' : 'Traded', reason === 'deceased' ? 'FALSE' : 'TRUE', 12, ''];
const SRC = () => ({
  slHeaders: slH,
  slRows: [
    ['POP-00001', 'Vinnie', 'Keane', 'Active', '', '', 'West Oakland', '', '', '', '', '', ''],
    ['POP-00026', 'Allen', 'Lopez', 'Traded', 'h', '', 'Temescal', '', '', '', '', '', ''],
    ['POP-00500', 'Old', 'Timer', 'deceased', '', '', 'Temescal', '', '', '', '', '', ''],
    ['POP-00501', 'Hurt', 'Guy', 'injured', '', '', 'Temescal', '', '', '', '', '', ''],
    ['POP-00700', 'Dup', 'Row', 'Traded', '', '', 'Temescal', '', '', '', '', '', ''],
    ['POP-00700', 'Dup', 'Row', 'Traded', '', '', 'Temescal', '', '', '', '', '', ''],
  ],
  arHeaders: arH,
  arRows: [
    snap('POP-01052', 'Herbert', 'Jones', 'Jack London', 'Los Angeles', 'traded-away', 98),
    snap('POP-01052', 'Herbert', 'Jones', 'Jack London', 'Los Angeles', 'traded-away', 106), // latest
    snap('POP-00042', 'Late', 'Citizen', 'Temescal', '', 'deceased', 101),
    snap('POP-00043', 'Away', 'Hood', 'Sacramento', 'Sacramento', 'traded-away', 100),        // hood not canon → dest kept
    snap('POP-00044', 'Twice', 'Gone', 'Temescal', '', 'traded-away', 95),
    snap('POP-00044', 'Twice', 'Gone', 'Temescal', '', 'deceased', 103),                      // latest exit deceased
  ],
});
const HOODS = ['West Oakland', 'Temescal', 'Jack London'];
const NOW = new Date(2026, 8, 6, 3, 0, 0);
let passed = 0, failed = 0;
const test = (n, f) => { try { f(); passed++; console.log('  ✓ ' + n); } catch (e) { failed++; console.log('  ✗ ' + n + '\n    ' + e.message); } };
console.log('archiveCitizenRestore.test.js — engine.90');

test('Active on SL → noop', () => assert.strictEqual(P('POP-00001', SRC(), 109).action, 'noop'));
test('Traded on SL → flip Status/ReturnedCycle/LastUpdated on that row, archive untouched', () => {
  const p = P('pop-00026', SRC(), 109, { now: NOW });
  assert.deepStrictEqual([p.action, p.slIndex, p.fields], ['flip', 1, { Status: 'Active', ReturnedCycle: 109, LastUpdated: '2026-09-06' }]);
});
test('archive-only, ReturnEligible → restore row from the LATEST snapshot, padded right, cells set/cleared', () => {
  const s = SRC(); const p = P('POP-01052', s, 109, { canonHoods: HOODS, now: NOW });
  assert.strictEqual(p.action, 'restore');
  const o = {}; slH.forEach((h, i) => { o[h] = p.row[i]; });
  assert.deepStrictEqual([o.POPID, o.First, o.Status, o.ReturnedCycle, o.LastUpdated, o.StatusStartCycle, o.HealthCause, o.MigrationDestination, o.MigratedCycle, o.NewColAddedLater],
    ['POP-01052', 'Herbert', 'Active', 109, '2026-09-06', '', '', '', 90, '']);
  assert.ok(/\| 2026-09-06 — \[Return\] Returned to Oakland \(C109\)$/.test(o.LifeHistory), o.LifeHistory);
  assert.strictEqual(p.row.length, slH.length);
  assert.strictEqual(s.arRows.length, 6, 'archive rows untouched');
});
test('non-canon hood keeps MigrationDestination', () => {
  const p = P('POP-00043', SRC(), 109, { canonHoods: HOODS, now: NOW });
  assert.strictEqual(p.row[slH.indexOf('MigrationDestination')], 'Sacramento');
});
test('fail-loud: deceased on SL; deceased latest exit; injured on SL; missing everywhere; duplicate SL rows; bad POPID', () => {
  assert.throws(() => P('POP-00500', SRC(), 109), /deceased on Simulation_Ledger/);
  assert.throws(() => P('POP-00042', SRC(), 109), /latest exit is "deceased"/);
  assert.throws(() => P('POP-00044', SRC(), 109), /latest exit is "deceased"/);
  assert.throws(() => P('POP-00501', SRC(), 109), /only Traded flips/);
  assert.throws(() => P('POP-09999', SRC(), 109), /neither Simulation_Ledger nor Citizen_Archive/);
  assert.throws(() => P('POP-00700', SRC(), 109), /appears 2 times/);
  assert.throws(() => P('Herbert Jones', SRC(), 109), /not a POPID/);
});
test('fail-loud: layout drift (snapshot wider than SL, or a renamed column) — never pad a reorder', () => {
  const s = SRC(); s.arHeaders = ['POPID', 'Last', 'First'].concat(oldH.slice(3)).concat(META);
  assert.throws(() => P('POP-01052', s, 109), /layout drift/);
  const s2 = SRC(); s2.slHeaders = slH.slice(0, 5);
  assert.throws(() => P('POP-01052', s2, 109), /SchemaVersion 12 vs Simulation_Ledger width 5/);
});
test('call-up path names restore for a POPID missing from Simulation_Ledger', () => {
  const w = fs.readFileSync(path.resolve(__dirname, 'sportsFeedWriter.js'), 'utf8');
  assert.ok(/not on Simulation_Ledger — an archived citizen returns through restore/.test(w));
});
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
