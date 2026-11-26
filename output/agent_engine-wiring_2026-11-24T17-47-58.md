Perfect. Now I have all the information. Let me build the complete card:

```
WIRING CARD — generateCitizensEvents_ (function)   map: 2026-11-24 / 179 files   [map current]

DEFINITION
  phase05-citizens/generateCitizensEvents.js:461  function generateCitizensEvents_(ctx)
  VERSION: v2.9 (engine.67 life-state gate, header 3) vs v2.9 (S325, engine.67, function 462) — versions aligned

PHASE POSITION
  production entry : Phase5-CitizenEvents @ godWorldEngine2.js:755  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase5-CitizenEvents @ godWorldEngine2.js:2476  — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (53)
  phase01-config/godWorldEngine2.js:755  safePhaseCall_(ctx, 'Phase5-CitizenEvents', function() { generateCitizensEvents_(ctx); })
  phase01-config/godWorldEngine2.js:2476  safePhaseCall_(ctx, 'Phase5-CitizenEvents', function() { generateCitizensEvents_(ctx); })
  scripts/citizensEventsFame.t3.test.js:98  generateCitizensEvents_(ctx);
  scripts/citizensEventsFame.t3.test.js:118  generateCitizensEvents_(ctx);
  scripts/citizensEventsFame.t3.test.js:138  generateCitizensEvents_(ctx);
  scripts/codedPoolDownSide.test.js:129  GEN.generateCitizensEvents_(ctx);
  scripts/codedPoolDownSide.test.js:200  GEN.generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:132  try { generateCitizensEvents_(ctx); }
  scripts/contentLedgerCompose.test.js:135  try { generateCitizensEvents_(ctx2); }
  scripts/contentLedgerCompose.test.js:144  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:165  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:182  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:209  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:236  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:263  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:291  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:330  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:351  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:377  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:430  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:512  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:526  generateCitizensEvents_(capped);
  scripts/contentLedgerCompose.test.js:637  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:773  generateCitizensEvents_(ctxA);
  scripts/coverageReport.js:133  generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:61  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:88  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:104  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:112  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:118  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:134  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:147  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:167  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:197  GEN.generateCitizensEvents_(ctx);
  scripts/gameNightFans.test.js:76  generateCitizensEvents_(ctx);
  scripts/griefPeriod.test.js:246  GEN.generateCitizensEvents_(normal.ctx);
  scripts/griefPeriod.test.js:247  GEN.generateCitizensEvents_(grieving.ctx);
  scripts/griefPeriod.test.js:254  GEN.generateCitizensEvents_(certain.ctx);
  scripts/griefPeriod.test.js:266  GEN.generateCitizensEvents_(sample.ctx);
  scripts/griefPeriod.test.js:284  GEN.generateCitizensEvents_(none.ctx);
  scripts/griefPeriod.test.js:290  GEN.generateCitizensEvents_(createdCycle.ctx);
  scripts/griefPeriod.test.js:295  assert('F7 full generator fails before draws when config is incomplete', throws(() => GEN.generateCitizensEvents_(bad.ctx), /missing World_Config\.griefDurationCycles/));
  scripts/testNeighborhoodLoop.js:302  generateCitizensEvents_(ctx);
  scripts/testNeighborhoodLoop.js:484  generateCitizensEvents_(ctx);
  scripts/testNeighborhoodLoop.js:591  generateCitizensEvents_(c7);
  scripts/testNeighborhoodLoop.js:683  generateCitizensEvents_(makeCtx(94 + cy, rows, ss));
  scripts/testNeighborhoodLoop.js:830  try { generateCitizensEvents_(ctx); }
  scripts/testNeighborhoodLoop.js:843  generateCitizensEvents_(ctx);
  scripts/unlivedEcho.test.js:97  try { generateCitizensEvents_(ctx); }
  scripts/unlivedEcho.test.js:140  generateCitizensEvents_(ctx);

S FIELDS
  WRITE cycleActiveCitizens @ :769 READ :764 WRITE :769   readers: bondEngine_.ensureBondEngineData_, runRelationshipEngine_.runRelationshipEngine_, generateCitizensEvents_.generateCitizensEvents_, computeRecurringCitizens_.computeRecurringCitizens_
  WRITE citizenEventMemory @ :774–779, :4330   readers: generateCitizensEvents_.generateCitizensEvents_   [ORPHAN — no other reader beyond this generator and its own reads]
  WRITE templateCooldowns @ :1033 INIT, :1042 WRITE   readers: generateCitizensEvents_.generateCitizensEvents_   [ORPHAN — no other reader]
  READ season @ :687   writers: advanceSimulationCalendar_.advanceSimulationCalendar_, v3preLoader_.v3PreloadContext_
  READ weather @ :688   writers: advanceSimulationCalendar_.advanceSimulationCalendar_, applyWeatherModel_.applyWeatherModel_
  READ worldEvents @ :689   writers: generateCrisisBuckets_.generateCrisisBuckets_, worldEventsEngine_.worldEventsEngine_, chaosCarsEngine_.chaosShipWorldEvent_
  READ cityDynamics @ :690   writers: applyCityDynamics_.applyCityDynamics_, civicInitiativeEngine_.applyActiveInitiativeRipples_, civicInitiativeEngine_.applyNeighborhoodRipple_
  READ economicMood @ :691   writers: economicRippleEngine_.runEconomicRippleEngine_, economicRippleEngine_.calculateEconomicMood_, applyMigrationDrift_.applyMigrationDrift_
  READ holiday @ :694   writers: advanceSimulationCalendar_.advanceSimulationCalendar_, v3preLoader_.v3PreloadContext_
  READ holidayPriority @ :695   writers: advanceSimulationCalendar_.advanceSimulationCalendar_, v3preLoader_.v3PreloadContext_
  READ isFirstFriday @ :696   writers: advanceSimulationCalendar_.advanceSimulationCalendar_, v3preLoader_.v3PreloadContext_
  READ isCreationDay @ :697   writers: advanceSimulationCalendar_.advanceSimulationCalendar_, v3preLoader_.v3PreloadContext_
  READ sportsSeason @ :698   writers: applySportsSeason_.applySportsSeason_, v3preLoader_.v3PreloadContext_
  READ sportsCity @ :699   writers: applySportsSeason_.applySportsSeason_
  READ undockedFeedEntries @ :625   writers: loadEventContentLedger_.loadUndockedFeed_
  READ undockedBoard @ :640   writers: loadEventContentLedger_.loadUndockedFeed_
  READ crimeMetrics @ :711   writers: updateCrimeMetrics_.updateCrimeMetrics_Phase3_
  READ canonHoods @ :707   writers: canonNeighborhoodLoader_.loadCanonNeighborhoods_
  READ hoodSpots @ :708   writers: applyBusinessDynamics_.applyBusinessDynamics_
  WRITE folkMemory @ :535   readers: none   [ORPHAN WRITE — read only within generateCitizensEvents_]
  WRITE storyHooks @ :2910   readers: storyHookEngine_.storyHookEngine_, runCivicInitiativeEngine_.runCivicInitiativeEngine_, many writers/readers
  WRITE citizenEvents @ :4216   readers: none   [ORPHAN WRITE — no reader found]
  WRITE eventsGenerated @ :4231   readers: none   [ORPHAN WRITE — no reader found]
  WRITE minorsSkippedTexture @ :4328   readers: none   [ORPHAN WRITE — no reader found]
  WRITE householdMoments @ :2925   readers: none   [ORPHAN WRITE — no reader found]
  READ contentLedger @ :4306   writers: loadEventContentLedger_.loadEventContentLedger_
  READ cycleId @ :525   writers: advanceWorldTime_.advanceWorldTime_, v3Integration_.v3Integration_
  READ previousEvening @ :3063   writers: loadPreviousEvening_.loadPreviousEvening_

OTHER CTX
  ctx.ledger @ :463, :588, :480–523 (header indices)   read/write (dirty flag :2908, :4243)
  ctx.config @ :525, :678, :703, :2788, :2790   read (cycleCount, rngSeed, gcSurfaceChance, hoodFloorSurfaceQuota, folkMemoryWindow)
  ctx.ss @ :523, :2794   read (getSheetByName, getDataRange)
  ctx.rng @ :675   read (function or seed-based)
  ctx.cache @ :588   read (getData for Judicial_Ledger)
  ctx.now @ :2897, :4182   read (timestamp)
  ctx.citizenLookup @ :828 INIT, :844–860 BUILD   built by this function

WRITE PATH
  DIRECT setValues @ :2922 → LifeHistory_Log (household moments batch append)
  DIRECT setValues @ :4248 → LifeHistory_Log (event log rows batch append)
  DIRECT setValue @ :4262 → Generic_Citizens EmergenceCount column (GC emergence ticks)
  DIRECT setValue @ :4277 → Generic_Citizens EmergenceContext column (GC namer roster)
  INTENT queueEnsureTabIntent_ @ :4312 → Content_Telemetry (create tab if missing)
  INTENT queueAppendIntent_ @ :4315 → Content_Telemetry (telemetry row append)
  Math.random: NOT FOUND (no raw Math.random detected; uses ctx.rng or seeded mulberry32)

TABS
  LifeHistory_Log  writers: generateCitizensEvents_.generateCitizensEvents_, checkForPromotions_.checkForPromotions_, runEducationEngine_.runEducationEngine_, runAsUniversePipeline_.runAsUniversePipeline_, applyGameNightMoments_.applyGameNightMoments_, generateCivicModeEvents_.generateCivicModeEvents_, generateMediaModeEvents_.generateMediaModeEvents_, generateGameModeMicroEvents_.generateGameModeMicroEvents_, generationalEventsEngine_.runGenerationalEngine_, generateGenericCitizenMicroEvent_.generateGenericCitizenMicroEvents_   readers: generateCitizensEvents_.generateCitizensEvents_ (folk memory window, anti-inert check)   manifest: SHEETS_MANIFEST.md:43
  Generic_Citizens  writers: generateGenericCitizens_.generateGenericCitizens_, updateCivicApprovalRatings_.updateCivicApprovalRatings_, generateCitizensEvents_.generateCitizensEvents_ (emergence ticks)   readers: generateCitizensEvents_.generateCitizensEvents_ (emergence pool load :2794–2825)   manifest: SHEETS_MANIFEST.md:53
  Content_Telemetry  writers: generateCitizensEvents_.generateCitizensEvents_ (via intent)   readers: none found   manifest: NOT IN SHEETS_MANIFEST

OPEN WORK
  NOT FOUND (no matches in ROLLOUT_PLAN.md by function name)
  docs/plans/2026-07-01-persistence-seams-content-ledger.md (engine.38 Design A, content ledger composer, engine.38 B1 bias-lite, engine.38 B3 unlived echo)
  docs/plans/2026-07-18-event-pools-design.md (engine.33, engine.34, design doc for pool structure and routing)
  docs/plans/2026-10-08-engine-286-game-of-life-events.md (engine.286 wiring card for comprehensive testing)
  docs/plans/2026-10-18-event-engines-move-dials.md (engine.299 all events move dials)
  docs/plans/2026-11-21-a-moment-has-a-place.md (engine.356 cuts A1–A2 venue/place tagging)

HISTORY
  30920d7bd engine.356 cut A2: a place by what the moment is…
  366883880 engine.356 A1 fix: place:<BIZ_ID> only when the line names the place…
  910ce2e07 engine.356 cut A1: a moment's place is a business the sim holds…
  e608d9307 engine.356 gaps: crime counts in the hood trajectory and migration…
  4559c9d18 engine.356: line-by-line re-read of tonight's evening cut…
  11bfb6100 engine.356: two defects in tonight's own pushes…

FILES OPENED
  phase05-citizens/generateCitizensEvents.js (definition + body read in slices :461–4441)
  phase01-config/godWorldEngine2.js (phase calls :755, :2476, :967, :2666)
  docs/engine/ENGINE_STUB_REVERSE.json (map metadata and field declarations)
  docs/engine/SHEETS_MANIFEST.md (tab manifest references)
  docs/engine/ROLLOUT_PLAN.md (open work check)
  docs/plans/ (multiple task tracking docs)
```

