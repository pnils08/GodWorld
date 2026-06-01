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
//   node scripts/rolloutSweep.js            # dry-run: show what would move
//   node scripts/rolloutSweep.js --apply    # execute the move + print deltas
//   node scripts/rolloutSweep.js --session=250   # session tag for the pass header (default: from arg)

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROLLOUT = path.join(ROOT, 'docs', 'engine', 'ROLLOUT_PLAN.md');
const ARCHIVE = path.join(ROOT, 'docs', 'engine', 'ROLLOUT_ARCHIVE.md');
const STATE_TOKEN = ' | done-pending-archive | ';
const ROW_ID = /^\|\s*([a-z][a-z-]*\.\d+[a-z]?)\s*\|/;
// New pass inserts immediately above the current top-of-run pass (newest-first
// region per the ARCHIVE-PASS ORDERING comment, G-SE4 S248).
const INSERT_ANCHOR = '## S248 Archive Pass (2026-05-31, research-build) — post-S238 backlog sweep';

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

function buildPassSection(rows, session) {
  const counts = {};
  for (const r of rows) {
    const group = r.id.split('.')[0];
    counts[group] = (counts[group] || 0) + 1;
  }
  const countStr = Object.entries(counts).map(([g, n]) => `${n} ${g}.*`).join(' + ');
  const lines = [];
  lines.push(`## S${session} Archive Pass (2026-06-01, research-build) — doc-loop v2.0 sweep`);
  lines.push('');
  lines.push(`${rows.length} \`done-pending-archive\` rows swept to archive as part of the governance.27 doc-loop v2.0 cleanup (move the closed bulk off Open Work; verbose detail is correct here). Each entry preserves the original ROLLOUT description + close-note verbatim. Cluster: ${countStr}.`);
  lines.push('');
  for (const r of rows) {
    lines.push(`- **${r.id}** [${r.terminal}] — ${r.desc} **State at archive:** done-pending-archive. Pointer: ${r.pointer}`);
  }
  lines.push('');
  lines.push('Prior sweep passes: §S212 Migration Pass, §S217/§S218/§S227 (governance.10 backlog — 49 rows), §S230 (5), §S233 (4), §S234 (2), §S235 (3), §S236 (2), §S238 (2), §S248 (4). This pass: ' + rows.length + ' rows (doc-loop v2.0 — largest since the S227 backlog drain).');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const apply = process.argv.includes('--apply');
  const session = arg('session', '250');

  const rolloutText = fs.readFileSync(ROLLOUT, 'utf8');
  const archiveText = fs.readFileSync(ARCHIVE, 'utf8');
  const rows = parseRows(rolloutText);

  if (!rows.length) { console.log('No done-pending-archive rows. Nothing to sweep.'); return; }

  const section = buildPassSection(rows, session);

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
