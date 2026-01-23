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

  const S = ctx.summary;
  if (!S) return;

  // Helper for rounding
  const r2 = v => Math.round((v || 0) * 100) / 100;

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE CYCLE INFO (v2.3: safer alignment)
  // ═══════════════════════════════════════════════════════════════════════════
  const cycle = S.cycleId || S.cycle || (ctx.config && ctx.config.cycleCount) || 0;
  const events = S.eventsGenerated || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOVERY + COOLDOWN SIGNALS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  const recoveryLevel = S.recoveryLevel || 'none';
  const overloadScore = S.overloadScore || 0;
  const cooldowns = S.domainCooldowns || {};
  const activeCooldownCount = Object.values(cooldowns).filter(v => v > 0).length;

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSIFICATION SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════
  const weight = S.cycleWeight || "low-signal";
  const weightScore = S.cycleWeightScore || 0;
  const load = S.civicLoad || "stable";
  const loadScore = S.civicLoadScore || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN/SHOCK
  // ═══════════════════════════════════════════════════════════════════════════
  const pattern = S.patternFlag || "none";
  const shock = S.shockFlag || "none";

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";
  const season = S.season || "Spring";

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD EVENTS (v2.3: filter to current cycle only)
  // ═══════════════════════════════════════════════════════════════════════════
  const allWorldEvents = S.worldEvents || [];
  const worldEvents = allWorldEvents.filter(e => {
    const evCycle = (typeof e.cycle === 'number') ? e.cycle : cycle;
    return evCycle === cycle;
  });
  const chaosCount = worldEvents.length;
  const highSev = worldEvents.filter(e => {
    const sev = (e.severity || '').toString().toLowerCase();
    return sev === 'high' || sev === 'major' || sev === 'critical';
  }).length;

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER
  // ═══════════════════════════════════════════════════════════════════════════
  const weather = S.weather || {};
  const weatherImpact = r2(weather.impact || 1);
  const weatherType = weather.type || 'clear';
  const weatherMood = S.weatherMood || {};
  const comfort = r2(weatherMood.comfortIndex || 0.5);

  // ═══════════════════════════════════════════════════════════════════════════
  // CITY DYNAMICS
  // ═══════════════════════════════════════════════════════════════════════════
  const dynamics = S.cityDynamics || {};
  const sentiment = r2(dynamics.sentiment || 0);
  const culturalActivity = r2(dynamics.culturalActivity || 1);
  const communityEngagement = r2(dynamics.communityEngagement || 1);

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC
  // ═══════════════════════════════════════════════════════════════════════════
  const econMood = S.economicMood || 50;
  const econRipples = (S.economicRipples || []).length;

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA
  // ═══════════════════════════════════════════════════════════════════════════
  const mediaEffects = S.mediaEffects || {};
  const mediaIntensity = mediaEffects.coverageIntensity || 'minimal';
  const crisisSat = r2(mediaEffects.crisisSaturation || 0);

  // ═══════════════════════════════════════════════════════════════════════════
  // ARCS
  // ═══════════════════════════════════════════════════════════════════════════
  const arcs = S.eventArcs || [];
  const activeArcs = arcs.filter(a => a && a.phase !== 'resolved').length;
  const peakArcs = arcs.filter(a => a && a.phase === 'peak').length;

  // ═══════════════════════════════════════════════════════════════════════════
  // STORY CONTENT
  // ═══════════════════════════════════════════════════════════════════════════
  const seeds = S.storySeeds ? S.storySeeds.length : 0;
  const hooks = S.storyHooks ? S.storyHooks.length : 0;
  const spotlights = S.namedSpotlights ? S.namedSpotlights.length : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // BONDS
  // ═══════════════════════════════════════════════════════════════════════════
  const bonds = S.newBonds || [];
  const bondCount = bonds.length;

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMOGRAPHICS
  // ═══════════════════════════════════════════════════════════════════════════
  const demo = S.demographicDrift || {};
  const migration = demo.migration || 0;
  const economy = demo.economy || 'stable';

  // ═══════════════════════════════════════════════════════════════════════════
  // CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  const newCitizens = S.citizensGenerated || 0;
  const promotions = S.promotionsCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD COMPRESSED SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  
  // v2.2: Build calendar indicator
  let calendarTag = "";
  if (holiday !== "none") {
    // Abbreviate holiday name
    const holidayAbbrev = {
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
  let sportsTag = "";
  if (sportsSeason === "championship") sportsTag = "CHAMP";
  else if (sportsSeason === "playoffs") sportsTag = "PLYF";
  else if (sportsSeason === "post-season") sportsTag = "POST";
  else if (sportsSeason === "late-season") sportsTag = "LATE";

  const parts = [
    `C${cycle}`,
    `ev:${events}`,
    `wt:${weight}(${weightScore})`,
    `load:${load}(${loadScore})`,
    `patt:${pattern}`,
    shock !== 'none' ? `SHOCK` : null,

    // v2.3: Recovery/cooldown indicators
    recoveryLevel !== 'none' ? `rec:${recoveryLevel}(${overloadScore})` : null,
    activeCooldownCount > 0 ? `cd:${activeCooldownCount}` : null,

    // v2.2: Calendar indicators
    `ssn:${season.substring(0, 2)}`,
    calendarTag ? `hol:${calendarTag}` : null,
    isFirstFriday ? `FF` : null,
    isCreationDay ? `CD` : null,
    sportsTag ? `spt:${sportsTag}` : null,
    
    `chaos:${chaosCount}${highSev > 0 ? '!' + highSev : ''}`,
    `wx:${weatherType}(${weatherImpact})`,
    `comfort:${comfort}`,
    `sent:${sentiment}`,
    
    // v2.2: Cultural/community indicators (only if notable)
    culturalActivity >= 1.3 ? `cult:${culturalActivity}` : null,
    communityEngagement >= 1.3 ? `comm:${communityEngagement}` : null,
    
    `econ:${econMood}(${econRipples}r)`,
    `media:${mediaIntensity}`,
    crisisSat >= 0.5 ? `crisis:${crisisSat}` : null,
    activeArcs > 0 ? `arcs:${activeArcs}${peakArcs > 0 ? 'p' + peakArcs : ''}` : null,
    `seeds:${seeds}`,
    hooks > 0 ? `hooks:${hooks}` : null,
    spotlights > 0 ? `spot:${spotlights}` : null,
    bondCount > 0 ? `bonds:${bondCount}` : null,
    Math.abs(migration) >= 20 ? `mig:${migration}` : null,
    newCitizens > 0 ? `new:${newCitizens}` : null,
    promotions > 0 ? `promo:${promotions}` : null
  ].filter(Boolean);

  const summary = parts.join(' | ');

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