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
  ok(prior && prior.indexOf('6IP/2ER') >= 0 && prior.indexOf('5IP/1ER') < 0, 'sports-player: this Cycle\'s line, not last Cycle\'s, for a teammate');
  ok(prior && prior.indexOf('Named with you: Test Ballplayer') >= 0 && prior.indexOf('A game happened.') >= 0, 'sports-player: who he was named with, and the last time before this');
  // pipeline.110 — a Cycle that does not name him hands him nothing: an old row is not this week's work
  var quiet = wake.NODE_BUILDERS['sports-player'](playerPkg, 999, dir);
  ok(quiet === null, 'sports-player: not named this Cycle -> no block (never an old row as this week\'s)');
  var priv = fixtureBeats({ Oakland_Sports_Feed: [{ Cycle: '107', EventType: 'question', EventTrigger: 'question', NamesUsed: 'Test Ballplayer (1B)', Notes: 'What is next for you?' }] });
  ok(wake.NODE_BUILDERS['sports-player'](playerPkg, 107, priv) === null, 'sports-player: a private question row never renders as feed news');

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

console.log('=== auto packs (pipeline.110) ===');
(function () {
  var agents = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-agents-'));
  fs.mkdirSync(path.join(agents, 'civic-office-test'));
  fs.writeFileSync(path.join(agents, 'civic-office-test', 'IDENTITY.md'), '# Test Office\n\n## Who You Are\n\n**Mayor Test** — a careful builder. Backs it with numbers.\n\n**POP ID:** POP-99910\n\n## Traits\n\n**Decision signature:** Moves fast.\n\n## Your Voice\n\n- public line\n');
  var ledger = [
    { POPID: 'POP-99910', Name: 'Mayor Test', ClockMode: 'CIVIC', RoleType: 'Mayor', DialState: '' },
    { POPID: 'POP-99911', Name: 'Test Ballplayer', ClockMode: 'GAME', RoleType: 'First Baseman, Oakland A\'s', DialState: '' },
    { POPID: 'POP-99912', Name: 'Old Legend', ClockMode: 'ENGINE', RoleType: 'Former Catcher, Oakland A\'s Legend', DialState: '' },
    { POPID: 'POP-99913', Name: 'Other Player', ClockMode: 'GAME', RoleType: 'Starting Pitcher, Oakland A\'s', DialState: '' },
    { POPID: 'POP-99914', Name: 'Loud Fan', ClockMode: 'ENGINE', RoleType: 'Bartender', DialState: '' },
    { POPID: 'POP-00527', Name: 'Mike Paulson', ClockMode: 'GAME', RoleType: 'General Manager', DialState: '' },
  ];
  var map = { offices: [{ officeId: 'MAYOR-T', title: 'Mayor', holder: 'Mayor Test', popid: 'POP-99910', district: 'citywide', agentDir: 'civic-office-test' },
    { officeId: 'CLERK-T', title: 'Clerk', holder: 'No Agent', popid: 'POP-99915' }], projects: [] };
  var named = new Set(['test ballplayer', 'old legend', 'loud fan', 'mike paulson']);
  var reg = { 'player-other': { persona: 'player-other', active: true, popid: 'POP-99913' } };
  var auto = wake.autoPackages(107, reg, { ledger: ledger, officeMap: map, named: named, agentsDir: agents });
  var keys = Object.keys(auto).sort().join();
  ok(keys === 'auto-office-civic-office-test,auto-player-POP-00527,auto-player-POP-99911,auto-player-POP-99912', 'auto packs: the agented office and the named club citizens — not the fan, not the registered player', keys);
  ok(!!auto['auto-player-POP-00527'], 'auto packs: nobody is carved out — a named GM is a named club citizen');
  var m = auto['auto-office-civic-office-test'];
  ok(m.dataNodes.indexOf('office-week') === 0 && m.dutyDays.join() === 'thu' && /careful builder/.test(m.promptContract.voiceNotes) && /Moves fast/.test(m.promptContract.voiceNotes) && !/public line|POP-99910/.test(m.promptContract.voiceNotes),
    'office pack: its own record, Thursday, who she is and how she decides from her own file');
  var pr = wake.buildWorkPrompts(m, { identity: 'x.', blocks: ['the work'] }, 'an old line');
  ok(!m.promptContract.frame && !m.promptContract.userFrame && !m.promptContract.targetSentences, 'office pack: no frame, no sentence count');
  ok(pr.user === 'the work' && /Your memory:\nan old line$/.test(pr.system) && !/the work/.test(pr.system), 'prompt: who they are + memory as memory; the work is the user turn, nothing added');
  ok(wake.NODE_BUILDERS['office-week'](Object.assign({}, m, { _officeWeek: ['stated: one', 'datawake: two'] })).indexOf('- datawake: two') > 0 && wake.NODE_BUILDERS['office-week'](m) === null, 'office-week: the prefetched record, or nothing');
  var due = wake.selectAutoDue(auto, 107, { wokenCycle: {} }, 'tue').map(function (p) { return p.key; }).sort().join();
  ok(due === 'auto-player-POP-00527,auto-player-POP-99911,auto-player-POP-99912', 'auto due Tuesday: the players; the office waits for Thursday', due);
  var once = wake.selectAutoDue(auto, 107, { wokenCycle: { 'POP-99911:cycle': 107 } }, 'thu').map(function (p) { return p.key; }).sort().join();
  ok(once === 'auto-office-civic-office-test,auto-player-POP-00527,auto-player-POP-99912', 'auto packs wake once a Cycle', once);
  var withFeed = wake.buildWorkPack(Object.assign({}, m, { _officeWeek: ['stated: one'], name: 'Other Player' }), 107, dir);
  ok(withFeed && withFeed.nodes.indexOf('own-feed') !== -1, 'any pack whose holder the feed names this Cycle carries his own feed lines');
  var co = fixtureBeats({ Business_Ledger: [{ BIZ_ID: 'BIZ-1', Name: 'Test Systems', Sector: 'Software', Neighborhood: 'West Oakland', Employee_Count: '41', Annual_Revenue: '60287787', Growth_Rate: '5.1', Key_Personnel: 'POP-99916 Test Founder (founder)' },
    { BIZ_ID: 'BIZ-2', Name: 'Someone Else Co', Sector: 'Food', Neighborhood: 'Temescal', Employee_Count: '3', Annual_Revenue: '1', Growth_Rate: '1', Key_Personnel: '' }] });
  var cb = wake.NODE_BUILDERS['own-company']({ popid: 'POP-99916' }, 107, co);
  ok(cb && /Test Systems/.test(cb) && /\$60\.3M/.test(cb) && !/Someone Else/.test(cb), 'own-company: only the rows that name him, in money he would say', cb);
})();

