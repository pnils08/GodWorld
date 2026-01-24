/**
 * ============================================================================
 * generateGenericCitizens_ v2.4
 * ============================================================================
 *
 * World-aware background citizen generation with GodWorld Calendar integration.
 *
 * v2.4 Changes from v2.3:
 * - Full ES5 conversion for Google Apps Script compatibility
 * - Added First/Last header guard for nameExists() safety
 * - Removed unused holidayPriority and logSheet variables
 * - Normalize duplicate name check (case-insensitive)
 * - BirthYear range updated: 1966-2023 (ages 18-75 in 2041)
 * - Changed "Born into population" to "Arrived in Oakland"
 *
 * v2.3 Changes from v2.2:
 * - Writes to Generic_Citizens instead of Simulation_Ledger
 * - Uses BirthYear instead of Age (calculated from SimYear 2041)
 * - No POPID assigned (assigned on promotion to Simulation_Ledger)
 *
 * v2.2 Features retained:
 * - Expanded to 12 Oakland neighborhoods
 * - Full GodWorld Calendar integration (30+ holidays)
 * - First Friday draws creative arrivals to arts districts
 * - Creation Day provides settling bonus
 * - Holiday-specific spawn modifiers
 * - Sports season crowd effects
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Season, Weather, Weather Mood
 * - Chaos, City Dynamics, Economic Mood
 * - Sports Season awareness
 *
 * Always generates Tier-4 ENGINE citizens.
 * Never creates UNI / MED / CIV.
 * No lore characters.
 *
 * ============================================================================
 */

