/**
 * ============================================================================
 * buildEveningFood_ v2.5
 * ============================================================================
 *
 * World-aware restaurant/food selection with GodWorld Calendar integration.
 *
 * v2.5 Changes (engine.134 Task 5, S423):
 * - Every name comes from the live Business_Ledger (ADR-0016: the ledger is
 *   the truth). The embedded pools (three dozen invented names across a dozen
 *   themed lists) are gone — a restaurant the ledger does not carry does not
 *   exist tonight.
 * - Calendar / season / sports / mood no longer swap POOLS; they BIAS which
 *   hoods the picker leans toward (Chinatown on Lunar New Year, Fruitvale on
 *   Cinco / Día, the sports zone on Opening Day, the arts corridor on First
 *   Friday) and still name the trend.
 * - Arts hoods are the ledger's `employerCharacter` in {arts, nightlife}
 *   (Neighborhood_Map B1, via S.neighborhoodState); the sports zone is
 *   S.sportsZones when set (engine.131 T7), Jack London until it lights.
 * - A hood with no food rows is skipped, never invented. Output shape is
 *   unchanged (restaurants / restaurantDetails / fast / fastDetails / trend /
 *   economicInfluence / calendarContext); details now carry bizId.
 *
 * v2.3: ES5 compatible. v2.2: calendar integration.
 *
 * ============================================================================
 */

