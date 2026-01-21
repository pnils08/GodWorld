//
/**
* GOD WORLD ENGINE – MAIN CYCLE ENTRYPOINT
*
* Paste this whole file into your Apps Script project.
* Set SIM_SSID to your actual Simulation_Narrative sheet ID.
*/

function runWorldCycle() {
const SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';

const ss = SpreadsheetApp.openById(SIM_SSID);
const now = new Date();

const ctx = {
ss: ss,
now: now,
summary: {
cycleId: null,
intakeProcessed: 0,
citizensAged: 0,
eventsGenerated: 0,
auditIssues: []
}
};

// 1) advance world time / cycle counter
advanceWorldTime_(ctx);

// 2) intake → simulation ledger (POP-ID assignment)
processIntake_(ctx);

// 3) population maintenance (simple aging + timestamp)
updatePopulation_(ctx);

// 4) raw world events (placeholder stub)
generateWorldEvents_(ctx);

// 5) audits / integrity checks
runAudits_(ctx);

// 6) write cycle summary to digest
writeDigest_(ctx);
}

/**
* STEP 1 — WORLD TIME / CYCLE COUNTER
* Reads and increments cycle counter in World_Config if present.
*/
function advanceWorldTime_(ctx) {
const ss = ctx.ss;
const cfg = ss.getSheetByName('World_Config');
if (!cfg) return;

const values = cfg.getDataRange().getValues();
if (values.length === 0) return;

const header = values[0];
const idxCycle = header.indexOf('Cycle');
const idxLastRun = header.indexOf('LastRun');

// Use first data row (row 2) for global config
if (values.length < 2) {
// Initialize row if missing
cfg.appendRow(['Cycle', 'LastRun']);
cfg.appendRow([1, ctx.now]);
ctx.summary.cycleId = 1;
return;
}

const row = values[1];
let cycle = idxCycle >= 0 ? (row[idxCycle] || 0) : 0;
cycle = Number(cycle) || 0;
cycle += 1;

if (idxCycle >= 0) {
cfg.getRange(2, idxCycle + 1).setValue(cycle);
}
if (idxLastRun >= 0) {
cfg.getRange(2, idxLastRun + 1).setValue(ctx.now);
}

ctx.summary.cycleId = cycle;
}

