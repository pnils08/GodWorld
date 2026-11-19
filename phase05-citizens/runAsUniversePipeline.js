/**
 * ============================================================================
 * A's Universe Pipeline v3.0 (Canon-Safe Sports + Deterministic RNG)
 * ============================================================================
 *
 * v3.0 Changes:
 * - Canon-safe sports phase: Engine never simulates league operations
 * - Maker override support: sportsSource='config-override' enables full canon
 * - Athlete lifestyle pools: Influence, Community, Fundraiser, Travel, Wellness
 * - Deterministic RNG via ctx.rng or ctx.config.rngSeed (mulberry32_)
 * - New tags: PostCareer-Influence, PostCareer-Travel, PostCareer-Community,
 *   PostCareer-Fundraiser, PostCareer-Wellness, PostCareer-Sports
 *
 * v2.2 Features (preserved):
 * - GodWorld Calendar v1.0 (30+ holidays, First Friday, Creation Day)
 * - Weather Engine + Weather Mood
 * - Chaos Engine
 * - City Dynamics (sentiment, culturalActivity, communityEngagement)
 * - Oakland Neighborhoods (12 total)
 *
 * STRICT UNI RULES:
 * - NO random events for active UNI
 * - NO relocations, job changes, injuries ever
 * - ENGINE may add *soft post-career notes only*
 * - Maker (you) remains the sole controller of UNI stories
 *
 * Schema: No changes to Simulation_Ledger or LifeHistory_Log headers
 * ============================================================================
 */

/**
 * Mulberry32 PRNG - deterministic random number generator
 * @param {number} seed - 32-bit seed value
 * @returns {function} - Returns values in [0, 1)
 */
