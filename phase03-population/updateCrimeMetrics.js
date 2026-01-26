/**
 * updateCrimeMetrics.js
 *
 * Phase 3 engine: Updates crime metrics per neighborhood each cycle.
 *
 * Crime is influenced by:
 * - Demographic factors (unemployment, population density, youth ratio)
 * - World events (civic unrest, celebrations)
 * - Weather (extreme weather affects crime patterns)
 * - City sentiment (poor sentiment correlates with property crime)
 * - Seasonal factors (crime rates vary by season)
 *
 * @version 1.0
 * @tier 6.1
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var CRIME_UPDATE_VERSION = '1.0';

// Crime adjustment factors
var CRIME_FACTORS = {
  // Unemployment above 10% increases property crime
  UNEMPLOYMENT_THRESHOLD: 0.10,
  UNEMPLOYMENT_CRIME_FACTOR: 1.5, // +50% property crime per 5% above threshold

  // Sentiment below -0.3 increases crime
  SENTIMENT_THRESHOLD: -0.3,
  SENTIMENT_CRIME_FACTOR: 0.2, // +20% property crime per 0.1 below threshold

  // Weather impacts
  STORM_CRIME_REDUCTION: 0.3, // 30% less crime during storms
  HEATWAVE_CRIME_INCREASE: 0.15, // 15% more violent crime during heatwaves

  // Seasonal modifiers
  SUMMER_CRIME_MOD: 1.1, // 10% more crime in summer
  WINTER_CRIME_MOD: 0.9, // 10% less crime in winter

  // Event-driven modifiers
  CELEBRATION_CRIME_INCREASE: 0.1, // 10% more property crime during celebrations
  CHAOS_CRIME_INCREASE: 0.25, // 25% more crime during chaos events

  // Response time variability
  RESPONSE_TIME_VARIANCE: 1.5, // +/- 1.5 minutes random variance

  // Clearance rate factors
  CLEARANCE_DECAY: 0.02, // 2% decay per cycle if no improvements
  CLEARANCE_RECOVERY: 0.03 // 3% improvement possible per cycle
};

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Update crime metrics for all neighborhoods.
 * Called during Phase 3 (population).
 *
 * @param {Object} ctx - Engine context
 */
