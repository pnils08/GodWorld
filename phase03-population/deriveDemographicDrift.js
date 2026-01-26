/**
 * ============================================================================
 * deriveDemographicDrift_ v3.2
 * ============================================================================
 *
 * Uses V2.5 + V3 signals plus calendar context to produce drift markers.
 *
 * v3.2 Enhancements:
 * - Holiday-specific drift factors (festivals attract visitors)
 * - First Friday arts district patterns
 * - Sports season visitor patterns
 * - Creation Day local pride signals
 * - Calendar context in output
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v3.1):
 * - Nightlife/youth inflow
 * - Cultural activity/artist inflow
 * - Crime/safety family outflow
 * - Economic mood/professional patterns
 * - Weather comfort/retiree patterns
 * 
 * ============================================================================
 */

function deriveDemographicDrift_(ctx) {

  var S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTING SIGNALS (preserved from v3.1)
  // ═══════════════════════════════════════════════════════════════════════════
  var nightlife = S.nightlifeVolume || 0;
  var events = S.worldEvents || [];
  var crime = 0;
  var safety = 0;
  for (var ei = 0; ei < events.length; ei++) {
    var ev = events[ei];
    if (ev.domain && ev.domain.toLowerCase() === 'crime') crime++;
    if (ev.domain && ev.domain.toLowerCase() === 'safety') safety++;
  }
  var dynamics = S.cityDynamics || {};
  var sentiment = dynamics.sentiment || 0;
  var civicLoad = S.civicLoad || 'stable';
  var civicLoadScore = S.civicLoadScore || 0;
  var econMood = S.economicMood || 50;
  var weatherMood = S.weatherMood || {};

  var hooks = S.storyHooks ? S.storyHooks.length : 0;
  var textures = S.textureTriggers ? S.textureTriggers.length : 0;
  var arcsCount = 0;
  if (S.eventArcs) {
    for (var ai = 0; ai < S.eventArcs.length; ai++) {
      var a = S.eventArcs[ai];
      if (a && a.phase !== 'resolved') arcsCount++;
    }
  }
  var arcs = arcsCount;

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // Derived signals
  var culturePulse = hooks + arcs;
  var instability = S.shockFlag === 'shock-flag' ? 1 : 0;

  // Build drift factors (accumulate instead of overwrite)
  var driftFactors = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: HOLIDAY-SPECIFIC DRIFT FACTORS
  // ═══════════════════════════════════════════════════════════════════════════

  // Major Oakland festivals → visitor surge
  if (holiday === 'OaklandPride') {
    driftFactors.push("Festival visitors (Pride celebration)");
    driftFactors.push("LGBTQ+ community inflow (Pride weekend)");
  }
  if (holiday === 'ArtSoulFestival') {
    driftFactors.push("Festival visitors (Art & Soul)");
    driftFactors.push("Cultural tourists (Oakland festival)");
  }

  // Cultural holidays → community-specific visitors
  if (holiday === 'LunarNewYear') {
    driftFactors.push("Cultural tourists (Lunar New Year)");
    driftFactors.push("Family inflow (holiday gathering)");
  }
  if (holiday === 'CincoDeMayo') {
    driftFactors.push("Festival visitors (Cinco de Mayo)");
    driftFactors.push("Cultural tourists (Fruitvale celebration)");
  }
  if (holiday === 'DiaDeMuertos') {
    driftFactors.push("Cultural visitors (Día de los Muertos)");
    driftFactors.push("Family inflow (honoring ancestors)");
  }
  if (holiday === 'Juneteenth') {
    driftFactors.push("Community gathering (Juneteenth)");
    driftFactors.push("Cultural visitors (freedom celebration)");
  }

  // Family holidays → family inflow, less transients
  if (holiday === 'Thanksgiving') {
    driftFactors.push("Family inflow (Thanksgiving gathering)");
    driftFactors.push("Transient outflow (holiday pause)");
  }
  if (holiday === 'Holiday') {
    driftFactors.push("Family inflow (winter holidays)");
    driftFactors.push("Shopper surge (holiday retail)");
  }
  if (holiday === 'Easter') {
    driftFactors.push("Family inflow (Easter gathering)");
  }
  if (holiday === 'MothersDay' || holiday === 'FathersDay') {
    driftFactors.push("Family inflow (family celebration)");
  }

  // Party holidays → young adult surge
  if (holiday === 'NewYearsEve') {
    driftFactors.push("Party crowd inflow (New Year celebration)");
    driftFactors.push("Youth surge (countdown events)");
  }
  if (holiday === 'StPatricksDay') {
    driftFactors.push("Bar crowd inflow (St. Patrick's Day)");
    driftFactors.push("Youth surge (pub crawl energy)");
  }
  if (holiday === 'Halloween') {
    driftFactors.push("Party visitors (Halloween events)");
    driftFactors.push("Family inflow (trick-or-treat)");
  }

  // Patriotic holidays → mixed patterns
  if (holiday === 'Independence') {
    driftFactors.push("Family inflow (July 4th gathering)");
    driftFactors.push("Visitor surge (fireworks viewing)");
  }
  if (holiday === 'MemorialDay' || holiday === 'VeteransDay') {
    driftFactors.push("Veteran community gathering");
    driftFactors.push("Family inflow (memorial observance)");
  }
  if (holiday === 'MLKDay') {
    driftFactors.push("Community gathering (MLK observance)");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: FIRST FRIDAY DRIFT
  // ═══════════════════════════════════════════════════════════════════════════
  if (isFirstFriday) {
    driftFactors.push("Arts crowd inflow (First Friday)");
    driftFactors.push("Creative community gathering");
    if (nightlife >= 5) {
      driftFactors.push("Youth surge (First Friday nightlife)");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: CREATION DAY DRIFT
  // ═══════════════════════════════════════════════════════════════════════════
  if (isCreationDay) {
    driftFactors.push("Local pride (Creation Day)");
    driftFactors.push("Oakland native gathering (heritage celebration)");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: SPORTS SEASON DRIFT
  // ═══════════════════════════════════════════════════════════════════════════
  if (sportsSeason === 'championship') {
    driftFactors.push("Sports fans surge (championship fever)");
    driftFactors.push("Regional visitor inflow (championship games)");
    driftFactors.push("Party crowd (victory celebrations)");
  } else if (sportsSeason === 'playoffs') {
    driftFactors.push("Sports fans inflow (playoff energy)");
    driftFactors.push("Watch party crowds (playoff games)");
  } else if (sportsSeason === 'late-season') {
    driftFactors.push("Sports interest (pennant race)");
  }

  if (holiday === 'OpeningDay') {
    driftFactors.push("Baseball fans surge (Opening Day)");
    driftFactors.push("Sports visitors (season opener)");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTING DRIFT FACTORS (preserved from v3.1)
  // ═══════════════════════════════════════════════════════════════════════════

  // Helper to check if any factor includes a term
  function factorsInclude(term) {
    for (var fi = 0; fi < driftFactors.length; fi++) {
      if (driftFactors[fi].indexOf(term) >= 0) return true;
    }
    return false;
  }

  // Nightlife attracts youth (only if not already covered by holiday)
  if (nightlife >= 7 && !factorsInclude('Youth')) {
    driftFactors.push("Youth inflow (strong nightlife)");
  } else if (nightlife >= 5 && !factorsInclude('Youth')) {
    driftFactors.push("Youth interest (active nightlife)");
  }

  // Cultural activity attracts artists (only if not already covered)
  if (culturePulse >= 5 && !factorsInclude('Artist') && !factorsInclude('Arts') && !factorsInclude('Creative')) {
    driftFactors.push("Artist inflow (high cultural activity)");
  } else if (culturePulse >= 3 && !factorsInclude('Artist') && !factorsInclude('Creative')) {
    driftFactors.push("Creative interest (cultural pulse)");
  }

  // Crime/safety drives family outflow
  if (crime >= 4 || safety >= 3) {
    driftFactors.push("Family outflow (safety concerns)");
  } else if (crime >= 2) {
    driftFactors.push("Family caution (crime awareness)");
  }

  // Sentiment affects general flow
  if (sentiment <= -0.4) {
    driftFactors.push("General outflow (negative sentiment)");
  } else if (sentiment <= -0.3) {
    driftFactors.push("Hesitant inflow (low sentiment)");
  } else if (sentiment >= 0.4) {
    driftFactors.push("General inflow (positive sentiment)");
  }

  // Civic load affects elder population
  if (civicLoad === 'load-strain' || civicLoadScore >= 12) {
    driftFactors.push("Elder outflow (civic strain)");
  } else if (civicLoad === 'minor-variance' || civicLoadScore >= 5) {
    driftFactors.push("Elder caution (civic pressure)");
  }

  // Environmental cues affect transients (only if not holiday)
  if (textures >= 5 && holiday === 'none') {
    driftFactors.push("Transient inflow (environmental draw)");
  } else if (textures >= 3 && holiday === 'none') {
    driftFactors.push("Visitor interest (texture signals)");
  }

  // Economic mood affects professionals
  if (econMood >= 70) {
    driftFactors.push("Professional inflow (economic boom)");
  } else if (econMood >= 60) {
    driftFactors.push("Professional interest (strong economy)");
  } else if (econMood <= 30) {
    driftFactors.push("Professional outflow (economic concern)");
  } else if (econMood <= 40) {
    driftFactors.push("Professional caution (weak economy)");
  }

  // Weather comfort affects retirees
  if (weatherMood.perfectWeather) {
    driftFactors.push("Retiree interest (ideal weather)");
  }
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.3) {
    driftFactors.push("Visitor outflow (weather discomfort)");
  }

  // Instability creates mixed signals
  if (instability) {
    driftFactors.push("Mixed drift (instability detected)");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE PRIMARY DRIFT
  // ═══════════════════════════════════════════════════════════════════════════
  var drift = "Stable";

  if (driftFactors.length > 0) {
    // Count inflows vs outflows
    var inflows = 0;
    var outflows = 0;
    for (var di = 0; di < driftFactors.length; di++) {
      var f = driftFactors[di];
      if (f.indexOf('inflow') >= 0 || f.indexOf('interest') >= 0 || f.indexOf('surge') >= 0 ||
          f.indexOf('gathering') >= 0 || f.indexOf('crowd') >= 0 || f.indexOf('visitors') >= 0) {
        inflows++;
      }
      if (f.indexOf('outflow') >= 0 || f.indexOf('caution') >= 0) {
        outflows++;
      }
    }

    // v3.2: Holiday/event days default to inflow unless strong outflow signals
    if (holiday !== 'none' || isFirstFriday || sportsSeason === 'playoffs' || sportsSeason === 'championship') {
      if (outflows > inflows) {
        drift = "Mixed drift (event day)";
      } else {
        drift = "Event inflow";
      }
    } else if (inflows > outflows + 1) {
      drift = "Net inflow";
    } else if (outflows > inflows + 1) {
      drift = "Net outflow";
    } else if (driftFactors.length >= 3) {
      drift = "Mixed drift";
    } else {
      drift = driftFactors[0]; // Use strongest signal
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPOSE INTO CTX.SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  // Calculate net direction
  var netInflow = 0;
  var netOutflow = 0;
  for (var ni = 0; ni < driftFactors.length; ni++) {
    var nf = driftFactors[ni];
    if (nf.indexOf('inflow') >= 0 || nf.indexOf('surge') >= 0 || nf.indexOf('visitors') >= 0) {
      netInflow++;
    }
    if (nf.indexOf('outflow') >= 0) {
      netOutflow++;
    }
  }

  S.demographicDrift = drift;
  S.demographicDriftFactors = driftFactors;
  S.demographicDriftSummary = {
    primary: drift,
    factors: driftFactors,
    netDirection: netInflow - netOutflow,
    // v3.2: Calendar context
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * DEMOGRAPHIC DRIFT REFERENCE v3.2
 * ============================================================================
 * 
 * HOLIDAY DRIFT FACTORS (v3.2):
 * 
 * | Holiday | Drift Factors |
 * |---------|---------------|
 * | OaklandPride | Festival visitors, LGBTQ+ community inflow |
 * | ArtSoulFestival | Festival visitors, Cultural tourists |
 * | LunarNewYear | Cultural tourists, Family inflow |
 * | CincoDeMayo | Festival visitors, Cultural tourists |
 * | DiaDeMuertos | Cultural visitors, Family inflow |
 * | Juneteenth | Community gathering, Cultural visitors |
 * | Thanksgiving | Family inflow, Transient outflow |
 * | Holiday | Family inflow, Shopper surge |
 * | NewYearsEve | Party crowd inflow, Youth surge |
 * | StPatricksDay | Bar crowd inflow, Youth surge |
 * | Halloween | Party visitors, Family inflow |
 * | Independence | Family inflow, Visitor surge |
 * | OpeningDay | Baseball fans surge, Sports visitors |
 * 
 * FIRST FRIDAY DRIFT:
 * - Arts crowd inflow
 * - Creative community gathering
 * - Youth surge (if nightlife >= 5)
 * 
 * CREATION DAY DRIFT:
 * - Local pride
 * - Oakland native gathering
 * 
 * SPORTS SEASON DRIFT:
 * - Championship: Sports fans surge, Regional visitors, Party crowd
 * - Playoffs: Sports fans inflow, Watch party crowds
 * - Late-season: Sports interest
 * 
 * OUTPUT:
 * - demographicDrift: string (primary drift label)
 * - demographicDriftFactors: array of factor strings
 * - demographicDriftSummary: {primary, factors, netDirection, calendar context}
 * 
 * ============================================================================
 */