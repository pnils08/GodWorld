# Review — `engine.365` (`47ce31390`, `fa507b96b`, `92ce711ce` hunk): arrests & incidents read right

- **Brief:** `docs/for-claude-review/2026-11-24-es-brief-agy-engine365.md`
- **Plan:** `docs/plans/2026-11-24-arrests-read-right.md`
- **Commits reviewed:** `47ce31390` (Task 2: arrests carry + OARI diversion subtraction), `fa507b96b` (Task 1: resident-scaled `incidentCount`), `92ce711ce` (`careJusticeService.js` carry type check)
- **Bench status at review time:** `output/engine-sheet/2026-11-24-e365/bench.log` had synced from live and reached `clearfire 118` (fire 1/2 results not yet landed)
- **Verdict:** **SHIP-WITH-FIXES** (no live runtime blocker; 3 code hardening fixes + Task 4 resident-scaling unit tests + pending bench readback)

---

## Findings

### 1. `phase03-population/updateCrimeMetrics.js:508` vs `:481` — `totalPop` concatenates string demo fields while `crimeCityMeanResidents_` parses numbers
- **Pointer:** `phase03-population/updateCrimeMetrics.js:508` vs `phase03-population/updateCrimeMetrics.js:481`, `utilities/ensureNeighborhoodDemographics.js:165-167`.
- **Input → wrong output:** If `calculateNeighborhoodCrime_` (via `updateCrimeMetrics_Phase3_`) receives a `demographics` object with numeric strings (`{ students: '200', adults: '800', seniors: '100' }`), `crimeCityMeanResidents_` (`:481`) coerces `(Number(d.students) || 0) + ...` → `1100`, while `:508` computes `(demo.students || 0) + (demo.adults || 0) + (demo.seniors || 0)` → `'200800100'`. Passing `totalPop = '200800100'` into `crimeResidentFactor_` (`:611`, `:473`) returns `'200800100' / 1100 ≈ 182545.55`, exploding `incidentCount` (and corrupting `unemploymentRate` / `youthRatio` at `:509-510`).
- **Live exposure:** Low on live (`getNeighborhoodDemographics_` at `utilities/ensureNeighborhoodDemographics.js:165-167` parses `Number(...) || 0`), but live-trap for any Node test or caller passing beats/raw-sheet strings. Fix: use `(Number(demo.students) || 0) + (Number(demo.adults) || 0) + (Number(demo.seniors) || 0)` at `:508`.

### 2. `phase03-population/updateCrimeMetrics.js:243, 477-487` — `Phase3-Crime` throw under `safePhaseCall_` degrades Phase 5/7/8 crime context and skips `Phase3-Crime` RNG draws
- **Pointer:** `phase03-population/updateCrimeMetrics.js:243, 477-487`, `phase01-config/godWorldEngine2.js:693-694, 2414-2415`.
- **Input → wrong output:** `Phase3-Crime` runs **before** `Phase3-NeighborhoodDemo` (`godWorldEngine2.js:693-694`). If a new hood is added to `Neighborhood_Map` before a `Neighborhood_Demographics` row exists for it (or a row has `students + adults + seniors <= 0`), `crimeCityMeanResidents_` (`:482`) throws inside `safePhaseCall_`:
  - `S.crimeMetrics` stays `undefined` and `Phase3-Crime`'s `154` `rng()` draws (`22 × 7`) are skipped, shifting downstream RNG.
  - `Phase4-CareJusticeDemand` (`careJusticeService.js:167-168`), `Phase4-ChaosCars` (`chaosCarsEngine.js:960`), and `Phase10-CareJusticeCensus` (`buildCyclePacket.js:1120`) throw (no care demand, no chaos cars, no census rows); `Phase5-Judicial` (`cityCourtRevenue_`, `judicialLifecycle.js:509`) skips court revenue (`out.unavailable`); `Phase10-CycleState` (`finalizeCycleState.js:654-668`) skips saving both carries.
  - `Phase3-NeighborhoodDemo` (`updateNeighborhoodDemographics.js:447, 710`), `Phase5-CitizenEvents` (`generateCitizensEvents.js:711`), `Phase5-Youth` (`runYouthEngine.js:370`), `Phase5-CivicModeEvents` (`:84`), `Phase5-MediaModeEvents` (`:80`), `Phase7-StorySeeds` (`applyStorySeeds.js:254`), and `Phase8-NeighborhoodMap` (`v3NeighborhoodWriter.js:518`) silently fall back to empty `{}` crime context.
