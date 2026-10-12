Perfect! Now I have everything I need. Let me compile the wiring card:

```
WIRING CARD — Cultural_Ledger (tab)   map: 2026-09-15 / 183 files / 1402 functions

DEFINITION (SHEETS_MANIFEST.md)
  docs/engine/SHEETS_MANIFEST.md:47  Famous entities and recurring culture touchstones

WRITERS (4 functions)
  phase05-citizens/generationalWealthEngine.js:1987  updateHeritage_(ss, ctx, cycle) — calls queueAppendIntent_ @ 2661 → Cultural_Ledger
  phase05-citizens/processAdvancementIntake.js:1053  dimCulturalFame_(ctx, popId, delta) — calls queueCellIntent_ @ 1068 → Cultural_Ledger
  phase07-evening-media/culturalLedger.js:71        decayCulturalFame_(ctx) — calls queueCellIntent_ @ 88 → Cultural_Ledger
  phase07-evening-media/culturalLedger.js:132       registerCulturalEntity_(ctx, name, roleType, journalistName, neighborhood) — calls queueCellIntent_/queueAppendIntent_ @ 462,468,474,477,478,482,488,495,500,584 → Cultural_Ledger

PHASE POSITION
  production entry:  Phase5-Advancement @ godWorldEngine2.js:384  — BEFORE Phase10-ExecuteIntents (594)
  production entry:  Phase5-GenerationalWealth @ godWorldEngine2.js:386  — BEFORE Phase10-ExecuteIntents (594)
  production entry:  Phase7-Famous @ godWorldEngine2.js:467  — BEFORE Phase10-ExecuteIntents (594)
  cycle-phases:      Phase5-Advancement @ godWorldEngine2.js:2133  — BEFORE Phase10-ExecuteIntents (2329)
  cycle-phases:      Phase5-GenerationalWealth @ godWorldEngine2.js:2135  — BEFORE Phase10-ExecuteIntents (2329)
  cycle-phases:      Phase7-Famous @ godWorldEngine2.js:2214  — BEFORE Phase10-ExecuteIntents (2329)

READERS (11 functions)
  phase05-citizens/citizenContextBuilder.js::diagnoseLedgerStructure
  phase05-citizens/citizenContextBuilder.js::getCulturalStatus_
  phase05-citizens/generationalWealthEngine.js::updateHeritage_
  phase05-citizens/processAdvancementIntake.js::culturalFameOf_
  phase05-citizens/processAdvancementIntake.js::dimCulturalFame_
  phase07-evening-media/culturalLedger.js::culturalStatusByPop_
  phase07-evening-media/culturalLedger.js::decayCulturalFame_
  phase07-evening-media/culturalLedger.js::registerCulturalEntity_
  phase07-evening-media/mediaRoomIntake.js::logCulturalMention_
  phase10-persistence/recordMediaLedger.js::recordMediaLedger_
  utilities/ensureCultureLedger.js::ensureCulturalLedger_

TAB REFERENCES (all by name literal)
  phase05-citizens/citizenContextBuilder.js:720   READ — getSheetByName('Cultural_Ledger')
  phase05-citizens/citizenContextBuilder.js:1118  READ — string literal in array
  phase05-citizens/generationalWealthEngine.js:2661  INTENT queueAppendIntent_ → 'Cultural_Ledger'
  phase05-citizens/processAdvancementIntake.js:1055   READ — getSheetByName('Cultural_Ledger')
  phase05-citizens/processAdvancementIntake.js:1068   INTENT queueCellIntent_ → 'Cultural_Ledger'
  phase05-citizens/processAdvancementIntake.js:1082   READ — getSheetByName('Cultural_Ledger')
  phase07-evening-media/culturalLedger.js:76    READ — getSheetByName('Cultural_Ledger')
  phase07-evening-media/culturalLedger.js:88    INTENT queueCellIntent_ → 'Cultural_Ledger'
  phase07-evening-media/culturalLedger.js:103   READ — getSheetByName('Cultural_Ledger')
  phase07-evening-media/culturalLedger.js:462,468,474,477,478,482,488,495,500   INTENT queueCellIntent_ → 'Cultural_Ledger'
  phase07-evening-media/culturalLedger.js:584   INTENT queueAppendIntent_ → 'Cultural_Ledger'
  phase07-evening-media/buildEveningFamous.js:46   calls decayCulturalFame_(ctx)
  phase07-evening-media/buildEveningFamous.js:581  calls registerCulturalEntity_(ctx, ...)
  phase07-evening-media/mediaRoomIntake.js:792   READ — getSheetByName('Cultural_Ledger')
  phase10-persistence/cycleExportAutomation.js:67   READ — string literal in array
  phase10-persistence/recordMediaLedger.js:47   READ — getSheetByName('Cultural_Ledger')
  utilities/ensureCultureLedger.js:13   READ — requireTab_(ctx.ss, 'Cultural_Ledger')
  utilities/sheetNames.js:44   CONSTANT definition: CULTURAL_LEDGER: 'Cultural_Ledger'

WRITE PATH
  INTENT queueCellIntent_   phase07-evening-media/culturalLedger.js:88   decayCulturalFame_ — FameScore cell (quiet-cycle decay)
  INTENT queueCellIntent_   phase05-citizens/processAdvancementIntake.js:1068   dimCulturalFame_ — FameScore cell (brief/dim cycle)
  INTENT queueCellIntent_   phase07-evening-media/culturalLedger.js:462,468,474,477,478,482,488,495,500   registerCulturalEntity_ — LastSeenCycle,MediaCount,FameScore,FameCategory,CulturalDomain,Neighborhood,UniverseLinks,LastSeenHoliday,CalendarContext cells
  INTENT queueAppendIntent_   phase05-citizens/generationalWealthEngine.js:2661   updateHeritage_ — append row (heritage link creation)
  INTENT queueAppendIntent_   phase07-evening-media/culturalLedger.js:584   registerCulturalEntity_ — CREATE new row

CALLER GRAPH (functions that trigger the 4 writers)
  updateHeritage_: called @ phase05-citizens/generationalWealthEngine.js:199 from processGenerationalWealth_()
  dimCulturalFame_: called @ phase05-citizens/processAdvancementIntake.js:530 from processAdvancementIntake_()
  decayCulturalFame_: called @ phase07-evening-media/buildEveningFamous.js:46 from buildEveningFamous_()
  registerCulturalEntity_: called @ phase07-evening-media/buildEveningFamous.js:581 from buildEveningFamous_()

OPEN WORK
  docs/plans/2026-05-30-citizen-lifecycle-fame-system.md:36–119  Citizen Lifecycle & Fame System Plan — full Cultural_Ledger lifecycle (ascension/decay, POPID linkage, SL minting)
  docs/plans/2026-07-18-event-pools-design.md:140–153  engine.68 — Cultural_Ledger joins antenna (fame pooling, ECL conditions, FAME_WATCH hook)
  docs/plans/2026-08-07-spacemolt-game-show.md:212–223  Cultural_Ledger CUL/POPID gap: 21 of 46 rows have no POPID link
  docs/plans/2026-09-02-bloodline-ascent.md:49,203,426–429  engine.118 cut 3b — cultural entity fame brightening + POPID registration live

HISTORY
  9fa4cf43  S427 engine.148 P3 — texture pools key by hood place label; arts/holiday lists are Neighborhood_Map column
  07d61a45  S352 engine.99 Cohort 2 — core-sim subset becomes ledger truth (CoreSimRank)
  a503d6c1  S325 engine.68: Cultural_Ledger joins antenna — fame is its own attention (Mike doctrine)
  ed600619  S301 engine.44 Class 3 — weather-streak carry + Cultural_Ledger POPID + education re-seed
  acc40a81  S290 engine.44 Class 1 REOPENED+completed — 12 writers missed by first pass
  cede1e95  S237 engine.44 Class 1 [engine/sheet] Phase 42 §B6 — culturalLedger v2.4 → v2.5 (writeIntents migration + same-cycle dedup fix)

FILES SCANNED
  phase01-config/godWorldEngine2.js
  phase05-citizens/citizenContextBuilder.js
  phase05-citizens/generationalWealthEngine.js
  phase05-citizens/processAdvancementIntake.js
  phase07-evening-media/buildEveningFamous.js
  phase07-evening-media/culturalLedger.js
  phase07-evening-media/mediaRoomIntake.js
  phase10-persistence/cycleExportAutomation.js
  phase10-persistence/recordMediaLedger.js
  utilities/ensureCultureLedger.js
  utilities/sheetNames.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/plans/2026-05-30-citizen-lifecycle-fame-system.md
  docs/plans/2026-07-18-event-pools-design.md
  docs/plans/2026-08-07-spacemolt-game-show.md
  docs/plans/2026-09-02-bloodline-ascent.md
```

