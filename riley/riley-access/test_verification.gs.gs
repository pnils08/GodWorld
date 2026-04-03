function testSpreadsheetAccess() {
try {
const file = SpreadsheetApp.openById('1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo');
Logger.log('✅ Spreadsheet service loaded. Name: ' + file.getName());
} catch (e) {
Logger.log('❌ Spreadsheet service error: ' + e.message);
}
}
