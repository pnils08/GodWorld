/**
 * ============================================================================
 * GENTRIFICATION ENGINE v1.0
 * ============================================================================
 *
 * Tracks gentrification phases, displacement pressure, and neighborhood transformation.
 *
 * Part of: Week 4 Gentrification & Migration Tracking
 *
 * Features:
 * - Gentrification phase detection (none → early → accelerating → advanced → stable-affluent)
 * - Displacement pressure calculation (0-10 scale)
 * - Demographic shift tracking (income, education, race changes)
 * - Neighborhood transformation detection
 * - Story hooks for gentrification events
 *
 * Integration:
 * - Reads Neighborhood_Map for current state
 * - Reads Simulation_Ledger for citizen demographics
 * - Reads Household_Ledger for income/rent data
 * - Writes gentrification metrics to Neighborhood_Map
 * - Generates story hooks for dramatic changes
 *
 * Story Hooks:
 * - GENTRIFICATION_ACCELERATING (severity 8): Neighborhood enters accelerating phase
 * - DISPLACEMENT_CRISIS (severity 9): 10+ citizens at severe displacement risk
 * - NEIGHBORHOOD_TRANSFORMATION (severity 6): Demographics shift dramatically
 * - GENTRIFICATION_EARLY (severity 5): First signs of gentrification
 *
 * ============================================================================
 */

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

var GENTRIFICATION_PHASES = {
  NONE: 'none',
  EARLY: 'early',
  ACCELERATING: 'accelerating',
  ADVANCED: 'advanced',
  STABLE_AFFLUENT: 'stable-affluent'
};

// Thresholds for phase detection (% change over 5 years)
var PHASE_THRESHOLDS = {
  EARLY_INCOME: 10,
  EARLY_RENT: 15,
  ACCELERATING_INCOME: 25,
  ACCELERATING_RENT: 30,
  ADVANCED_INCOME: 50,
  ADVANCED_RENT: 60
};


// ════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE
// ════════════════════════════════════════════════════════════════════════════

function processGentrification_(ctx) {
  var ss = ctx.ss;
  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;

  Logger.log('processGentrification_ v1.0: Starting...');

  var results = {
    analyzed: 0,
    gentrifying: 0,
    phasesUpdated: 0,
    alerts: 0
  };

  // Step 1: Update gentrification phases for all neighborhoods
  var phaseResults = updateGentrificationPhases_(ss, cycle);
  results.analyzed = phaseResults.analyzed;
  results.phasesUpdated = phaseResults.updated;
  results.gentrifying = phaseResults.gentrifying;

  // Step 2: Check for displacement crises and generate hooks
  var hookResults = generateGentrificationHooks_(ss, ctx, cycle);
  results.alerts = hookResults.alerts;

  Logger.log('processGentrification_ v1.0: Complete.');
  Logger.log('  Analyzed: ' + results.analyzed + ', Gentrifying: ' + results.gentrifying + ', Alerts: ' + results.alerts);

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// GENTRIFICATION PHASE DETECTION
// ════════════════════════════════════════════════════════════════════════════

function updateGentrificationPhases_(ss, cycle) {
  var sheet = ss.getSheetByName('Neighborhood_Map');
  if (!sheet) return { analyzed: 0, updated: 0, gentrifying: 0 };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { analyzed: 0, updated: 0, gentrifying: 0 };

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };
  var iNeighborhood = idx('Neighborhood');
  var iGenPhase = idx('GentrificationPhase');
  var iDisplPressure = idx('DisplacementPressure');
  var iGenStart = idx('GentrificationStartCycle');
  var iIncomeChange = idx('MedianIncomeChange5yr');
  var iRentChange = idx('MedianRentChange5yr');
  var iDemoShift = idx('DemographicShiftIndex');
  var iWhiteChange = idx('WhitePopulationChange5yr');
  var iHighEd = idx('HighEducationPct');

  if (iGenPhase < 0) return { analyzed: 0, updated: 0, gentrifying: 0 };

  var analyzed = 0;
  var updated = 0;
  var gentrifying = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var neighborhood = row[iNeighborhood];
    var currentPhase = (row[iGenPhase] || 'none').toString().toLowerCase();
    var incomeChange = Number(row[iIncomeChange]) || 0;
    var rentChange = Number(row[iRentChange]) || 0;
    var whiteChange = Number(row[iWhiteChange]) || 0;
    var highEdPct = Number(row[iHighEd]) || 45;
    var displPressure = Number(row[iDisplPressure]) || 0;

    // Detect new phase
    var newPhase = detectGentrificationPhase_(
      incomeChange,
      rentChange,
      whiteChange,
      highEdPct,
      displPressure
    );

    analyzed++;

    // Count gentrifying neighborhoods
    if (newPhase !== GENTRIFICATION_PHASES.NONE && newPhase !== GENTRIFICATION_PHASES.STABLE_AFFLUENT) {
      gentrifying++;
    }

    // Update if phase changed
    if (newPhase !== currentPhase) {
      row[iGenPhase] = newPhase;

      // Record start cycle if entering gentrification
      if (currentPhase === GENTRIFICATION_PHASES.NONE && newPhase !== GENTRIFICATION_PHASES.NONE) {
        row[iGenStart] = cycle;
      }

      updated++;
    }

    // Simulate demographic shift index (0-10)
    // Based on rate of change in income, rent, and demographics
    var demoShift = 0;
    if (incomeChange > 10) demoShift += 2;
    if (incomeChange > 25) demoShift += 2;
    if (rentChange > 15) demoShift += 2;
    if (rentChange > 30) demoShift += 2;
    if (whiteChange > 5) demoShift += 1;
    if (whiteChange > 15) demoShift += 1;

    row[iDemoShift] = Math.min(demoShift, 10);
  }

  if (updated > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { analyzed: analyzed, updated: updated, gentrifying: gentrifying };
}

