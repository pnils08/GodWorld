/**
* Riley_AutoFill_Generator_v1.2
* Purpose: Auto-populate a new verification form and log it to System_Audit_Logs
* Path: /GW4_MasterVault/Core/Steward/Directives/Verification
*/

function runRileyAutoFill() {
const baseFolderId = "1vOPo9Y26FpanhmQIdsbG1TbTvGX9YYQ_"; // GW4_MasterVault root
const base = DriveApp.getFolderById(baseFolderId);

// Walk down the verified hierarchy
const core = base.getFoldersByName("Core").next();
const steward = core.getFoldersByName("Steward").next();
const directives = steward.getFoldersByName("Directives").next();
const verification = directives.getFoldersByName("Verification").next();
const forms = verification.getFoldersByName("Forms").next();
const reports = verification.getFoldersByName("Reports").next();

// Locate the template
const files = forms.getFilesByName("Riley_Verification_Template_v1.0.pdf");
if (!files.hasNext()) {
Logger.log("❌ Template not found in Forms folder.");
return;
}
const template = files.next();

// Generate timestamp + identifiers
const now = new Date();
const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
const phaseId = "PHASE_5";
const checksumId = "CHK-5-" + dateStr;
const resultName = `Riley_Verification_${phaseId}_${dateStr}.pdf`;

// Copy the template to Reports
const newFile = template.makeCopy(resultName, reports);

// Log success
const message = `✅ ${dateStr} | Auto-fill executed | File: ${resultName} | Phase: ${phaseId} | Checksum: ${checksumId}`;
Logger.log(message);
logToSystemAudit(message);
}

/**
* Writes a log entry into System_Audit_Log.txt inside /System_Audit_Logs
*/
function logToSystemAudit(entry) {
const baseFolderId = "1vOPo9Y26FpanhmQIdsbG1TbTvGX9YYQ_"; // GW4_MasterVault root
const base = DriveApp.getFolderById(baseFolderId);
const core = base.getFoldersByName("Core").next();
const steward = core.getFoldersByName("Steward").next();
const logsFolder = steward.getFoldersByName("System_Audit_Logs").next();

// Find or create log file
let logFile;
const files = logsFolder.getFilesByName("System_Audit_Log.txt");
if (files.hasNext()) {
logFile = files.next();
} else {
logFile = logsFolder.createFile("System_Audit_Log.txt", "=== SYSTEM AUDIT LOG ===\n");
}

logFile.append(`\n${new Date().toISOString()} — ${entry}`);
}
