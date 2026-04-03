function runNarrativeOrchestrator() {
// Hard-coded vaults so we skip the registry
const narrativeVaults = [
{ name: 'Creative_Vault', id: '1AyKtujVTJYpA4yH61zEWAgJh' },
{ name: 'Simulation_Ledger', id: '1QNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk' },
{ name: 'Civic_Ledger', id: '1vfsPU4S_pmINxJvdAfk9uSmpATXm1Agj' },
{ name: 'Population_Ledger', id: '12BFW6mB-MRZhqKqDhxCpisPi55' },
{ name: 'Universe', id: '1XDJDT_0238XOd7atsKFYFXzFv' }
];

const narrativeBook = SpreadsheetApp.openById('1QNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk');
const bridgeSheet = narrativeBook.getSheetByName('Narrative_Bridge') || narrativeBook.insertSheet('Narrative_Bridge');
const storiesSheet = narrativeBook.getSheetByName('Narrative_Stories') || narrativeBook.insertSheet('Narrative_Stories');

const cycleStamp = new Date();
const briefs = [];
const fullStories = [];

narrativeVaults.forEach(vault => {
try {
const ss = SpreadsheetApp.openById(vault.id);
const sheet = ss.getSheets()[0];
const lastRow = sheet.getLastRow();
const lastCol = sheet.getLastColumn();
if (lastRow < 2) return;

const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
const lastEntry = data[data.length - 1];

const eventSummary = `New activity logged in ${vault.name}.`;
const reporter = pickReporter(vault.name);
const cue = generateNarrativeCue(vault.name, headers, lastEntry);
const storyID = makeStoryIndex(vault.name);

briefs.push([cycleStamp, vault.name, reporter, cue, storyID]);
const storyText = expandToStory(reporter, vault.name, cue, eventSummary, cycleStamp, storyID);
fullStories.push([cycleStamp, reporter, storyID, vault.name, storyText]);

} catch (err) {
Logger.log(`Vault ${vault.name} failed: ${err.message}`);
}
});

if (briefs.length) {
bridgeSheet.insertRowsAfter(1, briefs.length);
bridgeSheet.getRange(2, 1, briefs.length, 5).setValues(briefs);
}
if (fullStories.length) {
storiesSheet.insertRowsAfter(1, fullStories.length);
storiesSheet.getRange(2, 1, fullStories.length, 5).setValues(fullStories);
}

Logger.log(`Cycle finished at ${cycleStamp}`);
}

function pickReporter(vaultName) {
if (vaultName.includes('Civic')) return 'Anthony';
if (vaultName.includes('Creative')) return 'Hal Richmond';
if (vaultName.includes('Universe')) return 'P Slayer';
if (vaultName.includes('Simulation')) return 'Riley System Digest';
if (vaultName.includes('Population')) return 'Riley Population Index';
return 'Automated Steward';
}

function generateNarrativeCue(vaultName, headers, entry) {
const highlights = headers.map((h, i) => `${h}: ${entry[i]}`).slice(0, 6).join(' | ');
return `${vaultName} update — ${highlights}`;
}

function makeStoryIndex(vaultName) {
const prefix = vaultName.substring(0, 3).toUpperCase();
const unique = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
return `${prefix}-${unique}`;
}

function expandToStory(reporter, vault, cue, summary, timestamp, storyID) {
const dateStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'MMMM dd, yyyy HH:mm');
let intro = '', body = '', outro = '';
switch (reporter) {
case 'Anthony':
intro = `From the Bay Tribune Desk — ${dateStr}.`;
body = `Civic systems recorded new developments in ${vault}. ${summary}`;
outro = `“The city never sleeps,” Anthony wrote.`;
break;
case 'Hal Richmond':
intro = `Filed by senior historian Hal Richmond, ${dateStr}.`;
body = `In ${vault}, creative archives expanded again. ${summary}`;
outro = `“Art remains the last form of order.”`;
break;
case 'P Slayer':
intro = `Slayer Syndicate Dispatch — ${dateStr}.`;
body = `Across the ${vault}, energy continues to surge. ${summary}`;
outro = `“Every system hums before it breaks the silence.”`;
break;
default:
intro = `${dateStr} — Automated report.`;
body = `${summary}`;
outro = `End of entry.`;
}
return `${intro}\n\n${body}\n\n${outro}\n\n[Story Index: ${storyID}]`;
}
