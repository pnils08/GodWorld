---
type: review
title: "Adversarial Read — engine.299 Task 13: Lifting Per-Cycle Output Caps"
date: 2026-10-18
author: antigravity
lane: antigravity
target_commits:
  - a8985e7e
  - working-tree:phase04-events/generateGenericCitizenMicroEvent.js
status: complete
---

# Adversarial Read — `engine.299` Task 13 (`EVENT_LIMIT` Removal)

**Targets inspected:**
- Commit `a8985e7e`: `phase05-citizens/runNeighborhoodEngine.js` (`EVENT_LIMIT = 6` and `if (eventsCreated >= EVENT_LIMIT) break;` removed)
- Working-tree diff (`git diff HEAD -- phase04-events/generateGenericCitizenMicroEvent.js`): `phase04-events/generateGenericCitizenMicroEvent.js` (`EVENT_LIMIT = 25` and `if (eventsCreated >= EVENT_LIMIT) break;` removed)
- Governing plan & doctrine: `docs/plans/2026-10-18-event-engines-move-dials.md` (`:152-209`), `docs/SIM_DOCTRINE.md` §1

---

## Executive Verdict

Removing `EVENT_LIMIT = 6` in `runNeighborhoodEngine.js` and `EVENT_LIMIT = 25` in `generateGenericCitizenMicroEvent.js` **does not break downstream consumers or blow the 360 s Apps Script wall**, but **neither engine behaves the way its new header comments claim** once the `break` is removed:

1. **`generateGenericCitizenMicroEvent.js` still has a hidden citywide cap and late-ledger starvation (`HIGH`):** `uniquePickGlobal_` (`phase04-events/generateGenericCitizenMicroEvent.js:456-482`) deduplicates event text **citywide across all citizens** (`cycle + "|" + cand`) rather than per-citizen (`cycle + "|" + popId + "|" + cand`, cf. `phase04-events/generateGameModeMicroEvents.js:442-468`). Because `basePool` holds only ~10–18 shared strings on an ordinary Cycle and `neighborhoodPool` (`:134-195`) covers only **12 of the 22** core-sim neighborhoods (3 strings each), the shared city pool is completely exhausted by roughly row 100–150 of `Simulation_Ledger`. Worse, `uniquePickGlobal_` marks a string used (`:466, 476`) **before** the `engine.299` dial-direction admission check (`:616-626`), so unsigned strings (`chaosPool`, 6 of 8 `prevEvePool` patterns, `nhW` temperature lines, and all `neighborhoodPool` lines in `'steady'` hoods) burn both a citizen's winning RNG roll and a global pool entry before hitting `continue` at `:623`.
2. **`generateGenericCitizenMicroEvent.js` still carries unreverted temporary `CATCH-UP` base rates from `312d0b0e` (`HIGH`):** Lines `514-525` set `tier <= 1 → 0.50`, `tier === 2 → 0.25`, `tier 3-4 → 0.10` plus a thin-history multiplier (`×5` / `×3` / `×1.5`), directly contradicting the comment at `:511-513` ("tier 1-2 get micro-events at lower rate") and the footer spec at `:680` (`BASE CHANCE: 0.03`). Combined with the `0.12` clamp at `:558`, every Tier 1 and Tier 2 ENGINE citizen is permanently pinned at `chance = 0.12` regardless of their `outabout` dial (`0.50 × 0.5 = 0.25 > 0.12`).
3. **`runNeighborhoodEngine.js` discards ~60%–75% of winning RNG draws at `:638-643` because `textureSigned_` leaves `{ d: null }` strings in `eventPool` (`MEDIUM`):** In `phase05-citizens/runNeighborhoodEngine.js:538-548`, `textureSigned_` pushes every plain (unsigned) string from `NEIGHBORHOOD_DRIFT_BY_CHARACTER_` and `NEIGHBORHOOD_DRIFT_BESPOKE_` into `eventPool` with `d: null` (`:544`), even in `'growth'` and `'decay'` neighborhoods. When `:603` draws uniformly from `eventPool`, more than half of draws in moving hoods (and ~85%+ in steady hoods without pressure) pick a `d: null` entry and get dropped at `:638-643` (`S.engine299.noDial`).
4. **Cross-engine pressure-slot preemption expands from ≤6 citizens to the full ledger (`MEDIUM`):** In `runNeighborhoodEngine.js:612-625`, any qualifying citizen in a hood above the housing/crime bar who rolls `< driftChance` calls `emitPressureTag_(..., 'hood', ...)` **before** the `:638` dial check. Because `PRESSURE_SLOT = { rent: 'housing', hood: 'housing' }` (`utilities/citizenDialMap.js:482, 535`) and `Phase5-Neighborhoods` (`phase01-config/godWorldEngine2.js:634`) runs before `Phase5-Household` (`:646`) and `Phase5-GenerationalWealth` (`:670`), removing `EVENT_LIMIT = 6` means `hood` pressure now claims the per-Cycle `'housing'` pressure slot across all qualifying rows before rent pressure runs.

---

