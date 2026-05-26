/**
 * ============================================================================
 * registerCulturalEntity_ v2.5 (Phase 42 §B6 — writeIntents migration)
 * ============================================================================
 *
 * Automatically classifies and registers cultural entities with calendar awareness.
 *
 * v2.5 — Phase 42 §B6 mechanical scope (1 file / 9 sites):
 * - All sheet writes routed through writeIntents
 *   - UPDATE branch: 8 setValue calls → queueCellIntent_
 *   - CREATE branch: 1 appendRow → queueAppendIntent_
 * - Per-cycle in-process registry on `ctx.summary.culturalRegistry` resolves
 *   same-cycle multi-register dedup hazard exposed by the migration.
 *   Snapshot read at L43 captures pre-cycle committed state only; pending
 *   writeIntents are not visible. Without the registry, the second-or-later
 *   call for the same entity in one cycle would:
 *     (a) for an entity NEW this cycle — duplicate-append (snapshot doesn't see
 *         the pending appendIntent from the first call), or
 *     (b) for an entity that existed before this cycle — recompute FameScore
 *         from stale snapshot value, losing the first call's increment under
 *         persistenceExecutor's LWW per (tab, row, col) semantics.
 *   The registry stores the intent object reference returned by queue* helpers
 *   plus an accumulator. Repeat calls mutate the intent's `values` in place;
 *   no re-queueing, no second-call snapshot reads needed.
 * - Helpers (updateMediaSpread_, updateTrendTrajectory_, updateCityTier_)
 *   remain caller-passed-sheet direct-write (Phase 42 B4 batch, pending).
 *   They fire only on first-cycle-call for an existing-in-snapshot entity
 *   (registry-miss UPDATE path) so their semantics stay intact pre-B4.
 *
 * v2.3/v2.4 features preserved:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx/summary
 * - for loops instead of arrow functions
 *
 * v2.2 features preserved:
 * - 12 Oakland neighborhoods, GodWorld Calendar integration (30+ holidays),
 *   holiday/First Friday/sports-season fame modifiers, calendar context
 *   tracking.
 *
 * Ensures Media Room always knows WHY an entity is famous.
 *
 * ============================================================================
 */

