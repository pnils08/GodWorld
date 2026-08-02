'use strict';

/**
 * Oakland Sports Workspace shared contract.
 * Pure helpers only: no Sheet, file, or network access.
 */

const FEED_HEADERS = Object.freeze([
  'Cycle', 'SeasonType', 'EventType', 'TeamsUsed', 'NamesUsed', 'Notes',
  'Stats', 'Team Record', 'VideoGameDate', 'VideoGame', 'StoryAngle',
  'PlayerMood', 'EventTrigger', 'HomeNeighborhood', 'Streak',
  'FanSentiment', 'FranchiseStability', 'EconomicFootprint',
  'CommunityInvestment', 'MediaProfile'
]);

const TEAM_CONFIG = Object.freeze({
  as: Object.freeze({ id: 'as', label: "The A's", sheetValue: "A's", aliases: [] }),
  oaks: Object.freeze({ id: 'oaks', label: 'The Oaks', sheetValue: 'Oaks', aliases: ['NBA', 'Warriors'] })
});

const EVENT_TYPES = Object.freeze([
  'game-result', 'stat-capture', 'roster-move', 'player-feature', 'front-office',
  'fan-civic', 'season-state', 'editorial-note'
]);
const SEASON_TYPES = Object.freeze([
  'off-season', 'spring-training', 'preseason', 'early-season', 'mid-season',
  'late-season', 'regular-season', 'playoffs', 'post-season', 'championship',
  'finals', 'world-series'
]);
const OAKLAND_NEIGHBORHOODS = Object.freeze([
  '', 'Downtown', 'Jack London', 'Rockridge', 'Temescal', 'Fruitvale',
  'West Oakland', 'Lake Merritt', 'Piedmont Ave', 'Grand Lake', 'Montclair',
  'Chinatown', 'Old Oakland', 'Laurel', 'Dimond', 'Glenview', 'Eastlake'
]);
const SAFE_ENUMS = Object.freeze({
  SeasonType: SEASON_TYPES,
  EventType: EVENT_TYPES,
  PlayerMood: Object.freeze(['', 'confident', 'frustrated', 'hungry', 'reflective', 'dominant', 'uncertain', 'locked-in', 'quiet', 'electric']),
  EventTrigger: Object.freeze(['', 'hot-streak', 'cold-streak', 'playoff-push', 'playoff-clinch', 'eliminated', 'championship', 'rivalry', 'home-opener', 'season-finale', 'trade-deadline', 'all-star', 'draft']),
  HomeNeighborhood: OAKLAND_NEIGHBORHOODS,
  FanSentiment: Object.freeze(['', 'electric', 'euphoric', 'high', 'confident', 'excited', 'neutral', 'moderate', 'uncertain', 'anxious', 'low', 'apathetic', 'disappointed', 'frustrated', 'angry', 'hostile']),
  FranchiseStability: Object.freeze(['', 'stable', 'strong', 'growing', 'uncertain', 'unstable', 'crisis', 'relocating']),
  EconomicFootprint: Object.freeze(['', 'growing', 'booming', 'stable', 'steady', 'shrinking', 'declining', 'uncertain']),
  CommunityInvestment: Object.freeze(['', 'active', 'strong', 'heavy', 'moderate', 'growing', 'passive', 'minimal', 'declining', 'none', 'absent']),
  MediaProfile: Object.freeze(['', 'local', 'regional', 'national', 'international'])
});

const REQUIRED_FIELDS = Object.freeze(['Cycle', 'SeasonType', 'EventType', 'TeamsUsed']);
const RECORD_RE = /^\d+\s*[-–]\s*\d+$/;
const STREAK_RE = /^[WL]\d+$/;
const POPID_RE = /^POP-\d{5}$/;
const SUBMISSION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const NON_NEGATIVE_INTEGER_RE = /^\d+$/;
const NON_NEGATIVE_DECIMAL_RE = /^(?:\d+(?:\.\d+)?|\.\d+)$/;
const BASEBALL_INNINGS_RE = /^\d+(?:\.[012])?$/;
const VERIFICATION_SOURCES = Object.freeze([
  'manual-verified',
  'screenshot-verified',
]);
const ROSTER_SOURCES = Object.freeze({
  As_Roster: Object.freeze({ teamId: 'as', sheetName: 'As_Roster' }),
  Oaks_Roster: Object.freeze({ teamId: 'oaks', sheetName: 'Oaks_Roster' }),
});