function buildEveningFood_(ctx) {

  // Defensive guard
  if (!ctx || !ctx.summary) {
    if (ctx) ctx.summary = {};
    else return;
  }

  var rng = safeRand_(ctx);
  var S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || { sentiment: 0, traffic: 1, culturalActivity: 1, communityEngagement: 1 };
  var sentiment = dynamics.sentiment || 0;
  var traffic = dynamics.traffic || 1;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;
  var nightlife = S.nightlifeVolume || 5;
  var econMood = S.economicMood || 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // THE LEDGER (v2.5) — fail-soft Business_Ledger read, same pattern as
  // buildEveningFamous_ / contractSeedBackdropIndex_. Empty on any failure.
  // ═══════════════════════════════════════════════════════════════════════════
  var index = buildEveningFoodIndex_(ctx);

  // Hood sets the biases lean on — read from the ledger, never listed here.
  var artsHoods = eveningFoodHoodsByCharacter_(S, { arts: true, nightlife: true });
  var sportsHoods = (S.sportsZones && S.sportsZones.length) ? S.sportsZones.slice() : ["Jack London"]; // engine.131 T7 dark → Jack London

  // ═══════════════════════════════════════════════════════════════════════════
  // WEIGHT THE DRAW — every ledger row starts at weight 1; each bias that names
  // a row's hood adds to its weight. The draw is weighted sampling WITHOUT
  // replacement, so a lean changes the odds and never the honesty of the list.
  // (v2.4 concatenated pool copies and then deduped by name, which cancelled
  // every lean it thought it was applying.)
  // ═══════════════════════════════════════════════════════════════════════════
  var candidates = dedupeByName_(index.restaurants);
  var weight = {};
  for (var c = 0; c < candidates.length; c++) weight[candidates[c].name] = 1;
  var lean = function(hoods, amount) {
    for (var r = 0; r < candidates.length; r++) {
      if (hoods.indexOf(candidates[r].neighborhood) !== -1) weight[candidates[r].name] += amount;
    }
  };
  var addNightlife = function() {
    var extra = dedupeByName_(index.nightlife);
    for (var n = 0; n < extra.length; n++) {
      if (weight[extra[n].name] === undefined) { candidates.push(extra[n]); weight[extra[n].name] = 1; }
    }
  };

  if (holiday === "LunarNewYear") lean(["Chinatown"], 3);
  if (holiday === "CincoDeMayo" || holiday === "DiaDeMuertos") lean(["Fruitvale"], 3);
  if (holiday === "OpeningDay") lean(sportsHoods, 3);
  if (holiday === "Independence" || holiday === "MemorialDay" || holiday === "LaborDay") lean(["Jack London", "Lake Merritt"], 1); // waterfront summer
  if (holiday === "OaklandPride") lean(artsHoods, 2);
  if (isFirstFriday) { lean(artsHoods, 2); addNightlife(); }
  if (sportsSeason === "championship") lean(sportsHoods, 3);
  else if (sportsSeason === "playoffs" || sportsSeason === "post-season") lean(sportsHoods, 2);
  else if (sportsSeason === "late-season") lean(sportsHoods, 1);
  if (culturalActivity >= 1.4) lean(artsHoods, 1);
  if (nightlife >= 7) addNightlife();

  // ═══════════════════════════════════════════════════════════════════════════
  // FAST FOOD — the ledger's quick-service rows. One tracked chain is one name.
  // ═══════════════════════════════════════════════════════════════════════════
  var fastCandidates = dedupeByName_(index.fast);

  // ═══════════════════════════════════════════════════════════════════════════
  // PICK FINAL OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  var restaurantCount = rng() < 0.3 ? 3 : 2;
  if (holidayPriority === "major" || holidayPriority === "oakland") restaurantCount = 3;
  if (isFirstFriday) restaurantCount = 3;
  if (sportsSeason === "championship") restaurantCount = 4;

  var selectedRestaurants = weightedDrawWithoutReplacement_(candidates, weight, restaurantCount, rng);
  var selectedFast = weightedDrawWithoutReplacement_(fastCandidates, {}, sportsSeason !== "off-season" ? 2 : 1, rng);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD TREND DESCRIPTION (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════
  var trend = "Standard evening dining rhythm";

  if (holiday === "Thanksgiving") {
    trend = "Thanksgiving feast dining - family gatherings";
  } else if (holiday === "Holiday" || holiday === "NewYearsEve") {
    trend = "Holiday celebration dining - festive atmosphere";
  } else if (holiday === "LunarNewYear") {
    trend = "Lunar New Year dining - Chinatown spotlight";
  } else if (holiday === "CincoDeMayo") {
    trend = "Cinco de Mayo dining - Fruitvale fiesta";
  } else if (holiday === "DiaDeMuertos") {
    trend = "Día de los Muertos dining - traditional remembrance";
  } else if (holiday === "Independence" || holiday === "MemorialDay" || holiday === "LaborDay") {
    trend = "BBQ and outdoor dining - summer celebration";
  } else if (holiday === "OaklandPride") {
    trend = "Pride celebration dining - inclusive atmosphere";
  } else if (holiday === "OpeningDay") {
    trend = "Opening Day dining - stadium district buzzing";
  } else if (isFirstFriday) {
    trend = "First Friday arts district dining - gallery crowd";
  } else if (isCreationDay) {
    trend = "Creation Day community dining - local roots";
  } else if (sportsSeason === "championship") {
    trend = "Championship fever dining - game day crowds";
  } else if (sportsSeason === "playoffs") {
    trend = "Playoff tension dining - sports bar surge";
  } else if (chaos.length > 0) {
    trend = "High mobility / civic-tension food trend";
  } else if (nightlife >= 7) {
    trend = "Late-night dining surge";
  } else if (weather.impact >= 1.3) {
    trend = "Weather-driven comfort food trend";
  } else if (weatherMood.primaryMood === 'cozy') {
    trend = "Cozy weather comfort dining";
  } else if (econMood <= 35) {
    trend = "Budget-conscious dining patterns";
  } else if (econMood >= 65) {
    trend = "Economic optimism dining uplift";
  } else if (sentiment >= 0.3) {
    trend = "Positive-mood dining uplift";
  } else if (sentiment <= -0.3) {
    trend = "Comfort-seeking casual dining";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  var restaurantNames = [];
  for (var k = 0; k < selectedRestaurants.length; k++) restaurantNames.push(selectedRestaurants[k].name);
  var fastNames = [];
  for (var m = 0; m < selectedFast.length; m++) fastNames.push(selectedFast[m].name);

  S.eveningFood = {
    restaurants: restaurantNames,
    restaurantDetails: selectedRestaurants,
    fast: fastNames,
    fastDetails: selectedFast,
    trend: trend,
    economicInfluence: econMood <= 35 ? 'budget' : econMood >= 65 ? 'upscale' : 'normal',
    calendarContext: {
      holiday: holiday,
      holidayPriority: holidayPriority,
      isFirstFriday: isFirstFriday,
      isCreationDay: isCreationDay,
      sportsSeason: sportsSeason
    }
  };

  ctx.summary = S;
}

/**
 * Business_Ledger → { restaurants, nightlife, fast } (each [{ bizId, name,
 * neighborhood, sector }]). Classified by the ledger's own Sector text:
 *   fast       — quick service
 *   nightlife  — bars, lounges, clubs, nightlife & entertainment, hospitality
 *   restaurant — restaurant / dining / cafe / food / bakery / beverage / market
 * A row can be both restaurant and nightlife (Sports Bar & Dining). Fast rows
 * are never restaurants. Fail-soft: any read failure yields three empty lists.
 */
function buildEveningFoodIndex_(ctx) {
  var out = { restaurants: [], nightlife: [], fast: [] };
  var FAST_RE = /fast food|quick service/i;
  var NIGHT_RE = /nightlife|\bbar\b|lounge|club|hospitality/i;
  var FOOD_RE = /restaurant|dining|cafe|café|food|bakery|beverage|market/i;
  try {
    var bs = ctx && ctx.ss && typeof ctx.ss.getSheetByName === 'function' ? ctx.ss.getSheetByName('Business_Ledger') : null;
    if (!bs || bs.getLastRow() <= 1) return out;
    var vv = bs.getDataRange().getValues();
    var h = vv[0];
    var iId = h.indexOf('BIZ_ID');
    var iName = h.indexOf('Name');
    var iHood = h.indexOf('Neighborhood');
    var iSector = h.indexOf('Sector');
    if (iName < 0 || iHood < 0 || iSector < 0) return out;
    for (var r = 1; r < vv.length; r++) {
      var name = String(vv[r][iName] || '').trim();
      var hood = String(vv[r][iHood] || '').trim();
      var sector = String(vv[r][iSector] || '').trim();
      if (!name || !hood || !sector) continue;
      var row = { bizId: iId >= 0 ? String(vv[r][iId] || '') : '', name: name, neighborhood: hood, sector: sector };
      if (FAST_RE.test(sector)) { out.fast.push(row); continue; }
      if (NIGHT_RE.test(sector)) out.nightlife.push(row);
      if (FOOD_RE.test(sector)) out.restaurants.push(row);
    }
  } catch (e) {
    try { Logger.log('buildEveningFood_ ledger read failed (fail-soft): ' + e); } catch (ig) {}
  }
  return out;
}

/** Hoods whose Neighborhood_Map employerCharacter is one of the given labels. */
function eveningFoodHoodsByCharacter_(S, labels) {
  var hoods = [];
  var ns = S && S.neighborhoodState;
  if (!ns) return hoods;
  for (var hood in ns) {
    if (!ns.hasOwnProperty(hood)) continue;
    var ch = String((ns[hood] && ns[hood].employerCharacter) || '').toLowerCase();
    if (ch && labels[ch]) hoods.push(hood);
  }
  return hoods;
}

/**
 * Weighted sampling without replacement (ES5, ctx.rng only). weight[name]
 * missing → 1. Returns at most count items; an empty list returns [].
 */
function weightedDrawWithoutReplacement_(items, weight, count, rng) {
  var pool = items.slice();
  var out = [];
  while (pool.length && out.length < count) {
    var total = 0;
    for (var i = 0; i < pool.length; i++) total += (weight[pool[i].name] || 1);
    var r = rng() * total;
    var idx = 0;
    for (var j = 0; j < pool.length; j++) {
      r -= (weight[pool[j].name] || 1);
      if (r < 0) { idx = j; break; }
      idx = j;
    }
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

/** ES5 dedupe by name, first occurrence wins. */
function dedupeByName_(arr) {
  var seen = {};
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    if (!arr[i] || seen[arr[i].name]) continue;
    seen[arr[i].name] = true;
    out.push(arr[i]);
  }
  return out;
}