WIRING CARD — Cultural_Ledger (tab)   map: 2026-09-15 / 183 files / 1402 functions

DEFINITION (SHEETS_MANIFEST.md)
  docs/engine/SHEETS_MANIFEST.md:47  Famous entities and recurring culture touchstones

WRITERS (4 functions)
  phase05-citizens/generationalWealthEngine.js:1987  updateHeritage_(ss, ctx, cycle) — queueAppendIntent_ @ 2661 → Cultural_Ledger
  phase05-citizens/processAdvancementIntake.js:1053  dimCulturalFame_(ctx, popId, delta) — queueCellIntent_ @ 1068 → Cultural_Ledger
  phase07-evening-media/culturalLedger.js:71        decayCulturalFame_(ctx) — queueCellIntent_ @ 88 → Cultural_Ledger
  phase07-evening-media/culturalLedger.js:132       registerCulturalEntity_(ctx, name, roleType, journalistName, neighborhood) — queueCellIntent_/queueAppendIntent_ @ 462,468,474,477,478,482,488,495,500,584 → Cultural_Ledger

PHASE POSITION
  production entry:  Phase5-Advancement @ godWorldEngine2.js:384  — BEFORE Phase10-ExecuteIntents (594)
  production entry:  Phase5-GenerationalWealth @ godWorldEngine2.js:386  — BEFORE Phase10-ExecuteIntents (594)
  production entry:  Phase7-Famous @ godWorldEngine2.js:467  — BEFORE Phase10-ExecuteIntents (594)
  cycle-phases:      Phase5-Advancement @ godWorldEngine2.js:2133  — BEFORE Phase10-ExecuteIntents (2329)
  cycle-phases:      Phase5-GenerationalWealth @ godWorldEngine2.js:2135  — BEFORE Phase10-ExecuteIntents (2329)
  cycle-phases:      Phase7-Famous @ godWorldEngine2.js:2214  — BEFORE Phase10-ExecuteIntents (2329)

