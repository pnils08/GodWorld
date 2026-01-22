/**
 * ============================================================================
 * ensureWorldEventsLedger_ v2.1
 * ============================================================================
 *
 * Creates the WorldEvents_Ledger with expanded calendar columns.
 *
 * v2.1 Enhancements:
 * - HolidayPriority column
 * - FirstFriday column
 * - CreationDay column
 * - SportsSeason column
 * - Aligned with GodWorld Calendar v1.0
 *
 * Only creates the sheet if missing. Never overwrites user data.
 * 
 * ============================================================================
 */

function ensureWorldEventsLedger_(ctx) {

  const ss = ctx.ss;
  let sheet = ss.getSheetByName('WorldEvents_Ledger');

  if (!sheet) {
    sheet = ss.insertSheet('WorldEvents_Ledger');

    sheet.appendRow([
      "Timestamp",        // A
      "Cycle",            // B
      "Description",      // C
      "Severity",         // D
      "Season",           // E
      "Holiday",          // F
      "HolidayPriority",  // G (v2.1)
      "FirstFriday",      // H (v2.1)
      "CreationDay",      // I (v2.1)
      "SportsSeason",     // J (v2.1)
      "WeatherType",      // K
      "WeatherImpact",    // L
      "TrafficLoad",      // M
      "PublicSentiment",  // N
      "CivicLoad",        // O
      "ShockFlag",        // P
      "PatternFlag",      // Q
      "MigrationDrift",   // R
      "ChaosCount",       // S
      "StorySeedCount",   // T
      "NightlifeVolume"   // U
    ]);

    // Freeze header row
    sheet.setFrozenRows(1);

    // Set column widths for readability
    sheet.setColumnWidth(1, 140);  // Timestamp
    sheet.setColumnWidth(3, 200);  // Description
    sheet.setColumnWidth(6, 120);  // Holiday
    sheet.setColumnWidth(7, 100);  // HolidayPriority
    sheet.setColumnWidth(10, 100); // SportsSeason
  }

  return sheet;
}


/**
 * ============================================================================
 * WORLD EVENTS LEDGER SCHEMA v2.1
 * ============================================================================
 * 
 * COLUMNS:
 * A - Timestamp
 * B - Cycle
 * C - Description (event text)
 * D - Severity (low/medium/high)
 * E - Season
 * F - Holiday
 * G - HolidayPriority (major/minor/oakland/cultural/none)
 * H - FirstFriday (TRUE/FALSE)
 * I - CreationDay (TRUE/FALSE)
 * J - SportsSeason (off-season/spring-training/early-season/mid-season/late-season/playoffs/championship)
 * K - WeatherType
 * L - WeatherImpact
 * M - TrafficLoad
 * N - PublicSentiment
 * O - CivicLoad
 * P - ShockFlag
 * Q - PatternFlag
 * R - MigrationDrift
 * S - ChaosCount
 * T - StorySeedCount
 * U - NightlifeVolume
 * 
 * QUERY EXAMPLES:
 * - All First Friday events: =FILTER(C:C, H:H=TRUE)
 * - Championship season events: =FILTER(C:C, J:J="championship")
 * - Oakland holiday events: =FILTER(C:C, G:G="oakland")
 * - High severity during playoffs: =FILTER(C:C, (D:D="high")*(J:J="playoffs"))
 * 
 * ============================================================================
 */