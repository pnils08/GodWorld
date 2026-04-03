function coreSyncToIntake() {

const FEEDS = [
{ id: '1MVCJLpU1qs9IAJN6vyzMrzHkvRNl33pYwup_CDd-nGA' },
{ id: '1GuAoDvoEVfaGRB17RdnQYAFY7id47yB5rHOh3dj_DKA' }
];

const SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';
const INTAKE_SHEET = 'Intake';

const sim = SpreadsheetApp.openById(SIM_SSID);
const intake = sim.getSheetByName(INTAKE_SHEET);

FEEDS.forEach(feed => {

const ss = SpreadsheetApp.openById(feed.id);
const sheet = ss.getSheetByName('Feed');
const values = sheet.getDataRange().getValues();
const header = values[0];

const idxStatus = header.indexOf('Status');
const idxTags = header.indexOf('Tags');
const idxLogged = header.indexOf('Logged');
const idxLoggedAt = header.indexOf('LoggedAt');
const idxNameUsed = header.indexOf('Names Used');

for (let r = 1; r < values.length; r++) {
const row = values[r];

if (row[idxStatus] !== 'Published') continue;
if (row[idxLogged] === 'TRUE') continue;

const rawNameData = row[idxNameUsed];
const namesUsed = (rawNameData === null || rawNameData === undefined)
? ''
: rawNameData.toString().trim();

if (namesUsed !== '') {

const names = namesUsed.split(',').map(s => s.trim());

names.forEach(name => {
const parts = name.split(' ');
const first = parts[0] || '';
const last = parts[1] || '';

intake.appendRow([
first, // First
'', // Middle
last, // Last
'', // Tier
'', // RoleType
'', // Universe (y/n)
'', // Civic (y/n)
'', // Media (y/n)
row[idxTags] || '', // Tags
'Media', // OriginVault
'', // Office_Held
'', // Lineage
'POP-ID-PENDING', // Status
new Date(), // Created at
'' // Intake Code
]);
});
}

sheet.getRange(r + 1, idxLogged + 1).setValue('TRUE');
sheet.getRange(r + 1, idxLoggedAt + 1).setValue(new Date());
}

});

}
