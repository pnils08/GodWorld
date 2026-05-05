#!/usr/bin/env node
// rolloutTriage.js — ROLLOUT HIGH entry staleness scanner
// Phase 3 of docs/plans/2026-05-03-rollout-triage-cadence.md
//
// First-run note (C93): all promoted tags use C92/C93. Max age = 1 cycle.
// STALE-2C threshold requires >2 cycles. Stale list will be empty on first run.
// Staleness accumulates as entries remain unaddressed across future cycles.
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
  const bulletMatch = line.match(/\*\*([^*]+)\*\*/);
  if (bulletMatch) return bulletMatch[1].trim();
  const tableMatch = line.match(/^\|\s*([^|]+?)\s*\|/);
  if (tableMatch) return tableMatch[1].trim();
  return '(unknown)';
}

function parseRolloutEntries(content) {
  const lines = content.split('\n');
  const entries = [];
  const promotedRe = /\(promoted: C(\d+), severity: HIGH\)/;
  for (const line of lines) {
    const m = line.match(promotedRe);
    if (!m) continue;
    const promotedCycle = parseInt(m[1], 10);
    const title = extractTitle(line);
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
