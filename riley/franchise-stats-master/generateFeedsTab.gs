function generateFeedsTab() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheetName = 'Feeds';
let sheet = ss.getSheetByName(sheetName);
if (!sheet) sheet = ss.insertSheet(sheetName);
sheet.clear();

const baseUrl = 'https://script.google.com/macros/s/AKfycbwBDnuSX1hqrYng9ICUlDmdnkfjFcA5n8scfOl8CVuZwwW1NCkcFO2REQboNY931qAIUA/exec'; // replace with your web app link
const feeds = [
{ name: 'Roster_DB', format: 'json', notes: 'Used by Figma / Lucid' },
{ name: 'Transactions_DB', format: 'csv', notes: 'For Canva charts' },
{ name: 'Pitching_Summary', format: 'json', notes: 'Pitcher stats' },
{ name: 'Coaches_DB', format: 'csv', notes: 'Staff records' }
];

sheet.appendRow(['Feed Name', 'Feed URL', 'Format', 'Notes']);

feeds.forEach(f => {
const url = `${baseUrl}?sheet=${f.name}&format=${f.format}`;
sheet.appendRow([f.name, url, f.format.toUpperCase(), f.notes]);
});

sheet.autoResizeColumns(1, 4);
return 'Feeds tab generated successfully.';
}
function scheduleFeedsRefresh() {
// Clear any previous triggers
ScriptApp.getProjectTriggers().forEach(t => {
if (['generateFeedsTab', 'emailFeedsReport'].includes(t.getHandlerFunction())) {
ScriptApp.deleteTrigger(t);
}
});

// Trigger weekly Feeds rebuild
ScriptApp.newTrigger('generateFeedsTab')
.timeBased()
.onWeekDay(ScriptApp.WeekDay.MONDAY)
.atHour(8)
.create();

// Trigger follow-up email 5 minutes later
ScriptApp.newTrigger('emailFeedsReport')
.timeBased()
.everyWeeks(1)
.onWeekDay(ScriptApp.WeekDay.MONDAY)
.atHour(8)
.nearMinute(5)
.create();

Logger.log('Weekly feeds refresh + email confirmation triggers installed.');
}
function emailFeedsReport() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName('Feeds');
const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();

// Build email content
let body = '✅ Franchise Feeds refreshed successfully.\n\n';
body += 'Here are the current feeds:\n\n';
data.forEach(row => {
body += `• ${row[0]} → ${row[1]} (${row[2]})\n Notes: ${row[3]}\n\n`;
});
body += '— Franchise Stats Master Automation';

// Send to Riley (you can CC yourself or others)
MailApp.sendEmail({
to: 'riley,steward.system@gmail.com', // change to Riley’s actual email
subject: 'Franchise Feeds Auto-Refresh Confirmation',
body: body
});
}
