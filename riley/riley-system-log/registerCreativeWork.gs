/**
* registerCreativeWork v1.0
* Tracks new creative works from the Wild Media Newswire or Creative Vault,
* assigns WRK-IDs, logs them to the System Log, and mirrors them to Civic Ledger.
*/
function registerCreativeWork() {
const LOG_SHEET_ID = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI';
const CIVIC_SHEET_ID = '1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo';
const CREATIVE_SHEET_ID = '1FQCCqRBUsqixaOmsqcZi-j7aev81656c3UfoQ_DQSVQ'; // Wild Media Newswire

const log = SpreadsheetApp.openById(LOG_SHEET_ID).getActiveSheet();
const civic = SpreadsheetApp.openById(CIVIC_SHEET_ID)
.getSheetByName('Cultural_Log') ||
SpreadsheetApp.openById(CIVIC_SHEET_ID).insertSheet('Cultural_Log');
const creative = SpreadsheetApp.openById(CREATIVE_SHEET_ID).getSheetByName('Creative Digest');

if (!creative) {
Logger.log('❌ No Creative Digest tab found in Wild Media Newswire');
return;
}

const data = creative.getDataRange().getValues();
const timestamp = new Date();

for (let i = 1; i < data.length; i++) {
const [wrkId, author, title, type, status, tags, checksum, loggedAt] = data[i];
if (status && status.toString().toLowerCase() === 'ready' && !wrkId) {
// --- Assign new WRK-ID
const id = issueNewID('WRK'); // from your counter system
const uuid = Utilities.getUuid(); // checksum
const message = `${author} registered new ${type}: "${title}" (${id})`;

// --- Write to System Log
log.appendRow([timestamp.toISOString(), 'Creative Work Registered', message]);

// --- Mirror to Civic Ledger
civic.appendRow([
timestamp,
author,
title,
type,
id,
uuid,
'Registered',
tags || ''
]);

// --- Update Creative sheet
creative.getRange(i + 1, 1).setValue(id); // Column A → WRK-ID
creative.getRange(i + 1, 7).setValue(uuid); // Column G → checksum
creative.getRange(i + 1, 8).setValue(new Date()); // Column H → LoggedAt
}
}

Logger.log('registerCreativeWork complete.');
}
