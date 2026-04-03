/**
* Adds a Franchise Tools menu to the Google Sheet UI
* with smart alerts, progress checks, and auto verification trigger.
*/

function onOpen() {
const ui = SpreadsheetApp.getUi();
ui.createMenu("⚾ Franchise Tools")
.addItem("🧱 Build Player Cards", "runBuildCardsWithAlert")
.addItem("🧩 Verify & Repair Cards", "runVerifyWithAlert")
.addSeparator()
.addItem("🔁 Sync Player_Card_Master", "runSyncWithAlert")
.addItem("📡 Generate Feeds Tab", "runFeedsWithAlert")
.addToUi();
}

/** Build cards with progress pop-up **/
function runBuildCardsWithAlert() {
const ui = SpreadsheetApp.getUi();
ui.alert("🏗️ Building player cards — please wait...");
autoBuildPlayerCards();
ui.alert("✅ Player cards built or verified. Check Template_Audit for details.");
}

/** Verify cards with progress pop-up **/
function runVerifyWithAlert() {
const ui = SpreadsheetApp.getUi();
ui.alert("🔍 Verifying player cards...");
verifyPlayerCards();
ui.alert("✅ Verification complete. Review Template_Audit for results.");
}

/** Sync Player_Card_Master with alert **/
function runSyncWithAlert() {
const ui = SpreadsheetApp.getUi();
ui.alert("🔄 Syncing Player_Card_Master...");
populatePlayerCardMaster();
ui.alert("✅ Sync complete — Master updated.");
}

/** Generate Feeds tab with alert **/
function runFeedsWithAlert() {
const ui = SpreadsheetApp.getUi();
ui.alert("📡 Building Feeds tab...");
generateFeedsTab();
ui.alert("✅ Feeds tab updated.");
}

/** DAILY AUTOMATION — runs verify once every morning **/
function createDailyVerificationTrigger() {
// Delete existing trigger if it exists
const triggers = ScriptApp.getProjectTriggers();
for (let t of triggers) {
if (t.getHandlerFunction() === "autoDailyVerify") ScriptApp.deleteTrigger(t);
}
ScriptApp.newTrigger("autoDailyVerify")
.timeBased()
.everyDays(1)
.atHour(6) // runs early morning
.create();
SpreadsheetApp.getUi().alert("🕕 Daily verification trigger set for 6 AM.");
}

/** The function that runs automatically daily **/
function autoDailyVerify() {
verifyPlayerCards();
addItem("📊 Build Roster Dashboard", "buildRosterDashboard")
}
