/**
* buildUniversePDFMirror_v1.0
* Copies all PDF files in Vaults/Universe into Vaults/Universe_PDF_Mirror.
* Auto-resumes if it hits the Apps Script time limit.
*/

const UM_PDF_STATE_KEY = 'UM_PDF_CHUNK_STATE';
const PDF_TIME_BUDGET_SEC = 300;
const PDF_RESUME_DELAY_MIN = 1;

function buildUniversePDFMirror() {
const state = loadPDFState() || initPDFState();
const startMs = Date.now();
const destFolder = DriveApp.getFolderById(state.destFolderId);

while (state.queue.length && ((Date.now() - startMs) / 1000) < PDF_TIME_BUDGET_SEC) {
const folderId = state.queue.shift();
const folder = DriveApp.getFolderById(folderId);
crawlPDFOnce(folder, destFolder, state);
}

savePDFState(state);

if (state.queue.length) {
schedulePDFResume('buildUniversePDFMirror', PDF_RESUME_DELAY_MIN);
Logger.log(`⏳ Time limit reached — queued resume. Remaining: ${state.queue.length}`);
} else {
clearPDFState();
Logger.log(`✅ PDF mirror complete — ${state.copied} copied, ${state.skipped} skipped`);
}
}

function crawlPDFOnce(folder, destFolder, state) {
const files = folder.getFiles();
while (files.hasNext()) {
const file = files.next();
if (file.getName().toLowerCase().endsWith('.pdf')) {
try {
file.makeCopy(file.getName(), destFolder);
state.copied++;
} catch (err) {
state.skipped++;
}
}
}
const subs = folder.getFolders();
while (subs.hasNext()) state.queue.push(subs.next().getId());
}

function initPDFState() {
const root = DriveApp.getFoldersByName('Vaults').next();
const universe = root.getFoldersByName('Universe').next();
let dest;
const existing = root.getFoldersByName('Universe_PDF_Mirror');
dest = existing.hasNext() ? existing.next() : root.createFolder('Universe_PDF_Mirror');

const state = { destFolderId: dest.getId(), queue: [universe.getId()], copied: 0, skipped: 0 };
savePDFState(state);
return state;
}

function savePDFState(obj) {
PropertiesService.getScriptProperties().setProperty(UM_PDF_STATE_KEY, JSON.stringify(obj));
}
function loadPDFState() {
const raw = PropertiesService.getScriptProperties().getProperty(UM_PDF_STATE_KEY);
return raw ? JSON.parse(raw) : null;
}
function clearPDFState() {
PropertiesService.getScriptProperties().deleteProperty(UM_PDF_STATE_KEY);
ScriptApp.getProjectTriggers().forEach(t => {
if (t.getHandlerFunction() === 'buildUniversePDFMirror') ScriptApp.deleteTrigger(t);
});
}
function schedulePDFResume(handler, minutes) {
ScriptApp.getProjectTriggers().forEach(t => {
if (t.getHandlerFunction() === handler) ScriptApp.deleteTrigger(t);
});
ScriptApp.newTrigger(handler).timeBased().after(minutes * 60 * 1000).create();
}
