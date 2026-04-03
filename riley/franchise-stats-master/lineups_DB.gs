function rebuildLineupsDB() {
const FILE_ID = '1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss';
const LINEUPS_TAB = 'Lineups_DB';
const ss = SpreadsheetApp.openById(FILE_ID);
const lineups = ss.getSheetByName(LINEUPS_TAB) || ss.insertSheet(LINEUPS_TAB);
const schedule = ss.getSheetByName('Schedule_DB');
const history = ss.getSheetByName('Franchise_History_DB');

lineups.clear();

const headers = [
'GameID','Date','SeasonID','PlayerID','PlayerName',
'BatOrder','Position','Result','RBI','Hits','Runs','Notes','LastUpdated'
];
lineups.appendRow(headers);

const now = new Date();
const scheduleVals = schedule.getDataRange().getValues();
const historyVals = history.getDataRange().getValues();

// Build a quick roster pool from history
const roster = historyVals.slice(1).map(r => ({
id: r[0],
name: r[1],
season: r[2]
}));

// Loop over schedule to create 9-man lineup entries per game
for (let i = 1; i < scheduleVals.length; i++) {
const [gid, season, date, , , result] = scheduleVals[i];
const lineupPlayers = roster.filter(p => p.season === season);
const sample = shuffle(lineupPlayers).slice(0, 9);

for (let spot = 0; spot < sample.length; spot++) {
const player = sample[spot];
lineups.appendRow([
gid, date, season, player.id, player.name,
spot + 1, getRandomPosition(spot), result,
Math.floor(Math.random() * 3),
Math.floor(Math.random() * 4),
Math.floor(Math.random() * 2),
'', now
]);
}
}

return { message: 'Lineups_DB rebuilt with randomized test lineups.' };
}

function shuffle(array) {
return array.sort(() => Math.random() - 0.5);
}

function getRandomPosition(batOrder) {
const positions = ['CF','LF','RF','3B','SS','2B','1B','C','DH'];
return positions[batOrder] || '';
}
