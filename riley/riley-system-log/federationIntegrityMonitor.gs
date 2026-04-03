/**
* PHASE 7 – FEDERATION INTEGRITY MONITOR
* Validates that every linked ledger has synced within the last 24 hours.
* Writes a heartbeat report to Riley_System_Log → Federation_Status.
*/

function federationIntegrityMonitor() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const statusSheet =
ss.getSheetByName('Federation_Status') || ss.insertSheet('Federation_Status');

// ID + friendly names for all nodes Riley should hear from
const ledgers = [
{ id: '1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss', name: 'Franchise_Stats_Master' },
{ id: '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo', name: 'Population_Ledger' },
{ id: '1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo', name: 'Civic_Ledger' },
{ id: '1FQCCqRBUsqixaOmsqcZi-j7aev81656c3UfoQ_DQSVQ', name: 'Wild_Media_News' },
{ id: '1GuAoDvoEVfaGRB17RdnQYAFY7id47yB5rHOh3dj_DKA', name: 'Slayer_Syndicate' }
];

const now = new Date();
const cutoff = now.getTime() - 24 * 60 * 60 * 1000; // 24 hours
const results = [];

ledgers.forEach(l => {
try {
const book = SpreadsheetApp.openById(l.id);
const sheet = book.getSheets()[0]; // use first sheet as heartbeat source
const lastEdit = sheet.getLastUpdated(); // requires manual update trigger or edit log
const lastTime = lastEdit ? new Date(lastEdit).getTime() : 0;
const healthy = lastTime >= cutoff;
results.push([new Date(), l.name, healthy ? '🟢 Healthy' : '🔴 Stale', lastEdit || ' N/A ']);
} catch (err) {
results.push([new Date(), l.name, '⚠️ Error', err.message]);
}
});

// Write results
statusSheet.clear();
statusSheet
.getRange(1, 1, 1, 4)
.setValues([['Timestamp', 'Ledger', 'Status', 'Last Update']])
.setFontWeight('bold')
.setBackground('#e8e8e8')
.setHorizontalAlignment('center');
statusSheet.getRange(2, 1, results.length, results[0].length).setValues(results);

Logger.log('✅ Federation Integrity Monitor run complete.');
}
/**
* PHASE 7B – Email alerts for stale/error ledgers
* Runs after federationIntegrityMonitor() and emails a summary if issues exist.
*/

function sendFederationAlerts() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const STATUS_SHEET = ss.getSheetByName('Federation_Status');
if (!STATUS_SHEET || STATUS_SHEET.getLastRow() < 2) {
Logger.log('No Federation_Status data to alert on.');
return;
}

// === Configure recipients ===
// Put your email(s) here; comma-separate if multiple
const RECIPIENTS = [
Session.getActiveUser().getEmail() // auto: the account running Riley
// 'you@example.com', 'editor@baytribune.com'
].join(',');

const rows = STATUS_SHEET.getRange(2, 1, STATUS_SHEET.getLastRow() - 1, 4).getValues();
const problems = rows.filter(r => r[2] === '🔴 Stale' || r[2] === '⚠️ Error');

if (problems.length === 0) {
Logger.log('All ledgers healthy; no alert needed.');
return;
}

// Build email
const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
const subject = `Federation Alert (${ts}) – ${problems.length} ledger(s) need attention`;
const lines = problems.map(r => {
const when = r[3] && r[3].toString().trim() !== '' ? r[3] : 'N/A';
return `• ${r[1]} — ${r[2]} — Last Update: ${when}`;
}).join('\n');

const body =
`Riley – Federation Integrity Alert

The following ledgers are stale or errored:

${lines}

Source: Riley_System_Log → Federation_Status
Time: ${ts}

— Automated notice`;

MailApp.sendEmail({
to: RECIPIENTS,
subject,
body
});

Logger.log(`📧 Alert sent to: ${RECIPIENTS}`);
}
function runIntegrityAndAlert() {
federationIntegrityMonitor();
sendFederationAlerts();
}
/**
* PHASE 7B – Email alerts for stale/error ledgers
* Runs after federationIntegrityMonitor() and emails a summary if issues exist.
*/

function sendFederationAlerts() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const STATUS_SHEET = ss.getSheetByName('Federation_Status');
if (!STATUS_SHEET || STATUS_SHEET.getLastRow() < 2) {
Logger.log('No Federation_Status data to alert on.');
return;
}

// === Configure recipients ===
// pnils08@gmail.com,riley.steward.system@gmail.com
const RECIPIENTS = [
Session.getActiveUser().getEmail() // auto: the account running Riley
// 'you@example.com', 'editor@baytribune.com'
].join(',');

const rows = STATUS_SHEET.getRange(2, 1, STATUS_SHEET.getLastRow() - 1, 4).getValues();
const problems = rows.filter(r => r[2] === '🔴 Stale' || r[2] === '⚠️ Error');

if (problems.length === 0) {
Logger.log('All ledgers healthy; no alert needed.');
return;
}

// Build email
const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
const subject = `Federation Alert (${ts}) – ${problems.length} ledger(s) need attention`;
const lines = problems.map(r => {
const when = r[3] && r[3].toString().trim() !== '' ? r[3] : 'N/A';
return `• ${r[1]} — ${r[2]} — Last Update: ${when}`;
}).join('\n');

const body =
`Riley – Federation Integrity Alert

The following ledgers are stale or errored:

${lines}

Source: Riley_System_Log → Federation_Status
Time: ${ts}

— Automated notice`;

MailApp.sendEmail({
to: RECIPIENTS,
subject,
body
});

Logger.log(`📧 Alert sent to: ${RECIPIENTS}`);
}
function runIntegrityAndAlert() {
federationIntegrityMonitor();
sendFederationAlerts();
}


