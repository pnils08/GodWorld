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
 * - engine.204/205: game day = a franchise played at HOME (S.sportsWeek[f].h > 0);
 *   hoods = that franchise's venue; the bump scales by unsigned × venueShare.
 *   The typed HomeNeighborhood is no longer read.
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
  GAMEDAY_TRAFFIC_INCREASE: 0.25
};

// engine.290 move 2 — First Friday is the art walk: the stations whose
// catchment reaches these hoods and the two streets that carry it.
var TRANSIT_FIRST_FRIDAY_HOODS = ['KONO', 'Uptown', 'Downtown'];
var TRANSIT_FIRST_FRIDAY_CORRIDORS = ['Telegraph Ave', 'Broadway'];

/**
 * engine.290 — the transit dials, read from World_Config (ctx.config) each
 * Cycle. ensureEngine290Config_ seeds missing rows and refuses an invalid one
 * before Phase 1, so a value here is in range; a key absent from ctx.config
 * (a harness without the sheet) reads its seed.
 *
 * @param {Object} ctx
 * @return {Object} key -> number
 */
function transitDials_(ctx) {
  if (typeof ENGINE290_CONFIG_SEEDS === 'undefined') throw new Error('engine.290: ENGINE290_CONFIG_SEEDS not loaded');
  var cfg = (ctx && ctx.config) || {};
  var out = {};
  for (var i = 0; i < ENGINE290_CONFIG_SEEDS.length; i++) {
    var spec = ENGINE290_CONFIG_SEEDS[i];
    var raw = cfg[spec[0]];
    var v = Number(raw);
    out[spec[0]] = (raw === '' || raw === null || raw === undefined || typeof raw === 'boolean' ||
      !isFinite(v) || v < spec[3] || v > spec[4]) ? spec[1] : v;
  }
  return out;
}

/**
 * engine.290 move 2 — the one day-type rule. A major holiday cuts riders and
 * street traffic by transitMajorHolidayMult (and outranks the weekend — the
 * two never stack); otherwise a weekend-dominant Cycle takes
 * transitWeekendMult. A minor / Oakland / cultural holiday cuts nothing; the
 * Factors string names it.
 *
 * @param {Object} context
 * @return {number}
 */
function transitDayMult_(context) {
  var d = context.dials;
  if (context.holiday && context.holiday.major) return d.transitMajorHolidayMult;
  if (context.dayType === 'weekend') return d.transitWeekendMult;
  return 1;
}

// engine.290 move 4 — the BART crew, read off the ledger. Role classes match
// RoleType at BART Oakland Division (first class that matches wins); a crew
// row in care or custody is named as the cause but is not on shift.
var TRANSIT_CREW_EMPLOYER = 'BIZ-00014';
var TRANSIT_CREW_CLASSES = [
  ['conductor', /conductor/i],
  ['operator', /train operator|train engineer|rail operator/i],
  ['dispatcher', /dispatch/i],
  ['maintenance', /track|maintenance|systems tech/i],
  ['stationManager', /station manager/i]
];
// Care / custody vocabulary (generationalEventsEngine, runCareerEngine,
// judicialLifecycle). retired / deceased are not crew at all.
var TRANSIT_CREW_OUT_STATUSES = ['hospitalized', 'critical', 'serious-condition', 'injured', 'recovering', 'detained'];

function transitCrewClass_(roleType) {
  var role = String(roleType || '');
  for (var i = 0; i < TRANSIT_CREW_CLASSES.length; i++) {
    if (TRANSIT_CREW_CLASSES[i][1].test(role)) return TRANSIT_CREW_CLASSES[i][0];
  }
  return null;
}

/**
 * engine.290 move 4 — who is on shift at BART Oakland Division. Active rows
 * count by role class; a crew row whose Status is care/custody (employer and
 * role still held) goes on `short` and is named on every station row. Phase 4/5
 * write those Statuses and Phase 10 persists them, so a Phase 2 read sees them
 * the following Cycle — a one-Cycle lag by construction.
 *
 * @return {{conductor:number, operator:number, dispatcher:number, maintenance:number,
 *           stationManager:number, total:number, short:Array<{name, role, status}>}}
 */