---

WIRING CARD — generateCitizensEvents_ (function)   map: 2026-11-24 / 179 files   [map current]

DEFINITION
  phase05-citizens/generateCitizensEvents.js:461  function generateCitizensEvents_(ctx)
  VERSION: v2.9 (engine.67 life-state gate, header 3) vs v2.9 (S325, engine.67, function 462) — versions aligned

PHASE POSITION
  production entry : Phase5-CitizenEvents @ godWorldEngine2.js:755  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase5-CitizenEvents @ godWorldEngine2.js:2476  — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (53)
  phase01-config/godWorldEngine2.js:755  safePhaseCall_(ctx, 'Phase5-CitizenEvents', function() { generateCitizensEvents_(ctx); })
  phase01-config/godWorldEngine2.js:2476  safePhaseCall_(ctx, 'Phase5-CitizenEvents', function() { generateCitizensEvents_(ctx); })
  scripts/citizensEventsFame.t3.test.js:98  generateCitizensEvents_(ctx);
  scripts/citizensEventsFame.t3.test.js:118  generateCitizensEvents_(ctx);
  scripts/citizensEventsFame.t3.test.js:138  generateCitizensEvents_(ctx);
  scripts/codedPoolDownSide.test.js:129  GEN.generateCitizensEvents_(ctx);
  scripts/codedPoolDownSide.test.js:200  GEN.generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:132  try { generateCitizensEvents_(ctx); }
  scripts/contentLedgerCompose.test.js:135  try { generateCitizensEvents_(ctx2); }
  scripts/contentLedgerCompose.test.js:144  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:165  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:182  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:209  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:236  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:263  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:291  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:330  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:351  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:377  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:430  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:512  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:526  generateCitizensEvents_(capped);
  scripts/contentLedgerCompose.test.js:637  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:773  generateCitizensEvents_(ctxA);
  scripts/coverageReport.js:133  generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:61  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:88  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:104  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:112  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:118  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:134  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:147  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:167  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:197  GEN.generateCitizensEvents_(ctx);
  scripts/gameNightFans.test.js:76  generateCitizensEvents_(ctx);
  scripts/griefPeriod.test.js:246  GEN.generateCitizensEvents_(normal.ctx);
  scripts/griefPeriod.test.js:247  GEN.generateCitizensEvents_(grieving.ctx);
  scripts/griefPeriod.test.js:254  GEN.generateCitizensEvents_(certain.ctx);
  scripts/griefPeriod.test.js:266  GEN.generateCitizensEvents_(sample.ctx);
  scripts/griefPeriod.test.js:284  GEN.generateCitizensEvents_(none.ctx);
  scripts/griefPeriod.test.js:290  GEN.generateCitizensEvents_(createdCycle.ctx);
  scripts/griefPeriod.test.js:295  assert('F7 full generator fails before draws when config is incomplete', throws(() => GEN.generateCitizensEvents_(bad.ctx), /missing World_Config\.griefDurationCycles/));
  scripts/testNeighborhoodLoop.js:302  generateCitizensEvents_(ctx);
  scripts/testNeighborhoodLoop.js:484  generateCitizensEvents_(ctx);
  scripts/testNeighborhoodLoop.js:591  generateCitizensEvents_(c7);
  scripts/testNeighborhoodLoop.js:683  generateCitizensEvents_(makeCtx(94 + cy, rows, ss));
  scripts/testNeighborhoodLoop.js:830  try { generateCitizensEvents_(ctx); }
  scripts/testNeighborhoodLoop.js:843  generateCitizensEvents_(ctx);
  scripts/unlivedEcho.test.js:97  try { generateCitizensEvents_(ctx); }
  scripts/unlivedEcho.test.js:140  generateCitizensEvents_(ctx);

