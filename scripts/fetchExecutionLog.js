#!/usr/bin/env node
/**
 * fetchExecutionLog.js — pull the Apps Script execution log for a live fire off
 * Drive and save it on disk as output/execution_log_c{XX}.txt.
 *
 * The builder exports the log from the Apps Script editor to Drive as
 * "Execution log LIVE {XX}.txt" (or shares a file link). The service account
 * (lib/sheets.js credentials) can read any file shared with it, so the
 * run-cycle chain saves the log next to the cycle's other artifacts and the
 * engine review reads phase timings / warnings / audit counts from disk instead
 * of a pasted transcript.
 *
 * Usage:
 *   node scripts/fetchExecutionLog.js <cycle>                 # search Drive by name
 *   node scripts/fetchExecutionLog.js <cycle> --file <id|url> # explicit Drive file
 *   node scripts/fetchExecutionLog.js <cycle> --summary       # also print the headline
 *
 * Exit 0 on save; 1 when nothing matched or Drive refused (the chain treats the
 * log as optional — the review then says "execution log not on disk").
 */
require('../lib/env');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const args = process.argv.slice(2);
const cycle = Number(args.find(a => /^\d+$/.test(a)));
if (!cycle) { console.error('Usage: node scripts/fetchExecutionLog.js <cycle> [--file <id|url>] [--summary]'); process.exit(2); }
const fileArgIdx = args.indexOf('--file');
const fileArg = fileArgIdx >= 0 ? args[fileArgIdx + 1] : null;
const wantSummary = args.includes('--summary');

function fileIdFrom(s) {
  if (!s) return null;
  const m = String(s).match(/[-\w]{25,}/);
  return m ? m[0] : null;
}

function summarize(text) {
  const lines = text.split('\n');
  const done = lines.find(l => /Cycle completed\./.test(l)) || '';
  const timing = lines.find(l => /"totalMs"/.test(l));
  let t = null;
  if (timing) { try { t = JSON.parse(timing.slice(timing.indexOf('{'))); } catch (e) { /* not json */ } }
  const warnings = lines.filter(l => /\tWarning\t/.test(l)).length;
  const errors = lines.filter(l => /\tError\t/.test(l)).length;
  const failed = t ? (t.timings || []).filter(p => p.ok === false).map(p => p.phase) : [];
  return {
    phases: t ? t.phaseCount : null,
    totalMs: t ? t.totalMs : null,
    failedPhases: failed,
    slowest: t ? (t.slowest || []).map(p => `${p.phase} ${(p.ms / 1000).toFixed(1)}s`) : [],
    warnings, errors,
    completedLine: done.replace(/^.*\tInfo\t/, '')
  };
}

(async () => {
  const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
  const drive = google.drive({ version: 'v3', auth });
  let fileId = fileIdFrom(fileArg);
  if (!fileId) {
    const q = `name contains 'Execution log' and name contains '${cycle}' and trashed = false`;
    const res = await drive.files.list({ q, fields: 'files(id,name,modifiedTime,size)', orderBy: 'modifiedTime desc', pageSize: 10, includeItemsFromAllDrives: true, supportsAllDrives: true });
    const files = (res.data.files || []).filter(f => new RegExp(`\\b${cycle}\\b`).test(f.name));
    if (!files.length) { console.error(`fetchExecutionLog: no Drive file named like "Execution log … ${cycle}" is shared with the service account — pass --file <id|url>`); process.exit(1); }
    fileId = files[0].id;
    console.log(`matched ${files[0].name} (${files[0].id}, ${files[0].modifiedTime})`);
  }
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' });
  const text = String(res.data);
  if (!/Execution started/.test(text)) { console.error('fetchExecutionLog: file does not look like an Apps Script execution log (no "Execution started")'); process.exit(1); }
  const out = path.join(__dirname, '..', 'output', `execution_log_c${cycle}.txt`);
  fs.writeFileSync(out, text);
  console.log(`saved ${out} (${text.length} bytes)`);
  if (wantSummary) console.log(JSON.stringify(summarize(text), null, 2));
})().catch(e => { console.error('fetchExecutionLog ERR', e.message); process.exit(1); });
