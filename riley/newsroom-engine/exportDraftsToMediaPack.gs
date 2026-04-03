/************************************************************
* STEP 3 — Export Press_Drafts → Media Packet (copy/paste)
************************************************************/

/**
* Builds a clean Media Packet from selected Press_Drafts rows.
*/
function exportDraftsToMediaPacket() {
const ss = SpreadsheetApp.getActive();
const sheet = ss.getSheetByName("Press_Drafts");
const ui = SpreadsheetApp.getUi();

if (!sheet) {
ui.alert("Press_Drafts sheet not found.");
return;
}

const range = sheet.getActiveRange();
if (!range) {
ui.alert("Select one or more rows in Press_Drafts to export.");
return;
}

const values = range.getValues();
if (values.length === 0) {
ui.alert("No rows selected.");
return;
}

// Media Packet header
let packet = "=== MEDIA PACKET — FROM PRESS_DRAFTS ===\n\n";

values.forEach(row => {
const timestamp = row[0];
const cycle = row[1];
const reporter = row[2];
const storyType = row[3];
const signalSource = row[4];
const summary = row[5];

packet +=
"---------------------------\n" +
"Reporter: " + reporter + "\n" +
"Story Type: " + storyType + "\n" +
"Cycle: " + cycle + "\n" +
"Source: " + signalSource + "\n\n" +
"Prompt:\n" + summary + "\n" +
"---------------------------\n\n";
});

packet += "=== END MEDIA PACKET ===";

// Show the packet in a modal box for copy/paste
ui.alert("Media Packet Ready", packet, ui.ButtonSet.OK);
}


/**
* Add Export option to the Press Engine menu
*/
function onOpen() {
SpreadsheetApp.getUi()
.createMenu("Press Engine")
.addItem("Write Test Draft", "pressWriteTestDraft")
.addItem("Generate Prompts from Latest GodWorld Cycle", "pressGeneratePromptsFromLatestCycle")
.addSeparator()
.addItem("Export Selected Drafts to Media Packet", "exportDraftsToMediaPacket")
.addToUi();
}
