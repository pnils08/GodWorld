/**
 * ============================================================================
 * applyCycleRecovery_ v2.2
 * ============================================================================
 *
 * If last cycle was heavy, enforce a recovery window.
 * Now calendar-aware: celebration days tolerate more chaos, quiet holidays
 * enforce stricter recovery.
 *
 * v2.2 Enhancements:
 * - Major celebration days raise recovery thresholds
 * - Quiet family holidays lower thresholds for calm
 * - Championship/playoffs tolerate more fan energy
 * - First Friday/Creation Day get slight tolerance boost
 * - Calendar context in output
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Overload score calculation
 * - Gradual recovery levels (light, moderate, heavy)
 * - Suppression multipliers
 * 
 * ============================================================================
 */

function applyCycleRecovery_(ctx) {
  const S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || 'off-season';

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: CALENDAR-BASED THRESHOLD MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Start with base thresholds
  let lightThreshold = 3;
  let moderateThreshold = 6;
  let heavyThreshold = 10;

  // Major celebration days → can handle more chaos
  const bigCelebrations = ['OaklandPride', 'ArtSoulFestival', 'NewYearsEve', 'Independence'];
  if (bigCelebrations.includes(holiday)) {
    lightThreshold += 3;
    moderateThreshold += 4;
    heavyThreshold += 5;
  }

  // Oakland-priority holidays → tolerate more activity
  if (holidayPriority === 'oakland' && !bigCelebrations.includes(holiday)) {
    lightThreshold += 2;
    moderateThreshold += 2;
    heavyThreshold += 3;
  }

  // Cultural festivals → moderate tolerance boost
  const culturalFestivals = ['LunarNewYear', 'CincoDeMayo', 'DiaDeMuertos', 'Juneteenth'];
  if (culturalFestivals.includes(holiday)) {
    lightThreshold += 2;
    moderateThreshold += 2;
    heavyThreshold += 3;
  }

  // Party holidays → tolerate nightlife chaos
  if (holiday === 'StPatricksDay' || holiday === 'Halloween') {
    lightThreshold += 2;
    moderateThreshold += 2;
    heavyThreshold += 2;
  }

  // Quiet family holidays → want peace, stricter recovery
  const quietHolidays = ['Thanksgiving', 'Easter', 'MothersDay', 'FathersDay'];
  if (quietHolidays.includes(holiday)) {
    lightThreshold -= 1;
    moderateThreshold -= 1;
    heavyThreshold -= 2;
  }

  // Winter holiday season → moderate tolerance
  if (holiday === 'Holiday') {
    lightThreshold += 1;
    moderateThreshold += 1;
    heavyThreshold += 1;
  }

  // Championship → fans can handle excitement
  if (sportsSeason === 'championship') {
    lightThreshold += 3;
    moderateThreshold += 4;
    heavyThreshold += 4;
  } else if (sportsSeason === 'playoffs') {
    lightThreshold += 2;
    moderateThreshold += 2;
    heavyThreshold += 3;
  } else if (sportsSeason === 'late-season') {
    lightThreshold += 1;
    moderateThreshold += 1;
    heavyThreshold += 1;
  }

  // Opening Day → special tolerance
  if (holiday === 'OpeningDay') {
    lightThreshold += 2;
    moderateThreshold += 3;
    heavyThreshold += 3;
  }

  // First Friday → arts crowd tolerates creative chaos
  if (isFirstFriday) {
    lightThreshold += 1;
    moderateThreshold += 2;
    heavyThreshold += 2;
  }

  // Creation Day → community pride tolerates activity
  if (isCreationDay) {
    lightThreshold += 1;
    moderateThreshold += 1;
    heavyThreshold += 2;
  }

  // Ensure thresholds don't go below minimums
  lightThreshold = Math.max(2, lightThreshold);
  moderateThreshold = Math.max(4, moderateThreshold);
  heavyThreshold = Math.max(7, heavyThreshold);

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE OVERLOAD SCORE (preserved from v2.1)
  // ═══════════════════════════════════════════════════════════════════════════
  let overloadScore = 0;

  // Texture triggers
  const textureCount = S.textureTriggers ? S.textureTriggers.length : 0;
  if (textureCount > 6) overloadScore += 3;
  else if (textureCount > 4) overloadScore += 2;
  else if (textureCount > 2) overloadScore += 1;

  // Story hooks
  const hookCount = S.storyHooks ? S.storyHooks.length : 0;
  if (hookCount > 7) overloadScore += 3;
  else if (hookCount > 5) overloadScore += 2;
  else if (hookCount > 3) overloadScore += 1;

  // Shock flag (string check)
  if (S.shockFlag === 'shock-flag') overloadScore += 3;

  // World events
  const eventCount = S.worldEvents ? S.worldEvents.length : 0;
  if (eventCount > 10) overloadScore += 3;
  else if (eventCount > 6) overloadScore += 2;
  else if (eventCount > 4) overloadScore += 1;

  // Civic load (string check)
  if (S.civicLoad === 'load-strain') overloadScore += 3;
  else if (S.civicLoad === 'minor-variance') overloadScore += 1;

  // Civic load score (numeric)
  const civicScore = S.civicLoadScore || 0;
  if (civicScore >= 15) overloadScore += 2;
  else if (civicScore >= 10) overloadScore += 1;

  // Economic stress
  const econMood = S.economicMood || 50;
  if (econMood <= 25) overloadScore += 2;
  else if (econMood <= 35) overloadScore += 1;

  // Weather discomfort
  const weatherMood = S.weatherMood || {};
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.25) {
    overloadScore += 1;
  }

  // Active arcs at peak
  const arcs = S.eventArcs || [];
  const peakArcs = arcs.filter(a => a && a.phase === 'peak').length;
  if (peakArcs >= 3) overloadScore += 2;
  else if (peakArcs >= 2) overloadScore += 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE RECOVERY LEVEL (using calendar-adjusted thresholds)
  // ═══════════════════════════════════════════════════════════════════════════
  let recoveryLevel = 'none';
  if (overloadScore >= heavyThreshold) recoveryLevel = 'heavy';
  else if (overloadScore >= moderateThreshold) recoveryLevel = 'moderate';
  else if (overloadScore >= lightThreshold) recoveryLevel = 'light';

  // Set recovery mode
  S.recoveryMode = recoveryLevel !== 'none';
  S.recoveryLevel = recoveryLevel;
  S.overloadScore = overloadScore;

  // v2.2: Store thresholds for debugging
  S.recoveryThresholds = {
    light: lightThreshold,
    moderate: moderateThreshold,
    heavy: heavyThreshold
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY SUPPRESSION BASED ON RECOVERY LEVEL
  // ═══════════════════════════════════════════════════════════════════════════
  if (recoveryLevel === 'heavy') {
    S.suppressEvents = true;
    S.suppressHooks = true;
    S.suppressTextures = true;
    S.eventSuppression = 0.5;  // 50% event reduction
    S.hookSuppression = 0.5;
    S.textureSuppression = 0.6;
  } else if (recoveryLevel === 'moderate') {
    S.suppressEvents = false;
    S.suppressHooks = true;
    S.suppressTextures = true;
    S.eventSuppression = 0.75; // 25% event reduction
    S.hookSuppression = 0.6;
    S.textureSuppression = 0.7;
  } else if (recoveryLevel === 'light') {
    S.suppressEvents = false;
    S.suppressHooks = false;
    S.suppressTextures = true;
    S.eventSuppression = 0.9;  // 10% event reduction
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

  // v2.2: Calendar context for debugging
  S.recoveryCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    thresholdAdjustment: heavyThreshold - 10 // How much we raised/lowered from default
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * CYCLE RECOVERY REFERENCE v2.2
 * ============================================================================
 * 
 * BASE THRESHOLDS:
 * - Light: 3
 * - Moderate: 6
 * - Heavy: 10
 * 
 * CALENDAR THRESHOLD ADJUSTMENTS (v2.2):
 * 
 * | Context | Light | Moderate | Heavy | Effect |
 * |---------|-------|----------|-------|--------|
 * | Pride/ArtSoul/NYE/July4 | +3 | +4 | +5 | Celebration tolerance |
 * | Oakland priority holidays | +2 | +2 | +3 | Local pride tolerance |
 * | Cultural festivals | +2 | +2 | +3 | Cultural tolerance |
 * | StPatricksDay/Halloween | +2 | +2 | +2 | Party tolerance |
 * | Thanksgiving/Easter/Parents | -1 | -1 | -2 | Quiet enforcement |
 * | Holiday (winter) | +1 | +1 | +1 | Slight tolerance |
 * | Championship | +3 | +4 | +4 | Fan energy tolerance |
 * | Playoffs | +2 | +2 | +3 | Sports tolerance |
 * | Late-season | +1 | +1 | +1 | Slight tolerance |
 * | Opening Day | +2 | +3 | +3 | Baseball tolerance |
 * | First Friday | +1 | +2 | +2 | Arts tolerance |
 * | Creation Day | +1 | +1 | +2 | Community tolerance |
 * 
 * EXAMPLE EFFECTIVE THRESHOLDS:
 * - Oakland Pride: Light=6, Moderate=10, Heavy=15
 * - Thanksgiving: Light=2, Moderate=5, Heavy=8
 * - Championship during Pride: Light=9, Moderate=14, Heavy=19
 * - Regular day: Light=3, Moderate=6, Heavy=10
 * 
 * OUTPUT:
 * - recoveryMode: boolean
 * - recoveryLevel: none/light/moderate/heavy
 * - overloadScore: number
 * - recoveryThresholds: {light, moderate, heavy}
 * - recoveryCalendarContext: {holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, thresholdAdjustment}
 * 
 * ============================================================================
 */