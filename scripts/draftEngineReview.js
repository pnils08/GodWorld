#!/usr/bin/env node
/**
 * draftEngineReview.js — governance.62 (builder 2026-11-23: "Go on 11"; C117 gap log G-EC42c).
 *
 * Writes output/engine_review_c{XX}.md from what the chain already holds — the
 * audit, the anomalies, the briefs, the run record / execution log (Step 3.5),
 * the Step 2.5 hand-write result, the Engine_Errors rows for the Cycle — so the
 * session writes only the calls: for each finding, is it a world event or the
 * engine's own fault, and where does it go. The calls section carries a marker
 * Step 4.1 refuses on until the session replaces it.
 *
 * Never overwrites calls: when engine_review_c{XX}.md already exists without the
 * marker (the session wrote its calls), the draft goes to
 * engine_review_c{XX}.draft.md instead and the existing review is untouched.
 *
 * Usage: node scripts/draftEngineReview.js <cycle> [--no-sheet]
 *   --no-sheet  skip the Engine_Errors read (the review says so)
 */
require('../lib/env');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'output');
const MARKER = '<!-- CALLS-PENDING: the session replaces this line with its calls; Step 4.1 refuses while it stands -->';

const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } };
const list = a => (a || []).filter(Boolean).join(', ');
const cell = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

function fireLines(cycle) {
  const L = [];
  const rec = readJson(path.join(OUT, `execution_log_c${cycle}.json`));
  let sum = null;
  const txtPath = path.join(OUT, `execution_log_c${cycle}.txt`);
  if (fs.existsSync(txtPath)) {
    try { sum = require('./fetchExecutionLog').summarize(fs.readFileSync(txtPath, 'utf8')); } catch (_) { sum = null; }
  }
  if (!sum) { L.push('- Execution log not on disk (Step 3.5) — the fire is read from the sheet only.'); return L; }
  L.push(`- ${sum.phases} phases, ${(sum.totalMs / 1000).toFixed(1)} s, ${sum.failedPhases.length} failed phase(s)${sum.failedPhases.length ? ' (' + sum.failedPhases.join(', ') + ')' : ''}, ${sum.warnings} warning(s), ${sum.errors} error(s) (\`output/execution_log_c${cycle}.txt\`${rec ? ', from the Engine_Run_Log record' : ', from the Drive export'}).`);
  if (sum.completedLine) L.push(`- Completed line: ${sum.completedLine.trim()}`);
  if (sum.slowest && sum.slowest.length) L.push(`- Slowest: ${sum.slowest.join(' · ')}.`);
  return L;
}

async function engineErrorLines(cycle, noSheet) {
  if (noSheet) return ['- Engine_Errors not read (--no-sheet).'];
  try {
    const rows = (await require('../lib/sheets').getSheetData('Engine_Errors')) || [];
    const h = rows[0] || [], ci = h.indexOf('Cycle'), pi = h.indexOf('Phase'), ei = h.indexOf('Error');
    const mine = rows.slice(1).filter(r => String(r[ci]) === String(cycle));
    if (!mine.length) return [`- Engine_Errors: ${rows.length - 1} row(s), none for C${cycle}.`];
    return [`- Engine_Errors: ${mine.length} row(s) for C${cycle}:`].concat(mine.slice(0, 12).map(r => `  - ${cell(r[pi])}: ${cell(String(r[ei]).slice(0, 180))}`));
  } catch (e) { return [`- Engine_Errors not readable (${e.message}).`]; }
}

function handWriteLine(cycle) {
  const st = readJson(path.join(OUT, 'run-cycle', `c${cycle}.json`));
  const s = st && st.steps && st.steps['2.5'];
  return s ? `- Hand writes since C${cycle - 1} (Step 2.5): ${s.detail || s.outcome}.` : '- Step 2.5 not recorded for this Cycle.';
}

function patternRow(p, i, cycle) {
  const e = p.affectedEntities || {};
  const where = list(e.neighborhoods) || 'Citywide';
  const inits = list(e.initiatives);
  return `| C${cycle}-${i} | ${cell(p.type)} | ${cell(p.severity)} | ${cell(where)}${inits ? ' · ' + cell(inits) : ''} | ${cell(p.description)} | _call_ |`;
}

