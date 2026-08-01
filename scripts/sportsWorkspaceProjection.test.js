'use strict';

const assert = require('assert');
const { projectSportsWorkspace } = require('./sportsWorkspaceProjection');

const feedRows = [
  { __rowNumber: 2, Cycle: '403', TeamsUsed: "A's", SeasonType: 'early-season', 'Team Record': '3-2', FanSentiment: 'neutral' },
  { __rowNumber: 3, Cycle: '404', TeamsUsed: "A's", EventType: 'game-result', NamesUsed: 'Synthetic Batter', 'Team Record': '4-2', Streak: 'W2' },
  { __rowNumber: 4, Cycle: '404', TeamsUsed: 'Warriors', EventType: 'season-state', FanSentiment: 'electric' },
  { __rowNumber: 5, Cycle: '404', TeamsUsed: 'Oaks', FanSentiment: 'confident' },
  { __rowNumber: 6, Cycle: 'not-a-cycle', TeamsUsed: "A's" },
  { __rowNumber: 7, Cycle: '405', TeamsUsed: "A's", FanSentiment: 'hostile' },
  { __rowNumber: 8, Cycle: '402', TeamsUsed: "A's", 'Team Record': '1-1' }
];
const result = projectSportsWorkspace({
  cycle: 404, feedRows,
  asRoster: [{ __rowNumber: 2, POPID: 'POP-90001', First: 'Synthetic', Last: 'Batter', Position: 'CF', AVG: '.300' }],
  oaksRoster: [{ __rowNumber: 2, POPID: 'bad-id', First: 'Synthetic', Last: 'Guard', Position: 'G', PPG: '20.0' }],
  freshness: { feedAgeSeconds: 0 }
});
assert.strictEqual(result.events.length, 3);
assert.strictEqual(result.teams.as.events.length, 1);
assert.strictEqual(result.teams.as.state.SeasonType.value, 'early-season');
assert.strictEqual(result.teams.as.state.SeasonType.sourceCycle, 403);
assert.strictEqual(result.teams.as.state['Team Record'].value, '4-2');
assert.strictEqual(result.teams.as.state['Team Record'].sourceRow, 3);
assert.strictEqual(result.teams.oaks.events.length, 2);
assert.strictEqual(result.teams.oaks.state.FanSentiment.value, 'confident');
assert.ok(result.warnings.some((warning) => /legacy team alias Warriors/.test(warning)));
assert.ok(result.warnings.some((warning) => /conflicts in Cycle 404/.test(warning)));
assert.ok(result.warnings.some((warning) => /malformed POPID/.test(warning)));
assert.ok(result.warnings.some((warning) => /invalid Cycle/.test(warning)));
assert.strictEqual(result.teams.as.roster[0].validPopid, true);
assert.strictEqual(result.teams.oaks.roster[0].validPopid, false);

const empty = projectSportsWorkspace({ cycle: 499, feedRows, asRoster: [], oaksRoster: [] });
assert.strictEqual(empty.events.length, 0);
assert.strictEqual(empty.teams.as.events.length, 0);
assert.strictEqual(empty.teams.as.state.FanSentiment.value, 'hostile');
const missing = projectSportsWorkspace({ cycle: 404, feedRows: [] });
assert.ok(missing.warnings.some((warning) => /A's roster is unavailable/.test(warning)));
assert.ok(missing.warnings.some((warning) => /Oaks roster is unavailable/.test(warning)));
assert.throws(() => projectSportsWorkspace({ cycle: 0 }), /positive integer/);
console.log('sportsWorkspaceProjection.test.js: all assertions passed');
