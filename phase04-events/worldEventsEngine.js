/**
 * ============================================================================
 * worldEventsEngine_ v2.5
 * ============================================================================
 *
 * v2.5 Fixes:
 * - Flow-safe: no accidental overwrite of other generators (appends)
 * - Uses previousCycleState for chaos comparisons (avoids stale last-cycle bias)
 * - Recovery-aware: respects eventSuppression + recoveryLevel
 * - Canon-safe sports: playoffs/championship pools ONLY when Maker override is active
 * - Adds athlete lifestyle "influence" events (in-season/off-season)
 *
 * Requires (recommended):
 * - applyCycleRecovery_ sets: eventSuppression, recoveryLevel
 * - applyShockMonitor_ uses: worldEvents, previousCycleState/currentCycleState pattern
 *
 * ============================================================================
 */

// --- RNG (optional determinism via ctx.config.rngSeed) ---
function mulberry32_(seed) {
  return function rng() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    var t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Weighted picker (skips invalid/zero weights) ---
function pickWeightedSafe_(cats, rng) {
  var pool = [];
  for (var i = 0; i < cats.length; i++) {
    var w = cats[i].weight;
    if (typeof w === 'number' && isFinite(w) && w > 0) pool.push(cats[i]);
  }
  if (pool.length === 0) return cats.length ? cats[0].list : [];

  var total = 0;
  for (var j = 0; j < pool.length; j++) total += pool[j].weight;

  var roll = rng() * total;
  for (var k = 0; k < pool.length; k++) {
    var c = pool[k];
    if (roll < c.weight) return c.list;
    roll -= c.weight;
  }
  return pool[0].list;
}

function worldEventsEngine_(ctx) {
  if (!ctx) ctx = {};
  if (!ctx.summary) ctx.summary = {};
  var S = ctx.summary;

  // Cycle id (consistent)
  var cycle = S.absoluteCycle || S.cycleId || (ctx.config ? ctx.config.cycleCount : 0) || 0;

  // Prefer injected RNG, else seed, else Math.random
  // IMPORTANT: mix seed with cycle so you don't repeat identical outputs each cycle.
  var rng = (typeof ctx.rng === 'function') ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === 'number')
      ? mulberry32_(((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0)) >>> 0)
      : Math.random;

  var W = (S.seasonal) ? S.seasonal : {
    weatherWeight: 1, eventWeight: 1, civicWeight: 1,
    nightlifeWeight: 1, schoolWeight: 1, sportsWeight: 1
  };

  // Pull current signals
  var weatherImp = (S.weather && typeof S.weather.impact === 'number') ? S.weather.impact : 1;
  var sentiment = (S.cityDynamics && typeof S.cityDynamics.sentiment === 'number') ? S.cityDynamics.sentiment : 0;
  var civicLoad = (S.civicLoad || 'stable');
  var nightlifeVol = (typeof S.nightlifeVolume === 'number') ? S.nightlifeVolume : 0;
  var shock = S.shockFlag || 'none';
  var pattern = S.patternFlag || 'none';
  var drift = (typeof S.migrationDrift === 'number') ? S.migrationDrift : 0;

  // Use previous cycle state for chaos comparison (prevents stale bias)
  var prev = S.previousCycleState || {};
  var prevChaos = (typeof prev.chaosCount === 'number') ? prev.chaosCount : 0;
  var prevEvents = (typeof prev.events === 'number') ? prev.events : 0;

  // Recovery suppression (from applyCycleRecovery_ v2.3)
  var eventSupp = (typeof S.eventSuppression === 'number') ? S.eventSuppression : 1.0;
  if (!isFinite(eventSupp) || eventSupp <= 0) eventSupp = 1.0;
  var recoveryLevel = (S.recoveryLevel || 'none').toString();

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;

  var sportsSeason = (S.sportsSeason || "off-season").toString().trim().toLowerCase();
  var sportsSource = (S.sportsSource || "").toString(); // 'config-override' or 'simmonth-calculated'

  // Canon-safe sports buckets:
  var IN_SEASON = (sportsSeason !== 'off-season');
  var makerOverrideSports = (sportsSource === 'config-override');

  // Only allow playoffs/championship flavor if YOU explicitly override into those states
  var allowPlayoffFlavor = makerOverrideSports && (sportsSeason === 'playoffs' || sportsSeason === 'post-season');
  var allowChampFlavor = makerOverrideSports && (sportsSeason === 'championship');

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE CATEGORY POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var categories = [
    { weight: W.eventWeight, list: ["kitchen fire (minor)", "food poisoning complaint", "staff walkout", "customer dispute"] },
    { weight: W.civicWeight, list: ["noise complaint", "street disturbance", "suspicious activity check", "minor pursuit"] },
    { weight: (W.eventWeight * 0.6), list: ["unusual ER case", "cluster of fainting spells", "unexplained symptom pattern"], _health: true },
    { weight: (W.weatherWeight * weatherImp), list: ["sudden downpour", "high-wind pocket", "fog surge", "rapid temperature drop"] },
    { weight: W.eventWeight, list: ["actor spotted downtown", "musician near Coliseum", "influencer filming", "athlete sighting"] },
    { weight: W.schoolWeight, list: ["test score spike", "school-board dispute", "field trip mishap", "teacher highlight"] },
    { weight: W.civicWeight, list: ["zoning adjustment", "road closure decision", "budget amendment", "committee vote"] },
    { weight: W.civicWeight, list: ["small protest", "petition rally", "neighborhood grievance", "online call-to-gather"] },
    { weight: W.eventWeight, list: ["3-block flicker", "transformer hiccup", "5-minute blackout"] },
    { weight: W.eventWeight, list: ["signal malfunction", "jackknifed truck", "stalled bus"] },
    { weight: W.civicWeight, list: ["emergency committee meeting", "association briefing", "public-comment session"] },
    { weight: W.eventWeight, list: ["email leak", "misfiled document", "missing funds", "staff rumor"] },
    { weight: W.eventWeight, list: ["forklift near-tip", "minor fender-bender", "lost dog returned", "locked-out worker"] },
    { weight: W.eventWeight, list: ["porch piracy attempt", "petty theft", "graffiti tagging", "car break-in attempt"] },
    { weight: W.eventWeight, list: ["water-pressure drop", "pothole eruption", "internet disruption"] },
    { weight: W.eventWeight, list: ["flash choir", "balloon release", "earthquake rumble", "influencer prank", "drone mistake"] }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ATHLETE LIFESTYLE / INFLUENCE POOLS (NEW - not just sports games)
  // ═══════════════════════════════════════════════════════════════════════════
  var ATHLETE_IN_SEASON_EVENTS = [
    "youth clinic announced at a local park",
    "foundation fundraiser dinner draws a crowd",
    "team-sponsored community cleanup day",
    "autograph line causes a brief sidewalk jam",
    "local sports bar hosts a packed watch gathering",
    "endorsement shoot blocks off a small sidewalk area"
  ];

  var ATHLETE_OFF_SEASON_EVENTS = [
    "charity golf outing causes traffic near a venue",
    "private event fundraiser quietly fills a hotel ballroom",
    "athlete-hosted youth camp registration surge",
    "endorsement filming draws onlookers downtown",
    "vacation send-off chatter trends locally",
    "community appearance boosts turnout at a local market"
  ];

  // Add lifestyle pool with modest weight, scaled by in-season/off-season
  categories.push({
    weight: W.eventWeight * (IN_SEASON ? 0.9 : 0.7),
    list: IN_SEASON ? ATHLETE_IN_SEASON_EVENTS : ATHLETE_OFF_SEASON_EVENTS
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  var FESTIVAL_EVENTS = ["parade float breakdown", "crowd surge at barricade", "vendor cart tip-over", "lost child report", "costume malfunction", "balloon escape"];
  var FIREWORKS_EVENTS = ["fireworks debris complaint", "illegal firework confiscation", "sparkler burn incident", "noise complaint surge"];
  var PARTY_EVENTS = ["noise complaint wave", "street party overflow", "intoxication incident", "rideshare surge chaos"];

  var NEW_YEARS_EVE_EVENTS = ["countdown crowd surge", "champagne bottle incident", "midnight noise complaint", "fireworks injury", "party overflow into street"];
  var INDEPENDENCE_EVENTS = ["illegal firework seizure", "BBQ grill flare-up", "sparkler burn report", "flag pole incident", "patriotic parade delay"];
  var HALLOWEEN_EVENTS = ["costume altercation", "haunted house panic", "trick-or-treat traffic jam", "pumpkin vandalism", "fake blood slip hazard"];
  var THANKSGIVING_EVENTS = ["turkey fryer fire", "family dispute call", "grocery store rush incident", "parade balloon snag"];
  var HOLIDAY_EVENTS = ["shopping rush injury", "package theft spike", "decoration electrical issue", "tree lighting delay"];

  var LUNAR_NEW_YEAR_EVENTS = ["lion dance traffic stop", "firecracker complaint", "parade dragon tangle", "red envelope dispute"];
  var CINCO_EVENTS = ["mariachi noise complaint", "street fair overcrowding", "festival food cart fire", "piñata debris cleanup"];
  var DIA_DE_MUERTOS_EVENTS = ["altar candle fire concern", "marigold supply shortage", "cemetery traffic jam", "face paint allergy report"];
  var JUNETEENTH_EVENTS = ["parade route adjustment", "festival sound check complaint", "vendor permit dispute", "block party overflow"];
  var PRIDE_EVENTS = ["parade float breakdown", "rainbow crosswalk photo crowd", "costume heat exhaustion", "glitter cleanup complaint", "celebration crowd surge"];
  var ART_SOUL_EVENTS = ["stage sound issue", "vendor tent collapse", "art installation damage", "crowd capacity concern", "food vendor line dispute"];
  var ST_PATRICKS_EVENTS = ["pub crawl overflow", "green beer spill hazard", "parade shamrock float issue", "bar capacity complaint"];
  var EASTER_EVENTS = ["egg hunt overcrowding", "Easter parade delay", "bunny costume heat issue"];
  var EARTH_DAY_EVENTS = ["cleanup crew traffic issue", "environmental protest", "tree planting ceremony delay"];
  var MLK_EVENTS = ["march route adjustment", "memorial service overflow", "unity rally traffic"];
  var MEMORIAL_VETERANS_EVENTS = ["ceremony cannon complaint", "memorial parade delay", "veteran tribute traffic"];

  var FIRST_FRIDAY_EVENTS = ["gallery overcrowding", "street performer permit issue", "art installation mishap", "wine spill on artwork", "parking garage backup", "food truck line dispute"];
  var CREATION_DAY_EVENTS = ["founders ceremony delay", "heritage walk overcrowding", "history exhibit mishap", "community speech feedback issue"];

  // Canon-safe sports "city texture" (not simulating outcomes)
  var SPORTS_BASE_EVENTS = ["game day traffic surge", "tailgate grill fire", "parking lot fender-bender", "fan celebration spillover"];

  // These only allowed with Maker override (your canon)
  var PLAYOFF_EVENTS = ["playoff watch party overflow", "fan altercation", "scalping bust", "sports bar capacity issue", "honking celebration complaint"];
  var CHAMPIONSHIP_EVENTS = ["championship crowd surge", "victory celebration damage", "championship parade prep", "trophy viewing line chaos", "citywide honking complaint"];

  var OPENING_DAY_EVENTS = ["Opening Day parade delay", "first pitch ceremony traffic", "sold-out parking chaos", "tailgate zone overflow"];

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD CALENDAR CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayWeight = W.eventWeight * 1.5;

  if (holiday === "NewYearsEve") {
    categories.push({ weight: holidayWeight * 2, list: NEW_YEARS_EVE_EVENTS });
    categories.push({ weight: holidayWeight, list: FIREWORKS_EVENTS });
    categories.push({ weight: holidayWeight, list: PARTY_EVENTS });
  }
  if (holiday === "Independence") {
    categories.push({ weight: holidayWeight * 2, list: INDEPENDENCE_EVENTS });
    categories.push({ weight: holidayWeight, list: FIREWORKS_EVENTS });
  }
  if (holiday === "Halloween") {
    categories.push({ weight: holidayWeight * 2, list: HALLOWEEN_EVENTS });
    categories.push({ weight: holidayWeight, list: PARTY_EVENTS });
  }
  if (holiday === "Thanksgiving") categories.push({ weight: holidayWeight, list: THANKSGIVING_EVENTS });
  if (holiday === "Holiday") categories.push({ weight: holidayWeight, list: HOLIDAY_EVENTS });

  if (holiday === "LunarNewYear") {
    categories.push({ weight: holidayWeight * 1.5, list: LUNAR_NEW_YEAR_EVENTS });
    categories.push({ weight: holidayWeight, list: FESTIVAL_EVENTS });
  }
  if (holiday === "CincoDeMayo") {
    categories.push({ weight: holidayWeight * 1.5, list: CINCO_EVENTS });
    categories.push({ weight: holidayWeight, list: FESTIVAL_EVENTS });
  }
  if (holiday === "DiaDeMuertos") categories.push({ weight: holidayWeight * 1.5, list: DIA_DE_MUERTOS_EVENTS });
  if (holiday === "Juneteenth") {
    categories.push({ weight: holidayWeight * 1.5, list: JUNETEENTH_EVENTS });
    categories.push({ weight: holidayWeight, list: FESTIVAL_EVENTS });
  }
  if (holiday === "StPatricksDay") {
    categories.push({ weight: holidayWeight * 1.5, list: ST_PATRICKS_EVENTS });
    categories.push({ weight: holidayWeight, list: PARTY_EVENTS });
  }
  if (holiday === "Easter") categories.push({ weight: holidayWeight, list: EASTER_EVENTS });
  if (holiday === "EarthDay") categories.push({ weight: holidayWeight, list: EARTH_DAY_EVENTS });
  if (holiday === "MLKDay") categories.push({ weight: holidayWeight, list: MLK_EVENTS });
  if (holiday === "MemorialDay" || holiday === "VeteransDay") categories.push({ weight: holidayWeight, list: MEMORIAL_VETERANS_EVENTS });

  if (holiday === "OaklandPride") {
    categories.push({ weight: holidayWeight * 2, list: PRIDE_EVENTS });
    categories.push({ weight: holidayWeight, list: FESTIVAL_EVENTS });
  }
  if (holiday === "ArtSoulFestival") {
    categories.push({ weight: holidayWeight * 2, list: ART_SOUL_EVENTS });
    categories.push({ weight: holidayWeight, list: FESTIVAL_EVENTS });
  }
  if (holiday === "OpeningDay") {
    categories.push({ weight: holidayWeight * 2, list: OPENING_DAY_EVENTS });
    categories.push({ weight: holidayWeight, list: SPORTS_BASE_EVENTS });
  }

  if (isFirstFriday) categories.push({ weight: holidayWeight * 1.5, list: FIRST_FRIDAY_EVENTS });
  if (isCreationDay) {
    categories.push({ weight: holidayWeight, list: CREATION_DAY_EVENTS });
    categories.push({ weight: holidayWeight * 0.5, list: FESTIVAL_EVENTS });
  }

  // Sports season: ONLY add "base" texture unless Maker override says playoffs/championship
  if (IN_SEASON) {
    categories.push({ weight: holidayWeight * 0.9, list: SPORTS_BASE_EVENTS });
  }
  if (allowPlayoffFlavor) {
    categories.push({ weight: holidayWeight * 1.2, list: PLAYOFF_EVENTS });
  }
  if (allowChampFlavor) {
    categories.push({ weight: holidayWeight * 1.6, list: CHAMPIONSHIP_EVENTS });
    categories.push({ weight: holidayWeight * 1.1, list: PLAYOFF_EVENTS });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE EVENT COUNT (recovery-aware)
  // ═══════════════════════════════════════════════════════════════════════════
  var baseCount = Math.floor(rng() * 3) + 1;

  // Existing modifiers (using prevChaos/prevEvents rather than stale S.worldEvents)
  if (nightlifeVol >= 7) baseCount++;
  if (prevChaos >= 3) baseCount++;
  if (pattern === "micro-event-wave") baseCount++;
  if (sentiment <= -0.4) baseCount++;
  if (civicLoad === "load-strain") baseCount++;

  // Calendar count modifiers (kept)
  if (holiday === "NewYearsEve") baseCount += 2;
  if (holiday === "OaklandPride" || holiday === "ArtSoulFestival") baseCount += 2;
  if (holiday === "Independence" || holiday === "Halloween") baseCount++;
  if (holiday === "LunarNewYear" || holiday === "CincoDeMayo") baseCount++;
  if (holidayPriority === "major") baseCount++;
  if (isFirstFriday) baseCount++;
  if (holiday === "OpeningDay") baseCount++;

  // Quiet holidays reduce count
  if (holiday === "Thanksgiving" || holiday === "Easter") baseCount--;
  if (holiday === "MothersDay" || holiday === "FathersDay") baseCount--;

  // Clamp pre-suppression
  if (baseCount > 6) baseCount = 6;
  if (baseCount < 1) baseCount = 1;

  // Apply recovery suppression to count (this is the big realism fix)
  // Heavy recovery makes count noticeably smaller.
  var count = Math.max(1, Math.round(baseCount * eventSupp));

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  var results = [];
  var used = Object.create(null);
  var healthUsed = false;

  for (var i = 0; i < count; i++) {
    var view = [];
    for (var v = 0; v < categories.length; v++) {
      var c = categories[v];
      var w = c.weight;

      // dampen repeated health flavor
      if (c._health && healthUsed) w = w * 0.35;

      // during recovery, dampen health/crisis vibes slightly
      if (recoveryLevel === 'heavy' && c._health) w = w * 0.6;

      view.push({ weight: w, list: c.list, _health: !!c._health });
    }

    var list = pickWeightedSafe_(view, rng);

    // Avoid repeats
    var allUsed = true;
    for (var a = 0; a < list.length; a++) {
      if (!used[list[a]]) { allUsed = false; break; }
    }
    if (allUsed) list = pickWeightedSafe_(categories, rng);

    var choice = list[Math.floor(rng() * list.length)];
    var spins = 0;
    while (used[choice] && spins++ < 8) {
      choice = list[Math.floor(rng() * list.length)];
    }
    used[choice] = true;

    // flag health used
    if (!healthUsed) {
      for (var h = 0; h < view.length; h++) {
        if (view[h].list === list && view[h]._health) { healthUsed = true; break; }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SEVERITY (recovery-aware + calendar-aware)
    // ─────────────────────────────────────────────────────────────────────────
    var sevScore = 0;
    if (prevChaos >= 3) sevScore += 2;
    if (shock === "shock-flag") sevScore += 3;
    if (sentiment <= -0.4) sevScore += 1;
    if (weatherImp >= 1.3) sevScore += 1;
    if (drift <= -20) sevScore += 1;

    if (holiday === "NewYearsEve" || holiday === "OaklandPride") sevScore += 1;
    if (allowChampFlavor) sevScore += 1;

    if (holiday === "Thanksgiving" || holiday === "Easter") sevScore -= 1;
    if (holiday === "MothersDay" || holiday === "FathersDay") sevScore -= 1;

    // Recovery softens severity potential
    if (eventSupp <= 0.75) sevScore -= 1; // moderate recovery
    if (eventSupp <= 0.55) sevScore -= 2; // heavy recovery

    var severity = (sevScore >= 3) ? "medium" : "low";
    if (sevScore >= 5) severity = "high";
    if (severity === "high" && eventSupp <= 0.55) severity = "medium"; // clamp highs during heavy recovery

    results.push({ description: choice, severity: severity });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE OUTPUT (APPEND-SAFE)
  // ═══════════════════════════════════════════════════════════════════════════
  // If other generators already wrote events this cycle, we append rather than overwrite.
  S.worldEvents = Array.isArray(S.worldEvents) ? S.worldEvents : [];
  for (var r = 0; r < results.length; r++) {
    S.worldEvents.push({
      cycle: cycle,
      domain: "WORLD",
      subdomain: "texture",
      description: results[r].description,
      severity: results[r].severity,
      source: "WORLD_EVENTS_ENGINE",
      timestamp: ctx.now || new Date(),
      holidayContext: (holiday !== "none") ? holiday : null,
      sportsSeason: sportsSeason
    });
  }

  if (typeof S.eventsGenerated !== 'number') S.eventsGenerated = 0;
  S.eventsGenerated += results.length;

  S.worldEventsCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    sportsSource: sportsSource,
    inSeason: IN_SEASON,
    eventCount: results.length,
    eventSuppression: eventSupp,
    recoveryLevel: recoveryLevel
  };

  ctx.summary = S;
}
