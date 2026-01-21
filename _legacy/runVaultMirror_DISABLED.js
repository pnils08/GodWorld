//
/**
* Universal Vault Mirror
* Creates a text snapshot (readable mirror) of an entire vault directory:
* - Crawls all subfolders and files
* - Extracts full text from Google Docs
* - Extracts all data rows from Google Sheets
* - Logs metadata for other file types
*/

function runVaultMirror() {
// CHANGE THESE IDs for each vault
const vaultId = '1TQVhY3B-KpoA6FarnIVXMfoXcwyv0_kk'; // The root folder of the vault
const mirrorOutputId = '1TQVhY3B-KpoA6FarnIVXMfoXcwyv0_kk'; // Where mirror files are stored

const vaultFolder = DriveApp.getFolderById(vaultId);
const mirrorFolder = DriveApp.getFolderById(mirrorOutputId);
const vaultName = vaultFolder.getName();
const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
const outputName = `${vaultName}_Mirror_${timestamp}.txt`;

let mirrorContent = `=== ${vaultName} Mirror Snapshot ===\nGenerated: ${timestamp}\n\n`;

function crawl(folder, depth) {
const prefix = ' '.repeat(depth);
mirrorContent += `${prefix}📁 Folder: ${folder.getName()}\n`;

// Process files
const files = folder.getFiles();
while (files.hasNext()) {
const f = files.next();
mirrorContent += `${prefix}- File: ${f.getName()} (${f.getMimeType()})\n`;
mirrorContent += `${prefix} URL: ${f.getUrl()}\n`;
mirrorContent += `${prefix} Last Modified: ${f.getLastUpdated()}\n`;

try {
if (f.getMimeType().includes('spreadsheet')) {
const ss = SpreadsheetApp.openById(f.getId());
ss.getSheets().forEach(sh => {
mirrorContent += `${prefix} ▶ Sheet: ${sh.getName()}\n`;
const values = sh.getDataRange().getValues();
values.forEach(row => mirrorContent += `${prefix} ${row.join(' | ')}\n`);
});
} else if (f.getMimeType().includes('document')) {
const doc = DocumentApp.openById(f.getId());
mirrorContent += `${prefix} ▶ Text:\n${doc.getBody().getText()}\n---\n`;
} else {
mirrorContent += `${prefix} ▶ Non-Google file (metadata only)\n`;
}
} catch (err) {
mirrorContent += `${prefix} ⚠️ Error reading file: ${err.message}\n`;
}
mirrorContent += '\n';
}

// Recurse subfolders
const subfolders = folder.getFolders();
while (subfolders.hasNext()) crawl(subfolders.next(), depth + 1);
}

crawl(vaultFolder, 0);

const outputFile = mirrorFolder.createFile(outputName, mirrorContent, MimeType.PLAIN_TEXT);
Logger.log(`✅ Vault Mirror created: ${outputFile.getUrl()}`);
}
//