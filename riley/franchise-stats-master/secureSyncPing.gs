/********************************************
* Riley Sheet Ping Verifier v1.0
* Maker: P | Steward: Riley
* Purpose: Perform handshake test on all linked sheets
********************************************/

function Secure_Sync_Ping() {
Logger.log("📡 Starting sheet connectivity ping...");

const registryId = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI";
const registry = SpreadsheetApp.openById(registryId).getSheetByName("Vault Registry");
const data = registry.getRange("A2:F").getValues().filter(r => r[0]);
const now = new Date();

data.forEach(row => {
const [ , systemName, sheetId ] = row;
try {
const target = SpreadsheetApp.openById(sheetId);
const firstSheet = target.getSheets()[0];
const testNote = `✅ Ping OK - ${now.toLocaleString()}`;

// Write a temporary test note to the last cell of column Z
const lr = firstSheet.getLastRow() + 1;
firstSheet.getRange(`Z${lr}`).setValue(testNote);

// Update status in the registry
const rowIndex = registry.createTextFinder(systemName).findNext().getRow();
registry.getRange(rowIndex, 4).setValue("✅ Ping Successful");
Logger.log(`✅ ${systemName} handshake passed.`);
} catch (err) {
const rowIndex = registry.createTextFinder(systemName).findNext().getRow();
registry.getRange(rowIndex, 4).setValue("❌ Ping Failed");
Logger.log(`⚠️ ${systemName} handshake failed: ${err.message}`);
}
});

Logger.log("📘 All sheet pings completed.");
}
/********************************************
* Riley Sync Cleaner v1.0
* Maker: P | Steward: Riley
* Purpose: Remove ping markers and refresh registry notes
********************************************/
function Secure_Sync_Cleaner() {
Logger.log("🧹 Cleaning up ping markers...");
const registryId = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI";
const registry = SpreadsheetApp.openById(registryId).getSheetByName("Vault Registry");
const data = registry.getRange("A2:F").getValues().filter(r => r[0]);

data.forEach(row => {
const [ , systemName, sheetId ] = row;
try {
const target = SpreadsheetApp.openById(sheetId);
const firstSheet = target.getSheets()[0];
const lr = firstSheet.getLastRow();
const rangeZ = firstSheet.getRange(`Z1:Z${lr}`);
rangeZ.clearContent();
Logger.log(`🧽 ${systemName}: cleaned column Z`);
} catch (e) {
Logger.log(`⚠️ ${systemName}: cleanup failed – ${e.message}`);
}
});

Logger.log("✅ Cleanup complete.");
}
