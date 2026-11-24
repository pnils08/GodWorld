# Review — `engine.364` (`ec37df331`, `36a6c3b94`, `219c118e7`): the hospital record reads right

- **Brief:** `docs/for-claude-review/2026-11-24-es-brief-agy-engine364.md`
- **Plan:** `docs/plans/2026-11-23-hospital-record-reads-right.md`
- **Commits reviewed:** `ec37df331`, `36a6c3b94`, `219c118e7`
- **Bench evidence inspected:** `output/engine-sheet/2026-11-23-e364/bench.log`, `bench3.log`, `fire3.out`, `read3.out`, `plant.js`, `read.js`
- **Verdict:** **SHIP-WITH-FIXES** (no runtime blocker for live C118; 3 targeted fixes + unit-test coverage gaps to settle)

---

## Findings

### 1. `scripts/beatSliceKit.js:587` — `careNamesByHood` still keys on `StatusNow` instead of `DischargeCycle`
- **Pointer:** `scripts/beatSliceKit.js:584-593` (called by `scripts/buildHealthSlice.js:154`).
- **Input → wrong output:**
  - Any `Hospital_Ledger` row with blank `DischargeCycle` and `StatusNow` outside `HOSPITAL_OPEN_STATES` (e.g. legacy `'active'` open-stay fixture rows, or a blank/unrecognised `StatusNow`): `buildHealthSlice.js:105-118` (`stayOpen`) includes the resident in `facts` as `"in hospital care"`, while `careNamesByHood` (`beatSliceKit.js:587`) skips them because `StatusNow` fails `/^(hospitalized|critical|serious-condition|injured|recovering)$/i`. `trailLine` (`beatSliceKit.js:551`) then prints `"tracked: tracked residents not named on this beat"` when `trackedOcc > 0` (or `"tracked: none tracked"`), contradicting the slice's own patient fact above it.
  - Conversely, when building a historical health slice for Cycle `C` from a newer `Hospital_Ledger.jsonl` where a patient was open at `C` (`AdmitCycle <= C`, `DischargeCycle > C`) and later discharged (`StatusNow: 'discharged'`), `stayOpen` (`buildHealthSlice.js:107`) treats them as open at `C` while `careNamesByHood` drops them.
- **Note:** On live current-cycle runs from C118 on, open rows hold one of the 5 `HOSPITAL_OPEN_STATES` and closed rows hold `'discharged'`/`'deceased'`, so both functions agree at live close. Still, `beatSliceKit.js:587` violates Plan §Agreed A2 (`Every reader keys on DischargeCycle whatever the stamp`). Pass `cycle` (or filter on `DischargeCycle`) to match `stayOpen`.

### 2. `phase09-digest/finalizeCycleState.js:588` & `phase01-config/loadPreviousEvening.js:164` — `replayCycle` loads the live carry and overwrites `PREV_HOSP_ADMIT_CARRY_JSON`
- **Pointer:** `phase09-digest/finalizeCycleState.js:588-592, 649-657`, `phase01-config/loadPreviousEvening.js:164`, `phase01-config/godWorldEngine2.js:2323`, `utilities/cycleModes.js:159-163`.
- **Input → wrong output:** Calling `replayCycle(cycleId)` sets `ctx.mode.replay = true` while leaving `ctx.mode.dryRun = false`:
  1. `loadCarryForwardBlob_` (`loadPreviousEvening.js:164`) sets `target = 0`, so `seedCarriedHospitalAdmitCarry_` loads the latest live `PREV_HOSP_ADMIT_CARRY_JSON` property rather than `cycleId - 1`'s carry — `replayCycle(118)` will compute C118 `hospitalIntakes` from C120's remainder if live has moved forward.
  2. `savePreviousCycleState_` (`finalizeCycleState.js:588`) gates only on `ctx.mode.dryRun` (not `ctx.mode.replay`). Because `advanceWorldTime_` (`godWorldEngine2.js:1063-1077`) also increments `ctx.summary.cycleId` when `!isDryRun`, `replayCycle` executes `saveCarryForwardBlob_(ctx, 'PREV_HOSP_ADMIT_CARRY_JSON', admitJson, snapshot.cycle)` at `:652`, overwriting live `PropertiesService` and writing to `Carry_Forward_Store`.
