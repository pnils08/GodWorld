//
function getNextID(type) {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName('ID_Counters');
const data = sheet.getDataRange().getValues();
const headers = data[0];
const typeIndex = headers.indexOf('Counter');
const valueIndex = headers.indexOf('NextValue');

for (let i = 1; i < data.length; i++) {
if (data[i][typeIndex].toString().trim().toUpperCase() === type.toUpperCase()) {
let next = data[i][valueIndex];
if (!next || isNaN(next)) next = 1;
const newID = `${type}-${String(next).padStart(5, '0')}`;
sheet.getRange(i + 1, valueIndex + 1).setValue(next + 1);
return newID;
}
}

throw new Error(`Counter type ${type} not found.`);
}
//