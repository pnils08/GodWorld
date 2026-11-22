# Adversarial Diff Read — Two Hood-Data Gap Fixes (`e608d9307`)

- **Date:** 2026-11-21 · **Lane:** antigravity (`agy`) · **Mode:** Read-only on code
- **Brief:** `docs/for-claude-review/2026-11-21-es-brief-agy-two-hood-gaps-diff.md`
- **Commit reviewed:** `e608d9307` (`engine.356 gaps: crime counts in the hood trajectory and migration; a blank hood-map cell is missing, not 0`)
- **Tests run locally (verified passing):** `scripts/hoodCrimeBandsBlank.test.js` (12/12), `scripts/engine94SheetContract.test.js` (30/30), `scripts/economicPhaseOwnership.test.js` (6/6), `scripts/hoodEconomyRelative.test.js` (29/29), `scripts/migrationRelocation.test.js` (87/87)
- **Verdict:** **SHIP-WITH-FIXES** — Core changes (`trajectoryCellNum_`, `trajectoryCrimeBand`, `loadNeighborhoodState.js` `num()`, `generateCrisisSpikes.js` / `generateCitizensEvents.js` guards, `ensureEngine356Config_`) are sound and safe on live C116. One Medium blank-cell trap remains in `applyMigrationDrift.js:389`, plus three Low items.

---

## Findings

### 1. [Medium] `applyMigrationDrift.js:389` still coerces blank (and `0`) `CrimeIndex` cells to `1` — turning missing crime into forced outflow

- **Location:** `phase06-analysis/applyMigrationDrift.js:389-392` (and stale table `:833-834`)
- **Mechanism:** `e608d9307` fixed blank `CrimeIndex` handling in `loadNeighborhoodState.js` and `neighborhoodTrajectoryEngine.js`, and added `applyMigrationDrift.js` `medCrime ± CRIME_BAND` (`:418-442`), but left the row parser untouched:
  ```js
  crimeIndex: (iCrime >= 0) ? Number(nhRow[iCrime] || 1) : 1,
  ```
- **Failure (`input -> wrong output`):**
  If a `Neighborhood_Map` row has a blank `CrimeIndex` cell (`''`) — or a real `0` — `nhRow[iCrime] || 1` evaluates to `1`. Against C116's `medCrime = 0.64`, `1 >= 0.64 + 0.05` is `true`, so `applyMigrationDrift_` pulls `rInt(2) + 1` (`1–3` outflow points) on a hood with no crime reading instead of treating crime as missing/neutral. (Same `|| 1` pattern applies to `retailVitality` and `eventAttract` at `:391-392`, though those were outside this cut.)
- **Also:** The comment table at `phase06-analysis/applyMigrationDrift.js:833-834` still documents `CrimeIndex >= 1.15x median` / `<= 0.85x median`.

### 2. [Low] `applyMigrationDrift.js:441-442` IEEE-754 boundary asymmetry drops `0.69` hoods at `medCrime = 0.64`, `CRIME_BAND = 0.05`

- **Location:** `phase06-analysis/applyMigrationDrift.js:441-442`
- **Mechanism:** In IEEE-754 floating point, `0.64 + 0.05 === 0.6900000000000001` (`> 0.69`), while `0.64 - 0.05 === 0.59` (`=== 0.59`).
- **Failure (`input -> wrong output`):**
  On C116 (`output/beats/Neighborhood_Map.jsonl`, `medCrime = 0.64`), `Chinatown` (`0.69`), `Glenview` (`0.69`), and `East Oakland` (`0.69`) evaluate `0.69 >= 0.64 + 0.05` as **`false`** and skip the high-crime penalty, whereas `Jack London` (`0.59`), `Piedmont Ave` (`0.59`), and `Lake Merritt` (`0.59`) evaluate `0.59 <= 0.64 - 0.05` as **`true`** and receive the low-crime bonus. Comparing `crimeIndex - medCrime >= CRIME_BAND` / `medCrime - crimeIndex >= CRIME_BAND` (with `1e-9` or subtraction) avoids one-sided rounding at exact decimal steps.

