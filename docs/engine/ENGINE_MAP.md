# GodWorld Engine Map

**What this is:** Every function the engine calls, in execution order. What file it lives in, what it does.

**Source:** `phase01-config/godWorldEngine2.js` v2.14 — two identical engine paths (live + dry-run/replay).

**Last verified:** 2026-03-23, Session 113 (engine phases unchanged since S83; post-engine pipeline updated S113)

---

## Phase 1: CONFIG + TIME

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 1-LoadConfig | `loadConfig_()` | godWorldEngine2.js | Load World_Config sheet, set ctx.config |
| 1-AdvanceTime | `advanceWorldTime_()` | godWorldEngine2.js | Increment cycle counter, set simulation date |
| 1-Calendar | `advanceSimulationCalendar_()` | phase01-config/advanceSimulationCalendar.js | Set holiday, season, isFirstFriday, isCreationDay on ctx.summary |
| 1-ResetAudit | `resetCycleAuditIssues_()` | godWorldEngine2.js | Clear previous cycle's audit flags |

**ctx.summary after Phase 1:** `cycleId`, `simDate`, `simYear`, `season`, `holiday`, `holidayPriority`, `isFirstFriday`, `isCreationDay`

---

## Phase 2: WORLD STATE

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 2-SeasonalWeights | `applySeasonalWeights_()` | phase02-world-state/applySeasonWeights.js | Season-based multipliers for event domains |
| 2-SportsSeason | `applySportsSeason_()` | phase02-world-state/applySportsSeason.js | Set sportsSeason (off-season/regular/playoffs/championship) |
| 2-SportsFeed | `applySportsFeedTriggers_()` | godWorldEngine2.js (v2.14) | Read Sports_Feed sheet for game results |
| 2-Weather | `applyWeatherModel_()` | phase02-world-state/applyWeatherModel.js | Temperature, precipitation, visibility, wind, fronts |
| 2-CityDynamics | `applyCityDynamics_()` | phase02-world-state/applyCityDynamics.js | Sentiment, cultural activity, community engagement, nightlife |
| 2-Transit | `updateTransitMetrics_Phase2_()` | phase02-world-state/updateTransitMetrics.js | Transit ridership, delays, construction status |

**ctx.summary after Phase 2:** adds `weather`, `sportsSeason`, `sportsFeed`, `cityDynamics`, `seasonalWeights`, `transitMetrics`

---

## Phase 3: POPULATION + DEMOGRAPHICS

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 3-Population | `updateWorldPopulation_()` | godWorldEngine2.js | Birth/death/migration numbers for World_Population |
| 3-Demographics | `applyDemographicDrift_()` | phase03-population/applyDemographicDrift.js | Age/income/education shifts across neighborhoods |
| 3-CrisisSpikes | `generateCrisisSpikes_()` | phase03-population/generateCrisisSpikes.js | Acute crisis events (housing, health, etc.) |
| 3-CrisisBuckets | `generateCrisisBuckets_()` | phase03-population/generateCrisisBuckets.js | Categorize crisis events by domain |
| 3-Crime | `updateCrimeMetrics_Phase3_()` | phase03-population/updateCrimeMetrics.js | QoL index, patrol strategy, hotspots, enforcement capacity |
| 3-NeighborhoodDemo | `updateNeighborhoodDemographics_()` | phase03-population/updateNeighborhoodDemographics.js | Per-neighborhood population/income/age stats |

**ctx.summary after Phase 3:** adds `populationMetrics`, `demographicDrift`, `crisisSpikes`, `crisisBuckets`, `crimeMetrics`

---

## Phase 4: RECOVERY + WORLD EVENTS

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 4-CycleRecovery | `applyCycleRecovery_()` | phase08-v3-chicago/applyCycleRecovery.js | Recover stale/stuck state from previous cycles |
| 4-DomainCooldowns | `applyDomainCooldowns_()` | phase08-v3-chicago/applyDomainCooldowns.js | Prevent domain event spam (cooldown timers) |
| 4-WorldEvents | `worldEventsEngine_()` | phase04-events/worldEventsEngine.js | Generate chaos/crisis world events |
| 4-FaithEvents | `runFaithEventsEngine_()` | phase04-events/faithEventsEngine.js | Faith community events |

**ctx.summary after Phase 4:** adds `worldEvents`, `faithEvents`, `domainCooldowns`

---

## Phase 5: CITIZENS + RELATIONSHIPS (largest phase)

### 5a: Event Generation

