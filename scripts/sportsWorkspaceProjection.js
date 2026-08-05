'use strict';

const {
  STAT_FIELD_MAPS,
  TEAM_CONFIG,
  normalizeTeam,
} = require('./sportsFeedContract');

const STATE_FIELDS = Object.freeze([
  'SeasonType', 'Team Record', 'Streak', 'FanSentiment', 'FranchiseStability',
  'EconomicFootprint', 'CommunityInvestment', 'MediaProfile'
]);
const POPID_RE = /^POP-\d{5}$/;
const AS_READ_ONLY_STATS = Object.freeze([
  Object.freeze({ key: 'pitching.sv', columnIndex: 18, label: 'SV' }),
  Object.freeze({ key: 'baseball.war', columnIndex: 21, label: 'WAR' }),
]);
const ROSTER_SCHEMAS = Object.freeze({
  as: Object.freeze({
    sheetName: 'As_Roster',
    headers: Object.freeze([
      'POPID', 'First', 'Middle', 'Last', 'Tier', 'Position', 'Team', 'Salary',
      'AB', 'AVG', 'H', 'HR', 'RBI', 'SB', 'SO', 'IP', 'ERA', 'W-L', 'SV', 'SO',
      'BB', 'WAR',
    ]),
    stats: Object.freeze([
      ...Object.values(STAT_FIELD_MAPS.As_Roster),
      ...AS_READ_ONLY_STATS,
    ].sort((left, right) => left.columnIndex - right.columnIndex)),
  }),
  oaks: Object.freeze({
    sheetName: 'Oaks_Roster',
    headers: Object.freeze([
      'POPID', 'First', 'Middle', 'Last', 'Tier', 'Position', 'Team', 'Salary',
      'PPG', 'ASST', 'REB', 'STL', 'FG%', '3P%',
    ]),
    stats: Object.freeze(Object.values(STAT_FIELD_MAPS.Oaks_Roster)),
  }),
});

function value(row, header) {
  const alternatives = [header, header.replace(/\s+/g, ''), header[0].toLowerCase() + header.slice(1), header.replace(/\s+(\w)/g, (_, c) => c.toUpperCase())];
  for (const key of alternatives) if (row && row[key] != null) return String(row[key]).trim();
  return '';
}
function rowNumber(row, index) { return Number.isInteger(row && row.__rowNumber) ? row.__rowNumber : index + 2; }
function parseCycle(row) { const raw = value(row, 'Cycle'); return /^\d+$/.test(raw) ? Number(raw) : null; }
function eventFromRow(row, index, team, cycle) {
  const event = { cycle, sourceRow: rowNumber(row, index), teamId: team.id, team: team.sheetValue, legacyTeamAlias: team.legacy };
  ['SeasonType', 'EventType', 'NamesUsed', 'Notes', 'Stats', 'Team Record', 'StoryAngle', 'PlayerMood', 'EventTrigger', 'HomeNeighborhood', 'Streak', 'FanSentiment', 'FranchiseStability', 'EconomicFootprint', 'CommunityInvestment', 'MediaProfile'].forEach((header) => { event[header] = value(row, header); });
  return event;
}

function rawValue(values, index) {
  return values && values[index] != null ? String(values[index]).trim() : '';
}

function validateRosterHeaders(headers, teamId) {
  const schema = ROSTER_SCHEMAS[teamId];
  if (!Array.isArray(headers)) {
    throw new Error(`${schema.sheetName} raw snapshot headers must be an array`);
  }
  const actual = headers.map((header) => String(header == null ? '' : header).trim());
  const expected = schema.headers;
  const mismatchIndex = expected.findIndex((header, index) => actual[index] !== header);
  if (actual.length !== expected.length || mismatchIndex !== -1) {
    const position = mismatchIndex !== -1
      ? mismatchIndex + 1
      : Math.min(actual.length, expected.length) + 1;
    throw new Error(
      `${schema.sheetName} header layout mismatch at physical column ${position}; ` +
      `expected ${expected.join(', ')} but received ${actual.join(', ')}`
    );
  }
}

