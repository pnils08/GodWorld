/**
 * ============================================================================
 * buildEveningFamous_ v2.4
 * ============================================================================
 *
 * World-aware celebrity selection for evening coverage with calendar integration.
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

  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;
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
  // WORLD-AWARE SELECTION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════

  var pool = [];

  // Base pool (v2.3: use concat instead of spread)
  pool = pool.concat(ACTORS, MUSICIANS, ATHLETES);

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
    pool = pool.concat(ATHLETES, ATHLETES, SPORTS_LEGENDS, SPORTS_LEGENDS);
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
    pool = pool.concat(ATHLETES, ATHLETES, ATHLETES, SPORTS_LEGENDS);
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    pool = pool.concat(ATHLETES, ATHLETES, SPORTS_LEGENDS);
  } else if (sportsSeason === "late-season") {
    pool = pool.concat(ATHLETES, ATHLETES);
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
    pool = pool.concat(ATHLETES, ATHLETES);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.impact >= 1.3 || weather.type === "rain" || weather.type === "fog") {
    pool = pool.concat(ACTORS, MUSICIANS, STREAMERS);
  }

  if (weatherMood.perfectWeather) {
    pool = pool.concat(ATHLETES, INFLUENCERS);
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
    pool = pool.concat(ATHLETES, INFLUENCERS);
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
    } else if ((holiday === "OpeningDay" || sportsSeason === "championship") && ent.role.indexOf("athlete") !== -1) {
      // Athletes near stadium
      neighborhood = rng() < 0.6 ? "Jack London" : "Downtown";
    } else if (holiday === "OaklandPride" && rng() < 0.4) {
      var prideNeighborhoods = ["Downtown", "Lake Merritt", "Uptown"];
      neighborhood = prideNeighborhoods[Math.floor(rng() * prideNeighborhoods.length)];
    } else {
      // Default random neighborhood
      neighborhood = neighborhoods[Math.floor(rng() * neighborhoods.length)];
    }

    famousWithLocations.push({
      name: ent.name,
      role: ent.role,
      neighborhood: neighborhood
    });
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
 * EVENING FAMOUS REFERENCE
 * ============================================================================
 *
 * CELEBRITY POOLS:
 * - ACTORS (5), MUSICIANS (5), ATHLETES (5)
 * - INFLUENCERS (4), JOURNALISTS (3), CHEFS (3)
 * - STREAMERS (3), AUTHORS (2), CIVIC (3), BUSINESS (2)
 * - ARTISTS (4) - v2.2
 * - CULTURAL_LEADERS (3) - v2.2
 * - SPORTS_LEGENDS (3) - v2.2
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
 * - famousSightings: Array<{name, role, neighborhood}>
 * - famousSightingsContext: {holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, count}
 *
 * ============================================================================
 */
