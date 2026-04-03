function formatCivicLedger() {
const ss = SpreadsheetApp.openById("1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo");
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

// apply basic header styling
const headerRange = sheet.getRange(1, 1, 1, headers.length);
headerRange.setFontWeight("bold").setBackground("#cfe2f3");

Logger.log("✅ Civic Ledger formatted successfully.");
}
