//
/**
* GOD WORLD ENGINE – v1.0
* Uses:
* - World_Config
* - World_Population
* - Simulation_Ledger
* - Intake
* - Riley_Digest
* - World_Events (optional)
*/

function runWorldCycle() {
const SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';

const ss = SpreadsheetApp.openById(SIM_SSID);
const now = new Date();

const ctx = {
ss: ss,
now: now,
config: {},
summary: {
cycleId: null,
intakeProcessed: 0,
citizensAged: 0,
eventsGenerated: 0,
auditIssues: []
}
};

loadConfig_(ctx); // World_Config → ctx.config
advanceWorldTime_(ctx); // cycleCount, lastRun
updateWorldPopulation_(ctx); // World_Population
processIntake_(ctx); // Intake → Simulation_Ledger
updatePopulation_(ctx); // age ENGINE citizens
generateCitizensEvents_(ctx);
generateWorldEvents_(ctx); // optional, World_Events
runAudits_(ctx); // Simulation_Ledger checks
writeDigest_(ctx); // Riley_Digest
}

/**
* Load World_Config → ctx.config[key] = value
*/
function loadConfig_(ctx) {
const cfgSheet = ctx.ss.getSheetByName('World_Config');
if (!cfgSheet) return;

const values = cfgSheet.getDataRange().getValues();
for (let r = 1; r < values.length; r++) {
const key = (values[r][0] || '').toString().trim();
if (!key) continue;
let v = values[r][1];

// try to coerce numbers
if (typeof v === 'string') {
const n = parseFloat(v);
if (!isNaN(n)) v = n;
}
ctx.config[key] = v;
}
}

/**
* Advance world time / cycle counter.
* Uses keys: cycleCount, lastRun in World_Config.
*/
function advanceWorldTime_(ctx) {
const sheet = ctx.ss.getSheetByName('World_Config');
if (!sheet) return;
const values = sheet.getDataRange().getValues();

const idxKey = 0; // column A
const idxVal = 1; // column B

let cycleRow = null;
let lastRunRow = null;

for (let r = 1; r < values.length; r++) {
const key = (values[r][idxKey] || '').toString().trim();
if (key === 'cycleCount') cycleRow = r + 1;
if (key === 'lastRun') lastRunRow = r + 1;
}

let cycle = Number(ctx.config.cycleCount || 0);
cycle += 1;
ctx.summary.cycleId = cycle;

if (cycleRow) sheet.getRange(cycleRow, idxVal + 1).setValue(cycle);
if (lastRunRow) sheet.getRange(lastRunRow, idxVal + 1).setValue(ctx.now);

ctx.config.cycleCount = cycle;
}

/**
* Update World_Population sheet using simple birth/death/migration math.
* Expects headers as you defined:
* totalPopulation | birthRate | deathRate | netMigration | age_0_18 | age_19_35 | age_36_64 | age_65_plus | educatedCount | uneducatedCount | employedCount | unemployedCount
*/
function updateWorldPopulation_(ctx) {
const sheet = ctx.ss.getSheetByName('World_Population');
if (!sheet) return;

const values = sheet.getDataRange().getValues();
if (values.length < 2) return;

const header = values[0];
const row = values[1];

const idx = name => header.indexOf(name);

const iTotal = idx('totalPopulation');
const iBirthRate = idx('birthRate');
const iDeathRate = idx('deathRate');
const iNetMig = idx('netMigration');

let total = Number(row[iTotal] || 0);
const birthRate = Number(row[iBirthRate] || ctx.config.growthRate || 0.012);
const deathRate = Number(row[iDeathRate] || ctx.config.deathRate || 0.009);
const migRate = Number(row[iNetMig] || ctx.config.migrationRate || 0.001);

const births = Math.round(total * birthRate);
const deaths = Math.round(total * deathRate);
const migration = Math.round(total * migRate);

let newTotal = total + births - deaths + migration;
if (newTotal < 0) newTotal = 0;

// write back totalPopulation
sheet.getRange(2, iTotal + 1).setValue(newTotal);

// update rates too in case config changed
sheet.getRange(2, iBirthRate + 1).setValue(birthRate);
sheet.getRange(2, iDeathRate + 1).setValue(deathRate);
sheet.getRange(2, iNetMig + 1).setValue(migRate);
}