function statField(key, column, columnIndex, header, label, validator) {
  return Object.freeze({ key, column, columnIndex, header, label, validator });
}

const STAT_FIELD_MAPS = Object.freeze({
  As_Roster: Object.freeze({
    'batting.ab': statField('batting.ab', 'I', 8, 'AB', 'AB', 'integer'),
    'batting.avg': statField('batting.avg', 'J', 9, 'AVG', 'AVG', 'rate'),
    'batting.h': statField('batting.h', 'K', 10, 'H', 'H', 'integer'),
    'batting.hr': statField('batting.hr', 'L', 11, 'HR', 'HR', 'integer'),
    'batting.rbi': statField('batting.rbi', 'M', 12, 'RBI', 'RBI', 'integer'),
    'batting.sb': statField('batting.sb', 'N', 13, 'SB', 'SB', 'integer'),
    'batting.so': statField('batting.so', 'O', 14, 'SO', 'Batting SO', 'integer'),
    'pitching.ip': statField('pitching.ip', 'P', 15, 'IP', 'IP', 'innings'),
    'pitching.era': statField('pitching.era', 'Q', 16, 'ERA', 'ERA', 'decimal'),
    'pitching.wl': statField('pitching.wl', 'R', 17, 'W-L', 'W-L', 'record'),
    'pitching.so': statField('pitching.so', 'S', 18, 'SO', 'Pitching SO', 'integer'),
    'pitching.bb': statField('pitching.bb', 'T', 19, 'BB', 'BB', 'integer'),
  }),
  Oaks_Roster: Object.freeze({
    'basketball.ppg': statField('basketball.ppg', 'I', 8, 'PPG', 'PPG', 'decimal'),
    'basketball.asst': statField('basketball.asst', 'J', 9, 'ASST', 'ASST', 'decimal'),
    'basketball.reb': statField('basketball.reb', 'K', 10, 'REB', 'REB', 'decimal'),
    'basketball.stl': statField('basketball.stl', 'L', 11, 'STL', 'STL', 'decimal'),
    'basketball.fgPct': statField('basketball.fgPct', 'M', 12, 'FG%', 'FG%', 'percentage'),
    'basketball.threePct': statField('basketball.threePct', 'N', 13, '3P%', '3P%', 'percentage'),
  }),
});

const ACTION_MATRIX = Object.freeze({
  'stat-capture': Object.freeze({
    kind: 'stat-line',
    eventType: 'stat-capture',
    requiredFields: Object.freeze([]),
    optionalFields: Object.freeze([]),
  }),
  injury: Object.freeze({
    kind: 'roster-event',
    eventType: 'roster-move',
    requiredFields: Object.freeze([
      'citizen.status',
      'citizen.statusStartCycle',
      'citizen.healthCause',
    ]),
    optionalFields: Object.freeze([]),
  }),
  return: Object.freeze({
    kind: 'roster-event',
    eventType: 'roster-move',
    requiredFields: Object.freeze([
      'citizen.status',
      'citizen.statusStartCycle',
      'citizen.healthCause',
    ]),
    optionalFields: Object.freeze([]),
  }),
  'call-up': Object.freeze({
    kind: 'roster-event',
    eventType: 'roster-move',
    requiredFields: Object.freeze([
      'roster.team',
      'roster.position',
      'citizen.status',
      'citizen.roleType',
    ]),
    optionalFields: Object.freeze([]),
  }),
  'trade-away': Object.freeze({
    kind: 'roster-event',
    eventType: 'roster-move',
    requiredFields: Object.freeze([
      'roster.team',
      'citizen.status',
      'citizen.roleType',
    ]),
    optionalFields: Object.freeze(['roster.position']),
  }),
  'season-close': Object.freeze({
    kind: 'season-close',
    eventType: 'stat-capture',
    requiredFields: Object.freeze([]),
    optionalFields: Object.freeze([]),
    dedicatedContractPending: true,
  }),
});

