/**
 * engine94SheetContract.js — code-carried Sheet contract for engine.94.
 *
 * A production deploy carries Apps Script code, not sandbox Sheet mutations.
 * Before the first cache read or Cycle mutation, this guard:
 *   - seeds missing engine.94 World_Config rows with the approved calibration;
 *   - appends the three approval-ceiling state headers when missing;
 *   - preserves valid operator-tuned config values;
 *   - rejects duplicates, malformed values, or schema conflicts before writing.
 *
 * The seed values are one-time migration payload, not runtime fallbacks.
 * Consumers continue to read and validate ctx.config every Cycle.
 */

var ENGINE94_CONFIG_SEEDS = [
  ['griefDurationCycles', 3, 'engine.94 ordinary grief duration in Cycles', 1, 52, true],
  ['griefHolidayDurationCycles', 5, 'engine.94 stress-holiday grief duration in Cycles', 1, 52, true],
  ['griefParticipationMultiplier', 0.80, 'engine.94 active-grief atmospheric participation multiplier', 0, 2, false],
  ['griefPublicActivityMultiplier', 0.75, 'engine.94 public and out-and-about pool multiplier', 0, 2, false],
  ['griefSupportMultiplier', 1.25, 'engine.94 living-support pool multiplier', 0, 2, false],
  ['griefResponseChance', 0.35, 'engine.94 maximum-one reserved response probability', 0, 1, false],
  ['approvalCeilingThreshold', 80, 'engine.94 approval at or above this value advances the high-approval streak', 1, 100, false],
  ['approvalCeilingMinStreakCycles', 3, 'engine.94 minimum consecutive high-approval Cycles before scandal rolls', 1, 1000, true],
  ['approvalCeilingBaseChance', 0.05, 'engine.94 scandal probability at the minimum streak', 0, 1, false],
  ['approvalCeilingChanceStep', 0.05, 'engine.94 added scandal probability per high-approval Cycle beyond the minimum', 0, 1, false],
  ['approvalCeilingMaxChance', 0.30, 'engine.94 maximum per-Cycle high-approval scandal probability', 0, 1, false],
  ['approvalCeilingScandalDurationCycles', 3, 'engine.94 auto-scandal duration in Cycles', 1, 1000, true],
  ['approvalCeilingApprovalDrop', 12, 'engine.94 immediate approval-point drop when an auto-scandal fires', 0, 100, false],
  ['approvalCeilingElectionPenalty', 25, 'engine.94 incumbent-score penalty while Status is scandal', 0, 100, false]
];

var ENGINE94_CIVIC_STATE_COLUMNS = [
  'HighApprovalStreak',
  'AutoScandalUntilCycle',
  'AutoScandalSource'
];

