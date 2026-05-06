/**
 * ============================================================================
 * FINALIZE WORLD POPULATION v1.2 (S203 — v1.1 calendar path removed)
 * ============================================================================
 *
 * PURPOSE: Writes complete cycle summary data to World_Population sheet
 *
 * v1.2 Changes (S203 [engine-sheet] header-drift detector audit):
 * - Removed v1.1 calendar field writes (season/holiday/holidayPriority/
 *   isFirstFriday/isCreationDay/sportsSeason/month). Those columns were never
 *   added to live World_Population schema — every write silently no-op'd via
 *   the `idx(name) >= 0` guards. Calendar values flow through ctx.summary
 *   per-cycle (Phase 1 advanceSimulationCalendar_), so persistence is
 *   redundant. Phase 7 mediaRoomIntake.getCurrentCalendarContext_ now reads
 *   from ctx.summary directly (also fixed S203).
 *
 * PROBLEM SOLVED: updateWorldPopulation_() runs in Phase 3, before most
 * cycle data exists. This function runs in Phase 9 AFTER all signals,
 * weather, dynamics, and flags are calculated.
 *
 * INTEGRATION: Phase 9 in runWorldCycle():
 *   applyCompressedDigestSummary_(ctx);
 *   applyCycleWeightForLatestCycle_(ctx);
 *   finalizeWorldPopulation_(ctx);
 *
 * SHEET: World_Population (single-row state sheet, row 2 = data)
 *
 * WRITES TO COLUMNS (live schema, post-S203):
 *   - cycle
 *   - cycleWeight
 *   - cycleWeightReason
 *   - civicLoad
 *   - migrationDrift
 *   - patternFlag
 *   - shockFlag
 *   - worldEventsCount
 *   - weatherType
 *   - weatherImpact
 *   - trafficLoad
 *   - retailLoad
 *   - tourismLoad
 *   - nightlifeLoad
 *   - publicSpacesLoad
 *   - sentiment
 *   - timestamp
 *
 * DOES NOT TOUCH (handled by updateWorldPopulation_):
 *   - totalPopulation
 *   - illnessRate
 *   - employmentRate
 *   - migration
 *   - economy
 *
 * ============================================================================
 */

function finalizeWorldPopulation_(ctx) {
  // DRY-RUN FIX: Skip direct sheet writes in dry-run mode
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (isDryRun) {
    Logger.log('finalizeWorldPopulation_: Skipping (dry-run mode)');
    return;
  }

  var sheet = ctx.ss.getSheetByName('World_Population');
  if (!sheet) {
    Logger.log('finalizeWorldPopulation_: World_Population sheet not found');
    return;
  }

  // Get header row to find column indices
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    Logger.log('finalizeWorldPopulation_: No columns found');
    return;
  }

  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var dataRow = 2; // World_Population is single-row state sheet

  // Helper to find column index (returns -1 if not found)
  var idx = function(name) {
    return header.indexOf(name);
  };

  // Pull summary data from context
  var S = ctx.summary || {};
  var D = S.cityDynamics || {};
  var W = S.weather || {};

  // -------------------------------------------------------------------------
  // CYCLE METADATA
  // -------------------------------------------------------------------------
  
  if (idx('cycle') >= 0) {
    sheet.getRange(dataRow, idx('cycle') + 1).setValue(S.cycleId || '');
  }
  
  if (idx('cycleWeight') >= 0) {
    sheet.getRange(dataRow, idx('cycleWeight') + 1).setValue(S.cycleWeight || '');
  }
  
  if (idx('cycleWeightReason') >= 0) {
    sheet.getRange(dataRow, idx('cycleWeightReason') + 1).setValue(S.cycleWeightReason || '');
  }

  // -------------------------------------------------------------------------
  // SIGNALS & FLAGS
  // -------------------------------------------------------------------------
  
  if (idx('civicLoad') >= 0) {
    sheet.getRange(dataRow, idx('civicLoad') + 1).setValue(S.civicLoad || '');
  }
  
  if (idx('migrationDrift') >= 0) {
    sheet.getRange(dataRow, idx('migrationDrift') + 1).setValue(S.migrationDrift || 0);
  }
  
  if (idx('patternFlag') >= 0) {
    sheet.getRange(dataRow, idx('patternFlag') + 1).setValue(S.patternFlag || '');
  }
  
  if (idx('shockFlag') >= 0) {
    sheet.getRange(dataRow, idx('shockFlag') + 1).setValue(S.shockFlag || '');
  }

  // -------------------------------------------------------------------------
  // WORLD EVENTS
  // -------------------------------------------------------------------------

  if (idx('worldEventsCount') >= 0) {
    var eventsArray = S.worldEvents || [];
    sheet.getRange(dataRow, idx('worldEventsCount') + 1).setValue(eventsArray.length);
  }

  // -------------------------------------------------------------------------
  // WEATHER
  // -------------------------------------------------------------------------
  
  if (idx('weatherType') >= 0) {
    sheet.getRange(dataRow, idx('weatherType') + 1).setValue(W.type || '');
  }
  
  if (idx('weatherImpact') >= 0) {
    sheet.getRange(dataRow, idx('weatherImpact') + 1).setValue(W.impact || '');
  }

  // -------------------------------------------------------------------------
  // CITY DYNAMICS
  // -------------------------------------------------------------------------
  
  if (idx('trafficLoad') >= 0) {
    sheet.getRange(dataRow, idx('trafficLoad') + 1).setValue(D.traffic || '');
  }
  
  if (idx('retailLoad') >= 0) {
    sheet.getRange(dataRow, idx('retailLoad') + 1).setValue(D.retail || '');
  }
  
  if (idx('tourismLoad') >= 0) {
    sheet.getRange(dataRow, idx('tourismLoad') + 1).setValue(D.tourism || '');
  }
  
  if (idx('nightlifeLoad') >= 0) {
    sheet.getRange(dataRow, idx('nightlifeLoad') + 1).setValue(D.nightlife || '');
  }
  
  if (idx('publicSpacesLoad') >= 0) {
    sheet.getRange(dataRow, idx('publicSpacesLoad') + 1).setValue(D.publicSpaces || '');
  }
  
  if (idx('sentiment') >= 0) {
    sheet.getRange(dataRow, idx('sentiment') + 1).setValue(D.sentiment || '');
  }

  // -------------------------------------------------------------------------
  // CALENDAR CONTEXT — v1.1 path removed S203
  // -------------------------------------------------------------------------
  // The v1.1 design wrote 7 calendar fields (season/holiday/holidayPriority/
  // isFirstFriday/isCreationDay/sportsSeason/month) to World_Population. Those
  // columns were never added to the live World_Population schema (22 cols
  // post-S203 SCHEMA_HEADERS), so every cycle's writes silently no-op'd via
  // the `idx(name) >= 0` guards. Phase 1 advanceSimulationCalendar_ already
  // populates ctx.summary fresh each cycle (S.season/holiday/etc.), and
  // Phase 7 mediaRoomIntake reads them from there post-S203. Persistence
  // layer was redundant — removed.

  // -------------------------------------------------------------------------
  // TIMESTAMP (optional - update to show last finalization)
  // -------------------------------------------------------------------------
  
  if (idx('timestamp') >= 0) {
    sheet.getRange(dataRow, idx('timestamp') + 1).setValue(ctx.now || new Date());
  }

  Logger.log('finalizeWorldPopulation_ v1.2: Complete for Cycle ' + (S.cycleId || 'unknown') +
    ' | Holiday: ' + (S.holiday || 'none') + ' | Sports: ' + (S.sportsSeason || 'off-season'));
}