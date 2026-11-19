# Adversarial Review — `engine.349` Task 14, the Middle Counts (`e39a38052`)

**Reviewed:** commit `e39a3805281bc7f7143d423b63743650f54bde94` (`utilities/citizenMemory.js`, `utilities/compressLifeHistory.js`, `phase02-world-state/loadEventContentLedger.js`, `phase04-events/generationalEventsEngine.js`, `phase05-citizens/applyBusinessDynamics.js`, `phase05-citizens/bondEngine.js`, `phase05-citizens/casinoLedgerEngine.js`, `phase05-citizens/generateCitizensEvents.js`, `phase05-citizens/generationalWealthEngine.js`, `phase05-citizens/migrationTrackingEngine.js`, `phase05-citizens/runCareerEngine.js`, `phase05-citizens/runConductEngine.js`, `phase05-citizens/updateCivicApprovalRatings.js`, `lib/citizenDials.js`, `lib/wakePerception.js`, `scripts/buildCitizenCards.js`, and 14 changed test files), read-only scan of `phase*`, `utilities/`, `lib/`, `scripts/`, `dashboard/`, live `Event_Content_Ledger` (read-only via `lib/sheets.js`), `output/simulation_ledger_snapshot.jsonl`, and `output/voice-disposition-cache/*.md`.
**Reviewer:** Antigravity (agy lane, read-only; no code or sheet edits, no bench or engine fires, no model runs).
**Verdict:** **HOLD**