## Hunt 1 — In-Loop Dependencies on the `break`

### 1.1 `generateGenericCitizenMicroEvent.js`: Global Text Deduplication (`uniquePickGlobal_`) Still Caps Output and Starves Late Rows (`HIGH`)

- **Where:** `phase04-events/generateGenericCitizenMicroEvent.js:449-482, 561-626`
- **Mechanism:**
  - The new comment at `phase04-events/generateGenericCitizenMicroEvent.js:82-84` states:
    > *"Removed in engine.299 Task 13: a citywide count cap biased selection to the top of the ledger — once 25 events fired, citizens late in ledger order never drew. Each citizen's own odds decide."*
  - However, `uniquePickGlobal_(pool)` (`:456-482`) keys `usedGlobalObj` on `cycle + "|" + cand` (`:463, 473`) — **without `popId`**. (Contrast `phase04-events/generateGameModeMicroEvents.js:442-468`, where `uniquePick_(pool, popId)` keys on `cycle + "|" + popId + "|" + cand.text`.)
  - Each citizen's candidate `pool` (`:561`) starts as `basePool.slice()` and appends neighborhood-specific strings (`:562-597`).
  - **Shared `basePool` size (`:87-132, 285-324, 440-447`):**
    - `base`: 6 strings (`:87-94`)
    - `seasonal`: 1 string for the active season (`:97-110`)
    - `weatherPool`: 0–1 string (`:113-116`)
    - `moodPool`: 0–2 strings (`:117-118`)
    - `chaosPool`: 0–2 strings (`:119-121`)
    - `sentimentPool`: 0–1 string (`:124-127`)
    - `econPool`: 0–1 string (`:130-132`)
    - `holidayPool` / `holidayEvePool`: 0–3 strings (`:285-299`)
    - `prevEvePool`: 0–8 strings (`:301-323`)
    - `firstFridayPool` / `creationDayPool` / `sportsPool`: 0–6 strings (`:325-363`)
    - `culturalActivityPool` / `communityPool`: 0–6 strings (`:365-391`)
    - **Total shared `basePool` on an ordinary non-holiday Cycle:** **~10–18 unique strings citywide.**
  - **Neighborhood pool coverage gap (`:134-195`):**
    - `neighborhoodPool` hardcodes only **12 neighborhoods × 3 strings = 36 strings** (`Temescal`, `Downtown`, `West Oakland`, `Fruitvale`, `Lake Merritt`, `Jack London`, `Rockridge`, `Chinatown`, `Piedmont Ave`, `KONO`, `Adams Point`, `Laurel`).
    - When `engine.148 P3` (`commit 9fa4cf43`) expanded `runNeighborhoodEngine.js` to all **22** `Neighborhood_Map` neighborhoods via `utilities/hoodTexturePool.js`, `generateGenericCitizenMicroEvent.js:134` was never migrated. The other **10 neighborhoods** (`Grand Lake`, `Old Oakland`, `Uptown`, `Brooklyn Basin`, `Montclair`, `Dimond`, `Glenview`, `Eastlake`, `Ivy Hill`, `Cleveland Heights`) have **0 entries** in `neighborhoodPool`.
  - **Pre-gate consumption bug (`:599-626`):**
    - `var pick = uniquePickGlobal_(pool)` (`:599`) marks the chosen string as `usedGlobalObj[key] = true` (`:466, 476`) **before** `signFor_(pick)` is checked at `:618-624`.
    - The following strings in `pool` have `signFor_(pick) === null` (`:419-432`) and therefore get marked used in `usedGlobalObj`, consume the citizen's winning `hit(chance)` roll, and then hit `continue` at `:623` without emitting an event:
      - Both `chaosPool` strings (`:119-121`: `"took a detour after spotting minor street issues"`, `"heard sirens in the distance..."`) — neither matches any pattern in `signFor_` (`:419-432`).
      - 6 of the 8 `prevEvePool` patterns (`:304-322`: `"picked up supplies for tomorrow's "`, `"coordinated with friends for "`, `"went to bed early ahead of "`, `"planned to stay close to home during tomorrow's "`, `"watched neighbors set up for "`, `"double-checked the schedule for tomorrow's "`) — `signFor_` at `:425` only matches `"getting ready for "` and `"prepping for "`.
      - Both `nhW` neighborhood temperature-gap lines (`:594-595`: `"dressed for cooler weather in "`, `"enjoyed the warmer pocket in "`).
      - All 3 `neighborhoodPool[hood]` strings (`:134-195`) whenever `hood` has `'steady'` trajectory (`hoodSign_` at `:414-418` returns `null` unless trajectory is `'growth'` or `'decay'`; at C111, 9 of 22 hoods are `'steady'`).
      - Both `nhDyn.sentiment < -0.3` and `nhDyn.retailVitality < 0.5` lines (`:569, 577`) in any `'steady'` hood (`hoodSign_` returns `null`, and `signFor_` at `:428-429` only matches the positive `"felt the good energy in "` / `"browsed a new shop in "` variants).
  - **Effect:** After the first ~100–150 rows of `Simulation_Ledger` consume the ~10–18 shared `basePool` strings, citizens for the remaining ~850 rows of the ledger can **only** draw from their neighborhood pool. Citizens in the 10 unmapped neighborhoods or in any `'steady'` mapped neighborhood draw `null` (or draw an unsigned string and hit `continue` at `:623`) for the rest of the ledger.

