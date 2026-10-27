# TASK — codex: engine.320 diff gate — one round

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-27-codex-engine320-diff-gate.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~25 lines. Report in one line when done.

Candidate: `2f2e7123` (`git diff ee27fadc 2f2e7123 -- phase05-citizens/processAdvancementIntake.js scripts/householdIntake.test.js`). PROD = stage 29 = `ee27fadc` (engine.319, live). Plan: `docs/plans/2026-07-27-employment-living-system.md` Task 11. engine.319's strict all-or-nothing clock rule (your final look §1) is settled; this job gives the off-map hood the same shape — do not reopen the clock rule.

1. **Coverage.** Is the pre-pass hood check a superset of every row that reaches the mint's hood fold (so the mint's bypass guard is unreachable), and is any row refused that the strict clock rule would not also check? Can an engine-written queue row (emergence, family lottery, owner door, household door) carry a hood the map rejects — e.g. a `City-wide` business through the owner door, a Generic_Citizens hood — and so refuse a whole live queue? Live read 2026-10-27: queue and GC carry no off-map hood; Business_Ledger has 10 `City-wide` rows, all large public institutions.
2. **Tests.** Section 8's mid-pass log-flush cases moved from the hood throw to a pay-lookup breaker — do they still test what engine.279 needs? Does section 11 pin atomicity (a valid mint ahead, nothing minted / cleared / logged)?
3. **Bench proof shape.** `output/engine-sheet/2026-10-27-e320-bench6.sh`, `2026-10-27-push-e320-bench.sh`, probe `2026-10-26-e319-probe2.js --badhood / --expect-badhood`: N6 (stage 30 neutral) compared with round 5's N5 (stage 29); H6 (stage 30, typo hood last) refused whole; P6 (stage 29, same lay) recorded as the defect. Is that enough to push, and does the push script build the stage it claims? (The run's log lands when it finishes; judge the shape if it is not there yet.)

The admission window (FIRE_ADMISSION_JSON, engine.317) is the known named exception for any PROD push — say so, don't re-derive it.

Done = the md exists.
