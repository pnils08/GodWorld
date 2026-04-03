/********************************************
* Riley Network Heartbeat Scheduler v1.0
* Maker: P | Steward: Riley
* Runs daily; emails P if heartbeat ≠ 🟢 ALL SYSTEMS OK
********************************************/
function Daily_Network_Heartbeat() {
Logger.log("⏰ Daily heartbeat job starting...");

// 1️⃣ Run the heartbeat check
Network_Heartbeat();

// 2️⃣ Read the result from Vault Registry
const registryId = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI";
const registry = SpreadsheetApp.openById(registryId).getSheetByName("Vault Registry");
const status = registry.getRange("H2").getValue();
const time = registry.getRange("H3").getValue();

// 3️⃣ Determine color state
const ok = status.toString().includes("🟢");
const subject = ok
? `✅ Riley Network OK – ${time}`
: `⚠️ Riley Network Alert – ${status}`;

// 4️⃣ Email alert (replace with your real address)
const recipient = "pnils08@gmail.com";
const body = `
${status}

Checked at: ${time}

This is an automated Riley heartbeat notification.
`;
MailApp.sendEmail(recipient, subject, body);

Logger.log("📤 Daily heartbeat email sent.");
}

/********************************************
* Helper: create daily time-based trigger
********************************************/
function Create_Daily_Heartbeat_Trigger() {
// Runs every day at 7:30 AM (you can change the time)
ScriptApp.newTrigger("Daily_Network_Heartbeat")
.timeBased()
.everyDays(1)
.atHour(7)
.create();
Logger.log("⏱️ Daily trigger created for Network Heartbeat.");
}
