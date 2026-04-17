# Engine Stub Map

**Generated:** 2026-04-17 by `scripts/stubEngine.js` (mechanical scan — no LLM, no memory).

**Purpose:** Per-function ctx footprint + sheet targets + RNG usage across every engine JS file. Regenerate with `node scripts/stubEngine.js` after any engine change.

**Convention:** `S.X` is an alias for `ctx.summary.X` used throughout the engine.

---

## Phase 1: Config + Time (`phase01-config/`)

### advanceSimulationCalendar.js
- **advanceSimulationCalendar_(ctx)**
  Reads: S.cycleId
  Writes: S.absoluteCycle, S.creationDayAnniversary, S.cycleInMonth, S.cycleOfYear, S.cycleRef, S.godWorldYear, S.holiday, S.holidayDetails, S.holidayNeighborhood, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.isWeekend, S.monthName, S.season, S.simDay, S.simMonth, S.simYear, S.weather, S.weatherMood
  Config: ctx.config.cycleCount
  Sheets: Simulation_Calendar
  RNG: ctx.rng / safeRand_(ctx)

### godWorldEngine2.js
- **logEngineError_(ctx, phase, error)**
  Reads: S.cycleId
  Writes: S.auditIssues
  Sheets: Engine_Errors

- **safePhaseCall_(ctx, phaseName, fn)**

- **runWorldCycle()**
  Reads: S.auditIssues, S.cityEvents, S.eveningSports, S.mediaIntake, S.nightlife, S.nightlifeVolume
  Writes: S.faithStorySignals, S.transitStorySignals, S.validationReport

- **loadConfig_(ctx)**

- **advanceWorldTime_(ctx)**
  Writes: S.cycleId
  Config: ctx.config.cycleCount

- **updateWorldPopulation_(ctx)**
  Reads: S.cityDynamics, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason, S.weather, S.worldEvents
  Writes: S.worldPopulation
  RNG: ctx.rng / safeRand_(ctx)

- **appendPopulationHistory_(ctx)**
  Reads: S.absoluteCycle, S.cycleId
  Sheets: World_Population

- **padStart_(str, targetLength, padChar)**

- **processIntake_(ctx)**
  Writes: S.intakeProcessed
  Sheets: Intake, Simulation_Ledger

- **getMaxPopId_(ledgerValues)**

- **existsInLedger_(ledgerValues, first, last)**

- **nextPopIdSafe_(ledgerValues)**

- **updateNamedCitizens_(ctx)**
  Writes: S.citizensUpdated
  Sheets: Simulation_Ledger

- **writeDigest_(ctx)**
  Reads: S.auditIssues, S.citizensUpdated, S.cityDynamics, S.cityEvents, S.civicLoad, S.cycleId, S.cycleWeight, S.cycleWeightReason, S.eveningFood, S.eveningMedia, S.eveningSports, S.eventsGenerated, S.famousPeople, S.intakeProcessed, S.migrationDrift, S.nightlife, S.patternFlag, S.shockFlag, S.storySeeds, S.streamingTrend, S.weather, S.worldEvents
  Sheets: Riley_Digest

- **applyCycleWeightForLatestCycle_(ctx)**
  Sheets: Riley_Digest

- **runDryRunCycle()**

- **replayCycle(cycleId)**

- **runCyclePhases_(ctx)**
  Reads: S.cityEvents, S.eveningSports, S.nightlife, S.nightlifeVolume
  Writes: S.faithStorySignals, S.transitStorySignals, S.validationReport

### loadPreviousEvening.js
- **loadPreviousEvening_(ctx)**
  Writes: S.previousEvening

- **loadPreviousCycleState_(ctx)**
  Writes: S.previousCycleState

## Phase 2: World State (`phase02-world-state/`)

### applyCityDynamics.js
- **applyCityDynamics_(ctx)**
  Reads: S.absoluteCycle, S.cityCapacity, S.crimeByNeighborhood, S.crimeEvents, S.crimeSpikes, S.cycleId, S.eventsGenerated, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.manualDynamicsInputs, S.mediaCount, S.mediaCoverage, S.neighborhoodEconomies, S.neighborhoodWeather, S.previousCycleState, S.season, S.shockFlag, S.sportsSeason, S.storySeeds, S.weather, S.worldEvents
  Writes: S.activityObservations, S.cityDynamics, S.cityDynamicsCapacity, S.cityDynamicsLag, S.clusterDefinitions, S.clusterDynamics, S.neighborhoodDemographics, S.neighborhoodDynamics, S.previousCityDynamics, S.previousClusterDynamics, S.previousNeighborhoodDynamics, S.resetDynamicsMomentum, S.storySeedSignals
  Config: ctx.config.cityCapacity, ctx.config.cycleCount, ctx.config.manualDynamicsInputs

- **getNeighborhoodDynamics_(ctx, neighborhood)**
  Reads: S.cityDynamics, S.neighborhoodDynamics

- **getClusterDynamics_(ctx, clusterName)**
  Reads: S.cityDynamics, S.clusterDynamics

### applyEditionCoverageEffects.js
- **applyEditionCoverageEffects_(ctx)**
  Reads: S.civicVoiceSentiment, S.cycle, S.cycleId
  Writes: S.domainCooldowns, S.editionCoverageEffects, S.editionCoverageTriggers, S.editionDomainBalance, S.editionNeighborhoodEffects, S.editionSentimentBoost, S.sentiment
  Sheets: Edition_Coverage_Ratings

- **findCoverageCol_(headers, possibleNames)**

### applyInitiativeImplementationEffects.js
- **loadCivicVoiceSentiment_(ctx)**
  Reads: S.cycle, S.cycleId
  Writes: S.civicVoiceSentiment

- **applyInitiativeImplementationEffects_(ctx)**
  Writes: S.initiativeImplementationEffects, S.initiativeImplementationTriggers, S.initiativeNeighborhoodEffects, S.sentiment
  Sheets: Initiative_Tracker

- **findImplCol_(headers, possibleNames)**

### applySeasonWeights.js
- **applySeasonalWeights_(ctx)**
  Reads: S.cycleOfYear, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.isWeekend, S.mediaEffects, S.season, S.sportsSeason, S.weatherMood
  Writes: S.creationDayActive, S.seasonal

### applySportsSeason.js
- **applySportsSeason_(ctx)**
  Reads: S.cycle, S.cycleId
  Writes: S.activeSports, S.sportsFeedEntries, S.sportsSeason, S.sportsSeasonChicago, S.sportsSeasonOakland, S.sportsSource
  Config: ctx.config.sportsStateOakland, ctx.config.sportsState_Oakland

- **readOaklandFeedEntries_(ctx, currentCycle)**
  Sheets: Oakland_Sports_Feed

- **getColVal_(row, colIdx)**

- **deriveActiveSportsFromFeed_(entries)**

- **buildActiveSportsFromOverride_(oaklandState)**

- **applySportsFeedTriggers_(ctx)**
  Reads: S.cycle
  Writes: S.sentiment, S.sportsEventTriggers, S.sportsNeighborhoodEffects, S.sportsSentimentBoost
  Sheets: Oakland_Sports_Feed

- **processFeedSheet_(sheet, currentCycle)**

- **mergeNeighborhoodEffects_(target, source)**

- **parseWinPercentage_(record)**

- **parseStreakBonus_(streak)**

- **inferFeedTrigger_(teamState)**

- **parseFanSentiment_(val)**

- **parseMediaProfile_(val)**

- **parseEconomicFootprint_(val)**

- **parseCommunityInvestment_(val)**

- **parseFranchiseStability_(val)**

- **findColumnIndex_(headers, possibleNames)**

### applyWeatherModel.js
- **applyWeatherModel_(ctx)**
  Reads: S.absoluteCycle, S.cycleId, S.cycleOfYear, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.simMonth
  Writes: S.neighborhoodWeather, S.previousSeason, S.weather, S.weatherEventPools, S.weatherEvents, S.weatherFrontTracking, S.weatherMood, S.weatherSummary, S.weatherTracking
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  RNG: ctx.rng / safeRand_(ctx)

- **normalizeWeatherType_(type)**

- **getBaseWeatherEvents_(weatherType)**

- **getWeatherEvent_(ctx, preferSpecial)**
  Reads: S.weatherEventPools
  RNG: ctx.rng / safeRand_(ctx)

- **getNeighborhoodWeatherEvent_(ctx, neighborhood)**
  Reads: S.weatherEventPools
  RNG: ctx.rng / safeRand_(ctx)

- **getWeatherEventModifier_(ctx, eventCategory)**
  Reads: S.weatherMood

- **hasWeatherCondition_(ctx, condition)**
  Reads: S.isCreationDay, S.isFirstFriday, S.weatherEvents, S.weatherMood, S.weatherTracking

- **getNeighborhoodTemp_(ctx, neighborhood)**
  Reads: S.neighborhoodWeather, S.weather

- **getTransitWeatherModifier_(ctx)**
  Reads: S.weather

- **getCrimeWeatherModifier_(ctx)**
  Reads: S.weather, S.weatherTracking

- **getFrontMediaName_(ctx, frontStateOverride, strengthOverride)**
  Reads: S.weather

- **getWeatherMediaBrief_(ctx)**
  Reads: S.weather, S.weatherSummary, S.weatherTracking

### calendarChaosWeights.js
- **applyChaosCategoryWeights_(ctx)**
  Reads: S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason, S.weatherMood
  Writes: S.chaosCategoryMap, S.chaosCategoryWeights

### calendarStorySeeds.js
- **applySeasonalStorySeeds_(ctx)**
  Reads: S.cityDynamics, S.creationDayAnniversary, S.cycleOfYear, S.economicMood, S.holiday, S.holidayNeighborhood, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.weather, S.weatherMood, S.worldEvents
  Writes: S.seasonalStorySeeds

### getSimHoliday.js
- **getSimHoliday_(cycleOfYear)**

- **getSimHolidayDetails_(cycleOfYear)**

- **isFirstFridayCycle_(cycleOfYear)**

- **isCreationDay_(cycleOfYear)**

- **getCreationDayAnniversary_(godWorldYear)**

- **getCycleOfYear_(absoluteCycle)**

- **getGodWorldYear_(absoluteCycle)**

- **getMonthFromCycle_(cycleOfYear)**

- **getSimMonthFromCycle_(cycleOfYear)**

- **getHolidayPriority_(holidayName)**

### getsimseason.js
- **getSimSeason_(month)**

- **getSeasonFromCycle_(cycleOfYear)**

### updateTransitMetrics.js
- **updateTransitMetrics_Phase2_(ctx)**
  Reads: S.absoluteCycle, S.holiday, S.season, S.weather
  Writes: S.transitMetrics
  RNG: ctx.rng / safeRand_(ctx)

- **calculateStationMetrics_(station, context, demographics, rng)**

- **calculateCorridorTraffic_(corridor, context, rng)**

- **calculateRidershipModLocal_(context)**

- **calculateTrafficModLocal_(context)**

- **loadPreviousCycleEvents_(ctx, currentCycle)**

- **countMajorEvents_(worldEvents)**

- **isGameDay_(ctx, rng, prevCycleEvents)**
  Reads: S.season

- **sumRidership_(stationMetrics)**

- **avgOnTime_(stationMetrics)**

- **avgTraffic_(corridorMetrics)**

- **generateStationNotes_(station, context, ridership, onTime)**

- **generateCorridorNotes_(corridor, context, traffic)**

- **generateTransitAlerts_(stationMetrics, corridorMetrics, context)**

- **createTransitSignalChain_(detected, value, context)**

- **getTransitStorySignals_(ctx)**
  Reads: S.transitMetrics

## Phase 3: Population (`phase03-population/`)

### applyDemographicDrift.js
- **applyDemographicDrift_(ctx)**
  Reads: S.cityDynamics, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.demographicDrift
  Sheets: World_Population
  RNG: ctx.rng / safeRand_(ctx)

### deriveDemographicDrift.js
- **deriveDemographicDrift_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.civicLoadScore, S.economicMood, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.nightlifeVolume, S.sportsSeason, S.storyHooks, S.textureTriggers, S.weatherMood, S.worldEvents
  Writes: S.demographicDrift, S.demographicDriftFactors, S.demographicDriftSummary, S.shockFlag

### finalizeWorldPopulation.js
- **finalizeWorldPopulation_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.cycleId, S.cycleWeight, S.cycleWeightReason, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.migrationDrift, S.month, S.patternFlag, S.season, S.shockFlag, S.sportsSeason, S.weather, S.worldEvents
  Sheets: World_Population

- **finalizeWorldPopulation_Batch_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.cycleId, S.cycleWeight, S.cycleWeightReason, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.migrationDrift, S.month, S.patternFlag, S.season, S.shockFlag, S.sportsSeason, S.weather, S.worldEvents
  Sheets: World_Population

- **upgradeWorldPopulationSheet_(ctx)**
  Sheets: World_Population

