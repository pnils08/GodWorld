# Engine Phase Data Audit

**Last refreshed:** Session 180/181 (2026-04-26) — research-build spot-check confirmed Phase 1–11 coverage still tracks current ctx.summary writes. Phase 40 coverage section unchanged from S156. S180 phase05 dict additions (PHASE_INTENSITY / PHASE_SENTIMENT — vote-ready / legislation-filed / pilot_evaluation values) do not introduce new ctx.summary fields. Prior baseline: S146 (Phase 1–11) + S156 (Phase 40 append).

What each phase writes to ctx.summary, what gets serialized to Cycle_Packet, and what reaches the newsroom via buildDeskPackets.js.

Purpose: Map the gap between what the engine produces and what the desk agents see.

**Note on section order:** Phase 7 leads this file by historical accident of append-patched growth; canonical order is Phase 1 → 11. Read by phase number, not file order.

---

## Phase 7 — Evening Media (phase07-evening-media/)

### Files examined:
- cityEveningSystems.js (v2.3) — night shift, traffic, nightlife volume, safety, crowd map
- buildNightLife.js (v2.4) — nightlife spots, vibes, movement
- buildEveningFood.js (v2.4) — restaurants, fast food, trends
- buildEveningFamous.js — celebrity sightings with locations and context
- buildEveningMedia.js — TV, movies, streaming, sports broadcasts
- sportsStreaming.js — evening sports events, streaming trends
- storyHook.js — active/dormant storyline counts
- applyStorySeeds.js — story seeds with domain, angle, priority
- storylineWeavingEngine.js — storyline weaving analysis
- textureTriggers.js — texture triggers with domain, neighborhood, intensity
- mediaFeedbackEngine.js — media summary (narrative, intensity, crisis saturation, celebrity buzz)
- culturalLedger.js — cultural entity updates/creates

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.nightlife | object | { spots: [names], spotDetails: [{name, neighborhood}], volume: 0-10, vibe: string, movement: string, weatherImpact, trafficLoad, economicInfluence, calendarContext } |
| S.nightlifeVolume | number (0-10) | Overall nightlife energy level. Calendar-aware (NYE +4, Halloween +3, etc.) |
| S.eveningFood | object | { restaurants: [names], restaurantDetails: [{name, neighborhood}], fast: [names], fastDetails, trend: string, economicInfluence, calendarContext } |
| S.eveningTraffic | string | "light" / "moderate" / "heavy" / "gridlock" — based on events, sports, weather, economy |
| S.eveningSafety | string | "calm" / "normal" / "cautious" / "uneasy" / "tense" / "festive-crowded" / "celebratory" / "art-walk-energy" |
| S.nightShiftLoad | number | Active night shift workers, calculated from World_Population employment × night rate |
| S.crowdMap | object | { neighborhood: crowdScore } for 12 Oakland neighborhoods. Boosted by holidays, sports, events, weather |
| S.crowdHotspots | array | Top 3 busiest neighborhoods |
| S.weatherImpact | number | Weather impact modifier (from cityEveningSystems) |
| S.weatherType | string | Current weather type |
| S.eveningSystemsCalendarContext | object | { holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, trafficScore, volumeScore } |
| S.eveningMedia | object | TV, movies, streaming, sports broadcasts, media influence, special programming |
| S.famousSightings | array | Celebrity sighting objects with locations, context, neighborhood focus |
| S.famousSightingsContext | object | Sighting intensity, neighborhood focus, weather influence, civic mood effect |
| S.eveningSports | string | Feed-derived: StoryAngle from Oakland_Sports_Feed entries joined with " | ", or "(none)" |
| S.eveningSportsDetails | object | Last feed entry object for current cycle, or null |
| S.streamingTrend | string | Trending sports streaming topic |
| S.textureTriggers | array | Texture triggers with domain, neighborhood, textureKey, reason, intensity, signalChain |
| S.textureCalendarContext | object | Calendar state + trigger count |
| S.mediaSummary | object | { narrative, intensity, crisisSaturation, celebrityBuzz, sentimentPressure, anxietyFactor, hopeFactor, calendarContext, holidayNarrative, sportsNarrative, seasonalMood } |
| S.storySeeds | array | Deduplicated story seeds with domain, angle, priority, reasoning |
| S.storyHooks | array | Story hooks from storyline weaving |
| S.storylineWeaving | object | Storyline weaving analysis results |
| S.culturalEntityUpdates | array | Cultural entity update records |
| S.culturalEntityCreates | array | New cultural entity creation records |

### What buildCyclePacket_ serializes from Phase 7:

