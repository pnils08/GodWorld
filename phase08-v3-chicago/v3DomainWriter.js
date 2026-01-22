/**
 * ============================================================================
 * saveV3Domains_ v3.3
 * ============================================================================
 *
 * Saves domain presence counts to Domain_Tracker sheet with calendar context.
 *
 * v3.3 Enhancements:
 * - New domains: FESTIVAL, HOLIDAY, ARTS, ENVIRONMENT, TECHNOLOGY
 * - Calendar context columns
 * - Updated domain mappings (matches domainTracker v3.2)
 * - Calendar-aware inference
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v3.2):
 * - Domain derivation from events/arcs
 * - Dominant domain calculation
 * - Cleanup function
 * 
 * SCHEMA (27 columns):
 * Timestamp | Cycle | CIVIC | CRIME | TRANSIT | ECONOMIC | EDUCATION | HEALTH |
 * WEATHER | COMMUNITY | NIGHTLIFE | HOUSING | CULTURE | SPORTS | BUSINESS |
 * SAFETY | INFRASTRUCTURE | GENERAL | FESTIVAL | HOLIDAY | ARTS | ENVIRONMENT |
 * TECHNOLOGY | DominantDomain | TotalEvents | Holiday | SportsSeason | Notes
 * 
 * ============================================================================
 */

