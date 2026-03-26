# Engine Stub Map

**Generated:** 2026-03-26 | **Session:** 120 | **Files:** 122 JS across 11 phases + utilities

**Purpose:** Compact reference of every engine function's ctx footprint. Use after compaction, cold starts, or when debugging cascade dependencies.

**Convention:** All engine files alias `var S = ctx.summary`. Reads/writes listed as `S.field` mean `ctx.summary.field`.

---

## Phase 1: Config + Time (phase01-config/)

### godWorldEngine2.js — Main Orchestrator
- **loadConfig_(ctx)**
  Writes: ctx.config.*, ctx.summary.*
  Sheets: World_Config

- **advanceWorldTime_(ctx)**
  Reads: ctx.config.cycleCount
  Writes: ctx.config.cycleCount, S.cycleId, S.cycleRef
  Sheets: World_Config

- **resetCycleAuditIssues_(ctx)**
  Writes: S.auditIssues

### advanceSimulationCalendar.js
- **advanceSimulationCalendar_(ctx)**
  Reads: ctx.config.cycleCount, S.cycleId
  Writes: S.{absoluteCycle, godWorldYear, cycleOfYear, cycleInMonth, simYear, simMonth, simDay, monthName, season, holiday, holidayDetails, holidayPriority, holidayNeighborhood, isFirstFriday, isCreationDay, creationDayAnniversary, weather, weatherMood}
  Sheets: Simulation_Calendar

### loadPreviousEvening.js
- **loadPreviousEvening_(ctx)**
  Reads: PropertiesService (PREV_EVENING_JSON)
  Writes: S.previousEvening

**ctx after Phase 1:** cycleId, simDate, simYear, season, holiday, holidayPriority, isFirstFriday, isCreationDay, previousEvening

---

## Phase 2: World State (phase02-world-state/)

### applySeasonWeights.js
- **applySeasonalWeights_(ctx)**
  Reads: S.{season, holiday, holidayPriority, sportsSeason, economicMood, weatherMood, isFirstFriday, isCreationDay, cycleOfYear, mediaEffects}
  Writes: S.seasonal (weight map: weatherWeight, civicWeight, eventWeight, nightlifeWeight, schoolWeight, sportsWeight, economicWeight, mediaWeight, culturalWeight, communityWeight)

### applySportsSeason.js
- **applySportsSeason_(ctx)**
  Reads: ctx.config.{sportsState_Oakland, sportsState_Chicago}, S.simMonth
  Writes: S.{sportsSeason, sportsSeasonOakland, sportsSeasonChicago, activeSports, sportsSource}

- **applySportsFeedTriggers_(ctx)**
  Reads: S.{sportsSeason, cycleOfYear}
  Writes: S.{sportsEvents, sportsContext}
  Sheets: Sports_Feed

### applyWeatherModel.js
- **applyWeatherModel_(ctx)**
  Reads: ctx.config.{rngSeed, cycleCount}, S.{absoluteCycle, season, holiday, isFirstFriday, isCreationDay}
  Writes: S.{weather, weatherMood, weatherEvents, weatherTracking, neighborhoodWeather}

### applyCityDynamics.js
- **applyCityDynamics_(ctx)**
  Reads: ctx.config.{manualDynamicsInputs, cityCapacity}, S.{cycleId, season, economicMood}
  Writes: S.cityDynamics (sentiment, publicSpaces, nightlife, culturalActivity, communityEngagement)
  Sheets: City_Dynamics

### updateTransitMetrics.js
- **updateTransitMetrics_Phase2_(ctx)**
  Reads: S.{season, economicMood, worldEvents, absoluteCycle}
  Writes: S.{transitMetrics, transitAlerts, transitStorySignals}
  Sheets: Transit_Metrics, World_Population, Civic_Ledger

### calendarChaosWeights.js
- **applyChaosCategoryWeights_(ctx)**
  Reads: S.{worldEvents, chaos}
  Writes: S.chaosWeight

### calendarStorySeeds.js
- **applySeasonalStorySeeds_(ctx)**
  Reads: S.{season, holiday, weather}
  Writes: S.storySeeds

**ctx adds after Phase 2:** weather, sportsSeason, sportsFeed, cityDynamics, seasonalWeights, transitMetrics

