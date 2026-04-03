function onEdit(e) {
if (!e) return;
const sheet = e.source.getActiveSheet();
const row = e.range.getRow();
const col = e.range.getColumn();

// 1️⃣ Make sure this only runs on Transactions_DB
if (sheet.getName() !== 'Transactions_DB') return;

// 2️⃣ Identify columns
const teamToCol = 7; // G column (TeamTo)
const playerIdCol = 4; // D column (PlayerID)
const playerNameCol = 5; // E column (PlayerName)

// 3️⃣ Only trigger when TeamTo changes
if (col !== teamToCol) return;

const playerId = sheet.getRange(row, playerIdCol).getValue();
const playerName = sheet.getRange(row, playerNameCol).getValue();
const teamTo = e.value;

// 4️⃣ Link to Roster_DB
const ss = SpreadsheetApp.getActiveSpreadsheet();
const roster = ss.getSheetByName('Roster_DB');
const data = roster.getDataRange().getValues();

// 5️⃣ Try to find this player
let found = false;
for (let i = 1; i < data.length; i++) {
if (data[i][0] === playerId || data[i][1] === playerName) {
found = true;
roster.getRange(i + 1, 3).setValue(teamTo); // update team
roster.getRange(i + 1, 4).setValue(teamTo === 'OAK' ? 'Active' : 'Inactive');
roster.getRange(i + 1, 5).setValue(new Date()); // timestamp
break;
}
}

// 6️⃣ If not found and TeamTo = OAK, add new row
if (!found && teamTo === 'OAK') {
roster.appendRow([playerId, playerName, teamTo, 'Active', new Date()]);
}
}
