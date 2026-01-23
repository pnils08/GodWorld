/**
 * ============================================================================
 * applyDomainCooldowns_ v2.3
 * ============================================================================
 *
 * Manages domain cooldowns with severity-based duration and calendar awareness.
 *
 * v2.3 Enhancements:
 * - Filters to current cycle events only (prevents cooldown refresh from old events)
 * - Uses ev.cycle to match current cycleId
 *
 * v2.2 Enhancements:
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
  const S = ctx.summary;
  const cooldowns = S.domainCooldowns || {};

  // v2.3: Current cycle ID for filtering events
  const currentCycle = S.absoluteCycle || S.cycleId || (ctx.config ? ctx.config.cycleCount : 0) || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || 'off-season';

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN CLASSIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Priority domains that can fire more frequently (always)
  const priorityDomains = ['HEALTH', 'SAFETY', 'INFRASTRUCTURE'];
  
  // Long cooldown domains (prevent spam on normal days)
  const longCooldownDomains = ['CULTURE', 'COMMUNITY', 'MICRO'];

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: CALENDAR-BOOSTED DOMAINS (shorter cooldowns today)
  // ═══════════════════════════════════════════════════════════════════════════
  const calendarBoostedDomains = [];

  // Any holiday → FESTIVAL and HOLIDAY domains flow freely
  if (holiday !== 'none') {
    calendarBoostedDomains.push('FESTIVAL', 'HOLIDAY');
  }

  // Major/Oakland holidays → extra boost
  if (holidayPriority === 'major' || holidayPriority === 'oakland') {
    calendarBoostedDomains.push('COMMUNITY', 'CULTURE');
  }

  // Big celebration days → everything celebration-related flows
  const bigCelebrations = ['OaklandPride', 'ArtSoulFestival', 'NewYearsEve', 'Independence'];
  if (bigCelebrations.includes(holiday)) {
    calendarBoostedDomains.push('NIGHTLIFE', 'COMMUNITY', 'CULTURE');
  }

  // Cultural festivals → CULTURE and COMMUNITY
  const culturalFestivals = ['LunarNewYear', 'CincoDeMayo', 'DiaDeMuertos', 'Juneteenth'];
  if (culturalFestivals.includes(holiday)) {
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

  // Dedupe boosted domains
  const uniqueBoostedDomains = [...new Set(calendarBoostedDomains)];

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: CALENDAR-SUPPRESSED DOMAINS (longer cooldowns today)
  // ═══════════════════════════════════════════════════════════════════════════
  const calendarSuppressedDomains = [];

  // Quiet family holidays → suppress nightlife/party domains
  const quietHolidays = ['Thanksgiving', 'Easter', 'MothersDay', 'FathersDay'];
  if (quietHolidays.includes(holiday)) {
    calendarSuppressedDomains.push('NIGHTLIFE', 'CRIME');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY COOLDOWN DECAY EACH CYCLE
  // ═══════════════════════════════════════════════════════════════════════════
  Object.keys(cooldowns).forEach(domain => {
    let decay = 1;

    // v2.2: Calendar-boosted domains decay faster
    if (uniqueBoostedDomains.includes(domain)) {
      decay = 2; // Double decay rate
    }

    cooldowns[domain] = Math.max(0, cooldowns[domain] - decay);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS THIS CYCLE'S EVENTS ONLY (v2.3: filter to current cycle)
  // ═══════════════════════════════════════════════════════════════════════════
  const allEvents = S.worldEvents || [];
  const todaysEvents = allEvents.filter(function(ev) {
    // If event has cycle property, match it; otherwise assume it's from this cycle
    const evCycle = (typeof ev.cycle === 'number') ? ev.cycle : currentCycle;
    return evCycle === currentCycle;
  });

  if (todaysEvents.length > 0) {
    todaysEvents.forEach(ev => {
      const d = (ev.domain || "").toUpperCase();
      if (!d) return;

      // Determine cooldown duration based on severity and domain type
      let cooldownDuration = 2; // default

      // Severity affects cooldown
      const severity = (ev.severity || '').toLowerCase();
      if (severity === 'high' || severity === 'major' || severity === 'critical') {
        cooldownDuration = 3;
      } else if (severity === 'low') {
        cooldownDuration = 1;
      }

      // Priority domains recover faster (always)
      if (priorityDomains.includes(d)) {
        cooldownDuration = Math.max(1, cooldownDuration - 1);
      }

      // Long cooldown domains take longer (on normal days)
      if (longCooldownDomains.includes(d) && !uniqueBoostedDomains.includes(d)) {
        cooldownDuration += 1;
      }

      // v2.2: Calendar-boosted domains have shorter cooldowns
      if (uniqueBoostedDomains.includes(d)) {
        cooldownDuration = Math.max(0, cooldownDuration - 1);
      }

      // v2.2: Calendar-suppressed domains have longer cooldowns
      if (calendarSuppressedDomains.includes(d)) {
        cooldownDuration += 1;
      }

      // Set cooldown (use max if already cooling)
      cooldowns[d] = Math.max(cooldowns[d] || 0, cooldownDuration);
    });
  }

  S.domainCooldowns = cooldowns;

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD SUPPRESSION MAP
  // ═══════════════════════════════════════════════════════════════════════════
  S.suppressDomains = {};
  Object.keys(cooldowns).forEach(domain => {
    if (cooldowns[domain] > 0) {
      S.suppressDomains[domain] = true;
      S.suppressDomains[domain.toLowerCase()] = true;
    }
  });

  // Track active cooldowns for debugging
  S.activeCooldowns = Object.entries(cooldowns)
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ') || 'none';

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