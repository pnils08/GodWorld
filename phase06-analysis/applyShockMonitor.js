/**
 * ============================================================================
 * applyShockMonitor_ v2.3
 * ============================================================================
 *
 * Identifies REAL cycle shocks with persistence tracking and decay.
 *
 * v2.3 Enhancements:
 * - Shock duration tracking (shockStartCycle, shockDuration)
 * - Decay logic: shocks fade after 3+ cycles without severe triggers
 * - Chronic state: 5+ cycle shocks become "new normal"
 * - Resolution state: tracks when shocks clear
 * - Prevents perpetual shock flags
 *
 * v2.2 Features (retained):
 * - GodWorld Calendar integration
 * - Holiday-aware threshold adjustments
 * - Sports season shock potential
 * - Calendar-contextual shock detection
 *
 * ============================================================================
 */

function applyShockMonitor_(ctx) {

  var S = ctx.summary;
  if (!S) {
    S = {};
    S.shockFlag = "none";
    ctx.summary = S;
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CURRENT CYCLE STATE
  // ═══════════════════════════════════════════════════════════════════════════
  var curEvents = S.eventsGenerated || 0;
  var worldEvents = S.worldEvents || [];
  var curChaos = worldEvents.length;
  var dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  var curSent = dynamics.sentiment || 0;
  var civicLoad = S.civicLoad || "stable";
  var civicLoadScore = S.civicLoadScore || 0;
  var patternFlag = S.patternFlag || "none";
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var econMood = S.economicMood || 50;
  var mediaEffects = S.mediaEffects || {};
  var arcs = S.eventArcs || [];
  var demographicDrift = S.demographicDrift || {};
  var currentCycle = S.cycle || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVIOUS CYCLE STATE
  // ═══════════════════════════════════════════════════════════════════════════
  var prevCycle = S.previousCycleState || {};
  var prevEvents = prevCycle.events || 0;
  var prevChaos = prevCycle.chaosCount || 0;
  var prevSent = prevCycle.sentiment || 0;
  var prevEconMood = prevCycle.econMood || 50;
  var prevPattern = prevCycle.pattern || "none";
  
  // v2.3: Shock persistence state
  var prevShockFlag = prevCycle.shockFlag || "none";
  var prevShockStart = prevCycle.shockStartCycle || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR-AWARE THRESHOLDS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  var highActivityHolidays = [
    "Independence", "NewYearsEve", "Halloween", "OpeningDay", 
    "OaklandPride", "ArtSoulFestival", "CincoDeMayo"
  ];
  
  var travelHolidays = [
    "Thanksgiving", "Holiday", "NewYear", "NewYearsEve",
    "MemorialDay", "LaborDay", "Independence"
  ];

  var crowdHolidays = [
    "Independence", "NewYearsEve", "Halloween", "OpeningDay", 
    "OaklandPride", "CincoDeMayo", "DiaDeMuertos"
  ];

  var eventThresholdMod = 0;
  var chaosThresholdMod = 0;
  var migrationThresholdMod = 0;

  if (highActivityHolidays.indexOf(holiday) >= 0) {
    eventThresholdMod += 3;
    chaosThresholdMod += 2;
  }

  if (travelHolidays.indexOf(holiday) >= 0) {
    migrationThresholdMod += 50;
  }

  if (crowdHolidays.indexOf(holiday) >= 0) {
    chaosThresholdMod += 2;
  }

  if (isFirstFriday) {
    eventThresholdMod += 2;
    chaosThresholdMod += 1;
  }

  if (sportsSeason === "championship") {
    eventThresholdMod += 4;
    chaosThresholdMod += 3;
    migrationThresholdMod += 60;
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    eventThresholdMod += 2;
    chaosThresholdMod += 2;
    migrationThresholdMod += 40;
  }

  if (isCreationDay) {
    eventThresholdMod -= 2;
    chaosThresholdMod -= 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOCK DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  var shock = false;
  var shockReasons = [];

  // ───────────────────────────────────────────────────────────────────────────
  // 1. EVENT SPIKE (calendar-adjusted)
  // ───────────────────────────────────────────────────────────────────────────
  var eventSpikeThreshold = 10 + eventThresholdMod;
  if (curEvents - prevEvents >= eventSpikeThreshold) {
    shock = true;
    shockReasons.push('event spike');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. SEVERITY SPIKE
  // ───────────────────────────────────────────────────────────────────────────
  var curHigh = 0;
  var curMed = 0;
  for (var i = 0; i < worldEvents.length; i++) {
    var sev = (worldEvents[i].severity || '').toString().toLowerCase();
    if (sev === 'high' || sev === 'major' || sev === 'critical') {
      curHigh++;
    }
    if (sev === 'medium' || sev === 'moderate') {
      curMed++;
    }
  }

  if (curHigh >= 2) {
    shock = true;
    shockReasons.push('high severity cluster');
  }
  if (curMed >= 4) {
    shock = true;
    shockReasons.push('medium severity wave');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CHAOS SPIKE (calendar-adjusted)
  // ───────────────────────────────────────────────────────────────────────────
  var chaosSpikeThreshold = 4 + chaosThresholdMod;
  var chaosSaturationThreshold = 8 + chaosThresholdMod;

  if (curChaos - prevChaos >= chaosSpikeThreshold) {
    shock = true;
    shockReasons.push('chaos spike');
  }
  if (curChaos >= chaosSaturationThreshold) {
    shock = true;
    shockReasons.push('chaos saturation');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. WEATHER VOLATILITY SHOCK
  // ───────────────────────────────────────────────────────────────────────────
  var wxImpact = weather.impact || 1;
  if (wxImpact >= 1.5) {
    shock = true;
    shockReasons.push('severe weather');
  }

  if (weatherMood.conflictPotential && weatherMood.conflictPotential >= 0.5) {
    shock = true;
    shockReasons.push('weather conflict');
  }
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.2) {
    shock = true;
    shockReasons.push('weather distress');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. SENTIMENT COLLAPSE
  // ───────────────────────────────────────────────────────────────────────────
  if (prevSent - curSent >= 0.3) {
    shock = true;
    shockReasons.push('sentiment collapse');
  }
  if (curSent <= -0.5) {
    shock = true;
    shockReasons.push('severe negative sentiment');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. ECONOMIC MOOD CRASH
  // ───────────────────────────────────────────────────────────────────────────
  if (prevEconMood - econMood >= 15) {
    shock = true;
    shockReasons.push('economic crash');
  }
  if (econMood <= 25) {
    shock = true;
    shockReasons.push('economic crisis');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. MIGRATION DRIFT SHOCK (calendar-adjusted)
  // ───────────────────────────────────────────────────────────────────────────
  var migration = demographicDrift.migration || 0;
  var migrationThreshold = 150 + migrationThresholdMod;
  
  if (Math.abs(migration) >= migrationThreshold) {
    shock = true;
    shockReasons.push('migration surge');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. EMPLOYMENT SHOCK
  // ───────────────────────────────────────────────────────────────────────────
  var employment = demographicDrift.employmentRate || 0.91;
  if (employment < 0.85) {
    shock = true;
    shockReasons.push('employment crisis');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9. CIVIC LOAD STRAIN
  // ───────────────────────────────────────────────────────────────────────────
  if (civicLoad === "load-strain") {
    shock = true;
    shockReasons.push('civic overload');
  }
  if (civicLoadScore >= 15) {
    shock = true;
    shockReasons.push('civic strain extreme');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 10. PATTERN BREAK SHOCK
  // ───────────────────────────────────────────────────────────────────────────
  if (prevPattern === "stability-streak" && curEvents >= 10) {
    shock = true;
    shockReasons.push('stability break');
  }
  if (patternFlag === "strain-trend") {
    shock = true;
    shockReasons.push('strain trend');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 11. ARC PEAK CLUSTER
  // ───────────────────────────────────────────────────────────────────────────
  var peakArcs = 0;
  var highTensionArcs = 0;
  for (var a = 0; a < arcs.length; a++) {
    if (arcs[a] && arcs[a].phase === 'peak') peakArcs++;
    if (arcs[a] && (arcs[a].tension || 0) >= 8) highTensionArcs++;
  }

  if (peakArcs >= 2) {
    shock = true;
    shockReasons.push('arc peak cluster');
  }
  if (highTensionArcs >= 2) {
    shock = true;
    shockReasons.push('high tension arcs');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 12. MEDIA CRISIS SATURATION
  // ───────────────────────────────────────────────────────────────────────────
  if (mediaEffects.crisisSaturation && mediaEffects.crisisSaturation >= 0.8) {
    shock = true;
    shockReasons.push('media crisis saturation');
  }
  if (mediaEffects.coverageIntensity === 'saturated') {
    shock = true;
    shockReasons.push('media saturation');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 13. CALENDAR-SPECIFIC SHOCKS (v2.2)
  // ───────────────────────────────────────────────────────────────────────────

  if (holidayPriority === "major" && curEvents < 5 && curChaos === 0) {
    shock = true;
    shockReasons.push('holiday dead-zone');
  }

  if (sportsSeason === "championship" && curSent <= -0.4) {
    shock = true;
    shockReasons.push('championship tension');
  }

  var fireworksHolidays = ["Independence", "NewYearsEve"];
  if (fireworksHolidays.indexOf(holiday) >= 0) {
    var safetyEvents = 0;
    for (var s = 0; s < worldEvents.length; s++) {
      if (worldEvents[s].domain === 'SAFETY') safetyEvents++;
    }
    if (safetyEvents >= 3) {
      shock = true;
      shockReasons.push('fireworks crisis');
    }
  }

  var culturalHolidays = [
    "Juneteenth", "CincoDeMayo", "DiaDeMuertos", "OaklandPride", 
    "LunarNewYear", "MLKDay"
  ];
  if (culturalHolidays.indexOf(holiday) >= 0 && dynamics.culturalActivity < 0.7) {
    shock = true;
    shockReasons.push('cultural disconnect');
  }

  if (isCreationDay && curChaos >= 5) {
    shock = true;
    shockReasons.push('creation day disruption');
  }

  if (isFirstFriday && curSent <= -0.35) {
    shock = true;
    shockReasons.push('first friday tension');
  }

  if (travelHolidays.indexOf(holiday) >= 0) {
    var infraEvents = 0;
    for (var inf = 0; inf < worldEvents.length; inf++) {
      if (worldEvents[inf].domain === 'INFRASTRUCTURE') infraEvents++;
    }
    if (infraEvents >= 2) {
      shock = true;
      shockReasons.push('holiday transit crisis');
    }
  }

  if (dynamics.communityEngagement < 0.6 && curSent <= -0.3) {
    shock = true;
    shockReasons.push('community withdrawal');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOCK PERSISTENCE & DECAY (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  
  var shockStartCycle = 0;
  var shockDuration = 0;
  var finalShockFlag = "none";

  if (shock) {
    // Shock conditions are active this cycle
    
    // Check if continuing from previous
    var wasShocked = (prevShockFlag === "shock-flag" || 
                      prevShockFlag === "shock-fading" || 
                      prevShockFlag === "shock-chronic");
    
    if (wasShocked && prevShockStart > 0) {
      // Continuing shock
      shockStartCycle = prevShockStart;
      shockDuration = currentCycle - prevShockStart;
    } else {
      // New shock
      shockStartCycle = currentCycle;
      shockDuration = 0;
    }
    
    // Apply decay based on duration
    if (shockDuration >= 5) {
      // CHRONIC: 5+ cycles - becomes "new normal"
      // Only maintain active shock if 3+ severe reasons
      if (shockReasons.length >= 3) {
        finalShockFlag = "shock-flag";
      } else {
        finalShockFlag = "shock-chronic";
        shockReasons.push("chronic (normalized after " + shockDuration + " cycles)");
      }
      
    } else if (shockDuration >= 3) {
      // FADING: 3-4 cycles - requires 2+ reasons to stay active
      if (shockReasons.length >= 2) {
        finalShockFlag = "shock-flag";
      } else {
        finalShockFlag = "shock-fading";
        shockReasons.push("fading (cycle " + shockDuration + ")");
      }
      
    } else {
      // FRESH: 0-2 cycles - full shock
      finalShockFlag = "shock-flag";
    }
    
  } else {
    // No shock conditions met this cycle
    
    var wasActive = (prevShockFlag === "shock-flag" || 
                     prevShockFlag === "shock-fading");
    
    if (wasActive) {
      // Was shocked, now resolving
      finalShockFlag = "shock-resolved";
      shockReasons.push("resolved this cycle");
    } else if (prevShockFlag === "shock-chronic") {
      // Chronic finally cleared
      finalShockFlag = "shock-resolved";
      shockReasons.push("chronic condition resolved");
    } else if (prevShockFlag === "shock-resolved") {
      // Already resolved, now fully clear
      finalShockFlag = "none";
    } else {
      finalShockFlag = "none";
    }
    
    shockStartCycle = 0;
    shockDuration = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  S.shockFlag = finalShockFlag;
  S.shockReasons = shockReasons;
  S.shockScore = shockReasons.length;
  S.shockStartCycle = shockStartCycle;
  S.shockDuration = shockDuration;

  // v2.2: Calendar context
  S.shockCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    thresholdAdjustments: {
      eventThreshold: eventSpikeThreshold,
      chaosThreshold: chaosSpikeThreshold,
      migrationThreshold: migrationThreshold
    }
  };

  // Store current state for next cycle comparison (v2.3 expanded)
  S.currentCycleState = {
    events: curEvents,
    chaosCount: curChaos,
    sentiment: curSent,
    econMood: econMood,
    pattern: patternFlag,
    shockFlag: finalShockFlag,
    shockStartCycle: shockStartCycle
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * SHOCK MONITOR REFERENCE v2.3
 * ============================================================================
 * 
 * SHOCK STATES (v2.3):
 * 
 * | State | Duration | Condition |
 * |-------|----------|-----------|
 * | none | - | No shock conditions |
 * | shock-flag | 0-2 cycles | Active shock, any triggers |
 * | shock-flag | 3-4 cycles | Active shock, 2+ triggers required |
 * | shock-fading | 3-4 cycles | Only 1 trigger, decaying |
 * | shock-flag | 5+ cycles | Active shock, 3+ triggers required |
 * | shock-chronic | 5+ cycles | <3 triggers, "new normal" |
 * | shock-resolved | 1 cycle | Just cleared, transitions to none |
 * 
 * DECAY LOGIC:
 * 
 * - Cycles 0-2: Any trigger = shock-flag
 * - Cycles 3-4: 2+ triggers = shock-flag, else shock-fading
 * - Cycles 5+: 3+ triggers = shock-flag, else shock-chronic
 * - No triggers: shock-resolved (1 cycle), then none
 * 
 * NEW OUTPUT FIELDS (v2.3):
 * 
 * - shockStartCycle: Cycle when shock began
 * - shockDuration: How many cycles shock has been active
 * - currentCycleState.shockFlag: For next cycle comparison
 * - currentCycleState.shockStartCycle: For next cycle comparison
 * 
 * DETECTION CATEGORIES (unchanged from v2.2):
 * 
 * 1. Event spike (calendar-adjusted)
 * 2. Severity spike (high/medium cluster)
 * 3. Chaos spike (calendar-adjusted)
 * 4. Weather volatility
 * 5. Sentiment collapse
 * 6. Economic crash
 * 7. Migration surge (calendar-adjusted)
 * 8. Employment crisis
 * 9. Civic load strain
 * 10. Pattern break
 * 11. Arc peak cluster
 * 12. Media saturation
 * 13. Calendar-specific shocks
 * 
 * ============================================================================
 */