function rebuildRotationsDB() {
const FILE_ID = '1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss';
const ROTATIONS_TAB = 'Rotations_DB';
const ss = SpreadsheetApp.openById(FILE_ID);
const rotations = ss.getSheetByName(ROTATIONS_TAB) || ss.insertSheet(ROTATIONS_TAB);
const schedule = ss.getSheetByName('Schedule_DB');
const history = ss.getSheetByName('Franchise_History_DB');

rotations.clear();

const headers = [
'GameID','Date','SeasonID','PitcherID','PitcherName','Role',
'IP','H','R','ER','BB','SO','HR','W','L','SV','ERA','WHIP','Notes','LastUpdated'
];
rotations.appendRow(headers);

const now = new Date();
const scheduleVals = schedule.getDataRange().getValues();
const historyVals = history.getDataRange().getValues();

// Build a list of pitchers (rows that have ERA/WHIP fields)
const pitchers = historyVals.slice(1).filter(r => r.includes('ERA') || r.includes('W')).map(r => ({
id: r[0],
name: r[1],
season: r[2]
}));

for (let i = 1; i < scheduleVals.length; i++) {
const [gid, season, date] = scheduleVals[i];
const eligible = pitchers.filter(p => p.season === season);
if (!eligible.length) continue;

// Choose 1 starter + 2 random relievers
const shuffled = shuffle(eligible);
const starter = shuffled[0];
const relievers = shuffled.slice(1, 3);

// Starter row
rotations.appendRow([
gid, date, season, starter.id, starter.name, 'SP',
6 + Math.random() * 3, // IP
Math.floor(Math.random() * 8), // H
Math.floor(Math.random() * 5), // R
Math.floor(Math.random() * 4), // ER
Math.floor(Math.random() * 3), // BB
Math.floor(Math.random() * 8), // SO
Math.floor(Math.random() * 2), // HR
Math.random() < 0.5 ? 1 : '', // W
Math.random() < 0.5 ? 1 : '', // L
'', // SV
(Math.random() * 3 + 2.5).toFixed(2), // ERA
(Math.random() * 1.2 + 1).toFixed(2), // WHIP
'', now
]);

// Relievers
relievers.forEach(rp => {
rotations.appendRow([
gid, date, season, rp.id, rp.name, 'RP',
1 + Math.random() * 2, Math.floor(Math.random() * 3),
Math.floor(Math.random() * 2), Math.floor(Math.random() * 2),
Math.floor(Math.random() * 2), Math.floor(Math.random() * 3),
0, '', '', Math.random() < 0.3 ? 1 : '',
(Math.random() * 3 + 2.5).toFixed(2),
(Math.random() * 1.2 + 1).toFixed(2),
'', now
]);
});
}

return { message: 'Rotations_DB rebuilt with randomized test rotations.' };
}

function shuffle(array) {
return array.sort(() => Math.random() - 0.5);
}
