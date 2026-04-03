function onEdit(e) {
const val = e.value ? e.value.toString().toLowerCase() : "";
if (val.includes("add that to the wild")) {
logToWild(e);
SpreadsheetApp.getActiveSpreadsheet().toast(
"✅ Logged to The Wild registry.",
"Riley Access"
);
}
}

function logToWild(e) {
const wildId = "1fpFDikkw5GgPpWb5O28934QGTXl_WVBcsZZU6FFOwEc"; // replace with your real ID
const wild = SpreadsheetApp.openById(wildId).getSheetByName("Registry");
const user = Session.getActiveUser().getEmail();
const time = new Date();

wild.appendRow([
time,
user,
e.range.getSheet().getName(),
e.range.getA1Notation(),
e.value
]);
}