const ROSTER_EVENT_FIELDS = Object.freeze({
  'roster.team': Object.freeze({
    surface: 'roster',
    header: 'Team',
    label: 'Roster Team',
  }),
  'roster.position': Object.freeze({
    surface: 'roster',
    header: 'Position',
    label: 'Roster Position',
  }),
  'citizen.status': Object.freeze({
    surface: 'citizen',
    header: 'Status',
    label: 'Citizen Status',
  }),
  'citizen.roleType': Object.freeze({
    surface: 'citizen',
    header: 'RoleType',
    label: 'Citizen RoleType',
  }),
  'citizen.statusStartCycle': Object.freeze({
    surface: 'citizen',
    header: 'StatusStartCycle',
    label: 'Status Start Cycle',
  }),
  'citizen.healthCause': Object.freeze({
    surface: 'citizen',
    header: 'HealthCause',
    label: 'Health Cause',
  }),
});

const ROSTER_EVENT_EFFECT_TYPES = Object.freeze({
  injury: 'roster-injury',
  return: 'roster-return',
  'call-up': 'roster-call-up',
  'trade-away': 'roster-trade-away',
});

function text(value) {
  return value == null ? '' : String(value).trim();
}

function normalizeTeam(value, options) {
  const input = text(value);
  const key = input.toLowerCase();
  const allowLegacy = !options || options.allowLegacy !== false;
  for (const team of Object.values(TEAM_CONFIG)) {
    if (key === team.id || key === team.sheetValue.toLowerCase() || key === team.label.toLowerCase()) {
      return { ...team, legacy: false, input };
    }
    if (allowLegacy && team.aliases.some((alias) => key === alias.toLowerCase())) {
      return { ...team, legacy: true, input };
    }
  }
  throw new Error(`Unknown Oakland sports team: ${input || '(blank)'}`);
}

function normalizeDraftTeam(value) {
  const input = text(value);
  if (!Object.prototype.hasOwnProperty.call(TEAM_CONFIG, input)) {
    throw new Error(`Unknown Oakland sports team: ${input || '(blank)'}`);
  }
  return { ...TEAM_CONFIG[input], legacy: false, input };
}

function filterFeedRowsForCycle(rows, cycle) {
  const target = Number(cycle);
  if (!Number.isInteger(target) || target <= 0) {
    throw new Error('Cycle must be a positive integer');
  }
  return (rows || []).filter((row) => Number(row && (row.Cycle ?? row.cycle)) === target);
}

function splitOaklandFeedEntries(rows) {
  const result = { as: [], oaks: [], warnings: [] };
  (rows || []).forEach((row, index) => {
    const rawTeam = row && (row.TeamsUsed ?? row.teamsUsed ?? row.teams);
    try {
      const team = normalizeTeam(rawTeam);
      result[team.id].push(row);
      if (team.legacy) {
        result.warnings.push(`Row ${index + 1} uses legacy team alias ${team.input}; read as ${team.sheetValue}`);
      }
    } catch (error) {
      result.warnings.push(`Row ${index + 1} skipped: ${error.message}`);
    }
  });
  return result;
}

