/**
 * ============================================================================
 * generateGenericCitizens_ v2.3
 * ============================================================================
 *
 * World-aware background citizen generation with GodWorld Calendar integration.
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

  const ss = ctx.ss;
  const genericSheet = ss.getSheetByName('Generic_Citizens');
  const logSheet = ss.getSheetByName('LifeHistory_Log');
  if (!genericSheet) return;

  const genericValues = genericSheet.getDataRange().getValues();
  const header = genericValues[0];
  const idx = n => header.indexOf(n);

  const iFirst = idx('First');
  const iLast = idx('Last');
  const iBirthYear = idx('BirthYear');
  const iNeighborhood = idx('Neighborhood');
  const iOccupation = idx('Occupation');
  const iEmergenceCount = idx('EmergenceCount');
  const iStatus = idx('Status');
  const iCreatedCycle = idx('CreatedCycle');
  const iLifeHistory = idx('LifeHistory');

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const S = ctx.summary;
  const season = S.season;
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  const sports = S.sportsSeason || "off-season";
  const econMood = S.economicMood || 50;
  const cycle = S.cycleId || ctx.config.cycleCount || 0;

  // Calendar context (v2.2)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE SPAWN COUNT (World + Calendar Aware)
  // ═══════════════════════════════════════════════════════════════════════════
  let baseCount = Math.floor(Math.random() * 2) + 1; // 1–2 normally

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
  const travelHolidays = [
    "Thanksgiving", "Holiday", "NewYear", "MemorialDay", 
    "LaborDay", "Independence"
  ];
  if (travelHolidays.includes(holiday)) {
    baseCount += 1;
  }

  // Oakland celebration holidays draw new residents
  const oaklandCelebrations = [
    "OpeningDay", "OaklandPride", "ArtSoulFestival", "Juneteenth"
  ];
  if (oaklandCelebrations.includes(holiday) && Math.random() < 0.5) {
    baseCount += 1;
  }

  // Cultural holidays may draw diaspora arrivals
  const culturalHolidays = [
    "CincoDeMayo", "DiaDeMuertos", "LunarNewYear", "Juneteenth"
  ];
  if (culturalHolidays.includes(holiday) && Math.random() < 0.4) {
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
  if (sports === "championship") {
    baseCount += 1;
  } else if ((sports === "playoffs" || sports === "post-season") && Math.random() < 0.4) {
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
  const quietHolidays = ["Easter", "MothersDay", "FathersDay"];
  if (quietHolidays.includes(holiday) && Math.random() < 0.5) {
    baseCount -= 1;
  }

  // Soft cap
  if (baseCount > 5) baseCount = 5;
  if (baseCount < 0) baseCount = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // NAME POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  const firstNames = [
    "Carlos", "Mina", "Andre", "Jordan", "Brianna", "Sofia", "Tariq", "Elena", "Marcus",
    "Kaila", "Tobias", "Lorenzo", "Ariana", "Xavier", "Lila", "Darius", "Ramon", "Ivy",
    "Maya", "Jamal", "Priya", "Diego", "Aaliyah", "Oscar", "Jasmine", "Terrell", "Camila",
    "Wei", "Mei", "Jun", "Yuki", "Kenji", "Anh", "Linh", "Tran", "Esperanza", "Guadalupe"
  ];

  const lastNames = [
    "Lopez", "Carter", "Nguyen", "Patel", "Jackson", "Harris", "Wong", "Thompson",
    "Brown", "Lee", "Lewis", "Jordan", "Reyes", "Scott", "Ward", "Foster", "Cook",
    "Martinez", "Robinson", "Kim", "Davis", "Garcia", "Chen", "Williams", "Santos",
    "Tran", "Chung", "Park", "Liu", "Hernandez", "Ramirez", "Cruz", "Mendoza"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // OCCUPATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const occupations = [
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
  const neighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  // Base neighborhood weights
  const neighborhoodWeights = {
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
  const artsNeighborhoods = ["Uptown", "KONO", "Temescal", "Jack London"];

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function nameExists(first, last) {
    for (let r = 1; r < genericValues.length; r++) {
      if (genericValues[r][iFirst] === first &&
          genericValues[r][iLast] === last) return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR-AWARE NEIGHBORHOOD PICKER (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  function pickWeightedNeighborhood() {
    // Start with base weights
    const weights = { ...neighborhoodWeights };

    // First Friday boosts arts neighborhoods
    if (isFirstFriday) {
      artsNeighborhoods.forEach(n => {
        weights[n] = (weights[n] || 1.0) + 0.4;
      });
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
    if (holiday === "OpeningDay" || sports === "championship") {
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
      artsNeighborhoods.forEach(n => {
        weights[n] = (weights[n] || 1.0) + 0.2;
      });
    }

    // Build weighted array
    const weighted = [];
    for (const n of neighborhoods) {
      const weight = weights[n] || 1.0;
      const count = Math.round(weight * 10);
      for (let i = 0; i < count; i++) {
        weighted.push(n);
      }
    }
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  // Track new citizens for summary
  const newCitizens = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 0; i < baseCount; i++) {

    let first = "", last = "";
    let attempts = 0;

    do {
      first = firstNames[Math.floor(Math.random() * firstNames.length)];
      last = lastNames[Math.floor(Math.random() * lastNames.length)];
      attempts++;
    } while (nameExists(first, last) && attempts < 50);

    if (attempts >= 50) continue;

    // v2.3: BirthYear instead of Age
    // Range 1965-2004 → ages 37-76 in 2041 (same range as v2.2)
    const birthYear = 1965 + Math.floor(Math.random() * 40);

    const neighborhood = pickWeightedNeighborhood();
    const occupation = occupations[Math.floor(Math.random() * occupations.length)];

    const newRow = new Array(header.length).fill("");

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
    let worldContext = "";

    // Seasonal context
    if (season === "Winter") worldContext = "Arrived during winter's quiet cycle.";
    if (season === "Spring") worldContext = "Entered population during spring's renewal.";
    if (season === "Summer") worldContext = "Added to population in a lively summer period.";
    if (season === "Fall") worldContext = "Joined during the fall transition.";

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
      const holidayContextMap = {
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
      if (artsNeighborhoods.includes(neighborhood)) {
        worldContext += " First Friday's creative energy drew them to the arts district.";
      } else {
        worldContext += " First Friday evening welcomed new faces.";
      }
    }

    if (isCreationDay) {
      worldContext += " Creation Day marked their entry into Oakland's story.";
    }

    if (sports === "championship") {
      worldContext += " Championship fever filled the city.";
    } else if (sports === "playoffs" || sports === "post-season") {
      worldContext += " Playoff excitement energized the city.";
    }

    if (dynamics.culturalActivity >= 1.4) {
      worldContext += " High cultural activity enriched their arrival.";
    }

    if (dynamics.communityEngagement >= 1.4) {
      worldContext += " Strong community welcomed the newcomer.";
    }

    if (iLifeHistory >= 0) {
      newRow[iLifeHistory] = `Born into population during Cycle ${cycle}. Settled in ${neighborhood}. ${worldContext}`;
    }

    // Write to Generic_Citizens
    const writeRow = genericSheet.getLastRow() + 1;
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
        sportsSeason: sports
      }
    });

    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
  }

  // Summary
  S.newGenericCitizens = newCitizens;
  S.genericCitizensGenerated = newCitizens.length;
  ctx.summary = S;
}


/**
 * ============================================================================
 * GENERIC CITIZENS GENERATOR REFERENCE v2.3
 * ============================================================================
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
 * BIRTHYEAR RANGE: 1965-2004 (ages 37-76 in SimYear 2041)
 * 
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 * 
 * ============================================================================
 */