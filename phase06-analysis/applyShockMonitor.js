/**
 * ============================================================================
 * applyShockMonitor_ v2.4
 * ============================================================================
 *
 * Fixes:
 * - Uses consistent cycle source (absoluteCycle/cycleId/config)
 * - Properly rolls previousCycleState each cycle (no external rollover needed)
 * - Sports modifiers only fully apply when sports state is Maker override
 *   (keeps your canon: engine shouldn't "invent" playoffs/championship intensity)
 *
 * Keeps outputs:
 * - S.shockFlag, S.shockReasons, S.shockScore
 * - S.shockStartCycle, S.shockDuration
 * - S.shockCalendarContext
 * - S.currentCycleState + S.previousCycleState
 *
 * ============================================================================
 */

function applyShockMonitor_(ctx) {

  var S = ctx.summary || {};
  ctx.summary = S;

  // ───────────────────────────────────────────────────────────────────────────
  // Resolve cycle consistently across your engine
  // ───────────────────────────────────────────────────────────────────────────
  var currentCycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || S.cycle || 0;

  // ───────────────────────────────────────────────────────────────────────────
  // Roll forward previous state (self-contained persistence)
  // If you already have a rollover script, this still works fine.
  // ───────────────────────────────────────────────────────────────────────────
  if (!S.previousCycleState && S.currentCycleState) {
    S.previousCycleState = S.currentCycleState;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CURRENT CYCLE STATE
  // ═══════════════════════════════════════════════════════════════════════════
  var curEvents = S.eventsGenerated || 0;
  var worldEvents = S.worldEvents || [];
  var curChaos = worldEvents.length;

  var dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };
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

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;

  // Sports canon handling:
  // - If Maker override, we trust detailed states (playoffs/championship etc.)
  // - If simmonth-calculated, treat as "in-season/off-season" for shock weighting
  var sportsSeason = (S.sportsSeason || "off-season").toString();
  var sportsSource = (S.sportsSource || "").toString(); // 'config-override' or 'simmonth-calculated' etc.
  var sportsIsOverride = (sportsSource === "config-override");

  function getSportsPhaseSimple() {
    // simplest canon: summer = in-season baseball vibe; winter = off-season vibe
    // You can tune this later, but this keeps the monitor from inventing "playoffs" intensity.
    var m = S.simMonth || 1;
    if (m === 3) return "spring-training";
    if (m >= 4 && m <= 10) return "in-season";
    return "off-season";
  }

  var sportsPhase = sportsIsOverride ? sportsSeason : getSportsPhaseSimple();

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVIOUS CYCLE STATE
  // ═══════════════════════════════════════════════════════════════════════════
  var prevCycle = S.previousCycleState || {};
  var prevEvents = prevCycle.events || 0;
  var prevChaos = prevCycle.chaosCount || 0;
  var prevSent = prevCycle.sentiment || 0;
  var prevEconMood = prevCycle.econMood || 50;
  var prevPattern = prevCycle.pattern || "none";

  // Shock persistence state
  var prevShockFlag = prevCycle.shockFlag || "none";
  var prevShockStart = prevCycle.shockStartCycle || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR-AWARE THRESHOLDS
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

  // Sports: only apply big shock boosts when Maker override is active
  if (sportsIsOverride) {
    if (sportsSeason === "championship") {
      eventThresholdMod += 4;
      chaosThresholdMod += 3;
      migrationThresholdMod += 60;
    } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
      eventThresholdMod += 2;
      chaosThresholdMod += 2;
      migrationThresholdMod += 40;
    }
  } else {
    // canon-friendly: in-season adds a *small* crowd/traffic baseline
    if (sportsPhase === "in-season") {
      eventThresholdMod += 1;
      chaosThresholdMod += 1;
    }
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

  // 1) EVENT SPIKE
  var eventSpikeThreshold = 10 + eventThresholdMod;
  if (curEvents - prevEvents >= eventSpikeThreshold) {
    shock = true;
    shockReasons.push("event spike");
  }

  // 2) SEVERITY SPIKE
  var curHigh = 0;
  var curMed = 0;
  for (var i = 0; i < worldEvents.length; i++) {
    var sev = (worldEvents[i].severity || "").toString().toLowerCase();
    if (sev === "high" || sev === "major" || sev === "critical") curHigh++;
    if (sev === "medium" || sev === "moderate") curMed++;
  }
  if (curHigh >= 2) { shock = true; shockReasons.push("high severity cluster"); }
  if (curMed >= 4)  { shock = true; shockReasons.push("medium severity wave"); }

  // 3) CHAOS SPIKE
  var chaosSpikeThreshold = 4 + chaosThresholdMod;
  var chaosSaturationThreshold = 8 + chaosThresholdMod;

  if (curChaos - prevChaos >= chaosSpikeThreshold) { shock = true; shockReasons.push("chaos spike"); }
  if (curChaos >= chaosSaturationThreshold)        { shock = true; shockReasons.push("chaos saturation"); }

  // 4) WEATHER VOLATILITY
  var wxImpact = weather.impact || 1;
  if (wxImpact >= 1.5) { shock = true; shockReasons.push("severe weather"); }
  if (weatherMood.conflictPotential && weatherMood.conflictPotential >= 0.5) { shock = true; shockReasons.push("weather conflict"); }
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.2)            { shock = true; shockReasons.push("weather distress"); }

  // 5) SENTIMENT COLLAPSE
  if (prevSent - curSent >= 0.3) { shock = true; shockReasons.push("sentiment collapse"); }
  if (curSent <= -0.5)           { shock = true; shockReasons.push("severe negative sentiment"); }

  // 6) ECONOMIC MOOD CRASH
  if (prevEconMood - econMood >= 15) { shock = true; shockReasons.push("economic crash"); }
  if (econMood <= 25)                { shock = true; shockReasons.push("economic crisis"); }

  // 7) MIGRATION DRIFT SHOCK
  var migration = demographicDrift.migration || 0;
  var migrationThreshold = 150 + migrationThresholdMod;
  if (Math.abs(migration) >= migrationThreshold) { shock = true; shockReasons.push("migration surge"); }

  // 8) EMPLOYMENT SHOCK
  var employment = demographicDrift.employmentRate || 0.91;
  if (employment < 0.85) { shock = true; shockReasons.push("employment crisis"); }

  // 9) CIVIC LOAD STRAIN
  if (civicLoad === "load-strain") { shock = true; shockReasons.push("civic overload"); }
  if (civicLoadScore >= 15)        { shock = true; shockReasons.push("civic strain extreme"); }

  // 10) PATTERN BREAK
  if (prevPattern === "stability-streak" && curEvents >= 10) { shock = true; shockReasons.push("stability break"); }
  if (patternFlag === "strain-trend")                        { shock = true; shockReasons.push("strain trend"); }

  // 11) ARC PEAK CLUSTER
  var peakArcs = 0;
  var highTensionArcs = 0;
  for (var a = 0; a < arcs.length; a++) {
    if (arcs[a] && arcs[a].phase === "peak") peakArcs++;
    if (arcs[a] && (arcs[a].tension || 0) >= 8) highTensionArcs++;
  }
  if (peakArcs >= 2)       { shock = true; shockReasons.push("arc peak cluster"); }
  if (highTensionArcs >= 2){ shock = true; shockReasons.push("high tension arcs"); }

  // 12) MEDIA CRISIS SATURATION
  if (mediaEffects.crisisSaturation && mediaEffects.crisisSaturation >= 0.8) { shock = true; shockReasons.push("media crisis saturation"); }
  if (mediaEffects.coverageIntensity === "saturated")                        { shock = true; shockReasons.push("media saturation"); }

  // 13) CALENDAR-SPECIFIC SHOCKS
  if (holidayPriority === "major" && curEvents < 5 && curChaos === 0) {
    shock = true;
    shockReasons.push("holiday dead-zone");
  }

  // Only apply "championship tension" when override is active
  if (sportsIsOverride && sportsSeason === "championship" && curSent <= -0.4) {
    shock = true;
    shockReasons.push("championship tension");
  }

  var fireworksHolidays = ["Independence", "NewYearsEve"];
  if (fireworksHolidays.indexOf(holiday) >= 0) {
    var safetyEvents = 0;
    for (var s = 0; s < worldEvents.length; s++) {
      if (worldEvents[s].domain === "SAFETY") safetyEvents++;
    }
    if (safetyEvents >= 3) {
      shock = true;
      shockReasons.push("fireworks crisis");
    }
  }

  var culturalHolidays = ["Juneteenth","CincoDeMayo","DiaDeMuertos","OaklandPride","LunarNewYear","MLKDay"];
  if (culturalHolidays.indexOf(holiday) >= 0 && (dynamics.culturalActivity || 1) < 0.7) {
    shock = true;
    shockReasons.push("cultural disconnect");
  }

  if (isCreationDay && curChaos >= 5) {
    shock = true;
    shockReasons.push("creation day disruption");
  }

  if (isFirstFriday && curSent <= -0.35) {
    shock = true;
    shockReasons.push("first friday tension");
  }

  if (travelHolidays.indexOf(holiday) >= 0) {
    var infraEvents = 0;
    for (var inf = 0; inf < worldEvents.length; inf++) {
      if (worldEvents[inf].domain === "INFRASTRUCTURE") infraEvents++;
    }
    if (infraEvents >= 2) {
      shock = true;
      shockReasons.push("holiday transit crisis");
    }
  }

  if ((dynamics.communityEngagement || 1) < 0.6 && curSent <= -0.3) {
    shock = true;
    shockReasons.push("community withdrawal");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOCK PERSISTENCE & DECAY
  // ═══════════════════════════════════════════════════════════════════════════
  var shockStartCycle = 0;
  var shockDuration = 0;
  var finalShockFlag = "none";

  if (shock) {
    var wasShocked = (prevShockFlag === "shock-flag" || prevShockFlag === "shock-fading" || prevShockFlag === "shock-chronic");

    if (wasShocked && prevShockStart > 0) {
      shockStartCycle = prevShockStart;
      shockDuration = currentCycle - prevShockStart;
    } else {
      shockStartCycle = currentCycle;
      shockDuration = 0;
    }

    if (shockDuration >= 5) {
      if (shockReasons.length >= 3) {
        finalShockFlag = "shock-flag";
      } else {
        finalShockFlag = "shock-chronic";
        shockReasons.push("chronic (normalized after " + shockDuration + " cycles)");
      }
    } else if (shockDuration >= 3) {
      if (shockReasons.length >= 2) {
        finalShockFlag = "shock-flag";
      } else {
        finalShockFlag = "shock-fading";
        shockReasons.push("fading (cycle " + shockDuration + ")");
      }
    } else {
      finalShockFlag = "shock-flag";
    }

  } else {
    var wasActive = (prevShockFlag === "shock-flag" || prevShockFlag === "shock-fading");
    if (wasActive || prevShockFlag === "shock-chronic") {
      finalShockFlag = "shock-resolved";
      shockReasons.push("resolved this cycle");
    } else if (prevShockFlag === "shock-resolved") {
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

  S.shockCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    sportsPhase: sportsPhase,
    sportsIsOverride: sportsIsOverride,
    thresholdAdjustments: {
      eventThreshold: eventSpikeThreshold,
      chaosThreshold: chaosSpikeThreshold,
      migrationThreshold: migrationThreshold
    }
  };

  // Save both current and previous explicitly (no external rollover required)
  S.previousCycleState = S.currentCycleState || S.previousCycleState || {};
  S.currentCycleState = {
    cycle: currentCycle,
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
 * SHOCK MONITOR v2.4 REFERENCE
 * ============================================================================
 *
 * SHOCK FLAGS:
 * - none: No shock detected
 * - shock-flag: Active shock
 * - shock-fading: Shock declining (3+ cycles, fewer reasons)
 * - shock-chronic: Shock normalized (5+ cycles, "new normal")
 * - shock-resolved: Just ended this cycle
 *
 * SHOCK DETECTION (13 categories):
 * 1. Event spike (10+ above previous)
 * 2. Severity spike (2+ high or 4+ medium)
 * 3. Chaos spike/saturation
 * 4. Weather volatility
 * 5. Sentiment collapse
 * 6. Economic mood crash
 * 7. Migration surge
 * 8. Employment crisis
 * 9. Civic load strain
 * 10. Pattern break
 * 11. Arc peak cluster
 * 12. Media crisis saturation
 * 13. Calendar-specific shocks
 *
 * CANON-SAFE SPORTS:
 * - Only applies big threshold mods when sportsIsOverride
 * - In-season adds small baseline mods only
 *
 * CALL ORDER:
 * 1. generateCrisisBuckets_ (creates events/arcs)
 * 2. applyShockMonitor_ (detects shock from this cycle's events)
 *
 * PERSISTENCE:
 * - Self-contained: rolls previousCycleState automatically
 * - No external rollover script required
 *
 * ============================================================================
 */
