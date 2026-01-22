//
function createWorldConfigSheet() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
let config = ss.getSheetByName('World_Config');

if (config) {
SpreadsheetApp.getUi().alert('✅ World_Config sheet already exists.');
return;
}

config = ss.insertSheet('World_Config');

const headers = [
'Key',
'Value',
'Description'
];

const rows = [
['maxTier', '6', 'Highest tier currently allowed (Riley reads this to decide promotion cap)'],
['autoAdvance', 'TRUE', 'Allows Riley to promote automatically each cycle. Set FALSE to pause promotions.'],
['extendedTierAccess', 'TRUE', 'Grants Riley full tier management privileges (toggle when you issue a Steward_Grant command).'],
['narrativeBridgeActive', 'TRUE', 'Turns on automated world narration updates.'],
['digestFrequency', '48', 'Cycle length in hours for Riley’s system audit and population updates.'],
['lastAuditTimestamp', '', 'Riley writes the last execution timestamp here.'],
['cycleCount', '', 'Automatically increments each world cycle.'],
['logDriveID', '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI', 'Riley_System_Log drive ID for reference.'],
['simulationLedgerID', '1TQVhY3B-KpoA6FarnIVXMfoXcwyv0_kk', 'Simulation Ledger Sheet ID.'],
['digestSheetID', '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI', 'Riley_Digest Sheet ID (same as log for now).'],
['worldName', 'The Simulation', 'Internal label used by narrative scripts.']
];

// write data
config.getRange(1, 1, 1, headers.length).setValues([headers]);
config.getRange(2, 1, rows.length, headers.length).setValues(rows);

// format
config.getRange("A1:C1").setFontWeight("bold").setBackground("#e0e0e0");
config.setColumnWidths(1, 3, 300);
SpreadsheetApp.getUi().alert('✅ World_Config sheet created successfully.');
}
//