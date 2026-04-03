/**
* buildUniverseMirrorChunked_v1.1 (auto-resume)
* Purpose: Merge all text-based files in Vaults/Universe into one rolling mirror file.
* Continues across time limits using a saved folder queue + time trigger.
*
* Entry point: buildUniverseMirrorChunked()
*/

const UM_STATE_KEY = 'UM_CHUNKED_STATE';
const TIME_BUDGET_SEC = 300; // ~5 minutes to stay under Apps Script limit
const RESUME_DELAY_MIN = 1; // trigger gap

function buildUniverseMirrorChunked() {
const state = loadState() || initState();

const startMs = Date.now();
const mirror = DriveApp.getFileById(state.mirrorFileId);

// Process folders until time budget is up
while (state.queue.length && ((Date.now() - startMs) / 1000) < TIME_BUDGET_SEC) {
const folderId = state.queue.shift();
const folder = DriveApp.getFolderById(folderId);
crawlOnce(folder, mirror, state);
}

saveState(state);

if (state.queue.length) {
// Schedule next chunk
scheduleResume('buildUniverseMirrorChunked', RESUME_DELAY_MIN);
Logger.log(`⏳ Reached time limit — queued resume. Remaining folders: ${state.queue.length}`);
} else {
// Done
clearState();
Logger.log(`✅ Mirror complete (${mirror.getSize()} bytes): ${mirror.getName()} — ${mirror.getUrl()}`);
}
}

/**
* One pass over a single folder: append eligible files, enqueue subfolders.
* Uses your exact extension filter (.txt, .md, .docx, .gdoc)
*/
function crawlOnce(folder, mirror, state) {
Logger.log(`📁 Folder: ${folder.getName()}`);

const files = folder.getFiles();
while (files.hasNext()) {
const file = files.next();
const nameLower = file.getName().toLowerCase();

if (
nameLower.endsWith('.txt') ||
nameLower.endsWith('.md') ||
nameLower.endsWith('.docx') ||
nameLower.endsWith('.gdoc')
) {
try {
const blob = file.getBlob();
appendText(mirror, `\n\n=== ${file.getName()} ===\n`);
appendText(mirror, blob.getDataAsString());
state.added++;
Logger.log(`📄 Added: ${file.getName()}`);
} catch (err) {
state.skipped++;
Logger.log(`⚠️ Skipped text file: ${file.getName()} — ${err}`);
}
} else {
state.skipped++;
Logger.log(`⏩ Skipped non-text file: ${file.getName()}`);
}
}

const subs = folder.getFolders();
while (subs.hasNext()) state.queue.push(subs.next().getId());
}

/** Your original safe append: keeps output format identical to v1.0 */
function appendText(file, text) {
const existing = file.getBlob().getDataAsString();
file.setContent(existing + text);
}

/** --------- State / Setup / Triggers --------- **/

function initState() {
// Locate Vaults > Universe
const root = DriveApp.getFoldersByName('Vaults').next();
const universe = root.getFoldersByName('Universe').next();

// Mirror file: Universe_Mirror_Text_YYYYMMDD.txt under Vaults (root)
const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
const fileName = `Universe_Mirror_Text_${dateStr}.txt`;
const mirror = getOrCreateInFolderByName(root, fileName);

if (mirror.getSize() === 0) {
mirror.setContent(`=== UNIVERSE MIRROR START ===\nCreated: ${new Date().toISOString()}\n`);
}

const state = {
mirrorFileId: mirror.getId(),
queue: [universe.getId()], // start from Universe folder
added: 0,
skipped: 0
};
saveState(state);
Logger.log(`🔧 Starting Universe Mirror Build — ${dateStr}`);
return state;
}

function getOrCreateInFolderByName(folder, name) {
const files = folder.getFilesByName(name);
if (files.hasNext()) return files.next();
return folder.createFile(name, '');
}

function saveState(obj) {
PropertiesService.getScriptProperties().setProperty(UM_STATE_KEY, JSON.stringify(obj));
}

function loadState() {
const raw = PropertiesService.getScriptProperties().getProperty(UM_STATE_KEY);
return raw ? JSON.parse(raw) : null;
}

function clearState() {
PropertiesService.getScriptProperties().deleteProperty(UM_STATE_KEY);
// Clean any queued triggers for this handler
ScriptApp.getProjectTriggers().forEach(t => {
if (t.getHandlerFunction() === 'buildUniverseMirrorChunked') ScriptApp.deleteTrigger(t);
});
}

function scheduleResume(handler, minutes) {
// prevent duplicate triggers
ScriptApp.getProjectTriggers().forEach(t => {
if (t.getHandlerFunction() === handler) ScriptApp.deleteTrigger(t);
});
ScriptApp.newTrigger(handler).timeBased().after(minutes * 60 * 1000).create();
}
