/**
 * ============================================================================
 * ECONOMIC RIPPLE ENGINE v2.4
 * ============================================================================
 *
 * CONNECTED: Factors in migration drift AND career signals from Career Engine.
 *
 * v2.3 Enhancements:
 * - Wired to Career Engine v2.3.1: reads ctx.summary.careerSignals
 * - Layoffs >= 3 triggers MAJOR_LAYOFFS ripple
 * - Promotions >= 4 triggers WORKFORCE_GROWTH ripple
 * - Sector shifts flagged as career churn
 *
 * v2.2 Features (retained):
 * - Migration drift impact on economic mood
 * - Employment rate derived from mood and migration
 * - Bidirectional connection with applyMigrationDrift_
 *
 * v2.1 Features (retained):
 * - Holiday shopping boost, festival effects, sports spending
 * - Calendar-triggered ripples
 *
 * EXECUTION ORDER:
 * Run AFTER Career Engine (Phase 5) and BEFORE applyMigrationDrift_.
 * Reads careerSignals from Career Engine and previousCycleState.migrationDrift.
 *
 * ============================================================================
 */


// ═══════════════════════════════════════════════════════════════
// RIPPLE TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════

var ECONOMIC_TRIGGERS = {
  // Positive triggers
  TECH_INVESTMENT: { impact: 15, duration: 8, sectors: ['tech', 'retail'], neighborhoods: ['Downtown', 'Jack London'] },
  SPORTS_CHAMPIONSHIP: { impact: 10, duration: 4, sectors: ['entertainment', 'food', 'retail'], neighborhoods: ['Downtown', 'Jack London'] },
  NEW_BUSINESS: { impact: 5, duration: 6, sectors: ['retail', 'services'], neighborhoods: ['Rockridge', 'Temescal', 'Laurel'] },
  CONSTRUCTION_BOOM: { impact: 12, duration: 10, sectors: ['construction', 'retail', 'housing'], neighborhoods: ['West Oakland', 'Downtown'] },
  TOURISM_SPIKE: { impact: 8, duration: 3, sectors: ['food', 'entertainment', 'retail'], neighborhoods: ['Jack London', 'Lake Merritt'] },
  CULTURAL_EVENT: { impact: 6, duration: 3, sectors: ['entertainment', 'food'], neighborhoods: ['Jack London', 'Fruitvale', 'Lake Merritt'] },
  
  // Negative triggers
  FACTORY_CLOSURE: { impact: -20, duration: 12, sectors: ['manufacturing', 'retail'], neighborhoods: ['West Oakland'] },
  CRIME_SPIKE: { impact: -8, duration: 4, sectors: ['retail', 'entertainment', 'tourism'], neighborhoods: ['Downtown', 'Fruitvale'] },
  NATURAL_DISASTER: { impact: -25, duration: 8, sectors: ['all'], neighborhoods: ['all'] },
  MAJOR_LAYOFFS: { impact: -15, duration: 10, sectors: ['tech', 'services', 'retail'], neighborhoods: ['Downtown', 'Rockridge'] },
  INFRASTRUCTURE_FAILURE: { impact: -10, duration: 6, sectors: ['transit', 'retail'], neighborhoods: ['West Oakland', 'Downtown'] },
  HEALTH_CRISIS: { impact: -12, duration: 8, sectors: ['healthcare', 'retail', 'food'], neighborhoods: ['Temescal', 'Fruitvale'] },
  
  // Calendar triggers
  HOLIDAY_SHOPPING: { impact: 18, duration: 4, sectors: ['retail', 'food', 'services'], neighborhoods: ['all'] },
  FESTIVAL_TOURISM: { impact: 12, duration: 2, sectors: ['entertainment', 'food', 'retail', 'tourism'], neighborhoods: ['Downtown', 'Jack London'] },
  PLAYOFF_SPENDING: { impact: 8, duration: 3, sectors: ['entertainment', 'food', 'retail'], neighborhoods: ['Jack London', 'Downtown'] },
  CHAMPIONSHIP_BOOM: { impact: 15, duration: 3, sectors: ['entertainment', 'food', 'retail', 'merchandise'], neighborhoods: ['Jack London', 'Downtown'] },
  ARTS_DISTRICT_BOOST: { impact: 6, duration: 1, sectors: ['arts', 'entertainment', 'food'], neighborhoods: ['Temescal', 'Jack London'] },
  LOCAL_PRIDE_BOOST: { impact: 5, duration: 2, sectors: ['retail', 'food', 'local'], neighborhoods: ['all'] },
  SUMMER_TOURISM: { impact: 7, duration: 8, sectors: ['tourism', 'entertainment', 'food'], neighborhoods: ['Jack London', 'Lake Merritt'] },
  CULTURAL_CELEBRATION: { impact: 10, duration: 2, sectors: ['food', 'retail', 'entertainment'], neighborhoods: [] },
  WINTER_DOLDRUMS: { impact: -4, duration: 6, sectors: ['retail', 'entertainment'], neighborhoods: ['all'] },
  
  // v2.2: Migration-triggered
  POPULATION_SURGE: { impact: 8, duration: 4, sectors: ['housing', 'retail', 'services'], neighborhoods: ['all'] },
  POPULATION_EXODUS: { impact: -10, duration: 5, sectors: ['retail', 'services', 'housing'], neighborhoods: ['all'] },
  WORKFORCE_GROWTH: { impact: 6, duration: 3, sectors: ['business', 'services'], neighborhoods: ['Downtown', 'Rockridge'] },
  WORKFORCE_DECLINE: { impact: -8, duration: 4, sectors: ['business', 'services'], neighborhoods: ['Downtown', 'West Oakland'] }
};

