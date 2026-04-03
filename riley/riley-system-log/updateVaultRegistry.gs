function updateVaultRegistry(vaultName, folderId, status, note) {
const ss = SpreadsheetApp.openById('1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI');
const sheet = ss.getSheetByName('Vault Registry');
const data = sheet.getDataRange().getValues();
const now = new Date();
let found = false;

for (let i = 1; i < data.length; i++) {
if (data[i][0] === vaultName) {
sheet.getRange(i + 1, 4).setValue(status); // Status
sheet.getRange(i + 1, 6).setValue(now); // Last Sync
sheet.getRange(i + 1, 8).setValue(note || ''); // Notes
sheet.getRange(i + 1, 9).setValue(now); // Last Heartbeat
found = true;
break;
}
}
if (!found) {
sheet.appendRow([vaultName, folderId, 'Mirror', status, '', now, 'Riley', note, now]);
}
}
