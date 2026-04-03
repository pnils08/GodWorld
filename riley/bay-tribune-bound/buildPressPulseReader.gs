function buildPressPulseReader() {
const drive = DriveApp;
const reader = SpreadsheetApp.getActiveSpreadsheet();
const sheet = reader.getSheetByName('Feed') || reader.insertSheet('Feed');
sheet.clear().appendRow(['Date','Author','Title','Tags','SourceFile']);

// locate the latest Universe Mirror Text
const files = drive.searchFiles("title contains 'Universe_Mirror_Text' and mimeType='text/plain'");
if (!files.hasNext()) {
sheet.appendRow(['', '', 'No Universe Mirror Text found']);
return;
}

const file = files.next();
const content = file.getBlob().getDataAsString();
const regex = /Anthony.*?“(.*?)”|P Slayer.*?“(.*?)”|Hal Richmond.*?“(.*?)”/g;
let match;
while ((match = regex.exec(content)) !== null) {
const title = match[1] || match[2] || match[3];
const author =
match[1] ? 'Anthony' :
match[2] ? 'P Slayer' :
match[3] ? 'Hal Richmond' : '';
sheet.appendRow([new Date(), author, title, '#PressPulse', file.getName()]);
}
sheet.autoResizeColumns(1,5);
}
function setupPressPulseReader() {
ScriptApp.newTrigger('buildPressPulseReader')
.timeBased()
.everyDays(1)
.atHour(7)
.create();
buildPressPulseReader();
}