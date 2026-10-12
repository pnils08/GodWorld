Perfect. Now I have all the information I need. Let me compile the complete and exact wiring card:

WIRING CARD — emitPressureTag_ (function)   map: 2026-09-19 / 184 files / 1412 functions   MAP STALE — regenerate with /stub-engine

DEFINITION
  utilities/citizenDialMap.js:443   function emitPressureTag_(ctx, row, iLife, popId, cause, text, opts)   v2 engine.201 / engine.182 / engine.176

PHASE POSITION
  production entry : Phase5-Career @ godWorldEngine2.js:362  — BEFORE Phase10-ExecuteIntents (:595)
  cycle-phases     : Phase5-Career @ godWorldEngine2.js:2111 — BEFORE Phase10-ExecuteIntents (:2330)

CALLERS (5)
  phase05-citizens/generationalWealthEngine.js:408   emitPressureTag_(ctx, row, iLife, String(row[iPopM] || ''), 'debt', pressureText_('debt', cycle + r), { hood: iHood >= 0 ? row[iHood] : '' })
  phase05-citizens/migrationTrackingEngine.js:271    emitPressureTag_(ctx, row, iLife, String(row[iPopP] || ''), 'rent', pressureText_('rent', cycle + r), { hood: neighborhood })
  phase05-citizens/runCareerEngine.js:1042   emitPressureTag_(ctx, row, iLife, popId, 'overwork', pressureText_('overwork', cycle + r))
  phase05-citizens/runCareerEngine.js:1379   emitPressureTag_(ctx, rows[pool[up].r], iLife, pool[up].pop, 'unemployed', pressureText_('unemployed', cycle + up))
  phase05-citizens/runNeighborhoodEngine.js:569    emitPressureTag_(ctx, row, iLife, String(row[iPopID] || ''), 'hood', pressureText_('hood', cycle + r), { hood: neighborhood })

S FIELDS
  WRITE  S.pressureTagged    @ :446  readers: emitPressureTag_ (:448), emitPressureTag_ (:455,460)  [ORPHANED: internal flag, no external reader]
  WRITE  S.pressureCounts    @ :450,461  readers: emitPressureTag_ (:461), compressLifeHistory.js:675
  READ   S.absoluteCycle     @ :449  writers: advanceSimulationCalendar.js::advanceSimulationCalendar_, many phase 2-10
  READ   S.cycleId           @ :449  writers: godWorldEngine2.js::advanceWorldTime_, v3Integration.js::v3Integration_

OTHER CTX
  ctx.summary    @ :445 (write-init)
  ctx.config     @ :449 (READ .cycleCount)
  ctx.now        @ :464 (READ)

WRITE PATH
  INTENT  queueAppendIntent_(ctx, 'LifeHistory_Log', […], 'pressure tag (' + cause + ')', 'citizens')  @ :462-465  → LifeHistory_Log
  DIRECT  row[iLife] = row[iLife] ? row[iLife] + '\n' + line : line  @ :459  (row mutation)

TABS
  LifeHistory_Log  writers: emitPressureTag_ + 19 others    readers: 22 including archival, media, tests
                   manifest: SHEETS_MANIFEST.md:38,186

OPEN WORK
  engine.39  `citizenDialMap` pure-integrity — docs/engine/ROLLOUT_PLAN.md:206  in-progress | engine-sheet | [[../plans/2026-06-21-tier1-dial-essence-backfill]]
  docs/plans/2026-06-21-tier1-dial-essence-backfill.md
  docs/plans/2026-07-04-voice-dial-sync-contract-build.md
  docs/plans/2026-09-08-dials-as-a-game-plan.md
  docs/plans/2026-09-13-codex-dial-drift-review.md

HISTORY
  ad252422  S451 — cut the engine.201b hood-rank retag and the read-side pin remap; keep the S449 delivery repairs
  61274362  engine.201b — openness/sociability down from causes, feuds rest, pole residue unpinned, hood line carries the hood's sign
  830e05ac  engine.201 codex diff review fixes — owner resolution, gone owners, cross-cause seeding, unemployment evidence
  d1b8057f  engine.201 Wave 2 — two-way dial causes (rulings 1b, 2, 3) + Wave 1 regression tests (bench candidate)
  32799948  engine.201 Wave 1 — dial plumbing repairs + builder rulings 1 and 5 (bench candidate)
  0ad78634  S438 [engine-sheet] engine.182 cut locally — overwork emits Strain every cycle drive +2

