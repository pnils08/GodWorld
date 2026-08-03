import assert from 'assert';
import {
  SPORTS_CACHE_TTL_MS,
  SPORTS_REQUEST_BODY_LIMIT_BYTES,
  SPORTS_WRITE_CONFIRMATION,
  createSportsHandlers,
  createSportsSheetReader,
  sportsBodyLimitVerify,
} from './sportsRoutes.js';

function responseHarness() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function call(handler, {
  query = {},
  body = {},
  headers = {},
  secure = false,
  authActor = 'synthetic-builder',
} = {}) {
  const res = responseHarness();
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  await handler({
    query,
    body,
    headers: normalizedHeaders,
    secure,
    authActor,
    get(name) {
      return normalizedHeaders[String(name).toLowerCase()];
    },
  }, res);
  return res;
}

const AS_HEADERS = [
  'POPID', 'First', 'Middle', 'Last', 'Tier', 'Position', 'Team', 'Salary',
  'AB', 'AVG', 'H', 'HR', 'RBI', 'SB', 'SO', 'IP', 'ERA', 'W-L', 'SO', 'BB',
];
const FEED_HEADERS = [
  'Cycle', 'SeasonType', 'EventType', 'TeamsUsed', 'NamesUsed', 'Notes',
  'Stats', 'Team Record', 'VideoGameDate', 'VideoGame', 'StoryAngle',
  'PlayerMood', 'EventTrigger', 'HomeNeighborhood', 'Streak',
  'FanSentiment', 'FranchiseStability', 'EconomicFootprint',
  'CommunityInvestment', 'MediaProfile',
];
const OAKS_HEADERS = [
  'POPID', 'First', 'Middle', 'Last', 'Tier', 'Position', 'Team', 'Salary',
  'PPG', 'ASST', 'REB', 'STL', 'FG%', '3P%',
];
const CITIZEN_HEADERS = [
  'POPID',
  'First',
  'Last',
  'Tier',
  'RoleType',
  'Status',
  'LifeHistory',
  'Neighborhood',
  'StatusStartCycle',
  'HealthCause',
];
const LIFE_HISTORY_LOG_HEADERS = [
  'Timestamp',
  'POPID',
  'Name',
  'EventTag',
  'EventText',
  'Neighborhood',
  'Cycle',
];
const RIPPLE_LEDGER_HEADERS = [
  'Cycle',
  'CauseType',
  'CauseId',
  'CauseDetail',
  'EffectType',
  'TargetScope',
  'TargetIds',
  'Neighborhood',
  'Magnitude',
  'Duration',
  'RemainingStrength',
  'SourceEngine',
  'CycleStamp',
];

const syntheticSheets = {
  Oakland_Sports_Feed: {
    headers: FEED_HEADERS,
    rows: [
      {
        rowNumber: 2,
        values: FEED_HEADERS.map((header) => ({
          Cycle: '403',
          TeamsUsed: "A's",
          SeasonType: 'early-season',
          'Team Record': '3-2',
        })[header] || ''),
      },
      {
        rowNumber: 3,
        values: FEED_HEADERS.map((header) => ({
      Cycle: '404', TeamsUsed: "A's", SeasonType: 'regular-season',
      EventType: 'game-result', NamesUsed: 'Synthetic Batter',
      Notes: 'Synthetic non-canon result.', 'Team Record': '4-2', Streak: 'W2',
      HomeNeighborhood: 'Downtown',
        })[header] || ''),
      },
      {
        rowNumber: 4,
        values: FEED_HEADERS.map((header) => ({
      Cycle: '404', TeamsUsed: 'Warriors', SeasonType: 'regular-season',
      EventType: 'season-state', Notes: 'Synthetic legacy-alias state.',
      FanSentiment: 'electric',
        })[header] || ''),
      },
    ],
  },
  As_Roster: {
    headers: AS_HEADERS,
    rows: [{
      rowNumber: 11,
      values: [
        'POP-90001', 'Synthetic', '', 'Batter', '1', 'CF', "A's", '$1',
        '100', '.300', '30', '5', '20', '4', '21',
        '12.1', '2.50', '2-1', '33', '7',
      ],
    }],
  },
  Oaks_Roster: {
    headers: OAKS_HEADERS,
    rows: [{
      rowNumber: 8,
      values: [
        'POP-90002', 'Synthetic', '', 'Guard', '1', 'G', 'Oaks', '$1',
        '20.0', '7.0', '5.0', '2.0', '51.0%', '38.0%',
      ],
    }],
  },
  Simulation_Ledger: {
    headers: CITIZEN_HEADERS,
    rows: [
      {
        rowNumber: 22,
        values: [
          'POP-90001',
          'Synthetic',
          'Batter',
          '1',
          "A's Player",
          'Active',
          'C403 — [Synthetic] Prior non-canon event.',
          'Downtown',
          '',
          '',
        ],
      },
      {
        rowNumber: 23,
        values: [
          'POP-90002',
          'Synthetic',
          'Guard',
          '2',
          'Oaks Player',
          'Active',
          '',
          'West Oakland',
          '',
          '',
        ],
      },
    ],
  },
  LifeHistory_Log: {
    headers: LIFE_HISTORY_LOG_HEADERS,
    rows: [{
      rowNumber: 2,
      values: [
        'C403',
        'POP-99999',
        'Prior Synthetic',
        'Synthetic',
        'Prior non-canon event.',
        'Downtown',
        '403',
      ],
    }],
  },
  Ripple_Ledger: {
    headers: RIPPLE_LEDGER_HEADERS,
    rows: [{
      rowNumber: 2,
      values: [
        '403',
        'synthetic',
        'prior-synthetic',
        'Prior non-canon ripple.',
        'synthetic-effect',
        'citizen',
        'POP-99999',
        'Downtown',
        '1',
        '1',
        '',
        'synthetic.test',
        'C403',
      ],
    }],
  },
};

