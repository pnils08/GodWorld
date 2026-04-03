/**
* Check each Federation Map link and verify that both source and target sheets exist.
* Writes results to a tab called 'Federation_Audit'.
*/
function auditFederationLinks() {
const logId = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI';
const ss = SpreadsheetApp.openById(logId);
const mapSheet = ss.getSheetByName('Federation_Map');
const auditSheet = ss.getSheetByName('Federation_Audit') || ss.insertSheet('Federation_Audit');

auditSheet.clearContents();
auditSheet.appendRow(['Source_System','Target_System','Source_Status','Target_Status','Checked_On']);

const data = mapSheet.getDataRange().getValues();
data.shift(); // remove headers

const registry = {
"The_Wild":"1fpFDikkw5GgPpWb5O28934QGTXl_WVBcsZZU6FFOwEc",
"Franchise_Stats_Master":"1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss",
"Riley_System_Log":"1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI",
"Wild_Media_Newswire":"1FQCCqRBUsqixaOmsqcZi-j7aev81656c3UfoQ_DQSVQ",
"Bay_Tribune":"1MVCJLpU1qs9IAJN6vyzMrzHkvRNl33pYwup_CDd-nGA",
"Player_Audit_Log":"1T2JbXnpKCpBBVjm0Jt0qA77d_KQi8rVJhqDPIuMUEJc",
"Civic_Ledger":"1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo",
"Population_Ledger":"1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo",
"Slayer_Syndicate":"1GuAoDvoEVfaGRB17RdnQYAFY7id47yB5rHOh3dj_DKA"
};

data.forEach(row => {
const [source,target] = row;
const sourceId = registry[source];
const targetId = registry[target];

let sourceStatus = '❌';
let targetStatus = '❌';

try {
SpreadsheetApp.openById(sourceId).getName();
sourceStatus = '✅';
} catch(e) { sourceStatus = '⚠️'; }

try {
SpreadsheetApp.openById(targetId).getName();
targetStatus = '✅';
} catch(e) { targetStatus = '⚠️'; }

auditSheet.appendRow([source,target,sourceStatus,targetStatus,new Date()]);
});

return 'Federation Audit completed';
}

