---
title: Codex engine.304 rollback recheck 2
created: 2026-10-19
updated: 2026-10-19
type: reference
tags: [engine, citizens, review]
---

# engine.304 rollback selector — SHIP

**SHIP:** `is304` requires both Match fields, a blank `HouseholdKey`, and the exact engine.304 family-emergence note shape (`output/engine-sheet/2026-10-19-e304-rollback-data.js:37-41`), matching the candidate writer (`phase05-citizens/processAdvancementIntake.js:1851-1868`). The selected row is preimaged, cleared, and read back (`rollback-data.js:47,58-66`); the named bench preimage contains one correctly selected queue row (`output/engine-sheet/2026-10-19-e304-rollback-preimage-bench-2026-10-20T00-28-50-218Z.json:1`).
**Prior over-matches closed:** stage-9 drip notes say `engine.66`, household rows carry `HouseholdKey` and end with `engine.109`, and generated owner rows have no Match fields (`25ee233c^:phase05-citizens/processAdvancementIntake.js:1929-1937`; `phase05-citizens/processAdvancementIntake.js:2571-2582,2349-2362`). Other family-shaped rows are logged and left untouched (`rollback-data.js:41-42`). The plan reports the three-probe bench result (`docs/plans/2026-10-08-engine-286-game-of-life-events.md:531`); no live rollback was performed in this review. Its earlier “Notes … or MatchPopId” wording on that line is stale; the later AND wording and code govern the selector.
