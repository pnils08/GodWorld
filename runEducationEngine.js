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
  const iTier = idx('Tier');
  const iClock = idx('ClockMode');
  const iUNI = idx('UNI (y/n)');
  const iMED = idx('MED (y/n)');
  const iCIV = idx('CIV (y/n)');
  const iBirth = idx('BirthYear');
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

  // Use simYear or calculate from cycle
  const simYear = S.simYear || (2040 + Math.floor(cycle / 12));

  let count = 0;
  const LIMIT = 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE MICRO-LEARNING POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const baseEdu = [
    "spent time learning new skills informally",
    "engaged lightly with educational or informational content",
    "reflected on personal growth and understanding",
    "took small steps toward self-development",
    "paid closer attention to news and information this cycle"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  const seasonalEdu = [];
  if (season === "Winter") seasonalEdu.push("read or studied indoors during winter pace");
  if (season === "Spring") seasonalEdu.push("felt renewed motivation to learn as the season shifted");
  if (season === "Summer") seasonalEdu.push("explored interests during warm-season downtime");
  if (season === "Fall") seasonalEdu.push("re-engaged in learning habits as routines returned");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  const weatherEdu = [];
  if (weather.type === "rain") weatherEdu.push("spent time learning indoors due to rain");
  if (weather.type === "fog") weatherEdu.push("focused on indoor reading during fog");
  if (weather.type === "hot") weatherEdu.push("looked for shaded or quiet places to think");
  if (weather.type === "cold") weatherEdu.push("studied indoors during the cold");
  if (weather.type === "wind") weatherEdu.push("stayed inside and browsed educational media");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MOOD EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  const weatherMoodEdu = [];
  if (weatherMood.creativityBoost && weatherMood.creativityBoost > 0.2) {
    weatherMoodEdu.push("felt inspired to explore creative learning");
  }
  if (weatherMood.primaryMood === 'introspective') {
    weatherMoodEdu.push("used the reflective mood for deeper reading");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  const chaosEdu = chaos.length > 0 ? [
    "sought more information due to recent city events",
    "reviewed news to understand developing situations"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  const sentimentEdu = [];
  if (dynamics.sentiment >= 0.3) {
    sentimentEdu.push("felt encouraged to focus on self-improvement");
  }
  if (dynamics.sentiment <= -0.3) {
    sentimentEdu.push("reflected inward due to tense atmosphere");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  const econEdu = [];
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
  const holidayEdu = [];

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
  const firstFridayEdu = isFirstFriday ? [
    "explored art and cultural learning at First Friday",
    "engaged with local artists and their work",
    "learned about Oakland's creative community",
    "attended an artist talk at a gallery"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY REFLECTION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const creationDayEdu = isCreationDay ? [
    "reflected on the origins of the community",
    "learned about foundational history",
    "felt connected to deeper knowledge",
    "explored the meaning of beginnings"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EDUCATION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const culturalEdu = [];
  if (dynamics.culturalActivity >= 1.4) {
    culturalEdu.push("engaged with cultural programming and events");
    culturalEdu.push("explored arts and creative learning opportunities");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EDUCATION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const communityEdu = [];
  if (dynamics.communityEngagement >= 1.3) {
    communityEdu.push("participated in community learning initiatives");
    communityEdu.push("engaged with neighborhood education programs");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON (minor influence)
  // ═══════════════════════════════════════════════════════════════════════════
  const sportsEdu = [];
  if (sports === "spring-training") {
    sportsEdu.push("took interest in learning new routines during pre-season rhythm");
  }
  if (sports === "post-season" || sports === "playoffs") {
    sportsEdu.push("engaged with sports-related media and commentary");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD EDUCATION POOLS (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodEdu = {
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
  const basePool = [
    ...baseEdu,
    ...seasonalEdu,
    ...weatherEdu,
    ...weatherMoodEdu,
    ...chaosEdu,
    ...sentimentEdu,
    ...econEdu,
    ...sportsEdu,
    ...holidayEdu,
    ...firstFridayEdu,
    ...creationDayEdu,
    ...culturalEdu,
    ...communityEdu
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (let r = 0; r < rows.length; r++) {

    if (count >= LIMIT) break;

    const row = rows[r];

    const tier = Number(row[iTier] || 0);
    const mode = (row[iClock] || "").toString().trim();
    if (mode !== "ENGINE") continue;
    if (tier !== 3 && tier !== 4) continue;

    const isUNI = (row[iUNI] || "").toString().toLowerCase() === "y";
    const isMED = (row[iMED] || "").toString().toLowerCase() === "y";
    const isCIV = (row[iCIV] || "").toString().toLowerCase() === "y";
    if (isUNI || isMED || isCIV) continue;

    const birthYear = Number(row[iBirth] || 0);
    if (!birthYear) continue;

    const age = simYear - birthYear;
    if (age < 15) continue;

    const neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT CHANCE
    // ═══════════════════════════════════════════════════════════════════════
    let chance = 0.02;

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

    if (Math.random() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD CITIZEN-SPECIFIC POOL
    // ═══════════════════════════════════════════════════════════════════════
    let pool = [...basePool];
    
    // Add neighborhood events
    if (neighborhood && neighborhoodEdu[neighborhood]) {
      pool = [...pool, ...neighborhoodEdu[neighborhood]];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PICK EVENT
    // ═══════════════════════════════════════════════════════════════════════
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

    // Determine event tag (v2.2)
    let eventTag = "Education";
    if (firstFridayEdu.includes(pick)) {
      eventTag = "Education-FirstFriday";
    } else if (creationDayEdu.includes(pick)) {
      eventTag = "Education-CreationDay";
    } else if (holidayEdu.includes(pick)) {
      eventTag = "Education-Holiday";
    } else if (culturalEdu.includes(pick)) {
      eventTag = "Education-Cultural";
    }

    const existing = row[iLife] ? row[iLife].toString() : "";
    const line = `${stamp} — [${eventTag}] ${pick}`;

    row[iLife] = existing ? existing + "\n" + line : line;
    row[iLastUpd] = ctx.now;

    if (logSheet) {
      logSheet.appendRow([
        ctx.now,
        row[iPopID],
        (row[iFirst] + " " + row[iLast]).trim(),
        eventTag,
        pick,
        neighborhood || "Engine",
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