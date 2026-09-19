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

// engine.187 part 4 diag-emit: three separate sessions have had to reverse-engineer WHY the shock
// flag was set, because shockReasons lives in memory and the Cycle_Packet's SHOCK CONTEXT section is
// trimmed at the compile layer (S328 KEEP_SECTIONS, deliberate). Same idiom as ENGINE59/61/95: the
// fire response carries the why, so a bench read never has to infer it from correlations again.
var ENGINE187_DIAG = null;

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

  // engine.187 part 3: S.civicLoad itself is no longer read here — only its SCORE, so the
  // monitor measures magnitude instead of echoing the class the classifier just assigned.
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

  // engine.38 B3 — POPULATION-RELATIVE event references. The old absolute event
  // thresholds (spike >=10, stability-break >=10, dead-zone <5) were tuned to a
  // ~52-event/cycle world; after full-population coverage (~600-750/cycle) the
  // spike delta false-fires on normal noise, "stability break" is trivially true
  // every cycle, and the dead-zone became unreachable. eventRef tracks volume via
  // prevEvents (persisted as currentCycleState.events each cycle); the legacy 40
  // floor preserves old behavior at low volume.
  var eventRef = Math.max(prevEvents, 40);
  // Regime-shift guard: a >=2.5x jump in TOTAL event volume is a coverage/deploy
  // regime change (a bounded population can't organically 2.5x its event count),
  // not an in-world shock. Skip the event-delta tests on such a cycle so the FIRST
  // post-deploy cycle (prev~52 -> cur~600) doesn't fire a spurious shock. prevEvents
  // rolls to curEvents next cycle, so this self-clears after one cycle.
  var eventRegimeShift = (prevEvents > 0) && (curEvents >= prevEvents * 2.5 || prevEvents >= curEvents * 2.5);

  // 1) EVENT SPIKE — relative: >=30% of the normal volume jumped in one cycle
  // (with the legacy +10 absolute floor), and not on a regime-shift cycle.
  var eventSpikeThreshold = Math.max(10 + eventThresholdMod, Math.round(0.30 * eventRef));
  if (!eventRegimeShift && curEvents - prevEvents >= eventSpikeThreshold) {
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
  // engine.187 part 4 (2026-09-19): a high-severity pair stays absolute — bench C104-C111 shows
  // high/major/critical is genuinely rare (one single across eight cycles), so 2 is a real cluster.
  // The medium bar was NOT rare: the city files 8-13 chaos events every cycle and 4+ of them were
  // medium on 5 of those 8, so "wave" fired on ordinary texture. A wave is the MIX tilting
  // mid-severity, not the volume being normal.
  if (curHigh >= 2) { shock = true; shockReasons.push("high severity cluster"); }
  if (curMed >= 4 && curMed >= Math.ceil(curChaos * 0.6)) { shock = true; shockReasons.push("medium severity wave"); }

  // 3) CHAOS SPIKE
  var chaosSpikeThreshold = 4 + chaosThresholdMod;
  // engine.187 part 4: saturation was an absolute 8 against a city that files 8-13 chaos events
  // EVERY cycle (bench C104-C111: 12, 13, 8, 11, 10, 8, 11, 8) — the floor of the world's normal
  // range was the threshold, so it fired 8 of 8 and the shock flag could never clear. Same class
  // as the engine.38 B3 event thresholds above and as the civic-load cap in part 1: a gate that
  // cannot NOT fire. Now relative to the city's own volume, with the legacy 8 as a floor so a
  // genuinely quiet world keeps the old behaviour.
  var chaosRef = Math.max(prevChaos, 5);
  var chaosSaturationThreshold = Math.max(8 + chaosThresholdMod, Math.round(chaosRef * 1.6));

  if (curChaos - prevChaos >= chaosSpikeThreshold) { shock = true; shockReasons.push("chaos spike"); }
  if (curChaos >= chaosSaturationThreshold)        { shock = true; shockReasons.push("chaos saturation"); }

  // 4) WEATHER VOLATILITY
  var wxImpact = weather.impact || 1;
  if (wxImpact >= 1.5) { shock = true; shockReasons.push("severe weather"); }
  if (weatherMood.conflictPotential && weatherMood.conflictPotential >= 0.5) { shock = true; shockReasons.push("weather conflict"); }
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.2)            { shock = true; shockReasons.push("weather distress"); }

  // 5) SENTIMENT COLLAPSE
  // 2026-09-19 (kimi review of engine.242a): a drop only counts as a collapse when it also takes the
  // city below neutral. A holiday lift (+0.2…+0.5) unwinding the next cycle is a drop of ≥ 0.3 back to
  // an ordinary positive mood — it was flagging "sentiment collapse" on the calendar, forever.
  if (prevSent - curSent >= 0.3 && curSent < 0) { shock = true; shockReasons.push("sentiment collapse"); }
  if (curSent <= -0.5)           { shock = true; shockReasons.push("severe negative sentiment"); }

  // 6) ECONOMIC MOOD CRASH
  if (prevEconMood - econMood >= 15) { shock = true; shockReasons.push("economic crash"); }
  if (econMood <= 25)                { shock = true; shockReasons.push("economic crisis"); }

  // 7) MIGRATION DRIFT SHOCK
  // engine.187 part 4: `demographicDrift.migration` is a net HEAD COUNT (~1,295/cycle on bench
  // C104-C111), not the +/-20 index the digest's MigrationDrift column carries — the same
  // scale mix-up engine.184 found in the v3 writer's thresholds. An absolute 150 against a
  // 391,000-person city meant every ordinary cycle was a "migration surge". Now a share of the
  // population the city actually has; the legacy 150 survives as a floor for a small world.
  var migration = demographicDrift.migration || 0;
  var shockPop = (S.worldPopulation && Number(S.worldPopulation.totalPopulation)) || 0;
  var migrationThreshold = Math.max(150 + migrationThresholdMod, Math.round(shockPop * 0.005));
  if (Math.abs(migration) >= migrationThreshold) { shock = true; shockReasons.push("migration surge"); }

  // 8) EMPLOYMENT SHOCK
  // engine.102 W2b — fallback reads World_Config employmentFallbackRate; missing
  // key is LOUD (site missed by the kimi sweep, same free-number class).
  var employmentFallbackRate = Number(ctx.config && ctx.config.employmentFallbackRate);
  if (isNaN(employmentFallbackRate)) {
    employmentFallbackRate = 0.91;
    pushMissingConfigWarning_(ctx, 'employmentFallbackRate', 0.91);
  }
  var employment = demographicDrift.employmentRate || employmentFallbackRate;
  if (employment < 0.85) { shock = true; shockReasons.push("employment crisis"); }

  // 9) CIVIC LOAD — NO SHOCK TERM.
  // engine.187 part 3 cut `civicLoad === "load-strain"` (a restatement of the class the
  // classifier had just assigned) but kept `civicLoadScore >= 15`, arguing that was the
  // magnitude BEYOND the class boundary. Part 4b's diag-emit proved that wrong on the bench:
  // C110 fired shock with exactly one reason, "civic strain extreme", at score 16 — while the
  // city's sentiment was RISING 0.12 -> 0.35, chaos sat under its own threshold (11 vs 13),
  // no arc was at peak and the economy was flat. The class boundary is 12, so 15 is four
  // points up a scale an ordinary heavy cycle reaches: the same restatement wearing a number.
  // Civic load is SUSTAINED PRESSURE; a shock is a BREAK. They are different axes and both
  // are published — a reader who wants "the city is under strain" reads civicLoad. Where high
  // load is driven by something genuinely shocking (a severity cluster, arcs at peak, a
  // collapse), that cause has its own gate above and fires on its own merits.
  // civicLoadScore is still read for the diag-emit, so the number stays visible.

  // 10) PATTERN BREAK — engine.38 B3: a stability streak (quiet stretch) breaks
  // when activity jumps >=40% above the streak's level (was absolute >=10, which
  // is trivially true at high volume). Guarded against the deploy regime-shift.
  if (prevPattern === "stability-streak" && !eventRegimeShift &&
      curEvents >= Math.max(10, eventRef * 1.40)) { shock = true; shockReasons.push("stability break"); }
  // engine.187 part 3: `patternFlag === "strain-trend"` removed — the same restatement by a
  // second route. applyPatternDetection reads civic load to set strain-trend, so this line
  // made shock an alias for the load class even after the class itself was unpinned. A
  // sustained strain is a TREND; a shock is a BREAK. Both flags are still written, and a
  // reader that wants "the city is under strain" reads patternFlag, not shockFlag.
  // Second effect, deliberate: these two lines pushed 1-2 reasons onto shockReasons every
  // cycle, and shockReasons.length is what decides fading (>=2) and chronic (>=3) below.
  // With them gone a shock can decay instead of re-arming itself at full strength.

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
  // engine.187 part 4: CRISIS saturation stays — that measures crisis coverage crowding out the
  // rest, which is a real signal. Generic `coverageIntensity === "saturated"` is cut: it reads
  // "the newsroom is busy", which in a 600-event city is every cycle (saturated 8 of 8 on bench,
  // 90 of 103 live Media_Ledger rows per engine.227), and it fed a loop — the shock flag added
  // +0.3 to that same intensity in mediaFeedbackEngine, so each flag helped re-arm itself.
  if (mediaEffects.crisisSaturation && mediaEffects.crisisSaturation >= 0.8) { shock = true; shockReasons.push("media crisis saturation"); }

  // 13) CALENDAR-SPECIFIC SHOCKS — engine.38 B3: dead-zone is <10% of normal
  // volume on a major holiday (was absolute <5, unreachable at high volume).
  if (holidayPriority === "major" && curEvents < Math.max(5, eventRef * 0.10) && curChaos === 0) {
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

  ENGINE187_DIAG = {
    cycle: currentCycle,
    flag: finalShockFlag,
    prevFlag: prevShockFlag,
    reasons: shockReasons.slice(0),
    duration: shockDuration,
    read: {
      chaos: curChaos, prevChaos: prevChaos, chaosSaturationThreshold: chaosSaturationThreshold,
      medium: curMed, high: curHigh,
      migration: migration, migrationThreshold: migrationThreshold,
      civicLoadScore: civicLoadScore, sentiment: curSent, prevSentiment: prevSent,
      econMood: econMood, weatherImpact: wxImpact,
      comfortIndex: (weatherMood.comfortIndex === undefined ? null : weatherMood.comfortIndex),
      conflictPotential: (weatherMood.conflictPotential === undefined ? null : weatherMood.conflictPotential),
      peakArcs: peakArcs, highTensionArcs: highTensionArcs,
      coverageIntensity: mediaEffects.coverageIntensity || null,
      crisisSaturation: mediaEffects.crisisSaturation || null
    }
  };
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
 * engine.187 part 3 (2026-09-19): is the city IN a shock right now?
 *
 * `shock-resolved` is the one-cycle marker that a shock just ENDED, but three readers tested
 * `flag && flag !== 'none'` and so treated the all-clear as an active emergency — the newsroom
 * would publish "Unexpected disruption detected" on the cycle the disruption lifted. That matters
 * the first cycle after this deploy, when the flag inherits live's stuck shock and then resolves.
 * One predicate so the next reader cannot get the test wrong.
 */
function isActiveShock_(flag) {
  return flag === 'shock-flag' || flag === 'shock-fading' || flag === 'shock-chronic';
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
