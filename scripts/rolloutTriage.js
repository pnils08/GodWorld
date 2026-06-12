#!/usr/bin/env node
// rolloutTriage.js — ROLLOUT HIGH entry staleness scanner
// Phase 3 of docs/archive/plans/2026-05-03-rollout-triage-cadence.md
//
// ============================================================================
// RETIRED S235 (2026-05-25) — governance.6 close
// ============================================================================
// The compounding-HIGH problem this script solved (G-W16 meta-pattern from
// S195) is now structurally addressed by:
//   - S212 state taxonomy (`done-pending-archive` makes ship-but-not-archived
//     visible at every ROLLOUT read)
//   - Per-terminal sweep ownership (no terminal can compound stale work
//     invisibly — research-build owns governance.10-class sweeps)
//   - governance.10-class archive sweep cadence (~one sweep per 1-2 closes
//     since §S227 backlog drain; S229/S230/S233/S234/S235 all swept)
//
// Empirical proof of obsolescence: `node scripts/rolloutTriage.js <cycle>`
// returns "ERROR: No (promoted: C<N>, severity: HIGH) tags found in
// ROLLOUT_PLAN.md" — the data it needed has dried up because the rollout-
// discipline solution made the tagging convention redundant.
//
// Retire scope: removed from `sessionEndMechanical.js` step list S235.
// File preserved in-place (not deleted) per SCHEMA §7 archive≠delete.
//
// Unarchive triggers (revisit if either fires):
//   - Archive sweep cadence falls behind by >3 sessions
//   - HIGH-severity gap sits as `ready`/`in-progress` across >3 cycles
//     without movement
// Either signal means the rollout-discipline solution failed and the
// script-layer solution should come back.
//
// Original cycle-promoted-tag scheme retained below for reference.
// ============================================================================
//
// First-run note (C93): all promoted tags use C92/C93. Max age = 1 cycle.
// STALE-2C threshold requires >2 cycles. Stale list will be empty on first run.
// Staleness accumulates as entries remain unaddressed across future cycles.
//
// S212 fix: regex extended to accept S204 state-taxonomy suffix
//   `(promoted: C<N>, severity: HIGH, state: <state>)` — was breaking on the
//   `, state: <state>` segment introduced S204 §Convention. Entries returning
//   `(unknown)` title (i.e. §Convention example tag inline) are now filtered.
//   S208 detag of 6 gap-log entries is downstream — those became pointers
//   intentionally and should not surface here.
//
// Usage: node scripts/rolloutTriage.js <current-cycle>
// Output: output/rollout_triage_c<N>.md

'use strict';

const fs = require('fs');
const path = require('path');

const ROLLOUT_PATH = path.join(__dirname, '..', 'docs', 'engine', 'ROLLOUT_PLAN.md');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const STALE_THRESHOLD = 2;

function parseCycle(arg) {
  const n = parseInt(arg, 10);
  if (isNaN(n) || n < 1) {
    console.error('Usage: node scripts/rolloutTriage.js <cycle-number>');
    process.exit(1);
  }
  return n;
}

function extractTitle(line) {
  const trimmed = line.trim();
  // S212: check table-row format first. A table row starts with `|`; the
  // first bold-wrapped span inside a table row is part of the cell content,
  // not the title. Old order (bullet before table) returned the wrong title
  // for entries like `| Skill eval framework | ... **First skill ...** ...`.
  if (trimmed.startsWith('|')) {
    const tableMatch = line.match(/^\s*\|\s*([^|]+?)\s*\|/);
    if (tableMatch) return tableMatch[1].trim();
  }
  const bulletMatch = line.match(/\*\*([^*]+)\*\*/);
  if (bulletMatch) return bulletMatch[1].trim();
  return '(unknown)';
}

function parseRolloutEntries(content) {
  const lines = content.split('\n');
  const entries = [];
  // S212: accept optional `, state: <anything-not-paren>` suffix per S204 state-taxonomy.
  const promotedRe = /\(promoted: C(\d+), severity: HIGH(?:, state: [^)]+)?\)/;
  for (const line of lines) {
    const m = line.match(promotedRe);
    if (!m) continue;
    const promotedCycle = parseInt(m[1], 10);
    const title = extractTitle(line);
    // Skip entries with no extractable title — typically the §Convention
    // example tag inside backticks, not a real ROLLOUT entry.
    if (title === '(unknown)') continue;
    const parked = /PARKED:/i.test(line);
    entries.push({ title, promotedCycle, parked, line: line.trim() });
  }
  return entries;
}

function renderOutput(entries, currentCycle) {
  const ageFn = e => currentCycle - e.promotedCycle;
  const sortFn = (a, b) => ageFn(b) - ageFn(a) || a.title.localeCompare(b.title);

  const stale = entries
    .filter(e => !e.parked && ageFn(e) > STALE_THRESHOLD)
    .sort(sortFn);

  const all = entries.slice().sort(sortFn);
  const date = new Date().toISOString().slice(0, 10);

  let out = `# ROLLOUT Triage — C${currentCycle}\n\n`;
  out += `Generated: ${date}  \n`;
  out += `Current cycle: ${currentCycle}  \n`;
  out += `STALE-2C threshold: >${STALE_THRESHOLD} cycles unaddressed  \n`;
  out += `Tagged HIGH entries: ${entries.length}  \n\n`;

  if (stale.length === 0) {
    out += `## Stale HIGH Items\n\n`;
    out += `*(none — all tagged entries within the ${STALE_THRESHOLD}-cycle threshold)*\n\n`;
    out += `> First-run note: promoted-cycle tags use C92/C93. Staleness manifests when entries remain unaddressed for >${STALE_THRESHOLD} cycles.\n\n`;
  } else {
    out += `## Stale HIGH Items (action required)\n\n`;
    out += `| Rank | Entry | Promoted | Age (cycles) |\n`;
    out += `|------|-------|----------|--------------|\n`;
    stale.forEach((e, i) => {
      out += `| ${i + 1} | ${e.title} | C${e.promotedCycle} | ${ageFn(e)} |\n`;
    });
    out += '\n';
  }

  out += `## All Tagged HIGH Items\n\n`;
  out += `| Entry | Promoted | Age (cycles) | PARKED |\n`;
  out += `|-------|----------|-------------|--------|\n`;
  all.forEach(e => {
    const staleFlag = (!e.parked && ageFn(e) > STALE_THRESHOLD) ? ' [STALE-2C]' : '';
    out += `| ${e.title}${staleFlag} | C${e.promotedCycle} | ${ageFn(e)} | ${e.parked ? 'YES' : '—'} |\n`;
  });

  return { out, staleCount: stale.length };
}

function main() {
  const currentCycle = parseCycle(process.argv[2]);

  if (!fs.existsSync(ROLLOUT_PATH)) {
    console.error(`ERROR: ROLLOUT_PLAN.md not found at ${ROLLOUT_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(ROLLOUT_PATH, 'utf8');
  const entries = parseRolloutEntries(content);

  if (entries.length === 0) {
    console.error('ERROR: No (promoted: C<N>, severity: HIGH) tags found in ROLLOUT_PLAN.md');
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const { out, staleCount } = renderOutput(entries, currentCycle);
  const outPath = path.join(OUTPUT_DIR, `rollout_triage_c${currentCycle}.md`);
  fs.writeFileSync(outPath, out, 'utf8');

  console.log(`Triage complete: ${entries.length} tagged HIGH entries, ${staleCount} STALE-2C`);
  console.log(`Output: ${outPath}`);
}

main();
