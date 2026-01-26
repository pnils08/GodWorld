/**
 * updateTransitMetrics.js
 *
 * Phase 2 engine: Updates transit and traffic metrics.
 *
 * Metrics influenced by:
 * - Weather conditions
 * - Day type (weekday, weekend, holiday)
 * - Major events (sports, concerts, civic)
 * - Season
 * - City sentiment and economic conditions
 *
 * @version 1.0
 * @tier 6.4
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var TRANSIT_UPDATE_VERSION = '1.0';

// Transit variability factors
var TRANSIT_FACTORS = {
  // On-time performance baseline
  BASE_ON_TIME: 0.85,
  ON_TIME_VARIANCE: 0.1,

  // Traffic index baseline
  BASE_TRAFFIC: 50,
  TRAFFIC_VARIANCE: 15,

  // Weather impacts
  STORM_RIDERSHIP_REDUCTION: 0.25,
  STORM_TRAFFIC_INCREASE: 0.3,
  RAIN_RIDERSHIP_REDUCTION: 0.1,
  RAIN_TRAFFIC_INCREASE: 0.15,

  // Event impacts (per major event)
  EVENT_RIDERSHIP_BOOST: 0.15,
  EVENT_TRAFFIC_INCREASE: 0.1,

  // Game day special handling
  GAMEDAY_RIDERSHIP_BOOST: 0.3,
  GAMEDAY_TRAFFIC_INCREASE: 0.25
};

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Update transit metrics for all stations and corridors.
 * Called during Phase 2 (world state).
 *
 * @param {Object} ctx - Engine context
 */
