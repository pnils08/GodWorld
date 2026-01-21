//
function formatSimulationLedger() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName('Simulation_Ledger');

// Clear existing header row and set new headers
sheet.getRange('A1:J1').clearContent();
sheet.appendRow([
'POPID',
'Name',
'Tier',
'RoleType',
'LinkedIDs',
'Tags',
'OriginVault',
'Status',
'CreatedAt',
'IntakeCode'
]);

// Apply formatting
const header = sheet.getRange('A1:J1');
header.setFontWeight('bold');
header.setBackground('#cfe2f3');
header.setHorizontalAlignment('center');
header.setBorder(true, true, true, true, true, true);

sheet.setFrozenRows(1);
sheet.autoResizeColumns(1, 10);
}
//