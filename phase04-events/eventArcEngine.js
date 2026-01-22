/**
 * ============================================================================
 * V3.3 EVENT ARC ENGINE — GODWORLD CALENDAR INTEGRATION
 * ============================================================================
 *
 * Manages multi-cycle story arcs with GodWorld Calendar awareness.
 *
 * v3.3 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - Festival/celebration arc types
 * - Sports-fever arcs (playoff/championship energy signals)
 * - First Friday cultural arcs
 * - Creation Day community arcs
 * - Holiday tension modifiers
 * - Calendar-driven arc generation
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v3.2):
 * - Phase progression (early → rising → peak → decline → resolved)
 * - Arc-type specific behavior
 * - Cross-arc neighborhood interference
 * - Citizen involvement tracking
 * - Age-based arc fatigue
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
// OAKLAND NEIGHBORHOODS — Domain Affinities (v3.3: expanded to 12)
// ═══════════════════════════════════════════════════════════════════════════
const OAKLAND_NEIGHBORHOODS = {
  'Temescal': ['HEALTH', 'EDUCATION', 'COMMUNITY'],
  'Downtown': ['CIVIC', 'INFRASTRUCTURE', 'BUSINESS', 'FESTIVAL'],
  'Fruitvale': ['COMMUNITY', 'CULTURE', 'SAFETY', 'FESTIVAL'],
  'Lake Merritt': ['CULTURE', 'COMMUNITY', 'GENERAL', 'FESTIVAL'],
  'West Oakland': ['INFRASTRUCTURE', 'SAFETY', 'BUSINESS', 'COMMUNITY'],
  'Laurel': ['COMMUNITY', 'CULTURE', 'GENERAL'],
  'Rockridge': ['BUSINESS', 'EDUCATION', 'COMMUNITY'],
  'Jack London': ['BUSINESS', 'NIGHTLIFE', 'CULTURE', 'SPORTS'],
  'Uptown': ['CULTURE', 'NIGHTLIFE', 'ARTS', 'FESTIVAL'],           // v3.3
  'KONO': ['ARTS', 'CULTURE', 'NIGHTLIFE', 'COMMUNITY'],            // v3.3
  'Chinatown': ['CULTURE', 'COMMUNITY', 'BUSINESS', 'FESTIVAL'],    // v3.3
  'Piedmont Ave': ['BUSINESS', 'COMMUNITY', 'EDUCATION']            // v3.3
};


/**
 * Pick neighborhood based on domain affinity
 */
function pickNeighborhoodForDomain_(domain) {
  const matches = [];
  for (const [nh, affinities] of Object.entries(OAKLAND_NEIGHBORHOODS)) {
    if (affinities.includes(domain)) {
      matches.push(nh);
    }
  }
  if (matches.length > 0) {
    return matches[Math.floor(Math.random() * matches.length)];
  }
  const all = Object.keys(OAKLAND_NEIGHBORHOODS);
  return all[Math.floor(Math.random() * all.length)];
}


/**
 * Updates tension and phase for existing arcs in ctx.summary.eventArcs.
 */