### 1.2 `generateGenericCitizenMicroEvent.js`: Unreverted `CATCH-UP` Rates + Inverted Tier 1–2 Clamp (`HIGH`)

- **Where:** `phase04-events/generateGenericCitizenMicroEvent.js:511-525, 556-558, 680`
- **Mechanism:**
  - Commit `312d0b0e` (*"feat: citizen event catch-up — thin history boost + raised limits ... Revert limits after ~5 cycles"*) changed the base probabilities and added a thin-history multiplier that were never reverted:
    ```js
    // Tier-aware base chance: tier 1-2 get micro-events at lower rate
    // (their story comes from engine mechanics + media, not random flavor)
    // Tier 3-4: generic citizens, standard chance
    var chance;
    if (tier <= 1) chance = 0.50;
    else if (tier === 2) chance = 0.25;
    else chance = 0.10;

    // CATCH-UP: Boost chance for citizens with thin LifeHistory
    var lineCount = lifeStr ? lifeStr.split('\n').filter(Boolean).length : 0;
    if (lineCount <= 2) chance *= 5;
    else if (lineCount <= 5) chance *= 3;
    else if (lineCount <= 10) chance *= 1.5;
    ```
  - At `:556-558`, the engine multiplies by `dialBands.mult.outabout` (`[0.5, 1.5]`, `utilities/compressLifeHistory.js:1214`) and clamps:
    ```js
    chance *= dialBands.mult.outabout;
    if (chance < 0.005) chance = 0.005;
    if (chance > 0.12) chance = 0.12;
    ```
  - Because `0.50 × 0.5 = 0.25 > 0.12` and `0.25 × 0.5 = 0.125 > 0.12`, **100% of Tier 1 and Tier 2 ENGINE citizens clamp to `chance = 0.12` regardless of their `outabout` dial or weather/calendar modifiers**.
  - Meanwhile, Tier 3–4 citizens start at `0.10` (3.3× the `0.03` base documented at `:680`), so any citizen with `outabout >= 1.0` and ordinary cycle modifiers (`+0.015` chaos + `+0.005` seasonal = `0.12`) also hits the `0.12` ceiling immediately, compressing the `outabout` dial's upward sensitivity (`1.0` to `1.5` all clamp to `0.12`).
  - While `EVENT_LIMIT = 25` was present, this inflation merely caused the cap of 25 to be reached faster (around row ~250). With `EVENT_LIMIT` removed, the inflated `0.10–0.12` per-citizen rate applies across the entire ~850-citizen qualifying cohort (currently masked only by `uniquePickGlobal_` pool exhaustion above).

### 1.3 `runNeighborhoodEngine.js`: `textureSigned_` Retains `{ d: null }` Entries in `eventPool`, Causing ~60%–75% Post-Roll Drops (`MEDIUM`)

- **Where:** `phase05-citizens/runNeighborhoodEngine.js:534-549, 603, 637-644`
- **Mechanism:**
  - `textureSigned_(hoodName, charKey, dir)` (`:538-548`) builds the base `eventPool` for a citizen's neighborhood:
    ```js
    function textureSigned_(hoodName, charKey, dir) {
      var raw = hoodTexturePool_(hoodName, charKey);
      var out = [];
      for (var ti = 0; ti < raw.length; ti++) {
        var item = raw[ti];
        var txt = Array.isArray(item) ? item[0] : item;
        var d = Array.isArray(item) ? item[1] : null;
        if (!dir || !d) { out.push({ t: txt, d: null }); continue; }
        if (d === dir) out.push({ t: txt, d: d === 'up' ? 'dial:outabout:up' : 'dial:outabout:down' });
      }
      return out;
    }
    ```
  - Because `:544` does `if (!dir || !d) { out.push({ t: txt, d: null }); continue; }`, **every plain (unsigned) string** in `NEIGHBORHOOD_DRIFT_BY_CHARACTER_` (`utilities/hoodTexturePool.js:34-48`) and `NEIGHBORHOOD_DRIFT_BESPOKE_` (`utilities/hoodTexturePool.js:56-235`) is pushed into `eventPool` with `d: null` even when `dir` is `'up'` or `'down'`.
  - Furthermore, four character pools in `utilities/hoodTexturePool.js:41-47` (`clinic`, `stadium`, `construction`, `mixed`) contain **zero** directional `[text, 'up'|'down']` pairs — 100% of their entries are plain strings (`d: null`).
  - Even in a `'growth'` neighborhood with bespoke directional entries (e.g., `Temescal`: 3 plain + 1 `'up'` in bespoke, 2 plain + 1 `'up'` in `arts` character pool), `textureSigned_` puts **5 `{ d: null }` items and only 2 `{ d: 'dial:outabout:up' }` items** into `eventPool`.
  - When a citizen passes `rng() < driftChance` (`:526`) and does not emit a pressure tag (`:613-624`), `:603` picks uniformly from `eventPool`, and `:638-643` drops the event whenever `entryDial === null`:
    ```js
    if (!entryDial) {
      S.engine299 = S.engine299 || { noDial: 0 };
      S.engine299.noDial = (S.engine299.noDial || 0) + 1;
      continue;
    }
    ```
  - Under `EVENT_LIMIT = 6`, those `continue` skips were invisible because the loop just kept scanning down the ledger until 6 signed/pressure events succeeded. Without `EVENT_LIMIT = 6`, each `{ d: null }` draw permanently discards that citizen's winning `driftChance` roll.

