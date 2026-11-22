# Adversarial Read — engine.356: Hood Drives Business Growth

- **Date:** 2026-11-21 · **Lane:** antigravity (`agy`) · **Mode:** Read-only code review (no tests run, no sandbox calls)
- **Brief:** `docs/for-claude-review/2026-11-21-es-brief-agy-e356-hood-drives-growth.md`
- **Commit reviewed:** `45710b3ed` (`phase05-citizens/applyBusinessDynamics.js`, `phase01-config/engine94SheetContract.js`)
- **Verdict:** **HOLD**

---

## Findings

### 1. [High] `classMiddle` is an unanchored moving median of the businesses being pulled — every class walks to `bizGrowthCeil` (`40`) or `bizGrowthFloor` (`-10`) (`Attack #1`)

- **Locations:** `phase05-citizens/applyBusinessDynamics.js:455-459, 659-669`
- **Mechanism:** `classMiddle[cls]` is recomputed each cycle as the median `Growth_Rate` of open, hood-following businesses in `cls` (`:661-669`), and `bizDriftOne_` pulls each business `i` toward `classMiddle[cls] + cfg.bizHoodSpan * hoodScore[i]` (`:459`). Whenever the businesses of a class are unevenly located across strong vs. weak hoods so the class's median hood score `h_med !== 0` (true for **all 10 classes** in the C116 `output/beats/Business_Ledger.jsonl` + `output/beats/Neighborhood_Map.jsonl` dump), the median business targets `classMiddle + 5 * h_med`, moving `classMiddle` in the same direction next cycle with zero fixed anchor. Even without `hoodBusinessFactor_` feedback (`v3NeighborhoodWriter.js:254-263,525`), `classMiddle` drifts monotonically at `~0.2 * 5 * h_med * vol` per cycle until hitting the ceiling or floor. (Notice `:490-491` explicitly warned against this for institutions: `"live sector medians are ratcheted too ... so 'the sector's own middle' would hold them"`.)
- **Failure (`input -> wrong output`):**
  Iterating `bizDriftOne_` cleanly (`ev = pressure = shock = noise = 0`, `hoodScores` held constant at C116 `Neighborhood_Map.jsonl`) over the 260 matched hood-following businesses in C116 `Business_Ledger.jsonl` drives **every class** monotonically to a bound:
  - `tech` (`n=10`, `hMed=0.697`): `m0 = 11.59` -> `m50 = 40.00` (ceiling)
  - `construction` (`n=9`, `hMed=0.500`): `m0 = 9.02` -> `m50 = 38.02` -> `m150 = 40.00`
  - `arts` (`n=13`, `hMed=0.520`): `m0 = 5.14` -> `m50 = 36.39` -> `m150 = 40.00`
  - `professional` (`n=13`, `hMed=0.668`): `m0 = 6.42` -> `m50 = 32.88` -> `m150 = 40.00`
  - `food` (`n=85`, `hMed=0.090`): `m0 = 5.60` -> `m50 = 12.08` -> `m150 = 24.08` (keeps rising)
  - `retail` (`n=53`, `hMed=0.076`): `m0 = 4.11` -> `m50 = 8.27` -> `m150 = 17.27` (keeps rising)
  - `faith` (`n=12`, `hMed=0.170`): `m0 = 3.99` -> `m50 = 8.18` -> `m150 = 17.12` (keeps rising)
  - `education` (`n=5`, `hMed=-0.229`): `m0 = 0.67` -> `m50 = -6.33` -> `m150 = -10.00` (all 5 schools go negative -> distress/layoffs)
  - `health` (`n=14`, `hMed=-0.109`): `m0 = 2.42` -> `m50 = -1.54` -> `m150 = -9.54` (clinics pushed into distress/layoffs)
  - `default` (`n=46`, `hMed=-0.109`): `m0 = 3.92` -> `m50 = -2.21` -> `m150 = -10.00` (floor)
  - **Feedback loop note (`hoodBusinessFactor_`):** The `S.hoodBusinessMomentum` -> `v3NeighborhoodWriter.js:254-263,525` (`hoodBusinessFactor_`) -> `RetailVitality` -> `bizHoodScores_` loop itself is positive-feedback but bounded (`hoodBusinessFactor_` clamps `[0.88, 1.12]`, `baseRetail` resets per cycle, `bizHoodScores_` clamps `[-1, 1]`); it does not amplify without bound, unlike the self-anchored `classMiddle`.

### 2. [High] `bizIsFranchise_()` reads `MINT_GAME_TEAMS_` without a `typeof` guard (`Attack #4`)

