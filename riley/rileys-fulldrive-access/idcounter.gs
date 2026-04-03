function getCounterFile_(prefix) {
const folder = DriveApp.getFolderById(VAULT_FOLDERS[prefix]);
const it = folder.getFilesByName(COUNTER_FILE[prefix]);
if (it.hasNext()) return it.next();
return folder.createFile(COUNTER_FILE[prefix], JSON.stringify({ last: 0 }));
}

function initializeCounter(prefix) {
const folder = DriveApp.getFolderById(VAULT_FOLDERS[prefix]);
const re = new RegExp('^' + prefix + '-(\\d{5})$');
let max = 0;
const files = folder.getFiles();
while (files.hasNext()) {
const m = files.next().getName().match(re);
if (m) max = Math.max(max, parseInt(m[1], 10));
}
const cf = getCounterFile_(prefix);
cf.setContent(JSON.stringify({ last: max }));
Logger.log(prefix + ' counter initialized to ' + max);
}

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
// safe one-click helpers
function next_POP() { return issueNewID('POP'); }
function next_UNI() { return issueNewID('UNI'); }
function next_CIV() { return issueNewID('CIV'); }
function next_MED() { return issueNewID('MED'); }
