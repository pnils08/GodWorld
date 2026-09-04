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

// engine.133 — city health system physics (docs/plans/2026-08-29-city-health-system.md D6).
// Same self-arm contract as engine.94 (seeded when missing, validated when
// present), carried as its own list so the engine.94 fourteen stay exact.
var ENGINE133_CONFIG_SEEDS = [
  ['illnessBaseline', 0.035, 'engine.133 city illness rate resting level; the attractor pulls the rate here', 0, 0.15, false],
  ['illnessAttractorPull', 0.12, 'engine.133 fraction of the (baseline - rate) gap closed per Cycle', 0, 1, false],
  ['illnessEventStrain', 0.015, 'engine.133 city-rate bump per salient weather event that Cycle (frost/snow at half)', 0, 0.1, false],
  ['illnessHoodWeightMin', 0.5, 'engine.133 lower clamp on a hood structural illness weight before envelope normalization', 0.1, 1, false],
  ['illnessHoodWeightMax', 2.0, 'engine.133 upper clamp on a hood structural illness weight before envelope normalization', 1, 5, false]
];

// engine.96 (S413) — business lifecycle tunables, the Task 3 table signed off by the
// builder 2026-08-01 (docs/plans/2026-08-01-business-lifecycle-generator.md). Same
// self-arm contract as engine.133: seeded once, read from ctx.config each Cycle,
// tuned by editing the sheet cell. applyBusinessDynamics_ asserts every key.
var ENGINE96_CONFIG_SEEDS = [
  ['bizDriftMaxUp', 1.0, 'engine.96 max +pp Growth_Rate move per Cycle', 0, 10, false],
  ['bizDriftMaxDown', 1.0, 'engine.96 max -pp Growth_Rate move per Cycle', 0, 10, false],
  ['bizGrowthCeil', 40, 'engine.96 Growth_Rate ceiling (pp)', 0, 100, false],
  ['bizGrowthFloor', -10, 'engine.96 Growth_Rate floor (pp)', -100, 0, false],
  ['bizNoiseBound', 0.25, 'engine.96 seeded noise half-width (pp), texture only', 0, 2, false],
  ['bizVitalityNeutral', 6.0, 'engine.96 hood RetailVitality at which the vitality term is 0', 0, 10, false],
  ['bizVitalityGain', 0.15, 'engine.96 pp drift per vitality point from neutral (clamped +-0.5)', 0, 1, false],
  ['bizSuccessWindow', 3, 'engine.96 consecutive prosperous Cycles before success pressure bites (27.10)', 1, 52, false],
  ['bizSuccessVitalityHigh', 9.0, 'engine.96 hood RetailVitality that counts as prosperous', 0, 10, false],
  ['bizSuccessApprovalHigh', 85, 'engine.96 mayor approval that counts as golden-era', 0, 100, false],
  ['bizSuccessPenalty', 0.3, 'engine.96 pp drift penalty on incumbents under sustained success', 0, 5, false],
  ['bizDisruptBaseChance', 2, 'engine.96 % per-Cycle disruption-shock chance per business (seeded)', 0, 100, false],
  ['bizDisruptSuccessMult', 3, 'engine.96 disruption-chance multiplier while the success window is active', 1, 10, false],
  ['bizDisruptShock', 2.0, 'engine.96 pp one-Cycle negative shock on disruption', 0, 10, false],
  ['bizClosureStreak', 8, 'engine.96 consecutive negative-growth Cycles for closure eligibility (Task 7)', 1, 104, false],
  ['bizClosureRevenueFloorPct', 40, 'engine.96 revenue below this % of the sector mint median closes (Task 7, with the streak)', 0, 100, false],
  ['bizEventShockScale', 1.0, 'engine.96 scale of each event-driven pp contribution; event term capped +-2.0', 0, 5, false],
  ['bizVol_faith', 0.5, 'engine.96 sector volatility multiplier: faith', 0, 5, false],
  ['bizVol_retail', 1.2, 'engine.96 sector volatility multiplier: retail', 0, 5, false],
  ['bizVol_food', 1.3, 'engine.96 sector volatility multiplier: food / nightlife', 0, 5, false],
  ['bizVol_health', 0.7, 'engine.96 sector volatility multiplier: health', 0, 5, false],
  ['bizVol_tech', 1.5, 'engine.96 sector volatility multiplier: tech', 0, 5, false],
  ['bizVol_professional', 0.8, 'engine.96 sector volatility multiplier: professional', 0, 5, false],
  ['bizVol_construction', 1.1, 'engine.96 sector volatility multiplier: construction', 0, 5, false],
  ['bizVol_arts', 1.2, 'engine.96 sector volatility multiplier: arts / media', 0, 5, false],
  ['bizVol_education', 0.6, 'engine.96 sector volatility multiplier: education', 0, 5, false],
  ['bizVol_default', 1.0, 'engine.96 sector volatility multiplier: small neighborhood business (fallback)', 0, 5, false],
  ['bizDeclineStreak', 4, 'engine.96 Task 6: consecutive negative-growth Cycles before a business sheds headcount (proposed S413, not in the signed table)', 1, 52, false]
];