function updateCrimeMetrics_Phase3_(ctx) {
  var ss = ctx.ss;
  var S = ctx.summary || {};
  var cycle = S.absoluteCycle || 0;

  // Ensure schema exists
  if (typeof ensureCrimeMetricsSchema_ === 'function') {
    ensureCrimeMetricsSchema_(ss);
  }

  // Get current metrics
  var currentMetrics = {};
  if (typeof getCrimeMetrics_ === 'function') {
    currentMetrics = getCrimeMetrics_(ss);
  }

  // Get demographics for correlation
  var demographics = {};
  if (typeof getNeighborhoodDemographics_ === 'function') {
    demographics = getNeighborhoodDemographics_(ss);
  }

  // Get weather impact
  var weather = S.weather || {};
  var weatherType = weather.type || 'clear';
  var weatherImpact = weather.impact || 1.0;

  // Get city sentiment
  var cityDynamics = S.cityDynamics || {};
  var sentiment = cityDynamics.sentiment || 0;

  // Get season
  var season = S.season || 'spring';

  // Get recent world events for chaos/celebration detection
  var worldEvents = S.worldEvents || [];
  var chaosEvents = 0;
  var celebrationEvents = 0;

  for (var e = 0; e < worldEvents.length; e++) {
    var evt = worldEvents[e];
    var domain = (evt.domain || evt._domain || '').toUpperCase();
    if (domain === 'CHAOS' || domain === 'CRIME') {
      chaosEvents++;
    } else if (domain === 'CELEBRATION' || domain === 'FESTIVAL') {
      celebrationEvents++;
    }
  }

  // RNG for variance
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  // Calculate new metrics for each neighborhood
  var newMetrics = {};
  var neighborhoods = Object.keys(NEIGHBORHOOD_CRIME_PROFILES);

  for (var i = 0; i < neighborhoods.length; i++) {
    var hood = neighborhoods[i];
    var profile = NEIGHBORHOOD_CRIME_PROFILES[hood];
    var demo = demographics[hood] || {};
    var prev = currentMetrics[hood] || null;

    newMetrics[hood] = calculateNeighborhoodCrime_(
      hood, profile, demo, prev,
      { weather: weatherType, sentiment: sentiment, season: season },
      { chaos: chaosEvents, celebration: celebrationEvents },
      rng
    );
  }

  // Calculate shifts for story signals
  var shifts = [];
  if (typeof calculateCrimeShifts_ === 'function' && Object.keys(currentMetrics).length > 0) {
    shifts = calculateCrimeShifts_(currentMetrics, newMetrics);
  }

  // Store shifts in summary for Phase 6 analysis
  S.crimeMetrics = {
    updated: true,
    cycle: cycle,
    cityWide: calculateCityWideFromMap_(newMetrics),
    shifts: shifts,
    factors: {
      weather: weatherType,
      sentiment: sentiment,
      season: season,
      chaosEvents: chaosEvents,
      celebrationEvents: celebrationEvents
    }
  };

  // Batch update all neighborhoods
  if (typeof batchUpdateCrimeMetrics_ === 'function') {
    batchUpdateCrimeMetrics_(ctx, newMetrics);
  }

  return newMetrics;
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate crime metrics for a single neighborhood.
 *
 * @param {string} neighborhood
 * @param {Object} profile - NEIGHBORHOOD_CRIME_PROFILES entry
 * @param {Object} demo - Demographics data
 * @param {Object|null} prev - Previous metrics
 * @param {Object} context - { weather, sentiment, season }
 * @param {Object} events - { chaos, celebration }
 * @param {Function} rng - Random number generator
 * @return {Object} New metrics
 */
function calculateNeighborhoodCrime_(neighborhood, profile, demo, prev, context, events, rng) {
  // Start with base profile values
  var baseProperty = 50 * profile.propertyCrimeMod;
  var baseViolent = 50 * profile.violentCrimeMod;
  var baseResponse = 8 / profile.responseMod;
  var baseClearance = 0.35 * profile.responseMod;
  var baseIncidents = profile.baseIncidents;

  // === Demographic Factors ===

  // Calculate unemployment rate
  var totalPop = (demo.students || 0) + (demo.adults || 0) + (demo.seniors || 0);
  var unemploymentRate = totalPop > 0 ? ((demo.unemployed || 0) / totalPop) : 0.08;

  // Unemployment impact on property crime
  if (unemploymentRate > CRIME_FACTORS.UNEMPLOYMENT_THRESHOLD) {
    var excessUnemployment = unemploymentRate - CRIME_FACTORS.UNEMPLOYMENT_THRESHOLD;
    baseProperty *= (1 + (excessUnemployment / 0.05) * (CRIME_FACTORS.UNEMPLOYMENT_CRIME_FACTOR - 1));
  }

  // Youth ratio impact (youth correlates with some crime types)
  var youthRatio = totalPop > 0 ? ((demo.students || 0) / totalPop) : 0.2;
  if (youthRatio > 0.3) {
    baseViolent *= (1 + (youthRatio - 0.3) * 0.5); // Up to +10% violent crime in high-youth areas
  }

  // === City Sentiment Impact ===
  if (context.sentiment < CRIME_FACTORS.SENTIMENT_THRESHOLD) {
    var sentimentGap = CRIME_FACTORS.SENTIMENT_THRESHOLD - context.sentiment;
    baseProperty *= (1 + sentimentGap * CRIME_FACTORS.SENTIMENT_CRIME_FACTOR * 10);
  }

  // === Weather Impact ===
  if (context.weather === 'storm') {
    baseProperty *= (1 - CRIME_FACTORS.STORM_CRIME_REDUCTION);
    baseViolent *= (1 - CRIME_FACTORS.STORM_CRIME_REDUCTION);
    baseIncidents = Math.floor(baseIncidents * 0.7);
  } else if (context.weather === 'heatwave') {
    baseViolent *= (1 + CRIME_FACTORS.HEATWAVE_CRIME_INCREASE);
    baseIncidents = Math.ceil(baseIncidents * 1.15);
  }

  // === Seasonal Impact ===
  var seasonMod = 1.0;
  if (context.season === 'summer') {
    seasonMod = CRIME_FACTORS.SUMMER_CRIME_MOD;
  } else if (context.season === 'winter') {
    seasonMod = CRIME_FACTORS.WINTER_CRIME_MOD;
  }
  baseProperty *= seasonMod;
  baseViolent *= seasonMod;

  // === Event Impact ===
  if (events.chaos > 0) {
    baseProperty *= (1 + events.chaos * CRIME_FACTORS.CHAOS_CRIME_INCREASE);
    baseViolent *= (1 + events.chaos * CRIME_FACTORS.CHAOS_CRIME_INCREASE * 0.5);
    baseIncidents += events.chaos * 2;
  }
  if (events.celebration > 0) {
    baseProperty *= (1 + events.celebration * CRIME_FACTORS.CELEBRATION_CRIME_INCREASE);
    baseIncidents += events.celebration;
  }

  // === Momentum from Previous Cycle ===
  if (prev) {
    // Crime doesn't change drastically cycle-to-cycle (70% momentum)
    baseProperty = prev.propertyCrimeIndex * 0.7 + baseProperty * 0.3;
    baseViolent = prev.violentCrimeIndex * 0.7 + baseViolent * 0.3;

    // Clearance rate momentum with slight decay/recovery
    var clearanceDir = (rng() > 0.5) ? 1 : -1;
    var clearanceChange = clearanceDir * rng() * CRIME_FACTORS.CLEARANCE_RECOVERY;
    baseClearance = prev.clearanceRate + clearanceChange;
  }

  // === Add Random Variance ===
  var varianceProp = (rng() - 0.5) * 6; // +/- 3 points
  var varianceViol = (rng() - 0.5) * 4; // +/- 2 points
  var varianceResp = (rng() - 0.5) * CRIME_FACTORS.RESPONSE_TIME_VARIANCE;

  baseProperty += varianceProp;
  baseViolent += varianceViol;
  baseResponse += varianceResp;
  baseIncidents += Math.round((rng() - 0.5) * 4); // +/- 2 incidents

  // === Clamp Values ===
  return {
    propertyCrimeIndex: Math.max(5, Math.min(95, Math.round(baseProperty))),
    violentCrimeIndex: Math.max(5, Math.min(95, Math.round(baseViolent))),
    responseTimeAvg: Math.max(3, Math.min(15, Math.round(baseResponse * 10) / 10)),
    clearanceRate: Math.max(0.15, Math.min(0.7, Math.round(baseClearance * 100) / 100)),
    incidentCount: Math.max(0, Math.round(baseIncidents))
  };
}

/**
 * Calculate city-wide stats from metrics map.
 *
 * @param {Object} metricsMap
 * @return {Object} City-wide aggregates
 */
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

// ============================================================================
// CRIME EVENT GENERATION (for world events integration)
// ============================================================================

/**
 * Generate crime-related world events based on current metrics.
 * Called from Phase 4 (world events).
 *
 * @param {Object} ctx - Engine context
 * @return {Array} Generated crime events
 */
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

  // Property crime events
  var PROPERTY_EVENTS = [
    'car break-ins reported near $LOCATION',
    'package theft spree in $LOCATION neighborhood',
    'business burglary overnight in $LOCATION',
    'catalytic converter thefts spike in $LOCATION',
    'vandalism damages storefronts on $LOCATION main street'
  ];

  // Violent crime events (used sparingly)
  var VIOLENT_EVENTS = [
    'altercation reported at $LOCATION intersection',
    'robbery reported near $LOCATION BART',
    'assault investigation underway in $LOCATION'
  ];

  // Positive safety events
  var SAFETY_EVENTS = [
    'neighborhood watch program expands in $LOCATION',
    'community policing meeting scheduled for $LOCATION',
    'crime prevention workshop draws crowd in $LOCATION',
    '$LOCATION residents organize block safety patrol'
  ];

  for (var i = 0; i < neighborhoods.length; i++) {
    var hood = neighborhoods[i];
    var m = metrics[hood];

    // High property crime generates events
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

    // High violent crime generates events (rare)
    if (m.violentCrimeIndex > 70 && rng() < 0.15) {
      var violEvent = VIOLENT_EVENTS[Math.floor(rng() * VIOLENT_EVENTS.length)];
      events.push({
        description: violEvent.replace('$LOCATION', hood),
        severity: 'medium',
        domain: 'CRIME',
        neighborhood: hood,
        subtype: 'violent'
      });
    }

    // Low crime generates positive community events
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

/**
 * Get story signals from crime metrics.
 * Called from Phase 6 (analysis).
 *
 * @param {Object} ctx - Engine context
 * @return {Array} Story signal objects
 */
function getCrimeStorySignals_(ctx) {
  var S = ctx.summary || {};
  var crimeData = S.crimeMetrics || {};
  var shifts = crimeData.shifts || [];
  var cityWide = crimeData.cityWide || {};

  var signals = [];

  // Process significant shifts
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

  // City-wide signals
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

  return signals;
}
