/**
 * ============================================================================
 * applySeasonalWeights_ v2.2
 * ============================================================================
 * 
 * Applies seasonal, holiday, sports, economic, and weather weights.
 * Aligned with GodWorld Calendar v1.0 and getSimHoliday_ v2.3.
 * 
 * Enhancements:
 * - Uses holiday priority system (major/cultural/oakland/minor)
 * - Adds Creation Day special handling
 * - Adds First Friday modifiers
 * - Adds Oakland-specific and cultural holiday support
 * - Cycle-aware (reads cycleOfYear for context)
 * 
 * ============================================================================
 */

function applySeasonalWeights_(ctx) {

  const S = ctx.summary;
  const season = S.season;
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const sports = S.sportsSeason;
  const econMood = S.economicMood || 50;
  const weatherMood = S.weatherMood || {};
  const isWeekend = S.isWeekend || false;
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const cycleOfYear = S.cycleOfYear || 1;

  // Local weight map
  const w = {
    weatherWeight: 1,
    civicWeight: 1,
    eventWeight: 1,
    nightlifeWeight: 1,
    schoolWeight: 1,
    sportsWeight: 1,
    economicWeight: 1,
    mediaWeight: 1,
    culturalWeight: 1,
    communityWeight: 1
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASON BASE WEIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  if (season === "Winter") {
    w.weatherWeight = 1.6;
    w.nightlifeWeight = 0.7;
    w.schoolWeight = 1.0;
    w.sportsWeight = 1.0;
    w.eventWeight = 0.9;
  }

  if (season === "Spring") {
    w.weatherWeight = 1.0;
    w.eventWeight = 1.2;
    w.civicWeight = 1.1;
  }

  if (season === "Summer") {
    w.weatherWeight = 0.9;
    w.eventWeight = 1.5;
    w.nightlifeWeight = 1.4;
    w.schoolWeight = 0.4;
    w.sportsWeight = 1.2;
  }

  if (season === "Fall") {
    w.weatherWeight = 1.0;
    w.schoolWeight = 1.4;
    w.civicWeight = 1.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEEKEND MODIFIER
  // ═══════════════════════════════════════════════════════════════════════════

  if (isWeekend) {
    w.nightlifeWeight *= 1.3;
    w.eventWeight *= 1.2;
    w.schoolWeight *= 0.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY MODIFIER (Oakland monthly art walk)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isFirstFriday) {
    w.nightlifeWeight *= 1.4;
    w.eventWeight *= 1.3;
    w.culturalWeight *= 1.5;
    w.communityWeight *= 1.3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY PRIORITY-BASED MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holidayPriority === "major") {
    w.eventWeight *= 1.5;
    w.mediaWeight *= 1.3;
  } else if (holidayPriority === "cultural") {
    w.culturalWeight *= 1.5;
    w.communityWeight *= 1.3;
    w.eventWeight *= 1.2;
  } else if (holidayPriority === "oakland") {
    w.communityWeight *= 1.4;
    w.eventWeight *= 1.3;
    w.culturalWeight *= 1.2;
  } else if (holidayPriority === "minor") {
    w.eventWeight *= 1.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFIC HOLIDAY MULTIPLIERS (Major)
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "Holiday") {  // Christmas
    w.eventWeight *= 1.6;
    w.nightlifeWeight *= 1.2;
    w.schoolWeight *= 0.3;
    w.economicWeight *= 1.4;  // Peak retail
  }

  if (holiday === "Independence") {
    w.eventWeight *= 2.0;
    w.nightlifeWeight *= 1.4;
    w.civicWeight *= 1.3;
  }

  if (holiday === "NewYear") {
    w.eventWeight *= 1.8;
    w.nightlifeWeight *= 1.6;
    w.schoolWeight *= 0.2;
  }

  if (holiday === "NewYearsEve") {
    w.eventWeight *= 2.0;
    w.nightlifeWeight *= 2.0;
    w.schoolWeight *= 0.1;
  }

  if (holiday === "Thanksgiving") {
    w.eventWeight *= 1.4;
    w.nightlifeWeight *= 0.8;  // Family time
    w.schoolWeight *= 0.2;
    w.economicWeight *= 1.2;  // Shopping season begins
    w.communityWeight *= 1.3;
  }

  if (holiday === "Halloween") {
    w.eventWeight *= 1.5;
    w.nightlifeWeight *= 1.3;
    w.culturalWeight *= 1.2;
  }

  if (holiday === "LaborDay" || holiday === "MemorialDay") {
    w.eventWeight *= 1.4;
    w.nightlifeWeight *= 1.3;
    w.schoolWeight *= 0.3;
    w.civicWeight *= 1.2;
  }

  if (holiday === "Easter") {
    w.eventWeight *= 1.3;
    w.schoolWeight *= 0.5;
    w.communityWeight *= 1.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFIC HOLIDAY MULTIPLIERS (Civic/Remembrance)
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "MLKDay") {
    w.civicWeight *= 1.5;
    w.eventWeight *= 1.2;
    w.schoolWeight *= 0.5;
    w.communityWeight *= 1.4;
  }

  if (holiday === "Juneteenth") {
    w.civicWeight *= 1.5;
    w.eventWeight *= 1.4;
    w.culturalWeight *= 1.5;
    w.communityWeight *= 1.5;
    w.nightlifeWeight *= 1.2;
  }

  if (holiday === "VeteransDay") {
    w.civicWeight *= 1.4;
    w.eventWeight *= 1.1;
    w.schoolWeight *= 0.5;
  }

  if (holiday === "PatriotDay") {  // 9/11
    w.civicWeight *= 1.3;
    w.eventWeight *= 0.8;  // Somber
    w.nightlifeWeight *= 0.7;
  }

  if (holiday === "IndigenousPeoplesDay") {
    w.civicWeight *= 1.3;
    w.culturalWeight *= 1.4;
    w.communityWeight *= 1.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFIC HOLIDAY MULTIPLIERS (Cultural)
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "CincoDeMayo") {
    w.culturalWeight *= 1.6;
    w.eventWeight *= 1.4;
    w.nightlifeWeight *= 1.3;
    w.communityWeight *= 1.4;  // Fruitvale
  }

  if (holiday === "DiaDeMuertos") {
    w.culturalWeight *= 1.7;
    w.eventWeight *= 1.3;
    w.communityWeight *= 1.5;  // Fruitvale
  }

  if (holiday === "PrideMonth") {
    w.culturalWeight *= 1.4;
    w.eventWeight *= 1.3;
    w.communityWeight *= 1.3;
  }

  if (holiday === "BlackHistoryMonth") {
    w.culturalWeight *= 1.4;
    w.civicWeight *= 1.2;
    w.communityWeight *= 1.3;
  }

  if (holiday === "Hanukkah") {
    w.culturalWeight *= 1.3;
    w.communityWeight *= 1.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFIC HOLIDAY MULTIPLIERS (Oakland)
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "OaklandPride") {
    w.eventWeight *= 1.5;
    w.nightlifeWeight *= 1.4;
    w.culturalWeight *= 1.5;
    w.communityWeight *= 1.5;
  }

  if (holiday === "ArtSoulFestival") {
    w.eventWeight *= 1.6;
    w.culturalWeight *= 1.6;
    w.communityWeight *= 1.5;
    w.nightlifeWeight *= 1.3;
  }

  if (holiday === "OpeningDay") {  // A's Opening Day
    w.sportsWeight *= 1.8;
    w.eventWeight *= 1.5;
    w.nightlifeWeight *= 1.3;
    w.communityWeight *= 1.3;
  }

  if (holiday === "SummerFestival") {
    w.eventWeight *= 1.4;
    w.nightlifeWeight *= 1.3;
    w.communityWeight *= 1.3;
  }

  if (holiday === "EarthDay") {
    w.civicWeight *= 1.3;
    w.eventWeight *= 1.2;
    w.communityWeight *= 1.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFIC HOLIDAY MULTIPLIERS (Minor)
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "Valentine") {
    w.nightlifeWeight *= 1.2;
    w.eventWeight *= 1.1;
    w.economicWeight *= 1.1;  // Retail
  }

  if (holiday === "StPatricksDay") {
    w.nightlifeWeight *= 1.4;
    w.eventWeight *= 1.2;
  }

  if (holiday === "MothersDay" || holiday === "FathersDay") {
    w.eventWeight *= 1.1;
    w.economicWeight *= 1.2;  // Retail
    w.communityWeight *= 1.1;
  }

  if (holiday === "PresidentsDay") {
    w.schoolWeight *= 0.3;
    w.economicWeight *= 1.1;  // Sales
  }

  if (holiday === "BackToSchool") {
    w.schoolWeight *= 1.5;
    w.economicWeight *= 1.2;  // Supplies shopping
  }

  // Seasonal markers (equinoxes/solstices)
  if (holiday === "SpringEquinox" || holiday === "FallEquinox" || 
      holiday === "SummerSolstice" || holiday === "WinterSolstice") {
    w.weatherWeight *= 1.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY (GodWorld Special)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isCreationDay || holiday === "CreationDay") {
    w.eventWeight *= 1.5;
    w.mediaWeight *= 1.4;
    w.communityWeight *= 1.3;
    w.culturalWeight *= 1.2;
    
    // Special: citizens may have vague "founding" awareness
    S.creationDayActive = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON MULTIPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (sports === "spring-training") {
    w.sportsWeight *= 1.2;
  }
  if (sports === "early-season" || sports === "regular-season") {
    w.sportsWeight *= 1.4;
  }
  if (sports === "mid-season") {
    w.sportsWeight *= 1.6;
    w.eventWeight *= 1.1;
  }
  if (sports === "late-season") {
    w.sportsWeight *= 1.8;
    w.eventWeight *= 1.2;
  }
  if (sports === "playoffs" || sports === "post-season") {
    w.sportsWeight *= 2.0;
    w.eventWeight *= 1.3;
    w.nightlifeWeight *= 1.2;
    w.mediaWeight *= 1.3;
  }
  if (sports === "championship") {
    w.sportsWeight *= 2.5;
    w.eventWeight *= 1.5;
    w.nightlifeWeight *= 1.4;
    w.mediaWeight *= 1.5;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC MOOD MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (econMood >= 65) {
    w.economicWeight = 1.3;
    w.nightlifeWeight *= 1.1;
    w.eventWeight *= 1.1;
  } else if (econMood <= 35) {
    w.economicWeight = 0.7;
    w.nightlifeWeight *= 0.9;
    w.civicWeight *= 1.2;  // More civic concern
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MOOD MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (weatherMood.perfectWeather) {
    w.eventWeight *= 1.2;
    w.nightlifeWeight *= 1.1;
  }
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.3) {
    w.eventWeight *= 0.8;
    w.nightlifeWeight *= 0.8;
  }
  if (weatherMood.primaryMood === 'cozy') {
    w.nightlifeWeight *= 0.9;
    w.communityWeight *= 1.1;  // Indoor gatherings
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA WEIGHT (based on context)
  // ═══════════════════════════════════════════════════════════════════════════

  const mediaEffects = S.mediaEffects || {};
  if (mediaEffects.coverageIntensity === 'saturated') {
    w.mediaWeight *= 1.5;
  } else if (mediaEffects.coverageIntensity === 'heavy') {
    w.mediaWeight *= 1.3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL ASSIGNMENT
  // ═══════════════════════════════════════════════════════════════════════════

  S.seasonal = w;
  ctx.summary = S;
}


/**
 * ============================================================================
 * WEIGHT REFERENCE
 * ============================================================================
 * 
 * Weight         | Base | Affected By
 * ─────────────────────────────────────────────────────────────────────────
 * weatherWeight  | 1    | Season, equinox/solstice
 * civicWeight    | 1    | Season, civic holidays, economic mood
 * eventWeight    | 1    | Season, holidays, weekend, First Friday, sports
 * nightlifeWeight| 1    | Season, holidays, weekend, First Friday, weather
 * schoolWeight   | 1    | Season, holidays, weekend
 * sportsWeight   | 1    | Season, sports season, Opening Day
 * economicWeight | 1    | Holidays (retail), economic mood
 * mediaWeight    | 1    | Holidays, sports playoffs, media effects
 * culturalWeight | 1    | Cultural holidays, Oakland events, First Friday
 * communityWeight| 1    | Holidays, Oakland events, First Friday
 * 
 * ============================================================================
 */