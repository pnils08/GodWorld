/**
* Auto-OCR, tag, rename, and archive new photos in the Ingestion folder.
* Requires Drive API service to be enabled in Services (Resources → Advanced Google Services → Drive API).
*/

function autoTagAndArchive() {
const FOLDER_ID = '1ScutKnsAp_4B1PW6dWowIKZrQyVDmuqQ'; // ingestion folder
const POPULATION_LEDGER_ID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo';
const RILEY_LOG_ID = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI';

const folder = DriveApp.getFolderById(FOLDER_ID);
const popSheet = SpreadsheetApp.openById(POPULATION_LEDGER_ID).getSheetByName('Population');
const logSheet = SpreadsheetApp.openById(RILEY_LOG_ID).getSheetByName('Ingest_Log');

const files = folder.getFiles();
const ts = new Date();

while (files.hasNext()) {
const file = files.next();
const mime = file.getMimeType();

// Skip non-image/PDF files
if (!(mime.includes('image') || mime.includes('pdf'))) continue;

try {
// --- OCR conversion
const resource = { title: 'OCR_' + file.getName(), mimeType: MimeType.GOOGLE_DOCS };
const ocrCopy = Drive.Files.copy(resource, file.getId(), { ocr: true, ocrLanguage: 'en' });
const text = DocumentApp.openById(ocrCopy.id).getBody().getText();

// --- Entity detection
const nameFromFile = file.getName().replace(/\.[^/.]+$/, '').toLowerCase();
const knownNames = ['mark aitken', 'benji dillon', 'isley kelley', 'vinn ie keane']; // extend from roster sheet
let entity = knownNames.find(n => nameFromFile.includes(n) || text.toLowerCase().includes(n)) || 'unknown';

let category = 'General';
if (/pitcher|sp|era|innings/i.test(text)) category = 'Player';
else if (/city|council|mayor/i.test(text)) category = 'Civic';
else if (/article|press|media/i.test(text)) category = 'Media';

// --- ID assignment
const popID = 'POP-' + Utilities.getUuid().slice(0, 8);
const playerID = category === 'Player' ? 'PLY-' + Utilities.getUuid().slice(0, 8) : '';

// --- Record entry + stat parsing
popSheet.appendRow([ts, popID, entity, category, playerID, file.getName(), text.substring(0, 200)]);
logSheet.appendRow([ts, file.getName(), '✅ processed', popID, playerID, category, entity]);

if (category === 'Player') {
parseAndPushStats_(text, playerID);
}


// --- File renaming and archival
const newName = `${popID}_${entity}_${category}.jpg`;
file.setName(newName);

const archiveRoot = ensureSubfolder(folder, 'Processed_Archive');
const catFolder = ensureSubfolder(archiveRoot, category);
const entFolder = ensureSubfolder(catFolder, entity.replace(/\s+/g, '_'));
file.moveTo(entFolder);

} catch (err) {
logSheet.appendRow([ts, file.getName(), '❌ error', err.message]);
}
}
}

/**
* Utility: ensure nested folder path exists.
*/
function ensureSubfolder(parent, name) {
const iter = parent.getFoldersByName(name);
return iter.hasNext() ? iter.next() : parent.createFolder(name);
}
/**
* Parse numbers and stat tables out of OCR text and push them to Franchise Stats Master.
*/
function parseAndPushStats_(text, playerID) {
const STATS_SHEET_ID = '1abc123xyzFranchiseStatsMaster'; // replace with your real sheet id
const statsSheet = SpreadsheetApp.openById(STATS_SHEET_ID).getSheetByName('Player_Card_Master');

// Simple pattern matchers
const yearRows = text.match(/\b20\d{2}.*?(?:\n|$)/g) || [];

yearRows.forEach(row => {
const cols = row.trim().split(/\s+/);
// expected layout: YEAR TEAM G GS W L ...
const year = cols[0];
const team = cols[1];
const g = Number(cols[2]) || '';
const gs = Number(cols[3]) || '';
const w = Number(cols[4]) || '';
const l = Number(cols[5]) || '';

if (/20\d{2}/.test(year) && team) {
statsSheet.appendRow([new Date(), playerID, year, team, g, gs, w, l]);
}
});

// Accolades and attributes
const awards = text.match(/(All[- ]Star|MVP|Silver Slugger|Gold Glove|ROY)/gi) || [];
if (awards.length) {
const awardSheet = SpreadsheetApp.openById(STATS_SHEET_ID).getSheetByName('Player_Audit_Log');
awardSheet.appendRow([new Date(), playerID, awards.join(', ')]);
}
}
