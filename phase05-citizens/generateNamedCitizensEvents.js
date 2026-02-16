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

  var ledger = ctx.ss.getSheetByName('Simulation_Ledger');
  var logSheet = ctx.ss.getSheetByName('LifeHistory_Log');
  if (!ledger) return;

  var values = ledger.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };

  var iPopID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iClock = idx('ClockMode');
  var iUNI = idx('UNI (y/n)');
  var iMED = idx('MED (y/n)');
  var iCIV = idx('CIV (y/n)');
  var iStatus = idx('Status');
  var iLife = idx('LifeHistory');
  var iLastUpd = idx('LastUpdated');
  var iNeighborhood = idx('Neighborhood');

  var S = ctx.summary;
  var cycle = S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var econMood = S.economicMood || 50;

  // Calendar context (v2.3)
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE TRACKING
  // ═══════════════════════════════════════════════════════════════════════════
  S.cycleActiveCitizens = S.cycleActiveCitizens || [];

  var globalEvents = 0;
  var GLOBAL_EVENT_CAP = 5;

  // ═══════════════════════════════════════════════════════════════════════════
  // UNI + MED EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  var uniMedLifestyle = [
    "kept a steady routine focused on personal balance",
    "maintained consistent daily habits",
    "reflected quietly on recent days",
    "kept low profile while focusing on responsibilities"
  ];

  var uniMedReputation = [
    "experienced subtle reputation drift based on steady presence",
    "maintained stable public perception",
    "gained minor positive regard from nearby peers"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CIV EVENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var civEvents = [
    "public perception shifted slightly after minor civic discussions",
    "became a point of small attention during local civic conversations",
    "engaged in a low-visibility civic task this cycle"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL NAMED-CITIZEN POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  var generalLifestyle = [
    "made a small personal adjustment to their daily routine",
    "spent time reconnecting with familiar surroundings",
    "found a calm moment amid the day's flow",
    "adjusted habits in response to daily events"
  ];

  var generalCommunity = [
    "interacted lightly with community members",
    "felt mild influence from neighborhood mood",
    "noticed subtle shifts in local activity"
  ];

  var generalReputation = [
    "experienced a minor reputation shift based on daily presence",
    "received brief positive acknowledgement",
    "brushed past a minor misunderstanding",
    "gained slight goodwill from routine conduct"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // BOND-AWARE EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  var allianceEvents = [
    "received quiet support from an established connection",
    "felt reassured by a trusted professional relationship",
    "exchanged brief acknowledgement with a known ally"
  ];

  var rivalryEvents = [
    "sensed subtle professional tension in passing",
    "noticed a brief moment of competitive awareness",
    "felt the weight of an ongoing professional dynamic"
  ];

  var mentorshipEvents = [
    "reflected on guidance from someone in their network",
    "considered their role as someone others look to",
    "appreciated wisdom shared by an experienced contact"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ARC INVOLVEMENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var arcEvents = [
    "felt connected to larger unfolding events",
    "sensed their involvement in an evolving situation",
    "noticed how current circumstances affected their sphere"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD POOLS (12 neighborhoods - v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodEvents = {
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
  var weatherNotes = [];
  if (weather.type === "rain") weatherNotes.push("adjusted plans due to rain");
  if (weather.type === "fog") weatherNotes.push("moved carefully during foggy hours");
  if (weather.type === "hot") weatherNotes.push("adapted routine to summer heat");
  if (weather.type === "cold") weatherNotes.push("bundled up against the cold");
  if (weather.type === "wind") weatherNotes.push("shortened outdoor moments because of wind");

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  var seasonal = [];
  if (season === "Winter") seasonal.push("adjusted rhythm to winter pace");
  if (season === "Spring") seasonal.push("felt seasonal renewal in daily mood");
  if (season === "Summer") seasonal.push("enjoyed warmer evening hours");
  if (season === "Fall") seasonal.push("prepared for changing autumn routines");

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  var chaosNotes = chaos.length > 0 ? [
    "felt slight atmospheric shift due to city events",
    "reacted subtly to recent happenings"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  var sentimentNotes = [];
  if (dynamics.sentiment >= 0.3) sentimentNotes.push("felt encouraged by improving city mood");
  if (dynamics.sentiment <= -0.3) sentimentNotes.push("felt tension from city atmosphere");

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  var econNotes = [];
  if (econMood <= 35) econNotes.push("felt economic uncertainty in the air");
  if (econMood >= 65) econNotes.push("sensed optimism about the local economy");

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EVENT POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayPools = {
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
  var firstFridayEvents = [
    "noticed First Friday energy in the arts district",
    "felt the creative atmosphere of the evening",
    "observed gallery openings and art walks"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY POOL (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var creationDayEvents = [
    "felt a sense of Oakland's foundational spirit",
    "reflected on roots in the community",
    "appreciated the city's enduring character"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var sportsSeasonEvents = {
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
  for (var r = 0; r < rows.length; r++) {

    if (globalEvents >= GLOBAL_EVENT_CAP) break;

    var row = rows[r];

    var popId = (row[iPopID] || "").toString();
    var first = (row[iFirst] || "").toString();
    var last = (row[iLast] || "").toString();
    var mode = (row[iClock] || "").toString().trim();
    var status = (row[iStatus] || "").toString().trim().toLowerCase();
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    if (!popId) continue;
    if (mode !== "ENGINE") continue;
    if (status !== "active") continue;

    var isUNI = (row[iUNI] || "").toString().toLowerCase() === "y";
    var isMED = (row[iMED] || "").toString().toLowerCase() === "y";
    var isCIV = (row[iCIV] || "").toString().toLowerCase() === "y";

    // ═══════════════════════════════════════════════════════════════════════
    // BASE PROBABILITY
    // ═══════════════════════════════════════════════════════════════════════
    var chance = 0.02;

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
      var eventBoost = getCombinedEventBoost_(ctx, popId);
      chance *= eventBoost;
    }

    // Check for active bonds
    var citizenBonds = [];
    var hasRivalry = false;
    var hasAlliance = false;
    var hasMentorship = false;

    if (typeof getCitizenBonds_ === 'function') {
      citizenBonds = getCitizenBonds_(ctx, popId);
      hasRivalry = citizenBonds.some(function(b) { return b.bondType === 'rivalry'; });
      hasAlliance = citizenBonds.some(function(b) { return b.bondType === 'alliance'; });
      hasMentorship = citizenBonds.some(function(b) { return b.bondType === 'mentorship'; });
    }

    if (hasRivalry) chance += 0.01;

    // ═══════════════════════════════════════════════════════════════════════
    // ARC INVOLVEMENT CHECK
    // ═══════════════════════════════════════════════════════════════════════
    var activeArc = null;
    if (typeof citizenInActiveArc_ === 'function') {
      activeArc = citizenInActiveArc_(ctx, popId);
      if (activeArc) {
        var arcPhaseBoost = {
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
      var weatherMod = getWeatherEventModifier_(ctx, 'social');
      chance *= weatherMod;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MEDIA MODIFIER
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getMediaEventModifier_ === 'function') {
      var mediaMod = getMediaEventModifier_(ctx, 'social');
      chance *= mediaMod;
    }

    // Cap chance (v2.3: raised from 0.10 to 0.12)
    if (chance > 0.12) chance = 0.12;

    if (Math.random() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // DETERMINE EVENT TYPE
    // ═══════════════════════════════════════════════════════════════════════
    var pool = [];
    var tag = "";

    if (isCIV) {
      tag = "Civic Perception";
      pool = civEvents;
    }
    else if (isUNI || isMED) {
      tag = Math.random() < 0.5 ? "Lifestyle" : "Reputation";
      pool = tag === "Lifestyle" ? uniMedLifestyle : uniMedReputation;
    }
    else {
      var roll = Math.random();
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
        pool = pool.concat(allianceEvents);
      }
      if (hasRivalry && Math.random() < 0.25) {
        pool = pool.concat(rivalryEvents);
      }
      if (hasMentorship && Math.random() < 0.25) {
        pool = pool.concat(mentorshipEvents);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD ARC EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    if (activeArc && !isUNI && Math.random() < 0.3) {
      pool = pool.concat(arcEvents);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD WEATHER EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getWeatherEvent_ === 'function' && Math.random() < 0.2) {
      var weatherEvent = getWeatherEvent_(ctx, false);
      if (weatherEvent) {
        pool.push(weatherEvent.text);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADD MEDIA-INFLUENCED EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    if (typeof getMediaInfluencedEvent_ === 'function' && Math.random() < 0.15) {
      var mediaEvent = getMediaInfluencedEvent_(ctx);
      if (mediaEvent) {
        pool.push(mediaEvent.text);
      }
    }

    // Pick final event description
    var description = pool[Math.floor(Math.random() * pool.length)];

    // ═══════════════════════════════════════════════════════════════════════
    // DETERMINE FINAL TAG BASED ON CONTENT
    // ═══════════════════════════════════════════════════════════════════════
    if (allianceEvents.indexOf(description) >= 0) tag = "Alliance";
    else if (rivalryEvents.indexOf(description) >= 0) tag = "Rivalry";
    else if (mentorshipEvents.indexOf(description) >= 0) tag = "Mentorship";
    else if (arcEvents.indexOf(description) >= 0) tag = "Arc";
    else if (neighborhood && neighborhoodEvents[neighborhood] && neighborhoodEvents[neighborhood].indexOf(description) >= 0) tag = "Neighborhood";
    else if (firstFridayEvents.indexOf(description) >= 0) tag = "FirstFriday";
    else if (creationDayEvents.indexOf(description) >= 0) tag = "CreationDay";
    else if (holiday !== "none" && holidayPools[holiday] && holidayPools[holiday].indexOf(description) >= 0) tag = "Holiday";
    else if (sportsSeason !== "off-season" && sportsSeasonEvents[sportsSeason] && sportsSeasonEvents[sportsSeason].indexOf(description) >= 0) tag = "Sports";

    // Check for Media Event Tag
    var mediaEffects = S.mediaEffects || {};
    if (mediaEffects.eventPools) {
      var allMediaEvents = [].concat(
        mediaEffects.eventPools.anxious || [],
        mediaEffects.eventPools.hopeful || [],
        mediaEffects.eventPools.crisis || [],
        mediaEffects.eventPools.celebrity || [],
        mediaEffects.eventPools.sports || []
      );
      if (allMediaEvents.indexOf(description) >= 0) tag = "Media";
    }

    // Check for Weather Event Tag
    if (S.weatherEventPools) {
      var allWeatherEvents = [].concat(
        S.weatherEventPools.base || [],
        S.weatherEventPools.enhanced || [],
        S.weatherEventPools.special || []
      );
      if (allWeatherEvents.indexOf(description) >= 0) tag = "Weather";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WRITE TO LIFEHISTORY
    // ═══════════════════════════════════════════════════════════════════════
    var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    var line = stamp + " — [" + tag + "] " + description;

    var existing = row[iLife] ? row[iLife].toString() : "";
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
        '',
        tag,
        description,
        '',
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