function registerCulturalEntity_(ctx, name, roleType, journalistName, neighborhood) {

  // Defensive guard
  if (!ctx) return null;
  if (!ctx.summary) ctx.summary = {};

  var rng = safeRand_(ctx);

  var sheet = ensureCulturalLedger_(ctx);
  var data = sheet.getDataRange().getValues();
  var header = data[0];

  var S = ctx.summary;
  var cycle = S.cycleId || ctx.config.cycleCount || 0;
  var econMood = S.economicMood || 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";
  var dynamics = S.cityDynamics || { culturalActivity: 1, communityEngagement: 1 };
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;

  // Column lookup helper
  var col = function(n) { return header.indexOf(n); };

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  function classifyRole(role) {
    if (!role) return { cat: "unknown", dom: "Other" };

    var r = role.toLowerCase().trim();

    // Arts
    if (r.indexOf("actor") !== -1 || r.indexOf("actress") !== -1) return { cat: "actor", dom: "Arts" };
    if (r.indexOf("singer") !== -1 || r.indexOf("musician") !== -1 || r.indexOf("rapper") !== -1) return { cat: "musician", dom: "Arts" };
    if (r.indexOf("band") !== -1 || r.indexOf("dj") !== -1 || r.indexOf("producer") !== -1) return { cat: "musician", dom: "Arts" };
    if (r.indexOf("artist") !== -1 || r.indexOf("painter") !== -1 || r.indexOf("sculptor") !== -1) return { cat: "artist", dom: "Arts" };
    if (r.indexOf("dancer") !== -1 || r.indexOf("choreograph") !== -1) return { cat: "dancer", dom: "Arts" };
    if (r.indexOf("gallery") !== -1 || r.indexOf("curator") !== -1) return { cat: "curator", dom: "Arts" };

    // Sports
    if (r.indexOf("athlete") !== -1 || r.indexOf("player") !== -1 || r.indexOf("sports") !== -1) return { cat: "athlete", dom: "Sports" };
    if (r.indexOf("basketball") !== -1 || r.indexOf("football") !== -1 || r.indexOf("baseball") !== -1) return { cat: "athlete", dom: "Sports" };
    if (r.indexOf("soccer") !== -1 || r.indexOf("tennis") !== -1 || r.indexOf("golf") !== -1) return { cat: "athlete", dom: "Sports" };
    if (r.indexOf("coach") !== -1 || r.indexOf("manager") !== -1) return { cat: "sports-figure", dom: "Sports" };

    // Media
    if (r.indexOf("journalist") !== -1 || r.indexOf("reporter") !== -1 || r.indexOf("anchor") !== -1) return { cat: "journalist", dom: "Media" };
    if (r.indexOf("influencer") !== -1 || r.indexOf("creator") !== -1 || r.indexOf("youtuber") !== -1) return { cat: "influencer", dom: "Media" };
    if (r.indexOf("tiktoker") !== -1 || r.indexOf("instagram") !== -1) return { cat: "influencer", dom: "Media" };
    if (r.indexOf("streamer") !== -1 || r.indexOf("twitch") !== -1 || r.indexOf("gamer") !== -1) return { cat: "streamer", dom: "Media" };
    if (r.indexOf("podcast") !== -1 || r.indexOf("host") !== -1) return { cat: "media-personality", dom: "Media" };

    // Civic
    if (r.indexOf("civic") !== -1 || r.indexOf("politic") !== -1 || r.indexOf("council") !== -1) return { cat: "civic-figure", dom: "Civic" };
    if (r.indexOf("mayor") !== -1 || r.indexOf("governor") !== -1 || r.indexOf("senator") !== -1) return { cat: "civic-figure", dom: "Civic" };
    if (r.indexOf("activist") !== -1 || r.indexOf("advocate") !== -1) return { cat: "activist", dom: "Civic" };
    if (r.indexOf("community") !== -1 || r.indexOf("organizer") !== -1) return { cat: "community-leader", dom: "Civic" };

    // Culinary
    if (r.indexOf("chef") !== -1 || r.indexOf("cook") !== -1 || r.indexOf("restaurateur") !== -1) return { cat: "chef", dom: "Culinary" };

    // Literature
    if (r.indexOf("author") !== -1 || r.indexOf("writer") !== -1 || r.indexOf("novelist") !== -1) return { cat: "author", dom: "Literature" };
    if (r.indexOf("poet") !== -1 || r.indexOf("playwright") !== -1) return { cat: "author", dom: "Literature" };

    // Fashion
    if (r.indexOf("model") !== -1 || r.indexOf("fashion") !== -1 || r.indexOf("designer") !== -1) return { cat: "model", dom: "Fashion" };

    // Business
    if (r.indexOf("ceo") !== -1 || r.indexOf("founder") !== -1 || r.indexOf("entrepreneur") !== -1) return { cat: "business-figure", dom: "Business" };
    if (r.indexOf("executive") !== -1 || r.indexOf("investor") !== -1) return { cat: "business-figure", dom: "Business" };

    return { cat: "unknown", dom: "Other" };
  }

  // === If roleType missing, attempt auto-inference ===
  if (!roleType || roleType.trim() === "") {
    if (typeof inferCulturalRoleByContext_ === 'function') {
      var inferred = inferCulturalRoleByContext_(ctx, name, journalistName);
      roleType = inferred || "public-figure";
    } else {
      roleType = "public-figure";
    }
  }

  var fam = classifyRole(roleType);

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOODS (12 - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var validNeighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];
  var validNeighborhood = "";
  for (var ni = 0; ni < validNeighborhoods.length; ni++) {
    if (validNeighborhoods[ni] === neighborhood) {
      validNeighborhood = neighborhood;
      break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAME SCORE MODIFIERS (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  // Economic mood modifier (v2.1)
  var fameBonus = 0;
  if (econMood >= 65) fameBonus += 2;
  else if (econMood <= 35) fameBonus -= 1;

  // ─────────────────────────────────────────────────────────────────────────
  // HOLIDAY FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────

  // Cultural holidays boost cultural figures
  var culturalHolidays = [
    "Juneteenth", "CincoDeMayo", "DiaDeMuertos", "LunarNewYear",
    "MLKDay", "OaklandPride", "ArtSoulFestival", "BlackHistoryMonth"
  ];
  var isCulturalHoliday = false;
  for (var chi = 0; chi < culturalHolidays.length; chi++) {
    if (culturalHolidays[chi] === holiday) { isCulturalHoliday = true; break; }
  }
  if (isCulturalHoliday) {
    if (fam.dom === "Arts" || fam.dom === "Civic" || fam.cat === "activist") {
      fameBonus += 3;
    }
  }

  // Oakland pride boosts LGBTQ+ and community figures
  if (holiday === "OaklandPride") {
    if (fam.dom === "Civic" || fam.cat === "activist" || fam.cat === "community-leader") {
      fameBonus += 4;
    }
  }

  // Art & Soul Festival boosts arts figures
  if (holiday === "ArtSoulFestival") {
    if (fam.dom === "Arts") {
      fameBonus += 5;
    }
  }

  // Sports holidays boost athletes
  if (holiday === "OpeningDay") {
    if (fam.dom === "Sports") {
      fameBonus += 5;
    }
  }

  // Culinary holidays boost chefs
  var culinaryHolidays = ["Thanksgiving", "CincoDeMayo", "DiaDeMuertos", "LunarNewYear"];
  var isCulinaryHoliday = false;
  for (var clhi = 0; clhi < culinaryHolidays.length; clhi++) {
    if (culinaryHolidays[clhi] === holiday) { isCulinaryHoliday = true; break; }
  }
  if (isCulinaryHoliday) {
    if (fam.dom === "Culinary") {
      fameBonus += 3;
    }
  }

  // Major holidays general boost
  if (holidayPriority === "major") {
    fameBonus += 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    // Arts figures get big boost
    if (fam.dom === "Arts") {
      fameBonus += 4;
    }
    // Arts neighborhood entities get extra boost
    var artsNeighborhoods = ["Uptown", "KONO", "Temescal", "Jack London"];
    for (var ani = 0; ani < artsNeighborhoods.length; ani++) {
      if (artsNeighborhoods[ani] === validNeighborhood) {
        fameBonus += 2;
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATION DAY FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    // Community leaders and civic figures get boost
    if (fam.dom === "Civic" || fam.cat === "community-leader" || fam.cat === "activist") {
      fameBonus += 3;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────
  if (fam.dom === "Sports") {
    if (sportsSeason === "championship") {
      fameBonus += 6;
    } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
      fameBonus += 4;
    } else if (sportsSeason === "late-season") {
      fameBonus += 2;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    if (fam.dom === "Arts") {
      fameBonus += 2;
    }
  }

  if (communityEngagement >= 1.4) {
    if (fam.dom === "Civic" || fam.cat === "community-leader") {
      fameBonus += 2;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COLUMN INDICES
  // ═══════════════════════════════════════════════════════════════════════════
  // Column indices used downstream — others (RoleType, FirstSeenCycle, Status,
  // TrendTrajectory, FirstRefSource, MediaSpread, CityTier, FirstSeenHoliday)
  // are written positionally on CREATE only; no read/update site needs the
  // header-derived index, so they're not looked up.
  var iCulId = col('CUL-ID');
  var iName = col('Name');
  var iFameCat = col('FameCategory');
  var iCulDom = col('CulturalDomain');
  var iNeighborhood = col('Neighborhood');
  var iLastSeen = col('LastSeenCycle');
  var iMediaCount = col('MediaCount');
  var iFameScore = col('FameScore');
  var iLastHoliday = col('LastSeenHoliday');
  var iCalendarContext = col('CalendarContext');

  // Build calendar context string (v2.2) — hoisted, referenced from both
  // first-call and registry-hit branches below.
  function buildCalendarContext_() {
    var parts = [];
    if (holiday !== "none") parts.push(holiday);
    if (isFirstFriday) parts.push("FirstFriday");
    if (isCreationDay) parts.push("CreationDay");
    if (sportsSeason !== "off-season") parts.push(sportsSeason);
    return parts.join(", ") || "";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PER-CYCLE REGISTRY (v2.5 — §B6 dedup hazard fix)
  //
  // Stores `{ culId, kind, accum, intents }` per entity name registered this
  // cycle. `intents` are object references returned by queue* helpers;
  // mutating their `values` array re-targets the persistence executor's
  // future cell/append write to the new value (no re-queueing, no LWW games).
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.summary.culturalRegistry = ctx.summary.culturalRegistry || {};
  var reg = ctx.summary.culturalRegistry[name];

  // ───── REPEAT CALL: snapshot-UPDATE branch ─────
  // Entity existed in pre-cycle committed state; first call this cycle queued
  // cell intents at row `reg.row`. Mutate those intents in place to bump
  // FameScore/MediaCount/LastSeenCycle/holiday columns.
  if (reg && reg.kind === 'snapshot-update') {
    reg.accum.mediaCount += 1;
    reg.accum.fameScore += 5 + fameBonus;
    if (holiday !== "none") reg.accum.lastHoliday = holiday;
    reg.accum.calendarContext = buildCalendarContext_();
    reg.accum.lastSeenCycle = cycle;

    if (reg.intents.lastSeen) reg.intents.lastSeen.values[0][0] = reg.accum.lastSeenCycle;
    if (reg.intents.mediaCount) reg.intents.mediaCount.values[0][0] = reg.accum.mediaCount;
    if (reg.intents.fameScore) reg.intents.fameScore.values[0][0] = reg.accum.fameScore;
    if (reg.intents.lastHoliday && reg.accum.lastHoliday) reg.intents.lastHoliday.values[0][0] = reg.accum.lastHoliday;
    if (reg.intents.calendarContext) reg.intents.calendarContext.values[0][0] = reg.accum.calendarContext;

    // Skip helpers + summary-array push on repeat (first call already fired
    // helpers and pushed entry; tracking arrays show first-call snapshot for
    // briefing-momentum display, stale-on-repeat acceptable per spec).
    return reg.culId;
  }

  // ───── REPEAT CALL: pending-create branch ─────
  // Entity was NEW this cycle; first call queued an append intent. Mutate the
  // pending row's mutable columns (LastSeenCycle, MediaCount, FameScore,
  // LastSeenHoliday, CalendarContext). Column indices are positional in the
  // newRow construction at the bottom of CREATE branch.
  if (reg && reg.kind === 'pending-create') {
    reg.accum.mediaCount += 1;
    reg.accum.fameScore += 5 + fameBonus;
    if (holiday !== "none") reg.accum.lastHoliday = holiday;
    reg.accum.calendarContext = buildCalendarContext_();
    reg.accum.lastSeenCycle = cycle;

    var pendingRow = reg.intents.append.values[0];
    pendingRow[9] = reg.accum.lastSeenCycle;          // LastSeenCycle
    pendingRow[10] = reg.accum.mediaCount;            // MediaCount
    pendingRow[11] = reg.accum.fameScore;             // FameScore
    if (reg.accum.lastHoliday) pendingRow[18] = reg.accum.lastHoliday;  // LastSeenHoliday
    pendingRow[19] = reg.accum.calendarContext;       // CalendarContext

    return reg.culId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE IF EXISTS (snapshot path — first call this cycle for the entity)
  // ═══════════════════════════════════════════════════════════════════════════
  for (var i = 1; i < data.length; i++) {
    var rowName = iName >= 0 ? data[i][iName] : data[i][2];

    if (rowName === name) {

      var rowNum = i + 1;
      var intents = {};

      // LastSeenCycle
      if (iLastSeen >= 0) {
        intents.lastSeen = queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, iLastSeen + 1, cycle, 'registerCulturalEntity_: LastSeenCycle', 'media');
      }

      // MediaCount
      var mcCol = iMediaCount >= 0 ? iMediaCount : 10;
      var mc = Number(data[i][mcCol] || 0) + 1;
      intents.mediaCount = queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, mcCol + 1, mc, 'registerCulturalEntity_: MediaCount', 'media');

      // FameScore with calendar bonus
      var fsCol = iFameScore >= 0 ? iFameScore : 11;
      var baseFame = Number(data[i][fsCol] || 0);
      var newFame = baseFame + 5 + fameBonus;
      intents.fameScore = queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, fsCol + 1, newFame, 'registerCulturalEntity_: FameScore', 'media');

      // FameCategory + Domain refresh
      if (iFameCat >= 0) queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, iFameCat + 1, fam.cat, 'registerCulturalEntity_: FameCategory', 'media');
      if (iCulDom >= 0) queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, iCulDom + 1, fam.dom, 'registerCulturalEntity_: CulturalDomain', 'media');

      // Neighborhood update if provided and column exists
      if (iNeighborhood >= 0 && validNeighborhood) {
        queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, iNeighborhood + 1, validNeighborhood, 'registerCulturalEntity_: Neighborhood', 'media');
      }

      // Calendar columns update (v2.2)
      var lastHolidayValue = "";
      if (iLastHoliday >= 0 && holiday !== "none") {
        lastHolidayValue = holiday;
        intents.lastHoliday = queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, iLastHoliday + 1, holiday, 'registerCulturalEntity_: LastSeenHoliday', 'media');
      }
      var calCtxValue = "";
      if (iCalendarContext >= 0) {
        calCtxValue = buildCalendarContext_();
        intents.calendarContext = queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, iCalendarContext + 1, calCtxValue, 'registerCulturalEntity_: CalendarContext', 'media');
      }

      // Helper updates (B4 batch pending — still caller-passed-sheet direct
      // writes; remain valid here on first-cycle-call because UPDATE branch
      // resolved a real committed row. Skipped on subsequent same-cycle
      // calls via registry short-circuit above.)
      if (typeof updateMediaSpread_ === 'function') {
        updateMediaSpread_(sheet, rowNum, journalistName);
      }
      if (typeof updateTrendTrajectory_ === 'function') {
        updateTrendTrajectory_(sheet, rowNum, newFame);
      }
      if (typeof updateCityTier_ === 'function') {
        updateCityTier_(sheet, rowNum, newFame, mc);
      }

      // Register for same-cycle repeat-call dedup
      var existingCulId = iCulId >= 0 ? data[i][iCulId] : data[i][1];
      ctx.summary.culturalRegistry[name] = {
        kind: 'snapshot-update',
        culId: existingCulId,
        row: rowNum,
        accum: {
          fameScore: newFame,
          mediaCount: mc,
          lastSeenCycle: cycle,
          lastHoliday: lastHolidayValue,
          calendarContext: calCtxValue
        },
        intents: intents
      };

      // Track in summary
      S.culturalEntityUpdates = S.culturalEntityUpdates || [];
      S.culturalEntityUpdates.push({
        culId: existingCulId,
        name: name,
        fameCategory: fam.cat,
        domain: fam.dom,
        newFameScore: newFame,
        mediaCount: mc,
        calendarBonus: fameBonus,
        holiday: holiday,
        isFirstFriday: isFirstFriday,
        sportsSeason: sportsSeason
      });

      return existingCulId;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE NEW CUL-ID
  // ═══════════════════════════════════════════════════════════════════════════
  var culId = "CUL-" + (typeof shortId_ === 'function' ? shortId_().toUpperCase() : rng().toString(36).substr(2, 6).toUpperCase());

  var initialFameScore = 10 + fameBonus;
  var initialCalCtx = buildCalendarContext_();
  var initialLastHoliday = holiday !== "none" ? holiday : "";

  var newRow = [
    new Date(),               // 0  Timestamp
    culId,                    // 1  CUL-ID
    name,                     // 2  Name
    roleType,                 // 3  RoleType
    fam.cat,                  // 4  FameCategory
    fam.dom,                  // 5  CulturalDomain
    "Active",                 // 6  Status
    "",                       // 7  UniverseLinks
    cycle,                    // 8  FirstSeenCycle
    cycle,                    // 9  LastSeenCycle           (mutable on repeat)
    1,                        // 10 MediaCount              (mutable on repeat)
    initialFameScore,         // 11 FameScore               (mutable on repeat)
    "rising",                 // 12 TrendTrajectory
    journalistName || "",     // 13 FirstRefSource
    1,                        // 14 MediaSpread
    "Local",                  // 15 CityTier
    validNeighborhood,        // 16 Neighborhood
    initialLastHoliday,       // 17 FirstSeenHoliday (v2.2)
    initialLastHoliday,       // 18 LastSeenHoliday  (v2.2, mutable on repeat)
    initialCalCtx             // 19 CalendarContext  (v2.2, mutable on repeat)
  ];

  var appendIntent = queueAppendIntent_(ctx, 'Cultural_Ledger', newRow, 'registerCulturalEntity_: CREATE', 'media');

  // Register for same-cycle repeat-call dedup
  ctx.summary.culturalRegistry[name] = {
    kind: 'pending-create',
    culId: culId,
    accum: {
      fameScore: initialFameScore,
      mediaCount: 1,
      lastSeenCycle: cycle,
      lastHoliday: initialLastHoliday,
      calendarContext: initialCalCtx
    },
    intents: { append: appendIntent }
  };

  // Track in summary
  S.culturalEntityCreates = S.culturalEntityCreates || [];
  S.culturalEntityCreates.push({
    culId: culId,
    name: name,
    fameCategory: fam.cat,
    domain: fam.dom,
    neighborhood: validNeighborhood,
    initialFameBonus: fameBonus,
    holiday: holiday,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason
  });

  ctx.summary = S;

  return culId;
}


/**
 * ============================================================================
 * CULTURAL ENTITY REGISTRATION REFERENCE
 * ============================================================================
 *
 * FAME CATEGORIES:
 * - actor, musician, artist, dancer, curator
 * - athlete, sports-figure
 * - journalist, influencer, streamer, media-personality
 * - civic-figure, activist, community-leader
 * - chef
 * - author
 * - model
 * - business-figure
 * - unknown
 *
 * CULTURAL DOMAINS:
 * - Arts, Sports, Media, Civic, Culinary
 * - Literature, Fashion, Business, Other
 *
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 *
 * FAME SCORE MODIFIERS (v2.2):
 *
 * | Factor | Domain/Category | Bonus |
 * |--------|-----------------|-------|
 * | Economic mood ≥65 | All | +2 |
 * | Economic mood ≤35 | All | -1 |
 * | Cultural holidays | Arts/Civic/activist | +3 |
 * | OaklandPride | Civic/activist/community | +4 |
 * | ArtSoulFestival | Arts | +5 |
 * | OpeningDay | Sports | +5 |
 * | Culinary holidays | Culinary | +3 |
 * | Major holiday | All | +1 |
 * | First Friday | Arts | +4 |
 * | First Friday + arts neighborhood | All | +2 |
 * | Creation Day | Civic/community-leader | +3 |
 * | Championship | Sports | +6 |
 * | Playoffs | Sports | +4 |
 * | Late-season | Sports | +2 |
 * | High cultural activity | Arts | +2 |
 * | High community engagement | Civic/community | +2 |
 *
 * LEDGER COLUMNS (v2.2, positional indices used by v2.5 pending-create mutation):
 *  0 Timestamp        1 CUL-ID           2 Name             3 RoleType
 *  4 FameCategory     5 CulturalDomain   6 Status           7 UniverseLinks
 *  8 FirstSeenCycle   9 LastSeenCycle*  10 MediaCount*     11 FameScore*
 * 12 TrendTrajectory 13 FirstRefSource  14 MediaSpread     15 CityTier
 * 16 Neighborhood    17 FirstSeenHoliday 18 LastSeenHoliday* 19 CalendarContext*
 * (* = mutable on same-cycle repeat-call via ctx.summary.culturalRegistry.)
 *
 * SUMMARY TRACKING:
 * - culturalEntityUpdates: Array of updated entities (first-call snapshot)
 * - culturalEntityCreates: Array of new entities (first-call snapshot)
 * - culturalRegistry: per-cycle name → {culId, kind, accum, intents} map for
 *   intent-object-ref dedup on same-cycle multi-register
 *
 * ============================================================================
 */
