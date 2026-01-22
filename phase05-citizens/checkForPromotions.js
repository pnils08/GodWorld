/**
 * ============================================================================
 * checkForPromotions_ v2.2
 * ============================================================================
 *
 * Promotion engine for Generic_Citizens → Simulation_Ledger.
 * World-aware with Oakland neighborhood integration and GodWorld Calendar.
 *
 * v2.2 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - Full GodWorld Calendar integration (30+ holidays)
 * - First Friday boosts arts/creative promotions
 * - Creation Day provides community emergence bonus
 * - Holiday-specific promotion modifiers
 * - Sports season visibility boosts
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Season, Weather, Weather Mood
 * - Chaos, Sentiment, Economic Mood
 * - City Dynamics integration
 *
 * Produces higher-quality Tier-3 background citizens.
 * 
 * ============================================================================
 */

function checkForPromotions_(ctx) {

  const ss = ctx.ss;

  const generic = ss.getSheetByName("Generic_Citizens");
  const ledger = ss.getSheetByName("Simulation_Ledger");
  const logSheet = ss.getSheetByName("LifeHistory_Log");

  if (!generic || !ledger) return;

  const gVals = generic.getDataRange().getValues();
  const gHeader = gVals[0];
  const idxG = n => gHeader.indexOf(n);

  const gFirst = idxG("First");
  const gLast = idxG("Last");
  const gAge = idxG("Age");
  const gNeigh = idxG("Neighborhood");
  const gOcc = idxG("Occupation");
  const gEmer = idxG("EmergenceCount");
  const gStat = idxG("Status");

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const S = ctx.summary;
  const season = S.season;
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  const econMood = S.economicMood || 50;
  const cycle = S.cycleId || ctx.config.cycleCount || 0;

  // Calendar context (v2.2)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  // Use simYear or calculate from cycle
  const simYear = S.simYear || (2040 + Math.floor(cycle / 12));

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOODS (12 - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const validNeighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  // Arts-focused neighborhoods for First Friday bonus
  const artsNeighborhoods = ["Uptown", "KONO", "Temescal", "Jack London"];

  // Ledger structure
  const lVals = ledger.getDataRange().getValues();
  const lHeader = lVals[0];
  const idxL = n => lHeader.indexOf(n);

  const iPopID = idxL("POPID");
  const iFirst = idxL("First");
  const iMiddle = idxL("Middle");
  const iLast = idxL("Last");
  const iOriginGame = idxL("OriginGame");
  const iUNI = idxL("UNI (y/n)");
  const iMED = idxL("MED (y/n)");
  const iCIV = idxL("CIV (y/n)");
  const iClock = idxL("ClockMode");
  const iTier = idxL("Tier");
  const iRoleType = idxL("RoleType");
  const iStatus = idxL("Status");
  const iBirthYear = idxL("BirthYear");
  const iNeighborhood = idxL("Neighborhood");
  const iLife = idxL("LifeHistory");
  const iCreatedAt = idxL("CreatedAt");
  const iLastUpdated = idxL("LastUpdated");
  const iOriginVault = idxL("OriginVault");

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER: NEXT POP-ID
  // ═══════════════════════════════════════════════════════════════════════════
  function nextPopId() {
    let maxN = 0;
    for (let r = 1; r < lVals.length; r++) {
      const v = (lVals[r][iPopID] || "").toString().trim();
      const m = v.match(/^POP-(\d+)$/);
      if (m) maxN = Math.max(maxN, Number(m[1]));
    }
    return "POP-" + String(maxN + 1).padStart(5, "0");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER: VALIDATE NEIGHBORHOOD (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  function validateNeighborhood(neigh) {
    if (validNeighborhoods.includes(neigh)) return neigh;
    // Map old/alternate names
    if (neigh === "Eastlake") return "Lake Merritt";
    if (neigh === "Old Oakland") return "Downtown";
    if (neigh === "Adams Point") return "Lake Merritt";
    if (neigh === "Koreatown-Northgate") return "KONO";
    // Default to random Oakland neighborhood
    return validNeighborhoods[Math.floor(Math.random() * validNeighborhoods.length)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMOTION CHANCE MODIFIER (v2.2 - Calendar Aware)
  // ═══════════════════════════════════════════════════════════════════════════
  function promotionChance(base, row) {
    let c = base;
    const neigh = row[gNeigh] || "";
    const occ = (row[gOcc] || "").toString().toLowerCase();

    // ═══════════════════════════════════════════════════════════════════════
    // SEASONAL MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    if (season === "Spring") c += 0.05;
    if (season === "Fall") c += 0.03;

    // ═══════════════════════════════════════════════════════════════════════
    // WEATHER MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    if (weather.impact >= 1.3) c += 0.02;
    if (weatherMood.perfectWeather) c += 0.02;

    // ═══════════════════════════════════════════════════════════════════════
    // CHAOS MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    if (chaos.length > 0) c += 0.04;

    // ═══════════════════════════════════════════════════════════════════════
    // SENTIMENT MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    if (dynamics.sentiment >= 0.3) c += 0.03;
    if (dynamics.sentiment <= -0.3) c -= 0.02;

    // ═══════════════════════════════════════════════════════════════════════
    // ECONOMIC MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    if (econMood >= 65) c += 0.02;
    if (econMood <= 35) c -= 0.02;

    // ═══════════════════════════════════════════════════════════════════════
    // CALENDAR MODIFIERS (v2.2)
    // ═══════════════════════════════════════════════════════════════════════

    // Community gathering holidays increase visibility
    const gatheringHolidays = [
      "Thanksgiving", "Independence", "MemorialDay", "LaborDay"
    ];
    if (gatheringHolidays.includes(holiday)) {
      c += 0.03;
    }

    // Cultural celebration holidays boost emergence
    const culturalHolidays = [
      "Juneteenth", "CincoDeMayo", "DiaDeMuertos", "OaklandPride",
      "LunarNewYear", "MLKDay", "BlackHistoryMonth"
    ];
    if (culturalHolidays.includes(holiday)) {
      c += 0.04;
    }

    // Oakland-specific holidays provide strong boost
    const oaklandHolidays = ["OpeningDay", "OaklandPride", "ArtSoulFestival"];
    if (oaklandHolidays.includes(holiday)) {
      c += 0.05;
    }

    // Major holidays have mixed effect (some visibility, some distraction)
    if (holidayPriority === "major") {
      c += 0.02;
    }

    // First Friday boosts arts district promotions
    if (isFirstFriday) {
      c += 0.04;
      // Extra boost for arts neighborhoods
      if (artsNeighborhoods.includes(neigh)) {
        c += 0.03;
      }
      // Extra boost for creative occupations
      const creativeOccs = ["artist", "musician", "designer", "writer", "performer"];
      if (creativeOccs.some(co => occ.includes(co))) {
        c += 0.03;
      }
    }

    // Creation Day provides community emergence bonus
    if (isCreationDay) {
      c += 0.05;
    }

    // Sports season visibility boost
    if (sportsSeason === "championship") {
      c += 0.04;
    } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
      c += 0.02;
    }

    // High cultural activity boosts emergence
    if (dynamics.culturalActivity >= 1.4) {
      c += 0.03;
    }

    // High community engagement boosts emergence
    if (dynamics.communityEngagement >= 1.4) {
      c += 0.03;
    } else if (dynamics.communityEngagement <= 0.7) {
      c -= 0.02;
    }

    // Quiet holidays reduce emergence (offices closed, less activity)
    const quietHolidays = ["Holiday", "NewYear", "Easter"];
    if (quietHolidays.includes(holiday)) {
      c -= 0.03;
    }

    // Cap
    if (c > 0.45) c = 0.45;
    if (c < 0.05) c = 0.05;

    return c;
  }

  // Track promotions for summary
  const promotions = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  for (let r = 1; r < gVals.length; r++) {

    const row = gVals[r];
    const emergence = Number(row[gEmer] || 0);
    const status = (row[gStat] || "").toString();

    // Only active candidates
    if (status !== "Active") continue;

    // Must meet emergence threshold
    if (emergence < 3) continue;

    // World-aware promotion chance
    const chance = promotionChance(0.20, row);
    if (Math.random() > chance) continue;

    // === Promote to Tier-3 ===
    const first = row[gFirst];
    const last = row[gLast];
    const age = Number(row[gAge] || 30);
    const neigh = validateNeighborhood(row[gNeigh] || "Downtown");
    const occ = row[gOcc] || "Citizen";

    const popId = nextPopId();
    const newRow = new Array(lHeader.length).fill("");

    const birthYear = simYear - age;

    newRow[iPopID] = popId;
    newRow[iFirst] = first;
    newRow[iMiddle] = "";
    newRow[iLast] = last;
    newRow[iOriginGame] = "";
    newRow[iUNI] = "n";
    newRow[iMED] = "n";
    newRow[iCIV] = "n";
    newRow[iClock] = "ENGINE";
    newRow[iTier] = 3;
    newRow[iRoleType] = occ;
    newRow[iStatus] = "Active";
    newRow[iBirthYear] = birthYear;
    
    if (iNeighborhood >= 0) {
      newRow[iNeighborhood] = neigh;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WORLD-AWARE LIFEHISTORY CONTEXT (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    let context = "";

    // Seasonal context
    if (season === "Spring") context += "Promoted during spring renewal. ";
    if (season === "Fall") context += "Promoted during fall civic cycle. ";

    // Weather context
    if (weather.impact >= 1.3) context += "Weather volatility shaped community visibility. ";
    if (weatherMood.perfectWeather) context += "Perfect weather highlighted their presence. ";

    // Chaos context
    if (chaos.length > 0) context += "Cycle marked by heightened city movement. ";

    // Sentiment context
    if (dynamics.sentiment >= 0.3) context += "Positive public sentiment supported emergence. ";

    // Economic context
    if (econMood >= 65) context += "Economic optimism boosted visibility. ";
    if (econMood <= 35) context += "Emerged despite economic uncertainty. ";

    // Calendar context (v2.2)
    if (holiday !== "none") {
      const holidayContextMap = {
        "Thanksgiving": "Emerged during Thanksgiving community gathering. ",
        "Independence": "Celebrated independence alongside neighbors. ",
        "Juneteenth": "Rose to visibility during Juneteenth celebration. ",
        "CincoDeMayo": "Emerged during Cinco de Mayo festivities. ",
        "DiaDeMuertos": "Remembered and emerged during Día de los Muertos. ",
        "OaklandPride": "Celebrated identity during Oakland Pride. ",
        "OpeningDay": "Rose with the excitement of Opening Day. ",
        "LunarNewYear": "Emerged during Lunar New Year celebrations. ",
        "MLKDay": "Emerged during MLK Day reflection. ",
        "ArtSoulFestival": "Emerged during Art & Soul Festival. "
      };
      if (holidayContextMap[holiday]) {
        context += holidayContextMap[holiday];
      }
    }

    if (isFirstFriday) {
      if (artsNeighborhoods.includes(neigh)) {
        context += "First Friday art walk brought them into the spotlight. ";
      } else {
        context += "First Friday energy rippled across the city. ";
      }
    }

    if (isCreationDay) {
      context += "Creation Day marked their entry into Oakland's story. ";
    }

    if (sportsSeason === "championship") {
      context += "Championship excitement elevated community visibility. ";
    } else if (sportsSeason === "playoffs") {
      context += "Playoff energy increased neighborhood activity. ";
    }

    if (dynamics.culturalActivity >= 1.4) {
      context += "High cultural activity supported their emergence. ";
    }

    if (dynamics.communityEngagement >= 1.4) {
      context += "Strong community engagement welcomed their presence. ";
    }

    newRow[iLife] = `Promoted from Tier-4 to Tier-3 in Cycle ${cycle}. Settled in ${neigh}. ${context}`;
    newRow[iCreatedAt] = ctx.now;
    newRow[iLastUpdated] = ctx.now;
    newRow[iOriginVault] = "Engine";

    // ═══════════════════════════════════════════════════════════════════════
    // WRITE TO LEDGER
    // ═══════════════════════════════════════════════════════════════════════
    const writeRow = ledger.getLastRow() + 1;
    ledger.getRange(writeRow, 1, 1, newRow.length).setValues([newRow]);

    // ═══════════════════════════════════════════════════════════════════════
    // LOG EVENT
    // ═══════════════════════════════════════════════════════════════════════
    if (logSheet) {
      logSheet.appendRow([
        ctx.now,
        popId,
        (first + " " + last).trim(),
        "Promotion",
        `Emerged into Tier-3 in ${neigh}`,
        neigh,
        cycle
      ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MARK GENERIC SHEET
    // ═══════════════════════════════════════════════════════════════════════
    generic.getRange(r + 1, gStat + 1).setValue("Emerged");
    generic.getRange(r + 1, gEmer + 2).setValue(`Cycle ${cycle}`);
    generic.getRange(r + 1, gEmer + 3).setValue(context.trim());

    // Track for summary
    promotions.push({
      popId: popId,
      name: (first + " " + last).trim(),
      neighborhood: neigh,
      occupation: occ,
      calendarContext: {
        holiday: holiday,
        isFirstFriday: isFirstFriday,
        isCreationDay: isCreationDay,
        sportsSeason: sportsSeason
      }
    });

    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
  }

  // Summary
  S.promotions = promotions;
  S.promotionsCount = promotions.length;
  ctx.summary = S;
}


/**
 * ============================================================================
 * PROMOTION ENGINE REFERENCE
 * ============================================================================
 * 
 * BASE CHANCE: 0.20 (20%)
 * EMERGENCE THRESHOLD: 3+
 * 
 * CHANCE MODIFIERS:
 * 
 * SEASONAL:
 * - Spring: +0.05
 * - Fall: +0.03
 * 
 * WEATHER:
 * - Impact ≥1.3: +0.02
 * - Perfect weather: +0.02
 * 
 * WORLD STATE:
 * - Chaos events: +0.04
 * - Positive sentiment: +0.03
 * - Negative sentiment: -0.02
 * - Good economy: +0.02
 * - Bad economy: -0.02
 * 
 * CALENDAR MODIFIERS (v2.2):
 * 
 * | Factor | Effect |
 * |--------|--------|
 * | Gathering holidays | +0.03 |
 * | Cultural holidays | +0.04 |
 * | Oakland holidays | +0.05 |
 * | Major holiday priority | +0.02 |
 * | First Friday | +0.04 |
 * | FF + arts neighborhood | +0.03 additional |
 * | FF + creative occupation | +0.03 additional |
 * | Creation Day | +0.05 |
 * | Championship | +0.04 |
 * | Playoffs | +0.02 |
 * | High cultural activity | +0.03 |
 * | High community engagement | +0.03 |
 * | Low community engagement | -0.02 |
 * | Quiet holidays | -0.03 |
 * 
 * CHANCE CAP: 0.05 - 0.45
 * 
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave (v2.2)
 * 
 * ARTS NEIGHBORHOODS (First Friday bonus):
 * - Uptown, KONO, Temescal, Jack London
 * 
 * CREATIVE OCCUPATIONS (First Friday bonus):
 * - artist, musician, designer, writer, performer
 * 
 * LIFEHISTORY CONTEXT:
 * - Includes holiday, First Friday, Creation Day, sports season notes
 * - Contextualizes emergence within city calendar
 * 
 * ============================================================================
 */