/**
 * ============================================================================
 * generateNamedCitizenEvents_ v2.3
 * ============================================================================
 *
 * v2.3 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - Full GodWorld Calendar integration (30+ holidays)
 * - First Friday cultural event pools
 * - Creation Day community event pools
 * - Sports season awareness
 * - Holiday-specific event pools
 * - Calendar-aware chance modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.2):
 * - Media Feedback integration
 * - Weather Mood integration
 * - Bond system integration
 * - Arc involvement awareness
 * - Calendar/weather/chaos awareness
 * 
 * ============================================================================
 */

function generateNamedCitizenEvents_(ctx) {

  const ledger = ctx.ss.getSheetByName('Simulation_Ledger');
  const logSheet = ctx.ss.getSheetByName('LifeHistory_Log');
  if (!ledger) return;

  const values = ledger.getDataRange().getValues();
  if (values.length < 2) return;

  const header = values[0];
  const rows = values.slice(1);

  const idx = n => header.indexOf(n);

  const iPopID = idx('POPID');
  const iFirst = idx('First');
  const iLast = idx('Last');
  const iClock = idx('ClockMode');
  const iUNI = idx('UNI (y/n)');
  const iMED = idx('MED (y/n)');
  const iCIV = idx('CIV (y/n)');
  const iStatus = idx('Status');
  const iLife = idx('LifeHistory');
  const iLastUpd = idx('LastUpdated');
  const iNeighborhood = idx('Neighborhood');

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

  // Calendar context (v2.3)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE TRACKING
  // ═══════════════════════════════════════════════════════════════════════════
  S.cycleActiveCitizens = S.cycleActiveCitizens || [];

  let globalEvents = 0;
  const GLOBAL_EVENT_CAP = 5;

  // ═══════════════════════════════════════════════════════════════════════════
  // UNI + MED EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  const uniMedLifestyle = [
    "kept a steady routine focused on personal balance",
    "maintained consistent daily habits",
    "reflected quietly on recent days",
    "kept low profile while focusing on responsibilities"
  ];

  const uniMedReputation = [
    "experienced subtle reputation drift based on steady presence",
    "maintained stable public perception",
    "gained minor positive regard from nearby peers"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CIV EVENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const civEvents = [
    "public perception shifted slightly after minor civic discussions",
    "became a point of small attention during local civic conversations",
    "engaged in a low-visibility civic task this cycle"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL NAMED-CITIZEN POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  const generalLifestyle = [
    "made a small personal adjustment to their daily routine",
    "spent time reconnecting with familiar surroundings",
    "found a calm moment amid the day's flow",
    "adjusted habits in response to daily events"
  ];

  const generalCommunity = [
    "interacted lightly with community members",
    "felt mild influence from neighborhood mood",
    "noticed subtle shifts in local activity"
  ];

  const generalReputation = [
    "experienced a minor reputation shift based on daily presence",
    "received brief positive acknowledgement",
    "brushed past a minor misunderstanding",
    "gained slight goodwill from routine conduct"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // BOND-AWARE EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  const allianceEvents = [
    "received quiet support from an established connection",
    "felt reassured by a trusted professional relationship",
    "exchanged brief acknowledgement with a known ally"
  ];

  const rivalryEvents = [
    "sensed subtle professional tension in passing",
    "noticed a brief moment of competitive awareness",
    "felt the weight of an ongoing professional dynamic"
  ];

  const mentorshipEvents = [
    "reflected on guidance from someone in their network",
    "considered their role as someone others look to",
    "appreciated wisdom shared by an experienced contact"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ARC INVOLVEMENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const arcEvents = [
    "felt connected to larger unfolding events",
    "sensed their involvement in an evolving situation",
    "noticed how current circumstances affected their sphere"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD POOLS (12 neighborhoods - v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodEvents = {
    'Temescal': [
      "noticed the neighborhood's creative energy",
      "felt Temescal's community vibe",
      "appreciated Temescal's eclectic character"
    ],
    'Downtown': [
      "felt the pulse of Downtown's activity",
      "navigated Downtown's busy atmosphere",
      "observed the city center's daily rhythm"
    ],
    'Fruitvale': [
      "appreciated Fruitvale's cultural richness",
      "felt connected to Fruitvale's community",
      "noticed the neighborhood's vibrant spirit"
    ],
    'Lake Merritt': [
      "enjoyed a moment near Lake Merritt",
      "felt the calm of the lakeside area",
      "appreciated the lake's peaceful atmosphere"
    ],
    'West Oakland': [
      "noticed West Oakland's changing landscape",
      "felt the neighborhood's industrial character",
      "observed the area's ongoing transformation"
    ],
    'Laurel': [
      "appreciated Laurel's quiet residential feel",
      "enjoyed the neighborhood's local charm",
      "felt the district's settled atmosphere"
    ],
    'Rockridge': [
      "strolled through Rockridge's tree-lined streets",
      "noticed Rockridge's upscale atmosphere",
      "appreciated the neighborhood's refined character"
    ],
    'Jack London': [
      "felt Jack London's waterfront energy",
      "enjoyed the arts district atmosphere",
      "noticed the neighborhood's evening activity"
    ],
    // v2.3: New neighborhoods
    'Uptown': [
      "walked through Uptown's gallery district",
      "noticed the neighborhood's artistic energy",
      "felt the creative pulse near the Fox Theater"
    ],
    'KONO': [
      "explored KONO's creative corridor",
      "noticed murals along the streets",
      "felt the neighborhood's DIY artistic spirit"
    ],
    'Chinatown': [
      "appreciated Chinatown's bustling energy",
      "noticed the blend of tradition and change",
      "felt connected to the neighborhood's heritage"
    ],
    'Piedmont Ave': [
      "strolled along Piedmont Avenue",
      "enjoyed the neighborhood's boutique charm",
      "appreciated the leafy residential character"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  const weatherNotes = [];
  if (weather.type === "rain") weatherNotes.push("adjusted plans due to rain");
  if (weather.type === "fog") weatherNotes.push("moved carefully during foggy hours");
  if (weather.type === "hot") weatherNotes.push("adapted routine to summer heat");
  if (weather.type === "cold") weatherNotes.push("bundled up against the cold");
  if (weather.type === "wind") weatherNotes.push("shortened outdoor moments because of wind");

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  const seasonal = [];
  if (season === "Winter") seasonal.push("adjusted rhythm to winter pace");
  if (season === "Spring") seasonal.push("felt seasonal renewal in daily mood");
  if (season === "Summer") seasonal.push("enjoyed warmer evening hours");
  if (season === "Fall") seasonal.push("prepared for changing autumn routines");

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  const chaosNotes = chaos.length > 0 ? [
    "felt slight atmospheric shift due to city events",
    "reacted subtly to recent happenings"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  const sentimentNotes = [];
  if (dynamics.sentiment >= 0.3) sentimentNotes.push("felt encouraged by improving city mood");
  if (dynamics.sentiment <= -0.3) sentimentNotes.push("felt tension from city atmosphere");

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  const econNotes = [];
  if (econMood <= 35) econNotes.push("felt economic uncertainty in the air");
  if (econMood >= 65) econNotes.push("sensed optimism about the local economy");

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EVENT POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  const holidayPools = {
    // Major holidays
    "Thanksgiving": [
      "prepared for Thanksgiving observances",
      "reflected on gratitude this season"
    ],
    "Holiday": [
      "felt the holiday spirit influencing the day",
      "noticed seasonal festivities around town"
    ],
    "NewYear": [
      "reflected on the year's transitions",
      "felt the fresh-start energy of the new year"
    ],
    "Independence": [
      "noticed patriotic atmosphere in the city",
      "felt the holiday's communal energy"
    ],
    
    // Cultural holidays
    "MLKDay": [
      "reflected on Dr. King's enduring legacy",
      "felt the weight of history on this day"
    ],
    "Juneteenth": [
      "honored the significance of freedom",
      "felt connected to heritage and history"
    ],
    "CincoDeMayo": [
      "noticed festive cultural celebrations",
      "felt the community's celebratory spirit"
    ],
    "DiaDeMuertos": [
      "honored ancestors in quiet reflection",
      "felt connected to those who came before"
    ],
    "LunarNewYear": [
      "noticed lunar new year celebrations",
      "felt the energy of cultural renewal"
    ],
    
    // Oakland-specific
    "OpeningDay": [
      "felt the city's baseball excitement",
      "noticed A's spirit around Oakland"
    ],
    "OaklandPride": [
      "felt Oakland's inclusive celebration",
      "noticed rainbow colors around town"
    ],
    
    // Minor holidays
    "Valentine": [
      "noticed Valentine's atmosphere",
      "felt the day's romantic undertones"
    ],
    "Halloween": [
      "noticed spooky decorations appearing",
      "felt the playful autumn spirit"
    ],
    "Easter": [
      "noticed spring celebrations",
      "felt the seasonal renewal"
    ],
    "MemorialDay": [
      "reflected on those who served",
      "felt the weight of remembrance"
    ],
    "LaborDay": [
      "appreciated workers and labor",
      "enjoyed the holiday's relaxed atmosphere"
    ],
    "VeteransDay": [
      "honored veterans in thought",
      "reflected on service and sacrifice"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY POOL (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  const firstFridayEvents = [
    "noticed First Friday energy in the arts district",
    "felt the creative atmosphere of the evening",
    "observed gallery openings and art walks"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY POOL (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  const creationDayEvents = [
    "felt a sense of Oakland's foundational spirit",
    "reflected on roots in the community",
    "appreciated the city's enduring character"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  const sportsSeasonEvents = {
    "championship": [
      "felt championship energy in the city",
      "noticed the team's success lifting spirits"
    ],
    "playoffs": [
      "followed playoff developments",
      "felt the city's sports tension"
    ],
    "post-season": [
      "followed playoff developments",
      "felt the city's sports anticipation"
    ],
    "late-season": [
      "noticed the pennant race tension",
      "followed standings with interest"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN CITIZEN LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  for (let r = 0; r < rows.length; r++) {

    if (globalEvents >= GLOBAL_EVENT_CAP) break;

    const row = rows[r];

    const popId = (row[iPopID] || "").toString();
    const first = (row[iFirst] || "").toString();
    const last = (row[iLast] || "").toString();
    const mode = (row[iClock] || "").toString().trim();
    const status = (row[iStatus] || "").toString().trim().toLowerCase();
    const neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    if (!popId) continue;
    if (mode !== "ENGINE") continue;
    if (status !== "active") continue;

    const isUNI = (row[iUNI] || "").toString().toLowerCase() === "y";
    const isMED = (row[iMED] || "").toString().toLowerCase() === "y";
    const isCIV = (row[iCIV] || "").toString().toLowerCase() === "y";

    // ═══════════════════════════════════════════════════════════════════════
    // BASE PROBABILITY
    // ═══════════════════════════════════════════════════════════════════════
    let chance = 0.02;

    // Weather modifiers
    if (weather.impact >= 1.3) chance += 0.01;
    if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.005;

    // Sentiment modifiers
    if (dynamics.sentiment <= -0.3) chance += 0.01;
    if (dynamics.sentiment >= 0.3) chance += 0.005;

    // Chaos modifier
    if (chaos.length > 0) chance += 0.015;

    // Seasonal modifiers
    if (season === "Winter") chance += 0.005;
    if (season === "Summer") chance += 0.005;

    // Economic modifier
    if (econMood <= 35 || econMood >= 65) chance += 0.005;

    // ═══════════════════════════════════════════════════════════════════════
    // CALENDAR CHANCE MODIFIERS (v2.3)
    // ═══════════════════════════════════════════════════════════════════════
    
    // Holiday boosts
    if (holidayPriority === "major") chance += 0.015;
    else if (holidayPriority === "oakland") chance += 0.015;
    else if (holidayPriority === "cultural") chance += 0.012;
    else if (holidayPriority === "minor") chance += 0.006;

    // First Friday boost (especially for non-UNI citizens)
    if (isFirstFriday && !isUNI) {
      chance += 0.012;
      if (neighborhood === "Uptown" || neighborhood === "KONO" || 
          neighborhood === "Temescal" || neighborhood === "Jack London") {
        chance += 0.008;
      }
    }

    // Creation Day boost
    if (isCreationDay) chance += 0.008;

    // Sports season boost
    if (sportsSeason === "championship") chance += 0.012;
    else if (sportsSeason === "playoffs" || sportsSeason === "post-season") chance += 0.008;

    // Cultural activity boost
    if (dynamics.culturalActivity >= 1.4) chance += 0.006;

    // Community engagement boost
    if (dynamics.communityEngagement >= 1.3) chance += 0.004;

    // ═══════════════════════════════════════════════════════════════════════
    // BOND & ARC BOOST
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getCombinedEventBoost_ === 'function') {
      const eventBoost = getCombinedEventBoost_(ctx, popId);
      chance *= eventBoost;
    }

    // Check for active bonds
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

    if (hasRivalry) chance += 0.01;

    // ═══════════════════════════════════════════════════════════════════════
    // ARC INVOLVEMENT CHECK
    // ═══════════════════════════════════════════════════════════════════════
    let activeArc = null;
    if (typeof citizenInActiveArc_ === 'function') {
      activeArc = citizenInActiveArc_(ctx, popId);
      if (activeArc) {
        const arcPhaseBoost = {
          'early': 0.005,
          'rising': 0.008,
          'mid': 0.01,
          'peak': 0.015,
          'decline': 0.008,
          'falling': 0.006
        };
        chance += arcPhaseBoost[activeArc.phase] || 0.005;
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

    // Cap chance (v2.3: raised from 0.10 to 0.12)
    if (chance > 0.12) chance = 0.12;

    if (Math.random() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // DETERMINE EVENT TYPE
    // ═══════════════════════════════════════════════════════════════════════
    let pool = [];
    let tag = "";

    if (isCIV) {
      tag = "Civic Perception";
      pool = civEvents;
    }
    else if (isUNI || isMED) {
      tag = Math.random() < 0.5 ? "Lifestyle" : "Reputation";
      pool = tag === "Lifestyle" ? uniMedLifestyle : uniMedReputation;
    }
    else {
      const roll = Math.random();
      if (roll < 0.33) { tag = "Lifestyle"; pool = generalLifestyle; }
      else if (roll < 0.66) { tag = "Community"; pool = generalCommunity; }
      else { tag = "Reputation"; pool = generalReputation; }
    }

    // Merge world-state context
    pool = pool.concat(weatherNotes, seasonal, chaosNotes, sentimentNotes, econNotes);

    // Add neighborhood events
    if (neighborhood && neighborhoodEvents[neighborhood] && !isUNI) {
      pool = pool.concat(neighborhoodEvents[neighborhood]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD HOLIDAY EVENTS (v2.3)
    // ═══════════════════════════════════════════════════════════════════════
    if (holiday !== "none" && holidayPools[holiday] && !isUNI) {
      pool = pool.concat(holidayPools[holiday]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD FIRST FRIDAY EVENTS (v2.3)
    // ═══════════════════════════════════════════════════════════════════════
    if (isFirstFriday && !isUNI) {
      pool = pool.concat(firstFridayEvents);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD CREATION DAY EVENTS (v2.3)
    // ═══════════════════════════════════════════════════════════════════════
    if (isCreationDay && !isUNI) {
      pool = pool.concat(creationDayEvents);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD SPORTS SEASON EVENTS (v2.3)
    // ═══════════════════════════════════════════════════════════════════════
    if (sportsSeason !== "off-season" && sportsSeasonEvents[sportsSeason] && !isUNI) {
      pool = pool.concat(sportsSeasonEvents[sportsSeason]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD BOND-AWARE EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    if (!isUNI) {
      if (hasAlliance && Math.random() < 0.3) {
        pool = [...pool, ...allianceEvents];
      }
      if (hasRivalry && Math.random() < 0.25) {
        pool = [...pool, ...rivalryEvents];
      }
      if (hasMentorship && Math.random() < 0.25) {
        pool = [...pool, ...mentorshipEvents];
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD ARC EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    if (activeArc && !isUNI && Math.random() < 0.3) {
      pool = [...pool, ...arcEvents];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD WEATHER EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getWeatherEvent_ === 'function' && Math.random() < 0.2) {
      const weatherEvent = getWeatherEvent_(ctx, false);
      if (weatherEvent) {
        pool.push(weatherEvent.text);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD MEDIA-INFLUENCED EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getMediaInfluencedEvent_ === 'function' && Math.random() < 0.15) {
      const mediaEvent = getMediaInfluencedEvent_(ctx);
      if (mediaEvent) {
        pool.push(mediaEvent.text);
      }
    }

    // Pick final event description
    const description = pool[Math.floor(Math.random() * pool.length)];

    // ═══════════════════════════════════════════════════════════════════════
    // DETERMINE FINAL TAG BASED ON CONTENT
    // ═══════════════════════════════════════════════════════════════════════
    if (allianceEvents.includes(description)) tag = "Alliance";
    else if (rivalryEvents.includes(description)) tag = "Rivalry";
    else if (mentorshipEvents.includes(description)) tag = "Mentorship";
    else if (arcEvents.includes(description)) tag = "Arc";
    else if (neighborhood && neighborhoodEvents[neighborhood]?.includes(description)) tag = "Neighborhood";
    else if (firstFridayEvents.includes(description)) tag = "FirstFriday";
    else if (creationDayEvents.includes(description)) tag = "CreationDay";
    else if (holiday !== "none" && holidayPools[holiday]?.includes(description)) tag = "Holiday";
    else if (sportsSeason !== "off-season" && sportsSeasonEvents[sportsSeason]?.includes(description)) tag = "Sports";

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
      if (allMediaEvents.includes(description)) tag = "Media";
    }

    // Check for Weather Event Tag
    if (S.weatherEventPools) {
      const allWeatherEvents = [
        ...(S.weatherEventPools.base || []),
        ...(S.weatherEventPools.enhanced || []),
        ...(S.weatherEventPools.special || [])
      ];
      if (allWeatherEvents.includes(description)) tag = "Weather";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WRITE TO LIFEHISTORY
    // ═══════════════════════════════════════════════════════════════════════
    const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const line = `${stamp} — [${tag}] ${description}`;

    const existing = row[iLife] ? row[iLife].toString() : "";
    row[iLife] = existing ? existing + "\n" + line : line;
    row[iLastUpd] = ctx.now;

    // ═══════════════════════════════════════════════════════════════════════
    // TRACK ACTIVE CITIZEN
    // ═══════════════════════════════════════════════════════════════════════
    S.cycleActiveCitizens.push(popId);

    // ═══════════════════════════════════════════════════════════════════════
    // LOG ENTRY
    // ═══════════════════════════════════════════════════════════════════════
    if (logSheet) {
      logSheet.appendRow([
        ctx.now,
        popId,
        (first + " " + last).trim(),
        tag,
        description,
        neighborhood || "Engine",
        cycle
      ]);
    }

    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    globalEvents++;

    rows[r] = row;
  }

  // Commit back to ledger
  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  ctx.summary = S;
}


/**
 * ============================================================================
 * NAMED CITIZEN EVENTS REFERENCE
 * ============================================================================
 * 
 * Target: Named ENGINE citizens (UNI, MED, CIV, and general)
 * Limit: 5 events per cycle
 * 
 * BASE CHANCE: 0.02
 * 
 * CHANCE MODIFIERS:
 * - Weather impact ≥1.3: +0.01
 * - Low comfort index: +0.005
 * - Negative sentiment: +0.01
 * - Positive sentiment: +0.005
 * - Chaos events: +0.015
 * - Winter/Summer: +0.005
 * - Economic extremes: +0.005
 * - Rivalry bond: +0.01
 * - Arc involvement: +0.005 to +0.015 (by phase)
 * 
 * CALENDAR MODIFIERS (v2.3):
 * - Major holiday: +0.015
 * - Oakland holiday: +0.015
 * - Cultural holiday: +0.012
 * - Minor holiday: +0.006
 * - First Friday: +0.012
 * - FF arts neighborhoods: +0.008 additional
 * - Creation Day: +0.008
 * - Championship: +0.012
 * - Playoffs: +0.008
 * - Cultural activity ≥1.4: +0.006
 * - Community engagement ≥1.3: +0.004
 * 
 * CHANCE CAP: 0.12 (raised from 0.10)
 * 
 * NEIGHBORHOODS (12 total):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave (v2.3)
 * 
 * EVENT TAGS:
 * - Lifestyle, Reputation, Community, Civic Perception
 * - Alliance, Rivalry, Mentorship, Arc
 * - Neighborhood, Media, Weather
 * - Holiday, FirstFriday, CreationDay, Sports (v2.3)
 * 
 * UNI CITIZENS:
 * - Only get uniMedLifestyle and uniMedReputation pools
 * - Do NOT get neighborhood, holiday, First Friday, etc. events
 * - Protected from most world-context pollution
 * 
 * ============================================================================
 */