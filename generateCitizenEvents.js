/**
 * ============================================================================
 * Citizens Events Engine v2.4
 * ============================================================================
 * 
 * v2.4 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - Full GodWorld Calendar integration (30+ holidays)
 * - First Friday cultural event pools
 * - Creation Day community event pools
 * - Sports season awareness
 * - Holiday-specific event pools
 * - Calendar-aware chance modifiers
 * - Aligned with GodWorld Calendar v1.0
 * 
 * Previous features (v2.3):
 * - Media/Weather/Economic integration
 * - Bond system integration
 * - Arc involvement awareness
 * - Calendar/weather/chaos awareness
 * 
 * ============================================================================
 */

function generateCitizensEvents_(ctx) {

  const sheet = ctx.ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return;

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  const header = values[0];
  const rows = values.slice(1);

  const idx = n => header.indexOf(n);

  const iTier = idx('Tier');
  const iClock = idx('ClockMode');
  const iLife = idx('LifeHistory');
  const iLastU = idx('LastUpdated');
  const iPopID = idx('POPID');
  const iFirst = idx('First');
  const iLast = idx('Last');
  const iNeighborhood = idx('Neighborhood');

  const lifeLog = ctx.ss.getSheetByName('LifeHistory_Log');
  const S = ctx.summary;
  const cycle = S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const season = S.season;
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  const econMood = S.economicMood || 50;

  // Calendar context (v2.4)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  let count = 0;
  const LIMIT = 10;

  // Initialize active citizens tracker
  S.cycleActiveCitizens = S.cycleActiveCitizens || [];

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD CITIZEN LOOKUP
  // ═══════════════════════════════════════════════════════════════════════════
  if (!ctx.citizenLookup) {
    ctx.citizenLookup = {};
    const iUNI = idx('UNI (y/n)');
    const iMED = idx('MED (y/n)');
    const iCIV = idx('CIV (y/n)');
    const iTierRole = idx('TierRole');
    const iType = idx('Type');
    
    for (const row of rows) {
      const popId = row[iPopID];
      if (popId) {
        ctx.citizenLookup[popId] = {
          UNI: row[iUNI] || 'n',
          MED: row[iMED] || 'n',
          CIV: row[iCIV] || 'n',
          TierRole: row[iTierRole] || '',
          Type: row[iType] || '',
          Tier: Number(row[iTier]) || 0,
          Neighborhood: iNeighborhood >= 0 ? (row[iNeighborhood] || '') : ''
        };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE DAILY POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const baseDaily = [
    "had a quiet moment at home",
    "completed a small personal task",
    "spent time unwinding in the evening",
    "checked in with a relative",
    "handled routine daily responsibilities",
    "took a moment of rest"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const seasonal = [];
  if (season === "Winter") seasonal.push("coped with the colder winter evening");
  if (season === "Spring") seasonal.push("felt energy from seasonal change");
  if (season === "Summer") seasonal.push("enjoyed warmth during the evening");
  if (season === "Fall") seasonal.push("prepared for shorter fall days");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const weatherPool = [];
  if (weather.type === "rain") weatherPool.push("adjusted plans due to rain");
  if (weather.type === "fog") weatherPool.push("moved cautiously due to fog");
  if (weather.type === "hot") weatherPool.push("sought relief from heat");
  if (weather.type === "cold") weatherPool.push("bundled up against the cold");
  if (weather.type === "wind") weatherPool.push("noted windy evening conditions");

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS REACTION POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const chaosPool = chaos.length > 0 ? [
    "reflected briefly on today's city happenings",
    "felt subtle shift in mood due to recent events"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const sentimentPool = [];
  if (dynamics.sentiment >= 0.3) sentimentPool.push("felt uplifted by city mood");
  if (dynamics.sentiment <= -0.3) sentimentPool.push("felt unsettled by city tension");

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const econPool = [];
  if (econMood <= 35) econPool.push("felt economic uncertainty weighing on the day");
  if (econMood >= 65) econPool.push("sensed optimism about local opportunities");

  // ═══════════════════════════════════════════════════════════════════════════
  // RELATIONSHIP POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  const alliancePool = [
    "coordinated briefly with an ally on shared interests",
    "received a supportive message from a trusted connection",
    "felt reassured by a recent alliance",
    "collaborated quietly with a close associate",
    "exchanged insights with a professional ally"
  ];

  const rivalryPool = [
    "felt a flicker of tension thinking about a competitor",
    "noticed subtle friction in professional circles",
    "sensed unspoken rivalry in a routine interaction",
    "felt the weight of ongoing competition",
    "overheard something that stirred old tensions"
  ];

  const arcPool = [
    "felt the mounting pressure of unfolding events",
    "sensed their role in a larger story taking shape",
    "noticed how recent events seemed interconnected",
    "felt pulled deeper into an evolving situation"
  ];

  const mentorshipPool = [
    "reflected on guidance received from a mentor",
    "considered advice to share with someone newer",
    "felt the responsibility of being looked up to",
    "appreciated a learning moment from an experienced contact"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD POOLS (12 neighborhoods - v2.4)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodPools = {
    'Temescal': [
      "grabbed coffee at a Temescal cafe",
      "noticed the neighborhood's creative energy",
      "browsed the Temescal Alley shops"
    ],
    'Downtown': [
      "navigated Downtown's busy streets",
      "felt the pulse of the city center",
      "passed by City Hall on routine business"
    ],
    'Fruitvale': [
      "enjoyed the Fruitvale community vibe",
      "stopped by a familiar Fruitvale spot",
      "appreciated the neighborhood's cultural richness"
    ],
    'Lake Merritt': [
      "took a moment by the lake",
      "enjoyed Lake Merritt's evening calm",
      "watched joggers circle the lake"
    ],
    'West Oakland': [
      "noticed West Oakland's changing landscape",
      "felt the neighborhood's industrial rhythm",
      "passed by historic Victorian homes"
    ],
    'Laurel': [
      "appreciated Laurel's quiet streets",
      "enjoyed the residential calm",
      "stopped by Laurel's small shops"
    ],
    'Rockridge': [
      "browsed Rockridge's shops briefly",
      "walked under Rockridge's tree canopy",
      "grabbed something from College Avenue"
    ],
    'Jack London': [
      "felt Jack London's waterfront energy",
      "noticed activity near the estuary",
      "enjoyed the district's evening atmosphere"
    ],
    // v2.4: New neighborhoods
    'Uptown': [
      "walked through Uptown's gallery district",
      "noticed the neighborhood's artistic energy",
      "passed by the Fox Theater"
    ],
    'KONO': [
      "explored KONO's creative spaces",
      "noticed murals along the corridor",
      "felt the neighborhood's DIY spirit"
    ],
    'Chinatown': [
      "stopped by Chinatown for familiar flavors",
      "appreciated the neighborhood's bustling energy",
      "noticed the blend of old and new storefronts"
    ],
    'Piedmont Ave': [
      "strolled along Piedmont Avenue",
      "enjoyed the neighborhood's boutique charm",
      "appreciated the leafy residential streets"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EVENT POOLS (v2.4)
  // ═══════════════════════════════════════════════════════════════════════════
  const holidayPools = {
    // Major holidays
    "Thanksgiving": [
      "prepared for Thanksgiving gathering",
      "reflected on things to be grateful for",
      "helped with holiday meal preparations"
    ],
    "Holiday": [
      "felt the holiday spirit in the air",
      "wrapped up last-minute holiday tasks",
      "enjoyed seasonal decorations around town"
    ],
    "NewYear": [
      "reflected on the year past",
      "thought about resolutions ahead",
      "felt the fresh-start energy of January"
    ],
    "NewYearsEve": [
      "made plans for the evening countdown",
      "felt anticipation for the new year",
      "prepared for celebration"
    ],
    "Independence": [
      "noticed patriotic decorations around town",
      "made plans for fireworks viewing",
      "enjoyed the holiday atmosphere"
    ],
    
    // Cultural holidays
    "MLKDay": [
      "reflected on Dr. King's legacy",
      "thought about community and justice",
      "felt the weight of history"
    ],
    "Juneteenth": [
      "celebrated freedom and heritage",
      "connected with community history",
      "felt pride in cultural roots"
    ],
    "CincoDeMayo": [
      "enjoyed festive atmosphere in town",
      "celebrated cultural heritage",
      "noticed colorful decorations"
    ],
    "DiaDeMuertos": [
      "honored ancestors in quiet reflection",
      "noticed beautiful altars around town",
      "felt connection to those passed"
    ],
    "LunarNewYear": [
      "enjoyed lunar new year festivities",
      "noticed red decorations around Chinatown",
      "felt the celebratory energy"
    ],
    
    // Oakland-specific
    "OpeningDay": [
      "felt excitement for A's baseball",
      "wore green and gold proudly",
      "made plans to follow the game"
    ],
    "OaklandPride": [
      "celebrated Oakland's LGBTQ+ community",
      "noticed rainbow flags around town",
      "felt the city's inclusive spirit"
    ],
    
    // Minor holidays
    "Valentine": [
      "noticed Valentine's displays around town",
      "thought about loved ones",
      "felt the romantic atmosphere"
    ],
    "Halloween": [
      "noticed spooky decorations around town",
      "saw costumes appearing early",
      "felt the playful autumn spirit"
    ],
    "Easter": [
      "noticed spring celebrations around town",
      "enjoyed the seasonal atmosphere",
      "saw families gathering"
    ],
    "StPatricksDay": [
      "noticed green everywhere",
      "felt the festive Irish spirit",
      "saw celebrations starting early"
    ],
    "MothersDay": [
      "thought about family connections",
      "noticed families gathering",
      "felt grateful for maternal figures"
    ],
    "FathersDay": [
      "thought about family bonds",
      "noticed families celebrating",
      "felt grateful for paternal figures"
    ],
    "MemorialDay": [
      "reflected on those who served",
      "enjoyed the long weekend atmosphere",
      "noticed flags around town"
    ],
    "LaborDay": [
      "appreciated workers and labor",
      "enjoyed the last summer holiday",
      "felt the end-of-summer mood"
    ],
    "VeteransDay": [
      "honored veterans in thought",
      "noticed memorial observances",
      "reflected on service and sacrifice"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY POOL (v2.4)
  // ═══════════════════════════════════════════════════════════════════════════
  const firstFridayPool = [
    "checked out First Friday galleries",
    "enjoyed the art walk atmosphere",
    "felt the creative energy of First Friday",
    "wandered through Uptown's open studios",
    "discovered new local artists",
    "soaked in the community arts scene"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY POOL (v2.4)
  // ═══════════════════════════════════════════════════════════════════════════
  const creationDayPool = [
    "felt a sense of belonging in Oakland",
    "reflected on roots in the community",
    "appreciated the city's foundational spirit",
    "felt connected to Oakland's story"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON POOL (v2.4)
  // ═══════════════════════════════════════════════════════════════════════════
  const sportsSeasonPools = {
    "championship": [
      "felt championship fever in the air",
      "followed the team's championship run",
      "sensed the city's sports excitement"
    ],
    "playoffs": [
      "followed playoff updates closely",
      "felt the playoff tension",
      "hoped for the team's success"
    ],
    "post-season": [
      "followed playoff updates closely",
      "felt the playoff tension",
      "hoped for the team's success"
    ],
    "late-season": [
      "watched the pennant race unfold",
      "felt the late-season intensity",
      "followed standings closely"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL BASE EVENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const basePool = [
    ...baseDaily,
    ...seasonal,
    ...weatherPool,
    ...chaosPool,
    ...sentimentPool,
    ...econPool
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN CITIZEN LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  for (let r = 0; r < rows.length; r++) {

    if (count >= LIMIT) break;

    const row = rows[r];

    const tier = Number(row[iTier] || 0);
    const mode = row[iClock] || "ENGINE";
    const popId = row[iPopID];
    const neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    // Only Tier-3 and Tier-4 ENGINE citizens
    if (tier !== 3 && tier !== 4) continue;
    if (mode !== "ENGINE") continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BASE DRIFT PROBABILITY
    // ═══════════════════════════════════════════════════════════════════════
    let chance = 0.02;

    if (weather.impact >= 1.3) chance += 0.01;
    if (dynamics.sentiment <= -0.3) chance += 0.01;
    if (chaos.length > 0) chance += 0.015;
    if (season === "Winter") chance += 0.005;
    if (season === "Summer") chance += 0.005;
    if (econMood <= 35 || econMood >= 65) chance += 0.005;

    // ═══════════════════════════════════════════════════════════════════════
    // CALENDAR CHANCE MODIFIERS (v2.4)
    // ═══════════════════════════════════════════════════════════════════════
    
    // Holiday boosts
    if (holidayPriority === "major") chance += 0.02;
    else if (holidayPriority === "oakland") chance += 0.02;
    else if (holidayPriority === "cultural") chance += 0.015;
    else if (holidayPriority === "minor") chance += 0.008;

    // First Friday boost
    if (isFirstFriday) {
      chance += 0.015;
      // Extra boost for arts neighborhoods
      if (neighborhood === "Uptown" || neighborhood === "KONO" || 
          neighborhood === "Temescal" || neighborhood === "Jack London") {
        chance += 0.01;
      }
    }

    // Creation Day boost
    if (isCreationDay) chance += 0.01;

    // Sports season boost
    if (sportsSeason === "championship") chance += 0.015;
    else if (sportsSeason === "playoffs" || sportsSeason === "post-season") chance += 0.01;

    // Cultural activity boost
    if (dynamics.culturalActivity >= 1.4) chance += 0.008;

    // Community engagement boost
    if (dynamics.communityEngagement >= 1.3) chance += 0.005;

    // ═══════════════════════════════════════════════════════════════════════
    // ALLIANCE/ARC BOOST
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getCombinedEventBoost_ === 'function') {
      const eventBoost = getCombinedEventBoost_(ctx, popId);
      chance *= eventBoost;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BOND CHECKS
    // ═══════════════════════════════════════════════════════════════════════
    let citizenBonds = [];
    let hasRivalry = false;
    let hasAlliance = false;
    let hasMentorship = false;

    if (typeof getCitizenBonds_ === 'function') {
      citizenBonds = getCitizenBonds_(ctx, popId);
      hasRivalry = citizenBonds.some(b => b.bondType === 'rivalry');
      hasAlliance = citizenBonds.some(b => b.bondType === 'alliance');
      hasMentorship = citizenBonds.some(b => b.bondType === 'mentorship');
    }
    
    if (hasRivalry) chance += 0.02;

    // ═══════════════════════════════════════════════════════════════════════
    // ARC INVOLVEMENT BOOST
    // ═══════════════════════════════════════════════════════════════════════
    let activeArc = null;
    if (typeof citizenInActiveArc_ === 'function') {
      activeArc = citizenInActiveArc_(ctx, popId);
      if (activeArc) {
        const arcPhaseBoost = {
          'early': 0.01,
          'rising': 0.015,
          'mid': 0.02,
          'peak': 0.04,
          'decline': 0.015,
          'falling': 0.01
        };
        chance += arcPhaseBoost[activeArc.phase] || 0.01;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WEATHER MOOD MODIFIER
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getWeatherEventModifier_ === 'function') {
      const weatherMod = getWeatherEventModifier_(ctx, 'social');
      chance *= weatherMod;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MEDIA MODIFIER
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getMediaEventModifier_ === 'function') {
      const mediaMod = getMediaEventModifier_(ctx, 'social');
      chance *= mediaMod;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HEAT WAVE BOOST
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof hasWeatherCondition_ === 'function' && hasWeatherCondition_(ctx, 'heat_wave')) {
      chance += 0.01;
    }

    // Cap chance (v2.4: raised from 0.15 to 0.18 for calendar events)
    if (chance > 0.18) chance = 0.18;

    if (Math.random() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD CONTEXTUAL EVENT POOL
    // ═══════════════════════════════════════════════════════════════════════
    let pool = [...basePool];
    let eventTag = "Daily";

    // Add neighborhood events
    if (neighborhood && neighborhoodPools[neighborhood]) {
      pool = [...pool, ...neighborhoodPools[neighborhood]];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD HOLIDAY EVENTS (v2.4)
    // ═══════════════════════════════════════════════════════════════════════
    if (holiday !== "none" && holidayPools[holiday]) {
      pool = [...pool, ...holidayPools[holiday]];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD FIRST FRIDAY EVENTS (v2.4)
    // ═══════════════════════════════════════════════════════════════════════
    if (isFirstFriday) {
      pool = [...pool, ...firstFridayPool];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD CREATION DAY EVENTS (v2.4)
    // ═══════════════════════════════════════════════════════════════════════
    if (isCreationDay) {
      pool = [...pool, ...creationDayPool];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD SPORTS SEASON EVENTS (v2.4)
    // ═══════════════════════════════════════════════════════════════════════
    if (sportsSeason !== "off-season" && sportsSeasonPools[sportsSeason]) {
      pool = [...pool, ...sportsSeasonPools[sportsSeason]];
    }

    // Add relationship-aware events to pool based on bonds
    if (hasAlliance && Math.random() < 0.4) {
      pool = [...pool, ...alliancePool];
    }
    if (hasRivalry && Math.random() < 0.4) {
      pool = [...pool, ...rivalryPool];
    }
    if (hasMentorship && Math.random() < 0.3) {
      pool = [...pool, ...mentorshipPool];
    }
    if (activeArc && Math.random() < 0.5) {
      pool = [...pool, ...arcPool];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD WEATHER EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getWeatherEvent_ === 'function' && Math.random() < 0.25) {
      const weatherEvent = getWeatherEvent_(ctx, true);
      if (weatherEvent) {
        pool.push(weatherEvent.text);
      }
    }

    // ADD WEATHER SPECIAL EVENTS DURING HEAT WAVE
    if (typeof hasWeatherCondition_ === 'function' && hasWeatherCondition_(ctx, 'heat_wave')) {
      if (S.weatherEventPools?.special) {
        pool = [...pool, ...S.weatherEventPools.special];
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD MEDIA-INFLUENCED EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getMediaInfluencedEvent_ === 'function' && Math.random() < 0.2) {
      const mediaEvent = getMediaInfluencedEvent_(ctx);
      if (mediaEvent) {
        pool.push(mediaEvent.text);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PICK EVENT
    // ═══════════════════════════════════════════════════════════════════════
    let pick = pool[Math.floor(Math.random() * pool.length)];

    // ═══════════════════════════════════════════════════════════════════════
    // DETERMINE TAG
    // ═══════════════════════════════════════════════════════════════════════
    if (rivalryPool.includes(pick)) {
      eventTag = "Rivalry";
      if (hasRivalry && Math.random() < 0.3) {
        pick += " [rivalry active]";
      }
    } else if (alliancePool.includes(pick)) {
      eventTag = "Alliance";
    } else if (mentorshipPool.includes(pick)) {
      eventTag = "Mentorship";
    } else if (arcPool.includes(pick)) {
      eventTag = "Arc";
      if (activeArc) {
        pick += ` [${activeArc.type} arc]`;
      }
    } else if (neighborhood && neighborhoodPools[neighborhood]?.includes(pick)) {
      eventTag = "Neighborhood";
    } else if (firstFridayPool.includes(pick)) {
      eventTag = "FirstFriday";
    } else if (creationDayPool.includes(pick)) {
      eventTag = "CreationDay";
    } else if (holiday !== "none" && holidayPools[holiday]?.includes(pick)) {
      eventTag = "Holiday";
    } else if (sportsSeason !== "off-season" && sportsSeasonPools[sportsSeason]?.includes(pick)) {
      eventTag = "Sports";
    }

    // Check for Media Event Tag
    const mediaEffects = S.mediaEffects || {};
    if (mediaEffects.eventPools) {
      const allMediaEvents = [
        ...(mediaEffects.eventPools.anxious || []),
        ...(mediaEffects.eventPools.hopeful || []),
        ...(mediaEffects.eventPools.crisis || []),
        ...(mediaEffects.eventPools.celebrity || []),
        ...(mediaEffects.eventPools.sports || [])
      ];
      if (allMediaEvents.includes(pick)) {
        eventTag = "Media";
      }
    }

    // Check for Weather Event Tag
    if (S.weatherEventPools) {
      const allWeatherEvents = [
        ...(S.weatherEventPools.base || []),
        ...(S.weatherEventPools.enhanced || []),
        ...(S.weatherEventPools.special || [])
      ];
      if (allWeatherEvents.includes(pick)) {
        eventTag = "Weather";
      }
    }

    const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

    const existing = row[iLife] ? row[iLife].toString() : "";
    const line = `${stamp} — [${eventTag}] ${pick}`;

    row[iLife] = existing ? existing + "\n" + line : line;
    row[iLastU] = ctx.now;

    if (lifeLog) {
      lifeLog.appendRow([
        ctx.now,
        row[iPopID],
        (row[iFirst] + " " + row[iLast]).trim(),
        eventTag,
        pick,
        neighborhood || "Engine",
        cycle
      ]);
    }

    rows[r] = row;

    // Track this citizen as active
    S.cycleActiveCitizens.push(popId);

    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    count++;
  }

  // Write back updated rows
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  ctx.summary = S;
}


/**
 * ============================================================================
 * CITIZENS EVENTS ENGINE REFERENCE
 * ============================================================================
 * 
 * Target: Tier-3 and Tier-4 ENGINE citizens only
 * Limit: 10 events per cycle
 * 
 * BASE CHANCE: 0.02
 * 
 * CHANCE MODIFIERS:
 * - Weather impact ≥1.3: +0.01
 * - Negative sentiment: +0.01
 * - Chaos events: +0.015
 * - Winter/Summer: +0.005
 * - Economic extremes: +0.005
 * - Rivalry bond: +0.02
 * - Arc involvement: +0.01 to +0.04 (by phase)
 * 
 * CALENDAR MODIFIERS (v2.4):
 * - Major holiday: +0.02
 * - Oakland holiday: +0.02
 * - Cultural holiday: +0.015
 * - Minor holiday: +0.008
 * - First Friday: +0.015
 * - First Friday arts neighborhoods: +0.01 additional
 * - Creation Day: +0.01
 * - Championship: +0.015
 * - Playoffs: +0.01
 * - Cultural activity ≥1.4: +0.008
 * - Community engagement ≥1.3: +0.005
 * 
 * CHANCE CAP: 0.18 (raised from 0.15)
 * 
 * NEIGHBORHOODS (12 total):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave (v2.4)
 * 
 * EVENT TAGS:
 * - Daily, Neighborhood, Alliance, Rivalry, Mentorship, Arc
 * - Media, Weather
 * - Holiday, FirstFriday, CreationDay, Sports (v2.4)
 * 
 * HOLIDAY POOLS:
 * - Major: Thanksgiving, Holiday, NewYear, Independence, etc.
 * - Cultural: MLKDay, Juneteenth, CincoDeMayo, DiaDeMuertos, etc.
 * - Oakland: OpeningDay, OaklandPride
 * - Minor: Valentine, Halloween, Easter, etc.
 * 
 * ============================================================================
 */