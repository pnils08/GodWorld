/**
 * resolveCitizen.test.js — engine.90 Commit 4 resolver contract.
 * Proves: the clasp core loads as plain Apps Script; the Node half exports the
 * same function; POPID and name lookups across active + archive; archive
 * history ordering; living semantics; ambiguity throws; missing → 'missing'.
 * Run: node scripts/resolveCitizen.test.js
 */
const fs = require('fs'), path = require('path'), assert = require('assert');
global.Logger = { log() {} };
const src = fs.readFileSync(path.resolve(__dirname, '../utilities/resolveCitizen.js'), 'utf8');
const GAS = new Function('module', src + '\nreturn { resolveCitizen_ };')(undefined);
const NODE = require('../lib/resolveCitizen');

const slH = ['POPID', 'First', 'Last', 'Status', 'Tier'];
const arH = slH.concat(['ArchiveReason', 'ExitCycle', 'SourceEventId', 'LastActiveStatus', 'ReturnEligible', 'SchemaVersion', 'ArchiveNote']);
const SRC = {
  slHeaders: slH,
  slRows: [
    ['POP-00001', 'Vinnie', 'Keane', 'Active', 1],
    ['POP-00500', 'Old', 'Timer', 'deceased', 4],           // terminal but still on SL (mover off)
    ['POP-00700', 'Twin', 'Name', 'Active', 4],
    ['POP-00701', 'Twin', 'Name', 'Active', 4],
    ['POP-01052', 'Herbert', 'Jones', 'Active', 2],         // came back: active row + archive history
  ],
  arHeaders: arH,
  arRows: [
    ['POP-01052', 'Herbert', 'Jones', 'Traded', 2, 'traded-away', 106, 'trade:C106:POP-01052', 'Traded', 'TRUE', 5, ''],
    ['POP-01052', 'Herbert', 'Jones', 'Traded', 2, 'traded-away', 98, 'trade:C98:POP-01052', 'Traded', 'TRUE', 5, ''],
    ['POP-00042', 'Late', 'Citizen', 'deceased', 3, 'deceased', 101, 'death:C101:POP-00042', 'deceased', 'FALSE', 5, ''],
    ['POP-00043', 'Gone', 'Away', 'Traded', 3, 'traded-away', 90, 'trade:C90:POP-00043', 'Traded', 'TRUE', 5, ''],
    ['POP-00044', 'Gone', 'Away', 'Traded', 3, 'traded-away', 91, 'trade:C91:POP-00044', 'Traded', 'TRUE', 5, ''],
  ],
};
let passed = 0, failed = 0;
const test = (n, f) => { try { f(); passed++; console.log('  ✓ ' + n); } catch (e) { failed++; console.log('  ✗ ' + n + '\n    ' + e.message); } };
console.log('resolveCitizen.test.js — engine.90');

test('Node half is the clasp core (same function object)', () => assert.strictEqual(NODE.resolveCitizen_, require('../utilities/resolveCitizen').resolveCitizen_));

for (const [label, R] of [['GAS', GAS.resolveCitizen_], ['Node', NODE.resolveCitizen_]]) {
  test(label + ': active POPID → active, living, header-mapped row, no history', () => {
    const r = R('pop-00001', SRC);
    assert.deepStrictEqual([r.location, r.living, r.row.First, r.archiveHistory.length], ['active', true, 'Vinnie', 0]);
  });
  test(label + ': deceased still on SL → active location, living=false', () => {
    const r = R('POP-00500', SRC); assert.deepStrictEqual([r.location, r.living], ['active', false]);
  });
  test(label + ': archived POPID → archive, not living, newest snapshot as row, history oldest→newest', () => {
    const r = R('POP-00042', SRC);
    assert.deepStrictEqual([r.location, r.living, r.row.ExitCycle, r.row.ArchiveReason], ['archive', false, 101, 'deceased']);
    const h = R('POP-01052', SRC);
    assert.deepStrictEqual([h.location, h.living, h.archiveHistory.map((x) => x.ExitCycle)], ['active', true, [98, 106]]);
  });
  test(label + ': name lookup active first, archive second; missing → missing', () => {
    assert.strictEqual(R('Vinnie Keane', SRC).location, 'active');
    assert.strictEqual(R('  late   citizen ', SRC).location, 'archive');
    assert.deepStrictEqual(R('Nobody Here', SRC), { location: 'missing', living: false, row: null, archiveHistory: [] });
    assert.strictEqual(R('POP-09999', SRC).location, 'missing');
  });
  test(label + ': ambiguity throws on SL and on the archive; single-token name throws', () => {
    assert.throws(() => R('Twin Name', SRC), /ambiguous on Simulation_Ledger/);
    assert.throws(() => R('Gone Away', SRC), /ambiguous on Citizen_Archive/);
    assert.throws(() => R('Cher', SRC), /First and Last/);
  });
  test(label + ': no archive tab (empty arrays) behaves as active-only', () => {
    const r = R('POP-00042', { slHeaders: slH, slRows: SRC.slRows, arHeaders: [], arRows: [] });
    assert.strictEqual(r.location, 'missing');
  });
}
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
