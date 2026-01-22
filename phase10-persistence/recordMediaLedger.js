/**
 * recordMediaLedger_ v3.1
 * 
 * V3-integrated Media Ledger writer.
 * Header-based column lookup for Cultural_Ledger.
 * Includes economic, weather mood, media effects, arcs.
 */

function recordMediaLedger_(ctx) {

  const sheet = ctx.ss.getSheetByName('Media_Ledger');
  if (!sheet) return;

  const intake = ctx.summary.mediaIntake;
  if (!intake || !intake.names || intake.names.length === 0) return;

  const cycle = ctx.config.cycleCount || ctx.summary.cycleId || 0;
  const S = ctx.summary;

  // Get cultural entries with details if available
  const entries = intake.entries || intake.names.map(n => ({ name: n, role: '', neighborhood: '' }));

  entries.forEach(entry => {
    const nameUsed = entry.name || entry;

    // CULTURAL LOOKUP (header-based)
    const culSheet = ctx.ss.getSheetByName('Cultural_Ledger');
    let fameCategory = "";
    let domain = "";
    let fameScore = "";
    let trend = "";
    let spread = "";
    let tier = "";
    let culNeighborhood = "";

    if (culSheet) {
      const vals = culSheet.getDataRange().getValues();
      const header = vals[0];
      const col = n => header.indexOf(n);

      const iName = col('Name');
      const iFameCat = col('FameCategory');
      const iDomain = col('CulturalDomain');
      const iFameScore = col('FameScore');
      const iTrend = col('TrendTrajectory');
      const iSpread = col('MediaSpread');
      const iTier = col('CityTier');
      const iNeighborhood = col('Neighborhood');

      for (let i = 1; i < vals.length; i++) {
        if (iName >= 0 && vals[i][iName] === nameUsed) {
          fameCategory = iFameCat >= 0 ? vals[i][iFameCat] : '';
          domain = iDomain >= 0 ? vals[i][iDomain] : '';
          fameScore = iFameScore >= 0 ? vals[i][iFameScore] : '';
          trend = iTrend >= 0 ? vals[i][iTrend] : '';
          spread = iSpread >= 0 ? vals[i][iSpread] : '';
          tier = iTier >= 0 ? vals[i][iTier] : '';
          culNeighborhood = iNeighborhood >= 0 ? vals[i][iNeighborhood] : '';
          break;
        }
      }
    }

    // Use entry neighborhood or cultural ledger neighborhood
    const neighborhood = entry.neighborhood || culNeighborhood || '';

    // WORLD + V3 CONTEXT
    const hookCount = S.storyHooks ? S.storyHooks.length : 0;
    const seedCount = S.storySeeds ? S.storySeeds.length : 0;

    // Domain load
    let v3DomainLoad = 0;
    if (S.domainPresence) {
      Object.keys(S.domainPresence).forEach(key => {
        v3DomainLoad += (S.domainPresence[key] || 0);
      });
    }

    // Texture triggers
    const textureCount = S.textureTriggers ? S.textureTriggers.length : 0;

    // City sentiment (with Chicago blend if available)
    let citySentiment = S.cityDynamics ? S.cityDynamics.sentiment : 0;
    if (S.chicagoFeed && S.chicagoFeed.length > 0) {
      const c = S.chicagoFeed[0];
      citySentiment = (citySentiment + (c.sentiment || 0)) / 2;
    }

    const chaosCount = S.worldEvents ? S.worldEvents.length : 0;
    const nightlifeVol = S.nightlifeVolume || 0;

    // Economic mood
    const econMood = S.economicMood || 50;

    // Weather
    const weather = S.weather || {};
    const weatherMood = S.weatherMood || {};

    // Media effects
    const mediaEffects = S.mediaEffects || {};

    // Active arcs
    const arcs = S.eventArcs || [];
    const activeArcCount = arcs.filter(a => a && a.phase !== 'resolved').length;

    // WRITE ROW
    sheet.appendRow([
      new Date(),                          // Timestamp
      cycle,                               // Cycle
      intake.journalist,                   // Journalist
      nameUsed,                            // NameUsed
      fameCategory,                        // FameCategory
      domain,                              // CulturalDomain
      fameScore,                           // FameScore
      trend,                               // TrendTrajectory
      spread,                              // MediaSpread
      tier,                                // CityTier
      neighborhood,                        // Neighborhood (NEW)
      hookCount + seedCount,               // StorySeedCount
      S.cycleWeight || 'low-signal',       // CycleWeight
      S.cycleWeightReason || '',           // CycleWeightReason
      chaosCount,                          // ChaosEvents
      nightlifeVol,                        // NightlifeVolume
      citySentiment,                       // Sentiment
      S.civicLoad || 'stable',             // CivicLoad
      S.shockFlag || 'none',               // ShockFlag
      S.patternFlag || 'none',             // PatternFlag
      econMood,                            // EconomicMood (NEW)
      weather.type || 'clear',             // WeatherType (NEW)
      weatherMood.primaryMood || 'neutral',// WeatherMood (NEW)
      mediaEffects.coverageIntensity || 'minimal', // MediaIntensity (NEW)
      activeArcCount                       // ActiveArcs (NEW)
    ]);

  });
}