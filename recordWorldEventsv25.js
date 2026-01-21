/**
 * ============================================================================
 * recordWorldEvents_ v2.1
 * ============================================================================
 *
 * Logs all world events into WorldEvents_Ledger with full calendar context.
 *
 * v2.1 Enhancements:
 * - HolidayPriority column
 * - IsFirstFriday column
 * - IsCreationDay column
 * - SportsSeason column
 * - Month column
 * - Aligned with GodWorld Calendar v1.0
 *
 * Must match ensureWorldEventsLedger_ v2.1 column structure (22 columns).
 * 
 * ============================================================================
 */

function recordWorldEvents25_(ctx) {
  const sheet = ctx.ss.getSheetByName('WorldEvents_Ledger');
  if (!sheet) return;

  const events = ctx.summary.worldEvents || [];
  if (events.length === 0) return;

  const S = ctx.summary;

  const ts = ctx.now;
  const cycle = S.cycleId;
  const season = S.season || "";
  const holiday = S.holiday || "none";
  const weatherT = S.weather ? S.weather.type : "";
  const weatherI = S.weather ? S.weather.impact : "";
  const traffic = S.cityDynamics ? S.cityDynamics.traffic : "";
  const sentiment = S.cityDynamics ? S.cityDynamics.sentiment : "";

  const civicLoad = S.civicLoad || "";
  const shock = S.shockFlag || "";
  const pattern = S.patternFlag || "";
  const drift = S.migrationDrift || 0;
  const chaosCount = S.worldEvents ? S.worldEvents.length : 0;
  const seedCount = S.storySeeds ? S.storySeeds.length : 0;
  const nightlife = S.nightlifeVolume || 0;

  // v2.1: Calendar context
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";
  const month = S.month || 0;

  const rows = events.map(ev => [
    ts,              // A  Timestamp
    cycle,           // B  Cycle
    ev.description,  // C  Description
    ev.severity,     // D  Severity
    season,          // E  Season
    holiday,         // F  Holiday
    weatherT,        // G  WeatherType
    weatherI,        // H  WeatherImpact
    traffic,         // I  TrafficLoad
    sentiment,       // J  PublicSentiment
    civicLoad,       // K  CivicLoad
    shock,           // L  ShockFlag
    pattern,         // M  PatternFlag
    drift,           // N  MigrationDrift
    chaosCount,      // O  ChaosCount
    seedCount,       // P  StorySeedCount
    nightlife,       // Q  NightlifeVolume
    // v2.1: Calendar columns
    holidayPriority, // R  HolidayPriority
    isFirstFriday,   // S  IsFirstFriday
    isCreationDay,   // T  IsCreationDay
    sportsSeason,    // U  SportsSeason
    month            // V  Month
  ]);

  sheet
    .getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
    .setValues(rows);
  
  Logger.log('recordWorldEvents25_ v2.1: Logged ' + rows.length + ' events | Holiday: ' + holiday + ' | Sports: ' + sportsSeason);
}


/**
 * ============================================================================
 * ensureWorldEventsLedger_ v2.1
 * ============================================================================
 *
 * Creates WorldEvents_Ledger sheet with v2.1 headers if it doesn't exist.
 * Call this during engine initialization.
 * 
 * ============================================================================
 */

function ensureWorldEventsLedger_(ctx) {
  const ss = ctx.ss;
  let sheet = ss.getSheetByName('WorldEvents_Ledger');
  
  if (!sheet) {
    sheet = ss.insertSheet('WorldEvents_Ledger');
    
    const headers = [
      'Timestamp',        // A
      'Cycle',            // B
      'Description',      // C
      'Severity',         // D
      'Season',           // E
      'Holiday',          // F
      'WeatherType',      // G
      'WeatherImpact',    // H
      'TrafficLoad',      // I
      'PublicSentiment',  // J
      'CivicLoad',        // K
      'ShockFlag',        // L
      'PatternFlag',      // M
      'MigrationDrift',   // N
      'ChaosCount',       // O
      'StorySeedCount',   // P
      'NightlifeVolume',  // Q
      // v2.1: Calendar columns
      'HolidayPriority',  // R
      'IsFirstFriday',    // S
      'IsCreationDay',    // T
      'SportsSeason',     // U
      'Month'             // V
    ];
    
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    Logger.log('ensureWorldEventsLedger_ v2.1: Created WorldEvents_Ledger with ' + headers.length + ' columns');
  }
  
  return sheet;
}


/**
 * ============================================================================
 * upgradeWorldEventsLedger_ v2.1
 * ============================================================================
 *
 * Adds calendar columns to existing WorldEvents_Ledger sheet.
 * Run once to upgrade v2.0 sheets to v2.1 format.
 * 
 * ============================================================================
 */

function upgradeWorldEventsLedger_(ctx) {
  const ss = ctx.ss;
  const sheet = ss.getSheetByName('WorldEvents_Ledger');
  if (!sheet) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Check if calendar columns exist
  const hasHolidayPriority = headers.includes('HolidayPriority');
  
  if (!hasHolidayPriority) {
    // Add calendar columns
    const lastCol = sheet.getLastColumn();
    const newHeaders = ['HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason', 'Month'];
    
    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setFontWeight('bold');
    
    // Set defaults for existing rows
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const defaults = [];
      for (let i = 2; i <= lastRow; i++) {
        defaults.push(['none', false, false, 'off-season', 0]);
      }
      sheet.getRange(2, lastCol + 1, lastRow - 1, 5).setValues(defaults);
    }
    
    Logger.log('upgradeWorldEventsLedger_ v2.1: Added 5 calendar columns to WorldEvents_Ledger');
  }
}


/**
 * ============================================================================
 * WORLD EVENTS LEDGER REFERENCE v2.1
 * ============================================================================
 * 
 * COLUMNS (22):
 * A  Timestamp
 * B  Cycle
 * C  Description
 * D  Severity
 * E  Season
 * F  Holiday
 * G  WeatherType
 * H  WeatherImpact
 * I  TrafficLoad
 * J  PublicSentiment
 * K  CivicLoad
 * L  ShockFlag
 * M  PatternFlag
 * N  MigrationDrift
 * O  ChaosCount
 * P  StorySeedCount
 * Q  NightlifeVolume
 * R  HolidayPriority (v2.1)
 * S  IsFirstFriday (v2.1)
 * T  IsCreationDay (v2.1)
 * U  SportsSeason (v2.1)
 * V  Month (v2.1)
 * 
 * ============================================================================
 */