var NEIGHBORHOOD_ECONOMIES = {
  'Downtown': { primary: ['business', 'civic', 'retail'], sensitivity: 1.2 },
  'Jack London': { primary: ['entertainment', 'food', 'nightlife'], sensitivity: 1.1 },
  'Rockridge': { primary: ['retail', 'services', 'food'], sensitivity: 0.9 },
  'Temescal': { primary: ['healthcare', 'education', 'retail', 'arts'], sensitivity: 0.8 },
  'Fruitvale': { primary: ['retail', 'food', 'community'], sensitivity: 1.0 },
  'Lake Merritt': { primary: ['entertainment', 'tourism', 'food'], sensitivity: 0.9 },
  'West Oakland': { primary: ['manufacturing', 'transit', 'construction'], sensitivity: 1.3 },
  'Laurel': { primary: ['retail', 'services', 'community'], sensitivity: 0.8 },
  'Chinatown': { primary: ['retail', 'food', 'community'], sensitivity: 1.0 },
  'Grand Lake': { primary: ['entertainment', 'retail', 'food'], sensitivity: 0.9 }
};

var HOLIDAY_ECONOMIC_ZONES = {
  'OaklandPride': ['Downtown', 'Lake Merritt', 'Grand Lake', 'Jack London'],
  'ArtSoulFestival': ['Downtown', 'Jack London'],
  'LunarNewYear': ['Chinatown', 'Downtown'],
  'CincoDeMayo': ['Fruitvale'],
  'DiaDeMuertos': ['Fruitvale'],
  'Juneteenth': ['West Oakland', 'Downtown']
};

var SHOPPING_HOLIDAYS = ['Thanksgiving', 'Holiday', 'BlackFriday'];
var FESTIVAL_HOLIDAYS = ['OaklandPride', 'ArtSoulFestival', 'Independence'];


// ═══════════════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════════════

function runEconomicRippleEngine_(ctx) {
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;
  var S = ctx.summary || {};

  // v2.4: Store rng on S for helper functions that don't receive ctx
  S._rng = rng;

  S.economicRipples = S.economicRipples || [];
  S.economicMood = S.economicMood || 50;
  S.neighborhoodEconomies = S.neighborhoodEconomies || {};
  
  var currentCycle = S.cycleId || ctx.config.cycleCount || 0;
  
  // Calendar context
  var calendarContext = {
    holiday: S.holiday || 'none',
    holidayPriority: S.holidayPriority || 'none',
    isFirstFriday: S.isFirstFriday || false,
    isCreationDay: S.isCreationDay || false,
    sportsSeason: S.sportsSeason || 'off-season',
    season: S.season || 'unknown',
    month: S.month || 0
  };
  ctx.economicCalendarContext = calendarContext;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: GET PREVIOUS CYCLE MIGRATION DATA
  // ═══════════════════════════════════════════════════════════════════════════
  var prevCycle = S.previousCycleState || {};
  var prevMigration = prevCycle.migrationDrift || 0;
  var prevMigrationFactors = prevCycle.migrationDriftFactors || [];
  
  ctx.economicMigrationContext = {
    prevMigration: prevMigration,
    prevMigrationFactors: prevMigrationFactors
  };
  
  // 1. Detect migration-triggered ripples
  detectMigrationRipples_(ctx, currentCycle);

  // 1b. v2.3: Detect career-triggered ripples (reads careerSignals from Career Engine)
  detectCareerRipples_(ctx, currentCycle);

  // 2. Detect calendar-triggered ripples
  detectCalendarRipples_(ctx, currentCycle);
  
  // 3. Detect event-triggered ripples
  detectNewRipples_(ctx, currentCycle);
  
  // 4. Process active ripples
  processActiveRipples_(ctx, currentCycle);
  
  // 5. Calculate economic mood (with migration impact)
  calculateEconomicMood_(ctx);
  
  // 6. Calculate neighborhood economies
  calculateNeighborhoodEconomies_(ctx);
  
  // 7. v2.2: Derive and update employment rate
  deriveEmploymentRate_(ctx);
  
  // 8. Generate summary
  generateEconomicSummary_(ctx);
  
  ctx.summary = S;
  
  var careerSignals = S.careerSignals || {};
  Logger.log('runEconomicRippleEngine_ v2.4: mood=' + S.economicMood +
    ' | ripples=' + S.economicRipples.length +
    ' | prevMigration=' + prevMigration +
    ' | layoffs=' + (careerSignals.layoffs || 0));
}


