# TASK — codex: diff gate 2 on engine.301 F1, candidate `1e6beff5` (your gate 1 folded), one round

Read-only; no cron, model, Sheet write, bench or canon run (the bench is running from engine-sheet on this candidate; do not fire, reset or read-modify it). Do not commit, do not push. Write to `docs/archive/for-claude-review/2026-10-25-codex-engine301-diff-gate2.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~60 lines. Report in one line when done.

Your gate 1: `docs/archive/for-claude-review/2026-10-25-codex-engine301-diff-gate.md`. The fold: `git show 1e6beff5` (its message lists each finding and where it landed). Full candidate vs PROD: `git diff e3266c44^ 1e6beff5 -- phase02-world-state/applyCityDynamics.js phase09-digest/finalizeCycleState.js`.

1. **Each gate-1 finding closed?** §1 HIGH (publish only on success; entry clear; canon-only), MED (wave name needs its own carried spike), MED (receipt prose: "last Cycle (to X)", "rising two Cycles running (level 3)", magnitude = max level). §2 tests (failed-phase wrapper after derivation, 13-rise snapshot agreement, T11 dial-move + bounded weight ratio). §3 receipt (typed blobs, prior-spike back-to-back, Engine_Errors HOLD, expectations, window HOLD), probe (producer half; exact read-back), driver (trap, expectations), aim check guard.
2. **New risk from the fold.** The early `delete S.crimeByNeighborhood` and the end-of-phase publish: any reader between `:245` and the publish that now sees no map (inside `applyCityDynamics_` itself or elsewhere in Phase 2)? The canon filter at publish vs the ladder loop's own canon list. The producer probe's Crime_Metrics edit: does lowering `PropertyCrimeIndex` (level kept) touch anything at C113 beyond the shift (Phase 2 reads, the crime bar, hotspots)?
3. **PROD readiness, pending the bench receipt.** With leg P (consumer + producer on the real Apps Script path) and leg S (25 organic Cycles) passing their receipts, is anything else required before PROD? Your §4 note stands: the soak measures the rate; reach is the probe's.

Done = the md exists.
