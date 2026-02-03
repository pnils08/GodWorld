/**
 * ============================================================================
 * saveV3Domains_ v3.4 - Write-Intent Based
 * ============================================================================
 *
 * Saves domain presence counts to Domain_Tracker sheet with calendar context.
 * Uses V3 write-intents model for persistence.
 *
 * v3.4 Changes:
 * - Uses queueAppendIntent_ instead of direct writes
 * - Full dryRun/replay mode support
 * - ES5 compatible (removed const/let, spread, for...of, arrow functions)
 *
 * v3.3 Features (preserved):
 * - New domains: FESTIVAL, HOLIDAY, ARTS, ENVIRONMENT, TECHNOLOGY
 * - Calendar context columns
 * - Updated domain mappings (matches domainTracker v3.2)
 * - Calendar-aware inference
 * - Aligned with GodWorld Calendar v1.0
 *
 * SCHEMA (32 columns):
 * Timestamp | Cycle | CIVIC | CRIME | TRANSIT | ECONOMIC | EDUCATION | HEALTH |
 * WEATHER | COMMUNITY | NIGHTLIFE | HOUSING | CULTURE | SPORTS | BUSINESS |
 * SAFETY | INFRASTRUCTURE | GENERAL | FESTIVAL | HOLIDAY | ARTS | ENVIRONMENT |
 * TECHNOLOGY | DominantDomain | TotalEvents | Holiday | HolidayPriority |
 * FirstFriday | CreationDay | SportsSeason | Notes
 *
 * ============================================================================
 */

var DOMAIN_TRACKER_DOMAINS = [
  'CIVIC',
  'CRIME',
  'TRANSIT',
  'ECONOMIC',
  'EDUCATION',
  'HEALTH',
  'WEATHER',
  'COMMUNITY',
  'NIGHTLIFE',
  'HOUSING',
  'CULTURE',
  'SPORTS',
  'BUSINESS',
  'SAFETY',
  'INFRASTRUCTURE',
  'GENERAL',
  'FESTIVAL',      // v3.3
  'HOLIDAY',       // v3.3
  'ARTS',          // v3.3
  'ENVIRONMENT',   // v3.3
  'TECHNOLOGY'     // v3.3
];

var DOMAIN_TRACKER_HEADERS = [
  'Timestamp',
  'Cycle',
  'CIVIC', 'CRIME', 'TRANSIT', 'ECONOMIC', 'EDUCATION', 'HEALTH',
  'WEATHER', 'COMMUNITY', 'NIGHTLIFE', 'HOUSING', 'CULTURE',
  'SPORTS', 'BUSINESS', 'SAFETY', 'INFRASTRUCTURE', 'GENERAL',
  'FESTIVAL', 'HOLIDAY', 'ARTS', 'ENVIRONMENT', 'TECHNOLOGY',
  'DominantDomain',
  'TotalEvents',
  'Holiday',
  'HolidayPriority',
  'FirstFriday',
  'CreationDay',
  'SportsSeason',
  'Notes'
];


function saveV3Domains_(ctx) {
  var ss = ctx.ss;

  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  // Ensure sheet with headers
  var sheet = ensureSheet_(ss, 'Domain_Tracker', DOMAIN_TRACKER_HEADERS);

  if (!sheet) {
    Logger.log('saveV3Domains_ v3.4: Could not access Domain_Tracker sheet');
    return;
  }

  // Pull context data
  var S = ctx.summary || {};
  var cycle = ctx.config.cycleCount || S.cycleId || 0;
  var now = ctx.now || new Date();

  // v3.3: Calendar context
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // Get or derive domain presence
  var domainPresence = S.domainPresence || {};

  // If domainPresence is empty, derive from available data
  var hasData = false;
  for (var key in domainPresence) {
    if (domainPresence.hasOwnProperty(key)) {
      hasData = true;
      break;
    }
  }
  if (!hasData) {
    domainPresence = deriveDomainPresenceV34_(ctx);
  }

  // Calculate totals and dominant
  var totalEvents = 0;
  var maxCount = 0;
  var dominantDomain = '';

  for (var i = 0; i < DOMAIN_TRACKER_DOMAINS.length; i++) {
    var domain = DOMAIN_TRACKER_DOMAINS[i];
    var count = domainPresence[domain] || 0;
    totalEvents += count;
    if (count > maxCount) {
      maxCount = count;
      dominantDomain = domain;
    }
  }

  // Use provided dominant if available
  dominantDomain = S.dominantDomain || dominantDomain || '';

  // Build row (manually since no spread operator)
  var row = [
    now,
    cycle
  ];

  // Add domain counts
  for (var j = 0; j < DOMAIN_TRACKER_DOMAINS.length; j++) {
    row.push(domainPresence[DOMAIN_TRACKER_DOMAINS[j]] || 0);
  }

  // Add remaining columns
  row.push(dominantDomain);
  row.push(totalEvents);
  row.push(holiday);
  row.push(holidayPriority);
  row.push(isFirstFriday);
  row.push(isCreationDay);
  row.push(sportsSeason);
  row.push('');  // Notes

  // Queue append intent
  queueAppendIntent_(
    ctx,
    'Domain_Tracker',
    row,
    'Save domain presence for cycle ' + cycle,
    'events',
    100
  );

  Logger.log('saveV3Domains_ v3.4: Queued row for Cycle ' + cycle +
             ' | Dominant: ' + dominantDomain +
             ' | Total: ' + totalEvents +
             ' | Holiday: ' + holiday);
}


