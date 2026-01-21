/**
 * ============================================================================
 * FINALIZE WORLD POPULATION v1.1
 * ============================================================================
 * 
 * PURPOSE: Writes complete cycle summary data to World_Population sheet
 * 
 * v1.1 Enhancements:
 * - season column
 * - holiday column
 * - holidayPriority column
 * - isFirstFriday column
 * - isCreationDay column
 * - sportsSeason column
 * - month column
 * - Aligned with GodWorld Calendar v1.0
 * 
 * PROBLEM SOLVED: updateWorldPopulation_() runs in Phase 3, before most
 * cycle data exists. This function runs in Phase 9 AFTER all signals,
 * weather, dynamics, and flags are calculated.
 * 
 * INTEGRATION: Add to Phase 9 in runWorldCycle():
 * 
 *   // PHASE 9: FINAL ANALYSIS + DIGEST
 *   applyCompressedDigestSummary_(ctx);
 *   applyCycleWeightForLatestCycle_(ctx);
 *   finalizeWorldPopulation_(ctx);  // <-- ADD THIS LINE
 * 
 * SHEET: World_Population (single-row state sheet, row 2 = data)
 * 
 * WRITES TO COLUMNS:
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
 *   - season (v1.1)
 *   - holiday (v1.1)
 *   - holidayPriority (v1.1)
 *   - isFirstFriday (v1.1)
 *   - isCreationDay (v1.1)
 *   - sportsSeason (v1.1)
 *   - month (v1.1)
 * 
 * DOES NOT TOUCH (handled by updateWorldPopulation_):
 *   - timestamp
 *   - totalPopulation
 *   - illnessRate
 *   - employmentRate
 *   - migration
 *   - economy
 * 
 * ============================================================================
 */

function finalizeWorldPopulation_(ctx) {
  const sheet = ctx.ss.getSheetByName('World_Population');
  if (!sheet) {
    Logger.log('finalizeWorldPopulation_: World_Population sheet not found');
    return;
  }

  // Get header row to find column indices
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    Logger.log('finalizeWorldPopulation_: No columns found');
    return;
  }
  
  const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const dataRow = 2; // World_Population is single-row state sheet

  // Helper to find column index (returns -1 if not found)
  const idx = function(name) {
    return header.indexOf(name);
  };

  // Pull summary data from context
  const S = ctx.summary || {};
  const D = S.cityDynamics || {};
  const W = S.weather || {};

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
    const eventsArray = S.worldEvents || [];
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
  // v1.1: CALENDAR CONTEXT
  // -------------------------------------------------------------------------
  
  if (idx('season') >= 0) {
    sheet.getRange(dataRow, idx('season') + 1).setValue(S.season || '');
  }
  
  if (idx('holiday') >= 0) {
    sheet.getRange(dataRow, idx('holiday') + 1).setValue(S.holiday || 'none');
  }
  
  if (idx('holidayPriority') >= 0) {
    sheet.getRange(dataRow, idx('holidayPriority') + 1).setValue(S.holidayPriority || 'none');
  }
  
  if (idx('isFirstFriday') >= 0) {
    sheet.getRange(dataRow, idx('isFirstFriday') + 1).setValue(S.isFirstFriday || false);
  }
  
  if (idx('isCreationDay') >= 0) {
    sheet.getRange(dataRow, idx('isCreationDay') + 1).setValue(S.isCreationDay || false);
  }
  
  if (idx('sportsSeason') >= 0) {
    sheet.getRange(dataRow, idx('sportsSeason') + 1).setValue(S.sportsSeason || 'off-season');
  }
  
  if (idx('month') >= 0) {
    sheet.getRange(dataRow, idx('month') + 1).setValue(S.month || 0);
  }

  // -------------------------------------------------------------------------
  // TIMESTAMP (optional - update to show last finalization)
  // -------------------------------------------------------------------------
  
  if (idx('timestamp') >= 0) {
    sheet.getRange(dataRow, idx('timestamp') + 1).setValue(ctx.now || new Date());
  }

  Logger.log('finalizeWorldPopulation_ v1.1: Complete for Cycle ' + (S.cycleId || 'unknown') + 
    ' | Holiday: ' + (S.holiday || 'none') + ' | Sports: ' + (S.sportsSeason || 'off-season'));
}


/**
 * ============================================================================
 * BATCH WRITE VERSION v1.1 (fewer API calls)
 * ============================================================================
 * 
 * If you experience slow performance, use this version instead.
 * It reads the entire row, modifies values, then writes back in one call.
 * 
 */

