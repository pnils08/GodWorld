/** ———————————————————————————
* FEEDS AUTOMATION MASTER SCRIPT
* Franchise_Stats_Master
* ———————————————————————————
* Includes:
* 1. Config constants
* 2. Email summary (HTML + plain)
* 3. Combined rebuild + email function
* 4. Weekly trigger installer
*/

//// 1️⃣ CONFIG CONSTANTS
const FEEDS_BRAND = 'Franchise Steward';
const FEEDS_SEND_TO = ['riley.steward.system@gmail.com']; // change to Riley’s actual email
const FEEDS_CC = ['pnils08@gmail.com']; // optional, you can remove if not needed


//// 2️⃣ EMAIL SUMMARY FUNCTION
function emailFeedsReport() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const url = ss.getUrl();
const sheet = ss.getSheetByName('Feeds');
if (!sheet) throw new Error('Feeds sheet not found.');

const rows = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 4).getValues();
const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

// Text email body
let text = `✅ Feeds refreshed\n\nSpreadsheet: ${ss.getName()}\nLink: ${url}\nWhen: ${stamp}\nBy: ${FEEDS_BRAND}\n\nFeeds:\n`;
rows.forEach(r => { text += `• ${r[0]} → ${r[1]} (${r[2]})\n Notes: ${r[3] || '-'}\n`; });

// HTML email body
let html = `<div style="font-family:system-ui,Arial">
<h2>✅ Feeds refreshed</h2>
<p><b>Spreadsheet:</b> ${ss.getName()}<br>
<b>Link:</b> <a href="${url}">${url}</a><br>
<b>When:</b> ${stamp}<br>
<b>By:</b> ${FEEDS_BRAND}</p>
<table border="1" cellpadding="6" cellspacing="0">
<thead><tr><th>Feed</th><th>URL</th><th>Format</th><th>Notes</th></tr></thead>
<tbody>`;
rows.forEach(r => {
html += `<tr><td>${r[0]}</td><td><a href="${r[1]}">${r[1]}</a></td><td>${r[2]}</td><td>${r[3] || ''}</td></tr>`;
});
html += `</tbody></table>
<p style="margin-top:1em;color:#555;font-size:12px;">Automated by ${FEEDS_BRAND}</p>
</div>`;

// Send the email
MailApp.sendEmail({
to: FEEDS_SEND_TO.join(','),
cc: FEEDS_CC.join(','),
subject: `Feeds refreshed • ${ss.getName()} • ${stamp}`,
body: text,
htmlBody: html,
name: FEEDS_BRAND
});
}


//// 3️⃣ COMBINED REBUILD + EMAIL
function rebuildFeeds_and_Email() {
generateFeedsTab(); // your existing Feeds builder
emailFeedsReport(); // sends the summary
}


//// 4️⃣ WEEKLY TRIGGER INSTALLER
function scheduleFeedsRefresh() {
// Remove any old triggers
ScriptApp.getProjectTriggers().forEach(t => {
if (['rebuildFeeds_and_Email'].includes(t.getHandlerFunction())) {
ScriptApp.deleteTrigger(t);
}
});

// Create weekly trigger (Monday 8 AM)
ScriptApp.newTrigger('rebuildFeeds_and_Email')
.timeBased()
.onWeekDay(ScriptApp.WeekDay.MONDAY)
.atHour(8)
.create();

Logger.log('Weekly Feeds rebuild + email confirmation trigger installed.');
}
