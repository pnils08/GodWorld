function pushToBridge() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName("Registry");
if (!sheet) {
Logger.log("⚠️ Registry sheet not found in Civic_Ledger.");
return;
}

const lastRow = sheet.getLastRow();
if (lastRow < 1) {
Logger.log("⚠️ Registry sheet is empty, nothing to push.");
return;
}

const lastValue = sheet.getRange(lastRow, 1).getValue();

const bridge = SpreadsheetApp.openById("YOUR_RILEY_ACCESS_SHEET_ID")
.getSheetByName("Bridge_Log");
bridge.appendRow(["Civic Push", lastValue, new Date()]);
Logger.log("✅ Civic push complete, sent to Bridge_Log.");
}