// engine.160 (S414) — one hood rent rule. A hood's MedianRent is this share of
// its Neighborhood_Map MedianIncome (the INSTITUTIONS §Neighborhoods profile,
// engine.135 B1) divided by twelve. The same share as HOME_CARRY_MAX: housing is
// this much of a household's income, whether it rents or carries a mortgage.
// Retired by this rule: the 12-hood 2026 rent table in estimateRent_, the dead
// HOME_PRICES_BY_NEIGHBORHOOD table, and the trajectory engine's multiplicative
// rent drift (rent now follows income; income still drifts).
var ENGINE160_CONFIG_SEEDS = [
  ['hoodRentShare', 0.30, 'engine.160 hood MedianRent = this share of Neighborhood_Map MedianIncome / 12; the one rent rule every lease and house price reads', 0.05, 0.6, false]
];

function ensureEngine160Config_(ss) {
  if (!ss) throw new Error('engine.160 config: spreadsheet required');
  var configSheet = ss.getSheetByName('World_Config');
  if (!configSheet) throw new Error('engine.160 config: World_Config not found');
  var plan = inspectEngine94Config_(configSheet.getDataRange().getValues(), ENGINE160_CONFIG_SEEDS);
  if (plan.additions.length > 0) {
    configSheet.getRange(configSheet.getLastRow() + 1, 1, plan.additions.length, 3).setValues(plan.additions);
    var verified = inspectEngine94Config_(configSheet.getDataRange().getValues(), ENGINE160_CONFIG_SEEDS);
    if (verified.additions.length > 0) throw new Error('engine.160 config: post-write verification failed');
  }
  Logger.log('engine.160 config ready: seeded ' + plan.additions.length + ' row(s)');
  return { configSeeded: plan.additions.length };
}

var ENGINE157_CONFIG_SEEDS = [
  ['maneuverClimbBar', 60, 'engine.157 ambition (drive-weighted blend of drive + openness, 0-100) at/over which a citizen plays to climb; also the openness bar for a willing field change', 50, 90, false],
  ['maneuverRetreatDebt', 6, 'engine.157 DebtLevel at/over which a citizen pulls in (retreat) whatever their ambition', 3, 9, false],
  ['maneuverStandingMargin', 5, 'engine.157 a heritage line whose standing sits within this many points of the bar below its tier puts its members in retreat', 0, 20, false],
  ['maneuverClimbOdds', 1.5, 'engine.157 odds multiplier a climb posture applies to the casino placement, solo door, home purchase and relocation rolls', 1, 3, false],
  ['maneuverRetreatOdds', 0.5, 'engine.157 odds multiplier a retreat posture applies to the same rolls', 0, 1, false],
  ['maneuverDriveWeight', 0.7, 'engine.157 weight of drive in the ambition blend (openness carries the rest)', 0, 1, false]
];

function ensureEngine157Config_(ss) {
  if (!ss) throw new Error('engine.157 config: spreadsheet required');
  var configSheet = ss.getSheetByName('World_Config');
  if (!configSheet) throw new Error('engine.157 config: World_Config not found');
  var plan = inspectEngine94Config_(configSheet.getDataRange().getValues(), ENGINE157_CONFIG_SEEDS);
  if (plan.additions.length > 0) {
    configSheet.getRange(configSheet.getLastRow() + 1, 1, plan.additions.length, 3).setValues(plan.additions);
    var verified = inspectEngine94Config_(configSheet.getDataRange().getValues(), ENGINE157_CONFIG_SEEDS);
    if (verified.additions.length > 0) throw new Error('engine.157 config: post-write verification failed');
  }
  Logger.log('engine.157 config ready: seeded ' + plan.additions.length + ' row(s)');
  return { configSeeded: plan.additions.length };
}

