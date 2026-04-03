function loadRegistry() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const tab = ss.getSheetByName("Registry") || ss.insertSheet("Registry");
tab.clearContents();

// Example registry data (you can replace this block later)
const data = `
Vault_Name Vault_ID Sheet_Link Script_Link File_Location Notes Last_Updated
Simulation 1TQVhY3B-KpoA6FarnIVXMfoXcwyv0_kk https://docs.google.com/spreadsheets/d/1TQVhY3B-KpoA6FarnIVXMfoXcwyv0_kk/edit none active Simulation vault active ${new Date()}
Narrative 1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk https://docs.google.com/spreadsheets/d/1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk/edit none active Narrative vault active ${new Date()}
Population 1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo https://docs.google.com/spreadsheets/d/1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo/edit none active Population ledger loaded ${new Date()}
`;

const rows = data.trim().split('\n').map(r => r.split('\t'));
const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
const filled = rows.map(r => {
while (r.length < width) r.push('');
return r;
});
tab.getRange(1, 1, filled.length, width).setValues(filled);
}
