//
function createStewardActions() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
let sheet = ss.getSheetByName('Steward_Actions');
if (!sheet) {
sheet = ss.insertSheet('Steward_Actions');
// Set up headers
sheet.getRange('A1:D1').setValues([['Timestamp', 'Command', 'Status', 'Notes']]);
}

const now = new Date();
const firstEntry = [
[
Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
'ACTIVATE_CYCLE_ANALYTICS = TRUE',
'Confirmed',
'Initial activation of analytics and reporter dispatch engine.'
]
];
sheet.getRange('A2:D2').setValues(firstEntry);

SpreadsheetApp.flush();
Logger.log('Steward_Actions sheet created and initialized.');
}
//