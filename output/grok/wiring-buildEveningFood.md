Now I have all the information I need. Let me compile the wiring card:

---

```
WIRING CARD — buildEveningFood_ (function)   map: 2026-08-30 / 183 files   

DEFINITION
  phase07-evening-media/buildEveningFood.js:33  function buildEveningFood_(ctx)    v2.4

PHASE POSITION
  production entry : Phase7-Food @ godWorldEngine2.js:454  — BEFORE Phase10-ExecuteIntents (line 563)
  cycle-phases     : Phase7-Food @ godWorldEngine2.js:2116  — BEFORE Phase10-ExecuteIntents (line 2204)

CALLERS (2)
  phase01-config/godWorldEngine2.js:454  safePhaseCall_(ctx, 'Phase7-Food', function() { buildEveningFood_(ctx); });
  phase01-config/godWorldEngine2.js:2116  safePhaseCall_(ctx, 'Phase7-Food', function() { buildEveningFood_(ctx); });

S FIELDS
  READ  season         @ 47   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  weather        @ 48   writers: applyWeatherModel_@phase02-world-state/applyWeatherModel.js, advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js
  READ  weatherMood    @ 49   writers: applyWeatherModel_@phase02-world-state/applyWeatherModel.js, advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  worldEvents    @ 50   writers: worldEventsEngine_@phase04-events/worldEventsEngine.js, faithEventsEngine_@phase04-events/faithEventsEngine.js, generateCrisisSpikes_@phase03-population/generateCrisisSpikes.js, generateCrisisBuckets_@phase03-population/generateCrisisBuckets.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  cityDynamics   @ 51   writers: applyCityDynamics_@phase02-world-state/applyCityDynamics.js, applyNeighborhoodRipple_@phase05-citizens/civicInitiativeEngine.js, applyInitiativeConsequences_@phase05-citizens/civicInitiativeEngine.js, applyActiveInitiativeRipples_@phase05-citizens/civicInitiativeEngine.js
  READ  nightlifeVolume @ 56   writers: buildNightlife_@phase07-evening-media/buildNightLife.js, worldEventsEngine_@phase04-events/worldEventsEngine.js, buildCityEveningSystems_@phase07-evening-media/cityEveningSystems.js
  READ  civicLoad      @ 57   writers: eventArcEngine_@phase04-events/eventArcEngine.js, applyCivicLoadIndicator_@phase06-analysis/applyCivicLoadIndicator.js, buildCityEveningSystems_@phase07-evening-media/cityEveningSystems.js, applyCycleRecovery_@phase08-v3-chicago/applyCycleRecovery.js
  READ  economicMood   @ 58   writers: calculateEconomicMood_@phase06-analysis/economicRippleEngine.js, runEconomicRippleEngine_@phase06-analysis/economicRippleEngine.js, applyMigrationDrift_@phase06-analysis/applyMigrationDrift.js, finalizeCycleState_@phase09-digest/finalizeCycleState.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  holiday        @ 63   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  holidayPriority @ 64   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  isFirstFriday  @ 65   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  isCreationDay  @ 66   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  sportsSeason   @ 67   writers: applySportsSeason_@phase02-world-state/applySportsSeason.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  WRITE eveningFood    @ 471  readers: writeDigest_@phase01-config/godWorldEngine2.js, snapshotEveningForCarryForward_@phase09-digest/finalizeCycleState.js, buildCyclePacket_@phase10-persistence/buildCyclePacket.js

OTHER CTX
  ctx.rng @ 41  (via safeRand_(ctx))
  ctx.config     NOT IN CTX MAP
  ctx.snapshot   NOT IN CTX MAP
  ctx.ledger     NOT IN CTX MAP
  ctx.persist    NOT IN CTX MAP

WRITE PATH
  (no INTENT/DIRECT/Math.random found)

TABS
  (no sheet tabs referenced in body)

OPEN WORK
  docs/plans/2026-07-18-event-pools-design.md:409-410  FILE: phase07-evening-media/buildEveningFood.js ENTRY: buildEveningFood_ (L388/L1962)
  docs/plans/2026-07-18-event-pools-design.md:60  worldEventsEngine, buildCityEvents, eventArcEngine (involvedCitizens never populated), faithEventsEngine (org-level; known gap: never attaches POPIDs), textureTriggers (**no consumer found — verify**), cityEveningSystems, buildNightLife, buildEveningFood, buildEveningMedia, buildEveningFamous (REAL_
  docs/plans/2026-08-02-neighborhood-truth-source-migration.md:172  runNeighborhoodEngine, buildEveningFamous, buildEveningFood, cityEveningSystems,

HISTORY
  5599b933  S352 engine.99 Cohort 2 trim — buildEveningFood's hood list was dead code
  07d61a45  S352 engine.99 Cohort 2 — core-sim subset becomes ledger truth (CoreSimRank)
  2119396c  S180 engine-sheet: ENGINE_REPAIR Row 12 — utilityFunctions rng threading
  af402828  Math.random silent-fallback sweep — 55 cycle-path sites → safeRand_(ctx)
  1cf1ecc8  fix: Math.random() → ctx.rng across Phases 1,3,4,6,7,8,10 + utilities (~129 instances)
  bc2c8a06  Upgrade Phase 07 evening-media scripts to ES5 - batch 1 (8 files)

FILES OPENED
  phase07-evening-media/buildEveningFood.js
  phase01-config/godWorldEngine2.js
  docs/engine/ENGINE_STUB_REVERSE.json (map_lookup)
  docs/engine/ROLLOUT_PLAN.md (grep)
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **136**
- opened by this run: **136** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=18 toolCalls=32 in=546428 out=4863_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._