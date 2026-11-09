#!/usr/bin/env node
// runCycle.js — the /run-cycle step runner. Every step of the chain runs
// through here, in order; a step refuses to start until every step before it
// has passed its gate (governance.59, builder 2026-11-09: "Hook every step of
// the run-cycle skill to where you can't advance until the step right before
// is completed").
//
// Usage:
//   node scripts/runCycle.js status <XX>              where the C<XX> chain stands and the next step
//   node scripts/runCycle.js step <id> <XX> [args]    run one step; extra args pass to its script
//   node scripts/runCycle.js list                     the step order
//
// Each step runs the command the skill names, checks the skill's own gate for
// that step, and records the outcome in output/run-cycle/c<XX>.json. Steps
// with no script (4.1 engine review, 6.1 close) check the file the session
// wrote. scripts/runCycleGuard.js (PreToolUse hook, Claude and codex) blocks
// running a step's script by hand while a chain is open, so this runner is the
// only way through. Cycles before FIRST_ENFORCED were run before the gate
// existed and carry no record.
//
// Exit: 0 step passed / status printed · 1 step failed its gate · 2 refused
// (a step before it has not passed, or bad arguments).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const STATE_DIR = process.env.RUN_CYCLE_STATE_DIR || path.join(ROOT, 'output', 'run-cycle');  // env: tests only
const FIRST_ENFORCED = 116;

const out = (...p) => path.join(ROOT, 'output', ...p);
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } };
const mtime = (p) => { try { return fs.statSync(p).mtimeMs; } catch (_) { return 0; } };

function run(args, opts = {}) {
  const r = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: (opts.timeoutSec || 600) * 1000 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', error: r.error };
}

