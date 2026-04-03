/**
* Adds a dummy test row to Federation_Return
* Helps verify the Phase 6 relay pickup in Riley System Log
*/

function addFederationTestEntry() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName('Federation_Return');
if (!sheet) {
throw new Error('❌ Federation_Return sheet not found. Run formatFederationReturn() first.');
}

const timestamp = new Date();
const source = ss.getName();
const summary = 'Test intelligence report from ' + source + ' - ' + timestamp.toLocaleString();
const status = 'Pending';

sheet.appendRow([timestamp, source, summary, status]);

Logger.log(`✅ Test entry added to ${source} Federation_Return.`);
}

