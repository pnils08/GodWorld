/**
* BACKUP SCRIPT FILES TO DRIVE
* Creates a single Google Doc with all the code from the current project.
*/
function backupScriptsToDrive() {
const projectName = ScriptApp.getProjectMetadata().name || "Unnamed_Project";
const files = DriveApp.getFilesByName(projectName + "_Backup_" + new Date().toISOString().slice(0,10));
if (files.hasNext()) return Logger.log("Backup already exists for today.");

const doc = DocumentApp.create(projectName + "_Backup_" + new Date().toISOString().slice(0,10));
const body = doc.getBody();

const scriptFiles = ScriptApp.getProjectFiles();
scriptFiles.forEach(file => {
body.appendParagraph("FILE: " + file.getName()).setHeading(DocumentApp.ParagraphHeading.HEADING1);
body.appendParagraph(file.getContent()).setFontFamily("Courier New");
body.appendParagraph("──────────────────────────────");
});

Logger.log("✅ Backup complete: " + doc.getUrl());
}
