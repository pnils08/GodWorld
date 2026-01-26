/**
 * ============================================================================
 * MEDIA FEEDBACK ENGINE V2.2
 * ============================================================================
 *
 * Creates feedback loops where media coverage influences the simulation,
 * now with calendar awareness for seasonal narratives.
 *
 * v2.2 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx/summary
 * - for loops instead of for...of
 *
 * v2.1 Features:
 * - Holiday-specific media narratives (feel-good, year-end recaps)
 * - Sports season media amplification (playoff coverage, championship hype)
 * - First Friday arts/culture coverage boost
 * - Creation Day Oakland pride stories
 * - Seasonal media moods (summer optimism, winter coziness)
 * - Festival coverage during Oakland holidays
 * - Calendar context in output and event pools
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.0):
 * - World events analysis
 * - Entertainment signals
 * - Celebrity coverage
 * - Neighborhood effects
 * - Arc amplification
 *
 * Call AFTER buildEveningMedia_ and buildMediaPacket_
 * Call BEFORE citizen event generators
 *
 * ============================================================================
 */


// ============================================================
// CONSTANTS
// ============================================================

var MEDIA_IMPACT_TYPES = {
  CRISIS_COVERAGE: 'crisis_coverage',
  CELEBRITY_SPOTLIGHT: 'celebrity_spotlight',
  CRIME_REPORT: 'crime_report',
  FEEL_GOOD: 'feel_good',
  POLITICAL: 'political',
  SPORTS_HYPE: 'sports_hype',
  WEATHER_ALERT: 'weather_alert',
  CULTURAL_EVENT: 'cultural_event',
  // v2.1: Calendar-specific types
  HOLIDAY_SPECIAL: 'holiday_special',
  FESTIVAL_COVERAGE: 'festival_coverage',
  YEAR_END_RECAP: 'year_end_recap',
  OAKLAND_PRIDE: 'oakland_pride'
};

var COVERAGE_INTENSITY = {
  MINIMAL: 'minimal',
  MODERATE: 'moderate',
  HEAVY: 'heavy',
  SATURATED: 'saturated'
};

// Oakland neighborhoods
var MEDIA_NEIGHBORHOODS = [
  'Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt',
  'West Oakland', 'Laurel', 'Rockridge', 'Jack London'
];

// Neighborhood media profiles
var NEIGHBORHOOD_MEDIA_PROFILES = {
  'Downtown': { mediaWeight: 1.3, topics: ['civic', 'business', 'crime'] },
  'Jack London': { mediaWeight: 1.2, topics: ['culture', 'nightlife', 'entertainment'] },
  'Fruitvale': { mediaWeight: 1.0, topics: ['community', 'culture', 'safety'] },
  'Temescal': { mediaWeight: 0.9, topics: ['health', 'education', 'community'] },
  'Lake Merritt': { mediaWeight: 1.1, topics: ['culture', 'community', 'events'] },
  'West Oakland': { mediaWeight: 1.0, topics: ['infrastructure', 'development', 'safety'] },
  'Rockridge': { mediaWeight: 0.8, topics: ['business', 'retail', 'education'] },
  'Laurel': { mediaWeight: 0.7, topics: ['community', 'local'] }
};

// v2.1: Holiday-specific media focus neighborhoods
var HOLIDAY_MEDIA_NEIGHBORHOODS = {
  'OaklandPride': ['Downtown', 'Lake Merritt', 'Jack London'],
  'ArtSoulFestival': ['Downtown', 'Jack London'],
  'LunarNewYear': ['Chinatown', 'Downtown'],
  'CincoDeMayo': ['Fruitvale'],
  'DiaDeMuertos': ['Fruitvale'],
  'Juneteenth': ['West Oakland', 'Downtown']
};

// v2.1: Feel-good holiday list
var FEEL_GOOD_HOLIDAYS = [
  'Thanksgiving', 'Holiday', 'Easter', 'MothersDay', 'FathersDay',
  'ValentinesDay', 'NewYearsDay'
];

// v2.1: Year-end recap period
var YEAR_END_MONTHS = [12, 1];


// ============================================================
// MAIN ENGINE
// ============================================================

/**
 * Main entry point - analyzes media output and generates feedback effects.
 */
function runMediaFeedbackEngine_(ctx) {
  // Defensive guard
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};

  var S = ctx.summary;
  var cycle = S.cycleId || (ctx.config ? ctx.config.cycleCount : 0) || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.1: CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var calendarContext = {
    holiday: S.holiday || 'none',
    holidayPriority: S.holidayPriority || 'none',
    isFirstFriday: S.isFirstFriday || false,
    isCreationDay: S.isCreationDay || false,
    sportsSeason: S.sportsSeason || 'off-season',
    season: S.season || 'unknown',
    month: S.month || 0
  };
  ctx.mediaCalendarContext = calendarContext;

  // Initialize media effects tracking
  ctx.summary.mediaEffects = {
    coverageProfile: {},
    sentimentPressure: 0,
    anxietyFactor: 0,
    hopeFactor: 0,
    celebrityBuzz: 0,
    crisisSaturation: 0,
    neighborhoodEffects: {},
    trendAmplification: {},
    arcAmplification: [],
    eventPools: {
      anxious: [],
      hopeful: [],
      celebrity: [],
      crisis: [],
      sports: [],
      // v2.1: Calendar-specific pools
      holiday: [],
      festival: [],
      oakland_pride: []
    },
    // v2.1: Calendar tracking
    calendarContext: calendarContext,
    holidayNarrative: 'none',
    sportsNarrative: 'none',
    seasonalMood: 'neutral'
  };

  // Step 1: Analyze world events coverage
  analyzeWorldEventsCoverage_(ctx);

  // Step 2: Analyze entertainment media signals
  analyzeEntertainmentSignals_(ctx);

  // Step 3: Analyze celebrity/famous people coverage
  analyzeCelebrityCoverage_(ctx);

  // v2.1 Step 3.5: Apply calendar-based media modifiers
  applyCalendarMediaModifiers_(ctx);

  // Step 4: Calculate coverage intensity
  calculateCoverageIntensity_(ctx);

  // Step 5: Generate sentiment pressure
  calculateSentimentPressure_(ctx);

  // Step 6: Apply neighborhood perception effects
  applyNeighborhoodMediaEffects_(ctx);

  // Step 7: Amplify relevant arcs
  amplifyArcsFromCoverage_(ctx, cycle);

  // Step 8: Generate media-driven event pools
  generateMediaEventPools_(ctx);

  // Step 9: Apply feedback to city dynamics
  applyMediaToCityDynamics_(ctx);

  // Step 10: Generate summary for packet
  generateMediaSummary_(ctx);

  Logger.log('runMediaFeedbackEngine_ v2.2: ' + ctx.summary.mediaEffects.mediaNarrative +
    ' | Holiday: ' + calendarContext.holiday +
    ' | Sports: ' + calendarContext.sportsSeason);
}