/**
* STEP 2 — INTAKE → SIMULATION_LEDGER (POP-ID assignment only)
* Expects an "Intake" sheet and "Simulation_Ledger" sheet.
* Intake headers should at least include: First, Middle, Last, Tags, OriginVault, Office_Held, Lineage.
*/
function processIntake_(ctx) {
const ss = ctx.ss;
const intake = ss.getSheetByName('Intake');
const ledger = ss.getSheetByName('Simulation_Ledger');
const counters = ss.getSheetByName('ID_Counters');
if (!intake || !ledger || !counters) return;

const values = intake.getDataRange().getValues();
if (values.length < 2) return; // header only

const header = values[0];
const idxFirst = header.indexOf('First');
const idxMiddle = header.indexOf('Middle');
const idxLast = header.indexOf('Last');
const idxTier = header.indexOf('Tier');
const idxRoleType = header.indexOf('RoleType');
const idxUni = header.indexOf('Universe (y/n)');
const idxCiv = header.indexOf('Civic (y/n)');
const idxMed = header.indexOf('Media (y/n)');
const idxTags = header.indexOf('Tags');
const idxOrigin = header.indexOf('OriginVault');
const idxOffice = header.indexOf('Office_Held');
const idxLineage = header.indexOf('Lineage');

const ledgerValues = ledger.getDataRange().getValues();
const ledgerHeader = ledgerValues[0];

const idxLPop = ledgerHeader.indexOf('POPID');
const idxLFirst = ledgerHeader.indexOf('First');
const idxLMiddle = ledgerHeader.indexOf('Middle');
const idxLLast = ledgerHeader.indexOf('Last');
const idxLTier = ledgerHeader.indexOf('Tier');
const idxLRoleType = ledgerHeader.indexOf('RoleType');
const idxLUni = ledgerHeader.indexOf('Universe (y/n)');
const idxLCiv = ledgerHeader.indexOf('Civic (y/n)');
const idxLMed = ledgerHeader.indexOf('Media (y/n)');
const idxLTags = ledgerHeader.indexOf('Tags');
const idxLOrigin = ledgerHeader.indexOf('OriginVault');
const idxLOffice = ledgerHeader.indexOf('Office_Held');
const idxLLineage = ledgerHeader.indexOf('Lineage');
const idxLStatus = ledgerHeader.indexOf('Status');
const idxLCreated = ledgerHeader.indexOf('Created at');
const idxLIntakeCode = ledgerHeader.indexOf('Intake Code');

const rowsToClear = [];

for (let r = 1; r < values.length; r++) {
const row = values[r];

// skip empty rows (no First and no Last)
const first = idxFirst >= 0 ? (row[idxFirst] || '').toString().trim() : '';
const last = idxLast >= 0 ? (row[idxLast] || '').toString().trim() : '';
if (!first && !last) continue;

const middle = idxMiddle >= 0 ? (row[idxMiddle] || '').toString().trim() : '';
const tier = idxTier >= 0 ? row[idxTier] : '';
const roleType = idxRoleType >= 0 ? row[idxRoleType] : '';
const uniFlag = idxUni >= 0 ? row[idxUni] : '';
const civFlag = idxCiv >= 0 ? row[idxCiv] : '';
const medFlag = idxMed >= 0 ? row[idxMed] : '';
const tags = idxTags >= 0 ? row[idxTags] : '';
const originVault = idxOrigin >= 0 ? (row[idxOrigin] || 'Engine') : 'Engine';
const office = idxOffice >= 0 ? row[idxOffice] : '';
const lineage = idxLineage >= 0 ? row[idxLineage] : '';

const popId = nextPopId_(counters);

const newLedgerRow = new Array(ledgerHeader.length).fill('');

if (idxLPop >= 0) newLedgerRow[idxLPop] = popId;
if (idxLFirst >= 0) newLedgerRow[idxLFirst] = first;
if (idxLMiddle >= 0) newLedgerRow[idxLMiddle] = middle;
if (idxLLast >= 0) newLedgerRow[idxLLast] = last;
if (idxLTier >= 0) newLedgerRow[idxLTier] = tier;
if (idxLRoleType >= 0) newLedgerRow[idxLRoleType] = roleType;
if (idxLUni >= 0) newLedgerRow[idxLUni] = uniFlag;
if (idxLCiv >= 0) newLedgerRow[idxLCiv] = civFlag;
if (idxLMed >= 0) newLedgerRow[idxLMed] = medFlag;
if (idxLTags >= 0) newLedgerRow[idxLTags] = tags;
if (idxLOrigin >= 0) newLedgerRow[idxLOrigin] = originVault;
if (idxLOffice >= 0) newLedgerRow[idxLOffice] = office;
if (idxLLineage >= 0) newLedgerRow[idxLLineage] = lineage;
if (idxLStatus >= 0) newLedgerRow[idxLStatus] = 'Active';
if (idxLCreated >= 0) newLedgerRow[idxLCreated] = ctx.now;
if (idxLIntakeCode >= 0) newLedgerRow[idxLIntakeCode] = 'INTAKE-' + popId;

ledger.appendRow(newLedgerRow);
rowsToClear.push(r + 1); // actual sheet row index

ctx.summary.intakeProcessed++;
}

// clear processed intake rows (from bottom to top)
rowsToClear.sort(function (a, b) { return b - a; });
rowsToClear.forEach(function (rowIndex) {
intake.getRange(rowIndex, 1, 1, intake.getLastColumn()).clearContent();
});
}

