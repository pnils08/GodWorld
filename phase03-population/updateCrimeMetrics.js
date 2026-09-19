/**
 * phase03-population/updateCrimeMetrics.js
 *
 * Phase 3 engine: Updates crime metrics per neighborhood each cycle.
 *
 * v1.2 Changes (additive, non-breaking):
 * - Adds crime categories: property, violent, quality-of-life (QoL)
 * - Adds reporting bias + reporting surges (reported vs true incidents)
 * - Adds spillover diffusion + enforcement displacement
 * - Adds enforcement/clearance capacity + overload impacts on response time
 * - Adds lagged economic stress effects (2–3 cycle delay)
 * - Adds patrol strategy input (suppress_hotspots vs community_presence)
 * - Integrates with applyCityDynamics v2.6 (neighborhoodDynamics, clusterDefinitions)
 * - Integrates with applyWeatherModel v3.5 (precipitationIntensity, windSpeed)
 *
 * Existing schema preserved:
 * - propertyCrimeIndex, violentCrimeIndex, responseTimeAvg, clearanceRate, incidentCount
 *
 * v1.3 (engine.212, S451): the per-hood level CARRIES FORWARD from last cycle (PropertyLevel /
 * ViolentLevel / QolLevel on Crime_Metrics); the authored profile seeds only a hood with no row.
 * Signed causes move the level, a slow pull toward the city's own median centres it, transient
 * conditions overlay the observed index. No literal is read on the per-cycle path.
 *
 * v1.4 (engine.237, S470): crime reaches the citizens. (1) S.crimeMetrics.context is the ONE
 * reader contract — per-hood pressure / QoL (0–1, higher = safer) / level / hotspot, and the
 * city's incident trend / enforcement headroom / strategy — every band relative to the city's own
 * middle (SIM_DOCTRINE §15). Ten reader sites read v1.2 field names the writer never emitted and
 * sat on their defaults every cycle. (2) Hotspots are a ratio of the city median score; the
 * absolute 70 was never reached (live max 53), so spillover and every hotspot branch were dead.
 * (3) Police capacity scales with the simulated city (3 units a hood, the 36-for-12 design ratio)
 * — the flat 36 pinned load at 1.0 once the map grew to 22 hoods. (4) Clearance moves toward the
 * cycle's own reading instead of compounding the overload penalty onto last cycle's rate, which
 * ratcheted every hood onto the 0.15 floor by C107.
 *
 * @version 1.4 (additive; CRIME_UPDATE_VERSION remains compatible)
 * @tier 6.2
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var CRIME_UPDATE_VERSION = '1.0'; // preserved for compatibility
var CRIME_UPDATE_VERSION_ADDON = '1.2'; // additive marker

var CRIME_FACTORS = {
  UNEMPLOYMENT_THRESHOLD: 0.10,
  UNEMPLOYMENT_CRIME_FACTOR: 1.5,

  SENTIMENT_THRESHOLD: -0.3,
  SENTIMENT_CRIME_FACTOR: 0.2,

  STORM_CRIME_REDUCTION: 0.3,
  HEATWAVE_CRIME_INCREASE: 0.15,

  SUMMER_CRIME_MOD: 1.1,
  WINTER_CRIME_MOD: 0.9,

  CELEBRATION_CRIME_INCREASE: 0.1,
  CHAOS_CRIME_INCREASE: 0.25,

  RESPONSE_TIME_VARIANCE: 1.5,

  // engine.237: clearance closes this share of the gap to the cycle's own reading each cycle
  // (replaces the unread CLEARANCE_DECAY). The rate still carries momentum; the penalty no longer compounds.
  CLEARANCE_ADJUST: 0.5,
  CLEARANCE_RECOVERY: 0.03
};

// Additive realism constants (kept separate so legacy tuning is untouched)
var CRIME_ADVANCED = {
  // Category tuning (relative sensitivity)
  QOL_BASE_MOD: 0.9,
  QOL_UNEMPLOYMENT_SENS: 0.6,
  QOL_SENTIMENT_SENS: 0.35,
  QOL_CELEBRATION_SENS: 0.45,
  QOL_WEATHER_SENS: 0.20,

  VIOLENT_HEAT_SENS: 0.25,
  PROPERTY_ECON_STRESS_LAG_SENS: 0.55,
  QOL_ECON_STRESS_LAG_SENS: 0.35,

  // Reporting
  BASE_REPORTING_RATE: 0.62,
  STORM_REPORTING_DROP: 0.12,
  CELEBRATION_REPORTING_DROP: 0.06,
  CHAOS_REPORTING_SURGE: 0.12,
  MEDIA_REPORTING_SURGE: 0.08,

  // Spillover / diffusion
  DIFFUSION_RATE: 0.14,
  DISPLACEMENT_RATE: 0.10,
  // engine.237: a hotspot is a hood whose score runs this far over the city's own median score
  // (was an absolute 70 no hood reached — live C106/C107 max 53). Live: Downtown / West Oakland /
  // East Oakland both cycles.
  HOTSPOT_RATIO: 1.25,
  HOTSPOT_PRESSURE_CAP: 18,

  // engine.237 reader bands — a hood's pressure (mean of its property + violent index) as a ratio
  // of the city median: >= HIGH reads 'high' crime / QoL <= 0.35, <= LOW reads 'low' / QoL >= 0.65.
  PRESSURE_HIGH_RATIO: 1.3,
  PRESSURE_LOW_RATIO: 0.7,

  // Enforcement capacity — engine.237: scales with the simulated city (the 36-unit / 12-hood design
  // ratio). A flat 36 against 22 hoods held the load ratio at its 1.0 clamp every cycle.
  UNITS_PER_HOOD: 3,
  UNITS_PER_INCIDENT: 0.35,
  OVERLOAD_RESPONSE_PENALTY: 3.2,
  OVERLOAD_CLEARANCE_PENALTY: 0.18,
  ENFORCEMENT_BOOST_CLEARANCE: 0.08,

  // Patrol strategy modifiers
  STRATEGY_SUPPRESS_DISPLACEMENT_MULT: 1.6,
  STRATEGY_SUPPRESS_CLEARANCE_MULT: 1.3,
  STRATEGY_COMMUNITY_DISPLACEMENT_MULT: 0.4,
  STRATEGY_COMMUNITY_CLEARANCE_MULT: 0.8,
  STRATEGY_COMMUNITY_QOL_REDUCTION: 0.12,

  // Lag state
  LAG_WINDOW: 6,
  ECON_LAG_CYCLES: 3
};

// Default adjacency (used if no better graph available)
// engine.148 P2: adjacency is sheet truth — Neighborhood_Map.Adjacent, seeded
// into S.neighborhoodAdjacency at Phase1-CanonHoods (mirrored). No literal.

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

function updateCrimeMetrics_Phase3_(ctx) {
  var ss = ctx.ss;
  var S = ctx.summary || {};
  var cycle = S.absoluteCycle || 0;

  if (typeof ensureCrimeMetricsSchema_ === 'function') {
    ensureCrimeMetricsSchema_(ss);
  }

  var currentMetrics = {};
  if (typeof getCrimeMetrics_ === 'function') {
    currentMetrics = getCrimeMetrics_(ss);
  }

  var demographics = {};
  if (typeof getNeighborhoodDemographics_ === 'function') {
    demographics = getNeighborhoodDemographics_(ss);
  }

  var weather = S.weather || {};
  var weatherType = weather.type || 'clear';
  var weatherImpact = (weather.impact === 0 || weather.impact) ? Number(weather.impact) : 1.0;

  // Weather v3.5 fields
  var precipIntensity = (weather.precipitationIntensity === 0 || weather.precipitationIntensity)
    ? Number(weather.precipitationIntensity) : 0;
  var windSpeed = (weather.windSpeed === 0 || weather.windSpeed) ? Number(weather.windSpeed) : 5;

  var cityDynamics = S.cityDynamics || {};
  var sentiment = (cityDynamics.sentiment === 0 || cityDynamics.sentiment) ? Number(cityDynamics.sentiment) : 0;

  // Neighborhood dynamics (from applyCityDynamics v2.6)
  var neighborhoodDynamics = S.neighborhoodDynamics || {};

  var season = (S.season || 'spring').toString();
  var worldEvents = S.worldEvents || [];
  var storySeeds = S.storySeeds || [];
  var mediaCoverage = Number(S.mediaCoverage || S.mediaCount || 0);

  var chaosEvents = 0;
  var celebrationEvents = 0;
  var chaosByHood = {};   // engine.212: CHAOS / CRIME events carry their hood (crisis spikes do) — count them where they happened
  var chaosCityWide = 0;  // events with no neighborhood

  for (var e = 0; e < worldEvents.length; e++) {
    var evt = worldEvents[e] || {};
    var domain = (evt.domain || evt._domain || '').toString().toUpperCase();
    // engine.212: SAFETY counts — crisis spikes (generateCrisisSpikes.js DOMAINS) and chaos-cars
    // outcomes emit domain 'SAFETY' with a hood; nothing live ever emitted CHAOS/CRIME, so this
    // gate had never fired (SIM_DOCTRINE §15: a gate that can't fire is a trick).
    if (domain === 'CHAOS' || domain === 'CRIME' || domain === 'SAFETY') {
      chaosEvents++;
      var evHood = String(evt.neighborhood || '').trim();
      if (evHood) chaosByHood[evHood] = (chaosByHood[evHood] || 0) + 1; else chaosCityWide++;
    }
    else if (domain === 'CELEBRATION' || domain === 'FESTIVAL') celebrationEvents++;
  }

  var rng = safeRand_(ctx);

  // Build adjacency graph
  var adjacency = buildCrimeAdjacencyGraph_(S);

  // Ensure lag state
  if (!S.crimeLag) {
    S.crimeLag = {
      historyByNeighborhood: {},
      window: CRIME_ADVANCED.LAG_WINDOW,
      econLagCycles: CRIME_ADVANCED.ECON_LAG_CYCLES
    };
  }
  updateCrimeLagState_(S, demographics, neighborhoodDynamics);

  // Patrol strategy (additive input)
  var patrolStrategy = derivePatrolStrategy_(ctx, S);

  // Enforcement capacity
  var enforcementCfg = (ctx.config && ctx.config.enforcement) || S.enforcement || {};

  // Calculate new metrics
  var newMetrics = {};
  // engine.134 Task 4 (S423): the Neighborhood_Map set, not the profile table's keys.
  var neighborhoods = crimeIterationHoods_(S);
  var policingCapacity = derivePolicingCapacity_(enforcementCfg, neighborhoods.length); // engine.237: sized to the city

  // Precompute reporting signal
  var reportingSignal = deriveReportingSignal_({
    weatherType: weatherType,
    weatherImpact: weatherImpact,
    precipIntensity: precipIntensity,
    chaosEvents: chaosEvents,
    celebrationEvents: celebrationEvents,
    mediaCoverage: mediaCoverage,
    storySeedCount: storySeeds.length
  });

  // Precompute hotspot pressure from previous cycle (engine.237: the simulated hoods only — a
  // stale row for a place off the map never spills into a real one)
  var hotspotPressure = computeHotspotPressure_(currentMetrics, adjacency, neighborhoods);

  // engine.212: the reversion target is the city's own median level from LAST cycle's rows
  var cityMedianLevel = crimeCityMedianLevels_(currentMetrics);
  // engine.212: a hood's joblessness / youth share is read AGAINST THE CITY'S OWN median — the
  // signed, self-relative cause that keeps hoods distinct from their own data (no threshold literal
  // decides who is rough). Absolute thresholds below still add on top for the extreme case.
  var cityMedianDemo = crimeCityMedianDemo_(demographics, neighborhoods);

  // Track loads for enforcement
  var predictedCityIncidents = 0;
  for (var pi = 0; pi < neighborhoods.length; pi++) {
    var hoodP = neighborhoods[pi];
    var prevM = currentMetrics[hoodP];
    if (prevM && prevM.incidentCount !== undefined) predictedCityIncidents += Number(prevM.incidentCount || 0);
  }

  var cityLoad = computeCityEnforcementLoad_(policingCapacity, predictedCityIncidents);

  for (var i = 0; i < neighborhoods.length; i++) {
    var hood = neighborhoods[i];
    var profile = crimeProfileFor_(hood, S);
    var demo = demographics[hood] || {};
    var prev = currentMetrics[hood] || null;
    var nd = neighborhoodDynamics[hood] || {};

    newMetrics[hood] = calculateNeighborhoodCrime_(
      hood,
      profile,
      demo,
      prev,
      {
        weather: weatherType,
        weatherImpact: weatherImpact,
        precipIntensity: precipIntensity,
        windSpeed: windSpeed,
        sentiment: sentiment,
        season: season,
        neighborhoodDynamics: nd
      },
      {
        chaos: chaosEvents,
        chaosHere: chaosByHood[hood] || 0,   // engine.212
        chaosCity: chaosCityWide,            // engine.212
        celebration: celebrationEvents,
        mediaCoverage: mediaCoverage,
        storySeedCount: storySeeds.length
      },
      {
        reportingSignal: reportingSignal,
        hotspotPressure: hotspotPressure[hood] || 0,
        adjacency: adjacency,
        lag: getNeighborhoodLag_(S, hood),
        cityMedianLevel: cityMedianLevel, // engine.212
        cityMedianDemo: cityMedianDemo,   // engine.212
        policingCapacity: policingCapacity,
        cityLoad: cityLoad,
        patrolStrategy: patrolStrategy
      },
      rng
    );
  }

  // Shifts
  var shifts = [];
  if (typeof calculateCrimeShifts_ === 'function' && Object.keys(currentMetrics).length > 0) {
    shifts = calculateCrimeShifts_(currentMetrics, newMetrics);
  }

  // Citywide aggregates
  var cityWide = calculateCityWideFromMap_(newMetrics);
  var categoryCityWide = calculateCityWideCategoriesFromMap_(newMetrics);
  var hotspots = calculateCrimeHotspots_(newMetrics, adjacency);
  var context = buildCrimeReaderContext_(newMetrics, hotspots, cityWide, categoryCityWide,
    predictedCityIncidents, policingCapacity, patrolStrategy, shifts);

  // Summary
  S.crimeMetrics = {
    updated: true,
    cycle: cycle,
    // engine.72 G-EC56: per-hood real metrics exposed so Phase 8's
    // Neighborhood_Map.CrimeIndex derives from crime PHYSICS, not the
    // SAFETY-event-count proxy. Keys = the Neighborhood_Map hood set (engine.134).
    byNeighborhood: newMetrics,
    cityWide: cityWide,
    shifts: shifts,
    // engine.237: the reader contract — citizen events, youth, story seeds, demographics and the
    // civic/media pools read THIS, never the raw index scale (see buildCrimeReaderContext_).
    context: context,
    factors: {
      weather: weatherType,
      sentiment: sentiment,
      season: season,
      chaosEvents: chaosEvents,
      celebrationEvents: celebrationEvents
    },

    // Additive payloads
    versionAddon: CRIME_UPDATE_VERSION_ADDON,
    categoryCityWide: categoryCityWide,
    hotspots: hotspots,
    reporting: {
      baseRate: CRIME_ADVANCED.BASE_REPORTING_RATE,
      signal: reportingSignal,
      mediaCoverage: mediaCoverage,
      storySeedCount: storySeeds.length
    },
    enforcement: {
      policingCapacity: policingCapacity.strength,
      cityLoad: cityLoad.loadRatio,
      patrolStrategy: patrolStrategy.name
    }
  };

  // Batch update
  if (typeof batchUpdateCrimeMetrics_ === 'function') {
    batchUpdateCrimeMetrics_(ctx, newMetrics);
  }

  ctx.summary = S;
  return newMetrics;
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

// engine.212 (S451, builder-direct 2026-09-13): a persistent ledger carries forward from LAST
// CYCLE — it is never rebuilt from a hardcoded table. Before this the index was 70% prev +
// 30% (50 × authored mod) every cycle, so the literal was the equilibrium and every hood sat
// within a few points of its authored rank after 106 cycles (the real-Oakland ranking wearing a
// physics costume). Now:
//   LEVEL  — the hood's persistent crime level (Crime_Metrics PropertyLevel / ViolentLevel /
//            QolLevel). Seeded from the row's last observed index the first time (so C107
//            starts where C106 ended) and from the authored profile ONLY for a hood with no
//            row at all. Moves by SIGNED CAUSES, bounded per cycle, plus a slow pull toward
//            the city's OWN median level (never the literal). Persists.
//   OVERLAY — this cycle's transient conditions (season, weather, celebration, nightlife
//            strain, city sentiment, dice) multiply the level into the OBSERVED index. Not
//            carried, so a 13-cycle summer does not compound.
// rng draw count and order are unchanged from v1.2 (Phase 3 shares ctx.rng with every later phase).
var CRIME_LEVEL = {
  REVERT_RATE: 0.04,        // per-cycle pull toward the city median level (half-life ~17 cycles)
  CAUSE_CAP: 3.0,           // max |signed cause push| per level per cycle (index points)
  UNEMPLOYMENT_PUSH: 1.0,   // per 5 pts of unemployment above CRIME_FACTORS.UNEMPLOYMENT_THRESHOLD (the extreme case)
  REL_UNEMPLOYMENT_PUSH: 0.15, // per 1 pt of unemployment above (+) / below (−) the CITY MEDIAN — signed, self-relative
  REL_YOUTH_PUSH: 0.05,     // per 1 pt of youth share above / below the city median (violent)
  ECON_LAG_PUSH: 1.0,       // × economicStressLag (0..1)
  HOTSPOT_PUSH: 0.10,       // × hotspot pressure (0..HOTSPOT_PRESSURE_CAP)
  CHAOS_PUSH: 0.5,          // per CHAOS/CRIME world event this cycle (residue, decays via reversion)
  SENTIMENT_PUSH: 2.0,      // × (threshold − sentiment) when the city is below SENTIMENT_THRESHOLD
  YOUTH_PUSH: 5.0,          // × (youthRatio − 0.3) when above
  ENFORCEMENT_PULL: 1.5,    // × enforcementPower (0..1), property; violent ×2/3; qol ×1
  INCIDENTS_PER_POINT: 1 / 5.5, // incidents ≈ (propertyLevel + violentLevel) / 2 / 5.5 (Downtown 60 → ~11)
  MIN: 5, MAX: 95
};

// The persisted level for one axis, else the row's last observed index (first run after the
// columns arm), else the authored/derived seed (a hood with no row). null/blank is NOT 0.
function crimeLevelFrom_(prev, levelKey, indexKey, seed) {
  if (prev) {
    var lv = prev[levelKey];
    if (lv !== null && lv !== undefined && isFinite(Number(lv)) && Number(lv) > 0) return Number(lv);
    var ix = prev[indexKey];
    if (ix !== null && ix !== undefined && isFinite(Number(ix)) && Number(ix) > 0) return Number(ix);
  }
  return seed;
}

function crimeMedian_(arr) {
  var a = [];
  for (var i = 0; i < arr.length; i++) { var n = Number(arr[i]); if (isFinite(n) && n > 0) a.push(n); }
  if (!a.length) return null;
  a.sort(function(x, y) { return x - y; });
  var mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

// City median of every hood's PREVIOUS level (falls back to the observed index where the level
// column is still blank). The reversion target — the city's own centre, never a literal.
function crimeCityMedianLevels_(currentMetrics) {
  var keys = Object.keys(currentMetrics || {}), p = [], v = [], q = [];
  for (var i = 0; i < keys.length; i++) {
    var m = currentMetrics[keys[i]];
    if (!m) continue;
    p.push(crimeLevelFrom_(m, 'propertyLevel', 'propertyCrimeIndex', null));
    v.push(crimeLevelFrom_(m, 'violentLevel', 'violentCrimeIndex', null));
    q.push(crimeLevelFrom_(m, 'qolLevel', 'qualityOfLifeIndex', null));
  }
  return { property: crimeMedian_(p), violent: crimeMedian_(v), qol: crimeMedian_(q) };
}

// City median unemployment rate and youth share across the iterated hoods (null when no data).
function crimeCityMedianDemo_(demographics, hoods) {
  var u = [], y = [];
  for (var i = 0; i < hoods.length; i++) {
    var d = demographics[hoods[i]];
    if (!d) continue;
    var tot = (d.students || 0) + (d.adults || 0) + (d.seniors || 0);
    if (tot <= 0) continue;
    u.push((d.unemployed || 0) / tot);
    y.push((d.students || 0) / tot);
  }
  return { unemployment: crimeMedian_(u), youth: crimeMedian_(y) };
}

function crimeClampLevel_(n) { return Math.max(CRIME_LEVEL.MIN, Math.min(CRIME_LEVEL.MAX, n)); }
function crimeCapPush_(n) { return Math.max(-CRIME_LEVEL.CAUSE_CAP, Math.min(CRIME_LEVEL.CAUSE_CAP, n)); }

function calculateNeighborhoodCrime_(neighborhood, profile, demo, prev, context, events, advanced, rng) {
  // ---- the persistent level: last cycle's, or the seed for a hood with no row -------------------
  var seedProperty = 50 * profile.propertyCrimeMod;
  var seedViolent = 50 * profile.violentCrimeMod;
  var seedQoL = 50 * (profile.qualityOfLifeMod || CRIME_ADVANCED.QOL_BASE_MOD);
  var levelProperty = crimeLevelFrom_(prev, 'propertyLevel', 'propertyCrimeIndex', seedProperty);
  var levelViolent = crimeLevelFrom_(prev, 'violentLevel', 'violentCrimeIndex', seedViolent);
  var levelQoL = crimeLevelFrom_(prev, 'qolLevel', 'qualityOfLifeIndex', seedQoL);

  var baseResponse = 8 / profile.responseMod;
  var baseClearance = 0.35 * profile.responseMod; // the hood's unloaded clearance — the cycle's reading builds on it

  // Demographics
  var totalPop = (demo.students || 0) + (demo.adults || 0) + (demo.seniors || 0);
  var unemploymentRate = totalPop > 0 ? ((demo.unemployed || 0) / totalPop) : 0.08;
  var youthRatio = totalPop > 0 ? ((demo.students || 0) / totalPop) : 0.2;

  // Enforcement (needed by both the level causes and the overlay)
  var policingCapacity = advanced && advanced.policingCapacity ? advanced.policingCapacity : derivePolicingCapacity_({}, 1);
  var cityLoad = advanced && advanced.cityLoad ? advanced.cityLoad : { loadRatio: 0.5 };
  var patrolStrategy = advanced && advanced.patrolStrategy ? advanced.patrolStrategy : { name: 'balanced', displacementMult: 1.0, clearanceMult: 1.0, qolReduction: 0 };
  var enforcementShare = clamp01_(policingCapacity.neighborhoodShare[neighborhood] || policingCapacity.defaultNeighborhoodShare);
  var enforcementPower = clamp01_(enforcementShare * policingCapacity.strength);
  var displacement = enforcementPower * CRIME_ADVANCED.DISPLACEMENT_RATE * patrolStrategy.displacementMult;

  // ---- SIGNED CAUSES move the level (persist) ---------------------------------------------------
  var pushProperty = 0, pushViolent = 0, pushQoL = 0;
  var medDemo = (advanced && advanced.cityMedianDemo) || {};
  if (totalPop > 0 && medDemo.unemployment !== null && medDemo.unemployment !== undefined) {
    var relU = (unemploymentRate - medDemo.unemployment) / 0.01;   // points above (+) / below (−) the city's median
    pushProperty += relU * CRIME_LEVEL.REL_UNEMPLOYMENT_PUSH;
    pushQoL += relU * CRIME_LEVEL.REL_UNEMPLOYMENT_PUSH * CRIME_ADVANCED.QOL_UNEMPLOYMENT_SENS;
  }
  if (totalPop > 0 && medDemo.youth !== null && medDemo.youth !== undefined) {
    var relY = (youthRatio - medDemo.youth) / 0.01;
    pushViolent += relY * CRIME_LEVEL.REL_YOUTH_PUSH;
  }
  if (unemploymentRate > CRIME_FACTORS.UNEMPLOYMENT_THRESHOLD) {
    var excessUnemployment = unemploymentRate - CRIME_FACTORS.UNEMPLOYMENT_THRESHOLD;
    pushProperty += (excessUnemployment / 0.05) * CRIME_LEVEL.UNEMPLOYMENT_PUSH;
    pushQoL += (excessUnemployment / 0.05) * CRIME_LEVEL.UNEMPLOYMENT_PUSH * CRIME_ADVANCED.QOL_UNEMPLOYMENT_SENS;
  }
  if (youthRatio > 0.3) {
    pushViolent += (youthRatio - 0.3) * CRIME_LEVEL.YOUTH_PUSH;
    pushQoL += (youthRatio - 0.3) * CRIME_LEVEL.YOUTH_PUSH * 0.5;
  }
  var lag = advanced && advanced.lag ? advanced.lag : null;
  var econStressLag = lag ? Number(lag.economicStressLag || 0) : 0;
  pushProperty += econStressLag * CRIME_LEVEL.ECON_LAG_PUSH;
  pushViolent += econStressLag * CRIME_LEVEL.ECON_LAG_PUSH * 0.5;
  pushQoL += econStressLag * CRIME_LEVEL.ECON_LAG_PUSH * CRIME_ADVANCED.QOL_ECON_STRESS_LAG_SENS;
  var pressure = Number((advanced && advanced.hotspotPressure) || 0);
  if (pressure > 0) {
    pushProperty += pressure * CRIME_LEVEL.HOTSPOT_PUSH;
    pushViolent += pressure * CRIME_LEVEL.HOTSPOT_PUSH * 0.5;
    pushQoL += pressure * CRIME_LEVEL.HOTSPOT_PUSH;
  }
  // chaos / crime world events: one IN this hood is a full push; a city-wide one (no neighborhood)
  // a quarter push on every hood. events.chaosHere / events.chaosCity are counted by the caller.
  var chaosWeight = (Number(events.chaosHere) || 0) + (Number(events.chaosCity) || 0) * 0.25;
  if (chaosWeight > 0) {
    pushProperty += chaosWeight * CRIME_LEVEL.CHAOS_PUSH;
    pushViolent += chaosWeight * CRIME_LEVEL.CHAOS_PUSH * 0.5;
    pushQoL += chaosWeight * CRIME_LEVEL.CHAOS_PUSH * 0.5;
  }
  if (context.sentiment < CRIME_FACTORS.SENTIMENT_THRESHOLD) {
    var sentimentGap = CRIME_FACTORS.SENTIMENT_THRESHOLD - context.sentiment;
    pushProperty += sentimentGap * CRIME_LEVEL.SENTIMENT_PUSH;
    pushQoL += sentimentGap * CRIME_LEVEL.SENTIMENT_PUSH * 0.5;
  }
  // Enforcement FIGHTS CAUSES — it can zero out this cycle's push, never sink a hood that has no
  // cause (the 200-cycle proof: an always-on pull drained the whole city 41 → 16). With no cause
  // the level is conserved; only the pull toward the city's own median moves it.
  var enforceP = enforcementPower * CRIME_LEVEL.ENFORCEMENT_PULL + displacement * 2;
  var enforceV = enforcementPower * CRIME_LEVEL.ENFORCEMENT_PULL * (2 / 3);
  var enforceQ = enforcementPower * CRIME_LEVEL.ENFORCEMENT_PULL + patrolStrategy.qolReduction * 2;
  pushProperty -= Math.min(enforceP, Math.max(0, pushProperty));
  pushViolent -= Math.min(enforceV, Math.max(0, pushViolent));
  pushQoL -= Math.min(enforceQ, Math.max(0, pushQoL));

  // reversion toward the city's own median level — the only "centre", and it is the city's
  var med = (advanced && advanced.cityMedianLevel) || {};
  var revert = function(level, target) {
    return (target === null || target === undefined || !isFinite(Number(target))) ? 0 : CRIME_LEVEL.REVERT_RATE * (Number(target) - level);
  };
  levelProperty = crimeClampLevel_(levelProperty + crimeCapPush_(pushProperty) + revert(levelProperty, med.property));
  levelViolent = crimeClampLevel_(levelViolent + crimeCapPush_(pushViolent) + revert(levelViolent, med.violent));
  levelQoL = crimeClampLevel_(levelQoL + crimeCapPush_(pushQoL) + revert(levelQoL, med.qol));

  // ---- TRANSIENT OVERLAY on this cycle's observed index (not carried) ---------------------------
  var ovProperty = 1, ovViolent = 1, ovQoL = 1;
  var baseIncidents = (levelProperty + levelViolent) / 2 * CRIME_LEVEL.INCIDENTS_PER_POINT;

  var w = (context.weather || '').toString();
  var precipIntensity = (context.precipIntensity === 0 || context.precipIntensity) ? Number(context.precipIntensity) : 0;
  var windSpeed = (context.windSpeed === 0 || context.windSpeed) ? Number(context.windSpeed) : 5;
  var severe = (context.weatherImpact >= 1.4);
  if (w === 'storm' || (severe && precipIntensity >= 0.45)) {
    ovProperty *= (1 - CRIME_FACTORS.STORM_CRIME_REDUCTION);
    ovViolent *= (1 - CRIME_FACTORS.STORM_CRIME_REDUCTION);
    ovQoL *= (1 - Math.min(0.22, CRIME_ADVANCED.QOL_WEATHER_SENS + precipIntensity * 0.15));
    baseIncidents = Math.floor(baseIncidents * 0.72);
  } else if (w === 'heatwave' || w === 'hot') {
    ovViolent *= (1 + Math.max(CRIME_FACTORS.HEATWAVE_CRIME_INCREASE, CRIME_ADVANCED.VIOLENT_HEAT_SENS));
    ovQoL *= 1.05;
    baseIncidents = Math.ceil(baseIncidents * 1.10);
  }
  if (windSpeed >= 30) {
    baseIncidents = Math.max(0, Math.floor(baseIncidents * 0.96));
    ovQoL *= 0.98;
  }

  var seasonMod = 1.0;
  var s = (context.season || '').toString().toLowerCase();
  if (s === 'summer') seasonMod = CRIME_FACTORS.SUMMER_CRIME_MOD;
  else if (s === 'winter') seasonMod = CRIME_FACTORS.WINTER_CRIME_MOD;
  ovProperty *= seasonMod;
  ovViolent *= seasonMod;
  ovQoL *= (1 + (seasonMod - 1) * 0.6);

  if (events.chaos > 0) baseIncidents += events.chaos * 2;
  if (events.celebration > 0) {
    ovProperty *= (1 + events.celebration * CRIME_FACTORS.CELEBRATION_CRIME_INCREASE);
    ovQoL *= (1 + events.celebration * CRIME_ADVANCED.QOL_CELEBRATION_SENS * 0.08);
    baseIncidents += events.celebration;
  }
  if (pressure > 0) baseIncidents += Math.round(pressure / 6);

  var nd = context.neighborhoodDynamics || {};
  if (nd && typeof nd === 'object') {
    var nightlife = (nd.nightlife === 0 || nd.nightlife) ? Number(nd.nightlife) : 1;
    var publicSpaces = (nd.publicSpaces === 0 || nd.publicSpaces) ? Number(nd.publicSpaces) : 1;
    var traffic = (nd.traffic === 0 || nd.traffic) ? Number(nd.traffic) : 1;
    if (nightlife >= 1.3) { ovQoL *= 1.06; ovViolent *= 1.03; baseIncidents += 1; }
    if (publicSpaces >= 1.3) { ovProperty *= 1.03; ovQoL *= 1.03; }
    if (traffic >= 1.3) { ovProperty *= 1.02; baseIncidents += 1; }
  }

  // Clearance momentum (same two draws as v1.2, same position). engine.237: the draw is held and
  // applied after the overload / enforcement terms below, to the gap-closing step — not added to a
  // carried rate the overload penalty then compounds on.
  var clearanceChange = 0;
  if (prev) {
    var clearanceDir = (rng() > 0.5) ? 1 : -1;
    clearanceChange = clearanceDir * rng() * CRIME_FACTORS.CLEARANCE_RECOVERY;
  }

  var baseProperty = levelProperty * ovProperty;
  var baseViolent = levelViolent * ovViolent;
  var baseQoL = levelQoL * ovQoL;

  // Random variance (same five draws as v1.2, same order)
  baseProperty += (rng() - 0.5) * 6;
  baseViolent += (rng() - 0.5) * 4;
  baseQoL += (rng() - 0.5) * 6;
  baseResponse += (rng() - 0.5) * CRIME_FACTORS.RESPONSE_TIME_VARIANCE;
  baseIncidents += Math.round((rng() - 0.5) * 4);

  var loadProxy = Math.max(0, baseIncidents) * CRIME_ADVANCED.UNITS_PER_INCIDENT;

  // Overload penalties (response / clearance are same-cycle readings, not carried levels)
  var overload = clamp01_(cityLoad.loadRatio);
  baseResponse += overload * CRIME_ADVANCED.OVERLOAD_RESPONSE_PENALTY;
  // engine.237: this cycle's clearance READING (unloaded rate − overload + enforcement), then the
  // carried rate closes CLEARANCE_ADJUST of the gap to it. v1.3 subtracted the overload penalty from
  // LAST cycle's rate every cycle: at load 1.0 that is −0.18 a cycle against a +0.007 boost, and every
  // hood sat on the 0.15 floor by C107 with no way off it.
  var clearanceReading = baseClearance
    - overload * CRIME_ADVANCED.OVERLOAD_CLEARANCE_PENALTY
    + enforcementPower * CRIME_ADVANCED.ENFORCEMENT_BOOST_CLEARANCE * patrolStrategy.clearanceMult;
  var prevClearance = prev ? Number(prev.clearanceRate) : NaN;
  baseClearance = (isFinite(prevClearance) && prevClearance > 0)
    ? prevClearance + CRIME_FACTORS.CLEARANCE_ADJUST * (clearanceReading - prevClearance) + clearanceChange
    : clearanceReading;

  // Reporting model
  var reportingSignal = (advanced && advanced.reportingSignal) ? advanced.reportingSignal : { reportingMultiplier: 1, effectiveRate: CRIME_ADVANCED.BASE_REPORTING_RATE };
  var reportingRate = clamp01_(reportingSignal.effectiveRate);
  var reportingMult = Math.max(0.5, Math.min(1.5, Number(reportingSignal.reportingMultiplier || 1)));

  var trueIncidents = Math.max(0, Math.round(baseIncidents));
  var reportedIncidents = Math.max(0, Math.round(trueIncidents * reportingRate * reportingMult));

  // Clamp & return
  var out = {
    propertyCrimeIndex: Math.max(5, Math.min(95, Math.round(baseProperty))),
    violentCrimeIndex: Math.max(5, Math.min(95, Math.round(baseViolent))),
    responseTimeAvg: Math.max(3, Math.min(15, Math.round(baseResponse * 10) / 10)),
    clearanceRate: Math.max(0.15, Math.min(0.7, Math.round(baseClearance * 100) / 100)),
    incidentCount: Math.max(0, trueIncidents),
    // engine.212: the carried levels
    propertyLevel: Math.round(levelProperty * 100) / 100,
    violentLevel: Math.round(levelViolent * 100) / 100,
    qolLevel: Math.round(levelQoL * 100) / 100
  };

  // Additive fields
  out.qualityOfLifeIndex = Math.max(5, Math.min(95, Math.round(baseQoL)));
  out.reportedIncidentCount = reportedIncidents;
  out.trueIncidentCount = trueIncidents;
  out.reportingRate = Math.round(reportingRate * 100) / 100;
  out.reportingMultiplier = Math.round(reportingMult * 100) / 100;

  out.enforcement = {
    neighborhoodShare: Math.round(enforcementShare * 100) / 100,
    enforcementPower: Math.round(enforcementPower * 100) / 100,
    cityLoadRatio: Math.round(overload * 100) / 100,
    loadProxyUnits: Math.round(loadProxy * 100) / 100,
    patrolStrategy: patrolStrategy.name
  };

  out.categoryBreakdown = {
    propertyIndex: out.propertyCrimeIndex,
    violentIndex: out.violentCrimeIndex,
    qualityOfLifeIndex: out.qualityOfLifeIndex
  };

  out.drivers = {
    unemploymentRate: Math.round(unemploymentRate * 1000) / 1000,
    youthRatio: Math.round(youthRatio * 1000) / 1000,
    hotspotPressure: Math.round(pressure * 100) / 100,
    econStressLag: Math.round(econStressLag * 100) / 100,
    // engine.212: what moved the level this cycle (signed, pre-cap) and the city centre it leans on
    levelPush: { property: Math.round(pushProperty * 100) / 100, violent: Math.round(pushViolent * 100) / 100, qol: Math.round(pushQoL * 100) / 100 },
    cityMedianLevel: { property: med.property == null ? null : Math.round(med.property * 100) / 100, violent: med.violent == null ? null : Math.round(med.violent * 100) / 100 }
  };

  return out;
}

// ============================================================================
// CITYWIDE AGGREGATES
// ============================================================================

function calculateCityWideFromMap_(metricsMap) {
  var neighborhoods = Object.keys(metricsMap);
  if (neighborhoods.length === 0) {
    return {
      avgPropertyCrime: 50,
      avgViolentCrime: 50,
      avgResponseTime: 8,
      avgClearanceRate: 0.35,
      totalIncidents: 0
    };
  }

  var sumProperty = 0, sumViolent = 0, sumResponse = 0, sumClearance = 0, totalIncidents = 0;

  for (var i = 0; i < neighborhoods.length; i++) {
    var m = metricsMap[neighborhoods[i]];
    sumProperty += m.propertyCrimeIndex;
    sumViolent += m.violentCrimeIndex;
    sumResponse += m.responseTimeAvg;
    sumClearance += m.clearanceRate;
    totalIncidents += m.incidentCount;
  }

  var n = neighborhoods.length;
  return {
    avgPropertyCrime: Math.round(sumProperty / n),
    avgViolentCrime: Math.round(sumViolent / n),
    avgResponseTime: Math.round((sumResponse / n) * 10) / 10,
    avgClearanceRate: Math.round((sumClearance / n) * 100) / 100,
    totalIncidents: totalIncidents
  };
}

function calculateCityWideCategoriesFromMap_(metricsMap) {
  var neighborhoods = Object.keys(metricsMap);
  if (neighborhoods.length === 0) {
    return {
      avgQualityOfLife: 50,
      totalReportedIncidents: 0,
      totalTrueIncidents: 0,
      avgReportingRate: CRIME_ADVANCED.BASE_REPORTING_RATE
    };
  }

  var sumQoL = 0;
  var totalReported = 0;
  var totalTrue = 0;
  var sumRepRate = 0;

  for (var i = 0; i < neighborhoods.length; i++) {
    var m = metricsMap[neighborhoods[i]];
    sumQoL += (m.qualityOfLifeIndex !== undefined) ? Number(m.qualityOfLifeIndex) : 50;
    totalReported += Number(m.reportedIncidentCount || 0);
    totalTrue += Number(m.trueIncidentCount || m.incidentCount || 0);
    sumRepRate += Number(m.reportingRate || CRIME_ADVANCED.BASE_REPORTING_RATE);
  }

  var n = neighborhoods.length;
  return {
    avgQualityOfLife: Math.round(sumQoL / n),
    totalReportedIncidents: totalReported,
    totalTrueIncidents: totalTrue,
    avgReportingRate: Math.round((sumRepRate / n) * 100) / 100
  };
}

// ============================================================================
// PATROL STRATEGY
// ============================================================================

function derivePatrolStrategy_(ctx, S) {
  // Check for explicit input
  var cfg = (ctx.config && ctx.config.patrolStrategy) || S.patrolStrategy || null;

  if (cfg && typeof cfg === 'string') {
    cfg = { name: cfg };
  }

  if (!cfg || !cfg.name) {
    return {
      name: 'balanced',
      displacementMult: 1.0,
      clearanceMult: 1.0,
      qolReduction: 0
    };
  }

  var name = cfg.name.toString().toLowerCase().replace(/[^a-z_]/g, '');

  if (name === 'suppress_hotspots' || name === 'suppress') {
    return {
      name: 'suppress_hotspots',
      displacementMult: CRIME_ADVANCED.STRATEGY_SUPPRESS_DISPLACEMENT_MULT,
      clearanceMult: CRIME_ADVANCED.STRATEGY_SUPPRESS_CLEARANCE_MULT,
      qolReduction: 0
    };
  }

  if (name === 'community_presence' || name === 'community') {
    return {
      name: 'community_presence',
      displacementMult: CRIME_ADVANCED.STRATEGY_COMMUNITY_DISPLACEMENT_MULT,
      clearanceMult: CRIME_ADVANCED.STRATEGY_COMMUNITY_CLEARANCE_MULT,
      qolReduction: CRIME_ADVANCED.STRATEGY_COMMUNITY_QOL_REDUCTION
    };
  }

  return {
    name: 'balanced',
    displacementMult: 1.0,
    clearanceMult: 1.0,
    qolReduction: 0
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function clamp01_(n) {
  return Math.max(0, Math.min(1, Number(n || 0)));
}

function buildCrimeAdjacencyGraph_(S) {
  if (!S || !S.neighborhoodAdjacency || typeof S.neighborhoodAdjacency !== 'object') {
    throw new Error('buildCrimeAdjacencyGraph_: S.neighborhoodAdjacency not seeded — Neighborhood_Map needs an Adjacent column and Phase1-CanonHoods must run first (engine.148 P2).');
  }
  return JSON.parse(JSON.stringify(S.neighborhoodAdjacency));
}

// engine.237: one hotspot score for both passes — the two PERSISTED indices. The QoL index is not a
// Crime_Metrics column, so last cycle's rows never carry it (v1.3 read it as 50 for every hood in
// the pressure pass, 45-ish live in the hotspot pass — two different scores for one question).
function crimeHotspotScore_(m) {
  return Math.max(Number(m.propertyCrimeIndex || 0), Number(m.violentCrimeIndex || 0) * 0.95);
}

// engine.237: the hotspot bar is a ratio of the city's own median score (SIM_DOCTRINE §15). The
// absolute 70 it replaces was never crossed live, so no hood was ever a hotspot. Null when no data.
function crimeHotspotThreshold_(metricsMap, hoods) {
  var scores = [];
  for (var i = 0; i < hoods.length; i++) { var m = metricsMap[hoods[i]]; if (m) scores.push(crimeHotspotScore_(m)); }
  var med = crimeMedian_(scores);
  return med === null ? null : med * CRIME_ADVANCED.HOTSPOT_RATIO;
}

function computeHotspotPressure_(currentMetrics, adjacency, hoods) {
  var pressure = {};
  var keys = hoods || Object.keys(currentMetrics || {});
  for (var i = 0; i < keys.length; i++) pressure[keys[i]] = 0;
  var threshold = crimeHotspotThreshold_(currentMetrics || {}, keys);
  if (threshold === null) return pressure;

  for (var n = 0; n < keys.length; n++) {
    var hood = keys[n];
    var m = currentMetrics[hood];
    if (!m) continue;

    var hotspotScore = crimeHotspotScore_(m);
    if (hotspotScore < threshold) continue;

    var spill = Math.min(CRIME_ADVANCED.HOTSPOT_PRESSURE_CAP, (hotspotScore - threshold) * 0.45);
    var neighbors = (adjacency && adjacency[hood]) ? adjacency[hood] : [];
    if (neighbors.length === 0) continue;

    var per = spill * CRIME_ADVANCED.DIFFUSION_RATE / neighbors.length;
    for (var j = 0; j < neighbors.length; j++) {
      var nb = neighbors[j];
      pressure[nb] = (pressure[nb] || 0) + per;
    }
  }

  var outKeys = Object.keys(pressure);
  for (var k = 0; k < outKeys.length; k++) {
    var h = outKeys[k];
    pressure[h] = Math.max(0, Math.min(CRIME_ADVANCED.HOTSPOT_PRESSURE_CAP, pressure[h]));
  }
  return pressure;
}

function calculateCrimeHotspots_(metricsMap, adjacency) {
  var list = [];
  var neighborhoods = Object.keys(metricsMap || {});
  var threshold = crimeHotspotThreshold_(metricsMap || {}, neighborhoods);
  if (threshold === null) return list;
  for (var i = 0; i < neighborhoods.length; i++) {
    var hood = neighborhoods[i];
    var m = metricsMap[hood];
    if (!m) continue;

    var prop = Number(m.propertyCrimeIndex || 50);
    var viol = Number(m.violentCrimeIndex || 50);
    var qol = (m.qualityOfLifeIndex !== undefined) ? Number(m.qualityOfLifeIndex) : 50;

    var score = crimeHotspotScore_(m);
    if (score >= threshold) {
      list.push({
        neighborhood: hood,
        score: Math.round(score),
        mix: { property: Math.round(prop), violent: Math.round(viol), qol: Math.round(qol) },
        neighbors: (adjacency && adjacency[hood]) ? adjacency[hood] : []
      });
    }
  }

  list.sort(function(a, b) { return b.score - a.score; });
  return list.slice(0, 6);
}

function deriveReportingSignal_(input) {
  var chaos = Number(input.chaosEvents || 0);
  var celeb = Number(input.celebrationEvents || 0);
  var media = Number(input.mediaCoverage || 0);
  var seeds = Number(input.storySeedCount || 0);

  var rate = CRIME_ADVANCED.BASE_REPORTING_RATE;
  var mult = 1.0;

  var w = (input.weatherType || '').toString();
  var impact = Number(input.weatherImpact || 1);
  var precip = Number(input.precipIntensity || 0);

  if (w === 'storm' || (impact >= 1.4 && precip >= 0.45)) {
    rate = Math.max(0.25, rate - CRIME_ADVANCED.STORM_REPORTING_DROP);
    mult *= 0.92;
  }

  if (celeb > 0) {
    rate = Math.max(0.25, rate - CRIME_ADVANCED.CELEBRATION_REPORTING_DROP);
    mult *= 0.95;
  }

  if (chaos > 0) {
    rate = Math.min(0.85, rate + CRIME_ADVANCED.CHAOS_REPORTING_SURGE);
    mult *= 1.08;
  }

  if (media >= 10 || seeds >= 10) {
    rate = Math.min(0.88, rate + CRIME_ADVANCED.MEDIA_REPORTING_SURGE);
    mult *= 1.05;
  } else if (media >= 6 || seeds >= 6) {
    mult *= 1.02;
  }

  return {
    effectiveRate: Math.round(Math.max(0.2, Math.min(0.9, rate)) * 100) / 100,
    reportingMultiplier: Math.round(Math.max(0.6, Math.min(1.4, mult)) * 100) / 100
  };
}

// ============================================================================
// engine.237 — THE READER CONTRACT (S.crimeMetrics.context)
// ============================================================================
// Ten reader sites (citizen events, youth, story seeds, demographics, civic + media pools) were
// written against v1.2 field names — neighborhoodBreakdown, a city qualityOfLifeIndex on a 0–1
// scale, top-level patrolStrategy / enforcementCapacity, hotspots as hood strings — that this
// writer never emitted. Every one sat on its default every cycle: no citizen ever lived in a
// rough block. This is the one place those readers' values are made, each band relative to the
// city's own middle (SIM_DOCTRINE §15), so a reader never re-derives a scale.
//
//   byHood[hood].pressureRatio      mean(property, violent index) ÷ city median — the hood vs its city
//   byHood[hood].qualityOfLifeIndex 0.05–0.95, HIGHER = SAFER: 1 − ratio/2 (1.3× the median → 0.35,
//                                   0.7× → 0.65 — exactly the readers' existing low / high bands)
//   byHood[hood].crimeLevel         'high' ≥ PRESSURE_HIGH_RATIO, 'low' ≤ PRESSURE_LOW_RATIO, else 'moderate'
//   byHood[hood].isHotspot          on this cycle's hotspot list
//   byHood[hood].trend              'rising' / 'falling' / 'steady' — this cycle's property/violent shifts
//                                   (calculateCrimeShifts_). A hood that sits high every cycle is where it
//                                   IS; the rising cycle is the event (start → peak → end, §15).
//   city.incidentTrend              this cycle's incidents ÷ last cycle's (1 = flat)
//   city.qualityOfLifeIndex         0.05–0.95 from the trend: 1 − trend/2 (+31% → 0.35)
//   city.enforcementCapacity        police headroom: capacity units × strength ÷ this cycle's demand
//   city.reportingGap               BASE_REPORTING_RATE − this cycle's reported ÷ true (> 0 = under-
//                                   reporting against the engine's own base; the base alone sits at 0.62)
//   city.patrolStrategy / hotspotHoods / trueIncidentCount / reportedIncidentCount
function buildCrimeReaderContext_(metricsMap, hotspots, cityWide, categoryCityWide, prevIncidents, policingCapacity, patrolStrategy, shifts) {
  var hoods = Object.keys(metricsMap || {});
  var band = function(x) { return Math.round(Math.max(0.05, Math.min(0.95, x)) * 100) / 100; };
  var pressures = {};
  var list = [];
  for (var i = 0; i < hoods.length; i++) {
    var m = metricsMap[hoods[i]];
    if (!m) continue;
    pressures[hoods[i]] = (Number(m.propertyCrimeIndex || 0) + Number(m.violentCrimeIndex || 0)) / 2;
    list.push(pressures[hoods[i]]);
  }
  var med = crimeMedian_(list);
  var hotSet = {};
  var hotspotHoods = [];
  for (var h = 0; h < (hotspots || []).length; h++) {
    if (hotspots[h] && hotspots[h].neighborhood) { hotSet[hotspots[h].neighborhood] = true; hotspotHoods.push(hotspots[h].neighborhood); }
  }
  var moved = {};
  for (var sI = 0; sI < (shifts || []).length; sI++) {
    var sh = shifts[sI];
    if (!sh || (sh.metric !== 'propertyCrime' && sh.metric !== 'violentCrime')) continue;
    moved[sh.neighborhood] = (moved[sh.neighborhood] || 0) + (sh.direction === 'increase' ? 1 : -1);
  }
  var byHood = {};
  for (var k = 0; k < hoods.length; k++) {
    var hood = hoods[k];
    if (pressures[hood] === undefined) continue;
    var r = med ? pressures[hood] / med : 1;
    byHood[hood] = {
      pressureRatio: Math.round(r * 100) / 100,
      qualityOfLifeIndex: band(1 - r / 2),
      crimeLevel: r >= CRIME_ADVANCED.PRESSURE_HIGH_RATIO ? 'high' : (r <= CRIME_ADVANCED.PRESSURE_LOW_RATIO ? 'low' : 'moderate'),
      isHotspot: !!hotSet[hood],
      trend: moved[hood] > 0 ? 'rising' : (moved[hood] < 0 ? 'falling' : 'steady')
    };
  }
  var total = Number((cityWide && cityWide.totalIncidents) || 0);
  var prev = Number(prevIncidents || 0);
  var trend = prev > 0 ? total / prev : 1;
  var demand = total * CRIME_ADVANCED.UNITS_PER_INCIDENT;
  var capacity = Number((policingCapacity && policingCapacity.unitsCity) || 0) * Number((policingCapacity && policingCapacity.strength) || 1);
  var cat = categoryCityWide || {};
  var trueN = Number(cat.totalTrueIncidents || total);
  var reportedN = Number(cat.totalReportedIncidents || 0);
  return {
    byHood: byHood,
    city: {
      incidentTrend: Math.round(trend * 100) / 100,
      qualityOfLifeIndex: band(1 - trend / 2),
      enforcementCapacity: demand > 0 ? Math.round(Math.min(3, capacity / demand) * 100) / 100 : 3,
      patrolStrategy: (patrolStrategy && patrolStrategy.name) || 'balanced',
      hotspotHoods: hotspotHoods,
      trueIncidentCount: trueN,
      reportedIncidentCount: reportedN,
      reportingGap: trueN > 0 ? Math.round((CRIME_ADVANCED.BASE_REPORTING_RATE - reportedN / trueN) * 100) / 100 : 0
    }
  };
}

// engine.237: capacity is sized to the simulated city — UNITS_PER_HOOD × the hoods the cycle iterates
// (a config unitsCity still overrides, clamped as before). The unused S / patrolStrategy params are gone.
function derivePolicingCapacity_(cfg, hoodCount) {
  var strength = (cfg && cfg.strength !== undefined) ? Number(cfg.strength) : 1.0;
  strength = Math.max(0.6, Math.min(1.4, strength));

  var unitsCity = (cfg && cfg.unitsCity !== undefined)
    ? Math.max(12, Math.min(90, Number(cfg.unitsCity)))
    : CRIME_ADVANCED.UNITS_PER_HOOD * Math.max(1, Number(hoodCount) || 0);

  var shareMap = (cfg && cfg.neighborhoodShare && typeof cfg.neighborhoodShare === 'object') ? cfg.neighborhoodShare : null;
  var defaultShare = 1 / 12;

  var neighborhoodShare = {};
  if (shareMap) {
    var keys = Object.keys(shareMap);
    var sum = 0;
    for (var i = 0; i < keys.length; i++) sum += Number(shareMap[keys[i]] || 0);
    if (sum > 0) {
      for (var j = 0; j < keys.length; j++) {
        neighborhoodShare[keys[j]] = Number(shareMap[keys[j]] || 0) / sum;
      }
      defaultShare = 0.04;
    }
  }

  return {
    strength: strength,
    unitsCity: unitsCity,
    neighborhoodShare: neighborhoodShare,
    defaultNeighborhoodShare: defaultShare
  };
}

function computeCityEnforcementLoad_(policingCapacity, predictedCityIncidents) {
  var units = Number(policingCapacity.unitsCity) || 0;
  var demand = Math.max(0, Number(predictedCityIncidents || 0)) * CRIME_ADVANCED.UNITS_PER_INCIDENT;
  var ratio = (units <= 0) ? 1 : (demand / units);
  return {
    predictedIncidents: Math.round(predictedCityIncidents || 0),
    demandUnits: Math.round(demand * 100) / 100,
    capacityUnits: units,
    loadRatio: clamp01_(ratio)
  };
}

function updateCrimeLagState_(S, demographics, neighborhoodDynamics) {
  var lag = S.crimeLag;
  if (!lag.historyByNeighborhood) lag.historyByNeighborhood = {};

  var hoods = crimeIterationHoods_(S); // engine.134 Task 4
  for (var i = 0; i < hoods.length; i++) {
    var hood = hoods[i];
    if (!lag.historyByNeighborhood[hood]) lag.historyByNeighborhood[hood] = [];

    var demo = demographics[hood] || {};
    var totalPop = (demo.students || 0) + (demo.adults || 0) + (demo.seniors || 0);
    var unemploymentRate = totalPop > 0 ? ((demo.unemployed || 0) / totalPop) : 0.08;

    var nd = neighborhoodDynamics[hood] || {};
    var strain = 0;
    if (nd.traffic >= 1.3) strain += 0.08;
    if (nd.nightlife >= 1.3) strain += 0.06;
    if (nd.publicSpaces >= 1.3) strain += 0.04;

    var economicStress = clamp01_((unemploymentRate - 0.05) * 4 + strain);

    lag.historyByNeighborhood[hood].push({
      unemploymentRate: unemploymentRate,
      economicStress: economicStress
    });

    if (lag.historyByNeighborhood[hood].length > lag.window) {
      lag.historyByNeighborhood[hood].shift();
    }
  }
}

function getNeighborhoodLag_(S, neighborhood) {
  var lag = S.crimeLag;
  if (!lag || !lag.historyByNeighborhood || !lag.historyByNeighborhood[neighborhood]) {
    return { economicStressLag: 0 };
  }

  var arr = lag.historyByNeighborhood[neighborhood];
  var lagCycles = Number(lag.econLagCycles || CRIME_ADVANCED.ECON_LAG_CYCLES);

  if (arr.length >= (lagCycles + 1)) {
    var idx = arr.length - 1 - lagCycles;
    var v = arr[idx] ? Number(arr[idx].economicStress || 0) : 0;
    return { economicStressLag: clamp01_(v) };
  }

  var sum = 0;
  for (var i = 0; i < arr.length; i++) sum += Number(arr[i].economicStress || 0);
  var avg = (arr.length > 0) ? (sum / arr.length) : 0;
  return { economicStressLag: clamp01_(avg) };
}

/**
 * ============================================================================
 * CRIME METRICS REFERENCE v1.2
 * ============================================================================
 *
 * v1.2 Changes:
 * - qualityOfLifeIndex: Third crime category for minor disorder
 * - Reporting model: reportedIncidentCount vs trueIncidentCount
 * - Spillover diffusion: Hotspots leak pressure to neighbors
 * - Enforcement capacity: policingCapacity, cityLoad, overload penalties
 * - Lagged economic stress: 2-3 cycle delay on property/QoL crime
 * - Patrol strategy input: suppress_hotspots vs community_presence vs balanced
 * - Weather v3.5 integration: precipitationIntensity, windSpeed
 * - neighborhoodDynamics integration: nightlife/traffic/publicSpaces strain
 * - clusterDefinitions integration: adjacency from applyCityDynamics v2.6
 *
 * Patrol Strategies:
 * - suppress_hotspots: Higher displacement, better clearance, no QoL focus
 * - community_presence: Lower displacement, modest clearance, reduces QoL issues
 * - balanced: Default, no special modifiers
 *
 * Set via ctx.config.patrolStrategy = 'suppress_hotspots' or 'community_presence'
 *
 * Preserved:
 * - propertyCrimeIndex, violentCrimeIndex, responseTimeAvg, clearanceRate, incidentCount
 *
 * ============================================================================
 */
