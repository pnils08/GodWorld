'use strict';

// engine.202: isolated, synthetic fixtures only. Never reads/writes live Sheets.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.env.SPORTS_ENGINE_ROOT || path.resolve(__dirname, '..');
const box = { Logger: { log() {} } };
vm.createContext(box);
const helper = path.join(root, 'utilities/sportsWeekRecord.js');
if (fs.existsSync(helper)) vm.runInContext(fs.readFileSync(helper, 'utf8'), box);
for (const file of ['phase02-world-state/applySportsSeason.js', 'phase05-citizens/casinoLedgerEngine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), box);
}
const plain = value => JSON.parse(JSON.stringify(value));
let passed = 0, failed = 0;
function test(name, run) {
  try { run(); passed++; console.log('ok ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}
const parse = raw => {
  assert.strictEqual(typeof box.parseSportsWeekRecord_, 'function', 'weekly parser must exist');
  return plain(box.parseSportsWeekRecord_(raw));
};
const base = { Cycle: 404, TeamsUsed: "A's", EventType: 'game-result', SeasonType: 'regular-season',
  'Team Record': '12-7', Streak: 'L1', Notes: 'SYNTHETIC NON-CANON weekly fixture' };
// The reader must never throw: a bad cell is rejected into Engine_Errors and
// the row survives without weekly facts (engine.202 defect 7).
box.__rejections = [];
box.logEngineError_ = (ctx, phase, err) => box.__rejections.push(phase + ': ' + err.message);
const rejected = () => { const r = box.__rejections.slice(); box.__rejections.length = 0; return r; };
function readRejecting(rows, pattern) {
  box.__rejections.length = 0;
  const entries = read(rows);
  const errs = rejected();
  assert.ok(errs.length >= 1, 'expected a rejection, got none');
  assert.match(errs.join('\n'), pattern);
  assert.ok(errs.every(e => /^Phase2-SportsSeason:WeekRecord: /.test(e)), 'rejection must be phase-tagged');
  return entries;
}
function read(rows, extraHeaders = ['WeekRecord']) {
  const headers = [...Object.keys(base), ...extraHeaders];
  const values = [headers, ...rows.map(row => headers.map(h => row[h] ?? ''))];
  const sheet = { getDataRange: () => ({ getValues: () => values }) };
  return plain(box.readOaklandFeedEntries_({ ss: { getSheetByName: () => sheet } }, 404));
}
const row = changes => ({ ...base, ...changes });
const entry = changes => ({ cycle: 404, teamsUsed: "A's", eventType: 'game-result',
  streak: 'L1', teamRecord: '12-7', ...changes });
const resolve = (entries, side = 'win') => plain(box.casinoResolve_({
  status: 'open', marketFamily: 'sports', marketId: 'sports:as', side
}, { sports: entries }, 404));

test('ordered results derive week totals, home volume and first result independently', () => {
  const week = parse('H:W H:L A:W');
  assert.strictEqual(week.record, '2-1');
  assert.strictEqual(week.gamesPlayed, 3);
  assert.strictEqual(week.homeGames, 2);
  assert.strictEqual(week.awayGames, 1);
  assert.strictEqual(week.firstResult, 'W');
  assert.deepStrictEqual(week.games, [{ venue: 'H', result: 'W' }, { venue: 'H', result: 'L' }, { venue: 'A', result: 'W' }]);
});
test('case and whitespace normalize without reordering', () => {
  assert.strictEqual(parse('  a:l\t h:w\nA:W ').value, 'A:L H:W A:W');
});
test('blank means unreported, not zero games', () => assert.strictEqual(parse(' '), null));
test('none explicitly reports no games and no first result', () => {
  const week = parse('none');
  assert.strictEqual(week.gamesPlayed, 0);
  assert.strictEqual(week.homeGames, 0);
  assert.strictEqual(week.firstResult, null);
});
test('all-away wins have zero stadium home games', () => assert.strictEqual(parse('A:W A:W').homeGames, 0));
test('seven-game homestand differs from one game', () => {
  assert.strictEqual(parse(Array(7).fill('H:L').join(' ')).homeGames, 7);
  assert.strictEqual(parse('H:L').homeGames, 1);
});
for (const invalid of ['2-1', 'H:W rubbish A:L', 'H:W,A:L', 'H:T', 'X:W', 'none H:W', '-', 'W2', 'H:']) {
  test('malformed weekly input fails visibly: ' + invalid, () => assert.throws(() => parse(invalid), /WeekRecord/));
}
test('legacy headers and blank weekly cell preserve entry shape', () => {
  assert.deepStrictEqual(read([row({})]), read([row({})], []));
});
test('legacy VideoGame contents are never interpreted as weekly results', () => {
  const old = read([row({ VideoGame: 'H:W' })], ['VideoGame']);
  assert(!Object.hasOwn(old[0], 'weekRecord'));
});
test('current-Cycle reader carries normalized weekly input only', () => {
  const result = read([row({ Cycle: 403, WeekRecord: 'invalid old value' }), row({ WeekRecord: 'h:w a:l' }), row({ Cycle: 405, WeekRecord: 'invalid future value' })]);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].weekRecord, 'H:W A:L');
});
test('malformed weekly input rejects the cell, keeps the row, never the cycle', () => {
  const entries = readRejecting([row({ WeekRecord: 'H:W bad' })], /WeekRecord/);
  assert.strictEqual(entries.length, 1, 'the row still carries its recorded facts');
  assert.strictEqual(entries[0].streak, 'L1');
  assert.strictEqual('weekRecord' in entries[0], false, 'no weekly facts survive a bad cell');
});
test('per-game weekly rows fold in row order into the first row (builder 2026-09-26)', () => {
  // The C109 World Series shape: one token per game row.
  const entries = read([row({ WeekRecord: 'H:W' }), row({ WeekRecord: 'H:L' }), row({ WeekRecord: 'A:W' })]);
  assert.deepStrictEqual(rejected(), [], 'folding is not an error');
  assert.strictEqual(entries.length, 3);
  assert.strictEqual(entries[0].weekRecord, 'H:W H:L A:W');
  assert.strictEqual('weekRecord' in entries[1], false);
  assert.strictEqual('weekRecord' in entries[2], false);
  assert.strictEqual(parse(entries[0].weekRecord).record, '2-1');
  assert.strictEqual(resolve(entries).status, 'settled-win', 'casino still settles on the first game');
});
test('a no-games week never folds with games: later row rejected, first stands', () => {
  const entries = readRejecting([row({ WeekRecord: 'none', EventType: 'season-state' }), row({ WeekRecord: 'A:L' })], /duplicate.*WeekRecord/i);
  assert.strictEqual(entries[0].weekRecord, 'none');
  assert.strictEqual('weekRecord' in entries[1], false);
});
test('team aliases fold into one week, never two', () => {
  // 'as' and "A's" both normalize to the A's, so a spelling change must not buy a second week.
  const entries = read([row({ TeamsUsed: 'as', WeekRecord: 'H:W' }), row({ TeamsUsed: "A's", WeekRecord: 'A:L' })]);
  assert.deepStrictEqual(rejected(), []);
  assert.strictEqual(entries[0].weekRecord, 'H:W A:L');
  assert.strictEqual('weekRecord' in entries[1], false);
});
test('a season-state row carrying a game token is still refused (C108 row 226 / C109 row 235)', () => {
  const entries = readRejecting([row({ WeekRecord: 'H:W' }), row({ WeekRecord: 'H:W', EventType: 'season-state', SeasonType: 'championship' })], /games require game-result/);
  assert.strictEqual(entries[0].weekRecord, 'H:W');
  assert.strictEqual(plain(box.deriveSeasonByTeamFromFeed_(entries))["A's"], 'championship', 'the season lens still reads the last row');
});
test('two franchises may each report a week', () => {
  assert.strictEqual(read([row({ WeekRecord: 'H:W' }), row({ TeamsUsed: 'Oaks', WeekRecord: 'A:L' })]).length, 2);
  assert.deepStrictEqual(rejected(), []);
});
test('real-NBA rows never claim the Oaks week or settle an Oaks wager', () => {
  // NBA/Warriors are retired pre-Oaks build-up labels (ruling 2026-09-16); the
  // live feed's 8 NBA rows are C84 Bulls 121-105 and the C88-C92 expansion arc.
  // A Bulls box score must never resolve an Oaks moneyline.
  const nba = readRejecting([row({ TeamsUsed: 'NBA', WeekRecord: 'H:W A:L' })], /requires an Oakland franchise/);
  assert.strictEqual(box.casinoParseSports_(nba, 'oaks').kind, 'carry');
  const oaks = read([row({ TeamsUsed: 'Oaks', WeekRecord: 'H:W A:L' })]);
  assert.strictEqual(box.casinoParseSports_(oaks, 'oaks').franchiseWon, true);
});
test('weekly games require game-result; no-games requires season-state', () => {
  readRejecting([row({ WeekRecord: 'H:W', EventType: 'player-feature' })], /games require game-result/);
  readRejecting([row({ WeekRecord: 'none' })], /none requires season-state/);
  assert.strictEqual(read([row({ WeekRecord: 'none', EventType: 'season-state' })])[0].weekRecord, 'none');
});
test('unknown weekly team is rejected visibly instead of becoming an unassigned result', () => {
  const entries = readRejecting([row({ WeekRecord: 'H:W', TeamsUsed: 'SYNTHETIC-UNKNOWN' })], /requires an Oakland franchise/);
  assert.strictEqual('weekRecord' in entries[0], false);
});
test('a rejected cell leaves the rest of the cycle\'s sports state intact', () => {
  // The whole point of defect 7: one bad cell must not blank the city.
  const entries = readRejecting([row({ WeekRecord: 'garbage' }), row({ TeamsUsed: 'Oaks', WeekRecord: 'A:W', SeasonType: 'playoffs' })], /WeekRecord: use ordered .*\(Oakland_Sports_Feed row 2\)/);
  assert.strictEqual(entries.length, 2);
  assert.deepStrictEqual(plain(box.deriveSeasonByTeamFromFeed_(entries)), { "A's": 'regular-season', Oaks: 'playoffs' });
  assert.strictEqual(box.casinoParseSports_(entries, 'oaks').franchiseWon, true);
  // The A's row lost its weekly facts but its Streak still settles by the legacy path.
  assert.strictEqual(box.casinoParseSports_(entries, 'as').franchiseWon, false);
});
test('first weekly result wins despite a losing final streak', () => {
  assert.strictEqual(resolve(read([row({ WeekRecord: 'H:W A:L' })])).status, 'settled-win');
});
test('winning week starting with a loss settles loss, never majority vote', () => {
  assert.strictEqual(resolve([entry({ weekRecord: 'H:L A:W A:W', streak: 'W2' })]).status, 'settled-loss');
  assert.strictEqual(resolve([entry({ weekRecord: 'H:L A:W A:W' })], 'loss').status, 'settled-win');
});
test('explicit weekly summary supplies settlement ahead of supplemental rows', () => {
  assert.strictEqual(resolve([entry({}), entry({ weekRecord: 'H:W A:L' })]).status, 'settled-win');
});
test('explicit no-games week carries despite a stale streak or supplemental game row', () => {
  assert.strictEqual(resolve([entry({ streak: 'W3' }), entry({ weekRecord: 'none', eventType: 'season-state' })]).status, 'carry');
});
test('casino independently rejects malformed input and no-games duplicates, folds game rows', () => {
  assert.throws(() => resolve([entry({ weekRecord: 'H:W bad' })]), /WeekRecord/);
  assert.throws(() => resolve([entry({ weekRecord: 'none', eventType: 'season-state' }), entry({ weekRecord: 'H:L' })]), /duplicate.*WeekRecord/i);
  // Raw per-game rows (the Node casino path reads the sheet unfolded) fold the same way.
  assert.strictEqual(resolve([entry({ weekRecord: 'H:L' }), entry({ weekRecord: 'H:W' })]).status, 'settled-loss');
});
test('legacy first-result rule and empty-feed carry remain unchanged', () => {
  assert.strictEqual(resolve([entry({}), entry({ streak: 'W1' })]).status, 'settled-loss');
  assert.strictEqual(resolve([]).status, 'carry');
});
test('franchises cannot settle each others wagers', () => {
  assert.strictEqual(resolve([entry({ teamsUsed: 'Oaks', weekRecord: 'H:W' })]).status, 'carry');
});
test('already settled wagers are unchanged', () => {
  assert.strictEqual(box.casinoResolve_({ status: 'settled-win', marketFamily: 'sports' }, { sports: [entry({ weekRecord: 'H:L' })] }, 404).alreadySettled, true);
});

// Exercise the real Phase 5 ledger path, observing queued writes in memory.
box.simYearOf_ = () => 2040;
box.safeRand_ = ctx => ctx.rng;
box.pressureBar_ = () => 50;
box.queueCellIntent_ = (ctx, tab, r, c, value) => ctx.cells.push({ tab, r, c, value });
box.queueAppendIntent_ = () => { throw new Error('unexpected new wager in settlement fixture'); };
function settleWeek(weekRecord, streak) {
  const headers = plain(box.CASINO_HEADERS);
  const wager = { WagerId: 'SYNTHETIC-WAGER', CyclePlaced: 403, POPID: 'POP-TEST-1',
    MarketFamily: 'sports', MarketId: 'sports:as', EventId: 'next-as', Side: 'win',
    Stake: 40, Odds: 1.83, Status: 'open', Payout: 0 };
  const values = [headers, headers.map(h => wager[h] ?? ''),
    headers.map(h => ({ WagerId: 'HOUSE', Status: 'house', HouseFloatAfter: 250000 })[h] ?? '')];
  const ledgerHeaders = ['POPID', 'Status', 'BirthYear', 'Income', 'NetWorth', 'DebtLevel', 'LifeHistory'];
  const ctx = { ledger: { headers: ledgerHeaders, rows: [['POP-TEST-1', 'Active', 2000, 52000, 1000, 0, '']], dirty: false },
    ss: { getSheetByName: name => name === 'Casino_Ledger' ? { getDataRange: () => ({ getValues: () => values }) } : null },
    summary: { sportsFeedEntries: read([row({ WeekRecord: weekRecord, Streak: streak })]) },
    cells: [], rng: () => 0.99 };
  const result = box.processCasinoLedger_(ctx, 404);
  const written = name => ctx.cells.find(c => c.tab === 'Casino_Ledger' && c.r === 2 && c.c === headers.indexOf(name) + 1)?.value;
  return { ctx, result, written };
}
test('weekly win reaches issued-odds payout, CycleSettled, NetWorth and LifeHistory', () => {
  const { ctx, result, written } = settleWeek('H:W A:L', 'L1');
  assert.strictEqual(result.settled, 1);
  assert.strictEqual(written('Status'), 'settled-win');
  assert.strictEqual(written('CycleSettled'), 404);
  assert.strictEqual(written('Payout'), 73);
  assert.strictEqual(ctx.ledger.rows[0][4], 1033); // engine.262: net win (73 payout − 40 stake), the ticket records the gross
  assert.match(ctx.ledger.rows[0][6], /\[Casino\]/);
});
test('weekly loss deducts the stake and records the citizen consequence', () => {
  const { ctx, result, written } = settleWeek('H:L A:W A:W', 'W2');
  assert.strictEqual(result.settled, 1);
  assert.strictEqual(written('Status'), 'settled-loss');
  assert.strictEqual(written('CycleSettled'), 404);
  assert.strictEqual(written('Payout'), 0);
  assert.strictEqual(ctx.ledger.rows[0][4], 960);
  assert.match(ctx.ledger.rows[0][6], /\[Casino\]/);
});

test('Node and Apps Script share weekly outcomes without mutating feed entries', () => {
  const node = require(path.join(root, 'scripts/casinoLedger.js'));
  for (const weekRecord of ['H:W A:L', 'H:L A:W A:W', 'none']) {
    const entries = [entry({ weekRecord, eventType: weekRecord === 'none' ? 'season-state' : 'game-result' })];
    const before = JSON.stringify(entries);
    const a = plain(box.casinoParseSports_(entries, 'as'));
    const b = node.parseSportsMoneyline(entries, 'as');
    assert.strictEqual(a.kind, b.kind);
    assert.strictEqual(a.franchiseWon, b.franchiseWon);
    assert.strictEqual(a.eventId, b.eventId);
    assert.strictEqual(JSON.stringify(entries), before);
    if (b.entry) assert.strictEqual(b.entry, entries[0]);
  }
});

// ── engine.208 C3: the week object (one baseline with engine.204/205) ─────────
const wk = (team, cell, lens, hist, cyc = 404) =>
  plain(box.buildSportsWeek_(team, cell ? box.parseSportsWeekRecord_(cell) : null, lens, hist || {}, cyc));
const H = (...weeks) => { const o = {}; weeks.forEach(([c, w, l]) => (o[c] = { w, l })); return o; };
test('208 C3 below 4 game weeks the ruled prior stands (A\'s .750, Oaks .400)', () => {
  assert.strictEqual(wk("A's", 'H:W', 'regular-season').expectation, 0.75);
  assert.strictEqual(wk('Oaks', 'H:W', 'preseason').expectation, 0.4);
  assert.strictEqual(wk('Oaks', 'H:W', 'preseason', H([400, 1, 0], [401, 0, 1], [402, 0, 1])).n, 3);
});
test('208 C3 expectation = mean weekly win share over the last 8 game weeks, current Cycle excluded', () => {
  const hist = H([395, 1, 0], [396, 1, 0], [397, 0, 1], [398, 1, 1], [399, 2, 0], [400, 0, 0], [401, 1, 0], [402, 0, 2], [403, 3, 0], [404, 0, 5]);
  const w = wk("A's", 'H:W', 'regular-season', hist);
  assert.strictEqual(w.n, 8);                         // 400 had no games; 404 is the current Cycle
  const shares = [1, 1, 0, 0.5, 1, 1, 0, 1];         // 403 402 401 399 398 397 396 395 (newest first)
  assert.ok(Math.abs(w.expectation - shares.reduce((a, b) => a + b) / 8) < 1e-12);
});
test('208 C3 the window survives an off-season (game weeks, not calendar Cycles)', () => {
  const w = wk("A's", 'H:L A:L', 'regular-season', H([300, 2, 0], [301, 2, 0], [302, 1, 0], [303, 2, 1]), 404);
  assert.strictEqual(w.n, 4);
  assert.strictEqual(w.cls, 'LOSS');
});
test('208 C3 class precedence edges', () => {
  const perfect = H([400, 3, 0], [401, 2, 0], [402, 1, 0], [403, 4, 0]);
  assert.strictEqual(wk("A's", 'H:W H:W H:W', 'regular-season', perfect).cls, 'WIN');        // sweep at expectation 1
  assert.strictEqual(wk("A's", 'H:W A:L', 'division-series', perfect).cls, 'RUN');           // tied playoff week held
  assert.strictEqual(wk("A's", 'A:L A:L', 'division-series', perfect).cls, 'LOSS');          // a lost playoff week is no run
  assert.strictEqual(wk("A's", 'A:W A:W', 'championship').cls, 'TITLE');                      // C110 shape
  assert.strictEqual(wk("A's", 'H:L H:L H:W', 'championship').cls, 'TITLE');                  // the clinch win counts
  assert.strictEqual(wk("A's", 'A:L', 'championship').cls, 'LOSS');                           // prior .75, surprise -1
  assert.strictEqual(wk("A's", 'H:W H:W H:L', 'regular-season').cls, 'EVEN');                 // 2-1 under a .750 norm
  assert.strictEqual(wk("A's", 'H:W H:L', 'regular-season').cls, 'EVEN');                     // split
  assert.strictEqual(wk("A's", 'none', 'regular-season').cls, 'none');
  assert.strictEqual(wk("A's", '', 'regular-season').cls, 'none');
});
test('208 C3 ruling v: an Oaks losing week is -1 until four own game weeks, then -2 under its norm', () => {
  assert.strictEqual(wk('Oaks', 'H:L A:L', 'preseason', H([400, 0, 1], [401, 0, 1])).cls, 'LOSING_WEEK');
  assert.strictEqual(wk('Oaks', 'A:L', 'regular-season').cls, 'LOSING_WEEK');                 // prior .4, n 0
  const fourWins = H([400, 2, 0], [401, 2, 0], [402, 1, 0], [403, 2, 0]);
  assert.strictEqual(wk('Oaks', 'A:L A:L', 'regular-season', fourWins).cls, 'LOSS');
  const fourLosses = H([400, 0, 2], [401, 0, 1], [402, 0, 1], [403, 0, 3]);
  assert.strictEqual(wk('Oaks', 'A:L A:L', 'regular-season', fourLosses).cls, 'LOSING_WEEK'); // as expected
  assert.strictEqual(wk('Oaks', 'H:W', 'preseason').cls, 'WIN');                             // over a .400 prior
});
test('208 C3 tags for each class; none/EVEN carry no signed line', () => {
  assert.deepStrictEqual(plain(box.SPORTS_WEEK_TAG_), { TITLE: 'Sports-Title', RUN: 'Sports-Run', WIN: 'Sports-Win', LOSS: 'Sports-Loss', LOSING_WEEK: 'Sports-LosingWeek' });
});
test('208 C3 the reader projects earlier Cycles from the same grid; a bad old cell is skipped silently', () => {
  box.__rejections.length = 0;
  const headers = [...Object.keys(base), 'WeekRecord'];
  const r = (c) => headers.map(h => c[h] ?? '');
  const values = [headers,
    r(row({ Cycle: 401, WeekRecord: 'H:W' })), r(row({ Cycle: 401, WeekRecord: 'A:L' })),
    r(row({ Cycle: 402, WeekRecord: 'H:X' })),
    r(row({ Cycle: 403, TeamsUsed: 'Oaks', WeekRecord: 'A:L' })),
    r(row({ Cycle: 404, WeekRecord: 'H:W' }))];
  const ctx = { ss: { getSheetByName: () => ({ getDataRange: () => ({ getValues: () => values }) }) } };
  box.readOaklandFeedEntries_(ctx, 404);
  assert.deepStrictEqual(plain(ctx._sportsWeekHistory), { "A's": { 401: { w: 1, l: 1 } }, Oaks: { 403: { w: 0, l: 1 } } });
  assert.deepStrictEqual(rejected(), []);
});
test('208 C3 S.sportsWeek: lens is the franchise\'s LAST row; week anchored on the first game row', () => {
  const entries = [
    { teamsUsed: "A's", seasonType: 'playoffs', weekRecord: 'A:W A:W', eventType: 'game-result' },
    { teamsUsed: "A's", seasonType: 'playoffs', eventType: 'game-result' },
    { teamsUsed: "A's", seasonType: 'championship', eventType: 'game-result' },
    { teamsUsed: 'Oaks', seasonType: 'preseason', weekRecord: 'H:L A:L', eventType: 'game-result' }];
  const out = plain(box.deriveSportsWeekFromFeed_(entries, { Oaks: H([108, 0, 1], [109, 0, 2]) }, 110));
  assert.strictEqual(out["A's"].lens, 'championship');
  assert.strictEqual(out["A's"].cls, 'TITLE');
  assert.strictEqual(out.Oaks.cls, 'LOSING_WEEK');
  assert.strictEqual(out.Oaks.n, 2);
});
test('208 C6 the seven round words count as playoffs for the city', () => {
  for (const w of ['wild-card', 'division-series', 'league-championship', 'play-in', 'first-round', 'conference-semis', 'conference-finals']) {
    assert.strictEqual(box.canonicalSportsPhase_(w), 'playoffs', w);
  }
  assert.strictEqual(box.canonicalSportsPhase_('world-series'), 'championship');           // unchanged (Revision 1)
});

console.log(`${passed} passed; ${failed} failed`);
if (failed) process.exitCode = 1;