- **Scope note:** Pre-existing across all `PREV_*_JSON` keys in `savePreviousCycleState_`, newly relevant to `careJusticeDemand` now that `hospitalIntakes` is stateful across Cycles. Fix: gate `savePreviousCycleState_` on `ctx.mode.dryRun || ctx.mode.replay`.

### 3. `phase04-events/careJusticeService.js:41` — `careJusticeAdmitCarryIn_` coerces `false` / `[]` / whitespace to `0`
- **Pointer:** `phase04-events/careJusticeService.js:37-45`.
- **Input → wrong output:** If `PREV_HOSP_ADMIT_CARRY_JSON.hoods[hood]` ever contains `false`, `[]`, or `'   '`, `hoods[hood] === '' || hoods[hood] === null` is `false` and `Number(...)` yields `0`, passing `!isFinite(v) || v < 0 || v >= 1` silently as `carryIn = 0` instead of throwing. (Compare `careJusticeRate_` at `:8`, which checks `String(raw).trim() === ''`, and `typeof hoods[hood] !== 'number'`.)
- **Risk:** Low in normal operation because `compactHospitalAdmitCarry_` (`finalizeCycleState.js:540-542`) only writes finite numbers in `[0, 1)`.

### 4. Test coverage gaps (no unit assertions cover the new `engine.364` code paths)
- `scripts/careJusticeService.test.js:33` (`makeDemandFixture_`) still stamps `methodVersion: 'demand-v1'`, and no test exercises `S.previousHospitalAdmitCarry` (`0.5` first-fire equivalence to `Math.round`, multi-cycle carry accumulation across 2+ Cycles, or `careJusticeAdmitCarryIn_` throwing on invalid carry values).
- `scripts/cron-work-wake.test.js:73-74` tests `hospital-admissions` only when `AdmitCycle == cycle` is non-empty; the modified fallback branch (`cron-work-wake.js:108`: `adm.length ? adm : rows.filter(...)`) is untested.
- `scripts/buildLivesSlice.test.js:69` and `scripts/cronSaturdayRun.test.js:435` still represent open stays with `StatusNow: 'active'` and have no fixture rows for `StatusNow: 'hospitalized'` (open) or `StatusNow: 'discharged'` (closed).
- `scripts/beatSlices.test.js:70-73` includes only open `Hospital_Ledger` rows (no closed stay with `DischargeCycle` set to test `stayOpen` at `buildHealthSlice.js:105-108`).
- `hospitalClosedStatus_` (`phase10-persistence/buildCyclePacket.js:822-824`), `seedCarriedHospitalAdmitCarry_` (`phase01-config/loadPreviousEvening.js:534-553`), and `compactHospitalAdmitCarry_` (`phase09-digest/finalizeCycleState.js:534-546`) have no offline unit tests (covered by the sandbox bench fires instead).

---

## Attack Checklist Verification

### 1. The carry (`careJusticeService.js`, `loadPreviousEvening.js`, `finalizeCycleState.js`)
- **Integer / sign / `[0, 1)` invariant:** `careJusticeNumber_` (`careJusticeService.js:18-26`) enforces finite `sick >= 0`; `careJusticeRate_` (`:6-16`) enforces finite `admitRate` in `[0, 1]`; `careJusticeAdmitCarryIn_` (`:37-45`) enforces `[0, 1)`. `careJusticeAdmitSplit_` (`:47-52`) computes `expected = Math.round((sick * admitRate + carryIn) * 1e6) / 1e6`, `whole = Math.floor(expected)`, `carryOut = Math.round((expected - whole) * 1e6) / 1e6`. For any realistic Oakland sick count, `intakes` is a non-negative safe integer and `carryOut` is in `[0, 0.999999]`. `compactHospitalAdmitCarry_` (`finalizeCycleState.js:541`) also drops anything `!isFinite || < 0 || >= 1`.
- **Hood added / dropped mid-run:**
  - *Added hood:* `!hoods.hasOwnProperty(newHood)` → `careJusticeAdmitCarryIn_` returns `null` → starts at `CARE_JUSTICE_ADMIT_CARRY_START = 0.5`, logged in `carryFresh`, writes `demand.hospitalCarry.hoods[newHood]`.
  - *Dropped hood:* `runCareJusticeDemand_` iterates `Object.keys(crime)` (verified equal to `demographics`); dropped hood is omitted from `demand.hospitalCarry.hoods` and pruned on the next save.
