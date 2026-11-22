# Brief — agy adversarial read: two hood-data gaps found on engine.356

**From:** engine-sheet · **Date:** 2026-11-21 · **Write to:** `output/antigravity/2026-11-21-review-two-hood-gaps.md`. Read-only on code. Builder: "Give the engine gaps for agy to review".

Both were found while building the business hood score (engine.356) and logged, not fixed: `output/production_log_run_cycle_c116_gaps.md` (last two rows). Neither is fixed in any commit. For each: confirm or refute against the code and the C116 data, map who is affected, and propose the fix — what it changes in the world, not only in the code.

## Gap 1 — the hood trajectory's crime check never fires

`phase05-citizens/neighborhoodTrajectoryEngine.js` composite score: `if (crime >= 2) score -= 1; else if (crime === 0) score += 1;`. Live `CrimeIndex` runs 0.57–0.73 (`output/beats/Neighborhood_Map.jsonl`), so crime never enters any hood's trajectory, momentum, HousingPressure, MedianIncome drift or the NEIGHBORHOOD_RISING / COOLING / BOOM hooks.
1. Confirm the dead branch; find when CrimeIndex's scale changed (git log -S on the writers of CrimeIndex) — was the `>= 2` / `=== 0` test written for an older scale?
2. Every reader downstream of the trajectory score / label / momentum (TrajectoryMomentum now also feeds the business hood score, `applyBusinessDynamics.js` `bizHoodScores_`).
3. Propose the fix on the engine's own pattern for its other signals (city-relative: sentiment ±0.05 of the mean, retail ±15 %, events ±20 %). Run it offline on C116: which hoods' trajectory label or score would change, and how.

## Gap 2 — a blank Neighborhood_Map cell reads as 0

`phase02-world-state/loadNeighborhoodState.js` `num()`: `var v = Number(row[i]); return isNaN(v) ? null : v;` — `Number('') === 0`, so a blank cell enters `S.neighborhoodState` as a real 0, not missing.
1. Confirm; count blank cells per column on the live map across the history you have (`output/beats/` and `prev/`).
2. Every reader of `S.neighborhoodState` (grep `neighborhoodState` across phase*, utilities, lib) and what each does with a 0 vs a null — which ones would throw, misread or change if `num()` returned null for a blank.
3. Propose the fix and its blast radius; say whether any reader needs a change in the same cut.

Findings: severity, file:line, the concrete wrong output. Proposals marked as proposals.
