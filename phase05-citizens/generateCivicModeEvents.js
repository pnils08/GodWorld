/**
 * ============================================================================
 * generateCivicModeEvents_ v1.0
 * ============================================================================
 * Generates context-aware life events for CIVIC clock mode citizens.
 * Unlike GAME micro-events (generic flavor text), CIVIC events reference
 * actual cycle data: initiative outcomes, arc tension, civic load, crime
 * metrics, and public sentiment.
 *
 * Target: ClockMode === "CIVIC" citizens (council, mayor, DA, police chief,
 *         initiative directors, civic appointees)
 *
 * Reads from ctx.summary:
 *   - initiativeEvents, votesThisCycle, grantsThisCycle (from civicInitiativeEngine)
 *   - eventArcs (neighborhood arc tension/phase)
 *   - civicLoad (overall civic pressure level)
 *   - crimeMetrics (QoL index, hotspots, patrol strategy)
 *   - cityDynamics (sentiment, community engagement)
 *   - weather, holiday, sportsSeason (shared context)
 *
 * Writes: LifeHistory (append), LifeHistory_Log (batch append)
 * Uses: write-intents (queueRangeIntent_, queueBatchAppendIntent_)
 * ============================================================================
 */

function mulberry32CivicMode_(seed) {
  return function rng() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    var t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateCivicModeEvents_(ctx) {
  var ss = ctx.ss;
  var ledger = ss.getSheetByName("Simulation_Ledger");
  var logSheet = ss.getSheetByName("LifeHistory_Log");
  if (!ledger) return;

  var values = ledger.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);
  function idx(n) { return header.indexOf(n); }

  var iPopID = idx("POPID");
  var iFirst = idx("First");
  var iLast = idx("Last");
  var iTier = idx("Tier");
  var iClock = idx("ClockMode");
  var iCIV = idx("CIV (y/n)");
  var iRole = idx("RoleType");
  var iStatus = idx("Status");
  var iLife = idx("LifeHistory");
  var iLastUpd = (idx("LastUpdated") >= 0) ? idx("LastUpdated") : idx("Last Updated");
  var iNeighborhood = idx("Neighborhood");

  if (iPopID < 0 || iClock < 0 || iStatus < 0 || iLife < 0) return;

  var S = ctx.summary || (ctx.summary = {});
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  var rng = (typeof ctx.rng === "function")
    ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === "number")
      ? mulberry32CivicMode_((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0) ^ 0xC1V1C)
      : Math.random;

  function roll() { return rng(); }
  function hit(p) { return roll() < p; }
  function pickOne(arr) { return arr[Math.floor(roll() * arr.length)]; }

  // ─────────────────────────────────────────────────────────────────────────
  // WORLD STATE
  // ─────────────────────────────────────────────────────────────────────────
  var weather = S.weather || { type: "clear", impact: 1 };
  var dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };
  var sentiment = dynamics.sentiment || 0;
  var civicLoad = S.civicLoad || "normal";
  var crimeMetrics = S.crimeMetrics || {};
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var sportsSeason = S.sportsSeason || "off-season";

  // Initiative outcomes from civicInitiativeEngine (Phase 5-Initiatives runs before this)
  var initiativeEvents = S.initiativeEvents || [];
  var votesThisCycle = S.votesThisCycle || [];
  var grantsThisCycle = S.grantsThisCycle || [];

  // Arc data
  var eventArcs = S.eventArcs || [];

  // ─────────────────────────────────────────────────────────────────────────
  // CIVIC OFFICE LEDGER LOOKUP
  // ─────────────────────────────────────────────────────────────────────────
  var officeLookup = buildOfficeLookup_(ss);

  // ─────────────────────────────────────────────────────────────────────────
  // CIVIC ROLE CLASSIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  function getCivicRole_(row, popId) {
    var office = officeLookup[popId];
    if (office) return office;

    var roleLower = (row[iRole] || "").toString().toLowerCase();
    if (roleLower.indexOf("mayor") >= 0) return { role: "mayor", title: "Mayor", faction: "" };
    if (roleLower.indexOf("council") >= 0) return { role: "council", title: "Council Member", faction: "" };
    if (roleLower.indexOf("district attorney") >= 0 || roleLower.indexOf("da ") >= 0) return { role: "da", title: "District Attorney", faction: "" };
    if (roleLower.indexOf("police") >= 0 || roleLower.indexOf("chief") >= 0) return { role: "police-chief", title: "Police Chief", faction: "" };
    if (roleLower.indexOf("director") >= 0 || roleLower.indexOf("program") >= 0) return { role: "initiative-director", title: "Director", faction: "" };
    return { role: "civic-staff", title: "Civic Official", faction: "" };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT POOL BUILDERS — context-aware, not generic
  // ─────────────────────────────────────────────────────────────────────────

  function buildMayorPool_() {
    var pool = [];

    // Base mayor events (always available)
    pool.push(
      ev("weighed competing priorities in the administration's agenda", ["civic:mayor", "type:governance"], "Civic"),
      ev("reviewed the latest approval numbers with senior staff", ["civic:mayor", "type:approval"], "Civic"),
      ev("held a private meeting with department heads", ["civic:mayor", "type:internal"], "Civic"),
      ev("stepped away from City Hall for a quiet walk", ["civic:mayor", "type:personal"], "Personal")
    );

    // Vote outcome reactions
    for (var v = 0; v < votesThisCycle.length; v++) {
      var vote = votesThisCycle[v];
      if (vote.outcome === "PASSED") {
        pool.push(ev("prepared signing remarks for the " + vote.name + " passage", ["civic:mayor", "type:legislation", "initiative:" + vote.name], "Civic"));
      } else if (vote.outcome === "FAILED") {
        pool.push(ev("assessed political fallout from the " + vote.name + " failure", ["civic:mayor", "type:legislation", "initiative:" + vote.name], "Civic"));
      }
    }

    // Grant outcomes
    for (var g = 0; g < grantsThisCycle.length; g++) {
      var grant = grantsThisCycle[g];
      pool.push(ev("received word on the " + grant.name + " federal decision", ["civic:mayor", "type:federal"], "Civic"));
    }

    // Sentiment-driven
    if (sentiment < -0.3) {
      pool.push(ev("faced mounting public frustration with City Hall", ["civic:mayor", "type:pressure"], "Civic"));
    } else if (sentiment > 0.3) {
      pool.push(ev("felt cautious optimism about the city's direction", ["civic:mayor", "type:momentum"], "Civic"));
    }

    // Civic load pressure
    if (civicLoad === "load-strain") {
      pool.push(ev("felt the weight of multiple civic crises converging", ["civic:mayor", "type:strain"], "Civic"));
    }

    return pool;
  }

  function buildCouncilPool_(faction) {
    var pool = [];

    pool.push(
      ev("prepared for upcoming council session", ["civic:council", "type:governance"], "Civic"),
      ev("met with constituents about neighborhood concerns", ["civic:council", "type:constituent"], "Civic"),
      ev("reviewed policy briefs from committee staff", ["civic:council", "type:policy"], "Civic"),
      ev("navigated internal caucus dynamics", ["civic:council", "type:faction", "faction:" + faction], "Civic")
    );

    // Vote reactions — council members feel these directly
    for (var v = 0; v < votesThisCycle.length; v++) {
      var vote = votesThisCycle[v];
      if (vote.outcome === "PASSED") {
        pool.push(
          ev("voted on the " + vote.name + " — measure passed " + (vote.voteCount || ""), ["civic:council", "type:vote", "initiative:" + vote.name], "Civic"),
          ev("fielded constituent calls about the " + vote.name + " passage", ["civic:council", "type:constituent", "initiative:" + vote.name], "Civic")
        );
      } else {
        pool.push(
          ev("voted on the " + vote.name + " — measure failed " + (vote.voteCount || ""), ["civic:council", "type:vote", "initiative:" + vote.name], "Civic"),
          ev("heard frustration from supporters of the " + vote.name, ["civic:council", "type:constituent", "initiative:" + vote.name], "Civic")
        );
      }
    }

    // Faction-specific pressure
    if (faction === "OPP" && sentiment < -0.2) {
      pool.push(ev("pushed back on administration priorities in caucus", ["civic:council", "type:opposition"], "Civic"));
    }
    if (faction === "CRC") {
      pool.push(ev("raised fiscal accountability concerns in committee", ["civic:council", "type:oversight"], "Civic"));
    }

    return pool;
  }

  function buildDAPool_() {
    var pool = [];
    var qol = crimeMetrics.qualityOfLifeIndex || 0.5;

    pool.push(
      ev("reviewed active case files with senior prosecutors", ["civic:da", "type:legal"], "Civic"),
      ev("coordinated with law enforcement on pending investigations", ["civic:da", "type:legal"], "Civic"),
      ev("prepared public safety statements for the press", ["civic:da", "type:public"], "Public"),
      ev("balanced prosecutorial priorities with limited resources", ["civic:da", "type:governance"], "Civic")
    );

    if (qol < 0.4) {
      pool.push(ev("addressed rising public concern about neighborhood safety", ["civic:da", "type:crime"], "Civic"));
    }

    // OARI tension — DA and police chief both feel this
    if (hasActiveInitiative_("OARI", initiativeEvents)) {
      pool.push(ev("weighed in on the alternative response initiative's legal framework", ["civic:da", "type:oari"], "Civic"));
    }

    return pool;
  }

  function buildPoliceChiefPool_() {
    var pool = [];
    var qol = crimeMetrics.qualityOfLifeIndex || 0.5;
    var strategy = crimeMetrics.patrolStrategy || "balanced";
    var hotspots = crimeMetrics.hotspots || [];

    pool.push(
      ev("reviewed department performance metrics with command staff", ["civic:police", "type:internal"], "Civic"),
      ev("approved patrol deployment adjustments", ["civic:police", "type:operations"], "Civic"),
      ev("maintained public-facing composure during a press briefing", ["civic:police", "type:public"], "Public"),
      ev("reflected on the demands of leading a department under scrutiny", ["civic:police", "type:personal"], "Personal")
    );

    if (hotspots.length > 0) {
      pool.push(ev("directed additional resources to " + pickOne(hotspots) + " after elevated activity", ["civic:police", "type:hotspot"], "Civic"));
    }

    if (strategy === "suppress_hotspots") {
      pool.push(ev("defended the focused enforcement strategy to community stakeholders", ["civic:police", "type:strategy"], "Civic"));
    } else if (strategy === "community_presence") {
      pool.push(ev("reviewed community policing outcomes with district commanders", ["civic:police", "type:strategy"], "Civic"));
    }

    if (hasActiveInitiative_("OARI", initiativeEvents)) {
      pool.push(ev("coordinated with OARI implementation team on dispatch protocols", ["civic:police", "type:oari"], "Civic"));
    }

    return pool;
  }

  function buildInitiativeDirectorPool_(name, neighborhood) {
    var pool = [];

    pool.push(
      ev("managed stakeholder expectations on project timelines", ["civic:director", "type:project"], "Civic"),
      ev("reviewed budget projections with the finance team", ["civic:director", "type:budget"], "Civic"),
      ev("prepared status reports for council oversight committee", ["civic:director", "type:reporting"], "Civic"),
      ev("balanced community demands with institutional constraints", ["civic:director", "type:engagement"], "Civic")
    );

    // Check if their initiative had activity this cycle
    for (var i = 0; i < initiativeEvents.length; i++) {
      var ie = initiativeEvents[i];
      pool.push(ev("tracked developments on " + ie.name + " — " + ie.outcome, ["civic:director", "type:initiative", "initiative:" + ie.name], "Civic"));
    }

    // Arc tension in their neighborhood
    if (neighborhood) {
      for (var a = 0; a < eventArcs.length; a++) {
        var arc = eventArcs[a];
        if (arc.neighborhood === neighborhood && (arc.phase === "rising" || arc.phase === "peak")) {
          pool.push(ev("felt neighborhood tension affecting project momentum in " + neighborhood, ["civic:director", "type:arc", "neighborhood:" + neighborhood], "Civic"));
        }
      }
    }

    if (civicLoad === "load-strain") {
      pool.push(ev("stretched thin across competing institutional demands", ["civic:director", "type:strain"], "Civic"));
    }

    return pool;
  }

  function buildCivicStaffPool_() {
    var pool = [];

    pool.push(
      ev("coordinated logistics across city departments", ["civic:staff", "type:operations"], "Civic"),
      ev("managed communications for upcoming public announcements", ["civic:staff", "type:comms"], "Civic"),
      ev("reviewed scheduling conflicts for senior leadership", ["civic:staff", "type:admin"], "Civic"),
      ev("handled sensitive constituent inquiries", ["civic:staff", "type:constituent"], "Civic")
    );

    if (votesThisCycle.length > 0) {
      pool.push(ev("managed post-vote communications for the administration", ["civic:staff", "type:vote"], "Civic"));
    }

    return pool;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHARED POOLS — all civic figures share these
  // ─────────────────────────────────────────────────────────────────────────
  var sharedPersonal = [
    ev("found a quiet moment between obligations", ["type:personal"], "Personal"),
    ev("reflected on the cost of public service", ["type:personal"], "Personal"),
    ev("caught up with family after a long day", ["type:personal"], "Personal"),
    ev("balanced the weight of the office with personal needs", ["type:personal"], "Personal")
  ];

  var holidayPool = [];
  if (holiday !== "none") {
    holidayPool.push(
      ev("attended a " + holiday + " civic observance", ["type:holiday", "holiday:" + holiday], "Public"),
      ev("balanced " + holiday + " obligations with public duties", ["type:holiday", "holiday:" + holiday], "Personal")
    );
  }

  // Sentiment-wide pool
  var sentimentPool = [];
  if (sentiment < -0.4) {
    sentimentPool.push(ev("sensed growing public discontent with city leadership", ["type:sentiment"], "Civic"));
  } else if (sentiment > 0.4) {
    sentimentPool.push(ev("noted a wave of civic optimism across the city", ["type:sentiment"], "Civic"));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  function ev(text, tags, primary) {
    return { text: text, tags: tags || [], primary: primary || "Civic" };
  }

  function hasActiveInitiative_(keyword, events) {
    for (var i = 0; i < events.length; i++) {
      if ((events[i].name || "").indexOf(keyword) >= 0) return true;
    }
    return false;
  }

  function yn_(v) {
    var s = (v || "").toString().trim().toLowerCase();
    return s === "y" || s === "yes" || s === "true";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PER-CYCLE UNIQUENESS
  // ─────────────────────────────────────────────────────────────────────────
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
    for (var i = 0; i < pool.length; i++) {
      var cand = pool[i];
      var key = cycle + "|" + popId + "|" + cand.text;
      if (!usedObj[key]) {
        usedObj[key] = true;
        return cand;
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN LOOP
  // ─────────────────────────────────────────────────────────────────────────
  var eventCount = 0;
  var logRows = [];
  var details = [];

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];

    var popId = (row[iPopID] || "").toString();
    var mode = (row[iClock] || "").toString().trim().toUpperCase();
    var status = (row[iStatus] || "").toString().trim().toLowerCase();
    var first = (row[iFirst] || "").toString();
    var last = (row[iLast] || "").toString();
    var tier = Number(row[iTier] || 4);
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || "").toString() : "";

    if (mode !== "CIVIC") continue;
    if (status === "inactive" || status === "deceased") continue;
    if (!first || !popId) continue;

    // Hospitalized/recovering citizens get reduced event chance but aren't skipped
    var healthPenalty = 1.0;
    if (status === "hospitalized" || status === "critical" || status === "serious-condition") {
      healthPenalty = 0.3;
    } else if (status === "recovering" || status === "injured") {
      healthPenalty = 0.6;
    }

    var civicRole = getCivicRole_(row, popId);
    var roleName = civicRole.role;

    // Base chance: 15% — civic figures should generate events most cycles
    var chance = 0.15;
    if (tier === 1) chance += 0.05;
    else if (tier === 2) chance += 0.03;

    // Civic load boost
    if (civicLoad === "load-strain") chance += 0.05;
    else if (civicLoad === "minor-variance") chance += 0.02;

    // Vote activity boost — more happens, more civic figures feel it
    if (votesThisCycle.length > 0) chance += 0.05;
    if (grantsThisCycle.length > 0) chance += 0.03;

    // Sentiment extremes increase civic activity
    if (Math.abs(sentiment) >= 0.3) chance += 0.03;

    // Weather/holiday context
    if (weather.impact >= 1.3) chance += 0.02;
    if (holidayPriority === "major" || holidayPriority === "oakland") chance += 0.02;

    // Apply health penalty
    chance *= healthPenalty;

    // Cap at 40%
    if (chance > 0.40) chance = 0.40;

    if (!hit(chance)) continue;

    // Build role-specific pool + shared pools
    var pool = [];
    switch (roleName) {
      case "mayor":
        pool = buildMayorPool_();
        break;
      case "council":
        pool = buildCouncilPool_(civicRole.faction || "");
        break;
      case "da":
        pool = buildDAPool_();
        break;
      case "police-chief":
        pool = buildPoliceChiefPool_();
        break;
      case "initiative-director":
        pool = buildInitiativeDirectorPool_(first + " " + last, neighborhood);
        break;
      default:
        pool = buildCivicStaffPool_();
        break;
    }

    pool = pool.concat(sharedPersonal, holidayPool, sentimentPool);

    var picked = uniquePick_(pool, popId);
    if (!picked) continue;

    var primaryTag = picked.primary || "Civic";
    var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    var line = stamp + " — [" + primaryTag + "] " + picked.text;

    var existing = row[iLife] ? row[iLife].toString() : "";
    row[iLife] = existing ? existing + "\n" + line : line;

    if (iLastUpd >= 0) row[iLastUpd] = ctx.now;

    // Log schema: [Date, POPID, Name, Category, Text, citizenType, cycle]
    if (logSheet) {
      logRows.push([
        ctx.now,
        popId,
        '',
        "CIVIC-Event",
        picked.text,
        '',
        cycle
      ]);
    }

    details.push({
      at: ctx.now,
      popId: popId,
      name: (first + " " + last).trim(),
      civicRole: roleName,
      faction: civicRole.faction || "",
      primaryTag: primaryTag,
      text: picked.text,
      tags: picked.tags || [],
      cycle: cycle
    });

    rows[r] = row;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    eventCount++;
  }

  // Write-intents: defer writes to Phase 10 persistence
  if (eventCount > 0) {
    if (typeof queueRangeIntent_ === 'function') {
      queueRangeIntent_(ctx, 'Simulation_Ledger', 2, 1, rows,
        'civic mode events — update LifeHistory for ' + eventCount + ' citizens',
        'events', 100);
    } else {
      ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }

    if (logRows.length > 0) {
      if (typeof queueBatchAppendIntent_ === 'function') {
        queueBatchAppendIntent_(ctx, 'LifeHistory_Log', logRows,
          'civic mode event log entries', 'events', 200);
      } else if (logSheet) {
        var startRow = logSheet.getLastRow() + 1;
        logSheet.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);
      }
    }
  }

  S.civicModeEvents = eventCount;
  S.civicModeEventDetails = details;
  ctx.summary = S;

  Logger.log('generateCivicModeEvents v1.0: ' + eventCount + ' events for CIVIC citizens');
}


