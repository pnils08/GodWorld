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

function syntheticParticipant(extra) {
  return Object.assign({
    popid: 'POP-90001',
    name: 'Synthetic Player',
    rosterSource: 'As_Roster',
    sourceRow: 12,
  }, extra || {});
}

function syntheticSubmission(action, changes, extra) {
  const rosterAction = ['injury', 'return', 'call-up', 'trade-away'].includes(action);
  const base = {
    draft: syntheticDraft({
      EventType: rosterAction ? 'roster-move' : 'stat-capture',
      'Team Record': '',
      Streak: '',
      Stats: rosterAction ? '' : 'Synthetic reviewed current-season stat line',
    }),
    submissionId: `synthetic-${action}-0001`,
    participant: syntheticParticipant(),
    mutation: {
      kind: rosterAction ? 'roster-event' : action === 'season-close' ? 'season-close' : 'stat-line',
      action,
      changes: (changes || []).map((change) => ({
        ...change,
        reviewed: change.before !== change.after,
      })),
      verification: {
        source: 'manual-verified',
        confirmed: true,
      },
    },
  };
  return Object.assign(base, extra || {});
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
assert.ok(contract.EVENT_TYPES.includes('stat-capture'));

const row = contract.projectNewRow(syntheticDraft({ TeamsUsed: 'oaks', EventType: 'editorial-note', 'Team Record': '' }));
assert.strictEqual(row.length, 20);
assert.strictEqual(row[3], 'Oaks');
assert.strictEqual(row.includes('NBA'), false);
assert.strictEqual(row.includes('Warriors'), false);
assert.strictEqual(row[8], '');
assert.strictEqual(row[9], '');

const feedOnly = contract.validateSportsSubmission(syntheticDraft());
assert.strictEqual(feedOnly.valid, true, feedOnly.errors.join('; '));
assert.strictEqual(feedOnly.mutation, null);

assert.strictEqual(contract.STAT_FIELD_MAPS.As_Roster['batting.so'].column, 'O');
assert.strictEqual(contract.STAT_FIELD_MAPS.As_Roster['pitching.so'].column, 'T');
assert.strictEqual(contract.STAT_FIELD_MAPS.As_Roster['pitching.bb'].column, 'U');
assert.strictEqual(contract.STAT_FIELD_MAPS.As_Roster['batting.so'].columnIndex, 14);
assert.strictEqual(contract.STAT_FIELD_MAPS.As_Roster['pitching.so'].columnIndex, 19);
assert.strictEqual(contract.STAT_FIELD_MAPS.As_Roster['pitching.bb'].columnIndex, 20);
assert.strictEqual(contract.STAT_FIELD_MAPS.As_Roster['batting.so'].label, 'Batting SO');
assert.strictEqual(contract.STAT_FIELD_MAPS.As_Roster['pitching.so'].label, 'Pitching SO');
assert.strictEqual(Object.hasOwn(contract.STAT_FIELD_MAPS.As_Roster, 'pitching.sv'), false);
assert.strictEqual(Object.hasOwn(contract.STAT_FIELD_MAPS.As_Roster, 'baseball.war'), false);

const asStats = contract.validateSportsSubmission(syntheticSubmission('stat-capture', [
  { field: 'batting.so', before: '20', after: '21' },
  { field: 'pitching.so', before: '32', after: '33' },
  { field: 'batting.avg', before: '.299', after: '.300' },
  { field: 'pitching.ip', before: '12.0', after: '12.1' },
  { field: 'pitching.wl', before: '2-1', after: '3-1' },
]));
assert.strictEqual(asStats.valid, true, asStats.errors.join('; '));

const oaksStats = contract.validateSportsSubmission(syntheticSubmission(
  'stat-capture',
  [
    { field: 'basketball.ppg', before: '19.8', after: '20.0' },
    { field: 'basketball.fgPct', before: '50.5%', after: '51.0%' },
    { field: 'basketball.threePct', before: '37.5', after: '38.0' },
  ],
  {
    draft: syntheticDraft({
      TeamsUsed: 'oaks',
      EventType: 'stat-capture',
      'Team Record': '',
      Streak: '',
      Stats: 'Synthetic reviewed current-season basketball line',
    }),
    participant: syntheticParticipant({
      popid: 'POP-90002',
      rosterSource: 'Oaks_Roster',
      sourceRow: 8,
    }),
  },
));
assert.strictEqual(oaksStats.valid, true, oaksStats.errors.join('; '));

const explicitZero = contract.validateSportsSubmission(syntheticSubmission('stat-capture', [
  { field: 'batting.hr', before: '', after: '0' },
]));
assert.strictEqual(explicitZero.valid, true, explicitZero.errors.join('; '));

const injury = contract.validateSportsSubmission(syntheticSubmission('injury', [
  { field: 'citizen.status', before: 'Active', after: 'injured' },
  { field: 'citizen.statusStartCycle', before: '', after: '404' },
  { field: 'citizen.healthCause', before: '', after: 'Synthetic verified condition' },
]));
assert.strictEqual(injury.valid, true, injury.errors.join('; '));
const injuryProjection = contract.projectRosterEventMutation(injury, {
  roster: {
    Tier: '1',
    Team: "A's",
    Position: 'CF',
  },
  citizen: {
    sourceRow: 22,
    Tier: '1',
    Status: 'Active',
    RoleType: "A's Player",
    StatusStartCycle: '',
    HealthCause: '',
    LifeHistory: 'C403 — [Synthetic] Prior non-canon event.',
    Neighborhood: 'Downtown',
  },
});
assert.strictEqual(
  injuryProjection.lifeHistory.line,
  'C404 — [SportsRoster] Synthetic Player entered injured status with cause: Synthetic verified condition.',
);
assert.deepStrictEqual(injuryProjection.lifeHistory.logRow, [
  'C404',
  'POP-90001',
  'Synthetic Player',
  'SportsRoster|source:sports|submission:synthetic-injury-0001|action:injury',
  'entered injured status with cause: Synthetic verified condition.',
  'Downtown',
  '404',
]);
assert.deepStrictEqual(injuryProjection.ripple.row, [
  '404',
  'sports',
  'synthetic-injury-0001',
  'Synthetic Player entered injured status with cause: Synthetic verified condition.',
  'roster-injury',
  'citizen',
  'POP-90001',
  'Downtown',
  '1',
  '1',
  '',
  'sportsFeedWriter.engine77',
  'C404',
]);
assert.strictEqual(injuryProjection.participant.citizenTier, '1');

const seriousCondition = contract.validateSportsSubmission(syntheticSubmission('injury', [
  { field: 'citizen.status', before: 'recovering', after: 'serious-condition' },
  { field: 'citizen.statusStartCycle', before: '403', after: '404' },
  { field: 'citizen.healthCause', before: 'Synthetic old cause', after: 'Synthetic verified condition' },
]));
assert.strictEqual(seriousCondition.valid, true, seriousCondition.errors.join('; '));

const playerReturn = contract.validateSportsSubmission(syntheticSubmission('return', [
  { field: 'citizen.status', before: 'INJURED', after: 'Active' },
  { field: 'citizen.statusStartCycle', before: '401', after: '' },
  { field: 'citizen.healthCause', before: 'Synthetic verified condition', after: '' },
]));
assert.strictEqual(playerReturn.valid, true, playerReturn.errors.join('; '));

const callUp = contract.validateSportsSubmission(syntheticSubmission('call-up', [
  { field: 'roster.team', before: 'Synthetic Affiliate', after: "A's" },
  { field: 'roster.position', before: 'SP', after: 'RP' },
  { field: 'citizen.status', before: 'active', after: 'Active' },
  { field: 'citizen.roleType', before: 'Synthetic Minor Leaguer', after: 'Synthetic Major Leaguer' },
]));
assert.strictEqual(callUp.valid, true, callUp.errors.join('; '));
const callUpProjection = contract.projectRosterEventMutation(callUp, {
  roster: {
    Tier: '2',
    Team: 'Synthetic Affiliate',
    Position: 'SP',
  },
  citizen: {
    sourceRow: 23,
    Tier: '2',
    Status: 'active',
    RoleType: 'Synthetic Minor Leaguer',
    StatusStartCycle: '',
    HealthCause: '',
    LifeHistory: '',
    Neighborhood: 'West Oakland',
  },
});
assert.strictEqual(
  callUpProjection.lifeHistory.eventText,
  "was called up from Synthetic Affiliate to A's, Position SP → RP, " +
    'RoleType Synthetic Minor Leaguer → Synthetic Major Leaguer.',
);
assert.strictEqual(callUpProjection.participant.citizenTier, '2');

const tradeAway = contract.validateSportsSubmission(syntheticSubmission('trade-away', [
  { field: 'roster.team', before: "A's", after: 'Synthetic Destination' },
  { field: 'roster.position', before: 'CF', after: 'RF' },
  { field: 'citizen.status', before: 'Active', after: 'Traded' },
  { field: 'citizen.roleType', before: "A's Player", after: 'Synthetic Destination Player' },
]));
assert.strictEqual(tradeAway.valid, true, tradeAway.errors.join('; '));
const tradeProjection = contract.projectRosterEventMutation(tradeAway, {
  roster: {
    Tier: '1',
    Team: "A's",
    Position: 'CF',
  },
  citizen: {
    sourceRow: 22,
    Tier: '1',
    Status: 'Active',
    RoleType: "A's Player",
    StatusStartCycle: '',
    HealthCause: '',
    LifeHistory: '',
    Neighborhood: 'Downtown',
  },
});
assert.match(tradeProjection.lifeHistory.eventText, /Position CF → RF/);
assert.match(tradeProjection.tradeWarning, /unarchived until engine\.90/);
assert.throws(
  () => contract.projectRosterEventMutation(injury, {
    roster: { Tier: '1', Team: "A's", Position: 'CF' },
    citizen: {
      sourceRow: 22,
      Tier: '1',
      Status: 'recovering',
      RoleType: "A's Player",
      StatusStartCycle: '',
      HealthCause: '',
      LifeHistory: '',
      Neighborhood: 'Downtown',
    },
  }),
  /citizen\.status no longer matches/,
);

const reservedSeasonClose = contract.validateSportsSubmission(syntheticSubmission(
  'season-close',
  [{ field: 'truesource.pending', before: '', after: 'synthetic' }],
));
assert.strictEqual(reservedSeasonClose.valid, false);
assert.ok(reservedSeasonClose.errors.some((error) => /dedicated TrueSource preview contract/.test(error)));
assert.strictEqual(contract.ACTION_MATRIX['season-close'].dedicatedContractPending, true);

function expectInvalid(submission, pattern) {
  const result = contract.validateSportsSubmission(submission);
  assert.strictEqual(result.valid, false, 'expected submission to be invalid');
  assert.ok(
    result.errors.some((error) => pattern.test(error)),
    `expected ${pattern}, received: ${result.errors.join('; ')}`,
  );
}

expectInvalid(syntheticSubmission('stat-capture', [
  { field: 'batting.unknown', before: '1', after: '2' },
]), /not allowed/);
expectInvalid(syntheticSubmission('stat-capture', [
  { field: 'constructor', before: '1', after: '2' },
]), /not allowed/);
expectInvalid(syntheticSubmission('stat-capture', [
  { field: '__proto__', before: '1', after: '2' },
]), /not allowed/);
expectInvalid(syntheticSubmission('stat-capture', [
  { field: 'batting.hr', before: '1', after: '' },
]), /must not erase a nonblank current value/);
expectInvalid(syntheticSubmission('stat-capture', [
  { field: 'batting.hr', after: '2' },
]), /before must be an explicit/);
expectInvalid(syntheticSubmission('stat-capture', [
  { field: 'batting.avg', before: '.300', after: '1.200' },
]), /decimal from 0 through 1/);
expectInvalid(syntheticSubmission('stat-capture', [
  { field: 'pitching.ip', before: '12.1', after: '12.3' },
]), /baseball innings/);
expectInvalid(syntheticSubmission('stat-capture', [
  { field: 'pitching.hr', before: '1', after: '2' },
]), /not allowed/);
expectInvalid(syntheticSubmission('stat-capture', [
  { field: 'batting.hr', before: '1', after: '1' },
]), /must change at least one/);
expectInvalid({
  ...syntheticSubmission('stat-capture', [
    { field: 'batting.hr', before: '1', after: '2' },
  ]),
  mutation: {
    ...syntheticSubmission('stat-capture', []).mutation,
    changes: [
      { field: 'batting.hr', before: '1', after: '2', reviewed: false },
    ],
  },
}, /must be reviewed before preview/);
expectInvalid({
  ...syntheticSubmission('stat-capture', [
    { field: 'batting.hr', before: '1', after: '2' },
  ]),
  participants: [
    syntheticParticipant(),
    syntheticParticipant({ popid: 'POP-90002' }),
  ],
}, /exactly one participant/);
expectInvalid({
  ...syntheticSubmission('stat-capture', [
    { field: 'batting.hr', before: '1', after: '2' },
  ]),
  participant: syntheticParticipant({ rosterSource: 'Warriors' }),
}, /rosterSource must be As_Roster or Oaks_Roster/);
expectInvalid({
  ...syntheticSubmission('stat-capture', [
    { field: 'batting.hr', before: '1', after: '2' },
  ]),
  draft: syntheticDraft({
    TeamsUsed: 'Warriors',
    EventType: 'stat-capture',
    'Team Record': '',
    Streak: '',
    Stats: 'Synthetic reviewed line',
  }),
}, /Unknown Oakland sports team/);
expectInvalid({
  ...syntheticSubmission('injury', [
    { field: 'citizen.status', before: 'Active', after: 'injured' },
    { field: 'citizen.statusStartCycle', before: '', after: '999' },
    { field: 'citizen.healthCause', before: '', after: 'Synthetic verified condition' },
  ]),
}, /must equal the draft Cycle/);
expectInvalid(syntheticSubmission('injury', [
  { field: 'citizen.status', before: 'Active', after: 'injured' },
  { field: 'citizen.statusStartCycle', before: '', after: '401' },
  {
    field: 'citizen.healthCause',
    before: '',
    after: 'Synthetic verified condition\n[Injected history line]',
  },
]), /after must be a single-line value/);
expectInvalid(syntheticSubmission('return', [
  { field: 'citizen.status', before: 'Active', after: 'Active' },
  { field: 'citizen.statusStartCycle', before: '401', after: '' },
  { field: 'citizen.healthCause', before: 'Synthetic verified condition', after: '' },
]), /return citizen.status.before/);
expectInvalid(syntheticSubmission('call-up', [
  { field: 'roster.team', before: 'Synthetic Affiliate', after: "A's" },
  { field: 'roster.position', before: 'SP', after: 'RP' },
  { field: 'citizen.status', before: 'active', after: 'Active' },
]), /must include citizen.roleType/);
expectInvalid({
  ...syntheticSubmission('trade-away', [
    { field: 'roster.team', before: "A's", after: 'Synthetic Destination' },
    { field: 'citizen.status', before: 'Active', after: 'Traded' },
    { field: 'citizen.roleType', before: "A's Player", after: 'Synthetic Destination Player' },
  ]),
  mutation: {
    ...syntheticSubmission('trade-away', []).mutation,
    changes: [
      { field: 'roster.team', before: "A's", after: 'Synthetic Destination' },
      { field: 'citizen.status', before: 'Active', after: 'Traded' },
      { field: 'citizen.roleType', before: "A's Player", after: 'Synthetic Destination Player' },
    ],
    verification: { source: 'manual-verified', confirmed: false },
  },
}, /confirmed must be true/);
const oversizedDraft = contract.validateDraft(syntheticDraft({
  Notes: 'x'.repeat(contract.MAX_DRAFT_FIELD_CHARACTERS + 1),
}));
assert.strictEqual(oversizedDraft.valid, false);
assert.ok(oversizedDraft.errors.some((error) => /50,000 characters or fewer/.test(error)));
console.log('sportsFeedContract.test.js: all assertions passed');
