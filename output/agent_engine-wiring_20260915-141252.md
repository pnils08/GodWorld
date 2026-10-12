WIRING CARD — S.weatherEvents (field)   map: 2026-09-15 / 183 files   

DEFINITION
  phase02-world-state/applyWeatherModel.js:681   S.weatherEvents = [] (init, rebuilt each cycle)

CONTEXT MAPPING
  node scripts/ctxMap.js weatherEvents (full output):
    Written by: phase02-world-state/applyWeatherModel.js::applyWeatherModel_ (lines 681, 685, 689, 693, 697, 709, 1127, 1174, 1227)
    Read by: 6 external functions (listed below)
    Status: CONNECTED

PHASE POSITION
  production entry : Phase2-Weather @ godWorldEngine2.js:293  — BEFORE Phase10-ExecuteIntents (:594)
  cycle-phases     : Phase2-Weather @ godWorldEngine2.js:2042 — BEFORE Phase10-ExecuteIntents (:2329)

READERS (6)
  phase03-population/applyDemographicDrift.js:159           READ — var wxEvts133 = S.weatherEvents || [];
  phase03-population/generateCrisisBuckets.js:135            READ — var wev = S.weatherEvents || [];
  phase03-population/updateNeighborhoodDemographics.js:358   READ — var wEvts = S.weatherEvents || [];
  phase04-events/chaosCarsEngine.js:639                      READ — var wxEvts = (ctx.summary && ctx.summary.weatherEvents) || [];
  phase04-events/generationalEventsEngine.js:273             READ — var wEvts = (ctx.summary && ctx.summary.weatherEvents) || [];
  phase07-evening-media/storyHook.js:632                     READ — var weatherEvents = S.weatherEvents || [];

READER PHASE POSITIONS
  applyDemographicDrift_       @ Phase3-Demographics @ :309 (prod) :2058 (cycle-phases)
  generateCrisisBuckets_       @ Phase3-CrisisBuckets @ :311 (prod) :2060 (cycle-phases)
  updateNeighborhoodDemographics_ @ Phase3-NeighborhoodDemo @ :313 (prod) :2062 (cycle-phases)
  runChaosCarsEngine_          @ Phase4-ChaosCars @ :325 (prod) :2074 (cycle-phases)
  runGenerationalEngine_       @ Phase5-Generational @ :365 (prod) :2114 (cycle-phases)
  storyHookEngine_             @ Phase8-V3Integration (via v3Integration_) @ :524 (prod) :2273 (cycle-phases)

WRITE SITES (applyWeatherModel_)
  :681    S.weatherEvents = []                    (init)
  :685    S.weatherEvents.push({ type: 'first_snow', season: season, cycle: currentCycle })
  :689    S.weatherEvents.push({ type: 'first_warm_day', season: season, cycle: currentCycle })
  :693    S.weatherEvents.push({ type: 'summer_arrives', season: season, cycle: currentCycle })
  :697    S.weatherEvents.push({ type: 'first_frost', season: season, cycle: currentCycle })
  :709    S.weatherEvents.push({ type: 'heat_wave_declared', day: tracking.currentStreak, cycle: currentCycle })
  :1127   S.weatherEvents.push({ type: 'storm', salient: true, cycle: currentCycle, hoods: [...], detail: '...', frontState: '...', precipitationIntensity, windSpeed, magnitude })
  :1174   S.weatherEvents.push({ type: 'flood_conditions', salient: true, cycle: currentCycle, hoods: [...], detail: '...', frontState: '...', wetRunLen, wetRunPrecip, magnitude })
  :1227   S.weatherEvents.push({ type: 'heat_wave', salient: true, cycle: currentCycle, hoods: [...], detail: '...', streak: '...', temp: '...', magnitude })

CYCLE CARRY
  NO — weatherEvents is rebuilt fresh each cycle (S.weatherEvents = [] @ :681)
  CARRIED ACROSS CYCLES: S.weatherTracking (streak state) and S.weatherFrontTracking (Markov front chain)
    Compacted in: phase09-digest/finalizeCycleState.js:143 & :153
    Restored next cycle by: phase02-world-state/applyWeatherModel.js seed logic

OTHER CTX FIELDS TOUCHED IN applyWeatherModel_
  ctx.rng (RNG for Markov chain, streak continuance)
  ctx.config (cycleCount resolution)
  S.weather (ambient impact, type, comfort feedback)
  S.weatherSummary (hotspots for heat_wave scoping)
  S.weatherTracking (streak persistence, seasonFirsts flags)
  S.weatherFrontTracking (Markov front state, fire-once flags)
  S.weatherEventPools (texture pool for citizen life history; keyed 'special' and 'neighborhood' per hood)
  S.previousSeason (seasonal change detection)

