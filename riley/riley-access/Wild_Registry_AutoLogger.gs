/**
* --- THE WILD REGISTRY AUTOMATION v1.0 ---
* 1️⃣ Listens for the phrase “add that to the wild”.
* 2️⃣ Logs the idea in the Wild Sheet.
* 3️⃣ Marks it Pending for Riley’s scheduling.
*/

function onEdit(e) {
try {
const val = e.value;
if (!val) return;
if (val.toLowerCase().includes("add that to the wild")) {
logToWild(val);
SpreadsheetApp.getActiveSpreadsheet()
.toast("Logged to The Wild registry.", "Riley Access");
}
} catch (err) {
Logger.log("onEdit error: " + err);
}
}

// ---------- LOGGING FUNCTION ----------
function logToWild(idea) {
const WILD_SHEET_ID = '1fpFDikkw5GgPpWb5O28934QGTXl_WVBcsZZU6FFOwEc'; // <== replace with your Wild Sheet ID
const sheetName = 'Registry';
const ss = SpreadsheetApp.openById(WILD_SHEET_ID);
const ws = ss.getSheetByName(sheetName);

// If sheet doesn’t exist yet, build it with headers and formatting
if (!ws) {
const newWs = ss.insertSheet(sheetName);
const headers = ['Timestamp', 'Idea / Description', 'Status', 'Logged By'];
newWs.appendRow(headers);
const headerRange = newWs.getRange(1, 1, 1, headers.length);
headerRange.setBackground('#1E88E5').setFontColor('white').setFontWeight('bold');
}

const target = ss.getSheetByName(sheetName);
const timestamp = new Date();
target.appendRow([timestamp, idea, 'Pending', 'Riley (Auto)']);
}
function Bridge_Log_Sync() {
Logger.log("🔗 Starting Civic–Population bridge sync...");

const civic = SpreadsheetApp.openById("1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo").getSheetByName("Registry");
const pop = SpreadsheetApp.openById("1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo").getSheetByName("Registry");
const master = SpreadsheetApp.openById("1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI").getSheetByName("Bridge_Log");

const civicData = civic.getDataRange().getValues();
const popData = pop.getDataRange().getValues();

master.clearContents();
master.appendRow(["Source", "Entry", "Timestamp"]);

civicData.forEach(r => master.appendRow(["Civic", r[0], r[1]]));
popData.forEach(r => master.appendRow(["Population", r[0], r[1]]));

Logger.log("✅ Bridge_Log_Sync completed successfully.");
}
