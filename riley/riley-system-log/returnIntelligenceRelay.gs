/**
* PHASE 6 – RETURN INTELLIGENCE RELAY
* Receives refined insights from partner systems and consolidates them into Riley_System_Log.
* Partners: Civic_Ledger, Wild_Media_News, Slayer_Syndicate, etc.
*/

function returnIntelligenceRelay() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const logSheet = ss.getSheetByName('Intelligence_Log') || ss.insertSheet('Intelligence_Log');

const partners = [
{ id: '1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo', name: 'Civic_Ledger' },
{ id: '1FQCCqRBUsqixaOmsqcZi-j7aev81656c3UfoQ_DQSVQ', name: 'Wild_Media_News' },
{ id: '1GuAoDvoEVfaGRB17RdnQYAFY7id47yB5rHOh3dj_DKA', name: 'Slayer_Syndicate' }
];

const timestamp = new Date();
logSheet.appendRow([timestamp, '🛰️ Phase 6 – Return Intelligence Relay started']);

partners.forEach(partner => {
try {
const partnerSS = SpreadsheetApp.openById(partner.id);
const inbox = partnerSS.getSheetByName('Federation_Return');
if (!inbox) {
logSheet.appendRow([timestamp, partner.name, '⚠️ No Federation_Return sheet found']);
return;
}

const data = inbox.getDataRange().getValues();
if (data.length <= 1) {
logSheet.appendRow([timestamp, partner.name, '⚠️ No new intelligence found']);
return;
}

// Skip header row
for (let i = 1; i < data.length; i++) {
const [date, source, summary, status] = data[i];
if (status !== 'Processed') {
logSheet.appendRow([
new Date(),
partner.name,
summary,
'🧠 Integrated'
]);
inbox.getRange(i + 1, 4).setValue('Processed'); // mark as done
}
}

logSheet.appendRow([timestamp, partner.name, '✅ Intelligence retrieved']);
} catch (err) {
logSheet.appendRow([timestamp, partner.name, `❌ Error: ${err.message}`]);
}
});

logSheet.appendRow([new Date(), '✅ Phase 6 – Return Intelligence Relay complete']);
}
/**
* Automatically clean partner Federation_Return sheets
* after returnIntelligenceRelay() finishes.
*/

function cleanupPartnerReturns() {
const partners = [
{ id: '1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo', name: 'Civic_Ledger' },
{ id: '1FQCCqRBUsqixaOmsqcZi-j7aev81656c3UfoQ_DQSVQ', name: 'Wild_Media_News' },
{ id: '1GuAoDvoEVfaGRB17RdnQYAFY7id47yB5rHOh3dj_DKA', name: 'Slayer_Syndicate' }
];

const timestamp = new Date();
partners.forEach(p => {
try {
const book = SpreadsheetApp.openById(p.id);
const sheet = book.getSheetByName('Federation_Return');
if (!sheet) return;
const data = sheet.getDataRange().getValues();
const headers = data.shift();
const retained = data.filter(r => r[3] !== 'Processed');
sheet.clearContents();
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
if (retained.length > 0)
sheet.getRange(2, 1, retained.length, headers.length).setValues(retained);
Logger.log(`🧹 Cleaned ${p.name}: ${retained.length} active rows retained.`);
} catch (err) {
Logger.log(`⚠️ Cleanup failed for ${p.name}: ${err.message}`);
}
});
}

/**
* Wrapper: run relay + cleanup in one call
*/
function runRelayAndCleanup() {
returnIntelligenceRelay();
cleanupPartnerReturns();
}