function detectGentrificationPhase_(incomeChange, rentChange, whiteChange, highEdPct, displPressure) {
  // No gentrification
  if (incomeChange < PHASE_THRESHOLDS.EARLY_INCOME && rentChange < PHASE_THRESHOLDS.EARLY_RENT) {
    // Check if already stable-affluent (high education, high income, low pressure)
    if (highEdPct > 60 && displPressure < 3) {
      return GENTRIFICATION_PHASES.STABLE_AFFLUENT;
    }
    return GENTRIFICATION_PHASES.NONE;
  }

  // Early gentrification
  if (incomeChange >= PHASE_THRESHOLDS.EARLY_INCOME && incomeChange < PHASE_THRESHOLDS.ACCELERATING_INCOME &&
      rentChange >= PHASE_THRESHOLDS.EARLY_RENT && rentChange < PHASE_THRESHOLDS.ACCELERATING_RENT) {
    return GENTRIFICATION_PHASES.EARLY;
  }

  // Accelerating gentrification
  if (incomeChange >= PHASE_THRESHOLDS.ACCELERATING_INCOME && incomeChange < PHASE_THRESHOLDS.ADVANCED_INCOME &&
      rentChange >= PHASE_THRESHOLDS.ACCELERATING_RENT && rentChange < PHASE_THRESHOLDS.ADVANCED_RENT &&
      displPressure >= 6) {
    return GENTRIFICATION_PHASES.ACCELERATING;
  }

  // Advanced gentrification
  if (incomeChange >= PHASE_THRESHOLDS.ADVANCED_INCOME &&
      rentChange >= PHASE_THRESHOLDS.ADVANCED_RENT &&
      displPressure >= 8) {
    return GENTRIFICATION_PHASES.ADVANCED;
  }

  // Stable affluent (gentrification complete)
  if (incomeChange < 5 && rentChange < 10 && highEdPct > 60) {
    return GENTRIFICATION_PHASES.STABLE_AFFLUENT;
  }

  // Default to early if any significant change
  if (incomeChange >= PHASE_THRESHOLDS.EARLY_INCOME || rentChange >= PHASE_THRESHOLDS.EARLY_RENT) {
    return GENTRIFICATION_PHASES.EARLY;
  }

  return GENTRIFICATION_PHASES.NONE;
}


// ════════════════════════════════════════════════════════════════════════════
// STORY HOOKS
// ════════════════════════════════════════════════════════════════════════════

function generateGentrificationHooks_(ss, ctx, cycle) {
  var sheet = ss.getSheetByName('Neighborhood_Map');
  if (!sheet) return { alerts: 0 };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { alerts: 0 };

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };
  var iNeighborhood = idx('Neighborhood');
  var iGenPhase = idx('GentrificationPhase');
  var iDisplPressure = idx('DisplacementPressure');
  var iIncomeChange = idx('MedianIncomeChange5yr');
  var iRentChange = idx('MedianRentChange5yr');
  var iDemoShift = idx('DemographicShiftIndex');

  var alerts = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var neighborhood = row[iNeighborhood];
    var genPhase = (row[iGenPhase] || 'none').toString().toLowerCase();
    var displPressure = Number(row[iDisplPressure]) || 0;
    var incomeChange = Number(row[iIncomeChange]) || 0;
    var rentChange = Number(row[iRentChange]) || 0;
    var demoShift = Number(row[iDemoShift]) || 0;

    // GENTRIFICATION_ACCELERATING
    if (genPhase === GENTRIFICATION_PHASES.ACCELERATING) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'GENTRIFICATION_ACCELERATING',
        severity: 8,
        description: neighborhood + ' gentrification accelerating: rent up ' + Math.round(rentChange) + '% in 5 years, displacement pressure at ' + displPressure + '/10',
        cycleGenerated: cycle,
        neighborhood: neighborhood,
        rentChange: rentChange,
        incomeChange: incomeChange,
        displacementPressure: displPressure
      });
      alerts++;
    }

    // GENTRIFICATION_EARLY (first signs)
    if (genPhase === GENTRIFICATION_PHASES.EARLY && (incomeChange > 15 || rentChange > 20)) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'GENTRIFICATION_EARLY',
        severity: 5,
        description: neighborhood + ' showing early gentrification signs: income +' + Math.round(incomeChange) + '%, rent +' + Math.round(rentChange) + '%',
        cycleGenerated: cycle,
        neighborhood: neighborhood,
        rentChange: rentChange,
        incomeChange: incomeChange
      });
      alerts++;
    }

    // NEIGHBORHOOD_TRANSFORMATION (rapid demographic shift)
    if (demoShift >= 8) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'NEIGHBORHOOD_TRANSFORMATION',
        severity: 6,
        description: neighborhood + ' demographics shifting rapidly (shift index: ' + demoShift + '/10)',
        cycleGenerated: cycle,
        neighborhood: neighborhood,
        demoShiftIndex: demoShift
      });
      alerts++;
    }

    // DISPLACEMENT_CRISIS (severe pressure)
    if (displPressure >= 8) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'DISPLACEMENT_CRISIS',
        severity: 9,
        description: neighborhood + ' displacement crisis: pressure at ' + displPressure + '/10',
        cycleGenerated: cycle,
        neighborhood: neighborhood,
        displacementPressure: displPressure
      });
      alerts++;
    }
  }

  return { alerts: alerts };
}


// ════════════════════════════════════════════════════════════════════════════
// EXPORTS (for testing)
// ════════════════════════════════════════════════════════════════════════════

// Entry point called from godWorldEngine2.js
// processGentrification_(ctx)
