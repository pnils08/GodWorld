# Adversarial Read — Two Hood-Data Gaps Found on engine.356

- **Date:** 2026-11-21 · **Lane:** antigravity (`agy`) · **Mode:** Read-only on code
- **Brief:** `docs/for-claude-review/2026-11-21-es-brief-agy-two-hood-gaps.md`
- **Source log:** `output/production_log_run_cycle_c116_gaps.md` (last two rows, C116 watch table)
- **Files audited:** `phase05-citizens/neighborhoodTrajectoryEngine.js`, `phase02-world-state/loadNeighborhoodState.js`, and all downstream readers of `S.neighborhoodTrajectory`, `Neighborhood_Map` trajectory/momentum/pressure/income/rent columns, and `S.neighborhoodState`
- **Verdict:** **CONFIRMED (both gaps); SHIP-WITH-FIXES** on the proposed remediations below (including two reader guards exposed by Gap 2 and a dead-band catch on Gap 1).

---

## Executive Summary

1. **Gap 1 (`neighborhoodTrajectoryEngine.js:182-183`) — CONFIRMED.** `if (crime >= 2) score -= 1; else if (crime === 0) score += 1;` was written in `66f3c7e88` (2026-07-12, S315 `engine.54`) against an integer SAFETY-event-count proxy (`~0` when quiet, `2–3` on safety spikes) and was missed 9 days later when `3c819a7d0` (2026-07-21, S328 `engine.72`) moved `v3NeighborhoodWriter.js` `CrimeIndex` onto `Crime_Metrics` per-hood physics (`/ 50`, centered around `1.0`, fractional). Live C115 and C116 `CrimeIndex` run `0.57–0.73` (`mean = 0.6500`, `median = 0.6400`), so the branch fires on **0 of 22 hoods**.
   - **Adversarial catch on the naive city-relative port:** Because C116 `CrimeIndex` sits in `0.57–0.73` (`±12.3%` around mean `0.65`, SD `0.0510`), copying RetailVitality's **`±15%` of mean (`0.5525..0.7475`) still catches 0 of 22 hoods** on both C115 and C116. Moving to **`±0.05` of mean** (Sentiment's pattern: `[0.6000, 0.7000]`, firing on 8/22 hoods) or **`±10%` of mean** (`[0.5850, 0.7150]`, firing on 5/22 hoods) both activate crime scoring and produce the **same single trajectory label flip on C116**: **Baylight District** (`CrimeIndex = 0.57`, tied lowest in the city) moves from `score -2 (decay)` to `-1 (steady)`.
2. **Gap 2 (`loadNeighborhoodState.js:107-111`) — CONFIRMED.** `num()` calls `Number(row[i])` without checking for `''` / whitespace / `null`. In JS, `Number('') === 0`, so any blank numeric cell enters `S.neighborhoodState` as `0`, not `null`. Across all six C115/C116 `Neighborhood_Map` dumps/backups on disk (`output/beats/`, `prev/`, `output/repairs/c116-first-fire-held/`, `backups/sheets/2026-11-16/`), **0 numeric cells are currently blank** (only `ChildAreas` [12] and `Scenes` [10] carry blanks), so live C116 state is uncorrupted — the defect is a latent hazard whenever a new hood row or optional column (`RentShare`, `BoomIndex`, `WealthMin`/`Max`) is blank.
   - **Reader audit:** All 46 external `ctxMap` references + `utilities/ensureCrimeMetrics.js` were read. **Zero readers throw** if `num()` returns `null` for blank. **Nine sites change behavior — all for the better** (stopping phantom `0`s from distorting medians, EMA, `bizHoodScores_`, `creditFactorFor_`, `processSettledInCheck_`, etc.). **Two readers STILL convert `null` back to `0`** via `Number(null) === 0` (`generateCitizensEvents.js:2062-2063` and `generateCrisisSpikes.js:474-476`) and need explicit `null` guards in the same cut.

---

## Gap 1 — `neighborhoodTrajectoryEngine.js` Crime Check Never Fires

### 1. Confirmation & Scale History (`git log -S`)

