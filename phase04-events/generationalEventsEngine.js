/**
 * ============================================================================
 * GENERATIONAL EVENTS ENGINE V2.2
 * ============================================================================
 *
 * Handles major life milestones with health status lifecycle.
 *
 * v2.2 Enhancements:
 * - Health status lifecycle: hospitalized → recovering → active
 *                        OR hospitalized → critical → deceased
 * - Status duration tracking (statusStartCycle, statusDuration)
 * - Forced resolution after extended hospitalization
 * - Supports Media Room cause assignment (separate script)
 * - Prevents citizens stuck in hospitalized state forever
 *
 * v2.1 Features (retained):
 * - Calendar-aware milestone timing
 * - Seasonal probability modifiers
 * - Cascade effects with calendar context
 *
 * HEALTH STATUS LIFECYCLE:
 *   active → hospitalized → recovering → active (recovery)
 *                        → critical → deceased (deterioration)
 * 
 * ============================================================================
 */


// ============================================================
// CONSTANTS
// ============================================================

var MILESTONE_TYPES = {
  GRADUATION: 'graduation',
  WEDDING: 'wedding',
  BIRTH: 'birth',
  PROMOTION: 'promotion',
  CAREER_PIVOT: 'career_pivot',
  RETIREMENT: 'retirement',
  DEATH: 'death',
  ANNIVERSARY: 'anniversary',
  DIVORCE: 'divorce',
  HEALTH_EVENT: 'health_event',
  HOSPITALIZATION: 'hospitalization',
  RECOVERY: 'recovery'
};

var AGE_RANGES = {
  GRADUATION: { min: 22, max: 28 },
  WEDDING: { min: 24, max: 50 },
  BIRTH: { min: 26, max: 42 },
  PROMOTION: { min: 28, max: 58 },
  RETIREMENT: { min: 58, max: 72 },
  DEATH_NATURAL: { min: 65, max: 100 }
};

var GENERATIONAL_NEIGHBORHOODS = [
  'Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt',
  'West Oakland', 'Laurel', 'Rockridge', 'Jack London'
];

var WEDDING_BOOST_HOLIDAYS = ['ValentinesDay', 'NewYearsEve'];
var STRESS_HOLIDAYS = ['Thanksgiving', 'Holiday', 'NewYearsEve'];

// v2.2: Health status constants
var HEALTH_STATUSES = {
  ACTIVE: 'active',
  HOSPITALIZED: 'hospitalized',
  CRITICAL: 'critical',
  RECOVERING: 'recovering',
  DECEASED: 'deceased'
};

// v2.2: Health transition probabilities by duration
var HEALTH_TRANSITIONS = {
  hospitalized: {
    short: { recovering: 0.40, critical: 0.10, stay: 0.50 },   // 1-2 cycles
    medium: { recovering: 0.50, critical: 0.15, stay: 0.35 },  // 3-4 cycles
    long: { recovering: 0.60, critical: 0.20, stay: 0.20 }     // 5+ cycles
  },
  critical: {
    short: { hospitalized: 0.30, deceased: 0.40, stay: 0.30 }, // 1-2 cycles
    long: { hospitalized: 0.20, deceased: 0.60, stay: 0.20 }   // 3+ cycles
  },
  recovering: {
    short: { active: 0.70, hospitalized: 0.10, stay: 0.20 },   // 1-2 cycles
    long: { active: 0.90, hospitalized: 0.05, stay: 0.05 }     // 3+ cycles
  }
};


// ============================================================
// MAIN ENGINE
// ============================================================

