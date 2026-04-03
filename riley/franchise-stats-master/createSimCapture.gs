/**
* Creates a new SimCapture text file in the Universe vault.
* @param {string} title - short description or label for the capture
* @param {string} body - the full narrative or text we wrote for it
*/
function createSimCaptureFile(title, body) {
const universeFolderId = '1LV3gjFCP5kLYJDjaMoDl4etNyKFQ3ZLd'; // Universe vault ID
const folder = DriveApp.getFolderById(universeFolderId);

const timestamp = new Date().toISOString();
const fileName = `Universe_SimCapture_${timestamp}_${title}.txt`;

const file = folder.createFile(fileName, body);
Logger.log('SimCapture created: ' + file.getUrl());
return file.getUrl();
}
function appendToSimFeed(title, content) {
const ss = DriveApp.getFolderById('1LV3gjFCP5kLYJDjaMoDl4etNyKFQ3ZLd'); // Universe Vault
const files = ss.getFilesByName('Universe_SimFeed.txt');
let file = files.hasNext() ? files.next() : ss.createFile('Universe_SimFeed.txt', '');

const timestamp = new Date().toISOString();
const entry = `\n---\n${timestamp}\n${title}\n${content}\n`;
file.append(entry);
Logger.log('Appended new SimCapture to feed.');
}
createSimCaptureFile(
'SunsetTest01',
'Captured horizon test. Gold tones reflected off east ridge; air temp 58F, light crosswind.'
);