/**
* Builds or refreshes MLB / Top_Prospects / AAA / AA / A roster tabs
* from the Franchise_Roster_Index data.
*/
function buildRosters() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const index = ss.getSheetByName("Franchise_Roster_Index");
if (!index) {
SpreadsheetApp.getUi().alert("❌ No Franchise_Roster_Index tab found.");
return;
}

const data = index.getRange(2, 1, index.getLastRow() - 1, 4).getValues();
const levels = ["mlb", "Top_Prospects", "AAA", "AA", "A"];

// Ensure roster sheets exist
levels.forEach(level => {
const sheetName = level.toUpperCase() + "_Roster";
if (!ss.getSheetByName(sheetName)) {
ss.insertSheet(sheetName).appendRow(["PlayerName", "Position", "Level", "Lore", "Notes"]);
}
});

// Clear existing rosters
levels.forEach(level => {
const sheet = ss.getSheetByName(level.toUpperCase() + "_Roster");
const lastRow = sheet.getLastRow();
if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
});

// Distribute players
data.forEach(row => {
const [name, type, league, lore] = row;
if (!name) return;

let targetLevel = league.toLowerCase();
if (lore && lore.toLowerCase().includes("top prospect")) targetLevel = "Top_Prospects";

if (levels.includes(targetLevel)) {
const target = ss.getSheetByName(targetLevel.toUpperCase() + "_Roster");
target.appendRow([name, type.toUpperCase(), league, lore, ""]);
}
});

logActivity("Build Rosters", levels.map(l => l + "_Roster"));
SpreadsheetApp.getUi().alert("✅ Rosters refreshed with Top Prospects included.");
}