Almost nothing. The "--- CITY DYNAMICS ---" section writes `dyn.nightlife` which is a cityDynamics modifier (a decimal like 1.0), NOT the Phase 7 nightlife object. The Phase 7 fields (S.nightlife, S.eveningFood, S.crowdMap, S.eveningTraffic, S.eveningSafety, S.nightShiftLoad, S.crowdHotspots) are not referenced anywhere in buildCyclePacket.js.

### What buildDeskPackets.js reads on the Node side:

buildEveningContext() at line 1100 parses:
- Media_Ledger entries (NightlifeVolume, FameScore, Sentiment, EconomicMood per citizen)
- Cycle_Packet text sections: CITY DYNAMICS (decimal modifiers), MEDIA CLIMATE (narrative, intensity), WEATHER MOOD (conditions, mood, streak)

Result: The desk agents get a thin evening context with city dynamics numbers and media climate text. No nightlife spots, no restaurants, no crowd maps, no food trends, no vibes, no evening safety atmosphere.

### Gap (v3.9 status):

**FIXED in v3.8:** Evening City section now serializes nightlife spots, restaurants, crowd hotspots, crowd map, food trends, safety, traffic. **FIXED in v3.9:** Story hooks now serialized. Remaining gap: celebrity sightings detail, evening media/streaming, cultural entity updates — minor.

---

## Phase 1 — Config (phase01-config/)

### Files examined:
- advanceSimulationCalendar.js (v2.3) — calendar, season, holiday, weather baseline
- godWorldEngine2.js (v2.14) — orchestrator, loadConfig_, advanceWorldTime_, updateWorldPopulation_

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.cycleId | number | Absolute cycle number (incremented each run) |
| S.absoluteCycle | number | Same as cycleId |
| S.godWorldYear | number | GodWorld Year (absoluteCycle / 52) |
| S.cycleOfYear | number (1-52) | Cycle within current year |
| S.cycleInMonth | number (1-5) | Cycle within current month |
| S.simYear | number | Alias for godWorldYear |
| S.simMonth | number (1-12) | Month derived from cycle |
| S.simDay | number | Alias for cycleInMonth |
| S.monthName | string | "January" through "December" |
| S.season | string | "Spring" / "Summer" / "Fall" / "Winter" |
| S.holiday | string | Holiday name or "none" (30+ holidays) |
| S.holidayDetails | object/null | { priority, neighborhood, ... } |
| S.holidayPriority | string | "major" / "cultural" / "oakland" / "minor" / "none" |
| S.holidayNeighborhood | string/null | Which neighborhood the holiday centers on |
| S.isFirstFriday | boolean | First Friday arts event flag |
| S.isCreationDay | boolean | GodWorld anniversary flag |
| S.creationDayAnniversary | number/null | Which anniversary |
| S.cycleRef | string | "Y2C35" format reference |
| S.weather | object | { type: "clear"/"rain"/"fog"/"hot", impact: number } — baseline, overwritten by Phase 2 |
| S.weatherMood | object | { primaryMood, comfortIndex, perfectWeather, conflictPotential, nostalgiaFactor, holidayEnergy, creationDayResonance } |
| S.worldPopulation | object | { totalPopulation, illnessRate, employmentRate, migration, economy, calendarFactors } |

### What buildCyclePacket_ serializes from Phase 1:

- Calendar section: godWorldYear, cycleOfYear, month, cycleInMonth, season, holiday, isFirstFriday, isCreationDay — ALL serialized
- Population section: total, illnessRate, employmentRate, economy — ALL serialized
- Weather section: type, impact, temp — serialized (but from S.weather, not S.weatherMood)

### What buildDeskPackets.js reads on the Node side:

- Simulation_Calendar sheet directly (godWorldYear, simMonth, season, holiday)
- Cycle_Packet text parsed for calendar and population sections
- World_Population sheet directly

### Gap:

Phase 1 is mostly preserved. Calendar data and population reach the newsroom. The weatherMood object (primaryMood, comfortIndex, perfectWeather, nostalgiaFactor, holidayEnergy) is partially serialized under WEATHER MOOD section but some fields like creationDayResonance are lost. Minor gap compared to Phase 7.

## Phase 2 — World State (phase02-world-state/)

