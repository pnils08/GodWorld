/**
* MASTER TEXT CRAWLER – v1.0
* Recursively scans a Drive folder and all subfolders,
* finds every .txt file, and appends all text into one master file.
* Ideal for creating a unified mirror archive of text-only content.
*/

function crawlAllTxtFiles() {
const ROOT_ID = '1xL-6_e58NmvDAMf0z0kUJv4ID3qA822X'; // replace with your top-level folder ID
const OUTPUT_NAME = `Text_Mirror_Full_${new Date().toISOString().slice(0, 10)}.txt`;
const folder = DriveApp.getFolderById(ROOT_ID);
let masterContent = '';

function crawl(folder) {
const files = folder.getFilesByType(MimeType.PLAIN_TEXT);
while (files.hasNext()) {
const file = files.next();
const text = file.getBlob().getDataAsString();
masterContent += `\n\n──────────────────────────────\n${file.getName()}\n──────────────────────────────\n${text}`;
}

const subfolders = folder.getFolders();
while (subfolders.hasNext()) crawl(subfolders.next());
}

crawl(folder);

const outputFile = folder.createFile(OUTPUT_NAME, masterContent, MimeType.PLAIN_TEXT);
Logger.log(`✅ Created master file: ${outputFile.getName()} in ${folder.getName()}`);
}