### 1.4 `runNeighborhoodEngine.js`: Pressure-Tag Preemption (`emitPressureTag_`) and Uncached Demographic Sheet Read (`MEDIUM`)

- **Where:** `phase05-citizens/runNeighborhoodEngine.js:349, 448-456, 612-625` and `utilities/citizenDialMap.js:482, 523-563`
- **Pressure-slot preemption:**
  - At `runNeighborhoodEngine.js:613-624`, any citizen in a hood with `housingPressure >= dialHoodPressureBar` or `crimeIndex >= hoodCrimeBar_` who passes `rng() < driftChance` calls `emitPressureTag_(ctx, row, i, 'hood', pressureText, 'Neighborhood')` and `continue`s (`:624`) **before** the `:638` `entryDial` check.
  - Consequently, in a `'steady'` neighborhood (`hoodDir === null`) whose crime or housing pressure exceeds the bar, **nearly 100% of emitted neighborhood events are negative `Friction`/`Strain` pressure tags**, while ordinary hood texture is 100% suppressed (`d: null`).
  - Additionally, `emitPressureTag_` records `S._pressureTaggedThisCycle[popId + ':housing'] = true` (`utilities/citizenDialMap.js:482, 535-539`). Because `Phase5-Neighborhoods` (`phase01-config/godWorldEngine2.js:634`) executes before `Phase5-Household` (`:646`) and `Phase5-GenerationalWealth` (`:670`), uncapping `runNeighborhoodEngine.js` allows `'hood'` pressure to claim the `'housing'` slot for every qualifying Tier 3–4 citizen across the ledger before `'rent'` pressure runs.
- **Uncached `getNeighborhoodDemographics_(ss)` inside `pickDemographicNeighborhood_`:**
  - At `runNeighborhoodEngine.js:448-456`, before rolling `driftChance`, the loop checks if a citizen's `Neighborhood` cell is empty or `'Oakland, CA'`, and if so calls `pickDemographicNeighborhood_(ctx, age, tier, rng)` (`:450`).
  - `pickDemographicNeighborhood_` (`:349`) calls `getNeighborhoodDemographics_(ss)` (`utilities/ensureNeighborhoodDemographics.js:134-140`), which calls `sheet.getDataRange().getValues()` directly on the `Neighborhood_Demographics` sheet **with no caching on `ctx`**.
  - Previously, `break` stopped the loop as soon as 6 events fired; now the loop always visits all ~1,000 rows. On live C111 all active rows have assigned neighborhoods (so 0 calls occur), but if a batch of unassigned citizens is ever ingested, it will trigger 1 uncached `getDataRange().getValues()` per unassigned citizen.

---

## Hunt 2 — Downstream Readers of `S.microEvents`, `S.eventsGenerated`, `S.neighborhoodDriftEvents`

| Field | Writers | Downstream Readers | Small-Count Assumption / Risk |
| :--- | :--- | :--- | :--- |
| `S.microEvents` | `phase04-events/generateGenericCitizenMicroEvent.js:667` (`eventsCreated`) | **None** (`0` readers in `phase*/`, `utilities/`, `scripts/`; confirmed in `docs/engine/ENGINE_STUB_REVERSE.md:253`). Excluded from `CHECKPOINT_SUMMARY_FIELDS` (`phase10-persistence/cycleCheckpoint.js:30-35`). | **None.** Dead summary scalar. |
| `S.neighborhoodDriftEvents` | `phase05-citizens/runNeighborhoodEngine.js:372, 691` (array of `{ popId, name, neighborhood, tier, event, cycle }`) | **None** (`0` readers in `phase*/`, `utilities/`, `scripts/`; confirmed in `docs/engine/ENGINE_STUB_REVERSE.md:265`). Excluded from `CHECKPOINT_SUMMARY_FIELDS` (`phase10-persistence/cycleCheckpoint.js:30-35`). | **None.** Dead summary array (~20–40 small objects in RAM during Cycle, discarded at exit). |
| `S.eventsGenerated` | `runNeighborhoodEngine.js:621, 681`, `generateGenericCitizenMicroEvent.js:652`, plus 11 other Phase 4/5 event generators | 1. `phase06-analysis/applyShockMonitor.js:184-198, 286-287, 317`<br>2. `phase06-analysis/applyPatternDetection.js:110-111, 142-147`<br>3. `phase02-world-state/applyCityDynamics.js:753-773, 944`<br>4. `phase09-digest/finalizeCycleState.js:62, 651`<br>5. `phase09-digest/applyCompressionDigestSummary.js:41`<br>6. `phase01-config/godWorldEngine2.js:1972` (`Riley_Digest` col E)<br>7. `scripts/buildWorldSummary.js:353, 362, 565` | **None (self-calibrating).** See detailed verification below. |
| `S.neighborhoodPulse` *(indirect via `recordPulse_`)* | `generateGenericCitizenMicroEvent.js:650` (`recordPulse_(S, neighborhood, tag, null, pick)`) | 1. `phase08-v3-chicago/v3NeighborhoodWriter.js:82-101, 525-531`<br>2. `phase07-evening-media/applyStorySeeds.js:903` | **Safe.** `v3NeighborhoodWriter.js:83, 99` normalizes by `denom = Math.max(entry.events, PULSE_REF_EVENTS)` (`PULSE_REF_EVENTS = 8`), so higher event counts per hood normalize to average directional lean rather than scaling unboundedly. |

