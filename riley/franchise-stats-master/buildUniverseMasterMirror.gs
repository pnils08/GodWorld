function buildUniverseMasterMirror() {
const vaultName = 'Universe';
const vaultFolderId = '1XD1UT_0238Xd0A7gtstKFYXzFwV1QiWP';
const folder = DriveApp.getFolderById(vaultFolderId);

let masterText = `=== ${vaultName.toUpperCase()} MASTER MIRROR ===\n` +
`Timestamp: ${new Date().toISOString()}\n\n`;

function scanFolder(f, depth) {
const prefix = '>'.repeat(depth);
const files = f.getFiles();
while (files.hasNext()) {
const file = files.next();
const name = file.getName();
const mime = file.getMimeType();

// Skip obvious binary types
if (mime.includes('image') || mime.includes('video') || mime.includes('zip')) {
masterText += `${prefix}=== [${name}] ===\n[Non-text file skipped]\n\n`;
continue;
}

// For PDFs, note them but don't parse yet
if (mime === MimeType.PDF) {
masterText += `${prefix}=== [${name}] ===\n[PDF archived in original format]\n\n`;
continue;
}

// Otherwise try to read text
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
Logger.log('Created master mirror for Universe: ' + mirrorFile.getUrl());
}