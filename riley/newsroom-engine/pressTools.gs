function onOpen() {
const ui = SpreadsheetApp.getUi();
ui.createMenu("Press Engine")
.addItem("Generate Headlines", "press_generateHeadlines")
.addItem("Story Pitch Generator", "press_generatePitches")
.addItem("Assign Reporter", "press_assignReporterTool")
.addItem("Pull Context From Canon", "press_pullCanonContext")
.addItem("Live Statistical Query", "press_liveStatsQuery")
.addItem("Open Reporter Profile", "press_openReporterProfile")
.addItem("Open Player Profile", "press_openPlayerProfile")
.addToUi();
}

// ---------------- HEADLINE GENERATOR ------------------

function press_generateHeadlines() {
const ss = SpreadsheetApp.getActive();
const drafts = ss.getSheetByName("Press_Drafts");
if (!drafts) return;

const values = drafts.getDataRange().getValues();

for (let r = 1; r < values.length; r++) {
const row = values[r];
const storyType = row[2];
const topic = row[3];

const headline = "Breaking: " + topic + " — developing story.";
drafts.getRange(r + 1, 5).setValue(headline);
}

SpreadsheetApp.getUi().alert("Headlines generated.");
}

// ---------------- PITCH GENERATOR ------------------

function press_generatePitches() {
const ss = SpreadsheetApp.getActive();
const drafts = ss.getSheetByName("Press_Drafts");
if (!drafts) return;

const range = drafts.getActiveRange();
const topic = range.getValue();

const pitch = "Angle: explore community implications of " + topic;
drafts.getRange(range.getRow(), 6).setValue(pitch);

SpreadsheetApp.getUi().alert("Pitch generated.");
}

// ---------------- REPORTER ASSIGNMENT TOOL ------------

function press_assignReporterTool() {
const ss = SpreadsheetApp.getActive();
const drafts = ss.getSheetByName("Press_Drafts");
if (!drafts) return;

const r = drafts.getActiveRange().getRow();
const storyType = drafts.getRange(r, 3).getValue();

const map = {
"civic": "Carmen Delaine",
"crime": "Tanya Cruz",
"economy": "Marla Keen",
"schools": "Elliot Graye",
"human": "Lena Carrow",
"sports": "P Slayer",
"analysis": "Hal Richmond",
"pulse": "Anthony"
};

drafts.getRange(r, 4).setValue(map[storyType] || "Anthony");
SpreadsheetApp.getUi().alert("Reporter assigned.");
}

// ---------------- CANON CONTEXT -----------------------

function press_pullCanonContext() {
const ss = SpreadsheetApp.openById("1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk");
const ledger = ss.getSheetByName("Simulation_Ledger");
if (!ledger) return;

const values = ledger.getRange(2, 1, 30, 5).getValues();
const context = values.map(v => v.join(" | ")).join("\n");

const ui = SpreadsheetApp.getUi();
ui.alert(context);
}

// ---------------- LIVE STATS QUERY --------------------

function press_liveStatsQuery() {
const ss = SpreadsheetApp.openById("1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk");
const pop = ss.getSheetByName("World_Population");
if (!pop) return;

const total = pop.getRange(2, 1).getValue();
const illness = pop.getRange(2, 2).getValue();
const emp = pop.getRange(2, 3).getValue();

SpreadsheetApp.getUi().alert(
"Population: " + total + "\nIllness Rate: " + illness + "\nEmployment: " + emp
);
}

// ---------------- PROFILE LOOKUPS ---------------------

function press_openReporterProfile() {
SpreadsheetApp.getUi().alert("Reporter profile system coming in Stage 4.");
}

function press_openPlayerProfile() {
SpreadsheetApp.getUi().alert("Player profile system coming in Stage 4.");
}