---

## Phase 3: Population + Demographics (phase03-population/)

### updateWorldPopulation_ (in godWorldEngine2.js)
  Reads: ctx.config.cycleCount
  Writes: S.{worldPopulation, populationHistory, populationMetrics}
  Sheets: World_Population, Population_History

### applyDemographicDrift.js
- **applyDemographicDrift_(ctx)**
  Reads: S.{season, weather, weatherMood, economicMood, holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, cityDynamics, worldEvents}
  Writes: World_Population (illnessRate, employmentRate, migration, economy)
  Sheets: World_Population (direct writes)

### generateCrisisSpikes.js
- **generateCrisisSpikes_(ctx)**
  Reads: S.{economicMood, sentiment, chaos, weatherMood}
  Writes: S.crisisSpikes
  Sheets: Population_Stats

### generateCrisisBuckets.js
- **generateCrisisBuckets_(ctx)**
  Reads: S.{crisisSpikes, season, holiday}
  Writes: S.crisisBuckets

### updateCrimeMetrics.js
- **updateCrimeMetrics_Phase3_(ctx)**
  Reads: S.{season, economicMood, weather, sentiment, civicLoad, chaos}
  Writes: Neighborhood_Map, Population_Stats (crimeIndex, responseTime, clearanceRate)
  Sheets: Neighborhood_Map, Population_Stats (direct writes)

### updateNeighborhoodDemographics.js
- **updateNeighborhoodDemographics_(ctx)**
  Reads: S.{cityDynamics, populationMetrics, worldEvents}
  Writes: Neighborhood_Map (density, sentiment, culturalMix)
  Sheets: Neighborhood_Map (direct writes)

**ctx adds after Phase 3:** populationMetrics, demographicDrift, crisisSpikes, crisisBuckets, crimeMetrics

---

## Phase 4: Recovery + World Events (phase04-events/)

### applyCycleRecovery.js (in phase08-v3-chicago/)
- **applyCycleRecovery_(ctx)**
  Reads: S.{cycleId, overloadScore, activeCooldowns, previousCycleState}
  Writes: S.{recoveryLevel, overloadScore, activeCooldowns}

### applyDomainCooldowns.js (in phase08-v3-chicago/)
- **applyDomainCooldowns_(ctx)**
  Reads: S.{cycleId, domainPresence, eventArcs, worldEvents}
  Writes: S.domainCooldowns
  Sheets: Domain_Cooldown_Ledger

### worldEventsEngine.js
- **worldEventsEngine_(ctx)**
  Reads: ctx.config.rngSeed, S.{absoluteCycle, seasonal, weather, cityDynamics, civicLoad, nightlifeVolume, shockFlag, patternFlag, migrationDrift, previousCycleState, holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, domainCooldowns}
  Writes: S.{worldEvents, worldEventDetails, eventCategories}

### faithEventsEngine.js
- **runFaithEventsEngine_(ctx)**
  Reads: S.{season, holiday, simMonth, economicMood, chaos}
  Writes: S.{faithEvents, faithEventDetails}
  Sheets: Faith_Organizations

**ctx adds after Phase 4:** worldEvents, faithEvents, domainCooldowns

---

## Phase 5: Citizens + Relationships (phase05-citizens/) — Largest Phase

### 5a: Event Generation

**generateGenericCitizens.js**
- **generateGenericCitizens_(ctx)**
  Reads: S.cycleId, ctx.config.{rngSeed, cycleCount}
  Writes: S.genericCitizensDistribution
  Sheets: Generic_Citizens

**generateGenericCitizenMicroEvent.js** (in phase04-events/)
- **generateGenericCitizenMicroEvents_(ctx)** — Tier 3-4 ENGINE citizens
  Reads: S.{season, sentiment, weather}

**generateGameModeMicroEvents.js** (in phase04-events/)
- **generateGameModeMicroEvents_(ctx)** — GAME citizens
  Reads: S.{gameMode, worldEvents, season}
  Sheets: Simulation_Ledger

**generateCivicModeEvents.js**
- **generateCivicModeEvents_(ctx)** — CIVIC citizens
  Reads: S.{cycleId, weather, cityDynamics, civicLoad, crimeMetrics, eventArcs, holiday, sportsSeason, votesThisCycle, grantsThisCycle}
  Sheets: Simulation_Ledger, LifeHistory_Log (direct writes)

