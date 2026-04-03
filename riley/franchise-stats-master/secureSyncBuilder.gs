/********************************************
* Riley Secure Sheet Sync Builder v1.0
* Maker: P | Steward: Riley
* Purpose: Verify and register all system sheet links
********************************************/

function Secure_Sync_Builder() {
Logger.log("🔗 Starting secure sheet sync...");

// Define all your sheet connections here:
const links = [
["Franchise Stats Master", "1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss", "Active Season / Stats"],
["Player Audit Log", "1T2JbXnpKCpBBVjm0Jt0qA77d_KQi8rVJhqDPIuMUEJc", "Player Updates / Log"],
["Riley System Log", "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI", "Vault Registry"],
["Bay Tribune", "1MVCJLpU1qs9IAJN6vyzMrzHkvRNl33pYwup_CDd-nGA", "Intake"],
["Wild Media Newswire", "1FQCCqRBUsqixaOmsqcZi-j7aev81656c3UfoQ_DQSVQ", "Intake"]
];

const registry = SpreadsheetApp.openById("1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI").getSheetByName("Vault Registry");
const now = new Date();

// Optional: clear old sync records before rewriting
const lastRow = registry.getLastRow();
if (lastRow > 1) registry.getRange(2, 1, lastRow - 1, 4).clearContent();

links.forEach(row => {
try {
const sheet = SpreadsheetApp.openById(row[1]);
const name = sheet.getName();
registry.appendRow([now, row[0], row[1], "✅ Connected", name, row[2]]);
Logger.log(`✅ ${row[0]} verified and linked.`);
} catch (e) {
registry.appendRow([now, row[0], row[1], "❌ Connection Failed"]);
Logger.log(`⚠️ ${row[0]} failed: ${e.message}`);
}
});

Logger.log("🔒 Secure sheet sync completed successfully.");
}
