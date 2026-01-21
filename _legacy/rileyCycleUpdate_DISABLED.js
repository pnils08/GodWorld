//
function rileyCycleUpdate() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const config = ss.getSheetByName('World_Config');
const digest = ss.getSheetByName('Riley_Digest');
const ledger = ss.getSheetByName('Simulation_Ledger');
const narrative = ss.getSheetByName('Narrative_Bridge'); // new addition

const configValues = config.getRange("A2:B12").getValues();
const configMap = {};
configValues.forEach(([key, value]) => (configMap[key] = value));

const maxTier = parseInt(configMap['maxTier'] || 6);
const autoAdvance = configMap['autoAdvance'] === 'TRUE';
const narrativeBridgeActive = configMap['narrativeBridgeActive'] === 'TRUE';
const digestFrequency = parseInt(configMap['digestFrequency'] || 48);

const now = new Date();
const lastAudit = configMap['lastAuditTimestamp'] ? new Date(configMap['lastAuditTimestamp']) : null;
const nextAudit = lastAudit ? new Date(lastAudit.getTime() + digestFrequency * 60 * 60 * 1000) : now;

let cycleCount = parseInt(configMap['cycleCount'] || 0);
cycleCount++;
config.getRange("B8").setValue(cycleCount);
config.getRange("B7").setValue(now);

let promotions = 0;
let promotedCitizens = [];

if (autoAdvance) {
const data = ledger.getRange(2, 1, ledger.getLastRow() - 1, ledger.getLastColumn()).getValues();
data.forEach((row, i) => {
const tier = parseInt(row[4]);
if (!isNaN(tier) && tier < maxTier) {
const newTier = tier + 1;
row[4] = newTier;
promotions++;
promotedCitizens.push(`${row[1]} ${row[3]} (T${newTier})`);
ledger.getRange(i + 2, 5).setValue(newTier);
}
});
}

// --- Story generation (Narrative Bridge) ---
if (narrativeBridgeActive) {
const storyHeader = `Cycle ${cycleCount} Report — ${now.toLocaleString()}`;
let storyBody = '';

if (promotions > 0) {
storyBody = `In this cycle, ${promotions} citizens advanced. ${promotedCitizens.join(', ')} rise through the world tiers, marking progress in the ongoing development of the Simulation.`;
} else {
storyBody = `No citizens advanced this cycle, but the Simulation continues to evolve — systems stabilize, and the population adapts in subtle ways unseen.`;
}

const closingLine = `Cycle ${cycleCount} closes quietly beneath the watch of Riley’s systems, the Simulation breathing onward into its next 48-hour rhythm.`;

narrative.appendRow([now, storyHeader, storyBody, closingLine]);
}
// --- Media Hand-off ---
const mediaSheetId = '1FQCCqRBUsqixaOmsqcZi-j7aev81656c3UfoQ_DQSVQ'; // Wild Media Newswire ID
const mediaSS = SpreadsheetApp.openById(mediaSheetId);
const mediaSheet = mediaSS.getSheetByName('Draft_Articles');

const headline = storyHeader;
const author = narrative.getRange(narrative.getLastRow(), 5).getValue(); // pulls Narrator
const cycleRef = narrative.getRange(narrative.getLastRow(), 6).getValue() || `C${cycleCount.toString().padStart(3, '0')}`;
const status = 'Draft – Auto Generated';
const body = `${storyBody}\n\n${closingLine}`;

mediaSheet.appendRow([new Date(), cycleRef, headline, body, author, status]);

// --- Digest entry ---
const summary = `Cycle ${cycleCount} complete — ${promotions} citizens advanced.`;
const notes = narrativeBridgeActive
? `Ledger updated automatically. Narrative story recorded.`
: `Ledger updated; Narrative Bridge inactive.`;

digest.appendRow([now, summary, notes]);
Logger.log(`✅ Riley cycle finished: ${promotions} citizens advanced.`);
}
//