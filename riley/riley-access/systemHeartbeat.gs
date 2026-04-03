/**
* systemHeartbeat v1.0
* Displays a live system health banner on Weekly_Summary.
*/
function updateSystemHeartbeat() {
const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
const sheet = ss.getSheetByName("Weekly_Summary");
if (!sheet) return;

// Read latest metrics from last row
const lastRow = sheet.getLastRow();
const values = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
const date = values[0];
const errors = Number(values[3]) || 0;
const checks = Number(values[4]) || 0;

// Decide status
let status = "🟢 SYSTEM NORMAL";
let color = "#C8E6C9";
if (errors > 0 && errors <= 3) {
status = "🟡 MINOR ALERTS";
color = "#FFF59D";
} else if (errors > 3) {
status = "🔴 SYSTEM ATTENTION REQUIRED";
color = "#FFCDD2";
}

// Build banner in first row
const banner = sheet.getRange("A1:L1");
banner.clearFormat();
banner.merge();
banner
.setValue(`${status} | Last update: ${date} | Checks: ${checks} | Errors: ${errors}`)
.setBackground(color)
.setFontSize(14)
.setFontWeight("bold")
.setFontColor("#212121")
.setHorizontalAlignment("center")
.setVerticalAlignment("middle")
.setWrap(true)
.setBorder(true, true, true, true, true, true);
}
