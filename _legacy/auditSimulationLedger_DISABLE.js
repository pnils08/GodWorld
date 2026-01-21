//
function auditSimulationLedger() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const ledger = ss.getSheetByName('Simulation_Ledger');
if (!ledger) return SpreadsheetApp.getUi().alert('No Simulation_Ledger sheet found.');

const data = ledger.getDataRange().getValues();
const headers = data[0];
const idCols = ['POP', 'UNI', 'CIV', 'MED'].map(id => headers.indexOf(id + '-ID'));
const seen = { POP: new Set(), UNI: new Set(), CIV: new Set(), MED: new Set() };
const issues = [];

for (let i = 1; i < data.length; i++) {
idCols.forEach((col, idx) => {
const key = ['POP', 'UNI', 'CIV', 'MED'][idx];
const val = data[i][col];
if (val) {
if (seen[key].has(val)) {
issues.push(`Duplicate ${key}-ID: ${val} (row ${i + 1})`);
} else {
seen[key].add(val);
}
}
});
}

const msg = issues.length
? `⚠️ Integrity Issues Found:\n${issues.join('\n')}`
: '✅ All IDs are unique and ledger integrity is solid.';

SpreadsheetApp.getUi().alert(msg);
}
//