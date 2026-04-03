/**
* Removes old (Processed) rows from Federation_Return.
* Run this periodically to keep the sheet clean.
*/

function cleanupProcessedFederationReturns() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName('Federation_Return');
if (!sheet) {
throw new Error('❌ Federation_Return sheet not found. Run formatFederationReturn() first.');
}

const data = sheet.getDataRange().getValues();
const headers = data.shift(); // keep headers
const cleaned = data.filter(row => row[3] !== 'Processed');

// Clear and rewrite
sheet.clearContents();
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
if (cleaned.length > 0) {
sheet.getRange(2, 1, cleaned.length, headers.length).setValues(cleaned);
}

sheet.getRange(1, 1, 1, headers.length)
.setFontWeight('bold')
.setBackground('#e8e8e8')
.setHorizontalAlignment('center');

Logger.log(`🧹 Cleanup complete. ${cleaned.length} active entries retained.`);
}
