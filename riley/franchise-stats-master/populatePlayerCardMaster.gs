/**
* Auto-build Player_Card_Master with only valid player tabs.
* Filters out system and database sheets automatically.
*/
function populatePlayerCardMaster() {
const PLAYER_BOOK_ID = '1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss';
const MASTER_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

const playerBook = SpreadsheetApp.openById(PLAYER_BOOK_ID);
const master = SpreadsheetApp.openById(MASTER_ID)
.getSheetByName('Player_Card_Master')
|| SpreadsheetApp.openById(MASTER_ID)
.insertSheet('Player_Card_Master');

// clear and set headers
master.clear();
master.appendRow(['PlayerName','Position','Season','Games','AB','H','HR','RBI','AVG']);

// find likely player tabs only
const allSheets = playerBook.getSheets();
const playerTabs = allSheets
.map(s => s.getName())
.filter(name =>
!name.match(/^(Master|Summary|Config|Archive|Transactions|Feeds|Coaches|Manager|Rotation|Pitching|Injury)/i)
);

// copy last-row stats from each player sheet
playerTabs.forEach(tabName => {
try {
const sheet = playerBook.getSheetByName(tabName);
const data = sheet.getDataRange().getValues();
if (data.length < 2) return; // skip empty
const lastRow = data[data.length - 1];
master.appendRow(lastRow);
Logger.log(`✅ Added ${tabName}`);
} catch (err) {
Logger.log(`⚠️ Skipped ${tabName}: ${err}`);
}
});

master.autoResizeColumns(1, master.getLastColumn());
Logger.log('🏁 Player_Card_Master populated with valid player data only.');
}
