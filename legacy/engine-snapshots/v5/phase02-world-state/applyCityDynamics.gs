/**
 * ============================================================================
 * applyCityDynamics_ v2.6 (ES5)
 * ============================================================================
 *
 * v2.6 Changes (additive, non-breaking):
 * - Cluster-based dynamics system (5 clusters covering 12 neighborhoods)
 * - getClusterDynamics_(ctx, clusterName) helper with safe fallback
 * - getNeighborhoodDynamics_(ctx, neighborhood) helper
 * - S.clusterDefinitions exposed for downstream enumeration
 * - Weather v3.5 integration (precipitationIntensity, windSpeed, visibility)
 * - CalendarContext-aware story seed weighting (First Friday, Creation Day, sports, holidays)
 * - Lag/drag system (tourismDrag, publicSpaceDrag, nightlifeDrag, congestionHangover)
 * - Capacity constraints with per-cluster friction
 * - Ripple effects: cluster sentiment bleed, crime spillover, weather front targeting
 *
 * Preserved output schema:
 * - S.cityDynamics: traffic, retail, tourism, nightlife, publicSpaces, sentiment,
 *   culturalActivity, communityEngagement
 *
 * Additive outputs:
 * - S.clusterDynamics, S.neighborhoodDynamics, S.clusterDefinitions
 * - S.cityDynamicsLag, S.cityDynamicsCapacity
 * - S.activityObservations, S.storySeedSignals
 *
 * ============================================================================
 */

