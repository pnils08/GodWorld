/**
 * ============================================================================
 * buildEveningFamous_ v2.5
 * ============================================================================
 *
 * World-aware celebrity selection for evening coverage with calendar integration.
 *
 * engine.134 Task 6 (S423): Opening Day / championship athlete sightings pick
 * from S.sportsZones when engine.131 T7 has set it; the Jack London / Downtown
 * split is the fallback while T7 is dark (pickAthleteSightingHood_).
 *
 * v2.5 Changes:
 * - Phase 15.5: Real A's players from Simulation_Ledger replace generic athletes
 * - Tier 1-2 active MLB GAME citizens pulled dynamically
 * - Player neighborhoods and TraitProfile included in sighting output
 * - engine.297: Active Cultural_Ledger buckets; no generic athlete fallback
 *
 * v2.3 Changes:
 * - ES5 compatible (var instead of const/let, no arrow functions)
 * - Replaced spread operator with concat()
 * - Replaced includes() with indexOf() !== -1
 * - Replaced Map deduplication with manual loop
 * - Defensive guards for ctx and ctx.summary
 *
 * v2.2 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific celebrity pool weighting
 * - First Friday arts figures prominence
 * - Creation Day civic figure prominence
 * - Sports season athlete boost
 * - Cultural activity and community engagement effects
 * - Calendar-aware sighting locations
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Season, weather, chaos, sentiment
 * - Economic mood integration
 * - Sports broadcasts
 * - Neighborhood sighting locations
 *
 * ============================================================================
 */

// engine.297: committed Cultural_Ledger rows, cached once per ctx; no writes or RNG draws.
function culturalSightingBuckets_(ctx) {
  if (ctx._culturalSightingBuckets) return ctx._culturalSightingBuckets;
  var buckets = { ACTORS: [], MUSICIANS: [], ATHLETES: [], INFLUENCERS: [], JOURNALISTS: [],
    CHEFS: [], STREAMERS: [], AUTHORS: [], CIVIC: [], BUSINESS: [], ARTISTS: [], CULTURAL_LEADERS: [] };
  ctx._culturalSightingBuckets = buckets;
  var category = { actor: 'ACTORS', musician: 'MUSICIANS', athlete: 'ATHLETES',
    'sports-figure': 'ATHLETES', influencer: 'INFLUENCERS', journalist: 'JOURNALISTS',
    chef: 'CHEFS', streamer: 'STREAMERS', author: 'AUTHORS', 'civic-figure': 'CIVIC',
    activist: 'CIVIC', 'business-figure': 'BUSINESS', artist: 'ARTISTS', curator: 'ARTISTS',
    dancer: 'ARTISTS', 'community-leader': 'CULTURAL_LEADERS', 'cultural-leader': 'CULTURAL_LEADERS',
    'cultural-figure': 'CULTURAL_LEADERS' };
  try {
    var sheet = ctx.ss ? ctx.ss.getSheetByName('Cultural_Ledger') : null;
    if (!sheet || sheet.getLastRow() < 2) return buckets;
    var rows = sheet.getDataRange().getValues(), h = rows[0];
    var iName = h.indexOf('Name'), iRole = h.indexOf('RoleType'), iCat = h.indexOf('FameCategory');
    var iStatus = h.indexOf('Status'), iLink = h.indexOf('UniverseLinks'), iHood = h.indexOf('Neighborhood');
    if (iName < 0 || iStatus < 0) throw new Error('Cultural_Ledger missing Name/Status');
    var ledger = ctx.ledger || { headers: [], rows: [] }, lh = ledger.headers;
    var iPop = lh.indexOf('POPID'), iNh = lh.indexOf('Neighborhood'), iLSt = lh.indexOf('Status'), byPop = {};
    for (var p = 0; p < ledger.rows.length; p++) {
      byPop[String(ledger.rows[p][iPop] || '').trim().toUpperCase()] = ledger.rows[p];
    }
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (String(row[iStatus] || '').trim().toLowerCase() !== 'active') continue;
      var name = String(row[iName] || '').trim(), role = String(row[iRole] || '').trim();
      // 'unknown' is the classifier's miss at registration, not an authored category: re-read the role,
      // then the role words themselves ("cultural leader" → cultural-leader), so no Active row is unsightable.
      var cat = String(row[iCat] || '').trim().toLowerCase();
      if (!cat || cat === 'unknown') cat = classifyRole(role).cat;
      var key = category[cat] || category[role.toLowerCase().replace(/\s+/g, '-')];
      if (!name || !key || !Object.prototype.hasOwnProperty.call(buckets, key)) continue;
      var link = String(row[iLink] || '').trim().toUpperCase();
      // A linked citizen is out on the town only while living on the ledger (active or retired): a row
      // whose citizen died, left, or lies in hospital — or is off the ledger (archived) — is not sighted.
      if (link.indexOf('POP-') === 0) {
        var cit = byPop[link];
        if (!cit) continue;
        if (iLSt >= 0 && !/^(active|retired)$/i.test(String(cit[iLSt] || '').trim())) continue;
      }
      var home = link.indexOf('POP-') === 0 ? String(byPop[link][iNh] || '') : String(row[iHood] || '');
      buckets[key].push({ name: name, role: role, homeNeighborhood: home });
    }
  } catch (e) {
    Logger.log('culturalSightingBuckets_: read failed — ' + e.message);
  }
  return buckets;
}


