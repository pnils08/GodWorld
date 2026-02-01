/**
 * ============================================================================
 * V3.7 STORY SEEDS ENGINE — CITIZEN MATCHING + TRAITPROFILE INTEGRATION
 * ============================================================================
 *
 * Produces newsroom-ready narrative seeds with GodWorld Calendar integration.
 *
 * v3.7 Enhancements:
 * - Citizen matching: suggests interview candidates per seed
 * - TraitProfile consumption: archetypes inform interview suggestions
 * - Domain-to-archetype mapping: CIVIC→Anchor, BUSINESS→Striver, etc.
 * - Neighborhood filtering: candidates from seed's target neighborhood
 * - Tone-aware suggestions: matches citizen tone to story mood
 *
 * v3.6 Enhancements:
 * - QoL civic texture seeds from crimeMetrics v1.2 qualityOfLifeIndex
 * - Reporting gap seeds (underreporting angles)
 * - Neighborhood-level QoL targeting via clusterDefinitions
 * - Patrol strategy awareness for enforcement story angles
 *
 * v3.5 Features (retained):
 * - renderStorySeedsForUI_() for headline/lede/angle format
 * - Outputs ready for mediaRoomBriefingGenerator or Press_Drafts
 *
 * v3.4 Features (retained):
 * - Sports generalization (no hardcoded team references)
 * - Generic sports phases: finals, postseason, late-season, in-season, preseason, off-season
 * - Manual input system via ctx.config.manualStoryInputs
 * - Extra seeds injection via manual.extraSeeds[]
 *
 * v3.3 Features retained:
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
 * - Cultural activity and community engagement seeds
 * - Expanded Oakland neighborhoods (12)
 *
 * Manual input format (optional):
 * {
 *   sportLabel: "your sport/league/scene",   // e.g., "ranked season", "playoffs"
 *   sportVenue: "place",                     // e.g., "Downtown", "Jack London"
 *   sportStakes: "what's on the line",       // e.g., "promotion", "championship"
 *   extraSeeds: [                            // optional extra seeds
 *     { text:"...", domain:"...", nh:"...", priority:3, seedType:"manual" }
 *   ]
 * }
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
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

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
  // CRIME METRICS CONTEXT (v3.6)
  // ═══════════════════════════════════════════════════════════════════════════
  var crimeMetrics = S.crimeMetrics || {};
  var qualityOfLifeIndex = crimeMetrics.qualityOfLifeIndex || 0.5;
  var reportedIncidentCount = crimeMetrics.reportedIncidentCount || 0;
  var trueIncidentCount = crimeMetrics.trueIncidentCount || 0;
  var reportingRatio = (trueIncidentCount > 0) ? (reportedIncidentCount / trueIncidentCount) : 1;
  var patrolStrategy = crimeMetrics.patrolStrategy || 'balanced';
  var enforcementCapacity = crimeMetrics.enforcementCapacity || 1.0;
  var crimeHotspots = crimeMetrics.hotspots || [];
  var neighborhoodCrime = crimeMetrics.neighborhoodBreakdown || {};

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
  // v3.4: MANUAL INPUT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  var manual = (ctx.config && ctx.config.manualStoryInputs) || S.manualStoryInputs || {};
  var manualSportLabel = manual.sportLabel || '';
  var manualSportVenue = manual.sportVenue || '';
  var manualSportStakes = manual.sportStakes || '';
  var manualExtraSeeds = manual.extraSeeds || [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEED BUILDER
  // ═══════════════════════════════════════════════════════════════════════════
  function makeSeed(text, domain, neighborhood, priority, seedType, suggestedCitizens) {
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
      },
      // v3.7: Suggested interview candidates
      suggestedCitizens: suggestedCitizens || []
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.7: CITIZEN MATCHING HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Domain to preferred archetype mapping
   */
  var DOMAIN_ARCHETYPES = {
    'CIVIC': ['Anchor', 'Connector'],
    'COMMUNITY': ['Connector', 'Caretaker', 'Anchor'],
    'BUSINESS': ['Striver', 'Connector'],
    'CULTURE': ['Catalyst', 'Watcher', 'Connector'],
    'HEALTH': ['Caretaker', 'Watcher'],
    'SAFETY': ['Anchor', 'Watcher'],
    'EDUCATION': ['Caretaker', 'Striver'],
    'SPORTS': ['Connector', 'Striver'],
    'NIGHTLIFE': ['Catalyst', 'Connector'],
    'GENERAL': ['Watcher', 'Anchor']
  };

  /**
   * Get citizens matching domain and neighborhood for interview suggestions
   */
  function getCitizenCandidates_(domain, neighborhood, limit) {
    limit = limit || 3;
    var candidates = [];
    var preferredArchetypes = DOMAIN_ARCHETYPES[domain] || ['Connector', 'Anchor'];

    // Access citizenLookup from context if available
    var lookup = ctx.citizenLookup || {};
    var popIds = Object.keys(lookup);

    for (var i = 0; i < popIds.length && candidates.length < limit * 2; i++) {
      var popId = popIds[i];
      var citizen = lookup[popId];
      if (!citizen) continue;

      // Skip if wrong neighborhood (when specified)
      if (neighborhood && citizen.Neighborhood && citizen.Neighborhood !== neighborhood) continue;

      // Parse TraitProfile for archetype
      var archetype = 'Drifter';
      var tone = 'plain';
      if (citizen.TraitProfile) {
        var parts = String(citizen.TraitProfile).split('|');
        for (var pi = 0; pi < parts.length; pi++) {
          var part = parts[pi];
          if (part.indexOf('Archetype:') === 0) archetype = part.substring(10);
        }
        // Derive tone from traits
        for (var ti = 0; ti < parts.length; ti++) {
          var tp = parts[ti];
          if (tp.indexOf('reflective:') === 0 && parseFloat(tp.substring(11)) >= 0.6) tone = 'noir';
          if (tp.indexOf('social:') === 0 && parseFloat(tp.substring(7)) >= 0.6) tone = 'bright';
          if (tp.indexOf('volatile:') === 0 && parseFloat(tp.substring(9)) >= 0.6) tone = 'tense';
        }
      }

      // Score by archetype match
      var score = 0;
      for (var ai = 0; ai < preferredArchetypes.length; ai++) {
        if (archetype === preferredArchetypes[ai]) {
          score = preferredArchetypes.length - ai; // Higher for earlier matches
          break;
        }
      }

      // Boost Tier 4 citizens (more developed)
      if (citizen.Tier >= 4) score += 1;

      // Only include if some match
      if (score > 0 || archetype !== 'Drifter') {
        var name = ((citizen.First || '') + ' ' + (citizen.Last || '')).trim() || popId;
        candidates.push({
          popId: popId,
          name: name,
          archetype: archetype,
          neighborhood: citizen.Neighborhood || '',
          occupation: citizen.Occupation || '',
          tone: tone,
          score: score
        });
      }
    }

    // Sort by score descending
    candidates.sort(function(a, b) { return b.score - a.score; });

    // Return top candidates formatted
    var result = [];
    for (var ri = 0; ri < Math.min(limit, candidates.length); ri++) {
      var c = candidates[ri];
      result.push(c.name + ' (' + c.archetype + ')');
    }
    return result;
  }

  /**
   * Make seed with auto-suggested citizens
   */
  function makeSeedWithCitizens_(text, domain, neighborhood, priority, seedType) {
    var citizens = getCitizenCandidates_(domain, neighborhood, 2);
    return makeSeed(text, domain, neighborhood, priority, seedType, citizens);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.4: SPORTS PHASE NORMALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  function getSportsPhase_(sportsSeasonRaw) {
    var s = String(sportsSeasonRaw || '').toLowerCase();
    if (s === 'championship' || s === 'finals') return 'finals';
    if (s === 'playoffs' || s === 'post-season' || s === 'postseason') return 'postseason';
    if (s === 'late-season') return 'late-season';
    if (s === 'preseason') return 'preseason';
    if (s === 'in-season' || s === 'regular-season') return 'in-season';
    if (s === 'off-season' || s === 'offseason') return 'off-season';
    return 'off-season';
  }

  // v3.4: Generic sports text builder
  function buildSportsText_(phase) {
    var label = manualSportLabel ? (' (' + manualSportLabel + ')') : '';
    var venue = manualSportVenue ? (' near ' + manualSportVenue) : '';
    var stakes = manualSportStakes ? (' ' + manualSportStakes + ' on the line.') : '';

    if (phase === 'finals') {
      return "Championship fever grips the city" + label + venue + "." + stakes + " Community united behind the team.";
    }
    if (phase === 'postseason') {
      return "Playoff tension ripples through neighborhoods" + label + venue + "." + stakes + " Hope and anxiety.";
    }
    if (phase === 'late-season') {
      return "Late-season push intensifies" + label + venue + "." + stakes + " Every game matters now.";
    }
    if (phase === 'in-season') {
      return "Regular season routines shape community rhythms" + label + venue + ". Sports stories emerging.";
    }
    if (phase === 'preseason') {
      return "Preseason optimism fills the air" + label + venue + ". New faces, fresh narratives.";
    }
    return "Off-season activity continues quietly" + label + venue + ". Behind-the-scenes developments.";
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
        { text: "Dia de los Muertos altars honor ancestors. Fruitvale's beautiful tradition.", domain: "CULTURE", nh: "Fruitvale", priority: 3 },
        { text: "Community remembers those who came before. Stories of loss and love.", domain: "COMMUNITY", nh: "Fruitvale", priority: 2 }
      ]
    },
    "LunarNewYear": {
      seeds: [
        { text: "Lunar New Year celebrations transform Chinatown. Cultural renewal.", domain: "CULTURE", nh: "Chinatown", priority: 3 },
        { text: "Red lanterns and lion dances mark the new year. Tradition meets modernity.", domain: "COMMUNITY", nh: "Chinatown", priority: 2 }
      ]
    },

    // Oakland-specific holidays (v3.4: Generalized sports references)
    "OpeningDay": {
      seeds: [
        { text: "Opening Day brings sports fever to Oakland. Season begins with optimism.", domain: "SPORTS", nh: "Jack London", priority: 3 },
        { text: "Fans flood the waterfront district. Economic and emotional energy.", domain: "BUSINESS", nh: "Jack London", priority: 2 },
        { text: "Faithful gather for another season. Hope springs eternal.", domain: "SPORTS", nh: "Jack London", priority: 2 }
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
  // SPORTS SEASON SEEDS (v3.4: Generalized phases)
  // ═══════════════════════════════════════════════════════════════════════════

  var sportsPhase = getSportsPhase_(sportsSeason);
  var sportsVenue = manualSportVenue || 'Jack London';

  if (sportsPhase === 'finals') {
    seeds.push(makeSeed(
      buildSportsText_('finals'),
      'SPORTS', sportsVenue, 3, 'sports'
    ));
    seeds.push(makeSeed(
      "Business booming in sports district. Economic championship story.",
      'BUSINESS', sportsVenue, 2, 'sports'
    ));
    seeds.push(makeSeed(
      "Fan stories capture the championship moment. Personal stakes.",
      'COMMUNITY', '', 2, 'sports'
    ));
  } else if (sportsPhase === 'postseason') {
    seeds.push(makeSeed(
      buildSportsText_('postseason'),
      'SPORTS', sportsVenue, 2, 'sports'
    ));
    seeds.push(makeSeed(
      "Sports bars and watch parties gather the faithful. Community viewing.",
      'NIGHTLIFE', 'Downtown', 2, 'sports'
    ));
  } else if (sportsPhase === 'late-season') {
    seeds.push(makeSeed(
      buildSportsText_('late-season'),
      'SPORTS', '', 2, 'sports'
    ));
  } else if (sportsPhase === 'in-season') {
    seeds.push(makeSeed(
      buildSportsText_('in-season'),
      'SPORTS', sportsVenue, 1, 'sports'
    ));
  } else if (sportsPhase === 'preseason') {
    seeds.push(makeSeed(
      buildSportsText_('preseason'),
      'SPORTS', sportsVenue, 1, 'sports'
    ));
  }
  // off-season: no automatic seed (quiet)

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
    seeds.push(makeSeedWithCitizens_(
      "Community engagement surging. Neighbors connecting like never before.",
      'COMMUNITY', '', 3, 'engagement'
    ));
  } else if (communityEngagement >= 1.3) {
    seeds.push(makeSeedWithCitizens_(
      "Strong community bonds shaping neighborhood life. Connection stories.",
      'COMMUNITY', 'Temescal', 2, 'engagement'
    ));
  } else if (communityEngagement <= 0.6) {
    seeds.push(makeSeedWithCitizens_(
      "Community withdrawal noted. Neighbors pulling back. Why?",
      'COMMUNITY', '', 2, 'engagement'
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QOL CIVIC TEXTURE SEEDS (v3.6)
  // ═══════════════════════════════════════════════════════════════════════════

  // Low quality of life → civic texture beats (v3.7: with citizen suggestions)
  if (qualityOfLifeIndex <= 0.35) {
    seeds.push(makeSeedWithCitizens_(
      "Quality of life concerns mounting across neighborhoods. Noise, nuisance, and disorder shaping daily experience.",
      'CIVIC', '', 3, 'qol'
    ));
    seeds.push(makeSeedWithCitizens_(
      "Residents voice frustration over persistent quality-of-life issues. What's the tipping point?",
      'COMMUNITY', '', 2, 'qol'
    ));
  } else if (qualityOfLifeIndex <= 0.45) {
    seeds.push(makeSeedWithCitizens_(
      "Quality of life strain noted in pockets of the city. Minor but persistent irritants.",
      'CIVIC', '', 2, 'qol'
    ));
  } else if (qualityOfLifeIndex >= 0.75) {
    seeds.push(makeSeedWithCitizens_(
      "Neighborhood quality of life trending upward. Clean streets, quiet nights.",
      'COMMUNITY', '', 2, 'qol'
    ));
  } else if (qualityOfLifeIndex >= 0.65) {
    seeds.push(makeSeed(
      "Positive signs in neighborhood livability. Small wins adding up.",
      'COMMUNITY', '', 1, 'qol'
    ));
  }

  // Reporting gap seeds — underreporting angle
  if (reportingRatio < 0.5 && trueIncidentCount > 10) {
    seeds.push(makeSeed(
      "Significant gap between reported and actual incidents. Why aren't residents calling it in?",
      'CIVIC', '', 3, 'qol'
    ));
  } else if (reportingRatio < 0.65 && trueIncidentCount > 5) {
    seeds.push(makeSeed(
      "Underreporting pattern detected. Trust or fatigue? Community voices needed.",
      'CIVIC', '', 2, 'qol'
    ));
  }

  // Enforcement capacity seeds
  if (enforcementCapacity < 0.6) {
    seeds.push(makeSeed(
      "Enforcement resources stretched thin. Response times and coverage suffering.",
      'SAFETY', '', 2, 'qol'
    ));
  } else if (enforcementCapacity > 1.3) {
    seeds.push(makeSeed(
      "Heightened enforcement presence noted. Proactive patrols visible.",
      'SAFETY', '', 1, 'qol'
    ));
  }

  // Patrol strategy flavor
  if (patrolStrategy === 'suppress_hotspots' && crimeHotspots.length > 0) {
    seeds.push(makeSeed(
      "Hotspot suppression strategy concentrates resources in " + String(crimeHotspots.length) + " zones. Displacement concerns?",
      'SAFETY', '', 2, 'qol'
    ));
  } else if (patrolStrategy === 'community_presence') {
    seeds.push(makeSeed(
      "Community-presence policing emphasizes visibility over response. Building trust or spreading thin?",
      'SAFETY', '', 2, 'qol'
    ));
  }

  // Neighborhood-specific QoL hotspots (v3.7: with citizen suggestions from target neighborhood)
  for (var nhKey in neighborhoodCrime) {
    if (!neighborhoodCrime.hasOwnProperty(nhKey)) continue;
    var nhData = neighborhoodCrime[nhKey];
    var nhQol = nhData.qualityOfLifeIndex || 0.5;
    if (nhQol <= 0.3) {
      seeds.push(makeSeedWithCitizens_(
        "Quality of life crisis in " + nhKey + ". Noise, disorder, and frustration peak.",
        'CIVIC', nhKey, 3, 'qol'
      ));
    } else if (nhQol >= 0.8) {
      seeds.push(makeSeedWithCitizens_(
        nhKey + " emerges as quality-of-life bright spot. What's working there?",
        'COMMUNITY', nhKey, 2, 'qol'
      ));
    }
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
      'High-signal cycle: ' + (weightReason || 'Multiple triggers firing.'),
      'GENERAL', '', 3, 'weight'
    ));
  }

  if (weight === 'medium-signal') {
    seeds.push(makeSeed(
      'Moderate world movement: ' + (weightReason || 'Activity above baseline.'),
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
      'Severe ' + (weather.type || 'weather') + ' generating shifts in resident behavior. City adapting.',
      'WEATHER', '', 3, 'weather'
    ));
  } else if (weather.impact >= 1.3) {
    seeds.push(makeSeed(
      (weather.type || 'Weather') + ' conditions impacting local routines. Street-level stories.',
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
        'Heavy ' + String(key).toLowerCase() + ' activity this cycle. Pattern worth investigating.',
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
      String(peakArcs.length) + ' story arc(s) at peak tension. Climax moments developing.',
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
      String(spotlights.length) + ' notable figures drawing attention this cycle. Profile opportunities.',
      'COMMUNITY', '', 2, 'spotlight'
    ));
  }

  for (var spi = 0; spi < spotlights.length; spi++) {
    var sp = spotlights[spi];
    if (sp && sp.score >= 8) {
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
      seeds.push(makeSeed(seed.text, seed.domain || 'GENERAL', seed.nh || '', seed.priority || 1, seed.seedType || 'seasonal'));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.4: MANUAL EXTRA SEEDS
  // ═══════════════════════════════════════════════════════════════════════════

  for (var mi = 0; mi < manualExtraSeeds.length; mi++) {
    var m = manualExtraSeeds[mi];
    if (m && m.text) {
      seeds.push(makeSeed(m.text, m.domain || 'GENERAL', m.nh || '', m.priority || 2, m.seedType || 'manual'));
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
 * renderStorySeedsForUI_ v1.0 — HEADLINE + LEDE + ANGLE FORMAT
 * ============================================================================
 *
 * Converts story seeds into newsroom-ready format:
 * - Headline: Short punchy title
 * - Lede: Opening sentence/hook
 * - Angle: Editorial direction hint
 *
 * Call AFTER applyStorySeeds_() so ctx.summary.storySeeds is populated.
 *
 * Outputs:
 * - ctx.summary.storySeedsUI (array of formatted objects)
 * - Returns top N seeds (default 5) in UI format
 *
 * ============================================================================
 */
function renderStorySeedsForUI_(ctx, maxSeeds) {
  if (!ctx || !ctx.summary || !ctx.summary.storySeeds) return [];

  var seeds = ctx.summary.storySeeds;
  var limit = maxSeeds || 5;
  var output = [];

  for (var i = 0; i < seeds.length && i < limit; i++) {
    var seed = seeds[i];

    // Generate headline from seed text (first clause or truncated)
    var headline = generateHeadline_(seed.text, seed.domain);

    // Lede is the full seed text
    var lede = seed.text;

    // Angle based on seedType and priority
    var angle = generateAngle_(seed);

    output.push({
      seedId: seed.seedId,
      headline: headline,
      lede: lede,
      angle: angle,
      domain: seed.domain,
      neighborhood: seed.neighborhood,
      priority: seed.priority,
      seedType: seed.seedType
    });
  }

  ctx.summary.storySeedsUI = output;
  return output;
}

/**
 * Generate a punchy headline from seed text
 */
function generateHeadline_(text, domain) {
  if (!text) return 'Story Developing';

  // If text has a period, take first sentence
  var firstSentence = text.split('.')[0];

  // Truncate if too long (max 60 chars for headline)
  if (firstSentence.length > 60) {
    // Find a natural break point
    var truncated = firstSentence.substring(0, 57);
    var lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 40) {
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  }

  return firstSentence;
}

/**
 * Generate editorial angle hint based on seed metadata
 */
function generateAngle_(seed) {
  var type = seed.seedType || 'signal';
  var priority = seed.priority || 1;
  var domain = seed.domain || 'GENERAL';
  var nh = seed.neighborhood || '';

  var angles = [];

  // Priority-based angles
  if (priority >= 3) {
    angles.push('LEAD STORY');
  } else if (priority === 2) {
    angles.push('FEATURE');
  } else {
    angles.push('BRIEF');
  }

  // Type-based angles
  if (type === 'shock') {
    angles.push('BREAKING');
  } else if (type === 'pattern') {
    angles.push('TREND PIECE');
  } else if (type === 'arc') {
    angles.push('ONGOING');
  } else if (type === 'spotlight') {
    angles.push('PROFILE');
  } else if (type === 'holiday' || type === 'firstfriday' || type === 'creationday') {
    angles.push('CALENDAR');
  } else if (type === 'sports') {
    angles.push('SPORTS DESK');
  } else if (type === 'health') {
    angles.push('HEALTH BEAT');
  } else if (type === 'qol') {
    angles.push('CIVIC TEXTURE');
  }

  // Domain desk assignment
  if (domain === 'CIVIC' || domain === 'SAFETY') {
    angles.push('CITY DESK');
  } else if (domain === 'BUSINESS') {
    angles.push('BUSINESS DESK');
  } else if (domain === 'CULTURE' || domain === 'COMMUNITY') {
    angles.push('LIFESTYLE');
  } else if (domain === 'SPORTS') {
    angles.push('SPORTS DESK');
  }

  // Neighborhood localization
  if (nh) {
    angles.push(nh.toUpperCase() + ' FOCUS');
  }

  return angles.join(' | ');
}


/**
 * ============================================================================
 * STORY SEEDS ENGINE REFERENCE v3.6
 * ============================================================================
 *
 * v3.6 CHANGES:
 * - QoL civic texture seeds from crimeMetrics v1.2 qualityOfLifeIndex
 * - Reporting gap seeds when reportedIncidentCount / trueIncidentCount < threshold
 * - Enforcement capacity seeds (stretched thin / heightened presence)
 * - Patrol strategy flavor seeds (suppress_hotspots / community_presence)
 * - Neighborhood-level QoL targeting via crimeMetrics.neighborhoodBreakdown
 * - New seedType: 'qol' with CIVIC TEXTURE angle
 *
 * CRIME METRICS INPUT (v3.6):
 * ctx.summary.crimeMetrics = {
 *   qualityOfLifeIndex: 0.0-1.0,         // Low = noise/nuisance issues, High = quality
 *   reportedIncidentCount: number,       // What gets called in
 *   trueIncidentCount: number,           // Estimated true count
 *   patrolStrategy: string,              // 'suppress_hotspots' | 'community_presence' | 'balanced'
 *   enforcementCapacity: number,         // 1.0 = normal, <0.6 = stretched, >1.3 = surplus
 *   hotspots: string[],                  // Neighborhood names with elevated activity
 *   neighborhoodBreakdown: {             // Per-neighborhood crime data
 *     "Fruitvale": { qualityOfLifeIndex: 0.4, ... },
 *     ...
 *   }
 * }
 *
 * v3.5 CHANGES:
 * - Added renderStorySeedsForUI_() for headline/lede/angle format
 * - Output feeds mediaRoomBriefingGenerator or Press_Drafts
 *
 * v3.4 CHANGES:
 * - Sports generalization: No hardcoded team references
 * - Generic phases: finals, postseason, late-season, in-season, preseason, off-season
 * - Manual input: ctx.config.manualStoryInputs
 * - Extra seeds: manual.extraSeeds[] injection
 *
 * RENDER FORMAT (v3.5):
 * renderStorySeedsForUI_(ctx, 5) returns:
 * [
 *   {
 *     seedId: "abc12345",
 *     headline: "Championship fever grips the city",
 *     lede: "Championship fever grips the city near Jack London. Championship on the line. Community united behind the team.",
 *     angle: "LEAD STORY | SPORTS DESK | JACK LONDON FOCUS",
 *     domain: "SPORTS",
 *     neighborhood: "Jack London",
 *     priority: 3,
 *     seedType: "sports"
 *   },
 *   ...
 * ]
 *
 * MANUAL INPUT FORMAT:
 * ctx.config.manualStoryInputs = {
 *   sportLabel: "NBA playoffs",        // optional
 *   sportVenue: "Downtown",            // optional
 *   sportStakes: "Championship",       // optional
 *   extraSeeds: [                      // optional
 *     { text: "...", domain: "...", nh: "...", priority: 2, seedType: "manual" }
 *   ]
 * }
 *
 * SEED TYPES:
 * - pattern, shock, weight, civic, demographic
 * - event, cluster, weather, sentiment, economy
 * - nightlife, traffic, publicspace, retail
 * - health, domain, arc, spotlight, seasonal
 * - holiday, firstfriday, creationday, sports
 * - cultural, engagement
 * - manual (v3.4)
 * - qol (v3.6) — quality-of-life civic texture seeds
 *
 * SPORTS PHASES (v3.4):
 * - finals/championship -> priority 3
 * - postseason/playoffs -> priority 2
 * - late-season -> priority 2
 * - in-season -> priority 1
 * - preseason -> priority 1
 * - off-season -> no automatic seed
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
