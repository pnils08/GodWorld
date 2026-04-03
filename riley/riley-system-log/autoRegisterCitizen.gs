/**
* Population Writer v1.0
* Writes new citizens directly into Population_Ledger → Issued_IDs
* Sheet ID (as provided): 1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo
*/

const POP_SHEET_ID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo';
const POP_TAB_NAME = 'Issued_IDs';

// Simple ID generator until vault counters activate
function issueNewID(prefix) {
const num = Math.floor(Math.random() * 99999);
return prefix + '-' + String(num).padStart(5, '0');
}

function autoRegisterCitizen() {
const ss = SpreadsheetApp.openById(POP_SHEET_ID);
const sheet = ss.getSheetByName(POP_TAB_NAME);

if (!sheet) {
Logger.log('❌ Cannot find Issued_IDs tab.');
return;
}

const sim = SpreadsheetApp.openById('1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk')
.getSheetByName('Simulation_Ledger');

if (!sim) {
Logger.log('❌ Missing Simulation_Ledger.');
return;
}

const data = sim.getDataRange().getValues();
const headers = data[0];

const cFirst = headers.indexOf('First');
const cLast = headers.indexOf('Last');
const cRole = headers.indexOf('RoleType');
const cTags = headers.indexOf('Tags');

for (let i = 1; i < data.length; i++) {
const row = data[i];
if (!row[cFirst] && !row[cLast]) continue;

const popID = issueNewID('POP');
const uniID = issueNewID('UNI');

sheet.appendRow([
popID,
uniID,
'', // MED
'', // CIV
'1', // Tier default
'', // #
`${row[cFirst]} ${row[cLast]}`,
new Date()
]);

Logger.log(`✓ Registered ${row[cFirst]} ${row[cLast]} as ${popID}`);
}

Logger.log('Population Writer Complete');
}
