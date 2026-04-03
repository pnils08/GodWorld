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

const seen = new Set();
const rowsToKeep = [header];

for (let i = 1; i < data.length; i++) {
const author = (data[i][1] || '').trim().toLowerCase();
const title = (data[i][2] || '').trim().toLowerCase();
const key = `${author}|${title}`;

// skip empty or duplicate rows
if (!title || seen.has(key)) continue;
seen.add(key);

const existingStatus = STATUS_PROP.getProperty(title) || 'Pending';
STATUS_PROP.setProperty(title, existingStatus);

// update in-sheet status if different
if (data[i][statusIndex] !== existingStatus) {
data[i][statusIndex] = existingStatus;
}

rowsToKeep.push(data[i]);
}

// Clear & rewrite feed without duplicates
feed.clearContents();
feed.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);
feed.autoResizeColumns(1, rowsToKeep[0].length);
}
