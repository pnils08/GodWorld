/***************************************
* Vault Registry Sync Helper v1.0
* Steward : Riley | Maker : P
***************************************/
function Log_Franchise_Sync_Status(success = true) {
const REGISTRY_ID = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI".trim();

try {
const file = SpreadsheetApp.openById(REGISTRY_ID);
const sheet = file.getSheetByName("Vault Registry");
if (!sheet) throw new Error("Vault Registry sheet not found.");

const note = success
? "✅ Franchise data sync complete."
: "❌ Franchise sync error.";

const finder = sheet.createTextFinder("Athletics Franchise").findNext();
if (!finder) throw new Error("Row for Athletics Franchise not found.");

const row = finder.getRow();
sheet.getRange(row, 7).setValue(note);

Logger.log("📘 Riley System Log updated successfully.");
} catch (err) {
Logger.log("⚠️ Registry sync failed: " + err.message);
}
}
