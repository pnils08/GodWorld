function processIngestionFolder() {
const folder = DriveApp.getFolderById('1ScutKnsAp_4B1PW6dWowIKZrQyVDmuqQ'); // intake
const ledger = SpreadsheetApp.openById('1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo')
.getSheetByName('Population');
const rileyLog = SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI')
.getSheetByName('Federation_Sync');

const files = folder.getFiles();
let processedCount = 0;

while (files.hasNext()) {
const file = files.next();
const popID = 'POP-' + Utilities.getUuid().slice(0, 8).toUpperCase();
const name = file.getName();
const timestamp = new Date();

let snippet = '';
if (name.endsWith('.txt')) {
try {
const content = file.getBlob().getDataAsString();
snippet = content.substring(0, 120).replace(/\r?\n|\r/g, ' ') + '...';
} catch (e) {
snippet = '[Error reading file]';
}
} else {
snippet = '[Non-text file]';
}

// write to Population Ledger
ledger.appendRow([popID, name, '', '', 'active', 'ingested', snippet, timestamp]);

// log to Riley System Log
rileyLog.appendRow([timestamp, 'Population_Ledger', `${name} → ${popID}`, 'Relayed']);

processedCount++;
}

Logger.log(`✅ Population ingestion complete: ${processedCount} file(s) processed.`);
}