**generateMediaModeEvents.js**
- **generateMediaModeEvents_(ctx)** — MEDIA citizens
  Reads: S.{cycleId, weather, cityDynamics, civicLoad, crimeMetrics, holiday, sportsSeason, votesThisCycle, grantsThisCycle, eventArcs}
  Sheets: Simulation_Ledger, LifeHistory_Log (direct writes)

### 5c: Relationship + Civic Systems

**bondPersistence.js**
- **loadRelationshipBonds_(ctx)** / **saveRelationshipBonds_(ctx)**
  Writes: S.relationshipBonds
  Sheets: Relationship_Bonds, Relationship_Bond_Ledger

**seedRelationBondsv1.js**
- **seedRelationshipBonds_(ctx)**
  Writes: S.{relationshipBonds, bondSummary}
  Sheets: Simulation_Ledger, Relationship_Bonds

**runRelationshipEngine.js**
- **runRelationshipEngine_(ctx)**
  Reads: S.{season, holiday, isFirstFriday, isCreationDay, weather, cityDynamics, chaos, cycleId, mediaEffects, allianceBenefits}
  Writes: S.cycleActiveCitizens
  Sheets: Simulation_Ledger, LifeHistory_Log (direct writes)

**civicInitiativeEngine.js**
- **runCivicInitiativeEngine_(ctx)**
  Reads: S.{cycleId, cityDynamics.sentiment}
  Writes: S.{initiativeEvents, votesThisCycle, grantsThisCycle}
  Sheets: Initiative_Tracker, Civic_Office_Ledger (direct writes)

**runCivicElectionsv1.js**
- **runCivicElections_(ctx)**
  Reads: S.{cycleOfYear, godWorldYear, absoluteCycle, cityDynamics.sentiment, economicMood}
  Writes: S.electionResults
  Sheets: Civic_Office_Ledger, Election_Log (direct writes)

### 5d: Lifecycle Engines

**runCareerEngine.js**
- **runCareerEngine_(ctx)**
  Reads: S.{season, weather, holiday, isFirstFriday, isCreationDay, cityDynamics, economicMood, cycleId}, ctx.config.rngSeed
  Writes: **S.careerSignals** (promotions, layoffs, sectorShifts, businessDeltas, industries, avgTenure, avgLevel)
  Sheets: Simulation_Ledger, LifeHistory_Log, Business_Ledger (direct writes)

**runEducationEngine.js**
- **runEducationEngine_(ctx)**
  Reads: S.{season, weather, chaos, cityDynamics, holiday, isFirstFriday, isCreationDay, economicMood, cycleId}
  Writes: S.{educationEvents, eventsGenerated}
  Sheets: Simulation_Ledger, LifeHistory_Log (direct writes)

**generationalEventsEngine.js** (in phase04-events/)
- **runGenerationalEngine_(ctx)**
  Reads: S.{season, sentiment, economicMood, cycleId, generationalEvents}
  Writes: S.{generationalEvents, pendingCascades, eventArcs, generationalSummary, relationshipBonds}
  Sheets: Population_Ledger

### 5e: Bond Processing

**bondEngine.js**
- **runBondEngine_(ctx)**
  Reads: S.{relationshipBonds, cycleActiveCitizens, pendingConfrontations, allianceBenefits, cycleId}
  Writes: S.{relationshipBonds, pendingConfrontations, allianceBenefits, bondSummary}
  Sheets: Relationship_Bonds, Neighborhood_Map

### 5f: Intake + Named Citizens

**processIntakeV3.js**
- **processIntakeV3_(ctx)**
  Writes: S.intakeProcessed
  Sheets: Intake, Simulation_Ledger (write intents)

**generateCitizensEvents.js**
- **generateCitizensEvents_(ctx)** — ENGINE-only rich pipeline
  Reads: S.{season, weather, chaos, sentiment, economicMood, sportsSeason, eventArcs, civicLoad, patternFlag}
  Writes: S.eventsGenerated
  Sheets: Simulation_Ledger, LifeHistory_Log (direct writes)

