/**
 * ============================================================================
 * storyHookEngine_ v3.4 — ENHANCED
 * ============================================================================
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
  // HOOK BUILDER
  // ═══════════════════════════════════════════════════════════
  function makeHook(domain, neighborhood, priority, text, linkedArcId, hookType) {
    return {
      hookId: Utilities.getUuid().slice(0, 8),
      domain: domain || 'GENERAL',
      neighborhood: neighborhood || '',
      priority: priority || 1,
      text: text || '',
      linkedArcId: linkedArcId || null,
      hookType: hookType || 'signal',
      suggestedDesks: getDesks(domain),
      cycle: cycle,
      cycleOfYear: cycleOfYear
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
 * Type         | Source                    | Priority Range
 * ─────────────────────────────────────────────────────────────────────────
 * arc          | Event arcs                | 1-3 (phase-based)
 * cluster      | Domain accumulation       | 2-3
 * signal       | Domain early detection    | 1-2
 * holiday      | Calendar holidays         | 2-3
 * firstfriday  | Monthly art walk          | 1-2
 * creationday  | GodWorld founding         | 2
 * sports       | Sports season             | 2-3
 * weather      | Weather conditions        | 1-3
 * sentiment    | City mood                 | 2-3
 * cultural     | Cultural activity         | 2
 * community    | Community engagement      | 2
 * pattern      | Multi-cycle patterns      | 2-3
 * shock        | Disruption events         | 3
 * event        | World events              | 2-3
 * demographic  | Migration + demo shifts   | 2-3 (v3.4 expanded)
 * nightlife    | Nightlife surge           | 2
 * seasonal     | Equinox/solstice          | 1
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