All 14 changed test files pass as written. However, the review finds: (1) missed active band/cliff readers in `updateCivicApprovalRatings.js` (`readDialBase_` + `dialBandIndexFromValue_`), `maneuverEngine.js` (`maneuverFactor_` / `maneuverWillingCrossField_`, which in live Cycles shadows `casinoLedgerEngine.js`'s `CASINO_DRIVE_F_` conversion), `generateCitizensEvents.js` (`getArchetypeWeights_`), and `phase07-evening-media` (`applyStorySeeds.js`, `storyHook.js`); (2) an `rng()` draw and `S.casinoGates.tilt` increment spent on ineligible citizens in `casinoLedgerEngine.js:976-980`; (3) a sharp discontinuity in `runConductEngine.js:234-253` at `reach = 0.5` (`integrity = 20.0` at steady composure, up to `integrity = 40.0` at `composure = 10`) that unlocks `Resisted` (+5) where only `BoundaryKept` (+1) or `BoundaryCompromised` (-1) existed before, plus quadratic double-damping in `commitP` (`:225`); (4) `balanceContentLedgerPoolWeights_` (`generateCitizensEvents.js:57-87`) undoing `contentDialShare_` for any `PoolKey` whose eligible rows all share a dial gate; (5) grammar-breaking `LEANS` phrases in `lib/citizenDials.js:58,61-62`, `lib/provocationBank.js:65,68`, and `lib/wakePerception.js:88-90`, plus stale C116 disposition caches; and (6) weakened/incomplete tests in `scripts/citizenDialMultiCycle.test.js:80,114` (`C2` masks `crimeReach = 0.20` behind `>= 0.5`), `scripts/engine32MultiCycle.test.js`, `scripts/dialGates.test.js`, `scripts/casinoLedgerEngine.test.js`, and `scripts/citizenDials.test.js`.

---

## 1. Readers Missed

### 1a. Missed active band / cliff readers (all change engine odds, gates, or weights)

1. **`readDialBase_` + `dialBandIndexFromValue_` (`phase05-citizens/updateCivicApprovalRatings.js:1460-1468, 1491-1500, 1556-1563, 1584-1587`) — BAND READER IN EFFECT:**
   - `dialBandIndexFromValue_(v)` (`:1460-1468`) still buckets `v` into integer bands `0..4` (`<20`, `<40`, `<60`, `<80`, `>=80`).
   - `scoreLedgerCitizenForOffice_` reads `readDialBase_(row[iDial], ...)` (`base` only, ignoring `mood`) and hard-rejects candidates at `dialBandIndexFromValue_(drive) < 3` (`drive < 60`), `dialBandIndexFromValue_(integ) < 2` (`integrity < 40`), and `dialBandIndexFromValue_(comp) < 2` (`composure < 40`) (`:1560-1562`), then adds integer `dialBandIndexFromValue_(dDrive)` (`0..4`) to candidate `score` (`:1585-1586`).
   - **Failure:** A citizen with `drive: 59` (or `base.drive: 58, mood.drive: +5`) is rejected (`null`), while `60` enters with `+3` and `60..79` score identically.

2. **`maneuverFactor_` / `maneuverPosture_` / `maneuverWillingCrossField_` (`phase05-citizens/maneuverEngine.js:79-96, 127-134, 344-362`, config `phase01-config/engine94SheetContract.js:600`) — BAND / CLIFF READER IN EFFECT:**
   - `maneuverDials_` (`:79-90`) reads `DialState.base` (`drive`, `openness`, ignoring `mood`) or `TraitProfile` regex `drive:(\d+)` / `openness:(\d+)`. `maneuverAmbition_` (`:92-96`) computes `Math.round(0.7 * drive + 0.3 * openness)`. `maneuverPosture_` (`:132`) hard-cuts `ambition >= maneuverClimbBar` (`60`) -> `'climb'`; `maneuverFactor_` (`:344-352`) returns a step multiplier (`climb -> 1.5`, `hold -> 1.0`, `retreat -> 0.5`); `maneuverWillingCrossField_` (`:356-362`) hard-cuts `climb && openness >= 60`.
   - **Callers affected:**
     - `phase05-citizens/casinoLedgerEngine.js:962-965`: `var driveF = postureE ? maneuverFactor_(ctx, pid, null) : dialLadder_(drive, CASINO_DRIVE_F_);`. Because `runManeuverEngine_` runs before `casinoLedgerEngine_` in Phase 5, **`postureE` is populated for every living non-GAME adult in live Cycles, completely bypassing `CASINO_DRIVE_F_`** and reverting casino placement to the `ambition >= 60` cliff (`1.0` -> `1.5`, or `0.5` on retreat).
     - `phase05-citizens/generationalWealthEngine.js:2121` (`homeF`, home purchase odds).
     - `phase05-citizens/householdFormationEngine.js:434` (`soloF`, solo establish odds).
     - `phase05-citizens/migrationTrackingEngine.js:765` (misfit relocation odds).
     - `phase05-citizens/runCareerEngine.js:1849-1850` (civic open-slot movers gated on `posture === 'climb'`) and `:1945-1950` (zero-same-field cross-field hiring gated on `maneuverWillingCrossField_`).

3. **`getArchetypeWeights_` (`phase05-citizens/generateCitizensEvents.js:895-925, 2780-2782, 3589-3605`) — BAND READER IN EFFECT:**
   - Reads `Archetype:` from `TraitProfile`, which `utilities/compressLifeHistory.js:1917-1934` (`deriveArchetypeFromBands_`) computes strictly via `bandIndex_` (`<20` integrity -> `Outlaw`, `<20` composure -> `Catalyst`, `>=60` highest -> `Striver`/`Connector`/etc., else `Drifter`).
   - Contrary to the commit message's claim that `bandIndex_` stays only as "a measure and a label", `generateCitizensEvents.js:3589-3605` uses `getArchetypeWeights_(archetype)` to multiply pool entry weights by `1.1x`–`1.4x`: e.g., `drive = 59` (`Drifter`) gets `work: 1.0`, whereas `drive = 60` (`Striver`) jumps to `work: 1.3`, `driven: 1.4`, `rivalry: 1.2`.

4. **`TraitProfile` / `Archetype:` consumers in media & game mode:**
   - `phase07-evening-media/applyStorySeeds.js:494, 507-512`: scores interview candidates (`1..3` points) by `Archetype:` match (`preferredArchetypes`).
   - `phase07-evening-media/storyHook.js:1242-1351`: selects story-hook investigation angles by `Archetype:`.
   - `phase04-events/generateGameModeMicroEvents.js:414-419`: reads `traitProfile.split('/')[0]` for `mlb-*` `traitPools[archetype]` (broken on `Archetype:X|...` rows; active only on legacy slash-format `Catalyst/bright` strings).

### 1b. Named helpers checked — NOT band readers in effect

- **`traits.*` (`phase05-citizens/generateCitizensEvents.js:854-881, 931-957, 1022, 3607-3610`; `phase07-evening-media/applyStorySeeds.js:497-502`):** **Dormant on live DialState-backed citizens.** `formatDialFace_` (`utilities/compressLifeHistory.js:1939-1962`) emits `drive:NN` etc. (0–100 integers), not v1.5 `social:0.xx` / `reflective:0.xx` / `driven:0.xx` / `volatile:0.xx` / `grounded:0.xx`, so `traits.*` evaluates to `undefined` unless a legacy v1.5 string is present.
- **`casinoDrive_` (`phase05-citizens/casinoLedgerEngine.js:422-435, 963-965`):** **Not a band reader** on its own return value (returns continuous `0..100`, passed to `dialLadder_(drive, CASINO_DRIVE_F_)`). Note two caveats: (1) serialized rows carry no `o.current`, so `:428` reads `o.base.drive` (ignoring `mood`) with fallback regex `drive:(\d+)` on `TraitProfile`, and (2) as noted above, `maneuverFactor_` shadows it live at `:965`.
- **`bondTraitOf_` (`phase05-citizens/bondEngine.js:2082, 2098`):** Fallback `TraitProfile` regex `trait + ':(\\d+)'` is only hit when `DialState` is absent, and feeds continuous `dialPos_()`.
- **Verified clean:** No remaining `.bands`, `crimeReachable`, `ownerDriveBand`, `bondDialBand_`, `holderIntegrityBand_`, or `bizOwnerBands_` references in `phase*`, `utilities/`, `lib/`, `scripts/`, or `dashboard/`.

---

## 2. Each Conversion Against the Old Code

All converted sites match the old per-band value at `10 / 30 / 50 / 70 / 90` and interpolate linearly between (flat past `10` and `90`), with the following discrepancies and behavioral changes:

### 2a. `phase05-citizens/runConductEngine.js:205, 221-269` (checked hardest)

Exact probabilities across integrity `{10, 15, 20, 25, 30, 45, 50, 55}` at `composure = 50` and `composure = 10`, without and with `spike` (`crimeSpikeFor_ = true`):

| `composure` | `spike` | `integrity` | `reach` | `P(Commit)` | `P(Resisted)` (+5) | `P(Slip)` (-1) | `P(Kept)` (+1) | Old outcome |
|---|---|---|---|---|---|---|---|---|
| 50 | false | 10 | 1.00 | 0.7500 | 0.2500 | 0 | 0 | Commit 0.750 / Resist 0.250 |
| 50 | false | 15 | 0.75 | 0.5250 | 0.4750 | 0 | 0 | Commit 0.750 / Resist 0.250 |
| 50 | false | 20 | 0.50 | 0.3250 | 0.6750 | 0 | 0 | Slip 0.350 / Kept 0.650 |
| 50 | false | 25 | 0.25 | 0.1500 | 0 | 0.2975 | 0.5525 | Slip 0.350 / Kept 0.650 |
| 50 | false | 30 | 0.00 | 0 | 0 | 0.3500 | 0.6500 | Slip 0.350 / Kept 0.650 |
| 50 | false | 45 | 0.00 | 0 | 0 | 0.2750 | 0.7250 | Slip 0.250 / Kept 0.750 |
| 50 | false | 50 | 0.00 | 0 | 0 | 0.2500 | 0.7500 | Slip 0.250 / Kept 0.750 |
| 50 | false | 55 | 0.00 | 0 | 0 | 0.2250 | 0.7750 | Slip 0.250 / Kept 0.750 |
| 50 | true | 10 | 1.00 | 0.4500 | 0.5500 | 0 | 0 | Commit 0.450 / Resist 0.550 |
| 50 | true | 15 | 0.75 | 0.3150 | 0.6850 | 0 | 0 | Commit 0.450 / Resist 0.550 |
| 50 | true | 20 | 0.50 | 0.1950 | 0.8050 | 0 | 0 | Slip 0.350 / Kept 0.650 |
| 50 | true | 25 | 0.25 | 0.0900 | 0 | 0.3185 | 0.5915 | Slip 0.350 / Kept 0.650 |
| 50 | true | 30 | 0.00 | 0 | 0 | 0.3500 | 0.6500 | Slip 0.350 / Kept 0.650 |
| 50 | true | 45 | 0.00 | 0 | 0 | 0.2750 | 0.7250 | Slip 0.250 / Kept 0.750 |
| 50 | true | 50 | 0.00 | 0 | 0 | 0.2500 | 0.7500 | Slip 0.250 / Kept 0.750 |
| 50 | true | 55 | 0.00 | 0 | 0 | 0.2250 | 0.7750 | Slip 0.250 / Kept 0.750 |
| 10 | false | 10 | 1.00 | 0.7500 | 0.2500 | 0 | 0 | Commit 0.750 / Resist 0.250 |
| 10 | false | 15 | 1.00 | 0.7000 | 0.3000 | 0 | 0 | Commit 0.750 / Resist 0.250 |
| 10 | false | 20 | 1.00 | 0.6500 | 0.3500 | 0 | 0 | Commit 0.550 / Resist 0.450 |
| 10 | false | 25 | 1.00 | 0.6000 | 0.4000 | 0 | 0 | Commit 0.550 / Resist 0.450 |
| 10 | false | 30 | 1.00 | 0.5500 | 0.4500 | 0 | 0 | Commit 0.550 / Resist 0.450 |
| 10 | false | 45 | 0.25 | 0.1000 | 0 | 0.2475 | 0.6525 | Slip 0.250 / Kept 0.750 |
| 10 | false | 50 | 0.00 | 0 | 0 | 0.2500 | 0.7500 | Slip 0.250 / Kept 0.750 |
| 10 | false | 55 | 0.00 | 0 | 0 | 0.2250 | 0.7750 | Slip 0.250 / Kept 0.750 |
| 10 | true | 10 | 1.00 | 0.4500 | 0.5500 | 0 | 0 | Commit 0.450 / Resist 0.550 |
| 10 | true | 15 | 1.00 | 0.4200 | 0.5800 | 0 | 0 | Commit 0.450 / Resist 0.550 |
| 10 | true | 20 | 1.00 | 0.3900 | 0.6100 | 0 | 0 | Commit 0.330 / Resist 0.670 |
| 10 | true | 25 | 1.00 | 0.3600 | 0.6400 | 0 | 0 | Commit 0.330 / Resist 0.670 |
| 10 | true | 30 | 1.00 | 0.3300 | 0.6700 | 0 | 0 | Commit 0.330 / Resist 0.670 |
| 10 | true | 45 | 0.25 | 0.0600 | 0 | 0.2585 | 0.6815 | Slip 0.250 / Kept 0.750 |
| 10 | true | 50 | 0.00 | 0 | 0 | 0.2500 | 0.7500 | Slip 0.250 / Kept 0.750 |
| 10 | true | 55 | 0.00 | 0 | 0 | 0.2250 | 0.7750 | Slip 0.250 / Kept 0.750 |

Four concrete issues in `runConductEngine.js`:
1. **Cliff + `Resisted` (+5) jump at `reach = 0.5` (`:234, 249-253`):**
   - At `composure = 50, integrity = 20.0`, `reach = 0.50`, so `reach < 0.5` is `false`: every non-commit (`67.5%` calm / `80.5%` spike) awards **`Resisted` (+5 integrity)**, giving expected integrity delta `+1.39` calm / `+2.84` spike per test (commit severity expectation `-6.1`). At `integrity = 20.1`, `reach = 0.4975 < 0.5`, so `Resisted` drops to `0%` and expected delta drops to `-1.77` (`BoundaryKept` `+1` / `BoundaryCompromised` `-1`).
2. **Citizen between 20 and 30 pushed up by `Resisted` +5 where not possible before:**
   - At `composure >= 40`: at exact `integrity = 20` (`reach = 0.5`), `Resisted` (+5) fires `67.5%` (`80.5%` spike), whereas previously `integrity = 20` (`band -1`) could only draw `BoundaryKept` (`+1`). Strictly between `20 < integrity < 30` with `composure >= 40`, `reach < 0.5`, so `Resisted` cannot fire.
   - At `composure = 10..20`: at `composure = 20` (`dialLow_(20,2) = 0.5`) and `integrity` in `[20, 30]`, `crimeReachable` was previously `false` (composure was band `-1`), so they got `BoundaryKept` (`+1`) only; now `reach = 0.5`, giving **`Resisted` (+5)** `67.5%`–`72.5%` of tests (`80.5%`–`83.5%` spike). Even at `composure = 10, integrity = 40` (previously `false` because `integrity = 40` was band `0`), `reach = 0.5` now gives `Resisted` (+5) `77.5%` of tests!
3. **Quadratic `commitP` drop (`:225`):** `reach * (0.35 + 0.20 * Math.max(0, -pos.integrity))` multiplies two integrity-dependent terms on `[10, 20]` (e.g., `integrity = 15, composure = 50` gives `0.75 * 0.70 = 0.525` instead of linear `0.65`, inflating `Resisted` from `25%` to `47.5%`).
4. **Comment vs unconditional slip probability (`:238-241`):** `slipP` is conditional on `!committed`; unconditional `P(BoundaryCompromised) = (1 - commitP) * slipP` (`0.2975` at `25/50`, `0.2475` at `45/10`), not `0.35` / `0.275`.

### 2b. Other conversions

- **`utilities/citizenMemory.js:692-694` (`dialLadder_`):** `Number(null)`, `Number('')`, and `Number(false)` all coerce to `0`, so `dialLadder_(null, table)` silently returns `table[0]` (the worst/lowest value) instead of throwing — contradicting the guard's intent (`"a dial that is not a number throws"`). All current callers pass `current_(c, d)` or `bondTraitOf_`/`casinoDrive_` defaults (`50`), so no live failure today, only a latent trap for direct callers.
- **`phase02-world-state/loadEventContentLedger.js:176` & `phase05-citizens/generateCitizensEvents.js:1398-1403` (`contentDialTermShare_`):**
  - `>` and `>=` (and `<` and `<=`) share the identical formula `s = (av - (t.v - 10)) / 20`, so `warmth<=39` starts its ramp at `49` (`0` at `49`, `0.5` at `39`, `1` at `29`) rather than `50`, and strict `<`/`>` yield `0.5` at `t.v` (matching the comment, though ignoring `=` vs strictness).
- **`phase05-citizens/applyBusinessDynamics.js:662-664` (`ownerRoom`):** Checked negative `ownerRoomRaw` (`-0.5` at `composure = 40`, `dialOwnerStreakRoom = 1`): `Math.floor(-0.5) = -1`, `ownerRoomRaw - ownerRoom = +0.5`, so `seedUnit_ < 0.5` adds `+1` (`0` half the time, `-1` half the time, mean `-0.5`). Exact.
- **`bondEngine.js`, `updateCivicApprovalRatings.js` (`holderIntegrityPos_`), `migrationTrackingEngine.js`, `generationalEventsEngine.js` (`checkHealthEvent_`), `runCareerEngine.js` (`overworkP`, `contestRoll_`), `generationalWealthEngine.js` (`champTerms`), `compressLifeHistory.js` (`getCitizenDialBands_`):** All match old values at `10/30/50/70/90` with the stated linear interpolation and direction.

---

## 3. Draws

| Site | Stream | Position in loop | Old vs New | Skipped citizen burns draw? |
|---|---|---|---|---|
| `phase05-citizens/casinoLedgerEngine.js:976` (`tilt`) | `rng` (`safeRand_(ctx)`) | Inside `for (c = 0; c < lRows.length; c++)`, after `refuseShare >= 1` (`:974`), **before** `!wantShow && !wantSports` (`:980`) and `rng() >= p` (`:985`) | Was 0 draws; now 1 draw when `10 < composure < 30` and `integrity < 90` | **YES.** Ineligible citizens (minors `age < 18`, zero income + low NW, non-`Active` status, `BIZ-00100` staff, pilots when sports off) with `10 < composure < 30` spend an `rng()` draw at `:976` **and increment `S.casinoGates.tilt` (`:977`)**, then immediately `continue` at `:980` (`!wantShow && !wantSports`), shifting every downstream `rng()` draw in `processCasinoLedger_`. Eligible non-bettors (`98%+`) also draw before `:985`. |
| `phase05-citizens/runCareerEngine.js:1519` (`overwork`) | `roll` (`safeRand_(ctx)`) | Inside row walk, after age/status/hospital skips (`:1451-1502`), **before** `if (count >= LIMIT) continue;` (`:1527`), `xp` (`:1538`), and `chanceHit` (`:1605`) | Was 0 draws; now 1 draw when `0 < overworkP < 1` | **No skip by `hood` slot** (`PRESSURE_SLOT` at `utilities/citizenDialMap.js:520` maps only `rent`/`hood` -> `'housing'`; `overwork` has its own slot). Past `LIMIT` (`:1527`), `emitPressureTag_` still runs deliberately (`engine.274`). Still shifts downstream `roll()` draws in `runCareerEngine_` for any citizen with `0 < overworkP < 1`. |
| `phase05-citizens/applyBusinessDynamics.js:664` (`ownerRoom`) | `seedUnit_(cycle + '\|' + id + '\|ownerRoom')` (stateless FNV hash) | Inside `Business_Ledger` loop (`:664`), after `bizDriftOne_` | Was deterministic; now deterministic hash | No shared RNG stream touched. |
| `phase05-citizens/runConductEngine.js:216,230,244,258` | `cRng` | Unchanged (`2` draws on non-commit; `4` on commit) | Unchanged | No. |

**`applyBusinessDynamics.js:664` (`ownerRoom`) inside and across Cycles:**
- **Inside one Cycle:** `seedUnit_(cycle + '|' + id + '|ownerRoom')` depends only on `(cycle, id)`. Because `applyBusinessDynamics_` runs once per Cycle with one row per `BIZ_ID`, the same business cannot get two different closure answers inside one Cycle.
- **Across Cycles at `streak = bar` with `room = 0.5`:** In `bizDriftOne_` (`:491`), `streak = growth < 0 ? prevState.streak + 1 : 0`. Because `streak` strictly increments by `+1` on every declining week (or resets to `0` on `growth >= 0`), a single decline streak hits `bar` (for `ownerRoom ∈ {0, +1}`, e.g. `composure = 60`) or `bar - 1` (for `ownerRoom ∈ {-1, 0}`, e.g. `composure = 40`) **at most once**: `50%` close on that week, and the remaining `50%` close unconditionally on the next declining week (`streak = bar + 1` or `bar`). Independent re-rolls occur only across separate decline streaks in different Cycles.

---

## 4. The Loop the Deep-Dive Named (`output/simulation_ledger_snapshot.jsonl`)

Snapshot population: `1,075` rows (all living, all with valid `DialState`).

### 4a. Participation multiplier (`(mult.drive + mult.outabout + mult.sociability) / 3`)

- Citizens changed: **`1,064 / 1,075`**.
- **All `1,075` citizens:**
  - **OLD (`BAND_MULT[bandIndex_]`):** sum `1,143.75`, mean `1.0640`, SD `0.1042`, median `1.0000` (p25 `1.0000`, p75 `1.0833`, min `1.0000`, max `1.4167`).
  - **NEW (`dialMultiplier_`):** sum `1,162.48` (**`+1.64%`**, `+18.73` citizen-equivalents), mean `1.0814`, SD `0.0960`, median `1.0381` (p25 `1.0184`, p75 `1.0995`, min `0.9834`, max `1.3914`).
- **All-middle on the 3 activity dials (`40 <= current < 60`, `n = 689`):**
  - **OLD:** sum `689.00`, mean `1.0000`, SD `0.0000`.
  - **NEW:** sum `706.60` (**`+2.55%`**), mean `1.0255`, SD `0.0175`, range `0.9834`–`1.0981`.

### 4b. Forward fold (`foldNewEntries_`, `lineScale = 2`, `directShare = 0.25`, leg d push shares)

Executed `compressLifeHistory.js:foldNewEntries_` + `citizenMemory.js:settleCycle_` over all `1,075` snapshot `DialState`s with `generateCitizensEvents.js` participation (`0.72 * act`, `1..4` lines/Cycle) and pool-weight feedback (`sociability`, `warmth`, `drive`, `composure`, `family`, `outabout`) at leg d's push shares (`sociability 53%`, `warmth 51%`, `openness 46%`, `drive 52%`, `composure 51%`, `integrity 44%`, `family 48%`, `outabout 62%`), averaged across **10 seeds**:

| Horizon | Mode | Perm band cross (`base`) | Felt band cross (`current`) | All-middle remaining (`start = 687`) | `outabout` mean | `outabout` in 40–60 (`start = 1,056`) |
|---|---|---|---|---|---|---|
| **10 Cycles** | OLD (`BAND_MULT`) | `8.49%` | `22.45%` | `678.5` | `51.65` | `1,046.8` |
| **10 Cycles** | NEW (`dialMultiplier_`) | `8.41%` | `22.81%` | `679.7` | `51.68` | `1,048.5` |
| **52 Cycles** | OLD (`BAND_MULT`) | `28.52%` | `47.70%` | `612.0` | `54.41` | `967.1` |
| **52 Cycles** | NEW (`dialMultiplier_`) | `29.00%` | `49.65%` | `607.3` | `54.60` | `954.9` |

No dial runs away (single-seed 52-Cycle max/min across all 8 dials: `[36.4, 97.2]`), and the middle does not empty out faster than leg d's `13%` permanent crossings over 10 Cycles (in this isolated `generateCitizensEvents`-only loop, `8.41%` vs `8.49%`). Over 52 Cycles, only `outabout` (62% up share in leg d) moves slightly faster (`954.9` vs `967.1` left in `40–60`) because `mult.outabout` now rises smoothly past `50`.

---

## 5. The Content Tab (`Event_Content_Ledger`, read-only via `lib/sheets.js`)

Live tab scan (`145` active `PoolKey`s; `Kind=line`): **13** active dial-conditioned rows (`R299`, `R300` in `culture.spacemolt-pilot` [`8` active lines, total `Weight = 11.85`]; `R312–317`, `R321`, `R854–855`, `R870`, `R887` in `culture.spacemolt-show` [`48` active lines, total `Weight = 47.30`]), and **0** active `fragment` rows with a dial condition.

### 5a. Snapshot offer counts & summed Weight (`n = 1,075`)

| Dial condition | Rows (live) | OLD citizens offered | NEW citizens offered | OLD summed `Weight` | NEW summed `Weight` | Weight ratio |
|---|---|---|---|---|---|---|
| `warmth>=60` (`undocked`) | `R312`, `R313` (`w=1.0`) | `102` | `755` | `102.00` | `176.60` | `1.73x` |
| `warmth>=60` (`undocked`) | `R314`, `R854` (`w=0.95`) | `102` | `755` | `96.90` | `167.77` | `1.73x` |
| `warmth>=60` (`undockedpilot`) | `R299` (`w=1.4`, pre-pilot gate) | `102` | `755` | `142.80` | `247.24` | `1.73x` |
| `warmth<=39` (`undocked`) | `R315`, `R316`, `R855`, `R887` (`w=0.85`) | `0` | `5` | `0.00` | `0.39` | — |
| `warmth<=39` (`undocked`) | `R317` (`w=0.80`) | `0` | `5` | `0.00` | `0.37` | — |
| `drive>=60` (`undocked`) | `R870` (`w=0.95`) | `300` | `871` | `285.00` | `352.66` | `1.24x` |
| `drive>=60` (`undocked;fame=0`) | `R321` (`w=1.05`, pre-`fame=0` gate) | `300` | `871` | `315.00` | `389.79` | `1.24x` |
| `drive>=60` (`undockedpilot`) | `R300` (`w=1.4`, pre-pilot gate) | `300` | `871` | `420.00` | `519.71` | `1.24x` |

### 5b. `balanceContentLedgerPoolWeights_` (`phase05-citizens/generateCitizensEvents.js:57-87`)

- `balanceContentLedgerPoolWeights_` rescales every `eclPoolKey` group to equal mass `bucketMass = ledgerTotal / keys.length` via `row.weight = bucketMass * (rowWeight / group.total)`.
- In `culture.spacemolt-show` (`48` rows, `total = 47.30`), `bucketMass` absorbs the delta smoothly so a `0.25x` dial row retains `~0.24x` of an unconditional show row's weight (slightly diluting other `culture.spacemolt-show` rows and exporting `1 / keys.length` of added mass to other `PoolKey`s).
- **Structural failure for small / single-gate `PoolKey`s:** If a `PoolKey` has only dial-gated eligible rows for a citizen (or all its eligible rows share the same dial term), `rowWeight / group.total` cancels the dial share out completely and `balanceContentLedgerPoolWeights_` restores those fractional rows to **100% of `bucketMass`** (undoing `contentDialShare_`).

### 5c. Fragments (`contentSlotsFillable_` vs `composeContentLine_`)

- `contentSlotsFillable_` (`generateCitizensEvents.js:1437`) and `composeContentLine_` (`:1461-1464`) both filter fragments via `evalContentConditions_`, which admits `t.soft` iff `contentDialTermShare_(t, av) > 0`. They **agree** on eligibility, and `composeContentLine_` scales the copied fragment weight by `fragShare`. (Minor: when unconditional fragments hit the 6-use `eclTelemetry.fragUse` soft cap at `:1475`, `eligible = underCap` promotes any remaining low-`fragShare` fragment to 100% of `underCap`.)

---

## 6. Temperament Words (`lib/citizenDials.js` `LEANS`) and Consumers

### 6a. Disputed `LEANS` phrases (`lib/citizenDials.js:53-63`)

1. **`integrity` low (`40-46`): `'will bend a small rule'` (`:58`)** — Compare pole 1 (`20-39`): `'bends rules when it suits'`. Phrased as a predictive behavioral directive (`"will bend..."`) rather than a mild inclination (`"a little loose with small rules"` / `"leans flexible"`), reading nearly as strong as pole 1 and inviting a voice model to enact rule-bending on a `46`-integrity citizen.
2. **`outabout` high (`54-59`): `'out a fair bit'` (`:61`)** — Compare pole 2 (`60-79`): `'often out in the neighborhood'`. Reads at pole strength for a citizen only 4 points above neutral.
3. **`fandom` high (`54-59`): `'follows the teams'` (`:62`)** — Flat categorical claim with no lean qualifier (contradicts the intentional `fandom >= 60` fan bar), while low (`40-46`) `'only loosely follows the teams'` reads no weaker than pole 1 (`20-39`: `'keeps half an eye on the scores'`).

### 6b. Downstream prompt grammar failures & stale caches

1. **Broken grammar in `dialTrajectory` and `provocationBank.js`:**
   - `lib/wakePerception.js:88-90` (`dialTrajectory`) now returns `phraseFor(d, c)` (which includes `LEANS`) and feeds `scripts/citizen-wake.js:188`, `scripts/citizen-exchange.js:134`, `scripts/citizenVoice.js:164` (`"Lately you've been ${traj}."`), and `lib/provocationBank.js:68` (`"Lately you've been " + s.traj`). Verb-headed leans produce `"Lately you've been leans ambitious."`, `"Lately you've been will bend a small rule."`, and `"Lately you've been follows the teams."` (Note: `dialTrajectory` is currently dormant until drain, but the template callers are live.)
   - `lib/provocationBank.js:65` (`self_disposition`, live): `"You've been carrying a " + (s.citizen.disp || 'particular') + " mood lately."` produces `"You've been carrying a will bend a small rule mood lately."` / `"You've been carrying a leans warm mood lately."`.
2. **Consumers checked (`citizen-wake.js`, `citizen-exchange.js`, `citizenVoice.js`, `workerWake.js`, `reporterIdentity.js`, `cron-work-wake.js`, `buildCitizenCards.js`, `refreshVoiceDispositionCache.js`, `godworld-mcp.py`):**
   - None parse `disposition()` or `Essence:`, none match on `'even-keeled'`, and none truncate `disposition()` or `Essence:` length.
   - **Stale caches:** `output/voice-disposition-cache/*.md` were last refreshed at `c116` (`POP-00018.md` omits `out a fair bit`; `POP-00789.md` omits `leans principled`), and Supermemory `wd-citizens` cards from before `e39a38052` (including the 349 newly-leaning citizens) remain stale until `refreshVoiceDispositionCache.js --live` (C117 close) and `buildCitizenCards.js` re-run.

---

## 7. Trick Code in the Changed Test Files

All 14 changed test files pass when executed directly (`node <file>`), with these weakened assertions, stubs, and gaps:

1. **`scripts/citizenDialMultiCycle.test.js:78-80, 114` (`C2` / `C3` / `X1`) — WEAKENED ASSERTION HIDES CYCLE-1 REACHABILITY:**
   - Line 80 defines `reach.push(!!(seam && seam.crimeReach >= 0.5))`.
   - Executing the real `POP-CRIMINAL` trace and printing `seam.crimeReach` shows Cycle 1 already reaches **`crimeReach = 0.20`** (`mood = -24`, `current = 26` — the crime door is 20% open in `runConductEngine_`), followed by `[0.70, 0.91, 1.00, ...]`. Thresholding at `>= 0.5` hides `crimeReach = 0.20` so `C2 ('crime NOT reachable at cycle 1')` passes falsely.
2. **`scripts/engine32MultiCycle.test.js:112, 146, 185-189, 270-279` (`G7b`):**
   - Pooling 10 paired seeds with strict `<` is **statistically stronger** than the old single-seed `<=` check (`29/625 = 0.0464` vs `64/850 = 0.0753`, ratio `0.616x`, whereas seed 2026 alone read `8/65 = 0.123` vs `9/88 = 0.102`).
   - **Gaps:** `buildPopulation()` (`:112, 120-123`) adds `5 tempted (integrity 25)` specifically for Task 14, yet `tally` (`:146, 185-189`) never tracks `temptedCommits` and no assertion checks the tempted cohort (seed 2026 calm had `9` total commits, `6` outlaw, `0` neutral -> `3` unverified tempted commits). `G7b` (`:278`) also omits any magnitude bound on the counterweight (`0.0752 < 0.0753` would pass), and `ctx.config = {}` (`:153`) still routes Trace B's aged-out lines through legacy `foldAgedOutEntries_` (`C0`).
3. **`scripts/dialGates.test.js:15, 94`:**
   - Stubs `global.seedUnit_ = () => 0.5` (`:15`), never exercising the seeded `ownerRoom` draw in `applyBusinessDynamics.js:664`. Line 94 (`(3 + 1) === 4 && (3 - 1) === 2`) is pure constant arithmetic.
4. **`scripts/businessOwnerDials.test.js`:**
   - Never tests any middle/fractional owner dial (`composure = 60` or `40`, `drive = 80`) through `applyBusinessDynamics_`.
5. **`scripts/casinoLedgerEngine.test.js:18`:**
   - Injects `dialLadder_`, `dialHigh_`, `dialLow_` globals so the engine loads, but adds **zero assertions** exercising `refuseShare` (`integrity 70..90`), `tiltShare` (`composure 10..30`, or its RNG draw before `wantShow || wantSports`), or `CASINO_DRIVE_F_` (`drive 50..70`).
6. **`scripts/contentLedgerCompose.test.js:318`:**
   - Stubs `getCitizenDialBands_` with `mult` all `1` and tests only `fandom`, never `warmth`/`drive`, and never tests `composeContentLine_` on a dial-conditioned fragment.
7. **`scripts/conductEngine.test.js:124, 140, 144, 193-231`:**
   - `w2Resolve` never tests the `composure = 10` burnout path (`integrity = 25..40`), and `:124, 140, 144` retain stale `crimeReachable` / `band -2` labels.
8. **`scripts/citizenDials.test.js:285-286` (`B4h`):**
   - Tests only `'abc'`; as shown in §2b, `dialLadder_(null, ...)` / `''` / `false` returns `table[0]` instead of throwing.
