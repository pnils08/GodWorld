/**
 * ============================================================================
 * checkForPromotions_ v2.3
 * ============================================================================
 *
 * Promotion engine for Generic_Citizens → Simulation_Ledger.
 * World-aware with Oakland neighborhood integration and GodWorld Calendar.
 *
 * v2.3 Fixes:
 * - POPID collision fix: compute maxN once, increment in-memory
 * - Deterministic neighborhood mapping (no more random fallback)
 * - Required ledger column guard (prevents silent bad writes)
 * - Header-based Generic writes (no offset assumptions)
 * - BirthYear preservation (prefer Generic_Citizens value if exists)
 * - UNI/MED/CIV values match ledger convention ("no" not "n")
 * - ES5 compatible
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

  var ss = ctx.ss;

  var generic = ss.getSheetByName("Generic_Citizens");
  var ledger = ss.getSheetByName("Simulation_Ledger");
  var logSheet = ss.getSheetByName("LifeHistory_Log");

  if (!generic || !ledger) return;

  var gVals = generic.getDataRange().getValues();
  var gHeader = gVals[0];

  // v2.3: ES5-safe header lookup
  function idxG(n) {
    for (var i = 0; i < gHeader.length; i++) {
      if (gHeader[i] === n) return i;
    }
    return -1;
  }

  var gFirst = idxG("First");
  var gLast = idxG("Last");
  var gAge = idxG("Age");
  var gBirthYear = idxG("BirthYear");  // v2.3: Track BirthYear column
  var gNeigh = idxG("Neighborhood");
  var gOcc = idxG("Occupation");
  var gEmer = idxG("EmergenceCount");
  var gStat = idxG("Status");
  // v2.3: Optional columns for emergence tracking
  var gEmergedCycle = idxG("EmergedCycle");
  var gEmergenceContext = idxG("EmergenceContext");

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary || {};
  var season = S.season || "";
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var econMood = S.economicMood || 50;
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  // Calendar context (v2.2)
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // Use simYear or calculate from cycle (52 cycles = 1 year)
  var simYear = S.simYear || (2040 + Math.floor(cycle / 52));

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOODS (12 - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var validNeighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  // Arts-focused neighborhoods for First Friday bonus
  var artsNeighborhoods = ["Uptown", "KONO", "Temescal", "Jack London"];

  // Ledger structure
  var lVals = ledger.getDataRange().getValues();
  var lHeader = lVals[0];

  // v2.3: ES5-safe header lookup
  function idxL(n) {
    for (var i = 0; i < lHeader.length; i++) {
      if (lHeader[i] === n) return i;
    }
    return -1;
  }

  var iPopID = idxL("POPID");
  var iFirst = idxL("First");
  var iMiddle = idxL("Middle");
  var iLast = idxL("Last");
  var iOriginGame = idxL("OriginGame");
  var iUNI = idxL("UNI (y/n)");
  var iMED = idxL("MED (y/n)");
  var iCIV = idxL("CIV (y/n)");
  var iClock = idxL("ClockMode");
  var iTier = idxL("Tier");
  var iRoleType = idxL("RoleType");
  var iStatus = idxL("Status");
  var iBirthYear = idxL("BirthYear");
  var iNeighborhood = idxL("Neighborhood");
  var iLife = idxL("LifeHistory");
  var iCreatedAt = idxL("CreatedAt");
  var iLastUpdated = idxL("LastUpdated");
  var iOriginVault = idxL("OriginVault");

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: REQUIRED COLUMN GUARD
  // ═══════════════════════════════════════════════════════════════════════════
  var requiredCols = [
    { name: "POPID", idx: iPopID },
    { name: "First", idx: iFirst },
    { name: "Last", idx: iLast },
    { name: "Tier", idx: iTier },
    { name: "Status", idx: iStatus }
  ];
  var missingCols = [];
  for (var rc = 0; rc < requiredCols.length; rc++) {
    if (requiredCols[rc].idx < 0) {
      missingCols.push(requiredCols[rc].name);
    }
  }
  if (missingCols.length > 0) {
    Logger.log("checkForPromotions_ v2.3: Missing required ledger columns: " + missingCols.join(", ") + " - aborting");
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: SAFE POPID GENERATOR (fixes collision when multiple promotions)
  // ═══════════════════════════════════════════════════════════════════════════
  var popCounter = 0;
  for (var pr = 1; pr < lVals.length; pr++) {
    var v = (lVals[pr][iPopID] || "").toString().trim();
    var m = v.match(/^POP-(\d+)$/);
    if (m) {
      var num = parseInt(m[1], 10);
      if (num > popCounter) popCounter = num;
    }
  }

  function nextPopId() {
    popCounter++;
    var padded = String(popCounter);
    while (padded.length < 5) padded = "0" + padded;
    return "POP-" + padded;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: DETERMINISTIC NEIGHBORHOOD VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  function validateNeighborhood(neigh) {
    neigh = (neigh || "").toString().trim();

    // Direct match
    if (validNeighborhoods.indexOf(neigh) >= 0) return neigh;

    // Deterministic mappings (from real Oakland neighborhoods to canon 12)
    var map = {
      "Eastlake": "Lake Merritt",
      "Adams Point": "Lake Merritt",
      "Grand Lake": "Lake Merritt",
      "Lakeshore": "Lake Merritt",
      "Ivy Hill": "Fruitvale",
      "San Antonio": "Fruitvale",
      "Dimond": "Laurel",
      "Glenview": "Laurel",
      "Maxwell Park": "Laurel",
      "Old Oakland": "Downtown",
      "City Center": "Downtown",
      "Jack London Square": "Jack London",
      "Koreatown-Northgate": "KONO",
      "Koreatown": "KONO",
      "Northgate": "KONO",
      "Montclair": "Rockridge",
      "Claremont": "Rockridge",
      "Longfellow": "Temescal",
      "Shafter": "Temescal",
      "Golden Gate": "West Oakland",
      "McClymonds": "West Oakland",
      "Prescott": "West Oakland",
      "Hoover-Foster": "West Oakland"
    };

    if (map[neigh]) return map[neigh];

    // v2.3: Deterministic fallback (no randomness)
    return "Downtown";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMOTION CHANCE MODIFIER (v2.2 - Calendar Aware)
  // ═══════════════════════════════════════════════════════════════════════════
  function promotionChance(base, row) {
    var c = base;
    var neigh = row[gNeigh] || "";
    var occ = (row[gOcc] || "").toString().toLowerCase();

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
    var gatheringHolidays = [
      "Thanksgiving", "Independence", "MemorialDay", "LaborDay"
    ];
    if (gatheringHolidays.indexOf(holiday) >= 0) {
      c += 0.03;
    }

    // Cultural celebration holidays boost emergence
    var culturalHolidays = [
      "Juneteenth", "CincoDeMayo", "DiaDeMuertos", "OaklandPride",
      "LunarNewYear", "MLKDay", "BlackHistoryMonth"
    ];
    if (culturalHolidays.indexOf(holiday) >= 0) {
      c += 0.04;
    }

    // Oakland-specific holidays provide strong boost
    var oaklandHolidays = ["OpeningDay", "OaklandPride", "ArtSoulFestival"];
    if (oaklandHolidays.indexOf(holiday) >= 0) {
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
      if (artsNeighborhoods.indexOf(neigh) >= 0) {
        c += 0.03;
      }
      // Extra boost for creative occupations
      var creativeOccs = ["artist", "musician", "designer", "writer", "performer"];
      for (var co = 0; co < creativeOccs.length; co++) {
        if (occ.indexOf(creativeOccs[co]) >= 0) {
          c += 0.03;
          break;
        }
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
    var quietHolidays = ["Holiday", "NewYear", "Easter"];
    if (quietHolidays.indexOf(holiday) >= 0) {
      c -= 0.03;
    }

    // Cap
    if (c > 0.45) c = 0.45;
    if (c < 0.05) c = 0.05;

    return c;
  }

  // Track promotions for summary
  var promotions = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  for (var r = 1; r < gVals.length; r++) {

    var row = gVals[r];
    var emergence = Number(row[gEmer] || 0);
    var status = (row[gStat] || "").toString();

    // Only active candidates
    if (status !== "Active") continue;

    // Must meet emergence threshold
    if (emergence < 3) continue;

    // World-aware promotion chance
    var chance = promotionChance(0.20, row);
    if (Math.random() > chance) continue;

    // === Promote to Tier-3 ===
    var first = row[gFirst] || "";
    var last = row[gLast] || "";
    var age = Number(row[gAge] || 30);
    var neigh = validateNeighborhood(row[gNeigh] || "Downtown");
    var occ = row[gOcc] || "Citizen";

    var popId = nextPopId();
    var newRow = [];
    for (var nr = 0; nr < lHeader.length; nr++) {
      newRow.push("");
    }

    // v2.3: Prefer Generic_Citizens BirthYear if exists and valid
    var birthYear = simYear - age;
    if (gBirthYear >= 0) {
      var sheetBirthYear = Number(row[gBirthYear] || 0);
      if (sheetBirthYear > 1900) {
        birthYear = sheetBirthYear;
      }
    }

    newRow[iPopID] = popId;
    newRow[iFirst] = first;
    if (iMiddle >= 0) newRow[iMiddle] = "";
    newRow[iLast] = last;
    if (iOriginGame >= 0) newRow[iOriginGame] = "";
    // v2.3: Use "no" to match ledger convention
    if (iUNI >= 0) newRow[iUNI] = "no";
    if (iMED >= 0) newRow[iMED] = "no";
    if (iCIV >= 0) newRow[iCIV] = "no";
    if (iClock >= 0) newRow[iClock] = "ENGINE";
    if (iTier >= 0) newRow[iTier] = 3;
    if (iRoleType >= 0) newRow[iRoleType] = occ;
    if (iStatus >= 0) newRow[iStatus] = "Active";
    if (iBirthYear >= 0) newRow[iBirthYear] = birthYear;

    if (iNeighborhood >= 0) {
      newRow[iNeighborhood] = neigh;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WORLD-AWARE LIFEHISTORY CONTEXT (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    var context = "";

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
      var holidayContextMap = {
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
      if (artsNeighborhoods.indexOf(neigh) >= 0) {
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

    if (iLife >= 0) {
      newRow[iLife] = "Promoted from Tier-4 to Tier-3 in Cycle " + cycle + ". Settled in " + neigh + ". " + context;
    }
    if (iCreatedAt >= 0) newRow[iCreatedAt] = ctx.now;
    if (iLastUpdated >= 0) newRow[iLastUpdated] = ctx.now;
    if (iOriginVault >= 0) newRow[iOriginVault] = "Engine";

    // ═══════════════════════════════════════════════════════════════════════
    // WRITE TO LEDGER
    // ═══════════════════════════════════════════════════════════════════════
    var writeRow = ledger.getLastRow() + 1;
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
        "Emerged into Tier-3 in " + neigh,
        neigh,
        cycle
      ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // v2.3: MARK GENERIC SHEET (header-based, no offset assumptions)
    // ═══════════════════════════════════════════════════════════════════════
    generic.getRange(r + 1, gStat + 1).setValue("Emerged");

    // Only write emergence tracking columns if they exist by header
    if (gEmergedCycle >= 0) {
      generic.getRange(r + 1, gEmergedCycle + 1).setValue("Cycle " + cycle);
    }
    if (gEmergenceContext >= 0) {
      generic.getRange(r + 1, gEmergenceContext + 1).setValue(context.trim());
    }

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

  if (promotions.length > 0) {
    Logger.log("checkForPromotions_ v2.3: " + promotions.length + " citizens promoted");
  }
}


/**
 * ============================================================================
 * PROMOTION ENGINE REFERENCE v2.3
 * ============================================================================
 *
 * v2.3 FIXES:
 * - POPID collision: compute maxN once, increment in-memory counter
 * - Deterministic neighborhood: expanded mappings, no random fallback
 * - Required column guard: aborts if POPID/First/Last/Tier/Status missing
 * - Header-based Generic writes: uses EmergedCycle/EmergenceContext by name
 * - BirthYear preservation: prefers Generic_Citizens value if > 1900
 * - UNI/MED/CIV: uses "no" to match ledger convention
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
 * - Uptown, KONO, Chinatown, Piedmont Ave
 *
 * NEIGHBORHOOD MAPPINGS (v2.3 - deterministic):
 * - Eastlake/Adams Point/Grand Lake/Lakeshore → Lake Merritt
 * - Ivy Hill/San Antonio → Fruitvale
 * - Dimond/Glenview/Maxwell Park → Laurel
 * - Old Oakland/City Center → Downtown
 * - Jack London Square → Jack London
 * - Koreatown-Northgate/Koreatown/Northgate → KONO
 * - Montclair/Claremont → Rockridge
 * - Longfellow/Shafter → Temescal
 * - Golden Gate/McClymonds/Prescott/Hoover-Foster → West Oakland
 * - Unknown → Downtown (deterministic fallback)
 *
 * ARTS NEIGHBORHOODS (First Friday bonus):
 * - Uptown, KONO, Temescal, Jack London
 *
 * CREATIVE OCCUPATIONS (First Friday bonus):
 * - artist, musician, designer, writer, performer
 *
 * GENERIC_CITIZENS OPTIONAL COLUMNS:
 * - EmergedCycle: written if header exists
 * - EmergenceContext: written if header exists
 *
 * ============================================================================
 */
