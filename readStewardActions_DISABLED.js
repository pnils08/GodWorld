//
function readStewardActions() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const actions = ss.getSheetByName('Steward_Actions');
if (!actions) {
Logger.log('No Steward_Actions sheet found.');
return;
}

const rows = actions.getDataRange().getValues();
const headers = rows[0];
const commandIndex = headers.indexOf('Command');
const statusIndex = headers.indexOf('Status');

for (let i = 1; i < rows.length; i++) {
const cmd = rows[i][commandIndex];
const status = rows[i][statusIndex];

if (status.toString().toLowerCase() === 'confirmed') {
Logger.log(`Executing Steward command: ${cmd}`);

if (cmd.includes('ACTIVATE_CYCLE_ANALYTICS')) {
runCycleAnalytics();
actions.getRange(i + 1, statusIndex + 1).setValue('Executed');
}

// other command examples:
// if (cmd.includes('PAUSE_AUTOMATION')) pauseAutomation();
// if (cmd.includes('FORCE_WORLD_CYCLE')) rileyCycleUpdate();
}
}

SpreadsheetApp.flush();
Logger.log('Steward command scan complete.');
}

function runCycleAnalytics() {
Logger.log('Running cycle analytics and dispatch sequence...');
// placeholder for narrative / data aggregation logic
}
//