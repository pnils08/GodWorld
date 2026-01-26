/**
 * ============================================================================
 * applyDomainCooldowns_ v2.4
 * ============================================================================
 *
 * Manages domain cooldowns with severity-based duration and calendar awareness.
 *
 * v2.4 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx/summary
 * - for loops instead of for...of
 *
 * v2.3 Features:
 * - Filters to current cycle events only (prevents cooldown refresh from old events)
 * - Uses ev.cycle to match current cycleId
 *
 * v2.2 Features:
 * - FESTIVAL/HOLIDAY domains shorter cooldowns during holidays
 * - SPORTS domain shorter cooldowns during playoffs/championship
 * - ARTS domain shorter cooldowns during First Friday
 * - CIVIC/COMMUNITY shorter cooldowns during Creation Day
 * - Calendar context in output
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Severity-based cooldown duration
 * - Priority domains (HEALTH, SAFETY, INFRASTRUCTURE)
 * - Long cooldown domains (CULTURE, COMMUNITY, MICRO)
 *
 * ============================================================================
 */

function applyDomainCooldowns_(ctx) {
  // Defensive guard
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};

  var S = ctx.summary;
  var cooldowns = S.domainCooldowns || {};

  // v2.3: Current cycle ID for filtering events
  var currentCycle = S.absoluteCycle || S.cycleId || (ctx.config ? ctx.config.cycleCount : 0) || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN CLASSIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Priority domains that can fire more frequently (always)
  var priorityDomains = ['HEALTH', 'SAFETY', 'INFRASTRUCTURE'];

  // Long cooldown domains (prevent spam on normal days)
  var longCooldownDomains = ['CULTURE', 'COMMUNITY', 'MICRO'];

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: CALENDAR-BOOSTED DOMAINS (shorter cooldowns today)
  // ═══════════════════════════════════════════════════════════════════════════
  var calendarBoostedDomains = [];

  // Any holiday → FESTIVAL and HOLIDAY domains flow freely
  if (holiday !== 'none') {
    calendarBoostedDomains.push('FESTIVAL', 'HOLIDAY');
  }

  // Major/Oakland holidays → extra boost
  if (holidayPriority === 'major' || holidayPriority === 'oakland') {
    calendarBoostedDomains.push('COMMUNITY', 'CULTURE');
  }

  // Big celebration days → everything celebration-related flows
  var bigCelebrations = ['OaklandPride', 'ArtSoulFestival', 'NewYearsEve', 'Independence'];
  if (bigCelebrations.indexOf(holiday) !== -1) {
    calendarBoostedDomains.push('NIGHTLIFE', 'COMMUNITY', 'CULTURE');
  }

  // Cultural festivals → CULTURE and COMMUNITY
  var culturalFestivals = ['LunarNewYear', 'CincoDeMayo', 'DiaDeMuertos', 'Juneteenth'];
  if (culturalFestivals.indexOf(holiday) !== -1) {
    calendarBoostedDomains.push('CULTURE', 'COMMUNITY');
  }

  // Sports seasons → SPORTS domain
  if (sportsSeason === 'championship' || sportsSeason === 'playoffs') {
    calendarBoostedDomains.push('SPORTS');
  }
  if (holiday === 'OpeningDay') {
    calendarBoostedDomains.push('SPORTS');
  }

  // First Friday → ARTS and CULTURE
  if (isFirstFriday) {
    calendarBoostedDomains.push('ARTS', 'CULTURE', 'NIGHTLIFE');
  }

  // Creation Day → CIVIC and COMMUNITY
  if (isCreationDay) {
    calendarBoostedDomains.push('CIVIC', 'COMMUNITY');
  }

  // Party holidays → NIGHTLIFE
  if (holiday === 'StPatricksDay' || holiday === 'Halloween' || holiday === 'NewYearsEve') {
    calendarBoostedDomains.push('NIGHTLIFE');
  }

  // Dedupe boosted domains (ES5 compatible)
  var seenBoosted = {};
  var uniqueBoostedDomains = [];
  for (var bi = 0; bi < calendarBoostedDomains.length; bi++) {
    var bd = calendarBoostedDomains[bi];
    if (!seenBoosted[bd]) {
      seenBoosted[bd] = true;
      uniqueBoostedDomains.push(bd);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: CALENDAR-SUPPRESSED DOMAINS (longer cooldowns today)
  // ═══════════════════════════════════════════════════════════════════════════
  var calendarSuppressedDomains = [];

  // Quiet family holidays → suppress nightlife/party domains
  var quietHolidays = ['Thanksgiving', 'Easter', 'MothersDay', 'FathersDay'];
  if (quietHolidays.indexOf(holiday) !== -1) {
    calendarSuppressedDomains.push('NIGHTLIFE', 'CRIME');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY COOLDOWN DECAY EACH CYCLE
  // ═══════════════════════════════════════════════════════════════════════════
  for (var cdKey in cooldowns) {
    if (cooldowns.hasOwnProperty(cdKey)) {
      var decay = 1;

      // v2.2: Calendar-boosted domains decay faster
      if (uniqueBoostedDomains.indexOf(cdKey) !== -1) {
        decay = 2; // Double decay rate
      }

      cooldowns[cdKey] = Math.max(0, cooldowns[cdKey] - decay);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS THIS CYCLE'S EVENTS ONLY (v2.3: filter to current cycle)
  // ═══════════════════════════════════════════════════════════════════════════
  var allEvents = S.worldEvents || [];
  var todaysEvents = [];
  for (var ei = 0; ei < allEvents.length; ei++) {
    var ev = allEvents[ei];
    // If event has cycle property, match it; otherwise assume it's from this cycle
    var evCycle = (typeof ev.cycle === 'number') ? ev.cycle : currentCycle;
    if (evCycle === currentCycle) {
      todaysEvents.push(ev);
    }
  }

  if (todaysEvents.length > 0) {
    for (var ti = 0; ti < todaysEvents.length; ti++) {
      var tevt = todaysEvents[ti];
      var d = (tevt.domain || "").toUpperCase();
      if (!d) continue;

      // Determine cooldown duration based on severity and domain type
      var cooldownDuration = 2; // default

      // Severity affects cooldown
      var severity = (tevt.severity || '').toLowerCase();
      if (severity === 'high' || severity === 'major' || severity === 'critical') {
        cooldownDuration = 3;
      } else if (severity === 'low') {
        cooldownDuration = 1;
      }

      // Priority domains recover faster (always)
      if (priorityDomains.indexOf(d) !== -1) {
        cooldownDuration = Math.max(1, cooldownDuration - 1);
      }

      // Long cooldown domains take longer (on normal days)
      if (longCooldownDomains.indexOf(d) !== -1 && uniqueBoostedDomains.indexOf(d) === -1) {
        cooldownDuration += 1;
      }

      // v2.2: Calendar-boosted domains have shorter cooldowns
      if (uniqueBoostedDomains.indexOf(d) !== -1) {
        cooldownDuration = Math.max(0, cooldownDuration - 1);
      }

      // v2.2: Calendar-suppressed domains have longer cooldowns
      if (calendarSuppressedDomains.indexOf(d) !== -1) {
        cooldownDuration += 1;
      }

      // Set cooldown (use max if already cooling)
      cooldowns[d] = Math.max(cooldowns[d] || 0, cooldownDuration);
    }
  }

  S.domainCooldowns = cooldowns;

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD SUPPRESSION MAP
  // ═══════════════════════════════════════════════════════════════════════════
  S.suppressDomains = {};
  for (var sdKey in cooldowns) {
    if (cooldowns.hasOwnProperty(sdKey)) {
      if (cooldowns[sdKey] > 0) {
        S.suppressDomains[sdKey] = true;
        S.suppressDomains[sdKey.toLowerCase()] = true;
      }
    }
  }

  // Track active cooldowns for debugging
  var activeArr = [];
  for (var acKey in cooldowns) {
    if (cooldowns.hasOwnProperty(acKey) && cooldowns[acKey] > 0) {
      activeArr.push(acKey + ':' + cooldowns[acKey]);
    }
  }
  S.activeCooldowns = activeArr.length > 0 ? activeArr.join(', ') : 'none';

  // v2.2: Calendar context for debugging
  S.cooldownCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    boostedDomains: uniqueBoostedDomains,
    suppressedDomains: calendarSuppressedDomains
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * DOMAIN COOLDOWNS REFERENCE v2.2
 * ============================================================================
 * 
 * BASE COOLDOWN DURATIONS:
 * - Default: 2 cycles
 * - High severity: 3 cycles
 * - Low severity: 1 cycle
 * 
 * DOMAIN MODIFIERS (always active):
 * - Priority (HEALTH, SAFETY, INFRASTRUCTURE): -1 cycle
 * - Long cooldown (CULTURE, COMMUNITY, MICRO): +1 cycle (normal days only)
 * 
 * CALENDAR-BOOSTED DOMAINS (v2.2):
 * 
 * | Context | Boosted Domains |
 * |---------|-----------------|
 * | Any holiday | FESTIVAL, HOLIDAY |
 * | Major/Oakland priority | COMMUNITY, CULTURE |
 * | Pride/ArtSoul/NYE/July4 | NIGHTLIFE, COMMUNITY, CULTURE |
 * | Lunar/Cinco/DiaDeMuertos/Juneteenth | CULTURE, COMMUNITY |
 * | Championship/Playoffs | SPORTS |
 * | Opening Day | SPORTS |
 * | First Friday | ARTS, CULTURE, NIGHTLIFE |
 * | Creation Day | CIVIC, COMMUNITY |
 * | StPatricks/Halloween/NYE | NIGHTLIFE |
 * 
 * BOOSTED DOMAIN EFFECTS:
 * - Cooldown duration: -1 cycle
 * - Decay rate: 2x (cooldowns expire faster)
 * - Long cooldown penalty: ignored
 * 
 * CALENDAR-SUPPRESSED DOMAINS (v2.2):
 * 
 * | Context | Suppressed Domains |
 * |---------|--------------------|
 * | Thanksgiving/Easter/Parents | NIGHTLIFE, CRIME |
 * 
 * SUPPRESSED DOMAIN EFFECTS:
 * - Cooldown duration: +1 cycle
 * 
 * OUTPUT:
 * - domainCooldowns: {DOMAIN: cyclesRemaining}
 * - suppressDomains: {domain: true} (both cases)
 * - activeCooldowns: string for debugging
 * - cooldownCalendarContext: {holiday, boostedDomains, suppressedDomains, ...}
 * 
 * ============================================================================
 */