// ═══════════════════════════════════════════════════════════════
// v2.2: MIGRATION RIPPLE DETECTION
// ═══════════════════════════════════════════════════════════════

function detectMigrationRipples_(ctx, currentCycle) {
  var S = ctx.summary;
  var migCtx = ctx.economicMigrationContext || {};
  var cal = ctx.economicCalendarContext || {};
  
  var prevMig = migCtx.prevMigration || 0;
  
  // Population surge (high positive migration)
  if (prevMig >= 30) {
    createRipple_(S, 'POPULATION_SURGE', currentCycle, 
      { description: 'Population influx boosting local economy' }, '', cal);
  } else if (prevMig >= 20) {
    createRipple_(S, 'WORKFORCE_GROWTH', currentCycle, 
      { description: 'Growing workforce expanding business activity' }, 'Downtown', cal);
  }
  
  // Population exodus (high negative migration)
  if (prevMig <= -30) {
    createRipple_(S, 'POPULATION_EXODUS', currentCycle, 
      { description: 'Population decline impacting local businesses' }, '', cal);
  } else if (prevMig <= -20) {
    createRipple_(S, 'WORKFORCE_DECLINE', currentCycle, 
      { description: 'Shrinking workforce affecting business climate' }, 'Downtown', cal);
  }
}


// ═══════════════════════════════════════════════════════════════
// v2.3: CAREER RIPPLE DETECTION (wired to Career Engine v2.3.1)
// ═══════════════════════════════════════════════════════════════

function detectCareerRipples_(ctx, currentCycle) {
  var S = ctx.summary;
  var cal = ctx.economicCalendarContext || {};
  var careerSignals = S.careerSignals || {};

  // MAJOR_LAYOFFS: triggered when career engine reports significant layoffs
  // Threshold: 3+ layoffs in a single cycle indicates systemic issue
  var layoffs = careerSignals.layoffs || 0;
  if (layoffs >= 3) {
    createRipple_(S, 'MAJOR_LAYOFFS', currentCycle,
      { description: 'Multiple layoffs reported across industries' }, 'Downtown', cal);
  }

  // WORKFORCE_GROWTH: triggered by high promotion rate
  // Threshold: 4+ promotions indicates healthy job market
  var promotions = careerSignals.promotions || 0;
  if (promotions >= 4) {
    createRipple_(S, 'WORKFORCE_GROWTH', currentCycle,
      { description: 'Career advancement activity signals strong job market' }, 'Downtown', cal);
  }

  // Sector shifts can indicate economic churn
  var sectorShifts = careerSignals.sectorShifts || 0;
  if (sectorShifts >= 3) {
    // Not a specific trigger, but affects mood calculation
    S.careerChurn = true;
  }
}


// ═══════════════════════════════════════════════════════════════
// CALENDAR RIPPLE DETECTION
// ═══════════════════════════════════════════════════════════════

