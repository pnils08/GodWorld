/**
 * ensureCulturalLedger_ v2.1
 *
 * Creates the Cultural Ledger with full v2.6 column structure.
 * Includes Neighborhood for Oakland integration.
 * Only creates the sheet if missing. Never overwrites user data.
 */

function ensureCulturalLedger_(ctx) {

  let sheet = ctx.ss.getSheetByName('Cultural_Ledger');

  if (!sheet) {

    sheet = ctx.ss.insertSheet('Cultural_Ledger');

    sheet.appendRow([
      "Timestamp",        // A
      "CUL-ID",           // B
      "Name",             // C
      "RoleType",         // D (raw role, e.g., musician/actor/etc)
      "FameCategory",     // E (normalized role: actor/musician/etc)
      "CulturalDomain",   // F (Arts/Sports/Media/Civic/Culinary/Literature/Fashion/Business)
      "Status",           // G
      "UniverseLinks",    // H
      "FirstSeenCycle",   // I
      "LastSeenCycle",    // J
      "MediaCount",       // K
      "FameScore",        // L
      "TrendTrajectory",  // M
      "FirstRefSource",   // N
      "MediaSpread",      // O (# of unique journalists)
      "CityTier",         // P
      "Neighborhood"      // Q (Oakland neighborhood)
    ]);

    // Freeze header row
    sheet.setFrozenRows(1);

    // Set column widths for readability
    sheet.setColumnWidth(1, 140); // Timestamp
    sheet.setColumnWidth(3, 150); // Name
    sheet.setColumnWidth(4, 120); // RoleType
    sheet.setColumnWidth(5, 100); // FameCategory
    sheet.setColumnWidth(6, 100); // CulturalDomain
    sheet.setColumnWidth(17, 100); // Neighborhood
  }

  return sheet;
}