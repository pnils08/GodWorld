/**
* logToSheet v1.0
* Appends system logs to the Riley_System_Log sheet
*/

const LOG_SHEET_ID = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI';

function writeLog(entryType, message) {
const sheet = SpreadsheetApp.openById(LOG_SHEET_ID).getActiveSheet();
sheet.appendRow([
new Date().toISOString(),
entryType,
message
]);
}

/**
* Example: integrates with dailyStewardCheck()
*/
function dailyStewardCheck() {
const now = new Date();
const storageUsed = DriveApp.getStorageUsed();
const message = `Drive Storage: ${storageUsed} bytes | System ✅ Online`;
writeLog('Daily Check', message);
Logger.log(message);
}

/**
* Example: integrates with syncVaults()
*/
function syncVaults() {
const folderName = "Riley_FullDrive_Access";
const folderIter = DriveApp.getFoldersByName(folderName);
if (!folderIter.hasNext()) {
writeLog('Vault Sync', `❌ Folder not found: ${folderName}`);
return;
}

const folder = folderIter.next();
const files = folder.getFiles();
let count = 0;
while (files.hasNext()) {
const file = files.next();
const name = file.getName();
const modified = file.getLastUpdated();
writeLog('Vault File', `${name} | Updated: ${modified}`);
count++;
}

writeLog('Vault Sync', `✅ ${count} files reviewed.`);
}
