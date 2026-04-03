function setupVaultRegistryAPI() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheetName = 'Vault_Registry_API';

// Create the sheet if it doesn't exist
let sheet = ss.getSheetByName(sheetName);
if (!sheet) {
sheet = ss.insertSheet(sheetName);
} else {
sheet.clear(); // Clean existing data if rerun
}

// Set headers
const headers = ['Vault Name', 'Sheet ID', 'Narrative'];
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

// Populate vault rows
const data = [
['Creative_Vault', '1AyKfujVTJYpA4yH61zEWAgJh', 'TRUE'],
['Simulation_Ledger', '1QNeCzqrDmmOy1w0ScryzdRd82syq0QZ_wZ7dTHB8jk', 'TRUE'],
['Civic_Ledger', '1vfsPU4S_pmlNxJvdAfk9uSmpATXm1Agj', 'TRUE'],
['Population_Ledger', '12BF6WmB-MRZHqKgDhxCPisPi55', 'TRUE'],
['Universe', '1XDJDT_0238XOd7atsKFYFXzFv', 'TRUE']
];
sheet.getRange(2, 1, data.length, headers.length).setValues(data);

// Auto fit columns
sheet.autoResizeColumns(1, headers.length);

Logger.log(`Vault_Registry_API created and populated with ${data.length} entries.`);
}
