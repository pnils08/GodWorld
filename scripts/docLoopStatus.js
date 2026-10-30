#!/usr/bin/env node
// docLoopStatus.js — Surface the doc-loop state. DETECTOR ONLY — it surfaces,
// the session decides (detector/framer split; same discipline that retired
// rolloutTriage.js, S235). No priority-ranking, no auto-firing watch triggers,
// no writes.
//
// Per ROLLOUT governance.28 (S250). Enabled by governance.27's uniform fields
// (state tags S204 + research verdict enum) — this is the script the structure
// was built to make possible.
//
// Three surfacings over the now-uniform fields:
//   1. archive  — `done-pending-archive` rows eligible to move to ROLLOUT_ARCHIVE
//   2. next     — `ready` rows, grouped by terminal ("pickable now, by whom")
//   3. watch    — `watch`-verdict research files + their triggers (the Watch List)
//
// Usage:
//   node scripts/docLoopStatus.js            # full report (all three)
//   node scripts/docLoopStatus.js --archive  # sweep candidates only
//   node scripts/docLoopStatus.js --next     # ready-by-terminal only
//   node scripts/docLoopStatus.js --watch    # watch-verdict research only
//   node scripts/docLoopStatus.js --json     # machine-readable, all three
//   node scripts/docLoopStatus.js --lint     # flag rows that break the archive sweep, + overdue waits (exit 0)
//   node scripts/docLoopStatus.js --plans    # the rollout read by plan: each plan in motion, its rows and states
//   node scripts/docLoopStatus.js --plans --write  # same, written into ROLLOUT_PLAN.md's generated block
//   node scripts/docLoopStatus.js --gate     # same, but exit 1 on problems (pre-commit gate)
//   node scripts/docLoopStatus.js --stale-next  # only NEXT lines leading with a closed row; silent when none (exit 0)
//
// Exits 0 in every mode EXCEPT --gate (S335) — it's a surfacing report by default.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROLLOUT = path.join(ROOT, 'docs', 'engine', 'ROLLOUT_PLAN.md');
const RESEARCH_DIR = path.join(ROOT, 'docs', 'research');
const RESEARCH_SKIP = new Set(['RESEARCH_TEMPLATE.md', 'index.md']);

const STATES = new Set([
  'ready', 'in-progress', 'live-observing', 'done-pending-archive', 'blocked', 'needs-info', 'wontfix', 'parked',
]);
// Conformance budget for a row's item cell (the title between the id and state
// cells). A ROLLOUT row is a POINTER: one actionable line + a → plan-pointer.
// History/status/narrative lives in the plan or research MD the pointer names,
// NOT the row (rollout-rules §1). Over budget = the row became a notes blob →
// drain it to its plan doc. 280 fits a real one-liner + pointer with headroom;
// genuinely-lean rows run 40–215 chars. (governance.30 / S274.)
const ITEM_BUDGET = 280;
// Ratchet (builder 2026-10-28, "the docs need guardrails"): a row a commit adds or
// changes must fit TOUCHED_BUDGET; untouched rows keep the old budget until trimmed.
const TOUCHED_BUDGET = 160;
// The header above section 1 stays a contract, not a status log.
const HEADER_MAX_LINES = 6;
// Section ↔ state (rollout-rules §Sections): a row sits in the section its state names.
const SECTION_STATES = {
  1: new Set(['needs-info']),
  2: new Set(['live-observing', 'blocked', 'parked']),
  3: new Set(['in-progress']),
  4: new Set(['ready', 'done-pending-archive', 'wontfix']),
};
// Job model (builder 2026-10-23): the only values an in-progress row's Terminal cell may hold.
const BUILDER_TERMINALS = new Set(['research-build', 'engine-sheet']);
const VERDICTS = new Set(['adopt', 'watch', 'take-nothing']);
// A work row leads with a `group.number` id cell, e.g. governance.28, engine.31, civic.10b.
const ROW_ID = /^\|\s*([a-z][a-z-]*\.\d+[a-z]?)\s*\|/;

