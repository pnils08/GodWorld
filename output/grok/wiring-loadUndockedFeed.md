Good. No sheet writes at all. This is a pure READ function.

Now let me gather all the files I've accessed for the FILES OPENED section and compile the card:

FILES OPENED:
- phase02-world-state/loadEventContentLedger.js
- phase01-config/godWorldEngine2.js
- docs/engine/SHEETS_MANIFEST.md
- docs/plans/2026-08-07-spacemolt-game-show.md

Let me get a couple more things:
- The exact line numbers for the WRITE/READ statements from the ctxMap output show the detailed locations

Now I have all the information needed. Let me compile the card:

```
WIRING CARD — loadUndockedFeed_ (function)   map: 2026-08-31 / 185 files   

DEFINITION
  phase02-world-state/loadEventContentLedger.js:291  function loadUndockedFeed_(ctx)  (no version tag)

PHASE POSITION
  production entry : Phase2-UndockedFeed @ godWorldEngine2.js:292  — BEFORE Phase10-ExecuteIntents (:563)
  cycle-phases     : Phase2-UndockedFeed @ godWorldEngine2.js:2010 — BEFORE Phase10-ExecuteIntents (:2258)

CALLERS (2)
  phase01-config/godWorldEngine2.js:292  loadUndockedFeed_(ctx)
  phase01-config/godWorldEngine2.js:2010 loadUndockedFeed_(ctx)

S FIELDS
  WRITE undockedFeedEntries   @ :293   readers: phase01-config/godWorldEngine2.js (2 refs), phase02-world-state/loadEventContentLedger.js::loadEventContentLedger_, phase05-citizens/generateCitizensEvents.js
  WRITE undockedFeedEntries   @ :337   (push, same field)
  WRITE undockedPilots        @ :294   readers: phase05-citizens/generateCitizensEvents.js (2 refs)
  WRITE undockedPilots        @ :351   (indexed write, same field)
  READ  cycle                 @ :308   writers: NONE (PHANTOM READ—no writer in map)

OTHER CTX
  ctx.summary @ :292  (assignment or read)
  ctx.ss @ :296       (read)
  ctx.config @ :308   (read)

WRITE PATH
  NONE — read-only function, no sheet writes, no intents, no Math.random

TABS
  Undocked_Feed  writers: NONE (read-only)  readers: loadUndockedFeed_  manifest: SHEETS_MANIFEST.md:79

OPEN WORK
  docs/plans/2026-08-07-spacemolt-game-show.md (spacemolt-game-show) — Standings layer mentions Undocked_Feed aggregation for per-pilot cumulative credits (lines 1–170, line 170 specifies dependency)

HISTORY
  f4942fa2 research.27 §2.4: pilots are in space that cycle — pilot-scoped gate + show source
  92330d37 research.27 2.3: Phase-2 reader — Undocked_Feed tab reaches the engine
  ef3e3d71 research.27 Phase 2.3: ECL undocked/warmth/drive wiring — items 1-3 of the drop-in
  27776f0a S357 engine.97 Task 1/4/5 + engine.79 items 4/7 code: age + trajectory DSL, exclusive pools, youthActivities retired
  7d30d284 S329 engine.79: Grok ECL review applied — row telemetry, fragment cap, content hash
  a503d6c1 S325 engine.68: Cultural_Ledger joins the antenna — fame is its own attention (Mike doctrine)

FILES OPENED
  phase02-world-state/loadEventContentLedger.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/plans/2026-08-07-spacemolt-game-show.md
```

WIRING CARD — loadUndockedFeed_ (function)   map: 2026-08-31 / 185 files   

DEFINITION
  phase02-world-state/loadEventContentLedger.js:291  function loadUndockedFeed_(ctx)  (no version tag)

PHASE POSITION
  production entry : Phase2-UndockedFeed @ godWorldEngine2.js:292  — BEFORE Phase10-ExecuteIntents (:563)
  cycle-phases     : Phase2-UndockedFeed @ godWorldEngine2.js:2010 — BEFORE Phase10-ExecuteIntents (:2258)

CALLERS (2)
  phase01-config/godWorldEngine2.js:292  loadUndockedFeed_(ctx)
  phase01-config/godWorldEngine2.js:2010 loadUndockedFeed_(ctx)

S FIELDS
  WRITE undockedFeedEntries   @ :293   readers: phase01-config/godWorldEngine2.js (2 refs), phase02-world-state/loadEventContentLedger.js::loadEventContentLedger_, phase05-citizens/generateCitizensEvents.js
  WRITE undockedFeedEntries   @ :337   (push, same field)
  WRITE undockedPilots        @ :294   readers: phase05-citizens/generateCitizensEvents.js (2 refs)
  WRITE undockedPilots        @ :351   (indexed write, same field)
  READ  cycle                 @ :308   writers: NONE (PHANTOM READ—no writer in map)

OTHER CTX
  ctx.summary @ :292  (assignment or read)
  ctx.ss @ :296       (read)
  ctx.config @ :308   (read)

WRITE PATH
  NONE — read-only function, no sheet writes, no intents, no Math.random

TABS
  Undocked_Feed  writers: NONE (read-only)  readers: loadUndockedFeed_  manifest: SHEETS_MANIFEST.md:79

OPEN WORK
  docs/plans/2026-08-07-spacemolt-game-show.md (spacemolt-game-show) — Standings layer mentions Undocked_Feed aggregation for per-pilot cumulative credits (line 170 specifies dependency)

