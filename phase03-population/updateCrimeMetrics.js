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
 * @version 1.2 (additive; CRIME_UPDATE_VERSION remains compatible)
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

  CLEARANCE_DECAY: 0.02,
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
  HOTSPOT_THRESHOLD: 70,
  HOTSPOT_PRESSURE_CAP: 18,

  // Enforcement capacity
  BASE_UNITS_CITY: 36,
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
var DEFAULT_NEIGHBORHOOD_ADJACENCY = {
  'Downtown': ['Uptown', 'Chinatown', 'Lake Merritt', 'Jack London'],
  'Uptown': ['Downtown', 'KONO', 'Temescal', 'Lake Merritt'],
  'KONO': ['Uptown', 'Downtown', 'Lake Merritt', 'Temescal'],
  'Chinatown': ['Downtown', 'Lake Merritt', 'KONO'],
  'Lake Merritt': ['Downtown', 'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave'],
  'Jack London': ['Downtown', 'West Oakland'],
  'West Oakland': ['Jack London', 'Downtown'],
  'Rockridge': ['Temescal', 'Piedmont Ave'],
  'Temescal': ['Uptown', 'KONO', 'Rockridge'],
  'Piedmont Ave': ['Lake Merritt', 'Rockridge'],
  'Fruitvale': ['Laurel', 'Lake Merritt'],
  'Laurel': ['Fruitvale']
};

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

  for (var e = 0; e < worldEvents.length; e++) {
    var evt = worldEvents[e] || {};
    var domain = (evt.domain || evt._domain || '').toString().toUpperCase();
    if (domain === 'CHAOS' || domain === 'CRIME') chaosEvents++;
    else if (domain === 'CELEBRATION' || domain === 'FESTIVAL') celebrationEvents++;
  }

  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

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
  var policingCapacity = derivePolicingCapacity_(S, enforcementCfg, patrolStrategy);

  // Calculate new metrics
  var newMetrics = {};
  var neighborhoods = Object.keys(NEIGHBORHOOD_CRIME_PROFILES);

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

  // Precompute hotspot pressure from previous cycle
  var hotspotPressure = computeHotspotPressure_(currentMetrics, adjacency);

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
    var profile = NEIGHBORHOOD_CRIME_PROFILES[hood];
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
        celebration: celebrationEvents,
        mediaCoverage: mediaCoverage,
        storySeedCount: storySeeds.length
      },
      {
        reportingSignal: reportingSignal,
        hotspotPressure: hotspotPressure[hood] || 0,
        adjacency: adjacency,
        lag: getNeighborhoodLag_(S, hood),
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

  // Summary
  S.crimeMetrics = {
    updated: true,
    cycle: cycle,
    cityWide: cityWide,
    shifts: shifts,
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

function calculateNeighborhoodCrime_(neighborhood, profile, demo, prev, context, events, advanced, rng) {
  // Legacy base values
  var baseProperty = 50 * profile.propertyCrimeMod;
  var baseViolent = 50 * profile.violentCrimeMod;
  var baseResponse = 8 / profile.responseMod;
  var baseClearance = 0.35 * profile.responseMod;
  var baseIncidents = profile.baseIncidents;

  // QoL baseline (fallback if profile doesn't have it)
  var baseQoL = 50 * (profile.qualityOfLifeMod || CRIME_ADVANCED.QOL_BASE_MOD);

  // Demographics
  var totalPop = (demo.students || 0) + (demo.adults || 0) + (demo.seniors || 0);
  var unemploymentRate = totalPop > 0 ? ((demo.unemployed || 0) / totalPop) : 0.08;
  var youthRatio = totalPop > 0 ? ((demo.students || 0) / totalPop) : 0.2;

  // Unemployment impacts
  if (unemploymentRate > CRIME_FACTORS.UNEMPLOYMENT_THRESHOLD) {
    var excessUnemployment = unemploymentRate - CRIME_FACTORS.UNEMPLOYMENT_THRESHOLD;
    baseProperty *= (1 + (excessUnemployment / 0.05) * (CRIME_FACTORS.UNEMPLOYMENT_CRIME_FACTOR - 1));
    baseQoL *= (1 + (excessUnemployment / 0.05) * (CRIME_ADVANCED.QOL_UNEMPLOYMENT_SENS));
  }

  // Youth ratio
  if (youthRatio > 0.3) {
    baseViolent *= (1 + (youthRatio - 0.3) * 0.5);
    baseQoL *= (1 + (youthRatio - 0.3) * 0.25);
  }

  // Sentiment impacts
  if (context.sentiment < CRIME_FACTORS.SENTIMENT_THRESHOLD) {
    var sentimentGap = CRIME_FACTORS.SENTIMENT_THRESHOLD - context.sentiment;
    baseProperty *= (1 + sentimentGap * CRIME_FACTORS.SENTIMENT_CRIME_FACTOR * 10);
    baseQoL *= (1 + sentimentGap * CRIME_ADVANCED.QOL_SENTIMENT_SENS * 10);
  }

  // Weather impacts
  var w = (context.weather || '').toString();
  var precipIntensity = (context.precipIntensity === 0 || context.precipIntensity) ? Number(context.precipIntensity) : 0;
  var windSpeed = (context.windSpeed === 0 || context.windSpeed) ? Number(context.windSpeed) : 5;

  var severe = (context.weatherImpact >= 1.4);
  if (w === 'storm' || (severe && precipIntensity >= 0.45)) {
    baseProperty *= (1 - CRIME_FACTORS.STORM_CRIME_REDUCTION);
    baseViolent *= (1 - CRIME_FACTORS.STORM_CRIME_REDUCTION);
    baseQoL *= (1 - Math.min(0.22, CRIME_ADVANCED.QOL_WEATHER_SENS + precipIntensity * 0.15));
    baseIncidents = Math.floor(baseIncidents * 0.72);
  } else if (w === 'heatwave' || w === 'hot') {
    baseViolent *= (1 + Math.max(CRIME_FACTORS.HEATWAVE_CRIME_INCREASE, CRIME_ADVANCED.VIOLENT_HEAT_SENS));
    baseQoL *= 1.05;
    baseIncidents = Math.ceil(baseIncidents * 1.10);
  }
  if (windSpeed >= 30) {
    baseIncidents = Math.max(0, Math.floor(baseIncidents * 0.96));
    baseQoL *= 0.98;
  }

  // Seasonal impact
  var seasonMod = 1.0;
  var s = (context.season || '').toString().toLowerCase();
  if (s === 'summer') seasonMod = CRIME_FACTORS.SUMMER_CRIME_MOD;
  else if (s === 'winter') seasonMod = CRIME_FACTORS.WINTER_CRIME_MOD;
  baseProperty *= seasonMod;
  baseViolent *= seasonMod;
  baseQoL *= (1 + (seasonMod - 1) * 0.6);

  // Events
  if (events.chaos > 0) {
    baseProperty *= (1 + events.chaos * CRIME_FACTORS.CHAOS_CRIME_INCREASE);
    baseViolent *= (1 + events.chaos * CRIME_FACTORS.CHAOS_CRIME_INCREASE * 0.5);
    baseQoL *= (1 + events.chaos * 0.12);
    baseIncidents += events.chaos * 2;
  }
  if (events.celebration > 0) {
    baseProperty *= (1 + events.celebration * CRIME_FACTORS.CELEBRATION_CRIME_INCREASE);
    baseQoL *= (1 + events.celebration * CRIME_ADVANCED.QOL_CELEBRATION_SENS * 0.08);
    baseIncidents += events.celebration;
  }

  // Lagged economic stress
  var lag = advanced && advanced.lag ? advanced.lag : null;
  if (lag) {
    var econStressLag = Number(lag.economicStressLag || 0);
    baseProperty *= (1 + econStressLag * CRIME_ADVANCED.PROPERTY_ECON_STRESS_LAG_SENS);
    baseQoL *= (1 + econStressLag * CRIME_ADVANCED.QOL_ECON_STRESS_LAG_SENS);
  }

  // Hotspot spillover diffusion
  var pressure = Number((advanced && advanced.hotspotPressure) || 0);
  if (pressure > 0) {
    baseProperty += pressure * 0.55;
    baseViolent += pressure * 0.30;
    baseQoL += pressure * 0.65;
    baseIncidents += Math.round(pressure / 6);
  }

  // Neighborhood dynamics feedback
  var nd = context.neighborhoodDynamics || {};
  if (nd && typeof nd === 'object') {
    var nightlife = (nd.nightlife === 0 || nd.nightlife) ? Number(nd.nightlife) : 1;
    var publicSpaces = (nd.publicSpaces === 0 || nd.publicSpaces) ? Number(nd.publicSpaces) : 1;
    var traffic = (nd.traffic === 0 || nd.traffic) ? Number(nd.traffic) : 1;

    if (nightlife >= 1.3) {
      baseQoL *= 1.06;
      baseViolent *= 1.03;
      baseIncidents += 1;
    }
    if (publicSpaces >= 1.3) {
      baseProperty *= 1.03;
      baseQoL *= 1.03;
    }
    if (traffic >= 1.3) {
      baseProperty *= 1.02;
      baseIncidents += 1;
    }
  }

  // Momentum
  if (prev) {
    baseProperty = prev.propertyCrimeIndex * 0.7 + baseProperty * 0.3;
    baseViolent = prev.violentCrimeIndex * 0.7 + baseViolent * 0.3;

    if (prev.qualityOfLifeIndex !== undefined) {
      baseQoL = Number(prev.qualityOfLifeIndex) * 0.7 + baseQoL * 0.3;
    } else {
      baseQoL = 50 * 0.7 + baseQoL * 0.3;
    }

    var clearanceDir = (rng() > 0.5) ? 1 : -1;
    var clearanceChange = clearanceDir * rng() * CRIME_FACTORS.CLEARANCE_RECOVERY;
    baseClearance = (prev.clearanceRate || baseClearance) + clearanceChange;
  }

  // Random variance
  baseProperty += (rng() - 0.5) * 6;
  baseViolent += (rng() - 0.5) * 4;
  baseQoL += (rng() - 0.5) * 6;
  baseResponse += (rng() - 0.5) * CRIME_FACTORS.RESPONSE_TIME_VARIANCE;
  baseIncidents += Math.round((rng() - 0.5) * 4);

  // Enforcement capacity + displacement
  var policingCapacity = advanced && advanced.policingCapacity ? advanced.policingCapacity : derivePolicingCapacity_({}, {}, { name: 'balanced' });
  var cityLoad = advanced && advanced.cityLoad ? advanced.cityLoad : { loadRatio: 0.5 };
  var patrolStrategy = advanced && advanced.patrolStrategy ? advanced.patrolStrategy : { name: 'balanced', displacementMult: 1.0, clearanceMult: 1.0, qolReduction: 0 };

  var loadProxy = Math.max(0, baseIncidents) * CRIME_ADVANCED.UNITS_PER_INCIDENT;
  var enforcementShare = clamp01_(policingCapacity.neighborhoodShare[neighborhood] || policingCapacity.defaultNeighborhoodShare);
  var enforcementPower = clamp01_(enforcementShare * policingCapacity.strength);

  // Overload penalties
  var overload = clamp01_(cityLoad.loadRatio);
  baseResponse += overload * CRIME_ADVANCED.OVERLOAD_RESPONSE_PENALTY;
  baseClearance -= overload * CRIME_ADVANCED.OVERLOAD_CLEARANCE_PENALTY;

  // Enforcement improves clearance (modified by strategy)
  baseClearance += enforcementPower * CRIME_ADVANCED.ENFORCEMENT_BOOST_CLEARANCE * patrolStrategy.clearanceMult;
  baseProperty *= (1 - enforcementPower * 0.06);
  baseQoL *= (1 - enforcementPower * 0.07);

  // Community presence strategy reduces QoL issues specifically
  baseQoL *= (1 - patrolStrategy.qolReduction);

  // Displacement (modified by strategy)
  var displacement = enforcementPower * CRIME_ADVANCED.DISPLACEMENT_RATE * patrolStrategy.displacementMult;
  baseProperty *= (1 - displacement * 0.4);
  baseQoL *= (1 - displacement * 0.5);

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
    incidentCount: Math.max(0, trueIncidents)
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
    econStressLag: lag ? Math.round(Number(lag.economicStressLag || 0) * 100) / 100 : 0
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
// CRIME EVENT GENERATION
// ============================================================================

function generateCrimeEvents_(ctx) {
  var ss = ctx.ss;
  var S = ctx.summary || {};
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  var metrics = {};
  if (typeof getCrimeMetrics_ === 'function') {
    metrics = getCrimeMetrics_(ss);
  }

  var events = [];
  var neighborhoods = Object.keys(metrics);

  var PROPERTY_EVENTS = [
    'car break-ins reported near $LOCATION',
    'package theft pattern in $LOCATION',
    'overnight business break-in in $LOCATION',
    'converter thefts noted around $LOCATION',
    'storefront vandalism reported in $LOCATION'
  ];

  var VIOLENT_EVENTS = [
    'altercation reported at a $LOCATION intersection',
    'robbery report near $LOCATION transit stop',
    'assault investigation underway in $LOCATION'
  ];

  var QOL_EVENTS = [
    'noise complaints rise in $LOCATION after late-night activity',
    'street-level disorder reports increase in $LOCATION',
    'graffiti cleanup crews active in $LOCATION',
    'public nuisance calls tick up in $LOCATION',
    'minor disputes draw attention in $LOCATION'
  ];

  var SAFETY_EVENTS = [
    'neighborhood watch expands in $LOCATION',
    'community safety meeting scheduled for $LOCATION',
    'crime prevention workshop draws a crowd in $LOCATION',
    '$LOCATION residents organize a block safety patrol'
  ];

  for (var i = 0; i < neighborhoods.length; i++) {
    var hood = neighborhoods[i];
    var m = metrics[hood];

    if (m.propertyCrimeIndex > 65 && rng() < 0.3) {
      var propEvent = PROPERTY_EVENTS[Math.floor(rng() * PROPERTY_EVENTS.length)];
      events.push({
        description: propEvent.replace('$LOCATION', hood),
        severity: m.propertyCrimeIndex > 80 ? 'medium' : 'low',
        domain: 'CRIME',
        neighborhood: hood,
        subtype: 'property'
      });
    }

    if (m.violentCrimeIndex > 70 && rng() < 0.12) {
      var violEvent = VIOLENT_EVENTS[Math.floor(rng() * VIOLENT_EVENTS.length)];
      events.push({
        description: violEvent.replace('$LOCATION', hood),
        severity: 'medium',
        domain: 'CRIME',
        neighborhood: hood,
        subtype: 'violent'
      });
    }

    // QoL triggers (lighter, CIVIC domain)
    var qol = (m.qualityOfLifeIndex !== undefined) ? Number(m.qualityOfLifeIndex) : 50;
    if (qol > 62 && rng() < 0.22) {
      var qolEvent = QOL_EVENTS[Math.floor(rng() * QOL_EVENTS.length)];
      events.push({
        description: qolEvent.replace('$LOCATION', hood),
        severity: qol > 78 ? 'medium' : 'low',
        domain: 'CIVIC',
        neighborhood: hood,
        subtype: 'quality_of_life'
      });
    }

    if (m.propertyCrimeIndex < 40 && m.violentCrimeIndex < 40 && rng() < 0.2) {
      var safeEvent = SAFETY_EVENTS[Math.floor(rng() * SAFETY_EVENTS.length)];
      events.push({
        description: safeEvent.replace('$LOCATION', hood),
        severity: 'low',
        domain: 'COMMUNITY',
        neighborhood: hood,
        subtype: 'safety_positive'
      });
    }
  }

  return events;
}

// ============================================================================
// STORY SIGNALS
// ============================================================================

function getCrimeStorySignals_(ctx) {
  var S = ctx.summary || {};
  var crimeData = S.crimeMetrics || {};
  var shifts = crimeData.shifts || [];
  var cityWide = crimeData.cityWide || {};
  var categoryCityWide = crimeData.categoryCityWide || {};

  var signals = [];

  for (var i = 0; i < shifts.length; i++) {
    var shift = shifts[i];

    if (shift.metric === 'propertyCrime' && shift.magnitude >= 8) {
      signals.push({
        type: 'crime_shift',
        priority: shift.magnitude >= 12 ? 3 : 2,
        headline: shift.direction === 'increase'
          ? shift.neighborhood + ' sees property crime spike'
          : shift.neighborhood + ' property crime drops',
        neighborhood: shift.neighborhood,
        data: shift
      });
    }

    if (shift.metric === 'violentCrime' && shift.magnitude >= 6) {
      signals.push({
        type: 'crime_shift',
        priority: 3,
        headline: shift.direction === 'increase'
          ? 'Safety concerns rise in ' + shift.neighborhood
          : shift.neighborhood + ' reports improved safety',
        neighborhood: shift.neighborhood,
        data: shift
      });
    }

    if (shift.metric === 'responseTime' && shift.magnitude >= 2) {
      signals.push({
        type: 'public_safety',
        priority: 2,
        headline: shift.direction === 'slower'
          ? 'Emergency response times lengthen in ' + shift.neighborhood
          : shift.neighborhood + ' sees faster emergency response',
        neighborhood: shift.neighborhood,
        data: shift
      });
    }
  }

  if (cityWide.avgPropertyCrime > 65) {
    signals.push({
      type: 'citywide_crime',
      priority: 3,
      headline: 'Oakland property crime index elevated',
      data: cityWide
    });
  }

  if (cityWide.totalIncidents > 80) {
    signals.push({
      type: 'incident_volume',
      priority: 2,
      headline: 'High incident volume across Oakland this cycle',
      data: cityWide
    });
  }

  // QoL signal
  if (categoryCityWide.avgQualityOfLife && categoryCityWide.avgQualityOfLife > 62) {
    signals.push({
      type: 'quality_of_life',
      priority: 2,
      headline: 'Quality-of-life complaints trending upward citywide',
      data: categoryCityWide
    });
  }

  // Hotspot signal
  var hotspots = crimeData.hotspots || [];
  if (hotspots.length >= 2) {
    signals.push({
      type: 'hotspot_pattern',
      priority: 2,
      headline: 'Multiple neighborhoods show hotspot pressure this cycle',
      data: { hotspots: hotspots }
    });
  }

  return signals;
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
  if (S && S.neighborhoodAdjacency && typeof S.neighborhoodAdjacency === 'object') {
    return JSON.parse(JSON.stringify(S.neighborhoodAdjacency));
  }

  // Use clusterDefinitions from applyCityDynamics v2.6 if available
  var clusters = S && (S.clusterDefinitions || S.clusterDefs);
  if (clusters && typeof clusters === 'object') {
    var g = {};
    for (var ck in clusters) {
      if (!clusters.hasOwnProperty(ck)) continue;
      var hoods = (clusters[ck] && clusters[ck].neighborhoods) ? clusters[ck].neighborhoods : [];
      for (var i = 0; i < hoods.length; i++) {
        var a = hoods[i];
        if (!g[a]) g[a] = [];
        for (var j = 0; j < hoods.length; j++) {
          if (i === j) continue;
          if (g[a].indexOf(hoods[j]) === -1) g[a].push(hoods[j]);
        }
      }
      // Also add adjacent clusters
      var adjacent = (clusters[ck] && clusters[ck].adjacent) ? clusters[ck].adjacent : [];
      for (var ai = 0; ai < adjacent.length; ai++) {
        var adjCluster = adjacent[ai];
        var adjHoods = (clusters[adjCluster] && clusters[adjCluster].neighborhoods) ? clusters[adjCluster].neighborhoods : [];
        for (var hi = 0; hi < hoods.length; hi++) {
          if (!g[hoods[hi]]) g[hoods[hi]] = [];
          for (var ahi = 0; ahi < adjHoods.length; ahi++) {
            if (g[hoods[hi]].indexOf(adjHoods[ahi]) === -1) g[hoods[hi]].push(adjHoods[ahi]);
          }
        }
      }
    }
    // Merge with default
    for (var k in DEFAULT_NEIGHBORHOOD_ADJACENCY) {
      if (!DEFAULT_NEIGHBORHOOD_ADJACENCY.hasOwnProperty(k)) continue;
      if (!g[k]) g[k] = [];
      var arr = DEFAULT_NEIGHBORHOOD_ADJACENCY[k];
      for (var x = 0; x < arr.length; x++) if (g[k].indexOf(arr[x]) === -1) g[k].push(arr[x]);
    }
    return g;
  }

  return JSON.parse(JSON.stringify(DEFAULT_NEIGHBORHOOD_ADJACENCY));
}

function computeHotspotPressure_(currentMetrics, adjacency) {
  var pressure = {};
  var keys = Object.keys(currentMetrics || {});
  for (var i = 0; i < keys.length; i++) pressure[keys[i]] = 0;

  for (var n = 0; n < keys.length; n++) {
    var hood = keys[n];
    var m = currentMetrics[hood];
    if (!m) continue;

    var prop = Number(m.propertyCrimeIndex || 50);
    var viol = Number(m.violentCrimeIndex || 50);
    var qol = (m.qualityOfLifeIndex !== undefined) ? Number(m.qualityOfLifeIndex) : 50;

    var hotspotScore = Math.max(prop, (viol * 0.95), qol);
    if (hotspotScore < CRIME_ADVANCED.HOTSPOT_THRESHOLD) continue;

    var spill = Math.min(CRIME_ADVANCED.HOTSPOT_PRESSURE_CAP, (hotspotScore - CRIME_ADVANCED.HOTSPOT_THRESHOLD) * 0.45);
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
  for (var i = 0; i < neighborhoods.length; i++) {
    var hood = neighborhoods[i];
    var m = metricsMap[hood];
    if (!m) continue;

    var prop = Number(m.propertyCrimeIndex || 50);
    var viol = Number(m.violentCrimeIndex || 50);
    var qol = (m.qualityOfLifeIndex !== undefined) ? Number(m.qualityOfLifeIndex) : 50;

    var score = Math.max(prop, viol, qol);
    if (score >= CRIME_ADVANCED.HOTSPOT_THRESHOLD) {
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

function derivePolicingCapacity_(S, cfg, patrolStrategy) {
  var strength = (cfg && cfg.strength !== undefined) ? Number(cfg.strength) : 1.0;
  strength = Math.max(0.6, Math.min(1.4, strength));

  var unitsCity = (cfg && cfg.unitsCity !== undefined) ? Number(cfg.unitsCity) : CRIME_ADVANCED.BASE_UNITS_CITY;
  unitsCity = Math.max(12, Math.min(90, unitsCity));

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
  var units = Number(policingCapacity.unitsCity || CRIME_ADVANCED.BASE_UNITS_CITY);
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

  var hoods = Object.keys(NEIGHBORHOOD_CRIME_PROFILES);
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