const reads = [];
const readSheet = async (sheetName) => {
  reads.push(sheetName);
  if (!Object.prototype.hasOwnProperty.call(syntheticSheets, sheetName)) {
    throw new Error('synthetic sheet missing');
  }
  return {
    data: syntheticSheets[sheetName],
    fetchedAt: '2042-01-01T00:00:00.000Z',
    cacheAgeMs: 0,
    cacheHit: false,
    stale: false,
    warnings: [],
  };
};

const handlers = createSportsHandlers({
  readSheet,
  readNotebook: () => ({
    items: [{
      cycle: 404,
      generatedAt: '2042-01-01T00:00:00.000Z',
      answer: 'SYNTHETIC NON-CANON daily brief.',
      citationCount: 2,
      canonStatus: 'NOT_CANON',
    }],
    warnings: [],
  }),
});

const overview = await call(handlers.overview, { query: { cycle: '404' } });
assert.strictEqual(overview.statusCode, 200);
assert.strictEqual(overview.body.contractVersion, 1);
assert.strictEqual(overview.body.data.cycle, 404);
assert.deepStrictEqual(overview.body.data.availableCycles, [404, 403]);
assert.strictEqual(overview.body.data.events.length, 2);
assert.strictEqual(overview.body.data.teams.as.label, "The A's");
assert.strictEqual(overview.body.data.teams.oaks.label, 'The Oaks');
assert.strictEqual(overview.body.data.teams.as.rosterCount, 1);
assert.ok(overview.body.warnings.some((warning) => /legacy team alias Warriors/.test(warning)));

const defaultCycle = await call(handlers.overview);
assert.strictEqual(defaultCycle.statusCode, 200);
assert.strictEqual(defaultCycle.body.data.cycle, 404);

const emptyCycle = await call(handlers.overview, { query: { cycle: '405' } });
assert.strictEqual(emptyCycle.statusCode, 200);
assert.strictEqual(emptyCycle.body.data.events.length, 0);
assert.strictEqual(emptyCycle.body.data.teams.as.state['Team Record'].sourceCycle, 404);

const workspace = await call(handlers.workspace, { query: { cycle: '404', team: 'oaks' } });
assert.strictEqual(workspace.statusCode, 200);
assert.strictEqual(workspace.body.data.team.roster[0].popid, 'POP-90002');
assert.strictEqual(workspace.body.data.team.roster[0].stats.PPG, '20.0');
assert.strictEqual(
  workspace.body.data.team.roster[0].statValues['basketball.threePct'],
  '38.0%',
);
assert.ok(workspace.body.data.validEventOptions.eventTypes.includes('game-result'));
assert.strictEqual(workspace.body.data.writePolicy.featureEnabled, false);
assert.strictEqual(workspace.body.data.writePolicy.reasonCode, 'sports_write_disabled');
assert.strictEqual(workspace.body.data.validMutationOptions.statFields.length, 6);
assert.strictEqual(workspace.body.data.team.roster[0].citizen.tier, '2');
assert.deepStrictEqual(
  workspace.body.data.validMutationOptions.rosterActions,
  ['injury', 'return', 'call-up', 'trade-away'],
);
assert.deepStrictEqual(
  workspace.body.data.validMutationOptions.verificationSources,
  ['manual-verified', 'screenshot-verified'],
);

const asWorkspace = await call(handlers.workspace, { query: { cycle: '404', team: 'as' } });
assert.strictEqual(asWorkspace.statusCode, 200);
assert.strictEqual(asWorkspace.body.data.team.roster[0].sourceRow, 11);
assert.strictEqual(asWorkspace.body.data.team.roster[0].statValues['batting.so'], '21');
assert.strictEqual(asWorkspace.body.data.team.roster[0].statValues['pitching.so'], '33');
assert.strictEqual(asWorkspace.body.data.team.roster[0].citizen.tier, '1');
assert.strictEqual(asWorkspace.body.data.validMutationOptions.statFields.length, 12);
assert.deepStrictEqual(
  asWorkspace.body.data.validMutationOptions.statFields
    .filter((field) => field.key.endsWith('.so'))
    .map((field) => [field.label, field.column]),
  [['Batting SO', 'O'], ['Pitching SO', 'S']],
);

const invalidTeam = await call(handlers.workspace, { query: { cycle: '404', team: 'Warriors' } });
assert.strictEqual(invalidTeam.statusCode, 400);
assert.strictEqual(invalidTeam.body.error.code, 'invalid_team');

