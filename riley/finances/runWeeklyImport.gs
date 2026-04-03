/**
* CONFIG
*/
const CFG = {
FOLDER_ID: '1OTpL2WtsEkKfqInUnomg8PQ0K83gzRCq',
ARCHIVE_SUBFOLDER: 'Archive',
SHEET_TRANSACTIONS: 'Transactions',
SHEET_SPENDING: '01_Spending_Tracker',
SHEET_DEBTS: '02_Debt_Tracker',
DATE_COL_FORMATS: ['MM/dd/yyyy','M/d/yyyy','yyyy-MM-dd','dd-MMM-yyyy'],
CATEGORY_RULES: [
{match:/ubereats|doordash|restaurant|mcdonald|taco bell|chipotle/i, cat:'Food'},
{match:/shell|bp|exxon|chevron|marathon|gas/i, cat:'Transportation'},
{match:/comcast|att|xfinity|verizon|electric|comed|water|gas bill/i, cat:'Utilities'},
{match:/netflix|spotify|hulu|disney/i, cat:'Entertainment'},
{match:/walgreens|cvs|pharmacy|clinic|hospital/i, cat:'Health'},
{match:/.*/, cat:'Miscellaneous'}
]
};

/**
* Entry point: import all CSVs in folder, append to Transactions, update rollups, archive files.
*/
function runWeeklyImport() {
const folder = DriveApp.getFolderById(CFG.FOLDER_ID);
const archive = getOrCreateSubfolder_(folder, CFG.ARCHIVE_SUBFOLDER);
const files = folder.getFilesByType(MimeType.CSV);
const ss = SpreadsheetApp.getActive();

const txSheet = getOrCreateSheet_(ss, CFG.SHEET_TRANSACTIONS, [
'Date','Description','Amount','Type','Account','Category','SourceFile'
]);

const appendedRows = [];

while (files.hasNext()) {
const file = files.next();
const content = Utilities.parseCsv(file.getBlob().getDataAsString());
const header = content[0].map(h => (h || '').toString().trim().toLowerCase());
// Try to map common columns
const idx = {
date: indexOfLike_(header, ['date','posted','post date','transaction date']),
desc: indexOfLike_(header, ['description','memo','name','details']),
amount: indexOfLike_(header, ['amount','debit','credit','value']),
type: indexOfLike_(header, ['type','transaction type']),
account: indexOfLike_(header, ['account','card','acct','last4'])
};

for (let r = 1; r < content.length; r++) {
const row = content[r];
if (!row || row.length === 0) continue;
const rawDate = (row[idx.date] || '').toString().trim();
const rawDesc = (row[idx.desc] || '').toString().trim();
const rawAmt = (row[idx.amount] || '').toString().replace(/[$,]/g,'');
const rawType = idx.type >=0 ? (row[idx.type] || '').toString().trim() : '';
const rawAcct = idx.account >=0 ? (row[idx.account] || '').toString().trim() : '';

const txDate = parseDateSafe_(rawDate, CFG.DATE_COL_FORMATS);
const amt = Number(rawAmt) || 0;

// Skip empty/zero lines
if (!txDate || !rawDesc || amt === 0) continue;

const category = categorize_(rawDesc, CFG.CATEGORY_RULES);

appendedRows.push([
txDate, rawDesc, amt, rawType, rawAcct, category, file.getName()
]);
}

// Move processed file to Archive
archive.addFile(file);
folder.removeFile(file);
}

if (appendedRows.length) {
txSheet.getRange(txSheet.getLastRow()+1,1,appendedRows.length,appendedRows[0].length).setValues(appendedRows);
txSheet.getRange(2,1,txSheet.getLastRow(),1).setNumberFormat('yyyy-MM-dd');
}

// Update category rollups and debt payments after import
updateSpendingRollup_(ss);
updateDebtPayments_(ss);

// Optional: toast message
SpreadsheetApp.getActiveSpreadsheet().toast(`Imported ${appendedRows.length} transactions.`, 'Weekly Import', 5);
}

