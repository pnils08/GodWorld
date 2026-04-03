function canonizeInitialBatch() {
const POP_SHEET_ID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo'; // Population Ledger
const SHEET_NAME = 'Issued_IDs';

const ss = SpreadsheetApp.openById(POP_SHEET_ID);
const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

// Ensure proper header order (only creates once)
const headers = ['POPID', 'UNI', 'MED', 'CIV', 'Tier', '#', 'Notes', 'Timestamp'];
if (sheet.getLastRow() === 0) sheet.appendRow(headers);

// Entities and their tiers
const entities = [
{ name: 'Vinnie Keane', domains: ['POP','UNI'], tier: 'A' },
{ name: 'Benji Dillon', domains: ['POP','UNI'], tier: 'A' },
{ name: 'Isley Kelley', domains: ['POP','UNI'], tier: 'A' },
{ name: 'Darrin Davis', domains: ['POP','UNI'], tier: 'A' },
{ name: 'Mark Aitken', domains: ['POP','UNI'], tier: 'A' },
{ name: 'Anthony', domains: ['POP','MED'], tier: 'B' },
{ name: 'P Slayer', domains: ['POP','MED'], tier: 'B' },
{ name: 'Hal Richmond', domains: ['POP','MED'], tier: 'B' },
{ name: 'Mags Corliss', domains: ['POP','CIV','MED'], tier: 'S' },
{ name: 'Riley', domains: ['POP','CIV'], tier: 'S' }
];

const issuedData = [];

entities.forEach((e, i) => {
const ids = { POP:'', UNI:'', MED:'', CIV:'' };
e.domains.forEach(domain => { ids[domain] = issueNewID(domain); });

const entry = [
ids.POP || '', // POPID
ids.UNI || '', // UNI
ids.MED || '', // MED
ids.CIV || '', // CIV
e.tier, // Tier
i + 1, // #
e.name, // Notes (name)
new Date() // Timestamp
];
issuedData.push(entry);
});

sheet.getRange(sheet.getLastRow() + 1, 1, issuedData.length, issuedData[0].length)
.setValues(issuedData);

Logger.log(`✅ Canonization complete: ${issuedData.length} citizens canonized.`);
}
