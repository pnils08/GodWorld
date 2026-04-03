/**
* Reads the Franchise_Roster_Index and builds or verifies player cards
* using Hitter and Pitcher templates.
*/
function autoBuildPlayerCards() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const roster = ss.getSheetByName("Franchise_Roster_Index");
const hitterTemplate = ss.getSheetByName("Hitter_Template");
const pitcherTemplate = ss.getSheetByName("Pitcher_Template");

if (!roster || !hitterTemplate || !pitcherTemplate) {
SpreadsheetApp.getUi().alert("Templates or Roster_Index missing!");
return;
}

const data = roster.getRange(2, 1, roster.getLastRow() - 1, 4).getValues();
const logs = [];

for (const [name, type] of data) {
if (!name) continue;
let card = ss.getSheetByName(name);
if (!card) {
const template = type === "pitcher" ? pitcherTemplate : hitterTemplate;
card = template.copyTo(ss).setName(name);
logs.push(`Created new ${type} card for ${name}`);
} else {
logs.push(`Verified ${name} already exists`);
}
}

const report = ss.getSheetByName("Template_Audit") || ss.insertSheet("Template_Audit");
report.clear();
report.getRange(1, 1, logs.length, 1).setValues(logs.map(e => [e]));
SpreadsheetApp.getUi().alert("✅ Player cards processed. Check Template_Audit.");
}
