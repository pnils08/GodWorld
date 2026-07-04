/**
 * ============================================================================
 * FINALIZE WORLD POPULATION v1.3 (S236 — Phase 42 §B5/3 P3 migration)
 * ============================================================================
 *
 * PURPOSE: Writes complete cycle summary data to World_Population sheet
 *
 * v1.3 Changes (S236 [engine-sheet] Phase 42 §B5/3 P3):
 * - 17 single-cell `setValue` writes to row 2 of World_Population migrated
 *   to `queueCellIntent_`. Each gated by the existing `idx(colName) >= 0`
 *   header presence check — header read at function entry still resolves
 *   column indices before queueing intents. dryRun guard at function entry
 *   removed (intents respect dryRun at Phase 10 commit per Pattern P3 spec
 *   §2.3); sheet-existence guard + empty-header guard retained. World_
 *   Population removed from the engine.md §Phase 3 direct-write exceptions
 *   list. Largest single-file mechanical migration in B5.
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
 *   applyCycleWeight_(ctx);  // S237: was applyCycleWeightForLatestCycle_ — wrapper file retired (signal-only call now lives at Phase 8 site in godWorldEngine2)
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
  // dryRun handling: queue intents normally; executePersistIntents_ checks
  // ctx.mode.dryRun at Phase 10 commit time and logs without writing
  // (per Phase 42 §2.3 P3 spec — guarding at writer site is now redundant +
  // breaks dryRun intent visibility). v1.2's pre-flight return removed S236.
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

  // Phase 42 §B5/3 P3 (S236) — 17 cell intents replace setValue writes.
  // Header existence guards retained: only queue intents for columns that
  // actually exist in the live World_Population schema.

  // -------------------------------------------------------------------------
  // CYCLE METADATA
  // -------------------------------------------------------------------------

  if (idx('cycle') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('cycle') + 1, S.cycleId || '', 'finalize: cycle', 'world');
  }

  if (idx('cycleWeight') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('cycleWeight') + 1, S.cycleWeight || '', 'finalize: cycleWeight', 'world');
  }

  if (idx('cycleWeightReason') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('cycleWeightReason') + 1, S.cycleWeightReason || '', 'finalize: cycleWeightReason', 'world');
  }

  // -------------------------------------------------------------------------
  // SIGNALS & FLAGS
  // -------------------------------------------------------------------------

  if (idx('civicLoad') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('civicLoad') + 1, S.civicLoad || '', 'finalize: civicLoad', 'world');
  }

  if (idx('migrationDrift') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('migrationDrift') + 1, S.migrationDrift || 0, 'finalize: migrationDrift', 'world');
  }

  if (idx('patternFlag') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('patternFlag') + 1, S.patternFlag || '', 'finalize: patternFlag', 'world');
  }

  if (idx('shockFlag') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('shockFlag') + 1, S.shockFlag || '', 'finalize: shockFlag', 'world');
  }

  // -------------------------------------------------------------------------
  // WORLD EVENTS
  // -------------------------------------------------------------------------

  if (idx('worldEventsCount') >= 0) {
    var eventsArray = S.worldEvents || [];
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('worldEventsCount') + 1, eventsArray.length, 'finalize: worldEventsCount', 'world');
  }

  // -------------------------------------------------------------------------
  // WEATHER
  // -------------------------------------------------------------------------

  if (idx('weatherType') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('weatherType') + 1, W.type || '', 'finalize: weatherType', 'world');
  }

  if (idx('weatherImpact') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('weatherImpact') + 1, W.impact || '', 'finalize: weatherImpact', 'world');
  }

  // -------------------------------------------------------------------------
  // CITY DYNAMICS
  // -------------------------------------------------------------------------

  if (idx('trafficLoad') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('trafficLoad') + 1, D.traffic || '', 'finalize: trafficLoad', 'world');
  }

  if (idx('retailLoad') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('retailLoad') + 1, D.retail || '', 'finalize: retailLoad', 'world');
  }

  if (idx('tourismLoad') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('tourismLoad') + 1, D.tourism || '', 'finalize: tourismLoad', 'world');
  }

  if (idx('nightlifeLoad') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('nightlifeLoad') + 1, D.nightlife || '', 'finalize: nightlifeLoad', 'world');
  }

  if (idx('publicSpacesLoad') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('publicSpacesLoad') + 1, D.publicSpaces || '', 'finalize: publicSpacesLoad', 'world');
  }

  if (idx('sentiment') >= 0) {
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('sentiment') + 1, D.sentiment || '', 'finalize: sentiment', 'world');
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
    queueCellIntent_(ctx, 'World_Population', dataRow, idx('timestamp') + 1, inWorldStamp_(ctx), 'finalize: timestamp', 'world');
  }

  Logger.log('finalizeWorldPopulation_ v1.3: Queued intents for Cycle ' + (S.cycleId || 'unknown') +
    ' | Holiday: ' + (S.holiday || 'none') + ' | Sports: ' + (S.sportsSeason || 'off-season'));
}