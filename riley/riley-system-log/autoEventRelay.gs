/**
* Phase 5 – Auto-Event Relay
* Detects new Federation_Sync rows and distributes summary payloads
* to partner ledgers (Media, Civic, Wild, etc.).
*/

function autoEventRelay() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const syncSheet = ss.getSheetByName('Federation_Sync');
if (!syncSheet) throw new Error('Federation_Sync sheet not found.');

const data = syncSheet.getDataRange().getValues();
const header = data[0];
const tsCol = header.indexOf('Timestamp');
const srcCol = header.indexOf('Source');
const sumCol = header.indexOf('Summary');
const statCol = header.indexOf('Status');

const newEvents = [];
for (let i = 1; i < data.length; i++) {
if (data[i][statCol] === '✅ Synced') {
newEvents.push({
time: data[i][tsCol],
source: data[i][srcCol],
summary: data[i][sumCol],
row: i + 1
});
}
}

if (newEvents.length === 0) {
Logger.log('No new Federation events to relay.');
return;
}

// Example relay targets (IDs of destination ledgers)
const targets = [
{ id: '1FQCCqRBUsqixaOmsqcZi-j7aev81656c3UfoQ_DQSVQ', name: 'Wild Media Newswire' },
{ id: '1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo', name: 'Civic_Ledger' }
];

const stamp = new Date();

for (const event of newEvents) {
for (const t of targets) {
const book = SpreadsheetApp.openById(t.id);
const sheet = book.getSheetByName('Federation_Inbox') || book.insertSheet('Federation_Inbox');
if (sheet.getLastRow() === 0) sheet.appendRow(['Timestamp', 'Source', 'Summary', 'Origin', 'Status']);
sheet.appendRow([stamp, 'Riley_System_Log', event.summary, event.source, '📡 Received']);
SpreadsheetApp.flush();
Logger.log(`Relayed ${event.source} summary to ${t.name}`);
}

// Mark row as relayed
syncSheet.getRange(event.row, statCol + 1).setValue('📤 Relayed');
}

Logger.log('✅ Phase 5 – Auto-Event Relay complete.');
}
