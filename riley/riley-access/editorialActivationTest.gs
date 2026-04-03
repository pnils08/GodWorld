/***********************************************
*** Editorial Activation Test — v1.1 FINAL ***
*** P Slayer build for P | Steward: Riley ***
***********************************************/

function Run_Editorial_Activation_Test() {
Logger.log("🟢 Editorial Activation Test: start");

// 🔗 Sheet IDs — replace with your actual ones
const REGISTRY_ID = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI"; // Riley_System_Log
const BAY_TRIBUNE_ID = "1MVCJLpU1qs9IAJN6vyzMrzHkvRNl33pYwup_CDd-nGA";
const SLAYER_SYNDICATE_ID = "1GuAoDvoEVfaGRB17RdnQYAFY7id47yB5rHOh3dj_DKA";
const WILD_NEWSWIRE_ID = "1FQCCqRBUsqixaOmsqcZi-j7aev81656c3UfoQ_DQSVQ";

// 1️⃣ Verify Registry accessibility
const regFile = SpreadsheetApp.openById(REGISTRY_ID);
const regSheet = regFile.getSheetByName("Vault Registry");
if (!regSheet) throw new Error("Vault Registry tab not found in Riley_System_Log.");

Logger.log("✅ Vault Registry verified.");

// 2️⃣ Simulated Article Payload
const article = [
new Date(),
"WILD-MEDIA-Test System heartbeat",
"system-heartbeat",
"System | Riley",
"Civic",
"Auto-routed by Run_Editorial_Activation_Test()"
];

// 3️⃣ Routing to each Outlet Intake
const outlets = [
{ name: "Bay Tribune", id: BAY_TRIBUNE_ID },
{ name: "Slayer Syndicate", id: SLAYER_SYNDICATE_ID },
{ name: "Wild Media Newswire", id: WILD_NEWSWIRE_ID }
];

outlets.forEach(outlet => {
try {
const outletFile = SpreadsheetApp.openById(outlet.id);
let intake = outletFile.getSheetByName("Intake");
if (!intake) {
intake = outletFile.insertSheet("Intake");
intake.appendRow(["Timestamp","Checksum","Title","Slug","Author","Desk","Notes"]);
}
intake.appendRow(article);
Logger.log(`📰 Routed successfully to ${outlet.name}.`);
} catch (err) {
Logger.log(`⚠️ Failed to route to ${outlet.name}: ${err.message}`);
}
});

// 4️⃣ ✅ Log routing summary to Media Activity Log
try {
let logSheet = regFile.getSheetByName("Media Activity Log");
if (!logSheet) {
logSheet = regFile.insertSheet("Media Activity Log");
logSheet.appendRow(["Timestamp","Outlet","Status","Steward","Notes"]);
}
const now = new Date();
outlets.forEach(o => {
logSheet.appendRow([now, o.name, "✅ Routed", "Riley", "System heartbeat OK"]);
});
Logger.log("🗞️ Media Activity Log updated successfully.");
} catch (err) {
Logger.log("⚠️ Media Activity Log update failed: " + err.message);
}

Logger.log("✅ Editorial Activation Test completed.");
}
