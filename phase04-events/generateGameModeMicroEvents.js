/**
 * ============================================================================
 * generateGameModeMicroEvents_ v1.4 (TraitProfile integration)
 * ============================================================================
 * - Log schema unchanged
 * - Optional determinism (ctx.rng or ctx.config.rngSeed)
 * - Tagged entries (no includes scanning)
 * - Batch log writes
 * - Per-cycle uniqueness per citizen (no duplicate picked.text for same popId)
 *
 * v1.4 Changes:
 * - TraitProfile column read (iTrait) for personality-based event selection
 * - 7 archetype-specific event pools (28 total trait events)
 * - buildEventPool_ accepts traitProfile parameter
 * - MLB players with traits get personality-flavored events mixed in
 *
 * v1.3 Changes:
 * - FIX: Simulation_Ledger update via queueRangeIntent_ (was direct setValues mid-cycle)
 * - FIX: LifeHistory_Log append via queueBatchAppendIntent_ (was direct setValues)
 * - FIX: Rename mulberry32_ to mulberry32GameMode_ to prevent flat namespace collision
 * ============================================================================
 */

function mulberry32GameMode_(seed) {
  return function rng() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    var t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateGameModeMicroEvents_(ctx) {
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  // Was: queueRangeIntent_ on full SL range (cohort B). Now: collapsed into
  // the consolidated Phase 10 commit via ctx.ledger.dirty.
  if (!ctx.ledger) {
    throw new Error('generateGameModeMicroEvents_: ctx.ledger not initialized');
  }
  var ss = ctx.ss;
  var logSheet = ss.getSheetByName("LifeHistory_Log");
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;
  function idx(n) { return header.indexOf(n); }

  var iPopID = idx("POPID");
  var iFirst = idx("First");
  var iLast = idx("Last");
  var iTier = idx("Tier");
  var iClock = idx("ClockMode");
  var iUNI = idx("UNI (y/n)");
  var iMED = idx("MED (y/n)");
  var iCIV = idx("CIV (y/n)");
  var iRole = idx("RoleType");
  var iStatus = idx("Status");
  var iLife = idx("LifeHistory");
  var iLastUpd = (idx("LastUpdated") >= 0) ? idx("LastUpdated") : idx("Last Updated");
  var iOriginGame = idx("OriginGame");
  var iTrait = idx("TraitProfile");

  if (iPopID < 0 || iClock < 0 || iStatus < 0 || iLife < 0) return;

  var S = ctx.summary || (ctx.summary = {});
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  var rng = (typeof ctx.rng === "function")
    ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === "number")
      ? mulberry32GameMode_((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0))
      : (function(){ throw new Error('generateGameModeMicroEvents: ctx.rng or ctx.config.rngSeed required (Phase 40.3 Path 1)'); })();
  function roll() { return rng(); }
  function hit(p) { return roll() < p; }
  function pickOne(arr) { return arr[Math.floor(roll() * arr.length)]; }

  // WORLD STATE
  var weather = S.weather || { type: "clear", impact: 1 };
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };

  // Calendar context
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;
  var sportsSeason = S.sportsSeason || "off-season";

  var calendarTags = (function() {
    var t = [];
    if (holiday !== "none") t.push("holiday:" + holiday);
    if (holidayPriority !== "none") t.push("holidayPriority:" + holidayPriority);
    if (isFirstFriday) t.push("firstFriday");
    if (isCreationDay) t.push("creationDay");
    if (sportsSeason && sportsSeason !== "off-season") t.push("sportsSeason:" + sportsSeason);
    return t;
  })();

  function mergeTags(a, b) {
    var seen = Object.create(null);
    var out = [];
    function add(x) { if (x && !seen[x]) { seen[x] = true; out.push(x); } }
    var aArr = a || [];
    var bArr = b || [];
    for (var ai = 0; ai < aArr.length; ai++) { add(aArr[ai]); }
    for (var bi = 0; bi < bArr.length; bi++) { add(bArr[bi]); }
    return out;
  }

  function entry(text, tags, primary) {
    return {
      text: text,
      tags: mergeTags(tags, calendarTags),
      primary: primary || "Life"
    };
  }

  // Pools (tagged)
  var mlbPublic = [
    "signed autographs for fans",
    "did a brief media availability",
    "posed for photos with young fans",
    "participated in a community appearance",
    "attended a team marketing event",
    "fulfilled a sponsor obligation",
    "appeared at a charity function",
    "did a radio interview"
  ].map(function(t) { return entry(t, ["role:mlb"], "Public"); });

  var mlbPersonal = [
    "spent downtime away from the ballpark",
    "caught up with family via video call",
    "enjoyed a quiet meal in the city",
    "stepped away from baseball briefly",
    "ran personal errands around town",
    "spent time with friends outside the game",
    "enjoyed an off-day in Oakland"
  ].map(function(t) { return entry(t, ["role:mlb"], "Personal"); });

  var mlbTeamLife = [
    "joined teammates for a team meal",
    "participated in clubhouse conversations",
    "connected with younger players",
    "shared a laugh with teammates"
  ].map(function(t) { return entry(t, ["role:mlb"], "Team"); });

  var mediaWork = [
    "worked on developing a story lead",
    "conducted background interviews",
    "reviewed notes from recent events",
    "collaborated with editorial on coverage",
    "filed copy under deadline pressure",
    "fact-checked a developing story"
  ].map(function(t) { return entry(t, ["role:media"], "Work"); });

  var mediaPublic = [
    "attended a press conference",
    "participated in a media availability",
    "represented the paper at an event",
    "networked with industry contacts"
  ].map(function(t) { return entry(t, ["role:media"], "Public"); });

  var mediaPersonal = [
    "decompressed after a long news cycle",
    "caught up on industry reading",
    "reflected on recent coverage decisions",
    "maintained source relationships quietly"
  ].map(function(t) { return entry(t, ["role:media"], "Personal"); });

  var editorPool = [
    "reviewed the day's editorial priorities",
    "made tough decisions on story placement",
    "mentored a younger staff member",
    "navigated internal editorial discussions"
  ].map(function(t) { return entry(t, ["role:media", "media:editor"], "Work"); });

  var reporterPool = [
    "followed up on a tip",
    "built rapport with a new source",
    "spent time in the field gathering details",
    "attended a community meeting for coverage"
  ].map(function(t) { return entry(t, ["role:media", "media:reporter"], "Work"); });

  var columnistPool = [
    "drafted thoughts for an upcoming column",
    "engaged with reader feedback",
    "considered a provocative angle",
    "reflected on the week's events"
  ].map(function(t) { return entry(t, ["role:media", "media:columnist"], "Work"); });

  var photographerPool = [
    "scouted locations for upcoming shoots",
    "edited images from recent assignments",
    "captured candid moments around town",
    "maintained equipment between assignments"
  ].map(function(t) { return entry(t, ["role:media", "media:photographer"], "Work"); });

  var civicWork = [
    "reviewed briefing materials",
    "attended internal policy meetings",
    "consulted with department heads",
    "prepared for upcoming public sessions",
    "addressed constituent concerns"
  ].map(function(t) { return entry(t, ["role:civic"], "Civic"); });

  var civicPublic = [
    "made a brief public appearance",
    "spoke with community members",
    "attended a neighborhood event",
    "represented the city at a function",
    "fielded questions from local media"
  ].map(function(t) { return entry(t, ["role:civic"], "Public"); });

  var civicPersonal = [
    "found a quiet moment between obligations",
    "balanced public duties with personal time",
    "reflected on the weight of public service",
    "maintained composure under public scrutiny"
  ].map(function(t) { return entry(t, ["role:civic"], "Personal"); });

  var mayorPool = [
    "navigated competing political pressures",
    "considered long-term city priorities",
    "met with key stakeholders privately"
  ].map(function(t) { return entry(t, ["role:civic", "civic:mayor"], "Civic"); });

  var councilPool = [
    "prepared for council deliberations",
    "met with district constituents",
    "reviewed proposed legislation"
  ].map(function(t) { return entry(t, ["role:civic", "civic:council"], "Civic"); });

  var staffPool = [
    "coordinated across departments",
    "managed logistics for upcoming events",
    "handled sensitive communications"
  ].map(function(t) { return entry(t, ["role:civic", "civic:staff"], "Civic"); });

  var publicFigureGeneral = [
    "navigated being recognized in public",
    "maintained public composure",
    "handled attention with practiced ease",
    "found a moment of privacy",
    "managed the demands of public life"
  ].map(function(t) { return entry(t, ["role:publicFigure"], "Life"); });

  var publicFigurePersonal = [
    "enjoyed a rare quiet evening",
    "connected with close friends",
    "took time for personal wellness",
    "stepped back from the spotlight briefly",
    "appreciated a normal moment"
  ].map(function(t) { return entry(t, ["role:publicFigure"], "Personal"); });

  var championshipPool = [
    "felt the city's championship energy",
    "navigated heightened media attention",
    "noticed more fans recognizing them"
  ].map(function(t) { return entry(t, ["context:sportsAtmosphere"], "Season"); });

  var playoffPool = [
    "felt the city's postseason energy",
    "noticed increased media presence",
    "sensed the heightened expectations"
  ].map(function(t) { return entry(t, ["context:sportsAtmosphere"], "Season"); });

  var offseasonPool = [
    "enjoyed the slower offseason pace",
    "appreciated time away from the spotlight",
    "recharged during the break"
  ].map(function(t) { return entry(t, ["context:sportsAtmosphere"], "Season"); });

  // ─────────────────────────────────────────────────────────────────────────
  // TRAIT-SPECIFIC EVENT POOLS (Phase 15.5)
  // ─────────────────────────────────────────────────────────────────────────
  // Archetypes from athlete_config.json. When a GAME citizen has a
  // TraitProfile (e.g. "Catalyst/bright"), the archetype key adds
  // personality-flavored events to their pool.

  var traitPools = {
    Catalyst: [
      "brought infectious energy to the clubhouse",
      "sparked a lively conversation among teammates",
      "rallied spirits during a team gathering",
      "was the first to organize a group outing"
    ].map(function(t) { return entry(t, ["role:mlb", "trait:Catalyst"], "Team"); }),

    Anchor: [
      "provided steady presence in the clubhouse",
      "offered quiet counsel to a younger teammate",
      "maintained his routine with characteristic discipline",
      "kept the team grounded during a hectic stretch"
    ].map(function(t) { return entry(t, ["role:mlb", "trait:Anchor"], "Team"); }),

    Watcher: [
      "observed the city from a quiet corner",
      "took in the scene at a local establishment",
      "noticed details others missed around town",
      "spent time studying the rhythm of the neighborhood"
    ].map(function(t) { return entry(t, ["role:mlb", "trait:Watcher"], "Personal"); }),

    Grounded: [
      "enjoyed a hearty meal at a neighborhood spot",
      "spent time in familiar surroundings",
      "found comfort in a simple routine",
      "appreciated the stability of home life"
    ].map(function(t) { return entry(t, ["role:mlb", "trait:Grounded"], "Personal"); }),

    Striver: [
      "worked on something beyond the baseball field",
      "pursued a personal project with focus",
      "studied film or read to sharpen his edge",
      "channeled competitive energy into a side interest"
    ].map(function(t) { return entry(t, ["role:mlb", "trait:Striver"], "Personal"); }),

    Connector: [
      "bridged conversations between different teammate groups",
      "checked in with a teammate going through a tough stretch",
      "organized something that brought the team closer",
      "strengthened a bond with a fellow player"
    ].map(function(t) { return entry(t, ["role:mlb", "trait:Connector"], "Team"); }),

    Drifter: [
      "explored a part of Oakland he hadn't visited before",
      "wandered through the city with no particular destination",
      "found an unexpected moment of solitude",
      "let the afternoon unfold without a plan"
    ].map(function(t) { return entry(t, ["role:mlb", "trait:Drifter"], "Personal"); })
  };

  var holidayPublicPool = {
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

  function buildEventPool_(citizenType, traitProfile) {
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

    // Phase 15.5: Trait-specific events for MLB players
    if (traitProfile && citizenType.indexOf("mlb-") === 0) {
      var archetype = traitProfile.split("/")[0];
      if (archetype && traitPools[archetype]) {
        pool = pool.concat(traitPools[archetype]);
      }
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
  // Key: cycle|popId|text (cycle included so object can optionally persist in ctx)
  var usedObj = Object.create(null);

  function uniquePick_(pool, popId) {
    if (!pool.length) return null;

    var maxSpins = Math.min(12, pool.length * 2);
    for (var s = 0; s < maxSpins; s++) {
      var cand = pickOne(pool);
      var key = cycle + "|" + popId + "|" + cand.text;
      if (!usedObj[key]) {
        usedObj[key] = true;
        return cand;
      }
    }

    // Fallback: deterministic scan for any unused
    for (var i = 0; i < pool.length; i++) {
      var cand = pool[i];
      var key = cycle + "|" + popId + "|" + cand.text;
      if (!usedObj[key]) {
        usedObj[key] = true;
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

    var traitProfile = (iTrait >= 0) ? (row[iTrait] || "").toString() : "";
    var pool = buildEventPool_(citizenType, traitProfile);
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
        '',
        "GAME-Micro",
        picked.text,
        '',
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

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  // LifeHistory_Log batch append still queued — separate sheet, separate intent.
  if (eventCount > 0) {
    ctx.ledger.dirty = true;

    if (logRows.length > 0) {
      queueBatchAppendIntent_(ctx, 'LifeHistory_Log', logRows,
        'game mode micro event log entries', 'events', 200);
    }
  }

  S.gameModeMicroEvents = eventCount;
  S.gameModeMicroEventDetails = details;
  ctx.summary = S;
}


/**
 * ============================================================================
 * GAME MODE MICRO-EVENTS REFERENCE v1.4
 * ============================================================================
 *
 * Target: ClockMode === "GAME" citizens (public figures)
 * Limit: 15 events per cycle
 *
 * UPGRADE NOTES (v1.4):
 * - TraitProfile integration (Phase 15.5): MLB players with TraitProfile
 *   get archetype-specific events (Catalyst, Anchor, Watcher, Grounded,
 *   Striver, Connector, Drifter) added to their event pool
 * - Deterministic RNG via mulberry32GameMode_ seeded by cycle
 * - Writes via write-intents (queueRangeIntent_, queueBatchAppendIntent_)
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
