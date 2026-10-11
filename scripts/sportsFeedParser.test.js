#!/usr/bin/env node
'use strict';

// engine.203 D1/D4: local VM + in-memory Sheet fixtures; no external reads or writes.
// The four-row record case follows the C106 shape measured in the S447 ruling.
// Other numeric records and SYNTHETIC-HOOD are isolated non-canon fixtures.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const logs = [];
const sandbox = { Logger: { log: (message) => logs.push(String(message)) } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../phase02-world-state/applySportsSeason.js'), 'utf8'), sandbox);
// engine.203d: the aftermath helpers live in the shared week utility (one global scope in Apps Script)
vm.runInContext(fs.readFileSync(path.join(__dirname, '../utilities/sportsWeekRecord.js'), 'utf8'), sandbox);

const headers = ['Cycle', 'TeamsUsed', 'EventType', 'SeasonType', 'Team Record', 'Streak',
  'EventTrigger', 'HomeNeighborhood', 'PlayerMood', 'FanSentiment', 'FranchiseStability',
  'EconomicFootprint', 'CommunityInvestment', 'MediaProfile'];
const row = (overrides) => Object.assign({ Cycle: 106, TeamsUsed: "A's", SeasonType: 'regular-season' }, overrides);
const plain = (value) => JSON.parse(JSON.stringify(value));
function read(rows, cycle = 106) {
  logs.length = 0;
  const sheet = { getDataRange: () => ({ getValues: () => [headers, ...rows.map(r => headers.map(h => r[h] ?? ''))] }) };
  const result = plain(sandbox.processFeedSheet_(sheet, cycle));
  // Observe the record actually used for sentiment without changing the engine's return shape.
  const records = {};
  for (const line of logs) {
    const match = /^Sports sentiment: (.+?) = .*\(record: (.*?), season:/.exec(line);
    if (match) records[match[1]] = match[2];
  }
  return { result, records };
}
let passed = 0, failed = 0;
function test(label, fn) {
  try { fn(); passed++; console.log('  ok  ' + label); }
  catch (error) { failed++; console.error('  FAIL ' + label + ': ' + error.message); }
}
function near(actual, expected) { assert(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`); }

test('D4: C106 player-feature record survives blank, roster-move 0-0 and team-update 0-0', () => {
  const actual = read([
    row({ EventType: 'player-feature', SeasonType: 'playoffs', 'Team Record': '127-35' }),
    row({ EventType: 'player-feature', SeasonType: '', 'Team Record': '' }),
    row({ EventType: 'roster-move', SeasonType: '', 'Team Record': '0-0' }),
    row({ EventType: 'team-update', SeasonType: '', 'Team Record': '0-0' })
  ]);
  assert.strictEqual(actual.records["A's"], '127-35');
  near(actual.result.sentiment, 0); // carried record is not an accepted game week
});
test('D4: lone Oaks 0-0 is retained with zero base sentiment', () => {
  const actual = read([row({ TeamsUsed: 'Oaks', SeasonType: 'preseason', 'Team Record': '0-0' })]);
  assert.strictEqual(actual.records.Oaks, '0-0');
  assert.strictEqual(actual.result.sentiment, 0);
  assert(!logs.some(line => /error|invalid/i.test(line)));
});
for (const filler of ['-', '  -  ', '0-0', '0 – 0', 'unparseable']) {
  test('D4: no-information record cannot replace informative record: ' + filler, () => {
    const actual = read([row({ 'Team Record': '10-2' }), row({ 'Team Record': filler })]);
    assert.strictEqual(actual.records["A's"], '10-2');
    near(actual.result.sentiment, 0);
  });
}
test('D4: actual zero wins remains informative and replaces a winning record', () => {
  const actual = read([row({ 'Team Record': '10-2' }), row({ 'Team Record': '0-3' })]);
  assert.strictEqual(actual.records["A's"], '0-3');
  near(actual.result.sentiment, 0);
});
test('D4: first played record replaces 0-0', () => {
  assert.strictEqual(read([row({ 'Team Record': '0-0' }), row({ 'Team Record': '1-0' })]).records["A's"], '1-0');
});
test('D4: informative record format follows the existing parser', () => {
  assert.strictEqual(read([row({ 'Team Record': '10-2' }), row({ 'Team Record': 'record: 12–3' })]).records["A's"], 'record: 12–3');
});

// Authored fields still carry for triggers/prose; they no longer price game results.
const complete = row({ 'Team Record': '10-2', SeasonType: 'playoffs', Streak: 'W1',
  EventTrigger: 'rivalry', HomeNeighborhood: 'SYNTHETIC-HOOD', PlayerMood: 'electric',
  FanSentiment: 'high', FranchiseStability: 'stable', EconomicFootprint: 'growing',
  CommunityInvestment: 'active', MediaProfile: 'national' });
for (const field of ['SeasonType', 'Streak', 'EventTrigger', 'HomeNeighborhood', 'PlayerMood',
  'FanSentiment', 'FranchiseStability', 'EconomicFootprint', 'CommunityInvestment', 'MediaProfile']) {
  test('D4: dash preserves existing ' + field, () => {
    const later = { Cycle: 106, TeamsUsed: "A's", [field]: ' - ' };
    assert.deepStrictEqual(read([complete, later]).result, read([complete]).result);
  });
}
test('D4: explicit none still clears a manual trigger', () => {
  const actual = read([row({ EventTrigger: 'rivalry' }), row({ EventTrigger: 'none' })]);
  assert.deepStrictEqual(actual.result.triggers, []);
});

for (const [label, factor] of [
  ['summer league', 0.5], ['summer-league', 0.5], ['preseason', 0.5],
  ['spring-training', 0.5], ['playoffs', 2], ['postseason', 2], ['post-season', 2],
  ['world-series', 3], ['worldseries', 3], ['world series', 3], ['finals', 3],
  ['championship', 3], ['regular', 1], ['regular-season', 1], ['early-season', 1],
  ['mid-season', 1], ['late-season', 1], ['off-season', 0.3],
  ['interplanetary-cup', 0.3], ['world invitational', 0.3], ['playoffish', 0.3], ['', 0.3]
]) {
  test('D1: no week pays no games share; canonical SeasonType: ' + JSON.stringify(label), () => {
    const actual = read([row({ SeasonType: label, 'Team Record': '10-2' })]);
    near(actual.result.sentiment, 0);
    const state = { seasonType: label };
    sandbox.feedTeamShare_(state);
    const expected = factor === 0.3 ? 'off-season' : factor === 3 ? 'championship' :
      factor === 2 ? (label === 'postseason' || label === 'post-season' ? 'post-season' : 'playoffs') :
      label === 'summer league' || label === 'summer-league' ? 'preseason' : label === 'regular' ? 'regular-season' : label;
    assert.strictEqual(state.seasonType, expected);
  });
}
test('D1: unknown season cannot infer a championship through a substring', () => {
  assert.deepStrictEqual(read([row({ SeasonType: 'world invitational' })]).result.triggers, []);
});

test('D3 guard: prior-Cycle fields still carry when the team has a current row', () => {
  const old = Object.assign({}, complete, { Cycle: 105 });
  assert.deepStrictEqual(read([old, { Cycle: 106, TeamsUsed: "A's" }]).result, read([complete]).result);
});
test('D3 guard: with no game-week history a team without a current row stays silent', () => {
  assert.deepStrictEqual(read([Object.assign({}, complete, { Cycle: 105 })]).result,
    { sentiment: 0, triggers: [], aftermath: { total: 0, byTeam: {} } });
});

// engine.203d — the aftermath of the last game week (builder 2026-10-07: "slow fade for title,
// upset first on a loss"). Fixtures follow the live C110 title shape; numbers are synthetic.
const feedSheet = (rows) => ({ getDataRange: () => ({ getValues: () => [headers, ...rows.map(r => headers.map(h => r[h] ?? ''))] }) });
const titleRows = [
  row({ Cycle: 110, EventType: 'game-result', SeasonType: 'playoffs', 'Team Record': '4-1', Streak: 'W3' }),
  row({ Cycle: 110, EventType: 'game-result', SeasonType: 'championship', 'Team Record': '11-3', Streak: 'W3', EventTrigger: 'championship' })
];
const titleHist = (rate = 0.85) => ({ weeks: { "A's": { 110: { w: 2, l: 0 } } }, lens: { "A's": { 110: 'championship' } }, fadeRate: rate });
function weekFor(f, w, l, lens, history = {}, cycle = 110, weights) {
  const wk = sandbox.buildSportsWeek_(f, { wins: w, losses: l, homeGames: w + l, awayGames: 0 }, lens, history, cycle);
  sandbox.addSportsWeekIntensity_(f, wk, sandbox.sportsLensDepth_(lens), sandbox.canonicalSportsPhase_(lens), [], [], weights);
  return wk;
}
const share110 = () => plain(sandbox.processFeedSheet_(feedSheet(titleRows), 110,
  { "A's": weekFor("A's", 2, 0, 'championship') })).sentiment;
test('203d: the week after a title fades from the title share, no dip', () => {
  const s = share110();
  assert(s > 0.05, 'fixture title share ' + s);
  const r = plain(sandbox.processFeedSheet_(feedSheet(titleRows), 111, {}, titleHist()));
  near(r.aftermath.total, s * 0.85);
  assert.strictEqual(r.sentiment, 0, 'the games term is empty on a quiet week');
  assert.deepStrictEqual(r.triggers, [], 'no row this Cycle: nothing authored to trigger on');
  assert.strictEqual(r.aftermath.byTeam["A's"].kind, 'title');
  assert.strictEqual(r.aftermath.byTeam["A's"].quiet, 1);
  const r3 = plain(sandbox.processFeedSheet_(feedSheet(titleRows), 113, {}, titleHist()));
  near(r3.aftermath.total, s * Math.pow(0.85, 3));
});
test('203d: an off-season row after the title does not re-read the carried record (no snap, no hold)', () => {
  const rows = titleRows.concat([row({ Cycle: 111, EventType: 'front-office', SeasonType: 'off-season', EventTrigger: 'breaking-news' })]);
  const r = plain(sandbox.processFeedSheet_(feedSheet(rows), 111, { "A's": { g: 0, h: 0 } }, titleHist()));
  near(r.aftermath.total, share110() * 0.85);
  assert.strictEqual(r.sentiment, 0);
  assert.deepStrictEqual(r.triggers.map(t => t.trigger), ['breaking-news'], 'the authored trigger still fires');
  near(r.triggers[0].sentiment, share110() * 0.85);
});
test('203d: a game week this Cycle reads the repriced formula, not aftermath', () => {
  const rows = titleRows.concat([row({ Cycle: 111, EventType: 'game-result', SeasonType: 'regular-season', 'Team Record': '3-1' })]);
  const weeks = { "A's": weekFor("A's", 2, 0, 'regular-season') };
  const withHist = plain(sandbox.processFeedSheet_(feedSheet(rows), 111, weeks, titleHist()));
  const legacy = plain(sandbox.processFeedSheet_(feedSheet(rows), 111, weeks));
  assert.strictEqual(withHist.sentiment, legacy.sentiment);
  near(withHist.sentiment, (1 - Math.exp(-2 / 3)) / 48);
  assert.deepStrictEqual(withHist.aftermath, { total: 0, byTeam: {} });
});
test('203d: eliminated in a postseason week → upset first (held), then the fade', () => {
  const rows = [row({ Cycle: 110, EventType: 'game-result', SeasonType: 'league-championship', 'Team Record': '7-5', Streak: 'L2' })];
  const hist = { weeks: { "A's": { 110: { w: 1, l: 3 } } }, lens: { "A's": { 110: 'league-championship' } }, fadeRate: 0.85 };
  const s = plain(sandbox.processFeedSheet_(feedSheet(rows), 110,
    { "A's": weekFor("A's", 1, 3, 'league-championship') })).sentiment;
  near(s, -0.1);
  const r1 = plain(sandbox.processFeedSheet_(feedSheet(rows), 111, {}, hist));
  const r2 = plain(sandbox.processFeedSheet_(feedSheet(rows), 112, {}, hist));
  assert.strictEqual(r1.aftermath.byTeam["A's"].kind, 'upset');
  near(r1.aftermath.total, -Math.abs(s));
  near(r2.aftermath.total, -Math.abs(s) * 0.85);
});
test('203d: a postseason run week (W >= L) that goes quiet is a season ended short of a title → upset', () => {
  assert.strictEqual(sandbox.sportsAftermathKind_({ w: 2, l: 1 }, 'playoffs'), 'upset');
  assert.strictEqual(sandbox.sportsAftermathKind_({ w: 0, l: 2 }, 'championship'), 'upset');
  assert.strictEqual(sandbox.sportsAftermathKind_({ w: 3, l: 1 }, ' Championship '), 'title');
  assert.strictEqual(sandbox.sportsAftermathKind_({ w: 1, l: 2 }, 'preseason'), 'upset', 'went quiet falling');
  assert.strictEqual(sandbox.sportsAftermathKind_({ w: 2, l: 1 }, 'late-season'), 'fade');
});
test('203d: the Oaks 0-2 preseason share is below the unchanged aftermath cutoff', () => {
  const rows = [row({ Cycle: 110, TeamsUsed: 'Oaks', EventType: 'game-result', SeasonType: 'preseason', 'Team Record': '0-5', Streak: 'L5' })];
  const hist = { weeks: { Oaks: { 110: { w: 0, l: 2 } } }, lens: { Oaks: { 110: 'preseason' } }, fadeRate: 0.85 };
  const r = plain(sandbox.processFeedSheet_(feedSheet(rows), 111, {}, hist));
  near(r.aftermath.byTeam.Oaks.lastShare, -0.5 * (1 - Math.exp(-2 / 3)) / 6 * 0.35 * 0.8 * 0.15);
  near(r.aftermath.total, 0); // unchanged 203d cutoff spends shares below 0.01
});
test('203d: the aftermath is spent below 0.01 — zero, not a residue', () => {
  near(sandbox.sportsAftermathShare_(0.1, 'title', 14, 0.85), 0.1 * Math.pow(0.85, 14));
  assert.strictEqual(sandbox.sportsAftermathShare_(0.1, 'title', 15, 0.85), 0);
  assert.strictEqual(sandbox.sportsAftermathShare_(0.004, 'upset', 1, 0.85), 0);
});
test('203d: unusable fade rate → no aftermath this Cycle (the quiet franchise contributes nothing)', () => {
  const r = plain(sandbox.processFeedSheet_(feedSheet(titleRows), 111, {}, titleHist(null)));
  assert.deepStrictEqual(r, { sentiment: 0, triggers: [], aftermath: { total: 0, byTeam: {} } });
});
test('203d: sportsFadeRate config — absent default, usable value, 0/1/text are Engine_Errors rows', () => {
  const errs = [];
  sandbox.logEngineError_ = (ctx, phase, err) => errs.push(phase + ': ' + err.message);
  try {
    assert.strictEqual(sandbox.sportsFadeRateConfig_({ config: {} }), 0.85);
    assert.strictEqual(sandbox.sportsFadeRateConfig_({ config: { sportsFadeRate: '0.9' } }), 0.9);
    for (const bad of [0, 1, 'fast', '', true]) assert.strictEqual(sandbox.sportsFadeRateConfig_({ config: { sportsFadeRate: bad } }), null);
    assert.strictEqual(errs.length, 5);
    assert(errs.every(e => e.indexOf('Phase2-SportsFeed: engine.203d') === 0), errs[0]);
  } finally { delete sandbox.logEngineError_; }
});
test('203d: applySportsFeedTriggers_ folds the aftermath into the boost, publishes it, attributes it', () => {
  const ripples = [];
  sandbox.recordRipple_ = (ctx, r) => ripples.push(r);
  try {
    const ctx = { summary: { cycle: 111, sportsWeek: {} }, config: {}, ss: { getSheetByName: () => feedSheet(titleRows) },
      _sportsWeekHistory: titleHist().weeks, _sportsLensHistory: titleHist().lens };
    sandbox.applySportsFeedTriggers_(ctx);
    near(ctx.summary.sportsSentimentBoost, share110() * 0.85);
    near(ctx.summary.sportsAftermath.total, ctx.summary.sportsSentimentBoost);
    assert.strictEqual(ripples.length, 1, 'no games term → only the aftermath row');
    assert.strictEqual(ripples[0].causeDetail, "aftermath: A's title week 1 after C110");
    // a fire sets S.cycleId only (S.cycle is never assigned) — the gate must read it
    const fire = { summary: { cycleId: 111, sportsWeek: {} }, config: {}, ss: { getSheetByName: () => feedSheet(titleRows) },
      _sportsWeekHistory: titleHist().weeks, _sportsLensHistory: titleHist().lens };
    sandbox.applySportsFeedTriggers_(fire);
    near(fire.summary.sportsSentimentBoost, share110() * 0.85);
    assert.strictEqual(fire.summary.sportsEventTriggers.length, 0, 'C110 rows do not speak at C111');
    // override / harness: no history on ctx → the pre-203d behaviour
    const bare = { summary: { cycle: 111, sportsWeek: {} }, config: {}, ss: { getSheetByName: () => feedSheet(titleRows) } };
    sandbox.applySportsFeedTriggers_(bare);
    assert.strictEqual(bare.summary.sportsSentimentBoost, 0);
  } finally { delete sandbox.recordRipple_; }
});
test('published S fields keep their shapes and atmosphere licence stays untouched', () => {
  const sheet = { getDataRange: () => ({ getValues: () => [headers, headers.map(h => complete[h] ?? '')] }) };
  const ctx = { summary: { cycle: 106, sportsAtmosphereEnabled: false }, ss: { getSheetByName: () => sheet } };
  sandbox.applySportsFeedTriggers_(ctx);
  assert.strictEqual(typeof ctx.summary.sportsSentimentBoost, 'number');
  assert(Array.isArray(ctx.summary.sportsEventTriggers));
  assert.strictEqual(ctx.summary.sportsNeighborhoodEffects, undefined, 'slice E: the hood-keyed effects block is gone');
  assert.strictEqual(ctx.summary.sportsAtmosphereEnabled, false);
});
// engine.204/205 slice E: the typed HomeNeighborhood never places a trigger. A home week
// places it at the franchise's venue; an away week (or no week object) places it nowhere.
const trigHoods = (week) => {
  const sheet = { getDataRange: () => ({ getValues: () => [headers, headers.map(h => complete[h] ?? '')] }) };
  const ctx = { summary: { cycle: 106, sportsWeek: week }, ss: { getSheetByName: () => sheet } };
  sandbox.applySportsFeedTriggers_(ctx);
  return ctx.summary.sportsEventTriggers.map(t => t.neighborhood);
};
test('slice E: home week → the venue; away week / no week → no hood; the typed hood is never read', () => {
  const home = trigHoods({ "A's": Object.assign(weekFor("A's", 2, 0, 'playoffs'), { h: 1, venue: ['Jack London', 'Downtown'] }) });
  const away = trigHoods({ "A's": Object.assign(weekFor("A's", 2, 0, 'playoffs'), { h: 0, venue: ['Jack London', 'Downtown'] }) });
  const none = trigHoods(undefined);
  assert(home.length > 0 && home.every(h => h === 'Jack London'), JSON.stringify(home));
  assert(away.length === home.length && away.every(h => h === ''), JSON.stringify(away));
  assert(none.every(h => h === '') && ![].concat(home, away, none).includes('SYNTHETIC-HOOD'));
});

// engine.247 — live C108 shape: Sheets stored 4-1 / 4-1 / 7-2 as DATE cells (m-d), 3-0 stayed text.
const sheetDate = (month, day) => new Date(2026, month - 1, day);
test('engine.247: date-coerced records are read as the W-L that was typed (live C108 rows 223-226)', () => {
  const actual = read([
    row({ EventType: 'game-result', SeasonType: 'playoffs', 'Team Record': '3-0', Streak: 'W5' }),
    row({ EventType: 'game-result', SeasonType: 'playoffs', 'Team Record': sheetDate(4, 1), Streak: 'W1' }),
    row({ EventType: 'player-feature', SeasonType: 'playoffs', 'Team Record': sheetDate(4, 1), Streak: 'W1' }),
    row({ EventType: 'season-state', SeasonType: 'playoffs', 'Team Record': sheetDate(7, 2), Streak: 'W1' })
  ], 106);
  assert.strictEqual(actual.records["A's"], '7-2');
});
test('engine.247: control — without the fix shape, a Date toString carries no W-L', () => {
  assert.strictEqual(sandbox.parseWinPercentage_(String(sheetDate(7, 2))), null);
  near(sandbox.parseWinPercentage_(sandbox.sportsRecordText_(sheetDate(7, 2))), 7 / 9);
});
test('engine.247: two-digit month/day, text passthrough, blank, invalid date', () => {
  assert.strictEqual(sandbox.sportsRecordText_(sheetDate(10, 3)), '10-3');
  assert.strictEqual(sandbox.sportsRecordText_(sheetDate(12, 31)), '12-31');
  assert.strictEqual(sandbox.sportsRecordText_('  127-35 '), '127-35');
  assert.strictEqual(sandbox.sportsRecordText_(''), '');
  assert.strictEqual(sandbox.sportsRecordText_(undefined), '');
  assert.strictEqual(sandbox.sportsRecordText_(new Date(NaN)), '');
});
test('engine.247: spreadsheet zone wins over the host clock when Utilities is present', () => {
  const calls = [];
  sandbox.Utilities = { formatDate: (d, tz, fmt) => { calls.push([tz, fmt]); return '4-1'; } };
  try {
    assert.strictEqual(sandbox.sportsRecordText_(sheetDate(4, 1), 'America/Chicago'), '4-1');
    assert.deepStrictEqual(calls, [['America/Chicago', 'M-d']]);
  } finally { delete sandbox.Utilities; }
});
test('engine.247: feed-entry reader hands the casino the typed record', () => {
  const H = ['Cycle', 'SeasonType', 'EventType', 'TeamsUsed', 'Team Record', 'Streak'];
  const ss = { getSpreadsheetTimeZone: () => 'America/Chicago', getSheetByName: () => ({
    getDataRange: () => ({ getValues: () => [H, [108, 'playoffs', 'game-result', "A's", sheetDate(4, 1), 'W1']] }) }) };
  const entries = plain(sandbox.readOaklandFeedEntries_({ ss, summary: {} }, 108));
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].teamRecord, '4-1');
});

// engine.194: synthetic, isolated fixtures. These assertions price the RESULT,
// not authored mood, and exercise the real feed reader -> week -> share path.
function replay(rows, cycle, weights) {
  const keys = [...headers, 'WeekRecord'];
  const sheet = { getDataRange: () => ({ getValues: () => [keys, ...rows.map(r => keys.map(k => r[k] ?? ''))] }) };
  const ctx = { summary: { cycleId: cycle, franchiseWeight: weights }, config: {},
    ss: { getSheetByName: () => sheet } };
  const entries = sandbox.readOaklandFeedEntries_(ctx, cycle);
  const weeks = sandbox.deriveSportsWeekFromFeed_(entries, ctx._sportsWeekHistory, cycle);
  sandbox.deriveSportsIntensity_(weeks, ctx._sportsWeekHistory, ctx._sportsLensHistory, {}, cycle, weights);
  ctx.summary.sportsWeek = weeks;
  sandbox.applySportsFeedTriggers_(ctx);
  return ctx;
}
const price = (f, w, l, lens, history, weights) => sandbox.feedTeamShare_({ seasonType: lens },
  weekFor(f, w, l, lens, history, 110, weights));
test('194: both clamps are reachable; ordinary dynasty results can disappoint', () => {
  near(price("A's", 2, 0, 'championship'), 0.1);
  near(price("A's", 0, 4, 'playoffs'), -0.1);
  near(price("A's", 2, 1, 'late-season'), -(1 - Math.exp(-1)) / 45);
  near(price("A's", 13, 4, 'late-season'), (1 - Math.exp(-17 / 3)) / 255);
  near(price("A's", 3, 1, 'regular-season'), 0);
});
test('194: the Oaks prior and reach keep preseason small, regular-season larger, both signs', () => {
  for (const [w, l, surprise] of [[0, 3, -0.8], [3, 1, 0.7]]) {
    const pre = 0.5 * (1 - Math.exp(-(w + l) / 3)) / 6 * 0.35 * surprise * 0.15;
    near(price('Oaks', w, l, 'preseason'), pre);
    near(price('Oaks', w, l, 'regular-season'), pre * 10 / 3);
  }
});
test('194: round reach increases the same result before the clamp', () => {
  const values = ['wild-card', 'division-series', 'league-championship', 'world-series']
    .map(lens => price("A's", 1, 0, lens));
  for (let i = 1; i < values.length; i++) assert(values[i] > values[i - 1]);
  near(values[0], (1 - Math.exp(-1 / 3)) * 5 / 48);
  near(values[3], (1 - Math.exp(-1 / 3)) / 4);
});
test('194: four regular weeks earn the postseason baseline; current/future cannot leak into it', () => {
  const history = { 101: { w: 4, l: 1 }, 102: { w: 4, l: 1 }, 103: { w: 4, l: 1 }, 104: { w: 4, l: 1 } };
  const wk = weekFor("A's", 3, 1, 'division-series', history);
  near(wk.expectation, 0.8);
  near(sandbox.feedTeamShare_({ seasonType: 'division-series' }, wk), -(1 - Math.exp(-4 / 3)) / 40);
  history[110] = { w: 0, l: 20 }; history[111] = { w: 0, l: 20 };
  near(weekFor("A's", 3, 1, 'division-series', history).expectation, 0.8);
});
test('194: record, mood, streak and media cannot overpower or reverse an accepted result', () => {
  const wk = weekFor("A's", 1, 2, 'division-series');
  const base = sandbox.feedTeamShare_({ seasonType: 'division-series' }, wk);
  assert(base < 0);
  for (const mediaProfile of ['local', 'regional', 'national']) {
    near(sandbox.feedTeamShare_({ seasonType: 'division-series', record: '127-35',
      streak: 'W20', fanSentiment: 'ecstatic', mediaProfile }, wk), base);
  }
});
test('194: none, blank and rejected cells pay zero; authored triggers still fire', () => {
  for (const [eventType, WeekRecord] of [['season-state', 'none'], ['game-result', ''],
    ['season-state', 'A:W'], ['game-result', 'bad-token']]) {
    const ctx = replay([row({ Cycle: 110, EventType: eventType, WeekRecord,
      SeasonType: 'championship', 'Team Record': '11-3', FanSentiment: 'high',
      MediaProfile: 'national', EventTrigger: 'breaking-news' })], 110);
    near(ctx.summary.sportsSentimentBoost, 0);
    assert.strictEqual(ctx.summary.sportsEventTriggers[0].trigger, 'breaking-news');
  }
});
test('194: real reader folds games, rejects wrong row type, preserves postseason result at summary', () => {
  const rows = [row({ Cycle: 110, EventType: 'game-result', SeasonType: 'playoffs', WeekRecord: 'H:W' }),
    row({ Cycle: 110, EventType: 'game-result', SeasonType: 'playoffs', WeekRecord: 'A:W' }),
    row({ Cycle: 110, EventType: 'season-state', SeasonType: 'championship', WeekRecord: 'A:L', 'Team Record': '11-3' }),
    row({ Cycle: 110, TeamsUsed: 'Oaks', EventType: 'game-result', SeasonType: 'preseason', WeekRecord: 'H:L A:L' })];
  const ctx = replay(rows, 110);
  assert.strictEqual(ctx.summary.sportsWeek["A's"].g, 2);
  near(ctx.summary.sportsSentimentBoost, 0.1 + price('Oaks', 0, 2, 'preseason'));
  const quiet = replay(rows, 111);
  near(quiet.summary.sportsAftermath.byTeam["A's"].lastShare, 0.1);
  near(quiet.summary.sportsSentimentBoost, 0.085);
});
test('194: aftermath reconstructs the historical expectation, round and carried weight', () => {
  const rows = [101, 102, 103, 104].map(Cycle => row({ Cycle, EventType: 'game-result',
    SeasonType: 'regular-season', WeekRecord: 'H:W H:W A:W A:L' }));
  rows.push(row({ Cycle: 110, EventType: 'game-result', SeasonType: 'division-series', WeekRecord: 'H:W' }));
  const weights = { "A's": 0.6 };
  const played = replay(rows, 110, weights);
  const quiet = replay(rows, 111, weights);
  near(quiet.summary.sportsAftermath.byTeam["A's"].lastShare, played.summary.sportsSentimentBoost);
  near(played.summary.sportsSentimentBoost, (1 - Math.exp(-1 / 3)) * 0.075);
  near(quiet.summary.sportsSentimentBoost, -played.summary.sportsSentimentBoost); // run ended -> upset
});
test('194: gnI uses repriced net games only, preserves cap and loss symmetry', () => {
  const src = fs.readFileSync(path.join(__dirname, '../phase05-citizens/generateCitizensEvents.js'), 'utf8');
  const block = src.match(/var gnI = [\s\S]*?var gnW = [^;]+;/);
  assert(block, 'actual game-night pricing block');
  const weight = (boost, aftermath) => {
    const box = { S: { sportsSentimentBoost: boost, sportsAftermath: { total: aftermath } } };
    vm.runInNewContext(block[0], box);
    return box;
  };
  near(weight(0.08, 0.03).gnI, 0.5);
  near(weight(0.08, 0.03).gnW, 2.75);
  near(weight(-0.05, 0).gnW, 2.75);
  near(weight(0.085, 0.085).gnW, 1.1);
  near(weight(0.1, 0).gnW, 4);
  near(weight(0.2, 0).gnI, 1);
});

// Optional local replay: snapshot JSONL only, never connects to Sheets. The old
// pricing body is pinned to 024f42d0 for comparison, not an engine fallback.
const replayArg = process.argv.indexOf('--replay-feed');
if (replayArg !== -1) {
  const input = process.argv[replayArg + 1];
  assert(input, '--replay-feed requires a local JSONL path');
  const rows = fs.readFileSync(input, 'utf8').trim().split('\n').map(JSON.parse);
  const oldPrice = state => {
    const pct = sandbox.parseWinPercentage_(state.record);
    const phase = sandbox.canonicalSportsPhase_(state.seasonType);
    const scale = phase === 'championship' ? 3 : phase === 'playoffs' || phase === 'post-season' ? 2 :
      phase === 'off-season' ? 0.3 : phase === 'preseason' || phase === 'spring-training' ? 0.5 : 1;
    const value = ((pct === null ? 0 : (pct - 0.5) * 0.06) +
      sandbox.parseStreakBonus_((state.streak || '').toUpperCase()) + sandbox.parseFanSentiment_(state.fanSentiment)) *
      scale * sandbox.parseMediaProfile_(state.mediaProfile);
    return Math.max(-0.1, Math.min(0.1, value));
  };
  const cols = { cycle: 0, teams: 1, seasonType: 3, record: 4, streak: 5, trigger: 6,
    playerMood: 8, fanSentiment: 9, mediaProfile: 13 };
  const data = [headers, ...rows.map(r => headers.map(h => r[h] ?? ''))];
  const emit = (label, f, wk, oldShare) => console.log(JSON.stringify({ label, team: f,
    record: wk.w + '-' + wk.l, lens: wk.lens, n: wk.n, expectation: wk.expectation,
    reach: wk.reach, weight: wk.weight, old: oldShare, raw: 0.5 * wk.signed * wk.reach,
    new: sandbox.feedTeamShare_({ seasonType: wk.lens }, wk) }));
  for (const cycle of [108, 109, 110]) {
    const ctx = replay(rows, cycle);
    const states = sandbox.reduceFeedTeamState_(data, cols, cycle, 'America/Chicago');
    for (const f of ["A's", 'Oaks']) emit('C' + cycle, f, ctx.summary.sportsWeek[f], oldPrice(states[f]));
  }
  for (const [f, w, l, lens] of [["A's", 2, 1, 'late-season'], ["A's", 13, 4, 'late-season'],
    ["A's", 0, 4, 'playoffs'], ["A's", 2, 0, 'world-series'], ["A's", 4, 1, 'world-series'],
    ['Oaks', 0, 3, 'preseason'], ['Oaks', 3, 1, 'preseason'],
    ['Oaks', 0, 3, 'regular-season'], ['Oaks', 3, 1, 'regular-season'],
    ["A's", 1, 0, 'wild-card'], ["A's", 1, 0, 'division-series'],
    ["A's", 1, 0, 'league-championship'], ["A's", 1, 0, 'world-series']]) {
    const wk = weekFor(f, w, l, lens);
    emit('SYNTHETIC', f, wk, oldPrice({ record: w + '-' + l, seasonType: lens }));
  }
}
console.log(`sportsFeedParser: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