// --- ROLLOUT parse -------------------------------------------------------
// Rows are markdown tables: | id | desc | state | terminal | pointer |
// We locate the STATE cell by controlled-vocab value (robust to pipes earlier
// in the desc), then terminal = next cell, pointer = last non-empty cell.
function parseRollout() {
  const rows = [];
  const lines = fs.readFileSync(ROLLOUT, 'utf8').split('\n');
  for (const line of lines) {
    const idMatch = line.match(ROW_ID);
    if (!idMatch) continue;
    const cells = line.split('|').map(c => c.trim());
    const stateIdx = cells.findIndex(c => STATES.has(c));
    if (stateIdx === -1) continue;
    const id = idMatch[1];
    const state = cells[stateIdx];
    const terminal = cells[stateIdx + 1] || '(unspecified)';
    // Pointer = last cell, but only trust it when it's pointer-shaped. Some
    // descriptions contain literal `|`, which splits a fragment into the tail
    // cell. The id is the reliable lookup key; the pointer is decoration.
    const nonEmpty = cells.filter(Boolean);
    const last = nonEmpty[nonEmpty.length - 1] || '';
    const isPtr = /^(\[\[|source:|http|enabled by|→ FOLDED|absorbs)/i.test(last);
    // Truncate for scannability — the id is the lookup key, the pointer is a hint.
    const pointer = isPtr ? (last.length > 90 ? last.slice(0, 90) + ' …' : last) : '';
    rows.push({ id, state, terminal, pointer });
  }
  return rows;
}

// --- lint: rows that won't survive the archive-sweep contract -----------
// A work row (leads with `group.N` id) sweeps cleanly only when EXACTLY ONE
// cell equals a state token. Zero → the sweep + this detector silently SKIP it
// (it never archives → piles up → reconciliation token-burn). Two+ → a stray `|`
// or a state-word (e.g. "ready") sitting in the prose creates a phantom state
// cell, and the sweep may split on the wrong one. Both are the real failure
// mode behind "the cleanup script won't work with too much prose."
// Zero false-positives on legacy verbose rows — they're well-formed (one state).
function lintRollout() {
  const problems = [];
  const lines = fs.readFileSync(ROLLOUT, 'utf8').split('\n');
  const firstSec = lines.findIndex(l => /^## 1\./.test(l));
  const headerLines = lines.slice(1, firstSec === -1 ? lines.length : firstSec).filter(l => l.trim()).length;
  if (headerLines > HEADER_MAX_LINES) {
    problems.push(`  header: ${headerLines} non-blank lines above section 1 > ${HEADER_MAX_LINES} → status notes crept into the header. Fix: the header holds the contract and the working order only.`);
  }
  let section = 0;
  lines.forEach((line, i) => {
    const sec = line.match(/^## (\d)\./);
    if (sec) section = Number(sec[1]);
    const idMatch = line.match(ROW_ID);
    if (!idMatch) return;
    const id = idMatch[1];
    const cells = line.split('|').map(c => c.trim());
    const stateCells = cells.filter(c => STATES.has(c));
    if (stateCells.length === 0) {
      problems.push(`  L${i + 1} ${id}: NO clean state-token cell → the sweep SILENTLY SKIPS this row (never archives). Fix: a bare \`| <state> |\` cell, no prose/pipes mangling it.`);
    } else if (stateCells.length > 1) {
      problems.push(`  L${i + 1} ${id}: ${stateCells.length} cells match a state token (${stateCells.join(', ')}) → a stray \`|\` or a state-word in the description is faking a state cell; the sweep may grab the wrong one. Fix: remove the literal \`|\` / state-word from the description.`);
    } else {
      // Clean state cell — now check the item cell stayed a pointer, not a blob.
      const sIdx = cells.findIndex(c => STATES.has(c));
      const itemLen = sIdx > 2 ? cells.slice(2, sIdx).join(' | ').length : line.length;
      if (itemLen > ITEM_BUDGET) {
        problems.push(`  L${i + 1} ${id}: item cell ${itemLen} chars > ${ITEM_BUDGET} budget → this row is a notes blob, not a pointer. Fix: drain the narrative to its plan/research MD (rolloutDrain.js), leave one actionable line + the → pointer.`);
      }
      if (SECTION_STATES[section] && !SECTION_STATES[section].has(cells[sIdx])) {
        problems.push(`  L${i + 1} ${id}: state ${cells[sIdx]} in section ${section} → a row sits in the section its state names (1 needs-info; 2 live-observing/blocked/parked; 3 in-progress; 4 ready). Fix: move the row.`);
      }
      // Job model (builder 2026-10-23): an in-progress row names ONE terminal.
      if (cells[sIdx] === 'in-progress') {
        const term = cells[sIdx + 1] || '';
        if (!BUILDER_TERMINALS.has(term)) {
          problems.push(`  L${i + 1} ${id}: in-progress with Terminal "${term}" → an active job names exactly one of ${[...BUILDER_TERMINALS].join(' / ')}. Fix: pick the owner; the other lane stays in the pointer doc.`);
        }
      }
    }
  });
  return problems;
}

// Job model, report-only: how many in-progress rows each terminal holds.
// One in hand is the rule; more is named here, never gated — the open rows
// migrate as they are picked up (rollout-rules §5 step 5).
function inHandReport() {
  const counts = new Map();
  for (const r of parseRollout()) {
    if (r.state !== 'in-progress') continue;
    if (!counts.has(r.terminal)) counts.set(r.terminal, []);
    counts.get(r.terminal).push(r.id);
  }
  const over = [...counts].filter(([, ids]) => ids.length > 1);
  if (!over.length) return;
  console.log('ROLLOUT IN HAND: more than one in-progress row per terminal (job model = one):');
  over.forEach(([t, ids]) => console.log(`  ${t}: ${ids.length} — ${ids.join(', ')}`));
}

// --gate: identical output to --lint, but EXITS NON-ZERO on problems (S335).
// Why a separate mode instead of changing --lint: sessionEndMechanical.js runs
// `--lint` through execSync, which THROWS on non-zero exit and would land in its
// catch branch — suppressing the very lint output that caught two bad rows in
// S335. post-write-check.sh and rolloutDrain.js also assume exit 0. So --lint
// stays a surfacing report and --gate is the enforcing one.
// Rows the staged commit adds or changes (the ratchet). Empty outside a commit.
function stagedRowProblems() {
  const { execSync } = require('child_process');
  const diff = execSync('git diff --cached -U0 -- docs/engine/ROLLOUT_PLAN.md', { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  const out = [];
  diff.split('\n').forEach(l => {
    if (!l.startsWith('+') || l.startsWith('+++')) return;
    const line = l.slice(1);
    const idMatch = line.match(ROW_ID);
    if (!idMatch) return;
    const cells = line.split('|').map(c => c.trim());
    const sIdx = cells.findIndex(c => STATES.has(c));
    const itemLen = sIdx > 2 ? cells.slice(2, sIdx).join(' | ').length : line.length;
    if (itemLen > TOUCHED_BUDGET) {
      out.push(`  ${idMatch[1]}: touched in this commit, item cell ${itemLen} chars > ${TOUCHED_BUDGET} → what it is + what it waits on or its next step; history goes to the plan's changelog.`);
    }
  });
  return out;
}

function runLint(gate) {
  const problems = lintRollout();
  if (gate) {
    try { problems.push(...stagedRowProblems()); }
    catch (e) { problems.push(`  staged-row check could not read the staged diff: ${e.message.split('\n')[0]}`); }
  }
  if (problems.length) {
    console.log(`ROLLOUT LINT: ${problems.length} non-conforming row(s) — state-cell breaks the sweep, or item cell over the ${ITEM_BUDGET}-char pointer budget:`);
    problems.forEach(p => console.log(p));
    if (gate) process.exit(1);
  } else {
    console.log('ROLLOUT LINT: clean — every row is a sweep-safe pointer within budget.');
  }
  inHandReport();
  // Overdue is a warning, never a gate: it names rows to re-read, the session decides.
  const overdue = overdueRows();
  if (overdue.length) {
    console.log(`ROLLOUT OVERDUE: ${overdue.length} waiting row(s) past their Cycle/date or naming none — read the record, then flip, re-date or close:`);
    overdue.forEach(p => console.log(p));
  }
  printStale();
}

// Also run alone by .githooks/pre-commit (--stale-next) on any commit staging the
// rollout, the archive or SESSION_CONTEXT, so the terminal closing a row sees it.
function printStale() {
  const stale = staleNextLeads(readOr(path.join(ROOT, 'SESSION_CONTEXT.md')), parseRollout(),
    readOr(path.join(ROOT, 'docs', 'engine', 'ROLLOUT_ARCHIVE.md')), readOr(path.join(ROOT, 'docs', 'plans', 'BACKLOG.md')));
  if (stale.length) {
    console.log(`NEXT STALE: ${stale.length} handoff line(s) lead with a row that is no longer open — the owner rewrites its line; a closer may correct the stale fact:`);
    stale.forEach(p => console.log(p));
  }
}

function readOr(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return ''; }
}

// --- stale handoff: a NEXT line that leads with a closed row -----------------
// A row closed or swept in another terminal's close leaves its owner's NEXT line
// pointing at finished work, and the owner boots onto it (2026-10-29:
// NEXT[engine-sheet] led with pipeline.77, closed wontfix and archived that day).
// Only the lead job ids — before the first → — are read; later mentions are often
// deliberate context. Warning only, like overdue. Pure: the caller reads the files.
const CLOSED_STATES = new Set(['done-pending-archive', 'wontfix']);
const ROW_TOKEN = /\b[a-z][a-z-]*\.\d+[a-z]?\b/g;
function staleNextLeads(sessionText, rows, archiveText, backlogText) {
  const state = new Map(rows.map(r => [r.id, r.state]));
  // Archive and BACKLOG list a row two ways: `- **id** …` or a table row `| id | …`.
  const listed = (text, id) => {
    const esc = id.replace(/\./g, '\\.');
    return new RegExp(`\\*\\*${esc}\\*\\*|^\\|\\s*${esc}\\s*\\|`, 'm').test(String(text));
  };
  const out = [];
  for (const line of String(sessionText).split('\n')) {
    const m = line.match(/^\*\*NEXT\[([a-z-]+)\]:\*\*\s*(.*)$/);
    if (!m) continue;
    const lead = m[2].split('→')[0];
    for (const id of new Set(lead.match(ROW_TOKEN) || [])) {
      const st = state.get(id);
      let why = null;
      if (st) why = CLOSED_STATES.has(st) ? st : null;
      else if (listed(archiveText, id)) why = 'archived';
      else if (listed(backlogText, id)) why = 'parked in BACKLOG';
      else why = 'no such row';
      if (why) out.push(`  NEXT[${m[1]}] leads with ${id} — ${why}`);
    }
  }
  return out;
}

// --- overdue: a waiting row whose every named Cycle/date is behind us ------
// Rows went stale because shipped work never flipped (S420, 2026-10-07). A
// live-observing or blocked row names the fire it waits on ("C111 (Sun
// 2026-10-11)"); once the latest Cycle it names is below the live Cycle, or the
// latest date is before today, the wait is over and nobody read it. `Organic:`
// rows name no fire and are skipped.
function currentCycle() {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'output', 'world_state.json'), 'utf8')).meta.cycle;
    if (Number.isFinite(c)) return c;
  } catch (_) { /* fall through to the PIN */ }
  try {
    const m = fs.readFileSync(path.join(ROOT, 'SESSION_CONTEXT.md'), 'utf8').match(/Canon(?:ical)? C(\d+)/);
    if (m) return Number(m[1]);
  } catch (_) { /* no cycle source */ }
  return null;
}

function overdueRows() {
  const cycle = currentCycle();
  // Chicago date — every deploy and fire record in this project is Chicago time.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const out = [];
  fs.readFileSync(ROLLOUT, 'utf8').split('\n').forEach((line, i) => {
    const idMatch = line.match(ROW_ID);
    if (!idMatch) return;
    const cells = line.split('|').map(c => c.trim());
    const sIdx = cells.findIndex(c => STATES.has(c));
    if (sIdx === -1 || !['live-observing', 'blocked'].includes(cells[sIdx])) return;
    const item = cells.slice(2, sIdx).join(' ');
    if (/^Organic:/.test(item)) return;
    const cycles = [...item.matchAll(/\bC(\d{2,3})\b/g)].map(m => Number(m[1]));
    const dates = [...item.matchAll(/\b(20\d\d-\d\d-\d\d)\b/g)].map(m => m[1]).sort();
    if (!cycles.length && !dates.length) { out.push(`  L${i + 1} ${idMatch[1]}: names no Cycle or date — overdue can't see it; name the fire it waits on or start the item 'Organic:'`); return; }
    // Overdue only when EVERY named wait is behind us — a future Cycle or date keeps the row live.
    const cyclePast = !cycles.length || (cycle !== null && Math.max(...cycles) < cycle);
    const datePast = !dates.length || dates[dates.length - 1] < today;
    if (!(cyclePast && datePast)) return;
    const why = [];
    if (cycles.length) why.push(`latest Cycle named C${Math.max(...cycles)}, live is C${cycle}`);
    if (dates.length) why.push(`latest date named ${dates[dates.length - 1]}, today is ${today}`);
    out.push(`  L${i + 1} ${idMatch[1]}: ${why.join('; ')}`);
  });
  return out;
}

// --- research verdict parse ---------------------------------------------
function parseResearch() {
  const out = [];
  if (!fs.existsSync(RESEARCH_DIR)) return out;
  for (const f of fs.readdirSync(RESEARCH_DIR)) {
    if (!f.endsWith('.md') || RESEARCH_SKIP.has(f)) continue;
    const content = fs.readFileSync(path.join(RESEARCH_DIR, f), 'utf8');
    const vMatch = content.match(/\*\*Verdict:\*\*\s*`?([a-z-]+)`?/i);
    if (!vMatch) continue;
    const verdict = vMatch[1].toLowerCase();
    if (!VERDICTS.has(verdict)) continue;
    // Grab the Verdict paragraph (verdict line through next blank line) as the trigger/why.
    const para = content.slice(content.indexOf(vMatch[0]));
    const trigger = para.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim();
    out.push({ file: f, verdict, trigger });
  }
  return out;
}

// --- render --------------------------------------------------------------
function buildReport() {
  const rollout = parseRollout();
  return {
    archive: rollout.filter(r => r.state === 'done-pending-archive'),
    next: rollout.filter(r => r.state === 'ready'),
    watch: parseResearch().filter(r => r.verdict === 'watch'),
  };
}

function printSection(report, which) {
  if (which === 'archive') {
    console.log(`\n## Archive sweep candidates (${report.archive.length})  —  done-pending-archive → ROLLOUT_ARCHIVE`);
    if (!report.archive.length) console.log('  (none)');
    for (const r of report.archive) console.log(`  - ${r.id}  (${r.terminal})  ${r.pointer}`);
  }
  if (which === 'next') {
    console.log(`\n## Next steps — ready rows by terminal (${report.next.length})`);
    if (!report.next.length) console.log('  (none)');
    const byTerm = {};
    for (const r of report.next) (byTerm[r.terminal] ||= []).push(r);
    for (const term of Object.keys(byTerm).sort()) {
      console.log(`  ${term}:`);
      for (const r of byTerm[term]) console.log(`    - ${r.id}  ${r.pointer}`);
    }
  }
  if (which === 'watch') {
    console.log(`\n## Watch List — research watch-verdicts + triggers (${report.watch.length})`);
    if (!report.watch.length) console.log('  (none)');
    for (const r of report.watch) console.log(`  - ${r.file}\n      ${r.trigger}`);
  }
}

// --plans: the rollout read by plan, generated from the rows so it cannot drift.
// One line per plan in motion: its rows and the state each is in. Rows whose
// pointer names no [[plan]] group under their pointer text.
function runPlans(write) {
  const byPlan = new Map();
  fs.readFileSync(ROLLOUT, 'utf8').split('\n').forEach(line => {
    const idMatch = line.match(ROW_ID);
    if (!idMatch) return;
    const cells = line.split('|').map(c => c.trim());
    const sIdx = cells.findIndex(c => STATES.has(c));
    if (sIdx === -1) return;
    const ptr = cells.filter(Boolean).pop() || '';
    const m = ptr.match(/\[\[([^\]]+)\]\]/);
    const plan = m ? m[1].replace(/^(\.\.\/)+/, '') : ptr.split(/\s/)[0];
    if (!byPlan.has(plan)) byPlan.set(plan, []);
    byPlan.get(plan).push(`${idMatch[1]} ${cells[sIdx]}`);
  });
  const plans = [...byPlan.entries()].sort((a, b) => b[1].length - a[1].length);
  const body = plans.map(([plan, rows]) => `- [[${plan.startsWith('[') || plan.startsWith('`') ? plan : '../' + plan}]]: ${rows.join(', ')}`.replace('[[`', '`').replace('`]]', '`'));
  if (!write) {
    console.log(`## Plans in motion (${plans.length}) — generated from ROLLOUT rows`);
    body.forEach(l => console.log(l));
    return;
  }
  // --write: replace the generated block in ROLLOUT_PLAN.md (session close runs this).
  const OPEN = '<!-- generated: plans in motion (docLoopStatus.js --plans --write; do not hand-edit) -->';
  const CLOSE = '<!-- /generated -->';
  const text = fs.readFileSync(ROLLOUT, 'utf8');
  const i = text.indexOf(OPEN), j = text.indexOf(CLOSE);
  if (i === -1 || j === -1 || j < i) { console.log('PLANS: no generated block in ROLLOUT_PLAN.md — nothing written'); return; }
  const block = `${OPEN}\n**Plans in motion (${plans.length})** — each plan, its rows and the state each is in:\n\n${body.join('\n')}\n${CLOSE}`;
  const next = text.slice(0, i) + block + text.slice(j + CLOSE.length);
  if (next !== text) fs.writeFileSync(ROLLOUT, next);
  console.log(`PLANS: ${plans.length} plans written to ROLLOUT_PLAN.md${next === text ? ' (unchanged)' : ''}`);
}

// --gate-handoff (builder 2026-10-28; reverses the S298 "length is judgment" ruling on
// his ask for guardrails): SESSION_CONTEXT is a header, one PIN, and one NEXT line per
// Claude terminal — nothing else. Guest lanes carry no line.
const PIN_MAX = 200;
const NEXT_MAX = 350;
function runHandoffGate() {
  const lines = fs.readFileSync(path.join(ROOT, 'SESSION_CONTEXT.md'), 'utf8').split('\n').filter(l => l.trim());
  const problems = [];
  if (!/^# SESSION_CONTEXT/.test(lines[0] || '')) problems.push('  line 1 must be the `# SESSION_CONTEXT` header.');
  const pins = lines.filter(l => l.startsWith('**PIN:**'));
  if (pins.length !== 1) problems.push(`  ${pins.length} PIN lines → exactly one.`);
  pins.forEach(l => { if (l.length > PIN_MAX) problems.push(`  PIN ${l.length} chars > ${PIN_MAX} → session | day | canon cycle | PROD deployment | next live fire; history lives in DEPLOY_HISTORY.`); });
  for (const t of BUILDER_TERMINALS) {
    const n = lines.filter(l => l.startsWith(`**NEXT[${t}]:**`));
    if (n.length !== 1) problems.push(`  ${n.length} NEXT[${t}] lines → exactly one.`);
    n.forEach(l => { if (l.length > NEXT_MAX) problems.push(`  NEXT[${t}] ${l.length} chars > ${NEXT_MAX} → job id → next step, holds; never what was done.`); });
  }
  const known = l => /^# SESSION_CONTEXT/.test(l) || l.startsWith('**PIN:**') || [...BUILDER_TERMINALS].some(t => l.startsWith(`**NEXT[${t}]:**`));
  lines.slice(1).filter(l => !known(l)).forEach(l => problems.push(`  extra line → "${l.slice(0, 60)}…" (no other lanes, notes or sections).`));
  if (problems.length) {
    console.log('SESSION_CONTEXT shape:');
    problems.forEach(p => console.log(p));
    process.exit(1);
  }
  console.log('SESSION_CONTEXT shape: clean.');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--gate-handoff')) { runHandoffGate(); return; }
  if (args.includes('--stale-next')) { printStale(); return; }
  if (args.includes('--gate')) { runLint(true); return; }
  if (args.includes('--lint')) { runLint(false); return; }
  if (args.includes('--plans')) { runPlans(args.includes('--write')); return; }
  const report = buildReport();
  if (args.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const only = ['archive', 'next', 'watch'].filter(s => args.includes(`--${s}`));
  const sections = only.length ? only : ['archive', 'next', 'watch'];
  console.log('# Doc-loop status (detector — surfaces, does not decide)');
  for (const s of sections) printSection(report, s);
  console.log('');
}

if (require.main === module) main();
module.exports = { staleNextLeads };