// A step returns { ok, outcome, detail }. outcome names which arm of the
// skill's gate it met ('pass', 'no-journal', ...); ok=false stops the chain.
const STEPS = [
  { id: '1', title: 'Pre-flight', scripts: ['preflightInputCheck'],
    run: (c) => { const r = run(['scripts/preflightInputCheck.js', `--cycle=${c.cycle}`]);
      return r.status === 0 ? { ok: true, outcome: 'pass', detail: 'READY' } : { ok: false, detail: `pre-flight exit ${r.status} (NOT READY)` }; } },

  { id: '2', title: 'Pre-mortem', scripts: ['preMortemScan'],
    run: (c) => { const r = run(['scripts/preMortemScan.js', ...c.args]);
      fs.writeFileSync(out('pre_mortem_scan.txt'), r.stdout + r.stderr);
      return r.status === 0 ? { ok: true, outcome: 'pass', detail: 'no CRITICAL' } : { ok: false, detail: `pre-mortem exit ${r.status} (CRITICAL findings — fix before the fire)` }; } },

  { id: '2.5', title: 'Hand writes since the last fire', scripts: ['engineAuditor'],
    run: (c) => {
      if (c.args.includes('--rebase')) {
        const rb = run(['scripts/engineAuditor.js', '--hand-write-check', ...c.args]);
        if (rb.status !== 0) return { ok: false, detail: `rebase exit ${rb.status}` };
      }
      const r = run(['scripts/engineAuditor.js', '--hand-write-check']);
      const m = (r.stdout + r.stderr).match(/hand-write-check C(\d+)/);
      if (r.status === 0 && m && Number(m[1]) === c.cycle - 1) return { ok: true, outcome: 'pass', detail: `C${c.cycle - 1} close CLEAN` };
      const fired = r.stderr.match(/missing — live reads C(\d+)/);
      if (fired && Number(fired[1]) === c.cycle) {
        return { ok: false, detail: `C${c.cycle} already fired — this check had to run before the fire. The prior closing state cannot be read now; tell the builder.` };
      }
      return { ok: false, detail: `hand-write check exit ${r.status} — explain each cell, then: node scripts/runCycle.js step 2.5 ${c.cycle} --rebase --why "<what wrote them>"` };
    } },

  { id: '3', title: 'Fire confirmed on the live sheet', scripts: [],
    run: async (c) => {
      require('../lib/env');
      const sheets = require('../lib/sheets');
      const [map, errs] = await Promise.all([sheets.getSheetAsObjects('Neighborhood_Map'), sheets.getSheetData('Engine_Errors')]);
      const max = Math.max(...map.map(r => Number(r.Cycle)).filter(Number.isFinite));
      const errorRows = Math.max(0, errs.length - 1);
      return max === c.cycle ? { ok: true, outcome: 'pass', detail: `Neighborhood_Map max Cycle ${max}; Engine_Errors ${errorRows} rows` }
        : { ok: false, detail: `live Neighborhood_Map reads C${max}, not C${c.cycle} — the builder has not fired yet` };
    } },

  { id: '3.5', title: 'Execution log to disk', scripts: ['fetchExecutionLog'],
    run: (c) => { const r = run(['scripts/fetchExecutionLog.js', String(c.cycle), '--summary', ...c.args]);
      const p = out(`execution_log_c${c.cycle}.txt`);
      const text = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
      if (r.status !== 0 || !/Execution started/.test(text) || !/Cycle completed\./.test(text)) return { ok: false, detail: 'execution log not on disk with "Execution started" … "Cycle completed" — ask the builder to export it, then re-run with --file <drive id>' };
      const failed = (r.stdout.match(/"?failedPhases"?:\s*\[([^\]]*)\]/) || [])[1];
      return failed && failed.trim() ? { ok: false, detail: `failed phases: ${failed}` } : { ok: true, outcome: 'pass', detail: 'Cycle completed, 0 failed phases' }; } },

  { id: '4', title: 'Engine audit', scripts: [],  // engineAuditor is claimed by 2.5; the guard treats both modes as chain scripts
    run: (c) => { const t0 = Date.now(); run(['scripts/engineAuditor.js']);
      const a = readJson(out(`engine_audit_c${c.cycle}.json`));
      if (!a || Number(a.cycle) !== c.cycle || mtime(out(`engine_audit_c${c.cycle}.json`)) < t0) return { ok: false, detail: `engine_audit_c${c.cycle}.json not written for C${c.cycle} this run` };
      if (!fs.existsSync(out(`baseline_briefs_c${c.cycle}.json`))) return { ok: false, detail: `baseline_briefs_c${c.cycle}.json missing (required by the civic chain)` };
      return { ok: true, outcome: 'pass', detail: `${(a.patterns || []).length} patterns` }; } },

  { id: '4.1', title: 'Engine review written', scripts: [],
    run: (c) => { const p = out(`engine_review_c${c.cycle}.md`);
      return mtime(p) && mtime(p) >= mtime(out(`engine_audit_c${c.cycle}.json`)) ? { ok: true, outcome: 'pass', detail: path.basename(p) }
        : { ok: false, detail: `write output/engine_review_c${c.cycle}.md from this cycle's audit (per /engine-review), then re-run this step` }; } },

  { id: '5', title: 'World summary + world-data ingest', scripts: ['buildWorldSummary'],
    run: async (c) => { const t0 = Date.now(); run(['scripts/buildWorldSummary.js', String(c.cycle)]);
      const p = out(`world_summary_c${c.cycle}.md`);
      if (mtime(p) < t0 || !fs.existsSync(out(`desk_signal_c${c.cycle}.json`))) return { ok: false, detail: `world_summary_c${c.cycle}.md / desk_signal_c${c.cycle}.json not written this run` };
      const ids = await ingestSummary(c.cycle, fs.readFileSync(p, 'utf8'));
      return ids.every(Boolean) ? { ok: true, outcome: 'pass', detail: `ingested wd-summary ${ids[0]}, wd-snapshot ${ids[1]}` }
        : { ok: false, detail: `world-data ingest returned no id (${ids.map(String).join(', ')}) — re-run this step` }; } },

  { id: '5.56', title: 'Ledger snapshot + beat dump', scripts: ['dumpLedger', 'dumpBeatTabs'],
    run: (c) => { const t0 = Date.now(); run(['scripts/dumpLedger.js', String(c.cycle), '--quiet']); run(['scripts/dumpBeatTabs.js', String(c.cycle), '--quiet']);
      const s = readJson(out('simulation_ledger_snapshot.meta.json')) || {}; const b = readJson(out('beats', 'meta.json')) || {};
      if (Number(s.cycle) !== c.cycle || Date.parse(s.generatedAt) < t0) return { ok: false, detail: `ledger snapshot meta reads C${s.cycle} @ ${s.generatedAt}` };
      if (Number(b.cycle) !== c.cycle || Number(b.prevCycle) !== c.cycle - 1) return { ok: false, detail: `beat dump meta reads C${b.cycle} (prev C${b.prevCycle})` };
      return { ok: true, outcome: 'pass', detail: `snapshot C${c.cycle}; beats C${c.cycle}, prev C${c.cycle - 1}` }; } },

  { id: '5.5', title: 'Neighborhood texture', scripts: ['buildNeighborhoodTexture'],
    run: (c) => { const t0 = Date.now(); const r = run(['scripts/buildNeighborhoodTexture.js', String(c.cycle)]);
      return r.status === 0 && mtime(out(`neighborhood_texture_c${c.cycle}.md`)) >= t0 ? { ok: true, outcome: 'pass', detail: `neighborhood_texture_c${c.cycle}.md` }
        : { ok: false, detail: `texture exit ${r.status}; file not written this run` }; } },

  { id: '5.55', title: 'Voice disposition cache', scripts: ['refreshVoiceDispositionCache'],
    run: (c) => { run(['scripts/refreshVoiceDispositionCache.js', '--live', String(c.cycle)]);
      const dir = out('voice-disposition-cache');
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')) : [];
      const stale = files.filter(f => !fs.readFileSync(path.join(dir, f), 'utf8').includes(`Refreshed: c${c.cycle}`));
      return files.length && !stale.length ? { ok: true, outcome: 'pass', detail: `${files.length} files at c${c.cycle}` }
        : { ok: false, detail: files.length ? `not at c${c.cycle}: ${stale.join(', ')}` : 'no cache files' }; } },

  { id: '5.58', title: 'Civis Systems Journal', scripts: ['civisJournal'],
    run: (c, prior) => civisOutcome(c, run(['scripts/civisJournal.js', '--cycle', String(c.cycle)]), prior) },

  { id: '5.6', title: 'Content-ledger drafter', scripts: ['draftContentRows'],
    run: (c) => { const r = run(['scripts/draftContentRows.js', '--cycle', String(c.cycle), '--apply'], { timeoutSec: 600 });
      const m = r.stdout.match(/wrote \+ verified (\d+) rows/);
      return r.status === 0 && m ? { ok: true, outcome: 'pass', detail: `${m[1]} rows written + verified` }
        : { ok: false, detail: `drafter exit ${r.status}${/ERR/.test(r.stderr) ? ' (ERR — OpenRouter unreachable?)' : ''}; no verified write` }; } },

  { id: '5.7', title: 'Initiative packets', scripts: ['buildInitiativePackets'],
    run: (c) => { const t0 = Date.now(); const r = run(['scripts/buildInitiativePackets.js', String(c.cycle)]);
      return r.status === 0 && mtime(out('initiative_tracker.json')) >= t0 ? { ok: true, outcome: 'pass', detail: 'initiative_tracker.json regenerated' }
        : { ok: false, detail: `exit ${r.status}; initiative_tracker.json not regenerated` }; } },

  { id: '5.8', title: 'Desk packets + base_context', scripts: ['buildDeskPackets'],
    run: (c) => { run(['scripts/buildDeskPackets.js', String(c.cycle)]);
      const b = readJson(out('desk-packets', 'base_context.json'));
      const cyc = b && b.baseContext && Number(b.baseContext.cycle);
      return cyc === c.cycle ? { ok: true, outcome: 'pass', detail: `baseContext.cycle ${cyc}` } : { ok: false, detail: `baseContext.cycle reads ${cyc}` }; } },

  { id: '5.85', title: 'World-state fold', scripts: ['buildWorldState'],
    run: (c) => { const r = run(['scripts/buildWorldState.js', String(c.cycle)]);
      const w = readJson(out('world_state.json'));
      const ok = r.status === 0 && new RegExp(`cycle ${c.cycle}\\b`).test(r.stdout) && /canon current/.test(r.stdout) && w && w.meta && Number(w.meta.cycle) === c.cycle;
      return ok ? { ok: true, outcome: 'pass', detail: 'canon current' } : { ok: false, detail: 'fold not written at this cycle with canon current' }; } },

  { id: '6', title: 'Gap log (mechanical pass)', scripts: ['engineCycleAudit'],
    run: (c) => { const t0 = Date.now(); const r = run(['scripts/engineCycleAudit.js', String(c.cycle), '--write']);
      return r.status === 0 && mtime(out(`production_log_run_cycle_c${c.cycle}_gaps.md`)) >= t0 ? { ok: true, outcome: 'pass', detail: (r.stdout.match(/\d+ mechanical entries[^\n]*/) || [''])[0] }
        : { ok: false, detail: `engineCycleAudit exit ${r.status}; gap log not written this run` }; } },

  { id: '6.1', title: 'Gap log judgment + reads this fire owes', scripts: [],
    run: (c) => closeOutcome(c) },
];

