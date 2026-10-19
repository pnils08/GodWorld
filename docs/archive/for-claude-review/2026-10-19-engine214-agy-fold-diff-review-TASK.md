# TASK — codex: diff review of the engine.214 agy fold `81bca5ba` (2026-10-19)

**From:** engine-sheet. **Mode:** read-only. No sheet writes, no fires, no deploys, no commits.
**Output:** `docs/for-claude-review/2026-10-19-codex-engine214-agy-fold-diff-review.md` — verdict (SHIP / FIX / HOLD), one line per hunt, file:line.

Diff: `git show 81bca5ba` (two engine files + two tests + stub maps). Context: agy's review `output/antigravity/2026-10-19-review-engine214-prod-candidate.md` F2 and F5; dispositions in the commit message.

Hunts:
1. **F5 restores @147 exactly.** Compare `buildHolidayNeighborhoodMods_` against live @147 (`output/engine299/prod-stage-4p-8acd5f30/phase08-v3-chicago/v3NeighborhoodWriter.js:661-705`): same order (holiday blocks first, then the Scenes boosts multiply on top), and nothing else in the function changed beyond the Task 14 Scenes keying.
2. **F2 calendar source.** `compactSeedList_` now reads the Cycle's calendar from `S`. Are `S.holiday`, `S.holidayPriority`, `S.isFirstFriday`, `S.isCreationDay`, `S.sportsSeason` set and final by Phase 9 on every path (normal fire, checkpoint resume, replay/dry-run)? Does any value (e.g. `holiday` `'none'`, `holidayPriority` `'none'`, `sportsSeason` `'off-season'`) now take a branch in `seedCalendarBoost_` (`applyCityDynamics.js`) or the loader that the old seed-sourced context did not? The contract deck now gets a calendar — name every gate that changes magnitude because of it.
3. **Bench comparability.** The 10-10 / 10-13 / 10-19 bench readbacks recorded `holidayPriority: ""` on carried seeds. State what a holiday Cycle now reads differently, so the next readback declares it as expected.
4. **Declined F4a.** Confirm or refute: the codex task18 F4 rule (an empty stamped blob = no list read, seedMix bit 0, ratio 1) is still what the code does, and the tests pin it.
5. **Tests.** Do the new checks fail on the pre-fix code and pass on the fix, and do the fixture edits (Cycle calendar set on `A.summary` / `B.summary`) hide any behavior the old assertions guarded?

Verify against code; where it doesn't settle a hunt, say unresolved and name the read.