| Step | Function | File | Who it processes | Gate |
|------|----------|------|-----------------|------|
| 5-GenericCitizens | `generateGenericCitizens_()` | phase05-citizens/generateGenericCitizens.js | Creates new Tier-4 citizens | — |
| 5-GenericMicroEvents | `generateGenericCitizenMicroEvents_()` | phase04-events/generateGenericCitizenMicroEvent.js | Tier 3-4 ENGINE citizens | ClockMode check |
| 5-GameModeMicroEvents | `generateGameModeMicroEvents_()` | phase04-events/generateGameModeMicroEvents.js | GAME mode citizens | `mode !== "GAME"` skip |
| 5-CivicModeEvents | `generateCivicModeEvents_()` | phase05-citizens/generateCivicModeEvents.js | CIVIC mode citizens | `mode !== "CIVIC"` skip |
| 5-MediaModeEvents | `generateMediaModeEvents_()` | phase05-citizens/generateMediaModeEvents.js | MEDIA mode citizens | `mode !== "MEDIA"` skip |

### 5b: Schema Ensure (idempotent setup)

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 5-EnsureEventsLedger | `ensureWorldEventsLedger_()` | phase04-events/worldEventsLedger.js | Ensure World_Events sheet exists |
| 5-EnsureMediaLedger | `ensureMediaLedger_()` | utilities/ensureMediaLedger.js | Ensure Media_Ledger sheet exists |
| 5-EnsureEventsV3 | `ensureWorldEventsV3Ledger_()` | utilities/ensureWorldEventsV3Ledger.js | Ensure v3 events ledger exists |
| 5-EnsureBonds | `ensureRelationshipBondSchemas_()` | utilities/ensureRelationshipBonds.js | Ensure bond sheets exist |

### 5c: Relationship + Civic Systems

| Step | Function | File | Who it processes | Gate |
|------|----------|------|-----------------|------|
| 5-LoadBonds | `loadRelationshipBonds_()` | phase05-citizens/bondPersistence.js | All citizens | — |
| 5-SeedBonds | `seedRelationshipBonds_()` | phase05-citizens/seedRelationBondsv1.js | Citizens without bonds | — |
| 5-Relationships | `runRelationshipEngine_()` | phase05-citizens/runRelationshipEngine.js | ENGINE citizens without UNI/MED/CIV flags | `isUNI\|\|isMED\|\|isCIV` skip |
| 5-Neighborhoods | `runNeighborhoodEngine_()` | phase05-citizens/runNeighborhoodEngine.js | ENGINE citizens without UNI/MED/CIV flags | `isUNI\|\|isMED\|\|isCIV` skip |
| 5-Universe | `runAsUniversePipeline_()` | phase05-citizens/runAsUniversePipeline.js | UNI-flagged citizens ONLY | `!isUNI` skip |
| 5-CivicRoles | `runCivicRoleEngine_()` | phase05-citizens/runCivicRoleEngine.js | CIV-flagged citizens | CIV check |
| 5-Elections | `runCivicElections_()` | phase05-citizens/runCivicElectionsv1.js | Council election logic | — |
| 5-Initiatives | `runCivicInitiativeEngine_()` | phase05-citizens/civicInitiativeEngine.js | Initiative_Tracker sheet | — |

### 5d: Lifecycle Engines (ENGINE mode only, flag-excluded)

| Step | Function | File | Gate |
|------|----------|------|------|
| 5-Career | `runCareerEngine_()` | phase05-citizens/runCareerEngine.js | `isUNI\|\|isMED\|\|isCIV` skip |
| 5-Education | `runEducationEngine_()` | phase05-citizens/runEducationEngine.js | `isUNI\|\|isMED\|\|isCIV` skip |
| 5-Household | `runHouseholdEngine_()` | phase05-citizens/runHouseholdEngine.js | `isUNI\|\|isMED\|\|isCIV` skip |
| 5-Generational | `runGenerationalEngine_()` | phase04-events/generationalEventsEngine.js | `mode !== "ENGINE" && mode !== "CIVIC"` skip |
| 5-Youth | `runYouthEngine_()` | phase05-citizens/runYouthEngine.js | Age-gated |

### 5e: Bond Processing

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 5-Bonds | `runBondEngine_()` | phase05-citizens/bondEngine.js | Process alliance/rivalry/mentorship bonds |

