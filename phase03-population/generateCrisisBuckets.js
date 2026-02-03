/**
 * ============================================================================
 * generateCrisisBuckets_ v2.7
 * ============================================================================
 *
 * Adds:
 * - Real cooldown system (no sheet schema changes)
 * - Shock-aware throttling (uses S.shockFlag from applyShockMonitor_)
 * - Canon-friendly sports weighting (override-only for playoffs/championship)
 *
 * Keeps:
 * - Your arc spawn behavior (v2.6)
 * - Your event output format (S.worldEvents push)
 *
 * ============================================================================
 */

function generateCrisisBuckets_(ctx) {

  var ss = ctx.ss;
  var popSheet = ss.getSheetByName('World_Population');
  if (!popSheet) return;

  var values = popSheet.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var row = values[1];
  var idx = function(name) { return header.indexOf(name); };

  var illness = Number(row[idx('illnessRate')] || 0.05);
  var emp = Number(row[idx('employmentRate')] || 0.91);
  var mig = Number(row[idx('migration')] || 0);
  var economy = (row[idx('economy')] || "stable").toString().trim();

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD STATE
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary || {};
  ctx.summary = S;

  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var econMood = S.economicMood || 50;
  var chaosCount = (S.worldEvents || []).length;

  var cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  var dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };

  // Calendar context
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;

  // Sports canon handling
  var sportsSeason = (S.sportsSeason || "off-season").toString();
  var sportsSource = (S.sportsSource || "").toString();
  var sportsIsOverride = (sportsSource === "config-override");

  function getSportsPhaseSimple() {
    var m = S.simMonth || 1;
    if (m === 3) return "spring-training";
    if (m >= 4 && m <= 10) return "in-season";
    return "off-season";
  }
  var sportsPhase = sportsIsOverride ? sportsSeason : getSportsPhaseSimple();

  // Shock state (from applyShockMonitor_)
  var shockFlag = (S.shockFlag || "none").toString();
  var shockActive = (shockFlag === "shock-flag");
  var shockFading = (shockFlag === "shock-fading");
  var shockChronic = (shockFlag === "shock-chronic");

  // ═══════════════════════════════════════════════════════════════════════════
  // COOLDOWN STORAGE (summary only; no sheet schema impact)
  // ═══════════════════════════════════════════════════════════════════════════
  S.crisisCooldown = S.crisisCooldown || {};   // key: "CATEGORY|NEIGHBORHOOD" => untilCycle
  S.crisisLastSeen = S.crisisLastSeen || {};   // key: "CATEGORY|SUBTYPE" => lastCycle

  function inCooldown(category, neighborhood, subtype) {
    var k1 = category + "|" + (neighborhood || "");
    var until = Number(S.crisisCooldown[k1] || 0);
    if (until && cycle < until) return true;

    var k2 = category + "|" + (subtype || "");
    var last = Number(S.crisisLastSeen[k2] || 0);
    // subtype cooldown (prevents repeating "Air Quality Alert" every cycle)
    if (last && (cycle - last) < 2) return true;

    return false;
  }

  function setCooldown(category, neighborhood, subtype, base) {
    // base = cooldown length in cycles
    var k1 = category + "|" + (neighborhood || "");
    var k2 = category + "|" + (subtype || "");

    var len = base;

    // During active shock, you want fewer *new* unique crises
    if (shockActive) len += 1;
    if (shockChronic) len += 0; // chronic is "new normal", don't over-throttle
    if (isCreationDay) len += 1; // calm day → don't spam

    S.crisisCooldown[k1] = cycle + len;
    S.crisisLastSeen[k2] = cycle;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: EXISTING ARC CHECK (prevent duplicates)
  // ═══════════════════════════════════════════════════════════════════════════
  var existingArcs = S.eventArcs || [];

  function hasActiveArc(category, neighborhood) {
    for (var i = 0; i < existingArcs.length; i++) {
      var arc = existingArcs[i];
      if (!arc || arc.phase === 'resolved') continue;
      if (arc.domainTag === category || arc.domain === category) {
        if (!neighborhood || arc.neighborhood === neighborhood) return true;
      }
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOODS (12)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  var neighborhoodWeights = {
    'Temescal': 0.9,
    'Downtown': 1.3,
    'Fruitvale': 1.0,
    'Lake Merritt': 0.8,
    'West Oakland': 1.2,
    'Laurel': 0.7,
    'Rockridge': 0.5,
    'Jack London': 1.0,
    'Uptown': 1.1,
    'KONO': 0.8,
    'Chinatown': 0.9,
    'Piedmont Ave': 0.4
  };

  if (!S.auditIssues) S.auditIssues = [];

  var crises = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // Crisis volume cap (shock-aware)
  // - Active shock: fewer NEW crises (realism), but severity can bias upward
  // - Normal: allow more variety
  // ═══════════════════════════════════════════════════════════════════════════
  var MAX_NEW = 3;
  if (shockActive) MAX_NEW = 2;
  else if (shockFading) MAX_NEW = 2;
  else if (shockChronic) MAX_NEW = 2;

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER: PICK WEIGHTED NEIGHBORHOOD
  // ═══════════════════════════════════════════════════════════════════════════
  function pickNeighborhood(categoryWeightAdjust) {
    var weights = {};
    for (var k in neighborhoodWeights) weights[k] = neighborhoodWeights[k];

    if (categoryWeightAdjust) {
      for (var n in categoryWeightAdjust) {
        weights[n] = (weights[n] || 1.0) + categoryWeightAdjust[n];
      }
    }

    if (isFirstFriday) {
      weights['Uptown'] = (weights['Uptown'] || 1.0) + 0.3;
      weights['KONO'] = (weights['KONO'] || 1.0) + 0.2;
    }

    if (holiday === "LunarNewYear") weights['Chinatown'] = (weights['Chinatown'] || 1.0) + 0.4;
    if (holiday === "CincoDeMayo" || holiday === "DiaDeMuertos") weights['Fruitvale'] = (weights['Fruitvale'] || 1.0) + 0.3;

    // Sports crowd weighting:
    // - Only big boosts for championship if override
    // - Otherwise mild in-season Downtown/Jack London congestion baseline
    if (sportsIsOverride && (sportsSeason === "championship" || holiday === "OpeningDay")) {
      weights['Jack London'] = (weights['Jack London'] || 1.0) + 0.4;
      weights['Downtown'] = (weights['Downtown'] || 1.0) + 0.3;
    } else if (!sportsIsOverride && sportsPhase === "in-season") {
      weights['Jack London'] = (weights['Jack London'] || 1.0) + 0.15;
      weights['Downtown'] = (weights['Downtown'] || 1.0) + 0.10;
    }

    var pool = [];
    for (var i = 0; i < neighborhoods.length; i++) {
      var nh = neighborhoods[i];
      var w = Math.max(weights[nh] || 1.0, 0.1);
      for (var j = 0; j < Math.round(w * 10); j++) pool.push(nh);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: HELPER - SPAWN ARC FROM CRISIS
  // ═══════════════════════════════════════════════════════════════════════════
  function getResolutionConditions_(category) {
    var conditions = {
      'HEALTH': { naturalResolution: 'illnessRate drops below 0.05', timeToResolve: '3-6 cycles', accelerators: ['improved weather','holiday end','treatment rollout'] },
      'ECONOMIC': { naturalResolution: 'economicMood rises above 50', timeToResolve: '4-8 cycles', accelerators: ['new investment','holiday shopping','championship boost'] },
      'CIVIC': { naturalResolution: 'migration stabilizes within ±50', timeToResolve: '5-10 cycles', accelerators: ['housing availability','job growth','community programs'] },
      'INFRASTRUCTURE': { naturalResolution: 'weather.impact drops below 1.2', timeToResolve: '2-4 cycles', accelerators: ['weather improvement','repair completion','holiday end'] },
      'SAFETY': { naturalResolution: 'sentiment rises above -0.2', timeToResolve: '3-5 cycles', accelerators: ['community engagement','event conclusion','patrols'] },
      'ENVIRONMENT': { naturalResolution: 'weather normalizes', timeToResolve: '2-5 cycles', accelerators: ['rain','temperature drop','cleanup efforts'] }
    };
    return conditions[category] || { naturalResolution: 'conditions improve', timeToResolve: '4-8 cycles', accelerators: [] };
  }

  function spawnCrisisArc(crisis, arcType) {
    if (hasActiveArc(crisis.category, crisis.location)) return null;

    var baseTension = crisis.severity === 'high' ? 6 : crisis.severity === 'medium' ? 4 : 2;

    var arc = {
      arcId: 'CRISIS-' + cycle + '-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      type: arcType,
      phase: 'early',
      tension: baseTension,
      age: 0,
      neighborhood: crisis.location,
      domainTag: crisis.category,
      domain: crisis.category,
      summary: crisis.category + ' crisis: ' + crisis.subtype + ' in ' + crisis.location,
      subtype: crisis.subtype,
      cycleCreated: cycle,
      cycleResolved: null,
      source: 'BUCKET',
      resolutionConditions: getResolutionConditions_(crisis.category),
      holidayContext: holiday !== 'none' ? holiday : null,
      seasonContext: season
    };

    S.eventArcs = S.eventArcs || [];
    S.eventArcs.push(arc);
    return arc;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL CALENDAR MODIFIERS (plus shock throttle)
  // ═══════════════════════════════════════════════════════════════════════════
  var calendarMod = 1.0;

  var peacefulHolidays = ["Thanksgiving", "Holiday", "Easter", "MothersDay", "FathersDay"];
  if (peacefulHolidays.indexOf(holiday) >= 0) calendarMod *= 0.7;

  var civicRestHolidays = ["MLKDay", "PresidentsDay", "MemorialDay", "LaborDay", "VeteransDay"];
  if (civicRestHolidays.indexOf(holiday) >= 0) calendarMod *= 0.8;

  if (isFirstFriday) calendarMod *= 0.75;
  if (isCreationDay) calendarMod *= 0.7;

  if ((dynamics.communityEngagement || 1) >= 1.4) calendarMod *= 0.85;
  if ((dynamics.culturalActivity || 1) >= 1.4) calendarMod *= 0.9;

  // Shock throttle: reduce *new* crisis roll frequency (but let severity bias do the "big feeling")
  if (shockActive) calendarMod *= 0.75;
  else if (shockFading) calendarMod *= 0.85;

  // Helper: bias severity upward during active shock (instead of volume spam)
  function pickSeverity(baseHighMetric) {
    // baseHighMetric is something like illness rate or weather.impact
    if (shockActive && Math.random() < 0.35) return 'high';
    if (baseHighMetric && baseHighMetric > 0) {
      // leave the caller's logic to decide; this is just a small nudge
      if (shockFading && Math.random() < 0.15) return 'high';
    }
    return null; // caller decides
  }

  // Helper: add crisis with cooldown checks
  function tryAddCrisis(category, subtype, severity, location, cooldownLen, arcRuleFn) {
    if (crises.length >= MAX_NEW) return;

    if (inCooldown(category, location, subtype)) return;
    if (hasActiveArc(category, location)) {
      // If an arc already exists here, we avoid adding another "bucket" crisis spam.
      // The arc lifecycle should represent persistence.
      return;
    }

    var crisis = { category: category, subtype: subtype, severity: severity, location: location };
    crises.push(crisis);

    setCooldown(category, location, subtype, cooldownLen);

    if (typeof arcRuleFn === "function") arcRuleFn(crisis);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH
  // ═══════════════════════════════════════════════════════════════════════════
  var healthChance = 0.02;
  if (illness >= 0.06) healthChance += 0.06;
  if (illness >= 0.07) healthChance += 0.08;
  if (illness >= 0.085) healthChance += 0.10;

  if (season === "Winter") healthChance += 0.08;
  if (weather.type === "fog" || weather.type === "rain") healthChance += 0.04;
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.3) healthChance += 0.03;

  // If chaos exists, reduce *new* health "bucket" reporting slightly (keeps signal clean)
  if (chaosCount > 0) healthChance *= 0.85;

  var gatheringHolidays = ["Thanksgiving", "Holiday", "NewYearsEve", "Independence", "OpeningDay"];
  if (gatheringHolidays.indexOf(holiday) >= 0) healthChance += 0.05;

  if (season === "Winter" && (holiday === "Holiday" || holiday === "NewYear")) healthChance += 0.04;

  healthChance *= calendarMod;
  if (healthChance > 0.40) healthChance = 0.40;

  if (Math.random() < healthChance) {
    var pool;
    if (season === "Winter") {
      pool = ["Respiratory Advisory", "Clinic Overcapacity", "Transit Illness Watch", "Flu Season Strain"];
    } else if (weather.type === "hot" || (weatherMood.conflictPotential && weatherMood.conflictPotential > 0.3)) {
      pool = ["Heat Exhaustion Calls", "Cooling Center Demand", "Dehydration Advisory"];
    } else if (gatheringHolidays.indexOf(holiday) >= 0) {
      pool = ["Post-Gathering Illness Uptick", "Clinic Busy Period", "Seasonal Illness Watch"];
    } else {
      pool = ["Foodborne Advisory", "Seasonal Allergy Spike", "Air Quality Notice"];
    }

    var subtype = pool[Math.floor(Math.random() * pool.length)];
    var forced = pickSeverity(illness);
    var severity = forced || (illness >= 0.085 ? 'high' : (Math.random() < 0.5 ? 'low' : 'medium'));

    var loc = pickNeighborhood(null);

    tryAddCrisis("HEALTH", subtype, severity, loc, 3, function(c) {
      // Spawn arc for high severity or critical illness
      if (c.severity === 'high' || illness >= 0.08) spawnCrisisArc(c, 'health-crisis');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════════
  var empChance = 0;
  if (emp < 0.88) empChance = 0.55;
  if (econMood <= 35) empChance += 0.15;

  var retailHolidays = ["Holiday", "BlackFriday"];
  if (retailHolidays.indexOf(holiday) >= 0) empChance *= 0.6;

  if (holiday === "NewYear" && economy !== "strong") empChance += 0.1;

  empChance *= calendarMod;

  if (empChance > 0 && Math.random() < empChance) {
    var subtype2 = (emp < 0.84) ? "Layoff Pressure" : "Hiring Slowdown";
    var forced2 = pickSeverity(1);
    var severity2 = forced2 || (emp < 0.84 ? 'high' : 'medium');
    var loc2 = pickNeighborhood({ 'Downtown': 0.3, 'West Oakland': 0.2 });

    tryAddCrisis("ECONOMIC", subtype2, severity2, loc2, 4, function(c) {
      if (c.severity === 'high') spawnCrisisArc(c, 'economic-crisis');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MIGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  var migChance = 0;
  if (Math.abs(mig) > 120) migChance = 0.55;

  var travelHolidays = ["Thanksgiving", "Holiday", "MemorialDay", "LaborDay", "Independence"];
  if (travelHolidays.indexOf(holiday) >= 0) migChance += 0.1;

  migChance *= calendarMod;

  if (migChance > 0 && Math.random() < migChance) {
    var subtype3 = (mig > 0) ? "Inflow Strain" : "Outflow Drift";
    var forced3 = pickSeverity(Math.abs(mig) / 300);
    var severity3 = forced3 || (Math.abs(mig) > 300 ? 'high' : 'low');
    var loc3 = pickNeighborhood(null);

    tryAddCrisis("CIVIC", subtype3, severity3, loc3, 4, function(c) {
      if (Math.abs(mig) > 250) spawnCrisisArc(c, 'demographic');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMY
  // ═══════════════════════════════════════════════════════════════════════════
  var econCrisisChance = 0;
  if (economy === "weak" || economy === "struggling") econCrisisChance = 0.5;
  if (econMood <= 30) econCrisisChance += 0.2;

  // only championship boost reduction if override (canon)
  if (sportsIsOverride && sportsSeason === "championship") econCrisisChance *= 0.7;

  if (holiday === "NewYear" || holiday === "Holiday") {
    if (economy !== "strong") econCrisisChance += 0.1;
  }

  econCrisisChance *= calendarMod;

  if (econCrisisChance > 0 && Math.random() < econCrisisChance) {
    var econPool = ["Budget Tightening", "Business Closures", "Revenue Shortfall", "Service Cuts"];
    var subtype4 = econPool[Math.floor(Math.random() * econPool.length)];
    var forced4 = pickSeverity(1);
    var severity4 = forced4 || (econMood <= 30 ? 'high' : 'medium');
    var loc4 = pickNeighborhood({ 'Downtown': 0.3 });

    tryAddCrisis("ECONOMIC", subtype4, severity4, loc4, 5, function(c) {
      if (c.severity === 'high' || econMood <= 25) spawnCrisisArc(c, 'economic-crisis');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INFRASTRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════
  var infraChance = 0;
  if (weather.impact >= 1.3) infraChance = 0.35;

  if (travelHolidays.indexOf(holiday) >= 0) infraChance += 0.1;

  // sports crowd infra only big when override; otherwise mild in-season bump
  if (sportsIsOverride && (sportsSeason === "championship" || holiday === "OpeningDay")) infraChance += 0.08;
  else if (!sportsIsOverride && sportsPhase === "in-season") infraChance += 0.03;

  infraChance *= calendarMod;

  if (infraChance > 0 && Math.random() < infraChance) {
    var infraPool;
    if (travelHolidays.indexOf(holiday) >= 0) {
      infraPool = ["Transit Overcrowding", "Airport Delays", "Road Congestion", "Parking Shortage"];
    } else if (sportsIsOverride && (sportsSeason === "championship" || holiday === "OpeningDay")) {
      infraPool = ["Stadium Area Congestion", "Transit Surge", "Parking Overflow"];
    } else {
      infraPool = ["Transit Delays", "Road Hazards", "Power Fluctuations", "Flood Watch"];
    }

    var subtype5 = infraPool[Math.floor(Math.random() * infraPool.length)];
    var forced5 = pickSeverity(weather.impact);
    var severity5 = forced5 || (weather.impact >= 1.4 ? 'high' : 'medium');
    var loc5 = pickNeighborhood({ 'Downtown': 0.2, 'Jack London': 0.2 });

    tryAddCrisis("INFRASTRUCTURE", subtype5, severity5, loc5, 3, function(c) {
      if (weather.impact >= 1.5) spawnCrisisArc(c, 'crisis');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY
  // ═══════════════════════════════════════════════════════════════════════════
  var safetyChance = 0;
  if ((dynamics.sentiment || 0) <= -0.3) safetyChance = 0.30;

  var crowdHolidays = ["Independence", "NewYearsEve", "Halloween", "OpeningDay", "OaklandPride"];
  if (crowdHolidays.indexOf(holiday) >= 0) safetyChance += 0.1;

  if (sportsIsOverride) {
    if (sportsSeason === "championship") safetyChance += 0.12;
    else if (sportsSeason === "playoffs" || sportsSeason === "post-season") safetyChance += 0.06;
  } else {
    if (sportsPhase === "in-season") safetyChance += 0.03;
  }

  var fireworksHolidays = ["Independence", "NewYearsEve"];
  if (fireworksHolidays.indexOf(holiday) >= 0) safetyChance += 0.08;

  if (isFirstFriday) safetyChance += 0.05;

  safetyChance *= calendarMod;

  if (safetyChance > 0 && Math.random() < safetyChance) {
    var safetyPool;
    if (crowdHolidays.indexOf(holiday) >= 0 || (sportsIsOverride && sportsSeason === "championship")) {
      safetyPool = ["Crowd Control Issue", "Public Disturbance", "Celebratory Incident"];
    } else if (fireworksHolidays.indexOf(holiday) >= 0) {
      safetyPool = ["Fireworks Complaint", "Noise Disturbance", "Fire Hazard Report"];
    } else {
      safetyPool = ["Public Disturbance", "Property Incident", "Community Tension"];
    }

    var subtype6 = safetyPool[Math.floor(Math.random() * safetyPool.length)];
    var forced6 = pickSeverity(1);
    var severity6 = forced6 || ((dynamics.sentiment || 0) <= -0.4 ? 'high' : 'medium');
    var loc6 = pickNeighborhood(
      crowdHolidays.indexOf(holiday) >= 0 ? { 'Downtown': 0.4, 'Jack London': 0.3, 'Lake Merritt': 0.2 } : null
    );

    tryAddCrisis("SAFETY", subtype6, severity6, loc6, 3, function(c) {
      if (c.severity === 'high' || (dynamics.sentiment || 0) <= -0.5) spawnCrisisArc(c, 'pattern-wave');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENT
  // ═══════════════════════════════════════════════════════════════════════════
  var envChance = 0;
  if (weather.type === "hot") envChance = 0.25;
  if (weather.impact >= 1.4) envChance += 0.15;

  if (fireworksHolidays.indexOf(holiday) >= 0) envChance += 0.15;

  if (crowdHolidays.indexOf(holiday) >= 0 || (sportsIsOverride && sportsSeason === "championship")) envChance += 0.08;

  envChance *= calendarMod;

  if (envChance > 0 && Math.random() < envChance) {
    var envPool;
    if (fireworksHolidays.indexOf(holiday) >= 0) {
      envPool = ["Air Quality Alert", "Noise Pollution Report", "Debris Cleanup Needed"];
    } else if (weather.type === "hot") {
      envPool = ["Heat Advisory", "Fire Risk Warning", "Drought Strain"];
    } else {
      envPool = ["Environmental Complaint", "Waste Management Strain", "Green Space Pressure"];
    }

    var subtype7 = envPool[Math.floor(Math.random() * envPool.length)];
    var forced7 = pickSeverity(weather.impact);
    var severity7 = forced7 || (weather.impact >= 1.4 ? 'high' : 'medium');
    var loc7 = pickNeighborhood(null);

    tryAddCrisis("ENVIRONMENT", subtype7, severity7, loc7, 3, function(c) {
      if (weather.impact >= 1.6) spawnCrisisArc(c, 'crisis');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT (unchanged format)
  // ═══════════════════════════════════════════════════════════════════════════
  for (var c = 0; c < crises.length; c++) {
    var crisis = crises[c];

    S.auditIssues.push(crisis.category + ' – ' + crisis.subtype + ' – ' + crisis.location + ' – ' + crisis.severity);

    S.worldEvents = S.worldEvents || [];

    var event = {
      cycle: cycle,
      domain: crisis.category,
      subdomain: crisis.subtype,
      neighborhood: crisis.location,
      severity: crisis.severity,
      description: crisis.category + ' — ' + crisis.subtype + ' (' + crisis.location + ')',
      impactScore: crisis.severity === 'high' ? 50 : crisis.severity === 'medium' ? 30 : 15,
      source: 'BUCKET',
      timestamp: ctx.now
    };

    if (holiday !== "none") event.holidayContext = holiday;
    if (isFirstFriday) event.firstFriday = true;

    // sports context (canon-friendly)
    event.sportsPhase = sportsPhase;
    if (sportsIsOverride && sportsSeason !== "off-season") event.sportsSeason = sportsSeason;

    S.worldEvents.push(event);
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
  }

  // Log arc spawns (same behavior as v2.6)
  var newArcs = (S.eventArcs || []).filter(function(a) {
    return a && a.cycleCreated === cycle && a.source === 'BUCKET';
  });
  if (newArcs.length > 0) {
    Logger.log('generateCrisisBuckets_ v2.7: Spawned ' + newArcs.length + ' crisis arcs');
  }

  ctx.summary = S;
}


/**
 * ============================================================================
 * CRISIS BUCKETS v2.7 REFERENCE
 * ============================================================================
 *
 * NEW IN v2.7:
 * - Cooldown system: S.crisisCooldown, S.crisisLastSeen (no schema changes)
 * - Shock-aware: reads S.shockFlag, throttles volume, biases severity
 * - Canon-safe sports: only big effects with sportsIsOverride
 * - MAX_NEW cap: 2-3 crises per cycle based on shock state
 *
 * CALL ORDER:
 * 1. generateCrisisBuckets_ (creates events/arcs)
 * 2. applyShockMonitor_ (detects shock from this cycle's events)
 *
 * ARC SPAWNING CONDITIONS (unchanged from v2.6):
 * | Category | Condition | Arc Type |
 * |----------|-----------|----------|
 * | HEALTH | severity=high OR illness>=0.08 | health-crisis |
 * | ECONOMIC (emp) | severity=high | economic-crisis |
 * | ECONOMIC (econ) | severity=high OR mood<=25 | economic-crisis |
 * | CIVIC (mig) | |migration|>250 | demographic |
 * | INFRASTRUCTURE | weather.impact>=1.5 | crisis |
 * | SAFETY | severity=high OR sentiment<=-0.5 | pattern-wave |
 * | ENVIRONMENT | weather.impact>=1.6 | crisis |
 *
 * ============================================================================
 */
