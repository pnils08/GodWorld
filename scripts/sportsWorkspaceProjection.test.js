'use strict';

const assert = require('assert');
const { projectSportsWorkspace } = require('./sportsWorkspaceProjection');

const AS_HEADERS = [
  'POPID', 'First', 'Middle', 'Last', 'Tier', 'Position', 'Team', 'Salary',
  'AB', 'AVG', 'H', 'HR', 'RBI', 'SB', 'SO', 'IP', 'ERA', 'W-L', 'SO', 'BB',
];
const OAKS_HEADERS = [
  'POPID', 'First', 'Middle', 'Last', 'Tier', 'Position', 'Team', 'Salary',
  'PPG', 'ASST', 'REB', 'STL', 'FG%', '3P%',
];

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
  asRoster: {
    headers: AS_HEADERS,
    rows: [{
      rowNumber: 12,
      values: [
        'POP-90001', 'Synthetic', '', 'Two-Way', '1', 'CF/SP', "A's", '$1',
        '100', '.300', '30', '5', '20', '4', '21',
        '12.1', '2.50', '2-1', '33', '7',
      ],
    }],
  },
  oaksRoster: {
    headers: OAKS_HEADERS,
    rows: [{
      rowNumber: 7,
      values: [
        'bad-id', 'Synthetic', '', 'Guard', '2', 'G', 'Oaks', '$1',
        '20.0', '7.0', '5.0', '2.0', '51.0%', '38.0%',
      ],
    }],
  },
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
assert.strictEqual(result.teams.as.roster[0].sourceRow, 12);
assert.strictEqual(result.teams.as.roster[0].statValues['batting.so'], '21');
assert.strictEqual(result.teams.as.roster[0].statValues['pitching.so'], '33');
assert.strictEqual(result.teams.as.roster[0].stats['Batting SO'], '21');
assert.strictEqual(result.teams.as.roster[0].stats['Pitching SO'], '33');
assert.strictEqual(result.teams.oaks.roster[0].validPopid, false);
assert.strictEqual(result.teams.oaks.roster[0].statValues['basketball.ppg'], '20.0');

const empty = projectSportsWorkspace({
  cycle: 499,
  feedRows,
  asRoster: { headers: AS_HEADERS, rows: [] },
  oaksRoster: { headers: OAKS_HEADERS, rows: [] },
});
assert.strictEqual(empty.events.length, 0);
assert.strictEqual(empty.teams.as.events.length, 0);
assert.strictEqual(empty.teams.as.state.FanSentiment.value, 'hostile');
const missing = projectSportsWorkspace({ cycle: 404, feedRows: [] });
assert.ok(missing.warnings.some((warning) => /A's roster is unavailable/.test(warning)));
assert.ok(missing.warnings.some((warning) => /Oaks roster is unavailable/.test(warning)));
assert.throws(() => projectSportsWorkspace({ cycle: 0 }), /positive integer/);
assert.throws(
  () => projectSportsWorkspace({
    cycle: 404,
    asRoster: [{ POPID: 'POP-90001', SO: '33' }],
    oaksRoster: { headers: OAKS_HEADERS, rows: [] },
  }),
  /object rows are not accepted/,
);
assert.throws(
  () => projectSportsWorkspace({
    cycle: 404,
    asRoster: {
      headers: AS_HEADERS.filter((_, index) => index !== 14),
      rows: [],
    },
    oaksRoster: { headers: OAKS_HEADERS, rows: [] },
  }),
  /header layout mismatch/,
);
assert.throws(
  () => projectSportsWorkspace({
    cycle: 404,
    asRoster: {
      headers: AS_HEADERS.map((header, index) => (
        index === 14 ? 'NOT-SO' : index === 18 ? 'SO' : header
      )),
      rows: [],
    },
    oaksRoster: { headers: OAKS_HEADERS, rows: [] },
  }),
  /physical column 15/,
);
assert.throws(
  () => projectSportsWorkspace({
    cycle: 404,
    asRoster: {
      headers: [...AS_HEADERS, 'SO'],
      rows: [],
    },
    oaksRoster: { headers: OAKS_HEADERS, rows: [] },
  }),
  /header layout mismatch/,
);
console.log('sportsWorkspaceProjection.test.js: all assertions passed');
