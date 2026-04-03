/**
* Read-only JSON/CSV feed generator
* Gives design tools a live, public (view-only) endpoint for sheet data
*/

function doGet(e) {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheetName = (e.parameter.sheet) ? e.parameter.sheet : 'Roster_DB';
const format = (e.parameter.format) ? e.parameter.format.toLowerCase() : 'json';
const sheet = ss.getSheetByName(sheetName);
const data = sheet.getDataRange().getValues();
const headers = data.shift();

if (format === 'csv') {
const csv = [headers.join(','), ...data.map(r => r.join(','))].join('\n');
return ContentService.createTextOutput(csv)
.setMimeType(ContentService.MimeType.CSV);
}

// default JSON
const jsonArray = data.map(row => {
const obj = {};
headers.forEach((h, i) => obj[h] = row[i]);
return obj;
});
return ContentService.createTextOutput(JSON.stringify(jsonArray))
.setMimeType(ContentService.MimeType.JSON);
}

