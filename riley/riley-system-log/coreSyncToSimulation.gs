function coreSyncToSimulation() {

const FEEDS = [
{ id: '1MVCJLpU1qs9IAJN6vyzMrzHkvRNl33pYwup_CDd-nGA', name: 'Bay Tribune' },
{ id: '1GuAoDvoEVfaGRB17RdnQYAFY7id47yB5rHOh3dj_DKA', name: 'Slayer Syndicate' }
];

const SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';
const SIM_LEDGER_SHEET = 'Simulation_Ledger';

const sim = SpreadsheetApp.openById(SIM_SSID);
const ledger = sim.getSheetByName(SIM_LEDGER_SHEET);

const ledgerValues = ledger.getDataRange().getValues();
const ledgerHeader = ledgerValues[0];

const firstCol = ledgerHeader.indexOf('First');
const middleCol = ledgerHeader.indexOf('Middle');
const lastCol = ledgerHeader.indexOf('Last');
const statusCol = ledgerHeader.indexOf('Status');

function ledgerHas(fullName) {
for (let i = 1; i < ledgerValues.length; i++) {
const row = ledgerValues[i];
const existing = [row[firstCol], row[middleCol], row[lastCol]].filter(Boolean).join(' ');
if (existing === fullName) return true;
}
return false;
}

function extractNames(text) {
if (!text) return [];
const ignore = ['The','Night','Old','New','Ghost','Return','Future','Legacy','Back','Fade'];
const words = text.split(/\s+/);
const found = [];
for (let i = 0; i < words.length - 1; i++) {
const w1 = words[i];
const w2 = words[i+1];
if (
/^[A-Z][a-z]+$/.test(w1) &&
/^[A-Z][a-z]+$/.test(w2) &&
!ignore.includes(w1) &&
!ignore.includes(w2)
) {
found.push(w1 + ' ' + w2);
}
}
return found;
}

FEEDS.forEach(feed => {

const ss = SpreadsheetApp.openById(feed.id);
const sheet = ss.getSheetByName('Feed');
const values = sheet.getDataRange().getValues();
const header = values[0];

const idxStatus = header.indexOf('Status');
const idxTags = header.indexOf('Tags');
const idxLogged = header.indexOf('Logged');
const idxLoggedAt = header.indexOf('LoggedAt');
const idxTitle = header.indexOf('Title');
const idxNameUsed = header.indexOf('Names Used');

if (idxNameUsed === -1) throw new Error("Names Used column missing.");

for (let r = 1; r < values.length; r++) {

const row = values[r];
const status = row[idxStatus];
const logged = row[idxLogged];

if (status !== 'Published') continue;
if (logged === 'TRUE') continue;

const rawName = row[idxNameUsed];
const namesUsed = (rawName === null || rawName === undefined)
? ''
: rawName.toString().trim();

const title = row[idxTitle] || '';
const tags = row[idxTags] || '';

let names = [];

if (namesUsed !== '') {
names = namesUsed.split(',').map(s => s.trim());
} else {
names = names.concat(extractNames(title));
names = names.concat(extractNames(tags));
}

const unique = [...new Set(names)];

unique.forEach(n => {
if (!n) return;
if (ledgerHas(n)) return;

const [first, last] = n.split(' ');
ledger.appendRow([
'',
first || '',
'',
last || '',
'',
'',
'',
'',
'',
'',
'Media',
'',
'',
'POP-ID-PENDING',
new Date(),
''
]);
});

sheet.getRange(r + 1, idxLogged + 1).setValue('TRUE');
sheet.getRange(r + 1, idxLoggedAt + 1).setValue(new Date());
}

});

}
