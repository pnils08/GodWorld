//
/***** CONFIG *****/
const DEST_FOLDER_ID = '1ccRmgQCpliF901MkSBco1RQbjRjy4N9P'; // <= <<< PUT THE FOLDER ID HERE
const FILE_PREFIX = 'Simulation_Vault_Mirror_';

/***** MAIN *****/
function mirrorSimulationVault() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const folder = DriveApp.getFolderById(DEST_FOLDER_ID); // uses your exact folder
const now = new Date();
const stamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH-mm-ss");
const filename = FILE_PREFIX + stamp + '.txt';

// Build mirror text
let out = [];
out.push('# Simulation Vault Master Mirror');
out.push('Spreadsheet: ' + ss.getName());
out.push('File ID: ' + ss.getId());
out.push('Timestamp: ' + stamp);
out.push('');

// Include every sheet snapshot (excluding empty)
ss.getSheets().forEach(sh => {
const name = sh.getName();
const range = sh.getDataRange();
const values = range.getValues();
if (!values || values.length === 0) return;

// check if truly empty
const flat = values.flat().join('').toString().trim();
if (flat.length === 0) return;

out.push('=== SHEET: ' + name + ' ===');
out.push(renderTable(values));
out.push(''); // spacer
});

const blob = Utilities.newBlob(out.join('\n'), 'text/plain', filename);
folder.createFile(blob);
}

/***** HELPERS *****/
function renderTable(values) {
// Tab-separated lines for readability; escapes tabs/newlines in cells
return values.map(row => row.map(cell => sanitizeCell_(cell)).join('\t')).join('\n');
}

function sanitizeCell_(v) {
if (v === null || v === undefined) return '';
let s = (typeof v === 'object' && v instanceof Date)
? Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
: String(v);
// normalize internal newlines/tabs
s = s.replace(/\r?\n/g, ' \\n ').replace(/\t/g, ' ');
return s.trim();
}
//