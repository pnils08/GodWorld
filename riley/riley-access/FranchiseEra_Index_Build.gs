function FranchiseEra_Index_Build() {
Logger.log("🪶 Building Franchise Era Index for Riley Steward manifest...");

const binder = SpreadsheetApp.openById("1fpFDikkw5GgPpWb5O28934QGTXl_WVBcsZZU6FFOwEc");
const sheetName = "FranchiseEra_Index";
let sheet = binder.getSheetByName(sheetName);

if (!sheet) {
sheet = binder.insertSheet(sheetName);
sheet.appendRow(["Ledger / System", "Build ID", "Timestamp", "Status"]);
}

const systems = [
"Population",
"Civic",
"Universe",
"Creative_Vault",
"Codex",
"God_Mode",
"ANI",
"Vaults"
];

const buildTime = new Date();
systems.forEach((sys) => {
const buildId = Utilities.getUuid();
sheet.appendRow([sys, buildId, buildTime, "✅"]);
Logger.log(`Index entry created for ${sys}`);
});

Logger.log("✅ FranchiseEra_Index_Build completed successfully.");
}
