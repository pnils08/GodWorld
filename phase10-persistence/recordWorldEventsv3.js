/**
 * ============================================================================
 * recordWorldEventsv3_ v3.3 - Write-Intent Based
 * ============================================================================
 *
 * Enhanced V3 ledger writer with GodWorld Calendar integration.
 * Writes to WorldEvents_V3_Ledger using write-intents model.
 *
 * v3.3 Changes:
 * - Uses queueBatchAppendIntent_ instead of direct writes
 * - Full dryRun/replay mode support
 * - ES5 compatible (removed const/let, arrow functions, forEach, Object.entries)
 *
 * v3.2 Features (preserved):
 * - Calendar columns (Holiday, HolidayPriority, FirstFriday, CreationDay, SportsSeason)
 * - Expanded domainMap for holiday/festival event keywords
 * - New domains: Festival, Holiday, Parade
 * - Calendar-aware impact scoring
 * - Aligned with GodWorld Calendar v1.0 and worldEventsEngine v2.4
 *
 * Previous features (v3.1):
 * - Domain/Type derivation
 * - Impact scoring
 * - Health/Civic/Economic flags
 * - Sentiment shift calculation
 *
 * ============================================================================
 */

function recordWorldEventsv3_(ctx) {

  var sheet = ctx.ss.getSheetByName('WorldEvents_V3_Ledger');
  if (!sheet) return;

  var events = ctx.summary.worldEvents || [];
  if (!events.length) return;

  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  var cycle = ctx.config.cycleCount || ctx.summary.cycleId;
  var weather = ctx.summary.weather || {};
  var dynamics = ctx.summary.cityDynamics || {};

  // Oakland neighborhoods (v3.2: expanded)
  var neighborhoods = [
    'Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt',
    'West Oakland', 'Laurel', 'Rockridge', 'Jack London',
    'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave'
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v3.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = ctx.summary.holiday || 'none';
  var holidayPriority = ctx.summary.holidayPriority || 'none';
  var isFirstFriday = ctx.summary.isFirstFriday || false;
  var isCreationDay = ctx.summary.isCreationDay || false;
  var sportsSeason = ctx.summary.sportsSeason || 'off-season';

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN MAP (v3.2 - expanded for calendar events)
  // ═══════════════════════════════════════════════════════════════════════════
  var domainMap = {
    // Health
    'symptom': 'Health', 'illness': 'Health', 'fainting': 'Health', 'ER': 'Health',
    'hospital': 'Health', 'heat exhaustion': 'Health', 'burn': 'Health', 'injury': 'Health',
    'allergy': 'Health',

    // Civic
    'protest': 'Civic', 'petition': 'Civic', 'committee': 'Civic', 'zoning': 'Civic',
    'budget': 'Civic', 'vote': 'Civic', 'complaint': 'Civic', 'public-comment': 'Civic',
    'meeting': 'Civic', 'march': 'Civic', 'rally': 'Civic', 'memorial': 'Civic',
    'ceremony': 'Civic', 'tribute': 'Civic',

    // Infrastructure
    'blackout': 'Infrastructure', 'flicker': 'Infrastructure', 'power': 'Infrastructure',
    'signal': 'Infrastructure', 'transformer': 'Infrastructure', 'pothole': 'Infrastructure',
    'water': 'Infrastructure', 'internet': 'Infrastructure', 'transit': 'Infrastructure',
    'traffic': 'Infrastructure', 'parking': 'Infrastructure', 'gridlock': 'Infrastructure',

    // Crime/Safety
    'theft': 'Safety', 'break-in': 'Safety', 'piracy': 'Safety', 'suspicious': 'Safety',
    'pursuit': 'Safety', 'graffiti': 'Safety', 'altercation': 'Safety', 'scalping': 'Safety',
    'confiscation': 'Safety', 'seizure': 'Safety',

    // Weather
    'downpour': 'Weather', 'fog': 'Weather', 'wind': 'Weather', 'temperature': 'Weather',
    'snow': 'Weather',

    // Sports (v3.2: expanded)
    "A's": 'Sports', 'practice': 'Sports', 'player': 'Sports', 'lineup': 'Sports',
    'athlete': 'Sports', 'celebration': 'Sports', 'rumor': 'Sports', 'game day': 'Sports',
    'tailgate': 'Sports', 'playoff': 'Sports', 'championship': 'Sports', 'victory': 'Sports',
    'Opening Day': 'Sports', 'first pitch': 'Sports', 'fan': 'Sports', 'stadium': 'Sports',
    'watch party': 'Sports',

    // Business
    'kitchen fire': 'Business', 'staff': 'Business', 'walkout': 'Business', 'forklift': 'Business',
    'food poisoning': 'Business', 'fender-bender': 'Business', 'vendor': 'Business',
    'food truck': 'Business', 'food cart': 'Business',

    // Education
    'school': 'Education', 'test score': 'Education', 'teacher': 'Education', 'field trip': 'Education',

    // Media/Culture
    'actor': 'Culture', 'influencer': 'Culture', 'musician': 'Culture', 'filming': 'Culture',
    'gallery': 'Culture', 'art': 'Culture', 'artist': 'Culture', 'exhibit': 'Culture',

    // Festival/Holiday (v3.2: new)
    'parade': 'Festival', 'float': 'Festival', 'festival': 'Festival', 'crowd surge': 'Festival',
    'barricade': 'Festival', 'overcrowding': 'Festival', 'costume': 'Festival',
    'fireworks': 'Holiday', 'sparkler': 'Holiday', 'countdown': 'Holiday',
    'turkey fryer': 'Holiday', 'egg hunt': 'Holiday', 'trick-or-treat': 'Holiday',
    'haunted': 'Holiday', 'pumpkin': 'Holiday', 'Halloween': 'Holiday',
    'lion dance': 'Holiday', 'firecracker': 'Holiday', 'dragon': 'Holiday',
    'mariachi': 'Holiday', 'pinata': 'Holiday', 'fiesta': 'Holiday',
    'altar': 'Holiday', 'marigold': 'Holiday', 'ofrenda': 'Holiday',
    'Pride': 'Festival', 'rainbow': 'Festival', 'glitter': 'Festival',
    'shamrock': 'Holiday', 'green beer': 'Holiday', 'pub crawl': 'Holiday',
    'BBQ': 'Holiday', 'patriotic': 'Holiday', 'flag': 'Holiday',

    // First Friday (v3.2: new)
    'First Friday': 'Culture', 'street performer': 'Culture', 'wine spill': 'Culture',

    // Creation Day (v3.2: new)
    'founders': 'Civic', 'heritage': 'Civic', 'history': 'Civic', 'Oakland': 'Civic',

    // Misc
    'earthquake': 'Environment', 'drone': 'Technology', 'balloon': 'Community',
    'lost dog': 'Community', 'flash choir': 'Community', 'lost child': 'Community',
    'cleanup': 'Environment', 'tree planting': 'Environment'
  };

  function deriveDomain(desc) {
    var lower = desc.toLowerCase();
    for (var keyword in domainMap) {
      if (domainMap.hasOwnProperty(keyword)) {
        if (lower.indexOf(keyword.toLowerCase()) >= 0) {
          return domainMap[keyword];
        }
      }
    }
    return 'General';
  }

  function deriveEventType(desc, domain) {
    if (domain === 'Health') return 'health-alert';
    if (domain === 'Civic') return 'civic-activity';
    if (domain === 'Infrastructure') return 'infra-incident';
    if (domain === 'Safety') return 'safety-incident';
    if (domain === 'Weather') return 'weather-event';
    if (domain === 'Sports') return 'sports-news';
    if (domain === 'Business') return 'business-incident';
    if (domain === 'Education') return 'education-news';
    if (domain === 'Culture') return 'cultural-sighting';
    if (domain === 'Environment') return 'environmental';
    if (domain === 'Community') return 'community-moment';
    if (domain === 'Festival') return 'festival-incident';  // v3.2
    if (domain === 'Holiday') return 'holiday-incident';    // v3.2
    if (domain === 'Technology') return 'tech-incident';
    return 'misc-event';
  }

  function calculateImpact(severity, weatherObj, sentiment, hol, sports) {
    var impact = severity === 'high' ? 5 : severity === 'medium' ? 3 : 1;
    if (weatherObj.impact >= 1.3) impact += 1;
    if (sentiment <= -0.3) impact += 1;

    // v3.2: Calendar impact modifiers
    if (hol !== 'none') impact += 1;
    if (sports === 'championship') impact += 1;
    if (sports === 'playoffs') impact += 0.5;

    return Math.round(impact);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD EVENT ROWS
  // ═══════════════════════════════════════════════════════════════════════════

  var rows = [];
  var now = new Date();

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var desc = ev.description || '';
    var severity = ev.severity || 'low';
    var domain = ev.domain || deriveDomain(desc);
    var eventType = deriveEventType(desc, domain);
    var neighborhood = ev.neighborhood || neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
    var impactScore = calculateImpact(severity, weather, dynamics.sentiment || 0, holiday, sportsSeason);

    // Flags based on domain
    var healthFlag = domain === 'Health' ? 1 : 0;
    var civicFlag = domain === 'Civic' ? 1 : 0;
    var economicFlag = (domain === 'Business' || dynamics.sentiment <= -0.4) ? 1 : 0;
    var festivalFlag = (domain === 'Festival' || domain === 'Holiday') ? 1 : 0; // v3.2

    // Sentiment shift estimate
    var sentimentShift = 0;
    if (severity === 'high') sentimentShift = -0.08;
    else if (severity === 'medium') sentimentShift = -0.05;
    if (domain === 'Culture' || domain === 'Community') sentimentShift = 0.02;
    if (domain === 'Festival') sentimentShift = 0.03; // v3.2: Festivals boost sentiment
    if (domain === 'Safety' || domain === 'Health') sentimentShift = -0.03;

    // V3 signal counts
    var textureCount = (ctx.summary.textureTriggers || []).length;
    var hookCount = (ctx.summary.storyHooks || []).length;

    rows.push([
      now,                                     // A - Timestamp
      cycle,                                   // B - Cycle
      desc,                                    // C - EventDescription
      eventType,                               // D - EventType
      domain,                                  // E - Domain
      severity,                                // F - Severity
      neighborhood,                            // G - Neighborhood
      impactScore,                             // H - ImpactScore
      Math.round(impactScore * 50),            // I - PopulationAffected (estimate)
      healthFlag,                              // J - HealthFlag
      civicFlag,                               // K - CivicFlag
      economicFlag,                            // L - EconomicFlag
      festivalFlag,                            // M - FestivalFlag (v3.2)
      Math.round(sentimentShift * 100) / 100,  // N - SentimentShift
      weather.type || 'clear',                 // O - WeatherType
      weather.impact || 1,                     // P - WeatherImpact
      dynamics.sentiment || 0,                 // Q - CitySentiment
      textureCount,                            // R - TextureSignal
      hookCount,                               // S - StoryHookSignal
      ctx.summary.civicLoad || 'stable',       // T - CivicLoad
      ctx.summary.shockFlag || 'none',         // U - ShockFlag
      ctx.summary.patternFlag || 'none',       // V - PatternFlag
      holiday,                                 // W - Holiday (v3.2)
      holidayPriority,                         // X - HolidayPriority (v3.2)
      isFirstFriday,                           // Y - FirstFriday (v3.2)
      isCreationDay,                           // Z - CreationDay (v3.2)
      sportsSeason,                            // AA - SportsSeason (v3.2)
      'ENGINE',                                // AB - SourceEngine
      'pending'                                // AC - CanonStatus
    ]);
  }

  // Queue batch append intent
  if (rows.length > 0) {
    queueBatchAppendIntent_(
      ctx,
      'WorldEvents_V3_Ledger',
      rows,
      'Record ' + rows.length + ' V3 events for cycle ' + cycle,
      'events',
      100
    );
  }

  Logger.log('recordWorldEventsv3_ v3.3: Queued ' + rows.length + ' events | Holiday: ' + holiday + ' | Sports: ' + sportsSeason);
}


/**
 * ============================================================================
 * WORLD EVENTS V3 LEDGER SCHEMA v3.3
 * ============================================================================
 *
 * COLUMNS (29):
 * A - Timestamp
 * B - Cycle
 * C - EventDescription
 * D - EventType
 * E - Domain
 * F - Severity
 * G - Neighborhood
 * H - ImpactScore
 * I - PopulationAffected
 * J - HealthFlag
 * K - CivicFlag
 * L - EconomicFlag
 * M - FestivalFlag (v3.2)
 * N - SentimentShift
 * O - WeatherType
 * P - WeatherImpact
 * Q - CitySentiment
 * R - TextureSignal
 * S - StoryHookSignal
 * T - CivicLoad
 * U - ShockFlag
 * V - PatternFlag
 * W - Holiday (v3.2)
 * X - HolidayPriority (v3.2)
 * Y - FirstFriday (v3.2)
 * Z - CreationDay (v3.2)
 * AA - SportsSeason (v3.2)
 * AB - SourceEngine
 * AC - CanonStatus
 *
 * NEW DOMAINS (v3.2):
 * - Festival: parade, float, crowd surge, overcrowding, Pride, etc.
 * - Holiday: fireworks, sparkler, turkey fryer, trick-or-treat, etc.
 *
 * NEW EVENT TYPES (v3.2):
 * - festival-incident
 * - holiday-incident
 *
 * QUERY EXAMPLES:
 * - All festival events: =FILTER(C:C, E:E="Festival")
 * - Pride events: =FILTER(C:C, W:W="OaklandPride")
 * - Championship season: =FILTER(C:C, AA:AA="championship")
 * - First Friday incidents: =FILTER(C:C, Y:Y=TRUE)
 *
 * ============================================================================
 */
