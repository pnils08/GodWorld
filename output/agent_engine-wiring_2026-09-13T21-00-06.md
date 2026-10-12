Excellent. Now let me compile the wiring card. Let me gather the exact info for each component:

1. **bizOwnerBands_ definition**: phase05-citizens/applyBusinessDynamics.js:297
2. **parseKeyPersonnelOwners_ (Key_Personnel parser)**: phase05-citizens/generationalWealthEngine.js:883
3. **DialState reader**: phase05-citizens/applyBusinessDynamics.js:302 (reads ctx.ledger.headers indexOf 'DialState')
4. **getCitizenDialBands_ (reads DialState)**: utilities/compressLifeHistory.js:1148
5. **applyBusinessDynamics_ call**: phase01-config/godWorldEngine2.js:357
6. **Growth consumer (drift)**: phase05-citizens/applyBusinessDynamics.js:370-371 (line 370 applies ownerB.drive, line 371 rounds growth)
7. **Closure consumer**: phase05-citizens/applyBusinessDynamics.js:456 (closure condition with ownerRoom), 463 (noteVentureClosedOwners_ call)

```
WIRING CARD — bizOwnerBands_ (function)   map: 2026-09-13 / 183 files   [MAP CURRENT]

DEFINITION
  phase05-citizens/applyBusinessDynamics.js:297  function bizOwnerBands_(ctx, keyPersonnelCell)  v1.0 (no Logger.log header)

PHASE POSITION
  production entry : Phase5-BusinessDynamics @ godWorldEngine2.js:357  — BEFORE Phase10-ExecuteIntents (588)
  cycle-phases     : Phase5-BusinessDynamics @ godWorldEngine2.js:2102  — BEFORE Phase10-ExecuteIntents (2319)

CALLERS (1)
  phase05-citizens/applyBusinessDynamics.js:433  var ownerB = bizOwnerBands_(ctx, iKP >= 0 ? row[iKP] : '');

S FIELDS READ (via ctx.ledger, ctx.summary implicit)
  READ  ctx.ledger.headers (indexOf 'POPID', 'DialState', 'First', 'Last')  @ :302
  READ  ctx.ledger.rows[r][iP|iD|iF|iL]  @ :303-315

KEY_PERSONNEL PARSER DEPENDENCY
  parseKeyPersonnelOwners_  @ phase05-citizens/generationalWealthEngine.js:883
    → parses Key_Personnel cell (semicolon-separated entries with (tag) suffixes)
    → returns array of {pop, name, tag, owner} objects
    → called @ phase05-citizens/applyBusinessDynamics.js:318

DIALSTATE READER DEPENDENCY
  ctx.ledger reads DialState column  @ phase05-citizens/applyBusinessDynamics.js:302
    iD = h.indexOf('DialState')
    stored @ ctx._bizDialByPop[pp] = String(ctx.ledger.rows[r][iD])
  getCitizenDialBands_(ctx, pop, ds)  @ utilities/compressLifeHistory.js:1148
    → reads DialState string; parses via parseDialState_(), deserializes, computes bands
    → returns {bands, mult, current, crimeReachable, careerFreq, familyFreq}
    → called @ phase05-citizens/applyBusinessDynamics.js:327

GROWTH CONSUMER (ownerB.drive multiplier)
  phase05-citizens/applyBusinessDynamics.js:441  ownerDriveBand: ownerB ? ownerB.drive : 0,
  phase05-citizens/applyBusinessDynamics.js:370  if (drift > 0 && inputs.ownerDriveBand >= 2 && inputs.ownerExpandMult > 1) drift = bizClamp_(drift * inputs.ownerExpandMult, 0, cfg.bizDriftMaxUp);
  phase05-citizens/applyBusinessDynamics.js:371  var growth = Math.round(bizClamp_(biz.growth + drift, cfg.bizGrowthFloor, cfg.bizGrowthCeil) * 100) / 100;

CLOSURE CONSUMER (ownerB.composure room penalty)
  phase05-citizens/applyBusinessDynamics.js:445  var ownerRoom = ownerB ? (ownerB.composure >= 1 ? 1 : ownerB.composure <= -1 ? -1 : 0) * pressureBar_(ctx, 'dialOwnerStreakRoom') : 0;
  phase05-citizens/applyBusinessDynamics.js:456  var closesNow = d.streak >= (cfg.bizClosureStreak + ownerRoom) && d.revenue !== null && d.revenue < floorRev;
  phase05-citizens/applyBusinessDynamics.js:463  out.ownersRetrenched = (out.ownersRetrenched || 0) + noteVentureClosedOwners_(ctx, iKP >= 0 ? row[iKP] : '', bName, cycle);

WRITE PATH (applyBusinessDynamics_ output)
  INTENT  queueRangeIntent_(ctx, 'Business_Ledger', 2, iRev + 1, …, 'Annual_Revenue')  @ :496  → Business_Ledger
  INTENT  queueRangeIntent_(ctx, 'Business_Ledger', 2, iGrow + 1, …, 'Growth_Rate')  @ :497  → Business_Ledger
  INTENT  queueEnsureTabIntent_(ctx, 'Business_Archive', …, 'economy', 25)  @ :472  → Business_Archive

OPEN WORK
  engine.201 Wave 2 @ d1b8057f: two-way dial causes (rulings 1b, 2, 3)
  engine.178 closure logic @ 23271178: dials close doors; owner composure/drive on closure/expansion
  docs/engine/ROLLOUT_PLAN.md — search "bizOwnerBands_" or "engine.201" for active tasks

HISTORY (top 6)
  830e05ac owner resolution, gone owners, cross-cause seeding, unemployment evidence
  d1b8057f engine.201 Wave 2 — two-way dial causes (rulings 1b, 2, 3) + Wave 1 regression tests
  23271178 engine.178 cut locally — dials close doors: owner composure/drive on closure/expansion
  c98cdc00 S413 engine.96 Task 11b — heritage business field weighted draw
  13461a44 S413 engine.96 Task 11 — heritage business born alive in family's field
  ba106003 engine.96 closure line: week/weeks

FILES OPENED
  phase05-citizens/applyBusinessDynamics.js (definition, callers, growth/closure consumers, write path)
  phase05-citizens/generationalWealthEngine.js:883 (parseKeyPersonnelOwners_ parser)
  utilities/compressLifeHistory.js:1148 (getCitizenDialBands_ DialState reader)
  phase01-config/godWorldEngine2.js:357, 2102, 588, 2319 (phase position, before/after Phase10)
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **39** (30%)
- never opened: **93**

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

</details>

_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=24 toolCalls=27 in=403335 out=4668_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._