/**
 * ============================================================================
 * applyCompressedDigestSummary_ v2.3
 * ============================================================================
 *
 * Builds a compressed single-line summary of cycle state.
 * Uses ctx.summary for all inputs (no sheet reads).
 * Includes all major system outputs.
 *
 * v2.3 Enhancements:
 * - Recovery/cooldown signals (recoveryLevel, overloadScore, activeCooldowns)
 * - Safer cycle field alignment
 * - Filters worldEvents to current cycle only
 *
 * v2.2 Enhancements:
 * - GodWorld Calendar integration (holidays, First Friday, Creation Day)
 * - Sports season indicator
 * - Cultural activity and community engagement
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - All major system outputs
 * - Compressed single-line format
 * - Structured cycleSummary object
 *
 * ============================================================================
 */

function applyCompressedDigestSummary_(ctx) {

  var S = ctx.summary;
  if (!S) return;

  // Helper for rounding
  function r2(v) { return Math.round((v || 0) * 100) / 100; }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE CYCLE INFO (v2.3: safer alignment)
  // ═══════════════════════════════════════════════════════════════════════════
  var cycle = S.cycleId || S.cycle || (ctx.config && ctx.config.cycleCount) || 0;
  var events = S.eventsGenerated || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOVERY + COOLDOWN SIGNALS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var recoveryLevel = S.recoveryLevel || 'none';
  var overloadScore = S.overloadScore || 0;
  var cooldowns = S.domainCooldowns || {};
  var cooldownKeys = Object.keys(cooldowns);
  var activeCooldownCount = 0;
  for (var cdIdx = 0; cdIdx < cooldownKeys.length; cdIdx++) {
    if (cooldowns[cooldownKeys[cdIdx]] > 0) activeCooldownCount++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSIFICATION SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════
  var weight = S.cycleWeight || "low-signal";
  var weightScore = S.cycleWeightScore || 0;
  var load = S.civicLoad || "stable";
  var loadScore = S.civicLoadScore || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN/SHOCK
  // ═══════════════════════════════════════════════════════════════════════════
  var pattern = S.patternFlag || "none";
  var shock = S.shockFlag || "none";

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";
  var season = S.season || "Spring";

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD EVENTS (v2.3: filter to current cycle only)
  // ═══════════════════════════════════════════════════════════════════════════
  var allWorldEvents = S.worldEvents || [];
  var worldEvents = [];
  for (var weIdx = 0; weIdx < allWorldEvents.length; weIdx++) {
    var e = allWorldEvents[weIdx];
    var evCycle = (typeof e.cycle === 'number') ? e.cycle : cycle;
    if (evCycle === cycle) worldEvents.push(e);
  }
  var chaosCount = worldEvents.length;
  var highSev = 0;
  for (var hsIdx = 0; hsIdx < worldEvents.length; hsIdx++) {
    var sevE = worldEvents[hsIdx];
    var sev = (sevE.severity || '').toString().toLowerCase();
    if (sev === 'high' || sev === 'major' || sev === 'critical') highSev++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER
  // ═══════════════════════════════════════════════════════════════════════════
  var weather = S.weather || {};
  var weatherImpact = r2(weather.impact || 1);
  var weatherType = weather.type || 'clear';
  var weatherMood = S.weatherMood || {};
  var comfort = r2(weatherMood.comfortIndex || 0.5);

  // ═══════════════════════════════════════════════════════════════════════════
  // CITY DYNAMICS
  // ═══════════════════════════════════════════════════════════════════════════
  var dynamics = S.cityDynamics || {};
  var sentiment = r2(dynamics.sentiment || 0);
  var culturalActivity = r2(dynamics.culturalActivity || 1);
  var communityEngagement = r2(dynamics.communityEngagement || 1);

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC
  // ═══════════════════════════════════════════════════════════════════════════
  var econMood = S.economicMood || 50;
  var econRipples = (S.economicRipples || []).length;

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA
  // ═══════════════════════════════════════════════════════════════════════════
  var mediaEffects = S.mediaEffects || {};
  var mediaIntensity = mediaEffects.coverageIntensity || 'minimal';
  var crisisSat = r2(mediaEffects.crisisSaturation || 0);

  // ═══════════════════════════════════════════════════════════════════════════
  // ARCS
  // ═══════════════════════════════════════════════════════════════════════════
  var arcs = S.eventArcs || [];
  var activeArcs = 0;
  var peakArcs = 0;
  for (var arcIdx = 0; arcIdx < arcs.length; arcIdx++) {
    var a = arcs[arcIdx];
    if (a && a.phase !== 'resolved') activeArcs++;
    if (a && a.phase === 'peak') peakArcs++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STORY CONTENT
  // ═══════════════════════════════════════════════════════════════════════════
  var seeds = S.storySeeds ? S.storySeeds.length : 0;
  var hooks = S.storyHooks ? S.storyHooks.length : 0;
  var spotlights = S.namedSpotlights ? S.namedSpotlights.length : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // BONDS
  // ═══════════════════════════════════════════════════════════════════════════
  var bonds = S.newBonds || [];
  var bondCount = bonds.length;

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMOGRAPHICS
  // ═══════════════════════════════════════════════════════════════════════════
  var demo = S.demographicDrift || {};
  var migration = demo.migration || 0;
  var economy = demo.economy || 'stable';

  // ═══════════════════════════════════════════════════════════════════════════
  // CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  var newCitizens = S.citizensGenerated || 0;
  var promotions = S.promotionsCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD COMPRESSED SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  // v2.2: Build calendar indicator
  var calendarTag = "";
  if (holiday !== "none") {
    // Abbreviate holiday name
    var holidayAbbrev = {
      "Thanksgiving": "TG",
      "Holiday": "HOL",
      "NewYear": "NY",
      "NewYearsEve": "NYE",
      "Independence": "IND",
      "MLKDay": "MLK",
      "PresidentsDay": "PRES",
      "Valentine": "VAL",
      "Easter": "ESTR",
      "MemorialDay": "MEM",
      "Juneteenth": "JUN",
      "LaborDay": "LAB",
      "Halloween": "HWEEN",
      "VeteransDay": "VET",
      "CincoDeMayo": "C5M",
      "DiaDeMuertos": "DDM",
      "LunarNewYear": "LNY",
      "OpeningDay": "OPN",
      "OaklandPride": "PRDE",
      "BlackFriday": "BFRI",
      "StPatricksDay": "STPAT",
      "MothersDay": "MOM",
      "FathersDay": "DAD",
      "EarthDay": "ERTH",
      "ArtSoulFestival": "A&S"
    };
    calendarTag = holidayAbbrev[holiday] || holiday.substring(0, 4).toUpperCase();
  }

  // v2.2: Build sports tag
  var sportsTag = "";
  if (sportsSeason === "championship") sportsTag = "CHAMP";
  else if (sportsSeason === "playoffs") sportsTag = "PLYF";
  else if (sportsSeason === "post-season") sportsTag = "POST";
  else if (sportsSeason === "late-season") sportsTag = "LATE";

  var parts = [
    "C" + cycle,
    "ev:" + events,
    "wt:" + weight + "(" + weightScore + ")",
    "load:" + load + "(" + loadScore + ")",
    "patt:" + pattern,
    shock !== 'none' ? "SHOCK" : null,

    // v2.3: Recovery/cooldown indicators
    recoveryLevel !== 'none' ? "rec:" + recoveryLevel + "(" + overloadScore + ")" : null,
    activeCooldownCount > 0 ? "cd:" + activeCooldownCount : null,

    // v2.2: Calendar indicators
    "ssn:" + season.substring(0, 2),
    calendarTag ? "hol:" + calendarTag : null,
    isFirstFriday ? "FF" : null,
    isCreationDay ? "CD" : null,
    sportsTag ? "spt:" + sportsTag : null,

    "chaos:" + chaosCount + (highSev > 0 ? '!' + highSev : ''),
    "wx:" + weatherType + "(" + weatherImpact + ")",
    "comfort:" + comfort,
    "sent:" + sentiment,

    // v2.2: Cultural/community indicators (only if notable)
    culturalActivity >= 1.3 ? "cult:" + culturalActivity : null,
    communityEngagement >= 1.3 ? "comm:" + communityEngagement : null,

    "econ:" + econMood + "(" + econRipples + "r)",
    "media:" + mediaIntensity,
    crisisSat >= 0.5 ? "crisis:" + crisisSat : null,
    activeArcs > 0 ? "arcs:" + activeArcs + (peakArcs > 0 ? 'p' + peakArcs : '') : null,
    "seeds:" + seeds,
    hooks > 0 ? "hooks:" + hooks : null,
    spotlights > 0 ? "spot:" + spotlights : null,
    bondCount > 0 ? "bonds:" + bondCount : null,
    Math.abs(migration) >= 20 ? "mig:" + migration : null,
    newCitizens > 0 ? "new:" + newCitizens : null,
    promotions > 0 ? "promo:" + promotions : null
  ];

  // Filter out null values (ES5 compatible)
  var filteredParts = [];
  for (var pIdx = 0; pIdx < parts.length; pIdx++) {
    if (parts[pIdx]) filteredParts.push(parts[pIdx]);
  }

  var summary = filteredParts.join(' | ');

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  S.compressedLine = summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURED VERSION (v2.2 - expanded)
  // ═══════════════════════════════════════════════════════════════════════════
  S.cycleSummary = {
    // Core
    cycle: cycle,
    events: events,
    
    // Classification
    weight: weight,
    weightScore: weightScore,
    load: load,
    loadScore: loadScore,
    pattern: pattern,
    shock: shock,

    // Recovery/Cooldown (v2.3)
    recoveryLevel: recoveryLevel,
    overloadScore: overloadScore,
    activeCooldownCount: activeCooldownCount,

    // Calendar (v2.2)
    season: season,
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    
    // World events
    chaosCount: chaosCount,
    highSeverity: highSev,
    
    // Weather
    weather: weatherType,
    weatherImpact: weatherImpact,
    comfort: comfort,
    
    // City dynamics
    sentiment: sentiment,
    culturalActivity: culturalActivity,
    communityEngagement: communityEngagement,
    
    // Economic
    econMood: econMood,
    econRipples: econRipples,
    
    // Media
    mediaIntensity: mediaIntensity,
    crisisSaturation: crisisSat,
    
    // Arcs
    activeArcs: activeArcs,
    peakArcs: peakArcs,
    
    // Story
    seeds: seeds,
    hooks: hooks,
    spotlights: spotlights,
    
    // Bonds
    bonds: bondCount,
    
    // Demographics
    migration: migration,
    economy: economy,
    newCitizens: newCitizens,
    promotions: promotions
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * COMPRESSED DIGEST SUMMARY REFERENCE
 * ============================================================================
 * 
 * COMPRESSED LINE FORMAT:
 *
 * C{cycle} | ev:{events} | wt:{weight}({score}) | load:{load}({score}) |
 * patt:{pattern} | [SHOCK] | [rec:{level}({overload})] | [cd:{count}] |
 * ssn:{season} | [hol:{holiday}] | [FF] | [CD] |
 * [spt:{sports}] | chaos:{count}[!{high}] | wx:{type}({impact}) |
 * comfort:{value} | sent:{sentiment} | [cult:{activity}] | [comm:{engagement}] |
 * econ:{mood}({ripples}r) | media:{intensity} | [crisis:{saturation}] |
 * [arcs:{active}[p{peak}]] | seeds:{count} | [hooks:{count}] | [spot:{count}] |
 * [bonds:{count}] | [mig:{value}] | [new:{count}] | [promo:{count}]
 * 
 * RECOVERY/COOLDOWN INDICATORS (v2.3):
 *
 * rec: Recovery level with overload score (shown if not 'none')
 *   - Format: rec:{level}({overloadScore})
 *   - Levels: mild, moderate, heavy
 *   - Example: rec:moderate(3.5)
 *
 * cd: Active cooldown count (shown if > 0)
 *   - Number of domains currently suppressed
 *   - Example: cd:4
 *
 * CALENDAR INDICATORS (v2.2):
 *
 * ssn: Season abbreviation (Sp, Su, Fa, Wi)
 * 
 * hol: Holiday abbreviation
 * - TG (Thanksgiving), HOL (Holiday), NY (NewYear), NYE (NewYearsEve)
 * - IND (Independence), MLK (MLKDay), PRES (PresidentsDay)
 * - VAL (Valentine), ESTR (Easter), MEM (MemorialDay)
 * - JUN (Juneteenth), LAB (LaborDay), HWEEN (Halloween)
 * - VET (VeteransDay), C5M (CincoDeMayo), DDM (DiaDeMuertos)
 * - LNY (LunarNewYear), OPN (OpeningDay), PRDE (OaklandPride)
 * - BFRI (BlackFriday), STPAT (StPatricksDay), MOM (MothersDay)
 * - DAD (FathersDay), ERTH (EarthDay), A&S (ArtSoulFestival)
 * 
 * FF: First Friday (shown if true)
 * CD: Creation Day (shown if true)
 * 
 * spt: Sports season
 * - CHAMP (championship), PLYF (playoffs), POST (post-season), LATE (late-season)
 * 
 * cult: Cultural activity (shown if ≥1.3)
 * comm: Community engagement (shown if ≥1.3)
 * 
 * STRUCTURED OUTPUT (cycleSummary):
 * - All fields from compressed line
 * - Full holiday name and priority
 * - Boolean flags for First Friday and Creation Day
 * - Numeric values without abbreviation
 * - v2.3: recoveryLevel, overloadScore, activeCooldownCount
 * 
 * ============================================================================
 */