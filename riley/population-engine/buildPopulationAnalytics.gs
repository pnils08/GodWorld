function buildPopulationAnalytics() {
const ss = SpreadsheetApp.getActiveSpreadsheet();

// Ensure sheets exist or create them
const popSheet = ss.getSheetByName('Population') || ss.insertSheet('Population');
const regSheet = ss.getSheetByName('Registry') || ss.insertSheet('Registry');
const lineSheet = ss.getSheetByName('Lineage') || ss.insertSheet('Lineage');
const main = ss.getSheetByName('Main') || ss.insertSheet('Main');

main.clearContents();
main.getRange('A1').setValue('📊 Population Ledger Analytics Dashboard')
.setFontWeight('bold').setFontSize(14);

const headers = ['Metric','Value','Last Updated'];
main.getRange('A3:C3').setValues([headers]).setFontWeight('bold');

const now = new Date();

// Protect against empty data
const totalPop = Math.max(0, popSheet.getLastRow() - 1);
const lineageCount = Math.max(0, lineSheet.getLastRow() - 1);

let activeCount = 0, deceasedCount = 0, birthCount = 0, deathCount = 0;

if (totalPop > 0) {
const popData = popSheet.getDataRange().getValues();
for (let i = 1; i < popData.length; i++) {
const status = popData[i][4]; // column E = Status
if (status === 'Active') activeCount++;
if (status === 'Deceased') deceasedCount++;
}
}

if (regSheet.getLastRow() > 1) {
const regData = regSheet.getDataRange().getValues();
for (let i = 1; i < regData.length; i++) {
const event = regData[i][3]; // event type column
if (event === 'Birth') birthCount++;
if (event === 'Death') deathCount++;
}
}

const metrics = [
['Total Population', totalPop, now],
['Active Entities', activeCount, now],
['Deceased Entities', deceasedCount, now],
['Birth Events', birthCount, now],
['Death Events', deathCount, now],
['Active Lineages', lineageCount, now],
];

main.getRange(4, 1, metrics.length, 3).setValues(metrics);
main.autoResizeColumns(1, 3);
main.getRange('A:C').setVerticalAlignment('middle');

Logger.log('✅ Phase 3 – Analytics Dashboard updated successfully');
}