const ORDER = STEPS.map(s => s.id);

// --- Step 5 ingest: the two world-data POSTs the skill's curl loop made -----
async function ingestSummary(cycle, summary) {
  require('../lib/env');
  const key = process.env.SUPERMEMORY_CC_API_KEY;
  if (!key) return [null, null];
  const snapshot = (summary.split('\n').find(l => l.startsWith('Snapshot: Cycle ')) || '');
  const docs = [['wd-summary', summary, 'cycle_summary'], ['wd-snapshot', snapshot, 'cycle_snapshot']];
  const ids = [];
  for (const [tag, content, type] of docs) {
    if (!content) { ids.push(null); continue; }
    try {
      const res = await fetch('https://api.supermemory.ai/v3/documents', {
        method: 'POST', signal: AbortSignal.timeout(60000),
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, containerTags: ['world-data', tag], metadata: { type, cycle: String(cycle) } }),
      });
      const j = await res.json().catch(() => ({}));
      ids.push(j.id || null);
    } catch (_) { ids.push(null); }
  }
  return ids;
}

// --- Step 5.58: the skill's outcome table, both gate arms -------------------
function civisOutcome(c, r, prior) {
  const last = r.stdout.trim().split('\n').pop() || '';
  let j = null; try { j = JSON.parse(last); } catch (_) { /* not the result line */ }
  const retried = prior && prior.outcome === 'retry';
  if (j && (j.path || j.skipped === 'already-recorded')) {
    const rec = readJson(out('civis-journal', `civis_journal_c${c.cycle}.json`));
    const okKeys = rec && Number(rec.cycle) === c.cycle && rec.replayKey === `POP-00789:C${c.cycle}:journal` && rec.pageCustomId === `cp-POP-00789-c${c.cycle}-journal`
      && fs.existsSync(out('civis-journal', `civis_journal_c${c.cycle}.md`));
    return okKeys ? { ok: true, outcome: 'journal', detail: 'journal written, keys match' } : { ok: false, detail: 'journal files missing or carry the wrong keys — read both before touching them' };
  }
  if (j && j.skipped === 'model-failure') {
    return retried ? { ok: true, outcome: 'no-journal', detail: 'model-failure twice — no journal this week; log it in the Step 6 gap log' }
      : { ok: false, outcome: 'retry', detail: 'model-failure — re-run this step once' };
  }
  if (j && j.skipped === 'assertion-failure') {
    return /Civis Sonnet failed or returned invalid output/.test(r.stderr) && !retried ? { ok: false, outcome: 'retry', detail: 'assertion-failure and Sonnet never got a turn — re-run this step once' }
      : { ok: true, outcome: 'no-journal', detail: 'assertion-failure — no journal this week; log it in the Step 6 gap log' };
  }
  const err = r.stderr;
  if (/audit has no patterns/.test(err)) return { ok: true, outcome: 'no-journal', detail: 'quiet audit — no journal this week' };
  const absent = err.match(/audit target absent from current beat dump: ([^\n]*)/);
  if (absent) return { ok: true, outcome: 'no-journal', detail: `defect: audit target absent from the beat dump: ${absent[1]} — file it; no journal this week` };
  return { ok: false, detail: `civisJournal exit ${r.status}: ${(err.match(/civisJournal failed:[^\n]*/) || [last])[0]} — fix the step that owns the input and re-run` };
}