function ensureEngine96Config_(ss) {
  if (!ss) throw new Error('engine.96 config: spreadsheet required');
  var configSheet = ss.getSheetByName('World_Config');
  if (!configSheet) throw new Error('engine.96 config: World_Config not found');
  var plan = inspectEngine94Config_(configSheet.getDataRange().getValues(), ENGINE96_CONFIG_SEEDS);
  if (plan.additions.length > 0) {
    configSheet.getRange(configSheet.getLastRow() + 1, 1, plan.additions.length, 3).setValues(plan.additions);
    var verified = inspectEngine94Config_(configSheet.getDataRange().getValues(), ENGINE96_CONFIG_SEEDS);
    if (verified.additions.length > 0) throw new Error('engine.96 config: post-write verification failed');
  }
  Logger.log('engine.96 config ready: seeded ' + plan.additions.length + ' row(s)');
  return { configSeeded: plan.additions.length };
}

var ENGINE135_CONFIG_SEEDS = [
  ['employmentAttractorPull', 0.12, 'engine.135 fraction of the (attractor - rate) gap the city employment dial closes per Cycle', 0, 1, false],
  ['employmentHoodWeightMin', 0.5, 'engine.135 lower clamp on a hood structural employment weight before envelope normalization', 0.1, 1, false],
  ['employmentHoodWeightMax', 2.0, 'engine.135 upper clamp on a hood structural employment weight before envelope normalization', 1, 5, false],
  ['employmentConvergenceRate', 0.25, 'engine.135 fraction of a hood Unemployed gap closed per Cycle (floor 3)', 0.05, 1, false]
];

var ENGINE94_CIVIC_STATE_COLUMNS = [
  'HighApprovalStreak',
  'AutoScandalUntilCycle',
  'AutoScandalSource'
];

function inspectEngine94Config_(values, seedList) {
  var seeds = seedList || ENGINE94_CONFIG_SEEDS;
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
  for (var i = 0; i < seeds.length; i++) {
    var spec = seeds[i];
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

// engine.133 — self-arm the city-health physics keys. Runs right after the
// engine.94 contract at the same call site; same inspect → append → verify shape.
function ensureEngine135Config_(ss) {
  if (!ss) throw new Error('engine.135 config: spreadsheet required');
  var configSheet = ss.getSheetByName('World_Config');
  if (!configSheet) throw new Error('engine.135 config: World_Config not found');
  var plan = inspectEngine94Config_(configSheet.getDataRange().getValues(), ENGINE135_CONFIG_SEEDS);
  if (plan.additions.length > 0) {
    configSheet.getRange(configSheet.getLastRow() + 1, 1, plan.additions.length, 3).setValues(plan.additions);
    var verified = inspectEngine94Config_(configSheet.getDataRange().getValues(), ENGINE135_CONFIG_SEEDS);
    if (verified.additions.length > 0) throw new Error('engine.135 config: post-write verification failed');
  }
  Logger.log('engine.135 config ready: seeded ' + plan.additions.length + ' row(s)');
  return { configSeeded: plan.additions.length };
}

function ensureEngine133Config_(ss) {
  if (!ss) throw new Error('engine.133 config: spreadsheet required');
  var configSheet = ss.getSheetByName('World_Config');
  if (!configSheet) throw new Error('engine.133 config: World_Config not found');
  var plan = inspectEngine94Config_(configSheet.getDataRange().getValues(), ENGINE133_CONFIG_SEEDS);
  if (plan.additions.length > 0) {
    configSheet.getRange(configSheet.getLastRow() + 1, 1, plan.additions.length, 3).setValues(plan.additions);
    var verified = inspectEngine94Config_(configSheet.getDataRange().getValues(), ENGINE133_CONFIG_SEEDS);
    if (verified.additions.length > 0) throw new Error('engine.133 config: post-write verification failed');
  }
  Logger.log('engine.133 config ready: seeded ' + plan.additions.length + ' row(s)');
  return { configSeeded: plan.additions.length };
}
