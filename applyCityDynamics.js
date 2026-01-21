/**
 * ============================================================================
 * applyCityDynamics_ v2.2
 * ============================================================================
 * 
 * Calculates city-wide dynamics based on season, holiday, weather, and sports.
 * Aligned with GodWorld Calendar v1.0 and getSimHoliday_ v2.3.
 * 
 * Enhancements:
 * - All 30+ holidays from cycle-based calendar
 * - First Friday modifiers
 * - Creation Day handling
 * - Oakland-specific and cultural holiday effects
 * - Championship sports state
 * - Holiday priority baseline modifiers
 * 
 * Outputs:
 * - traffic, retail, tourism, nightlife, publicSpaces, sentiment
 * - culturalActivity, communityEngagement (new)
 * 
 * ============================================================================
 */

function applyCityDynamics_(ctx) {

  const S = ctx.summary;
  const season = S.season;
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const weather = S.weather || { type: "clear", impact: 1 };
  const ss = S.sportsSeason;
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const cycleOfYear = S.cycleOfYear || 1;

  let traffic = 1;
  let retail = 1;
  let tourism = 1;
  let nightlife = 1;
  let publicSpaces = 1;
  let sentiment = 0;
  let culturalActivity = 1;
  let communityEngagement = 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASON BASE MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (season === "Winter") {
    traffic *= 0.8;
    tourism *= 0.6;
    nightlife *= 0.7;
    publicSpaces *= 0.7;
    sentiment -= 0.2;
    culturalActivity *= 0.9;
    communityEngagement *= 0.8;
  }

  if (season === "Spring") {
    traffic *= 1.1;
    retail *= 1.2;
    tourism *= 1.2;
    nightlife *= 1.1;
    publicSpaces *= 1.1;
    sentiment += 0.2;
    culturalActivity *= 1.2;
    communityEngagement *= 1.1;
  }

  if (season === "Summer") {
    traffic *= 1.4;
    retail *= 1.3;
    tourism *= 1.6;
    nightlife *= 1.4;
    publicSpaces *= 1.4;
    sentiment += 0.3;
    culturalActivity *= 1.3;
    communityEngagement *= 1.2;
  }

  if (season === "Fall") {
    retail *= 1.1;
    tourism *= 0.9;
    publicSpaces *= 0.9;
    sentiment -= 0.1;
    culturalActivity *= 1.1;
    communityEngagement *= 1.0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (weather.type === "rain" || weather.type === "fog") {
    traffic *= 0.9;
    publicSpaces *= 0.7;
    nightlife *= 0.9;
    sentiment -= 0.1;
  }

  if (weather.type === "hot") {
    publicSpaces *= 1.2;
    tourism *= 1.1;
    nightlife *= 1.1;
  }

  if (weather.type === "cold" || weather.type === "snow") {
    publicSpaces *= 0.6;
    traffic *= 0.8;
    communityEngagement *= 0.9;
  }

  if (weather.type === "clear" || weather.type === "mild" || weather.type === "breeze") {
    publicSpaces *= 1.1;
    sentiment += 0.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY (Oakland monthly art walk)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isFirstFriday) {
    nightlife *= 1.4;
    culturalActivity *= 1.5;
    communityEngagement *= 1.3;
    publicSpaces *= 1.2;
    retail *= 1.2;
    traffic *= 1.2;
    sentiment += 0.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY (GodWorld Special - Cycle 48)
  // ═══════════════════════════════════════════════════════════════════════════

  if (isCreationDay || holiday === "CreationDay") {
    communityEngagement *= 1.3;
    culturalActivity *= 1.2;
    sentiment += 0.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY PRIORITY BASELINE
  // ═══════════════════════════════════════════════════════════════════════════

  if (holidayPriority === "major") {
    publicSpaces *= 1.1;
    sentiment += 0.1;
  } else if (holidayPriority === "cultural") {
    culturalActivity *= 1.2;
    communityEngagement *= 1.1;
  } else if (holidayPriority === "oakland") {
    communityEngagement *= 1.2;
    culturalActivity *= 1.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAJOR HOLIDAY MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "NewYear") {
    nightlife *= 1.4;
    publicSpaces *= 1.3;
    retail *= 1.1;
    sentiment += 0.4;
  }

  if (holiday === "NewYearsEve") {
    nightlife *= 1.8;
    publicSpaces *= 1.5;
    traffic *= 1.3;
    sentiment += 0.5;
  }

  if (holiday === "MLKDay") {
    communityEngagement *= 1.4;
    culturalActivity *= 1.3;
    publicSpaces *= 1.2;
    sentiment += 0.2;
  }

  if (holiday === "Easter") {
    communityEngagement *= 1.3;
    retail *= 1.2;
    sentiment += 0.2;
  }

  if (holiday === "MemorialDay") {
    publicSpaces *= 1.3;
    traffic *= 1.2;
    tourism *= 1.2;
    communityEngagement *= 1.2;
    sentiment += 0.2;
  }

  if (holiday === "Juneteenth") {
    communityEngagement *= 1.5;
    culturalActivity *= 1.5;
    publicSpaces *= 1.4;
    nightlife *= 1.3;
    sentiment += 0.4;
  }

  if (holiday === "Independence") {
    tourism *= 1.4;
    publicSpaces *= 1.5;
    nightlife *= 1.4;
    traffic *= 1.3;
    sentiment += 0.4;
  }

  if (holiday === "LaborDay") {
    publicSpaces *= 1.3;
    traffic *= 1.2;
    communityEngagement *= 1.2;
    sentiment += 0.2;
  }

  if (holiday === "Halloween") {
    nightlife *= 1.4;
    publicSpaces *= 1.3;
    communityEngagement *= 1.4;
    culturalActivity *= 1.3;
    retail *= 1.2;
    sentiment += 0.3;
  }

  if (holiday === "Thanksgiving") {
    traffic *= 1.3;  // Travel
    retail *= 1.3;
    communityEngagement *= 1.3;
    nightlife *= 0.7;  // Family time
    sentiment += 0.3;
  }

  if (holiday === "Holiday") {  // Christmas
    retail *= 1.5;
    nightlife *= 1.3;
    publicSpaces *= 1.3;
    communityEngagement *= 1.3;
    traffic *= 1.2;
    sentiment += 0.4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL HOLIDAY MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "BlackHistoryMonth") {
    culturalActivity *= 1.4;
    communityEngagement *= 1.3;
    sentiment += 0.1;
  }

  if (holiday === "CincoDeMayo") {
    nightlife *= 1.5;
    culturalActivity *= 1.5;
    communityEngagement *= 1.4;
    publicSpaces *= 1.3;
    retail *= 1.2;
    sentiment += 0.3;
  }

  if (holiday === "PrideMonth") {
    culturalActivity *= 1.4;
    communityEngagement *= 1.3;
    nightlife *= 1.2;
    sentiment += 0.2;
  }

  if (holiday === "IndigenousPeoplesDay") {
    culturalActivity *= 1.3;
    communityEngagement *= 1.2;
    sentiment += 0.1;
  }

  if (holiday === "DiaDeMuertos") {
    culturalActivity *= 1.6;
    communityEngagement *= 1.5;
    publicSpaces *= 1.3;
    sentiment += 0.2;
  }

  if (holiday === "Hanukkah") {
    culturalActivity *= 1.2;
    communityEngagement *= 1.2;
    retail *= 1.1;
    sentiment += 0.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND-SPECIFIC HOLIDAY MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "OpeningDay") {
    traffic *= 1.4;
    nightlife *= 1.4;
    publicSpaces *= 1.3;
    communityEngagement *= 1.4;
    sentiment += 0.4;
  }

  if (holiday === "OaklandPride") {
    nightlife *= 1.6;
    publicSpaces *= 1.5;
    culturalActivity *= 1.6;
    communityEngagement *= 1.5;
    tourism *= 1.3;
    sentiment += 0.5;
  }

  if (holiday === "EarthDay") {
    publicSpaces *= 1.3;
    communityEngagement *= 1.3;
    culturalActivity *= 1.2;
    sentiment += 0.2;
  }

  if (holiday === "ArtSoulFestival") {
    nightlife *= 1.5;
    publicSpaces *= 1.6;
    culturalActivity *= 1.7;
    communityEngagement *= 1.5;
    traffic *= 1.3;
    tourism *= 1.3;
    sentiment += 0.4;
  }

  if (holiday === "SummerFestival") {
    nightlife *= 1.3;
    publicSpaces *= 1.4;
    communityEngagement *= 1.3;
    sentiment += 0.3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MINOR HOLIDAY MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === "Valentine") {
    nightlife *= 1.3;
    retail *= 1.3;
    sentiment += 0.2;
  }

  if (holiday === "StPatricksDay") {
    nightlife *= 1.5;
    traffic *= 1.1;
    sentiment += 0.2;
  }

  if (holiday === "PresidentsDay") {
    retail *= 1.2;  // Sales
    traffic *= 0.9;  // Some off work
  }

  if (holiday === "MothersDay" || holiday === "FathersDay") {
    retail *= 1.3;
    communityEngagement *= 1.1;
    sentiment += 0.1;
  }

  if (holiday === "VeteransDay") {
    communityEngagement *= 1.1;
    sentiment += 0.1;
  }

  if (holiday === "PatriotDay") {  // 9/11
    communityEngagement *= 1.1;
    nightlife *= 0.8;  // Somber
    sentiment -= 0.1;
  }

  if (holiday === "BackToSchool") {
    traffic *= 1.2;
    retail *= 1.4;
  }

  // Seasonal markers
  if (holiday === "SpringEquinox" || holiday === "SummerSolstice") {
    publicSpaces *= 1.1;
    sentiment += 0.1;
  }

  if (holiday === "FallEquinox" || holiday === "WinterSolstice") {
    sentiment -= 0.05;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (ss === "spring-training") {
    sentiment += 0.1;
  }

  if (ss === "early-season" || ss === "regular-season") {
    sentiment += 0.1;
    nightlife *= 1.05;
  }

  if (ss === "mid-season") {
    traffic *= 1.2;
    nightlife *= 1.1;
    sentiment += 0.2;
  }

  if (ss === "late-season") {
    traffic *= 1.3;
    nightlife *= 1.2;
    sentiment += 0.25;
  }

  if (ss === "playoffs" || ss === "post-season") {
    traffic *= 1.4;
    nightlife *= 1.3;
    communityEngagement *= 1.2;
    sentiment += 0.3;
  }

  if (ss === "championship") {
    traffic *= 1.5;
    nightlife *= 1.5;
    publicSpaces *= 1.3;
    communityEngagement *= 1.4;
    sentiment += 0.5;
  }

  if (ss === "off-season") {
    // Baseline, no modifier
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZATION & ROUNDING
  // ═══════════════════════════════════════════════════════════════════════════

  const round2 = n => Math.round(n * 100) / 100;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // Clamp sentiment to reasonable range
  sentiment = clamp(sentiment, -1, 1);

  // Clamp multipliers to prevent extreme values
  const clampMult = n => clamp(n, 0.3, 3.0);

  ctx.summary.cityDynamics = {
    traffic: round2(clampMult(traffic)),
    retail: round2(clampMult(retail)),
    tourism: round2(clampMult(tourism)),
    nightlife: round2(clampMult(nightlife)),
    publicSpaces: round2(clampMult(publicSpaces)),
    sentiment: round2(sentiment),
    culturalActivity: round2(clampMult(culturalActivity)),
    communityEngagement: round2(clampMult(communityEngagement))
  };

  // Also store in legacy location if needed
  S.cityDynamics = ctx.summary.cityDynamics;
}


/**
 * ============================================================================
 * CITY DYNAMICS REFERENCE
 * ============================================================================
 * 
 * Metric              | Base | Peak Modifiers
 * ─────────────────────────────────────────────────────────────────────────
 * traffic             | 1    | Summer, playoffs, holidays, First Friday
 * retail              | 1    | Summer, Christmas, BackToSchool, Valentine
 * tourism             | 1    | Summer, Independence, OaklandPride
 * nightlife           | 1    | Summer, NewYearsEve, First Friday, playoffs
 * publicSpaces        | 1    | Summer, Independence, ArtSoulFestival
 * sentiment           | 0    | Summer, NewYearsEve, championship (+0.5 peak)
 * culturalActivity    | 1    | DiaDeMuertos, ArtSoulFestival, First Friday
 * communityEngagement | 1    | Juneteenth, OaklandPride, DiaDeMuertos
 * 
 * ============================================================================
 */