//
function mirrorEntireSimulationVault() {
const vaultFolderId = '1TQVhY3B-KpoA6FarnIVXMfoXcwyv0_kk'; // Simulation Vault folder
const mirrorRootId = '1JxII0jADP2lKmy96Rwkez7zJPVW74Ked'; // Mirrors master folder

const vault = DriveApp.getFolderById(vaultFolderId);
const mirrorRoot = DriveApp.getFolderById(mirrorRootId);

const timestamp = new Date();
const vaultName = vault.getName();
const outputName = `SimulationVault_Mirror_${timestamp.toISOString().replace(/[:T]/g,'-').split('.')[0]}.txt`;

let content = `=== ${vaultName} — Vault Mirror Snapshot ===\nGenerated: ${timestamp}\n\n`;

// recursive function
function crawl(folder, depth) {
const prefix = ' '.repeat(depth);
const files = folder.getFiles();
const subfolders = folder.getFolders();

content += `${prefix}📁 Folder: ${folder.getName()}\n`;

// files
while (files.hasNext()) {
const f = files.next();
content += `${prefix}- File: ${f.getName()} (${f.getMimeType()})\n`;
content += `${prefix} URL: ${f.getUrl()}\n`;
content += `${prefix} Modified: ${f.getLastUpdated()}\n`;

try {
if (f.getMimeType().includes('spreadsheet')) {
const ss = SpreadsheetApp.openById(f.getId());
ss.getSheets().forEach(sh => {
content += `${prefix} ▶ Sheet: ${sh.getName()}\n`;
const values = sh.getDataRange().getValues();
values.slice(0, 10).forEach(r => content += `${prefix} ${r.join(' | ')}\n`);
content += `${prefix} …\n`;
});
} else if (f.getMimeType().includes('document')) {
const doc = DocumentApp.openById(f.getId());
const text = doc.getBody().getText().substring(0, 1000);
content += `${prefix} ▶ Text Preview: ${text}\n---\n`;
}
} catch (e) {
content += `${prefix} ⚠️ Could not read file contents (${e.message})\n`;
}
content += '\n';
}

// recurse into subfolders
while (subfolders.hasNext()) crawl(subfolders.next(), depth + 1);
}

crawl(vault, 0);

// write mirror file
const file = mirrorRoot.createFile(outputName, content, MimeType.PLAIN_TEXT);
Logger.log(`Mirror saved: ${file.getUrl()}`);
}
//