/**
 * ============================================================================
 * Citizens Events Engine v2.4 (tagged pool + optional determinism)
 * ============================================================================
 *
 * Backward compatible:
 * - LifeHistory line remains: "[PrimaryTag] text"
 * - LifeHistory_Log "EventTag" column receives: "PrimaryTag|tagA|tagB|..."
 *
 * Determinism:
 * - Uses ctx.rng() if provided
 * - Else uses ctx.config.rngSeed via mulberry32_
 * - Else falls back to Math.random
 * ============================================================================
 */

/** RNG (optional determinism via ctx.config.rngSeed) */
function mulberry32_(seed) {
  return function rng() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    var t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateCitizensEvents_(ctx) {
  var sheet = ctx.ss.getSheetByName("Simulation_Ledger");
  if (!sheet) return;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);
  function idx(n) { return header.indexOf(n); }

  var iTier = idx("Tier");
  var iClock = idx("ClockMode");
  var iLife = idx("LifeHistory");
  var iLastU = idx("LastUpdated");
  var iPopID = idx("POPID");
  var iFirst = idx("First");
  var iLast = idx("Last");
  var iNeighborhood = idx("Neighborhood");

  if (iTier < 0 || iClock < 0 || iLife < 0 || iLastU < 0 || iPopID < 0) return;

  var lifeLog = ctx.ss.getSheetByName("LifeHistory_Log");
  var S = ctx.summary || (ctx.summary = {});
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  // Prefer injected RNG, else seed, else Math.random
  var rng = (typeof ctx.rng === "function")
    ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === "number")
      ? mulberry32_((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0))
      : Math.random;

  function roll() { return rng(); }
  function chanceHit(p) { return roll() < p; }
  function pickOne(arr) { return arr[Math.floor(roll() * arr.length)]; }

  // =========================================================================
  // WORLD CONTEXT
  // =========================================================================
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };
  var econMood = S.economicMood || 50;

  // Calendar context (v2.4)
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;
  var sportsSeason = S.sportsSeason || "off-season";

  // Limit
  var count = 0;
  var LIMIT = 10;

  // Active citizens tracker (dedup) - use object for ES5 Set-like behavior
  var activeSetObj = Object.create(null);
  var initialActives = Array.isArray(S.cycleActiveCitizens) ? S.cycleActiveCitizens : [];
  for (var ai = 0; ai < initialActives.length; ai++) {
    activeSetObj[initialActives[ai]] = true;
  }
  S.cycleActiveCitizens = Object.keys(activeSetObj);

  // =========================================================================
  // BUILD CITIZEN LOOKUP (unchanged)
  // =========================================================================
  if (!ctx.citizenLookup) {
    ctx.citizenLookup = {};
    var iUNI = idx("UNI (y/n)");
    var iMED = idx("MED (y/n)");
    var iCIV = idx("CIV (y/n)");
    var iTierRole = idx("TierRole");
    var iType = idx("Type");

    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      var popId = row[iPopID];
      if (!popId) continue;
      ctx.citizenLookup[popId] = {
        UNI: iUNI >= 0 ? (row[iUNI] || "n") : "n",
        MED: iMED >= 0 ? (row[iMED] || "n") : "n",
        CIV: iCIV >= 0 ? (row[iCIV] || "n") : "n",
        TierRole: iTierRole >= 0 ? (row[iTierRole] || "") : "",
        Type: iType >= 0 ? (row[iType] || "") : "",
        Tier: Number(row[iTier]) || 0,
        Neighborhood: iNeighborhood >= 0 ? (row[iNeighborhood] || "") : ""
      };
    }
  }

  // =========================================================================
  // TAGGED POOL HELPERS
  // =========================================================================
  function makeEntry(text, tags) {
    return { text: text, tags: Array.isArray(tags) ? tags : [] };
  }

  function mergeTags(baseTags, extraTags) {
    var seen = Object.create(null);
    var out = [];
    function add(t) { if (t && !seen[t]) { seen[t] = true; out.push(t); } }
    var base = baseTags || [];
    var extra = extraTags || [];
    for (var bi = 0; bi < base.length; bi++) { add(base[bi]); }
    for (var ei = 0; ei < extra.length; ei++) { add(extra[ei]); }
    return out;
  }

  var calendarTags = (function() {
    var tags = [];
    if (holiday !== "none") tags.push("holiday:" + holiday);
    if (holidayPriority !== "none") tags.push("holidayPriority:" + holidayPriority);
    if (isFirstFriday) tags.push("firstFriday");
    if (isCreationDay) tags.push("creationDay");
    if (sportsSeason && sportsSeason !== "off-season") tags.push("sportsSeason:" + sportsSeason);
    return tags;
  })();

  // Primary tag selection (legacy buckets)
  function primaryFromTags(tags) {
    function has(t) { return tags.indexOf(t) >= 0; }
    if (has("source:media")) return "Media";
    if (has("source:weather")) return "Weather";
    if (has("relationship:rivalry")) return "Rivalry";
    if (has("relationship:alliance")) return "Alliance";
    if (has("relationship:mentorship")) return "Mentorship";
    // Check for arc: prefix
    for (var ti = 0; ti < tags.length; ti++) {
      if (tags[ti].indexOf("arc:") === 0) return "Arc";
    }
    if (has("source:neighborhood")) return "Neighborhood";
    if (has("source:firstFriday")) return "FirstFriday";
    if (has("source:creationDay")) return "CreationDay";
    if (has("source:holiday")) return "Holiday";
    if (has("source:sports")) return "Sports";
    return "Daily";
  }

  // =========================================================================
  // POOLS
  // =========================================================================
  var baseDailyTexts = [
    "had a quiet moment at home",
    "completed a small personal task",
    "spent time unwinding in the evening",
    "checked in with a relative",
    "handled routine daily responsibilities",
    "took a moment of rest"
  ];
  var baseDaily = [];
  for (var bdi = 0; bdi < baseDailyTexts.length; bdi++) {
    baseDaily.push(makeEntry(baseDailyTexts[bdi], ["source:daily"]));
  }

  var seasonal = [];
  if (season === "Winter") seasonal.push(makeEntry("coped with the colder winter evening", ["source:season", "season:Winter"]));
  if (season === "Spring") seasonal.push(makeEntry("felt energy from seasonal change", ["source:season", "season:Spring"]));
  if (season === "Summer") seasonal.push(makeEntry("enjoyed warmth during the evening", ["source:season", "season:Summer"]));
  if (season === "Fall") seasonal.push(makeEntry("prepared for shorter fall days", ["source:season", "season:Fall"]));

  var weatherPool = [];
  if (weather.type === "rain") weatherPool.push(makeEntry("adjusted plans due to rain", ["source:weatherPool", "weather:rain"]));
  if (weather.type === "fog") weatherPool.push(makeEntry("moved cautiously due to fog", ["source:weatherPool", "weather:fog"]));
  if (weather.type === "hot") weatherPool.push(makeEntry("sought relief from heat", ["source:weatherPool", "weather:hot"]));
  if (weather.type === "cold") weatherPool.push(makeEntry("bundled up against the cold", ["source:weatherPool", "weather:cold"]));
  if (weather.type === "wind") weatherPool.push(makeEntry("noted windy evening conditions", ["source:weatherPool", "weather:wind"]));

  var chaosPool = (chaos.length > 0)
    ? [
        makeEntry("reflected briefly on today's city happenings", ["source:chaos"]),
        makeEntry("felt subtle shift in mood due to recent events", ["source:chaos"])
      ]
    : [];

  var sentimentPool = [];
  if (dynamics.sentiment >= 0.3) sentimentPool.push(makeEntry("felt uplifted by city mood", ["source:sentiment", "sentiment:positive"]));
  if (dynamics.sentiment <= -0.3) sentimentPool.push(makeEntry("felt unsettled by city tension", ["source:sentiment", "sentiment:negative"]));

  var econPool = [];
  if (econMood <= 35) econPool.push(makeEntry("felt economic uncertainty weighing on the day", ["source:economy", "econ:low"]));
  if (econMood >= 65) econPool.push(makeEntry("sensed optimism about local opportunities", ["source:economy", "econ:high"]));

  var allianceTexts = [
    "coordinated briefly with an ally on shared interests",
    "received a supportive message from a trusted connection",
    "felt reassured by a recent alliance",
    "collaborated quietly with a close associate",
    "exchanged insights with a professional ally"
  ];
  var alliancePool = [];
  for (var ali = 0; ali < allianceTexts.length; ali++) {
    alliancePool.push(makeEntry(allianceTexts[ali], ["relationship:alliance"]));
  }

  var rivalryTexts = [
    "felt a flicker of tension thinking about a competitor",
    "noticed subtle friction in professional circles",
    "sensed unspoken rivalry in a routine interaction",
    "felt the weight of ongoing competition",
    "overheard something that stirred old tensions"
  ];
  var rivalryPool = [];
  for (var rvi = 0; rvi < rivalryTexts.length; rvi++) {
    rivalryPool.push(makeEntry(rivalryTexts[rvi], ["relationship:rivalry"]));
  }

  var arcTexts = [
    "felt the mounting pressure of unfolding events",
    "sensed their role in a larger story taking shape",
    "noticed how recent events seemed interconnected",
    "felt pulled deeper into an evolving situation"
  ];
  var arcPool = [];
  for (var ari = 0; ari < arcTexts.length; ari++) {
    arcPool.push(makeEntry(arcTexts[ari], ["arc:generic"]));
  }

  var mentorshipTexts = [
    "reflected on guidance received from a mentor",
    "considered advice to share with someone newer",
    "felt the responsibility of being looked up to",
    "appreciated a learning moment from an experienced contact"
  ];
  var mentorshipPool = [];
  for (var mti = 0; mti < mentorshipTexts.length; mti++) {
    mentorshipPool.push(makeEntry(mentorshipTexts[mti], ["relationship:mentorship"]));
  }

  var neighborhoodPools = {
    "Temescal": [
      "grabbed coffee at a Temescal cafe",
      "noticed the neighborhood's creative energy",
      "browsed the Temescal Alley shops"
    ],
    "Downtown": [
      "navigated Downtown's busy streets",
      "felt the pulse of the city center",
      "passed by City Hall on routine business"
    ],
    "Fruitvale": [
      "enjoyed the Fruitvale community vibe",
      "stopped by a familiar Fruitvale spot",
      "appreciated the neighborhood's cultural richness"
    ],
    "Lake Merritt": [
      "took a moment by the lake",
      "enjoyed Lake Merritt's evening calm",
      "watched joggers circle the lake"
    ],
    "West Oakland": [
      "noticed West Oakland's changing landscape",
      "felt the neighborhood's industrial rhythm",
      "passed by historic Victorian homes"
    ],
    "Laurel": [
      "appreciated Laurel's quiet streets",
      "enjoyed the residential calm",
      "stopped by Laurel's small shops"
    ],
    "Rockridge": [
      "browsed Rockridge's shops briefly",
      "walked under Rockridge's tree canopy",
      "grabbed something from College Avenue"
    ],
    "Jack London": [
      "felt Jack London's waterfront energy",
      "noticed activity near the estuary",
      "enjoyed the district's evening atmosphere"
    ],
    "Uptown": [
      "walked through Uptown's gallery district",
      "noticed the neighborhood's artistic energy",
      "passed by the Fox Theater"
    ],
    "KONO": [
      "explored KONO's creative spaces",
      "noticed murals along the corridor",
      "felt the neighborhood's DIY spirit"
    ],
    "Chinatown": [
      "stopped by Chinatown for familiar flavors",
      "appreciated the neighborhood's bustling energy",
      "noticed the blend of old and new storefronts"
    ],
    "Piedmont Ave": [
      "strolled along Piedmont Avenue",
      "enjoyed the neighborhood's boutique charm",
      "appreciated the leafy residential streets"
    ]
  };

  var holidayPools = {
    Thanksgiving: [
      "prepared for Thanksgiving gathering",
      "reflected on things to be grateful for",
      "helped with holiday meal preparations"
    ],
    Holiday: [
      "felt the holiday spirit in the air",
      "wrapped up last-minute holiday tasks",
      "enjoyed seasonal decorations around town"
    ],
    NewYear: [
      "reflected on the year past",
      "thought about resolutions ahead",
      "felt the fresh-start energy of January"
    ],
    NewYearsEve: [
      "made plans for the evening countdown",
      "felt anticipation for the new year",
      "prepared for celebration"
    ],
    Independence: [
      "noticed patriotic decorations around town",
      "made plans for fireworks viewing",
      "enjoyed the holiday atmosphere"
    ],
    MLKDay: [
      "reflected on Dr. King's legacy",
      "thought about community and justice",
      "felt the weight of history"
    ],
    Juneteenth: [
      "celebrated freedom and heritage",
      "connected with community history",
      "felt pride in cultural roots"
    ],
    CincoDeMayo: [
      "enjoyed festive atmosphere in town",
      "celebrated cultural heritage",
      "noticed colorful decorations"
    ],
    DiaDeMuertos: [
      "honored ancestors in quiet reflection",
      "noticed beautiful altars around town",
      "felt connection to those passed"
    ],
    LunarNewYear: [
      "enjoyed lunar new year festivities",
      "noticed red decorations around Chinatown",
      "felt the celebratory energy"
    ],
    OpeningDay: [
      "felt excitement for A's baseball",
      "wore green and gold proudly",
      "made plans to follow the game"
    ],
    OaklandPride: [
      "celebrated Oakland's LGBTQ+ community",
      "noticed rainbow flags around town",
      "felt the city's inclusive spirit"
    ],
    Valentine: [
      "noticed Valentine's displays around town",
      "thought about loved ones",
      "felt the romantic atmosphere"
    ],
    Halloween: [
      "noticed spooky decorations around town",
      "saw costumes appearing early",
      "felt the playful autumn spirit"
    ],
    Easter: [
      "noticed spring celebrations around town",
      "enjoyed the seasonal atmosphere",
      "saw families gathering"
    ],
    StPatricksDay: [
      "noticed green everywhere",
      "felt the festive Irish spirit",
      "saw celebrations starting early"
    ],
    MothersDay: [
      "thought about family connections",
      "noticed families gathering",
      "felt grateful for maternal figures"
    ],
    FathersDay: [
      "thought about family bonds",
      "noticed families celebrating",
      "felt grateful for paternal figures"
    ],
    MemorialDay: [
      "reflected on those who served",
      "enjoyed the long weekend atmosphere",
      "noticed flags around town"
    ],
    LaborDay: [
      "appreciated workers and labor",
      "enjoyed the last summer holiday",
      "felt the end-of-summer mood"
    ],
    VeteransDay: [
      "honored veterans in thought",
      "noticed memorial observances",
      "reflected on service and sacrifice"
    ]
  };

  var firstFridayTexts = [
    "checked out First Friday galleries",
    "enjoyed the art walk atmosphere",
    "felt the creative energy of First Friday",
    "wandered through Uptown's open studios",
    "discovered new local artists",
    "soaked in the community arts scene"
  ];
  var firstFridayPool = [];
  for (var ffi = 0; ffi < firstFridayTexts.length; ffi++) {
    firstFridayPool.push(makeEntry(firstFridayTexts[ffi], ["source:firstFriday"]));
  }

  var creationDayTexts = [
    "felt a sense of belonging in Oakland",
    "reflected on roots in the community",
    "appreciated the city's foundational spirit",
    "felt connected to Oakland's story"
  ];
  var creationDayPool = [];
  for (var cdi = 0; cdi < creationDayTexts.length; cdi++) {
    creationDayPool.push(makeEntry(creationDayTexts[cdi], ["source:creationDay"]));
  }

  var sportsSeasonPools = {
    championship: [
      "felt championship fever in the air",
      "followed the team's championship run",
      "sensed the city's sports excitement"
    ],
    playoffs: [
      "followed playoff updates closely",
      "felt the playoff tension",
      "hoped for the team's success"
    ],
    "post-season": [
      "followed playoff updates closely",
      "felt the playoff tension",
      "hoped for the team's success"
    ],
    "late-season": [
      "watched the pennant race unfold",
      "felt the late-season intensity",
      "followed standings closely"
    ]
  };

  // Final base pool
  var basePoolRaw = baseDaily.concat(seasonal, weatherPool, chaosPool, sentimentPool, econPool);
  var basePool = [];
  for (var bpi = 0; bpi < basePoolRaw.length; bpi++) {
    var e = basePoolRaw[bpi];
    basePool.push(makeEntry(e.text, mergeTags(e.tags, ["source:base"])));
  }

  // =========================================================================
  // MAIN CITIZEN LOOP
  // =========================================================================
  var logRows = [];
  for (var r = 0; r < rows.length; r++) {
    if (count >= LIMIT) break;

    var row = rows[r];
    var tier = Number(row[iTier] || 0);
    var mode = row[iClock] || "ENGINE";
    var popId = row[iPopID];
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || "") : "";

    if (tier !== 3 && tier !== 4) continue;
    if (mode !== "ENGINE") continue;
    if (!popId) continue;

    // Base chance
    var chance = 0.02;

    if (weather.impact >= 1.3) chance += 0.01;
    if (dynamics.sentiment <= -0.3) chance += 0.01;
    if (chaos.length > 0) chance += 0.015;
    if (season === "Winter") chance += 0.005;
    if (season === "Summer") chance += 0.005;
    if (econMood <= 35 || econMood >= 65) chance += 0.005;

    // Calendar chance modifiers
    if (holidayPriority === "major") chance += 0.02;
    else if (holidayPriority === "oakland") chance += 0.02;
    else if (holidayPriority === "cultural") chance += 0.015;
    else if (holidayPriority === "minor") chance += 0.008;

    if (isFirstFriday) {
      chance += 0.015;
      if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Temescal" || neighborhood === "Jack London") {
        chance += 0.01;
      }
    }

    if (isCreationDay) chance += 0.01;

    if (sportsSeason === "championship") chance += 0.015;
    else if (sportsSeason === "playoffs" || sportsSeason === "post-season") chance += 0.01;

    if (dynamics.culturalActivity >= 1.4) chance += 0.008;
    if (dynamics.communityEngagement >= 1.3) chance += 0.005;

    // Alliance/Arc boost
    if (typeof getCombinedEventBoost_ === "function") {
      var eventBoost = getCombinedEventBoost_(ctx, popId);
      chance *= eventBoost;
    }

    // Bonds
    var citizenBonds = [];
    var hasRivalry = false;
    var hasAlliance = false;
    var hasMentorship = false;

    if (typeof getCitizenBonds_ === "function") {
      citizenBonds = getCitizenBonds_(ctx, popId) || [];
      // Check for rivalry
      for (var bi = 0; bi < citizenBonds.length; bi++) {
        var b = citizenBonds[bi];
        if (b && b.bondType === "rivalry") hasRivalry = true;
        if (b && b.bondType === "alliance") hasAlliance = true;
        if (b && b.bondType === "mentorship") hasMentorship = true;
      }
    }

    if (hasRivalry) chance += 0.02;

    // Arc involvement
    var activeArc = null;
    if (typeof citizenInActiveArc_ === "function") {
      activeArc = citizenInActiveArc_(ctx, popId);
      if (activeArc) {
        var arcPhaseBoost = {
          early: 0.01,
          rising: 0.015,
          mid: 0.02,
          peak: 0.04,
          decline: 0.015,
          falling: 0.01
        };
        chance += arcPhaseBoost[activeArc.phase] || 0.01;
      }
    }

    // Weather modifier
    if (typeof getWeatherEventModifier_ === "function") {
      var weatherMod = getWeatherEventModifier_(ctx, "social");
      chance *= weatherMod;
    }

    // Media modifier
    if (typeof getMediaEventModifier_ === "function") {
      var mediaMod = getMediaEventModifier_(ctx, "social");
      chance *= mediaMod;
    }

    // Heat wave boost
    if (typeof hasWeatherCondition_ === "function" && hasWeatherCondition_(ctx, "heat_wave")) {
      chance += 0.01;
    }

    if (chance > 0.18) chance = 0.18;
    if (!chanceHit(chance)) continue;

    // Build contextual pool (tagged entries)
    var pool = [];
    for (var pbi = 0; pbi < basePool.length; pbi++) {
      var bpEntry = basePool[pbi];
      pool.push(makeEntry(bpEntry.text, mergeTags(bpEntry.tags, calendarTags)));
    }

    // Neighborhood
    if (neighborhood && neighborhoodPools[neighborhood]) {
      var nTexts = neighborhoodPools[neighborhood];
      for (var ni = 0; ni < nTexts.length; ni++) {
        pool.push(makeEntry(nTexts[ni], mergeTags(["source:neighborhood", "neighborhood:" + neighborhood], calendarTags)));
      }
    }

    // Holiday
    if (holiday !== "none" && holidayPools[holiday]) {
      var hTexts = holidayPools[holiday];
      for (var hi = 0; hi < hTexts.length; hi++) {
        pool.push(makeEntry(hTexts[hi], mergeTags(["source:holiday", "holiday:" + holiday], calendarTags)));
      }
    }

    // First Friday
    if (isFirstFriday) {
      for (var ffi2 = 0; ffi2 < firstFridayPool.length; ffi2++) {
        var ffEntry = firstFridayPool[ffi2];
        pool.push(makeEntry(ffEntry.text, mergeTags(ffEntry.tags, calendarTags)));
      }
    }

    // Creation Day
    if (isCreationDay) {
      for (var cdi2 = 0; cdi2 < creationDayPool.length; cdi2++) {
        var cdEntry = creationDayPool[cdi2];
        pool.push(makeEntry(cdEntry.text, mergeTags(cdEntry.tags, calendarTags)));
      }
    }

    // Sports season
    if (sportsSeason !== "off-season" && sportsSeasonPools[sportsSeason]) {
      var sTexts = sportsSeasonPools[sportsSeason];
      for (var si = 0; si < sTexts.length; si++) {
        pool.push(makeEntry(sTexts[si], mergeTags(["source:sports"], calendarTags)));
      }
    }

    // Relationship-aware additions
    if (hasAlliance && chanceHit(0.4)) {
      for (var ali2 = 0; ali2 < alliancePool.length; ali2++) {
        var alEntry = alliancePool[ali2];
        pool.push(makeEntry(alEntry.text, mergeTags(alEntry.tags, calendarTags)));
      }
    }
    if (hasRivalry && chanceHit(0.4)) {
      for (var rvi2 = 0; rvi2 < rivalryPool.length; rvi2++) {
        var rvEntry = rivalryPool[rvi2];
        pool.push(makeEntry(rvEntry.text, mergeTags(rvEntry.tags, calendarTags)));
      }
    }
    if (hasMentorship && chanceHit(0.3)) {
      for (var mti2 = 0; mti2 < mentorshipPool.length; mti2++) {
        var mtEntry = mentorshipPool[mti2];
        pool.push(makeEntry(mtEntry.text, mergeTags(mtEntry.tags, calendarTags)));
      }
    }
    if (activeArc && chanceHit(0.5)) {
      var arcType = activeArc.type ? ("arcType:" + activeArc.type) : null;
      var arcPhase = activeArc.phase ? ("arcPhase:" + activeArc.phase) : null;
      var arcTagsExtra = [];
      if (arcType) arcTagsExtra.push(arcType);
      if (arcPhase) arcTagsExtra.push(arcPhase);
      for (var ari2 = 0; ari2 < arcPool.length; ari2++) {
        var arEntry = arcPool[ari2];
        pool.push(makeEntry(arEntry.text, mergeTags(mergeTags(arEntry.tags, arcTagsExtra), calendarTags)));
      }
    }

    // Weather event injection
    if (typeof getWeatherEvent_ === "function" && chanceHit(0.25)) {
      var weatherEvent = getWeatherEvent_(ctx, true);
      if (weatherEvent && weatherEvent.text) {
        pool.push(makeEntry(weatherEvent.text, mergeTags(["source:weather"], calendarTags)));
      }
    }

    // Heat wave special pools
    if (typeof hasWeatherCondition_ === "function" && hasWeatherCondition_(ctx, "heat_wave")) {
      if (S.weatherEventPools && Array.isArray(S.weatherEventPools.special)) {
        var specialPool = S.weatherEventPools.special;
        for (var spi = 0; spi < specialPool.length; spi++) {
          pool.push(makeEntry(specialPool[spi], mergeTags(["source:weather"], calendarTags)));
        }
      }
    }

    // Media-influenced injection
    if (typeof getMediaInfluencedEvent_ === "function" && chanceHit(0.2)) {
      var mediaEvent = getMediaInfluencedEvent_(ctx);
      if (mediaEvent && mediaEvent.text) {
        pool.push(makeEntry(mediaEvent.text, mergeTags(["source:media"], calendarTags)));
      }
    }

    if (pool.length === 0) continue;

    // Pick entry
    var entry = pickOne(pool);
    var pick = entry.text;
    var tags = entry.tags.slice();

    // Optional flavor mutations (keep tags stable)
    if (tags.indexOf("relationship:rivalry") >= 0 && hasRivalry && chanceHit(0.3)) {
      pick += " [rivalry active]";
      tags = mergeTags(tags, ["rivalry:active"]);
    }
    // Check for arcType: prefix in tags
    var hasArcTypeTag = false;
    for (var ati = 0; ati < tags.length; ati++) {
      if (tags[ati].indexOf("arcType:") === 0) {
        hasArcTypeTag = true;
        break;
      }
    }
    if (hasArcTypeTag && activeArc) {
      pick += " [" + activeArc.type + " arc]";
    }

    var primaryTag = primaryFromTags(tags);
    var tagString = [primaryTag].concat(tags).join("|");

    var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    var existing = row[iLife] ? row[iLife].toString() : "";
    var line = stamp + " — [" + primaryTag + "] " + pick;

    row[iLife] = existing ? existing + "\n" + line : line;
    row[iLastU] = ctx.now;

    if (lifeLog) {
      logRows.push([
        ctx.now,
        row[iPopID],
        ((row[iFirst] + " " + row[iLast]).trim()),
        tagString,          // <-- richer tags without changing schema
        pick,
        neighborhood || "Engine",
        cycle
      ]);
    }

    rows[r] = row;

    activeSetObj[popId] = true;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    count++;
  }

  // Write back updated rows
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  // Batch append logs
  if (lifeLog && logRows.length) {
    var startRow = lifeLog.getLastRow() + 1;
    lifeLog.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);
  }

  // Persist active citizens
  S.cycleActiveCitizens = Object.keys(activeSetObj);
  ctx.summary = S;
}