function runGenerationalEngine_(ctx) {
  var sheet = ctx.ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };

  var iPopID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iBirthYear = idx('BirthYear');
  var iTier = idx('Tier');
  var iClock = idx('ClockMode');
  var iStatus = idx('Status');
  var iLife = idx('LifeHistory');
  var iLastU = idx('LastUpdated');
  var iTierRole = idx('TierRole');
  var iNeighborhood = idx('Neighborhood');
  
  // v2.2: Health tracking columns
  var iStatusStart = idx('StatusStartCycle');
  var iHealthCause = idx('HealthCause');

  var lifeLog = ctx.ss.getSheetByName('LifeHistory_Log');
  var cycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;
  var simYear = ctx.summary.simYear || (2040 + Math.floor(cycle / 12));
  
  // Calendar context
  var calendarContext = {
    holiday: ctx.summary.holiday || 'none',
    holidayPriority: ctx.summary.holidayPriority || 'none',
    isFirstFriday: ctx.summary.isFirstFriday || false,
    isCreationDay: ctx.summary.isCreationDay || false,
    sportsSeason: ctx.summary.sportsSeason || 'off-season',
    season: ctx.summary.season || 'unknown',
    month: ctx.summary.month || 0
  };
  ctx.generationalCalendarContext = calendarContext;
  
  ctx.summary.generationalEvents = [];
  
  var limits = getSeasonalLimits_(calendarContext);
  
  var counts = {
    graduations: 0,
    weddings: 0,
    births: 0,
    promotions: 0,
    retirements: 0,
    deaths: 0,
    recoveries: 0,
    deteriorations: 0
  };

  var updatedRows = {};

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    
    var popId = row[iPopID];
    var status = (row[iStatus] || 'active').toString().toLowerCase().trim();
    var birthYear = Number(row[iBirthYear]) || 0;
    var tier = Number(row[iTier]) || 0;
    var mode = row[iClock] || 'ENGINE';
    var tierRole = row[iTierRole] || '';
    var lifeHistory = row[iLife] ? row[iLife].toString() : '';
    var neighborhood = iNeighborhood >= 0 ? row[iNeighborhood] : '';
    
    // v2.2: Get status tracking
    var statusStartCycle = iStatusStart >= 0 ? (Number(row[iStatusStart]) || 0) : 0;
    var healthCause = iHealthCause >= 0 ? (row[iHealthCause] || '') : '';
    var statusDuration = statusStartCycle > 0 ? (cycle - statusStartCycle) : 0;
    
    // Skip deceased or non-engine
    if (status === 'deceased' || status === 'inactive') continue;
    if (mode !== 'ENGINE') continue;
    
    var age = birthYear ? (simYear - birthYear) : 0;
    var name = (row[iFirst] + ' ' + row[iLast]).trim();

    // ═══════════════════════════════════════════════════════════════════════
    // v2.2: HEALTH STATUS LIFECYCLE PROCESSING
    // ═══════════════════════════════════════════════════════════════════════
    
    if (status === 'hospitalized' || status === 'critical' || status === 'recovering') {
      var healthResult = processHealthLifecycle_(
        ctx, popId, name, status, statusDuration, age, tier, 
        healthCause, neighborhood, cycle, calendarContext
      );
      
      if (healthResult) {
        // Update status
        row[iStatus] = healthResult.newStatus;
        
        // Update status start cycle if status changed
        if (healthResult.newStatus !== status) {
          if (iStatusStart >= 0) {
            row[iStatusStart] = healthResult.newStatus === 'active' ? '' : cycle;
          }
        }
        
        // Clear health cause if recovered
        if (healthResult.newStatus === 'active' && iHealthCause >= 0) {
          row[iHealthCause] = '';
        }
        
        // Log the transition
        var transitionEvent = applyMilestone_(
          ctx, row, iLife, iLastU, healthResult, name, popId, 
          neighborhood, cycle, lifeLog, calendarContext
        );
        ctx.summary.generationalEvents.push(transitionEvent);
        
        // Track counts
        if (healthResult.newStatus === 'active') counts.recoveries++;
        if (healthResult.newStatus === 'deceased') counts.deaths++;
        if (healthResult.newStatus === 'critical') counts.deteriorations++;
        
        // Trigger cascades for death
        if (healthResult.newStatus === 'deceased') {
          triggerDeathCascade_(ctx, popId, name, tier, tierRole, neighborhood, cycle, calendarContext);
        }
        
        updatedRows[r] = true;
      }
      
      // Skip regular milestone checks for hospitalized citizens
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REGULAR MILESTONE CHECKS (for active citizens)
    // ═══════════════════════════════════════════════════════════════════════

    // --- GRADUATION ---
    if (counts.graduations < limits.graduations && birthYear) {
      var gradResult = checkGraduation_(ctx, popId, age, lifeHistory, tier, calendarContext);
      if (gradResult) {
        var event = applyMilestone_(ctx, row, iLife, iLastU, gradResult, name, popId, neighborhood, cycle, lifeLog, calendarContext);
        ctx.summary.generationalEvents.push(event);
        updatedRows[r] = true;
        counts.graduations++;
      }
    }

    // --- WEDDING ---
    if (counts.weddings < limits.weddings && birthYear) {
      var weddingResult = checkWedding_(ctx, popId, age, lifeHistory, calendarContext);
      if (weddingResult) {
        var wEvent = applyMilestone_(ctx, row, iLife, iLastU, weddingResult, name, popId, neighborhood, cycle, lifeLog, calendarContext);
        ctx.summary.generationalEvents.push(wEvent);
        if (weddingResult.spouseId) {
          createBond_(ctx, popId, weddingResult.spouseId, 'romantic', 'wedding', '', neighborhood, 'Married partners');
        }
        updatedRows[r] = true;
        counts.weddings++;
      }
    }

    // --- BIRTH ---
    if (counts.births < limits.births && birthYear) {
      var birthResult = checkBirth_(ctx, popId, age, lifeHistory, calendarContext);
      if (birthResult) {
        var bEvent = applyMilestone_(ctx, row, iLife, iLastU, birthResult, name, popId, neighborhood, cycle, lifeLog, calendarContext);
        ctx.summary.generationalEvents.push(bEvent);
        triggerBirthCascade_(ctx, popId, name, neighborhood, cycle, calendarContext);
        updatedRows[r] = true;
        counts.births++;
      }
    }

    // --- PROMOTION ---
    if (counts.promotions < limits.promotions && birthYear) {
      var promoResult = checkPromotion_(ctx, popId, age, lifeHistory, tier, tierRole, calendarContext);
      if (promoResult) {
        var pEvent = applyMilestone_(ctx, row, iLife, iLastU, promoResult, name, popId, neighborhood, cycle, lifeLog, calendarContext);
        ctx.summary.generationalEvents.push(pEvent);
        triggerPromotionCascade_(ctx, popId, promoResult, cycle);
        updatedRows[r] = true;
        counts.promotions++;
      }
    }

    // --- RETIREMENT ---
    if (counts.retirements < limits.retirements && birthYear) {
      var retireResult = checkRetirement_(ctx, popId, age, lifeHistory, tier, calendarContext);
      if (retireResult) {
        var rEvent = applyMilestone_(ctx, row, iLife, iLastU, retireResult, name, popId, neighborhood, cycle, lifeLog, calendarContext);
        ctx.summary.generationalEvents.push(rEvent);
        triggerRetirementCascade_(ctx, popId, name, tierRole, neighborhood, cycle, calendarContext);
        updatedRows[r] = true;
        counts.retirements++;
      }
    }

    // --- DEATH ---
    if (counts.deaths < limits.deaths && birthYear) {
      var deathResult = checkDeath_(ctx, popId, age, lifeHistory, tier, calendarContext);
      if (deathResult) {
        var dEvent = applyMilestone_(ctx, row, iLife, iLastU, deathResult, name, popId, neighborhood, cycle, lifeLog, calendarContext);
        ctx.summary.generationalEvents.push(dEvent);
        row[iStatus] = 'deceased';
        triggerDeathCascade_(ctx, popId, name, tier, tierRole, neighborhood, cycle, calendarContext);
        updatedRows[r] = true;
        counts.deaths++;
      }
    }

    // --- HEALTH EVENT (can lead to hospitalization) ---
    var healthResult2 = checkHealthEvent_(ctx, popId, age, lifeHistory, calendarContext);
    if (healthResult2) {
      var hEvent = applyMilestone_(ctx, row, iLife, iLastU, healthResult2, name, popId, neighborhood, cycle, lifeLog, calendarContext);
      ctx.summary.generationalEvents.push(hEvent);
      
      // v2.2: Severe health events can hospitalize
      if (healthResult2.severity === 'severe') {
        row[iStatus] = 'hospitalized';
        if (iStatusStart >= 0) row[iStatusStart] = cycle;
      }
      
      updatedRows[r] = true;
    }
  }

  // Write back updated rows
  var updatedCount = 0;
  for (var key in updatedRows) {
    if (updatedRows.hasOwnProperty(key)) {
      updatedCount++;
    }
  }
  
  if (updatedCount > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  generateGenerationalSummary_(ctx);
  
  Logger.log('runGenerationalEngine_ v2.2: ' + ctx.summary.generationalEvents.length + 
             ' events | Recoveries: ' + counts.recoveries + 
             ' | Deaths: ' + counts.deaths);
}


