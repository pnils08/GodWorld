---
title: agy review — engine.214 Mood Per Hood Plan
created: 2026-10-10
updated: 2026-10-10
type: review
tags: [review, engine]
sources:
  - docs/plans/2026-10-10-engine-214-mood-per-hood.md
---

# agy review — engine.214 Mood Per Hood Plan

**Target:** docs/plans/2026-10-10-engine-214-mood-per-hood.md

**Result:** SHIP-WITH-FIXES

## Findings

1. Hunt 1 (D11 claim): Confirmed none. Searched codebase for `getClusterDynamics_`, `S.clusterDynamics`, `S.previousClusterDynamics`, and `clusterDefinitions`; no code readers outside `applyCityDynamics.js` (only tests and comments) — severity: LOW (documentation true).
2. Hunt 2 (D7 double application): Found. If cluster-level logic is moved to the hood loop without removing the existing "Demographics micro" (line 1423) and "Economy micro" (line 1437) blocks in `applyCityDynamics.js`, demographic and economic signals will be double-applied to each hood. Also, `unemploymentRate` thresholds (`applyDemographicModifiers_` lines 534-536) are tuned to cluster averages and will over-fire on individual hoods which have higher variance — severity: HIGH.
3. Hunt 3 (D1 live column read): Found. `applyCityDynamics.js` lines 1477-1479 reads `S.neighborhoodState[nhood].sentiment`, which is the live `Sentiment` column (A–O) written by the engine, used as the base momentum carrier for unclustered hoods on their first cycle — severity: HIGH.
4. Hunt 4 (D10 equal-22 mean issue): Calculated. The equal-22 mean weights tiny unclustered hoods (e.g., Eastlake with 2 citizens) equally to major hoods (e.g., West Oakland). The plan claims "no sample-vs-population confusion", but an equal mean makes the city mood hyper-sensitive to empty areas instead of representing the actual populace — severity: MEDIUM.
5. Hunt 5 (D8 bleed over 22 nodes vs 5): Calculated. In C110, the spread of sentiment across the 22 hoods is ~0.23. Applying a 0.12 bleed factor over 22 nodes (where max degree is higher and paths are longer) rapidly diffuses local spikes across the graph, collapsing the 0.23 spread towards the mean (~0.37) because there are no large cluster "reservoirs" to resist the bleed — severity: MEDIUM.
6. Hunt 6 (D2 hand tables keyed by hood): Found. `phase08-v3-chicago/v3NeighborhoodWriter.js` contains literal hand tables keyed by hood names: `getDemographicMarkerV35_` (lines 728-744) checks `neighborhood === 'Temescal'` for First Friday, `neighborhood === 'Downtown'` for Creation Day and Shock. The modifier block (lines 691-700) keys directly off `'Jack London'`, `'Downtown'`, and `'West Oakland'` — severity: HIGH.
7. Hunt 7 (D11 retire list still seeded): Found. `phase01-config/engine94SheetContract.js` (lines 312-317) still defines `ENGINE214_CONFIG_SEEDS` containing `clusterAnchors_<CLUSTER>`, which is used to validate the World_Config sheet. Four tests (`hoodBlindTables.test.js`, `engine94SheetContract.test.js`, `activityObservationsCarry.test.js`, `hoodEconomyRelative.test.js`) still require and seed this list — severity: MEDIUM.

## Disposition

<Filled by the Claude lane that acts on it: per finding, folded `<commit>` / rejected (<evidence>).>

**Reconciled in:** <[[../plans/...]] §Reviews reconciled — the plan row that points back at this review>