function transitStaffing_(ctx) {
  if (!ctx.ledger || !ctx.ledger.headers) throw new Error('engine.290 transitStaffing_: ctx.ledger not loaded');
  var h = ctx.ledger.headers;
  var iEmp = h.indexOf('EmployerBizId'), iRole = h.indexOf('RoleType'), iStatus = h.indexOf('Status');
  var iFirst = h.indexOf('First'), iLast = h.indexOf('Last'), iPop = h.indexOf('POPID');
  if (iEmp < 0 || iRole < 0 || iStatus < 0) throw new Error('engine.290 transitStaffing_: Simulation_Ledger lacks EmployerBizId / RoleType / Status');
  var out = { conductor: 0, operator: 0, dispatcher: 0, maintenance: 0, stationManager: 0, total: 0, short: [] };
  var rows = ctx.ledger.rows || [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (String(row[iEmp] || '').trim() !== TRANSIT_CREW_EMPLOYER) continue;
    var cls = transitCrewClass_(row[iRole]);
    if (!cls) continue;
    var status = String(row[iStatus] || '').trim().toLowerCase();
    if (status === 'active') {
      out[cls]++;
      out.total++;
    } else if (TRANSIT_CREW_OUT_STATUSES.indexOf(status) >= 0) {
      var name = ((iFirst >= 0 ? String(row[iFirst] || '') : '') + ' ' + (iLast >= 0 ? String(row[iLast] || '') : '')).trim();
      out.short.push({ name: name || (iPop >= 0 ? String(row[iPop] || '') : ''), role: cls, status: status });
    }
  }
  return out;
}

/**
 * engine.290 move 5 — last Cycle's BART-train chaos hits (chaosCarsEngine,
 * Phase 4), carried on previousCycleState.chaosTransit. Read only when the
 * carry is from the Cycle just before this one — a stale carry (a skipped or
 * replayed Cycle) is ignored.
 *
 * @return {Array<{h:string, s:Array<string>, o:string, d:number}>}
 */
function transitChaosCarry_(S, cycle) {
  var prev = S.previousCycleState && S.previousCycleState.chaosTransit;
  if (!prev || !prev.hits || Number(prev.c) !== cycle - 1) return [];
  return prev.hits;
}

function transitChaosWords_(outcome) {
  return String(outcome || '').replace(/_/g, ' ');
}

// engine.290 move 3 — the base this engine computes ridership from. 2 = the
// ledger share; a Cycle whose previous carry is not 2 is the rebase Cycle.
var TRANSIT_BASE_VERSION = 2;

/**
 * engine.290 move 3 — each station's share of the city's riders, from the
 * ledgers and dimensionless (two scales never mixed):
 *
 *   w(h) = (α·r(h) + (1−α)·k(h)) × (1 + ρ(h))
 *   r(h) = Adults(h) / ΣAdults                     hood-scale residents
 *   k(h) = S.commuteInbound[h] / Σ                 ledger-scale workers (the
 *          inbound tally already includes the diagonal — commuteFlowEngine
 *          adds flows[oh][dh] over every origin, oh === dh included)
 *   ρ(h) = transitRetailWeight × clamp(RetailVitality(h)/cityMedian − 1, ±0.5)
 *          — a bounded hot-spot lift (a multiplier: added to shares near
 *          1/22 it zeroed six hoods on the C111 read-before)
 *
 * A station whose own hood is h is primary for h; one listing h only in its
 * catchment is secondary. With primaries, (1 − s)·w(h) splits among them and
 * s·w(h) among the secondaries (s = transitCatchmentShare); with none, all of
 * w(h) splits among the secondaries. Names fold through resolveHoodOrChild_
 * (Coliseum, Elmhurst → East Oakland; North Oakland → Temescal; Montclair →
 * Piedmont Ave), each hood once per station. Shares sum to 1.
 *
 * @return {{byStation:Object, missing:Object}|null} null = no demographics
 */
