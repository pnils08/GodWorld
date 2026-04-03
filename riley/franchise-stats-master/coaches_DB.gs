function rebuildCoachesDB() {
const FILE_ID = '1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss';
const COACHES_TAB = 'Coaches_DB';
const ss = SpreadsheetApp.openById(FILE_ID);
const coaches = ss.getSheetByName(COACHES_TAB) || ss.insertSheet(COACHES_TAB);
const schedule = ss.getSheetByName('Schedule_DB');

coaches.clear();

const headers = [
'StaffID','Name','Role','SeasonID','GameID',
'Record','Wins','Losses','Notes','LastUpdated'
];
coaches.appendRow(headers);

const now = new Date();
const scheduleVals = schedule.getDataRange().getValues();

// Example coaching staff to populate; these can later be tied to real records
const staff = [
{id: 'Kinder2035MGR', name: 'Mike Kinder', role: 'Manager', from: 2035, to: 2039},
{id: 'Harlan2030MGR', name: 'Ray Harlan', role: 'Manager', from: 2030, to: 2034},
{id: 'Briggs2030PC', name: 'Tony Briggs', role: 'Pitching Coach', from: 2030, to: 2039},
{id: 'Vega2030HC', name: 'Luis Vega', role: 'Hitting Coach', from: 2030, to: 2039},
];

// Loop through schedule to assign coaches to games based on season range
for (let i = 1; i < scheduleVals.length; i++) {
const [gid, season] = scheduleVals[i];
const activeStaff = staff.filter(c => season >= c.from && season <= c.to);
activeStaff.forEach(c => {
const wins = Math.floor(Math.random() * 100);
const losses = 162 - wins;
const rec = `${wins}-${losses}`;
coaches.appendRow([
c.id, c.name, c.role, season, gid, rec, wins, losses, '', now
]);
});
}

return { message: 'Coaches_DB rebuilt with randomized records.' };
}
