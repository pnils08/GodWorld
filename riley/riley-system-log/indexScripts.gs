function indexScripts() {
const files = DriveApp.searchFiles("mimeType='application/vnd.google-apps.script'");
const sheet = SpreadsheetApp.getActive().getSheetByName('Script_Index');
sheet.clearContents();
sheet.appendRow(['FileName','FileID','ScriptURL','Triggers','LastUpdated','Notes']);
while (files.hasNext()) {
const f = files.next();
const url = `https://script.google.com/d/${f.getId()}/edit`;
sheet.appendRow([f.getName(), f.getId(), url, '(add manually)', f.getLastUpdated(), '']);
}
}
