/**
* processIngestFolder()
* Reads files dropped into the Ingestion folder and logs them for processing.
* Folder ID: 1ScutKnsAp_4B1PW6dWowIKZrQyVDmuqQ
*/
function processIngestFolder() {
const folder = DriveApp.getFolderById('1ScutKnsAp_4B1PW6dWowIKZrQyVDmuqQ');
const log = SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI')
.getSheetByName('Ingest_Log') ||
SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI')
.insertSheet('Ingest_Log');

const files = folder.getFiles();
const now = new Date();
let count = 0;

log.appendRow(['Scan Start', now]);

while (files.hasNext()) {
const file = files.next();
const name = file.getName();
const id = file.getId();
const created = file.getDateCreated();

// Avoid re-logging old files
const recent = (now - created) / (1000 * 60 * 60) <= 24;
if (recent) {
log.appendRow([name, id, created, '🟢 New File']);
count++;
// placeholder for future OCR or data-parse call
}
}

log.appendRow(['Scan End', now, `New files: ${count}`]);
}
