#!/usr/bin/env node
'use strict';
// engine.331: sports moments are this Cycle's rows and this Cycle's week. Synthetic, non-canon feed
// rows in an isolated VM; the real Phase 2 entry points (applySportsSeason_ → applySportsFeedTriggers_),
// no external services or persistence.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const logs = [], errs = [];
const s = {
  Logger: { log: m => logs.push(String(m)) },
  logEngineError_: (ctx, phase, err) => errs.push(phase + ': ' + err.message)
};
vm.createContext(s);
for (const file of ['utilities/sportsWeekRecord.js', 'utilities/setupSportsFeedValidation.js',
  'phase02-world-state/applySportsSeason.js']) {
  vm.runInContext(read(file), s, { filename: file });
}
const plain = value => JSON.parse(JSON.stringify(value));
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (err) { failed++; console.error('  FAIL ' + name + ': ' + err.message); }
}

const H = ['Cycle', 'SeasonType', 'EventType', 'TeamsUsed', 'NamesUsed', 'Team Record', 'Streak',
  'EventTrigger', 'PlayerMood', 'WeekRecord'];
const row = o => Object.assign({ SeasonType: 'regular-season', EventType: 'player-feature', TeamsUsed: "A's" }, o);
function fire(rows, cycle, config = {}) {
  logs.length = 0; errs.length = 0;
  const sheet = { getDataRange: () => ({ getValues: () => [H, ...rows.map(r => H.map(h => r[h] ?? ''))] }) };
  const ctx = { config, summary: { cycleId: cycle }, ss: { getSheetByName: n => n === 'Oakland_Sports_Feed' ? sheet : null } };
  s.applySportsSeason_(ctx);
  s.applySportsFeedTriggers_(ctx);
  return ctx.summary;
}
const words = S => plain(S.sportsEventTriggers.map(t => t.team + ':' + t.trigger));
const triggerLogs = () => logs.filter(m => /^readOaklandFeedEntries_: C\d+ EventTrigger/.test(m));

