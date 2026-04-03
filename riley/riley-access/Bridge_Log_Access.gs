function Bridge_Log_Sync() {
Logger.log("🔄 Starting Civic–Population bridge sync...");

// 🛡️ Status + Steward Verification
const registryFile = SpreadsheetApp.openById("1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI");
const registryCheck = registryFile.getSheetByName("Vault Registry");
const registryData = registryCheck.getDataRange().getValues();

let civicActive = false;
let popActive = false;

for (let i = 0; i < registryData.length; i++) {
const name = registryData[i][0];
const status = registryData[i][3];
const steward = registryData[i][5];
if (name === "Civic Ledger" && status === "Active" && steward === "Riley") civicActive = true;
if (name === "Population Ledger" && status === "Active" && steward === "Riley") popActive = true;
}

if (!civicActive || !popActive) {
Logger.log("⛔ Bridge blocked: one or both ledgers inactive or steward mismatch.");
return;
}

Logger.log("🟢 Validation passed: both ledgers active under Riley stewardship.");

try {
// Open Civic Ledger
const civicFile = SpreadsheetApp.openById("1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo");
const civicSheet = civicFile.getSheetByName("Registry");
if (!civicSheet) {
Logger.log("⚠️ Civic Ledger found, but missing 'Registry' tab.");
return;
}
Logger.log("✅ Civic Ledger registry accessed.");

// Open Population Ledger
const populationFile = SpreadsheetApp.openById("1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo");
const populationSheet = populationFile.getSheetByName("Registry");
if (!populationSheet) {
Logger.log("⚠️ Population Ledger found, but missing 'Registry' tab.");
return;
}
Logger.log("✅ Population Ledger registry accessed.");

// Copy Civic data into Population
const range = civicSheet.getDataRange();
const values = range.getValues();
populationSheet.clearContents();
populationSheet.getRange(1, 1, values.length, values[0].length).setValues(values);
Logger.log("✅ Civic–Population bridge sync complete.");

// Wait briefly to ensure write propagation before registry update
Utilities.sleep(2000);

// Update timestamp in Vault Registry
const vaultRegistryFile = SpreadsheetApp.openById("1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI");
const vaultSheet = vaultRegistryFile.getSheetByName("Vault Registry");

if (!vaultSheet) {
Logger.log("⚠️ Vault Registry sheet not found in Riley_System_Log.");
return;
}

const data = vaultSheet.getDataRange().getValues();
for (let i = 0; i < data.length; i++) {
const vaultName = (data[i][0] || "").toString().trim().toLowerCase();
if (vaultName === "population ledger") {
vaultSheet.getRange(i + 1, 5).setValue(new Date()); // column E = Last Sync
Logger.log("📅 Vault Registry updated successfully for Population Ledger.");
return;
}
}

Logger.log("⚠️ Population Ledger entry not found in Vault Registry.");
} catch (err) {
Logger.log("❌ Bridge sync failed: " + err);
}

Logger.log("🏁 Execution completed.");
}
