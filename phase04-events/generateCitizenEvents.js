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
  const sheet = ctx.ss.getSheetByName("Simulation_Ledger");
  if (!sheet) return;

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  const header = values[0];
  const rows = values.slice(1);
  const idx = (n) => header.indexOf(n);

  const iTier = idx("Tier");
  const iClock = idx("ClockMode");
  const iLife = idx("LifeHistory");
  const iLastU = idx("LastUpdated");
  const iPopID = idx("POPID");
  const iFirst = idx("First");
  const iLast = idx("Last");
  const iNeighborhood = idx("Neighborhood");

  if (iTier < 0 || iClock < 0 || iLife < 0 || iLastU < 0 || iPopID < 0) return;

  const lifeLog = ctx.ss.getSheetByName("LifeHistory_Log");
  const S = ctx.summary || (ctx.summary = {});
  const cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  // Prefer injected RNG, else seed, else Math.random
  const rng = (typeof ctx.rng === "function")
    ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === "number")
      ? mulberry32_((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0))
      : Math.random;

  const roll = () => rng();
  const chanceHit = (p) => roll() < p;
  const pickOne = (arr) => arr[Math.floor(roll() * arr.length)];

  // =========================================================================
  // WORLD CONTEXT
  // =========================================================================
  const season = S.season;
  const weather = S.weather || { type: "clear", impact: 1 };
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };
  const econMood = S.economicMood || 50;

  // Calendar context (v2.4)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = !!S.isFirstFriday;
  const isCreationDay = !!S.isCreationDay;
  const sportsSeason = S.sportsSeason || "off-season";

  // Limit
  let count = 0;
  const LIMIT = 10;

  // Active citizens tracker (dedup)
  const activeSet = new Set(Array.isArray(S.cycleActiveCitizens) ? S.cycleActiveCitizens : []);
  S.cycleActiveCitizens = Array.from(activeSet);

  // =========================================================================
  // BUILD CITIZEN LOOKUP (unchanged)
  // =========================================================================
  if (!ctx.citizenLookup) {
    ctx.citizenLookup = {};
    const iUNI = idx("UNI (y/n)");
    const iMED = idx("MED (y/n)");
    const iCIV = idx("CIV (y/n)");
    const iTierRole = idx("TierRole");
    const iType = idx("Type");

    for (const row of rows) {
      const popId = row[iPopID];
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
  const makeEntry = (text, tags) => ({ text, tags: Array.isArray(tags) ? tags : [] });

  const mergeTags = (baseTags, extraTags) => {
    const seen = Object.create(null);
    const out = [];
    const add = (t) => { if (t && !seen[t]) { seen[t] = true; out.push(t); } };
    (baseTags || []).forEach(add);
    (extraTags || []).forEach(add);
    return out;
  };

  const calendarTags = (() => {
    const tags = [];
    if (holiday !== "none") tags.push(`holiday:${holiday}`);
    if (holidayPriority !== "none") tags.push(`holidayPriority:${holidayPriority}`);
    if (isFirstFriday) tags.push("firstFriday");
    if (isCreationDay) tags.push("creationDay");
    if (sportsSeason && sportsSeason !== "off-season") tags.push(`sportsSeason:${sportsSeason}`);
    return tags;
  })();

  // Primary tag selection (legacy buckets)
  const primaryFromTags = (tags) => {
    const has = (t) => tags.indexOf(t) >= 0;
    if (has("source:media")) return "Media";
    if (has("source:weather")) return "Weather";
    if (has("relationship:rivalry")) return "Rivalry";
    if (has("relationship:alliance")) return "Alliance";
    if (has("relationship:mentorship")) return "Mentorship";
    if (tags.some(t => t.indexOf("arc:") === 0)) return "Arc";
    if (has("source:neighborhood")) return "Neighborhood";
    if (has("source:firstFriday")) return "FirstFriday";
    if (has("source:creationDay")) return "CreationDay";
    if (has("source:holiday")) return "Holiday";
    if (has("source:sports")) return "Sports";
    return "Daily";
  };

  // =========================================================================
  // POOLS
  // =========================================================================
  const baseDaily = [
    "had a quiet moment at home",
    "completed a small personal task",
    "spent time unwinding in the evening",
    "checked in with a relative",
    "handled routine daily responsibilities",
    "took a moment of rest"
  ].map(t => makeEntry(t, ["source:daily"]));

  const seasonal = [];
  if (season === "Winter") seasonal.push(makeEntry("coped with the colder winter evening", ["source:season", "season:Winter"]));
  if (season === "Spring") seasonal.push(makeEntry("felt energy from seasonal change", ["source:season", "season:Spring"]));
  if (season === "Summer") seasonal.push(makeEntry("enjoyed warmth during the evening", ["source:season", "season:Summer"]));
  if (season === "Fall") seasonal.push(makeEntry("prepared for shorter fall days", ["source:season", "season:Fall"]));

  const weatherPool = [];
  if (weather.type === "rain") weatherPool.push(makeEntry("adjusted plans due to rain", ["source:weatherPool", "weather:rain"]));
  if (weather.type === "fog") weatherPool.push(makeEntry("moved cautiously due to fog", ["source:weatherPool", "weather:fog"]));
  if (weather.type === "hot") weatherPool.push(makeEntry("sought relief from heat", ["source:weatherPool", "weather:hot"]));
  if (weather.type === "cold") weatherPool.push(makeEntry("bundled up against the cold", ["source:weatherPool", "weather:cold"]));
  if (weather.type === "wind") weatherPool.push(makeEntry("noted windy evening conditions", ["source:weatherPool", "weather:wind"]));

  const chaosPool = (chaos.length > 0)
    ? [
        makeEntry("reflected briefly on today's city happenings", ["source:chaos"]),
        makeEntry("felt subtle shift in mood due to recent events", ["source:chaos"])
      ]
    : [];

  const sentimentPool = [];
  if (dynamics.sentiment >= 0.3) sentimentPool.push(makeEntry("felt uplifted by city mood", ["source:sentiment", "sentiment:positive"]));
  if (dynamics.sentiment <= -0.3) sentimentPool.push(makeEntry("felt unsettled by city tension", ["source:sentiment", "sentiment:negative"]));

  const econPool = [];
  if (econMood <= 35) econPool.push(makeEntry("felt economic uncertainty weighing on the day", ["source:economy", "econ:low"]));
  if (econMood >= 65) econPool.push(makeEntry("sensed optimism about local opportunities", ["source:economy", "econ:high"]));

  const alliancePool = [
    "coordinated briefly with an ally on shared interests",
    "received a supportive message from a trusted connection",
    "felt reassured by a recent alliance",
    "collaborated quietly with a close associate",
    "exchanged insights with a professional ally"
  ].map(t => makeEntry(t, ["relationship:alliance"]));

  const rivalryPool = [
    "felt a flicker of tension thinking about a competitor",
    "noticed subtle friction in professional circles",
    "sensed unspoken rivalry in a routine interaction",
    "felt the weight of ongoing competition",
    "overheard something that stirred old tensions"
  ].map(t => makeEntry(t, ["relationship:rivalry"]));

  const arcPool = [
    "felt the mounting pressure of unfolding events",
    "sensed their role in a larger story taking shape",
    "noticed how recent events seemed interconnected",
    "felt pulled deeper into an evolving situation"
  ].map(t => makeEntry(t, ["arc:generic"]));

  const mentorshipPool = [
    "reflected on guidance received from a mentor",
    "considered advice to share with someone newer",
    "felt the responsibility of being looked up to",
    "appreciated a learning moment from an experienced contact"
  ].map(t => makeEntry(t, ["relationship:mentorship"]));

  const neighborhoodPools = {
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

  const holidayPools = {
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

  const firstFridayPool = [
    "checked out First Friday galleries",
    "enjoyed the art walk atmosphere",
    "felt the creative energy of First Friday",
    "wandered through Uptown's open studios",
    "discovered new local artists",
    "soaked in the community arts scene"
  ].map(t => makeEntry(t, ["source:firstFriday"]));

  const creationDayPool = [
    "felt a sense of belonging in Oakland",
    "reflected on roots in the community",
    "appreciated the city's foundational spirit",
    "felt connected to Oakland's story"
  ].map(t => makeEntry(t, ["source:creationDay"]));

  const sportsSeasonPools = {
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
  const basePool = [
    ...baseDaily,
    ...seasonal,
    ...weatherPool,
    ...chaosPool,
    ...sentimentPool,
    ...econPool
  ].map(e => makeEntry(e.text, mergeTags(e.tags, ["source:base"])));

  // =========================================================================
  // MAIN CITIZEN LOOP
  // =========================================================================
  const logRows = [];
  for (let r = 0; r < rows.length; r++) {
    if (count >= LIMIT) break;

    const row = rows[r];
    const tier = Number(row[iTier] || 0);
    const mode = row[iClock] || "ENGINE";
    const popId = row[iPopID];
    const neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || "") : "";

    if (tier !== 3 && tier !== 4) continue;
    if (mode !== "ENGINE") continue;
    if (!popId) continue;

    // Base chance
    let chance = 0.02;

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
      const eventBoost = getCombinedEventBoost_(ctx, popId);
      chance *= eventBoost;
    }

    // Bonds
    let citizenBonds = [];
    let hasRivalry = false;
    let hasAlliance = false;
    let hasMentorship = false;

    if (typeof getCitizenBonds_ === "function") {
      citizenBonds = getCitizenBonds_(ctx, popId) || [];
      hasRivalry = citizenBonds.some(b => b && b.bondType === "rivalry");
      hasAlliance = citizenBonds.some(b => b && b.bondType === "alliance");
      hasMentorship = citizenBonds.some(b => b && b.bondType === "mentorship");
    }

    if (hasRivalry) chance += 0.02;

    // Arc involvement
    let activeArc = null;
    if (typeof citizenInActiveArc_ === "function") {
      activeArc = citizenInActiveArc_(ctx, popId);
      if (activeArc) {
        const arcPhaseBoost = {
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
      const weatherMod = getWeatherEventModifier_(ctx, "social");
      chance *= weatherMod;
    }

    // Media modifier
    if (typeof getMediaEventModifier_ === "function") {
      const mediaMod = getMediaEventModifier_(ctx, "social");
      chance *= mediaMod;
    }

    // Heat wave boost
    if (typeof hasWeatherCondition_ === "function" && hasWeatherCondition_(ctx, "heat_wave")) {
      chance += 0.01;
    }

    if (chance > 0.18) chance = 0.18;
    if (!chanceHit(chance)) continue;

    // Build contextual pool (tagged entries)
    let pool = basePool.map(e => makeEntry(e.text, mergeTags(e.tags, calendarTags)));

    // Neighborhood
    if (neighborhood && neighborhoodPools[neighborhood]) {
      const entries = neighborhoodPools[neighborhood].map(t =>
        makeEntry(t, mergeTags(["source:neighborhood", `neighborhood:${neighborhood}`], calendarTags))
      );
      pool = pool.concat(entries);
    }

    // Holiday
    if (holiday !== "none" && holidayPools[holiday]) {
      const entries = holidayPools[holiday].map(t =>
        makeEntry(t, mergeTags(["source:holiday", `holiday:${holiday}`], calendarTags))
      );
      pool = pool.concat(entries);
    }

    // First Friday
    if (isFirstFriday) {
      pool = pool.concat(firstFridayPool.map(e => makeEntry(e.text, mergeTags(e.tags, calendarTags))));
    }

    // Creation Day
    if (isCreationDay) {
      pool = pool.concat(creationDayPool.map(e => makeEntry(e.text, mergeTags(e.tags, calendarTags))));
    }

    // Sports season
    if (sportsSeason !== "off-season" && sportsSeasonPools[sportsSeason]) {
      const entries = sportsSeasonPools[sportsSeason].map(t =>
        makeEntry(t, mergeTags(["source:sports"], calendarTags))
      );
      pool = pool.concat(entries);
    }

    // Relationship-aware additions
    if (hasAlliance && chanceHit(0.4)) {
      pool = pool.concat(alliancePool.map(e => makeEntry(e.text, mergeTags(e.tags, calendarTags))));
    }
    if (hasRivalry && chanceHit(0.4)) {
      pool = pool.concat(rivalryPool.map(e => makeEntry(e.text, mergeTags(e.tags, calendarTags))));
    }
    if (hasMentorship && chanceHit(0.3)) {
      pool = pool.concat(mentorshipPool.map(e => makeEntry(e.text, mergeTags(e.tags, calendarTags))));
    }
    if (activeArc && chanceHit(0.5)) {
      const arcType = activeArc.type ? `arcType:${activeArc.type}` : null;
      const arcPhase = activeArc.phase ? `arcPhase:${activeArc.phase}` : null;
      pool = pool.concat(arcPool.map(e => makeEntry(
        e.text,
        mergeTags(mergeTags(e.tags, [arcType, arcPhase].filter(Boolean)), calendarTags)
      )));
    }

    // Weather event injection
    if (typeof getWeatherEvent_ === "function" && chanceHit(0.25)) {
      const weatherEvent = getWeatherEvent_(ctx, true);
      if (weatherEvent && weatherEvent.text) {
        pool.push(makeEntry(weatherEvent.text, mergeTags(["source:weather"], calendarTags)));
      }
    }

    // Heat wave special pools
    if (typeof hasWeatherCondition_ === "function" && hasWeatherCondition_(ctx, "heat_wave")) {
      if (S.weatherEventPools && Array.isArray(S.weatherEventPools.special)) {
        for (const t of S.weatherEventPools.special) {
          pool.push(makeEntry(t, mergeTags(["source:weather"], calendarTags)));
        }
      }
    }

    // Media-influenced injection
    if (typeof getMediaInfluencedEvent_ === "function" && chanceHit(0.2)) {
      const mediaEvent = getMediaInfluencedEvent_(ctx);
      if (mediaEvent && mediaEvent.text) {
        pool.push(makeEntry(mediaEvent.text, mergeTags(["source:media"], calendarTags)));
      }
    }

    if (pool.length === 0) continue;

    // Pick entry
    const entry = pickOne(pool);
    let pick = entry.text;
    let tags = entry.tags.slice();

    // Optional flavor mutations (keep tags stable)
    if (tags.indexOf("relationship:rivalry") >= 0 && hasRivalry && chanceHit(0.3)) {
      pick += " [rivalry active]";
      tags = mergeTags(tags, ["rivalry:active"]);
    }
    if (tags.some(t => t.indexOf("arcType:") === 0) && activeArc) {
      pick += ` [${activeArc.type} arc]`;
    }

    const primaryTag = primaryFromTags(tags);
    const tagString = [primaryTag].concat(tags).join("|");

    const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    const existing = row[iLife] ? row[iLife].toString() : "";
    const line = `${stamp} — [${primaryTag}] ${pick}`;

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

    activeSet.add(popId);
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    count++;
  }

  // Write back updated rows
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  // Batch append logs
  if (lifeLog && logRows.length) {
    const startRow = lifeLog.getLastRow() + 1;
    lifeLog.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);
  }

  // Persist active citizens
  S.cycleActiveCitizens = Array.from(activeSet);
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
