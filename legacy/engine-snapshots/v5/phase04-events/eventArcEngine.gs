/**
 * ============================================================================
 * V3.6 EVENT ARC ENGINE — GODWORLD CALENDAR INTEGRATION
 * ============================================================================
 *
 * Manages multi-cycle story arcs with GodWorld Calendar awareness.
 *
 * v3.6 Changes:
 * - Replaced all Math.random() with deterministic ctx.rng
 * - pickNeighborhoodForDomain_ and generateSafeUuid_ now accept rng parameter
 * - All arc generation uses rng() for reproducible neighborhood/tension assignment
 *
 * v3.5 Changes:
 * - Safe UUID generation via generateSafeUuid_() (fixes trigger context errors)
 * - Removes dependency on Utilities.getUuid() which fails in some contexts
 *
 * v3.4 Changes:
 * - Unified currentCycle lookup via getCurrentCycle_
 * - Fixed neighborhood interference (ignores citywide/blank arcs)
 * - Championship intensifies existing sports-fever instead of blocking
 * - Added behavior for strain/education-wave/nightlife-surge arc types
 * - Festival/celebration/sports-fever exempt from passive decay
 * - ES5 compatible
 *
 * v3.3 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - Festival/celebration arc types
 * - Sports-fever arcs (playoff/championship energy signals)
 * - First Friday cultural arcs
 * - Creation Day community arcs
 * - Holiday tension modifiers
 * - Calendar-driven arc generation
 *
 * NOTE: Arcs are SIGNALS, not automated storylines.
 * They provide context for Media Room coverage decisions.
 * The Maker retains full creative control.
 *
 * NO sheet writes — pure functional logic
 *
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// ARC NEIGHBORHOOD DOMAINS — Domain Affinities (v3.3: expanded to 12)
// NOTE: Renamed from OAKLAND_NEIGHBORHOODS to avoid global collision with v3NeighborhoodWriter.js
// ═══════════════════════════════════════════════════════════════════════════
var ARC_NEIGHBORHOOD_DOMAINS = {
  'Temescal': ['HEALTH', 'EDUCATION', 'COMMUNITY'],
  'Downtown': ['CIVIC', 'INFRASTRUCTURE', 'BUSINESS', 'FESTIVAL'],
  'Fruitvale': ['COMMUNITY', 'CULTURE', 'SAFETY', 'FESTIVAL'],
  'Lake Merritt': ['CULTURE', 'COMMUNITY', 'GENERAL', 'FESTIVAL'],
  'West Oakland': ['INFRASTRUCTURE', 'SAFETY', 'BUSINESS', 'COMMUNITY'],
  'Laurel': ['COMMUNITY', 'CULTURE', 'GENERAL'],
  'Rockridge': ['BUSINESS', 'EDUCATION', 'COMMUNITY'],
  'Jack London': ['BUSINESS', 'NIGHTLIFE', 'CULTURE', 'SPORTS'],
  'Uptown': ['CULTURE', 'NIGHTLIFE', 'ARTS', 'FESTIVAL'],
  'KONO': ['ARTS', 'CULTURE', 'NIGHTLIFE', 'COMMUNITY'],
  'Chinatown': ['CULTURE', 'COMMUNITY', 'BUSINESS', 'FESTIVAL'],
  'Piedmont Ave': ['BUSINESS', 'COMMUNITY', 'EDUCATION']
};


/**
 * Unified cycle lookup (v3.4)
 */
function getCurrentCycle_(ctx) {
  var S = ctx.summary || {};
  var configCycle = (ctx.config && ctx.config.cycleCount) || 0;
  return Number(S.absoluteCycle || S.cycleId || S.cycleCount || configCycle || 0);
}


/**
 * Pick neighborhood based on domain affinity
 * @param {string} domain
 * @param {Function} [rng] - Deterministic RNG function (falls back to Math.random)
 */
