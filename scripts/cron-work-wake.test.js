/**
 * cron-work-wake.test.js — civic.34 work-wake packs.
 *
 * Covers: registry validation (workWakePackages), node pack builders against
 * synthetic fixture JSONL, and due-selection (duty-day, LRU, once-per-cycle,
 * --pack force). No network, no canon — all fixtures use POP-999xx synthetic
 * citizens that exist nowhere in the sim.
 */
var fs = require('fs');
var os = require('os');
var path = require('path');
var registry = require('./workWakePackages');
var wake = require('./cron-work-wake');

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }

function fixtureBeats(files) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'work-wake-'));
  Object.keys(files).forEach(function (name) {
    fs.writeFileSync(path.join(dir, name + '.jsonl'), files[name].map(JSON.stringify).join('\n') + '\n');
  });
  return dir;
}

var SYNTH_PKG = {
  persona: 'test-worker', active: true, popid: 'POP-99901', name: 'Test Subject',
  office: 'TEST-OFFICE', dataNodes: ['hospital-deaths'], playerName: undefined,
  models: { reflect: { provider: 'openrouter', model: 'deepseek/deepseek-chat' } },
  dutyDays: ['tue'], promptContract: { roleLine: 'r', voiceNotes: 'v' },
};

console.log('=== registry validation ===');
(function () {
  var threw = false;
  try { registry.validatePackage('x', Object.assign({}, SYNTH_PKG, { persona: 'x', popid: 'not-a-popid' })); } catch (e) { threw = true; }
  ok(threw, 'rejects bad popid');
  threw = false;
  try { registry.validatePackage('x', Object.assign({}, SYNTH_PKG, { persona: 'x', dataNodes: ['made-up-node'] })); } catch (e) { threw = true; }
  ok(threw, 'rejects unknown dataNode');
  threw = false;
  try { registry.validatePackage('x', Object.assign({}, SYNTH_PKG, { persona: 'x', dataNodes: ['sports-player'], playerName: undefined })); } catch (e) { threw = true; }
  ok(threw, 'sports-player requires playerName');
  threw = false;
  try { registry.validatePackage('x', Object.assign({}, SYNTH_PKG, { persona: 'x', active: 'yes' })); } catch (e) { threw = true; }
  ok(threw, 'rejects non-boolean active');
  threw = false;
  try { registry.validatePackage('x', Object.assign({}, SYNTH_PKG, { persona: 'x' })); } catch (e) { threw = true; }
  ok(!threw, 'accepts a well-formed package');
  threw = false;
  try { registry.loadPackages(); } catch (e) { threw = true; }
  ok(!threw, 'live registry scripts/work-wake-packages.json validates clean');
})();

console.log('=== node builders ===');
var HOSPITAL = [
  { AdmissionId: 'H-C107-POP-99901', POPID: 'POP-99901', Name: 'Test Subject', Neighborhood: 'Nowhere', Cause: 'a test accident', AdmitCycle: '107', StatusNow: 'hospitalized', LastTransitionCycle: '107', DischargeCycle: '', Outcome: '', CyclesInCare: '' },
  { AdmissionId: 'H-C106-POP-99902', POPID: 'POP-99902', Name: 'Dead Fixture', Neighborhood: 'Nowhere', Cause: 'a test fall', AdmitCycle: '106', StatusNow: 'deceased', LastTransitionCycle: '107', DischargeCycle: '107', Outcome: 'deceased', CyclesInCare: '1' },
  { AdmissionId: 'H-C105-POP-99903', POPID: 'POP-99903', Name: 'Old Fixture', Neighborhood: 'Nowhere', Cause: 'a test cold', AdmitCycle: '105', StatusNow: 'recovered', LastTransitionCycle: '105', DischargeCycle: '105', Outcome: 'recovered', CyclesInCare: '1' },
];
var FEED = [
  { Cycle: '106', EventType: 'game-result', NamesUsed: 'Other Player (SP)', Stats: 'Other Player/5IP/1ER', 'Team Record': '1-0', PlayerMood: 'calm', Notes: 'A game happened.' },
  { Cycle: '107', EventType: 'game-result', NamesUsed: 'Test Ballplayer (1B), Other Player (SP)', Stats: 'Test Ballplayer/3AB/2H/1HR, Other Player/6IP/2ER', 'Team Record': '2-1', PlayerMood: 'electric', Notes: 'A big game for the fixture player.' },
];
var dir = fixtureBeats({ Hospital_Ledger: HOSPITAL, Oakland_Sports_Feed: FEED });

