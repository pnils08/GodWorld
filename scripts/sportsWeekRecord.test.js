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
test('malformed current weekly input rejects the read', () => {
  assert.throws(() => read([row({ WeekRecord: 'H:W bad' })]), /WeekRecord/);
});
test('duplicate weekly summaries reject instead of silently choosing a result', () => {
  assert.throws(() => read([row({ WeekRecord: 'H:W' }), row({ WeekRecord: 'A:L' })]), /duplicate.*WeekRecord/i);
});
test('team aliases cannot bypass duplicate protection', () => {
  // 'as' and "A's" both normalize to the A's, so a spelling change must not buy a second week.
  assert.throws(() => read([row({ TeamsUsed: 'as', WeekRecord: 'H:W' }), row({ TeamsUsed: "A's", WeekRecord: 'A:L' })]), /duplicate.*WeekRecord/i);
});
test('two franchises may each report a week', () => {
  assert.strictEqual(read([row({ WeekRecord: 'H:W' }), row({ TeamsUsed: 'Oaks', WeekRecord: 'A:L' })]).length, 2);
});
test('real-NBA rows never claim the Oaks week or settle an Oaks wager', () => {
  // Live feed: all 8 TeamsUsed='NBA' rows are real-NBA canon (C84 Bulls 121-105,
  // C88-C92 expansion bid / Paulson), predating the Oaks' first result at C101.
  // A Bulls box score must never resolve an Oaks moneyline.
  assert.throws(() => read([row({ TeamsUsed: 'NBA', WeekRecord: 'H:W A:L' })]), /requires an Oakland franchise/);
  const oaks = read([row({ TeamsUsed: 'Oaks', WeekRecord: 'H:W A:L' })]);
  assert.strictEqual(box.casinoParseSports_(oaks, 'oaks').franchiseWon, true);
});
test('weekly games require game-result; no-games requires season-state', () => {
  assert.throws(() => read([row({ WeekRecord: 'H:W', EventType: 'player-feature' })]), /WeekRecord/);
  assert.throws(() => read([row({ WeekRecord: 'none' })]), /WeekRecord/);
  assert.strictEqual(read([row({ WeekRecord: 'none', EventType: 'season-state' })])[0].weekRecord, 'none');
});
test('unknown weekly team fails visibly instead of becoming an unassigned result', () => {
  assert.throws(() => read([row({ WeekRecord: 'H:W', TeamsUsed: 'SYNTHETIC-UNKNOWN' })]), /WeekRecord/);
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
test('casino independently rejects malformed or duplicate weekly input', () => {
  assert.throws(() => resolve([entry({ weekRecord: 'H:W bad' })]), /WeekRecord/);
  assert.throws(() => resolve([entry({ weekRecord: 'H:W' }), entry({ weekRecord: 'H:L' })]), /duplicate.*WeekRecord/i);
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
  assert.strictEqual(ctx.ledger.rows[0][4], 1073);
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

console.log(`${passed} passed; ${failed} failed`);
if (failed) process.exitCode = 1;