// ============================================================
// v2.1: CALENDAR MEDIA MODIFIERS
// ============================================================

/**
 * Applies calendar-based modifiers to media effects.
 */
function applyCalendarMediaModifiers_(ctx) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var cal = ctx.mediaCalendarContext || {};

  // ─────────────────────────────────────────────────────────────
  // HOLIDAY NARRATIVES
  // ─────────────────────────────────────────────────────────────

  // Feel-good holidays boost hope, reduce anxiety coverage
  if (FEEL_GOOD_HOLIDAYS.indexOf(cal.holiday) >= 0) {
    effects.hopeFactor += 0.2;
    effects.anxietyFactor *= 0.7; // 30% reduction in anxiety coverage
    effects.holidayNarrative = 'feel_good';
    effects.coverageProfile.holidayMood = 'heartwarming';
  }

  // Oakland festivals = celebration coverage
  var oaklandFestivals = ['OaklandPride', 'ArtSoulFestival', 'Juneteenth'];
  if (oaklandFestivals.indexOf(cal.holiday) >= 0) {
    effects.hopeFactor += 0.25;
    effects.celebrityBuzz += 0.15; // Local celebrities in spotlight
    effects.holidayNarrative = 'celebration';
    effects.coverageProfile.festivalCoverage = cal.holiday;

    // Festival neighborhoods get extra positive coverage
    var festivalHoods = HOLIDAY_MEDIA_NEIGHBORHOODS[cal.holiday] || ['Downtown'];
    effects.festivalSpotlight = festivalHoods;
  }

  // Cultural holidays = community focus
  var culturalHolidays = ['LunarNewYear', 'CincoDeMayo', 'DiaDeMuertos'];
  if (culturalHolidays.indexOf(cal.holiday) >= 0) {
    effects.hopeFactor += 0.15;
    effects.holidayNarrative = 'cultural_celebration';
    effects.coverageProfile.culturalFocus = cal.holiday;

    var culturalHoods = HOLIDAY_MEDIA_NEIGHBORHOODS[cal.holiday] || [];
    effects.festivalSpotlight = culturalHoods;
  }

  // Year-end period = recap narratives
  if (YEAR_END_MONTHS.indexOf(cal.month) >= 0) {
    effects.coverageProfile.yearEndRecap = true;
    if (cal.month === 12) {
      effects.holidayNarrative = 'year_in_review';
    } else if (cal.month === 1) {
      effects.holidayNarrative = 'fresh_start';
      effects.hopeFactor += 0.1;
    }
  }

  // Party holidays = nightlife coverage
  var partyHolidays = ['NewYearsEve', 'StPatricksDay', 'Halloween'];
  if (partyHolidays.indexOf(cal.holiday) >= 0) {
    effects.coverageProfile.nightlifeFocus = true;
    effects.holidayNarrative = 'party_coverage';
  }

  // ─────────────────────────────────────────────────────────────
  // SPORTS SEASON NARRATIVES
  // ─────────────────────────────────────────────────────────────

  if (cal.sportsSeason === 'championship') {
    effects.hopeFactor += 0.3;
    effects.celebrityBuzz += 0.25; // Athletes in spotlight
    effects.sportsNarrative = 'championship_fever';
    effects.coverageProfile.sportsDominance = 'championship';
    effects.trendAmplification.sports = 0.5;
  } else if (cal.sportsSeason === 'playoffs') {
    effects.hopeFactor += 0.2;
    effects.celebrityBuzz += 0.15;
    effects.sportsNarrative = 'playoff_drama';
    effects.coverageProfile.sportsDominance = 'playoffs';
    effects.trendAmplification.sports = 0.35;
  } else if (cal.sportsSeason === 'late-season') {
    effects.hopeFactor += 0.1;
    effects.sportsNarrative = 'pennant_race';
    effects.coverageProfile.sportsDominance = 'late-season';
    effects.trendAmplification.sports = 0.2;
  }

  if (cal.holiday === 'OpeningDay') {
    effects.hopeFactor += 0.2;
    effects.sportsNarrative = 'opening_day_optimism';
    effects.coverageProfile.sportsDominance = 'opening_day';
  }

  // ─────────────────────────────────────────────────────────────
  // FIRST FRIDAY
  // ─────────────────────────────────────────────────────────────

  if (cal.isFirstFriday) {
    effects.hopeFactor += 0.1;
    effects.coverageProfile.artsFocus = true;
    effects.coverageProfile.firstFriday = true;

    // Arts district neighborhoods get spotlight
    effects.artsSpotlight = ['Temescal', 'Uptown', 'Jack London'];
  }

  // ─────────────────────────────────────────────────────────────
  // CREATION DAY
  // ─────────────────────────────────────────────────────────────

  if (cal.isCreationDay) {
    effects.hopeFactor += 0.15;
    effects.holidayNarrative = 'oakland_pride';
    effects.coverageProfile.oaklandPride = true;
    effects.coverageProfile.localHeroes = true;
  }

  // ─────────────────────────────────────────────────────────────
  // SEASONAL MOOD
  // ─────────────────────────────────────────────────────────────

  if (cal.season === 'summer') {
    effects.hopeFactor += 0.1;
    effects.seasonalMood = 'summer_optimism';
    effects.coverageProfile.seasonalTone = 'upbeat';
  } else if (cal.season === 'winter') {
    // Winter can go either way - cozy or gloomy
    if (cal.holiday !== 'none' || cal.month === 12) {
      effects.seasonalMood = 'winter_cozy';
      effects.coverageProfile.seasonalTone = 'reflective';
    } else {
      effects.anxietyFactor += 0.05;
      effects.seasonalMood = 'winter_doldrums';
      effects.coverageProfile.seasonalTone = 'somber';
    }
  } else if (cal.season === 'spring') {
    effects.hopeFactor += 0.05;
    effects.seasonalMood = 'spring_renewal';
    effects.coverageProfile.seasonalTone = 'hopeful';
  } else if (cal.season === 'fall') {
    effects.seasonalMood = 'fall_transition';
    effects.coverageProfile.seasonalTone = 'nostalgic';
  }
}


