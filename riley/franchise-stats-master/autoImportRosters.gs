/**
* Reads a staging sheet of imported players and
* automatically disperses them into the correct roster tabs.
*/
function autoDisperseRosters() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const stage = ss.getSheetByName("Import_Staging");
if (!stage) {
SpreadsheetApp.getUi().alert("❌ Add an 'Import_Staging' sheet with pasted data first.");
return;
}

const data = stage.getDataRange().getValues();
// expected header: PlayerName | Position | Level | Status | Lore
const headers = data[0];
const levelIndex = headers.indexOf("Level");
if (levelIndex === -1) {
SpreadsheetApp.getUi().alert("❌ Missing 'Level' column in Import_Staging.");
return;
}

// ensure all roster sheets exist
const levels = ["MLB","Top_Prospects","AAA","AA","A"];
levels.forEach(level=>{
const sheetName = level.toUpperCase()+"_Roster";
if(!ss.getSheetByName(sheetName)){
ss.insertSheet(sheetName)
.appendRow(["PlayerName","Position","Level","Lore","Notes"]);
}
});

// clear existing rosters before redistributing
levels.forEach(level=>{
const sheet = ss.getSheetByName(level.toUpperCase()+"_Roster");
const lr = sheet.getLastRow();
if(lr>1) sheet.getRange(2,1,lr-1,5).clearContent();
});

// write players into their target roster tabs
for (let i = 1; i < data.length; i++) {
const row = data[i];
const level = String(row[levelIndex] || "").trim();
const targetName = levels.find(l => level.toLowerCase().includes(l.toLowerCase()));
if (!targetName) continue;
const target = ss.getSheetByName(targetName.toUpperCase()+"_Roster");
target.appendRow(row);
}

buildRosterDashboard(); // refresh summary
logActivity("Auto Disperse Rosters", levels.map(l => l+"_Roster"));
SpreadsheetApp.getUi().alert("✅ Rosters imported and dispersed into all level tabs.");
}

