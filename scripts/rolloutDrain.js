#!/usr/bin/env node
// rolloutDrain.js — Drain one bloated ROLLOUT row's narrative into its plan/
// research MD, and replace the row with a clean pointer. The one-time migration
// helper for governance.30 (stand up the uniform tracker) + the recurring tool
// for any row that re-bloats.
//
// DUMB BY DESIGN (S274, advisor): it does the LOSSLESS mechanical move only —
//   1. cut the row's item-cell prose verbatim,
//   2. append it under `## Status log` in the plan doc the row's pointer names,
//   3. rewrite the row to `| id | <title> | <state> | <terminal> | <pointer> |`.
// It does NOT invent the title or the state — those are per-row judgment, so YOU
// pass them (--title / --state). No title-extraction heuristics, no rabbit holes.
// Narrative is relocated (the S250 lesson: relocate, never delete-on-trust).
//
// SAFETY: dry-run by default — prints the resolved plan doc, the block it would
// append, and the new row line. --apply writes both files. Verify with
// `git diff` + `node scripts/docLoopStatus.js --lint` after.
//
// Usage:
//   node scripts/rolloutDrain.js --id=research.14
//       --title="Citizen-loop Phase 2 — per-citizen perception + dial-rotation"
//       --state=in-progress
//   node scripts/rolloutDrain.js --id=research.14 --title="..." --state=in-progress --apply
//   Optional: --pointer="[[../plans/...]]" / --terminal="..." to also lean those cells.
//   Optional: --date=YYYY-MM-DD (default today), --session=274 (label on the status block).

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROLLOUT = path.join(ROOT, 'docs', 'engine', 'ROLLOUT_PLAN.md');
const DOCS = path.join(ROOT, 'docs');
const STATES = new Set([
  'ready', 'in-progress', 'done-pending-archive', 'blocked', 'needs-info', 'wontfix', 'parked',
]);

function arg(name, def) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
}
function fail(msg) { console.error(`FATAL: ${msg}`); process.exit(1); }

const id = arg('id');
const title = arg('title');
const state = arg('state');
const pointerOverride = arg('pointer');
const terminalOverride = arg('terminal');
const date = arg('date', new Date().toISOString().slice(0, 10)); // overridable; see note below
const session = arg('session', '274');
const apply = process.argv.includes('--apply');

if (!id) fail('--id=<rowid> required (e.g. --id=research.14)');
if (apply && !title) fail('--title="..." required for --apply (the new one-line item cell — your judgment, not auto-extracted)');
if (apply && !state) fail('--state=<token> required for --apply');
if (state && !STATES.has(state)) fail(`--state must be one of: ${[...STATES].join(', ')}`);

// --- locate + parse the row ------------------------------------------------
const rolloutText = fs.readFileSync(ROLLOUT, 'utf8');
const rolloutLines = rolloutText.split('\n');
const rowIdRe = new RegExp(`^\\|\\s*${id.replace('.', '\\.')}\\s*\\|`);
const rowIdx = rolloutLines.findIndex(l => rowIdRe.test(l));
if (rowIdx === -1) fail(`row id "${id}" not found in ROLLOUT_PLAN.md`);
const rowLine = rolloutLines[rowIdx];

// Split into cells. Cell 0 is '' (leading pipe), cell 1 is the id, the LAST
// non-empty cell is the pointer, and the cell equal to a state token marks the
// boundary: item = cells between id and state; terminal = cell after state.
const cells = rowLine.split('|').map(c => c.trim());
const sIdx = cells.findIndex(c => STATES.has(c));
if (sIdx === -1) fail(`row "${id}" has no clean state cell — fix the state cell by hand first (see docLoopStatus --lint)`);
const itemProse = cells.slice(2, sIdx).join(' | ').trim();
const curState = cells[sIdx];
const curTerminal = cells[sIdx + 1] || '';
const curPointer = cells.slice(sIdx + 2).filter(Boolean).join(' | ').trim();

// --- resolve the pointer to a plan/research doc ----------------------------
const wikiRe = /\[\[([^\]]+)\]\]/g;
let m, planRel = null;
while ((m = wikiRe.exec(curPointer)) !== null) {
  const target = m[1].split('|')[0].trim();          // drop any "[[path|alias]]"
  if (/plans\/|research\//.test(target)) { planRel = target; break; }
  if (!planRel) planRel = target;                     // fallback: first wikilink
}
if (!planRel) fail(`row "${id}" pointer has no [[plan]] link to drain into: "${curPointer}". Trim this row by hand (no plan doc home).`);
// Wikilinks are relative to docs/. Strip leading ../ and resolve under docs/.
const planPath = path.join(DOCS, planRel.replace(/^(\.\.\/)+/, '') + '.md');
if (!fs.existsSync(planPath)) fail(`resolved plan doc does not exist: ${planPath} (from [[${planRel}]])`);

// --- build the status-log block --------------------------------------------
const block = `### ${id} — status (drained from ROLLOUT, ${date} / S${session})\n\n${itemProse}\n`;

function insertStatusBlock(text) {
  const heading = '## Status log';
  if (text.includes(heading)) {
    // append at end of the existing Status log section (before next "## " or EOF)
    const start = text.indexOf(heading);
    const after = text.indexOf('\n## ', start + heading.length);
    const cut = after === -1 ? text.length : after;
    return text.slice(0, cut).replace(/\s*$/, '\n\n') + block + text.slice(cut);
  }
  // create the section — before "## Changelog" if present, else at EOF
  const sec = `\n## Status log\n\n${block}`;
  const cl = text.indexOf('\n## Changelog');
  if (cl !== -1) return text.slice(0, cl) + sec + text.slice(cl);
  return text.replace(/\s*$/, '\n') + sec;
}

// --- rewrite the row to a clean pointer ------------------------------------
const newTitle = title || '<TODO title>';
const newState = state || curState;
const newTerminal = terminalOverride || curTerminal;
const newPointer = pointerOverride || curPointer;
const newRow = `| ${id} | ${newTitle} | ${newState} | ${newTerminal} | ${newPointer} |`;

// --- report / apply --------------------------------------------------------
console.log(`row:        ${id}  (ROLLOUT line ${rowIdx + 1})`);
console.log(`plan doc:   ${path.relative(ROOT, planPath)}  (from [[${planRel}]])`);
console.log(`item prose: ${itemProse.length} chars → drained verbatim to ## Status log`);
console.log(`new item:   ${newTitle.length} chars`);
console.log(`\n--- new ROLLOUT row ---\n${newRow}`);
console.log(`\n--- appended to ${path.basename(planPath)} ## Status log ---\n${block}`);

if (!apply) {
  console.log('Dry-run only. Re-run with --apply (and --title/--state) to write both files.');
  process.exit(0);
}

const planText = fs.readFileSync(planPath, 'utf8');
fs.writeFileSync(planPath, insertStatusBlock(planText));   // relocate FIRST (lossless)
rolloutLines[rowIdx] = newRow;
fs.writeFileSync(ROLLOUT, rolloutLines.join('\n'));         // then slim the row
console.log(`\nAPPLIED. Verify: git diff ${path.relative(ROOT, planPath)} docs/engine/ROLLOUT_PLAN.md && node scripts/docLoopStatus.js --lint`);
