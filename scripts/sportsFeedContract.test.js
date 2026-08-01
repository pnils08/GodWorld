'use strict';

const assert = require('assert');
const contract = require('./sportsFeedContract');

function syntheticDraft(extra) {
  return Object.assign({
    Cycle: '404', SeasonType: 'regular-season', EventType: 'game-result',
    TeamsUsed: 'as', NamesUsed: 'Synthetic Player', Notes: 'Synthetic non-canon fixture.',
    Stats: '', 'Team Record': '12-7', VideoGameDate: '', VideoGame: '', StoryAngle: '',
    PlayerMood: '', EventTrigger: '', HomeNeighborhood: '', Streak: 'W2',
    FanSentiment: 'confident', FranchiseStability: 'stable', EconomicFootprint: 'steady',
    CommunityInvestment: 'active', MediaProfile: 'local'
  }, extra || {});
}

assert.deepStrictEqual(contract.FEED_HEADERS, [
  'Cycle', 'SeasonType', 'EventType', 'TeamsUsed', 'NamesUsed', 'Notes', 'Stats', 'Team Record',
  'VideoGameDate', 'VideoGame', 'StoryAngle', 'PlayerMood', 'EventTrigger', 'HomeNeighborhood',
  'Streak', 'FanSentiment', 'FranchiseStability', 'EconomicFootprint', 'CommunityInvestment', 'MediaProfile'
]);
assert.strictEqual(contract.normalizeTeam("A's").id, 'as');
assert.strictEqual(contract.normalizeTeam('oaks').sheetValue, 'Oaks');
assert.strictEqual(contract.normalizeTeam('Warriors').id, 'oaks');
assert.strictEqual(contract.normalizeTeam('Warriors').legacy, true);
assert.throws(() => contract.normalizeTeam('NFL'), /Unknown Oakland sports team/);
assert.throws(() => contract.normalizeDraftTeam('Warriors'), /Unknown Oakland sports team/);
assert.throws(() => contract.normalizeDraftTeam("A's"), /Unknown Oakland sports team/);

const rows = [
  { Cycle: '404', TeamsUsed: "A's", Notes: 'Synthetic A fixture' },
  { Cycle: 404, TeamsUsed: 'Oaks', Notes: 'Synthetic Oaks fixture' },
  { Cycle: '404', TeamsUsed: 'Warriors', Notes: 'Synthetic legacy fixture' },
  { Cycle: '403', TeamsUsed: 'Oaks', Notes: 'Synthetic older fixture' },
  { Cycle: '404', TeamsUsed: 'NFL', Notes: 'Synthetic unknown fixture' }
];
const exactRows = contract.filterFeedRowsForCycle(rows, 404);
assert.strictEqual(exactRows.length, 4);
assert.throws(() => contract.filterFeedRowsForCycle(rows, 0), /positive integer/);
const splitRows = contract.splitOaklandFeedEntries(exactRows);
assert.strictEqual(splitRows.as.length, 1);
assert.strictEqual(splitRows.oaks.length, 2);
assert.ok(splitRows.warnings.some((warning) => warning.includes('legacy team alias Warriors')));
assert.ok(splitRows.warnings.some((warning) => warning.includes('Unknown Oakland sports team: NFL')));

const valid = contract.validateDraft(syntheticDraft());
assert.strictEqual(valid.valid, true, valid.errors.join('; '));
assert.strictEqual(valid.value.TeamsUsed, "A's");
assert.strictEqual(contract.validateDraft(syntheticDraft({ SeasonType: 'invented-season' })).valid, false);
assert.strictEqual(contract.validateDraft(syntheticDraft({ HomeNeighborhood: 'Synthetic District' })).valid, false);
assert.strictEqual(contract.validateDraft(syntheticDraft({ EventType: 'game-result', 'Team Record': '' })).valid, false);
assert.strictEqual(contract.validateDraft(syntheticDraft({ Cycle: '0' })).valid, false);
assert.strictEqual(contract.validateDraft(syntheticDraft({ VideoGame: 'legacy value' })).valid, false);

const row = contract.projectNewRow(syntheticDraft({ TeamsUsed: 'oaks', EventType: 'editorial-note', 'Team Record': '' }));
assert.strictEqual(row.length, 20);
assert.strictEqual(row[3], 'Oaks');
assert.strictEqual(row.includes('NBA'), false);
assert.strictEqual(row.includes('Warriors'), false);
assert.strictEqual(row[8], '');
assert.strictEqual(row[9], '');
console.log('sportsFeedContract.test.js: all assertions passed');