- **Note:** `careJusticeService.js:203-214` already threw on missing/zero-resident hoods for care demand/census/court; the new throw in `Phase3-Crime` moves the failure one phase earlier so `S.crimeMetrics` also disappears for Phases 5/7/8. Additionally, `!(n > 0)` at `:482` does not reject `Infinity` (`Number(Infinity) || 0` passes `> 0`, then throws in `crimeResidentFactor_` `:471`).

### 3. `phase04-events/careJusticeService.js:240, 256` — Fractional `charges` not rejected before `charges - oariDiversions`
- **Pointer:** `phase04-events/careJusticeService.js:240, 250-256`.
- **Input → wrong output:** `careJusticeNumber_(m.incidentCount, 'incidentCount', name, false)` checks finite `>= 0` but allows non-integers. If a caller supplies fractional `charges = 0.6` in an OARI hood with `careJusticeOariEligibleShare = 1` and `diversionProbability = 1`, `oariEligible = Math.round(0.6) = 1`, `oariDiversions = 1`, and `charges - oariDiversions = -0.4` enters `careJusticeAdmitSplit_` (`:256`), producing negative `judicialIntakes` / `arrestCarryOut` (whereas `chaosCarsEngine.js:910-914` enforces safe non-negative integer `charges`). On live, `updateCrimeMetrics.js:695` always emits integer `incidentCount`, so live is safe; enforcing integer `charges` at `:240` aligns with `chaosCarsEngine.js`.
- **Minor sibling note:** `phase09-digest/finalizeCycleState.js:664-668` has no `else` log on `arrestCarry` when `S.careJusticeDemand` is absent (unlike `admitCarry` at `:660-662`), and shares the pre-existing `ctx.mode.dryRun`-only guard at `:593` (noted under `engine.364` F2 / `92ce711ce`).

### 4. Task 4 test gaps (no unit tests yet for `fa507b96b` resident scaling, and carry persistence awaits bench completion)
- `scripts/crimeCarryForward.test.js` passes (`55/55`), but uses equal-population `flatDemo` in all `incidentCount` / load tests and checks only `propertyLevel` / `violentLevel` in Test 8 (`LIVE_DEMO`). No offline unit test exercises `crimeResidentFactor_`, `crimeCityMeanResidents_`, `incidentParts`, scaling level + noise while keeping per-event additions whole, or throwing on a 0-resident / missing hood.
- `scripts/careJusticeService.test.js:33` (`makeDemandFixture_`) still stamps `methodVersion: 'demand-v1'` (fixture only; `runCareJusticeDemand_` emits `'demand-v3'`, asserted at `:194`).
- `scripts/careJusticeService.test.js:217-234` (`365a/b/c`) passes and genuinely proves diversion subtraction before clearance (`365a` moves Fruitvale from `1` arrest to `0` while non-OARI `SYNTHETIC_HOOD_01` stays `1`), multi-cycle carry (`365b`), and non-number/out-of-range carry rejection (`365c`). Round-trip persistence of `PREV_ARREST_CARRY_JSON` (`seedCarriedArrestCarry_` / `compactArrestCarry_`) has no unit test and awaits `output/engine-sheet/2026-11-24-e365/bench.log`.

---

## Attack Checklist Verification

