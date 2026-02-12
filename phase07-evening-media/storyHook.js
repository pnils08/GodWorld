/**
 * ============================================================================
 * storyHookEngine_ v4.0 — SPORTS FEED TRIGGER HOOKS
 * ============================================================================
 *
 * v4.0 Enhancements:
 * - JOURNALISM AI: Added signalChain tracking to story hooks
 *   for "Behind the Curtain" subscriber transparency
 *
 * v3.9 Enhancements:
 * - Sports Feed trigger hooks: 9 trigger types generate team-specific story hooks
 * - Reads sportsEventTriggers from Phase 2 applySportsFeedTriggers_()
 *
 * v3.8 Enhancements:
 * - Theme-aware journalist matching via suggestStoryAngle_()
 * - New hook fields: themes, suggestedJournalist, suggestedAngle, voiceGuidance, matchConfidence
 * - mapHookTypeToSignal_() helper for signal-based fallback
 * - Integration with rosterLookup.js v2.1 theme functions
 *
 * v3.7 Enhancements:
 * - Initiative outcome hooks: passed/failed initiatives generate story hooks
 * - Swing voter drama: close votes with named swing voters get priority hooks
 * - Ripple effect hooks: new ripples get early observation angles
 * - Housing/stabilization initiatives get priority 3 hooks
 * - Vote margin analysis for political drama angles
 *
 * v3.6 Enhancements:
 * - Storyline Tracker integration: reads active/dormant storylines
 * - Storyline hooks: generates hooks from storylines needing attention
 * - Dormant revival hooks: suggests revisiting storylines not mentioned in 5+ cycles
 * - Wrap-up hooks: flags storylines with resolved linked arcs
 * - Priority boost: storylines with 'high' priority get hook priority 3
 * - Neighborhood correlation: matches storyline neighborhoods to existing hooks
 * - RelatedCitizens consumption for interview angle suggestions
 *
 * v3.5 Enhancements:
 * - Citizen bond awareness: rivalries and alliances generate story hooks
 * - TraitProfile tone matching: noir/tense citizens get investigative angles
 * - Archetype-driven suggestions: Watchers for observation, Catalysts for conflict
 * - Relationship-based story angles: tensions, alliances, networks
 *
 * v3.4 Enhancements:
 * - Integrated Tier 4 Neighborhood Demographics for story signals
 * - Population shifts generate community/housing angles
 * - Senior demographic changes → health/aging stories
 * - Student population shifts → education angles
 * - Unemployment changes → economic impact stories
 * - Illness rate spikes → public health investigation hooks
 * - Aggregate demographic shifts trigger city-wide story angles
 *
 * v3.3 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx/summary
 * - for loops instead of for...of
 * - Template literals converted to string concatenation
 *
 * Builds story hooks from:
 * - Active arcs (phase-aware)
 * - Domain accumulation
 * - Weather severity
 * - Sentiment shifts
 * - World events
 * - Pattern flags
 * - Holidays (cycle-based per GodWorld Calendar v1.0)
 * - First Friday events
 * - Creation Day
 * - Cultural and Oakland-specific events
 * - Sports seasons
 *
 * Provides actionable prompts for journalists.
 * No sheet writes — pure functional logic.
 *
 * ============================================================================
 */

