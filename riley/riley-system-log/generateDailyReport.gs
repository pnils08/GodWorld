function generateDailyReport() {
const logId = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI';
const ss = SpreadsheetApp.openById(logId);
const sheet = ss.getActiveSheet();
const last10 = sheet.getRange(Math.max(1, sheet.getLastRow() - 9), 1, 10, 3).getValues();
Logger.log('🗞 Latest System Activity:');
last10.forEach(r => Logger.log(r.join(' | ')));
}