### 1. Readers of `incidentCount` / `Crime_Metrics.IncidentCount` and city sums
- **Enforcement load & clearance (`phase03-population/updateCrimeMetrics.js:246-253, 667-679, 1183-1193`):** `predictedCityIncidents` sums `prevM.incidentCount` over `neighborhoods`; `cityLoad.loadRatio` feeds `baseResponse` (`:668`) and `clearanceReading` (`:674`), **never** `levelProperty`, `levelViolent`, or `incidentCount`. Neither `clearanceRate` nor `judicialIntakes` feeds back into `incidentCount` — no multi-cycle runaway or drift loop.
- **Story-seed thresholds & reporting gap (`phase03-population/updateCrimeMetrics.js:1054-1074`, `phase07-evening-media/applyStorySeeds.js:256-257, 828-851`):** `residentFactor = residents / mean` averages `1.0` across the 22 hoods, keeping the city sum near pre-change levels (~133 → ~136 on C117 inputs per plan Changelog). `trueIncidentCount` stays ~130+ (well above `> 10` / `> 5`); `reportingGap` (`BASE_REPORTING_RATE - reportedN / trueN`) shifts by at most ~±0.01 from small-hood integer rounding; `enforcementCapacity` (`capacity / (total * 0.35)`) remains ~1.39–1.42 (`> 1.3` band); `city.incidentTrend` (`total / prev`) remains ~1.02 on the transition Cycle.
- **Cop-car named pass (`phase04-events/chaosCarsEngine.js:417, 909-914`, `utilities/chaosCarsConfig.js:178`):** `incidentCount = Math.max(0, Math.round(baseIncidents))` (`updateCrimeMetrics.js:686, 695`) is always a non-negative integer; `runChaosNamedPass_` safe-integer check holds.
- **Slices, Civis journal, workers (`scripts/buildSafetySlice.js:31-51, 82`, `scripts/civisJournal.js:215-218`, `scripts/buildCivicOfficeSlice.js:315, 321`, `scripts/cron-work-wake.js:140`, `scripts/workerWake.js:355, 418`):** All read `IncidentCount` verbatim (with `buildSafetySlice.js:82` matching `careJusticeService.js` `"charges"`). On the first Cycle after deploy, small hoods show one-time negative deltas vs prior Cycle and big hoods show small positive deltas (`buildSafetySlice.js:45`, `civisJournal.js:218`), as intended.

### 2. RNG draw count and order (`phase03-population/updateCrimeMetrics.js:645-662`)
- `crimeCityMeanResidents_` (`:243`) and `crimeResidentFactor_` (`:611`) consume **zero** `rng()` draws.
- The 5 variance draws (`:655-661`, preceded by 2 clearance draws at `:646-647` when `prev` exists) stay in exact order; `:661` multiplies the rounded draw `Math.round((rng() - 0.5) * 4)` by `residentFactor` without changing the draw. Verified by `crimeCarryForward.test.js` Tests 6a (`154 = 22 × 7`) and 6b (`110 = 22 × 5`).

### 3. The hood list & throws (`phase03-population/updateCrimeMetrics.js:218, 243, 469-487`)
- `neighborhoods = crimeIterationHoods_(S)` (`utilities/ensureCrimeMetrics.js:79-85`) returns `S.canonHoods.list` (populated by `loadCanonNeighborhoods_` at `phase01-config/canonNeighborhoodLoader.js:107` from `Neighborhood_Map` column `Neighborhood`, excluding `ChildAreas` and stale non-map hoods), or `Object.keys(S.neighborhoodState)`.
- `Phase3-Crime` throw cascade under `safePhaseCall_` documented in Finding 2.