function saveV3Domains_(ctx) {

  const ss = ctx.ss;

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFINE ALL POSSIBLE DOMAINS (v3.3: expanded)
  // ═══════════════════════════════════════════════════════════════════════════
  const ALL_DOMAINS = [
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

  const HEADERS = [
    'Timestamp',
    'Cycle',
    ...ALL_DOMAINS,
    'DominantDomain',
    'TotalEvents',
    'Holiday',        // v3.3
    'HolidayPriority',// v3.3
    'FirstFriday',    // v3.3
    'CreationDay',    // v3.3
    'SportsSeason',   // v3.3
    'Notes'
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ENSURE SHEET WITH HEADERS
  // ═══════════════════════════════════════════════════════════════════════════
  let sheet;
  if (typeof ensureSheet_ === 'function') {
    sheet = ensureSheet_(ss, 'Domain_Tracker', HEADERS);
  } else {
    sheet = ss.getSheetByName('Domain_Tracker');
    if (!sheet) {
      sheet = ss.insertSheet('Domain_Tracker');
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
  }

  if (!sheet) {
    Logger.log('saveV3Domains_ v3.3: Could not access Domain_Tracker sheet');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL CONTEXT DATA
  // ═══════════════════════════════════════════════════════════════════════════
  const S = ctx.summary || {};
  const cycle = ctx.config.cycleCount || S.cycleId || 0;
  const now = ctx.now || new Date();

  // v3.3: Calendar context
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || 'off-season';

  // ═══════════════════════════════════════════════════════════════════════════
  // GET OR DERIVE DOMAIN PRESENCE
  // ═══════════════════════════════════════════════════════════════════════════
  let domainPresence = S.domainPresence || {};

  // If domainPresence is empty, derive from available data
  if (Object.keys(domainPresence).length === 0) {
    domainPresence = deriveDomainPresenceV33_(ctx);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE TOTALS AND DOMINANT
  // ═══════════════════════════════════════════════════════════════════════════
  let totalEvents = 0;
  let maxCount = 0;
  let dominantDomain = '';

  for (const domain of ALL_DOMAINS) {
    const count = domainPresence[domain] || 0;
    totalEvents += count;
    if (count > maxCount) {
      maxCount = count;
      dominantDomain = domain;
    }
  }

  // Use provided dominant if available
  dominantDomain = S.dominantDomain || dominantDomain || '';

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD ROW (v3.3: with calendar columns)
  // ═══════════════════════════════════════════════════════════════════════════
  const row = [
    now,
    cycle,
    ...ALL_DOMAINS.map(d => domainPresence[d] || 0),
    dominantDomain,
    totalEvents,
    holiday,          // v3.3
    holidayPriority,  // v3.3
    isFirstFriday,    // v3.3
    isCreationDay,    // v3.3
    sportsSeason,     // v3.3
    ''  // Notes
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // APPEND ROW
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    sheet.appendRow(row);
    Logger.log('saveV3Domains_ v3.3: Appended row for Cycle ' + cycle + 
               ' | Dominant: ' + dominantDomain + 
               ' | Total: ' + totalEvents +
               ' | Holiday: ' + holiday);
  } catch (e) {
    Logger.log('saveV3Domains_ v3.3 error: ' + e.message);
  }
}


/**
 * ============================================================================
 * DERIVE DOMAIN PRESENCE FROM AVAILABLE DATA (v3.3)
 * ============================================================================
 * 
 * Scans worldEvents, storySeeds, storyHooks, and eventArcs to count
 * domain activity when domainPresence isn't populated upstream.
 * Now includes FESTIVAL, HOLIDAY, ARTS, ENVIRONMENT, TECHNOLOGY domains.
 * 
 * ============================================================================
 */

function deriveDomainPresenceV33_(ctx) {
  const S = ctx.summary || {};
  const presence = {};

  // v3.3: Initialize all domains to 0 (expanded list)
  const allDomains = [
    'CIVIC', 'CRIME', 'TRANSIT', 'ECONOMIC', 'EDUCATION', 'HEALTH',
    'WEATHER', 'COMMUNITY', 'NIGHTLIFE', 'HOUSING', 'CULTURE', 
    'SPORTS', 'BUSINESS', 'SAFETY', 'INFRASTRUCTURE', 'GENERAL',
    'FESTIVAL', 'HOLIDAY', 'ARTS', 'ENVIRONMENT', 'TECHNOLOGY'
  ];
  allDomains.forEach(d => presence[d] = 0);

  // ─────────────────────────────────────────────────────────────
  // SCAN WORLD EVENTS
  // ─────────────────────────────────────────────────────────────
  const worldEvents = S.worldEvents || [];
  worldEvents.forEach(ev => {
    const domain = normalizeDomainV33_(ev.domain || ev.Domain || '');
    if (domain) presence[domain] = (presence[domain] || 0) + 1;

    // Also scan description for domain hints
    const desc = (ev.description || ev.Description || '').toLowerCase();
    const inferredDomain = inferDomainFromTextV33_(desc);
    if (inferredDomain && inferredDomain !== domain) {
      presence[inferredDomain] = (presence[inferredDomain] || 0) + 1;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // SCAN STORY SEEDS
  // ─────────────────────────────────────────────────────────────
  const storySeeds = S.storySeeds || [];
  storySeeds.forEach(seed => {
    const domain = normalizeDomainV33_(seed.domain || seed.Domain || '');
    if (domain) presence[domain] = (presence[domain] || 0) + 1;
  });

  // ─────────────────────────────────────────────────────────────
  // SCAN STORY HOOKS
  // ─────────────────────────────────────────────────────────────
  const storyHooks = S.storyHooks || [];
  storyHooks.forEach(hook => {
    const domain = normalizeDomainV33_(hook.domain || hook.Domain || '');
    if (domain) presence[domain] = (presence[domain] || 0) + 1;
  });

  // ─────────────────────────────────────────────────────────────
  // SCAN EVENT ARCS
  // ─────────────────────────────────────────────────────────────
  const eventArcs = S.eventArcs || ctx.v3Arcs || [];
  eventArcs.forEach(arc => {
    const domain = normalizeDomainV33_(arc.domainTag || arc.domain || arc.Domain || '');
    if (domain) presence[domain] = (presence[domain] || 0) + 1;

    // v3.3: Arc type can indicate domain (expanded)
    const arcType = (arc.type || arc.Type || '').toLowerCase();
    if (arcType === 'health-crisis') presence['HEALTH'] = (presence['HEALTH'] || 0) + 1;
    if (arcType === 'crisis') presence['CIVIC'] = (presence['CIVIC'] || 0) + 1;
    if (arcType === 'pattern-wave') presence['GENERAL'] = (presence['GENERAL'] || 0) + 1;
    if (arcType === 'festival') presence['FESTIVAL'] = (presence['FESTIVAL'] || 0) + 1;
    if (arcType === 'celebration') presence['HOLIDAY'] = (presence['HOLIDAY'] || 0) + 1;
    if (arcType === 'sports-fever') presence['SPORTS'] = (presence['SPORTS'] || 0) + 1;
    if (arcType === 'arts-walk') presence['ARTS'] = (presence['ARTS'] || 0) + 1;
    if (arcType === 'heritage') presence['CIVIC'] = (presence['CIVIC'] || 0) + 1;
    if (arcType === 'parade') presence['FESTIVAL'] = (presence['FESTIVAL'] || 0) + 1;
  });

  // ─────────────────────────────────────────────────────────────
  // CHECK WEATHER (always present if weather exists)
  // ─────────────────────────────────────────────────────────────
  const weather = S.weather || {};
  if (weather.type || weather.impact) {
    presence['WEATHER'] = (presence['WEATHER'] || 0) + 1;
  }

  // ─────────────────────────────────────────────────────────────
  // v3.3: CHECK CALENDAR CONTEXT
  // ─────────────────────────────────────────────────────────────
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || 'off-season';

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

  // ─────────────────────────────────────────────────────────────
  // CHECK CITY DYNAMICS FOR DOMAIN HINTS
  // ─────────────────────────────────────────────────────────────
  const dynamics = S.cityDynamics || {};
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
 * Normalize domain string to uppercase standard (v3.3: expanded)
 */
function normalizeDomainV33_(domain) {
  if (!domain) return '';
  
  const normalized = domain.toString().toUpperCase().trim();
  
  // v3.3: Map variations to standard names (expanded)
  const mappings = {
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
    // v3.3: New domains
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
 * Infer domain from text description (v3.3: expanded)
 */
function inferDomainFromTextV33_(text) {
  if (!text) return '';
  
  const lower = text.toLowerCase();
  
  // v3.3: Check new domains first
  if (lower.includes('festival') || lower.includes('parade') || lower.includes('celebration') || lower.includes('pride')) return 'FESTIVAL';
  if (lower.includes('holiday') || lower.includes('firework') || lower.includes('halloween') || lower.includes('thanksgiving')) return 'HOLIDAY';
  if (lower.includes('gallery') || lower.includes('exhibit') || lower.includes('first friday') || lower.includes('artist')) return 'ARTS';
  if (lower.includes('environment') || lower.includes('cleanup') || lower.includes('tree planting') || lower.includes('earth day')) return 'ENVIRONMENT';
  if (lower.includes('drone') || lower.includes('tech') || lower.includes('digital')) return 'TECHNOLOGY';
  
  // Existing domain checks
  if (lower.includes('health') || lower.includes('illness') || lower.includes('clinic') || lower.includes('hospital')) return 'HEALTH';
  if (lower.includes('crime') || lower.includes('theft') || lower.includes('break-in') || lower.includes('pursuit')) return 'CRIME';
  if (lower.includes('transit') || lower.includes('train') || lower.includes('bus') || lower.includes('traffic')) return 'TRANSIT';
  if (lower.includes('civic') || lower.includes('city hall') || lower.includes('mayor') || lower.includes('council')) return 'CIVIC';
  if (lower.includes('school') || lower.includes('education') || lower.includes('student')) return 'EDUCATION';
  if (lower.includes('business') || lower.includes('retail') || lower.includes('store') || lower.includes('shop')) return 'BUSINESS';
  if (lower.includes('sport') || lower.includes('game') || lower.includes('team') || lower.includes('player')) return 'SPORTS';
  if (lower.includes('weather') || lower.includes('rain') || lower.includes('snow') || lower.includes('fog')) return 'WEATHER';
  if (lower.includes('community') || lower.includes('neighbor') || lower.includes('resident')) return 'COMMUNITY';
  if (lower.includes('night') || lower.includes('bar') || lower.includes('club') || lower.includes('venue')) return 'NIGHTLIFE';
  if (lower.includes('art') || lower.includes('music') || lower.includes('concert')) return 'CULTURE';
  if (lower.includes('infrastructure') || lower.includes('power') || lower.includes('water') || lower.includes('utility')) return 'INFRASTRUCTURE';
  
  return '';
}


/**
 * ============================================================================
 * CLEANUP FUNCTION — Run manually to fix Domain_Tracker (v3.3)
 * ============================================================================
 */

function cleanupDomainTrackerV33() {
  const SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk'; // Your sheet ID
  const ss = SpreadsheetApp.openById(SIM_SSID);

  const ALL_DOMAINS = [
    'CIVIC', 'CRIME', 'TRANSIT', 'ECONOMIC', 'EDUCATION', 'HEALTH',
    'WEATHER', 'COMMUNITY', 'NIGHTLIFE', 'HOUSING', 'CULTURE', 
    'SPORTS', 'BUSINESS', 'SAFETY', 'INFRASTRUCTURE', 'GENERAL',
    'FESTIVAL', 'HOLIDAY', 'ARTS', 'ENVIRONMENT', 'TECHNOLOGY'
  ];

  const HEADERS = [
    'Timestamp',
    'Cycle',
    ...ALL_DOMAINS,
    'DominantDomain',
    'TotalEvents',
    'Holiday',
    'HolidayPriority',
    'FirstFriday',
    'CreationDay',
    'SportsSeason',
    'Notes'
  ];

  // Get existing sheet
  const oldSheet = ss.getSheetByName('Domain_Tracker');
  
  if (oldSheet) {
    // Rename old sheet as backup
    const backupName = 'Domain_Tracker_backup_' + new Date().getTime();
    oldSheet.setName(backupName);
    Logger.log('cleanupDomainTrackerV33: Backed up existing sheet to ' + backupName);
  }

  // Create new sheet with correct headers
  const newSheet = ss.insertSheet('Domain_Tracker');
  newSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  newSheet.setFrozenRows(1);

  Logger.log('cleanupDomainTrackerV33: Complete. Domain_Tracker ready for use with ' + HEADERS.length + ' columns.');
}


/**
 * ============================================================================
 * DOMAIN TRACKER SCHEMA v3.3
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
 * QUERY EXAMPLES:
 * - Festival activity by cycle: =FILTER(B:B, R:R>0)
 * - First Friday cycles: =FILTER(B:B, AB:AB=TRUE)
 * - Championship SPORTS: =FILTER(L:L, AD:AD="championship")
 * - ARTS during First Friday: =FILTER(U:U, AB:AB=TRUE)
 * 
 * ============================================================================
 */