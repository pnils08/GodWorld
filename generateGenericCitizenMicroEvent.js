/**
 * ============================================================================
 * generateGenericCitizenMicroEvents_ v2.2
 * ============================================================================
 *
 * Tier-3/4 background micro-events with GodWorld Calendar integration.
 *
 * v2.2 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - Full GodWorld Calendar integration (30+ holidays)
 * - First Friday cultural event pools
 * - Creation Day community event pools
 * - Holiday-specific event pools
 * - Sports season awareness
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Calendar (season, holiday)
 * - Weather + Weather Mood
 * - Chaos engine
 * - City Dynamics (traffic, sentiment)
 * - Economic Mood
 *
 * Still DOES NOT TOUCH:
 * - Named citizens
 * - UNI / MED / CIV
 * - Jobs
 * - Health
 * - Relationships
 * - Locations
 *
 * Only adds harmless LifeHistory flavor notes.
 * 
 * ============================================================================
 */

function generateGenericCitizenMicroEvents_(ctx) {

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

  const S = ctx.summary;
  const cycle = S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const season = S.season;
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  const econMood = S.economicMood || 50;

  // Calendar context (v2.2)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  let eventCount = 0;
  const EVENT_LIMIT = 12;

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const base = [
    "enjoyed a calm, uneventful day",
    "spent time at a corner store; routine stop",
    "stepped outside briefly; peaceful moment",
    "noticed minor shifts in everyday neighborhood flow",
    "watched part of a daily sports highlight",
    "took a casual walk through their area"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL FLAVOR
  // ═══════════════════════════════════════════════════════════════════════════
  const seasonal = [];
  if (season === "Winter") seasonal.push("moved quietly through a cold evening");
  if (season === "Spring") seasonal.push("noticed seasonal change in the air");
  if (season === "Summer") seasonal.push("took in warm evening weather");
  if (season === "Fall") seasonal.push("adjusted to early autumn atmosphere");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  const weatherPool = [];
  if (weather.type === "rain") weatherPool.push("adjusted plans due to light rain");
  if (weather.type === "fog") weatherPool.push("moved more carefully due to fog");
  if (weather.type === "hot") weatherPool.push("took shelter from warm conditions");
  if (weather.type === "cold") weatherPool.push("bundled up against the cold");
  if (weather.type === "wind") weatherPool.push("noted windy conditions during outing");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MOOD INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  const moodPool = [];
  if (weatherMood.primaryMood === 'cozy') moodPool.push("enjoyed a cozy indoor moment");
  if (weatherMood.primaryMood === 'irritable') moodPool.push("felt a bit restless from the weather");
  if (weatherMood.perfectWeather) moodPool.push("enjoyed the perfect weather outside");
  if (weatherMood.nostalgiaFactor > 0.3) moodPool.push("felt a moment of nostalgia");

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS BACKGROUND
  // ═══════════════════════════════════════════════════════════════════════════
  const chaosPool = chaos.length > 0 ? [
    "overheard brief talk about recent city events",
    "felt a slight shift in background mood"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  const sentimentPool = [];
  if (dynamics.sentiment >= 0.3) sentimentPool.push("picked up on a slightly positive city mood");
  if (dynamics.sentiment <= -0.3) sentimentPool.push("noticed a subtle tension in the environment");

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  const econPool = [];
  if (econMood <= 35) econPool.push("overheard concerns about the economy");
  if (econMood >= 65) econPool.push("sensed optimism in local conversations");

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD POOLS (12 - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodPool = {
    'Temescal': [
      "stopped by a Temescal cafe",
      "noticed the creative energy around Temescal",
      "browsed the Temescal Alley shops"
    ],
    'Downtown': [
      "navigated Downtown's busy streets",
      "felt the urban rhythm of the city center",
      "passed through the civic center area"
    ],
    'Fruitvale': [
      "enjoyed Fruitvale's community atmosphere",
      "stopped by a familiar Fruitvale spot",
      "appreciated the neighborhood's cultural vibrancy"
    ],
    'Lake Merritt': [
      "took a moment by the lake",
      "watched joggers around Lake Merritt",
      "enjoyed the lakeside greenery"
    ],
    'West Oakland': [
      "noticed West Oakland's industrial character",
      "felt the neighborhood's evolving energy",
      "passed by Victorian homes on the block"
    ],
    'Laurel': [
      "appreciated Laurel's quiet streets",
      "enjoyed the residential calm",
      "stopped by a Laurel District shop"
    ],
    'Rockridge': [
      "browsed Rockridge's shops briefly",
      "walked under the tree canopy",
      "grabbed something from College Avenue"
    ],
    'Jack London': [
      "felt Jack London's waterfront energy",
      "noticed activity near the estuary",
      "enjoyed the district's evening atmosphere"
    ],
    // v2.2: New neighborhoods
    'Uptown': [
      "walked through Uptown's gallery district",
      "noticed the creative scene near the Fox",
      "felt the neighborhood's artistic energy"
    ],
    'KONO': [
      "explored KONO's creative corridor",
      "noticed murals along the streets",
      "felt the neighborhood's DIY spirit"
    ],
    'Chinatown': [
      "stopped by Chinatown for familiar flavors",
      "appreciated the bustling market energy",
      "noticed the blend of old and new storefronts"
    ],
    'Piedmont Ave': [
      "strolled along Piedmont Avenue",
      "enjoyed the boutique charm",
      "appreciated the leafy residential streets"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EVENT POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holidayPools = {
    "Thanksgiving": [
      "noticed Thanksgiving preparations around town",
      "smelled holiday cooking in the air",
      "saw families gathering"
    ],
    "Holiday": [
      "noticed holiday decorations everywhere",
      "felt the festive atmosphere",
      "heard holiday music from nearby shops"
    ],
    "NewYear": [
      "felt the fresh-start energy of the new year",
      "noticed people making resolutions",
      "enjoyed the optimistic atmosphere"
    ],
    "NewYearsEve": [
      "noticed party preparations underway",
      "felt anticipation for the countdown",
      "saw people dressed for celebration"
    ],
    "Independence": [
      "noticed red, white, and blue decorations",
      "heard distant fireworks being set up",
      "felt the patriotic atmosphere"
    ],
    "Valentine": [
      "noticed Valentine's displays in windows",
      "saw couples enjoying the day",
      "felt the romantic atmosphere"
    ],
    "Halloween": [
      "noticed spooky decorations appearing",
      "saw early costumes being worn",
      "felt the playful October spirit"
    ],
    "Easter": [
      "noticed spring decorations around",
      "saw families in their Sunday best",
      "felt the seasonal renewal"
    ],
    "MLKDay": [
      "reflected on Dr. King's legacy",
      "noticed observance events being organized",
      "felt the weight of history"
    ],
    "Juneteenth": [
      "felt the celebration of freedom",
      "noticed community events being set up",
      "appreciated the cultural significance"
    ],
    "CincoDeMayo": [
      "heard festive music from Fruitvale",
      "noticed colorful decorations",
      "felt the celebratory energy"
    ],
    "DiaDeMuertos": [
      "noticed beautiful altars being arranged",
      "saw marigolds decorating storefronts",
      "felt the reverent atmosphere"
    ],
    "LunarNewYear": [
      "noticed red lanterns in Chinatown",
      "heard firecrackers in the distance",
      "felt the celebratory energy"
    ],
    "OpeningDay": [
      "noticed green and gold everywhere",
      "felt baseball excitement in the air",
      "heard fans heading to the game"
    ],
    "OaklandPride": [
      "noticed rainbow flags around town",
      "felt the inclusive celebration",
      "saw the community coming together"
    ],
    "MemorialDay": [
      "noticed flags at half-staff",
      "felt the reflective atmosphere",
      "enjoyed the long weekend energy"
    ],
    "LaborDay": [
      "enjoyed the end-of-summer holiday",
      "noticed barbecue smoke in the air",
      "appreciated the day of rest"
    ],
    "VeteransDay": [
      "noticed observance ceremonies",
      "felt respect for those who served",
      "saw veterans being honored"
    ],
    "MothersDay": [
      "saw families treating their mothers",
      "noticed brunch crowds everywhere",
      "felt the family-oriented atmosphere"
    ],
    "FathersDay": [
      "saw families out with their dads",
      "noticed barbecue gatherings",
      "felt the family-focused energy"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY POOL (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const firstFridayPool = [
    "checked out a First Friday gallery",
    "enjoyed the art walk atmosphere",
    "wandered through open studios",
    "discovered a new local artist",
    "soaked in the creative energy",
    "grabbed food from a First Friday vendor"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY POOL (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const creationDayPool = [
    "felt a quiet sense of belonging",
    "reflected on roots in the community",
    "appreciated Oakland's spirit",
    "felt connected to the city's story"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const sportsSeasonPools = {
    "championship": [
      "felt championship fever everywhere",
      "saw fans celebrating in the streets",
      "heard cheers from nearby bars"
    ],
    "playoffs": [
      "followed playoff updates on their phone",
      "felt the city's sports tension",
      "overheard excited sports talk"
    ],
    "post-season": [
      "caught playoff highlights at a cafe",
      "felt the city rooting for the team",
      "noticed playoff energy in the air"
    ],
    "late-season": [
      "followed the pennant race closely",
      "felt the late-season intensity",
      "overheard talk about standings"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY POOL (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const culturalActivityPool = dynamics.culturalActivity >= 1.4 ? [
    "noticed vibrant cultural activity around town",
    "felt the city's creative pulse",
    "appreciated the artistic atmosphere"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT POOL (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const communityPool = dynamics.communityEngagement >= 1.3 ? [
    "felt welcomed by neighborhood energy",
    "noticed community members connecting",
    "appreciated the local camaraderie"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL BASE EVENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  let basePool = [
    ...base,
    ...seasonal,
    ...weatherPool,
    ...moodPool,
    ...chaosPool,
    ...sentimentPool,
    ...econPool,
    ...culturalActivityPool,
    ...communityPool
  ];

  // Add holiday pool if applicable
  if (holiday !== "none" && holidayPools[holiday]) {
    basePool = [...basePool, ...holidayPools[holiday]];
  }

  // Add First Friday pool
  if (isFirstFriday) {
    basePool = [...basePool, ...firstFridayPool];
  }

  // Add Creation Day pool
  if (isCreationDay) {
    basePool = [...basePool, ...creationDayPool];
  }

  // Add sports season pool
  if (sportsSeason !== "off-season" && sportsSeasonPools[sportsSeason]) {
    basePool = [...basePool, ...sportsSeasonPools[sportsSeason]];
  }

  // Arts neighborhoods for First Friday tagging
  const artsNeighborhoods = ["Uptown", "KONO", "Temescal", "Jack London"];

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  for (let r = 0; r < rows.length; r++) {

    if (eventCount >= EVENT_LIMIT) break;

    const row = rows[r];

    const tier = Number(row[iTier] || 0);
    const mode = row[iClock] || "ENGINE";
    const isUNI = (row[iUNI] || "").toString().toLowerCase() === "y";
    const isMED = (row[iMED] || "").toString().toLowerCase() === "y";
    const isCIV = (row[iCIV] || "").toString().toLowerCase() === "y";
    const neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    // Limit: Tier-3/4 background citizens ONLY
    if (mode !== "ENGINE") continue;
    if (isUNI || isMED || isCIV) continue;
    if (tier !== 3 && tier !== 4) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BASE CHANCE
    // ═══════════════════════════════════════════════════════════════════════
    let chance = 0.03;

    // Weather amplifies micro-events
    if (weather.impact >= 1.3) chance += 0.01;
    if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.01;

    // City tension or uplift
    if (dynamics.sentiment <= -0.3) chance += 0.01;
    if (dynamics.sentiment >= 0.3) chance += 0.005;

    // Economic awareness
    if (econMood <= 35 || econMood >= 65) chance += 0.005;

    // Chaos adds ambiance
    if (chaos.length > 0) chance += 0.015;

    // ═══════════════════════════════════════════════════════════════════════
    // CALENDAR CHANCE MODIFIERS (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    
    // Holidays increase activity
    if (holidayPriority === "major") chance += 0.015;
    else if (holidayPriority === "oakland") chance += 0.015;
    else if (holidayPriority === "cultural") chance += 0.012;
    else if (holidayPriority === "minor") chance += 0.008;

    // First Friday boost
    if (isFirstFriday) {
      chance += 0.012;
      // Extra boost for arts neighborhoods
      if (artsNeighborhoods.includes(neighborhood)) {
        chance += 0.01;
      }
    }

    // Creation Day boost
    if (isCreationDay) chance += 0.008;

    // Sports season boost
    if (sportsSeason === "championship") chance += 0.012;
    else if (sportsSeason === "playoffs" || sportsSeason === "post-season") chance += 0.008;

    // Cultural activity boost
    if (dynamics.culturalActivity >= 1.4) chance += 0.008;

    // Community engagement boost
    if (dynamics.communityEngagement >= 1.3) chance += 0.005;

    // Cap chance for realism (v2.2: raised from 0.10 to 0.12)
    if (chance > 0.12) chance = 0.12;

    if (Math.random() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD CITIZEN-SPECIFIC POOL
    // ═══════════════════════════════════════════════════════════════════════
    let pool = [...basePool];
    
    // Add neighborhood events
    if (neighborhood && neighborhoodPool[neighborhood]) {
      pool = [...pool, ...neighborhoodPool[neighborhood]];
    }

    // Pick event
    const pick = pool[Math.floor(Math.random() * pool.length)];

    // ═══════════════════════════════════════════════════════════════════════
    // DETERMINE TAG (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    let tag = "Background";

    if (neighborhood && neighborhoodPool[neighborhood]?.includes(pick)) {
      tag = "Neighborhood";
    } else if (firstFridayPool.includes(pick)) {
      tag = "FirstFriday";
    } else if (creationDayPool.includes(pick)) {
      tag = "CreationDay";
    } else if (holiday !== "none" && holidayPools[holiday]?.includes(pick)) {
      tag = "Holiday";
    } else if (sportsSeason !== "off-season" && sportsSeasonPools[sportsSeason]?.includes(pick)) {
      tag = "Sports";
    } else if (culturalActivityPool.includes(pick)) {
      tag = "Cultural";
    } else if (communityPool.includes(pick)) {
      tag = "Community";
    }

    const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    const line = `${stamp} — [${tag}] ${pick}`;

    // Append to LifeHistory
    const existing = row[iLife] ? row[iLife].toString() : "";
    row[iLife] = existing ? existing + "\n" + line : line;

    row[iLastUpd] = ctx.now;

    // Log entry
    if (logSheet) {
      logSheet.appendRow([
        ctx.now,
        row[iPopID],
        (row[iFirst] + " " + row[iLast]).trim(),
        "Micro-Event",
        pick,
        neighborhood || "Engine",
        cycle
      ]);
    }

    rows[r] = row;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    eventCount++;
  }

  // Write updates back
  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  
  // Summary
  S.microEvents = eventCount;
  ctx.summary = S;
}


/**
 * ============================================================================
 * GENERIC CITIZEN MICRO-EVENTS REFERENCE
 * ============================================================================
 * 
 * Target: Tier-3/4 ENGINE citizens (NOT UNI/MED/CIV)
 * Limit: 12 events per cycle
 * 
 * BASE CHANCE: 0.03 (3%)
 * 
 * CHANCE MODIFIERS:
 * - Weather impact ≥1.3: +0.01
 * - Low comfort index: +0.01
 * - Negative sentiment: +0.01
 * - Positive sentiment: +0.005
 * - Economic extremes: +0.005
 * - Chaos events: +0.015
 * 
 * CALENDAR MODIFIERS (v2.2):
 * 
 * | Factor | Effect |
 * |--------|--------|
 * | Major holiday | +0.015 |
 * | Oakland holiday | +0.015 |
 * | Cultural holiday | +0.012 |
 * | Minor holiday | +0.008 |
 * | First Friday | +0.012 |
 * | FF arts neighborhood | +0.01 additional |
 * | Creation Day | +0.008 |
 * | Championship | +0.012 |
 * | Playoffs | +0.008 |
 * | High cultural activity | +0.008 |
 * | High community engagement | +0.005 |
 * 
 * CHANCE CAP: 0.12 (raised from 0.10)
 * 
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave (v2.2)
 * 
 * ARTS NEIGHBORHOODS (First Friday bonus):
 * - Uptown, KONO, Temescal, Jack London
 * 
 * EVENT TAGS:
 * - Background (default)
 * - Neighborhood
 * - Holiday, FirstFriday, CreationDay, Sports (v2.2)
 * - Cultural, Community (v2.2)
 * 
 * HOLIDAY POOLS: 20 holidays with 3 events each
 * 
 * ============================================================================
 */