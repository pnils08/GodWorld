/**
 * ============================================================================
 * buildCityEveningSystems_ v2.2
 * ============================================================================
 *
 * World-aware evening systems with GodWorld Calendar integration.
 *
 * v2.2 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific traffic patterns
 * - Holiday-specific nightlife volume modifiers
 * - Holiday-specific crowd distribution
 * - First Friday arts district surge
 * - Creation Day community gathering
 * - Sports season effects
 * - Calendar context in output
 * - Aligned with GodWorld Calendar v1.0
 *
 * Calculates:
 * - nightShiftLoad
 * - eveningTraffic
 * - nightlifeVolume
 * - eveningSafety
 * - weatherImpact
 * - crowdMap (Oakland neighborhoods)
 *
 * Previous features (v2.1):
 * - season, weather, chaos, sentiment
 * - economic mood, civicLoad
 * - pattern/shock, events, nightlife
 * - sports, publicSpaces, migration
 * 
 * ============================================================================
 */

function buildCityEveningSystems_(ctx) {

  const S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const season = S.season;
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || {};
  const sentiment = dynamics.sentiment || 0;
  const publicSpace = dynamics.publicSpaces || 1;
  const traffic = dynamics.traffic || 1;
  const culturalActivity = dynamics.culturalActivity || 1;
  const communityEngagement = dynamics.communityEngagement || 1;
  const econMood = S.economicMood || 50;

  const nightlife = S.nightlife || {};
  const sports = S.eveningSports || "";
  const cityEvents = S.cityEvents || [];
  const cityEventDetails = S.cityEventDetails || [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  // Oakland neighborhoods (v2.2: expanded to 12)
  const neighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // NIGHT SHIFT LOAD (realistic)
  // ═══════════════════════════════════════════════════════════════════════════
  let nightShiftLoad = 0;
  const wp = ctx.ss.getSheetByName('World_Population');

  if (wp) {
    const row = wp.getRange(2, 1, 1, wp.getLastColumn()).getValues()[0];
    const header = wp.getRange(1, 1, 1, wp.getLastColumn()).getValues()[0];
    const idx = n => header.indexOf(n);

    const totalPop = Number(row[idx("totalPopulation")] || 0);
    const empRate = Number(row[idx("employmentRate")] || 0);

    const activeWorkers = Math.round(totalPop * empRate);

    // Seasonal/infrastructure adjustment
    let nightRate = 0.12;

    if (season === "Winter") nightRate += 0.01;
    if (weather.impact >= 1.3) nightRate -= 0.02;
    if (econMood <= 35) nightRate -= 0.01;
    if (econMood >= 65) nightRate += 0.01;

    // v2.2: Holiday adjustments
    if (holiday === "Thanksgiving" || holiday === "Holiday") nightRate -= 0.03;
    if (holiday === "NewYearsEve") nightRate += 0.02;
    if (holiday === "LaborDay") nightRate -= 0.02;

    nightShiftLoad = Math.max(0, Math.round(activeWorkers * nightRate));
  }

  S.nightShiftLoad = nightShiftLoad;

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENING TRAFFIC (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  let trafficScore = 0;

  // Events boost traffic
  trafficScore += cityEvents.length * 2;

  // Sports boost traffic
  if (sports && sports !== "(none)") trafficScore += 3;

  // Nightlife spots
  const barCount = nightlife.spots ? nightlife.spots.length : 0;
  trafficScore += barCount;

  // Public spaces load
  if (publicSpace >= 1.3) trafficScore += 2;

  // Chaos adds random congestion
  if (chaos.length >= 3) trafficScore += 2;

  // Weather dampens traffic
  if (weather.impact >= 1.3) trafficScore -= 2;
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.3) trafficScore -= 1;

  // Economic effects
  if (econMood >= 65) trafficScore += 1;
  if (econMood <= 35) trafficScore -= 1;

  // Sentiment effects
  if (sentiment >= 0.3) trafficScore += 1;
  if (sentiment <= -0.3) trafficScore -= 1;

  // ───────────────────────────────────────────────────────────────────────────
  // CALENDAR TRAFFIC MODIFIERS (v2.2)
  // ───────────────────────────────────────────────────────────────────────────

  // Major party holidays = heavy traffic
  if (holiday === "NewYearsEve") trafficScore += 5;
  if (holiday === "OaklandPride") trafficScore += 4;
  if (holiday === "ArtSoulFestival") trafficScore += 4;
  if (holiday === "Independence") trafficScore += 3;
  if (holiday === "Halloween") trafficScore += 3;
  if (holiday === "LunarNewYear") trafficScore += 3;
  if (holiday === "CincoDeMayo") trafficScore += 3;
  if (holiday === "Juneteenth") trafficScore += 2;
  if (holiday === "OpeningDay") trafficScore += 3;

  // Quieter holidays = less traffic
  if (holiday === "Thanksgiving") trafficScore -= 2;
  if (holiday === "Holiday") trafficScore -= 2;
  if (holiday === "Easter") trafficScore -= 2;

  // First Friday arts crawl
  if (isFirstFriday) trafficScore += 3;

  // Creation Day community
  if (isCreationDay) trafficScore += 2;

  // Sports season
  if (sportsSeason === "championship") trafficScore += 4;
  if (sportsSeason === "playoffs") trafficScore += 3;

  // Convert score → label
  let eveningTraffic = "light";
  if (trafficScore >= 10) eveningTraffic = "gridlock";
  else if (trafficScore >= 8) eveningTraffic = "heavy";
  else if (trafficScore >= 4) eveningTraffic = "moderate";

  S.eveningTraffic = eveningTraffic;

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER IMPACT
  // ═══════════════════════════════════════════════════════════════════════════

  S.weatherImpact = weather.impact || 1;
  S.weatherType = weather.type || "clear";

  // ═══════════════════════════════════════════════════════════════════════════
  // NIGHTLIFE VOLUME (0–10) (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  let volume = 4; // baseline

  volume += cityEvents.length;
  if (sports && sports !== "(none)") volume += 2;
  volume += barCount;

  if (eveningTraffic === "heavy" || eveningTraffic === "gridlock") volume += 2;
  if (publicSpace >= 1.4) volume += 2;

  if (sentiment >= 0.3) volume += 1;
  if (sentiment <= -0.3) volume -= 2;

  if (econMood >= 65) volume += 1;
  if (econMood <= 35) volume -= 1;

  if (weather.impact >= 1.3) volume -= 2;
  if (weatherMood.perfectWeather) volume += 1;
  if (chaos.length >= 3) volume -= 2;

  if (season === "Summer") volume += 1;
  if (season === "Winter") volume -= 1;

  // ───────────────────────────────────────────────────────────────────────────
  // CALENDAR VOLUME MODIFIERS (v2.2)
  // ───────────────────────────────────────────────────────────────────────────

  // Major party holidays
  if (holiday === "NewYearsEve") volume += 4;
  if (holiday === "Halloween") volume += 3;
  if (holiday === "OaklandPride") volume += 3;
  if (holiday === "StPatricksDay") volume += 3;
  if (holiday === "CincoDeMayo") volume += 2;
  if (holiday === "Independence") volume += 2;

  // Quieter holidays
  if (holiday === "Thanksgiving") volume -= 2;
  if (holiday === "Holiday") volume -= 1;
  if (holiday === "Easter") volume -= 2;
  if (holiday === "MothersDay" || holiday === "FathersDay") volume -= 1;

  // First Friday arts crawl
  if (isFirstFriday) volume += 2;

  // Creation Day
  if (isCreationDay) volume += 1;

  // Sports season
  if (sportsSeason === "championship") volume += 3;
  if (sportsSeason === "playoffs") volume += 2;
  if (holiday === "OpeningDay") volume += 2;

  // Cultural activity
  if (culturalActivity >= 1.4) volume += 1;

  if (volume < 0) volume = 0;
  if (volume > 10) volume = 10;

  S.nightlifeVolume = volume;

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENING SAFETY ATMOSPHERE (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  let safety = "calm";

  if (chaos.length >= 3) safety = "tense";
  if (S.shockFlag === "shock-flag") safety = "tense";
  if (S.civicLoad === "load-strain") safety = "tense";
  if (sentiment <= -0.4) safety = "uneasy";

  if (safety === "calm" && S.civicLoad === "minor-variance") safety = "normal";
  if (safety === "calm" && econMood <= 35) safety = "cautious";

  // v2.2: Holiday safety overrides
  if (holiday === "NewYearsEve" || holiday === "Halloween") {
    if (safety === "calm" || safety === "normal") safety = "festive-crowded";
  }
  if (holiday === "OaklandPride" || holiday === "ArtSoulFestival") {
    if (safety === "calm" || safety === "normal") safety = "celebratory";
  }
  if (isFirstFriday) {
    if (safety === "calm") safety = "art-walk-energy";
  }

  S.eveningSafety = safety;

  // ═══════════════════════════════════════════════════════════════════════════
  // CROWD DISTRIBUTION MAP (v2.2 - 12 Oakland neighborhoods)
  // ═══════════════════════════════════════════════════════════════════════════

  const crowd = {
    'Temescal': 1,
    'Downtown': 2,
    'Fruitvale': 1,
    'Lake Merritt': 1,
    'West Oakland': 1,
    'Laurel': 1,
    'Rockridge': 1,
    'Jack London': 2,
    'Uptown': 1,
    'KONO': 1,
    'Chinatown': 1,
    'Piedmont Ave': 1
  };

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY CROWD DISTRIBUTION (v2.2)
  // ───────────────────────────────────────────────────────────────────────────

  if (holiday === "LunarNewYear") {
    crowd['Chinatown'] += 5;
    crowd['Downtown'] += 2;
  }
  if (holiday === "CincoDeMayo" || holiday === "DiaDeMuertos") {
    crowd['Fruitvale'] += 5;
    crowd['Downtown'] += 1;
  }
  if (holiday === "Juneteenth") {
    crowd['West Oakland'] += 4;
    crowd['Downtown'] += 2;
    crowd['Lake Merritt'] += 2;
  }
  if (holiday === "OaklandPride") {
    crowd['Downtown'] += 4;
    crowd['Lake Merritt'] += 3;
    crowd['Uptown'] += 3;
  }
  if (holiday === "ArtSoulFestival") {
    crowd['Downtown'] += 5;
    crowd['Lake Merritt'] += 2;
  }
  if (holiday === "NewYearsEve") {
    crowd['Downtown'] += 4;
    crowd['Jack London'] += 3;
    crowd['Uptown'] += 2;
  }
  if (holiday === "Halloween") {
    crowd['Temescal'] += 3;
    crowd['Rockridge'] += 2;
    crowd['Lake Merritt'] += 2;
  }
  if (holiday === "Independence") {
    crowd['Jack London'] += 3;
    crowd['Lake Merritt'] += 2;
  }
  if (holiday === "OpeningDay") {
    crowd['Jack London'] += 5;
    crowd['Downtown'] += 2;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY (v2.2) - Arts district surge
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    crowd['Uptown'] += 4;
    crowd['KONO'] += 3;
    crowd['Temescal'] += 2;
    crowd['Jack London'] += 1;
    crowd['Downtown'] += 1;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY (v2.2) - Community gathering
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    crowd['Downtown'] += 3;
    crowd['West Oakland'] += 2;
    crowd['Lake Merritt'] += 2;
    crowd['Jack London'] += 1;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (sportsSeason === "championship") {
    crowd['Jack London'] += 4;
    crowd['Downtown'] += 3;
    crowd['Lake Merritt'] += 2;
  } else if (sportsSeason === "playoffs") {
    crowd['Jack London'] += 3;
    crowd['Downtown'] += 2;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EVENT-DRIVEN DISTRIBUTION
  // ───────────────────────────────────────────────────────────────────────────
  cityEventDetails.forEach(ev => {
    const n = ev.neighborhood || '';
    if (crowd[n] !== undefined) {
      crowd[n] += 2;
    }
  });

  // Fallback for string events
  cityEvents.forEach(ev => {
    if (typeof ev === 'string') {
      neighborhoods.forEach(n => {
        if (ev.includes(n)) crowd[n] += 2;
      });
    }
  });

  // Sports → Jack London / Downtown cluster
  if (sports && sports !== "(none)") {
    crowd['Jack London'] += 2;
    crowd['Downtown'] += 1;
  }

  // Nightlife clusters
  if (nightlife.spotDetails) {
    nightlife.spotDetails.forEach(spot => {
      const n = spot.neighborhood || '';
      if (crowd[n] !== undefined) {
        crowd[n] += 1;
      }
    });
  }

  // Volume-based distribution
  if (volume >= 7) {
    crowd['Downtown'] += 2;
    crowd['Jack London'] += 1;
    crowd['Temescal'] += 1;
    crowd['Uptown'] += 1;
  }
  if (volume >= 9) {
    crowd['Lake Merritt'] += 1;
    crowd['KONO'] += 1;
  }

  // Weather pushes crowds to indoor-heavy areas
  if (weather.impact >= 1.3) {
    crowd['Lake Merritt'] -= 1;
    crowd['Jack London'] -= 1;
    crowd['Downtown'] += 2;
    crowd['Temescal'] += 1;
    crowd['Uptown'] += 1;
  }

  // Perfect weather spreads crowds outdoors
  if (weatherMood.perfectWeather) {
    crowd['Lake Merritt'] += 2;
    crowd['Jack London'] += 1;
    crowd['Piedmont Ave'] += 1;
  }

  // Chaos disperses downtown crowds
  if (chaos.length >= 3) {
    crowd['Downtown'] -= 2;
    crowd['Fruitvale'] += 1;
    crowd['Laurel'] += 1;
    crowd['Piedmont Ave'] += 1;
  }

  // Economic effects
  if (econMood >= 65) {
    crowd['Rockridge'] += 1;
    crowd['Jack London'] += 1;
    crowd['Piedmont Ave'] += 1;
  }
  if (econMood <= 35) {
    crowd['Rockridge'] -= 1;
    crowd['Fruitvale'] += 1;
    crowd['West Oakland'] += 1;
  }

  // Cultural activity
  if (culturalActivity >= 1.4) {
    crowd['Uptown'] += 1;
    crowd['KONO'] += 1;
  }

  // Community engagement
  if (communityEngagement >= 1.4) {
    crowd['West Oakland'] += 1;
    crowd['Fruitvale'] += 1;
  }

  // Prevent negatives
  Object.keys(crowd).forEach(k => {
    if (crowd[k] < 0) crowd[k] = 0;
  });

  S.crowdMap = crowd;

  // Find hotspots
  const sorted = Object.entries(crowd).sort((a, b) => b[1] - a[1]);
  S.crowdHotspots = sorted.slice(0, 3).map(e => e[0]);

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT (v2.2: Calendar context)
  // ═══════════════════════════════════════════════════════════════════════════

  S.eveningSystemsCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    trafficScore: trafficScore,
    volumeScore: volume
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * EVENING SYSTEMS REFERENCE
 * ============================================================================
 * 
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 * 
 * HOLIDAY TRAFFIC MODIFIERS (v2.2):
 * 
 * | Holiday | Modifier | Notes |
 * |---------|----------|-------|
 * | NewYearsEve | +5 | Party traffic |
 * | OaklandPride | +4 | Festival traffic |
 * | ArtSoulFestival | +4 | Festival traffic |
 * | Independence | +3 | Fireworks traffic |
 * | Halloween | +3 | Party traffic |
 * | LunarNewYear | +3 | Festival traffic |
 * | CincoDeMayo | +3 | Festival traffic |
 * | OpeningDay | +3 | Sports traffic |
 * | Juneteenth | +2 | Festival traffic |
 * | Thanksgiving | -2 | Quiet holiday |
 * | Holiday | -2 | Quiet holiday |
 * | Easter | -2 | Quiet holiday |
 * 
 * HOLIDAY CROWD DISTRIBUTION (v2.2):
 * 
 * | Holiday | Hotspots |
 * |---------|----------|
 * | LunarNewYear | Chinatown +5, Downtown +2 |
 * | CincoDeMayo/DiaDeMuertos | Fruitvale +5, Downtown +1 |
 * | Juneteenth | West Oakland +4, Downtown +2, Lake Merritt +2 |
 * | OaklandPride | Downtown +4, Lake Merritt +3, Uptown +3 |
 * | ArtSoulFestival | Downtown +5, Lake Merritt +2 |
 * | NewYearsEve | Downtown +4, Jack London +3, Uptown +2 |
 * | Halloween | Temescal +3, Rockridge +2, Lake Merritt +2 |
 * | Independence | Jack London +3, Lake Merritt +2 |
 * | OpeningDay | Jack London +5, Downtown +2 |
 * 
 * FIRST FRIDAY (v2.2):
 * - Uptown +4, KONO +3, Temescal +2, Jack London +1, Downtown +1
 * 
 * CREATION DAY (v2.2):
 * - Downtown +3, West Oakland +2, Lake Merritt +2, Jack London +1
 * 
 * SPORTS SEASON:
 * - Championship: Jack London +4, Downtown +3, Lake Merritt +2
 * - Playoffs: Jack London +3, Downtown +2
 * 
 * SAFETY ATMOSPHERES (v2.2):
 * - calm, normal, cautious, uneasy, tense
 * - festive-crowded (NYE, Halloween)
 * - celebratory (Pride, Art & Soul)
 * - art-walk-energy (First Friday)
 * 
 * TRAFFIC LEVELS (v2.2):
 * - light (<4), moderate (4-7), heavy (8-9), gridlock (10+)
 * 
 * OUTPUT:
 * - nightShiftLoad, eveningTraffic, nightlifeVolume
 * - weatherImpact, weatherType, eveningSafety
 * - crowdMap, crowdHotspots
 * - eveningSystemsCalendarContext
 * 
 * ============================================================================
 */