/**
* Helper — generate next POP-ID from ID_Counters sheet.
* Expects a row with Counter = 'POP' and NextValue numeric.
*/
function nextPopId_(countersSheet) {
const values = countersSheet.getDataRange().getValues();
if (values.length < 2) {
throw new Error('ID_Counters must have at least one data row for POP.');
}
const header = values[0];
const idxCounter = header.indexOf('Counter');
const idxNextVal = header.indexOf('NextValue');
if (idxCounter < 0 || idxNextVal < 0) {
throw new Error('ID_Counters missing Counter or NextValue columns.');
}

for (let r = 1; r < values.length; r++) {
const row = values[r];
if (row[idxCounter] === 'POP') {
let nextVal = Number(row[idxNextVal]) || 1;
const popId = 'POP-' + String(nextVal).padStart(5, '0');
nextVal += 1;
countersSheet.getRange(r + 1, idxNextVal + 1).setValue(nextVal);
return popId;
}
}

throw new Error('No POP counter row found in ID_Counters.');
}

/**
* STEP 3 — POPULATION MAINTENANCE
* Simple version: update a "Last Updated" or "AgeTicks" if present.
*/
function updatePopulation_(ctx) {
const ss = ctx.ss;
const ledger = ss.getSheetByName('Simulation_Ledger');
if (!ledger) return;

const values = ledger.getDataRange().getValues();
if (values.length < 2) return;

const header = values[0];
const idxStatus = header.indexOf('Status');
const idxLastUpdated = header.indexOf('Last Updated');
const idxAgeTicks = header.indexOf('AgeTicks');

// create Last Updated column if missing
if (idxLastUpdated < 0) {
ledger.getRange(1, header.length + 1).setValue('Last Updated');
}

const lastCol = ledger.getLastColumn();
const updatedHeader = ledger.getRange(1, 1, 1, lastCol).getValues()[0];
const finalIdxLastUpdated = updatedHeader.indexOf('Last Updated');

for (let r = 1; r < values.length; r++) {
const row = values[r];

const status = idxStatus >= 0 ? (row[idxStatus] || '') : '';
if (status === 'Deceased') continue;

// update Last Updated
if (finalIdxLastUpdated >= 0) {
ledger.getRange(r + 1, finalIdxLastUpdated + 1).setValue(ctx.now);
}

// optional AgeTicks increment
if (idxAgeTicks >= 0) {
const age = Number(row[idxAgeTicks]) || 0;
ledger.getRange(r + 1, idxAgeTicks + 1).setValue(age + 1);
}

ctx.summary.citizensAged++;
}
}

/**
* STEP 4 — RAW WORLD EVENTS (stub)
* Writes a simple event into a World_Events sheet if it exists.
* You can customize this later.
*/
function generateWorldEvents_(ctx) {
const ss = ctx.ss;
const eventsSheet = ss.getSheetByName('World_Events');
if (!eventsSheet) return;

// Simple example: 10% chance to log a random "pulse" event
if (Math.random() < 0.1) {
eventsSheet.appendRow([
ctx.now,
'PULSE',
'World cycle ' + (ctx.summary.cycleId || '') + ' completed.'
]);
ctx.summary.eventsGenerated++;
}
}

