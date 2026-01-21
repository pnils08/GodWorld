/**
 * ensureMediaLedger_ v2.1
 *
 * Creates the full Media Ledger sheet with v3.1 column set.
 * Matches recordMediaLedger_ v3.1 output.
 * Only creates the sheet if missing — never overwrites existing data.
 */

function ensureMediaLedger_(ctx) {

  let sheet = ctx.ss.getSheetByName('Media_Ledger');

  if (!sheet) {
    sheet = ctx.ss.insertSheet('Media_Ledger');

    sheet.appendRow([
      "Timestamp",        // A
      "Cycle",            // B
      "Journalist",       // C
      "NameUsed",         // D (Cultural Name)
      "FameCategory",     // E
      "CulturalDomain",   // F
      "FameScore",        // G
      "TrendTrajectory",  // H
      "MediaSpread",      // I
      "CityTier",         // J
      "Neighborhood",     // K (NEW)
      "StorySeedCount",   // L
      "CycleWeight",      // M
      "CycleWeightReason",// N
      "ChaosEvents",      // O
      "NightlifeVolume",  // P
      "Sentiment",        // Q
      "CivicLoad",        // R
      "ShockFlag",        // S
      "PatternFlag",      // T
      "EconomicMood",     // U (NEW)
      "WeatherType",      // V (NEW)
      "WeatherMood",      // W (NEW)
      "MediaIntensity",   // X (NEW)
      "ActiveArcs"        // Y (NEW)
    ]);

    // Freeze header row
    sheet.setFrozenRows(1);

    // Set column widths for readability
    sheet.setColumnWidth(1, 140);  // Timestamp
    sheet.setColumnWidth(3, 120);  // Journalist
    sheet.setColumnWidth(4, 150);  // NameUsed
    sheet.setColumnWidth(11, 100); // Neighborhood
    sheet.setColumnWidth(14, 200); // CycleWeightReason
  }

  return sheet;
}