// ============================================================
// v2.2: HEALTH STATUS LIFECYCLE
// ============================================================

function processHealthLifecycle_(ctx, popId, name, currentStatus, duration, age, tier, cause, neighborhood, cycle, cal) {
  
  var transitions = HEALTH_TRANSITIONS[currentStatus];
  if (!transitions) return null;
  
  // Determine duration bracket
  var bracket;
  if (duration <= 2) {
    bracket = 'short';
  } else if (duration <= 4) {
    bracket = 'medium';
  } else {
    bracket = 'long';
  }
  
  // Get probabilities (medium only exists for hospitalized)
  var probs = transitions[bracket] || transitions['long'] || transitions['short'];
  if (!probs) return null;
  
  // Age modifier - older citizens have worse outcomes
  var ageModifier = 1.0;
  if (age >= 70) ageModifier = 1.3;
  if (age >= 80) ageModifier = 1.5;
  
  // Tier modifier - high-tier get better care
  var tierModifier = 1.0;
  if (tier <= 2) tierModifier = 0.8; // Better outcomes for high-tier
  
  // Calendar modifier - winter is harder
  var seasonModifier = 1.0;
  if (cal.season === 'winter') seasonModifier = 1.1;
  if (STRESS_HOLIDAYS.indexOf(cal.holiday) >= 0) seasonModifier *= 1.1;
  
  // Roll for outcome
  var roll = Math.random();
  var newStatus = currentStatus;
  var description = '';
  var tag = 'Health';
  
  if (currentStatus === 'hospitalized') {
    var criticalThreshold = probs.critical * ageModifier * seasonModifier * tierModifier;
    var recoverThreshold = criticalThreshold + (probs.recovering / ageModifier / tierModifier);
    
    if (roll < criticalThreshold) {
      newStatus = 'critical';
      description = name + "'s condition has worsened to critical";
      tag = 'Critical';
    } else if (roll < recoverThreshold) {
      newStatus = 'recovering';
      description = name + ' is now recovering and expected to be released soon';
      tag = 'Recovering';
    } else {
      // Stay hospitalized
      if (duration >= 5) {
        // Force a resolution after 5+ cycles
        if (Math.random() < 0.5) {
          newStatus = 'recovering';
          description = name + ' is finally showing signs of recovery after extended hospitalization';
          tag = 'Recovering';
        } else {
          newStatus = 'critical';
          description = name + "'s extended hospitalization has taken a turn for the worse";
          tag = 'Critical';
        }
      } else {
        return null; // No change
      }
    }
    
  } else if (currentStatus === 'critical') {
    var deceasedThreshold = probs.deceased * ageModifier * seasonModifier;
    var improveThreshold = deceasedThreshold + (probs.hospitalized / ageModifier);
    
    if (roll < deceasedThreshold) {
      newStatus = 'deceased';
      description = name + ' has passed away' + (cause ? ' due to complications from ' + cause : '');
      tag = 'Death';
    } else if (roll < improveThreshold) {
      newStatus = 'hospitalized';
      description = name + ' has stabilized and is no longer in critical condition';
      tag = 'Stabilized';
    } else {
      // Stay critical
      if (duration >= 3) {
        // Force resolution
        if (Math.random() < 0.6) {
          newStatus = 'deceased';
          description = name + ' has passed away after an extended critical illness';
          tag = 'Death';
        } else {
          newStatus = 'hospitalized';
          description = name + ' has miraculously stabilized after extended critical care';
          tag = 'Stabilized';
        }
      } else {
        return null;
      }
    }
    
  } else if (currentStatus === 'recovering') {
    var backToHospitalThreshold = probs.hospitalized * ageModifier;
    var fullRecoveryThreshold = backToHospitalThreshold + probs.active;
    
    if (roll < backToHospitalThreshold) {
      newStatus = 'hospitalized';
      description = name + ' has suffered a setback and been readmitted';
      tag = 'Setback';
    } else if (roll < fullRecoveryThreshold) {
      newStatus = 'active';
      description = name + ' has made a full recovery and returned to their duties';
      tag = 'Recovery';
    } else {
      // Stay recovering
      if (duration >= 3) {
        newStatus = 'active';
        description = name + ' has completed their recovery';
        tag = 'Recovery';
      } else {
        return null;
      }
    }
  }
  
  if (newStatus === currentStatus) return null;
  
  return {
    type: MILESTONE_TYPES.HEALTH_EVENT,
    tag: tag,
    description: description,
    newStatus: newStatus,
    previousStatus: currentStatus,
    duration: duration,
    cause: cause,
    season: cal.season
  };
}