const invalidCycle = await call(handlers.overview, { query: { cycle: 'not-a-cycle' } });
assert.strictEqual(invalidCycle.statusCode, 400);
assert.strictEqual(invalidCycle.body.error.code, 'invalid_query');

const notebook = await call(handlers.notebook, { query: { limit: '3' } });
assert.strictEqual(notebook.statusCode, 200);
assert.strictEqual(notebook.body.data.items[0].canonStatus, 'NOT_CANON');

const invalidNotebookLimit = await call(handlers.notebook, { query: { limit: '8' } });
assert.strictEqual(invalidNotebookLimit.statusCode, 400);
assert.strictEqual(invalidNotebookLimit.body.error.code, 'invalid_query');

const validDraft = {
  Cycle: '404',
  SeasonType: 'regular-season',
  EventType: 'game-result',
  TeamsUsed: 'as',
  NamesUsed: 'Synthetic Batter',
  Notes: 'Synthetic non-canon preview.',
  Stats: 'SYNTHETIC',
  'Team Record': '4-2',
  VideoGameDate: '',
  VideoGame: '',
  StoryAngle: 'Synthetic angle',
  PlayerMood: 'confident',
  EventTrigger: '',
  HomeNeighborhood: 'Downtown',
  Streak: 'W2',
  FanSentiment: 'confident',
  FranchiseStability: 'stable',
  EconomicFootprint: 'steady',
  CommunityInvestment: 'active',
  MediaProfile: 'local',
};

const preview = await call(handlers.preview, {
  body: {
    draft: validDraft,
    provenance: {
      cycle: 404,
      generatedAt: '2042-01-01T00:00:00.000Z',
      canonStatus: 'NOT_CANON',
      answer: 'must-not-copy',
    },
  },
});
assert.strictEqual(preview.statusCode, 200);
assert.strictEqual(preview.body.data.writePerformed, false);
assert.strictEqual(preview.body.data.row.length, 20);
assert.strictEqual(preview.body.data.rowByHeader.TeamsUsed, "A's");
assert.strictEqual(preview.body.data.resolvedNames[0].popid, 'POP-90001');
assert.strictEqual(preview.body.data.provenance.answer, undefined);
assert.strictEqual(
  preview.body.data.ripplePreview.unavailableSiblings[0].id,
  'season-close',
);
assert.strictEqual(preview.body.data.confirmation.available, false);
assert.strictEqual(preview.body.data.confirmation.reasonCode, 'sports_write_disabled');

const oversizedPreview = await call(handlers.preview, {
  body: {
    ...validDraft,
    Notes: 'x'.repeat(SPORTS_REQUEST_BODY_LIMIT_BYTES),
  },
});
assert.strictEqual(oversizedPreview.statusCode, 413);
assert.strictEqual(oversizedPreview.body.error.code, 'sports_body_too_large');
assert.doesNotThrow(() => sportsBodyLimitVerify(
  { originalUrl: '/api/sports/preview' },
  null,
  Buffer.alloc(SPORTS_REQUEST_BODY_LIMIT_BYTES),
));
assert.throws(
  () => sportsBodyLimitVerify(
    { originalUrl: '/api/sports/entries' },
    null,
    Buffer.alloc(SPORTS_REQUEST_BODY_LIMIT_BYTES + 1),
  ),
  (error) => error.code === 'sports_body_too_large' && error.status === 413,
);

const badFeedHeaderHandlers = createSportsHandlers({
  readSheet: async (sheetName) => {
    const snapshot = await readSheet(sheetName);
    if (sheetName !== 'Oakland_Sports_Feed') return snapshot;
    const headers = snapshot.data.headers.slice();
    [headers[0], headers[1]] = [headers[1], headers[0]];
    return { ...snapshot, data: { ...snapshot.data, headers } };
  },
});
const badFeedHeader = await call(badFeedHeaderHandlers.overview);
assert.strictEqual(badFeedHeader.statusCode, 503);
assert.strictEqual(badFeedHeader.body.error.code, 'sports_source_schema_changed');

function statSubmission({
  team = 'as',
  popid = 'POP-90001',
  name = 'Synthetic Batter',
  rosterSource = 'As_Roster',
  sourceRow = 11,
  changes,
  verificationSource = 'manual-verified',
} = {}) {
  return {
    draft: {
      ...validDraft,
      EventType: 'stat-capture',
      TeamsUsed: team,
      NamesUsed: name,
      Stats: 'Synthetic reviewed current-season stat line',
      'Team Record': '',
      Streak: '',
    },
    submissionId: `synthetic-stat-${team}-0001`,
    participant: { popid, name, rosterSource, sourceRow },
    mutation: {
      kind: 'stat-line',
      action: 'stat-capture',
      changes,
      verification: {
        source: verificationSource,
        confirmed: true,
      },
    },
  };
}

