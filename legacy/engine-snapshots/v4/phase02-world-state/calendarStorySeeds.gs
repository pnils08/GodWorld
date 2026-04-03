/**
 * ============================================================================
 * applySeasonalStorySeeds_ v2.4 (ES5)
 * ============================================================================
 *
 * Generates seasonal story seeds with domain tagging.
 * Aligned with GodWorld Calendar v1.0 and getSimHoliday_ v2.3.
 *
 * v2.4 Changes:
 * - ES5 safe: const/let -> var, arrow functions -> function expressions
 * - forEach -> for loop, spread operator -> manual array building
 *
 * v2.3 Fixes:
 * - Removed WinterSolstice (calendar never emits it)
 * - Fixed weatherMood check: 'energetic' → 'energized'
 * - Removed sportsSeason-based seeds (user controls sports sim)
 * - Fixed seed object: 'seed' → 'text' (downstream compatibility)
 *
 * v2.2 Enhancements:
 * - All 30+ holidays from cycle-based calendar
 * - First Friday story seeds
 * - Creation Day special seeds
 * - Oakland-specific and cultural holiday seeds
 * - Holiday priority awareness
 * - Neighborhood-specific seeds where applicable
 *
 * ============================================================================
 */

function applySeasonalStorySeeds_(ctx) {

  var seeds = [];
  var S = ctx.summary;
  var season = S.season;
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var holidayNeighborhood = S.holidayNeighborhood || null;
  var events = S.worldEvents || [];
  var W = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var D = S.cityDynamics || {};
  var econMood = S.economicMood || 50;
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var creationDayAnniversary = S.creationDayAnniversary;
  var cycleOfYear = S.cycleOfYear || 1;

  // Helper to create seed object (v2.3: use 'text' for downstream compatibility)
  // ES5: function expression instead of arrow function
  function seed(text, domain, neighborhood) {
    return {
      text: text,
      domain: domain || 'GENERAL',
      source: 'seasonal',
      neighborhood: neighborhood || null
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONS
  // ═══════════════════════════════════════════════════════════════════════════

  if (season === "Winter") {
    seeds.push(
      seed("Winter conditions shape resident routines", "COMMUNITY"),
      seed("Colder evenings influence community activity", "COMMUNITY"),
      seed("Indoor gathering spaces see increased use", "COMMUNITY")
    );
  }

  if (season === "Spring") {
    seeds.push(
      seed("Spring renewal influences civic and community behavior", "CIVIC"),
      seed("City transitions out of winter slowdown", "COMMUNITY"),
      seed("Outdoor spaces reawaken with activity", "COMMUNITY")
    );
  }

  if (season === "Summer") {
    seeds.push(
      seed("Summer activity surge increases nightlife and public traffic", "COMMUNITY"),
      seed("Season brings higher festival and event frequency", "CULTURE"),
      seed("Extended daylight hours change city rhythms", "COMMUNITY")
    );
  }

  if (season === "Fall") {
    seeds.push(
      seed("Fall school and civic cycles intensify", "CIVIC"),
      seed("Seasonal slowdown begins in public spaces", "COMMUNITY"),
      seed("Harvest themes emerge in neighborhood events", "CULTURE")
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY (Oakland monthly art walk)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isFirstFriday) {
    seeds.push(
      seed("First Friday art walk draws crowds to galleries", "CULTURE", "Uptown"),
      seed("Street vendors and artists activate neighborhood corners", "CULTURE", "KONO"),
      seed("Evening foot traffic surges in art districts", "COMMUNITY", "Temescal"),
      seed("Local restaurants see First Friday spillover crowds", "ECONOMIC", "Downtown")
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY (GodWorld Special - Cycle 48)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isCreationDay || holiday === "CreationDay") {
    seeds.push(
      seed("Citizens sense something foundational in the air", "COMMUNITY"),
      seed("Long-time residents recall the early days", "COMMUNITY"),
      seed("The city feels connected to its origins", "CULTURE")
    );
    
    if (creationDayAnniversary !== null && creationDayAnniversary > 0) {
      seeds.push(
        seed("Anniversary reflections ripple through conversations", "COMMUNITY"),
        seed("Markers of time and change become visible", "CIVIC")
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAJOR HOLIDAYS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "NewYear") {
    seeds.push(
      seed("New Year optimism shapes early conversations", "COMMUNITY"),
      seed("Resolution energy influences resident behavior", "COMMUNITY"),
      seed("Fresh-start mentality visible in daily routines", "CULTURE")
    );
  }

  if (holiday === "NewYearsEve") {
    seeds.push(
      seed("New Year's Eve celebrations impact night activity", "CULTURE", "Downtown"),
      seed("Holiday gatherings drive community flow", "COMMUNITY"),
      seed("Countdown energy builds through the evening", "CULTURE")
    );
  }

  if (holiday === "MLKDay") {
    seeds.push(
      seed("MLK Day observances shape community reflection", "CIVIC", "West Oakland"),
      seed("Service events honor the day's meaning", "COMMUNITY"),
      seed("Conversations turn to justice and legacy", "CIVIC")
    );
  }

  if (holiday === "Easter") {
    seeds.push(
      seed("Easter gatherings shift family patterns", "COMMUNITY"),
      seed("Spring celebration energy lifts neighborhood mood", "CULTURE"),
      seed("Religious observances shape morning routines", "COMMUNITY")
    );
  }

  if (holiday === "MemorialDay") {
    seeds.push(
      seed("Memorial Day marks unofficial summer start", "COMMUNITY"),
      seed("Long weekend influences resident travel patterns", "COMMUNITY"),
      seed("Remembrance ceremonies honor service members", "CIVIC")
    );
  }

  if (holiday === "Juneteenth") {
    seeds.push(
      seed("Juneteenth celebrations energize Oakland communities", "CULTURE", "West Oakland"),
      seed("Cultural pride visible in street celebrations", "COMMUNITY"),
      seed("Historical significance shapes public gatherings", "CIVIC"),
      seed("Block parties and cookouts activate neighborhoods", "CULTURE")
    );
  }

  if (holiday === "Independence") {
    seeds.push(
      seed("Independence festivities increase crowds and movement", "CIVIC", "Lake Merritt"),
      seed("Holiday energy shapes public-space activity", "COMMUNITY"),
      seed("Fireworks anticipation builds through the day", "CULTURE"),
      seed("Barbecue smoke signals neighborhood gatherings", "COMMUNITY")
    );
  }

  if (holiday === "LaborDay") {
    seeds.push(
      seed("Labor Day marks summer's symbolic end", "COMMUNITY"),
      seed("Long weekend influences resident travel patterns", "COMMUNITY"),
      seed("Workers reflect on labor and livelihood", "CIVIC")
    );
  }

  if (holiday === "Halloween") {
    seeds.push(
      seed("Halloween events energize evening activity", "CULTURE", "Temescal"),
      seed("Neighborhood trick-or-treat traditions active", "COMMUNITY"),
      seed("Costume creativity on display throughout the city", "CULTURE"),
      seed("Spooky decorations transform neighborhood streets", "COMMUNITY")
    );
  }

  if (holiday === "Thanksgiving") {
    seeds.push(
      seed("Thanksgiving gatherings shift family patterns", "COMMUNITY"),
      seed("Holiday travel affects city movement", "INFRASTRUCTURE"),
      seed("Gratitude themes emerge in conversations", "COMMUNITY"),
      seed("Cooking aromas drift through residential blocks", "COMMUNITY")
    );
  }

  if (holiday === "Holiday") {  // Christmas
    seeds.push(
      seed("Holiday season gatherings influence city rhythm", "COMMUNITY"),
      seed("Seasonal gifting cycle increases retail load", "ECONOMIC"),
      seed("Decorations transform neighborhood aesthetics", "CULTURE"),
      seed("Family reunions reshape household dynamics", "COMMUNITY")
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL HOLIDAYS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "BlackHistoryMonth") {
    seeds.push(
      seed("Black History Month observances shape cultural programming", "CULTURE", "West Oakland"),
      seed("Educational events highlight historical contributions", "CIVIC"),
      seed("Community discussions center heritage and legacy", "COMMUNITY")
    );
  }

  if (holiday === "CincoDeMayo") {
    seeds.push(
      seed("Cinco de Mayo celebrations activate Fruitvale", "CULTURE", "Fruitvale"),
      seed("Mariachi music drifts through neighborhood streets", "CULTURE"),
      seed("Mexican heritage pride visible in public gatherings", "COMMUNITY"),
      seed("Restaurants and bars see celebratory crowds", "ECONOMIC", "Fruitvale")
    );
  }

  if (holiday === "PrideMonth") {
    seeds.push(
      seed("Pride Month visibility increases across the city", "CULTURE", "Downtown"),
      seed("Rainbow flags appear in storefronts and windows", "COMMUNITY"),
      seed("LGBTQ+ community events draw participation", "CULTURE")
    );
  }

  if (holiday === "IndigenousPeoplesDay") {
    seeds.push(
      seed("Indigenous Peoples Day shifts civic conversation", "CIVIC"),
      seed("Native heritage observances shape the day's meaning", "CULTURE"),
      seed("Community reflects on land and history", "COMMUNITY")
    );
  }

  if (holiday === "DiaDeMuertos") {
    seeds.push(
      seed("Día de los Muertos altars appear throughout Fruitvale", "CULTURE", "Fruitvale"),
      seed("Marigold petals and candles honor departed loved ones", "COMMUNITY"),
      seed("Face paint and processions mark the observance", "CULTURE"),
      seed("Families gather at cemeteries and home altars", "COMMUNITY")
    );
  }

  if (holiday === "Hanukkah") {
    seeds.push(
      seed("Hanukkah observances light up family evenings", "CULTURE"),
      seed("Menorah candles visible in neighborhood windows", "COMMUNITY")
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND-SPECIFIC HOLIDAYS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "OpeningDay") {
    seeds.push(
      seed("A's Opening Day energy fills Jack London Square", "SPORTS", "Jack London"),
      seed("Baseball fans don green and gold throughout the city", "CULTURE"),
      seed("Optimism of a new season shapes conversations", "COMMUNITY"),
      seed("Tailgate gatherings activate stadium surroundings", "COMMUNITY", "Jack London")
    );
  }

  if (holiday === "OaklandPride") {
    seeds.push(
      seed("Oakland Pride celebration draws massive crowds", "CULTURE", "Downtown"),
      seed("Pride parade energy transforms downtown streets", "COMMUNITY"),
      seed("LGBTQ+ community visibility at annual peak", "CULTURE"),
      seed("Rainbow colors dominate the urban landscape", "COMMUNITY")
    );
  }

  if (holiday === "EarthDay") {
    seeds.push(
      seed("Earth Day events activate Lake Merritt", "CIVIC", "Lake Merritt"),
      seed("Environmental awareness shapes public conversations", "CIVIC"),
      seed("Volunteer cleanups draw community participation", "COMMUNITY")
    );
  }

  if (holiday === "ArtSoulFestival") {
    seeds.push(
      seed("Art + Soul Festival transforms downtown Oakland", "CULTURE", "Downtown"),
      seed("Music stages and art booths line the streets", "CULTURE"),
      seed("Oakland's creative community on full display", "COMMUNITY"),
      seed("Festival crowds pack restaurants and venues", "ECONOMIC", "Downtown")
    );
  }

  if (holiday === "SummerFestival") {
    seeds.push(
      seed("Summer festival energy spreads through neighborhoods", "CULTURE"),
      seed("Block parties and outdoor events multiply", "COMMUNITY"),
      seed("Seasonal celebration mood lifts public spaces", "COMMUNITY")
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MINOR HOLIDAYS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "Valentine") {
    seeds.push(
      seed("Valentine's Day boosts restaurant and nightlife activity", "CULTURE"),
      seed("Couples visible in parks and dining spots", "COMMUNITY"),
      seed("Flower vendors appear on busy corners", "ECONOMIC")
    );
  }

  if (holiday === "StPatricksDay") {
    seeds.push(
      seed("St. Patrick's Day greens the bar scene", "CULTURE", "Downtown"),
      seed("Pub crowds swell for the occasion", "COMMUNITY")
    );
  }

  if (holiday === "PresidentsDay") {
    seeds.push(
      seed("Presidents Day gives workers a long weekend", "COMMUNITY"),
      seed("Retail sales events draw shoppers", "ECONOMIC")
    );
  }

  if (holiday === "MothersDay") {
    seeds.push(
      seed("Mother's Day brunch crowds fill restaurants", "COMMUNITY"),
      seed("Family gatherings honor maternal figures", "COMMUNITY")
    );
  }

  if (holiday === "FathersDay") {
    seeds.push(
      seed("Father's Day gatherings shape family plans", "COMMUNITY"),
      seed("Barbecue smoke rises from backyards", "COMMUNITY")
    );
  }

  if (holiday === "VeteransDay") {
    seeds.push(
      seed("Veterans Day observances influence civic atmosphere", "CIVIC"),
      seed("Service members honored in public ceremonies", "COMMUNITY")
    );
  }

  if (holiday === "PatriotDay") {  // 9/11
    seeds.push(
      seed("9/11 remembrance creates somber reflection", "CIVIC"),
      seed("Moment of silence observed across the city", "COMMUNITY")
    );
  }

  if (holiday === "BackToSchool") {
    seeds.push(
      seed("Back to school reshapes family routines", "CIVIC"),
      seed("School supply shopping peaks", "ECONOMIC"),
      seed("Morning traffic patterns shift with school buses", "INFRASTRUCTURE")
    );
  }

  // Seasonal markers
  if (holiday === "SpringEquinox") {
    seeds.push(seed("Spring equinox marks seasonal turning point", "ENVIRONMENT"));
  }
  if (holiday === "SummerSolstice") {
    seeds.push(seed("Summer solstice celebrates longest day", "CULTURE", "Lake Merritt"));
  }
  if (holiday === "FallEquinox") {
    seeds.push(seed("Fall equinox signals seasonal shift", "ENVIRONMENT"));
  }
  // v2.3: Removed WinterSolstice (calendar never emits it)

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER
  // ═══════════════════════════════════════════════════════════════════════════

  if (W.type === "rain") seeds.push(seed("Rain shifts evening plans and street activity", "ENVIRONMENT"));
  if (W.type === "fog") seeds.push(seed("Fog changes neighborhood visibility and pace", "ENVIRONMENT"));
  if (W.type === "hot") seeds.push(seed("High heat pushes activity into shaded spaces", "ENVIRONMENT"));
  if (W.type === "cold") seeds.push(seed("Cold weather drives residents indoors", "ENVIRONMENT"));
  if (W.type === "snow") seeds.push(seed("Rare snow event captivates the city", "ENVIRONMENT"));
  if (W.impact >= 1.3) seeds.push(seed("Weather volatility affects resident behavior", "ENVIRONMENT"));

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MOOD
  // ═══════════════════════════════════════════════════════════════════════════

  if (weatherMood.perfectWeather) {
    seeds.push(seed("Perfect weather draws crowds to outdoor spaces", "COMMUNITY"));
  }
  if (weatherMood.primaryMood === 'cozy') {
    seeds.push(seed("Cozy weather encourages indoor gatherings", "COMMUNITY"));
  }
  if (weatherMood.primaryMood === 'energized') {  // v2.3: Fixed - was 'energetic'
    seeds.push(seed("Energized weather mood lifts public activity", "COMMUNITY"));
  }
  if (weatherMood.conflictPotential && weatherMood.conflictPotential > 0.3) {
    seeds.push(seed("Weather conditions raise community tension", "SAFETY"));
  }
  if (weatherMood.nostalgiaFactor && weatherMood.nostalgiaFactor > 0.2) {
    seeds.push(seed("Seasonal nostalgia colors resident reflections", "COMMUNITY"));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC MOOD
  // ═══════════════════════════════════════════════════════════════════════════

  if (econMood >= 65) {
    seeds.push(
      seed("Economic optimism shapes spending patterns", "ECONOMIC"),
      seed("Business activity reflects positive outlook", "ECONOMIC")
    );
  }
  if (econMood <= 35) {
    seeds.push(
      seed("Economic concerns influence household decisions", "ECONOMIC"),
      seed("Budget pressures shape community behavior", "ECONOMIC")
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD EVENTS (seasonal framing)
  // ═══════════════════════════════════════════════════════════════════════════

  // ES5: for loop instead of forEach, string concatenation instead of template literal
  var eventsSlice = events.slice(0, 5);
  for (var evIdx = 0; evIdx < eventsSlice.length; evIdx++) {
    var ev = eventsSlice[evIdx];
    var desc = ev.description || ev.subdomain || 'event';
    var domain = ev.domain || 'GENERAL';
    seeds.push(seed("Season-context: " + desc, domain));
  }

  // v2.3: Removed SPORTS SEASON section (user controls sports sim)
  // OpeningDay is kept as a calendar holiday above

  // ═══════════════════════════════════════════════════════════════════════════
  // CITY DYNAMICS
  // ═══════════════════════════════════════════════════════════════════════════

  if (D.nightlife >= 1.3) seeds.push(seed("Nightlife surge redirects late-evening patterns", "CULTURE"));
  if (D.traffic >= 1.3) seeds.push(seed("Traffic load influences resident movement", "INFRASTRUCTURE"));
  if (D.tourism >= 1.4) seeds.push(seed("Tourism bump increases city-wide activity", "ECONOMIC"));
  if (D.retail >= 1.3) seeds.push(seed("Retail activity elevates commercial districts", "ECONOMIC"));
  if (D.sentiment >= 0.3) seeds.push(seed("Positive public sentiment shapes resident routines", "COMMUNITY"));
  if (D.sentiment <= -0.3) seeds.push(seed("Public tension shapes everyday behavior", "CIVIC"));

  // ═══════════════════════════════════════════════════════════════════════════
  // DEDUPLICATE AND ASSIGN
  // ═══════════════════════════════════════════════════════════════════════════

  // ES5: Manual deduplication instead of spread operator with Map
  var seenTexts = {};
  var uniqueSeeds = [];
  for (var usIdx = 0; usIdx < seeds.length; usIdx++) {
    var seedItem = seeds[usIdx];
    if (!seenTexts[seedItem.text]) {
      seenTexts[seedItem.text] = true;
      uniqueSeeds.push(seedItem);
    }
  }

  S.seasonalStorySeeds = uniqueSeeds;
  ctx.summary = S;
}


/**
 * ============================================================================
 * DOMAIN REFERENCE
 * ============================================================================
 * 
 * Domain         | Used For
 * ─────────────────────────────────────────────────────────────────────────
 * COMMUNITY      | Neighborhood life, gatherings, family patterns
 * CULTURE        | Arts, festivals, celebrations, traditions
 * CIVIC          | Government, observances, public service
 * ECONOMIC       | Business, retail, spending, tourism
 * ENVIRONMENT    | Weather, natural conditions
 * INFRASTRUCTURE | Traffic, transit, city systems
 * SPORTS         | Games, seasons, fan activity
 * SAFETY         | Tension, conflict potential
 * GENERAL        | Catch-all
 * 
 * ============================================================================
 */