### Verification of `S.eventsGenerated` Analytical Readers

1. **`applyShockMonitor.js` (`phase06-analysis/applyShockMonitor.js:184-198`):**
   - Compares `eventsNow` against `prevEvents` (`S.previousCycleState.events`, floored at `40` via `eventRef = Math.max(prevEvents, 40)` at `:184`).
   - Requires `eventDelta >= Math.max(10 + eventThresholdMod, Math.round(0.30 * eventRef))` (`:194`, i.e. a **+30% single-Cycle jump**) to set `shockReasons.push("event-spike")`, and explicitly suppresses regime shifts if `eventsNow / prevEvents >= 2.5` (`:190`).
   - With total `S.eventsGenerated` already at **~600–750/Cycle** (and total stamped lines at ~2,253 on bench C112 per `docs/plans/2026-10-18-event-engines-move-dials.md:208`), adding +10 to +65 events from Task 13 is a **+1.5% to +10% delta** — well below the +30% (`~180–225` events) shock threshold.
2. **`applyPatternDetection.js` (`phase06-analysis/applyPatternDetection.js:110-111, 142-147`):**
   - Uses a 7-cycle rolling median `eventBaseline = Math.max(median_(eventsArr), 50)` (`:111`) and relative multipliers (`elevatedLow = 1.12x`, `microWaveThreshold = 1.20x`, `crisisSpike = 1.50x`). A +1.5% to +10% increase stays inside the normal band (`0.88x–1.12x`) and adapts into the 7-cycle median within 4 Cycles.
3. **`applyCityDynamics.js` (`phase02-world-state/applyCityDynamics.js:753-773`):**
   - Computes `eX = eventsNow / obsAvg.events` (6-cycle rolling average from `S.activityObservations.history`, persisted in `finalizeCycleState.js:651`) with thresholds at `eX >= 1.25` (`+0.02` publicSpaces / `+0.01` communityEngagement) and `eX >= 1.50`. Unaffected by a ≤10% shift.

---

## Hunt 3 — Per-Citizen Chance Math & Volume Estimate (~1,000 Citizens)

### 3.1 Cohort Sizes on `Simulation_Ledger` (~1,001 rows)

- **`runNeighborhoodEngine.js` (`phase05-citizens/runNeighborhoodEngine.js:426-441`):**
  - Filters: active status (`:427-432`), `clockMode === "ENGINE"` (`:434`), `!isUni && !isMed && !isCiv` (`:435`), **`tier === 3 || tier === 4` only** (`:440`).
  - Qualifying cohort: **$N_{\text{hood}} \approx 780$ citizens** (range 750–820).
- **`generateGenericCitizenMicroEvent.js` (`phase04-events/generateGenericCitizenMicroEvent.js:500-509`):**
  - Filters: active status (`:501-505`), `mode === "ENGINE"` (`:508`), `!isUni && !isMed && !isCiv` (`:509`), **all Tiers 1–4**.
  - Qualifying cohort: **$N_{\text{gen}} \approx 840$ citizens** (~60 Tier 1–2 + ~780 Tier 3–4).

---

### 3.2 `runNeighborhoodEngine.js` Chance & Volume Math