function rosterEventSubmission(action, changes, {
  team = 'as',
  popid = 'POP-90001',
  name = 'Synthetic Batter',
  rosterSource = 'As_Roster',
  sourceRow = 11,
} = {}) {
  return {
    draft: {
      ...validDraft,
      EventType: 'roster-move',
      TeamsUsed: team,
      NamesUsed: name,
      Stats: '',
      'Team Record': '',
      Streak: '',
    },
    submissionId: `synthetic-${action}-0001`,
    participant: { popid, name, rosterSource, sourceRow },
    mutation: {
      kind: 'roster-event',
      action,
      changes: changes.map((change) => ({ ...change, reviewed: true })),
      verification: {
        source: 'manual-verified',
        confirmed: true,
      },
    },
  };
}

const asStatPreview = await call(handlers.preview, {
  body: statSubmission({
    changes: [
      { field: 'batting.so', before: '21', after: '22', reviewed: true },
      { field: 'pitching.so', before: '33', after: '34', reviewed: true },
      { field: 'batting.avg', before: '.300', after: '.300', reviewed: false },
    ],
    verificationSource: 'screenshot-verified',
  }),
});
assert.strictEqual(asStatPreview.statusCode, 200);
assert.strictEqual(asStatPreview.body.data.writePerformed, false);
assert.strictEqual(asStatPreview.body.data.mutationPreview.statDiff.changedCount, 2);
assert.strictEqual(asStatPreview.body.data.mutationPreview.statDiff.unchangedCount, 1);
assert.deepStrictEqual(
  asStatPreview.body.data.mutationPreview.statDiff.fields
    .filter((field) => field.field.endsWith('.so'))
    .map((field) => [field.field, field.column, field.before, field.after]),
  [
    ['batting.so', 'O', '21', '22'],
    ['pitching.so', 'S', '33', '34'],
  ],
);
assert.strictEqual(asStatPreview.body.data.confirmation.available, false);
assert.strictEqual(
  asStatPreview.body.data.confirmation.reasonCode,
  'sports_write_disabled',
);

const oaksStatPreview = await call(handlers.preview, {
  body: statSubmission({
    team: 'oaks',
    popid: 'POP-90002',
    name: 'Synthetic Guard',
    rosterSource: 'Oaks_Roster',
    sourceRow: 8,
    changes: [
      { field: 'basketball.ppg', before: '20.0', after: '20.5', reviewed: true },
      { field: 'basketball.fgPct', before: '51.0%', after: '51.5%', reviewed: true },
    ],
  }),
});
assert.strictEqual(oaksStatPreview.statusCode, 200);
assert.strictEqual(oaksStatPreview.body.data.mutationPreview.statDiff.changedCount, 2);
assert.strictEqual(
  oaksStatPreview.body.data.mutationPreview.participant.rosterSource,
  'Oaks_Roster',
);

const middleNameReadSheet = async (sheetName) => {
  const snapshot = await readSheet(sheetName);
  if (sheetName !== 'As_Roster') return snapshot;
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      rows: snapshot.data.rows.map((row) => ({
        ...row,
        values: row.values.map((value, index) => (
          index === 2 ? 'Middle' : value
        )),
      })),
    },
  };
};
const middleNameHandlers = createSportsHandlers({ readSheet: middleNameReadSheet });
const middleNamePreview = await call(middleNameHandlers.preview, {
  body: statSubmission({
    name: 'Synthetic Middle Batter',
    changes: [
      { field: 'batting.hr', before: '5', after: '6', reviewed: true },
    ],
  }),
});
assert.strictEqual(middleNamePreview.statusCode, 200);
assert.strictEqual(
  middleNamePreview.body.data.mutationPreview.participant.name,
  'Synthetic Middle Batter',
);

const invalidStatPreview = await call(handlers.preview, {
  body: statSubmission({
    changes: [
      { field: 'pitching.ip', before: '12.1', after: '12.3', reviewed: true },
    ],
  }),
});
assert.strictEqual(invalidStatPreview.statusCode, 422);
assert.strictEqual(invalidStatPreview.body.error.code, 'sports_validation_failed');

const noopStatPreview = await call(handlers.preview, {
  body: statSubmission({
    changes: [
      { field: 'batting.hr', before: '5', after: '5', reviewed: false },
    ],
  }),
});
assert.strictEqual(noopStatPreview.statusCode, 422);
assert.strictEqual(noopStatPreview.body.error.code, 'sports_validation_failed');

const staleStatPreview = await call(handlers.preview, {
  body: statSubmission({
    changes: [
      { field: 'batting.hr', before: '4', after: '6', reviewed: true },
    ],
  }),
});
assert.strictEqual(staleStatPreview.statusCode, 409);
assert.strictEqual(staleStatPreview.body.error.code, 'sports_source_changed');

const inactiveStatHandlers = createSportsHandlers({
  readSheet: async (sheetName) => {
    const snapshot = await readSheet(sheetName);
    if (sheetName !== 'Simulation_Ledger') return snapshot;
    return {
      ...snapshot,
      data: {
        ...snapshot.data,
        rows: snapshot.data.rows.map((row) => (
          row.rowNumber === 22
            ? {
              ...row,
              values: row.values.map((value, index) => (
                index === 5 ? 'Traded' : value
              )),
            }
            : row
        )),
      },
    };
  },
});
const inactiveStatPreview = await call(inactiveStatHandlers.preview, {
  body: statSubmission({
    changes: [
      { field: 'batting.hr', before: '5', after: '6', reviewed: true },
    ],
  }),
});
assert.strictEqual(inactiveStatPreview.statusCode, 422);
assert.strictEqual(
  inactiveStatPreview.body.error.code,
  'sports_participant_state_invalid',
);