### 5f: Intake + Named Citizen Updates

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 5-Intake | `processIntake_()` | phase05-citizens/processIntakeV3.js | Process new citizen intake rows |
| 5-NamedCitizens | `updateNamedCitizens_()` | godWorldEngine2.js | Update named citizen status/fields |
| 5-CitizenEvents | `generateCitizensEvents_()` | phase05-citizens/generateCitizensEvents.js | ENGINE-only citizen life events (rich pipeline) |
| 5-Promotions | `checkForPromotions_()` | phase05-citizens/checkForPromotions.js | Career promotions |
| 5-Advancement | `processAdvancementIntake_()` | phase05-citizens/processAdvancementIntake.js | Process advancement intake rows |

### 5g: Tier-5 Engines (direct sheet writes)

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 5-HouseholdFormation | `processHouseholdFormation_()` | phase05-citizens/householdFormationEngine.js | Marriage, household creation |
| 5-GenerationalWealth | `processGenerationalWealth_()` | phase05-citizens/generationalWealthEngine.js | Wealth accumulation, inheritance |
| 5-EducationCareer | `processEducationCareer_()` | phase05-citizens/educationCareerEngine.js | Education-career link |
| 5-Gentrification | `processGentrification_()` | phase05-citizens/gentrificationEngine.js | Displacement risk, neighborhood change |
| 5-MigrationTracking | `processMigrationTracking_()` | phase05-citizens/migrationTrackingEngine.js | Migration intent, movement |

---

## Phase 6: ANALYSIS + PATTERN DETECTION

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 6-FilterNoise | `filterNoiseEvents_()` | phase06-analysis/filterNoiseEvents.js | Remove low-signal events |
| 6-Prioritize | `prioritizeEvents_()` | phase06-analysis/prioritizeEvents.js | Rank events by importance |
| 6-Spotlights | `applyNamedCitizenSpotlights_()` | phase05-citizens/applyNamedCitizenSpotlight.js | Highlight named citizens for coverage |
| 6-RecurringCitizens | `computeRecurringCitizens_()` | phase06-analysis/computeRecurringCitizens.js | Identify citizens appearing in multiple data sources |
| 6-CivicLoad | `applyCivicLoadIndicator_()` | phase06-analysis/applyCivicLoadIndicator.js | Civic system strain level |
| 6-EconomicRipple | `runEconomicRippleEngine_()` | phase06-analysis/economicRippleEngine.js | Business economic triggers |
| 6-InitiativeRipple | `applyActiveInitiativeRipples_()` | (conditional) | Initiative cascading effects |
| 6-Migration | `applyMigrationDrift_()` | phase06-analysis/applyMigrationDrift.js | Population movement trends |
| 6-PatternDetect | `applyPatternDetection_()` | phase06-analysis/applyPatternDetection.js | Multi-cycle pattern recognition |
| 6-ShockMonitor | `applyShockMonitor_()` | phase06-analysis/applyShockMonitor.js | Detect sudden state changes |
| ~~6-ArcLifecycle~~ | ~~`processArcLifecycle_()`~~ | — | **Moved to Phase 8** (S116). Was no-op here — arcs load in Phase 8. |
| ~~6-StorylineStatus~~ | ~~`updateStorylineStatus_()`~~ | — | **Moved to Phase 8** (S116). Depends on arc data. |
| 6-Textures | `textureTriggerEngine_()` | phase07-evening-media/textureTriggers.js | Generate neighborhood texture triggers |
| 6-TransitSignals | `getTransitStorySignals_()` | (conditional) | Transit-related story signals |
| 6-FaithSignals | `getFaithStorySignals_()` | (conditional) | Faith-related story signals |
| 6.5-Validation | `prePublicationValidation_()` | phase06-analysis/prePublicationValidation.js | Data integrity checks |

---

