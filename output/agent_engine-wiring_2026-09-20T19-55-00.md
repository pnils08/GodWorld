WIRING CARD — S.previousCycleState (field)   map: 2026-09-20 / 184 files   FRESH

DEFINITION
  phase01-config/loadPreviousEvening.js:266  loadPreviousCycleState_(ctx)  v1.0
  phase06-analysis/applyShockMonitor.js:27   applyShockMonitor_(ctx)  v2.4
  phase09-digest/finalizeCycleState.js:33    finalizeCycleState_(ctx)  v1.1

PHASE POSITION
  production entry : Phase1-PrevCycleState @ godWorldEngine2.js:283  — BEFORE Phase10-ExecuteIntents (:595)
  cycle-phases     : Phase1-PrevCycleState @ godWorldEngine2.js:2032  — BEFORE Phase10-ExecuteIntents (:2330)
  
  production entry : Phase6-ShockMonitor @ godWorldEngine2.js:422  — BEFORE Phase10-ExecuteIntents (:595)
  cycle-phases     : Phase6-ShockMonitor @ godWorldEngine2.js:2170  — BEFORE Phase10-ExecuteIntents (:2330)
  
  production entry : Phase9-FinalizeCycleState @ godWorldEngine2.js:546  — BEFORE Phase10-ExecuteIntents (:595)
  cycle-phases     : Phase9-FinalizeCycleState @ godWorldEngine2.js:2288  — BEFORE Phase10-ExecuteIntents (:2330)

PERSISTENCE
  WRITE   S.previousCycleState  @ phase09-digest/finalizeCycleState.js:181
          Snapshot built and set to S.previousCycleState in Phase9-FinalizeCycleState
  
  PERSIST S.previousCycleState  @ phase09-digest/finalizeCycleState.js:432-469 savePreviousCycleState_
          Phase10-CycleState (direct write, not intent)
          Key: 'PREV_CYCLE_STATE_JSON' → PropertiesService + Carry_Forward_Store sheet tab
          Also persists companion blobs:
            'PREV_HOOD_ECON_JSON'    @ :455 (neighborhood economies, ~400 chars)
            'PREV_ACTIVITY_OBS_JSON' @ :463 (activity history, ~850 chars)
  
  LOAD    S.previousCycleState  @ phase01-config/loadPreviousEvening.js:276-278 loadPreviousCycleState_
          Phase1-PrevCycleState (loads from PropertiesService via loadCarryForwardBlob_)
          Key: 'PREV_CYCLE_STATE_JSON'
          Fallback: Carry_Forward_Store sheet tab (engine.119 layer 2 redundancy)
          Recovery: sheet read re-seeds the prop layer on successful recovery

CALLERS (24)
  phase02-world-state/updateTransitMetrics.js:223      var prevDisrupted = !!(S.previousCycleState && S.previousCycleState.transitDisrupted);
  phase02-world-state/applyWeatherModel.js:247         var prevFT = (S.previousCycleState && S.previousCycleState.weatherFrontTracking) || null;
  phase02-world-state/applyWeatherModel.js:621         var prevWT = (S.previousCycleState && S.previousCycleState.weatherTracking) || null;
  phase02-world-state/applyWeatherModel.js:625         var prevSeason = (S.previousCycleState && S.previousCycleState.season) || '';
  phase02-world-state/applyCityDynamics.js:118-119     var prevCrimeSpikes = (S.previousCycleState && Array.isArray(S.previousCycleState.crimeSpikes)) ? S.previousCycleState.crimeSpikes : [];
  phase02-world-state/applyCityDynamics.js:1439        var prevNhoodState = (S.previousCycleState || {}).neighborhoodDynamics || {};
  phase02-world-state/applyCityDynamics.js:1667        var prevState = S.previousCycleState || {};
  phase03-population/generateCrisisBuckets.js:219      var prev = S.previousCycleState || {};
  phase04-events/worldEventsEngine.js:75               var prev = S.previousCycleState || {};
  phase05-citizens/generationalWealthEngine.js:255     var prev = S.previousCycleState || {};
  phase05-citizens/applyBusinessDynamics.js:396        var prev = (S.previousCycleState && S.previousCycleState.businessDynamics) || {};
  phase05-citizens/bondEngine.js:732-733               var prevCycleWeight = (S.previousCycleState && S.previousCycleState.cycleWeight) || 'low-signal'; var prevShock = (S.previousCycleState && S.previousCycleState.shockFlag) || 'none';
  phase05-citizens/updateCivicApprovalRatings.js:221   var prevState = (S && S.previousCycleState) || {};
  phase05-citizens/updateCivicApprovalRatings.js:450   var prevState = S.previousCycleState || {};
  phase06-analysis/economicRippleEngine.js:228         var prevCycle = S.previousCycleState || {};
  phase06-analysis/applyCivicLoadIndicator.js:107      var prevChaosCount = Number((S.previousCycleState || {}).chaosCount);
  phase07-evening-media/domainTracker.js:252           var prevState = S.previousCycleState || {};
  phase08-v3-chicago/applyCycleRecovery.js:167         var prevShockFlag = (S.previousCycleState && S.previousCycleState.shockFlag) || 'none';
  phase08-v3-chicago/applyCycleRecovery.js:177         var prevCivicLoad = (S.previousCycleState && S.previousCycleState.civicLoad) || 'stable';
  phase08-v3-chicago/applyCycleRecovery.js:181         var civicScore = Number((S.previousCycleState && S.previousCycleState.civicLoadScore) || 0);
  phase09-digest/finalizeCycleState.js:280             restoreCarriedRipples_(S);  [internal: seeding economicRipples & initiativeRipples]
  phase09-digest/finalizeCycleState.js:281             seedCarriedEconomicMood_(S);  [internal: seeding economicMood]
  phase09-digest/finalizeCycleState.test.js:131        var snap = ctx.summary.previousCycleState;  [test]
  phase09-digest/finalizeCycleState.test.js:208        var snap = JSON.parse(JSON.stringify(ctx.summary.previousCycleState));  [test]