S FIELDS
  WRITE cycleActiveCitizens @ :769  readers: bondEngine_.ensureBondEngineData_, runRelationshipEngine_.runRelationshipEngine_, generateCitizensEvents_.generateCitizensEvents_, computeRecurringCitizens_.computeRecurringCitizens_
  WRITE citizenEventMemory @ :774–779, :4330  readers: generateCitizensEvents_.generateCitizensEvents_  [ORPHAN — no other reader]
  WRITE templateCooldowns @ :1033, :1042  readers: generateCitizensEvents_.generateCitizensEvents_  [ORPHAN — no other reader]
  READ season @ :687  writers: advanceSimulationCalendar_.advanceSimulationCalendar_, v3preLoader_.v3PreloadContext_
  READ weather @ :688  writers: advanceSimulationCalendar_.advanceSimulationCalendar_, applyWeatherModel_.applyWeatherModel_
  READ worldEvents @ :689  writers: generateCrisisBuckets_.generateCrisisBuckets_, worldEventsEngine_.worldEventsEngine_, chaosCarsEngine_.chaosShipWorldEvent_
  READ cityDynamics @ :690  writers: applyCityDynamics_.applyCityDynamics_, civicInitiativeEngine_.applyActiveInitiativeRipples_
  READ economicMood @ :691  writers: economicRippleEngine_.runEconomicRippleEngine_, applyMigrationDrift_.applyMigrationDrift_
  READ holiday @ :694  writers: advanceSimulationCalendar_.advanceSimulationCalendar_
  READ holidayPriority @ :695  writers: advanceSimulationCalendar_.advanceSimulationCalendar_
  READ isFirstFriday @ :696  writers: advanceSimulationCalendar_.advanceSimulationCalendar_
  READ isCreationDay @ :697  writers: advanceSimulationCalendar_.advanceSimulationCalendar_
  READ sportsSeason @ :698  writers: applySportsSeason_.applySportsSeason_
  READ sportsCity @ :699  writers: applySportsSeason_.applySportsSeason_
  READ undockedFeedEntries @ :625  writers: loadEventContentLedger_.loadUndockedFeed_
  READ undockedBoard @ :640  writers: loadEventContentLedger_.loadUndockedFeed_
  READ crimeMetrics @ :711  writers: updateCrimeMetrics_.updateCrimeMetrics_Phase3_
  READ canonHoods @ :707  writers: canonNeighborhoodLoader_.loadCanonNeighborhoods_
  READ hoodSpots @ :708  writers: applyBusinessDynamics_.applyBusinessDynamics_
  WRITE folkMemory @ :535  readers: none  [ORPHAN — read only within generateCitizensEvents_]
  WRITE storyHooks @ :2910  readers: storyHookEngine_.storyHookEngine_ + many writers
  WRITE citizenEvents @ :4216  readers: none  [ORPHAN — no reader found]
  WRITE eventsGenerated @ :4231  readers: none  [ORPHAN — no reader found]
  WRITE minorsSkippedTexture @ :4328  readers: none  [ORPHAN — no reader found]
  WRITE householdMoments @ :2925  readers: none  [ORPHAN — no reader found]
  READ contentLedger @ :4306  writers: loadEventContentLedger_.loadEventContentLedger_
  READ cycleId @ :525  writers: advanceWorldTime_.advanceWorldTime_
  READ previousEvening @ :3063  writers: loadPreviousEvening_.loadPreviousEvening_

