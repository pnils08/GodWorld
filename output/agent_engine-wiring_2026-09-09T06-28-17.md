Perfect. Now I have all the information I need. Let me compile the wiring card:

---

```
WIRING CARD — deriveDemographicDrift_ (function)   map: 2026-09-08 / 184 files   [MAP OK]

DEFINITION
  phase03-population/deriveDemographicDrift.js:26  function deriveDemographicDrift_(ctx) — v3.2

PHASE POSITION
  production entry : Phase8-DemographicDrift @ godWorldEngine2.js:520  — BEFORE Phase10-ExecuteIntents (588)
  cycle-phases     : Phase8-DemographicDrift @ godWorldEngine2.js:2264  — BEFORE Phase10-ExecuteIntents (2318)

CALLERS (2)
  phase01-config/godWorldEngine2.js:520  safePhaseCall_(ctx, 'Phase8-DemographicDrift', function() { deriveDemographicDrift_(ctx); });
  phase01-config/godWorldEngine2.js:2264  safePhaseCall_(ctx, 'Phase8-DemographicDrift', function() { deriveDemographicDrift_(ctx); });

S FIELDS
  WRITE  demographicDrift             @ :325  readers: updateNeighborhoodDemographics_@phase03-population/updateNeighborhoodDemographics.js, checkHealthEvent_@phase04-events/generationalEventsEngine.js, runCareerEngine_@phase05-citizens/runCareerEngine.js, applyCivicLoadIndicator_@phase06-analysis/applyCivicLoadIndicator.js, applyShockMonitor_@phase06-analysis/applyShockMonitor.js, applyStorySeeds_@phase07-evening-media/applyStorySeeds.js, saveV3NeighborhoodMap_@phase08-v3-chicago/v3NeighborhoodWriter.js, applyCompressedDigestSummary_@phase09-digest/applyCompressionDigestSummary.js  [COLLISION: also written by applyDemographicDrift_@phase03-population/applyDemographicDrift.js:398 — STRING at :325 OVERWRITES OBJECT at :398]
  WRITE  demographicDriftSummary     @ :327  readers: NONE  [ORPHAN WRITE]
  WRITE  demographicDriftFactors     @ :326  readers: updateNeighborhoodDemographics_@phase03-population/updateNeighborhoodDemographics.js:76
  READ   nightlifeVolume             @ :33   writers: buildNightlife_@phase07-evening-media/buildNightLife.js, buildCityEveningSystems_@phase07-evening-media/cityEveningSystems.js
  READ   worldEvents                 @ :34   writers: generateCrisisBuckets_@phase03-population/generateCrisisBuckets.js, generateCrisisSpikes_@phase03-population/generateCrisisSpikes.js, runFaithEventsEngine_@phase04-events/faithEventsEngine.js, worldEventsEngine_@phase04-events/worldEventsEngine.js, applyBusinessDynamics_@phase05-citizens/applyBusinessDynamics.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ   cityDynamics                @ :42   writers: applyCityDynamics_@phase02-world-state/applyCityDynamics.js, applyActiveInitiativeRipples_@phase05-citizens/civicInitiativeEngine.js, applyInitiativeConsequences_@phase05-citizens/civicInitiativeEngine.js, applyNeighborhoodRipple_@phase05-citizens/civicInitiativeEngine.js
  READ   civicLoad                   @ :44   writers: applyCivicLoadIndicator_@phase06-analysis/applyCivicLoadIndicator.js
  READ   civicLoadScore              @ :45   writers: applyCivicLoadIndicator_@phase06-analysis/applyCivicLoadIndicator.js
  READ   economicMood                @ :46   writers: applyMigrationDrift_@phase06-analysis/applyMigrationDrift.js, calculateEconomicMood_@phase06-analysis/economicRippleEngine.js, runEconomicRippleEngine_@phase06-analysis/economicRippleEngine.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ   weatherMood                 @ :47   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, applyWeatherModel_@phase02-world-state/applyWeatherModel.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ   storyHooks                  @ :49   writers: runGenerationalEngine_@phase04-events/generationalEventsEngine.js, marryCitizens_@phase05-citizens/bondEngine.js, processRomanceAndMarriage_@phase05-citizens/bondEngine.js, [23 more writers] — written in Phase5 & Phase7
  READ   textureTriggers             @ :50   writers: textureTriggerEngine_@phase07-evening-media/textureTriggers.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ   eventArcs                   @ :52   writers: generateCrisisBuckets_@phase03-population/generateCrisisBuckets.js, triggerDeathCascade_@phase04-events/generationalEventsEngine.js, triggerRetirementCascade_@phase04-events/generationalEventsEngine.js, v3Integration_@phase08-v3-chicago/v3Integration.js, loadActiveArcsFromLedger_@phase08-v3-chicago/v3preLoader.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ   holiday                     @ :63   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ   holidayPriority             @ :64   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ   isFirstFriday               @ :65   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ   isCreationDay               @ :66   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ   sportsAtmosphereEnabled     @ :69   writers: applySportsSeason_@phase02-world-state/applySportsSeason.js, findColumnIndex_@phase02-world-state/applySportsSeason.js
  READ   sportsSeason                @ :69   writers: applySportsSeason_@phase02-world-state/applySportsSeason.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ   shockFlag                   @ :73   writers: applyShockMonitor_@phase06-analysis/applyShockMonitor.js

OTHER CTX
  ctx.summary  @ :28, :339  (assigned but passed by reference)

WRITE PATH
  (none — deriveDemographicDrift_ reads S fields only, writes no sheet intents or direct writes)
  Math.random: NOT PRESENT

TABS
  (none — no sheet tabs referenced)

OPEN WORK
  docs/plans/2026-08-29-city-health-system.md:124  `S.demographicDriftFactors` is read at Phase3 (`updateNeighborhoodDemographics.js:68`) but written at Phase8 — a same-cycle order gap; the read only ever sees last cycle (currently unused by the illness math — irrelevant to this plan; recorded here, no separate gap log exists for engine)
  docs/plans/2026-08-29-city-health-system.md:125  `S.demographicShiftsCount` — orphaned write

BLAST RADIUS — CLOBBER HAZARD
  **COLLISION: S.demographicDrift type mismatch**
  - applyDemographicDrift_ (Phase3-Demographics, :398) writes S.demographicDrift as {object} with fields illnessRate, employmentRate, migration, economy, illnessSupportThreshold, illnessSupportCycles, hospitalConfig, employmentAttractor, …
  - deriveDemographicDrift_ (Phase8-DemographicDrift, :325) writes S.demographicDrift as {string} label (e.g. "Stable", "Net inflow", "Event inflow", …)
  - READ SITES EXPECTING OBJECT:
    • updateNeighborhoodDemographics.js:75  var demographicDrift = S.demographicDrift || {};  — uses .migration, .illnessRate, .employmentRate
    • updateNeighborhoodDemographics.js:90-92  typeof demographicDrift === 'object' ? … : fallback — DEFENSIVE, will treat string as falsy
    • generationalEventsEngine.js:1338-1353  S.demographicDrift.illnessRate, .illnessSupportThreshold, .illnessSupportCycles — WILL FAIL if string
    • runCareerEngine.js:419-421  S.demographicDrift.employmentAttractor, .employmentRate — WILL FAIL if string
    • applyStorySeeds.js:1401  S.demographicDrift.illnessSupportThreshold — WILL FAIL if string
  - All downstream reads occur AFTER Phase8 (Phase4, Phase5, Phase6, Phase7, Phase8, Phase9) — they will see the string from :325

HISTORY
  4979eb6f  S302 sports-atmosphere gate — feed SeasonType no longer synthesizes city atmosphere
  9a71f6bb  Complete ES5 migration for Google Apps Script compatibility (Batch 4)
  3cb7b323  Reorganize scripts by engine phase
  77f17734  S399 engine.135 E2+F: business success is the causation (applyEmployerSuccess_ on Growth_Rate; random promotion/layoff/shift/lateral rolls deleted); hood admission bands gate both movers (hoodAdmits_)
  686de8c2  S397: revert the off-plan dial change — back to the approved plan (attractor 0.96, floor 0.88) in code defaults, test, and bench World_Config; handoff = execute the plan as written, Phases B3→F
  0458b3c4  S397 close: employment cascade handoff — dial meaning/number UNRESOLVED (two guesses rejected; two-number participation × unemployment model proposed, not built); bench carries A+B2 code + B1 profile + placeholder config; OAKLAND_SCHOOLS S357 deletion found, restore pending; Phases C–F (the tracked citizens) not started

FILES OPENED
  phase03-population/deriveDemographicDrift.js
  phase03-population/applyDemographicDrift.js
  phase01-config/godWorldEngine2.js
  phase03-population/updateNeighborhoodDemographics.js
  phase04-events/generationalEventsEngine.js
  phase05-citizens/runCareerEngine.js
  phase07-evening-media/applyStorySeeds.js
  docs/plans/2026-08-29-city-health-system.md
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **133**
- opened by this run: **133** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=30 toolCalls=35 in=556807 out=6519_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._