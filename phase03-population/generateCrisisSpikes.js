/**
 * ============================================================================
 * generateCrisisSpikes_ v2.5
 * ============================================================================
 * 
 * World-aware crisis spike generator with GodWorld Calendar integration.
 * Oakland neighborhood integration (12 neighborhoods).
 * No memory. No cooldowns. No ledger reads.
 *
 * v2.5 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - Full GodWorld Calendar integration (30+ holidays)
 * - First Friday reduces crisis likelihood (community focus)
 * - Creation Day reduces crisis likelihood (reflective)
 * - Holiday-specific crisis type adjustments
 * - Sports season crowd-related crisis potential
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 * 
 * ============================================================================
 */

function generateCrisisSpikes_(ctx) {

  const S = ctx.summary;
  if (!S.worldEvents) S.worldEvents = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  const econMood = S.economicMood || 50;
  const season = S.season;
  const cycle = S.cycleId || ctx.config.cycleCount || 0;

  // Calendar context (v2.5)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE CRISIS CHANCE
  // ═══════════════════════════════════════════════════════════════════════════
  let baseChance = 0.65;
  
  // Weather increases crisis likelihood
  if (weather.impact >= 1.3) baseChance += 0.1;
  if (weatherMood.conflictPotential && weatherMood.conflictPotential > 0.3) baseChance += 0.05;
  
  // Negative sentiment increases crisis
  if (dynamics.sentiment <= -0.3) baseChance += 0.1;
  
  // Economic stress increases crisis
  if (econMood <= 35) baseChance += 0.1;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CHANCE MODIFIERS (v2.5)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Major holidays REDUCE crisis likelihood (community together, vigilance up)
  const peacefulHolidays = [
    "Thanksgiving", "Holiday", "Easter", "MothersDay", "FathersDay"
  ];
  if (peacefulHolidays.includes(holiday)) {
    baseChance -= 0.15;
  }

  // High-activity holidays may INCREASE certain crisis types (crowds, accidents)
  const crowdHolidays = [
    "Independence", "NewYearsEve", "Halloween", "OpeningDay", "OaklandPride"
  ];
  if (crowdHolidays.includes(holiday)) {
    baseChance += 0.05;
  }

  // Civic observance holidays reduce crisis (offices closed, less activity)
  const civicRestHolidays = [
    "MLKDay", "PresidentsDay", "MemorialDay", "LaborDay", "VeteransDay"
  ];
  if (civicRestHolidays.includes(holiday)) {
    baseChance -= 0.08;
  }

  // First Friday reduces crisis (community focus, positive energy)
  if (isFirstFriday) {
    baseChance -= 0.1;
  }

  // Creation Day reduces crisis (reflective, peaceful)
  if (isCreationDay) {
    baseChance -= 0.12;
  }

  // Championship/playoffs may increase safety-related incidents (crowds)
  if (sportsSeason === "championship") {
    baseChance += 0.08;
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    baseChance += 0.05;
  }

  // High community engagement reduces crisis
  if (dynamics.communityEngagement >= 1.4) {
    baseChance -= 0.08;
  } else if (dynamics.communityEngagement <= 0.7) {
    baseChance += 0.05;
  }

  // High cultural activity slightly reduces crisis
  if (dynamics.culturalActivity >= 1.4) {
    baseChance -= 0.05;
  }

  // Cap
  if (baseChance > 0.9) baseChance = 0.9;
  if (baseChance < 0.2) baseChance = 0.2;

  const MAX_SPIKES = Math.random() < baseChance ? 1 : 2;

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAINS WITH WORLD-AWARE WEIGHTS
  // ═══════════════════════════════════════════════════════════════════════════
  const DOMAINS = [
    { name: 'HEALTH', weight: 1.0 },
    { name: 'INFRASTRUCTURE', weight: 0.9 },
    { name: 'CIVIC', weight: 0.8 },
    { name: 'ECONOMIC', weight: 0.7 },
    { name: 'SAFETY', weight: 0.8 },
    { name: 'ENVIRONMENT', weight: 0.6 },
    { name: 'CULTURE', weight: 0.4 }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD STATE DOMAIN ADJUSTMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  DOMAINS.forEach(d => {
    // Winter increases health crises
    if (d.name === 'HEALTH' && season === 'Winter') d.weight += 0.2;
    
    // Bad weather increases infrastructure crises
    if (d.name === 'INFRASTRUCTURE' && weather.impact >= 1.3) d.weight += 0.3;
    
    // Economic stress increases economic crises
    if (d.name === 'ECONOMIC' && econMood <= 35) d.weight += 0.3;
    
    // Negative sentiment increases safety crises
    if (d.name === 'SAFETY' && dynamics.sentiment <= -0.3) d.weight += 0.2;
    
    // Heat increases environment crises
    if (d.name === 'ENVIRONMENT' && weather.type === 'hot') d.weight += 0.2;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR DOMAIN ADJUSTMENTS (v2.5)
  // ═══════════════════════════════════════════════════════════════════════════
  DOMAINS.forEach(d => {
    
    // Holiday-specific domain shifts
    
    // Gathering holidays increase health crisis risk
    const gatheringHolidays = [
      "Thanksgiving", "Holiday", "NewYearsEve", "Independence", "OpeningDay"
    ];
    if (d.name === 'HEALTH' && gatheringHolidays.includes(holiday)) {
      d.weight += 0.15;
    }

    // Crowd holidays increase safety crisis risk
    if (d.name === 'SAFETY' && crowdHolidays.includes(holiday)) {
      d.weight += 0.25;
    }

    // Championship increases safety crisis risk (crowds, celebrations)
    if (d.name === 'SAFETY' && sportsSeason === "championship") {
      d.weight += 0.3;
    } else if (d.name === 'SAFETY' && (sportsSeason === "playoffs" || sportsSeason === "post-season")) {
      d.weight += 0.15;
    }

    // Fireworks holidays increase safety and environment
    const fireworksHolidays = ["Independence", "NewYearsEve"];
    if ((d.name === 'SAFETY' || d.name === 'ENVIRONMENT') && fireworksHolidays.includes(holiday)) {
      d.weight += 0.2;
    }

    // Travel holidays increase infrastructure stress
    const travelHolidays = ["Thanksgiving", "Holiday", "MemorialDay", "LaborDay"];
    if (d.name === 'INFRASTRUCTURE' && travelHolidays.includes(holiday)) {
      d.weight += 0.15;
    }

    // Retail holidays increase economic pressure
    const retailHolidays = ["Holiday", "BlackFriday"];
    if (d.name === 'ECONOMIC' && retailHolidays.includes(holiday)) {
      d.weight += 0.2;
    }

    // Cultural holidays reduce cultural crisis (celebration, not crisis)
    const culturalCelebrations = [
      "Juneteenth", "CincoDeMayo", "DiaDeMuertos", "OaklandPride", 
      "LunarNewYear", "MLKDay"
    ];
    if (d.name === 'CULTURE' && culturalCelebrations.includes(holiday)) {
      d.weight -= 0.2;
      if (d.weight < 0.1) d.weight = 0.1;
    }

    // First Friday reduces cultural crisis, increases safety slightly
    if (isFirstFriday) {
      if (d.name === 'CULTURE') d.weight -= 0.15;
      if (d.name === 'SAFETY') d.weight += 0.1; // Crowds
    }

    // Creation Day reduces civic and cultural crisis
    if (isCreationDay) {
      if (d.name === 'CIVIC') d.weight -= 0.2;
      if (d.name === 'CULTURE') d.weight -= 0.15;
    }

    // High community engagement reduces safety crises
    if (d.name === 'SAFETY' && dynamics.communityEngagement >= 1.4) {
      d.weight -= 0.15;
    }

    // Ensure minimum weight
    if (d.weight < 0.1) d.weight = 0.1;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOODS (12 - v2.5)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoods = [
    { name: 'Temescal', weight: 0.9 },
    { name: 'Downtown', weight: 1.2 },
    { name: 'Fruitvale', weight: 1.0 },
    { name: 'Lake Merritt', weight: 0.8 },
    { name: 'West Oakland', weight: 1.3 },
    { name: 'Laurel', weight: 0.7 },
    { name: 'Rockridge', weight: 0.6 },
    { name: 'Jack London', weight: 1.0 },
    // v2.5: New neighborhoods
    { name: 'Uptown', weight: 1.1 },
    { name: 'KONO', weight: 0.9 },
    { name: 'Chinatown', weight: 1.0 },
    { name: 'Piedmont Ave', weight: 0.5 }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR NEIGHBORHOOD ADJUSTMENTS (v2.5)
  // ═══════════════════════════════════════════════════════════════════════════
  neighborhoods.forEach(n => {
    // First Friday increases Uptown/KONO activity
    if (isFirstFriday && (n.name === 'Uptown' || n.name === 'KONO' || n.name === 'Temescal')) {
      n.weight += 0.3;
    }

    // Jack London events
    if (isFirstFriday && n.name === 'Jack London') {
      n.weight += 0.2;
    }

    // Opening Day / Sports → Jack London, Downtown
    if ((holiday === 'OpeningDay' || sportsSeason === 'championship') && 
        (n.name === 'Jack London' || n.name === 'Downtown')) {
      n.weight += 0.3;
    }

    // Chinatown during Lunar New Year
    if (holiday === 'LunarNewYear' && n.name === 'Chinatown') {
      n.weight += 0.4;
    }

    // Fruitvale during cultural holidays
    const fruitvaleCultural = ['CincoDeMayo', 'DiaDeMuertos'];
    if (fruitvaleCultural.includes(holiday) && n.name === 'Fruitvale') {
      n.weight += 0.3;
    }

    // Downtown during major holidays
    if (holidayPriority === 'major' && n.name === 'Downtown') {
      n.weight += 0.2;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEVERITY LEVELS
  // ═══════════════════════════════════════════════════════════════════════════
  const severityLevels = ['low', 'low', 'medium', 'medium', 'medium', 'high'];

  // v2.5: Calendar can shift severity
  let severityPool = [...severityLevels];
  
  // Peaceful holidays reduce severity
  if (peacefulHolidays.includes(holiday) || isCreationDay) {
    severityPool = ['low', 'low', 'low', 'medium', 'medium'];
  }
  
  // Crowd holidays can increase severity
  if (crowdHolidays.includes(holiday) || sportsSeason === 'championship') {
    severityPool = ['low', 'medium', 'medium', 'medium', 'high', 'high'];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN PICKER
  // ═══════════════════════════════════════════════════════════════════════════
  const domainHits = {};

  function pickDomain() {
    let pool = [];
    DOMAINS.forEach(d => {
      const penalty = domainHits[d.name] ? 0.15 : 1;
      const effectiveWeight = d.weight * penalty;
      for (let i = 0; i < Math.round(effectiveWeight * 10); i++) {
        pool.push(d.name);
      }
    });
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD PICKER
  // ═══════════════════════════════════════════════════════════════════════════
  function pickNeighborhood() {
    let pool = [];
    neighborhoods.forEach(n => {
      for (let i = 0; i < Math.round(n.weight * 10); i++) {
        pool.push(n.name);
      }
    });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE SPIKES
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 0; i < MAX_SPIKES; i++) {

    const domain = pickDomain();
    if (!domain) continue;

    domainHits[domain] = (domainHits[domain] || 0) + 1;

    const neighborhood = pickNeighborhood();
    const severity = severityPool[Math.floor(Math.random() * severityPool.length)];
    
    // Impact score based on severity
    let impactBase = severity === 'high' ? 50 : severity === 'medium' ? 30 : 15;
    const impact = Math.round(impactBase + (Math.random() * 20 - 10));

    // v2.5: Add calendar context to event
    const event = {
      cycle: cycle,
      domain: domain,
      subdomain: 'crisis-spike',
      neighborhood: neighborhood,
      severity: severity,
      impactScore: impact,
      source: 'ENGINE',
      timestamp: ctx.now
    };

    // Tag with calendar context if relevant
    if (holiday !== "none") {
      event.holidayContext = holiday;
    }
    if (isFirstFriday) {
      event.firstFriday = true;
    }
    if (sportsSeason !== "off-season") {
      event.sportsSeason = sportsSeason;
    }

    S.worldEvents.push(event);

    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
  }

  ctx.summary = S;
}


/**
 * ============================================================================
 * CRISIS SPIKES REFERENCE
 * ============================================================================
 * 
 * BASE CHANCE: 0.65
 * MAX SPIKES: 1-2 per cycle
 * 
 * CHANCE MODIFIERS:
 * - Weather impact ≥1.3: +0.1
 * - Conflict potential >0.3: +0.05
 * - Negative sentiment: +0.1
 * - Economic stress (≤35): +0.1
 * 
 * CALENDAR CHANCE MODIFIERS (v2.5):
 * 
 * | Factor | Effect |
 * |--------|--------|
 * | Peaceful holidays (Thanksgiving, etc.) | -0.15 |
 * | Crowd holidays (Independence, etc.) | +0.05 |
 * | Civic rest holidays (MLKDay, etc.) | -0.08 |
 * | First Friday | -0.1 |
 * | Creation Day | -0.12 |
 * | Championship | +0.08 |
 * | Playoffs | +0.05 |
 * | High community engagement | -0.08 |
 * | Low community engagement | +0.05 |
 * | High cultural activity | -0.05 |
 * 
 * DOMAINS:
 * - HEALTH, INFRASTRUCTURE, CIVIC, ECONOMIC, SAFETY, ENVIRONMENT, CULTURE
 * 
 * DOMAIN CALENDAR ADJUSTMENTS:
 * - Gathering holidays → HEALTH +0.15
 * - Crowd holidays → SAFETY +0.25
 * - Championship → SAFETY +0.3
 * - Fireworks holidays → SAFETY/ENVIRONMENT +0.2
 * - Travel holidays → INFRASTRUCTURE +0.15
 * - Retail holidays → ECONOMIC +0.2
 * - Cultural celebrations → CULTURE -0.2
 * - First Friday → CULTURE -0.15, SAFETY +0.1
 * - Creation Day → CIVIC -0.2, CULTURE -0.15
 * 
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave (v2.5)
 * 
 * NEIGHBORHOOD CALENDAR ADJUSTMENTS:
 * - First Friday → Uptown/KONO/Temescal +0.3, Jack London +0.2
 * - Sports → Jack London/Downtown +0.3
 * - Lunar New Year → Chinatown +0.4
 * - CincoDeMayo/DiaDeMuertos → Fruitvale +0.3
 * - Major holidays → Downtown +0.2
 * 
 * SEVERITY:
 * - Normal: low/low/medium/medium/medium/high
 * - Peaceful holidays: low/low/low/medium/medium
 * - Crowd holidays: low/medium/medium/medium/high/high
 * 
 * ============================================================================
 */