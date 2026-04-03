/**
* Verifies every player card tab against its correct template.
* Repairs headers if changed, and logs the results.
*/
function verifyPlayerCards() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const roster = ss.getSheetByName("Franchise_Roster_Index");
const hitterTemplate = ss.getSheetByName("Hitter_Template");
const pitcherTemplate = ss.getSheetByName("Pitcher_Template");
if (!roster || !hitterTemplate || !pitcherTemplate) {
SpreadsheetApp.getUi().alert("❌ Missing roster or template tabs.");
return;
}

const rosterData = roster.getRange(2, 1, roster.getLastRow() - 1, 4).getValues();
const log = [];

for (const [name, type] of rosterData) {
if (!name) continue;
const sheet = ss.getSheetByName(name);
if (!sheet) {
log.push(`⚠️ ${name} not found`);
continue;
}

const template = type === "pitcher" ? pitcherTemplate : hitterTemplate;
const tVals = template.getRange("A1:A8").getValues();
const cVals = sheet.getRange("A1:A8").getValues();

if (JSON.stringify(tVals) !== JSON.stringify(cVals)) {
sheet.getRange("A1:A8").setValues(tVals);
log.push(`♻️ Repaired header layout for ${name}`);
} else {
log.push(`✅ ${name} verified`);
}
}

const audit = ss.getSheetByName("Template_Audit") || ss.insertSheet("Template_Audit");
audit.clear();
audit.getRange(1, 1, log.length, 1).setValues(log.map(l => [l]));
SpreadsheetApp.getUi().alert("🧩 Verification complete — check Template_Audit for results.");
}
