/** ID Issuer v1.0 — uses your literal vaults and names **/

// --- VAULT FOLDERS (exact from your list) ---
const VAULT_FOLDERS = {
POP: '1aHzsI11BkLyv-KpQf6NGwmWucfYcwVNZ', // Population
UNI: '1XD1UT_0238Xd0A7gtstKFYXzFwV1QiWP', // Universe
CIV: '1VfsPU4S_pmLNxJvdAfk9uSmpATXm1Agj', // Civic
MED: '1NkxETnYb_JiH-tE9So96a8PWyqbTLr-H', // Bay Tribune (Media)
WRK: '1fjEOgkeoSQKcdjRi5N1J0LLVqgheB4Ln' // Wild Media Newswire
};

// --- COUNTER FILE NAMES (saved in each vault folder) ---
const COUNTER_FILE = {
POP: 'POP_Counter.json',
UNI: 'UNI_Counter.json',
CIV: 'CIV_Counter.json',
MED: 'MED_Counter.json',
WRK: 'WRK_Counter.json'
};

// get or create the counter file in the correct vault folder
function getCounterFile_(prefix) {
const folder = DriveApp.getFolderById(VAULT_FOLDERS[prefix]);
const it = folder.getFilesByName(COUNTER_FILE[prefix]);
if (it.hasNext()) return it.next();
return folder.createFile(COUNTER_FILE[prefix], JSON.stringify({ last: 0 }));
}

// one-time initializer: scan existing names like POP-00037 and set counter=37
function initializeCounter(prefix) {
const folder = DriveApp.getFolderById(VAULT_FOLDERS[prefix]);
const re = new RegExp('^' + prefix + '-(\\d{5})$');
let max = 0;

// scan file names
const files = folder.getFiles();
while (files.hasNext()) {
const m = files.next().getName().match(re);
if (m) max = Math.max(max, parseInt(m[1], 10));
}
// scan subfolders too (optional but safe)
const subs = folder.getFolders();
while (subs.hasNext()) {
const sf = subs.next().getFiles();
while (sf.hasNext()) {
const m = sf.next().getName().match(re);
if (m) max = Math.max(max, parseInt(m[1], 10));
}
}

const cf = getCounterFile_(prefix);
cf.setContent(JSON.stringify({ last: max }));
Logger.log(prefix + ' counter initialized to ' + max);
}

// issue the next ID like POP-00026 / UNI-00037 / CIV-00005 / MED-00010
function issueNewID(prefix) {
const cf = getCounterFile_(prefix);
const data = JSON.parse(cf.getBlob().getDataAsString() || '{}');
const next = (data.last || 0) + 1;
data.last = next;
cf.setContent(JSON.stringify(data));
const id = prefix + '-' + String(next).padStart(5, '0');
Logger.log('Issued ' + id);
return id;
}

/*** Quick helpers you can run ***/

// run once per vault to seed from existing files (safe to re-run)
function init_POP() { initializeCounter('POP'); }
function init_UNI() { initializeCounter('UNI'); }
function init_CIV() { initializeCounter('CIV'); }
function init_MED() { initializeCounter('MED'); }
function init_WRK() { initializeCounter('WRK'); }

// examples: get the next IDs
function next_POP() { return issueNewID('POP'); }
function next_UNI() { return issueNewID('UNI'); }
function next_CIV() { return issueNewID('CIV'); }
function next_MED() { return issueNewID('MED'); }
function next_WRK() { return issueNewID('WRK'); }