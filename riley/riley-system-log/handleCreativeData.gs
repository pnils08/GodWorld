/**
* Riley Creative Data Handler v3.2
* Scoped crawl with recursion, auto-reschedule, and incremental indexing.
* Place in Riley_System_Log.
*/

function handleCreativeData() {
const start = new Date();
const ss = SpreadsheetApp.getActiveSpreadsheet();
const cfg = ss.getSheetByName("World_Config");
const sheet = getCreativeSheet_();
const maxRunTime = 5.5 * 60 * 1000; // 5.5 min safety window
const foldersToScan = [
"1lAyKfluJVTVpA4Y-H612EWAjqh-IQ9JM", // Creative_Vault
"1OKmAOff8bYCtiI0v1uG6m8v3urNrGZXV", // Core storyline dir
"1TQVhY3B-KpoA6FarnIVXMfoXcwyv0_kk", // 
"1VfsPU4S_pmLNxJvdAfk9uSmpATXm1Agj", // 
"1aHzsI11BkLyv-KpQf6NGwmWucfYcwVNZ", // 
"1XD1UT_0238Xd0A7gtstKFYXzFwV1QiWP", // 
];

Logger.log("Riley Creative Data Handler started...");

const lastIso = getLastIngestTimestamp_();
const since = lastIso ? new Date(lastIso) : null;
let added = 0;

try {
const now = new Date();
const allFiles = [];

// Crawl multiple storyline folders
foldersToScan.forEach(id => {
const folder = DriveApp.getFolderById(id);
crawlFolder_(folder, allFiles);
});

// Filter by modification date
const newFiles = since ? allFiles.filter(f => f.getLastUpdated() > since) : allFiles;

for (let i = 0; i < newFiles.length; i++) {
const f = newFiles[i];
sheet.appendRow([
new Date(),
f.getName(),
f.getId(),
f.getMimeType(),
f.getDateCreated(),
f.getLastUpdated()
]);
added++;

// Check time to prevent timeout
if (new Date() - start > maxRunTime) {
Logger.log("⚠️ Time threshold hit, rescheduling continuation...");
ScriptApp.newTrigger("handleCreativeData")
.timeBased()
.after(1 * 60 * 1000)
.create();
break;
}
}

updateLastIngestTimestamp_(now);
Logger.log(`✅ Completed — ${added} creative entries indexed.`);
} catch (err) {
Logger.log("❌ Error in Creative Handler: " + err);
}
}

/**
* Recursive crawler to collect all files in folder and subfolders.
*/
function crawlFolder_(folder, collector) {
const files = folder.getFiles();
while (files.hasNext()) collector.push(files.next());
const subs = folder.getFolders();
while (subs.hasNext()) crawlFolder_(subs.next(), collector);
}

/**
* Retrieve last ingest timestamp from World_Config.
*/
function getLastIngestTimestamp_() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const cfg = ss.getSheetByName("World_Config");
if (!cfg) return null;
const cell = cfg.getRange("B12");
const val = cell.getValue();
return val ? val.toString() : null;
}

/**
* Update ingest timestamp.
*/
function updateLastIngestTimestamp_(date) {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const cfg = ss.getSheetByName("World_Config");
if (cfg) cfg.getRange("B12").setValue(date.toISOString());
}

/**
* Get or create Creative_Data sheet.
*/
function getCreativeSheet_() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
let sheet = ss.getSheetByName("Creative_Data");
if (!sheet) {
sheet = ss.insertSheet("Creative_Data");
sheet.appendRow(["Timestamp", "Name", "File ID", "MIME Type", "Created", "Modified"]);
}
return sheet;
}
