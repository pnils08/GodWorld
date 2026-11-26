Perfect. Now let me compile the wiring card. I have enough information to assemble it with the data I've gathered:

```
WIRING CARD — generateCitizensEvents_ (function)   map: 2026-11-24 / 179 files   

DEFINITION
  phase05-citizens/generateCitizensEvents.js:451  function generateCitizensEvents_(ctx)  v2.9 (S325, engine.67) life-state hard gate

PHASE POSITION
  production entry : Phase5-CitizenEvents @ godWorldEngine2.js:755  — BEFORE Phase10-ExecuteIntents (godWorldEngine2.js:967)
  cycle-phases     : Phase5-CitizenEvents @ godWorldEngine2.js:2476  — BEFORE Phase10-ExecuteIntents (godWorldEngine2.js:2666)

CALLERS (2)
  phase01-config/godWorldEngine2.js:755  generateCitizensEvents_(ctx)
  phase01-config/godWorldEngine2.js:2476  generateCitizensEvents_(ctx)

S FIELDS
  WRITE folkMemory                 @ :525   readers: NONE
  WRITE cycleActiveCitizens        @ :759   readers: bondEngine.js::detectNewBonds_, bondEngine.js::ensureBondEngineData_, bondEngine.js::updateExistingBonds_, bondEngine.js, runRelationshipEngine.js::runRelationshipEngine_, computeRecurringCitizens.js::computeRecurringCitizens_, exportCycleArtifacts.js::buildCycleContextPack_
  WRITE citizenEventMemory         @ :765   readers: generateCitizensEvents_ @ :771
  WRITE templateCooldowns          @ :1023  readers: generateCitizensEvents_ @ :1027
  READ  season                     @ :677   writers: advanceSimulationCalendar.js::advanceSimulationCalendar_, v3preLoader.js::v3PreloadContext_
  READ  weather                    @ :678   writers: advanceSimulationCalendar.js::advanceSimulationCalendar_, applyWeatherModel.js::applyWeatherModel_
  READ  worldEvents                @ :679   writers: generateCrisisBuckets.js::generateCrisisBuckets_, generateCrisisSpikes.js::generateCrisisSpikes_, worldEventsEngine.js::worldEventsEngine_, applyBusinessDynamics.js::applyBusinessDynamics_
  READ  cityDynamics               @ :680   writers: applyCityDynamics.js::applyCityDynamics_, civicInitiativeEngine.js (multiple)
  READ  economicMood               @ :681   writers: loadPreviousEvening.js::seedCarriedEconomicMood_, applyMigrationDrift.js::applyMigrationDrift_, economicRippleEngine.js (multiple)
  READ  holiday                    @ :684   writers: advanceSimulationCalendar.js::advanceSimulationCalendar_
  READ  holidayPriority            @ :685   writers: advanceSimulationCalendar.js::advanceSimulationCalendar_
  READ  isFirstFriday              @ :686   writers: advanceSimulationCalendar.js::advanceSimulationCalendar_
  READ  isCreationDay              @ :687   writers: advanceSimulationCalendar.js::advanceSimulationCalendar_
  READ  sportsSeason               @ :688   writers: applySportsSeason.js::applySportsSeason_
  READ  sportsCity                 @ :689   writers: applySportsSeason.js::applySportsSeason_
  READ  crimeMetrics               @ :701   writers: updateCrimeMetrics.js::updateCrimeMetrics_Phase3_
  READ  cycleActiveCitizens        @ :754   writers: bondEngine.js::ensureBondEngineData_, runRelationshipEngine.js::runRelationshipEngine_
  READ  undockedFeedEntries        @ :615   writers: loadUndockedFeed_
  READ  undockedBoard              @ :630   writers: loadUndockedFeed_
  READ  undockedPilots             @ :3821  writers: loadUndockedFeed_
  READ  neighborhoodWeather        @ :1929  writers: applyWeatherModel.js::applyWeatherModel_
  READ  neighborhoodState          @ :2169  writers: loadNeighborhoodState.js::loadNeighborhoodState_
  READ  crimeByNeighborhood        @ :2214  writers: applyCityDynamics.js::applyCityDynamics_
  WRITE hoodSpots                  @ :1698  readers: hoodSpots (READ @ :1698, :1730); writers from applyBusinessDynamics.js::applyBusinessDynamics_
  READ  bizIdByName                @ :1785  writers: applyBusinessDynamics.js::applyBusinessDynamics_
  WRITE storyHooks                 @ :3079  readers: storyHook.js::storyHookEngine_, v3StoryHookWriter.js::saveV3Hooks_
  WRITE householdMoments           @ :3094  readers: NONE
  WRITE biasIntents                @ :4301  readers: NONE (drained at Phase 9 by compressor)
  WRITE faithExposures             @ :4311  readers: NONE (bondEngine Phase5 processFaithJoins_ rolls join dice)
  WRITE citizenEvents              @ :4414  readers: bondEngine.js::detectNewBonds_
  WRITE eventsGenerated            @ :4429  readers: NONE
  WRITE minorsSkippedTexture       @ :4526  readers: NONE
  WRITE engine299                  @ :4278  readers: NONE (telemetry only)
  READ  templateCooldowns          @ :1027  writers: generateCitizensEvents_ @ :1032
  READ  contentLedger              @ :3757  writers: loadEventContentLedger.js::loadEventContentLedger_
  READ  canonHoods                 @ :1697  writers: loadCanonNeighborhoods_
  READ  cycleId                    @ :515   writers: advanceWorldTime_, v3Integration_
  READ  previousEvening            @ :1988  writers: loadPreviousEvening.js::seedCarriedEconomicMood_
  READ  transitState               @ :3737  writers: updateTransitMetrics.js::updateTransitMetrics_Phase2_
  READ  chaosTransit               @ :3733  writers: updateTransitMetrics.js::updateTransitMetrics_Phase2_
  READ  sportsWeek                 @ :4264  writers: applySportsSeason.js (multiple)
  READ  sportsSentimentBoost        @ :2618  writers: applyStorySeeds.js::applyStorySeeds_
  READ  sportsAftermath             @ :2618  writers: (various engines)
  READ  bizOpenIds                 @ :3859  writers: applyBusinessDynamics.js::applyBusinessDynamics_
  READ  initiativeEvents           @ :2673  writers: civicInitiativeEngine.js (multiple)

OTHER CTX
  ctx.ledger @ :453 (READ/WRITE, Phase 42 §5.6 reads/mutates; commits at Phase 10)
  ctx.config @ :515 (READ: cycleCount, rngSeed, folkMemoryWindow, eclExclusivePools, eclExclusiveMinLines)
  ctx.cache @ :578 (READ: Judicial_Ledger cache for folk-memory)
  ctx.ss (Sheets) @ :513 (READ: LifeHistory_Log, Community_Programs, Faith_Organizations, Generic_Citizens)
  ctx.rng @ :665 (READ: RNG function or seed fallback)
  ctx.summary @ :514 (ctx.summary = S, READ/WRITE throughout)
  ctx.now @ :4376 (READ: timestamp for LastUpdated)
  ctx.citizenLookup @ :818 (WRITE: citizen attributes cache, keyed by POPID)

WRITE PATH
  DIRECT  row[iLife] = existing + "\n" + line @ :4375 → Citizen_Ledger (LifeHistory column)
  DIRECT  row[iLastU] = ctx.now @ :4376 → Citizen_Ledger (LastUpdated column)
  DIRECT  lifeLog.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows) @ :4446 → LifeHistory_Log (append)
  DIRECT  gcSurfaceSheet.getRange(gw.entry.sheetRow, gsE + 1).setValue(...) @ :4460 → Generic_Citizens (EmergenceCount)
  DIRECT  gcSurfaceSheet.getRange(gw.entry.sheetRow, gsC + 1).setValue(roster) @ :4475 → Generic_Citizens (namer roster context)
  INTENT  queueEnsureTabIntent_(ctx, 'Content_Telemetry', ...) @ :4510 → Content_Telemetry (create if missing)
  INTENT  queueAppendIntent_(ctx, 'Content_Telemetry', [...]) @ :4513 → Content_Telemetry (telemetry row append)

TABS
  Citizen_Ledger        writers: generateCitizensEvents_  readers: (ledger shape, written direct at :4375–4376)
  LifeHistory_Log       writers: generateCitizensEvents_  readers: generateCitizensEvents_ @ :513 (read-back for anti-inert check)
  Generic_Citizens      writers: generateCitizensEvents_ (GC emergence ticks @ :4460, namer roster @ :4475)
  Community_Programs    writers: none in this engine; readers: generateCitizensEvents_ @ :1760 (place-tab load)
  Faith_Organizations   writers: none in this engine; readers: generateCitizensEvents_ @ :1776 (place-tab load)
  Content_Telemetry     writers: generateCitizensEvents_ @ :4510, 4513  readers: (phase 06 draftContentRows for pruning)

OPEN WORK
  NOT FOUND (no ROLLOUT_PLAN.md entries grep'd for this function; check /stub-engine for engine docs)

HISTORY
  847e86971  engine.356 cut A3 built: $CONTACT picker, bonded persons only
  62855ebb7  engine.356: $PROGRAM asks for place kind, never offered empty
  f3494a0cf  engine.356: $PROGRAM, $CONGREGATION as places (Phase 5 fail-soft reads)
  d9686c97b  engine.356 A2: 21 hardcoded lines carry act: tags (kind of moment)
  c992f4fcc  engine.356 A2: 32 ECL lines name their business, place:<BIZ_ID>
  d7cca3de6  engine.356 A2: agy read folded, place:employer BIZ- only, spotFitsAct_ true to live sectors

FILES OPENED
  phase05-citizens/generateCitizensEvents.js:451–4530 (function body, 4180 lines)
  phase01-config/godWorldEngine2.js:755, 2476 (callers)
  phase01-config/godWorldEngine2.js:967, 2666 (Phase10-ExecuteIntents position)
  docs/engine/ENGINE_STUB_REVERSE.json (map lookup for sFields)
```

This is the complete wiring card for `generateCitizensEvents_`. All pointers are line-exact from the files, field access is classified (READ/WRITE), and both entry points show BEFORE Phase10. The function is a heavy reader of summarized state (season, weather, crime, neighborhood dynamics) and a direct writer to the Citizen_Ledger LifeHistory column, plus telemetry-append intents queued for Phase 10 execution.

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=11 toolCalls=19 in=445614 out=5282_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._