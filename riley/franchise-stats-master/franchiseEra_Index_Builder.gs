/***************************************
* Franchise Stats Logging v1.1
* Steward: Riley | Maker: P
***************************************/

function Run_Franchise_Stats_Log() {
Logger.log("⚾ Franchise Stats Logging started...");

const STATS_SHEET_ID = "1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss";
const LOG_SHEET_ID = "1T2JbXnpKCpBBVjm0Jt0qA77d_KQi8rVJhqDPIuMUEJc";

// open sheets
const statsFile = SpreadsheetApp.openById(STATS_SHEET_ID);
const logFile = SpreadsheetApp.openById(LOG_SHEET_ID);

const statsSheet = statsFile.getSheetByName("Active Season");
const logSheet = logFile.getSheetByName("Log");

// make sure both sheets exist
if (!statsSheet || !logSheet) {
throw new Error("Missing target sheet: check that 'Active Season' and 'Log' tabs exist.");
}

const timestamp = new Date();
const entries = statsSheet.getRange("A2:F").getValues().filter(r => r[0]);

// write rows to log sheet
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

// delay before registry update
Utilities.sleep(1000);

// safe registry call
try {
Log_Franchise_Sync_Status(true);
} catch (err) {
Logger.log("⚠️ Audit sync skipped: " + err.message);
}
}

// Optional registry update (like your heartbeat)
function Log_Franchise_Sync_Status(success = true) {
const REGISTRY_ID = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI";
const file = SpreadsheetApp.openById(REGISTRY_ID);
const sheet = file.getSheetByName("Vault Registry");

if (!sheet) throw new Error("Vault Registry sheet not found.");

const note = success ? "✅ Franchise data sync complete." : "❌ Franchise sync error.";
const finder = sheet.createTextFinder("Athletics Franchise").findNext();

if (!finder) throw new Error("Row for 'Athletics Franchise' not found in registry.");

const row = finder.getRow();
sheet.getRange(row, 7).setValue(note);

Logger.log("📘 Riley_System_Log registry updated successfully.");
}
