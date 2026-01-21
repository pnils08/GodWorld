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

  const sheet = ctx.ss.getSheetByName('Riley_Digest');
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) {
    ctx.summary.patternFlag = "none";
    ctx.summary.patternCalendarContext = {};
    return;
  }

  const S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";
  const culturalActivity = (S.cityDynamics || {}).culturalActivity || 1;
  const communityEngagement = (S.cityDynamics || {}).communityEngagement || 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════
  function getRow(r) {
    return sheet.getRange(r, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  const rows = [];
  const windowSize = Math.min(7, lastRow - 1);

  for (let r = lastRow; r > lastRow - windowSize; r--) {
    rows.push(getRow(r));
  }

  // Extract arrays for last N cycles
  const eventsArr = rows.map(r => Number(r[4] || 0)); // E - EventsGenerated
  const issuesArr = rows.map(r => (r[5] || "").toString());
  const civicArr = rows.map(r => (r[8] || "").toString()); // I - CivicLoad
  const driftArr = rows.map(r => Number(r[9] || 0)); // J - MigrationDrift
  const patternArr = rows.map(r => (r[10] || "").toString());
  const shockArr = rows.map(r => (r[11] || "").toString()); // L - ShockFlag
  const seedsArr = rows.map(r => Number(r[12] || 0));
  const sentimentArr = rows.map(r => Number(r[27] || 0)); // AB - Sentiment

  // Also check worldEvents count from ctx for current cycle
  const currentWorldEvents = (S.worldEvents || []).length;

  let pattern = "none";
  const calendarContext = {
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
  const highActivityHolidays = [
    "Independence", "Thanksgiving", "Holiday", "NewYearsEve", "NewYear",
    "OpeningDay", "OaklandPride", "ArtSoulFestival", "Halloween",
    "CincoDeMayo", "Juneteenth", "DiaDeMuertos"
  ];
  
  const isHighActivityHoliday = highActivityHolidays.includes(holiday);
  const isHighActivityPeriod = isHighActivityHoliday || isFirstFriday || 
    sportsSeason === "championship" || sportsSeason === "playoffs";

  // Adjusted thresholds for high-activity periods
  const stabilityThreshold = isHighActivityPeriod ? 55 : 45;
  const microWaveThreshold = isHighActivityPeriod ? 65 : 55;
  const calmThreshold = isHighActivityPeriod ? 60 : 50;
  const elevatedLow = isHighActivityPeriod ? 60 : 50;
  const elevatedHigh = isHighActivityPeriod ? 75 : 60;

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN 1: stability-streak
  // Last 5 cycles: low chaos, no issues, stable civic load
  // ═══════════════════════════════════════════════════════════════════════════
  if (rows.length >= 5) {
    let stable = true;
    for (let i = 0; i < 5; i++) {
      const events = eventsArr[i];
      const issues = issuesArr[i];
      const civic = civicArr[i];

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
    const latestEvents = eventsArr[0];
    const latestShock = shockArr[0];
    const latestIssues = issuesArr[0];
    
    // High events but no shock/issues during holiday = holiday-elevated
    if (latestEvents >= 55 && latestEvents < 80 &&
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
    let wave = true;
    for (let i = 0; i < 3; i++) {
      if (eventsArr[i] < microWaveThreshold) { wave = false; break; }
      if (shockArr[i] === "shock-flag") { wave = false; break; }
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
    const strainCycles = civicArr.filter(c => c === "load-strain").length;
    const minorVariance = civicArr.filter(c => c === "minor-variance").length;
    const strongNegDrift = driftArr.filter(d => d <= -25).length;
    const negSentCycles = sentimentArr.filter(s => s <= -0.35).length;

    // v2.2: During high-activity periods, require more evidence of strain
    let strainThreshold = 2;
    let minorThreshold = 3;
    let negSentThreshold = 2;
    
    if (isHighActivityPeriod) {
      strainThreshold = 3;
      minorThreshold = 4;
      negSentThreshold = 3;
      calendarContext.calendarAdjusted = true;
    }

    // More sensitive: minor-variance accumulation also counts
    if (strainCycles >= strainThreshold || 
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
    const latestIssues = issuesArr[0];
    const latestShock = shockArr[0];
    const earlierShock = shockArr.slice(1).some(s => s === "shock-flag");
    const latestEvents = eventsArr[0];

    if (
      latestShock !== "shock-flag" &&
      (!latestIssues || latestIssues.trim() === "") &&
      latestEvents < calmThreshold &&
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
    const avgEvents = eventsArr.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
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
    const strainCycles = civicArr.filter(c => c === "load-strain").length;
    if (strainCycles <= 2) {
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