/**
 * ============================================================================
 * V3.3 STORY SEEDS ENGINE — CALENDAR ENHANCED
 * ============================================================================
 *
 * Produces newsroom-ready narrative seeds with GodWorld Calendar integration.
 *
 * v3.3 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx/summary
 * - Manual deduplication (no Set)
 * - for loops instead of forEach
 *
 * v3.2 Features:
 * - Full GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific story seed pools
 * - First Friday cultural seeds
 * - Creation Day community seeds
 * - Sports season narrative seeds
 * - Cultural activity and community engagement seeds
 * - Expanded Oakland neighborhoods (12)
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v3.1):
 * - Pattern and shock cycles
 * - World events + severity
 * - Civic load and sentiment
 * - Migration drift
 * - Weather volatility
 * - Economic signals
 * - Named citizen spotlights
 * - Domain accumulation
 *
 * Seeds are structured objects with domain, neighborhood, priority.
 * No sheet writes — pure functional logic.
 *
 * ============================================================================
 */

function applyStorySeeds_(ctx) {

  // Defensive guard
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};

  var S = ctx.summary;
  var seeds = [];
  var cycle = S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════
  var worldEvents = S.worldEvents || [];
  var eventCount = worldEvents.length;
  var weather = S.weather || {};
  var dynamics = S.cityDynamics || {};
  var population = S.worldPopulation || {};
  var domains = S.domainPresence || {};
  var arcs = S.eventArcs || [];

  var sentiment = dynamics.sentiment || 0;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;
  var econLabel = population.economy || '';
  var civicLoad = S.civicLoad || '';
  var pattern = S.patternFlag || '';
  var shock = S.shockFlag || '';
  var drift = S.migrationDrift || 0;
  var weight = S.cycleWeight || '';
  var weightReason = S.cycleWeightReason || '';
  var spotlights = S.namedSpotlights || [];
  var seasonal = S.seasonalStorySeeds || [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v3.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";
  var season = S.season || "Spring";

  // ═══════════════════════════════════════════════════════════════════════════
  // SEED BUILDER
  // ═══════════════════════════════════════════════════════════════════════════
  function makeSeed(text, domain, neighborhood, priority, seedType) {
    return {
      seedId: Utilities.getUuid().slice(0, 8),
      text: text,
      domain: domain || 'GENERAL',
      neighborhood: neighborhood || '',
      priority: priority || 1,
      seedType: seedType || 'signal',
      cycle: cycle,
      calendarContext: {
        holiday: holiday,
        isFirstFriday: isFirstFriday,
        isCreationDay: isCreationDay,
        sportsSeason: sportsSeason
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY STORY SEEDS (v3.2)
  // ═══════════════════════════════════════════════════════════════════════════

  var holidaySeeds = {
    // Major holidays
    "Thanksgiving": {
      seeds: [
        { text: "Thanksgiving gatherings reshape neighborhood rhythms. Family stories emerging.", domain: "COMMUNITY", nh: "Fruitvale", priority: 2 },
        { text: "Local organizations feed the community. Who's helping whom this holiday?", domain: "CIVIC", nh: "Downtown", priority: 2 },
        { text: "Travel patterns shift city demographics temporarily. Visitors and returns.", domain: "COMMUNITY", nh: "", priority: 1 }
      ]
    },
    "Holiday": {
      seeds: [
        { text: "Holiday festivities transform the city's character. Stories of celebration and reflection.", domain: "COMMUNITY", nh: "", priority: 2 },
        { text: "Retail corridors buzzing with seasonal activity. Economic snapshot.", domain: "BUSINESS", nh: "Rockridge", priority: 2 },
        { text: "Community groups rallying to support those in need. Season of giving.", domain: "CIVIC", nh: "Fruitvale", priority: 2 }
      ]
    },
    "NewYear": {
      seeds: [
        { text: "Fresh start energy pervades the city. New year, new stories.", domain: "GENERAL", nh: "", priority: 2 },
        { text: "Resolutions and reflections shape resident outlooks. What's changing?", domain: "COMMUNITY", nh: "", priority: 1 }
      ]
    },
    "NewYearsEve": {
      seeds: [
        { text: "City prepares for New Year's Eve celebrations. Where will the crowds gather?", domain: "NIGHTLIFE", nh: "Jack London", priority: 2 },
        { text: "Safety preparations underway for countdown festivities. Officials on alert.", domain: "SAFETY", nh: "Downtown", priority: 2 }
      ]
    },
    "Independence": {
      seeds: [
        { text: "Fourth of July preparations underway. Fireworks, flags, and festivities.", domain: "COMMUNITY", nh: "Lake Merritt", priority: 2 },
        { text: "Patriotic displays and community gatherings define the day. Local traditions.", domain: "CULTURE", nh: "", priority: 1 }
      ]
    },
    
    // Cultural holidays
    "MLKDay": {
      seeds: [
        { text: "Dr. King's legacy honored across Oakland. Community reflection and action.", domain: "CIVIC", nh: "Downtown", priority: 3 },
        { text: "Service events connect residents to civil rights tradition. Local heroes.", domain: "COMMUNITY", nh: "West Oakland", priority: 2 }
      ]
    },
    "Juneteenth": {
      seeds: [
        { text: "Juneteenth celebrations honor freedom and heritage. Oakland's Black community stories.", domain: "CULTURE", nh: "West Oakland", priority: 3 },
        { text: "Historical significance meets contemporary meaning. Voices of celebration.", domain: "COMMUNITY", nh: "", priority: 2 }
      ]
    },
    "CincoDeMayo": {
      seeds: [
        { text: "Cinco de Mayo festivities energize Fruitvale. Cultural pride on display.", domain: "CULTURE", nh: "Fruitvale", priority: 2 },
        { text: "Mexican heritage celebrated across the city. Food, music, community.", domain: "COMMUNITY", nh: "Fruitvale", priority: 2 }
      ]
    },
    "DiaDeMuertos": {
      seeds: [
        { text: "Día de los Muertos altars honor ancestors. Fruitvale's beautiful tradition.", domain: "CULTURE", nh: "Fruitvale", priority: 3 },
        { text: "Community remembers those who came before. Stories of loss and love.", domain: "COMMUNITY", nh: "Fruitvale", priority: 2 }
      ]
    },
    "LunarNewYear": {
      seeds: [
        { text: "Lunar New Year celebrations transform Chinatown. Cultural renewal.", domain: "CULTURE", nh: "Chinatown", priority: 3 },
        { text: "Red lanterns and lion dances mark the new year. Tradition meets modernity.", domain: "COMMUNITY", nh: "Chinatown", priority: 2 }
      ]
    },
    
    // Oakland-specific holidays
    "OpeningDay": {
      seeds: [
        { text: "Opening Day brings baseball fever to Oakland. Green and gold stories.", domain: "SPORTS", nh: "Jack London", priority: 3 },
        { text: "Fans flood the waterfront district. Economic and emotional energy.", domain: "BUSINESS", nh: "Jack London", priority: 2 },
        { text: "A's faithful gather for another season. Hope springs eternal.", domain: "SPORTS", nh: "Jack London", priority: 2 }
      ]
    },
    "OaklandPride": {
      seeds: [
        { text: "Oakland Pride celebrates LGBTQ+ community. Rainbow energy downtown.", domain: "CULTURE", nh: "Downtown", priority: 3 },
        { text: "Inclusive celebration draws crowds to Lake Merritt. Love wins.", domain: "COMMUNITY", nh: "Lake Merritt", priority: 2 },
        { text: "Local businesses show support during Pride. Rainbow storefronts.", domain: "BUSINESS", nh: "Uptown", priority: 2 }
      ]
    },
    "ArtSoulFestival": {
      seeds: [
        { text: "Art & Soul Festival takes over downtown. Oakland's creative heart beats.", domain: "CULTURE", nh: "Downtown", priority: 3 },
        { text: "Music, art, and community converge. Festival stories emerging.", domain: "COMMUNITY", nh: "Downtown", priority: 2 }
      ]
    },
    
    // Minor holidays
    "Valentine": {
      seeds: [
        { text: "Valentine's Day romance and commerce. Who's celebrating love?", domain: "BUSINESS", nh: "", priority: 1 }
      ]
    },
    "Halloween": {
      seeds: [
        { text: "Halloween transforms neighborhoods. Costumes, candy, community.", domain: "COMMUNITY", nh: "Temescal", priority: 2 },
        { text: "Spooky season peaks. Family-friendly and adult celebrations.", domain: "NIGHTLIFE", nh: "Uptown", priority: 1 }
      ]
    },
    "Easter": {
      seeds: [
        { text: "Easter celebrations gather families. Spring traditions observed.", domain: "COMMUNITY", nh: "", priority: 1 }
      ]
    },
    "MemorialDay": {
      seeds: [
        { text: "Memorial Day honors fallen service members. Oakland remembers.", domain: "CIVIC", nh: "", priority: 2 },
        { text: "Summer unofficially begins. Weekend getaway stories.", domain: "COMMUNITY", nh: "", priority: 1 }
      ]
    },
    "LaborDay": {
      seeds: [
        { text: "Labor Day celebrates workers. Union stories and labor history.", domain: "CIVIC", nh: "West Oakland", priority: 2 },
        { text: "End of summer marked with gatherings. Last hurrah before fall.", domain: "COMMUNITY", nh: "", priority: 1 }
      ]
    },
    "VeteransDay": {
      seeds: [
        { text: "Veterans Day honors those who served. Local veteran stories.", domain: "CIVIC", nh: "", priority: 2 }
      ]
    }
  };

  // Add holiday-specific seeds
  if (holiday !== "none" && holidaySeeds[holiday]) {
    var hsList = holidaySeeds[holiday].seeds;
    for (var hsi = 0; hsi < hsList.length; hsi++) {
      var hs = hsList[hsi];
      seeds.push(makeSeed(hs.text, hs.domain, hs.nh, hs.priority, 'holiday'));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY SEEDS (v3.2)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isFirstFriday) {
    seeds.push(makeSeed(
      "First Friday transforms Oakland's arts districts. Galleries, street art, community.",
      'CULTURE', 'Uptown', 3, 'firstfriday'
    ));
    seeds.push(makeSeed(
      "Art walk draws crowds to Temescal and KONO. Creative energy stories.",
      'CULTURE', 'KONO', 2, 'firstfriday'
    ));
    seeds.push(makeSeed(
      "Local artists showcase work to First Friday audiences. Spotlight opportunities.",
      'COMMUNITY', 'Uptown', 2, 'firstfriday'
    ));

    // High cultural activity on First Friday is especially notable
    if (culturalActivity >= 1.4) {
      seeds.push(makeSeed(
        "First Friday cultural surge energizes the city. Arts scene thriving.",
        'CULTURE', 'Uptown', 3, 'firstfriday'
      ));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY SEEDS (v3.2)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isCreationDay) {
    seeds.push(makeSeed(
      "Creation Day honors Oakland's founding. Community reflects on roots.",
      'COMMUNITY', '', 3, 'creationday'
    ));
    seeds.push(makeSeed(
      "City's foundational spirit felt across neighborhoods. What makes Oakland Oakland?",
      'CULTURE', 'Downtown', 2, 'creationday'
    ));
    seeds.push(makeSeed(
      "Long-time residents share Oakland stories. Living history.",
      'COMMUNITY', '', 2, 'creationday'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON SEEDS (v3.2)
  // ═══════════════════════════════════════════════════════════════════════════

  if (sportsSeason === "championship") {
    seeds.push(makeSeed(
      "Championship fever grips Oakland. City united behind the team.",
      'SPORTS', 'Jack London', 3, 'sports'
    ));
    seeds.push(makeSeed(
      "Business booming near the stadium. Economic championship story.",
      'BUSINESS', 'Jack London', 2, 'sports'
    ));
    seeds.push(makeSeed(
      "Fan stories capture the championship moment. Personal stakes.",
      'COMMUNITY', '', 2, 'sports'
    ));
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    seeds.push(makeSeed(
      "Playoff tension ripples through the city. Hope and anxiety.",
      'SPORTS', 'Jack London', 2, 'sports'
    ));
    seeds.push(makeSeed(
      "Sports bars and watch parties gather the faithful. Community viewing.",
      'NIGHTLIFE', 'Downtown', 2, 'sports'
    ));
  } else if (sportsSeason === "late-season") {
    seeds.push(makeSeed(
      "Pennant race intensifies. Will Oakland make it?",
      'SPORTS', '', 2, 'sports'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY SEEDS (v3.2)
  // ═══════════════════════════════════════════════════════════════════════════

  if (culturalActivity >= 1.5) {
    seeds.push(makeSeed(
      "Cultural vibrancy peaks across Oakland. Arts scene flourishing.",
      'CULTURE', 'Uptown', 3, 'cultural'
    ));
  } else if (culturalActivity >= 1.3) {
    seeds.push(makeSeed(
      "Strong cultural energy shapes city atmosphere. Creative stories.",
      'CULTURE', '', 2, 'cultural'
    ));
  } else if (culturalActivity <= 0.7) {
    seeds.push(makeSeed(
      "Cultural activity notably subdued. What's dampening creativity?",
      'CULTURE', '', 2, 'cultural'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT SEEDS (v3.2)
  // ═══════════════════════════════════════════════════════════════════════════

  if (communityEngagement >= 1.5) {
    seeds.push(makeSeed(
      "Community engagement surging. Neighbors connecting like never before.",
      'COMMUNITY', '', 3, 'engagement'
    ));
  } else if (communityEngagement >= 1.3) {
    seeds.push(makeSeed(
      "Strong community bonds shaping neighborhood life. Connection stories.",
      'COMMUNITY', 'Temescal', 2, 'engagement'
    ));
  } else if (communityEngagement <= 0.6) {
    seeds.push(makeSeed(
      "Community withdrawal noted. Neighbors pulling back. Why?",
      'COMMUNITY', '', 2, 'engagement'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN-DRIVEN STORY SEEDS
  // ═══════════════════════════════════════════════════════════════════════════

  if (pattern === 'stability-streak') {
    seeds.push(makeSeed(
      "Extended stability streak shapes the city's tone. What's holding the calm?",
      'GENERAL', '', 1, 'pattern'
    ));
  }

  if (pattern === 'micro-event-wave') {
    seeds.push(makeSeed(
      "Wave of micro-events spreading through neighborhoods. Connected or coincidence?",
      'GENERAL', 'Laurel', 2, 'pattern'
    ));
  }

  if (pattern === 'strain-trend') {
    seeds.push(makeSeed(
      "Emerging strain trend quietly reshaping community atmosphere. Pressure building.",
      'CIVIC', 'Downtown', 3, 'pattern'
    ));
  }

  if (pattern === 'calm-after-shock') {
    seeds.push(makeSeed(
      "City enters reflective calm following disruption. Recovery stories emerging.",
      'COMMUNITY', '', 2, 'pattern'
    ));
  }

  if (pattern === 'elevated-activity') {
    seeds.push(makeSeed(
      "Elevated activity across the city. Something brewing beneath the surface.",
      'GENERAL', '', 2, 'pattern'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOCK CYCLES
  // ═══════════════════════════════════════════════════════════════════════════

  if (shock && shock !== 'none') {
    seeds.push(makeSeed(
      "Sudden systemic jolt disrupts normal cycle flow. Breaking developments.",
      'CIVIC', 'Downtown', 3, 'shock'
    ));

    // v3.2: Calendar-contextual shock seeds
    if (holidayPriority === "major") {
      seeds.push(makeSeed(
        "Holiday disrupted by unexpected developments. Plans change citywide.",
        'GENERAL', '', 3, 'shock'
      ));
    }
    if (isFirstFriday) {
      seeds.push(makeSeed(
        "First Friday atmosphere altered by breaking events. Arts community reacts.",
        'CULTURE', 'Uptown', 2, 'shock'
      ));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CYCLE WEIGHT
  // ═══════════════════════════════════════════════════════════════════════════

  if (weight === 'high-signal') {
    seeds.push(makeSeed(
      `High-signal cycle: ${weightReason || 'Multiple triggers firing.'}`,
      'GENERAL', '', 3, 'weight'
    ));
  }

  if (weight === 'medium-signal') {
    seeds.push(makeSeed(
      `Moderate world movement: ${weightReason || 'Activity above baseline.'}`,
      'GENERAL', '', 2, 'weight'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CIVIC LOAD
  // ═══════════════════════════════════════════════════════════════════════════

  if (civicLoad === 'load-strain') {
    seeds.push(makeSeed(
      "Civic strain puts pressure on core city systems. Officials feeling the heat.",
      'CIVIC', 'Downtown', 3, 'civic'
    ));
  }

  if (civicLoad === 'minor-variance') {
    seeds.push(makeSeed(
      "Minor fluctuations across civic operations. Worth monitoring.",
      'CIVIC', 'Downtown', 1, 'civic'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MIGRATION DRIFT
  // ═══════════════════════════════════════════════════════════════════════════

  if (drift > 30) {
    seeds.push(makeSeed(
      "Notable population inflow reshaping neighborhoods. New faces, new dynamics.",
      'COMMUNITY', 'Fruitvale', 2, 'demographic'
    ));
  } else if (drift > 15) {
    seeds.push(makeSeed(
      "Steady population growth continues. Housing and services adjusting.",
      'COMMUNITY', '', 1, 'demographic'
    ));
  }

  if (drift < -30) {
    seeds.push(makeSeed(
      "Population outflow alters community composition. Who's leaving and why?",
      'COMMUNITY', 'West Oakland', 2, 'demographic'
    ));
  } else if (drift < -15) {
    seeds.push(makeSeed(
      "Gradual population decline noted. Long-term trend or temporary dip?",
      'COMMUNITY', '', 1, 'demographic'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  for (var evi = 0; evi < worldEvents.length; evi++) {
    var ev = worldEvents[evi];
    var sev = ev.severity || 'low';
    var desc = ev.description || ev.subdomain || 'Unnamed event';
    var evDomain = (ev.domain || 'GENERAL').toUpperCase();
    var nh = ev.neighborhood || '';

    if (sev === 'medium') {
      seeds.push(makeSeed(
        'Notable: ' + desc,
        evDomain, nh, 2, 'event'
      ));
    } else if (sev === 'high') {
      seeds.push(makeSeed(
        'Significant: ' + desc,
        evDomain, nh, 3, 'event'
      ));
    }
  }

  if (eventCount >= 6) {
    seeds.push(makeSeed(
      "Cluster of city events sparking broader community reactions. Pattern emerging?",
      'GENERAL', '', 2, 'cluster'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER
  // ═══════════════════════════════════════════════════════════════════════════

  if (weather.impact >= 1.5) {
    seeds.push(makeSeed(
      `Severe ${weather.type || 'weather'} generating shifts in resident behavior. City adapting.`,
      'WEATHER', '', 3, 'weather'
    ));
  } else if (weather.impact >= 1.3) {
    seeds.push(makeSeed(
      `${weather.type || 'Weather'} conditions impacting local routines. Street-level stories.`,
      'WEATHER', '', 2, 'weather'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT
  // ═══════════════════════════════════════════════════════════════════════════

  if (sentiment >= 0.35) {
    seeds.push(makeSeed(
      "Positive sentiment lifting community engagement. What's driving the mood?",
      'COMMUNITY', 'Lake Merritt', 2, 'sentiment'
    ));
  } else if (sentiment >= 0.2) {
    seeds.push(makeSeed(
      "Upbeat energy in pockets of the city. Good news travels.",
      'COMMUNITY', '', 1, 'sentiment'
    ));
  }

  if (sentiment <= -0.4) {
    seeds.push(makeSeed(
      "City unease influencing day-to-day behavior. Something weighing on residents.",
      'CIVIC', '', 3, 'sentiment'
    ));
  } else if (sentiment <= -0.25) {
    seeds.push(makeSeed(
      "Muted mood across neighborhoods. Underlying tension.",
      'CIVIC', '', 2, 'sentiment'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMY
  // ═══════════════════════════════════════════════════════════════════════════

  if (econLabel === 'strong' || econLabel === 'booming') {
    seeds.push(makeSeed(
      "Strong economic posture supporting steady activity. Business confidence up.",
      'BUSINESS', 'Rockridge', 1, 'economy'
    ));
  }

  if (econLabel === 'weak') {
    seeds.push(makeSeed(
      "Economic softening raises quiet community concerns. Wallets tightening.",
      'BUSINESS', '', 2, 'economy'
    ));
  }

  if (econLabel === 'unstable' || econLabel === 'struggling') {
    seeds.push(makeSeed(
      "Economic instability fueling subtle movement patterns. Uncertainty in the air.",
      'BUSINESS', '', 3, 'economy'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CITY DYNAMICS
  // ═══════════════════════════════════════════════════════════════════════════

  if (dynamics.nightlife >= 1.3) {
    seeds.push(makeSeed(
      "High nightlife presence shaping evening flow. Jack London buzzing.",
      'NIGHTLIFE', 'Jack London', 2, 'nightlife'
    ));
  }

  if (dynamics.traffic >= 1.3) {
    seeds.push(makeSeed(
      "Traffic load altering plans and routines. Commuters adjusting.",
      'INFRASTRUCTURE', '', 1, 'traffic'
    ));
  }

  if (dynamics.publicSpaces >= 1.3) {
    seeds.push(makeSeed(
      "Public space activity influencing city energy. People are out.",
      'COMMUNITY', 'Lake Merritt', 2, 'publicspace'
    ));
  }

  if (dynamics.retail >= 1.3) {
    seeds.push(makeSeed(
      "Retail surge across commercial corridors. Shoppers on the move.",
      'BUSINESS', 'Rockridge', 1, 'retail'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════

  if (population.illnessRate > 0.08) {
    seeds.push(makeSeed(
      "Elevated illness indicators raising health concerns. Clinics watching closely.",
      'HEALTH', 'Temescal', 3, 'health'
    ));
  } else if (population.illnessRate > 0.06) {
    seeds.push(makeSeed(
      "Illness rate ticking up. Early monitoring underway.",
      'HEALTH', 'Temescal', 2, 'health'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN CLUSTERS
  // ═══════════════════════════════════════════════════════════════════════════

  for (var key in domains) {
    if (!domains.hasOwnProperty(key)) continue;

    if (domains[key] >= 4) {
      seeds.push(makeSeed(
        'Heavy ' + key.toLowerCase() + ' activity this cycle. Pattern worth investigating.',
        key, '', 3, 'domain'
      ));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVE ARCS
  // ═══════════════════════════════════════════════════════════════════════════

  var peakArcs = [];
  var risingArcs = [];
  for (var ai = 0; ai < arcs.length; ai++) {
    var a = arcs[ai];
    if (a && a.phase === 'peak') peakArcs.push(a);
    if (a && a.phase === 'rising') risingArcs.push(a);
  }
  if (peakArcs.length > 0) {
    seeds.push(makeSeed(
      peakArcs.length + ' story arc(s) at peak tension. Climax moments developing.',
      'GENERAL', '', 3, 'arc'
    ));
  }

  if (risingArcs.length >= 2) {
    seeds.push(makeSeed(
      "Multiple arcs building simultaneously. Overlapping pressures.",
      'GENERAL', '', 2, 'arc'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NAMED CITIZEN SPOTLIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  if (spotlights.length >= 3) {
    seeds.push(makeSeed(
      spotlights.length + ' notable figures drawing attention this cycle. Profile opportunities.',
      'COMMUNITY', '', 2, 'spotlight'
    ));
  }

  for (var spi = 0; spi < spotlights.length; spi++) {
    var sp = spotlights[spi];
    if (sp.score >= 8) {
      seeds.push(makeSeed(
        'High-profile spotlight: POPID ' + sp.popId + '. Deep interest warranted.',
        'COMMUNITY', '', 3, 'spotlight'
      ));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL SEEDS
  // ═══════════════════════════════════════════════════════════════════════════

  for (var sei = 0; sei < seasonal.length; sei++) {
    var seed = seasonal[sei];
    if (typeof seed === 'string') {
      seeds.push(makeSeed(seed, 'GENERAL', '', 1, 'seasonal'));
    } else if (seed && seed.text) {
      seeds.push(makeSeed(seed.text, seed.domain || 'GENERAL', '', 1, 'seasonal'));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL CLEAN-UP
  // ═══════════════════════════════════════════════════════════════════════════

  // Deduplicate by text (ES5 compatible)
  var seen = {};
  var deduped = [];
  for (var di = 0; di < seeds.length; di++) {
    var s = seeds[di];
    if (!seen[s.text]) {
      seen[s.text] = true;
      deduped.push(s);
    }
  }

  // Sort by priority descending
  deduped.sort(function(a, b) { return b.priority - a.priority; });

  S.storySeeds = deduped;
  ctx.summary = S;
}


/**
 * ============================================================================
 * STORY SEEDS ENGINE REFERENCE
 * ============================================================================
 * 
 * SEED TYPES:
 * - pattern, shock, weight, civic, demographic
 * - event, cluster, weather, sentiment, economy
 * - nightlife, traffic, publicspace, retail
 * - health, domain, arc, spotlight, seasonal
 * - holiday, firstfriday, creationday, sports (v3.2)
 * - cultural, engagement (v3.2)
 * 
 * HOLIDAY SEEDS (v3.2):
 * - 17 holidays with specific seed pools
 * - Major: Thanksgiving, Holiday, NewYear, NewYearsEve, Independence
 * - Cultural: MLKDay, Juneteenth, CincoDeMayo, DiaDeMuertos, LunarNewYear
 * - Oakland: OpeningDay, OaklandPride, ArtSoulFestival
 * - Minor: Valentine, Halloween, Easter, MemorialDay, LaborDay, VeteransDay
 * 
 * FIRST FRIDAY SEEDS:
 * - Arts district transformation
 * - Art walk crowds
 * - Artist spotlights
 * - Cultural surge (if high cultural activity)
 * 
 * CREATION DAY SEEDS:
 * - Oakland founding honor
 * - Community reflection
 * - Long-time resident stories
 * 
 * SPORTS SEASON SEEDS:
 * - Championship: fever, economic boost, fan stories
 * - Playoffs: tension, watch parties
 * - Late-season: pennant race
 * 
 * CULTURAL ACTIVITY SEEDS:
 * - High (≥1.5): Peak cultural vibrancy
 * - Medium (≥1.3): Strong cultural energy
 * - Low (≤0.7): Cultural subdued
 * 
 * COMMUNITY ENGAGEMENT SEEDS:
 * - High (≥1.5): Engagement surging
 * - Medium (≥1.3): Strong community bonds
 * - Low (≤0.6): Community withdrawal
 * 
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 * 
 * SEED STRUCTURE:
 * {
 *   seedId: string (8 char UUID),
 *   text: string,
 *   domain: string,
 *   neighborhood: string,
 *   priority: number (1-3),
 *   seedType: string,
 *   cycle: number,
 *   calendarContext: {
 *     holiday, isFirstFriday, isCreationDay, sportsSeason
 *   }
 * }
 * 
 * ============================================================================
 */