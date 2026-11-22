# Antigravity Adversarial Review: `engine.356` Every Hood Signal & `World_Config` Dials (`c80381c63`)

- **Brief:** [2026-11-21-es-brief-agy-e356-every-hood-signal.md](file:///root/GodWorld/docs/for-claude-review/2026-11-21-es-brief-agy-e356-every-hood-signal.md)
- **Commit reviewed:** `c80381c63f5a67ad14a51eb7d4801b303f8c4b33`
- **Changed files inspected:**
  - [applyBusinessDynamics.js](file:///root/GodWorld/phase05-citizens/applyBusinessDynamics.js)
  - [engine94SheetContract.js](file:///root/GodWorld/phase01-config/engine94SheetContract.js)
  - Cross-checked callers/producers: [loadNeighborhoodState.js](file:///root/GodWorld/phase02-world-state/loadNeighborhoodState.js), [applyWeatherModel.js](file:///root/GodWorld/phase02-world-state/applyWeatherModel.js), [godWorldEngine2.js](file:///root/GodWorld/phase01-config/godWorldEngine2.js)
- **Verdict:** **SHIP-WITH-FIXES** (clean on live C116 data across all five brief attacks; two non-blocking edge-case defects found on missing-cell / disabled-weight paths).

---

## Wiring Card

- Prior wiring card attached: [agent_engine-wiring_2026-11-22T02-59-46.md](file:///root/GodWorld/output/agent_engine-wiring_2026-11-22T02-59-46.md)
- Live wiring-card re-run (`task-599` for `applyBusinessDynamics_`) aborted on OpenRouter HTTP 402 (`in_flight_budget_exhausted`), so no new card file was generated.
- **Delta in `c80381c63` relative to the attached card:** `applyBusinessDynamics_` adds a read of `S.weather.impact` (`phase05-citizens/applyBusinessDynamics.js:741`) for hood-following businesses (`followsHood(row, id)`). `S.weather` (`{ ..., impact: impact, ... }`) is written by `applyWeatherModel_` (`phase02-world-state/applyWeatherModel.js:545,550`) in `Phase2-Weather`, which runs before `Phase5-BusinessDynamics` in `phase01-config/godWorldEngine2.js:603,668` and `:2324,2389`.

---

## Findings

### 1. [Medium] `loadNeighborhoodState_` coerces blank cells to `0` before `bizHoodScores_` omits missing signals
- **Pointers:** `phase02-world-state/loadNeighborhoodState.js:107-111` (`num()`), `phase05-citizens/applyBusinessDynamics.js:532-565` (`BIZ_HOOD_SIGNALS`, `bizHoodNum_`, `bizHoodScores_`)
- **Mechanism:** `loadNeighborhoodState_` defines `function num(row, i) { if (i < 0) return null; var v = Number(row[i]); return isNaN(v) ? null : v; }`. Because JavaScript `Number('') === 0`, any blank cell (`""`) on a `Neighborhood_Map` row enters `S.neighborhoodState` as `0`, not `null`. `bizHoodNum_` (`:543`) then sees `0` and treats it as a real observation instead of omitting it (`"a missing signal is left out of the mean"`).
- **Input -> Wrong output:** On live C116 `Neighborhood_Map.jsonl`, all 8 columns have `0` blank cells (so C116 `MigrationFlow = 0` and `BoomIndex = 0` are genuine values). However, if any future or partial `Neighborhood_Map` row leaves a signal cell blank (`""`):
  - `MedianIncome = ""` -> coerced to `0` -> `(0 - median) / 80000` clamps to **`-1.0`** in the mean instead of being omitted.
  - `EventAttractiveness = ""` -> coerced to `0` -> `(0 - median) / 5` pushes negative (up to **`-1.0`**) instead of being omitted.
  - `TrajectoryMomentum = ""` -> coerced to `0` -> `(0 - 5) / 5` yields **`-1.0`** instead of being omitted.
  - `BoomIndex = ""` -> coerced to `0` -> contributes `(0 - median) / 1` and increments `wsum` by `w`, diluting the weighted mean instead of being omitted.
  - `RetailVitality = ""` -> coerced to `0` -> passes `bizHoodNum_(s.retailVitality) === null` (`:557`) as `0` instead of `null`.

### 2. [Low] `bizHoodScores_` gates the entire hood on `retailVitality` before checking signal weights
- **Pointers:** `phase05-citizens/applyBusinessDynamics.js:557` vs `:561-563`
- **Mechanism:** `if (bizHoodNum_(s.retailVitality) === null) { out[keys[k]] = null; continue; }` (`:557`) short-circuits unconditionally before the `BIZ_HOOD_SIGNALS` loop checks `if (!(w > 0) || !(u > 0) || v === null ...)` (`:562`).
- **Input -> Wrong output:** Operator turns vitality off via `World_Config` (`bizHoodWeight_vitality = 0`) and a neighborhood row has `retailVitality: null` (or missing `RetailVitality` column) with the other 7 weighted signals populated -> `bizHoodScores_` still returns `null` for that neighborhood, `followsHood` (`:687-693`) returns `false`, and both `hoodScore` and `weatherImpact` (`:740-741`) are zeroed out instead of scoring from the active signals.

### Note on pre-existing boundaries & weather cap interaction (unchanged / informational)
- `bizDriftOne_` applies weather inside `ev` before `ev = bizClamp_(ev, -cfg.bizEventCap, cfg.bizEventCap)` (`phase05-citizens/applyBusinessDynamics.js:458-461`). At default `bizEventCap = 1.0`, `S.weather.impact` up to `~1.95` (`applyWeatherModel.js:511-536`, max `(1.95 - 1) * 1.0 = 0.95`) fits inside `bizEventCap` on quiet weeks, though raising `bizWeatherPp` past `bizEventCap / (impact - 1)` (e.g. `> 3.03` during an `impact = 1.33` storm) is silently clamped at `-bizEventCap` by `ev`, and storm penalties share the same `-1.0` floor as negative news events.
- Stale test assertion (not executed per read-only / brief scope): `phase05-citizens/applyBusinessDynamics.test.js:114-115` still asserts `seeded.length === 37 && mod.BIZ_DYNAMICS_REQUIRED_KEYS.length === 33` whereas `c80381c63` raised `BIZ_DYNAMICS_REQUIRED_KEYS` (`applyBusinessDynamics.js:51-70`) and `ENGINE96_CONFIG_SEEDS` (`engine94SheetContract.js`) to `64` `biz*` keys (`CFG` at `applyBusinessDynamics.test.js:25` already reflects the `64`-key set).

---

## Attack Verification

1. **Syntax check:** `node --check phase05-citizens/applyBusinessDynamics.js && node --check phase01-config/engine94SheetContract.js` -> exited `0`.
2. **Load order (`BIZ_DYNAMICS_REQUIRED_KEYS`, `BIZ_HOOD_SIGNALS`, `BIZ_CLASS_MIDDLE_CLASSES`):** Clean. `BIZ_DYNAMICS_REQUIRED_KEYS` (`applyBusinessDynamics.js:51-70`) holds 64 string literals and does not reference `BIZ_HOOD_SIGNALS` or `BIZ_CLASS_MIDDLE_CLASSES`. `BIZ_CLASS_MINT_REVENUE` IIFE (`:97`) reads only `BIZ_CLASS_MINT` (`:76-87`). `BIZ_HOOD_SIGNALS` (`:532-542`) and `BIZ_CLASS_MIDDLE_CLASSES` (`:95`) are read only inside runtime functions (`bizHoodScores_` `:547-560` and `applyBusinessDynamics_` `:699`).
3. **Required vs seeded & `inspectEngine94Config_` bounds:** Clean. Programmatic audit over `ENGINE96_CONFIG_SEEDS` (`engine94SheetContract.js:95-125`) and `BIZ_DYNAMICS_REQUIRED_KEYS`: `Required keys: 64`, `unique: 64`, `missingFromSeeds: []`, `badBounds: []`. `bizHoodUnit_income = 80000` is inside `[0.0001, 1000000]`; all 10 `bizClassMiddle_*` values are inside `[-10, 40]`; `bizWeatherPp = 1.0` is inside `[0, 10]`; all 8 `bizHoodWeight_* = 1` are inside `[0, 10]`.
4. **C116 8-signal `bizHoodScores_` & all-weight-0 behavior:**
   - C116 `Neighborhood_Map.jsonl` ranges (`0` blanks across all 8 columns): `RetailVitality 4.84..16.94`, `Sentiment -0.06..0.39`, `CrimeIndex 0.57..0.73`, `TrajectoryMomentum 0..10`, `EventAttractiveness 4.25..11.23`, `MigrationFlow -5..5`, `MedianIncome 68409..185741`, `BoomIndex -0.7..1`.
   - Verified 8-signal `bizHoodScores_` output: `Jack London: 0.654`, `West Oakland: 0.576`, `Downtown: 0.552`, `Uptown: 0.523`, `Fruitvale: 0.469`, `Piedmont Ave: 0.363`, `Grand Lake: 0.324`, `Rockridge: 0.25`, `Lake Merritt: 0.169`, `KONO: 0.149`, `East Oakland: -0.007`, `Chinatown: -0.022`, `Baylight District: -0.031`, `Temescal: -0.139`, `Eastlake: -0.213`, `Adams Point: -0.232`, `Laurel: -0.26`, `Brooklyn: -0.26`, `Dimond: -0.327`, `Glenview: -0.424`, `San Antonio: -0.464`, `Ivy Hill: -0.52`.
   - All `bizHoodWeight_* = 0`: verified `Downtown -> null`; `followsHood` returns `false`, `vitMod = 0`.
5. **Weather & 150-cycle simulation on `c80381c63` C116 data:**
   - `Phase2-Weather` (`applyWeatherModel_`) runs before `Phase5-BusinessDynamics` (`applyBusinessDynamics_`) (`godWorldEngine2.js:603,668`, `:2324,2389`), and `applyWeatherModel.js:511-550` produces finite `Number` `impact >= 1.0` (mild `1.0` up to `~1.95` in severe snow/wind/cold).
   - **Sim A (quiet, clear `wx=1`):** `C50 == C150` (`typicalMed: 5.485`, `belowZero: 4`, `minG: -1.61`, `maxG: 14.85`; class medians: `tech: 14.46, default: 3.9, arts: 7.74, construction: 11.38, professional: 9.15, health: 1.76, retail: 4.84, food: 6.315, faith: 5.005, education: -0.59`).
   - **Sim B (quiet, storm every week `wx=1.33`):** `C50 == C150` (`typicalMed: 3.835`, `belowZero: 12`, `minG: -3.26`, `maxG: 13.22`; class medians: `tech: 12.81, default: 2.25, arts: 6.09, construction: 9.73, professional: 7.5, health: 0.11, retail: 3.19, food: 4.665, faith: 3.435, education: -2.24`), matching the `-0.33 / 0.2 = -1.65` pp settled shift.
   - **Sim C (full feedback + noise `0.25` + shock `2%` + pressure `90` + `wx=1.33`):** `C50` (`typicalMed: 2.62, belowZero: 24, minG: -2.99, maxG: 11.55`) -> `C150` (`typicalMed: 2.635, belowZero: 26, minG: -3.33, maxG: 11.72`; `tech: 11.08, default: 1.37, arts: 4.39, construction: 7.63, professional: 5.16, health: -0.42, retail: 1.68, food: 3.355, faith: 1.55, education: -2.83`).
   - **Sim D (full feedback + noise `0.25` + shock `2%` + pressure `90` + `wx=1.00`):** `C50` (`typicalMed: 4.27, belowZero: 6, minG: -1.34, maxG: 13.2`) -> `C150` (`typicalMed: 4.285, belowZero: 6, minG: -1.68, maxG: 13.37`; `tech: 12.73, default: 3.02, arts: 6.04, construction: 9.28, professional: 6.8, health: 1.23, retail: 3.33, food: 5.005, faith: 3.2, education: -1.18`).
