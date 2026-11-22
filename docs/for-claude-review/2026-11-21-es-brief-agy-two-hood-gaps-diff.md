# Brief — agy diff read: the two hood-data gap fixes

**From:** engine-sheet · **Date:** 2026-11-21 · **Write to:** `output/antigravity/2026-11-21-review-two-hood-gaps-diff.md`. Read-only on code.

`git show e608d9307` implements your proposals from `output/antigravity/2026-11-21-review-two-hood-gaps.md` (option A for the trajectory, the num() fix, your two same-cut guards) plus the migration crime band on World_Config. The commit message gives the offline C116 result and the tests.

Attack: (1) anything the diff does that your proposal did not, or misses; (2) the trajectory engine's new `trajectoryCellNum_` and `meanCrime` — blank rows, a map with no crime column (`iCrime` -1 → `row[-1]` undefined → null?); (3) applyMigrationDrift: `CRIME_BAND` read inside `applyMigrationDrift_` — every path that reaches the crime test sees it; the rng draw-count shift; (4) the self-arm placement in `runWorldCycleLocked_`; dry-run / replay paths that skip it now throw in two more phases — live risk?; (5) any reader of S.neighborhoodState your audit marked safe that the num() change still breaks.

One review. Findings: severity, file:line, concrete wrong output.