// ============================================================
// SEASONAL LIMITS
// ============================================================

function getSeasonalLimits_(cal) {
  var limits = {
    graduations: 2,
    weddings: 1,
    births: 1,
    promotions: 2,
    retirements: 1,
    deaths: 1
  };
  
  if (cal.season === 'spring' || cal.month === 5 || cal.month === 6) {
    limits.graduations = 4;
  }
  
  if (cal.month === 6 || cal.season === 'spring' || cal.season === 'summer') {
    limits.weddings = 2;
  }
  if (WEDDING_BOOST_HOLIDAYS.indexOf(cal.holiday) >= 0) {
    limits.weddings = 2;
  }
  
  if (cal.month === 9) {
    limits.births = 2;
  }
  
  if (cal.month === 12 || cal.month === 1) {
    limits.retirements = 2;
  }
  
  return limits;
}


// ============================================================
// MILESTONE CHECKS (unchanged from v2.1)
// ============================================================

function checkGraduation_(ctx, popId, age, lifeHistory, tier, cal) {
  if (lifeHistory.indexOf('[Graduation]') >= 0) return null;
  if (age < AGE_RANGES.GRADUATION.min || age > AGE_RANGES.GRADUATION.max) return null;
  
  var chance = 0.005;
  if (tier >= 3) chance = 0.01;
  if (age >= 24 && age <= 26) chance += 0.005;
  
  if (cal.season === 'spring') {
    chance *= 3.0;
  }
  if (cal.month === 5 || cal.month === 6) {
    chance *= 2.0;
  }
  
  if (Math.random() >= chance) return null;
  
  var types = cal.season === 'spring' ? [
    "walked across the stage at their commencement ceremony",
    "graduated with their class in a joyful spring celebration",
    "received their diploma at the outdoor commencement",
    "completed their studies with the spring graduating class"
  ] : [
    "completed their university studies",
    "graduated with honors from their program",
    "finished their professional certification",
    "earned their advanced degree"
  ];
  
  return {
    type: MILESTONE_TYPES.GRADUATION,
    description: types[Math.floor(Math.random() * types.length)],
    tag: 'Graduation',
    season: cal.season
  };
}

