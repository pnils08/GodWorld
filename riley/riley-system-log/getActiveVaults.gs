function getActiveVaults_() {
try {
const registryId = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI'; // your main sheet ID
const file = DriveApp.getFileById(registryId);
Logger.log(`Access confirmed for: ${file.getName()}`);

const ss = SpreadsheetApp.openById(registryId);
const sheet = ss.getSheetByName('Vault Registry') || ss.getSheets()[0];
const data = sheet.getDataRange().getValues();

const headers = data.shift();
const nameCol = headers.indexOf('Vault Name');
const idCol = headers.indexOf('Sheet ID');
const narrativeCol = headers.indexOf('Narrative');

if (nameCol === -1 || idCol === -1 || narrativeCol === -1) {
throw new Error('Missing required columns: Vault Name, Sheet ID, Narrative');
}

const activeVaults = data
.filter(r => String(r[narrativeCol]).toUpperCase() === 'TRUE')
.map(r => ({ name: r[nameCol], id: r[idCol] }));

Logger.log(`Loaded ${activeVaults.length} active vaults.`);
return activeVaults;
} catch (e) {
Logger.log(`getActiveVaults_ error: ${e.message}`);
return [];
}
}

function test_getActiveVaults() {
const vaults = getActiveVaults_();
Logger.log(vaults);
}