/**
* Intake → Simulation_Ledger (assign POPID, copy fields, clear intake rows)
*/
function processIntake_(ctx) {
const intake = ctx.ss.getSheetByName('Intake');
const ledger = ctx.ss.getSheetByName('Simulation_Ledger');
if (!intake || !ledger) return;

const intakeValues = intake.getDataRange().getValues();
if (intakeValues.length < 2) return;

const intakeHeader = intakeValues[0];
const ledgerValues = ledger.getDataRange().getValues();
const ledgerHeader = ledgerValues[0];

const idxI = name => intakeHeader.indexOf(name);
const idxL = name => ledgerHeader.indexOf(name);

const rowsToClear = [];
const newRows = [];

for (let r = 1; r < intakeValues.length; r++) {
const row = intakeValues[r];
const first = (row[idxI('First')] || '').toString().trim();
const last = (row[idxI('Last')] || '').toString().trim();
if (!first && !last) continue;
if (existsInLedger_(ledger, first, last)) continue;

// generate next POPID using the *current* ledger
const popId = nextPopIdFromLedger_(
ledger.getDataRange().getValues(),
ledgerHeader
);

const newLedgerRow = new Array(ledgerHeader.length).fill('');
newLedgerRow[idxL('POPID')] = popId;
newLedgerRow[idxL('First')] = first;
newLedgerRow[idxL('Middle')] = (row[idxI('Middle')] || '').toString().trim();
newLedgerRow[idxL('Last')] = last;
newLedgerRow[idxL('OriginGame')] = (row[idxI('OriginGame')] || '').toString().trim();
newLedgerRow[idxL('UNI (y/n)')] = (row[idxI('UNI (y/n)')] || '').toString().trim();
newLedgerRow[idxL('MED (y/n)')] = (row[idxI('MED (y/n)')] || '').toString().trim();
newLedgerRow[idxL('CIV (y/n)')] = (row[idxI('CIV (y/n)')] || '').toString().trim();
newLedgerRow[idxL('ClockMode')] = (row[idxI('ClockMode')] || 'ENGINE').toString().trim();
newLedgerRow[idxL('Tier')] = row[idxI('Tier')] || '';
newLedgerRow[idxL('RoleType')] = (row[idxI('RoleType')] || '').toString().trim();
newLedgerRow[idxL('Status')] = (row[idxI('Status')] || 'Active').toString().trim();
newLedgerRow[idxL('BirthYear')] = row[idxI('BirthYear')] || '';
newLedgerRow[idxL('OriginCity')] = (row[idxI('OriginCity')] || '').toString().trim();
newLedgerRow[idxL('LifeHistory')] = (row[idxI('LifeHistory')] || '').toString().trim();
newLedgerRow[idxL('CreatedAt')] = ctx.now;
newLedgerRow[idxL('LastUpdated')] = ctx.now;

// write this row IMMEDIATELY so next POP-ID sees updated ledger
const writeRow = ledger.getLastRow() + 1;
ledger.getRange(writeRow, 1, 1, newLedgerRow.length).setValues([newLedgerRow]);

// mark this intake row to clear
rowsToClear.push(r + 1);

ctx.summary.intakeProcessed++;
}

// clear intake rows from bottom up
rowsToClear.sort(function(a,b){return b-a;});
rowsToClear.forEach(function(rowIndex) {
intake.getRange(rowIndex, 1, 1, intake.getLastColumn()).clearContent();
});
}

/**
* Helper: compute next POPID by scanning existing ledger.
* Uses POP-00001 style.
*/
function nextPopIdFromLedger_(ledgerValues, ledgerHeader) {
const idxPop = ledgerHeader.indexOf('POPID');
if (idxPop < 0) return 'POP-00001';

let maxN = 0;
for (let r = 1; r < ledgerValues.length; r++) {
const val = (ledgerValues[r][idxPop] || '').toString().trim();
if (!val) continue;
const m = val.match(/^POP-(\d+)$/);
if (m) {
const n = Number(m[1]);
if (n > maxN) maxN = n;
}
}
const next = maxN + 1;
return 'POP-' + String(next).padStart(5, '0');
}

