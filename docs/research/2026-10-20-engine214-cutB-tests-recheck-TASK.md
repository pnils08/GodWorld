# TASK — codex: tests recheck, engine.214 8a Cut B (commit 9b5b4281)

Read-only except Node test runs. No cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-20-codex-engine214-cutB-tests-recheck.md`, SHIP / FIX per item, file:line evidence, under ~50 lines. Report in one line when done.

Your diff review (`docs/research/2026-10-20-codex-engine214-cutB-diff-review.md`) held hunt 5 (tests). The fold: `git show 9b5b4281 -- scripts/testNeighborhoodLoop.js`. The engine file is unchanged since `3ed34b61`.

1. **C8a** now asserts each entry's tags (exact, in order), weight (M/3 or M/6) and ×1.5 bound at mi 0 / .2 / .4 / .6 / 1. Would a swapped sign, a moved share inside one side, or a reaction mapped to the wrong side now fail?
2. **C8e** runs each of the four dial → reaction maps through the real generator and T5 pass at dial 5 vs 95 (20 citizens × 60 Cycles, seed 214), asserting the reaction's share of its set moves the right way. Would a wrong dial in `hoodReactionMult_`, a one-sided complain multiplier, or a T5 branch that never fires now fail? Is any case seed-lucky (read the printed counts)?
3. **C2g3** now also checks venue-suffixed draws (`' near <venue>'`) and asserts at least one suffixed line was checked.

The bench pair (same-baseline A/B receipts) runs separately; not in scope here.

Done = the md exists.