const injurySubmission = rosterEventSubmission('injury', [
  { field: 'citizen.status', before: 'Active', after: 'injured' },
  { field: 'citizen.statusStartCycle', before: '', after: '404' },
  {
    field: 'citizen.healthCause',
    before: '',
    after: 'Synthetic verified condition',
  },
]);
const injuryPreview = await call(handlers.preview, {
  body: injurySubmission,
});
assert.strictEqual(injuryPreview.statusCode, 200);
assert.strictEqual(injuryPreview.body.data.mutationPreview.action, 'injury');
assert.strictEqual(
  injuryPreview.body.data.mutationPreview.participant.citizenTier,
  '1',
);
assert.strictEqual(
  injuryPreview.body.data.mutationPreview.stateDiff.changedCount,
  3,
);
assert.strictEqual(
  injuryPreview.body.data.mutationPreview.lifeHistory.line,
  'C404 — [SportsRoster] Synthetic Batter entered injured status with cause: ' +
    'Synthetic verified condition.',
);
assert.strictEqual(
  injuryPreview.body.data.mutationPreview.ripple.effectType,
  'roster-injury',
);
assert.deepStrictEqual(
  injuryPreview.body.data.ripplePreview.mutationEffects.map((item) => item.id),
  ['engine.77-state', 'engine.77-life', 'engine.77-ripple'],
);
assert.ok(injuryPreview.body.source.sheets.LifeHistory_Log);
assert.ok(injuryPreview.body.source.sheets.Ripple_Ledger);

const returnReadSheet = async (sheetName) => {
  const snapshot = await readSheet(sheetName);
  if (sheetName !== 'Simulation_Ledger') return snapshot;
  return {
    ...snapshot,
    data: {
      ...snapshot.data,
      rows: snapshot.data.rows.map((row) => (
        row.rowNumber === 22
          ? {
            ...row,
            values: row.values.map((value, index) => {
              if (index === 5) return 'serious-condition';
              if (index === 8) return '401';
              if (index === 9) return 'Synthetic verified condition';
              return value;
            }),
          }
          : row
      )),
    },
  };
};
const returnHandlers = createSportsHandlers({
  readSheet: returnReadSheet,
});
const returnPreview = await call(returnHandlers.preview, {
  body: rosterEventSubmission('return', [
    { field: 'citizen.status', before: 'serious-condition', after: 'Active' },
    { field: 'citizen.statusStartCycle', before: '401', after: '' },
    {
      field: 'citizen.healthCause',
      before: 'Synthetic verified condition',
      after: '',
    },
  ]),
});
assert.strictEqual(returnPreview.statusCode, 200);
assert.strictEqual(
  returnPreview.body.data.mutationPreview.lifeHistory.eventText,
  'returned to Active status.',
);
assert.strictEqual(
  returnPreview.body.data.mutationPreview.ripple.effectType,
  'roster-return',
);

const callUpReadSheet = async (sheetName) => {
  const snapshot = await readSheet(sheetName);
  if (sheetName === 'As_Roster') {
    return {
      ...snapshot,
      data: {
        ...snapshot.data,
        rows: snapshot.data.rows.map((row) => ({
          ...row,
          values: row.values.map((value, index) => {
            if (index === 5) return 'SP';
            if (index === 6) return 'Synthetic Affiliate';
            return value;
          }),
        })),
      },
    };
  }
  if (sheetName === 'Simulation_Ledger') {
    return {
      ...snapshot,
      data: {
        ...snapshot.data,
        rows: snapshot.data.rows.map((row) => (
          row.rowNumber === 22
            ? {
              ...row,
              values: row.values.map((value, index) => {
                if (index === 4) return 'Synthetic Minor Leaguer';
                if (index === 5) return 'active';
                return value;
              }),
            }
            : row
        )),
      },
    };
  }
  return snapshot;
};
const callUpHandlers = createSportsHandlers({
  readSheet: callUpReadSheet,
});
const callUpPreview = await call(callUpHandlers.preview, {
  body: rosterEventSubmission('call-up', [
    { field: 'roster.team', before: 'Synthetic Affiliate', after: "A's" },
    { field: 'roster.position', before: 'SP', after: 'RP' },
    { field: 'citizen.status', before: 'active', after: 'Active' },
    {
      field: 'citizen.roleType',
      before: 'Synthetic Minor Leaguer',
      after: 'Synthetic Major Leaguer',
    },
  ]),
});
assert.strictEqual(callUpPreview.statusCode, 200);
assert.strictEqual(
  callUpPreview.body.data.mutationPreview.participant.citizenTier,
  '1',
);
assert.match(
  callUpPreview.body.data.mutationPreview.lifeHistory.eventText,
  /Position SP → RP/,
);
assert.strictEqual(
  callUpPreview.body.data.mutationPreview.ripple.effectType,
  'roster-call-up',
);

