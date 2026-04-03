/**
* Syncs new visual entries from Riley's Visual_Log into the Population Ledger.
* Adds the latest LikenessCode next to each matching PopID.
*/
function updateVisualLedger() {
// --- Sheet IDs ---
const POP_LEDGER_ID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo';
const RILEY_LOG_ID = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI';

// --- Sheet handles ---
const popBook = SpreadsheetApp.openById(POP_LEDGER_ID);
const popSheet = popBook.getSheetByName('Registry') || popBook.getSheets()[0];

const logBook = SpreadsheetApp.openById(RILEY_LOG_ID);
const visualSheet = logBook.getSheetByName('Visual_Log');

if (!visualSheet) {
Logger.log('No Visual_Log sheet found.');
return;
}

// --- Load data ---
const visualData = visualSheet.getDataRange().getValues();
const popData = popSheet.getDataRange().getValues();

const popHeaders = popData[0];
const popIDIndex = popHeaders.indexOf('PopID');
const likenessIndex = popHeaders.indexOf('LikenessCodes');

if (popIDIndex === -1) {
Logger.log('Missing PopID column in Population Ledger.');
return;
}

// Create a quick lookup of PopID → row index
const popIndexMap = {};
for (let i = 1; i < popData.length; i++) {
const pid = popData[i][popIDIndex];
if (pid) popIndexMap[pid] = i + 1; // +1 for sheet rows (1-based)
}

// Process each visual log row
for (let j = 1; j < visualData.length; j++) {
const [timestamp, popID, playerID, entity, likenessCode] = visualData[j];
if (!popID || !likenessCode) continue;

const row = popIndexMap[popID];
if (!row) continue;

const current = popSheet.getRange(row, likenessIndex + 1).getValue();
const updated = current ? `${current}, ${likenessCode}` : likenessCode;
popSheet.getRange(row, likenessIndex + 1).setValue(updated);
}

SpreadsheetApp.flush();
Logger.log('Visual Ledger sync complete.');
// --- Audit echo in Riley System Log ---
const activity = logBook.getSheetByName('Activity_Log') || logBook.insertSheet('Activity_Log');
activity.appendRow([
new Date(),
'updateVisualLedger',
'✅ Visual Ledger sync complete',
Object.keys(popIndexMap).length,
Session.getActiveUser().getEmail()
]);
SpreadsheetApp.flush();

}
