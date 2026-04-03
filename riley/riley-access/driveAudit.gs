function driveAudit() {
const folders = DriveApp.getFolders();
while (folders.hasNext()) {
const f = folders.next();
Logger.log(`${f.getName()} – ${f.getUrl()}`);
}
}