function updateLineageLedger() {
const POP_LEDGER_ID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo';
const popBook = SpreadsheetApp.openById(POP_LEDGER_ID);
const popSheet = popBook.getSheetByName('Registry');
const linSheet = popBook.getSheetByName('Lineage');

if (!popSheet || !linSheet) {
Logger.log('❌ Missing Registry or Lineage sheet.');
return;
}

const data = popSheet.getDataRange().getValues();
if (!data || data.length < 2) {
Logger.log('⚠️ Registry sheet empty or missing data.');
return;
}

const headers = data[0];
const popIndex = headers.indexOf('PopID');
const parentIndex = headers.indexOf('Parent_PopID');
const spouseIndex = headers.indexOf('Spouse_PopID');
const tierIndex = headers.indexOf('Tier');

if (popIndex === -1) {
Logger.log('❌ Missing required PopID column.');
return;
}

const lineageData = [];

for (let i = 1; i < data.length; i++) {
const popID = data[i][popIndex];
if (!popID) continue;

const lineageID = 'LIN-' + Utilities.getUuid().slice(0, 8);
const parent1 = parentIndex > -1 ? data[i][parentIndex] : '';
const spouse = spouseIndex > -1 ? data[i][spouseIndex] : '';
const tier = tierIndex > -1 ? data[i][tierIndex] : 'Core';

lineageData.push([
popID,
lineageID,
parent1,
'', // Parent2 placeholder
spouse,
'', // Children placeholder
tier,
'', // Birth_Year
'', // Death_Year
'',
new Date()
]);
}

if (lineageData.length === 0) {
Logger.log('⚠️ No lineage data generated — nothing to write.');
return;
}

linSheet.getRange(2, 1, lineageData.length, lineageData[0].length).setValues(lineageData);
SpreadsheetApp.flush();
Logger.log(`✅ Lineage ledger updated with ${lineageData.length} entries.`);
}