### Files examined:
- applyWeatherModel.js — weather system, neighborhood weather, weather mood, weather events, weather summary
- applySportsSeason.js — sports season state, sentiment boost, event triggers, neighborhood effects
- applyCityDynamics.js — city-level dynamics (traffic, retail, nightlife, sentiment, etc.), cluster/neighborhood dynamics, capacity metrics, story seed signals
- updateTransitMetrics.js — BART station ridership, on-time rates, corridor traffic, transit alerts
- applySeasonWeights.js — seasonal weights, Creation Day flag
- calendarChaosWeights.js — chaos category weights per holiday/season
- calendarStorySeeds.js — seasonal story seeds
- getSimHoliday.js — holiday lookup from cycle
- getsimseason.js — season lookup from month

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.weather | object | { type, impact, temp, windSpeed, humidity, ... } — full weather model |
| S.weatherMood | object | { primaryMood, comfortIndex, perfectWeather, conflictPotential, nostalgiaFactor, ... } |
| S.weatherFrontTracking | object | Weather front movement data |
| S.neighborhoodWeather | object | Per-neighborhood weather variations (12 neighborhoods) |
| S.weatherEvents | array | Active weather events |
| S.weatherTracking | object | Multi-cycle weather tracking |
| S.weatherEventPools | object | Available weather event types |
| S.weatherSummary | object | { type, temp, impact, comfort, mood, energy, social, streak, streakType, alerts, perfectWeather } |
| S.previousSeason | string | Last cycle's season |
| S.sportsSeason | string | From Oakland_Sports_Feed SeasonType or World_Config override. "unknown" if no feed entries. |
| S.sportsSeasonOakland | string | Same as sportsSeason (Oakland-only since v3.0) |
| S.sportsSeasonChicago | string | Empty string (Chicago phased out after C91) |
| S.activeSports | array | Derived from TeamsUsed in feed: "baseball", "basketball", "football" |
| S.sportsSource | string | "config-override", "oakland-feed", or "oakland-feed-empty" |
| S.sportsFeedEntries | array | All Oakland_Sports_Feed rows for current cycle — {cycle, seasonType, eventType, teamsUsed, storyAngle, notes, ...} |
| S.sportsSentimentBoost | number | City sentiment shift from sports results |
| S.sportsEventTriggers | array | Sports events that trigger city effects |
| S.sportsNeighborhoodEffects | object | Per-neighborhood effects from sports (traffic, crowd) |
| S.cityDynamics | object | { traffic, retail, tourism, nightlife, publicSpaces, sentiment, culturalActivity, communityEngagement } — all decimals |
| S.clusterDynamics | object | Per-cluster (Downtown Core, Waterfront, etc.) dynamics |
| S.neighborhoodDynamics | object | Per-neighborhood dynamics (12 neighborhoods) |
| S.neighborhoodDemographics | object | Demographics per neighborhood from SL |
| S.cityDynamicsLag | object | Multi-cycle momentum tracking |
| S.cityDynamicsCapacity | object | { transitCapacity, venueCapacity, roadCapacity, peakTraffic, peakNightlife, congestion metrics } |
| S.storySeedSignals | array | Story seed signals from city dynamics patterns |
| S.transitMetrics | object | { totalRidership, avgOnTime, avgTraffic, factors: {weather, dayType, majorEvents, gameDay}, alerts: [...] } |
| S.seasonal | object | Seasonal weight modifiers |
| S.creationDayActive | boolean | Creation Day flag |
| S.chaosCategoryWeights | object | Weighted chaos probabilities per category |
| S.chaosCategoryMap | object | Category definitions |
| S.seasonalStorySeeds | array | Season/holiday-specific story seeds |

### What buildCyclePacket_ serializes from Phase 2:

- CITY DYNAMICS section: traffic, retail, nightlife, publicSpaces, tourism, culturalActivity, communityEngagement, sentiment — 8 decimals
- WEATHER section: type, impact, temp — 3 fields
- WEATHER MOOD section: conditions, mood, energy, social, streak, alerts, perfectWeather
- Sports season is NOT in Cycle_Packet (removed in v3.6)

### What buildDeskPackets.js reads on the Node side:

- Oakland_Sports_Feed and Chicago_Sports_Feed sheets directly → sportsFeedDigest
- Cycle_Packet text → city dynamics decimals, weather mood
- No access to: neighborhoodDynamics, clusterDynamics, transitMetrics, sportsNeighborhoodEffects, storySeedSignals, weatherEvents, neighborhoodWeather, cityDynamicsCapacity

### Gap (v3.9 status):

**FIXED in v3.8:** Transit metrics (BART ridership, on-time, traffic, alerts) now serialized. **FIXED in v3.9:** Neighborhood dynamics (12 neighborhoods × 6 metrics) now serialized. Remaining gap: sports neighborhood effects, per-neighborhood weather variations, capacity/congestion detail — minor.

## Phase 3 — Population (phase03-population/)

