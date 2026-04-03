function testWriteToRiley() {
const sheet = SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI')
.getSheetByName('Federation_Status_Log');
sheet.appendRow([new Date(), 'Bay_Tribune', 'Active']);
}