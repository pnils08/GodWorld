/**
* POPULATION LEDGER AUTO-SYNC v1.0
* Logs entries sent from the Civic Ledger into this sheet’s Registry.
* Connected through Riley_Access → Bridge_Log_Sync.
*/

function receivePopulationUpdate(data) {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName('Registry');
if (!sheet) {
Logger.log('Registry sheet not found.');
return;
}

const timestamp = new Date();
sheet.appendRow([timestamp, data.source, data.entry, 'Received']);
Logger.log('Population Ledger update logged successfully.');
}
