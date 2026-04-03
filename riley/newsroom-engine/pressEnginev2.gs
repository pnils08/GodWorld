/************************************************************
* PRESS ENGINE v2 – Bay_Tribune
* Stage 1 + Stage 2 (skeleton + GodWorld hook)
*
* - Adds "Press Engine" menu
* - Ensures Press_Drafts sheet exists
* - Can write a simple test draft
* - Can generate prompts from the latest GodWorld cycle
*
* NOTE:
* GodWorld (Simulation_Narrative) spreadsheet ID:
* 1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk
************************************************************/

const GODWORLD_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';

/**
* Add custom menu when the Bay_Tribune spreadsheet opens
*/
function onOpen() {
SpreadsheetApp.getUi()
.createMenu("Press Engine")
.addItem("Write Test Draft", "pressWriteTestDraft")
.addItem("Generate Prompts from Latest GodWorld Cycle", "pressGeneratePromptsFromLatestCycle")
.addToUi();
}

/**
* Ensure the Press_Drafts sheet exists and has headers
*/
function getPressDraftSheet_() {
const ss = SpreadsheetApp.getActive();
let sheet = ss.getSheetByName("Press_Drafts");

if (!sheet) {
sheet = ss.insertSheet("Press_Drafts");
}

const headers = [
"Timestamp",
"Cycle",
"Reporter",
"StoryType",
"SignalSource",
"SummaryPrompt",
"DraftText",
"Status"
];

const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];

let headerNeedsUpdate = false;
for (let i = 0; i < headers.length; i++) {
if (existing[i] !== headers[i]) {
headerNeedsUpdate = true;
break;
}
}

if (headerNeedsUpdate) {
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

return sheet;
}

/**
* Simple test function:
* Writes a dummy row into Press_Drafts
*/
function pressWriteTestDraft() {
const sheet = getPressDraftSheet_();
const now = new Date();

sheet.appendRow([
now, // Timestamp
"-", // Cycle
"System", // Reporter
"Test Draft", // StoryType
"Manual Trigger", // SignalSource
"This is a test prompt.", // SummaryPrompt
"This is a test draft created by PressEngine_v2.", // DraftText
"Draft" // Status
]);

SpreadsheetApp.getUi().alert("Test draft written to Press_Drafts.");
}

/************************************************************
* STAGE 2 – GodWorld Hook
* Generate prompts from the latest cycle in Simulation_Narrative
************************************************************/

/**
* Main entry for Stage 2:
* Reads latest cycle from GodWorld and creates story prompts.
*/
function pressGeneratePromptsFromLatestCycle() {
const ui = SpreadsheetApp.getUi();
const sheet = getPressDraftSheet_();

// Open GodWorld (Simulation_Narrative)
let gw;
try {
gw = SpreadsheetApp.openById(GODWORLD_SSID);
} catch (e) {
ui.alert("Could not open Simulation_Narrative: " + e);
return;
}

const digest = gw.getSheetByName("Riley_Digest");
const popSheet = gw.getSheetByName("World_Population");

if (!digest || !popSheet) {
ui.alert("Missing Riley_Digest or World_Population in Simulation_Narrative.");
return;
}

const digestVals = digest.getDataRange().getValues();
if (digestVals.length < 2) {
ui.alert("No cycle found in Riley_Digest.");
return;
}

// Latest cycle row
const latestRow = digestVals[digestVals.length - 1];
const dTimestamp = latestRow[0];
const dCycle = latestRow[1];
const dIntake = latestRow[2];
const dCitizens = latestRow[3];
const dEvents = latestRow[4];
const dIssues = latestRow[5];

// World population snapshot
const popVals = popSheet.getDataRange().getValues();
const popHeader = popVals[0];
const popRow = popVals[1];

const idx = name => popHeader.indexOf(name);
const totalPop = popRow[idx('totalPopulation')];
const illRate = popRow[idx('illnessRate')];
const empRate = popRow[idx('employmentRate')];
const mig = popRow[idx('migration')];
const econ = popRow[idx('economy')];

// Build a small set of prompts based on these signals
const prompts = [];

// 1) City overview piece (Anthony / Mags)
prompts.push({
reporter: "Anthony",
storyType: "City Overview",
source: "Riley_Digest + World_Population",
summary: "Cycle " + dCycle + " snapshot: population " + totalPop +
", illnessRate ~" + (illRate * 100).toFixed(1) + "%, employment ~" +
(empRate * 100).toFixed(1) + "%, economy '" + econ + "'.",
draftText: "",
status: "Draft"
});

// 2) Health / Public Safety angle
prompts.push({
reporter: "Hal Richmond",
storyType: "Health & Stability",
source: "World_Population",
summary: "Illness baseline holding around " + (illRate * 100).toFixed(1) +
"% with no major outbreak signals in Cycle " + dCycle + ".",
draftText: "",
status: "Draft"
});

// 3) Economy / Work angle
prompts.push({
reporter: "P Slayer",
storyType: "Working City",
source: "World_Population",
summary: "Employment around " + (empRate * 100).toFixed(1) +
"%; explore what a 'stable' economy feels like on the street.",
draftText: "",
status: "Draft"
});

// 4) Issues follow-up, if any
if (dIssues && dIssues.toString().trim() !== "") {
prompts.push({
reporter: "Mags Corliss",
storyType: "Issues Follow-Up",
source: "Riley_Digest Issues",
summary: "Digest issues for Cycle " + dCycle + ": " + dIssues,
draftText: "",
status: "Draft"
});
}

// Write prompts into Press_Drafts
const now = new Date();
prompts.forEach(p => {
sheet.appendRow([
now,
dCycle,
p.reporter,
p.storyType,
p.source,
p.summary,
p.draftText,
p.status
]);
});

ui.alert("Generated " + prompts.length + " prompts from Cycle " + dCycle + ".");
}
