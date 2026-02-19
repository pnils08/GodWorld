/**
 * ============================================================================
 * buildEveningFood_ v2.4
 * ============================================================================
 *
 * World-aware restaurant/food selection with GodWorld Calendar integration.
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
 * - Holiday-specific restaurant pools and trends
 * - First Friday arts district dining
 * - Creation Day community gathering spots
 * - Sports season game-day food
 * - Cultural activity and community engagement effects
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Season, weather, chaos, sentiment
 * - Economic mood integration
 * - Nightlife and traffic effects
 * - Oakland neighborhood integration
 *
 * ============================================================================
 */

function buildEveningFood_(ctx) {

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
  var dynamics = S.cityDynamics || { sentiment: 0, traffic: 1, culturalActivity: 1, communityEngagement: 1 };
  var sentiment = dynamics.sentiment || 0;
  var traffic = dynamics.traffic || 1;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;
  var nightlife = S.nightlifeVolume || 0;
  var civicLoad = S.civicLoad || "";
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
  // OAKLAND NEIGHBORHOODS (12 - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT POOLS (Oakland-themed)
  // ═══════════════════════════════════════════════════════════════════════════

  var UPSCALE = [
    { name: "OakHouse", neighborhood: "Rockridge" },
    { name: "Blue Lantern", neighborhood: "Jack London" },
    { name: "The 44th Table", neighborhood: "Downtown" },
    { name: "Merritt Reserve", neighborhood: "Lake Merritt" },
    { name: "Rockridge Cellar", neighborhood: "Rockridge" },
    { name: "Piedmont Heights", neighborhood: "Piedmont Ave" }
  ];

  var CASUAL = [
    { name: "Harborline Grill", neighborhood: "Jack London" },
    { name: "Miso Metro", neighborhood: "Downtown" },
    { name: "Temescal Tap", neighborhood: "Temescal" },
    { name: "Fruitvale Diner", neighborhood: "Fruitvale" },
    { name: "Laurel Noodle", neighborhood: "Laurel" },
    { name: "West Side Cafe", neighborhood: "West Oakland" },
    { name: "KONO Kitchen", neighborhood: "KONO" },
    { name: "Uptown Eats", neighborhood: "Uptown" }
  ];

  var NIGHTLIFE_FOOD = [
    { name: "Midnight Bistro", neighborhood: "Downtown" },
    { name: "Neon Kitchen", neighborhood: "Jack London" },
    { name: "Railway Late Eats", neighborhood: "West Oakland" },
    { name: "Merritt AfterDark", neighborhood: "Lake Merritt" },
    { name: "Uptown After Hours", neighborhood: "Uptown" }
  ];

  var WINTER_COMFORT = [
    { name: "Steamhaven Bowls", neighborhood: "Temescal" },
    { name: "Cozy Pot", neighborhood: "Rockridge" },
    { name: "Warm Hearth Kitchen", neighborhood: "Laurel" }
  ];

  var SUMMER_SPOTS = [
    { name: "Harbor Patio", neighborhood: "Jack London" },
    { name: "Sunset Tortilla Bar", neighborhood: "Fruitvale" },
    { name: "Dockhouse BBQ", neighborhood: "Jack London" },
    { name: "Lakeside Grill", neighborhood: "Lake Merritt" }
  ];

  var CHAOS_FOOD = [
    { name: "Civic Street Tacos", neighborhood: "Downtown" },
    { name: "Crisis Coffee Co.", neighborhood: "West Oakland" },
    { name: "Broadline Grab-N-Go", neighborhood: "Fruitvale" }
  ];

  var BUDGET_SPOTS = [
    { name: "Dollar Pho", neighborhood: "Fruitvale" },
    { name: "Value Eats", neighborhood: "West Oakland" },
    { name: "Budget Bites", neighborhood: "Downtown" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY RESTAURANT POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  var THANKSGIVING_SPOTS = [
    { name: "Harvest Table", neighborhood: "Rockridge" },
    { name: "Family Feast Kitchen", neighborhood: "Temescal" },
    { name: "Gratitude Dining", neighborhood: "Lake Merritt" },
    { name: "Turkey Day Buffet", neighborhood: "Downtown" }
  ];

  var HOLIDAY_SPOTS = [
    { name: "Winter Wonderland Cafe", neighborhood: "Piedmont Ave" },
    { name: "Seasonal Spirits", neighborhood: "Rockridge" },
    { name: "Holiday Hearth", neighborhood: "Temescal" },
    { name: "Festive Feast", neighborhood: "Downtown" }
  ];

  var LUNAR_NEW_YEAR_SPOTS = [
    { name: "Golden Dragon", neighborhood: "Chinatown" },
    { name: "Lucky Dim Sum", neighborhood: "Chinatown" },
    { name: "Red Envelope Kitchen", neighborhood: "Chinatown" },
    { name: "New Year Noodle House", neighborhood: "Downtown" }
  ];

  var CINCO_SPOTS = [
    { name: "El Mercado Fruitvale", neighborhood: "Fruitvale" },
    { name: "Taco Fiesta", neighborhood: "Fruitvale" },
    { name: "Cinco Cantina", neighborhood: "Fruitvale" },
    { name: "Margarita Mile", neighborhood: "Jack London" }
  ];

  var DIA_DE_MUERTOS_SPOTS = [
    { name: "Altar Kitchen", neighborhood: "Fruitvale" },
    { name: "Marigold Cafe", neighborhood: "Fruitvale" },
    { name: "Ancestor's Table", neighborhood: "Fruitvale" }
  ];

  var BBQ_HOLIDAY_SPOTS = [
    { name: "Independence Grill", neighborhood: "Jack London" },
    { name: "Patriot BBQ", neighborhood: "West Oakland" },
    { name: "Summer Cookout Kitchen", neighborhood: "Lake Merritt" },
    { name: "Fireworks BBQ", neighborhood: "Temescal" }
  ];

  var SPORTS_GAME_FOOD = [
    { name: "Stadium Grill", neighborhood: "Jack London" },
    { name: "Green & Gold Tavern", neighborhood: "Jack London" },
    { name: "Ninth Inning Bar", neighborhood: "Jack London" },
    { name: "Playoff Pub", neighborhood: "Downtown" },
    { name: "Championship Eats", neighborhood: "Jack London" }
  ];

  var FIRST_FRIDAY_SPOTS = [
    { name: "Gallery Bites", neighborhood: "Uptown" },
    { name: "Art Walk Cafe", neighborhood: "KONO" },
    { name: "Canvas Kitchen", neighborhood: "Temescal" },
    { name: "First Friday Food Hall", neighborhood: "Uptown" },
    { name: "Creative Cuisine", neighborhood: "KONO" }
  ];

  var CREATION_DAY_SPOTS = [
    { name: "Founders Table", neighborhood: "Downtown" },
    { name: "Oakland Roots Kitchen", neighborhood: "West Oakland" },
    { name: "Heritage Dining", neighborhood: "Lake Merritt" },
    { name: "Community Gathering", neighborhood: "Temescal" }
  ];

  var PRIDE_SPOTS = [
    { name: "Rainbow Kitchen", neighborhood: "Downtown" },
    { name: "Pride Cafe", neighborhood: "Lake Merritt" },
    { name: "Love Wins Bistro", neighborhood: "Uptown" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // FAST FOOD POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var FAST_BASE = [
    { name: "SpeedyBurger", neighborhood: "Downtown" },
    { name: "ChicknBox", neighborhood: "Fruitvale" },
    { name: "TacoRail", neighborhood: "West Oakland" },
    { name: "NoodleFast", neighborhood: "Temescal" },
    { name: "HotSlice Pizza", neighborhood: "Rockridge" }
  ];

  var LATE_NIGHT = [
    { name: "NightBite Grill", neighborhood: "Downtown" },
    { name: "AfterHours Fry", neighborhood: "Jack London" },
    { name: "Midnight Rollout", neighborhood: "Lake Merritt" }
  ];

  var WINTER_FAST = [
    { name: "StewCup Express", neighborhood: "Downtown" },
    { name: "SoupStop", neighborhood: "Temescal" },
    { name: "WarmBun Kitchen", neighborhood: "Laurel" }
  ];

  var GAME_DAY_FAST = [
    { name: "Stadium Dogs", neighborhood: "Jack London" },
    { name: "Quick Score Burger", neighborhood: "Jack London" },
    { name: "Inning Eats Express", neighborhood: "Downtown" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD DYNAMIC POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var restaurantPool = [].concat(CASUAL);

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY POOLS (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (holiday === "Thanksgiving") {
    restaurantPool = restaurantPool.concat(THANKSGIVING_SPOTS, THANKSGIVING_SPOTS);
  }

  if (holiday === "Holiday" || holiday === "NewYearsEve" || holiday === "NewYear") {
    restaurantPool = restaurantPool.concat(HOLIDAY_SPOTS, HOLIDAY_SPOTS);
  }

  if (holiday === "LunarNewYear") {
    restaurantPool = restaurantPool.concat(LUNAR_NEW_YEAR_SPOTS, LUNAR_NEW_YEAR_SPOTS, LUNAR_NEW_YEAR_SPOTS);
  }

  if (holiday === "CincoDeMayo") {
    restaurantPool = restaurantPool.concat(CINCO_SPOTS, CINCO_SPOTS, CINCO_SPOTS);
  }

  if (holiday === "DiaDeMuertos") {
    restaurantPool = restaurantPool.concat(DIA_DE_MUERTOS_SPOTS, DIA_DE_MUERTOS_SPOTS);
  }

  if (holiday === "Independence" || holiday === "MemorialDay" || holiday === "LaborDay") {
    restaurantPool = restaurantPool.concat(BBQ_HOLIDAY_SPOTS, SUMMER_SPOTS);
  }

  if (holiday === "OaklandPride") {
    restaurantPool = restaurantPool.concat(PRIDE_SPOTS, PRIDE_SPOTS);
  }

  if (holiday === "OpeningDay") {
    restaurantPool = restaurantPool.concat(SPORTS_GAME_FOOD, SPORTS_GAME_FOOD, SPORTS_GAME_FOOD);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    restaurantPool = restaurantPool.concat(FIRST_FRIDAY_SPOTS, FIRST_FRIDAY_SPOTS, NIGHTLIFE_FOOD);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    restaurantPool = restaurantPool.concat(CREATION_DAY_SPOTS, CREATION_DAY_SPOTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (sportsSeason === "championship") {
    restaurantPool = restaurantPool.concat(SPORTS_GAME_FOOD, SPORTS_GAME_FOOD, SPORTS_GAME_FOOD);
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    restaurantPool = restaurantPool.concat(SPORTS_GAME_FOOD, SPORTS_GAME_FOOD);
  } else if (sportsSeason === "late-season") {
    restaurantPool = restaurantPool.concat(SPORTS_GAME_FOOD);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    restaurantPool = restaurantPool.concat(FIRST_FRIDAY_SPOTS, UPSCALE);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMMUNITY ENGAGEMENT (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (communityEngagement >= 1.4) {
    restaurantPool = restaurantPool.concat(CREATION_DAY_SPOTS, CASUAL);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SEASONAL
  // ───────────────────────────────────────────────────────────────────────────
  if (season === "Winter" && holiday === "none") restaurantPool = restaurantPool.concat(WINTER_COMFORT);
  if (season === "Summer" && holiday === "none") restaurantPool = restaurantPool.concat(SUMMER_SPOTS);

  // ───────────────────────────────────────────────────────────────────────────
  // NIGHTLIFE
  // ───────────────────────────────────────────────────────────────────────────
  if (nightlife >= 7) restaurantPool = restaurantPool.concat(NIGHTLIFE_FOOD);

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.impact >= 1.3) restaurantPool = restaurantPool.concat(WINTER_COMFORT);
  if (weatherMood.primaryMood === 'cozy') restaurantPool = restaurantPool.concat(WINTER_COMFORT);
  if (weatherMood.perfectWeather && holiday === "none") restaurantPool = restaurantPool.concat(SUMMER_SPOTS);

  // ───────────────────────────────────────────────────────────────────────────
  // CHAOS
  // ───────────────────────────────────────────────────────────────────────────
  if (chaos.length > 0) restaurantPool = restaurantPool.concat(CHAOS_FOOD);

  // ───────────────────────────────────────────────────────────────────────────
  // SENTIMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (sentiment >= 0.3) restaurantPool = restaurantPool.concat(UPSCALE);
  if (sentiment <= -0.3) restaurantPool = restaurantPool.concat(CASUAL);

  // ───────────────────────────────────────────────────────────────────────────
  // ECONOMIC MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (econMood >= 65) restaurantPool = restaurantPool.concat(UPSCALE);
  if (econMood <= 35) restaurantPool = restaurantPool.concat(BUDGET_SPOTS);

  // v2.3: ES5 deduplication (instead of Map)
  var seenRestaurants = {};
  var uniqueRestaurants = [];
  for (var i = 0; i < restaurantPool.length; i++) {
    var item = restaurantPool[i];
    if (!seenRestaurants[item.name]) {
      seenRestaurants[item.name] = true;
      uniqueRestaurants.push(item);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAST FOOD SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  var fastPool = [].concat(FAST_BASE);

  if (nightlife >= 7) fastPool = fastPool.concat(LATE_NIGHT);
  if (weather.impact >= 1.3 || season === "Winter") fastPool = fastPool.concat(WINTER_FAST);
  if (traffic >= 1.3) {
    fastPool.push({ name: "TransitQuick", neighborhood: "Downtown" });
  }

  // v2.2: Sports game day fast food
  if (sportsSeason !== "off-season" || holiday === "OpeningDay") {
    fastPool = fastPool.concat(GAME_DAY_FAST);
  }

  // v2.3: ES5 deduplication
  var seenFast = {};
  var uniqueFast = [];
  for (var j = 0; j < fastPool.length; j++) {
    var fastItem = fastPool[j];
    if (!seenFast[fastItem.name]) {
      seenFast[fastItem.name] = true;
      uniqueFast.push(fastItem);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PICK FINAL OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  // v2.3: ES5 compatible pickRandom
  var pickRandom = function(arr, count) {
    if (typeof pickRandomSet_ === 'function') {
      return pickRandomSet_(arr, count);
    }
    return arr.sort(function() { return rng() - 0.5; }).slice(0, count);
  };

  // v2.2: More restaurants on special occasions
  var restaurantCount = rng() < 0.3 ? 3 : 2;
  if (holidayPriority === "major" || holidayPriority === "oakland") restaurantCount = 3;
  if (isFirstFriday) restaurantCount = 3;
  if (sportsSeason === "championship") restaurantCount = 4;

  var selectedRestaurants = pickRandom(uniqueRestaurants, restaurantCount);
  var selectedFast = pickRandom(uniqueFast, sportsSeason !== "off-season" ? 2 : 1);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD TREND DESCRIPTION (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  var trend = "Standard evening dining rhythm";

  // Calendar trends take priority
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
  for (var k = 0; k < selectedRestaurants.length; k++) {
    restaurantNames.push(selectedRestaurants[k].name);
  }

  var fastNames = [];
  for (var m = 0; m < selectedFast.length; m++) {
    fastNames.push(selectedFast[m].name);
  }

  S.eveningFood = {
    restaurants: restaurantNames,
    restaurantDetails: selectedRestaurants,
    fast: fastNames,
    fastDetails: selectedFast,
    trend: trend,
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

  ctx.summary = S;
}


/**
 * ============================================================================
 * EVENING FOOD REFERENCE
 * ============================================================================
 *
 * RESTAURANT POOLS:
 * - Base: UPSCALE (6), CASUAL (8), NIGHTLIFE_FOOD (5)
 * - Seasonal: WINTER_COMFORT (3), SUMMER_SPOTS (4)
 * - Situational: CHAOS_FOOD (3), BUDGET_SPOTS (3)
 *
 * HOLIDAY POOLS (v2.2):
 * - THANKSGIVING_SPOTS (4): Harvest Table, Family Feast Kitchen, etc.
 * - HOLIDAY_SPOTS (4): Winter Wonderland Cafe, Seasonal Spirits, etc.
 * - LUNAR_NEW_YEAR_SPOTS (4): Golden Dragon, Lucky Dim Sum, etc.
 * - CINCO_SPOTS (4): El Mercado Fruitvale, Taco Fiesta, etc.
 * - DIA_DE_MUERTOS_SPOTS (3): Altar Kitchen, Marigold Cafe, etc.
 * - BBQ_HOLIDAY_SPOTS (4): Independence Grill, Patriot BBQ, etc.
 * - PRIDE_SPOTS (3): Rainbow Kitchen, Pride Cafe, etc.
 * - SPORTS_GAME_FOOD (5): Stadium Grill, Green & Gold Tavern, etc.
 * - FIRST_FRIDAY_SPOTS (5): Gallery Bites, Art Walk Cafe, etc.
 * - CREATION_DAY_SPOTS (4): Founders Table, Oakland Roots Kitchen, etc.
 *
 * FAST FOOD POOLS:
 * - FAST_BASE (5), LATE_NIGHT (3), WINTER_FAST (3)
 * - GAME_DAY_FAST (3) - v2.2
 *
 * RESTAURANT COUNT:
 * - Base: 2-3
 * - Major/Oakland holiday: 3
 * - First Friday: 3
 * - Championship: 4
 *
 * HOLIDAY TRENDS (v2.2):
 * - Thanksgiving → "Thanksgiving feast dining - family gatherings"
 * - Holiday/NYE → "Holiday celebration dining - festive atmosphere"
 * - LunarNewYear → "Lunar New Year dining - Chinatown spotlight"
 * - CincoDeMayo → "Cinco de Mayo dining - Fruitvale fiesta"
 * - DiaDeMuertos → "Día de los Muertos dining - traditional remembrance"
 * - Independence/Memorial/Labor → "BBQ and outdoor dining - summer celebration"
 * - OaklandPride → "Pride celebration dining - inclusive atmosphere"
 * - OpeningDay → "Opening Day dining - stadium district buzzing"
 * - First Friday → "First Friday arts district dining - gallery crowd"
 * - Creation Day → "Creation Day community dining - local roots"
 * - Championship → "Championship fever dining - game day crowds"
 * - Playoffs → "Playoff tension dining - sports bar surge"
 *
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 *
 * ============================================================================
 */