### 3. [Low] `neighborhoodTrajectoryEngine.js` applies `trajectoryCellNum_()` only to `CrimeIndex`, leaving the other four signals on `Number(...) || 0`

- **Location:** `phase05-citizens/neighborhoodTrajectoryEngine.js:137-139, 179-183`
- **Mechanism:** `sums.sent`, `sums.retail`, `sums.event` (`:137-139`) and `sent`, `retail`, `eventAttract`, `flow` (`:179-183`) still coerce blanks via `Number(row[i]) || 0`, while `counted` still increments on any row with a `Neighborhood` name (`:136,142`).
- **Failure (`input -> wrong output`):**
  A row with blank `RetailVitality` (`''`) enters `sums.retail` as `0`, increments `counted`, drags `meanRetail` down, and scores `0 < meanRetail * 0.85` (`-1` penalty) instead of omitting the missing signal as `CrimeIndex` now does.

### 4. [Low] `scripts/hoodCrimeBandsBlank.test.js:304-308` tests `applyMigrationDrift.js` by regex on source text only

- **Location:** `scripts/hoodCrimeBandsBlank.test.js:304-308`
- **Mechanism:** While the `loadNeighborhoodState_`, `updateNeighborhoodTrajectories_`, and `crisisHoodWeight_` checks execute real VM code, the migration drift check only runs `ok(..., /crimeIndex >= medCrime \+ CRIME_BAND/.test(src) && ...)`. It does not execute `applyMigrationDrift_` against a fixture or test the missing-`migrationCrimeBand` throw path (`:419`).

---

## Attack Checks Verified Clean

### Attack 1 — Diff vs Proposal Scope
- **Added beyond proposal:** Externalized both bands (`trajectoryCrimeBand`, `migrationCrimeBand` at `0.05`) into `ENGINE356_CONFIG_SEEDS` / `ensureEngine356Config_` (`phase01-config/engine94SheetContract.js:531-548`) with ADR-0015 fail-loud checks, fixed the sibling `applyMigrationDrift.js:418-442`, and updated `economicPhaseOwnership.test.js`, `hoodEconomyRelative.test.js`, `migrationRelocation.test.js`, plus `hoodCrimeBandsBlank.test.js`.
- **Proposal items delivered:** `neighborhoodTrajectoryEngine.js` option A (`meanCrime ± trajectoryCrimeBand`), `loadNeighborhoodState.js` `num()` blank/whitespace → `null`, `generateCitizensEvents.js:2062` `tMom` guard, and `generateCrisisSpikes.js:474` `crime` guard all match the proposal cleanly.

### Attack 2 — `trajectoryCellNum_` & `meanCrime` (`phase05-citizens/neighborhoodTrajectoryEngine.js:133-155, 181, 200-203`)
- **Blank / whitespace / `null` / `undefined` / non-numeric:** Returns `null`; excluded from `sums.crime` and `crimeCounted`; `:200` skips crime scoring. Real `0` returns `0` and is counted (`cm !== null`, `meanCrime !== null` — no truthiness bug).
- **Blank `Neighborhood` rows:** Skipped at `:136` and `:175` before `trajectoryCellNum_` or `counted++`.
- **Map with no `CrimeIndex` column (`iCrime === -1`):** `rows[m][-1]` / `row[-1]` evaluates to `undefined` → `trajectoryCellNum_(undefined)` returns `null` → `crimeCounted === 0` → `meanCrime = null` → `:200` skips cleanly without throwing. *(Note: `trajectoryCrimeBand` check at `:154-155` still throws if missing, even when `iCrime === -1`.)*
- **All `CrimeIndex` cells blank:** `crimeCounted === 0` → `meanCrime = null` (no `0 / 0 = NaN`).

