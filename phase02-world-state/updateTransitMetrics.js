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
 * @version 1.3
 * @tier 6.4
 *
 * v1.3 Changes (engine.183 — the numbers carry their causes):
 * - Game day is the sports feed: S.sportsFeedEntries (applySportsSeason_,
 *   Phase2-SportsSeason, runs before this) has a row this cycle. The 15%
 *   season rng roll and the prev-cycle SPORTS-domain scan are gone — the scan
 *   was dead since v1.1 (WorldEvents_Ledger v2.1 has no Domain column).
 * - Game-day hoods = feed HomeNeighborhood ∪ S.sportsZones; stations and
 *   corridors take the boost by hood intersection, not by a 'Coliseum' /
 *   'I-880' string.
 * - Previous-cycle events read from WorldEvents_V3_Ledger (Domain, Severity,
 *   Neighborhood); a per-hood tally lifts the stations serving those hoods.
 * - Initiative phases move the stations they build: reads the transit slice
 *   applyInitiativeImplementationEffects_ publishes on
 *   S.initiativeImplementationEffects.transit (one tracker read, upstream).
 * - Every Transit_Metrics row carries a Factors string; S.transitMetrics.factors
 *   and getTransitStorySignals_ data name the drivers.
 *
 * v1.2 Changes:
 * - JOURNALISM AI: Added signalChain tracking to getTransitStorySignals_()
 *   for "Behind the Curtain" subscriber transparency
 *
 * v1.1 Changes:
 * - FIX: Read previous cycle events from WorldEvents_Ledger (events don't exist at Phase 2)
 * - FIX: dayType uses S.holiday from Phase 1, weekend probability as named constant
 * - FIX: countMajorEvents_ no longer double-counts SPORTS events
 * - FIX: Demographics null safety on adultsRatio calculation
 * - WIRED: getTransitStorySignals_ consumed in Phase 6 orchestrator
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var TRANSIT_UPDATE_VERSION = '1.3';

// engine.183 — how much a hood's previous-cycle events and an initiative's
// build phase move the stations and corridors that serve the hood.
var TRANSIT_CAUSES = {
  EVENT_HOOD_RIDERSHIP_LIFT: 0.04,   // per recorded event in a served hood
  EVENT_HOOD_RIDERSHIP_CAP: 0.12,
  BUILD_ON_TIME_DROP: 0.03,          // a station under construction
  BUILD_RIDERSHIP_MULT: 0.95,
  BUILD_STREET_TRAFFIC: 8,           // the surface corridor through the build hood
  OPEN_RIDERSHIP_MULT: 1.20,         // the hub is open
  OPEN_ON_TIME_LIFT: 0.02,
  STADIUM_BUILD_RIDERSHIP_MULT: 1.05, // Baylight under construction: the station serving it
  STADIUM_BUILD_FREEWAY_TRAFFIC: 6    // and the freeways through it
};

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
  GAMEDAY_TRAFFIC_INCREASE: 0.25,

  // Day type probability (cycles = weeks, so each cycle contains weekdays + weekends)
  WEEKEND_PROBABILITY: 2 / 7
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
  var rng = safeRand_(ctx);

  // Ensure schema exists
  if (typeof ensureTransitMetricsSchema_ === 'function') {
    ensureTransitMetricsSchema_(ss);
  }

  // Get context factors (set by Phase 1 calendar)
  var weather = S.weather || {};
  var weatherType = weather.type || 'clear';
  // engine.70 T-1 (S327): the 'storm' branches in calculateStationMetrics_
  // (-0.15 on-time) and calculateTrafficModLocal_ (x1.3) were DEAD since
  // landing — S.weather.type's enum never contains 'storm' (the weather model
  // maps a STORM front to type 'rain'). Storms registered as drizzle. Key the
  // real signal off frontState so both branches fire as authored.
  if (weather.frontState === 'STORM') weatherType = 'storm';
  var season = S.season || 'spring';
  var holiday = S.holiday || '';
  var dayType = (holiday && holiday !== 'none') ? 'holiday' : (rng() < TRANSIT_FACTORS.WEEKEND_PROBABILITY ? 'weekend' : 'weekday');

  // Read PREVIOUS cycle events — current cycle events don't exist yet (generated in Phase 4)
  // engine.183: from WorldEvents_V3_Ledger, which carries Domain + Neighborhood.
  var prevCycleEvents = loadPreviousCycleEvents_(ctx, cycle);
  var eventSummary = summarizePrevCycleEvents_(prevCycleEvents);
  var majorEvents = eventSummary.major;

  // engine.183: game day is the sports feed — a row this cycle means a game was
  // played (applySportsSeason_ published S.sportsFeedEntries upstream). The
  // hoods are where the sport physically is: feed HomeNeighborhood ∪ S.sportsZones.
  var gameDay = isGameDay_(ctx);
  var gameDayHoods = gameDay ? gameDayHoodsFor_(S) : [];

  // engine.183: initiative build phases → the stations/corridors they touch.
  var initiativeEffects = initiativeTransitEffects_(S);

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
    gameDay: gameDay,
    gameDayHoods: gameDayHoods,
    eventHoods: eventSummary.byHood,
    initiatives: initiativeEffects,
    // engine.93 Task 9: the commute matrix rides along so per-station ridership
    // can weight by who commutes IN, not just who lives nearby.
    summary: S
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
      gameDay: gameDay,
      // engine.183 — the whole causal frame in one place
      gameDayHoods: gameDayHoods,
      eventHoods: eventSummary.byHood,
      initiatives: initiativeEffects.tags
    },
    // engine.183 — per-row causes, keyed by station / corridor name
    causes: rowCauses_(allMetrics),
    alerts: generateTransitAlerts_(stationMetrics, corridorMetrics, context)
  };

  // ── engine.70 T-1 (S327): salient transit events ─────────────────────────
  // The dashboard becomes a lived system: bad-day states detected from this
  // run's own computation, written to S.transitState (Phase-4/5 citizen
  // coupling reads it) + Ripple_Ledger (causeType transit-event → CIVIC desk).
  // Bars against real distribution (with the storm-key fix above): on-time
  // < 0.72 ≈ STORM-front days only (~0.8/yr, rain days sit ~0.80); breakdown
  // roll 1.5%/cycle (~0.8/yr) is the no-weather "BART broke down" morning.
  // Consecutive-cycle dedup via previousCycleState.transitDisrupted
  // (finalizeCycleState v1.9) — a 3-cycle storm is one disruption story.
  var avgOT = S.transitMetrics.avgOnTime;
  var avgTR = S.transitMetrics.avgTraffic;
  var prevDisrupted = !!(S.previousCycleState && S.previousCycleState.transitDisrupted);
  var breakdownRoll = rng() < 0.015;
  var disruptedNow = (avgOT < 0.72) || breakdownRoll;
  var disruptionCause = breakdownRoll ? 'equipment breakdown' :
    (weatherType === 'storm' ? 'storm conditions' : 'system strain');

  // worst 3 stations name the affected hoods (entities attached at generation)
  var otSorted = stationMetrics.slice().sort(function(a, b) {
    return a.onTimePerformance - b.onTimePerformance;
  });
  var affectedHoods = [];
  for (var ah = 0; ah < Math.min(3, otSorted.length); ah++) {
    var ahStation = null;
    for (var ahs = 0; ahs < OAKLAND_BART_STATIONS.length; ahs++) {
      if (OAKLAND_BART_STATIONS[ahs].station === otSorted[ah].station) { ahStation = OAKLAND_BART_STATIONS[ahs]; break; }
    }
    if (ahStation && affectedHoods.indexOf(ahStation.neighborhood) < 0) affectedHoods.push(ahStation.neighborhood);
  }

  // engine.93 Task 9: a broken station is not only a story where it stands.
  // Expand the affected set to the hoods whose residents commute through it —
  // the people whose morning actually breaks. Threshold of 3 workers keeps a
  // single commuter from dragging a whole neighborhood into the story.
  if (S.commuteFlows && typeof commuteOriginsFor_ === 'function') {
    var directHoods = affectedHoods.slice();
    for (var dh = 0; dh < directHoods.length; dh++) {
      var upstream = commuteOriginsFor_(S, directHoods[dh], 3);
      for (var us = 0; us < upstream.length; us++) {
        if (affectedHoods.indexOf(upstream[us]) < 0) affectedHoods.push(upstream[us]);
      }
    }
  }

  var gridlockNow = avgTR >= 78 && (majorEvents > 0 || gameDay);
  var worstCorridor = '';
  var worstTraffic = 0;
  for (var wc = 0; wc < corridorMetrics.length; wc++) {
    if (corridorMetrics[wc].trafficIndex > worstTraffic) {
      worstTraffic = corridorMetrics[wc].trafficIndex;
      worstCorridor = corridorMetrics[wc].corridor;
    }
  }

  S.transitState = {
    disruption: disruptedNow && !prevDisrupted,
    disruptionOngoing: disruptedNow,
    disruptionCause: disruptedNow ? disruptionCause : '',
    gridlock: gridlockNow,
    affectedHoods: disruptedNow ? affectedHoods : [],
    onTime: avgOT,
    traffic: avgTR
  };

  if (S.transitState.disruption && typeof recordRipple_ === 'function') {
    recordRipple_(ctx, {
      causeType: 'transit-event',
      causeId: 'transit-disruption-c' + cycle,
      causeDetail: 'Service disruption — ' + disruptionCause + ': on-time fell to ' +
        Math.round(avgOT * 100) + '%, worst around ' + affectedHoods.join(', '),
      effectType: 'service-disruption',
      targetScope: 'neighborhood',
      targetIds: affectedHoods,
      neighborhood: affectedHoods[0] || '',
      magnitude: 0.05,
      duration: 1,
      sourceEngine: 'updateTransitMetrics'
    });
  }
  if (gridlockNow && typeof recordRipple_ === 'function') {
    recordRipple_(ctx, {
      causeType: 'transit-event',
      causeId: 'gridlock-c' + cycle,
      causeDetail: 'Gridlock day — traffic index ' + Math.round(avgTR) +
        ', worst on ' + worstCorridor +
        (gameDay ? ' with game-day crowds' : majorEvents > 0 ? ' with ' + majorEvents + ' major event(s) in town' : ''),
      effectType: 'gridlock',
      targetScope: 'citywide',
      targetIds: [],
      neighborhood: '',
      magnitude: 0.02,
      duration: 1,
      sourceEngine: 'updateTransitMetrics'
    });
  }
  // ── end engine.70 T-1 ────────────────────────────────────────────────────

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
  var adults = Number(demo.adults) || 0;
  var students = Number(demo.students) || 0;
  var seniors = Number(demo.seniors) || 0;
  var totalPop = adults + students + seniors;
  var adultsRatio = totalPop > 0 ? (adults / totalPop) : 0.6;
  ridershipMod *= (0.7 + adultsRatio * 0.5); // More working adults = more riders

  // engine.93 Task 9: a station's riders are not just the people who live
  // around it. Commuters arriving from other hoods are exactly who a
  // weekday-morning platform is full of, and before the commute matrix existed
  // this term was blind to them — a downtown station scored purely off downtown
  // residents. Bounded lift so an employment centre never runs away with
  // ridership: +30% at the cap.
  var commuteS = (context && context.summary) || null;
  if (commuteS && commuteS.commuteFlows && typeof commuteInboundExternal_ === 'function') {
    var inbound = commuteInboundExternal_(commuteS, hood);
    if (inbound > 0) {
      var localWorkers = adults > 0 ? adults : 1;
      var inboundRatio = inbound / (inbound + localWorkers);
      ridershipMod *= (1 + Math.min(0.30, inboundRatio * 0.5));
    }
  }

  var causes = [];
  // the station's own hood + the hoods it serves, each once
  var servedHoods = intersectHoods_([station.neighborhood].concat(station.corridors || []),
                                    [station.neighborhood].concat(station.corridors || []));

  // engine.183: game day lands on the stations serving where the game IS
  // (feed HomeNeighborhood ∪ S.sportsZones), not on a station named 'Coliseum'.
  var gameHoodsHere = intersectHoods_(servedHoods, context.gameDayHoods || []);
  var gameDayHere = context.gameDay && gameHoodsHere.length > 0;
  if (gameDayHere) {
    ridershipMod *= (1 + TRANSIT_FACTORS.GAMEDAY_RIDERSHIP_BOOST);
    causes.push('game day (' + gameHoodsHere.join(', ') + ')');
  }

  // engine.183: last cycle's recorded events in a served hood bring riders —
  // +4% each, capped at +12% (the world's own events, WorldEvents_V3_Ledger).
  var eventLift = 0;
  var eventHoodNames = [];
  var byHood = context.eventHoods || {};
  for (var sh = 0; sh < servedHoods.length; sh++) {
    var n = byHood[servedHoods[sh]] || 0;
    if (n > 0) {
      eventLift += n * TRANSIT_CAUSES.EVENT_HOOD_RIDERSHIP_LIFT;
      eventHoodNames.push(servedHoods[sh] + (n > 1 ? ' ×' + n : ''));
    }
  }
  if (eventLift > 0) {
    eventLift = Math.min(TRANSIT_CAUSES.EVENT_HOOD_RIDERSHIP_CAP, eventLift);
    ridershipMod *= (1 + eventLift);
    causes.push('events in ' + eventHoodNames.join(', '));
  }

  // engine.183: an initiative building or opening in a served hood.
  var onTimeDelta = 0;
  var inits = (context.initiatives && context.initiatives.stations) || [];
  for (var ii = 0; ii < inits.length; ii++) {
    var eff = inits[ii];
    if (intersectHoods_(servedHoods, eff.hoods).length === 0) continue;
    ridershipMod *= eff.ridershipMult;
    onTimeDelta += eff.onTimeDelta;
    causes.push(eff.tag);
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
  onTime += onTimeDelta;
  onTime += (rng() - 0.5) * TRANSIT_FACTORS.ON_TIME_VARIANCE;
  onTime = Math.max(0.6, Math.min(0.98, onTime));

  var notes = generateStationNotes_(station, ridership, onTime, gameDayHere);
  return {
    station: station.station,
    ridershipVolume: ridership,
    onTimePerformance: Math.round(onTime * 100) / 100,
    trafficIndex: 0, // Stations don't have traffic index
    corridor: '',
    notes: notes,
    factors: factorsString_(context, causes)
  };
}

