/******************************************************
* Riley Network Heartbeat — Slack & Discord Webhooks
* Maker: P | Steward: Riley
* Depends on: Network_Heartbeat(), Vault Registry H2/H3
******************************************************/

/**
* One-time setup helper.
* Run once with your actual URLs, then remove or comment out.
* Example:
* Set_Webhooks_Once_Only_("https://hooks.slack.com/services/…", "https://discord.com/api/webhooks/…");
*/
function Set_Webhooks_Once_Only_(slackUrl, discordUrl) {
const props = PropertiesService.getScriptProperties();
if (slackUrl) props.setProperty('SLACK_WEBHOOK_URL', slackUrl);
if (discordUrl) props.setProperty('DISCORD_WEBHOOK_URL', discordUrl);
Logger.log('✅ Webhook URLs saved to Script Properties.');
}

/**
* Daily notifier (use this instead of the email-only one if you want Slack/Discord).
* Posts ALWAYS; flip `postOnlyOnAlert` to true if you want only non-green states posted.
*/
function Daily_Network_Heartbeat_Notify() {
const postOnlyOnAlert = false; // set to true to only post when not green

// 1) Run your existing heartbeat
Network_Heartbeat();

// 2) Read status from Vault Registry
const REGISTRY_ID = "1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI";
const sheet = SpreadsheetApp.openById(REGISTRY_ID).getSheetByName("Vault Registry");
const statusLine = sheet.getRange("H2").getValue().toString(); // e.g., "🟢 ALL SYSTEMS OK"
const checkedAt = sheet.getRange("H3").getValue().toString();

const isOk = statusLine.includes("🟢");

if (postOnlyOnAlert && isOk) {
Logger.log("🟢 OK and postOnlyOnAlert=true — skipping webhook posts.");
return;
}

// 3) Post to Slack / Discord (if configured)
const props = PropertiesService.getScriptProperties();
const slackUrl = props.getProperty('SLACK_WEBHOOK_URL');
const discordUrl = props.getProperty('DISCORD_WEBHOOK_URL');

if (slackUrl) postToSlack_(slackUrl, statusLine, checkedAt, isOk);
if (discordUrl) postToDiscord_(discordUrl, statusLine, checkedAt, isOk);

Logger.log("📡 Webhook posts sent.");
}

/** Slack message (Incoming Webhook) */
function postToSlack_(url, statusLine, checkedAt, isOk) {
const color = isOk ? "#2EB67D" : "#E01E5A"; // green vs magenta/red
const payload = {
blocks: [
{
type: "header",
text: { type: "plain_text", text: isOk ? "🟢 Riley Network OK" : "⚠️ Riley Network Alert", emoji: true }
},
{
type: "section",
fields: [
{ type: "mrkdwn", text: `*Status:*\n${statusLine}` },
{ type: "mrkdwn", text: `*Checked:*\n${checkedAt}` }
]
}
],
attachments: [
{ color, text: "Automated heartbeat via Riley Steward." }
]
};

UrlFetchApp.fetch(url, {
method: "post",
contentType: "application/json",
payload: JSON.stringify(payload),
muteHttpExceptions: true
});
}

/** Discord message (Webhook) */
function postToDiscord_(url, statusLine, checkedAt, isOk) {
const title = isOk ? "🟢 Riley Network OK" : "⚠️ Riley Network Alert";
const payload = {
username: "Riley Steward",
embeds: [{
title,
description: statusLine,
color: isOk ? 3066993 : 15105570, // green vs orange/red
fields: [{ name: "Checked", value: checkedAt, inline: true }],
footer: { text: "Automated heartbeat via Riley Steward" }
}]
};

UrlFetchApp.fetch(url, {
method: "post",
contentType: "application/json",
payload: JSON.stringify(payload),
muteHttpExceptions: true
});
}

/** Optional: create a daily trigger for the webhook notifier */
function Create_Daily_Webhook_Trigger() {
ScriptApp.newTrigger("Daily_Network_Heartbeat_Notify")
.timeBased()
.everyDays(1)
.atHour(7) // 7 AM local; change to taste
.create();
Logger.log("⏱️ Daily trigger created for webhook heartbeat.");
}