/**
 * ============================================================================
 * CITIZENS EVENTS ENGINE REFERENCE v2.4 (tagged pool + determinism)
 * ============================================================================
 *
 * IMPROVEMENTS OVER PREVIOUS v2.4:
 * - Deterministic RNG via ctx.rng or ctx.config.rngSeed (reproducible sims)
 * - Batch logging (single API call vs N appendRow calls)
 * - Rich tags persisted to EventTag column as pipe-delimited string
 * - Set-based deduplication for active citizens
 * - Null-safe bond checks
 *
 * BACKWARD COMPATIBILITY:
 * - LifeHistory cell format unchanged: "[PrimaryTag] event text"
 * - EventTag column receives: "PrimaryTag|tagA|tagB|..."
 *
 * TARGET: Tier-3 and Tier-4 ENGINE citizens only
 * LIMIT: 10 events per cycle
 *
 * BASE CHANCE: 0.02
 *
 * CHANCE MODIFIERS:
 * - Weather impact ≥1.3: +0.01
 * - Negative sentiment: +0.01
 * - Chaos events: +0.015
 * - Winter/Summer: +0.005
 * - Economic extremes: +0.005
 * - Rivalry bond: +0.02
 * - Arc involvement: +0.01 to +0.04 (by phase)
 *
 * CALENDAR MODIFIERS:
 * - Major holiday: +0.02
 * - Oakland holiday: +0.02
 * - Cultural holiday: +0.015
 * - Minor holiday: +0.008
 * - First Friday: +0.015
 * - First Friday arts neighborhoods: +0.01 additional
 * - Creation Day: +0.01
 * - Championship: +0.015
 * - Playoffs: +0.01
 * - Cultural activity ≥1.4: +0.008
 * - Community engagement ≥1.3: +0.005
 *
 * CHANCE CAP: 0.18
 *
 * NEIGHBORHOODS (12 total):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 *
 * PRIMARY EVENT TAGS:
 * - Daily, Neighborhood, Alliance, Rivalry, Mentorship, Arc
 * - Media, Weather, Holiday, FirstFriday, CreationDay, Sports
 *
 * RICH TAG EXAMPLES:
 * - "Daily|source:daily|source:base|holiday:Thanksgiving"
 * - "Rivalry|relationship:rivalry|sportsSeason:playoffs"
 * - "FirstFriday|source:firstFriday|firstFriday"
 *
 * ============================================================================
 */
