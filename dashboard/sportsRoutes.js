import express from 'express';
import { randomUUID } from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  FEED_HEADERS,
  TEAM_CONFIG,
  EVENT_TYPES,
  ACTION_MATRIX,
  STAT_FIELD_MAPS,
  VERIFICATION_SOURCES,
  SAFE_ENUMS,
  normalizeDraftTeam,
  projectRosterEventMutation,
  validateSportsSubmission,
  projectNewRow,
} = require('../scripts/sportsFeedContract.js');
const { projectSportsWorkspace } = require('../scripts/sportsWorkspaceProjection.js');
const { readDailyInbox } = require('../scripts/notebookDailyInbox.js');
const {
  createSportsSourcePreconditions,
  sha256,
  sportsRequestHash,
  stableStringify,
} = require('../scripts/sportsFeedWriter.js');
const {
  actorHash,
  createPreviewToken,
  hash,
  safeEqual,
  verifyPreviewToken,
} = require('../scripts/sportsPreviewToken.js');

export const SPORTS_CONTRACT_VERSION = 1;
export const SPORTS_CACHE_TTL_MS = 60 * 1000;
export const SPORTS_WRITE_CONFIRMATION = 'APPEND_TO_OAKLAND_SPORTS_FEED';
export const SPORTS_REQUEST_BODY_LIMIT_BYTES = 64 * 1024;

const SPORTS_SHEETS = Object.freeze({
  feed: 'Oakland_Sports_Feed',
  as: 'As_Roster',
  oaks: 'Oaks_Roster',
  citizens: 'Simulation_Ledger',
  lifeHistoryLog: 'LifeHistory_Log',
  rippleLedger: 'Ripple_Ledger',
});

function routeError(code, message, status = 500, retryable = false) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.retryable = retryable;
  return error;
}

export function sportsBodyLimitVerify(req, _res, buffer) {
  const url = String(req && (req.originalUrl || req.url) || '');
  if (!/^\/api\/sports\/(?:preview|entries)(?:[/?]|$)/.test(url)) return;
  if (buffer.length <= SPORTS_REQUEST_BODY_LIMIT_BYTES) return;
  const error = new Error('Sports requests must be 64 KiB or smaller');
  error.code = 'sports_body_too_large';
  error.status = 413;
  throw error;
}

function assertSportsBodySize(body) {
  let bytes;
  try {
    bytes = Buffer.byteLength(JSON.stringify(body == null ? null : body), 'utf8');
  } catch {
    throw routeError('sports_body_invalid', 'Sports request JSON is invalid', 400);
  }
  if (bytes > SPORTS_REQUEST_BODY_LIMIT_BYTES) {
    throw routeError(
      'sports_body_too_large',
      'Sports requests must be 64 KiB or smaller',
      413,
    );
  }
}

function envelope({ source, data = null, warnings = [], error = null }) {
  return {
    contractVersion: SPORTS_CONTRACT_VERSION,
    source,
    data,
    warnings,
    error,
  };
}

function errorBody(error) {
  return {
    code: error.code || 'sports_internal_error',
    message: error.status && error.status < 500
      ? error.message
      : 'The Oakland sports workspace could not load its source data.',
    retryable: Boolean(error.retryable || !error.status || error.status >= 500),
  };
}

function sendError(res, error, sourceName = 'Oakland sports workspace') {
  const status = error.status || 500;
  return res.status(status).json(envelope({
    source: { kind: 'projection', name: sourceName, fetchedAt: null, cycle: null },
    error: errorBody(error),
  }));
}

function requestHeader(req, name) {
  if (req && typeof req.get === 'function') return req.get(name) || '';
  const headers = req && req.headers ? req.headers : {};
  return headers[String(name).toLowerCase()] || '';
}

function normalizedPublicOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function buildWritePolicy(config, dependencies) {
  const featureEnabled = Boolean(config && config.enabled);
  const publicOrigin = normalizedPublicOrigin(config && config.publicOrigin);
  const previewSecretReady = typeof (config && config.previewSecret) === 'string' &&
    Buffer.byteLength(config.previewSecret, 'utf8') >= 32;
  const capabilityReady = typeof (config && config.capabilitySecret) === 'string' &&
    Buffer.byteLength(config.capabilitySecret, 'utf8') >= 16;
  const dashboardAuthReady = config && config.dashboardAuthReady === true;
  const transportReady = Boolean(
    config && config.secureCookie === true &&
    config.directPortRestricted === true
  );
  const dependenciesReady = typeof dependencies.writeSportsFeed === 'function' &&
    typeof dependencies.readFreshSheet === 'function';
  const configured = Boolean(
    publicOrigin && previewSecretReady && capabilityReady &&
    dashboardAuthReady && transportReady && dependenciesReady
  );
  return {
    featureEnabled,
    configured,
    mode: 'remote-browser',
    publicOrigin,
    previewSecret: config && config.previewSecret,
    capabilitySecret: config && config.capabilitySecret,
    reasonCode: !featureEnabled
      ? 'sports_write_disabled'
      : configured
        ? null
        : 'sports_write_not_ready',
  };
}

