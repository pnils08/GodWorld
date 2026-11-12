# Brief — adversarial code review, civic.47 B2 F7 transit stage reader

Reviewer: agy. Requester: research-build. Date 2026-11-01. Review only: edit nothing in the repo, commit nothing, run no Cycle, write no Sheet. Your one output is `output/antigravity/2026-11-01-review-civic47-b2-transit.md`.

## Target
`output/antigravity/2026-11-01-civic47-b2-transit.diff` (working-tree diff against HEAD, 5 files). It lets a staged transit initiative be judged on ridership lift in the hoods its stations serve (scope `station-serving-hood`), where before transit was blocked `no-delivering-reader`.
- Engine (deployed, Apps Script): `phase05-citizens/civicInitiativeEngine.js` — new `civicTransitStageCohort_`, scope branches in `civicStageRequirementWith_`, `civicStageBaselineFrom_`, `civicDeliveryEdge_`, `freezeCivicStageCohort_`, `applyCivicStageBaseline_`.
- Node mirror + test: `lib/initiativePhaseContract.js`, `lib/initiativePhaseContract.test.js`.
- Pack mirror: `scripts/civicTransitCohort.js`, `scripts/civic47Transit.test.js`.
Context: plan `docs/plans/2026-10-31-civic-autonomy.md` §B2 (F7: "station-to-hood evidence for transit; the same capability test in the pack and engine"). Station map: `utilities/ensureTransitMetrics.js` (`OAKLAND_BART_STATIONS`). Hood resolver: `phase01-config/canonNeighborhoodLoader.js` `resolveHoodOrChild_`.

## Live facts you can check (read-only)
- `output/beats/Transit_Metrics.jsonl`: an append log, 36 Cycles (78–113), per Cycle 8 station rows + 10 rows with blank `Station` (corridor rows).
- `output/beats/Initiative_Tracker.jsonl`: INIT-003 is the only transit row and has no `Stage`.
- The freeze reads the prior Cycle (N-1) as the observation; the baseline is captured at vote/conversion; the delivery edge compares a later cohort to the frozen baseline.

## Hunt (report each as CONFIRMED with the failing input, or NOT FOUND with what you checked)
1. Any assumption about the SHAPE of Transit_Metrics that fails on the live tab (multi-Cycle log, corridor rows, string vs number cells, duplicated rows from a re-fired Cycle).
2. Any place the three copies (engine, lib, pack) disagree on a rule that decides available / unavailable / which hoods are in the cohort.
3. Fail-open paths: a partial, stale, or wrong-scope cohort that reads as available, or a hood that gets a value from a station that was never observed.
4. Silent fallbacks, clamps or defaults that hide a failure (`|| 'hood'`, missing-global handling of `OAKLAND_BART_STATIONS`, `resolveHoodOrChild_` throwing inside the freeze).
5. A scope-string mismatch anywhere between catalog, baseline descriptor and cohort that would make `deliveryEdge` refuse a baseline this code just wrote.
6. Tests that cannot fail: assertions that pass on the old behaviour, fixtures that cannot reach the branch they name, a mock that hides the real resolver.
7. Behaviour change for rows that are NOT transit (hood-scope domains: health, safety, economic) — anything the diff alters for them.

## Output format
`VERDICT: SHIP | HOLD` on line 1, then findings numbered, each with `file:line`, the exact input or state that breaks it, and CONFIRMED / NOT FOUND. Findings first, no summary of the diff. Do not propose redesigns; if the model of summing a station's ridership into every hood on its corridor list is wrong, say so once as a separate line headed `MODEL:` — it is the builder's call, not a defect finding.

## Already known — do not spend the review on it
`civicTransitStageCohort_` (and its lib/pack mirrors) adds each station's full `RidershipVolume` to every hood in that station's served set (own hood + corridors), with no split. `phase02-world-state/updateTransitMetrics.js` `transitStationShares_` (:239) already splits riders between a station's primary and catchment hoods. The builder has been told; the hood-value rule will change. Hunt items 1–7 are independent of it — but if any finding depends on how the hood value is computed, say which.