function checkWedding_(ctx, popId, age, lifeHistory, cal) {
  if (lifeHistory.indexOf('[Wedding]') >= 0 && lifeHistory.indexOf('[Divorce]') < 0) return null;
  if (age < AGE_RANGES.WEDDING.min || age > AGE_RANGES.WEDDING.max) return null;
  
  var chance = 0.002;
  if (age >= 28 && age <= 35) chance = 0.004;
  if (age > 40) chance = 0.001;
  
  if (cal.month === 6) {
    chance *= 3.0;
  } else if (cal.season === 'spring' || cal.season === 'summer') {
    chance *= 2.0;
  }
  
  if (cal.holiday === 'ValentinesDay') {
    chance *= 2.5;
  }
  if (cal.holiday === 'NewYearsEve') {
    chance *= 1.5;
  }
  
  var bonds = getCitizenBondsFromStorage_(ctx, popId);
  var romanticBond = null;
  for (var i = 0; i < bonds.length; i++) {
    if (bonds[i].bondType === 'romantic') {
      romanticBond = bonds[i];
      break;
    }
  }
  if (romanticBond) {
    chance += 0.01;
  }
  
  if (Math.random() >= chance) return null;
  
  var descriptions;
  if (cal.month === 6) {
    descriptions = [
      "celebrated a beautiful June wedding",
      "tied the knot in a classic June ceremony",
      "married their sweetheart in a summer garden wedding"
    ];
  } else if (cal.season === 'spring') {
    descriptions = [
      "celebrated their wedding amid spring blossoms",
      "married in a beautiful spring ceremony",
      "exchanged vows in a springtime celebration"
    ];
  } else {
    descriptions = [
      "celebrated their wedding with close friends and family",
      "entered into a committed partnership",
      "tied the knot in an intimate ceremony"
    ];
  }
  
  return {
    type: MILESTONE_TYPES.WEDDING,
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    tag: 'Wedding',
    spouseId: romanticBond ? (romanticBond.citizenA === popId ? romanticBond.citizenB : romanticBond.citizenA) : null,
    season: cal.season
  };
}

function checkBirth_(ctx, popId, age, lifeHistory, cal) {
  if (age < AGE_RANGES.BIRTH.min || age > AGE_RANGES.BIRTH.max) return null;
  if (lifeHistory.indexOf('[Wedding]') < 0) return null;
  
  var childMatches = lifeHistory.match(/\[Birth\]/g);
  var childCount = childMatches ? childMatches.length : 0;
  if (childCount >= 3) return null;
  
  var chance = 0.003 - (childCount * 0.001);
  if (age >= 28 && age <= 35) chance += 0.002;
  if (age > 38) chance -= 0.001;
  
  if (cal.month === 9) {
    chance *= 2.0;
  }
  if (cal.month >= 7 && cal.month <= 10) {
    chance *= 1.3;
  }
  
  if (chance < 0.0005) chance = 0.0005;
  if (Math.random() >= chance) return null;
  
  var descriptions = [
    "welcomed a new child into their family",
    "became a parent for the " + getOrdinal_(childCount + 1) + " time",
    "celebrated the birth of their child"
  ];
  
  return {
    type: MILESTONE_TYPES.BIRTH,
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    tag: 'Birth',
    childNumber: childCount + 1,
    season: cal.season
  };
}

function checkPromotion_(ctx, popId, age, lifeHistory, tier, tierRole, cal) {
  if (age < AGE_RANGES.PROMOTION.min || age > AGE_RANGES.PROMOTION.max) return null;
  
  var recentPromo = lifeHistory.slice(-2000).indexOf('[Promotion]') >= 0;
  if (recentPromo) return null;
  
  var chance = 0.002;
  if (tier === 3) chance = 0.003;
  if (tier === 4) chance = 0.004;
  if (tier <= 2) chance = 0.001;
  
  if (cal.month === 1 || cal.month === 12) {
    chance *= 1.5;
  }
  
  if (Math.random() >= chance) return null;
  
  var descriptions = [
    "received a significant promotion",
    "advanced to a senior position",
    "was recognized with increased responsibilities"
  ];
  
  return {
    type: MILESTONE_TYPES.PROMOTION,
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    tag: 'Promotion',
    previousRole: tierRole,
    season: cal.season
  };
}