function validateDraft(draft) {
  const source = draft || {};
  const value = {};
  const errors = [];
  FEED_HEADERS.forEach((header) => { value[header] = text(source[header]); });
  const cycle = Number(value.Cycle);
  if (!Number.isInteger(cycle) || cycle <= 0) errors.push('Cycle must be a positive integer');
  else value.Cycle = String(cycle);

  for (const header of REQUIRED_FIELDS.slice(1)) {
    if (!value[header]) errors.push(`${header} is required`);
  }
  let team;
  if (value.TeamsUsed) {
    try {
      team = normalizeDraftTeam(value.TeamsUsed);
      value.TeamsUsed = team.sheetValue;
    } catch (error) { errors.push(error.message); }
  }
  Object.entries(SAFE_ENUMS).forEach(([header, allowed]) => {
    if (value[header] && !allowed.includes(value[header])) errors.push(`${header} has unsupported value: ${value[header]}`);
  });
  if (value['Team Record'] && !RECORD_RE.test(value['Team Record'])) errors.push('Team Record must use whole-number W-L format');
  if (value.EventType === 'game-result' && !value['Team Record']) errors.push('Team Record is required for game-result');
  if (value.Streak && !STREAK_RE.test(value.Streak)) errors.push('Streak must use W<n> or L<n> format');
  if (value.VideoGameDate || value.VideoGame) errors.push('VideoGameDate and VideoGame must be blank');
  return { valid: errors.length === 0, errors, value, team: team || null };
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function isNonNegativeDecimal(value) {
  return NON_NEGATIVE_DECIMAL_RE.test(value) && Number.isFinite(Number(value));
}

function isUnitRate(value) {
  return isNonNegativeDecimal(value) && Number(value) >= 0 && Number(value) <= 1;
}

function isPercentage(value) {
  const raw = value.endsWith('%') ? value.slice(0, -1) : value;
  return isNonNegativeDecimal(raw) && Number(raw) >= 0 && Number(raw) <= 100;
}

function statValueError(field, value, validator) {
  if (validator === 'integer' && !NON_NEGATIVE_INTEGER_RE.test(value)) {
    return `${field} must be a non-negative integer`;
  }
  if (validator === 'rate' && !isUnitRate(value)) {
    return `${field} must be a decimal from 0 through 1`;
  }
  if (validator === 'innings' && !BASEBALL_INNINGS_RE.test(value)) {
    return `${field} must use baseball innings with .0, .1, or .2`;
  }
  if (validator === 'decimal' && !isNonNegativeDecimal(value)) {
    return `${field} must be a non-negative decimal`;
  }
  if (validator === 'record' && !RECORD_RE.test(value)) {
    return `${field} must use whole-number W-L format`;
  }
  if (validator === 'percentage' && !isPercentage(value)) {
    return `${field} must be from 0 through 100 with an optional %`;
  }
  return null;
}

function validateParticipant(source, draftTeam, errors) {
  if (!isRecord(source)) {
    errors.push('participant must be one object');
    return null;
  }
  const popid = text(source.popid);
  const name = text(source.name);
  const rosterSource = text(source.rosterSource);
  const sourceRow = Number(source.sourceRow);
  if (!POPID_RE.test(popid)) errors.push('participant.popid must use POP-XXXXX');
  if (!name) errors.push('participant.name is required');
  const roster = ROSTER_SOURCES[rosterSource];
  if (!roster) {
    errors.push('participant.rosterSource must be As_Roster or Oaks_Roster');
  } else if (draftTeam && roster.teamId !== draftTeam.id) {
    errors.push('participant.rosterSource must match the draft team');
  }
  if (!Number.isInteger(sourceRow) || sourceRow < 2) {
    errors.push('participant.sourceRow must be a physical Sheet row of 2 or greater');
  }
  return { popid, name, rosterSource, sourceRow };
}

function validateVerification(source, errors) {
  if (!isRecord(source)) {
    errors.push('mutation.verification must be an object');
    return null;
  }
  const verificationSource = text(source.source);
  if (!VERIFICATION_SOURCES.includes(verificationSource)) {
    errors.push('mutation.verification.source must be manual-verified or screenshot-verified');
  }
  if (source.confirmed !== true) {
    errors.push('mutation.verification.confirmed must be true');
  }
  return {
    source: verificationSource,
    confirmed: source.confirmed === true,
  };
}

function normalizeChanges(source, errors) {
  if (!Array.isArray(source) || source.length === 0) {
    errors.push('mutation.changes must contain at least one field change');
    return [];
  }
  const seen = new Set();
  return source.map((change, index) => {
    if (!isRecord(change)) {
      errors.push(`mutation.changes[${index}] must be an object`);
      return null;
    }
    const field = text(change.field);
    if (!field) errors.push(`mutation.changes[${index}].field is required`);
    else if (seen.has(field)) errors.push(`mutation.changes contains duplicate field: ${field}`);
    seen.add(field);
    if (!hasOwn(change, 'before') || change.before == null ||
        !['string', 'number'].includes(typeof change.before)) {
      errors.push(`mutation.changes[${index}].before must be an explicit string or number`);
    }
    if (!hasOwn(change, 'after') || change.after == null ||
        !['string', 'number'].includes(typeof change.after)) {
      errors.push(`mutation.changes[${index}].after must be an explicit string or number`);
    }
    if (typeof change.before === 'string' &&
        /[\r\n\u2028\u2029]/.test(change.before)) {
      errors.push(`mutation.changes[${index}].before must be a single-line value`);
    }
    if (typeof change.after === 'string' &&
        /[\r\n\u2028\u2029]/.test(change.after)) {
      errors.push(`mutation.changes[${index}].after must be a single-line value`);
    }
    return {
      field,
      before: hasOwn(change, 'before') && change.before != null ? text(change.before) : '',
      after: hasOwn(change, 'after') && change.after != null ? text(change.after) : '',
      reviewed: change.reviewed === true,
    };
  }).filter(Boolean);
}

function changeMap(changes) {
  return new Map(changes.map((change) => [change.field, change]));
}

function requireActionFields(action, changes, errors) {
  const allowed = new Set([...action.requiredFields, ...action.optionalFields]);
  const byField = changeMap(changes);
  action.requiredFields.forEach((field) => {
    if (!byField.has(field)) errors.push(`mutation.changes must include ${field}`);
  });
  changes.forEach((change) => {
    if (!allowed.has(change.field)) {
      errors.push(`mutation field is not allowed for this action: ${change.field}`);
    }
  });
}

function requireNonblankChange(change, errors) {
  if (!change) return;
  if (!change.before) errors.push(`${change.field}.before must be explicit and nonblank`);
  if (!change.after) errors.push(`${change.field}.after must be explicit and nonblank`);
}

function validateStatusTransition(actionName, changes, cycle, errors) {
  const byField = changeMap(changes);
  const status = byField.get('citizen.status');
  const statusStart = byField.get('citizen.statusStartCycle');
  const healthCause = byField.get('citizen.healthCause');
  if (actionName === 'injury') {
    if (status && !['active', 'recovering'].includes(status.before.toLowerCase())) {
      errors.push('injury citizen.status.before must be Active or recovering');
    }
    if (status && !['injured', 'serious-condition'].includes(status.after)) {
      errors.push('injury citizen.status.after must be injured or serious-condition');
    }
    if (statusStart && statusStart.after !== String(cycle)) {
      errors.push('injury citizen.statusStartCycle.after must equal the draft Cycle');
    }
    if (healthCause && !healthCause.after) {
      errors.push('injury citizen.healthCause.after is required');
    }
  }
  if (actionName === 'return') {
    if (status &&
        !['injured', 'serious-condition', 'recovering'].includes(status.before.toLowerCase())) {
      errors.push('return citizen.status.before must be injured, serious-condition, or recovering');
    }
    if (status && status.after !== 'Active') {
      errors.push('return citizen.status.after must be Active');
    }
    if (statusStart && statusStart.after) {
      errors.push('return citizen.statusStartCycle.after must be blank');
    }
    if (healthCause && healthCause.after) {
      errors.push('return citizen.healthCause.after must be blank');
    }
  }
}

function validateRosterAction(actionName, changes, cycle, errors) {
  const byField = changeMap(changes);
  if (actionName === 'injury' || actionName === 'return') {
    validateStatusTransition(actionName, changes, cycle, errors);
    return;
  }
  ['roster.team', 'roster.position', 'citizen.roleType'].forEach((field) => {
    requireNonblankChange(byField.get(field), errors);
  });
  const status = byField.get('citizen.status');
  if (status && status.before.toLowerCase() !== 'active') {
    errors.push(`${actionName} citizen.status.before must be Active`);
  }
  const expectedStatus = actionName === 'call-up' ? 'Active' : 'Traded';
  if (status && status.after !== expectedStatus) {
    errors.push(`${actionName} citizen.status.after must be ${expectedStatus}`);
  }
  const team = byField.get('roster.team');
  if (team && team.before === team.after) {
    errors.push(`${actionName} roster.team must change`);
  }
}

function validateStatChanges(participant, changes, errors) {
  const fields = participant && STAT_FIELD_MAPS[participant.rosterSource];
  if (!fields) return;
  let changedCount = 0;
  changes.forEach((change) => {
    const spec = fields[change.field];
    if (!spec) {
      errors.push(`mutation stat field is not allowed for ${participant.rosterSource}: ${change.field}`);
      return;
    }
    if (!change.after) {
      if (change.before) errors.push(`${change.field}.after must not erase a nonblank current value`);
      return;
    }
    if (change.before) {
      const beforeError = statValueError(change.field, change.before, spec.validator);
      if (beforeError) errors.push(`${beforeError} in before`);
    }
    const afterError = statValueError(change.field, change.after, spec.validator);
    if (afterError) errors.push(`${afterError} in after`);
    if (change.before !== change.after) {
      changedCount += 1;
      if (!change.reviewed) errors.push(`${change.field} must be reviewed before preview`);
    }
  });
  if (!changedCount) errors.push('stat-capture must change at least one field');
}

function actionSummary(actionName, changes) {
  const byField = changeMap(changes);
  if (actionName === 'injury') {
    return `entered ${byField.get('citizen.status').after} status with cause: ` +
      `${byField.get('citizen.healthCause').after}.`;
  }
  if (actionName === 'return') {
    return 'returned to Active status.';
  }
  if (actionName === 'call-up') {
    return `was called up from ${byField.get('roster.team').before} to ` +
      `${byField.get('roster.team').after}, Position ` +
      `${byField.get('roster.position').before} → ` +
      `${byField.get('roster.position').after}, RoleType ` +
      `${byField.get('citizen.roleType').before} → ` +
      `${byField.get('citizen.roleType').after}.`;
  }
  if (actionName === 'trade-away') {
    const position = byField.get('roster.position');
    const positionText = position
      ? `, Position ${position.before} → ${position.after}`
      : '';
    return `was traded from ${byField.get('roster.team').before} to ` +
      `${byField.get('roster.team').after}${positionText}, RoleType ` +
      `${byField.get('citizen.roleType').before} → ` +
      `${byField.get('citizen.roleType').after}.`;
  }
  throw new Error(`Unsupported roster event action: ${actionName}`);
}

function projectRosterEventMutation(validation, current) {
  if (!validation || !validation.valid ||
      !validation.mutation || validation.mutation.kind !== 'roster-event') {
    throw new Error('A valid roster-event submission is required');
  }
  const roster = current && current.roster;
  const citizen = current && current.citizen;
  if (!isRecord(roster) || !isRecord(citizen)) {
    throw new Error('Exact roster and citizen state are required');
  }

  const stateDiff = validation.mutation.changes.map((change) => {
    const spec = ROSTER_EVENT_FIELDS[change.field];
    if (!spec) throw new Error(`Unsupported roster event field: ${change.field}`);
    const surface = spec.surface === 'roster' ? roster : citizen;
    const currentValue = text(surface[spec.header]);
    if (currentValue !== change.before) {
      throw new Error(`${change.field} no longer matches its reviewed before value`);
    }
    return {
      field: change.field,
      surface: spec.surface,
      header: spec.header,
      label: spec.label,
      before: change.before,
      after: change.after,
      changed: change.before !== change.after,
    };
  });

  const cycle = Number(validation.draft.Cycle);
  const name = validation.participant.name;
  const summary = actionSummary(validation.mutation.action, validation.mutation.changes);
  const lifeLine = `C${cycle} — [SportsRoster] ${name} ${summary}`;
  const lifeBefore = citizen.LifeHistory == null
    ? ''
    : String(citizen.LifeHistory);
  const eventTag = 'SportsRoster|source:sports|' +
    `submission:${validation.submissionId}|action:${validation.mutation.action}`;
  const neighborhood = text(citizen.Neighborhood);
  const lifeHistoryLogRow = [
    `C${cycle}`,
    validation.participant.popid,
    name,
    eventTag,
    summary,
    neighborhood,
    String(cycle),
  ];
  const rippleRow = [
    String(cycle),
    'sports',
    validation.submissionId,
    `${name} ${summary}`,
    ROSTER_EVENT_EFFECT_TYPES[validation.mutation.action],
    'citizen',
    validation.participant.popid,
    neighborhood,
    '1',
    '1',
    '',
    'sportsFeedWriter.engine77',
    `C${cycle}`,
  ];

  return {
    participant: {
      ...validation.participant,
      citizenSourceRow: Number(citizen.sourceRow),
      citizenTier: text(citizen.Tier),
      rosterTier: text(roster.Tier),
    },
    kind: validation.mutation.kind,
    action: validation.mutation.action,
    verification: validation.mutation.verification,
    stateDiff: {
      fields: stateDiff,
      changedCount: stateDiff.filter((field) => field.changed).length,
    },
    lifeHistory: {
      line: lifeLine,
      before: lifeBefore,
      after: lifeBefore ? `${lifeBefore}\n${lifeLine}` : lifeLine,
      eventTag,
      eventText: summary,
      logRow: lifeHistoryLogRow,
    },
    ripple: {
      effectType: ROSTER_EVENT_EFFECT_TYPES[validation.mutation.action],
      row: rippleRow,
    },
    tradeWarning: validation.mutation.action === 'trade-away'
      ? 'This citizen leaves Oakland but remains unarchived until engine.90.'
      : null,
  };
}

function validateSportsSubmission(input) {
  const wrapped = isRecord(input) && hasOwn(input, 'draft');
  const source = wrapped ? input : { draft: input };
  const draft = validateDraft(source.draft);
  const errors = draft.errors.slice();
  const hasMutation = source.mutation != null;

  if (!hasMutation) {
    if (source.participant != null || source.participants != null) {
      errors.push('participant is only allowed with a mutation');
    }
    return {
      valid: errors.length === 0,
      errors,
      draft: draft.value,
      team: draft.team,
      submissionId: null,
      participant: null,
      mutation: null,
    };
  }

  if (source.participants != null || Array.isArray(source.participant)) {
    errors.push('exactly one participant object is allowed');
  }
  const submissionId = text(source.submissionId);
  if (!SUBMISSION_ID_RE.test(submissionId)) {
    errors.push('submissionId must be 8-128 safe identifier characters');
  }
  const participant = validateParticipant(source.participant, draft.team, errors);
  const mutationSource = source.mutation;
  if (!isRecord(mutationSource)) {
    errors.push('mutation must be an object');
    return {
      valid: false,
      errors,
      draft: draft.value,
      team: draft.team,
      submissionId,
      participant,
      mutation: null,
    };
  }

  const kind = text(mutationSource.kind);
  const actionName = text(mutationSource.action);
  const action = ACTION_MATRIX[actionName];
  if (!action) errors.push(`mutation.action is unsupported: ${actionName || '(blank)'}`);
  else if (kind !== action.kind) {
    errors.push(`mutation.kind for ${actionName} must be ${action.kind}`);
  }
  if (action && draft.value.EventType !== action.eventType) {
    errors.push(`${actionName} requires draft EventType ${action.eventType}`);
  }
  if (!draft.value.NamesUsed) {
    errors.push('a mutation requires draft NamesUsed');
  } else if (participant && draft.value.NamesUsed !== participant.name) {
    errors.push('draft NamesUsed must exactly match the selected participant name');
  }
  const verification = validateVerification(mutationSource.verification, errors);
  const changes = normalizeChanges(mutationSource.changes, errors);

  if (action && action.dedicatedContractPending) {
    errors.push('season-close row payload belongs to the dedicated TrueSource preview contract');
  } else if (actionName === 'stat-capture') {
    if (!draft.value.Stats) errors.push('stat-capture requires a nonblank draft Stats summary');
    validateStatChanges(participant, changes, errors);
  } else if (action) {
    requireActionFields(action, changes, errors);
    validateRosterAction(actionName, changes, draft.value.Cycle, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    draft: draft.value,
    team: draft.team,
    submissionId,
    participant,
    mutation: {
      kind,
      action: actionName,
      changes,
      verification,
    },
  };
}

function projectNewRow(draft) {
  const result = validateDraft(draft);
  if (!result.valid) {
    const error = new Error(`Invalid Oakland sports draft: ${result.errors.join('; ')}`);
    error.validation = result;
    throw error;
  }
  return FEED_HEADERS.map((header) => result.value[header]);
}

module.exports = {
  FEED_HEADERS, TEAM_CONFIG, EVENT_TYPES, SEASON_TYPES, OAKLAND_NEIGHBORHOODS,
  SAFE_ENUMS, REQUIRED_FIELDS, POPID_RE, ROSTER_SOURCES, STAT_FIELD_MAPS,
  ACTION_MATRIX, ROSTER_EVENT_FIELDS, ROSTER_EVENT_EFFECT_TYPES,
  VERIFICATION_SOURCES,
  normalizeTeam, normalizeDraftTeam, filterFeedRowsForCycle, splitOaklandFeedEntries,
  validateDraft, validateSportsSubmission, projectNewRow,
  projectRosterEventMutation,
};