### generateCrisisBuckets.js
- **generateCrisisBuckets_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.shockFlag, S.simMonth, S.sportsSeason, S.sportsSource, S.weather, S.weatherMood
  Writes: S.auditIssues, S.crisisCooldown, S.crisisLastSeen, S.eventArcs, S.eventsGenerated, S.worldEvents
  Config: ctx.config.cycleCount
  Sheets: World_Population
  RNG: ctx.rng / safeRand_(ctx)

### generateCrisisSpikes.js
- **generateCrisisSpikes_(ctx)**
  Reads: S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason, S.weather, S.weatherMood
  Writes: S.eventsGenerated, S.worldEvents
  Config: ctx.config.cycleCount
  RNG: ctx.rng / safeRand_(ctx)

### generateMonthlyDriftReport.js
- **generateMonthlyDriftReport(ssOverride)**
  Sheets: World_Drift_Report, World_Population

### updateCityTier.js
- **updateCityTier_(sheet, row, fameScore, mediaCount)**

### updateCrimeMetrics.js
- **updateCrimeMetrics_Phase3_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.enforcement, S.mediaCount, S.mediaCoverage, S.neighborhoodDynamics, S.season, S.storySeeds, S.weather, S.worldEvents
  Writes: S.crimeLag, S.crimeMetrics
  Config: ctx.config.enforcement
  RNG: ctx.rng / safeRand_(ctx)

- **calculateNeighborhoodCrime_(neighborhood, profile, demo, prev, context, events, advanced, rng)**

- **calculateCityWideFromMap_(metricsMap)**

- **calculateCityWideCategoriesFromMap_(metricsMap)**

- **generateCrimeEvents_(ctx)**
  RNG: ctx.rng / safeRand_(ctx)

- **getCrimeStorySignals_(ctx)**
  Reads: S.crimeMetrics

- **derivePatrolStrategy_(ctx, S)**
  Reads: S.patrolStrategy
  Config: ctx.config.patrolStrategy

- **clamp01_(n)**

- **buildCrimeAdjacencyGraph_(S)**
  Reads: S.clusterDefinitions, S.clusterDefs
  Writes: S.neighborhoodAdjacency

- **computeHotspotPressure_(currentMetrics, adjacency)**

- **calculateCrimeHotspots_(metricsMap, adjacency)**

- **deriveReportingSignal_(input)**

- **derivePolicingCapacity_(S, cfg, patrolStrategy)**

- **computeCityEnforcementLoad_(policingCapacity, predictedCityIncidents)**

- **updateCrimeLagState_(S, demographics, neighborhoodDynamics)**
  Reads: S.crimeLag

- **getNeighborhoodLag_(S, neighborhood)**
  Reads: S.crimeLag

### updateNeighborhoodDemographics.js
- **updateNeighborhoodDemographics_(ctx)**
  Reads: S.cycleId, S.demographicDrift, S.demographicDriftFactors, S.holiday, S.isCreationDay, S.isFirstFriday, S.sportsSeason
  Writes: S.demographicShifts, S.demographicShiftsCount, S.neighborhoodDemographics
  Config: ctx.config.cycleCount
  RNG: ctx.rng / safeRand_(ctx)

- **buildNeighborhoodDemographicModifiers_(holiday, isFirstFriday, isCreationDay, sportsSeason)**

## Phase 4: Events (`phase04-events/`)

### buildCityEvents.js
- **mulberry32_(seed)**

- **buildCityEvents_(ctx)**
  Reads: S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.cityEventDetails, S.cityEvents, S.cityEventsCalendarContext
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  RNG: ctx.rng / safeRand_(ctx)

### eventArcEngine.js
- **getCurrentCycle_(ctx)**
  Reads: S.absoluteCycle, S.cycleCount, S.cycleId
  Config: ctx.config.cycleCount

- **pickNeighborhoodForDomain_(domain, rng)**

- **eventArcEngine_(ctx)**
  Reads: S.cityDynamics, S.domainPresence, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.migrationDrift, S.shockFlag, S.sportsSeason, S.weather, S.worldPopulation
  Writes: S.civicLoad, S.cycleWeight

- **generateSafeUuid_(rng)**

- **generateNewArcs_(ctx)**
  Reads: S.cityDynamics, S.domainPresence, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.patternFlag, S.shockFlag, S.sportsSeason, S.weather, S.worldPopulation
  Writes: S.cycleWeight
  RNG: ctx.rng / safeRand_(ctx)

- **attachCitizenToArc_(ctx, arc, citizenId, role)**

- **citizenInActiveArc_(ctx, citizenId)**
  Reads: S.eventArcs

- **getArcEventBoost_(ctx, citizenId)**

### faithEventsEngine.js
- **runFaithEventsEngine_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.season, S.simMonth, S.weather
  Writes: S.faithEvents, S.worldEvents
  RNG: ctx.rng / safeRand_(ctx)

- **generateOrgEvents_(org, context, rng)**

- **generateInterfaithEvents_(organizations, context, rng)**

- **detectCrisisConditions_(worldEvents, sentiment)**

- **formatFaithEventDescription_(event)**

- **countEventsByType_(events)**

- **shuffleFaithOrgs_(arr, rng)**

- **createFaithSignalChain_(detected, value, context)**

- **getFaithStorySignals_(ctx)**
  Reads: S.faithEvents

### generateCitizenEvents.js
- **mulberry32_(seed)**

- **generateCitizensEvents_(ctx)**
  Reads: S.approvalNeighborhoodEffects, S.cityDynamics, S.cycleId, S.economicMood, S.editionNeighborhoodEffects, S.holiday, S.holidayPriority, S.initiativeNeighborhoodEffects, S.isCreationDay, S.isFirstFriday, S.season, S.sportsNeighborhoodEffects, S.sportsSeason, S.weather, S.weatherEventPools, S.worldEvents
  Writes: S.cycleActiveCitizens, S.eventsGenerated
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### generateGameModeMicroEvents.js
- **mulberry32GameMode_(seed)**

- **generateGameModeMicroEvents_(ctx)**
  Reads: S.cityDynamics, S.cycleId, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.sportsSeason, S.weather, S.worldEvents
  Writes: S.eventsGenerated, S.gameModeMicroEventDetails, S.gameModeMicroEvents
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### generateGenericCitizenMicroEvent.js
- **mulberry32_(seed)**

- **generateGenericCitizenMicroEvents_(ctx)**
  Reads: S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.previousEvening, S.season, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.eventsGenerated, S.microEvents
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### generationalEventsEngine.js
- **mulberry32_(seed)**

- **initRng_(ctx, cycle)**
  Config: ctx.config.rngSeed
  RNG: ctx.rng / safeRand_(ctx)

- **rand_(ctx)**
  RNG: ctx.rng / safeRand_(ctx)

- **chance_(ctx, p)**

- **pick_(ctx, arr)**

- **getLogWidth_(lifeLog)**

- **buildLogRowSchemaSafe_(width, base7, extras)**

- **runGenerationalEngine_(ctx)**
  Reads: S.cycleId, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.month, S.season, S.simYear, S.sportsSeason
  Writes: S.generationalEvents
  Config: ctx.config.cycleCount
  Sheets: LifeHistory_Log, Simulation_Ledger

- **processHealthLifecycle_(ctx, popId, name, currentStatus, duration, age, tier, cause, neighborhood, cycle, cal)**

- **getSeasonalLimits_(cal)**

- **checkGraduation_(ctx, popId, age, lifeHistory, tier, cal)**

- **checkWedding_(ctx, popId, age, lifeHistory, cal)**

- **checkBirth_(ctx, popId, age, lifeHistory, cal)**

- **checkPromotion_(ctx, popId, age, lifeHistory, tier, tierRole, cal)**

- **checkRetirement_(ctx, popId, age, lifeHistory, tier, cal)**

- **checkDeath_(ctx, popId, age, lifeHistory, tier, cal)**

- **checkHealthEvent_(ctx, popId, age, lifeHistory, cal)**

- **triggerBirthCascade_(ctx, parentId, parentName, neighborhood, cycle, cal)**
  Writes: S.pendingCascades

- **triggerPromotionCascade_(ctx, promotedId, result, cycle)**
  Reads: S.relationshipBonds

- **triggerRetirementCascade_(ctx, retiredId, name, tierRole, neighborhood, cycle, cal)**
  Writes: S.eventArcs

- **triggerDeathCascade_(ctx, deceasedId, name, tier, tierRole, neighborhood, cycle, cal)**
  Reads: S.relationshipBonds
  Writes: S.eventArcs, S.pendingCascades

- **generateGenerationalSummary_(ctx)**
  Reads: S.generationalEvents, S.pendingCascades
  Writes: S.generationalSummary

- **applyMilestone_(ctx, row, iLife, iLastU, milestone, name, popId, neighborhood, cycle, lifeLog, cal, logWidth)**

- **getOrdinal_(n)**

- **getCitizenBondsFromStorage_(ctx, citizenId)**
  Reads: S.relationshipBonds

- **createBond_(ctx, citizenA, citizenB, bondType, source, arcId, neighborhood, notes)**
  Writes: S.relationshipBonds

### worldEventsEngine.js
- **mulberry32_(seed)**

- **pickWeightedSafe_(cats, rng)**

- **worldEventsEngine_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.civicLoad, S.cycleId, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.patternFlag, S.previousCycleState, S.recoveryLevel, S.seasonal, S.shockFlag, S.sportsSeason, S.sportsSource, S.weather
  Writes: S.eventSuppression, S.eventsGenerated, S.migrationDrift, S.nightlifeVolume, S.worldEvents, S.worldEventsCalendarContext
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  Sheets: WorldEvents_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### worldEventsLedger.js
- **ensureWorldEventsLedger_(ctx)**

## Phase 5: Citizens (`phase05-citizens/`)

### applyNamedCitizenSpotlight.js
- **applyNamedCitizenSpotlights_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.economicMood, S.engineEvents, S.eventArcs, S.holiday, S.holidayNeighborhood, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.patternFlag, S.shockFlag, S.sportsSeason, S.weatherMood, S.worldEvents
  Writes: S.namedSpotlights, S.spotlightStats

### bondEngine.js
- **loadNeighborhoodsFromSheet_(ctx)**
  Sheets: Neighborhood_Map

- **resolveCitizenName_(ctx, raw)**

- **buildBondKeySet_(bonds)**

- **getBondKey_(citizenA, citizenB)**

- **runBondEngine_(ctx)**
  Reads: S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.sportsSeason
  Writes: S.pendingConfrontations, S.relationshipBonds

- **ensureBondEngineData_(ctx)**
  Reads: S.citizenEvents, S.eventArcs, S.storySeeds, S.worldEvents
  Writes: S.cycleActiveCitizens
  Sheets: Citizen_Directory, Simulation_Ledger

- **findColIndex_(headers, possibleNames)**

- **updateExistingBonds_(ctx)**
  Reads: S.cityDynamics, S.cycleActiveCitizens, S.cycleId, S.relationshipBonds, S.shockFlag
  Writes: S.cycleWeight
  Config: ctx.config.cycleCount
  RNG: ctx.rng / safeRand_(ctx)

- **detectNewBonds_(ctx)**
  Reads: S.cycleActiveCitizens, S.cycleId
  Config: ctx.config.cycleCount
  RNG: ctx.rng / safeRand_(ctx)

- **checkConfrontationTriggers_(ctx)**
  Reads: S.cycleId, S.relationshipBonds
  Config: ctx.config.cycleCount

- **applyAllianceBenefits_(ctx)**
  Reads: S.relationshipBonds
  Writes: S.allianceBenefits

- **generateBondSummary_(ctx)**
  Reads: S.pendingConfrontations, S.relationshipBonds
  Writes: S.bondSummary

- **makeBond_(citizenA, citizenB, bondType, origin, domainTag, neighborhood, intensity, cycle, notes, ctx)**

- **generateBondId_(ctx)**
  RNG: ctx.rng / safeRand_(ctx)

- **bondExists_(ctx, citizenA, citizenB)**
  Reads: S.relationshipBonds

- **getCitizenBonds_(ctx, citizenId)**
  Reads: S.relationshipBonds

- **getRivalryIntensity_(ctx, citizenA, citizenB)**
  Reads: S.relationshipBonds

- **parseTierLevel_(tierRole)**

- **getBondCitizenArc_(ctx, citizenId)**
  Reads: S.eventArcs

- **getCombinedEventBoost_(ctx, citizenId)**
  Reads: S.allianceBenefits

- **resolveRivalry_(ctx, bondId, outcome)**
  Reads: S.cycleId, S.relationshipBonds
  Config: ctx.config.cycleCount

- **createBond_(ctx, citizenA, citizenB, bondType, origin, domainTag, neighborhood, notes)**
  Reads: S.cycleId
  Writes: S.relationshipBonds
  Config: ctx.config.cycleCount

- **saveV3BondsToLedger_(ctx)**
  Reads: S.cycleId, S.relationshipBonds
  Config: ctx.config.cycleCount
  Sheets: Relationship_Bond_Ledger

- **diagnoseBondEngine()**
  Sheets: Citizen_Directory, Relationship_Bonds

### bondPersistence.js
- **asBool_(v)**