function transitStationShares_(ctx, demographics, dials, stations) {
  var S = ctx.summary || {};
  var demoKeys = Object.keys(demographics || {});
  if (!demoKeys.length || !stations.length) return null;
  var fold = function(n) { return resolveHoodOrChild_(ctx, n); };
  var hoods = (S.canonHoods && S.canonHoods.list) ? S.canonHoods.list.slice() : demoKeys.slice();

  var sumA = 0, sumK = 0, i, h;
  var inbound = S.commuteInbound || {};
  for (i = 0; i < hoods.length; i++) {
    h = hoods[i];
    sumA += Number((demographics[h] || {}).adults) || 0;
    sumK += Number(inbound[h]) || 0;
  }
  var retail = [], ns = S.neighborhoodState || {};
  for (i = 0; i < hoods.length; i++) {
    var rv = Number((ns[hoods[i]] || {}).retailVitality);
    if (isFinite(rv) && rv > 0) retail.push(rv);
  }
  retail.sort(function(a, b) { return a - b; });
  var median = retail.length ? (retail.length % 2 ? retail[(retail.length - 1) / 2]
    : (retail[retail.length / 2 - 1] + retail[retail.length / 2]) / 2) : 0;

  var alpha = dials.transitResidentWeight;
  var w = {};
  for (i = 0; i < hoods.length; i++) {
    h = hoods[i];
    var r = sumA > 0 ? (Number((demographics[h] || {}).adults) || 0) / sumA : 0;
    var k = sumK > 0 ? (Number(inbound[h]) || 0) / sumK : 0;
    var hrv = Number((ns[h] || {}).retailVitality);
    var rho = (median > 0 && isFinite(hrv) && hrv > 0)
      ? dials.transitRetailWeight * Math.max(-0.5, Math.min(0.5, hrv / median - 1)) : 0;
    w[h] = (alpha * r + (1 - alpha) * k) * (1 + rho);
  }

  var primary = {}, secondary = {}, missing = {};
  for (i = 0; i < stations.length; i++) {
    var st = stations[i];
    missing[st.station] = [];
    var own = fold(st.neighborhood);
    var seen = {};
    if (own) { seen[own] = true; (primary[own] = primary[own] || []).push(st.station); }
    else missing[st.station].push(st.neighborhood);
    var list = st.corridors || [];
    for (var c = 0; c < list.length; c++) {
      var ch = fold(list[c]);
      if (!ch) { missing[st.station].push(list[c]); continue; }
      if (seen[ch]) continue;
      seen[ch] = true;
      (secondary[ch] = secondary[ch] || []).push(st.station);
    }
    // a served hood with no demographics row and no workers carries 0 — named
    var served = Object.keys(seen);
    for (var sv = 0; sv < served.length; sv++) {
      if (!demographics[served[sv]] && !(Number(inbound[served[sv]]) > 0)) missing[st.station].push(served[sv]);
    }
  }

  var s = dials.transitCatchmentShare;
  var load = {};
  for (i = 0; i < stations.length; i++) load[stations[i].station] = 0;
  for (i = 0; i < hoods.length; i++) {
    h = hoods[i];
    var P = primary[h] || [], C = secondary[h] || [];
    var j;
    if (P.length) {
      var pShare = C.length ? (1 - s) : 1;
      for (j = 0; j < P.length; j++) load[P[j]] += pShare * w[h] / P.length;
      for (j = 0; j < C.length; j++) load[C[j]] += s * w[h] / C.length;
    } else if (C.length) {
      for (j = 0; j < C.length; j++) load[C[j]] += w[h] / C.length;
    }
  }
  var total = 0;
  for (var ks in load) if (load.hasOwnProperty(ks)) total += load[ks];
  if (!(total > 0)) return null;
  var byStation = {};
  for (var kb in load) if (load.hasOwnProperty(kb)) byStation[kb] = load[kb] / total;
  return { byStation: byStation, missing: missing };
}

/**
 * engine.290 move 3 — the corridors' traffic base from the sim: each canon
 * hood's S.neighborhoodDynamics[h].traffic multiplier and the city mean.
 * null when the dynamics are absent (the authored table is the fallback).
 */
