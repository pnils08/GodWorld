/** === CONFIG === **/
const FEED_SHEET = 'Feed';
const STATUS_HEADER = 'Status';
const STATUS_PROP = PropertiesService.getScriptProperties();

/** === ARTICLE PREVIEW ===
* Reads a Universe_Mirror_Text file and returns a single article body.
*/
function echoRead(articleTitle) {
const files = DriveApp.searchFiles(
"title contains 'Universe_Mirror_Text' and mimeType='text/plain'"
);
if (!files.hasNext()) return 'No Universe Mirror Text found.';
const file = files.next();
const text = file.getBlob().getDataAsString();
const pattern = new RegExp(articleTitle + "([\\s\\S]*?)(?=\\n[A-Z][a-z]+\\s—|$)", "i");
const match = text.match(pattern);
return match ? match[1].trim() : 'Article preview not found.';
}

/** === SYNC READER QUEUE ===
* Ensures Feed sheet has a Status column and aligns with stored properties.
* Adds new articles as Pending, skips existing ones.
*/
function syncReaderQueue() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const feed = ss.getSheetByName(FEED_SHEET);
if (!feed) throw new Error('Feed sheet not found.');
const data = feed.getDataRange().getValues();
if (data.length < 2) return;

const header = data[0];
let statusIndex = header.indexOf(STATUS_HEADER);
if (statusIndex === -1) {
feed.insertColumnAfter(header.length);
statusIndex = header.length;
feed.getRange(1, statusIndex + 1).setValue(STATUS_HEADER);
}

// collect seen titles to prevent duplicates
const seen = new Set();
for (let i = 1; i < data.length; i++) {
const title = (data[i][2] || '').trim();
if (!title || seen.has(title)) continue;
seen.add(title);

const existingProp = STATUS_PROP.getProperty(title);
const currentStatus = data[i][statusIndex] || '';
if (!existingProp) {
STATUS_PROP.setProperty(title, 'Pending');
feed.getRange(i + 1, statusIndex + 1).setValue('Pending');
} else if (currentStatus !== existingProp) {
feed.getRange(i + 1, statusIndex + 1).setValue(existingProp);
}
}
feed.autoResizeColumns(1, header.length + 1);
}

/** === MARK AS READ === **/
function markAsRead(title) {
const cleanTitle = (title || '').trim();
if (!cleanTitle) return;
STATUS_PROP.setProperty(cleanTitle, 'Read');
syncReaderQueue();
}

/** === CLEAN DUPLICATES ===
* Optional cleanup helper — removes duplicated title rows.
*/
function removeDuplicates() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const feed = ss.getSheetByName(FEED_SHEET);
const data = feed.getDataRange().getValues();
const seen = new Set();
const unique = [];
unique.push(data[0]);
for (let i = 1; i < data.length; i++) {
const title = (data[i][2] || '').trim();
if (title && !seen.has(title)) {
unique.push(data[i]);
seen.add(title);
}
}
feed.clearContents();
feed.getRange(1, 1, unique.length, unique[0].length).setValues(unique);
}

/** === SHEET MENU ===
* Adds menu for quick access to Reader Tools.
*/
function onOpen() {
SpreadsheetApp.getUi()
.createMenu('📖 Reader Tools')
.addItem('Sync Feed', 'syncReaderQueue')
.addItem('Mark Selected as Read', 'markSelectedAsRead')
.addItem('Remove Duplicates', 'removeDuplicates')
.addSeparator()
.addItem('Preview Selected Article', 'previewSelectedArticle')
.addToUi();
}

/** === HELPER FUNCTIONS === **/
function markSelectedAsRead() {
const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEED_SHEET);
const range = sheet.getActiveRange();
if (!range) return;
const title = sheet.getRange(range.getRow(), 3).getValue();
markAsRead(title);
SpreadsheetApp.getUi().alert(`Marked "${title}" as Read.`);
}

function previewSelectedArticle() {
const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEED_SHEET);
const range = sheet.getActiveRange();
if (!range) return;
const title = sheet.getRange(range.getRow(), 3).getValue();
const preview = echoRead(title);
SpreadsheetApp.getUi().showModalDialog(
HtmlService.createHtmlOutput(`<pre style="white-space:pre-wrap;">${preview}</pre>`).setWidth(600).setHeight(400),
`Preview — ${title}`
);
}
/** === AUTOMATION SETUP ===
* Creates a daily 9 AM sync of the Feed queue.
*/
function setupAutoSync() {
// clear any old duplicates
ScriptApp.getProjectTriggers()
.filter(t => t.getHandlerFunction() === 'syncReaderQueue')
.forEach(t => ScriptApp.deleteTrigger(t));

// run once per day, 9 AM local time
ScriptApp.newTrigger('syncReaderQueue')
.timeBased()
.everyDays(1)
.atHour(9)
.create();

// do an immediate sync on setup
syncReaderQueue();
}