## Phase 7: EVENING MEDIA + STORY GENERATION

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 7-CityEvents | `buildCityEvents_()` | phase04-events/buildCityEvents.js | City-level event compilation. **SETS** `S.cityEvents` |
| 7-Nightlife | `buildNightlife_()` | phase07-evening-media/buildNightLife.js | Nightlife scene generation. **SETS** `S.nightlife`, `S.nightlifeVolume` |
| 7-Sports | `buildEveningSportsAndStreaming_()` | phase07-evening-media/sportsStreaming.js | Sports broadcasts, streaming. **SETS** `S.eveningSports` |
| 7-Food | `buildEveningFood_()` | phase07-evening-media/buildEveningFood.js | Restaurant/food scene events. Reads `S.nightlifeVolume` |
| 7-Famous | `buildEveningFamous_()` | phase07-evening-media/buildEveningFamous.js | Celebrity/famous citizen sightings. Reads `S.eveningSports` |
| 7-EveningMedia | `buildEveningMedia_()` | phase07-evening-media/buildEveningMedia.js | TV, movies, streaming selection. Reads `S.eveningSports` |
| 7-CitySystems | `buildCityEveningSystems_()` | phase07-evening-media/cityEveningSystems.js | Infrastructure/transit evening updates. Reads `S.nightlife`, `S.eveningSports`, `S.cityEvents` |
| 7-MediaPacket | `buildMediaPacket_()` | phase07-evening-media/buildMediaPacket.js | Compile media room briefing packet |
| 7-MediaFeedback | `runMediaFeedbackEngine_()` | phase07-evening-media/mediaFeedbackEngine.js | Media coverage feedback loops |
| 7-SeasonalSeeds | `applySeasonalStorySeeds_()` | phase07-evening-media/buildEveningMedia.js | Season-specific story prompts |
| 7-ChaosWeights | `applyChaosCategoryWeights_()` | phase02-world-state/calendarChaosWeights.js | Holiday/calendar chaos modifiers |
| 7-StorySeeds | `applyStorySeeds_()` | phase07-evening-media/applyStorySeeds.js | Inject story seeds for next cycle |

---

## Phase 8: V3 INTEGRATION + CHICAGO

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 8-CycleWeight | `applyCycleWeightForLatestCycle_()` | phase09-digest/applyCycleWeightForLatestCycle.js | Signal scoring (low/medium/high) |
| 8-V3Preload | `v3PreloadContext_()` | phase08-v3-chicago/v3preLoader.js | Load arc/domain/neighborhood state from ledgers. **LOADS** `S.eventArcs` |
| 8-ArcLifecycle | `processArcLifecycle_()` | phase06-analysis/arcLifecycleEngine.js | Advance arc phases (early→rising→peak→decline→resolved). **Moved from Phase 6 S116** |
| 8-StorylineStatus | `updateStorylineStatus_()` | phase06-analysis/updateStorylineStatusv1.2.js | Track storyline health. **Moved from Phase 6 S116** |
| 8-StorylineHealth | `monitorStorylineHealth_()` | phase06-analysis/hookLifecycleEngine.js | Monitor storyline decay. **Moved from Phase 6 S116** |
| 8-V3Integration | `v3Integration_()` | phase08-v3-chicago/v3Integration.js | V3 module orchestrator (arcs, domains, textures, hooks) |
| 8-DemographicDrift | `deriveDemographicDrift_()` | phase03-population/deriveDemographicDrift.js | Derive drift metrics |
| 8-ChicagoCitizens | `generateChicagoCitizens_()` | phase05-citizens/generateChicagoCitizensv1.js | Chicago bureau citizen generation |

---

## Phase 9: DIGEST + COMPRESSION

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 9-DigestSummary | `applyCompressedDigestSummary_()` | phase09-digest/applyCompressionDigestSummary.js | Compress cycle data for summary |
| 9-CompressLifeHistory | `compressLifeHistory_()` | utilities/compressLifeHistory.js | LifeHistory → TraitProfile compression |
| 9-FinalizePopulation | `finalizeWorldPopulation_()` | phase03-population/finalizeWorldPopulation.js | Lock population numbers |
| 9-FinalizeCycleState | `finalizeCycleState_()` | phase09-digest/finalizeCycleState.js | Lock cycle state |

---