### Attack 3 — `applyMigrationDrift.js` Paths & RNG Draw Shift
- **Paths reaching the crime test:** `CRIME_BAND` is read and validated at `:418-419` before the sole neighborhood scoring loop (`:428-472`) containing `:441-442`. No other code path in `applyMigrationDrift.js` reads `CrimeIndex` or `migrationCrimeBand`. (`Neighborhood_Map` missing/empty still validates `migrationCrimeBand` at `:418-419`.)
- **RNG draw-count shift:** `applyMigrationDrift_` uses its own isolated `createSeededRng_(rngSeed, rngStateIn)` (`:106`, distinct from `ctx.rng` whenever `rngSeed` is configured) and persists `S.rngState` at `:603`. On C116, **10 hoods** (`5` high at `0.70–0.73`, `5` low at `0.57–0.59`) now call `rInt(2)` (`rand()` once each) vs `0` under the dead `±15%` band. Grep across `phase*`/`utilities/`/`lib/` confirms `applyMigrationDrift.js` is the only reader/writer of `rngState`; no downstream consumer depends on a fixed `applyMigrationDrift_` draw count. Historical `replayCycle()` on cycles prior to `e608d9307` will diverge in `MigrationFlow` (expected for a mechanics fix).

### Attack 4 — Self-Arm Placement & Dry-Run / Replay Live Risk
- **Placement (`godWorldEngine2.js:531`):** `ensureEngine356Config_(ss)` runs in `runWorldCycleLocked_` alongside all 24 sibling `ensureEngine*Config_` calls (`:512-536`), before `createSheetCache_(ss)` (`:545`) and `Phase1-LoadConfig` (`:577`).
- **Dry-run / replay (`runDryRunCycle` `:2115`, `replayCycle` `:2220`):** Both call `runCyclePhases_(ctx)` (`:2151`, `:2261`) and skip `runWorldCycleLocked_`'s self-arms (because dry-run/replay must not write `World_Config`). Both `Phase5-Trajectory` (`:2421`) and `Phase6-Migration` (`:2450`) are wrapped in `safePhaseCall_` (`:159-170`), so on an un-armed sheet (e.g., PROD between `clasp push` and the first live `runWorldCycle()`, or an un-seeded sandbox), `runDryRunCycle()` / `replayCycle()` will catch and log `Engine_Errors` in those two phases (`Phase5-MigrationTracking` falls back to `Neighborhood_Map` directly at `migrationTrackingEngine.js:572`; `MigrationFlow` stays stale).
- **Live risk:** **None on live `runWorldCycle()`** once deployed (`runWorldCycleLocked_` seeds `World_Config` before `Phase1-LoadConfig` reads it). Same contract and dry-run behavior as the 24 existing `ensureEngine*Config_` self-arms.

### Attack 5 — Re-Audit of `S.neighborhoodState` Readers Marked Safe
- Re-checked every "safe/unchanged" reader from `2026-11-21-review-two-hood-gaps.md` §2C (`loadNeighborhoodState.js:128,157`, `updateTransitMetrics.js:255-270`, `applyCityDynamics.js:117-121`, `updateNeighborhoodDemographics.js:435,458,525,540-541,716-720`, `generateCrisisBuckets.js:234-237,293-325`, `generateGenericCitizenMicroEvent.js:418-420`, `generationalWealthEngine.js:1802,1811,2310`, `judicialLifecycle.js:519`, `runNeighborhoodEngine.js:270,701-702`, `householdFormationEngine.js:973-975`, `processAdvancementIntake.js:2965`, `bondEngine.js:979-980,1935-1937`, `economicRippleEngine.js:1000`, `cityEveningSystems.js:303`, `buildEveningFood.js:243`, `mediaFeedbackEngine.js:75`, `v3NeighborhoodWriter.js:184-199,226,782`, `utilities/ensureCrimeMetrics.js:84,97`, and `generateCitizensEvents.js:1474,3592` `evalContentConditions_`).
- Confirmed **zero throws and zero unintended behavior changes** when `num()` returns `null` instead of `0`.
