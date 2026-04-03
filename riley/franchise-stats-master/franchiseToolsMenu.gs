/**
* Adds a Franchise Tools menu to the spreadsheet UI
* Includes shortcuts to build, verify, and sync player cards.
*/
function onOpen() {
const ui = SpreadsheetApp.getUi();
ui.createMenu("⚾ Franchise Tools")
.addItem("Build Player Cards", "autoBuildPlayerCards")
.addItem("Verify & Repair Player Cards", "verifyPlayerCards")
.addSeparator()
.addItem("Sync Player_Card_Master", "populatePlayerCardMaster")
.addItem("Generate Feeds Tab", "generateFeedsTab")
.addToUi();
}
