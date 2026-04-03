/***************************************
* Franchise Stats Logging v1.0
* Steward: Riley | Maker: P
***************************************/

function Run_Franchise_Stats_Log() {
Logger.log("⚾ Franchise Stats Logging started...");

const STATS_SHEET_ID = "1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss";
const LOG_SHEET_ID = "1T2JbXnpKCpBBVjm0Jt0qA77d_KQi8rVJhqDPIuMUEJc";

const statsFile = SpreadsheetApp.openById(STATS_SHEET_ID);
const logFile = SpreadsheetApp.openById(LOG_SHEET_ID);

const statsSheet = statsFile.getSheetByName("Active Season");
const logSheet = logFile.getSheetByName("Player Updates");

const timestamp = new Date();
const entries = statsSheet.getRange("A2:F").getValues().filter(r => r[0]);

entries.forEach(row => {
logSheet.appendRow([
timestamp,
row[0], // Player
row[1], // Games
row[2], // AVG
row[3], // HR
row[4], // RBI
"Auto-logged by Riley"
]);
});

Logger.log("✅ Franchise stats logged successfully.");
Log_Franchise_Sync_Status(true);
}

// Optional registry update (like your heartbeat)
function Log_Franchise_Sync_Status(success = true) {
const REGISTRY_ID = "PASTE_RILEY_SYSTEM_LOG_ID";
const sheet = SpreadsheetApp.openById(REGISTRY_ID).getSheetByName("Vault Registry");
const note = success ? "✅ Franchise data sync complete." : "❌ Franchise sync error.";

const row = sheet.createTextFinder("Athletics Franchise").findNext().getRow();
sheet.getRange(row, 7).setValue(note);
}
