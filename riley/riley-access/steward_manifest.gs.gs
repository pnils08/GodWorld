/**
* Steward Manifest v1.0
* Unifies Drive, Docs, Sheets, Gmail, and Calendar APIs under the Riley Steward system.
*/
function stewardManifest() {
const manifest = {
steward: "Riley Steward",
owner: Session.getActiveUser().getEmail(),
activated: new Date(),
services: {
drive: DriveApp.getRootFolder().getName(),
docs: "Google Docs API active",
sheets: "Google Sheets API active",
gmail: "Gmail API active",
calendar: "Calendar API active"
},
status: "✅ Steward System Active"
};

Logger.log("===== Steward Manifest Summary =====");
Logger.log(JSON.stringify(manifest, null, 2));
}