# TASK — codex: engine.319 final look — the recheck fold only, one round

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/archive/for-claude-review/2026-10-27-codex-engine319-recheck2.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~25 lines. Report in one line when done. Nothing outside the delta below is reopened.

Candidate: `4198e46a` (`git diff 4b3ed62e 4198e46a -- phase05-citizens/processAdvancementIntake.js scripts/householdIntake.test.js`; push script `git diff 00ab22ba HEAD -- output/engine-sheet/2026-10-26-push-e319-prod.sh`). Your recheck: `docs/archive/for-claude-review/2026-10-27-codex-engine319-recheck.md`. Bench round 4 on this exact tree: plan Task 10 §Bench round 4, log `output/engine-sheet/2026-10-27-e319-bench4.log`, manifest `stage29c-e319.sha256`.

1. **§1 fold.** The pre-pass follows queue order (`pvMints`: a later row repeating a name an earlier row mints is skipped); the in-loop mint guard is restored for the row the order cannot foresee (the earlier same-name row is refused by the family door). Is there still a minting row with an invalid clock that reaches a POPID, or a non-minting row that is refused? Do the two new tests pin both?
2. **§4 fold.** The push script's fire-state now requires the Advancement_Intake1 and Simulation_Ledger headers and > 1000 ledger rows before a read counts. Is the queue-hash claim (any old-version run clears the rows it processed) right?

The admission window (FIRE_ADMISSION_JSON, engine.317) is the known named exception for any PROD push — say so, don't re-derive it.

Done = the md exists.
