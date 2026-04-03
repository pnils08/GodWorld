/**
* weeklyRollup v1.0
* Aggregates Daily_Summary into a weekly summary tab.
*/
function generateWeeklyRollup() {
const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
const dailySheet = ss.getSheetByName("Daily_Summary");
if (!dailySheet) return;

// Create the weekly tab if it doesn’t exist
let weekSheet = ss.getSheetByName("Weekly_Summary");
if (!weekSheet) {
weekSheet = ss.insertSheet("Weekly_Summary");
weekSheet.appendRow([
"Week Start",
"Week End",
"Total Entries",
"Total Errors",
"Total Checks",
"Average Entries / Day",
"Average Errors / Day",
"Last Vault Sync"
]);
}

const values = dailySheet.getDataRange().getValues();
const today = new Date();
const endOfWeek = new Date(today);
const startOfWeek = new Date(today);
startOfWeek.setDate(today.getDate() - 6);

let totalEntries = 0;
let totalErrors = 0;
let totalChecks = 0;
let daysCount = 0;
let lastVault = "—";

for (let i = 1; i < values.length; i++) {
const date = new Date(values[i][0]);
if (date >= startOfWeek && date <= endOfWeek) {
totalEntries += Number(values[i][1]) || 0;
totalErrors += Number(values[i][2]) || 0;
totalChecks += Number(values[i][3]) || 0;
daysCount++;
if (values[i][4] !== "—") lastVault = values[i][4];
}
}

const avgEntries = daysCount ? (totalEntries / daysCount).toFixed(2) : 0;
const avgErrors = daysCount ? (totalErrors / daysCount).toFixed(2) : 0;

weekSheet.appendRow([
startOfWeek.toDateString(),
endOfWeek.toDateString(),
totalEntries,
totalErrors,
totalChecks,
avgEntries,
avgErrors,
lastVault
]);
}