/**
* Full OCR ingestion: tag image, link to PopID/PlayerID, extract stats, archive.
*/
function autoTagAndParseFullStats() {
const FOLDER_ID = '1ScutKnsAp_4B1PW6dWowIKZrQyVDmuqQ'; // Ingestion folder
const POPULATION_LEDGER_ID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo';
const FRANCHISE_STATS_MASTER_ID = '1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss';
const RILEY_LOG_ID = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI';

const folder = DriveApp.getFolderById(FOLDER_ID);
const popSheet = SpreadsheetApp.openById(POPULATION_LEDGER_ID).getSheetByName('Population');
const statsSheet = SpreadsheetApp.openById(FRANCHISE_STATS_MASTER_ID).getSheetByName('Player_Card_Master');
const auditSheet = SpreadsheetApp.openById(FRANCHISE_STATS_MASTER_ID).getSheetByName('Player_Audit_Log');
const logSheet = SpreadsheetApp.openById(RILEY_LOG_ID).getSheetByName('Ingest_Log');

const files = folder.getFiles();
const ts = new Date();

while (files.hasNext()) {
const file = files.next();
if (!file.getMimeType().includes('image')) continue;

try {
const resource = { title: 'OCR_' + file.getName(), mimeType: MimeType.GOOGLE_DOCS };
const ocrCopy = Drive.Files.copy(resource, file.getId(), { ocr: true, ocrLanguage: 'en' });
const text = DocumentApp.openById(ocrCopy.id).getBody().getText();
const nameFromFile = file.getName().toLowerCase();

// --- Find player name ---
const knownNames = ['benji dillon', 'mark aitken', 'isley kelley', 'vinnie keane', 'darrin davis'];
let entity = knownNames.find(n => nameFromFile.includes(n) || text.toLowerCase().includes(n)) || 'unknown';
let category = 'Player';

// --- ID assignment ---
const popID = 'POP-' + Utilities.getUuid().slice(0, 8);
const playerID = 'PLY-' + Utilities.getUuid().slice(0, 8);

// --- Parse all numeric stats ---
const yearRows = text.match(/\b20\d{2}.*?(?:\n|$)/g) || [];
yearRows.forEach(row => {
const cols = row.trim().split(/\s+/);
const year = cols[0];
const team = cols[1];
const g = Number(cols[2]) || '';
const gs = Number(cols[3]) || '';
const w = Number(cols[4]) || '';
const l = Number(cols[5]) || '';
const sv = Number(cols[6]) || '';
const era = findValue(/(?:ERA|E\.R\.A\.|era)\s*[:=]?\s*([\d.]+)/i, text);
const ip = findValue(/(?:IP|Innings)\s*[:=]?\s*([\d.]+)/i, text);
const avg = findValue(/(?:AVG|Average)\s*[:=]?\s*([\d.]+)/i, text);
const hr = findValue(/(?:HR|Home\s*Runs)\s*[:=]?\s*([\d]+)/i, text);
const rbi = findValue(/(?:RBI|Runs\s*Batted\s*In)\s*[:=]?\s*([\d]+)/i, text);

if (/20\d{2}/.test(year)) {
statsSheet.appendRow([ts, playerID, entity, year, team, g, gs, w, l, sv, era, ip, avg, hr, rbi]);
}
});

// --- Accolades ---
const awards = text.match(/(All[- ]Star|MVP|Silver Slugger|Gold Glove|ROY|Playoff MVP)/gi) || [];
if (awards.length) {
auditSheet.appendRow([ts, playerID, entity, awards.join(', ')]);
}

// --- File rename and archive ---
const newName = `${popID}_${entity}_Player.jpg`;
file.setName(newName);
const archiveRoot = ensureSubfolder(folder, 'Processed_Archive');
const entFolder = ensureSubfolder(archiveRoot, entity.replace(/\s+/g, '_'));
file.moveTo(entFolder);

// --- Record & log ---
popSheet.appendRow([ts, popID, entity, category, playerID, file.getName(), 'Full parse complete']);
// --- Visual registration
const likenessCode = logVisualAsset_(file, entity, popID, playerID, text);

logSheet.appendRow([ts, file.getName(), '✅ Parsed', popID, playerID, entity, category]);

} catch (err) {
logSheet.appendRow([ts, file.getName(), '❌ Error', err.message]);
}
}
}

/**
* Utility to extract first regex group match value.
*/
function findValue(regex, text) {
const match = text.match(regex);
return match ? match[1] : '';
}

/**
* Ensure subfolder exists.
*/
function ensureSubfolder(parent, name) {
const it = parent.getFoldersByName(name);
return it.hasNext() ? it.next() : parent.createFolder(name);
}
/**
* Log every visual that enters the universe.
* Called at the end of each file’s OCR cycle.
*/
function logVisualAsset_(file, entity, popID, playerID, text) {
const RILEY_LOG_ID = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI';
const logBook = SpreadsheetApp.openById(RILEY_LOG_ID);
const visualSheet = logBook.getSheetByName('Visual_Log') ||
logBook.insertSheet('Visual_Log');

const likenessCode = 'LK-' + Utilities.getUuid().slice(0, 8);
const summary = text.substring(0, 180).replace(/\n/g, ' ');

visualSheet.appendRow([
new Date(), // Timestamp
popID, // Population ID
playerID, // Player ID
entity, // Entity Name
likenessCode, // Unique visual key
file.getName(), // File name in Drive
'Player', // Category
file.getParents().next().getName(), // Source folder
summary // OCR summary
]);

return likenessCode;
}
