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
  var guard = wake.selectDue(pkgs, 107, { recent: [], wokenCycle: { 'POP-99901:tue': 107 } }, { day: 'tue', limit: 5 });
  ok(guard.picks.length === 1 && guard.picks[0].key === 'b', 'once-per-cycle guard excludes already-woken popid:day');
  var forced = wake.selectDue(pkgs, 107, { recent: [], wokenCycle: { 'POP-99903:mon': 107 } }, { forceKey: 'c', day: 'mon', limit: 1 });
  ok(forced.picks.length === 1 && forced.picks[0].key === 'c', '--pack forces past duty-day and cycle guard');
  var missing = wake.selectDue(pkgs, 107, { recent: [], wokenCycle: {} }, { forceKey: 'nope' });
  ok(missing.picks.length === 0, '--pack with unknown key wakes nothing');

  // Regression, adversarial review 2026-09-22: a multi-day dutyDays pack
  // (e.g. ["tue","thu"]) shares one cycle number across both days. A bare-popid
  // wokenCycle key wrongly nulled out the second day; the key must be popid:day.
  var multiDay = {
    d: Object.assign({}, SYNTH_PKG, { persona: 'd', popid: 'POP-99904', dutyDays: ['tue', 'thu'] }),
  };
  var tueWake = wake.selectDue(multiDay, 108, { recent: [], wokenCycle: {} }, { day: 'tue', limit: 1 });
  ok(tueWake.picks.length === 1 && tueWake.day === 'tue', 'tue/thu pack wakes on Tuesday');
  var afterTue = { recent: ['POP-99904'], wokenCycle: { 'POP-99904:tue': 108 } };
  var thuStillDue = wake.selectDue(multiDay, 108, afterTue, { day: 'thu', limit: 1 });
  ok(thuStillDue.picks.length === 1, 'same cycle, same popid, Thursday still wakes it (bug: bare-popid key suppressed this)');
  var tueAgainSameCycle = wake.selectDue(multiDay, 108, afterTue, { day: 'tue', limit: 1 });
  ok(tueAgainSameCycle.picks.length === 0, 'same cycle, same day, already woken — guard still holds per-day');
})();

console.log('=== workMoveLine — a director shift is a work move (civic.38 ruling (d)) ===');
(function () {
  var civicRun = require('./cron-civic-run');
  var dir2 = fixtureBeats({
    Initiative_Tracker: [{ InitiativeID: 'INIT-901', Name: 'Synthetic Clinic', ImplementationPhase: 'construction-active', Stage: 'Standing', Status: 'passed' }],
  });
  var DIR_PKG = Object.assign({}, SYNTH_PKG, { persona: 'proj-synth', popid: 'POP-99904', office: 'PROJ-SYNTH', initiative: 'INIT-901', dataNodes: ['initiative-project'] });
  var pack = wake.buildWorkPack(DIR_PKG, 108, dir2, path.join(dir2, 'no-names.tsv'));
  ok(pack && pack.nodes && pack.nodes.indexOf('initiative-project') >= 0, 'pack records the nodes that produced a block');

  var mv = wake.workMoveLine(DIR_PKG, pack, 108, '2026-09-22');
  ok(mv && mv.type === 'work' && mv.status === 'pending', 'director shift -> pending work move');
  ok(mv && mv.payload.initiativeId === 'INIT-901' && mv.cycle === 108 && mv.agentDir === 'proj-synth' && mv.popid === 'POP-99904', 'move carries the fold fields (initiativeId, cycle, agentDir, popid)');
  ok(mv && mv.moveId === 'MV-108-proj-synth-2026-09-22', 'moveId is per director per date (same-day rerun dedups under last-line-wins)');

  ok(wake.workMoveLine(Object.assign({}, DIR_PKG, { initiative: '' }), pack, 108, '2026-09-22') === null, 'no initiative on the pack -> no move');
  ok(wake.workMoveLine(DIR_PKG, { identity: 'x', blocks: ['y'], nodes: ['civic-office'] }, 108, '2026-09-22') === null, 'initiative-project node produced nothing (row not on the beats dump) -> no move');
  ok(wake.workMoveLine(DIR_PKG, pack, 'abc', '2026-09-22') === null, 'unresolved cycle -> no move');

  // The line folds exactly like a datawake seat's work move: the Sunday fold stamps LastWorkCycle/LastWorkSeat.
  var ws = fs.mkdtempSync(path.join(os.tmpdir(), 'work-wake-fold-'));
  civicRun.appendMoveLedger(ws, 108, [mv]);
  civicRun.appendMoveLedger(ws, 108, [Object.assign({}, mv, { at: '2026-09-22T21:00:00.000Z' })]); // same-day rerun
  var folded = civicRun.loadMoveLedgerFolded(ws, 108);
  ok(folded && folded.size === 1, 'same-day rerun collapses to one move in the ledger read');
  var out = civicRun.foldMovesIntoDecisions(ws, 108, { offices: [] });
  ok(out.workMoves === 1 && out.workInitiatives === 1, 'fold counts the director move as work on one initiative');
  var decFiles = [];
  (function walk(d) { fs.readdirSync(d).forEach(function (f) { var q = path.join(d, f); if (fs.statSync(q).isDirectory()) walk(q); else if (/decisions_c108\.json$/.test(f)) decFiles.push(q); }); })(path.join(ws, 'output', 'city-civic-database', 'initiatives'));
  var dec = decFiles.length ? JSON.parse(fs.readFileSync(decFiles[0], 'utf8')) : null;
  ok(dec && dec.trackerUpdates.LastWorkCycle === 108 && dec.trackerUpdates.LastWorkSeat === 'proj-synth', 'fold stamps LastWorkCycle=108, LastWorkSeat=proj-synth from the director move');
  fs.rmSync(ws, { recursive: true, force: true });
  fs.rmSync(dir2, { recursive: true, force: true });
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
