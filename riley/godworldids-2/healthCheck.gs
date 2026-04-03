/**
* Checks every Sheet / Script URL in the ID Master tab and logs its status.
* Add this file in Extensions → Apps Script, save, then run verifyLinks().
*/

function verifyLinks() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName('ID Master');
const data = sheet.getDataRange().getValues();

// find header indexes
const headers = data[0];
const linkCols = ['19FJZSoG_2u2PPTjIY9QKwz2xAKfLdJZhLloPia3eyX4','1KCsvD6xe40PHHuaO0a2PcyTgD7HKWqesO2EHQLDl22IWx3kQ5LZDWSpZ'];
const healthIndex = headers.indexOf('HealthCheck');
const nowIndex = headers.indexOf('LastChecked');

// if columns don't exist, add them
if (healthIndex === -1) sheet.insertColumnAfter(headers.length);
if (nowIndex === -1) sheet.insertColumnAfter(headers.length + 1);
const hcCol = sheet.getLastColumn() - 1;
const tsCol = sheet.getLastColumn();

// iterate through rows
for (let r = 1; r < data.length; r++) {
const row = data[r];
const links = [];
linkCols.forEach(name => {
const i = headers.indexOf(name);
if (i !== -1 && row[i]) links.push(row[i]);
});

let ok = true;
links.forEach(url => {
try {
const resp = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
if (resp.getResponseCode() >= 400) ok = false;
} catch (e) {
ok = false;
}
});

sheet.getRange(r + 1, hcCol).setValue(ok ? '✅' : '❌');
sheet.getRange(r + 1, tsCol).setValue(new Date());
}
}
