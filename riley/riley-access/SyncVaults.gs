function syncVaults() {
const folderId = '1fjEOgkeoSQKcdjRi15NJL0LLVqheB4Ln'; // Riley_FullDrive_Access
const folder = DriveApp.getFolderById(folderId);
const files = folder.getFiles();
let count = 0;

Logger.log('🔍 Scanning folder: ' + folder.getName());

while (files.hasNext()) {
const file = files.next();
Logger.log(`📄 File: ${file.getName()} | ID: ${file.getId()} | Updated: ${file.getLastUpdated()}`);
count++;
}

Logger.log(`✅ Vault sync complete. ${count} files reviewed.`);
}