OTHER CTX
  ctx.ledger @ :463, :480–523, :2908, :4243  read/write (header indices, dirty flag mark)
  ctx.config @ :525, :678, :703, :2788, :2790  read (cycleCount, rngSeed, gcSurfaceChance, hoodFloorSurfaceQuota, folkMemoryWindow)
  ctx.ss @ :523, :2794  read (getSheetByName, getDataRange)
  ctx.rng @ :675  read (function or seed-based fallback)
  ctx.cache @ :588  read (getData for Judicial_Ledger)
  ctx.now @ :2897, :4182  read (timestamp)
  ctx.citizenLookup @ :828–862  built (POPID → citizen details cache)

WRITE PATH
  DIRECT setValues @ :2922 → LifeHistory_Log  [after-executor — Phase 5 direct writer, pre-executor household moments]
  DIRECT setValues @ :4248 → LifeHistory_Log  [after-executor — Phase 5 direct writer, event log batch]
  DIRECT setValue @ :4262 → Generic_Citizens  [after-executor — emergence count ticks]
  DIRECT setValue @ :4277 → Generic_Citizens  [after-executor — emergence context roster]
  INTENT queueEnsureTabIntent_ @ :4312 → Content_Telemetry  [lazy tab create]
  INTENT queueAppendIntent_ @ :4315 → Content_Telemetry  [telemetry row append]
  Math.random: NOT FOUND