function checkRetirement_(ctx, popId, age, lifeHistory, tier, cal) {
  if (lifeHistory.indexOf('[Retirement]') >= 0) return null;
  if (age < AGE_RANGES.RETIREMENT.min) return null;
  
  var chance = 0.001;
  if (age >= 62) chance = 0.005;
  if (age >= 65) chance = 0.01;
  if (age >= 68) chance = 0.02;
  if (age >= 70) chance = 0.05;
  
  if (tier >= 4) chance *= 0.5;
  
  if (cal.month === 12) {
    chance *= 2.0;
  }
  if (cal.month === 1) {
    chance *= 1.5;
  }
  
  if (Math.random() >= chance) return null;
  
  var descriptions = [
    "announced their retirement after a long career",
    "stepped back from professional life",
    "transitioned into retirement"
  ];
  
  return {
    type: MILESTONE_TYPES.RETIREMENT,
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    tag: 'Retirement',
    season: cal.season
  };
}

function checkDeath_(ctx, popId, age, lifeHistory, tier, cal) {
  var chance = 0.0001;
  
  if (age >= 65) chance = 0.001;
  if (age >= 75) chance = 0.005;
  if (age >= 80) chance = 0.01;
  if (age >= 85) chance = 0.02;
  if (age >= 90) chance = 0.05;
  
  if (lifeHistory.indexOf('[Health]') >= 0) chance *= 1.5;
  
  if (cal.season === 'winter') {
    chance *= 1.3;
  }
  
  if (STRESS_HOLIDAYS.indexOf(cal.holiday) >= 0 && age >= 70) {
    chance *= 1.2;
  }
  
  if (Math.random() < 0.0002) chance = 0.01;
  
  if (Math.random() >= chance) return null;
  
  var descriptions = age >= 75 ? [
    "passed away peacefully",
    "died surrounded by family",
    "concluded their life's journey"
  ] : [
    "passed away unexpectedly",
    "died after a sudden illness",
    "was lost to the community"
  ];
  
  return {
    type: MILESTONE_TYPES.DEATH,
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    tag: 'Death',
    age: age,
    season: cal.season
  };
}

function checkHealthEvent_(ctx, popId, age, lifeHistory, cal) {
  var chance = 0.0005;
  if (age >= 50) chance = 0.001;
  if (age >= 60) chance = 0.002;
  if (age >= 70) chance = 0.003;
  
  if (cal.season === 'winter') {
    chance *= 1.5;
  }
  
  if (STRESS_HOLIDAYS.indexOf(cal.holiday) >= 0) {
    chance *= 1.4;
  }
  
  if (cal.month === 1) {
    chance *= 1.3;
  }
  
  var healthMatches = lifeHistory.match(/\[Health\]/g);
  var healthCount = healthMatches ? healthMatches.length : 0;
  if (healthCount >= 3) return null;
  
  if (Math.random() >= chance) return null;
  
  // v2.2: Determine severity
  var severity = 'minor';
  var severityRoll = Math.random();
  if (severityRoll < 0.05) {
    severity = 'severe'; // 5% chance of hospitalization
  } else if (severityRoll < 0.20) {
    severity = 'moderate';
  }
  
  var descriptions;
  if (severity === 'severe') {
    descriptions = [
      "was hospitalized for a serious medical condition",
      "required emergency medical care",
      "was admitted to the hospital"
    ];
  } else if (cal.season === 'winter') {
    descriptions = [
      "recovered from a winter illness",
      "dealt with a seasonal health concern",
      "took time to recover from the flu"
    ];
  } else {
    descriptions = [
      "dealt with a minor health concern",
      "took time to address a medical issue",
      "prioritized their health after a scare"
    ];
  }
  
  return {
    type: MILESTONE_TYPES.HEALTH_EVENT,
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    tag: 'Health',
    severity: severity,
    season: cal.season
  };
}


// ============================================================
// CASCADE EFFECTS
// ============================================================

function triggerBirthCascade_(ctx, parentId, parentName, neighborhood, cycle, cal) {
  ctx.summary.pendingCascades = ctx.summary.pendingCascades || [];
  ctx.summary.pendingCascades.push({
    type: 'birth_adjustment',
    citizenId: parentId,
    neighborhood: neighborhood,
    effect: 'priority_shift',
    duration: 5,
    cycleCreated: cycle,
    season: cal.season
  });
}

