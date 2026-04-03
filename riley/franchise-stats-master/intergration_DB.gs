function buildGameSummaryView() {
const ss = SpreadsheetApp.openById('1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss');
const output = ss.getSheetByName('Game_Summary_View') || ss.insertSheet('Game_Summary_View');
output.clear();
output.appendRow([
'GameID','Date','SeasonID','Opponent','Result','Pitcher','Role','IP','SO','W/L','Manager','Notes','LastUpdated'
]);

const schedule = ss.getSheetByName('Schedule_DB').getDataRange().getValues();
const rotations = ss.getSheetByName('Rotations_DB').getDataRange().getValues();
const coaches = ss.getSheetByName('Coaches_DB').getDataRange().getValues();
const now = new Date();

for (let i = 1; i < schedule.length; i++) {
const [gid, season, date, opp, , result] = schedule[i];
const starter = rotations.find(r => r[0] === gid && r[5] === 'SP');
const manager = coaches.find(c => c[3] === season && c[2] === 'Manager');
output.appendRow([
gid, date, season, opp, result,
starter ? starter[4] : '', starter ? starter[5] : '',
starter ? starter[6] : '', starter ? starter[11] : '',
starter && starter[13] ? 'W' : (starter && starter[14] ? 'L' : ''),
manager ? manager[1] : '', '', now
]);
}
return { message: 'Game_Summary_View built successfully.' };
}