// --- Step 6.1: judgment entries written, HIGH pointer, owed reads done ------
function closeOutcome(c) {
  const p = out(`production_log_run_cycle_c${c.cycle}_gaps.md`);
  const text = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  const marker = text.indexOf('<!-- end mechanical pass');
  const below = marker >= 0 ? text.slice(marker) : '';
  const zeroMech = /0 mechanical gaps observed/.test(text);
  if (!zeroMech && !/\[judgment\]/.test(below.replace(/Tag each entry `\[judgment\]`/, ''))) return { ok: false, detail: `append the [judgment] entries below the end-of-mechanical-pass marker in ${path.basename(p)}` };
  const high = Number((text.match(/\*\*Mechanical pass:\*\* \d+ entries \(HIGH (\d+)/) || [])[1] || 0);
  if (high > 0) {
    const rollout = fs.readFileSync(path.join(ROOT, 'docs', 'engine', 'ROLLOUT_PLAN.md'), 'utf8');
    if (!rollout.includes(`RUN-CYCLE C${c.cycle} GAP LOG`)) return { ok: false, detail: `${high} HIGH finding(s): add the ROLLOUT pointer "RUN-CYCLE C${c.cycle} GAP LOG — …"` };
  }
  const due = spawnSync('node', ['scripts/docLoopStatus.js', '--due'], { cwd: ROOT, encoding: 'utf8' }).stdout || '';
  const m = due.match(/DUE AT C(\d+)[^:]*: (\d+) read/);
  if (!m) return { ok: false, detail: 'docLoopStatus --due printed no count — the PIN names no next fire' };
  if (Number(m[1]) !== c.cycle) return { ok: false, detail: `the PIN names C${m[1]} as the next fire, not C${c.cycle} — the owed reads for C${c.cycle} cannot be checked` };
  if (Number(m[2]) > 0) return { ok: false, detail: `${m[2]} ROLLOUT read(s) still name C${c.cycle} — read each on live, then flip or re-date its row:\n${due.trim()}` };
  return { ok: true, outcome: 'pass', detail: `judgment entries in; ${high} HIGH; 0 reads owed at C${c.cycle}` };
}

// --- chain record -------------------------------------------------------------
const statePath = (cycle) => path.join(STATE_DIR, `c${cycle}.json`);
function loadState(cycle) { return readJson(statePath(cycle)) || { cycle, steps: {} }; }
function saveState(st) { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(statePath(st.cycle), JSON.stringify(st, null, 2) + '\n'); }
const passed = (rec) => !!(rec && rec.ok);
const isClosed = (st) => passed(st.steps['6.1']);

// The first step before `id` (in chain order) that has not passed, or null.
function blocker(st, id) {
  for (const prev of ORDER.slice(0, ORDER.indexOf(id))) if (!passed(st.steps[prev])) return prev;
  return null;
}
function nextStep(st) { return ORDER.find(id => !passed(st.steps[id])) || null; }

function printStatus(cycle) {
  const st = loadState(cycle);
  console.log(`run-cycle C${cycle}${cycle < FIRST_ENFORCED ? ' (before the gate existed — no record)' : ''}`);
  for (const s of STEPS) {
    const rec = st.steps[s.id];
    const mark = passed(rec) ? 'done' : rec ? 'FAILED' : '—';
    console.log(`  ${s.id.padEnd(5)} ${mark.padEnd(7)} ${s.title}${rec ? ` · ${rec.outcome || ''} ${rec.detail || ''}`.replace(/\s+/g, ' ') : ''}${rec ? ` · ${rec.at}` : ''}`);
  }
  const n = nextStep(st);
  console.log(n ? `next: node scripts/runCycle.js step ${n} ${cycle}` : `C${cycle} chain closed.`);
}

async function runStep(id, cycle, args) {
  const step = STEPS.find(s => s.id === id);
  if (!step) { console.error(`unknown step "${id}". Order: ${ORDER.join(' → ')}`); return 2; }
  const st = loadState(cycle);
  const b = blocker(st, id);
  if (b) {
    console.error(`REFUSED: Step ${id} (${step.title}) cannot start — Step ${b} (${STEPS.find(s => s.id === b).title}) has not passed for C${cycle}.`);
    console.error(`next: node scripts/runCycle.js step ${nextStep(st)} ${cycle}`);
    return 2;
  }
  console.log(`=== C${cycle} Step ${id}: ${step.title}`);
  let res;
  try { res = await step.run({ cycle, args }, st.steps[id]); }
  catch (e) { res = { ok: false, detail: `threw: ${e.message}` }; }
  st.steps[id] = { ok: !!res.ok, outcome: res.outcome || (res.ok ? 'pass' : 'fail'), detail: res.detail || '', at: new Date().toISOString() };
  saveState(st);
  console.log(`=== Step ${id} ${res.ok ? 'PASSED' : 'FAILED'}: ${res.detail || ''}`);
  if (res.ok) { const n = nextStep(st); console.log(n ? `next: node scripts/runCycle.js step ${n} ${cycle}` : `C${cycle} chain closed.`); }
  return res.ok ? 0 : 1;
}

async function main(argv) {
  const [cmd, a, b, ...rest] = argv;
  if (cmd === 'list') { for (const s of STEPS) console.log(`${s.id.padEnd(5)} ${s.title}`); return 0; }
  if (cmd === 'status' && /^\d+$/.test(a || '')) { printStatus(Number(a)); return 0; }
  if (cmd === 'step' && a && /^\d+$/.test(b || '')) return runStep(a, Number(b), rest);
  console.error('Usage: node scripts/runCycle.js status <XX> | step <id> <XX> [args] | list');
  return 2;
}

module.exports = { STEPS, ORDER, FIRST_ENFORCED, STATE_DIR, loadState, isClosed, blocker, nextStep, civisOutcome };

if (require.main === module) main(process.argv.slice(2)).then(code => process.exit(code));