WEATHER EVENT SHAPE (from the write sites)
  type: 'first_snow' | 'first_warm_day' | 'summer_arrives' | 'first_frost' | 'heat_wave_declared' | 'storm' | 'flood_conditions' | 'heat_wave'
  salient: boolean (true for storm/flood/heat_wave only)
  cycle: number (currentCycle when event fired)
  hoods: array of neighborhood names (for storm/flood/heat_wave; empty for seasonal)
  detail: string narrative of the event
  frontState: string (STORM/RAIN/HEAT/COLD/MARINE per the Markov front)
  precipitationIntensity: number (storm only)
  windSpeed: number (storm only)
  streak: number (heat_wave only — current hot cycle count)
  temp: number (heat_wave only — rounded Fahrenheit)
  magnitude: WEATHER_SALIENCE.MAJOR_MAGNITUDE constant (0.3, assigned to storm/flood/heat_wave only)

WRITE PATH (applyWeatherModel_)
  MEMORY ONLY — S.weatherEvents lives in ctx.summary; no sheet writes, no intents queued
  No queueCellIntent_, queueAppendIntent_, queueRangeIntent_, queueReplaceIntent_
  No direct Sheets mutations (setValue, setValues, appendRow, deleteRows, etc.)
  Ripple_Ledger writes INDIRECT: applyWeatherModel_ calls recordRipple_() at :1151-1162 (storm) and :1196-1208 (flood), chaosCarsEngine later reads weatherEvents and calls recordRipple_ at :670-683

SALIENT EVENT RIPPLE WRITES (via recordRipple_)
  applyWeatherModel.js:1151-1162  (storm event)
    causeType: 'weather-event'
    causeId: 'storm-c<cycle>'
    effectType: 'storm'
    targetScope: 'neighborhood'
    targetIds: WEATHER_STORM_EXPOSED_HOODS (array)

  applyWeatherModel.js:1196-1208  (flood event)
    causeType: 'weather-event'
    causeId: 'flood-c<cycle>'
    effectType: 'flood'
    targetScope: 'neighborhood'
    targetIds: WEATHER_FLOOD_PRONE_HOODS (array)

  chaosCarsEngine.js:670-683  (weather + business impact via storm/flood)
    causeType: 'weather-event'
    causeId: 'storm-c<cycle>' or 'flood-c<cycle>'
    effectType: 'storm-business' or 'flood-business'
    targetScope: 'business'
    targetIds: [affected BIZ_IDs]

RELATED OPEN WORK
  engine.226 @ ROLLOUT_PLAN.md:151
    "Status log 226: phantom read S.crisisSpikes (no writer) → engine.229"
    (This is separate from weatherEvents; S.crisisSpikes read at economicRippleEngine.js:509 is ORPHAN)

  BACKLOG.md:255 (S139)
    "27.8 Weather as world texture — PARTIALLY BUILT. applyWeatherModel already generates S.weather, S.weatherMood, S.weatherEvents, S.weatherTracking. Missing: seasonal traditions, weather-driven commerce effects, multi-cycle patterns. Priority: LOW."

HISTORY (applyWeatherModel.js)
  1a20a32f S423 engine.148 P2a — weather zones, adjacency and the attention knob are Neighborhood_Map columns
  01539049 S327 engine.70 W-3: weather couples to citizens + businesses (crisis-igniter class)
  7fffc251 S327 engine.70 W-1: weather salience events + front-carry fix (finalizeCycleState v1.9)
  ed600619 S301 [engine-sheet] engine.44 Class 3 — weather-streak carry + Cultural_Ledger POPID + education re-seed
  af402828 Math.random silent-fallback sweep — 55 cycle-path sites → safeRand_(ctx)
  58322583 Upgrade applyWeatherModel_ to v3.5

FILES OPENED
  phase02-world-state/applyWeatherModel.js (definition, 9 write sites, v3.5)
  phase03-population/applyDemographicDrift.js:159 (reader)
  phase03-population/generateCrisisBuckets.js:135 (reader)
  phase03-population/updateNeighborhoodDemographics.js:358 (reader)
  phase04-events/chaosCarsEngine.js:639 (reader, also ripple writer)
  phase04-events/generationalEventsEngine.js:273 (reader)
  phase07-evening-media/storyHook.js:632 (reader)
  phase06-analysis/economicRippleEngine.js:509 (reads S.crisisSpikes PHANTOM, not weatherEvents)
  phase09-digest/finalizeCycleState.js (cycle carry: weatherTracking, weatherFrontTracking)
  phase01-config/godWorldEngine2.js (phase positions, Phase10-ExecuteIntents anchor)
  docs/engine/ENGINE_STUB_REVERSE.json (map freshness check)
  docs/engine/ROLLOUT_PLAN.md (engine.226 reference)
  docs/plans/BACKLOG.md (S139 weather texture backlog)
