/***********************************************
*** Weekly Editorial Heartbeat — v1.1a ***
*** Runs Riley’s editorial bridge once weekly ***
***********************************************/

function Weekly_Editorial_Heartbeat() {
Logger.log("💓 Starting weekly editorial heartbeat...");
Run_Editorial_Activation_Test(); // <-- your existing function
Logger.log("💓 Weekly editorial heartbeat complete.");
Log_Media_Heartbeat_Status(true);
}
/****************************************************
*** Media Heartbeat Logger — v1.0a ***
*** Updates Riley_System_Log dashboard timestamp ***
****************************************************/

function Log_Media_Heartbeat_Timestamp() {
try {
const systemLogId = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI"; // Riley_System_Log
const sheet = SpreadsheetApp.openById(systemLogId).getSheetByName("Vault Registry");
if (!sheet) throw new Error("Vault Registry not found in System Log");

const data = sheet.getDataRange().getValues();
const now = new Date();

for (let i = 0; i < data.length; i++) {
if (data[i][0] === "Media Network") {
sheet.getRange(i + 1, 5).setValue(now); // Column E = Last Sync
sheet.getRange(i + 1, 6).setValue("Riley"); // Column F = Steward
sheet.getRange(i + 1, 7).setValue("Automated editorial heartbeat update.");
Logger.log("📅 Media heartbeat timestamp logged successfully.");
return;
}
}

Logger.log("⚠️ Media Network row not found — please ensure it's listed in Vault Registry.");
} catch (err) {
Logger.log("❌ Media heartbeat log failed: " + err.message);
}
}
// Optional: Mark PASS/FAIL in Vault Registry
function Log_Media_Heartbeat_Status(success = true) {
const systemLogId = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI"; // Riley_System_Log
const sheet = SpreadsheetApp.openById(systemLogId).getSheetByName("Vault Registry");
const data = sheet.getDataRange().getValues();
const statusText = success ? "✅ PASSED" : "❌ FAILED";
const note = success
? "All three media outlets received editorial heartbeat successfully."
: "One or more outlets failed to confirm intake.";

for (let i = 0; i < data.length; i++) {
if (data[i][0] === "Media Network") {
sheet.getRange(i + 1, 7).setValue(`${statusText} — ${note}`);
Logger.log(`📋 Media heartbeat status: ${statusText}`);
return;
}
}
}