## Phase 10: PERSISTENCE

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 10-WriteDigest | `writeDigest_()` | godWorldEngine2.js | Write cycle digest to sheet |
| 10-CycleWeather | `recordCycleWeather_()` | phase10-persistence/recordCycleWeather.js | Archive weather to ledger |
| 10-RecordEvents25 | `recordWorldEvents25_()` | phase10-persistence/recordWorldEventsv25.js | Archive events (v2.5 format) |
| 10-RecordEventsV3 | `recordWorldEventsv3_()` | phase10-persistence/recordWorldEventsv3.js | Archive events (v3 format) |
| 10-NeighborhoodMap | `saveV3NeighborhoodMap_()` | phase08-v3-chicago/v3NeighborhoodWriter.js | Persist neighborhood state |
| 10-Arcs | `saveV3ArcsToLedger_()` | phase08-v3-chicago/v3LedgerWriter.js | Persist arc state to Event_Arc_Ledger |
| 10-Bonds | `saveRelationshipBonds_()` | phase05-citizens/bondPersistence.js | Persist bonds to sheet |
| 10-BondLedger | `saveV3BondsToLedger_()` | phase08-v3-chicago/v3LedgerWriter.js | Persist bonds (v3 format) |
| 10-Domains | `saveV3Domains_()` | phase08-v3-chicago/v3DomainWriter.js | Persist domain state |
| 10-Seeds | `saveV3Seeds_()` | phase10-persistence/saveV3Seeds.js | Persist story seeds |
| 10-Hooks | `saveV3Hooks_()` | phase08-v3-chicago/v3StoryHookWriter.js | Persist story hooks |
| 10-Textures | `saveV3Textures_()` | phase08-v3-chicago/v3TextureWriter.js | Persist texture triggers |
| 10-Chicago | `saveV3Chicago_()` | phase08-v3-chicago/v3ChicagoWriter.js | Persist Chicago state |
| 10-CyclePacket | `buildCyclePacket_()` | phase10-persistence/buildCyclePacket.js | Build JSON cycle packet |
| 10-MediaBriefing | `generateMediaBriefing_()` | phase07-evening-media/mediaRoomBriefingGenerator.js | Generate media room briefing |
| 10-MediaLedger | `recordMediaLedger_()` | phase10-persistence/recordMediaLedger.js | Archive media events |
| 10-CycleSeed | `saveCycleSeed_()` | phase10-persistence/saveV3Seeds.js | Save RNG seed for replay |
| 10-ExecuteIntents | `executePersistIntents_()` | utilities/writeIntents.js | Execute all deferred write-intents |

---

## Phase 11: MEDIA INTAKE

| Step | Function | File | Purpose |
|------|----------|------|---------|
| 11-MediaIntake | `processMediaIntake_()` | phase11-media-intake/healthCauseIntake.js | Process health cause assignments from media room |

---

## Post-Engine Pipeline (Local Node.js — runs AFTER engine cycle)

These scripts run locally on the droplet after the GAS engine completes. They transform engine output into agent workspaces and close the feedback loop. Full pipeline order in `/run-cycle` SKILL.md Steps 4a-4f.

| Step | Script | Purpose |
|------|--------|---------|
| 4a | `buildDeskPackets.js` | Split Cycle_Packet into per-desk JSON packets + truesource + citizen archive |
| 4b | `buildInitiativePackets.js` | Per-initiative packets from 7 sheets + previous voice decisions |
| 4c | `buildInitiativeWorkspaces.js` | Populate initiative agent workspaces |
| 4c.5 | `applyTrackerUpdates.js` | **Write initiative decisions back to Initiative_Tracker sheet.** Closes the world-action loop. Dry run by default, `--apply` for live writes. |
| 4c.6 | `buildDecisionQueue.js` | Map initiative blockers to voice agent offices. Writes `pending_decisions.md` with A/B/C options and consequences. |
| 4d | `buildVoiceWorkspaces.js` | Per-agent workspaces with domain briefings, RD political lens injection |
| 4e | `buildDeskFolders.js` | Per-desk workspaces with voice distribution, briefings, errata, RD creative lens injection |
| 4f | `checkSupplementalTriggers.js` | Scan civic data for supplemental edition candidates |

**Added S113:** Steps 4c.5 and 4c.6 close the voice-agent-world-action-pipeline. Initiative agents make operational decisions → `applyTrackerUpdates.js` writes them to the sheet → `buildDecisionQueue.js` maps blockers to voice agents → voice agents read `pending_decisions.md` and respond → their decisions feed into the next cycle via `buildInitiativePackets.js`. The city moves itself.

---

## Files NOT Called by the Engine

These exist in the codebase but are NOT in the engine call chain:

| File | Status |
|------|--------|
| `phase05-citizens/generateNamedCitizensEvents.js` | **Dead code** — never called |
| `phase05-citizens/generateMonthlyCivicSweep.js` | Not in engine — standalone script? |
| `phase05-citizens/updateCivicLedgerFactions.js` | Not in engine — setup script |
| `phase06-analysis/hookLifecycleEngine.js` | Not in engine |
| `phase06-analysis/storylineHealthEngine.js` | Not in engine |
| `phase06-analysis/processArcLifeCyclev1.js` | Superseded by arcLifecycleEngine.js |
| `phase07-evening-media/storylineWeavingEngine.js` | Not in engine |
| `phase07-evening-media/culturalLedger.js` | Not in engine |
| `phase07-evening-media/citizenFameTracker.js` | Not in engine |
| `phase07-evening-media/domainTracker.js` | Not in engine |
| `phase07-evening-media/updateMediaSpread.js` | Not in engine |
| `phase07-evening-media/updateTrendTrajectory.js` | Not in engine |
| `phase07-evening-media/parseMediaIntake.js` | Helper |
| `phase07-evening-media/parseMediaRoomMarkdown.js` | Helper |