- **Finding [High]:** `phase05-citizens/neighborhoodTrajectoryEngine.js:182-183`
  - **Code:**
    ```js
    if (crime >= 2) score -= 1;
    else if (crime === 0) score += 1;
    ```
    where `var crime = Number(row[iCrime]) || 0;` (`:163`), and lines `125-137` compute `meanSent`, `meanRetail`, `meanEvent` with no `meanCrime`.
  - **Concrete wrong output (`input -> wrong output`):**
    `Baylight District` in C116 (`output/beats/Neighborhood_Map.jsonl:21`) has `CrimeIndex: 0.57` (tied lowest in Oakland with `Downtown`), `Sentiment: 0.06` (`0`), `RetailVitality: 6.75` (`-1`), `EventAttractiveness: 5` (`-1`), `MigrationFlow: -1` (`0`). Because `0.57 !== 0` and `0.57 < 2`, crime contributes `0` instead of `+1`, giving `score = -2` (`decay`) instead of `-1` (`steady`). Across all 22 hoods in C116 (`CrimeIndex` min `0.57`, max `0.73`, mean `0.6500`), crime contributes `0` everywhere, collapsing the composite score range from `−5..+5` (`:59`) to `−4..+4`.
- **Git timeline (`git log -S CrimeIndex`):**
  1. `eca21a511` (2026-06-20, S265 `engine.11`): Corrected `chaosCarsConfig.js` `CrimeIndex` deltas from `[2, 6]` to fractional `[0.04, 0.15]`, noting live `CrimeIndex` sat at `0–1`.
  2. `66f3c7e88` (2026-07-12, S315 `engine.54`): Created `phase05-citizens/neighborhoodTrajectoryEngine.js` (replacing `gentrificationEngine.js`). At this date, `v3NeighborhoodWriter.js` still computed `CrimeIndex` as an integer count of SAFETY-domain/keyword events (`Math.max(0, Math.round(baseCrimeCount * profile.crimeMod + (rng() < 0.3 ? 1 : 0)))`), which sat at `~0` when quiet and jumped to `2–3` on SAFETY bursts (`3c819a7d0` commit note). Thus `crime >= 2` / `crime === 0` was written for that integer-count scale.
  3. `3c819a7d0` (2026-07-21, S328 `engine.72` G-EC56): Replaced `v3NeighborhoodWriter.js` (`:518-524`) with `((propertyCrimeIndex + violentCrimeIndex) / 2 / 50)`, moving `CrimeIndex` permanently onto a fractional `Crime_Metrics`-derived scale centered near `~1.0` (and `~0.65` in C115–C116 after `engine.241` crime recalibration `ed31af91a` / `e2b577ae1`). The `3c819a7d0` measure-twice check inspected `applyMigrationDrift.js` and `runConductEngine.js`, missing `neighborhoodTrajectoryEngine.js` created 9 days prior.
  4. Subsequent readers moved to median/mean-relative bands (`applyMigrationDrift.js` `engine.184`, `runNeighborhoodEngine.js` `engine.212`, `detectIncoherence.js` 2.0.0, `applyBusinessDynamics.js` `engine.356`), leaving `neighborhoodTrajectoryEngine.js:182-183` as the last absolute `0` / `>= 2` crime check in `phase*`.
  - *(Sibling note, out of scope for trajectory file: `phase06-analysis/applyMigrationDrift.js:436-437` uses `medCrime * 1.15` / `medCrime * 0.85`; at C116 `medCrime = 0.64`, `0.64 * 0.85 = 0.544` and `0.64 * 1.15 = 0.736`, which also catches 0/22 hoods in C116.)*

### 2. Downstream Map (Who Reads Trajectory Score / Label / Momentum / Side-Effects)

Every reader of `updateNeighborhoodTrajectories_` outputs (`NeighborhoodTrajectory`, `TrajectoryMomentum`, `TrajectoryStartCycle`, `HousingPressure`, `MedianIncome`, `MedianRent`, `S.neighborhoodTrajectory`, and story hooks):