**generateNamedCitizensEvents.js**
- **generateNamedCitizensEvents_(ctx)**
  Reads: S.{cycleId, season, weather, weatherMood, chaos, cityDynamics, economicMood, holiday, isFirstFriday, isCreationDay, sportsSeason}
  Writes: S.{cycleActiveCitizens, eventsGenerated}
  Sheets: Simulation_Ledger, LifeHistory_Log (direct writes)

**checkForPromotions.js**
- **checkForPromotions_(ctx)**
  Reads: S.{season, weather, weatherMood, chaos, cityDynamics, economicMood, holiday, isFirstFriday, isCreationDay, sportsSeason}, ctx.config.cycleCount
  Sheets: Generic_Citizens, Simulation_Ledger (direct writes)

**processAdvancementIntake.js**
- **processAdvancementIntake_(ctx)**
  Reads: ctx.config.cycleCount, S.cycleId
  Sheets: Media_Usage, Generic_Citizens, Simulation_Ledger

### 5g: Tier-5 Engines (direct sheet writes — documented exceptions)

**householdFormationEngine.js**
- **processHouseholdFormation_(ctx)**
  Reads: S.cycleId
  Sheets: Household_Ledger, Family_Relationships, Simulation_Ledger (direct writes)

**generationalWealthEngine.js**
- **processGenerationalWealth_(ctx)**
  Reads: S.{cycleId, generationalEvents}, ctx.config.cycleCount
  Sheets: Simulation_Ledger, Household_Ledger, Family_Relationships (direct writes)

**educationCareerEngine.js**
- **processEducationCareer_(ctx)**
  Reads: S.cycleId
  Sheets: Simulation_Ledger, Neighborhood_Demographics (direct writes)

**gentrificationEngine.js**
- **processGentrification_(ctx)**
  Reads: S.cycleId, ctx.config.cycleCount
  Writes: S.storyHooks (push)
  Sheets: Neighborhood_Map, Simulation_Ledger, Household_Ledger

**migrationTrackingEngine.js**
- **processMigrationTracking_(ctx)**
  Reads: S.cycleId
  Writes: S.storyHooks (push)
  Sheets: Simulation_Ledger, Household_Ledger, Neighborhood_Map, Migration_Events

---

## Phase 6: Analysis + Pattern Detection (phase06-analysis/)

### filterNoiseEvents.js
- **filterNoiseEvents_(ctx)**
  Reads: S.{engineEvents, cityDynamics, worldEvents, weather, weatherMood, patternFlag, economicMood, holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason}
  Writes: S.{engineEvents (filtered), filteredEventsStats}

### prioritizeEvents.js
- **prioritizeEvents_(ctx)**
  Reads: S.{engineEvents, worldEvents, eventArcs, patternFlag, shockFlag, civicLoad, cycleId}
  Writes: S.{eventPrioritization, priorityStats}

### applyNamedCitizenSpotlight.js (in phase05-citizens/)
- **applyNamedCitizenSpotlights_(ctx)**
  Reads: S.{engineEvents, namedCitizenMap, worldEvents, cityDynamics, civicLoad, patternFlag, shockFlag, economicMood, weatherMood, eventArcs, holiday, isFirstFriday, isCreationDay, sportsSeason}
  Writes: S.{namedSpotlights, spotlightStats}

### computeRecurringCitizens.js
- **computeRecurringCitizens_(ctx)**
  Reads: S.{cycleActiveCitizens, previousCycleState}
  Writes: S.recurringCitizens

### applyCivicLoadIndicator.js
- **applyCivicLoadIndicator_(ctx)**
  Reads: S.{cycleId, auditIssues, worldEvents, patternFlag, shockFlag, cityDynamics, weather, weatherMood, economicMood, demographicDrift, eventArcs, holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason}
  Writes: S.{civicLoad, civicLoadScore, civicLoadFactors, previousCycleAuditIssues, auditIssues}
  Sheets: Riley_Digest

### economicRippleEngine.js
- **runEconomicRippleEngine_(ctx)**
  Reads: S.{economicMood, **careerSignals**, neighborhoodEconomies, cycleId, holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, season}
  Writes: S.{economicRipples, **economicMood**, economicMoodDesc, neighborhoodEconomies, economicNarrative, economicSummary}
  Sheets: Business_Ledger, Population_Stats (direct writes)