function inspectEngine94Config_(values) {
  var header = values[0] || [];
  if (header[0] !== 'Key' || header[1] !== 'Value' || header[2] !== 'Description') {
    throw new Error('engine.94 Sheet contract: World_Config A:C header must be Key, Value, Description');
  }

  var byKey = {};
  for (var r = 1; r < values.length; r++) {
    var key = String((values[r] || [])[0] || '').trim();
    if (!key) continue;
    if (Object.prototype.hasOwnProperty.call(byKey, key)) {
      throw new Error('engine.94 Sheet contract: duplicate World_Config key ' + key);
    }
    byKey[key] = { rowNumber: r + 1, row: values[r] };
  }

  var additions = [];
  var existing = [];
  var normalized = {};
  for (var i = 0; i < ENGINE94_CONFIG_SEEDS.length; i++) {
    var spec = ENGINE94_CONFIG_SEEDS[i];
    var current = byKey[spec[0]];
    if (!current) {
      additions.push([spec[0], spec[1], spec[2]]);
      normalized[spec[0]] = spec[1];
      continue;
    }
    var raw = current.row[1];
    var value = Number(raw);
    if (raw === '' || raw === null || raw === undefined || typeof raw === 'boolean' ||
        !isFinite(value) || value < spec[3] || value > spec[4] ||
        (spec[5] && Math.floor(value) !== value)) {
      throw new Error('engine.94 Sheet contract: invalid World_Config.' + spec[0]);
    }
    existing.push({ key: spec[0], rowNumber: current.rowNumber, value: value });
    normalized[spec[0]] = value;
  }
  if (normalized.approvalCeilingBaseChance > normalized.approvalCeilingMaxChance) {
    throw new Error('engine.94 Sheet contract: approvalCeilingBaseChance exceeds approvalCeilingMaxChance');
  }
  return { additions: additions, existing: existing, normalized: normalized };
}
function inspectEngine94CivicHeader_(header) {
  var required = ['OfficeId', 'Status', 'Approval'];
  for (var r = 0; r < required.length; r++) {
    if (header.indexOf(required[r]) < 0) {
      throw new Error('engine.94 Sheet contract: Civic_Office_Ledger missing ' + required[r]);
    }
  }

  var positions = [];
  for (var i = 0; i < ENGINE94_CIVIC_STATE_COLUMNS.length; i++) {
    var name = ENGINE94_CIVIC_STATE_COLUMNS[i];
    var count = 0;
    var position = -1;
    for (var h = 0; h < header.length; h++) {
      if (header[h] === name) {
        count++;
        position = h;
      }
    }
    if (count > 1) throw new Error('engine.94 Sheet contract: duplicate civic header ' + name);
    positions.push(position);
  }

  var lastNonBlank = -1;
  for (var j = 0; j < header.length; j++) {
    if (String(header[j] || '').trim()) lastNonBlank = j;
  }
  var presentCount = 0;
  for (var p = 0; p < positions.length; p++) if (positions[p] >= 0) presentCount++;

  if (presentCount === positions.length) {
    if (positions[1] !== positions[0] + 1 || positions[2] !== positions[1] + 1) {
      throw new Error('engine.94 Sheet contract: civic state headers are not contiguous/in order');
    }
    return { additions: [], existing: ENGINE94_CIVIC_STATE_COLUMNS.slice(), startIndex: positions[0] };
  }

  if (presentCount > 0) {
    for (var q = 0; q < presentCount; q++) {
      if (positions[q] < 0) {
        throw new Error('engine.94 Sheet contract: civic state header prefix is incomplete');
      }
    }
    if (positions[presentCount - 1] !== lastNonBlank) {
      throw new Error('engine.94 Sheet contract: partial civic state headers are not at the append edge');
    }
    return {
      additions: ENGINE94_CIVIC_STATE_COLUMNS.slice(presentCount),
      existing: ENGINE94_CIVIC_STATE_COLUMNS.slice(0, presentCount),
      startIndex: positions[0]
    };
  }

  return {
    additions: ENGINE94_CIVIC_STATE_COLUMNS.slice(),
    existing: [],
    startIndex: lastNonBlank + 1
  };
}

function readEngine94CivicHeader_(sheet) {
  var width = Math.max(1, sheet.getLastColumn());
  return sheet.getRange(1, 1, 1, width).getValues()[0] || [];
}

function ensureEngine94SheetContract_(ss) {
  if (!ss) throw new Error('engine.94 Sheet contract: spreadsheet required');
  var configSheet = ss.getSheetByName('World_Config');
  var civicSheet = ss.getSheetByName('Civic_Office_Ledger');
  if (!configSheet) throw new Error('engine.94 Sheet contract: World_Config not found');
  if (!civicSheet) throw new Error('engine.94 Sheet contract: Civic_Office_Ledger not found');

  // Inspect both surfaces before the first write. A conflict leaves the Sheet
  // and the world untouched.
  var configPlan = inspectEngine94Config_(configSheet.getDataRange().getValues());
  var headerPlan = inspectEngine94CivicHeader_(readEngine94CivicHeader_(civicSheet));

  if (configPlan.additions.length > 0) {
    configSheet.getRange(configSheet.getLastRow() + 1, 1, configPlan.additions.length, 3)
      .setValues(configPlan.additions);
  }

  if (headerPlan.additions.length > 0) {
    var startColumn = headerPlan.startIndex + headerPlan.existing.length + 1;
    var endColumn = startColumn + headerPlan.additions.length - 1;
    var maxColumns = civicSheet.getMaxColumns();
    if (endColumn > maxColumns) {
      civicSheet.insertColumnsAfter(maxColumns, endColumn - maxColumns);
    }
    civicSheet.getRange(1, startColumn, 1, headerPlan.additions.length)
      .setValues([headerPlan.additions]);
  }

  if (configPlan.additions.length > 0 || headerPlan.additions.length > 0) {
    var verifiedConfig = inspectEngine94Config_(configSheet.getDataRange().getValues());
    var verifiedHeader = inspectEngine94CivicHeader_(readEngine94CivicHeader_(civicSheet));
    if (verifiedConfig.additions.length > 0 || verifiedHeader.additions.length > 0) {
      throw new Error('engine.94 Sheet contract: post-write verification failed');
    }
  }

  Logger.log('engine.94 Sheet contract ready: seeded ' + configPlan.additions.length +
    ' config row(s), added ' + headerPlan.additions.length + ' civic header(s)');
  return {
    configSeeded: configPlan.additions.length,
    civicHeadersAdded: headerPlan.additions.length
  };
}
