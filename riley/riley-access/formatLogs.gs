/**
* formatLogs v1.1 — auto-detects column count
* Color-codes the Riley_System_Log sheet automatically
*/
function formatLogSheet() {
const sheet = SpreadsheetApp.openById(LOG_SHEET_ID).getActiveSheet();
const range = sheet.getDataRange();
const values = range.getValues();
const numCols = range.getNumColumns(); // detect actual number of columns
const backgrounds = [];

for (let i = 0; i < values.length; i++) {
const row = values[i];
const type = row[1] ? row[1].toString().toLowerCase() : "";
let color = 'white';

if (type.includes('error')) color = '#ffcccc'; // red
else if (type.includes('check')) color = '#ccffcc'; // green
else if (type.includes('vault')) color = '#cce5ff'; // blue

// make a row of colors matching the number of columns
const rowColors = new Array(numCols).fill(color);
backgrounds.push(rowColors);
}

range.setBackgrounds(backgrounds);
}