READERS (11 functions)
  phase05-citizens/citizenContextBuilder.js::diagnoseLedgerStructure
  phase05-citizens/citizenContextBuilder.js::getCulturalStatus_
  phase05-citizens/generationalWealthEngine.js::updateHeritage_
  phase05-citizens/processAdvancementIntake.js::culturalFameOf_
  phase05-citizens/processAdvancementIntake.js::dimCulturalFame_
  phase07-evening-media/culturalLedger.js::culturalStatusByPop_
  phase07-evening-media/culturalLedger.js::decayCulturalFame_
  phase07-evening-media/culturalLedger.js::registerCulturalEntity_
  phase07-evening-media/mediaRoomIntake.js::logCulturalMention_
  phase10-persistence/recordMediaLedger.js::recordMediaLedger_
  utilities/ensureCultureLedger.js::ensureCulturalLedger_

TAB REFERENCES (string literals)
  phase05-citizens/citizenContextBuilder.js:720    READ — getSheetByName('Cultural_Ledger')
  phase05-citizens/citizenContextBuilder.js:1118   READ — array constant
  phase05-citizens/generationalWealthEngine.js:2661   INTENT queueAppendIntent_ → 'Cultural_Ledger'
  phase05-citizens/processAdvancementIntake.js:1055   READ — getSheetByName('Cultural_Ledger')
  phase05-citizens/processAdvancementIntake.js:1068   INTENT queueCellIntent_ → 'Cultural_Ledger'
  phase05-citizens/processAdvancementIntake.js:1082   READ — getSheetByName('Cultural_Ledger')
  phase07-evening-media/culturalLedger.js:76       READ — getSheetByName('Cultural_Ledger')
  phase07-evening-media/culturalLedger.js:88       INTENT queueCellIntent_ → 'Cultural_Ledger'
  phase07-evening-media/culturalLedger.js:103      READ — getSheetByName('Cultural_Ledger')
  phase07-evening-media/culturalLedger.js:462,468,474,477,478,482,488,495,500   INTENT queueCellIntent_ → multiple columns
  phase07-evening-media/culturalLedger.js:584      INTENT queueAppendIntent_ → CREATE new row
  phase07-evening-media/buildEveningFamous.js:46   calls decayCulturalFame_(ctx)
  phase07-evening-media/buildEveningFamous.js:581  calls registerCulturalEntity_(ctx, ...)
  phase07-evening-media/mediaRoomIntake.js:792     READ — getSheetByName('Cultural_Ledger')
  phase10-persistence/cycleExportAutomation.js:67  READ — array export constant
  phase10-persistence/recordMediaLedger.js:47      READ — getSheetByName('Cultural_Ledger')
  utilities/ensureCultureLedger.js:13              READ — requireTab_(ctx.ss, 'Cultural_Ledger')
  utilities/sheetNames.js:44                        CONSTANT — CULTURAL_LEDGER: 'Cultural_Ledger'

