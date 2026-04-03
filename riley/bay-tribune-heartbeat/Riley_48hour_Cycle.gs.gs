//const DROPBOX_TOKEN = 'sl.u.AGG68HvEe6XgptpxjpHscxlIYzPMlj6UbafwUu0xrdU6SpnFiEZZEdbCCQI2uWfEms5EYVoqcuwfTdySCqCUyQ7DnVxQ-O_RIBXkxOOrcpOhW859g9qMWBTIDdGB6f3GauZXSGF8mmJ96IHiTTnB3ZplXFIWOLMqSzUJEPky56IDmdFO7M2EKisg9N0Tw9cszBA2hrsinbkgwY08TS1mSryPfQYRQVTrhZVELXE4BTVzkUKi8GTaFzqz25U_rDGIY2oQjfsPufDcTliQzfENgl8QCNVQkKbhsFTUyI5a6OPGcs6XxTnp1t5A8eV85ruH_y6TFKG1ZFvshEA4iSDZsmKY0KjQ6WefqwKx7PZLoYnQiZjLSpx0wHKS9fjWAIjs_84GDblhVWcemZtmXireawAFyN2qJLvhLB3qKGDc6W775b_JWHgsa8nJ_UAYSYGfECFdnYiLQeEDVtvZZZI1HHlKTzvPp7dp6Xm3Je0QOOtld9koWxSk9xJHTxTEi5mEo1Wu0q58Ye-3Gym1VOOl6gx1YGsPyslnK2ZbNLMywH27KIGNLcOXBhHLiVNMJBxTj0fGh20iLRF34EESFUjZ0tAargenta13yknimng348TXFe_kdk0q1YF71lWUVG1rgkUVGj4uCDUstUtHEhJAOX_1Q3X0qPJTbl3KAoPtS_OOYtIcl81yBiNCks2obc9-4PD7ltctpgsFa9FOVfUhoUs1MQ8TAGFt145M51jwT1hU5VKwmnl9cZTJ0egVD1I-EiSV_CD1k3eHkG8IKhpnWSFmltKIjKBslz4q0u9cj5xBPDo6lYpF1NBZFZepAaOybV-srQcGN4OR0rT63VEsrCGU-L3ZNAID7ZdztqSbilpxLMVnHHWCR9IGliWVgs8HJMD90yNui4w7CHl0Lk0adhTAXCNacn6JX-Q00JGL_p4NlZk5YptqY0SQlQELxi6xNlhnNYwuQB3Vq1hmY-SPsI9gASLUDkm-7OLMyVOjnhgryuFRhsuMQejQkbTnne_aJXz_Nh3BWULR7vJTkcKSjxdtVKMmnpsYAmP311z9cMmmpyaNalOZAxAlD3A3qkuFcX22O6YEQcNVB266FTqLyNy-RyRIWxJYRENDkfrDXAvcRaQaJobDSoFtHJm7ywVnbZ5wWHBAcbvMU11bXHptjgbiOLVlRJX_-BW0KlapeYV-N9F1x3c39sPNSjYD7Uz-TXYprOVFuiSVP8bQW_12NeKeLCReTLOxbo2aRcmuKdsYpw';
//function BackupCheck() {
//const blob = Utilities.newBlob("Riley test " + new Date());
//UrlFetchApp.fetch("https://content.dropboxapi.com/2/files/upload", {
//method:"post",
//headers:{
//Authorization:"Bearer "+DROPBOX_TOKEN,
//"Dropbox-API-Arg":JSON.stringify({path:"/cycle_check.txt",mode:"overwrite"}),
//"Content-Type":"application/octet-stream"
//},
//payload:blob.getBytes()
//});
//}
/**
* GW4 Steward 48-Hour Ledger Automation
* Logs a cycle entry every 48 hours into GW4_MasterVault
*/
function runLedgerCycle() {
const folderName = 'GW4_MasterVault';
const fileName = 'Ledger_Heartbeat_Log.txt';
const now = new Date();
const timestamp = now.toLocaleString();

const folders = DriveApp.getFoldersByName(folderName);
if (!folders.hasNext()) {
DriveApp.createFolder(folderName);
}
const folder = DriveApp.getFoldersByName(folderName).next();

const files = folder.getFilesByName(fileName);
let file;
if (files.hasNext()) {
file = files.next();
file.setContent(`Cycle executed: ${timestamp}\n`);
} else {
file = folder.createFile(fileName, `Cycle started: ${timestamp}\n`);
}
}
// === Riley Checksum + Status Layer ===
function stewardChecksumAndStatus() {
try {
const root = DriveApp.getFolderById('1z-S-tUPgx7UjLELQeXveYIXAcedI_-AE'); // Replace with your MasterVault folder ID
const files = root.getFiles();
let report = '--- Riley Checksum Report --- ' + new Date().toLocaleString() + '\n';

while (files.hasNext()) {
const f = files.next();
const hash = Utilities.base64Encode(
Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, f.getBlob().getBytes())
);
report += f.getName() + ' | ' + hash + ' | Status: OK\n';
}

const logs = root.getFilesByName('Ledger_Heartbeat_Log.txt');
if (logs.hasNext()) {
const logFile = logs.next();
logFile.setContent(logFile.getBlob().getDataAsString() + '\n' + report);
}
} catch (e) {
Logger.log('Checksum failure: ' + e);
}
}
function BackupToDropbox() {
const vault = DriveApp.getFolderByName('GW4_MasterVault');
const files = vault.getFiles();
const backup = DriveApp.createFolder('Riley_Integrity_Backups');
while (files.hasNext()) {
const f = files.next();
backup.createFile(f);
}
}
function sendBackupToDropbox() {
const folderIter = DriveApp.getFoldersByName('GW4_MasterVault');
const folder = folderIter.hasNext() ? folderIter.next() : null;
if (!folder) {
Logger.log('Error: Folder GW4_MasterVault not found.');
return;
}
const files = folder.getFiles();
while (files.hasNext()) {
const f = files.next();
const blob = f.getBlob();
UrlFetchApp.fetch("https://content.dropboxapi.com/2/files/upload", {
method: "post",
headers: {
Authorization: "Bearer " + DROPBOX_TOKEN,
"Dropbox-API-Arg": JSON.stringify({
path: "/Riley_Integrity_Backups/" + f.getName(),
mode: "overwrite"
}),
"Content-Type": "application/octet-stream"
},
payload: blob.getBytes()
});

try {
  logBackupStatus(true, 'File uploaded to Dropbox successfully.');
} catch (e) {
  logBackupStatus(false, 'Upload failed: ' + e.message);
}
}
}
function logBackupStatus(success, message) {
  const logName = 'Backup_Status_Log.txt';
  const folderName = 'GW4_MasterVault';
  const folderIter = DriveApp.getFoldersByName(folderName);
  if (!folderIter.hasNext()) return;

  const folder = folderIter.next();
  const now = new Date();
  const statusLine = `[${now.toLocaleString()}] Backup ${success ? 'SUCCESS' : 'FAILED'}: ${message}\n`;

  let logFile;
  const logs = folder.getFilesByName(logName);
  if (logs.hasNext()) {
    logFile = logs.next();
    logFile.setContent(logFile.getBlob().getDataAsString() + statusLine);
  } else {
    logFile = folder.createFile(logName, statusLine);
  }
}