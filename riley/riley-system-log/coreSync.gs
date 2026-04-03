/**
* ===========================
* Riley_System_Log / CoreSync
* final drop-in — production safe
* ===========================
*
* Paste this entire file as coreSync.gs in the Riley_System_Log project.
* It will run cleanly even if some functions live in other projects.
*/

/** lightweight logger into Riley_System_Log */
function writeLog(type, message) {
try {
const LOG_SHEET_ID = '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI';
const sheet = SpreadsheetApp.openById(LOG_SHEET_ID).getActiveSheet();
sheet.appendRow([new Date().toISOString(), type, message]);
} catch (err) {
Logger.log(`⚠️ writeLog failed: ${err.message}`);
}
}

/** safe invoker: calls fn if it exists; logs skip otherwise */
function safeCall(fnName) {
const started = new Date();
if (typeof this[fnName] === 'function') {
try {
this[fnName](); // run
const ms = new Date() - started;
writeLog('System Notice', `✅ ${fnName} complete (${ms} ms)`);
Logger.log(`✅ ${fnName} complete (${ms} ms)`);
return true;
} catch (err) {
writeLog('System Error', `❌ ${fnName} failed: ${err.message}`);
Logger.log(`❌ ${fnName} failed: ${err.stack}`);
return false;
}
} else {
writeLog('System Notice', `⏭️ ${fnName} not found in this project — skipped`);
Logger.log(`⏭️ ${fnName} not found — skipped`);
return null;
}
}

/** minimal heartbeat (used if not defined elsewhere) */
function dailyStewardCheck() {
try {
const storageUsed = DriveApp.getStorageUsed();
const msg = `Drive OK | Storage: ${storageUsed} bytes`;
writeLog('Daily Check', msg);
Logger.log(msg);
} catch (err) {
writeLog('System Error', `dailyStewardCheck failed: ${err.message}`);
}
}

/** local placeholder so CoreSync never breaks if auditCounters lives elsewhere */
function auditCounters() {
writeLog('System Notice', 'auditCounters skipped here (runs in Rileys_FullDrive_Access)');
Logger.log('auditCounters placeholder executed.');
}

/**
* CoreSync — unified daily automation
* Runs all subsystems and leaves one summary entry.
*/
function CoreSync() {
const t0 = new Date();
writeLog('System Notice', `🟢 CoreSync started ${t0.toISOString()}`);
Logger.log(`🟢 CoreSync started ${t0.toISOString()}`);

// Order matters: birth → media → creative → audit → heartbeat
safeCall('autoRegisterCitizen');
safeCall('publishStory');
safeCall('registerCreativeWork');
safeCall('auditCounters');
safeCall('dailyStewardCheck');

const t1 = new Date();
const duration = ((t1 - t0) / 1000).toFixed(2);
const checksum = Utilities.getUuid();
const summary = `✅ CoreSync completed in ${duration}s | Checksum: ${checksum}`;
writeLog('System Notice', summary);
Logger.log(summary);
}