function storyHookEngine_(ctx) {
  // Defensive guard
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};

  var hooks = [];
  var S = ctx.summary;
  var arcs = S.eventArcs || [];
  var domains = S.domainPresence || {};
  var weather = S.weather || {};
  var weatherMood = S.weatherMood || {};
  var dynamics = S.cityDynamics || {};
  var worldEvents = S.worldEvents || [];
  var cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;
  var cycleOfYear = S.cycleOfYear || 1;
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var holidayNeighborhood = S.holidayNeighborhood || null;
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var creationDayAnniversary = S.creationDayAnniversary;
  var sportsSeason = S.sportsSeason || "off-season";
  var season = S.season || "Spring";

  // ═══════════════════════════════════════════════════════════
  // DESK MAPPING BY DOMAIN
  // ═══════════════════════════════════════════════════════════
  var deskMap = {
    'HEALTH': 'Health Desk',
    'CIVIC': 'Civic Desk',
    'INFRASTRUCTURE': 'Civic Desk',
    'SAFETY': 'Civic Desk',
    'WEATHER': 'Civic Desk',
    'SPORTS': 'Sports Desk',
    'BUSINESS': 'Business Desk',
    'EDUCATION': 'Education Desk',
    'CULTURE': 'Culture Desk',
    'COMMUNITY': 'Community Desk',
    'NIGHTLIFE': 'Culture Desk',
    'ENVIRONMENT': 'Civic Desk',
    'GENERAL': 'City Desk',
    'HOLIDAY': 'Features Desk',
    'CULTURAL': 'Culture Desk',
    'OAKLAND': 'Community Desk'
  };

  function getDesks(domain) {
    return deskMap[domain] || 'City Desk';
  }

  // ═══════════════════════════════════════════════════════════
  // v3.8: THEME-AWARE JOURNALIST MATCHING HELPERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Map hookType to signal type for journalist lookup fallback.
   */
  function mapHookTypeToSignal_(hookType, domain) {
    var hookToSignal = {
      'arc': 'crisis',
      'cluster': 'shock_event',
      'signal': null,
      'holiday': 'human_interest',
      'firstfriday': 'arts',
      'creationday': 'civic',
      'sports': 'sports',
      'weather': 'weather',
      'sentiment': 'civic_opinion',
      'cultural': 'arts',
      'community': 'community',
      'pattern': 'civic',
      'shock': 'shock_event',
      'event': null,
      'demographic': 'community',
      'nightlife': 'lifestyle',
      'seasonal': 'human_interest',
      'relationship': 'community',
      'archetype': 'human_interest',
      'storyline-dormant': 'human_interest',
      'storyline-priority': 'civic',
      'storyline-mystery': 'shock_event',
      'initiative-passed': 'civic',
      'initiative-failed': 'civic',
      'initiative-swing': 'civic_opinion',
      'initiative-ripple': 'civic'
    };

    var signal = hookToSignal[hookType];
    if (signal) return signal;

    // Fall back to domain-based signal
    var domainSignals = {
      'HEALTH': 'health_arc',
      'CIVIC': 'civic',
      'SPORTS': 'sports',
      'SAFETY': 'crime',
      'CULTURE': 'arts',
      'BUSINESS': 'business',
      'INFRASTRUCTURE': 'transit',
      'COMMUNITY': 'community'
    };

    return domainSignals[domain] || 'human_interest';
  }

  // ═══════════════════════════════════════════════════════════
  // HOOK BUILDER (v3.8: Theme-aware journalist matching)
  // ═══════════════════════════════════════════════════════════
  function makeHook(domain, neighborhood, priority, text, linkedArcId, hookType) {
    var normalDomain = domain || 'GENERAL';
    var normalHookType = hookType || 'signal';

    // v3.8: Determine themes for this hook
    var themes = [];
    if (typeof getThemeKeywordsForDomain_ === 'function') {
      themes = getThemeKeywordsForDomain_(normalDomain, normalHookType);
    }

    // v3.8: Suggest journalist based on themes
    var suggestion = null;
    if (typeof suggestStoryAngle_ === 'function') {
      var signalType = mapHookTypeToSignal_(normalHookType, normalDomain);
      suggestion = suggestStoryAngle_(themes, signalType);
    }

    return {
      hookId: Utilities.getUuid().slice(0, 8),
      domain: normalDomain,
      neighborhood: neighborhood || '',
      priority: priority || 1,
      text: text || '',
      linkedArcId: linkedArcId || null,
      hookType: normalHookType,
      suggestedDesks: getDesks(normalDomain),
      cycle: cycle,
      cycleOfYear: cycleOfYear,
      // v3.8 additions:
      themes: themes,
      suggestedJournalist: suggestion ? suggestion.journalist : null,
      suggestedAngle: suggestion ? suggestion.angle : null,
      voiceGuidance: suggestion ? suggestion.voiceGuidance : null,
      matchConfidence: suggestion ? suggestion.confidence : 'none',
      // v4.0: Signal chain tracking
      signalChain: [{
        agent: 'Story Editor',
        engine: 'storyHookEngine_',
        detected: normalHookType,
        value: priority,
        context: text.slice(0, 50),
        timestamp: 'Phase7'
      }]
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ARC-BASED HOOKS (phase-aware)
  // ═══════════════════════════════════════════════════════════
  for (var ai = 0; ai < arcs.length; ai++) {
    var a = arcs[ai];
    if (!a || !a.type || a.phase === 'resolved') continue;

    var priority = 1;
    var hookText = '';

    if (a.phase === 'early') {
      priority = 1;
      hookText = 'Early signals in ' + (a.neighborhood || 'the city') + ': ' + (a.summary || 'Something is building.');
    } else if (a.phase === 'rising') {
      priority = 2;
      hookText = 'Rising tension in ' + (a.neighborhood || 'the city') + ': ' + (a.summary || 'Situation developing.') + ' Worth watching.';
    } else if (a.phase === 'peak') {
      priority = 3;
      hookText = 'PEAK: ' + (a.neighborhood || 'City') + ' facing acute pressure. ' + (a.summary || 'This is the moment.') + ' Immediate attention recommended.';
    } else if (a.phase === 'decline') {
      priority = 2;
      hookText = 'Cooling down in ' + (a.neighborhood || 'the city') + ': ' + (a.summary || 'Tension easing.') + ' Follow-up angle available.';
    }

    if (hookText) {
      hooks.push(makeHook(a.domainTag, a.neighborhood, priority, hookText, a.arcId, 'arc'));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DOMAIN ACCUMULATION HOOKS
  // ═══════════════════════════════════════════════════════════
  for (var key in domains) {
    if (!domains.hasOwnProperty(key)) continue;

    if (domains[key] >= 4) {
      hooks.push(makeHook(
        key,
        '',
        3,
        'Heavy ' + key.toLowerCase() + ' activity this cycle. Multiple incidents creating a pattern. Deep-dive opportunity.',
        null,
        'cluster'
      ));
    } else if (domains[key] >= 2) {
      hooks.push(makeHook(
        key,
        '',
        2,
        'Multiple ' + key.toLowerCase() + ' signals detected. Could be coincidence or early pattern.',
        null,
        'signal'
      ));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HOLIDAY-BASED HOOKS (per GodWorld Calendar v1.0)
  // ═══════════════════════════════════════════════════════════

  // Major holidays
  if (holidayPriority === "major") {
    hooks.push(makeHook(
      'HOLIDAY',
      holidayNeighborhood || '',
      2,
      holiday + ' observance citywide. Feature opportunity: How Oakland celebrates. Human interest angles available.',
      null,
      'holiday'
    ));
  }

  // Specific major holiday hooks
  if (holiday === "NewYear") {
    hooks.push(makeHook(
      'COMMUNITY',
      '',
      2,
      'New Year: Resolution stories, fresh-start profiles, "year ahead" features.',
      null,
      'holiday'
    ));
  }

  if (holiday === "NewYearsEve") {
    hooks.push(makeHook(
      'NIGHTLIFE',
      'Downtown',
      2,
      'New Year\'s Eve: Party scene coverage, midnight moments, celebration roundup.',
      null,
      'holiday'
    ));
  }

  if (holiday === "MLKDay") {
    hooks.push(makeHook(
      'CIVIC',
      'West Oakland',
      2,
      'MLK Day: Service events, community reflection, legacy stories. Interview local leaders.',
      null,
      'holiday'
    ));
  }

  if (holiday === "Juneteenth") {
    hooks.push(makeHook(
      'CULTURAL',
      'West Oakland',
      3,
      'Juneteenth: Major celebration in West Oakland. Cultural pride, historical significance, community voices.',
      null,
      'holiday'
    ));
  }

  if (holiday === "Independence") {
    hooks.push(makeHook(
      'COMMUNITY',
      'Lake Merritt',
      2,
      'Fourth of July: Fireworks coverage, patriotic gatherings, neighborhood celebrations.',
      null,
      'holiday'
    ));
  }

  if (holiday === "Halloween") {
    hooks.push(makeHook(
      'CULTURE',
      'Temescal',
      2,
      'Halloween: Costume scenes, neighborhood trick-or-treat, party coverage. Photo opportunity.',
      null,
      'holiday'
    ));
  }

  if (holiday === "Thanksgiving") {
    hooks.push(makeHook(
      'COMMUNITY',
      '',
      2,
      'Thanksgiving: Community dinners, gratitude stories, family traditions. Human interest.',
      null,
      'holiday'
    ));
  }

  if (holiday === "Holiday") {
    hooks.push(makeHook(
      'COMMUNITY',
      '',
      2,
      'Christmas: Holiday spirit coverage, charitable giving, community celebrations.',
      null,
      'holiday'
    ));
  }

  // Cultural holidays
  if (holiday === "CincoDeMayo") {
    hooks.push(makeHook(
      'CULTURAL',
      'Fruitvale',
      3,
      'Cinco de Mayo: Fruitvale celebrations peak. Mariachi, street festivals, cultural pride. Photo essay opportunity.',
      null,
      'holiday'
    ));
  }

  if (holiday === "DiaDeMuertos") {
    hooks.push(makeHook(
      'CULTURAL',
      'Fruitvale',
      3,
      'Día de los Muertos: Altars, processions, cemetery gatherings in Fruitvale. Deeply meaningful visual story.',
      null,
      'holiday'
    ));
  }

  if (holiday === "PrideMonth") {
    hooks.push(makeHook(
      'CULTURAL',
      'Downtown',
      2,
      'Pride Month begins: Rainbow flags appear. Preview Oakland Pride, community voices, LGBTQ+ features.',
      null,
      'holiday'
    ));
  }

  if (holiday === "BlackHistoryMonth") {
    hooks.push(makeHook(
      'CULTURAL',
      'West Oakland',
      2,
      'Black History Month: Educational events, cultural programming, historical features. Oakland\'s rich heritage.',
      null,
      'holiday'
    ));
  }

  if (holiday === "IndigenousPeoplesDay") {
    hooks.push(makeHook(
      'CIVIC',
      '',
      2,
      'Indigenous Peoples Day: Native heritage observances, land acknowledgment, community events.',
      null,
      'holiday'
    ));
  }

  // Oakland-specific holidays
  if (holiday === "OpeningDay") {
    hooks.push(makeHook(
      'SPORTS',
      'Jack London',
      3,
      'A\'s Opening Day: Baseball returns! Tailgate scenes, fan profiles, optimism stories. Stadium atmosphere.',
      null,
      'holiday'
    ));
  }

  if (holiday === "OaklandPride") {
    hooks.push(makeHook(
      'CULTURAL',
      'Downtown',
      3,
      'Oakland Pride: Major parade and celebration. LGBTQ+ community spotlight, parade coverage, party scenes.',
      null,
      'holiday'
    ));
  }

  if (holiday === "ArtSoulFestival") {
    hooks.push(makeHook(
      'CULTURE',
      'Downtown',
      3,
      'Art + Soul Festival: Oakland\'s signature summer event. Music, art, food, community. Full coverage recommended.',
      null,
      'holiday'
    ));
  }

  if (holiday === "EarthDay") {
    hooks.push(makeHook(
      'ENVIRONMENT',
      'Lake Merritt',
      2,
      'Earth Day: Environmental events at Lake Merritt. Volunteer cleanups, sustainability features.',
      null,
      'holiday'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // FIRST FRIDAY HOOKS (monthly art walk)
  // ═══════════════════════════════════════════════════════════
  if (isFirstFriday) {
    hooks.push(makeHook(
      'CULTURE',
      'Uptown',
      2,
      'First Friday: Monthly art walk tonight. Gallery openings, street vendors, neighborhood energy. Photo walk opportunity.',
      null,
      'firstfriday'
    ));

    hooks.push(makeHook(
      'NIGHTLIFE',
      'KONO',
      1,
      'First Friday nightlife surge expected. Restaurant and bar scene coverage available.',
      null,
      'firstfriday'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // CREATION DAY HOOKS (GodWorld Special - Cycle 48)
  // ═══════════════════════════════════════════════════════════
  if (isCreationDay || holiday === "CreationDay") {
    hooks.push(makeHook(
      'COMMUNITY',
      '',
      2,
      'Creation Day: The city\'s founding resonates. Long-time resident reflections, "how we got here" features.',
      null,
      'creationday'
    ));

    if (creationDayAnniversary !== null && creationDayAnniversary > 0) {
      hooks.push(makeHook(
        'CIVIC',
        '',
        2,
        'Creation Day marks ' + creationDayAnniversary + ' year' + (creationDayAnniversary > 1 ? 's' : '') + '. Anniversary retrospective opportunity.',
        null,
        'creationday'
      ));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SPORTS SEASON HOOKS
  // ═══════════════════════════════════════════════════════════
  if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    hooks.push(makeHook(
      'SPORTS',
      '',
      3,
      'PLAYOFFS: Championship stakes. Fan fever, watch parties, team coverage. All-hands sports desk.',
      null,
      'sports'
    ));
  }

  if (sportsSeason === "championship") {
    hooks.push(makeHook(
      'SPORTS',
      '',
      3,
      'CHAMPIONSHIP: Historic moment potential. City-wide coverage, celebration preparation, legacy angles.',
      null,
      'sports'
    ));
  }

  if (sportsSeason === "late-season") {
    hooks.push(makeHook(
      'SPORTS',
      '',
      2,
      'Late season intensity: Pennant race heating up. Fan tension, playoff scenarios, player profiles.',
      null,
      'sports'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // v3.9: SPORTS FEED TRIGGER HOOKS
  // ═══════════════════════════════════════════════════════════
  var sportsTriggers = S.sportsEventTriggers || [];
  if (sportsTriggers.length > 0) {
    var TRIGGER_HOOKS = {
      'hot-streak':     { priority: 2, text: function(t) { return t.team + ' on a ' + (t.streak || 'hot streak') + '. Fan energy rising' + (t.neighborhood ? ' in ' + t.neighborhood : '') + '. Momentum story.'; } },
      'cold-streak':    { priority: 2, text: function(t) { return t.team + ' struggling — ' + (t.streak || 'cold streak') + '. Fan frustration angle. What\'s going wrong?'; } },
      'playoff-push':   { priority: 3, text: function(t) { return t.team + ' pushing for playoffs. City holding its breath. Stakes coverage.'; } },
      'playoff-clinch': { priority: 3, text: function(t) { return t.team + ' clinches playoff spot! Celebration' + (t.neighborhood ? ' in ' + t.neighborhood : '') + '. Historic angle.'; } },
      'eliminated':     { priority: 2, text: function(t) { return t.team + ' eliminated. Season over. Fan reaction, what-if story, next year angle.'; } },
      'championship':   { priority: 3, text: function(t) { return t.team + ' CHAMPIONSHIP! City-wide celebration. Legacy story. All desks mobilize.'; } },
      'rivalry':        { priority: 2, text: function(t) { return t.team + ' rivalry game. Heated atmosphere' + (t.neighborhood ? ' in ' + t.neighborhood : '') + '. Fan culture feature.'; } },
      'home-opener':    { priority: 2, text: function(t) { return t.team + ' home opener' + (t.neighborhood ? ' in ' + t.neighborhood : '') + '. Season preview, fan energy, local business boost.'; } },
      'season-finale':  { priority: 2, text: function(t) { return t.team + ' season finale. End-of-year reflection. Player profiles, record wrap-up.'; } }
    };

    for (var sti = 0; sti < sportsTriggers.length; sti++) {
      var trig = sportsTriggers[sti];
      var trigDef = TRIGGER_HOOKS[trig.trigger];
      if (trigDef) {
        hooks.push(makeHook(
          'SPORTS',
          trig.neighborhood || '',
          trigDef.priority,
          trigDef.text(trig),
          null,
          'sports'
        ));
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // WEATHER-DRIVEN HOOKS
  // ═══════════════════════════════════════════════════════════
  if (weather.impact >= 1.5) {
    hooks.push(makeHook(
      'WEATHER',
      '',
      3,
      'Severe weather (' + weather.type + ') impacting city operations. Human interest and infrastructure angles available.',
      null,
      'weather'
    ));
  } else if (weather.impact >= 1.3) {
    hooks.push(makeHook(
      'WEATHER',
      '',
      2,
      'Challenging weather (' + weather.type + ') affecting daily routines. Street-level color available.',
      null,
      'weather'
    ));
  }

  // Weather special events
  var weatherEvents = S.weatherEvents || [];
  var hasFirstSnow = false;
  var hasFirstWarmDay = false;
  var hasHeatWave = false;
  for (var wi = 0; wi < weatherEvents.length; wi++) {
    if (weatherEvents[wi].type === 'first_snow') hasFirstSnow = true;
    if (weatherEvents[wi].type === 'first_warm_day') hasFirstWarmDay = true;
    if (weatherEvents[wi].type === 'heat_wave_declared') hasHeatWave = true;
  }
  if (hasFirstSnow) {
    hooks.push(makeHook(
      'WEATHER',
      '',
      2,
      'First snow of the season! Rare Oakland moment. Resident reactions, photo opportunity.',
      null,
      'weather'
    ));
  }

  if (hasFirstWarmDay) {
    hooks.push(makeHook(
      'COMMUNITY',
      'Lake Merritt',
      1,
      'First warm day of spring. Parks filling up, outdoor energy returns. Seasonal feature.',
      null,
      'weather'
    ));
  }

  if (hasHeatWave) {
    hooks.push(makeHook(
      'WEATHER',
      '',
      3,
      'Heat wave declared: Extended dangerous heat. Cooling centers, vulnerable populations, infrastructure strain.',
      null,
      'weather'
    ));
  }

  // Weather mood hooks
  if (weatherMood.perfectWeather) {
    hooks.push(makeHook(
      'COMMUNITY',
      'Lake Merritt',
      1,
      'Perfect weather drawing crowds outdoors. Street scene, park life, café patios. Photo walk.',
      null,
      'weather'
    ));
  }

  if (weatherMood.conflictPotential > 0.3) {
    hooks.push(makeHook(
      'SAFETY',
      '',
      2,
      'Weather conditions raising tension citywide. Watch for conflict, temper flares.',
      null,
      'weather'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // SENTIMENT-DRIVEN HOOKS
  // ═══════════════════════════════════════════════════════════
  if (dynamics.sentiment <= -0.4) {
    hooks.push(makeHook(
      'CIVIC',
      '',
      3,
      'City sentiment notably depressed. What\'s weighing on residents? Investigation angle.',
      null,
      'sentiment'
    ));
  } else if (dynamics.sentiment >= 0.35) {
    hooks.push(makeHook(
      'COMMUNITY',
      'Lake Merritt',
      2,
      'Positive energy in the city. What\'s driving the mood? Feature opportunity.',
      null,
      'sentiment'
    ));
  }

  // New metrics from cityDynamics v2.2
  if (dynamics.culturalActivity >= 1.5) {
    hooks.push(makeHook(
      'CULTURE',
      '',
      2,
      'Cultural activity surge detected. Arts scene energized. Gallery/venue roundup opportunity.',
      null,
      'cultural'
    ));
  }

  if (dynamics.communityEngagement >= 1.4) {
    hooks.push(makeHook(
      'COMMUNITY',
      '',
      2,
      'Community engagement elevated. Residents gathering, organizing, connecting. Profile opportunity.',
      null,
      'community'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // PATTERN FLAG HOOKS
  // ═══════════════════════════════════════════════════════════
  if (S.patternFlag === 'strain-trend') {
    hooks.push(makeHook(
      'CIVIC',
      'Downtown',
      3,
      'Strain trend detected across multiple cycles. Systemic pressure building. Explainer piece warranted.',
      null,
      'pattern'
    ));
  }

  if (S.patternFlag === 'calm-after-shock') {
    hooks.push(makeHook(
      'GENERAL',
      '',
      2,
      'Recovery phase following recent shock. How is the city bouncing back? Follow-up angle.',
      null,
      'pattern'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // SHOCK FLAG HOOKS
  // ═══════════════════════════════════════════════════════════
  if (S.shockFlag && S.shockFlag !== 'none') {
    hooks.push(makeHook(
      'CIVIC',
      '',
      3,
      'SHOCK EVENT: Unexpected disruption detected. Breaking news potential. All desks alert.',
      null,
      'shock'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // INITIATIVE OUTCOME HOOKS (v3.7)
  // ═══════════════════════════════════════════════════════════
  var initiativeEvents = S.initiativeEvents || [];
  var votesThisCycle = S.votesThisCycle || [];
  var positiveInitiatives = S.positiveInitiatives || [];
  var failedInitiatives = S.failedInitiatives || [];
  var initiativeRipples = S.initiativeRipples || [];

  // Generate hooks for passed initiatives
  for (var pi = 0; pi < positiveInitiatives.length; pi++) {
    var passedName = positiveInitiatives[pi] || '';
    var passedLower = passedName.toLowerCase();

    // Determine priority and desk based on initiative type
    var initPriority = 2;
    var initDesk = 'CIVIC';
    var initNh = '';

    // Housing/stabilization initiatives are major civic stories
    if (passedLower.indexOf('housing') >= 0 || passedLower.indexOf('stabiliz') >= 0 ||
        passedLower.indexOf('fund') >= 0) {
      initPriority = 3;
      initDesk = 'CIVIC';
      if (passedLower.indexOf('west oakland') >= 0) initNh = 'West Oakland';
    }
    // Health initiatives
    else if (passedLower.indexOf('health') >= 0 || passedLower.indexOf('clinic') >= 0) {
      initPriority = 2;
      initDesk = 'HEALTH';
    }
    // Transit initiatives
    else if (passedLower.indexOf('transit') >= 0 || passedLower.indexOf('hub') >= 0) {
      initPriority = 2;
      initDesk = 'INFRASTRUCTURE';
    }
    // Economic/business
    else if (passedLower.indexOf('business') >= 0 || passedLower.indexOf('economic') >= 0) {
      initPriority = 2;
      initDesk = 'BUSINESS';
    }
    // Major developments
    else if (passedLower.indexOf('baylight') >= 0 || passedLower.indexOf('district') >= 0) {
      initPriority = 3;
      initDesk = 'CIVIC';
    }

    hooks.push(makeHook(
      initDesk,
      initNh,
      initPriority,
      'INITIATIVE PASSED: "' + passedName + '" approved by council. Community reaction, implementation timeline, impact analysis angles.',
      null,
      'initiative-passed'
    ));
  }

  // Generate hooks for failed initiatives
  for (var fi = 0; fi < failedInitiatives.length; fi++) {
    var failedName = failedInitiatives[fi] || '';

    hooks.push(makeHook(
      'CIVIC',
      '',
      2,
      'INITIATIVE FAILED: "' + failedName + '" rejected by council. Political fallout, opposition reaction, what\'s next angles.',
      null,
      'initiative-failed'
    ));
  }

  // Generate hooks for vote details (swing voter drama)
  for (var vi = 0; vi < votesThisCycle.length; vi++) {
    var vote = votesThisCycle[vi];
    var swingVoters = vote.swingVoters || [];

    // If close vote with swing voter drama
    if (swingVoters.length > 0 && vote.voteCount) {
      var voteNums = String(vote.voteCount).split('-');
      var yesVotes = parseInt(voteNums[0]) || 0;
      var noVotes = parseInt(voteNums[1]) || 0;
      var margin = Math.abs(yesVotes - noVotes);

      if (margin <= 2) {
        // Close vote = drama
        var swingNames = [];
        for (var si = 0; si < swingVoters.length; si++) {
          if (swingVoters[si].source === 'projection' || swingVoters[si].source === 'lean') {
            swingNames.push(swingVoters[si].name + ' (' + swingVoters[si].vote + ')');
          }
        }
        if (swingNames.length > 0) {
          hooks.push(makeHook(
            'CIVIC',
            '',
            3,
            'CLOSE VOTE: "' + vote.name + '" decided ' + vote.voteCount + '. Swing voters: ' + swingNames.join(', ') + '. Political drama profile opportunity.',
            null,
            'initiative-swing'
          ));
        }
      }
    }
  }

  // Initiative ripple effects starting
  if (initiativeRipples.length > 0) {
    var newRipples = initiativeRipples.filter(function(r) {
      return r.startCycle === cycle && r.direction === 'positive';
    });

    if (newRipples.length > 0) {
      var ripple = newRipples[0];
      var affectedHoods = (ripple.affectedNeighborhoods || []).join(', ');
      hooks.push(makeHook(
        'CIVIC',
        affectedHoods ? affectedHoods.split(',')[0].trim() : '',
        2,
        'RIPPLE EFFECT: "' + ripple.initiativeName + '" beginning to affect ' + (affectedHoods || 'the city') + '. Early impact observation angle.',
        null,
        'initiative-ripple'
      ));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // WORLD EVENT HOOKS (notable individual events)
  // ═══════════════════════════════════════════════════════════
  for (var evi = 0; evi < worldEvents.length; evi++) {
    var ev = worldEvents[evi];
    var desc = (ev.description || '').toLowerCase();
    var severity = ev.severity || 'low';

    // Only hook on medium severity or specific keywords
    if (severity === 'medium') {
      hooks.push(makeHook(
        ev.domain || 'GENERAL',
        ev.neighborhood || '',
        2,
        'Notable event: "' + ev.description + '". Follow-up recommended.',
        null,
        'event'
      ));
    }

    // Specific high-interest events
    if (desc.indexOf('earthquake') !== -1) {
      hooks.push(makeHook(
        'ENVIRONMENT',
        '',
        3,
        'Seismic activity reported. Resident reactions and structural checks warranted.',
        null,
        'event'
      ));
    }

    if (desc.indexOf('blackout') !== -1 || desc.indexOf('outage') !== -1) {
      hooks.push(makeHook(
        'INFRASTRUCTURE',
        'West Oakland',
        3,
        'Power disruption reported. Cause and impact investigation needed.',
        null,
        'event'
      ));
    }

    if (desc.indexOf('protest') !== -1 || desc.indexOf('rally') !== -1) {
      hooks.push(makeHook(
        'CIVIC',
        'Downtown',
        2,
        'Public demonstration activity. Organizer interviews and crowd size verification.',
        null,
        'event'
      ));
    }

    if (desc.indexOf('fire') !== -1 && desc.indexOf('fireworks') === -1) {
      hooks.push(makeHook(
        'SAFETY',
        ev.neighborhood || '',
        3,
        'Fire incident reported. Scene coverage, displacement, cause investigation.',
        null,
        'event'
      ));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // MIGRATION DRIFT HOOKS
  // ═══════════════════════════════════════════════════════════
  var drift = S.migrationDrift || 0;
  if (drift < -35) {
    hooks.push(makeHook(
      'COMMUNITY',
      '',
      2,
      'Significant population outflow detected. Who\'s leaving and why? Long-form opportunity.',
      null,
      'demographic'
    ));
  } else if (drift > 30) {
    hooks.push(makeHook(
      'COMMUNITY',
      '',
      2,
      'Population inflow surge. New residents arriving. Neighborhood change angle.',
      null,
      'demographic'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // DEMOGRAPHIC SHIFT HOOKS (v3.4 - Tier 4 integration)
  // ═══════════════════════════════════════════════════════════
  var demographicShifts = S.demographicShifts || [];
  var neighborhoodDemographics = S.neighborhoodDemographics || {};

  for (var dsi = 0; dsi < demographicShifts.length; dsi++) {
    var shift = demographicShifts[dsi];
    if (!shift || !shift.neighborhood) continue;

    var shiftHood = shift.neighborhood;
    var shiftType = shift.type || '';
    var shiftDir = shift.direction || '';
    var shiftPct = shift.percentage || 0;

    // Only generate hooks for significant shifts (8%+ change)
    if (shiftPct < 8) continue;

    // Population shifts
    if (shiftType === 'population_shift') {
      if (shiftDir === 'growth') {
        hooks.push(makeHook(
          'COMMUNITY',
          shiftHood,
          shiftPct >= 12 ? 3 : 2,
          shiftHood + ' seeing ' + shiftPct + '% population growth. New residents arriving—who are they and why? Neighborhood change angle.',
          null,
          'demographic'
        ));
      } else if (shiftDir === 'decline') {
        hooks.push(makeHook(
          'COMMUNITY',
          shiftHood,
          shiftPct >= 12 ? 3 : 2,
          shiftHood + ' experiencing ' + shiftPct + '% population decline. Who\'s leaving and why? Long-form opportunity.',
          null,
          'demographic'
        ));
      }
    }

    // Senior population shifts
    if (shiftType === 'seniors_shift') {
      if (shiftDir === 'up') {
        hooks.push(makeHook(
          'HEALTH',
          shiftHood,
          2,
          shiftHood + '\'s senior population up ' + shiftPct + '%. Aging-in-place story? Senior services demand increasing.',
          null,
          'demographic'
        ));
      } else if (shiftDir === 'down') {
        hooks.push(makeHook(
          'COMMUNITY',
          shiftHood,
          2,
          shiftHood + ' losing senior residents (' + shiftPct + '% decline). Displacement? Family migration? Feature angle.',
          null,
          'demographic'
        ));
      }
    }

    // Student population shifts
    if (shiftType === 'students_shift') {
      if (shiftDir === 'up') {
        hooks.push(makeHook(
          'EDUCATION',
          shiftHood,
          2,
          shiftHood + '\'s student population up ' + shiftPct + '%. Young families moving in? School capacity angle.',
          null,
          'demographic'
        ));
      } else if (shiftDir === 'down') {
        hooks.push(makeHook(
          'EDUCATION',
          shiftHood,
          2,
          shiftHood + ' seeing ' + shiftPct + '% decline in student population. Schools affected? Family migration angle.',
          null,
          'demographic'
        ));
      }
    }

    // Unemployment shifts
    if (shiftType === 'unemployed_shift') {
      if (shiftDir === 'up') {
        hooks.push(makeHook(
          'BUSINESS',
          shiftHood,
          shiftPct >= 10 ? 3 : 2,
          'Unemployment in ' + shiftHood + ' up ' + shiftPct + '%. Economic stress story. Who\'s affected and why?',
          null,
          'demographic'
        ));
      } else if (shiftDir === 'down') {
        hooks.push(makeHook(
          'BUSINESS',
          shiftHood,
          2,
          shiftHood + ' unemployment down ' + shiftPct + '%. Recovery story. What\'s driving job growth?',
          null,
          'demographic'
        ));
      }
    }

    // Illness rate shifts
    if (shiftType === 'sick_shift') {
      if (shiftDir === 'up') {
        hooks.push(makeHook(
          'HEALTH',
          shiftHood,
          shiftPct >= 10 ? 3 : 2,
          'Illness rates in ' + shiftHood + ' up ' + shiftPct + '%. Public health concern? Investigation warranted.',
          null,
          'demographic'
        ));
      }
    }
  }

  // Aggregate demographic context hooks
  if (Object.keys(neighborhoodDemographics).length > 0 && demographicShifts.length >= 3) {
    hooks.push(makeHook(
      'CIVIC',
      '',
      2,
      'Multiple neighborhood demographic shifts detected this cycle. City-wide population dynamics story.',
      null,
      'demographic'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // NIGHTLIFE HOOKS
  // ═══════════════════════════════════════════════════════════
  if (dynamics.nightlife >= 1.4) {
    hooks.push(makeHook(
      'NIGHTLIFE',
      'Jack London',
      2,
      'Nightlife surge in the district. Scene report or venue profile opportunity.',
      null,
      'nightlife'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // SEASONAL TRANSITION HOOKS
  // ═══════════════════════════════════════════════════════════
  if (holiday === "SpringEquinox") {
    hooks.push(makeHook(
      'GENERAL',
      '',
      1,
      'Spring equinox: Seasonal transition. "Signs of spring" feature opportunity.',
      null,
      'seasonal'
    ));
  }

  if (holiday === "SummerSolstice") {
    hooks.push(makeHook(
      'COMMUNITY',
      'Lake Merritt',
      1,
      'Summer solstice: Longest day. Evening gatherings, outdoor celebrations.',
      null,
      'seasonal'
    ));
  }

  if (holiday === "FallEquinox") {
    hooks.push(makeHook(
      'GENERAL',
      '',
      1,
      'Fall equinox: Seasonal shift. Back-to-school wrap-up, autumn preview.',
      null,
      'seasonal'
    ));
  }

  if (holiday === "WinterSolstice") {
    hooks.push(makeHook(
      'GENERAL',
      '',
      1,
      'Winter solstice: Darkest day. Holiday season mood, year-end reflection.',
      null,
      'seasonal'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // v3.5: CITIZEN RELATIONSHIP HOOKS
  // ═══════════════════════════════════════════════════════════

  // Get citizen bonds from summary
  var citizenBonds = S.citizenBonds || S.relationshipBonds || [];
  var citizenLookup = ctx.citizenLookup || {};

  // Helper to get citizen name
  function getCitizenName_(popId) {
    var c = citizenLookup[popId];
    if (!c) return popId;
    return ((c.First || '') + ' ' + (c.Last || '')).trim() || popId;
  }

  // Helper to get archetype from TraitProfile
  function getCitizenArchetype_(popId) {
    var c = citizenLookup[popId];
    if (!c || !c.TraitProfile) return 'Drifter';
    var parts = String(c.TraitProfile).split('|');
    for (var pi = 0; pi < parts.length; pi++) {
      if (parts[pi].indexOf('Archetype:') === 0) {
        return parts[pi].substring(10);
      }
    }
    return 'Drifter';
  }

  // Count active rivalries and alliances
  var activeRivalries = [];
  var activeAlliances = [];

  for (var bi = 0; bi < citizenBonds.length; bi++) {
    var bond = citizenBonds[bi];
    if (!bond || !bond.bondType) continue;

    // Only look at bonds modified recently (last 5 cycles)
    var bondCycle = bond.lastUpdated || bond.cycle || 0;
    if (cycle - bondCycle > 5) continue;

    if (bond.bondType === 'rivalry' && bond.strength >= 3) {
      activeRivalries.push(bond);
    } else if (bond.bondType === 'alliance' && bond.strength >= 3) {
      activeAlliances.push(bond);
    }
  }

  // Generate rivalry hooks
  if (activeRivalries.length >= 2) {
    hooks.push(makeHook(
      'COMMUNITY',
      '',
      2,
      'Multiple active rivalries detected across neighborhoods. Tensions simmering. Who\'s in conflict and why?',
      null,
      'relationship'
    ));
  }

  // Feature strongest rivalry
  if (activeRivalries.length > 0) {
    var strongestRivalry = activeRivalries[0];
    for (var ri = 1; ri < activeRivalries.length; ri++) {
      if (activeRivalries[ri].strength > strongestRivalry.strength) {
        strongestRivalry = activeRivalries[ri];
      }
    }
    if (strongestRivalry.strength >= 5) {
      var rival1 = getCitizenName_(strongestRivalry.popId1 || strongestRivalry.citizenA);
      var rival2 = getCitizenName_(strongestRivalry.popId2 || strongestRivalry.citizenB);
      var rivalNh = strongestRivalry.neighborhood || '';
      hooks.push(makeHook(
        'COMMUNITY',
        rivalNh,
        3,
        'High-intensity rivalry between ' + rival1 + ' and ' + rival2 + '. Investigation angle: what\'s driving the conflict?',
        null,
        'relationship'
      ));
    }
  }

  // Generate alliance hooks
  if (activeAlliances.length >= 3) {
    hooks.push(makeHook(
      'COMMUNITY',
      '',
      2,
      'Strong alliance networks forming across neighborhoods. Collective action brewing. Feature on community connections.',
      null,
      'relationship'
    ));
  }

  // Feature notable alliance
  if (activeAlliances.length > 0) {
    var strongestAlliance = activeAlliances[0];
    for (var ali = 1; ali < activeAlliances.length; ali++) {
      if (activeAlliances[ali].strength > strongestAlliance.strength) {
        strongestAlliance = activeAlliances[ali];
      }
    }
    if (strongestAlliance.strength >= 5) {
      var ally1 = getCitizenName_(strongestAlliance.popId1 || strongestAlliance.citizenA);
      var ally2 = getCitizenName_(strongestAlliance.popId2 || strongestAlliance.citizenB);
      var arch1 = getCitizenArchetype_(strongestAlliance.popId1 || strongestAlliance.citizenA);
      var arch2 = getCitizenArchetype_(strongestAlliance.popId2 || strongestAlliance.citizenB);
      hooks.push(makeHook(
        'COMMUNITY',
        strongestAlliance.neighborhood || '',
        2,
        'Strong alliance: ' + ally1 + ' (' + arch1 + ') and ' + ally2 + ' (' + arch2 + '). What are they building together?',
        null,
        'relationship'
      ));
    }
  }

  // Archetype-based investigation angles
  var watcherCount = 0;
  var catalystCount = 0;
  var striverCount = 0;

  var popIds = Object.keys(citizenLookup);
  for (var ci = 0; ci < popIds.length; ci++) {
    var arch = getCitizenArchetype_(popIds[ci]);
    if (arch === 'Watcher') watcherCount++;
    if (arch === 'Catalyst') catalystCount++;
    if (arch === 'Striver') striverCount++;
  }

  // Catalyst-heavy neighborhoods might have more conflict
  if (catalystCount >= 5) {
    hooks.push(makeHook(
      'COMMUNITY',
      '',
      1,
      'Multiple Catalyst personalities active in the population. Watch for disruption, change, or volatility.',
      null,
      'archetype'
    ));
  }

  // Striver concentration suggests economic/career angles
  if (striverCount >= 8) {
    hooks.push(makeHook(
      'BUSINESS',
      '',
      1,
      'High concentration of ambitious, driven personalities. Career competition and economic hustle stories.',
      null,
      'archetype'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // v3.6: STORYLINE TRACKER HOOKS
  // ═══════════════════════════════════════════════════════════

  /**
   * Load storylines from Storyline_Tracker sheet
   */
  function loadStorylines_() {
    var storylines = [];
    var ss = ctx.ss;
    if (!ss) return storylines;

    var sheet = ss.getSheetByName('Storyline_Tracker');
    if (!sheet) return storylines;

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return storylines;

    var headers = data[0];
    var col = function(name) { return headers.indexOf(name); };

    var cycleAddedIdx = col('CycleAdded');
    var typeIdx = col('StorylineType');
    var descIdx = col('Description');
    var nhIdx = col('Neighborhood');
    var citizensIdx = col('RelatedCitizens');
    var priorityIdx = col('Priority');
    var statusIdx = col('Status');

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var status = statusIdx >= 0 ? row[statusIdx] : '';

      storylines.push({
        rowNumber: i + 1,
        cycleAdded: cycleAddedIdx >= 0 ? row[cycleAddedIdx] : 0,
        type: typeIdx >= 0 ? row[typeIdx] : '',
        description: descIdx >= 0 ? row[descIdx] : '',
        neighborhood: nhIdx >= 0 ? row[nhIdx] : '',
        relatedCitizens: citizensIdx >= 0 ? row[citizensIdx] : '',
        priority: priorityIdx >= 0 ? row[priorityIdx] : 'normal',
        status: status,
        cyclesSinceAdded: cycle - (cycleAddedIdx >= 0 ? (row[cycleAddedIdx] || 0) : 0)
      });
    }

    return storylines;
  }

  var storylines = loadStorylines_();
  var activeStorylines = [];
  var dormantStorylines = [];
  var urgentStorylines = [];

  for (var sli = 0; sli < storylines.length; sli++) {
    var sl = storylines[sli];
    if (sl.status === 'active') activeStorylines.push(sl);
    if (sl.status === 'dormant') dormantStorylines.push(sl);
    if (sl.priority === 'urgent' || sl.priority === 'high') urgentStorylines.push(sl);
  }

  // Generate hooks for dormant storylines (revival opportunity)
  if (dormantStorylines.length > 0) {
    var oldestDormant = dormantStorylines[0];
    for (var di = 1; di < dormantStorylines.length; di++) {
      if (dormantStorylines[di].cyclesSinceAdded > oldestDormant.cyclesSinceAdded) {
        oldestDormant = dormantStorylines[di];
      }
    }

    if (oldestDormant.cyclesSinceAdded >= 5) {
      hooks.push(makeHook(
        'GENERAL',
        oldestDormant.neighborhood || '',
        2,
        'DORMANT STORYLINE: "' + (oldestDormant.description || 'Unnamed').substring(0, 60) + '..." - ' + oldestDormant.cyclesSinceAdded + ' cycles without coverage. Revival angle?',
        null,
        'storyline-dormant'
      ));
    }
  }

  // Generate hooks for urgent/high priority active storylines
  for (var ui = 0; ui < urgentStorylines.length && ui < 2; ui++) {
    var urg = urgentStorylines[ui];
    if (urg.status !== 'active') continue;

    var urgPriority = urg.priority === 'urgent' ? 3 : 2;
    hooks.push(makeHook(
      'GENERAL',
      urg.neighborhood || '',
      urgPriority,
      (urg.priority === 'urgent' ? 'URGENT: ' : 'HIGH PRIORITY: ') + (urg.description || 'Active storyline').substring(0, 80),
      null,
      'storyline-priority'
    ));
  }

  // Generate hooks for mystery/question storylines
  for (var mi = 0; mi < storylines.length; mi++) {
    var myst = storylines[mi];
    if (myst.status !== 'active') continue;
    if (myst.type !== 'mystery' && myst.type !== 'question') continue;

    hooks.push(makeHook(
      'CIVIC',
      myst.neighborhood || '',
      2,
      'OPEN QUESTION: ' + (myst.description || 'Unresolved mystery').substring(0, 70) + ' — Investigation angle available.',
      null,
      'storyline-mystery'
    ));
    break; // Only one mystery hook per cycle
  }

  // Multiple active storylines hook
  if (activeStorylines.length >= 5) {
    hooks.push(makeHook(
      'GENERAL',
      '',
      2,
      activeStorylines.length + ' active storylines tracked. Complex narrative environment. Continuity opportunities.',
      null,
      'storyline-density'
    ));
  }

  // Store storyline count in summary
  S.activeStorylineCount = activeStorylines.length;
  S.dormantStorylineCount = dormantStorylines.length;

  // ═══════════════════════════════════════════════════════════
  // DEDUPLICATE BY PRIORITY (keep highest priority per domain)
  // ═══════════════════════════════════════════════════════════
  var seen = {};
  var deduped = [];

  for (var hi = 0; hi < hooks.length; hi++) {
    var h = hooks[hi];
    var hkey = h.domain + '-' + h.hookType;
    if (!seen[hkey] || seen[hkey].priority < h.priority) {
      seen[hkey] = h;
    }
  }

  for (var seenKey in seen) {
    if (seen.hasOwnProperty(seenKey)) {
      deduped.push(seen[seenKey]);
    }
  }

  // Sort by priority descending
  deduped.sort(function(a, b) { return b.priority - a.priority; });

  ctx.summary.storyHooks = deduped;
}


/**
 * ============================================================================
 * HOOK TYPES REFERENCE
 * ============================================================================
 *
 * Type              | Source                    | Priority Range
 * ─────────────────────────────────────────────────────────────────────────
 * arc               | Event arcs                | 1-3 (phase-based)
 * cluster           | Domain accumulation       | 2-3
 * signal            | Domain early detection    | 1-2
 * holiday           | Calendar holidays         | 2-3
 * firstfriday       | Monthly art walk          | 1-2
 * creationday       | GodWorld founding         | 2
 * sports            | Sports season             | 2-3
 * weather           | Weather conditions        | 1-3
 * sentiment         | City mood                 | 2-3
 * cultural          | Cultural activity         | 2
 * community         | Community engagement      | 2
 * pattern           | Multi-cycle patterns      | 2-3
 * shock             | Disruption events         | 3
 * event             | World events              | 2-3
 * demographic       | Migration + demo shifts   | 2-3 (v3.4 expanded)
 * nightlife         | Nightlife surge           | 2
 * seasonal          | Equinox/solstice          | 1
 * relationship      | Citizen bonds (v3.5)      | 2-3
 * archetype         | Archetype concentration   | 1
 * storyline-dormant | Dormant storylines (v3.6) | 2
 * storyline-priority| High/urgent storylines    | 2-3
 * storyline-mystery | Unresolved questions      | 2
 * storyline-density | Multiple active storylines| 2
 * initiative-passed | Passed initiatives (v3.7) | 2-3
 * initiative-failed | Failed initiatives (v3.7) | 2
 * initiative-swing  | Close votes w/ swing drama| 3
 * initiative-ripple | Ripple effects starting   | 2
 *
 * v3.7 INITIATIVE OUTCOMES:
 * - Passed initiatives generate civic story hooks
 * - Housing/stabilization initiatives get priority 3
 * - Close votes (margin ≤2) with named swing voters trigger drama hooks
 * - Ripple effects generate early observation angles
 * - Failed initiatives trigger political fallout hooks
 *
 * v3.4 DEMOGRAPHIC SHIFTS (Tier 4):
 * - population_shift: Growth/decline → Community desk
 * - seniors_shift: Aging population → Health desk
 * - students_shift: Youth population → Education desk
 * - unemployed_shift: Job market → Business desk
 * - sick_shift: Health issues → Health desk
 * - Significant shifts (8%+) generate hooks
 * - Major shifts (12%+) get priority 3
 *
 * ============================================================================
 */