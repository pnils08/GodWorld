/**
 * ============================================================================
 * generateMediaModeEvents_ v1.0
 * ============================================================================
 * Generates context-aware life events for MEDIA clock mode citizens.
 * Follows the generateCivicModeEvents_ pattern exactly.
 *
 * Target: ClockMode === "MEDIA" citizens (journalists, editors, columnists,
 *         podcast hosts, photographers, data analysts)
 *
 * Reads from ctx.summary:
 *   - votesThisCycle, grantsThisCycle (civic outcomes to cover)
 *   - eventArcs (neighborhood arc tension/phase)
 *   - civicLoad (civic pressure = story pressure)
 *   - crimeMetrics (public safety stories)
 *   - cityDynamics (sentiment, cultural activity)
 *   - weather, holiday, sportsSeason (shared context)
 *   - eventsGenerated (running total from prior generators)
 *
 * Writes: LifeHistory (append), LifeHistory_Log (batch append)
 * Uses: write-intents (queueRangeIntent_, queueBatchAppendIntent_)
 * ============================================================================
 */

function mulberry32MediaMode_(seed) {
  return function rng() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    var t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMediaModeEvents_(ctx) {
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('generateMediaModeEvents_: ctx.ledger not initialized');
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
      ? mulberry32MediaMode_((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0) ^ 0xD1A)
      : (function(){ throw new Error('generateMediaModeEvents: ctx.rng or ctx.config.rngSeed required (Phase 40.3 Path 1)'); })();
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
  var culturalActivity = dynamics.culturalActivity || 1;

  var votesThisCycle = S.votesThisCycle || [];
  var grantsThisCycle = S.grantsThisCycle || [];
  var eventArcs = S.eventArcs || [];

  // ─────────────────────────────────────────────────────────────────────────
  // MEDIA ROLE CLASSIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  function getMediaRole_(row) {
    var roleLower = (row[iRole] || "").toString().toLowerCase();
    if (roleLower.indexOf("editor-in-chief") >= 0 || roleLower.indexOf("editor in chief") >= 0)
      return "editor-in-chief";
    if (roleLower.indexOf("senior columnist") >= 0 || roleLower.indexOf("sports columnist") >= 0)
      return "columnist";
    if (roleLower.indexOf("podcast") >= 0) return "podcast-host";
    if (roleLower.indexOf("photo") >= 0) return "photographer";
    if (roleLower.indexOf("data") >= 0 || roleLower.indexOf("analyst") >= 0) return "analyst";
    if (roleLower.indexOf("opinion") >= 0) return "opinion-writer";
    if (roleLower.indexOf("wire") >= 0) return "wire-reporter";
    if (roleLower.indexOf("trend") >= 0) return "trend-reporter";
    if (roleLower.indexOf("business") >= 0) return "beat-reporter";
    if (roleLower.indexOf("reporter") >= 0 || roleLower.indexOf("journalist") >= 0)
      return "reporter";
    return "media-staff";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT POOL BUILDERS
  // ─────────────────────────────────────────────────────────────────────────

  function buildEditorPool_() {
    var pool = [];

    pool.push(
      ev("reviewed the morning budget meeting and reassigned two stories", ["media:editor", "type:editorial"], "Media"),
      ev("held the front page for a developing story", ["media:editor", "type:editorial"], "Media"),
      ev("pushed back on a draft that didn't meet standards", ["media:editor", "type:editorial"], "Media"),
      ev("spent twenty minutes on the phone with a source who wouldn't go on record", ["media:editor", "type:sourcing"], "Media"),
      ev("wrote a note to the newsroom about maintaining accuracy under deadline", ["media:editor", "type:leadership"], "Media"),
      ev("reviewed subscription numbers with the business side", ["media:editor", "type:business"], "Media")
    );

    // Civic activity = editorial pressure
    if (votesThisCycle.length > 0) {
      var vote = votesThisCycle[0];
      pool.push(ev("assigned additional coverage to the " + vote.name + " outcome", ["media:editor", "type:assignment", "initiative:" + vote.name], "Media"));
    }

    if (civicLoad === "load-strain") {
      pool.push(ev("felt the weight of covering too many stories with too few reporters", ["media:editor", "type:strain"], "Media"));
    }

    if (sentiment < -0.3) {
      pool.push(ev("considered how the Tribune should frame the city's frustration", ["media:editor", "type:editorial"], "Media"));
    } else if (sentiment > 0.3) {
      pool.push(ev("looked for the story beneath the good news", ["media:editor", "type:editorial"], "Media"));
    }

    return pool;
  }

  function buildColumnistPool_() {
    var pool = [];

    pool.push(
      ev("stared at a blank page for twenty minutes before the column came", ["media:columnist", "type:writing"], "Media"),
      ev("filed a column that landed harder than expected", ["media:columnist", "type:writing"], "Media"),
      ev("argued with an editor about word count", ["media:columnist", "type:internal"], "Media"),
      ev("reread old columns looking for a thread to pull", ["media:columnist", "type:reflection"], "Personal"),
      ev("took notes at the game, listening to the crowd more than the commentary", ["media:columnist", "type:observation"], "Media")
    );

    if (sportsSeason !== "off-season") {
      pool.push(
        ev("worked on a piece connecting the team's season to something larger", ["media:columnist", "type:sports"], "Media"),
        ev("watched film of the last series, looking for the detail everyone missed", ["media:columnist", "type:sports"], "Media")
      );
    }

    if (sentiment < -0.3) {
      pool.push(ev("wrote about what the city doesn't want to hear", ["media:columnist", "type:editorial"], "Media"));
    }

    return pool;
  }

  function buildReporterPool_(neighborhood) {
    var pool = [];

    pool.push(
      ev("chased a lead that turned into two more leads", ["media:reporter", "type:sourcing"], "Media"),
      ev("spent the afternoon at City Hall waiting for a comment", ["media:reporter", "type:reporting"], "Media"),
      ev("filed a story under deadline with three minutes to spare", ["media:reporter", "type:deadline"], "Media"),
      ev("cultivated a new source over coffee", ["media:reporter", "type:sourcing"], "Media"),
      ev("fact-checked a tip that turned out to be half-true", ["media:reporter", "type:verification"], "Media")
    );

    // Neighborhood-specific
    if (neighborhood) {
      for (var a = 0; a < eventArcs.length; a++) {
        var arc = eventArcs[a];
        if (arc.neighborhood === neighborhood && (arc.phase === "rising" || arc.phase === "peak")) {
          pool.push(ev("tracked a developing story in " + neighborhood, ["media:reporter", "type:beat", "neighborhood:" + neighborhood], "Media"));
        }
      }
    }

    // Vote coverage
    for (var v = 0; v < votesThisCycle.length; v++) {
      var vote = votesThisCycle[v];
      pool.push(ev("covered the " + vote.name + " vote from the council chambers", ["media:reporter", "type:civic", "initiative:" + vote.name], "Media"));
    }

    // Crime beat
    var qol = crimeMetrics.qualityOfLifeIndex || 0.5;
    if (qol < 0.4) {
      pool.push(ev("worked the public safety beat, talking to residents about what changed", ["media:reporter", "type:crime"], "Media"));
    }

    return pool;
  }

  function buildPodcastHostPool_() {
    var pool = [];

    pool.push(
      ev("recorded a segment that went long because the guest wouldn't stop talking", ["media:podcast", "type:production"], "Media"),
      ev("edited audio for two hours trying to find the right cut", ["media:podcast", "type:production"], "Media"),
      ev("booked a guest who's been avoiding the press", ["media:podcast", "type:sourcing"], "Media"),
      ev("reviewed listener feedback and adjusted the format", ["media:podcast", "type:audience"], "Media")
    );

    if (sportsSeason !== "off-season") {
      pool.push(ev("planned an episode around the latest series", ["media:podcast", "type:sports"], "Media"));
    }

    return pool;
  }

  function buildPhotographerPool_() {
    var pool = [];

    pool.push(
      ev("shot three assignments in four hours across two neighborhoods", ["media:photo", "type:assignment"], "Media"),
      ev("waited forty minutes for the right light on a portrait", ["media:photo", "type:craft"], "Media"),
      ev("archived the week's selects and updated the photo desk", ["media:photo", "type:operations"], "Media"),
      ev("carried forty pounds of gear up three flights of stairs", ["media:photo", "type:craft"], "Personal")
    );

    if (weather.type === "rain" || weather.type === "storm") {
      pool.push(ev("shot in the rain and ruined a lens cap but got the frame", ["media:photo", "type:weather"], "Media"));
    }

    return pool;
  }

  function buildAnalystPool_() {
    var pool = [];

    pool.push(
      ev("built a visualization that told the story better than the prose", ["media:analyst", "type:data"], "Media"),
      ev("cross-referenced public records for an investigative piece", ["media:analyst", "type:research"], "Media"),
      ev("cleaned a dataset that had been sitting in the queue for weeks", ["media:analyst", "type:data"], "Media"),
      ev("flagged a statistical anomaly in city budget filings", ["media:analyst", "type:civic"], "Media")
    );

    return pool;
  }

  function buildMediaStaffPool_() {
    var pool = [];

    pool.push(
      ev("managed the newsroom workflow between sections", ["media:staff", "type:operations"], "Media"),
      ev("coordinated deadline logistics across three desks", ["media:staff", "type:operations"], "Media"),
      ev("handled reader corrections and letters", ["media:staff", "type:audience"], "Media"),
      ev("updated the archives with the latest edition", ["media:staff", "type:operations"], "Media")
    );

    return pool;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHARED POOLS
  // ─────────────────────────────────────────────────────────────────────────
  var sharedPersonal = [
    ev("stayed late at the newsroom, watching the city go dark through the window", ["type:personal"], "Personal"),
    ev("skipped lunch and didn't notice until 4 PM", ["type:personal"], "Personal"),
    ev("walked home through the neighborhood instead of driving", ["type:personal"], "Personal"),
    ev("thought about whether the work still matters the way it used to", ["type:personal"], "Personal")
  ];

  var holidayPool = [];
  if (holiday !== "none") {
    holidayPool.push(
      ev("covered the " + holiday + " celebrations across the city", ["type:holiday", "holiday:" + holiday], "Media"),
      ev("filed a " + holiday + " feature with more feeling than usual", ["type:holiday", "holiday:" + holiday], "Media")
    );
  }

  var sportsPool = [];
  if (sportsSeason !== "off-season") {
    sportsPool.push(
      ev("followed the A's series from the press box", ["type:sports"], "Media"),
      ev("caught a detail in the dugout that nobody else saw", ["type:sports"], "Media")
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  function ev(text, tags, primary) {
    return { text: text, tags: tags || [], primary: primary || "Media" };
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

    if (mode !== "MEDIA") continue;
    if (status === "inactive" || status === "deceased") continue;
    if (!first || !popId) continue;

    // Health penalty
    var healthPenalty = 1.0;
    if (status === "hospitalized" || status === "critical" || status === "serious-condition") {
      healthPenalty = 0.3;
    } else if (status === "recovering" || status === "injured") {
      healthPenalty = 0.6;
    }

    var mediaRole = getMediaRole_(row);

    // Base chance: 20% — journalists should generate events regularly
    var chance = 0.20;
    if (tier === 1) chance += 0.10;
    else if (tier === 2) chance += 0.05;

    // Civic load = story pressure = more newsroom activity
    if (civicLoad === "load-strain") chance += 0.05;
    else if (civicLoad === "minor-variance") chance += 0.02;

    // Vote activity = deadline pressure
    if (votesThisCycle.length > 0) chance += 0.05;

    // High cultural activity = more to cover
    if (culturalActivity >= 1.5) chance += 0.03;

    // Sentiment extremes = bigger stories
    if (Math.abs(sentiment) >= 0.3) chance += 0.03;

    // Weather/holiday context
    if (weather.impact >= 1.3) chance += 0.02;
    if (holidayPriority === "major" || holidayPriority === "oakland") chance += 0.02;

    // Apply health penalty
    chance *= healthPenalty;

    // Cap at 45%
    if (chance > 0.45) chance = 0.45;

    if (!hit(chance)) continue;

    // Build role-specific pool + shared pools
    var pool = [];
    switch (mediaRole) {
      case "editor-in-chief":
        pool = buildEditorPool_();
        break;
      case "columnist":
        pool = buildColumnistPool_();
        break;
      case "podcast-host":
        pool = buildPodcastHostPool_();
        break;
      case "photographer":
        pool = buildPhotographerPool_();
        break;
      case "analyst":
        pool = buildAnalystPool_();
        break;
      case "opinion-writer":
        pool = buildColumnistPool_(); // similar voice
        break;
      case "wire-reporter":
      case "trend-reporter":
      case "beat-reporter":
      case "reporter":
        pool = buildReporterPool_(neighborhood);
        break;
      default:
        pool = buildMediaStaffPool_();
        break;
    }

    pool = pool.concat(sharedPersonal, holidayPool, sportsPool);

    var picked = uniquePick_(pool, popId);
    if (!picked) continue;

    var primaryTag = picked.primary || "Media";
    var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    var line = stamp + " — [" + primaryTag + "] " + picked.text;

    var existing = row[iLife] ? row[iLife].toString() : "";
    row[iLife] = existing ? existing + "\n" + line : line;

    if (iLastUpd >= 0) row[iLastUpd] = ctx.now;

    // Log schema: [Date, POPID, Name, Category, Text, Neighborhood, Cycle]
    if (logSheet) {
      logRows.push([
        ctx.now,
        popId,
        (first + ' ' + last).trim(),
        "MEDIA-Event",
        picked.text,
        neighborhood,
        cycle
      ]);
    }

    details.push({
      at: ctx.now,
      popId: popId,
      name: (first + " " + last).trim(),
      mediaRole: mediaRole,
      primaryTag: primaryTag,
      text: picked.text,
      tags: picked.tags || [],
      cycle: cycle
    });

    rows[r] = row;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    eventCount++;
  }

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  if (eventCount > 0) {
    ctx.ledger.dirty = true;

    if (logRows.length > 0) {
      queueBatchAppendIntent_(ctx, 'LifeHistory_Log', logRows,
        'media mode event log entries', 'events', 200);
    }
  }

  S.mediaModeEvents = eventCount;
  S.mediaModeEventDetails = details;
  ctx.summary = S;

  Logger.log('generateMediaModeEvents v1.0: ' + eventCount + ' events for MEDIA citizens');
}