---

## Bond Engine Bug Fixes (S83, Phase 23.8)

| Bug | File | Fix |
|-----|------|-----|
| POPID vs name lookup | seedRelationBondsv1.js | Seeder now reads `First`/`Last` columns (not `Name`), composes full name. POPIDs normalized to trimmed uppercase on store. |
| Header collision guard too narrow | bondPersistence.js | `isLedgerSchema_` now case-insensitive, also checks `action`/`changetype` columns. |
| Full replace wipe | bondPersistence.js | `saveRelationshipBonds_` skips save if ctx has 0 bonds but sheet has existing rows. Prevents accidental wipe. |
| Inconsistent ID normalization | bondPersistence.js, runRelationshipEngine.js | `getCitizenBondsFromStorage_`, `getBondBetween_`, `getCitizenBonds_` all normalize IDs to trimmed uppercase before comparison. |

---

## CIVIC Clock Mode Activation (S83, Phase 22.1)

6 council members flipped from GAME→CIVIC, Tier 3→2:
- Avery Santana (Mayor), Marcus Osei, Elliott Crane, Ramon Vega, Aaron Whitfield, Theo Park
- `generateCivicModeEvents_` already wired at Phase 5 — now has citizens to process
- `generateCivicModeEvents.js` hex literal fix: `0xC1V1C` → `0xC1C1C` (invalid hex digit)
- Crane Status="recovering", Osei Status="serious-condition" — enables healthPenalty logic

## MEDIA Clock Mode Activation (S94, Phase 24.1)

16 Bay Tribune journalists migrated GAME→MEDIA:
- Mags Corliss (EIC), Hal Richmond, P Slayer, Jordan Velez, Lila Mezran, Trevor Shimizu, Angela Reyes, Noah Tan, Kai Marston, Sharon Okafor, Mason Ortega, Farrah Del Rio, Reed Thompson, Celeste Tran, Arman Gutierrez, Elliot Marbury
- `generateMediaModeEvents_` wired at Phase 5a after CivicModeEvents
- 7 role-specific event pools: editor, columnist, reporter, podcast-host, photographer, analyst, media-staff
- Base chance 20%, T1 +10%, T2 +5%, cap 45%
- Context-aware: reads civic load, sentiment, crime, weather, sports season, cultural activity
- 87 A's players expanded from bare position abbreviations to "Position, Team" format
- 62 T3 minor leaguers assigned to farm teams (AAA/AA/A affiliates)

**Current ClockMode breakdown (S105 audit):** ENGINE 509, GAME 91, CIVIC 46, MEDIA 29, LIFE 0

---

## Arc Engine Investigation (S83, Phase 22.2)

All 37 arcs stuck at phase "early" despite tension ≥3. Diagnostic logging added to `eventArcEngine_` v3.7.
- Phase progression code is correct: `early→rising (t≥3)→peak (t≥5)→decline (t≤4)→resolved (t≤1.5)`
- Staleness pruning (8+ cycles at early) also not firing
- Tension IS changing between cycles, confirming engine runs
- Root cause likely deployment drift — all code synced via `clasp push` S83
- Batch report found: `involvedCitizens` hardcoded to `[]` in `v3preLoader.js:208`, arcs excluded from desk packets

---

## Known Classification Issues (updated S106)

| Issue | Count | Description |
|-------|-------|-------------|
| `LIFE` mode citizens | 0 | S105 audit found 0 LIFE-mode citizens on live sheet. Previously 25. Likely reclassified during S94 recovery. |
| MED+CIV double flag | 3 | Undefined behavior — both flags trigger the same exclusions |
| GAME + no flags | 7 | Get GAME micro-events but classified as generic public-figure type |
| Tier 1-2 with zero processing | varies | Any Tier 1-2 with conflicting flag/mode |
| **RESOLVED (S106):** UNI/MED/CIV flag check | 9 files | Flag comparison fixed from `=== "y"` to `.startsWith("y")`. Skip gates now fire correctly. Deployed to GAS. |
| **RESOLVED (S94):** MEDIA mode | 16→29 | Bay Tribune journalists processed by `generateMediaModeEvents_`. Count updated S105 (29 on live sheet). |