// ============================================================
// WORLD EVENTS ANALYSIS
// ============================================================

/**
 * Analyzes world events and their media coverage impact.
 */
function analyzeWorldEventsCoverage_(ctx) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var worldEvents = S.worldEvents || [];
  var domains = S.domainPresence || {};
  var cal = ctx.mediaCalendarContext || {};

  var eventCategories = {
    crime: [],
    civic: [],
    health: [],
    weather: [],
    economic: [],
    social: [],
    political: [],
    culture: [],
    festival: [],  // v2.1
    sports: []     // v2.1
  };

  for (var ei = 0; ei < worldEvents.length; ei++) {
    var event = worldEvents[ei];
    var desc = (event.description || '').toLowerCase();
    var domain = (event.domain || '').toUpperCase();
    var severity = event.severity || 'low';

    // Use domain if available
    if (domain === 'SAFETY') {
      eventCategories.crime.push({ event: event, severity: severity });
    } else if (domain === 'CIVIC' || domain === 'INFRASTRUCTURE') {
      eventCategories.civic.push({ event: event, severity: severity });
    } else if (domain === 'HEALTH') {
      eventCategories.health.push({ event: event, severity: severity });
    } else if (domain === 'WEATHER') {
      eventCategories.weather.push({ event: event, severity: severity });
    } else if (domain === 'BUSINESS') {
      eventCategories.economic.push({ event: event, severity: severity });
    } else if (domain === 'CULTURE' || domain === 'NIGHTLIFE' || domain === 'ARTS') {
      eventCategories.culture.push({ event: event, severity: severity });
    } else if (domain === 'FESTIVAL' || domain === 'HOLIDAY') {
      eventCategories.festival.push({ event: event, severity: severity });
    } else if (domain === 'SPORTS') {
      eventCategories.sports.push({ event: event, severity: severity });
    } else {
      // Fallback to keyword detection
      if (desc.indexOf('crime') !== -1 || desc.indexOf('theft') !== -1 || desc.indexOf('assault') !== -1) {
        eventCategories.crime.push({ event: event, severity: severity });
      } else if (desc.indexOf('civic') !== -1 || desc.indexOf('protest') !== -1 || desc.indexOf('government') !== -1) {
        eventCategories.civic.push({ event: event, severity: severity });
      } else if (desc.indexOf('health') !== -1 || desc.indexOf('hospital') !== -1 || desc.indexOf('illness') !== -1) {
        eventCategories.health.push({ event: event, severity: severity });
      } else if (desc.indexOf('festival') !== -1 || desc.indexOf('parade') !== -1 || desc.indexOf('celebration') !== -1) {
        eventCategories.festival.push({ event: event, severity: severity });
      } else if (desc.indexOf('game') !== -1 || desc.indexOf('sports') !== -1 || desc.indexOf('team') !== -1) {
        eventCategories.sports.push({ event: event, severity: severity });
      } else {
        eventCategories.social.push({ event: event, severity: severity });
      }
    }
  }

  effects.coverageProfile.worldEvents = eventCategories;

  // Calculate crisis saturation (v2.1: reduced during holidays)
  // Count major/high severity civic events
  var majorCivicCount = 0;
  for (var ci = 0; ci < eventCategories.civic.length; ci++) {
    var civicSev = eventCategories.civic[ci].severity;
    if (civicSev === 'major' || civicSev === 'high') majorCivicCount++;
  }

  // Count major/high severity health events
  var majorHealthCount = 0;
  for (var hi = 0; hi < eventCategories.health.length; hi++) {
    var healthSev = eventCategories.health[hi].severity;
    if (healthSev === 'major' || healthSev === 'high') majorHealthCount++;
  }

  var crisisCount = eventCategories.crime.length + majorCivicCount + majorHealthCount;

  // v2.1: Holidays reduce crisis saturation perception
  if (cal.holiday !== 'none' && cal.holidayPriority !== 'minor') {
    crisisCount = Math.floor(crisisCount * 0.7);
  }

  if (crisisCount === 0) {
    effects.crisisSaturation = 0;
  } else if (crisisCount <= 2) {
    effects.crisisSaturation = 0.3;
  } else if (crisisCount <= 4) {
    effects.crisisSaturation = 0.6;
  } else {
    effects.crisisSaturation = 0.9;
  }

  // Domain-based anxiety/hope
  if ((domains['SAFETY'] || 0) >= 2) {
    effects.anxietyFactor += 0.15;
  }
  if ((domains['HEALTH'] || 0) >= 2) {
    effects.anxietyFactor += 0.1;
  }
  if ((domains['CULTURE'] || 0) >= 2) {
    effects.hopeFactor += 0.1;
  }
  if ((domains['COMMUNITY'] || 0) >= 2) {
    effects.hopeFactor += 0.1;
  }
  // v2.1: Festival/sports domains boost hope
  if ((domains['FESTIVAL'] || 0) >= 1) {
    effects.hopeFactor += 0.15;
  }
  if ((domains['SPORTS'] || 0) >= 1) {
    effects.hopeFactor += 0.1;
  }

  // Crime coverage increases anxiety
  if (eventCategories.crime.length > 0) {
    effects.anxietyFactor += 0.1 * eventCategories.crime.length;

    // Count major crimes
    var majorCrimesCount = 0;
    for (var cri = 0; cri < eventCategories.crime.length; cri++) {
      var crimeSev = eventCategories.crime[cri].severity;
      if (crimeSev === 'major' || crimeSev === 'high') majorCrimesCount++;
    }
    if (majorCrimesCount > 0) {
      effects.anxietyFactor += 0.2 * majorCrimesCount;
    }
  }

  // Cultural events boost hope
  if (eventCategories.culture.length > 0) {
    effects.hopeFactor += 0.1 * eventCategories.culture.length;
  }

  // v2.1: Festival events boost hope significantly
  if (eventCategories.festival.length > 0) {
    effects.hopeFactor += 0.15 * eventCategories.festival.length;
  }

  // v2.1: Sports events during season boost hope
  if (eventCategories.sports.length > 0 && cal.sportsSeason !== 'off-season') {
    effects.hopeFactor += 0.1 * eventCategories.sports.length;
  }
}


// ============================================================
// ENTERTAINMENT ANALYSIS
// ============================================================

/**
 * Analyzes entertainment media for mood signals.
 */
