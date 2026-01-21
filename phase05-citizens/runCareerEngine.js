/**
 * ============================================================================
 * Career Engine v2.2
 * ============================================================================
 * 
 * Lightweight, calendar-aware, weather-aware career drift generator.
 * Only affects ENGINE-mode Tier-3 and Tier-4 non-UNI/MED/CIV citizens.
 * Never changes RoleType or Status. Logs soft career observations only.
 * 
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods
 * - Holiday-specific career notes (long weekends, retail rush, etc.)
 * - First Friday effects on creative/arts workers
 * - Creation Day career reflection
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Oakland workplace context integrated.
 * 
 * ============================================================================
 */

function runCareerEngine_(ctx) {

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
  const iUNI = idx('UNI (y/n)');
  const iMED = idx('MED (y/n)');
  const iCIV = idx('CIV (y/n)');
  const iClock = idx('ClockMode');
  const iLife = idx('LifeHistory');
  const iLastUpd = idx('LastUpdated');
  const iNeighborhood = idx('Neighborhood');
  const iTierRole = idx('TierRole');

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
  const econMood = S.economicMood || 50;
  const cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  let count = 0;
  const LIMIT = 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE MICRO-CAREER POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const baseCareer = [
    "had a routine period at work with no major changes",
    "felt slightly more confident in their role",
    "experienced a quieter workload than usual",
    "saw minor shifts in workplace expectations",
    "received small positive feedback on daily tasks",
    "handled ordinary work responsibilities without incident"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL WORK-CYCLE PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════
  const seasonalCareer = [];
  if (season === "Winter") {
    seasonalCareer.push("noticed slower workplace activity during winter months");
    seasonalCareer.push("navigated year-end deadlines and planning");
  }
  if (season === "Spring") {
    seasonalCareer.push("experienced renewed workplace momentum");
    seasonalCareer.push("felt the energy of new fiscal year initiatives");
  }
  if (season === "Summer") {
    seasonalCareer.push("felt lighter workflow during warm-season routines");
    seasonalCareer.push("covered for vacationing colleagues");
  }
  if (season === "Fall") {
    seasonalCareer.push("encountered early autumn workload restructuring");
    seasonalCareer.push("prepared for the busy Q4 push");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER EFFECTS ON WORK RHYTHM
  // ═══════════════════════════════════════════════════════════════════════════
  const weatherCareer = [];
  if (weather.type === "rain" || weather.type === "fog") {
    weatherCareer.push("was affected by weather-related workplace slowdowns");
    weatherCareer.push("had a longer commute due to weather");
  }
  if (weather.type === "hot") {
    weatherCareer.push("felt summer heat influence workplace mood");
  }
  if (weather.type === "cold") {
    weatherCareer.push("noticed cold weather affecting commute and mood");
  }

  // Weather mood effects
  const weatherMoodCareer = [];
  if (weatherMood.irritabilityFactor && weatherMood.irritabilityFactor > 0.3) {
    weatherMoodCareer.push("noticed workplace tension from weather stress");
  }
  if (weatherMood.perfectWeather) {
    weatherMoodCareer.push("enjoyed the pleasant commute to work");
    weatherMoodCareer.push("felt energized by the beautiful weather");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS → WORKPLACE CHATTER/STRESS
  // ═══════════════════════════════════════════════════════════════════════════
  const chaosCareer = chaos.length > 0 ? [
    "noticed workplace discussion reacting to recent city events",
    "felt subtle workplace tension due to city happenings"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT → WORKPLACE MORALE
  // ═══════════════════════════════════════════════════════════════════════════
  const sentimentCareer = [];
  if (dynamics.sentiment >= 0.3) sentimentCareer.push("felt improved workplace morale");
  if (dynamics.sentiment <= -0.3) sentimentCareer.push("felt uneasy workplace atmosphere");

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC MOOD → JOB SECURITY FEELINGS
  // ═══════════════════════════════════════════════════════════════════════════
  const econCareer = [];
  if (econMood <= 35) {
    econCareer.push("felt economic uncertainty affecting workplace mood");
    econCareer.push("noticed colleagues discussing job market concerns");
  }
  if (econMood >= 65) {
    econCareer.push("sensed optimism about career opportunities");
    econCareer.push("noticed positive workplace energy from economic news");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY-SPECIFIC CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holidayCareer = [];

  // Long weekend holidays
  if (holiday === "MemorialDay" || holiday === "LaborDay" || holiday === "Independence") {
    holidayCareer.push("enjoyed the long weekend break from work");
    holidayCareer.push("wrapped up tasks before the holiday");
    holidayCareer.push("noticed lighter office attendance before the holiday");
  }

  // Thanksgiving
  if (holiday === "Thanksgiving") {
    holidayCareer.push("prepared for the holiday break");
    holidayCareer.push("wrapped up projects before the long weekend");
    holidayCareer.push("participated in workplace holiday potluck");
  }

  // Holiday season (Christmas)
  if (holiday === "Holiday") {
    holidayCareer.push("felt the holiday slowdown at work");
    holidayCareer.push("exchanged holiday greetings with colleagues");
    holidayCareer.push("navigated year-end administrative tasks");
  }

  // New Year
  if (holiday === "NewYear" || holiday === "NewYearsEve") {
    holidayCareer.push("set workplace goals for the new year");
    holidayCareer.push("participated in workplace new year discussions");
    holidayCareer.push("felt the fresh-start energy at work");
  }

  // Retail/service holidays
  if (holiday === "Valentine" || holiday === "MothersDay" || holiday === "FathersDay") {
    holidayCareer.push("noticed increased retail activity");
    holidayCareer.push("felt the holiday rush in service industries");
  }

  // Black Friday (day after Thanksgiving)
  if (holiday === "BlackFriday") {
    holidayCareer.push("experienced the retail rush");
    holidayCareer.push("worked extra hours during the shopping surge");
  }

  // Back to school
  if (holiday === "BackToSchool") {
    holidayCareer.push("adjusted to new school year schedules");
    holidayCareer.push("noticed the end-of-summer workplace shift");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const firstFridayCareer = isFirstFriday ? [
    "made plans to attend First Friday after work",
    "felt the end-of-week creative energy",
    "left work early for First Friday art walk",
    "discussed gallery plans with coworkers"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const creationDayCareer = isCreationDay ? [
    "reflected on their career journey",
    "felt connected to the reasons they started this work",
    "appreciated their place in the community",
    "sensed something meaningful about today's work"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const culturalCareer = [];
  if (dynamics.culturalActivity >= 1.4) {
    culturalCareer.push("felt inspired by the city's creative energy");
    culturalCareer.push("noticed colleagues discussing cultural events");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const communityCareer = [];
  if (dynamics.communityEngagement >= 1.3) {
    communityCareer.push("participated in workplace community initiative");
    communityCareer.push("felt connected to colleagues and neighborhood");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD WORKPLACE POOLS (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodCareer = {
    'Downtown': [
      "navigated the busy Downtown commute",
      "felt the energy of the business district",
      "grabbed coffee near City Hall"
    ],
    'Jack London': [
      "appreciated working near the waterfront",
      "enjoyed the Jack London district atmosphere",
      "took a lunchtime walk by the estuary"
    ],
    'Temescal': [
      "grabbed lunch at a Temescal spot near work",
      "appreciated the creative workplace environment",
      "enjoyed the neighborhood's eclectic vibe"
    ],
    'Rockridge': [
      "enjoyed the pleasant Rockridge work commute",
      "noticed the professional atmosphere",
      "stopped by College Ave shops after work"
    ],
    'West Oakland': [
      "felt the industrial workplace rhythm",
      "noticed development activity near work",
      "observed the neighborhood's evolution"
    ],
    'Fruitvale': [
      "connected with community near the workplace",
      "appreciated the neighborhood's energy",
      "grabbed lunch from a local taqueria"
    ],
    'Lake Merritt': [
      "took a lunchtime walk by the lake",
      "enjoyed the lakeside work location",
      "felt refreshed by the natural surroundings"
    ],
    'Laurel': [
      "appreciated the quiet commute through Laurel",
      "enjoyed the residential-adjacent workplace",
      "noticed the neighborhood's calm energy"
    ],
    'Uptown': [
      "felt the urban arts district workplace energy",
      "enjoyed working near galleries and theaters",
      "grabbed lunch at an Uptown spot"
    ],
    'KONO': [
      "appreciated the creative district atmosphere",
      "noticed new murals on the commute",
      "felt inspired by the neighborhood's DIY spirit"
    ],
    'Chinatown': [
      "grabbed dim sum during lunch break",
      "appreciated the bustling neighborhood energy",
      "noticed the morning market activity"
    ],
    'Piedmont Ave': [
      "enjoyed the leafy commute through Piedmont Ave",
      "appreciated the boutique district atmosphere",
      "stopped by local shops after work"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL BASE EVENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  const basePool = [
    ...baseCareer,
    ...seasonalCareer,
    ...weatherCareer,
    ...weatherMoodCareer,
    ...chaosCareer,
    ...sentimentCareer,
    ...econCareer,
    ...holidayCareer,
    ...firstFridayCareer,
    ...creationDayCareer,
    ...culturalCareer,
    ...communityCareer
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE THROUGH CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (let r = 0; r < rows.length; r++) {

    if (count >= LIMIT) break;

    const row = rows[r];

    const tier = Number(row[iTier] || 0);
    const mode = row[iClock] || "ENGINE";
    const isUNI = (row[iUNI] || "").toString().toLowerCase() === "y";
    const isMED = (row[iMED] || "").toString().toLowerCase() === "y";
    const isCIV = (row[iCIV] || "").toString().toLowerCase() === "y";
    const neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    // Only allow ENGINE Tier-3/4 non-UNI/MED/CIV
    if (mode !== "ENGINE") continue;
    if (tier !== 3 && tier !== 4) continue;
    if (isUNI || isMED || isCIV) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT PROBABILITY
    // ═══════════════════════════════════════════════════════════════════════
    let chance = 0.02;

    // Weather-based noise
    if (weather.impact >= 1.3) chance += 0.01;

    // Weather mood
    if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.005;

    // Seasonal workplace rhythms
    if (season === "Fall") chance += 0.01;
    if (season === "Spring") chance += 0.005;

    // City sentiment
    if (dynamics.sentiment <= -0.3) chance += 0.015;

    // Economic stress increases career awareness
    if (econMood <= 35) chance += 0.01;
    if (econMood >= 65) chance += 0.005;

    // Chaos influence
    if (chaos.length > 0) chance += 0.015;

    // Holiday priority boost (v2.2)
    if (holidayPriority === "major") chance += 0.01;
    else if (holidayPriority === "minor") chance += 0.005;

    // Long weekend holidays boost (v2.2)
    if (holiday === "MemorialDay" || holiday === "LaborDay" || 
        holiday === "Thanksgiving" || holiday === "Independence") {
      chance += 0.008;
    }

    // First Friday boost (v2.2) - especially in arts neighborhoods
    if (isFirstFriday) {
      if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Jack London") {
        chance += 0.015;
      } else {
        chance += 0.005;
      }
    }

    // Creation Day boost (v2.2)
    if (isCreationDay) chance += 0.008;

    // Cultural activity boost (v2.2)
    if (dynamics.culturalActivity >= 1.4) chance += 0.005;

    // Community engagement boost (v2.2)
    if (dynamics.communityEngagement >= 1.3) chance += 0.005;

    // Cap chance
    if (chance > 0.12) chance = 0.12;

    if (Math.random() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD CITIZEN-SPECIFIC POOL
    // ═══════════════════════════════════════════════════════════════════════
    let pool = [...basePool];
    
    // Add neighborhood events
    if (neighborhood && neighborhoodCareer[neighborhood]) {
      pool = [...pool, ...neighborhoodCareer[neighborhood]];
    }

    // Choose drift output
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

    // Determine event tag (v2.2)
    let eventTag = "Career";
    if (firstFridayCareer.includes(pick)) {
      eventTag = "Career-FirstFriday";
    } else if (creationDayCareer.includes(pick)) {
      eventTag = "Career-CreationDay";
    } else if (holidayCareer.includes(pick)) {
      eventTag = "Career-Holiday";
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
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    count++;
  }

  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  
  // Summary
  S.careerEvents = count;
  ctx.summary = S;
}


/**
 * ============================================================================
 * CAREER EVENT REFERENCE
 * ============================================================================
 * 
 * Event Tags:
 * - Career: Base career drift events
 * - Career-FirstFriday: Art walk related
 * - Career-CreationDay: Foundational reflection
 * - Career-Holiday: Holiday-specific work events
 * 
 * Holiday Impacts:
 * - Long weekends: Lighter attendance, pre-holiday wrap-up
 * - Thanksgiving/Holiday: Year-end tasks, potlucks
 * - Valentine/Mother's/Father's: Retail rush
 * - BackToSchool: Schedule adjustments
 * 
 * Neighborhood Character (12 total):
 * - Downtown: Business district energy
 * - Jack London: Waterfront atmosphere
 * - Uptown: Urban arts district
 * - KONO: Creative DIY spirit
 * - Chinatown: Bustling markets
 * - etc.
 * 
 * ============================================================================
 */