function transitCorridorBase_(S, dials) {
  var nd = S.neighborhoodDynamics;
  if (!nd) return null;
  // The city mean runs over the same hood set and missing rule the corridors
  // use (canon list; a hood with no dynamics row counts 1.0), so a partial
  // dynamics read cannot make the whole city look quiet (codex 2026-10-15 §3).
  var hoods = (S.canonHoods && S.canonHoods.list) ? S.canonHoods.list : Object.keys(nd);
  var sum = 0, present = 0;
  for (var i = 0; i < hoods.length; i++) {
    var t = Number((nd[hoods[i]] || {}).traffic);
    if (isFinite(t) && t > 0) { sum += t; present++; } else sum += 1.0;
  }
  if (!present) return null;
  return { traffic: nd, cityMean: sum / hoods.length };
}

function transitCorridorBaseFor_(corridor, cb, dials) {
  var hoods = corridor.hoods || [];
  var sum = 0;
  for (var i = 0; i < hoods.length; i++) {
    var t = Number((cb.traffic[hoods[i]] || {}).traffic);
    sum += (isFinite(t) && t > 0) ? t : 1.0;   // a hood with no dynamics row counts 1.0
  }
  var mean = hoods.length ? sum / hoods.length : 1.0;
  return dials.transitCityTraffic * (mean / cb.cityMean) * (corridor.freeway ? dials.transitFreewayMult : 1);
}

/**
 * engine.290 move 3 — the base tags every row leads with: where the base came
 * from, the rebase Cycle, and any served name with no row.
 */