const tradePreview = await call(handlers.preview, {
  body: rosterEventSubmission('trade-away', [
    { field: 'roster.team', before: "A's", after: 'Synthetic Destination' },
    { field: 'roster.position', before: 'CF', after: 'RF' },
    { field: 'citizen.status', before: 'Active', after: 'Traded' },
    {
      field: 'citizen.roleType',
      before: "A's Player",
      after: 'Synthetic Destination Player',
    },
  ]),
});
assert.strictEqual(tradePreview.statusCode, 200);
assert.match(
  tradePreview.body.data.mutationPreview.tradeWarning,
  /unarchived until engine\.90/,
);
assert.strictEqual(
  tradePreview.body.data.mutationPreview.ripple.effectType,
  'roster-trade-away',
);

const forbiddenAction = await call(handlers.preview, {
  body: {
    ...injurySubmission,
    mutation: {
      ...injurySubmission.mutation,
      action: 'signing',
    },
  },
});
assert.strictEqual(forbiddenAction.statusCode, 422);
assert.strictEqual(forbiddenAction.body.error.code, 'sports_validation_failed');

const unresolved = await call(handlers.preview, {
  body: {
    Cycle: 404,
    SeasonType: 'regular-season',
    EventType: 'player-feature',
    TeamsUsed: 'oaks',
    NamesUsed: 'Unknown Synthetic Person',
    VideoGameDate: '',
    VideoGame: '',
  },
});
assert.strictEqual(unresolved.statusCode, 422);
assert.strictEqual(unresolved.body.error.code, 'sports_name_resolution_failed');

let now = 1_000_000;
let loaderCalls = 0;
let failRefresh = false;
const cachedReader = createSportsSheetReader(async () => {
  loaderCalls += 1;
  if (failRefresh) throw new Error('synthetic failure');
  return [{ Cycle: '404', TeamsUsed: "A's" }];
}, { now: () => now });
const first = await cachedReader('Oakland_Sports_Feed');
assert.strictEqual(first.cacheHit, false);
now += SPORTS_CACHE_TTL_MS - 1;
const cached = await cachedReader('Oakland_Sports_Feed');
assert.strictEqual(cached.cacheHit, true);
assert.strictEqual(loaderCalls, 1);
now += 2;
failRefresh = true;
const stale = await cachedReader('Oakland_Sports_Feed');
assert.strictEqual(stale.stale, true);
assert.strictEqual(stale.warnings[0].code, 'sheet_refresh_failed');

const rawReader = createSportsSheetReader(async () => ({
  headers: AS_HEADERS,
  rows: [{
    rowNumber: 44,
    values: syntheticSheets.As_Roster.rows[0].values,
  }],
}));
const raw = await rawReader('As_Roster');
assert.deepStrictEqual(raw.data.headers, AS_HEADERS);
assert.strictEqual(raw.data.rows[0].rowNumber, 44);
assert.strictEqual(raw.data.rows[0].values[14], '21');
assert.strictEqual(raw.data.rows[0].values[18], '33');

const failingHandlers = createSportsHandlers({
  readSheet: async () => {
    const error = new Error('synthetic loader failure');
    error.code = 'sports_source_unavailable';
    error.status = 503;
    error.retryable = true;
    throw error;
  },
});
const failed = await call(failingHandlers.overview, { query: { cycle: '404' } });
assert.strictEqual(failed.statusCode, 503);
assert.strictEqual(failed.body.error.code, 'sports_source_unavailable');
assert.strictEqual(failed.body.error.retryable, true);

const noCycleHandlers = createSportsHandlers({
  readSheet: async (sheetName) => ({
    data: sheetName === 'Oakland_Sports_Feed'
      ? {
        headers: FEED_HEADERS,
        rows: [{
          rowNumber: 2,
          values: FEED_HEADERS.map((header) => header === 'Cycle' ? 'invalid' : ''),
        }],
      }
      : {
        headers: sheetName === 'As_Roster' ? AS_HEADERS : OAKS_HEADERS,
        rows: [],
      },
    fetchedAt: '2042-01-01T00:00:00.000Z',
    warnings: [],
  }),
});
const noCycle = await call(noCycleHandlers.overview);
assert.strictEqual(noCycle.statusCode, 422);
assert.strictEqual(noCycle.body.error.code, 'sports_cycle_unavailable');

let writeCalls = 0;
const invalidatedSheets = [];
let secureNow = 1_000_000;
let capturedWrite = null;
const secureDependencies = {
  readSheet,
  readFreshSheet: readSheet,
  now: () => secureNow,
  writeConfig: {
    enabled: true,
    publicOrigin: 'https://sports.synthetic.test',
    previewSecret: 'synthetic-preview-secret-32-bytes-minimum',
    capabilitySecret: 'synthetic-write-capability',
    dashboardAuthReady: true,
    secureCookie: true,
    directPortRestricted: true,
  },
  writeSportsFeed: async (input) => {
    writeCalls += 1;
    capturedWrite = input;
    return {
      writePerformed: true,
      replayed: false,
      updatedRange: 'Oakland_Sports_Feed!A55:T55',
      rowNumber: 55,
      cycle: 404,
      team: "A's",
      eventType: input.expectedRow[2],
      requestHash: input.requestHash,
      idempotencyKey: input.idempotencyKey,
      writtenAt: '2042-01-01T00:00:00.000Z',
    };
  },
  invalidateSheet: (sheetName) => {
    invalidatedSheets.push(sheetName);
  },
};
const secureHandlers = createSportsHandlers(secureDependencies);
const securePreview = await call(secureHandlers.preview, {
  secure: true,
  headers: { origin: 'https://sports.synthetic.test' },
  body: { draft: validDraft },
});
assert.strictEqual(securePreview.statusCode, 200);
assert.strictEqual(securePreview.body.data.confirmation.available, true);
assert.ok(securePreview.body.data.confirmation.previewToken);
assert.ok(securePreview.body.data.confirmation.csrfToken);
assert.ok(securePreview.body.data.confirmation.expiresAt);
assert.deepStrictEqual(
  securePreview.body.data.confirmation.authorizationControls,
  ['dashboard-auth', 'sports-write-capability'],
);

