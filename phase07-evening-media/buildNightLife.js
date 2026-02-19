/**
 * ============================================================================
 * buildNightlife_ v2.4
 * ============================================================================
 *
 * World-aware nightlife generator with GodWorld Calendar integration.
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

  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NIGHTLIFE SPOT POOLS (Oakland - 12 neighborhoods)
  // ═══════════════════════════════════════════════════════════════════════════

  var BARS = [
    { name: "Blue Lantern Bar", neighborhood: "Jack London" },
    { name: "Temple Lounge", neighborhood: "Downtown" },
    { name: "Skybar", neighborhood: "Downtown" },
    { name: "Bridge & Barrel", neighborhood: "Jack London" },
    { name: "OakTown Social", neighborhood: "Temescal" },
    { name: "Nightline Station", neighborhood: "West Oakland" },
    { name: "Laurel Taproom", neighborhood: "Laurel" },
    { name: "Rockridge Wine Bar", neighborhood: "Rockridge" },
    { name: "Uptown Pour House", neighborhood: "Uptown" },
    { name: "KONO Cocktails", neighborhood: "KONO" },
    { name: "Dragon Gate Lounge", neighborhood: "Chinatown" },
    { name: "Piedmont Pub", neighborhood: "Piedmont Ave" }
  ];

  var DANCE = [
    { name: "Pulse District", neighborhood: "Downtown" },
    { name: "Neon Harbor Club", neighborhood: "Jack London" },
    { name: "Vibe Terrace", neighborhood: "Lake Merritt" },
    { name: "Rhythm Deck", neighborhood: "West Oakland" },
    { name: "Uptown Dance Hall", neighborhood: "Uptown" }
  ];

  var CHILL = [
    { name: "Quiet Harbor Wine Room", neighborhood: "Jack London" },
    { name: "Twilight Teahouse", neighborhood: "Temescal" },
    { name: "Cozy Wick Lounge", neighborhood: "Rockridge" },
    { name: "Lakeside Whisper Bar", neighborhood: "Lake Merritt" },
    { name: "Piedmont Parlor", neighborhood: "Piedmont Ave" }
  ];

  var RAIN_SHELTER = [
    { name: "Lantern Basement Bar", neighborhood: "Downtown" },
    { name: "Underglow Lounge", neighborhood: "Jack London" },
    { name: "Storm Shelter Pub", neighborhood: "West Oakland" }
  ];

  var FOG_SPOTS = [
    { name: "Misty Dockside Lounge", neighborhood: "Jack London" },
    { name: "Haze Bar", neighborhood: "West Oakland" }
  ];

  var CHAOS_SPOTS = [
    { name: "Civic Watch Patio", neighborhood: "Downtown" },
    { name: "Neighborhood Response Hub", neighborhood: "Fruitvale" },
    { name: "Community Pulse Tavern", neighborhood: "West Oakland" }
  ];

  var UPSCALE = [
    { name: "Merritt Club", neighborhood: "Lake Merritt" },
    { name: "The Grand Oak", neighborhood: "Rockridge" },
    { name: "Harbor House VIP", neighborhood: "Jack London" },
    { name: "Uptown Elite", neighborhood: "Uptown" }
  ];

  var BUDGET = [
    { name: "Dive & Dash", neighborhood: "West Oakland" },
    { name: "Dollar Drafts", neighborhood: "Fruitvale" },
    { name: "The Cheap Seat", neighborhood: "Downtown" }
  ];

  var LATE_NIGHT = [
    { name: "After Hours Oakland", neighborhood: "Downtown" },
    { name: "3AM Club", neighborhood: "Jack London" },
    { name: "Night Owl Den", neighborhood: "Temescal" },
    { name: "Uptown Insomniac", neighborhood: "Uptown" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY NIGHTLIFE POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  var NEW_YEARS_EVE_SPOTS = [
    { name: "Countdown Club", neighborhood: "Downtown" },
    { name: "Midnight Toast Bar", neighborhood: "Jack London" },
    { name: "New Year's Terrace", neighborhood: "Lake Merritt" },
    { name: "Ball Drop Lounge", neighborhood: "Uptown" }
  ];

  var HOLIDAY_SPOTS = [
    { name: "Holiday Spirits Bar", neighborhood: "Downtown" },
    { name: "Festive Fireside", neighborhood: "Rockridge" },
    { name: "Winter Wonderland Lounge", neighborhood: "Temescal" }
  ];

  var ST_PATRICKS_SPOTS = [
    { name: "Shamrock Pub", neighborhood: "Jack London" },
    { name: "Green Light Tavern", neighborhood: "Downtown" },
    { name: "Lucky Clover Bar", neighborhood: "Temescal" }
  ];

  var CINCO_SPOTS = [
    { name: "Cinco Cantina", neighborhood: "Fruitvale" },
    { name: "Margarita Mile", neighborhood: "Fruitvale" },
    { name: "Fiesta Lounge", neighborhood: "Downtown" }
  ];

  var INDEPENDENCE_SPOTS = [
    { name: "Red White Blue Bar", neighborhood: "Jack London" },
    { name: "Fireworks View Terrace", neighborhood: "Lake Merritt" },
    { name: "Fourth of July Tavern", neighborhood: "Downtown" }
  ];

  var HALLOWEEN_SPOTS = [
    { name: "Haunted House Bar", neighborhood: "Jack London" },
    { name: "Costume Club", neighborhood: "Downtown" },
    { name: "Spooky Spirits Lounge", neighborhood: "Temescal" },
    { name: "Monster Mash Nightclub", neighborhood: "Uptown" }
  ];

  var DIA_DE_MUERTOS_SPOTS = [
    { name: "Altar Bar", neighborhood: "Fruitvale" },
    { name: "Marigold Lounge", neighborhood: "Fruitvale" },
    { name: "Ancestor's Toast", neighborhood: "Downtown" }
  ];

  var PRIDE_SPOTS = [
    { name: "Rainbow Room", neighborhood: "Downtown" },
    { name: "Pride Pavilion", neighborhood: "Lake Merritt" },
    { name: "Equality Lounge", neighborhood: "Uptown" },
    { name: "Love Wins Bar", neighborhood: "Jack London" }
  ];

  var LUNAR_NEW_YEAR_SPOTS = [
    { name: "Golden Dragon Lounge", neighborhood: "Chinatown" },
    { name: "Red Envelope Bar", neighborhood: "Chinatown" },
    { name: "Lucky Year Club", neighborhood: "Downtown" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY NIGHTLIFE POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  var FIRST_FRIDAY_SPOTS = [
    { name: "Gallery Night Lounge", neighborhood: "Uptown" },
    { name: "Art Walk Bar", neighborhood: "KONO" },
    { name: "Canvas Club", neighborhood: "Temescal" },
    { name: "First Friday Social", neighborhood: "Downtown" },
    { name: "Creative Cocktails", neighborhood: "Jack London" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY NIGHTLIFE POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  var CREATION_DAY_SPOTS = [
    { name: "Founders Pub", neighborhood: "Downtown" },
    { name: "Oakland Roots Bar", neighborhood: "West Oakland" },
    { name: "Heritage Tavern", neighborhood: "Lake Merritt" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON NIGHTLIFE POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  var SPORTS_BARS = [
    { name: "Green & Gold Tavern", neighborhood: "Jack London" },
    { name: "Stadium Sports Bar", neighborhood: "Jack London" },
    { name: "Ninth Inning Pub", neighborhood: "Downtown" },
    { name: "Playoff Central", neighborhood: "Jack London" }
  ];

  var CHAMPIONSHIP_SPOTS = [
    { name: "Championship Watch Party", neighborhood: "Jack London" },
    { name: "Title Town Tavern", neighborhood: "Downtown" },
    { name: "Victory Lounge", neighborhood: "Lake Merritt" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD DYNAMIC NIGHTLIFE POOL
  // ═══════════════════════════════════════════════════════════════════════════

  var pool = [].concat(BARS);

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY SPOTS (v2.2)
  // ───────────────────────────────────────────────────────────────────────────

  if (holiday === "NewYearsEve") {
    pool = pool.concat(NEW_YEARS_EVE_SPOTS, NEW_YEARS_EVE_SPOTS, DANCE, LATE_NIGHT);
  }
  if (holiday === "Holiday" || holiday === "NewYear") {
    pool = pool.concat(HOLIDAY_SPOTS);
  }
  if (holiday === "StPatricksDay") {
    pool = pool.concat(ST_PATRICKS_SPOTS, ST_PATRICKS_SPOTS);
  }
  if (holiday === "CincoDeMayo") {
    pool = pool.concat(CINCO_SPOTS, CINCO_SPOTS);
  }
  if (holiday === "Independence") {
    pool = pool.concat(INDEPENDENCE_SPOTS, INDEPENDENCE_SPOTS);
  }
  if (holiday === "Halloween") {
    pool = pool.concat(HALLOWEEN_SPOTS, HALLOWEEN_SPOTS, LATE_NIGHT);
  }
  if (holiday === "DiaDeMuertos") {
    pool = pool.concat(DIA_DE_MUERTOS_SPOTS, DIA_DE_MUERTOS_SPOTS);
  }
  if (holiday === "OaklandPride") {
    pool = pool.concat(PRIDE_SPOTS, PRIDE_SPOTS, DANCE);
  }
  if (holiday === "LunarNewYear") {
    pool = pool.concat(LUNAR_NEW_YEAR_SPOTS, LUNAR_NEW_YEAR_SPOTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    pool = pool.concat(FIRST_FRIDAY_SPOTS, FIRST_FRIDAY_SPOTS, DANCE);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    pool = pool.concat(CREATION_DAY_SPOTS, CREATION_DAY_SPOTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (sportsSeason === "championship") {
    pool = pool.concat(CHAMPIONSHIP_SPOTS, CHAMPIONSHIP_SPOTS, SPORTS_BARS);
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    pool = pool.concat(SPORTS_BARS, SPORTS_BARS);
  } else if (sportsSeason === "late-season" || holiday === "OpeningDay") {
    pool = pool.concat(SPORTS_BARS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    pool = pool.concat(FIRST_FRIDAY_SPOTS, DANCE);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMMUNITY ENGAGEMENT (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (communityEngagement >= 1.4) {
    pool = pool.concat(CREATION_DAY_SPOTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SEASON (if no holiday override)
  // ───────────────────────────────────────────────────────────────────────────
  if (holiday === "none") {
    if (season === "Summer") pool = pool.concat(DANCE);
    if (season === "Winter") pool = pool.concat(CHILL);
    if (season === "Fall") pool = pool.concat(CHILL);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.type === "fog") {
    pool = pool.concat(FOG_SPOTS);
  } else if (weather.impact >= 1.3 || weather.type === "rain") {
    pool = pool.concat(RAIN_SHELTER);
  }

  // Weather mood
  if (weatherMood.primaryMood === 'cozy') pool = pool.concat(CHILL);
  if (weatherMood.perfectWeather && holiday === "none") pool = pool.concat(DANCE);

  // ───────────────────────────────────────────────────────────────────────────
  // CHAOS
  // ───────────────────────────────────────────────────────────────────────────
  if (chaos.length >= 3) pool = pool.concat(CHAOS_SPOTS);

  // ───────────────────────────────────────────────────────────────────────────
  // ECONOMIC MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (econMood >= 65) pool = pool.concat(UPSCALE);
  if (econMood <= 35) pool = pool.concat(BUDGET);

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC SPACE
  // ───────────────────────────────────────────────────────────────────────────
  if (publicSpace >= 1.3) {
    pool.push({ name: "Open-Air Night Plaza", neighborhood: "Lake Merritt" });
  }

  // v2.3: ES5 deduplication (instead of Map)
  var seen = {};
  var uniquePool = [];
  for (var i = 0; i < pool.length; i++) {
    var spot = pool[i];
    if (!seen[spot.name]) {
      seen[spot.name] = true;
      uniquePool.push(spot);
    }
  }
  pool = uniquePool;

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
  if (holiday === "StPatricksDay") volume += 3;
  if (holiday === "CincoDeMayo") volume += 2;
  if (holiday === "OaklandPride") volume += 3;
  if (holiday === "Independence") volume += 2;

  // Quieter holidays
  if (holiday === "Thanksgiving") volume -= 1;
  if (holiday === "Holiday") volume -= 1;
  if (holiday === "Easter") volume -= 2;
  if (holiday === "MothersDay" || holiday === "FathersDay") volume -= 1;

  // First Friday arts crawl
  if (isFirstFriday) volume += 2;

  // Creation Day community
  if (isCreationDay) volume += 1;

  // Sports season
  if (sportsSeason === "championship") volume += 3;
  if (sportsSeason === "playoffs") volume += 2;
  if (holiday === "OpeningDay") volume += 2;

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
  if (holiday === "OaklandPride" || isFirstFriday) count = Math.max(count, 3);
  if (sportsSeason === "championship") count = Math.max(count, 3);

  // Add late night spots for high volume
  if (volume >= 8) pool = pool.concat(LATE_NIGHT);

  var spots = typeof pickRandomSet_ === 'function'
    ? pickRandomSet_(pool, count)
    : pool.sort(function() { return rng() - 0.5; }).slice(0, count);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD VIBE DESCRIPTION (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  var vibe = "steady";

  // Calendar vibes take priority
  if (holiday === "NewYearsEve") {
    vibe = "celebratory";
  } else if (holiday === "Halloween") {
    vibe = "festive-spooky";
  } else if (holiday === "OaklandPride") {
    vibe = "festive-pride";
  } else if (holiday === "StPatricksDay") {
    vibe = "pub-crawl";
  } else if (holiday === "CincoDeMayo") {
    vibe = "fiesta";
  } else if (holiday === "DiaDeMuertos") {
    vibe = "reflective-festive";
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
  if (holiday === "NewYearsEve" || holiday === "OaklandPride") movement = "high-energy";
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
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 *
 * BASE POOLS:
 * - BARS (12), DANCE (5), CHILL (5)
 * - RAIN_SHELTER (3), FOG_SPOTS (2), CHAOS_SPOTS (3)
 * - UPSCALE (4), BUDGET (3), LATE_NIGHT (4)
 *
 * HOLIDAY POOLS (v2.2):
 *
 * | Holiday | Spots | Key Neighborhoods |
 * |---------|-------|-------------------|
 * | NewYearsEve | 4 | Downtown, Jack London, Lake Merritt, Uptown |
 * | Holiday | 3 | Downtown, Rockridge, Temescal |
 * | StPatricksDay | 3 | Jack London, Downtown, Temescal |
 * | CincoDeMayo | 3 | Fruitvale ×2, Downtown |
 * | Independence | 3 | Jack London, Lake Merritt, Downtown |
 * | Halloween | 4 | Jack London, Downtown, Temescal, Uptown |
 * | DiaDeMuertos | 3 | Fruitvale ×2, Downtown |
 * | OaklandPride | 4 | Downtown, Lake Merritt, Uptown, Jack London |
 * | LunarNewYear | 3 | Chinatown ×2, Downtown |
 *
 * FIRST FRIDAY (5 spots):
 * - Gallery Night Lounge (Uptown), Art Walk Bar (KONO), etc.
 *
 * CREATION DAY (3 spots):
 * - Founders Pub (Downtown), Oakland Roots Bar (West Oakland), etc.
 *
 * SPORTS SEASON:
 * - Championship: 3 championship + 4 sports bars
 * - Playoffs: 4 sports bars ×2
 * - Late-season/Opening Day: 4 sports bars
 *
 * VOLUME MODIFIERS (v2.2):
 * - NewYearsEve: +4
 * - Halloween: +3
 * - StPatricksDay: +3
 * - OaklandPride: +3
 * - Championship: +3
 * - First Friday: +2
 * - Independence: +2
 * - CincoDeMayo: +2
 * - Playoffs: +2
 * - Opening Day: +2
 * - Thanksgiving/Holiday: -1
 * - Easter: -2
 *
 * SPOT COUNT:
 * - Base: 1-3 based on volume
 * - NewYearsEve/Halloween: 4
 * - OaklandPride/First Friday: 3
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
