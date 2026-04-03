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

function runAsUniversePipeline_(ctx) {

  var ss = ctx.ss;
  var ledger = ss.getSheetByName('Simulation_Ledger');
  var logSheet = ss.getSheetByName('LifeHistory_Log');
  if (!ledger) return;

  var values = ledger.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);

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
      : Math.random;

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
  var neighborhoodPools = {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY POST-CAREER POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayPools = {
    'NewYear': [
      "reflecting on the new year in retirement",
      "enjoying a quieter New Year's celebration"
    ],
    'MLKDay': [
      "reflecting on legacy and service",
      "attending community MLK observances"
    ],
    'Independence': [
      "enjoying a relaxed Fourth of July",
      "watching fireworks with family"
    ],
    'MemorialDay': [
      "honoring fallen veterans quietly",
      "enjoying the long weekend"
    ],
    'LaborDay': [
      "appreciating a career well-lived",
      "enjoying the unofficial end of summer"
    ],
    'Thanksgiving': [
      "gathering with family for Thanksgiving",
      "reflecting on blessings in retirement"
    ],
    'Holiday': [
      "enjoying a peaceful holiday season",
      "spending time with loved ones"
    ],
    'OpeningDay': [
      "feeling the familiar excitement of Opening Day",
      "reminiscing about past seasons",
      "watching the opener with old teammates"
    ],
    'Juneteenth': [
      "celebrating Juneteenth with community",
      "reflecting on freedom and progress"
    ],
    'VeteransDay': [
      "honoring those who served",
      "attending memorial observances"
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

    var isUNI = (row[iUNI] || "").toString().toLowerCase() === "y";
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
        if (neighborhood && neighborhoodPools[neighborhood]) {
          np = neighborhoodPools[neighborhood];
          for (i = 0; i < np.length; i++) { pool.push(np[i]); }
        }

        if (pool.length === 0) pool.push("continuing to adjust to post-career life");

        var pick = pool[Math.floor(rng() * pool.length)];

        // Determine event tag (v3.0 - expanded tags)
        var eventTag = "PostCareer";
        if (firstFridayNotes.indexOf(pick) >= 0) {
          eventTag = "PostCareer-FirstFriday";
        } else if (creationDayNotes.indexOf(pick) >= 0) {
          eventTag = "PostCareer-CreationDay";
        } else if (holiday !== "none" && holidayPools[holiday] && holidayPools[holiday].indexOf(pick) >= 0) {
          eventTag = "PostCareer-Holiday";
        } else if ((sportsAtmosphereNotes[canonSportsPhase] || []).indexOf(pick) >= 0) {
          eventTag = "PostCareer-Sports";
        } else if (vacationPool.indexOf(pick) >= 0) {
          eventTag = "PostCareer-Travel";
        } else if (fundraiserPool.indexOf(pick) >= 0) {
          eventTag = "PostCareer-Fundraiser";
        } else if (communityPool.indexOf(pick) >= 0) {
          eventTag = "PostCareer-Community";
        } else if (influencePool.indexOf(pick) >= 0 || businessPool.indexOf(pick) >= 0) {
          eventTag = "PostCareer-Influence";
        } else if (wellnessPool.indexOf(pick) >= 0) {
          eventTag = "PostCareer-Wellness";
        }

        var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
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
  // BATCH WRITES
  // ═══════════════════════════════════════════════════════════════════════════
  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

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
