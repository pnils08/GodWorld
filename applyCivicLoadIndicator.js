/**
 * ============================================================================
 * applyCivicLoadIndicator_ v2.3
 * ============================================================================
 *
 * v2.3 Fixes:
 * - CRITICAL: Filter worldEvents to current cycle only (prevents accumulation)
 * - CRITICAL: Filter auditIssues to current cycle only
 * - Only count non-resolved arcs
 * - Added score cap to prevent runaway inflation
 * - Added debug logging for diagnosis
 * - Preserved all v2.2 calendar integration
 *
 * Root Cause Fixed:
 * Arrays (auditIssues, worldEvents) were accumulating across cycles without
 * being cleared, causing civicLoad to hit "load-strain" and stay there.
 *
 * ============================================================================
 */

function applyCivicLoadIndicator_(ctx) {

  var S = ctx.summary;
  if (!S) return;

  var cycle = S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: FILTER TO CURRENT CYCLE ONLY
  // ═══════════════════════════════════════════════════════════════════════════
  
  var allAuditIssues = S.auditIssues || [];
  var allWorldEvents = S.worldEvents || [];
  
  // Filter worldEvents to current cycle only
  var worldEvents = [];
  for (var i = 0; i < allWorldEvents.length; i++) {
    var ev = allWorldEvents[i];
    if (ev && ev.cycle === cycle) {
      worldEvents.push(ev);
    }
  }
  
  // Audit issues don't have cycle stamps, so we need to track separately
  // v2.3: Use cycleAuditIssues if available, otherwise use all (backward compat)
  var auditIssues = S.cycleAuditIssues || allAuditIssues;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PULL CONTEXT FROM SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  var patternFlag = S.patternFlag || "";
  var shockFlag = S.shockFlag || "";
  var dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  var sentiment = dynamics.sentiment || 0;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var econMood = S.economicMood || 50;
  var demographicDrift = S.demographicDrift || {};
  var migDrift = demographicDrift.migration || 0;
  var allArcs = S.eventArcs || [];

  // v2.3: Filter to active (non-resolved) arcs only
  var activeArcs = [];
  for (var a = 0; a < allArcs.length; a++) {
    var arc = allArcs[a];
    if (arc && arc.phase !== 'resolved') {
      activeArcs.push(arc);
    }
  }

  // Calendar context (v2.2)
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  var chaosCount = worldEvents.length;
  var factors = [];
  var calendarFactors = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE SCORE
  // ═══════════════════════════════════════════════════════════════════════════
  var score = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT ISSUES (v2.3: capped contribution)
  // ═══════════════════════════════════════════════════════════════════════════
  if (auditIssues.length > 0) {
    // Cap at 5 issues worth (10 points max from audit issues)
    var issueCount = Math.min(auditIssues.length, 5);
    score += issueCount * 2;
    if (auditIssues.length >= 3) {
      factors.push(auditIssues.length + ' audit issues');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS EVENTS (v2.3: current cycle only)
  // ═══════════════════════════════════════════════════════════════════════════
  if (chaosCount >= 5) {
    score += 4;
    factors.push('high event volume');
  } else if (chaosCount >= 2) {
    score += 2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT SEVERITY (v2.3: current cycle only, capped)
  // ═══════════════════════════════════════════════════════════════════════════
  var highSeverity = 0;
  var mediumSeverity = 0;
  var severityScore = 0;
  
  for (var e = 0; e < worldEvents.length; e++) {
    var ev = worldEvents[e];
    var sev = (ev.severity || '').toString().toLowerCase();
    if (sev === 'high' || sev === 'major' || sev === 'critical') {
      severityScore += 3;
      highSeverity++;
    } else if (sev === 'medium' || sev === 'moderate') {
      severityScore += 2;
      mediumSeverity++;
    }
  }
  
  // v2.3: Cap severity contribution at 12 points
  score += Math.min(severityScore, 12);

  if (highSeverity > 0) {
    factors.push(highSeverity + ' high-severity event(s)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER STRAIN
  // ═══════════════════════════════════════════════════════════════════════════
  var weatherImpact = weather.impact || 1;
  if (weatherImpact >= 1.4) {
    score += 4;
    factors.push('severe weather');
  } else if (weatherImpact >= 1.3) {
    score += 2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MOOD STRAIN
  // ═══════════════════════════════════════════════════════════════════════════
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.3) {
    score += 2;
    factors.push('weather discomfort');
  }
  if (weatherMood.conflictPotential && weatherMood.conflictPotential > 0.3) {
    score += 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT DRIFT
  // ═══════════════════════════════════════════════════════════════════════════
  if (sentiment <= -0.3) {
    score += 3;
    factors.push('negative sentiment');
  } else if (sentiment >= 0.3) {
    score += 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC STRAIN
  // ═══════════════════════════════════════════════════════════════════════════
  if (econMood <= 30) {
    score += 3;
    factors.push('economic distress');
  } else if (econMood <= 40) {
    score += 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MIGRATION DRIFT
  // ═══════════════════════════════════════════════════════════════════════════
  if (Math.abs(migDrift) >= 100) {
    score += 3;
    factors.push('migration surge');
  } else if (Math.abs(migDrift) >= 50) {
    score += 2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVE ARCS AT PEAK (v2.3: only non-resolved arcs)
  // ═══════════════════════════════════════════════════════════════════════════
  var peakArcs = [];
  for (var p = 0; p < activeArcs.length; p++) {
    if (activeArcs[p] && activeArcs[p].phase === 'peak') {
      peakArcs.push(activeArcs[p]);
    }
  }
  
  if (peakArcs.length > 0) {
    // v2.3: Cap at 3 peak arcs worth
    var peakCount = Math.min(peakArcs.length, 3);
    score += peakCount * 2;
    factors.push(peakArcs.length + ' arc(s) at peak');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH TENSION ARCS (v2.3: capped)
  // ═══════════════════════════════════════════════════════════════════════════
  var tensionArcs = [];
  for (var t = 0; t < activeArcs.length; t++) {
    if (activeArcs[t] && (activeArcs[t].tension || 0) >= 7) {
      tensionArcs.push(activeArcs[t]);
    }
  }
  
  // v2.3: Cap at 3 high-tension arcs
  score += Math.min(tensionArcs.length, 3);

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN FLAGS
  // ═══════════════════════════════════════════════════════════════════════════
  if (patternFlag === "micro-event-wave") {
    score += 1;
  } else if (patternFlag === "strain-trend") {
    score += 3;
    factors.push('strain trend');
  } else if (patternFlag === "stability-streak") {
    score -= 2;
  } else if (patternFlag === "calm-after-shock") {
    score -= 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOCK FLAG
  // ═══════════════════════════════════════════════════════════════════════════
  if (shockFlag && shockFlag !== "none") {
    score += 4;
    factors.push('shock event');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY CIVIC LOAD EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  var highStrainHolidays = [
    "Independence", "NewYearsEve", "Halloween", "Thanksgiving"
  ];
  
  if (highStrainHolidays.indexOf(holiday) >= 0) {
    score += 3;
    factors.push(holiday + ' public load');
    calendarFactors.push('high-strain-holiday');
  }

  var moderateStrainHolidays = [
    "OpeningDay", "OaklandPride", "ArtSoulFestival", "CincoDeMayo",
    "Juneteenth", "DiaDeMuertos"
  ];
  
  if (moderateStrainHolidays.indexOf(holiday) >= 0) {
    score += 2;
    factors.push(holiday + ' gathering load');
    calendarFactors.push('moderate-strain-holiday');
  }

  var civicRestHolidays = [
    "MLKDay", "PresidentsDay", "MemorialDay", "LaborDay",
    "VeteransDay", "Holiday", "NewYear"
  ];
  
  if (civicRestHolidays.indexOf(holiday) >= 0) {
    score -= 2;
    calendarFactors.push('civic-rest-holiday');
  }

  if (holidayPriority === "major") {
    score += 2;
    calendarFactors.push('major-holiday-load');
  } else if (holidayPriority === "oakland") {
    score += 1;
    calendarFactors.push('oakland-holiday-load');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isFirstFriday) {
    score += 1;
    calendarFactors.push('first-friday-activity');
    
    if (dynamics.communityEngagement >= 1.3) {
      score -= 1;
      calendarFactors.push('first-friday-community-buffer');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isCreationDay) {
    score -= 1;
    calendarFactors.push('creation-day-reflection');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  if (sportsSeason === "championship") {
    score += 4;
    factors.push('championship civic strain');
    calendarFactors.push('championship-load');
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    score += 2;
    calendarFactors.push('playoffs-load');
  } else if (holiday === "OpeningDay") {
    if (chaosCount >= 2) {
      score += 1;
      calendarFactors.push('opening-day-combined-strain');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  if (dynamics.culturalActivity >= 1.5) {
    score += 1;
    calendarFactors.push('cultural-surge-load');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  if (dynamics.communityEngagement >= 1.4) {
    score -= 1;
    calendarFactors.push('community-engagement-buffer');
  } else if (dynamics.communityEngagement <= 0.7) {
    score += 1;
    calendarFactors.push('low-community-engagement');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY + CHAOS AMPLIFICATION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  if (holidayPriority !== "none" && chaosCount >= 3) {
    score += 2;
    factors.push('holiday-chaos overlap');
    calendarFactors.push('holiday-chaos-amplification');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: SCORE FLOOR AND CAP
  // ═══════════════════════════════════════════════════════════════════════════
  // Ensure score doesn't go negative
  if (score < 0) score = 0;
  
  // Cap maximum score to prevent runaway
  if (score > 30) score = 30;

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSIFY CIVIC LOAD
  // ═══════════════════════════════════════════════════════════════════════════
  var load = "stable";

  if (score >= 12) {
    load = "load-strain";
  } else if (score >= 5) {
    load = "minor-variance";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  S.civicLoad = load;
  S.civicLoadScore = score;
  S.civicLoadFactors = factors;
  S.civicLoadCalendarFactors = calendarFactors;

  // v2.3: Debug output
  Logger.log('applyCivicLoadIndicator_ v2.3: Cycle ' + cycle + 
             ' | Events (this cycle): ' + worldEvents.length + 
             ' | Active arcs: ' + activeArcs.length +
             ' | Score: ' + score + 
             ' | Load: ' + load);

  ctx.summary = S;
}


/**
 * ============================================================================
 * v2.3 COMPANION: RESET CYCLE AUDIT ISSUES
 * ============================================================================
 * 
 * Call this at the START of each cycle (Phase 1 or early Phase 3)
 * to ensure auditIssues only contains current cycle data.
 * 
 * Add to runWorldCycle_ after loadConfig_():
 *   resetCycleAuditIssues_(ctx);
 * 
 * ============================================================================
 */

function resetCycleAuditIssues_(ctx) {
  var S = ctx.summary || {};
  
  // Archive previous cycle's audit issues if needed
  if (S.auditIssues && S.auditIssues.length > 0) {
    S.previousCycleAuditIssues = S.auditIssues.slice();
  }
  
  // Clear for new cycle
  S.auditIssues = [];
  S.cycleAuditIssues = [];
  
  ctx.summary = S;
  
  Logger.log('resetCycleAuditIssues_: Cleared audit issues for new cycle');
}


/**
 * ============================================================================
 * CIVIC LOAD INDICATOR v2.3 REFERENCE
 * ============================================================================
 * 
 * v2.3 FIXES:
 * 
 * 1. CYCLE FILTERING
 *    - worldEvents filtered to current cycle only
 *    - auditIssues uses cycleAuditIssues if available
 *    - Prevents historical accumulation
 * 
 * 2. RESOLVED ARC EXCLUSION
 *    - Only non-resolved arcs count toward load
 *    - Integrates with processArcLifecycle_ v1.1
 * 
 * 3. CONTRIBUTION CAPS
 *    - Audit issues: max 5 counted (10 points)
 *    - Severity score: max 12 points
 *    - Peak arcs: max 3 counted (6 points)
 *    - High-tension arcs: max 3 counted
 *    - Total score: max 30 (prevents runaway)
 * 
 * 4. SCORE FLOOR
 *    - Score cannot go negative
 * 
 * INTEGRATION:
 * 
 * Add to Phase 1 (after loadConfig_):
 *   resetCycleAuditIssues_(ctx);
 * 
 * Keep in Phase 6:
 *   applyCivicLoadIndicator_(ctx);
 * 
 * Load Thresholds (unchanged):
 * - stable: score < 5
 * - minor-variance: score 5-11
 * - load-strain: score >= 12
 * 
 * ============================================================================
 */