- **isLedgerSchema_(headers)**

- **loadRelationshipBonds_(ctx)**
  Writes: S.relationshipBonds
  Sheets: Relationship_Bonds

- **saveRelationshipBonds_(ctx)**
  Reads: S.cycleId, S.relationshipBonds
  Config: ctx.config.cycleCount
  Sheets: Relationship_Bonds

- **getBondCounts_(ctx)**
  Reads: S.relationshipBonds

- **purgeInactiveBonds_(ctx, maxAge)**
  Reads: S.cycleId
  Writes: S.relationshipBonds
  Config: ctx.config.cycleCount

- **getCitizenBondsFromStorage_(ctx, citizenId)**
  Reads: S.relationshipBonds

- **getBondBetween_(ctx, citizenA, citizenB)**
  Reads: S.relationshipBonds

- **getBondsByNeighborhood_(ctx, neighborhood)**
  Reads: S.relationshipBonds

- **getHottestRivalries_(ctx, limit)**
  Reads: S.relationshipBonds

- **getStrongestAlliances_(ctx, limit)**
  Reads: S.relationshipBonds

- **getBondsByHoliday_(ctx, holiday)**
  Reads: S.relationshipBonds

- **getFirstFridayBonds_(ctx)**
  Reads: S.relationshipBonds

- **getCreationDayBonds_(ctx)**
  Reads: S.relationshipBonds

- **getBondsBySportsSeason_(ctx, sportsSeason)**
  Reads: S.relationshipBonds

- **getFestivalBonds_(ctx)**
  Reads: S.relationshipBonds

- **getSportsRivalries_(ctx)**
  Reads: S.relationshipBonds

- **getOaklandHolidayBonds_(ctx)**
  Reads: S.relationshipBonds

- **getBondsByOrigin_(ctx, origin)**
  Reads: S.relationshipBonds

- **getBondCalendarSummary_(ctx)**

- **migrateBondSchema_(ctx)**
  Reads: S.relationshipBonds

- **upgradeBondSheetSchema_(ctx)**
  Sheets: Relationship_Bonds

### checkForPromotions.js
- **checkForPromotions_(ctx)**
  Reads: S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.simYear, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.eventsGenerated, S.promotions, S.promotionsCount
  Config: ctx.config.cycleCount
  Sheets: Generic_Citizens, LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### citizenContextBuilder.js
- **buildCitizenContext(identifier, cache)**

- **getWorldState_(ss)**
  Sheets: Event_Arc_Ledger, World_Population

- **findCitizenBase_(ss, identifier)**

- **findInSimulationLedger_(ss, identifier)**
  Sheets: Simulation_Ledger

- **findInGenericCitizens_(ss, identifier)**
  Sheets: Generic_Citizens

- **getLifeHistory_(ss, name, id, cache)**
  Sheets: LifeHistory_Log

- **getRelationships_(ss, name, id, cache)**
  Sheets: Relationship_Bonds

- **getMediaAppearances_(ss, name)**
  Sheets: Citizen_Media_Usage

- **getArcExposure_(ss, neighborhood, currentCycle)**
  Sheets: Event_Arc_Ledger

- **getCulturalStatus_(ss, name)**
  Sheets: Cultural_Ledger

- **deriveVoice_(profile)**

- **deriveSentiment_(profile, worldState)**

- **deriveConcerns_(profile, worldState)**

- **formatCitizenForMediaRoom(identifier)**

- **testCitizenContext()**

- **lookupCitizen(name)**

- **listNamedCitizens()**
  Sheets: Simulation_Ledger

- **diagnoseLedgerStructure()**

- **getCitizensForQuotes(neighborhood, count)**
  Sheets: Generic_Citizens

- **getReturningCitizens(neighborhood, count)**
  Sheets: Citizen_Media_Usage

### civicInitiativeEngine.js
- **runCivicInitiativeEngine_(ctx)**
  Reads: S.cityDynamics, S.cycleId
  Writes: S.civicDemographicContext, S.grantsThisCycle, S.initiativeEvents, S.votesThisCycle
  Config: ctx.config.cycleCount
  Sheets: Initiative_Tracker
  RNG: ctx.rng / safeRand_(ctx)

- **getCouncilState_(ctx)**
  Sheets: Civic_Office_Ledger

- **getCouncilStateFromSimLedger_(ctx)**
  Sheets: Simulation_Ledger

- **resolveCouncilVote_(ctx, row, header, councilState, sentiment, swingInfo, demoContext, rng)**

- **isSwingVoterAvailable_(voterName, councilState, availableIndMembers)**

- **calculateSwingProbability_(projection, sentiment, isSupermajority)**

- **calculateLeanProbability_(lean, sentiment)**

- **calculateDemographicInfluence_(demoContext)**

- **resolveExternalDecision_(ctx, row, header, sentiment, rng)**

- **resolveVisioningPhase_(ctx, row, header)**

- **applyInitiativeConsequences_(ctx, result, name, type)**
  Writes: S.cityDynamics, S.failedInitiatives, S.initiativeRipples, S.positiveInitiatives

- **applyNeighborhoodRipple_(ctx, initiativeName, direction, affectedNeighborhoods, policyDomain)**
  Reads: S.absoluteCycle, S.cycleId
  Writes: S.cityDynamics, S.initiativeRipples

- **applyActiveInitiativeRipples_(ctx)**
  Reads: S.absoluteCycle, S.cycleId
  Writes: S.activeRippleCount, S.activeRipples, S.cityDynamics, S.initiativeRipples

- **getRippleEffectsForNeighborhood_(ctx, neighborhood)**
  Reads: S.activeRipples

- **createInitiativeTrackerSheet_(ss)**

- **addSwingVoter2Columns()**
  Sheets: Initiative_Tracker

- **seedInitiativeTracker()**

- **manualRunVote(initiativeId)**
  Reads: S.cityDynamics
  Sheets: City_Dynamics, Initiative_Tracker, Simulation_Config
  RNG: ctx.rng / safeRand_(ctx)

- **runVoteForInitiative()**

- **seedInitiativeTracker_()**
  Sheets: Initiative_Tracker

- **getInitiativeSummaryForMedia_(ctx)**
  Reads: S.cycleId
  Config: ctx.config.cycleCount
  Sheets: Initiative_Tracker

- **checkMayoralVeto_(ctx, row, header, voteResult, rng)**
  Reads: S.absoluteCycle, S.cycleId

- **processOverrideVote_(ctx, row, header, councilState, rng)**

- **generateVetoStoryHook_(ctx, row, header, vetoData)**
  Writes: S.storyHooks

- **generateOverrideStoryHook_(ctx, name, overrideResult, mayorName)**
  Writes: S.storyHooks

### educationCareerEngine.js
- **processEducationCareer_(ctx)**
  Reads: S.cycleId
  Config: ctx.config.cycleCount
  RNG: ctx.rng / safeRand_(ctx)

- **deriveEducationLevels_(ss, ctx, rng)**
  Reads: S.cycleId
  Sheets: Simulation_Ledger

- **updateCareerProgression_(ss, cycle, rng)**
  Sheets: Simulation_Ledger

- **detectCareerMobility_(ss, ctx, cycle, rng)**
  Writes: S.storyHooks
  Sheets: Simulation_Ledger

- **checkSchoolQuality_(ss, ctx, cycle)**
  Writes: S.storyHooks
  Sheets: Neighborhood_Demographics

### generateChicagoCitizensv1.js
- **generateChicagoCitizens_(ctx)**
  Writes: S.chicagoCitizens
  Config: ctx.config.cycleCount
  Sheets: Chicago_Citizens
  RNG: ctx.rng / safeRand_(ctx)

- **createChicagoCitizensSheet_(ss)**

- **generateChicagoCitizen_(cycle, rng)**

- **generateAge_(rng)**

- **generateTier_(rng)**

- **getChicagoOccupation_(neighborhood)**

- **pickWeightedRandom_(weightedObj, rng)**

- **generateId_(rng)**

- **testChicagoCitizenGeneration_()**

### generateCitizensEvents.js
- **mulberry32_(seed)**

- **generateCitizensEvents_(ctx)**
  Reads: S.cityDynamics, S.crimeMetrics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.previousEvening, S.season, S.simYear, S.simulationYear, S.sportsSeason, S.weather, S.worldEvents
  Writes: S.citizenEventMemory, S.cycleActiveCitizens, S.eventsGenerated, S.localEntities, S.templateCooldowns
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### generateCivicModeEvents.js
- **mulberry32CivicMode_(seed)**

- **generateCivicModeEvents_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.crimeMetrics, S.cycleId, S.eventArcs, S.grantsThisCycle, S.holiday, S.holidayPriority, S.initiativeEvents, S.sportsSeason, S.votesThisCycle, S.weather
  Writes: S.civicModeEventDetails, S.civicModeEvents, S.eventsGenerated
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

- **buildOfficeLookup_(ss)**
  Sheets: Civic_Office_Ledger

### generateGenericCitizens.js
- **generateGenericCitizens_(ctx)**
  Reads: S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.eventsGenerated, S.genericCitizensDistribution, S.genericCitizensGenerated, S.newGenericCitizens
  Sheets: Generic_Citizens
  RNG: ctx.rng / safeRand_(ctx)

### generateMediaModeEvents.js
- **mulberry32MediaMode_(seed)**

- **generateMediaModeEvents_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.crimeMetrics, S.cycleId, S.eventArcs, S.grantsThisCycle, S.holiday, S.holidayPriority, S.sportsSeason, S.votesThisCycle, S.weather
  Writes: S.eventsGenerated, S.mediaModeEventDetails, S.mediaModeEvents
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### generateMonthlyCivicSweep.js
- **generateMonthlyCivicSweep(ssOverride)**
  Sheets: Civic_Sweep_Report, Simulation_Ledger, World_Population

### generateNamedCitizensEvents.js
- **generateNamedCitizenEvents_(ctx)**
  Reads: S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.mediaEffects, S.season, S.sportsSeason, S.weather, S.weatherEventPools, S.weatherMood, S.worldEvents
  Writes: S.cycleActiveCitizens, S.eventsGenerated
  Config: ctx.config.cycleCount
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### generationalWealthEngine.js
- **processGenerationalWealth_(ctx)**
  Reads: S.cycleId
  Config: ctx.config.cycleCount

- **calculateCitizenIncomes_(ss, ctx)**
  Sheets: Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

- **extractIncomeBand_(lifeHistory)**

- **calculateIncomeFromBand_(incomeBand, tier, rng)**

- **calculateCitizenWealth_(ss)**
  Sheets: Simulation_Ledger

- **deriveWealthLevel_(income, inheritance, netWorth, debt)**

- **processInheritance_(ss, ctx, cycle)**
  Reads: S.generationalEvents
  Writes: S.storyHooks

- **getCitizenWealth_(ss, popId)**
  Sheets: Simulation_Ledger

- **findHeirs_(ss, deceasedId)**
  Sheets: Simulation_Ledger

- **distributeInheritance_(ss, heirs, amountPerHeir, deceasedId, cycle)**
  Sheets: Simulation_Ledger

- **recordInheritanceInFamily_(ss, heirs, amount, deceasedId, cycle)**
  Sheets: Family_Relationships

- **updateHouseholdWealth_(ss)**
  Sheets: Household_Ledger, Simulation_Ledger

- **trackWealthMobility_(ss, ctx, cycle)**

- **trackHomeOwnership_(ss, ctx, cycle)**

### gentrificationEngine.js
- **processGentrification_(ctx)**
  Reads: S.cycleId
  Config: ctx.config.cycleCount

- **updateGentrificationPhases_(ss, cycle)**
  Sheets: Neighborhood_Map

- **detectGentrificationPhase_(incomeChange, rentChange, whiteChange, highEdPct, displPressure)**

- **generateGentrificationHooks_(ss, ctx, cycle)**
  Writes: S.storyHooks
  Sheets: Neighborhood_Map

### householdFormationEngine.js
- **processHouseholdFormation_(ctx)**
  Writes: S.householdFormation, S.storyHooks
  Config: ctx.config.cycleCount
  Sheets: Family_Relationships, Household_Ledger
  RNG: ctx.rng / safeRand_(ctx)

- **loadCitizens_(ss)**
  Sheets: Simulation_Ledger

- **loadHouseholds_(ss)**
  Sheets: Household_Ledger

- **parseJSON(value, defaultValue)**

- **formNewHouseholds_(ss, citizens, existingHouseholds, cycle, rng)**
  Sheets: Household_Ledger, Simulation_Ledger

- **estimateRent_(neighborhood)**

- **generateBirths_(ss, citizens, households, cycle)**

- **processMarriages_(ss, citizens, cycle)**

- **processDivorces_(ss, citizens, households, cycle)**

- **updateHouseholdIncomes_(ss, households, citizens)**
  Sheets: Household_Ledger

- **buildCitizenIncomeLookup_(ss)**
  Sheets: Simulation_Ledger

- **detectHouseholdStress_(ss, households)**

- **dissolveStressedHouseholds_(ss, stressedHouseholds, cycle, rng)**
  Sheets: Household_Ledger