function publicWritePolicy(policy) {
  return {
    featureEnabled: policy.featureEnabled,
    configured: policy.configured,
    mode: policy.mode,
    requiresHttps: true,
    authorizationControls: ['dashboard-auth', 'sports-write-capability'],
    proxyAttestations: ['https', 'same-origin', 'loopback-bind'],
    reasonCode: policy.reasonCode,
  };
}

function assertSecureSameOrigin(req, policy) {
  if (!req || req.secure !== true) {
    throw routeError(
      'sports_https_required',
      'Secure HTTPS is required before a sports event can be appended',
      403
    );
  }
  const origin = normalizedPublicOrigin(requestHeader(req, 'Origin'));
  if (!origin || origin !== policy.publicOrigin) {
    throw routeError(
      'sports_origin_invalid',
      'The sports confirmation must come from the configured dashboard origin',
      403
    );
  }
}

function requestActor(req) {
  return String(req && req.authActor || '').trim();
}

function verifyWriteCapability(req, policy) {
  const supplied = requestHeader(req, 'X-Sports-Write-Capability');
  if (!supplied || !safeEqual(hash(supplied), hash(policy.capabilitySecret))) {
    throw routeError(
      'sports_write_capability_invalid',
      'The sports write key was not accepted',
      403
    );
  }
}

function positiveInteger(value, field) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw routeError('invalid_query', `${field} must be a positive integer`, 400);
  }
  return parsed;
}

