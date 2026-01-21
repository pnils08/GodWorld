/**
 * updateMediaSpread_ v2.1
 *
 * Updates media spread metrics for cultural entities.
 * Uses header-based column lookup.
 */

function updateMediaSpread_(sheet, row, journalistName) {
  if (!journalistName) return;
  if (!sheet) return;

  // Get headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = n => headers.indexOf(n) + 1; // 1-indexed for getRange

  const firstRefCol = col('FirstRefSource');
  const spreadCol = col('MediaSpread');

  // Set first journalist if empty
  if (firstRefCol > 0) {
    const firstRefCell = sheet.getRange(row, firstRefCol);
    const currentFirst = firstRefCell.getValue();
    if (!currentFirst) {
      firstRefCell.setValue(journalistName);
    }
  }

  // Increment media spread
  if (spreadCol > 0) {
    const spreadCell = sheet.getRange(row, spreadCol);
    const currentSpread = Number(spreadCell.getValue()) || 0;
    spreadCell.setValue(currentSpread + 1);
  }
}