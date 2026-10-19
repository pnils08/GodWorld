# TASK — codex: final gate 2, engine.302 for PROD

Read-only; no cron, model, Sheet write, bench or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-19-codex-engine302-final-gate-2.md`, under ~40 lines: per item SHIP / FIX / HOLD with file:line, then **Gate: SHIP or HOLD for PROD**. Report in one line when done.

`git show 8a7308f9` against your final gate (`docs/research/2026-10-19-codex-engine302-final-gate.md`) and the plan's "Final gate" paragraph (§Bench soak). The answer to the cross-tab items is to remove the writes: divorce writes no sheet (in-memory households, re-applied after the post-fund reload; next Cycle's reconcile rebuilds the row and re-heads to an adult); the `[Divorce]` lines are the durable record and `bondPairDivorced_` resolves a stale active romantic bond in the next romance pass; absent spouse only when Citizen_Archive holds it; remarriage's old-row write dropped (Phase5-HouseholdFormation's reconcile runs after Phase5-Bonds in the same Cycle — confirm the order on both entry points). For each of your HOLDs: closed? Anything this opens (a divorced pair's bond resolved before a legitimate remarriage between the same two people; the name-based line match vs a renamed citizen; the reconcile adult-head choice for an all-minor household)?

Done = the md exists.
