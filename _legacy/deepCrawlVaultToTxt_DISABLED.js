//
function deepCrawlVaultToTxt() {
// --- enter your Vault folder ID directly below ---
const folderId = '1TQVhY3B-KpoA6FarnIVXMfoXcwyv0_kk';
const folder = DriveApp.getFolderById(folderId);

const timestamp = new Date().toISOString();
const mirrorName = `Vault_DeepMirror_${timestamp}.txt`;
const mirrorFile = folder.createFile(mirrorName, '', MimeType.PLAIN_TEXT);

const textChunks = [];
textChunks.push(`📘 DEEP MIRROR LOG\nVault Name: ${folder.getName()}\nTimestamp: ${timestamp}\n\n`);

function crawl(currentFolder, depth = 0) {
const pad = ' '.repeat(depth);
textChunks.push(`${pad}📁 Folder: ${currentFolder.getName()} (ID: ${currentFolder.getId()})\n`);

// --- Google Docs ---
const docs = currentFolder.getFilesByType(MimeType.GOOGLE_DOCS);
while (docs.hasNext()) {
const doc = docs.next();
try {
const body = DocumentApp.openById(doc.getId()).getBody().getText();
textChunks.push(`${pad}📝 DOC: ${doc.getName()} [${doc.getId()}]\n${body}\n\n`);
} catch (e) {
textChunks.push(`${pad}⚠️ Unable to read Doc: ${doc.getName()} (${e.message})\n`);
}
}

// --- Google Sheets ---
const sheets = currentFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
while (sheets.hasNext()) {
const file = sheets.next();
try {
const ss = SpreadsheetApp.openById(file.getId());
textChunks.push(`${pad}📊 SHEET: ${file.getName()} [${file.getId()}]\n`);
ss.getSheets().forEach(sh => {
textChunks.push(`${pad} → Tab: ${sh.getName()}\n`);
const values = sh.getDataRange().getValues();
values.forEach(row => textChunks.push(`${pad} ${row.join(' | ')}`));
textChunks.push('\n');
});
} catch (e) {
textChunks.push(`${pad}⚠️ Unable to read Sheet: ${file.getName()} (${e.message})\n`);
}
}

// --- Recurse into subfolders ---
const subfolders = currentFolder.getFolders();
while (subfolders.hasNext()) crawl(subfolders.next(), depth + 1);
}

crawl(folder);
mirrorFile.setContent(textChunks.join('\n'));
Logger.log(`✅ Deep Mirror Complete: ${mirrorName}`);
}
//