- **generateHouseholdFormedHook_(household)**

- **generateHouseholdDissolvedHook_(household)**

- **generateRentBurdenHook_(stressed)**

### migrationTrackingEngine.js
- **processMigrationTracking_(ctx)**
  Reads: S.cycleId
  Config: ctx.config.cycleCount

- **assessDisplacementRisk_(ss, cycle)**
  Sheets: Simulation_Ledger

- **buildNeighborhoodPressureMap_(ss)**
  Sheets: Neighborhood_Map

- **buildHouseholdRentBurdenMap_(ss)**
  Sheets: Household_Ledger

- **updateMigrationIntent_(ss, cycle)**
  Sheets: Simulation_Ledger

- **processMigrationEvents_(ss, ctx, cycle)**

- **checkForDisplacedCitizens_(ss, cycle)**
  Sheets: Simulation_Ledger

- **generateMigrationHooks_(ss, ctx, cycle)**
  Writes: S.storyHooks
  Sheets: Simulation_Ledger

### processAdvancementIntake.js
- **processAdvancementIntake_(ctx)**
  Reads: S.cycleId
  Config: ctx.config.cycleCount

- **runAdvancementIntakeManual()**

- **getCurrentCycleFromConfig_(ss)**
  Sheets: World_Config

- **findColByName_(headers, name)**

- **isEmergenceUsage_(usageType)**

- **processMediaUsage_(ss, now, cycle)**
  Sheets: Citizen_Media_Usage, Generic_Citizens, LifeHistory_Log, Simulation_Ledger

- **processAdvancementRows_(ss, now, cycle)**
  Sheets: Advancement_Intake, Advancement_Intake1, Generic_Citizens, LifeHistory_Log, Simulation_Ledger

- **processIntakeRows_(ss, now, cycle)**
  Sheets: Intake

- **markAsEmergedInGeneric_(ss, genericSheet, first, last, cycle)**
  Sheets: Generic_Citizens

### processIntakeV3.js
- **processIntakeV3_(ctx)**
  Writes: S.intakeProcessed
  Sheets: Intake, Simulation_Ledger

- **getMaxPopIdFromValues_(ledgerValues)**

- **existsInLedgerValues_(ledgerValues, first, last)**

- **padNumber_(num, length)**

### runAsUniversePipeline.js
- **mulberry32_uni_(seed)**

- **runAsUniversePipeline_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.weather, S.weatherMood, S.worldEvents
  Writes: S.canonSportsPhase, S.eventsGenerated, S.postCareerEvents
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### runCareerEngine.js
- **runCareerEngine_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.weather, S.weatherMood, S.worldEvents
  Writes: S.careerEvents, S.careerSignals, S.eventsGenerated
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### runCivicElectionsv1.js
- **runCivicElections_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.cycleOfYear, S.economicMood, S.godWorldYear
  Writes: S.electionResults
  Config: ctx.config.cycleCount
  Sheets: Civic_Office_Ledger, Election_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### runCivicRoleEngine.js
- **runCivicRoleEngine_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.weather, S.weatherMood, S.worldEvents
  Writes: S.civicRoleEvents, S.eventsGenerated
  Config: ctx.config.cycleCount
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### runEducationEngine.js
- **runEducationEngine_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.simYear, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.educationEvents, S.eventsGenerated
  Config: ctx.config.cycleCount
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### runHouseholdEngine.js
- **runHouseholdEngine_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.eventsGenerated, S.householdEvents
  Config: ctx.config.cycleCount
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### runNeighborhoodEngine.js
- **runNeighborhoodEngine_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayNeighborhood, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.weather, S.weatherMood, S.worldEvents
  Writes: S.eventsGenerated, S.neighborhoodAssignments, S.neighborhoodDriftEvents
  Config: ctx.config.cycleCount
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### runRelationshipEngine.js
- **runRelationshipEngine_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.cycleId, S.holiday, S.holidayNeighborhood, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.mediaEffects, S.season, S.weather, S.weatherEventPools, S.worldEvents
  Writes: S.cycleActiveCitizens, S.eventsGenerated
  Sheets: LifeHistory_Log, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

- **getCitizenBonds_(ctx, citizenId)**
  Reads: S.relationshipBonds

- **getCombinedEventBoost_(ctx, citizenId)**
  Reads: S.allianceBenefits

- **citizenInActiveArc_(ctx, citizenId)**
  Reads: S.eventArcs

### runYouthEngine.js
- **runYouthEngine_(ctx)**
  Reads: S.absoluteCycle, S.crimeMetrics, S.season
  Writes: S.youthEvents
  RNG: ctx.rng / safeRand_(ctx)

- **getGenericYouth_(ss)**
  Sheets: Generic_Citizens

- **getNamedYouth_(ss)**
  Sheets: Simulation_Ledger

- **generateYouthEventForCitizen_(youth, month, rng, qolContext)**

- **generateSchoolWideEvents_(ctx, month, rng)**

- **getSchoolLevel_(age)**

- **adjustProbByCalendar_(baseProb, month, season)**

- **shuffleYouth_(arr, rng)**

- **countYouthEventsByType_(events)**

- **countYouthEventsByLevel_(events)**

- **recordYouthLifeHistory_(ctx, events)**
  Reads: S.absoluteCycle

- **getYouthStorySignals_(ctx)**
  Reads: S.youthEvents

### seedRelationBondsv1.js
- **seedRelationshipBonds_(ctx)**
  Writes: S.bondSummary, S.relationshipBonds
  Config: ctx.config.cycleCount
  Sheets: Relationship_Bonds, Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

- **createRelationshipBondsSheet_(ss)**

- **createBond_(citizenA, citizenB, type, intensity, origin, cycle, rng)**

- **makeBondKey_(idA, idB)**

- **generateBondId_(rng)**

- **findColumnIndex_(headers, possibleNames)**

- **testBondSeeding_()**
  Reads: S.bondSummary

### updateCivicApprovalRatings.js
- **updateCivicApprovalRatings_(ctx)**
  Reads: S.editionDomainBalance
  Writes: S.approvalChanges, S.approvalNeighborhoodEffects, S.approvalTriggers
  Sheets: Civic_Office_Ledger, Initiative_Tracker

- **isPerforming_(phase)**

- **isFailing_(phase)**

- **findApprCol_(headers, possibleNames)**

### updateCivicLedgerFactions.js
- **updateCivicOfficeLedgerFactions()**

- **updateCivicOfficeLedgerFactions_(ss)**
  Sheets: Civic_Office_Ledger

- **getCouncilStateFromLedger_(ctx)**
  Sheets: Civic_Office_Ledger

## Phase 6: Analysis (`phase06-analysis/`)

### applyCivicLoadIndicator.js
- **applyCivicLoadIndicator_(ctx)**
  Reads: S.auditIssues, S.cityDynamics, S.cycleAuditIssues, S.cycleId, S.demographicDrift, S.economicMood, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.patternFlag, S.shockFlag, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.civicLoad, S.civicLoadCalendarFactors, S.civicLoadFactors, S.civicLoadScore
  Config: ctx.config.cycleCount

- **resetCycleAuditIssues_(ctx)**
  Writes: S.auditIssues, S.cycleAuditIssues, S.previousCycleAuditIssues

### applyMigrationDrift.js
- **hashStringToUint32_(str)**

- **createSeededRng_(seed, stateOverride)**

- **applyMigrationDrift_(ctx)**
  Reads: S.cityDynamics, S.economicRipples, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.manualMigrationInputs, S.sportsSeason, S.weather, S.worldEvents
  Writes: S.economicMood, S.economicMoodDesc, S.migrationDrift, S.migrationDriftFactors, S.migrationEconomicLink, S.neighborhoodEconomies, S.neighborhoodEconomyFeedback, S.neighborhoodMigration, S.rngState
  Config: ctx.config.enableMigrationEconomicFeedback, ctx.config.enableMigrationNeighborhoodEconomicFeedback, ctx.config.manualMigrationInputs, ctx.config.migrationEconomicFeedbackMaxDelta, ctx.config.migrationEconomicFeedbackScale, ctx.config.migrationNeighborhoodEconomicFeedbackMaxDelta, ctx.config.migrationNeighborhoodEconomicFeedbackScale, ctx.config.rngSeed, ctx.config.rngState
  Sheets: Neighborhood_Map, World_Population
  RNG: ctx.rng / safeRand_(ctx)

- **renderMigrationBrief_(ctx)**
  Reads: S.migrationDrift, S.migrationDriftFactors, S.migrationEconomicLink, S.neighborhoodEconomyFeedback, S.neighborhoodMigration
  Writes: S.migrationBrief
  Config: ctx.config.migrationBriefIncludeEconDeltas, ctx.config.migrationBriefIncludeNeighborhoods, ctx.config.migrationBriefNeighborhoodCount

### applyPatternDetection.js
- **applyPatternDetection_(ctx)**
  Reads: S.cityDynamics, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.sportsSeason, S.worldEvents
  Writes: S.patternCalendarContext, S.patternFlag
  Sheets: Riley_Digest

### applyShockMonitor.js
- **applyShockMonitor_(ctx)**
  Reads: S.absoluteCycle, S.cityDynamics, S.civicLoad, S.civicLoadScore, S.cycle, S.cycleId, S.demographicDrift, S.economicMood, S.eventArcs, S.eventsGenerated, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.mediaEffects, S.patternFlag, S.simMonth, S.sportsSeason, S.sportsSource, S.weather, S.weatherMood, S.worldEvents
  Writes: S.currentCycleState, S.previousCycleState, S.shockCalendarContext, S.shockDuration, S.shockFlag, S.shockReasons, S.shockScore, S.shockStartCycle
  Config: ctx.config.cycleCount

### arcLifecycleEngine.js
- **advanceArcLifecycles_(ctx)**
  Reads: S.cycleId, S.eventArcs
  Writes: S.arcLifecycleResults
  Config: ctx.config.cycleCount

- **loadEventArcLedger_(ss)**
  Sheets: Event_Arc_Ledger

- **processArcLifecycle_(ctx, arc, cycle, ledger)**

- **shouldAdvancePhase_(currentPhase, phaseDuration, tension, nextTransition, cycle)**

- **getNextPhase_(currentPhase)**

- **advanceArcPhase_(ctx, arc, cycle, oldPhase, newPhase, ledger)**
  RNG: ctx.rng / safeRand_(ctx)

- **checkResolutionTriggers_(ctx, arc, tension, currentPhase, phaseDuration)**

- **resolveArc_(ctx, arc, cycle, trigger, ledger)**

- **generatePhaseTransitionHook_(ctx, arc, oldPhase, newPhase)**
  Writes: S.storyHooks

- **generateResolutionHook_(ctx, arc, trigger)**
  Writes: S.storyHooks

### computeRecurringCitizens.js
- **computeRecurringCitizens_(ctx)**
  Reads: S.cycleActiveCitizens, S.eventArcs, S.namedSpotlights, S.relationshipBonds
  Writes: S.recurringCitizens

### economicRippleEngine.js
- **runEconomicRippleEngine_(ctx)**
  Reads: S.careerSignals, S.cycleId, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.month, S.previousCycleState, S.season, S.sportsSeason
  Writes: S._bizLookup, S._rng, S.economicMood, S.economicRipples, S.neighborhoodEconomies
  Config: ctx.config.cycleCount
  Sheets: Business_Ledger
  RNG: ctx.rng / safeRand_(ctx)

- **detectMigrationRipples_(ctx, currentCycle)**

- **detectCareerRipples_(ctx, currentCycle)**
  Reads: S._bizLookup, S.careerSignals
  Writes: S.careerChurn

- **mapToCanonicalNeighborhood_(blNeighborhood)**

- **detectCalendarRipples_(ctx, currentCycle)**
  Reads: S.economicRipples

- **detectNewRipples_(ctx, currentCycle)**
  Reads: S.citizenEvents, S.crisisSpikes, S.domainPresence, S.weather, S.worldEvents

- **createRipple_(S, triggerType, cycle, sourceEvent, eventNeighborhood, cal)**
  Reads: S._rng
  Writes: S.economicRipples

- **processActiveRipples_(ctx, currentCycle)**
  Writes: S.economicRipples

- **calculateEconomicMood_(ctx)**
  Reads: S.cityDynamics, S.economicRipples
  Writes: S.economicMood, S.economicMoodDesc

- **deriveEmploymentRate_(ctx)**
  Reads: S.economicMood
  Writes: S.derivedEmploymentRate
  Sheets: World_Population

- **calculateNeighborhoodEconomies_(ctx)**
  Reads: S.economicMood, S.economicRipples
  Writes: S.neighborhoodEconomies

- **generateEconomicSummary_(ctx)**
  Reads: S.derivedEmploymentRate, S.economicMood, S.economicMoodDesc, S.economicRipples, S.neighborhoodEconomies
  Writes: S.economicNarrative, S.economicSummary

### filterNoiseEvents.js
- **filterNoiseEvents_(ctx)**
  Reads: S.cityDynamics, S.economicMood, S.holiday, S.holidayNeighborhood, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.patternFlag, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.engineEvents, S.noiseFilterStats

