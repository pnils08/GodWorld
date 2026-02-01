/**
 * ============================================================================
 * generateGenericCitizens_ v2.6
 * ============================================================================
 *
 * World-aware background citizen generation with GodWorld Calendar integration.
 *
 * v2.6 Changes from v2.5:
 * - Deterministic RNG support via ctx.rng or seededRng_ pattern
 * - Batch writes (all rows written at once instead of one-by-one)
 * - Distribution logging in ctx.summary.genericCitizensDistribution
 * - Expanded name pools (+25 first names, +20 last names) for more variety
 * - Hash set for O(1) duplicate name checking
 * - Follows existing engine RNG patterns (mulberry32/seededRng_)
 *
 * v2.5 Changes from v2.4:
 * - Integrated Tier 3 Neighborhood Demographics weighting
 * - pickWeightedNeighborhood now considers citizen age and demographic fit
 * - Young professionals placed in urban/professional neighborhoods
 * - Students placed near existing student populations
 * - Seniors placed in established/senior-heavy neighborhoods
 * - Demographics influence blended with calendar/cultural weights
 *
 * v2.4 Changes from v2.3:
 * - Full ES5 conversion for Google Apps Script compatibility
 * - Added First/Last header guard for nameExists() safety
 * - Normalize duplicate name check (case-insensitive)
 * - BirthYear range updated: 1966-2023 (ages 18-75 in 2041)
 * - Changed "Born into population" to "Arrived in Oakland"
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
  // v2.6: DETERMINISTIC RNG (follows existing engine patterns)
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary || {};
  var config = ctx.config || {};
  var cycle = S.cycleId || config.cycleCount || 0;

  // Use ctx.rng if available, else create seeded RNG if seed provided, else Math.random
  var rng = null;
  if (ctx.rng && typeof ctx.rng === 'function') {
    rng = ctx.rng;
  } else if (config.rngSeed !== undefined && config.rngSeed !== null) {
    // Use seededRng_ if available, else fallback to inline mulberry32
    if (typeof seededRng_ === 'function') {
      rng = seededRng_((config.rngSeed >>> 0) ^ (cycle >>> 0));
    } else {
      // Inline mulberry32 fallback
      var seed = ((config.rngSeed >>> 0) ^ (cycle >>> 0)) >>> 0;
      rng = function() {
        seed = (seed + 0x6D2B79F5) >>> 0;
        var t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
        t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
  }

  function rand() {
    return rng ? rng() : Math.random();
  }

  function randInt(n) {
    return Math.floor(rand() * n);
  }

  function randItem(arr) {
    return arr[randInt(arr.length)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD STATE
  // ═══════════════════════════════════════════════════════════════════════════
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var sportsSeason = S.sportsSeason || "off-season";
  var econMood = S.economicMood || 50;

  // Calendar context (v2.2)
  var holiday = S.holiday || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE SPAWN COUNT (World + Calendar Aware)
  // ═══════════════════════════════════════════════════════════════════════════
  var baseCount = Math.floor(rand() * 2) + 1; // 1-2 normally

  // Summer -> higher population churn + tourism movement
  if (season === "Summer") baseCount += 1;

  // Chaos -> population turbulence
  if (chaos.length > 0 && rand() < 0.4) baseCount += 1;

  // Weather volatility -> slight adjustments
  if (weather.impact >= 1.3 && rand() < 0.3) baseCount += 1;

  // Economic boom attracts people
  if (econMood >= 65 && rand() < 0.3) baseCount += 1;

  // Perfect weather attracts people
  if (weatherMood.perfectWeather && rand() < 0.2) baseCount += 1;

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
  if (oaklandCelebrations.indexOf(holiday) >= 0 && rand() < 0.5) {
    baseCount += 1;
  }

  // Cultural holidays may draw diaspora arrivals
  var culturalHolidays = [
    "CincoDeMayo", "DiaDeMuertos", "LunarNewYear", "Juneteenth"
  ];
  if (culturalHolidays.indexOf(holiday) >= 0 && rand() < 0.4) {
    baseCount += 1;
  }

  // First Friday draws creative types to Oakland
  if (isFirstFriday && rand() < 0.4) {
    baseCount += 1;
  }

  // Creation Day - settling energy, people put down roots
  if (isCreationDay && rand() < 0.3) {
    baseCount += 1;
  }

  // Championship brings temporary population surge
  if (sportsSeason === "championship") {
    baseCount += 1;
  } else if ((sportsSeason === "playoffs" || sportsSeason === "post-season") && rand() < 0.4) {
    baseCount += 1;
  }

  // High cultural activity attracts creative arrivals
  if (dynamics.culturalActivity >= 1.4 && rand() < 0.3) {
    baseCount += 1;
  }

  // High community engagement suggests welcoming environment
  if (dynamics.communityEngagement >= 1.4 && rand() < 0.25) {
    baseCount += 1;
  }

  // Quiet holidays reduce arrivals (people staying home)
  var quietHolidays = ["Easter", "MothersDay", "FathersDay"];
  if (quietHolidays.indexOf(holiday) >= 0 && rand() < 0.5) {
    baseCount -= 1;
  }

  // Soft cap
  if (baseCount > 5) baseCount = 5;
  if (baseCount < 0) baseCount = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // NAME POOLS (v2.6: Expanded for variety - 62 first, 53 last = 3,286 combos)
  // ═══════════════════════════════════════════════════════════════════════════
  var firstNames = [
    // Original 37
    "Carlos", "Mina", "Andre", "Jordan", "Brianna", "Sofia", "Tariq", "Elena", "Marcus",
    "Kaila", "Tobias", "Lorenzo", "Ariana", "Xavier", "Lila", "Darius", "Ramon", "Ivy",
    "Maya", "Jamal", "Priya", "Diego", "Aaliyah", "Oscar", "Jasmine", "Terrell", "Camila",
    "Wei", "Mei", "Jun", "Yuki", "Kenji", "Anh", "Linh", "Tran", "Esperanza", "Guadalupe",
    // v2.6 additions (25 more - diverse Oakland-appropriate names)
    "Destiny", "Isaiah", "Natasha", "DeShawn", "Monique", "Tyrell", "Alicia", "Malik",
    "Vanessa", "Cedric", "Leticia", "Dwayne", "Gabriela", "Kwame", "Nina", "Rashid",
    "Bianca", "Trevon", "Imani", "Hector", "Sakura", "Javier", "Miriam", "Kofi", "Lucia"
  ];

  var lastNames = [
    // Original 33
    "Lopez", "Carter", "Nguyen", "Patel", "Jackson", "Harris", "Wong", "Thompson",
    "Brown", "Lee", "Lewis", "Jordan", "Reyes", "Scott", "Ward", "Foster", "Cook",
    "Martinez", "Robinson", "Kim", "Davis", "Garcia", "Chen", "Williams", "Santos",
    "Tran", "Chung", "Park", "Liu", "Hernandez", "Ramirez", "Cruz", "Mendoza",
    // v2.6 additions (20 more - diverse Oakland-appropriate names)
    "Washington", "Morales", "Okonkwo", "Yamamoto", "Rivera", "Freeman", "Gutierrez",
    "Singh", "Jefferson", "Flores", "Muhammad", "Torres", "Coleman", "Vasquez", "Adams",
    "Espinoza", "Nakamura", "Reed", "Delgado", "Franklin"
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

  // v2.6: Build hash set for O(1) duplicate checking
  var existingNames = {};
  for (var r = 1; r < genericValues.length; r++) {
    var ef = norm(genericValues[r][iFirst]);
    var el = norm(genericValues[r][iLast]);
    if (ef && el) {
      existingNames[ef + '|' + el] = true;
    }
  }

  // v2.6: O(1) duplicate check using hash set
  function nameExists(first, last) {
    return existingNames[norm(first) + '|' + norm(last)] === true;
  }

  // v2.6: Get unique name with hash set tracking
  function getUniqueName(maxAttempts) {
    var attempts = 0;
    while (attempts < maxAttempts) {
      var f = randItem(firstNames);
      var l = randItem(lastNames);
      var key = norm(f) + '|' + norm(l);
      if (!existingNames[key]) {
        existingNames[key] = true; // Mark as used
        return { first: f, last: l };
      }
      attempts++;
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMOGRAPHIC WEIGHTING (v2.5 - Tier 3 integration)
  // ═══════════════════════════════════════════════════════════════════════════
  var demographicWeights = {};
  if (typeof getDemographicWeightedNeighborhoods_ === 'function') {
    var citizenType = 'young_professional';
    var demographics = getNeighborhoodDemographics_(ss);
    if (demographics && Object.keys(demographics).length > 0) {
      demographicWeights = getDemographicWeightedNeighborhoods_(demographics, citizenType);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR-AWARE NEIGHBORHOOD PICKER (v2.5)
  // ═══════════════════════════════════════════════════════════════════════════
  function pickWeightedNeighborhood(birthYear) {
    var weights = {};
    for (var key in neighborhoodWeights) {
      if (neighborhoodWeights.hasOwnProperty(key)) {
        weights[key] = neighborhoodWeights[key];
      }
    }

    // v2.5: Apply demographic weighting based on citizen age
    var simYear = 2041;
    var age = simYear - (birthYear || 2010);
    var citizenType = 'young_professional';
    if (age >= 5 && age <= 22) {
      citizenType = 'student';
    } else if (age >= 65) {
      citizenType = 'senior';
    } else if (age >= 25 && age <= 40) {
      citizenType = 'young_professional';
    }

    // Apply demographic weights if available
    if (typeof getDemographicWeightedNeighborhoods_ === 'function') {
      var demographics = getNeighborhoodDemographics_(ss);
      if (demographics && Object.keys(demographics).length > 0) {
        var demoWeights = getDemographicWeightedNeighborhoods_(demographics, citizenType);
        for (var hood in demoWeights) {
          if (demoWeights.hasOwnProperty(hood) && weights[hood] !== undefined) {
            weights[hood] = (weights[hood] + demoWeights[hood] * 2) / 3;
          }
        }
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

    // Build weighted array (v2.6: use seeded rand)
    var weighted = [];
    for (var n = 0; n < neighborhoods.length; n++) {
      var neighborhood = neighborhoods[n];
      var weight = weights[neighborhood] || 1.0;
      var count = Math.round(weight * 10);
      for (var c = 0; c < count; c++) {
        weighted.push(neighborhood);
      }
    }
    return weighted[randInt(weighted.length)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: DISTRIBUTION TRACKING
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodCounts = {};
  var citizenTypeCounts = {};

  function getCitizenType(birthYear) {
    var simYear = 2041;
    var age = simYear - (birthYear || 2010);
    if (age >= 5 && age <= 22) return 'student';
    if (age >= 65) return 'senior';
    if (age >= 25 && age <= 40) return 'young_professional';
    return 'adult';
  }

  // Track new citizens for summary
  var newCitizens = [];
  var rowsToWrite = []; // v2.6: Batch write collection

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (var i = 0; i < baseCount; i++) {

    var nameResult = getUniqueName(50);
    if (!nameResult) continue;

    var first = nameResult.first;
    var last = nameResult.last;

    // v2.4: BirthYear range 1966-2023 -> ages 18-75 in 2041
    var minBirthYear = 1966;
    var maxBirthYear = 2023;
    var birthYear = minBirthYear + randInt(maxBirthYear - minBirthYear + 1);

    var neighborhood = pickWeightedNeighborhood(birthYear);
    var occupation = randItem(occupations);

    // v2.6: Track distribution
    neighborhoodCounts[neighborhood] = (neighborhoodCounts[neighborhood] || 0) + 1;
    var citizenType = getCitizenType(birthYear);
    citizenTypeCounts[citizenType] = (citizenTypeCounts[citizenType] || 0) + 1;

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

    if (season === "Winter") worldContext = "Arrived during winter's quiet cycle.";
    if (season === "Spring") worldContext = "Entered Oakland during spring's renewal.";
    if (season === "Summer") worldContext = "Moved to Oakland in a lively summer period.";
    if (season === "Fall") worldContext = "Joined the city during the fall transition.";

    if (weatherMood.perfectWeather) worldContext += " Perfect weather welcomed the newcomer.";
    if (weather.impact >= 1.3) worldContext += " Weather volatility marked their arrival.";

    if (chaos.length > 0) worldContext += " Period of city-level disturbance.";

    if (econMood >= 65) worldContext += " Economic optimism in the area.";
    if (econMood <= 35) worldContext += " Arrived despite economic uncertainty.";

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
        "DiaDeMuertos": " Dia de los Muertos spirit welcomed them.",
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

    if (iLifeHistory >= 0) {
      newRow[iLifeHistory] = "Arrived in Oakland during Cycle " + cycle + ". Settled in " + neighborhood + ". " + worldContext;
    }

    // v2.6: Collect row for batch write
    rowsToWrite.push(newRow);

    // Update local array for duplicate checking (already done via hash set)
    genericValues.push(newRow);

    // Track for summary
    newCitizens.push({
      name: (first + " " + last).trim(),
      neighborhood: neighborhood,
      birthYear: birthYear,
      occupation: occupation,
      citizenType: citizenType,
      calendarContext: {
        holiday: holiday,
        isFirstFriday: isFirstFriday,
        isCreationDay: isCreationDay,
        sportsSeason: sportsSeason
      }
    });

    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: BATCH WRITE (single API call instead of N calls)
  // ═══════════════════════════════════════════════════════════════════════════
  if (rowsToWrite.length > 0) {
    var startRow = genericSheet.getLastRow() + 1;
    genericSheet.getRange(startRow, 1, rowsToWrite.length, rowsToWrite[0].length).setValues(rowsToWrite);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY + DISTRIBUTION LOGGING (v2.6)
  // ═══════════════════════════════════════════════════════════════════════════
  S.newGenericCitizens = newCitizens;
  S.genericCitizensGenerated = newCitizens.length;
  S.genericCitizensDistribution = {
    neighborhoods: neighborhoodCounts,
    citizenTypes: citizenTypeCounts,
    baseCount: baseCount,
    rngMode: rng ? 'seeded' : 'random'
  };
  ctx.summary = S;

  // Build distribution string for logging
  var hoodParts = [];
  for (var hk in neighborhoodCounts) {
    if (neighborhoodCounts.hasOwnProperty(hk)) {
      hoodParts.push(hk + '=' + neighborhoodCounts[hk]);
    }
  }
  var typeParts = [];
  for (var tk in citizenTypeCounts) {
    if (citizenTypeCounts.hasOwnProperty(tk)) {
      typeParts.push(tk + '=' + citizenTypeCounts[tk]);
    }
  }

  Logger.log('generateGenericCitizens_ v2.6: Generated ' + newCitizens.length +
    ' (baseCount=' + baseCount + ', rng=' + (rng ? 'seeded' : 'random') + ')' +
    ' | neighborhoods: ' + hoodParts.join(', ') +
    ' | types: ' + typeParts.join(', '));
}


/**
 * ============================================================================
 * GENERIC CITIZENS GENERATOR REFERENCE v2.6
 * ============================================================================
 *
 * CHANGES FROM v2.5:
 * - Deterministic RNG support (ctx.rng or ctx.config.rngSeed)
 * - Batch writes (all rows at once vs one-by-one)
 * - Distribution logging in ctx.summary.genericCitizensDistribution
 * - Expanded name pools: 62 first names, 53 last names = 3,286 combinations
 * - Hash set for O(1) duplicate checking
 *
 * NAME POOL EXPANSION (v2.6):
 * - Added 25 first names (diverse Oakland-appropriate)
 * - Added 20 last names (diverse Oakland-appropriate)
 * - Previous: 37 x 33 = 1,221 combinations
 * - New: 62 x 53 = 3,286 combinations (2.7x increase)
 *
 * RNG MODES:
 * - ctx.rng function takes precedence
 * - ctx.config.rngSeed creates deterministic seeded RNG
 * - Falls back to Math.random() if neither provided
 *
 * DISTRIBUTION OUTPUT (ctx.summary.genericCitizensDistribution):
 * {
 *   neighborhoods: { 'Downtown': 2, 'Temescal': 1, ... },
 *   citizenTypes: { 'young_professional': 2, 'senior': 1, ... },
 *   baseCount: 3,
 *   rngMode: 'seeded' | 'random'
 * }
 *
 * BASE SPAWN: 1-2 citizens per cycle
 * SPAWN CAP: 0-5 citizens per cycle
 * BIRTHYEAR RANGE: 1966-2023 (ages 18-75 in SimYear 2041)
 *
 * ============================================================================
 */
