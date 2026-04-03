/**
* Auto-fills TeamFrom and TeamTo when a transaction is entered
* Requires: A sheet named "Roster_DB" with columns PlayerID | PlayerName | CurrentTeam
*/

function onEdit(e) {
const sheet = e.source.getActiveSheet();
if (sheet.getName() !== 'Transactions_DB') return;

const row = e.range.getRow();
const col = e.range.getColumn();

// Only trigger when editing PlayerID or PlayerName
if (col === 4 || col === 5) {
const playerId = sheet.getRange(row, 4).getValue();
const playerName = sheet.getRange(row, 5).getValue();

const roster = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Roster_DB');
const rosterData = roster.getDataRange().getValues();

let teamFrom = '';
for (let i = 1; i < rosterData.length; i++) {
const [id, name, team] = rosterData[i];
if (id === playerId || name === playerName) {
teamFrom = team;
break;
}
}

// Fill TeamFrom if blank
if (teamFrom && !sheet.getRange(row, 6).getValue()) {
sheet.getRange(row, 6).setValue(teamFrom);
}

// Leave TeamTo for manual update (since destination varies)
}
}