function finalizeWorldPopulation_Batch_(ctx) {
  const sheet = ctx.ss.getSheetByName('World_Population');
  if (!sheet) return;

  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  
  const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const dataRange = sheet.getRange(2, 1, 1, lastCol);
  const dataRow = dataRange.getValues()[0];

  const idx = function(name) {
    return header.indexOf(name);
  };

  const S = ctx.summary || {};
  const D = S.cityDynamics || {};
  const W = S.weather || {};

  // Update values in array
  if (idx('timestamp') >= 0) dataRow[idx('timestamp')] = ctx.now || new Date();
  if (idx('cycle') >= 0) dataRow[idx('cycle')] = S.cycleId || '';
  if (idx('cycleWeight') >= 0) dataRow[idx('cycleWeight')] = S.cycleWeight || '';
  if (idx('cycleWeightReason') >= 0) dataRow[idx('cycleWeightReason')] = S.cycleWeightReason || '';
  if (idx('civicLoad') >= 0) dataRow[idx('civicLoad')] = S.civicLoad || '';
  if (idx('migrationDrift') >= 0) dataRow[idx('migrationDrift')] = S.migrationDrift || 0;
  if (idx('patternFlag') >= 0) dataRow[idx('patternFlag')] = S.patternFlag || '';
  if (idx('shockFlag') >= 0) dataRow[idx('shockFlag')] = S.shockFlag || '';
  if (idx('worldEventsCount') >= 0) dataRow[idx('worldEventsCount')] = (S.worldEvents || []).length;
  if (idx('weatherType') >= 0) dataRow[idx('weatherType')] = W.type || '';
  if (idx('weatherImpact') >= 0) dataRow[idx('weatherImpact')] = W.impact || '';
  if (idx('trafficLoad') >= 0) dataRow[idx('trafficLoad')] = D.traffic || '';
  if (idx('retailLoad') >= 0) dataRow[idx('retailLoad')] = D.retail || '';
  if (idx('tourismLoad') >= 0) dataRow[idx('tourismLoad')] = D.tourism || '';
  if (idx('nightlifeLoad') >= 0) dataRow[idx('nightlifeLoad')] = D.nightlife || '';
  if (idx('publicSpacesLoad') >= 0) dataRow[idx('publicSpacesLoad')] = D.publicSpaces || '';
  if (idx('sentiment') >= 0) dataRow[idx('sentiment')] = D.sentiment || '';
  
  // v1.1: Calendar context
  if (idx('season') >= 0) dataRow[idx('season')] = S.season || '';
  if (idx('holiday') >= 0) dataRow[idx('holiday')] = S.holiday || 'none';
  if (idx('holidayPriority') >= 0) dataRow[idx('holidayPriority')] = S.holidayPriority || 'none';
  if (idx('isFirstFriday') >= 0) dataRow[idx('isFirstFriday')] = S.isFirstFriday || false;
  if (idx('isCreationDay') >= 0) dataRow[idx('isCreationDay')] = S.isCreationDay || false;
  if (idx('sportsSeason') >= 0) dataRow[idx('sportsSeason')] = S.sportsSeason || 'off-season';
  if (idx('month') >= 0) dataRow[idx('month')] = S.month || 0;

  // Write back in single call
  dataRange.setValues([dataRow]);

  Logger.log('finalizeWorldPopulation_Batch_ v1.1: Complete for Cycle ' + (S.cycleId || 'unknown') + 
    ' | Holiday: ' + (S.holiday || 'none') + ' | Sports: ' + (S.sportsSeason || 'off-season'));
}


/**
 * ============================================================================
 * UPGRADE WORLD POPULATION SHEET v1.1
 * ============================================================================
 * 
 * Adds calendar columns to existing World_Population sheet.
 * Run once to upgrade v1.0 sheets to v1.1 format.
 * 
 */

function upgradeWorldPopulationSheet_(ctx) {
  const ss = ctx.ss;
  const sheet = ss.getSheetByName('World_Population');
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Check if calendar columns exist
  const hasSeason = headers.includes('season');

  if (!hasSeason) {
    // Add calendar columns
    const lastCol = sheet.getLastColumn();
    const newHeaders = ['season', 'holiday', 'holidayPriority', 'isFirstFriday', 'isCreationDay', 'sportsSeason', 'month'];

    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setFontWeight('bold');

    // Set defaults for data row (row 2)
    sheet.getRange(2, lastCol + 1, 1, 7).setValues([['', 'none', 'none', false, false, 'off-season', 0]]);

    Logger.log('upgradeWorldPopulationSheet_ v1.1: Added 7 calendar columns to World_Population');
  }
}


/**
 * ============================================================================
 * FINALIZE WORLD POPULATION REFERENCE v1.1
 * ============================================================================
 * 
 * CALENDAR COLUMNS ADDED:
 * - season: Current season (spring/summer/fall/winter)
 * - holiday: Current holiday name or 'none'
 * - holidayPriority: oakland/major/cultural/minor/none
 * - isFirstFriday: Boolean - first Friday of month
 * - isCreationDay: Boolean - Oakland's Creation Day
 * - sportsSeason: championship/playoffs/late-season/regular/off-season
 * - month: Month number (1-12)
 * 
 * USAGE:
 * - Call finalizeWorldPopulation_(ctx) in Phase 9
 * - Or use finalizeWorldPopulation_Batch_(ctx) for better performance
 * - Run upgradeWorldPopulationSheet_(ctx) once to add columns
 * 
 * ============================================================================
 */