TABS
  LifeHistory_Log  writers: generateCitizensEvents_ (batch append :2922, :4248), checkForPromotions_, runEducationEngine_, runAsUniversePipeline_, applyGameNightMoments_, generateCivicModeEvents_, generateMediaModeEvents_, generateGameModeMicroEvents_, generationalEventsEngine_, generateGenericCitizenMicroEvent_  readers: generateCitizensEvents_ (folk memory :562, anti-inert :562)  manifest: SHEETS_MANIFEST.md:43
  Generic_Citizens  writers: generateGenericCitizens_, updateCivicApprovalRatings_, generateCitizensEvents_ (emergence :4262, :4277)  readers: generateCitizensEvents_ (pool load :2794–2825)  manifest: SHEETS_MANIFEST.md:53
  Content_Telemetry  writers: generateCitizensEvents_ (via intent :4312–4324)  readers: NOT FOUND  manifest: NOT IN SHEETS_MANIFEST

OPEN WORK
  NOT FOUND (no entries in ROLLOUT_PLAN.md match the function name)
  docs/plans/2026-07-01-persistence-seams-content-ledger.md — engine.38 Design A: event-content ledger composer + gates
  docs/plans/2026-07-18-event-pools-design.md — engine.33/34: pool structure + routing + dial tags
  docs/plans/2026-10-08-engine-286-game-of-life-events.md — engine.286: comprehensive wiring audit
  docs/plans/2026-10-18-event-engines-move-dials.md — engine.299: all events move dials
  docs/plans/2026-11-21-a-moment-has-a-place.md — engine.356 cuts A1–A2: venue/place tagging + picks

HISTORY
  30920d7bd engine.356 cut A2: a place by what the moment is. pickVenue_ takes the line's act
  366883880 engine.356 A1 fix: place:<BIZ_ID> only when the line names the place
  910ce2e07 engine.356 cut A1: a moment's place is a business the sim holds
  e608d9307 engine.356 gaps: crime counts in the hood trajectory and migration
  4559c9d18 engine.356: line-by-line re-read of tonight's evening cut
  11bfb6100 engine.356: two defects in tonight's own pushes

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=16 toolCalls=25 in=732916 out=10226_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._