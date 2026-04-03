function rebuildScheduleDB() {
const FILE_ID = '1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss';
const SCHEDULE_TAB = 'Schedule_DB';
const ss = SpreadsheetApp.openById(FILE_ID);
const schedule = ss.getSheetByName(SCHEDULE_TAB) || ss.insertSheet(SCHEDULE_TAB);

schedule.clear();
const headers = [
'GameID','SeasonID','Date','Opponent','HomeAway',
'Result','Score','Attendance','Series','Notes','LastUpdated'
];
schedule.appendRow(headers);

const now = new Date();

// Example generator for 162-game season
// You can later swap this for actual sim exports or CSV imports.
const season = 2039;
const teams = ['SEA','HOU','TEX','LAA']; // example opponents
let gameNum = 1;
for (let month = 4; month <= 9; month++) {
for (let day = 1; day <= 30; day++) {
if (gameNum > 162) break;
const opp = teams[Math.floor(Math.random() * teams.length)];
const home = Math.random() < 0.5 ? 'H' : 'A';
const res = Math.random() < 0.5 ? 'W' : 'L';
const score = res === 'W'
? `${Math.floor(Math.random()*5+3)}-${Math.floor(Math.random()*4+1)}`
: `${Math.floor(Math.random()*4+1)}-${Math.floor(Math.random()*5+3)}`;
const att = Math.floor(Math.random()*15000 + 25000);
const gid = `OAK${season}G${String(gameNum).padStart(3,'0')}`;

schedule.appendRow([
gid, season, new Date(`20${season}-${month}-${day}`),
opp, home, res, score, att, '', '', now
]);
gameNum++;
}
}

return { message: `Schedule_DB rebuilt for ${season}. ${gameNum-1} games generated.` };
}
