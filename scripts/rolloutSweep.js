#!/usr/bin/env node
// rolloutSweep.js — Move `done-pending-archive` rows from ROLLOUT_PLAN Open Work
// to ROLLOUT_ARCHIVE, verbatim. Mechanical bookkeeping (the recurring task the
// S227/S248 throwaway helpers did by hand) made repeatable + safe.
//
// Per ROLLOUT governance.28 sibling (S250). The state tag already DECIDED which
// rows close — this just executes the move. No judgment about WHICH rows.
//
// SAFETY: dry-run by default (prints the generated archive section + the exact
// lines it would remove, writes nothing). --apply to execute. Description cells
// are moved VERBATIM (split on the ` | done-pending-archive | ` token, so internal
// pipes in the prose survive). Never report done based on stdout — verify counts.
//
// Usage:
//   node scripts/rolloutSweep.js --session=264           # dry-run: show what would move
//   node scripts/rolloutSweep.js --session=264 --apply   # execute the move + print deltas
// Header is self-tightening (S263): --session=<N> REQUIRED; date auto = today (--date=YYYY-MM-DD
// to override); label auto = "post-S<N-1> closures sweep" (--label="..." to override); insert anchor
// auto-detected as the highest-session "## S<N> Archive Pass" header — no hand-maintained anchor/recap.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROLLOUT = path.join(ROOT, 'docs', 'engine', 'ROLLOUT_PLAN.md');
const ARCHIVE = path.join(ROOT, 'docs', 'engine', 'ROLLOUT_ARCHIVE.md');
const STATE_TOKEN = ' | done-pending-archive | ';
const ROW_ID = /^\|\s*([a-z][a-z-]*\.\d+[a-z]?)\s*\|/;
const PASS_HEADER = /^## S(\d+) Archive Pass\b.*$/gm;
// New pass inserts immediately above the newest existing pass (highest session
// number), auto-detected from the archive — no hand-maintained anchor (S263 loop-tighten).
function findNewestPassAnchor(archiveText) {
  let best = null, bestN = -1, m;
  PASS_HEADER.lastIndex = 0;
  while ((m = PASS_HEADER.exec(archiveText)) !== null) {
    const n = parseInt(m[1], 10);
    if (n > bestN) { bestN = n; best = m[0]; }
  }
  return best;
}

function arg(name, def) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
}

function parseRows(rolloutText) {
  const rows = [];
  for (const line of rolloutText.split('\n')) {
    const idM = line.match(ROW_ID);
    if (!idM) continue;
    if (!line.includes(STATE_TOKEN)) continue;
    const id = idM[1];
    // Split on the state token: left = "| id | desc", right = "terminal | pointer |"
    const parts = line.split(STATE_TOKEN);
    if (parts.length !== 2) { console.error(`SKIP ${id}: ambiguous state token`); continue; }
    const desc = parts[0].replace(ROW_ID, '').replace(/^\s*\|?\s*/, '').trim();
    const right = parts[1].split('|').map(c => c.trim()).filter(Boolean);
    const terminal = right[0] || '(unspecified)';
    const pointer = right[1] || '';
    rows.push({ id, terminal, pointer, desc, raw: line });
  }
  return rows;
}

function buildPassSection(rows, session, date, label) {
  const counts = {};
  for (const r of rows) {
    const group = r.id.split('.')[0];
    counts[group] = (counts[group] || 0) + 1;
  }
  const countStr = Object.entries(counts).map(([g, n]) => `${n} ${g}.*`).join(' + ');
  const idStr = rows.map(r => r.id).join(' + ');
  const lines = [];
  lines.push(`## S${session} Archive Pass (${date}, research-build) — ${label}`);
  lines.push('');
  lines.push(`${rows.length} \`done-pending-archive\` rows swept at session-end per the archive-sweep cadence ([[rollout-rules]] §6) (move the closed bulk off Open Work; verbose detail is correct here). Each entry preserves the original ROLLOUT description + close-note verbatim. Cluster: ${countStr}.`);
  lines.push('');
  for (const r of rows) {
    lines.push(`- **${r.id}** [${r.terminal}] — ${r.desc} **State at archive:** done-pending-archive. Pointer: ${r.pointer}`);
  }
  lines.push('');
  lines.push(`This pass: ${rows.length} rows — ${idStr}. (Prior passes are the dated \`## S<N> Archive Pass\` headers above — no hand-maintained recap.)`);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const apply = process.argv.includes('--apply');
  const session = arg('session', '');
  if (!session) { console.error('FATAL: --session=<N> required (current session number for the pass header).'); process.exit(1); }
  const date = arg('date', new Date().toISOString().slice(0, 10));
  const label = arg('label', `post-S${Number(session) - 1} closures sweep`);

  const rolloutText = fs.readFileSync(ROLLOUT, 'utf8');
  const archiveText = fs.readFileSync(ARCHIVE, 'utf8');
  const rows = parseRows(rolloutText);

  if (!rows.length) { console.log('No done-pending-archive rows. Nothing to sweep.'); return; }

  const INSERT_ANCHOR = findNewestPassAnchor(archiveText);
  if (!INSERT_ANCHOR) { console.error('FATAL: no "## S<N> Archive Pass" header found in ARCHIVE — cannot place new pass.'); process.exit(1); }

  const section = buildPassSection(rows, session, date, label);

  console.log(`# rolloutSweep — ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`\nWould move ${rows.length} rows:`);
  for (const r of rows) console.log(`  - ${r.id}  [${r.terminal}]`);

  if (!archiveText.includes(INSERT_ANCHOR)) {
    console.error(`\nFATAL: insert anchor not found in ARCHIVE — aborting (anchor: "${INSERT_ANCHOR}")`);
    process.exit(1);
  }

  if (!apply) {
    console.log('\n--- generated archive section (preview) ---\n');
    console.log(section.split('\n').slice(0, 6).join('\n') + '\n  …(' + rows.length + ' bullets)…');
    console.log('\nDry-run only. Re-run with --apply to execute.');
    return;
  }

  // APPLY: insert section above the anchor in ARCHIVE; remove rows from ROLLOUT.
  const newArchive = archiveText.replace(INSERT_ANCHOR, section + '\n' + INSERT_ANCHOR);
  const removeSet = new Set(rows.map(r => r.raw));
  const newRollout = rolloutText.split('\n').filter(l => !removeSet.has(l)).join('\n');

  fs.writeFileSync(ARCHIVE, newArchive);
  fs.writeFileSync(ROLLOUT, newRollout);

  const beforeR = rolloutText.split('\n').length, afterR = newRollout.split('\n').length;
  const beforeA = archiveText.split('\n').length, afterA = newArchive.split('\n').length;
  console.log(`\nAPPLIED.`);
  console.log(`  ROLLOUT_PLAN:    ${beforeR} → ${afterR} lines (-${beforeR - afterR})`);
  console.log(`  ROLLOUT_ARCHIVE: ${beforeA} → ${afterA} lines (+${afterA - beforeA})`);
  console.log(`  Rows moved: ${rows.length}`);
}

main();