### hookLifecycleEngine.js
- **manageHookLifecycle_(ctx)**
  Writes: S.hookLifecycle
  Config: ctx.config.cycleCount

- **loadStoryHooks_(ss)**
  Sheets: Story_Hook_Deck

- **calculateHookAge_(ss, hooks, cycle)**
  Sheets: Story_Hook_Deck

- **detectExpiredHooks_(ss, hooks, cycle)**
  Sheets: Story_Hook_Deck

- **decayHookPriority_(ss, hooks, cycle)**
  Sheets: Story_Hook_Deck

- **archiveExpiredHooks_(ss, expiredHooks)**
  Sheets: Story_Hook_Archive, Story_Hook_Deck

- **markHookPickedUp_(ss, hookId, cycle)**
  Sheets: Story_Hook_Deck

### prePublicationValidation.js
- **runPrePublicationValidation_(ctx)**

- **checkToneContradictions_(ctx)**
  Reads: S.civicLoad, S.economicMood, S.healthCrisis, S.weather, S.worldEvents

- **checkContinuity_(ctx)**
  Reads: S.worldEvents

- **checkDistribution_(ctx)**
  Reads: S.worldEvents

- **checkSensitivity_(ctx)**
  Reads: S.civicLoad, S.economicMood, S.healthCrisis, S.worldEvents

### prioritizeEvents.js
- **prioritizeEvents_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.demographicShifts, S.economicMood, S.engineEvents, S.holiday, S.holidayNeighborhood, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.mediaEffects, S.neighborhoodDemographics, S.patternFlag, S.season, S.shockFlag, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.eventPrioritization

### processArcLifeCyclev1.js
- **processArcLifecycle_(ctx)**
  Reads: S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason
  Writes: S.storySeeds
  Config: ctx.config.cycleCount
  RNG: ctx.rng / safeRand_(ctx)

- **gatherWorldState_(ctx)**
  Reads: S.cityDynamics, S.economicMood, S.weather, S.worldEvents
  Sheets: World_Population

- **checkConditionResolution_(arc, worldState, calendar)**

- **calculateTensionDrift_(arc, worldState, calendar, rng)**

- **determinePhase_(arc)**

- **getResolutionText_(arc, rng)**

- **updateArcLedger_(ss, arcs, cycle)**
  Sheets: Event_Arc_Ledger

### storylineHealthEngine.js
- **monitorStorylineHealth_(ctx)**
  Writes: S.storyHooks, S.storylineHealth
  Config: ctx.config.cycleCount

- **loadActiveStorylines_(ss)**
  Sheets: Storyline_Tracker

- **updateCoverageGaps_(ss, storylines, cycle)**
  Sheets: Storyline_Tracker

- **detectStaleStorylines_(ss, storylines, cycle)**
  Sheets: Storyline_Tracker

- **detectFizzledStorylines_(ss, storylines, cycle)**
  Sheets: Storyline_Tracker

- **checkResolutionConditions_(ss, storylines, cycle)**
  Sheets: Storyline_Tracker

- **checkResolutionKeywords_(condition, cycle)**

- **generateWrapUpHook_(storyline)**

- **generateStaleHook_(storyline)**

- **generateFizzledHook_(storyline)**

### updateStorylineStatusv1.2.js
- **findColByArray_(headers, names)**

- **updateStorylineStatus_(ctx)**
  Config: ctx.config.cycleCount
  Sheets: Storyline_Tracker

- **loadArcStatuses_(ss)**
  Sheets: Event_Arc_Ledger

- **generateStorylineBriefingSection_(ss, cycle)**
  Sheets: Storyline_Tracker

## Phase 7: Evening Media (`phase07-evening-media/`)

### applyStorySeeds.js
- **applyStorySeeds_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.crimeMetrics, S.cycleId, S.cycleWeight, S.cycleWeightReason, S.domainPresence, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.manualStoryInputs, S.migrationDrift, S.namedSpotlights, S.patternFlag, S.season, S.seasonalStorySeeds, S.shockFlag, S.sportsSeason, S.weather, S.worldEvents, S.worldPopulation
  Writes: S.activeStorylineCount, S.storySeeds
  Config: ctx.config.cycleCount, ctx.config.manualStoryInputs
  Sheets: Storyline_Tracker

- **renderStorySeedsForUI_(ctx, maxSeeds)**
  Reads: S.storySeeds
  Writes: S.storySeedsUI

- **generateHeadline_(text, domain)**

- **generateAngle_(seed)**

### buildEveningFamous.js
- **buildEveningFamous_(ctx)**
  Reads: S.cityDynamics, S.cycleId, S.economicMood, S.eveningSports, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.famousPeople, S.famousSightings, S.famousSightingsContext
  Config: ctx.config.cycleCount
  Sheets: Simulation_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### buildEveningFood.js
- **buildEveningFood_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.nightlifeVolume, S.season, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.eveningFood
  RNG: ctx.rng / safeRand_(ctx)

### buildEveningMedia.js
- **buildEveningMedia_(ctx)**
  Reads: S.cityDynamics, S.economicMood, S.eveningSports, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsFeedEntries, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.eveningMedia
  RNG: ctx.rng / safeRand_(ctx)

### buildMediaPacket.js
- **buildMediaPacket_(ctx)**
  Writes: S.mediaPacket

- **populateMediaIntake_(ctx)**

### buildNightLife.js
- **buildNightlife_(ctx)**
  Reads: S.cityDynamics, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.nightlife, S.nightlifeVolume
  RNG: ctx.rng / safeRand_(ctx)

### citizenFameTracker.js
- **updateCitizenFameFromMedia_(ss, cycle, cal)**

- **loadCitizenLedgers_(ss)**
  Sheets: Chicago_Citizens, Cultural_Ledger, Generic_Citizens, Simulation_Ledger

- **buildNameMap_(data, headers, nameCol)**

- **getUnprocessedMediaMentions_(ss, cycle)**
  Sheets: Citizen_Media_Usage

- **groupMentionsByCitizen_(mentions)**

- **processCitizenMentions_(ss, ledgers, citizenName, mentions, cycle)**

- **updateSimulationLedgerCitizen_(ss, ledger, citizenKey, mentions, cycle)**

- **updateGenericCitizen_(ss, ledger, citizenKey, mentions, cycle)**

- **updateChicagoCitizen_(ss, ledger, citizenKey, mentions, cycle)**

- **syncCulturalLedgerFame_(ss, ledger, citizenKey, mentions, cycle)**

- **updateStorylineCoverage_(ss, cycle)**
  Sheets: Storyline_Tracker

- **calculateMentionPoints_(mentions)**

- **calculateFameTrend_(oldFame, newFame, lastMentionCycle, currentCycle)**

- **determineNotoriety_(mentions, fameScore)**

- **markMentionsProcessed_(ss, mentions)**
  Sheets: Citizen_Media_Usage

- **splitName_(fullName)**

- **normalizeIdentity_(str)**

### cityEveningSystems.js
- **buildCityEveningSystems_(ctx)**
  Reads: S.cityDynamics, S.cityEventDetails, S.cityEvents, S.economicMood, S.eveningSports, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.nightlife, S.season, S.sportsNeighborhoodEffects, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.civicLoad, S.crowdHotspots, S.crowdMap, S.eveningSafety, S.eveningSystemsCalendarContext, S.eveningTraffic, S.nightShiftLoad, S.nightlifeVolume, S.shockFlag, S.weatherImpact, S.weatherType
  Sheets: World_Population

### culturalLedger.js
- **registerCulturalEntity_(ctx, name, roleType, journalistName, neighborhood)**
  Reads: S.cityDynamics, S.cycleId, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.sportsSeason
  Writes: S.culturalEntityCreates, S.culturalEntityUpdates
  Config: ctx.config.cycleCount
  RNG: ctx.rng / safeRand_(ctx)

### domainTracker.js
- **domainTracker_(ctx)**
  Reads: S.cityDynamics, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.previousCycleState, S.sportsSeason, S.weather, S.worldEvents
  Writes: S.domainCalendarContext, S.domainPresence, S.dominantDomain

### mediaFeedbackEngine.js
- **runMediaFeedbackEngine_(ctx)**
  Reads: S.cycleId, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.month, S.season, S.sportsSeason
  Writes: S.mediaEffects
  Config: ctx.config.cycleCount

- **applyCalendarMediaModifiers_(ctx)**
  Reads: S.mediaEffects

- **analyzeWorldEventsCoverage_(ctx)**
  Reads: S.domainPresence, S.mediaEffects, S.worldEvents

- **analyzeEntertainmentSignals_(ctx)**
  Reads: S.eveningMedia, S.mediaEffects

- **analyzeCelebrityCoverage_(ctx)**
  Reads: S.eventArcs, S.famousPeople, S.mediaEffects, S.namedSpotlights

- **calculateCoverageIntensity_(ctx)**
  Reads: S.eventArcs, S.mediaEffects, S.patternFlag, S.shockFlag, S.worldEvents

- **calculateSentimentPressure_(ctx)**
  Reads: S.mediaEffects

- **applyNeighborhoodMediaEffects_(ctx)**
  Reads: S.mediaEffects, S.worldEvents

- **amplifyArcsFromCoverage_(ctx, cycle)**
  Reads: S.eventArcs, S.mediaEffects

- **generateMediaEventPools_(ctx)**
  Reads: S.mediaEffects

- **applyMediaToCityDynamics_(ctx)**
  Reads: S.cityDynamics, S.mediaEffects

- **generateMediaSummary_(ctx)**
  Reads: S.mediaEffects
  Writes: S.mediaSummary

- **getMediaInfluencedEvent_(ctx)**
  Reads: S.mediaEffects
  RNG: ctx.rng / safeRand_(ctx)

- **getMediaEventModifier_(ctx, eventCategory)**
  Reads: S.mediaEffects

- **isMediaSaturated_(ctx, topic)**
  Reads: S.mediaEffects

### mediaRoomBriefingGenerator.js
- **getFormattedJournalist_(name, suffix)**

- **getReporterBySignal_(signalType)**

- **generateMediaBriefing_(ctx)**
  Reads: S.advancementIntake, S.arcLifecycleResults, S.bondSummary, S.cityDynamics, S.civicLoad, S.culturalEntityCreates, S.culturalEntityUpdates, S.cycleId, S.cycleOfYear, S.cycleWeight, S.cycleWeightReason, S.economicMood, S.economicNarrative, S.employmentRate, S.eventArcs, S.godWorldYear, S.holiday, S.holidayPriority, S.hookLifecycle, S.illnessRate, S.isCreationDay, S.isFirstFriday, S.migrationDrift, S.month, S.neighborhoodEconomies, S.patternFlag, S.pendingConfrontations, S.promotions, S.season, S.sentiment, S.shockFlag, S.sportsEventTriggers, S.sportsSeason, S.storySeeds, S.storylineHealth, S.tierPromotions, S.totalPopulation, S.weather, S.worldEvents
  Writes: S.economicSummary, S.mediaBriefing
  Config: ctx.config.cycleCount
  Sheets: Media_Briefing

- **generateCitizenSpotlight_(ctx, S, cal)**
  Reads: S.bondSummary, S.eventArcs

- **generateStorylineBrief_(ctx, S, cycle)**
  Sheets: Storyline_Tracker

- **getCivicContext_(ss, cycle, cal)**
  Sheets: Civic_Office_Ledger, Election_Log

- **formatPercent_(value)**

- **getHolidayZones_(holiday)**

- **getHolidayStoryIdeas_(cal, civic, S)**

- **determineFrontPage_(S, ctx, cal, civic)**
  Reads: S.cycleWeightReason, S.eventArcs, S.shockFlag

- **getArcReporter_(arcType, domain)**

- **categorizeArcs_(arcs, cycle)**

- **getContinuityFromLoop_(ss, cycle)**
  Sheets: Storyline_Tracker

- **getEngineContinuity_(S, arcs)**
  Reads: S.migrationDrift, S.patternFlag

- **generateVoiceProfiles_(frontPageCall, assignments, arcReport)**

- **generateSectionAssignments_(S, arcReport, seeds, promotions, cal, civic)**
  Reads: S.culturalEntityCreates

- **extractJournalistName_(str)**

- **extractAllJournalistNames_(str)**

- **getAssignmentDetail_(assignmentStr)**

### mediaRoomIntake.js
- **processMediaIntake_(ctx)**
  Writes: S.intakeProcessed
  Config: ctx.config.cycleCount

- **processMediaIntakeV2()**

- **processAllIntakeSheets_(ss, cycle, cal)**

- **getCurrentCalendarContext_(ss)**
  Sheets: World_Population

- **processArticleIntake_(ss, cycle, cal)**
  Sheets: Media_Intake

- **processStorylineIntake_(ss, cycle, cal)**
  Sheets: Storyline_Intake

- **processCitizenUsageIntake_(ss, cycle, cal)**
  Sheets: Citizen_Usage_Intake

