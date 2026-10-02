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

  if (holiday === "SecondDawn") {
    seeds.push(
      seed("The city marks the week it found its voice", "COMMUNITY"),
      seed("Neighbors tell the city's stories out loud", "CULTURE")
    );
  }

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


  if (holiday === "Easter") {
    seeds.push(
      seed("Easter gatherings shift family patterns", "COMMUNITY"),
      seed("Spring celebration energy lifts neighborhood mood", "CULTURE"),
      seed("Religious observances shape morning routines", "COMMUNITY")
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







  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND-SPECIFIC HOLIDAYS
  // ═══════════════════════════════════════════════════════════════════════════






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