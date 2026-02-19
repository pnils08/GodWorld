/**
 * ============================================================================
 * recordWorldEventsv3_ v3.5 - Write-Intent Based
 * ============================================================================
 *
 * Enhanced V3 ledger writer with GodWorld Calendar integration.
 * Writes to WorldEvents_V3_Ledger using write-intents model.
 *
 * v3.5 Changes:
 * - Deprecated 16 more dead columns (H-V, AB, AC → empty strings)
 *   Only A-G (Timestamp, Cycle, Desc, Type, Domain, Severity, Neighborhood)
 *   are ever read downstream. All flags, scores, signals, weather context
 *   were written but never consumed from the sheet.
 * - Fixed Math.random() → ctx.rng for deterministic neighborhood assignment
 * - Domain-aware neighborhood mapping: sports → Jack London, civic → Downtown, etc.
 * - Removed dead calculation code (calculateImpact, flags, sentimentShift, signals)
 *
 * v3.4 Changes:
 * - Stopped writing dead calendar columns (W-AA now empty strings)
 *   Calendar data is already in ctx.summary — sheet duplication was never read
 *
 * v3.3 Changes:
 * - Uses queueBatchAppendIntent_ instead of direct writes
 * - Full dryRun/replay mode support
 * - ES5 compatible (removed const/let, arrow functions, forEach, Object.entries)
 *
 * v3.2 Features (preserved):
 * - Expanded domainMap for holiday/festival event keywords
 * - New domains: Festival, Holiday, Parade
 * - Calendar-aware impact scoring
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
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  var sheet = ctx.ss.getSheetByName('WorldEvents_V3_Ledger');
  if (!sheet) return;

  var events = ctx.summary.worldEvents || [];
  if (!events.length) return;

  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  var cycle = ctx.config.cycleCount || ctx.summary.cycleId;

  // Oakland neighborhoods (v3.2: expanded)
  var neighborhoods = [
    'Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt',
    'West Oakland', 'Laurel', 'Rockridge', 'Jack London',
    'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave'
  ];

  // v3.5: Domain → preferred neighborhoods (meaningful assignment)
  var domainNeighborhoods = {
    'Sports':         ['Jack London', 'Downtown', 'West Oakland'],
    'Culture':        ['Temescal', 'KONO', 'Uptown', 'Jack London'],
    'Business':       ['Downtown', 'Jack London', 'Uptown'],
    'Safety':         ['West Oakland', 'Downtown', 'Fruitvale', 'Chinatown'],
    'Civic':          ['Downtown', 'Lake Merritt', 'Uptown'],
    'Health':         ['Fruitvale', 'West Oakland', 'Downtown', 'Chinatown'],
    'Education':      ['Fruitvale', 'Temescal', 'Laurel', 'Rockridge'],
    'Infrastructure': ['West Oakland', 'Downtown', 'Fruitvale', 'Chinatown'],
    'Festival':       ['Jack London', 'Downtown', 'Uptown', 'Lake Merritt'],
    'Holiday':        ['Lake Merritt', 'Temescal', 'Piedmont Ave', 'Rockridge'],
    'Environment':    ['Lake Merritt', 'West Oakland', 'Fruitvale'],
    'Community':      ['Temescal', 'Fruitvale', 'Laurel', 'West Oakland'],
    'Technology':     ['Uptown', 'KONO', 'Rockridge']
  };

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

  // v3.5: calculateImpact, flags, sentimentShift, signal counts removed
  // All downstream consumers read ctx.summary in-memory, not from sheet columns

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

    // v3.5: Domain-aware neighborhood (deterministic rng)
    var pool = domainNeighborhoods[domain] || neighborhoods;
    var neighborhood = ev.neighborhood || pool[Math.floor(rng() * pool.length)];

    rows.push([
      now,                                     // A - Timestamp
      cycle,                                   // B - Cycle
      desc,                                    // C - EventDescription
      eventType,                               // D - EventType
      domain,                                  // E - Domain
      severity,                                // F - Severity
      neighborhood,                            // G - Neighborhood
      '',                                      // H - ImpactScore (deprecated v3.5)
      '',                                      // I - PopulationAffected (deprecated v3.5)
      '',                                      // J - HealthFlag (deprecated v3.5)
      '',                                      // K - CivicFlag (deprecated v3.5)
      '',                                      // L - EconomicFlag (deprecated v3.5)
      '',                                      // M - FestivalFlag (deprecated v3.5)
      '',                                      // N - SentimentShift (deprecated v3.5)
      '',                                      // O - WeatherType (deprecated v3.5)
      '',                                      // P - WeatherImpact (deprecated v3.5)
      '',                                      // Q - CitySentiment (deprecated v3.5)
      '',                                      // R - TextureSignal (deprecated v3.5)
      '',                                      // S - StoryHookSignal (deprecated v3.5)
      '',                                      // T - CivicLoad (deprecated v3.5)
      '',                                      // U - ShockFlag (deprecated v3.5)
      '',                                      // V - PatternFlag (deprecated v3.5)
      '',                                      // W - Holiday (deprecated v3.4)
      '',                                      // X - HolidayPriority (deprecated v3.4)
      '',                                      // Y - FirstFriday (deprecated v3.4)
      '',                                      // Z - CreationDay (deprecated v3.4)
      '',                                      // AA - SportsSeason (deprecated v3.4)
      '',                                      // AB - SourceEngine (deprecated v3.5)
      ''                                       // AC - CanonStatus (deprecated v3.5)
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

  Logger.log('recordWorldEventsv3_ v3.5: Queued ' + rows.length + ' events for cycle ' + cycle);
}


/**
 * ============================================================================
 * WORLD EVENTS V3 LEDGER SCHEMA v3.5
 * ============================================================================
 *
 * COLUMNS (29 — only A-G active):
 * A - Timestamp
 * B - Cycle
 * C - EventDescription
 * D - EventType
 * E - Domain
 * F - Severity
 * G - Neighborhood (v3.5: domain-aware assignment)
 * H - (deprecated v3.5, was ImpactScore)
 * I - (deprecated v3.5, was PopulationAffected)
 * J - (deprecated v3.5, was HealthFlag)
 * K - (deprecated v3.5, was CivicFlag)
 * L - (deprecated v3.5, was EconomicFlag)
 * M - (deprecated v3.5, was FestivalFlag)
 * N - (deprecated v3.5, was SentimentShift)
 * O - (deprecated v3.5, was WeatherType)
 * P - (deprecated v3.5, was WeatherImpact)
 * Q - (deprecated v3.5, was CitySentiment)
 * R - (deprecated v3.5, was TextureSignal)
 * S - (deprecated v3.5, was StoryHookSignal)
 * T - (deprecated v3.5, was CivicLoad)
 * U - (deprecated v3.5, was ShockFlag)
 * V - (deprecated v3.5, was PatternFlag)
 * W - (deprecated v3.4, was Holiday)
 * X - (deprecated v3.4, was HolidayPriority)
 * Y - (deprecated v3.4, was FirstFriday)
 * Z - (deprecated v3.4, was CreationDay)
 * AA - (deprecated v3.4, was SportsSeason)
 * AB - (deprecated v3.5, was SourceEngine)
 * AC - (deprecated v3.5, was CanonStatus)
 *
 * Note: Only columns A-G contain active data. All downstream consumers
 * read ctx.summary in-memory, not from sheet columns. Columns H-AC
 * were calculated and written but never consumed from the sheet.
 * Historical data retained; new rows write empty strings.
 *
 * ============================================================================
 */
