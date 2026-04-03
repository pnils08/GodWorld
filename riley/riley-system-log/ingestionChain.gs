/**
* runIngestionCycle()
* Reads Federation_Map and copies new data between connected sheets.
* Requires each source sheet to have a 'Last_Updated' column.
*/
function runIngestionCycle() {
const ss = SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI');
const mapSheet = ss.getSheetByName('Federation_Map');
const logSheet = ss.getSheetByName('Ingestion_Log') || ss.insertSheet('Ingestion_Log');

const map = mapSheet.getDataRange().getValues();
map.shift(); // remove header

logSheet.appendRow(['Cycle Start', new Date()]);

map.forEach(([sourceName, targetName]) => {
try {
const sourceId = getRegistryId(sourceName);
const targetId = getRegistryId(targetName);
const source = SpreadsheetApp.openById(sourceId).getSheets()[0];
const target = SpreadsheetApp.openById(targetId).getSheets()[0];

const data = source.getDataRange().getValues();
const headers = data.shift();
const lastCol = headers.indexOf('Last_Updated');
if (lastCol === -1) return;

const newRows = data.filter(r => {
const date = new Date(r[lastCol]);
const now = new Date();
const diff = (now - date) / (1000 * 60 * 60);
return diff <= 24; // only rows updated in last 24h
});

if (newRows.length > 0) {
newRows.forEach(r => target.appendRow(r));
logSheet.appendRow([`${sourceName} → ${targetName}`, `✅ ${newRows.length} rows moved`, new Date()]);
} else {
logSheet.appendRow([`${sourceName} → ${targetName}`, 'No new data', new Date()]);
}
} catch (err) {
logSheet.appendRow([`${sourceName} → ${targetName}`, `⚠️ Error: ${err.message}`, new Date()]);
}
});

logSheet.appendRow(['Cycle End', new Date()]);
}

/**
* Resolve sheet names to IDs
*/
function getRegistryId(name) {
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
return registry[name];
}
