/**
 * ============================================================================
 * buildEveningFamous_ v2.2
 * ============================================================================
 *
 * World-aware celebrity selection for evening coverage with calendar integration.
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

  const S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const season = S.season;
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };
  const sentiment = dynamics.sentiment || 0;
  const culturalActivity = dynamics.culturalActivity || 1;
  const communityEngagement = dynamics.communityEngagement || 1;
  const sports = S.eveningSports || "";
  const econMood = S.economicMood || 50;
  const cycle = S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOODS (12 - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  // Arts neighborhoods for First Friday
  const artsNeighborhoods = ["Uptown", "KONO", "Temescal", "Jack London"];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL POOLS (with categories)
  // ═══════════════════════════════════════════════════════════════════════════

  const ACTORS = [
    { name: "Lena Cross", role: "actor" },
    { name: "Evan Morello", role: "actor" },
    { name: "Sage Vienta", role: "actor" },
    { name: "Marcus Duval", role: "actor" },
    { name: "Nina Reyes", role: "actress" }
  ];

  const MUSICIANS = [
    { name: "Rico Valez", role: "musician" },
    { name: "Marin Tao", role: "musician" },
    { name: "Jade Orion", role: "musician" },
    { name: "Theo Banks", role: "rapper" },
    { name: "Celeste Moon", role: "singer" }
  ];

  const ATHLETES = [
    { name: "Dax Monroe", role: "athlete" },
    { name: "Kato Rivers", role: "athlete" },
    { name: "Nila James", role: "athlete" },
    { name: "Jordan Steele", role: "basketball player" },
    { name: "Malik Torres", role: "football player" }
  ];

  const INFLUENCERS = [
    { name: "Sienna Vale", role: "influencer" },
    { name: "Brody Kale", role: "influencer" },
    { name: "Lumi Crest", role: "influencer" },
    { name: "Zara Kim", role: "tiktoker" }
  ];

  const JOURNALISTS = [
    { name: "Tara Ellison", role: "journalist" },
    { name: "Rowan Pierce", role: "journalist" },
    { name: "Derek Obi", role: "reporter" }
  ];

  const CHEFS = [
    { name: "Carmen Dreel", role: "chef" },
    { name: "Mason Tril", role: "chef" },
    { name: "Sofia Nguyen", role: "restaurateur" }
  ];

  const STREAMERS = [
    { name: "Pixel Pete", role: "streamer" },
    { name: "GameGirl Gia", role: "streamer" },
    { name: "NightOwl Nate", role: "gamer" }
  ];

  const AUTHORS = [
    { name: "Claire Ashford", role: "author" },
    { name: "Marcus Webb", role: "novelist" }
  ];

  const CIVIC = [
    { name: "Councilwoman Rivera", role: "civic leader" },
    { name: "Advocate Simmons", role: "activist" },
    { name: "Community Director Hayes", role: "community leader" }
  ];

  const BUSINESS = [
    { name: "Tech CEO Warren", role: "entrepreneur" },
    { name: "Venture Kate Lin", role: "investor" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  const ARTISTS = [
    { name: "Gallery Owner Mei Chen", role: "gallery curator" },
    { name: "Muralist Dante Reyes", role: "artist" },
    { name: "Sculptor Alma Vasquez", role: "sculptor" },
    { name: "Photographer Kai Tanaka", role: "artist" }
  ];

  const CULTURAL_LEADERS = [
    { name: "Heritage Director Rosa Martinez", role: "cultural leader" },
    { name: "Festival Organizer James Williams", role: "community organizer" },
    { name: "Cultural Ambassador Li Wei", role: "cultural figure" }
  ];

  const SPORTS_LEGENDS = [
    { name: "Former A's Star Rodriguez", role: "sports legend" },
    { name: "Warriors Alumni Thompson", role: "basketball legend" },
    { name: "Oakland Native MVP Davis", role: "sports figure" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD-AWARE SELECTION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════

  let pool = [];

  // Base pool
  pool.push(...ACTORS, ...MUSICIANS, ...ATHLETES);

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY CELEBRITY WEIGHTING (v2.2)
  // ───────────────────────────────────────────────────────────────────────────

  // Cultural holidays boost cultural figures
  const culturalHolidays = [
    "Juneteenth", "CincoDeMayo", "DiaDeMuertos", "LunarNewYear",
    "MLKDay", "OaklandPride", "ArtSoulFestival", "BlackHistoryMonth"
  ];
  if (culturalHolidays.includes(holiday)) {
    pool.push(...CULTURAL_LEADERS, ...CULTURAL_LEADERS, ...CIVIC);
  }

  // Art & Soul Festival: artists and musicians
  if (holiday === "ArtSoulFestival") {
    pool.push(...ARTISTS, ...ARTISTS, ...MUSICIANS, ...MUSICIANS);
  }

  // Oakland Pride: diverse voices
  if (holiday === "OaklandPride") {
    pool.push(...INFLUENCERS, ...CIVIC, ...CULTURAL_LEADERS);
  }

  // Opening Day: athletes and sports figures
  if (holiday === "OpeningDay") {
    pool.push(...ATHLETES, ...ATHLETES, ...SPORTS_LEGENDS, ...SPORTS_LEGENDS);
  }

  // Culinary holidays: chefs
  const culinaryHolidays = ["Thanksgiving", "CincoDeMayo", "DiaDeMuertos", "LunarNewYear"];
  if (culinaryHolidays.includes(holiday)) {
    pool.push(...CHEFS, ...CHEFS);
  }

  // Entertainment holidays: actors and musicians
  const entertainmentHolidays = ["NewYearsEve", "Independence", "Halloween"];
  if (entertainmentHolidays.includes(holiday)) {
    pool.push(...ACTORS, ...MUSICIANS, ...INFLUENCERS);
  }

  // Major holidays: broad celebrity appeal
  if (holidayPriority === "major") {
    pool.push(...ACTORS, ...MUSICIANS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    pool.push(...ARTISTS, ...ARTISTS, ...ARTISTS);
    pool.push(...MUSICIANS, ...INFLUENCERS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    pool.push(...CIVIC, ...CIVIC, ...CULTURAL_LEADERS, ...AUTHORS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (sportsSeason === "championship") {
    pool.push(...ATHLETES, ...ATHLETES, ...ATHLETES, ...SPORTS_LEGENDS);
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    pool.push(...ATHLETES, ...ATHLETES, ...SPORTS_LEGENDS);
  } else if (sportsSeason === "late-season") {
    pool.push(...ATHLETES, ...ATHLETES);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    pool.push(...ARTISTS, ...MUSICIANS, ...AUTHORS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMMUNITY ENGAGEMENT (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (communityEngagement >= 1.4) {
    pool.push(...CIVIC, ...CULTURAL_LEADERS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHAOS / NEWS
  // ───────────────────────────────────────────────────────────────────────────
  if (chaos.length > 0) {
    pool.push(...JOURNALISTS, ...JOURNALISTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SENTIMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (sentiment >= 0.3) {
    pool.push(...INFLUENCERS, ...MUSICIANS, ...STREAMERS);
  }
  if (sentiment <= -0.3) {
    pool.push(...ACTORS, ...JOURNALISTS, ...CIVIC);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ORIGINAL SPORTS BROADCAST
  // ───────────────────────────────────────────────────────────────────────────
  if (sports && sports !== "(none)" && sports !== "off-season") {
    pool.push(...ATHLETES, ...ATHLETES);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.impact >= 1.3 || weather.type === "rain" || weather.type === "fog") {
    pool.push(...ACTORS, ...MUSICIANS, ...STREAMERS);
  }

  if (weatherMood.perfectWeather) {
    pool.push(...ATHLETES, ...INFLUENCERS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ECONOMIC MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (econMood >= 65) {
    pool.push(...BUSINESS, ...CHEFS);
  }
  if (econMood <= 35) {
    pool.push(...CIVIC, ...JOURNALISTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SEASONAL
  // ───────────────────────────────────────────────────────────────────────────
  if (season === "Summer") {
    pool.push(...ATHLETES, ...INFLUENCERS);
  }
  if (season === "Winter") {
    pool.push(...ACTORS, ...AUTHORS);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  // Ensure uniqueness
  const uniq = [...new Map(pool.map(x => [x.name, x])).values()];

  // Pick 2–4 famous for the evening (v2.2: can be up to 4 on special occasions)
  let count = 2;
  if (chaos.length > 0 || Math.random() < 0.3) count = 3;
  if (weather.impact >= 1.4) count = 3;
  
  // v2.2: Calendar increases sightings
  if (holidayPriority === "major" || holidayPriority === "oakland") count = Math.max(count, 3);
  if (isFirstFriday) count = Math.max(count, 3);
  if (sportsSeason === "championship") count = 4;

  const selected = typeof pickRandomSet_ === 'function' 
    ? pickRandomSet_(uniq, count)
    : uniq.sort(() => Math.random() - 0.5).slice(0, count);

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSIGN NEIGHBORHOODS (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  const famousWithLocations = selected.map(ent => {
    let neighborhood;
    
    // v2.2: Calendar-aware neighborhood assignment
    if (isFirstFriday && (ent.role.includes("artist") || ent.role.includes("gallery") || ent.role.includes("musician"))) {
      // Artists on First Friday are in arts districts
      neighborhood = artsNeighborhoods[Math.floor(Math.random() * artsNeighborhoods.length)];
    } else if (holiday === "LunarNewYear" && Math.random() < 0.4) {
      neighborhood = "Chinatown";
    } else if ((holiday === "CincoDeMayo" || holiday === "DiaDeMuertos") && Math.random() < 0.4) {
      neighborhood = "Fruitvale";
    } else if ((holiday === "OpeningDay" || sportsSeason === "championship") && ent.role.includes("athlete")) {
      // Athletes near stadium
      neighborhood = Math.random() < 0.6 ? "Jack London" : "Downtown";
    } else if (holiday === "OaklandPride" && Math.random() < 0.4) {
      const prideNeighborhoods = ["Downtown", "Lake Merritt", "Uptown"];
      neighborhood = prideNeighborhoods[Math.floor(Math.random() * prideNeighborhoods.length)];
    } else {
      // Default random neighborhood
      neighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
    }

    return {
      name: ent.name,
      role: ent.role,
      neighborhood: neighborhood
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTER + OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  S.famousPeople = famousWithLocations.map(x => x.name);
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

  famousWithLocations.forEach(ent => {
    if (typeof registerCulturalEntity_ === 'function') {
      registerCulturalEntity_(ctx, ent.name, ent.role, "SystemEngine", ent.neighborhood);
    }
  });

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