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
  'game-result', 'roster-move', 'player-feature', 'front-office',
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
  SAFE_ENUMS, REQUIRED_FIELDS,
  normalizeTeam, normalizeDraftTeam, filterFeedRowsForCycle, splitOaklandFeedEntries,
  validateDraft, projectNewRow
};