const noDashboardAuthHandlers = createSportsHandlers({
  ...secureDependencies,
  writeConfig: {
    ...secureDependencies.writeConfig,
    dashboardAuthReady: false,
  },
});
const noDashboardAuthPreview = await call(noDashboardAuthHandlers.preview, {
  secure: true,
  headers: { origin: 'https://sports.synthetic.test' },
  body: { draft: validDraft },
});
assert.strictEqual(noDashboardAuthPreview.statusCode, 200);
assert.strictEqual(noDashboardAuthPreview.body.data.confirmation.available, false);
assert.strictEqual(
  noDashboardAuthPreview.body.data.confirmation.reasonCode,
  'sports_write_not_ready',
);

const confirmHeaders = {
  origin: 'https://sports.synthetic.test',
  'x-sports-write-capability': 'synthetic-write-capability',
  'x-gw-csrf': securePreview.body.data.confirmation.csrfToken,
};
const confirmBody = {
  previewToken: securePreview.body.data.confirmation.previewToken,
  confirmation: SPORTS_WRITE_CONFIRMATION,
};

// A new handler instance proves tokens survive a routine process restart.
const restartedHandlers = createSportsHandlers(secureDependencies);
const confirmed = await call(restartedHandlers.entries, {
  secure: true,
  headers: confirmHeaders,
  body: confirmBody,
});
assert.strictEqual(confirmed.statusCode, 200);
assert.strictEqual(confirmed.body.data.writePerformed, true);
assert.strictEqual(confirmed.body.data.updatedRange, 'Oakland_Sports_Feed!A55:T55');
assert.strictEqual(writeCalls, 1);
assert.deepStrictEqual(invalidatedSheets, ['Oakland_Sports_Feed']);
assert.match(
  capturedWrite.idempotencyKey,
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
assert.strictEqual(capturedWrite.draft.TeamsUsed, 'as');
assert.strictEqual(capturedWrite.expectedRow.length, 20);

const secureStatPreview = await call(secureHandlers.preview, {
  secure: true,
  headers: { origin: 'https://sports.synthetic.test' },
  body: statSubmission({
    changes: [
      { field: 'batting.so', before: '21', after: '22', reviewed: true },
      { field: 'pitching.so', before: '33', after: '34', reviewed: true },
    ],
  }),
});
assert.strictEqual(secureStatPreview.statusCode, 200);
assert.strictEqual(secureStatPreview.body.data.confirmation.available, true);

const secureStatConfirmed = await call(secureHandlers.entries, {
  secure: true,
  headers: {
    origin: 'https://sports.synthetic.test',
    'x-sports-write-capability': 'synthetic-write-capability',
    'x-gw-csrf': secureStatPreview.body.data.confirmation.csrfToken,
  },
  body: {
    previewToken: secureStatPreview.body.data.confirmation.previewToken,
    confirmation: SPORTS_WRITE_CONFIRMATION,
  },
});
assert.strictEqual(secureStatConfirmed.statusCode, 200);
assert.strictEqual(writeCalls, 2);
assert.deepStrictEqual(
  invalidatedSheets,
  ['Oakland_Sports_Feed', 'Oakland_Sports_Feed', 'As_Roster'],
);
assert.strictEqual(capturedWrite.submission.mutation.action, 'stat-capture');
assert.strictEqual(capturedWrite.sourcePreconditions.rosterSource, 'As_Roster');
assert.match(
  capturedWrite.idempotencyKey,
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);

const secureInjuryPreview = await call(secureHandlers.preview, {
  secure: true,
  headers: { origin: 'https://sports.synthetic.test' },
  body: injurySubmission,
});
assert.strictEqual(secureInjuryPreview.statusCode, 200);
assert.strictEqual(secureInjuryPreview.body.data.confirmation.available, true);
const secureInjuryConfirmed = await call(secureHandlers.entries, {
  secure: true,
  headers: {
    origin: 'https://sports.synthetic.test',
    'x-sports-write-capability': 'synthetic-write-capability',
    'x-gw-csrf': secureInjuryPreview.body.data.confirmation.csrfToken,
  },
  body: {
    previewToken: secureInjuryPreview.body.data.confirmation.previewToken,
    confirmation: SPORTS_WRITE_CONFIRMATION,
  },
});
assert.strictEqual(secureInjuryConfirmed.statusCode, 200);
assert.strictEqual(writeCalls, 3);
assert.deepStrictEqual(
  invalidatedSheets,
  [
    'Oakland_Sports_Feed',
    'Oakland_Sports_Feed',
    'As_Roster',
    'Oakland_Sports_Feed',
    'As_Roster',
    'Simulation_Ledger',
    'LifeHistory_Log',
    'Ripple_Ledger',
  ],
);
assert.strictEqual(capturedWrite.submission.mutation.action, 'injury');
assert.strictEqual(capturedWrite.sourcePreconditions.citizenRow, 22);
assert.ok(capturedWrite.sourcePreconditions.lifeHistoryLogHeaderHash);
assert.ok(capturedWrite.sourcePreconditions.rippleLedgerHeaderHash);
assert.strictEqual(capturedWrite.sourcePreconditions.nextLifeHistoryLogRow, undefined);
assert.strictEqual(capturedWrite.sourcePreconditions.nextRippleLedgerRow, undefined);

let disabledWriteCalls = 0;
const disabledHandlers = createSportsHandlers({
  readSheet,
  writeSportsFeed: async () => { disabledWriteCalls += 1; },
});
const disabled = await call(disabledHandlers.entries, {
  secure: true,
  headers: confirmHeaders,
  body: confirmBody,
});
assert.strictEqual(disabled.statusCode, 403);
assert.strictEqual(disabled.body.error.code, 'sports_write_disabled');
assert.strictEqual(disabledWriteCalls, 0);

const notReadyHandlers = createSportsHandlers({
  readSheet,
  writeConfig: { enabled: true },
});
const notReady = await call(notReadyHandlers.entries, {
  secure: true,
  headers: confirmHeaders,
  body: confirmBody,
});
assert.strictEqual(notReady.statusCode, 503);
assert.strictEqual(notReady.body.error.code, 'sports_write_not_ready');

const insecure = await call(secureHandlers.entries, {
  headers: confirmHeaders,
  body: confirmBody,
});
assert.strictEqual(insecure.statusCode, 403);
assert.strictEqual(insecure.body.error.code, 'sports_https_required');

const wrongOrigin = await call(secureHandlers.entries, {
  secure: true,
  headers: { ...confirmHeaders, origin: 'https://wrong.synthetic.test' },
  body: confirmBody,
});
assert.strictEqual(wrongOrigin.statusCode, 403);
assert.strictEqual(wrongOrigin.body.error.code, 'sports_origin_invalid');

const wrongCapability = await call(secureHandlers.entries, {
  secure: true,
  headers: {
    ...confirmHeaders,
    'x-sports-write-capability': 'wrong-capability',
  },
  body: confirmBody,
});
assert.strictEqual(wrongCapability.statusCode, 403);
assert.strictEqual(wrongCapability.body.error.code, 'sports_write_capability_invalid');

const wrongCsrf = await call(secureHandlers.entries, {
  secure: true,
  headers: { ...confirmHeaders, 'x-gw-csrf': 'wrong-csrf' },
  body: confirmBody,
});
assert.strictEqual(wrongCsrf.statusCode, 403);
assert.strictEqual(wrongCsrf.body.error.code, 'sports_csrf_invalid');

const missingConfirmation = await call(secureHandlers.entries, {
  secure: true,
  headers: confirmHeaders,
  body: { previewToken: confirmBody.previewToken },
});
assert.strictEqual(missingConfirmation.statusCode, 400);
assert.strictEqual(
  missingConfirmation.body.error.code,
  'sports_confirmation_required'
);

const changedFreshHandlers = createSportsHandlers({
  ...secureDependencies,
  readFreshSheet: async (sheetName) => {
    const snapshot = await readSheet(sheetName);
    if (sheetName !== 'As_Roster') return snapshot;
    return {
      ...snapshot,
      data: {
        ...snapshot.data,
        rows: snapshot.data.rows.map((row) => ({
          ...row,
          values: row.values.map((cell, index) => (
            index === 5 ? 'CHANGED-SYNTHETIC-POSITION' : cell
          )),
        })),
      },
    };
  },
});
const changedSource = await call(changedFreshHandlers.entries, {
  secure: true,
  headers: { ...confirmHeaders, 'idempotency-key': 'synthetic-route-key-0002' },
  body: confirmBody,
});
assert.strictEqual(changedSource.statusCode, 409);
assert.strictEqual(changedSource.body.error.code, 'sports_source_changed');
assert.strictEqual(writeCalls, 3);

secureNow += 15 * 60 * 1000;
const expired = await call(secureHandlers.entries, {
  secure: true,
  headers: { ...confirmHeaders, 'idempotency-key': 'synthetic-route-key-0003' },
  body: confirmBody,
});
assert.strictEqual(expired.statusCode, 410);
assert.strictEqual(expired.body.error.code, 'sports_preview_expired');
assert.strictEqual(writeCalls, 3);

assert.ok(reads.includes('Oakland_Sports_Feed'));
assert.ok(reads.includes('As_Roster'));
assert.ok(reads.includes('Oaks_Roster'));
assert.ok(reads.includes('Simulation_Ledger'));
console.log('sportsRoutes.test.js: all assertions passed');
