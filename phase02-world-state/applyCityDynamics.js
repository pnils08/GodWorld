/**
 * ============================================================================
 * applyCityDynamics_ v2.3
 * ============================================================================
 * Updates:
 * - Null-guard for ctx.summary
 * - Weather impact scaling (not just type)
 * - Sports canon gating:
 *   * Big playoff/championship boosts ONLY when S.sportsSource === 'config-override'
 *   * Otherwise apply simple "in-season/off-season" vibe based on simMonth
 * ============================================================================
 */

function applyCityDynamics_(ctx) {

  if (!ctx.summary) ctx.summary = {};
  const S = ctx.summary;

  const season = S.season || "Spring";
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const weather = S.weather || { type: "clear", impact: 1 };
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;

  // Sports canon handling
  const sportsSeason = (S.sportsSeason || "off-season").toString();
  const sportsSource = (S.sportsSource || "").toString(); // 'config-override' or 'simmonth-calculated'
  const sportsIsOverride = (sportsSource === "config-override");
  const simMonth = S.simMonth || 1;

  function getSportsPhaseSimple() {
    // Canon-safe vibe: no playoffs/championship intensity unless override
    if (simMonth === 3) return "spring-training";
    if (simMonth >= 4 && simMonth <= 10) return "in-season";
    return "off-season";
  }

  const sportsPhase = sportsIsOverride ? sportsSeason : getSportsPhaseSimple();

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
    traffic *= 0.8; tourism *= 0.6; nightlife *= 0.7; publicSpaces *= 0.7;
    sentiment -= 0.2; culturalActivity *= 0.9; communityEngagement *= 0.8;
  }
  if (season === "Spring") {
    traffic *= 1.1; retail *= 1.2; tourism *= 1.2; nightlife *= 1.1; publicSpaces *= 1.1;
    sentiment += 0.2; culturalActivity *= 1.2; communityEngagement *= 1.1;
  }
  if (season === "Summer") {
    traffic *= 1.4; retail *= 1.3; tourism *= 1.6; nightlife *= 1.4; publicSpaces *= 1.4;
    sentiment += 0.3; culturalActivity *= 1.3; communityEngagement *= 1.2;
  }
  if (season === "Fall") {
    retail *= 1.1; tourism *= 0.9; publicSpaces *= 0.9;
    sentiment -= 0.1; culturalActivity *= 1.1; communityEngagement *= 1.0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MODIFIERS (type + impact)
  // ═══════════════════════════════════════════════════════════════════════════
  const wxImpact = Number(weather.impact || 1);

  if (weather.type === "rain" || weather.type === "fog") {
    traffic *= 0.9; publicSpaces *= 0.7; nightlife *= 0.9; sentiment -= 0.1;
  }
  if (weather.type === "hot") {
    publicSpaces *= 1.2; tourism *= 1.1; nightlife *= 1.1;
  }
  if (weather.type === "cold" || weather.type === "snow") {
    publicSpaces *= 0.6; traffic *= 0.8; communityEngagement *= 0.9;
  }
  if (weather.type === "clear" || weather.type === "mild" || weather.type === "breeze") {
    publicSpaces *= 1.1; sentiment += 0.1;
  }

  // Impact scaling: big disruptions dampen public movement; mild boosts slightly help
  if (wxImpact >= 1.3) {
    traffic *= 0.92;
    publicSpaces *= 0.88;
    tourism *= 0.93;
    nightlife *= 0.95;
    sentiment -= 0.05;
  } else if (wxImpact <= 0.9) {
    publicSpaces *= 1.05;
    tourism *= 1.03;
    sentiment += 0.03;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY
  // ═══════════════════════════════════════════════════════════════════════════
  if (isFirstFriday) {
    nightlife *= 1.4; culturalActivity *= 1.5; communityEngagement *= 1.3;
    publicSpaces *= 1.2; retail *= 1.2; traffic *= 1.2; sentiment += 0.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY
  // ═══════════════════════════════════════════════════════════════════════════
  if (isCreationDay || holiday === "CreationDay") {
    communityEngagement *= 1.3; culturalActivity *= 1.2; sentiment += 0.2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY PRIORITY BASELINE
  // ═══════════════════════════════════════════════════════════════════════════
  if (holidayPriority === "major") {
    publicSpaces *= 1.1; sentiment += 0.1;
  } else if (holidayPriority === "cultural") {
    culturalActivity *= 1.2; communityEngagement *= 1.1;
  } else if (holidayPriority === "oakland") {
    communityEngagement *= 1.2; culturalActivity *= 1.1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY MODIFIERS (unchanged from your v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  if (holiday === "NewYear") { nightlife *= 1.4; publicSpaces *= 1.3; retail *= 1.1; sentiment += 0.4; }
  if (holiday === "NewYearsEve") { nightlife *= 1.8; publicSpaces *= 1.5; traffic *= 1.3; sentiment += 0.5; }
  if (holiday === "MLKDay") { communityEngagement *= 1.4; culturalActivity *= 1.3; publicSpaces *= 1.2; sentiment += 0.2; }
  if (holiday === "Easter") { communityEngagement *= 1.3; retail *= 1.2; sentiment += 0.2; }
  if (holiday === "MemorialDay") { publicSpaces *= 1.3; traffic *= 1.2; tourism *= 1.2; communityEngagement *= 1.2; sentiment += 0.2; }
  if (holiday === "Juneteenth") { communityEngagement *= 1.5; culturalActivity *= 1.5; publicSpaces *= 1.4; nightlife *= 1.3; sentiment += 0.4; }
  if (holiday === "Independence") { tourism *= 1.4; publicSpaces *= 1.5; nightlife *= 1.4; traffic *= 1.3; sentiment += 0.4; }
  if (holiday === "LaborDay") { publicSpaces *= 1.3; traffic *= 1.2; communityEngagement *= 1.2; sentiment += 0.2; }
  if (holiday === "Halloween") { nightlife *= 1.4; publicSpaces *= 1.3; communityEngagement *= 1.4; culturalActivity *= 1.3; retail *= 1.2; sentiment += 0.3; }
  if (holiday === "Thanksgiving") { traffic *= 1.3; retail *= 1.3; communityEngagement *= 1.3; nightlife *= 0.7; sentiment += 0.3; }
  if (holiday === "Holiday") { retail *= 1.5; nightlife *= 1.3; publicSpaces *= 1.3; communityEngagement *= 1.3; traffic *= 1.2; sentiment += 0.4; }

  if (holiday === "BlackHistoryMonth") { culturalActivity *= 1.4; communityEngagement *= 1.3; sentiment += 0.1; }
  if (holiday === "CincoDeMayo") { nightlife *= 1.5; culturalActivity *= 1.5; communityEngagement *= 1.4; publicSpaces *= 1.3; retail *= 1.2; sentiment += 0.3; }
  if (holiday === "PrideMonth") { culturalActivity *= 1.4; communityEngagement *= 1.3; nightlife *= 1.2; sentiment += 0.2; }
  if (holiday === "IndigenousPeoplesDay") { culturalActivity *= 1.3; communityEngagement *= 1.2; sentiment += 0.1; }
  if (holiday === "DiaDeMuertos") { culturalActivity *= 1.6; communityEngagement *= 1.5; publicSpaces *= 1.3; sentiment += 0.2; }
  if (holiday === "Hanukkah") { culturalActivity *= 1.2; communityEngagement *= 1.2; retail *= 1.1; sentiment += 0.1; }

  if (holiday === "OpeningDay") { traffic *= 1.4; nightlife *= 1.4; publicSpaces *= 1.3; communityEngagement *= 1.4; sentiment += 0.4; }
  if (holiday === "OaklandPride") { nightlife *= 1.6; publicSpaces *= 1.5; culturalActivity *= 1.6; communityEngagement *= 1.5; tourism *= 1.3; sentiment += 0.5; }
  if (holiday === "EarthDay") { publicSpaces *= 1.3; communityEngagement *= 1.3; culturalActivity *= 1.2; sentiment += 0.2; }
  if (holiday === "ArtSoulFestival") { nightlife *= 1.5; publicSpaces *= 1.6; culturalActivity *= 1.7; communityEngagement *= 1.5; traffic *= 1.3; tourism *= 1.3; sentiment += 0.4; }
  if (holiday === "SummerFestival") { nightlife *= 1.3; publicSpaces *= 1.4; communityEngagement *= 1.3; sentiment += 0.3; }

  if (holiday === "Valentine") { nightlife *= 1.3; retail *= 1.3; sentiment += 0.2; }
  if (holiday === "StPatricksDay") { nightlife *= 1.5; traffic *= 1.1; sentiment += 0.2; }
  if (holiday === "PresidentsDay") { retail *= 1.2; traffic *= 0.9; }
  if (holiday === "MothersDay" || holiday === "FathersDay") { retail *= 1.3; communityEngagement *= 1.1; sentiment += 0.1; }
  if (holiday === "VeteransDay") { communityEngagement *= 1.1; sentiment += 0.1; }
  if (holiday === "PatriotDay") { communityEngagement *= 1.1; nightlife *= 0.8; sentiment -= 0.1; }
  if (holiday === "BackToSchool") { traffic *= 1.2; retail *= 1.4; }

  if (holiday === "SpringEquinox" || holiday === "SummerSolstice") { publicSpaces *= 1.1; sentiment += 0.1; }
  if (holiday === "FallEquinox" || holiday === "WinterSolstice") { sentiment -= 0.05; }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS MODIFIERS (canon-safe)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!sportsIsOverride) {
    // ONLY vibe-level modifiers
    if (sportsPhase === "spring-training") sentiment += 0.05;
    if (sportsPhase === "in-season") {
      traffic *= 1.07;
      nightlife *= 1.05;
      publicSpaces *= 1.05;
      sentiment += 0.08;
    }
    if (sportsPhase === "off-season") {
      nightlife *= 0.98;
      sentiment -= 0.02;
    }
  } else {
    // Maker override: allow your full intensity states
    if (sportsSeason === "spring-training") sentiment += 0.1;

    if (sportsSeason === "early-season" || sportsSeason === "regular-season") {
      sentiment += 0.1;
      nightlife *= 1.05;
    }
    if (sportsSeason === "mid-season") {
      traffic *= 1.2;
      nightlife *= 1.1;
      sentiment += 0.2;
    }
    if (sportsSeason === "late-season") {
      traffic *= 1.3;
      nightlife *= 1.2;
      sentiment += 0.25;
    }
    if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
      traffic *= 1.4;
      nightlife *= 1.3;
      communityEngagement *= 1.2;
      sentiment += 0.3;
    }
    if (sportsSeason === "championship") {
      traffic *= 1.5;
      nightlife *= 1.5;
      publicSpaces *= 1.3;
      communityEngagement *= 1.4;
      sentiment += 0.5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZATION & ROUNDING
  // ═══════════════════════════════════════════════════════════════════════════
  const round2 = n => Math.round(n * 100) / 100;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const clampMult = n => clamp(n, 0.3, 3.0);

  sentiment = clamp(sentiment, -1, 1);

  S.cityDynamics = {
    traffic: round2(clampMult(traffic)),
    retail: round2(clampMult(retail)),
    tourism: round2(clampMult(tourism)),
    nightlife: round2(clampMult(nightlife)),
    publicSpaces: round2(clampMult(publicSpaces)),
    sentiment: round2(sentiment),
    culturalActivity: round2(clampMult(culturalActivity)),
    communityEngagement: round2(clampMult(communityEngagement))
  };

  ctx.summary = S;
}