function mulberry32_uni_(seed) {
  return function() {
    var t = (seed += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// engine.148 P3 — post-career texture pools (was a 12-key literal, ten hoods silent)
// Every hood gets the pool for its Neighborhood_Map.EmployerCharacter label
// (a label with no pool throws); the twelve original hoods keep their bespoke
// lines on top. Resolved by hoodTexturePool_ (canonNeighborhoodLoader.js).
// ═══════════════════════════════════════════════════════════════════════════
var POSTCAREER_TEXTURE_BY_CHARACTER_ = {
  'institutional': ["watching the civic district from a bench in retirement", "enjoying quiet walks past the public buildings", "observing the official rhythm of the neighborhood"],
  'clinic': ["volunteering at a neighborhood clinic", "appreciating the caretakers of the neighborhood", "keeping up with health news from the clinics"],
  'schools-retail': ["walking the main street in the afternoon", "enjoying the school-day rhythm of the neighborhood", "chatting with shopkeepers in retirement"],
  'campus': ["sitting in on open campus talks", "watching the neighborhood build out", "enjoying the young energy of the blocks"],
  'transit-retail': ["watching the commuter flow from a station bench", "enjoying the neighborhood's constant motion", "picking up groceries near the transit stop"],
  'nightlife': ["watching the district wake up in the evening", "enjoying an early dinner before the night crowd", "appreciating the neighborhood's late energy from a distance"],
  'professional': ["strolling the main avenue in retirement", "enjoying the orderly pace of the neighborhood", "browsing the shops along the avenue"],
  'residential': ["settling into the neighborhood's quiet pace", "enjoying the calm of the block", "waving to neighbors from the porch"],
  'retail': ["browsing the storefronts in retirement", "enjoying the shopping-street bustle", "chatting with familiar shopkeepers"],
  'medical': ["walking near the hospital grounds", "appreciating the steady rhythm of the neighborhood", "keeping appointments close to home"],
  'family-retail': ["visiting the market street in the mornings", "enjoying the generations mixing on the block", "savoring a favorite family-run counter"],
  'mixed': ["taking in the patchwork rhythm of the block", "enjoying the corner store's steady company", "watching the neighborhood change from a bench"],
  'village-retail': ["enjoying the village main street in retirement", "settling into the neighborhood's small-town pace", "visiting the bakery each morning"],
  'service-labor': ["watching the early shifts head out", "appreciating the working rhythm of the neighborhood", "reflecting on a lifetime of work from the front step"],
  'arts': ["exploring the corridor's galleries in retirement", "enjoying the creative energy of the neighborhood", "attending openings along the corridor"],
  'stadium': ["watching game-day crowds from a distance", "enjoying the district's event-day buzz", "following the arena's calendar in retirement"],
  'construction': ["watching the neighborhood build out", "reflecting on how the blocks have changed", "following the boom from the front step"]
};

var POSTCAREER_TEXTURE_BESPOKE_ = {
  'Temescal': [
    "enjoying Temescal's cafe culture in retirement",
    "appreciating the creative energy around Temescal",
    "grabbing coffee at a favorite Temescal spot"
  ],
  'Downtown': [
    "observing Downtown's bustling activity from a distance",
    "taking in the urban rhythm of Downtown Oakland",
    "watching city life from a Downtown bench"
  ],
  'Fruitvale': [
    "connecting with Fruitvale's vibrant community",
    "enjoying the cultural richness of the neighborhood",
    "savoring tacos at a Fruitvale favorite"
  ],
  'Lake Merritt': [
    "taking peaceful walks around Lake Merritt",
    "enjoying the lake's calming presence",
    "watching the birds at the lake"
  ],
  'West Oakland': [
    "watching West Oakland's evolution in retirement",
    "appreciating the neighborhood's character",
    "reflecting on the area's history"
  ],
  'Laurel': [
    "settling into Laurel's quiet residential pace",
    "enjoying the neighborhood's calm atmosphere",
    "appreciating the community feel"
  ],
  'Rockridge': [
    "strolling through Rockridge's tree-lined streets",
    "enjoying Rockridge's refined neighborhood feel",
    "browsing shops along College Ave"
  ],
  'Jack London': [
    "taking in Jack London's waterfront scenery",
    "enjoying the arts district's creative energy",
    "watching boats at the estuary"
  ],
  'Uptown': [
    "enjoying Uptown's cultural scene in retirement",
    "attending gallery openings in the arts district",
    "appreciating the urban arts atmosphere"
  ],
  'KONO': [
    "exploring KONO's street art and galleries",
    "appreciating the neighborhood's creative spirit",
    "enjoying the DIY arts scene"
  ],
  'Chinatown': [
    "enjoying dim sum in Chinatown",
    "appreciating the neighborhood's bustling markets",
    "connecting with the community"
  ],
  'Piedmont Ave': [
    "strolling along leafy Piedmont Ave",
    "enjoying the boutique shops and cafes",
    "appreciating the quiet neighborhood charm"
  ]
};

// engine.350 Task 7 (builder 2026-11-16: a line moves a dial by what it says, down as often as up; 2026-11-18
// "we fixing all this"). A retired player's everyday line was a bare PostCareer (family +4, openness +2) whatever
// it said — "watching boats at the estuary", "noticing more baseball chatter in everyday places" — and the same
// under the First Friday, Creation Day, holiday and season suffixes. Each line is listed here under the dial it
// moves and which way, read off the sentence, and written one step: PostCareer-<Dial>-<Up|Down>-S. A line listed
// plain is a look at the block with nothing felt or done in it: drawn, counted and not written. The appearance,
// clinic-visit, fundraiser, getaway and training lines have kinds of their own (PostCareer-Influence, -Community,
// -Fundraiser, -Travel, -Wellness) and are untouched.
var POSTCAREER_SIGN_LINES_ = {
  "outabout:up": [
    "watching the civic district from a bench in retirement", "enjoying quiet walks past the public buildings",
    "walking the main street in the afternoon", "picking up groceries near the transit stop", "enjoying an early dinner before the night crowd",
    "strolling the main avenue in retirement", "browsing the shops along the avenue", "browsing the storefronts in retirement",
    "enjoying the shopping-street bustle", "walking near the hospital grounds", "visiting the market street in the mornings",
    "savoring a favorite family-run counter", "enjoying the village main street in retirement", "visiting the bakery each morning",
    "attending openings along the corridor", "enjoying Temescal's cafe culture in retirement", "grabbing coffee at a favorite Temescal spot",
    "watching city life from a Downtown bench", "savoring tacos at a Fruitvale favorite", "taking peaceful walks around Lake Merritt",
    "strolling through Rockridge's tree-lined streets", "browsing shops along College Ave", "taking in Jack London's waterfront scenery",
    "attending gallery openings in the arts district", "enjoying dim sum in Chinatown", "appreciating the neighborhood's bustling markets",
    "strolling along leafy Piedmont Ave", "enjoying the boutique shops and cafes", "wandering First Friday galleries in retirement",
    "watching the commuter flow from a station bench", "watching the neighborhood change from a bench", "watching the birds at the lake",
    "watching boats at the estuary", "taking in the urban rhythm of Downtown Oakland"
  ],
  "composure:up": [
    "enjoying the school-day rhythm of the neighborhood", "enjoying the neighborhood's constant motion",
    "enjoying the orderly pace of the neighborhood", "settling into the neighborhood's quiet pace", "enjoying the calm of the block",
    "appreciating the steady rhythm of the neighborhood", "settling into the neighborhood's small-town pace",
    "reflecting on a lifetime of work from the front step", "enjoying the lake's calming presence", "settling into Laurel's quiet residential pace",
    "enjoying the neighborhood's calm atmosphere", "enjoying Rockridge's refined neighborhood feel", "appreciating the quiet neighborhood charm",
    "settling into the familiar cadence of the season", "enjoying the slower pace away from game nights",
    "letting the body rest into an offseason rhythm", "settling into the steady cadence of the regular season",
    "enjoying a quieter New Year's celebration", "enjoying a peaceful holiday season", "appreciating the neighborhood's late energy from a distance",
    "appreciating the working rhythm of the neighborhood", "appreciating the neighborhood's character"
  ],
  "composure:down": [
    "feeling the long-season grind from a distance"
  ],
  "openness:up": [
    "sitting in on open campus talks", "enjoying the young energy of the blocks", "exploring the corridor's galleries in retirement",
    "enjoying the creative energy of the neighborhood", "reflecting on how the blocks have changed",
    "appreciating the creative energy around Temescal", "enjoying the cultural richness of the neighborhood", "reflecting on the area's history",
    "enjoying the arts district's creative energy", "enjoying Uptown's cultural scene in retirement", "appreciating the urban arts atmosphere",
    "exploring KONO's street art and galleries", "appreciating the neighborhood's creative spirit", "enjoying the DIY arts scene",
    "reflecting on the new year in retirement", "enjoying the art walk's creative energy", "appreciating Oakland's cultural scene",
    "reflecting on the journey that brought them here"
  ],
  "sociability:up": [
    "chatting with shopkeepers in retirement", "waving to neighbors from the porch", "chatting with familiar shopkeepers",
    "enjoying the corner store's steady company", "connecting with Fruitvale's vibrant community", "connecting with the community",
    "connecting with artists at First Friday"
  ],
  "warmth:up": [
    "volunteering at a neighborhood clinic", "appreciating the caretakers of the neighborhood", "enjoying the generations mixing on the block",
    "appreciating the community feel", "reflecting on blessings in retirement", "feeling connected to deep roots today",
    "appreciating the community's origins"
  ],
  "family:up": [
    "gathering with family for Thanksgiving", "spending time with loved ones"
  ],
  "fandom:up": [
    "enjoying the district's event-day buzz", "following the arena's calendar in retirement", "enjoying the familiar rhythm of spring prep",
    "feeling the quiet excitement that comes with camp season", "feeling the steady hum of game nights around the city",
    "feeling the first-month energy of a new season", "feeling the season sharpen as summer fades",
    "feeling the heightened attention around the team", "feeling the lingering intensity of postseason coverage",
    "feeling the weight of a championship moment in the air", "noticing the city move as one around the biggest games"
  ],
  "plain": [
    "observing the official rhythm of the neighborhood", "keeping up with health news from the clinics", "watching the neighborhood build out",
    "watching the district wake up in the evening", "keeping appointments close to home", "taking in the patchwork rhythm of the block",
    "watching the early shifts head out", "watching game-day crowds from a distance", "following the boom from the front step",
    "observing Downtown's bustling activity from a distance", "watching West Oakland's evolution in retirement",
    "noticing the city ease back into baseball season", "noticing more baseball chatter in everyday places",
    "noticing the city feels a little quieter on weeknights", "noticing early-season excitement around town",
    "noticing the steady rhythm of midseason life", "noticing the city's attention tighten as the year turns",
    "noticing game nights become routine again", "noticing the city get louder after big games",
    "noticing more conversations drifting back to baseball", "sensing something foundational in the air", "continuing to adjust to post-career life"
  ]
};
var POSTCAREER_SIGN_BY_TEXT_ = (function() {
  var out = {};
  for (var sign in POSTCAREER_SIGN_LINES_) {
    if (!POSTCAREER_SIGN_LINES_.hasOwnProperty(sign)) continue;
    for (var i = 0; i < POSTCAREER_SIGN_LINES_[sign].length; i++) out[POSTCAREER_SIGN_LINES_[sign][i]] = sign === "plain" ? null : sign;
  }
  return out;
})();
// The tag a retired player's everyday line is written under: PostCareer-<Dial>-<Up|Down>-S, or '' (not written).
// why: 'plain' (listed, no sign) | 'unlisted' (no entry) — the counter key.
function postCareerLineTag_(text) {
  if (!POSTCAREER_SIGN_BY_TEXT_.hasOwnProperty(text)) return { tag: '', why: 'unlisted' };
  var m = /^([a-z]+):(up|down)$/.exec(POSTCAREER_SIGN_BY_TEXT_[text] || '');
  if (!m) return { tag: '', why: 'plain' };
  return { tag: 'PostCareer-' + m[1].charAt(0).toUpperCase() + m[1].slice(1) + '-' + (m[2] === 'up' ? 'Up' : 'Down') + '-S', why: '' };
}

function runAsUniversePipeline_(ctx) {

  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('runAsUniversePipeline_: ctx.ledger not initialized');
  }
  var ss = ctx.ss;
  var logSheet = ss.getSheetByName('LifeHistory_Log');
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;

  var idx = function(n) { return header.indexOf(n); };

  var iPopID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iUNI = idx('UNI (y/n)');
  var iClock = idx('ClockMode');
  var iStatus = idx('Status');
  var iLife = idx('LifeHistory');
  var iLastUpd = idx('LastUpdated');
  var iNeighborhood = idx('Neighborhood');

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary;
  var season = (S.season || "").toString();
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var econMood = S.economicMood || 50;
  var cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // DETERMINISTIC RNG SETUP (v3.0)
  // ═══════════════════════════════════════════════════════════════════════════
  var rng = (typeof ctx.rng === "function")
    ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === "number")
      ? mulberry32_uni_((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0))
      : (function(){ throw new Error('runAsUniversePipeline: ctx.rng or ctx.config.rngSeed required (Phase 40.3 Path 1)'); })();
  // ═══════════════════════════════════════════════════════════════════════════
  // CANON-SAFE SPORTS STATE HANDLING (v3.0)
  // Engine must never simulate league operations. It can only:
  // - Infer broad canonical phase from GodWorld season
  // - Reflect Maker-provided override states (from MLB_Intake/NBA_Intake)
  // ═══════════════════════════════════════════════════════════════════════════

  function normalizeSportsState_(raw) {
    var s0 = (raw == null ? "" : String(raw)).trim().toLowerCase();
    if (!s0) return "off-season";
    var compact = s0
      .replace(/[_/]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    var map = {
      "offseason": "off-season",
      "off-season": "off-season",
      "springtraining": "spring-training",
      "spring-training": "spring-training",
      "earlyseason": "early-season",
      "early-season": "early-season",
      "midseason": "mid-season",
      "mid-season": "mid-season",
      "lateseason": "late-season",
      "late-season": "late-season",
      "regularseason": "regular-season",
      "regular-season": "regular-season",
      "playoffs": "playoffs",
      "postseason": "post-season",
      "post-season": "post-season",
      "championship": "championship",
      "world-series": "championship"
    };
    return map[compact] || "off-season";
  }

  /**
   * Returns a canon-safe phase key.
   * - If Maker override is active: returns override state (normalized).
   * - Else: derives from GodWorld season ONLY (no league ops, no playoffs).
   */
  function deriveCanonSportsPhase_(summary) {
    var source = (summary.sportsSource || "").toString();
    var oak = normalizeSportsState_(summary.sportsSeasonOakland || summary.sportsSeason);

    if (source === "config-override") {
      // Maker-controlled canon is allowed
      return oak;
    }

    // Engine-only canon from world season:
    // Winter: off-season, Spring: spring-training, Summer/Fall: in-season
    var worldSeason = (summary.season || "").toString().toLowerCase();
    if (worldSeason === "winter") return "off-season";
    if (worldSeason === "spring") return "spring-training";
    if (worldSeason === "summer") return "in-season";
    if (worldSeason === "fall") return "in-season";
    return "off-season";
  }

  var canonSportsPhase = deriveCanonSportsPhase_(S);

  // ═══════════════════════════════════════════════════════════════════════════
  // CANON-SAFE SPORTS ATMOSPHERE NOTES (v3.0)
  // No standings/trades/playoffs unless Maker override provides that canon
  // ═══════════════════════════════════════════════════════════════════════════
  var sportsAtmosphereNotes = {
    "spring-training": [
      "enjoying the familiar rhythm of spring prep",
      "noticing the city ease back into baseball season",
      "feeling the quiet excitement that comes with camp season"
    ],
    "in-season": [
      "settling into the familiar cadence of the season",
      "noticing more baseball chatter in everyday places",
      "feeling the steady hum of game nights around the city"
    ],
    "off-season": [
      "enjoying the slower pace away from game nights",
      "letting the body rest into an offseason rhythm",
      "noticing the city feels a little quieter on weeknights"
    ],
    // Maker override states (only used if sportsSource='config-override')
    "early-season": [
      "feeling the first-month energy of a new season",
      "noticing early-season excitement around town"
    ],
    "mid-season": [
      "feeling the long-season grind from a distance",
      "noticing the steady rhythm of midseason life"
    ],
    "late-season": [
      "feeling the season sharpen as summer fades",
      "noticing the city's attention tighten as the year turns"
    ],
    "regular-season": [
      "settling into the steady cadence of the regular season",
      "noticing game nights become routine again"
    ],
    "playoffs": [
      "noticing the city get louder after big games",
      "feeling the heightened attention around the team"
    ],
    "post-season": [
      "feeling the lingering intensity of postseason coverage",
      "noticing more conversations drifting back to baseball"
    ],
    "championship": [
      "feeling the weight of a championship moment in the air",
      "noticing the city move as one around the biggest games"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ATHLETE LIFESTYLE POOLS (v3.0) - Sports-agnostic citizen activities
  // ═══════════════════════════════════════════════════════════════════════════
  var influencePool = [
    "did a low-key sponsor appearance",
    "recorded a short message for a community campaign",
    "handled a small wave of public recognition with ease",
    "took a call about a future partnership opportunity"
  ];
  var communityPool = [
    "dropped in at a youth clinic as a surprise guest",
    "visited a school to speak about discipline and routine",
    "spent time encouraging young athletes at a local program"
  ];
  var fundraiserPool = [
    "attended a charity event in support of a local cause",
    "helped raise funds for a community initiative",
    "joined an alumni charity event for a good cause"
  ];
  var vacationPool = [
    "took a short getaway to recharge",
    "enjoyed a low-profile weekend away from the spotlight",
    "made time for a relaxing change of scenery"
  ];
  var wellnessPool = [
    "kept up a light training routine for health and structure",
    "spent time on mobility work and recovery habits",
    "kept their schedule calm and consistent"
  ];
  var businessPool = [
    "met quietly with contacts about post-career opportunities",
    "considered a media or coaching opportunity without committing",
    "handled a few personal business tasks with an advisor"
  ];

  /**
   * Adds athlete lifestyle notes to pool based on sports phase
   * @param {Array} poolArr - Pool to add notes to
   * @param {string} phase - Canon sports phase
   * @param {function} rng - Random number generator
   */
  function addAthleteLifestyle_(poolArr, phase, rng) {
    var i;
    for (i = 0; i < wellnessPool.length; i++) { poolArr.push(wellnessPool[i]); }

    if (phase === "off-season") {
      // Heavier lifestyle in off-season
      for (i = 0; i < vacationPool.length; i++) { poolArr.push(vacationPool[i]); }
      for (i = 0; i < vacationPool.length; i++) { poolArr.push(vacationPool[i]); }
      for (i = 0; i < influencePool.length; i++) { poolArr.push(influencePool[i]); }
      for (i = 0; i < influencePool.length; i++) { poolArr.push(influencePool[i]); }
      for (i = 0; i < communityPool.length; i++) { poolArr.push(communityPool[i]); }
      for (i = 0; i < fundraiserPool.length; i++) { poolArr.push(fundraiserPool[i]); }
      for (i = 0; i < businessPool.length; i++) { poolArr.push(businessPool[i]); }
    } else {
      // Lighter lifestyle during in-season / spring-prep
      for (i = 0; i < influencePool.length; i++) { poolArr.push(influencePool[i]); }
      for (i = 0; i < communityPool.length; i++) { poolArr.push(communityPool[i]); }
      if (rng() < 0.30) { for (i = 0; i < fundraiserPool.length; i++) { poolArr.push(fundraiserPool[i]); } }
      if (rng() < 0.15) { for (i = 0; i < vacationPool.length; i++) { poolArr.push(vacationPool[i]); } }
      if (rng() < 0.25) { for (i = 0; i < businessPool.length; i++) { poolArr.push(businessPool[i]); } }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD POST-CAREER POOLS (12 neighborhoods)
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY POST-CAREER POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayPools = {
    'NewYear': [
      "reflecting on the new year in retirement",
      "enjoying a quieter New Year's celebration"
    ],
    'Thanksgiving': [
      "gathering with family for Thanksgiving",
      "reflecting on blessings in retirement"
    ],
    'Holiday': [
      "enjoying a peaceful holiday season",
      "spending time with loved ones"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY POST-CAREER NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  var firstFridayNotes = [
    "wandering First Friday galleries in retirement",
    "enjoying the art walk's creative energy",
    "connecting with artists at First Friday",
    "appreciating Oakland's cultural scene"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY POST-CAREER NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  var creationDayNotes = [
    "feeling connected to deep roots today",
    "reflecting on the journey that brought them here",
    "sensing something foundational in the air",
    "appreciating the community's origins"
  ];

  var postCareerEvents = 0;
  var logRows = []; // Batch logging

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE THROUGH CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (var r = 0; r < rows.length; r++) {

    var row = rows[r];

    var isUNI = (row[iUNI] || "").toString().toLowerCase().startsWith("y");
    if (!isUNI) continue;

    var status = (row[iStatus] || "").toString().trim().toLowerCase();
    var clock = (row[iClock] || "").toString().trim();
    var name = (row[iFirst] + " " + row[iLast]).trim();
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    // ═══════════════════════════════════════════════════════════════════════
    // 1. ACTIVE UNI — GAME CLOCK (no random events)
    // ═══════════════════════════════════════════════════════════════════════
    if (status === "active" && clock === "GAME") {
      row[iLastUpd] = ctx.now;
      rows[r] = row;
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. RETIREMENT PATH (GAME → ENGINE)
    // ═══════════════════════════════════════════════════════════════════════
    if (status === "retired" && clock === "GAME") {

      row[iClock] = "ENGINE";
      row[iLastUpd] = ctx.now;

      var baseNote = "Transitioned from active simulation to post-career life.";
      var existing = row[iLife] ? row[iLife].toString() : "";
      row[iLife] = existing ? existing + "\n" + baseNote : baseNote;

      logRows.push([
        ctx.now,
        row[iPopID],
        '',
        "Retirement",
        "Moved into post-career life.",
        '',
        cycle
      ]);

      rows[r] = row;
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. POST-CAREER UNI — ENGINE CLOCK
    // ═══════════════════════════════════════════════════════════════════════
    if (status === "retired" && clock === "ENGINE") {

      var chance = 0.02;

      // Season flavor
      if (season === "Winter") chance += 0.005;
      if (season === "Spring") chance += 0.005;

      // Weather influence
      if (weather.impact >= 1.3) chance += 0.005;

      // Weather mood
      if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.005;

      // Sentiment influence
      if (dynamics.sentiment <= -0.3) chance += 0.004;

      // Chaos adds soft perception ripples
      if (chaos.length > 0) chance += 0.005;

      // Holiday priority boost
      if (holidayPriority === "major") chance += 0.008;
      else if (holidayPriority === "oakland") chance += 0.01;
      else if (holidayPriority === "cultural") chance += 0.005;

      // First Friday boost
      if (isFirstFriday) chance += 0.005;

      // Creation Day boost
      if (isCreationDay) chance += 0.006;

      // Small sports-phase presence only (canon-safe)
      if (canonSportsPhase === "in-season") chance += 0.004;
      if (canonSportsPhase === "spring-training") chance += 0.003;
      if (canonSportsPhase === "off-season") chance += 0.003;

      if (chance > 0.10) chance = 0.10;

      if (rng() < chance) {

        var pool = [];
        var i, sn, np, hp;

        // Athlete lifestyle (sports-agnostic, uses rng)
        addAthleteLifestyle_(pool, canonSportsPhase, rng);

        // Sports atmosphere (canon-safe)
        sn = sportsAtmosphereNotes[canonSportsPhase] || [];
        for (i = 0; i < sn.length; i++) { pool.push(sn[i]); }

        // Holiday / cultural notes
        if (holiday !== "none" && holidayPools[holiday]) {
          hp = holidayPools[holiday];
          for (i = 0; i < hp.length; i++) { pool.push(hp[i]); }
        }
        if (isFirstFriday) {
          for (i = 0; i < firstFridayNotes.length; i++) { pool.push(firstFridayNotes[i]); }
        }
        if (isCreationDay) {
          for (i = 0; i < creationDayNotes.length; i++) { pool.push(creationDayNotes[i]); }
        }

        // Neighborhood
        np = hoodTexturePool_(ctx, neighborhood, POSTCAREER_TEXTURE_BY_CHARACTER_, POSTCAREER_TEXTURE_BESPOKE_, 'runAsUniversePipeline_');
        for (i = 0; i < np.length; i++) { pool.push(np[i]); }

        if (pool.length === 0) pool.push("continuing to adjust to post-career life");

        var pick = pool[Math.floor(rng() * pool.length)];

        // Determine event tag (v3.0 - expanded tags). engine.350: an everyday line is written under the dial it
        // names, one step; the First Friday, Creation Day, holiday and season suffixes (bare PostCareer) are gone.
        var eventTag;
        if (vacationPool.indexOf(pick) >= 0) {
          eventTag = "PostCareer-Travel";
        } else if (fundraiserPool.indexOf(pick) >= 0) {
          eventTag = "PostCareer-Fundraiser";
        } else if (communityPool.indexOf(pick) >= 0) {
          eventTag = "PostCareer-Community";
        } else if (influencePool.indexOf(pick) >= 0 || businessPool.indexOf(pick) >= 0) {
          eventTag = "PostCareer-Influence";
        } else if (wellnessPool.indexOf(pick) >= 0) {
          eventTag = "PostCareer-Wellness";
        } else {
          // a plain line or one with no entry is drawn, counted and not written, so the appearance, clinic,
          // fundraiser, getaway, training and signed everyday lines keep the odds they had
          var pcSigned = postCareerLineTag_(pick);
          if (!pcSigned.tag) {
            S.engine299 = S.engine299 || { noDial: 0, noDialBySource: {} };
            S.engine299.noDial++;
            var pcKey = 'runAsUniversePipeline:PostCareer:' + pcSigned.why;
            S.engine299.noDialBySource[pcKey] = (S.engine299.noDialBySource[pcKey] || 0) + 1;
            rows[r] = row;
            continue;
          }
          eventTag = pcSigned.tag;
        }

        var stamp = inWorldStamp_(ctx);
        var line = stamp + " — [" + eventTag + "] " + pick;

        var existing = row[iLife] ? row[iLife].toString() : "";
        row[iLife] = existing ? existing + "\n" + line : line;
        row[iLastUpd] = ctx.now;

        logRows.push([
          ctx.now,
          row[iPopID],
          '',
          eventTag,
          pick,
          '',
          cycle
        ]);

        postCareerEvents++;
        S.eventsGenerated = (S.eventsGenerated || 0) + 1;
      }

      rows[r] = row;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BATCH WRITES — Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.ledger.dirty = true;

  // Batch log write (v3.0 - single API call)
  if (logSheet && logRows.length > 0) {
    var lastRow = logSheet.getLastRow();
    logSheet.getRange(lastRow + 1, 1, logRows.length, 7).setValues(logRows);
  }

  // Summary
  S.postCareerEvents = postCareerEvents;
  S.canonSportsPhase = canonSportsPhase; // Expose for debugging
  ctx.summary = S;
}


/**
 * ============================================================================
 * UNI POST-CAREER REFERENCE (v3.0)
 * ============================================================================
 *
 * CANON-SAFE SPORTS HANDLING:
 * - Engine derives phase from world season only (no league ops)
 * - Maker override (sportsSource='config-override') enables full canon
 * - Winter → off-season, Spring → spring-training, Summer/Fall → in-season
 *
 * Event Tags:
 * - PostCareer: Base post-career events
 * - PostCareer-FirstFriday: Art walk engagement
 * - PostCareer-CreationDay: Foundational reflection
 * - PostCareer-Holiday: Holiday-specific events
 * - PostCareer-Sports: Sports season atmosphere
 * - PostCareer-Influence: Sponsorships, partnerships, recognition
 * - PostCareer-Travel: Getaways, vacations
 * - PostCareer-Community: Youth clinics, school visits
 * - PostCareer-Fundraiser: Charity events
 * - PostCareer-Wellness: Training, recovery, routine
 *
 * ATHLETE LIFESTYLE POOLS:
 * - Off-season: Heavy lifestyle (vacations, influence, community, business)
 * - In-season: Lighter lifestyle (focus on wellness, limited extras)
 *
 * STRICT UNI RULES PRESERVED:
 * - NO random events for active UNI
 * - NO relocations, job changes, injuries ever
 * - ENGINE only adds soft post-career notes
 * - Maker remains sole controller of UNI stories
 *
 * DETERMINISM:
 * - Uses ctx.rng() if provided
 * - Else uses ctx.config.rngSeed via mulberry32_uni_
 * - Else falls back to Math.random
 *
 * ============================================================================
 */
