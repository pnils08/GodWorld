/**
 * ============================================================================
 * Citizens Events Engine v2.6 (QoL-aware + neighborhoodDynamics v2.6 integration)
 * ============================================================================
 *
 * Backward compatible:
 * - LifeHistory line remains: "[PrimaryTag] text"
 * - LifeHistory_Log "EventTag" column receives: "PrimaryTag|tagA|tagB|..."
 *
 * v2.6 Additive upgrades (NO schema breaks):
 * - crimeMetrics v1.2 integration: QoL-aware event pools
 * - neighborhoodDynamics v2.6 integration via getNeighborhoodDynamics_()
 * - Weather v3.5 full integration (precipitationIntensity, visibility, front types)
 * - Patrol strategy awareness in event flavor
 * - Crime-aware event pools for low-QoL neighborhoods
 *
 * v2.5 Features (retained):
 * - Tailors events using citizen attributes (age group, occupation, neighborhood, tier)
 * - Uses relationship graphs to pull named contacts + bond-context templates
 * - Adds lightweight memory/continuity (recent events + unresolved threads)
 * - Adds templated narrative slots with neighborhood venues/institutions
 * - Keeps sports generalized (season-stage only; no specific teams)
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

  // v2.5: Optional attributes (no schema requirement)
  var iBirthYear = idx("BirthYear");
  var iOccupation = idx("Occupation");
  var iTierRole = idx("TierRole");
  var iType = idx("Type");

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

  // v2.5: Sim year for age grouping (defaults to 2041 if not provided)
  var simYear = Number(S.simYear || S.simulationYear || 2041);

  // =========================================================================
  // v2.6: CRIME METRICS CONTEXT (from updateCrimeMetrics v1.2)
  // =========================================================================
  var crimeMetrics = S.crimeMetrics || {};
  var cityQoL = crimeMetrics.qualityOfLifeIndex || 0.5;
  var patrolStrategy = crimeMetrics.patrolStrategy || 'balanced';
  var enforcementCapacity = crimeMetrics.enforcementCapacity || 1.0;
  var crimeHotspots = crimeMetrics.hotspots || [];
  var neighborhoodCrime = crimeMetrics.neighborhoodBreakdown || {};

  // =========================================================================
  // v2.6: NEIGHBORHOOD DYNAMICS ACCESSOR (from applyCityDynamics v2.6)
  // =========================================================================
  function getNeighborhoodContext_(nh) {
    // Try accessor function first
    if (typeof getNeighborhoodDynamics_ === 'function') {
      return getNeighborhoodDynamics_(ctx, nh);
    }
    // Fallback to crimeMetrics neighborhood breakdown
    if (neighborhoodCrime[nh]) {
      return {
        qualityOfLifeIndex: neighborhoodCrime[nh].qualityOfLifeIndex || 0.5,
        sentiment: dynamics.sentiment || 0,
        crimeLevel: neighborhoodCrime[nh].crimeLevel || 'moderate'
      };
    }
    // Default
    return {
      qualityOfLifeIndex: cityQoL,
      sentiment: dynamics.sentiment || 0,
      crimeLevel: 'moderate'
    };
  }

  // =========================================================================
  // v2.6: WEATHER v3.5 FULL CONTEXT
  // =========================================================================
  var precipitationIntensity = weather.precipitationIntensity || 0;
  var visibility = weather.visibility || 1;
  var windSpeed = weather.windSpeed || 0;
  var frontType = weather.frontType || 'none';

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
  // v2.5: LIGHTWEIGHT MEMORY / CONTINUITY (no sheet schema)
  // =========================================================================
  if (!S.citizenEventMemory) {
    S.citizenEventMemory = {
      byPopId: {},
      maxRecent: 5,
      lastCycle: cycle
    };
  }
  var MEM = S.citizenEventMemory;

  function getMem(popId) {
    if (!MEM.byPopId[popId]) {
      MEM.byPopId[popId] = {
        recentTexts: [],
        recentPrimary: [],
        unresolved: {},
        lastVenue: "",
        lastNeighborhood: "",
        lastContact: "",
        lastTags: []
      };
    }
    return MEM.byPopId[popId];
  }

  function remember(popId, primaryTag, renderedText, venue, neighborhood, contactName, tags) {
    var m = getMem(popId);
    m.recentTexts.push(normText_(renderedText));
    if (m.recentTexts.length > MEM.maxRecent) m.recentTexts.shift();

    m.recentPrimary.push(primaryTag);
    if (m.recentPrimary.length > MEM.maxRecent) m.recentPrimary.shift();

    m.lastVenue = venue || m.lastVenue;
    m.lastNeighborhood = neighborhood || m.lastNeighborhood;
    m.lastContact = contactName || m.lastContact;
    m.lastTags = tags || m.lastTags;

    if (tags && tags.indexOf("relationship:rivalry") >= 0) m.unresolved.rivalry = true;
    if (tags && tags.indexOf("relationship:alliance") >= 0) m.unresolved.alliance = true;

    var hasArc = false;
    for (var i = 0; tags && i < tags.length; i++) {
      if (tags[i].indexOf("arc:") === 0 || tags[i].indexOf("arcType:") === 0) { hasArc = true; break; }
    }
    if (hasArc) m.unresolved.arc = true;

    if (chanceHit(0.25)) m.unresolved.rivalry = false;
    if (chanceHit(0.25)) m.unresolved.alliance = false;
    if (chanceHit(0.20)) m.unresolved.arc = false;
  }

  // =========================================================================
  // BUILD CITIZEN LOOKUP (extended, backward safe)
  // =========================================================================
  if (!ctx.citizenLookup) {
    ctx.citizenLookup = {};
    var iUNI = idx("UNI (y/n)");
    var iMED = idx("MED (y/n)");
    var iCIV = idx("CIV (y/n)");

    for (var ri = 0; ri < rows.length; ri++) {
      var rowL = rows[ri];
      var popIdL = rowL[iPopID];
      if (!popIdL) continue;

      ctx.citizenLookup[popIdL] = {
        UNI: iUNI >= 0 ? (rowL[iUNI] || "n") : "n",
        MED: iMED >= 0 ? (rowL[iMED] || "n") : "n",
        CIV: iCIV >= 0 ? (rowL[iCIV] || "n") : "n",
        TierRole: iTierRole >= 0 ? (rowL[iTierRole] || "") : "",
        Type: iType >= 0 ? (rowL[iType] || "") : "",
        Tier: Number(rowL[iTier]) || 0,
        Neighborhood: iNeighborhood >= 0 ? (rowL[iNeighborhood] || "") : "",
        First: iFirst >= 0 ? (rowL[iFirst] || "") : "",
        Last: iLast >= 0 ? (rowL[iLast] || "") : "",
        Occupation: iOccupation >= 0 ? (rowL[iOccupation] || "") : "",
        BirthYear: iBirthYear >= 0 ? Number(rowL[iBirthYear] || 0) : 0
      };
    }
  }

  function citizenName_(popId) {
    var c = ctx.citizenLookup && ctx.citizenLookup[popId];
    if (!c) return "";
    return ((c.First || "") + " " + (c.Last || "")).trim();
  }

  function ageGroup_(birthYear) {
    var by = Number(birthYear || 0);
    if (!by || by < 1900) return "adult";
    var age = simYear - by;
    if (age <= 22) return "youth";
    if (age <= 35) return "youngAdult";
    if (age <= 64) return "adult";
    return "senior";
  }

  // =========================================================================
  // TAGGED POOL HELPERS
  // =========================================================================
  function makeEntry(text, tags, weight, template) {
    return {
      text: text,
      tags: Array.isArray(tags) ? tags : [],
      weight: (weight === 0 || weight) ? Number(weight) : 1,
      template: !!template
    };
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

  function primaryFromTags(tags) {
    function has(t) { return tags.indexOf(t) >= 0; }
    if (has("source:qol")) return "QoL";
    if (has("source:media")) return "Media";
    if (has("source:weather")) return "Weather";
    if (has("relationship:rivalry")) return "Rivalry";
    if (has("relationship:alliance")) return "Alliance";
    if (has("relationship:mentorship")) return "Mentorship";
    for (var ti = 0; ti < tags.length; ti++) {
      if (tags[ti].indexOf("arc:") === 0) return "Arc";
      if (tags[ti].indexOf("arcType:") === 0) return "Arc";
    }
    if (has("source:neighborhood")) return "Neighborhood";
    if (has("source:firstFriday")) return "FirstFriday";
    if (has("source:creationDay")) return "CreationDay";
    if (has("source:holiday")) return "Holiday";
    if (has("source:sports")) return "Sports";
    if (has("source:occupation")) return "Work";
    if (has("source:continuity")) return "Continuity";
    return "Daily";
  }

  function normText_(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function pickWeighted_(arr) {
    var total = 0;
    for (var i = 0; i < arr.length; i++) total += Math.max(0.001, Number(arr[i].weight || 1));
    var r = roll() * total;
    var acc = 0;
    for (var j = 0; j < arr.length; j++) {
      acc += Math.max(0.001, Number(arr[j].weight || 1));
      if (r <= acc) return arr[j];
    }
    return arr[arr.length - 1];
  }

  // =========================================================================
  // v2.5: LOCAL ENTITIES / VENUES
  // =========================================================================
  var defaultEntities = {
    neighborhoods: {
      "Temescal": { venues: ["a Temescal cafe", "Temescal Alley", "a small gallery"], institutions: ["a community board", "a neighborhood association"] },
      "Downtown": { venues: ["City Hall steps", "a busy plaza", "a late-night diner"], institutions: ["a civic office", "a public service desk"] },
      "Fruitvale": { venues: ["Fruitvale BART area", "a taqueria patio", "a corner market"], institutions: ["a community clinic", "a cultural center"] },
      "Lake Merritt": { venues: ["the lakeside path", "the pergola", "a bench near the water"], institutions: ["a volunteer meetup", "a public program"] },
      "West Oakland": { venues: ["an old warehouse corridor", "a porch-lit block", "a local pop-up"], institutions: ["a mutual aid table", "a community workshop"] },
      "Laurel": { venues: ["a quiet main street", "a neighborhood bakery", "a small park"], institutions: ["a school fundraiser", "a local council meeting"] },
      "Rockridge": { venues: ["College Avenue", "a bookstore corner", "a coffee line"], institutions: ["a PTA meeting", "a small business association"] },
      "Jack London": { venues: ["the waterfront", "a ferry-adjacent corner", "a patio by the estuary"], institutions: ["a port office", "a transit desk"] },
      "Uptown": { venues: ["Fox Theater frontage", "a gallery opening", "a street mural"], institutions: ["an arts nonprofit", "a venue coordinator"] },
      "KONO": { venues: ["a mural-lined block", "a pop-up studio", "a DIY show space"], institutions: ["an artist collective", "a community studio"] },
      "Chinatown": { venues: ["a lantern-lit storefront", "a small bakery line", "a herb shop"], institutions: ["a merchant association", "a family business network"] },
      "Piedmont Ave": { venues: ["a boutique corner", "a tree-lined cafe", "a calm sidewalk stretch"], institutions: ["a neighborhood meetup", "a local volunteer circle"] }
    },
    occupation: {
      "Barista": ["a rush-hour counter", "a coffee order gone sideways", "a regular with a strange request"],
      "Server": ["a table with unusual energy", "a late reservation that changed the shift", "a customer who tipped in a story"],
      "Cook": ["a new prep routine", "a recipe tweak that actually worked", "a supply hiccup that forced improvisation"],
      "Bartender": ["a quiet confession at the bar", "a sudden crowd change", "a regular starting trouble—softly"],
      "Retail clerk": ["a return that turned into a conversation", "a shoplifter scare that wasn't", "a display that drew attention"],
      "Driver": ["a reroute that revealed something odd", "a passenger who overshared", "a near-miss that reset the night"],
      "Warehouse worker": ["a shift rumor that felt too accurate", "a mislabeled pallet mystery", "a safety drill that got real"],
      "Mechanic": ["a car problem that hinted at a bigger issue", "a customer who didn't tell the whole story", "a fix that bought someone time"],
      "Teacher": ["a student comment that lingered", "a meeting that shifted priorities", "a classroom moment that felt important"],
      "Nurse": ["a hectic hour that tested patience", "a small kindness that mattered", "a tense wait that ended quietly"],
      "Security guard": ["a suspicious loop that went nowhere", "a calm de-escalation", "a pattern they can't unsee"],
      "Janitor": ["an overheard conversation", "a found object with a story", "a hallway that felt different tonight"]
    }
  };

  var entities = (S.localEntities && typeof S.localEntities === "object")
    ? S.localEntities
    : defaultEntities;

  function pickVenue_(neighborhood) {
    var nh = entities.neighborhoods && entities.neighborhoods[neighborhood];
    var list = nh && nh.venues;
    if (!list || !list.length) return "";
    return list[Math.floor(roll() * list.length)];
  }

  function pickInstitution_(neighborhood) {
    var nh = entities.neighborhoods && entities.neighborhoods[neighborhood];
    var list = nh && nh.institutions;
    if (!list || !list.length) return "";
    return list[Math.floor(roll() * list.length)];
  }

  function pickOccFlavor_(occupation) {
    var list = entities.occupation && entities.occupation[occupation];
    if (!list || !list.length) return "";
    return list[Math.floor(roll() * list.length)];
  }

  function renderTemplate_(tpl, slots) {
    var out = tpl;
    for (var k in slots) {
      if (!slots.hasOwnProperty(k)) continue;
      out = out.split("$" + k).join(slots[k]);
    }
    out = out.replace(/\s+/g, " ").trim();
    return out;
  }

  // =========================================================================
  // v2.6: QOL-AWARE EVENT POOLS
  // =========================================================================
  function qolPoolFor_(nhContext) {
    var qol = nhContext.qualityOfLifeIndex || 0.5;
    var pool = [];

    if (qol <= 0.35) {
      // Low QoL — negative civic texture
      pool.push(makeEntry("noticed increased patrols on the block", ["source:qol", "qol:low"], 1.2, false));
      pool.push(makeEntry("felt the neighborhood tension in small interactions", ["source:qol", "qol:low"], 1.15, false));
      pool.push(makeEntry("avoided a block with reported issues", ["source:qol", "qol:low"], 1.1, false));
      pool.push(makeEntry("overheard neighbors discussing recent disturbances", ["source:qol", "qol:low"], 1.1, false));
      pool.push(makeEntry("noticed more people keeping to themselves lately", ["source:qol", "qol:low"], 1.05, false));
    } else if (qol <= 0.45) {
      // Moderate-low QoL
      pool.push(makeEntry("noticed minor disorder that went unaddressed", ["source:qol", "qol:moderate-low"], 1.05, false));
      pool.push(makeEntry("felt a subtle edge to the neighborhood vibe", ["source:qol", "qol:moderate-low"], 1.0, false));
    } else if (qol >= 0.75) {
      // High QoL — positive civic texture
      pool.push(makeEntry("appreciated the neighborhood's calm evening atmosphere", ["source:qol", "qol:high"], 1.1, false));
      pool.push(makeEntry("noticed neighbors looking out for each other", ["source:qol", "qol:high"], 1.1, false));
      pool.push(makeEntry("felt safe walking the block after dark", ["source:qol", "qol:high"], 1.05, false));
    } else if (qol >= 0.65) {
      // Moderate-high QoL
      pool.push(makeEntry("noticed small improvements in the neighborhood", ["source:qol", "qol:moderate-high"], 1.0, false));
    }

    return pool;
  }

  // v2.6: Patrol strategy flavor
  function patrolPoolFor_(strategy, isHotspot) {
    var pool = [];
    if (strategy === 'suppress_hotspots' && isHotspot) {
      pool.push(makeEntry("noticed concentrated police presence on the block", ["source:qol", "patrol:suppress"], 1.1, false));
      pool.push(makeEntry("felt watched but not necessarily safer", ["source:qol", "patrol:suppress"], 1.05, false));
    } else if (strategy === 'community_presence') {
      pool.push(makeEntry("saw officers on foot patrol, nodding at neighbors", ["source:qol", "patrol:community"], 1.0, false));
      pool.push(makeEntry("noticed community-oriented policing efforts", ["source:qol", "patrol:community"], 0.95, false));
    }
    return pool;
  }

  // =========================================================================
  // v2.6: WEATHER v3.5 ENHANCED POOLS
  // =========================================================================
  function weatherV35Pool_() {
    var pool = [];

    // Precipitation intensity
    if (precipitationIntensity >= 0.7) {
      pool.push(makeEntry("got caught in heavy rain and had to take shelter", ["source:weather", "weather:heavy-rain"], 1.2, false));
      pool.push(makeEntry("watched the downpour from a doorway, waiting it out", ["source:weather", "weather:heavy-rain"], 1.1, false));
    } else if (precipitationIntensity >= 0.3) {
      pool.push(makeEntry("walked through drizzle, unbothered", ["source:weather", "weather:drizzle"], 1.0, false));
    }

    // Visibility
    if (visibility <= 0.3) {
      pool.push(makeEntry("navigated carefully through thick fog", ["source:weather", "weather:low-visibility"], 1.15, false));
      pool.push(makeEntry("felt the fog muffle the city's usual sounds", ["source:weather", "weather:fog"], 1.1, false));
    }

    // Wind
    if (windSpeed >= 25) {
      pool.push(makeEntry("braced against strong gusts on the walk home", ["source:weather", "weather:wind"], 1.1, false));
    }

    // Front types
    if (frontType === 'cold_front') {
      pool.push(makeEntry("felt the sudden temperature drop as the front moved in", ["source:weather", "weather:cold-front"], 1.1, false));
    } else if (frontType === 'warm_front') {
      pool.push(makeEntry("noticed the air turn humid as weather shifted", ["source:weather", "weather:warm-front"], 1.0, false));
    } else if (frontType === 'atmospheric_river') {
      pool.push(makeEntry("hunkered down as the atmospheric river arrived", ["source:weather", "weather:atmospheric-river"], 1.25, false));
    }

    return pool;
  }

  // =========================================================================
  // BASE POOLS
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
    baseDaily.push(makeEntry(baseDailyTexts[bdi], ["source:daily"], 1, false));
  }

  var seasonal = [];
  if (season === "Winter") seasonal.push(makeEntry("coped with the colder winter evening", ["source:season", "season:Winter"], 1, false));
  if (season === "Spring") seasonal.push(makeEntry("felt energy from seasonal change", ["source:season", "season:Spring"], 1, false));
  if (season === "Summer") seasonal.push(makeEntry("enjoyed warmth during the evening", ["source:season", "season:Summer"], 1, false));
  if (season === "Fall") seasonal.push(makeEntry("prepared for shorter fall days", ["source:season", "season:Fall"], 1, false));

  var weatherPool = [];
  if (weather.type === "rain") weatherPool.push(makeEntry("adjusted plans due to rain", ["source:weatherPool", "weather:rain"], 1, false));
  if (weather.type === "fog") weatherPool.push(makeEntry("moved cautiously due to fog", ["source:weatherPool", "weather:fog"], 1, false));
  if (weather.type === "hot") weatherPool.push(makeEntry("sought relief from heat", ["source:weatherPool", "weather:hot"], 1, false));
  if (weather.type === "cold") weatherPool.push(makeEntry("bundled up against the cold", ["source:weatherPool", "weather:cold"], 1, false));
  if (weather.type === "wind") weatherPool.push(makeEntry("noted windy evening conditions", ["source:weatherPool", "weather:wind"], 1, false));

  var chaosPool = (chaos.length > 0)
    ? [
        makeEntry("reflected briefly on today's city happenings", ["source:chaos"], 1, false),
        makeEntry("felt a subtle shift in the city's tone", ["source:chaos"], 1, false)
      ]
    : [];

  var sentimentPool = [];
  if (dynamics.sentiment >= 0.3) sentimentPool.push(makeEntry("felt uplifted by the city mood", ["source:sentiment", "sentiment:positive"], 1, false));
  if (dynamics.sentiment <= -0.3) sentimentPool.push(makeEntry("felt unsettled by a low hum of tension", ["source:sentiment", "sentiment:negative"], 1, false));

  var econPool = [];
  if (econMood <= 35) econPool.push(makeEntry("noticed money stress showing up in small ways", ["source:economy", "econ:low"], 1, false));
  if (econMood >= 65) econPool.push(makeEntry("sensed optimism about local opportunities", ["source:economy", "econ:high"], 1, false));

  var templatePool = [
    makeEntry("crossed paths with $CONTACT at $VENUE and left with a new question", ["source:neighborhood", "source:template"], 1.2, true),
    makeEntry("overheard something at $VENUE that didn't feel accidental", ["source:neighborhood", "source:template"], 1.15, true),
    makeEntry("stopped by $INSTITUTION and realized the situation is shifting", ["source:neighborhood", "source:template"], 1.1, true),
    makeEntry("made a small choice at $VENUE that might echo later", ["source:template"], 1.05, true),
    makeEntry("noticed a familiar face in an unfamiliar mood at $VENUE", ["source:template"], 1.05, true)
  ];

  var allianceTexts = [
    "coordinated briefly with an ally on shared interests",
    "received a supportive message from a trusted connection",
    "felt reassured by a recent alliance",
    "collaborated quietly with a close associate",
    "exchanged insights with a professional ally"
  ];
  var alliancePool = [];
  for (var ali = 0; ali < allianceTexts.length; ali++) {
    alliancePool.push(makeEntry(allianceTexts[ali], ["relationship:alliance"], 1, false));
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
    rivalryPool.push(makeEntry(rivalryTexts[rvi], ["relationship:rivalry"], 1, false));
  }

  var arcTexts = [
    "felt the mounting pressure of unfolding events",
    "sensed their role in a larger story taking shape",
    "noticed how recent events seemed interconnected",
    "felt pulled deeper into an evolving situation"
  ];
  var arcPool = [];
  for (var ari = 0; ari < arcTexts.length; ari++) {
    arcPool.push(makeEntry(arcTexts[ari], ["arc:generic"], 1, false));
  }

  var mentorshipTexts = [
    "reflected on guidance received from a mentor",
    "considered advice to share with someone newer",
    "felt the responsibility of being looked up to",
    "appreciated a learning moment from an experienced contact"
  ];
  var mentorshipPool = [];
  for (var mti = 0; mti < mentorshipTexts.length; mti++) {
    mentorshipPool.push(makeEntry(mentorshipTexts[mti], ["relationship:mentorship"], 1, false));
  }

  function occupationPoolFor_(occupation) {
    var flavor = pickOccFlavor_(occupation);
    if (!flavor) return [];
    return [
      makeEntry("had a work moment: " + flavor, ["source:occupation", "occupation:" + occupation], 1.15, false),
      makeEntry("left work thinking about " + flavor, ["source:occupation", "occupation:" + occupation], 1.05, false)
    ];
  }

  function agePoolFor_(ageGroup) {
    if (ageGroup === "youth") {
      return [
        makeEntry("connected with friends over something small but intense", ["source:age", "ageGroup:youth"], 1.05, false),
        makeEntry("felt the pressure of being watched—even when no one was watching", ["source:age", "ageGroup:youth"], 1.0, false)
      ];
    }
    if (ageGroup === "youngAdult") {
      return [
        makeEntry("juggled plans that didn't quite fit together", ["source:age", "ageGroup:youngAdult"], 1.05, false),
        makeEntry("felt the city's pace pulling them forward", ["source:age", "ageGroup:youngAdult"], 1.0, false)
      ];
    }
    if (ageGroup === "senior") {
      return [
        makeEntry("noticed patterns repeating—and chose not to comment", ["source:age", "ageGroup:senior"], 1.05, false),
        makeEntry("shared a small piece of history with someone who needed it", ["source:age", "ageGroup:senior"], 1.0, false)
      ];
    }
    return [
      makeEntry("handled responsibilities that didn't make the news", ["source:age", "ageGroup:adult"], 1.0, false),
      makeEntry("felt a quiet tradeoff settle into place", ["source:age", "ageGroup:adult"], 1.0, false)
    ];
  }

  var neighborhoodPools = {
    "Temescal": ["grabbed coffee at a Temescal cafe", "noticed the neighborhood's creative energy", "browsed the Temescal Alley shops"],
    "Downtown": ["navigated Downtown's busy streets", "felt the pulse of the city center", "passed by City Hall on routine business"],
    "Fruitvale": ["enjoyed the Fruitvale community vibe", "stopped by a familiar Fruitvale spot", "appreciated the neighborhood's cultural richness"],
    "Lake Merritt": ["took a moment by the lake", "enjoyed Lake Merritt's evening calm", "watched joggers circle the lake"],
    "West Oakland": ["noticed West Oakland's changing landscape", "felt the neighborhood's industrial rhythm", "passed by historic Victorian homes"],
    "Laurel": ["appreciated Laurel's quiet streets", "enjoyed the residential calm", "stopped by Laurel's small shops"],
    "Rockridge": ["browsed Rockridge's shops briefly", "walked under Rockridge's tree canopy", "grabbed something from College Avenue"],
    "Jack London": ["felt Jack London's waterfront energy", "noticed activity near the estuary", "enjoyed the district's evening atmosphere"],
    "Uptown": ["walked through Uptown's gallery district", "noticed the neighborhood's artistic energy", "passed by the Fox Theater"],
    "KONO": ["explored KONO's creative spaces", "noticed murals along the corridor", "felt the neighborhood's DIY spirit"],
    "Chinatown": ["stopped by Chinatown for familiar flavors", "appreciated the neighborhood's bustling energy", "noticed the blend of old and new storefronts"],
    "Piedmont Ave": ["strolled along Piedmont Avenue", "enjoyed the neighborhood's boutique charm", "appreciated the leafy residential streets"]
  };

  var holidayPools = {
    Thanksgiving: ["prepared for a holiday gathering", "reflected on things to be grateful for", "helped with meal preparations"],
    Holiday: ["felt the holiday spirit in the air", "wrapped up last-minute seasonal tasks", "enjoyed decorations around town"],
    NewYear: ["reflected on the year past", "thought about resolutions ahead", "felt the fresh-start energy of January"],
    NewYearsEve: ["made plans for the evening countdown", "felt anticipation for the new year", "prepared for celebration"],
    Independence: ["noticed festive decorations around town", "made plans for nighttime viewing", "enjoyed the holiday atmosphere"],
    MLKDay: ["reflected on legacy and justice", "thought about community and action", "felt the weight of history"],
    Juneteenth: ["celebrated freedom and heritage", "connected with community history", "felt pride in cultural roots"],
    CincoDeMayo: ["enjoyed a festive atmosphere", "celebrated cultural heritage", "noticed colorful decorations"],
    DiaDeMuertos: ["honored ancestors in quiet reflection", "noticed beautiful altars around town", "felt connection to those passed"],
    LunarNewYear: ["enjoyed new year festivities", "noticed red decorations around Chinatown", "felt the celebratory energy"],
    OpeningDay: ["felt the excitement of a season opener", "noticed fans and rituals returning", "made plans to follow the opener"],
    OaklandPride: ["celebrated community pride", "noticed rainbow flags around town", "felt the city's inclusive spirit"],
    Valentine: ["noticed Valentine's displays around town", "thought about loved ones", "felt the romantic atmosphere"],
    Halloween: ["noticed spooky decorations around town", "saw costumes appearing early", "felt the playful autumn spirit"],
    Easter: ["noticed spring celebrations around town", "enjoyed the seasonal atmosphere", "saw families gathering"],
    StPatricksDay: ["noticed green everywhere", "felt the festive spirit", "saw celebrations starting early"],
    MothersDay: ["thought about family connections", "noticed families gathering", "felt grateful for maternal figures"],
    FathersDay: ["thought about family bonds", "noticed families celebrating", "felt grateful for paternal figures"],
    MemorialDay: ["reflected on those who served", "enjoyed the long weekend atmosphere", "noticed flags around town"],
    LaborDay: ["appreciated workers and labor", "enjoyed the last summer holiday", "felt the end-of-summer mood"],
    VeteransDay: ["honored veterans in thought", "noticed memorial observances", "reflected on service and sacrifice"]
  };

  var firstFridayTexts = ["checked out First Friday galleries", "enjoyed the art walk atmosphere", "felt the creative energy of First Friday", "wandered through open studios", "discovered new local artists", "soaked in the community arts scene"];
  var firstFridayPool = [];
  for (var ffi = 0; ffi < firstFridayTexts.length; ffi++) {
    firstFridayPool.push(makeEntry(firstFridayTexts[ffi], ["source:firstFriday"], 1.2, false));
  }

  var creationDayTexts = ["felt a sense of belonging in Oakland", "reflected on roots in the community", "appreciated the city's foundational spirit", "felt connected to Oakland's story"];
  var creationDayPool = [];
  for (var cdi = 0; cdi < creationDayTexts.length; cdi++) {
    creationDayPool.push(makeEntry(creationDayTexts[cdi], ["source:creationDay"], 1.1, false));
  }

  var sportsSeasonPools = {
    championship: ["felt championship energy in the air", "followed the late-stage run closely", "sensed the city's sports excitement"],
    playoffs: ["followed postseason updates closely", "felt the tense momentum of elimination games", "hoped for a deep run"],
    "post-season": ["followed postseason updates closely", "felt the tense momentum of elimination games", "hoped for a deep run"],
    "late-season": ["watched the late-season race unfold", "felt the late-season intensity", "followed standings closely"]
  };

  var basePoolRaw = baseDaily.concat(seasonal, weatherPool, chaosPool, sentimentPool, econPool);
  var basePool = [];
  for (var bpi = 0; bpi < basePoolRaw.length; bpi++) {
    var ee = basePoolRaw[bpi];
    basePool.push(makeEntry(ee.text, mergeTags(ee.tags, ["source:base"]), ee.weight, ee.template));
  }

  function pickContactFromBonds_(bonds) {
    if (!bonds || !bonds.length) return { name: "someone familiar", popId: "" };
    var tries = 0;
    while (tries < 6) {
      var b = bonds[Math.floor(roll() * bonds.length)];
      if (b && b.otherPopId) {
        var nm = citizenName_(b.otherPopId) || "a familiar face";
        return { name: nm, popId: b.otherPopId };
      }
      tries++;
    }
    return { name: "someone familiar", popId: "" };
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

    var birthYear = (iBirthYear >= 0) ? Number(row[iBirthYear] || 0) : 0;
    var occupation = (iOccupation >= 0) ? String(row[iOccupation] || "") : "";
    var ageGroup = ageGroup_(birthYear);

    if (tier !== 3 && tier !== 4) continue;
    if (mode !== "ENGINE") continue;
    if (!popId) continue;

    var mem = getMem(popId);

    // v2.6: Get neighborhood-level context
    var nhContext = getNeighborhoodContext_(neighborhood);
    var nhQoL = nhContext.qualityOfLifeIndex || 0.5;
    var isHotspot = crimeHotspots.indexOf(neighborhood) >= 0;

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

    // v2.6: QoL-driven chance modifiers
    if (nhQoL <= 0.35) chance += 0.012; // More events in low-QoL areas (stress, tension)
    if (isHotspot) chance += 0.008; // Hotspots generate more citizen reactions
    if (enforcementCapacity < 0.6) chance += 0.005; // Stretched enforcement = more noticeable events

    // Age/occupation modifiers
    if (ageGroup === "youth" || ageGroup === "youngAdult") {
      if (dynamics.nightlife && dynamics.nightlife >= 1.2) chance += 0.004;
      if (isFirstFriday) chance += 0.003;
    }
    if (ageGroup === "senior" && dynamics.communityEngagement >= 1.2) chance += 0.003;
    if (occupation && (occupation.toLowerCase().indexOf("driver") >= 0 || occupation.toLowerCase().indexOf("security") >= 0)) {
      if (weather.impact >= 1.3) chance += 0.003;
    }

    if (typeof getCombinedEventBoost_ === "function") {
      var eventBoost = getCombinedEventBoost_(ctx, popId);
      chance *= eventBoost;
    }

    var citizenBonds = [];
    var hasRivalry = false;
    var hasAlliance = false;
    var hasMentorship = false;

    if (typeof getCitizenBonds_ === "function") {
      citizenBonds = getCitizenBonds_(ctx, popId) || [];
      for (var bi = 0; bi < citizenBonds.length; bi++) {
        var bb = citizenBonds[bi];
        if (bb && bb.bondType === "rivalry") hasRivalry = true;
        if (bb && bb.bondType === "alliance") hasAlliance = true;
        if (bb && bb.bondType === "mentorship") hasMentorship = true;
      }
    }

    if (hasRivalry) chance += 0.02;

    var activeArc = null;
    if (typeof citizenInActiveArc_ === "function") {
      activeArc = citizenInActiveArc_(ctx, popId);
      if (activeArc) {
        var arcPhaseBoost = { early: 0.01, rising: 0.015, mid: 0.02, peak: 0.04, decline: 0.015, falling: 0.01 };
        chance += arcPhaseBoost[activeArc.phase] || 0.01;
      }
    }

    if (typeof getWeatherEventModifier_ === "function") {
      var weatherMod = getWeatherEventModifier_(ctx, "social");
      chance *= weatherMod;
    }

    if (typeof getMediaEventModifier_ === "function") {
      var mediaMod = getMediaEventModifier_(ctx, "social");
      chance *= mediaMod;
    }

    if (typeof hasWeatherCondition_ === "function" && hasWeatherCondition_(ctx, "heat_wave")) {
      chance += 0.01;
    }

    if (chance > 0.18) chance = 0.18;
    if (!chanceHit(chance)) continue;

    // Build contextual pool
    var pool = [];

    for (var pbi = 0; pbi < basePool.length; pbi++) {
      var bpEntry = basePool[pbi];
      pool.push(makeEntry(bpEntry.text, mergeTags(bpEntry.tags, calendarTags), bpEntry.weight, bpEntry.template));
    }

    // v2.6: Add QoL-aware events
    var qolPool = qolPoolFor_(nhContext);
    for (var qi = 0; qi < qolPool.length; qi++) {
      pool.push(makeEntry(qolPool[qi].text, mergeTags(qolPool[qi].tags, calendarTags), qolPool[qi].weight, false));
    }

    // v2.6: Add patrol strategy events
    var patrolPool = patrolPoolFor_(patrolStrategy, isHotspot);
    for (var pi = 0; pi < patrolPool.length; pi++) {
      pool.push(makeEntry(patrolPool[pi].text, mergeTags(patrolPool[pi].tags, calendarTags), patrolPool[pi].weight, false));
    }

    // v2.6: Add weather v3.5 events
    var wv35 = weatherV35Pool_();
    for (var wi = 0; wi < wv35.length; wi++) {
      pool.push(makeEntry(wv35[wi].text, mergeTags(wv35[wi].tags, calendarTags), wv35[wi].weight, false));
    }

    // Neighborhood
    if (neighborhood && neighborhoodPools[neighborhood]) {
      var nTexts = neighborhoodPools[neighborhood];
      for (var ni = 0; ni < nTexts.length; ni++) {
        pool.push(makeEntry(nTexts[ni], mergeTags(["source:neighborhood", "neighborhood:" + neighborhood], calendarTags), 1.1, false));
      }

      for (var tpi = 0; tpi < templatePool.length; tpi++) {
        pool.push(makeEntry(templatePool[tpi].text, mergeTags(templatePool[tpi].tags, ["neighborhood:" + neighborhood]), templatePool[tpi].weight, true));
      }
    }

    // Holiday
    if (holiday !== "none" && holidayPools[holiday]) {
      var hTexts = holidayPools[holiday];
      for (var hi = 0; hi < hTexts.length; hi++) {
        pool.push(makeEntry(hTexts[hi], mergeTags(["source:holiday", "holiday:" + holiday], calendarTags), 1.1, false));
      }
    }

    if (isFirstFriday) {
      for (var ffi2 = 0; ffi2 < firstFridayPool.length; ffi2++) {
        var ffEntry = firstFridayPool[ffi2];
        pool.push(makeEntry(ffEntry.text, mergeTags(ffEntry.tags, calendarTags), ffEntry.weight, false));
      }
    }

    if (isCreationDay) {
      for (var cdi2 = 0; cdi2 < creationDayPool.length; cdi2++) {
        var cdEntry = creationDayPool[cdi2];
        pool.push(makeEntry(cdEntry.text, mergeTags(cdEntry.tags, calendarTags), cdEntry.weight, false));
      }
    }

    if (sportsSeason !== "off-season" && sportsSeasonPools[sportsSeason]) {
      var sTexts = sportsSeasonPools[sportsSeason];
      for (var si = 0; si < sTexts.length; si++) {
        pool.push(makeEntry(sTexts[si], mergeTags(["source:sports"], calendarTags), 1.05, false));
      }
    }

    if (occupation) {
      var op = occupationPoolFor_(occupation);
      for (var opi = 0; opi < op.length; opi++) {
        pool.push(makeEntry(op[opi].text, mergeTags(op[opi].tags, calendarTags), op[opi].weight, false));
      }
    }
    var agp = agePoolFor_(ageGroup);
    for (var agi = 0; agi < agp.length; agi++) {
      pool.push(makeEntry(agp[agi].text, mergeTags(agp[agi].tags, calendarTags), agp[agi].weight, false));
    }

    if (hasAlliance && chanceHit(0.4)) {
      for (var ali2 = 0; ali2 < alliancePool.length; ali2++) {
        var alEntry = alliancePool[ali2];
        pool.push(makeEntry(alEntry.text, mergeTags(alEntry.tags, calendarTags), 1.1, false));
      }
    }
    if (hasRivalry && chanceHit(0.4)) {
      for (var rvi2 = 0; rvi2 < rivalryPool.length; rvi2++) {
        var rvEntry = rivalryPool[rvi2];
        pool.push(makeEntry(rvEntry.text, mergeTags(rvEntry.tags, calendarTags), 1.15, false));
      }
    }
    if (hasMentorship && chanceHit(0.3)) {
      for (var mti2 = 0; mti2 < mentorshipPool.length; mti2++) {
        var mtEntry = mentorshipPool[mti2];
        pool.push(makeEntry(mtEntry.text, mergeTags(mtEntry.tags, calendarTags), 1.05, false));
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
        pool.push(makeEntry(arEntry.text, mergeTags(mergeTags(arEntry.tags, arcTagsExtra), calendarTags), 1.2, false));
      }
    }

    // Continuity pool
    if (mem && mem.unresolved) {
      if (mem.unresolved.rivalry && chanceHit(0.5)) {
        pool.push(makeEntry("followed up on an unresolved tension without making it obvious", ["source:continuity", "continuity:rivalry"], 1.25, false));
      }
      if (mem.unresolved.alliance && chanceHit(0.45)) {
        pool.push(makeEntry("checked in on a quiet agreement that still needs maintenance", ["source:continuity", "continuity:alliance"], 1.2, false));
      }
      if (mem.unresolved.arc && chanceHit(0.5)) {
        pool.push(makeEntry("took a small step in an ongoing situation—nothing loud, but real", ["source:continuity", "continuity:arc"], 1.25, false));
      }
    }

    if (typeof getWeatherEvent_ === "function" && chanceHit(0.25)) {
      var weatherEvent = getWeatherEvent_(ctx, true);
      if (weatherEvent && weatherEvent.text) {
        pool.push(makeEntry(weatherEvent.text, mergeTags(["source:weather"], calendarTags), 1.05, false));
      }
    }

    if (typeof getMediaInfluencedEvent_ === "function" && chanceHit(0.2)) {
      var mediaEvent = getMediaInfluencedEvent_(ctx);
      if (mediaEvent && mediaEvent.text) {
        pool.push(makeEntry(mediaEvent.text, mergeTags(["source:media"], calendarTags), 1.1, false));
      }
    }

    if (pool.length === 0) continue;

    // Filter out recently repeated content
    var filtered = [];
    var recent = mem ? mem.recentTexts : [];
    for (var fi = 0; fi < pool.length; fi++) {
      var pe = pool[fi];
      var nrm = normText_(pe.text);
      var seen = false;
      for (var ri2 = 0; ri2 < recent.length; ri2++) {
        if (recent[ri2] === nrm) { seen = true; break; }
      }
      if (!seen) filtered.push(pe);
    }
    var usePool = filtered.length >= 6 ? filtered : pool;

    var entry = pickWeighted_(usePool);
    var pick = entry.text;
    var tags = entry.tags.slice();

    var chosenVenue = "";
    var chosenInstitution = "";
    var contact = { name: "someone familiar", popId: "" };

    if (citizenBonds && citizenBonds.length) {
      contact = pickContactFromBonds_(citizenBonds);
    }

    if (entry.template) {
      chosenVenue = pickVenue_(neighborhood) || (mem && mem.lastVenue) || "a familiar corner";
      chosenInstitution = pickInstitution_(neighborhood) || "a local office";

      pick = renderTemplate_(pick, {
        VENUE: chosenVenue,
        INSTITUTION: chosenInstitution,
        CONTACT: contact.name || "someone familiar"
      });

      tags = mergeTags(tags, ["source:template"]);
      if (contact && contact.popId) tags = mergeTags(tags, ["contactPopId:" + contact.popId]);
      if (chosenVenue) tags = mergeTags(tags, ["venue:local"]);
    } else if (neighborhood && chanceHit(0.12)) {
      chosenVenue = pickVenue_(neighborhood);
      if (chosenVenue) {
        pick = pick + " near " + chosenVenue;
        tags = mergeTags(tags, ["venue:local"]);
      }
    }

    if (tags.indexOf("relationship:rivalry") >= 0 && hasRivalry && chanceHit(0.3)) {
      pick += " [rivalry active]";
      tags = mergeTags(tags, ["rivalry:active"]);
    }

    var hasArcTypeTag = false;
    for (var ati = 0; ati < tags.length; ati++) {
      if (tags[ati].indexOf("arcType:") === 0) { hasArcTypeTag = true; break; }
    }
    if (hasArcTypeTag && activeArc) {
      pick += " [" + activeArc.type + " arc]";
    }

    if (occupation) tags = mergeTags(tags, ["occupation:" + occupation]);
    if (ageGroup) tags = mergeTags(tags, ["ageGroup:" + ageGroup]);
    if (neighborhood) tags = mergeTags(tags, ["neighborhood:" + neighborhood]);
    tags = mergeTags(tags, ["tier:" + tier]);

    // v2.6: Add QoL tag
    if (nhQoL <= 0.35) tags = mergeTags(tags, ["qol:low"]);
    else if (nhQoL >= 0.65) tags = mergeTags(tags, ["qol:high"]);
    if (isHotspot) tags = mergeTags(tags, ["hotspot:true"]);

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
        tagString,
        pick,
        neighborhood || "Engine",
        cycle
      ]);
    }

    rows[r] = row;

    remember(popId, primaryTag, pick, chosenVenue, neighborhood, contact && contact.name, tags);

    activeSetObj[popId] = true;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    count++;
  }

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  if (lifeLog && logRows.length) {
    var startRow = lifeLog.getLastRow() + 1;
    lifeLog.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);
  }

  S.cycleActiveCitizens = Object.keys(activeSetObj);
  S.citizenEventMemory = MEM;
  ctx.summary = S;
}


/**
 * ============================================================================
 * CITIZENS EVENTS ENGINE REFERENCE v2.6
 * ============================================================================
 *
 * v2.6 CHANGES:
 * - crimeMetrics v1.2 integration: qualityOfLifeIndex drives event pools
 * - neighborhoodDynamics v2.6 integration via getNeighborhoodDynamics_()
 * - Weather v3.5 full integration (precipitationIntensity, visibility, frontType)
 * - QoL-aware event pools (low QoL = tension/patrol events, high QoL = calm events)
 * - Patrol strategy flavor (suppress_hotspots vs community_presence)
 * - Hotspot awareness (crimeMetrics.hotspots[] boost + events)
 * - New primary tag: "QoL" for quality-of-life driven events
 * - New tags: qol:low, qol:high, hotspot:true, patrol:suppress, patrol:community
 *
 * CRIME METRICS INPUT (v2.6):
 * ctx.summary.crimeMetrics = {
 *   qualityOfLifeIndex: 0.0-1.0,
 *   patrolStrategy: 'suppress_hotspots' | 'community_presence' | 'balanced',
 *   enforcementCapacity: number,
 *   hotspots: string[],
 *   neighborhoodBreakdown: { "Fruitvale": { qualityOfLifeIndex: 0.4 }, ... }
 * }
 *
 * NEIGHBORHOOD DYNAMICS (v2.6):
 * Uses getNeighborhoodDynamics_(ctx, neighborhood) if available, else falls back
 * to crimeMetrics.neighborhoodBreakdown.
 *
 * WEATHER v3.5 FIELDS:
 * - precipitationIntensity (0-1)
 * - visibility (0-1)
 * - windSpeed (mph)
 * - frontType ('cold_front', 'warm_front', 'atmospheric_river', 'none')
 *
 * v2.5 FEATURES (retained):
 * - citizenEventMemory in ctx.summary
 * - Template slots with local venues/institutions
 * - Attribute tags (ageGroup, occupation, tier, neighborhood)
 *
 * BACKWARD COMPATIBILITY:
 * - LifeHistory cell format unchanged: "[PrimaryTag] event text"
 * - EventTag column receives: "PrimaryTag|tagA|tagB|..."
 *
 * TARGET: Tier-3 and Tier-4 ENGINE citizens only
 * LIMIT: 10 events per cycle
 *
 * ============================================================================
 */
