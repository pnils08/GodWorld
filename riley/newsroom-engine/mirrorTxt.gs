/**
* buildMediaMirrorChunked_v1.0
* Purpose: Merge all text-based files in Vaults/Universe into one rolling mirror file.
* Handles execution time limits by chunking the crawl.
*/

function buildMediaMirrorChunked() {
const root = DriveApp.getFoldersByName("Vaults").next();
const universe = root.getFoldersByName("Universe").next();
const media = root.getFoldersByName("Media").next();

const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
const textMirror = root.createFile(`Media_Mirror_Text_${dateStr}.txt`, "");

const start = new Date().getTime();
Logger.log(`🔧 Starting Media Mirror Build — ${dateStr}`);

crawlFolder(media, textMirror, start);

Logger.log(`✅ Completed initial chunk (${textMirror.getSize()} bytes)`);
}

/**
* Recursively crawl folders and append text contents.
* Stops near Apps Script 6-minute limit so it can be safely re-run to continue.
*/
function crawlFolder(folder, mirror, start) {
const now = new Date().getTime();
if ((now - start) / 1000 > 330) { // stop after ~5.5 min
Logger.log("⏸️ Reached time limit — rerun buildMediaMirrorChunked() to continue");
return;
}

const files = folder.getFiles();
while (files.hasNext()) {
const file = files.next();
const name = file.getName().toLowerCase();
if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".docx") || name.endsWith(".gdoc")) {
try {
const blob = file.getBlob();
appendText(mirror, `\n\n=== ${file.getName()} ===\n`);
appendText(mirror, blob.getDataAsString());
Logger.log(`📄 Added: ${file.getName()}`);
} catch (err) {
Logger.log(`⚠️ Skipped text file: ${file.getName()} — ${err}`);
}
} else {
Logger.log(`⏩ Skipped non-text file: ${file.getName()}`);
}
}

const subs = folder.getFolders();
while (subs.hasNext()) crawlFolder(subs.next(), mirror, start);
}

/**
* Append text safely into the growing mirror file.
*/
function appendText(file, text) {
const existing = file.getBlob().getDataAsString();
file.setContent(existing + text);
}

