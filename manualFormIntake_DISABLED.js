//
function manualFormIntake() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const intake = ss.getSheetByName('Intake');
const ledger = ss.getSheetByName('Simulation_Ledger');

// --- Intake layout (column B) ---
const first = intake.getRange("B2").getValue().trim();
const middle = intake.getRange("B3").getValue().trim();
const last = intake.getRange("B4").getValue().trim();

// --- Duplicate Check (First + Last only) ---
const fullName = [first, last].join(' ').replace(/\s+/g, ' ').trim();
if (!first || !last) {
SpreadsheetApp.getUi().alert("⚠️ Please enter at least a first and last name before submitting.");
return;
}

const lastRow = ledger.getLastRow();
if (lastRow > 1) {
const data = ledger.getRange(2, 2, lastRow - 1, 3).getValues();
const existing = data.map(r => r.join(' ').replace(/\s+/g, ' ').trim().toLowerCase());
const matchIndex = existing.indexOf(fullName.toLowerCase());
if (matchIndex !== -1) {
const duplicateRow = matchIndex + 2;
const rowRange = ledger.getRange(duplicateRow, 1, 1, ledger.getLastColumn());
rowRange.setBackground("#ffcccc");
SpreadsheetApp.getUi().alert(`⚠️ ${fullName} already exists in the Simulation Ledger.\n(Row ${duplicateRow} highlighted)`);
Utilities.sleep(4000);
rowRange.setBackground(null);
return;
}
}

// --- Continue reading intake ---
const tier = intake.getRange("B5").getValue();
const roleType = intake.getRange("B6").getValue();
const universeYN = intake.getRange("B7").getValue().toString().toLowerCase();
const civicYN = intake.getRange("B8").getValue().toString().toLowerCase();
const mediaYN = intake.getRange("B9").getValue().toString().toLowerCase();
const tags = intake.getRange("B10").getValue();
const originVault = intake.getRange("B11").getValue();
const officeHeld = intake.getRange("B12").getValue();
const lineage = intake.getRange("B13").getValue();

// --- ID Generation ---
const popID = getNextID('POP');
const uniID = (universeYN === 'yes') ? getNextID('UNI') : '';
const civID = (civicYN === 'yes') ? getNextID('CIV') : '';
const medID = (mediaYN === 'yes') ? getNextID('MED') : '';

const timestamp = new Date();
const status = 'Registered';
const intakeCode = Math.floor(10000 + Math.random() * 90000);

// --- Append to Ledger ---
ledger.appendRow([
popID, first, middle, last, tier, roleType,
uniID, civID, medID, tags, originVault,
officeHeld, lineage, status, timestamp, intakeCode
]);

// --- Write IDs back to Intake ---
intake.getRange("B14").setValue(`✅ Registered ${popID}`);
intake.getRange("B15").setValue(uniID ? `✅ Registered ${uniID}` : '');
intake.getRange("B16").setValue(civID ? `✅ Registered ${civID}` : '');
intake.getRange("B17").setValue(medID ? `✅ Registered ${medID}` : '');

// --- Safe Clear Intake Inputs (B2 → B13) ---
const lastInputRow = 13;
const totalRows = intake.getMaxRows();
if (totalRows >= lastInputRow) {
intake.getRange(`B2:B${lastInputRow}`).clearContent();
}

// --- Confirmation Toast ---
SpreadsheetApp.getActive().toast(`${fullName} successfully added to the Simulation Ledger.`, '✅ Entry Created', 5);
}
//