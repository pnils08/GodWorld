/********************************************
* Riley Network Heartbeat v1.0
* Maker: P | Steward: Riley
* Purpose: Compile system link status and return a single
* health indicator inside Vault Registry.
********************************************/

function Network_Heartbeat() {
Logger.log("💓 Starting Network Heartbeat check...");

const registryId = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI";
const registry = SpreadsheetApp.openById(registryId).getSheetByName("Vault Registry");
const data = registry.getRange("A2:F").getValues().filter(r => r[0]);

let total = data.length;
let healthy = 0;
let warnings = 0;
let failed = 0;

// Count connection results
data.forEach(row => {
const status = row[3] ? row[3].toString().toLowerCase() : "";
if (status.includes("✅")) healthy++;
else if (status.includes("⚠️")) warnings++;
else failed++;
});

// Build result string and color code
const ratio = healthy / total;
let state = "🔴 CRITICAL";
if (ratio === 1) state = "🟢 ALL SYSTEMS OK";
else if (ratio >= 0.7) state = "🟡 PARTIAL DEGRADED";

const timestamp = new Date().toLocaleString();

// Find or create dashboard cell
let header = registry.getRange("H1").getValue();
if (!header || header.toString().trim() === "") registry.getRange("H1").setValue("Network Status");

registry.getRange("H2").setValue(`${state} (${healthy}/${total})`);
registry.getRange("H3").setValue(`Last check: ${timestamp}`);

Logger.log(`✅ Heartbeat complete: ${state}`);
}
