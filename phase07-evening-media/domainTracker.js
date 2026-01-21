/**
 * ============================================================================
 * V3.2 DOMAIN TRACKER — GODWORLD CALENDAR INTEGRATION
 * ============================================================================
 *
 * Counts domain presence from worldEvents with calendar awareness.
 *
 * v3.2 Enhancements:
 * - Expanded domainMap (matches recordWorldEventsv3 v3.2)
 * - New domains: FESTIVAL, HOLIDAY, ARTS
 * - Calendar context boosters
 * - Sports season awareness
 * - First Friday / Creation Day domain effects
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v3.1):
 * - Domain derivation from event descriptions
 * - Arc domain tracking
 * - City dynamics domain effects
 * - Dominant domain detection
 * 
 * No sheet writes — pure functional logic.
 * 
 * ============================================================================
 */

function domainTracker_(ctx) {
  const domain = {};
  const S = ctx.summary || {};
  const arcs = S.eventArcs || [];
  const events = S.worldEvents || [];
  const dyn = S.cityDynamics || {};
  const weather = S.weather || {};

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v3.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || 'off-season';

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN MAP (v3.2 - matches recordWorldEventsv3 v3.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const domainMap = {
    // Health
    'symptom': 'HEALTH', 'illness': 'HEALTH', 'fainting': 'HEALTH', 'hospital': 'HEALTH',
    'heat exhaustion': 'HEALTH', 'burn': 'HEALTH', 'injury': 'HEALTH', 'allergy': 'HEALTH',
    
    // Civic
    'protest': 'CIVIC', 'petition': 'CIVIC', 'committee': 'CIVIC', 'zoning': 'CIVIC', 
    'budget': 'CIVIC', 'vote': 'CIVIC', 'meeting': 'CIVIC', 'complaint': 'CIVIC',
    'march': 'CIVIC', 'rally': 'CIVIC', 'memorial': 'CIVIC', 'ceremony': 'CIVIC',
    'tribute': 'CIVIC', 'founders': 'CIVIC', 'heritage': 'CIVIC', 'history': 'CIVIC',
    
    // Infrastructure
    'blackout': 'INFRASTRUCTURE', 'flicker': 'INFRASTRUCTURE', 'signal': 'INFRASTRUCTURE',
    'transformer': 'INFRASTRUCTURE', 'internet': 'INFRASTRUCTURE', 'pothole': 'INFRASTRUCTURE',
    'traffic': 'INFRASTRUCTURE', 'parking': 'INFRASTRUCTURE', 'gridlock': 'INFRASTRUCTURE',
    
    // Safety
    'theft': 'SAFETY', 'break-in': 'SAFETY', 'piracy': 'SAFETY', 'suspicious': 'SAFETY',
    'pursuit': 'SAFETY', 'graffiti': 'SAFETY', 'altercation': 'SAFETY', 'scalping': 'SAFETY',
    'confiscation': 'SAFETY', 'seizure': 'SAFETY',
    
    // Weather
    'downpour': 'WEATHER', 'fog': 'WEATHER', 'wind': 'WEATHER', 'snow': 'WEATHER',
    'temperature': 'WEATHER',
    
    // Sports (v3.2: expanded)
    'a\'s': 'SPORTS', 'practice': 'SPORTS', 'player': 'SPORTS', 'lineup': 'SPORTS',
    'athlete': 'SPORTS', 'rumor': 'SPORTS', 'game day': 'SPORTS', 'tailgate': 'SPORTS',
    'playoff': 'SPORTS', 'championship': 'SPORTS', 'victory': 'SPORTS', 'opening day': 'SPORTS',
    'first pitch': 'SPORTS', 'fan': 'SPORTS', 'stadium': 'SPORTS', 'watch party': 'SPORTS',
    
    // Business
    'kitchen fire': 'BUSINESS', 'staff': 'BUSINESS', 'walkout': 'BUSINESS', 'forklift': 'BUSINESS',
    'vendor': 'BUSINESS', 'food truck': 'BUSINESS', 'food cart': 'BUSINESS',
    
    // Education
    'school': 'EDUCATION', 'teacher': 'EDUCATION', 'test score': 'EDUCATION',
    'field trip': 'EDUCATION',
    
    // Culture / Arts (v3.2: expanded)
    'actor': 'CULTURE', 'influencer': 'CULTURE', 'filming': 'CULTURE', 'musician': 'CULTURE',
    'gallery': 'ARTS', 'art': 'ARTS', 'artist': 'ARTS', 'exhibit': 'ARTS',
    'first friday': 'ARTS', 'street performer': 'ARTS',
    
    // Festival (v3.2: new)
    'parade': 'FESTIVAL', 'float': 'FESTIVAL', 'festival': 'FESTIVAL', 'crowd surge': 'FESTIVAL',
    'barricade': 'FESTIVAL', 'overcrowding': 'FESTIVAL', 'costume': 'FESTIVAL',
    'pride': 'FESTIVAL', 'rainbow': 'FESTIVAL', 'glitter': 'FESTIVAL',
    
    // Holiday (v3.2: new)
    'fireworks': 'HOLIDAY', 'sparkler': 'HOLIDAY', 'countdown': 'HOLIDAY',
    'turkey fryer': 'HOLIDAY', 'egg hunt': 'HOLIDAY', 'trick-or-treat': 'HOLIDAY',
    'haunted': 'HOLIDAY', 'pumpkin': 'HOLIDAY', 'halloween': 'HOLIDAY',
    'lion dance': 'HOLIDAY', 'firecracker': 'HOLIDAY', 'dragon': 'HOLIDAY',
    'mariachi': 'HOLIDAY', 'piñata': 'HOLIDAY', 'fiesta': 'HOLIDAY',
    'altar': 'HOLIDAY', 'marigold': 'HOLIDAY', 'ofrenda': 'HOLIDAY',
    'shamrock': 'HOLIDAY', 'green beer': 'HOLIDAY', 'pub crawl': 'HOLIDAY',
    'bbq': 'HOLIDAY', 'patriotic': 'HOLIDAY', 'flag': 'HOLIDAY',
    
    // Environment / Community
    'earthquake': 'ENVIRONMENT', 'cleanup': 'ENVIRONMENT', 'tree planting': 'ENVIRONMENT',
    'drone': 'TECHNOLOGY',
    'lost dog': 'COMMUNITY', 'balloon': 'COMMUNITY', 'celebration': 'COMMUNITY',
    'gathering': 'COMMUNITY', 'lost child': 'COMMUNITY'
  };

  function deriveDomain(desc) {
    const lower = desc.toLowerCase();
    for (const [keyword, dom] of Object.entries(domainMap)) {
      if (lower.includes(keyword)) return dom;
    }
    return 'GENERAL';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAINS FROM ARCS
  // ═══════════════════════════════════════════════════════════════════════════
  for (const a of arcs) {
    if (!a || !a.domainTag) continue;
    const tag = a.domainTag.toUpperCase();
    domain[tag] = (domain[tag] || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAINS FROM WORLD EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  for (const e of events) {
    // Use pre-derived domain if available, otherwise derive
    let dom = e.domain ? e.domain.toUpperCase() : deriveDomain(e.description || '');
    domain[dom] = (domain[dom] || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER DOMAIN (always present if weather exists)
  // ═══════════════════════════════════════════════════════════════════════════
  if (weather.type && weather.type !== 'clear') {
    domain['WEATHER'] = (domain['WEATHER'] || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CITY DYNAMICS DOMAINS
  // ═══════════════════════════════════════════════════════════════════════════
  if (dyn.sentiment <= -0.3) {
    domain['CIVIC'] = (domain['CIVIC'] || 0) + 1;
  }
  if (dyn.nightlife >= 1.2) {
    domain['NIGHTLIFE'] = (domain['NIGHTLIFE'] || 0) + 1;
  }
  if (dyn.traffic >= 1.3) {
    domain['INFRASTRUCTURE'] = (domain['INFRASTRUCTURE'] || 0) + 1;
  }
  if (dyn.culturalActivity >= 1.3) {
    domain['CULTURE'] = (domain['CULTURE'] || 0) + 1;
  }
  if (dyn.communityEngagement >= 1.3) {
    domain['COMMUNITY'] = (domain['COMMUNITY'] || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: CALENDAR CONTEXT BOOSTERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Holidays boost HOLIDAY and FESTIVAL domains
  if (holiday !== 'none') {
    domain['HOLIDAY'] = (domain['HOLIDAY'] || 0) + 1;
    
    // Oakland celebrations get extra FESTIVAL
    if (holidayPriority === 'oakland') {
      domain['FESTIVAL'] = (domain['FESTIVAL'] || 0) + 2;
    } else if (holidayPriority === 'major') {
      domain['FESTIVAL'] = (domain['FESTIVAL'] || 0) + 1;
    }
  }

  // Specific holiday domain boosts
  if (holiday === 'OaklandPride' || holiday === 'ArtSoulFestival') {
    domain['FESTIVAL'] = (domain['FESTIVAL'] || 0) + 2;
    domain['CULTURE'] = (domain['CULTURE'] || 0) + 1;
  }
  if (holiday === 'LunarNewYear' || holiday === 'CincoDeMayo' || holiday === 'DiaDeMuertos') {
    domain['FESTIVAL'] = (domain['FESTIVAL'] || 0) + 1;
    domain['COMMUNITY'] = (domain['COMMUNITY'] || 0) + 1;
  }
  if (holiday === 'Juneteenth' || holiday === 'MLKDay') {
    domain['CIVIC'] = (domain['CIVIC'] || 0) + 1;
    domain['COMMUNITY'] = (domain['COMMUNITY'] || 0) + 1;
  }
  if (holiday === 'Independence' || holiday === 'MemorialDay' || holiday === 'VeteransDay') {
    domain['CIVIC'] = (domain['CIVIC'] || 0) + 1;
  }
  if (holiday === 'Halloween') {
    domain['COMMUNITY'] = (domain['COMMUNITY'] || 0) + 1;
  }
  if (holiday === 'Thanksgiving' || holiday === 'Easter') {
    domain['COMMUNITY'] = (domain['COMMUNITY'] || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: FIRST FRIDAY ARTS BOOST
  // ═══════════════════════════════════════════════════════════════════════════
  if (isFirstFriday) {
    domain['ARTS'] = (domain['ARTS'] || 0) + 2;
    domain['CULTURE'] = (domain['CULTURE'] || 0) + 1;
    domain['NIGHTLIFE'] = (domain['NIGHTLIFE'] || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: CREATION DAY CIVIC/COMMUNITY BOOST
  // ═══════════════════════════════════════════════════════════════════════════
  if (isCreationDay) {
    domain['CIVIC'] = (domain['CIVIC'] || 0) + 2;
    domain['COMMUNITY'] = (domain['COMMUNITY'] || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: SPORTS SEASON BOOST
  // ═══════════════════════════════════════════════════════════════════════════
  if (sportsSeason === 'championship') {
    domain['SPORTS'] = (domain['SPORTS'] || 0) + 3;
    domain['COMMUNITY'] = (domain['COMMUNITY'] || 0) + 1;
  } else if (sportsSeason === 'playoffs') {
    domain['SPORTS'] = (domain['SPORTS'] || 0) + 2;
  } else if (sportsSeason === 'late-season') {
    domain['SPORTS'] = (domain['SPORTS'] || 0) + 1;
  }
  if (holiday === 'OpeningDay') {
    domain['SPORTS'] = (domain['SPORTS'] || 0) + 2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.summary.domainPresence = domain;

  // Also store dominant domain for narrative use
  let maxDomain = 'GENERAL';
  let maxCount = 0;
  for (const [d, count] of Object.entries(domain)) {
    if (count > maxCount) {
      maxCount = count;
      maxDomain = d;
    }
  }
  ctx.summary.dominantDomain = maxDomain;

  // v3.2: Store calendar context for downstream
  ctx.summary.domainCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason
  };
}


/**
 * ============================================================================
 * DOMAIN TRACKER REFERENCE v3.2
 * ============================================================================
 * 
 * DOMAINS (15):
 * - HEALTH, CIVIC, INFRASTRUCTURE, SAFETY, WEATHER
 * - SPORTS, BUSINESS, EDUCATION, CULTURE, ARTS (v3.2)
 * - FESTIVAL (v3.2), HOLIDAY (v3.2)
 * - ENVIRONMENT, TECHNOLOGY, COMMUNITY, NIGHTLIFE, GENERAL
 * 
 * CALENDAR BOOSTERS (v3.2):
 * 
 * | Trigger | Domain Boosts |
 * |---------|---------------|
 * | Any holiday | HOLIDAY +1 |
 * | Oakland priority | FESTIVAL +2 |
 * | Major priority | FESTIVAL +1 |
 * | OaklandPride/ArtSoul | FESTIVAL +2, CULTURE +1 |
 * | LunarNewYear/Cinco/DiaDeMuertos | FESTIVAL +1, COMMUNITY +1 |
 * | Juneteenth/MLKDay | CIVIC +1, COMMUNITY +1 |
 * | Independence/Memorial/Veterans | CIVIC +1 |
 * | Halloween/Thanksgiving/Easter | COMMUNITY +1 |
 * | First Friday | ARTS +2, CULTURE +1, NIGHTLIFE +1 |
 * | Creation Day | CIVIC +2, COMMUNITY +1 |
 * | Championship | SPORTS +3, COMMUNITY +1 |
 * | Playoffs | SPORTS +2 |
 * | Late-season | SPORTS +1 |
 * | Opening Day | SPORTS +2 |
 * 
 * OUTPUT:
 * - domainPresence: {DOMAIN: count, ...}
 * - dominantDomain: string
 * - domainCalendarContext: {holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason}
 * 
 * ============================================================================
 */