- **Per-citizen `driftChance` formula (`phase05-citizens/runNeighborhoodEngine.js:461-526`):**
  - Base: `0.02` (`:461`)
  - Season (`:464-466`): `+0.005` (Spring/Summer), `+0.01` (Winter), `+0.00` (Fall)
  - Weather (`:469-473`): `+0.015` if `precip >= 0.3`, `+0.01` if `wind >= 20`, `+0.01` if `impact >= 1.3`
  - Chaos (`:476`): `+0.015` if `S.worldEvents.length > 0` (**true on virtually every Cycle**)
  - Sentiment (`:479-480`): `+0.01` if `|sentiment| >= 0.4`
  - Cultural/Community (`:483-487`): `+0.005` to `+0.01` if `culturalActivity >= 1.3` or `communityEngagement >= 1.3`
  - Neighborhood dynamics (`:490-496`): `+0.005` if `retailVitality >= 1.3` or `sentiment >= 0.3`, `+0.008` if `nightlifeVolume >= 1.4`
  - Calendar (`:499-513`): `+0.01` (`firstFriday`), `+0.015` (`creationDay`), `+0.005` (`holiday !== 'none'`)
  - Dial multiplier (`:518-521`): `driftChance *= dialBands.mult.outabout` (`[0.5, 1.5]`, mean `~1.0`), clamped to `[0.005, 0.12]`.

| Cycle Scenario | Mean `driftChance` | Raw Hits ($780 \times \bar{p}$) | Post-Gate Admission Rate (`:613-644`) | **Net Emitted Lines / Cycle** |
| :--- | :---: | :---: | :---: | :---: |
| **Quiet / Normal Cycle** (`0.02` base + `0.015` chaos + `0.005` season + `~0.005` hood = `0.045`) | `~4.5%` | **~35 raw hits** (range 27–43) | **~30%–45%** (60%+ of draws in steady/mixed/bespoke pools hit `d: null` at `:544, 638`) | **~11–16 lines** *(was 6)* |
| **Active / Rainy / Event Cycle** (`+0.015` rain + `+0.01` sentiment + `+0.01` FF/holiday = `0.080`) | `~7.5%` | **~58 raw hits** (range 48–70) | **~40%–55%** (extra signed weather/FF context entries in `eventPool` at `:568-601`) | **~23–34 lines** *(was 6)* |
| **If `textureSigned_` (`:544`) were fixed to exclude `d: null` when `dir` is set** | `4.5%–7.5%` | ~35–58 raw hits | **~60%–75%** (all 13 moving-hood draws succeed; 9 steady hoods emit on pressure/context) | **~22–42 lines** |

- **Assessment for `runNeighborhoodEngine.js`:** The per-citizen `0.02` base rate produces a **very sane volume** (~11–34 lines/Cycle today; ~22–42 lines/Cycle if `:544` stops diluting moving-hood pools with `d: null`). However, because `:544` keeps unsigned lines in `eventPool` with `d: null`, more than half of citizens who win their RNG roll in a moving neighborhood are silently dropped at `:638-643`.

---

### 3.3 `generateGenericCitizenMicroEvent.js` Chance & Volume Math

- **Per-citizen `chance` formula (`phase04-events/generateGenericCitizenMicroEvent.js:514-560`):**
  - Base (`:515-517`): Tier 1 → `0.50`, Tier 2 → `0.25`, Tier 3–4 → `0.10` *(unreverted `CATCH-UP` values; footer `:680` says `0.03`)*
  - Thin-history boost (`:521-524`): `lineCount <= 2` → `×5`; `<= 5` → `×3`; `<= 10` → `×1.5`
  - Cycle modifiers (`:527-553`): `+0.015` chaos (`worldEvents.length > 0`), `+0.01` weather, `+0.01` sentiment, `+0.005..0.015` calendar/sports/culture
  - Dial multiplier & clamp (`:556-558`): `chance *= dialBands.mult.outabout`, clamped to **`[0.005, 0.12]`**.

| Mode / Configuration | Mean `chance` across 840 citizens | Raw `hit(chance)` Triggers | Pool / Gate Bottleneck | **Net Emitted Lines / Cycle** |
| :--- | :---: | :---: | :--- | :---: |
| **Current Code as Committed/Diffed** (`0.50/0.25/0.10` base + `uniquePickGlobal_` citywide dedupe) | `~11.0%` (Tier 1–2 pinned at `12.0%`; Tier 3–4 mean `~10.8%`) | **~92 raw hits** (~7 Tier 1–2 + ~85 Tier 3–4) | **Hard bottleneck at `uniquePickGlobal_` (`:456-482`):** `basePool` (~10–18 strings) + 12 mapped hoods × 3 strings (minus 9 steady hoods & unsigned strings dropped at `:618-624`) | **~16–30 lines** *(barely changes from `EVENT_LIMIT = 25`; first ~150 ledger rows take almost all `basePool` events)* |
| **If `uniquePickGlobal_` is made per-citizen, keeping `0.50/0.25/0.10` `CATCH-UP` rates** | `~11.0%` | **~92 raw hits** | ~15%–25% of draws pick an unsigned string (`chaosPool`, unsigned `prevEvePool`, steady-hood `neighborhoodPool`) and skip at `:618-624` | **~70–78 lines** *(~3× the old cap because `312d0b0e` base rates are still 3.3×–16× inflated)* |
| **If `uniquePickGlobal_` is made per-citizen AND base rates revert to documented `0.03` (Tier 3–4) / `0.015` (Tier 1–2)** | `~4.8%` (`0.03` base + `~0.018` mods × `outabout`) | **~40 raw hits** | ~15%–25% unsigned skip at `:618-624` (or `0%` if unsigned strings are signed/excluded) | **~30–40 lines** *(balanced across all 1,000 ledger rows)* |

