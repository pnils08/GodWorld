function buildEntireVaultMasterMirror() {
const vaultName = 'Entire_Vault';
const vaultFolderId = '1HQPuDAtRUiuRBWe3UXLcOvmy2-cRZK9f'; // Entire_Build ID
const folder = DriveApp.getFolderById(vaultFolderId);

let masterText = `=== ${vaultName.toUpperCase()} MASTER MIRROR ===\n` +
`Timestamp: ${new Date().toISOString()}\n\n`;

// ---- recursive scan of everything inside ----
function scanFolder(f, depth) {
const prefix = '>'.repeat(depth);
const files = f.getFiles();
while (files.hasNext()) {
const file = files.next();
const name = file.getName();
const mime = file.getMimeType();

if (mime.includes('image') || mime.includes('zip') || mime.includes('video') || mime === MimeType.PDF) {
masterText += `${prefix}=== [${name}] ===\n[Non-text file skipped]\n\n`;
continue;
}

masterText += `${prefix}=== [${name}] ===\n`;
try {
masterText += file.getBlob().getDataAsString() + '\n\n';
} catch (e) {
masterText += `${prefix}[Unreadable content skipped]\n\n`;
}
}

const subs = f.getFolders();
while (subs.hasNext()) {
const sub = subs.next();
masterText += `${prefix}--- Subfolder: ${sub.getName()} ---\n`;
scanFolder(sub, depth + 1);
}
}

scanFolder(folder, 0);

const outputName = `${vaultName}_Mirror_Text_${new Date().toISOString()}.txt`;
const mirrorFile = folder.createFile(outputName, masterText);
Logger.log('Created master mirror for Entire_Vault: ' + mirrorFile.getUrl());
}
