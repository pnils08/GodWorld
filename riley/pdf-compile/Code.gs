/**
* buildUniversePDFExtract_v1.1 (auto-resume)
* Extracts text from PDFs under Vaults/Universe and appends it
* to Vaults/Universe_Mirror_PDFText.txt
*/

const PDF_STATE_KEY = 'PDF_EXTRACT_STATE';
const PDF_TIME_LIMIT = 300; // seconds per run
const PDF_DELAY_MIN = 1; // minutes before next chunk

function buildUniversePDFExtract() {
const state = loadPDFState() || initPDFState();
const start = Date.now();
const outFile = DriveApp.getFileById(state.outputId);

while (state.queue.length && ((Date.now() - start) / 1000) < PDF_TIME_LIMIT) {
const fid = state.queue.shift();
const folder = DriveApp.getFolderById(fid);
crawlPDF(folder, outFile, state);
}

savePDFState(state);
if (state.queue.length) {
schedulePDFNextRun();
Logger.log(`⏳ Paused — ${state.queue.length} folders left`);
} else {
clearPDFState();
Logger.log(`✅ PDF extraction complete`);
}
}

function crawlPDF(folder, outFile, state) {
const files = folder.getFiles();
while (files.hasNext()) {
const f = files.next();
if (f.getName().toLowerCase().endsWith('.pdf')) {
try {
const text = f.getBlob().getDataAsString();
appendText(outFile, `\n\n=== ${f.getName()} ===\n${text}`);
state.count++;
} catch (e) {
Logger.log(`⚠️ ${f.getName()} skipped — ${e}`);
}
}
}
const subs = folder.getFolders();
while (subs.hasNext()) state.queue.push(subs.next().getId());
}

function appendText(file, text) {
const existing = file.getBlob().getDataAsString();
file.setContent(existing + text);
}

function initPDFState() {
const root = DriveApp.getFoldersByName('Vaults').next();
const universe = root.getFoldersByName('Universe').next();
const output = getOrCreateFile(root, 'Universe_Mirror_PDFText.txt');
const state = { outputId: output.getId(), queue: [universe.getId()], count: 0 };
savePDFState(state);
return state;
}

function getOrCreateFile(folder, name) {
const f = folder.getFilesByName(name);
return f.hasNext() ? f.next() : folder.createFile(name, '');
}

function savePDFState(o) {
PropertiesService.getScriptProperties().setProperty(PDF_STATE_KEY, JSON.stringify(o));
}
function loadPDFState() {
const r = PropertiesService.getScriptProperties().getProperty(PDF_STATE_KEY);
return r ? JSON.parse(r) : null;
}
function clearPDFState() {
PropertiesService.getScriptProperties().deleteProperty(PDF_STATE_KEY);
ScriptApp.getProjectTriggers().forEach(t => {
if (t.getHandlerFunction() === 'buildUniversePDFExtract') ScriptApp.deleteTrigger(t);
});
}
function schedulePDFNextRun() {
ScriptApp.newTrigger('buildUniversePDFExtract')
.timeBased()
.after(PDF_DELAY_MIN * 60 * 1000)
.create();
}