function updateTransitMetrics_Phase2_(ctx) {
  var ss = ctx.ss;
  var S = ctx.summary || {};
  var cycle = S.absoluteCycle || 0;
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  // Ensure schema exists
  if (typeof ensureTransitMetricsSchema_ === 'function') {
    ensureTransitMetricsSchema_(ss);
  }

  // Get context factors
  var weather = S.weather || {};
  var weatherType = weather.type || 'clear';
  var season = S.season || 'spring';
  var holiday = S.holiday || '';
  var dayType = holiday ? 'holiday' : (rng() < 0.286 ? 'weekend' : 'weekday'); // ~2/7 days are weekend

  // Get world events for event impact
  var worldEvents = S.worldEvents || [];
  var majorEvents = countMajorEvents_(worldEvents);

  // Check for game day
  var gameDay = isGameDay_(ctx, rng);

  // Get demographics for ridership correlation
  var demographics = {};
  if (typeof getNeighborhoodDemographics_ === 'function') {
    demographics = getNeighborhoodDemographics_(ss);
  }

  // Build context for modifiers
  var context = {
    weather: weatherType,
    season: season,
    dayType: dayType,
    events: majorEvents,
    gameDay: gameDay
  };

  // Calculate station metrics
  var stationMetrics = [];
  var stations = OAKLAND_BART_STATIONS || [];

  for (var i = 0; i < stations.length; i++) {
    var station = stations[i];
    var metrics = calculateStationMetrics_(station, context, demographics, rng);
    stationMetrics.push(metrics);
  }

  // Calculate corridor traffic
  var corridorMetrics = [];
  var corridors = TRAFFIC_CORRIDORS || [];

  for (var c = 0; c < corridors.length; c++) {
    var corridor = corridors[c];
    var traffic = calculateCorridorTraffic_(corridor, context, rng);
    corridorMetrics.push(traffic);
  }

  // Combine all metrics for recording
  var allMetrics = stationMetrics.concat(corridorMetrics);

  // Record metrics
  if (typeof batchRecordTransitMetrics_ === 'function') {
    batchRecordTransitMetrics_(ctx, allMetrics);
  }

  // Store summary in context
  S.transitMetrics = {
    updated: true,
    cycle: cycle,
    totalRidership: sumRidership_(stationMetrics),
    avgOnTime: avgOnTime_(stationMetrics),
    avgTraffic: avgTraffic_(corridorMetrics),
    factors: {
      weather: weatherType,
      dayType: dayType,
      majorEvents: majorEvents,
      gameDay: gameDay
    },
    alerts: generateTransitAlerts_(stationMetrics, corridorMetrics, context)
  };

  return allMetrics;
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate metrics for a BART station.
 *
 * @param {Object} station
 * @param {Object} context
 * @param {Object} demographics
 * @param {Function} rng
 * @return {Object}
 */
function calculateStationMetrics_(station, context, demographics, rng) {
  // Base ridership
  var baseRidership = station.baseRidership || 5000;

  // Apply ridership modifier
  var ridershipMod = 1.0;
  if (typeof calculateRidershipModifier_ === 'function') {
    ridershipMod = calculateRidershipModifier_(context);
  } else {
    ridershipMod = calculateRidershipModLocal_(context);
  }

  // Demographic adjustment (working population)
  var hood = station.neighborhood;
  var demo = demographics[hood] || {};
  var adultsRatio = demo.adults ? (demo.adults / (demo.students + demo.adults + demo.seniors || 1000)) : 0.6;
  ridershipMod *= (0.7 + adultsRatio * 0.5); // More working adults = more riders

  // Game day boost for Coliseum
  if (context.gameDay && station.station.indexOf('Coliseum') !== -1) {
    ridershipMod *= (1 + TRANSIT_FACTORS.GAMEDAY_RIDERSHIP_BOOST);
  }

  // Random variance
  var variance = 0.9 + (rng() * 0.2); // 90-110%
  var ridership = Math.round(baseRidership * ridershipMod * variance);

  // On-time performance
  var onTime = TRANSIT_FACTORS.BASE_ON_TIME;
  if (context.weather === 'storm') {
    onTime -= 0.15;
  } else if (context.weather === 'rain' || context.weather === 'fog') {
    onTime -= 0.05;
  }
  if (context.events > 2) {
    onTime -= 0.03; // Crowding affects performance
  }
  onTime += (rng() - 0.5) * TRANSIT_FACTORS.ON_TIME_VARIANCE;
  onTime = Math.max(0.6, Math.min(0.98, onTime));

  return {
    station: station.station,
    ridershipVolume: ridership,
    onTimePerformance: Math.round(onTime * 100) / 100,
    trafficIndex: 0, // Stations don't have traffic index
    corridor: '',
    notes: generateStationNotes_(station, context, ridership, onTime)
  };
}

/**
 * Calculate traffic for a corridor.
 *
 * @param {Object} corridor
 * @param {Object} context
 * @param {Function} rng
 * @return {Object}
 */
function calculateCorridorTraffic_(corridor, context, rng) {
  // Base traffic index
  var baseTraffic = corridor.baseTrafficIndex || 50;

  // Apply traffic modifier
  var trafficMod = 1.0;
  if (typeof calculateTrafficModifier_ === 'function') {
    trafficMod = calculateTrafficModifier_(context);
  } else {
    trafficMod = calculateTrafficModLocal_(context);
  }

  // Weekend reduction
  if (context.dayType === 'weekend') {
    trafficMod *= 0.7;
  } else if (context.dayType === 'holiday') {
    trafficMod *= 0.5;
  }

  // Coliseum corridor game day
  if (context.gameDay && (corridor.corridor.indexOf('880') !== -1 || corridor.corridor === 'I-580 East')) {
    trafficMod *= (1 + TRANSIT_FACTORS.GAMEDAY_TRAFFIC_INCREASE);
  }

  // Random variance
  var variance = (rng() - 0.5) * TRANSIT_FACTORS.TRAFFIC_VARIANCE;
  var traffic = Math.round(baseTraffic * trafficMod + variance);
  traffic = Math.max(10, Math.min(100, traffic));

  return {
    station: '',
    ridershipVolume: 0,
    onTimePerformance: 0,
    trafficIndex: traffic,
    corridor: corridor.corridor,
    notes: generateCorridorNotes_(corridor, context, traffic)
  };
}

// ============================================================================
// LOCAL MODIFIER FUNCTIONS (fallback if utilities not loaded)
// ============================================================================

/**
 * Local ridership modifier calculation.
 */
function calculateRidershipModLocal_(context) {
  var mod = 1.0;

  var weather = (context.weather || '').toLowerCase();
  if (weather === 'storm') mod *= 0.75;
  else if (weather === 'rain') mod *= 0.9;
  else if (weather === 'heatwave') mod *= 0.95;

  var dayType = (context.dayType || '').toLowerCase();
  if (dayType === 'weekend') mod *= 0.6;
  else if (dayType === 'holiday') mod *= 0.4;

  var events = context.events || 0;
  if (events > 0) mod *= (1 + events * 0.05);

  return mod;
}

/**
 * Local traffic modifier calculation.
 */
function calculateTrafficModLocal_(context) {
  var mod = 1.0;

  var weather = (context.weather || '').toLowerCase();
  if (weather === 'storm') mod *= 1.3;
  else if (weather === 'rain') mod *= 1.15;
  else if (weather === 'fog') mod *= 1.1;

  var events = context.events || 0;
  if (events > 0) mod *= (1 + events * 0.1);

  if (context.gameDay) mod *= 1.25;

  return mod;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Count major events from world events.
 *
 * @param {Array} worldEvents
 * @return {number}
 */
function countMajorEvents_(worldEvents) {
  var count = 0;
  for (var i = 0; i < worldEvents.length; i++) {
    var evt = worldEvents[i];
    var severity = (evt.severity || '').toLowerCase();
    var domain = (evt.domain || evt._domain || '').toUpperCase();

    if (severity === 'high' || severity === 'medium') count++;
    if (domain === 'SPORTS' || domain === 'CELEBRATION' || domain === 'FESTIVAL') count++;
  }
  return count;
}

/**
 * Determine if it's a game day.
 *
 * @param {Object} ctx
 * @param {Function} rng
 * @return {boolean}
 */
function isGameDay_(ctx, rng) {
  var S = ctx.summary || {};

  // Check for sports events
  var worldEvents = S.worldEvents || [];
  for (var i = 0; i < worldEvents.length; i++) {
    var domain = (worldEvents[i].domain || worldEvents[i]._domain || '').toUpperCase();
    if (domain === 'SPORTS') return true;
  }

  // Random game day probability (baseball season ~50% of days have games)
  var season = S.season || 'spring';
  if (season === 'spring' || season === 'summer' || season === 'fall') {
    return rng() < 0.15; // 15% chance of game day
  }

  return false;
}

/**
 * Sum ridership from station metrics.
 */
function sumRidership_(stationMetrics) {
  var total = 0;
  for (var i = 0; i < stationMetrics.length; i++) {
    total += stationMetrics[i].ridershipVolume || 0;
  }
  return total;
}

/**
 * Average on-time performance.
 */
function avgOnTime_(stationMetrics) {
  if (stationMetrics.length === 0) return 0.85;
  var sum = 0;
  for (var i = 0; i < stationMetrics.length; i++) {
    sum += stationMetrics[i].onTimePerformance || 0;
  }
  return Math.round((sum / stationMetrics.length) * 100) / 100;
}

/**
 * Average traffic index.
 */
function avgTraffic_(corridorMetrics) {
  if (corridorMetrics.length === 0) return 50;
  var sum = 0;
  for (var i = 0; i < corridorMetrics.length; i++) {
    sum += corridorMetrics[i].trafficIndex || 0;
  }
  return Math.round(sum / corridorMetrics.length);
}

/**
 * Generate station notes.
 */
function generateStationNotes_(station, context, ridership, onTime) {
  var notes = [];

  if (context.gameDay && station.station.indexOf('Coliseum') !== -1) {
    notes.push('game day crowds');
  }
  if (onTime < 0.75) {
    notes.push('service delays');
  } else if (onTime > 0.92) {
    notes.push('smooth operations');
  }
  if (ridership > station.baseRidership * 1.2) {
    notes.push('above-average ridership');
  } else if (ridership < station.baseRidership * 0.6) {
    notes.push('light ridership');
  }

  return notes.join('; ');
}

/**
 * Generate corridor notes.
 */
function generateCorridorNotes_(corridor, context, traffic) {
  var notes = [];

  if (traffic > 75) {
    notes.push('heavy congestion');
  } else if (traffic > 60) {
    notes.push('moderate delays');
  } else if (traffic < 30) {
    notes.push('light traffic');
  }

  if (context.weather === 'storm' || context.weather === 'rain') {
    notes.push('weather-related slowdowns');
  }

  if (context.gameDay && (corridor.corridor.indexOf('880') !== -1)) {
    notes.push('event traffic');
  }

  return notes.join('; ');
}

/**
 * Generate transit alerts.
 */
function generateTransitAlerts_(stationMetrics, corridorMetrics, context) {
  var alerts = [];

  // Check for poor on-time performance
  for (var i = 0; i < stationMetrics.length; i++) {
    if (stationMetrics[i].onTimePerformance < 0.7) {
      alerts.push({
        type: 'service_alert',
        station: stationMetrics[i].station,
        severity: 'medium',
        message: 'BART delays at ' + stationMetrics[i].station
      });
    }
  }

  // Check for severe congestion
  for (var c = 0; c < corridorMetrics.length; c++) {
    if (corridorMetrics[c].trafficIndex > 80) {
      alerts.push({
        type: 'traffic_alert',
        corridor: corridorMetrics[c].corridor,
        severity: 'high',
        message: 'Heavy congestion on ' + corridorMetrics[c].corridor
      });
    }
  }

  // Weather-related advisory
  if (context.weather === 'storm') {
    alerts.push({
      type: 'weather_advisory',
      severity: 'medium',
      message: 'Storm conditions affecting transit systemwide'
    });
  }

  return alerts;
}

// ============================================================================
// STORY SIGNALS FOR PHASE 6
// ============================================================================

/**
 * Get story signals from transit metrics.
 *
 * @param {Object} ctx
 * @return {Array}
 */
function getTransitStorySignals_(ctx) {
  var S = ctx.summary || {};
  var transitData = S.transitMetrics || {};
  var alerts = transitData.alerts || [];

  var signals = [];

  // Service alerts
  var serviceAlerts = alerts.filter(function(a) { return a.type === 'service_alert'; });
  if (serviceAlerts.length > 0) {
    signals.push({
      type: 'transit_disruption',
      priority: 2,
      headline: 'BART service delays reported',
      desk: 'metro',
      data: { alerts: serviceAlerts }
    });
  }

  // Traffic alerts
  var trafficAlerts = alerts.filter(function(a) { return a.type === 'traffic_alert'; });
  if (trafficAlerts.length >= 3) {
    signals.push({
      type: 'traffic_congestion',
      priority: 2,
      headline: 'Heavy traffic across Oakland corridors',
      desk: 'metro',
      data: { alerts: trafficAlerts }
    });
  }

  // Ridership milestones
  if (transitData.totalRidership > 60000) {
    signals.push({
      type: 'transit_ridership',
      priority: 1,
      headline: 'Strong BART ridership day',
      desk: 'metro',
      data: { ridership: transitData.totalRidership }
    });
  }

  // On-time performance story
  if (transitData.avgOnTime < 0.75) {
    signals.push({
      type: 'transit_performance',
      priority: 3,
      headline: 'BART on-time performance drops',
      desk: 'metro',
      data: { onTime: transitData.avgOnTime }
    });
  } else if (transitData.avgOnTime > 0.92) {
    signals.push({
      type: 'transit_performance',
      priority: 1,
      headline: 'BART reports strong on-time performance',
      desk: 'metro',
      data: { onTime: transitData.avgOnTime }
    });
  }

  // Game day transit
  if (transitData.factors && transitData.factors.gameDay) {
    signals.push({
      type: 'gameday_transit',
      priority: 2,
      headline: 'Coliseum crowds impact transit',
      desk: 'sports',
      data: transitData.factors
    });
  }

  return signals;
}