function analyzeEntertainmentSignals_(ctx) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var media = S.eveningMedia || {};
  var cal = ctx.mediaCalendarContext || {};

  var tv = media.tv || [];
  var movies = media.movies || [];
  var streaming = media.streaming || '';
  var sportsBroadcast = media.sportsBroadcast || '';

  // Filter TV shows by type
  var crisisTV = [];
  var comfortTV = [];
  var holidayTV = [];

  for (var ti = 0; ti < tv.length; ti++) {
    var show = tv[ti];
    if (show.indexOf('Breaking') !== -1 || show.indexOf('Crisis') !== -1 || show.indexOf('Alert') !== -1) {
      crisisTV.push(show);
    }
    if (show.indexOf('Family') !== -1 || show.indexOf('Comedy') !== -1 || show.indexOf('Neighbors') !== -1) {
      comfortTV.push(show);
    }
    if (show.indexOf('Holiday') !== -1 || show.indexOf('Special') !== -1 || show.indexOf('Celebration') !== -1) {
      holidayTV.push(show);
    }
  }

  if (crisisTV.length > comfortTV.length && holidayTV.length === 0) {
    effects.anxietyFactor += 0.1;
    effects.coverageProfile.tvMood = 'crisis-heavy';
  } else if (comfortTV.length > crisisTV.length || holidayTV.length > 0) {
    effects.hopeFactor += 0.1;
    effects.coverageProfile.tvMood = holidayTV.length > 0 ? 'holiday-special' : 'comfort-heavy';
  } else {
    effects.coverageProfile.tvMood = 'balanced';
  }

  if (streaming.indexOf('breaking') !== -1 || streaming.indexOf('crisis') !== -1) {
    effects.anxietyFactor += 0.05;
    effects.coverageProfile.streamingMood = 'anxious';
  } else if (streaming.indexOf('comfort') !== -1 || streaming.indexOf('comedy') !== -1 || streaming.indexOf('holiday') !== -1) {
    effects.hopeFactor += 0.05;
    effects.coverageProfile.streamingMood = 'relaxed';
  }

  // v2.1: Enhanced sports coverage based on season
  if (sportsBroadcast && sportsBroadcast.indexOf('Game') !== -1) {
    var sportsHype = 'moderate';
    var hopeBoost = 0.05;

    if (cal.sportsSeason === 'championship') {
      sportsHype = 'championship';
      hopeBoost = 0.15;
    } else if (cal.sportsSeason === 'playoffs') {
      sportsHype = 'playoffs';
      hopeBoost = 0.1;
    } else if (cal.sportsSeason === 'late-season') {
      sportsHype = 'pennant_race';
      hopeBoost = 0.08;
    }

    effects.coverageProfile.sportsHype = sportsHype;
    effects.hopeFactor += hopeBoost;

    // v2.1: Sports event pools based on season
    if (cal.sportsSeason === 'championship') {
      effects.eventPools.sports = [
        "couldn't escape the championship coverage",
        "felt the whole city buzzing about the championship",
        "joined the citywide championship watch party energy",
        "got caught up in championship fever",
        "wore team colors to work for the big game"
      ];
    } else if (cal.sportsSeason === 'playoffs') {
      effects.eventPools.sports = [
        "watched the playoff game with neighbors",
        "felt the playoff tension around the city",
        "discussed playoff scenarios with coworkers",
        "got swept up in playoff excitement"
      ];
    } else {
      effects.eventPools.sports = [
        "watched the game with friends",
        "got caught up in sports excitement",
        "discussed the game with coworkers",
        "felt the city's sports energy"
      ];
    }
  }
}


// ============================================================
// CELEBRITY COVERAGE
// ============================================================

/**
 * Analyzes famous people coverage and creates buzz effects.
 */
function analyzeCelebrityCoverage_(ctx) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var famousPeople = S.famousPeople || [];
  var spotlights = S.namedSpotlights || [];
  var cal = ctx.mediaCalendarContext || {};

  // Combine famous people and spotlights
  var totalBuzz = famousPeople.length + spotlights.length;

  // v2.1: Festivals/holidays increase celebrity coverage
  if (cal.holiday !== 'none' && cal.holidayPriority === 'oakland') {
    totalBuzz += 2; // Local celebrities at Oakland events
  }
  if (cal.sportsSeason === 'championship' || cal.sportsSeason === 'playoffs') {
    totalBuzz += 2; // Athletes in spotlight
  }

  effects.celebrityBuzz = Math.min(1, totalBuzz * 0.12);

  if (totalBuzz > 0) {
    effects.coverageProfile.celebrity = {
      count: totalBuzz,
      names: famousPeople.slice(0, 5),
      intensity: totalBuzz >= 5 ? 'heavy' : totalBuzz >= 3 ? 'moderate' : 'light'
    };

    effects.trendAmplification.celebrity = totalBuzz * 0.1;

    // v2.1: Context-specific celebrity pools
    if (cal.sportsSeason === 'championship' || cal.sportsSeason === 'playoffs') {
      effects.eventPools.celebrity = [
        "spotted athletes out in the city",
        "noticed sports celebrities trending everywhere",
        "overheard people discussing the team's stars",
        "saw local athletes being celebrated"
      ];
    } else if (cal.holiday !== 'none' && cal.holidayPriority === 'oakland') {
      effects.eventPools.celebrity = [
        "saw local celebrities at the celebration",
        "noticed Oakland personalities in the spotlight",
        "felt proud of local figures being recognized",
        "caught a glimpse of community leaders at the event"
      ];
    } else {
      effects.eventPools.celebrity = [
        "noticed celebrity news trending",
        "overheard people discussing a famous figure",
        "saw coverage of local celebrities",
        "felt the buzz around someone in the spotlight"
      ];
    }
  }

  // Check for famous people in active arcs
  var arcs = S.eventArcs || [];
  for (var ai = 0; ai < arcs.length; ai++) {
    var arc = arcs[ai];
    if (!arc || arc.phase === 'resolved') continue;

    // Check if any involved citizens match famous people
    var involvedCitizens = arc.involvedCitizens || [];
    var hasInvolvedFamous = false;

    for (var ci = 0; ci < involvedCitizens.length; ci++) {
      var c = involvedCitizens[ci];
      for (var fi = 0; fi < famousPeople.length; fi++) {
        var fp = famousPeople[fi];
        if ((c.id && fp.indexOf(c.id) !== -1) || (c.name && fp.indexOf(c.name) !== -1)) {
          hasInvolvedFamous = true;
          break;
        }
      }
      if (hasInvolvedFamous) break;
    }

    if (hasInvolvedFamous) {
      effects.arcAmplification.push({
        arcId: arc.arcId,
        reason: 'celebrity_involvement',
        boost: 0.5
      });
    }
  }
}


