function initLedgers() {
const registryId = '1fpFDikkw5GgPpWb50289340GTXI_WVbcsZZU6FFOwEc'; // The Wild
const registry = SpreadsheetApp.openById(registryId).getSheetByName('Registry');
const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');

const ledgers = [
{ name: 'Population_Ledger', description: 'Tracks civic and behavioral data flow' },
{ name: 'Universe_Ledger', description: 'Records narrative and system continuity states' }
];

ledgers.forEach(ledger => {
try {
const newLedger = SpreadsheetApp.create(ledger.name);
const ledgerId = newLedger.getId();

registry.appendRow([
timestamp,
`Ledger Created — ${ledger.name}`,
ledgerId,
100,
0,
Session.getActiveUser().getEmail()
]);

Logger.log(`✅ ${ledger.name} initialized: ${ledgerId}`);
} catch (err) {
Logger.log(`❌ Failed to initialize ${ledger.name}: ${err}`);
}
});

Logger.log('✨ Ledger initialization complete.');
}