PAYLOAD SHAPE (JSON blob, max 8.2 KB per PropertiesService limits)
  cycle:                 number             current cycle id at snapshot time
  
  events:                number             S.eventsGenerated or worldEvents.length
  chaosCount:            number             worldEvents.length
  
  sentiment:             number             S.cityDynamics.sentiment
  econMood:              number             S.economicMood (seeded into Phase2+ as fallback)
  
  pattern:               string             S.patternFlag || "none"
  shockFlag:             string             S.shockFlag || "none"
  shockStartCycle:       number             S.shockStartCycle || 0
  
  civicLoad:             string             S.civicLoad || "stable"  [engine.61 phase-8 state]
  civicLoadScore:        number             S.civicLoadScore || 0
  
  weatherType:           string             S.weather.type || "clear"
  weatherImpact:         number             S.weather.impact || 1
  
  cycleWeight:           string             S.cycleWeight || "low-signal"
  cycleWeightScore:      number             S.cycleWeightScore || 0
  
  recoveryLevel:         string             S.recoveryLevel || "none"
  overloadScore:         number             S.overloadScore || 0
  activeCooldowns:       string             S.activeCooldowns || "none"
  
  holiday:               string             S.holiday || "none"
  holidayPriority:       string             S.holidayPriority || "none"
  isFirstFriday:         boolean            !!S.isFirstFriday
  isCreationDay:         boolean            !!S.isCreationDay
  sportsSeason:          string             S.sportsSeason || "off-season"
  season:                string             S.season || "Spring"
  
  mediaEffects:          object|null        compacted from S.mediaEffects  [engine.200+]
  
  neighborhoodDynamics:  object|null        compacted from S.neighborhoodDynamics  [engine.219]
  
  domainPresence:        object|null        S.domainPresence || null
  dominantDomain:        string|null        S.dominantDomain || null
  
  economicRipples:       array              compacted from S.economicRipples (engine.45 T2)  [max 8 entries]
  initiativeRipples:     array              compacted from S.initiativeRipples (engine.45 T2)  [max 8 entries]
  
  initiativePhases:      object|null        S.initiativePhases || null  [engine.139: prior phase per initiative]
  
  approvalHoodMoodEma:   object|null        S.approvalHoodMoodEma || null  [engine.213: smoothed approval mood]
  
  migrationDrift:        number             S.migrationDrift || 0  [engine.45 T5: economicRippleEngine reads this]
  migrationDriftFactors: array              S.migrationDriftFactors (capped 5 entries)
  
  bankRate:              number|null        S.bankRate (engine.61 T1: walk position survives boundary)
  
  crimeSpikes:           array              compacted from S.crimeMetrics  [engine.45 T3b]
  
  weatherTracking:       object|null        compacted from S.weatherTracking  [engine.44 Class 3: streak state]
  weatherFrontTracking:  object|null        compacted from S.weatherFrontTracking  [engine.70 W-1: Markov front chain]
  
  transitDisrupted:      boolean            !!S.transitState.disruptionOngoing  [engine.71 CR-2: one-cycle dedup]
  
  crisisArcs:            array              compacted crisis arcs (max 8, active only)  [engine.71 CR-2]
  crisisMemory:          array              S.crisisMemoryActive or S.crisisMemory  [engine.243: memory of ended crises]
  hospitalEvents:        array              compacted from S.hospitalEvents  [engine.71 CR-3]
  
  businessDynamics:      object             S.businessDynamicsState || {}  [engine.96 Task 5: distress streak + success window]

COMPANION CARRY-FORWARD BLOBS (separate PropertiesService keys, same cycle)
  PREV_HOOD_ECON_JSON @ phase01-config/loadPreviousEvening.js:327-348
    Shape: {hood: mood, …}  per neighborhood's economic mood
    Seeded in Phase1-PrevCycleState by seedCarriedNeighborhoodEconomies_
    Producer: finalizeCycleState_ → savePreviousCycleState_ → compactNeighborhoodEconomies_ @ :481-493
  
  PREV_ACTIVITY_OBS_JSON @ phase01-config/loadPreviousEvening.js:361-378
    Shape: {history: [{cycle, events, storySeedCount, media, crime, shockCount}, …]}  (≤12 entries)
    Seeded in Phase1-PrevCycleState by seedCarriedActivityObservations_
    Producer: finalizeCycleState_ → savePreviousCycleState_ → compactActivityObservations_ @ :503-520