// ============================================================
// COVERAGE INTENSITY
// ============================================================

/**
 * Calculates overall coverage intensity.
 */
function calculateCoverageIntensity_(ctx) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var cal = ctx.mediaCalendarContext || {};

  var intensity = 0;

  var worldEventsCount = (S.worldEvents || []).length;
  intensity += worldEventsCount * 0.08;

  intensity += effects.crisisSaturation * 0.3;
  intensity += effects.celebrityBuzz * 0.2;

  if (S.shockFlag && S.shockFlag !== 'none') {
    intensity += 0.3;
  }

  if (S.patternFlag && S.patternFlag !== 'none') {
    intensity += 0.15;
  }

  // Count active arcs
  var eventArcs = S.eventArcs || [];
  var activeArcsCount = 0;
  for (var ai = 0; ai < eventArcs.length; ai++) {
    var a = eventArcs[ai];
    if (a && a.phase !== 'resolved') activeArcsCount++;
  }
  intensity += activeArcsCount * 0.05;

  // v2.1: Calendar events increase intensity
  if (cal.holiday !== 'none' && cal.holidayPriority === 'oakland') {
    intensity += 0.2; // Oakland festivals get heavy coverage
  }
  if (cal.sportsSeason === 'championship') {
    intensity += 0.25;
  } else if (cal.sportsSeason === 'playoffs') {
    intensity += 0.15;
  }
  if (cal.isFirstFriday) {
    intensity += 0.1;
  }
  if (cal.isCreationDay) {
    intensity += 0.15;
  }

  intensity = Math.min(1, intensity);

  if (intensity >= 0.8) {
    effects.coverageIntensity = COVERAGE_INTENSITY.SATURATED;
  } else if (intensity >= 0.5) {
    effects.coverageIntensity = COVERAGE_INTENSITY.HEAVY;
  } else if (intensity >= 0.25) {
    effects.coverageIntensity = COVERAGE_INTENSITY.MODERATE;
  } else {
    effects.coverageIntensity = COVERAGE_INTENSITY.MINIMAL;
  }

  effects.coverageIntensityScore = Math.round(intensity * 100) / 100;
}


// ============================================================
// SENTIMENT PRESSURE
// ============================================================

/**
 * Calculates how media is pushing city sentiment.
 */
function calculateSentimentPressure_(ctx) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var cal = ctx.mediaCalendarContext || {};

  var netPressure = effects.hopeFactor - effects.anxietyFactor;
  effects.sentimentPressure = Math.round(Math.max(-1, Math.min(1, netPressure)) * 100) / 100;

  // Round factors
  effects.anxietyFactor = Math.round(effects.anxietyFactor * 100) / 100;
  effects.hopeFactor = Math.round(effects.hopeFactor * 100) / 100;

  // v2.1: Calendar-aware narrative determination
  if (cal.sportsSeason === 'championship') {
    effects.mediaNarrative = 'championship_fever';
  } else if (cal.sportsSeason === 'playoffs') {
    effects.mediaNarrative = 'playoff_drama';
  } else if (cal.holiday !== 'none' && cal.holidayPriority === 'oakland') {
    effects.mediaNarrative = 'festival_celebration';
  } else if (cal.isCreationDay) {
    effects.mediaNarrative = 'oakland_pride';
  } else if (cal.isFirstFriday) {
    effects.mediaNarrative = 'arts_culture';
  } else if (FEEL_GOOD_HOLIDAYS.indexOf(cal.holiday) >= 0) {
    effects.mediaNarrative = 'holiday_warmth';
  } else if (effects.sentimentPressure >= 0.3) {
    effects.mediaNarrative = 'optimistic';
  } else if (effects.sentimentPressure <= -0.3) {
    effects.mediaNarrative = 'fearful';
  } else if (effects.crisisSaturation >= 0.6) {
    effects.mediaNarrative = 'crisis-focused';
  } else if (effects.celebrityBuzz >= 0.5) {
    effects.mediaNarrative = 'celebrity-driven';
  } else {
    effects.mediaNarrative = 'neutral';
  }
}


// ============================================================
// NEIGHBORHOOD EFFECTS
// ============================================================

/**
 * Applies media effects to Oakland neighborhoods.
 */
function applyNeighborhoodMediaEffects_(ctx) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var worldEvents = S.worldEvents || [];
  var cal = ctx.mediaCalendarContext || {};

  // v2.1: Get festival spotlight neighborhoods
  var festivalSpotlight = effects.festivalSpotlight || [];
  var artsSpotlight = effects.artsSpotlight || [];

  for (var ni = 0; ni < MEDIA_NEIGHBORHOODS.length; ni++) {
    var nh = MEDIA_NEIGHBORHOODS[ni];
    var profile = NEIGHBORHOOD_MEDIA_PROFILES[nh] || { mediaWeight: 1.0, topics: [] };

    var nhEffect = {
      coverageCount: 0,
      sentiment: 'neutral',
      perceptionShift: 0,
      topics: []
    };

    // Count mentions in world events
    for (var ei = 0; ei < worldEvents.length; ei++) {
      var event = worldEvents[ei];
      var eventNh = event.neighborhood || '';
      var desc = (event.description || '').toLowerCase();
      var domain = (event.domain || '').toLowerCase();

      if (eventNh === nh) {
        nhEffect.coverageCount++;

        // Track topics
        if (domain) nhEffect.topics.push(domain);

        // Crime/negative events hurt perception
        if (desc.indexOf('crime') !== -1 || desc.indexOf('violence') !== -1 || desc.indexOf('incident') !== -1 ||
            domain === 'safety') {
          nhEffect.perceptionShift -= 0.1 * profile.mediaWeight;
        }
        // Positive events help
        if (desc.indexOf('celebration') !== -1 || desc.indexOf('opening') !== -1 || desc.indexOf('community') !== -1 ||
            domain === 'culture' || domain === 'community' || domain === 'festival') {
          nhEffect.perceptionShift += 0.1 * profile.mediaWeight;
        }
      }
    }

    // v2.1: Festival spotlight gives positive coverage
    if (festivalSpotlight.indexOf(nh) >= 0) {
      nhEffect.coverageCount += 2;
      nhEffect.perceptionShift += 0.3;
      nhEffect.topics.push('festival');
    }

    // v2.1: Arts spotlight (First Friday)
    if (artsSpotlight.indexOf(nh) >= 0) {
      nhEffect.coverageCount += 1;
      nhEffect.perceptionShift += 0.15;
      nhEffect.topics.push('arts');
    }

    // v2.1: Sports spotlight (Jack London during games)
    if (nh === 'Jack London' && (cal.sportsSeason === 'playoffs' || cal.sportsSeason === 'championship')) {
      nhEffect.coverageCount += 2;
      nhEffect.perceptionShift += 0.25;
      nhEffect.topics.push('sports');
    }

    nhEffect.perceptionShift = Math.round(nhEffect.perceptionShift * 100) / 100;

    if (nhEffect.coverageCount >= 3) {
      nhEffect.sentiment = nhEffect.perceptionShift > 0 ? 'positive_spotlight' : 'negative_spotlight';
    } else if (nhEffect.coverageCount >= 1) {
      nhEffect.sentiment = nhEffect.perceptionShift >= 0 ? 'mentioned_positive' : 'mentioned_negative';
    }

    effects.neighborhoodEffects[nh] = nhEffect;
  }
}


