function scanFullDrive() {
const root = DriveApp.getRootFolder();
Logger.log('🟢 Scanning entire Drive for Riley Steward System...');
scanFolder(root, 0);
Logger.log('✅ Full Drive scan complete.');
}

function scanFolder(folder, depth) {
const indent = ' '.repeat(depth * 2);
const files = folder.getFiles();
const subs = folder.getFolders();

while (files.hasNext()) {
const file = files.next();
Logger.log(`${indent}📄 ${file.getName()} | ID: ${file.getId()} | Updated: ${file.getLastUpdated()}`);
}

while (subs.hasNext()) {
const sub = subs.next();
Logger.log(`${indent}📁 Subfolder: ${sub.getName()}`);
scanFolder(sub, depth + 1);
}
}
