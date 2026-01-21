/**
 * ============================================================================
 * applyCycleWeightForLatestCycle_ v2.2
 * ============================================================================
 *
 * Wrapper that calls applyCycleWeight_ and writes results to Riley_Digest.
 * Kept for backward compatibility with digest sheet.
 *
 * v2.2 Enhancements:
 * - GodWorld Calendar context written to digest
 * - Holiday, First Friday, Creation Day, sports season columns
 * - Calendar summary column
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Calls applyCycleWeight_ for computation
 * - Writes CycleWeight, CycleWeightReason, CycleWeightScore to Riley_Digest
 * 
 * ============================================================================
 */

function applyCycleWeightForLatestCycle_(ctx) {

  // First, ensure cycle weight is computed using the main function
  if (typeof applyCycleWeight_ === 'function') {
    applyCycleWeight_(ctx);
  }

  const S = ctx.summary;
  const weight = S.cycleWeight || "low-signal";
  const reason = S.cycleWeightReason || "Low activity and stable patterns.";
  const score = S.cycleWeightScore || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";
  const season = S.season || "Spring";

  // Build calendar summary string (v2.2)
  const calendarParts = [];
  calendarParts.push(season);
  if (holiday !== "none") {
    calendarParts.push(holiday + (holidayPriority !== "none" ? ` [${holidayPriority}]` : ""));
  }
  if (isFirstFriday) calendarParts.push("First Friday");
  if (isCreationDay) calendarParts.push("Creation Day");
  if (sportsSeason !== "off-season") calendarParts.push(sportsSeason);
  
  const calendarSummary = calendarParts.join(" | ");

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE TO RILEY_DIGEST
  // ═══════════════════════════════════════════════════════════════════════════
  const sheet = ctx.ss.getSheetByName('Riley_Digest');
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Find columns by header
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Original columns (v2.1)
  const weightCol = headers.indexOf('CycleWeight') + 1;
  const reasonCol = headers.indexOf('CycleWeightReason') + 1;
  const scoreCol = headers.indexOf('CycleWeightScore') + 1;

  // Calendar columns (v2.2)
  const holidayCol = headers.indexOf('Holiday') + 1;
  const holidayPriorityCol = headers.indexOf('HolidayPriority') + 1;
  const firstFridayCol = headers.indexOf('FirstFriday') + 1;
  const creationDayCol = headers.indexOf('CreationDay') + 1;
  const sportsSeasonCol = headers.indexOf('SportsSeason') + 1;
  const seasonCol = headers.indexOf('Season') + 1;
  const calendarSummaryCol = headers.indexOf('CalendarSummary') + 1;

  // Write original values
  if (weightCol > 0) {
    sheet.getRange(lastRow, weightCol).setValue(weight);
  }
  if (reasonCol > 0) {
    sheet.getRange(lastRow, reasonCol).setValue(reason);
  }
  if (scoreCol > 0) {
    sheet.getRange(lastRow, scoreCol).setValue(score);
  }

  // Write calendar values (v2.2)
  if (holidayCol > 0) {
    sheet.getRange(lastRow, holidayCol).setValue(holiday);
  }
  if (holidayPriorityCol > 0) {
    sheet.getRange(lastRow, holidayPriorityCol).setValue(holidayPriority);
  }
  if (firstFridayCol > 0) {
    sheet.getRange(lastRow, firstFridayCol).setValue(isFirstFriday ? "Yes" : "No");
  }
  if (creationDayCol > 0) {
    sheet.getRange(lastRow, creationDayCol).setValue(isCreationDay ? "Yes" : "No");
  }
  if (sportsSeasonCol > 0) {
    sheet.getRange(lastRow, sportsSeasonCol).setValue(sportsSeason);
  }
  if (seasonCol > 0) {
    sheet.getRange(lastRow, seasonCol).setValue(season);
  }
  if (calendarSummaryCol > 0) {
    sheet.getRange(lastRow, calendarSummaryCol).setValue(calendarSummary);
  }
}


/**
 * ============================================================================
 * CYCLE WEIGHT FOR LATEST CYCLE REFERENCE
 * ============================================================================
 * 
 * RILEY_DIGEST COLUMNS:
 * 
 * Original (v2.1):
 * - CycleWeight: "low-signal", "medium-signal", "high-signal"
 * - CycleWeightReason: Explanation string
 * - CycleWeightScore: Numeric score
 * 
 * Calendar (v2.2):
 * - Holiday: Holiday name or "none"
 * - HolidayPriority: "major", "oakland", "cultural", "minor", "none"
 * - FirstFriday: "Yes" or "No"
 * - CreationDay: "Yes" or "No"
 * - SportsSeason: "championship", "playoffs", "post-season", "late-season", "off-season"
 * - Season: "Spring", "Summer", "Fall", "Winter"
 * - CalendarSummary: Combined string (e.g., "Fall | Thanksgiving [major] | First Friday")
 * 
 * NOTE: Calendar columns are optional. The function will write to them
 * if they exist in the Riley_Digest header row.
 * 
 * SUGGESTED RILEY_DIGEST HEADER ADDITIONS:
 * Holiday | HolidayPriority | FirstFriday | CreationDay | SportsSeason | Season | CalendarSummary
 * 
 * ============================================================================
 */