/**
 * engine.183 — canon hood names shared by two lists (order of the first).
 */
function intersectHoods_(a, b) {
  var out = [];
  for (var i = 0; i < (a || []).length; i++) {
    if ((b || []).indexOf(a[i]) >= 0 && out.indexOf(a[i]) < 0) out.push(a[i]);
  }
  return out;
}

/**
 * engine.183 — the row's causes as one readable string: the cycle-wide frame
 * (weather, day type) then the row's own drivers. Empty causes still name the
 * frame, so no row is ever unexplained.
 */
function factorsString_(context, causes) {
  var parts = [];
  var w = context.weather || 'clear';
  if (w !== 'clear') parts.push(w);
  if (context.dayType && context.dayType !== 'weekday') parts.push(context.dayType);
  for (var i = 0; i < (causes || []).length; i++) parts.push(causes[i]);
  return parts.length ? parts.join('; ') : 'ordinary weekday';
}

/**
 * engine.183 — station/corridor name → its Factors string, for the summary.
 */
function rowCauses_(allMetrics) {
  var out = {};
  for (var i = 0; i < (allMetrics || []).length; i++) {
    var key = allMetrics[i].station || allMetrics[i].corridor;
    if (key) out[key] = allMetrics[i].factors || '';
  }
  return out;
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

  var causes = [];
  var hoods = corridor.hoods || [];

  // engine.183: game-day traffic loads the corridors through the game's hoods
  // (Baylight → I-880; the legacy Jack London / Downtown zones → I-880 North,
  // I-980, Broadway, Telegraph), not a string-matched pair.
  var gameHoodsHere = intersectHoods_(hoods, context.gameDayHoods || []);
  var gameDayHere = context.gameDay && gameHoodsHere.length > 0;
  if (gameDayHere) {
    trafficMod *= (1 + TRANSIT_FACTORS.GAMEDAY_TRAFFIC_INCREASE);
    causes.push('game day (' + gameHoodsHere.join(', ') + ')');
  }

  // engine.183: initiative construction through this corridor's hoods.
  var extraTraffic = 0;
  var inits = (context.initiatives && context.initiatives.corridors) || [];
  for (var ii = 0; ii < inits.length; ii++) {
    var eff = inits[ii];
    if (eff.freeway !== !!corridor.freeway) continue;
    if (intersectHoods_(hoods, eff.hoods).length === 0) continue;
    extraTraffic += eff.traffic;
    causes.push(eff.tag);
  }

  // Random variance
  var variance = (rng() - 0.5) * TRANSIT_FACTORS.TRAFFIC_VARIANCE;
  var traffic = Math.round(baseTraffic * trafficMod + extraTraffic + variance);
  traffic = Math.max(10, Math.min(100, traffic));

  return {
    station: '',
    ridershipVolume: 0,
    onTimePerformance: 0,
    trafficIndex: traffic,
    corridor: corridor.corridor,
    notes: generateCorridorNotes_(context, traffic, gameDayHere),
    factors: factorsString_(context, causes)
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
 * Load world events from the previous cycle.
 * Transit metrics react to recent event patterns since current cycle
 * events are not generated until Phase 4.
 *
 * engine.183: reads WorldEvents_V3_Ledger — the v2.1 ledger this used to read
 * never carried a Domain column (recordWorldEventsv25.js writes A–V without
 * one), so the domain branch downstream was dead and every event counted by
 * severity only. V3 carries Domain, Severity and Neighborhood (cols E–G).
 *
 * @param {Object} ctx - Engine context
 * @param {number} currentCycle
 * @return {Array} [{domain, severity, neighborhood}]
 */
function loadPreviousCycleEvents_(ctx, currentCycle) {
  if (currentCycle <= 1) return [];

  var prevCycle = currentCycle - 1;
  var ss = ctx.ss;
  var sheetName = (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES.WORLD_EVENTS_V3_LEDGER)
    ? SHEET_NAMES.WORLD_EVENTS_V3_LEDGER
    : 'WorldEvents_V3_Ledger';

  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);

  var cycleIdx = header.indexOf('Cycle');
  var domainIdx = header.indexOf('Domain');
  var severityIdx = header.indexOf('Severity');
  var hoodIdx = header.indexOf('Neighborhood');
  if (cycleIdx === -1) return [];

  var events = [];
  for (var i = 0; i < rows.length; i++) {
    var rowCycle = Number(rows[i][cycleIdx]) || 0;
    if (rowCycle !== prevCycle) continue;

    events.push({
      domain: domainIdx >= 0 ? String(rows[i][domainIdx] || '') : '',
      severity: severityIdx >= 0 ? String(rows[i][severityIdx] || '') : '',
      neighborhood: hoodIdx >= 0 ? String(rows[i][hoodIdx] || '').replace(/^\s+|\s+$/g, '') : ''
    });
  }

  return events;
}

/**
 * engine.183 — the previous cycle's events as the transit engine reads them:
 * the major-event count (unchanged rule) plus a per-hood tally of every
 * recorded event that names a neighborhood. The tally is what lets a station
 * fill because something happened in a hood it serves.
 *
 * @param {Array} worldEvents
 * @return {{major:number, byHood:Object}}
 */
function summarizePrevCycleEvents_(worldEvents) {
  var byHood = {};
  for (var i = 0; i < (worldEvents || []).length; i++) {
    var hood = worldEvents[i].neighborhood;
    if (!hood) continue;
    byHood[hood] = (byHood[hood] || 0) + 1;
  }
  return { major: countMajorEvents_(worldEvents || []), byHood: byHood };
}

/**
 * engine.183 — where the game is this cycle: every feed row's HomeNeighborhood
 * plus the stadium zones applySportsSeason_ derived (legacy Jack London /
 * Downtown until Baylight opens, then Baylight District). Canon hood names only.
 *
 * @param {Object} S - ctx.summary
 * @return {Array<string>}
 */
function gameDayHoodsFor_(S) {
  var out = [];
  var entries = (S && S.sportsFeedEntries) || [];
  for (var i = 0; i < entries.length; i++) {
    var h = String(entries[i].homeNeighborhood || entries[i].neighborhood || '').replace(/^\s+|\s+$/g, '');
    if (h && out.indexOf(h) < 0) out.push(h);
  }
  var zones = (S && S.sportsZones) || [];
  for (var z = 0; z < zones.length; z++) {
    if (zones[z] && out.indexOf(zones[z]) < 0) out.push(zones[z]);
  }
  return out;
}

/**
 * engine.183 — the transit slice applyInitiativeImplementationEffects_ publishes
 * (Phase2-InitiativeEffects, upstream of this phase; one tracker read for the
 * whole engine) mapped to station / corridor effects. Live phase vocabulary
 * only (docs/plans/2026-06-01-initiative-tracker-contract.md): a design or
 * visioning phase names itself on the row and moves nothing; construction
 * moves the station and its street; open lifts the station for good. Baylight
 * is name-matched: its construction loads the freeways and the station serving
 * the site; once the sport is in it the feed's game-day path is the effect.
 *
 * @param {Object} S - ctx.summary
 * @return {{stations:Array, corridors:Array, tags:Array<string>}}
 */
function initiativeTransitEffects_(S) {
  var out = { stations: [], corridors: [], tags: [] };
  var slice = S && S.initiativeImplementationEffects && S.initiativeImplementationEffects.transit;
  if (!slice || !slice.length) return out;

  for (var i = 0; i < slice.length; i++) {
    var it = slice[i];
    var phase = String(it.phase || '').toLowerCase();
    var hoods = it.hoods || [];
    if (!hoods.length) continue;
    var tag = it.name + ': ' + phase;
    var building = phase.indexOf('construction') === 0;
    var open = phase === 'operational' || phase === 'complete' || phase === 'open';

    if (it.baylight) {
      if (building) {
        out.stations.push({ hoods: hoods, ridershipMult: TRANSIT_CAUSES.STADIUM_BUILD_RIDERSHIP_MULT, onTimeDelta: 0, tag: tag });
        out.corridors.push({ hoods: hoods, freeway: true, traffic: TRANSIT_CAUSES.STADIUM_BUILD_FREEWAY_TRAFFIC, tag: tag });
        out.tags.push(tag);
      }
      // operational Baylight: the sport is in it — the game-day path carries it
      continue;
    }

    if (building && phase !== 'construction-planning') {
      out.stations.push({ hoods: hoods, ridershipMult: TRANSIT_CAUSES.BUILD_RIDERSHIP_MULT, onTimeDelta: -TRANSIT_CAUSES.BUILD_ON_TIME_DROP, tag: tag });
      out.corridors.push({ hoods: hoods, freeway: false, traffic: TRANSIT_CAUSES.BUILD_STREET_TRAFFIC, tag: tag });
    } else if (open) {
      out.stations.push({ hoods: hoods, ridershipMult: TRANSIT_CAUSES.OPEN_RIDERSHIP_MULT, onTimeDelta: TRANSIT_CAUSES.OPEN_ON_TIME_LIFT, tag: tag });
    } else {
      // planning / visioning / design: the row names it, the number holds
      out.stations.push({ hoods: hoods, ridershipMult: 1, onTimeDelta: 0, tag: tag });
    }
    out.tags.push(tag);
  }
  return out;
}

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

    // Count each event once: domain match takes priority over severity
    if (domain === 'SPORTS' || domain === 'CELEBRATION' || domain === 'FESTIVAL') {
      count++;
    } else if (severity === 'high' || severity === 'medium') {
      count++;
    }
  }
  return count;
}

