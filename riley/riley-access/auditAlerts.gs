/** ===== Alert Config ===== */
const ALERT_EMAILS = [
"pnils08@gmail.com",
"riley.steward.system@gmail.com"
];
const MIN_HEALTH_SCORE = 80; // alert if below
const CONSEC_FAIL_LIMIT = 2; // any service fails N weeks in a row -> alert
const AUDIT_STATE_KEY = "audit_consec_fail_map"; // ScriptProperties key

/** Call from runSystemAudit() after it writes the Weekly_Summary row. */
function maybeSendAuditAlerts(audit) {
// audit = {date, results:[{name, ok, ms, msg}], score, status, avgMs}
const props = PropertiesService.getScriptProperties();
const prevJson = props.getProperty(AUDIT_STATE_KEY) || "{}";
const prev = JSON.parse(prevJson);
const next = {};

// track consecutive failures per service
const failingNames = [];
audit.results.forEach(r => {
const was = prev[r.name] || 0;
const now = r.ok ? 0 : was + 1;
next[r.name] = now;
if (!r.ok) failingNames.push(`${r.name} (${r.ms} ms) :: ${r.msg || ""}`);
});

props.setProperty(AUDIT_STATE_KEY, JSON.stringify(next));

const scoreBreach = audit.score < MIN_HEALTH_SCORE;
const streakBreach = Object.entries(next).some(([_, n]) => n >= CONSEC_FAIL_LIMIT);

if (!scoreBreach && !streakBreach) return; // healthy enough, no email

const subject = `Riley System Alert — Score ${audit.score} | ${audit.status}`;
const body =
`Hi P,

Riley’s weekly self-audit detected an issue.

Date: ${audit.date}
Overall Status: ${audit.status}
Health Score: ${audit.score}
Average Latency: ${audit.avgMs} ms

Failed services this run:
${failingNames.length ? failingNames.map(s => `• ${s}`).join("\n") : "• none"}

Consecutive failure streaks:
${Object.entries(next).map(([k,v]) => `• ${k}: ${v}`).join("\n")}

Action hints:
• If Drive/Docs/Sheets fail: confirm Riley still has folder access and the Apps Script scopes.
• If Gmail fails: ensure inbox exists and API is authorized.
• If Calendar fails: ensure default calendar is accessible.

— Riley Steward Monitor
`;

ALERT_EMAILS.forEach(to => GmailApp.sendEmail(to, subject, body));
}
