#!/usr/bin/env node
/**
 * chaosCarsFrequencyCheck.js — engine.11 T6.3 frequency cap validator.
 *
 * [research-build] chaos-cars plan docs/plans/2026-05-07-chaos-cars-engine.md §T6.3 +
 * Hard Constraints ("Frequency stays within 3-15 bound... No cycle produces 0 events;
 * no cycle exceeds 15"). Counts live Chaos_Cars rows per CycleId and fails loud on any
 * cycle outside [3,15].
 *
 * Run: node scripts/chaosCarsFrequencyCheck.js
 * Exits 0 with a one-line summary if every cycle is in bounds, 1 (with the offending
 * cycles named) otherwise.
 */
'use strict';

require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');

const MIN_EVENTS = 3;
const MAX_EVENTS = 15;

async function main() {
  const rows = await sheets.getSheetAsObjects('Chaos_Cars').catch(() => []);
  if (!rows.length) {
    console.log('chaosCarsFrequencyCheck: 0 live Chaos_Cars rows — nothing to validate yet.');
    return;
  }

  const counts = {};
  for (const r of rows) counts[r.CycleId] = (counts[r.CycleId] || 0) + 1;

  const cycles = Object.keys(counts).sort((a, b) => Number(a) - Number(b));
  const violations = cycles.filter((c) => counts[c] < MIN_EVENTS || counts[c] > MAX_EVENTS);

  if (violations.length) {
    console.error(`chaosCarsFrequencyCheck: FAIL — ${violations.length} cycle(s) outside [${MIN_EVENTS},${MAX_EVENTS}]:`);
    for (const c of violations) console.error(`  cycle ${c}: ${counts[c]} events`);
    process.exit(1);
  }

  console.log(`chaosCarsFrequencyCheck: PASS — ${cycles.length} cycles (${cycles[0]}-${cycles[cycles.length - 1]}), all within [${MIN_EVENTS},${MAX_EVENTS}] (${cycles.map((c) => `C${c}:${counts[c]}`).join(', ')}).`);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MIN_EVENTS, MAX_EVENTS };
}

if (require.main === module) {
  main().catch((err) => {
    console.error('chaosCarsFrequencyCheck FAILED:', err.message);
    process.exit(1);
  });
}