WRITE PATH
  INTENT queueCellIntent_   phase07-evening-media/culturalLedger.js:88   decayCulturalFame_ → FameScore (quiet-cycle decay, engine.68)
  INTENT queueCellIntent_   phase05-citizens/processAdvancementIntake.js:1068   dimCulturalFame_ → FameScore (engine.118 brief/dim)
  INTENT queueCellIntent_   phase07-evening-media/culturalLedger.js:462,468,474,477,478,482,488,495,500   registerCulturalEntity_ → LastSeenCycle,MediaCount,FameScore,FameCategory,CulturalDomain,Neighborhood,UniverseLinks,LastSeenHoliday,CalendarContext
  INTENT queueAppendIntent_  phase05-citizens/generationalWealthEngine.js:2661   updateHeritage_ → append row (heritage link, engine.90)
  INTENT queueAppendIntent_  phase07-evening-media/culturalLedger.js:584   registerCulturalEntity_ → CREATE new row (engine.118 cut 3b)

CALLER ENTRY POINTS
  updateHeritage_ entry:       processGenerationalWealth_() @ phase05-citizens/generationalWealthEngine.js:199  →  Phase5-GenerationalWealth
  dimCulturalFame_ entry:      processAdvancementIntake_() @ phase05-citizens/processAdvancementIntake.js:530  →  Phase5-Advancement
  decayCulturalFame_ entry:    buildEveningFamous_() @ phase07-evening-media/buildEveningFamous.js:46  →  Phase7-Famous
  registerCulturalEntity_ entry: buildEveningFamous_() @ phase07-evening-media/buildEveningFamous.js:581  →  Phase7-Famous

OPEN WORK
  2026-05-30-citizen-lifecycle-fame-system.md  engine.29 — Citizen Lifecycle & Fame System (ascension/decay, POPID linkage, SL minting; Phase C + Phase D)
  2026-07-18-event-pools-design.md:140–153  engine.68 — Cultural_Ledger joins antenna (fame pooling, ECL conditions, recognition pool, FAME_WATCH hook)
  2026-08-07-spacemolt-game-show.md:212–223  CUL/POPID gap quantified: 21 of 46 rows (46% of ledger) have no POPID link; full reconciliation needed
  2026-09-02-bloodline-ascent.md:426–429  engine.118 cut 3b LIVE — cultural entity fame brightening + POPID backfill live @S412 (one-file overlay)

HISTORY
  9fa4cf43  S427 engine.148 P3 — texture pools key by hood place label; arts/holiday lists are Neighborhood_Map column
  07d61a45  S352 engine.99 Cohort 2 — core-sim subset becomes ledger truth (CoreSimRank)
  a503d6c1  S325 engine.68: Cultural_Ledger joins antenna — fame is its own attention (Mike doctrine)
  ed600619  S301 engine.44 Class 3 — weather-streak carry + Cultural_Ledger POPID + education re-seed
  acc40a81  S290 engine.44 Class 1 REOPENED+completed — 12 writers missed by first pass
  cede1e95  S237 Phase 42 §B6 — culturalLedger v2.4 → v2.5 (writeIntents migration + same-cycle dedup fix)

FILES SCANNED
  phase01-config/godWorldEngine2.js
  phase05-citizens/citizenContextBuilder.js
  phase05-citizens/generationalWealthEngine.js
  phase05-citizens/processAdvancementIntake.js
  phase07-evening-media/buildEveningFamous.js
  phase07-evening-media/culturalLedger.js
  phase07-evening-media/mediaRoomIntake.js
  phase10-persistence/cycleExportAutomation.js
  phase10-persistence/recordMediaLedger.js
  utilities/ensureCultureLedger.js
  utilities/sheetNames.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/plans/2026-05-30-citizen-lifecycle-fame-system.md
  docs/plans/2026-07-18-event-pools-design.md
  docs/plans/2026-08-07-spacemolt-game-show.md
  docs/plans/2026-09-02-bloodline-ascent.md

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **78** (59%)
- never opened: **54**

<details><summary>files this report did NOT look at</summary>

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
- phase09-digest/applyCompressionDigestSummary.js
- phase09-digest/applyCycleWeight.js
- phase09-digest/finalizeCycleState.js
- phase09-digest/finalizeCycleState.test.js

</details>

_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=26 toolCalls=40 in=823741 out=9350_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._