- **Locations:** `phase05-citizens/applyBusinessDynamics.js:545-548, 655`, `phase05-citizens/processAdvancementIntake.js:1981`
- **Mechanism:** Every other cross-file symbol in `applyBusinessDynamics.js` carries a `typeof` guard (`:111`, `:114`, `:139`, `:369`, `:564`, `:625`). `bizIsFranchise_` (`:546`) directly reads `MINT_GAME_TEAMS_.length` with no `typeof MINT_GAME_TEAMS_ !== 'undefined'` guard. While Apps Script loads all `.gs` files into one flat namespace in production, any Node/VM unit test or caller that loads `applyBusinessDynamics.js` without `processAdvancementIntake.js` (`phase05-citizens/applyBusinessDynamics.test.js`, `scripts/businessOwnerDials.test.js`, `scripts/dialWave2Seams.test.js`) lacks `MINT_GAME_TEAMS_`.
- **Failure (`input -> wrong output`):**
  Calling `applyBusinessDynamics_(ctx)` with `Business_Ledger` populated and `processAdvancementIntake.js` not loaded throws `ReferenceError: MINT_GAME_TEAMS_ is not defined` inside `followsHood` -> `bizIsFranchise_` at `:546` — aborting the entire pass with zero intents queued and `S.hoodBusinessMomentum` / `S.hoodSpots` unset.

### 3. [Medium] Child-area businesses (`Brooklyn Basin`, `Old Oakland`, `Coliseum`, `Telegraph corridor`) get `hoodScore: null` and are dropped from `classMiddle` (`Attack #6`)

- **Locations:** `phase05-citizens/applyBusinessDynamics.js:624-627, 652-658, 710` (compare `:696, 801, 812`)
- **Mechanism:** `applyBusinessDynamics_` normalizes child areas via `bizHoodKey` (`resolveHoodOrChild_`) for `tallyBiz` (`:629,812`), `barHood` (`:696`), and `spots` (`:801`). However, `followsHood` (`:656`) and `inputs.hoodScore` (`:710`) index `hoodScores` (keyed strictly by the 22 `Neighborhood_Map` parent hoods in `S.neighborhoodState`) with the raw `row[iHood]` string rather than `bizHoodKey(hood)`.
- **Failure (`input -> wrong output`):**
  On C116 `output/beats/Business_Ledger.jsonl`, four active non-institution, non-franchise businesses sit in mapped child areas: `BIZ-00010` (`Portside Bio`, `Brooklyn Basin` -> `Jack London`), `BIZ-00011` (`Tenth Street Digital`, `Old Oakland` -> `Downtown`), `BIZ-00029` (`Coliseum District Development`, `Coliseum` -> `East Oakland`), and `BIZ-00062` (`Dario's Bar`, `Telegraph corridor` -> `Temescal`). Each resolves `hoodScores[hood] === undefined` -> `followsHood` returns `false`, omitting them from `classMiddle` (`:663`) and setting `inputs.hoodScore = null` (`vitMod = 0`), while `:812` still tallies them into their parent hood's `S.hoodBusinessMomentum`.

### 4. [Medium] `loadNeighborhoodState_` coerces blank `TrajectoryMomentum` (and `RetailVitality`/`Sentiment`/`CrimeIndex`) cells to `0`, grading blank momentum as `-1.0` (`Attack #6`)

- **Locations:** `phase02-world-state/loadNeighborhoodState.js:107-111, 121-126` and `phase05-citizens/applyBusinessDynamics.js:524-528`
- **Mechanism:** `loadNeighborhoodState_` uses `num(row, i)` (`var v = Number(row[i]); return isNaN(v) ? null : v;`). Because `Number("") === 0`, a blank cell becomes numeric `0` instead of `null`. In `bizHoodScores_` (`applyBusinessDynamics.js:528`), `0` passes the `!== null && !== undefined && isFinite(...)` check and evaluates `(0 - 5) / 5 = -1.0` instead of being omitted from the mean as `:511` specifies (`"a missing part is left out of the mean"`). Similarly, a blank `RetailVitality` cell becomes `0` rather than triggering `:524`'s `=== null` skip. (On C116 `Neighborhood_Map.jsonl`, all 22 `TrajectoryMomentum` cells are populated, so this fires whenever a row has a blank cell.)
- **Failure (`input -> wrong output`):**
  A `Neighborhood_Map` row with `TrajectoryMomentum = ""` loads as `s.trajectoryMomentum = 0` -> `bizHoodScores_` adds `-1.0` (maximum decline) to the hood's score parts instead of leaving `trajectoryMomentum` out of the mean.

### 5. [Low] `runDryRunCycle()` and `replayCycle()` skip `ensureEngine96Config_`, throwing in `bizDynamicsConfig_` on an unarmed sheet (`Attack #3`)