(function () {
  // pipeline.110 — a line the engine wrote because the feed named him is his week, not texture
  var lifeTailOf = require('../lib/wakePerception').lifeTailOf;
  var lines = ['Y3C9 — [Sports-PlayedWin] drove home with the radio off', 'Y3C9 — [Reputation] got recognized twice', 'Y3C10 — [Daily] a', 'Y3C10 — [Neighborhood] b', 'Y3C10 — [Lifestyle] c', 'Y3C11 — [Daily] d', 'Y3C11 — [Background] e', 'Y3C11 — [Personal] f'];
  var tail = lifeTailOf(lines, []);
  ok(/Sports-PlayedWin/.test(tail) && /Reputation/.test(tail) && tail.split('\n').length === 5, 'life tail: feed-named lines hold their slots against newer colour');
  ok(!/Sports-Moved/.test(lifeTailOf(['Y3C9 — [Sports-Moved] x'].concat(lines.slice(2)), [])), 'life tail: a Sports-Moved line holds no slot');
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
  var all = wake.selectDue(pkgs, 107, { recent: [], wokenCycle: {} }, { day: 'tue' });
  ok(all.picks.length === 2, 'no limit -> every due pack wakes (builder ruling 2026-09-22)');
  var inf = wake.selectDue(pkgs, 107, { recent: [], wokenCycle: {} }, { day: 'tue', limit: Infinity });
  ok(inf.picks.length === 2, 'limit Infinity -> every due pack wakes');

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
  var out = civicRun.foldMovesIntoDecisions(ws, 109, { offices: [] }); // civic.40: the close after fire C109 folds the week filed under C108
  ok(out.workMoves === 1 && out.workInitiatives === 1, 'fold counts the director move as work on one initiative');
  var decFiles = [];
  (function walk(d) { fs.readdirSync(d).forEach(function (f) { var q = path.join(d, f); if (fs.statSync(q).isDirectory()) walk(q); else if (/decisions_c109\.json$/.test(f)) decFiles.push(q); }); })(path.join(ws, 'output', 'city-civic-database', 'initiatives'));
  var dec = decFiles.length ? JSON.parse(fs.readFileSync(decFiles[0], 'utf8')) : null;
  ok(dec && dec.trackerUpdates.LastWorkCycle === 109 && dec.trackerUpdates.LastWorkSeat === 'proj-synth', 'fold stamps LastWorkCycle=109 (the closing cycle), LastWorkSeat=proj-synth from the director move');
  fs.rmSync(ws, { recursive: true, force: true });
  fs.rmSync(dir2, { recursive: true, force: true });
})();

// 2026-11-11 (codex F2): the office-week read has one budget, rate-limit waits included — a hung store ends it.
// The keep-alive stands in for the open socket a real hung request holds (abort timers alone do not keep Node up).
(async () => {
  const realFetch = global.fetch;
  const keepAlive = setInterval(() => {}, 50);
  global.fetch = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
  const t0 = Date.now();
  let threw = null;
  try { await wake.loadOfficeWeek('POP-00034', 115, { budgetMs: 100 }); } catch (e) { threw = e; }
  finally { global.fetch = realFetch; clearInterval(keepAlive); }
  ok(threw && Date.now() - t0 < 2000, 'a hung office-week read throws inside its budget (the wake runs without that block)');
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
