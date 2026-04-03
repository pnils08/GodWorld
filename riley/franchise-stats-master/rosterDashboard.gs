/**
* Builds a simple roster dashboard showing total players per level
* and the time the rosters were last updated.
*/
function buildRosterDashboard() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const dash = ss.getSheetByName("Roster_Dashboard") || ss.insertSheet("Roster_Dashboard");
dash.clear();

// titles
dash.appendRow(["Roster Level","Player Count","Last Updated"]);
dash.getRange("A1:C1").setFontWeight("bold");

const levels = ["MLB_Roster","TOP_PROSPECTS_Roster","AAA_Roster","AA_Roster","A_Roster"];
const colors = {
MLB_Roster: "#99CCFF",
TOP_PROSPECTS_Roster: "#FFCC66",
AAA_Roster: "#CCFFCC",
AA_Roster: "#FFCCCC",
A_Roster: "#E6E6E6"
};

const now = new Date();
const rows = [];

levels.forEach(level=>{
const sheet = ss.getSheetByName(level);
if (!sheet) return;
const count = Math.max(0, sheet.getLastRow() - 1);
rows.push([level.replace("_Roster",""), count, now]);
});

dash.getRange(2,1,rows.length,3).setValues(rows);

// color rows
for (let i=0; i<rows.length; i++){
const level = rows[i][0].toUpperCase()+"_Roster";
dash.getRange(i+2,1,1,3).setBackground(colors[level] || "#FFFFFF");
}

dash.autoResizeColumns(1,3);
logActivity("Build Roster Dashboard", levels);
}
