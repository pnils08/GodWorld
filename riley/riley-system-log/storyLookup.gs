/**
* storyLookup.gs
* Returns full narrative text by Story Index Code.
* Usage in Sheet: =GETSTORYTEXT("CRE-MB6PV2YQ")
*/

function GETSTORYTEXT(storyCode) {
if (!storyCode) return '⚠️ No story index provided.';

const narrativeBook = SpreadsheetApp.openById('1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk');
const storiesSheet = narrativeBook.getSheetByName('Narrative_Stories');
if (!storiesSheet) return '⚠️ Narrative_Stories sheet not found.';

const data = storiesSheet.getDataRange().getValues();
const header = data.shift();
const indexCol = header.indexOf('Story ID') > -1 ? header.indexOf('Story ID') : 2;
const textCol = header.indexOf('Story Text') > -1 ? header.indexOf('Story Text') : 4;

for (let i = 0; i < data.length; i++) {
if (String(data[i][indexCol]).trim() === String(storyCode).trim()) {
return data[i][textCol];
}
}

return '❌ Story not found for ID: ' + storyCode;
}
