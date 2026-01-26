/**
 * ============================================================================
 * applyCycleRecovery_ v2.4
 * ============================================================================
 *
 * v2.4 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx/summary
 * - for loops instead of for...of
 *
 * v2.3 Features:
 * - TRUE recovery window (persistence): heavy cycles enforce multi-cycle recovery
 * - Momentum / decay: heavy → moderate → light → none unless re-triggered
 * - Minimum duration: prevents snap-back after overload
 * - Uses prior recovery state (no oscillation)
 * - Sports handling: supports override states, but primarily buckets into in-season/off-season
 *
 * Outputs (adds):
 * - recoveryStartCycle, recoveryWindow, recoveryDuration
 * - recoveryState: { startCycle, window, duration, lastLevel }
 *
 * ============================================================================
 */

function applyCycleRecovery_(ctx) {
  // Defensive guard
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};

  var S = ctx.summary;

  // --- Cycle id (consistent across your other scripts)
  var cycle = S.absoluteCycle || S.cycleId || (ctx.config ? ctx.config.cycleCount : 0) || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;

  var sportsSeason = (S.sportsSeason || 'off-season').toString().trim().toLowerCase();

  // Bucket sports into in-season/off-season for recovery realism
  var IN_SEASON_STATES = ['spring-training', 'early-season', 'mid-season', 'late-season', 'regular-season'];
  var HIGH_INTENSITY_STATES = ['playoffs', 'post-season', 'championship'];
  var isInSeason = IN_SEASON_STATES.indexOf(sportsSeason) !== -1 || HIGH_INTENSITY_STATES.indexOf(sportsSeason) !== -1;
  var isHighIntensitySports = HIGH_INTENSITY_STATES.indexOf(sportsSeason) !== -1;

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: LOAD PREVIOUS RECOVERY STATE (persistence)
  // ═══════════════════════════════════════════════════════════════════════════
  // Prefer a dedicated state object if present; fallback to older fields.
  var prev = S.recoveryState || {};
  var prevStart = Number(prev.startCycle || S.recoveryStartCycle || 0) || 0;
  var prevWindow = Number(prev.window || S.recoveryWindow || 0) || 0;
  var prevDuration = Number(prev.duration || S.recoveryDuration || 0) || 0;
  var prevLevel = (prev.lastLevel || S.recoveryLevel || 'none').toString();

  var prevActive = prevStart > 0 && prevWindow > 0 && (cycle - prevStart) < prevWindow;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR-BASED THRESHOLD MODIFIERS (as in v2.2, but tuned)
  // ═══════════════════════════════════════════════════════════════════════════
  var lightThreshold = 3;
  var moderateThreshold = 6;
  var heavyThreshold = 10;

  var bigCelebrations = ['oaklandpride', 'artsoulfestival', 'newyearseve', 'independence'];
  if (bigCelebrations.indexOf(holiday.toLowerCase()) !== -1) {
    lightThreshold += 3;
    moderateThreshold += 4;
    heavyThreshold += 5;
  }

  if (holidayPriority === 'oakland' && bigCelebrations.indexOf(holiday.toLowerCase()) === -1) {
    lightThreshold += 2;
    moderateThreshold += 2;
    heavyThreshold += 3;
  }

  var culturalFestivals = ['lunarnewyear', 'cincodemayo', 'diademuertos', 'juneteenth'];
  if (culturalFestivals.indexOf(holiday.toLowerCase()) !== -1) {
    lightThreshold += 2;
    moderateThreshold += 2;
    heavyThreshold += 3;
  }

  if (holiday.toLowerCase() === 'stpatricksday' || holiday.toLowerCase() === 'halloween') {
    lightThreshold += 2;
    moderateThreshold += 2;
    heavyThreshold += 2;
  }

  var quietHolidays = ['thanksgiving', 'easter', 'mothersday', 'fathersday'];
  if (quietHolidays.indexOf(holiday.toLowerCase()) !== -1) {
    lightThreshold -= 1;
    moderateThreshold -= 1;
    heavyThreshold -= 2;
  }

  if (holiday.toLowerCase() === 'holiday') {
    lightThreshold += 1;
    moderateThreshold += 1;
    heavyThreshold += 1;
  }

  // Sports tolerance (primarily in-season vs off-season, plus your override support)
  if (isHighIntensitySports) {
    lightThreshold += 2;
    moderateThreshold += 3;
    heavyThreshold += 3;
  } else if (isInSeason) {
    lightThreshold += 1;
    moderateThreshold += 1;
    heavyThreshold += 1;
  } else {
    // Off-season: city can "feel calmer," so it recovers with slightly lower tolerance
    lightThreshold -= 0;
    moderateThreshold -= 0;
    heavyThreshold -= 0;
  }

  if (holiday.toLowerCase() === 'openingday') {
    lightThreshold += 2;
    moderateThreshold += 3;
    heavyThreshold += 3;
  }

  if (isFirstFriday) {
    lightThreshold += 1;
    moderateThreshold += 2;
    heavyThreshold += 2;
  }

  if (isCreationDay) {
    lightThreshold += 1;
    moderateThreshold += 1;
    heavyThreshold += 2;
  }

  lightThreshold = Math.max(2, lightThreshold);
  moderateThreshold = Math.max(4, moderateThreshold);
  heavyThreshold = Math.max(7, heavyThreshold);

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE OVERLOAD SCORE (same spirit as v2.2, slightly hardened)
  // ═══════════════════════════════════════════════════════════════════════════
  var overloadScore = 0;

  var textureCount = S.textureTriggers ? S.textureTriggers.length : 0;
  if (textureCount > 6) overloadScore += 3;
  else if (textureCount > 4) overloadScore += 2;
  else if (textureCount > 2) overloadScore += 1;

  var hookCount = S.storyHooks ? S.storyHooks.length : 0;
  if (hookCount > 7) overloadScore += 3;
  else if (hookCount > 5) overloadScore += 2;
  else if (hookCount > 3) overloadScore += 1;

  if (S.shockFlag === 'shock-flag') overloadScore += 3;
  if (S.shockFlag === 'shock-fading') overloadScore += 1;

  var eventCount = S.worldEvents ? S.worldEvents.length : 0;
  if (eventCount > 10) overloadScore += 3;
  else if (eventCount > 6) overloadScore += 2;
  else if (eventCount > 4) overloadScore += 1;

  if (S.civicLoad === 'load-strain') overloadScore += 3;
  else if (S.civicLoad === 'minor-variance') overloadScore += 1;

  var civicScore = Number(S.civicLoadScore || 0);
  if (civicScore >= 15) overloadScore += 2;
  else if (civicScore >= 10) overloadScore += 1;

  var econMood = Number(S.economicMood || 50);
  if (econMood <= 25) overloadScore += 2;
  else if (econMood <= 35) overloadScore += 1;

  var weatherMood = S.weatherMood || {};
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.25) overloadScore += 1;

  var arcs = S.eventArcs || [];
  var peakArcs = 0;
  for (var ai = 0; ai < arcs.length; ai++) {
    if (arcs[ai] && arcs[ai].phase === 'peak') peakArcs++;
  }
  if (peakArcs >= 3) overloadScore += 2;
  else if (peakArcs >= 2) overloadScore += 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE "TRIGGERED" RECOVERY LEVEL (based on today's overload)
  // ═══════════════════════════════════════════════════════════════════════════
  var triggeredLevel = 'none';
  if (overloadScore >= heavyThreshold) triggeredLevel = 'heavy';
  else if (overloadScore >= moderateThreshold) triggeredLevel = 'moderate';
  else if (overloadScore >= lightThreshold) triggeredLevel = 'light';

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: APPLY PERSISTENCE + DECAY (the missing realism)
  // ═══════════════════════════════════════════════════════════════════════════
  // Rules:
  // - If heavy triggers: start/reset a window (default 3 cycles total including current)
  // - If moderate triggers: window 2 cycles
  // - If light triggers: window 1 cycle
  // - If already in a window: decay one step per cycle unless re-triggered higher
  // - If re-triggered higher during window: bump up and extend if needed

  function stepDown(level) {
    if (level === 'heavy') return 'moderate';
    if (level === 'moderate') return 'light';
    if (level === 'light') return 'none';
    return 'none';
  }

  function maxLevel(a, b) {
    var rank = { none: 0, light: 1, moderate: 2, heavy: 3 };
    return (rank[a] >= rank[b]) ? a : b;
  }

  var finalLevel = triggeredLevel;
  var startCycle = prevStart;
  var window = prevWindow;
  var duration = prevDuration;

  if (triggeredLevel === 'heavy') {
    startCycle = cycle;
    window = 3; // heavy: enforce 3-cycle recovery window
    duration = 0;
    finalLevel = 'heavy';
  } else if (triggeredLevel === 'moderate') {
    // If already heavy window exists, don't reduce instantly; otherwise start 2-cycle window
    if (!prevActive) {
      startCycle = cycle;
      window = 2;
      duration = 0;
      finalLevel = 'moderate';
    } else {
      // If currently in a window, keep at least the decayed level, and allow bump
      var decayedMod = stepDown(prevLevel);
      finalLevel = maxLevel(triggeredLevel, decayedMod);
      startCycle = prevStart;
      window = prevWindow;
      duration = (cycle - prevStart);
    }
  } else if (triggeredLevel === 'light') {
    if (!prevActive) {
      startCycle = cycle;
      window = 1;
      duration = 0;
      finalLevel = 'light';
    } else {
      var decayedLight = stepDown(prevLevel);
      finalLevel = maxLevel(triggeredLevel, decayedLight);
      startCycle = prevStart;
      window = prevWindow;
      duration = (cycle - prevStart);
    }
  } else {
    // triggered none
    if (prevActive) {
      // Continue decaying until window ends
      var decayedNone = stepDown(prevLevel);
      finalLevel = decayedNone;
      startCycle = prevStart;
      window = prevWindow;
      duration = (cycle - prevStart);
      // If decay reaches none early, allow exit early
      if (finalLevel === 'none') {
        startCycle = 0;
        window = 0;
        duration = 0;
      }
    } else {
      finalLevel = 'none';
      startCycle = 0;
      window = 0;
      duration = 0;
    }
  }

  // Extend window if a higher trigger happens mid-window (rare but useful)
  if (prevActive) {
    if (triggeredLevel === 'heavy') window = 3;
    else if (triggeredLevel === 'moderate') window = Math.max(window, 2);
    else if (triggeredLevel === 'light') window = Math.max(window, 1);
  }

  // Recompute duration if active
  if (startCycle > 0 && window > 0) duration = Math.max(0, cycle - startCycle);

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY SUPPRESSION BASED ON FINAL (PERSISTENT) RECOVERY LEVEL
  // ═══════════════════════════════════════════════════════════════════════════
  S.recoveryMode = finalLevel !== 'none';
  S.recoveryLevel = finalLevel;
  S.overloadScore = overloadScore;

  // Persisted state (v2.3)
  S.recoveryStartCycle = startCycle;
  S.recoveryWindow = window;
  S.recoveryDuration = duration;
  S.recoveryState = {
    startCycle: startCycle,
    window: window,
    duration: duration,
    lastLevel: finalLevel
  };

  // Thresholds for debugging
  S.recoveryThresholds = { light: lightThreshold, moderate: moderateThreshold, heavy: heavyThreshold };

  // Suppression table (unchanged behavior, but now applied via persistent finalLevel)
  if (finalLevel === 'heavy') {
    S.suppressEvents = true;
    S.suppressHooks = true;
    S.suppressTextures = true;
    S.eventSuppression = 0.5;
    S.hookSuppression = 0.5;
    S.textureSuppression = 0.6;
  } else if (finalLevel === 'moderate') {
    S.suppressEvents = false;
    S.suppressHooks = true;
    S.suppressTextures = true;
    S.eventSuppression = 0.75;
    S.hookSuppression = 0.6;
    S.textureSuppression = 0.7;
  } else if (finalLevel === 'light') {
    S.suppressEvents = false;
    S.suppressHooks = false;
    S.suppressTextures = true;
    S.eventSuppression = 0.9;
    S.hookSuppression = 0.85;
    S.textureSuppression = 0.8;
  } else {
    S.suppressEvents = false;
    S.suppressHooks = false;
    S.suppressTextures = false;
    S.eventSuppression = 1.0;
    S.hookSuppression = 1.0;
    S.textureSuppression = 1.0;
  }

  // Calendar context for debugging (v2.3)
  S.recoveryCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    sportsBucket: isHighIntensitySports ? 'high-intensity' : (isInSeason ? 'in-season' : 'off-season'),
    thresholdAdjustment: (heavyThreshold - 10)
  };

  ctx.summary = S;
}
