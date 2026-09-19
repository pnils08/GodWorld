# Wiring cards — engine.242 wave (2026-09-19, engine-wiring subagent, read-only)

Cards were run AFTER the first cut of 242a/b/c (the builder caught the order); edits were held uncommitted until each card was read, card findings were fixed, then committed separately (171c4655, 2a3bbc44, ff949ab0). Condensed; file:line from the cards.

## applyBusinessDynamics_ (→ 242b)
- Phase5-BusinessDynamics godWorldEngine2.js:360 / :2109 — after Phase1-CanonHoods (:277 / :2026), before Phase10-NeighborhoodMap (:560 / :2313), before Phase10-ExecuteIntents (:595 / :2330). Both entry points.
- NEW S.hoodBusinessMomentum — only reader hoodBusinessFactor_ (v3NeighborhoodWriter). Not carried across cycles (finalizeCycleState carries businessDynamicsState only, :172).
- FINDING (fixed): empty-ledger early return (:387) left S.hoodBusinessMomentum unset → now `{}`.
- Growth_Rate = annual percent (revenue × (1 + growth/100/52)); Annual_Revenue can be null (bizParseRevenue_) → tallyBiz skips null/≤0.
- No double count: S.hoodEmployerDepth = employer presence; neighborhoodEconomies = mood/descriptor.
- Not asked, flagged by advisor: bizDriftOne_ reads last cycle's RetailVitality (vitMod) → retail↔business feedback. Bounded; named in code; bench spread check pending.

## S.crimeMetrics.context.byHood[].qualityOfLifeIndex (→ 242c)
- Written Phase3-Crime (:313 / :2062); S.neighborhoodState loaded Phase2-NeighborhoodState (:300 / :2049) before it; demographics carry `sick` (ensureNeighborhoodDemographics.js:169).
- Readers: generateCitizensEvents getNeighborhoodContext_ :402-409 → qolPoolFor_ :1098 (crime texture — FIXED: lines now speak the weakest/strongest measurable via qolParts), toneFromProfile_ :645/655, participation :2202, tags :3157; runYouthEngine :375/449/516 (stress/thriving weights); applyStorySeeds :1116 crisis seed (crime text on crime trend — FIXED: reads safetyIndex) + bright spot (composite); updateNeighborhoodDemographics :389 (FIXED: safetyIndex, avoids a jobless loop). City-level QoL readers (civic/media/story seeds :232) read context.city — unchanged.
- Persistence: none. Crime_Metrics row carries trend / pressureRatio / hotspotScore / qolLevel only; Cycle_Packet reads context.city only. qolParts/safetyIndex in memory.

## S.weatherEvents + applyWeatherModifiers_/applySeasonModifiers_ (→ 242a)
- Single writer applyWeatherModel_ at Phase2-Weather (:294 / :2043), before Phase2-CityDynamics (:301 / :2050); salient storm / flood_conditions / heat_wave at applyWeatherModel.js :1127 / :1174 / :1227.
- Other readers of S.weatherEvents (unchanged): applyDemographicDrift :159, generateCrisisBuckets :135, updateNeighborhoodDemographics :359, chaosCarsEngine :639, generationalEventsEngine :273, economicRippleEngine :564, storyHook :741.
- ~60 absolute sentiment gates (±0.3 most common, ±0.4, −0.5) across phases 1–9 were tuned against the old range; resting level moves up in winter / down in summer. sentimentRestingLevel test 3 ("gates can still fire both directions") passes; bench to confirm.
- chicagoSatellite.js:221 applies its own weather to Chicago mood — separate, untouched.

