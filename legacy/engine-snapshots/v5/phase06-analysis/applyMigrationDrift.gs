/**
 * ============================================================================
 * applyMigrationDrift_ v2.7
 * ============================================================================
 *
 * CONNECTED: Reads ctx.summary.economicMood from economicRippleEngine.
 *
 * v2.7 Changes:
 * - rand() fallback now prefers ctx.rng over Math.random()
 *
 * v2.6 Enhancements:
 * - Seeded RNG for deterministic replay mode
 * - Manual migration inputs (sportsPhaseOverride, crowdIntensity, neighborhoodBias)
 * - City-level economic feedback (migration affects economicMood)
 * - Neighborhood-level economic feedback (local drift affects local economy)
 * - Extended renderMigrationBrief_() with neighborhood bullets
 * - 280-char ticker output for UI overlays
 *
 * v2.4 Features (retained):
 * - BUGFIX: Normalizes worldMig to -50/+50 scale
 * - Reads Neighborhood_Map metrics (CrimeIndex, Sentiment, RetailVitality, EventAttractiveness)
 * - Calculates MigrationFlow per neighborhood using local metrics
 * - Writes MigrationFlow to column P of Neighborhood_Map
 *
 * v2.3 Features (retained):
 * - Uses live economicMood from ctx.summary
 * - Factors in neighborhood economies for targeted migration
 * - Employment derived from economic mood when sheet value stale
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
 * - ctx.summary.neighborhoodEconomyFeedback (v2.6)
 * - ctx.summary.migrationBrief (v2.6)
 * - Neighborhood_Map column P: MigrationFlow per neighborhood
 *
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// v2.6: RNG HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function hashStringToUint32_(str) {
  var h = 2166136261;
  str = String(str || '');
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function createSeededRng_(seed, stateOverride) {
  var s;
  if (typeof stateOverride === 'number' && isFinite(stateOverride)) {
    s = (stateOverride >>> 0) || 2463534242;
  } else if (typeof seed === 'number' && isFinite(seed)) {
    s = (seed >>> 0) || 2463534242;
  } else {
    s = hashStringToUint32_(String(seed || 'default-seed')) || 2463534242;
  }

  function nextUint32_() {
    s ^= (s << 13) >>> 0;
    s ^= (s >>> 17) >>> 0;
    s ^= (s << 5) >>> 0;
    return (s >>> 0);
  }

  return {
    random: function() { return nextUint32_() / 4294967296; },
    getState: function() { return (s >>> 0); }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE DRIFT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

function applyMigrationDrift_(ctx) {
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};
  if (!ctx.config) ctx.config = {};

  var S = ctx.summary;

  // v2.6: Seeded RNG setup
  var rngSeed = ctx.config.rngSeed;
  var rngStateIn = ctx.config.rngState;
  var rng = (rngSeed !== undefined && rngSeed !== null) ? createSeededRng_(rngSeed, rngStateIn) : null;

  // v2.7: prefer ctx.rng over Math.random as fallback
  var _ctxRng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;
  function rand() { return rng ? rng.random() : _ctxRng(); }
  function rInt(maxInclusive) { return Math.round(rand() * maxInclusive); }
  function rSym(span) { return Math.round((rand() - 0.5) * span); }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  // v2.6: Manual migration inputs
  var manual = ctx.config.manualMigrationInputs || S.manualMigrationInputs || {};
  var manualSportsPhaseOverride = manual.sportsPhaseOverride || '';
  var manualSportsCrowdIntensity = clamp(Number(manual.sportsCrowdIntensity) || 1, 0, 2);
  var manualSportsNeighborhoodBias = clamp(Number(manual.sportsCrowdNeighborhoodBias) || 0, 0, 1);
  var manualSportsLabel = manual.sportsLabel || '';

  function getSportsPhase_(sportsSeasonRaw) {
    var s = String(sportsSeasonRaw || '').toLowerCase();
    if (s === 'championship' || s === 'finals') return 'finals';
    if (s === 'playoffs' || s === 'post-season' || s === 'postseason') return 'postseason';
    if (s === 'late-season') return 'late-season';
    if (s === 'preseason') return 'preseason';
    if (s === 'in-season' || s === 'regular-season') return 'in-season';
    if (s === 'off-season' || s === 'offseason') return 'off-season';
    return 'off-season';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD POPULATION PULL
  // ═══════════════════════════════════════════════════════════════════════════
  var popSheet = ctx.ss ? ctx.ss.getSheetByName('World_Population') : null;
  var worldMig = 0;
  var totalPopulation = 400000;
  var sheetEmployment = 0.91;
  var sheetEconomy = 'stable';

  if (popSheet) {
    var popVals = popSheet.getDataRange().getValues();
    if (popVals && popVals.length >= 2) {
      var header = popVals[0];
      var row = popVals[1];
      var idx = function(n) { return header.indexOf(n); };

      worldMig = Number(row[idx('migration')] || 0);
      totalPopulation = Number(row[idx('totalPopulation')] || 400000);
      sheetEmployment = Number(row[idx('employmentRate')] || 0.91);
      sheetEconomy = (row[idx('economy')] || 'stable').toString();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.4: NEIGHBORHOOD_MAP PULL
  // ═══════════════════════════════════════════════════════════════════════════
  var nhMapSheet = ctx.ss ? ctx.ss.getSheetByName('Neighborhood_Map') : null;
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

  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;
  var sportsSeason = S.sportsSeason || 'off-season';

  var economicMood = S.economicMood || 50;
  var economicMoodDesc = S.economicMoodDesc || 'stable';
  var neighborhoodEconomies = S.neighborhoodEconomies || {};
  var economicRipples = S.economicRipples || [];

  var derivedEmployment = 0.80 + (economicMood / 100) * 0.17;
  var effectiveEmployment = Math.min(sheetEmployment, derivedEmployment);

  var effectiveEconomy = sheetEconomy;
  if (economicMood >= 65) effectiveEconomy = 'strong';
  else if (economicMood >= 45) effectiveEconomy = 'stable';
  else if (economicMood >= 30) effectiveEconomy = 'weak';
  else effectiveEconomy = 'unstable';

  var factors = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // DRIFT CALCULATION (v2.4 BUGFIX: Normalize worldMig)
  // ═══════════════════════════════════════════════════════════════════════════
  var migrationPercent = (worldMig / totalPopulation) * 100;
  var drift = Math.round(migrationPercent * 10);
  if (drift > 50) drift = 50;
  if (drift < -50) drift = -50;

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC MOOD EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  if (economicMood >= 70) { drift += rInt(10); factors.push('strong-economy-attraction'); }
  else if (economicMood >= 60) { drift += rInt(6); factors.push('good-economy-inflow'); }
  else if (economicMood <= 30) { drift -= rInt(12); factors.push('weak-economy-exodus'); }
  else if (economicMood <= 40) { drift -= rInt(6); factors.push('uncertain-economy-outflow'); }

  var positiveRipples = 0;
  var negativeRipples = 0;
  for (var r = 0; r < economicRipples.length; r++) {
    if (economicRipples[r] && economicRipples[r].impact > 0) positiveRipples++;
    if (economicRipples[r] && economicRipples[r].impact < 0) negativeRipples++;
  }
  if (positiveRipples >= 3) { drift += rInt(5); factors.push('economic-momentum-positive'); }
  if (negativeRipples >= 3) { drift -= rInt(5); factors.push('economic-momentum-negative'); }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER / CHAOS / SENTIMENT / TRAFFIC
  // ═══════════════════════════════════════════════════════════════════════════
  if (weatherImpact >= 1.3) { drift += Math.round((rand() - 0.3) * 8); factors.push('weather-volatility'); }
  if (weatherImpact >= 1.5) { drift += Math.round((rand() - 0.4) * 12); factors.push('severe-weather-displacement'); }

  if (chaosCount >= 3) { drift += rSym(10); factors.push('chaos-displacement'); }
  if (chaosCount >= 5) { drift += rSym(15); factors.push('high-chaos-displacement'); }

  if (sentiment <= -0.4) { drift -= rInt(8); factors.push('negative-sentiment-outflow'); }
  if (sentiment >= 0.3) { drift += rInt(6); factors.push('positive-sentiment-inflow'); }

  if (publicSpaces >= 1.3) { drift += rInt(5); factors.push('public-space-activity'); }

  if (traffic <= 0.75) { drift += rInt(4); factors.push('low-traffic-mobility'); }
  if (traffic >= 1.2) { drift -= rInt(3); factors.push('high-traffic-friction'); }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYMENT / ECONOMY
  // ═══════════════════════════════════════════════════════════════════════════
  if (effectiveEmployment >= 0.93) { drift += rInt(6); factors.push('employment-attraction'); }
  if (effectiveEmployment <= 0.88) { drift -= rInt(6); factors.push('employment-outflow'); }
  if (effectiveEmployment <= 0.85) { drift -= rInt(8); factors.push('employment-crisis-exodus'); }

  if (effectiveEconomy === 'strong') { drift += rInt(5); factors.push('strong-economy-inflow'); }
  if (effectiveEconomy === 'weak') { drift -= rInt(8); factors.push('weak-economy-outflow'); }
  if (effectiveEconomy === 'unstable') { drift -= rInt(4); factors.push('economic-instability'); }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  var travelHolidays = ['Thanksgiving', 'Holiday', 'NewYear', 'MemorialDay', 'LaborDay', 'Independence'];
  if (travelHolidays.indexOf(holiday) >= 0) { drift += rSym(15); factors.push(holiday + '-travel'); }

  var gatheringHolidays = ['OpeningDay', 'OaklandPride', 'ArtSoulFestival', 'Juneteenth', 'CincoDeMayo', 'DiaDeMuertos'];
  if (gatheringHolidays.indexOf(holiday) >= 0) { drift += rInt(8); factors.push(holiday + '-gathering-inflow'); }

  var culturalVisitorHolidays = ['DiaDeMuertos', 'CincoDeMayo', 'Juneteenth', 'BlackHistoryMonth', 'PrideMonth', 'OaklandPride'];
  if (culturalVisitorHolidays.indexOf(holiday) >= 0) { drift += rInt(5); factors.push('cultural-visitor-inflow'); }

  if (holidayPriority === 'major') { drift += rSym(10); factors.push('major-holiday-movement'); }
  else if (holidayPriority === 'oakland') { drift += rInt(6); factors.push('oakland-holiday-inflow'); }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY / CREATION DAY
  // ═══════════════════════════════════════════════════════════════════════════
  if (isFirstFriday) {
    drift += rInt(6);
    factors.push('first-friday-inflow');
    if ((dynamics.culturalActivity || 1) >= 1.3) { drift += rInt(3); factors.push('first-friday-cultural-boost'); }
  }

  if (isCreationDay) { drift += rInt(4); factors.push('creation-day-settling'); }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: SPORTS PHASE (with manual overrides)
  // ═══════════════════════════════════════════════════════════════════════════
  var sportsPhase = manualSportsPhaseOverride ? String(manualSportsPhaseOverride) : getSportsPhase_(sportsSeason);
  sportsPhase = String(sportsPhase || 'off-season').toLowerCase();

  function addSportsDrift_(phase) {
    var tag = manualSportsLabel ? ('sports-' + phase + '-' + manualSportsLabel) : ('sports-' + phase);
    if (phase === 'finals') { drift += Math.round(rInt(12) * manualSportsCrowdIntensity); factors.push(tag + '-crowd-inflow'); }
    else if (phase === 'postseason') { drift += Math.round(rInt(8) * manualSportsCrowdIntensity); factors.push(tag + '-crowd-inflow'); }
    else if (phase === 'late-season') { drift += Math.round(rInt(5) * manualSportsCrowdIntensity); factors.push(tag + '-pressure-movement'); }
    else if (phase === 'in-season') { drift += Math.round(rInt(3) * manualSportsCrowdIntensity); factors.push(tag + '-routine-movement'); }
    else if (phase === 'preseason') { drift += Math.round(rInt(2) * manualSportsCrowdIntensity); factors.push(tag + '-early-movement'); }
  }
  addSportsDrift_(sportsPhase);

  if (holiday === 'OpeningDay') { drift += rInt(10); factors.push('opening-day-crowd'); }

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY / COMMUNITY
  // ═══════════════════════════════════════════════════════════════════════════
  if ((dynamics.culturalActivity || 1) >= 1.5) { drift += rInt(5); factors.push('cultural-activity-inflow'); }
  else if ((dynamics.culturalActivity || 1) <= 0.7) { drift -= rInt(3); factors.push('low-cultural-activity'); }

  if ((dynamics.communityEngagement || 1) >= 1.4) { drift += rInt(4); factors.push('community-retention'); }
  else if ((dynamics.communityEngagement || 1) <= 0.6) { drift -= rInt(5); factors.push('low-community-outflow'); }

  // Random fluctuation
  drift += rSym(10);

  // Soft bounds
  drift = Math.round(drift);
  if (drift > 50) drift = 50;
  if (drift < -50) drift = -50;

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.4: NEIGHBORHOOD-LEVEL MIGRATION WITH NEIGHBORHOOD_MAP METRICS
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodMigration = {};

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

  for (var n = 0; n < nhMapData.length; n++) {
    var nhRow = nhMapData[n];
    var nh = (iNh >= 0) ? String(nhRow[iNh] || '') : '';
    if (!nh) continue;

    var crimeIndex = (iCrime >= 0) ? Number(nhRow[iCrime] || 1) : 1;
    var nhSentiment = (iSentiment >= 0) ? Number(nhRow[iSentiment] || 0) : 0;
    var retailVitality = (iRetail >= 0) ? Number(nhRow[iRetail] || 1) : 1;
    var eventAttract = (iEvent >= 0) ? Number(nhRow[iEvent] || 1) : 1;

    var nhEcon = neighborhoodEconomies[nh] || { mood: 50, descriptor: 'stable' };
    var nhDrift = Math.round(drift / 8);

    // v2.4: Apply Neighborhood_Map metrics
    if (crimeIndex >= 1.5) { nhDrift -= rInt(3) + 1; }
    else if (crimeIndex >= 1.2) { nhDrift -= rInt(2); }
    else if (crimeIndex <= 0.8) { nhDrift += rInt(2); }

    if (nhSentiment >= 0.3) { nhDrift += rInt(2) + 1; }
    else if (nhSentiment <= -0.3) { nhDrift -= rInt(2) + 1; }

    if (retailVitality >= 1.3) { nhDrift += rInt(2); }
    else if (retailVitality <= 0.7) { nhDrift -= rInt(2); }

    if (eventAttract >= 1.3) { nhDrift += rInt(2); }
    else if (eventAttract <= 0.7) { nhDrift -= rInt(1); }

    if (nhEcon.mood >= 65) { nhDrift += rInt(2); }
    else if (nhEcon.mood <= 35) { nhDrift -= rInt(2); }

    if (nhEcon.descriptor === 'thriving') { nhDrift += rInt(2); }
    else if (nhEcon.descriptor === 'struggling') { nhDrift -= rInt(2); }

    // v2.6: Sports neighborhood bias
    if (manualSportsNeighborhoodBias > 0 && sportsPhase !== 'off-season') {
      nhDrift += Math.round(rInt(3) * manualSportsNeighborhoodBias);
    }

    nhDrift = clamp(nhDrift, -5, 5);

    neighborhoodMigration[nh] = {
      drift: nhDrift,
      economicMood: nhEcon.mood,
      economicDesc: nhEcon.descriptor,
      crimeIndex: crimeIndex,
      sentiment: nhSentiment,
      retailVitality: retailVitality,
      eventAttractiveness: eventAttract
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.4: WRITE MIGRATIONFLOW TO NEIGHBORHOOD_MAP COLUMN P
  // ═══════════════════════════════════════════════════════════════════════════
  if (nhMapSheet && nhMapData.length > 0) {
    var migFlowCol = nhIdx('MigrationFlow');
    if (migFlowCol < 0) {
      migFlowCol = 15;
      nhMapSheet.getRange(1, migFlowCol + 1).setValue('MigrationFlow');
    }

    for (var w = 0; w < nhMapData.length; w++) {
      var nhName = (iNh >= 0) ? String(nhMapData[w][iNh] || '') : '';
      if (nhName && neighborhoodMigration[nhName]) {
        var flowValue = neighborhoodMigration[nhName].drift;
        nhMapSheet.getRange(w + 2, migFlowCol + 1).setValue(flowValue);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: CITY-LEVEL ECONOMIC FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════
  var feedbackEnabled = (ctx.config.enableMigrationEconomicFeedback !== false);
  var feedbackMaxDelta = clamp(Number(ctx.config.migrationEconomicFeedbackMaxDelta) || 3, 0, 10);
  var feedbackScale = clamp(Number(ctx.config.migrationEconomicFeedbackScale) || 2, 0, 10);

  var economicMoodAfter = economicMood;
  var economicMoodFeedbackDelta = 0;

  if (feedbackEnabled && feedbackMaxDelta > 0 && feedbackScale > 0) {
    var rawDelta = (drift / 50) * feedbackScale;
    if (rawDelta > 0 && sentiment < 0) rawDelta = rawDelta * (1 + sentiment);
    if (rawDelta < 0 && sentiment > 0) rawDelta = rawDelta * (1 - sentiment);

    economicMoodFeedbackDelta = Math.round(clamp(rawDelta, -feedbackMaxDelta, feedbackMaxDelta));
    economicMoodAfter = clamp(Math.round(economicMood + economicMoodFeedbackDelta), 0, 100);

    S.economicMood = economicMoodAfter;
    if (economicMoodAfter >= 65) S.economicMoodDesc = 'strong';
    else if (economicMoodAfter >= 45) S.economicMoodDesc = 'stable';
    else if (economicMoodAfter >= 30) S.economicMoodDesc = 'weak';
    else S.economicMoodDesc = 'unstable';

    factors.push('migration-economic-feedback');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: NEIGHBORHOOD-LEVEL ECONOMIC FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════
  var nhFeedbackEnabled = (ctx.config.enableMigrationNeighborhoodEconomicFeedback !== false);
  var nhFeedbackMaxDelta = clamp(Number(ctx.config.migrationNeighborhoodEconomicFeedbackMaxDelta) || 2, 0, 10);
  var nhFeedbackScale = clamp(Number(ctx.config.migrationNeighborhoodEconomicFeedbackScale) || 2, 0, 10);

  var neighborhoodEconomyFeedback = {};

  if (nhFeedbackEnabled && nhFeedbackMaxDelta > 0 && nhFeedbackScale > 0) {
    if (!S.neighborhoodEconomies) S.neighborhoodEconomies = neighborhoodEconomies;

    for (var hood in neighborhoodMigration) {
      if (!neighborhoodMigration.hasOwnProperty(hood)) continue;

      var econ = S.neighborhoodEconomies[hood] || { mood: 50, descriptor: 'stable' };
      var d = Number(neighborhoodMigration[hood].drift || 0);

      var rawNhDelta = (d / 5) * nhFeedbackScale;
      if (rawNhDelta > 0 && econ.descriptor === 'struggling') rawNhDelta = rawNhDelta * 0.6;
      if (rawNhDelta < 0 && econ.descriptor === 'thriving') rawNhDelta = rawNhDelta * 0.6;

      var delta = Math.round(clamp(rawNhDelta, -nhFeedbackMaxDelta, nhFeedbackMaxDelta));
      var beforeMood = Number(econ.mood || 50);
      var afterMood = clamp(Math.round(beforeMood + delta), 0, 100);

      econ.mood = afterMood;
      if (afterMood >= 70) econ.descriptor = 'thriving';
      else if (afterMood <= 30) econ.descriptor = 'struggling';
      else econ.descriptor = 'stable';

      S.neighborhoodEconomies[hood] = econ;

      neighborhoodEconomyFeedback[hood] = {
        delta: delta,
        beforeMood: beforeMood,
        afterMood: afterMood,
        descriptor: econ.descriptor
      };
    }

    S.neighborhoodEconomyFeedback = neighborhoodEconomyFeedback;
    factors.push('migration-neighborhood-economic-feedback');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  S.migrationDrift = drift;
  S.migrationDriftFactors = factors;
  S.neighborhoodMigration = neighborhoodMigration;

  S.migrationEconomicLink = {
    economicMoodUsed: economicMood,
    economicMoodDesc: economicMoodDesc,
    effectiveEmployment: effectiveEmployment,
    effectiveEconomy: effectiveEconomy,
    sheetEmployment: sheetEmployment,
    sheetEconomy: sheetEconomy,
    derivedEmployment: derivedEmployment,
    positiveRipples: positiveRipples,
    negativeRipples: negativeRipples,
    sportsPhaseUsed: sportsPhase,
    manualSportsLabel: manualSportsLabel,
    feedbackEnabled: feedbackEnabled,
    feedbackScale: feedbackScale,
    feedbackMaxDelta: feedbackMaxDelta,
    economicMoodFeedbackDelta: economicMoodFeedbackDelta,
    economicMoodAfter: economicMoodAfter,
    neighborhoodFeedbackEnabled: nhFeedbackEnabled,
    neighborhoodFeedbackScale: nhFeedbackScale,
    neighborhoodFeedbackMaxDelta: nhFeedbackMaxDelta
  };

  if (rng) {
    S.rngState = rng.getState();
    ctx.config.rngState = S.rngState;
  }

  ctx.summary = S;
}


// ═══════════════════════════════════════════════════════════════════════════
// v2.6: MIGRATION BRIEF RENDERER
// ═══════════════════════════════════════════════════════════════════════════

function renderMigrationBrief_(ctx) {
  if (!ctx) return null;
  if (!ctx.summary) ctx.summary = {};
  if (!ctx.config) ctx.config = {};
  var S = ctx.summary;

  var drift = Number(S.migrationDrift || 0);
  var factors = S.migrationDriftFactors || [];
  var link = S.migrationEconomicLink || {};
  var sportsPhase = link.sportsPhaseUsed || 'off-season';
  var nhFeedback = S.neighborhoodEconomyFeedback || {};

  var includeNeighborhoods = (ctx.config.migrationBriefIncludeNeighborhoods !== false);
  var nhCount = Math.floor(Number(ctx.config.migrationBriefNeighborhoodCount) || 3);
  if (nhCount < 1) nhCount = 3;

  // v2.6a: Include economic deltas in bullets
  var includeEconDeltas = (ctx.config.migrationBriefIncludeEconDeltas !== false);

  function abs(x) { return x < 0 ? -x : x; }

  function driftLabel_(d) {
    if (d >= 25) return 'surge';
    if (d >= 10) return 'uptick';
    if (d <= -25) return 'exodus';
    if (d <= -10) return 'outflow';
    return 'flat';
  }

  function pickTopDrivers_(arr, maxN) {
    var counts = {};
    for (var i = 0; i < arr.length; i++) {
      var k = String(arr[i] || '');
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
    }
    var keys = [];
    for (var kk in counts) if (counts.hasOwnProperty(kk)) keys.push(kk);

    keys.sort(function(a, b) {
      var da = counts[a] || 0;
      var db = counts[b] || 0;
      if (db !== da) return db - da;
      return a < b ? -1 : a > b ? 1 : 0;
    });

    var out = [];
    for (var j = 0; j < keys.length && out.length < maxN; j++) out.push(keys[j]);
    return out;
  }

  function humanizeDriver_(k) {
    if (k.indexOf('economy') >= 0) return 'economy';
    if (k.indexOf('employment') >= 0) return 'jobs';
    if (k.indexOf('weather') >= 0) return 'weather';
    if (k.indexOf('chaos') >= 0) return 'instability';
    if (k.indexOf('sentiment') >= 0) return 'mood';
    if (k.indexOf('traffic') >= 0) return 'traffic';
    if (k.indexOf('public-space') >= 0) return 'street-life';
    if (k.indexOf('first-friday') >= 0) return 'arts-night';
    if (k.indexOf('creation-day') >= 0) return 'city-ritual';
    if (k.indexOf('cultural') >= 0) return 'culture';
    if (k.indexOf('community') >= 0) return 'community';
    if (k.indexOf('travel') >= 0) return 'holiday-travel';
    if (k.indexOf('gathering') >= 0) return 'crowds';
    if (k.indexOf('sports-') >= 0) return 'season-window';
    if (k.indexOf('opening-day') >= 0) return 'season-opener';
    if (k.indexOf('migration-economic-feedback') >= 0) return 'feedback-loop';
    if (k.indexOf('migration-neighborhood-economic-feedback') >= 0) return 'local-feedback';
    return 'signal';
  }

  function summarizeNeighborhoods_(neighborhoodMigration, maxN) {
    var items = [];
    for (var k in neighborhoodMigration) {
      if (!neighborhoodMigration.hasOwnProperty(k)) continue;
      var d = Number(neighborhoodMigration[k].drift || 0);
      var econDelta = (nhFeedback[k] && nhFeedback[k].delta) ? nhFeedback[k].delta : 0;
      items.push({ nh: k, drift: d, econDelta: econDelta });
    }

    items.sort(function(a, b) { return b.drift - a.drift; });

    var positives = [];
    var negatives = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].drift > 0) positives.push(items[i]);
      if (items[i].drift < 0) negatives.push(items[i]);
    }

    var topPos = [];
    for (var p = 0; p < positives.length && topPos.length < maxN; p++) {
      var posBullet = positives[p].nh + ' (+' + positives[p].drift + ')';
      if (includeEconDeltas && positives[p].econDelta !== 0) {
        posBullet += ' econ:' + (positives[p].econDelta > 0 ? '+' : '') + positives[p].econDelta;
      }
      topPos.push(posBullet);
    }

    negatives.sort(function(a, b) { return a.drift - b.drift; });
    var topNeg = [];
    for (var nn = 0; nn < negatives.length && topNeg.length < maxN; nn++) {
      var negBullet = negatives[nn].nh + ' (' + negatives[nn].drift + ')';
      if (includeEconDeltas && negatives[nn].econDelta !== 0) {
        negBullet += ' econ:' + (negatives[nn].econDelta > 0 ? '+' : '') + negatives[nn].econDelta;
      }
      topNeg.push(negBullet);
    }

    return { topPos: topPos, topNeg: topNeg };
  }

  var label = driftLabel_(drift);
  var dirWord = (drift > 0) ? 'inflow' : (drift < 0 ? 'outflow' : 'stable movement');

  var topRaw = pickTopDrivers_(factors, 5);
  var drivers = [];
  var seen = {};
  for (var t = 0; t < topRaw.length; t++) {
    var h = humanizeDriver_(topRaw[t]);
    if (!seen[h]) {
      seen[h] = true;
      drivers.push(h);
    }
    if (drivers.length >= 3) break;
  }

  var headline;
  if (label === 'surge') headline = "Migration surge reshapes the city's tempo";
  else if (label === 'uptick') headline = 'Inflow ticks up as the city pulls harder';
  else if (label === 'exodus') headline = 'Outflow accelerates as pressure builds';
  else if (label === 'outflow') headline = 'Signs of outflow as friction rises';
  else headline = 'Migration holds near baseline, with pockets shifting';

  var lede = 'Cycle movement: ' + dirWord + ' (' + drift + ').';
  if (drivers.length) lede += ' Drivers: ' + drivers.join(', ') + '.';
  if (sportsPhase && String(sportsPhase).toLowerCase() !== 'off-season') lede += ' Season window: ' + sportsPhase + '.';

  var kicker = '';
  if (abs(drift) >= 20) kicker = ' Significant movement this cycle.';
  else if (abs(drift) >= 10) kicker = ' Notable shifts in progress.';
  else kicker = ' Minor fluctuations observed.';

  var neighborhoodBullets = null;
  if (includeNeighborhoods) {
    neighborhoodBullets = summarizeNeighborhoods_(S.neighborhoodMigration || {}, nhCount);
  }

  // v2.6b: 280-char ticker
  var ticker = headline.substring(0, 60) + ' | ' + dirWord + ' (' + drift + ')';
  if (drivers.length) ticker += ' | ' + drivers.slice(0, 2).join(', ');
  if (ticker.length > 280) ticker = ticker.substring(0, 277) + '...';

  var brief = {
    headline: headline,
    lede: lede + kicker,
    drivers: drivers,
    drift: drift,
    sportsPhase: sportsPhase,
    neighborhoods: neighborhoodBullets ? {
      topInflow: neighborhoodBullets.topPos,
      topOutflow: neighborhoodBullets.topNeg
    } : null,
    ticker: ticker
  };

  S.migrationBrief = brief;
  ctx.summary = S;
  return brief;
}


/**
 * ============================================================================
 * MIGRATION DRIFT REFERENCE v2.7
 * ============================================================================
 *
 * v2.6 CHANGES:
 * - Seeded RNG: ctx.config.rngSeed for deterministic replay
 * - Manual inputs: ctx.config.manualMigrationInputs
 *   - sportsPhaseOverride, sportsCrowdIntensity, sportsCrowdNeighborhoodBias, sportsLabel
 * - City economic feedback: migration affects economicMood
 *   - ctx.config.enableMigrationEconomicFeedback (default true)
 *   - ctx.config.migrationEconomicFeedbackScale (default 2)
 *   - ctx.config.migrationEconomicFeedbackMaxDelta (default 3)
 * - Neighborhood economic feedback: local drift affects local economy
 *   - ctx.config.enableMigrationNeighborhoodEconomicFeedback (default true)
 *   - ctx.config.migrationNeighborhoodEconomicFeedbackScale (default 2)
 *   - ctx.config.migrationNeighborhoodEconomicFeedbackMaxDelta (default 2)
 * - Extended renderMigrationBrief_():
 *   - ctx.config.migrationBriefIncludeNeighborhoods (default true)
 *   - ctx.config.migrationBriefNeighborhoodCount (default 3)
 *   - ctx.config.migrationBriefIncludeEconDeltas (default true)
 *   - 280-char ticker output
 *
 * v2.4 FEATURES (retained):
 * - BUGFIX: Normalizes worldMig to -50/+50 scale
 * - Reads Neighborhood_Map metrics (CrimeIndex, Sentiment, RetailVitality, EventAttractiveness)
 * - Writes MigrationFlow to column P of Neighborhood_Map
 *
 * NEIGHBORHOOD_MAP INTEGRATION:
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
 * OUTPUTS:
 * - ctx.summary.migrationDrift (-50 to +50)
 * - ctx.summary.migrationDriftFactors (array)
 * - ctx.summary.neighborhoodMigration (object with metrics per neighborhood)
 * - ctx.summary.migrationEconomicLink (connection details)
 * - ctx.summary.neighborhoodEconomyFeedback (v2.6)
 * - ctx.summary.migrationBrief (v2.6 with ticker)
 * - Neighborhood_Map column P: MigrationFlow
 *
 * ============================================================================
 */