test('C114 shape: an earlier Cycle\'s typed moment and mood never re-fire on a blank week', () => {
  const S = fire([
    row({ Cycle: 113, EventType: 'rumor', SeasonType: 'off-season', EventTrigger: 'rivalry', PlayerMood: 'electric', Streak: 'W3' }),
    row({ Cycle: 114, EventType: 'season-state', SeasonType: 'off-season', WeekRecord: 'none' })
  ], 114);
  assert.deepStrictEqual(words(S), []);
});
test('every row says its own moment, un-deduped (storyHook dedupes per team per word)', () => {
  const S = fire([row({ Cycle: 120, EventTrigger: 'award' }), row({ Cycle: 120, EventTrigger: 'award' }),
    row({ Cycle: 120, EventTrigger: '' }), row({ Cycle: 120, TeamsUsed: 'Oaks', EventTrigger: 'signed' }),
    row({ Cycle: 120, TeamsUsed: 'Oaks', EventTrigger: 'trade-rumor' })], 120);
  assert.deepStrictEqual(words(S), ["A's:award", "A's:award", 'Oaks:signed', 'Oaks:trade-rumor']);
});
test('blank, dash and none are no moment and no log', () => {
  const S = fire([row({ Cycle: 120, EventTrigger: '' }), row({ Cycle: 120, EventTrigger: ' - ' }),
    row({ Cycle: 120, EventTrigger: 'None' })], 120);
  assert.deepStrictEqual(words(S), []);
  assert.deepStrictEqual(triggerLogs(), []);
});
test('a typed hot-streak on a W2 game row is no moment, one log line, and never reaches the entry', () => {
  const S = fire([row({ Cycle: 120, TeamsUsed: 'Oaks', EventType: 'game-result', WeekRecord: 'H:W', Streak: 'W2', EventTrigger: 'hot-streak' }),
    row({ Cycle: 120, TeamsUsed: 'Oaks', EventTrigger: 'Hot Streak' })], 120);
  assert.deepStrictEqual(words(S), []);
  assert.deepStrictEqual(plain(S.sportsFeedEntries.map(e => e.eventTrigger)), ['', '']);
  assert.strictEqual(triggerLogs().length, 1, triggerLogs().join(' | '));
  assert(/engine's call/.test(triggerLogs()[0]));
});
test('hot at the bar (5): the week\'s last game row on W5 is hot with this Cycle\'s streak; W4 is not', () => {
  const hot = fire([row({ Cycle: 120, TeamsUsed: 'Oaks', EventType: 'game-result', WeekRecord: 'H:W', Streak: 'W4' }),
    row({ Cycle: 120, TeamsUsed: 'Oaks', EventType: 'game-result', WeekRecord: 'A:W', Streak: 'W5' })], 120);
  assert.strictEqual(hot.sportsWeek.Oaks.hotCold, 'hot');
  assert.strictEqual(hot.sportsWeek.Oaks.streakHeadline, true, 'one decision: the business headline too');
  assert.deepStrictEqual(plain(hot.sportsEventTriggers.map(t => [t.trigger, t.streak])), [['hot-streak', 'W5']]);
  const four = fire([row({ Cycle: 120, TeamsUsed: 'Oaks', EventType: 'game-result', WeekRecord: 'H:W', Streak: 'W4' })], 120);
  assert.strictEqual(four.sportsWeek.Oaks.hotCold, '');
  assert.deepStrictEqual(words(four), []);
});
test('cold at the bar: L5 on a losing week is cold-streak; a Streak typed only on a feature row is no run', () => {
  const cold = fire([row({ Cycle: 120, TeamsUsed: 'Oaks', EventType: 'game-result', WeekRecord: 'H:L', Streak: 'L5' })], 120);
  assert.deepStrictEqual(words(cold), ['Oaks:cold-streak']);
  const feature = fire([row({ Cycle: 120, TeamsUsed: 'Oaks', EventType: 'game-result', WeekRecord: 'H:L', Streak: '' }),
    row({ Cycle: 120, TeamsUsed: 'Oaks', Streak: 'L9' })], 120);
  assert.deepStrictEqual(words(feature), []);
});
test('the World_Config bar moves hot/cold with the headline; an unusable dial makes none and one Engine_Error', () => {
  const rows = [row({ Cycle: 120, TeamsUsed: 'Oaks', EventType: 'game-result', WeekRecord: 'H:W', Streak: 'W3' })];
  assert.deepStrictEqual(words(fire(rows, 120, { sportsStreakHeadline: 3 })), ['Oaks:hot-streak']);
  const bad = fire([row({ Cycle: 120, TeamsUsed: 'Oaks', EventType: 'game-result', WeekRecord: 'H:W', Streak: 'W9' })], 120,
    { sportsStreakHeadline: 'five' });
  assert.deepStrictEqual(words(bad), []);
  assert.strictEqual(errs.length, 1, errs.join(' | '));
});
test('championship is the clinch game row, in any row order — not the final round, not a feature row', () => {
  const finals = fire([row({ Cycle: 120, EventType: 'game-result', SeasonType: 'world-series', WeekRecord: 'H:W', Streak: 'W1' }),
    row({ Cycle: 120, SeasonType: 'championship' })], 120);
  assert.deepStrictEqual(words(finals), [], 'world-series game + championship feature row: no title');
  const clinched = fire([row({ Cycle: 120, EventType: 'game-result', SeasonType: 'championship', WeekRecord: 'H:W', Streak: 'W1' }),
    row({ Cycle: 120, SeasonType: 'off-season' })], 120);
  assert.deepStrictEqual(words(clinched), ["A's:championship"]);
  const typed = fire([row({ Cycle: 120, EventType: 'game-result', SeasonType: 'championship', WeekRecord: 'H:W', Streak: 'W1', EventTrigger: 'championship' })], 120);
  assert.deepStrictEqual(words(typed), ["A's:championship"], 'a typed championship already said it');
});
test('aliases read the typed word as its moment; an unknown word on two rows logs once', () => {
  const S = fire([row({ Cycle: 120, EventTrigger: 'Awards' }), row({ Cycle: 120, EventTrigger: 'community outreach' }),
    row({ Cycle: 120, TeamsUsed: 'Oaks', EventTrigger: 'Spring Training' }), row({ Cycle: 120, EventTrigger: 'breaking-news' }),
    row({ Cycle: 120, EventTrigger: 'Breaking News' })], 120);
  assert.deepStrictEqual(words(S), ["A's:award", "A's:community-outreach", 'Oaks:camp-opens']);
  assert.strictEqual(triggerLogs().length, 1, triggerLogs().join(' | '));
  assert(/"breaking-news" is not a trigger word/.test(triggerLogs()[0]));
});
test('canonicalFeedTrigger_ is pure and complete', () => {
  const c = v => plain(s.canonicalFeedTrigger_(v));
  logs.length = 0;
  assert.deepStrictEqual(c('  Re-Signed '), { word: 're-signed', status: 'known', raw: 're-signed' });
  assert.deepStrictEqual(c('call-up'), { word: 'debut', status: 'alias', raw: 'call-up' });
  assert.deepStrictEqual(c('cold-streak').status, 'engine-only');
  assert.deepStrictEqual(c(null), { word: '', status: 'blank', raw: '' });
  assert.deepStrictEqual(c('playoffs'), { word: '', status: 'unknown', raw: 'playoffs' });
  assert.deepStrictEqual(logs, []);
});
test('Cycle 0 reads no current rows', () => {
  const S = fire([row({ Cycle: 0, EventTrigger: 'award' })], 0);
  assert.deepStrictEqual(plain(S.sportsFeedEntries), []);
  assert.deepStrictEqual(words(S), []);
});
test('only the A\'s and the Oaks carry a word: NFL and retired labels make no moment', () => {
  const S = fire([row({ Cycle: 120, TeamsUsed: 'NFL', EventTrigger: 'retirement' }),
    row({ Cycle: 120, TeamsUsed: 'NBA', EventTrigger: 'retirement' })], 120);
  assert.deepStrictEqual(words(S), []);
  assert(S.sportsFeedEntries.every(e => e.eventTrigger === ''), 'the gate sits on the shared field (engine.333 inherits it)');
});
test('a World_Config override declares a season, not moments', () => {
  const S = fire([row({ Cycle: 120, EventTrigger: 'award' }),
    row({ Cycle: 120, TeamsUsed: 'Oaks', EventType: 'game-result', WeekRecord: 'H:W', Streak: 'W7' })], 120,
    { sportsState_Oakland: 'playoffs' });
  assert.deepStrictEqual(words(S), []);
});
test('Q3: a mood makes no trigger', () => {
  const S = fire([row({ Cycle: 120, PlayerMood: 'frustrated' }), row({ Cycle: 120, TeamsUsed: 'Oaks', PlayerMood: 'electric' })], 120);
  assert.deepStrictEqual(words(S), []);
});
// engine.338 (builder 2026-11-08): `question` is the builder's word to a citizen — private until he answers
test('question: the word rides the entry past the team gate and makes no newsroom moment', () => {
  const S = fire([
    row({ Cycle: 120, TeamsUsed: '', EventType: 'player-feature', NamesUsed: 'Freddie Silecki', EventTrigger: 'question', Notes: 'Would you coach the youth league?' }),
    row({ Cycle: 120, TeamsUsed: "A's", EventType: 'press-conference', NamesUsed: 'Vinnie Keane', EventTrigger: 'Question', Notes: 'Hitting coach next spring?' }),
    row({ Cycle: 120, TeamsUsed: 'NFL', EventTrigger: 'retirement' })
  ], 120);
  assert.deepStrictEqual(plain(S.sportsFeedEntries.map(e => e.eventTrigger)), ['question', 'question', ''],
    'a question on no club and on a club both carry; the NFL retirement is still gated');
  assert.deepStrictEqual(words(S), [], 'no moment for the hook table from either question row');
  assert.deepStrictEqual(triggerLogs(), [], 'a question is a known word, not an off-list one');
});
test('a moment off a game week carries no streak — the C114 "A\'s on a W3" came from a carried one', () => {
  const S = fire([row({ Cycle: 120, SeasonType: 'off-season', Streak: 'W3', EventTrigger: 'retirement' })], 120);
  assert.deepStrictEqual(plain(S.sportsEventTriggers.map(t => [t.trigger, t.streak, t.neighborhood])), [['retirement', '', '']]);
});

console.log(`sportsFeedTriggers: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
