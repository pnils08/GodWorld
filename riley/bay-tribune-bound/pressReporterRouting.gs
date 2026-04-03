/**
* Auto-create Press_Reporter_Index sheet with full reporter roster.
* Also provides reporter routing for prompts.
*/

function pressEnsureReporterIndex_() {
const ss = SpreadsheetApp.getActive();
let sheet = ss.getSheetByName("Press_Reporter_Index");

// Create if missing
if (!sheet) {
sheet = ss.insertSheet("Press_Reporter_Index");
} else {
// wipe existing to avoid duplicates / legacy junk
sheet.clear();
}

const rows = [
["Beat","Reporter"],
["City","Anthony"],
["City","Mags Corliss"],
["City","Hal Richmond"],
["Pulse","P Slayer"],
["Pulse","Lena Carrow"],
["Pulse","Dana Reeve"],
["Civic","Carmen Delaine"],
["Civic","Elliot Graye"],
["Community","Marla Keen"],
["Sports","Kris Bubik"],
["Sports","Dalton Rushing"],
["Sports","Carlos Chávez"],
["Sports","Lorenzo Jordan"],
["Sports","Tobias Jordan"],
["Photo","DeShawn Hartley"],
["Photo","Brianna Lee"]
];

sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

/**
* Choose a reporter based on storyType → beat mapping.
*/
function pressPickReporterForStory_(storyType) {
pressEnsureReporterIndex_(); // guarantee sheet exists

const ss = SpreadsheetApp.getActive();
const sheet = ss.getSheetByName("Press_Reporter_Index");
const data = sheet.getDataRange().getValues();

const header = data[0];
const beatIdx = header.indexOf("Beat");
const repIdx = header.indexOf("Reporter");

let beat = "City";

switch (storyType) {
case "Sports":
case "Game Recap":
case "Player Feature":
beat = "Sports";
break;

case "Civic Issues":
case "Policy":
case "Election":
beat = "Civic";
break;

case "Community":
case "Local Human Interest":
beat = "Community";
break;

case "Photo Essay":
beat = "Photo";
break;

case "Pulse":
case "Street Reaction":
case "Public Mood":
beat = "Pulse";
break;

default:
beat = "City";
break;
}

const matches = [];
for (let r = 1; r < data.length; r++) {
if (data[r][beatIdx] === beat) {
matches.push(data[r][repIdx]);
}
}

if (matches.length === 0) return "Anthony";
return matches[Math.floor(Math.random() * matches.length)];
}