/**
 * Determine if it's a game day.
 *
 * engine.183: a game was played this cycle iff the sports feed has a row for
 * it — applySportsSeason_ (Phase2-SportsSeason, before this phase) publishes
 * the rows on S.sportsFeedEntries. No rng, no prev-cycle domain scan: the
 * feed is the record of games, and the quiet case is the normal case.
 *
 * @param {Object} ctx
 * @return {boolean}
 */
function isGameDay_(ctx) {
  var S = ctx.summary || {};
  return ((S.sportsFeedEntries || []).length > 0);
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
function generateStationNotes_(station, ridership, onTime, gameDayHere) {
  var notes = [];

  if (gameDayHere) {
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
function generateCorridorNotes_(context, traffic, gameDayHere) {
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

  if (gameDayHere) {
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
/**
 * Helper: Create signal chain entry for Transit Correspondent
 */
function createTransitSignalChain_(detected, value, context) {
  return [{
    agent: 'Transit Correspondent',
    engine: 'updateTransitMetrics_',
    detected: detected,
    value: value,
    context: context || '',
    timestamp: 'Phase2'
  }];
}

/**
 * engine.183 — the drivers behind this cycle's numbers, as a phrase the desk
 * can print: "game day in Baylight District; events in Fruitvale; Fruitvale
 * Transit Hub Phase II: construction-active". Empty when nothing but the
 * weather and the calendar moved.
 */
function transitDriversPhrase_(factors) {
  var f = factors || {};
  var parts = [];
  if (f.gameDay) parts.push('game day' + ((f.gameDayHoods || []).length ? ' in ' + f.gameDayHoods.join(', ') : ''));
  var hoods = [];
  for (var h in (f.eventHoods || {})) if (Object.prototype.hasOwnProperty.call(f.eventHoods, h)) hoods.push(h);
  if (hoods.length) parts.push('events in ' + hoods.join(', '));
  for (var i = 0; i < (f.initiatives || []).length; i++) parts.push(f.initiatives[i]);
  if (f.weather && f.weather !== 'clear') parts.push(f.weather);
  if (f.dayType && f.dayType !== 'weekday') parts.push(f.dayType);
  return parts.join('; ');
}

/**
 * engine.183 — attach each alert's row cause so a desk can say why.
 */
function alertsWithCauses_(alerts, causes) {
  var out = [];
  for (var i = 0; i < alerts.length; i++) {
    var a = alerts[i];
    var key = a.station || a.corridor || '';
    var copy = {};
    for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) copy[k] = a[k];
    copy.cause = (causes && causes[key]) || '';
    out.push(copy);
  }
  return out;
}

function getTransitStorySignals_(ctx) {
  var S = ctx.summary || {};
  var transitData = S.transitMetrics || {};
  var alerts = transitData.alerts || [];
  // engine.183 — every signal carries the causal frame + per-row causes
  var factors = transitData.factors || {};
  var causes = transitData.causes || {};
  var drivers = transitDriversPhrase_(factors);

  var signals = [];

  // Service alerts
  var serviceAlerts = alerts.filter(function(a) { return a.type === 'service_alert'; });
  if (serviceAlerts.length > 0) {
    signals.push({
      type: 'transit_disruption',
      priority: 2,
      headline: 'BART service delays reported',
      desk: 'metro',
      data: { alerts: alertsWithCauses_(serviceAlerts, causes), factors: factors, drivers: drivers },
      signalChain: createTransitSignalChain_('service_disruption', serviceAlerts.length, drivers ? 'BART delays — ' + drivers : 'BART delays detected')
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
      data: { alerts: alertsWithCauses_(trafficAlerts, causes), factors: factors, drivers: drivers },
      signalChain: createTransitSignalChain_('traffic_congestion', trafficAlerts.length, drivers ? 'Multiple corridors — ' + drivers : 'Multiple corridors affected')
    });
  }

  // Ridership milestones
  if (transitData.totalRidership > 60000) {
    signals.push({
      type: 'transit_ridership',
      priority: 1,
      headline: drivers ? 'Strong BART ridership day — ' + drivers : 'Strong BART ridership day',
      desk: 'metro',
      data: { ridership: transitData.totalRidership, factors: factors, drivers: drivers, causes: causes },
      signalChain: createTransitSignalChain_('ridership_milestone', transitData.totalRidership, drivers ? 'Above 60k — ' + drivers : 'Above 60k threshold')
    });
  }

  // On-time performance story
  if (transitData.avgOnTime < 0.75) {
    signals.push({
      type: 'transit_performance',
      priority: 3,
      headline: 'BART on-time performance drops',
      desk: 'metro',
      data: { onTime: transitData.avgOnTime, factors: factors, drivers: drivers, causes: causes },
      signalChain: createTransitSignalChain_('performance_drop', Math.round(transitData.avgOnTime * 100), drivers ? 'Below 75% on-time — ' + drivers : 'Below 75% on-time')
    });
  } else if (transitData.avgOnTime > 0.92) {
    signals.push({
      type: 'transit_performance',
      priority: 1,
      headline: 'BART reports strong on-time performance',
      desk: 'metro',
      data: { onTime: transitData.avgOnTime, factors: factors, drivers: drivers },
      signalChain: createTransitSignalChain_('performance_excellence', Math.round(transitData.avgOnTime * 100), 'Above 92% on-time')
    });
  }

  // Game day transit — engine.183: the headline names where the game was
  if (factors.gameDay) {
    var where = (factors.gameDayHoods || []).join(', ');
    signals.push({
      type: 'gameday_transit',
      priority: 2,
      headline: (where ? where : 'Game-day') + ' crowds impact transit',
      desk: 'sports',
      data: { factors: factors, drivers: drivers, causes: causes },
      signalChain: createTransitSignalChain_('gameday_impact', 1, where ? 'Game in ' + where + ' (sports feed)' : 'Game day (sports feed)')
    });
  }

  return signals;
}