### 4. Arrests, carry invariant, `cityCourtRevenue_`, census identity, `0.5` start (`phase04-events/careJusticeService.js:240-296`, `phase05-citizens/judicialLifecycle.js:504-525`)
- **Non-negative base:** For integer `charges >= 0`, `oariShare` ∈ `[0, 1]`, `diversionProbability` ∈ `[0, 1]`, `0 <= oariDiversions <= oariEligible <= charges`, so `charges - oariDiversions >= 0` (see Finding 3 for fractional `charges` guard).
- **`[0, 1)` carry invariant:** `careJusticeAdmitCarryIn_` (`careJusticeService.js:38-46`, hardened by `92ce711ce`) rejects non-numbers, `NaN`/`Infinity`, `< 0`, and `>= 1`. `careJusticeAdmitSplit_` (`:48-53`) returns non-negative integer `intakes` and `carryOut` ∈ `[0, 0.999999]`. `compactArrestCarry_` (`finalizeCycleState.js:537-551`) enforces the same `[0, 1)` bound on save.
- **`cityCourtRevenue_` & census identity:** `cityCourtRevenue_` (`judicialLifecycle.js:517-522`) reads non-negative integer `demand.hoods[h].judicialIntakes` (`other = Math.max(0, cleared - tracked)`). `careJusticeOtherResident_` (`careJusticeService.js:314-325`) preserves `total === tracked + other` (`cityRevenue.test.js` 105/105, `careJusticeCensus.test.js` 102/102, `judicialLifecycle.test.js` 157/157).
- **First Cycle (`0.5` start):** Non-OARI hoods (`oariDiversions = 0`) compute `Math.floor(charges * clearance + 0.5) === Math.round(charges * clearance)`; OARI hoods (`oariDiversions > 0`) compute `Math.round((charges - oariDiversions) * clearance)`, subtracting diversions before clearance as ruled.

### 5. Silent fallbacks / weakened checks / test integrity
- `seedCarriedArrestCarry_` (`loadPreviousEvening.js:540-563`) logs loudly on missing, unparseable, or `.hoods`-missing `PREV_ARREST_CARRY_JSON`.
- `92ce711ce` tightened `careJusticeAdmitCarryIn_` to `typeof v !== 'number'` (verified by `careJusticeService.test.js` `364c` and `365c`).
- All 7 offline suites run in this session pass without weakened assertions; only Task 4 resident-scaling tests and the in-flight bench run remain.

---

## Checks Run (after `fa507b96b` / `87d311ba8`)

- `node --check phase01-config/loadPreviousEvening.js phase03-population/updateCrimeMetrics.js phase04-events/careJusticeService.js phase09-digest/finalizeCycleState.js` — **exit 0 (`SYNTAX_OK`)**
- `node scripts/crimeCarryForward.test.js` — **55 passed, 0 failed**
- `node scripts/hoodIdentityRemainder.test.js` — **38/38 passed**
- `node scripts/careJusticeService.test.js` — **29 passed, 0 failed**
- `node scripts/careJusticeCensus.test.js` — **102 passed, 0 failed**
- `node scripts/cityRevenue.test.js` — **105 passed, 0 failed**
- `node scripts/judicialLifecycle.test.js` — **157 passed, 0 failed**
- `node scripts/beatSlices.test.js` — **PASS**

---

## Attached Wiring Cards

Generated via `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: <name>"` (`127/127` engine phase files opened):

```text
WIRING CARD — calculateNeighborhoodCrime_ (function)   map: 2026-11-24 / 179 files

DEFINITION
  phase03-population/updateCrimeMetrics.js:489  function calculateNeighborhoodCrime_(neighborhood, profile, demo, prev, context, events, advanced, rng)   v1.4 (engine.237, S470)

PHASE POSITION
  production entry : Phase3-Crime @ godWorldEngine2.js:693  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase3-Crime @ godWorldEngine2.js:2414 — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (1)
  phase03-population/updateCrimeMetrics.js:262  newMetrics[hood] = calculateNeighborhoodCrime_(

S FIELDS
  NOT FOUND (function takes all data as parameters; does not access ctx.summary or S directly)

OTHER CTX
  NOT FOUND (function does not access ctx.* fields; all data passed as parameters)

WRITE PATH
  NOT FOUND (function is pure: returns object, makes no sheet writes, no queued intents)
  Math.random @ NOT FOUND

TABS
  NOT FOUND (function makes no tab references)

OPEN WORK
  docs/plans/2026-09-21-care-and-justice-system.md:459  Phase3-Crime publishes S.crimeMetrics.byNeighborhood[h], each hood the return of calculateNeighborhoodCrime_
  docs/plans/2026-09-21-safety-lever.md:107  Crime read and call; calculateNeighborhoodCrime_ at :454; causes/enforcement at :485–538, reversion/clamp at :540–546
  docs/plans/2026-11-24-arrests-read-right.md:31  Incidents: updateCrimeMetrics.js calculateNeighborhoodCrime_: (propertyLevel + violentLevel) / 2 / 5.5, then weather, per-event additions, noise, one rounding. No population term.

HISTORY
  fa507b96b engine.365 Task 1: a hood's incidents follow its residents — the level term and the noise × residents / the city's mean hood
  8382a4e80 engine.243: a crisis gets a name, an end the newsroom can see, and a city that remembers it
  1c7af1235 engine.242c fix: quality of life uses a true median and keeps one measure's spread
  ff949ab01 engine.242c: a hood's quality of life is read from its own measurables, and speaks in its cause
  2210b3063 engine.237 fix-up: the authored crime profile table leaves the per-cycle path entirely
  a4d0de30e engine.235: persist the engine's crime read — Crime_Metrics Trend / Hotspot / PressureRatio + packet trend/headroom
```

