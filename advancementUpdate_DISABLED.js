//
function Riley_Advancement_Intake() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const ledger = ss.getSheetByName('Simulation_Ledger');
const intake = ss.getSheetByName('Advancement_Intake');
const digest = ss.getSheetByName('Riley_Digest');

const ledgerData = ledger.getDataRange().getValues();
const headers = ledgerData[0].map(h => h.toString().trim().toLowerCase());
const popIndex = headers.indexOf('popid'); // note: no dash
const intakeData = intake.getRange(2, 1, intake.getLastRow() - 1, 4).getValues();

let updatesMade = 0;

intakeData.forEach(row => {
const [rawPop, rawField, newValue, notes] = row;
if (!rawPop || !rawField || !newValue) return;

const popID = rawPop.toString().trim();
const field = rawField.toString().trim().toLowerCase();

const ledgerRow = ledgerData.findIndex(r => r[popIndex] === popID);
if (ledgerRow === -1) return;

const fieldIndex = headers.indexOf(field);
Logger.log(`Trying to update ${field} at column index ${fieldIndex}`);
if (fieldIndex === -1) return;

ledger.getRange(ledgerRow + 1, fieldIndex + 1).setValue(newValue);

digest.appendRow([
new Date(),
`Advancement: ${popID}`,
`${rawField} updated to "${newValue}". ${notes || ''}`
]);

updatesMade++;
});

intake.getRange(2, 1, intake.getLastRow() - 1, 4).clearContent();
digest.appendRow([
new Date(),
`Cycle Summary`,
`${updatesMade} citizens advanced this cycle.`
]);
}
//