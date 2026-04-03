function formatPopulationLedger() {
const ss = SpreadsheetApp.openById("1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo");
const sheet = ss.getSheetByName("Registry") || ss.insertSheet("Registry");

// clear and create header row
sheet.clearContents();
const headers = [
"ID",
"Name",
"Address",
"Contact",
"Status",
"Notes",
"Last Updated"
];
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

// apply simple header formatting
const headerRange = sheet.getRange(1, 1, 1, headers.length);
headerRange.setFontWeight("bold").setBackground("#d9ead3");

Logger.log("✅ Population Ledger formatted successfully.");
}