function eventArcEngine_(ctx) {
  const arcs = ctx.summary.eventArcs || [];
  if (arcs.length === 0) return;

  const S = ctx.summary || {};
  const currentCycle = S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v3.3)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || 'off-season';

  // Pre-calculate neighborhood arc counts for interference
  const neighborhoodCounts = {};
  for (let arc of arcs) {
    if (!arc || arc.phase === 'resolved') continue;
    const nh = arc.neighborhood || 'Downtown';
    neighborhoodCounts[nh] = (neighborhoodCounts[nh] || 0) + 1;
  }

  for (let arc of arcs) {
    if (!arc || arc.phase === 'resolved') continue;

    let t = Number(arc.tension) || 0;
    const arcAge = currentCycle - (arc.cycleCreated || currentCycle);

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
      const drift = S.migrationDrift || 0;
      if (drift < -30) t += 1;
      else if (drift < -15) t += 0.5;
      else if (drift > 20) t += 0.5;
    }

    // Health arcs: respond to illness rate
    if (arc.type === 'health-crisis') {
      const pop = S.worldPopulation || {};
      if (pop.illnessRate > 0.08) t += 1;
      else if (pop.illnessRate > 0.06) t += 0.5;
      else t -= 0.3;
    }

    // Infrastructure arcs: respond to weather severity
    if (arc.type === 'infrastructure') {
      const weather = S.weather || {};
      if (weather.impact >= 1.4) t += 1;
      else if (weather.impact >= 1.2) t += 0.5;
    }

    // Community arcs: respond to sentiment
    if (arc.type === 'community') {
      const dyn = S.cityDynamics || {};
      if (dyn.sentiment >= 0.3) t += 0.5;
      else if (dyn.sentiment <= -0.3) t -= 0.3;
    }

    // Cultural arcs: tied to cultural activity
    if (arc.type === 'cultural-moment') {
      const domains = S.domainPresence || {};
      if (domains['CULTURE'] >= 2) t += 0.5;
      // v3.3: First Friday boosts cultural arcs
      if (isFirstFriday) t += 1;
    }

    // Safety arcs: respond to safety domain
    if (arc.type === 'safety-concern') {
      const domains = S.domainPresence || {};
      if (domains['SAFETY'] >= 2) t += 0.5;
      else t -= 0.2;
    }

    // Business arcs: respond to retail/economy
    if (arc.type === 'business-disruption') {
      const dyn = S.cityDynamics || {};
      if (dyn.retail >= 1.2) t += 0.3;
      const pop = S.worldPopulation || {};
      if (pop.economy === 'weak') t += 0.5;
    }

    // Rivalry arcs: escalate with civic tension
    if (arc.type === 'rivalry') {
      if (S.civicLoad === 'load-strain') t += 1;
      else if (S.civicLoad === 'minor-variance') t += 0.3;
    }

    // ═══════════════════════════════════════════════════════════
    // v3.3: CALENDAR-SPECIFIC ARC BEHAVIOR
    // ═══════════════════════════════════════════════════════════

    // Festival arcs: respond to holiday activity
    if (arc.type === 'festival') {
      if (holiday !== 'none' && holidayPriority === 'oakland') t += 1;
      else if (holiday !== 'none') t += 0.5;
      else t -= 0.5; // Decay faster without holiday
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
      else t -= 0.5; // Decay in off-season
    }

    // Parade arcs: short-lived, intense
    if (arc.type === 'parade') {
      if (holiday !== 'none') t += 0.5;
      else t -= 1; // Decay fast after parade day
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
    // ═══════════════════════════════════════════════════════════
    
    const nhCount = neighborhoodCounts[arc.neighborhood] || 0;
    if (nhCount > 1) {
      t += 0.5 * (nhCount - 1);
    }

    // ═══════════════════════════════════════════════════════════
    // PASSIVE DECAY
    // ═══════════════════════════════════════════════════════════
    
    if (S.cycleWeight !== 'high-signal' && !(S.shockFlag && S.shockFlag !== 'none')) {
      t -= 0.3;
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
 * Generates new arcs based on cycle-level signals.
 * Returns an array of arc objects.
 */
function generateNewArcs_(ctx) {
  const S = ctx.summary || {};
  const existingArcs = ctx.summary.eventArcs || [];
  const newArcs = [];

  const isHigh = S.cycleWeight === 'high-signal';
  const isMedium = S.cycleWeight === 'medium-signal';
  const shock = S.shockFlag && S.shockFlag !== 'none';
  const pattern = S.patternFlag;
  const currentCycle = S.cycleId || ctx.config.cycleCount || 0;
  const weather = S.weather || {};
  const dynamics = S.cityDynamics || {};
  const population = S.worldPopulation || {};
  const domains = S.domainPresence || {};

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v3.3)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || 'off-season';

  function hasActiveArc(type, neighborhood) {
    return existingArcs.some(a => 
      a && a.type === type && 
      (neighborhood === '' || a.neighborhood === neighborhood) && 
      a.phase !== 'resolved'
    );
  }

  function activeArcCount() {
    return existingArcs.filter(a => a && a.phase !== 'resolved').length;
  }

  function makeArc(type, neighborhood, domain, summary) {
    const initialTension = Math.round((2 + Math.random() * 2) * 100) / 100;
    return {
      arcId: Utilities.getUuid().slice(0, 8),
      type: type,
      phase: 'early',
      tension: initialTension,
      neighborhood: neighborhood || '',
      domainTag: domain || 'GENERAL',
      summary: summary || '',
      involvedCitizens: [],
      cycleCreated: currentCycle,
      cycleResolved: null,
      calendarTrigger: holiday !== 'none' ? holiday : (isFirstFriday ? 'FirstFriday' : (isCreationDay ? 'CreationDay' : null))
    };
  }

  // ═══════════════════════════════════════════════════════════
  // LIMIT TOTAL ACTIVE ARCS (max 10, up from 8)
  // ═══════════════════════════════════════════════════════════
  if (activeArcCount() >= 10) return newArcs;

  // ═══════════════════════════════════════════════════════════
  // v3.3: CALENDAR-DRIVEN ARC GENERATION
  // ═══════════════════════════════════════════════════════════

  // OAKLAND PRIDE → Festival arc @ Downtown/Lake Merritt
  if (holiday === 'OaklandPride' && !hasActiveArc('festival', '')) {
    const nh = Math.random() < 0.5 ? 'Downtown' : 'Lake Merritt';
    newArcs.push(makeArc(
      'festival',
      nh,
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
  const paradeHolidays = ['Independence', 'Thanksgiving', 'MLKDay', 'VeteransDay', 'MemorialDay', 'StPatricksDay'];
  if (paradeHolidays.includes(holiday) && !hasActiveArc('parade', '')) {
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
  if (sportsSeason === 'championship' && !hasActiveArc('sports-fever', '')) {
    newArcs.push(makeArc(
      'sports-fever',
      'Jack London',
      'SPORTS',
      'Championship fever gripping the city.'
    ));
  }

  // FIRST FRIDAY → Arts-walk arc @ Uptown/KONO
  if (isFirstFriday && !hasActiveArc('arts-walk', '')) {
    const nh = Math.random() < 0.5 ? 'Uptown' : 'KONO';
    newArcs.push(makeArc(
      'arts-walk',
      nh,
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
    const nh = Math.random() < 0.5 ? 'Fruitvale' : 'West Oakland';
    newArcs.push(makeArc(
      'instability',
      nh,
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
    const nh = isFirstFriday ? 'Uptown' : 'Jack London';
    newArcs.push(makeArc(
      'cultural-moment',
      nh,
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
    const nh = Math.random() < 0.6 ? 'Jack London' : 'Uptown';
    newArcs.push(makeArc(
      'nightlife-surge',
      nh,
      'NIGHTLIFE',
      'Evening activity surging in the district.'
    ));
  }

  // RIVALRY ARC → City-wide
  if (isHigh && Math.random() < 0.1 && !hasActiveArc('rivalry', '')) {
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
  
  const existing = arc.involvedCitizens.find(c => c.id === citizenId);
  if (existing) {
    existing.role = role || existing.role;
    return;
  }
  
  const currentCycle = ctx.summary?.cycleId || ctx.config?.cycleCount || 0;
  
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
  const arcs = ctx.summary?.eventArcs || [];
  
  for (let arc of arcs) {
    if (!arc || arc.phase === 'resolved') continue;
    if (arc.involvedCitizens?.some(c => c.id === citizenId)) {
      return arc;
    }
  }
  
  return null;
}


/**
 * Helper: Get event probability boost for citizen based on arc involvement.
 */
function getArcEventBoost_(ctx, citizenId) {
  const arc = citizenInActiveArc_(ctx, citizenId);
  if (!arc) return 1.0;

  const phaseBoosts = {
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
 * EVENT ARC ENGINE REFERENCE v3.3
 * ============================================================================
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
 * NEW ARC TYPES (v3.3):
 * - festival: Oakland celebrations (Pride, Art & Soul, Lunar New Year, etc.)
 * - celebration: Major holiday energy
 * - sports-fever: Playoff/championship fan energy (SIGNAL, not storyline)
 * - parade: Parade day crowds and energy
 * - arts-walk: First Friday gallery crawl
 * - heritage: Creation Day Oakland heritage
 * 
 * CALENDAR-DRIVEN GENERATION:
 * 
 * | Trigger | Arc Type | Neighborhood |
 * |---------|----------|--------------|
 * | OaklandPride | festival | Downtown/Lake Merritt |
 * | ArtSoulFestival | festival | Downtown |
 * | LunarNewYear | festival | Chinatown |
 * | CincoDeMayo/DiaDeMuertos | festival | Fruitvale |
 * | Juneteenth | festival | West Oakland |
 * | NewYearsEve | celebration | Downtown |
 * | Major holidays | celebration | Downtown |
 * | Parade holidays | parade | Downtown |
 * | OpeningDay | sports-fever | Jack London |
 * | Playoffs | sports-fever | Jack London |
 * | Championship | sports-fever | Jack London |
 * | First Friday | arts-walk | Uptown/KONO |
 * | Creation Day | heritage | Downtown |
 * 
 * TENSION MODIFIERS (v3.3):
 * - festival: +1 oakland holiday, +0.5 any holiday, -0.5 no holiday
 * - celebration: +1 major holiday, +0.3 any holiday, -0.4 no holiday
 * - sports-fever: +1.5 championship, +1 playoffs, +0.5 late-season, -0.5 off-season
 * - arts-walk: +2 First Friday, -0.5 otherwise
 * - heritage: +2 Creation Day, -0.3 otherwise
 * 
 * MAX ACTIVE ARCS: 10 (up from 8)
 * 
 * NOTE: Arcs are SIGNALS for Media Room context.
 * They do NOT automate storylines or override Maker control.
 * 
 * ============================================================================
 */