function applyCityDynamics_(ctx) {
  if (!ctx) {
    Logger.log('applyCityDynamics_: Missing ctx object');
    return;
  }
  if (!ctx.summary) ctx.summary = {};
  if (!ctx.config) ctx.config = {};

  var S = ctx.summary;

  // ─────────────────────────────────────────────────────────────────────────
  // INPUTS
  // ─────────────────────────────────────────────────────────────────────────
  var season = S.season || 'Spring';
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var weather = S.weather || { type: 'clear', impact: 1 };
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;

  // Sports: allow optional manual override
  var ss = S.sportsSeason || 'off-season';
  var manual = ctx.config.manualDynamicsInputs || S.manualDynamicsInputs || {};
  if (manual && manual.sportsSeasonOverride) ss = String(manual.sportsSeasonOverride);

  // Weather v3.5+ additive fields (safe if absent)
  var precipIntensity = (weather.precipitationIntensity === 0 || weather.precipitationIntensity)
    ? Number(weather.precipitationIntensity) : 0;
  var precipType = weather.precipitationType
    || (weather.type === 'rain' ? 'rain' : (weather.type === 'snow' ? 'snow' : 'none'));
  var windSpeed = (weather.windSpeed === 0 || weather.windSpeed) ? Number(weather.windSpeed) : 5;
  var visibility = (weather.visibility === 0 || weather.visibility) ? Number(weather.visibility) : 10;
  var weatherFront = (weather.front || weather.type || 'CLEAR').toString().toUpperCase();

  // Demographics (optional)
  var neighborhoodDemographics = S.neighborhoodDemographics || {};
  if (typeof getNeighborhoodDemographics_ === 'function' && Object.keys(neighborhoodDemographics).length === 0) {
    neighborhoodDemographics = getNeighborhoodDemographics_(ctx.ss);
    S.neighborhoodDemographics = neighborhoodDemographics;
  }

  // Neighborhood economies (optional)
  var neighborhoodEconomies = S.neighborhoodEconomies || {};

  // Observations (optional)
  var worldEvents = S.worldEvents || [];
  var storySeeds = S.storySeeds || [];
  var eventsGenerated = Number(S.eventsGenerated || 0);
  var crimeSpikes = S.crimeSpikes || S.crimeEvents || [];
  var mediaCoverage = S.mediaCoverage || S.mediaCount || 0;

  // Crime by neighborhood (for ripple effects)
  var crimeByNeighborhood = S.crimeByNeighborhood || {};

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS (ES5)
  // ─────────────────────────────────────────────────────────────────────────
  var round2 = function(n) { return Math.round(n * 100) / 100; };
  var clamp = function(n, min, max) { return Math.max(min, Math.min(max, n)); };
  var clampMult = function(n) { return clamp(n, 0.3, 3.0); };
  var clampSent = function(n) { return clamp(n, -1, 1); };

  function copyObj_(o) {
    return JSON.parse(JSON.stringify(o || {}));
  }

  function safeNum_(x, d) {
    var n = Number(x);
    return isFinite(n) ? n : d;
  }

  function blend(prev, cur, m) {
    if (prev === null || prev === undefined || isNaN(prev)) return cur;
    return (prev * m) + (cur * (1 - m));
  }

  function getMomentumFactor(metric, S) {
    var m = 0.65;
    var shockFlag = (S.shockFlag || 'none').toString();
    var inShock = (shockFlag === 'shock-flag' || shockFlag === 'shock-fading' || shockFlag === 'shock-chronic');

    if (metric === 'sentiment') m = 0.50;
    else if (metric === 'nightlife') m = 0.60;
    else if (metric === 'publicSpaces') m = 0.65;
    else if (metric === 'traffic') m = 0.70;
    else if (metric === 'retail') m = 0.72;
    else if (metric === 'tourism') m = 0.78;
    else if (metric === 'culturalActivity') m = 0.70;
    else if (metric === 'communityEngagement') m = 0.73;

    if (inShock) m = Math.max(0.40, m - 0.15);
    return m;
  }

  function normalizeSportsPhase_(s) {
    s = String(s || '').toLowerCase();
    if (s === 'championship' || s === 'finals') return 'finals';
    if (s === 'playoffs' || s === 'post-season' || s === 'postseason') return 'postseason';
    if (s === 'late-season') return 'late-season';
    if (s === 'mid-season') return 'mid-season';
    if (s === 'early-season' || s === 'regular-season') return 'in-season';
    if (s === 'spring-training' || s === 'preseason') return 'preseason';
    return 'off-season';
  }

  function makeMetrics_() {
    return {
      traffic: 1,
      retail: 1,
      tourism: 1,
      nightlife: 1,
      publicSpaces: 1,
      sentiment: 0,
      culturalActivity: 1,
      communityEngagement: 1
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODIFIER FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  function applySeasonModifiers_(m, seasonName) {
    if (seasonName === 'Winter') {
      m.traffic *= 0.8;
      m.tourism *= 0.6;
      m.nightlife *= 0.7;
      m.publicSpaces *= 0.7;
      m.sentiment -= 0.2;
      m.culturalActivity *= 0.9;
      m.communityEngagement *= 0.8;
    } else if (seasonName === 'Spring') {
      m.traffic *= 1.1;
      m.retail *= 1.2;
      m.tourism *= 1.2;
      m.nightlife *= 1.1;
      m.publicSpaces *= 1.1;
      m.sentiment += 0.2;
      m.culturalActivity *= 1.2;
      m.communityEngagement *= 1.1;
    } else if (seasonName === 'Summer') {
      m.traffic *= 1.4;
      m.retail *= 1.3;
      m.tourism *= 1.6;
      m.nightlife *= 1.4;
      m.publicSpaces *= 1.4;
      m.sentiment += 0.3;
      m.culturalActivity *= 1.3;
      m.communityEngagement *= 1.2;
    } else if (seasonName === 'Fall') {
      m.retail *= 1.1;
      m.tourism *= 0.9;
      m.publicSpaces *= 0.9;
      m.sentiment -= 0.1;
      m.culturalActivity *= 1.1;
      m.communityEngagement *= 1.0;
    }
  }

  function applyWeatherModifiers_(m, weather, extra, clusterName) {
    var t = weather.type || 'clear';
    var impact = safeNum_(weather.impact, 1);
    var front = (weather.front || t || 'CLEAR').toString().toUpperCase();

    var precipI = safeNum_(extra.precipIntensity, 0);
    var wind = safeNum_(extra.windSpeed, 5);
    var vis = safeNum_(extra.visibility, 10);
    var pType = String(extra.precipType || 'none');

    // Base weather type modifiers
    if (t === 'rain' || t === 'fog' || t === 'overcast') {
      m.traffic *= 0.9;
      m.publicSpaces *= (t === 'overcast') ? 0.9 : 0.7;
      m.nightlife *= 0.9;
      m.sentiment -= (t === 'overcast') ? 0.05 : 0.1;
    }
    if (t === 'hot' || t === 'humid') {
      m.publicSpaces *= 1.2;
      m.tourism *= 1.1;
      m.nightlife *= 1.1;
      if (t === 'humid') m.sentiment -= 0.05;
    }
    if (t === 'cold' || t === 'snow') {
      m.publicSpaces *= 0.6;
      m.traffic *= 0.8;
      m.communityEngagement *= 0.9;
      m.sentiment -= 0.1;
    }
    if (t === 'clear' || t === 'mild' || t === 'breeze') {
      m.publicSpaces *= 1.1;
      m.sentiment += 0.1;
    }

    // v3.5 precipitation intensity
    if (pType === 'rain' || pType === 'snow') {
      m.publicSpaces *= (1 - clamp(precipI * 0.4, 0, 0.4));
      m.tourism *= (1 - clamp(precipI * 0.3, 0, 0.3));
      m.traffic *= (1 - clamp(precipI * 0.15, 0, 0.15));
      m.sentiment -= clamp(precipI * 0.12, 0, 0.12);
    }

    // v3.5 wind effects
    if (wind >= 28) {
      m.publicSpaces *= 0.9;
      m.traffic *= 0.95;
      m.nightlife *= 0.95;
      m.sentiment -= 0.05;
    }

    // v3.5 visibility effects
    if (vis <= 3) {
      m.traffic *= 0.92;
      m.tourism *= 0.93;
      m.sentiment -= 0.04;
    }

    // Weather front cluster targeting (ripple effect)
    if (front === 'MARINE' && clusterName === 'WATERFRONT_WEST') {
      m.tourism *= 0.92;
      m.publicSpaces *= 0.88;
      m.sentiment -= 0.06;
    }
    if (front === 'MARINE' && clusterName === 'LAKE_CORRIDOR') {
      m.publicSpaces *= 0.94;
    }
    if (front === 'HEAT' && clusterName === 'EAST_OAKLAND') {
      m.publicSpaces *= 0.92;
      m.sentiment -= 0.04;
    }
    if (front === 'COLD' && clusterName === 'NORTH_HILLS') {
      m.publicSpaces *= 0.9;
      m.traffic *= 0.95;
    }

    // Severe weather impact
    if (impact >= 1.4) {
      m.publicSpaces *= 0.9;
      m.tourism *= 0.92;
      m.traffic *= 0.95;
    }
  }

  function applyHolidayModifiers_(m, holiday, holidayPriority, flags, seasonName, clusterName) {
    var isFF = !!flags.isFirstFriday;
    var isCD = !!flags.isCreationDay;

    // Holiday priority baseline
    if (holidayPriority === 'major') {
      m.publicSpaces *= 1.1;
      m.sentiment += 0.1;
    } else if (holidayPriority === 'cultural') {
      m.culturalActivity *= 1.2;
      m.communityEngagement *= 1.1;
    } else if (holidayPriority === 'oakland') {
      m.communityEngagement *= 1.2;
      m.culturalActivity *= 1.1;
    }

    // First Friday (cluster-sensitive - arts corridor boost)
    if (isFF) {
      if (clusterName === 'DOWNTOWN_CORE') {
        // KONO/Uptown arts walk epicenter
        m.nightlife *= 1.5;
        m.culturalActivity *= 1.6;
        m.communityEngagement *= 1.4;
        m.publicSpaces *= 1.3;
        m.retail *= 1.3;
        m.traffic *= 1.3;
        m.sentiment += 0.25;
      } else if (clusterName === 'NORTH_HILLS') {
        // Temescal/Rockridge get spillover
        m.nightlife *= 1.3;
        m.culturalActivity *= 1.4;
        m.communityEngagement *= 1.2;
        m.retail *= 1.2;
        m.sentiment += 0.15;
      } else {
        // Other clusters get modest boost
        m.nightlife *= 1.2;
        m.culturalActivity *= 1.25;
        m.communityEngagement *= 1.15;
        m.sentiment += 0.1;
      }
    }

    // Creation Day (citywide, East Oakland special)
    if (isCD || holiday === 'CreationDay') {
      m.communityEngagement *= 1.3;
      m.culturalActivity *= 1.2;
      m.sentiment += 0.2;
      if (clusterName === 'EAST_OAKLAND') {
        m.communityEngagement *= 1.1;
        m.sentiment += 0.05;
      }
    }

    // Major holidays (keep v2.5 values)
    if (holiday === 'NewYear') { m.nightlife *= 1.4; m.publicSpaces *= 1.3; m.retail *= 1.1; m.sentiment += 0.4; }
    if (holiday === 'NewYearsEve') { m.nightlife *= 1.8; m.publicSpaces *= 1.5; m.traffic *= 1.3; m.sentiment += 0.5; }
    if (holiday === 'MLKDay') { m.communityEngagement *= 1.4; m.culturalActivity *= 1.3; m.publicSpaces *= 1.2; m.sentiment += 0.2; }
    if (holiday === 'Easter') { m.communityEngagement *= 1.3; m.retail *= 1.2; m.sentiment += 0.2; }
    if (holiday === 'MemorialDay') { m.publicSpaces *= 1.3; m.traffic *= 1.2; m.tourism *= 1.2; m.communityEngagement *= 1.2; m.sentiment += 0.2; }
    if (holiday === 'Juneteenth') { m.communityEngagement *= 1.5; m.culturalActivity *= 1.5; m.publicSpaces *= 1.4; m.nightlife *= 1.3; m.sentiment += 0.4; }
    if (holiday === 'Independence') { m.tourism *= 1.4; m.publicSpaces *= 1.5; m.nightlife *= 1.4; m.traffic *= 1.3; m.sentiment += 0.4; }
    if (holiday === 'LaborDay') { m.publicSpaces *= 1.3; m.traffic *= 1.2; m.communityEngagement *= 1.2; m.sentiment += 0.2; }
    if (holiday === 'Halloween') { m.nightlife *= 1.4; m.publicSpaces *= 1.3; m.communityEngagement *= 1.4; m.culturalActivity *= 1.3; m.retail *= 1.2; m.sentiment += 0.3; }
    if (holiday === 'Thanksgiving') { m.traffic *= 1.3; m.retail *= 1.3; m.communityEngagement *= 1.3; m.nightlife *= 0.7; m.sentiment += 0.3; }
    if (holiday === 'Holiday') { m.retail *= 1.5; m.nightlife *= 1.3; m.publicSpaces *= 1.3; m.communityEngagement *= 1.3; m.traffic *= 1.2; m.sentiment += 0.4; }

    // Cultural holidays
    if (holiday === 'BlackHistoryMonth') { m.culturalActivity *= 1.4; m.communityEngagement *= 1.3; m.sentiment += 0.1; }
    if (holiday === 'CincoDeMayo') { m.nightlife *= 1.5; m.culturalActivity *= 1.5; m.communityEngagement *= 1.4; m.publicSpaces *= 1.3; m.retail *= 1.2; m.sentiment += 0.3; }
    if (holiday === 'PrideMonth') { m.culturalActivity *= 1.4; m.communityEngagement *= 1.3; m.nightlife *= 1.2; m.sentiment += 0.2; }
    if (holiday === 'IndigenousPeoplesDay') { m.culturalActivity *= 1.3; m.communityEngagement *= 1.2; m.sentiment += 0.1; }
    if (holiday === 'DiaDeMuertos') { m.culturalActivity *= 1.6; m.communityEngagement *= 1.5; m.publicSpaces *= 1.3; m.sentiment += 0.2; }
    if (holiday === 'Hanukkah') { m.culturalActivity *= 1.2; m.communityEngagement *= 1.2; m.retail *= 1.1; m.sentiment += 0.1; }

    // Oakland-specific
    if (holiday === 'OpeningDay') { m.traffic *= 1.4; m.nightlife *= 1.4; m.publicSpaces *= 1.3; m.communityEngagement *= 1.4; m.sentiment += 0.4; }
    if (holiday === 'OaklandPride') { m.nightlife *= 1.6; m.publicSpaces *= 1.5; m.culturalActivity *= 1.6; m.communityEngagement *= 1.5; m.tourism *= 1.3; m.sentiment += 0.5; }
    if (holiday === 'EarthDay') { m.publicSpaces *= 1.3; m.communityEngagement *= 1.3; m.culturalActivity *= 1.2; m.sentiment += 0.2; }
    if (holiday === 'ArtSoulFestival') { m.nightlife *= 1.5; m.publicSpaces *= 1.6; m.culturalActivity *= 1.7; m.communityEngagement *= 1.5; m.traffic *= 1.3; m.tourism *= 1.3; m.sentiment += 0.4; }
    if (holiday === 'SummerFestival') { m.nightlife *= 1.3; m.publicSpaces *= 1.4; m.communityEngagement *= 1.3; m.sentiment += 0.3; }

    // Minor holidays
    if (holiday === 'Valentine') { m.nightlife *= 1.3; m.retail *= 1.3; m.sentiment += 0.2; }
    if (holiday === 'StPatricksDay') { m.nightlife *= 1.5; m.traffic *= 1.1; m.sentiment += 0.2; }
    if (holiday === 'PresidentsDay') { m.retail *= 1.2; m.traffic *= 0.9; }
    if (holiday === 'MothersDay' || holiday === 'FathersDay') { m.retail *= 1.3; m.communityEngagement *= 1.1; m.sentiment += 0.1; }
    if (holiday === 'VeteransDay') { m.communityEngagement *= 1.1; m.sentiment += 0.1; }
    if (holiday === 'PatriotDay') { m.communityEngagement *= 1.1; m.nightlife *= 0.8; m.sentiment -= 0.1; }
    if (holiday === 'BackToSchool') { m.traffic *= 1.2; m.retail *= 1.4; }

    // Seasonal markers
    if (holiday === 'SpringEquinox' || holiday === 'SummerSolstice') { m.publicSpaces *= 1.1; m.sentiment += 0.1; }
    if (holiday === 'FallEquinox' || holiday === 'WinterSolstice') { m.sentiment -= 0.05; }

    // Winter dampening
    if (seasonName === 'Winter') m.publicSpaces *= 0.97;
  }

  function applySportsModifiers_(m, sportsSeasonRaw, clusterName) {
    var phase = normalizeSportsPhase_(sportsSeasonRaw);

    // Base sports modifiers
    if (phase === 'preseason') m.sentiment += 0.1;
    else if (phase === 'in-season') { m.sentiment += 0.1; m.nightlife *= 1.05; }
    else if (phase === 'mid-season') { m.traffic *= 1.2; m.nightlife *= 1.1; m.sentiment += 0.2; }
    else if (phase === 'late-season') { m.traffic *= 1.3; m.nightlife *= 1.2; m.sentiment += 0.25; }
    else if (phase === 'postseason') { m.traffic *= 1.4; m.nightlife *= 1.3; m.communityEngagement *= 1.2; m.sentiment += 0.3; }
    else if (phase === 'finals') { m.traffic *= 1.5; m.nightlife *= 1.5; m.publicSpaces *= 1.3; m.communityEngagement *= 1.4; m.sentiment += 0.5; }

    // Cluster-specific sports ripple (Coliseum area = East Oakland/Waterfront)
    if (phase === 'postseason' || phase === 'finals') {
      if (clusterName === 'WATERFRONT_WEST') {
        m.traffic *= 1.15;
        m.nightlife *= 1.1;
      }
      if (clusterName === 'EAST_OAKLAND') {
        m.traffic *= 1.1;
        m.communityEngagement *= 1.1;
      }
      if (clusterName === 'DOWNTOWN_CORE') {
        m.nightlife *= 1.15;
        m.traffic *= 1.1;
      }
    }
  }

  function aggregateDemographics_(hoods, neighborhoodDemographics) {
    var totalPop = 0, totalUnemp = 0, totalSick = 0, totalStudents = 0, totalSeniors = 0;
    for (var i = 0; i < hoods.length; i++) {
      var nh = hoods[i];
      var d = neighborhoodDemographics[nh];
      if (!d) continue;
      var pop = (d.students || 0) + (d.adults || 0) + (d.seniors || 0);
      totalPop += pop;
      totalUnemp += (d.unemployed || 0);
      totalSick += (d.sick || 0);
      totalStudents += (d.students || 0);
      totalSeniors += (d.seniors || 0);
    }
    if (totalPop <= 0) {
      return { unemploymentRate: 0.08, sicknessRate: 0.05, studentRatio: 0.15, seniorRatio: 0.12, totalPopulation: 0 };
    }
    return {
      unemploymentRate: totalUnemp / totalPop,
      sicknessRate: totalSick / totalPop,
      studentRatio: totalStudents / totalPop,
      seniorRatio: totalSeniors / totalPop,
      totalPopulation: totalPop
    };
  }

  function applyDemographicModifiers_(m, demoAgg) {
    var ur = safeNum_(demoAgg.unemploymentRate, 0);
    var sr = safeNum_(demoAgg.sicknessRate, 0);
    var stud = safeNum_(demoAgg.studentRatio, 0);
    var sen = safeNum_(demoAgg.seniorRatio, 0);

    // Unemployment (v2.5 values)
    if (ur > 0.12) { m.retail *= 0.92; m.sentiment -= 0.15; }
    else if (ur > 0.08) { m.retail *= 0.96; m.sentiment -= 0.08; }
    else if (ur < 0.05) { m.retail *= 1.05; m.sentiment += 0.05; }

    // Sickness (v2.5 values)
    if (sr > 0.10) {
      m.publicSpaces *= 0.88;
      m.communityEngagement *= 0.90;
      m.nightlife *= 0.92;
      m.sentiment -= 0.10;
    } else if (sr > 0.06) {
      m.publicSpaces *= 0.95;
      m.communityEngagement *= 0.96;
    }

    // Youth population (v2.5 values)
    if (stud > 0.25) { m.nightlife *= 1.10; m.culturalActivity *= 1.08; }
    else if (stud > 0.18) { m.nightlife *= 1.05; m.culturalActivity *= 1.04; }

    // Senior population (v2.5 values)
    if (sen > 0.25) { m.communityEngagement *= 1.08; m.publicSpaces *= 1.05; m.nightlife *= 0.95; }
    else if (sen > 0.18) { m.communityEngagement *= 1.04; }
  }

  function applyEconomyLocal_(m, hoodEconomy) {
    if (!hoodEconomy) return;
    var mood = safeNum_(hoodEconomy.mood, 50);
    var desc = String(hoodEconomy.descriptor || 'stable');

    if (mood >= 70) { m.retail *= 1.06; m.sentiment += 0.05; m.tourism *= 1.04; }
    else if (mood >= 60) { m.retail *= 1.03; m.sentiment += 0.02; }
    else if (mood <= 30) { m.retail *= 0.90; m.sentiment -= 0.10; m.tourism *= 0.93; }
    else if (mood <= 40) { m.retail *= 0.95; m.sentiment -= 0.05; }

    if (desc === 'thriving') { m.retail *= 1.04; m.culturalActivity *= 1.03; }
    if (desc === 'struggling') { m.retail *= 0.95; m.sentiment -= 0.04; }
  }

  function applyObservedFeedback_(m, obs) {
    var e = safeNum_(obs.events, 0);
    var media = safeNum_(obs.media, 0);
    var crime = safeNum_(obs.crime, 0);
    var seeds = safeNum_(obs.storySeedCount, 0);
    var shocks = safeNum_(obs.shockCount, 0);

    if (e >= 4) { m.publicSpaces *= 1.08; m.culturalActivity *= 1.06; m.sentiment += 0.05; }
    else if (e >= 2) { m.publicSpaces *= 1.04; m.culturalActivity *= 1.03; }

    if (seeds >= 10 || media >= 10) { m.communityEngagement *= 1.05; m.culturalActivity *= 1.05; m.sentiment += 0.03; }
    else if (seeds >= 6 || media >= 6) { m.communityEngagement *= 1.03; }

    // Crime dampens nightlife and tourism (ripple effect)
    if (crime >= 3) { m.nightlife *= 0.88; m.publicSpaces *= 0.90; m.tourism *= 0.92; m.sentiment -= 0.12; }
    else if (crime >= 1) { m.nightlife *= 0.95; m.tourism *= 0.97; m.sentiment -= 0.04; }

    if (shocks >= 3) { m.traffic *= 0.94; m.sentiment -= 0.08; }
    else if (shocks >= 1) { m.sentiment -= 0.03; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLUSTER DEFINITIONS (exposed via S.clusterDefinitions)
  // ─────────────────────────────────────────────────────────────────────────
  var CLUSTERS = {
    'DOWNTOWN_CORE': {
      hoods: ['Downtown', 'Uptown', 'KONO', 'Chinatown'],
      weights: { traffic: 1.15, retail: 1.12, tourism: 1.10, nightlife: 1.25, publicSpaces: 1.05, culturalActivity: 1.20, communityEngagement: 1.00 },
      capacitySensitivity: 1.4  // Downtown feels congestion most
    },
    'WATERFRONT_WEST': {
      hoods: ['Jack London', 'West Oakland'],
      weights: { traffic: 1.05, retail: 0.95, tourism: 1.20, nightlife: 1.10, publicSpaces: 1.05, culturalActivity: 1.05, communityEngagement: 1.05 },
      capacitySensitivity: 1.1
    },
    'LAKE_CORRIDOR': {
      hoods: ['Lake Merritt', 'Piedmont Ave'],
      weights: { traffic: 1.00, retail: 1.05, tourism: 1.08, nightlife: 1.00, publicSpaces: 1.25, culturalActivity: 1.10, communityEngagement: 1.10 },
      capacitySensitivity: 0.9
    },
    'NORTH_HILLS': {
      hoods: ['Rockridge', 'Temescal'],
      weights: { traffic: 0.95, retail: 1.10, tourism: 0.95, nightlife: 1.05, publicSpaces: 1.08, culturalActivity: 1.08, communityEngagement: 1.05 },
      capacitySensitivity: 0.7
    },
    'EAST_OAKLAND': {
      hoods: ['Fruitvale', 'Laurel'],
      weights: { traffic: 1.00, retail: 0.95, tourism: 0.80, nightlife: 0.90, publicSpaces: 0.95, culturalActivity: 1.08, communityEngagement: 1.15 },
      capacitySensitivity: 0.6  // Less affected by citywide congestion
    }
  };

  // Adjacent clusters for sentiment bleed
  var CLUSTER_ADJACENCY = {
    'DOWNTOWN_CORE': ['WATERFRONT_WEST', 'LAKE_CORRIDOR', 'NORTH_HILLS'],
    'WATERFRONT_WEST': ['DOWNTOWN_CORE', 'EAST_OAKLAND'],
    'LAKE_CORRIDOR': ['DOWNTOWN_CORE', 'NORTH_HILLS', 'EAST_OAKLAND'],
    'NORTH_HILLS': ['DOWNTOWN_CORE', 'LAKE_CORRIDOR'],
    'EAST_OAKLAND': ['WATERFRONT_WEST', 'LAKE_CORRIDOR']
  };

  var clusterWeights = {
    'DOWNTOWN_CORE': 0.28,
    'WATERFRONT_WEST': 0.18,
    'LAKE_CORRIDOR': 0.22,
    'NORTH_HILLS': 0.17,
    'EAST_OAKLAND': 0.15
  };

  // Expose cluster definitions
  S.clusterDefinitions = {};
  for (var ck in CLUSTERS) {
    if (!CLUSTERS.hasOwnProperty(ck)) continue;
    S.clusterDefinitions[ck] = {
      neighborhoods: CLUSTERS[ck].hoods.slice(),
      adjacent: (CLUSTER_ADJACENCY[ck] || []).slice()
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CAPACITY SYSTEM
  // ─────────────────────────────────────────────────────────────────────────
  var capCfg = ctx.config.cityCapacity || S.cityCapacity || {};
  var capacity = {
    transitCapacity: clamp(safeNum_(capCfg.transitCapacity, 1.0), 0.6, 1.4),
    venueCapacity: clamp(safeNum_(capCfg.venueCapacity, 1.0), 0.6, 1.4),
    roadCapacity: clamp(safeNum_(capCfg.roadCapacity, 1.0), 0.6, 1.4)
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LAG SYSTEM (temporal memory)
  // ─────────────────────────────────────────────────────────────────────────
  if (!S.cityDynamicsLag) {
    S.cityDynamicsLag = {
      tourismDrag: 0,
      publicSpaceDrag: 0,
      nightlifeDrag: 0,
      congestionHangover: 0,
      lastUpdatedCycle: (S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0)
    };
  }
  var lag = S.cityDynamicsLag;

  function updateLag_(lag, weather, extra, holidayPriority) {
    // Decay existing drags
    lag.tourismDrag = clamp(lag.tourismDrag * 0.84, 0, 0.5);
    lag.publicSpaceDrag = clamp(lag.publicSpaceDrag * 0.82, 0, 0.5);
    lag.nightlifeDrag = clamp(lag.nightlifeDrag * 0.84, 0, 0.4);
    lag.congestionHangover = clamp(lag.congestionHangover * 0.82, 0, 0.4);

    var impact = safeNum_(weather.impact, 1);
    var pI = clamp(safeNum_(extra.precipIntensity, 0), 0, 1);
    var wind = safeNum_(extra.windSpeed, 5);
    var vis = safeNum_(extra.visibility, 10);
    var pType = String(extra.precipType || 'none');

    // Calculate disruption from weather
    var disruption = 0;
    if (impact >= 1.4) disruption += 0.10;
    if (pType === 'rain' || pType === 'snow') disruption += 0.12 * pI;
    if (wind >= 30) disruption += 0.08;
    if (vis <= 3) disruption += 0.06;
    if (weather.type === 'fog') disruption += 0.04;

    // Major holidays create congestion hangover
    if (holidayPriority === 'major') lag.congestionHangover = clamp(lag.congestionHangover + 0.08, 0, 0.4);

    // Apply disruption to drags
    if (disruption > 0) {
      lag.tourismDrag = clamp(lag.tourismDrag + disruption * 1.0, 0, 0.5);
      lag.publicSpaceDrag = clamp(lag.publicSpaceDrag + disruption * 0.8, 0, 0.5);
      lag.nightlifeDrag = clamp(lag.nightlifeDrag + disruption * 0.7, 0, 0.4);
    }

    // Good weather accelerates recovery
    if ((weather.type === 'clear' || weather.type === 'mild' || weather.type === 'breeze') && impact <= 1.1) {
      lag.tourismDrag = clamp(lag.tourismDrag - 0.04, 0, 0.5);
      lag.publicSpaceDrag = clamp(lag.publicSpaceDrag - 0.04, 0, 0.5);
      lag.nightlifeDrag = clamp(lag.nightlifeDrag - 0.03, 0, 0.4);
    }
  }

  updateLag_(lag, weather, { precipIntensity: precipIntensity, precipType: precipType, windSpeed: windSpeed, visibility: visibility }, holidayPriority);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIVITY OBSERVATIONS (rolling history)
  // ─────────────────────────────────────────────────────────────────────────
  if (!S.activityObservations) S.activityObservations = { history: [] };

  var obs = {
    cycle: (S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0),
    events: eventsGenerated,
    storySeedCount: storySeeds.length,
    media: safeNum_(mediaCoverage, 0),
    crime: (crimeSpikes && crimeSpikes.length) ? crimeSpikes.length : safeNum_(crimeSpikes, 0),
    shockCount: worldEvents.length
  };

  S.activityObservations.history.push(obs);
  if (S.activityObservations.history.length > 12) S.activityObservations.history.shift();

  function rollingAvg_(key, n) {
    var h = S.activityObservations.history;
    var start = Math.max(0, h.length - n);
    var sum = 0;
    var count = 0;
    for (var i = start; i < h.length; i++) {
      if (h[i] && h[i][key] !== undefined) { sum += Number(h[i][key]); count++; }
    }
    return count <= 0 ? 0 : (sum / count);
  }

  var obsAvg = {
    events: rollingAvg_('events', 6),
    storySeedCount: rollingAvg_('storySeedCount', 6),
    media: rollingAvg_('media', 6),
    crime: rollingAvg_('crime', 6),
    shockCount: rollingAvg_('shockCount', 6)
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STORY SEED SIGNALS (cluster-aware, calendar-aware)
  // ─────────────────────────────────────────────────────────────────────────
  function isArtsCluster_(clusterName) {
    return (clusterName === 'DOWNTOWN_CORE' || clusterName === 'NORTH_HILLS');
  }

  function isNightlifeCluster_(clusterName) {
    return (clusterName === 'DOWNTOWN_CORE' || clusterName === 'WATERFRONT_WEST');
  }

  function isPublicSpaceCluster_(clusterName) {
    return (clusterName === 'LAKE_CORRIDOR');
  }

  function seedCalendarBoost_(seed, clusterName) {
    var cc = seed && seed.calendarContext;
    if (!cc) return 0;

    var b = 0;

    if (cc.isFirstFriday) {
      b += isArtsCluster_(clusterName) ? 0.40 : 0.20;
    }
    if (cc.isCreationDay) {
      b += 0.18;
      if (clusterName === 'EAST_OAKLAND') b += 0.08;
    }

    var hp = (cc.holidayPriority || '').toString();
    if (hp === 'major') {
      b += (clusterName === 'DOWNTOWN_CORE' ? 0.22 : 0.12);
      if (isPublicSpaceCluster_(clusterName)) b += 0.06;
    } else if (hp === 'cultural' || hp === 'oakland') {
      b += isArtsCluster_(clusterName) ? 0.18 : 0.12;
    }

    var sp = normalizeSportsPhase_(cc.sportsSeason || '');
    if (sp === 'postseason') {
      b += isNightlifeCluster_(clusterName) ? 0.22 : 0.12;
    } else if (sp === 'finals') {
      b += isNightlifeCluster_(clusterName) ? 0.30 : 0.18;
    }

    return b;
  }

  function seedWeight_(seed, clusterName) {
    var p = safeNum_(seed && seed.priority, 1);
    var w = p;

    var st = (seed && seed.seedType) ? String(seed.seedType) : '';
    if (st === 'holiday' || st === 'firstfriday' || st === 'creationday') w *= 1.15;
    if (st === 'shock' || st === 'event') w *= 1.08;

    // CalendarContext boosts
    var cal = seedCalendarBoost_(seed, clusterName);
    w *= (1 + clamp(cal, 0, 0.7));

    return w;
  }

  function neighborhoodToCluster_(neighborhood, clusters) {
    if (!neighborhood) return null;
    for (var ck in clusters) {
      if (!clusters.hasOwnProperty(ck)) continue;
      var hoods = clusters[ck].hoods || [];
      for (var i = 0; i < hoods.length; i++) {
        if (hoods[i] === neighborhood) return ck;
      }
    }
    return null;
  }

  function buildSeedSignals_(storySeeds, clusters) {
    var sig = {
      totalWeighted: 0,
      byCluster: {},
      byNeighborhood: {},
      byDomainCluster: {},
      citywideWeighted: 0
    };

    for (var ck in clusters) {
      if (!clusters.hasOwnProperty(ck)) continue;
      sig.byCluster[ck] = { weighted: 0, count: 0 };
      sig.byDomainCluster[ck] = {};
    }

    for (var i = 0; i < storySeeds.length; i++) {
      var s0 = storySeeds[i];
      if (!s0 || !s0.text) continue;

      var nh = s0.neighborhood || '';
      var dom = (s0.domain || 'GENERAL').toString().toUpperCase();

      if (nh) {
        if (!sig.byNeighborhood[nh]) sig.byNeighborhood[nh] = { weighted: 0, count: 0 };

        var cl = neighborhoodToCluster_(nh, clusters);
        if (cl && sig.byCluster[cl]) {
          var w = seedWeight_(s0, cl);
          sig.totalWeighted += w;

          sig.byNeighborhood[nh].weighted += w;
          sig.byNeighborhood[nh].count += 1;

          sig.byCluster[cl].weighted += w;
          sig.byCluster[cl].count += 1;

          if (!sig.byDomainCluster[cl][dom]) sig.byDomainCluster[cl][dom] = 0;
          sig.byDomainCluster[cl][dom] += w;
        } else {
          var w2 = seedWeight_(s0, 'DOWNTOWN_CORE');
          sig.totalWeighted += w2;
          sig.citywideWeighted += w2;

          sig.byNeighborhood[nh].weighted += w2;
          sig.byNeighborhood[nh].count += 1;
        }
      } else {
        var w3 = seedWeight_(s0, 'DOWNTOWN_CORE');
        sig.totalWeighted += w3;
        sig.citywideWeighted += w3;
      }
    }

    return sig;
  }

  function applySeedLocalBoost_(m, seedSig, clusterName) {
    if (!seedSig || !seedSig.byCluster || !seedSig.byCluster[clusterName]) return;

    var c = seedSig.byCluster[clusterName];
    var w = safeNum_(c.weighted, 0);

    if (w >= 10) {
      m.culturalActivity *= 1.08;
      m.communityEngagement *= 1.04;
      m.sentiment += 0.04;
    } else if (w >= 6) {
      m.culturalActivity *= 1.05;
      m.communityEngagement *= 1.03;
      m.sentiment += 0.02;
    } else if (w >= 3) {
      m.culturalActivity *= 1.03;
      m.communityEngagement *= 1.02;
      m.sentiment += 0.01;
    }

    // Domain-specific boosts
    var doms = seedSig.byDomainCluster[clusterName] || {};
    var wCulture = safeNum_(doms.CULTURE, 0);
    var wComm = safeNum_(doms.COMMUNITY, 0);
    var wBiz = safeNum_(doms.BUSINESS, 0);
    var wNight = safeNum_(doms.NIGHTLIFE, 0);
    var wCivic = safeNum_(doms.CIVIC, 0) + safeNum_(doms.SAFETY, 0);

    if (wCulture >= 6) { m.culturalActivity *= 1.05; m.publicSpaces *= 1.03; }
    else if (wCulture >= 3) { m.culturalActivity *= 1.03; }

    if (wComm >= 6) { m.communityEngagement *= 1.05; m.sentiment += 0.03; }
    else if (wComm >= 3) { m.communityEngagement *= 1.03; }

    if (wBiz >= 6) { m.retail *= 1.04; m.sentiment += 0.02; }
    else if (wBiz >= 3) { m.retail *= 1.02; }

    if (wNight >= 6) { m.nightlife *= 1.05; m.traffic *= 1.03; }
    else if (wNight >= 3) { m.nightlife *= 1.03; }

    if (wCivic >= 6) { m.sentiment -= 0.04; m.publicSpaces *= 0.98; }
    else if (wCivic >= 3) { m.sentiment -= 0.02; }
  }

  var seedSignals = buildSeedSignals_(storySeeds, CLUSTERS);
  S.storySeedSignals = seedSignals;

  // ─────────────────────────────────────────────────────────────────────────
  // CRIME RIPPLE EFFECT (per-cluster crime impact)
  // ─────────────────────────────────────────────────────────────────────────
  function getClusterCrimeCount_(clusterName) {
    if (!crimeByNeighborhood || Object.keys(crimeByNeighborhood).length === 0) return 0;
    var hoods = CLUSTERS[clusterName] ? CLUSTERS[clusterName].hoods : [];
    var count = 0;
    for (var i = 0; i < hoods.length; i++) {
      count += safeNum_(crimeByNeighborhood[hoods[i]], 0);
    }
    return count;
  }

  function applyCrimeRipple_(m, clusterName) {
    var localCrime = getClusterCrimeCount_(clusterName);
    if (localCrime >= 3) {
      m.nightlife *= 0.85;
      m.tourism *= 0.88;
      m.publicSpaces *= 0.88;
      m.sentiment -= 0.15;
    } else if (localCrime >= 2) {
      m.nightlife *= 0.92;
      m.tourism *= 0.94;
      m.sentiment -= 0.08;
    } else if (localCrime >= 1) {
      m.nightlife *= 0.97;
      m.sentiment -= 0.04;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTE CLUSTER + NEIGHBORHOOD DYNAMICS
  // ─────────────────────────────────────────────────────────────────────────
  var clusterDynamics = {};
  var neighborhoodDynamics = {};

  function applyLocalPlaceBias_(m, clusterName) {
    if (clusterName === 'DOWNTOWN_CORE') {
      m.nightlife *= 1.08;
      m.traffic *= 1.06;
    } else if (clusterName === 'WATERFRONT_WEST') {
      m.tourism *= 1.08;
      if (weatherFront === 'MARINE' || windSpeed >= 25) m.tourism *= 0.94;
    } else if (clusterName === 'LAKE_CORRIDOR') {
      m.publicSpaces *= 1.10;
      if (precipIntensity >= 0.4) m.publicSpaces *= 0.93;
    } else if (clusterName === 'NORTH_HILLS') {
      m.retail *= 1.06;
      if (season === 'Winter') m.publicSpaces *= 0.96;
    } else if (clusterName === 'EAST_OAKLAND') {
      m.communityEngagement *= 1.08;
      m.tourism *= 0.96;
    }
  }

  // First pass: compute cluster dynamics
  for (var cname in CLUSTERS) {
    if (!CLUSTERS.hasOwnProperty(cname)) continue;

    var cdef = CLUSTERS[cname];
    var m = makeMetrics_();

    // Core modifiers
    applySeasonModifiers_(m, season);
    applyWeatherModifiers_(m, weather, {
      precipIntensity: precipIntensity,
      precipType: precipType,
      windSpeed: windSpeed,
      visibility: visibility
    }, cname);
    applyHolidayModifiers_(m, holiday, holidayPriority, { isFirstFriday: isFirstFriday, isCreationDay: isCreationDay }, season, cname);
    applySportsModifiers_(m, ss, cname);

    // Place bias
    applyLocalPlaceBias_(m, cname);

    // Cluster weights
    var w = cdef.weights || {};
    m.traffic *= safeNum_(w.traffic, 1);
    m.retail *= safeNum_(w.retail, 1);
    m.tourism *= safeNum_(w.tourism, 1);
    m.nightlife *= safeNum_(w.nightlife, 1);
    m.publicSpaces *= safeNum_(w.publicSpaces, 1);
    m.culturalActivity *= safeNum_(w.culturalActivity, 1);
    m.communityEngagement *= safeNum_(w.communityEngagement, 1);

    // Demographics
    if (Object.keys(neighborhoodDemographics).length > 0) {
      var demoAgg = aggregateDemographics_(cdef.hoods, neighborhoodDemographics);
      applyDemographicModifiers_(m, demoAgg);
      m.demographics = {
        unemploymentRate: round2(demoAgg.unemploymentRate),
        sicknessRate: round2(demoAgg.sicknessRate),
        studentRatio: round2(demoAgg.studentRatio),
        seniorRatio: round2(demoAgg.seniorRatio),
        totalPopulation: demoAgg.totalPopulation
      };
    }

    // Economy (cluster average)
    var econMoodSum = 0;
    var econCount = 0;
    for (var hi = 0; hi < cdef.hoods.length; hi++) {
      var hood = cdef.hoods[hi];
      var he = neighborhoodEconomies[hood];
      if (he && he.mood !== undefined) { econMoodSum += safeNum_(he.mood, 50); econCount++; }
    }
    if (econCount > 0) {
      var avgMood = econMoodSum / econCount;
      applyEconomyLocal_(m, {
        mood: avgMood,
        descriptor: (avgMood >= 70 ? 'thriving' : (avgMood <= 30 ? 'struggling' : 'stable'))
      });
      m.economy = { mood: round2(avgMood) };
    }

    // Observed feedback
    applyObservedFeedback_(m, {
      events: obsAvg.events,
      media: obsAvg.media,
      crime: obsAvg.crime,
      storySeedCount: obsAvg.storySeedCount,
      shockCount: obsAvg.shockCount
    });

    // Story seed boosts
    applySeedLocalBoost_(m, seedSignals, cname);

    // Crime ripple effect
    applyCrimeRipple_(m, cname);

    // Lag drags (cluster-sensitive)
    var tourismDrag = lag.tourismDrag;
    var publicDrag = lag.publicSpaceDrag;
    var nightDrag = lag.nightlifeDrag;
    if (cname === 'WATERFRONT_WEST') tourismDrag = clamp(tourismDrag + 0.04, 0, 0.5);
    if (cname === 'DOWNTOWN_CORE') nightDrag = clamp(nightDrag + 0.03, 0, 0.4);

    m.tourism *= (1 - tourismDrag);
    m.publicSpaces *= (1 - publicDrag);
    m.nightlife *= (1 - nightDrag);

    // Clamp
    m.traffic = clampMult(m.traffic);
    m.retail = clampMult(m.retail);
    m.tourism = clampMult(m.tourism);
    m.nightlife = clampMult(m.nightlife);
    m.publicSpaces = clampMult(m.publicSpaces);
    m.sentiment = clampSent(m.sentiment);
    m.culturalActivity = clampMult(m.culturalActivity);
    m.communityEngagement = clampMult(m.communityEngagement);

    clusterDynamics[cname] = m;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SENTIMENT BLEED (ripple effect between adjacent clusters)
  // ─────────────────────────────────────────────────────────────────────────
  function applySentimentBleed_(clusterDynamics, adjacency) {
    var bleedFactor = 0.12;
    var newSentiments = {};

    for (var cn in clusterDynamics) {
      if (!clusterDynamics.hasOwnProperty(cn)) continue;
      var baseSent = clusterDynamics[cn].sentiment;
      var neighbors = adjacency[cn] || [];
      var neighborSum = 0;
      var neighborCount = 0;

      for (var i = 0; i < neighbors.length; i++) {
        var nb = neighbors[i];
        if (clusterDynamics[nb]) {
          neighborSum += clusterDynamics[nb].sentiment;
          neighborCount++;
        }
      }

      if (neighborCount > 0) {
        var neighborAvg = neighborSum / neighborCount;
        newSentiments[cn] = baseSent + (neighborAvg - baseSent) * bleedFactor;
      } else {
        newSentiments[cn] = baseSent;
      }
    }

    for (var cn2 in newSentiments) {
      if (clusterDynamics[cn2]) {
        clusterDynamics[cn2].sentiment = clampSent(newSentiments[cn2]);
      }
    }
  }

  applySentimentBleed_(clusterDynamics, CLUSTER_ADJACENCY);

  // ─────────────────────────────────────────────────────────────────────────
  // NEIGHBORHOOD DYNAMICS (derived from clusters)
  // ─────────────────────────────────────────────────────────────────────────
  for (var cname2 in CLUSTERS) {
    if (!CLUSTERS.hasOwnProperty(cname2)) continue;
    var cdef2 = CLUSTERS[cname2];
    var clusterM = clusterDynamics[cname2];

    for (var hn = 0; hn < cdef2.hoods.length; hn++) {
      var nhood = cdef2.hoods[hn];

      var nm = {
        traffic: clusterM.traffic,
        retail: clusterM.retail,
        tourism: clusterM.tourism,
        nightlife: clusterM.nightlife,
        publicSpaces: clusterM.publicSpaces,
        sentiment: clusterM.sentiment,
        culturalActivity: clusterM.culturalActivity,
        communityEngagement: clusterM.communityEngagement
      };

      // Neighborhood microclimate
      var nhW = S.neighborhoodWeather && S.neighborhoodWeather[nhood];
      if (nhW && nhW.type) {
        if (nhW.type === 'fog') { nm.tourism *= 0.95; nm.traffic *= 0.97; }
        if (nhW.type === 'hot') { nm.publicSpaces *= 1.05; }
      }

      // Neighborhood-local seeds
      var nSig = seedSignals.byNeighborhood && seedSignals.byNeighborhood[nhood];
      if (nSig) {
        var nw = safeNum_(nSig.weighted, 0);
        if (nw >= 6) { nm.culturalActivity *= 1.04; nm.communityEngagement *= 1.03; nm.sentiment += 0.02; }
        else if (nw >= 3) { nm.culturalActivity *= 1.02; nm.communityEngagement *= 1.01; }
      }

      // Demographics micro
      var d0 = neighborhoodDemographics[nhood];
      if (d0) {
        var pop0 = (d0.students || 0) + (d0.adults || 0) + (d0.seniors || 0);
        if (pop0 > 0) {
          var stud0 = (d0.students || 0) / pop0;
          var sen0 = (d0.seniors || 0) / pop0;
          var sick0 = (d0.sick || 0) / pop0;
          if (stud0 >= 0.25) { nm.nightlife *= 1.04; nm.culturalActivity *= 1.03; }
          if (sen0 >= 0.25) { nm.communityEngagement *= 1.04; nm.nightlife *= 0.97; }
          if (sick0 >= 0.10) { nm.publicSpaces *= 0.95; nm.sentiment -= 0.04; }
        }
      }

      // Economy micro
      var e0 = neighborhoodEconomies[nhood];
      if (e0 && e0.mood !== undefined) {
        if (e0.mood >= 70) { nm.retail *= 1.03; nm.sentiment += 0.02; }
        else if (e0.mood <= 30) { nm.retail *= 0.95; nm.sentiment -= 0.04; }
      }

      // Neighborhood-specific crime
      var nhCrime = safeNum_(crimeByNeighborhood[nhood], 0);
      if (nhCrime >= 2) { nm.nightlife *= 0.90; nm.sentiment -= 0.08; }
      else if (nhCrime >= 1) { nm.nightlife *= 0.96; nm.sentiment -= 0.03; }

      // Clamp
      nm.traffic = clampMult(nm.traffic);
      nm.retail = clampMult(nm.retail);
      nm.tourism = clampMult(nm.tourism);
      nm.nightlife = clampMult(nm.nightlife);
      nm.publicSpaces = clampMult(nm.publicSpaces);
      nm.sentiment = clampSent(nm.sentiment);
      nm.culturalActivity = clampMult(nm.culturalActivity);
      nm.communityEngagement = clampMult(nm.communityEngagement);

      neighborhoodDynamics[nhood] = nm;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CAPACITY CONSTRAINTS (per-cluster friction)
  // ─────────────────────────────────────────────────────────────────────────
  function maxAcrossClusters_(key) {
    var mx = 0;
    for (var k in clusterDynamics) {
      if (!clusterDynamics.hasOwnProperty(k)) continue;
      mx = Math.max(mx, safeNum_(clusterDynamics[k][key], 0));
    }
    return mx;
  }

  var peakTraffic = maxAcrossClusters_('traffic');
  var peakNightlife = maxAcrossClusters_('nightlife');
  var peakTourism = maxAcrossClusters_('tourism');

  var transitDemand = (peakTraffic + peakNightlife) / 2;
  var venueDemand = peakNightlife;
  var roadDemand = peakTraffic;

  var transitCongestion = clamp((transitDemand - capacity.transitCapacity) * 0.38, 0, 0.38);
  var venueCongestion = clamp((venueDemand - capacity.venueCapacity) * 0.32, 0, 0.32);
  var roadCongestion = clamp((roadDemand - capacity.roadCapacity) * 0.32, 0, 0.32);

  if ((transitCongestion + roadCongestion) >= 0.28) {
    lag.congestionHangover = clamp(lag.congestionHangover + 0.08, 0, 0.4);
  }

  // Apply per-cluster capacity friction
  for (var cn3 in clusterDynamics) {
    if (!clusterDynamics.hasOwnProperty(cn3)) continue;
    var sensitivity = CLUSTERS[cn3] ? (CLUSTERS[cn3].capacitySensitivity || 1.0) : 1.0;
    var cong = (transitCongestion + venueCongestion + roadCongestion + lag.congestionHangover) * sensitivity;
    cong = clamp(cong, 0, 0.6);

    var cm = clusterDynamics[cn3];
    cm.traffic *= (1 - clamp(cong * 0.20, 0, 0.20));
    cm.nightlife *= (1 - clamp(cong * 0.12, 0, 0.12));
    cm.tourism *= (1 - clamp(cong * 0.10, 0, 0.10));
    cm.publicSpaces *= (1 - clamp(cong * 0.08, 0, 0.08));
    cm.sentiment -= clamp(cong * 0.12, 0, 0.12);

    // Re-clamp
    cm.traffic = clampMult(cm.traffic);
    cm.nightlife = clampMult(cm.nightlife);
    cm.tourism = clampMult(cm.tourism);
    cm.publicSpaces = clampMult(cm.publicSpaces);
    cm.sentiment = clampSent(cm.sentiment);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AGGREGATE CITY FROM CLUSTERS
  // ─────────────────────────────────────────────────────────────────────────
  function weightedAvg_(key) {
    var sum = 0;
    var wsum = 0;
    for (var k in clusterDynamics) {
      if (!clusterDynamics.hasOwnProperty(k)) continue;
      var w = safeNum_(clusterWeights[k], 0.2);
      sum += safeNum_(clusterDynamics[k][key], 0) * w;
      wsum += w;
    }
    return wsum <= 0 ? 1 : (sum / wsum);
  }

  function weightedSent_(key) {
    var sum = 0;
    var wsum = 0;
    for (var k in clusterDynamics) {
      if (!clusterDynamics.hasOwnProperty(k)) continue;
      var w = safeNum_(clusterWeights[k], 0.2);
      sum += safeNum_(clusterDynamics[k][key], 0) * w;
      wsum += w;
    }
    return wsum <= 0 ? 0 : (sum / wsum);
  }

  var rawCity = {
    traffic: weightedAvg_('traffic'),
    retail: weightedAvg_('retail'),
    tourism: weightedAvg_('tourism'),
    nightlife: weightedAvg_('nightlife'),
    publicSpaces: weightedAvg_('publicSpaces'),
    sentiment: weightedSent_('sentiment'),
    culturalActivity: weightedAvg_('culturalActivity'),
    communityEngagement: weightedAvg_('communityEngagement')
  };

  rawCity.traffic = clampMult(rawCity.traffic);
  rawCity.retail = clampMult(rawCity.retail);
  rawCity.tourism = clampMult(rawCity.tourism);
  rawCity.nightlife = clampMult(rawCity.nightlife);
  rawCity.publicSpaces = clampMult(rawCity.publicSpaces);
  rawCity.sentiment = clampSent(rawCity.sentiment);
  rawCity.culturalActivity = clampMult(rawCity.culturalActivity);
  rawCity.communityEngagement = clampMult(rawCity.communityEngagement);

  // ─────────────────────────────────────────────────────────────────────────
  // MOMENTUM SMOOTHING
  // ─────────────────────────────────────────────────────────────────────────
  if (S.resetDynamicsMomentum) {
    S.previousCityDynamics = null;
    S.previousClusterDynamics = null;
    S.previousNeighborhoodDynamics = null;
    S.resetDynamicsMomentum = false;
  }

  var prev = S.previousCityDynamics || null;
  var finalCity = {};

  for (var mk in rawCity) {
    if (!rawCity.hasOwnProperty(mk)) continue;
    var mf = getMomentumFactor(mk, S);
    finalCity[mk] = blend(prev ? prev[mk] : null, rawCity[mk], mf);
  }

  finalCity.traffic = clampMult(finalCity.traffic);
  finalCity.retail = clampMult(finalCity.retail);
  finalCity.tourism = clampMult(finalCity.tourism);
  finalCity.nightlife = clampMult(finalCity.nightlife);
  finalCity.publicSpaces = clampMult(finalCity.publicSpaces);
  finalCity.sentiment = clampSent(finalCity.sentiment);
  finalCity.culturalActivity = clampMult(finalCity.culturalActivity);
  finalCity.communityEngagement = clampMult(finalCity.communityEngagement);

  // ─────────────────────────────────────────────────────────────────────────
  // OUTPUT
  // ─────────────────────────────────────────────────────────────────────────
  S.cityDynamics = {
    traffic: round2(finalCity.traffic),
    retail: round2(finalCity.retail),
    tourism: round2(finalCity.tourism),
    nightlife: round2(finalCity.nightlife),
    publicSpaces: round2(finalCity.publicSpaces),
    sentiment: round2(finalCity.sentiment),
    culturalActivity: round2(finalCity.culturalActivity),
    communityEngagement: round2(finalCity.communityEngagement)
  };

  S.previousCityDynamics = copyObj_(S.cityDynamics);

  // Additive outputs
  S.clusterDynamics = clusterDynamics;
  S.neighborhoodDynamics = neighborhoodDynamics;
  S.cityDynamicsLag = lag;
  S.cityDynamicsCapacity = {
    transitCapacity: capacity.transitCapacity,
    venueCapacity: capacity.venueCapacity,
    roadCapacity: capacity.roadCapacity,
    peakTraffic: round2(peakTraffic),
    peakNightlife: round2(peakNightlife),
    peakTourism: round2(peakTourism),
    transitCongestion: round2(transitCongestion),
    venueCongestion: round2(venueCongestion),
    roadCongestion: round2(roadCongestion),
    congestionHangover: round2(lag.congestionHangover)
  };

  S.activityObservations.latest = obs;
  S.activityObservations.rolling = {
    events: round2(obsAvg.events),
    storySeedCount: round2(obsAvg.storySeedCount),
    media: round2(obsAvg.media),
    crime: round2(obsAvg.crime),
    shockCount: round2(obsAvg.shockCount)
  };

  // Legacy alias
  ctx.summary.cityDynamics = S.cityDynamics;
  ctx.summary = S;
}

/**
 * ============================================================================
 * getNeighborhoodDynamics_(ctx, neighborhood) (ES5)
 * ============================================================================
 * Safe accessor with fallback to city dynamics.
 * ============================================================================
 */
function getNeighborhoodDynamics_(ctx, neighborhood) {
  var S = ctx && ctx.summary;
  if (!S) return {
    traffic: 1, retail: 1, tourism: 1, nightlife: 1,
    publicSpaces: 1, sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };

  var city = S.cityDynamics || {
    traffic: 1, retail: 1, tourism: 1, nightlife: 1,
    publicSpaces: 1, sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };

  if (!neighborhood) return city;

  var nd = S.neighborhoodDynamics && S.neighborhoodDynamics[neighborhood];
  if (nd) return nd;

  return city;
}

/**
 * ============================================================================
 * getClusterDynamics_(ctx, clusterName) (ES5)
 * ============================================================================
 * Safe accessor with fallback to city dynamics.
 * ============================================================================
 */
function getClusterDynamics_(ctx, clusterName) {
  var S = ctx && ctx.summary;
  if (!S) return {
    traffic: 1, retail: 1, tourism: 1, nightlife: 1,
    publicSpaces: 1, sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };

  var city = S.cityDynamics || {
    traffic: 1, retail: 1, tourism: 1, nightlife: 1,
    publicSpaces: 1, sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };

  if (!clusterName) return city;

  var cd = S.clusterDynamics && S.clusterDynamics[String(clusterName)];
  if (cd) return cd;

  return city;
}

/**
 * ============================================================================
 * CITY DYNAMICS REFERENCE v2.6
 * ============================================================================
 *
 * v2.6 Changes:
 * - Cluster-based dynamics (5 clusters: DOWNTOWN_CORE, WATERFRONT_WEST,
 *   LAKE_CORRIDOR, NORTH_HILLS, EAST_OAKLAND)
 * - getClusterDynamics_(ctx, clusterName) + getNeighborhoodDynamics_(ctx, neighborhood)
 * - S.clusterDefinitions exposed for downstream enumeration
 * - Weather v3.5 integration (precipitationIntensity, windSpeed, visibility, front)
 * - CalendarContext-aware seed weighting (First Friday, Creation Day, sports, holidays)
 * - Lag system (tourismDrag, publicSpaceDrag, nightlifeDrag, congestionHangover)
 * - Per-cluster capacity friction (Downtown feels congestion most)
 * - Ripple effects:
 *   - Sentiment bleed between adjacent clusters
 *   - Crime spillover dampens nightlife/tourism in affected clusters
 *   - Weather fronts target specific clusters (MARINE → Waterfront, etc.)
 *   - Sports postseason boosts traffic corridors to venues
 *   - First Friday arts corridor boost (DOWNTOWN_CORE epicenter)
 *
 * Preserved:
 * - S.cityDynamics schema unchanged (traffic, retail, tourism, nightlife,
 *   publicSpaces, sentiment, culturalActivity, communityEngagement)
 * - Momentum smoothing from v2.3
 * - Demographics integration from v2.5
 * - Holiday modifiers (v2.5 values preserved, not softened)
 *
 * ============================================================================
 */
