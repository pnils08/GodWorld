# TASK — codex: diff gate 1 on engine.301 F1, candidate `e3266c44`, one round

Read-only; no cron, model, Sheet write, bench or canon run (the bench is running from engine-sheet; do not fire or read-modify it). Do not commit, do not push. Write to `docs/archive/for-claude-review/2026-10-25-codex-engine301-diff-gate.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~70 lines. Report in one line when done.

Candidate: `git show e3266c44 -- phase02-world-state/applyCityDynamics.js phase09-digest/finalizeCycleState.js scripts/perHoodDynamics.test.js scripts/engine299Graded.test.js`. Plan: `docs/plans/2026-10-10-engine-214-mood-per-hood.md` §engine.301 F1 (your plan review folded — the §Codex plan review paragraph says how each finding landed). Your plan review: `docs/archive/for-claude-review/2026-10-25-codex-engine301-crime-plan-review.md`.

1. **Code vs your plan review.** Each §1/§2 FIX closed in the code as the plan paragraph claims? The derived-only level (no pre-set read), dedupe, one compaction feeding both carried fields, the Phase-9 read of the published level, the receipt prose and magnitude, the log line.
2. **Tests.** Do block 6 / 6c (`scripts/perHoodDynamics.test.js`) and T11 (`scripts/engine299Graded.test.js`) prove the real path, and would each fail on a plausible regression (publish dropped; wave not carried; cap disagreement; level read from a pre-set map; Phase 5 weight)? T11 loads `hoodStateMedian_` / `hoodCrimeBar_` from source and sets `dialHoodPressureBar` 3 / `dialHoodCrimeBar` 1.45 (the `engine94SheetContract.js:504-505` defaults) — acceptable, or a hiding stub?
3. **Bench scripts.** `output/engine-sheet/2026-10-25-push-e301-bench.sh` (stage built = stage 25 outside the two files; each file at `e3266c44^` = its stage-25 copy; pull-back compare), `…-e301-probe.js` (bench-title guard; the C112 ring row edit), `…-e301-receipt.js` (typed ring readback, levels, pre-cap rises, lines by ledger hood, receipt, Engine_Errors, `--final` window), `…-e301-bench.sh` (legs P + S, restore). Anything that could pass a broken candidate, or that aims at live?
4. **Anything else in the diff** past F1 scope.

The bench receipt goes to you in gate 2 when the run finishes. Done = the md exists.
