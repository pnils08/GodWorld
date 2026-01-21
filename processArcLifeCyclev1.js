/**
 * ============================================================================
 * ARC RESOLUTION SYSTEM v1.1
 * ============================================================================
 * 
 * v1.1 Enhancements:
 * - Condition-based resolution (checks actual metrics, not just age)
 * - Health arcs resolve when illness rate drops
 * - Economic arcs resolve when mood improves
 * - Calendar-aware resolution timing
 * - Holidays can accelerate or delay resolution
 * - Integration with crisis bucket resolution conditions
 * - Prevents "stuck" arcs by checking actual world state
 *
 * LIFECYCLE:
 * Age 0:     SPAWN      → phase: early, tension: base
 * Age 1-3:   DEVELOP    → phase: early/rising, tension: ±drift
 * Age 4-6:   PEAK       → phase: rising/peak, tension: max
 * Age 7-10:  RESOLVE    → phase: falling, tension: declining
 * Age 11+:   FADE       → phase: resolved OR persist (Maker override)
 * 
 * CONDITION-BASED RESOLUTION (v1.1):
 * - health-crisis: resolves if illnessRate < 0.05
 * - economic-crisis: resolves if economicMood > 55
 * - demographic: resolves if |migration| < 80
 * - pattern-wave: resolves if sentiment > -0.15
 * - crisis: resolves after age 8 or conditions improve
 * 
 * ============================================================================
 */


/**
 * Main function — process all active arcs
 */
