/**
 * ============================================================================
 * applyMigrationDrift_ v2.3
 * ============================================================================
 *
 * CONNECTED: Now reads ctx.summary.economicMood from economicRippleEngine.
 *
 * v2.3 Enhancements:
 * - Uses live economicMood from ctx.summary (not just static sheet)
 * - Factors in neighborhood economies for targeted migration
 * - Employment derived from economic mood when sheet value stale
 * - Migration affects future economic calculations (bidirectional)
 * - Tracks migration by neighborhood
 *
 * v2.2 Features (retained):
 * - Holiday-specific migration effects
 * - Sports season crowd dynamics
 * - Calendar awareness
 *
 * EXECUTION ORDER:
 * Run AFTER economicRippleEngine_ so ctx.summary.economicMood is populated.
 *
 * Outputs:
 * - ctx.summary.migrationDrift (numeric, -50 to +50)
 * - ctx.summary.migrationDriftFactors (array of strings)
 * - ctx.summary.neighborhoodMigration (object by neighborhood)
 * - ctx.summary.migrationEconomicLink (connection details)
 * 
 * ============================================================================
 */

function applyMigrationDrift_(ctx) {

  var popSheet = ctx.ss.getSheetByName('World_Population');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD POPULATION PULL (baseline only)
  // ═══════════════════════════════════════════════════════════════════════════
  var worldMig = 0;
  var sheetEmployment = 0.91;
  var sheetEconomy = "stable";
  
  if (popSheet) {
    var popVals = popSheet.getDataRange().getValues();
    var header = popVals[0];
    var row = popVals[1];
    
    var idx = function(n) { return header.indexOf(n); };
    
    worldMig = Number(row[idx('migration')] || 0);
    sheetEmployment = Number(row[idx('employmentRate')] || 0.91);
    sheetEconomy = (row[idx('economy')] || "stable").toString();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CTX SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary || {};
  
  var weather = S.weather || {};
  var weatherImpact = weather.impact || 1;

  var worldEvents = S.worldEvents || [];
  var chaosCount = worldEvents.length;

  var dynamics = S.cityDynamics || { 
    sentiment: 0, publicSpaces: 1, traffic: 1,
    culturalActivity: 1, communityEngagement: 1 
  };
  var sentiment = dynamics.sentiment || 0;
  var publicSpaces = dynamics.publicSpaces || 1;
  var traffic = dynamics.traffic || 1;

  // Calendar context
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: LIVE ECONOMIC DATA FROM economicRippleEngine
  // ═══════════════════════════════════════════════════════════════════════════
  var economicMood = S.economicMood || 50;
  var economicMoodDesc = S.economicMoodDesc || "stable";
  var neighborhoodEconomies = S.neighborhoodEconomies || {};
  var economicRipples = S.economicRipples || [];
  
  // Derive effective employment from economic mood if more current
  // Economic mood 0-100 maps roughly to employment 0.80-0.97
  var derivedEmployment = 0.80 + (economicMood / 100) * 0.17;
  
  // Use whichever suggests worse conditions (more conservative)
  var effectiveEmployment = Math.min(sheetEmployment, derivedEmployment);
  
  // Derive economy descriptor from mood
  var effectiveEconomy = sheetEconomy;
  if (economicMood >= 65) {
    effectiveEconomy = "strong";
  } else if (economicMood >= 45) {
    effectiveEconomy = "stable";
  } else if (economicMood >= 30) {
    effectiveEconomy = "weak";
  } else {
    effectiveEconomy = "unstable";
  }

  var factors = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // DRIFT CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  // Start with actual migration from World_Population
  var drift = worldMig;

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: ECONOMIC MOOD EFFECTS (primary driver)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Strong economy attracts migration
  if (economicMood >= 70) {
    drift += Math.round(Math.random() * 10);
    factors.push('strong-economy-attraction');
  } else if (economicMood >= 60) {
    drift += Math.round(Math.random() * 6);
    factors.push('good-economy-inflow');
  } else if (economicMood <= 30) {
    drift -= Math.round(Math.random() * 12);
    factors.push('weak-economy-exodus');
  } else if (economicMood <= 40) {
    drift -= Math.round(Math.random() * 6);
    factors.push('uncertain-economy-outflow');
  }
  
  // Economic mood trend (if we have ripples)
  var positiveRipples = 0;
  var negativeRipples = 0;
  for (var r = 0; r < economicRipples.length; r++) {
    if (economicRipples[r].impact > 0) positiveRipples++;
    if (economicRipples[r].impact < 0) negativeRipples++;
  }
  
  if (positiveRipples >= 3) {
    drift += Math.round(Math.random() * 5);
    factors.push('economic-momentum-positive');
  }
  if (negativeRipples >= 3) {
    drift -= Math.round(Math.random() * 5);
    factors.push('economic-momentum-negative');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER VOLATILITY
  // ═══════════════════════════════════════════════════════════════════════════
  if (weatherImpact >= 1.3) {
    drift += Math.round((Math.random() - 0.3) * 8);
    factors.push('weather-volatility');
  }
  if (weatherImpact >= 1.5) {
    drift += Math.round((Math.random() - 0.4) * 12);
    factors.push('severe-weather-displacement');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS DISPLACEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  if (chaosCount >= 3) {
    drift += Math.round((Math.random() - 0.5) * 10);
    factors.push('chaos-displacement');
  }
  if (chaosCount >= 5) {
    drift += Math.round((Math.random() - 0.5) * 15);
    factors.push('high-chaos-displacement');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT-DRIVEN MOVEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  if (sentiment <= -0.4) {
    drift -= Math.round(Math.random() * 8);
    factors.push('negative-sentiment-outflow');
  }
  if (sentiment >= 0.3) {
    drift += Math.round(Math.random() * 6);
    factors.push('positive-sentiment-inflow');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC-SPACE ACTIVITY
  // ═══════════════════════════════════════════════════════════════════════════
  if (publicSpaces >= 1.3) {
    drift += Math.round(Math.random() * 5);
    factors.push('public-space-activity');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAFFIC
  // ═══════════════════════════════════════════════════════════════════════════
  if (traffic <= 0.75) {
    drift += Math.round(Math.random() * 4);
    factors.push('low-traffic-mobility');
  }
  if (traffic >= 1.2) {
    drift -= Math.round(Math.random() * 3);
    factors.push('high-traffic-friction');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYMENT (v2.3: using effective employment)
  // ═══════════════════════════════════════════════════════════════════════════
  if (effectiveEmployment >= 0.93) {
    drift += Math.round(Math.random() * 6);
    factors.push('employment-attraction');
  }
  if (effectiveEmployment <= 0.88) {
    drift -= Math.round(Math.random() * 6);
    factors.push('employment-outflow');
  }
  if (effectiveEmployment <= 0.85) {
    drift -= Math.round(Math.random() * 8);
    factors.push('employment-crisis-exodus');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC PERCEPTION (v2.3: using effective economy)
  // ═══════════════════════════════════════════════════════════════════════════
  if (effectiveEconomy === "strong") {
    drift += Math.round(Math.random() * 5);
    factors.push('strong-economy-inflow');
  }
  if (effectiveEconomy === "weak") {
    drift -= Math.round(Math.random() * 8);
    factors.push('weak-economy-outflow');
  }
  if (effectiveEconomy === "unstable") {
    drift -= Math.round(Math.random() * 4);
    factors.push('economic-instability');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY MIGRATION EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  var travelHolidays = [
    "Thanksgiving", "Holiday", "NewYear", "MemorialDay", "LaborDay", "Independence"
  ];
  
  if (travelHolidays.indexOf(holiday) >= 0) {
    drift += Math.round((Math.random() - 0.5) * 15);
    factors.push(holiday + '-travel');
  }

  var gatheringHolidays = [
    "OpeningDay", "OaklandPride", "ArtSoulFestival", "Juneteenth",
    "CincoDeMayo", "DiaDeMuertos"
  ];
  
  if (gatheringHolidays.indexOf(holiday) >= 0) {
    drift += Math.round(Math.random() * 8);
    factors.push(holiday + '-gathering-inflow');
  }

  var culturalVisitorHolidays = [
    "DiaDeMuertos", "CincoDeMayo", "Juneteenth", "BlackHistoryMonth",
    "PrideMonth", "OaklandPride"
  ];
  
  if (culturalVisitorHolidays.indexOf(holiday) >= 0) {
    drift += Math.round(Math.random() * 5);
    factors.push('cultural-visitor-inflow');
  }

  if (holidayPriority === "major") {
    drift += Math.round((Math.random() - 0.5) * 10);
    factors.push('major-holiday-movement');
  } else if (holidayPriority === "oakland") {
    drift += Math.round(Math.random() * 6);
    factors.push('oakland-holiday-inflow');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY / CREATION DAY / SPORTS
  // ═══════════════════════════════════════════════════════════════════════════
  if (isFirstFriday) {
    drift += Math.round(Math.random() * 6);
    factors.push('first-friday-inflow');
    
    if (dynamics.culturalActivity >= 1.3) {
      drift += Math.round(Math.random() * 3);
      factors.push('first-friday-cultural-boost');
    }
  }

  if (isCreationDay) {
    drift += Math.round(Math.random() * 4);
    factors.push('creation-day-settling');
  }

  if (sportsSeason === "championship") {
    drift += Math.round(Math.random() * 12);
    factors.push('championship-crowd-inflow');
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    drift += Math.round(Math.random() * 8);
    factors.push('playoff-crowd-inflow');
  }

  if (holiday === "OpeningDay") {
    drift += Math.round(Math.random() * 10);
    factors.push('opening-day-crowd');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY / COMMUNITY ENGAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  if (dynamics.culturalActivity >= 1.5) {
    drift += Math.round(Math.random() * 5);
    factors.push('cultural-activity-inflow');
  } else if (dynamics.culturalActivity <= 0.7) {
    drift -= Math.round(Math.random() * 3);
    factors.push('low-cultural-activity');
  }

  if (dynamics.communityEngagement >= 1.4) {
    drift += Math.round(Math.random() * 4);
    factors.push('community-retention');
  } else if (dynamics.communityEngagement <= 0.6) {
    drift -= Math.round(Math.random() * 5);
    factors.push('low-community-outflow');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RANDOM DAILY FLUCTUATION
  // ═══════════════════════════════════════════════════════════════════════════
  drift += Math.round((Math.random() - 0.5) * 10);

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFT BOUNDS
  // ═══════════════════════════════════════════════════════════════════════════
  if (drift > 50) drift = 50;
  if (drift < -50) drift = -50;

  drift = Math.round(drift);

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: NEIGHBORHOOD-LEVEL MIGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodMigration = {};
  var neighborhoods = ['Downtown', 'Jack London', 'Rockridge', 'Temescal', 
                       'Fruitvale', 'Lake Merritt', 'West Oakland', 'Laurel'];
  
  for (var n = 0; n < neighborhoods.length; n++) {
    var nh = neighborhoods[n];
    var nhEcon = neighborhoodEconomies[nh] || { mood: 50, descriptor: 'stable' };
    
    // Base migration proportional to city drift
    var nhDrift = Math.round(drift / 8);
    
    // Adjust by neighborhood economic health
    if (nhEcon.mood >= 65) {
      nhDrift += Math.round(Math.random() * 4);
    } else if (nhEcon.mood <= 35) {
      nhDrift -= Math.round(Math.random() * 4);
    }
    
    // Thriving neighborhoods attract more
    if (nhEcon.descriptor === 'thriving') {
      nhDrift += Math.round(Math.random() * 3);
    } else if (nhEcon.descriptor === 'struggling') {
      nhDrift -= Math.round(Math.random() * 3);
    }
    
    neighborhoodMigration[nh] = {
      drift: nhDrift,
      economicMood: nhEcon.mood,
      economicDesc: nhEcon.descriptor
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  S.migrationDrift = drift;
  S.migrationDriftFactors = factors;
  S.neighborhoodMigration = neighborhoodMigration;
  
  // v2.3: Economic link for bidirectional tracking
  S.migrationEconomicLink = {
    economicMoodUsed: economicMood,
    economicMoodDesc: economicMoodDesc,
    effectiveEmployment: effectiveEmployment,
    effectiveEconomy: effectiveEconomy,
    sheetEmployment: sheetEmployment,
    sheetEconomy: sheetEconomy,
    derivedEmployment: derivedEmployment,
    positiveRipples: positiveRipples,
    negativeRipples: negativeRipples
  };
  
  ctx.summary = S;
}


/**
 * ============================================================================
 * MIGRATION DRIFT REFERENCE v2.3
 * ============================================================================
 * 
 * ECONOMIC INTEGRATION:
 * 
 * | Economic Mood | Migration Effect |
 * |---------------|------------------|
 * | 70+ (booming) | +10 attraction |
 * | 60+ (good) | +6 inflow |
 * | 40- (uncertain) | -6 outflow |
 * | 30- (struggling) | -12 exodus |
 * 
 * ECONOMIC MOMENTUM:
 * - 3+ positive ripples: +5 inflow
 * - 3+ negative ripples: -5 outflow
 * 
 * DERIVED EMPLOYMENT:
 * - Calculated from economic mood: 0.80 + (mood/100) * 0.17
 * - Uses lower of sheet value or derived value
 * 
 * NEIGHBORHOOD MIGRATION:
 * - Base: city drift / 8
 * - Thriving neighborhood: +3
 * - Struggling neighborhood: -3
 * - High mood (65+): +4
 * - Low mood (35-): -4
 * 
 * EXECUTION ORDER:
 * Run AFTER economicRippleEngine_ to use live economic data.
 * 
 * NEW OUTPUTS:
 * - neighborhoodMigration: {neighborhood: {drift, economicMood, economicDesc}}
 * - migrationEconomicLink: Connection details for debugging
 * 
 * ============================================================================
 */