// ============================================================
// ARC AMPLIFICATION
// ============================================================

/**
 * Amplifies arcs that are getting media coverage.
 */
function amplifyArcsFromCoverage_(ctx, cycle) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var arcs = S.eventArcs || [];
  var cal = ctx.mediaCalendarContext || {};

  for (var ai = 0; ai < arcs.length; ai++) {
    var arc = arcs[ai];
    if (!arc || arc.phase === 'resolved') continue;

    var arcDomain = (arc.domainTag || '').toLowerCase();
    var arcType = (arc.type || '').toLowerCase();

    var coverageBoost = 0;
    var boostReason = '';

    // Crisis arcs get boosted by crisis coverage
    if ((arcType.indexOf('crisis') !== -1 || arcDomain.indexOf('civic') !== -1) && effects.crisisSaturation > 0.3) {
      coverageBoost += effects.crisisSaturation * 0.4;
      boostReason = 'crisis_coverage';
    }

    // Safety arcs boosted by crime coverage
    var worldEventsProfile = effects.coverageProfile.worldEvents || {};
    var crimeEvents = worldEventsProfile.crime || [];
    if (arcDomain === 'safety' && crimeEvents.length > 0) {
      coverageBoost += 0.3;
      boostReason = 'crime_coverage';
    }

    // Economic arcs boosted by economic coverage
    var econEvents = worldEventsProfile.economic || [];
    if (arcDomain === 'business' && econEvents.length > 0) {
      coverageBoost += 0.25;
      boostReason = 'economic_coverage';
    }

    // Cultural arcs boosted by culture coverage
    var cultureEvents = worldEventsProfile.culture || [];
    if ((arcDomain === 'culture' || arcDomain === 'nightlife') && cultureEvents.length > 0) {
      coverageBoost += 0.2;
      boostReason = 'cultural_coverage';
    }

    // v2.1: Festival arcs boosted during holidays
    if ((arcType === 'festival' || arcDomain === 'festival') && cal.holiday !== 'none') {
      coverageBoost += 0.4;
      boostReason = 'festival_coverage';
    }

    // v2.1: Sports arcs boosted during playoffs/championship
    if (arcDomain === 'sports') {
      if (cal.sportsSeason === 'championship') {
        coverageBoost += 0.5;
        boostReason = 'championship_coverage';
      } else if (cal.sportsSeason === 'playoffs') {
        coverageBoost += 0.35;
        boostReason = 'playoff_coverage';
      }
    }

    // Arc in heavily-covered neighborhood gets boost
    if (arc.neighborhood) {
      var nhEffect = effects.neighborhoodEffects[arc.neighborhood];
      if (nhEffect && nhEffect.coverageCount >= 2) {
        coverageBoost += 0.2;
        boostReason = boostReason || 'neighborhood_spotlight';
      }
    }

    if (coverageBoost > 0) {
      coverageBoost = Math.round(coverageBoost * 100) / 100;

      effects.arcAmplification.push({
        arcId: arc.arcId,
        type: arc.type,
        neighborhood: arc.neighborhood,
        reason: boostReason,
        boost: coverageBoost
      });

      arc.tension = Math.min(10, (arc.tension || 0) + coverageBoost);
      arc.tension = Math.round(arc.tension * 100) / 100;
    }
  }
}


// ============================================================
// EVENT POOL GENERATION
// ============================================================

/**
 * Generates media-influenced event pools for citizen generators.
 */