/**
 * ============================================================================
 * DERIVE DOMAIN PRESENCE FROM AVAILABLE DATA (v3.4)
 * ============================================================================
 *
 * Scans worldEvents, storySeeds, storyHooks, and eventArcs to count
 * domain activity when domainPresence isn't populated upstream.
 * ES5 compatible version.
 *
 * ============================================================================
 */

function deriveDomainPresenceV34_(ctx) {
  var S = ctx.summary || {};
  var presence = {};

  // Initialize all domains to 0
  for (var d = 0; d < DOMAIN_TRACKER_DOMAINS.length; d++) {
    presence[DOMAIN_TRACKER_DOMAINS[d]] = 0;
  }

  // Scan world events
  var worldEvents = S.worldEvents || [];
  for (var we = 0; we < worldEvents.length; we++) {
    var ev = worldEvents[we];
    var domain = normalizeDomainV34_(ev.domain || ev.Domain || '');
    if (domain) presence[domain] = (presence[domain] || 0) + 1;

    // Also scan description for domain hints
    var desc = (ev.description || ev.Description || '').toLowerCase();
    var inferredDomain = inferDomainFromTextV34_(desc);
    if (inferredDomain && inferredDomain !== domain) {
      presence[inferredDomain] = (presence[inferredDomain] || 0) + 1;
    }
  }

  // Scan story seeds
  var storySeeds = S.storySeeds || [];
  for (var ss = 0; ss < storySeeds.length; ss++) {
    var seed = storySeeds[ss];
    var seedDomain = normalizeDomainV34_(seed.domain || seed.Domain || '');
    if (seedDomain) presence[seedDomain] = (presence[seedDomain] || 0) + 1;
  }

  // Scan story hooks
  var storyHooks = S.storyHooks || [];
  for (var sh = 0; sh < storyHooks.length; sh++) {
    var hook = storyHooks[sh];
    var hookDomain = normalizeDomainV34_(hook.domain || hook.Domain || '');
    if (hookDomain) presence[hookDomain] = (presence[hookDomain] || 0) + 1;
  }

  // Scan event arcs
  var eventArcs = S.eventArcs || ctx.v3Arcs || [];
  for (var ea = 0; ea < eventArcs.length; ea++) {
    var arc = eventArcs[ea];
    var arcDomain = normalizeDomainV34_(arc.domainTag || arc.domain || arc.Domain || '');
    if (arcDomain) presence[arcDomain] = (presence[arcDomain] || 0) + 1;

    // Arc type can indicate domain
    var arcType = (arc.type || arc.Type || '').toLowerCase();
    if (arcType === 'health-crisis') presence['HEALTH'] = (presence['HEALTH'] || 0) + 1;
    if (arcType === 'crisis') presence['CIVIC'] = (presence['CIVIC'] || 0) + 1;
    if (arcType === 'pattern-wave') presence['GENERAL'] = (presence['GENERAL'] || 0) + 1;
    if (arcType === 'festival') presence['FESTIVAL'] = (presence['FESTIVAL'] || 0) + 1;
    if (arcType === 'celebration') presence['HOLIDAY'] = (presence['HOLIDAY'] || 0) + 1;
    if (arcType === 'sports-fever') presence['SPORTS'] = (presence['SPORTS'] || 0) + 1;
    if (arcType === 'arts-walk') presence['ARTS'] = (presence['ARTS'] || 0) + 1;
    if (arcType === 'heritage') presence['CIVIC'] = (presence['CIVIC'] || 0) + 1;
    if (arcType === 'parade') presence['FESTIVAL'] = (presence['FESTIVAL'] || 0) + 1;
  }

  // Check weather
  var weather = S.weather || {};
  if (weather.type || weather.impact) {
    presence['WEATHER'] = (presence['WEATHER'] || 0) + 1;
  }

  // Calendar context
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // Holidays boost HOLIDAY and possibly FESTIVAL
  if (holiday !== 'none') {
    presence['HOLIDAY'] = (presence['HOLIDAY'] || 0) + 1;
    if (holidayPriority === 'oakland' || holidayPriority === 'major') {
      presence['FESTIVAL'] = (presence['FESTIVAL'] || 0) + 1;
    }
  }

  // First Friday boosts ARTS
  if (isFirstFriday) {
    presence['ARTS'] = (presence['ARTS'] || 0) + 2;
    presence['CULTURE'] = (presence['CULTURE'] || 0) + 1;
  }

  // Creation Day boosts CIVIC
  if (isCreationDay) {
    presence['CIVIC'] = (presence['CIVIC'] || 0) + 1;
    presence['COMMUNITY'] = (presence['COMMUNITY'] || 0) + 1;
  }

  // Sports season boosts SPORTS
  if (sportsSeason && sportsSeason !== 'off-season') {
    presence['SPORTS'] = (presence['SPORTS'] || 0) + 1;
    if (sportsSeason === 'championship') {
      presence['SPORTS'] = (presence['SPORTS'] || 0) + 2;
    } else if (sportsSeason === 'playoffs') {
      presence['SPORTS'] = (presence['SPORTS'] || 0) + 1;
    }
  }

  // Check city dynamics for domain hints
  var dynamics = S.cityDynamics || {};
  if (dynamics.nightlife && dynamics.nightlife > 0.8) {
    presence['NIGHTLIFE'] = (presence['NIGHTLIFE'] || 0) + 1;
  }
  if (dynamics.retail && dynamics.retail > 1.1) {
    presence['BUSINESS'] = (presence['BUSINESS'] || 0) + 1;
  }
  if (dynamics.culturalActivity && dynamics.culturalActivity > 1.1) {
    presence['CULTURE'] = (presence['CULTURE'] || 0) + 1;
  }

  return presence;
}


