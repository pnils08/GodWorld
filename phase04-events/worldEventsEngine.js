/**
 * ============================================================================
 * worldEventsEngine_ v2.4
 * ============================================================================
 *
 * Core world events generator with GodWorld Calendar integration.
 *
 * v2.4 Enhancements:
 * - GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific event pools
 * - First Friday arts district events
 * - Creation Day community events
 * - Sports season events (playoffs, championship)
 * - Calendar-aware event count modifiers
 * - Calendar-aware severity adjustments
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.3.1):
 * - Deterministic RNG via ctx.config.rngSeed
 * - Weighted category selection
 * - Weather, sentiment, civic load effects
 * - Nightlife volume, shock/pattern flags
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

// --- Drop-in replacement for your engine ---
function worldEventsEngine_(ctx) {
  if (!ctx) ctx = {};
  if (!ctx.summary) ctx.summary = {};

  // Prefer injected RNG, else seed, else Math.random
  var rng = (typeof ctx.rng === 'function') ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === 'number')
      ? mulberry32_(ctx.config.rngSeed >>> 0)
      : Math.random;

  var W = (ctx.summary.seasonal) ? ctx.summary.seasonal : {
    weatherWeight: 1, eventWeight: 1, civicWeight: 1,
    nightlifeWeight: 1, schoolWeight: 1, sportsWeight: 1
  };

  var prior        = Array.isArray(ctx.summary.worldEvents) ? ctx.summary.worldEvents : [];
  var chaosCount   = prior.length;
  var weatherImp   = (ctx.summary.weather && typeof ctx.summary.weather.impact === 'number') ? ctx.summary.weather.impact : 1;
  var sentiment    = (ctx.summary.cityDynamics && typeof ctx.summary.cityDynamics.sentiment === 'number') ? ctx.summary.cityDynamics.sentiment : 0;
  var civicLoad    = (ctx.summary.civicLoad || 'stable');
  var nightlifeVol = (typeof ctx.summary.nightlifeVolume === 'number') ? ctx.summary.nightlifeVolume : 0;
  var shock        = ctx.summary.shockFlag;
  var pattern      = ctx.summary.patternFlag;
  var drift        = (typeof ctx.summary.migrationDrift === 'number') ? ctx.summary.migrationDrift : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.4)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = ctx.summary.holiday || "none";
  var holidayPriority = ctx.summary.holidayPriority || "none";
  var isFirstFriday = ctx.summary.isFirstFriday || false;
  var isCreationDay = ctx.summary.isCreationDay || false;
  var sportsSeason = ctx.summary.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE CATEGORY POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var categories = [
    { weight: W.eventWeight,                 list: ["kitchen fire (minor)", "food poisoning complaint", "staff walkout", "customer dispute"] },
    { weight: W.civicWeight,                 list: ["noise complaint", "street disturbance", "suspicious activity check", "minor pursuit"] },
    { weight: (W.eventWeight * 0.6),         list: ["unusual ER case", "cluster of fainting spells", "unexplained symptom pattern"], _health: true },
    { weight: (W.weatherWeight * weatherImp),list: ["sudden downpour", "high-wind pocket", "fog surge", "rapid temperature drop"] },
    { weight: W.eventWeight,                 list: ["actor spotted downtown", "musician near Coliseum", "influencer filming", "athlete sighting"] },
    { weight: W.schoolWeight,                list: ["test score spike", "school-board dispute", "field trip mishap", "teacher highlight"] },
    { weight: W.sportsWeight,                list: ["A's practice disruption", "player rumor", "street celebration", "lineup leak"] },
    { weight: W.civicWeight,                 list: ["zoning adjustment", "road closure decision", "budget amendment", "committee vote"] },
    { weight: W.civicWeight,                 list: ["small protest", "petition rally", "neighborhood grievance", "online call-to-gather"] },
    { weight: W.eventWeight,                 list: ["3-block flicker", "transformer hiccup", "5-minute blackout"] },
    { weight: W.eventWeight,                 list: ["signal malfunction", "jackknifed truck", "stalled bus"] },
    { weight: W.civicWeight,                 list: ["emergency committee meeting", "association briefing", "public-comment session"] },
    { weight: W.eventWeight,                 list: ["email leak", "misfiled document", "missing funds", "staff rumor"] },
    { weight: W.eventWeight,                 list: ["forklift near-tip", "minor fender-bender", "lost dog returned", "locked-out worker"] },
    { weight: W.eventWeight,                 list: ["porch piracy attempt", "petty theft", "graffiti tagging", "car break-in attempt"] },
    { weight: W.eventWeight,                 list: ["water-pressure drop", "pothole eruption", "internet disruption"] },
    { weight: W.eventWeight,                 list: ["flash choir", "balloon release", "earthquake rumble", "influencer prank", "drone mistake"] }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EVENT POOLS (v2.4)
  // ═══════════════════════════════════════════════════════════════════════════

  // General festival/parade events
  var FESTIVAL_EVENTS = ["parade float breakdown", "crowd surge at barricade", "vendor cart tip-over", "lost child report", "costume malfunction", "balloon escape"];
  var FIREWORKS_EVENTS = ["fireworks debris complaint", "illegal firework confiscation", "sparkler burn incident", "noise complaint surge"];
  var PARTY_EVENTS = ["noise complaint wave", "street party overflow", "intoxication incident", "rideshare surge chaos"];

  // Holiday-specific
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

  // First Friday arts events
  var FIRST_FRIDAY_EVENTS = ["gallery overcrowding", "street performer permit issue", "art installation mishap", "wine spill on artwork", "parking garage backup", "food truck line dispute"];

  // Creation Day events
  var CREATION_DAY_EVENTS = ["founders ceremony delay", "heritage walk overcrowding", "history exhibit mishap", "community speech feedback issue"];

  // Sports season events
  var SPORTS_BASE_EVENTS = ["game day traffic surge", "tailgate grill fire", "parking lot fender-bender", "fan celebration spillover"];
  var PLAYOFF_EVENTS = ["playoff watch party overflow", "fan altercation", "scalping bust", "sports bar capacity issue", "honking celebration complaint"];
  var CHAMPIONSHIP_EVENTS = ["championship crowd surge", "victory celebration damage", "championship parade prep", "trophy viewing line chaos", "citywide honking complaint"];

  // Opening Day specific
  var OPENING_DAY_EVENTS = ["Opening Day parade delay", "first pitch ceremony traffic", "sold-out parking chaos", "tailgate zone overflow"];

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD CALENDAR CATEGORIES TO POOL (v2.4)
  // ═══════════════════════════════════════════════════════════════════════════

  var holidayWeight = W.eventWeight * 1.5; // Holiday events more likely during holidays

  // Major party holidays
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
  if (holiday === "Thanksgiving") {
    categories.push({ weight: holidayWeight, list: THANKSGIVING_EVENTS });
  }
  if (holiday === "Holiday") {
    categories.push({ weight: holidayWeight, list: HOLIDAY_EVENTS });
  }

  // Cultural holidays
  if (holiday === "LunarNewYear") {
    categories.push({ weight: holidayWeight * 1.5, list: LUNAR_NEW_YEAR_EVENTS });
    categories.push({ weight: holidayWeight, list: FESTIVAL_EVENTS });
  }
  if (holiday === "CincoDeMayo") {
    categories.push({ weight: holidayWeight * 1.5, list: CINCO_EVENTS });
    categories.push({ weight: holidayWeight, list: FESTIVAL_EVENTS });
  }
  if (holiday === "DiaDeMuertos") {
    categories.push({ weight: holidayWeight * 1.5, list: DIA_DE_MUERTOS_EVENTS });
  }
  if (holiday === "Juneteenth") {
    categories.push({ weight: holidayWeight * 1.5, list: JUNETEENTH_EVENTS });
    categories.push({ weight: holidayWeight, list: FESTIVAL_EVENTS });
  }
  if (holiday === "StPatricksDay") {
    categories.push({ weight: holidayWeight * 1.5, list: ST_PATRICKS_EVENTS });
    categories.push({ weight: holidayWeight, list: PARTY_EVENTS });
  }
  if (holiday === "Easter") {
    categories.push({ weight: holidayWeight, list: EASTER_EVENTS });
  }
  if (holiday === "EarthDay") {
    categories.push({ weight: holidayWeight, list: EARTH_DAY_EVENTS });
  }
  if (holiday === "MLKDay") {
    categories.push({ weight: holidayWeight, list: MLK_EVENTS });
  }
  if (holiday === "MemorialDay" || holiday === "VeteransDay") {
    categories.push({ weight: holidayWeight, list: MEMORIAL_VETERANS_EVENTS });
  }

  // Oakland celebrations
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

  // First Friday (v2.4)
  if (isFirstFriday) {
    categories.push({ weight: holidayWeight * 1.5, list: FIRST_FRIDAY_EVENTS });
  }

  // Creation Day (v2.4)
  if (isCreationDay) {
    categories.push({ weight: holidayWeight, list: CREATION_DAY_EVENTS });
    categories.push({ weight: holidayWeight * 0.5, list: FESTIVAL_EVENTS });
  }

  // Sports season (v2.4)
  if (sportsSeason === "championship") {
    categories.push({ weight: holidayWeight * 2, list: CHAMPIONSHIP_EVENTS });
    categories.push({ weight: holidayWeight, list: PLAYOFF_EVENTS });
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    categories.push({ weight: holidayWeight * 1.5, list: PLAYOFF_EVENTS });
    categories.push({ weight: holidayWeight, list: SPORTS_BASE_EVENTS });
  } else if (sportsSeason === "late-season") {
    categories.push({ weight: holidayWeight, list: SPORTS_BASE_EVENTS });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE EVENT COUNT (v2.4 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  var count = Math.floor(rng() * 3) + 1;
  
  // Existing modifiers
  if (nightlifeVol >= 7) count++;
  if (chaosCount >= 3) count++;
  if (pattern === "micro-event-wave") count++;
  if (sentiment <= -0.4) count++;
  if (civicLoad === "load-strain") count++;

  // v2.4: Calendar count modifiers
  if (holiday === "NewYearsEve") count += 2;
  if (holiday === "OaklandPride" || holiday === "ArtSoulFestival") count += 2;
  if (holiday === "Independence" || holiday === "Halloween") count++;
  if (holiday === "LunarNewYear" || holiday === "CincoDeMayo") count++;
  if (holidayPriority === "major") count++;
  if (isFirstFriday) count++;
  if (sportsSeason === "championship") count += 2;
  if (sportsSeason === "playoffs") count++;
  if (holiday === "OpeningDay") count++;

  // Quieter holidays reduce count
  if (holiday === "Thanksgiving" || holiday === "Easter") count--;
  if (holiday === "MothersDay" || holiday === "FathersDay") count--;

  // Clamp
  if (count > 6) count = 6;
  if (count < 1) count = 1;

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
      if (c._health && healthUsed) w = w * 0.35; // dampen repeated crisis flavor
      view.push({ weight: w, list: c.list, _health: !!c._health });
    }

    var list = pickWeightedSafe_(view, rng);

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

    if (!healthUsed) {
      for (var h = 0; h < view.length; h++) {
        if (view[h].list === list && view[h]._health) { healthUsed = true; break; }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SEVERITY CALCULATION (v2.4 - calendar-aware)
    // ─────────────────────────────────────────────────────────────────────────
    var sevScore = 0;
    if (chaosCount >= 3) sevScore += 2;
    if (shock === "shock-flag") sevScore += 3;
    if (sentiment <= -0.4) sevScore += 1;
    if (weatherImp >= 1.3) sevScore += 1;
    if (drift <= -20) sevScore += 1;

    // v2.4: Calendar severity modifiers
    // Big crowd holidays increase severity potential
    if (holiday === "NewYearsEve" || holiday === "OaklandPride") sevScore += 1;
    if (sportsSeason === "championship") sevScore += 1;
    
    // Quieter/family holidays reduce severity
    if (holiday === "Thanksgiving" || holiday === "Easter") sevScore -= 1;
    if (holiday === "MothersDay" || holiday === "FathersDay") sevScore -= 1;

    var severity = (sevScore >= 3) ? "medium" : "low";
    if (sevScore >= 5) severity = "high";

    results.push({ description: choice, severity: severity });
  }

  ctx.summary.worldEvents = results;

  if (typeof ctx.summary.eventsGenerated !== 'number') ctx.summary.eventsGenerated = 0;
  ctx.summary.eventsGenerated += results.length;

  // v2.4: Calendar context for downstream systems
  ctx.summary.worldEventsCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    eventCount: results.length
  };
}


/**
 * ============================================================================
 * WORLD EVENTS ENGINE REFERENCE v2.4
 * ============================================================================
 * 
 * HOLIDAY EVENT POOLS:
 * 
 * | Holiday | Event Types |
 * |---------|-------------|
 * | NewYearsEve | Countdown crowds, fireworks, party overflow |
 * | Independence | Fireworks, BBQ fires, parade delays |
 * | Halloween | Costume issues, haunted house, trick-or-treat traffic |
 * | Thanksgiving | Turkey fryer fires, family disputes, parade issues |
 * | Holiday | Shopping rush, package theft, decorations |
 * | LunarNewYear | Lion dance, firecrackers, parade tangles |
 * | CincoDeMayo | Mariachi, street fair, festival crowds |
 * | DiaDeMuertos | Altar candles, cemetery traffic, marigolds |
 * | Juneteenth | Parade routes, festival sound, block parties |
 * | OaklandPride | Parade floats, crowd surge, celebration |
 * | ArtSoulFestival | Stage issues, vendor tents, art damage |
 * | OpeningDay | Parade, first pitch, parking chaos |
 * | StPatricksDay | Pub crawl, green beer, parade |
 * | Easter | Egg hunt, parade, bunny costumes |
 * | EarthDay | Cleanup crews, protests, tree planting |
 * | MLKDay | March routes, memorial overflow |
 * | MemorialDay/VeteransDay | Ceremony, parade |
 * 
 * FIRST FRIDAY (6 events):
 * - Gallery overcrowding, street performer issues, art mishaps, etc.
 * 
 * CREATION DAY (4 events):
 * - Founders ceremony, heritage walk, history exhibit, speeches
 * 
 * SPORTS SEASON:
 * - Base: Game day traffic, tailgates, parking, fan spillover
 * - Playoffs: Watch party overflow, altercations, scalping
 * - Championship: Crowd surge, victory damage, parade prep
 * 
 * COUNT MODIFIERS (v2.4):
 * - NewYearsEve: +2
 * - OaklandPride/ArtSoul: +2
 * - Championship: +2
 * - Independence/Halloween: +1
 * - LunarNewYear/CincoDeMayo: +1
 * - Major holiday: +1
 * - First Friday: +1
 * - Playoffs: +1
 * - Opening Day: +1
 * - Thanksgiving/Easter: -1
 * - MothersDay/FathersDay: -1
 * 
 * MAX COUNT: 6 (up from 5)
 * 
 * SEVERITY LEVELS: low, medium, high (v2.4: added high for major events)
 * 
 * ============================================================================
 */