function updateFamilyLinks() {
const POP_LEDGER_ID = '1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo';
const ss = SpreadsheetApp.openById(POP_LEDGER_ID);

const regSheet = ss.getSheetByName('Registry');
const linSheet = ss.getSheetByName('Lineage');
if (!regSheet || !linSheet) {
Logger.log('❌ Missing Registry or Lineage sheet.');
return;
}

const regData = regSheet.getDataRange().getValues();
const linData = linSheet.getDataRange().getValues();

if (regData.length < 2 || linData.length < 2) {
Logger.log('⚠️ Insufficient data to link families.');
return;
}

const regHeaders = regData[0];
const linHeaders = linData[0];

const popIndex = regHeaders.indexOf('PopID');
const lineageIndex = linHeaders.indexOf('LineageID');
const parent1Index = linHeaders.indexOf('Parent1');
const spouseIndex = linHeaders.indexOf('Spouse');
const childrenIndex = linHeaders.indexOf('Children');

if (popIndex === -1 || lineageIndex === -1) {
Logger.log('❌ Missing required columns.');
return;
}

const registryMap = {};
for (let i = 1; i < regData.length; i++) {
const popID = regData[i][popIndex];
if (popID) registryMap[popID] = i; // store row index
}

let updated = 0;

for (let i = 1; i < linData.length; i++) {
const popID = linData[i][0];
const parent1 = linData[i][parent1Index];
const spouse = linData[i][spouseIndex];
const children = linData[i][childrenIndex];

// If parent exists, link child to parent's children list
if (parent1 && registryMap[parent1]) {
const parentRow = registryMap[parent1] + 1;
const childrenCell = regSheet.getRange(parentRow, childrenIndex + 1);
let currentChildren = childrenCell.getValue();
if (!currentChildren.toString().includes(popID)) {
currentChildren += currentChildren ? `, ${popID}` : popID;
childrenCell.setValue(currentChildren);
updated++;
}
}

// Link spouse in both directions
if (spouse && registryMap[spouse]) {
const spouseRow = registryMap[spouse] + 1;
const spouseCell = regSheet.getRange(spouseRow, spouseIndex + 1);
spouseCell.setValue(popID);
updated++;
}
}

SpreadsheetApp.flush();
Logger.log(`✅ Family links updated successfully — ${updated} records connected.`);
}
