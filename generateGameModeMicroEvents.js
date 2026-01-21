/**
 * ============================================================================
 * generateGameModeMicroEvents_ v1.0
 * ============================================================================
 *
 * Micro-events for GAME mode citizens (public figures).
 * These citizens are protected from structural changes (migration, job changes)
 * but still live lives and generate background events.
 *
 * TARGET: ClockMode === "GAME" citizens
 * - MLB players (UNI flag, positions like SP, CF, 1B, etc.)
 * - Media staff (MED flag - journalists, editors, photographers)
 * - Civic officials (CIV flag - mayor, council, staff)
 * - Other GAME citizens (Lucia Polito, etc.)
 *
 * DOES NOT TOUCH:
 * - Jobs / RoleType
 * - Tier
 * - Neighborhood (no migration)
 * - Status (except reading it)
 * - Any structural data
 *
 * ONLY ADDS: LifeHistory flavor notes appropriate to public figures
 *
 * Calendar-aware with GodWorld Calendar integration.
 * 
 * ============================================================================
 */

function generateGameModeMicroEvents_(ctx) {

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
  const iRole = idx('RoleType');
  const iStatus = idx('Status');
  const iLife = idx('LifeHistory');
  const iLastUpd = idx('LastUpdated') >= 0 ? idx('LastUpdated') : idx('Last Updated');
  const iOriginGame = idx('OriginGame');

  const S = ctx.summary;
  const cycle = S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const season = S.season || 'Spring';
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  const econMood = S.economicMood || 50;

  // Calendar context
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  let eventCount = 0;
  const EVENT_LIMIT = 15; // Slightly higher since these are notable citizens

  // ═══════════════════════════════════════════════════════════════════════════
  // MLB PLAYER POOLS (UNI + MLB The Show origin)
  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE: Training, rehab, game performance events come from INTAKE (gameplay data)
  // Engine only generates life/public figure events that don't require game knowledge
  
  const mlbPublic = [
    "signed autographs for fans",
    "did a brief media availability",
    "posed for photos with young fans",
    "participated in a community appearance",
    "attended a team marketing event",
    "fulfilled a sponsor obligation",
    "appeared at a charity function",
    "did a radio interview"
  ];

  const mlbPersonal = [
    "spent downtime away from the ballpark",
    "caught up with family via video call",
    "enjoyed a quiet meal in the city",
    "stepped away from baseball briefly",
    "ran personal errands around town",
    "spent time with friends outside the game",
    "enjoyed an off-day in Oakland"
  ];

  const mlbTeamLife = [
    "joined teammates for a team meal",
    "participated in clubhouse conversations",
    "connected with younger players",
    "shared a laugh with teammates"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA STAFF POOLS (MED flag)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const mediaWork = [
    "worked on developing a story lead",
    "conducted background interviews",
    "reviewed notes from recent events",
    "collaborated with editorial on coverage",
    "filed copy under deadline pressure",
    "fact-checked a developing story"
  ];

  const mediaPublic = [
    "attended a press conference",
    "participated in a media availability",
    "represented the paper at an event",
    "networked with industry contacts"
  ];

  const mediaPersonal = [
    "decompressed after a long news cycle",
    "caught up on industry reading",
    "reflected on recent coverage decisions",
    "maintained source relationships quietly"
  ];

  // Role-specific media pools
  const editorPool = [
    "reviewed the day's editorial priorities",
    "made tough decisions on story placement",
    "mentored a younger staff member",
    "navigated internal editorial discussions"
  ];

  const reporterPool = [
    "followed up on a tip",
    "built rapport with a new source",
    "spent time in the field gathering details",
    "attended a community meeting for coverage"
  ];

  const columnistPool = [
    "drafted thoughts for an upcoming column",
    "engaged with reader feedback",
    "considered a provocative angle",
    "reflected on the week's events"
  ];

  const photographerPool = [
    "scouted locations for upcoming shoots",
    "edited images from recent assignments",
    "captured candid moments around town",
    "maintained equipment between assignments"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CIVIC OFFICIAL POOLS (CIV flag)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const civicWork = [
    "reviewed briefing materials",
    "attended internal policy meetings",
    "consulted with department heads",
    "prepared for upcoming public sessions",
    "addressed constituent concerns"
  ];

  const civicPublic = [
    "made a brief public appearance",
    "spoke with community members",
    "attended a neighborhood event",
    "represented the city at a function",
    "fielded questions from local media"
  ];

  const civicPersonal = [
    "found a quiet moment between obligations",
    "balanced public duties with personal time",
    "reflected on the weight of public service",
    "maintained composure under public scrutiny"
  ];

  // Role-specific civic pools
  const mayorPool = [
    "navigated competing political pressures",
    "considered long-term city priorities",
    "met with key stakeholders privately"
  ];

  const councilPool = [
    "prepared for council deliberations",
    "met with district constituents",
    "reviewed proposed legislation"
  ];

  const staffPool = [
    "coordinated across departments",
    "managed logistics for upcoming events",
    "handled sensitive communications"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL PUBLIC FIGURE POOLS (any GAME citizen)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const publicFigureGeneral = [
    "navigated being recognized in public",
    "maintained public composure",
    "handled attention with practiced ease",
    "found a moment of privacy",
    "managed the demands of public life"
  ];

  const publicFigurePersonal = [
    "enjoyed a rare quiet evening",
    "connected with close friends",
    "took time for personal wellness",
    "stepped back from the spotlight briefly",
    "appreciated a normal moment"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON CONTEXT POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE: These are atmosphere/mood events, not performance events
  // Actual game results come from INTAKE
  
  const championshipPool = [
    "felt the city's championship energy",
    "navigated heightened media attention",
    "noticed more fans recognizing them"
  ];

  const playoffPool = [
    "felt the city's postseason energy",
    "noticed increased media presence",
    "sensed the heightened expectations"
  ];

  const offseasonPool = [
    "enjoyed the slower offseason pace",
    "appreciated time away from the spotlight",
    "recharged during the break"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY CONTEXT POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const holidayPublicPool = {
    "Thanksgiving": ["participated in a holiday community event"],
    "Holiday": ["attended a holiday charity function"],
    "NewYear": ["reflected publicly on the year ahead"],
    "Independence": ["appeared at a civic celebration"],
    "OpeningDay": ["felt the excitement of Opening Day"],
    "Juneteenth": ["participated in community observance"],
    "MemorialDay": ["honored the occasion publicly"],
    "LaborDay": ["acknowledged workers at a public event"],
    "VeteransDay": ["paid respects at a veterans event"]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER: Detect citizen type
  // ═══════════════════════════════════════════════════════════════════════════
  
  function getCitizenType(row) {
    const isUNI = (row[iUNI] || "").toString().toLowerCase() === "yes" || 
                  (row[iUNI] || "").toString().toLowerCase() === "y";
    const isMED = (row[iMED] || "").toString().toLowerCase() === "yes" || 
                  (row[iMED] || "").toString().toLowerCase() === "y";
    const isCIV = (row[iCIV] || "").toString().toLowerCase() === "yes" || 
                  (row[iCIV] || "").toString().toLowerCase() === "y";
    const origin = (row[iOriginGame] || "").toString();
    const role = (row[iRole] || "").toString();
    
    if (isUNI || origin.indexOf("MLB") >= 0) {
      // Determine if pitcher or position player
      const pitcherRoles = ["SP", "RP", "CL", "CP"];
      if (pitcherRoles.includes(role)) {
        return "mlb-pitcher";
      }
      return "mlb-position";
    }
    
    if (isMED) {
      // Determine media role type
      const roleLower = role.toLowerCase();
      if (roleLower.indexOf("editor") >= 0 || roleLower.indexOf("chief") >= 0) {
        return "media-editor";
      }
      if (roleLower.indexOf("columnist") >= 0) {
        return "media-columnist";
      }
      if (roleLower.indexOf("photographer") >= 0) {
        return "media-photographer";
      }
      return "media-reporter";
    }
    
    if (isCIV) {
      const roleLower = role.toLowerCase();
      if (roleLower.indexOf("mayor") >= 0) {
        return "civic-mayor";
      }
      if (roleLower.indexOf("council") >= 0 || roleLower.indexOf("caucus") >= 0) {
        return "civic-council";
      }
      return "civic-staff";
    }
    
    return "public-figure";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER: Build event pool for citizen type
  // ═══════════════════════════════════════════════════════════════════════════
  
  function buildEventPool(citizenType) {
    let pool = [...publicFigureGeneral, ...publicFigurePersonal];
    
    switch (citizenType) {
      case "mlb-pitcher":
      case "mlb-position":
        // MLB players get public/personal/team life events only
        // Training, rehab, performance events come from INTAKE
        pool = [...pool, ...mlbPublic, ...mlbPersonal, ...mlbTeamLife];
        break;
      case "media-editor":
        pool = [...pool, ...mediaWork, ...mediaPublic, ...mediaPersonal, ...editorPool];
        break;
      case "media-reporter":
        pool = [...pool, ...mediaWork, ...mediaPublic, ...mediaPersonal, ...reporterPool];
        break;
      case "media-columnist":
        pool = [...pool, ...mediaWork, ...mediaPublic, ...mediaPersonal, ...columnistPool];
        break;
      case "media-photographer":
        pool = [...pool, ...mediaWork, ...mediaPublic, ...mediaPersonal, ...photographerPool];
        break;
      case "civic-mayor":
        pool = [...pool, ...civicWork, ...civicPublic, ...civicPersonal, ...mayorPool];
        break;
      case "civic-council":
        pool = [...pool, ...civicWork, ...civicPublic, ...civicPersonal, ...councilPool];
        break;
      case "civic-staff":
        pool = [...pool, ...civicWork, ...civicPublic, ...civicPersonal, ...staffPool];
        break;
      default:
        // Generic public figure
        break;
    }
    
    // Add sports season ATMOSPHERE context for MLB (not performance)
    if (citizenType.startsWith("mlb-")) {
      if (sportsSeason === "championship") {
        pool = [...pool, ...championshipPool];
      } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
        pool = [...pool, ...playoffPool];
      } else if (sportsSeason === "off-season") {
        pool = [...pool, ...offseasonPool];
      }
    }
    
    // Add holiday context
    if (holiday !== "none" && holidayPublicPool[holiday]) {
      pool = [...pool, ...holidayPublicPool[holiday]];
    }
    
    return pool;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER: Determine event tag
  // ═══════════════════════════════════════════════════════════════════════════
  
  function getEventTag(pick, citizenType) {
    // Check specific pools
    if (mlbPublic.includes(pick) || mediaPublic.includes(pick) || civicPublic.includes(pick)) {
      return "Public";
    }
    if (mlbTeamLife.includes(pick)) {
      return "Team";
    }
    if (mediaWork.includes(pick) || editorPool.includes(pick) || reporterPool.includes(pick) || 
        columnistPool.includes(pick) || photographerPool.includes(pick)) {
      return "Work";
    }
    if (civicWork.includes(pick) || mayorPool.includes(pick) || councilPool.includes(pick) || staffPool.includes(pick)) {
      return "Civic";
    }
    if (championshipPool.includes(pick) || playoffPool.includes(pick) || offseasonPool.includes(pick)) {
      return "Season";
    }
    if (mlbPersonal.includes(pick) || mediaPersonal.includes(pick) || civicPersonal.includes(pick) || 
        publicFigurePersonal.includes(pick)) {
      return "Personal";
    }
    
    // Check holiday pools
    for (const h in holidayPublicPool) {
      if (holidayPublicPool[h].includes(pick)) {
        return "Holiday";
      }
    }
    
    return "Life";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  
  for (let r = 0; r < rows.length; r++) {

    if (eventCount >= EVENT_LIMIT) break;

    const row = rows[r];

    const popId = (row[iPopID] || "").toString();
    const mode = (row[iClock] || "").toString().trim().toUpperCase();
    const status = (row[iStatus] || "").toString().trim().toLowerCase();
    const first = (row[iFirst] || "").toString();
    const last = (row[iLast] || "").toString();
    const tier = Number(row[iTier] || 4);

    // ONLY process GAME mode citizens
    if (mode !== "GAME") continue;
    
    // Skip inactive/deceased
    if (status === "inactive" || status === "deceased" || status === "retired") continue;
    
    // Skip institutional entries (Ethics Commission, Elections Office, etc.)
    if (!first || first === last) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BASE CHANCE (higher for public figures, varies by tier)
    // ═══════════════════════════════════════════════════════════════════════
    let chance = 0.04; // Base 4%
    
    // Tier modifiers - higher tier = more visible = more events
    if (tier === 1) chance += 0.02;
    else if (tier === 2) chance += 0.01;

    // Weather modifiers
    if (weather.impact >= 1.3) chance += 0.005;
    
    // Chaos increases public figure activity
    if (chaos.length > 0) chance += 0.01;

    // City sentiment affects public figures
    if (Math.abs(dynamics.sentiment) >= 0.3) chance += 0.01;

    // Calendar modifiers
    if (holidayPriority === "major" || holidayPriority === "oakland") chance += 0.01;
    if (isFirstFriday) chance += 0.005;
    
    // Sports season affects MLB players
    const citizenType = getCitizenType(row);
    if (citizenType.startsWith("mlb-")) {
      if (sportsSeason === "championship") chance += 0.02;
      else if (sportsSeason === "playoffs" || sportsSeason === "post-season") chance += 0.015;
      else if (sportsSeason === "regular") chance += 0.01;
    }

    // Cap chance
    if (chance > 0.15) chance = 0.15;

    if (Math.random() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD AND SELECT EVENT
    // ═══════════════════════════════════════════════════════════════════════
    
    const pool = buildEventPool(citizenType);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const tag = getEventTag(pick, citizenType);

    const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    const line = `${stamp} — [${tag}] ${pick}`;

    // Append to LifeHistory
    const existing = row[iLife] ? row[iLife].toString() : "";
    row[iLife] = existing ? existing + "\n" + line : line;

    if (iLastUpd >= 0) {
      row[iLastUpd] = ctx.now;
    }

    // Log entry
    if (logSheet) {
      logSheet.appendRow([
        ctx.now,
        popId,
        (first + " " + last).trim(),
        "GAME-Micro",
        pick,
        citizenType,
        cycle
      ]);
    }

    rows[r] = row;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    eventCount++;
  }

  // Write updates back
  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  
  // Summary
  S.gameModeMicroEvents = eventCount;
  ctx.summary = S;
}


/**
 * ============================================================================
 * GAME MODE MICRO-EVENTS REFERENCE v1.0
 * ============================================================================
 * 
 * Target: ClockMode === "GAME" citizens (public figures)
 * Limit: 15 events per cycle
 * 
 * IMPORTANT: This engine does NOT generate training, rehab, or performance
 * events. Those come from INTAKE when you play MLB The Show games.
 * This engine only generates life/public figure events.
 * 
 * CITIZEN TYPES DETECTED:
 * - mlb-pitcher (SP, RP, CL, CP)
 * - mlb-position (all other MLB)
 * - media-editor (Editor-in-Chief, etc.)
 * - media-reporter (Field Reporter, Lead Journalist)
 * - media-columnist (Columnist)
 * - media-photographer (Photographer)
 * - civic-mayor (Mayor)
 * - civic-council (Council, Caucus Leader)
 * - civic-staff (Chief of Staff, Directors, etc.)
 * - public-figure (other GAME citizens)
 * 
 * MLB EVENTS (engine-generated):
 * - Public: autographs, media, charity, sponsors
 * - Team: meals, clubhouse conversations
 * - Personal: family, downtime, off-days
 * - Season: atmosphere/mood (not performance)
 * 
 * MLB EVENTS (INTAKE only - NOT generated here):
 * - Training, batting practice, bullpen sessions
 * - Rehab, injury updates
 * - Game performance, stats
 * - Lineup changes, roster moves
 * 
 * BASE CHANCE: 0.04 (4%)
 * 
 * CHANCE MODIFIERS:
 * | Factor | Effect |
 * |--------|--------|
 * | Tier 1 | +0.02 |
 * | Tier 2 | +0.01 |
 * | Weather impact ≥1.3 | +0.005 |
 * | Chaos events | +0.01 |
 * | High/low sentiment | +0.01 |
 * | Major/Oakland holiday | +0.01 |
 * | First Friday | +0.005 |
 * | Championship (MLB) | +0.02 |
 * | Playoffs (MLB) | +0.015 |
 * | Regular season (MLB) | +0.01 |
 * 
 * CHANCE CAP: 0.15 (15%)
 * 
 * EVENT TAGS:
 * - Public (appearances, media, fans)
 * - Team (clubhouse, teammates)
 * - Work (media/civic duties)
 * - Civic (government duties)
 * - Season (atmosphere only)
 * - Personal (downtime, family)
 * - Holiday (holiday appearances)
 * - Life (general public figure)
 * 
 * PROTECTED DATA (never modified):
 * - RoleType / Job
 * - Tier
 * - Neighborhood
 * - ClockMode
 * - Status (only read)
 * 
 * ============================================================================
 */