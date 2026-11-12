# Brief — codex re-review of the civic.47 B2 F7 fold (the one re-review)

From research-build, 2026-11-01. Review only: edit nothing in the repo, commit nothing, run no Cycle, write no Sheet. One output file: `docs/for-claude-review/2026-11-01-codex-civic47-b2-fold-rereview.md` — VERDICT line first, findings with `file:line` and the failing input.

## What you are reviewing
Your protected patch `output/codex/civic47-b2-protected.patch` landed in commit `2a6ccb214`, with folds. Read `git show 2a6ccb214` (8 files). agy reviewed the patched tree first: `output/antigravity/2026-11-01-review-civic47-b2-transit.md` (HOLD, verified by research-build against the code). The folds are the difference between your patch and `2a6ccb214`.

## The folds (what changed from your patch)
1. `civicTransitStageCohort_` (engine) and `stationServingHoodCohort` (pack `scripts/civicTransitCohort.js`) read only rows stamped with the observation Cycle. The live `Transit_Metrics` tab is an append log (Cycles 78–113, 8 station + 10 blank-`Station` rows per Cycle); your version failed `station-cycle-mismatch` on the first older row, so it could never read available on the live tab.
2. A hood's value is the sum of the stations located in it (`OAKLAND_BART_STATIONS[].neighborhood`). Corridor labels add no share and no hood (the patch credited a station's full ridership to every hood on its corridor list; `phase02-world-state/updateTransitMetrics.js` `transitStationShares_` splits it). A station hood reading 0 stays in the cohort as 0. A target hood with no station has no baseline (`target-hood-missing`). Builder delegated the choice 2026-11-01.
3. Pack `scripts/civicStageEvidence.js`: frozen city-membership test (`cityN` / `city`) and the 1e-6 edge rounding with `+1e-9` tolerance, matching `civicDeliveryEdge_` / `deliveryHoldStep`.
4. `scripts/engineAuditor.js` persists this Cycle's `Transit_Metrics` rows in `audit.snapshots`.
5. Tests added/changed in `lib/initiativePhaseContract.test.js`, `scripts/civic47Transit.test.js`, `scripts/engineAuditor.integration.test.js`.

## Hunt only what the folds could have broken, plus anything your patch still gets wrong
- Does the own-hood rule leave `stageBaselineFrom` / `deliveryEdge` / `deliveryHoldStep` with a path that reads a wrong or missing value (single-station hoods, two-station Downtown, a hood at 0, target hood absent)?
- Any disagreement among engine, lib and pack on available/unavailable or on the cohort's hood set.
- Anything that changes for health/education (hood-scope) rows.
- The audit snapshot filter: `Number(r.Cycle) === Number(cycle)` when `Cycle` cells are strings, blank, or a Date.
- Tests that cannot fail.
Facts you can check read-only: `output/beats/Transit_Metrics.jsonl`, `utilities/ensureTransitMetrics.js`, `output/engine_audit_c113.json`. A bench run of this exact commit is in flight (`output/engine-sheet/2026-11-01-c47b2-bench.log`); do not read it as a result until it says PASS.
