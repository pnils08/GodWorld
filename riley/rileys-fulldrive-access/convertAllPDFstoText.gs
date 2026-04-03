/**
* ONE-TIME PDF → TEXT CONVERSION
* Converts all PDFs in the folder (and subfolders) to plain text (.txt)
* and stores them beside the originals using OCR.
*/

function convertAllPDFsToText() {
const ROOT_FOLDER_ID = '1vWSRPAPkRUQLCjGhPub4ijAgMTneAZs9'; // replace with your main folder ID
const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
convertFolderRecursive(rootFolder);
}

function convertFolderRecursive(folder) {
const files = folder.getFiles();
while (files.hasNext()) {
const file = files.next();
if (file.getMimeType() === 'application/pdf') {
try {
const blob = file.getBlob();
const resource = {
name: file.getName().replace(/\.pdf$/i, '') + '.txt',
mimeType: 'text/plain',
parents: [folder.getId()]
};
// Use Drive Advanced Service
const newFile = Drive.Files.create(resource, blob, { ocr: true });
Logger.log(`Converted: ${file.getName()} → ${newFile.name}`);
} catch (err) {
Logger.log(`Error converting ${file.getName()}: ${err.message}`);
}
}
}

const subfolders = folder.getFolders();
while (subfolders.hasNext()) {
convertFolderRecursive(subfolders.next());
}
}