function transitBaseCauses_(context, missing) {
  var out = [context.shares ? 'base: ledger' : 'base: table'];   // table = no demographics, or a zero-weight read
  if (context.rebased) out.push('rebased');
  for (var i = 0; i < (missing || []).length; i++) out.push('no row: ' + missing[i]);
  return out;
}

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
  // engine.290 move 2 — the sim's clock, not a private one. Phase 1 sets
  // S.isWeekend / S.holiday* / S.isFirstFriday before Phase2-Transit on both
  // entry points; the weekend rng draw this used to make is gone.
  var dials = transitDials_(ctx);
  var dayType = S.isWeekend ? 'weekend' : 'weekday';
  var holidayName = S.holiday || '';
  var holiday = (holidayName && holidayName !== 'none') ? {
    label: S.holidayLabel || holidayName,
    priority: S.holidayPriority || 'none',
    major: S.holidayPriority === 'major',
    hood: S.holidayNeighborhood || ''
  } : null;

  // Read PREVIOUS cycle events — current cycle events don't exist yet (generated in Phase 4)
  // engine.183: from WorldEvents_V3_Ledger, which carries Domain + Neighborhood.
  var prevCycleEvents = loadPreviousCycleEvents_(ctx, cycle);
  var eventSummary = summarizePrevCycleEvents_(prevCycleEvents);
  var majorEvents = eventSummary.major;

  // engine.204/205 §2.2: game day is a HOME game this cycle (S.sportsWeek[f].h > 0); the
  // hoods are that franchise's own venue (the typed HomeNeighborhood is no longer read),
  // and the bump scales by its home volume (unsigned × venueShare). An away week puts
  // nothing on the stadium's stations — the watch parties are nightlife, not transit.
  var gameDayLoad = gameDayLoadByHood_(S);
  var gameDayHoods = Object.keys(gameDayLoad);
  var gameDay = gameDayHoods.length > 0;
  var gameDayPeak = 0;
  for (var gdh = 0; gdh < gameDayHoods.length; gdh++) gameDayPeak = Math.max(gameDayPeak, gameDayLoad[gameDayHoods[gdh]]);

  // engine.183: initiative build phases → the stations/corridors they touch.
  var initiativeEffects = initiativeTransitEffects_(S);

  // Get demographics for ridership correlation
  var demographics = {};
  if (typeof getNeighborhoodDemographics_ === 'function') {
    demographics = getNeighborhoodDemographics_(ss);
  }

  // engine.290 move 3 — ridership and street traffic from the ledgers. Shares
  // computed once per Cycle; the first Cycle on the new base says so on every
  // row (previousCycleState.transitBaseVersion, finalizeCycleState).
  var shares = transitStationShares_(ctx, demographics, dials, OAKLAND_BART_STATIONS || []);
  var corridorBase = transitCorridorBase_(S, dials);
  var prevBaseVersion = S.previousCycleState ? Number(S.previousCycleState.transitBaseVersion) || 0 : 0;
  var baseVersion = shares ? TRANSIT_BASE_VERSION : 1;
  // either direction: onto the ledger base, or a fall back to the authored table
  // after a ledger Cycle (codex 2026-10-15 §3) — last Cycle's numbers are not comparable
  var rebased = baseVersion !== prevBaseVersion;
  // engine.290 move 5 — last week's train trouble (the chaos car's carry)
  var chaosHits = transitChaosCarry_(S, cycle);

  // engine.290 move 4 — the crew is felt (governor) and named (always)
  var staffing = transitStaffing_(ctx);
  S.transitStaffing = staffing;
  var capacity = S.cityDynamicsCapacity || {};
  var transitCongestion = Number(capacity.transitCongestion) || 0;

  // Build context for modifiers
  var context = {
    weather: weatherType,
    season: season,
    dayType: dayType,
    events: majorEvents,
    gameDay: gameDay,
    gameDayHoods: gameDayHoods,
    gameDayLoad: gameDayLoad,
    gameDayPeak: gameDayPeak,
    eventHoods: eventSummary.byHood,
    initiatives: initiativeEffects,
    holiday: holiday,
    firstFriday: !!S.isFirstFriday,
    dials: dials,
    shares: shares,
    corridorBase: corridorBase,
    rebased: rebased,
    transitCongestion: transitCongestion,
    staffing: staffing,
    chaosHits: chaosHits,
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
    baseVersion: baseVersion,
    totalRidership: sumRidership_(stationMetrics),
    avgOnTime: avgOnTime_(stationMetrics),
    avgTraffic: avgTraffic_(corridorMetrics),
    factors: {
      weather: weatherType,
      dayType: dayType,
      holiday: holiday ? holiday.label + (holiday.major ? ' (major)' : '') : '',
      firstFriday: !!S.isFirstFriday,
      base: shares ? 'ledger' : 'table',
      rebased: rebased,
      transitCongestion: transitCongestion,
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
  // engine.290 move 5: the old 1.5% breakdown roll is gone — the dice live in
  // the chaos engine. A stalled train carried from last week (the train's one
  // high-severity outcome) is the no-weather "BART broke down" disruption.
  var stalled = null;
  for (var sc = 0; sc < chaosHits.length; sc++) if (chaosHits[sc].o === 'stalled_train') { stalled = chaosHits[sc]; break; }
  var disruptedNow = (avgOT < 0.72) || !!stalled;
  var disruptionCause = stalled ? 'BART train: stalled train in ' + stalled.h + ' (last week)' :
    (weatherType === 'storm' ? 'storm conditions' : 'system strain');
  // engine.290 move 4: a crew member out names the disruption
  if (staffing.short.length) {
    var shortNames = [];
    for (var sn = 0; sn < staffing.short.length; sn++) shortNames.push(staffing.short[sn].name + ' (' + staffing.short[sn].role + ')');
    disruptionCause += '; crew short: ' + shortNames.join(', ');
  }

  // worst 3 stations name the affected hoods (entities attached at generation)
  var otSorted = stationMetrics.slice().sort(function(a, b) {
    return a.onTimePerformance - b.onTimePerformance;
  });
  var affectedHoods = [];
  if (stalled && stalled.h) affectedHoods.push(stalled.h);   // engine.290: the stall's own hood leads
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
  // engine.206: a homestand is a transit seed. One ripple per franchise home week at its
  // primary venue hood — the economy's SPORTS_WEEK sits at venue[0] too, so the two seeds
  // about one homestand share a hood. Magnitude = the station lift the crowds took
  // (GAMEDAY_RIDERSHIP_BOOST × the week's home load, the same number :382 applies).
  if (typeof recordRipple_ === 'function') {
    var gdWeeks = S.sportsWeek || {};
    for (var gdf in gdWeeks) {
      if (!gdWeeks.hasOwnProperty(gdf)) continue;
      var gdw = gdWeeks[gdf];
      if (!(gdw && gdw.h > 0) || !(gdw.venue && gdw.venue.length)) continue;
      var gdLift = Math.round(TRANSIT_FACTORS.GAMEDAY_RIDERSHIP_BOOST *
        (Number(gdw.unsigned) || 0) * (Number(gdw.venueShare) || 0) * 1000) / 1000;
      if (!(gdLift > 0)) continue;
      recordRipple_(ctx, {
        causeType: 'transit-event',
        causeId: 'game-day-c' + cycle + ':' + gdf,
        causeDetail: gdf + ' home week — ' + gdw.h + ' home game' + (gdw.h === 1 ? '' : 's') +
          '; game-day crowds through ' + gdw.venue.join(', ') + ', station ridership up to +' + Math.round(gdLift * 100) + '%',
        effectType: 'game-day-crowds',
        targetScope: 'neighborhood',
        targetIds: gdw.venue.slice(),
        neighborhood: gdw.venue[0],
        magnitude: gdLift,
        duration: 1,
        sourceEngine: 'updateTransitMetrics'
      });
    }
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
  // engine.290 move 3 — base = transitCityRiders × this station's ledger share.
  // The authored baseRidership is read only when the shares cannot be built
  // (no Neighborhood_Demographics), and the row says `base: table`.
  var share = context.shares && context.shares.byStation[station.station];
  var baseRidership = (share !== undefined && share !== null)
    ? context.dials.transitCityRiders * share
    : (station.baseRidership || 5000);

  // Apply ridership modifier
  var ridershipMod = 1.0;
  if (typeof calculateRidershipModifier_ === 'function') {
    ridershipMod = calculateRidershipModifier_(context);
  } else {
    ridershipMod = calculateRidershipModLocal_(context);
  }

  // engine.290 move 3: the adults-ratio and commute-inbound multipliers that
  // stood here are the share now (residents, workers and retail per hood).

  // engine.290 move 2 — the one day-type rule (weekend / major holiday)
  ridershipMod *= transitDayMult_(context);

  var causes = [];
  // the station's own hood + the hoods it serves, each once
  var servedHoods = intersectHoods_([station.neighborhood].concat(station.corridors || []),
                                    [station.neighborhood].concat(station.corridors || []));

  // engine.290 move 2 — the holiday's own hood fills its station(s); First
  // Friday fills the stations whose catchment reaches the art walk.
  var hol = context.holiday;
  if (hol && hol.hood && station.neighborhood === hol.hood) {
    ridershipMod *= (1 + context.dials.transitHolidayHoodLift);
    causes.push(hol.label + ' in ' + hol.hood);
  }
  if (context.firstFriday && intersectHoods_(servedHoods, TRANSIT_FIRST_FRIDAY_HOODS).length > 0) {
    ridershipMod *= (1 + context.dials.transitFirstFridayLift);
    causes.push('First Friday');
  }

  // engine.183: game day lands on the stations serving where the game IS
  // (the home franchise's venue, engine.204/205), not on a station named 'Coliseum'.
  var gameHoodsHere = intersectHoods_(servedHoods, context.gameDayHoods || []);
  var gameDayHere = context.gameDay && gameHoodsHere.length > 0;
  if (gameDayHere) {
    ridershipMod *= (1 + TRANSIT_FACTORS.GAMEDAY_RIDERSHIP_BOOST * gameDayLoadAt_(gameHoodsHere, context.gameDayLoad));
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

  // engine.290 move 4 — the crew. Armed governor: no conductor and no
  // operator → fewer riders, later trains; no dispatcher → later trains and
  // weather bites twice as hard. Named cause (armed or not): a crew row in
  // care or custody.
  var crew = context.staffing;
  var governed = crew && context.dials.transitStaffingGovernor === 1;
  var noCrew = governed && crew.conductor === 0 && crew.operator === 0;
  var noDispatch = governed && crew.dispatcher === 0;
  if (noCrew) {
    ridershipMod *= context.dials.transitNoCrewRidershipMult;
    onTimeDelta -= context.dials.transitNoCrewOnTimeDrop;
    causes.push('no crew: no conductor or operator on the ledger');
  }
  if (noDispatch) {
    onTimeDelta -= context.dials.transitNoDispatchOnTimeDrop;
    causes.push('no dispatcher');
  }
  for (var cs = 0; crew && cs < crew.short.length; cs++) {
    causes.push('crew short: ' + crew.short[cs].name + ' (' + crew.short[cs].role + ')');
  }

  // engine.290 move 5 — a chaos-train hit last week at this station: the worst
  // delay applies (many hits never stack; a clean run never cancels one), and
  // every hit is named.
  var chaosDelay = 0;
  var hits = context.chaosHits || [];
  for (var ch = 0; ch < hits.length; ch++) {
    if ((hits[ch].s || []).indexOf(station.station) < 0) continue;
    chaosDelay = Math.max(chaosDelay, Number(hits[ch].d) || 0);
    causes.push('BART train: ' + transitChaosWords_(hits[ch].o) + ' in ' + hits[ch].h + ' (last week)');
  }
  onTimeDelta -= chaosDelay;

  // Random variance
  var variance = 0.9 + (rng() * 0.2); // 90-110%
  var ridership = Math.round(baseRidership * ridershipMod * variance);

  // On-time performance
  var onTime = TRANSIT_FACTORS.BASE_ON_TIME;
  if (context.weather === 'storm') {
    onTime -= 0.15;
  } else if (context.weather === 'rain' || context.weather === 'fog') {
    onTime -= noDispatch ? 0.10 : 0.05;   // engine.290: no dispatcher, the weather penalty doubles
  }
  // engine.290 move 3 — crowding from the sim: the city's own transit
  // congestion (applyCityDynamics_, 0-0.38) replaces the events>2 hardcode.
  if (context.transitCongestion > 0) {
    onTime -= context.transitCongestion * context.dials.transitCongestionOnTimeMult;
  }
  onTime += onTimeDelta;
  onTime += (rng() - 0.5) * TRANSIT_FACTORS.ON_TIME_VARIANCE;
  onTime = Math.max(0.6, Math.min(0.98, onTime));

  causes = transitBaseCauses_(context, context.shares ? (context.shares.missing[station.station] || []) : []).concat(causes);
  var notes = generateStationNotes_(station, ridership, onTime, gameDayHere, baseRidership);
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
  // engine.290: every holiday is named; only a major one cuts (transitDayMult_)
  if (context.holiday) parts.push('holiday: ' + context.holiday.label + (context.holiday.major ? ' (major)' : ' (no cut)'));
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
  // engine.290 move 3 — base = transitCityTraffic × the corridor's hoods'
  // traffic multiplier against the city mean (× transitFreewayMult on a
  // freeway). The authored baseTrafficIndex is the no-dynamics fallback.
  var cb = context.corridorBase;
  var baseTraffic = cb ? transitCorridorBaseFor_(corridor, cb, context.dials) : (corridor.baseTrafficIndex || 50);

  // Apply traffic modifier
  var trafficMod = 1.0;
  if (typeof calculateTrafficModifier_ === 'function') {
    trafficMod = calculateTrafficModifier_(context);
  } else {
    trafficMod = calculateTrafficModLocal_(context);
  }

  // engine.290 move 2 — the one day-type rule (weekend / major holiday)
  trafficMod *= transitDayMult_(context);

  var causes = [];
  var hoods = corridor.hoods || [];

  // engine.290 move 2 — the holiday hood's surface streets; First Friday's two.
  var hol = context.holiday;
  if (hol && hol.hood && !corridor.freeway && hoods.indexOf(hol.hood) >= 0) {
    trafficMod *= (1 + context.dials.transitHolidayHoodLift);
    causes.push(hol.label + ' in ' + hol.hood);
  }
  if (context.firstFriday && TRANSIT_FIRST_FRIDAY_CORRIDORS.indexOf(corridor.corridor) >= 0) {
    trafficMod *= (1 + context.dials.transitFirstFridayLift);
    causes.push('First Friday');
  }

  // engine.183: game-day traffic loads the corridors through the game's hoods
  // (Baylight → I-880; the legacy Jack London / Downtown zones → I-880 North,
  // I-980, Broadway, Telegraph), not a string-matched pair.
  var gameHoodsHere = intersectHoods_(hoods, context.gameDayHoods || []);
  var gameDayHere = context.gameDay && gameHoodsHere.length > 0;
  if (gameDayHere) {
    trafficMod *= (1 + TRANSIT_FACTORS.GAMEDAY_TRAFFIC_INCREASE * gameDayLoadAt_(gameHoodsHere, context.gameDayLoad));
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

  causes = transitBaseCauses_(context, []).concat(causes);
  if (!cb) causes[0] = 'base: table';

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

  // engine.290: day type lives in transitDayMult_, applied once by the caller

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

  if (context.gameDay) mod *= 1 + 0.25 * (Number(context.gameDayPeak) || 0);   // engine.204/205: by home volume

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
 * engine.183 — where the game is this cycle. engine.204/205: the venue of every
 * franchise that played at home (S.sportsWeek[f].venue — legacy Jack London /
 * Downtown until Baylight opens, then Baylight District); the typed
 * HomeNeighborhood is no longer read. Canon hood names only.
 *
 * @param {Object} S - ctx.summary
 * @return {Array<string>}
 */
function gameDayHoodsFor_(S) {
  return Object.keys(gameDayLoadByHood_(S));
}

// engine.204/205 §2.2: {hood: home volume} for every franchise that played at home this
// Cycle — unsigned × venueShare at its own venue (max when two franchises share a hood).
function gameDayLoadByHood_(S) {
  var out = {};
  var weeks = (S && S.sportsWeek) || {};
  for (var f in weeks) {
    if (!weeks.hasOwnProperty(f) || !(weeks[f] && weeks[f].h > 0)) continue;
    var x = (Number(weeks[f].unsigned) || 0) * (Number(weeks[f].venueShare) || 0);
    var venue = weeks[f].venue || [];
    for (var i = 0; i < venue.length; i++) {
      if (venue[i] && !(out[venue[i]] >= x)) out[venue[i]] = x;
    }
  }
  return out;
}

function gameDayLoadAt_(hoods, load) {
  var x = 0;
  for (var i = 0; i < (hoods || []).length; i++) x = Math.max(x, Number((load || {})[hoods[i]]) || 0);
  return x;
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
      // civic.38 ruling (g): the open lift scales with upkeep. The slice carries
      // the tend factor (1 = tended, or a row the stage model never touches);
      // the phase stays the gate, the factor is the strength. Never below an
      // ordinary station. Construction above stays all-or-nothing — neglect does
      // not make a building site quieter.
      var tend = (typeof it.tend === 'number' && isFinite(it.tend)) ? Math.max(0, Math.min(1, it.tend)) : 1;
      if (tend >= 1) {
        out.stations.push({ hoods: hoods, ridershipMult: TRANSIT_CAUSES.OPEN_RIDERSHIP_MULT, onTimeDelta: TRANSIT_CAUSES.OPEN_ON_TIME_LIFT, tag: tag });
      } else {
        tag = tag + ' (upkeep ' + tend.toFixed(2) + ')';
        out.stations.push({
          hoods: hoods,
          ridershipMult: 1 + (TRANSIT_CAUSES.OPEN_RIDERSHIP_MULT - 1) * tend,
          onTimeDelta: TRANSIT_CAUSES.OPEN_ON_TIME_LIFT * tend,
          tag: tag
        });
      }
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
  return gameDayHoodsFor_(ctx.summary || {}).length > 0;   // engine.204/205: a home game
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
function generateStationNotes_(station, ridership, onTime, gameDayHere, base) {
  var ref = base || station.baseRidership;
  var notes = [];

  if (gameDayHere) {
    notes.push('game day crowds');
  }
  if (onTime < 0.75) {
    notes.push('service delays');
  } else if (onTime > 0.92) {
    notes.push('smooth operations');
  }
  if (ridership > ref * 1.2) {
    notes.push('above-average ridership');
  } else if (ridership < ref * 0.6) {
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
  if (f.holiday) parts.push(f.holiday);
  if (f.firstFriday) parts.push('First Friday');
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