async function draft(cycle, opts = {}) {
  const audit = readJson(path.join(OUT, `engine_audit_c${cycle}.json`));
  if (!audit || Number(audit.cycle) !== Number(cycle)) throw new Error(`engine_audit_c${cycle}.json missing or for another Cycle — run Step 4 first`);
  const anom = readJson(path.join(OUT, `engine_anomalies_c${cycle}.json`)) || { anomalies: [] };
  const briefs = readJson(path.join(OUT, `baseline_briefs_c${cycle}.json`)) || { briefs: [] };
  const pats = audit.patterns || [];
  const isImp = p => p.type === 'improvement';
  const L = [];
  L.push(`# Engine Review — C${cycle}`, '');
  L.push(`Drafted by \`scripts/draftEngineReview.js\` from \`output/engine_audit_c${cycle}.json\` (${pats.length} patterns), \`engine_anomalies_c${cycle}.json\` (${(anom.anomalies || []).length}), \`baseline_briefs_c${cycle}.json\` (${(briefs.briefs || []).length}), the execution log and the run-cycle record. The session writes the calls (§Calls). Written for the next engine session and the civic chain's reader: what is real, what is mechanism, what goes to engine-debug.`, '');
  L.push('## Fire', '');
  L.push(...fireLines(cycle));
  L.push(...await engineErrorLines(cycle, opts.noSheet));
  L.push(handWriteLine(cycle), '');
  const sb = audit.citizenScoreboard && audit.citizenScoreboard.counts;
  if (sb) { L.push('## Scoreboard', '', Object.entries(sb).map(([k, v]) => `${k} ${v}`).join(' · ') + '.', ''); }
  L.push('## Findings', '', `Each row is the record's own words; the id matches the desk signal's \`finding C${cycle}-<i>\`. The Call column is the session's.`, '');
  L.push('| Id | Type | Sev | Where | Record | Call |', '|---|---|---|---|---|---|');
  pats.forEach((p, i) => { if (!isImp(p)) L.push(patternRow(p, i, cycle)); });
  L.push('');
  const imps = pats.map((p, i) => [p, i]).filter(([p]) => isImp(p));
  if (imps.length) {
    L.push('## Improvements', '');
    for (const [p, i] of imps) L.push(`- C${cycle}-${i}: ${p.description}`);
    L.push('');
  }
  L.push('## Anomalies', '');
  if (!(anom.anomalies || []).length) L.push('- none.');
  for (const a of anom.anomalies || []) L.push(`- [${a.severity}] ${a.description} — triage \`${a.triagePath}\` (${a.confidence}). _call_`);
  L.push('', '## Baseline briefs', '', `${(briefs.briefs || []).length} written; pass-through to the civic chain (\`cron-civic-run\` required input). Not hand-edited.`, '');
  L.push('## Calls', '', MARKER, '');
  return L.join('\n') + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  const cycle = Number(args.find(a => /^\d+$/.test(a)));
  if (!cycle) { console.error('Usage: node scripts/draftEngineReview.js <cycle> [--no-sheet]'); process.exit(2); }
  const text = await draft(cycle, { noSheet: args.includes('--no-sheet') });
  const review = path.join(OUT, `engine_review_c${cycle}.md`);
  const existing = fs.existsSync(review) ? fs.readFileSync(review, 'utf8') : null;
  const target = existing && !existing.includes(MARKER) ? review.replace(/\.md$/, '.draft.md') : review;
  fs.writeFileSync(target, text);
  console.log(target === review ? `wrote ${path.relative(ROOT, review)} — the session writes §Calls`
    : `kept ${path.relative(ROOT, review)} (its calls are written); draft at ${path.relative(ROOT, target)}`);
}

if (require.main === module) main().catch(e => { console.error('draftEngineReview failed: ' + e.message); process.exit(1); });

module.exports = { draft, MARKER };
