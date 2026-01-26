/**
 * ============================================================================
 * recordMediaLedger_ v3.2 - Write-Intent Based
 * ============================================================================
 *
 * V3-integrated Media Ledger writer.
 * Header-based column lookup for Cultural_Ledger.
 * Uses V3 write-intents model for persistence.
 *
 * v3.2 Changes:
 * - Uses queueBatchAppendIntent_ instead of direct writes
 * - Full dryRun/replay mode support
 * - ES5 compatible (removed const/let, arrow functions, forEach, Object.keys.forEach)
 *
 * v3.1 Features (preserved):
 * - Includes economic, weather mood, media effects, arcs
 *
 * ============================================================================
 */

function recordMediaLedger_(ctx) {

  var sheet = ctx.ss.getSheetByName('Media_Ledger');
  if (!sheet) return;

  var intake = ctx.summary.mediaIntake;
  if (!intake || !intake.names || intake.names.length === 0) return;

  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  var cycle = ctx.config.cycleCount || ctx.summary.cycleId || 0;
  var S = ctx.summary;

  // Get cultural entries with details if available
  var entries = intake.entries;
  if (!entries) {
    entries = [];
    for (var n = 0; n < intake.names.length; n++) {
      entries.push({ name: intake.names[n], role: '', neighborhood: '' });
    }
  }

  // Load Cultural_Ledger data once (outside loop for efficiency)
  var culSheet = ctx.ss.getSheetByName('Cultural_Ledger');
  var culVals = null;
  var culHeader = null;
  var culColIndex = null;

  if (culSheet) {
    culVals = culSheet.getDataRange().getValues();
    culHeader = culVals[0];
    culColIndex = function(name) { return culHeader.indexOf(name); };
  }

  // Build all rows
  var rows = [];
  var now = new Date();

  for (var e = 0; e < entries.length; e++) {
    var entry = entries[e];
    var nameUsed = entry.name || entry;

    // CULTURAL LOOKUP (header-based)
    var fameCategory = '';
    var domain = '';
    var fameScore = '';
    var trend = '';
    var spread = '';
    var tier = '';
    var culNeighborhood = '';

    if (culVals && culColIndex) {
      var iName = culColIndex('Name');
      var iFameCat = culColIndex('FameCategory');
      var iDomain = culColIndex('CulturalDomain');
      var iFameScore = culColIndex('FameScore');
      var iTrend = culColIndex('TrendTrajectory');
      var iSpread = culColIndex('MediaSpread');
      var iTier = culColIndex('CityTier');
      var iNeighborhood = culColIndex('Neighborhood');

      for (var i = 1; i < culVals.length; i++) {
        if (iName >= 0 && culVals[i][iName] === nameUsed) {
          fameCategory = iFameCat >= 0 ? culVals[i][iFameCat] : '';
          domain = iDomain >= 0 ? culVals[i][iDomain] : '';
          fameScore = iFameScore >= 0 ? culVals[i][iFameScore] : '';
          trend = iTrend >= 0 ? culVals[i][iTrend] : '';
          spread = iSpread >= 0 ? culVals[i][iSpread] : '';
          tier = iTier >= 0 ? culVals[i][iTier] : '';
          culNeighborhood = iNeighborhood >= 0 ? culVals[i][iNeighborhood] : '';
          break;
        }
      }
    }

    // Use entry neighborhood or cultural ledger neighborhood
    var neighborhood = entry.neighborhood || culNeighborhood || '';

    // WORLD + V3 CONTEXT
    var hookCount = S.storyHooks ? S.storyHooks.length : 0;
    var seedCount = S.storySeeds ? S.storySeeds.length : 0;

    // Domain load
    var v3DomainLoad = 0;
    if (S.domainPresence) {
      for (var key in S.domainPresence) {
        if (S.domainPresence.hasOwnProperty(key)) {
          v3DomainLoad += (S.domainPresence[key] || 0);
        }
      }
    }

    // Texture triggers
    var textureCount = S.textureTriggers ? S.textureTriggers.length : 0;

    // City sentiment (with Chicago blend if available)
    var citySentiment = S.cityDynamics ? S.cityDynamics.sentiment : 0;
    if (S.chicagoFeed && S.chicagoFeed.length > 0) {
      var c = S.chicagoFeed[0];
      citySentiment = (citySentiment + (c.sentiment || 0)) / 2;
    }

    var chaosCount = S.worldEvents ? S.worldEvents.length : 0;
    var nightlifeVol = S.nightlifeVolume || 0;

    // Economic mood
    var econMood = S.economicMood || 50;

    // Weather
    var weather = S.weather || {};
    var weatherMood = S.weatherMood || {};

    // Media effects
    var mediaEffects = S.mediaEffects || {};

    // Active arcs
    var arcs = S.eventArcs || [];
    var activeArcCount = 0;
    for (var a = 0; a < arcs.length; a++) {
      if (arcs[a] && arcs[a].phase !== 'resolved') {
        activeArcCount++;
      }
    }

    // Build row
    rows.push([
      now,                                   // Timestamp
      cycle,                                 // Cycle
      intake.journalist,                     // Journalist
      nameUsed,                              // NameUsed
      fameCategory,                          // FameCategory
      domain,                                // CulturalDomain
      fameScore,                             // FameScore
      trend,                                 // TrendTrajectory
      spread,                                // MediaSpread
      tier,                                  // CityTier
      neighborhood,                          // Neighborhood
      hookCount + seedCount,                 // StorySeedCount
      S.cycleWeight || 'low-signal',         // CycleWeight
      S.cycleWeightReason || '',             // CycleWeightReason
      chaosCount,                            // ChaosEvents
      nightlifeVol,                          // NightlifeVolume
      citySentiment,                         // Sentiment
      S.civicLoad || 'stable',               // CivicLoad
      S.shockFlag || 'none',                 // ShockFlag
      S.patternFlag || 'none',               // PatternFlag
      econMood,                              // EconomicMood
      weather.type || 'clear',               // WeatherType
      weatherMood.primaryMood || 'neutral',  // WeatherMood
      mediaEffects.coverageIntensity || 'minimal', // MediaIntensity
      activeArcCount                         // ActiveArcs
    ]);
  }

  // Queue batch append intent
  if (rows.length > 0) {
    queueBatchAppendIntent_(
      ctx,
      'Media_Ledger',
      rows,
      'Record ' + rows.length + ' media entries for cycle ' + cycle,
      'media',
      100
    );
  }

  Logger.log('recordMediaLedger_ v3.2: Queued ' + rows.length + ' media entries');
}


/**
 * ============================================================================
 * MEDIA LEDGER SCHEMA v3.2
 * ============================================================================
 *
 * COLUMNS (25):
 * A - Timestamp
 * B - Cycle
 * C - Journalist
 * D - NameUsed
 * E - FameCategory
 * F - CulturalDomain
 * G - FameScore
 * H - TrendTrajectory
 * I - MediaSpread
 * J - CityTier
 * K - Neighborhood
 * L - StorySeedCount
 * M - CycleWeight
 * N - CycleWeightReason
 * O - ChaosEvents
 * P - NightlifeVolume
 * Q - Sentiment
 * R - CivicLoad
 * S - ShockFlag
 * T - PatternFlag
 * U - EconomicMood
 * V - WeatherType
 * W - WeatherMood
 * X - MediaIntensity
 * Y - ActiveArcs
 *
 * ============================================================================
 */
