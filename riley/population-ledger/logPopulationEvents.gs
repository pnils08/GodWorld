function logPopulationEvent(eventType, entityName, popID, details = '') {
const POP_LEDGER_ID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo';
const ss = SpreadsheetApp.openById(POP_LEDGER_ID);

let eventSheet = ss.getSheetByName('Population_Events');
if (!eventSheet) {
eventSheet = ss.insertSheet('Population_Events');
eventSheet.appendRow(['Timestamp', 'EventType', 'Entity', 'PopID', 'Details']);
}

const timestamp = new Date();
eventSheet.appendRow([timestamp, eventType, entityName, popID, details]);
Logger.log(`📜 Logged ${eventType} for ${entityName} (${popID})`);
}
function detectPopulationEvents() {
const POP_LEDGER_ID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo';
const ss = SpreadsheetApp.openById(POP_LEDGER_ID);
const regSheet = ss.getSheetByName('Registry');
if (!regSheet) return;

const data = regSheet.getDataRange().getValues();
const headers = data[0];
const popIndex = headers.indexOf('PopID');
const nameIndex = headers.indexOf('Name');
const statusIndex = headers.indexOf('Status');
const spouseIndex = headers.indexOf('Spouse');
const childrenIndex = headers.indexOf('Children');

for (let i = 1; i < data.length; i++) {
const popID = data[i][popIndex];
const name = data[i][nameIndex];
const status = data[i][statusIndex];
const spouse = data[i][spouseIndex];
const children = data[i][childrenIndex];

if (status === 'Deceased') logPopulationEvent('Death', name, popID, 'Entity marked deceased');
if (spouse && spouse !== '') logPopulationEvent('Marriage', name, popID, `Married to ${spouse}`);
if (children && children.toString().trim() !== '') logPopulationEvent('Birth', name, popID, `Children: ${children}`);
}
}