### applyMigrationDrift.js
- **applyMigrationDrift_(ctx)**
  Reads: S.{cycleId, **economicMood**, economicMoodDesc, weather, worldEvents, cityDynamics, holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, neighborhoodEconomies}
  Writes: S.{economicMood (feedback), migrationDrift, migrationDriftFactors, neighborhoodMigration, migrationEconomicLink, neighborhoodEconomyFeedback, migrationBrief}
  Sheets: Neighborhood_Map (direct writes)

### applyPatternDetection.js
- **applyPatternDetection_(ctx)**
  Reads: S.{holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, cityDynamics, worldEvents}
  Writes: S.patternFlag
  Sheets: Riley_Digest

### applyShockMonitor.js
- **applyShockMonitor_(ctx)**
  Reads: S.{absoluteCycle, previousCycleState, eventsGenerated, worldEvents, cityDynamics, civicLoad, patternFlag, weather, weatherMood, economicMood, mediaEffects, eventArcs, demographicDrift, holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason}
  Writes: S.{shockFlag, shockReasons, shockScore, shockStartCycle, shockDuration, currentCycleState, previousCycleState}

### textureTriggers.js (in phase07-evening-media/)
- **textureTriggerEngine_(ctx)**
  Reads: S.{worldEvents, weather, holiday, cityDynamics, season}, ctx.config.cycleCount
  Writes: S.{textureTriggers, textureCalendarContext}
  Sheets: Texture_Ledger

### prePublicationValidation.js
- **runPrePublicationValidation_(ctx)**
  Reads: S.{eventArcs, worldEvents, engineEvents, mediaEffects, cycleId}
  Writes: S.{validationErrors, validationWarnings}

**Key data chain:** Career (S.careerSignals) → EconomicRipple (S.economicMood) → MigrationDrift (S.migrationDrift)

---

## Phase 7: Evening Media + Story Generation (phase07-evening-media/)

### buildCityEvents.js (in phase04-events/)
- **buildCityEvents_(ctx)**
  Reads: S.{cycleId, season, weather, weatherMood, worldEvents, cityDynamics, economicMood, holiday, sportsSeason}
  Writes: S.{cityEvents, cityEventDetails, cityEventsCalendarContext}

### buildNightLife.js
- **buildNightlife_(ctx)**
  Reads: S.{eveningSports, worldEvents, holiday, sportsSeason, economicMood}
  Writes: S.{nightlife, nightlifeVolume}

### sportsStreaming.js
- **buildEveningSportsAndStreaming_(ctx)**
  Reads: S.{sportsSeason, simMonth, economicMood, weather}
  Writes: S.{eveningSports, eveningSportsDetails, streamingTrend}
  Sheets: Sports_Feed

### buildEveningFood.js
- **buildEveningFood_(ctx)**
  Reads: S.{season, weather, economicMood, holiday, nightlifeVolume}
  Writes: S.{eveningFood}

### buildEveningFamous.js
- **buildEveningFamous_(ctx)**
  Reads: S.{citizenEvents, cityDynamics, holiday, eveningSports}
  Writes: S.{famousSightings, famousSightingsContext}

### buildEveningMedia.js
- **buildEveningMedia_(ctx)**
  Reads: S.{season, weather, weatherMood, worldEvents, cityDynamics, eveningSports, economicMood, holiday, sportsSeason}
  Writes: S.eveningMedia

### cityEveningSystems.js
- **buildCityEveningSystems_(ctx)**
  Reads: S.{worldEvents, cityDynamics, weather, economicMood, holiday, nightlife, eveningSports, cityEvents}
  Writes: S.{eveningTraffic, eveningSafety, nightShiftLoad, crowdMap, crowdHotspots, weatherImpact}

### buildMediaPacket.js
- **buildMediaPacket_(ctx)**
  Reads: S.{eveningMedia, worldEvents, storySeeds, cycleId}
  Writes: S.mediaPacket

### mediaFeedbackEngine.js
- **runMediaFeedbackEngine_(ctx)**
  Reads: S.{mediaEffects, worldEvents, cycleId, previousCycleState}
  Writes: S.mediaEffects (narrative, intensity, crisisSaturation, celebrityBuzz)

