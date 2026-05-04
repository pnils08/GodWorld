/**
 * ============================================================================
 * recordWorldEventsv3_ v3.7 - Write-Intent Based
 * ============================================================================
 *
 * Enhanced V3 ledger writer with GodWorld Calendar integration.
 * Writes to WorldEvents_V3_Ledger using write-intents model.
 *
 * v3.7 Changes (S199 ev.domain case discipline):
 * - Standardized Domain on UPPERCASE end-to-end (matches the dominant 209-row
 *   live state from worldEventsEngine.js _domain pools + matches all reader
 *   expectations: applyShockMonitor.js `=== "SAFETY"`, mediaRoomBriefingGenerator.js
 *   `=== 'CIVIC'/'TRANSIT'/'INFRASTRUCTURE'`).
 * - domainMap values lowercased→UPPERCASE ('Health'→'HEALTH', 'Civic'→'CIVIC', etc.)
 *   so deriveDomain emits UPPERCASE on text-classification fallback.
 * - domainNeighborhoods keys lowercased→UPPERCASE so per-domain neighborhood pool
 *   lookups resolve correctly when domain is UPPERCASE (was silently falling
 *   back to all-neighborhoods because 'CIVIC' didn't match key 'Civic').
 * - deriveEventType comparisons lowercased→UPPERCASE so eventType derivation
 *   produces the right semantic label (was returning 'misc-event' for ~209
 *   rows because 'CIVIC' didn't match `if (domain === 'Civic')` chain — root
 *   cause of ENGINE_REPAIR Row 6's 91% misc-event problem on the Domain side).
 * - Added belt-and-suspenders `String(...).toUpperCase()` at the domain pickup
 *   site so any future writer that forgets the convention gets normalized.
 * - 4 historical Title Case rows on the live ledger left as-is (low impact;
 *   readers already check UPPERCASE so they're effectively orphaned but harmless).
 *
 * v3.6 Changes (S185 polish):
 * - deriveDomain: word-boundary keyword matching (\\bkeyword\\b regex) prevents
 *   substring false-matches like "as" matching "last"/"has"/"mass"
 * - deriveDomain: domainMap iterated in length-descending order so multi-word
 *   keywords ("kitchen fire", "lost dog") match before single-word collisions
 * - domainMap: expanded with 8 keywords for common General fall-throughs
 *   (misfiled, missing, document, audit, eviction, lease, permit, application)
 * - deriveEventType: 'health-alert' renamed to 'health-event' — descriptions
 *   matching health keywords aren't necessarily alerts (no downstream readers
 *   found for the 'health-alert' literal string)
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
  var rng = safeRand_(ctx);

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
    'SPORTS':         ['Jack London', 'Downtown', 'West Oakland'],
    'CULTURE':        ['Temescal', 'KONO', 'Uptown', 'Jack London'],
    'BUSINESS':       ['Downtown', 'Jack London', 'Uptown'],
    'SAFETY':         ['West Oakland', 'Downtown', 'Fruitvale', 'Chinatown'],
    'CIVIC':          ['Downtown', 'Lake Merritt', 'Uptown'],
    'HEALTH':         ['Fruitvale', 'West Oakland', 'Downtown', 'Chinatown'],
    'EDUCATION':      ['Fruitvale', 'Temescal', 'Laurel', 'Rockridge'],
    'INFRASTRUCTURE': ['West Oakland', 'Downtown', 'Fruitvale', 'Chinatown'],
    'FESTIVAL':       ['Jack London', 'Downtown', 'Uptown', 'Lake Merritt'],
    'HOLIDAY':        ['Lake Merritt', 'Temescal', 'Piedmont Ave', 'Rockridge'],
    'ENVIRONMENT':    ['Lake Merritt', 'West Oakland', 'Fruitvale'],
    'COMMUNITY':      ['Temescal', 'Fruitvale', 'Laurel', 'West Oakland'],
    'TECHNOLOGY':     ['Uptown', 'KONO', 'Rockridge']
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN MAP (v3.2 - expanded for calendar events)
  // ═══════════════════════════════════════════════════════════════════════════
  var domainMap = {
    // Health
    'symptom': 'HEALTH', 'illness': 'HEALTH', 'fainting': 'HEALTH', 'ER': 'HEALTH',
    'hospital': 'HEALTH', 'heat exhaustion': 'HEALTH', 'burn': 'HEALTH', 'injury': 'HEALTH',
    'allergy': 'HEALTH',

    // Civic
    'protest': 'CIVIC', 'petition': 'CIVIC', 'committee': 'CIVIC', 'zoning': 'CIVIC',
    'budget': 'CIVIC', 'vote': 'CIVIC', 'complaint': 'CIVIC', 'public-comment': 'CIVIC',
    'meeting': 'CIVIC', 'march': 'CIVIC', 'rally': 'CIVIC', 'memorial': 'CIVIC',
    'ceremony': 'CIVIC', 'tribute': 'CIVIC',

    // Infrastructure
    'blackout': 'INFRASTRUCTURE', 'flicker': 'INFRASTRUCTURE', 'power': 'INFRASTRUCTURE',
    'signal': 'INFRASTRUCTURE', 'transformer': 'INFRASTRUCTURE', 'pothole': 'INFRASTRUCTURE',
    'water': 'INFRASTRUCTURE', 'internet': 'INFRASTRUCTURE', 'transit': 'INFRASTRUCTURE',
    'traffic': 'INFRASTRUCTURE', 'parking': 'INFRASTRUCTURE', 'gridlock': 'INFRASTRUCTURE',

    // Crime/Safety
    'theft': 'SAFETY', 'break-in': 'SAFETY', 'piracy': 'SAFETY', 'suspicious': 'SAFETY',
    'pursuit': 'SAFETY', 'graffiti': 'SAFETY', 'altercation': 'SAFETY', 'scalping': 'SAFETY',
    'confiscation': 'SAFETY', 'seizure': 'SAFETY',

    // Weather
    'downpour': 'WEATHER', 'fog': 'WEATHER', 'wind': 'WEATHER', 'temperature': 'WEATHER',
    'snow': 'WEATHER',

    // Sports (v3.2: expanded)
    "A's": 'SPORTS', 'practice': 'SPORTS', 'player': 'SPORTS', 'lineup': 'SPORTS',
    'athlete': 'SPORTS', 'celebration': 'SPORTS', 'rumor': 'SPORTS', 'game day': 'SPORTS',
    'tailgate': 'SPORTS', 'playoff': 'SPORTS', 'championship': 'SPORTS', 'victory': 'SPORTS',
    'Opening Day': 'SPORTS', 'first pitch': 'SPORTS', 'fan': 'SPORTS', 'stadium': 'SPORTS',
    'watch party': 'SPORTS',

    // Business
    'kitchen fire': 'BUSINESS', 'staff': 'BUSINESS', 'walkout': 'BUSINESS', 'forklift': 'BUSINESS',
    'food poisoning': 'BUSINESS', 'fender-bender': 'BUSINESS', 'vendor': 'BUSINESS',
    'food truck': 'BUSINESS', 'food cart': 'BUSINESS',

    // Education
    'school': 'EDUCATION', 'test score': 'EDUCATION', 'teacher': 'EDUCATION', 'field trip': 'EDUCATION',

    // Media/Culture
    'actor': 'CULTURE', 'influencer': 'CULTURE', 'musician': 'CULTURE', 'filming': 'CULTURE',
    'gallery': 'CULTURE', 'art': 'CULTURE', 'artist': 'CULTURE', 'exhibit': 'CULTURE',

    // Festival/Holiday (v3.2: new)
    'parade': 'FESTIVAL', 'float': 'FESTIVAL', 'festival': 'FESTIVAL', 'crowd surge': 'FESTIVAL',
    'barricade': 'FESTIVAL', 'overcrowding': 'FESTIVAL', 'costume': 'FESTIVAL',
    'fireworks': 'HOLIDAY', 'sparkler': 'HOLIDAY', 'countdown': 'HOLIDAY',
    'turkey fryer': 'HOLIDAY', 'egg hunt': 'HOLIDAY', 'trick-or-treat': 'HOLIDAY',
    'haunted': 'HOLIDAY', 'pumpkin': 'HOLIDAY', 'Halloween': 'HOLIDAY',
    'lion dance': 'HOLIDAY', 'firecracker': 'HOLIDAY', 'dragon': 'HOLIDAY',
    'mariachi': 'HOLIDAY', 'pinata': 'HOLIDAY', 'fiesta': 'HOLIDAY',
    'altar': 'HOLIDAY', 'marigold': 'HOLIDAY', 'ofrenda': 'HOLIDAY',
    'Pride': 'FESTIVAL', 'rainbow': 'FESTIVAL', 'glitter': 'FESTIVAL',
    'shamrock': 'HOLIDAY', 'green beer': 'HOLIDAY', 'pub crawl': 'HOLIDAY',
    'BBQ': 'HOLIDAY', 'patriotic': 'HOLIDAY', 'flag': 'HOLIDAY',

    // First Friday (v3.2: new)
    'First Friday': 'CULTURE', 'street performer': 'CULTURE', 'wine spill': 'CULTURE',

    // Creation Day (v3.2: new)
    'founders': 'CIVIC', 'heritage': 'CIVIC', 'history': 'CIVIC', 'Oakland': 'CIVIC',

    // Misc
    'earthquake': 'ENVIRONMENT', 'drone': 'TECHNOLOGY', 'balloon': 'COMMUNITY',
    'lost dog': 'COMMUNITY', 'flash choir': 'COMMUNITY', 'lost child': 'COMMUNITY',
    'cleanup': 'ENVIRONMENT', 'tree planting': 'ENVIRONMENT',

    // v3.6 (S185): expanded for General fall-through reduction
    'misfiled': 'CIVIC', 'missing funds': 'CIVIC', 'document': 'CIVIC',
    'audit': 'CIVIC', 'eviction': 'HOUSING', 'lease': 'HOUSING',
    'permit': 'CIVIC', 'application': 'CIVIC'
  };

  // v3.6 (S185): pre-sort keywords by descending length so multi-word
  // and longer-specific keywords match before short ambiguous ones.
  // Word-boundary regex prevents "as" matching "last"/"mass"/"has".
  var sortedDomainKeys = [];
  for (var dk in domainMap) {
    if (domainMap.hasOwnProperty(dk)) sortedDomainKeys.push(dk);
  }
  sortedDomainKeys.sort(function(a, b) { return b.length - a.length; });

  function escapeRegex_(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function deriveDomain(desc) {
    if (!desc) return 'General';
    for (var i = 0; i < sortedDomainKeys.length; i++) {
      var keyword = sortedDomainKeys[i];
      var re = new RegExp('\\b' + escapeRegex_(keyword) + '\\b', 'i');
      if (re.test(desc)) return domainMap[keyword];
    }
    return 'General';
  }

  function deriveEventType(desc, domain) {
    if (domain === 'HEALTH') return 'health-event';
    if (domain === 'CIVIC') return 'civic-activity';
    if (domain === 'INFRASTRUCTURE') return 'infra-incident';
    if (domain === 'SAFETY') return 'safety-incident';
    if (domain === 'WEATHER') return 'weather-event';
    if (domain === 'SPORTS') return 'sports-news';
    if (domain === 'BUSINESS') return 'business-incident';
    if (domain === 'EDUCATION') return 'education-news';
    if (domain === 'CULTURE') return 'cultural-sighting';
    if (domain === 'ENVIRONMENT') return 'environmental';
    if (domain === 'COMMUNITY') return 'community-moment';
    if (domain === 'FESTIVAL') return 'festival-incident';  // v3.2
    if (domain === 'HOLIDAY') return 'holiday-incident';    // v3.2
    if (domain === 'TECHNOLOGY') return 'tech-incident';
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
    // S199 ev.domain case-discipline: belt-and-suspenders normalization to UPPERCASE.
    // Engine writers (worldEventsEngine.js _domain pools) emit UPPERCASE; deriveDomain
    // (post-S199) also emits UPPERCASE. This .toUpperCase() is defensive against any
    // future writer that emits lowercase or Title Case.
    var domain = String(ev.domain || deriveDomain(desc)).toUpperCase();
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

  Logger.log('recordWorldEventsv3_ v3.7: Queued ' + rows.length + ' events for cycle ' + cycle);
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
