# TASK 2026-10-31 — codex: adversarial diff review, engine.329 (the PROD candidate, stage 36)

Commit `41160fe3` (engine + test). Diff: `git show 41160fe3 -- phase05-citizens/processAdvancementIntake.js scripts/engine304FamilyLottery.test.js` (the 19 archive renames in that commit are the inbox sweep, not under review). Bench: `feb5f481` — `output/engine-sheet/2026-10-31-e329-bench.log`, manifest `stage36-e329.sha256` = stage 35 (PROD @171) + that one file. Your finding: `docs/archive/for-claude-review/2026-10-31-codex-pipeline99-world-facing-review.md` F3 second paragraph.

**What it claims.** `processMediaUsage_` builds one `ledgerUpdates[lr]` per citizen per pass. `hard` ORed across the citizen's rows while `context`/`usageType` took the last row's, so a hard sports row followed by a neutral civic row wrote the hard-light line naming the civic piece. Now the first hard row's context and usageType stick for the pass; later rows, neutral or hard, never overwrite them. Nothing else in the object changed. Bench: planted rows (hard sports first, neutral civic second) for POP-00023 → C128 line "a Bay Tribune sports desk piece, C127", UsageCount 3 (−1, +1).

**Hunt.**
- Order: the hard row AFTER the neutral row (neutral first, hard second) — does the hard row's context win there too? Trace the two assignments.
- Two hard rows: first sticks by design — any reader that needs the latest, or a count that is off because `usageType` is frozen to the first hard row's type (`isEmergenceUsage_`, the byline exclusion at ~1377, `paperFameRowDelta_`)?
- A famous citizen: `famous` and `usageCount` paths unchanged — confirm no interaction with the frozen `usageType`.
- A family row (`isFamilyUsage_`) or an ambiguous name between the hard row and the neutral row — does the ledger branch still see the right prior update?
- The test: does it exercise the fix (it fails on `57cef469`), and does any sibling test depend on the last row's context?

**Out of scope.** `describeUsageContext_` presence (F3 first paragraph, decided), OriginGame (engine.328), engine.316 hood lines.

**Write to:** `docs/for-claude-review/2026-10-31-codex-engine329-hard-light-review.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, each finding with file:line and input → wrong output. Register it in `docs/index.md` in the same commit. No code edits, no network calls, no live runs, no bench fires.