FILES OPENED
  utilities/citizenDialMap.js
  phase05-citizens/runCareerEngine.js
  phase05-citizens/runNeighborhoodEngine.js
  phase05-citizens/generationalWealthEngine.js
  phase05-citizens/migrationTrackingEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ROLLOUT_PLAN.md

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **43** (33%)
- never opened: **89**

<details><summary>files this report did NOT look at</summary>

- phase01-config/advanceSimulationCalendar.js
- phase01-config/canonNeighborhoodLoader.js
- phase01-config/engine94SheetContract.js
- phase01-config/godWorldEngine2.cycleCount.test.js
- phase01-config/initSimulationLedger.js
- phase01-config/loadPreviousEvening.js
- phase02-world-state/applyCityDynamics.js
- phase02-world-state/applyEditionCoverageEffects.js
- phase02-world-state/applyInitiativeImplementationEffects.js
- phase02-world-state/applySeasonWeights.js
- phase02-world-state/applySportsSeason.js
- phase02-world-state/applyWeatherModel.js
- phase02-world-state/calendarChaosWeights.js
- phase02-world-state/calendarStorySeeds.js
- phase02-world-state/commuteFlowEngine.js
- phase02-world-state/getSimHoliday.js
- phase02-world-state/getsimseason.js
- phase02-world-state/loadEventContentLedger.js
- phase02-world-state/loadNeighborhoodState.js
- phase02-world-state/updateTransitMetrics.js
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
- phase04-events/faithEventsEngine.js
- phase04-events/generateGameModeMicroEvents.js
- phase04-events/generateGenericCitizenMicroEvent.js
- phase04-events/generationalEventsEngine.js
- phase04-events/worldEventsEngine.js
- phase06-analysis/applyCivicLoadIndicator.js
- phase06-analysis/applyMigrationDrift.js
- phase06-analysis/applyPatternDetection.js
- phase06-analysis/applyShockMonitor.js
- phase06-analysis/computeRecurringCitizens.js
- phase06-analysis/economicRippleEngine.js
- phase06-analysis/filterNoiseEvents.js
- phase06-analysis/prePublicationValidation.js
- phase06-analysis/prioritizeEvents.js
- phase07-evening-media/applyStorySeeds.js
- phase07-evening-media/buildContractSeeds.js
- phase07-evening-media/buildContractSeeds.test.js
- phase07-evening-media/buildEveningFamous.js
- phase07-evening-media/buildEveningFood.js
- phase07-evening-media/buildEveningMedia.js
- phase07-evening-media/buildMediaPacket.js
- phase07-evening-media/buildNightLife.js
- phase07-evening-media/cityEveningSystems.js
- phase07-evening-media/culturalLedger.js
- phase07-evening-media/domainTracker.js
- phase07-evening-media/mediaFeedbackEngine.js
- phase07-evening-media/mediaRoomIntake.js
- phase07-evening-media/parseMediaRoomMarkdown.js
- phase07-evening-media/sportsStreaming.js
- phase07-evening-media/storyHook.js
- phase07-evening-media/storylineWeavingEngine.chaos.test.js
- phase07-evening-media/storylineWeavingEngine.js
- phase07-evening-media/textureTriggers.js
- phase07-evening-media/updateMediaSpread.js
- phase07-evening-media/updateTrendTrajectory.js
- phase08-v3-chicago/applyCycleRecovery.js
- phase08-v3-chicago/applyDomainCooldowns.js
- phase08-v3-chicago/chicagoSatellite.js
- phase08-v3-chicago/v3ChicagoWriter.js
- phase08-v3-chicago/v3DomainWriter.js
- phase08-v3-chicago/v3Integration.js
- phase08-v3-chicago/v3NeighborhoodWriter.js
- phase08-v3-chicago/v3StoryHookWriter.js
- phase08-v3-chicago/v3TextureWriter.js
- phase08-v3-chicago/v3preLoader.js
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

</details>

_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=24 toolCalls=23 in=557316 out=9582_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._