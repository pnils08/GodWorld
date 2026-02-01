/**
 * ============================================================================
 * applyMigrationDrift_ v2.4
 * ============================================================================
 *
 * CONNECTED: Now reads ctx.summary.economicMood from economicRippleEngine.
 *
 * v2.4 Enhancements:
 * - BUGFIX: Normalizes worldMig to -50/+50 scale (was using raw population numbers)
 * - Reads Neighborhood_Map metrics (CrimeIndex, Sentiment, RetailVitality, EventAttractiveness)
 * - Calculates MigrationFlow per neighborhood using local metrics
 * - Writes MigrationFlow to column P of Neighborhood_Map
 *
 * v2.3 Features (retained):
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
 * - Neighborhood_Map column P: MigrationFlow per neighborhood
 *
 * ============================================================================
 */

function applyMigrationDrift_(ctx) {

  var popSheet = ctx.ss.getSheetByName('World_Population');

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD POPULATION PULL (baseline only)
  // ═══════════════════════════════════════════════════════════════════════════
  var worldMig = 0;
  var totalPopulation = 400000; // Default fallback
  var sheetEmployment = 0.91;
  var sheetEconomy = "stable";

  if (popSheet) {
    var popVals = popSheet.getDataRange().getValues();
    var header = popVals[0];
    var row = popVals[1];

    var idx = function(n) { return header.indexOf(n); };

    worldMig = Number(row[idx('migration')] || 0);
    totalPopulation = Number(row[idx('totalPopulation')] || 400000);
    sheetEmployment = Number(row[idx('employmentRate')] || 0.91);
    sheetEconomy = (row[idx('economy')] || "stable").toString();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.4: NEIGHBORHOOD_MAP PULL (for MigrationFlow calculation)
  // ═══════════════════════════════════════════════════════════════════════════
  var nhMapSheet = ctx.ss.getSheetByName('Neighborhood_Map');
  var nhMapData = [];
  var nhMapHeader = [];

  if (nhMapSheet) {
    var nhMapVals = nhMapSheet.getDataRange().getValues();
    nhMapHeader = nhMapVals[0] || [];
    for (var i = 1; i < nhMapVals.length; i++) {
      nhMapData.push(nhMapVals[i]);
    }
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

  // v2.4 BUGFIX: Normalize worldMig to -50/+50 scale
  // worldMig is raw population change (could be thousands)
  // Convert to percentage of total population, then scale to -50/+50
  var migrationPercent = (worldMig / totalPopulation) * 100;
  var drift = Math.round(migrationPercent * 10); // Scale: 1% = 10 points
  if (drift > 50) drift = 50;
  if (drift < -50) drift = -50;

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
  // v2.4: NEIGHBORHOOD-LEVEL MIGRATION WITH NEIGHBORHOOD_MAP METRICS
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodMigration = {};

  // Build column index for Neighborhood_Map
  var nhIdx = function(colName) {
    for (var c = 0; c < nhMapHeader.length; c++) {
      if (nhMapHeader[c] === colName) return c;
    }
    return -1;
  };

  var iNh = nhIdx('Neighborhood');
  var iCrime = nhIdx('CrimeIndex');
  var iSentiment = nhIdx('Sentiment');
  var iRetail = nhIdx('RetailVitality');
  var iEvent = nhIdx('EventAttractiveness');

  // Calculate MigrationFlow for each neighborhood
  for (var n = 0; n < nhMapData.length; n++) {
    var row = nhMapData[n];
    var nh = (iNh >= 0) ? String(row[iNh] || '') : '';
    if (!nh) continue;

    // Pull metrics from Neighborhood_Map
    var crimeIndex = (iCrime >= 0) ? Number(row[iCrime] || 1) : 1;
    var nhSentiment = (iSentiment >= 0) ? Number(row[iSentiment] || 0) : 0;
    var retailVitality = (iRetail >= 0) ? Number(row[iRetail] || 1) : 1;
    var eventAttract = (iEvent >= 0) ? Number(row[iEvent] || 1) : 1;

    // Economic data from ctx
    var nhEcon = neighborhoodEconomies[nh] || { mood: 50, descriptor: 'stable' };

    // Base migration proportional to city drift
    var nhDrift = Math.round(drift / 8);

    // v2.4: Apply Neighborhood_Map metrics
    // High crime = outflow (crimeIndex > 1.2 hurts, < 0.8 helps)
    if (crimeIndex >= 1.5) {
      nhDrift -= Math.round(Math.random() * 3 + 1);
    } else if (crimeIndex >= 1.2) {
      nhDrift -= Math.round(Math.random() * 2);
    } else if (crimeIndex <= 0.8) {
      nhDrift += Math.round(Math.random() * 2);
    }

    // High sentiment = inflow
    if (nhSentiment >= 0.3) {
      nhDrift += Math.round(Math.random() * 2 + 1);
    } else if (nhSentiment <= -0.3) {
      nhDrift -= Math.round(Math.random() * 2 + 1);
    }

    // High retail vitality = inflow
    if (retailVitality >= 1.3) {
      nhDrift += Math.round(Math.random() * 2);
    } else if (retailVitality <= 0.7) {
      nhDrift -= Math.round(Math.random() * 2);
    }

    // High event attractiveness = inflow
    if (eventAttract >= 1.3) {
      nhDrift += Math.round(Math.random() * 2);
    } else if (eventAttract <= 0.7) {
      nhDrift -= Math.round(Math.random() * 1);
    }

    // Economic health (from v2.3)
    if (nhEcon.mood >= 65) {
      nhDrift += Math.round(Math.random() * 2);
    } else if (nhEcon.mood <= 35) {
      nhDrift -= Math.round(Math.random() * 2);
    }

    if (nhEcon.descriptor === 'thriving') {
      nhDrift += Math.round(Math.random() * 2);
    } else if (nhEcon.descriptor === 'struggling') {
      nhDrift -= Math.round(Math.random() * 2);
    }

    // Clamp neighborhood drift to -5/+5
    if (nhDrift > 5) nhDrift = 5;
    if (nhDrift < -5) nhDrift = -5;

    neighborhoodMigration[nh] = {
      drift: nhDrift,
      economicMood: nhEcon.mood,
      economicDesc: nhEcon.descriptor,
      crimeIndex: crimeIndex,
      sentiment: nhSentiment,
      retailVitality: retailVitality,
      eventAttractiveness: eventAttract
    };

    // v2.4: Write MigrationFlow to column P of Neighborhood_Map
    row.migrationFlow = nhDrift;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.4: WRITE MIGRATIONFLOW TO NEIGHBORHOOD_MAP COLUMN P
  // ═══════════════════════════════════════════════════════════════════════════
  if (nhMapSheet && nhMapData.length > 0) {
    // Check if MigrationFlow header exists, add if not
    var migFlowCol = nhIdx('MigrationFlow');
    if (migFlowCol < 0) {
      // Add header in column P (index 15, 1-based = 16)
      migFlowCol = 15;
      nhMapSheet.getRange(1, migFlowCol + 1).setValue('MigrationFlow');
    }

    // Write MigrationFlow values for each neighborhood row
    for (var w = 0; w < nhMapData.length; w++) {
      var nhName = (iNh >= 0) ? String(nhMapData[w][iNh] || '') : '';
      if (nhName && neighborhoodMigration[nhName]) {
        var flowValue = neighborhoodMigration[nhName].drift;
        nhMapSheet.getRange(w + 2, migFlowCol + 1).setValue(flowValue);
      }
    }
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
 * MIGRATION DRIFT REFERENCE v2.4
 * ============================================================================
 *
 * v2.4 BUGFIX:
 * - worldMig is now normalized to -50/+50 scale
 * - Formula: (worldMig / totalPopulation) * 100 * 10
 * - Previously used raw population numbers which caused drift to always hit +50 cap
 *
 * NEIGHBORHOOD_MAP INTEGRATION (v2.4):
 *
 * | Metric              | Effect on MigrationFlow |
 * |---------------------|-------------------------|
 * | CrimeIndex >= 1.5   | -3 to -4 (outflow)      |
 * | CrimeIndex >= 1.2   | -1 to -2 (outflow)      |
 * | CrimeIndex <= 0.8   | +1 to +2 (inflow)       |
 * | Sentiment >= 0.3    | +2 to +3 (inflow)       |
 * | Sentiment <= -0.3   | -2 to -3 (outflow)      |
 * | RetailVitality >= 1.3 | +1 to +2 (inflow)     |
 * | RetailVitality <= 0.7 | -1 to -2 (outflow)    |
 * | EventAttract >= 1.3 | +1 to +2 (inflow)       |
 * | EventAttract <= 0.7 | -1 (outflow)            |
 *
 * MIGRATIONFLOW OUTPUT:
 * - Written to Neighborhood_Map column P
 * - Range: -5 to +5 per neighborhood
 * - Positive = people moving in, Negative = people moving out
 *
 * ECONOMIC INTEGRATION (from v2.3):
 *
 * | Economic Mood | Migration Effect |
 * |---------------|------------------|
 * | 70+ (booming) | +10 attraction |
 * | 60+ (good) | +6 inflow |
 * | 40- (uncertain) | -6 outflow |
 * | 30- (struggling) | -12 exodus |
 *
 * EXECUTION ORDER:
 * Run AFTER economicRippleEngine_ to use live economic data.
 *
 * OUTPUTS:
 * - ctx.summary.migrationDrift (numeric, -50 to +50)
 * - ctx.summary.neighborhoodMigration (object with full metrics per neighborhood)
 * - Neighborhood_Map column P: MigrationFlow per neighborhood
 *
 * ============================================================================
 */