/**
 * ============================================================================
 * applyChaosCategoryWeights_ v2.3
 * ============================================================================
 *
 * Applies chaos category weights with named indices.
 * Aligned with GodWorld Calendar v1.0 and getSimHoliday_ v2.3.
 *
 * v2.3 Changes:
 * - Guard for missing ctx.summary
 * - CAT length assertion (prevents silent drift)
 * - Minimum floors for MEDICAL/UTILITY/ACCIDENT
 * - ES5 compatible (var instead of const/let)
 *
 * Enhancements:
 * - All 30+ holidays from cycle-based calendar
 * - First Friday modifiers
 * - Creation Day handling
 * - Oakland-specific and cultural holiday support
 * - Championship sports state
 * - Holiday priority awareness
 *
 * ============================================================================
 */

function applyChaosCategoryWeights_(ctx) {

  // Guard for missing ctx.summary
  var S = ctx.summary || (ctx.summary = {});
  var season = S.season;
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var sports = S.sportsSeason;
  var econMood = S.economicMood || 50;
  var weatherMood = S.weatherMood || {};
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;

  // Category index mapping (must match worldEventsEngine_)
  var CAT = {
    RESTAURANT: 0,
    BUSINESS: 1,
    MEDICAL: 2,
    WEATHER: 3,
    CELEBRITY: 4,
    SCHOOL: 5,
    SPORTS: 6,
    CIVIC: 7,
    PROTEST: 8,
    CRIME: 9,
    ACCIDENT: 10,
    MEETING: 11,
    UTILITY: 12,
    NEAR_MISS: 13,
    MICRO_CRIME: 14,
    INFRASTRUCTURE: 15,
    COMMUNITY: 16
  };

  // Hard guard: verify CAT has exactly 17 keys (prevents silent drift)
  var catKeys = Object.keys(CAT);
  if (catKeys.length !== 17) {
    Logger.log('applyChaosCategoryWeights_: CAT drift detected! Expected 17, got ' + catKeys.length);
  }

  // 17 fixed-category weights
  var w = [];
  for (var init = 0; init < 17; init++) { w[init] = 1; }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASON MULTIPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (season === "Winter") {
    w[CAT.WEATHER] *= 1.8;
    w[CAT.RESTAURANT] *= 0.8;
    w[CAT.MICRO_CRIME] *= 1.2;
    w[CAT.INFRASTRUCTURE] *= 1.1;
    w[CAT.MEDICAL] *= 1.2;
  }

  if (season === "Spring") {
    w[CAT.CIVIC] *= 1.3;
    w[CAT.SCHOOL] *= 1.2;
    w[CAT.CELEBRITY] *= 1.1;
    w[CAT.MEDICAL] *= 1.2;
    w[CAT.COMMUNITY] *= 1.2;
  }

  if (season === "Summer") {
    w[CAT.SPORTS] *= 1.3;
    w[CAT.CELEBRITY] *= 1.5;
    w[CAT.RESTAURANT] *= 1.3;
    w[CAT.PROTEST] *= 1.3;
    w[CAT.NEAR_MISS] *= 1.2;
    w[CAT.INFRASTRUCTURE] *= 0.8;
    w[CAT.COMMUNITY] *= 1.3;
  }

  if (season === "Fall") {
    w[CAT.SCHOOL] *= 1.5;
    w[CAT.CIVIC] *= 1.3;
    w[CAT.MEETING] *= 1.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY (Oakland monthly art walk)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isFirstFriday) {
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.RESTAURANT] *= 1.3;
    w[CAT.CELEBRITY] *= 1.2;  // Local artists, personalities
    w[CAT.MICRO_CRIME] *= 1.1;  // Crowded streets
    w[CAT.NEAR_MISS] *= 1.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY (GodWorld Special - Cycle 48)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isCreationDay || holiday === "CreationDay") {
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.CIVIC] *= 1.3;
    w[CAT.MEETING] *= 1.3;
    w[CAT.CELEBRITY] *= 1.2;  // Foundational figures
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY PRIORITY BASELINE
  // ═══════════════════════════════════════════════════════════════════════════

  if (holidayPriority === "major") {
    w[CAT.COMMUNITY] *= 1.2;
    w[CAT.RESTAURANT] *= 1.1;
  } else if (holidayPriority === "cultural") {
    w[CAT.COMMUNITY] *= 1.3;
    w[CAT.CIVIC] *= 1.1;
  } else if (holidayPriority === "oakland") {
    w[CAT.COMMUNITY] *= 1.3;
    w[CAT.CELEBRITY] *= 1.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAJOR HOLIDAY MULTIPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "NewYear") {
    w[CAT.CELEBRITY] *= 1.5;
    w[CAT.RESTAURANT] *= 1.2;
    w[CAT.MEETING] *= 1.3;
    w[CAT.BUSINESS] *= 1.2;  // New year planning
  }

  if (holiday === "NewYearsEve") {
    w[CAT.CELEBRITY] *= 1.6;
    w[CAT.RESTAURANT] *= 1.4;
    w[CAT.WEATHER] *= 1.1;
    w[CAT.MEETING] *= 1.2;
    w[CAT.ACCIDENT] *= 1.4;  // Late night activity
    w[CAT.MICRO_CRIME] *= 1.3;
  }

  if (holiday === "MLKDay") {
    w[CAT.CIVIC] *= 1.6;
    w[CAT.PROTEST] *= 1.4;
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.MEETING] *= 1.3;
  }

  if (holiday === "Easter") {
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.RESTAURANT] *= 1.3;
    w[CAT.MEETING] *= 1.2;
  }

  if (holiday === "MemorialDay") {
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.RESTAURANT] *= 1.3;
    w[CAT.ACCIDENT] *= 1.2;
    w[CAT.CIVIC] *= 1.2;
  }

  if (holiday === "Juneteenth") {
    w[CAT.CIVIC] *= 1.5;
    w[CAT.PROTEST] *= 1.3;
    w[CAT.COMMUNITY] *= 1.5;
    w[CAT.CELEBRITY] *= 1.3;
    w[CAT.RESTAURANT] *= 1.2;
  }

  if (holiday === "Independence") {
    w[CAT.PROTEST] *= 1.7;
    w[CAT.CELEBRITY] *= 1.4;
    w[CAT.SPORTS] *= 1.6;
    w[CAT.NEAR_MISS] *= 1.3;  // Fireworks
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.ACCIDENT] *= 1.2;
  }

  if (holiday === "LaborDay") {
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.RESTAURANT] *= 1.3;
    w[CAT.ACCIDENT] *= 1.2;
    w[CAT.CIVIC] *= 1.2;
  }

  if (holiday === "Halloween") {
    w[CAT.COMMUNITY] *= 1.5;
    w[CAT.MICRO_CRIME] *= 1.4;
    w[CAT.ACCIDENT] *= 1.3;
    w[CAT.NEAR_MISS] *= 1.2;
    w[CAT.CELEBRITY] *= 1.2;  // Costume sightings
  }

  if (holiday === "Thanksgiving") {
    w[CAT.RESTAURANT] *= 1.5;
    w[CAT.ACCIDENT] *= 1.3;  // Travel
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.BUSINESS] *= 1.2;
    w[CAT.MEDICAL] *= 1.1;  // Kitchen accidents
  }

  if (holiday === "Holiday") {  // Christmas
    w[CAT.RESTAURANT] *= 1.4;
    w[CAT.CELEBRITY] *= 1.4;
    w[CAT.MEETING] *= 1.4;
    w[CAT.BUSINESS] *= 1.3;
    w[CAT.COMMUNITY] *= 1.3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL HOLIDAY MULTIPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "BlackHistoryMonth") {
    w[CAT.CIVIC] *= 1.4;
    w[CAT.COMMUNITY] *= 1.3;
    w[CAT.MEETING] *= 1.2;
    w[CAT.CELEBRITY] *= 1.2;
  }

  if (holiday === "CincoDeMayo") {
    w[CAT.COMMUNITY] *= 1.5;
    w[CAT.RESTAURANT] *= 1.5;
    w[CAT.CELEBRITY] *= 1.2;
    w[CAT.MICRO_CRIME] *= 1.2;
    w[CAT.ACCIDENT] *= 1.1;
  }

  if (holiday === "PrideMonth") {
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.CIVIC] *= 1.3;
    w[CAT.CELEBRITY] *= 1.3;
    w[CAT.PROTEST] *= 1.2;
  }

  if (holiday === "IndigenousPeoplesDay") {
    w[CAT.CIVIC] *= 1.4;
    w[CAT.COMMUNITY] *= 1.3;
    w[CAT.PROTEST] *= 1.2;
  }

  if (holiday === "DiaDeMuertos") {
    w[CAT.COMMUNITY] *= 1.5;
    w[CAT.CIVIC] *= 1.2;
    w[CAT.CELEBRITY] *= 1.2;
    w[CAT.RESTAURANT] *= 1.2;
  }

  if (holiday === "Hanukkah") {
    w[CAT.COMMUNITY] *= 1.3;
    w[CAT.RESTAURANT] *= 1.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND-SPECIFIC HOLIDAY MULTIPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "OpeningDay") {
    w[CAT.SPORTS] *= 2.0;
    w[CAT.RESTAURANT] *= 1.4;
    w[CAT.CELEBRITY] *= 1.4;
    w[CAT.COMMUNITY] *= 1.3;
    w[CAT.NEAR_MISS] *= 1.2;
  }

  if (holiday === "OaklandPride") {
    w[CAT.COMMUNITY] *= 1.6;
    w[CAT.CIVIC] *= 1.4;
    w[CAT.CELEBRITY] *= 1.4;
    w[CAT.RESTAURANT] *= 1.3;
    w[CAT.PROTEST] *= 1.2;
  }

  if (holiday === "EarthDay") {
    w[CAT.CIVIC] *= 1.4;
    w[CAT.COMMUNITY] *= 1.3;
    w[CAT.PROTEST] *= 1.2;
    w[CAT.MEETING] *= 1.2;
  }

  if (holiday === "ArtSoulFestival") {
    w[CAT.COMMUNITY] *= 1.6;
    w[CAT.CELEBRITY] *= 1.5;
    w[CAT.RESTAURANT] *= 1.4;
    w[CAT.MICRO_CRIME] *= 1.2;
    w[CAT.NEAR_MISS] *= 1.2;
  }

  if (holiday === "SummerFestival") {
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.RESTAURANT] *= 1.3;
    w[CAT.CELEBRITY] *= 1.2;
    w[CAT.NEAR_MISS] *= 1.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MINOR HOLIDAY MULTIPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "Valentine") {
    w[CAT.RESTAURANT] *= 1.5;
    w[CAT.CELEBRITY] *= 1.3;
    w[CAT.BUSINESS] *= 1.2;  // Retail
  }

  if (holiday === "StPatricksDay") {
    w[CAT.RESTAURANT] *= 1.5;
    w[CAT.ACCIDENT] *= 1.3;
    w[CAT.MICRO_CRIME] *= 1.2;
    w[CAT.NEAR_MISS] *= 1.2;
  }

  if (holiday === "PresidentsDay") {
    w[CAT.CIVIC] *= 1.2;
    w[CAT.BUSINESS] *= 1.2;
  }

  if (holiday === "MothersDay" || holiday === "FathersDay") {
    w[CAT.RESTAURANT] *= 1.4;
    w[CAT.COMMUNITY] *= 1.2;
    w[CAT.BUSINESS] *= 1.2;
  }

  if (holiday === "VeteransDay") {
    w[CAT.CIVIC] *= 1.4;
    w[CAT.MEETING] *= 1.3;
  }

  if (holiday === "PatriotDay") {  // 9/11
    w[CAT.CIVIC] *= 1.4;
    w[CAT.MEETING] *= 1.2;
    w[CAT.COMMUNITY] *= 1.2;
  }

  if (holiday === "BackToSchool") {
    w[CAT.SCHOOL] *= 1.6;
    w[CAT.BUSINESS] *= 1.3;
    w[CAT.INFRASTRUCTURE] *= 1.2;
  }

  // Seasonal markers (equinoxes/solstices)
  if (holiday === "SpringEquinox" || holiday === "FallEquinox" ||
      holiday === "SummerSolstice" || holiday === "WinterSolstice") {
    w[CAT.WEATHER] *= 1.2;
    w[CAT.COMMUNITY] *= 1.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON MULTIPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (sports === "spring-training") {
    w[CAT.SPORTS] *= 1.2;
  }

  if (sports === "early-season" || sports === "regular-season") {
    w[CAT.SPORTS] *= 1.4;
  }

  if (sports === "mid-season") {
    w[CAT.SPORTS] *= 1.6;
    w[CAT.RESTAURANT] *= 1.1;
    w[CAT.CELEBRITY] *= 1.2;
  }

  if (sports === "late-season") {
    w[CAT.SPORTS] *= 1.8;
    w[CAT.PROTEST] *= 1.3;
  }

  if (sports === "playoffs" || sports === "post-season") {
    w[CAT.SPORTS] *= 2.0;
    w[CAT.CELEBRITY] *= 1.3;
    w[CAT.RESTAURANT] *= 1.2;
    w[CAT.NEAR_MISS] *= 1.2;
  }

  if (sports === "championship") {
    w[CAT.SPORTS] *= 2.5;
    w[CAT.CELEBRITY] *= 1.5;
    w[CAT.RESTAURANT] *= 1.3;
    w[CAT.COMMUNITY] *= 1.4;
    w[CAT.NEAR_MISS] *= 1.3;
    w[CAT.PROTEST] *= 1.2;  // Celebration crowds
  }

  if (sports === "off-season") {
    w[CAT.SPORTS] *= 0.6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC MOOD MULTIPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (econMood >= 65) {
    w[CAT.BUSINESS] *= 1.3;
    w[CAT.RESTAURANT] *= 1.2;
    w[CAT.CELEBRITY] *= 1.2;
  }

  if (econMood <= 35) {
    w[CAT.BUSINESS] *= 0.8;
    w[CAT.PROTEST] *= 1.4;
    w[CAT.CRIME] *= 1.2;
    w[CAT.MICRO_CRIME] *= 1.3;
    w[CAT.CIVIC] *= 1.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MOOD MULTIPLIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (weatherMood.perfectWeather) {
    w[CAT.COMMUNITY] *= 1.3;
    w[CAT.SPORTS] *= 1.2;
    w[CAT.RESTAURANT] *= 1.1;
  }

  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.3) {
    w[CAT.WEATHER] *= 1.4;
    w[CAT.ACCIDENT] *= 1.3;
    w[CAT.INFRASTRUCTURE] *= 1.3;
  }

  if (weatherMood.conflictPotential && weatherMood.conflictPotential > 0.3) {
    w[CAT.CRIME] *= 1.2;
    w[CAT.PROTEST] *= 1.2;
  }

  if (weatherMood.primaryMood === 'cozy') {
    w[CAT.RESTAURANT] *= 1.1;
    w[CAT.MEETING] *= 1.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZATION + MINIMUM FLOORS
  // ═══════════════════════════════════════════════════════════════════════════

  for (var i = 0; i < 17; i++) {
    if (w[i] > 3.0) w[i] = 3.0;
    if (w[i] < 0.2) w[i] = 0.2;
  }

  // Minimum floors for critical categories (never too quiet)
  if (w[CAT.MEDICAL] < 0.5) w[CAT.MEDICAL] = 0.5;
  if (w[CAT.UTILITY] < 0.5) w[CAT.UTILITY] = 0.5;
  if (w[CAT.ACCIDENT] < 0.4) w[CAT.ACCIDENT] = 0.4;

  S.chaosCategoryWeights = w;
  S.chaosCategoryMap = CAT;  // Export mapping for reference
  ctx.summary = S;
}


/**
 * ============================================================================
 * CATEGORY REFERENCE
 * ============================================================================
 * 
 * Index | Category       | Affected By
 * ─────────────────────────────────────────────────────────────────────────
 * 0     | RESTAURANT     | Season, holidays, econ mood, weather
 * 1     | BUSINESS       | Holidays, econ mood, retail events
 * 2     | MEDICAL        | Season (winter/spring)
 * 3     | WEATHER        | Season, low comfort, equinoxes
 * 4     | CELEBRITY      | Season, holidays, sports, First Friday
 * 5     | SCHOOL         | Season (fall), BackToSchool
 * 6     | SPORTS         | Sports season, Opening Day
 * 7     | CIVIC          | Season, civic holidays, protests
 * 8     | PROTEST        | Season, civic holidays, econ mood
 * 9     | CRIME          | Econ mood, weather conflict
 * 10    | ACCIDENT       | Holidays, weather, sports celebrations
 * 11    | MEETING        | Holidays, civic events
 * 12    | UTILITY        | (baseline)
 * 13    | NEAR_MISS      | Season, holidays, sports, festivals
 * 14    | MICRO_CRIME    | Season, holidays, First Friday, econ
 * 15    | INFRASTRUCTURE | Season, weather, BackToSchool
 * 16    | COMMUNITY      | Season, holidays, First Friday, weather
 * 
 * ============================================================================
 */