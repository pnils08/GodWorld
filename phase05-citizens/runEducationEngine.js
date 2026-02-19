/**
 * ============================================================================
 * Education Engine v2.2
 * ============================================================================
 *
 * Safe, world-aware micro-learning engine.
 * Adds soft educational/development hints only.
 *
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods
 * - Holiday-specific education notes (MLK Day, Black History Month, etc.)
 * - First Friday cultural learning
 * - Creation Day reflection
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Integrates:
 * - Season
 * - Weather + Weather Mood
 * - Holiday (30+ holidays)
 * - Chaos Events
 * - City Dynamics (sentiment, culturalActivity, communityEngagement)
 * - Economic Mood
 * - Sports Season
 * - Oakland Neighborhoods (12)
 *
 * Never creates credentials or degrees.
 * Never modifies jobs, status, UNI/MED/CIV.
 * 
 * ============================================================================
 */

function runEducationEngine_(ctx) {

  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;
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
  var iTier = idx('Tier');
  var iClock = idx('ClockMode');
  var iUNI = idx('UNI (y/n)');
  var iMED = idx('MED (y/n)');
  var iCIV = idx('CIV (y/n)');
  var iBirth = idx('BirthYear');
  var iLife = idx('LifeHistory');
  var iLastUpd = idx('LastUpdated');
  var iNeighborhood = idx('Neighborhood');

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary;
  var season = S.season;
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
  var sports = S.sportsSeason;
  var econMood = S.economicMood || 50;
  var cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  // Use simYear or calculate from cycle (52 cycles = 1 year)
  var simYear = S.simYear || (2040 + Math.floor(cycle / 52));

  var count = 0;
  var LIMIT = 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE MICRO-LEARNING POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var baseEdu = [
    "spent time learning new skills informally",
    "engaged lightly with educational or informational content",
    "reflected on personal growth and understanding",
    "took small steps toward self-development",
    "paid closer attention to news and information this cycle"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  var seasonalEdu = [];
  if (season === "Winter") seasonalEdu.push("read or studied indoors during winter pace");
  if (season === "Spring") seasonalEdu.push("felt renewed motivation to learn as the season shifted");
  if (season === "Summer") seasonalEdu.push("explored interests during warm-season downtime");
  if (season === "Fall") seasonalEdu.push("re-engaged in learning habits as routines returned");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  var weatherEdu = [];
  if (weather.type === "rain") weatherEdu.push("spent time learning indoors due to rain");
  if (weather.type === "fog") weatherEdu.push("focused on indoor reading during fog");
  if (weather.type === "hot") weatherEdu.push("looked for shaded or quiet places to think");
  if (weather.type === "cold") weatherEdu.push("studied indoors during the cold");
  if (weather.type === "wind") weatherEdu.push("stayed inside and browsed educational media");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MOOD EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  var weatherMoodEdu = [];
  if (weatherMood.creativityBoost && weatherMood.creativityBoost > 0.2) {
    weatherMoodEdu.push("felt inspired to explore creative learning");
  }
  if (weatherMood.primaryMood === 'introspective') {
    weatherMoodEdu.push("used the reflective mood for deeper reading");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  var chaosEdu = chaos.length > 0 ? [
    "sought more information due to recent city events",
    "reviewed news to understand developing situations"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  var sentimentEdu = [];
  if (dynamics.sentiment >= 0.3) {
    sentimentEdu.push("felt encouraged to focus on self-improvement");
  }
  if (dynamics.sentiment <= -0.3) {
    sentimentEdu.push("reflected inward due to tense atmosphere");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  var econEdu = [];
  if (econMood <= 35) {
    econEdu.push("researched skills to stay competitive in uncertain times");
    econEdu.push("looked into professional development opportunities");
  }
  if (econMood >= 65) {
    econEdu.push("explored learning opportunities with optimism");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY-SPECIFIC EDUCATION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayEdu = [];

  if (holiday === "MLKDay") {
    holidayEdu.push("engaged with civil rights history and teachings");
    holidayEdu.push("reflected on Dr. King's legacy and writings");
    holidayEdu.push("participated in a community service learning event");
  }
  if (holiday === "BlackHistoryMonth") {
    holidayEdu.push("explored Black history and cultural contributions");
    holidayEdu.push("attended a cultural education event");
    holidayEdu.push("read about local Black history");
  }
  if (holiday === "Juneteenth") {
    holidayEdu.push("learned more about Juneteenth's historical significance");
    holidayEdu.push("engaged with freedom and liberation narratives");
  }
  if (holiday === "IndigenousPeoplesDay") {
    holidayEdu.push("learned about Indigenous history and culture");
    holidayEdu.push("reflected on the land's original inhabitants");
  }
  if (holiday === "DiaDeMuertos") {
    holidayEdu.push("learned about Día de los Muertos traditions");
    holidayEdu.push("explored cultural memorial practices");
  }
  if (holiday === "CincoDeMayo") {
    holidayEdu.push("learned about Mexican history and culture");
  }
  if (holiday === "PrideMonth" || holiday === "OaklandPride") {
    holidayEdu.push("engaged with LGBTQ+ history and culture");
    holidayEdu.push("learned about the history of the pride movement");
  }
  if (holiday === "EarthDay") {
    holidayEdu.push("learned about environmental sustainability");
    holidayEdu.push("explored climate and ecology topics");
  }
  if (holiday === "BackToSchool") {
    holidayEdu.push("prepared learning materials for the new school year");
    holidayEdu.push("engaged with educational planning");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY CULTURAL LEARNING (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var firstFridayEdu = isFirstFriday ? [
    "explored art and cultural learning at First Friday",
    "engaged with local artists and their work",
    "learned about Oakland's creative community",
    "attended an artist talk at a gallery"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY REFLECTION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var creationDayEdu = isCreationDay ? [
    "reflected on the origins of the community",
    "learned about foundational history",
    "felt connected to deeper knowledge",
    "explored the meaning of beginnings"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EDUCATION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var culturalEdu = [];
  if (dynamics.culturalActivity >= 1.4) {
    culturalEdu.push("engaged with cultural programming and events");
    culturalEdu.push("explored arts and creative learning opportunities");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EDUCATION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var communityEdu = [];
  if (dynamics.communityEngagement >= 1.3) {
    communityEdu.push("participated in community learning initiatives");
    communityEdu.push("engaged with neighborhood education programs");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON (minor influence)
  // ═══════════════════════════════════════════════════════════════════════════
  var sportsEdu = [];
  if (sports === "spring-training") {
    sportsEdu.push("took interest in learning new routines during pre-season rhythm");
  }
  if (sports === "post-season" || sports === "playoffs") {
    sportsEdu.push("engaged with sports-related media and commentary");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD EDUCATION POOLS (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodEdu = {
    'Temescal': [
      "browsed the Temescal library branch",
      "attended a community workshop in Temescal"
    ],
    'Downtown': [
      "visited the main Oakland library Downtown",
      "attended a public lecture in the city center"
    ],
    'Fruitvale': [
      "participated in community education programs",
      "engaged with cultural learning opportunities"
    ],
    'Lake Merritt': [
      "read by Lake Merritt during a break",
      "attended a lakeside community event"
    ],
    'West Oakland': [
      "explored local history and development topics",
      "learned about neighborhood changes"
    ],
    'Laurel': [
      "visited the Laurel library branch",
      "engaged in quiet study at home"
    ],
    'Rockridge': [
      "browsed bookstores in Rockridge",
      "attended an educational event nearby"
    ],
    'Jack London': [
      "explored arts education in Jack London",
      "attended a creative workshop"
    ],
    'Uptown': [
      "attended an arts lecture in Uptown",
      "explored gallery exhibitions for learning",
      "engaged with urban arts education"
    ],
    'KONO': [
      "learned about street art and muralism",
      "attended a DIY workshop in KONO",
      "explored creative skills informally"
    ],
    'Chinatown': [
      "learned about Chinese culture and history",
      "engaged with multilingual community resources",
      "explored cultural heritage topics"
    ],
    'Piedmont Ave': [
      "browsed independent bookstores on Piedmont Ave",
      "attended a neighborhood lecture",
      "engaged in quiet reading at a local cafe"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MERGE BASE POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var basePool = [].concat(
    baseEdu,
    seasonalEdu,
    weatherEdu,
    weatherMoodEdu,
    chaosEdu,
    sentimentEdu,
    econEdu,
    sportsEdu,
    holidayEdu,
    firstFridayEdu,
    creationDayEdu,
    culturalEdu,
    communityEdu
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (var r = 0; r < rows.length; r++) {

    if (count >= LIMIT) break;

    var row = rows[r];

    var tier = Number(row[iTier] || 0);
    var mode = (row[iClock] || "").toString().trim();
    if (mode !== "ENGINE") continue;
    if (tier !== 3 && tier !== 4) continue;

    var isUNI = (row[iUNI] || "").toString().toLowerCase() === "y";
    var isMED = (row[iMED] || "").toString().toLowerCase() === "y";
    var isCIV = (row[iCIV] || "").toString().toLowerCase() === "y";
    if (isUNI || isMED || isCIV) continue;

    var birthYear = Number(row[iBirth] || 0);
    if (!birthYear) continue;

    var age = simYear - birthYear;
    if (age < 15) continue;

    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT CHANCE
    // ═══════════════════════════════════════════════════════════════════════
    var chance = 0.02;

    if (weather.impact >= 1.3) chance += 0.01;
    if (weatherMood.creativityBoost && weatherMood.creativityBoost > 0.2) chance += 0.005;
    if (season === "Spring") chance += 0.01;
    if (season === "Fall") chance += 0.005;
    if (dynamics.sentiment <= -0.3) chance += 0.01;
    if (econMood <= 35) chance += 0.01;
    if (chaos.length > 0) chance += 0.015;

    // Younger adults more likely to engage in learning
    if (age >= 18 && age <= 35) chance += 0.01;

    // Holiday priority boost (v2.2)
    if (holidayPriority === "cultural") chance += 0.012;  // Cultural holidays boost learning
    else if (holidayPriority === "major") chance += 0.005;

    // Education-focused holidays boost (v2.2)
    if (holiday === "MLKDay" || holiday === "BlackHistoryMonth" || 
        holiday === "IndigenousPeoplesDay" || holiday === "BackToSchool") {
      chance += 0.015;
    }

    // First Friday boost (v2.2)
    if (isFirstFriday) {
      if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Jack London") {
        chance += 0.015;
      } else {
        chance += 0.008;
      }
    }

    // Creation Day boost (v2.2)
    if (isCreationDay) chance += 0.008;

    // Cultural activity boost (v2.2)
    if (dynamics.culturalActivity >= 1.4) chance += 0.008;

    // Community engagement boost (v2.2)
    if (dynamics.communityEngagement >= 1.3) chance += 0.005;

    if (chance > 0.12) chance = 0.12;

    if (rng() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD CITIZEN-SPECIFIC POOL
    // ═══════════════════════════════════════════════════════════════════════
    var pool = basePool.slice();

    // Add neighborhood events
    if (neighborhood && neighborhoodEdu[neighborhood]) {
      pool = pool.concat(neighborhoodEdu[neighborhood]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PICK EVENT
    // ═══════════════════════════════════════════════════════════════════════
    var pick = pool[Math.floor(rng() * pool.length)];
    var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

    // Determine event tag (v2.2)
    var eventTag = "Education";
    if (firstFridayEdu.indexOf(pick) >= 0) {
      eventTag = "Education-FirstFriday";
    } else if (creationDayEdu.indexOf(pick) >= 0) {
      eventTag = "Education-CreationDay";
    } else if (holidayEdu.indexOf(pick) >= 0) {
      eventTag = "Education-Holiday";
    } else if (culturalEdu.indexOf(pick) >= 0) {
      eventTag = "Education-Cultural";
    }

    var existing = row[iLife] ? row[iLife].toString() : "";
    var line = stamp + " — [" + eventTag + "] " + pick;

    row[iLife] = existing ? existing + "\n" + line : line;
    row[iLastUpd] = ctx.now;

    if (logSheet) {
      logSheet.appendRow([
        ctx.now,
        row[iPopID],
        '',
        eventTag,
        pick,
        '',
        cycle
      ]);
    }

    rows[r] = row;
    count++;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
  }

  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  // Summary
  S.educationEvents = count;
  ctx.summary = S;
}


/**
 * ============================================================================
 * EDUCATION EVENT REFERENCE
 * ============================================================================
 * 
 * Event Tags:
 * - Education: Base learning events
 * - Education-FirstFriday: Art and cultural learning
 * - Education-CreationDay: Foundational reflection
 * - Education-Holiday: Holiday-specific learning
 * - Education-Cultural: Cultural programming
 * 
 * Holiday Education Focus:
 * - MLKDay: Civil rights history
 * - BlackHistoryMonth: Black history and culture
 * - Juneteenth: Liberation history
 * - IndigenousPeoplesDay: Indigenous history
 * - DiaDeMuertos: Cultural traditions
 * - PrideMonth: LGBTQ+ history
 * - EarthDay: Environmental topics
 * - BackToSchool: Educational preparation
 * 
 * Neighborhood Education (12 total):
 * - Downtown: Main library, public lectures
 * - Uptown: Arts lectures, gallery exhibitions
 * - KONO: Street art, DIY workshops
 * - Chinatown: Cultural heritage, multilingual resources
 * - etc.
 * 
 * STRICT RULES PRESERVED:
 * - Never creates credentials or degrees
 * - Never modifies jobs, status, UNI/MED/CIV
 * - Soft educational hints only
 * 
 * ============================================================================
 */