/**
 * Build lookup from Civic_Office_Ledger: PopId → { role, title, faction }
 */
function buildOfficeLookup_(ss) {
  var lookup = {};
  var sheet = ss.getSheetByName("Civic_Office_Ledger");
  if (!sheet) return lookup;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return lookup;

  var header = data[0];
  function idx(n) { return header.indexOf(n); }

  var iPopId = idx("PopId");
  var iTitle = idx("Title");
  var iFaction = idx("Faction");

  if (iPopId < 0 || iTitle < 0) return lookup;

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var popId = (row[iPopId] || "").toString();
    if (!popId) continue;

    var title = (row[iTitle] || "").toString().toLowerCase();
    var faction = iFaction >= 0 ? (row[iFaction] || "").toString().trim().toUpperCase() : "";

    var role = "civic-staff";
    if (title.indexOf("mayor") >= 0) role = "mayor";
    else if (title.indexOf("council") >= 0 || title.indexOf("president") >= 0) role = "council";
    else if (title.indexOf("district attorney") >= 0) role = "da";
    else if (title.indexOf("police chief") >= 0) role = "police-chief";
    else if (title.indexOf("director") >= 0 || title.indexOf("program") >= 0) role = "initiative-director";

    lookup[popId] = {
      role: role,
      title: row[iTitle] || "",
      faction: faction
    };
  }

  return lookup;
}
