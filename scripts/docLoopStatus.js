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
  lines.forEach((line, i) => {
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
    }
  });
  return problems;
}

// --gate: identical output to --lint, but EXITS NON-ZERO on problems (S335).
// Why a separate mode instead of changing --lint: sessionEndMechanical.js runs
// `--lint` through execSync, which THROWS on non-zero exit and would land in its
// catch branch — suppressing the very lint output that caught two bad rows in
// S335. post-write-check.sh and rolloutDrain.js also assume exit 0. So --lint
// stays a surfacing report and --gate is the enforcing one.
function runLint(gate) {
  const problems = lintRollout();
  if (problems.length) {
    console.log(`ROLLOUT LINT: ${problems.length} non-conforming row(s) — state-cell breaks the sweep, or item cell over the ${ITEM_BUDGET}-char pointer budget:`);
    problems.forEach(p => console.log(p));
    if (gate) process.exit(1);
  } else {
    console.log('ROLLOUT LINT: clean — every row is a sweep-safe pointer within budget.');
  }
  // Overdue is a warning, never a gate: it names rows to re-read, the session decides.
  const overdue = overdueRows();
  if (overdue.length) {
    console.log(`ROLLOUT OVERDUE: ${overdue.length} waiting row(s) past their Cycle/date or naming none — read the record, then flip, re-date or close:`);
    overdue.forEach(p => console.log(p));
  }
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
    const m = fs.readFileSync(path.join(ROOT, 'SESSION_CONTEXT.md'), 'utf8').match(/canonical C(\d+)/);
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

function main() {
  const args = process.argv.slice(2);
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

main();
