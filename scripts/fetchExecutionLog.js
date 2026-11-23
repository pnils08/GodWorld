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
 *
 * engine.358 (builder 2026-11-23): the engine writes its own run record to the
 * Engine_Run_Log tab. Without --file, that record is read first — the latest
 * `done` record for the Cycle with real phase timings (a resumed fire's log is
 * joined after its checkpointed part, same checkpointGen) — and rendered to
 * execution_log_c{XX}.txt in the shape every reader parses, plus the record as
 * execution_log_c{XX}.json. No such record → the Drive export, as before.
 */
require('../lib/env');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const args = process.argv.slice(2);
const cycle = Number(args.find(a => /^\d+$/.test(a)));
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
  // engine.358 (agy): the LAST timing and completed lines are the run's own — an earlier copy
  // (a checkpointed part's) can never pass the gate for a resume that failed.
  const done = lines.findLast(l => /Cycle completed\./.test(l)) || '';
  const timing = lines.findLast(l => /"totalMs"/.test(l));
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

// ── engine.358: the engine's own run record ──────────────────────────────────
const unTilde = v => { const t = String(v == null ? '' : v); return t.charAt(0) === '~' ? t.slice(1) : t; };

// rows = Engine_Run_Log data rows (no header): [Cycle, StartedAt, State, Lifecycle, Part, Parts, RecordJSON]
function recordsFromRows(rows) {
  const groups = new Map();
  for (const r of rows || []) {
    const key = unTilde(r[0]) + '|' + unTilde(r[1]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ part: Number(unTilde(r[4])), parts: Number(unTilde(r[5])), data: unTilde(r[6]) });
  }
  const out = [];
  for (const parts of groups.values()) {
    parts.sort((a, b) => a.part - b.part);
    const n = parts[0] && parts[0].parts;
    if (!n || parts.length !== n || parts.some((p, i) => p.part !== i + 1 || p.parts !== n)) continue;   // incomplete or mixed: never read (agy 2026-11-23)
    try { out.push(JSON.parse(parts.map(p => p.data).join(''))); } catch (_) { /* unreadable: skipped */ }
  }
  return out;
}

function pickRecord(records, cyc) {
  const real = r => r && Number(r.cycle) === Number(cyc) && r.state === 'done' &&
    r.timing && Array.isArray(r.timing.timings) && r.timing.timings.length > 0;
  const done = records.filter(real).sort((a, b) => String(b.runStartedAt).localeCompare(String(a.runStartedAt)))[0];
  if (!done) return null;
  if (done.lifecycle === 'resumed' && done.checkpointGen != null) {
    const ck = records.find(r => Number(r.cycle) === Number(cyc) && r.lifecycle === 'checkpointed' && r.checkpointGen === done.checkpointGen);
    return Object.assign({}, done, { log: ((ck && ck.log) || []).concat(done.log || []), checkpointedPart: !!ck });
  }
  return done;
}

function renderRecord(rec) {
  const L = [];
  L.push('source: Engine_Run_Log | startedAt: ' + rec.runStartedAt + ' | state: ' + rec.state + ' | lifecycle: ' + rec.lifecycle);
  L.push('Execution started');
  for (const l of rec.log || []) L.push(l);
  L.push('PHASE_TIMING_BEGIN');
  L.push(JSON.stringify(rec.timing));
  L.push('PHASE_TIMING_END');
  L.push('Cycle completed. Engine errors logged: ' + (rec.engineErrors == null ? 'n/a' : rec.engineErrors) +
    '; audit issues tracked: ' + (rec.auditIssues == null ? 'n/a' : rec.auditIssues) +
    '; rng draws: ' + (rec.rngDraws == null ? 'n/a' : rec.rngDraws));
  return L.join('\n') + '\n';
}

async function fromRunRecord(cyc) {
  try {
    const sheets = require('../lib/sheets');
    const data = await sheets.getSheetData('Engine_Run_Log');
    const rec = pickRecord(recordsFromRows((data || []).slice(1)), cyc);
    return rec;
  } catch (e) {
    console.error('fetchExecutionLog: Engine_Run_Log not readable (' + e.message + ') — trying Drive');
    return null;
  }
}

async function main() {
  if (!cycle) { console.error('Usage: node scripts/fetchExecutionLog.js <cycle> [--file <id|url>] [--summary]'); process.exit(2); }
  const out = path.join(__dirname, '..', 'output', `execution_log_c${cycle}.txt`);
  if (!fileArg) {
    const rec = await fromRunRecord(cycle);
    if (rec) {
      const text = renderRecord(rec);
      fs.writeFileSync(out, text);
      fs.writeFileSync(out.replace(/\.txt$/, '.json'), JSON.stringify(rec, null, 2));
      console.log(`saved ${out} (${text.length} bytes) from Engine_Run_Log (startedAt ${rec.runStartedAt}${rec.checkpointedPart ? ', checkpointed part joined' : ''})`);
      if (wantSummary) console.log(JSON.stringify(summarize(text), null, 2));
      return;
    }
    console.log(`no done run record for C${cycle} on Engine_Run_Log — searching Drive for the export`);
  }
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
  fs.writeFileSync(out, text);
  console.log(`saved ${out} (${text.length} bytes)`);
  if (wantSummary) console.log(JSON.stringify(summarize(text), null, 2));
}

if (require.main === module) main().catch(e => { console.error('fetchExecutionLog ERR', e.message); process.exit(1); });

module.exports = { summarize, recordsFromRows, pickRecord, renderRecord, unTilde };
