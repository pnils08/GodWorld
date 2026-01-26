/**
 * updateMediaSpread_ v2.2
 *
 * Updates media spread metrics for cultural entities.
 * Uses header-based column lookup.
 *
 * v2.2 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for sheet/row
 */

function updateMediaSpread_(sheet, row, journalistName) {
  // Defensive guards
  if (!sheet) return;
  if (!row || row < 2) return;
  if (!journalistName) return;

  // Get headers
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Helper function for column lookup (1-indexed for getRange)
  function col(name) {
    return headers.indexOf(name) + 1;
  }

  var firstRefCol = col('FirstRefSource');
  var spreadCol = col('MediaSpread');

  // Set first journalist if empty
  if (firstRefCol > 0) {
    var firstRefCell = sheet.getRange(row, firstRefCol);
    var currentFirst = firstRefCell.getValue();
    if (!currentFirst) {
      firstRefCell.setValue(journalistName);
    }
  }

  // Increment media spread
  if (spreadCol > 0) {
    var spreadCell = sheet.getRange(row, spreadCol);
    var currentSpread = Number(spreadCell.getValue()) || 0;
    spreadCell.setValue(currentSpread + 1);
  }
}