- **Same-Cycle re-fire (self-ghost guard):** `assertCarryForwardPresent_` sets `ctx.carryForwardCycleId = lastCycle + 1` (`loadPreviousEvening.js:219`). `loadCarryForwardBlob_` (`:168-186`) rejects any prop stamped `>= target` and falls back to `readCarryForwardFromSheet_(ctx, 'PREV_HOSP_ADMIT_CARRY_JSON', target)`. Proven on bench fire 3 (`fire3.out:118-127`: prop stamped `119 >= 118` was `ghost-skipped`, fell back to ring).
- **`Phase4-CareJusticeDemand` throws mid-Cycle:** `runCareJusticeDemand_` deletes `S.careJusticeDemand` at entry (`careJusticeService.js:164`). `safePhaseCall_` catches the throw (`godWorldEngine2.js:706, 2427`). Downstream `Phase4-ChaosCars` and `Phase10-CareJusticeCensus` throw (0 modelled hospital intakes, no census block written for Cycle `C`). At Phase 10, `compactHospitalAdmitCarry_` returns `null` (`finalizeCycleState.js:535-536`), so `PREV_HOSP_ADMIT_CARRY_JSON` is not overwritten; `Carry_Forward_Store`'s 3-slot ring is keyed per-key (`loadPreviousEvening.js:68`), so other blobs do not evict `PREV_HOSP_ADMIT_CARRY_JSON`. Cycle `C+1` loads Cycle `C-1`'s `carryOut` — the exact unconsumed remainder from the last Cycle that ran demand (misses Cycle `C`'s lost `sick_C * admitRate`, never double-counts or compounds across skipped Cycles).
- **Dry-run:** `loadCarryForwardBlob_` sets `target = 0` (`loadPreviousEvening.js:164`) to preview with the latest carried prop; `savePreviousCycleState_` exits early at `if (isDryRun) return` (`finalizeCycleState.js:589`).
- **Replay:** See Finding 2 above.

### 2. Consumers of `demand.hoods[h].hospitalIntakes`
- **Census (`utilities/careJusticeAccounting.js`, `careJusticeService.js:284-325`):** `careJusticeOtherResident_` (`careJusticeService.js:299`) validates `hospitalIntakes` as finite `>= 0`. `careJusticeOtherWindow_` (`careJusticeAccounting.js:563-570`) sums the rolling `stay`-Cycle cohort window of non-negative integers; invariants A, B, B-split, C, and J in `validateCareJusticeCensus_` (`:340-391`) hold across week-to-week integer shifts (`bench.log` fires 1–2: 216 rows, all `complete`, `verdict: PASS`).
- **Ambulance named pass (`phase04-events/chaosCarsEngine.js:895-943`, `utilities/chaosCarsConfig.js:205`):** `runChaosNamedPass_` (`:909-914`) enforces non-negative safe integer on `record.hospitalIntakes`. `careJusticeAdmitSplit_` always emits a non-negative integer; `chaosBinomial_` draws once per hood regardless of `n === 0` vs `n >= 1`, only drawing extra picks when `k > 0`.
- **Hospital strain talk-back (`phase03-population/applyDemographicDrift.js:469-517`, `utilities/careJusticeAccounting.js:928-1000`, `phase01-config/engine94SheetContract.js:590-592`):** `hospitalStrainWindow = 8`, `hospitalStrainBand = 0.25`, `hospitalStrainGain = 0.02`. A city admission wobble of `32–37` around `34.3` is `+7.9%` max on single-Cycle intakes (and smaller on multi-Cycle rolling `BedsOccupied`), well under the `+25%` strain band.

### 3. The `discharged`/`deceased` stamp (`StatusNow`) & `PriorStatus`
- **Write path (`phase10-persistence/buildCyclePacket.js:822-824, 984-999, 1026-1044`):** `hospitalClosedStatus_(outcome)` writes `'deceased'` iff `outcome === 'deceased'` (`ev.to === 'deceased'`), else `'discharged'`, on both normal discharge and ghost-release. Proven on bench fire 3 (`bench3.log:17`, `read3.out:15-17`: planted `POP-00029` closed as `StatusNow: "discharged"`, `DischargeCycle: "118"`, `Outcome: "recovered-reconciled"`).
- **Care-exit restore (`phase04-events/generationalEventsEngine.js:177-204, 445`; `phase05-citizens/applyGameNightMoments.js:385-401`):** `hospitalPriorStatusForDischarge_` filters `Hospital_Ledger` by blank `DischargeCycle` (`:194`) and reads only `PriorStatus` (col P, `:196`), never `StatusNow` and never closed rows.
- **Full `StatusNow` reader sweep (`phase*/`, `utilities/`, `lib/`, `scripts/`, `dashboard/` excluding build artifacts):**
  - `utilities/careJusticeAccounting.js:485, 516-518`: keys openness on `DischargeCycle`; reads `StatusNow` only on open rows (`left === null || left > cycle`) against `CARE_JUSTICE_BED_STATES` (`['hospitalized', 'critical']`).
  - `scripts/cron-work-wake.js:90, 98`: `hospital-deaths` checks `/dea|died|deceased/i` on `Outcome + ' ' + StatusNow` (`'discharged'` does not match; `'deceased'` matches alongside `Outcome: 'deceased'`), and formats `${r.Outcome || r.StatusNow || 'in care'}`.
  - `scripts/civicPetitions.js:30, 191-192`: requires blank `DischargeCycle`, blank `Outcome`, and `StatusNow` in the 5 `OPEN_CARE` states — excludes `'discharged'`, `'deceased'`, and legacy `'active'`.
  - `scripts/beatSliceKit.js:587`: see Finding 1.

### 4. Readers (open vs closed stay filtering)
- `scripts/cron-work-wake.js:108` (`hospital-admissions`): fallback `rows.filter((r) => !String(r.DischargeCycle ?? '').trim())` excludes all closed stays regardless of `StatusNow` (`'active'` or `'discharged'`/`'deceased'`).
- `scripts/cron-saturday-run.js:1151` (`livedEventsGroundTruth`): `open = !dis` keys openness on `DischargeCycle` (`Adm <= hi`), excluding closed stays and capturing real open stays.
- `scripts/buildLivesSlice.js:373` (`stays`): keys on `!String(r.DischargeCycle ?? '').trim()`, guarded by `take(pop, id)` (`:270`, skips blank `POPID`, duplicates, media citizens) and `events.some(e => e.kind === 'hospital' ...)` (`:375`).
- `scripts/buildHealthSlice.js:105-118` (`stayOpen`): keeps only `(adm == null || adm <= cycle) && (dis == null || dis > cycle)`, dropping closed stays from the health slice.
- `lib/wakePerception.js:910-917` (`livedEventsFrom`): keys on `AdmitCycle` and `DischargeCycle` only; unaffected.
- `scripts/workerWake.js:425, 436` (`EMS-DIR`, `MED-EXAM`) & `lib/discordLookups.js:201, 386-393`: `workerWake` passes raw `Hospital_Ledger` rows without filtering on `StatusNow`; `discordLookups` reads `Care_Justice_Census`; unaffected.

### 5. Silent fallbacks / weakened checks / unguarded reads
- `seedCarriedHospitalAdmitCarry_` (`loadPreviousEvening.js:534-553`) logs every fallback (`missing`, `JSON.parse` error, missing `.hoods`); `careJusticeAdmitCarryIn_` (`careJusticeService.js:37-45`) throws loudly on out-of-range carry; `compactHospitalAdmitCarry_` (`finalizeCycleState.js:534-546`) drops only invalid entries and logs when `S.careJusticeDemand` is absent (`:656`).
- Only Finding 3 (`false`/`[]`/`'   '` coercion in `careJusticeAdmitCarryIn_`) is a minor validation looseness.

---

## Checks Run (after `219c118e7`)

- `node --check phase01-config/loadPreviousEvening.js phase04-events/careJusticeService.js phase09-digest/finalizeCycleState.js phase10-persistence/buildCyclePacket.js scripts/buildHealthSlice.js scripts/buildLivesSlice.js scripts/cron-saturday-run.js scripts/cron-work-wake.js` — **exit 0 (`SYNTAX_OK`)**
- `node scripts/careJusticeService.test.js` — **23 passed, 0 failed**
- `node scripts/careJusticeCensus.test.js` — **102 passed, 0 failed**
- `node scripts/hospitalTalkback.test.js` — **64 passed, 0 failed**
- `node scripts/hospitalIncomePersistence.test.js` — **82 passed, 0 failed**
- `node scripts/cronSaturdayRun.test.js` — **166 passed, 0 failed**
- `node scripts/cron-work-wake.test.js` — **54 passed, 0 failed**
- `node scripts/beatSlices.test.js` — **PASS**
- `node scripts/buildLivesSlice.test.js` — **OK**
- `node --test scripts/workerWake.test.js` — **31 passed, 0 failed**

---

## Attached Wiring Cards

Generated via `node scripts/runEngineAgent.js --agent engine-wiring --model anthropic/claude-haiku-4.5 --task "Target: <name>"` (`127/127` engine phase files opened):

```text
WIRING CARD — runCareJusticeDemand_ (function)   map: 2026-11-23 / 179 files

DEFINITION
  phase04-events/careJusticeService.js:162  function runCareJusticeDemand_(ctx)

PHASE POSITION
  production entry : Phase4-CareJusticeDemand @ godWorldEngine2.js:706  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase4-CareJusticeDemand @ godWorldEngine2.js:2427  — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (2)
  phase01-config/godWorldEngine2.js:706  runCareJusticeDemand_(ctx)
  phase01-config/godWorldEngine2.js:2427  runCareJusticeDemand_(ctx)

S FIELDS
  WRITE careJusticeDemand   @ :280   readers: phase04-events/chaosCarsEngine.js::pickCareJusticeTarget_, phase04-events/chaosCarsEngine.js::runChaosCarsEngine_, phase04-events/chaosCarsEngine.js::runChaosNamedPass_, phase05-citizens/generationalWealthEngine.js::collectPropertyTax_, phase05-citizens/judicialLifecycle.js::cityCourtRevenue_, phase09-digest/finalizeCycleState.js::compactHospitalAdmitCarry_, phase09-digest/finalizeCycleState.js::savePreviousCycleState_, phase10-persistence/buildCyclePacket.js::persistCareJusticeCensus_, utilities/careJusticeAccounting.js::planCareJusticeCensus_
  READ  crimeMetrics   @ :165, :189   writers: phase03-population/updateCrimeMetrics.js::updateCrimeMetrics_Phase3_
  READ  neighborhoodDemographics   @ :168, :190   writers: phase02-world-state/applyCityDynamics.js::applyCityDynamics_, phase03-population/updateNeighborhoodDemographics.js::updateNeighborhoodDemographics_
  READ  worldPopulation   @ :171, :175   writers: phase01-config/godWorldEngine2.js::updateWorldPopulation_
  READ  previousHospitalAdmitCarry   @ :222   writers: phase01-config/loadPreviousEvening.js::seedCarriedHospitalAdmitCarry_
  READ  absoluteCycle   @ :218   writers: phase01-config/advanceSimulationCalendar.js::advanceSimulationCalendar_
  READ  cycleId   @ :218   writers: phase01-config/godWorldEngine2.js::advanceWorldTime_, phase08-v3-chicago/v3Integration.js::v3Integration_

OTHER CTX
  ctx.config @ :177, :179, :218
  ctx.cache @ :77 (in careJusticeOariHoods_)
  ctx.ledger @ :132 (in careJusticeResidentIndex_)
  ctx.cycle @ :218

WRITE PATH
  (none — no INTENT or DIRECT writes in function body)
  Math.random: NOT FOUND

TABS
  Initiative_Tracker  readers: careJusticeOariHoods_   writers: phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_, phase05-citizens/civicInitiativeEngine.js::createInitiative_, phase05-citizens/householdFormationEngine.js::applyFundDisbursementBody_, phase05-citizens/runCareerEngine.js::runCareerEngine_, phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_   manifest: SHEETS_MANIFEST.md:38
```

```text
WIRING CARD — persistHospitalLedger_ (function)   map: 2026-11-23 / 179 files

DEFINITION
  phase10-persistence/buildCyclePacket.js:861  function persistHospitalLedger_(ctx)   v3.9 (file header)

PHASE POSITION
  production entry : Phase10-CyclePacket @ godWorldEngine2.js:936  — BEFORE Phase10-ExecuteIntents (line 967)
  cycle-phases     : Phase10-CyclePacket @ godWorldEngine2.js:2647 — BEFORE Phase10-ExecuteIntents (line 2666)

CALLERS (1)
  phase10-persistence/buildCyclePacket.js:83  try { hospital = persistHospitalLedger_(ctx); }

S FIELDS
  READ  hospitalEvents    @ :863   writers: chaosCarsEngine_@phase04-events/chaosCarsEngine.js, generationalEventsEngine_@phase04-events/generationalEventsEngine.js, sportsInjure_@phase05-citizens/applyGameNightMoments.js, sportsReturn_@phase05-citizens/applyGameNightMoments.js
  READ  absoluteCycle     @ :864   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js (and 48 total readers across engine)
  READ  cycleId           @ :864   writers: advanceWorldTime_@phase01-config/godWorldEngine2.js, v3Integration_@phase08-v3-chicago/v3Integration.js (and 83+ readers)
  WRITE hospitalCensus    @ :1092  readers: NONE  [ORPHAN WRITE]

OTHER CTX
  ctx.ss @ :897, :905, :1127, :1139  (Spreadsheets service)
  ctx.ledger @ :873, :880, :1017, :1022  (Simulation_Ledger rows/headers)
  ctx.config @ :1121  (unused read)
  ctx.summary @ :862 (init), :1092 (write)

WRITE PATH
  DIRECT  sheet.getRange(openRow + 1, 7, 1, 2).setValues(...) @ :952  → Hospital_Ledger  (open row transition)
  DIRECT  sheet.getRange(openRow + 1, 5).setValue(...) @ :953  → Hospital_Ledger  (backfill cause)
  DIRECT  sheet.getRange(openRow + 1, 7, 1, 5).setValues(...) @ :991  → Hospital_Ledger  (discharge/deceased)
  DIRECT  sheet.getRange(gRow + 1, 7, 1, 5).setValues(...) @ :1035  → Hospital_Ledger  (ghost-release)
  appendRowWithRetry_(sheet, newRow, ...) @ :979, :1072  → Hospital_Ledger  (new admission / missed-admit)
  persistWithRetry_(...) wrapper @ :951, :990, :1034  (wraps all DIRECT writes above)
  Math.random: NOT FOUND

TABS
  Hospital_Ledger  writers: persistHospitalLedger_@phase10-persistence/buildCyclePacket.js  readers: hospitalPriorStatusForDischarge_@phase04-events/generationalEventsEngine.js, persistCareJusticeCensus_@phase10-persistence/buildCyclePacket.js, persistHospitalLedger_@phase10-persistence/buildCyclePacket.js  manifest: docs/engine/SHEETS_MANIFEST.md:171
```
