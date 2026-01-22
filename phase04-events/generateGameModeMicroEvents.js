/**
 * ============================================================================
 * generateGameModeMicroEvents_ v1.2 (schema-safe + per-cycle uniqueness)
 * ============================================================================
 * - Log schema unchanged
 * - Optional determinism (ctx.rng or ctx.config.rngSeed)
 * - Tagged entries (no includes scanning)
 * - Batch log writes
 * - NEW: per-cycle uniqueness per citizen (no duplicate picked.text for same popId)
 * ============================================================================
 */

function mulberry32_(seed) {
  return function rng() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    var t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateGameModeMicroEvents_(ctx) {
  const ss = ctx.ss;
  const ledger = ss.getSheetByName("Simulation_Ledger");
  const logSheet = ss.getSheetByName("LifeHistory_Log");
  if (!ledger) return;

  const values = ledger.getDataRange().getValues();
  if (values.length < 2) return;

  const header = values[0];
  const rows = values.slice(1);
  const idx = (n) => header.indexOf(n);

  const iPopID = idx("POPID");
  const iFirst = idx("First");
  const iLast = idx("Last");
  const iTier = idx("Tier");
  const iClock = idx("ClockMode");
  const iUNI = idx("UNI (y/n)");
  const iMED = idx("MED (y/n)");
  const iCIV = idx("CIV (y/n)");
  const iRole = idx("RoleType");
  const iStatus = idx("Status");
  const iLife = idx("LifeHistory");
  const iLastUpd = (idx("LastUpdated") >= 0) ? idx("LastUpdated") : idx("Last Updated");
  const iOriginGame = idx("OriginGame");

  if (iPopID < 0 || iClock < 0 || iStatus < 0 || iLife < 0) return;

  const S = ctx.summary || (ctx.summary = {});
  const cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  const rng = (typeof ctx.rng === "function")
    ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === "number")
      ? mulberry32_((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0))
      : Math.random;

  const roll = () => rng();
  const hit = (p) => roll() < p;
  const pickOne = (arr) => arr[Math.floor(roll() * arr.length)];

  // WORLD STATE
  const weather = S.weather || { type: "clear", impact: 1 };
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };

  // Calendar context
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = !!S.isFirstFriday;
  const isCreationDay = !!S.isCreationDay;
  const sportsSeason = S.sportsSeason || "off-season";

  const calendarTags = (() => {
    const t = [];
    if (holiday !== "none") t.push("holiday:" + holiday);
    if (holidayPriority !== "none") t.push("holidayPriority:" + holidayPriority);
    if (isFirstFriday) t.push("firstFriday");
    if (isCreationDay) t.push("creationDay");
    if (sportsSeason && sportsSeason !== "off-season") t.push("sportsSeason:" + sportsSeason);
    return t;
  })();

  const mergeTags = (a, b) => {
    const seen = Object.create(null);
    const out = [];
    const add = (x) => { if (x && !seen[x]) { seen[x] = true; out.push(x); } };
    (a || []).forEach(add);
    (b || []).forEach(add);
    return out;
  };

  const entry = (text, tags, primary) => ({
    text: text,
    tags: mergeTags(tags, calendarTags),
    primary: primary || "Life"
  });

  // Pools (tagged)
  const mlbPublic = [
    "signed autographs for fans",
    "did a brief media availability",
    "posed for photos with young fans",
    "participated in a community appearance",
    "attended a team marketing event",
    "fulfilled a sponsor obligation",
    "appeared at a charity function",
    "did a radio interview"
  ].map(function(t) { return entry(t, ["role:mlb"], "Public"); });

  const mlbPersonal = [
    "spent downtime away from the ballpark",
    "caught up with family via video call",
    "enjoyed a quiet meal in the city",
    "stepped away from baseball briefly",
    "ran personal errands around town",
    "spent time with friends outside the game",
    "enjoyed an off-day in Oakland"
  ].map(function(t) { return entry(t, ["role:mlb"], "Personal"); });

  const mlbTeamLife = [
    "joined teammates for a team meal",
    "participated in clubhouse conversations",
    "connected with younger players",
    "shared a laugh with teammates"
  ].map(function(t) { return entry(t, ["role:mlb"], "Team"); });

  const mediaWork = [
    "worked on developing a story lead",
    "conducted background interviews",
    "reviewed notes from recent events",
    "collaborated with editorial on coverage",
    "filed copy under deadline pressure",
    "fact-checked a developing story"
  ].map(function(t) { return entry(t, ["role:media"], "Work"); });

  const mediaPublic = [
    "attended a press conference",
    "participated in a media availability",
    "represented the paper at an event",
    "networked with industry contacts"
  ].map(function(t) { return entry(t, ["role:media"], "Public"); });

  const mediaPersonal = [
    "decompressed after a long news cycle",
    "caught up on industry reading",
    "reflected on recent coverage decisions",
    "maintained source relationships quietly"
  ].map(function(t) { return entry(t, ["role:media"], "Personal"); });

  const editorPool = [
    "reviewed the day's editorial priorities",
    "made tough decisions on story placement",
    "mentored a younger staff member",
    "navigated internal editorial discussions"
  ].map(function(t) { return entry(t, ["role:media", "media:editor"], "Work"); });

  const reporterPool = [
    "followed up on a tip",
    "built rapport with a new source",
    "spent time in the field gathering details",
    "attended a community meeting for coverage"
  ].map(function(t) { return entry(t, ["role:media", "media:reporter"], "Work"); });

  const columnistPool = [
    "drafted thoughts for an upcoming column",
    "engaged with reader feedback",
    "considered a provocative angle",
    "reflected on the week's events"
  ].map(function(t) { return entry(t, ["role:media", "media:columnist"], "Work"); });

  const photographerPool = [
    "scouted locations for upcoming shoots",
    "edited images from recent assignments",
    "captured candid moments around town",
    "maintained equipment between assignments"
  ].map(function(t) { return entry(t, ["role:media", "media:photographer"], "Work"); });

  const civicWork = [
    "reviewed briefing materials",
    "attended internal policy meetings",
    "consulted with department heads",
    "prepared for upcoming public sessions",
    "addressed constituent concerns"
  ].map(function(t) { return entry(t, ["role:civic"], "Civic"); });

  const civicPublic = [
    "made a brief public appearance",
    "spoke with community members",
    "attended a neighborhood event",
    "represented the city at a function",
    "fielded questions from local media"
  ].map(function(t) { return entry(t, ["role:civic"], "Public"); });

  const civicPersonal = [
    "found a quiet moment between obligations",
    "balanced public duties with personal time",
    "reflected on the weight of public service",
    "maintained composure under public scrutiny"
  ].map(function(t) { return entry(t, ["role:civic"], "Personal"); });

  const mayorPool = [
    "navigated competing political pressures",
    "considered long-term city priorities",
    "met with key stakeholders privately"
  ].map(function(t) { return entry(t, ["role:civic", "civic:mayor"], "Civic"); });

  const councilPool = [
    "prepared for council deliberations",
    "met with district constituents",
    "reviewed proposed legislation"
  ].map(function(t) { return entry(t, ["role:civic", "civic:council"], "Civic"); });

  const staffPool = [
    "coordinated across departments",
    "managed logistics for upcoming events",
    "handled sensitive communications"
  ].map(function(t) { return entry(t, ["role:civic", "civic:staff"], "Civic"); });

  const publicFigureGeneral = [
    "navigated being recognized in public",
    "maintained public composure",
    "handled attention with practiced ease",
    "found a moment of privacy",
    "managed the demands of public life"
  ].map(function(t) { return entry(t, ["role:publicFigure"], "Life"); });

  const publicFigurePersonal = [
    "enjoyed a rare quiet evening",
    "connected with close friends",
    "took time for personal wellness",
    "stepped back from the spotlight briefly",
    "appreciated a normal moment"
  ].map(function(t) { return entry(t, ["role:publicFigure"], "Personal"); });

  const championshipPool = [
    "felt the city's championship energy",
    "navigated heightened media attention",
    "noticed more fans recognizing them"
  ].map(function(t) { return entry(t, ["context:sportsAtmosphere"], "Season"); });

  const playoffPool = [
    "felt the city's postseason energy",
    "noticed increased media presence",
    "sensed the heightened expectations"
  ].map(function(t) { return entry(t, ["context:sportsAtmosphere"], "Season"); });

  const offseasonPool = [
    "enjoyed the slower offseason pace",
    "appreciated time away from the spotlight",
    "recharged during the break"
  ].map(function(t) { return entry(t, ["context:sportsAtmosphere"], "Season"); });

  const holidayPublicPool = {
    Thanksgiving: ["participated in a holiday community event"],
    Holiday: ["attended a holiday charity function"],
    NewYear: ["reflected publicly on the year ahead"],
    Independence: ["appeared at a civic celebration"],
    OpeningDay: ["felt the excitement of Opening Day"],
    Juneteenth: ["participated in community observance"],
    MemorialDay: ["honored the occasion publicly"],
    LaborDay: ["acknowledged workers at a public event"],
    VeteransDay: ["paid respects at a veterans event"]
  };

  function yn_(v) {
    var s = (v || "").toString().trim().toLowerCase();
    return s === "y" || s === "yes" || s === "true";
  }

  function getCitizenType_(row) {
    var isUNI = (iUNI >= 0) ? yn_(row[iUNI]) : false;
    var isMED = (iMED >= 0) ? yn_(row[iMED]) : false;
    var isCIV = (iCIV >= 0) ? yn_(row[iCIV]) : false;

    var origin = (iOriginGame >= 0 ? (row[iOriginGame] || "") : "").toString();
    var role = (iRole >= 0 ? (row[iRole] || "") : "").toString();
    var roleLower = role.toLowerCase();

    if (isUNI || origin.indexOf("MLB") >= 0) {
      var pitcherRoles = ["SP", "RP", "CL", "CP"];
      if (pitcherRoles.indexOf(role) >= 0) return "mlb-pitcher";
      return "mlb-position";
    }

    if (isMED) {
      if (roleLower.indexOf("editor") >= 0 || roleLower.indexOf("chief") >= 0) return "media-editor";
      if (roleLower.indexOf("columnist") >= 0) return "media-columnist";
      if (roleLower.indexOf("photographer") >= 0) return "media-photographer";
      return "media-reporter";
    }

    if (isCIV) {
      if (roleLower.indexOf("mayor") >= 0) return "civic-mayor";
      if (roleLower.indexOf("council") >= 0 || roleLower.indexOf("caucus") >= 0) return "civic-council";
      return "civic-staff";
    }

    return "public-figure";
  }

  function buildEventPool_(citizenType) {
    var pool = publicFigureGeneral.concat(publicFigurePersonal);

    switch (citizenType) {
      case "mlb-pitcher":
      case "mlb-position":
        pool = pool.concat(mlbPublic, mlbPersonal, mlbTeamLife);
        break;
      case "media-editor":
        pool = pool.concat(mediaWork, mediaPublic, mediaPersonal, editorPool);
        break;
      case "media-reporter":
        pool = pool.concat(mediaWork, mediaPublic, mediaPersonal, reporterPool);
        break;
      case "media-columnist":
        pool = pool.concat(mediaWork, mediaPublic, mediaPersonal, columnistPool);
        break;
      case "media-photographer":
        pool = pool.concat(mediaWork, mediaPublic, mediaPersonal, photographerPool);
        break;
      case "civic-mayor":
        pool = pool.concat(civicWork, civicPublic, civicPersonal, mayorPool);
        break;
      case "civic-council":
        pool = pool.concat(civicWork, civicPublic, civicPersonal, councilPool);
        break;
      case "civic-staff":
        pool = pool.concat(civicWork, civicPublic, civicPersonal, staffPool);
        break;
      default:
        break;
    }

    if (citizenType.indexOf("mlb-") === 0) {
      if (sportsSeason === "championship") pool = pool.concat(championshipPool);
      else if (sportsSeason === "playoffs" || sportsSeason === "post-season") pool = pool.concat(playoffPool);
      else if (sportsSeason === "off-season") pool = pool.concat(offseasonPool);
    }

    if (holiday !== "none" && holidayPublicPool[holiday]) {
      pool = pool.concat(
        holidayPublicPool[holiday].map(function(t) { return entry(t, ["source:holidayPublic"], "Holiday"); })
      );
    }

    return pool;
  }

  // MAIN LOOP
  var eventCount = 0;
  var EVENT_LIMIT = 15;

  var logRows = []; // schema-safe 7 cols
  var details = [];

  // NEW: per-cycle uniqueness per citizen
  // Key: cycle|popId|text (cycle included so Set can optionally persist in ctx)
  var used = new Set();

  function uniquePick_(pool, popId) {
    if (!pool.length) return null;

    var maxSpins = Math.min(12, pool.length * 2);
    for (var s = 0; s < maxSpins; s++) {
      var cand = pickOne(pool);
      var key = cycle + "|" + popId + "|" + cand.text;
      if (!used.has(key)) {
        used.add(key);
        return cand;
      }
    }

    // Fallback: deterministic scan for any unused
    for (var i = 0; i < pool.length; i++) {
      var cand = pool[i];
      var key = cycle + "|" + popId + "|" + cand.text;
      if (!used.has(key)) {
        used.add(key);
        return cand;
      }
    }

    return null; // all exhausted for this popId this cycle
  }

  for (var r = 0; r < rows.length; r++) {
    if (eventCount >= EVENT_LIMIT) break;

    var row = rows[r];

    var popId = (row[iPopID] || "").toString();
    var mode = (row[iClock] || "").toString().trim().toUpperCase();
    var status = (row[iStatus] || "").toString().trim().toLowerCase();
    var first = (row[iFirst] || "").toString();
    var last = (row[iLast] || "").toString();
    var tier = Number(row[iTier] || 4);

    if (mode !== "GAME") continue;
    if (status === "inactive" || status === "deceased" || status === "retired") continue;
    if (!first || first === last) continue;
    if (!popId) continue;

    var citizenType = getCitizenType_(row);

    var chance = 0.04;
    if (tier === 1) chance += 0.02;
    else if (tier === 2) chance += 0.01;

    if (weather.impact >= 1.3) chance += 0.005;
    if (chaos.length > 0) chance += 0.01;
    if (Math.abs(dynamics.sentiment || 0) >= 0.3) chance += 0.01;

    if (holidayPriority === "major" || holidayPriority === "oakland") chance += 0.01;
    if (isFirstFriday) chance += 0.005;

    if (citizenType.indexOf("mlb-") === 0) {
      if (sportsSeason === "championship") chance += 0.02;
      else if (sportsSeason === "playoffs" || sportsSeason === "post-season") chance += 0.015;
      else if (sportsSeason === "regular") chance += 0.01;
    }

    if (chance > 0.15) chance = 0.15;
    if (!hit(chance)) continue;

    var pool = buildEventPool_(citizenType);
    var picked = uniquePick_(pool, popId);
    if (!picked) continue;

    var primaryTag = picked.primary || "Life";
    var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    var line = stamp + " — [" + primaryTag + "] " + picked.text;

    var existing = row[iLife] ? row[iLife].toString() : "";
    row[iLife] = existing ? existing + "\n" + line : line;

    if (iLastUpd >= 0) row[iLastUpd] = ctx.now;

    // Log schema EXACTLY preserved:
    // [Date, POPID, Name, Category, Text, citizenType, cycle]
    if (logSheet) {
      logRows.push([
        ctx.now,
        popId,
        (first + " " + last).trim(),
        "GAME-Micro",
        picked.text,
        citizenType,
        cycle
      ]);
    }

    details.push({
      at: ctx.now,
      popId: popId,
      name: (first + " " + last).trim(),
      citizenType: citizenType,
      primaryTag: primaryTag,
      text: picked.text,
      tags: mergeTags(picked.tags || [], ["citizenType:" + citizenType]),
      cycle: cycle
    });

    rows[r] = row;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    eventCount++;
  }

  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  if (logSheet && logRows.length) {
    var startRow = logSheet.getLastRow() + 1;
    logSheet.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);
  }

  S.gameModeMicroEvents = eventCount;
  S.gameModeMicroEventDetails = details;
  ctx.summary = S;
}


/**
 * ============================================================================
 * GAME MODE MICRO-EVENTS REFERENCE v1.2
 * ============================================================================
 *
 * Target: ClockMode === "GAME" citizens (public figures)
 * Limit: 15 events per cycle
 *
 * UPGRADE NOTES (v1.2):
 * - Deterministic RNG via mulberry32_ seeded by cycle
 * - Batch log writes (setValues instead of appendRow)
 * - Per-cycle uniqueness per citizen (no duplicate events)
 * - Tagged entries (no includes scanning for tag detection)
 * - Rich detail output in summary.gameModeMicroEventDetails
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
 * | Weather impact >=1.3 | +0.005 |
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
