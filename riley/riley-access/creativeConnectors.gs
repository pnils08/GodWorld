/***********************************
* creativeConnectors.gs (v1.0)
* Exports a sheet (or range) to PNG and
* posts payloads to Canva/Figma webhooks.
***********************************/

// ====== CONFIG ======
const CREATIVE_CFG = {
// TODO: swap in your real endpoints
CANVA_WEBHOOK_URL: 'https://webhook.site/adce6da6-0957-4d66-ac6f-85d41489b502',
FIGMA_WEBHOOK_URL: 'https://webhook.site/adce6da6-0957-4d66-ac6f-85d41489b502',

// REQUIRED: the spreadsheet that holds Daily_Summary / Weekly_Dashboard
SPREADSHEET_ID: '1lm-zXxAPeakCW6-xT-JjTK3VATkBsbkdSBlNYMp1-QI',

// Default exports
DEFAULT_SHEET_EXPORT: {
sheetName: 'Weekly_Dashboard', // or 'Daily_Summary'
rangeA1: null, // null = whole sheet; or e.g. 'A1:E20'
pngScale: 2 // retina-ish
},

// Public link role for exported PNGs
DRIVE_LINK_ROLE: DriveApp.Access.ANYONE_WITH_LINK, // view-only link
};

// ====== PUBLIC ENTRY POINTS ======

/**
* One-shot publisher: grab dashboard, export PNG, send to both webhooks.
* Use this in a time trigger (e.g., weekly after your rollup finishes).
*/
function publishWeeklyCreative() {
const exp = exportSheetToPng_(
CREATIVE_CFG.SPREADSHEET_ID,
CREATIVE_CFG.DEFAULT_SHEET_EXPORT.sheetName,
CREATIVE_CFG.DEFAULT_SHEET_EXPORT.rangeA1,
CREATIVE_CFG.DEFAULT_SHEET_EXPORT.pngScale
);

const summary = collectWeeklyKpis_(); // pulls from Daily_Summary (this week)

// Post to Canva
postJson_(CREATIVE_CFG.CANVA_WEBHOOK_URL, {
vendor: 'canva',
title: `Weekly KPIs · ${summary.window}`,
pngUrl: exp.publicUrl,
fileId: exp.fileId,
kpis: summary.kpis
});

// Post to Figma
postJson_(CREATIVE_CFG.FIGMA_WEBHOOK_URL, {
vendor: 'figma',
title: `Weekly KPIs · ${summary.window}`,
pngUrl: exp.publicUrl,
fileId: exp.fileId,
kpis: summary.kpis
});

Logger.log(`Published creative payloads. PNG: ${exp.publicUrl}`);
}

/**
* Daily version: pushes Daily_Summary as image + KPIs.
*/
function publishDailyCreative() {
const exp = exportSheetToPng_(
CREATIVE_CFG.SPREADSHEET_ID,
'Daily_Summary',
null,
2
);

const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'EEE MMM dd yyyy');

const kpis = pullDailyKpisRow_(); // returns latest row’s counts

postJson_(CREATIVE_CFG.CANVA_WEBHOOK_URL, {
vendor: 'canva',
title: `Daily Summary · ${today}`,
pngUrl: exp.publicUrl,
fileId: exp.fileId,
kpis
});

postJson_(CREATIVE_CFG.FIGMA_WEBHOOK_URL, {
vendor: 'figma',
title: `Daily Summary · ${today}`,
pngUrl: exp.publicUrl,
fileId: exp.fileId,
kpis
});

Logger.log(`Published daily creative payloads. PNG: ${exp.publicUrl}`);
}

// ====== HELPERS ======

/**
* Export a sheet or range to PNG and make it public-link viewable.
* Returns {fileId, publicUrl}.
*/
function exportSheetToPng_(spreadsheetId, sheetName, rangeA1, scale) {
const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);

// Build export URL
// Docs ref: export?format=png&gid=... etc
const gid = sheet.getSheetId();
const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`;
const params = {
format: 'png',
gid: gid,
scale: scale || 2, // 1–3
portrait: false,
gridlines: false
};

// Optional range clip
if (rangeA1) {
const r = sheet.getRange(rangeA1);
params['r1'] = r.getRow() - 1;
params['c1'] = r.getColumn() - 1;
params['r2'] = r.getLastRow();
params['c2'] = r.getLastColumn();
}

const qs = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
const url = `${base}?${qs}`;

const blob = UrlFetchApp.fetch(url, {
headers: { 'Authorization': `Bearer ${ScriptApp.getOAuthToken()}` },
muteHttpExceptions: true
}).getBlob().setName(`${sheetName}_${Date.now()}.png`);

// Save to Drive
const file = DriveApp.createFile(blob);
file.setSharing(CREATIVE_CFG.DRIVE_LINK_ROLE, DriveApp.Permission.VIEW);

return {
fileId: file.getId(),
publicUrl: `https://drive.google.com/uc?export=view&id=${file.getId()}`
};
}

/**
* Collect this week’s KPIs from Daily_Summary.
* Expects headers: Date | Total Entries | Error Count | Check Count | Last Vault Sync
*/
function collectWeeklyKpis_() {
const ss = SpreadsheetApp.openById(CREATIVE_CFG.SPREADSHEET_ID);
const sh = ss.getSheetByName('Daily_Summary');
if (!sh) throw new Error('Daily_Summary sheet missing');

const values = sh.getDataRange().getValues();
if (values.length < 2) return { window: '—', kpis: {} };

const headers = values[0];
const rows = values.slice(1).filter(r => r[0]); // non-empty dates

// last 7 rows (or fewer)
const recent = rows.slice(-7);

const idx = (name) => headers.indexOf(name);
const totalEntries = recent.reduce((a, r) => a + (Number(r[idx('Total Entries')]) || 0), 0);
const errors = recent.reduce((a, r) => a + (Number(r[idx('Error Count')]) || 0), 0);
const checks = recent.reduce((a, r) => a + (Number(r[idx('Check Count')]) || 0), 0);
const lastSync = (recent[recent.length - 1] || [,,,, '—'])[idx('Last Vault Sync')];

const window = `${recent[0]?.[0] || '—'} → ${recent[recent.length - 1]?.[0] || '—'}`;

return {
window,
kpis: {
totalEntries,
errors,
checks,
lastSync
}
};
}

/**
* Pull the latest row from Daily_Summary as KPIs.
*/
function pullDailyKpisRow_() {
const ss = SpreadsheetApp.openById(CREATIVE_CFG.SPREADSHEET_ID);
const sh = ss.getSheetByName('Daily_Summary');
const values = sh.getDataRange().getValues();
if (values.length < 2) return {};
const headers = values[0];
const last = values[values.length - 1];
const m = {};
headers.forEach((h, i) => m[h] = last[i]);
return {
totalEntries: Number(m['Total Entries']) || 0,
errors: Number(m['Error Count']) || 0,
checks: Number(m['Check Count']) || 0,
lastSync: m['Last Vault Sync'] || '—'
};
}

/** POST JSON to a webhook. */
function postJson_(url, obj) {
if (!url || url.indexOf('http') !== 0) {
Logger.log('Skipped postJson_: missing/invalid URL');
return;
}
const res = UrlFetchApp.fetch(url, {
method: 'post',
contentType: 'application/json',
payload: JSON.stringify(obj),
muteHttpExceptions: true
});
Logger.log(`POST -> ${url} :: ${res.getResponseCode()}`);
}
