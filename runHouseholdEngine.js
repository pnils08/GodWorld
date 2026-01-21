/**
 * ============================================================================
 * Household Engine v2.2
 * ============================================================================
 *
 * Soft, world-aware household context events for Tier-3/4 ENGINE citizens.
 * Does NOT create family members, relationships, or structural ties.
 * ONLY logs harmless household-life flavor notes.
 *
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods
 * - Holiday-specific household notes (30+ holidays)
 * - First Friday household effects
 * - Creation Day reflection
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Integrates:
 * - Season
 * - Weather & Weather Mood
 * - City Dynamics (sentiment, culturalActivity, communityEngagement)
 * - Economic Mood
 * - Chaos
 * - Holidays (30+)
 * - Sports Season
 * - Oakland Neighborhoods (12)
 * 
 * ============================================================================
 */

function runHouseholdEngine_(ctx) {

  const ss = ctx.ss;
  const ledger = ss.getSheetByName('Simulation_Ledger');
  const logSheet = ss.getSheetByName('LifeHistory_Log');
  if (!ledger) return;

  const values = ledger.getDataRange().getValues();
  if (values.length < 2) return;

  const header = values[0];
  const rows = values.slice(1);

  const idx = n => header.indexOf(n);

  const iPopID = idx('POPID');
  const iFirst = idx('First');
  const iLast = idx('Last');
  const iTier = idx('Tier');
  const iClock = idx('ClockMode');
  const iUNI = idx('UNI (y/n)');
  const iMED = idx('MED (y/n)');
  const iCIV = idx('CIV (y/n)');
  const iLife = idx('LifeHistory');
  const iLastUpd = idx('LastUpdated');
  const iNeighborhood = idx('Neighborhood');

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const S = ctx.summary;
  const season = S.season;
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { 
    sentiment: 0, publicSpaces: 1, culturalActivity: 1, communityEngagement: 1 
  };
  const sports = S.sportsSeason;
  const econMood = S.economicMood || 50;
  const cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  let count = 0;
  const LIMIT = 6;

  // Track for summary
  const householdEvents = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE HOUSEHOLD POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const baseHousehold = [
    "shared quiet time at home with household members",
    "handled routine household matters",
    "spent a calm evening in their living space",
    "managed small chores and daily responsibilities",
    "relaxed inside the home during off-hours"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL HOUSEHOLD BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════
  const seasonal = [];
  if (season === "Winter") seasonal.push("spent extra time indoors due to cold weather");
  if (season === "Spring") seasonal.push("organized part of the home during seasonal transition");
  if (season === "Summer") seasonal.push("kept doors/windows open to enjoy evening warmth");
  if (season === "Fall") seasonal.push("prepared home for cooler fall conditions");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  const weatherPool = [];
  if (weather.type === "rain") weatherPool.push("stayed inside and listened to the rain");
  if (weather.type === "fog") weatherPool.push("kept indoor lights on during heavy fog");
  if (weather.type === "hot") weatherPool.push("used fans or open windows to cool the home");
  if (weather.type === "cold") weatherPool.push("adjusted the thermostat for the cold snap");
  if (weather.type === "wind") weatherPool.push("secured items near windows during windy conditions");
  if (weather.type === "snow") weatherPool.push("watched the snow fall from the window");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MOOD EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  const moodPool = [];
  if (weatherMood.primaryMood === 'cozy') moodPool.push("enjoyed a cozy evening at home");
  if (weatherMood.primaryMood === 'introspective') moodPool.push("had a quiet, reflective evening indoors");
  if (weatherMood.primaryMood === 'irritable') moodPool.push("felt some household tension from the weather");
  if (weatherMood.perfectWeather) moodPool.push("opened all the windows to enjoy the perfect weather");
  if (weatherMood.nostalgiaFactor > 0.3) moodPool.push("reminisced about past times with household members");

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS RIPPLE EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  const chaosPool = chaos.length > 0 ? [
    "discussed light city news with household members",
    "felt slight shift in home mood due to recent events"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EFFECTS (v2.2 - 30+ holidays)
  // ═══════════════════════════════════════════════════════════════════════════
  const holidayPool = [];

  // Major holidays
  if (holiday === "NewYear") {
    holidayPool.push("tidied up after New Year's festivities");
    holidayPool.push("discussed new year resolutions at home");
  }
  if (holiday === "NewYearsEve") {
    holidayPool.push("prepared the home for New Year's celebration");
    holidayPool.push("gathered with household for countdown");
  }
  if (holiday === "MLKDay") {
    holidayPool.push("spent the day off at home");
    holidayPool.push("watched MLK Day programming together");
  }
  if (holiday === "Easter") {
    holidayPool.push("prepared Easter gathering at home");
    holidayPool.push("enjoyed holiday brunch with household");
  }
  if (holiday === "MemorialDay" || holiday === "LaborDay") {
    holidayPool.push("enjoyed a relaxed long weekend at home");
    holidayPool.push("fired up the grill in the backyard");
  }
  if (holiday === "Independence") {
    holidayPool.push("adjusted home routines for celebration noise");
    holidayPool.push("watched fireworks from the window");
    holidayPool.push("hosted a small Fourth of July gathering");
  }
  if (holiday === "Halloween") {
    holidayPool.push("decorated the home for Halloween");
    holidayPool.push("prepared candy for trick-or-treaters");
    holidayPool.push("carved pumpkins with household members");
  }
  if (holiday === "Thanksgiving") {
    holidayPool.push("prepared Thanksgiving meal at home");
    holidayPool.push("hosted family for Thanksgiving dinner");
    holidayPool.push("shared gratitude with household members");
  }
  if (holiday === "Holiday") {  // Christmas
    holidayPool.push("prepared the home for seasonal gatherings");
    holidayPool.push("decorated the home for the holidays");
    holidayPool.push("exchanged gifts with household members");
    holidayPool.push("enjoyed holiday meal with family");
  }

  // Cultural holidays
  if (holiday === "CincoDeMayo") {
    holidayPool.push("prepared festive food at home");
    holidayPool.push("celebrated with music and family");
  }
  if (holiday === "DiaDeMuertos") {
    holidayPool.push("set up an ofrenda at home");
    holidayPool.push("honored ancestors with household members");
    holidayPool.push("prepared pan de muerto and shared memories");
  }
  if (holiday === "Juneteenth") {
    holidayPool.push("celebrated Juneteenth with a family cookout");
    holidayPool.push("shared stories of heritage at home");
  }
  if (holiday === "Hanukkah") {
    holidayPool.push("lit the menorah with household members");
    holidayPool.push("prepared latkes at home");
  }

  // Minor holidays
  if (holiday === "Valentine") {
    holidayPool.push("shared a special dinner at home");
    holidayPool.push("exchanged Valentine's greetings with household");
  }
  if (holiday === "StPatricksDay") {
    holidayPool.push("wore green around the house");
    holidayPool.push("prepared corned beef at home");
  }
  if (holiday === "MothersDay") {
    holidayPool.push("prepared breakfast in bed for mom");
    holidayPool.push("celebrated mother's day at home");
  }
  if (holiday === "FathersDay") {
    holidayPool.push("celebrated dad with a home-cooked meal");
    holidayPool.push("spent quality time with father at home");
  }

  // Oakland-specific
  if (holiday === "OpeningDay") {
    holidayPool.push("watched the A's opener on TV at home");
    holidayPool.push("wore green and gold around the house");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY HOUSEHOLD EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const firstFridayPool = isFirstFriday ? [
    "got ready at home before heading to First Friday",
    "invited friends over before the art walk",
    "relaxed at home after First Friday festivities"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY HOUSEHOLD EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const creationDayPool = isCreationDay ? [
    "felt a sense of home and belonging today",
    "reflected on household history and roots",
    "appreciated the home's foundational meaning",
    "shared stories of how the household began"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const culturalPool = [];
  if (dynamics.culturalActivity >= 1.4) {
    culturalPool.push("discussed local cultural events at home");
    culturalPool.push("played music that matched the city's creative mood");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const communityPool = [];
  if (dynamics.communityEngagement >= 1.3) {
    communityPool.push("chatted with neighbors from the porch");
    communityPool.push("felt connected to the block from inside the home");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CITY DYNAMICS
  // ═══════════════════════════════════════════════════════════════════════════
  const dynamicsPool = [];
  if (dynamics.sentiment >= 0.3) dynamicsPool.push("felt positive atmosphere inside the home");
  if (dynamics.sentiment <= -0.3) dynamicsPool.push("felt slight tension among household members");

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC MOOD
  // ═══════════════════════════════════════════════════════════════════════════
  const econPool = [];
  if (econMood <= 35) {
    econPool.push("discussed household budget concerns");
    econPool.push("looked for ways to cut household costs");
  }
  if (econMood >= 65) {
    econPool.push("felt secure about the household's financial situation");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON
  // ═══════════════════════════════════════════════════════════════════════════
  const sportsPool = [];
  if (sports === "mid-season") sportsPool.push("watched part of a game together at home");
  if (sports === "post-season" || sports === "playoffs") sportsPool.push("tuned into postseason coverage as a household");
  if (sports === "late-season") sportsPool.push("debated playoff chances with household members");
  if (sports === "championship") {
    sportsPool.push("gathered to watch the championship at home");
    sportsPool.push("felt the household buzz with championship excitement");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD FLAVOR (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodPool = {
    'Temescal': [
      "heard neighborhood kids playing outside",
      "smelled cooking from a nearby home",
      "noticed the creative neighborhood energy from inside"
    ],
    'Downtown': [
      "heard city sounds drifting up from the street",
      "noticed the urban energy even from inside",
      "watched Downtown activity from the window"
    ],
    'Fruitvale': [
      "heard music from a neighbor's gathering",
      "smelled food from a nearby kitchen",
      "felt the neighborhood's cultural warmth"
    ],
    'Lake Merritt': [
      "watched joggers pass by from the window",
      "heard geese from the lake",
      "enjoyed the lakeside neighborhood tranquility"
    ],
    'West Oakland': [
      "heard trains in the distance",
      "noticed the neighborhood's industrial rhythm",
      "observed development activity from the window"
    ],
    'Laurel': [
      "enjoyed the quiet residential evening",
      "waved to a neighbor through the window",
      "appreciated the peaceful block"
    ],
    'Rockridge': [
      "appreciated the tree-lined street view",
      "heard BART rumble in the distance",
      "noticed the upscale neighborhood calm"
    ],
    'Jack London': [
      "heard waterfront activity from the window",
      "noticed the arts district energy nearby",
      "smelled the estuary air"
    ],
    'Uptown': [
      "heard gallery foot traffic from the window",
      "noticed the urban arts neighborhood vibe",
      "felt the creative energy from inside"
    ],
    'KONO': [
      "noticed the neighborhood's artistic character from home",
      "heard creative activity on the street",
      "appreciated the DIY neighborhood spirit"
    ],
    'Chinatown': [
      "heard the morning market bustle outside",
      "smelled cooking from nearby restaurants",
      "felt the neighborhood's bustling energy"
    ],
    'Piedmont Ave': [
      "enjoyed the leafy street view from inside",
      "noticed the boutique neighborhood's quiet charm",
      "appreciated the residential tranquility"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MERGE INTO FINAL POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const pool = [
    ...baseHousehold,
    ...seasonal,
    ...weatherPool,
    ...moodPool,
    ...chaosPool,
    ...holidayPool,
    ...firstFridayPool,
    ...creationDayPool,
    ...culturalPool,
    ...communityPool,
    ...dynamicsPool,
    ...econPool,
    ...sportsPool
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (let r = 0; r < rows.length; r++) {

    if (count >= LIMIT) break;

    const row = rows[r];

    const tier = Number(row[iTier] || 0);
    const mode = (row[iClock] || "").toString().trim();
    const isUNI = (row[iUNI] || "").toString().toLowerCase() === "y";
    const isMED = (row[iMED] || "").toString().toLowerCase() === "y";
    const isCIV = (row[iCIV] || "").toString().toLowerCase() === "y";
    const neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    // Eligibility: Tier-3/4 background ENGINE citizens only
    if (mode !== "ENGINE") continue;
    if (tier !== 3 && tier !== 4) continue;
    if (isUNI || isMED || isCIV) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // PROBABILITY
    // ═══════════════════════════════════════════════════════════════════════
    let chance = 0.02;

    // Seasonal effects
    if (season === "Winter") chance += 0.01;
    if (season === "Fall") chance += 0.005;

    // Weather impact
    if (weather.impact >= 1.3) chance += 0.01;
    if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.01;

    // City sentiment
    if (dynamics.sentiment <= -0.3) chance += 0.008;
    if (dynamics.sentiment >= 0.3) chance += 0.005;

    // Economic stress increases home focus
    if (econMood <= 35) chance += 0.01;

    // Chaos → home mood ripple
    if (chaos.length > 0) chance += 0.01;

    // Holiday priority boost (v2.2)
    if (holidayPriority === "major") chance += 0.015;
    else if (holidayPriority === "cultural") chance += 0.012;
    else if (holidayPriority === "minor") chance += 0.005;

    // Home-centered holidays boost (v2.2)
    if (holiday === "Thanksgiving" || holiday === "Holiday" || 
        holiday === "Easter" || holiday === "Halloween") {
      chance += 0.02;
    }

    // First Friday boost (v2.2)
    if (isFirstFriday) chance += 0.005;

    // Creation Day boost (v2.2)
    if (isCreationDay) chance += 0.008;

    // Community engagement boost (v2.2)
    if (dynamics.communityEngagement >= 1.3) chance += 0.005;

    // Cap chance
    if (chance > 0.12) chance = 0.12;

    if (Math.random() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD CITIZEN-SPECIFIC POOL
    // ═══════════════════════════════════════════════════════════════════════
    let citizenPool = [...pool];
    
    // Add neighborhood-specific events
    if (neighborhood && neighborhoodPool[neighborhood]) {
      citizenPool.push(...neighborhoodPool[neighborhood]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PICK AND LOG
    // ═══════════════════════════════════════════════════════════════════════
    const pick = citizenPool[Math.floor(Math.random() * citizenPool.length)];
    const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

    // Determine event tag (v2.2)
    let eventTag = "Household";
    if (firstFridayPool.includes(pick)) {
      eventTag = "Household-FirstFriday";
    } else if (creationDayPool.includes(pick)) {
      eventTag = "Household-CreationDay";
    } else if (holidayPool.includes(pick)) {
      eventTag = "Household-Holiday";
    }

    const line = `${stamp} — [${eventTag}] ${pick}`;
    const existing = row[iLife] ? row[iLife].toString() : "";

    row[iLife] = existing ? existing + "\n" + line : line;
    row[iLastUpd] = ctx.now;

    if (logSheet) {
      logSheet.appendRow([
        ctx.now,
        row[iPopID],
        (row[iFirst] + " " + row[iLast]).trim(),
        eventTag,
        pick,
        neighborhood || "Engine",
        cycle
      ]);
    }

    // Track for summary
    householdEvents.push({
      citizen: (row[iFirst] + " " + row[iLast]).trim(),
      neighborhood: neighborhood,
      event: pick,
      tag: eventTag
    });

    rows[r] = row;
    count++;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMIT
  // ═══════════════════════════════════════════════════════════════════════════
  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  S.householdEvents = householdEvents;
  ctx.summary = S;
}


/**
 * ============================================================================
 * HOUSEHOLD EVENT REFERENCE
 * ============================================================================
 * 
 * Event Tags:
 * - Household: Base household events
 * - Household-FirstFriday: Art walk prep/recovery
 * - Household-CreationDay: Foundational reflection
 * - Household-Holiday: Holiday-specific home events
 * 
 * Holiday Household Focus:
 * - Thanksgiving: Meal prep, hosting family, gratitude
 * - Holiday (Christmas): Decorating, gifts, gatherings
 * - Halloween: Decorating, candy, pumpkins
 * - DiaDeMuertos: Ofrenda, honoring ancestors
 * - Easter: Gatherings, brunch
 * - Independence: Fireworks watching, BBQ
 * - etc.
 * 
 * Neighborhood Flavor (12 total):
 * - Temescal: Kids playing, cooking smells
 * - Chinatown: Market bustle, restaurant smells
 * - Lake Merritt: Joggers, geese
 * - etc.
 * 
 * STRICT RULES PRESERVED:
 * - Does NOT create family members
 * - Does NOT create relationships or structural ties
 * - ONLY logs harmless household-life flavor notes
 * 
 * ============================================================================
 */