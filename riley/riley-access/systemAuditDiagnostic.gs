/**
* systemAuditDiagnostic v1.0
* Runs a full integrity scan of connected Google services.
* Logs response time, success/failure, and overall health score.
*/

function runSystemAudit() {
const ss = SpreadsheetApp.openById(LOG_SHEET_ID);
const sheet = ss.getSheetByName("Weekly_Summary");
if (!sheet) return;

const auditResults = [];
const start = new Date();

function testService(name, func) {
const t0 = new Date();
let success = true;
let message = "";
try {
func();
} catch (e) {
success = false;
message = e.toString();
}
const elapsed = (new Date() - t0);
auditResults.push([name, success ? "✅" : "❌", elapsed + " ms", message]);
}

// Test Drive
testService("Drive", () => DriveApp.getRootFolder().getName());

// Test Docs
testService("Docs", () => DocumentApp.create("tempDoc").getId());

// Test Sheets
testService("Sheets", () => SpreadsheetApp.create("tempSheet").getId());

// Test Gmail
testService("Gmail", () => GmailApp.getInboxUnreadCount());

// Test Calendar
testService("Calendar", () => CalendarApp.getDefaultCalendar().getName());

const total = auditResults.length;
const failed = auditResults.filter(r => r[1] === "❌").length;
const avgTime = Math.round(
auditResults.reduce((a, b) => a + parseInt(b[2]), 0) / total
);

// Compute health score
const score = Math.max(0, Math.round(100 - (failed * 20) - (avgTime / 100)));
const status =
score > 90 ? "🟢 Optimal" :
score > 70 ? "🟡 Stable" :
"🔴 Review";

// Log summary
const row = [new Date(), total, failed, avgTime + " ms", score, status];
sheet.appendRow(row);

Logger.log("===== SYSTEM AUDIT REPORT =====");
Logger.log("Date: " + start);
auditResults.forEach(r => Logger.log(`${r[0]}: ${r[1]} (${r[2]}) ${r[3]}`));
Logger.log("Overall Score: " + score + " | Status: " + status);
}
