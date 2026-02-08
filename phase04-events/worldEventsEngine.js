/**
 * ============================================================================
 * worldEventsEngine_ v2.6
 * ============================================================================
 *
 * v2.6 Fixes:
 * - Categories now have explicit domain tags (_domain property)
 * - Events output real domains (SAFETY, HEALTH, FESTIVAL, etc.) not just "WORLD"
 * - domainAllowed_() gate: suppressed domains re-roll to different category
 * - Cooldowns now actually suppress world event generation
 *
 * v2.5 Features (retained):
 * - Append-safe (preserves earlier events from crisis buckets, etc.)
 * - Uses previousCycleState for chaos comparisons
 * - Recovery-aware: respects eventSuppression + recoveryLevel
 * - Canon-safe sports: playoffs/championship only with Maker override
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
  if (pool.length === 0) return cats.length ? cats[0] : null;

  var total = 0;
  for (var j = 0; j < pool.length; j++) total += pool[j].weight;

  var roll = rng() * total;
  for (var k = 0; k < pool.length; k++) {
    var c = pool[k];
    if (roll < c.weight) return c;
    roll -= c.weight;
  }
  return pool[0];
}

function worldEventsEngine_(ctx) {
  if (!ctx) ctx = {};
  if (!ctx.summary) ctx.summary = {};
  var S = ctx.summary;

  // Cycle id (consistent)
  var cycle = S.absoluteCycle || S.cycleId || (ctx.config ? ctx.config.cycleCount : 0) || 0;

  // Prefer injected RNG, else seed, else Math.random
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

  // Use previous cycle state for chaos comparison
  var prev = S.previousCycleState || {};
  var prevChaos = (typeof prev.chaosCount === 'number') ? prev.chaosCount : 0;
  var prevEvents = (typeof prev.events === 'number') ? prev.events : 0;

  // Recovery suppression
  var eventSupp = (typeof S.eventSuppression === 'number') ? S.eventSuppression : 1.0;
  if (!isFinite(eventSupp) || eventSupp <= 0) eventSupp = 1.0;
  var recoveryLevel = (S.recoveryLevel || 'none').toString();

  // Calendar context
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;

  var sportsSeason = (S.sportsSeason || "off-season").toString().trim().toLowerCase();
  var sportsSource = (S.sportsSource || "").toString();

  var IN_SEASON = (sportsSeason !== 'off-season');
  var makerOverrideSports = (sportsSource === 'config-override');
  var allowPlayoffFlavor = makerOverrideSports && (sportsSeason === 'playoffs' || sportsSeason === 'post-season');
  var allowChampFlavor = makerOverrideSports && (sportsSeason === 'championship');

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE CATEGORY POOLS (now with _domain tags)
  // ═══════════════════════════════════════════════════════════════════════════

  var categories = [
    { weight: W.eventWeight, _domain: 'BUSINESS', list: ["kitchen fire (minor)", "food poisoning complaint", "staff walkout", "customer dispute"] },
    { weight: W.civicWeight, _domain: 'SAFETY', list: ["noise complaint", "street disturbance", "suspicious activity check", "minor pursuit"] },
    { weight: (W.eventWeight * 0.6), _domain: 'HEALTH', _health: true, list: ["unusual ER case", "cluster of fainting spells", "unexplained symptom pattern"] },
    { weight: (W.weatherWeight * weatherImp), _domain: 'WEATHER', list: ["sudden downpour", "high-wind pocket", "fog surge", "rapid temperature drop"] },
    { weight: W.eventWeight, _domain: 'CELEBRITY', list: ["actor spotted downtown", "musician near Coliseum", "influencer filming", "athlete sighting"] },
    { weight: W.schoolWeight, _domain: 'EDUCATION', list: ["test score spike", "school-board dispute", "field trip mishap", "teacher highlight"] },
    { weight: W.civicWeight, _domain: 'CIVIC', list: ["zoning adjustment", "road closure decision", "budget amendment", "committee vote"] },
    { weight: W.civicWeight, _domain: 'CIVIC', list: ["small protest", "petition rally", "neighborhood grievance", "online call-to-gather"] },
    { weight: W.eventWeight, _domain: 'INFRASTRUCTURE', list: ["3-block flicker", "transformer hiccup", "5-minute blackout"] },
    { weight: W.eventWeight, _domain: 'TRAFFIC', list: ["signal malfunction", "jackknifed truck", "stalled bus"] },
    { weight: W.civicWeight, _domain: 'CIVIC', list: ["emergency committee meeting", "association briefing", "public-comment session"] },
    { weight: W.eventWeight, _domain: 'CIVIC', list: ["email leak", "misfiled document", "missing funds", "staff rumor"] },
    { weight: W.eventWeight, _domain: 'GENERAL', list: ["forklift near-tip", "minor fender-bender", "lost dog returned", "locked-out worker"] },
    { weight: W.eventWeight, _domain: 'SAFETY', list: ["porch piracy attempt", "petty theft", "graffiti tagging", "car break-in attempt"] },
    { weight: W.eventWeight, _domain: 'INFRASTRUCTURE', list: ["water-pressure drop", "pothole eruption", "internet disruption"] },
    { weight: W.eventWeight, _domain: 'GENERAL', list: ["flash choir", "balloon release", "earthquake rumble", "influencer prank", "drone mistake"] }
  ];

  // Athlete lifestyle pools
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

  categories.push({
    weight: W.eventWeight * (IN_SEASON ? 0.9 : 0.7),
    _domain: 'SPORTS',
    list: IN_SEASON ? ATHLETE_IN_SEASON_EVENTS : ATHLETE_OFF_SEASON_EVENTS
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EVENT POOLS (with domain tags)
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

  var SPORTS_BASE_EVENTS = ["game day traffic surge", "tailgate grill fire", "parking lot fender-bender", "fan celebration spillover"];
  var PLAYOFF_EVENTS = ["playoff watch party overflow", "fan altercation", "scalping bust", "sports bar capacity issue", "honking celebration complaint"];
  var CHAMPIONSHIP_EVENTS = ["championship crowd surge", "victory celebration damage", "championship parade prep", "trophy viewing line chaos", "citywide honking complaint"];
  var OPENING_DAY_EVENTS = ["Opening Day parade delay", "first pitch ceremony traffic", "sold-out parking chaos", "tailgate zone overflow"];

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD CALENDAR CATEGORIES (with _domain tags)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayWeight = W.eventWeight * 1.5;

  if (holiday === "NewYearsEve") {
    categories.push({ weight: holidayWeight * 2, _domain: 'FESTIVAL', list: NEW_YEARS_EVE_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'FESTIVAL', list: FIREWORKS_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'NIGHTLIFE', list: PARTY_EVENTS });
  }
  if (holiday === "Independence") {
    categories.push({ weight: holidayWeight * 2, _domain: 'FESTIVAL', list: INDEPENDENCE_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'FESTIVAL', list: FIREWORKS_EVENTS });
  }
  if (holiday === "Halloween") {
    categories.push({ weight: holidayWeight * 2, _domain: 'FESTIVAL', list: HALLOWEEN_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'NIGHTLIFE', list: PARTY_EVENTS });
  }
  if (holiday === "Thanksgiving") categories.push({ weight: holidayWeight, _domain: 'HOLIDAY', list: THANKSGIVING_EVENTS });
  if (holiday === "Holiday") categories.push({ weight: holidayWeight, _domain: 'HOLIDAY', list: HOLIDAY_EVENTS });

  if (holiday === "LunarNewYear") {
    categories.push({ weight: holidayWeight * 1.5, _domain: 'FESTIVAL', list: LUNAR_NEW_YEAR_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'FESTIVAL', list: FESTIVAL_EVENTS });
  }
  if (holiday === "CincoDeMayo") {
    categories.push({ weight: holidayWeight * 1.5, _domain: 'FESTIVAL', list: CINCO_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'FESTIVAL', list: FESTIVAL_EVENTS });
  }
  if (holiday === "DiaDeMuertos") categories.push({ weight: holidayWeight * 1.5, _domain: 'FESTIVAL', list: DIA_DE_MUERTOS_EVENTS });
  if (holiday === "Juneteenth") {
    categories.push({ weight: holidayWeight * 1.5, _domain: 'FESTIVAL', list: JUNETEENTH_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'FESTIVAL', list: FESTIVAL_EVENTS });
  }
  if (holiday === "StPatricksDay") {
    categories.push({ weight: holidayWeight * 1.5, _domain: 'FESTIVAL', list: ST_PATRICKS_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'NIGHTLIFE', list: PARTY_EVENTS });
  }
  if (holiday === "Easter") categories.push({ weight: holidayWeight, _domain: 'HOLIDAY', list: EASTER_EVENTS });
  if (holiday === "EarthDay") categories.push({ weight: holidayWeight, _domain: 'CIVIC', list: EARTH_DAY_EVENTS });
  if (holiday === "MLKDay") categories.push({ weight: holidayWeight, _domain: 'CIVIC', list: MLK_EVENTS });
  if (holiday === "MemorialDay" || holiday === "VeteransDay") categories.push({ weight: holidayWeight, _domain: 'CIVIC', list: MEMORIAL_VETERANS_EVENTS });

  if (holiday === "OaklandPride") {
    categories.push({ weight: holidayWeight * 2, _domain: 'FESTIVAL', list: PRIDE_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'FESTIVAL', list: FESTIVAL_EVENTS });
  }
  if (holiday === "ArtSoulFestival") {
    categories.push({ weight: holidayWeight * 2, _domain: 'CULTURE', list: ART_SOUL_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'FESTIVAL', list: FESTIVAL_EVENTS });
  }
  if (holiday === "OpeningDay") {
    categories.push({ weight: holidayWeight * 2, _domain: 'SPORTS', list: OPENING_DAY_EVENTS });
    categories.push({ weight: holidayWeight, _domain: 'SPORTS', list: SPORTS_BASE_EVENTS });
  }

  if (isFirstFriday) categories.push({ weight: holidayWeight * 1.5, _domain: 'CULTURE', list: FIRST_FRIDAY_EVENTS });
  if (isCreationDay) {
    categories.push({ weight: holidayWeight, _domain: 'CIVIC', list: CREATION_DAY_EVENTS });
    categories.push({ weight: holidayWeight * 0.5, _domain: 'FESTIVAL', list: FESTIVAL_EVENTS });
  }

  if (IN_SEASON) {
    categories.push({ weight: holidayWeight * 0.9, _domain: 'SPORTS', list: SPORTS_BASE_EVENTS });
  }
  if (allowPlayoffFlavor) {
    categories.push({ weight: holidayWeight * 1.2, _domain: 'SPORTS', list: PLAYOFF_EVENTS });
  }
  if (allowChampFlavor) {
    categories.push({ weight: holidayWeight * 1.6, _domain: 'SPORTS', list: CHAMPIONSHIP_EVENTS });
    categories.push({ weight: holidayWeight * 1.1, _domain: 'SPORTS', list: PLAYOFF_EVENTS });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINE EVENT COUNT (recovery-aware)
  // ═══════════════════════════════════════════════════════════════════════════
  var baseCount = Math.floor(rng() * 3) + 1;

  if (nightlifeVol >= 7) baseCount++;
  if (prevChaos >= 3) baseCount++;
  if (pattern === "micro-event-wave") baseCount++;
  if (sentiment <= -0.4) baseCount++;
  if (civicLoad === "load-strain") baseCount++;

  if (holiday === "NewYearsEve") baseCount += 2;
  if (holiday === "OaklandPride" || holiday === "ArtSoulFestival") baseCount += 2;
  if (holiday === "Independence" || holiday === "Halloween") baseCount++;
  if (holiday === "LunarNewYear" || holiday === "CincoDeMayo") baseCount++;
  if (holidayPriority === "major") baseCount++;
  if (isFirstFriday) baseCount++;
  if (holiday === "OpeningDay") baseCount++;

  if (holiday === "Thanksgiving" || holiday === "Easter") baseCount--;
  if (holiday === "MothersDay" || holiday === "FathersDay") baseCount--;

  if (baseCount > 6) baseCount = 6;
  if (baseCount < 1) baseCount = 1;

  var count = Math.max(1, Math.round(baseCount * eventSupp));

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE EVENTS (with domain gating via domainAllowed_)
  // ═══════════════════════════════════════════════════════════════════════════
  var results = [];
  var used = Object.create(null);
  var healthUsed = false;

  // v2.7: Cross-cycle dedup — load recent event descriptions from WorldEvents_Ledger
  // Suppresses events used in last 5 cycles to reduce the 37% duplicate rate
  try {
    var evLedger = ctx.ss.getSheetByName('WorldEvents_Ledger');
    if (evLedger) {
      var evData = evLedger.getDataRange().getValues();
      var evHeader = evData[0];
      var descIdx = evHeader.indexOf('Description') >= 0 ? evHeader.indexOf('Description') : evHeader.indexOf('description');
      var cycIdx = evHeader.indexOf('Cycle') >= 0 ? evHeader.indexOf('Cycle') : evHeader.indexOf('cycle');
      if (descIdx >= 0) {
        var currentCycle = Number(ctx.summary.cycleId || ctx.summary.absoluteCycle || 0);
        for (var re = 1; re < evData.length; re++) {
          var evCycle = Number(evData[re][cycIdx] || 0);
          if (currentCycle - evCycle <= 5) {
            var evDesc = String(evData[re][descIdx] || '').trim();
            if (evDesc) used[evDesc] = true;
          }
        }
      }
    }
  } catch (e) {
    Logger.log('worldEventsEngine_: Cross-cycle dedup skipped: ' + e.message);
  }

  // Build filtered category list (remove suppressed domains upfront)
  var allowedCategories = [];
  for (var ac = 0; ac < categories.length; ac++) {
    var cat = categories[ac];
    var catDomain = cat._domain || 'GENERAL';
    // Check if domain is allowed (use domainAllowed_ if available)
    if (typeof domainAllowed_ === 'function' && !domainAllowed_(ctx, catDomain)) {
      continue; // Skip suppressed domain categories
    }
    allowedCategories.push(cat);
  }

  // Fallback if all categories suppressed
  if (allowedCategories.length === 0) {
    allowedCategories = categories.filter(function(c) { return c._domain === 'GENERAL'; });
    if (allowedCategories.length === 0) allowedCategories = categories.slice(0, 3);
  }

  for (var i = 0; i < count; i++) {
    var view = [];
    for (var v = 0; v < allowedCategories.length; v++) {
      var c = allowedCategories[v];
      var w = c.weight;

      if (c._health && healthUsed) w = w * 0.35;
      if (recoveryLevel === 'heavy' && c._health) w = w * 0.6;

      view.push({ weight: w, list: c.list, _health: !!c._health, _domain: c._domain || 'GENERAL' });
    }

    var picked = pickWeightedSafe_(view, rng);
    if (!picked) continue;

    var list = picked.list;
    var domain = picked._domain || 'GENERAL';

    // Avoid repeats
    var allUsed = true;
    for (var a = 0; a < list.length; a++) {
      if (!used[list[a]]) { allUsed = false; break; }
    }
    if (allUsed) {
      picked = pickWeightedSafe_(allowedCategories, rng);
      if (picked) {
        list = picked.list;
        domain = picked._domain || 'GENERAL';
      }
    }

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

    // Severity calculation
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

    if (eventSupp <= 0.75) sevScore -= 1;
    if (eventSupp <= 0.55) sevScore -= 2;

    var severity = (sevScore >= 3) ? "medium" : "low";
    if (sevScore >= 5) severity = "high";
    if (severity === "high" && eventSupp <= 0.55) severity = "medium";

    results.push({ description: choice, severity: severity, domain: domain });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE OUTPUT (APPEND-SAFE with real domains)
  // ═══════════════════════════════════════════════════════════════════════════
  S.worldEvents = Array.isArray(S.worldEvents) ? S.worldEvents : [];
  for (var r = 0; r < results.length; r++) {
    S.worldEvents.push({
      cycle: cycle,
      domain: results[r].domain,
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