function triggerPromotionCascade_(ctx, promotedId, result, cycle) {
  var bonds = ctx.summary.relationshipBonds || [];
  
  for (var i = 0; i < bonds.length; i++) {
    var bond = bonds[i];
    if (!bond) continue;
    if (bond.citizenA !== promotedId && bond.citizenB !== promotedId) continue;
    
    if (bond.bondType === 'rivalry') {
      bond.intensity = Math.min(10, (bond.intensity || 0) + 1);
      bond.notes = (bond.notes || '') + ' [Promotion tension C' + cycle + ']';
      bond.lastUpdate = cycle;
    }
    if (bond.bondType === 'alliance') {
      bond.intensity = Math.min(10, (bond.intensity || 0) + 0.5);
      bond.lastUpdate = cycle;
    }
  }
}

function triggerRetirementCascade_(ctx, retiredId, name, tierRole, neighborhood, cycle, cal) {
  var arcs = ctx.summary.eventArcs || [];
  var hasVacuumArc = false;
  for (var i = 0; i < arcs.length; i++) {
    if (arcs[i] && arcs[i].type === 'power-vacuum' && arcs[i].phase !== 'resolved') {
      hasVacuumArc = true;
      break;
    }
  }
  
  var arcNeighborhood = neighborhood || (tierRole && tierRole.indexOf('CIV') >= 0 ? 'Downtown' : 'Rockridge');
  
  if (!hasVacuumArc && Math.random() < 0.3) {
    var newArc = {
      arcId: Utilities.getUuid().slice(0, 8),
      type: 'power-vacuum',
      phase: 'early',
      tension: 3,
      neighborhood: arcNeighborhood,
      domainTag: tierRole || 'CAREER',
      summary: name + "'s retirement leaves a void in leadership.",
      involvedCitizens: [],
      cycleCreated: cycle,
      cycleResolved: null,
      season: cal.season
    };
    ctx.summary.eventArcs = ctx.summary.eventArcs || [];
    ctx.summary.eventArcs.push(newArc);
  }
}

function triggerDeathCascade_(ctx, deceasedId, name, tier, tierRole, neighborhood, cycle, cal) {
  var bonds = ctx.summary.relationshipBonds || [];
  
  for (var i = 0; i < bonds.length; i++) {
    var bond = bonds[i];
    if (!bond) continue;
    if (bond.citizenA !== deceasedId && bond.citizenB !== deceasedId) continue;
    
    bond.status = 'severed';
    bond.notes = (bond.notes || '') + ' [' + name + ' deceased C' + cycle + ']';
    bond.lastUpdate = cycle;
    
    if (bond.bondType === 'alliance' || bond.bondType === 'mentorship') {
      var survivorId = bond.citizenA === deceasedId ? bond.citizenB : bond.citizenA;
      ctx.summary.pendingCascades = ctx.summary.pendingCascades || [];
      
      var griefDuration = 3;
      if (STRESS_HOLIDAYS.indexOf(cal.holiday) >= 0) {
        griefDuration = 5;
      }
      
      ctx.summary.pendingCascades.push({
        type: 'grief',
        citizenId: survivorId,
        effect: 'grief_period',
        duration: griefDuration,
        note: 'Mourning ' + name,
        cycleCreated: cycle,
        holiday: cal.holiday,
        season: cal.season
      });
    }
  }
  
  var arcNeighborhood = neighborhood || 'Downtown';
  
  if (tier <= 2) {
    var vacuumArc = {
      arcId: Utilities.getUuid().slice(0, 8),
      type: 'power-vacuum',
      phase: 'early',
      tension: 5,
      neighborhood: arcNeighborhood,
      domainTag: tierRole || 'LEADERSHIP',
      summary: name + "'s death creates a significant void.",
      involvedCitizens: [],
      cycleCreated: cycle,
      cycleResolved: null,
      season: cal.season
    };
    ctx.summary.eventArcs = ctx.summary.eventArcs || [];
    ctx.summary.eventArcs.push(vacuumArc);
  }
  
  if (Math.random() < 0.2) {
    var inheritArc = {
      arcId: Utilities.getUuid().slice(0, 8),
      type: 'inheritance',
      phase: 'early',
      tension: 4,
      neighborhood: arcNeighborhood,
      domainTag: 'FAMILY',
      summary: 'Questions arise about ' + name + "'s legacy and estate.",
      involvedCitizens: [],
      cycleCreated: cycle,
      cycleResolved: null,
      season: cal.season
    };
    ctx.summary.eventArcs = ctx.summary.eventArcs || [];
    ctx.summary.eventArcs.push(inheritArc);
  }
}