| Downstream Consumer | Exact Location | Field(s) Read | Effect of Score/Label/Momentum Shift |
|---|---|---|---|
| **Business hood score** | `phase05-citizens/applyBusinessDynamics.js:537,560-564,685,739` | `S.neighborhoodState[hood].trajectoryMomentum` (1-cycle lag via Phase 2) | `bizHoodScores_` scores `(momentum - 5) / 5`, weight `bizHoodWeight_momentum = 1` (1 of 8 signals). Drives resting `Growth_Rate` target `classMiddle + hoodScore * bizHoodSpan (5pp)`. |
| **Intra-city relocation (same cycle)** | `phase05-citizens/migrationTrackingEngine.js:560-568,595-611` | `S.neighborhoodTrajectory` (`trajectory`, `pressure`, `rent`, `income`) | `scoreHoodFit_`: `+1.5` for `growth`, `-2.0` for `decay`, `-pressure / 4`, plus income proximity and rent burden (`rent` derived from post-drift `MedianIncome`). |
| **Migration settled-in verdict** | `phase05-citizens/migrationTrackingEngine.js:511-530` | `S.neighborhoodState[hood].trajectory`, `.housingPressure` | 10 cycles post-move: opportunity moves judge `traj !== 'decay'`; `decay` stamps `[Home-Composure-Down-S]`, `steady`/`growth` stamps `[Home-Composure-Up-S]`. |
| **Displacement pressure map** | `phase05-citizens/migrationTrackingEngine.js:317-327` | `Neighborhood_Map.HousingPressure` | Feeds citizen `DisplacementRisk` (`assessDisplacementRisk_`). |
| **Citizen neighborhood state pool** | `phase05-citizens/generateCitizensEvents.js:2061-2080` | `S.neighborhoodState[hood].trajectory`, `.trajectoryMomentum`, `.housingPressure` | `hoodReactionSet_` picks growth/steady/decay lines; intensity `mi = |tMom - 5| / 5` scales pool weight up to `5×` (`pw()`). |
| **Event Content Ledger DSL** | `phase02-world-state/loadEventContentLedger.js:105-106`, `phase05-citizens/generateCitizensEvents.js:3591-3592` | `hoodtrend` (`trajectory`), `momentum` (`trajectoryMomentum`) | Gates ECL lines conditioned on `hoodtrend=growth|steady|decay` and numeric `momentum`. |
| **Neighborhood engine life lines** | `phase05-citizens/runNeighborhoodEngine.js:616-632,701` | `S.neighborhoodState[hood].trajectory`, `.housingPressure` | `growth` writes `Neighborhood-Outabout-Up-S`; `decay` writes `Neighborhood-Outabout-Down-S`; `steady` suppresses texture drift lines (`noDialBySource`). |
| **Micro-events** | `phase04-events/generateGenericCitizenMicroEvent.js:417-420` | `S.neighborhoodState[hood].trajectory` | `hoodSign_`: `growth` → `dial:outabout:up`, `decay` → `dial:outabout:down`, `steady` → `null` (omitted). |
| **Debt credit factor** | `phase05-citizens/generationalWealthEngine.js:363-370` | `S.neighborhoodState[hood].trajectoryMomentum`, `.housingPressure` | `creditFactorFor_`: `1 - (mom - 5) * 0.04 + max(0, press - 7) * 0.03` (clamped `0.75..1.25`). At `mom = 0` (`decay` pinned), debt-rise odds increase `+20%` (`1.20×`); at `mom = 5` (`steady`), `1.00×`. |
| **Rent / home pricing & tax** | `loadNeighborhoodState.js:37-52,128`, `householdFormationEngine.js:973`, `generationalWealthEngine.js:1801,2310,2444` | `MedianIncome` drift (`±0.2%/−0.1%`) → `hoodRentFromIncome_` → `MedianRent` | Growth/decay drift on `MedianIncome` propagates to `MedianRent`, lease pricing (`estimateRent_`), home sale/purchase prices, and annual property tax. |
| **Civic office approval ratings** | `phase05-citizens/updateCivicApprovalRatings.js:150-155,193-221` | `S.neighborhoodState[hood].trajectoryMomentum` | Largest weight (`1.5` vs `1.0` crime / `1.0` sentiment / `0.25` retail) in `APPROVAL_STATE_MEASURES_`, shaping council district state scores. |
| **School quality drift** | `phase03-population/updateNeighborhoodDemographics.js:716,737` | `S.neighborhoodState[hood].housingPressure` | `causes.pressure = -(pressure - medPressure) / 5` nudges `education.quality`. |
| **Crisis buckets** | `phase03-population/generateCrisisBuckets.js:237,321-325` | `S.neighborhoodState[hood].housingPressure` | High `housingPressure` z-score contributes a crisis evidence channel (`HOUSING_Z`). |
| **Story hooks & newsroom slices** | `neighborhoodTrajectoryEngine.js:339-401`, `lib/neighborhoodSlice.js:68-69`, `scripts/buildNeighborhoodSlice.js:110`, `scripts/buildTrendsSlice.js:134`, `scripts/buildCivicOfficeSlice.js:348-401`, `scripts/buildNeighborhoodCards.js:636`, `scripts/buildInitiativePackets.js:374`, `scripts/civicBrief.js:27`, `scripts/worldViewCheck.js:328-330` | `NEIGHBORHOOD_RISING`, `NEIGHBORHOOD_COOLING`, `NEIGHBORHOOD_BOOM`, `HOUSING_PRESSURE_HIGH`, plus sheet columns | Drives desk prewrite hooks, civic office packets, neighborhood cards, and the world-view direction scale (`Momentum - 5`). |

