/**
* Phase 4 – Federation Reporting Sync
* Sends Population Ledger analytics summary back to Riley_System_Log.
*/

function syncFederationReport() {
try {
const POP_BOOK = SpreadsheetApp.getActiveSpreadsheet();
const MAIN = POP_BOOK.getSheetByName('Main');
if (!MAIN) throw new Error('Main dashboard not found.');

// read key metrics from Main
const rows = MAIN.getRange('A4:C9').getValues();
const summary = rows.map(r => `${r[0]}: ${r[1]}`).join(' | ');
const timestamp = new Date();

// open Riley System Log
const RILEY_LOG_ID = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI'; // system log ID
const LOG_BOOK = SpreadsheetApp.openById(RILEY_LOG_ID);
const FED_SHEET = LOG_BOOK.getSheetByName('Federation_Sync') || LOG_BOOK.insertSheet('Federation_Sync');

// header check
if (FED_SHEET.getLastRow() === 0) {
FED_SHEET.appendRow(['Timestamp', 'Source', 'Summary', 'Status']);
}

// append new entry
FED_SHEET.appendRow([timestamp, 'Population_Ledger', summary, '✅ Synced']);
SpreadsheetApp.flush();

Logger.log('✅ Phase 4 – Federation report pushed to Riley System Log.');
} catch (err) {
Logger.log('❌ Federation Sync failed: ' + err);
}
}