function processArcLifecycle_(ctx) {
  
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount || 0;
  var arcs = ctx.summary.eventArcs || ctx.v3Arcs || [];
  var S = ctx.summary;
  
  if (!arcs.length) {
    Logger.log('processArcLifecycle_: No arcs to process');
    return;
  }
  
  Logger.log('processArcLifecycle_ v1.1: Processing ' + arcs.length + ' arcs');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v1.1: GATHER WORLD STATE FOR CONDITION CHECKING
  // ═══════════════════════════════════════════════════════════════════════════
  var worldState = gatherWorldState_(ctx);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v1.1: CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var calendarContext = {
    holiday: S.holiday || 'none',
    holidayPriority: S.holidayPriority || 'none',
    isFirstFriday: S.isFirstFriday || false,
    isCreationDay: S.isCreationDay || false,
    sportsSeason: S.sportsSeason || 'off-season',
    season: S.season || 'unknown'
  };
  
  var resolutions = [];
  var phaseChanges = [];
  
  for (var i = 0; i < arcs.length; i++) {
    var arc = arcs[i];
    if (!arc || arc.phase === 'resolved') continue;
    
    var prevPhase = arc.phase;
    var prevTension = arc.tension || arc.arcStrength || 0;
    
    // ═══════════════════════════════════════════════════════════════════════
    // CHECK OVERRIDE FLAGS
    // ═══════════════════════════════════════════════════════════════════════
    
    if (arc.makerHold) {
      Logger.log('processArcLifecycle_: Arc ' + arc.arcId + ' has makerHold, skipping');
      continue;
    }
    
    if (arc.forceResolve) {
      arc.phase = 'resolved';
      arc.resolutionType = 'resolved-intervention';
      arc.resolutionCycle = cycle;
      resolutions.push(arc);
      Logger.log('processArcLifecycle_: Force resolved arc ' + arc.arcId);
      continue;
    }
    
    if (arc.escalate) {
      arc.tension = (arc.tension || 0) + 2;
      arc.escalate = false;
      Logger.log('processArcLifecycle_: Escalated arc ' + arc.arcId + ' tension to ' + arc.tension);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // AGE THE ARC
    // ═══════════════════════════════════════════════════════════════════════
    
    arc.age = (arc.age || 0) + 1;
    
    // ═══════════════════════════════════════════════════════════════════════
    // v1.1: CONDITION-BASED RESOLUTION CHECK
    // ═══════════════════════════════════════════════════════════════════════
    
    var conditionResolution = checkConditionResolution_(arc, worldState, calendarContext);
    
    if (conditionResolution.shouldResolve) {
      arc.phase = 'resolved';
      arc.resolutionType = conditionResolution.resolutionType;
      arc.resolutionCycle = cycle;
      arc.resolutionReason = conditionResolution.reason;
      resolutions.push(arc);
      Logger.log('processArcLifecycle_: Condition-resolved arc ' + arc.arcId + ' - ' + conditionResolution.reason);
      continue;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // TENSION DRIFT (v1.1: calendar-aware)
    // ═══════════════════════════════════════════════════════════════════════
    
    var tensionDrift = calculateTensionDrift_(arc, worldState, calendarContext);
    
    arc.tension = Math.max(0, Math.min(10, (arc.tension || 0) + tensionDrift));
    arc.tension = Math.round(arc.tension * 100) / 100;
    
    // ═══════════════════════════════════════════════════════════════════════
    // PHASE TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    var newPhase = determinePhase_(arc);
    
    if (newPhase !== prevPhase) {
      arc.prevPhase = prevPhase;
      arc.phase = newPhase;
      arc.phaseChangeCycle = cycle;
      
      phaseChanges.push({
        arcId: arc.arcId,
        type: arc.type,
        neighborhood: arc.neighborhood,
        fromPhase: prevPhase,
        toPhase: newPhase,
        tension: arc.tension,
        age: arc.age
      });
      
      Logger.log('processArcLifecycle_: Arc ' + arc.arcId + ' phase: ' + prevPhase + ' → ' + newPhase);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // CHECK FOR AGE-BASED RESOLUTION
    // ═══════════════════════════════════════════════════════════════════════
    
    if (arc.phase === 'resolved') {
      arc.resolutionType = 'resolved-natural';
      arc.resolutionCycle = cycle;
      resolutions.push(arc);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE RESOLUTION STORY SEEDS
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (resolutions.length > 0) {
    ctx.summary.storySeeds = ctx.summary.storySeeds || [];
    
    for (var r = 0; r < resolutions.length; r++) {
      var resolved = resolutions[r];
      
      ctx.summary.storySeeds.push({
        type: 'arc-resolution',
        domain: resolved.domainTag || resolved.domain || 'GENERAL',
        neighborhood: resolved.neighborhood,
        text: getResolutionText_(resolved),
        priority: 'high',
        linkedArc: resolved.arcId,
        resolutionType: resolved.resolutionType,
        resolutionReason: resolved.resolutionReason
      });
      
      Logger.log('processArcLifecycle_: Generated resolution seed for arc ' + resolved.arcId);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STORE RESULTS IN CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  
  ctx.summary.arcResolutions = resolutions;
  ctx.summary.arcPhaseChanges = phaseChanges;
  
  if (resolutions.length > 0 || phaseChanges.length > 0) {
    updateArcLedger_(ss, arcs, cycle);
  }
  
  Logger.log('processArcLifecycle_ v1.1: Complete. Resolutions: ' + resolutions.length + ', Phase changes: ' + phaseChanges.length);
}


// ═══════════════════════════════════════════════════════════════════════════
// v1.1: GATHER WORLD STATE
// ═══════════════════════════════════════════════════════════════════════════

function gatherWorldState_(ctx) {
  var S = ctx.summary || {};
  var ss = ctx.ss;
  
  // Get World_Population data
  var illnessRate = 0.05;
  var employmentRate = 0.91;
  var migration = 0;
  
  var popSheet = ss.getSheetByName('World_Population');
  if (popSheet) {
    var popVals = popSheet.getDataRange().getValues();
    var header = popVals[0];
    var row = popVals[1];
    
    var idx = function(n) { return header.indexOf(n); };
    illnessRate = Number(row[idx('illnessRate')] || 0.05);
    employmentRate = Number(row[idx('employmentRate')] || 0.91);
    migration = Number(row[idx('migration')] || 0);
  }
  
  return {
    illnessRate: illnessRate,
    employmentRate: employmentRate,
    migration: migration,
    economicMood: S.economicMood || 50,
    sentiment: (S.cityDynamics || {}).sentiment || 0,
    weatherImpact: (S.weather || {}).impact || 1,
    chaosCount: (S.worldEvents || []).length
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// v1.1: CONDITION-BASED RESOLUTION CHECK
// ═══════════════════════════════════════════════════════════════════════════

function checkConditionResolution_(arc, worldState, calendar) {
  var type = arc.type || 'crisis';
  var age = arc.age || 0;
  var tension = arc.tension || 0;
  var domain = arc.domainTag || arc.domain || '';
  
  var result = {
    shouldResolve: false,
    resolutionType: 'resolved-natural',
    reason: ''
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // HEALTH CRISIS: Resolves when illness rate drops
  // ─────────────────────────────────────────────────────────────────────────
  if (type === 'health-crisis' || domain === 'HEALTH') {
    if (worldState.illnessRate < 0.05) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-condition';
      result.reason = 'illness rate dropped to ' + worldState.illnessRate.toFixed(3);
      return result;
    }
    
    // Accelerated resolution if age >= 4 and illness improving
    if (age >= 4 && worldState.illnessRate < 0.06 && tension < 4) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-condition';
      result.reason = 'health conditions stabilized';
      return result;
    }
    
    // Calendar: end of winter can resolve winter health crises
    if (calendar.season === 'spring' && arc.seasonContext === 'Winter' && age >= 3) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-calendar';
      result.reason = 'seasonal transition ended winter health concerns';
      return result;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // ECONOMIC CRISIS: Resolves when mood improves
  // ─────────────────────────────────────────────────────────────────────────
  if (type === 'economic-crisis' || domain === 'ECONOMIC') {
    if (worldState.economicMood > 55) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-condition';
      result.reason = 'economic mood recovered to ' + worldState.economicMood.toFixed(1);
      return result;
    }
    
    // Championship/holiday shopping can accelerate resolution
    if (calendar.sportsSeason === 'championship' && age >= 2 && tension < 5) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-calendar';
      result.reason = 'championship economic boost';
      return result;
    }
    
    var shoppingHolidays = ['Holiday', 'BlackFriday', 'Thanksgiving'];
    if (shoppingHolidays.indexOf(calendar.holiday) >= 0 && age >= 2 && tension < 5) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-calendar';
      result.reason = 'holiday shopping boost';
      return result;
    }
    
    // Employment recovery
    if (worldState.employmentRate > 0.92 && age >= 3) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-condition';
      result.reason = 'employment rate recovered';
      return result;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // DEMOGRAPHIC: Resolves when migration stabilizes
  // ─────────────────────────────────────────────────────────────────────────
  if (type === 'demographic' || domain === 'CIVIC') {
    if (Math.abs(worldState.migration) < 80) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-condition';
      result.reason = 'migration stabilized at ' + worldState.migration;
      return result;
    }
    
    // Post-holiday travel settling
    var travelHolidays = ['Thanksgiving', 'Holiday', 'NewYear'];
    if (travelHolidays.indexOf(arc.holidayContext) >= 0 && 
        travelHolidays.indexOf(calendar.holiday) < 0 && age >= 2) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-calendar';
      result.reason = 'holiday travel period ended';
      return result;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PATTERN-WAVE (Safety): Resolves when sentiment improves
  // ─────────────────────────────────────────────────────────────────────────
  if (type === 'pattern-wave' || domain === 'SAFETY') {
    if (worldState.sentiment > -0.15) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-condition';
      result.reason = 'community sentiment improved to ' + worldState.sentiment.toFixed(2);
      return result;
    }
    
    // First Friday / community events can help
    if (calendar.isFirstFriday && age >= 3 && tension < 4) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-calendar';
      result.reason = 'community engagement improved situation';
      return result;
    }
    
    // Creation Day peace
    if (calendar.isCreationDay && age >= 2 && tension < 5) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-calendar';
      result.reason = 'Creation Day brought community peace';
      return result;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // INFRASTRUCTURE: Resolves when weather calms
  // ─────────────────────────────────────────────────────────────────────────
  if (domain === 'INFRASTRUCTURE') {
    if (worldState.weatherImpact < 1.1 && age >= 2) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-condition';
      result.reason = 'weather conditions normalized';
      return result;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // GENERIC CRISIS: Standard age/tension resolution
  // ─────────────────────────────────────────────────────────────────────────
  if (type === 'crisis') {
    // Faster resolution if low chaos
    if (worldState.chaosCount < 2 && age >= 4 && tension < 3) {
      result.shouldResolve = true;
      result.resolutionType = 'resolved-condition';
      result.reason = 'city calm allowed resolution';
      return result;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // FORCED RESOLUTION: Prevent eternal arcs (age 12+)
  // ─────────────────────────────────────────────────────────────────────────
  if (age >= 12 && tension < 3) {
    result.shouldResolve = true;
    result.resolutionType = 'resolved-timeout';
    result.reason = 'arc exceeded maximum duration';
    return result;
  }
  
  return result;
}


// ═══════════════════════════════════════════════════════════════════════════
// v1.1: CALENDAR-AWARE TENSION DRIFT
// ═══════════════════════════════════════════════════════════════════════════

function calculateTensionDrift_(arc, worldState, calendar) {
  var age = arc.age || 0;
  var type = arc.type || 'crisis';
  var domain = arc.domainTag || arc.domain || '';
  
  // Base drift: slight upward bias early, downward later
  var drift;
  if (age <= 3) {
    drift = (Math.random() - 0.35) * 1.3;  // Upward bias
  } else if (age <= 6) {
    drift = (Math.random() - 0.5) * 1.2;   // Neutral
  } else {
    drift = (Math.random() - 0.65) * 1.5;  // Downward bias
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CALENDAR MODIFIERS
  // ─────────────────────────────────────────────────────────────────────────
  
  // Peaceful holidays reduce tension faster
  var peacefulHolidays = ['Thanksgiving', 'Holiday', 'MothersDay', 'FathersDay', 'Easter'];
  if (peacefulHolidays.indexOf(calendar.holiday) >= 0) {
    drift -= 0.3;
  }
  
  // First Friday community energy helps
  if (calendar.isFirstFriday) {
    drift -= 0.2;
  }
  
  // Creation Day calms everything
  if (calendar.isCreationDay) {
    drift -= 0.4;
  }
  
  // Crowd holidays can increase tension for safety arcs
  var crowdHolidays = ['Independence', 'NewYearsEve', 'Halloween'];
  if (crowdHolidays.indexOf(calendar.holiday) >= 0 && (type === 'pattern-wave' || domain === 'SAFETY')) {
    drift += 0.4;
  }
  
  // Championship can increase economic arc tension (more activity)
  if (calendar.sportsSeason === 'championship' && (type === 'economic-crisis' || domain === 'ECONOMIC')) {
    drift -= 0.5;  // Actually helps resolve economic issues
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // WORLD STATE MODIFIERS
  // ─────────────────────────────────────────────────────────────────────────
  
  // Health arcs: illness rate affects tension
  if (type === 'health-crisis' || domain === 'HEALTH') {
    if (worldState.illnessRate > 0.07) {
      drift += 0.3;  // Worsening
    } else if (worldState.illnessRate < 0.05) {
      drift -= 0.4;  // Improving
    }
  }
  
  // Economic arcs: mood affects tension
  if (type === 'economic-crisis' || domain === 'ECONOMIC') {
    if (worldState.economicMood < 35) {
      drift += 0.3;
    } else if (worldState.economicMood > 55) {
      drift -= 0.4;
    }
  }
  
  // Safety arcs: sentiment affects tension
  if (type === 'pattern-wave' || domain === 'SAFETY') {
    if (worldState.sentiment < -0.4) {
      drift += 0.3;
    } else if (worldState.sentiment > -0.1) {
      drift -= 0.3;
    }
  }
  
  return drift;
}


/**
 * Determine phase based on age and tension
 */
function determinePhase_(arc) {
  var age = arc.age || 0;
  var tension = arc.tension || 0;
  
  // Auto-resolve conditions (more lenient in v1.1 since conditions are checked separately)
  if (age >= 11 && tension < 2) {
    return 'resolved';
  }
  
  if (tension < 1.0 && age >= 5) {
    return 'resolved';
  }
  
  // Phase transitions
  if (arc.phase === 'early') {
    if (age >= 2 && tension >= 4) {
      return 'rising';
    }
  }
  
  if (arc.phase === 'rising') {
    if (age >= 4 && tension >= 6) {
      return 'peak';
    }
    if (tension < 3) {
      return 'falling';
    }
  }
  
  if (arc.phase === 'peak') {
    if (age >= 7 || tension < 5) {
      return 'falling';
    }
  }
  
  if (arc.phase === 'falling') {
    if (age >= 10 || tension < 2) {
      return 'resolved';
    }
  }
  
  return arc.phase || 'early';
}


/**
 * Generate resolution text for story seed (v1.1: with reason)
 */
function getResolutionText_(arc) {
  var type = arc.type || 'event';
  var neighborhood = arc.neighborhood || 'the area';
  var reason = arc.resolutionReason || '';
  var resType = arc.resolutionType || 'resolved-natural';
  
  var templates = {
    'health-crisis': {
      'resolved-condition': [
        'Health officials lift advisory for ' + neighborhood + ' as ' + reason,
        neighborhood + ' health situation improves: ' + reason,
        'Medical concerns ease in ' + neighborhood + ' after ' + reason
      ],
      'resolved-calendar': [
        neighborhood + ' health concerns subside with ' + reason,
        'Seasonal shift brings relief to ' + neighborhood + ': ' + reason
      ],
      'default': [
        'Health situation in ' + neighborhood + ' shows improvement',
        neighborhood + ' health concerns subside after weeks of monitoring'
      ]
    },
    'economic-crisis': {
      'resolved-condition': [
        'Economic outlook brightens in ' + neighborhood + ': ' + reason,
        neighborhood + ' businesses report improvement as ' + reason,
        'Financial concerns ease in ' + neighborhood
      ],
      'resolved-calendar': [
        neighborhood + ' economy gets boost from ' + reason,
        'Seasonal activity helps ' + neighborhood + ' recovery'
      ],
      'default': [
        'Economic conditions stabilize in ' + neighborhood,
        neighborhood + ' sees signs of economic recovery'
      ]
    },
    'pattern-wave': {
      'resolved-condition': [
        'Community tension eases in ' + neighborhood + ': ' + reason,
        neighborhood + ' returns to calm as ' + reason
      ],
      'resolved-calendar': [
        neighborhood + ' finds peace through ' + reason,
        'Community spirit helps resolve ' + neighborhood + ' concerns'
      ],
      'default': [
        'Pattern of incidents in ' + neighborhood + ' appears to break',
        neighborhood + ' sees return to normal'
      ]
    },
    'demographic': {
      'resolved-condition': [
        'Population shifts in ' + neighborhood + ' stabilize: ' + reason,
        neighborhood + ' demographic transition reaches equilibrium'
      ],
      'resolved-calendar': [
        neighborhood + ' population movement settles after ' + reason
      ],
      'default': [
        'Population shifts in ' + neighborhood + ' stabilize',
        neighborhood + ' demographic transition reaches new equilibrium'
      ]
    },
    'crisis': {
      'default': [
        'Crisis concludes in ' + neighborhood + ' as conditions stabilize',
        neighborhood + ' crisis arc reaches natural resolution'
      ]
    }
  };
  
  var typeTemplates = templates[type] || templates['crisis'];
  var options = typeTemplates[resType] || typeTemplates['default'] || templates['crisis']['default'];
  
  return options[Math.floor(Math.random() * options.length)];
}


/**
 * Update Event_Arc_Ledger with current arc states
 */
function updateArcLedger_(ss, arcs, cycle) {
  var sheet = ss.getSheetByName('Event_Arc_Ledger');
  if (!sheet) {
    Logger.log('updateArcLedger_: No Event_Arc_Ledger found');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var cols = {
    arcId: headers.indexOf('ArcId'),
    phase: headers.indexOf('Phase'),
    tension: headers.indexOf('Tension'),
    age: headers.indexOf('Age'),
    prevPhase: headers.indexOf('PrevPhase'),
    resolutionType: headers.indexOf('ResolutionType'),
    resolutionCycle: headers.indexOf('ResolutionCycle'),
    resolutionReason: headers.indexOf('ResolutionReason'),
    makerHold: headers.indexOf('MakerHold')
  };
  
  var arcLookup = {};
  for (var a = 0; a < arcs.length; a++) {
    if (arcs[a] && arcs[a].arcId) {
      arcLookup[arcs[a].arcId] = arcs[a];
    }
  }
  
  for (var i = 1; i < data.length; i++) {
    var rowArcId = data[i][cols.arcId];
    if (!rowArcId || !arcLookup[rowArcId]) continue;
    
    var arc = arcLookup[rowArcId];
    var rowNum = i + 1;
    
    if (cols.phase >= 0) {
      sheet.getRange(rowNum, cols.phase + 1).setValue(arc.phase);
    }
    
    if (cols.tension >= 0) {
      sheet.getRange(rowNum, cols.tension + 1).setValue(arc.tension);
    }
    
    if (cols.age >= 0) {
      sheet.getRange(rowNum, cols.age + 1).setValue(arc.age);
    }
    
    if (cols.prevPhase >= 0 && arc.prevPhase) {
      sheet.getRange(rowNum, cols.prevPhase + 1).setValue(arc.prevPhase);
    }
    
    if (arc.phase === 'resolved') {
      if (cols.resolutionType >= 0) {
        sheet.getRange(rowNum, cols.resolutionType + 1).setValue(arc.resolutionType || 'resolved-natural');
      }
      if (cols.resolutionCycle >= 0) {
        sheet.getRange(rowNum, cols.resolutionCycle + 1).setValue(arc.resolutionCycle || cycle);
      }
      if (cols.resolutionReason >= 0 && arc.resolutionReason) {
        sheet.getRange(rowNum, cols.resolutionReason + 1).setValue(arc.resolutionReason);
      }
    }
  }
  
  Logger.log('updateArcLedger_: Updated ledger for cycle ' + cycle);
}


/**
 * ============================================================================
 * ARC LIFECYCLE v1.1 REFERENCE
 * ============================================================================
 * 
 * CONDITION-BASED RESOLUTION:
 * 
 * | Arc Type | Resolves When | Calendar Accelerators |
 * |----------|---------------|----------------------|
 * | health-crisis | illnessRate < 0.05 | Season change, age 4+ |
 * | economic-crisis | economicMood > 55 | Championship, shopping holidays |
 * | demographic | |migration| < 80 | Post-travel holiday |
 * | pattern-wave | sentiment > -0.15 | First Friday, Creation Day |
 * | infrastructure | weather.impact < 1.1 | Age 2+ |
 * | crisis (generic) | chaosCount < 2 | Age 4+, tension < 3 |
 * 
 * FORCED TIMEOUT: Age 12+ and tension < 3 = auto-resolve
 * 
 * CALENDAR TENSION MODIFIERS:
 * 
 * | Factor | Drift Change |
 * |--------|--------------|
 * | Peaceful holiday | -0.3 |
 * | First Friday | -0.2 |
 * | Creation Day | -0.4 |
 * | Crowd holiday (safety arc) | +0.4 |
 * | Championship (economic arc) | -0.5 |
 * 
 * RESOLUTION TYPES:
 * - resolved-natural: Age/tension based
 * - resolved-condition: World state metric improved
 * - resolved-calendar: Calendar event accelerated
 * - resolved-intervention: Force resolve flag
 * - resolved-timeout: Exceeded age 12
 * 
 * NEW LEDGER COLUMN:
 * - ResolutionReason: Human-readable explanation
 * 
 * ============================================================================
 */