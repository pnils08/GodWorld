# TASK — codex: diff review, engine.302 cut 3 (divorce) + recheck-2 fixes

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine302-cut3-diff-review.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~90 lines. Report in one line when done.

**The diff:** `git show 30494195`. **The plan:** `docs/plans/2026-10-08-engine-286-game-of-life-events.md` §Bench soak — cut 3 design and "Cut 3 — codex plan review + recheck-2 … dispositions" (your review: `docs/research/2026-10-19-codex-engine302-cut3-plan-review.md`). B2 and B5 are decided by es and go to the builder; attack whether the code does what the dispositions say, not the choice.

## Hunts
1. Every disposition line (A1, A2, B1–B7) against the code: done as written?
2. `processDivorces_`: eligibility (living, married, the couple test, `done` set order — can a spouse be judged alone first?), the same-Cycle marriage guard (last 12 lines only — enough?), `divorceCrisisKinds_` window arithmetic and stamp parsing, the forced-sale regex vs the real line format, health statuses.
3. The writes: Phase-10 path for each; the one direct HeadOfHousehold cell (row index from `loadHouseholds_` `rowIndex`, header read); the in-memory household mutation vs `updateHouseholdIncomes_`, `detectHouseholdStress_`, `dissolveStressedHouseholds_` after it; the citizens reload; the reconciler next pass (Members rebuild, re-head, spouse-merge never re-merges divorced rows, the off-camera retype).
4. Readers of the new state: `bondCanCourt_` (divorced can court; SpouseId cleared), the wake, heritage (`updateHeritage_` spouse join), inheritance, intake spouse slot, citizen cards/packets.
5. Tests DV1–DV12 and the A1/A2 tests: would each fail on the pre-302 code; anything that passes trivially; anything missing for the dispositions.
6. Engine rules: `ctx.rng` not used (deterministic by ruling); no new file; direct writes within the SHEETS_MANIFEST §9 class for this file; truth docs.

Done = the md exists.
