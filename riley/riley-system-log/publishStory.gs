/**
* publishStory v1.1
* Collects new published stories from Bay Tribune and Slayer Syndicate,
* logs them in the System Log, mirrors them to Civic Ledger,
* and timestamps the LoggedAt column.
*/
function publishStory() {
const LOG_SHEET_ID = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI';
const CIVIC_SHEET_ID = '1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo';
const TRIBUNE_SHEET_ID = '1MVCJLpU1qs9IAJN6vyzMrzHkvRNl33pYwup_CDd-nGA';
const SYNDICATE_SHEET_ID = '1GuAoDvoEVfaGRB17RdnQYAFY7id47yB5rHOh3dj_DKA';

const log = SpreadsheetApp.openById(LOG_SHEET_ID).getActiveSheet();
const civic = SpreadsheetApp.openById(CIVIC_SHEET_ID)
.getSheetByName('Transparency_Log') ||
SpreadsheetApp.openById(CIVIC_SHEET_ID).insertSheet('Transparency_Log');

const sources = [
{ name: 'Bay Tribune', id: TRIBUNE_SHEET_ID },
{ name: 'Slayer Syndicate', id: SYNDICATE_SHEET_ID }
];

const timestamp = new Date();

sources.forEach(src => {
const sheet = SpreadsheetApp.openById(src.id).getSheetByName('Feed');
if (!sheet) {
Logger.log(`❌ No Feed tab found in ${src.name}`);
return;
}

const data = sheet.getDataRange().getValues();
for (let i = 1; i < data.length; i++) {
const [date, author, title, status, tags, sourceFile, loggedFlag, loggedAt] = data[i];
if (status && status.toString().toLowerCase() === 'published' && !loggedFlag) {
const checksum = Utilities.getUuid(); // unique key
const message = `${src.name} | ${author} published: "${title}"`;

// Write to System Log
log.appendRow([timestamp.toISOString(), 'Story Published', message]);

// Mirror to Civic Ledger Transparency Log
civic.appendRow([
timestamp,
author,
title,
src.name,
checksum,
sourceFile || '',
'Published'
]);

// Mark as logged and add timestamp
sheet.getRange(i + 1, 7).setValue('Logged'); // Column G
sheet.getRange(i + 1, 8).setValue(new Date()); // Column H
}
}
});

Logger.log('publishStory complete.');
}
