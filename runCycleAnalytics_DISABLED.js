//
function runCycleAnalytics() {
Logger.log('Running cycle analytics and dispatch sequence...');
const ss = SpreadsheetApp.getActiveSpreadsheet();
const bridge = ss.getSheetByName('Narrative_Bridge') || ss.insertSheet('Narrative_Bridge');
const digest = ss.getSheetByName('Riley_Digest');

// Ensure Narrative_Bridge has proper headers
const headers = bridge.getRange(1, 1, 1, bridge.getLastColumn()).getValues()[0];
if (!headers.includes('Reporter')) {
bridge.clear();
bridge.appendRow(['Timestamp', 'Reporter', 'Title', 'Narrative', 'Source']);
}

if (!digest) {
Logger.log('Riley_Digest sheet not found; analytics skipped.');
return;
}

const rows = digest.getDataRange().getValues();
const latest = rows[rows.length - 1];
const timestamp = latest[0];
const summary = latest[1];
const notes = latest[2];

const { reporter, narrative } = generateNarrative(summary, notes);
const title = `Cycle Narrative – ${reporter}`;

bridge.appendRow([new Date(), reporter, title, narrative, `Source: ${timestamp}`]);
Logger.log(`Narrative_Bridge entry written by ${reporter}`);
}

function generateNarrative(summary, notes) {
const toneBank = [
'reflective and cinematic',
'analytical and factual',
'nostalgic and human',
'dynamic and civic-minded'
];
const tone = toneBank[Math.floor(Math.random() * toneBank.length)];
const reporter = pickReporter(summary, notes);

const narrative = `In this ${tone} cycle, ${summary.toLowerCase()} ${notes ? notes.toLowerCase() : ''}`.trim();
return { reporter, narrative };
}

function pickReporter(summary, notes) {
const reporters = ['Anthony', 'P Slayer', 'Hal Richmond'];
const text = `${summary} ${notes}`.toLowerCase();

// contextual routing
if (text.includes('trade') || text.includes('stats') || text.includes('analysis')) return 'Anthony';
if (text.includes('culture') || text.includes('faith') || text.includes('music')) return 'Hal Richmond';
if (text.includes('controversy') || text.includes('opinion') || text.includes('player')) return 'P Slayer';

// fallback random pick
return reporters[Math.floor(Math.random() * reporters.length)];
}
//