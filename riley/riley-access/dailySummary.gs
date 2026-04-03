/**
* dailySummary v1.0
* Auto-summarizes Riley_System_Log into a dashboard tab.
*/
function generateDailySummary() {
const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
const logSheet = ss.getSheets()[0]; // main log sheet
let summarySheet = ss.getSheetByName("Daily_Summary");

// Create sheet if it doesn't exist
if (!summarySheet) {
summarySheet = ss.insertSheet("Daily_Summary");
summarySheet.appendRow([
"Date",
"Total Entries",
"Error Count",
"Check Count",
"Last Vault Sync"
]);
}

const values = logSheet.getDataRange().getValues();
const today = new Date();
const todayStr = today.toDateString();

let total = 0, errors = 0, checks = 0, lastVault = "—";

for (let i = 0; i < values.length; i++) {
const row = values[i];
const timestamp = new Date(row[0]);
if (timestamp.toDateString() === todayStr) {
total++;
const text = row.join(" ").toLowerCase();
if (text.includes("error")) errors++;
if (text.includes("check")) checks++;
if (text.includes("vault")) lastVault = timestamp.toLocaleTimeString();
}
}

summarySheet.appendRow([todayStr, total, errors, checks, lastVault]);
}
