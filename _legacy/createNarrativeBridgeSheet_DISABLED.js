//
function createNarrativeBridgeSheet() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
let sheet = ss.getSheetByName('Narrative_Bridge');
if (!sheet) {
sheet = ss.insertSheet('Narrative_Bridge');
const headers = ['Timestamp', 'Header', 'Body', 'Closing Line', 'Narrator', 'Cycle ID'];
sheet.appendRow(headers);
sheet.getRange('A1:F1').setFontWeight('bold');
Logger.log('✅ Narrative_Bridge sheet created successfully.');
} else {
Logger.log('ℹ️ Narrative_Bridge already exists.');
}
}
//