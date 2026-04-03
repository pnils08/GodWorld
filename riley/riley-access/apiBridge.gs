/**
* Riley API Bridge v1.2
* Safely routes external commands into your Apps Script functions.
*/

function doPost(e) {
try {
const payload = JSON.parse(e.postData.contents || "{}");
const cmd = payload.command || "";

let result;

switch (cmd) {
case "rebuildFranchiseStatsMaster":
result = rebuildFranchiseStatsMaster(); // must exist in your project
break;

case "verifyFranchiseStatsMaster":
result = verifyFranchiseStatsMaster(); // optional verification function
break;

default:
result = { error: "Unknown command: " + cmd };
}

return ContentService.createTextOutput(
JSON.stringify({ status: "ok", data: result })
).setMimeType(ContentService.MimeType.JSON);

} catch (err) {
Logger.log("API Bridge Error: " + err);
return ContentService.createTextOutput(
JSON.stringify({ status: "error", message: err.toString() })
).setMimeType(ContentService.MimeType.JSON);
}
}

/**
* Example test endpoint to confirm connectivity.
*/
function pingRiley() {
return "Riley bridge active: " + new Date();
}
function doGet(e) {
// optional ?command=pingRiley
const cmd = e && e.parameter && e.parameter.command;
if (cmd === "pingRiley") {
return ContentService.createTextOutput(
JSON.stringify({status:"ok", data: pingRiley()})
).setMimeType(ContentService.MimeType.JSON);
}
return ContentService.createTextOutput(
"Riley API Bridge is live (use POST with JSON to run commands)."
);
}