OTHER CROSS-CYCLE CARRY MECHANISMS (PropertiesService + Carry_Forward_Store sheet)
  PREV_EVENING_JSON @ phase01-config/loadPreviousEvening.js:239  [loadPreviousEvening_]
    Contains: S.previousEvening (crowd hotspots, nightlife vibe, safety, sports, famous sightings)
    Persisted by saveEveningSnapshot_ (Phase10-EveningSnapshot)
  
  CHAOS_NBHD_FOLD_JSON @ phase04-events/chaosCarsEngine.js:463  [writeChaosNeighborhoodStore_]
    Contains: chaos-cars neighborhood override map (engine.228)
    Persisted via saveCarryForwardBlob_

STORAGE LAYERS (engine.119 Task 3 — triple redundancy)
  Layer 1: PropertiesService.getProperty('PREV_CYCLE_STATE_JSON')  [fast path, 9 KB per-property limit]
           Stamped with sibling prop '_CYCLE' for self-ghost detection on crash recovery
  
  Layer 2: Carry_Forward_Store sheet tab  [ring buffer: 3 rows per key, upsert by cycle]
           Columns: A=key, B=cycle, C=UpdatedAt (ISO), D=json
           Fallback when prop missing; re-seeds prop on successful recovery
           Self-ghost guard: prop stamped ≥ target cycle is ignored; sheet gives prior good cycle
  
  Layer 3: output/carry_forward_c{XX}.json  [exported per-cycle by scripts/engineAuditor.js, git-tracked]

RIPPLE RESTORATION (internal)
  restoreCarriedRipples_ @ phase01-config/loadPreviousEvening.js:395-410
    Seeded in Phase1-PrevCycleState by loadPreviousCycleState_ @ :280
    Reads previousCycleState.economicRipples & .initiativeRipples
    Seeds S.economicRipples and S.initiativeRipples for decay/expiry logic in Phase6+ readers

PAYLOAD COMPACTION FUNCTIONS
  compactWeatherTracking_ @ phase09-digest/finalizeCycleState.js:196-205  [currentStreak, streakType, etc.]
  compactFrontTracking_ @ :216-229  [frontState, frontStreak, frontStrength, wetRun* fields]
  compactCrisisArcs_ @ :239-272  [active arcs only, capped 8; consecutiveGood/Bad survive recovery]
  compactHospitalEvents_ @ :278-284  [popId + neighborhood only, capped 12]
  compactCrimeSpikes_ @ :320+  [increase-shifts only, responseTime excluded]
  compactMediaEffects_ @ :291-310  [per-domain sentiment changes]
  compactNeighborhoodDynamics_ @ utilities/utilities.js (sentiment, nightlife, retail, tourism per hood)
  compactEconomicRipples_ @ phase09-digest/finalizeCycleState.js:103  [expiry logic applies]
  compactInitiativeRipples_ @ :104  [compactInitiativeRipples_: applies expiry filter]
  compactNeighborhoodEconomies_ @ :481-493  [mood to one decimal, {hood: mood}]
  compactActivityObservations_ @ :503-520  [last 12 cycle entries, 6 metrics each]

CARRY-FORWARD GATE (engine.119 Task 3 assertion)
  assertCarryForwardPresent_ @ phase01-config/loadPreviousEvening.js:205-228
    Called UNWRAPPED in godWorldEngine2.js before Phase1-PrevCycleState @ :275 (production) / :2024 (cycle-phases)
    Hard abort if cycle > 1 and BOTH layers are empty
    Gates: PREV_EVENING_JSON and PREV_CYCLE_STATE_JSON
    Override: script property CARRY_FORWARD_COLD_START_OK=1 (one-shot, consumed on use)

OPEN WORK
  engine.250  Both per-hood effect buses are dead: initiative bus emptied in phase 2 before its phase-3 school and phase-5 business readers; approval bus written in phase 5 into a summary rebuilt each cycle (0 approval-fold ripples ever)
              Ready | engine-sheet | blocks civic.38 Task 4 stage-3

HISTORY
  8382a4e8  engine.243: a crisis gets a name, an end the newsroom can see, and a city that remembers it
  54165d22  engine.187 part 4c: civic load is pressure, a shock is a break — no civic term at all
  57347b56  engine.187 part 4b: the shock detector says why, in the fire response
  19ab8202  engine.187 part 4: four more gates that could not not fire
  4302317c  engine.187 part 3: a shock is a break, not the name of the class above it
  c5f52a3e  engine.242a follow-up (kimi review): a holiday lift unwinding is not a "sentiment collapse" shock

FILES OPENED
  phase01-config/loadPreviousEvening.js
  phase06-analysis/applyShockMonitor.js
  phase09-digest/finalizeCycleState.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
