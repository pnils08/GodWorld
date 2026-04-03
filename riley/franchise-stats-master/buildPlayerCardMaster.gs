/**
* Build or rebuild the Player_Card_Master tab.
* Creates standard headers and starter rows for Benji Dillon and Isley Kelley.
*/

function buildPlayerCardMaster() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const name = 'Player_Card_Master';
let sh = ss.getSheetByName(name);
if (!sh) sh = ss.insertSheet(name); else sh.clear();

// Headers
const headers = [
'PlayerName','Position','Birthplace','Height','Weight','Bats','Throws',
'DraftYear','DraftRound','Games','AB','H','HR','RBI','AVG','SLG','OBP','WAR','Awards','Notes'
];
sh.appendRow(headers);

// Benji Dillon sample data
const benji = [
'Benji Dillon','LHP','Texas, USA','6 ft 3 in','205 lb','L','L',
'2024','1','412','–','–','–','–','–','–','–','34.2',
'Cy Young (2031), 6× Champion',
'The Golden Arm; cornerstone of Oakland dynasty'
];

// Isley Kelley sample data
const isley = [
'Isley Kelley','SS/2B/3B','Mississippi, USA','6 ft 0 in','190 lb','R','R',
'2026','2','1298','–','–','–','–','–','–','–','–','29.7',
'MVP (2034), 4× Champion',
'The Mississippi Machine; whiskey father roots'
];

sh.appendRow(benji);
sh.appendRow(isley);

sh.autoResizeColumns(1, headers.length);
return '✅ Player_Card_Master tab created and seeded.';
}
