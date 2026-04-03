/**
* Creates base templates for hitter and pitcher cards
* and a command to clone them for new players.
*/

function buildPlayerTemplates() {
const ss = SpreadsheetApp.getActiveSpreadsheet();

// HITTER TEMPLATE
let hit = ss.getSheetByName("Hitter_Template");
if (!hit) hit = ss.insertSheet("Hitter_Template");
hit.clear();

hit.getRange("A1").setValue("PlayerID");
hit.getRange("A2").setValue("PlayerName");
hit.getRange("A3").setValue("Position");
hit.getRange("A4").setValue("Team");
hit.getRange("A5").setValue("Handedness");
hit.getRange("A6").setValue("BirthYear");

hit.getRange("A8:L8").setValues([
["Season","Games","AB","H","2B","3B","HR","RBI","AVG","OBP","SLG","OPS"]
]);

// PITCHER TEMPLATE
let pit = ss.getSheetByName("Pitcher_Template");
if (!pit) pit = ss.insertSheet("Pitcher_Template");
pit.clear();

pit.getRange("A1").setValue("PlayerID");
pit.getRange("A2").setValue("PlayerName");
pit.getRange("A3").setValue("Role");
pit.getRange("A4").setValue("Team");
pit.getRange("A5").setValue("ThrowsHand");
pit.getRange("A6").setValue("BirthYear");

pit.getRange("A8:O8").setValues([
["Season","W","L","ERA","G","GS","CG","SV","IP","H","R","ER","BB","SO","WHIP"]
]);

hit.setTabColor("orange");
pit.setTabColor("lightblue");

SpreadsheetApp.getUi().alert("✅ Templates built and color-coded!");
}

/**
* Clone a new player card from template
* Example: createNewPlayerCard('Benji Dillon', 'pitcher')
*/
function createNewPlayerCard(name, type) {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const template = ss.getSheetByName(type === 'pitcher' ? "Pitcher_Template" : "Hitter_Template");
if (!template) throw new Error("Template not found: " + type);
const newSheet = template.copyTo(ss).setName(name);
newSheet.activate();
SpreadsheetApp.getUi().alert("✅ Created new " + type + " card: " + name);
}

