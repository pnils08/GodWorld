function onOpen() {
SpreadsheetApp.getUi()
.createMenu('Riley')
.addItem('Run Access Sync', 'runRileyAccess')
.addToUi();
}

function runRileyAccess() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const name = ss.getName();
SpreadsheetApp.getUi().alert('Riley has access to: ' + name);
}