HISTORY
  f4942fa2 research.27 §2.4: pilots are in space that cycle — pilot-scoped gate + show source
  92330d37 research.27 2.3: Phase-2 reader — Undocked_Feed tab reaches the engine
  ef3e3d71 research.27 Phase 2.3: ECL undocked/warmth/drive wiring — items 1-3 of the drop-in
  27776f0a S357 engine.97 Task 1/4/5 + engine.79 items 4/7 code: age + trajectory DSL, exclusive pools, youthActivities retired
  7d30d284 S329 engine.79: Grok ECL review applied — row telemetry, fragment cap, content hash
  a503d6c1 S325 engine.68: Cultural_Ledger joins the antenna — fame is its own attention (Mike doctrine)

FILES OPENED
  phase02-world-state/loadEventContentLedger.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/plans/2026-08-07-spacemolt-game-show.md

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **137**
- opened by this run: **44** (32%)
- never opened: **93**

<details><summary>files this report did NOT look at</summary>

- phase03-population/applyDemographicDrift.js
- phase03-population/deriveDemographicDrift.js
- phase03-population/finalizeWorldPopulation.js
- phase03-population/generateCrisisBuckets.js
- phase03-population/generateCrisisSpikes.js
- phase03-population/generateMonthlyDriftReport.js
- phase03-population/updateCityTier.js
- phase03-population/updateCrimeMetrics.js
- phase03-population/updateNeighborhoodDemographics.js
- phase04-events/buildCityEvents.js
- phase04-events/chaosCarsEngine.js
- phase04-events/chaosCarsEngine.test.js
- phase04-events/eventArcEngine.js
- phase04-events/faithEventsEngine.js
- phase04-events/generateGameModeMicroEvents.js
- phase04-events/generateGenericCitizenMicroEvent.js
- phase04-events/generationalEventsEngine.js
- phase04-events/worldEventsEngine.js
- phase05-citizens/applyChaosDecay.js
- phase05-citizens/applyChaosDecay.test.js
- phase05-citizens/applyGameNightMoments.js
- phase05-citizens/applyNamedCitizenSpotlight.js
- phase05-citizens/bondEngine.js
- phase05-citizens/bondPersistence.js
- phase05-citizens/checkForPromotions.js
- phase05-citizens/citizenContextBuilder.js
- phase05-citizens/civicInitiativeEngine.js
- phase05-citizens/educationCareerEngine.js
- phase05-citizens/generateChicagoCitizensv1.js
- phase05-citizens/generateCitizensEvents.js
- phase05-citizens/generateCivicModeEvents.js
- phase05-citizens/generateGenericCitizens.js
- phase05-citizens/generateMediaModeEvents.js
- phase05-citizens/generateMonthlyCivicSweep.js
- phase05-citizens/generationalWealthEngine.js
- phase05-citizens/householdFormationEngine.js
- phase05-citizens/migrationTrackingEngine.js
- phase05-citizens/neighborhoodTrajectoryEngine.js
- phase05-citizens/processAdvancementIntake.js
- phase05-citizens/processIntakeV3.js
- phase05-citizens/runAsUniversePipeline.js
- phase05-citizens/runCareerEngine.js
- phase05-citizens/runCivicElectionsv1.js
- phase05-citizens/runCivicRoleEngine.js
- phase05-citizens/runConductEngine.js
- phase05-citizens/runEducationEngine.js
- phase05-citizens/runHouseholdEngine.js
- phase05-citizens/runNeighborhoodEngine.js
- phase05-citizens/runRelationshipEngine.js
- phase05-citizens/runYouthEngine.js
- phase05-citizens/seedRelationBondsv1.js
- phase05-citizens/updateCivicApprovalRatings.js
- phase05-citizens/updateCivicLedgerFactions.js
- phase06-analysis/applyCivicLoadIndicator.js
- phase06-analysis/applyMigrationDrift.js
- phase06-analysis/applyPatternDetection.js
- phase06-analysis/applyShockMonitor.js
- phase06-analysis/computeRecurringCitizens.js
- phase06-analysis/economicRippleEngine.js
- phase06-analysis/filterNoiseEvents.js
- phase06-analysis/prePublicationValidation.js
- phase06-analysis/prioritizeEvents.js
- phase06-analysis/processArcLifeCyclev1.js
- phase06-analysis/storylineHealthEngine.js
- phase06-analysis/updateStorylineStatusv1.2.js
- phase08-v3-chicago/applyCycleRecovery.js
- phase08-v3-chicago/applyDomainCooldowns.js
- phase08-v3-chicago/chicagoSatellite.js
- phase08-v3-chicago/v3ChicagoWriter.js
- phase08-v3-chicago/v3DomainWriter.js
- phase08-v3-chicago/v3Integration.js
- phase08-v3-chicago/v3LedgerWriter.js
- phase08-v3-chicago/v3NeighborhoodWriter.js
- phase08-v3-chicago/v3StoryHookWriter.js
- phase08-v3-chicago/v3TextureWriter.js
- phase08-v3-chicago/v3preLoader.js
- phase09-digest/applyCompressionDigestSummary.js
- phase09-digest/applyCycleWeight.js
- phase09-digest/finalizeCycleState.js
- phase09-digest/finalizeCycleState.test.js
- phase10-persistence/buildCyclePacket.js
- phase10-persistence/commitSimulationLedger.js
- phase10-persistence/compileHandoff.js
- phase10-persistence/cycleExportAutomation.js
- phase10-persistence/persistenceExecutor.js
- phase10-persistence/recordCycleWeather.js
- phase10-persistence/recordMediaLedger.js
- phase10-persistence/recordWorldEventsv25.js
- phase10-persistence/recordWorldEventsv3.js
- phase10-persistence/saveChaosCars.js
- phase10-persistence/saveChaosCars.test.js
- phase10-persistence/saveV3Seeds.js
- phase11-media-intake/healthCauseIntake.js

</details>

_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=27 toolCalls=38 in=436725 out=5592_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._