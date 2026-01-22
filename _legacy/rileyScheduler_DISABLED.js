//
function onOpen() {
const ui = SpreadsheetApp.getUi();
ui.createMenu('Riley Controls')
.addItem('Force Cycle Now', 'runCycleAnalytics')
.addToUi();
}

function dailyScheduler() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const config = ss.getSheetByName('World_Config');
const lastRunCell = config.getRange('B6'); // your timestamp cell
const lastRun = new Date(lastRunCell.getValue());
const now = new Date();

const hoursSince = (now - lastRun) / (1000 * 60 * 60);
if (hoursSince < 48) {
Logger.log(`⏸ Cycle skipped — only ${hoursSince.toFixed(1)} hours since last.`);
return;
}

Logger.log('✅ 48 hours reached — executing full narrative cycle.');
config.getRange('B6').setValue(now);
runCycleAnalytics();
}
//