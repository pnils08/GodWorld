/**
* Register and ping universe sheets
* Run manually once, then schedule every 48 h.
*/
function pingRegisteredSheets() {
const ss = SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI');
const sheet = ss.getSheetByName('Registered_Sheets') || ss.insertSheet('Registered_Sheets');

// Header
if (sheet.getLastRow() === 0) {
sheet.appendRow(['Sheet_Name','Sheet_ID','Status','Last_Checked','Notes']);
}

// universe registry
const registry = [
['The Wild','1fpFDikkw5GgPpWb5O28934QGTXl_WVBcsZZU6FFOwEc'],
['Franchise_Stats_Master','1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss'],
['Riley_System_Log','1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI'],
['Wild Media Newswire','1FQCCqRBUsqixaOmsqcZi-j7aev81656c3UfoQ_DQSVQ'],
['Bay Tribune','1MVCJLpU1qs9IAJN6vyzMrzHkvRNl33pYwup_CDd-nGA'],
['Player_Audit_Log','1T2JbXnpKCpBBVjm0Jt0qA77d_KQi8rVJhqDPIuMUEJc'],
['Civic_Ledger','1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo'],
['Population_Ledger','1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo'],
['Slayer_Syndicate','1GuAoDvoEVfaGRB17RdnQYAFY7id47yB5rHOh3dj_DKA']
];

// clear & rebuild
sheet.clearContents();
sheet.appendRow(['Sheet_Name','Sheet_ID','Status','Last_Checked','Notes']);

registry.forEach(entry => {
const [name,id] = entry;
let status = '❌';
try {
const test = SpreadsheetApp.openById(id).getName();
status = '✅';
} catch (e) {
status = '⚠️';
}
sheet.appendRow([name,id,status,new Date(),'']);
});
}