function feedCycle(row) {
  const raw = row && (row.Cycle ?? row.cycle);
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function availableCycles(rows) {
  return [...new Set((rows || []).map(feedCycle).filter(Boolean))].sort((a, b) => b - a);
}

function isRawSheetSnapshot(value) {
  return Boolean(
    value &&
    !Array.isArray(value) &&
    Array.isArray(value.headers) &&
    Array.isArray(value.rows)
  );
}

function normalizeLoadedSheetData(value) {
  if (Array.isArray(value)) {
    return value.map((row, index) => ({
      ...row,
      __rowNumber: Number.isInteger(row && row.__rowNumber) ? row.__rowNumber : index + 2,
    }));
  }
  if (isRawSheetSnapshot(value)) {
    return {
      headers: value.headers.slice(),
      rows: value.rows.map((row, index) => ({
        rowNumber: Number.isInteger(row && row.rowNumber) ? row.rowNumber : index + 2,
        values: Array.isArray(row && row.values) ? row.values.slice() : row && row.values,
      })),
    };
  }
  throw new Error('Sheet loader did not return object rows or a raw snapshot');
}

function normalizeSnapshot(snapshot, sheetName) {
  if (Array.isArray(snapshot) || isRawSheetSnapshot(snapshot)) {
    return {
      data: normalizeLoadedSheetData(snapshot),
      sheetName,
      fetchedAt: null,
      cacheAgeMs: null,
      cacheHit: false,
      stale: false,
      warnings: [],
    };
  }
  if (!snapshot ||
      (!Array.isArray(snapshot.data) && !isRawSheetSnapshot(snapshot.data))) {
    throw routeError('sports_source_unavailable', `${sheetName} is unavailable`, 503, true);
  }
  return {
    data: normalizeLoadedSheetData(snapshot.data),
    sheetName,
    fetchedAt: snapshot.fetchedAt || null,
    cacheAgeMs: Number.isFinite(snapshot.cacheAgeMs) ? snapshot.cacheAgeMs : null,
    cacheHit: Boolean(snapshot.cacheHit),
    stale: Boolean(snapshot.stale),
    warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings : [],
  };
}

function feedRowsFromSnapshot(data) {
  if (!isRawSheetSnapshot(data)) {
    throw routeError(
      'sports_source_schema_changed',
      'Oakland_Sports_Feed must use a raw header-validated snapshot',
      503,
      true,
    );
  }
  const headers = data.headers.map((header) => String(header || ''));
  if (headers.length !== FEED_HEADERS.length ||
      headers.some((header, index) => header !== FEED_HEADERS[index])) {
    throw routeError(
      'sports_source_schema_changed',
      'Oakland_Sports_Feed header layout changed',
      503,
      true,
    );
  }
  return data.rows.map((row) => {
    const result = { __rowNumber: row.rowNumber };
    FEED_HEADERS.forEach((header, index) => {
      result[header] = row.values[index] == null
        ? ''
        : String(row.values[index]);
    });
    return result;
  });
}

function sourceFromSnapshots(snapshots, cycle) {
  const fetchedTimes = snapshots.map((snapshot) => snapshot.fetchedAt).filter(Boolean).sort();
  const sheets = {};
  snapshots.forEach((snapshot) => {
    sheets[snapshot.sheetName] = {
      fetchedAt: snapshot.fetchedAt,
      cacheAgeMs: snapshot.cacheAgeMs,
      cacheHit: snapshot.cacheHit,
      stale: snapshot.stale,
    };
  });
  return {
    kind: 'sheet',
    name: 'Oakland sports live sheets',
    fetchedAt: fetchedTimes.length ? fetchedTimes[fetchedTimes.length - 1] : null,
    cycle,
    sheets,
  };
}

export function createSportsSheetReader(loadSheet, options = {}) {
  if (typeof loadSheet !== 'function') throw new Error('loadSheet must be a function');
  const ttlMs = options.ttlMs || SPORTS_CACHE_TTL_MS;
  const now = options.now || (() => Date.now());
  const cache = new Map();

  async function readSportsSheet(sheetName) {
    const currentTime = now();
    const cached = cache.get(sheetName);
    if (cached && currentTime - cached.timestamp < ttlMs) {
      return {
        data: cached.data,
        fetchedAt: new Date(cached.timestamp).toISOString(),
        cacheAgeMs: currentTime - cached.timestamp,
        cacheHit: true,
        stale: false,
        warnings: [],
      };
    }

    try {
      const data = normalizeLoadedSheetData(await loadSheet(sheetName));
      cache.set(sheetName, { data, timestamp: currentTime });
      return {
        data,
        fetchedAt: new Date(currentTime).toISOString(),
        cacheAgeMs: 0,
        cacheHit: false,
        stale: false,
        warnings: [],
      };
    } catch (error) {
      if (cached) {
        return {
          data: cached.data,
          fetchedAt: new Date(cached.timestamp).toISOString(),
          cacheAgeMs: currentTime - cached.timestamp,
          cacheHit: true,
          stale: true,
          warnings: [{ code: 'sheet_refresh_failed', sheet: sheetName }],
        };
      }
      throw routeError(
        'sports_source_unavailable',
        `${sheetName} could not be read`,
        503,
        true,
      );
    }
  }
  readSportsSheet.invalidate = (sheetName) => {
    if (sheetName) cache.delete(sheetName);
    else cache.clear();
  };
  return readSportsSheet;
}

async function loadProjection(readSheet, requestedCycle) {
  const [feed, asRoster, oaksRoster] = (await Promise.all([
    readSheet(SPORTS_SHEETS.feed),
    readSheet(SPORTS_SHEETS.as),
    readSheet(SPORTS_SHEETS.oaks),
  ])).map((snapshot, index) => normalizeSnapshot(
    snapshot,
    [SPORTS_SHEETS.feed, SPORTS_SHEETS.as, SPORTS_SHEETS.oaks][index],
  ));

  const feedRows = feedRowsFromSnapshot(feed.data);
  const cycles = availableCycles(feedRows);
  const cycle = requestedCycle || cycles[0];
  if (!cycle) {
    throw routeError(
      'sports_cycle_unavailable',
      'No valid Cycle exists in Oakland_Sports_Feed',
      422,
    );
  }

  const source = sourceFromSnapshots([feed, asRoster, oaksRoster], cycle);
  const projection = projectSportsWorkspace({
    cycle,
    feedRows,
    asRoster: asRoster.data,
    oaksRoster: oaksRoster.data,
    freshness: source,
  });
  const warnings = [
    ...feed.warnings,
    ...asRoster.warnings,
    ...oaksRoster.warnings,
    ...projection.warnings,
  ];
  return {
    cycle,
    cycles,
    projection,
    snapshots: { feed, asRoster, oaksRoster },
    source,
    warnings,
  };
}

function teamSummary(team) {
  return {
    id: team.id,
    label: team.label,
    sheetValue: team.sheetValue,
    state: team.state,
    rosterCount: team.rosterCount,
    eventCount: team.events.length,
  };
}

function nameFromCitizen(row) {
  return [row && row.First, row && row.Middle, row && row.Last]
    .map((part) => part == null ? '' : String(part).trim())
    .filter(Boolean)
    .join(' ');
}

function rosterCitizenIdentityMatches(player, citizen) {
  return Boolean(
    player &&
    citizen &&
    String(citizen.POPID || '').trim() === player.popid &&
    String(citizen.First || '').trim() === player.firstName &&
    String(citizen.Last || '').trim() === player.lastName
  );
}

function citizenRowsFromSnapshot(data) {
  if (Array.isArray(data)) return data;
  if (!isRawSheetSnapshot(data)) {
    throw routeError(
      'sports_source_unavailable',
      'Simulation_Ledger raw snapshot is unavailable',
      503,
      true,
    );
  }
  const required = [
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
  const indexes = {};
  required.forEach((header) => {
    const matches = data.headers.reduce((result, value, index) => (
      String(value || '').trim() === header ? result.concat(index) : result
    ), []);
    if (matches.length !== 1) {
      throw routeError(
        'sports_source_schema_changed',
        `Simulation_Ledger requires exactly one ${header} header`,
        503,
        true,
      );
    }
    indexes[header] = matches[0];
  });
  const middleIndex = data.headers.findIndex(
    (header) => String(header || '').trim() === 'Middle'
  );
  return data.rows.map((row) => {
    const result = { __rowNumber: row.rowNumber };
    required.forEach((header) => {
      result[header] = row.values[indexes[header]] == null
        ? ''
        : String(row.values[indexes[header]]);
    });
    if (middleIndex >= 0) {
      result.Middle = row.values[middleIndex] == null
        ? ''
        : String(row.values[middleIndex]);
    }
    return result;
  });
}

function citizenWorkspaceState(player, citizens) {
  const matches = (citizens || []).filter((row) => (
    rosterCitizenIdentityMatches(player, row)
  ));
  if (matches.length !== 1) {
    return {
      resolved: false,
      reason: matches.length ? 'ambiguous' : 'missing',
    };
  }
  const citizen = matches[0];
  return {
    resolved: true,
    sourceRow: citizen.__rowNumber,
    tier: String(citizen.Tier || '').trim(),
    status: String(citizen.Status || '').trim(),
    roleType: String(citizen.RoleType || '').trim(),
    statusStartCycle: String(citizen.StatusStartCycle || '').trim(),
    healthCause: String(citizen.HealthCause || '').trim(),
    neighborhood: String(citizen.Neighborhood || '').trim(),
  };
}

function resolveNames(namesText, roster, citizens) {
  const requested = String(namesText || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  if (!requested.length) return { resolved: [], errors: [] };

  const candidates = new Map();
  function addCandidate(name, popid, source) {
    if (!name || !/^POP-\d{5}$/.test(popid || '')) return;
    const key = name.toLowerCase();
    if (!candidates.has(key)) candidates.set(key, []);
    const entries = candidates.get(key);
    if (!entries.some((entry) => entry.popid === popid)) entries.push({ name, popid, source });
  }
  (roster || []).forEach((player) => addCandidate(player.name, player.popid, 'roster'));
  (citizens || []).forEach((citizen) => addCandidate(
    nameFromCitizen(citizen),
    String(citizen.POPID || '').trim(),
    'Simulation_Ledger',
  ));

  const resolved = [];
  const errors = [];
  requested.forEach((name) => {
    const matches = candidates.get(name.toLowerCase()) || [];
    if (matches.length === 0) errors.push(`NamesUsed does not resolve to an existing citizen: ${name}`);
    else if (matches.length > 1) errors.push(`NamesUsed is ambiguous: ${name}`);
    else resolved.push(matches[0]);
  });
  return { resolved, errors };
}

function buildRipplePreview(draft, resolvedNames, mutationPreview) {
  const isGame = draft.EventType === 'game-result';
  const hasTeamState = [
    'SeasonType', 'Team Record', 'Streak', 'FanSentiment',
    'FranchiseStability', 'EconomicFootprint', 'CommunityInvestment', 'MediaProfile',
  ].some((field) => draft[field]);
  return {
    currentConsumers: [
      {
        id: 'phase02-team-state',
        label: 'City and team state',
        status: hasTeamState ? 'will-read' : 'no-state-fields',
        source: 'phase02-world-state/applySportsSeason.js',
      },
      {
        id: 'phase05-named-player',
        label: 'Named-player game moment',
        status: isGame && resolvedNames.length ? 'will-read' : 'not-triggered',
        source: 'phase05-citizens/applyGameNightMoments.js',
      },
      {
        id: 'phase05-game-night',
        label: 'Citizen game-night events',
        status: isGame ? 'will-read' : 'not-triggered',
        source: 'phase05-citizens/generateCitizensEvents.js',
      },
      {
        id: 'phase07-sports-media',
        label: 'Evening sports and story hooks',
        status: 'will-read',
        source: 'phase07-evening-media',
      },
      {
        id: 'newsroom-context',
        label: 'Sports desk context',
        status: 'will-read',
        source: 'scripts/buildDeskPackets.js',
      },
    ],
    mutationEffects: mutationPreview?.action === 'stat-capture'
      ? [{
        id: 'engine.40',
        label: 'Roster current-stat update',
        status: 'signed-confirmation-ready',
      }]
      : mutationPreview?.kind === 'roster-event'
        ? [
          {
            id: 'engine.77-state',
            label: 'Roster and citizen state',
            status: 'signed-confirmation-ready',
          },
          {
            id: 'engine.77-life',
            label: 'LifeHistory and LifeHistory_Log',
            status: 'signed-confirmation-ready',
          },
          {
            id: 'engine.77-ripple',
            label: 'Citizen Ripple attribution',
            status: 'signed-confirmation-ready',
          },
        ]
        : [],
    unavailableSiblings: [
      {
        id: 'season-close',
        label: 'TrueSource season close',
        status: 'deferred-until-truesource-update',
      },
    ],
  };
}

function sanitizeNotebookProvenance(value) {
  if (!value || typeof value !== 'object') return null;
  const cycle = Number(value.cycle);
  const generatedAt = typeof value.generatedAt === 'string' ? value.generatedAt : null;
  if (!Number.isInteger(cycle) || cycle <= 0 || !generatedAt ||
      value.canonStatus !== 'NOT_CANON') return null;
  return {
    kind: 'notebook-daily',
    cycle,
    generatedAt,
    canonStatus: 'NOT_CANON',
  };
}

function previewSourceHash(
  result,
  team,
  resolution,
  resolvedParticipant,
  sourcePreconditions,
) {
  return sha256(stableStringify({
    cycle: result.cycle,
    events: result.projection.events,
    team: {
      id: team.id,
      state: team.state,
      roster: team.roster.map((player) => ({
        sourceRow: player.sourceRow,
        popid: player.popid,
        name: player.name,
        tier: player.tier,
        position: player.position,
        team: player.team,
        salary: player.salary,
        statValues: player.statValues,
      })),
    },
    resolvedNames: resolution.resolved,
    participantState: resolvedParticipant
      ? {
        roster: resolvedParticipant.rosterPlayer,
        citizen: resolvedParticipant.citizen,
      }
      : null,
    sourcePreconditions,
  }));
}

function resolveMutationParticipant(validation, team, citizens) {
  const participant = validation.participant;
  if (!participant) return null;
  const rosterPlayer = team.roster.find((player) => (
    player.sourceRow === participant.sourceRow &&
    player.popid === participant.popid &&
    player.name === participant.name
  ));
  if (!rosterPlayer) {
    throw routeError(
      'sports_participant_resolution_failed',
      'The selected participant no longer matches the exact roster row',
      422,
    );
  }
  const citizenMatches = (citizens || []).filter((row) => (
    rosterCitizenIdentityMatches(rosterPlayer, row)
  ));
  if (citizenMatches.length !== 1) {
    throw routeError(
      'sports_participant_resolution_failed',
      'The selected participant does not resolve uniquely by POPID and first/last identity in Simulation_Ledger',
      422,
    );
  }
  return {
    rosterPlayer,
    citizen: {
      ...citizenMatches[0],
      sourceRow: citizenMatches[0].__rowNumber,
    },
  };
}

function buildMutationPreview(validation, resolvedParticipant) {
  if (!validation.mutation) return null;
  const mutation = validation.mutation;
  if (mutation.kind === 'roster-event') {
    try {
      const projected = projectRosterEventMutation(validation, {
        roster: {
          Tier: resolvedParticipant.rosterPlayer.tier,
          Team: resolvedParticipant.rosterPlayer.team,
          Position: resolvedParticipant.rosterPlayer.position,
        },
        citizen: resolvedParticipant.citizen,
      });
      return {
        ...projected,
        lifeHistory: {
          line: projected.lifeHistory.line,
          eventTag: projected.lifeHistory.eventTag,
          eventText: projected.lifeHistory.eventText,
          logRow: projected.lifeHistory.logRow,
        },
        statDiff: null,
      };
    } catch (error) {
      throw routeError('sports_source_changed', error.message, 409);
    }
  }
  const player = resolvedParticipant.rosterPlayer;
  const citizenStatus = String(
    resolvedParticipant.citizen.Status || ''
  ).trim().toLowerCase();
  if (!['active', 'recovering'].includes(citizenStatus)) {
    throw routeError(
      'sports_participant_state_invalid',
      'Stat capture requires an Active or recovering citizen',
      422,
    );
  }
  const fieldMap = STAT_FIELD_MAPS[validation.participant.rosterSource];
  const fields = mutation.changes.map((change) => {
    const current = player.statValues[change.field];
    if (current !== change.before) {
      throw routeError(
        'sports_source_changed',
        `${change.field} changed after the stat form was opened`,
        409,
      );
    }
    const spec = fieldMap[change.field];
    const status = change.before === change.after
      ? 'unchanged'
      : change.before
        ? 'changed'
        : 'blank-source';
    return {
      field: change.field,
      label: spec.label,
      column: spec.column,
      before: change.before,
      after: change.after,
      reviewed: change.reviewed,
      status,
    };
  });
  return {
    participant: validation.participant,
    citizenTier: String(resolvedParticipant.citizen.Tier || '').trim(),
    rosterTier: player.tier,
    citizenStatus: String(resolvedParticipant.citizen.Status || '').trim(),
    kind: mutation.kind,
    action: mutation.action,
    verification: mutation.verification,
    statDiff: {
      fields,
      changedCount: fields.filter((field) => field.status !== 'unchanged').length,
      unchangedCount: fields.filter((field) => field.status === 'unchanged').length,
      blankSourceCount: fields.filter((field) => field.status === 'blank-source').length,
      invalidCount: 0,
    },
  };
}

async function preparePreview(readSheet, submissionInput, provenanceInput) {
  const validation = validateSportsSubmission(submissionInput);
  if (!validation.valid) {
    throw routeError('sports_validation_failed', validation.errors.join('; '), 422);
  }
  const result = await loadProjection(readSheet, Number(validation.draft.Cycle));
  const citizenSnapshot = normalizeSnapshot(
    await readSheet(SPORTS_SHEETS.citizens),
    SPORTS_SHEETS.citizens,
  );
  const citizens = citizenRowsFromSnapshot(citizenSnapshot.data);
  let lifeHistoryLogSnapshot = null;
  let rippleLedgerSnapshot = null;
  if (validation.mutation?.kind === 'roster-event') {
    [lifeHistoryLogSnapshot, rippleLedgerSnapshot] = (await Promise.all([
      readSheet(SPORTS_SHEETS.lifeHistoryLog),
      readSheet(SPORTS_SHEETS.rippleLedger),
    ])).map((snapshot, index) => normalizeSnapshot(
      snapshot,
      [SPORTS_SHEETS.lifeHistoryLog, SPORTS_SHEETS.rippleLedger][index],
    ));
  }
  const team = result.projection.teams[validation.team.id];
  let resolution;
  let resolvedParticipant = null;
  if (validation.mutation) {
    resolvedParticipant = resolveMutationParticipant(
      validation,
      team,
      citizens,
    );
    resolution = {
      resolved: [{
        name: validation.participant.name,
        popid: validation.participant.popid,
        source: 'roster+Simulation_Ledger',
      }],
      errors: [],
    };
  } else {
    resolution = resolveNames(
      validation.draft.NamesUsed,
      team.roster,
      citizens,
    );
    if (resolution.errors.length) {
      throw routeError('sports_name_resolution_failed', resolution.errors.join('; '), 422);
    }
  }

  const canonicalDraft = {
    ...validation.draft,
    TeamsUsed: validation.team.id,
  };
  const canonicalSubmission = validation.mutation
    ? {
      draft: canonicalDraft,
      submissionId: validation.submissionId,
      participant: validation.participant,
      mutation: validation.mutation,
    }
    : null;
  const row = projectNewRow(canonicalDraft);
  const rowByHeader = {};
  FEED_HEADERS.forEach((header, index) => { rowByHeader[header] = row[index]; });
  const provenance = sanitizeNotebookProvenance(provenanceInput);
  const mutationPreview = buildMutationPreview(validation, resolvedParticipant);
  const sourcePreconditions = createSportsSourcePreconditions({
    feedRows: result.snapshots.feed.data,
    rosterSnapshot: validation.participant
      ? result.snapshots[
        validation.team.id === 'as' ? 'asRoster' : 'oaksRoster'
      ].data
      : null,
    citizenSnapshot: validation.participant ? citizenSnapshot.data : null,
    lifeHistoryLogSnapshot: lifeHistoryLogSnapshot?.data || null,
    rippleLedgerSnapshot: rippleLedgerSnapshot?.data || null,
    participant: validation.participant,
    action: validation.mutation?.action || null,
  });
  const sourceHash = previewSourceHash(
    result,
    team,
    resolution,
    resolvedParticipant,
    sourcePreconditions,
  );
  const requestMutation = canonicalSubmission
    ? {
      submissionId: canonicalSubmission.submissionId,
      participant: canonicalSubmission.participant,
      mutation: canonicalSubmission.mutation,
    }
    : null;
  return {
    result,
    citizenSnapshot,
    lifeHistoryLogSnapshot,
    rippleLedgerSnapshot,
    validation,
    canonicalDraft,
    canonicalSubmission,
    row,
    rowByHeader,
    provenance,
    sourceHash,
    sourcePreconditions,
    requestHash: sportsRequestHash(
      row,
      provenance,
      requestMutation,
      sourcePreconditions,
    ),
    resolution,
    mutationPreview,
  };
}

export function createSportsHandlers(dependencies) {
  const readSheet = dependencies && dependencies.readSheet;
  const readFreshSheet = dependencies && dependencies.readFreshSheet;
  const readNotebook = dependencies && dependencies.readNotebook
    ? dependencies.readNotebook
    : readDailyInbox;
  const writeSportsFeed = dependencies && dependencies.writeSportsFeed;
  const invalidateSheet = dependencies && dependencies.invalidateSheet;
  const now = dependencies && dependencies.now
    ? dependencies.now
    : () => Date.now();
  if (typeof readSheet !== 'function') throw new Error('readSheet is required');
  const writePolicy = buildWritePolicy(
    dependencies && dependencies.writeConfig,
    { readFreshSheet, writeSportsFeed },
  );

  return {
    overview: async (req, res) => {
      try {
        const requestedCycle = positiveInteger(req.query && req.query.cycle, 'cycle');
        const result = await loadProjection(readSheet, requestedCycle);
        return res.json(envelope({
          source: result.source,
          warnings: result.warnings,
          data: {
            cycle: result.cycle,
            availableCycles: result.cycles,
            events: result.projection.events,
            teams: {
              as: teamSummary(result.projection.teams.as),
              oaks: teamSummary(result.projection.teams.oaks),
            },
          },
        }));
      } catch (error) {
        return sendError(res, error);
      }
    },

    workspace: async (req, res) => {
      try {
        const requestedCycle = positiveInteger(req.query && req.query.cycle, 'cycle');
        let team;
        try {
          team = normalizeDraftTeam(req.query && req.query.team);
        } catch (error) {
          throw routeError('invalid_team', 'team must be as or oaks', 400);
        }
        const result = await loadProjection(readSheet, requestedCycle);
        const projectedTeam = result.projection.teams[team.id];
        const citizenSnapshot = normalizeSnapshot(
          await readSheet(SPORTS_SHEETS.citizens),
          SPORTS_SHEETS.citizens,
        );
        const citizens = citizenRowsFromSnapshot(citizenSnapshot.data);
        const roster = projectedTeam.roster.map((player) => ({
          ...player,
          citizen: citizenWorkspaceState(player, citizens),
        }));
        return res.json(envelope({
          source: {
            ...result.source,
            sheets: {
              ...result.source.sheets,
              [SPORTS_SHEETS.citizens]: {
                fetchedAt: citizenSnapshot.fetchedAt,
                cacheAgeMs: citizenSnapshot.cacheAgeMs,
                cacheHit: citizenSnapshot.cacheHit,
                stale: citizenSnapshot.stale,
              },
            },
          },
          warnings: [...result.warnings, ...citizenSnapshot.warnings],
          data: {
            cycle: result.cycle,
            availableCycles: result.cycles,
            team: {
              ...teamSummary(projectedTeam),
              events: projectedTeam.events,
              roster,
            },
            validEventOptions: {
              eventTypes: EVENT_TYPES,
              seasonTypes: SAFE_ENUMS.SeasonType,
              playerMoods: SAFE_ENUMS.PlayerMood,
              eventTriggers: SAFE_ENUMS.EventTrigger,
              neighborhoods: SAFE_ENUMS.HomeNeighborhood,
              fanSentiments: SAFE_ENUMS.FanSentiment,
              franchiseStability: SAFE_ENUMS.FranchiseStability,
              economicFootprints: SAFE_ENUMS.EconomicFootprint,
              communityInvestments: SAFE_ENUMS.CommunityInvestment,
              mediaProfiles: SAFE_ENUMS.MediaProfile,
            },
            validMutationOptions: {
              verificationSources: VERIFICATION_SOURCES,
              rosterActions: Object.entries(ACTION_MATRIX)
                .filter(([, action]) => action.kind === 'roster-event')
                .map(([action]) => action),
              statFields: Object.values(STAT_FIELD_MAPS[
                team.id === 'as' ? 'As_Roster' : 'Oaks_Roster'
              ]).map((field) => ({
                key: field.key,
                label: field.label,
                column: field.column,
                validator: field.validator,
              })),
            },
            writePolicy: publicWritePolicy(writePolicy),
          },
        }));
      } catch (error) {
        return sendError(res, error);
      }
    },

    notebook: async (req, res) => {
      try {
        const limit = positiveInteger(req.query && req.query.limit, 'limit') || 3;
        if (limit > 7) throw routeError('invalid_query', 'limit must be from 1 to 7', 400);
        const result = readNotebook({ limit });
        const items = Array.isArray(result.items) ? result.items : [];
        return res.json(envelope({
          source: {
            kind: 'local-artifact',
            name: 'NotebookLM Daily News',
            fetchedAt: items[0] ? items[0].generatedAt : null,
            cycle: items[0] ? items[0].cycle : null,
          },
          warnings: Array.isArray(result.warnings) ? result.warnings : [],
          data: { items },
        }));
      } catch (error) {
        const routed = error.status ? error : routeError(
          'notebook_inbox_unavailable',
          'Notebook daily artifacts could not be read',
          500,
          true,
        );
        return sendError(res, routed, 'NotebookLM Daily News');
      }
    },

    preview: async (req, res) => {
      try {
        assertSportsBodySize(req.body);
        const prepared = await preparePreview(
          readSheet,
          req.body,
          req.body && req.body.provenance,
        );
        let confirmation = {
          available: false,
          ...publicWritePolicy(writePolicy),
          reasonCode: writePolicy.reasonCode,
          confirmationPhrase: SPORTS_WRITE_CONFIRMATION,
          expiresAt: null,
          previewToken: null,
          csrfToken: null,
        };
        if (writePolicy.featureEnabled && writePolicy.configured) {
          try {
            assertSecureSameOrigin(req, writePolicy);
            const idempotencyKey = randomUUID();
            const signed = createPreviewToken({
              secret: writePolicy.previewSecret,
              actor: requestActor(req),
              nowMs: now(),
              preview: {
                draft: prepared.canonicalDraft,
                submission: prepared.canonicalSubmission,
                row: prepared.row,
                provenance: prepared.provenance,
                sourceHash: prepared.sourceHash,
                sourcePreconditions: prepared.sourcePreconditions,
                requestHash: prepared.requestHash,
                idempotencyKey,
              },
            });
            confirmation = {
              ...confirmation,
              available: true,
              reasonCode: null,
              expiresAt: signed.expiresAt,
              previewToken: signed.token,
              csrfToken: signed.csrfToken,
            };
          } catch (error) {
            confirmation.reasonCode = error.code || 'sports_write_not_ready';
          }
        }
        return res.json(envelope({
          source: {
            ...prepared.result.source,
            name: 'Oakland sports deterministic preview',
            sheets: {
              ...prepared.result.source.sheets,
              [SPORTS_SHEETS.citizens]: {
                fetchedAt: prepared.citizenSnapshot.fetchedAt,
                cacheAgeMs: prepared.citizenSnapshot.cacheAgeMs,
                cacheHit: prepared.citizenSnapshot.cacheHit,
                stale: prepared.citizenSnapshot.stale,
              },
              ...(prepared.lifeHistoryLogSnapshot ? {
                [SPORTS_SHEETS.lifeHistoryLog]: {
                  fetchedAt: prepared.lifeHistoryLogSnapshot.fetchedAt,
                  cacheAgeMs: prepared.lifeHistoryLogSnapshot.cacheAgeMs,
                  cacheHit: prepared.lifeHistoryLogSnapshot.cacheHit,
                  stale: prepared.lifeHistoryLogSnapshot.stale,
                },
              } : {}),
              ...(prepared.rippleLedgerSnapshot ? {
                [SPORTS_SHEETS.rippleLedger]: {
                  fetchedAt: prepared.rippleLedgerSnapshot.fetchedAt,
                  cacheAgeMs: prepared.rippleLedgerSnapshot.cacheAgeMs,
                  cacheHit: prepared.rippleLedgerSnapshot.cacheHit,
                  stale: prepared.rippleLedgerSnapshot.stale,
                },
              } : {}),
            },
          },
          warnings: [
            ...prepared.result.warnings,
            ...prepared.citizenSnapshot.warnings,
            ...(prepared.lifeHistoryLogSnapshot?.warnings || []),
            ...(prepared.rippleLedgerSnapshot?.warnings || []),
          ],
          data: {
            writePerformed: false,
            team: {
              id: prepared.validation.team.id,
              label: prepared.validation.team.label,
            },
            row: prepared.row,
            rowByHeader: prepared.rowByHeader,
            resolvedNames: prepared.resolution.resolved,
            ripplePreview: buildRipplePreview(
              prepared.validation.draft,
              prepared.resolution.resolved,
              prepared.mutationPreview,
            ),
            mutationPreview: prepared.mutationPreview,
            provenance: prepared.provenance,
            confirmation,
          },
        }));
      } catch (error) {
        return sendError(res, error, 'Oakland sports deterministic preview');
      }
    },

    entries: async (req, res) => {
      try {
        assertSportsBodySize(req.body);
        if (!writePolicy.featureEnabled) {
          throw routeError(
            'sports_write_disabled',
            'Sports feed writes are disabled',
            403
          );
        }
        if (!writePolicy.configured) {
          throw routeError(
            'sports_write_not_ready',
            'Sports feed writes are not fully configured',
            503
          );
        }
        assertSecureSameOrigin(req, writePolicy);
        verifyWriteCapability(req, writePolicy);
        const actor = requestActor(req);
        const preview = verifyPreviewToken({
          secret: writePolicy.previewSecret,
          token: req.body && req.body.previewToken,
          csrfToken: requestHeader(req, 'X-GW-CSRF'),
          actor,
          nowMs: now(),
        });
        if (!req.body || req.body.confirmation !== SPORTS_WRITE_CONFIRMATION) {
          throw routeError(
            'sports_confirmation_required',
            'Explicit sports append confirmation is required',
            400
          );
        }

        const fresh = await preparePreview(
          readFreshSheet,
          preview.submission || preview.draft,
          preview.provenance,
        );
        if (fresh.sourceHash !== preview.sourceHash) {
          throw routeError(
            'sports_source_changed',
            'The feed or roster changed; build a fresh preview before appending',
            409
          );
        }
        if (fresh.requestHash !== preview.requestHash ||
            stableStringify(fresh.sourcePreconditions) !==
              stableStringify(preview.sourcePreconditions) ||
            stableStringify(fresh.row) !== stableStringify(preview.row)) {
          throw routeError(
            'sports_preview_changed',
            'The event no longer matches its preview',
            409
          );
        }

        const result = await writeSportsFeed({
          draft: fresh.canonicalDraft,
          submission: fresh.canonicalSubmission,
          expectedRow: preview.row,
          provenance: fresh.provenance,
          sourcePreconditions: preview.sourcePreconditions,
          requestHash: preview.requestHash,
          idempotencyKey: preview.idempotencyKey,
          actorHash: actorHash(actor),
        });
        if (typeof invalidateSheet === 'function') {
          invalidateSheet(SPORTS_SHEETS.feed);
          if (fresh.canonicalSubmission) {
            invalidateSheet(fresh.canonicalSubmission.participant.rosterSource);
            if (fresh.canonicalSubmission.mutation.kind === 'roster-event') {
              invalidateSheet(SPORTS_SHEETS.citizens);
              invalidateSheet(SPORTS_SHEETS.lifeHistoryLog);
              invalidateSheet(SPORTS_SHEETS.rippleLedger);
            }
          }
        }
        return res.json(envelope({
          source: {
            ...fresh.result.source,
            name: 'Oakland sports verified append',
          },
          warnings: [
            ...fresh.result.warnings,
            ...fresh.citizenSnapshot.warnings,
            ...(fresh.lifeHistoryLogSnapshot?.warnings || []),
            ...(fresh.rippleLedgerSnapshot?.warnings || []),
          ],
          data: result,
        }));
      } catch (error) {
        return sendError(res, error, 'Oakland sports verified append');
      }
    },
  };
}

export function registerSportsRoutes(app, dependencies) {
  const handlers = createSportsHandlers(dependencies);
  app.get('/api/sports/overview', handlers.overview);
  app.get('/api/sports/workspace', handlers.workspace);
  app.get('/api/sports/notebook', handlers.notebook);
  app.post('/api/sports/preview', express.json({ limit: '64kb' }), handlers.preview);
  app.post('/api/sports/entries', express.json({ limit: '64kb' }), handlers.entries);
  return handlers;
}
