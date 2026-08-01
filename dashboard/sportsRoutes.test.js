import assert from 'assert';
import {
  SPORTS_CACHE_TTL_MS,
  SPORTS_WRITE_CONFIRMATION,
  createSportsHandlers,
  createSportsSheetReader,
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

const syntheticSheets = {
  Oakland_Sports_Feed: [
    { Cycle: '403', TeamsUsed: "A's", SeasonType: 'early-season', 'Team Record': '3-2' },
    {
      Cycle: '404', TeamsUsed: "A's", SeasonType: 'regular-season',
      EventType: 'game-result', NamesUsed: 'Synthetic Batter',
      Notes: 'Synthetic non-canon result.', 'Team Record': '4-2', Streak: 'W2',
      HomeNeighborhood: 'Downtown',
    },
    {
      Cycle: '404', TeamsUsed: 'Warriors', SeasonType: 'regular-season',
      EventType: 'season-state', Notes: 'Synthetic legacy-alias state.',
      FanSentiment: 'electric',
    },
  ],
  As_Roster: [
    {
      POPID: 'POP-90001', First: 'Synthetic', Last: 'Batter',
      Position: 'CF', Team: "A's", AVG: '.300', HR: '5',
    },
  ],
  Oaks_Roster: [
    {
      POPID: 'POP-90002', First: 'Synthetic', Last: 'Guard',
      Position: 'G', Team: 'Oaks', PPG: '20.0', ASST: '7.0',
    },
  ],
  Simulation_Ledger: [
    { POPID: 'POP-90001', First: 'Synthetic', Last: 'Batter' },
    { POPID: 'POP-90002', First: 'Synthetic', Last: 'Guard' },
  ],
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
assert.ok(workspace.body.data.validEventOptions.eventTypes.includes('game-result'));
assert.strictEqual(workspace.body.data.writePolicy.featureEnabled, false);
assert.strictEqual(workspace.body.data.writePolicy.reasonCode, 'sports_write_disabled');

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
assert.strictEqual(preview.body.data.ripplePreview.unavailableSiblings[0].id, 'engine.40');
assert.strictEqual(preview.body.data.confirmation.available, false);
assert.strictEqual(preview.body.data.confirmation.reasonCode, 'sports_write_disabled');

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
    data: sheetName === 'Oakland_Sports_Feed' ? [{ Cycle: 'invalid' }] : [],
    fetchedAt: '2042-01-01T00:00:00.000Z',
    warnings: [],
  }),
});
const noCycle = await call(noCycleHandlers.overview);
assert.strictEqual(noCycle.statusCode, 422);
assert.strictEqual(noCycle.body.error.code, 'sports_cycle_unavailable');

let writeCalls = 0;
let invalidations = 0;
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
      eventType: 'game-result',
      requestHash: input.requestHash,
      idempotencyKey: input.idempotencyKey,
      writtenAt: '2042-01-01T00:00:00.000Z',
    };
  },
  invalidateSheet: (sheetName) => {
    assert.strictEqual(sheetName, 'Oakland_Sports_Feed');
    invalidations += 1;
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

const confirmHeaders = {
  origin: 'https://sports.synthetic.test',
  'x-sports-write-capability': 'synthetic-write-capability',
  'x-gw-csrf': securePreview.body.data.confirmation.csrfToken,
  'idempotency-key': 'synthetic-route-key-0001',
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
assert.strictEqual(invalidations, 1);
assert.strictEqual(capturedWrite.idempotencyKey, 'synthetic-route-key-0001');
assert.strictEqual(capturedWrite.draft.TeamsUsed, 'as');
assert.strictEqual(capturedWrite.expectedRow.length, 20);

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
      data: snapshot.data.map((row) => ({
        ...row,
        Position: 'CHANGED-SYNTHETIC-POSITION',
      })),
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
assert.strictEqual(writeCalls, 1);

secureNow += 15 * 60 * 1000;
const expired = await call(secureHandlers.entries, {
  secure: true,
  headers: { ...confirmHeaders, 'idempotency-key': 'synthetic-route-key-0003' },
  body: confirmBody,
});
assert.strictEqual(expired.statusCode, 410);
assert.strictEqual(expired.body.error.code, 'sports_preview_expired');
assert.strictEqual(writeCalls, 1);

assert.ok(reads.includes('Oakland_Sports_Feed'));
assert.ok(reads.includes('As_Roster'));
assert.ok(reads.includes('Oaks_Roster'));
assert.ok(reads.includes('Simulation_Ledger'));
console.log('sportsRoutes.test.js: all assertions passed');
