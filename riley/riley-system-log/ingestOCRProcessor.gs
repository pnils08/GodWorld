/**
* OCR and text extraction for new files in the Ingestion folder.
* Folder ID: 1ScutKnsAp_4B1PW6dWowIKZrQyVDmuqQ
*/
function runIngestOCR() {
const folderId = '1ScutKnsAp_4B1PW6dWowIKZrQyVDmuqQ';
const folder = DriveApp.getFolderById(folderId);
const logSheet = SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI')
.getSheetByName('Ingest_Log');
const files = folder.getFiles();
const now = new Date();
let processed = 0;

logSheet.appendRow(['OCR Run Start', now]);

while (files.hasNext()) {
const file = files.next();
const mime = file.getMimeType();
const name = file.getName();
const id = file.getId();

// Skip non-image or non-PDF files
if (!(mime.includes('image') || mime.includes('pdf'))) continue;

try {
const resource = {
title: `OCR_${name}`,
mimeType: MimeType.GOOGLE_DOCS
};
const ocrFile = Drive.Files.copy(resource, id, { ocr: true, ocrLanguage: 'en' });
const doc = DocumentApp.openById(ocrFile.id);
const text = doc.getBody().getText();

logSheet.appendRow([name, id, '✅ OCR Complete', text.substring(0, 200)]);
processed++;
} catch (err) {
logSheet.appendRow([name, id, '❌ OCR Error', err.toString()]);
}
}

logSheet.appendRow(['OCR Run End', now, `Processed: ${processed}`]);
}
