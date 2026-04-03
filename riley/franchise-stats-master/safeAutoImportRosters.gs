function safeAutoImportRosters() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const staging = ss.getSheetByName('Import_Staging'); // define staging sheet

if (!staging) {
SpreadsheetApp.getUi().alert('⚠️ Missing Import_Staging sheet.');
return;
}

// 🧹 Clear only data rows, keep header
if (staging.getLastRow() > 1) {
staging.getRange(2, 1, staging.getLastRow() - 1, staging.getLastColumn()).clearContent();
}

// ✅ Make sure 'Level' column exists
const header = staging.getRange(1, 1, 1, staging.getLastColumn()).getValues()[0];
if (!header.includes('Level')) {
staging.getRange(1, header.length + 1).setValue('Level');
SpreadsheetApp.getActiveSpreadsheet()
.toast('🟢 Added missing Level column automatically.');
}

Logger.log('Import_Staging ready and Level column confirmed.');
}