/**
 * Normalize domain string to uppercase standard (v3.4: ES5)
 */
function normalizeDomainV34_(domain) {
  if (!domain) return '';

  var normalized = domain.toString().toUpperCase().trim();

  var mappings = {
    'SAFETY': 'SAFETY',
    'CRIME': 'CRIME',
    'CRIMINAL': 'CRIME',
    'HEALTH': 'HEALTH',
    'MEDICAL': 'HEALTH',
    'CIVIC': 'CIVIC',
    'GOVERNMENT': 'CIVIC',
    'TRANSIT': 'TRANSIT',
    'TRANSPORTATION': 'TRANSIT',
    'INFRASTRUCTURE': 'INFRASTRUCTURE',
    'ECONOMIC': 'ECONOMIC',
    'ECONOMY': 'ECONOMIC',
    'BUSINESS': 'BUSINESS',
    'COMMERCE': 'BUSINESS',
    'EDUCATION': 'EDUCATION',
    'SCHOOL': 'EDUCATION',
    'WEATHER': 'WEATHER',
    'COMMUNITY': 'COMMUNITY',
    'NEIGHBORHOOD': 'COMMUNITY',
    'NIGHTLIFE': 'NIGHTLIFE',
    'ENTERTAINMENT': 'NIGHTLIFE',
    'HOUSING': 'HOUSING',
    'CULTURE': 'CULTURE',
    'CULTURAL': 'CULTURE',
    'ART': 'ARTS',
    'ARTS': 'ARTS',
    'GALLERY': 'ARTS',
    'SPORTS': 'SPORTS',
    'ATHLETICS': 'SPORTS',
    'GENERAL': 'GENERAL',
    'FESTIVAL': 'FESTIVAL',
    'PARADE': 'FESTIVAL',
    'CELEBRATION': 'FESTIVAL',
    'HOLIDAY': 'HOLIDAY',
    'SEASONAL': 'HOLIDAY',
    'ENVIRONMENT': 'ENVIRONMENT',
    'ENVIRONMENTAL': 'ENVIRONMENT',
    'ECOLOGY': 'ENVIRONMENT',
    'TECHNOLOGY': 'TECHNOLOGY',
    'TECH': 'TECHNOLOGY'
  };

  return mappings[normalized] || normalized;
}


/**
 * Infer domain from text description (v3.4: ES5)
 */
