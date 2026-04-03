/**
* formatWeeklyDashboard v1.0
* Styles the Weekly_Summary sheet into a color-coded dashboard.
*/
function formatWeeklyDashboard() {
const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
const sheet = ss.getSheetByName("Weekly_Summary");
if (!sheet) return;

const values = sheet.getDataRange().getValues();
if (values.length < 2) return; // nothing to format yet

// Header
const header = sheet.getRange(1, 1, 1, values[0].length);
header.setBackground("#263238"); // slate gray
header.setFontColor("#ffffff");
header.setFontWeight("bold");
header.setHorizontalAlignment("center");
header.setVerticalAlignment("middle");

// Remove existing banding
sheet.getBandings().forEach(b => b.remove());

// Determine status colors
for (let i = 2; i <= values.length; i++) {
const errors = Number(values[i - 1][3]) || 0; // Total Errors
const checks = Number(values[i - 1][4]) || 0; // Total Checks
const row = sheet.getRange(i, 1, 1, values[0].length);

let color = "#e0e0e0"; // default gray
if (errors === 0 && checks > 0) color = "#a5d6a7"; // green = good
else if (errors > 0 && errors <= 3) color = "#fff59d"; // yellow = minor issues
else if (errors > 3) color = "#ef9a9a"; // red = critical

row.setBackground(color);
}

// Add a “status banner” cell at top-left
const latestRow = values.length;
const latestStatus = sheet.getRange(latestRow, 3).getValue() === 0 ? "🟢 All Clear" : "🔴 Check Logs";
sheet.getRange("I1").setValue(latestStatus)
.setFontSize(14)
.setFontWeight("bold");

// Auto-size columns
sheet.autoResizeColumns(1, values[0].length);
}