/**
* Rebuilds spending rollups from Transactions → 01_Spending_Tracker
*/
function updateSpendingRollup_(ss) {
const tx = ss.getSheetByName(CFG.SHEET_TRANSACTIONS);
const sp = ss.getSheetByName(CFG.SHEET_SPENDING);
if (!tx || !sp) return;

const data = tx.getDataRange().getValues().slice(1);
const catSpent = {};
data.forEach(r => {
const cat = (r[5] || '').toString();
const amt = Number(r[2]) || 0;
// Treat negatives as expenses if bank exports credits as positives
const spend = amt < 0 ? Math.abs(amt) : (r[3] && /credit/i.test(r[3])) ? 0 : (amt > 0 ? amt : 0);
catSpent[cat] = (catSpent[cat] || 0) + spend;
});

const table = sp.getDataRange().getValues();
for (let i = 1; i < table.length; i++) {
const cat = table[i][0];
const limit = Number(table[i][1]) || 0;
const spent = Number(catSpent[cat] || 0);
const remaining = Math.max(0, limit - spent);
sp.getRange(i+1,3,1,2).setValues([[spent, remaining]]);
}
}

/**
* Detect debt payments from Transactions and reflect in 02_Debt_Tracker (simple: match by account keywords).
*/
function updateDebtPayments_(ss) {
const tx = ss.getSheetByName(CFG.SHEET_TRANSACTIONS);
const db = ss.getSheetByName(CFG.SHEET_DEBTS);
if (!tx || !db) return;

const txData = tx.getDataRange().getValues().slice(1);
const debts = db.getDataRange().getValues();

for (let i = 1; i < debts.length; i++) {
const acct = (debts[i][0] || '').toString();
let paidThisMonth = 0;

txData.forEach(r => {
const desc = (r[1] || '').toString();
const amt = Number(r[2]) || 0;
const isPayment = /payment|pymt|autopay|bill pay|capital one|affirm|best ?egg|mission lane/i.test(desc);
if (isPayment && new RegExp(acct.split(' ').join('\\s*'), 'i').test(desc)) {
// if exports show payments as negatives, take abs
paidThisMonth += Math.abs(amt);
}
});

if (paidThisMonth > 0) {
const balance = Number(debts[i][1]) || 0;
const newBal = Math.max(0, balance - paidThisMonth); // naive: ignore interest; you can extend later
db.getRange(i+1,2,1,1).setValue(newBal);
}
}
}

/** Utilities */
function getOrCreateSheet_(ss, name, header) {
let sh = ss.getSheetByName(name);
if (!sh) {
sh = ss.insertSheet(name);
sh.getRange(1,1,1,header.length).setValues([header]);
} else if (sh.getLastRow() === 0 && header && header.length) {
sh.getRange(1,1,1,header.length).setValues([header]);
}
return sh;
}

function getOrCreateSubfolder_(parent, name) {
const it = parent.getFoldersByName(name);
if (it.hasNext()) return it.next();
return parent.createFolder(name);
}

function indexOfLike_(arr, candidates) {
for (let i=0;i<arr.length;i++){
const h = arr[i];
for (const c of candidates) if (h.indexOf(c) !== -1) return i;
}
return -1;
}

function parseDateSafe_(raw, fmts) {
for (const f of fmts) {
const d = Utilities.formatDate(new Date(raw), Session.getScriptTimeZone(), 'yyyy-MM-dd');
if (!isNaN(new Date(d).getTime())) return new Date(d);
}
// fallback: try Date directly
const dd = new Date(raw);
return isNaN(dd.getTime()) ? null : dd;
}

function categorize_(desc, rules) {
for (const r of rules) if (r.match.test(desc)) return r.cat;
return 'Miscellaneous';
}

/**
* Time-driven trigger, Mondays 8:55 AM Chicago — import before your 9:00 AM Weekly Report prompt.
*/
function createWeeklyTrigger() {
ScriptApp.newTrigger('runWeeklyImport')
.timeBased()
.everyWeeks(1)
.onWeekDay(ScriptApp.WeekDay.MONDAY)
.atHour(8) // Apps Script runs in UTC on some accounts; adjust if needed
.create();
}
