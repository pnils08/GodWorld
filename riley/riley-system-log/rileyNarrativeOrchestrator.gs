function getActiveVaults_() {
try {
// ID of your Riley_System_Log spreadsheet
const registryId = '11m-zXxAPeaKCW6-xT-JjTK3VATkBsbdkSB1NYMp1-QI';
const ss = SpreadsheetApp.openById(registryId);
const sheet = ss.getSheetByName('Vault_Registry_API'); // tab name must match exactly

if (!sheet) throw new Error('Vault_Registry_API sheet not found');

const data = sheet.getDataRange().getValues();
const headers = data.shift();

const nameCol = headers.indexOf('Vault Name');
const idCol = headers.indexOf('Sheet ID');
const narrativeCol = headers.indexOf('Narrative');

if (nameCol === -1 || idCol === -1 || narrativeCol === -1)
throw new Error('Missing required columns: Vault Name, Sheet ID, Narrative');

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