- **Locations:** `phase01-config/godWorldEngine2.js:515, 2114-2150, 2219-2260, 2287-2389` and `phase05-citizens/applyBusinessDynamics.js:232`
- **Mechanism:** `runWorldCycleLocked_` (`:515`) calls `ensureEngine96Config_(ss)` before `loadConfig_`, auto-seeding the 7 new `ENGINE96_CONFIG_SEEDS` rows (`phase01-config/engine94SheetContract.js:95-101`) ahead of Phase 5 on live PROD fires. `runDryRunCycle()` (`:2150`) and `replayCycle()` (`:2260`) call `runCyclePhases_(ctx)` directly without `ensureEngine96Config_(ss)`.
- **Failure (`input -> wrong output`):**
  Running `runDryRunCycle()` or `replayCycle()` on a spreadsheet copy before a live `runWorldCycleLocked_` has seeded the 7 new keys causes `bizDynamicsConfig_(ctx)` (`:232`) to throw `World_Config missing bizHoodVitalityUnit, ...`; `safePhaseCall_` catches and logs the error, leaving `S.hoodBusinessMomentum`, `S.businessDeclines`, and `S.hoodSpots` empty/unset and emitting zero `Business_Ledger` intents in `PHASE42_VERIFY`.

### 6. [Low] `classMiddle` reads raw `Growth_Rate` (with `shipPrev`) instead of shock-free `track` (`Attack #2`)

- **Locations:** `phase05-citizens/applyBusinessDynamics.js:455-459, 665`
- **Mechanism:** `bizDriftOne_` (`:456, 459, 494`) uses the shock-free `track = biz.growth - shipPrev` for both `vitMod` and `settle`, keeping `track` invariant to port ship offsets. However, `classMiddle` (`:665`) pushes `bizParseGrowth_(bl[rm][iGrow])` (`biz.growth`) without subtracting `prev[idM][3]` (`shipPrev`).
- **Failure (`input -> wrong output`):**
  During an active port ship episode (`shipPrev = -3` pp on `retail`, `food`, `construction`), `classMiddle` shifts down by up to `3` pp, pulling every hood-following business's shock-free `track` downward by up to `0.6` pp/cycle during the episode and then rebounding once the ship clears.

---

## Checks Passed & Verified Clean

1. **Shock-free `track` between `vitMod` and `settle` (`Attack #2`):** `shipPrev` and `track` hoisted cleanly to `:455-456` with identical semantics; institutions (`stated >= cfg.bizSettleMinStaff`) get `hoodScore = null` (`vitMod = 0` at `:654`) so `vitMod` and `settle` never stack on the same row.
2. **`ENGINE96_CONFIG_SEEDS` vs `BIZ_DYNAMICS_REQUIRED_KEYS` (`Attack #3`):** All 7 new keys (`bizHoodVitalityUnit`, `bizHoodSentimentUnit`, `bizHoodCrimeUnit`, `bizHoodSpan`, `bizHoodPull`, `bizHoodMaxPp`, `bizEventCap`) match 1:1 across `engine94SheetContract.js:95-101` and `applyBusinessDynamics.js:65`.
3. **Downstream `Growth_Rate` readers (`Attack #5`):** `runCareerEngine.js:1750-1790`, `applyDemographicDrift.js:266-286`, `commuteFlowEngine.js:115-136`, `generationalWealthEngine.js:931-965`, `economicRippleEngine.js:508,694`, `v3NeighborhoodWriter.js:254-263`, and `applyBusinessDynamics.js:754,795` all still consume `Growth_Rate` as `%/yr`. (Any instability is caused by Finding 1 pushing `Growth_Rate` to extremes over time, not a unit/meaning shift.)
4. **Edge rows (`Attack #6`):** Empty `S.neighborhoodState` (`bizHoodScores_({}, cfg) -> {}`), missing `retailVitality`, and classes with zero hood-following peers (`classMiddle` lacks key -> `null` -> `vitMod = 0`) all degrade to `0` without throwing; `ps.closed` rows stay pinned at `cfg.bizGrowthFloor` (`:678-687`).
5. **Syntax check (`node --check`):** `phase05-citizens/applyBusinessDynamics.js` and `phase01-config/engine94SheetContract.js` exit `0`. (No tests or sandbox calls executed.)

---

## Wiring Card Attached

- **`applyBusinessDynamics_` (`phase05-citizens/applyBusinessDynamics.js:569`):** `output/agent_engine-wiring_2026-11-22T02-59-46.md` — `Phase5-BusinessDynamics` (`godWorldEngine2.js:668` prod / `:2389` cycle-phases, before `Phase10-ExecuteIntents`), 8 callers, writes `S.businessDynamicsState`, `S.hoodBusinessMomentum`, `S.hoodSpots`, `S.worldEvents`, `S.businessDeclines`, `S.businessClosures`, `S.sportsWeekBars`, queues range/ensure intents to `Business_Ledger` (`:833-836`, priority `90`) and `Business_Archive` (`:788`, priority `25`).
