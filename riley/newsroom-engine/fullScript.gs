/***********************
* BAY TRIBUNE NODE
* Cleaned & Enhanced
***********************/

const IDS = {
RILEY_LOG: '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI', // Riley_System_Log
};
const Bay_FEED_SHEET = 'Feed';
const Bay_STATUS_HEADER = 'Status';
const Bay_STATUS_PROP = PropertiesService.getScriptProperties();
const NODE_NAME = 'Bay_Tribune';

/** === Heartbeat Back to Riley === */
function reportNodeStatus() {
const logFile = SpreadsheetApp.openById(IDS.RILEY_LOG);
const logSheet =
logFile.getSheetByName('Federation_Status_Log') ||
logFile.insertSheet('Federation_Status_Log');

logSheet.appendRow([
new Date(),
NODE_NAME,
'Active',
Session.getActiveUser().getEmail(),
]);
}

/** === Add Article to Feed Without Duplicates === */
function addToFeed(author, title, tags) {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const feed = ss.getSheetByName(Bay_FEED_SHEET);
if (!feed) throw new Error('Feed sheet not found.');

const data = feed.getDataRange().getValues();
const header = data[0];
const authorIndex = header.indexOf('Author');
const titleIndex = header.indexOf('Title');
const tagIndex = header.indexOf('Tags') >= 0 ? header.indexOf('Tags') : 4;

const newKey = (author + '|' + title).toLowerCase().trim();

const exists = data.some((row, i) => {
if (i === 0) return false;
const key = ((row[authorIndex] || '') + '|' + (row[titleIndex] || ''))
.toLowerCase()
.trim();
return key === newKey;
});

if (exists) return; // skip if already exists

feed.appendRow([new Date(), author, title, 'Pending', tags]);
}

/** === Sync Reader Queue and Log Heartbeat === */
function syncReaderQueue() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const feed = ss.getSheetByName(Bay_FEED_SHEET);
if (!feed) throw new Error('Feed sheet not found.');

const data = feed.getDataRange().getValues();
if (data.length < 2) return;

const header = data[0];
let statusIndex = header.indexOf(Bay_STATUS_HEADER);
if (statusIndex === -1) {
feed.insertColumnAfter(header.length);
statusIndex = header.length;
feed.getRange(1, statusIndex + 1).setValue(Bay_STATUS_HEADER);
}

const seen = new Set();
const rowsToKeep = [header];

for (let i = 1; i < data.length; i++) {
const author = (data[i][1] || '').trim().toLowerCase();
const title = (data[i][2] || '').trim().toLowerCase();
const key = `${author}|${title}`;

if (!title || seen.has(key)) continue;
seen.add(key);

const existingStatus = Bay_STATUS_PROP.getProperty(title) || 'Pending';
Bay_STATUS_PROP.setProperty(title, existingStatus);

if (data[i][statusIndex] !== existingStatus)
data[i][statusIndex] = existingStatus;

rowsToKeep.push(data[i]);
}

feed.clearContents();
feed
.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length)
.setValues(rowsToKeep);
feed.autoResizeColumns(1, rowsToKeep[0].length);

// === Log Heartbeat Back to Riley ===
try {
const logFile = SpreadsheetApp.openById(IDS.RILEY_LOG);
const logSheet =
logFile.getSheetByName('Federation_Status_Log') ||
logFile.insertSheet('Federation_Status_Log');
const now = new Date();
const uniqueCount = rowsToKeep.length - 1;
logSheet.appendRow([
now,
NODE_NAME,
`Feed Sync – ${uniqueCount} unique articles`,
Session.getActiveUser().getEmail(),
]);
} catch (err) {
Logger.log('Heartbeat log failed: ' + err);
}
}

/** === Mark Article as Read === */
function markAsRead(title) {
Bay_STATUS_PROP.setProperty(title, 'Read');
syncReaderQueue();
}

/** === Setup Daily Trigger === */
function setupAutoSync() {
ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
ScriptApp.newTrigger('syncReaderQueue')
.timeBased()
.everyDays(1)
.atHour(9)
.create();
reportNodeStatus();
syncReaderQueue();
}
