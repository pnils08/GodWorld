/************************************************************
* Stage 2 — Story Types by Signal
* Upgraded prompt generator:
* - analyzes cycle data
* - generates story types based on real signals
* - routes reporters using pressPickReporterForStory_
************************************************************/

function pressGeneratePromptsFromLatestCycle() {
const ui = SpreadsheetApp.getUi();
const drafts = getPressDraftSheet_();

let gw;
try {
gw = SpreadsheetApp.openById(GODWORLD_SSID);
} catch (e) {
ui.alert("Cannot open Simulation_Narrative: " + e);
return;
}

const digest = gw.getSheetByName("Riley_Digest");
const pop = gw.getSheetByName("World_Population");

if (!digest || !pop) {
ui.alert("Missing sheets in Simulation_Narrative.");
return;
}

const digestVals = digest.getDataRange().getValues();
if (digestVals.length < 2) {
ui.alert("No cycles available.");
return;
}

// Latest cycle
const latest = digestVals[digestVals.length - 1];
const cycle = latest[1];
const issues = latest[5];

// Population signals
const popVals = pop.getDataRange().getValues();
const header = popVals[0];
const row = popVals[1];
const idx = name => header.indexOf(name);

const totalPop = row[idx('totalPopulation')];
const ill = row[idx('illnessRate')];
const emp = row[idx('employmentRate')];
const mig = row[idx('migration')];
const econ = row[idx('economy')];

// Build prompts intelligently
const prompts = [];

// CITY OVERVIEW
prompts.push({
storyType: "City Overview",
source: "World_Population",
summary: "Cycle " + cycle +
": city population " + totalPop +
", illness ~" + (ill * 100).toFixed(1) +
"%, employment ~" + (emp * 100).toFixed(1) +
"%, economy '" + econ + "'."
});

// PUBLIC MOOD / PULSE
prompts.push({
storyType: "Public Mood",
source: "Population Drift",
summary: "Cycle " + cycle +
": small shifts in illness/employment suggest subtle public mood changes."
});

// CIVIC ISSUES (if digest reported issues)
if (issues && issues.toString().trim() !== "") {
prompts.push({
storyType: "Civic Issues",
source: "Riley_Digest",
summary: "Issues flagged this cycle: " + issues
});
}

// ECONOMIC SHIFT
prompts.push({
storyType: "Economic Shift",
source: "Employment Signal",
summary: "Employment at " + (emp * 100).toFixed(1) +
"%; explore economic stability or strain."
});

// HEALTH & SAFETY
prompts.push({
storyType: "Health & Safety",
source: "Illness Rate",
summary: "Illness holding around " + (ill * 100).toFixed(1) +
"%; check seasonal patterns and public response."
});

// MIGRATION / COMMUNITY
prompts.push({
storyType: "Community",
source: "Migration",
summary: "Migration: " + mig +
"; explore community-level changes or neighborhood sentiment."
});

// SPORTS UNIVERSE HOOK
prompts.push({
storyType: "Sports",
source: "A’s Universe",
summary: "Review potential A’s universe signals or cycle narratives."
});

// NEIGHBORHOOD WATCH
prompts.push({
storyType: "Neighborhood Watch",
source: "Neighborhood Drift",
summary: "Cycle " + cycle +
": background neighborhood drift suggests minor shifts in local tone."
});

// HUMAN INTEREST
prompts.push({
storyType: "Human Interest",
source: "Population Baseline",
summary: "Even with stability, human-interest stories emerge from everyday life."
});

// WRITE TO Press_Drafts WITH ROUTING
const now = new Date();
prompts.forEach(p => {
const reporter = pressPickReporterForStory_(p.storyType);

drafts.appendRow([
now,
cycle,
reporter,
p.storyType,
p.source,
p.summary,
"",
"Draft"
]);
});

ui.alert("Created " + prompts.length + " prompts for Cycle " + cycle + ".");
}