function inferDomainFromTextV34_(text) {
  if (!text) return '';

  var lower = text.toLowerCase();

  // Check new domains first
  if (lower.indexOf('festival') >= 0 || lower.indexOf('parade') >= 0 || lower.indexOf('celebration') >= 0 || lower.indexOf('pride') >= 0) return 'FESTIVAL';
  if (lower.indexOf('holiday') >= 0 || lower.indexOf('firework') >= 0 || lower.indexOf('halloween') >= 0 || lower.indexOf('thanksgiving') >= 0) return 'HOLIDAY';
  if (lower.indexOf('gallery') >= 0 || lower.indexOf('exhibit') >= 0 || lower.indexOf('first friday') >= 0 || lower.indexOf('artist') >= 0) return 'ARTS';
  if (lower.indexOf('environment') >= 0 || lower.indexOf('cleanup') >= 0 || lower.indexOf('tree planting') >= 0 || lower.indexOf('earth day') >= 0) return 'ENVIRONMENT';
  if (lower.indexOf('drone') >= 0 || lower.indexOf('tech') >= 0 || lower.indexOf('digital') >= 0) return 'TECHNOLOGY';

  // Existing domain checks
  if (lower.indexOf('health') >= 0 || lower.indexOf('illness') >= 0 || lower.indexOf('clinic') >= 0 || lower.indexOf('hospital') >= 0) return 'HEALTH';
  if (lower.indexOf('crime') >= 0 || lower.indexOf('theft') >= 0 || lower.indexOf('break-in') >= 0 || lower.indexOf('pursuit') >= 0) return 'CRIME';
  if (lower.indexOf('transit') >= 0 || lower.indexOf('train') >= 0 || lower.indexOf('bus') >= 0 || lower.indexOf('traffic') >= 0) return 'TRANSIT';
  if (lower.indexOf('civic') >= 0 || lower.indexOf('city hall') >= 0 || lower.indexOf('mayor') >= 0 || lower.indexOf('council') >= 0) return 'CIVIC';
  if (lower.indexOf('school') >= 0 || lower.indexOf('education') >= 0 || lower.indexOf('student') >= 0) return 'EDUCATION';
  if (lower.indexOf('business') >= 0 || lower.indexOf('retail') >= 0 || lower.indexOf('store') >= 0 || lower.indexOf('shop') >= 0) return 'BUSINESS';
  if (lower.indexOf('sport') >= 0 || lower.indexOf('game') >= 0 || lower.indexOf('team') >= 0 || lower.indexOf('player') >= 0) return 'SPORTS';
  if (lower.indexOf('weather') >= 0 || lower.indexOf('rain') >= 0 || lower.indexOf('snow') >= 0 || lower.indexOf('fog') >= 0) return 'WEATHER';
  if (lower.indexOf('community') >= 0 || lower.indexOf('neighbor') >= 0 || lower.indexOf('resident') >= 0) return 'COMMUNITY';
  if (lower.indexOf('night') >= 0 || lower.indexOf('bar') >= 0 || lower.indexOf('club') >= 0 || lower.indexOf('venue') >= 0) return 'NIGHTLIFE';
  if (lower.indexOf('art') >= 0 || lower.indexOf('music') >= 0 || lower.indexOf('concert') >= 0) return 'CULTURE';
  if (lower.indexOf('infrastructure') >= 0 || lower.indexOf('power') >= 0 || lower.indexOf('water') >= 0 || lower.indexOf('utility') >= 0) return 'INFRASTRUCTURE';

  return '';
}


/**
 * ============================================================================
 * CLEANUP FUNCTION — Run manually to fix Domain_Tracker (v3.4)
 * ============================================================================
 */

function cleanupDomainTrackerV34() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID

  // Get existing sheet
  var oldSheet = ss.getSheetByName('Domain_Tracker');

  if (oldSheet) {
    var backupName = 'Domain_Tracker_backup_' + new Date().getTime();
    oldSheet.setName(backupName);
    Logger.log('cleanupDomainTrackerV34: Backed up existing sheet to ' + backupName);
  }

  // Create new sheet with correct headers
  var newSheet = ss.insertSheet('Domain_Tracker');
  newSheet.getRange(1, 1, 1, DOMAIN_TRACKER_HEADERS.length).setValues([DOMAIN_TRACKER_HEADERS]);
  newSheet.setFrozenRows(1);

  Logger.log('cleanupDomainTrackerV34: Complete. Domain_Tracker ready with ' + DOMAIN_TRACKER_HEADERS.length + ' columns.');
}


/**
 * ============================================================================
 * DOMAIN TRACKER SCHEMA v3.4
 * ============================================================================
 *
 * COLUMNS (32):
 * A - Timestamp
 * B - Cycle
 * C-W - Domain counts (21 domains):
 *       CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH,
 *       WEATHER, COMMUNITY, NIGHTLIFE, HOUSING, CULTURE,
 *       SPORTS, BUSINESS, SAFETY, INFRASTRUCTURE, GENERAL,
 *       FESTIVAL, HOLIDAY, ARTS, ENVIRONMENT, TECHNOLOGY
 * X - DominantDomain
 * Y - TotalEvents
 * Z - Holiday
 * AA - HolidayPriority
 * AB - FirstFriday
 * AC - CreationDay
 * AD - SportsSeason
 * AE - Notes
 *
 * ============================================================================
 */
