/** Smoke test: add one new Population record and run the normal updates. */
function smokeAddPerson() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const popSheet = ss.getSheetByName('Population') || ss.insertSheet('Population');
const regSheet = ss.getSheetByName('Registry') || ss.insertSheet('Registry');

// Ensure headers (no-ops if they already exist)
if (popSheet.getLastRow() === 0) {
popSheet.appendRow(['PopID','Name','Address','Contact','Status','Notes','Last Updated']);
}
if (regSheet.getLastRow() === 0) {
regSheet.appendRow(['Key','Value','Last Updated']);
}

// --- Create one new citizen ---
const popID = 'POP-' + Utilities.getUuid().slice(0, 8).toUpperCase();
const now = new Date();
const name = 'Smoke Test Citizen ' + now.toLocaleString();

popSheet.appendRow([
popID, // PopID
name, // Name
'', // Address
'', // Contact
'active', // Status
'seeded by smokeAddPerson',// Notes
now // Last Updated
]);

// --- Update Registry quick stat (total population) ---
const lastRow = popSheet.getLastRow();
const total = lastRow - 1; // minus header
writeOrUpsert_(regSheet, 'Total Population', total.toString(), now);

// --- Kick Phase-2/3 routines you already installed ---
safeCall_('updateLineageLedger'); // creates/refreshes Lineage sheet
safeCall_('buildPopulationAnalytics'); // refreshes Analytics sheet
safeCall_('runPopulationAuditCycle'); // posts the summary to Riley if wired

SpreadsheetApp.getUi().alert('✅ Smoke person added: ' + popID);
}

/** Upsert a key/value into Registry (row 2 if new). */
function writeOrUpsert_(sheet, key, value, when) {
const range = sheet.getDataRange();
const values = range.getValues();
let found = false;
for (let r = 2; r <= values.length; r++) {
if (values[r-1][0] === key) {
sheet.getRange(r, 2).setValue(value);
sheet.getRange(r, 3).setValue(when);
found = true;
break;
}
}
if (!found) {
sheet.appendRow([key, value, when]);
}
}

/** Call another function only if it exists to avoid editor-run errors. */
function safeCall_(fnName) {
try {
const fn = this[fnName];
if (typeof fn === 'function') fn();
} catch (e) {
Logger.log('Skipped ' + fnName + ': ' + e);
}
}
