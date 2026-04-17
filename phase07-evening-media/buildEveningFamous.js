/**
 * ============================================================================
 * buildEveningFamous_ v2.5
 * ============================================================================
 *
 * World-aware celebrity selection for evening coverage with calendar integration.
 *
 * v2.5 Changes:
 * - Phase 15.5: Real A's players from Simulation_Ledger replace generic athletes
 * - Tier 1-2 active MLB GAME citizens pulled dynamically
 * - Player neighborhoods and TraitProfile included in sighting output
 * - Falls back to generic ATHLETES if ledger unavailable
 *
 * v2.3 Changes:
 * - ES5 compatible (var instead of const/let, no arrow functions)
 * - Replaced spread operator with concat()
 * - Replaced includes() with indexOf() !== -1
 * - Replaced Map deduplication with manual loop
 * - Defensive guards for ctx and ctx.summary
 *
 * v2.2 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific celebrity pool weighting
 * - First Friday arts figures prominence
 * - Creation Day civic figure prominence
 * - Sports season athlete boost
 * - Cultural activity and community engagement effects
 * - Calendar-aware sighting locations
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Season, weather, chaos, sentiment
 * - Economic mood integration
 * - Sports broadcasts
 * - Neighborhood sighting locations
 *
 * ============================================================================
 */

