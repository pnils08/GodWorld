/**
* formatSummary v1.1 – avoids duplicate banding
* Styles the Daily_Summary sheet for clarity and safety.
*/
function formatSummary() {
const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
const sheet = ss.getSheetByName("Daily_Summary");
if (!sheet) return;

const range = sheet.getDataRange();
const values = range.getValues();

// --- Header styling
const header = sheet.getRange(1, 1, 1, values[0].length);
header.setBackground("#2e7d32"); // dark green
header.setFontColor("white");
header.setFontWeight("bold");
header.setHorizontalAlignment("center");

// --- Remove existing banding (if any)
const bandings = sheet.getBandings();
bandings.forEach(b => b.remove());

// --- Apply new alternate shading safely
sheet.getRange(2, 1, Math.max(values.length - 1, 1), values[0].length)
.applyRowBanding(SpreadsheetApp.BandingTheme.GREEN);

// --- Highlight errors and latest row
for (let i = 2; i <= values.length; i++) {
const errorCount = values[i - 1][2]; // “Error Count” column
const row = sheet.getRange(i, 1, 1, values[0].length);

if (errorCount > 0) {
sheet.getRange(i, 3).setBackground("#ffcccc"); // red for errors
} else {
sheet.getRange(i, 3).setBackground(null); // clear to band color
}

// Light blue highlight for most recent row
if (i === values.length) row.setBackground("#d0ebff");
}

// --- Auto-fit columns
sheet.autoResizeColumns(1, values[0].length);
}