/**
* STEP 5 — AUDITS / INTEGRITY
* Checks for duplicate POPIDs and missing POPIDs.
*/
function runAudits_(ctx) {
const ss = ctx.ss;
const ledger = ss.getSheetByName('Simulation_Ledger');
if (!ledger) return;

const values = ledger.getDataRange().getValues();
if (values.length < 2) return;

const header = values[0];
const idxPop = header.indexOf('POPID');
if (idxPop < 0) return;

const seen = {};
for (let r = 1; r < values.length; r++) {
const row = values[r];
const popId = (row[idxPop] || '').toString().trim();
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

/**
* STEP 6 — DIGEST / LOGGING
* Writes a summary row into Riley_Digest if it exists.
*/
function writeDigest_(ctx) {
const ss = ctx.ss;
const digest = ss.getSheetByName('Riley_Digest');
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
}
/**
* LifeHistory helpers
* - logLifeEvent_(ctx, popId, eventType, description, source, gameYear)
* - manualLogLifeEvent() for ad-hoc manual entry
*/

/**
* Internal helper to log a life event and update LifeHistory summary.
*
* @param {Object} ctx Engine context (ss, now, summary.cycleId). If null, minimal ctx is built.
* @param {string} popId POPID, e.g. "POP-00001"
* @param {string} eventType e.g. "Career","Injury","Personal","Retirement","MemoryImport"
* @param {string} description Human-readable description of the event
* @param {string} source e.g. "MLB","NBA 2K","Engine","Civic","Manual"
* @param {number|string} gameYear Year in game timeline (optional, can be blank)
*/
function logLifeEvent_(ctx, popId, eventType, description, source, gameYear) {
// allow calling without ctx (manual usage)
var ss = ctx && ctx.ss ? ctx.ss : SpreadsheetApp.getActive();
var now = ctx && ctx.now ? ctx.now : new Date();
var cycleId = ctx && ctx.summary && ctx.summary.cycleId ? ctx.summary.cycleId : getCurrentCycle_(ss);

var lhSheet = ss.getSheetByName('LifeHistory_Log');
if (!lhSheet) {
throw new Error('LifeHistory_Log sheet not found.');
}

// append to LifeHistory_Log
lhSheet.appendRow([
now,
popId,
eventType || '',
description || '',
source || '',
gameYear || '',
cycleId || ''
]);

// also append a short summary line into Simulation_Ledger.LifeHistory
var ledger = ss.getSheetByName('Simulation_Ledger');
if (!ledger) return;

var data = ledger.getDataRange().getValues();
if (data.length < 2) return;

var header = data[0];
var idxPop = header.indexOf('POPID');
var idxLife = header.indexOf('LifeHistory');

if (idxPop < 0 || idxLife < 0) return;

for (var r = 1; r < data.length; r++) {
var rowPop = (data[r][idxPop] || '').toString().trim();
if (rowPop === popId) {
var existing = data[r][idxLife] ? data[r][idxLife].toString() : '';
var snippet = (gameYear ? gameYear + ' – ' : '') + (description || '');
if (snippet) {
var newSummary = existing ? (existing + '\n' + snippet) : snippet;
data[r][idxLife] = newSummary;
ledger.getRange(r + 1, idxLife + 1).setValue(newSummary);
}
break;
}
}
}

/**
* Manual helper you can run from the editor to add a life event.
* Prompts you for fields and calls logLifeEvent_.
*/
function manualLogLifeEvent() {
var ss = SpreadsheetApp.getActive();
var popId = Browser.inputBox('Life Event', 'Enter POPID (e.g. POP-00001)', Browser.Buttons.OK_CANCEL);
if (popId === 'cancel' || !popId) return;

var eventType = Browser.inputBox('Life Event', 'Event type (Career/Injury/Personal/Retirement/etc.)', Browser.Buttons.OK_CANCEL);
if (eventType === 'cancel') return;

var description = Browser.inputBox('Life Event', 'Description of event', Browser.Buttons.OK_CANCEL);
if (description === 'cancel') return;

var source = Browser.inputBox('Life Event', 'Source (MLB/NBA 2K/Engine/Civic/Manual/etc.)', Browser.Buttons.OK_CANCEL);
if (source === 'cancel') return;

var gameYear = Browser.inputBox('Life Event', 'Game year (optional, e.g. 2027). Leave blank if not needed.', Browser.Buttons.OK_CANCEL);
if (gameYear === 'cancel') return;

var ctx = {
ss: ss,
now: new Date(),
summary: { cycleId: getCurrentCycle_(ss) }
};

logLifeEvent_(ctx, popId, eventType, description, source, gameYear);
}

/**
* Helper: read current cycleCount from World_Config.
*/
function getCurrentCycle_(ss) {
var sheet = ss.getSheetByName('World_Config');
if (!sheet) return '';
var values = sheet.getDataRange().getValues();
for (var r = 1; r < values.length; r++) {
var key = (values[r][0] || '').toString().trim();
if (key === 'cycleCount') {
return values[r][1] || '';
}
}
return '';


}
//