---

## Hunt 4 — Apps Script Run-Time Risk (~230 s of 360 s Limit)

### 4.1 Phase-by-Phase Execution Cost of Removing Both Caps

| Phase / Function | File : Lines | Current Behavior | Impact of Removing `EVENT_LIMIT` (6 & 25) | Added Wall Time |
| :--- | :--- | :--- | :--- | :---: |
| **Phase 4** `generateGenericCitizenMicroEvents_` | `phase04-events/generateGenericCitizenMicroEvent.js:492-674` | Iterates `ledger.length` (~1,000 rows) in V8 RAM; `getCitizenDialBands_` cached per `popId` on `ctx._dialBandCache` (`utilities/compressLifeHistory.js:1246`). Appends one `queueBatchAppendIntent_` (`:663`). | Loop already visited ~250–1,000 rows in memory. Visiting all 1,000 rows adds ~700 in-memory iterations + string formatting. | **< 0.05 s** |
| **Phase 5** `runNeighborhoodEngine_` | `phase05-citizens/runNeighborhoodEngine.js:419-695` | Iterates `citizens.length` (~1,000 rows) in V8 RAM; `hoodCrimeBar_` cached on `ctx._hoodCrimeBar` (`:201`). Calls `queueAppendIntent_("LifeHistory_Log", ...)` (`:656`) per event. | Visits ~700 additional rows in RAM; queues ~10–30 additional `kind: 'append'` intent objects in `ctx.persist.updates`. | **< 0.05 s** |
| **Phase 9** `compressLifeHistory_` | `utilities/compressLifeHistory.js:500-728` | Scans `LifeHistory` cell of all ~1,000 rows in RAM, folds lines past watermark into `LifeHistory_Compressed`, updates `ctx._dialBandCache`. | Parsing ~10–60 additional single-line entries in RAM. Zero Sheet API calls in Phase 9. | **< 0.05 s** |
| **Phase 10** `commitSimulationLedger_` & `executePersistIntents_` | `phase10-persistence/commitSimulationLedger.js:25-38`<br>`phase10-persistence/persistenceExecutor.js:413-458` | `Simulation_Ledger` writes in **1** full-sheet `setValues` call. All `LifeHistory_Log` `queueAppendIntent_` and `queueBatchAppendIntent_` items are coalesced by `executeSheetIntents_` (`:425-456`) into a **single** `allRows` array and written in **1** `sheet.getRange(...).setValues(paddedRows)` call. | **0 additional `SpreadsheetApp` API calls.** The single batch `setValues` on `LifeHistory_Log` writes ~2,270–2,310 rows instead of ~2,250 rows (+1%–3% payload). | **< 0.30 s** |
| **Phase 10** `checkpointGate_` / `saveCheckpoint_` | `phase10-persistence/cycleCheckpoint.js:30-35, 197-223` | If `elapsedMs >= 240000` (`godWorldEngine2.js:862`), serializes `ctx.persist.updates` to `_CycleCheckpoint`. | Neither `S.microEvents` nor `S.neighborhoodDriftEvents` is in `CHECKPOINT_SUMMARY_FIELDS` (`:30-35`). ~20 extra append intents in `ctx.persist.updates` add ~2.5 KB of JSON. | **< 0.05 s** |
| **Phase 11** `maintainLifeHistoryLog_` | `utilities/archiveLifeHistory.js:44, 71-235` | Every Cycle: `stampLifeHistorySimClock_` reads 2 cols × up to 8,000 tail rows (`:101`). When `LifeHistory_Log` exceeds `CYCLE_TRIGGER_ROWS = 12000` (`:44`), `runArchive_` reads full sheet, appends overflow to `LifeHistory_Archive`, and rewrites/deletes rows (`:153-234`). | Steady-state Cycle: **+0 s**. Archive-trigger Cycle: +20 to +65 rows/Cycle on top of ~2,250 rows/Cycle increases `runArchive_` trigger frequency by ~1%–3%. | **~0.0 s steady-state** |

**Total steady-state Cycle runtime impact: `< 0.5 seconds`** (well inside the ~130 s headroom between ~230 s and the 360 s Apps Script limit, and further protected by `checkpointGate_(ctx, 240000)` at `phase01-config/godWorldEngine2.js:862`).

### 4.2 Two Specific Runtime Traps to Note

1. **Latent Sheet-Read-in-Loop Trap (`phase05-citizens/runNeighborhoodEngine.js:349, 448-456`):**
   - As noted in §1.4, `pickDemographicNeighborhood_` (`:450`) is called inside the per-citizen loop whenever `neighborhood === "" || neighborhood === "Oakland, CA"`. Inside `pickDemographicNeighborhood_`, line `349` calls `getNeighborhoodDemographics_(ss)` (`utilities/ensureNeighborhoodDemographics.js:134-140`), which executes `ss.getSheetByName('Neighborhood_Demographics').getDataRange().getValues()` **without caching**.
   - Under `EVENT_LIMIT = 6`, the loop exited early; without the cap, it scans all 1,000 rows. If a future citizen batch is added with blank `Neighborhood` cells (say 50 rows), those 50 uncached `getDataRange().getValues()` calls would add **~10–25 seconds** of Apps Script IPC latency. Caching `getNeighborhoodDemographics_(ss)` on `ctx._hoodDemographics` eliminates the risk.
