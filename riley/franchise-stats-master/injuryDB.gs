/**
* Injury / IL tracking module for Franchise_Stats_Master
* Works with Transactions_DB and Roster_DB
* Version 1.0
*/

function onEdit(e) {
if (!e) return;
const sheet = e.source.getActiveSheet();
if (sheet.getName() !== 'Injury_DB') return;

const row = e.range.getRow();
const col = e.range.getColumn();

const playerIdCol = 2; // PlayerID
const playerNameCol = 3; // PlayerName
const statusCol = 8; // Status

if (col < playerIdCol) return;

const ss = SpreadsheetApp.getActiveSpreadsheet();
const roster = ss.getSheetByName('Roster_DB');
const trans = ss.getSheetByName('Transactions_DB');

const playerId = sheet.getRange(row, playerIdCol).getValue();
const playerName = sheet.getRange(row, playerNameCol).getValue();
const status = sheet.getRange(row, statusCol).getValue();

// when marked Active again, update roster
if (status === 'Activated') {
const rosterData = roster.getDataRange().getValues();
for (let i = 1; i < rosterData.length; i++) {
const [id, name] = rosterData[i];
if (id === playerId || name === playerName) {
roster.getRange(i + 1, 4).setValue('Active');
roster.getRange(i + 1, 5).setValue(new Date());
break;
}
}
// optional: auto add a transaction line
trans.appendRow([
'', new Date(), new Date().getFullYear(), playerId, playerName,
'OAK', 'OAK', 'IL_ACTIVATION', `${playerName} activated from IL`, '', new Date()
]);
}
}
