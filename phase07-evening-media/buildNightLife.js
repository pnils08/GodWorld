/**
 * ============================================================================
 * buildNightlife_ v2.4
 * ============================================================================
 *
 * World-aware nightlife generator with GodWorld Calendar integration.
 *
 * engine.356 (2026-11-21): the night's spots are drawn from Business_Ledger, not from name lists
 * (builder: "The businesses should come from the ledger"). Volume, vibe and movement are unchanged.
 *
 * v2.3 Changes:
 * - ES5 compatible (var instead of const/let, no arrow functions)
 * - Replaced spread operator with concat()
 * - Replaced Map deduplication with manual loop
 * - Defensive guards for ctx and ctx.summary
 *
 * v2.2 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific nightlife pools
 * - First Friday arts district nightlife surge
 * - Creation Day community gatherings
 * - Sports season game-night spots
 * - Cultural activity and community engagement effects
 * - Calendar-aware volume and vibe modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Weather impact + mood
 * - Chaos density
 * - Sentiment mood
 * - Economic mood
 * - Season
 * - PublicSpaces, Traffic
 *
 * ============================================================================
 */

function buildNightlife_(ctx) {

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
  var dynamics = S.cityDynamics || {};
  var sentiment = dynamics.sentiment || 0;
  var traffic = dynamics.traffic || 1;
  var publicSpace = dynamics.publicSpaces || 1;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;
  var econMood = S.economicMood || 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";
  // engine.281 (a): the numbers (volume, spot count) follow the week's band; the pools and
  // labels stay on the phase word (prose)
  var sportsBand = (S.sportsCity && S.sportsCity.band) || "quiet";

  // ═══════════════════════════════════════════════════════════════════════════
  // THE NIGHT'S SPOTS COME FROM THE LEDGER (engine.356)
  // ═══════════════════════════════════════════════════════════════════════════
  // Builder 2026-11-21: "The businesses should come from the ledger". Until this cut every night spot
  // was a name from thirteen lists written into this file in January (BARS, DANCE, CHILL, RAIN_SHELTER,
  // FOG_SPOTS, LATE_NIGHT, the holiday / First Friday / Creation Day / sports lists, and the UPSCALE /
  // BUDGET / chaos names engine.240 placed on hoods) — most of them not Business_Ledger rows — while the
  // ledger's own nightlife businesses were never read here. Now the candidates are the ledger's nightlife
  // rows (buildEveningFoodIndex_: Sector says nightlife / bar / lounge / club / hospitality), one per
  // name, each at weight 1. A condition that used to add a list now leans the draw toward the HOODS that
  // condition is about, the way buildEveningFood_ leans its restaurants, with the same amounts where the
  // condition is the same (First Friday +2 on arts hoods, culture +1, the sports band +3 / +2 / +1 on the
  // sports hoods). engine.240's "the venue opens where the condition is" becomes +1 on those hoods' real
  // businesses: the three hoods with the most world events on a chaos night, the four strongest hood
  // economies in a strong economy, the three weakest in a weak one, the busiest public space.
  // Dropped with the lists, because the ledger holds no fact for them: venue kinds by season and weather
  // (dance / chill / rain / fog), holiday-themed venues, Creation Day and community venues, the
  // late-night list. A night the ledger read fails, or holds no nightlife row, has no named spot.
  function econRank_(dir) {
    var econ = S.neighborhoodEconomies || {}, rows = [];
    for (var h in econ) if (econ.hasOwnProperty(h) && econ[h] && isFinite(Number(econ[h].mood))) rows.push([h, Number(econ[h].mood)]);
    rows.sort(function(a, b) { return dir > 0 ? b[1] - a[1] : a[1] - b[1]; });
    var out = []; for (var i = 0; i < rows.length; i++) out.push(rows[i][0]); return out;
  }
  function chaosHoods_() {
    var n = {}, rows = [];
    for (var i = 0; i < chaos.length; i++) { var h = chaos[i] && chaos[i].neighborhood; if (h) n[h] = (n[h] || 0) + 1; }
    for (var k in n) if (n.hasOwnProperty(k)) rows.push([k, n[k]]);
    rows.sort(function(a, b) { return b[1] - a[1]; });
    var out = []; for (var j = 0; j < rows.length; j++) out.push(rows[j][0]); return out;
  }
  function publicSpaceHoods_() {
    var nd = S.neighborhoodDynamics || {}, rows = [];
    for (var h in nd) if (nd.hasOwnProperty(h) && nd[h] && isFinite(Number(nd[h].publicSpaces))) rows.push([h, Number(nd[h].publicSpaces)]);
    rows.sort(function(a, b) { return b[1] - a[1]; });
    var out = []; for (var i = 0; i < rows.length; i++) out.push(rows[i][0]); return out;
  }

  var nightIndex = (typeof buildEveningFoodIndex_ === 'function') ? buildEveningFoodIndex_(ctx) : { nightlife: [] };
  var nightRows = (nightIndex && nightIndex.nightlife) || [];
  var candidates = (typeof dedupeByName_ === 'function') ? dedupeByName_(nightRows) : nightRows.slice();
  var weight = {};
  for (var c = 0; c < candidates.length; c++) weight[candidates[c].name] = 1;
  var lean = function(hoods, amount) {
    if (!hoods || !hoods.length) return;
    for (var r = 0; r < candidates.length; r++) {
      if (hoods.indexOf(candidates[r].neighborhood) !== -1) weight[candidates[r].name] += amount;
    }
  };
  var artsHoods = (typeof eveningFoodHoodsByCharacter_ === 'function') ? eveningFoodHoodsByCharacter_(S, { arts: true, nightlife: true }) : [];
  var sportsHoods = (S.sportsZones && S.sportsZones.length) ? S.sportsZones.slice() : [];   // no zone on record, no lean

  if (isFirstFriday) lean(artsHoods, 2);
  if (culturalActivity >= 1.4) lean(artsHoods, 1);
  if (sportsBand === "top") lean(sportsHoods, 3);
  else if (sportsBand === "high") lean(sportsHoods, 2);
  else if (sportsBand === "elevated") lean(sportsHoods, 1);
  if (chaos.length >= 3) lean(chaosHoods_().slice(0, 3), 1);
  if (econMood >= 65) lean(econRank_(1).slice(0, 4), 1);
  if (econMood <= 35) lean(econRank_(-1).slice(0, 3), 1);
  if (publicSpace >= 1.3) lean(publicSpaceHoods_().slice(0, 1), 1);

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE NIGHTLIFE VOLUME (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  var volume = 4; // baseline moderate

  // Sentiment
  if (sentiment >= 0.3) volume += 2;
  if (sentiment <= -0.3) volume -= 2;

  // Economic
  if (econMood >= 65) volume += 1;
  if (econMood <= 35) volume -= 1;

  // Weather
  if (weather.impact >= 1.5) volume -= 2;
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.3) volume -= 1;
  if (weatherMood.perfectWeather) volume += 1;

  // Season
  if (season === "Summer") volume += 1;
  if (season === "Winter") volume -= 1;

  // Chaos
  if (chaos.length >= 3) volume -= 1;

  // Public space
  if (publicSpace >= 1.4) volume += 2;

  // ───────────────────────────────────────────────────────────────────────────
  // CALENDAR VOLUME MODIFIERS (v2.2)
  // ───────────────────────────────────────────────────────────────────────────

  // Major party holidays
  if (holiday === "NewYearsEve") volume += 4;
  if (holiday === "Halloween") volume += 3;

  // Quieter holidays
  if (holiday === "Thanksgiving") volume -= 1;
  if (holiday === "Holiday") volume -= 1;
  if (holiday === "Easter") volume -= 2;
  if (holiday === "MothersDay" || holiday === "FathersDay") volume -= 1;

  // First Friday arts crawl
  if (isFirstFriday) volume += 2;

  // Creation Day community
  if (isCreationDay) volume += 1;

  // Sports week (engine.281 (a): band top/high carry the old championship/playoffs +3/+2)
  if (sportsBand === "top") volume += 3;
  else if (sportsBand === "high") volume += 2;

  // Cultural activity
  if (culturalActivity >= 1.4) volume += 1;

  // Clamp
  if (volume < 1) volume = 1;
  if (volume > 10) volume = 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // PICK FINAL SPOTS
  // ═══════════════════════════════════════════════════════════════════════════

  var count = 1;
  if (volume >= 7) count = 3;
  else if (volume >= 5) count = 2;

  // v2.2: More spots for big party nights
  if (holiday === "NewYearsEve" || holiday === "Halloween") count = Math.max(count, 4);
  if (isFirstFriday) count = Math.max(count, 3);
  if (sportsBand === "top") count = Math.max(count, 3);

  // engine.356: a weighted draw without replacement over the ledger's nightlife rows (the food builder's
  // helper). Each spot is { bizId, name, neighborhood, sector } — every reader takes name and neighborhood.
  var spots = (typeof weightedDrawWithoutReplacement_ === 'function')
    ? weightedDrawWithoutReplacement_(candidates, weight, count, rng)
    : candidates.slice(0, count);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD VIBE DESCRIPTION (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  var vibe = "steady";

  // Calendar vibes take priority
  if (holiday === "NewYearsEve") {
    vibe = "celebratory";
  } else if (holiday === "Halloween") {
    vibe = "festive-spooky";
  } else if (isFirstFriday) {
    vibe = "art-scene";
  } else if (isCreationDay) {
    vibe = "community-pride";
  } else if (sportsSeason === "championship") {
    vibe = "sports-fever";
  } else if (sportsSeason === "playoffs") {
    vibe = "game-night";
  } else if (volume >= 8) {
    vibe = "lively";
  } else if (volume >= 6) {
    vibe = "active";
  } else if (volume <= 3) {
    vibe = "quiet";
  } else if (weather.impact >= 1.3) {
    vibe = "weather-muted";
  } else if (chaos.length >= 3) {
    vibe = "tense";
  } else if (weatherMood.primaryMood === 'cozy') {
    vibe = "cozy";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD MOVEMENT CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════

  var movement = "normal";

  if (traffic >= 1.3) movement = "traffic-slowed";
  if (weather.impact >= 1.4) movement = "weather-limited";
  if (chaos.length >= 3) movement = "restricted";
  if (sentiment <= -0.3) movement = "hesitant";
  if (econMood <= 30) movement = "cautious";

  // v2.2: Holiday movement overrides
  if (holiday === "NewYearsEve") movement = "high-energy";
  if (isFirstFriday) movement = "art-walk";
  if (sportsSeason === "championship") movement = "fan-surge";

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  var spotNames = [];
  for (var j = 0; j < spots.length; j++) {
    spotNames.push(spots[j].name);
  }

  S.nightlife = {
    spots: spotNames,
    spotDetails: spots,
    volume: volume,
    vibe: vibe,
    movement: movement,
    weatherImpact: weather.impact,
    trafficLoad: traffic,
    economicInfluence: econMood <= 35 ? 'budget' : econMood >= 65 ? 'upscale' : 'normal',
    // v2.2: Calendar context
    calendarContext: {
      holiday: holiday,
      holidayPriority: holidayPriority,
      isFirstFriday: isFirstFriday,
      isCreationDay: isCreationDay,
      sportsSeason: sportsSeason
    }
  };

  // Also store volume for other systems
  S.nightlifeVolume = volume;

  ctx.summary = S;
}


/**
 * ============================================================================
 * NIGHTLIFE REFERENCE
 * ============================================================================
 *
 * SPOTS (engine.356, 2026-11-21): Business_Ledger rows whose Sector says nightlife / bar / lounge /
 * club / hospitality (buildEveningFoodIndex_), one per name, weight 1, leaned by hood:
 * - First Friday: arts / nightlife hoods +2 · cultural activity >= 1.4: +1
 * - sports band top / high / elevated: the sports hoods +3 / +2 / +1
 * - chaos night (3+ world events): the three hoods with the most +1
 * - economy >= 65: the four strongest hood economies +1 · <= 35: the three weakest +1
 * - public space >= 1.3: the busiest hood +1
 * No name list remains in this file.
 *
 * VOLUME MODIFIERS (v2.2):
 * - NewYearsEve: +4
 * - Halloween: +3
 * - Championship: +3
 * - First Friday: +2
 * - Playoffs: +2
 * - Opening Day: +2
 * - Thanksgiving/Holiday: -1
 * - Easter: -2
 *
 * SPOT COUNT:
 * - Base: 1-3 based on volume
 * - NewYearsEve/Halloween: 4
 * - Championship: 3
 *
 * VIBES (v2.2):
 * - celebratory (NYE)
 * - festive-spooky (Halloween)
 * - festive-pride (Pride)
 * - pub-crawl (St Patricks)
 * - fiesta (Cinco)
 * - reflective-festive (Día de Muertos)
 * - art-scene (First Friday)
 * - community-pride (Creation Day)
 * - sports-fever (Championship)
 * - game-night (Playoffs)
 *
 * ============================================================================
 */