### Files examined:
- updateCrimeMetrics.js — per-neighborhood crime (property, violent, response time, clearance), hotspots, enforcement, story seeds
- generateCrisisSpikes.js — world events from crisis spikes, pushes to S.worldEvents
- generateCrisisBuckets.js — categorized crisis events with cooldowns, pushes to S.worldEvents and S.eventArcs
- updateNeighborhoodDemographics.js — per-neighborhood demographic profiles, demographic shifts
- deriveDemographicDrift.js — drift factors, summary
- applyDemographicDrift.js — applies drift to demographics
- updateCityTier.js — city tier classification
- finalizeWorldPopulation.js — population finalization

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.crimeMetrics | object | { cityWide: {property, violent, responseTime, clearanceRate}, shifts, factors: {weather, sentiment, season}, categoryCityWide, hotspots: [{neighborhood, severity}], reporting: {baseRate, signal, mediaCoverage, storySeedCount}, enforcement: {policingCapacity, cityLoad, patrolStrategy} } |
| S.crimeLag | object | Multi-cycle crime momentum tracking |
| S.worldEvents | array | Crisis events pushed here (accumulated across phases) |
| S.eventArcs | array | Event arcs from crisis buckets |
| S.eventsGenerated | number | Running count of events generated |
| S.crisisCooldown | object | Cooldown tracker per category/neighborhood |
| S.crisisLastSeen | object | Last seen cycle per crisis subtype |
| S.neighborhoodDemographics | object | Per-neighborhood demographic profiles |
| S.demographicShifts | array | Active demographic shifts this cycle |
| S.demographicShiftsCount | number | Count of shifts |
| S.demographicDrift | object | Drift metrics |
| S.demographicDriftFactors | object | What's driving drift |
| S.demographicDriftSummary | object | Summary of drift state |

### What buildCyclePacket_ serializes from Phase 3:

- WORLD EVENTS section: events from S.worldEvents (description, severity, domain, neighborhood) — up to 8
- Population section has illness rate and employment from Phase 1's worldPopulation
- Crime metrics, hotspots, enforcement, demographic shifts — NOT serialized

### What buildDeskPackets.js reads on the Node side:

- WorldEvents_V3_Ledger sheet directly (events filtered by cycle)
- No access to: crimeMetrics, crime hotspots, enforcement data, demographic shifts, crisis cooldowns, patrol strategies

### Gap (v3.9 status):

**FIXED in v3.8:** Crime snapshot (city-wide metrics, hotspots, patrol strategy) now serialized. **FIXED in v3.9:** Demographic shifts now serialized. Remaining gap: per-neighborhood crime breakdown, crime lag momentum — minor.

## Phase 4 — Events (phase04-events/)

### Files examined:
- worldEventsEngine.js — world events generation, pushes to S.worldEvents
- buildCityEvents.js — city-level events (festivals, openings, rallies, etc.) with neighborhood locations
- generateCitizenEvents.js — citizen-level lifecycle events (career, household, civic)
- generationalEventsEngine.js — births, deaths, weddings, promotions, graduations, hospitalizations
- eventArcEngine.js — arc tension management (reads S.cycleWeight, S.civicLoad)
- faithEventsEngine.js — faith community events, crisis responses
- generateGameModeMicroEvents.js — GAME clock mode micro-events
- generateGenericCitizenMicroEvent.js — generic citizen micro-events

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.worldEvents | array | Accumulated world events (description, severity, domain, neighborhood) — appended by multiple files |
| S.worldEventsCalendarContext | object | Calendar state when events were generated |
| S.eventsGenerated | number | Running count across all event generators |
| S.cityEvents | array of strings | City event names (festivals, openings, etc.) |
| S.cityEventDetails | array of objects | { name, neighborhood, tags, weight } per city event |
| S.cityEventsCalendarContext | object | Calendar state for city events |
| S.generationalEvents | array | Births, deaths, weddings, promotions, etc. with citizen names and neighborhoods |
| S.generationalSummary | object | { total, byType, deaths: [names], weddings: [names], promotions: [names], graduations: [names], births: [names], recoveries: [names], hospitalizations: [names], pendingCascades } |
| S.pendingCascades | array | Cascading effects from generational events |
| S.faithEvents | object | { generated: count, cycle, byType, hasCrisis } |
| S.cycleActiveCitizens | array | POPIDs of citizens with events this cycle |
| S.gameModeMicroEvents | number | Count of GAME mode events |
| S.gameModeMicroEventDetails | array | Details of GAME mode events |
| S.microEvents | number | Count of generic micro-events |
| S.eventArcs | array | Event arcs (appended by generational engine) |
| S.relationshipBonds | array | Bonds created by generational events |

### What buildCyclePacket_ serializes from Phase 4:

- WORLD EVENTS section: up to 8 events with description, severity, domain, neighborhood
- EVENT ARCS section: active arcs with type, phase, tension, neighborhood, summary, age
- GENERATIONAL EVENTS section: tag, citizen name, neighborhood, description
- RELATIONSHIP BONDS section: summary counts + hottest bonds

### What buildDeskPackets.js reads on the Node side:

- WorldEvents_V3_Ledger sheet → events filtered by cycle
- Event_Arc_Ledger sheet → active arcs
- LifeHistory_Log → citizen events, arc-citizen links
- Relationship_Bonds sheet → active bonds with intensity >= 3
- Household_Ledger → household events

