function checkRileyAccess() {
const email = "riley.steward.system@gmail.com";
const folders = DriveApp.getFolders();
let hasAccess = false;

while (folders.hasNext()) {
const f = folders.next();
const perms = f.getEditors().map(e => e.getEmail());
if (perms.includes(email)) {
hasAccess = true;
Logger.log(`✅ Riley has access to: ${f.getName()}`);
}
}

if (hasAccess) {
Logger.log("✅ Riley steward system confirmed ACTIVE.");
} else {
Logger.log("❌ Riley has no active folder permissions.");
}
}