function buildEveningFamous_(ctx) {
  decayCulturalFame_(ctx); // engine.68 — quiet fame fades before tonight's sightings register

  // Defensive guard
  if (!ctx || !ctx.summary) {
    if (ctx) ctx.summary = {};
    else return;
  }

  var rng = safeRand_(ctx);
  var S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };
  var sentiment = dynamics.sentiment || 0;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;
  var sports = S.eveningSports || "";
  var econMood = S.economicMood || 50;
  var cycle = S.cycleId || (ctx.config ? ctx.config.cycleCount : 0) || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";
  var sportsRung = sportsRung_(sportsSeason, S.sportsCity);   // engine.281 (a): the numbers read the week's band

  // engine.99 Cohort 2 — core-sim hoods from Neighborhood_Map CoreSimRank (ADR-0016)
  var neighborhoods = getCoreSimNeighborhoods_(ctx);

  // Arts neighborhoods for First Friday
  var artsNeighborhoods = hoodNamesWithScene_(ctx, 'arts'); // engine.148 P3 — Neighborhood_Map.Scenes

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL POOLS (with categories)
  // ═══════════════════════════════════════════════════════════════════════════

  var buckets = culturalSightingBuckets_(ctx);
  var ACTORS = buckets.ACTORS, MUSICIANS = buckets.MUSICIANS, ATHLETES = buckets.ATHLETES;
  var INFLUENCERS = buckets.INFLUENCERS, JOURNALISTS = buckets.JOURNALISTS, CHEFS = buckets.CHEFS;
  var STREAMERS = buckets.STREAMERS, AUTHORS = buckets.AUTHORS, CIVIC = buckets.CIVIC;
  var BUSINESS = buckets.BUSINESS, ARTISTS = buckets.ARTISTS, CULTURAL_LEADERS = buckets.CULTURAL_LEADERS;

  // engine.296 (builder 2026-10-16): no hardcoded famous names. SPORTS_LEGENDS is the ledger's
  // retired MLB-origin citizens, filled in the ledger read below; no literal fallback — an empty pool
  // is an empty pool, and a traded player leaves it by leaving the ledger.
  var SPORTS_LEGENDS = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL A'S PLAYERS FROM SIMULATION_LEDGER (Phase 15.5)
  // ═══════════════════════════════════════════════════════════════════════════
  // Tier 1-2 active MLB GAME citizens replace generic ATHLETES pool.
  // No generic athlete fallback (engine.297).

  // Phase 42 §5.6: read SL via shared ctx.ledger so Phase 7 sees post-phase05 mutations.
  var REAL_PLAYERS = [];
  if (ctx.ledger && ctx.ledger.rows.length > 0) {
    var slH = ctx.ledger.headers;
    var slRows = ctx.ledger.rows;
        var _iFirst = slH.indexOf("First");
        var _iLast = slH.indexOf("Last");
        var _iTier = slH.indexOf("Tier");
        var _iClock = slH.indexOf("ClockMode");
        var _iStatus = slH.indexOf("Status");
        var _iOrigin = slH.indexOf("OriginGame");
        var _iNeigh = slH.indexOf("Neighborhood");
        var _iTrait = slH.indexOf("TraitProfile");
        var _iRole = slH.indexOf("RoleType");

        for (var p = 0; p < slRows.length; p++) {
          var pr = slRows[p];
          var pClock = (pr[_iClock] || "").toString().trim().toUpperCase();
          var pStat = (pr[_iStatus] || "").toString().trim().toLowerCase();
          var pOrig = (pr[_iOrigin] || "").toString();
          var pTier = Number(pr[_iTier] || 4);

          // engine.296: an MLB-origin citizen is an A's legend when the ledger says so — retired, or a
          // RoleType that names it (Darrin Davis: "Left Fielder, Oakland A's Legend", still playing).
          var pRole = (_iRole >= 0) ? (pr[_iRole] || "").toString() : "";
          if (pOrig.indexOf("MLB") >= 0 && (pStat === "retired" || /\blegend\b/i.test(pRole))) {
            var lFirst = (pr[_iFirst] || "").toString();
            var lLast = (pr[_iLast] || "").toString();
            var lName = (lFirst + " " + lLast).trim();
            if (lName && lFirst !== lLast) {
              SPORTS_LEGENDS.push({
                name: lName,
                role: "A's legend",
                tier: pTier,
                homeNeighborhood: (_iNeigh >= 0) ? (pr[_iNeigh] || "").toString() : "",
                traitProfile: (_iTrait >= 0) ? (pr[_iTrait] || "").toString() : ""
              });
            }
          }

          if (pClock !== "GAME") continue;
          if (pStat !== "active") continue;
          if (pOrig.indexOf("MLB") < 0) continue;
          if (pTier > 2) continue;

          var pFirst = (pr[_iFirst] || "").toString();
          var pLast = (pr[_iLast] || "").toString();
          var pName = (pFirst + " " + pLast).trim();
          if (!pName || pFirst === pLast) continue;

          var pNeigh = (_iNeigh >= 0) ? (pr[_iNeigh] || "").toString() : "";
          var pTrait = (_iTrait >= 0) ? (pr[_iTrait] || "").toString() : "";

          REAL_PLAYERS.push({
            name: pName,
            role: /\blegend\b/i.test(pRole) ? "A's legend" : "A's player",   // engine.296: the ledger's word
            tier: pTier,
            homeNeighborhood: pNeigh,
            traitProfile: pTrait
          });
        }

        // engine.68 (S325, Mike doctrine: fame is its own attention — another
        // level of event promotion). The city SEES its own famous: any SL
        // citizen at the cultural fame bar (FameScore >= 25 via UniverseLinks,
        // lagged cached read) joins the sighting pool alongside the athletes.
        if (typeof culturalStatusByPop_ === 'function') {
          var _iPop68 = slH.indexOf('POPID');
          var famousByPop = culturalStatusByPop_(ctx);
          for (var f68 = 0; f68 < slRows.length; f68++) {
            var fr68 = slRows[f68];
            var fPop68 = _iPop68 >= 0 ? String(fr68[_iPop68] || '').trim().toUpperCase() : '';
            var cs68 = fPop68 && famousByPop[fPop68];
            if (!cs68) continue;
            var fStat68 = (fr68[_iStatus] || '').toString().trim().toLowerCase();
            if (fStat68 !== 'active') continue;
            var fName68 = ((fr68[_iFirst] || '') + ' ' + (fr68[_iLast] || '')).toString().trim();
            if (!fName68 || fName68.indexOf(' ') < 0) continue;
            REAL_PLAYERS.push({
              name: fName68,
              role: cs68.category || 'local figure',
              tier: Number(fr68[_iTier] || 4),
              homeNeighborhood: (_iNeigh >= 0) ? (fr68[_iNeigh] || '').toString() : '',
              traitProfile: (_iTrait >= 0) ? (fr68[_iTrait] || '').toString() : ''
            });
          }
        }
  }

  // The A's seed path stays separate pending the builder's ruling; no generic fallback.
  var athletePool = REAL_PLAYERS;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD-AWARE SELECTION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════

  var pool = [];

  // Base pool: actors, musicians, and athletes (real or generic)
  pool = pool.concat(ACTORS, MUSICIANS, athletePool);

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY CELEBRITY WEIGHTING (v2.2)
  // ───────────────────────────────────────────────────────────────────────────

  // Cultural holidays boost cultural figures

  // Art & Soul Festival: artists and musicians

  // Oakland Pride: diverse voices

  // Opening Day: athletes and sports figures

  // Culinary holidays: chefs
  var culinaryHolidays = ["Thanksgiving"];
  if (culinaryHolidays.indexOf(holiday) !== -1) {
    pool = pool.concat(CHEFS, CHEFS);
  }

  // Entertainment holidays: actors and musicians
  var entertainmentHolidays = ["NewYearsEve", "Halloween"];
  if (entertainmentHolidays.indexOf(holiday) !== -1) {
    pool = pool.concat(ACTORS, MUSICIANS, INFLUENCERS);
  }

  // Major holidays: broad celebrity appeal
  if (holidayPriority === "major") {
    pool = pool.concat(ACTORS, MUSICIANS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    pool = pool.concat(ARTISTS, ARTISTS, ARTISTS);
    pool = pool.concat(MUSICIANS, INFLUENCERS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    pool = pool.concat(CIVIC, CIVIC, CULTURAL_LEADERS, AUTHORS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (sportsRung === "championship") {
    pool = pool.concat(athletePool, athletePool, athletePool, SPORTS_LEGENDS);
  } else if (sportsRung === "playoffs" || sportsRung === "post-season") {
    pool = pool.concat(athletePool, athletePool, SPORTS_LEGENDS);
  } else if (sportsRung === "late-season") {
    pool = pool.concat(athletePool, athletePool);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    pool = pool.concat(ARTISTS, MUSICIANS, AUTHORS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMMUNITY ENGAGEMENT (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (communityEngagement >= 1.4) {
    pool = pool.concat(CIVIC, CULTURAL_LEADERS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHAOS / NEWS
  // ───────────────────────────────────────────────────────────────────────────
  if (chaos.length > 0) {
    pool = pool.concat(JOURNALISTS, JOURNALISTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SENTIMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (sentiment >= 0.3) {
    pool = pool.concat(INFLUENCERS, MUSICIANS, STREAMERS);
  }
  if (sentiment <= -0.3) {
    pool = pool.concat(ACTORS, JOURNALISTS, CIVIC);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ORIGINAL SPORTS BROADCAST
  // ───────────────────────────────────────────────────────────────────────────
  if (sports && sports !== "(none)" && sports !== "off-season") {
    pool = pool.concat(athletePool, athletePool);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.impact >= 1.3 || weather.type === "rain" || weather.type === "fog") {
    pool = pool.concat(ACTORS, MUSICIANS, STREAMERS);
  }

  if (weatherMood.perfectWeather) {
    pool = pool.concat(athletePool, INFLUENCERS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ECONOMIC MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (econMood >= 65) {
    pool = pool.concat(BUSINESS, CHEFS);
  }
  if (econMood <= 35) {
    pool = pool.concat(CIVIC, JOURNALISTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SEASONAL
  // ───────────────────────────────────────────────────────────────────────────
  if (season === "Summer") {
    pool = pool.concat(athletePool, INFLUENCERS);
  }
  if (season === "Winter") {
    pool = pool.concat(ACTORS, AUTHORS);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  // v2.3: ES5 deduplication (instead of Map)
  var seen = {};
  var uniq = [];
  for (var i = 0; i < pool.length; i++) {
    var item = pool[i];
    if (!seen[item.name]) {
      seen[item.name] = true;
      uniq.push(item);
    }
  }

  // Pick 2–4 famous for the evening (v2.2: can be up to 4 on special occasions)
  var count = 2;
  if (chaos.length > 0 || rng() < 0.3) count = 3;
  if (weather.impact >= 1.4) count = 3;

  // v2.2: Calendar increases sightings
  if (holidayPriority === "major" || holidayPriority === "oakland") count = Math.max(count, 3);
  if (isFirstFriday) count = Math.max(count, 3);
  if (sportsRung === "championship") count = 4;

  var selected = typeof pickRandomSet_ === 'function'
    ? pickRandomSet_(uniq, count, rng)
    : uniq.sort(function() { return rng() - 0.5; }).slice(0, count);

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSIGN NEIGHBORHOODS (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  // T5 (research.24, S313): fail-soft hood-keyed Business_Ledger read — each
  // sighting can name a real venue in its neighborhood, and the venue gets a
  // business-scoped ripple so it reaches the seed deck as exact protagonist.
  // Same three-col pattern as contractSeedBackdropIndex_; empty on any failure.
  // S329 R1: index + lookup keyed on normalized hood (case/space variants).
  // engine.99 Cohort 2: the piedmont special-case is retired — Business_Ledger's
  // 'Piedmont Avenue' rows were reconciled to the canonical 'Piedmont Ave' at
  // the ledger (ADR-0016 §4), so spelling normalization here would be drift
  // re-hidden. Case/trim hygiene stays.
  function normHood_(h) {
    return String(h || '').trim().toLowerCase();
  }
  var venuesByHood = {};
  try {
    var vbs = ctx.ss && typeof ctx.ss.getSheetByName === 'function' ? ctx.ss.getSheetByName('Business_Ledger') : null;
    if (vbs && vbs.getLastRow() > 1) {
      var vv = vbs.getDataRange().getValues();
      var vh = vv[0];
      var iVid = vh.indexOf('BIZ_ID');
      var iVname = vh.indexOf('Name');
      var iVhood = vh.indexOf('Neighborhood');
      if (iVid >= 0 && iVname >= 0 && iVhood >= 0) {
        for (var vr = 1; vr < vv.length; vr++) {
          var vhood = normHood_(vv[vr][iVhood]);
          var vname = String(vv[vr][iVname] || '').trim();
          if (!vhood || !vname) continue;
          if (!venuesByHood[vhood]) venuesByHood[vhood] = [];
          venuesByHood[vhood].push({ bizId: String(vv[vr][iVid] || ''), name: vname });
        }
      }
    }
  } catch (venueErr) {
    try { Logger.log('buildEveningFamous_ venue read failed (fail-soft): ' + venueErr); } catch (ig) {}
  }

  var famousWithLocations = [];
  for (var j = 0; j < selected.length; j++) {
    var ent = selected[j];
    var neighborhood;

    // v2.2: Calendar-aware neighborhood assignment
    if (isFirstFriday && (ent.role.indexOf("artist") !== -1 || ent.role.indexOf("gallery") !== -1 || ent.role.indexOf("musician") !== -1)) {
      // Artists on First Friday are in arts districts
      neighborhood = artsNeighborhoods[Math.floor(rng() * artsNeighborhoods.length)];
    } else if (sportsRung === "championship" && (ent.role.indexOf("athlete") !== -1 || ent.role === "A's player")) {
      // Athletes near the stadium — engine.134 Task 6: the sports zone follows
      // the stadium (S.sportsZones, engine.131 T7); Jack London/Downtown until it lights.
      neighborhood = pickAthleteSightingHood_(S, rng);
    } else if (ent.role === "A's player" && ent.homeNeighborhood && rng() < 0.5) {
      // v2.5: Real players spotted in their home neighborhood half the time
      neighborhood = ent.homeNeighborhood;
    } else {
      // Default random neighborhood
      neighborhood = neighborhoods[Math.floor(rng() * neighborhoods.length)];
    }

    var sighting = {
      name: ent.name,
      role: ent.role,
      neighborhood: neighborhood
    };

    // v2.5: Include trait and tier data for real players
    if (ent.role === "A's player") {
      if (ent.traitProfile) sighting.traitProfile = ent.traitProfile;
      if (ent.tier) sighting.tier = ent.tier;
    }

    // T5 (research.24): name a real venue in the sighting's hood + emit a
    // business-scoped ripple. 2-4 sightings/cycle -> bounded volume; Phase 7
    // runs before Phase7-ContractSeeds and the Phase-10 executor (compliant).
    // S329 R1: a sighting with no venue match still ripples neighborhood-scoped
    // — the sighting is the story-worthy event, the venue is garnish. Without
    // this, hoods with no Business_Ledger venues (Laurel, Grand Lake) never
    // reached the seed deck at all.
    var hoodVenues = venuesByHood[normHood_(neighborhood)];
    if (typeof recordRipple_ === 'function') {
      if (hoodVenues && hoodVenues.length) {
        var venue = hoodVenues[Math.floor(rng() * hoodVenues.length)];
        sighting.venue = { bizId: venue.bizId, name: venue.name };
        recordRipple_(ctx, {
          causeType: 'lifestyle-sighting',
          causeId: ent.name,
          causeDetail: ent.name + ' spotted at ' + venue.name,
          effectType: 'sighting',
          targetScope: 'business',
          targetIds: [venue.bizId],
          neighborhood: neighborhood,
          magnitude: 0.01,
          duration: 1,
          sourceEngine: 'buildEveningFamous'
        });
      } else {
        recordRipple_(ctx, {
          causeType: 'lifestyle-sighting',
          causeId: ent.name,
          causeDetail: ent.name + ' spotted around ' + neighborhood,
          effectType: 'sighting',
          targetScope: 'neighborhood',
          targetIds: [],
          neighborhood: neighborhood,
          magnitude: 0.01,
          duration: 1,
          sourceEngine: 'buildEveningFamous'
        });
      }
    }

    famousWithLocations.push(sighting);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTER + OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  S.famousPeople = [];
  for (var k = 0; k < famousWithLocations.length; k++) {
    S.famousPeople.push(famousWithLocations[k].name);
  }
  S.famousSightings = famousWithLocations;

  // v2.2: Calendar context
  S.famousSightingsContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    count: famousWithLocations.length
  };

  for (var m = 0; m < famousWithLocations.length; m++) {
    var famous = famousWithLocations[m];
    if (typeof registerCulturalEntity_ === 'function') {
      registerCulturalEntity_(ctx, famous.name, famous.role, "SystemEngine", famous.neighborhood);
    }
  }

  ctx.summary = S;
}


/**
 * ============================================================================
 * EVENING FAMOUS REFERENCE v2.5
 * ============================================================================
 *
 * CELEBRITY POOLS:
 * - ACTORS, MUSICIANS, ATHLETES: Active Cultural_Ledger rows by FameCategory
 * - REAL_PLAYERS (dynamic from Simulation_Ledger, Tier 1-2 MLB) - v2.5
 * - INFLUENCERS, JOURNALISTS, CHEFS, STREAMERS, AUTHORS, CIVIC, BUSINESS,
 *   ARTISTS, CULTURAL_LEADERS: same ledger; blank category uses classifyRole.
 * - Linked homeNeighborhood comes from ctx.ledger; unlinked from the cultural row.
 * - One cached bucket read per ctx; empty categories have no literal fallback.
 * - ATHLETES is populated but not concatenated: athletePool stays REAL_PLAYERS.
 * - SPORTS_LEGENDS (dynamic from Simulation_Ledger: OriginGame MLB and Status Retired or a RoleType naming a legend) - engine.296
 *
 * REAL PLAYER INTEGRATION (v2.5):
 * - Reads Simulation_Ledger for ClockMode=GAME, Status=active, OriginGame=MLB
 * - Filters to Tier 1-2 only (superstars and regulars)
 * - athletePool = REAL_PLAYERS, possibly empty; seed eligibility unchanged
 * - Includes homeNeighborhood (50% chance sighted there)
 * - Includes traitProfile and tier in sighting output
 *
 * CALENDAR POOL WEIGHTING (v2.2):
 *
 * | Holiday/Event | Boosted Pools |
 * |---------------|---------------|
 * | Cultural holidays | CULTURAL_LEADERS, CIVIC |
 * | Culinary holidays | CHEFS |
 * | Entertainment holidays | ACTORS, MUSICIANS, INFLUENCERS |
 * | First Friday | ARTISTS, MUSICIANS, INFLUENCERS |
 * | Creation Day | CIVIC, CULTURAL_LEADERS, AUTHORS |
 * | Championship | ATHLETES, SPORTS_LEGENDS |
 * | Playoffs | ATHLETES, SPORTS_LEGENDS |
 * | High cultural activity | ARTISTS, MUSICIANS, AUTHORS |
 * | High community engagement | CIVIC, CULTURAL_LEADERS |
 *
 * SIGHTING COUNT:
 * - Base: 2
 * - Chaos/weather: 3
 * - Major/Oakland holiday: 3
 * - First Friday: 3
 * - Championship: 4
 *
 * CALENDAR-AWARE NEIGHBORHOODS (v2.2):
 * - First Friday + artists → arts districts (Uptown, KONO, Temescal, Jack London)
 *
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 *
 * OUTPUT:
 * - famousPeople: Array<string> (names)
 * - famousSightings: Array<{name, role, neighborhood, ?traitProfile, ?tier}>
 * - famousSightingsContext: {holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, count}
 *
 * ============================================================================
 */

/**
 * Where an athlete is seen on Opening Day / in a championship run. The sports
 * zone set (S.sportsZones) when engine.131 T7 has derived one; otherwise the
 * pre-T7 Jack London 0.6 / Downtown 0.4 split, so nothing moves until the
 * stadium does.
 */
function pickAthleteSightingHood_(S, rng) {
  var zones = S && S.sportsZones;
  if (Array.isArray(zones) && zones.length) {
    return zones[Math.floor(rng() * zones.length)];
  }
  return rng() < 0.6 ? "Jack London" : "Downtown";
}