/**
* Update named citizens: only those with ClockMode == 'ENGINE' get aged/touched.
*/
function updatePopulation_(ctx) {
const ledger = ctx.ss.getSheetByName('Simulation_Ledger');
if (!ledger) return;

const dataRange = ledger.getDataRange();
const values = dataRange.getValues();
if (values.length < 2) return;

const header = values[0];
const rows = values.slice(1);

const idx = name => header.indexOf(name);

const iStatus = idx('Status');
const iClockMode = idx('ClockMode');
const iBirthYear = idx('BirthYear');
const iLastUpdated= idx('LastUpdated');

for (let i = 0; i < rows.length; i++) {
const row = rows[i];
const status = (row[iStatus] || '').toString().trim();
const clock = (row[iClockMode] || 'ENGINE').toString().trim();

if (status === 'Deceased') continue;

// only ENGINE-time citizens get aged by engine cycles
if (clock === 'ENGINE') {
row[iLastUpdated] = ctx.now;
ctx.summary.citizensAged++;
}

// birthYear can be used for age calculations later; we don't change it here
}

ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/**
* Simple event stub.
*/
function generateWorldEvents_(ctx) {
const sheet = ctx.ss.getSheetByName('World_Events');
if (!sheet) return;

if (Math.random() < 0.1) {
sheet.appendRow([
ctx.now,
'PULSE',
'World cycle ' + (ctx.summary.cycleId || '') + ' completed.'
]);
ctx.summary.eventsGenerated++;
}
}

/**
* Audit Simulation_Ledger for POPID problems.
*/
function runAudits_(ctx) {
const ledger = ctx.ss.getSheetByName('Simulation_Ledger');
if (!ledger) return;

const values = ledger.getDataRange().getValues();
if (values.length < 2) return;

const header = values[0];
const idxPop = header.indexOf('POPID');
const idxFirst = header.indexOf('First');
const idxLast = header.indexOf('Last');
if (idxPop < 0) return;

const seen = {};
for (let r = 1; r < values.length; r++) {
const row = values[r];
const popId = (row[idxPop] || '').toString().trim();
const first = (row[idxFirst] || '').toString().trim();
const last = (row[idxLast] || '').toString().trim();

// ignore totally empty rows
if (!first && !last && !popId) continue;

if (!popId) {
ctx.summary.auditIssues.push('Row ' + (r + 1) + ' missing POPID');
continue;
}
if (seen[popId]) {
ctx.summary.auditIssues.push('Duplicate POPID: ' + popId + ' at row ' + (r + 1));
} else {
seen[popId] = true;
}
}
}
function updateWorldPopulation_(ctx) {
const sheet = ctx.ss.getSheetByName('World_Population');
if (!sheet) return;

const values = sheet.getDataRange().getValues();
if (values.length < 2) return;

const header = values[0];
const row = values[1];

const idx = name => header.indexOf(name);

const iTotal = idx('totalPopulation');
const iBirthRate = idx('birthRate');
const iDeathRate = idx('deathRate');
const iNetMig = idx('netMigration');
const i0_18 = idx('age_0_18');
const i19_35 = idx('age_19_35');
const i36_64 = idx('age_36_64');
const i65p = idx('age_65_plus');
const iEdu = idx('educatedCount');
const iUnEdu = idx('uneducatedCount');
const iEmp = idx('employedCount');
const iUnEmp = idx('unemployedCount');

let total = Number(row[iTotal] || 0);
let births = Math.round(total * Number(row[iBirthRate] || 0.012));
let deaths = Math.round(total * Number(row[iDeathRate] || 0.009));
let migration = Math.round(total * Number(row[iNetMig] || 0.001));

let newTotal = total + births - deaths + migration;
if (newTotal < 0) newTotal = 0;

// Age distribution shifts
let a0_18 = Number(row[i0_18] || 0);
let a19_35 = Number(row[i19_35] || 0);
let a36_64 = Number(row[i36_64] || 0);
let a65p = Number(row[i65p] || 0);

// Add births to 0-18
a0_18 += births;

// Deaths hit elderly more heavily
let d65 = Math.min(Math.round(deaths * 0.5), a65p);
let d36 = Math.min(Math.round(deaths * 0.3), a36_64);
let d19 = Math.min(Math.round(deaths * 0.2), a19_35);

a65p -= d65;
a36_64 -= d36;
a19_35 -= d19;

// People age forward
let move19 = Math.round(a0_18 * 0.05);
let move36 = Math.round(a19_35 * 0.04);
let move65 = Math.round(a36_64 * 0.03);

a0_18 -= move19;
a19_35 += move19 - move36;
a36_64 += move36 - move65;
a65p += move65;

// Education / employment drift
let edu = Number(row[iEdu] || 0);
let unEdu = Number(row[iUnEdu] || 0);
let emp = Number(row[iEmp] || 0);
let unEmp = Number(row[iUnEmp] || 0);

// Education shifts (1% per cycle)
let newEdu = Math.round(unEdu * 0.01);
edu += newEdu;
unEdu -= newEdu;

// Employment shifts (2% movement)
let newJobs = Math.round(unEmp * 0.02);
emp += newJobs;
unEmp -= newJobs;

// Write back
sheet.getRange(2, iTotal + 1).setValue(newTotal);
sheet.getRange(2, i0_18 + 1).setValue(a0_18);
sheet.getRange(2, i19_35 + 1).setValue(a19_35);
sheet.getRange(2, i36_64 + 1).setValue(a36_64);
sheet.getRange(2, i65p + 1).setValue(a65p);
sheet.getRange(2, iEdu + 1).setValue(edu);
sheet.getRange(2, iUnEdu + 1).setValue(unEdu);
sheet.getRange(2, iEmp + 1).setValue(emp);
sheet.getRange(2, iUnEmp + 1).setValue(unEmp);
}
function retireCitizen(popId) {
const ss = SpreadsheetApp.getActive();
const ledger = ss.getSheetByName('Simulation_Ledger');
const log = ss.getSheetByName('LifeHistory_Log');
if (!ledger) return;

const data = ledger.getDataRange().getValues();
const header = data[0];
const idxPop = header.indexOf('POPID');
const idxClock = header.indexOf('ClockMode');
const idxStatus = header.indexOf('Status');
const idxLife = header.indexOf('LifeHistory');
const idxLast = header.indexOf('LastUpdated');

for (let r = 1; r < data.length; r++) {
if ((data[r][idxPop] || '').toString().trim() === popId) {

// Switch GAME → ENGINE
data[r][idxClock] = 'ENGINE';
data[r][idxStatus] = 'Retired';
data[r][idxLast] = new Date();

// Life history summary
const snippet = "Retired from active simulation and entered Engine timeline.";
const existing = data[r][idxLife] ? data[r][idxLife].toString() : '';
data[r][idxLife] = existing ? existing + "\n" + snippet : snippet;

// Write to ledger
ledger.getRange(r + 1, 1, 1, data[r].length).setValues([data[r]]);

// Write log entry
if (log) {
log.appendRow([
new Date(),
popId,
"Retirement",
snippet,
"Engine",
"",
""
]);
}

return;
}
}
}
/**
* Write cycle summary into Riley_Digest.
* Columns:
* Timestamp | Cycle | IntakeProcessed | CitizensAged | EventsGenerated | Issues
*/
function writeDigest_(ctx) {
const digest = ctx.ss.getSheetByName('Riley_Digest');
if (!digest) return;

const issues = ctx.summary.auditIssues;
const issuesText = issues.length ? issues.join(' | ') : '';

digest.appendRow([
ctx.now,
ctx.summary.cycleId || '',
ctx.summary.intakeProcessed,
ctx.summary.citizensAged,
ctx.summary.eventsGenerated,
issuesText
]);
function existsInLedger_(ledger, first, last) {
const values = ledger.getDataRange().getValues();
const header = values[0];

const idxFirst = header.indexOf('First');
const idxLast = header.indexOf('Last');

for (let r = 1; r < values.length; r++) {
const f = (values[r][idxFirst] || '').toString().trim();
const l = (values[r][idxLast] || '').toString().trim();
if (f === first && l === last) return true;
}

return false;
}
}
//
