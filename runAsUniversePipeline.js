/**
 * ============================================================================
 * A's Universe Pipeline v2.2
 * ============================================================================
 *
 * Fully integrated with:
 * - GodWorld Calendar v1.0 (30+ holidays, First Friday, Creation Day)
 * - Weather Engine + Weather Mood
 * - Chaos Engine
 * - City Dynamics (including culturalActivity, communityEngagement)
 * - Sports Season Engine
 * - Economic Mood
 * - Oakland Neighborhoods (12 total)
 *
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods
 * - Holiday-specific post-career notes
 * - First Friday cultural engagement
 * - Creation Day reflection
 * - Sports season awareness (playoffs, championship)
 * - Cultural activity and community engagement modifiers
 *
 * STRICT UNI RULES:
 * - NO random events for active UNI
 * - NO relocations, job changes, injuries ever
 * - ENGINE may add *soft post-career notes only*
 * - Maker (you) remains the sole controller of UNI stories
 * 
 * ============================================================================
 */

function runAsUniversePipeline_(ctx) {

  const ss = ctx.ss;
  const ledger = ss.getSheetByName('Simulation_Ledger');
  const logSheet = ss.getSheetByName('LifeHistory_Log');
  if (!ledger) return;

  const values = ledger.getDataRange().getValues();
  if (values.length < 2) return;

  const header = values[0];
  const rows = values.slice(1);

  const idx = n => header.indexOf(n);

  const iPopID = idx('POPID');
  const iFirst = idx('First');
  const iLast = idx('Last');
  const iUNI = idx('UNI (y/n)');
  const iClock = idx('ClockMode');
  const iStatus = idx('Status');
  const iLife = idx('LifeHistory');
  const iLastUpd = idx('LastUpdated');
  const iNeighborhood = idx('Neighborhood');

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const S = ctx.summary;
  const season = S.season;
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  const sports = S.sportsSeason;
  const econMood = S.economicMood || 50;
  const cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD POST-CAREER POOLS (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodPools = {
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
  // HOLIDAY POST-CAREER POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holidayPools = {
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
  // FIRST FRIDAY POST-CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const firstFridayNotes = [
    "wandering First Friday galleries in retirement",
    "enjoying the art walk's creative energy",
    "connecting with artists at First Friday",
    "appreciating Oakland's cultural scene"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY POST-CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const creationDayNotes = [
    "feeling connected to deep roots today",
    "reflecting on the journey that brought them here",
    "sensing something foundational in the air",
    "appreciating the community's origins"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON POST-CAREER NOTES (v2.2 - expanded)
  // ═══════════════════════════════════════════════════════════════════════════
  const sportsNotes = {
    'spring-training': [
      "following spring training with nostalgia",
      "watching young players prepare for the season"
    ],
    'early-season': [
      "enjoying early season optimism",
      "watching the team settle into form"
    ],
    'mid-season': [
      "keeping up with mid-season standings",
      "analyzing the team's playoff chances"
    ],
    'late-season': [
      "following the pennant race closely",
      "feeling the late-season intensity"
    ],
    'playoffs': [
      "watching playoff coverage intently",
      "reminiscing about their own playoff runs",
      "feeling the October tension"
    ],
    'post-season': [
      "following playoff coverage with interest",
      "reminiscing about October memories"
    ],
    'championship': [
      "watching the championship with deep investment",
      "remembering their own championship moments",
      "feeling the historic weight of the moment"
    ],
    'off-season': [
      "following off-season roster moves",
      "speculating about next year's team"
    ]
  };

  let postCareerEvents = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE THROUGH CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (let r = 0; r < rows.length; r++) {

    const row = rows[r];

    const isUNI = (row[iUNI] || "").toString().toLowerCase() === "y";
    if (!isUNI) continue;

    const status = (row[iStatus] || "").toString().trim().toLowerCase();
    const clock = (row[iClock] || "").toString().trim();
    const name = (row[iFirst] + " " + row[iLast]).trim();
    const neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    // ═══════════════════════════════════════════════════════════════════════
    // 1. ACTIVE UNI — GAME CLOCK
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

      const baseNote = "Transitioned from active simulation to post-career life.";
      const existing = row[iLife] ? row[iLife].toString() : "";
      row[iLife] = existing ? existing + "\n" + baseNote : baseNote;

      if (logSheet) {
        logSheet.appendRow([
          ctx.now,
          row[iPopID],
          name,
          "Retirement",
          "Moved into post-career life.",
          neighborhood || "Engine",
          cycle
        ]);
      }

      rows[r] = row;
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. POST-CAREER UNI — ENGINE CLOCK
    // ═══════════════════════════════════════════════════════════════════════
    if (status === "retired" && clock === "ENGINE") {

      let chance = 0.02;

      // Season flavor
      if (season === "Winter") chance += 0.005;
      if (season === "Spring") chance += 0.005;

      // Weather influence
      if (weather.impact >= 1.3) chance += 0.005;
      
      // Weather mood
      if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.005;
      if (weatherMood.perfectWeather) chance += 0.003;

      // Sentiment influence
      if (dynamics.sentiment >= 0.3) chance += 0.003;
      if (dynamics.sentiment <= -0.3) chance += 0.004;

      // Economic mood
      if (econMood <= 35) chance += 0.003;
      if (econMood >= 65) chance += 0.002;

      // Chaos adds soft perception ripples
      if (chaos.length > 0) chance += 0.005;

      // Holiday priority boost (v2.2)
      if (holidayPriority === "major") chance += 0.008;
      else if (holidayPriority === "oakland") chance += 0.01;  // Opening Day boost
      else if (holidayPriority === "cultural") chance += 0.005;

      // First Friday boost (v2.2)
      if (isFirstFriday) chance += 0.005;

      // Creation Day boost (v2.2)
      if (isCreationDay) chance += 0.006;

      // Sports season boost (v2.2)
      if (sports === "playoffs" || sports === "post-season") chance += 0.008;
      if (sports === "championship") chance += 0.012;
      if (sports === "late-season") chance += 0.005;

      // Cultural activity boost (v2.2)
      if (dynamics.culturalActivity >= 1.4) chance += 0.003;

      // Community engagement boost (v2.2)
      if (dynamics.communityEngagement >= 1.3) chance += 0.003;

      if (chance > 0.10) chance = 0.10;

      if (Math.random() < chance) {

        const pool = [];

        // Seasonal lifestyle notes
        if (season === "Winter") pool.push("settling into a quiet winter post-career rhythm");
        if (season === "Spring") pool.push("finding new routines as the season shifts");
        if (season === "Summer") pool.push("enjoying warm post-career evenings");
        if (season === "Fall") pool.push("reflecting during the fall shift");

        // Weather notes
        if (weather.type === "rain") pool.push("taking it easy indoors during the rain");
        if (weather.type === "fog") pool.push("moving calmly through foggy conditions");
        if (weather.type === "hot") pool.push("staying cool during the heat");
        if (weather.type === "cold") pool.push("staying warm during the cold snap");

        // Weather mood notes
        if (weatherMood.perfectWeather) pool.push("enjoying perfect weather in retirement");
        if (weatherMood.primaryMood === 'cozy') pool.push("enjoying a cozy day at home");
        if (weatherMood.primaryMood === 'nostalgic') pool.push("feeling nostalgic about the past");

        // Chaos perception
        if (chaos.length > 0) pool.push("noting the atmosphere of recent city events");

        // Sentiment
        if (dynamics.sentiment >= 0.3) pool.push("feeling uplifted by the city's general mood");
        if (dynamics.sentiment <= -0.3) pool.push("feeling some unease reflecting the city's tension");

        // Economic
        if (econMood <= 35) pool.push("noticing economic concerns in conversations");
        if (econMood >= 65) pool.push("sensing optimism about local opportunities");

        // Sports season (v2.2 - expanded)
        if (sports && sportsNotes[sports]) {
          pool.push(...sportsNotes[sports]);
        }

        // Holiday notes (v2.2)
        if (holiday !== "none" && holidayPools[holiday]) {
          pool.push(...holidayPools[holiday]);
        }

        // First Friday notes (v2.2)
        if (isFirstFriday) {
          pool.push(...firstFridayNotes);
        }

        // Creation Day notes (v2.2)
        if (isCreationDay) {
          pool.push(...creationDayNotes);
        }

        // Cultural activity notes (v2.2)
        if (dynamics.culturalActivity >= 1.4) {
          pool.push("enjoying the city's vibrant cultural scene");
        }

        // Community engagement notes (v2.2)
        if (dynamics.communityEngagement >= 1.3) {
          pool.push("feeling connected to the community in retirement");
        }

        // Neighborhood-specific notes
        if (neighborhood && neighborhoodPools[neighborhood]) {
          pool.push(...neighborhoodPools[neighborhood]);
        }

        // Fallback
        if (pool.length === 0) pool.push("continuing to adjust to post-career life");

        const pick = pool[Math.floor(Math.random() * pool.length)];

        // Determine event tag (v2.2)
        let eventTag = "PostCareer";
        if (firstFridayNotes.includes(pick)) {
          eventTag = "PostCareer-FirstFriday";
        } else if (creationDayNotes.includes(pick)) {
          eventTag = "PostCareer-CreationDay";
        } else if (holiday !== "none" && holidayPools[holiday]?.includes(pick)) {
          eventTag = "PostCareer-Holiday";
        } else if (sports && sportsNotes[sports]?.includes(pick)) {
          eventTag = "PostCareer-Sports";
        }

        const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
        const line = `${stamp} — [${eventTag}] ${pick}`;

        const existing = row[iLife] ? row[iLife].toString() : "";
        row[iLife] = existing ? existing + "\n" + line : line;
        row[iLastUpd] = ctx.now;

        if (logSheet) {
          logSheet.appendRow([
            ctx.now,
            row[iPopID],
            name,
            eventTag,
            pick,
            neighborhood || "Engine",
            cycle
          ]);
        }

        postCareerEvents++;
        S.eventsGenerated = (S.eventsGenerated || 0) + 1;
      }

      rows[r] = row;
    }
  }

  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  // Summary
  S.postCareerEvents = postCareerEvents;
  ctx.summary = S;
}


/**
 * ============================================================================
 * UNI POST-CAREER REFERENCE
 * ============================================================================
 * 
 * Event Tags:
 * - PostCareer: Base post-career events
 * - PostCareer-FirstFriday: Art walk engagement
 * - PostCareer-CreationDay: Foundational reflection
 * - PostCareer-Holiday: Holiday-specific events
 * - PostCareer-Sports: Sports season following
 * 
 * Sports Season Notes:
 * - spring-training: Nostalgia, watching young players
 * - playoffs/championship: Intense following, reminiscing
 * - off-season: Roster speculation
 * 
 * Holiday Notes:
 * - OpeningDay: Familiar excitement, past season memories
 * - Juneteenth, MLK: Community observances
 * - Thanksgiving, Holiday: Family gatherings
 * 
 * STRICT UNI RULES PRESERVED:
 * - NO random events for active UNI
 * - NO relocations, job changes, injuries ever
 * - ENGINE only adds soft post-career notes
 * - Maker remains sole controller of UNI stories
 * 
 * ============================================================================
 */