### 3. Proposed Fix (PROPOSAL) & Offline C116 Replay

- **Why `±15%` of mean does not work here:**
  On C116 (`output/beats/Neighborhood_Map.jsonl`), `CrimeIndex` has `mean = 0.6500`, `median = 0.6400`, `SD = 0.0510`, `min = 0.57`, `max = 0.73` (`±12.3%` spread). A `±15%` mean band (`[0.5525, 0.7475]`) or `±15%` median band (`[0.5440, 0.7360]`) **fires on 0 of 22 hoods** (same on C115: `[0.5502, 0.7444]` vs `0.57–0.73`). For comparison, the other 4 signals on C116 fire on: Sentiment `±0.05` (16/22), Retail `±15%` (19/22), Events `±20%` (13/22), MigrationFlow `±2` (13/22).
- **PROPOSAL:** Compute `meanCrime` over rows with a valid numeric `CrimeIndex` (`raw !== '' && raw !== null && !isNaN(Number(raw))` — protecting against blank cells reading as `0` once Gap 2 is fixed), and score `CrimeIndex` using one of two city-relative bands:
  - **Option A (RECOMMENDED — matches `Sentiment`'s `±0.05` off the mean, or `±8%` of `meanCrime` for scale invariance):**
    ```js
    if (crime > meanCrime + 0.05) score -= 1;       // or meanCrime * 1.08
    else if (crime < meanCrime - 0.05) score += 1;  // or meanCrime * 0.92
    ```
    Fires on **8 of 22 hoods** on C116 (`36%`: 5 `+1` at `0.57–0.59`, 3 `-1` at `0.73`, 14 neutral at `0.60–0.70`). Matches the `0.05` step already used for `CrimeIndex` in `scripts/engine-auditor/detectIncoherence.js:47` (or `±8%` stays proportional if citywide crime later doubles to `~1.30`, yielding the identical 8 hoods on C116 `[0.5980, 0.7020]`).
  - **Option B (`±10%` of `meanCrime`: `crime > meanCrime * 1.10` / `< meanCrime * 0.90`):**
    Fires on **5 of 22 hoods** on C116 (`23%`: 2 `+1` at `0.57`, 3 `-1` at `0.73`).

- **Offline run on C116 (`phase05-citizens/neighborhoodTrajectoryEngine.js` executed directly via Node VM against `output/beats/Neighborhood_Map.jsonl`):**

| Neighborhood | C116 `CrimeIndex` | Current (`>=2 / ===0`) | Option B (`±10%` mean: `<0.585` / `>0.715`) | Option A (`±0.05` mean: `<0.600` / `>0.700`) | World Change |
|---|---:|---|---|---|----|
| **Baylight District** | **0.57** | **score `-2`, `decay`, mom `0`, inc `138606`** | **score `-1`, `steady`, mom `1`, inc `138745`** | **score `-1`, `steady`, mom `1`, inc `138745`** | **LABEL FLIP (`decay` → `steady`).** Stops momentum pinning at `0` (steps `0 → 1`, climbing toward `5`); resets `TrajectoryStartCycle` `108 → 117`; halts `-0.1%/cycle` `MedianIncome` decay (`138745` held vs `138606`); removes `-2` relocation penalty (`scoreHoodFit_`); stops `Neighborhood-Outabout-Down-S` citizen drift lines; `creditFactorFor_` eases from `1.20 → 1.16` (toward `1.00`); `bizHoodScores_` lifts from `-0.031` (`mom=0`) → `-0.006` (`mom=1`) → `+0.094` (by `mom=5`, `+0.625pp` business growth target). |
| Downtown | 0.57 | score `3`, `growth`, mom `10` | score `4`, `growth`, mom `10` | score `4`, `growth`, mom `10` | Score-only (`+1`); label/momentum/income/hooks unchanged. |
| Temescal | 0.73 | score `0`, `steady`, mom `5` | score `-1`, `steady`, mom `5` | score `-1`, `steady`, mom `5` | Score-only (`-1`); label/momentum/income/hooks unchanged. |
| Fruitvale | 0.73 | score `4`, `growth`, mom `10` | score `3`, `growth`, mom `10` | score `3`, `growth`, mom `10` | Score-only (`-1`); label/momentum/income/hooks unchanged. |
| San Antonio | 0.73 | score `-3`, `decay`, mom `0` | score `-4`, `decay`, mom `0` | score `-4`, `decay`, mom `0` | Score-only (`-1`); label/momentum/income/hooks unchanged. |
| Jack London | 0.59 | score `4`, `growth`, mom `10` | score `4` (unchanged) | score `5`, `growth`, mom `10` | Score-only (`+1` under Option A only); unchanged otherwise. |
| Piedmont Ave | 0.59 | score `2`, `growth`, mom `7` | score `2` (unchanged) | score `3`, `growth`, mom `7` | Score-only (`+1` under Option A only); unchanged otherwise. |
| Lake Merritt | 0.59 | score `0`, `steady`, mom `5` | score `0` (unchanged) | score `1`, `steady`, mom `5` | Score-only (`+1` under Option A only); unchanged otherwise. |
| *Other 14 hoods* | 0.60–0.70 | — | unchanged | unchanged | Unchanged (Grand Lake still flips `steady → growth` at score `3`, emitting `NEIGHBORHOOD_RISING` + `NEIGHBORHOOD_BOOM` under all variants; total hooks `11` under all variants). |

  - **Test note:** `scripts/migrationRelocation.test.js:119-122` uses an old-scale synthetic 4-hood fixture (`CrimeIndex: 0, 1, 1, 3`) and `scripts/testNeighborhoodLoop.js:275-281` tests `loadNeighborhoodState_` (`CrimeIndex: 2, 0`). Both were verified; `migrationRelocation.test.js` (87/87) does not assert `Lowmarket`/`Middleton` raw trajectory scores, though updating its `nmValues()` fixture or adding a dedicated `neighborhoodTrajectoryEngine` crime test is recommended when the fix lands.

---

## Gap 2 — Blank `Neighborhood_Map` Cell Reads as `0` in `loadNeighborhoodState_`

### 1. Confirmation & Historical Blank Audit

- **Finding [High]:** `phase02-world-state/loadNeighborhoodState.js:107-111`
  - **Code:**
    ```js
    function num(row, i) {
      if (i < 0) return null;
      var v = Number(row[i]);
      return isNaN(v) ? null : v;
    }
    ```
  - **Mechanism & Failure (`input -> wrong output`):**
    In JavaScript, `Number('') === 0`, `Number('   ') === 0`, and `Number(null) === 0`, and `isNaN(0)` is `false`. Any blank numeric cell on `Neighborhood_Map` enters `S.neighborhoodState[hood]` as **`0`** instead of **`null`**, directly contradicting the file's own contract at `:86` (`"a blank reads null, never a default"`).
    Concrete example: if a newly added hood row has a blank `TrajectoryMomentum` cell (`''`), `loadNeighborhoodState_` stores `trajectoryMomentum: 0`, which `applyBusinessDynamics.js:537,560-562` (`bizHoodScores_`) scores as `bizClamp_(1 * (0 - 5) / 5, -1, 1) = -1.0` ("falling hard") instead of omitting the missing signal (`bizHoodNum_` omits `null`); `updateCivicApprovalRatings.js:199-200` treats `0` as a real extreme-low momentum score in district approval; and `generationalWealthEngine.js:366` (`creditFactorFor_`) penalizes the hood's residents with `creditFactor = 1.20` instead of neutral `1.00`.
- **Blank count across all `Neighborhood_Map` history on disk:**
  Checked all 6 `Neighborhood_Map` files in the repo (`22` rows each):
  - `output/beats/Neighborhood_Map.jsonl` (C116): **`0` blanks** in all numeric columns (`ChildAreas`: 12 blanks, `Scenes`: 10 blanks).
  - `output/beats/prev/Neighborhood_Map.jsonl` (C115): **`0` blanks** in all numeric columns (`ChildAreas`: 12, `Scenes`: 10).
  - `output/repairs/c116-first-fire-held/beats_as_dumped_c116/Neighborhood_Map.jsonl` (C116 fire 1): **`0` blanks** in all numeric columns (`ChildAreas`: 12, `Scenes`: 10).
  - `output/repairs/c116-first-fire-held/beats_as_dumped_c116/prev/Neighborhood_Map.jsonl` (C115): **`0` blanks** in all numeric columns (`ChildAreas`: 12, `Scenes`: 10).
  - `output/repairs/c116-first-fire-held/beats_prev_untracked_Neighborhood_Map.jsonl` (C115): **`0` blanks** in all numeric columns (`ChildAreas`: 12, `Scenes`: 10).
  - `backups/sheets/2026-11-16/Neighborhood_Map.csv`: **`0` blanks** in all numeric columns (`ChildAreas`: 12, `Scenes`: 10).
  *(Note: `output/engine_audit_c*.json` snapshots do not embed `Neighborhood_Map` rows.)*

### 2. Full Downstream Audit of `S.neighborhoodState` (`0` vs `null`)

Every reader from `node scripts/ctxMap.js neighborhoodState` (46 external references across 18 files) plus `utilities/ensureCrimeMetrics.js` was audited for what happens when a blank cell returns `null` instead of `0`:

#### A. Readers whose behavior CHANGES (for the better) when `num()` returns `null` instead of `0`
1. **`phase05-citizens/applyBusinessDynamics.js:275-276, 289-290, 543-564, 726-728`**
   - `bizVitalityMedian_` (`:276`) & `bizNightlifeMedian_` (`:290`): Both explicitly check `!== null` — `0` polluted the city medians, `null` is cleanly omitted.
   - `bizHoodScores_` (`:543` `bizHoodNum_`, `:560-564`): `bizHoodNum_` returns `null` for `null`, NOT for `0`. Currently a blank cell in any of the 8 `BIZ_HOOD_SIGNALS` (`retailVitality`, `sentiment`, `crimeIndex`, `trajectoryMomentum`, `eventAttractiveness`, `migrationFlow`, `medianIncome`, `boomIndex`) enters `centres` medians as `0` and scores as a real `0` (`momentum: -1.0`, `crime: +1.0`, `retail/income: -1.0`). With `null`, `bizHoodScores_` omits the missing signal from both medians and the hood's weighted mean, matching its contract (`:530`).
   - `barTerm` (`:726-728`): `nl !== null && nl !== undefined` skips a blank `nightlifeProfile` instead of comparing `0 >= nightlifeMedian`.
2. **`phase05-citizens/updateCivicApprovalRatings.js:175-176, 199-200, 239-240`**
   - `cityStateMiddle_`, `hoodStateComposite_`, `hoodMoodEma_` all guard `typeof v === 'number' && isFinite(v)`. `typeof null === 'object'` skips missing `trajectoryMomentum`, `crimeIndex`, `sentiment`, `retailVitality` from city mean/SD, district composite, and mood EMA instead of dragging them to `0`.
3. **`phase05-citizens/generationalWealthEngine.js:366-367` (`creditFactorFor_`)**
   - Guards `typeof st.trajectoryMomentum === 'number'` / `typeof st.housingPressure === 'number'`. With `null`, falls back to neutral `5` (`creditFactor = 1.0`) instead of `0` (`creditFactor = 1.20` penalty on debt).
4. **`phase05-citizens/migrationTrackingEngine.js:511, 518-520` (`processSettledInCheck_`)**
   - Guards `typeof st.housingPressure === 'number'`. Currently a blank `HousingPressure` cell produces `press = 0 < 7` → falsely writes `[Home-Composure-Up-S] ten weeks in <hood> — the move worked`; with `null`, `press === null` skips the verdict (`:519`) per `:516` (`"a missing pressure ... is no fact"`).
5. **`phase03-population/updateCrimeMetrics.js:1064-1068, 1081-1083` (`applyHoodLifeQuality_`)**
   - Explicitly checks `!== null` on `retailVitality`, `housingPressure`, `sentiment`. With `null`, missing layers are omitted from medians and `qolParts` instead of injecting `0`.
6. **`phase03-population/updateNeighborhoodDemographics.js:434, 457` (`buildHoodIllnessWeights_`)**
   - Explicitly checks `noiseIndex !== null`. Currently a blank `NoiseIndex` injects `0` into `cityNoise` and sets `densF = 0.65`; with `null`, omits from `cityNoise` and leaves `densF = 1.0` (`:454`).
7. **`phase02-world-state/applyCityDynamics.js:1404-1406`**
   - Checks `sentiment !== null`. Currently a blank `Sentiment` bootstraps `prevNhood = { sentiment: 0 }`; with `null`, leaves `prevNhood = null`.
8. **`phase05-citizens/runConductEngine.js:114`**
   - Checks `st.crimeIndex === null`. Currently a blank `CrimeIndex` yields `localNorm = 0` (blocking `(0.6*0 + 0.4*cityCrimeNorm) >= 0.6`); with `null`, falls back cleanly to `cityCrimeNorm >= 0.6`.
9. **`phase05-citizens/runNeighborhoodEngine.js:292` (`hoodStateMedian_`) & `phase05-citizens/generateCitizensEvents.js:2103, 2129-2137`**
   - `hoodStateMedian_` checks `st[h][field] === null` and `neighborhoodStatePool_` checks `st.sentiment !== null`. Currently a blank `Sentiment` or `RetailVitality` enters the city median as `0` and can trigger `"heaviness around <hood>"`; with `null`, both skip cleanly.

#### B. Readers that STILL misread `null` as `0` (Need same-cut guards if `num()` returns `null`)
1. **`phase05-citizens/generateCitizensEvents.js:2062-2063` (`neighborhoodStatePool_`) — [Medium] Same-cut guard needed.**
   - **Code:**
     ```js
     var tMom = Number(st.trajectoryMomentum);
     var mi = isNaN(tMom) ? 0 : Math.abs(tMom - 5) / 5;
     ```
   - **Failure (`input -> wrong output`):** `Number(null) === 0`, so `isNaN(0)` is `false` and `mi = |0 - 5| / 5 = 1.0`. Both `0` (before fix) and `null` (after fix) give **maximal** trajectory reaction weight (`5×`) on a blank `TrajectoryMomentum` cell instead of `mi = 0`.
2. **`phase03-population/generateCrisisSpikes.js:474-476` (`crisisHoodWeight_`) — [Medium] Same-cut guard needed.**
   - **Code:**
     ```js
     var tier = Number(st.incomeTier), crime = Number(st.crimeIndex);
     ...
     if (!isFinite(crime)) crime = 0.7;
     ```
   - **Failure (`input -> wrong output`):** `Number(null) === 0` (`isFinite(0) === true`), so the `!isFinite(crime)` fallback to `0.7` **never triggers on `null`** (nor did it on `'' → 0`). A blank `CrimeIndex` lowers `crisisHoodWeight_` by `-0.21` (`0.3 * (0 - 0.7)`) instead of using neutral `0.7`.

#### C. Readers checked unchanged (safe on `null`, no throws)
- `loadNeighborhoodState.js:128,157` (`hoodRentFromIncome_` `!(inc > 0)` / `hs > 0`, `hoodAdmits_` `Number(null) || 0`)
- `updateTransitMetrics.js:255-270` (`isFinite(rv) && rv > 0`)
- `applyCityDynamics.js:117-121` (`boomIndex` `Number(null)` → `0`, intentional neutral default per `:121`)
- `updateNeighborhoodDemographics.js:435,458,525,540-541,716-720` (`medianIncome > 0`; `boomIndex !== null` skips and leaves `1.0`; `driftNeighborhoodEducation_` `Number(...) || 0` fallback)
- `generateCrisisBuckets.js:234-237,293-325` (`Number(...) || 0`)
- `generateGenericCitizenMicroEvent.js:418-420` (string `trajectory`)
- `generationalWealthEngine.js:1802,1811,2310` (`Number(...) || 0`)
- `judicialLifecycle.js:519` (`Number(...) || 0`, guarded `median > 0`)
- `runNeighborhoodEngine.js:270,701-702` (`hoodCrimeBar_` `v > 0`; `Number(null) >= bar` false)
- `householdFormationEngine.js:973-975` (`Number(null)` is `0`, `!(0 > 0)` throws ADR-0016 missing rent, same as `0`)
- `processAdvancementIntake.js:2965` (`!(Number(null) > 0)` holds household on intake, same as `0`)
- `bondEngine.js:979-980,1935-1937` (`!ta` / `lo > 0`)
- `economicRippleEngine.js:1000` (`typeof null === 'number'` false → `boom = 0`, same as `0`)
- `cityEveningSystems.js:303`, `buildEveningFood.js:243`, `mediaFeedbackEngine.js:75` (string/keys only)
- `v3NeighborhoodWriter.js:184-199,226,782` (`> 0` and `boomIndex !== null` → `1`)
- `utilities/ensureCrimeMetrics.js:84,97` (`typeof null === 'number'` false → `boom = 0`)
- `phase05-citizens/generateCitizensEvents.js:3592` (`condScopes.momentum` already gated on `hoodStateForCond.trajectory`, and `null` fails numeric ECL terms cleanly)

*(Also note: `neighborhoodTrajectoryEngine.js:129-131,161-165` reads `Neighborhood_Map` directly, not `S.neighborhoodState`, and currently uses `Number(row[i]) || 0`; Gap 1's fix should apply the same blank guard there so a blank `CrimeIndex` cell does not score as `0`.)*

### 3. Proposed Fix (PROPOSAL) & Blast Radius

- **PROPOSAL (`phase02-world-state/loadNeighborhoodState.js:107-111`):**
  Mirror `loadUndockedFeed_` (`phase02-world-state/loadEventContentLedger.js:359-368`):
  ```js
  function num(row, i) {
    if (i < 0) return null;
    var raw = row[i];
    if (raw === '' || raw === null || raw === undefined) return null;
    if (typeof raw === 'string' && raw.trim() === '') return null;
    var v = Number(raw);
    return isNaN(v) ? null : v;
  }
  ```
- **Same-cut reader fixes (PROPOSAL):**
  1. `phase05-citizens/generateCitizensEvents.js:2062`:
     `var tMom = (st.trajectoryMomentum === null || st.trajectoryMomentum === undefined || st.trajectoryMomentum === '') ? NaN : Number(st.trajectoryMomentum);`
  2. `phase03-population/generateCrisisSpikes.js:474-476`:
     `var crime = (st.crimeIndex === null || st.crimeIndex === undefined || st.crimeIndex === '') ? 0.7 : Number(st.crimeIndex);` (keep `if (!isFinite(crime)) crime = 0.7;`).
  *(Optional follow-up, not a blocker: `updateNeighborhoodDemographics.js:716-721` `driftNeighborhoodEducation_` and `generateCrisisBuckets.js:234-237` still coerce `null` to `0` via `Number(...) || 0`, unchanged from current `'' -> 0` behavior.)*
- **Blast radius & world impact:**
  - On live C116 data (`0` blank numeric cells across all 22 rows), changing `num()` changes **0 live values** next cycle.
  - Whenever a blank cell appears on `Neighborhood_Map` (e.g., a newly added neighborhood row or an optional blank `RentShare` / `BoomIndex`), **0 readers throw**; 9 downstream systems (including `bizHoodScores_`, `updateCivicApprovalRatings_`, `creditFactorFor_`, `processSettledInCheck_`, `applyHoodLifeQuality_`, `buildHoodIllnessWeights_`, `runConductEngine_`, `applyCityDynamics_`, `neighborhoodStatePool_`) immediately stop ingesting phantom `0`s and fall back to their already-coded `null` paths.

---

## Attached Wiring Summary

*Note: `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: S.neighborhoodState, S.neighborhoodTrajectory, Neighborhood_Map"` was invoked per `AGENTS.md` and exited 1 at turn 17 with HTTP 402 (`openrouter_in_flight_budget_exhausted`). Exact wiring below is from `docs/engine/ENGINE_STUB_REVERSE.json` (`generated: 2026-11-21`, `filesScanned: 179`, `functionsMapped: 1772`) and `node scripts/ctxMap.js`.*

- **`S.neighborhoodState`**:
  - Writer: `phase02-world-state/loadNeighborhoodState.js::loadNeighborhoodState_` (`:56`, called at `godWorldEngine2.js:609,2330`).
  - Readers (`43` functions across `18` files in `ENGINE_STUB_REVERSE.json`; `46` external references in `scripts/ctxMap.js`): audited in full in Gap 2 §2.
- **`S.neighborhoodTrajectory`**:
  - Writer: `phase05-citizens/neighborhoodTrajectoryEngine.js::updateNeighborhoodTrajectories_` (`:141`, via `processNeighborhoodTrajectory_` at `godWorldEngine2.js:699,2420`).
  - Reader (`1` external reference in `ctxMap.js`): `phase05-citizens/migrationTrackingEngine.js::buildRelocationHoodState_` (`:560`, called at `Phase5-MigrationTracking` `godWorldEngine2.js:700,2421`).
- **`Neighborhood_Map` (sheet)**:
  - Writer in `ENGINE_STUB_REVERSE.json`: `phase05-citizens/neighborhoodTrajectoryEngine.js::updateNeighborhoodTrajectories_` (`queueCellIntent_` on `NeighborhoodTrajectory`, `TrajectoryStartCycle`, `TrajectoryMomentum`, `HousingPressure`, `MedianIncome`, `MedianRent`); Phase 6 `applyMigrationDrift.js:478-490` writes `MigrationFlow`; Phase 8 `v3NeighborhoodWriter.js::saveV3NeighborhoodMap_` writes the row texture columns.
  - Readers (`13` functions in `ENGINE_STUB_REVERSE.json`): `canonNeighborhoodLoader.js`, `loadNeighborhoodState.js`, `chaosCarsEngine.js`, `bondEngine.js`, `civicInitiativeEngine.js`, `migrationTrackingEngine.js`, `neighborhoodTrajectoryEngine.js`, `applyMigrationDrift.js`, `v3NeighborhoodWriter.js`, `ensureCrimeMetrics.js`/`setupSportsFeedValidation.js`.
