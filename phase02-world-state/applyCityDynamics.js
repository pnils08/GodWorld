/**
 * ============================================================================
 * applyCityDynamics_ v2.3
 * ============================================================================
 *
 * Calculates city-wide dynamics based on season, holiday, weather, and sports.
 * Aligned with GodWorld Calendar v1.0 and getSimHoliday_ v2.3.
 *
 * v2.3 Enhancements:
 * - Momentum / inertia smoothing (prevents teleporting dynamics)
 * - Shock-aware momentum reduction (lets real disruptions break inertia)
 * - Stores previousCityDynamics in ctx.summary (NO sheet/schema changes)
 * - Optional reset hook via S.resetDynamicsMomentum flag
 *
 * Outputs:
 * - traffic, retail, tourism, nightlife, publicSpaces, sentiment
 * - culturalActivity, communityEngagement
 *
 * ============================================================================
 */

function applyCityDynamics_(ctx) {

  const S = ctx.summary || (ctx.summary = {});
  const season = S.season;
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const weather = S.weather || { type: "clear", impact: 1 };
  const ss = S.sportsSeason || "off-season";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const cycleOfYear = S.cycleOfYear || 1;

  // ───────────────────────────────────────────────────────────────────────────
  // BASELINE
  // ───────────────────────────────────────────────────────────────────────────
  let traffic = 1;
  let retail = 1;
  let tourism = 1;
  let nightlife = 1;
  let publicSpaces = 1;
  let sentiment = 0;
  let culturalActivity = 1;
  let communityEngagement = 1;

  // ───────────────────────────────────────────────────────────────────────────
  // SEASON BASE MODIFIERS
  // ───────────────────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER MODIFIERS
  // ───────────────────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY (Oakland monthly art walk)
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    nightlife *= 1.4;
    culturalActivity *= 1.5;
    communityEngagement *= 1.3;
    publicSpaces *= 1.2;
    retail *= 1.2;
    traffic *= 1.2;
    sentiment += 0.2;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY (GodWorld Special - Cycle 48)
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay || holiday === "CreationDay") {
    communityEngagement *= 1.3;
    culturalActivity *= 1.2;
    sentiment += 0.2;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY PRIORITY BASELINE
  // ───────────────────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────────────────
  // MAJOR HOLIDAY MODIFIERS
  // ───────────────────────────────────────────────────────────────────────────
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
    traffic *= 1.3;
    retail *= 1.3;
    communityEngagement *= 1.3;
    nightlife *= 0.7;
    sentiment += 0.3;
  }

  if (holiday === "Holiday") {
    retail *= 1.5;
    nightlife *= 1.3;
    publicSpaces *= 1.3;
    communityEngagement *= 1.3;
    traffic *= 1.2;
    sentiment += 0.4;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL HOLIDAY MODIFIERS
  // ───────────────────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────────────────
  // OAKLAND-SPECIFIC HOLIDAY MODIFIERS
  // ───────────────────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────────────────
  // MINOR HOLIDAY MODIFIERS
  // ───────────────────────────────────────────────────────────────────────────
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
    retail *= 1.2;
    traffic *= 0.9;
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

  if (holiday === "PatriotDay") {
    communityEngagement *= 1.1;
    nightlife *= 0.8;
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

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS MODIFIERS
  // ───────────────────────────────────────────────────────────────────────────
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

  // ss === "off-season" => baseline

  // ───────────────────────────────────────────────────────────────────────────
  // NORMALIZATION HELPERS
  // ───────────────────────────────────────────────────────────────────────────
  const round2 = n => Math.round(n * 100) / 100;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const clampMult = n => clamp(n, 0.3, 3.0);

  // ───────────────────────────────────────────────────────────────────────────
  // MOMENTUM (v2.3): INERTIA + SHOCK-AWARE BLENDING
  // ───────────────────────────────────────────────────────────────────────────

  // Optional reset hook (no sheets; just a flag you can set in summary/config)
  if (S.resetDynamicsMomentum) {
    S.previousCityDynamics = null;
    S.resetDynamicsMomentum = false;
  }

  function blend(prev, cur, m) {
    if (prev === null || prev === undefined || isNaN(prev)) return cur;
    return (prev * m) + (cur * (1 - m));
  }

  function getMomentumFactor(metric, S) {
    // Default inertia
    let m = 0.65;

    const shockFlag = (S.shockFlag || "none").toString();
    const inShock = (shockFlag === "shock-flag" || shockFlag === "shock-fading" || shockFlag === "shock-chronic");

    // Metric-specific inertia
    if (metric === "sentiment") m = 0.50; // moves faster
    else if (metric === "nightlife") m = 0.60;
    else if (metric === "publicSpaces") m = 0.65;
    else if (metric === "traffic") m = 0.70;
    else if (metric === "retail") m = 0.72;
    else if (metric === "tourism") m = 0.75; // slower to swing
    else if (metric === "culturalActivity") m = 0.70;
    else if (metric === "communityEngagement") m = 0.73;

    // Shocks reduce inertia so disruptions can break through
    if (inShock) m = Math.max(0.40, m - 0.15);

    return m;
  }

  // Clamp RAW first
  let raw = {
    traffic: clampMult(traffic),
    retail: clampMult(retail),
    tourism: clampMult(tourism),
    nightlife: clampMult(nightlife),
    publicSpaces: clampMult(publicSpaces),
    sentiment: clamp(sentiment, -1, 1),
    culturalActivity: clampMult(culturalActivity),
    communityEngagement: clampMult(communityEngagement)
  };

  // Pull previous (stored only in summary)
  const prev = S.previousCityDynamics || null;

  // Blend
  let final = {};
  for (const k in raw) {
    const m = getMomentumFactor(k, S);
    final[k] = blend(prev ? prev[k] : null, raw[k], m);
  }

  // Re-clamp after blending
  final.traffic = clampMult(final.traffic);
  final.retail = clampMult(final.retail);
  final.tourism = clampMult(final.tourism);
  final.nightlife = clampMult(final.nightlife);
  final.publicSpaces = clampMult(final.publicSpaces);
  final.sentiment = clamp(final.sentiment, -1, 1);
  final.culturalActivity = clampMult(final.culturalActivity);
  final.communityEngagement = clampMult(final.communityEngagement);

  // Output (rounded)
  S.cityDynamics = {
    traffic: round2(final.traffic),
    retail: round2(final.retail),
    tourism: round2(final.tourism),
    nightlife: round2(final.nightlife),
    publicSpaces: round2(final.publicSpaces),
    sentiment: round2(final.sentiment),
    culturalActivity: round2(final.culturalActivity),
    communityEngagement: round2(final.communityEngagement)
  };

  // Persist momentum state for next cycle (NO schema changes)
  // ES5-safe copy (no spread operator)
  S.previousCityDynamics = JSON.parse(JSON.stringify(S.cityDynamics));

  // Legacy alias if other scripts read ctx.summary.cityDynamics directly
  ctx.summary.cityDynamics = S.cityDynamics;
  ctx.summary = S;
}


/**
 * ============================================================================
 * CITY DYNAMICS REFERENCE v2.3
 * ============================================================================
 *
 * Adds Momentum:
 * - Blends current "raw" dynamics with previous cycle
 * - Prevents teleporting (sudden 1-cycle spikes/drops)
 * - Shock-aware: reduces inertia so shocks can break through
 * - Stored in ctx.summary.previousCityDynamics only (no sheet columns)
 *
 * Metrics:
 * traffic, retail, tourism, nightlife, publicSpaces, sentiment,
 * culturalActivity, communityEngagement
 *
 * ============================================================================
 */
