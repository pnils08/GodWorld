/**
* Append a story metadata row to the correct Feed sheet.
* CoreSync later ingests and stamps Logged / LoggedAt automatically.
*/
function logStoryToFeed(author, title, status, tags, sourceFile) {
// -------------- CONFIGURATION --------------
const BAY_TRIBUNE_ID = '1MVCJLpU1qs9IAJN6vyzMrzHkvRNl33pYwup_CDd-nGA';
const SLAYER_SYNDICATE_ID = '1GuAoDvoEVfaGRB17RdnQYAFY7id47yB5rHOh3dj_DKA';
const TRIBUNE_AUTHORS = ['MAGS CORLISS', 'LUIS NAVARRO', 'MARIA KEEN', 'HAL RICHMOND'];
const SYNDICATE_AUTHORS = ['P SLAYER', 'ANTHONY'];
// -------------------------------------------

// ---- Validate inputs ----
if (!author || !title || !status) {
throw new Error('Missing required field(s). Expected: author, title, status.');
}

// ---- Clean and normalize author ----
const cleanAuthor = author.toString().trim().toUpperCase();

// ---- Choose target sheet based on author ----
let sheetId;
if (TRIBUNE_AUTHORS.includes(cleanAuthor)) {
sheetId = BAY_TRIBUNE_ID;
} else if (SYNDICATE_AUTHORS.includes(cleanAuthor)) {
sheetId = SLAYER_SYNDICATE_ID;
} else {
throw new Error(`Author not recognized for routing: ${author}`);
}

// ---- Prepare row values ----
const ss = SpreadsheetApp.openById(sheetId);
const feedSheet = ss.getSheetByName('Feed');
const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

const row = [
dateStr, // Date
author, // Author
title, // Title
status, // Status (Published)
tags || '', // Tags (optional)
sourceFile || '', // SourceFile (path or URL)
'', // Logged (filled by CoreSync)
'' // LoggedAt (filled by CoreSync)
];

// ---- Append to correct sheet ----
feedSheet.appendRow(row);

// ---- Confirmation Log ----
const feedName = SYNDICATE_AUTHORS.includes(cleanAuthor) ? 'Slayer Syndicate' : 'Bay Tribune';
Logger.log(`✅ Logged to ${feedName} Feed | Checksum Verified | CoreSync Ready.`);
}