2. **Per-Citizen `queueAppendIntent_` vs. Single `queueBatchAppendIntent_` (`phase05-citizens/runNeighborhoodEngine.js:656` vs. `phase04-events/generateGenericCitizenMicroEvent.js:663`):**
   - `generateGenericCitizenMicroEvent.js:647, 663` collects rows in `logRows` and queues a single `queueBatchAppendIntent_("LifeHistory_Log", logRows, ...)` with `inWorldStamp_(ctx)` precomputed once (`:489`).
   - `runNeighborhoodEngine.js:656` (and `emitPressureTag_` at `utilities/citizenDialMap.js:551`) queues an individual `queueAppendIntent_("LifeHistory_Log", [ctx.now, ...])` per citizen, which `executeSheetIntents_` (`phase10-persistence/persistenceExecutor.js:444-446`) then normalizes via `isWallClockStamp_` + `inWorldStamp_(ctx)` on each row. Coalescing still merges the Sheet write into one `setValues` call, so the Apps Script API cost is identical, but batching `logRows` in `runNeighborhoodEngine.js` would keep `ctx.persist.updates` compact for `_CycleCheckpoint` serialization (`phase10-persistence/cycleCheckpoint.js:201`).

---

## Summary Table of Findings

| # | Severity | File : Lines | Finding |
| :-: | :---: | :--- | :--- |
| **1** | **HIGH** | `phase04-events/generateGenericCitizenMicroEvent.js:134-195, 456-482, 599-626` | `uniquePickGlobal_` deduplicates strings **citywide** (`cycle + "|" + cand`) instead of per-citizen (`popId`), `neighborhoodPool` is missing 10 of 22 neighborhoods, and `uniquePickGlobal_` marks strings used **before** the `:618` `engine.299` sign check. Result: `basePool` (~10–18 strings) still exhausts in the first ~150 rows of `Simulation_Ledger`, and late-ledger citizens in unmapped or `'steady'` neighborhoods still get 0 events. |
| **2** | **HIGH** | `phase04-events/generateGenericCitizenMicroEvent.js:511-525, 558, 680` | Unreverted temporary `CATCH-UP` rates from commit `312d0b0e` (`0.50` Tier 1, `0.25` Tier 2, `0.10` Tier 3–4, plus `×5/×3/×1.5` thin-history multiplier) remain active, contradicting `:511-513` and `:680` (`0.03` base) and pinning all Tier 1–2 citizens at the `0.12` clamp regardless of `outabout`. |
| **3** | **MEDIUM** | `phase05-citizens/runNeighborhoodEngine.js:538-548, 603, 637-644` | `textureSigned_` pushes unsigned strings into `eventPool` with `d: null` (`:544`) even when `dir` is `'up'` or `'down'`. ~60%–75% of winning `rng() < driftChance` rolls pick a `d: null` entry and get discarded at `:638-643` (`S.engine299.noDial`). |
| **4** | **MEDIUM** | `phase05-citizens/runNeighborhoodEngine.js:612-625`<br>`utilities/citizenDialMap.js:482, 535` | `emitPressureTag_('hood')` runs before the `:638` dial gate and shares the `'housing'` slot with `'rent'`. Without `EVENT_LIMIT = 6`, `'hood'` pressure in Phase 5 (`godWorldEngine2.js:634`) claims the `'housing'` pressure slot across all qualifying rows before `'rent'` pressure runs in `Phase5-Household` (`:646`) / `Phase5-GenerationalWealth` (`:670`). |
| **5** | **LOW** | `phase05-citizens/runNeighborhoodEngine.js:349, 450`<br>`utilities/ensureNeighborhoodDemographics.js:134-140` | `pickDemographicNeighborhood_` calls `getNeighborhoodDemographics_(ss)` (`sheet.getDataRange().getValues()`) inside the per-citizen loop without caching on `ctx`. Zero cost while all rows have assigned hoods, but a latency trap if unassigned rows enter the ledger. |
| **6** | **INFO** | `phase06-analysis/applyShockMonitor.js:184-198`<br>`phase06-analysis/applyPatternDetection.js:110-147`<br>`phase02-world-state/applyCityDynamics.js:753-773`<br>`phase10-persistence/persistenceExecutor.js:413-458` | Downstream readers of `S.eventsGenerated` use rolling relative baselines (`+30%` spike threshold on ~600–750 events; `1.12x–1.50x` 7-cycle median), `S.microEvents` and `S.neighborhoodDriftEvents` have 0 readers, and `LifeHistory_Log` writes are coalesced into a single batch `setValues` call (< 0.5 s runtime impact). |
