function rebuildFranchiseHistoryDB() {
const FILE_ID = '1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss';
const HISTORY_TAB = 'Franchise_History_DB';
const ss = SpreadsheetApp.openById(FILE_ID);
const history = ss.getSheetByName(HISTORY_TAB) || ss.insertSheet(HISTORY_TAB);

history.clear();

// unified header for both hitters & pitchers
const headers = [
'PlayerID','PlayerName','SeasonID','Team','Role',
// hitting
'G','PA','AB','R','H','2B','3B','HR','RBI',
'BB','SO','SB','CS','AVG','OBP','SLG','OPS',
// pitching
'G_p','GS','W','L','SV','IP','H_allowed','R_allowed',
'ER','HR_allowed','BB_allowed','SO_p','ERA','WHIP',
// shared
'WAR','Awards','LastUpdated'
];
history.appendRow(headers);

const now = new Date();

ss.getSheets().forEach(sh => {
const name = sh.getName();
if (['Master','Franchise_History_DB'].includes(name)) return;

const values = sh.getDataRange().getValues();
if (values.length <= 1) return;
const headerRow = values[0];
const idx = {};
headerRow.forEach((h,i)=> idx[String(h).trim()] = i);

for (let r = 1; r < values.length; r++) {
const row = values[r];
const out = headers.map(h => {
if (h === 'PlayerID') return `${name}_${r}`;
if (h === 'PlayerName') return name;
if (h === 'LastUpdated') return now;
const col = idx[h];
return (col !== undefined) ? row[col] : '';
});
history.appendRow(out);
}
});

return { message: 'Franchise History DB rebuilt for hitters and pitchers.' };
}
