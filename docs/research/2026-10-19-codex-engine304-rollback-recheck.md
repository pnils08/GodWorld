---
title: Codex engine.304 rollback recheck
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [engine, citizens, review]
sources:
  - docs/for-claude-review/2026-10-19-engine304-rollback-recheck-TASK.md
  - docs/plans/2026-10-08-engine-286-game-of-life-events.md
pointers:
  - "[[plans/2026-10-08-engine-286-game-of-life-events]]"
---

# engine.304 rollback recheck — FIX; HOLD PROD

- **SHIP narrow closure:** The engine.304 Family emergence writer puts `MatchPopId`, `MatchType`, and a `GC family emergence … (engine.304)` note on its queued row, without `HouseholdKey` (`phase05-citizens/processAdvancementIntake.js:1825-1869`). The rollback selects it, preimages the whole row, blanks it, and reads back the selected row (`output/engine-sheet/2026-10-19-e304-rollback-data.js:34-41,52-60`). The two bench preimages show 82 Family GC rows in one run and one correctly identified queued probe in a later run; the plan reports zero left (`output/engine-sheet/2026-10-19-e304-rollback-preimage-bench-2026-10-20T00-26-21-735Z.json:1`; `2026-10-19-e304-rollback-preimage-bench-2026-10-20T00-26-51-453Z.json:1`; `docs/plans/2026-10-08-engine-286-game-of-life-events.md:531`). This is bench proof of one queue shape, not a live queue inventory.
- **FIX over-match:** The selector's `MatchPopId + MatchType + no HouseholdKey` fallback also selects a pre-engine.304 family-drip row: stage 9 writes exactly those fields with Notes `Family-match drip … (engine.66 lottery)` (`25ee233c^:phase05-citizens/processAdvancementIntake.js:1929-1937`; rollback script `:35-36`). It can silently delete a pre-existing queued arrival unrelated to engine.304. No live preimage or certified empty pre-304 queue was reviewed. Restrict deletion to an engine.304-specific note plus matching payload, or classify any other matching row explicitly before applying.
- **FIX household exception:** Generated household rows carry `HouseholdKey`, `MatchName`, and an engine.109 note, so the fallback excludes them (`phase05-citizens/processAdvancementIntake.js:2571-2582`). But the Notes-only first branch ignores `HouseholdKey`; household Notes also append operator `mm.notes` (`:2573`), so an intake note containing `(engine.304)` would clear that household row. Require blank `HouseholdKey` for the entire predicate. Generated owner rows have neither family Match field nor the marker, so the owner door does not match (`:2349-2362`).

**Final gate: HOLD PROD** until the rollback selector excludes unrelated queue rows or fails closed for explicit row-level review, with the result proven on bench. `node --check` passes; no Sheet, Cycle, cron, model, or canon action was run.