## createRipple_ (→ engine.240, NOT yet cut)
- 31 call sites (economicRippleEngine.js). Hardcoded hood literals: WORKFORCE_GROWTH 'Downtown' :300/:336, WORKFORCE_DECLINE 'Downtown' :309, MAJOR_LAYOFFS 'Downtown' :328, FESTIVAL_TOURISM 'Downtown' :420, ARTS_DISTRICT_BOOST 'Temescal' :457, SUMMER_TOURISM 'Jack London' :478. Random template draw ('' → trigger.neighborhoods via S._rng :637): NEW_BUSINESS :556 (Rockridge/Temescal/Laurel). World-event path :523–551 passes the event's hood ('' → template draw). Business path :364/:369 resolves via S._bizLookup + mapToCanonicalNeighborhood_ (canon). Weather :576 uses the event's hoods. Sports :443–451 primarySportsZone_(cal).
- Spread: ripple.neighborhoods = trigger template list (:664) → calculateNeighborhoodEconomies_ :922–930 moves every listed hood's economic mood (×1.5 on primary) regardless of where the event happened. Ripple_Ledger row :250–252 prints primary / targets.
- One rng draw per hoodless call (:637); downstream sequence impact UNCHECKED.

## engine.240 pin cards (run BEFORE each pin cut)
- **mediaFeedbackEngine** (→ 240b `d358212e`): MEDIA_NEIGHBORHOODS 8 hoods (:66), NEIGHBORHOOD_MEDIA_PROFILES (:72), HOLIDAY_MEDIA_NEIGHBORHOODS (:84); applyNeighborhoodMediaEffects_ Phase8-V3Integration (:525 / :2274); S.mediaEffects.neighborhoodEffects read by updateTransitMetrics, buildDeskPackets, finalizeCycleState, recordMediaLedger; no rng on list length; hoodsWithScene_ at canonNeighborhoodLoader.js:237.
- **recordWorldEventsv3 domainNeighborhoods** (→ 240c `b9c85cc4`): only hoodless producer worldEventsEngine.js:401 (texture); col G read by updateTransitMetrics :632/:651 (per-station ridership), compileHandoff :1103, buildDeskPackets :2178, generateBaselineBriefs :122, queryLedger :468; getCoreSimNeighborhoods_ is canon (CoreSimRank); intents via queueBatchAppendIntent_ :289.
- **applyStorySeeds signal seeds** (→ 240d `6c30a898`): micro-wave→Laurel :1149, strain→Downtown :1156, shock→Downtown :1181, inflow→Fruitvale :1242, outflow→West Oakland :1254, mood→Lake Merritt :1317, economy→Rockridge :1345, nightlife→Jack London :1370, public space→Lake Merritt :1384, retail→Rockridge :1391 (+ cultural→Uptown, engagement→Temescal); seed hood → buildSeedSignals_/applySeedLocalBoost_ (applyCityDynamics :876/:961) + Story_Seed_Deck via compileHandoff :166; per-hood maps available: neighborhoodDynamics, neighborhoodMigration (applyMigrationDrift :563), neighborhoodEconomies, neighborhoodPulse.
- **buildCityEvents condition pools** (→ 240e `1b8c21d5`): CHAOS :203 (chaos ≥3), HIGH/LOW_SENTIMENT :209/:215 (±0.3), NIGHTLIFE :221 (≥1.2), ECON_BOOM/BUST :229/:235 (65/35), addEvents_ :112, weighted draw :699–722; S.cityEventDetails read by cityEveningSystems :60, applyStorySeeds :1659, finalizeCycleState :349, buildCyclePacket :732.
- **cityEveningSystems crowd map** (→ 240f `43446d32`): S.crowdMap :437 / S.crowdHotspots :445 → generateCitizensEvents :1229–1242, buildMediaPacket :323–344, finalizeCycleState :324/:362, buildCyclePacket :435–476; canon available: neighborhoodState.employerCharacter, neighborhoodEconomies, sportsZones, Scenes, WeatherZone.
- **buildNightLife venue pools** (→ 240g `17233d75`): BUDGET/UPSCALE gated on econ ≤35/≥65 (:350–351), CHAOS_SPOTS on chaos ≥3; venues literal (no Business/Cultural ledger); spot hoods → crowd +1, media packet.