### applyStorySeeds.js
- **applyStorySeeds_(ctx)**
  Reads: S.{storySeeds, eventArcs, worldEvents}
  Writes: S.storySeedsUI

### storyHook.js
- **storyHookEngine_(ctx)**
  Reads: S.{eventArcs, worldEvents, storySeeds, cycleId, previousCycleState}
  Writes: S.storyHooks

---

## Phase 8: V3 Integration + Chicago (phase08-v3-chicago/)

### applyCycleWeightForLatestCycle.js (in phase09-digest/)
- **applyCycleWeightForLatestCycle_(ctx)**
  Reads: S.{cycleId, eventsGenerated, worldEvents, patternFlag, shockFlag}
  Sheets: Cycle_Weight (direct writes)

### v3preLoader.js
- **v3PreloadContext_(ctx)**
  Reads: ctx.config.cycleCount, S.cycleId
  Writes: S.eventArcs
  Sheets: Event_Arc_Ledger, Domain_Tracker, Neighborhood_Map, Storyline_Tracker

### processArcLifeCyclev1.js (in phase06-analysis/) — **ACTIVE engine file**
- **processArcLifecycle_(ctx)**
  Reads: S.{worldEvents, eventArcs}, ctx.rng
  Sheets: Event_Arc_Ledger (direct writes)

### updateStorylineStatusv1.2.js (in phase06-analysis/)
- **updateStorylineStatus_(ctx)**
  Reads: S.{eventArcs, worldEvents}, ctx.config.cycleCount
  Sheets: Storyline_Tracker (direct writes)

### hookLifecycleEngine.js (in phase06-analysis/)
- **monitorStorylineHealth_(ctx)** (aliased from manageHookLifecycle_)
  Reads: S.{cycleId, eventArcs}
  Sheets: Story_Hook_Deck (direct writes)

### v3Integration.js
- **v3Integration_(ctx)**
  Reads: S.{cycleId, v3PreLoad, neighborhoodData, domainData}
  Writes: S.v3IntegrationResults

### chicagoSatellite.js
- **chicagoSatellite_(ctx)**
  Reads: S.{worldEvents, eventArcs, cycleId}
  Writes: S.chicagoFeed

### generateChicagoCitizensv1.js (in phase05-citizens/)
- **generateChicagoCitizens_(ctx)**
  Reads: ctx.config.cycleCount
  Writes: S.chicagoCitizens
  Sheets: Chicago_Citizens

---

## Phase 9: Digest + Compression (phase09-digest/)

### applyCompressionDigestSummary.js
- **applyCompressedDigestSummary_(ctx)**
  Reads: S.{worldEvents, eventArcs, engineEvents, cycleId}
  Writes: S.{digestCompression, compressedSummary}
  Sheets: Cycle_Digest

### compressLifeHistory.js (in utilities/)
- **compressLifeHistory_(ctx)**
  Reads: Simulation_Ledger LifeHistory column
  Writes: Simulation_Ledger TraitProfile column

### finalizeWorldPopulation.js (in phase03-population/)
- **finalizeWorldPopulation_(ctx)**
  Reads: S.{patternFlag, worldEvents}
  Sheets: World_Population

### finalizeCycleState.js
- **snapshotEveningForCarryForward_(ctx)** — S116
  Reads: S.{crowdHotspots, nightlifeVolume, eveningSafety, eveningSports, famousSightings, eveningFood}
  Writes: S.eveningSnapshot

- **finalizeCycleState_(ctx)**
  Reads: S (all fields)
  Writes: S.{previousCycleState, cycleFinalState}

---

## Phase 10: Persistence (phase10-persistence/)

### writeDigest_ (in godWorldEngine2.js)
  Sheets: Cycle_Digest

### recordCycleWeather.js
- **recordCycleWeather_(ctx)**
  Reads: S.{weather, weatherMood, cycleId}
  Sheets: Cycle_Weather (via intents)

### recordWorldEventsv25.js
- **recordWorldEventsv25_(ctx)**
  Reads: S.{worldEvents, cycleId}
  Sheets: World_Events (via intents)

### recordWorldEventsv3.js
- **recordWorldEventsv3_(ctx)**
  Reads: S.{worldEvents, eventArcs, cycleId}
  Sheets: World_Events_V3 (via intents)