(function () {
  var block = wake.NODE_BUILDERS['hospital-deaths'](SYNTH_PKG, 107, dir);
  ok(block && block.indexOf('Dead Fixture') >= 0, 'hospital-deaths includes the deceased');
  ok(block && block.indexOf('Test Subject') >= 0, 'hospital-deaths includes this-cycle transitions');
  ok(block && block.indexOf('Old Fixture') < 0, 'hospital-deaths excludes stale recovered rows');

  var adm = wake.NODE_BUILDERS['hospital-admissions'](SYNTH_PKG, 107, dir);
  ok(adm && adm.indexOf('Test Subject') >= 0 && adm.indexOf('Old Fixture') < 0, 'hospital-admissions filters on AdmitCycle == cycle');

  var playerPkg = Object.assign({}, SYNTH_PKG, { dataNodes: ['sports-player'], playerName: 'Test Ballplayer' });
  var sp = wake.NODE_BUILDERS['sports-player'](playerPkg, 107, dir);
  ok(sp && sp.indexOf('Test Ballplayer') >= 0, 'sports-player finds the player at the current cycle');
  ok(sp && sp.indexOf('2H/1HR') >= 0, 'sports-player renders the per-player stat line');
  ok(sp.indexOf('Other Player/6IP') < 0, 'sports-player does not render teammates\' stat lines');

  var prior = wake.NODE_BUILDERS['sports-player'](Object.assign({}, playerPkg, { playerName: 'Other Player' }), 107, dir);
  ok(prior && prior.indexOf('cycle 107') >= 0, 'sports-player current-cycle hit wins for a teammate');
  var fellBack = wake.NODE_BUILDERS['sports-player'](playerPkg, 999, dir);
  ok(fellBack && fellBack.indexOf('cycle 107') >= 0, 'sports-player falls back to the most recent hit');

  var none = wake.NODE_BUILDERS['hospital-deaths'](SYNTH_PKG, 107, path.join(dir, 'missing'));
  ok(none === null, 'missing beats file -> null (skip, never fatal)');
})();

console.log('=== buildWorkPack ===');
(function () {
  var namesPath = path.join(dir, 'names.tsv');
  fs.writeFileSync(namesPath, 'POP-99901\tTest Subject\tNowhere Heights\n');
  var pack = wake.buildWorkPack(SYNTH_PKG, 107, dir, namesPath);
  ok(pack && pack.identity.indexOf('Nowhere Heights') >= 0, 'identity carries neighborhood from the names dump');
  ok(pack && pack.blocks.length === 1, 'one block per resolved node');
  var empty = wake.buildWorkPack(Object.assign({}, SYNTH_PKG, { dataNodes: ['crime-metrics'] }), 107, dir, namesPath);
  ok(empty === null, 'no resolvable nodes -> null pack');
})();

console.log('=== selection ===');
(function () {
  var pkgs = {
    a: Object.assign({}, SYNTH_PKG, { persona: 'a', popid: 'POP-99901', dutyDays: ['tue'] }),
    b: Object.assign({}, SYNTH_PKG, { persona: 'b', popid: 'POP-99902', dutyDays: ['tue'] }),
    c: Object.assign({}, SYNTH_PKG, { persona: 'c', popid: 'POP-99903', dutyDays: ['wed'] }),
  };
  var due = wake.selectDue(pkgs, 107, { recent: [], wokenCycle: {} }, { day: 'tue', limit: 5 });
  ok(due.picks.length === 2, 'duty-day filter excludes wed-only pack');
  var lru = wake.selectDue(pkgs, 107, { recent: ['POP-99901'], wokenCycle: {} }, { day: 'tue', limit: 1 });
  ok(lru.picks[0] && lru.picks[0].key === 'b', 'LRU: least-recently-woken first');
  var guard = wake.selectDue(pkgs, 107, { recent: [], wokenCycle: { 'POP-99901': 107 } }, { day: 'tue', limit: 5 });
  ok(guard.picks.length === 1 && guard.picks[0].key === 'b', 'once-per-cycle guard excludes already-woken popid');
  var forced = wake.selectDue(pkgs, 107, { recent: [], wokenCycle: { 'POP-99903': 107 } }, { forceKey: 'c', day: 'mon', limit: 1 });
  ok(forced.picks.length === 1 && forced.picks[0].key === 'c', '--pack forces past duty-day and cycle guard');
  var missing = wake.selectDue(pkgs, 107, { recent: [], wokenCycle: {} }, { forceKey: 'nope' });
  ok(missing.picks.length === 0, '--pack with unknown key wakes nothing');
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
