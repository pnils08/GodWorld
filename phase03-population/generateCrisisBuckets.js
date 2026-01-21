/**
 * ============================================================================
 * generateCrisisBuckets_ v2.6
 * ============================================================================
 * 
 * v2.6 Enhancements:
 * - Severe/persistent crises spawn arcs for proper lifecycle tracking
 * - Arc spawning prevents "eternal crisis" problem
 * - Health crises become trackable arcs with resolution paths
 * - Integration with processArcLifecycle_ for resolution
 * - Duplicate arc prevention (checks existing arcs)
 *
 * v2.5 Features (retained):
 * - 12 Oakland neighborhoods
 * - GodWorld Calendar integration
 * - Category-specific modifiers
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
  var S = ctx.summary;
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var econMood = S.economicMood || 50;
  var chaosCount = (S.worldEvents || []).length;
  var cycle = S.cycleId || ctx.config.cycleCount || 0;
  var dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };

  // Calendar context
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: EXISTING ARC CHECK (prevent duplicates)
  // ═══════════════════════════════════════════════════════════════════════════
  var existingArcs = S.eventArcs || [];
  
  function hasActiveArc(category, neighborhood) {
    for (var i = 0; i < existingArcs.length; i++) {
      var arc = existingArcs[i];
      if (!arc || arc.phase === 'resolved') continue;
      if (arc.domainTag === category || arc.domain === category) {
        if (!neighborhood || arc.neighborhood === neighborhood) {
          return true;
        }
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
  // HELPER: PICK WEIGHTED NEIGHBORHOOD
  // ═══════════════════════════════════════════════════════════════════════════
  function pickNeighborhood(categoryWeightAdjust) {
    var weights = {};
    for (var k in neighborhoodWeights) {
      weights[k] = neighborhoodWeights[k];
    }
    
    if (categoryWeightAdjust) {
      for (var n in categoryWeightAdjust) {
        weights[n] = (weights[n] || 1.0) + categoryWeightAdjust[n];
      }
    }

    if (isFirstFriday) {
      weights['Uptown'] = (weights['Uptown'] || 1.0) + 0.3;
      weights['KONO'] = (weights['KONO'] || 1.0) + 0.2;
    }

    if (holiday === "LunarNewYear") {
      weights['Chinatown'] = (weights['Chinatown'] || 1.0) + 0.4;
    }

    if (holiday === "CincoDeMayo" || holiday === "DiaDeMuertos") {
      weights['Fruitvale'] = (weights['Fruitvale'] || 1.0) + 0.3;
    }

    if (holiday === "OpeningDay" || sportsSeason === "championship") {
      weights['Jack London'] = (weights['Jack London'] || 1.0) + 0.4;
      weights['Downtown'] = (weights['Downtown'] || 1.0) + 0.3;
    }

    var pool = [];
    for (var i = 0; i < neighborhoods.length; i++) {
      var nh = neighborhoods[i];
      var w = Math.max(weights[nh] || 1.0, 0.1);
      for (var j = 0; j < Math.round(w * 10); j++) {
        pool.push(nh);
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: HELPER - SPAWN ARC FROM CRISIS
  // ═══════════════════════════════════════════════════════════════════════════
  function spawnCrisisArc(crisis, arcType) {
    // Don't spawn if similar arc already exists
    if (hasActiveArc(crisis.category, crisis.location)) {
      return null;
    }
    
    var baseTension = crisis.severity === 'high' ? 6 : 
                      crisis.severity === 'medium' ? 4 : 2;
    
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
      // v2.6: Resolution hints
      resolutionConditions: getResolutionConditions_(crisis.category, crisis.subtype),
      // Calendar context
      holidayContext: holiday !== 'none' ? holiday : null,
      seasonContext: season
    };
    
    S.eventArcs = S.eventArcs || [];
    S.eventArcs.push(arc);
    
    return arc;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: RESOLUTION CONDITIONS BY CATEGORY
  // ═══════════════════════════════════════════════════════════════════════════
  function getResolutionConditions_(category, subtype) {
    var conditions = {
      'HEALTH': {
        naturalResolution: 'illnessRate drops below 0.05',
        timeToResolve: '3-6 cycles',
        accelerators: ['improved weather', 'holiday end', 'treatment rollout']
      },
      'ECONOMIC': {
        naturalResolution: 'economicMood rises above 50',
        timeToResolve: '4-8 cycles',
        accelerators: ['new investment', 'holiday shopping', 'championship boost']
      },
      'CIVIC': {
        naturalResolution: 'migration stabilizes within ±50',
        timeToResolve: '5-10 cycles',
        accelerators: ['housing availability', 'job growth', 'community programs']
      },
      'INFRASTRUCTURE': {
        naturalResolution: 'weather.impact drops below 1.2',
        timeToResolve: '2-4 cycles',
        accelerators: ['weather improvement', 'repair completion', 'holiday end']
      },
      'SAFETY': {
        naturalResolution: 'sentiment rises above -0.2',
        timeToResolve: '3-5 cycles',
        accelerators: ['community engagement', 'event conclusion', 'patrols']
      },
      'ENVIRONMENT': {
        naturalResolution: 'weather normalizes',
        timeToResolve: '2-5 cycles',
        accelerators: ['rain', 'temperature drop', 'cleanup efforts']
      }
    };
    
    return conditions[category] || { 
      naturalResolution: 'conditions improve',
      timeToResolve: '4-8 cycles',
      accelerators: []
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL CALENDAR MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  var calendarMod = 1.0;

  var peacefulHolidays = ["Thanksgiving", "Holiday", "Easter", "MothersDay", "FathersDay"];
  if (peacefulHolidays.indexOf(holiday) >= 0) {
    calendarMod *= 0.7;
  }

  var civicRestHolidays = ["MLKDay", "PresidentsDay", "MemorialDay", "LaborDay", "VeteransDay"];
  if (civicRestHolidays.indexOf(holiday) >= 0) {
    calendarMod *= 0.8;
  }

  if (isFirstFriday) {
    calendarMod *= 0.75;
  }

  if (isCreationDay) {
    calendarMod *= 0.7;
  }

  if (dynamics.communityEngagement >= 1.4) {
    calendarMod *= 0.85;
  }

  if (dynamics.culturalActivity >= 1.4) {
    calendarMod *= 0.9;
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

  if (chaosCount > 0) healthChance *= 0.7;

  var gatheringHolidays = ["Thanksgiving", "Holiday", "NewYearsEve", "Independence", "OpeningDay"];
  if (gatheringHolidays.indexOf(holiday) >= 0) {
    healthChance += 0.05;
  }

  if (season === "Winter" && (holiday === "Holiday" || holiday === "NewYear")) {
    healthChance += 0.04;
  }

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

    var severity = illness >= 0.085 ? 'high' : (Math.random() < 0.5 ? 'low' : 'medium');

    var healthCrisis = {
      category: "HEALTH",
      subtype: pool[Math.floor(Math.random() * pool.length)],
      severity: severity,
      location: pickNeighborhood(null)
    };
    
    crises.push(healthCrisis);
    
    // v2.6: Spawn arc for HIGH severity or if illness rate is critical
    if (severity === 'high' || illness >= 0.08) {
      spawnCrisisArc(healthCrisis, 'health-crisis');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════════
  var empChance = 0;
  if (emp < 0.88) empChance = 0.55;
  if (econMood <= 35) empChance += 0.15;

  var retailHolidays = ["Holiday", "BlackFriday"];
  if (retailHolidays.indexOf(holiday) >= 0) {
    empChance *= 0.6;
  }

  if (holiday === "NewYear" && economy !== "strong") {
    empChance += 0.1;
  }

  empChance *= calendarMod;

  if (empChance > 0 && Math.random() < empChance) {
    var empSeverity = emp < 0.84 ? 'high' : 'medium';
    var empSubtype = emp < 0.84 ? "Layoff Pressure" : "Hiring Slowdown";

    var empCrisis = {
      category: "ECONOMIC",
      subtype: empSubtype,
      severity: empSeverity,
      location: pickNeighborhood({ 'Downtown': 0.3, 'West Oakland': 0.2 })
    };
    
    crises.push(empCrisis);
    
    // v2.6: Spawn arc for HIGH severity employment crisis
    if (empSeverity === 'high') {
      spawnCrisisArc(empCrisis, 'economic-crisis');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MIGRATION
  // ═══════════════════════════════════════════════════════════════════════════
  var migChance = 0;
  if (Math.abs(mig) > 120) migChance = 0.55;

  var travelHolidays = ["Thanksgiving", "Holiday", "MemorialDay", "LaborDay", "Independence"];
  if (travelHolidays.indexOf(holiday) >= 0) {
    migChance += 0.1;
  }

  migChance *= calendarMod;

  if (migChance > 0 && Math.random() < migChance) {
    var migSeverity = Math.abs(mig) > 300 ? 'high' : 'low';
    var migSubtype = mig > 0 ? "Inflow Strain" : "Outflow Drift";

    var migCrisis = {
      category: "CIVIC",
      subtype: migSubtype,
      severity: migSeverity,
      location: pickNeighborhood(null)
    };
    
    crises.push(migCrisis);
    
    // v2.6: Spawn arc for extreme migration
    if (Math.abs(mig) > 250) {
      spawnCrisisArc(migCrisis, 'demographic');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMY
  // ═══════════════════════════════════════════════════════════════════════════
  var econCrisisChance = 0;
  if (economy === "weak" || economy === "struggling") econCrisisChance = 0.5;
  if (econMood <= 30) econCrisisChance += 0.2;

  if (sportsSeason === "championship") {
    econCrisisChance *= 0.7;
  }

  if (holiday === "NewYear" || holiday === "Holiday") {
    if (economy !== "strong") econCrisisChance += 0.1;
  }

  econCrisisChance *= calendarMod;

  if (econCrisisChance > 0 && Math.random() < econCrisisChance) {
    var econPool = ["Budget Tightening", "Business Closures", "Revenue Shortfall", "Service Cuts"];
    var econSeverity = econMood <= 30 ? 'high' : 'medium';

    var econCrisis = {
      category: "ECONOMIC",
      subtype: econPool[Math.floor(Math.random() * econPool.length)],
      severity: econSeverity,
      location: pickNeighborhood({ 'Downtown': 0.3 })
    };
    
    crises.push(econCrisis);
    
    // v2.6: Spawn arc for HIGH severity or very low mood
    if (econSeverity === 'high' || econMood <= 25) {
      spawnCrisisArc(econCrisis, 'economic-crisis');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INFRASTRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════
  var infraChance = 0;
  if (weather.impact >= 1.3) infraChance = 0.35;

  if (travelHolidays.indexOf(holiday) >= 0) {
    infraChance += 0.1;
  }

  if (sportsSeason === "championship" || holiday === "OpeningDay") {
    infraChance += 0.08;
  }

  infraChance *= calendarMod;

  if (infraChance > 0 && Math.random() < infraChance) {
    var infraPool;
    
    if (travelHolidays.indexOf(holiday) >= 0) {
      infraPool = ["Transit Overcrowding", "Airport Delays", "Road Congestion", "Parking Shortage"];
    } else if (sportsSeason === "championship" || holiday === "OpeningDay") {
      infraPool = ["Stadium Area Congestion", "Transit Surge", "Parking Overflow"];
    } else {
      infraPool = ["Transit Delays", "Road Hazards", "Power Fluctuations", "Flood Watch"];
    }
    
    var infraSeverity = weather.impact >= 1.4 ? 'high' : 'medium';
    
    var infraCrisis = {
      category: "INFRASTRUCTURE",
      subtype: infraPool[Math.floor(Math.random() * infraPool.length)],
      severity: infraSeverity,
      location: pickNeighborhood({ 'Downtown': 0.2, 'Jack London': 0.2 })
    };
    
    crises.push(infraCrisis);
    
    // v2.6: Spawn arc for severe infrastructure issues
    if (weather.impact >= 1.5) {
      spawnCrisisArc(infraCrisis, 'crisis');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY
  // ═══════════════════════════════════════════════════════════════════════════
  var safetyChance = 0;
  if (dynamics.sentiment <= -0.3) safetyChance = 0.30;

  var crowdHolidays = ["Independence", "NewYearsEve", "Halloween", "OpeningDay", "OaklandPride"];
  if (crowdHolidays.indexOf(holiday) >= 0) {
    safetyChance += 0.1;
  }

  if (sportsSeason === "championship") {
    safetyChance += 0.12;
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    safetyChance += 0.06;
  }

  var fireworksHolidays = ["Independence", "NewYearsEve"];
  if (fireworksHolidays.indexOf(holiday) >= 0) {
    safetyChance += 0.08;
  }

  if (isFirstFriday) {
    safetyChance += 0.05;
  }

  safetyChance *= calendarMod;

  if (safetyChance > 0 && Math.random() < safetyChance) {
    var safetyPool;
    
    if (crowdHolidays.indexOf(holiday) >= 0 || sportsSeason === "championship") {
      safetyPool = ["Crowd Control Issue", "Public Disturbance", "Celebratory Incident"];
    } else if (fireworksHolidays.indexOf(holiday) >= 0) {
      safetyPool = ["Fireworks Complaint", "Noise Disturbance", "Fire Hazard Report"];
    } else {
      safetyPool = ["Public Disturbance", "Property Incident", "Community Tension"];
    }
    
    var safetySeverity = dynamics.sentiment <= -0.4 ? 'high' : 'medium';
    
    var safetyCrisis = {
      category: "SAFETY",
      subtype: safetyPool[Math.floor(Math.random() * safetyPool.length)],
      severity: safetySeverity,
      location: pickNeighborhood(
        crowdHolidays.indexOf(holiday) >= 0 ? { 'Downtown': 0.4, 'Jack London': 0.3, 'Lake Merritt': 0.2 } : null
      )
    };
    
    crises.push(safetyCrisis);
    
    // v2.6: Spawn arc for severe safety crisis
    if (safetySeverity === 'high' || dynamics.sentiment <= -0.5) {
      spawnCrisisArc(safetyCrisis, 'pattern-wave');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENT
  // ═══════════════════════════════════════════════════════════════════════════
  var envChance = 0;
  
  if (weather.type === "hot") envChance = 0.25;
  if (weather.impact >= 1.4) envChance += 0.15;

  if (fireworksHolidays.indexOf(holiday) >= 0) {
    envChance += 0.15;
  }

  if (crowdHolidays.indexOf(holiday) >= 0 || sportsSeason === "championship") {
    envChance += 0.08;
  }

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
    
    var envSeverity = weather.impact >= 1.4 ? 'high' : 'medium';
    
    var envCrisis = {
      category: "ENVIRONMENT",
      subtype: envPool[Math.floor(Math.random() * envPool.length)],
      severity: envSeverity,
      location: pickNeighborhood(null)
    };
    
    crises.push(envCrisis);
    
    // v2.6: Spawn arc for extreme environmental crisis
    if (weather.impact >= 1.6) {
      spawnCrisisArc(envCrisis, 'crisis');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  for (var c = 0; c < crises.length; c++) {
    var crisis = crises[c];
    
    S.auditIssues.push(
      crisis.category + ' – ' + crisis.subtype + ' – ' + crisis.location + ' – ' + crisis.severity
    );

    S.worldEvents = S.worldEvents || [];
    
    var event = {
      cycle: cycle,
      domain: crisis.category,
      subdomain: crisis.subtype,
      neighborhood: crisis.location,
      severity: crisis.severity,
      impactScore: crisis.severity === 'high' ? 50 : crisis.severity === 'medium' ? 30 : 15,
      source: 'BUCKET',
      timestamp: ctx.now
    };

    if (holiday !== "none") {
      event.holidayContext = holiday;
    }
    if (isFirstFriday) {
      event.firstFriday = true;
    }
    if (sportsSeason !== "off-season") {
      event.sportsSeason = sportsSeason;
    }

    S.worldEvents.push(event);
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
  }

  // v2.6: Log arc spawns
  var newArcs = (S.eventArcs || []).filter(function(a) { 
    return a && a.cycleCreated === cycle && a.source === 'BUCKET'; 
  });
  
  if (newArcs.length > 0) {
    Logger.log('generateCrisisBuckets_ v2.6: Spawned ' + newArcs.length + ' crisis arcs');
  }

  ctx.summary = S;
}


/**
 * ============================================================================
 * CRISIS BUCKETS v2.6 REFERENCE
 * ============================================================================
 * 
 * ARC SPAWNING CONDITIONS:
 * 
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
 * ARC DUPLICATE PREVENTION:
 * - Checks existing arcs before spawning
 * - Won't spawn if same category+neighborhood has active arc
 * 
 * RESOLUTION CONDITIONS (stored on arc):
 * - naturalResolution: What metric change resolves it
 * - timeToResolve: Expected duration
 * - accelerators: What can speed up resolution
 * 
 * ============================================================================
 */