- **routeCitizenUsageToIntake_(ss, cycle, cal)**
  Sheets: Advancement_Intake, Advancement_Intake1, Citizen_Media_Usage, Intake, Simulation_Ledger

- **processContinuityIntake_(ss, cycle, cal)**

- **setupMediaIntakeV2()**
  Sheets: Citizen_Usage_Intake, Media_Intake, Storyline_Intake

- **setupArticleValidation_(sheet)**

- **setupStorylineValidation_(sheet)**

- **setupUsageValidation_(sheet)**

- **setupContinuityValidation_(sheet)**

- **ensurePressDraftsSheet_(ss)**
  Sheets: Press_Drafts

- **ensureStorylineTracker_(ss)**
  Sheets: Storyline_Tracker

- **ensureCitizenMediaUsage_(ss)**
  Sheets: Citizen_Media_Usage

- **getCurrentCycle_(ss)**
  Sheets: World_Config

- **logCulturalMention_(ss, cycle, journalist, entityName, cal)**
  Sheets: Cultural_Ledger, Media_Ledger

- **flagCitizenForTierReview_(ss, citizenName, cycle, usageType)**
  Sheets: Advancement_Intake

- **upgradeMediaIntakeSheets()**

- **upgradeSheetWithCalendarColumns_(ss, sheetName, expectedOriginalCols)**

- **upgradeMediaLedgerWithCalendar_(ss)**
  Sheets: Media_Ledger

- **clearAllProcessedIntake()**

- **processRawCitizenUsageLog_(ss, rawText, cycle, cal)**
  Sheets: Simulation_Ledger

- **parseRawCitizenUsageLog_(rawText)**

- **parseCitizenEntry_(entry, section, team)**

- **citizenExistsInLedger_(ledgerData, firstName, lastName)**

- **splitName_(fullName)**

- **processCategoryEntries_(ss, entries, category, ledgerData, cycle, cal, results)**
  Sheets: Advancement_Intake, Advancement_Intake1, Intake

- **processQuotedCitizens_(ss, entries, ledgerData, cycle, cal, results)**
  Sheets: Advancement_Intake, Advancement_Intake1, Intake, LifeHistory_Log

- **processRawCitizenUsageLogManual()**
  Sheets: MediaRoom_Paste

### parseMediaIntake.js
- **parseMediaIntake_(ctx, mediaText)**
  Reads: S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.month, S.season, S.simMonth, S.sportsSeason

### parseMediaRoomMarkdown.js
- **diagnosePasteSheet()**
  Sheets: MediaRoom_Paste

- **parseMediaRoomMarkdown()**
  Sheets: MediaRoom_Paste

- **parseAndProcessMediaRoom()**

- **parseAllSections_(ss, markdown)**

- **normalizeMarkdown_(text)**

- **extractSection_(markdown, sectionName)**

- **parseArticleTable_(ss, section)**

- **parseStorylines_(ss, section)**

- **parseCitizenUsage_(ss, section)**

- **parseContinuityNotes_(ss, section)**
  Sheets: LifeHistory_Log, World_Config

- **isSubsectionHeader_(line)**

- **cleanSubsectionName_(line)**

- **parseNoteLine_(line, subsection, relatedArc)**

- **determineNoteType_(line, subsection)**

- **extractCitizenNames_(line)**

- **ensureMediaIntakeSheet_(ss)**
  Sheets: Media_Intake

- **ensureStorylineIntakeSheet_(ss)**
  Sheets: Storyline_Intake

- **ensureCitizenUsageIntakeSheet_(ss)**
  Sheets: Citizen_Usage_Intake

### sportsStreaming.js
- **buildEveningSportsAndStreaming_(ctx)**
  Reads: S.cityDynamics, S.economicMood, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.nightlifeVolume, S.sportsFeedEntries, S.sportsSeason, S.weather, S.weatherMood, S.worldEvents
  Writes: S.eveningSports, S.eveningSportsCalendarContext, S.eveningSportsDetails, S.streamingTrend
  RNG: ctx.rng / safeRand_(ctx)

### storyHook.js
- **storyHookEngine_(ctx)**
  Reads: S.absoluteCycle, S.citizenBonds, S.cityDynamics, S.creationDayAnniversary, S.cycleId, S.cycleOfYear, S.demographicShifts, S.domainPresence, S.eventArcs, S.failedInitiatives, S.holiday, S.holidayNeighborhood, S.holidayPriority, S.initiativeEvents, S.initiativeRipples, S.isCreationDay, S.isFirstFriday, S.migrationDrift, S.neighborhoodDemographics, S.positiveInitiatives, S.relationshipBonds, S.season, S.shockFlag, S.sportsEventTriggers, S.sportsSeason, S.votesThisCycle, S.weather, S.weatherEvents, S.weatherMood, S.worldEvents
  Writes: S.activeStorylineCount, S.dormantStorylineCount, S.patternFlag, S.storyHooks
  Config: ctx.config.cycleCount
  Sheets: Storyline_Tracker

### storylineWeavingEngine.js
- **weaveStorylines_(ctx)**
  Writes: S.storyHooks, S.storylineWeaving
  Config: ctx.config.cycleCount

- **loadActiveStorylines_(ss)**
  Sheets: Storyline_Tracker

- **parseJSON(value, defaultValue)**

- **buildCitizenStorylineMap_(storylines)**

- **parseCitizenList_(citizenString)**

- **findMultiStorylineCitizens_(citizenMap)**

- **assignCitizenRoles_(ss, storylines, cycle)**
  Sheets: Storyline_Tracker

- **autoAssignRoles_(citizens, storyline)**

- **inferConflictType_(storyline, roles)**

- **detectCrossStorylineConflicts_(ss, storylines, multiCitizens, cycle)**

- **findStorylineById_(storylines, storylineId)**

- **detectRelationshipClashes_(ss, storylines, cycle)**

- **detectAllianceOpportunities_(ss, storylines, cycle)**

- **getCitizensByRole_(storyline, role)**

- **updateCrossStorylineLinks_(ss, storylines, multiCitizens)**
  Sheets: Storyline_Tracker

### textureTriggers.js
- **mulberry32_(seed)**

- **textureTriggerEngine_(ctx)**
  Reads: S.cityDynamics, S.domainPresence, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.recoveryLevel, S.sportsSeason, S.weather, S.worldEvents
  Writes: S.textureCalendarContext, S.textureTriggers
  Config: ctx.config.rngSeed
  RNG: ctx.rng / safeRand_(ctx)

### updateMediaSpread.js
- **updateMediaSpread_(sheet, row, journalistName)**

### updateTrendTrajectory.js
- **updateTrendTrajectory_(sheet, row, fameScore)**

## Phase 8: V3 Chicago (`phase08-v3-chicago/`)

### applyCycleRecovery.js
- **applyCycleRecovery_(ctx)**
  Reads: S.absoluteCycle, S.civicLoadScore, S.cycleId, S.economicMood, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.sportsSeason, S.storyHooks, S.textureTriggers, S.weatherMood, S.worldEvents
  Writes: S.civicLoad, S.eventSuppression, S.hookSuppression, S.overloadScore, S.recoveryCalendarContext, S.recoveryDuration, S.recoveryLevel, S.recoveryMode, S.recoveryStartCycle, S.recoveryState, S.recoveryThresholds, S.recoveryWindow, S.shockFlag, S.suppressEvents, S.suppressHooks, S.suppressTextures, S.textureSuppression
  Config: ctx.config.cycleCount

### applyDomainCooldowns.js
- **applyDomainCooldowns_(ctx)**
  Reads: S.absoluteCycle, S.cycleId, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.sportsSeason, S.worldEvents
  Writes: S.activeCooldowns, S.cooldownCalendarContext, S.domainCooldowns, S.suppressDomains
  Config: ctx.config.cycleCount

### chicagoSatellite.js
- **chicagoSatelliteEngine_(ctx)**
  Reads: S.absoluteCycle, S.cycleId, S.cycleInMonth, S.cycleOfYear, S.godWorldYear, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.month, S.season, S.simMonth, S.sportsSeason, S.sportsState_Chicago
  Writes: S.chicagoFeed
  Config: ctx.config.sportsState_Chicago
  RNG: ctx.rng / safeRand_(ctx)

- **generateChicagoWeather_(month, season, holiday, rng)**

- **calculateChicagoSentiment_(ctx, weather, holiday, holidayPriority, bullsSeason, rng)**

- **getBullsSentimentImpact_(ctx)**
  Reads: S.absoluteCycle, S.cycleId
  Config: ctx.config.cycleCount
  Sheets: Game_Intake

- **generateChicagoEvents_(weather, sentiment, month, holiday, isFirstFriday, cycleOfYear, rng)**

- **generateChicagoTravel_(weather, holiday)**

- **getMonthFromCycleInternal_(cycleOfYear)**

### v3ChicagoWriter.js
- **saveV3Chicago_(ctx)**
  Reads: S.absoluteCycle, S.chicagoCitizens, S.chicagoFeed, S.cycleId, S.cycleInMonth, S.cycleOfYear, S.economicMood, S.godWorldYear, S.holiday, S.season, S.simMonth, S.weatherMood
  Config: ctx.config.cycleCount
  Sheets: Chicago_Feed
  RNG: ctx.rng / safeRand_(ctx)

- **deriveChicagoFeedV24_(ctx, godWorldYear, cycleOfYear, simMonth, cycleInMonth, season, holiday, rng)**
  Reads: S.chicago, S.economicMood

- **getBullsSeasonV24_(ctx)**
  Config: ctx.config.sportsState_Chicago

- **getMonthFromCycleInternal_(cycleOfYear)**

- **deriveChicagoWeatherTypeV24_(simMonth, rng)**

- **deriveChicagoTempV24_(simMonth, weatherType, rng)**

- **deriveWeatherImpactV24_(weatherType)**

- **deriveWeatherMoodV24_(weatherType)**

- **deriveComfortIndexV24_(temperature, weatherType)**

- **deriveChicagoSentimentV24_(summary, rng)**

- **deriveChicagoEventsV24_(weatherType, simMonth, holiday)**

- **deriveChicagoTravelV24_(weatherType, weatherImpact, holiday)**

- **round2V24_(n)**

### v3DomainWriter.js
- **saveV3Domains_(ctx)**
  Reads: S.cycleId, S.domainPresence, S.dominantDomain, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.sportsSeason
  Config: ctx.config.cycleCount

- **deriveDomainPresenceV34_(ctx)**
  Reads: S.cityDynamics, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.sportsSeason, S.storyHooks, S.storySeeds, S.weather, S.worldEvents

- **normalizeDomainV34_(domain)**

- **inferDomainFromTextV34_(text)**

- **cleanupDomainTrackerV34()**
  Sheets: Domain_Tracker

### v3Integration.js
- **economicRippleEngine_(ctx)**

- **mediaFeedbackEngine_(ctx)**

- **bondEngine_(ctx)**

- **v3Integration_(ctx)**
  Reads: S.domainPresence, S.economicRipples, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.relationshipBonds, S.season, S.sportsSeason, S.textureTriggers
  Writes: S.cycleId, S.eventArcs, S.v3CalendarContext, S.v3IntegrationComplete, S.v3ModulesRan
  Config: ctx.config.cycleCount

### v3LedgerWriter.js
- **saveV3ArcsToLedger_(ctx)**
  Reads: S.cycleId, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.sportsSeason
  Config: ctx.config.cycleCount

### v3NeighborhoodWriter.js
- **saveV3NeighborhoodMap_(ctx)**
  Reads: S.cityDynamics, S.cycleId, S.demographicDrift, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.migrationDrift, S.sportsSeason, S.storyHooks, S.storySeeds, S.v3Arcs, S.weather, S.worldEvents
  Config: ctx.config.cycleCount
  RNG: ctx.rng / safeRand_(ctx)

- **ensureNeighborhoodMapSchemaAppendOnly_(ss, sheetName, headers)**

- **buildHolidayNeighborhoodMods_(holiday, isFirstFriday, isCreationDay, sportsSeason)**

- **getDemographicMarkerV35_(neighborhood, baseLabel, arcByNeighborhood, summary, holiday, isFirstFriday, isCreationDay)**

### v3StoryHookWriter.js
- **saveV3Hooks_(ctx)**
  Reads: S.cycleId, S.storyHooks
  Config: ctx.config.cycleCount

### v3TextureWriter.js
- **saveV3Textures_(ctx)**
  Reads: S.cycleId, S.textureTriggers
  Config: ctx.config.cycleCount

### v3preLoader.js
- **v3PreloadContext_(ctx)**
  Writes: S.activeBonds, S.auditIssues, S.chicagoFeed, S.chicagoSnapshot, S.cityEventDetails, S.civicLoadFactors, S.crowdHotspots, S.crowdMap, S.domainPresence, S.domains, S.economicMood, S.economicRipples, S.eventArcs, S.famousSightings, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.mediaEffects, S.namedSpotlights, S.neighborhoodPresence, S.newBonds, S.newCitizens, S.promotions, S.season, S.shockReasons, S.sportsSeason, S.storyHooks, S.storySeeds, S.textureTriggers, S.textures, S.weatherMood, S.worldEvents

