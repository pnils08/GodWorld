// === CONFIG ===
const VAULT_NAME = 'Universe'; // e.g. "Population"
const VAULT_FOLDER_ID = '1XD1UT_0238Xd0A7gtstKFYXzFwV1QiWP';
const RILEY_LOG_SHEET_ID = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI'; // e.g. main Riley System Log Sheet ID
const LOG_SHEET_NAME = 'Mirror_Log';

// === BUILD MIRROR + LOG + ARCHIVE ===
function buildVaultMirrorAndLog() {
const vaultFolder = DriveApp.getFolderById(VAULT_FOLDER_ID);
const files = vaultFolder.getFiles();
let mirror = 'Vault Mirror Snapshot\nVault: ' + VAULT_NAME +
'\nTimestamp: ' + new Date().toISOString() + '\n\n';
while (files.hasNext()) {
const f = files.next();
mirror += 'File: ' + f.getName() +
'\nURL: ' + f.getUrl() +
'\nLast Modified: ' + f.getLastUpdated() +
'\nSize (bytes): ' + f.getSize() + '\n\n';
}
const subFolders = vaultFolder.getFolders();
while (subFolders.hasNext()) {
const sub = subFolders.next();
mirror += '--- Subfolder: ' + sub.getName() + ' ---\n';
const subFiles = sub.getFiles();
while (subFiles.hasNext()) {
const sf = subFiles.next();
mirror += 'File: ' + sf.getName() +
'\nURL: ' + sf.getUrl() +
'\nLast Modified: ' + sf.getLastUpdated() +
'\nSize (bytes): ' + sf.getSize() + '\n\n';
}
}
const mirrorFile = vaultFolder.createFile(VAULT_NAME + '_Mirror_' + new Date().toISOString() + '.txt', mirror);

// Compute SHA256 checksum
const checksum = Utilities.base64Encode(
Utilities.computeDigest(
Utilities.DigestAlgorithm.SHA_256,
mirrorFile.getBlob().getBytes()
)
);

// Log the run
logMirrorRun(VAULT_NAME, mirrorFile.getId(), checksum);

// Rotate archives
rotateOldMirrors();
}

// === LOG TO RILEY SYSTEM LOG ===
function logMirrorRun(vaultName, mirrorFileId, checksum) {
const logSheet = SpreadsheetApp.openById(RILEY_LOG_SHEET_ID).getSheetByName(LOG_SHEET_NAME);
const timestamp = new Date();
logSheet.appendRow([timestamp, vaultName, 'Mirror Created', mirrorFileId, checksum]);
}

// === ARCHIVE ROTATION (moves older mirrors into /Archive) ===
function rotateOldMirrors() {
const vaultFolder = DriveApp.getFolderById(VAULT_FOLDER_ID);
let archive;
const archiveFolders = vaultFolder.getFoldersByName('Archive');
if (archiveFolders.hasNext()) {
archive = archiveFolders.next();
} else {
archive = vaultFolder.createFolder('Archive');
}

const now = new Date();
const cutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2); // 48 hours
const files = vaultFolder.getFilesByType(MimeType.PLAIN_TEXT);
while (files.hasNext()) {
const file = files.next();
const modified = file.getLastUpdated();
if (file.getName().includes('Mirror_') && modified < cutoff) {
file.moveTo(archive);
}
}
Logger.log('Archive rotation complete for ' + VAULT_NAME);
}
