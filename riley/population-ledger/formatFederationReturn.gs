/**
* Creates or resets the Federation_Return sheet
* Used by: Civic_Ledger, Wild_Media_News, Slayer_Syndicate
*/

function formatFederationReturn() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
let sheet = ss.getSheetByName('Federation_Return');

// Create if missing
if (!sheet) {
sheet = ss.insertSheet('Federation_Return');
} else {
// clear old contents / formatting
sheet.clear();
}

// Set headers
const headers = ['Timestamp', 'Source', 'Summary', 'Status'];
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
sheet.getRange(1, 1, 1, headers.length)
.setFontWeight('bold')
.setBackground('#e8e8e8')
.setHorizontalAlignment('center');

// Auto-fit columns
sheet.autoResizeColumns(1, headers.length);

Logger.log('✅ Federation_Return sheet formatted and ready.');
}
