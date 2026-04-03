/**
* updateManifest v1.0
* Refreshes the Steward Manifest with real usage stats.
*/
function updateManifest() {
const manifest = {
steward: "Riley Steward",
lastUpdate: new Date(),
totalStorageBytes: DriveApp.getStorageUsed(),
rootFolders: [],
};

const folders = DriveApp.getFolders();
while (folders.hasNext()) {
const f = folders.next();
manifest.rootFolders.push({
name: f.getName(),
url: f.getUrl(),
});
}

Logger.log("===== Manifest Update =====");
Logger.log(JSON.stringify(manifest, null, 2));
}