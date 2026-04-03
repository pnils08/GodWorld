/**
 * ============================================================================
 * buildCityEveningSystems_ v2.3 (refactor-safe)
 * ============================================================================
 *
 * World-aware evening systems with GodWorld Calendar integration.
 *
 * v2.3 Changes:
 * - Flexible header lookup for World_Population (case-insensitive)
 * - Table-driven modifiers instead of long if-chains
 * - Crowd map generated from neighborhoods array (prevents drift)
 * - Uses trafficDyn baseline modifier
 * - Guard for missing ctx.summary
 * - ES5 compatible
 *
 * v2.2 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific traffic patterns
 * - Holiday-specific nightlife volume modifiers
 * - Holiday-specific crowd distribution
 * - First Friday arts district surge
 * - Creation Day community gathering
 * - Sports season effects
 * - Calendar context in output
 *
 * Calculates:
 * - nightShiftLoad
 * - eveningTraffic
 * - nightlifeVolume
 * - eveningSafety
 * - weatherImpact
 * - crowdMap (Oakland neighborhoods)
 *
 * ============================================================================
 */

function buildCityEveningSystems_(ctx) {

  // Guard for missing ctx.summary
  var S = ctx.summary || (ctx.summary = {});

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {};
  var sentiment = dynamics.sentiment || 0;
  var publicSpace = dynamics.publicSpaces || 1;
  var trafficDyn = dynamics.traffic || 1;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;
  var econMood = S.economicMood || 50;

  var nightlife = S.nightlife || {};
  var sports = S.eveningSports || "";
  var cityEvents = S.cityEvents || [];
  var cityEventDetails = S.cityEventDetails || [];

  // CALENDAR CONTEXT
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;
  var sportsSeason = S.sportsSeason || "off-season";

  // Oakland neighborhoods
  var neighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  // Flexible header lookup with case-insensitive fallback
  function headerIndexFlexible_(header, candidates) {
    var i, j, lower, target, idx;
    // Exact match first
    for (i = 0; i < candidates.length; i++) {
      for (j = 0; j < header.length; j++) {
        if (header[j] === candidates[i]) return j;
      }
    }
    // Case-insensitive fallback
    lower = [];
    for (i = 0; i < header.length; i++) {
      lower[i] = (header[i] || "").toString().toLowerCase();
    }
    for (i = 0; i < candidates.length; i++) {
      target = candidates[i].toLowerCase();
      for (j = 0; j < lower.length; j++) {
        if (lower[j] === target) return j;
      }
    }
    return -1;
  }

  function addModifiers_(score, map, key) {
    if (!map || !key) return score;
    return score + (map[key] || 0);
  }

  function applyCrowdBoosts_(crowd, boosts) {
    if (!boosts) return;
    for (var i = 0; i < boosts.length; i++) {
      var pair = boosts[i];
      var n = pair[0], d = pair[1];
      if (crowd[n] !== undefined) crowd[n] += d;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NIGHT SHIFT LOAD
  // ═══════════════════════════════════════════════════════════════════════════
  var nightShiftLoad = 0;
  var wp = ctx.ss.getSheetByName('World_Population');

  if (wp) {
    var lastCol = wp.getLastColumn();
    if (lastCol > 0) {
      var header = wp.getRange(1, 1, 1, lastCol).getValues()[0] || [];
      var row = wp.getRange(2, 1, 1, lastCol).getValues()[0] || [];

      var iTotal = headerIndexFlexible_(header, ["totalPopulation", "TotalPopulation", "PopulationTotal"]);
      var iEmp = headerIndexFlexible_(header, ["employmentRate", "EmploymentRate", "employment_rate"]);

      var totalPop = iTotal >= 0 ? Number(row[iTotal] || 0) : 0;
      var empRate = iEmp >= 0 ? Number(row[iEmp] || 0) : 0;

      var activeWorkers = Math.round(totalPop * empRate);

      var nightRate = 0.12;
      if (season === "Winter") nightRate += 0.01;
      if (weather.impact >= 1.3) nightRate -= 0.02;
      if (econMood <= 35) nightRate -= 0.01;
      if (econMood >= 65) nightRate += 0.01;

      // Holiday adjustments
      if (holiday === "Thanksgiving" || holiday === "Holiday") nightRate -= 0.03;
      if (holiday === "NewYearsEve") nightRate += 0.02;
      if (holiday === "LaborDay") nightRate -= 0.02;

      nightShiftLoad = Math.max(0, Math.round(activeWorkers * nightRate));
    }
  }

  S.nightShiftLoad = nightShiftLoad;

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENING TRAFFIC SCORE + LABEL
  // ═══════════════════════════════════════════════════════════════════════════
  var trafficScore = 0;

  var barCount = nightlife.spots ? nightlife.spots.length : 0;

  trafficScore += cityEvents.length * 2;
  if (sports && sports !== "(none)") trafficScore += 3;
  trafficScore += barCount;

  if (publicSpace >= 1.3) trafficScore += 2;
  if (trafficDyn >= 1.3) trafficScore += 1;
  if (trafficDyn <= 0.8) trafficScore -= 1;

  if (chaos.length >= 3) trafficScore += 2;

  if (weather.impact >= 1.3) trafficScore -= 2;
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.3) trafficScore -= 1;

  if (econMood >= 65) trafficScore += 1;
  if (econMood <= 35) trafficScore -= 1;

  if (sentiment >= 0.3) trafficScore += 1;
  if (sentiment <= -0.3) trafficScore -= 1;

  // Table-driven holiday modifiers
  var TRAFFIC_HOLIDAY = {
    NewYearsEve: 5,
    OaklandPride: 4,
    ArtSoulFestival: 4,
    Independence: 3,
    Halloween: 3,
    LunarNewYear: 3,
    CincoDeMayo: 3,
    Juneteenth: 2,
    OpeningDay: 3
  };
  var TRAFFIC_QUIET = { Thanksgiving: -2, Holiday: -2, Easter: -2 };

  trafficScore = addModifiers_(trafficScore, TRAFFIC_HOLIDAY, holiday);
  trafficScore = addModifiers_(trafficScore, TRAFFIC_QUIET, holiday);

  if (isFirstFriday) trafficScore += 3;
  if (isCreationDay) trafficScore += 2;

  if (sportsSeason === "championship") trafficScore += 4;
  if (sportsSeason === "playoffs") trafficScore += 3;

  var eveningTraffic = "light";
  if (trafficScore >= 10) eveningTraffic = "gridlock";
  else if (trafficScore >= 8) eveningTraffic = "heavy";
  else if (trafficScore >= 4) eveningTraffic = "moderate";

  S.eveningTraffic = eveningTraffic;

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER IMPACT
  // ═══════════════════════════════════════════════════════════════════════════
  S.weatherImpact = weather.impact || 1;
  S.weatherType = weather.type || "clear";

  // ═══════════════════════════════════════════════════════════════════════════
  // NIGHTLIFE VOLUME (0–10)
  // ═══════════════════════════════════════════════════════════════════════════
  var volume = 4;

  volume += cityEvents.length;
  if (sports && sports !== "(none)") volume += 2;
  volume += barCount;

  if (eveningTraffic === "heavy" || eveningTraffic === "gridlock") volume += 2;
  if (publicSpace >= 1.4) volume += 2;

  if (sentiment >= 0.3) volume += 1;
  if (sentiment <= -0.3) volume -= 2;

  if (econMood >= 65) volume += 1;
  if (econMood <= 35) volume -= 1;

  if (weather.impact >= 1.3) volume -= 2;
  if (weatherMood.perfectWeather) volume += 1;
  if (chaos.length >= 3) volume -= 2;

  if (season === "Summer") volume += 1;
  if (season === "Winter") volume -= 1;

  // Table-driven volume modifiers
  var VOLUME_HOLIDAY = {
    NewYearsEve: 4,
    Halloween: 3,
    OaklandPride: 3,
    StPatricksDay: 3,
    CincoDeMayo: 2,
    Independence: 2
  };
  var VOLUME_QUIET = {
    Thanksgiving: -2,
    Holiday: -1,
    Easter: -2,
    MothersDay: -1,
    FathersDay: -1
  };

  volume = addModifiers_(volume, VOLUME_HOLIDAY, holiday);
  volume = addModifiers_(volume, VOLUME_QUIET, holiday);

  if (isFirstFriday) volume += 2;
  if (isCreationDay) volume += 1;

  if (sportsSeason === "championship") volume += 3;
  if (sportsSeason === "playoffs") volume += 2;
  if (holiday === "OpeningDay") volume += 2;

  if (culturalActivity >= 1.4) volume += 1;

  volume = clamp(volume, 0, 10);
  S.nightlifeVolume = volume;

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENING SAFETY ATMOSPHERE
  // ═══════════════════════════════════════════════════════════════════════════
  var safety = "calm";

  if (chaos.length >= 3) safety = "tense";
  if (S.shockFlag === "shock-flag") safety = "tense";
  if (S.civicLoad === "load-strain") safety = "tense";
  if (sentiment <= -0.4) safety = "uneasy";

  if (safety === "calm" && S.civicLoad === "minor-variance") safety = "normal";
  if (safety === "calm" && econMood <= 35) safety = "cautious";

  if (holiday === "NewYearsEve" || holiday === "Halloween") {
    if (safety === "calm" || safety === "normal") safety = "festive-crowded";
  }
  if (holiday === "OaklandPride" || holiday === "ArtSoulFestival") {
    if (safety === "calm" || safety === "normal") safety = "celebratory";
  }
  if (isFirstFriday) {
    if (safety === "calm") safety = "art-walk-energy";
  }

  S.eveningSafety = safety;

  // ═══════════════════════════════════════════════════════════════════════════
  // CROWD DISTRIBUTION MAP (generated from neighborhoods array)
  // ═══════════════════════════════════════════════════════════════════════════
  var crowd = {};
  for (var ni = 0; ni < neighborhoods.length; ni++) {
    crowd[neighborhoods[ni]] = 1;
  }

  // Baseline bumps
  crowd["Downtown"] = 2;
  crowd["Jack London"] = 2;

  // Table-driven holiday crowd boosts
  var HOLIDAY_CROWD = {
    LunarNewYear:    [["Chinatown", 5], ["Downtown", 2]],
    CincoDeMayo:     [["Fruitvale", 5], ["Downtown", 1]],
    DiaDeMuertos:    [["Fruitvale", 5], ["Downtown", 1]],
    Juneteenth:      [["West Oakland", 4], ["Downtown", 2], ["Lake Merritt", 2]],
    OaklandPride:    [["Downtown", 4], ["Lake Merritt", 3], ["Uptown", 3]],
    ArtSoulFestival: [["Downtown", 5], ["Lake Merritt", 2]],
    NewYearsEve:     [["Downtown", 4], ["Jack London", 3], ["Uptown", 2]],
    Halloween:       [["Temescal", 3], ["Rockridge", 2], ["Lake Merritt", 2]],
    Independence:    [["Jack London", 3], ["Lake Merritt", 2]],
    OpeningDay:      [["Jack London", 5], ["Downtown", 2]]
  };

  applyCrowdBoosts_(crowd, HOLIDAY_CROWD[holiday]);

  if (isFirstFriday) {
    applyCrowdBoosts_(crowd, [
      ["Uptown", 4], ["KONO", 3], ["Temescal", 2], ["Jack London", 1], ["Downtown", 1]
    ]);
  }

  if (isCreationDay) {
    applyCrowdBoosts_(crowd, [
      ["Downtown", 3], ["West Oakland", 2], ["Lake Merritt", 2], ["Jack London", 1]
    ]);
  }

  if (sportsSeason === "championship") {
    applyCrowdBoosts_(crowd, [["Jack London", 4], ["Downtown", 3], ["Lake Merritt", 2]]);
  } else if (sportsSeason === "playoffs") {
    applyCrowdBoosts_(crowd, [["Jack London", 3], ["Downtown", 2]]);
  }

  // Event-driven distribution (details)
  for (var ei = 0; ei < cityEventDetails.length; ei++) {
    var evDetail = cityEventDetails[ei];
    var evN = evDetail && evDetail.neighborhood;
    if (evN && crowd[evN] !== undefined) crowd[evN] += 2;
  }

  // Fallback string events
  for (var si = 0; si < cityEvents.length; si++) {
    var ev = cityEvents[si];
    if (typeof ev === "string") {
      for (var sj = 0; sj < neighborhoods.length; sj++) {
        var n = neighborhoods[sj];
        if (ev.indexOf(n) >= 0) crowd[n] += 2;
      }
    }
  }

  // Sports → Jack London / Downtown cluster
  if (sports && sports !== "(none)") {
    crowd["Jack London"] += 2;
    crowd["Downtown"] += 1;
  }

  // Nightlife clusters
  if (nightlife.spotDetails && nightlife.spotDetails.length) {
    for (var nli = 0; nli < nightlife.spotDetails.length; nli++) {
      var spot = nightlife.spotDetails[nli] || {};
      var spotN = spot.neighborhood || "";
      if (crowd[spotN] !== undefined) crowd[spotN] += 1;
    }
  }

  // Volume-based distribution
  if (volume >= 7) {
    crowd["Downtown"] += 2;
    crowd["Jack London"] += 1;
    crowd["Temescal"] += 1;
    crowd["Uptown"] += 1;
  }
  if (volume >= 9) {
    crowd["Lake Merritt"] += 1;
    crowd["KONO"] += 1;
  }

  // Weather pushes crowds indoors
  if (weather.impact >= 1.3) {
    crowd["Lake Merritt"] -= 1;
    crowd["Jack London"] -= 1;
    crowd["Downtown"] += 2;
    crowd["Temescal"] += 1;
    crowd["Uptown"] += 1;
  }

  // Perfect weather spreads crowds outdoors
  if (weatherMood.perfectWeather) {
    crowd["Lake Merritt"] += 2;
    crowd["Jack London"] += 1;
    crowd["Piedmont Ave"] += 1;
  }

  // Chaos disperses downtown crowds
  if (chaos.length >= 3) {
    crowd["Downtown"] -= 2;
    crowd["Fruitvale"] += 1;
    crowd["Laurel"] += 1;
    crowd["Piedmont Ave"] += 1;
  }

  // Economic effects
  if (econMood >= 65) {
    crowd["Rockridge"] += 1;
    crowd["Jack London"] += 1;
    crowd["Piedmont Ave"] += 1;
  }
  if (econMood <= 35) {
    crowd["Rockridge"] -= 1;
    crowd["Fruitvale"] += 1;
    crowd["West Oakland"] += 1;
  }

  // Cultural activity
  if (culturalActivity >= 1.4) {
    crowd["Uptown"] += 1;
    crowd["KONO"] += 1;
  }

  // Community engagement
  if (communityEngagement >= 1.4) {
    crowd["West Oakland"] += 1;
    crowd["Fruitvale"] += 1;
  }

  // v2.4: Sports neighborhood effects (game-day crowd boost)
  var sportsEffects = S.sportsNeighborhoodEffects || {};
  var sportsHoods = Object.keys(sportsEffects);
  for (var shi = 0; shi < sportsHoods.length; shi++) {
    var sHood = sportsHoods[shi];
    var effects = sportsEffects[sHood];
    if (effects && effects.traffic > 0) {
      if (!crowd[sHood]) crowd[sHood] = 0;
      crowd[sHood] += Math.round(effects.traffic * 10);
    }
  }

  // Prevent negatives
  var crowdKeys = Object.keys(crowd);
  for (var ck = 0; ck < crowdKeys.length; ck++) {
    if (crowd[crowdKeys[ck]] < 0) crowd[crowdKeys[ck]] = 0;
  }

  S.crowdMap = crowd;

  // Hotspots (top 3)
  var sortedCrowd = [];
  for (var sk = 0; sk < crowdKeys.length; sk++) {
    sortedCrowd.push([crowdKeys[sk], crowd[crowdKeys[sk]]]);
  }
  sortedCrowd.sort(function(a, b) { return b[1] - a[1]; });
  S.crowdHotspots = [];
  for (var hi = 0; hi < Math.min(3, sortedCrowd.length); hi++) {
    S.crowdHotspots.push(sortedCrowd[hi][0]);
  }

  // Calendar context output
  S.eveningSystemsCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    trafficScore: trafficScore,
    volumeScore: volume
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * EVENING SYSTEMS REFERENCE
 * ============================================================================
 *
 * Outputs:
 * - nightShiftLoad: Active night shift workers
 * - eveningTraffic: light | moderate | heavy | gridlock
 * - nightlifeVolume: 0-10 scale
 * - eveningSafety: calm | normal | cautious | uneasy | tense | festive-crowded | celebratory | art-walk-energy
 * - weatherImpact: Weather impact modifier
 * - weatherType: Current weather type
 * - crowdMap: Neighborhood crowd distribution
 * - crowdHotspots: Top 3 busiest neighborhoods
 * - eveningSystemsCalendarContext: Calendar state snapshot
 *
 * Dependencies:
 * - S.season, S.weather, S.weatherMood
 * - S.worldEvents (chaos)
 * - S.cityDynamics (sentiment, publicSpaces, traffic, culturalActivity, communityEngagement)
 * - S.economicMood
 * - S.nightlife, S.eveningSports, S.cityEvents, S.cityEventDetails
 * - S.holiday, S.holidayPriority, S.isFirstFriday, S.isCreationDay, S.sportsSeason
 * - World_Population sheet (totalPopulation, employmentRate)
 *
 * v2.3 Improvements:
 * - Flexible header lookup (case-insensitive fallback)
 * - Table-driven modifiers (easier to maintain)
 * - Crowd map generated from neighborhoods array (prevents drift)
 * - trafficDyn used as baseline modifier
 * - LunarNewYear included (may not fire if not in getSimHoliday_)
 *
 * ============================================================================
 */