### Gap:

### Gap (v3.9 status):

**FIXED in v3.9:** City events (festivals, openings, rallies with neighborhoods) now serialized. Generational events, world events, and arcs were already preserved. Remaining gap: faith event detail, game mode micro-events — minor.

## Phase 5 — Citizens (phase05-citizens/)

### Files examined:
31 files. Key engines: generateCitizensEvents, generationalWealthEngine, civicInitiativeEngine, bondEngine, runCareerEngine, runEducationEngine, householdFormationEngine, gentrificationEngine, migrationTrackingEngine, generateCivicModeEvents, generateMediaModeEvents, runCivicElectionsv1, applyNamedCitizenSpotlight

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.cycleActiveCitizens | array | POPIDs of all citizens who had events this cycle |
| S.citizenEventMemory | object | Memory of recent citizen events for cooldown/variety |
| S.namedSpotlights | array | [{ popId, name, score, neighborhood, reasons }] — citizens flagged for editorial attention |
| S.spotlightStats | object | Stats about spotlight selection |
| S.promotions | array | Citizens promoted this cycle |
| S.promotionsCount | number | Count |
| S.careerEvents | number | Count of career events |
| S.careerSignals | object | Career system health signals |
| S.educationEvents | number | Count of education events |
| S.householdEvents | array | Household formation/dissolution events |
| S.householdFormation | object | Results of household formation engine |
| S.civicRoleEvents | array | Citizens entering/leaving civic roles |
| S.civicModeEvents | number | Count of CIVIC clock mode events |
| S.civicModeEventDetails | array | Details of civic mode events |
| S.mediaModeEvents | number | Count of MEDIA clock mode events |
| S.mediaModeEventDetails | array | Details of media mode events (newsroom staff life events) |
| S.neighborhoodDriftEvents | array | Neighborhood change events |
| S.neighborhoodAssignments | number | Count of neighborhood assignments |
| S.youthEvents | object | Youth-specific events |
| S.initiativeEvents | array | Civic initiative actions this cycle |
| S.votesThisCycle | array | Council votes |
| S.grantsThisCycle | array | Grant disbursements |
| S.civicDemographicContext | object | Demographic context for civic decisions |
| S.initiativeRipples | array | Economic ripple effects from initiatives |
| S.positiveInitiatives | array | Initiatives with positive outcomes |
| S.failedInitiatives | array | Failed initiatives |
| S.activeRipples | array | Currently active economic ripples |
| S.activeRippleCount | number | Count |
| S.storyHooks | array | Story hooks from gentrification, migration, education, career, household, initiative engines |
| S.relationshipBonds | array | Active relationship bonds |
| S.bondSummary | object | { activeBonds, rivalries, alliances, tensions, mentorships, neighbors, pendingConfrontations, hottestBonds } |
| S.pendingConfrontations | array | Confrontations triggered by bond tension |
| S.allianceBenefits | array | Benefits from alliance bonds |
| S.electionResults | object | { cycle, group, seats: [{title, incumbent, winner, margin, votes}], upsets, turnover } |
| S.newGenericCitizens | array | New generic citizens generated |
| S.genericCitizensGenerated | number | Count |
| S.genericCitizensDistribution | object | Distribution by neighborhood |
| S.chicagoCitizens | array | Chicago bureau citizens |
| S.chicagoPopulation | number | Count |
| S.postCareerEvents | array | Post-career (retirement) events |
| S.intakeProcessed | number | Intake rows processed |

### What buildCyclePacket_ serializes from Phase 5:

- NAMED SPOTLIGHTS section: popId, score
- RELATIONSHIP BONDS section: activeBonds, rivalries, alliances, tensions, mentorships, pendingConfrontations, hottestBonds
- GENERATIONAL EVENTS section: covers some citizen events
- Election results — NOT explicitly in Cycle_Packet
- Initiative events, votes, grants — NOT in Cycle_Packet
- Story hooks — NOT in Cycle_Packet
- Career/education/household events — NOT in Cycle_Packet (but written to LifeHistory_Log sheet)

### What buildDeskPackets.js reads on the Node side:

- Simulation_Ledger → full citizen roster
- LifeHistory_Log → citizen events filtered by cycle
- Household_Ledger → households
- Relationship_Bonds → bonds
- Civic_Office_Ledger → civic officers
- Initiative_Tracker → initiatives
- Story_Seed_Deck, Story_Hook_Deck → seeds and hooks from their sheets

### Gap:

### Gap (v3.9 status):

