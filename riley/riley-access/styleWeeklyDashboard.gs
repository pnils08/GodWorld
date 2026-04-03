/**
* styleWeeklyDashboard v1.0
* Applies consistent formatting to the Weekly_Dashboard sheet.
*/
function styleWeeklyDashboard() {
const ss = SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI');
const sheet = ss.getSheetByName('Weekly_Dashboard');
if (!sheet) throw new Error('Weekly_Dashboard sheet not found.');

// Detect used range
const lastRow = sheet.getLastRow();
const lastCol = sheet.getLastColumn();
const range = sheet.getRange(1, 1, lastRow, lastCol);

// Reset old formatting
range.clearFormat();

// Header styling
const header = sheet.getRange(1, 1, 1, lastCol);
header.setFontWeight('bold')
.setBackground('#2E7D32') // dark green
.setFontColor('white')
.setHorizontalAlignment('center')
.setVerticalAlignment('middle')
.setFontSize(10);

// Body alternating colors
if (lastRow > 1) {
const body = sheet.getRange(2, 1, lastRow - 1, lastCol);
body.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREEN);
}

// Auto-fit and borders
sheet.autoResizeColumns(1, lastCol);
range.setBorder(true, true, true, true, true, true);
}