function generateMediaEventPools_(ctx) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var cal = ctx.mediaCalendarContext || {};

  if (effects.anxietyFactor > 0.2) {
    effects.eventPools.anxious = [
      "felt unsettled by the news",
      "worried after seeing media coverage",
      "discussed concerning headlines with someone",
      "felt the weight of recent news reports",
      "tried to avoid the constant news cycle",
      "overheard anxious conversations about current events"
    ];
  }

  if (effects.hopeFactor > 0.2) {
    effects.eventPools.hopeful = [
      "felt encouraged by positive news",
      "shared an uplifting story they saw",
      "noticed the optimistic tone in coverage",
      "felt a sense of community from good news",
      "was inspired by something in the media"
    ];
  }

  if (effects.crisisSaturation > 0.5) {
    effects.eventPools.crisis = [
      "couldn't escape the crisis coverage",
      "felt overwhelmed by breaking news",
      "had crisis fatigue from constant updates",
      "talked about nothing but the current situation",
      "sought out calming content to offset the news"
    ];
  }

  if (effects.coverageIntensity === COVERAGE_INTENSITY.SATURATED) {
    effects.eventPools.saturated = [
      "felt bombarded by media coverage",
      "took a break from news and social media",
      "noticed how one story dominated everything",
      "felt the city consumed by a single narrative"
    ];
  }

  // ─────────────────────────────────────────────────────────────
  // v2.1: CALENDAR-SPECIFIC EVENT POOLS
  // ─────────────────────────────────────────────────────────────

  // Holiday event pools
  if (FEEL_GOOD_HOLIDAYS.indexOf(cal.holiday) >= 0) {
    effects.eventPools.holiday = [
      "felt warmed by holiday media coverage",
      "enjoyed seeing feel-good stories in the news",
      "noticed the lighter tone in today's coverage",
      "appreciated the holiday spirit in media",
      "shared a heartwarming story they'd seen"
    ];
  }

  // Festival event pools
  if (cal.holiday === 'OaklandPride') {
    effects.eventPools.festival = [
      "felt the Pride celebration energy everywhere",
      "saw Pride coverage dominating the feeds",
      "noticed the rainbow colors across the city",
      "felt moved by Pride stories in the media",
      "celebrated the visibility and joy of Pride"
    ];
  } else if (cal.holiday === 'ArtSoulFestival') {
    effects.eventPools.festival = [
      "caught up in Art & Soul Festival coverage",
      "felt the creative energy across Oakland",
      "saw artists being celebrated in the media",
      "noticed the festival spirit in the air"
    ];
  } else if (cal.holiday === 'LunarNewYear') {
    effects.eventPools.festival = [
      "enjoyed Lunar New Year celebration coverage",
      "felt the festive energy from Chinatown",
      "saw beautiful cultural coverage in the media",
      "noticed the community celebration spirit"
    ];
  } else if (cal.holiday === 'CincoDeMayo' || cal.holiday === 'DiaDeMuertos') {
    effects.eventPools.festival = [
      "felt the celebration energy from Fruitvale",
      "enjoyed cultural celebration coverage",
      "saw beautiful traditions highlighted in media",
      "noticed the community pride in coverage"
    ];
  } else if (cal.holiday === 'Juneteenth') {
    effects.eventPools.festival = [
      "felt moved by Juneteenth coverage",
      "saw the community celebration highlighted",
      "noticed the historical significance in media",
      "felt the pride and reflection in coverage"
    ];
  }

  // Oakland Pride (Creation Day)
  if (cal.isCreationDay) {
    effects.eventPools.oakland_pride = [
      "felt proud seeing Oakland celebrated",
      "noticed coverage highlighting local heroes",
      "saw stories celebrating Oakland's history",
      "felt the community pride in the media",
      "appreciated the focus on Oakland's strengths"
    ];
  }

  // First Friday arts
  if (cal.isFirstFriday) {
    effects.eventPools.arts = [
      "noticed First Friday coverage in the media",
      "saw local artists being featured",
      "felt the creative energy in coverage",
      "appreciated the arts focus in today's media"
    ];
  }
}


// ============================================================
// CITY DYNAMICS FEEDBACK
// ============================================================

/**
 * Applies media effects back to city dynamics.
 */
function applyMediaToCityDynamics_(ctx) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var cal = ctx.mediaCalendarContext || {};

  if (S.cityDynamics) {
    var currentSentiment = S.cityDynamics.sentiment || 0;
    var mediaShift = effects.sentimentPressure * 0.1;

    // v2.1: Calendar events have stronger positive influence
    if (cal.holiday !== 'none' && cal.holidayPriority === 'oakland') {
      mediaShift += 0.1;
    }
    if (cal.sportsSeason === 'championship') {
      mediaShift += 0.1;
    }
    if (cal.isCreationDay) {
      mediaShift += 0.05;
    }

    S.cityDynamics.sentiment = Math.round(Math.max(-1, Math.min(1, currentSentiment + mediaShift)) * 100) / 100;
    S.cityDynamics.mediaInfluence = effects.mediaNarrative;

    // v2.1: Track calendar influence
    S.cityDynamics.calendarMediaEffect = {
      holiday: cal.holiday,
      sportsSeason: cal.sportsSeason,
      narrative: effects.mediaNarrative
    };
  }
}


// ============================================================
// SUMMARY FOR CYCLE PACKET
// ============================================================

/**
 * Generates media summary for cycle packet.
 */
function generateMediaSummary_(ctx) {
  var S = ctx.summary;
  var effects = S.mediaEffects;
  var nhEffects = effects.neighborhoodEffects || {};
  var cal = ctx.mediaCalendarContext || {};

  // Find neighborhoods in spotlight
  var positiveSpotlight = [];
  var negativeSpotlight = [];

  for (var nh in nhEffects) {
    if (nhEffects.hasOwnProperty(nh)) {
      var data = nhEffects[nh];
      if (data.sentiment === 'positive_spotlight') {
        positiveSpotlight.push(nh);
      }
      if (data.sentiment === 'negative_spotlight') {
        negativeSpotlight.push(nh);
      }
    }
  }

  S.mediaSummary = {
    narrative: effects.mediaNarrative,
    intensity: effects.coverageIntensity,
    intensityScore: effects.coverageIntensityScore,
    crisisSaturation: effects.crisisSaturation,
    celebrityBuzz: effects.celebrityBuzz,
    sentimentPressure: effects.sentimentPressure,
    anxietyFactor: effects.anxietyFactor,
    hopeFactor: effects.hopeFactor,
    arcsAmplified: effects.arcAmplification.length,
    positiveSpotlight: positiveSpotlight,
    negativeSpotlight: negativeSpotlight,
    // v2.1: Calendar context
    calendarContext: {
      holiday: cal.holiday,
      holidayPriority: cal.holidayPriority,
      sportsSeason: cal.sportsSeason,
      isFirstFriday: cal.isFirstFriday,
      isCreationDay: cal.isCreationDay,
      season: cal.season
    },
    holidayNarrative: effects.holidayNarrative,
    sportsNarrative: effects.sportsNarrative,
    seasonalMood: effects.seasonalMood
  };
}


// ============================================================
// HELPER FUNCTIONS FOR OTHER ENGINES
// ============================================================

/**
 * Gets a media-influenced event for a citizen.
 */
