/**
 * ensureCulturalLedger_ v2.1
 *
 * Creates the Cultural Ledger with full v2.6 column structure.
 * Includes Neighborhood for Oakland integration.
 * Only creates the sheet if missing. Never overwrites user data.
 */

function ensureCulturalLedger_(ctx) {

  // engine.119: no runtime create — the 20-column header (engine.68) is on the
  // tab itself (pre-created live + bench).
  var sheet = requireTab_(ctx.ss, 'Cultural_Ledger');

  return sheet;
}