```text
WIRING CARD — runCareJusticeDemand_ (function)   map: 2026-11-24 / 179 files / 1792 functions

DEFINITION
  phase04-events/careJusticeService.js:164  function runCareJusticeDemand_(ctx)   demand-v3 (:230)

PHASE POSITION
  production entry : Phase4-CareJusticeDemand @ godWorldEngine2.js:706  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase4-CareJusticeDemand @ godWorldEngine2.js:2427 — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS
  phase01-config/godWorldEngine2.js:706  safePhaseCall_(ctx, 'Phase4-CareJusticeDemand', function() { runCareJusticeDemand_(ctx); })
  phase01-config/godWorldEngine2.js:2427 safePhaseCall_(ctx, 'Phase4-CareJusticeDemand', function() { runCareJusticeDemand_(ctx); })
  scripts/careJusticeService.test.js (26 test calls)

S FIELDS
  WRITE careJusticeDemand          @ :166 (delete), :295 (assign) — readers: chaosCarsEngine.js, generationalWealthEngine.js, judicialLifecycle.js, finalizeCycleState.js, buildCyclePacket.js, careJusticeAccounting.js
  READ  crimeMetrics               @ :167, :191  writers: updateCrimeMetrics.js::updateCrimeMetrics_Phase3_
  READ  neighborhoodDemographics   @ :170, :192  writers: applyCityDynamics.js::applyCityDynamics_, updateNeighborhoodDemographics.js::updateNeighborhoodDemographics_
  READ  worldPopulation          @ :173, :177  writers: godWorldEngine2.js::updateWorldPopulation_
  READ  absoluteCycle              @ :220        writers: advanceSimulationCalendar.js::advanceSimulationCalendar_
  READ  cycleId                    @ :220        writers: godWorldEngine2.js::advanceWorldTime_, v3Integration.js::v3Integration_
  READ  previousHospitalAdmitCarry @ :224        (seeded Phase 1 by loadPreviousEvening.js::seedCarriedHospitalAdmitCarry_)
  READ  previousArrestCarry        @ :227        (seeded Phase 1 by loadPreviousEvening.js::seedCarriedArrestCarry_)

OTHER CTX
  ctx.config @ :179, :180, :181, :220
  ctx.cache  @ :82 (careJusticeOariHoods_)
  ctx.ledger @ :134 (careJusticeResidentIndex_)

WRITE PATH
  none (no INTENT or DIRECT writes; Math.random: none)

TABS
  Initiative_Tracker  (via ctx.cache @ :82; columns InitiativeID, ImplementationPhase, AffectedNeighborhoods)
  Simulation_Ledger   (via ctx.ledger @ :134; columns Neighborhood, Status, POPID)

HISTORY
  47ce31390 engine.365 Task 2: arrests = whole part of (charges − OARI diverted) × clearance + the carried fraction
  92ce711ce engine.364 agy fold (SHIP-WITH-FIXES, each finding checked in the code)
  36a6c3b94 engine.364: the admission-carry summary rides the city log line
  ec37df331 engine.364 Tasks 1, 2, 4, 5: the hospital record reads right
```
