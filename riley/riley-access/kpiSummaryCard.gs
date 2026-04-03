/**
* kpiSummaryCard v1.0
* Adds a visual KPI card on the Weekly_Summary tab showing performance quality.
*/
function updateKpiCard() {
const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
const sheet = ss.getSheetByName("Weekly_Summary");
if (!sheet) return;

const lastRow = sheet.getLastRow();
if (lastRow < 2) return;

const values = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
const weekStart = values[0];
const entries = Number(values[2]) || 0;
const errors = Number(values[3]) || 0;
const checks = Number(values[4]) || 0;

// Determine KPI level
let status = "⚪ Pending Review";
let color = "#eeeeee";

if (errors === 0 && checks > 0) {
status = "🟢 Excellent";
color = "#a5d6a7";
} else if (errors <= 3) {
status = "🟡 Stable";
color = "#fff59d";
} else {
status = "🔴 Review Needed";
color = "#ef9a9a";
}

// Clear and rebuild card area
const cardRange = sheet.getRange("K2:L5");
cardRange.breakApart(); // unmerge anything first
cardRange.merge(); // single merge block
cardRange
.setValue(`${status}\n\nWeek of: ${weekStart}\nEntries: ${entries}\nErrors: ${errors}\nChecks: ${checks}`)
.setBackground(color)
.setFontSize(13)
.setFontWeight("bold")
.setVerticalAlignment("middle")
.setHorizontalAlignment("center")
.setWrap(true)
.setBorder(true, true, true, true, true, true);
}