/**
 * ============================================================================
 * GENTRIFICATION ENGINE v1.1
 * ============================================================================
 *
 * v1.1 (S204 B2 / 2026-05-06):
 * - Neighborhood_Map range write routed through queueRangeIntent_
 *   (Phase 42 B2). Prior pattern: sheet.getRange(2, 1, rows.length, cols)
 *   .setValues(rows) — direct full-table-from-row-2 replace inside
 *   updateGentrificationPhases_ when any row mutated.
 * - updateGentrificationPhases_ signature: (ss, cycle) → (ctx, cycle).
 *   ss derived inside via ctx.ss; sheet read for getDataRange retained
 *   (read-only sheet access is engine.md-permitted). Single caller updated
 *   (processGentrification_ line 74).
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
  var phaseResults = updateGentrificationPhases_(ctx, cycle);
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

function updateGentrificationPhases_(ctx, cycle) {
  var ss = ctx.ss;
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

    var sheetRow = r + 2; // rows = values.slice(1), so sheet row is r + 2 (1-based, past header)

    // Update if phase changed — T1.5: column-scoped per-cell intents ONLY.
    // The owned cols (GentrificationPhase/StartCycle/DemographicShiftIndex) are
    // non-adjacent, so each is a separate cell intent. A full-width range intent
    // here is clobber-certain: the Phase-10 writer (saveV3NeighborhoodMap_) rebuilds
    // rows 2:N directly and folds engine.33 pulse + chaos residual into the 4 metric
    // cols; executePersistIntents_ flushes queued intents AFTER the writer, so a
    // full-width intent carrying function-start (last-cycle) metric values reverts
    // the fold. Cell-scoping the owned cols leaves the metric cols untouched.
    if (newPhase !== currentPhase) {
      row[iGenPhase] = newPhase;
      queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iGenPhase + 1, newPhase,
        'gentrification phase update', 'civic');

      // Record start cycle if entering gentrification
      if (currentPhase === GENTRIFICATION_PHASES.NONE && newPhase !== GENTRIFICATION_PHASES.NONE) {
        row[iGenStart] = cycle;
        queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iGenStart + 1, cycle,
          'gentrification start cycle', 'civic');
      }

      updated++;
    }

    // Simulate demographic shift index (0-10)
    // Based on rate of change in income, rent, and demographics
    var oldDemoShift = Number(row[iDemoShift]) || 0;
    var demoShift = 0;
    if (incomeChange > 10) demoShift += 2;
    if (incomeChange > 25) demoShift += 2;
    if (rentChange > 15) demoShift += 2;
    if (rentChange > 30) demoShift += 2;
    if (whiteChange > 5) demoShift += 1;
    if (whiteChange > 15) demoShift += 1;

    var newDemoShift = Math.min(demoShift, 10);
    row[iDemoShift] = newDemoShift;
    // T1.5: persist demoShift via its own cell intent whenever it changes. (Pre-fix,
    // this was only flushed by the range intent gated on updated>0 — so a demoShift
    // change with no phase change was silently dropped. Per-cell closes that too.)
    if (newDemoShift !== oldDemoShift && iDemoShift >= 0) {
      queueCellIntent_(ctx, 'Neighborhood_Map', sheetRow, iDemoShift + 1, newDemoShift,
        'gentrification demographic shift index', 'civic');
    }
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
      var accelHook = {
        hookType: 'GENTRIFICATION_ACCELERATING',
        severity: 8,
        description: neighborhood + ' gentrification accelerating: rent up ' + Math.round(rentChange) + '% in 5 years, displacement pressure at ' + displPressure + '/10',
        cycleGenerated: cycle,
        neighborhood: neighborhood,
        rentChange: rentChange,
        incomeChange: incomeChange,
        displacementPressure: displPressure
      };
      ctx.summary.storyHooks.push(accelHook);
      // engine.45 T1: hooks carried cause-in-description but never reached a sheet (trace E4)
      if (typeof recordHookRipple_ === 'function') recordHookRipple_(ctx, 'gentrification', accelHook, 'gentrificationEngine');
      alerts++;
    }

    // GENTRIFICATION_EARLY (first signs)
    if (genPhase === GENTRIFICATION_PHASES.EARLY && (incomeChange > 15 || rentChange > 20)) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      var earlyHook = {
        hookType: 'GENTRIFICATION_EARLY',
        severity: 5,
        description: neighborhood + ' showing early gentrification signs: income +' + Math.round(incomeChange) + '%, rent +' + Math.round(rentChange) + '%',
        cycleGenerated: cycle,
        neighborhood: neighborhood,
        rentChange: rentChange,
        incomeChange: incomeChange
      };
      ctx.summary.storyHooks.push(earlyHook);
      if (typeof recordHookRipple_ === 'function') recordHookRipple_(ctx, 'gentrification', earlyHook, 'gentrificationEngine');
      alerts++;
    }

    // NEIGHBORHOOD_TRANSFORMATION (rapid demographic shift)
    if (demoShift >= 8) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      var shiftHook = {
        hookType: 'NEIGHBORHOOD_TRANSFORMATION',
        severity: 6,
        description: neighborhood + ' demographics shifting rapidly (shift index: ' + demoShift + '/10)',
        cycleGenerated: cycle,
        neighborhood: neighborhood,
        demoShiftIndex: demoShift
      };
      ctx.summary.storyHooks.push(shiftHook);
      if (typeof recordHookRipple_ === 'function') recordHookRipple_(ctx, 'gentrification', shiftHook, 'gentrificationEngine');
      alerts++;
    }

    // DISPLACEMENT_CRISIS (severe pressure)
    if (displPressure >= 8) {
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      var crisisHook = {
        hookType: 'DISPLACEMENT_CRISIS',
        severity: 9,
        description: neighborhood + ' displacement crisis: pressure at ' + displPressure + '/10',
        cycleGenerated: cycle,
        neighborhood: neighborhood,
        displacementPressure: displPressure
      };
      ctx.summary.storyHooks.push(crisisHook);
      if (typeof recordHookRipple_ === 'function') recordHookRipple_(ctx, 'gentrification', crisisHook, 'gentrificationEngine');
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