function detectCalendarRipples_(ctx, currentCycle) {
  var S = ctx.summary;
  var cal = ctx.economicCalendarContext || {};
  
  // Holiday shopping
  if (SHOPPING_HOLIDAYS.indexOf(cal.holiday) >= 0) {
    createRipple_(S, 'HOLIDAY_SHOPPING', currentCycle, 
      { description: cal.holiday + ' shopping surge' }, '', cal);
  }
  
  if (cal.month === 12 && cal.holiday === 'none') {
    var holidayRippleExists = false;
    for (var i = 0; i < S.economicRipples.length; i++) {
      if (S.economicRipples[i] &&
          S.economicRipples[i].type === 'HOLIDAY_SHOPPING' &&
          S.economicRipples[i].endCycle > currentCycle) {
        holidayRippleExists = true;
        break;
      }
    }
    if (!holidayRippleExists) {
      createRipple_(S, 'HOLIDAY_SHOPPING', currentCycle, 
        { description: 'Holiday season shopping' }, '', cal);
    }
  }
  
  // Festival tourism
  if (FESTIVAL_HOLIDAYS.indexOf(cal.holiday) >= 0) {
    createRipple_(S, 'FESTIVAL_TOURISM', currentCycle, 
      { description: cal.holiday + ' festival tourism' }, 'Downtown', cal);
  }
  
  if (cal.holidayPriority === 'oakland' && FESTIVAL_HOLIDAYS.indexOf(cal.holiday) < 0) {
    var zones = HOLIDAY_ECONOMIC_ZONES[cal.holiday] || ['Downtown'];
    createRipple_(S, 'FESTIVAL_TOURISM', currentCycle, 
      { description: cal.holiday + ' celebration tourism' }, zones[0], cal);
  }
  
  // Cultural celebrations
  var culturalHolidays = ['LunarNewYear', 'CincoDeMayo', 'DiaDeMuertos', 'Juneteenth'];
  if (culturalHolidays.indexOf(cal.holiday) >= 0) {
    var cZones = HOLIDAY_ECONOMIC_ZONES[cal.holiday] || ['Downtown'];
    var ripple = createRipple_(S, 'CULTURAL_CELEBRATION', currentCycle, 
      { description: cal.holiday + ' economic activity' }, cZones[0], cal);
    if (ripple) {
      ripple.neighborhoods = cZones;
    }
  }
  
  // Sports
  if (cal.sportsSeason === 'championship') {
    createRipple_(S, 'CHAMPIONSHIP_BOOM', currentCycle, 
      { description: 'Championship economic surge' }, 'Jack London', cal);
  } else if (cal.sportsSeason === 'playoffs') {
    createRipple_(S, 'PLAYOFF_SPENDING', currentCycle, 
      { description: 'Playoff game spending' }, 'Jack London', cal);
  }
  
  if (cal.holiday === 'OpeningDay') {
    createRipple_(S, 'SPORTS_CHAMPIONSHIP', currentCycle, 
      { description: 'Opening Day economic boost' }, 'Jack London', cal);
  }
  
  // First Friday
  if (cal.isFirstFriday) {
    createRipple_(S, 'ARTS_DISTRICT_BOOST', currentCycle, 
      { description: 'First Friday arts district activity' }, 'Temescal', cal);
  }
  
  // Creation Day
  if (cal.isCreationDay) {
    createRipple_(S, 'LOCAL_PRIDE_BOOST', currentCycle, 
      { description: 'Creation Day local business support' }, '', cal);
  }
  
  // Seasonal
  if (cal.season === 'summer' && cal.month >= 6 && cal.month <= 8) {
    var summerExists = false;
    for (var j = 0; j < S.economicRipples.length; j++) {
      if (S.economicRipples[j].type === 'SUMMER_TOURISM' && 
          S.economicRipples[j].endCycle > currentCycle) {
        summerExists = true;
        break;
      }
    }
    if (!summerExists) {
      createRipple_(S, 'SUMMER_TOURISM', currentCycle, 
        { description: 'Summer tourism season' }, 'Jack London', cal);
    }
  }
  
  if (cal.season === 'winter' && (cal.month === 1 || cal.month === 2) && cal.holiday === 'none') {
    var winterExists = false;
    for (var k = 0; k < S.economicRipples.length; k++) {
      if (S.economicRipples[k].type === 'WINTER_DOLDRUMS' && 
          S.economicRipples[k].endCycle > currentCycle) {
        winterExists = true;
        break;
      }
    }
    if (!winterExists) {
      createRipple_(S, 'WINTER_DOLDRUMS', currentCycle, 
        { description: 'Post-holiday spending slowdown' }, '', cal);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// EVENT RIPPLE DETECTION
// ═══════════════════════════════════════════════════════════════

function detectNewRipples_(ctx, currentCycle) {
  var S = ctx.summary;
  var cal = ctx.economicCalendarContext || {};
  var worldEvents = S.worldEvents || [];
  var citizenEvents = S.citizenEvents || [];
  var crisisEvents = S.crisisSpikes || [];
  var domains = S.domainPresence || {};
  
  var allEvents = worldEvents.concat(citizenEvents);
  
  for (var i = 0; i < allEvents.length; i++) {
    var evt = allEvents[i];
    var evtText = (evt.headline || evt.description || evt.event || '').toLowerCase();
    var evtNeighborhood = evt.neighborhood || '';
    
    if (evtText.indexOf('investment') >= 0 || evtText.indexOf('funding') >= 0) {
      createRipple_(S, 'TECH_INVESTMENT', currentCycle, evt, evtNeighborhood, cal);
    }
    else if (evtText.indexOf('championship') >= 0 || evtText.indexOf('victory') >= 0) {
      createRipple_(S, 'SPORTS_CHAMPIONSHIP', currentCycle, evt, evtNeighborhood, cal);
    }
    else if (evtText.indexOf('new store') >= 0 || evtText.indexOf('grand opening') >= 0) {
      createRipple_(S, 'NEW_BUSINESS', currentCycle, evt, evtNeighborhood, cal);
    }
    else if (evtText.indexOf('construction') >= 0 || evtText.indexOf('development') >= 0) {
      createRipple_(S, 'CONSTRUCTION_BOOM', currentCycle, evt, evtNeighborhood, cal);
    }
    else if (evtText.indexOf('layoff') >= 0 || evtText.indexOf('job cuts') >= 0) {
      createRipple_(S, 'MAJOR_LAYOFFS', currentCycle, evt, evtNeighborhood, cal);
    }
    else if (evtText.indexOf('closure') >= 0 || evtText.indexOf('shut down') >= 0) {
      createRipple_(S, 'FACTORY_CLOSURE', currentCycle, evt, evtNeighborhood, cal);
    }
    else if (evtText.indexOf('crime') >= 0 || evtText.indexOf('robbery') >= 0) {
      createRipple_(S, 'CRIME_SPIKE', currentCycle, evt, evtNeighborhood, cal);
    }
    else if (evtText.indexOf('festival') >= 0 || evtText.indexOf('cultural') >= 0) {
      createRipple_(S, 'CULTURAL_EVENT', currentCycle, evt, evtNeighborhood, cal);
    }
    else if (evtText.indexOf('infrastructure') >= 0 || evtText.indexOf('power outage') >= 0) {
      createRipple_(S, 'INFRASTRUCTURE_FAILURE', currentCycle, evt, evtNeighborhood, cal);
    }
  }
  
  if ((domains['BUSINESS'] || 0) >= 3) {
    createRipple_(S, 'NEW_BUSINESS', currentCycle, { description: 'Business activity surge' }, '', cal);
  }
  
  for (var j = 0; j < crisisEvents.length; j++) {
    var crisis = crisisEvents[j];
    if (crisis.type === 'natural_disaster' || crisis.severity > 7) {
      createRipple_(S, 'NATURAL_DISASTER', currentCycle, crisis, '', cal);
    }
  }
  
  var weather = S.weather || {};
  if (weather.impact >= 1.4) {
    createRipple_(S, 'INFRASTRUCTURE_FAILURE', currentCycle, 
      { description: 'Severe weather disruption' }, 'West Oakland', cal);
  }
}


function createRipple_(S, triggerType, cycle, sourceEvent, eventNeighborhood, cal) {
  var trigger = ECONOMIC_TRIGGERS[triggerType];
  if (!trigger) return null;
  
  var rippleId = triggerType + '_' + cycle;
  for (var i = 0; i < S.economicRipples.length; i++) {
    if (S.economicRipples[i] && S.economicRipples[i].id === rippleId) return null;
  }
  
  var neighborhood = eventNeighborhood || '';
  if (!neighborhood && trigger.neighborhoods && trigger.neighborhoods.length > 0 &&
      trigger.neighborhoods[0] !== 'all') {
    var _rng = (typeof S._rng === 'function') ? S._rng : Math.random;
    neighborhood = trigger.neighborhoods[Math.floor(_rng() * trigger.neighborhoods.length)];
  }
  
  var impact = trigger.impact;
  if (cal && cal.holiday !== 'none' && impact > 0) {
    if (cal.holidayPriority === 'oakland') {
      impact *= 1.3;
    } else if (cal.holidayPriority === 'major') {
      impact *= 1.2;
    }
  }
  if (cal && cal.sportsSeason === 'championship' && triggerType.indexOf('SPORTS') >= 0) {
    impact *= 1.5;
  }
  
  var ripple = {
    id: rippleId,
    type: triggerType,
    impact: Math.round(impact * 100) / 100,
    sectors: trigger.sectors,
    neighborhoods: trigger.neighborhoods,
    primaryNeighborhood: neighborhood,
    startCycle: cycle,
    endCycle: cycle + trigger.duration,
    currentStrength: Math.round(impact * 100) / 100,
    source: sourceEvent ? (sourceEvent.headline || sourceEvent.description || 'System') : 'System',
    holiday: cal ? cal.holiday : 'none',
    sportsSeason: cal ? cal.sportsSeason : 'off-season',
    season: cal ? cal.season : 'unknown'
  };
  
  S.economicRipples.push(ripple);
  return ripple;
}


// ═══════════════════════════════════════════════════════════════
// RIPPLE PROCESSING
// ═══════════════════════════════════════════════════════════════

function processActiveRipples_(ctx, currentCycle) {
  var S = ctx.summary;
  var activeRipples = [];
  
  for (var i = 0; i < S.economicRipples.length; i++) {
    var ripple = S.economicRipples[i];
    if (!ripple) continue;

    if (currentCycle >= ripple.endCycle) {
      continue;
    }
    
    var totalDuration = ripple.endCycle - ripple.startCycle;
    var elapsed = currentCycle - ripple.startCycle;
    var decayFactor = 1 - (elapsed / totalDuration);
    ripple.currentStrength = Math.round(ripple.impact * decayFactor * 100) / 100;
    
    activeRipples.push(ripple);
  }
  
  S.economicRipples = activeRipples;
}


// ═══════════════════════════════════════════════════════════════
// ECONOMIC MOOD (v2.2: with migration impact)
// ═══════════════════════════════════════════════════════════════

function calculateEconomicMood_(ctx) {
  var S = ctx.summary;
  var cal = ctx.economicCalendarContext || {};
  var migCtx = ctx.economicMigrationContext || {};
  
  var baseMood = S.economicMood || 50;
  var rippleEffect = 0;
  
  for (var i = 0; i < S.economicRipples.length; i++) {
    if (S.economicRipples[i]) rippleEffect += S.economicRipples[i].currentStrength;
  }
  
  var newMood = baseMood + (rippleEffect * 0.1);
  
  // Natural drift toward neutral
  if (newMood > 50) {
    newMood -= 0.5;
  } else if (newMood < 50) {
    newMood += 0.5;
  }
  
  // City dynamics
  var dynamics = S.cityDynamics || {};
  if (dynamics.retail >= 1.2) newMood += 0.5;
  if (dynamics.retail <= 0.8) newMood -= 0.5;
  
  // ─────────────────────────────────────────────────────────────
  // v2.2: MIGRATION IMPACT ON MOOD
  // ─────────────────────────────────────────────────────────────
  var prevMig = migCtx.prevMigration || 0;
  
  // Population growth is good for economy
  if (prevMig >= 30) {
    newMood += 4;
  } else if (prevMig >= 15) {
    newMood += 2;
  } else if (prevMig <= -30) {
    newMood -= 5;
  } else if (prevMig <= -15) {
    newMood -= 2;
  }
  
  // Calendar modifiers
  if (SHOPPING_HOLIDAYS.indexOf(cal.holiday) >= 0 || cal.month === 12) {
    newMood += 3;
  }
  
  if (cal.holidayPriority === 'oakland') {
    newMood += 2;
  }
  
  if (cal.sportsSeason === 'championship') {
    newMood += 4;
  } else if (cal.sportsSeason === 'playoffs') {
    newMood += 2;
  }
  
  if (cal.isFirstFriday) {
    newMood += 1;
  }
  
  if (cal.isCreationDay) {
    newMood += 1.5;
  }
  
  if (cal.season === 'summer') {
    newMood += 1;
  }
  
  if (cal.month === 1 && cal.holiday === 'none') {
    newMood -= 2;
  }
  
  // Clamp
  S.economicMood = Math.round(Math.max(0, Math.min(100, newMood)) * 100) / 100;
  
  // Descriptor
  if (S.economicMood >= 70) {
    S.economicMoodDesc = 'booming';
  } else if (S.economicMood >= 55) {
    S.economicMoodDesc = 'optimistic';
  } else if (S.economicMood >= 45) {
    S.economicMoodDesc = 'stable';
  } else if (S.economicMood >= 30) {
    S.economicMoodDesc = 'uncertain';
  } else {
    S.economicMoodDesc = 'struggling';
  }
}


// ═══════════════════════════════════════════════════════════════
// v2.2: DERIVE EMPLOYMENT RATE
// ═══════════════════════════════════════════════════════════════

function deriveEmploymentRate_(ctx) {
  var S = ctx.summary;
  var migCtx = ctx.economicMigrationContext || {};
  
  // Base employment from economic mood
  // Mood 0-100 maps to employment 0.82-0.96
  var baseEmployment = 0.82 + (S.economicMood / 100) * 0.14;
  
  // Adjust for migration
  var prevMig = migCtx.prevMigration || 0;
  var migAdjust = 0;
  
  // Influx of workers can temporarily raise unemployment
  if (prevMig >= 30) {
    migAdjust = -0.01; // 1% temporary unemployment from surge
  } else if (prevMig >= 15) {
    migAdjust = -0.005;
  }
  // Exodus can lower unemployment (fewer workers)
  else if (prevMig <= -30) {
    migAdjust = 0.01; // 1% improvement from smaller workforce
  } else if (prevMig <= -15) {
    migAdjust = 0.005;
  }
  
  var derivedEmployment = Math.max(0.80, Math.min(0.97, baseEmployment + migAdjust));
  derivedEmployment = Math.round(derivedEmployment * 1000) / 1000;
  
  S.derivedEmploymentRate = derivedEmployment;
  
  // Update World_Population if available
  var popSheet = ctx.ss.getSheetByName('World_Population');
  if (popSheet) {
    var popVals = popSheet.getDataRange().getValues();
    var header = popVals[0];
    var employmentIdx = header.indexOf('employmentRate');
    var economyIdx = header.indexOf('economy');
    
    if (employmentIdx >= 0) {
      popSheet.getRange(2, employmentIdx + 1).setValue(derivedEmployment);
    }
    
    // Update economy descriptor
    if (economyIdx >= 0) {
      var econDesc = 'stable';
      if (S.economicMood >= 65) econDesc = 'strong';
      else if (S.economicMood >= 45) econDesc = 'stable';
      else if (S.economicMood >= 30) econDesc = 'weak';
      else econDesc = 'unstable';
      
      popSheet.getRange(2, economyIdx + 1).setValue(econDesc);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// NEIGHBORHOOD ECONOMIES
// ═══════════════════════════════════════════════════════════════

function calculateNeighborhoodEconomies_(ctx) {
  var S = ctx.summary;
  var cal = ctx.economicCalendarContext || {};
  var ripples = S.economicRipples || [];
  var baseMood = S.economicMood || 50;
  
  var nhEconomies = {};
  var holidayZones = HOLIDAY_ECONOMIC_ZONES[cal.holiday] || [];
  
  for (var nh in NEIGHBORHOOD_ECONOMIES) {
    if (!NEIGHBORHOOD_ECONOMIES.hasOwnProperty(nh)) continue;
    
    var profile = NEIGHBORHOOD_ECONOMIES[nh];
    var localMood = baseMood;
    var localRipples = 0;
    
    for (var i = 0; i < ripples.length; i++) {
      var ripple = ripples[i];
      if (!ripple) continue;
      var affectsAll = ripple.neighborhoods && ripple.neighborhoods.indexOf('all') >= 0;
      var affectsThis = ripple.neighborhoods && ripple.neighborhoods.indexOf(nh) >= 0;
      var isPrimary = ripple.primaryNeighborhood === nh;

      if (affectsAll || affectsThis) {
        var effect = (ripple.currentStrength || 0) * (profile.sensitivity || 1);
        if (isPrimary) effect *= 1.5;
        localMood += effect * 0.1;
        localRipples++;
      }
    }
    
    if (holidayZones.indexOf(nh) >= 0) {
      localMood += 5;
      localRipples++;
    }
    
    if (cal.isFirstFriday && (nh === 'Temescal' || nh === 'Jack London')) {
      localMood += 3;
    }
    
    if ((cal.sportsSeason === 'playoffs' || cal.sportsSeason === 'championship') && 
        nh === 'Jack London') {
      localMood += cal.sportsSeason === 'championship' ? 8 : 5;
    }
    
    localMood = Math.round(Math.max(0, Math.min(100, localMood)) * 100) / 100;
    
    var desc = 'stable';
    if (localMood >= 65) desc = 'thriving';
    else if (localMood >= 55) desc = 'growing';
    else if (localMood >= 45) desc = 'stable';
    else if (localMood >= 35) desc = 'sluggish';
    else desc = 'struggling';
    
    nhEconomies[nh] = {
      mood: localMood,
      descriptor: desc,
      activeRipples: localRipples,
      sectors: profile.primary,
      isHolidayZone: holidayZones.indexOf(nh) >= 0,
      isSportsZone: nh === 'Jack London' && cal.sportsSeason !== 'off-season'
    };
  }
  
  S.neighborhoodEconomies = nhEconomies;
}


// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

function generateEconomicSummary_(ctx) {
  var S = ctx.summary;
  var cal = ctx.economicCalendarContext || {};
  var migCtx = ctx.economicMigrationContext || {};
  var ripples = S.economicRipples || [];
  var nhEcon = S.neighborhoodEconomies || {};
  
  var strongestRipple = null;
  var maxStrength = 0;
  
  for (var i = 0; i < ripples.length; i++) {
    if (ripples[i] && Math.abs(ripples[i].currentStrength) > Math.abs(maxStrength)) {
      maxStrength = ripples[i].currentStrength;
      strongestRipple = ripples[i];
    }
  }
  
  var narratives = {
    TECH_INVESTMENT: 'Tech sector buzz continues to energize local economy.',
    SPORTS_CHAMPIONSHIP: 'Championship fever keeps cash registers ringing.',
    NEW_BUSINESS: 'New businesses signal growing confidence.',
    CONSTRUCTION_BOOM: 'Construction cranes dot the skyline.',
    TOURISM_SPIKE: 'Visitor influx boosts local merchants.',
    CULTURAL_EVENT: 'Cultural events draw crowds and spending.',
    FACTORY_CLOSURE: 'Economic anxiety lingers after closure.',
    CRIME_SPIKE: 'Business owners express concern over crime.',
    NATURAL_DISASTER: 'Recovery efforts continue.',
    MAJOR_LAYOFFS: 'Job market uncertainty weighs on confidence.',
    INFRASTRUCTURE_FAILURE: 'Infrastructure issues slow commerce.',
    HEALTH_CRISIS: 'Health concerns dampen consumer activity.',
    HOLIDAY_SHOPPING: 'Holiday shopping drives retail surge.',
    FESTIVAL_TOURISM: 'Festival visitors fill hotels and restaurants.',
    PLAYOFF_SPENDING: 'Playoff excitement boosts sports bars.',
    CHAMPIONSHIP_BOOM: 'Championship fever drives activity to new heights.',
    ARTS_DISTRICT_BOOST: 'First Friday brings crowds to arts district.',
    LOCAL_PRIDE_BOOST: 'Community pride drives local business support.',
    SUMMER_TOURISM: 'Summer visitors boost hospitality sector.',
    CULTURAL_CELEBRATION: 'Cultural celebration drives neighborhood activity.',
    WINTER_DOLDRUMS: 'Post-holiday slowdown affects retail.',
    POPULATION_SURGE: 'Population growth stimulates housing and retail.',
    POPULATION_EXODUS: 'Population decline impacts local businesses.',
    WORKFORCE_GROWTH: 'Growing workforce expands business activity.',
    WORKFORCE_DECLINE: 'Shrinking workforce affects business climate.'
  };
  
  S.economicNarrative = strongestRipple ? (narratives[strongestRipple.type] || '') : '';
  
  var struggling = [];
  var thriving = [];
  
  for (var nh in nhEcon) {
    if (!nhEcon.hasOwnProperty(nh)) continue;
    var data = nhEcon[nh];
    if (data.descriptor === 'struggling' || data.descriptor === 'sluggish') {
      struggling.push(nh);
    }
    if (data.descriptor === 'thriving' || data.descriptor === 'growing') {
      thriving.push(nh);
    }
  }
  
  var positiveCount = 0;
  var negativeCount = 0;
  var migrationCount = 0;
  
  for (var j = 0; j < ripples.length; j++) {
    if (!ripples[j]) continue;
    if (ripples[j].impact > 0) positiveCount++;
    if (ripples[j].impact < 0) negativeCount++;
    if (ripples[j].type && (ripples[j].type.indexOf('POPULATION') >= 0 || ripples[j].type.indexOf('WORKFORCE') >= 0)) {
      migrationCount++;
    }
  }
  
  S.economicSummary = {
    mood: S.economicMood,
    moodDesc: S.economicMoodDesc,
    activeRipples: ripples.length,
    positiveRipples: positiveCount,
    negativeRipples: negativeCount,
    migrationTriggeredRipples: migrationCount,
    derivedEmployment: S.derivedEmploymentRate,
    strongestRipple: strongestRipple ? {
      type: strongestRipple.type,
      strength: strongestRipple.currentStrength,
      neighborhood: strongestRipple.primaryNeighborhood
    } : null,
    narrative: S.economicNarrative,
    strugglingNeighborhoods: struggling,
    thrivingNeighborhoods: thriving,
    calendarContext: {
      holiday: cal.holiday,
      sportsSeason: cal.sportsSeason,
      season: cal.season
    },
    migrationContext: {
      prevMigration: migCtx.prevMigration || 0,
      migrationImpactOnMood: migCtx.prevMigration >= 15 ? 'positive' : 
                             (migCtx.prevMigration <= -15 ? 'negative' : 'neutral')
    }
  };
}


/**
 * ============================================================================
 * ECONOMIC RIPPLE ENGINE REFERENCE v2.4
 * ============================================================================
 *
 * CAREER TRIGGERS (v2.3 - wired to Career Engine):
 *
 * | Signal | Threshold | Trigger | Impact |
 * |--------|-----------|---------|--------|
 * | layoffs | >= 3 | MAJOR_LAYOFFS | -15 |
 * | promotions | >= 4 | WORKFORCE_GROWTH | +6 |
 * | sectorShifts | >= 3 | (careerChurn flag) | - |
 *
 * MIGRATION TRIGGERS:
 *
 * | Prev Migration | Trigger | Impact |
 * |----------------|---------|--------|
 * | +30 or more | POPULATION_SURGE | +8 |
 * | +20 to +29 | WORKFORCE_GROWTH | +6 |
 * | -20 to -29 | WORKFORCE_DECLINE | -8 |
 * | -30 or less | POPULATION_EXODUS | -10 |
 *
 * DERIVED EMPLOYMENT:
 * - Base: 0.82 + (mood/100) * 0.14
 * - Migration surge: -1% (temporary)
 * - Migration exodus: +1% (smaller workforce)
 * - Written back to World_Population sheet
 *
 * EXECUTION ORDER:
 * Run AFTER Career Engine (Phase 5), BEFORE applyMigrationDrift_.
 * Reads careerSignals from Career Engine.
 * Uses previousCycleState.migrationDrift from prior cycle.
 *
 * ============================================================================
 */