// ============================================================
// SUMMARY
// ============================================================

function generateGenerationalSummary_(ctx) {
  var events = ctx.summary.generationalEvents || [];
  var cascades = ctx.summary.pendingCascades || [];
  var cal = ctx.generationalCalendarContext || {};
  
  var summary = {
    totalEvents: events.length,
    byType: {},
    pendingCascades: cascades.length,
    deaths: [],
    weddings: [],
    promotions: [],
    graduations: [],
    births: [],
    recoveries: [],
    hospitalizations: [],
    calendarContext: {
      holiday: cal.holiday || 'none',
      season: cal.season || 'unknown',
      month: cal.month || 0
    }
  };
  
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var type = e.type || e.tag || 'unknown';
    summary.byType[type] = (summary.byType[type] || 0) + 1;
    
    if (e.tag === 'Death') summary.deaths.push(e.citizen);
    if (e.tag === 'Wedding') summary.weddings.push(e.citizen);
    if (e.tag === 'Promotion') summary.promotions.push(e.citizen);
    if (e.tag === 'Graduation') summary.graduations.push(e.citizen);
    if (e.tag === 'Birth') summary.births.push(e.citizen);
    if (e.tag === 'Recovery') summary.recoveries.push(e.citizen);
    if (e.newStatus === 'hospitalized') summary.hospitalizations.push(e.citizen);
  }
  
  ctx.summary.generationalSummary = summary;
}


// ============================================================
// HELPERS
// ============================================================

function applyMilestone_(ctx, row, iLife, iLastU, milestone, name, popId, neighborhood, cycle, lifeLog, cal) {
  var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  var existing = row[iLife] ? row[iLife].toString() : "";
  var line = stamp + " — [" + milestone.tag + "] " + milestone.description;
  
  row[iLife] = existing ? existing + "\n" + line : line;
  row[iLastU] = ctx.now;
  
  if (lifeLog) {
    lifeLog.appendRow([
      ctx.now,
      popId,
      name,
      milestone.tag,
      milestone.description,
      neighborhood || '',
      cycle,
      cal.holiday || 'none',
      cal.season || 'unknown'
    ]);
  }
  
  return {
    type: milestone.type,
    tag: milestone.tag,
    citizen: name,
    popId: popId,
    neighborhood: neighborhood || '',
    description: milestone.description,
    cycle: cycle,
    holiday: cal.holiday || 'none',
    season: cal.season || 'unknown',
    newStatus: milestone.newStatus || null
  };
}

function getOrdinal_(n) {
  var s = ["th", "st", "nd", "rd"];
  var v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getCitizenBondsFromStorage_(ctx, citizenId) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.status === 'active' &&
        (b.citizenA === citizenId || b.citizenB === citizenId)) {
      result.push(b);
    }
  }
  return result;
}

// Placeholder for bond creation (may exist elsewhere)
function createBond_(ctx, citizenA, citizenB, bondType, source, arcId, neighborhood, notes) {
  // Implementation depends on existing bond engine
  ctx.summary.relationshipBonds = ctx.summary.relationshipBonds || [];
  ctx.summary.relationshipBonds.push({
    citizenA: citizenA,
    citizenB: citizenB,
    bondType: bondType,
    source: source,
    arcId: arcId,
    neighborhood: neighborhood,
    notes: notes,
    status: 'active',
    intensity: 5
  });
}


/**
 * ============================================================================
 * REFERENCE v2.2
 * ============================================================================
 * 
 * HEALTH STATUS LIFECYCLE:
 * 
 * | Status | Duration | Outcomes |
 * |--------|----------|----------|
 * | hospitalized | 1-2 cycles | 40% recovering, 10% critical, 50% stay |
 * | hospitalized | 3-4 cycles | 50% recovering, 15% critical, 35% stay |
 * | hospitalized | 5+ cycles | FORCED: 60% recovering OR 40% critical |
 * | critical | 1-2 cycles | 30% hospitalized, 40% deceased, 30% stay |
 * | critical | 3+ cycles | FORCED: 40% hospitalized OR 60% deceased |
 * | recovering | 1-2 cycles | 70% active, 10% hospitalized, 20% stay |
 * | recovering | 3+ cycles | FORCED: 95% active |
 * 
 * NEW COLUMNS REQUIRED IN SIMULATION_LEDGER:
 * - StatusStartCycle (number): Cycle when current status began
 * - HealthCause (string): Assigned by Media Room via intake
 * 
 * MODIFIERS:
 * - Age 70+: 1.3x worse outcomes
 * - Age 80+: 1.5x worse outcomes
 * - Tier 1-2: 0.8x (better care)
 * - Winter: 1.1x worse
 * - Stress holidays: 1.1x worse
 * 
 * ============================================================================
 */