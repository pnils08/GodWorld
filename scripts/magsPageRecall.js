#!/usr/bin/env node
/**
 * magsPageRecall.js — pipe.40 T3: scored EIC injection from Mags' page.
 *
 * Pulls recent reflections from POP-00005's citizen page, scores them against
 * the given context via resonanceRecall (context-match + staleness + affect),
 * and prints a memory-fenced block of the top ≤3 to stdout. /sift and
 * /write-edition inject the output as fenced background — what Mags has been
 * developing watching the city — never quotable as fact.
 *
 * Mirrors the wake's loadOwnPageReadback (citizen-wake.js): recentPage_ (NOT
 * v4 search — it silently misses docs, S272), tension docs skipped, 320-char
 * per-reflection cap. Fail-open: empty page or API failure → empty stdout,
 * exit 0 (a missing memory block must never break an edition).
 *
 * Usage:
 *   node scripts/magsPageRecall.js --cycle=118 --context="<storyline headlines>"
 *   [--mark]  record the recalled keys so staleness rotates picks (/sift passes
 *             this; /write-edition stays read-only). Default: no state writes.
 *
 * Plan: docs/plans/2026-07-06-journal-to-citizen-loop.md (pipe.40).
 */
require('/root/GodWorld/lib/env');
const page = require('/root/GodWorld/lib/citizenPage');
const resonance = require('/root/GodWorld/lib/resonanceRecall');
const memoryFence = require('/root/GodWorld/lib/memoryFence');

const MAGS_POPID = 'POP-00005';
const CANDIDATE_N = 15;   // reflections pulled as recall candidates (wake parity)
const READBACK_CAP = 3;   // memories injected (wake parity)
const REFLECTION_CAP = 320; // per-reflection char cap (wake parity)

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : null;
}

async function main() {
  const cycle = arg('cycle') != null ? Number(arg('cycle')) : null;
  const contextText = arg('context') || '';
  try {
    const res = await page.recentPage_(MAGS_POPID, CANDIDATE_N);
    const candidates = ((res && res.results) || [])
      .filter((r) => String((r && r.metadata && r.metadata.type) || '') !== 'tension')
      .map((r) => ({ text: String((r && r.content) || '').trim().slice(0, REFLECTION_CAP), meta: (r && r.metadata) || null, kind: 'reflection' }))
      .filter((c) => c.text);
    if (!candidates.length) return; // empty page — fail open, empty stdout
    const pick = resonance.selectMemories({
      popId: MAGS_POPID, cycle, wake: 'EIC',
      candidates, contextText, cap: READBACK_CAP,
    });
    const prose = pick.selected.map((c) => c.text).join('\n\n');
    if (!prose.trim()) return;
    if (process.argv.includes('--mark')) resonance.markRecalled(MAGS_POPID, cycle, pick.keys);
    process.stdout.write(memoryFence.wrap(prose, 'citizen-page:' + MAGS_POPID) + '\n');
  } catch (e) {
    console.error('[magsPageRecall] fail-open: ' + e.message); // stderr only; stdout stays empty
  }
}

main();