function buildEveningFamous_(ctx) {

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
  var dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };
  var sentiment = dynamics.sentiment || 0;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;
  var sports = S.eveningSports || "";
  var econMood = S.economicMood || 50;
  var cycle = S.cycleId || (ctx.config ? ctx.config.cycleCount : 0) || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOODS (12 - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  // Arts neighborhoods for First Friday
  var artsNeighborhoods = ["Uptown", "KONO", "Temescal", "Jack London"];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL POOLS (with categories)
  // ═══════════════════════════════════════════════════════════════════════════

  var ACTORS = [
    { name: "Lena Cross", role: "actor" },
    { name: "Evan Morello", role: "actor" },
    { name: "Sage Vienta", role: "actor" },
    { name: "Marcus Duval", role: "actor" },
    { name: "Nina Reyes", role: "actress" }
  ];

  var MUSICIANS = [
    { name: "Rico Valez", role: "musician" },
    { name: "Marin Tao", role: "musician" },
    { name: "Jade Orion", role: "musician" },
    { name: "Theo Banks", role: "rapper" },
    { name: "Celeste Moon", role: "singer" }
  ];

  var ATHLETES = [
    { name: "Dax Monroe", role: "athlete" },
    { name: "Kato Rivers", role: "athlete" },
    { name: "Nila James", role: "athlete" },
    { name: "Jordan Steele", role: "basketball player" },
    { name: "Malik Torres", role: "football player" }
  ];

  var INFLUENCERS = [
    { name: "Sienna Vale", role: "influencer" },
    { name: "Brody Kale", role: "influencer" },
    { name: "Lumi Crest", role: "influencer" },
    { name: "Zara Kim", role: "tiktoker" }
  ];

  var JOURNALISTS = [
    { name: "Tara Ellison", role: "journalist" },
    { name: "Rowan Pierce", role: "journalist" },
    { name: "Derek Obi", role: "reporter" }
  ];

  var CHEFS = [
    { name: "Carmen Dreel", role: "chef" },
    { name: "Mason Tril", role: "chef" },
    { name: "Sofia Nguyen", role: "restaurateur" }
  ];

  var STREAMERS = [
    { name: "Pixel Pete", role: "streamer" },
    { name: "GameGirl Gia", role: "streamer" },
    { name: "NightOwl Nate", role: "gamer" }
  ];

  var AUTHORS = [
    { name: "Claire Ashford", role: "author" },
    { name: "Marcus Webb", role: "novelist" }
  ];

  var CIVIC = [
    { name: "Councilwoman Rivera", role: "civic leader" },
    { name: "Advocate Simmons", role: "activist" },
    { name: "Community Director Hayes", role: "community leader" }
  ];

  var BUSINESS = [
    { name: "Tech CEO Warren", role: "entrepreneur" },
    { name: "Venture Kate Lin", role: "investor" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  var ARTISTS = [
    { name: "Gallery Owner Mei Chen", role: "gallery curator" },
    { name: "Muralist Dante Reyes", role: "artist" },
    { name: "Sculptor Alma Vasquez", role: "sculptor" },
    { name: "Photographer Kai Tanaka", role: "artist" }
  ];

  var CULTURAL_LEADERS = [
    { name: "Heritage Director Rosa Martinez", role: "cultural leader" },
    { name: "Festival Organizer James Williams", role: "community organizer" },
    { name: "Cultural Ambassador Li Wei", role: "cultural figure" }
  ];

  var SPORTS_LEGENDS = [
    { name: "Former A's Star Rodriguez", role: "sports legend" },
    { name: "Warriors Alumni Thompson", role: "basketball legend" },
    { name: "Oakland Native MVP Davis", role: "sports figure" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL A'S PLAYERS FROM SIMULATION_LEDGER (Phase 15.5)
  // ═══════════════════════════════════════════════════════════════════════════
  // Tier 1-2 active MLB GAME citizens replace generic ATHLETES pool.
  // Falls back to generic ATHLETES if ledger unavailable.

  var REAL_PLAYERS = [];
  var ss = ctx.ss;
  if (ss) {
    var slSheet = ss.getSheetByName("Simulation_Ledger");
    if (slSheet) {
      var slData = slSheet.getDataRange().getValues();
      if (slData.length > 1) {
        var slH = slData[0];
        var _iFirst = slH.indexOf("First");
        var _iLast = slH.indexOf("Last");
        var _iTier = slH.indexOf("Tier");
        var _iClock = slH.indexOf("ClockMode");
        var _iStatus = slH.indexOf("Status");
        var _iOrigin = slH.indexOf("OriginGame");
        var _iNeigh = slH.indexOf("Neighborhood");
        var _iTrait = slH.indexOf("TraitProfile");

        for (var p = 1; p < slData.length; p++) {
          var pr = slData[p];
          var pClock = (pr[_iClock] || "").toString().trim().toUpperCase();
          var pStat = (pr[_iStatus] || "").toString().trim().toLowerCase();
          var pOrig = (pr[_iOrigin] || "").toString();
          var pTier = Number(pr[_iTier] || 4);

          if (pClock !== "GAME") continue;
          if (pStat !== "active") continue;
          if (pOrig.indexOf("MLB") < 0) continue;
          if (pTier > 2) continue;

          var pFirst = (pr[_iFirst] || "").toString();
          var pLast = (pr[_iLast] || "").toString();
          var pName = (pFirst + " " + pLast).trim();
          if (!pName || pFirst === pLast) continue;

          var pNeigh = (_iNeigh >= 0) ? (pr[_iNeigh] || "").toString() : "";
          var pTrait = (_iTrait >= 0) ? (pr[_iTrait] || "").toString() : "";

          REAL_PLAYERS.push({
            name: pName,
            role: "A's player",
            tier: pTier,
            homeNeighborhood: pNeigh,
            traitProfile: pTrait
          });
        }
      }
    }
  }

  // Use real players when available, keep generic as fallback
  var athletePool = (REAL_PLAYERS.length > 0) ? REAL_PLAYERS : ATHLETES;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD-AWARE SELECTION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════

  var pool = [];

  // Base pool: actors, musicians, and athletes (real or generic)
  pool = pool.concat(ACTORS, MUSICIANS, athletePool);

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY CELEBRITY WEIGHTING (v2.2)
  // ───────────────────────────────────────────────────────────────────────────

  // Cultural holidays boost cultural figures
  var culturalHolidays = [
    "Juneteenth", "CincoDeMayo", "DiaDeMuertos", "LunarNewYear",
    "MLKDay", "OaklandPride", "ArtSoulFestival", "BlackHistoryMonth"
  ];
  if (culturalHolidays.indexOf(holiday) !== -1) {
    pool = pool.concat(CULTURAL_LEADERS, CULTURAL_LEADERS, CIVIC);
  }

  // Art & Soul Festival: artists and musicians
  if (holiday === "ArtSoulFestival") {
    pool = pool.concat(ARTISTS, ARTISTS, MUSICIANS, MUSICIANS);
  }

  // Oakland Pride: diverse voices
  if (holiday === "OaklandPride") {
    pool = pool.concat(INFLUENCERS, CIVIC, CULTURAL_LEADERS);
  }

  // Opening Day: athletes and sports figures
  if (holiday === "OpeningDay") {
    pool = pool.concat(athletePool, athletePool, SPORTS_LEGENDS, SPORTS_LEGENDS);
  }

  // Culinary holidays: chefs
  var culinaryHolidays = ["Thanksgiving", "CincoDeMayo", "DiaDeMuertos", "LunarNewYear"];
  if (culinaryHolidays.indexOf(holiday) !== -1) {
    pool = pool.concat(CHEFS, CHEFS);
  }

  // Entertainment holidays: actors and musicians
  var entertainmentHolidays = ["NewYearsEve", "Independence", "Halloween"];
  if (entertainmentHolidays.indexOf(holiday) !== -1) {
    pool = pool.concat(ACTORS, MUSICIANS, INFLUENCERS);
  }

  // Major holidays: broad celebrity appeal
  if (holidayPriority === "major") {
    pool = pool.concat(ACTORS, MUSICIANS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    pool = pool.concat(ARTISTS, ARTISTS, ARTISTS);
    pool = pool.concat(MUSICIANS, INFLUENCERS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    pool = pool.concat(CIVIC, CIVIC, CULTURAL_LEADERS, AUTHORS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (sportsSeason === "championship") {
    pool = pool.concat(athletePool, athletePool, athletePool, SPORTS_LEGENDS);
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    pool = pool.concat(athletePool, athletePool, SPORTS_LEGENDS);
  } else if (sportsSeason === "late-season") {
    pool = pool.concat(athletePool, athletePool);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    pool = pool.concat(ARTISTS, MUSICIANS, AUTHORS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMMUNITY ENGAGEMENT (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (communityEngagement >= 1.4) {
    pool = pool.concat(CIVIC, CULTURAL_LEADERS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHAOS / NEWS
  // ───────────────────────────────────────────────────────────────────────────
  if (chaos.length > 0) {
    pool = pool.concat(JOURNALISTS, JOURNALISTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SENTIMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (sentiment >= 0.3) {
    pool = pool.concat(INFLUENCERS, MUSICIANS, STREAMERS);
  }
  if (sentiment <= -0.3) {
    pool = pool.concat(ACTORS, JOURNALISTS, CIVIC);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ORIGINAL SPORTS BROADCAST
  // ───────────────────────────────────────────────────────────────────────────
  if (sports && sports !== "(none)" && sports !== "off-season") {
    pool = pool.concat(athletePool, athletePool);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.impact >= 1.3 || weather.type === "rain" || weather.type === "fog") {
    pool = pool.concat(ACTORS, MUSICIANS, STREAMERS);
  }

  if (weatherMood.perfectWeather) {
    pool = pool.concat(athletePool, INFLUENCERS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ECONOMIC MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (econMood >= 65) {
    pool = pool.concat(BUSINESS, CHEFS);
  }
  if (econMood <= 35) {
    pool = pool.concat(CIVIC, JOURNALISTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SEASONAL
  // ───────────────────────────────────────────────────────────────────────────
  if (season === "Summer") {
    pool = pool.concat(athletePool, INFLUENCERS);
  }
  if (season === "Winter") {
    pool = pool.concat(ACTORS, AUTHORS);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  // v2.3: ES5 deduplication (instead of Map)
  var seen = {};
  var uniq = [];
  for (var i = 0; i < pool.length; i++) {
    var item = pool[i];
    if (!seen[item.name]) {
      seen[item.name] = true;
      uniq.push(item);
    }
  }

  // Pick 2–4 famous for the evening (v2.2: can be up to 4 on special occasions)
  var count = 2;
  if (chaos.length > 0 || rng() < 0.3) count = 3;
  if (weather.impact >= 1.4) count = 3;

  // v2.2: Calendar increases sightings
  if (holidayPriority === "major" || holidayPriority === "oakland") count = Math.max(count, 3);
  if (isFirstFriday) count = Math.max(count, 3);
  if (sportsSeason === "championship") count = 4;

  var selected = typeof pickRandomSet_ === 'function'
    ? pickRandomSet_(uniq, count)
    : uniq.sort(function() { return rng() - 0.5; }).slice(0, count);

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSIGN NEIGHBORHOODS (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  var famousWithLocations = [];
  for (var j = 0; j < selected.length; j++) {
    var ent = selected[j];
    var neighborhood;

    // v2.2: Calendar-aware neighborhood assignment
    if (isFirstFriday && (ent.role.indexOf("artist") !== -1 || ent.role.indexOf("gallery") !== -1 || ent.role.indexOf("musician") !== -1)) {
      // Artists on First Friday are in arts districts
      neighborhood = artsNeighborhoods[Math.floor(rng() * artsNeighborhoods.length)];
    } else if (holiday === "LunarNewYear" && rng() < 0.4) {
      neighborhood = "Chinatown";
    } else if ((holiday === "CincoDeMayo" || holiday === "DiaDeMuertos") && rng() < 0.4) {
      neighborhood = "Fruitvale";
    } else if ((holiday === "OpeningDay" || sportsSeason === "championship") && (ent.role.indexOf("athlete") !== -1 || ent.role === "A's player")) {
      // Athletes near stadium
      neighborhood = rng() < 0.6 ? "Jack London" : "Downtown";
    } else if (ent.role === "A's player" && ent.homeNeighborhood && rng() < 0.5) {
      // v2.5: Real players spotted in their home neighborhood half the time
      neighborhood = ent.homeNeighborhood;
    } else if (holiday === "OaklandPride" && rng() < 0.4) {
      var prideNeighborhoods = ["Downtown", "Lake Merritt", "Uptown"];
      neighborhood = prideNeighborhoods[Math.floor(rng() * prideNeighborhoods.length)];
    } else {
      // Default random neighborhood
      neighborhood = neighborhoods[Math.floor(rng() * neighborhoods.length)];
    }

    var sighting = {
      name: ent.name,
      role: ent.role,
      neighborhood: neighborhood
    };

    // v2.5: Include trait and tier data for real players
    if (ent.role === "A's player") {
      if (ent.traitProfile) sighting.traitProfile = ent.traitProfile;
      if (ent.tier) sighting.tier = ent.tier;
    }

    famousWithLocations.push(sighting);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTER + OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  S.famousPeople = [];
  for (var k = 0; k < famousWithLocations.length; k++) {
    S.famousPeople.push(famousWithLocations[k].name);
  }
  S.famousSightings = famousWithLocations;

  // v2.2: Calendar context
  S.famousSightingsContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    count: famousWithLocations.length
  };

  for (var m = 0; m < famousWithLocations.length; m++) {
    var famous = famousWithLocations[m];
    if (typeof registerCulturalEntity_ === 'function') {
      registerCulturalEntity_(ctx, famous.name, famous.role, "SystemEngine", famous.neighborhood);
    }
  }

  ctx.summary = S;
}


/**
 * ============================================================================
 * EVENING FAMOUS REFERENCE v2.5
 * ============================================================================
 *
 * CELEBRITY POOLS:
 * - ACTORS (5), MUSICIANS (5), ATHLETES (5 generic fallback)
 * - REAL_PLAYERS (dynamic from Simulation_Ledger, Tier 1-2 MLB) - v2.5
 * - INFLUENCERS (4), JOURNALISTS (3), CHEFS (3)
 * - STREAMERS (3), AUTHORS (2), CIVIC (3), BUSINESS (2)
 * - ARTISTS (4) - v2.2
 * - CULTURAL_LEADERS (3) - v2.2
 * - SPORTS_LEGENDS (3) - v2.2
 *
 * REAL PLAYER INTEGRATION (v2.5):
 * - Reads Simulation_Ledger for ClockMode=GAME, Status=active, OriginGame=MLB
 * - Filters to Tier 1-2 only (superstars and regulars)
 * - Replaces generic ATHLETES pool when real players available
 * - Includes homeNeighborhood (50% chance sighted there)
 * - Includes traitProfile and tier in sighting output
 *
 * CALENDAR POOL WEIGHTING (v2.2):
 *
 * | Holiday/Event | Boosted Pools |
 * |---------------|---------------|
 * | Cultural holidays | CULTURAL_LEADERS, CIVIC |
 * | ArtSoulFestival | ARTISTS, MUSICIANS |
 * | OaklandPride | INFLUENCERS, CIVIC, CULTURAL_LEADERS |
 * | OpeningDay | ATHLETES, SPORTS_LEGENDS |
 * | Culinary holidays | CHEFS |
 * | Entertainment holidays | ACTORS, MUSICIANS, INFLUENCERS |
 * | First Friday | ARTISTS, MUSICIANS, INFLUENCERS |
 * | Creation Day | CIVIC, CULTURAL_LEADERS, AUTHORS |
 * | Championship | ATHLETES, SPORTS_LEGENDS |
 * | Playoffs | ATHLETES, SPORTS_LEGENDS |
 * | High cultural activity | ARTISTS, MUSICIANS, AUTHORS |
 * | High community engagement | CIVIC, CULTURAL_LEADERS |
 *
 * SIGHTING COUNT:
 * - Base: 2
 * - Chaos/weather: 3
 * - Major/Oakland holiday: 3
 * - First Friday: 3
 * - Championship: 4
 *
 * CALENDAR-AWARE NEIGHBORHOODS (v2.2):
 * - First Friday + artists → arts districts (Uptown, KONO, Temescal, Jack London)
 * - LunarNewYear → Chinatown (40% chance)
 * - CincoDeMayo/DiaDeMuertos → Fruitvale (40% chance)
 * - OpeningDay/Championship + athletes → Jack London/Downtown
 * - OaklandPride → Downtown/Lake Merritt/Uptown (40% chance)
 *
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 *
 * OUTPUT:
 * - famousPeople: Array<string> (names)
 * - famousSightings: Array<{name, role, neighborhood, ?traitProfile, ?tier}>
 * - famousSightingsContext: {holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, count}
 *
 * ============================================================================
 */
