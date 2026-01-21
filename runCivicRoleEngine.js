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
  const iCIV = idx('CIV (y/n)');
  const iStatus = idx('Status');
  const iLife = idx('LifeHistory');
  const iLastUpd = idx('LastUpdated');
  const iNeighborhood = idx('Neighborhood');
  const iTierRole = idx('TierRole');

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL WORLD CONDITIONS
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD CIVIC NOTES (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodCivicNotes = {
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
  const roleCivicNotes = {
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
  const holidayCivicNotes = {
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
  const firstFridayCivicNotes = [
    "First Friday cultural affairs oversight maintained.",
    "Arts community civic engagement noted.",
    "Cultural district coordination continues.",
    "Community arts programming supported."
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY CIVIC NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const creationDayCivicNotes = [
    "Reflected on the city's foundational values.",
    "Civic responsibilities feel particularly meaningful today.",
    "Sense of duty to community origins renewed.",
    "Foundational civic commitments reaffirmed."
  ];

  let events = 0;
  const LIMIT = 6;

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE THROUGH CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (let r = 0; r < rows.length; r++) {

    if (events >= LIMIT) break;

    const row = rows[r];
    const civFlag = (row[iCIV] || "").toString().toLowerCase();
    if (civFlag !== "y") continue;

    const status = (row[iStatus] || "").toString().trim().toLowerCase();
    const name = (row[iFirst] + " " + row[iLast]).trim();
    const neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';
    const tierRole = iTierRole >= 0 ? (row[iTierRole] || '').toString().toLowerCase() : '';

    let baseNote = "";
    let shouldLog = false;

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
      let chance = 0.015;
      
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
        let pool = [
          "Continuing civic responsibilities.",
          "Public engagement ongoing.",
          "Civic duties proceeding normally."
        ];
        
        // Add role-specific notes
        for (const [roleKey, notes] of Object.entries(roleCivicNotes)) {
          if (tierRole.includes(roleKey)) {
            pool = [...pool, ...notes];
            break;
          }
        }
        
        // Add neighborhood-specific notes
        if (neighborhood && neighborhoodCivicNotes[neighborhood]) {
          pool = [...pool, ...neighborhoodCivicNotes[neighborhood]];
        }
        
        // Add holiday-specific notes (v2.2)
        if (holiday !== "none" && holidayCivicNotes[holiday]) {
          pool = [...pool, ...holidayCivicNotes[holiday]];
        }
        
        // Add First Friday notes (v2.2)
        if (isFirstFriday) {
          pool = [...pool, ...firstFridayCivicNotes];
        }
        
        // Add Creation Day notes (v2.2)
        if (isCreationDay) {
          pool = [...pool, ...creationDayCivicNotes];
        }
        
        baseNote = pool[Math.floor(Math.random() * pool.length)];
        shouldLog = true;
      }
    }

    if (!shouldLog) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // CONTEXTUAL MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════
    let context = "";

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

    const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

    const existing = row[iLife] ? row[iLife].toString() : "";
    const finalLine = `${stamp} — [Civic Role] ${baseNote}${context}`;

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