### v3NeighborhoodWriter.js (in phase08-v3-chicago/)
  Sheets: Neighborhood_Map (direct writes)

### v3LedgerWriter.js (in phase08-v3-chicago/)
  Sheets: Event_Arc_Ledger (via intents)

### bondPersistence.js (in phase05-citizens/)
  Sheets: Relationship_Bonds (via intents)

### v3DomainWriter.js (in phase08-v3-chicago/)
  Sheets: Domain_Tracker (direct writes)

### saveV3Seeds.js
- **saveV3Seeds_(ctx)**
  Reads: S.{storySeeds, cycleId}
  Sheets: V3_Story_Seeds (via intents)

### v3StoryHookWriter.js (in phase08-v3-chicago/)
  Sheets: Story_Hook_Deck (via intents)

### v3TextureWriter.js (in phase08-v3-chicago/)
  Sheets: Texture_Triggers (via intents)

### v3ChicagoWriter.js (in phase08-v3-chicago/)
  Sheets: Chicago_Events (direct writes)

### buildCyclePacket.js
- **buildCyclePacket_(ctx)**
  Reads: S.* (most summary fields)
  Writes: S.cyclePacket
  Sheets: Cycle_Packets

### mediaRoomBriefingGenerator.js (in phase07-evening-media/)
- **generateMediaBriefing_(ctx)**
  Reads: S.{worldEvents, storySeeds, eventArcs, eveningMedia, cycleId}
  Writes: S.mediaBriefing

### recordMediaLedger.js
- **recordMediaLedger_(ctx)**
  Reads: S.{mediaEffects, mediaPacket, cycleId}
  Sheets: Media_Ledger (via intents)

### finalizeCycleState.js (in phase09-digest/)
- **saveEveningSnapshot_(ctx)** — S116
  Reads: S.eveningSnapshot
  Writes: PropertiesService (PREV_EVENING_JSON)

### writeIntents.js (in utilities/)
- **executePersistIntents_(ctx)**
  Reads: ctx.persist (replaceOps, updates, logs)
  Sheets: All sheets specified in intents

---

## Phase 11: Media Intake (phase11-media-intake/)

### healthCauseIntake.js
- **healthCauseIntake_(ctx)**
  Reads: S.{worldEvents, mediaIntake, cycleId}
  Sheets: Health_Cause_Ledger

---

## Key Dependency Chains

```
Phase 1 → all (ctx.config.*, S.cycleId, S.season, S.holiday)
Phase 2 → Phase 3-9 (S.weather, S.sportsSeason, S.cityDynamics, S.seasonal)
Phase 3 → Phase 4-6 (S.crimeMetrics, S.populationMetrics)
Phase 4 → Phase 5-8 (S.worldEvents, S.faithEvents)
Phase 5.career → Phase 6.economicRipple (S.careerSignals)
Phase 6.economicRipple → Phase 6.migrationDrift (S.economicMood)
Phase 5.bonds → Phase 5.bondEngine (S.relationshipBonds, S.pendingConfrontations, S.allianceBenefits)
Phase 7 → Phase 9-10 (S.mediaPacket, S.storyHooks, S.eveningSnapshot)
Phase 8.v3preLoader → Phase 8.arcLifecycle (S.eventArcs)
Phase 9 → Phase 10 (S.previousCycleState, S.eveningSnapshot)
```

## Sheet Write Pattern

| Phase | Method | Targets |
|-------|--------|---------|
| 1-4 | Read-only lookups | World_Config, Sports_Feed, Faith_Organizations |
| 3 | Direct writes | World_Population, Neighborhood_Map, Population_Stats |
| 5 (Tier-5) | Direct writes | Simulation_Ledger, Household_Ledger, LifeHistory_Log |
| 5 (civic) | Direct writes | Initiative_Tracker, Civic_Office_Ledger, Election_Log |
| 6 | Direct writes | Story_Arcs, Storylines, Hooks, Neighborhood_Map, Population_Stats, Riley_Digest |
| 7 | None | — |
| 8 | Direct writes | Neighborhood_Map, Domain_Tracker, Chicago_Events |
| 9 | Direct writes | Cycle_Weight |
| 10 | Write intents + direct | All persistence targets |
