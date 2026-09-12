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
  near(actual.result.sentiment, (127 / 162 - 0.5) * 0.06 * 2);
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
    near(actual.result.sentiment, 0.02);
  });
}
test('D4: actual zero wins remains informative and replaces a winning record', () => {
  const actual = read([row({ 'Team Record': '10-2' }), row({ 'Team Record': '0-3' })]);
  assert.strictEqual(actual.records["A's"], '0-3');
  near(actual.result.sentiment, -0.03);
});
test('D4: first played record replaces 0-0', () => {
  assert.strictEqual(read([row({ 'Team Record': '0-0' }), row({ 'Team Record': '1-0' })]).records["A's"], '1-0');
});
test('D4: informative record format follows the existing parser', () => {
  assert.strictEqual(read([row({ 'Team Record': '10-2' }), row({ 'Team Record': 'record: 12–3' })]).records["A's"], 'record: 12–3');
});

// Keep each modifier observable below the sentiment clamp when removed.
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
  test('D1: sentiment uses canonical SeasonType: ' + JSON.stringify(label), () => {
    const actual = read([row({ SeasonType: label, 'Team Record': '10-2' })]);
    near(actual.result.sentiment, 0.02 * factor);
  });
}
test('D1: unknown season cannot infer a championship through a substring', () => {
  assert.deepStrictEqual(read([row({ SeasonType: 'world invitational' })]).result.triggers, []);
});

test('D3 guard: prior-Cycle fields still carry when the team has a current row', () => {
  const old = Object.assign({}, complete, { Cycle: 105 });
  assert.deepStrictEqual(read([old, { Cycle: 106, TeamsUsed: "A's" }]).result, read([complete]).result);
});
test('D3 guard: team without a current row stays silent', () => {
  assert.deepStrictEqual(read([Object.assign({}, complete, { Cycle: 105 })]).result,
    { sentiment: 0, triggers: [], neighborhoodEffects: {} });
});
test('published S fields keep their shapes and atmosphere licence stays untouched', () => {
  const sheet = { getDataRange: () => ({ getValues: () => [headers, headers.map(h => complete[h] ?? '')] }) };
  const ctx = { summary: { cycle: 106, sportsAtmosphereEnabled: false }, ss: { getSheetByName: () => sheet } };
  sandbox.applySportsFeedTriggers_(ctx);
  assert.strictEqual(typeof ctx.summary.sportsSentimentBoost, 'number');
  assert(Array.isArray(ctx.summary.sportsEventTriggers));
  assert.deepStrictEqual(Object.keys(ctx.summary.sportsNeighborhoodEffects['SYNTHETIC-HOOD']).sort(),
    ['communityEngagement', 'nightlife', 'retail', 'traffic']);
  assert.strictEqual(ctx.summary.sportsAtmosphereEnabled, false);
});

console.log(`sportsFeedParser: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
