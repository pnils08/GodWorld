/**
 * ensureMediaLedger_ v2.1
 *
 * Creates the full Media Ledger sheet with v3.1 column set.
 * Matches recordMediaLedger_ v3.1 output.
 * Only creates the sheet if missing — never overwrites existing data.
 */

function ensureMediaLedger_(ctx) {

  // engine.119: no runtime create — the 25-column header is on the tab itself
  // (pre-created live + bench).
  var sheet = requireTab_(ctx.ss, 'Media_Ledger');

  return sheet;
}