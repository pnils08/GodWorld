/**
 * ============================================================================
 * applyPatternDetection_ v2.2
 * ============================================================================
 * 
 * RECALIBRATED for actual engine output (50-70 events/cycle)
 * with GodWorld Calendar awareness.
 *
 * v2.2 Enhancements:
 * - Holiday-aware pattern detection (elevated activity during holidays is expected)
 * - First Friday micro-event waves are normal
 * - Creation Day stability patterns
 * - Sports season activity adjustments
 * - Cultural activity and community engagement considerations
 * - New pattern: holiday-elevated
 * - Aligned with GodWorld Calendar v1.0
 *
 * Patterns:
 * - stability-streak
 * - micro-event-wave
 * - strain-trend
 * - calm-after-shock
 * - elevated-activity
 * - holiday-elevated (v2.2)
 * - none
 * 
 * ============================================================================
 */

function applyPatternDetection_(ctx) {
  // DRY-RUN FIX: Skip direct sheet writes in dry-run mode
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (isDryRun) {
    Logger.log('applyPatternDetection_: Skipping (dry-run mode)');
    ctx.summary.patternFlag = "none";
    return;
  }

  var sheet = ctx.ss.getSheetByName('Riley_Digest');
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) {
    ctx.summary.patternFlag = "none";
    return;
  }

  var S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";
  var culturalActivity = (S.cityDynamics || {}).culturalActivity || 1;
  var communityEngagement = (S.cityDynamics || {}).communityEngagement || 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════
  function getRow(r) {
    return sheet.getRange(r, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  var rows = [];
  var windowSize = Math.min(7, lastRow - 1);

  for (var r = lastRow; r > lastRow - windowSize; r--) {
    rows.push(getRow(r));
  }

  // Extract arrays for last N cycles
  var eventsArr = rows.map(function(r) { return Number(r[4] || 0); }); // E - EventsGenerated
  var issuesArr = rows.map(function(r) { return (r[5] || "").toString(); });
  var civicArr = rows.map(function(r) { return (r[8] || "").toString(); }); // I - CivicLoad
  var driftArr = rows.map(function(r) { return Number(r[9] || 0); }); // J - MigrationDrift
  var patternArr = rows.map(function(r) { return (r[10] || "").toString(); });
  var shockArr = rows.map(function(r) { return (r[11] || "").toString(); }); // L - ShockFlag
  var seedsArr = rows.map(function(r) { return Number(r[12] || 0); });
  var sentimentArr = rows.map(function(r) { return Number(r[27] || 0); }); // AB - Sentiment

  // Also check worldEvents count from ctx for current cycle
  var currentWorldEvents = (S.worldEvents || []).length;

  // engine.38 B2 — POPULATION-RELATIVE event baseline. The old absolute event
  // thresholds (45/55/60/75…) were calibrated to a ~52-event/cycle world; after
  // full-population coverage (~600-750/cycle) every absolute band broke (stability
  // unreachable, elevated permanently exceeded -> patternFlag pinned to strain).
  // Fix: derive expected-events from the recent-history MEDIAN of this same window
  // (self-calibrating to whatever volume the engine produces, and robust to the
  // mixed-basis transition — median resists the old/new outliers a mean would not).
  // Patterns now fire on DEVIATION from the local norm, which is the real intent
  // (a "quiet week" / "busy wave" is relative, not an absolute count). Thin/early
  // history (no window) falls back to the legacy absolute floor so behavior is
  // unchanged when there isn't enough data to form a baseline.
  function median_(arr) {
    var a = arr.slice().filter(function(x) { return typeof x === "number" && !isNaN(x); }).sort(function(p, q) { return p - q; });
    if (!a.length) return 0;
    var mid = Math.floor(a.length / 2);
    return (a.length % 2) ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }
  // Floor at the legacy ~52-event baseline: below the floor the thresholds stay
  // at their old absolute values (no behavior change for the low-volume regime);
  // above it they scale with actual volume. This keeps the fix surgical — it only
  // changes behavior in the high-volume world that broke, not the legacy one.
  var EVENT_BASELINE_FLOOR = 50;
  var eventBaseline = Math.max(median_(eventsArr), EVENT_BASELINE_FLOOR);

  var pattern = "none";
  var calendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    calendarAdjusted: false
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR-ADJUSTED THRESHOLDS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  // High-activity holidays expect more events
  var highActivityHolidays = [
    "Independence", "Thanksgiving", "Holiday", "NewYearsEve", "NewYear",
    "OpeningDay", "OaklandPride", "ArtSoulFestival", "Halloween",
    "CincoDeMayo", "Juneteenth", "DiaDeMuertos"
  ];

  var isHighActivityHoliday = highActivityHolidays.indexOf(holiday) !== -1;
  var isHighActivityPeriod = isHighActivityHoliday || isFirstFriday ||
    sportsSeason === "championship" || sportsSeason === "playoffs";

  // engine.38 B2 — thresholds as ratios of the population-relative baseline.
  // Ratios preserve the original intent (at the legacy ~52 baseline these land
  // near the old 45/55/60/75 absolutes) but now scale with actual event volume.
  // The high-activity-period factor still widens the bands so holidays/playoffs
  // tolerate more activity before a "wave"/"elevated" call.
  var hap = isHighActivityPeriod ? 1.18 : 1.0;
  var stabilityThreshold = eventBaseline * 0.88 * hap; // below this for 5 cycles = stability-streak
  var microWaveThreshold = eventBaseline * 1.20 * hap; // above this for 3 cycles = micro-event-wave
  var calmThreshold      = eventBaseline * 1.00 * hap; // at/below norm post-shock = calm-after-shock
  var elevatedLow        = eventBaseline * 1.12 * hap; // [low, high) avg = elevated-activity
  var elevatedHigh       = eventBaseline * 1.50 * hap;

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN 1: stability-streak
  // Last 5 cycles: low chaos, no issues, stable civic load
  // ═══════════════════════════════════════════════════════════════════════════
  if (rows.length >= 5) {
    var stable = true;
    for (var i = 0; i < 5; i++) {
      var events = eventsArr[i];
      var issues = issuesArr[i];
      var civic = civicArr[i];

      if (events >= stabilityThreshold) { stable = false; break; }
      if (issues && issues.trim() !== "") { stable = false; break; }
      if (civic === "load-strain") { stable = false; break; }
    }
    if (stable && currentWorldEvents <= 2) {
      pattern = "stability-streak";
    }

    // v2.2: Creation Day enhances stability pattern
    if (stable && isCreationDay) {
      pattern = "stability-streak";
      calendarContext.calendarAdjusted = true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN 2: holiday-elevated (v2.2 - NEW)
  // High activity during holidays/special events is expected, not concerning
  // ═══════════════════════════════════════════════════════════════════════════
  if (pattern === "none" && isHighActivityPeriod) {
    var latestEvents = eventsArr[0];
    var latestShock = shockArr[0];
    var latestIssues = issuesArr[0];

    // High events but no shock/issues during holiday = holiday-elevated.
    // engine.38 B2: relative band [1.1, 1.7)x baseline (was absolute 55/80).
    if (latestEvents >= eventBaseline * 1.10 && latestEvents < eventBaseline * 1.70 &&
        latestShock !== "shock-flag" &&
        (!latestIssues || latestIssues.trim() === "")) {
      pattern = "holiday-elevated";
      calendarContext.calendarAdjusted = true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN 3: micro-event-wave
  // High activity but no shocks
  // v2.2: First Friday micro-waves are expected
  // ═══════════════════════════════════════════════════════════════════════════
  if (pattern === "none" && rows.length >= 3) {
    var wave = true;
    for (var j = 0; j < 3; j++) {
      if (eventsArr[j] < microWaveThreshold) { wave = false; break; }
      if (shockArr[j] === "shock-flag") { wave = false; break; }
    }
    if (wave) {
      pattern = "micro-event-wave";

      // v2.2: Note if First Friday contributed
      if (isFirstFriday) {
        calendarContext.calendarAdjusted = true;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN 4: strain-trend
  // Repeated civic strain or strong negative indicators
  // v2.2: Adjust sensitivity based on calendar context
  // ═══════════════════════════════════════════════════════════════════════════
  if (pattern === "none") {
    var strainCycles = civicArr.filter(function(c) { return c === "load-strain"; }).length;
    var minorVariance = civicArr.filter(function(c) { return c === "minor-variance"; }).length;
    var strongNegDrift = driftArr.filter(function(d) { return d <= -25; }).length;
    var negSentCycles = sentimentArr.filter(function(s) { return s <= -0.35; }).length;

    // v2.2: During high-activity periods, require more evidence of strain
    var strainThreshold2 = 2;
    var minorThreshold = 3;
    var negSentThreshold = 2;

    if (isHighActivityPeriod) {
      strainThreshold2 = 3;
      minorThreshold = 4;
      negSentThreshold = 3;
      calendarContext.calendarAdjusted = true;
    }

    // More sensitive: minor-variance accumulation also counts
    if (strainCycles >= strainThreshold2 ||
        (minorVariance >= minorThreshold && negSentCycles >= negSentThreshold)) {
      pattern = "strain-trend";
    }
    if (strongNegDrift >= 3 && negSentCycles >= negSentThreshold) {
      pattern = "strain-trend";
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN 5: calm-after-shock
  // Recovery from recent shock
  // ═══════════════════════════════════════════════════════════════════════════
  if (pattern === "none" && rows.length >= 3) {
    var latestIssues2 = issuesArr[0];
    var latestShock2 = shockArr[0];
    var earlierShockArr = shockArr.slice(1);
    var earlierShock = false;
    for (var k = 0; k < earlierShockArr.length; k++) {
      if (earlierShockArr[k] === "shock-flag") { earlierShock = true; break; }
    }
    var latestEvents2 = eventsArr[0];

    if (
      latestShock2 !== "shock-flag" &&
      (!latestIssues2 || latestIssues2.trim() === "") &&
      latestEvents2 < calmThreshold &&
      earlierShock
    ) {
      pattern = "calm-after-shock";
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN 6: elevated-activity
  // Moderate-high activity without crisis flags
  // v2.2: Adjust thresholds for calendar context
  // ═══════════════════════════════════════════════════════════════════════════
  if (pattern === "none" && rows.length >= 3) {
    var eventsSlice = eventsArr.slice(0, 3);
    var eventsSum = 0;
    for (var m = 0; m < eventsSlice.length; m++) { eventsSum += eventsSlice[m]; }
    var avgEvents = eventsSum / 3;
    if (avgEvents >= elevatedLow && avgEvents < elevatedHigh) {
      pattern = "elevated-activity";

      // v2.2: Cultural activity may explain elevation
      if (culturalActivity >= 1.4) {
        calendarContext.calendarAdjusted = true;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN MODIFIER: Community engagement buffer (v2.2)
  // High community engagement can downgrade concerning patterns
  // ═══════════════════════════════════════════════════════════════════════════
  if (pattern === "strain-trend" && communityEngagement >= 1.4) {
    // Strong community engagement may buffer strain
    // Downgrade to elevated-activity if strain is marginal
    var strainCyclesCount = civicArr.filter(function(c) { return c === "load-strain"; }).length;
    if (strainCyclesCount <= 2) {
      pattern = "elevated-activity";
      calendarContext.calendarAdjusted = true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  S.patternFlag = pattern;
  S.patternCalendarContext = calendarContext;
  
  ctx.summary = S;
}


/**
 * ============================================================================
 * PATTERN DETECTION REFERENCE
 * ============================================================================
 * 
 * Patterns (priority order):
 * 
 * 1. stability-streak
 *    - 5+ cycles with events < threshold, no issues, no load-strain
 *    - Current worldEvents <= 2
 *    - Creation Day enhances likelihood
 * 
 * 2. holiday-elevated (v2.2 NEW)
 *    - High activity (55-80 events) during holiday/First Friday/playoffs
 *    - No shock, no issues
 *    - Expected elevated activity, not concerning
 * 
 * 3. micro-event-wave
 *    - 3+ cycles with events >= threshold
 *    - No shocks
 *    - First Friday may contribute
 * 
 * 4. strain-trend
 *    - 2+ load-strain cycles, OR
 *    - 3+ minor-variance + 2+ negative sentiment cycles, OR
 *    - 3+ strong negative drift + 2+ negative sentiment cycles
 *    - v2.2: Higher thresholds during high-activity periods
 * 
 * 5. calm-after-shock
 *    - Current: no shock, no issues, events < threshold
 *    - Previous cycles: had shock
 * 
 * 6. elevated-activity
 *    - 3-cycle average between low and high thresholds
 *    - No crisis flags
 *    - Cultural activity may explain
 * 
 * 7. none
 *    - No pattern detected
 * 
 * Calendar-Adjusted Thresholds (v2.2):
 * 
 * | Threshold | Normal | High-Activity Period |
 * |-----------|--------|---------------------|
 * | stability | 45 | 55 |
 * | microWave | 55 | 65 |
 * | calm | 50 | 60 |
 * | elevated-low | 50 | 60 |
 * | elevated-high | 60 | 75 |
 * 
 * High-Activity Periods:
 * - Independence, Thanksgiving, Holiday, NewYearsEve, NewYear
 * - OpeningDay, OaklandPride, ArtSoulFestival, Halloween
 * - CincoDeMayo, Juneteenth, DiaDeMuertos
 * - First Friday
 * - Championship, Playoffs
 * 
 * Calendar Context Output:
 * - holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason
 * - calendarAdjusted: true if pattern was affected by calendar context
 * 
 * ============================================================================
 */