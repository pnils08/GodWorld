function autoRegisterCitizen() {

const SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';
const POP_SSID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo';

const SIM_LEDGER_SHEET = 'Simulation_Ledger';
const COUNTER_SHEET = 'ID_Counters';
const POPULATION_SHEET = 'Population';
const ISSUED_IDS_SHEET = 'Issued_IDs';

const sim = SpreadsheetApp.openById(SIM_SSID);
const ledger = sim.getSheetByName(SIM_LEDGER_SHEET);
const ledgerValues = ledger.getDataRange().getValues();
const header = ledgerValues[0];

const firstCol = header.indexOf('First');
const middleCol = header.indexOf('Middle');
const lastCol = header.indexOf('Last');
const statusCol = header.indexOf('Status');
const tierCol = header.indexOf('Tier (1-4)');
const universeCol = header.indexOf('Universe (y/n)');
const civicCol = header.indexOf('Civic (y/n)');
const mediaCol = header.indexOf('Media (y/n)');
const intakeCodeCol = header.indexOf('Intake Code');

if (firstCol === -1 || lastCol === -1 || statusCol === -1) {
throw new Error("Missing required headers in Simulation_Ledger.");
}

const pop = SpreadsheetApp.openById(POP_SSID).getSheetByName(POPULATION_SHEET);
const issued = SpreadsheetApp.openById(POP_SSID).getSheetByName(ISSUED_IDS_SHEET);
const counters = sim.getSheetByName(COUNTER_SHEET);

function nextId(domain) {
const values = counters.getDataRange().getValues();
for (let i = 1; i < values.length; i++) {
if (values[i][0] === domain) {
const nextVal = values[i][1];
counters.getRange(i + 1, 2).setValue(nextVal + 1);
return domain + "-" + String(nextVal).padStart(5, '0');
}
}
throw new Error('Counter not found for: ' + domain);
}

for (let r = 1; r < ledgerValues.length; r++) {
const row = ledgerValues[r];

if (row[statusCol] !== 'POP-ID-PENDING') continue;

const fullName = [row[firstCol], row[middleCol], row[lastCol]]
.filter(Boolean)
.join(' ');

const tier = row[tierCol] || '';
const now = new Date();

const popID = nextId('POP');

let uniID = '';
let civID = '';
let medID = '';

if (row[universeCol] === 'Yes') {
uniID = nextId('UNI');
}

if (row[civicCol] === 'Yes') {
civID = nextId('CIV');
}

if (row[mediaCol] === 'Yes') {
medID = nextId('MED');
}

pop.appendRow([popID, fullName, '', '', 'Active', '', now]);

issued.appendRow([
popID,
uniID,
medID,
civID,
tier,
'',
'',
now
]);

ledger.getRange(r + 1, statusCol + 1).setValue('REGISTERED');
if (intakeCodeCol !== -1) {
ledger.getRange(r + 1, intakeCodeCol + 1).setValue(popID);
}
}
}
