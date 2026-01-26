/**
 * ============================================================================
 * buildEveningSportsAndStreaming_ v2.4
 * ============================================================================
 *
 * World-aware evening sports + streaming generator with GodWorld Calendar.
 *
 * v2.4 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx/summary
 * - Manual array operations instead of spread/Set/Map
 * - concat() instead of spread operator
 *
 * v2.3 Features:
 * - GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific sports content (Opening Day, championships, etc.)
 * - Holiday-specific streaming patterns
 * - First Friday arts streaming
 * - Creation Day local content
 * - Sports season playoff/championship integration
 * - Calendar context in output
 * - Aligned with GodWorld Calendar v1.0
 *
 * TIME & CANON PROTOCOL:
 * - Sports content uses S.sportsSeason (Sports Clock, Maker-controlled)
 * - Weather/sentiment/chaos use GodWorld systems
 * - Does NOT overwrite S.sportsSeason
 *
 * Previous features (v2.2):
 * - sportsSeason from applySportsSeason_v2_2
 * - activeSports array
 * - chaos, weather, sentiment, economic mood
 * - city rhythm (nightlife / public spaces)
 *
 * ============================================================================
 */

function buildEveningSportsAndStreaming_(ctx) {

  // Defensive guard
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};

  var S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS CLOCK (Maker-controlled or SimMonth-calculated)
  // ═══════════════════════════════════════════════════════════════════════════
  var sportsSeason = S.sportsSeason || "off-season";
  var activeSports = S.activeSports || [];
  var sportsSeasonOakland = S.sportsSeasonOakland || sportsSeason;
  var sportsSeasonChicago = S.sportsSeasonChicago || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // GODWORLD SYSTEMS (atmosphere, not sports scheduling)
  // ═══════════════════════════════════════════════════════════════════════════
  var chaos = S.worldEvents || [];
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var dynamics = S.cityDynamics || {};
  var sentiment = dynamics.sentiment || 0;
  var nightlife = S.nightlifeVolume || 0;
  var econMood = S.economicMood || 50;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;

  // Helper for random pick
  var pickRandom = function(arr) {
    if (typeof pickRandom_ === 'function') return pickRandom_(arr);
    return arr[Math.floor(Math.random() * arr.length)];
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS CONTENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  // Spring Training content
  var SPRING_TRAINING_SPORTS = [
    { name: "A's Spring Training Preview", type: "baseball", venue: "Jack London" },
    { name: "Minor League Spotlight – Prospects Night", type: "baseball", venue: "Jack London" },
    { name: "Spring Training Roster Battles", type: "baseball", venue: "Jack London" },
    { name: "College Baseball Warm-Up", type: "baseball", venue: "Downtown" }
  ];

  // Early/Regular Season content
  var REGULAR_SEASON_SPORTS = [
    { name: "A's Home Game", type: "baseball", venue: "Jack London" },
    { name: "A's Road Game", type: "baseball", venue: "away" },
    { name: "Ballpark Feature: Rising Star Watch", type: "baseball", venue: "Jack London" },
    { name: "Oakland Roots Soccer Match", type: "soccer", venue: "Lake Merritt" },
    { name: "Summer League Basketball", type: "basketball", venue: "Downtown" }
  ];

  // Late Season / Pennant Race content
  var PENNANT_RACE_SPORTS = [
    { name: "A's Playoff Push", type: "baseball", venue: "Jack London" },
    { name: "Pennant Race Fever", type: "baseball", venue: "Jack London" },
    { name: "Must-Win Series", type: "baseball", venue: "Jack London" },
    { name: "Wild Card Watch", type: "baseball", venue: "various" }
  ];

  // Playoffs / Post-Season content
  var PLAYOFFS_SPORTS = [
    { name: "A's Playoff Game", type: "baseball", venue: "Jack London" },
    { name: "Postseason Watch Party", type: "baseball", venue: "Jack London" },
    { name: "ALDS Coverage", type: "baseball", venue: "Jack London" },
    { name: "ALCS Showdown", type: "baseball", venue: "Jack London" },
    { name: "World Series Night", type: "baseball", venue: "Jack London" }
  ];

  // Off-Season content (basketball focus)
  var OFFSEASON_SPORTS = [
    { name: "Warriors Home Game", type: "basketball", venue: "Downtown" },
    { name: "Warriors Road Game", type: "basketball", venue: "away" },
    { name: "Winter Indoor League Highlights", type: "recreation", venue: "Fruitvale" },
    { name: "College Bowl Watch", type: "football", venue: "various" },
    { name: "Hot Stove League Talk", type: "baseball-offseason", venue: "various" }
  ];

  // Basketball-specific content (Bulls/Warriors)
  var BASKETBALL_REGULAR = [
    { name: "Warriors Home Game", type: "basketball", venue: "Downtown" },
    { name: "Warriors Road Game", type: "basketball", venue: "away" },
    { name: "Bulls Game (Chicago Feed)", type: "basketball", venue: "Chicago" }
  ];

  var BASKETBALL_PLAYOFFS = [
    { name: "Warriors Playoff Game", type: "basketball", venue: "Downtown" },
    { name: "NBA Playoffs Watch Party", type: "basketball", venue: "Jack London" },
    { name: "Bulls Playoff Run (Chicago Feed)", type: "basketball", venue: "Chicago" }
  ];

  var BASKETBALL_PRESEASON = [
    { name: "Warriors Preseason Look", type: "basketball", venue: "Downtown" },
    { name: "NBA Preview Night", type: "basketball", venue: "various" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY SPORTS POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  var OPENING_DAY_SPORTS = [
    { name: "A's Opening Day", type: "baseball", venue: "Jack London" },
    { name: "Opening Day Parade", type: "event", venue: "Downtown" },
    { name: "First Pitch Ceremony", type: "baseball", venue: "Jack London" },
    { name: "Opening Day Block Party", type: "event", venue: "Jack London" }
  ];

  var THANKSGIVING_SPORTS = [
    { name: "NFL Thanksgiving Triple-Header", type: "football", venue: "home" },
    { name: "Turkey Day Football Feast", type: "football", venue: "home" },
    { name: "College Football Rivalry Week", type: "football", venue: "various" }
  ];

  var NEW_YEARS_DAY_SPORTS = [
    { name: "Rose Bowl Classic", type: "football", venue: "home" },
    { name: "New Year's Six Bowl Games", type: "football", venue: "home" },
    { name: "College Football Playoff Watch", type: "football", venue: "Downtown" }
  ];

  var SUPER_BOWL_SPORTS = [
    { name: "Super Bowl Watch Party", type: "football", venue: "Jack London" },
    { name: "Super Bowl Sunday Gathering", type: "event", venue: "Downtown" },
    { name: "Big Game Viewing", type: "football", venue: "various" }
  ];

  var INDEPENDENCE_SPORTS = [
    { name: "Fourth of July Doubleheader", type: "baseball", venue: "Jack London" },
    { name: "Independence Day Classic", type: "baseball", venue: "Jack London" },
    { name: "Patriotic Baseball Night", type: "baseball", venue: "Jack London" }
  ];

  var MEMORIAL_DAY_SPORTS = [
    { name: "Memorial Day Classic", type: "baseball", venue: "Jack London" },
    { name: "Indianapolis 500 Watch", type: "racing", venue: "home" },
    { name: "Summer Sports Kickoff", type: "various", venue: "various" }
  ];

  var LABOR_DAY_SPORTS = [
    { name: "Labor Day Weekend Baseball", type: "baseball", venue: "Jack London" },
    { name: "End of Summer Series", type: "baseball", venue: "Jack London" },
    { name: "College Football Kickoff", type: "football", venue: "various" }
  ];

  var MLK_DAY_SPORTS = [
    { name: "MLK Day Basketball Triple-Header", type: "basketball", venue: "Downtown" },
    { name: "Dr. King Legacy Game", type: "basketball", venue: "Downtown" }
  ];

  var CHRISTMAS_SPORTS = [
    { name: "NBA Christmas Day Games", type: "basketball", venue: "home" },
    { name: "Christmas Basketball Marathon", type: "basketball", venue: "home" },
    { name: "Holiday Hoops", type: "basketball", venue: "Downtown" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAMPIONSHIP SPORTS POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  var CHAMPIONSHIP_SPORTS = [
    { name: "Championship Game Watch", type: "championship", venue: "Jack London" },
    { name: "Title Night Oakland", type: "championship", venue: "Downtown" },
    { name: "Championship Fever Block Party", type: "event", venue: "Lake Merritt" },
    { name: "Finals Watch Party", type: "championship", venue: "Jack London" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD SPORTS POOL
  // ═══════════════════════════════════════════════════════════════════════════

  var sportsPool = [];

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY SPORTS (v2.3) - Highest priority
  // ───────────────────────────────────────────────────────────────────────────

  if (holiday === "OpeningDay") {
    sportsPool = sportsPool.concat(OPENING_DAY_SPORTS, OPENING_DAY_SPORTS);
  }
  if (holiday === "Thanksgiving") {
    sportsPool = sportsPool.concat(THANKSGIVING_SPORTS, THANKSGIVING_SPORTS);
  }
  if (holiday === "NewYear") {
    sportsPool = sportsPool.concat(NEW_YEARS_DAY_SPORTS, NEW_YEARS_DAY_SPORTS);
  }
  if (holiday === "SuperBowl") {
    sportsPool = sportsPool.concat(SUPER_BOWL_SPORTS, SUPER_BOWL_SPORTS);
  }
  if (holiday === "Independence") {
    sportsPool = sportsPool.concat(INDEPENDENCE_SPORTS, INDEPENDENCE_SPORTS);
  }
  if (holiday === "MemorialDay") {
    sportsPool = sportsPool.concat(MEMORIAL_DAY_SPORTS);
  }
  if (holiday === "LaborDay") {
    sportsPool = sportsPool.concat(LABOR_DAY_SPORTS);
  }
  if (holiday === "MLKDay") {
    sportsPool = sportsPool.concat(MLK_DAY_SPORTS);
  }
  if (holiday === "Holiday") {
    sportsPool = sportsPool.concat(CHRISTMAS_SPORTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHAMPIONSHIP SEASON (v2.3)
  // ───────────────────────────────────────────────────────────────────────────
  if (sportsSeason === "championship" || sportsSeasonOakland === "championship") {
    sportsPool = sportsPool.concat(CHAMPIONSHIP_SPORTS, CHAMPIONSHIP_SPORTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Sports Clock state (not GodWorld season)
  // ───────────────────────────────────────────────────────────────────────────

  // Oakland A's (baseball)
  if (sportsSeasonOakland === "spring-training") {
    sportsPool = sportsPool.concat(SPRING_TRAINING_SPORTS);
  } else if (sportsSeasonOakland === "early-season" || sportsSeasonOakland === "mid-season" || sportsSeasonOakland === "regular-season") {
    sportsPool = sportsPool.concat(REGULAR_SEASON_SPORTS);
  } else if (sportsSeasonOakland === "late-season") {
    sportsPool = sportsPool.concat(PENNANT_RACE_SPORTS);
  } else if (sportsSeasonOakland === "playoffs" || sportsSeasonOakland === "post-season") {
    sportsPool = sportsPool.concat(PLAYOFFS_SPORTS);
  } else if (sportsSeasonOakland === "off-season" && holiday === "none") {
    sportsPool = sportsPool.concat(OFFSEASON_SPORTS);
  }

  // Chicago Bulls (basketball) - add if active
  if (sportsSeasonChicago === "regular-season") {
    sportsPool = sportsPool.concat(BASKETBALL_REGULAR);
  } else if (sportsSeasonChicago === "playoffs" || sportsSeasonChicago === "championship" || sportsSeasonChicago === "finals") {
    sportsPool = sportsPool.concat(BASKETBALL_PLAYOFFS);
  } else if (sportsSeasonChicago === "preseason") {
    sportsPool = sportsPool.concat(BASKETBALL_PRESEASON);
  }

  // Also check activeSports array for additional context
  var hasBasketball = activeSports.indexOf("basketball") !== -1 || activeSports.indexOf("basketball-playoffs") !== -1;
  if (hasBasketball) {
    var poolHasBasketball = false;
    for (var bi = 0; bi < sportsPool.length; bi++) {
      if (sportsPool[bi].type === "basketball") { poolHasBasketball = true; break; }
    }
    if (!poolHasBasketball) {
      sportsPool = sportsPool.concat(BASKETBALL_REGULAR);
    }
  }
  if (activeSports.indexOf("basketball-finals") !== -1) {
    sportsPool.push({ name: "NBA Finals Watch", type: "basketball", venue: "Downtown" });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GodWorld modifiers (atmosphere, not scheduling)
  // ───────────────────────────────────────────────────────────────────────────

  // Chaos reduces big-event sports, increases talk shows
  if (chaos.length >= 3) {
    sportsPool.push({ name: "Sports Analysis Night – City Impact Roundtable", type: "talk", venue: "Downtown" });
  }

  // Sentiment lifts or dampens sports interest
  if (sentiment >= 0.3) {
    sportsPool.push({ name: "Community Watch Party", type: "social", venue: "Lake Merritt" });
  }
  if (sentiment <= -0.3) {
    sportsPool.push({ name: "Low Attendance Expected", type: "note", venue: "various" });
  }

  // Weather influences sports viewing preference (indoor vs outdoor)
  if (weather.impact >= 1.3 || weather.type === "rain") {
    sportsPool.push({ name: "Indoor Sports Highlights Compilation", type: "recap", venue: "home" });
  }

  // Weather mood
  if (weatherMood.primaryMood === 'cozy') {
    sportsPool.push({ name: "Cozy Sports Night In", type: "home-viewing", venue: "home" });
  }

  // Economic mood affects ticket sales narrative
  if (econMood >= 65) {
    sportsPool.push({ name: "Sold-Out Stadium Night", type: "event", venue: "Jack London" });
  }
  if (econMood <= 35) {
    sportsPool.push({ name: "Budget-Friendly Sports Bar Viewing", type: "social", venue: "West Oakland" });
  }

  // Safety: Ensure pool not empty
  if (sportsPool.length === 0) {
    sportsPool.push({ name: "Sports Recap Night", type: "recap", venue: "home" });
  }

  // Unique by name (ES5 compatible)
  var seenSports = {};
  var uniqueSportsPool = [];
  for (var si = 0; si < sportsPool.length; si++) {
    var sp = sportsPool[si];
    if (!seenSports[sp.name]) {
      seenSports[sp.name] = true;
      uniqueSportsPool.push(sp);
    }
  }
  sportsPool = uniqueSportsPool;

  var eveningSportsObj = pickRandom(sportsPool);

  // ═══════════════════════════════════════════════════════════════════════════
  // STREAMING LOGIC (v2.3 - Calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  var BASE_STREAMING = [
    "crime-drama rotation",
    "sitcom spike",
    "documentary run",
    "reality-show bump",
    "sci-fi mini-surge"
  ];

  var STORM_STREAMING = [
    "comfort-TV marathon",
    "homebound movie run",
    "slow-burn drama trend"
  ];

  var CHAOS_STREAMING = [
    "breaking-news loop",
    "political commentary wave",
    "city-impact livestream spike"
  ];

  var HIGH_SENTIMENT_STREAMING = [
    "feel-good comedy arc",
    "romantic-series mini-run",
    "uplifting documentary trend"
  ];

  var LOW_SENTIMENT_STREAMING = [
    "dark-thriller surge",
    "true-crime spike",
    "heavy-drama rotation"
  ];

  var COZY_STREAMING = [
    "comfort rewatch marathon",
    "classic film night",
    "nostalgic series revival"
  ];

  var BUDGET_STREAMING = [
    "free-tier binge night",
    "ad-supported movie run",
    "library content surge"
  ];

  var UPSCALE_STREAMING = [
    "premium documentary premiere",
    "exclusive series launch",
    "prestige drama debut"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY STREAMING POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  var THANKSGIVING_STREAMING = [
    "holiday movie marathon",
    "family comedy binge",
    "Thanksgiving classics rotation"
  ];

  var HOLIDAY_STREAMING = [
    "holiday movie marathon",
    "seasonal classics binge",
    "winter wonderland films",
    "festive family viewing"
  ];

  var NEW_YEARS_EVE_STREAMING = [
    "countdown special streaming",
    "year-in-review marathons",
    "midnight movie countdown"
  ];

  var HALLOWEEN_STREAMING = [
    "horror movie marathon",
    "spooky series binge",
    "Halloween classics rotation",
    "supernatural thriller night"
  ];

  var VALENTINE_STREAMING = [
    "romantic comedy marathon",
    "love story classics",
    "date-night movie picks"
  ];

  var INDEPENDENCE_STREAMING = [
    "patriotic film classics",
    "action movie marathon",
    "summer blockbuster binge"
  ];

  var PRIDE_STREAMING = [
    "LGBTQ+ cinema celebration",
    "Pride documentary marathon",
    "queer classics rotation"
  ];

  var MLK_STREAMING = [
    "civil rights documentary marathon",
    "Black history cinema",
    "social justice film series"
  ];

  var JUNETEENTH_STREAMING = [
    "Black cinema celebration",
    "freedom documentary series",
    "Black excellence film rotation"
  ];

  var DIA_DE_MUERTOS_STREAMING = [
    "Día de los Muertos specials",
    "Latin cinema celebration",
    "cultural film marathon"
  ];

  var LUNAR_NEW_YEAR_STREAMING = [
    "Asian cinema celebration",
    "Lunar New Year specials",
    "martial arts classics marathon"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY STREAMING (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  var FIRST_FRIDAY_STREAMING = [
    "art documentary premiere",
    "indie film showcase",
    "artist profile series",
    "creative documentary rotation"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY STREAMING (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  var CREATION_DAY_STREAMING = [
    "Oakland history documentary",
    "local filmmaker showcase",
    "Bay Area cinema celebration",
    "community stories series"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD STREAMING POOL
  // ═══════════════════════════════════════════════════════════════════════════

  var streamPool = BASE_STREAMING.slice();

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY STREAMING (v2.3)
  // ───────────────────────────────────────────────────────────────────────────

  if (holiday === "Thanksgiving") {
    streamPool = streamPool.concat(THANKSGIVING_STREAMING, THANKSGIVING_STREAMING);
  }
  if (holiday === "Holiday" || holiday === "NewYear") {
    streamPool = streamPool.concat(HOLIDAY_STREAMING, HOLIDAY_STREAMING);
  }
  if (holiday === "NewYearsEve") {
    streamPool = streamPool.concat(NEW_YEARS_EVE_STREAMING, NEW_YEARS_EVE_STREAMING);
  }
  if (holiday === "Halloween") {
    streamPool = streamPool.concat(HALLOWEEN_STREAMING, HALLOWEEN_STREAMING);
  }
  if (holiday === "Valentine") {
    streamPool = streamPool.concat(VALENTINE_STREAMING, VALENTINE_STREAMING);
  }
  if (holiday === "Independence" || holiday === "MemorialDay" || holiday === "LaborDay") {
    streamPool = streamPool.concat(INDEPENDENCE_STREAMING);
  }
  if (holiday === "OaklandPride") {
    streamPool = streamPool.concat(PRIDE_STREAMING, PRIDE_STREAMING);
  }
  if (holiday === "MLKDay") {
    streamPool = streamPool.concat(MLK_STREAMING, MLK_STREAMING);
  }
  if (holiday === "Juneteenth") {
    streamPool = streamPool.concat(JUNETEENTH_STREAMING, JUNETEENTH_STREAMING);
  }
  if (holiday === "DiaDeMuertos") {
    streamPool = streamPool.concat(DIA_DE_MUERTOS_STREAMING, DIA_DE_MUERTOS_STREAMING);
  }
  if (holiday === "LunarNewYear") {
    streamPool = streamPool.concat(LUNAR_NEW_YEAR_STREAMING, LUNAR_NEW_YEAR_STREAMING);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY (v2.3)
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    streamPool = streamPool.concat(FIRST_FRIDAY_STREAMING, FIRST_FRIDAY_STREAMING);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY (v2.3)
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    streamPool = streamPool.concat(CREATION_DAY_STREAMING, CREATION_DAY_STREAMING);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY (v2.3)
  // ───────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    streamPool = streamPool.concat(FIRST_FRIDAY_STREAMING);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMMUNITY ENGAGEMENT (v2.3)
  // ───────────────────────────────────────────────────────────────────────────
  if (communityEngagement >= 1.4) {
    streamPool = streamPool.concat(CREATION_DAY_STREAMING);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER & MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.impact >= 1.3) streamPool = streamPool.concat(STORM_STREAMING);
  if (weatherMood.primaryMood === 'cozy') streamPool = streamPool.concat(COZY_STREAMING);

  // ───────────────────────────────────────────────────────────────────────────
  // CHAOS
  // ───────────────────────────────────────────────────────────────────────────
  if (chaos.length >= 3) streamPool = streamPool.concat(CHAOS_STREAMING);

  // ───────────────────────────────────────────────────────────────────────────
  // SENTIMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (sentiment >= 0.3) streamPool = streamPool.concat(HIGH_SENTIMENT_STREAMING);
  if (sentiment <= -0.3) streamPool = streamPool.concat(LOW_SENTIMENT_STREAMING);

  // ───────────────────────────────────────────────────────────────────────────
  // ECONOMIC MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (econMood >= 65) streamPool = streamPool.concat(UPSCALE_STREAMING);
  if (econMood <= 35) streamPool = streamPool.concat(BUDGET_STREAMING);

  // ───────────────────────────────────────────────────────────────────────────
  // NIGHTLIFE (low nightlife = more streaming)
  // ───────────────────────────────────────────────────────────────────────────
  if (nightlife <= 3) {
    streamPool.push("indoor binge-night");
  }
  if (nightlife >= 8) {
    streamPool.push("background streaming – out-and-about crowd");
  }

  var streamingTrend = pickRandom(streamPool);

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  S.eveningSports = eveningSportsObj ? eveningSportsObj.name : "(none)";
  S.eveningSportsDetails = eveningSportsObj || null;
  S.streamingTrend = streamingTrend || "(none)";

  // v2.3: Calendar context
  S.eveningSportsCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    sportsSeasonOakland: sportsSeasonOakland,
    sportsSeasonChicago: sportsSeasonChicago
  };

  // NOTE: Do NOT overwrite S.sportsSeason here
  // It is set by applySportsSeason_v2_2 and should not be modified

  ctx.summary = S;
}


/**
 * ============================================================================
 * EVENING SPORTS & STREAMING REFERENCE
 * ============================================================================
 * 
 * HOLIDAY SPORTS POOLS (v2.3):
 * 
 * | Holiday | Content | Notes |
 * |---------|---------|-------|
 * | OpeningDay | 4 | A's Opening Day events |
 * | Thanksgiving | 3 | NFL triple-header, football |
 * | NewYear | 3 | Bowl games, CFP |
 * | SuperBowl | 3 | Watch parties |
 * | Independence | 3 | July 4th doubleheader |
 * | MemorialDay | 3 | Indy 500, baseball |
 * | LaborDay | 3 | Baseball, CFB kickoff |
 * | MLKDay | 2 | NBA triple-header |
 * | Holiday | 3 | NBA Christmas games |
 * 
 * CHAMPIONSHIP SPORTS (4):
 * - Championship Game Watch, Title Night, Block Party, Finals Watch
 * 
 * HOLIDAY STREAMING POOLS (v2.3):
 * 
 * | Holiday | Themes |
 * |---------|--------|
 * | Thanksgiving | Holiday movies, family comedy |
 * | Holiday/NewYear | Seasonal classics, festive |
 * | NewYearsEve | Countdown specials, year-in-review |
 * | Halloween | Horror, spooky, supernatural |
 * | Valentine | Romantic comedy, love stories |
 * | Independence | Patriotic, action, blockbusters |
 * | OaklandPride | LGBTQ+ cinema, Pride docs |
 * | MLKDay | Civil rights docs, Black history |
 * | Juneteenth | Black cinema, freedom docs |
 * | DiaDeMuertos | Latin cinema, cultural films |
 * | LunarNewYear | Asian cinema, martial arts |
 * 
 * FIRST FRIDAY STREAMING (4):
 * - Art documentary, indie film, artist profiles, creative docs
 * 
 * CREATION DAY STREAMING (4):
 * - Oakland history, local filmmakers, Bay Area cinema, community stories
 * 
 * OUTPUT:
 * - eveningSports: string
 * - eveningSportsDetails: {name, type, venue}
 * - streamingTrend: string
 * - eveningSportsCalendarContext: {holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, sportsSeasonOakland, sportsSeasonChicago}
 * 
 * ============================================================================
 */