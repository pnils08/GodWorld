/**
 * ============================================================================
 * applyCycleWeightForLatestCycle_ v2.3
 * ============================================================================
 *
 * Wrapper that calls applyCycleWeight_ and writes results to Riley_Digest.
 * Kept for backward compatibility with digest sheet.
 *
 * v2.3 Enhancements:
 * - Cycle-safe row targeting (writes to correct cycle row, not just lastRow)
 * - Abbreviated calendar summary (matches compressed digest style)
 * - Defensive guards and logging
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

  var S = ctx.summary || {};

  // v2.3: Defensive guard - ensure applyCycleWeight_ produced output
  if (!S.cycleWeight && !S.cycleWeightScore && !S.cycleWeightReason) {
    Logger.log('applyCycleWeightForLatestCycle_: applyCycleWeight_ produced no output');
  }

  var weight = S.cycleWeight || "low-signal";
  var reason = S.cycleWeightReason || "Low activity and stable patterns.";
  var score = S.cycleWeightScore || 0;

  // v2.3: Get current cycle for row targeting
  var cycle = S.cycleId || S.cycle || (ctx.config && ctx.config.cycleCount) || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";
  var season = S.season || "Spring";

  // Build calendar summary string (v2.3: abbreviated to match compressed digest)
  var holidayAbbrev = {
    "Thanksgiving": "TG", "Holiday": "HOL", "NewYear": "NY", "NewYearsEve": "NYE",
    "Independence": "IND", "MLKDay": "MLK", "PresidentsDay": "PRES",
    "Valentine": "VAL", "Easter": "ESTR", "MemorialDay": "MEM",
    "Juneteenth": "JUN", "LaborDay": "LAB", "Halloween": "HWEEN",
    "VeteransDay": "VET", "CincoDeMayo": "C5M", "DiaDeMuertos": "DDM",
    "LunarNewYear": "LNY", "OpeningDay": "OPN", "OaklandPride": "PRDE",
    "BlackFriday": "BFRI", "StPatricksDay": "STPAT", "MothersDay": "MOM",
    "FathersDay": "DAD", "EarthDay": "ERTH", "ArtSoulFestival": "A&S"
  };

  var calendarParts = [];
  calendarParts.push(season.substring(0, 2)); // Sp, Su, Fa, Wi
  if (holiday !== "none") {
    var hAbbr = holidayAbbrev[holiday] || holiday.substring(0, 4).toUpperCase();
    calendarParts.push(hAbbr);
  }
  if (isFirstFriday) calendarParts.push("FF");
  if (isCreationDay) calendarParts.push("CD");
  if (sportsSeason === "championship") calendarParts.push("CHAMP");
  else if (sportsSeason === "playoffs" || sportsSeason === "post-season") calendarParts.push("PLYF");

  var calendarSummary = calendarParts.join(" | ");
  if (calendarSummary.length > 80) calendarSummary = calendarSummary.substring(0, 77) + "...";

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE TO RILEY_DIGEST
  // ═══════════════════════════════════════════════════════════════════════════
  var sheet = ctx.ss.getSheetByName('Riley_Digest');
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Find columns by header
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // v2.3: Cycle-safe row targeting - find row for THIS cycle
  var cycleCol = headers.indexOf('Cycle') + 1 || headers.indexOf('CycleId') + 1;
  var targetRow = lastRow; // fallback

  if (cycleCol > 0 && lastRow > 1) {
    var cycleValsRaw = sheet.getRange(2, cycleCol, lastRow - 1, 1).getValues();
    // Flatten 2D array to 1D (ES5 compatible)
    var cycleVals = [];
    for (var cvIdx = 0; cvIdx < cycleValsRaw.length; cvIdx++) {
      cycleVals.push(cycleValsRaw[cvIdx][0]);
    }
    var idx = cycleVals.lastIndexOf(cycle);
    if (idx >= 0) targetRow = idx + 2; // offset for header row
  }

  // Original columns (v2.1)
  var weightCol = headers.indexOf('CycleWeight') + 1;
  var reasonCol = headers.indexOf('CycleWeightReason') + 1;
  var scoreCol = headers.indexOf('CycleWeightScore') + 1;

  // v2.3: Defensive logging for missing core columns
  if (weightCol <= 0 && reasonCol <= 0 && scoreCol <= 0) {
    Logger.log('applyCycleWeightForLatestCycle_: Riley_Digest missing CycleWeight columns');
  }

  // Calendar columns (v2.2)
  var holidayCol = headers.indexOf('Holiday') + 1;
  var holidayPriorityCol = headers.indexOf('HolidayPriority') + 1;
  var firstFridayCol = headers.indexOf('FirstFriday') + 1;
  var creationDayCol = headers.indexOf('CreationDay') + 1;
  var sportsSeasonCol = headers.indexOf('SportsSeason') + 1;
  var seasonCol = headers.indexOf('Season') + 1;
  var calendarSummaryCol = headers.indexOf('CalendarSummary') + 1;

  // Write original values (v2.3: use targetRow instead of lastRow)
  if (weightCol > 0) {
    sheet.getRange(targetRow, weightCol).setValue(weight);
  }
  if (reasonCol > 0) {
    sheet.getRange(targetRow, reasonCol).setValue(reason);
  }
  if (scoreCol > 0) {
    sheet.getRange(targetRow, scoreCol).setValue(score);
  }

  // Write calendar values (v2.2, v2.3: use targetRow)
  if (holidayCol > 0) {
    sheet.getRange(targetRow, holidayCol).setValue(holiday);
  }
  if (holidayPriorityCol > 0) {
    sheet.getRange(targetRow, holidayPriorityCol).setValue(holidayPriority);
  }
  if (firstFridayCol > 0) {
    sheet.getRange(targetRow, firstFridayCol).setValue(isFirstFriday ? "Yes" : "No");
  }
  if (creationDayCol > 0) {
    sheet.getRange(targetRow, creationDayCol).setValue(isCreationDay ? "Yes" : "No");
  }
  if (sportsSeasonCol > 0) {
    sheet.getRange(targetRow, sportsSeasonCol).setValue(sportsSeason);
  }
  if (seasonCol > 0) {
    sheet.getRange(targetRow, seasonCol).setValue(season);
  }
  if (calendarSummaryCol > 0) {
    sheet.getRange(targetRow, calendarSummaryCol).setValue(calendarSummary);
  }
}


/**
 * ============================================================================
 * CYCLE WEIGHT FOR LATEST CYCLE REFERENCE
 * ============================================================================
 *
 * ROW TARGETING (v2.3):
 * - Finds row where Cycle/CycleId matches current cycle
 * - Falls back to lastRow if cycle column not found or no match
 * - Prevents overwriting wrong row on re-runs or out-of-order writes
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
 * - CalendarSummary: Abbreviated (v2.3) e.g., "Fa | TG | FF"
 *
 * CALENDAR ABBREVIATIONS (v2.3):
 * - Season: Sp, Su, Fa, Wi
 * - Holidays: TG, HOL, NY, NYE, IND, MLK, PRES, VAL, ESTR, MEM, JUN, LAB,
 *   HWEEN, VET, C5M, DDM, LNY, OPN, PRDE, BFRI, STPAT, MOM, DAD, ERTH, A&S
 * - First Friday: FF
 * - Creation Day: CD
 * - Sports: CHAMP, PLYF
 *
 * NOTE: Calendar columns are optional. The function will write to them
 * if they exist in the Riley_Digest header row.
 *
 * SUGGESTED RILEY_DIGEST HEADER ADDITIONS:
 * Holiday | HolidayPriority | FirstFriday | CreationDay | SportsSeason | Season | CalendarSummary
 *
 * ============================================================================
 */