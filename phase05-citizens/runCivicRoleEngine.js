/**
 * ============================================================================
 * Civic Role Engine v2.2
 * ============================================================================
 * 
 * Calendar-aware, sentiment-aware, weather-aware civic status observer.
 * Logs CIV citizens with contextual civic notes.
 * Preserves Maker authority. Never modifies status.
 * 
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods
 * - Holiday-specific civic notes (MLK Day, Juneteenth, etc.)
 * - First Friday civic presence
 * - Creation Day civic reflection
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Oakland civic context integrated.
 * 
 * ============================================================================
 */

function runCivicRoleEngine_(ctx) {

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
  var iCIV = idx('CIV (y/n)');
  var iStatus = idx('Status');
  var iLife = idx('LifeHistory');
  var iLastUpd = idx('LastUpdated');
  var iNeighborhood = idx('Neighborhood');
  var iTierRole = idx('TierRole');

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL WORLD CONDITIONS
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
  var econMood = S.economicMood || 50;
  var cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD CIVIC NOTES (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodCivicNotes = {
    'Downtown': [
      "City Hall activity continues in Downtown.",
      "Civic presence noted in the government district.",
      "Administrative matters proceeding at City Hall."
    ],
    'Fruitvale': [
      "Community civic engagement active in Fruitvale.",
      "Local civic matters addressed in Fruitvale.",
      "Neighborhood council activity in Fruitvale."
    ],
    'West Oakland': [
      "Infrastructure discussions ongoing in West Oakland.",
      "Development civic matters in focus.",
      "Community development meetings continue."
    ],
    'Temescal': [
      "Community board activity noted in Temescal.",
      "Local civic engagement continues.",
      "Neighborhood matters under discussion."
    ],
    'Lake Merritt': [
      "Parks and recreation civic matters active.",
      "Civic presence around Lake Merritt noted.",
      "Lakeside community initiatives proceeding."
    ],
    'Rockridge': [
      "Neighborhood association activity in Rockridge.",
      "Local civic matters under review.",
      "Community planning discussions ongoing."
    ],
    'Laurel': [
      "Quiet civic engagement in Laurel district.",
      "Community matters progressing steadily.",
      "Local initiatives moving forward."
    ],
    'Jack London': [
      "Waterfront civic development discussions ongoing.",
      "Arts district civic matters in focus.",
      "Maritime and development coordination continues."
    ],
    'Uptown': [
      "Arts district civic coordination active.",
      "Cultural affairs receiving civic attention.",
      "Urban development matters under review."
    ],
    'KONO': [
      "Creative district civic matters addressed.",
      "Community arts initiatives proceeding.",
      "Local zoning discussions continue."
    ],
    'Chinatown': [
      "Cultural preservation matters in focus.",
      "Community civic engagement active in Chinatown.",
      "Neighborhood business affairs addressed."
    ],
    'Piedmont Ave': [
      "Local business district matters reviewed.",
      "Neighborhood association activity noted.",
      "Community planning discussions ongoing."
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE-SPECIFIC CIVIC NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  var roleCivicNotes = {
    'council': [
      "Council responsibilities continue.",
      "Legislative matters under consideration.",
      "Council session activity noted."
    ],
    'mayor': [
      "Executive civic duties ongoing.",
      "City leadership matters in focus.",
      "Mayoral initiatives proceeding."
    ],
    'commissioner': [
      "Commission oversight continues.",
      "Regulatory matters under review.",
      "Commission hearings proceeding."
    ],
    'director': [
      "Department operations proceeding.",
      "Administrative civic duties ongoing.",
      "Departmental coordination continues."
    ],
    'chief': [
      "Department leadership active.",
      "Operational oversight continues.",
      "Executive department matters addressed."
    ],
    'superintendent': [
      "Educational oversight continues.",
      "School district matters in focus.",
      "Administrative duties proceeding."
    ],
    'attorney': [
      "Legal civic matters under review.",
      "City legal affairs proceeding.",
      "Legal counsel duties ongoing."
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY-SPECIFIC CIVIC NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayCivicNotes = {
    'MLKDay': [
      "MLK Day observance duties fulfilled.",
      "Civil rights commemoration activities attended.",
      "Community service events participated in."
    ],
    'Juneteenth': [
      "Juneteenth civic observances attended.",
      "Cultural celebration civic presence noted.",
      "Community commemoration duties fulfilled."
    ],
    'Independence': [
      "July Fourth civic duties fulfilled.",
      "Holiday civic presence maintained.",
      "Public celebration oversight continues."
    ],
    'MemorialDay': [
      "Memorial Day observances attended.",
      "Veterans commemoration duties fulfilled.",
      "Civic memorial presence noted."
    ],
    'VeteransDay': [
      "Veterans Day civic observances attended.",
      "Military appreciation events participated in.",
      "Civic commemoration duties fulfilled."
    ],
    'BlackHistoryMonth': [
      "Black History Month civic programming attended.",
      "Cultural heritage events supported.",
      "Community education initiatives participated in."
    ],
    'PrideMonth': [
      "Pride Month civic events attended.",
      "Community celebration support provided.",
      "Inclusive civic engagement demonstrated."
    ],
    'OaklandPride': [
      "Oakland Pride civic presence maintained.",
      "Community celebration officially represented.",
      "Civic support for Pride demonstrated."
    ],
    'EarthDay': [
      "Earth Day civic initiatives attended.",
      "Environmental programming supported.",
      "Sustainability civic duties fulfilled."
    ],
    'IndigenousPeoplesDay': [
      "Indigenous Peoples Day observances attended.",
      "Cultural recognition civic duties fulfilled.",
      "Community acknowledgment events participated in."
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY CIVIC NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var firstFridayCivicNotes = [
    "First Friday cultural affairs oversight maintained.",
    "Arts community civic engagement noted.",
    "Cultural district coordination continues.",
    "Community arts programming supported."
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY CIVIC NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var creationDayCivicNotes = [
    "Reflected on the city's foundational values.",
    "Civic responsibilities feel particularly meaningful today.",
    "Sense of duty to community origins renewed.",
    "Foundational civic commitments reaffirmed."
  ];

  var events = 0;
  var LIMIT = 6;

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE THROUGH CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (var r = 0; r < rows.length; r++) {

    if (events >= LIMIT) break;

    var row = rows[r];
    var civFlag = (row[iCIV] || "").toString().toLowerCase();
    if (civFlag !== "y") continue;

    var status = (row[iStatus] || "").toString().trim().toLowerCase();
    var name = (row[iFirst] + " " + row[iLast]).trim();
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';
    var tierRole = iTierRole >= 0 ? (row[iTierRole] || '').toString().toLowerCase() : '';

    var baseNote = "";
    var shouldLog = false;

    // ═══════════════════════════════════════════════════════════════════════
    // MAKER-DEFINED CIVIC STATUSES
    // ═══════════════════════════════════════════════════════════════════════
    if (status === "retired") {
      baseNote = "Civic role recorded as retired.";
      shouldLog = true;
    }
    else if (status === "resigned") {
      baseNote = "Civic role recorded as resigned.";
      shouldLog = true;
    }
    else if (status === "scandal") {
      baseNote = "Civic figure listed under scandal.";
      shouldLog = true;
    }
    else if (status === "active") {
      // Active CIV citizens get occasional soft civic notes
      var chance = 0.015;

      // Base modifiers
      if (chaos.length > 0) chance += 0.01;
      if (dynamics.sentiment <= -0.3) chance += 0.01;
      if (econMood <= 35) chance += 0.005;
      if (season === "Fall") chance += 0.005; // Election season

      // Holiday priority boost (v2.2)
      if (holidayPriority === "major") chance += 0.01;
      else if (holidayPriority === "cultural") chance += 0.008;
      else if (holidayPriority === "oakland") chance += 0.008;

      // Civic holidays boost (v2.2)
      if (holiday === "MLKDay" || holiday === "Juneteenth" || holiday === "VeteransDay" ||
          holiday === "MemorialDay" || holiday === "IndigenousPeoplesDay") {
        chance += 0.015;
      }

      // First Friday boost (v2.2)
      if (isFirstFriday) chance += 0.008;

      // Creation Day boost (v2.2)
      if (isCreationDay) chance += 0.01;

      // Community engagement boost (v2.2)
      if (dynamics.communityEngagement >= 1.3) chance += 0.005;

      if (chance > 0.08) chance = 0.08;

      if (Math.random() < chance) {
        // Build pool of civic notes
        var pool = [
          "Continuing civic responsibilities.",
          "Public engagement ongoing.",
          "Civic duties proceeding normally."
        ];

        // Add role-specific notes
        var roleKeys = Object.keys(roleCivicNotes);
        for (var k = 0; k < roleKeys.length; k++) {
          var roleKey = roleKeys[k];
          if (tierRole.indexOf(roleKey) >= 0) {
            pool = pool.concat(roleCivicNotes[roleKey]);
            break;
          }
        }

        // Add neighborhood-specific notes
        if (neighborhood && neighborhoodCivicNotes[neighborhood]) {
          pool = pool.concat(neighborhoodCivicNotes[neighborhood]);
        }

        // Add holiday-specific notes (v2.2)
        if (holiday !== "none" && holidayCivicNotes[holiday]) {
          pool = pool.concat(holidayCivicNotes[holiday]);
        }

        // Add First Friday notes (v2.2)
        if (isFirstFriday) {
          pool = pool.concat(firstFridayCivicNotes);
        }

        // Add Creation Day notes (v2.2)
        if (isCreationDay) {
          pool = pool.concat(creationDayCivicNotes);
        }

        baseNote = pool[Math.floor(Math.random() * pool.length)];
        shouldLog = true;
      }
    }

    if (!shouldLog) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // CONTEXTUAL MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    var context = "";

    // Season influence
    if (season === "Spring") context += " Spring civic activity increases attention.";
    if (season === "Fall") context += " Fall civic cycle heightens public interest.";

    // Holiday influence (expanded v2.2)
    if (holiday === "Independence") context += " Holiday period amplifies civic visibility.";
    if (holiday === "MLKDay") context += " MLK Day brings civic reflection.";
    if (holiday === "Juneteenth") context += " Juneteenth celebration heightens civic awareness.";
    if (holiday === "VeteransDay" || holiday === "MemorialDay") context += " Observance day brings civic solemnity.";

    // First Friday influence (v2.2)
    if (isFirstFriday) context += " First Friday brings cultural civic focus.";

    // Creation Day influence (v2.2)
    if (isCreationDay) context += " Foundational day deepens civic meaning.";

    // Weather influence
    if (weather.type === "rain") context += " Rainy conditions tempered public engagement.";
    if (weather.type === "fog") context += " Foggy conditions muted civic presence.";

    // Weather mood
    if (weatherMood.irritabilityFactor && weatherMood.irritabilityFactor > 0.3) {
      context += " Public mood shows strain.";
    }

    // Chaos influence
    if (chaos.length > 0) context += " Recent events shifted civic atmosphere.";

    // Public sentiment
    if (dynamics.sentiment >= 0.3) context += " Public sentiment remains positive.";
    if (dynamics.sentiment <= -0.3) context += " Public sentiment shows tension.";

    // Community engagement (v2.2)
    if (dynamics.communityEngagement >= 1.4) context += " High community engagement noted.";

    // Cultural activity (v2.2)
    if (dynamics.culturalActivity >= 1.4) context += " Cultural vibrancy enhances civic atmosphere.";

    // Economic context
    if (econMood <= 35) context += " Economic concerns affect civic priorities.";
    if (econMood >= 65) context += " Economic optimism supports civic agenda.";

    var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

    var existing = row[iLife] ? row[iLife].toString() : "";
    var finalLine = stamp + " — [Civic Role] " + baseNote + context;

    row[iLife] = existing ? existing + "\n" + finalLine : finalLine;
    row[iLastUpd] = ctx.now;

    // Log to LifeHistory_Log
    if (logSheet) {
      logSheet.appendRow([
        ctx.now,
        row[iPopID],
        name,
        "CivicRole",
        baseNote + context,
        neighborhood || "Engine",
        cycle
      ]);
    }

    rows[r] = row;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    events++;
  }

  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  
  // Summary
  S.civicRoleEvents = events;
  ctx.summary = S;
}


/**
 * ============================================================================
 * CIVIC HOLIDAY REFERENCE
 * ============================================================================
 * 
 * Holiday             | Civic Notes
 * ─────────────────────────────────────────────────────────────────────────
 * MLKDay              | Civil rights commemoration
 * Juneteenth          | Cultural celebration civic presence
 * Independence        | July Fourth duties
 * MemorialDay         | Veterans commemoration
 * VeteransDay         | Military appreciation
 * BlackHistoryMonth   | Cultural heritage support
 * PrideMonth          | Inclusive civic engagement
 * OaklandPride        | Community celebration representation
 * EarthDay            | Environmental initiatives
 * IndigenousPeoplesDay| Cultural recognition
 * 
 * ============================================================================
 * 
 * ROLE KEYWORDS:
 * council, mayor, commissioner, director, chief, superintendent, attorney
 * 
 * ============================================================================
 */