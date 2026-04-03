/** === CONFIG === */
const IDS = {
RILEY_LOG: '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI', // Riley_System_Log
BAY_TRIBUNE: '1MVCJLpU1qs9IAJN6vyzMrzHkvRNl33pYwup_CDd-nGA' // Bay_Tribune
};
const FRANCHISE_NODE = 'Franchise_Stats_Master';

/** === HEARTBEAT / STATUS === */
function reportNodeStatus() {
const log = SpreadsheetApp.openById(IDS.RILEY_LOG).getSheetByName('Federation_Status_Log')
|| SpreadsheetApp.openById(IDS.RILEY_LOG).insertSheet('Federation_Status_Log');
log.appendRow([new Date(), FRANCHISE_NODE, 'Active', Session.getActiveUser().getEmail()]);
}

function runHeartbeat() {
const reg = SpreadsheetApp.openById(IDS.RILEY_LOG).getSheetByName('Federation_Nodes')
|| SpreadsheetApp.openById(IDS.RILEY_LOG).insertSheet('Federation_Nodes');
// non-destructive: write to bottom
reg.appendRow([FRANCHISE_NODE, 'Sports/Stats System', 'Active', new Date(), '✓', 'apps-script:bound']);
reportNodeStatus();
}

/** === PRESS PULSE: Franchise → Bay (simple, readable payload) ===
* Pulls a few headline stats and posts them to Bay_Tribune!Intake
*/
function pushPressPulse() {
const ss = SpreadsheetApp.getActiveSpreadsheet();

// Example sources (adjust to your tab names):
const activeSeason = ss.getSheetByName('Active_Season') || ss.getSheetByName('Active Season') || ss.getSheets()[0];
const stats = ss.getSheetByName('Stats') || activeSeason;

// Very simple read: top 3 “storylines”
// Expecting headers in row 1; tweak ranges/columns to match your sheet
const topRows = stats.getRange(2, 1, Math.min(5, stats.getLastRow() - 1), Math.min(10, stats.getLastColumn())).getValues();
const bullets = topRows.slice(0, 3).map(r => `• ${r[0]} — ${r[1]} / ${r[2]} / ${r[3]}`).join('\n');

const payload = {
node: FRANCHISE_NODE,
headline: 'Franchise Press Pulse',
datestamp: new Date().toISOString(),
notes: bullets || 'No highlights found.'
};

const bay = SpreadsheetApp.openById(IDS.BAY_TRIBUNE);
const intake = bay.getSheetByName('Intake') || bay.insertSheet('Intake');
// Columns: Timestamp | Source | Headline | Notes (multiline)
intake.appendRow([new Date(), payload.node, payload.headline, payload.notes]);
}

/** === ONE-CLICK SETUP === */
function setupFranchiseNode() {
// time-based triggers: daily heartbeat + daily press pulse at staggered hours
ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
ScriptApp.newTrigger('runHeartbeat').timeBased().everyDays(1).atHour(2).create();
ScriptApp.newTrigger('pushPressPulse').timeBased().everyDays(1).atHour(3).create();
// immediate first run
runHeartbeat();
pushPressPulse();
}