function projectRoster(snapshot, teamId, warnings) {
  const schema = ROSTER_SCHEMAS[teamId];
  if (snapshot == null) {
    warnings.push(`${TEAM_CONFIG[teamId].label} roster is unavailable`);
    return [];
  }
  if (Array.isArray(snapshot)) {
    throw new Error(
      `${schema.sheetName} must use a duplicate-header-safe raw snapshot; object rows are not accepted`
    );
  }
  if (!snapshot || !Array.isArray(snapshot.rows)) {
    throw new Error(`${schema.sheetName} raw snapshot rows must be an array`);
  }
  validateRosterHeaders(snapshot.headers, teamId);

  return snapshot.rows.map((row, index) => {
    if (!row || !Array.isArray(row.values)) {
      throw new Error(`${schema.sheetName} raw snapshot row ${index + 1} must carry a values array`);
    }
    if (!Number.isInteger(row.rowNumber) || row.rowNumber < 2) {
      throw new Error(`${schema.sheetName} raw snapshot row ${index + 1} has an invalid physical row number`);
    }
    const cells = row.values;
    const popid = rawValue(cells, 0);
    const firstName = rawValue(cells, 1);
    const middleName = rawValue(cells, 2);
    const lastName = rawValue(cells, 3);
    const name = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(' ');
    const validPopid = POPID_RE.test(popid);
    if (!validPopid) warnings.push(`${TEAM_CONFIG[teamId].label} roster row ${row.rowNumber} has malformed POPID${popid ? `: ${popid}` : ''}`);
    const stats = {};
    const statValues = {};
    schema.stats.forEach((stat) => {
      const current = rawValue(cells, stat.columnIndex);
      statValues[stat.key] = current;
      if (current) stats[stat.label] = current;
    });
    return {
      sourceRow: row.rowNumber,
      popid,
      validPopid,
      name,
      firstName,
      middleName,
      lastName,
      tier: rawValue(cells, 4),
      position: rawValue(cells, 5),
      team: rawValue(cells, 6),
      salary: rawValue(cells, 7),
      stats,
      statValues,
    };
  });
}

function projectSportsWorkspace(input) {
  const source = input || {};
  const cycle = Number(source.cycle);
  if (!Number.isInteger(cycle) || cycle <= 0) throw new Error('cycle must be a positive integer');
  if (source.feedRows != null && !Array.isArray(source.feedRows)) throw new Error('feedRows must be an array');
  const warnings = [];
  const teams = {};
  Object.keys(TEAM_CONFIG).forEach((id) => {
    const config = TEAM_CONFIG[id];
    const roster = source[`${id}Roster`] != null ? source[`${id}Roster`] : source.rosters && source.rosters[id];
    teams[id] = { id, label: config.label, sheetValue: config.sheetValue, events: [], state: {}, roster: projectRoster(roster, id, warnings) };
  });
  (source.feedRows || []).forEach((row, index) => {
    const rowCycle = parseCycle(row);
    if (rowCycle == null) { warnings.push(`Feed row ${rowNumber(row, index)} has invalid Cycle`); return; }
    if (rowCycle > cycle) return;
    let team;
    try { team = normalizeTeam(value(row, 'TeamsUsed')); }
    catch (error) { warnings.push(`Feed row ${rowNumber(row, index)} ignored: ${error.message}`); return; }
    if (team.legacy) warnings.push(`Feed row ${rowNumber(row, index)} uses legacy team alias ${team.input}`);
    const target = teams[team.id];
    STATE_FIELDS.forEach((field) => {
      const next = value(row, field);
      if (!next) return;
      const prior = target.state[field];
      const nextRow = rowNumber(row, index);
      if (prior && rowCycle === cycle && prior.sourceCycle === cycle && prior.value !== next) {
        warnings.push(`${target.label} ${field} conflicts in Cycle ${cycle}; latest Sheet row wins`);
      }
      const isNewer = !prior ||
        rowCycle > prior.sourceCycle ||
        (rowCycle === prior.sourceCycle && nextRow >= prior.sourceRow);
      if (isNewer) {
        target.state[field] = { value: next, sourceCycle: rowCycle, sourceRow: nextRow };
      }
    });
    if (rowCycle === cycle) target.events.push(eventFromRow(row, index, team, rowCycle));
  });
  Object.values(teams).forEach((team) => {
    team.events.sort((a, b) => a.sourceRow - b.sourceRow);
    team.rosterCount = team.roster.length;
  });
  return { cycle, events: Object.values(teams).flatMap((team) => team.events), teams, freshness: source.freshness || null, warnings };
}

module.exports = {
  STATE_FIELDS,
  POPID_RE,
  ROSTER_SCHEMAS,
  projectSportsWorkspace,
};