function generateGenericCitizens_(ctx) {

  var ss = ctx.ss;
  var genericSheet = ss.getSheetByName('Generic_Citizens');
  if (!genericSheet) return;

  var genericValues = genericSheet.getDataRange().getValues();
  var header = genericValues[0];

  function idx(n) {
    return header.indexOf(n);
  }

  var iFirst = idx('First');
  var iLast = idx('Last');
  var iBirthYear = idx('BirthYear');
  var iNeighborhood = idx('Neighborhood');
  var iOccupation = idx('Occupation');
  var iEmergenceCount = idx('EmergenceCount');
  var iStatus = idx('Status');
  var iCreatedCycle = idx('CreatedCycle');
  var iLifeHistory = idx('LifeHistory');

  // v2.4: Required header guard for duplicate checking
  if (iFirst < 0 || iLast < 0) {
    Logger.log('generateGenericCitizens_: Missing First/Last headers; cannot ensure uniqueness.');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD STATE
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary;
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var sportsSeason = S.sportsSeason || "off-season";
  var econMood = S.economicMood || 50;
  var cycle = S.cycleId || ctx.config.cycleCount || 0;

  // Calendar context (v2.2)
  var holiday = S.holiday || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE SPAWN COUNT (World + Calendar Aware)
  // ═══════════════════════════════════════════════════════════════════════════
  var baseCount = Math.floor(Math.random() * 2) + 1; // 1–2 normally

  // Summer → higher population churn + tourism movement
  if (season === "Summer") baseCount += 1;

  // Chaos → population turbulence
  if (chaos.length > 0 && Math.random() < 0.4) baseCount += 1;

  // Weather volatility → slight adjustments
  if (weather.impact >= 1.3 && Math.random() < 0.3) baseCount += 1;

  // Economic boom attracts people
  if (econMood >= 65 && Math.random() < 0.3) baseCount += 1;

  // Perfect weather attracts people
  if (weatherMood.perfectWeather && Math.random() < 0.2) baseCount += 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR SPAWN MODIFIERS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  // Travel holidays bring temporary residents / new arrivals
  var travelHolidays = [
    "Thanksgiving", "Holiday", "NewYear", "MemorialDay",
    "LaborDay", "Independence"
  ];
  if (travelHolidays.indexOf(holiday) >= 0) {
    baseCount += 1;
  }

  // Oakland celebration holidays draw new residents
  var oaklandCelebrations = [
    "OpeningDay", "OaklandPride", "ArtSoulFestival", "Juneteenth"
  ];
  if (oaklandCelebrations.indexOf(holiday) >= 0 && Math.random() < 0.5) {
    baseCount += 1;
  }

  // Cultural holidays may draw diaspora arrivals
  var culturalHolidays = [
    "CincoDeMayo", "DiaDeMuertos", "LunarNewYear", "Juneteenth"
  ];
  if (culturalHolidays.indexOf(holiday) >= 0 && Math.random() < 0.4) {
    baseCount += 1;
  }

  // First Friday draws creative types to Oakland
  if (isFirstFriday && Math.random() < 0.4) {
    baseCount += 1;
  }

  // Creation Day — settling energy, people put down roots
  if (isCreationDay && Math.random() < 0.3) {
    baseCount += 1;
  }

  // Championship brings temporary population surge
  if (sportsSeason === "championship") {
    baseCount += 1;
  } else if ((sportsSeason === "playoffs" || sportsSeason === "post-season") && Math.random() < 0.4) {
    baseCount += 1;
  }

  // High cultural activity attracts creative arrivals
  if (dynamics.culturalActivity >= 1.4 && Math.random() < 0.3) {
    baseCount += 1;
  }

  // High community engagement suggests welcoming environment
  if (dynamics.communityEngagement >= 1.4 && Math.random() < 0.25) {
    baseCount += 1;
  }

  // Quiet holidays reduce arrivals (people staying home)
  var quietHolidays = ["Easter", "MothersDay", "FathersDay"];
  if (quietHolidays.indexOf(holiday) >= 0 && Math.random() < 0.5) {
    baseCount -= 1;
  }

  // Soft cap
  if (baseCount > 5) baseCount = 5;
  if (baseCount < 0) baseCount = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // NAME POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  var firstNames = [
    "Carlos", "Mina", "Andre", "Jordan", "Brianna", "Sofia", "Tariq", "Elena", "Marcus",
    "Kaila", "Tobias", "Lorenzo", "Ariana", "Xavier", "Lila", "Darius", "Ramon", "Ivy",
    "Maya", "Jamal", "Priya", "Diego", "Aaliyah", "Oscar", "Jasmine", "Terrell", "Camila",
    "Wei", "Mei", "Jun", "Yuki", "Kenji", "Anh", "Linh", "Tran", "Esperanza", "Guadalupe"
  ];

  var lastNames = [
    "Lopez", "Carter", "Nguyen", "Patel", "Jackson", "Harris", "Wong", "Thompson",
    "Brown", "Lee", "Lewis", "Jordan", "Reyes", "Scott", "Ward", "Foster", "Cook",
    "Martinez", "Robinson", "Kim", "Davis", "Garcia", "Chen", "Williams", "Santos",
    "Tran", "Chung", "Park", "Liu", "Hernandez", "Ramirez", "Cruz", "Mendoza"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // OCCUPATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  var occupations = [
    "Barista", "Server", "Cook", "Bartender", "Retail clerk", "Cashier",
    "Driver", "Warehouse worker", "Mechanic", "Electrician", "Plumber",
    "Painter", "Teacher", "Nurse", "Office worker", "Security guard",
    "Hair stylist", "Janitor", "Bus driver", "Delivery driver",
    "Construction worker", "Landscaper", "Receptionist", "Bank teller",
    "Pharmacy tech", "Dental assistant", "Home health aide"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOODS (12 - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  // Base neighborhood weights
  var neighborhoodWeights = {
    'Temescal': 1.2,
    'Downtown': 1.3,
    'Fruitvale': 1.0,
    'Lake Merritt': 1.1,
    'West Oakland': 1.0,
    'Laurel': 0.9,
    'Rockridge': 0.8,
    'Jack London': 1.1,
    'Uptown': 1.2,
    'KONO': 1.0,
    'Chinatown': 0.9,
    'Piedmont Ave': 0.7
  };

  // Arts neighborhoods for First Friday
  var artsNeighborhoods = ["Uptown", "KONO", "Temescal", "Jack London"];

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  // v2.4: Normalize strings for comparison
  function norm(s) {
    return String(s || '').trim().toLowerCase();
  }

  // v2.4: Case-insensitive duplicate check
  function nameExists(first, last) {
    var normFirst = norm(first);
    var normLast = norm(last);
    for (var r = 1; r < genericValues.length; r++) {
      if (norm(genericValues[r][iFirst]) === normFirst &&
          norm(genericValues[r][iLast]) === normLast) {
        return true;
      }
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR-AWARE NEIGHBORHOOD PICKER (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  function pickWeightedNeighborhood() {
    // v2.4: Manual copy instead of spread operator
    var weights = {};
    for (var key in neighborhoodWeights) {
      if (neighborhoodWeights.hasOwnProperty(key)) {
        weights[key] = neighborhoodWeights[key];
      }
    }

    // First Friday boosts arts neighborhoods
    if (isFirstFriday) {
      for (var a = 0; a < artsNeighborhoods.length; a++) {
        var artN = artsNeighborhoods[a];
        weights[artN] = (weights[artN] || 1.0) + 0.4;
      }
    }

    // Lunar New Year boosts Chinatown
    if (holiday === "LunarNewYear") {
      weights['Chinatown'] = (weights['Chinatown'] || 1.0) + 0.5;
    }

    // CincoDeMayo / DiaDeMuertos boosts Fruitvale
    if (holiday === "CincoDeMayo" || holiday === "DiaDeMuertos") {
      weights['Fruitvale'] = (weights['Fruitvale'] || 1.0) + 0.4;
    }

    // Opening Day / Sports boosts Jack London / Downtown
    if (holiday === "OpeningDay" || sportsSeason === "championship") {
      weights['Jack London'] = (weights['Jack London'] || 1.0) + 0.4;
      weights['Downtown'] = (weights['Downtown'] || 1.0) + 0.3;
    }

    // Oakland Pride boosts Downtown / Lake Merritt
    if (holiday === "OaklandPride") {
      weights['Downtown'] = (weights['Downtown'] || 1.0) + 0.3;
      weights['Lake Merritt'] = (weights['Lake Merritt'] || 1.0) + 0.3;
      weights['Uptown'] = (weights['Uptown'] || 1.0) + 0.3;
    }

    // Art & Soul boosts Downtown
    if (holiday === "ArtSoulFestival") {
      weights['Downtown'] = (weights['Downtown'] || 1.0) + 0.5;
    }

    // High cultural activity boosts arts neighborhoods
    if (dynamics.culturalActivity >= 1.4) {
      for (var b = 0; b < artsNeighborhoods.length; b++) {
        var artN2 = artsNeighborhoods[b];
        weights[artN2] = (weights[artN2] || 1.0) + 0.2;
      }
    }

    // Build weighted array
    var weighted = [];
    for (var n = 0; n < neighborhoods.length; n++) {
      var neighborhood = neighborhoods[n];
      var weight = weights[neighborhood] || 1.0;
      var count = Math.round(weight * 10);
      for (var c = 0; c < count; c++) {
        weighted.push(neighborhood);
      }
    }
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  // Track new citizens for summary
  var newCitizens = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (var i = 0; i < baseCount; i++) {

    var first = "";
    var last = "";
    var attempts = 0;

    do {
      first = firstNames[Math.floor(Math.random() * firstNames.length)];
      last = lastNames[Math.floor(Math.random() * lastNames.length)];
      attempts++;
    } while (nameExists(first, last) && attempts < 50);

    if (attempts >= 50) continue;

    // v2.4: BirthYear range 1966-2023 → ages 18-75 in 2041
    var minBirthYear = 1966;  // Age 75 in 2041
    var maxBirthYear = 2023;  // Age 18 in 2041
    var birthYear = minBirthYear + Math.floor(Math.random() * (maxBirthYear - minBirthYear + 1));

    var neighborhood = pickWeightedNeighborhood();
    var occupation = occupations[Math.floor(Math.random() * occupations.length)];

    var newRow = [];
    for (var h = 0; h < header.length; h++) {
      newRow.push("");
    }

    if (iFirst >= 0) newRow[iFirst] = first;
    if (iLast >= 0) newRow[iLast] = last;
    if (iBirthYear >= 0) newRow[iBirthYear] = birthYear;
    if (iNeighborhood >= 0) newRow[iNeighborhood] = neighborhood;
    if (iOccupation >= 0) newRow[iOccupation] = occupation;
    if (iEmergenceCount >= 0) newRow[iEmergenceCount] = 0;
    if (iStatus >= 0) newRow[iStatus] = 'Active';
    if (iCreatedCycle >= 0) newRow[iCreatedCycle] = cycle;

    // ═══════════════════════════════════════════════════════════════════════
    // WORLD + CALENDAR AWARE LIFEHISTORY (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    var worldContext = "";

    // Seasonal context
    if (season === "Winter") worldContext = "Arrived during winter's quiet cycle.";
    if (season === "Spring") worldContext = "Entered Oakland during spring's renewal.";
    if (season === "Summer") worldContext = "Moved to Oakland in a lively summer period.";
    if (season === "Fall") worldContext = "Joined the city during the fall transition.";

    // Weather context
    if (weatherMood.perfectWeather) worldContext += " Perfect weather welcomed the newcomer.";
    if (weather.impact >= 1.3) worldContext += " Weather volatility marked their arrival.";

    // Chaos context
    if (chaos.length > 0) worldContext += " Period of city-level disturbance.";

    // Economic context
    if (econMood >= 65) worldContext += " Economic optimism in the area.";
    if (econMood <= 35) worldContext += " Arrived despite economic uncertainty.";

    // Calendar context (v2.2)
    if (holiday !== "none") {
      var holidayContextMap = {
        "Thanksgiving": " Arrived during Thanksgiving travel.",
        "Holiday": " Holiday movement influenced this arrival.",
        "NewYear": " New year brought a fresh start.",
        "Independence": " Independence Day celebrations drew them in.",
        "MemorialDay": " Arrived during Memorial Day weekend.",
        "LaborDay": " Labor Day weekend marked their arrival.",
        "OpeningDay": " Baseball excitement welcomed them.",
        "OaklandPride": " Pride celebration energy drew them to Oakland.",
        "Juneteenth": " Juneteenth celebration welcomed their arrival.",
        "CincoDeMayo": " Cinco de Mayo festivities marked their arrival.",
        "DiaDeMuertos": " Día de los Muertos spirit welcomed them.",
        "LunarNewYear": " Lunar New Year brought new beginnings.",
        "ArtSoulFestival": " Art & Soul Festival energy drew them in."
      };
      if (holidayContextMap[holiday]) {
        worldContext += holidayContextMap[holiday];
      }
    }

    if (isFirstFriday) {
      if (artsNeighborhoods.indexOf(neighborhood) >= 0) {
        worldContext += " First Friday's creative energy drew them to the arts district.";
      } else {
        worldContext += " First Friday evening welcomed new faces.";
      }
    }

    if (isCreationDay) {
      worldContext += " Creation Day marked their entry into Oakland's story.";
    }

    if (sportsSeason === "championship") {
      worldContext += " Championship fever filled the city.";
    } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
      worldContext += " Playoff excitement energized the city.";
    }

    if (dynamics.culturalActivity >= 1.4) {
      worldContext += " High cultural activity enriched their arrival.";
    }

    if (dynamics.communityEngagement >= 1.4) {
      worldContext += " Strong community welcomed the newcomer.";
    }

    // v2.4: Changed from "Born into population" to "Arrived in Oakland"
    if (iLifeHistory >= 0) {
      newRow[iLifeHistory] = "Arrived in Oakland during Cycle " + cycle + ". Settled in " + neighborhood + ". " + worldContext;
    }

    // Write to Generic_Citizens
    var writeRow = genericSheet.getLastRow() + 1;
    genericSheet.getRange(writeRow, 1, 1, newRow.length).setValues([newRow]);

    // Update local array for duplicate checking
    genericValues.push(newRow);

    // Track for summary
    newCitizens.push({
      name: (first + " " + last).trim(),
      neighborhood: neighborhood,
      birthYear: birthYear,
      occupation: occupation,
      calendarContext: {
        holiday: holiday,
        isFirstFriday: isFirstFriday,
        isCreationDay: isCreationDay,
        sportsSeason: sportsSeason
      }
    });

    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
  }

  // Summary
  S.newGenericCitizens = newCitizens;
  S.genericCitizensGenerated = newCitizens.length;
  ctx.summary = S;

  Logger.log('generateGenericCitizens_ v2.4: Generated ' + newCitizens.length + ' citizens');
}


/**
 * ============================================================================
 * GENERIC CITIZENS GENERATOR REFERENCE v2.4
 * ============================================================================
 *
 * CHANGES FROM v2.3:
 * - Full ES5 conversion (var, indexOf, classic for loops)
 * - Added First/Last header guard for nameExists() safety
 * - Removed unused holidayPriority and logSheet variables
 * - Normalize duplicate name check (case-insensitive)
 * - BirthYear range: 1966-2023 (ages 18-75 in SimYear 2041)
 * - Changed "Born into population" to "Arrived in Oakland"
 *
 * CHANGES FROM v2.2:
 * - Writes to Generic_Citizens (not Simulation_Ledger)
 * - Uses BirthYear column (not Age)
 * - No POPID (assigned on promotion)
 *
 * BASE SPAWN: 1-2 citizens per cycle
 *
 * SPAWN MODIFIERS:
 *
 * SEASONAL/WEATHER:
 * - Summer: +1
 * - Weather impact ≥1.3: +1 (30% chance)
 * - Perfect weather: +1 (20% chance)
 *
 * WORLD STATE:
 * - Chaos events: +1 (40% chance)
 * - Economic boom (≥65): +1 (30% chance)
 *
 * CALENDAR MODIFIERS (v2.2):
 *
 * | Factor | Effect |
 * |--------|--------|
 * | Travel holidays | +1 |
 * | Oakland celebrations | +1 (50% chance) |
 * | Cultural holidays | +1 (40% chance) |
 * | First Friday | +1 (40% chance) |
 * | Creation Day | +1 (30% chance) |
 * | Championship | +1 |
 * | Playoffs | +1 (40% chance) |
 * | High cultural activity | +1 (30% chance) |
 * | High community engagement | +1 (25% chance) |
 * | Quiet holidays | -1 (50% chance) |
 *
 * SPAWN CAP: 0-5 citizens per cycle
 *
 * BIRTHYEAR RANGE: 1966-2023 (ages 18-75 in SimYear 2041)
 *
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 *
 * ============================================================================
 */
