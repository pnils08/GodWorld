function initCivicLedgers() {
// Connect to The Wild Registry
const registryId = '1fpFDikkw5GgPpWb5O28934QGTXl_WVBcsZZU6FFOwEc'; // The Wild
const registrySheet = SpreadsheetApp.openById(registryId).getSheetByName('Registry');
const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');
const user = Session.getActiveUser().getEmail();

// Find the most recent Population_Ledger entry in the Registry
const data = registrySheet.getDataRange().getValues();
const populationRow = data.reverse().find(r => String(r[1]).includes('Population_Ledger'));

if (!populationRow) {
Logger.log('❌ No Population_Ledger found in registry — cannot create civic ledgers.');
return;
}

const populationId = populationRow[3];
const parent = SpreadsheetApp.openById(populationId);

// Define civic domains
const civicDomains = [
{ name: 'Commerce_Civic', desc: 'Economic and trade flow tracking' },
{ name: 'Health_Civic', desc: 'Public health and wellness reporting' },
{ name: 'Faith_Civic', desc: 'Community belief and moral culture tracking' },
{ name: 'Governance_Civic', desc: 'Administrative and policy process logs' },
{ name: 'Education_Civic', desc: 'Learning, academia, and outreach states' }
];

// Create and log each civic ledger
civicDomains.forEach(domain => {
try {
const civicSheet = SpreadsheetApp.create(domain.name);
const civicId = civicSheet.getId();

registrySheet.appendRow([
timestamp,
`Civic Ledger Created — ${domain.name}`,
domain.desc,
civicId,
user
]);

Logger.log(`✅ ${domain.name} created successfully. ID: ${civicId}`);
} catch (err) {
Logger.log(`❌ Failed to create ${domain.name}: ${err}`);
}
});

Logger.log('✨ All Civic Ledgers initialized and logged.');
}
