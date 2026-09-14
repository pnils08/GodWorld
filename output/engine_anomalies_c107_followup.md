# Engine Anomalies — C107 Followup (engine-sheet)

Routed from `output/engine_review_c107.md`. Engine-debug items; none is a story until cleared.

## A. Ten hoods missing from the Phase-2 cluster table (engine.165 root cause) — CUT NEXT

- The 12 hoods in `applyCityDynamics.js:585` `CLUSTERS` (a hardcoded five-cluster literal) moved a mean −0.037 at C107; the 10 hoods not in it (Adams Point, Baylight District, Brooklyn, Dimond, East Oakland, Eastlake, Glenview, Grand Lake, Ivy Hill, San Antonio — all with citizens on the ledger) moved a mean +0.306, in lockstep with Riley `CitySentiment` 0.25 → 0.51. Same split in reverse at C106 (scalar 0.84 → 0.25).
- `phase08-v3-chicago/v3NeighborhoodWriter.js:411-413`: `hoodBaseSent = nd.sentiment` when `S.neighborhoodDynamics[hood]` exists, else `baseSentiment` (= `dynamics.sentiment`, the citywide scalar). `phase02-world-state/applyCityDynamics.js:1395` populates `neighborhoodDynamics` only for hoods in `CLUSTERS`.
- Fix, bench first: build the cluster membership from the sheet (Neighborhood_Map `District` + `Adjacent` columns, every row) instead of the literal, so all 22 hoods carry their own momentum track. Minimum fallback if the table must stay: in the writer, blend the city-scalar fallback against the hood's prior saved Sentiment with the same `nhMom` the tracked hoods get. Consumers of `neighborhoodDynamics`: applyCityDynamics:1818, updateCrimeMetrics:231/:924, v3NeighborhoodWriter:411 — read the crime path before changing the object's shape (item C below is the same object).

## B. Four Tier-4 incomes doubled in one pass (route-to-engine-debug, high)

| POPID | Citizen | Role | Hood | Stage | C106 | C107 | Peer share |
|---|---|---|---|---|---|---|---|
| POP-00784 | Isaac Martinez | Plumber | Ivy Hill | mid-career | 45,800 | 99,200 | 0% |
| POP-00812 | Millicent Kumar | Plumber | Chinatown | entry-level | 47,800 | 98,900 | 4% |
| POP-00951 | Niani Oakley | Plumber | Chinatown | mid-career | 49,300 | 111,300 | 4% |
| POP-00874 | Nandini Muhammad | Independent Bookstore Owner | Temescal | entry-level, SELF_EMPLOYED | 28,522 | 61,000 | 3% |

- Three Plumbers, all `employerBizId: UNTRACKED`, all ~×2.1 — the shape of a role re-price (`jobReferencePay_`, @66) or the untracked-job reference RAISE-ONLY door (`applyUntrackedJobReference_`), not four life events. Four suppressed cohort entries (POP-00867/889/899/909, +110–172%, 19% peer share) likely the same pass.
- Check: which writer set `Simulation_Ledger.Income` for these rows at C107. Log order candidates: `applyTierLadderState_` (8 promoted), engine.157 maneuver (climb 201), `processGenerationalWealth_` (Income: 5), `processAdvancementIntake_` (advancementsProcessed 70). If a re-price fires on a role whose catalog median sits far above the citizen's stage pay, the stage multiplier or a per-cycle cap is the fix.
- C106 item A (POP-00260 / POP-00268) is **closed**: the @66 floor landed at C107 (215,100 → 60,800; 283,800 → 93,271 = the C104 value).

## C. Violent crime fell in nine hoods at once (cover-as-story flagged; mechanism unread)

- Downtown 50 (−9.0σ), Laurel 21 (−6.4σ), Chinatown 37 (−4.5σ), West Oakland 51 (−4.3σ), Rockridge 19, Uptown 24, East Oakland 53, Adams Point 22 (≈ −4.2σ), Jack London 36 (−3.5σ). Six of nine are outside INIT-002's footprint.
- `Crime_Metrics` has no cycle history on the sheet (one row per hood, `LastUpdated`); the σ comes from the auditor's 4 prior snapshots. Read `phase03-population/updateCrimeMetrics.js` (:231, :924 read `neighborhoodDynamics` — item A's object) for what moved ViolentCrimeIndex citywide at C107 before any consumer credits OARI.

## D. `illnessConvergenceRate` missing from World_Config (three cycles)

- `Riley_Digest.Issues`: `World_Config key "illnessConvergenceRate" missing; using default 0.25 (engine.102 W2b)`. Seed it through the engine.94 contract (`engine94SheetContract.js` seeds) so the engine stops logging a default and the repeating-event detector stops reading an engine notice as a recurring civic issue. One line, next bench.

## E. Advancement phase 56.1s (C106: 23.9s)

- `processAdvancementIntake_`: 47s gap between `checkEmergencePromotions_: queued 2` (8:31:58) and `seedEmergenceBonds_` (8:32:45). Not a failure; watch it at C108 — if it doubles again it is a per-cycle growth term.
