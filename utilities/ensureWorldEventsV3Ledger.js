/**
 * ============================================================================
 * ensureWorldEventsV3Ledger_ v3.3
 * ============================================================================
 *
 * Creates WorldEvents_V3_Ledger with correct 29-column header.
 * Aligned with recordWorldEventsv3_ v3.2 writer output.
 *
 * v3.3 Changes:
 * - Added FestivalFlag at column M
 * - Removed Season and Month columns (not written by recordWorldEventsv3_)
 * - Reordered calendar columns to match writer sequence
 * - 29 columns total (A-AC)
 *
 * ============================================================================
 */

function ensureWorldEventsV3Ledger_(ctx) {
  const ss = ctx.ss;
  let sheet = ss.getSheetByName('WorldEvents_V3_Ledger');

  if (!sheet) {
    sheet = ss.insertSheet('WorldEvents_V3_Ledger');

    const headers = [
      "Timestamp",           // A
      "Cycle",               // B
      "EventDescription",    // C
      "EventType",           // D
      "Domain",              // E
      "Severity",            // F
      "Neighborhood",        // G
      "ImpactScore",         // H
      "PopulationAffected",  // I
      "HealthFlag",          // J
      "CivicFlag",           // K
      "EconomicFlag",        // L
      "FestivalFlag",        // M
      "SentimentShift",      // N
      "WeatherType",         // O
      "WeatherImpact",       // P
      "CitySentiment",       // Q
      "TextureSignal",       // R
      "StoryHookSignal",     // S
      "CivicLoad",           // T
      "ShockFlag",           // U
      "PatternFlag",         // V
      "Holiday",             // W
      "HolidayPriority",     // X
      "IsFirstFriday",       // Y
      "IsCreationDay",       // Z
      "SportsSeason",        // AA
      "SourceEngine",        // AB
      "CanonStatus"          // AC
    ];

    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);

    Logger.log('ensureWorldEventsV3Ledger_ v3.3: Created WorldEvents_V3_Ledger with ' + headers.length + ' columns');
  }

  return sheet;
}


/**
 * ============================================================================
 * WORLD EVENTS V3 LEDGER SCHEMA v3.3
 * ============================================================================
 * 
 * COLUMNS (29):
 * A   Timestamp
 * B   Cycle
 * C   EventDescription
 * D   EventType
 * E   Domain
 * F   Severity
 * G   Neighborhood
 * H   ImpactScore
 * I   PopulationAffected
 * J   HealthFlag
 * K   CivicFlag
 * L   EconomicFlag
 * M   FestivalFlag
 * N   SentimentShift
 * O   WeatherType
 * P   WeatherImpact
 * Q   CitySentiment
 * R   TextureSignal
 * S   StoryHookSignal
 * T   CivicLoad
 * U   ShockFlag
 * V   PatternFlag
 * W   Holiday
 * X   HolidayPriority
 * Y   IsFirstFriday
 * Z   IsCreationDay
 * AA  SportsSeason
 * AB  SourceEngine
 * AC  CanonStatus
 * 
 * ============================================================================
 */