- **loadActiveArcsFromLedger_(ctx)**
  Writes: S.eventArcs
  Sheets: Event_Arc_Ledger

## Phase 9: Digest (`phase09-digest/`)

### applyCompressionDigestSummary.js
- **applyCompressedDigestSummary_(ctx)**
  Reads: S.citizensGenerated, S.cityDynamics, S.civicLoad, S.civicLoadScore, S.cycle, S.cycleId, S.cycleWeight, S.cycleWeightScore, S.demographicDrift, S.domainCooldowns, S.economicMood, S.economicRipples, S.eventArcs, S.eventsGenerated, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.mediaEffects, S.namedSpotlights, S.newBonds, S.overloadScore, S.patternFlag, S.promotionsCount, S.recoveryLevel, S.season, S.shockFlag, S.sportsSeason, S.storyHooks, S.storySeeds, S.weather, S.weatherMood, S.worldEvents
  Writes: S.compressedLine, S.cycleSummary
  Config: ctx.config.cycleCount

### applyCycleWeight.js
- **applyCycleWeight_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.cycle, S.cycleId, S.domainPresence, S.economicMood, S.economicRipples, S.eventArcs, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.mediaEffects, S.patternFlag, S.recoveryLevel, S.shockFlag, S.sportsSeason, S.storyHooks, S.storySeeds, S.weather, S.worldEvents
  Writes: S.cycleWeight, S.cycleWeightCalendarFactors, S.cycleWeightReason, S.cycleWeightScore
  Config: ctx.config.cycleCount

- **writeCycleWeightToDigest_(ctx)**
  Reads: S.cycleWeight, S.cycleWeightCalendarFactors, S.cycleWeightReason
  Sheets: Riley_Digest

### applyCycleWeightForLatestCycle.js
- **applyCycleWeightForLatestCycle_(ctx)**
  Reads: S.cycle, S.cycleId, S.cycleWeight, S.cycleWeightReason, S.cycleWeightScore, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.season, S.sportsSeason
  Config: ctx.config.cycleCount
  Sheets: Riley_Digest

### finalizeCycleState.js
- **finalizeCycleState_(ctx)**
  Reads: S.activeCooldowns, S.cityDynamics, S.civicLoad, S.civicLoadScore, S.cycle, S.cycleId, S.cycleWeight, S.cycleWeightScore, S.domainPresence, S.dominantDomain, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.mediaEffects, S.neighborhoodDynamics, S.overloadScore, S.patternFlag, S.recoveryLevel, S.season, S.shockFlag, S.shockStartCycle, S.sportsSeason, S.weather, S.worldEvents
  Writes: S.cycleFinalState, S.cycleFinalizedAt, S.economicMood, S.eventsGenerated, S.previousCycleState
  Config: ctx.config.cycleCount

- **compactMediaEffects_(mediaEffects)**

- **snapshotEveningForCarryForward_(ctx)**
  Reads: S.crowdHotspots, S.crowdMap, S.cycleId, S.eveningFood, S.eveningSafety, S.eveningSports, S.eveningTraffic, S.famousSightings, S.nightlife, S.nightlifeVolume, S.streamingTrend
  Writes: S.eveningSnapshot

- **saveEveningSnapshot_(ctx)**
  Reads: S.eveningSnapshot

- **savePreviousCycleState_(ctx)**
  Reads: S.previousCycleState

- **compactNeighborhoodDynamics_(nd)**

## Phase 10: Persistence (`phase10-persistence/`)

### buildCyclePacket.js
- **buildCyclePacket_(ctx)**
  Reads: S.absoluteCycle, S.bondSummary, S.chicagoFeed, S.cityDynamics, S.cityEventDetails, S.civicLoad, S.civicLoadFactors, S.civicLoadScore, S.compressedLine, S.creationDayAnniversary, S.crimeMetrics, S.crowdHotspots, S.crowdMap, S.cycleId, S.cycleInMonth, S.cycleOfYear, S.cycleRef, S.cycleSummary, S.cycleWeight, S.cycleWeightReason, S.demographicShifts, S.domainPresence, S.dominantDomain, S.economicSummary, S.eveningFood, S.eveningSafety, S.eveningTraffic, S.eventArcs, S.generationalEvents, S.generationalSummary, S.godWorldYear, S.holiday, S.holidayNeighborhood, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.mediaSummary, S.migrationBrief, S.migrationDrift, S.month, S.namedSpotlights, S.neighborhoodDynamics, S.neighborhoodEconomies, S.neighborhoodMigration, S.nightlife, S.patternFlag, S.season, S.shockDuration, S.shockFlag, S.shockReasons, S.shockScore, S.simMonth, S.storyHooks, S.textureTriggers, S.transitMetrics, S.weather, S.weatherSummary, S.worldEvents, S.worldPopulation
  Writes: S.cyclePacket

- **getCivicContextForPacket_(ss, cycle, cal)**
  Sheets: Civic_Office_Ledger, Election_Log

- **getMonthName_Packet_(month)**

### compileHandoff.js
- **compileHandoffFromMenu()**

- **compileHandoff(cycleNumber)**

- **loadHandoffData_(cache, cycle)**

- **loadMediaBriefingRow_(cache, cycle)**

- **loadCyclePacketText_(cache, cycle)**

- **loadActiveStorylines_(cache, cycle)**

- **loadWorldEvents_(cache, cycle)**

- **loadStorySeeds_(cache, cycle)**

- **loadCivicOfficers_(cache)**

- **extractCouncilMembers_(officers)**

- **loadInitiatives_(cache)**

- **loadPlayerRosters_(cache)**

- **loadRecentQuotes_(cache, cycle)**

- **loadCulturalEntities_(cache)**

- **buildHandoffHeader_(cycle)**

- **buildSectionWrapper_(num, title, builderFn, data, extra)**

- **buildSection01_EditorialHeader_(data, cycle)**

- **buildSection02_FrontPage_(data)**

- **buildSection03_CivicStatus_(data)**

- **buildSection04_Storylines_(data)**

- **buildSection06_WorldEvents_(data)**

- **buildSection07_StorySeeds_(data)**

- **buildSection08_ArcStatus_(data)**

- **buildSection09_Calendar_(data)**

- **buildSection10_Cultural_(data)**

- **buildSection11_Continuity_(data)**

- **buildSection12_SectionAssignments_(data)**

- **buildSection13_ReturnsExpected_()**

- **buildSection14_CanonReference_(data)**

- **extractBriefingSection_(text, sectionNum)**

- **extractPacketSection_(text, sectionName)**

- **parsePacketField_(text, fieldName)**

- **extractHandoffCitizenNames_(data)**

- **loadSportsFeeds_(cache, cycle)**

- **loadSingleSportsFeed_(cache, sheetName, cycle)**

- **buildSection15_SportsFeeds_(data)**

- **formatSportsFeedEntry_(entry)**

- **writeHandoffSheet_(ss, cycle, handoffText)**

- **exportHandoffToDrive_(cycle, handoffText)**

### cycleExportAutomation.js
- **exportCurrentCycleAll()**

- **updateAllMirrors()**

- **fullExportAndMirror()**

- **exportRileyDigest()**

- **exportWorldPopulation()**

- **exportSimulationLedger()**

- **exportContinuityLog()**

- **exportSingleSheet_(sheetName)**

- **sheetToText_(sheet)**

- **formatMirrorEntry_(sheetName, cycle, sheet)**

- **getOrCreateExportFolder_()**

- **saveTextFile_(folder, fileName, content)**

- **appendToMirror_(folder, fileName, newContent)**

- **getCurrentCycle_(ss)**
  Sheets: World_Population

- **openExportFolder()**

- **showConfig()**

- **showAlert_(title, message)**

- **setupAutoExportTrigger()**

- **removeAutoExportTrigger()**

### persistenceExecutor.js
- **executePersistIntents_(ctx)**

- **executeReplaceIntent_(ctx, intent)**

- **executeSheetIntents_(ctx, sheetName, intents)**

- **groupIntentsBySheet_(intents)**

- **getTotalIntentCount_(ctx)**

- **logIntentSummary_(ctx)**

- **bridgeAppendRow_(ctx, sheetName, row, reason, domain)**

- **bridgeSetValue_(ctx, sheetName, row, col, value, reason, domain)**

- **bridgeSetValues_(ctx, sheetName, startRow, startCol, values, reason, domain)**

### recordCycleWeather.js
- **recordCycleWeather_(ctx)**
  Reads: S.absoluteCycle, S.cycleId, S.weather, S.weatherSummary, S.weatherTracking
  Config: ctx.config.cycleCount

- **ensureCycleWeatherSheet_(ss)**

- **getWeatherForCycle_(ss, cycleId)**
  Sheets: Cycle_Weather

- **getWeatherHistory_(ss, startCycle, endCycle)**
  Sheets: Cycle_Weather

### recordMediaLedger.js
- **recordMediaLedger_(ctx)**
  Reads: S.chicagoFeed, S.cityDynamics, S.civicLoad, S.cycleId, S.cycleWeight, S.cycleWeightReason, S.domainPresence, S.economicMood, S.eventArcs, S.mediaEffects, S.mediaIntake, S.nightlifeVolume, S.patternFlag, S.shockFlag, S.storyHooks, S.storySeeds, S.textureTriggers, S.weather, S.weatherMood, S.worldEvents
  Config: ctx.config.cycleCount
  Sheets: Cultural_Ledger, Media_Ledger

### recordWorldEventsv25.js
- **recordWorldEvents25_(ctx)**
  Reads: S.cityDynamics, S.civicLoad, S.cycleId, S.holiday, S.holidayPriority, S.isCreationDay, S.isFirstFriday, S.migrationDrift, S.month, S.nightlifeVolume, S.patternFlag, S.season, S.shockFlag, S.sportsSeason, S.storySeeds, S.weather, S.worldEvents
  Sheets: WorldEvents_Ledger

- **ensureWorldEventsLedger_(ctx)**
  Sheets: WorldEvents_Ledger

- **upgradeWorldEventsLedger_(ctx)**
  Sheets: WorldEvents_Ledger

### recordWorldEventsv3.js
- **recordWorldEventsv3_(ctx)**
  Reads: S.cycleId, S.worldEvents
  Config: ctx.config.cycleCount
  Sheets: WorldEvents_V3_Ledger
  RNG: ctx.rng / safeRand_(ctx)

### saveV3Seeds.js
- **saveV3Seeds_(ctx)**
  Reads: S.cycleId, S.storySeeds
  Config: ctx.config.cycleCount

## Phase 11: Media Intake (`phase11-media-intake/`)

### continuityNotesParser.js
- **parseContinuityNotes()**
  Sheets: Continuity_Intake, Raw_Continuity_Paste

- **parseLines_(lines, arcName)**

- **isSectionHeader_(line)**

- **cleanSectionName_(line)**

- **parseLine_(line, section, arcName)**

- **determineNoteType_(line, section)**

- **extractCitizens_(line)**

- **setupContinuityParser()**
  Sheets: Raw_Continuity_Paste

- **parseContinuityText(textBlock, arcName)**

### healthCauseIntake.js
- **normalizeHealthStatus_(status)**

- **isHealthStatusNeedingCause_(status)**

- **exportHealthCauseQueue_(ctx)**
  Reads: S.cycleId, S.simYear
  Config: ctx.config.cycleCount
  Sheets: Health_Cause_Queue, Simulation_Ledger

- **parseHealthCauseMarkdown_(markdown)**

- **processHealthCauseIntake_(ctx, markdownInput)**
  Reads: S.cycleId
  Config: ctx.config.cycleCount
  Sheets: Health_Cause_Intake, Simulation_Ledger

- **updateHealthCauseQueue_(ss, assignments, cycle)**
  Sheets: Health_Cause_Queue

- **generateHealthCauseBriefing_(ctx)**
  Sheets: Health_Cause_Queue

- **runExportHealthCauseQueue()**

- **runProcessHealthCauseIntake()**

- **runGenerateHealthBriefing()**

## Utilities (`utilities/`)

### compressLifeHistory.js
- **compressLifeHistory_(ctx, options)**
  Reads: S.absoluteCycle, S.cycleId
  Writes: S.lifeHistoryCompression
  Sheets: Simulation_Ledger

- **parseLifeHistoryEntries_(historyStr)**

- **parseHistoryLine_(line)**

- **extractCycleNumber_(text)**

- **parseLastUpdateCycle_(profileStr)**

- **computeProfile_(entries, currentCycle, basis)**

- **applyTagToTraits_(tag, weight, traitScores)**

- **extractMotifs_(text, weight, motifCounts)**

- **sanitizeMotif_(s)**

- **assignArchetype_(traitScores)**

- **getModifiers_(traitScores, archetype)**

- **getTopN_(counts, n)**

- **round2_(n)**

- **formatProfileString_(profile, cycle, basis)**

- **shortHash_(s)**

- **trimLifeHistory_(entries, keepCount, profile, cycle)**

- **createCompressedBlock_(oldEntries, profile, cycle)**