**FIXED in v3.9:** Story hooks now serialized (up to 10, the engine's "this is newsworthy" signals). Spotlight detail now includes citizen names, neighborhoods, and reasons (not just POPIDs). Most Phase 5 data reaches newsroom via sheets (SL, LifeHistory_Log, Relationship_Bonds, Initiative_Tracker, Household_Ledger). Remaining gap: Election_Log not read by buildDeskPackets (elections available via Civic_Office_Ledger instead).

## Phase 6 — Analysis (phase06-analysis/)

### Files examined:
14 files. Key engines: economicRippleEngine, applyCivicLoadIndicator, applyShockMonitor, applyPatternDetection, applyMigrationDrift, arcLifecycleEngine, computeRecurringCitizens, filterNoiseEvents, prioritizeEvents, storylineHealthEngine, prePublicationValidation

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.civicLoad | string | "stable" / "minor-variance" / "load-strain" — overall civic system stress |
| S.civicLoadScore | number | Numeric civic load score |
| S.civicLoadFactors | object | What's driving civic load |
| S.civicLoadCalendarFactors | object | Calendar effects on civic load |
| S.economicRipples | array | Active economic ripple effects |
| S.economicMood | number (0-100) | City economic mood score |
| S.economicMoodDesc | string | "booming" / "optimistic" / "stable" / "uncertain" / "struggling" |
| S.neighborhoodEconomies | object | Per-neighborhood economic state |
| S.economicNarrative | string | Human-readable economic narrative |
| S.economicSummary | object | { mood, moodDesc, activeRipples, positiveRipples, negativeRipples, strongestRipple, thrivingNeighborhoods, strugglingNeighborhoods, narrative } |
| S.derivedEmploymentRate | number | Employment derived from ripple effects |
| S.careerChurn | boolean | Whether career churn is active |
| S.shockFlag | string | "none" / "shock-flag" — something abnormal happened |
| S.shockReasons | array | Why shock was triggered |
| S.shockScore | number | Count of shock reasons |
| S.shockStartCycle | number | When shock began |
| S.shockDuration | number | How long shock has lasted |
| S.shockCalendarContext | object | Calendar state during shock |
| S.patternFlag | string | "none" / pattern type — detected anomaly |
| S.patternCalendarContext | object | Calendar context for pattern |
| S.migrationDrift | number | Net migration drift |
| S.migrationDriftFactors | object | What's driving migration |
| S.neighborhoodMigration | object | Per-neighborhood migration data |
| S.migrationEconomicLink | object | How migration connects to economy |
| S.migrationBrief | object | Migration summary brief |
| S.neighborhoodEconomyFeedback | object | Economic feedback per neighborhood |
| S.recurringCitizens | array | Citizens who appear frequently in events |
| S.engineEvents | array | Filtered/prioritized event list |
| S.eventPrioritization | object | How events were prioritized |
| S.noiseFilterStats | object | What was filtered as noise |
| S.arcLifecycleResults | object | Arc phase transitions, resolutions |
| S.arcResolutions | array | Arcs that resolved this cycle |
| S.arcPhaseChanges | array | Arcs that changed phase |
| S.storylineHealth | object | Health of active storylines |
| S.hookLifecycle | object | Story hook lifecycle management |
| S.storylineUpdates | array | Storyline status changes |
| S.storyHooks | array | Additional story hooks from storyline health |
| S.validationReport | object | Pre-publication validation results |
| S.transitStorySignals | array | Transit-related story signals (written by orchestrator) |
| S.faithStorySignals | array | Faith-related story signals (written by orchestrator) |

### What buildCyclePacket_ serializes from Phase 6:

- CYCLE SIGNALS section: cycleWeight, cycleWeightReason, migrationDrift, patternFlag, shockFlag — 5 fields
- ECONOMIC STATUS section: mood, moodDesc, activeRipples, positiveRipples, negativeRipples, strongestRipple, thrivingNeighborhoods, strugglingNeighborhoods, narrative — WELL SERIALIZED
- EVENT ARCS section captures arc changes
- TEXTURE TRIGGERS section captures important textures

### What buildDeskPackets.js reads on the Node side:

- Cycle_Packet text → cycle signals (5 fields), economic status
- Event_Arc_Ledger sheet → arcs
- Storyline_Tracker sheet → storylines
- No access to: civicLoad/civicLoadFactors, shockReasons/shockDuration, neighborhoodEconomies, migrationBrief, neighborhoodMigration, recurringCitizens, transitStorySignals, faithStorySignals, storylineHealth, patternCalendarContext

### Gap:

### Gap (v3.9 status):

**FIXED in v3.8:** Civic load (level, factors, story hooks) now serialized. **FIXED in v3.9:** Shock context (reasons, duration, score), migration brief (net drift, per-neighborhood), neighborhood economies (mood, employment, growth per hood) now serialized. Economic summary was already well-serialized. Remaining gap: recurring citizen patterns, transit/faith story signals — moderate.

## Phase 8 — V3 Chicago (phase08-v3-chicago/)

### Files examined:
11 files. Key: v3preLoader (initializes/guards all S fields), v3Integration, chicagoSatellite, applyCycleRecovery, applyDomainCooldowns

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.chicagoFeed | array | [{ weather, sentiment, events, travelNotes, ... }] — Chicago satellite report |
| S.domainCooldowns | object | Domain cooldown tracking (prevents repetition) |
| S.suppressDomains | object | Domains currently suppressed |
| S.activeCooldowns | string | Active cooldown list |
| S.cooldownCalendarContext | object | Calendar state for cooldowns |
| S.recoveryMode | boolean | Whether system is in recovery |
| S.recoveryLevel | string | "none" / "light" / "moderate" / "heavy" |
| S.overloadScore | number | System overload metric |
| S.recoveryState | object | { level, overloadScore, startCycle, window, duration } |
| S.eventSuppression | number (0-1) | How much to suppress events during recovery |
| S.hookSuppression | number (0-1) | How much to suppress hooks |
| S.textureSuppression | number (0-1) | How much to suppress textures |
| S.v3IntegrationComplete | boolean | V3 integration status |
| S.v3ModulesRan | array | Which V3 modules executed |

### What buildCyclePacket_ serializes from Phase 8:

- CHICAGO SATELLITE section: weather, sentiment, events, travel notes
- Recovery mode, domain cooldowns — NOT serialized

### What buildDeskPackets.js reads on the Node side:

- Chicago_Citizens sheet directly
- Cycle_Packet text → Chicago satellite section

### Gap:

Chicago satellite data makes it through. Domain cooldowns and recovery mode (which control the engine's self-regulation) never reach the newsroom — though these are internal engine state, not news. The gap here is minor.

---

## Phase 9 — Digest (phase09-digest/)

### Files examined:
- applyCycleWeight.js — cycle significance classification
- applyCompressionDigestSummary.js — cycle narrative summary
- finalizeCycleState.js — snapshot for next cycle

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.cycleWeight | string | "none" / "low-signal" / "medium-signal" / "high-signal" — how significant this cycle was |
| S.cycleWeightReason | string | Why this cycle matters (detailed text) |
| S.cycleWeightScore | number | Numeric significance score |
| S.cycleWeightCalendarFactors | object | Calendar influence on cycle weight |
| S.compressedLine | string | One-line cycle summary |
| S.cycleSummary | object | Full cycle summary object |
| S.cycleFinalState | object | Snapshot: events, population, economy, weather, etc. |
| S.previousCycleState | object | Preserved for next cycle comparison |

### What buildCyclePacket_ serializes from Phase 9:

- CYCLE SIGNALS section: cycleWeight, cycleWeightReason — serialized
- cycleSummary, compressedLine — NOT serialized

### What buildDeskPackets.js reads on the Node side:

- Cycle_Packet text → cycleWeight, cycleWeightReason
- No access to: cycleSummary, compressedLine, cycleWeightScore

### Gap:

### Gap (v3.9 status):

**FIXED in v3.9:** Cycle summary (one-line narrative + headline + key events) now serialized. Cycle weight and reason were already preserved. No remaining gap.

---

## Phase 10 — Persistence (phase10-persistence/)

### Files examined:
- buildCyclePacket.js (v3.7) — serializes ctx.summary → Cycle_Packet sheet

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.cyclePacket | string | The serialized packet text itself |

Phase 10 is primarily a writer. It reads ctx.summary and writes to sheets. buildCyclePacket_ is where the serialization gap lives — it decides what survives.

### What it serializes (v3.9):

Fully serialized: calendar, civic status, cycle signals, population, weather, city dynamics (8 decimals), world events (up to 8), event arcs, texture triggers, named spotlights + spotlight detail (names/neighborhoods/reasons), relationship bonds summary, generational events, economic status, media climate, weather mood, Chicago satellite, evening city (nightlife spots, restaurants, crowds, safety), crime snapshot (city-wide + hotspots + patrol), transit (BART ridership, on-time, traffic, alerts), civic load (level, factors, story hooks), neighborhood dynamics (12 neighborhoods × 6 metrics), story hooks (up to 10 engine-flagged signals), shock context (reasons, duration, score), migration (net drift, per-neighborhood), neighborhood economies (mood, employment, growth per hood), cycle summary (one-line narrative + headline), demographic shifts, city events (festivals, openings, rallies).

NOT serialized: career/education/household event details (available via LifeHistory_Log sheet), faith events detail, recovery state, per-neighborhood weather variations, sports neighborhood effects, weather events.

**v3.9 coverage: ~90% of engine output reaches the newsroom (was ~30% before v3.8).**

---

## Phase 11 — Media Intake (phase11-media-intake/)

### Files examined:
- healthCauseIntake.js — processes health cause data from media room

### Writes to ctx.summary:

| Field | Type | Description |
|-------|------|-------------|
| S.healthCauseBriefing | string | Health cause briefing markdown (from media room intake) |

### What buildCyclePacket_ serializes: Nothing from Phase 11.
### What buildDeskPackets.js reads: Nothing from Phase 11.

### Gap:

Health cause data flows from media room → engine → Simulation_Ledger (written directly), but the health briefing narrative doesn't reach the newsroom desk packets.

**Note:** `ctx.summary.healthCauseBriefing` appears only in JSDoc (line 607), not in actual code. The write was never implemented.

---

## Cross-Phase ctx.summary Health (Audit 2026-03-26, Rev 2)

### Connected Pipelines (verified working)

Engine files alias `ctx.summary` as `S`. Initial audit searched for `ctx.summary.field =` and missed `S.field =` writes.

**Career → Economic Ripple → Migration Drift** — CONNECTED
- `runCareerEngine_()` writes `S.careerSignals` (line 106+) with layoffs, promotions, sectorShifts, businessDeltas
- `runEconomicRippleEngine_()` reads `S.careerSignals` (line 193+), writes `S.economicMood` (line 638)
- `applyMigrationDrift_()` reads `S.economicMood` (line 189)

**Pattern Detection → Downstream** — CONNECTED
- `applyPatternDetection_()` writes `S.patternFlag` — read by 9+ downstream files
- `S.patternCalendarContext` written alongside but has no readers (orphaned)

### Dead-End Writes

Fields written to ctx.summary but never consumed by any downstream phase, buildCyclePacket, or buildDeskPackets:

| Field | Writer | Phase | Notes |
|-------|--------|-------|-------|
| `patternFlag` | applyPatternDetection.js | 6 | Always "none" — no consumer |
| `patternCalendarContext` | applyPatternDetection.js | 6 | Always {} — no consumer |
| `storylineUpdates` | updateStorylineStatusv1.2.js | 8 | Array of updates — no consumer |
| `arcResolutions` | processArcLifeCyclev1.js | 8* | *Superseded file, not in engine |
| `arcPhaseChanges` | processArcLifeCyclev1.js | 8* | *Superseded file, not in engine |
| `advancementResults` | processAdvancementIntake.js | 5f | Results array — no consumer |
| `chicagoPopulation` | generateChicagoCitizensv1.js | 8 | Count only; chicagoCitizens array IS consumed |

These are not bugs — the engine runs fine without consumers. But they represent computation that produces nothing and documentation that implies connections that don't exist.

**S156 UPDATE:** Every `ctx.summary` field is consumed via `utilities/exportCycleArtifacts.js:112` — `JSON.parse(JSON.stringify(S))` serializes the whole summary to the Drive cycle-artifact archive (`cycle-<N>-summary.json`) every cycle. Fields listed above as "dead-end" are still live via bulk serialization. They aren't consumed by a named phase, but they DO land in the artifact. See `docs/engine/tech_debt_audits/2026-04-15.md` changelog 2026-04-17 for the methodology correction.

---

## Phase 40 — Agent Architecture Hardening (cross-cutting)

**Status at S156:** 5 of 6 sub-items DONE. Only 40.2 (reporter-as-cattle refactor) remains. Full plan: `docs/engine/PHASE_40_PLAN.md`.

**Cross-cutting nature:** Phase 40 doesn't sit in a single `phase*/` directory. It's architecture hardening that touches: hooks (`/root/GodWorld/.claude/hooks/`), settings (`.claude/settings.json`), credentials layout (`/root/.config/godworld/` relocation), bot refusal logic (`scripts/mags-discord-bot.js`), and the determinism helper (`utilities/safeRand.js`).

### Writes to ctx.summary:
None. Phase 40 doesn't produce cycle data. It's infrastructure.

### New engine dependencies (S156):
- **`utilities/safeRand.js` — `safeRand_(ctx)` helper.** Replaces ~57 inline `(typeof ctx.rng === 'function') ? ctx.rng : Math.random` patterns across phases 1-8 and 10. Returns `ctx.rng` if present, else seeded `mulberry32_` from `ctx.config.rngSeed`, else throws. No silent Math.random fallback. Audit trail: `docs/engine/tech_debt_audits/2026-04-15.md`.
- **Credential paths relocated** (Phase 40.3). `lib/sheets.js` default is now `/root/.config/godworld/credentials/service-account.json`. `GODWORLD_ENV_FILE` env var points to `/root/.config/godworld/.env`. No engine code path change — just the filesystem location.

### What reaches the newsroom:
Nothing. Phase 40 is invisible to the pipeline. The hardening only matters if injection or credential compromise is attempted — at which point the deny rules, refusal patterns, and throw-on-missing-rng stop it loudly instead of silently.