function pickNeighborhoodForDomain_(domain, rng) {
  var _rng = (typeof rng === 'function') ? rng : Math.random;
  var matches = [];
  var nhKeys = Object.keys(ARC_NEIGHBORHOOD_DOMAINS);
  for (var i = 0; i < nhKeys.length; i++) {
    var nh = nhKeys[i];
    var affinities = ARC_NEIGHBORHOOD_DOMAINS[nh];
    if (affinities.indexOf(domain) >= 0) {
      matches.push(nh);
    }
  }
  if (matches.length > 0) {
    return matches[Math.floor(_rng() * matches.length)];
  }
  return nhKeys[Math.floor(_rng() * nhKeys.length)];
}


/**
 * Updates tension and phase for existing arcs in ctx.summary.eventArcs.
 */
function eventArcEngine_(ctx) {
  var arcs = ctx.summary.eventArcs || [];
  if (arcs.length === 0) return;

  var S = ctx.summary || {};
  var currentCycle = getCurrentCycle_(ctx);

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v3.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // Pre-calculate neighborhood arc counts for interference
  // v3.4: Ignore citywide/blank neighborhoods
  var neighborhoodCounts = {};
  for (var pi = 0; pi < arcs.length; pi++) {
    var preArc = arcs[pi];
    if (!preArc || preArc.phase === 'resolved') continue;
    var nh = (preArc.neighborhood || '').toString().trim();
    if (!nh) continue; // ignore citywide arcs for neighborhood interference
    neighborhoodCounts[nh] = (neighborhoodCounts[nh] || 0) + 1;
  }

  for (var ai = 0; ai < arcs.length; ai++) {
    var arc = arcs[ai];
    if (!arc || arc.phase === 'resolved') continue;

    var t = Number(arc.tension) || 0;
    var arcAge = currentCycle - (arc.cycleCreated || currentCycle);

    // ═══════════════════════════════════════════════════════════
    // BASE SIGNAL MODIFIERS
    // ═══════════════════════════════════════════════════════════

    if (S.cycleWeight === 'high-signal') t += 1;
    if (S.shockFlag && S.shockFlag !== 'none') t += 2;
    if (S.cycleWeight === 'medium-signal') t += 0.5;

    // ═══════════════════════════════════════════════════════════
    // ARC-TYPE SPECIFIC BEHAVIOR
    // ═══════════════════════════════════════════════════════════

    // Crisis arcs: escalate faster with shocks, decay faster without
    if (arc.type === 'crisis') {
      if (S.shockFlag && S.shockFlag !== 'none') {
        t += 1;
      } else if (S.cycleWeight !== 'high-signal') {
        t -= 0.5;
      }
    }

    // Pattern-wave arcs: slow-burn, always creeping
    if (arc.type === 'pattern-wave') {
      t += 0.25;
    }

    // Instability arcs: volatile, respond to migration
    if (arc.type === 'instability') {
      var drift = S.migrationDrift || 0;
      if (drift < -30) t += 1;
      else if (drift < -15) t += 0.5;
      else if (drift > 20) t += 0.5;
    }

    // Health arcs: respond to illness rate
    if (arc.type === 'health-crisis') {
      var pop = S.worldPopulation || {};
      if (pop.illnessRate > 0.08) t += 1;
      else if (pop.illnessRate > 0.06) t += 0.5;
      else t -= 0.3;
    }

    // Infrastructure arcs: respond to weather severity
    if (arc.type === 'infrastructure') {
      var weather = S.weather || {};
      if (weather.impact >= 1.4) t += 1;
      else if (weather.impact >= 1.2) t += 0.5;
    }

    // Community arcs: respond to sentiment
    if (arc.type === 'community') {
      var dyn = S.cityDynamics || {};
      if (dyn.sentiment >= 0.3) t += 0.5;
      else if (dyn.sentiment <= -0.3) t -= 0.3;
    }

    // Cultural arcs: tied to cultural activity
    if (arc.type === 'cultural-moment') {
      var domains = S.domainPresence || {};
      if ((domains['CULTURE'] || 0) >= 2) t += 0.5;
      if (isFirstFriday) t += 1;
    }

    // Safety arcs: respond to safety domain
    if (arc.type === 'safety-concern') {
      var safeDomains = S.domainPresence || {};
      if ((safeDomains['SAFETY'] || 0) >= 2) t += 0.5;
      else t -= 0.2;
    }

    // Business arcs: respond to retail/economy
    if (arc.type === 'business-disruption') {
      var bizDyn = S.cityDynamics || {};
      if (bizDyn.retail >= 1.2) t += 0.3;
      var bizPop = S.worldPopulation || {};
      if (bizPop.economy === 'weak') t += 0.5;
    }

    // Rivalry arcs: escalate with civic tension
    if (arc.type === 'rivalry') {
      if (S.civicLoad === 'load-strain') t += 1;
      else if (S.civicLoad === 'minor-variance') t += 0.3;
    }

    // v3.4: Strain arcs: creep up under civic load, decay otherwise
    if (arc.type === 'strain') {
      if (S.civicLoad === 'load-strain') t += 0.8;
      else if (S.civicLoad === 'minor-variance') t += 0.2;
      else t -= 0.4;
    }

    // v3.4: Education-wave arcs: respond to education domain
    if (arc.type === 'education-wave') {
      var eduDomains = S.domainPresence || {};
      if ((eduDomains['EDUCATION'] || 0) >= 2) t += 0.5;
      else t -= 0.2;
    }

    // v3.4: Nightlife-surge arcs: respond to cityDynamics.nightlife
    if (arc.type === 'nightlife-surge') {
      var nlDyn = S.cityDynamics || {};
      if (nlDyn.nightlife >= 1.4) t += 0.6;
      else if (nlDyn.nightlife >= 1.2) t += 0.2;
      else t -= 0.3;
    }

    // ═══════════════════════════════════════════════════════════
    // v3.3: CALENDAR-SPECIFIC ARC BEHAVIOR
    // ═══════════════════════════════════════════════════════════

    // Festival arcs: respond to holiday activity
    if (arc.type === 'festival') {
      if (holiday !== 'none' && holidayPriority === 'oakland') t += 1;
      else if (holiday !== 'none') t += 0.5;
      else t -= 0.5;
    }

    // Celebration arcs: respond to major holidays
    if (arc.type === 'celebration') {
      if (holidayPriority === 'major') t += 1;
      else if (holiday !== 'none') t += 0.3;
      else t -= 0.4;
    }

    // Sports-fever arcs: respond to sports season
    if (arc.type === 'sports-fever') {
      if (sportsSeason === 'championship') t += 1.5;
      else if (sportsSeason === 'playoffs') t += 1;
      else if (sportsSeason === 'late-season') t += 0.5;
      else t -= 0.5;
    }

    // Parade arcs: short-lived, intense
    if (arc.type === 'parade') {
      if (holiday !== 'none') t += 0.5;
      else t -= 1;
    }

    // Arts-walk arcs: respond to First Friday
    if (arc.type === 'arts-walk') {
      if (isFirstFriday) t += 2;
      else t -= 0.5;
    }

    // Heritage arcs: respond to Creation Day
    if (arc.type === 'heritage') {
      if (isCreationDay) t += 2;
      else t -= 0.3;
    }

    // ═══════════════════════════════════════════════════════════
    // v3.3: CALENDAR TENSION MODIFIERS (all arcs)
    // ═══════════════════════════════════════════════════════════

    // Major party holidays boost all active arcs slightly
    if (holiday === 'NewYearsEve' || holiday === 'OaklandPride' || holiday === 'ArtSoulFestival') {
      t += 0.3;
    }

    // Quiet family holidays dampen non-family arcs
    if (holiday === 'Thanksgiving' || holiday === 'Easter') {
      if (arc.type !== 'community' && arc.type !== 'celebration') {
        t -= 0.3;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CROSS-ARC NEIGHBORHOOD INTERFERENCE
    // v3.4: Only apply to real neighborhoods
    // ═══════════════════════════════════════════════════════════

    var nhKey = (arc.neighborhood || '').toString().trim();
    if (nhKey) {
      var nhCount = neighborhoodCounts[nhKey] || 0;
      if (nhCount > 1) {
        t += 0.5 * (nhCount - 1);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // PASSIVE DECAY
    // v3.4: Exempt festival/celebration/sports-fever from double-decay
    // ═══════════════════════════════════════════════════════════

    var noPassiveDecay = (arc.type === 'festival' || arc.type === 'celebration' || arc.type === 'sports-fever');
    if (!noPassiveDecay) {
      if (S.cycleWeight !== 'high-signal' && !(S.shockFlag && S.shockFlag !== 'none')) {
        t -= 0.3;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // AGE-BASED FATIGUE
    // ═══════════════════════════════════════════════════════════

    if (arcAge > 10) {
      t -= 0.2 * Math.floor((arcAge - 10) / 5);
    }

    // ═══════════════════════════════════════════════════════════
    // CLAMP 0–10
    // ═══════════════════════════════════════════════════════════
    if (t < 0) t = 0;
    if (t > 10) t = 10;

    arc.tension = Math.round(t * 100) / 100;

    // ═══════════════════════════════════════════════════════════
    // PHASE PROGRESSION
    // ═══════════════════════════════════════════════════════════

    if (arc.phase === 'early' && t >= 3) {
      arc.phase = 'rising';
    } else if (arc.phase === 'rising' && t >= 5) {
      arc.phase = 'peak';
    } else if (arc.phase === 'peak' && t <= 4) {
      arc.phase = 'decline';
    } else if (arc.phase === 'decline' && t <= 1.5) {
      arc.phase = 'resolved';
      arc.cycleResolved = currentCycle;
    }
  }
}


/**
 * v3.5: Safe UUID generation that works in all contexts
 * Falls back to manual generation if Utilities.getUuid() fails
 * @param {Function} [rng] - Deterministic RNG function (falls back to Math.random)
 */
function generateSafeUuid_(rng) {
  var _rng = (typeof rng === 'function') ? rng : Math.random;
  try {
    if (typeof Utilities !== 'undefined' && typeof Utilities.getUuid === 'function') {
      return Utilities.getUuid();
    }
  } catch (e) {
    // Utilities.getUuid() failed, use fallback
  }

  // Fallback: manual UUID generation (RFC 4122 v4 format)
  var chars = '0123456789abcdef';
  var uuid = '';
  for (var i = 0; i < 32; i++) {
    uuid += chars[Math.floor(_rng() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) {
      uuid += '-';
    }
  }
  return uuid;
}


/**
 * Generates new arcs based on cycle-level signals.
 * Returns an array of arc objects.
 */
function generateNewArcs_(ctx) {
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;
  var S = ctx.summary || {};
  var existingArcs = ctx.summary.eventArcs || [];
  var newArcs = [];

  var isHigh = S.cycleWeight === 'high-signal';
  var isMedium = S.cycleWeight === 'medium-signal';
  var shock = S.shockFlag && S.shockFlag !== 'none';
  var pattern = S.patternFlag;
  var currentCycle = getCurrentCycle_(ctx);
  var weather = S.weather || {};
  var dynamics = S.cityDynamics || {};
  var population = S.worldPopulation || {};
  var domains = S.domainPresence || {};

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v3.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // ES5-safe helper functions
  function hasActiveArc(type, neighborhood) {
    for (var i = 0; i < existingArcs.length; i++) {
      var a = existingArcs[i];
      if (a && a.type === type && (neighborhood === '' || a.neighborhood === neighborhood) && a.phase !== 'resolved') {
        return true;
      }
    }
    return false;
  }

  // v3.4: Find existing active arc by type
  function findActiveArc(type) {
    for (var i = 0; i < existingArcs.length; i++) {
      var a = existingArcs[i];
      if (a && a.type === type && a.phase !== 'resolved') {
        return a;
      }
    }
    return null;
  }

  function activeArcCount() {
    var count = 0;
    for (var i = 0; i < existingArcs.length; i++) {
      if (existingArcs[i] && existingArcs[i].phase !== 'resolved') count++;
    }
    return count;
  }

  function makeArc(type, neighborhood, domain, summary) {
    var initialTension = Math.round((2 + rng() * 2) * 100) / 100;
    var calTrigger = null;
    if (holiday !== 'none') calTrigger = holiday;
    else if (isFirstFriday) calTrigger = 'FirstFriday';
    else if (isCreationDay) calTrigger = 'CreationDay';

    // v3.5: Safe UUID generation (handles trigger context where Utilities may fail)
    var arcUuid = generateSafeUuid_(rng);

    return {
      arcId: arcUuid.slice(0, 8),
      type: type,
      phase: 'early',
      tension: initialTension,
      neighborhood: neighborhood || '',
      domainTag: domain || 'GENERAL',
      summary: summary || '',
      involvedCitizens: [],
      cycleCreated: currentCycle,
      cycleResolved: null,
      calendarTrigger: calTrigger
    };
  }

  // Parade holidays list
  var paradeHolidays = ['Independence', 'Thanksgiving', 'MLKDay', 'VeteransDay', 'MemorialDay', 'StPatricksDay'];
  function isParadeHoliday(h) {
    return paradeHolidays.indexOf(h) >= 0;
  }

  // ═══════════════════════════════════════════════════════════
  // LIMIT TOTAL ACTIVE ARCS (max 10)
  // ═══════════════════════════════════════════════════════════
  if (activeArcCount() >= 10) return newArcs;

  // ═══════════════════════════════════════════════════════════
  // v3.3: CALENDAR-DRIVEN ARC GENERATION
  // ═══════════════════════════════════════════════════════════

  // OAKLAND PRIDE → Festival arc @ Downtown/Lake Merritt
  if (holiday === 'OaklandPride' && !hasActiveArc('festival', '')) {
    var prideNh = rng() < 0.5 ? 'Downtown' : 'Lake Merritt';
    newArcs.push(makeArc(
      'festival',
      prideNh,
      'FESTIVAL',
      'Pride celebration energy radiating through the district.'
    ));
  }

  // ART & SOUL → Festival arc @ Downtown
  if (holiday === 'ArtSoulFestival' && !hasActiveArc('festival', 'Downtown')) {
    newArcs.push(makeArc(
      'festival',
      'Downtown',
      'FESTIVAL',
      'Art & Soul Festival drawing crowds citywide.'
    ));
  }

  // LUNAR NEW YEAR → Festival arc @ Chinatown
  if (holiday === 'LunarNewYear' && !hasActiveArc('festival', 'Chinatown')) {
    newArcs.push(makeArc(
      'festival',
      'Chinatown',
      'FESTIVAL',
      'Lunar New Year celebrations filling Chinatown streets.'
    ));
  }

  // CINCO DE MAYO / DIA DE MUERTOS → Festival arc @ Fruitvale
  if ((holiday === 'CincoDeMayo' || holiday === 'DiaDeMuertos') && !hasActiveArc('festival', 'Fruitvale')) {
    newArcs.push(makeArc(
      'festival',
      'Fruitvale',
      'FESTIVAL',
      holiday === 'CincoDeMayo'
        ? 'Cinco de Mayo celebrations energizing Fruitvale.'
        : 'Día de los Muertos observances bringing community together.'
    ));
  }

  // JUNETEENTH → Community arc @ West Oakland
  if (holiday === 'Juneteenth' && !hasActiveArc('festival', 'West Oakland')) {
    newArcs.push(makeArc(
      'festival',
      'West Oakland',
      'COMMUNITY',
      'Juneteenth celebrations honoring freedom and heritage.'
    ));
  }

  // NEW YEARS EVE → Celebration arc @ Downtown
  if (holiday === 'NewYearsEve' && !hasActiveArc('celebration', 'Downtown')) {
    newArcs.push(makeArc(
      'celebration',
      'Downtown',
      'FESTIVAL',
      'New Year countdown energy building across the city.'
    ));
  }

  // MAJOR HOLIDAYS → Celebration arc
  if (holidayPriority === 'major' && holiday !== 'NewYearsEve' && !hasActiveArc('celebration', '')) {
    newArcs.push(makeArc(
      'celebration',
      'Downtown',
      'COMMUNITY',
      'Holiday spirit spreading through neighborhoods.'
    ));
  }

  // PARADE HOLIDAYS → Parade arc
  if (isParadeHoliday(holiday) && !hasActiveArc('parade', '')) {
    newArcs.push(makeArc(
      'parade',
      'Downtown',
      'CIVIC',
      'Parade preparations and crowds creating district energy.'
    ));
  }

  // OPENING DAY → Sports-fever arc @ Jack London
  if (holiday === 'OpeningDay' && !hasActiveArc('sports-fever', 'Jack London')) {
    newArcs.push(makeArc(
      'sports-fever',
      'Jack London',
      'SPORTS',
      'Opening Day excitement bringing fans to the waterfront.'
    ));
  }

  // PLAYOFFS → Sports-fever arc @ Jack London
  if (sportsSeason === 'playoffs' && !hasActiveArc('sports-fever', 'Jack London')) {
    newArcs.push(makeArc(
      'sports-fever',
      'Jack London',
      'SPORTS',
      'Playoff energy spreading from stadium to sports bars.'
    ));
  }

  // CHAMPIONSHIP → Sports-fever arc @ Jack London (high intensity)
  // v3.4: Intensify existing arc instead of blocking
  if (sportsSeason === 'championship') {
    var existingSportsFever = findActiveArc('sports-fever');
    if (existingSportsFever) {
      // Intensify existing arc
      existingSportsFever.tension = Math.min(10, (Number(existingSportsFever.tension) || 0) + 1.5);
      if (existingSportsFever.phase === 'early') existingSportsFever.phase = 'rising';
    } else {
      newArcs.push(makeArc(
        'sports-fever',
        'Jack London',
        'SPORTS',
        'Championship fever gripping the city.'
      ));
    }
  }

  // FIRST FRIDAY → Arts-walk arc @ Uptown/KONO
  if (isFirstFriday && !hasActiveArc('arts-walk', '')) {
    var artNh = rng() < 0.5 ? 'Uptown' : 'KONO';
    newArcs.push(makeArc(
      'arts-walk',
      artNh,
      'ARTS',
      'First Friday gallery crawl drawing art enthusiasts.'
    ));
  }

  // CREATION DAY → Heritage arc @ Downtown
  if (isCreationDay && !hasActiveArc('heritage', 'Downtown')) {
    newArcs.push(makeArc(
      'heritage',
      'Downtown',
      'CIVIC',
      'Creation Day celebrations honoring Oakland\'s founding.'
    ));
  }

  // ═══════════════════════════════════════════════════════════
  // EXISTING ARC TRIGGERS (unchanged)
  // ═══════════════════════════════════════════════════════════

  // SHOCK-DRIVEN CRISIS ARC → Downtown
  if (shock && !hasActiveArc('crisis', 'Downtown')) {
    newArcs.push(makeArc(
      'crisis',
      'Downtown',
      'CIVIC',
      'Unexpected disruption creates civic pressure.'
    ));
  }

  // HIGH-SIGNAL INSTABILITY ARC → Fruitvale or West Oakland
  if (isHigh && !hasActiveArc('instability', '')) {
    var instNh = rng() < 0.5 ? 'Fruitvale' : 'West Oakland';
    newArcs.push(makeArc(
      'instability',
      instNh,
      'COMMUNITY',
      'Residents describe unstable day-to-day conditions.'
    ));
  }

  // PATTERN-BASED ARC → Laurel
  if (pattern === 'micro-event-wave' && !hasActiveArc('pattern-wave', 'Laurel')) {
    newArcs.push(makeArc(
      'pattern-wave',
      'Laurel',
      'GENERAL',
      'Minor events repeating across the district.'
    ));
  }

  if (pattern === 'strain-trend' && !hasActiveArc('strain', 'Downtown')) {
    newArcs.push(makeArc(
      'strain',
      'Downtown',
      'CIVIC',
      'Accumulated strain creating friction points.'
    ));
  }

  // HEALTH CRISIS ARC → Temescal
  if (population.illnessRate > 0.07 && !hasActiveArc('health-crisis', 'Temescal')) {
    newArcs.push(makeArc(
      'health-crisis',
      'Temescal',
      'HEALTH',
      'Health indicators triggering concern.'
    ));
  }

  // INFRASTRUCTURE ARC → West Oakland
  if (weather.impact >= 1.4 && !hasActiveArc('infrastructure', 'West Oakland')) {
    newArcs.push(makeArc(
      'infrastructure',
      'West Oakland',
      'INFRASTRUCTURE',
      'Weather severity stressing city systems.'
    ));
  }

  // COMMUNITY ARC → Lake Merritt
  if (dynamics.sentiment >= 0.3 && !hasActiveArc('community', 'Lake Merritt')) {
    newArcs.push(makeArc(
      'community',
      'Lake Merritt',
      'COMMUNITY',
      'Positive energy bringing neighbors together.'
    ));
  }

  // SAFETY ARC → Fruitvale
  if ((domains['SAFETY'] || 0) >= 2 && !hasActiveArc('safety-concern', 'Fruitvale')) {
    newArcs.push(makeArc(
      'safety-concern',
      'Fruitvale',
      'SAFETY',
      'Safety incidents drawing neighborhood attention.'
    ));
  }

  // CULTURAL ARC → Jack London (or Uptown if First Friday)
  if ((domains['CULTURE'] || 0) >= 2 && !hasActiveArc('cultural-moment', '')) {
    var cultNh = isFirstFriday ? 'Uptown' : 'Jack London';
    newArcs.push(makeArc(
      'cultural-moment',
      cultNh,
      'CULTURE',
      'Cultural activity drawing city attention.'
    ));
  }

  // BUSINESS ARC → Rockridge
  if ((domains['BUSINESS'] || 0) >= 2 && !hasActiveArc('business-disruption', 'Rockridge')) {
    newArcs.push(makeArc(
      'business-disruption',
      'Rockridge',
      'BUSINESS',
      'Business activity creating local ripples.'
    ));
  }

  // EDUCATION ARC → Temescal
  if ((domains['EDUCATION'] || 0) >= 2 && !hasActiveArc('education-wave', 'Temescal')) {
    newArcs.push(makeArc(
      'education-wave',
      'Temescal',
      'EDUCATION',
      'School-related activity drawing parent attention.'
    ));
  }

  // NIGHTLIFE ARC → Jack London (or Uptown)
  if (dynamics.nightlife >= 1.3 && !hasActiveArc('nightlife-surge', '')) {
    var nlNh = rng() < 0.6 ? 'Jack London' : 'Uptown';
    newArcs.push(makeArc(
      'nightlife-surge',
      nlNh,
      'NIGHTLIFE',
      'Evening activity surging in the district.'
    ));
  }

  // RIVALRY ARC → City-wide
  if (isHigh && rng() < 0.1 && !hasActiveArc('rivalry', '')) {
    newArcs.push(makeArc(
      'rivalry',
      '',
      'GENERAL',
      'Competing interests spark public friction.'
    ));
  }

  return newArcs;
}


/**
 * Helper: Attach citizen to an arc.
 */
function attachCitizenToArc_(ctx, arc, citizenId, role) {
  if (!arc || !citizenId) return;

  arc.involvedCitizens = arc.involvedCitizens || [];

  // Check if already exists
  for (var i = 0; i < arc.involvedCitizens.length; i++) {
    if (arc.involvedCitizens[i].id === citizenId) {
      arc.involvedCitizens[i].role = role || arc.involvedCitizens[i].role;
      return;
    }
  }

  var currentCycle = getCurrentCycle_(ctx);

  arc.involvedCitizens.push({
    id: citizenId,
    role: role || 'participant',
    cycleJoined: currentCycle
  });
}


/**
 * Helper: Check if citizen is in any active arc.
 */
function citizenInActiveArc_(ctx, citizenId) {
  var arcs = (ctx.summary && ctx.summary.eventArcs) || [];

  for (var ai = 0; ai < arcs.length; ai++) {
    var arc = arcs[ai];
    if (!arc || arc.phase === 'resolved') continue;
    var citizens = arc.involvedCitizens || [];
    for (var ci = 0; ci < citizens.length; ci++) {
      if (citizens[ci].id === citizenId) {
        return arc;
      }
    }
  }

  return null;
}


/**
 * Helper: Get event probability boost for citizen based on arc involvement.
 */
function getArcEventBoost_(ctx, citizenId) {
  var arc = citizenInActiveArc_(ctx, citizenId);
  if (!arc) return 1.0;

  var phaseBoosts = {
    'early': 1.2,
    'rising': 1.5,
    'peak': 2.0,
    'decline': 1.3,
    'resolved': 1.0
  };

  return phaseBoosts[arc.phase] || 1.0;
}


/**
 * ============================================================================
 * EVENT ARC ENGINE REFERENCE v3.6
 * ============================================================================
 *
 * v3.6: All Math.random() replaced with deterministic ctx.rng
 *
 * v3.5: Safe UUID generation (generateSafeUuid_) - handles trigger contexts
 *
 * NEIGHBORHOODS (12):
 * - Temescal: HEALTH, EDUCATION, COMMUNITY
 * - Downtown: CIVIC, INFRASTRUCTURE, BUSINESS, FESTIVAL
 * - Fruitvale: COMMUNITY, CULTURE, SAFETY, FESTIVAL
 * - Lake Merritt: CULTURE, COMMUNITY, GENERAL, FESTIVAL
 * - West Oakland: INFRASTRUCTURE, SAFETY, BUSINESS, COMMUNITY
 * - Laurel: COMMUNITY, CULTURE, GENERAL
 * - Rockridge: BUSINESS, EDUCATION, COMMUNITY
 * - Jack London: BUSINESS, NIGHTLIFE, CULTURE, SPORTS
 * - Uptown: CULTURE, NIGHTLIFE, ARTS, FESTIVAL
 * - KONO: ARTS, CULTURE, NIGHTLIFE, COMMUNITY
 * - Chinatown: CULTURE, COMMUNITY, BUSINESS, FESTIVAL
 * - Piedmont Ave: BUSINESS, COMMUNITY, EDUCATION
 *
 * ARC TYPES:
 * - crisis, pattern-wave, instability, health-crisis, infrastructure
 * - community, cultural-moment, safety-concern, business-disruption
 * - rivalry, strain, education-wave, nightlife-surge
 * - festival, celebration, sports-fever, parade, arts-walk, heritage
 *
 * v3.4 FIXES:
 * - Unified getCurrentCycle_ (absoluteCycle → cycleId → cycleCount)
 * - Neighborhood interference ignores citywide/blank arcs
 * - Championship intensifies existing sports-fever arc
 * - Added behavior for strain/education-wave/nightlife-surge
 * - Festival/celebration/sports-fever exempt from passive decay
 *
 * MAX ACTIVE ARCS: 10
 *
 * NOTE: Arcs are SIGNALS for Media Room context.
 * They do NOT automate storylines or override Maker control.
 *
 * ============================================================================
 */