- **getCitizenArchetype_(ctx, popId)**

- **parseProfileString_(profileStr)**

### cycleModes.js
- **seededRng_(seed)**

- **seededRngFor_(seed, salt)**

- **hashInt32_(x)**

- **hashString_(str)**

- **initializeModeFlags_(ctx)**

- **initializeDryRunMode_(ctx)**

- **initializeReplayMode_(ctx, cycleId)**
  RNG: ctx.rng / safeRand_(ctx)

- **initializeSeededRng_(ctx)**
  Reads: S.cycleId
  Config: ctx.config.cycleCount
  RNG: ctx.rng / safeRand_(ctx)

- **saveCycleSeed_(ctx)**
  Reads: S.cycleId, S.holiday, S.weather, S.worldEvents, S.worldPopulation
  Config: ctx.config.cycleCount

- **loadCycleSeed_(ss, cycleId)**
  Sheets: Cycle_Seeds

- **buildCycleChecksum_(ctx)**
  Reads: S.holiday, S.relationshipBonds, S.storySeeds, S.weather, S.worldEvents, S.worldPopulation

- **compareReplayOutput_(ctx)**
  Reads: S.holiday, S.weather, S.worldEvents

- **initializeProfileMode_(ctx)**

- **startPhaseTimer_(ctx, phaseName)**

- **endPhaseTimer_(ctx, phaseName)**

- **getPhaseTimingSummary_(ctx)**

### cycleRollback.js
- **rollbackToCycle78()**

- **deleteRowsAfterCycle_(ss, sheetName, cycleColName, targetCycle)**

- **revertInitiativeVotes_(ss, targetCycle)**
  Sheets: Initiative_Tracker

- **revertCivicOfficeUpdates_(ss, targetCycle)**
  Sheets: Civic_Office_Ledger

- **resetCycleCounter_(ss, targetCycle)**
  Sheets: World_Config

- **previewRollbackToCycle78()**

- **countRowsAfterCycle_(ss, sheetName, cycleColName, targetCycle)**

### diagnoseDashboardData.js
- **diagnoseDashboardData()**
  Sheets: Chicago_Feed, Sports_Feed

### ensureCrimeMetrics.js
- **ensureCrimeMetricsSchema_(ss)**

- **getCrimeMetrics_(ss)**

- **getCrimeMetricsForNeighborhood_(ss, neighborhood)**

- **getCityWideCrimeStats_(ss)**

- **updateCrimeMetrics_(ctx, neighborhood, metrics)**
  Reads: S.absoluteCycle

- **batchUpdateCrimeMetrics_(ctx, metricsMap)**
  Reads: S.absoluteCycle

- **seedCrimeMetricsFromProfiles_(ctx, demographicsOpt)**

- **calculateCrimeShifts_(prevMetrics, currMetrics)**

- **getHighCrimeNeighborhoods_(ss, crimeType, threshold)**

- **getCrimeProfile_(neighborhood)**

### ensureCultureLedger.js
- **ensureCulturalLedger_(ctx)**
  Sheets: Cultural_Ledger

### ensureFaithLedger.js
- **ensureFaithLedgerSchema_(ss)**

- **ensureFaithOrgsSchema_(ss)**

- **getFaithOrganizations_(ss)**

- **getFaithOrgsByNeighborhood_(ss, neighborhood)**

- **getFaithOrgsByTradition_(ss, tradition)**

- **getRecentFaithEvents_(ss, cyclesBack)**

- **recordFaithEvent_(ctx, event)**
  Reads: S.absoluteCycle

- **batchRecordFaithEvents_(ctx, events)**
  Reads: S.absoluteCycle

- **getHolyDayForTradition_(tradition, month)**

- **pickFaithEvent_(eventType, rng)**

- **calculateAttendance_(congregation, eventType, rng)**

- **getFaithLeader_(organization)**

### ensureMediaLedger.js
- **ensureMediaLedger_(ctx)**
  Sheets: Media_Ledger

### ensureNeighborhoodDemographics.js
- **ensureNeighborhoodDemographicsSchema_(ss)**

- **getNeighborhoodDemographics_(ss)**
  Sheets: Neighborhood_Demographics

- **getNeighborhoodDemographic_(ss, neighborhood)**

- **updateSingleNeighborhoodDemographics_(ss, neighborhood, demographics, cycle)**

- **batchUpdateNeighborhoodDemographics_(ss, demographicsMap, cycle)**

- **seedNeighborhoodDemographicsFromLedger_(ss, cycle)**
  Sheets: Simulation_Ledger

- **calculateDemographicShifts_(previous, current)**

- **getDemographicWeightedNeighborhoods_(demographics, citizenType)**

### ensureRelationshipBonds.js
- **ensureRelationshipBondsSchema_(ss)**

- **ensureRelationshipBondLedgerSchema_(ss)**

- **ensureRelationshipBondSchemas_(ctx)**

- **validateRelationshipBondsSchema_(ss)**

### ensureTransitMetrics.js
- **ensureTransitMetricsSchema_(ss)**

- **getBARTStations_()**

- **getBARTStationForNeighborhood_(neighborhood)**

- **getACTransitLines_()**

- **getTrafficCorridors_()**

- **getTransitMetrics_(ss, cycle)**

- **getTransitSummary_(ss, cycle)**

- **recordTransitMetrics_(ctx, metrics)**
  Reads: S.absoluteCycle

- **batchRecordTransitMetrics_(ctx, metricsArray)**
  Reads: S.absoluteCycle

- **calculateRidershipModifier_(context)**

- **calculateTrafficModifier_(context)**

- **getNearestBARTStation_(neighborhood)**

- **getCorridorForNeighborhood_(neighborhood)**

### ensureWorldEventsV3Ledger.js
- **ensureWorldEventsV3Ledger_(ctx)**
  Sheets: WorldEvents_V3_Ledger

### exportCitizensSnapshot.js
- **exportCitizensSnapshot_()**
  Sheets: Simulation_Ledger

- **exportCivicOfficials_()**
  Sheets: Civic_Office_Ledger

- **exportAllCitizenData_()**

- **findCol_(colMap, names)**

- **ensureExportsFolder_()**

### exportCycleArtifacts.js
- **exportCycleArtifacts_(ctx, opts)**
  Reads: S.absoluteCycle, S.cycleId
  Config: ctx.config.cycleCount

- **normalizeSummarySnapshot_(S, ctx)**

- **buildCycleContextPack_(S, ctx, cycleId)**
  Reads: S.cityDynamics, S.crimeMetrics, S.cycleActiveCitizens, S.economicMood, S.grantsThisCycle, S.initiativeEvents, S.season, S.votesThisCycle, S.weather, S.worldEvents

- **slimVotes_(votes)**

- **slimGrants_(grants)**

- **slimInitiativeEvents_(events)**

- **inferKeyCitizens_(votes, initiativeEvents, activeCitizens)**

- **buildContinuityHints_(S, ctx)**
  Reads: S.eventArcs, S.frequentCitizens, S.recurringCitizens, S.votesThisCycle

- **countDomains_(events, domains)**

- **ensureFolderByName_(name)**

- **writeOrUpdateFile_(folder, filename, contents, forceWrite)**

- **readJsonFile_(folder, filename)**

- **capManifestCycles_(manifest, maxCycles)**

- **sha256Hex_(str)**

- **pad2_(n)**

### exportSchemaHeaders.js
- **exportAndPushToGitHub()**

- **exportAllHeaders()**

- **exportSingleSheetHeaders(sheetName)**

- **columnToLetter_(col)**

### godWorldDashboard.js
- **createGodWorldDashboard()**
  Sheets: Dashboard

- **refreshDashboard()**
  Sheets: Dashboard

### godWorldMenu.js
- **onOpen()**

### rollbackToCycle80.js
- **rollbackToCycle80()**

- **deleteRowsAfterCycle_(ss, sheetName, cycleColName, targetCycle)**

- **resetCycleCounter_(ss, targetCycle)**
  Sheets: World_Config

### rosterLookup.js
- **loadRoster_()**

- **getRoster_()**

- **getJournalist_(name)**

- **getJournalistTone_(name)**

- **getJournalistDesk_(name)**

- **getJournalistBySignal_(signalType)**

- **getJournalistsByDesk_(deskName)**

- **formatJournalist_(name, suffix)**

- **formatJournalistShort_(name)**

- **getArcReporterFromRoster_(arcType, domain)**

- **getSportsAssignment_(sportsSeason)**

- **isValidJournalist_(name)**

- **getAllJournalistNames_()**

- **getJournalistOpeningStyle_(name)**

- **getJournalistThemes_(name)**

- **getJournalistSamplePhrases_(name)**

- **getJournalistBackground_(name)**

- **getVoiceGuidance_(journalistName, storyType)**

- **getFullVoiceProfile_(name)**

- **getVoiceProfileObject_(name)**

- **findJournalistsByTheme_(theme)**

- **getThemeKeywordsForDomain_(domain, hookType)**

- **suggestStoryAngle_(eventThemes, signalType)**

- **matchCitizenToJournalist_(citizenArchetype, neighborhoodContext, storyDomain)**

### safeRand.js
- **safeRand_(ctx)**
  Reads: S.cycleId
  Config: ctx.config.cycleCount, ctx.config.rngSeed
  RNG: ctx.rng / safeRand_(ctx)

### setupCivicLedgerColumns.js
- **setupCivicLedgerColumns()**
  Sheets: Civic_Office_Ledger

- **fixElliottCraneStatus()**
  Sheets: Civic_Office_Ledger

- **fixElliottCraneStatus_(sheet, data, headers)**

### setupInitiativeTrackerValidation.js
- **setupInitiativeTrackerValidation()**
  Sheets: Initiative_Tracker

- **applyInitiativeDropdown_(sheet, startRow, col, numRows, values, name)**

- **clearInitiativeTrackerValidation()**
  Sheets: Initiative_Tracker

### setupSportsFeedValidation.js
- **setupSportsFeedValidation()**
  Sheets: Chicago_Sports_Feed, Oakland_Sports_Feed

- **setupOaklandFeedOnly()**
  Sheets: Oakland_Sports_Feed

- **setupChicagoFeedOnly()**
  Sheets: Chicago_Sports_Feed

- **setupFeedSheet_(sheet, city, teamValues, neighborhoodValues)**

- **applyDropdownValidation_(sheet, startRow, col, numRows, values, name)**

- **clearSportsFeedValidation()**

### sheetCache.js
- **createSheetCache_(ss)**

- **createColIndex_(header)**

- **safeColRead_(row, colIndex, defaultValue)**

### sheetNames.js
- **getSheet_(ss, sheetNameConstant)**

### textCrawler.js
- **crawlAllTxtFiles(rootFolderId, outputFileName)**

- **runTextCrawler()**

### utilityFunctions.js
- **pickRandom_(arr)**

- **pickRandomSet_(arr, count)**

- **maybePick_(arr)**

- **shortId_()**

- **ensureSheet_(ss, name, headers)**

- **colIndex_(letter)**

- **safeGet_(sheet, row, col)**

- **normalizeIdentity_(name)**

- **identityMatch_(name1, name2)**

- **domainAllowed_(ctx, domain)**
  Reads: S.suppressDomains

- **normalizeDomain_(d)**

- **getSimSpreadsheetId_()**

- **openSimSpreadsheet_()**

### v2DeprecationGuide.js
_No top-level function declarations found (helper/constants file)._

### writeIntents.js
- **initializePersistContext_(ctx)**

- **createWriteIntent_(tab, kind, address, values, reason, domain, priority)**

- **queueCellIntent_(ctx, tab, row, col, value, reason, domain, priority)**

- **queueRangeIntent_(ctx, tab, startRow, startCol, values, reason, domain, priority)**

- **queueAppendIntent_(ctx, tab, row, reason, domain, priority)**

- **queueBatchAppendIntent_(ctx, tab, rows, reason, domain, priority)**

- **queueReplaceIntent_(ctx, tab, allRows, reason, domain, priority)**

- **queueLogIntent_(ctx, tab, row, reason)**

- **getIntentsForSheet_(ctx, tab)**

- **getIntentCountsByDomain_(ctx)**

- **getIntentSummary_(ctx)**

- **clearAllIntents_(ctx)**

- **validateIntent_(intent)**

### youthActivities.js
- **ensureYouthEventsSchema_(ss)**

- **getSchoolsInNeighborhood_(neighborhood)**

- **assignSchoolForYouth_(age, neighborhood, rng)**

- **getRecentYouthEvents_(ss, cyclesBack)**

- **getYouthEventsForCitizen_(ss, youthId)**

- **recordYouthEvent_(ctx, event)**
  Reads: S.absoluteCycle

- **batchRecordYouthEvents_(ctx, events)**
  Reads: S.absoluteCycle

- **pickYouthEvent_(eventType, rng)**

- **getAcademicPeriod_(month)**

- **selectYouthEventType_(age, month, rng)**

- **generateYouthOutcome_(eventType, rng)**

---

**Files scanned:** 155
**Functions mapped:** 935