function getMediaInfluencedEvent_(ctx) {
  // Defensive check for optional chaining replacement
  var mediaEffects = ctx.summary ? ctx.summary.mediaEffects : null;
  var pools = mediaEffects ? mediaEffects.eventPools : null;
  if (!pools) return null;

  var effects = mediaEffects;
  var cal = ctx.mediaCalendarContext || {};

  // v2.1: Priority to calendar-specific events
  var oaklandPridePool = pools.oakland_pride || [];
  if (cal.isCreationDay && oaklandPridePool.length > 0 && Math.random() < 0.4) {
    return {
      text: oaklandPridePool[Math.floor(Math.random() * oaklandPridePool.length)],
      tag: 'Media-OaklandPride'
    };
  }

  var festivalPool = pools.festival || [];
  if (festivalPool.length > 0 && Math.random() < 0.5) {
    return {
      text: festivalPool[Math.floor(Math.random() * festivalPool.length)],
      tag: 'Media-Festival'
    };
  }

  var holidayPool = pools.holiday || [];
  if (holidayPool.length > 0 && Math.random() < 0.4) {
    return {
      text: holidayPool[Math.floor(Math.random() * holidayPool.length)],
      tag: 'Media-Holiday'
    };
  }

  var artsPool = pools.arts || [];
  if (artsPool.length > 0 && cal.isFirstFriday && Math.random() < 0.35) {
    return {
      text: artsPool[Math.floor(Math.random() * artsPool.length)],
      tag: 'Media-Arts'
    };
  }

  // Sports during playoffs/championship
  var sportsPool = pools.sports || [];
  if (sportsPool.length > 0 && (cal.sportsSeason === 'playoffs' || cal.sportsSeason === 'championship')) {
    if (Math.random() < 0.5) {
      return {
        text: sportsPool[Math.floor(Math.random() * sportsPool.length)],
        tag: 'Media-Sports'
      };
    }
  }

  // Original logic
  var crisisPool = pools.crisis || [];
  if (effects.crisisSaturation > 0.6 && crisisPool.length > 0 && Math.random() < 0.4) {
    return {
      text: crisisPool[Math.floor(Math.random() * crisisPool.length)],
      tag: 'Media-Crisis'
    };
  }

  var anxiousPool = pools.anxious || [];
  if (effects.anxietyFactor > effects.hopeFactor && anxiousPool.length > 0 && Math.random() < 0.3) {
    return {
      text: anxiousPool[Math.floor(Math.random() * anxiousPool.length)],
      tag: 'Media-Anxious'
    };
  }

  var hopefulPool = pools.hopeful || [];
  if (effects.hopeFactor > effects.anxietyFactor && hopefulPool.length > 0 && Math.random() < 0.3) {
    return {
      text: hopefulPool[Math.floor(Math.random() * hopefulPool.length)],
      tag: 'Media-Hopeful'
    };
  }

  var celebrityPool = pools.celebrity || [];
  if (effects.celebrityBuzz > 0.3 && celebrityPool.length > 0 && Math.random() < 0.25) {
    return {
      text: celebrityPool[Math.floor(Math.random() * celebrityPool.length)],
      tag: 'Media-Celebrity'
    };
  }

  if (sportsPool.length > 0 && Math.random() < 0.2) {
    return {
      text: sportsPool[Math.floor(Math.random() * sportsPool.length)],
      tag: 'Media-Sports'
    };
  }

  return null;
}

/**
 * Gets probability modifier based on media climate.
 */
function getMediaEventModifier_(ctx, eventCategory) {
  // Defensive check for optional chaining replacement
  var effects = (ctx.summary && ctx.summary.mediaEffects) ? ctx.summary.mediaEffects : null;
  var cal = ctx.mediaCalendarContext || {};
  if (!effects) return 1.0;

  var modifiers = {
    'conflict': 1.0 + effects.anxietyFactor,
    'social': effects.hopeFactor > 0.2 ? 1.2 : 1.0,
    'anxious': 1.0 + effects.crisisSaturation,
    'celebrity': 1.0 + effects.celebrityBuzz,
    'crisis': effects.crisisSaturation > 0.5 ? 1.5 : 1.0,
    // v2.1: Calendar-specific modifiers
    'festival': cal.holiday !== 'none' ? 1.5 : 1.0,
    'sports': cal.sportsSeason === 'championship' ? 2.0 : cal.sportsSeason === 'playoffs' ? 1.5 : 1.0,
    'arts': cal.isFirstFriday ? 1.4 : 1.0,
    'community': cal.isCreationDay ? 1.3 : 1.0
  };

  return modifiers[eventCategory] || 1.0;
}

/**
 * Checks if media is currently saturated with a topic.
 */
function isMediaSaturated_(ctx, topic) {
  // Defensive check for optional chaining replacement
  var effects = (ctx.summary && ctx.summary.mediaEffects) ? ctx.summary.mediaEffects : null;
  var cal = ctx.mediaCalendarContext || {};
  if (!effects) return false;

  if (topic === 'crisis') return effects.crisisSaturation > 0.6;
  if (topic === 'celebrity') return effects.celebrityBuzz > 0.5;
  if (topic === 'any') return effects.coverageIntensity === COVERAGE_INTENSITY.SATURATED;
  // v2.1
  if (topic === 'sports') return cal.sportsSeason === 'championship' || cal.sportsSeason === 'playoffs';
  if (topic === 'festival') return cal.holiday !== 'none' && cal.holidayPriority === 'oakland';

  return false;
}


/**
 * ============================================================================
 * MEDIA FEEDBACK ENGINE REFERENCE v2.2
 * ============================================================================
 *
 * v2.2: ES5 syntax for Google Apps Script compatibility
 *
 * CALENDAR MEDIA MODIFIERS:
 * 
 * | Context | Hope Boost | Anxiety Mod | Narrative |
 * |---------|------------|-------------|-----------|
 * | Feel-good holidays | +0.2 | 0.7x | feel_good |
 * | Oakland festivals | +0.25 | — | celebration |
 * | Cultural holidays | +0.15 | — | cultural_celebration |
 * | Championship | +0.3 | — | championship_fever |
 * | Playoffs | +0.2 | — | playoff_drama |
 * | First Friday | +0.1 | — | arts_culture |
 * | Creation Day | +0.15 | — | oakland_pride |
 * | Summer | +0.1 | — | summer_optimism |
 * | Winter (no holiday) | — | +0.05 | winter_doldrums |
 * 
 * NEIGHBORHOOD SPOTLIGHTS:
 * - Festival neighborhoods get +2 coverage, +0.3 perception
 * - Arts neighborhoods (First Friday) get +1 coverage, +0.15 perception
 * - Jack London (playoffs/championship) gets +2 coverage, +0.25 perception
 * 
 * ARC AMPLIFICATION:
 * - Festival arcs during holidays: +0.4 boost
 * - Sports arcs during championship: +0.5 boost
 * - Sports arcs during playoffs: +0.35 boost
 * 
 * EVENT POOLS (v2.1 additions):
 * - holiday: Feel-good holiday media events
 * - festival: Festival-specific media events (Pride, Lunar NY, etc.)
 * - oakland_pride: Creation Day media events
 * - arts: First Friday arts media events
 * 
 * MEDIA NARRATIVES:
 * championship_fever, playoff_drama, festival_celebration, oakland_pride,
 * arts_culture, holiday_warmth, optimistic, fearful, crisis-focused,
 * celebrity-driven, neutral
 * 
 * ============================================================================
 */