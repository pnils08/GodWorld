/**
* Create or update the Lineage tab inside the Population Ledger.
* Called once during Phase 2 initialization.
*/
function createLineageSchema() {
const POP_LEDGER_ID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo';
const book = SpreadsheetApp.openById(POP_LEDGER_ID);
const sheet =
book.getSheetByName('Lineage') || book.insertSheet('Lineage');

// clear any old data
sheet.clear();

// set up column headers
const headers = [
'PopID',
'LineageID',
'Parent1_PopID',
'Parent2_PopID',
'Spouse_PopID',
'Children_PopIDs',
'Tier',
'Birth_Year',
'Death_Year',
'Notes',
'Created_Timestamp'
];
sheet.appendRow(headers);

// style header row
const range = sheet.getRange(1, 1, 1, headers.length);
range.setFontWeight('bold').setBackground('#1E90FF').setFontColor('white');
sheet.setFrozenRows(1);
sheet.autoResizeColumns(1, headers.length);
Logger.log('✅ Lineage schema created or refreshed.');
}
