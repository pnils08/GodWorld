function initLedgers() {
const wildId = '1fpFDikkw5GgPpWb5O28934QGTXl_WVBcsZZU6FFOwEc'; // The Wild
const wild = SpreadsheetApp.openById(wildId);
const registrySheet = wild.getSheetByName('Registry');
const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');
const user = Session.getActiveUser().getEmail();

// Define the ledgers to create
const ledgers = [
{ name: 'Population_Ledger', description: 'Tracks civic and behavioral data flow' },
{ name: 'Universe_Ledger', description: 'Records narrative and system continuity states' }
];

// Create and log each ledger
ledgers.forEach(ledger => {
try {
const newLedger = SpreadsheetApp.create(ledger.name);
const ledgerId = newLedger.getId();

// Log to The Wild
registrySheet.appendRow([
timestamp,
`Ledger Created — ${ledger.name}`,
ledger.description,
ledgerId,
user
]);

Logger.log(`✅ ${ledger.name} initialized successfully. ID: ${ledgerId}`);
} catch (error) {
Logger.log(`❌ Failed to initialize ${ledger.name}: ${error}`);
}
});

Logger.log('✨ Ledger initialization complete.');
}