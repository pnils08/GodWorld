/**
* Logs every tool run (build, verify, sync, feeds, triggers) to a tab called Activity_Log.
* Works across all Franchise_Stats_Master tabs.
*/
function logActivity(action, affectedSheets = []) {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const logSheet = ss.getSheetByName("Activity_Log") || ss.insertSheet("Activity_Log");

const timestamp = new Date();
const user = Session.getActiveUser().getEmail() || "Anonymous";

logSheet.appendRow([
timestamp,
user,
action,
affectedSheets.join(", ")
]);

// keep recent 5000 entries, optional
const lastRow = logSheet.getLastRow();
if (lastRow > 5000) logSheet.deleteRows(1, lastRow - 5000);
}

/**
* Wraps key functions with logging.
*/
function runBuildCardsWithAlert() {
const ui = SpreadsheetApp.getUi();
ui.alert("🏗️ Building player cards — please wait...");
autoBuildPlayerCards();
logActivity("Build Player Cards");
ui.alert("✅ Player cards built or verified. Check Template_Audit for details.");
}

function runVerifyWithAlert() {
const ui = SpreadsheetApp.getUi();
ui.alert("🔍 Verifying player cards...");
verifyPlayerCards();
logActivity("Verify Player Cards");
ui.alert("✅ Verification complete. Review Template_Audit for results.");
}

function runSyncWithAlert() {
const ui = SpreadsheetApp.getUi();
ui.alert("🔄 Syncing Player_Card_Master...");
populatePlayerCardMaster();
logActivity("Sync Player_Card_Master");
ui.alert("✅ Sync complete — Master updated.");
}

function runFeedsWithAlert() {
const ui = SpreadsheetApp.getUi();
ui.alert("📡 Building Feeds tab...");
generateFeedsTab();
logActivity("Generate Feeds Tab");
ui.alert("✅ Feeds tab updated.");
}

function autoDailyVerify() {
verifyPlayerCards();
logActivity("Auto Daily Verify");
}
