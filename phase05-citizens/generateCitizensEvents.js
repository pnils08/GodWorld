/**
 * ============================================================================
 * Citizens Events Engine v2.9 (engine.67 life-state gate)
 * ============================================================================
 *
 * v2.9 (S325, engine.67): life-state hard gate — deriveLifeState_ per citizen
 * (citizenContextBuilder.js), pool filtered via isEventEligible_ before draw.
 * Impossible content gated (Mike ruling): no work/money/nightlife for kids,
 * no retirement texture for the working. child/teen split out of youth band
 * with their own age pools.
 *
 * Backward compatible:
 * - LifeHistory line remains: "[PrimaryTag] text"
 * - LifeHistory_Log "EventTag" column receives: "PrimaryTag|tagA|tagB|..."
 *
 * v2.7 Additive upgrades (NO schema breaks):
 * - TraitProfile consumption: reads R-TraitProfile from compressLifeHistory v1.1
 * - Archetype-weighted pool selection (Connector gets +social, Watcher +reflective, etc.)
 * - Motif injection: recurring venues/phrases from profile appear organically
 * - Tone-aware template slotter: plain/noir/bright/tense/tender (no narrator voice)
 * - Template spam cooldown (prevents repeated template events)
 * - Continuity penalty for tag repetition from profile
 *
 * v2.6 Features (retained):
 * - crimeMetrics v1.2 integration: QoL-aware event pools
 * - neighborhoodDynamics v2.6 integration via getNeighborhoodDynamics_()
 * - Weather v3.5 full integration (precipitationIntensity, visibility, front types)
 * - Patrol strategy awareness in event flavor
 * - Crime-aware event pools for low-QoL neighborhoods
 *
 * v2.5 Features (retained):
 * - Tailors events using citizen attributes (age group, occupation, neighborhood, tier)
 * - Uses relationship graphs to pull named contacts + bond-context templates
 * - Adds lightweight memory/continuity (recent events + unresolved threads)
 * - Adds templated narrative slots with neighborhood venues/institutions
 * - Keeps sports generalized (season-stage only; no specific teams)
 *
 * Determinism:
 * - Uses ctx.rng() if provided
 * - Else uses ctx.config.rngSeed via mulberry32_
 * - Else falls back to Math.random
 * ============================================================================
 */

/** RNG (optional determinism via ctx.config.rngSeed) */
// mulberry32_ def deleted S199 (Phase B.5 collision dedup) —
// canonical impl lives in phase07-evening-media/textureTriggers.js,
// resolved via Apps Script flat namespace.

function generateCitizensEvents_(ctx) {
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('generateCitizensEvents_: ctx.ledger not initialized');
  }
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;
  function idx(n) { return header.indexOf(n); }

  var iTier = idx("Tier");
  var iClock = idx("ClockMode");
  var iLife = idx("LifeHistory");
  var iLastU = idx("LastUpdated");
  var iPopID = idx("POPID");
  var iFirst = idx("First");
  var iLast = idx("Last");
  var iNeighborhood = idx("Neighborhood");

  // v2.5: Optional attributes (no schema requirement)
  var iBirthYear = idx("BirthYear");
  // engine.67 step 5b (S325 root-cause): the ledger has NO "Occupation" column —
  // the job column is RoleType. idx("Occupation") returned -1 since the column
  // rename, so occupation = "" for every citizen: the work-texture pool NEVER
  // fired (bench C102-C111 confirmed adult work events = 0) and lifeState.working
  // derived 'none' for every worker. RoleType is the canon job for ENGINE
  // citizens (the occupation pool is already ENGINE-only-gated downstream).
  var iOccupation = idx("Occupation");
  if (iOccupation < 0) iOccupation = idx("RoleType");
  var iTierRole = idx("TierRole");
  var iType = idx("Type");
  var iUsage = idx("UsageCount"); // engine.32 T3 — fame seam (SL appearance counter)
  var iStatus = idx("Status"); // engine.38 A1-cont (S277) — deceased-exclusion guard
  // S280 column-conditioned depth (Mike-direct): the ledger's family/household/
  // means columns ARE the levers — texture conditions on the citizen's actual
  // row, not on blanket-neutral phrasing. All optional (idx -1 tolerated).
  var iHousehold = idx("HouseholdId");
  var iMarital = idx("MaritalStatus");
  var iNumChildren = idx("NumChildren");
  var iWealth = idx("WealthLevel");
  var iDisplRisk = idx("DisplacementRisk");
  var iMemReg = idx("MemoryRegisters"); // engine.38 B3 read (S283, seams Task 9) — unlived echo source

  if (iTier < 0 || iClock < 0 || iLife < 0 || iLastU < 0 || iPopID < 0) return;

  var lifeLog = ctx.ss.getSheetByName("LifeHistory_Log");
  var S = ctx.summary || (ctx.summary = {});
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  // engine.38 A2 — anti-inert floor signal. LifeHistory_Log is append-only (no
  // clearer, compressor doesn't touch it), so its Cycle column is a persistent
  // per-citizen "last event cycle" — and it sees coverage from ALL generators,
  // not just this one. One read per cycle builds the map; a citizen dark for
  // more than ANTI_INERT_N cycles is forced to live a quiet week (gate below).
  var ANTI_INERT_N = 3;
  var lastEventCycleByPop = Object.create(null);
  if (lifeLog && typeof lifeLog.getLastRow === "function" && lifeLog.getLastRow() > 1) {
    var logVals = lifeLog.getDataRange().getValues();
    var logHdr = logVals[0] || [];
    var iLogPop = logHdr.indexOf("POPID");
    var iLogCyc = logHdr.indexOf("Cycle");
    if (iLogPop >= 0 && iLogCyc >= 0) {
      for (var lv = 1; lv < logVals.length; lv++) {
        var lp = logVals[lv][iLogPop];
        var lc = Number(logVals[lv][iLogCyc]) || 0;
        if (lp && (!(lp in lastEventCycleByPop) || lc > lastEventCycleByPop[lp])) {
          lastEventCycleByPop[lp] = lc;
        }
      }
    }
  }

  // S280 depth-step: POPID -> display-name map so relationship/arc texture can
  // name the actual counterpart (bonds store IDs only). One pass over rows
  // already in memory; no sheet read.
  var nameByPop = Object.create(null);
  for (var nbi = 0; nbi < rows.length; nbi++) {
    var nbPop = rows[nbi][iPopID];
    if (!nbPop) continue;
    var nbName = (((iFirst >= 0 ? rows[nbi][iFirst] : "") || "") + " " + ((iLast >= 0 ? rows[nbi][iLast] : "") || "")).trim();
    if (nbName) nameByPop[String(nbPop).trim().toUpperCase()] = nbName;
  }

  // engine.38 B1 (S283): named public figures — the bias-lite pool's target
  // universe (Design B1 v1: public figures only, Mike S281). Rides the same
  // fame data as the T3 recognition seam (UsageCount >= 8; S255 audit put
  // ~15 citizens at that bar). Ledger order, capped — deterministic. One
  // pass over rows already in memory; no sheet read.
  var PUBLIC_FIGURE_FAME_MIN = 8;
  var PUBLIC_FIGURE_CAP = 15;
  var publicFigures = [];
  if (iUsage >= 0) {
    for (var pfi = 0; pfi < rows.length && publicFigures.length < PUBLIC_FIGURE_CAP; pfi++) {
      if ((Number(rows[pfi][iUsage]) || 0) < PUBLIC_FIGURE_FAME_MIN) continue;
      var pfPop = rows[pfi][iPopID];
      if (!pfPop) continue;
      var pfStatus = iStatus >= 0 ? String(rows[pfi][iStatus] || "").trim().toLowerCase() : "";
      // engine.64c (S323): traded/pending are off-camera — no public-figure slots.
      if (pfStatus === "deceased" || pfStatus === "traded" || pfStatus === "pending") continue;
      var pfName = nameByPop[String(pfPop).trim().toUpperCase()];
      if (pfName) publicFigures.push({ name: pfName, popId: String(pfPop).trim().toUpperCase() });
    }
  }

  // Prefer injected RNG, else seed, else Math.random
  var rng = (typeof ctx.rng === "function")
    ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === "number")
      ? mulberry32_((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0))
      : (function(){ throw new Error('generateCitizensEvents: ctx.rng or ctx.config.rngSeed required (Phase 40.3 Path 1)'); })();
  function roll() { return rng(); }
  function chanceHit(p) { return roll() < p; }
  function pickOne(arr) { return arr[Math.floor(roll() * arr.length)]; }

  // =========================================================================
  // WORLD CONTEXT
  // =========================================================================
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || { sentiment: 0, culturalActivity: 1, communityEngagement: 1 };
  var econMood = S.economicMood || 50;

  // Calendar context (v2.4)
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;
  var sportsSeason = S.sportsSeason || "off-season";

  // v2.5: Sim year for age grouping (defaults to 2041 if not provided)
  var simYear = Number(S.simYear || S.simulationYear || 2041);

  // =========================================================================
  // v2.6: CRIME METRICS CONTEXT (from updateCrimeMetrics v1.2)
  // =========================================================================
  var crimeMetrics = S.crimeMetrics || {};
  var cityQoL = crimeMetrics.qualityOfLifeIndex || 0.5;
  var patrolStrategy = crimeMetrics.patrolStrategy || 'balanced';
  var enforcementCapacity = crimeMetrics.enforcementCapacity || 1.0;
  var crimeHotspots = crimeMetrics.hotspots || [];
  var neighborhoodCrime = crimeMetrics.neighborhoodBreakdown || {};

  // =========================================================================
  // v2.6: NEIGHBORHOOD DYNAMICS ACCESSOR (from applyCityDynamics v2.6)
  // =========================================================================
  function getNeighborhoodContext_(nh) {
    // Try accessor function first
    if (typeof getNeighborhoodDynamics_ === 'function') {
      return getNeighborhoodDynamics_(ctx, nh);
    }
    // Fallback to crimeMetrics neighborhood breakdown
    if (neighborhoodCrime[nh]) {
      return {
        qualityOfLifeIndex: neighborhoodCrime[nh].qualityOfLifeIndex || 0.5,
        sentiment: dynamics.sentiment || 0,
        crimeLevel: neighborhoodCrime[nh].crimeLevel || 'moderate'
      };
    }
    // Default
    return {
      qualityOfLifeIndex: cityQoL,
      sentiment: dynamics.sentiment || 0,
      crimeLevel: 'moderate'
    };
  }

  // =========================================================================
  // v2.6: WEATHER v3.5 FULL CONTEXT
  // =========================================================================
  var precipitationIntensity = weather.precipitationIntensity || 0;
  var visibility = weather.visibility || 1;
  var windSpeed = weather.windSpeed || 0;
  var frontType = weather.frontType || 'none';

  // Limit
  var count = 0;
  // engine.38 A1: full-population dial-weighted participation replaces the
  // LIMIT=25 catch-up throttle. Every Tier-3/4 ENGINE citizen rolls to live a
  // logged week at PARTICIPATION_BASE x activityScore(dials) — extroverts get
  // eventful weeks, homebodies quiet ones. Tuned via scripts/coverageReport.js.
  var PARTICIPATION_BASE = 0.72; // coverage-band tuned (target 60-80%)
  var PARTICIPATION_MAX = 0.97;  // never guaranteed-100% — preserve quiet-week texture
  // engine.38 A1-cont (S277): per-participating-citizen emit count is a random
  // 1..ATMOSPHERIC_MAX_EVENTS (was fixed 1). CONSERVATIVE DEFAULT 4 pending the
  // Task 6 perf gate — Mike's target is 6-8 "depending on what a cycle run can
  // handle"; tune UP only after a clean full-cycle run confirms runtime/quota
  // + compressor capacity at the higher multiple. Keep low until then.
  var ATMOSPHERIC_MAX_EVENTS = 4;

  // Active citizens tracker (dedup) - use object for ES5 Set-like behavior.
  // guaranteedInObj = the upstream cycleActiveCitizens set, unioned in below as
  // always-participate (events from upstream engines guarantee a logged week).
  var activeSetObj = Object.create(null);
  var guaranteedInObj = Object.create(null);
  var initialActives = Array.isArray(S.cycleActiveCitizens) ? S.cycleActiveCitizens : [];
  for (var ai = 0; ai < initialActives.length; ai++) {
    activeSetObj[initialActives[ai]] = true;
    guaranteedInObj[initialActives[ai]] = true;
  }
  S.cycleActiveCitizens = Object.keys(activeSetObj);

  // =========================================================================
  // v2.5: LIGHTWEIGHT MEMORY / CONTINUITY (no sheet schema)
  // =========================================================================
  if (!S.citizenEventMemory) {
    S.citizenEventMemory = {
      byPopId: {},
      maxRecent: 5,
      lastCycle: cycle
    };
  }
  var MEM = S.citizenEventMemory;

  function getMem(popId) {
    if (!MEM.byPopId[popId]) {
      MEM.byPopId[popId] = {
        recentTexts: [],
        recentPrimary: [],
        unresolved: {},
        lastVenue: "",
        lastNeighborhood: "",
        lastContact: "",
        lastTags: []
      };
    }
    return MEM.byPopId[popId];
  }

  function remember(popId, primaryTag, renderedText, venue, neighborhood, contactName, tags) {
    var m = getMem(popId);
    m.recentTexts.push(normText_(renderedText));
    if (m.recentTexts.length > MEM.maxRecent) m.recentTexts.shift();

    m.recentPrimary.push(primaryTag);
    if (m.recentPrimary.length > MEM.maxRecent) m.recentPrimary.shift();

    m.lastVenue = venue || m.lastVenue;
    m.lastNeighborhood = neighborhood || m.lastNeighborhood;
    m.lastContact = contactName || m.lastContact;
    m.lastTags = tags || m.lastTags;

    if (tags && tags.indexOf("relationship:rivalry") >= 0) m.unresolved.rivalry = true;
    if (tags && tags.indexOf("relationship:alliance") >= 0) m.unresolved.alliance = true;

    var hasArc = false;
    for (var i = 0; tags && i < tags.length; i++) {
      if (tags[i].indexOf("arc:") === 0 || tags[i].indexOf("arcType:") === 0) { hasArc = true; break; }
    }
    if (hasArc) m.unresolved.arc = true;

    if (chanceHit(0.25)) m.unresolved.rivalry = false;
    if (chanceHit(0.25)) m.unresolved.alliance = false;
    if (chanceHit(0.20)) m.unresolved.arc = false;
  }

  // =========================================================================
  // BUILD CITIZEN LOOKUP (extended, backward safe)
  // =========================================================================
  if (!ctx.citizenLookup) {
    ctx.citizenLookup = {};
    var iUNI = idx("UNI (y/n)");
    var iMED = idx("MED (y/n)");
    var iCIV = idx("CIV (y/n)");
    // v2.7: TraitProfile column (or OriginVault fallback)
    var iTraitProfile = idx("TraitProfile");
    if (iTraitProfile < 0) iTraitProfile = idx("OriginVault");
    // engine.31 Phase 5: DialState carries the machine truth the dial-band seam
    // reads (getCitizenDialBands_). Inert (-1 -> "") until the column exists.
    var iDialState = idx("DialState");

    for (var ri = 0; ri < rows.length; ri++) {
      var rowL = rows[ri];
      var popIdL = rowL[iPopID];
      if (!popIdL) continue;

      ctx.citizenLookup[popIdL] = {
        UNI: iUNI >= 0 ? (rowL[iUNI] || "n") : "n",
        MED: iMED >= 0 ? (rowL[iMED] || "n") : "n",
        CIV: iCIV >= 0 ? (rowL[iCIV] || "n") : "n",
        TierRole: iTierRole >= 0 ? (rowL[iTierRole] || "") : "",
        Type: iType >= 0 ? (rowL[iType] || "") : "",
        Tier: Number(rowL[iTier]) || 0,
        Neighborhood: iNeighborhood >= 0 ? (rowL[iNeighborhood] || "") : "",
        First: iFirst >= 0 ? (rowL[iFirst] || "") : "",
        Last: iLast >= 0 ? (rowL[iLast] || "") : "",
        Occupation: iOccupation >= 0 ? (rowL[iOccupation] || "") : "",
        BirthYear: iBirthYear >= 0 ? Number(rowL[iBirthYear] || 0) : 0,
        // v2.7: TraitProfile for archetype/motif access
        TraitProfile: iTraitProfile >= 0 ? (rowL[iTraitProfile] || "") : "",
        // engine.31 Phase 5: dial-band seam source (empty until DialState exists)
        DialState: iDialState >= 0 ? (rowL[iDialState] || "") : ""
      };
    }
  }

  function citizenName_(popId) {
    var c = ctx.citizenLookup && ctx.citizenLookup[popId];
    if (!c) return "";
    return ((c.First || "") + " " + (c.Last || "")).trim();
  }

  function ageGroup_(birthYear) {
    var by = Number(birthYear || 0);
    if (!by || by < 1900) return "adult";
    var age = simYear - by;
    if (age <= 22) return "youth";
    if (age <= 35) return "youngAdult";
    if (age <= 64) return "adult";
    return "senior";
  }

  // =========================================================================
  // v2.7: TRAITPROFILE HELPERS
  // =========================================================================

  /**
   * Parse TraitProfile string into structured object
   * Format: Archetype:X|Mods:a,b|trait:0.xx|TopTags:...|Motifs:...|Entries:N|...
   */
  function getCitizenTraitProfile_(popId) {
    var citizen = ctx.citizenLookup && ctx.citizenLookup[popId];
    if (!citizen || !citizen.TraitProfile) return null;

    var profileStr = citizen.TraitProfile;
    var result = { archetype: 'Drifter', modifiers: [], traits: {}, topTags: [], motifs: [], entryCount: 0 };
    var parts = String(profileStr).split('|');

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      var colonIdx = part.indexOf(':');
      if (colonIdx < 0) continue;

      var key = part.substring(0, colonIdx);
      var value = part.substring(colonIdx + 1);

      if (key === 'Archetype') result.archetype = value;
      else if (key === 'Mods') result.modifiers = value ? value.split(',') : [];
      else if (key === 'TopTags') result.topTags = value ? value.split(',') : [];
      else if (key === 'Motifs') result.motifs = value ? value.split(',') : [];
      else if (key === 'Entries') result.entryCount = parseInt(value, 10) || 0;
      else if (key !== 'V' && key !== 'Hash' && key !== 'Updated' && key !== 'Basis') {
        var numVal = parseFloat(value);
        if (!isNaN(numVal)) result.traits[key] = numVal;
      }
    }
    return result;
  }

  /**
   * Get motifs from citizen's TraitProfile
   */
  function getProfileMotifs_(popId) {
    var profile = getCitizenTraitProfile_(popId);
    return (profile && profile.motifs) ? profile.motifs : [];
  }

  /**
   * Weight multipliers for pool categories based on archetype
   * Returns object with category keys and weight multipliers
   */
  function getArchetypeWeights_(archetype) {
    var weights = {
      social: 1.0, reflective: 1.0, driven: 1.0, grounded: 1.0, volatile: 1.0,
      alliance: 1.0, rivalry: 1.0, neighborhood: 1.0, work: 1.0, continuity: 1.0
    };

    switch (archetype) {
      case 'Connector':
        weights.social = 1.4; weights.alliance = 1.3; weights.neighborhood = 1.2;
        break;
      case 'Watcher':
        weights.reflective = 1.4; weights.continuity = 1.3; weights.neighborhood = 1.1;
        break;
      case 'Striver':
        weights.driven = 1.4; weights.work = 1.3; weights.rivalry = 1.2;
        break;
      case 'Anchor':
        weights.grounded = 1.4; weights.neighborhood = 1.3; weights.continuity = 1.2;
        break;
      case 'Catalyst':
        weights.volatile = 1.3; weights.rivalry = 1.2; weights.social = 1.1;
        break;
      case 'Caretaker':
        weights.social = 1.2; weights.grounded = 1.2; weights.alliance = 1.2;
        break;
      case 'Drifter':
        weights.reflective = 1.1; weights.volatile = 1.1;
        break;
    }
    return weights;
  }

  /**
   * Derive tone from TraitProfile for template slotter
   * Tones: plain, noir, bright, tense, tender
   */
  function toneFromProfile_(profile, nhQoL) {
    if (!profile) return 'plain';

    var t = profile.traits || {};
    var volatile = t.volatile || 0;
    var social = t.social || 0;
    var reflective = t.reflective || 0;
    var grounded = t.grounded || 0;

    // Low QoL leans tense
    if (nhQoL <= 0.35 && volatile >= 0.4) return 'tense';
    if (nhQoL <= 0.35 && reflective >= 0.5) return 'noir';

    // High volatile with low grounded = tense
    if (volatile >= 0.6 && grounded < 0.4) return 'tense';

    // High social + grounded = bright
    if (social >= 0.6 && grounded >= 0.5) return 'bright';

    // High social + reflective = tender
    if (social >= 0.5 && reflective >= 0.5) return 'tender';

    // High reflective alone = noir
    if (reflective >= 0.6) return 'noir';

    return 'plain';
  }

  // v2.7: Template cooldown tracker (prevents spam)
  if (!S.templateCooldowns) S.templateCooldowns = {};
  var TEMPLATE_COOLDOWN_CYCLES = 3;

  function canUseTemplate_(popId) {
    var lastUse = S.templateCooldowns[popId] || 0;
    return (cycle - lastUse) >= TEMPLATE_COOLDOWN_CYCLES;
  }

  function markTemplateUsed_(popId) {
    S.templateCooldowns[popId] = cycle;
  }

  // =========================================================================
  // v2.7: TONE-AWARE TEMPLATE SLOTTER
  // =========================================================================

  /**
   * Beat pools by tone (lived experience voice - NO narrator framing)
   */
  var TONE_BEATS = {
    plain: [
      "crossed paths with $CONTACT at $VENUE",
      "stopped by $VENUE and noticed something small",
      "ran into $CONTACT near $INSTITUTION",
      "made a quick stop at $VENUE",
      "saw $CONTACT at $VENUE, exchanged a few words"
    ],
    noir: [
      "caught $CONTACT's eye at $VENUE—neither spoke first",
      "waited at $VENUE longer than made sense",
      "heard something at $INSTITUTION that didn't sit right",
      "noticed $CONTACT leaving $VENUE in a hurry",
      "sat alone at $VENUE, thinking through options"
    ],
    bright: [
      "laughed with $CONTACT outside $VENUE",
      "found unexpected good news at $INSTITUTION",
      "left $VENUE feeling lighter than expected",
      "bumped into $CONTACT at $VENUE and made plans",
      "shared a moment with $CONTACT near $VENUE"
    ],
    tense: [
      "avoided $CONTACT at $VENUE without making it obvious",
      "felt watched near $VENUE",
      "left $INSTITUTION faster than planned",
      "saw $CONTACT at $VENUE and kept walking",
      "noticed something off at $VENUE but said nothing"
    ],
    tender: [
      "shared a quiet moment with $CONTACT at $VENUE",
      "helped someone at $INSTITUTION without being asked",
      "listened to $CONTACT at $VENUE without interrupting",
      "left $VENUE feeling something unnamed",
      "remembered something at $VENUE that mattered"
    ]
  };

  /**
   * Build a template-slotted event using profile-derived tone
   * No role whisper, no garnish - pure lived experience voice
   */
  function buildTemplateEvent_(popId, neighborhood, contact, profile, nhQoL) {
    var tone = toneFromProfile_(profile, nhQoL);
    var beats = TONE_BEATS[tone] || TONE_BEATS.plain;
    var beat = beats[Math.floor(roll() * beats.length)];

    var venue = pickVenue_(neighborhood) || "a familiar spot";
    var institution = pickInstitution_(neighborhood) || "a local office";
    var contactName = (contact && contact.name) ? contact.name : "someone familiar";

    var rendered = beat
      .split("$VENUE").join(venue)
      .split("$INSTITUTION").join(institution)
      .split("$CONTACT").join(contactName);

    // v2.7: Motif injection (20% chance if profile has motifs)
    var motifs = (profile && profile.motifs) ? profile.motifs : [];
    if (motifs.length > 0 && chanceHit(0.20)) {
      var motif = motifs[Math.floor(roll() * motifs.length)];
      // Inject motif naturally at end
      var motifSuffixes = [
        ", near the " + motif,
        "—" + motif + " came up",
        ", thinking about " + motif
      ];
      rendered += motifSuffixes[Math.floor(roll() * motifSuffixes.length)];
    }

    return {
      text: rendered,
      tone: tone,
      tags: ["source:template", "tone:" + tone, "source:slotter"]
    };
  }

  // =========================================================================
  // TAGGED POOL HELPERS
  // =========================================================================
  function makeEntry(text, tags, weight, template) {
    return {
      text: text,
      tags: Array.isArray(tags) ? tags : [],
      weight: (weight === 0 || weight) ? Number(weight) : 1,
      template: !!template
    };
  }

  function mergeTags(baseTags, extraTags) {
    var seen = Object.create(null);
    var out = [];
    function add(t) { if (t && !seen[t]) { seen[t] = true; out.push(t); } }
    var base = baseTags || [];
    var extra = extraTags || [];
    for (var bi = 0; bi < base.length; bi++) { add(base[bi]); }
    for (var ei = 0; ei < extra.length; ei++) { add(extra[ei]); }
    return out;
  }

  var calendarTags = (function() {
    var tags = [];
    if (holiday !== "none") tags.push("holiday:" + holiday);
    if (holidayPriority !== "none") tags.push("holidayPriority:" + holidayPriority);
    if (isFirstFriday) tags.push("firstFriday");
    if (isCreationDay) tags.push("creationDay");
    if (sportsSeason && sportsSeason !== "off-season") tags.push("sportsSeason:" + sportsSeason);
    return tags;
  })();

  function primaryFromTags(tags) {
    function has(t) { return tags.indexOf(t) >= 0; }
    if (has("source:qol")) return "QoL";
    if (has("source:media")) return "Media";
    if (has("source:weather")) return "Weather";
    if (has("source:fame")) return "Reputation"; // engine.32 T3
    if (has("relationship:rivalry")) return "Rivalry";
    if (has("relationship:alliance")) return "Alliance";
    if (has("relationship:mentorship")) return "Mentorship";
    for (var ti = 0; ti < tags.length; ti++) {
      if (tags[ti].indexOf("arc:") === 0) return "Arc";
      if (tags[ti].indexOf("arcType:") === 0) return "Arc";
    }
    if (has("source:prevEvening")) return "PrevEvening";
    // engine.33 T6 — state-conditioned entries route to existing dial/pulse
    // vocab by state kind (no new dial vocab).
    if (has("source:nbhdState")) {
      if (has("state:community")) return "Community";
      if (has("state:retail")) return "Lifestyle";
      return "Neighborhood";
    }
    if (has("source:faith")) return "Faith"; // engine.33 T9 — dial warmth/composure + hood pulse
    if (has("source:neighborhood")) return "Neighborhood";
    if (has("source:firstFriday")) return "FirstFriday";
    if (has("source:creationDay")) return "CreationDay";
    if (has("source:holiday")) return "Holiday";
    if (has("source:sports")) return "Sports";
    if (has("source:occupation")) return "Work";
    if (has("source:continuity")) return "Continuity";
    // S280 depth-step: human-domain moments route to EXISTING ambient-scale
    // dial keys (no new vocab). familyLife falls through to Daily {c2,f1} —
    // already the family-tinted ambient.
    if (has("source:homeLife")) return "Background";
    if (has("source:reflection")) return "Personal";
    if (has("source:identity")) return "Personal";
    if (has("source:listening")) return "Personal";
    if (has("source:groove")) return "Micro-Event";
    if (has("source:civicNews")) return "Civic Perception";
    if (has("source:bias")) return "Civic Perception"; // engine.38 B1 — opinion-about-public-figure, same ambient civic key
    if (has("source:retirement")) return "PostCareer";
    if (has("source:curiosity")) return "Lifestyle";
    if (has("source:communityLife")) return "Neighborhood";
    return "Daily";
  }

  function normText_(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  // engine.38 B3 read (seams Task 9): unlived echo — a stored branch event
  // resurfaces when the recent life RHYMES (tag-family match against the
  // LifeHistory tail). Text composes VAGUELY at read time from the stored
  // actual event (B3 derivation rule: nothing false is ever persisted or
  // stated — "the job they didn't take", never an invented specific).
  // Route: source:identity -> Personal (composure-light ambient, S280 key).
  var UNLIVED_ECHO_TEXT = {
    careershift: "caught themselves thinking about the job they didn't take",
    relocation: "thought for a moment about the version of them that stayed",
    displacementmove: "thought for a moment about the version of them that stayed",
    divorce: "wondered briefly about the life that marriage might have been",
    retirement: "missed the working years for a heartbeat, then let it go",
    businessclose: "passed a shuttered storefront and thought of the business that didn't make it"
  };
  var UNLIVED_RHYME = {
    careershift: ["career", "work", "promotion", "job", "postcareer"],
    relocation: ["relocation", "move", "housing", "displacement", "neighborhood"],
    displacementmove: ["relocation", "move", "housing", "displacement", "economy"],
    divorce: ["divorce", "wedding", "marriage", "anniversary"],
    retirement: ["retirement", "postcareer", "work"],
    businessclose: ["business"]
  };
  function unlivedEchoEntry_(memRegStr, lifeStr) {
    if (!memRegStr) return null;
    var reg = null;
    try { reg = JSON.parse(String(memRegStr)); } catch (e) { return null; }
    if (!reg || !Array.isArray(reg.unlived) || !reg.unlived.length) return null;
    var tail = String(lifeStr || "").split("\n").filter(function(l) { return l; }).slice(-5).join("\n");
    if (!tail) return null;
    var tailTags = [];
    var reTag = /\[([^\]]+)\]/g;
    var mtag;
    while ((mtag = reTag.exec(tail)) !== null) tailTags.push(String(mtag[1]).toLowerCase());
    if (!tailTags.length) return null;
    for (var ui = 0; ui < reg.unlived.length; ui++) {
      var key = String((reg.unlived[ui] && reg.unlived[ui].tag) || "").toLowerCase();
      var fam = UNLIVED_RHYME[key];
      if (!fam) continue;
      for (var fi = 0; fi < fam.length; fi++) {
        for (var ti = 0; ti < tailTags.length; ti++) {
          if (tailTags[ti].indexOf(fam[fi]) >= 0) {
            return makeEntry(UNLIVED_ECHO_TEXT[key] || "let a thought of a path not taken drift through, then set it down",
              ["source:identity", "unlived:echo"], 0.9, false);
          }
        }
      }
    }
    return null;
  }

  function pickWeighted_(arr) {
    var total = 0;
    for (var i = 0; i < arr.length; i++) total += Math.max(0.001, Number(arr[i].weight || 1));
    var r = roll() * total;
    var acc = 0;
    for (var j = 0; j < arr.length; j++) {
      acc += Math.max(0.001, Number(arr[j].weight || 1));
      if (r <= acc) return arr[j];
    }
    return arr[arr.length - 1];
  }

  // ===========================================================================
  // engine.38 Design A (seams Task 11): Event_Content_Ledger composer + gates.
  // Loader (phase02 loadEventContentLedger_) compiled Conditions to predicate
  // terms and validated source tags; this side EVALUATES per citizen and
  // composes drawn lines. Fail-closed throughout (S289): missing data narrows
  // eligibility, a line whose fragment slots can't fill for this citizen never
  // enters the pool, and raw $SLOT text can never reach LifeHistory.
  // ===========================================================================
  var CONTENT_ENTITY_SLOTS = { VENUE: 1, INSTITUTION: 1, CONTACT: 1 }; // resolved code-side, not from fragments

  function contentSlotTokens_(text) {
    var out = [], re = /\$([A-Z_]+)/g, m;
    while ((m = re.exec(String(text))) !== null) { if (out.indexOf(m[1]) < 0) out.push(m[1]); }
    return out;
  }

  function evalContentConditions_(terms, scopes) {
    if (!terms || !terms.length) return true;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (t.op === "flag") { if (!scopes[t.f]) return false; continue; }
      var actual = scopes[t.f];
      if (actual === null || actual === undefined || actual === "") return false; // missing data narrows, never widens
      if (typeof t.v === "number") {
        var av = Number(actual);
        if (isNaN(av)) return false;
        if (t.op === "<=") { if (!(av <= t.v)) return false; }
        else if (t.op === ">=") { if (!(av >= t.v)) return false; }
        else if (t.op === "<") { if (!(av < t.v)) return false; }
        else if (t.op === ">") { if (!(av > t.v)) return false; }
        else if (t.op === "=") { if (av !== t.v) return false; }
        else if (t.op === "!=") { if (av === t.v) return false; }
        else return false;
      } else {
        var as = String(actual).toLowerCase(), vs = String(t.v).toLowerCase();
        if (t.op === "=") { if (as !== vs) return false; }
        else if (t.op === "!=") { if (as === vs) return false; }
        else return false;
      }
    }
    return true;
  }

  // Injection-time guarantee: every fragment slot in this line has >=1
  // fragment eligible for THIS citizen. Entity slots skip the check (always
  // resolvable code-side). Slot list cached on the entry (load-once shape).
  function contentSlotsFillable_(le, ledger, scopes) {
    if (!le.slots) le.slots = contentSlotTokens_(le.text);
    for (var si = 0; si < le.slots.length; si++) {
      var slot = le.slots[si];
      if (CONTENT_ENTITY_SLOTS[slot]) continue;
      var frags = ledger.fragments[slot];
      if (!frags || !frags.length) return false;
      var any = false;
      for (var fi = 0; fi < frags.length; fi++) {
        if (evalContentConditions_(frags[fi].conditions, scopes)) { any = true; break; }
      }
      if (!any) return false;
    }
    return true;
  }

  // Compose a DRAWN ledger line: weighted-draw an eligible fragment per
  // content slot (ctx.rng via roll(), replay-identical); entity slots resolve
  // from the caller (the ledger adds content slots, it does not re-plumb
  // entity slots — plan §Composer). Returns null if any token can't fill —
  // caller drops the emit (belt-and-suspenders under the injection check).
  function composeContentLine_(entry, ledger, entityValues, scopes) {
    var text = entry.text;
    var slots = entry.slots || contentSlotTokens_(text);
    for (var si = 0; si < slots.length; si++) {
      var slot = slots[si];
      var value = "";
      if (CONTENT_ENTITY_SLOTS[slot]) {
        value = entityValues[slot] || "";
      } else {
        var eligible = [];
        var frags = ledger.fragments[slot] || [];
        for (var fi = 0; fi < frags.length; fi++) {
          if (evalContentConditions_(frags[fi].conditions, scopes)) eligible.push(frags[fi]);
        }
        if (eligible.length) value = pickWeighted_(eligible).text;
      }
      if (!value) return null;
      text = text.split("$" + slot).join(value);
    }
    return text.replace(/\s+/g, " ").trim();
  }

  // =========================================================================
  // v2.5: LOCAL ENTITIES / VENUES
  // =========================================================================
  var defaultEntities = {
    neighborhoods: {
      "Temescal": { venues: ["a Temescal cafe", "Temescal Alley", "a small gallery"], institutions: ["a community board", "a neighborhood association"] },
      "Downtown": { venues: ["City Hall steps", "a busy plaza", "a late-night diner"], institutions: ["a civic office", "a public service desk"] },
      "Fruitvale": { venues: ["Fruitvale BART area", "a taqueria patio", "a corner market"], institutions: ["a community clinic", "a cultural center"] },
      "Lake Merritt": { venues: ["the lakeside path", "the pergola", "a bench near the water"], institutions: ["a volunteer meetup", "a public program"] },
      "West Oakland": { venues: ["an old warehouse corridor", "a porch-lit block", "a local pop-up"], institutions: ["a mutual aid table", "a community workshop"] },
      "Laurel": { venues: ["a quiet main street", "a neighborhood bakery", "a small park"], institutions: ["a school fundraiser", "a local council meeting"] },
      "Rockridge": { venues: ["College Avenue", "a bookstore corner", "a coffee line"], institutions: ["a PTA meeting", "a small business association"] },
      "Jack London": { venues: ["the waterfront", "a ferry-adjacent corner", "a patio by the estuary"], institutions: ["a port office", "a transit desk"] },
      "Uptown": { venues: ["Fox Theater frontage", "a gallery opening", "a street mural"], institutions: ["an arts nonprofit", "a venue coordinator"] },
      "KONO": { venues: ["a mural-lined block", "a pop-up studio", "a DIY show space"], institutions: ["an artist collective", "a community studio"] },
      "Chinatown": { venues: ["a lantern-lit storefront", "a small bakery line", "a herb shop"], institutions: ["a merchant association", "a family business network"] },
      "Piedmont Ave": { venues: ["a boutique corner", "a tree-lined cafe", "a calm sidewalk stretch"], institutions: ["a neighborhood meetup", "a local volunteer circle"] }
    },
    occupation: {
      "Barista": ["a rush-hour counter", "a coffee order gone sideways", "a regular with a strange request"],
      "Server": ["a table with unusual energy", "a late reservation that changed the shift", "a customer who tipped in a story"],
      "Cook": ["a new prep routine", "a recipe tweak that actually worked", "a supply hiccup that forced improvisation"],
      "Bartender": ["a quiet confession at the bar", "a sudden crowd change", "a regular starting trouble—softly"],
      "Retail clerk": ["a return that turned into a conversation", "a shoplifter scare that wasn't", "a display that drew attention"],
      "Driver": ["a reroute that revealed something odd", "a passenger who overshared", "a near-miss that reset the night"],
      "Warehouse worker": ["a shift rumor that felt too accurate", "a mislabeled pallet mystery", "a safety drill that got real"],
      "Mechanic": ["a car problem that hinted at a bigger issue", "a customer who didn't tell the whole story", "a fix that bought someone time"],
      "Teacher": ["a student comment that lingered", "a meeting that shifted priorities", "a classroom moment that felt important"],
      "Nurse": ["a hectic hour that tested patience", "a small kindness that mattered", "a tense wait that ended quietly"],
      "Security guard": ["a suspicious loop that went nowhere", "a calm de-escalation", "a pattern they can't unsee"],
      "Janitor": ["an overheard conversation", "a found object with a story", "a hallway that felt different tonight"]
    }
  };

  var entities = (S.localEntities && typeof S.localEntities === "object")
    ? S.localEntities
    : defaultEntities;

  function pickVenue_(neighborhood) {
    var nh = entities.neighborhoods && entities.neighborhoods[neighborhood];
    var list = nh && nh.venues;
    if (!list || !list.length) return "";
    return list[Math.floor(roll() * list.length)];
  }

  function pickInstitution_(neighborhood) {
    var nh = entities.neighborhoods && entities.neighborhoods[neighborhood];
    var list = nh && nh.institutions;
    if (!list || !list.length) return "";
    return list[Math.floor(roll() * list.length)];
  }

  function pickOccFlavor_(occupation) {
    var list = entities.occupation && entities.occupation[occupation];
    if (!list || !list.length) return "";
    return list[Math.floor(roll() * list.length)];
  }

  function renderTemplate_(tpl, slots) {
    var out = tpl;
    for (var k in slots) {
      if (!slots.hasOwnProperty(k)) continue;
      out = out.split("$" + k).join(slots[k]);
    }
    out = out.replace(/\s+/g, " ").trim();
    return out;
  }

  // =========================================================================
  // v2.6: QOL-AWARE EVENT POOLS
  // =========================================================================
  function qolPoolFor_(nhContext) {
    var qol = nhContext.qualityOfLifeIndex || 0.5;
    var pool = [];

    if (qol <= 0.35) {
      // Low QoL — negative civic texture
      pool.push(makeEntry("noticed increased patrols on the block", ["source:qol", "qol:low"], 1.2, false));
      pool.push(makeEntry("felt the neighborhood tension in small interactions", ["source:qol", "qol:low"], 1.15, false));
      pool.push(makeEntry("avoided a block with reported issues", ["source:qol", "qol:low"], 1.1, false));
      pool.push(makeEntry("overheard neighbors discussing recent disturbances", ["source:qol", "qol:low"], 1.1, false));
      pool.push(makeEntry("noticed more people keeping to themselves lately", ["source:qol", "qol:low"], 1.05, false));
    } else if (qol <= 0.45) {
      // Moderate-low QoL
      pool.push(makeEntry("noticed minor disorder that went unaddressed", ["source:qol", "qol:moderate-low"], 1.05, false));
      pool.push(makeEntry("felt a subtle edge to the neighborhood vibe", ["source:qol", "qol:moderate-low"], 1.0, false));
    } else if (qol >= 0.75) {
      // High QoL — positive civic texture
      pool.push(makeEntry("appreciated the neighborhood's calm evening atmosphere", ["source:qol", "qol:high"], 1.1, false));
      pool.push(makeEntry("noticed neighbors looking out for each other", ["source:qol", "qol:high"], 1.1, false));
      pool.push(makeEntry("felt safe walking the block after dark", ["source:qol", "qol:high"], 1.05, false));
    } else if (qol >= 0.65) {
      // Moderate-high QoL
      pool.push(makeEntry("noticed small improvements in the neighborhood", ["source:qol", "qol:moderate-high"], 1.0, false));
    }

    return pool;
  }

  // v2.6: Patrol strategy flavor
  function patrolPoolFor_(strategy, isHotspot) {
    var pool = [];
    if (strategy === 'suppress_hotspots' && isHotspot) {
      pool.push(makeEntry("noticed concentrated police presence on the block", ["source:qol", "patrol:suppress"], 1.1, false));
      pool.push(makeEntry("felt watched but not necessarily safer", ["source:qol", "patrol:suppress"], 1.05, false));
    } else if (strategy === 'community_presence') {
      pool.push(makeEntry("saw officers on foot patrol, nodding at neighbors", ["source:qol", "patrol:community"], 1.0, false));
      pool.push(makeEntry("noticed community-oriented policing efforts", ["source:qol", "patrol:community"], 0.95, false));
    }
    return pool;
  }

  // =========================================================================
  // v2.6: WEATHER v3.5 ENHANCED POOLS
  // =========================================================================
  function weatherV35Pool_(neighborhood) {
    var pool = [];

    // engine.33 T7 — prefer the hood's microclimate where it carries the
    // field (applyWeatherModel PART 6: temp/type/windSpeed/precipitation);
    // citywide fallback unchanged. visibility + frontType are citywide-only
    // fields and stay citywide. Unknown hood -> null -> fallback (accessor
    // contract, same shape as engine.31 crimeReachable).
    var nhW = (S.neighborhoodWeather && neighborhood) ? S.neighborhoodWeather[neighborhood] : null;
    var precipLocal = (nhW && nhW.precipitationIntensity !== undefined) ? nhW.precipitationIntensity : precipitationIntensity;
    var windLocal = (nhW && nhW.windSpeed !== undefined) ? nhW.windSpeed : windSpeed;

    // Precipitation intensity
    if (precipLocal >= 0.7) {
      pool.push(makeEntry("got caught in heavy rain and had to take shelter", ["source:weather", "weather:heavy-rain"], 1.2, false));
      pool.push(makeEntry("watched the downpour from a doorway, waiting it out", ["source:weather", "weather:heavy-rain"], 1.1, false));
    } else if (precipLocal >= 0.3) {
      pool.push(makeEntry("walked through drizzle, unbothered", ["source:weather", "weather:drizzle"], 1.0, false));
    }

    // Visibility
    if (visibility <= 0.3) {
      pool.push(makeEntry("navigated carefully through thick fog", ["source:weather", "weather:low-visibility"], 1.15, false));
      pool.push(makeEntry("felt the fog muffle the city's usual sounds", ["source:weather", "weather:fog"], 1.1, false));
    }

    // Wind
    if (windLocal >= 25) {
      pool.push(makeEntry("braced against strong gusts on the walk home", ["source:weather", "weather:wind"], 1.1, false));
    }

    // engine.33 T7 — microclimate divergence: the hood's weather differs
    // from the citywide read. Fog rolled into THIS hood while the city
    // stayed clear; temp gap >=4°F only at heat-front extremes (tempMod
    // -2..+2 plus ±2 HEAT amplification, measured applyWeatherModel L27-39).
    if (nhW && nhW.type === 'fog' && weather.type !== 'fog') {
      pool.push(makeEntry("watched fog settle over " + neighborhood + " while the rest of the city stayed clear",
        ["source:weather", "weather:microclimate-fog"], 1.1, false));
    }
    if (nhW && nhW.temp !== undefined && weather.temp !== undefined) {
      var dTemp = nhW.temp - weather.temp;
      if (dTemp >= 4) {
        pool.push(makeEntry("felt " + neighborhood + " holding the heat more than the rest of town",
          ["source:weather", "weather:warm-pocket"], 1.0, false));
      } else if (dTemp <= -4) {
        pool.push(makeEntry("felt the cool pocket " + neighborhood + " keeps when the bay air rolls in",
          ["source:weather", "weather:cool-pocket"], 1.0, false));
      }
    }

    // Front types
    if (frontType === 'cold_front') {
      pool.push(makeEntry("felt the sudden temperature drop as the front moved in", ["source:weather", "weather:cold-front"], 1.1, false));
    } else if (frontType === 'warm_front') {
      pool.push(makeEntry("noticed the air turn humid as weather shifted", ["source:weather", "weather:warm-front"], 1.0, false));
    } else if (frontType === 'atmospheric_river') {
      pool.push(makeEntry("hunkered down as the atmospheric river arrived", ["source:weather", "weather:atmospheric-river"], 1.25, false));
    }

    return pool;
  }

  // =========================================================================
  // PREVIOUS EVENING POOL (carry-forward from last cycle)
  // =========================================================================
  function previousEveningPool_(neighborhood, outaboutMult) {
    var pool = [];
    var prev = S.previousEvening;
    if (!prev) return pool;

    // Crowd hotspots — citizen recalls last night's busiest areas
    var hotspots = prev.crowdHotspots || [];
    if (hotspots.length > 0) {
      pool.push(makeEntry("heard " + hotspots[0] + " was packed last night",
        ["source:prevEvening", "evening:crowd"], 1.1, false));
      if (hotspots.length > 1) {
        pool.push(makeEntry("avoided " + hotspots[1] + " after hearing about last night's crowds",
          ["source:prevEvening", "evening:crowd"], 1.05, false));
      }
    }
    // Citizen's own neighborhood was a hotspot
    if (neighborhood && prev.topCrowds && prev.topCrowds[neighborhood] >= 6) {
      pool.push(makeEntry("noticed the neighborhood was still buzzing from last night",
        ["source:prevEvening", "evening:crowd", "nh:" + neighborhood], 1.15, false));
    }

    // Nightlife volume
    var vol = prev.nightlifeVolume || 0;
    if (vol >= 7) {
      pool.push(makeEntry("still feeling the energy from last night's city buzz",
        ["source:prevEvening", "evening:nightlife"], 1.1, false));
      pool.push(makeEntry("overheard coworkers talking about last night's scene",
        ["source:prevEvening", "evening:nightlife"], 1.0, false));
    } else if (vol <= 2) {
      pool.push(makeEntry("noticed the city was quieter than usual last night",
        ["source:prevEvening", "evening:nightlife"], 1.0, false));
    }

    // Nightlife vibe
    var vibe = prev.nightlifeVibe || "normal";
    if (vibe === "lively" || vibe === "electric" || vibe === "celebratory") {
      pool.push(makeEntry("someone mentioned last night felt electric downtown",
        ["source:prevEvening", "evening:vibe"], 1.05, false));
    } else if (vibe === "cozy" || vibe === "pub-crawl") {
      pool.push(makeEntry("heard folks kept things low-key last night",
        ["source:prevEvening", "evening:vibe"], 1.0, false));
    }

    // Evening safety
    var safety = prev.eveningSafety || "normal";
    if (safety === "tense" || safety === "uneasy") {
      pool.push(makeEntry("stayed cautious after hearing last night felt tense",
        ["source:prevEvening", "evening:safety"], 1.15, false));
      pool.push(makeEntry("noticed neighbors being more watchful today",
        ["source:prevEvening", "evening:safety"], 1.1, false));
    } else if (safety === "celebratory" || safety === "festive-crowded") {
      pool.push(makeEntry("still buzzing from last night's celebrations",
        ["source:prevEvening", "evening:safety"], 1.1, false));
    }

    // Evening traffic
    var traffic = prev.eveningTraffic || "light";
    if (traffic === "heavy" || traffic === "gridlock") {
      pool.push(makeEntry("adjusted today's plans after last night's gridlock",
        ["source:prevEvening", "evening:traffic"], 1.05, false));
    }

    // Food trend
    if (prev.foodTrend) {
      pool.push(makeEntry("heard about " + prev.foodTrend + " trending at local restaurants",
        ["source:prevEvening", "evening:food"], 1.0, false));
    }

    // Famous sightings
    var famous = prev.famousNames || [];
    if (famous.length > 0) {
      pool.push(makeEntry("overheard someone saw " + famous[0] + " last night",
        ["source:prevEvening", "evening:famous"], 1.1, false));
    }

    // Streaming trend
    if (prev.streamingTrend) {
      pool.push(makeEntry("caught a conversation about " + prev.streamingTrend + " everyone's watching",
        ["source:prevEvening", "evening:streaming"], 1.0, false));
    }

    // Evening sports
    if (prev.eveningSports) {
      pool.push(makeEntry("heard folks still talking about last night's " + prev.eveningSports,
        ["source:prevEvening", "evening:sports"], 1.1, false));
    }

    // engine.32 T8 / engine.38 A4 — fan-out: last night's SPECIFIC city events
    // reach citizens. Attendance is now an OUT-AND-ABOUT RADIUS, not a strict
    // neighborhood match: same-neighborhood always attends; high-outabout
    // citizens "travel" to attend events in other neighborhoods (damped weight);
    // low-outabout citizens "hear about" the elsewhere events. The attend entry
    // carries a reserve-the-draw weight so an eligible attendee reliably surfaces
    // it from the weighted pool. evening:cityEventAttend -> ×sociability in the
    // dial loop; source:prevEvening -> outabout nudge, closing the feedback loop.
    var oa = (typeof outaboutMult === "number") ? outaboutMult : 1.0;
    var travels = oa >= 1.15; // upper-band out-and-about -> attends across town
    var cityEvs = prev.cityEvents || [];
    for (var cvi = 0; cvi < cityEvs.length; cvi++) {
      var cv = cityEvs[cvi];
      if (!cv || !cv.name) continue;
      if (neighborhood && cv.neighborhood === neighborhood) {
        // home-neighborhood event — reliably drawn (reserve-the-draw weight)
        pool.push(makeEntry("joined the crowd at " + cv.name + " last night",
          ["source:prevEvening", "evening:cityEventAttend", "nh:" + neighborhood], 2.6, false));
        pool.push(makeEntry("ran into neighbors at " + cv.name,
          ["source:prevEvening", "evening:cityEventAttend", "nh:" + neighborhood], 1.4, false));
      } else if (travels) {
        // out-and-about citizen travels to it — damped by how far out they get
        pool.push(makeEntry("headed over to " + cv.name + (cv.neighborhood ? " in " + cv.neighborhood : "") + " last night",
          ["source:prevEvening", "evening:cityEventAttend", "nh:" + (cv.neighborhood || "")], 1.6 * oa, false));
      } else {
        pool.push(makeEntry("heard about " + cv.name + (cv.neighborhood ? " over in " + cv.neighborhood : "") + " last night",
          ["source:prevEvening", "evening:cityEvent"], 1.0, false));
      }
    }

    return pool;
  }

  // =========================================================================
  // engine.33 T6: NEIGHBORHOOD STATE POOL (S.neighborhoodState, prev cycle's
  // Neighborhood_Map via Phase2-NeighborhoodState loader — one-cycle lag).
  // Thresholds sized from live ranges measured S256 cycle 96: crimeIndex 0-1,
  // retailVitality 6.6-15.1, sentiment 0.55-0.66 (pulse fold cap ±0.15 makes
  // both mood branches reachable through the loop). Trajectory / housing
  // branches live off the S315 trajectory block (neighborhoodTrajectoryEngine;
  // vocab: decay/steady/growth; momentum + pressure /10 scales).
  // =========================================================================
  function neighborhoodStatePool_(neighborhood) {
    var pool = [];
    var st = (S.neighborhoodState && neighborhood) ? S.neighborhoodState[neighborhood] : null;
    if (!st) return pool;

    // Experience lens (Mike-direct S296): a tracked citizen represents ~440
    // residents QUALITATIVELY — when their hood is under real pressure, their
    // day should usually be shaped by it. These weights scale WITH the
    // pressure intensity instead of sitting at ambient-noise level (the
    // pre-S296 flat ~1.1 made crisis lines statistically invisible against
    // dozens of ambient entries — West Oakland watered plants through a
    // displacement crisis, C115/C116). Counts stay at city scale; only the
    // lived texture concentrates. Cap 6.0 so ambient life never fully stops.
    function pw(base, intensity01) {
      var w = base * (1 + 4 * Math.max(0, Math.min(1, intensity01)));
      return Math.min(6, w);
    }

    // Neighborhood trajectory (S315: neighborhoodTrajectoryEngine replaces the
    // gentrification stuck-emitter; the dial is now attached to live mechanics
    // — city-relative texture signals, momentum, housing pressure — so the
    // S296 flat-weight-only rule lifts and these earn experience-weighting
    // like the crime carry.)
    var traj = (st.trajectory || '').toLowerCase();
    var tMom = Number(st.trajectoryMomentum);
    var mi = isNaN(tMom) ? 0 : Math.abs(tMom - 5) / 5; // distance from neutral → intensity 0..1
    if (traj === 'growth') {
      pool.push(makeEntry("noticed another new spot opening up in " + neighborhood,
        ["source:nbhdState", "state:trajectory-up"], pw(1.1, mi), false));
      pool.push(makeEntry("caught themselves bragging a little about the neighborhood lately",
        ["source:nbhdState", "state:trajectory-up"], pw(1.0, mi), false));
    } else if (traj === 'decay') {
      pool.push(makeEntry("walked past a storefront that never reopened in " + neighborhood,
        ["source:nbhdState", "state:trajectory-down"], pw(1.1, mi), false));
      pool.push(makeEntry("heard a neighbor wondering out loud where the block's energy went",
        ["source:nbhdState", "state:trajectory-down"], pw(1.0, mi), false));
    }

    // Housing pressure (/10) — prosperity strain: hot blocks price people tight
    var hp = Number(st.housingPressure) || 0;
    if (hp >= 6) {
      pool.push(makeEntry("compared rent notes with a neighbor over the fence in " + neighborhood,
        ["source:nbhdState", "state:housing"], pw(1.1, hp / 10), false));
      pool.push(makeEntry("ran the numbers on staying put another year",
        ["source:nbhdState", "state:housing"], pw(1.0, hp / 10), false));
    }

    // Live crime carry (engine.45 T3b, prev-cycle Crime_Metrics spikes for
    // THIS hood) — sharper than the stale crimeIndex snapshot below; a spike
    // on the block reshapes the day at spike-proportional weight.
    var carry = (S.crimeByNeighborhood && S.crimeByNeighborhood[neighborhood]) || 0;
    if (carry >= 1) {
      var ci = Math.min(1, carry / 3);
      pool.push(makeEntry("took a different route home after the recent break-ins around " + neighborhood,
        ["source:nbhdState", "state:watchful"], pw(1.1, ci), false));
      pool.push(makeEntry("counted the register twice before closing up, just in case",
        ["source:nbhdState", "state:watchful"], pw(1.0, ci), false));
      pool.push(makeEntry("swapped stories with a neighbor about what got taken up the block",
        ["source:nbhdState", "state:watchful"], pw(1.0, ci), false));
    }

    // Retail vitality — street life or papered storefronts
    if ((st.retailVitality || 0) >= 13) {
      pool.push(makeEntry("checked out a new shop that just opened nearby",
        ["source:nbhdState", "state:retail"], 1.1, false));
      pool.push(makeEntry("browsed a busy weekend market in " + neighborhood,
        ["source:nbhdState", "state:retail"], 1.05, false));
    } else if ((st.retailVitality || 0) > 0 && st.retailVitality <= 8) {
      pool.push(makeEntry("walked past another papered-over storefront in " + neighborhood,
        ["source:nbhdState", "state:retail-low"], 1.05, false));
    }

    // Local crime index high — watchfulness at hood grain (not citywide)
    if ((st.crimeIndex || 0) >= 1) {
      pool.push(makeEntry("double-checked the locks after talk of break-ins nearby",
        ["source:nbhdState", "state:watchful"], 1.1, false));
      pool.push(makeEntry("noticed neighbors swapping safety tips on the block",
        ["source:nbhdState", "state:watchful"], 1.05, false));
    }

    // Neighborhood mood, strongly ±
    if ((st.sentiment || 0) >= 0.7) {
      pool.push(makeEntry("felt " + neighborhood + " riding a genuine good stretch",
        ["source:nbhdState", "state:mood-up"], 1.1, false));
    } else if (st.sentiment !== null && st.sentiment <= 0.2) {
      pool.push(makeEntry("picked up on a heaviness around " + neighborhood + " lately",
        ["source:nbhdState", "state:mood-down"], 1.1, false));
    }

    return pool;
  }

  // =========================================================================
  // engine.33 T9: FAITH FAN-OUT (S.faithEvents.events — SAME cycle:
  // Phase4-FaithEvents runs before Phase5-CitizenEvents at both entry
  // points). A faith org's event reaches the citizens of ITS hood as
  // attendance texture; org-side record stays with faithEventsEngine.
  // Capped at 2 pool entries so faith never dominates a citizen's draw.
  // =========================================================================
  function faithPool_(neighborhood) {
    var pool = [];
    var evs = (S.faithEvents && S.faithEvents.events) || [];
    if (!evs.length || !neighborhood) return pool;
    for (var fi = 0; fi < evs.length && pool.length < 2; fi++) {
      var fev = evs[fi];
      if (!fev || fev.neighborhood !== neighborhood) continue;
      var orgName = fev.organization || "a local congregation";
      if (fev.eventType === 'holy_day') {
        pool.push(makeEntry("joined the " + (fev.holyDay || "holy day") + " observance at " + orgName,
          ["source:faith", "faith:holy-day"], 1.15, false));
      } else if (fev.eventType === 'community_program') {
        pool.push(makeEntry("stopped by a community program run out of " + orgName,
          ["source:faith", "faith:program"], 1.1, false));
      } else if (fev.eventType === 'crisis_response') {
        pool.push(makeEntry("pitched in with " + orgName + "'s response effort",
          ["source:faith", "faith:crisis-response"], 1.15, false));
      } else if (fev.eventType === 'outreach') {
        pool.push(makeEntry("was welcomed by an outreach table from " + orgName,
          ["source:faith", "faith:outreach"], 1.0, false));
      } else {
        pool.push(makeEntry("caught a notable service at " + orgName,
          ["source:faith", "faith:service"], 1.0, false));
      }
    }
    return pool;
  }

  // =========================================================================
  // BASE POOLS
  // =========================================================================
  // S280 depth-step (build item 3): baseDaily rebuilt as HUMAN-DOMAIN moment
  // pools (GPT intake add — "moments over events"). Most of life isn't
  // promotions and weddings; it's noticing, remembering, choosing, wondering.
  // Every citizen draws these regardless of mode/tier. Rules applied:
  // - atmospheric invariant: does/feels/observes — never a structural change
  // - canon guard: NO lines asserting family structure (children/spouse) —
  //   the ledger doesn't guarantee them; relatives/calls/photos phrasing only
  // - sensory-anchor style rule: a smell, a sound, a texture where natural
  // - dial routing via EXISTING ambient-scale keys only (engine.33 precedent,
  //   no new vocab): familyLife->Daily{c2,f1}, homeLife->Background{c2},
  //   reflection+identity->Personal{o2}, curiosity->Lifestyle{o3},
  //   communityLife->Neighborhood{s3} — composure-light, so a homebody and a
  //   wanderer stop drawing identical dial pushes from a quiet week.
  // - weight 0.9 so engine-tied pools (chaos/prevEvening/nbhdState) keep a
  //   slight edge in the draw; these are the floor of a life, not the news.
  var DOMAIN_MOMENTS = {
    "source:familyLife": [
      "checked in with a relative",
      "found a forgotten photograph tucked in a book and sat with it a while",
      "cooked an old family recipe from memory, mostly getting it right",
      "played a relative's voicemail twice before saving it again",
      "spent the evening sorting a box of things that used to be someone's",
      "wrote half a letter to family, then decided to call instead",
      "retold an old family story and caught a detail they'd never noticed",
      "smelled something on the stove next door that belonged to childhood"
    ],
    "source:homeLife": [
      "had a quiet moment at home",
      "finally fixed the thing that had been broken for months",
      "reorganized a closet and found something thought lost",
      "couldn't sleep for the wind rattling the window frame",
      "brought home a new plant and picked its spot carefully",
      "lent a neighbor a tool and got a story back with it",
      "rearranged the front room and kept walking in to look at it",
      "unpacked a box that had stayed sealed since the last move"
    ],
    "source:reflection": [
      "thought about an old friend on the walk home",
      "wondered if a decision from years back had been the right one",
      "re-read an old journal page and didn't recognize the handwriting mood",
      "couldn't shake a strange dream through the morning coffee",
      "remembered a teacher who'd said one thing that stuck",
      "felt unexpectedly nostalgic at the smell of rain on warm pavement",
      "realized the week had passed without a single thing worth retelling",
      "caught themselves narrating the day as if telling it to someone gone"
    ],
    "source:curiosity": [
      "read about something unfamiliar and kept pulling the thread",
      "tried a new recipe that mostly worked",
      "walked a different street home just to see it",
      "spent too long in a bookstore aisle they'd never stopped at",
      "learned a useless, wonderful fact and told two people",
      "started a small project with no deadline and no reason",
      "listened to a style of music they'd always skipped, twice",
      "looked up how something works and came away more amazed, not less"
    ],
    "source:communityLife": [
      "helped someone carry groceries up the block",
      "talked with a stranger long enough to learn a name",
      "recognized a face from years ago across the street",
      "attended a small local gathering and stayed later than planned",
      "noticed a familiar face missing from the morning routine",
      "traded produce over a fence and came out ahead",
      "held the door and got a whole conversation for it",
      "waved at the regulars on the usual route, all present and accounted for"
    ],
    "source:identity": [
      "realized they're becoming more like an older relative — and didn't mind",
      "didn't recognize themselves in an old photograph at first glance",
      "felt quietly proud of how they handled something small",
      "wondered when exactly they became the adult in the room",
      "noticed younger people asking them for advice now",
      "caught their reflection in a shop window and stood a little straighter",
      "said no to something and felt the shape of who they are in it",
      "kept a small promise to themselves nobody else knew about"
    ],
    // S280 build item 4 (Kimi intake add, anonymous form): being half-witness
    // to a stranger's life, turned inward. No cross-citizen wiring — the
    // stranger stays anonymous; the reflection is the citizen's own.
    "source:listening": [
      "watched someone repair a fence for an hour and wondered when they last finished anything",
      "overheard a goodbye at the corner that sounded permanent, and carried it a block",
      "saw a stranger laugh at their phone and invented the joke all the way home",
      "watched an old man feed pigeons like a ritual and wondered what theirs was",
      "heard a kid explain something to a parent with total authority and grinned",
      "saw someone running for the bus make it, and felt weirdly invested",
      "watched a couple argue quietly over groceries and rooted for them anyway",
      "caught a stranger humming their song and felt briefly, wrongly, known"
    ],
    // S280 build item 6 (Gemini intake add, content only): the gravity of
    // routine — autopilot noticed from inside. The dial-locking mechanic was
    // skipped; these are just the texture of a groove.
    "source:groove": [
      "drove the whole way home without remembering a single turn",
      "realized the same seven meals had rotated for a month, and shrugged",
      "answered 'how's it going' the exact same way for the fifth time this week",
      "noticed the calendar squares all look alike lately, and couldn't decide if that's peace",
      "caught the coffee order coming out of their mouth before deciding to order it"
    ]
  };
  var baseDaily = [];
  for (var dmKey in DOMAIN_MOMENTS) {
    if (!DOMAIN_MOMENTS.hasOwnProperty(dmKey)) continue;
    var dmLines = DOMAIN_MOMENTS[dmKey];
    for (var dmi = 0; dmi < dmLines.length; dmi++) {
      baseDaily.push(makeEntry(dmLines[dmi], [dmKey], 0.9, false));
    }
  }

  var seasonal = [];
  if (season === "Winter") seasonal.push(makeEntry("coped with the colder winter evening", ["source:season", "season:Winter"], 1, false));
  if (season === "Spring") seasonal.push(makeEntry("felt energy from seasonal change", ["source:season", "season:Spring"], 1, false));
  if (season === "Summer") seasonal.push(makeEntry("enjoyed warmth during the evening", ["source:season", "season:Summer"], 1, false));
  if (season === "Fall") seasonal.push(makeEntry("prepared for shorter fall days", ["source:season", "season:Fall"], 1, false));

  var weatherPool = [];
  if (weather.type === "rain") weatherPool.push(makeEntry("adjusted plans due to rain", ["source:weatherPool", "weather:rain"], 1, false));
  if (weather.type === "fog") weatherPool.push(makeEntry("moved cautiously due to fog", ["source:weatherPool", "weather:fog"], 1, false));
  if (weather.type === "hot") weatherPool.push(makeEntry("sought relief from heat", ["source:weatherPool", "weather:hot"], 1, false));
  if (weather.type === "cold") weatherPool.push(makeEntry("bundled up against the cold", ["source:weatherPool", "weather:cold"], 1, false));
  if (weather.type === "wind") weatherPool.push(makeEntry("noted windy evening conditions", ["source:weatherPool", "weather:wind"], 1, false));

  // S280 depth-step (Mike-direct refinement): a citizen event is the REACTION
  // to a city event, not a bulletin that it happened. The city layer already
  // logs the event; what belongs in a life is what it felt like from inside
  // one. Domain/subtype keywords route to lived texture. Rules: housing-neutral
  // phrasing (HousingType lives in Household_Ledger, unread here — design seam);
  // grain "heard" = citywide talk, "lived" = same-hood experience (drawn in the
  // per-citizen loop below). Tags unchanged (source:chaos → Daily fold).
  function chaosReaction_(ev, grain) {
    var hay = (String(ev.domain || "") + " " + String(ev.subtype || "") + " " +
               String(ev.description || "")).toLowerCase();
    if (/power|electric|outage|blackout|flicker|transformer/.test(hay)) {
      return (grain === "lived")
        ? ["sat out the flickering lights swapping stories by phone-light",
           "reset every blinking clock in the place, again"]
        : ["heard half the block had been comparing notes on the stuttering lights"];
    }
    if (/\b(transit|bus|bart|congestion|road|traffic|parking|airport|pothole)\b/.test(hay)) {
      return (grain === "lived")
        ? ["gave up on the ride and walked the last stretch home",
           "left early to beat the snarl and hit it anyway"]
        : ["heard the commute horror stories secondhand and felt lucky, this once"];
    }
    if (/flood|storm|rain|water|atmospheric/.test(hay)) {
      return (grain === "lived")
        ? ["moved everything up off the floor, just in case",
           "listened to the gutters work all night and checked them at dawn"]
        : ["heard the low spots flooded again and made a mental map"];
    }
    if (/health|clinic|illness|respiratory|flu|heat|dehydration|cooling|foodborne|allergy/.test(hay)) {
      return (grain === "lived")
        ? ["noticed the pharmacy line stretching out the door and kept their distance",
           "checked on an older neighbor with a knock and a wave"]
        : ["washed hands a beat longer after the health talk going around"];
    }
    if (/safety|patrol|incident|disturbance|crime/.test(hay)) {
      return (grain === "lived")
        ? ["double-checked the locks without quite deciding why",
           "took the longer, better-lit way home"]
        : ["heard the safety talk and walked a little faster after dark"];
    }
    if (/environment|air quality|smoke|grit|debris|wind/.test(hay)) {
      return (grain === "lived")
        ? ["smelled smoke on the wind and checked the sky twice",
           "wiped a film of grit off the sill and shut the window early"]
        : ["noticed more masks out after the air-quality talk"];
    }
    if (/econom|closure|layoff|hiring|budget|revenue|service cut/.test(hay)) {
      return (grain === "lived")
        ? ["walked past the papered-over window where the lunch spot used to be",
           "overheard shift-cut talk in the checkout line and did quiet math"]
        : ["felt the money talk creep into every third conversation"];
    }
    if (/inflow|outflow|migration|civic/.test(hay)) {
      return (grain === "lived")
        ? ["counted more moving trucks on the block than usual",
           "saw a new name go up on a mailbox and an old one come down"]
        : ["heard the block was turning over faster than it used to"];
    }
    // Fallback: worldEventsEngine texture descriptions are already citizen-scale
    // ("transformer hiccup", "3-block flicker") — light reaction wrapper.
    var desc = String(ev.description || "").trim();
    if (desc) {
      return (grain === "lived")
        ? ["swapped stories with a neighbor about the " + desc.toLowerCase()]
        : ["caught the talk going around about the " + desc.toLowerCase()];
    }
    return [];
  }

  var chaosPool = [];
  for (var che = 0; che < chaos.length && che < 4; che++) {
    var chEv = chaos[che];
    if (!chEv) continue;
    var chLines = chaosReaction_(chEv, "heard");
    var chTag = ["source:chaos", "chaos:" + (chEv.domain || "event")];
    var chW = (chEv.severity === "high") ? 1.3 : (chEv.severity === "medium") ? 1.15 : 1.0;
    for (var chl = 0; chl < chLines.length; chl++) {
      chaosPool.push(makeEntry(chLines[chl], chTag, chW, false));
    }
  }
  if (chaos.length > 0 && !chaosPool.length) {
    chaosPool.push(makeEntry("felt a subtle shift in the city's tone", ["source:chaos"], 1, false));
  }

  // S280 depth-step: sentiment/econ moved from felt-abstractions to observable
  // street detail (sensory-anchor style rule) — something a citizen can retell
  // and a desk agent can hang a story on. Tags unchanged.
  var sentimentPool = [];
  if (dynamics.sentiment >= 0.3) {
    sentimentPool.push(makeEntry("felt uplifted by the city mood", ["source:sentiment", "sentiment:positive"], 1, false));
    sentimentPool.push(makeEntry("noticed strangers actually holding doors and making eye contact today", ["source:sentiment", "sentiment:positive"], 1, false));
    sentimentPool.push(makeEntry("caught a busker's tune on the corner and hummed it the rest of the walk", ["source:sentiment", "sentiment:positive"], 0.95, false));
  }
  if (dynamics.sentiment <= -0.3) {
    sentimentPool.push(makeEntry("felt unsettled by a low hum of tension", ["source:sentiment", "sentiment:negative"], 1, false));
    sentimentPool.push(makeEntry("noticed sidewalk conversations dropping to murmurs as people passed", ["source:sentiment", "sentiment:negative"], 1, false));
    sentimentPool.push(makeEntry("watched a shopkeeper pull the security gate down an hour early", ["source:sentiment", "sentiment:negative"], 0.95, false));
  }

  // engine.47 Hop 4 (S297): the town watched the game. ATTACHED signal — a
  // real Oakland_Sports_Feed row from a played game (S.sportsFeedEntries,
  // Phase 2), so it earns experience-weighting per the S296 rule (only
  // ATTACHED signals do; ambient "city mood" above stays flat and anonymous).
  // These lines NAME the game night. No game this cycle → empty pool, silence.
  var gameNightPool = [];
  var gnGame = null;
  var gnFeed = S.sportsFeedEntries || [];
  for (var gnf = 0; gnf < gnFeed.length; gnf++) {
    if (String(gnFeed[gnf].eventType || '').toLowerCase().indexOf('game') >= 0) { gnGame = gnFeed[gnf]; break; }
  }
  if (gnGame) {
    var gnBucket = (typeof gameNightBucket_ === 'function') ? gameNightBucket_(gnGame) : 'neutral';
    var gnTags = ["source:sports", "gameNight", "streak:" + (gnGame.streak || '-')];
    // Weight scales with the boost the game actually put on the city
    // (T3a: sportsSentimentBoost, verified 0.11 for a win). Cap 4 — game
    // night concentrates the town's texture, never erases the rest of life.
    var gnI = Math.min(1, Math.abs(Number(S.sportsSentimentBoost || 0)) / 0.15);
    var gnW = Math.min(4, 1.1 * (1 + 3 * gnI));
    var gnTexts = {
      win: [
        "watched the ninth from a packed bar and walked home in a crowd that didn't want to disperse",
        "heard the block erupt through an open window when the final out landed",
        "caught the recap at the counter this morning and stayed for the second retelling"
      ],
      winStreak: [
        "heard strangers at the bus stop talking streak numbers like family business",
        "wore the cap to work and got three nods before the first coffee",
        "watched the kids on the corner re-enact the play twice, arguing the call both times"
      ],
      loss: [
        "watched the bar go quiet by the eighth and settle the tab early",
        "turned the game off before the end and told nobody",
        "avoided the score all morning and got told anyway, twice"
      ],
      neutral: [
        "kept the game on low while cooking, half an ear on the count",
        "checked the score once at a red light and put the phone away"
      ]
    }[gnBucket] || [];
    for (var gnt = 0; gnt < gnTexts.length; gnt++) {
      gameNightPool.push(makeEntry(gnTexts[gnt], gnTags, gnW, false));
    }
  }

  var econPool = [];
  if (econMood <= 35) {
    econPool.push(makeEntry("noticed money stress showing up in small ways", ["source:economy", "econ:low"], 1, false));
    econPool.push(makeEntry("overheard someone at the counter counting out exact change, twice", ["source:economy", "econ:low"], 1, false));
    econPool.push(makeEntry("clocked the tip jar sitting emptier than it used to", ["source:economy", "econ:low"], 0.95, false));
  }
  if (econMood >= 65) {
    econPool.push(makeEntry("sensed optimism about local opportunities", ["source:economy", "econ:high"], 1, false));
    econPool.push(makeEntry("spotted a fresh hiring sign taped up in a storefront window", ["source:economy", "econ:high"], 1, false));
    econPool.push(makeEntry("heard two neighbors comparing new gigs over a fence", ["source:economy", "econ:high"], 0.95, false));
  }

  // S280 build item 5a: initiative outcomes reach kitchen tables. Phase order
  // verified at both entry points: Phase5-Initiatives runs BEFORE
  // Phase5-CitizenEvents, so S.initiativeEvents {id, name, type, outcome,
  // voteCount, cycle} is same-cycle fresh. Reaction grain (Mike S280): the
  // citizen reacts to the news, never restates the bulletin. Cap 3 so a busy
  // council week doesn't drown the pool. Route: Civic Perception {sociability:2}.
  var civicNewsPool = [];
  var initEvs = S.initiativeEvents || [];
  for (var ive = 0; ive < initEvs.length && civicNewsPool.length < 6; ive++) {
    var iEv = initEvs[ive];
    var iName = (iEv && iEv.name) ? String(iEv.name).trim() : "";
    if (!iName) continue;
    var iOut = String(iEv.outcome || "").toLowerCase();
    var iTags = ["source:civicNews", "civic:" + (iOut || "update")];
    if (iOut === "passed" || iOut === "approved") {
      civicNewsPool.push(makeEntry("caught the news that " + iName + " passed and talked it over at the counter", iTags, 1.1, false));
      civicNewsPool.push(makeEntry("overheard neighbors already planning around " + iName, iTags, 1.0, false));
    } else if (iOut === "failed" || iOut === "denied" || iOut === "vetoed" || iOut === "rejected") {
      civicNewsPool.push(makeEntry("heard " + iName + " went down at council and had opinions about it", iTags, 1.1, false));
      civicNewsPool.push(makeEntry("listened to two takes on why " + iName + " failed and agreed with neither", iTags, 1.0, false));
    } else if (iOut) {
      civicNewsPool.push(makeEntry("caught a stray update on " + iName + " and filed it away", iTags, 0.95, false));
    }
  }

  var templatePool = [
    makeEntry("crossed paths with $CONTACT at $VENUE and left with a new question", ["source:neighborhood", "source:template"], 1.2, true),
    makeEntry("overheard something at $VENUE that didn't feel accidental", ["source:neighborhood", "source:template"], 1.15, true),
    makeEntry("stopped by $INSTITUTION and realized the situation is shifting", ["source:neighborhood", "source:template"], 1.1, true),
    makeEntry("made a small choice at $VENUE that might echo later", ["source:template"], 1.05, true),
    makeEntry("noticed a familiar face in an unfamiliar mood at $VENUE", ["source:template"], 1.05, true)
  ];

  var allianceTexts = [
    "coordinated briefly with an ally on shared interests",
    "received a supportive message from a trusted connection",
    "felt reassured by a recent alliance",
    "collaborated quietly with a close associate",
    "exchanged insights with a professional ally"
  ];
  var alliancePool = [];
  for (var ali = 0; ali < allianceTexts.length; ali++) {
    alliancePool.push(makeEntry(allianceTexts[ali], ["relationship:alliance"], 1, false));
  }

  var rivalryTexts = [
    "felt a flicker of tension thinking about a competitor",
    "noticed subtle friction in professional circles",
    "sensed unspoken rivalry in a routine interaction",
    "felt the weight of ongoing competition",
    "overheard something that stirred old tensions"
  ];
  var rivalryPool = [];
  for (var rvi = 0; rvi < rivalryTexts.length; rvi++) {
    rivalryPool.push(makeEntry(rivalryTexts[rvi], ["relationship:rivalry"], 1, false));
  }

  var arcTexts = [
    "felt the mounting pressure of unfolding events",
    "sensed their role in a larger story taking shape",
    "noticed how recent events seemed interconnected",
    "felt pulled deeper into an evolving situation"
  ];
  var arcPool = [];
  for (var ari = 0; ari < arcTexts.length; ari++) {
    arcPool.push(makeEntry(arcTexts[ari], ["arc:generic"], 1, false));
  }

  var mentorshipTexts = [
    "reflected on guidance received from a mentor",
    "considered advice to share with someone newer",
    "felt the responsibility of being looked up to",
    "appreciated a learning moment from an experienced contact"
  ];
  var mentorshipPool = [];
  for (var mti = 0; mti < mentorshipTexts.length; mti++) {
    mentorshipPool.push(makeEntry(mentorshipTexts[mti], ["relationship:mentorship"], 1, false));
  }

  function occupationPoolFor_(occupation) {
    var flavor = pickOccFlavor_(occupation);
    if (!flavor) return [];
    return [
      makeEntry("had a work moment: " + flavor, ["source:occupation", "occupation:" + occupation], 1.15, false),
      makeEntry("left work thinking about " + flavor, ["source:occupation", "occupation:" + occupation], 1.05, false)
    ];
  }

  function agePoolFor_(ageGroup) {
    // engine.67 (S325): child/teen split out of the old 0-22 "youth" band —
    // a Pre-K kid and a 21-year-old no longer share a life. Bands arrive from
    // lifeState.band when the gate helper is deployed; 4-band ageGroup_ values
    // still resolve for callers that pass them.
    if (ageGroup === "child") {
      return [
        makeEntry("turned the walk home from school into an expedition", ["source:age", "ageGroup:child"], 1.05, false),
        makeEntry("built something out of nothing on the living-room floor and defended it fiercely", ["source:age", "ageGroup:child"], 1.0, false)
      ];
    }
    if (ageGroup === "teen") {
      return [
        makeEntry("rewrote a text three times before sending it", ["source:age", "ageGroup:teen"], 1.05, false),
        makeEntry("stayed out until the exact minute of curfew, not one minute past", ["source:age", "ageGroup:teen"], 1.0, false)
      ];
    }
    if (ageGroup === "youth") {
      return [
        makeEntry("connected with friends over something small but intense", ["source:age", "ageGroup:youth"], 1.05, false),
        makeEntry("felt the pressure of being watched—even when no one was watching", ["source:age", "ageGroup:youth"], 1.0, false)
      ];
    }
    if (ageGroup === "youngAdult") {
      return [
        makeEntry("juggled plans that didn't quite fit together", ["source:age", "ageGroup:youngAdult"], 1.05, false),
        makeEntry("felt the city's pace pulling them forward", ["source:age", "ageGroup:youngAdult"], 1.0, false)
      ];
    }
    if (ageGroup === "senior") {
      return [
        makeEntry("noticed patterns repeating—and chose not to comment", ["source:age", "ageGroup:senior"], 1.05, false),
        makeEntry("shared a small piece of history with someone who needed it", ["source:age", "ageGroup:senior"], 1.0, false)
      ];
    }
    return [
      makeEntry("handled responsibilities that didn't make the news", ["source:age", "ageGroup:adult"], 1.0, false),
      makeEntry("felt a quiet tradeoff settle into place", ["source:age", "ageGroup:adult"], 1.0, false)
    ];
  }

  var neighborhoodPools = {
    "Temescal": ["grabbed coffee at a Temescal cafe", "noticed the neighborhood's creative energy", "browsed the Temescal Alley shops"],
    "Downtown": ["navigated Downtown's busy streets", "felt the pulse of the city center", "passed by City Hall on routine business"],
    "Fruitvale": ["enjoyed the Fruitvale community vibe", "stopped by a familiar Fruitvale spot", "appreciated the neighborhood's cultural richness"],
    "Lake Merritt": ["took a moment by the lake", "enjoyed Lake Merritt's evening calm", "watched joggers circle the lake"],
    "West Oakland": ["noticed West Oakland's changing landscape", "felt the neighborhood's industrial rhythm", "passed by historic Victorian homes"],
    "Laurel": ["appreciated Laurel's quiet streets", "enjoyed the residential calm", "stopped by Laurel's small shops"],
    "Rockridge": ["browsed Rockridge's shops briefly", "walked under Rockridge's tree canopy", "grabbed something from College Avenue"],
    "Jack London": ["felt Jack London's waterfront energy", "noticed activity near the estuary", "enjoyed the district's evening atmosphere"],
    "Uptown": ["walked through Uptown's gallery district", "noticed the neighborhood's artistic energy", "passed by the Fox Theater"],
    "KONO": ["explored KONO's creative spaces", "noticed murals along the corridor", "felt the neighborhood's DIY spirit"],
    "Chinatown": ["stopped by Chinatown for familiar flavors", "appreciated the neighborhood's bustling energy", "noticed the blend of old and new storefronts"],
    "Piedmont Ave": ["strolled along Piedmont Avenue", "enjoyed the neighborhood's boutique charm", "appreciated the leafy residential streets"]
  };

  var holidayPools = {
    Thanksgiving: ["prepared for a holiday gathering", "reflected on things to be grateful for", "helped with meal preparations"],
    Holiday: ["felt the holiday spirit in the air", "wrapped up last-minute seasonal tasks", "enjoyed decorations around town"],
    NewYear: ["reflected on the year past", "thought about resolutions ahead", "felt the fresh-start energy of January"],
    NewYearsEve: ["made plans for the evening countdown", "felt anticipation for the new year", "prepared for celebration"],
    Independence: ["noticed festive decorations around town", "made plans for nighttime viewing", "enjoyed the holiday atmosphere"],
    MLKDay: ["reflected on legacy and justice", "thought about community and action", "felt the weight of history"],
    Juneteenth: ["celebrated freedom and heritage", "connected with community history", "felt pride in cultural roots"],
    CincoDeMayo: ["enjoyed a festive atmosphere", "celebrated cultural heritage", "noticed colorful decorations"],
    DiaDeMuertos: ["honored ancestors in quiet reflection", "noticed beautiful altars around town", "felt connection to those passed"],
    LunarNewYear: ["enjoyed new year festivities", "noticed red decorations around Chinatown", "felt the celebratory energy"],
    OpeningDay: ["felt the excitement of a season opener", "noticed fans and rituals returning", "made plans to follow the opener"],
    OaklandPride: ["celebrated community pride", "noticed rainbow flags around town", "felt the city's inclusive spirit"],
    Valentine: ["noticed Valentine's displays around town", "thought about loved ones", "felt the romantic atmosphere"],
    Halloween: ["noticed spooky decorations around town", "saw costumes appearing early", "felt the playful autumn spirit"],
    Easter: ["noticed spring celebrations around town", "enjoyed the seasonal atmosphere", "saw families gathering"],
    StPatricksDay: ["noticed green everywhere", "felt the festive spirit", "saw celebrations starting early"],
    MothersDay: ["thought about family connections", "noticed families gathering", "felt grateful for maternal figures"],
    FathersDay: ["thought about family bonds", "noticed families celebrating", "felt grateful for paternal figures"],
    MemorialDay: ["reflected on those who served", "enjoyed the long weekend atmosphere", "noticed flags around town"],
    LaborDay: ["appreciated workers and labor", "enjoyed the last summer holiday", "felt the end-of-summer mood"],
    VeteransDay: ["honored veterans in thought", "noticed memorial observances", "reflected on service and sacrifice"]
  };

  var firstFridayTexts = ["checked out First Friday galleries", "enjoyed the art walk atmosphere", "felt the creative energy of First Friday", "wandered through open studios", "discovered new local artists", "soaked in the community arts scene"];
  var firstFridayPool = [];
  for (var ffi = 0; ffi < firstFridayTexts.length; ffi++) {
    firstFridayPool.push(makeEntry(firstFridayTexts[ffi], ["source:firstFriday"], 1.2, false));
  }

  var creationDayTexts = ["felt a sense of belonging in Oakland", "reflected on roots in the community", "appreciated the city's foundational spirit", "felt connected to Oakland's story"];
  var creationDayPool = [];
  for (var cdi = 0; cdi < creationDayTexts.length; cdi++) {
    creationDayPool.push(makeEntry(creationDayTexts[cdi], ["source:creationDay"], 1.1, false));
  }

  var sportsSeasonPools = {
    championship: ["felt championship energy in the air", "followed the late-stage run closely", "sensed the city's sports excitement"],
    playoffs: ["followed postseason updates closely", "felt the tense momentum of elimination games", "hoped for a deep run"],
    "post-season": ["followed postseason updates closely", "felt the tense momentum of elimination games", "hoped for a deep run"],
    "late-season": ["watched the late-season race unfold", "felt the late-season intensity", "followed standings closely"]
  };

  var basePoolRaw = baseDaily.concat(seasonal, weatherPool, chaosPool, sentimentPool, econPool, civicNewsPool);
  var basePool = [];
  for (var bpi = 0; bpi < basePoolRaw.length; bpi++) {
    var ee = basePoolRaw[bpi];
    basePool.push(makeEntry(ee.text, mergeTags(ee.tags, ["source:base"]), ee.weight, ee.template));
  }

  function pickContactFromBonds_(bonds) {
    if (!bonds || !bonds.length) return { name: "someone familiar", popId: "" };
    var tries = 0;
    while (tries < 6) {
      var b = bonds[Math.floor(roll() * bonds.length)];
      if (b && b.otherPopId) {
        var nm = citizenName_(b.otherPopId) || "a familiar face";
        return { name: nm, popId: b.otherPopId };
      }
      tries++;
    }
    return { name: "someone familiar", popId: "" };
  }

  // =========================================================================
  // MAIN CITIZEN LOOP
  // =========================================================================
  var logRows = [];
  var gameNightDrawn = []; // engine.47 Hop 4: POPIDs whose day the game shaped

  // engine.58 (S320): GC surfacing — load the Tier-5 waiting room once; a
  // small chance per T3/T4 ENGINE event names a GC citizen as an acquaintance.
  // A picked line ticks that GC's EmergenceCount (batched write at the end)
  // toward the promotion threshold (3). The seed rate is the lottery dial.
  var GC_SURFACE_CHANCE = 0.06;
  var gcSurfacePool = [];   // {name, nbhd, sheetRow, count}
  var gsE = -1, gsC = -1;
  var gcSurfaceSheet = ctx.ss.getSheetByName('Generic_Citizens');
  if (gcSurfaceSheet) {
    var gcSurfVals = gcSurfaceSheet.getDataRange().getValues();
    var gcSurfHead = gcSurfVals[0];
    var gsF = gcSurfHead.indexOf('First'), gsL = gcSurfHead.indexOf('Last'),
        gsN = gcSurfHead.indexOf('Neighborhood'), gsS = gcSurfHead.indexOf('Status');
    gsE = gcSurfHead.indexOf('EmergenceCount');
    gsC = gcSurfHead.indexOf('EmergenceContext');
    if (gsF >= 0 && gsL >= 0 && gsE >= 0) {
      for (var gsi = 1; gsi < gcSurfVals.length; gsi++) {
        if (gsS >= 0 && String(gcSurfVals[gsi][gsS] || '').toLowerCase() !== 'active') continue;
        var gsName = (String(gcSurfVals[gsi][gsF] || '').trim() + ' ' + String(gcSurfVals[gsi][gsL] || '').trim()).trim();
        if (gsName.indexOf(' ') < 0) continue; // needs first+last
        gcSurfacePool.push({
          name: gsName,
          nbhd: gsN >= 0 ? String(gcSurfVals[gsi][gsN] || '').trim() : '',
          sheetRow: gsi + 1,
          count: Number(gcSurfVals[gsi][gsE]) || 0,
          ctx0: gsC >= 0 ? String(gcSurfVals[gsi][gsC] || '').trim() : '' // engine.59: roster base
        });
      }
    }
  }
  var gcPendingByText = {};  // event text -> gcSurfacePool entry
  var gcIncrements = {};     // sheetRow -> {entry, add, context}
  // ===========================================================================
  // engine.67 step 6 (S325, Mike ruling: BOTH tiers, skewed to rarity):
  // HOUSEHOLD EVENT LOTTERY — families live moments TOGETHER. Generalizes the
  // S280 chaos-local shared-line pattern: a drawn household writes the SAME
  // line to every present member, one memory the family holds in common.
  // Two tiers: quiet shared moments (the common face of rare) and crises/
  // celebrations that ripple (season-defining; feeds storyHooks). Dice only,
  // no caps, no quotas — SIM_DOCTRINE physics. ~1 in 80 households a cycle
  // quiet, ~1 in 400 crisis: a handful of families a week, not wallpaper.
  // ===========================================================================
  var HH_QUIET_CHANCE = 0.012;
  var HH_CRISIS_CHANCE = 0.0025;
  var HH_QUIET_POOL = [
    "the whole household ended up in the kitchen at once and nobody left for an hour",
    "a board game came off the shelf and old rivalries resumed where they'd paused",
    "everyone's week landed on the table over one long dinner",
    "a movie nobody picked first became the one they all quoted for days",
    "the household spent a whole morning on the stoop watching the street go by",
    "leftovers night turned into everyone cooking their one specialty at once",
    "an old photo album surfaced and the evening went where it wanted",
    "a walk that started as errands turned into the long way home together"
  ];
  var HH_CRISIS_POOL = [
    "a burst pipe at dawn had the whole household hauling buckets and laughing about it by dark|crisis",
    "a health scare pulled everyone home early — it passed, but the house held its breath together|crisis",
    "the landlord's notice on the door put the whole household around the table with the numbers|crisis",
    "a kitchen fire scorched one wall and rearranged everyone's week — nobody hurt, nothing the same|crisis",
    "word of a windfall reached the house and the whole household argued joyfully about what it meant|celebration",
    "an anniversary dinner grew past the table until half the block seemed to be in the kitchen|celebration",
    "a relative's surprise visit turned an ordinary week into the one they'd all retell|celebration",
    "good news landed for one of them and the whole house wore it for days|celebration"
  ];
  if (iHousehold >= 0) {
    var hhMembers = Object.create(null); // HouseholdId -> [rowIndex]
    for (var hbi = 0; hbi < rows.length; hbi++) {
      var hbId = String(rows[hbi][iHousehold] || "").trim();
      if (!hbId || !rows[hbi][iPopID]) continue;
      var hbSt = iStatus >= 0 ? String(rows[hbi][iStatus] || "").trim().toLowerCase() : "";
      if (hbSt === "deceased" || hbSt === "traded" || hbSt === "pending" || hbSt === "inactive") continue;
      (hhMembers[hbId] = hhMembers[hbId] || []).push(hbi);
    }
    var hhLogBatch = [];
    for (var hhKey in hhMembers) {
      var hhIdx = hhMembers[hhKey];
      if (hhIdx.length < 2) continue; // a shared moment needs more than one present
      var hhRoll = roll();
      var hhIsCrisis = hhRoll < HH_CRISIS_CHANCE;
      if (!hhIsCrisis && hhRoll >= HH_QUIET_CHANCE + HH_CRISIS_CHANCE) continue;
      // deterministic variant by household id (S280 chaos-household pattern) —
      // the family's identity, not the dice, picks which moment is theirs.
      var hhHash = 0;
      for (var hhc = 0; hhc < hhKey.length; hhc++) hhHash = (hhHash + hhKey.charCodeAt(hhc)) % 997;
      var hhRaw = hhIsCrisis ? HH_CRISIS_POOL[hhHash % HH_CRISIS_POOL.length] : HH_QUIET_POOL[hhHash % HH_QUIET_POOL.length];
      var hhParts = hhRaw.split("|");
      var hhText = hhParts[0];
      var hhKind = hhParts[1] || "quiet";
      var hhTagStr = hhIsCrisis
        ? "Daily|source:familyLife|family:household|household:" + hhKind
        : "Daily|source:familyLife|family:household|household:quiet";
      var hhStamp = inWorldStamp_(ctx);
      var hhLine = hhStamp + " — [Daily] " + hhText;
      var hhHoodAny = "";
      for (var hmi = 0; hmi < hhIdx.length; hmi++) {
        var hmRow = rows[hhIdx[hmi]];
        var hmExisting = hmRow[iLife] ? String(hmRow[iLife]) : "";
        hmRow[iLife] = hmExisting ? hmExisting + "\n" + hhLine : hhLine;
        hmRow[iLastU] = ctx.now;
        rows[hhIdx[hmi]] = hmRow;
        var hmPop = String(hmRow[iPopID]);
        var hmHood = iNeighborhood >= 0 ? (hmRow[iNeighborhood] || "") : "";
        if (!hhHoodAny && hmHood) hhHoodAny = hmHood;
        hhLogBatch.push([ctx.now, hmPop,
          (((hmRow[iFirst] || "") + " " + (hmRow[iLast] || ""))).trim(),
          hhTagStr, hhText, hmHood, cycle]);
        // shared moment = a lived week — union into the active set (bond/anti-inert seams)
        if (!activeSetObj[hmPop]) { activeSetObj[hmPop] = true; }
      }
      ctx.ledger.dirty = true;
      if (hhIsCrisis) {
        if (!S.storyHooks) S.storyHooks = [];
        S.storyHooks.push({
          hookType: hhKind === "celebration" ? "FAMILY_CELEBRATION" : "FAMILY_CRISIS",
          severity: 5, priority: 4,
          description: "Household " + hhKey + " — " + hhText,
          cycleGenerated: cycle, neighborhood: hhHoodAny,
          domain: "COMMUNITY", text: hhText
        });
      }
    }
    if (lifeLog && hhLogBatch.length) {
      var hhStart = lifeLog.getLastRow() + 1;
      lifeLog.getRange(hhStart, 1, hhLogBatch.length, hhLogBatch[0].length).setValues(hhLogBatch);
    }
    S.cycleActiveCitizens = Object.keys(activeSetObj);
    S.householdMoments = hhLogBatch.length; // diag: member-lines written this cycle
  }

  for (var r = 0; r < rows.length; r++) {
    // engine.38 A1: LIMIT=25 cap removed — full-population coverage. Runaway is
    // structurally bounded: one emit max per citizen per cycle (<= rows.length).

    var row = rows[r];
    var tier = Number(row[iTier] || 0);
    var mode = row[iClock] || "ENGINE";
    var popId = row[iPopID];
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || "") : "";

    var birthYear = (iBirthYear >= 0) ? Number(row[iBirthYear] || 0) : 0;
    var occupation = (iOccupation >= 0) ? String(row[iOccupation] || "") : "";
    var status = (iStatus >= 0) ? String(row[iStatus] || "").trim().toLowerCase() : "";
    var ageGroup = ageGroup_(birthYear);
    var usageCount = (iUsage >= 0) ? Number(row[iUsage]) || 0 : 0; // T3 — blank reads 0

    // engine.38 A1 (option-1 gate): participation universe = named citizens
    // (Tier-1/2, ANY clock-mode — 17 of 21 Tier-1 are GAME/MEDIA/CIVIC, so an
    // ENGINE-only gate would miss the very citizens the newsroom + wake-loop
    // read) UNION the Tier-3/4 ENGINE background population. GAME/MEDIA/CIVIC
    // Tier-3/4 stay sim-driven for their primary events (not double-driven here).
    // Named citizens get ambient texture on top of their sim life — A3 folds in
    // their richer named-pool events.
    if (!popId) continue;
    // engine.38 A1-cont (S277): the atmospheric layer extends to ALL citizens
    // regardless of ClockMode. The old mode gate (`!isNamed && mode!=="ENGINE"`)
    // excluded ~141 dark non-ENGINE T3/4; it is removed. Canon-safety holds —
    // this generator writes ONLY col-O LifeHistory + log (no structural cols),
    // and the role-specific occupation pool stays ENGINE-only (guarded below).
    // Deceased are excluded (AC3): the dead draw no daily-life texture. (Live
    // S277: every non-Active citizen is ENGINE, so this also closes the prior
    // latent inclusion of deceased ENGINE citizens.)
    var isNamed = (tier === 1 || tier === 2);
    if (!isNamed && (tier !== 3 && tier !== 4)) continue;
    // engine.64c (S323, Mike ruling S322): traded/pending draw no daily-life
    // texture — traded left the city, pending never arrived. Retired stay.
    if (status === "deceased" || status === "traded" || status === "pending") continue;

    var mem = getMem(popId);

    // v2.7: Get TraitProfile for archetype-aware event generation
    var traitProfile = getCitizenTraitProfile_(popId);
    var archetype = (traitProfile && traitProfile.archetype) ? traitProfile.archetype : 'Drifter';
    var archetypeWeights = getArchetypeWeights_(archetype);

    // engine.67 (S325): life-state — the citizen's row decides what CAN fire
    // at them. Derived once per citizen, pure (no rng, no sheet reads); feeds
    // the hard gate at pool-filter time and the child/teen age pools below.
    var lifeState = (typeof deriveLifeState_ === 'function') ? deriveLifeState_({
      birthYear: birthYear,
      simYear: simYear,
      status: status,
      occupation: occupation,
      roleType: (iTierRole >= 0 ? String(row[iTierRole] || "") : ""),
      maritalStatus: (iMarital >= 0 ? String(row[iMarital] || "") : ""),
      numChildren: (iNumChildren >= 0 ? row[iNumChildren] : 0),
      wealthLevel: (iWealth >= 0 ? row[iWealth] : null)
    }) : null;

    // v2.6: Get neighborhood-level context
    var nhContext = getNeighborhoodContext_(neighborhood);
    var nhQoL = nhContext.qualityOfLifeIndex || 0.5;
    var isHotspot = crimeHotspots.indexOf(neighborhood) >= 0;

    // engine.38 A1: dial-weighted participation base (was 0.02 + LIMIT=25 cap).
    // The CATCH-UP thin-LifeHistory boost is removed — S256 cleared col-O to
    // LifeHistory_Archive so line-count is no longer a thinness signal; the
    // anti-inert floor (A2) handles long-dark citizens principledly instead.
    var chance = PARTICIPATION_BASE;

    if (weather.impact >= 1.3) chance += 0.01;
    if (dynamics.sentiment <= -0.3) chance += 0.01;
    if (chaos.length > 0) chance += 0.015;
    if (season === "Winter") chance += 0.005;
    if (season === "Summer") chance += 0.005;
    if (econMood <= 35 || econMood >= 65) chance += 0.005;

    // Calendar chance modifiers
    if (holidayPriority === "major") chance += 0.02;
    else if (holidayPriority === "oakland") chance += 0.02;
    else if (holidayPriority === "cultural") chance += 0.015;
    else if (holidayPriority === "minor") chance += 0.008;

    if (isFirstFriday) {
      chance += 0.015;
      if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Temescal" || neighborhood === "Jack London") {
        chance += 0.01;
      }
    }

    if (isCreationDay) chance += 0.01;

    if (sportsSeason === "championship") chance += 0.015;
    else if (sportsSeason === "playoffs" || sportsSeason === "post-season") chance += 0.01;

    if (dynamics.culturalActivity >= 1.4) chance += 0.008;
    if (dynamics.communityEngagement >= 1.3) chance += 0.005;

    // v2.6: QoL-driven chance modifiers
    if (nhQoL <= 0.35) chance += 0.012; // More events in low-QoL areas (stress, tension)
    if (isHotspot) chance += 0.008; // Hotspots generate more citizen reactions
    if (enforcementCapacity < 0.6) chance += 0.005; // Stretched enforcement = more noticeable events

    // Age/occupation modifiers
    if (ageGroup === "youth" || ageGroup === "youngAdult") {
      if (dynamics.nightlife && dynamics.nightlife >= 1.2) chance += 0.004;
      if (isFirstFriday) chance += 0.003;
    }
    if (ageGroup === "senior" && dynamics.communityEngagement >= 1.2) chance += 0.003;

    // engine.32 T3 — fame factor: repeat edition appearances make a citizen
    // slightly more eventful (people approach them). Modest, pre-cap.
    if (usageCount >= 8) chance += 0.005;
    if (occupation && (occupation.toLowerCase().indexOf("driver") >= 0 || occupation.toLowerCase().indexOf("security") >= 0)) {
      if (weather.impact >= 1.3) chance += 0.003;
    }

    // v2.8: Previous evening crowd modifier
    if (S.previousEvening && S.previousEvening.topCrowds) {
      var prevCrowdScore = S.previousEvening.topCrowds[neighborhood] || 0;
      if (prevCrowdScore >= 6) chance += 0.008;
      if (prevCrowdScore >= 8) chance += 0.005;
    }

    if (typeof getCombinedEventBoost_ === "function") {
      var eventBoost = getCombinedEventBoost_(ctx, popId);
      chance *= eventBoost;
    }

    // engine.38 A1 — participation is dial-weighted across drive + out-and-about
    // + sociability (was engine.32 T5 outabout-only). activityScore 0.5..1.5;
    // null bands (no DialState) -> base rate unchanged. The dominant dial decides
    // whose week is eventful: strivers, socialites, and the out-and-about live more.
    var dialBands = getCitizenDialBands_(ctx, popId);
    if (dialBands) {
      var dmAct = dialBands.mult;
      chance *= (dmAct.drive + dmAct.outabout + dmAct.sociability) / 3;
    }

    var citizenBonds = [];
    var hasRivalry = false;
    var hasAlliance = false;
    var hasMentorship = false;
    // S280 depth-step: capture the actual counterpart so bond texture can name
    // them (first bond of each type wins; bonds store POP IDs, nameByPop resolves).
    var rivalName = "", allyName = "", mentorPartnerName = "";
    var popIdNorm = String(popId || "").trim().toUpperCase();

    if (typeof getCitizenBonds_ === "function") {
      citizenBonds = getCitizenBonds_(ctx, popId) || [];
      for (var bi = 0; bi < citizenBonds.length; bi++) {
        var bb = citizenBonds[bi];
        if (!bb) continue;
        var bbOtherId = (String(bb.citizenA || "").trim().toUpperCase() === popIdNorm)
          ? String(bb.citizenB || "").trim().toUpperCase()
          : String(bb.citizenA || "").trim().toUpperCase();
        var bbOtherName = (bbOtherId && bbOtherId !== popIdNorm) ? (nameByPop[bbOtherId] || "") : "";
        if (bb.bondType === "rivalry") { hasRivalry = true; if (!rivalName) rivalName = bbOtherName; }
        if (bb.bondType === "alliance") { hasAlliance = true; if (!allyName) allyName = bbOtherName; }
        if (bb.bondType === "mentorship") { hasMentorship = true; if (!mentorPartnerName) mentorPartnerName = bbOtherName; }
      }
    }

    if (hasRivalry) chance += 0.02;

    var activeArc = null;
    if (typeof citizenInActiveArc_ === "function") {
      activeArc = citizenInActiveArc_(ctx, popId);
      if (activeArc) {
        var arcPhaseBoost = { early: 0.01, rising: 0.015, mid: 0.02, peak: 0.04, decline: 0.015, falling: 0.01 };
        chance += arcPhaseBoost[activeArc.phase] || 0.01;
      }
    }

    if (typeof getWeatherEventModifier_ === "function") {
      var weatherMod = getWeatherEventModifier_(ctx, "social");
      chance *= weatherMod;
    }

    if (typeof getMediaEventModifier_ === "function") {
      var mediaMod = getMediaEventModifier_(ctx, "social");
      chance *= mediaMod;
    }

    if (typeof hasWeatherCondition_ === "function" && hasWeatherCondition_(ctx, "heat_wave")) {
      chance += 0.01;
    }

    // engine.38 A2 — anti-inert floor: a citizen in the log but dark for more
    // than ANTI_INERT_N cycles is forced in regardless of the roll. Citizens
    // never in the log fall through to normal participation (base covers them
    // within a cycle or two), so this never mass-fires on a fresh log.
    var lastEv = lastEventCycleByPop[popId];
    var forcedInert = (typeof lastEv === "number") && (cycle - lastEv > ANTI_INERT_N);

    // engine.38 A1: participation ceiling (was the 0.18 capped-world clamp that
    // paired with LIMIT=25). Clamp below 100% to preserve quiet-week texture,
    // then roll — but upstream-active + long-dark citizens always live their week.
    if (chance > PARTICIPATION_MAX) chance = PARTICIPATION_MAX;
    if (!guaranteedInObj[popId] && !forcedInert && !chanceHit(chance)) continue;

    // Build contextual pool
    var pool = [];

    for (var pbi = 0; pbi < basePool.length; pbi++) {
      var bpEntry = basePool[pbi];
      pool.push(makeEntry(bpEntry.text, mergeTags(bpEntry.tags, calendarTags), bpEntry.weight, bpEntry.template));
    }

    // v2.6: Add QoL-aware events
    var qolPool = qolPoolFor_(nhContext);
    for (var qi = 0; qi < qolPool.length; qi++) {
      pool.push(makeEntry(qolPool[qi].text, mergeTags(qolPool[qi].tags, calendarTags), qolPool[qi].weight, false));
    }

    // v2.6: Add patrol strategy events
    var patrolPool = patrolPoolFor_(patrolStrategy, isHotspot);
    for (var pi = 0; pi < patrolPool.length; pi++) {
      pool.push(makeEntry(patrolPool[pi].text, mergeTags(patrolPool[pi].tags, calendarTags), patrolPool[pi].weight, false));
    }

    // v2.6: Add weather v3.5 events
    var wv35 = weatherV35Pool_(neighborhood); // engine.33 T7 — hood microclimate preferred
    for (var wi = 0; wi < wv35.length; wi++) {
      pool.push(makeEntry(wv35[wi].text, mergeTags(wv35[wi].tags, calendarTags), wv35[wi].weight, false));
    }

    // v2.8: Previous evening carry-forward. engine.38 A4 — pass the citizen's
    // out-and-about multiplier so high-outabout citizens travel to attend
    // events outside their own neighborhood (dialBands computed above; null -> 1.0).
    var prevEvePool = previousEveningPool_(neighborhood, dialBands ? dialBands.mult.outabout : 1.0);
    for (var pei = 0; pei < prevEvePool.length; pei++) {
      pool.push(makeEntry(prevEvePool[pei].text, mergeTags(prevEvePool[pei].tags, calendarTags), prevEvePool[pei].weight, false));
    }

    // engine.33 T6: neighborhood-state flavor (prev cycle's Neighborhood_Map)
    var nbhdStatePool = neighborhoodStatePool_(neighborhood);
    for (var nsi = 0; nsi < nbhdStatePool.length; nsi++) {
      pool.push(makeEntry(nbhdStatePool[nsi].text, mergeTags(nbhdStatePool[nsi].tags, calendarTags), nbhdStatePool[nsi].weight, false));
    }

    // S280 depth-step (Mike-direct): a world event in THIS citizen's hood is
    // LIVED, not heard about — and a household lives it TOGETHER. Household
    // members drawing the shared line get the SAME text (variant picked by a
    // deterministic hash of HouseholdId + event index, not rng), so the storm
    // becomes one memory the family holds in common — story-seedable from
    // any member, reflectable from each member's own angle in the 24/7 loop.
    for (var lce = 0; lce < chaos.length; lce++) {
      var lcEv = chaos[lce];
      if (!lcEv || !lcEv.neighborhood || lcEv.neighborhood !== neighborhood) continue;
      var lcLines = chaosReaction_(lcEv, "lived");
      for (var lcl = 0; lcl < lcLines.length; lcl++) {
        pool.push(makeEntry(lcLines[lcl], mergeTags(["source:chaos", "chaos:local"], calendarTags), 1.35, false));
      }
      var hhId = (iHousehold >= 0) ? String(row[iHousehold] || "").trim() : "";
      if (hhId) {
        var hhHandle = String(lcEv.subtype || lcEv.domain || "commotion").toLowerCase();
        var hhVariants = [
          "rode it out together at home when the " + hhHandle + " hit the block",
          "the whole household traded theories over dinner about the " + hhHandle,
          "checked on each other by text until the " + hhHandle + " passed"
        ];
        var hhHash = lce;
        for (var hhc = 0; hhc < hhId.length; hhc++) hhHash = (hhHash + hhId.charCodeAt(hhc)) % 997;
        pool.push(makeEntry(hhVariants[hhHash % hhVariants.length],
          mergeTags(["source:chaos", "chaos:local", "chaos:household"], calendarTags), 1.5, false));
      }
    }

    // engine.33 T9: faith fan-out (this cycle's faith events in THIS hood)
    var faithFanPool = faithPool_(neighborhood);
    for (var ffi = 0; ffi < faithFanPool.length; ffi++) {
      pool.push(makeEntry(faithFanPool[ffi].text, mergeTags(faithFanPool[ffi].tags, calendarTags), faithFanPool[ffi].weight, false));
    }

    // Neighborhood
    if (neighborhood && neighborhoodPools[neighborhood]) {
      var nTexts = neighborhoodPools[neighborhood];
      for (var ni = 0; ni < nTexts.length; ni++) {
        pool.push(makeEntry(nTexts[ni], mergeTags(["source:neighborhood", "neighborhood:" + neighborhood], calendarTags), 1.1, false));
      }

      for (var tpi = 0; tpi < templatePool.length; tpi++) {
        pool.push(makeEntry(templatePool[tpi].text, mergeTags(templatePool[tpi].tags, ["neighborhood:" + neighborhood]), templatePool[tpi].weight, true));
      }
    }

    // Holiday
    if (holiday !== "none" && holidayPools[holiday]) {
      var hTexts = holidayPools[holiday];
      for (var hi = 0; hi < hTexts.length; hi++) {
        pool.push(makeEntry(hTexts[hi], mergeTags(["source:holiday", "holiday:" + holiday], calendarTags), 1.1, false));
      }
    }

    if (isFirstFriday) {
      for (var ffi2 = 0; ffi2 < firstFridayPool.length; ffi2++) {
        var ffEntry = firstFridayPool[ffi2];
        pool.push(makeEntry(ffEntry.text, mergeTags(ffEntry.tags, calendarTags), ffEntry.weight, false));
      }
    }

    if (isCreationDay) {
      for (var cdi2 = 0; cdi2 < creationDayPool.length; cdi2++) {
        var cdEntry = creationDayPool[cdi2];
        pool.push(makeEntry(cdEntry.text, mergeTags(cdEntry.tags, calendarTags), cdEntry.weight, false));
      }
    }

    if (sportsSeason !== "off-season" && sportsSeasonPools[sportsSeason]) {
      var sTexts = sportsSeasonPools[sportsSeason];
      for (var si = 0; si < sTexts.length; si++) {
        pool.push(makeEntry(sTexts[si], mergeTags(["source:sports"], calendarTags), 1.05, false));
      }
    }

    // engine.47 Hop 4: tonight's actual game reaches the block — pool built
    // once above (gated on a real feed entry), drawn per-citizen here.
    for (var gnp = 0; gnp < gameNightPool.length; gnp++) {
      pool.push(makeEntry(gameNightPool[gnp].text, mergeTags(gameNightPool[gnp].tags, calendarTags), gameNightPool[gnp].weight, false));
    }

    // engine.38 A1-cont (S277) Task 2 disposition: the occupation work-texture
    // pool is canon-safe ONLY for working ENGINE citizens, whose Occupation cell
    // IS their canon job. For GAME/CIVIC/MEDIA citizens the role is owned by their
    // mode engine (athlete/official/journalist) and Occupation may be a stale
    // legacy value → a contradicting "work moment as a [stale job]" event.
    // Retired citizens still draw the rest of the atmospheric core but NOT
    // work-texture — being retired changes what they get (Mike, S277). Their
    // Occupation cell holds the former job; a "busy day at work" event would
    // contradict canon. (Retirement-flavored leisure content = the depth step.)
    if (occupation && mode === "ENGINE" && status !== "retired") {
      var op = occupationPoolFor_(occupation);
      for (var opi = 0; opi < op.length; opi++) {
        pool.push(makeEntry(op[opi].text, mergeTags(op[opi].tags, calendarTags), op[opi].weight, false));
      }
    }

    // S280 item 7 (deferred from the S277 retired refinement — Mike: retirement
    // changes what they get): retired citizens lost the work-shift pool; this is
    // what replaced it. Route: PostCareer {family:4, openness:2} — the existing
    // post-career state key, same scale as workers' Work {drive:4} texture.
    if (status === "retired") {
      var retiredPool = [
        "took the long morning walk that used to be a commute",
        "gave a whole afternoon to a hobby without once checking the clock",
        "dispensed advice at the hardware store — unsolicited, graciously received",
        "watched the morning rush from the good bench, coffee in hand, exempt",
        "volunteered an hour and accidentally stayed three"
      ];
      for (var rpi = 0; rpi < retiredPool.length; rpi++) {
        pool.push(makeEntry(retiredPool[rpi], mergeTags(["source:retirement"], calendarTags), 1.0, false));
      }
    }

    // engine.32 T3 — fame seam: citizens with repeated edition appearances
    // (UsageCount = SL appearance counter, written by mediaRoomIntake) draw
    // public-recognition events. engine.68 (S325): Cultural_Ledger joins —
    // a citizen at the fame bar (FameScore >= 25 via UniverseLinks) draws
    // recognition too, and the WEIGHT scales with how famous they are
    // (fame is its own attention — Mike doctrine). Lagged read, cached map.
    var culturalStatus = (typeof culturalStatusByPop_ === 'function')
      ? (culturalStatusByPop_(ctx)[String(popId).trim().toUpperCase()] || null) : null;
    var culturalFame = culturalStatus ? culturalStatus.fameScore : 0;
    if (usageCount >= 8 || culturalFame >= 25) {
      var fameWeight = culturalFame >= 60 ? 1.35 : (culturalFame >= 40 ? 1.25 : 1.15);
      var famePool = [
        "got recognized by a stranger who'd read about them in the Tribune",
        "fielded questions at the corner store about the story they'd appeared in",
        "was greeted by name by someone they'd never met",
        "overheard their own name in a conversation outside the cafe"
      ];
      for (var fmi = 0; fmi < famePool.length; fmi++) {
        pool.push(makeEntry(famePool[fmi], mergeTags(["source:fame"], calendarTags), fameWeight, false));
      }
    }

    // engine.38 B1 (S283): bias-lite opinion pool — the depth-build item-5
    // pool that never shipped in S280, built here WITH its intent hook
    // (seams Task 6). A citizen occasionally forms an opinion about a named
    // public figure. The LINE is a normal ambient event (source:bias ->
    // Civic Perception {sociability:2}); the OPINION rides machine tags ->
    // S.biasIntents at emit time, drained into MemoryRegisters.biases by the
    // Phase-9 compressor. Sentiment is bias-local — NEVER dials (B1 invariant).
    // Sign + figure drawn per-citizen via ctx.rng: deterministic per cycle.
    if (publicFigures.length && chanceHit(0.15)) {
      var bFig = publicFigures[Math.floor(roll() * publicFigures.length)];
      if (bFig && bFig.popId !== String(popId).trim().toUpperCase()) {
        var bSign = chanceHit(0.5) ? 1 : -1;
        var bTags = ["source:bias", "biasTarget:" + bFig.name, "biasSign:" + bSign];
        if (bSign > 0) {
          pool.push(makeEntry("heard " + bFig.name + "'s name come up at the counter and found themselves taking their side", mergeTags(bTags, calendarTags), 1.0, false));
          pool.push(makeEntry("read the latest on " + bFig.name + " over coffee and decided they liked what they saw", mergeTags(bTags, calendarTags), 0.95, false));
        } else {
          pool.push(makeEntry("heard " + bFig.name + "'s name twice in one day and decided they didn't much care for them", mergeTags(bTags, calendarTags), 1.0, false));
          pool.push(makeEntry("read one more story about " + bFig.name + " and quietly made up their mind", mergeTags(bTags, calendarTags), 0.95, false));
        }
      }
    }

    // engine.38 B3 read (seams Task 9): unlived echo joins the pool when the
    // recent life rhymes with a stored branch. chanceHit(0.3) keeps it rare —
    // and the rng draw is data-gated (only citizens with a non-blank register
    // reach it), so pre-fill cycles are byte-identical to pre-Task-9 replays.
    if (iMemReg >= 0 && row[iMemReg] && chanceHit(0.3)) {
      var echoEntry = unlivedEchoEntry_(String(row[iMemReg]), row[iLife] ? String(row[iLife]) : "");
      if (echoEntry) pool.push(makeEntry(echoEntry.text, mergeTags(echoEntry.tags, calendarTags), echoEntry.weight, false));
    }
    var agp = agePoolFor_(lifeState ? lifeState.band : ageGroup); // engine.67: child/teen draw their own lives
    for (var agi = 0; agi < agp.length; agi++) {
      pool.push(makeEntry(agp[agi].text, mergeTags(agp[agi].tags, calendarTags), agp[agi].weight, false));
    }

    // S280 column-conditioned depth (Mike-direct): family texture gated on the
    // citizen's ACTUAL columns — the guard is conditioning, not avoidance. A
    // citizen with children on the ledger gets kid moments; Married/Widowed/
    // Divorced each read in their own register. source:familyLife → Daily fold
    // {composure:2, family:1}, same ambient scale as the domain pools.
    var maritalLc = (iMarital >= 0) ? String(row[iMarital] || "").trim().toLowerCase() : "";
    var kidCount = (iNumChildren >= 0) ? (Number(row[iNumChildren]) || 0) : 0;
    if (kidCount > 0) {
      pool.push(makeEntry("one of the kids asked a question at dinner that stopped the room", mergeTags(["source:familyLife", "family:kids"], calendarTags), 1.0, false));
      pool.push(makeEntry("found a school drawing folded in a jacket pocket and kept it", mergeTags(["source:familyLife", "family:kids"], calendarTags), 1.0, false));
      pool.push(makeEntry("negotiated bedtime like a seasoned diplomat, and lost gracefully", mergeTags(["source:familyLife", "family:kids"], calendarTags), 0.95, false));
    }
    if (maritalLc === "married") {
      pool.push(makeEntry("split the last of the coffee and the morning's plans with their partner", mergeTags(["source:familyLife", "family:partner"], calendarTags), 1.0, false));
      pool.push(makeEntry("caught their partner humming the song they'd had stuck all day", mergeTags(["source:familyLife", "family:partner"], calendarTags), 0.95, false));
    } else if (maritalLc === "widowed") {
      pool.push(makeEntry("set two cups out by habit and let the second one stay", mergeTags(["source:familyLife", "family:widowed"], calendarTags), 1.0, false));
      pool.push(makeEntry("told a story their late partner used to tell, and told it right", mergeTags(["source:familyLife", "family:widowed"], calendarTags), 0.95, false));
    } else if (maritalLc === "divorced") {
      pool.push(makeEntry("handled a logistics call with an ex — civil, brief, done", mergeTags(["source:familyLife", "family:divorced"], calendarTags), 0.9, false));
    }

    // S280 column-conditioned depth: money texture aimed by actual means, not
    // citywide mood alone. WealthLevel 0-10; DisplacementRisk 0-10 (≥7 = the
    // migrationTrackingEngine's own high-risk gate). Composure-light: the TEXT
    // carries the strain, the negative-valence dial supply stays gated on
    // engine.38 B3 (source:economy → Daily fold, unchanged).
    var wealthLvl = (iWealth >= 0 && row[iWealth] !== "" && row[iWealth] != null) ? Number(row[iWealth]) : null;
    if (wealthLvl !== null && wealthLvl <= 3) {
      pool.push(makeEntry("did the math twice at the register and put one thing back", mergeTags(["source:economy", "econ:tight"], calendarTags), 1.05, false));
      pool.push(makeEntry("moved a bill to next month and tried not to think about it", mergeTags(["source:economy", "econ:tight"], calendarTags), 1.0, false));
    } else if (wealthLvl !== null && wealthLvl >= 8) {
      pool.push(makeEntry("quietly covered the table's coffee and waved off the thanks", mergeTags(["source:economy", "econ:comfortable"], calendarTags), 0.95, false));
      pool.push(makeEntry("spent an hour moving money around to work a little harder", mergeTags(["source:economy", "econ:comfortable"], calendarTags), 0.9, false));
    }
    var displRisk = (iDisplRisk >= 0) ? (Number(row[iDisplRisk]) || 0) : 0;
    if (displRisk >= 7) {
      pool.push(makeEntry("did rent math on the back of an envelope and sat back hard", mergeTags(["source:economy", "econ:displacement"], calendarTags), 1.15, false));
      pool.push(makeEntry("noticed the listing price on a place like theirs and read it twice", mergeTags(["source:economy", "econ:displacement"], calendarTags), 1.1, false));
    }

    // S280 depth-step: bond texture names the actual counterpart when the
    // ledger has a name ("traded words with Marcus Webb" seeds a story;
    // "felt a flicker of tension" doesn't). Direction-neutral phrasing for
    // mentorship (bond rows don't record who mentors whom). Generic pools
    // remain the fallback. Tags unchanged — dial routing identical.
    if (hasAlliance && chanceHit(0.4)) {
      if (allyName) {
        pool.push(makeEntry("compared notes with " + allyName + " over coffee that went long", mergeTags(["relationship:alliance"], calendarTags), 1.15, false));
        pool.push(makeEntry("got a heads-up text from " + allyName + " that saved some trouble", mergeTags(["relationship:alliance"], calendarTags), 1.1, false));
        pool.push(makeEntry("caught " + allyName + "'s eye across the room and didn't need to say it", mergeTags(["relationship:alliance"], calendarTags), 1.05, false));
      } else {
        for (var ali2 = 0; ali2 < alliancePool.length; ali2++) {
          var alEntry = alliancePool[ali2];
          pool.push(makeEntry(alEntry.text, mergeTags(alEntry.tags, calendarTags), 1.1, false));
        }
      }
    }
    if (hasRivalry && chanceHit(0.4)) {
      if (rivalName) {
        pool.push(makeEntry("crossed paths with " + rivalName + " and kept it civil — barely", mergeTags(["relationship:rivalry"], calendarTags), 1.2, false));
        pool.push(makeEntry("heard " + rivalName + "'s name come up and felt the old edge return", mergeTags(["relationship:rivalry"], calendarTags), 1.15, false));
        pool.push(makeEntry("caught themselves measuring the week against " + rivalName + "'s", mergeTags(["relationship:rivalry"], calendarTags), 1.1, false));
      } else {
        for (var rvi2 = 0; rvi2 < rivalryPool.length; rvi2++) {
          var rvEntry = rivalryPool[rvi2];
          pool.push(makeEntry(rvEntry.text, mergeTags(rvEntry.tags, calendarTags), 1.15, false));
        }
      }
    }
    if (hasMentorship && chanceHit(0.3)) {
      if (mentorPartnerName) {
        pool.push(makeEntry("talked something through with " + mentorPartnerName + " and left clearer than they arrived", mergeTags(["relationship:mentorship"], calendarTags), 1.1, false));
        pool.push(makeEntry("caught up with " + mentorPartnerName + " — the kind of conversation that lingers into the evening", mergeTags(["relationship:mentorship"], calendarTags), 1.05, false));
        pool.push(makeEntry("jotted down something " + mentorPartnerName + " said before it could slip away", mergeTags(["relationship:mentorship"], calendarTags), 1.0, false));
      } else {
        for (var mti2 = 0; mti2 < mentorshipPool.length; mti2++) {
          var mtEntry = mentorshipPool[mti2];
          pool.push(makeEntry(mtEntry.text, mergeTags(mtEntry.tags, calendarTags), 1.05, false));
        }
      }
    }
    // engine.58 (S320): GC surfacing — the lottery ticket. A T3/T4 ENGINE
    // citizen's week sometimes crosses a Tier-5 name from the waiting room
    // (neighborhood-preferring pick). The named line seeds a story a desk can
    // chase; a pick ticks that GC's EmergenceCount toward promotion.
    if (!isNamed && mode === "ENGINE" && gcSurfacePool.length && chanceHit(GC_SURFACE_CHANCE)) {
      var gcLocal = [];
      for (var gci = 0; gci < gcSurfacePool.length; gci++) {
        if (neighborhood && gcSurfacePool[gci].nbhd === neighborhood) gcLocal.push(gcSurfacePool[gci]);
      }
      var gcFrom = gcLocal.length ? gcLocal : gcSurfacePool;
      var gcPick = gcFrom[Math.floor(rng() * gcFrom.length)];
      var gcT1 = "swapped stories with " + gcPick.name + " while the line at the corner store crawled";
      var gcT2 = "got roped into helping " + gcPick.name + " haul something heavy up a flight of stairs";
      var gcT3 = "kept running into " + gcPick.name + " this week — the neighborhood kind of coincidence";
      // Weight 12/11/10 (not ~1): the 6% roll above already decided this
      // week crosses a GC name — at base weights the 3 lines drowned in a
      // 40+ entry pool (~8% pick => a tick every ~8 cycles, lottery never
      // draws; C102 sandbox verify S320). At 12+11+10 vs ~40 base mass the
      // offered lines win ~45% of picks => ~1 tick/cycle world-wide.
      pool.push(makeEntry(gcT1, mergeTags(["relationship:acquaintance"], calendarTags), 12, false));
      pool.push(makeEntry(gcT2, mergeTags(["relationship:acquaintance"], calendarTags), 11, false));
      pool.push(makeEntry(gcT3, mergeTags(["relationship:acquaintance"], calendarTags), 10, false));
      gcPendingByText[gcT1] = gcPick;
      gcPendingByText[gcT2] = gcPick;
      gcPendingByText[gcT3] = gcPick;
    }
    if (activeArc && chanceHit(0.5)) {
      var arcType = activeArc.type ? ("arcType:" + activeArc.type) : null;
      var arcPhase = activeArc.phase ? ("arcPhase:" + activeArc.phase) : null;
      var arcTagsExtra = [];
      if (arcType) arcTagsExtra.push(arcType);
      if (arcPhase) arcTagsExtra.push(arcPhase);

      // S280 depth-step: arcs carry a human summary at creation ("[Name]'s
      // retirement leaves a void in leadership.") — surface it so the citizen
      // reflects on the actual situation, not "unfolding events". Trailing
      // period stripped so the framing reads clean. Generic pool = fallback.
      var arcSummary = (activeArc.summary ? String(activeArc.summary).trim() : "").replace(/\.$/, "");
      if (arcSummary) {
        pool.push(makeEntry("kept circling back to it during the day — " + arcSummary, mergeTags(mergeTags(["arc:named"], arcTagsExtra), calendarTags), 1.25, false));
        pool.push(makeEntry("weighed where they stand as it develops: " + arcSummary, mergeTags(mergeTags(["arc:named"], arcTagsExtra), calendarTags), 1.2, false));
      }
      for (var ari2 = 0; ari2 < arcPool.length; ari2++) {
        var arEntry = arcPool[ari2];
        pool.push(makeEntry(arEntry.text, mergeTags(mergeTags(arEntry.tags, arcTagsExtra), calendarTags), arcSummary ? 1.0 : 1.2, false));
      }
    }

    // Continuity pool
    if (mem && mem.unresolved) {
      if (mem.unresolved.rivalry && chanceHit(0.5)) {
        pool.push(makeEntry("followed up on an unresolved tension without making it obvious", ["source:continuity", "continuity:rivalry"], 1.25, false));
      }
      if (mem.unresolved.alliance && chanceHit(0.45)) {
        pool.push(makeEntry("checked in on a quiet agreement that still needs maintenance", ["source:continuity", "continuity:alliance"], 1.2, false));
      }
      if (mem.unresolved.arc && chanceHit(0.5)) {
        pool.push(makeEntry("took a small step in an ongoing situation—nothing loud, but real", ["source:continuity", "continuity:arc"], 1.25, false));
      }
    }

    if (typeof getWeatherEvent_ === "function" && chanceHit(0.25)) {
      var weatherEvent = getWeatherEvent_(ctx, true);
      if (weatherEvent && weatherEvent.text) {
        pool.push(makeEntry(weatherEvent.text, mergeTags(["source:weather"], calendarTags), 1.05, false));
      }
    }

    if (typeof getMediaInfluencedEvent_ === "function" && chanceHit(0.2)) {
      var mediaEvent = getMediaInfluencedEvent_(ctx);
      if (mediaEvent && mediaEvent.text) {
        pool.push(makeEntry(mediaEvent.text, mergeTags(["source:media"], calendarTags), 1.1, false));
      }
    }

    // engine.38 Design A (seams Task 11): content-ledger pool injection —
    // ADDITIVE-ONLY (S289 collision rule: a poolKey never replaces or
    // suppresses a hardcoded pool). Data-gated: empty ledger pushes nothing
    // and consumes no rng, so pre-content cycles replay byte-identical.
    // Eligibility = compiled Conditions vs this citizen's scopes; lines whose
    // fragment slots have zero eligible fragments for this citizen never
    // enter the pool (no raw $SLOT can reach LifeHistory).
    var contentLedger = S.contentLedger;
    if (contentLedger && contentLedger.lineCount) {
      var condScopes = {
        wealth: wealthLvl,
        children: kidCount,
        married: maritalLc === "married",
        retired: status === "retired",
        ageband: ageGroup,
        hood: neighborhood,
        season: season,
        displacement: displRisk,
        // engine.67 step 5 (S325): life-state scopes — the ECL library can now
        // aim at who a citizen is. heritage rides Phase-4's cached lagged read
        // (generationalEventsEngine ctx._heritageTierByPop, engine.65 pattern).
        lifestate: lifeState ? lifeState.working : "none",
        band: lifeState ? lifeState.band : ageGroup,
        occupation: occupation,
        tier: tier,
        heritage: (ctx._heritageTierByPop && ctx._heritageTierByPop[String(popId).trim().toUpperCase()]) || "none",
        // engine.68: fame joins the authoring surface (0 below the 25 bar)
        fame: culturalFame,
        culdomain: culturalStatus ? culturalStatus.domain : ""
      };
      for (var clk in contentLedger.lines) {
        if (!contentLedger.lines.hasOwnProperty(clk)) continue;
        var clLines = contentLedger.lines[clk];
        for (var cli = 0; cli < clLines.length; cli++) {
          var clEntry = clLines[cli];
          if (!evalContentConditions_(clEntry.conditions, condScopes)) continue;
          if (!contentSlotsFillable_(clEntry, contentLedger, condScopes)) continue;
          var clTags = clEntry.grain ? mergeTags(clEntry.tags, ["grain:" + clEntry.grain]) : clEntry.tags;
          var clPooled = makeEntry(clEntry.text, mergeTags(clTags, calendarTags), clEntry.weight, false);
          clPooled.ledgerLine = clEntry;      // draw-time compose hook
          clPooled.ledgerScopes = condScopes; // fragment eligibility at compose
          pool.push(clPooled);
        }
      }
    }

    // engine.67 (S325, Mike ruling): impossible content is HARD-GATED. The
    // assembled pool is filtered against the citizen's life-state before any
    // draw — a child never sees work/money/nightlife entries, a non-retiree
    // never sees retirement texture. Classification rides existing source:*
    // tags (eventClassFromTags_); unknown classes stay universal, so this
    // gate only ever NARROWS, never invents eligibility. No rng consumed.
    if (lifeState && typeof isEventEligible_ === 'function') {
      var gatedPool = [];
      for (var gfi = 0; gfi < pool.length; gfi++) {
        var gEntry = pool[gfi];
        if (isEventEligible_(lifeState, eventClassFromTags_(gEntry.tags || []))) gatedPool.push(gEntry);
      }
      pool = gatedPool;
    }

    if (pool.length === 0) continue;

    // v2.7: Apply archetype weights to pool entries
    if (traitProfile) {
      for (var awi = 0; awi < pool.length; awi++) {
        var awEntry = pool[awi];
        var awTags = awEntry.tags || [];
        var weightMod = 1.0;

        // Check tags for category matches and apply archetype weights
        for (var awti = 0; awti < awTags.length; awti++) {
          var awTag = awTags[awti];
          if (awTag.indexOf('relationship:alliance') >= 0 || awTag === 'Alliance') weightMod *= archetypeWeights.alliance;
          else if (awTag.indexOf('relationship:rivalry') >= 0 || awTag === 'Rivalry') weightMod *= archetypeWeights.rivalry;
          else if (awTag.indexOf('source:neighborhood') >= 0 || awTag === 'Neighborhood') weightMod *= archetypeWeights.neighborhood;
          else if (awTag.indexOf('source:occupation') >= 0 || awTag === 'Work') weightMod *= archetypeWeights.work;
          else if (awTag.indexOf('source:continuity') >= 0) weightMod *= archetypeWeights.continuity;
        }

        // Trait-based weight adjustments from profile
        var traits = traitProfile.traits || {};
        if (traits.social >= 0.6 && awEntry.text.indexOf('coordinated') >= 0) weightMod *= 1.15;
        if (traits.reflective >= 0.6 && awEntry.text.indexOf('noticed') >= 0) weightMod *= 1.15;
        if (traits.driven >= 0.6 && awEntry.text.indexOf('work') >= 0) weightMod *= 1.15;

        awEntry.weight = (awEntry.weight || 1) * weightMod;
      }
    }

    // engine.32 T5 — dial bands bias WHICH events a citizen draws (pool-entry
    // weights by category, 0.5..1.5 each). Authoritative DialState, not the
    // TraitProfile face. Stacks with archetype weights; null -> no bias.
    if (dialBands) {
      var dm = dialBands.mult;
      for (var dwi = 0; dwi < pool.length; dwi++) {
        var dwEntry = pool[dwi];
        var dwTags = dwEntry.tags || [];
        var dwMod = 1.0;
        for (var dwti = 0; dwti < dwTags.length; dwti++) {
          var dwTag = dwTags[dwti];
          if (dwTag.indexOf('relationship:') === 0) dwMod *= dm.sociability;
          else if (dwTag === 'source:occupation') dwMod *= dm.drive;
          else if (dwTag === 'source:neighborhood' || dwTag === 'source:prevEvening') dwMod *= dm.outabout;
          else if (dwTag === 'source:firstFriday' || dwTag === 'source:holiday' || dwTag === 'source:sports' || dwTag === 'source:creationDay') dwMod *= dm.outabout;
          else if (dwTag === 'source:continuity') dwMod *= dm.composure < 1 ? (2 - dm.composure) : 1; // low composure dwells on unresolved tension
          else if (dwTag === 'evening:cityEventAttend') dwMod *= dm.sociability; // engine.32 T8 — attending stacks sociability on top of prevEvening's outabout
          else if (dwTag === 'source:fame') dwMod *= dm.sociability; // engine.32 T3 — sociable citizens lean into recognition
        }
        if (dwMod !== 1.0) dwEntry.weight = (dwEntry.weight || 1) * dwMod;
      }
    }

    // v2.7: Continuity penalty - reduce weight if TopTags overlap with recent primary tags
    if (traitProfile && traitProfile.topTags && mem && mem.recentPrimary) {
      var topTags = traitProfile.topTags;
      var recentPri = mem.recentPrimary;
      for (var cpi = 0; cpi < pool.length; cpi++) {
        var cpEntry = pool[cpi];
        var cpTags = cpEntry.tags || [];
        for (var cpti = 0; cpti < cpTags.length; cpti++) {
          var cpTag = cpTags[cpti];
          // If this tag is both in TopTags AND in recent primary, penalize slightly
          if (topTags.indexOf(cpTag) >= 0 && recentPri.indexOf(cpTag) >= 0) {
            cpEntry.weight = (cpEntry.weight || 1) * 0.85;
          }
        }
      }
    }

    // engine.38 A1-cont (S277): emit a random 1..N atmospheric events for this
    // citizen (was exactly 1). cycleSeen hard-blocks duplicate text within the
    // cycle (the soft >=6 fallback below re-admits mem.recentTexts but never
    // cycleSeen). Pulse fires once per citizen (ev===0, below) so volume scaling
    // leaves the neighborhood-metric grain unchanged. Body indentation is left
    // at the original level to keep this a minimal, reviewable diff.
    var eventCount = 1 + Math.floor(roll() * ATMOSPHERIC_MAX_EVENTS); // 1..N
    var cycleSeen = [];
    var emittedAny = false;
    for (var ev = 0; ev < eventCount; ev++) {
    // Filter out recently repeated content
    var filtered = [];
    var recent = mem ? mem.recentTexts : [];
    for (var fi = 0; fi < pool.length; fi++) {
      var pe = pool[fi];
      var nrm = normText_(pe.text);
      if (cycleSeen.indexOf(nrm) >= 0) continue; // hard: never repeat within a cycle
      var seen = false;
      for (var ri2 = 0; ri2 < recent.length; ri2++) {
        if (recent[ri2] === nrm) { seen = true; break; }
      }
      if (!seen) filtered.push(pe);
    }
    var usePool = filtered.length >= 6 ? filtered : pool;
    // Apply the hard within-cycle exclusion to the fallback pool too, so a draw
    // from the full pool can't repeat an already-emitted line this cycle.
    if (filtered.length < 6) {
      var hardPool = [];
      for (var hpi = 0; hpi < usePool.length; hpi++) {
        if (cycleSeen.indexOf(normText_(usePool[hpi].text)) < 0) hardPool.push(usePool[hpi]);
      }
      usePool = hardPool;
    }
    if (!usePool.length) break; // nothing fresh left to say this cycle

    var entry = pickWeighted_(usePool);
    var pick = entry.text;
    var tags = entry.tags.slice();

    var chosenVenue = "";
    var chosenInstitution = "";
    var contact = { name: "someone familiar", popId: "" };

    if (citizenBonds && citizenBonds.length) {
      contact = pickContactFromBonds_(citizenBonds);
    }

    // engine.38 Design A (seams Task 11): drawn ledger line — fill fragment
    // slots (weighted, ctx.rng) + entity slots (code-side resolvers mirroring
    // the template-fallback branch). Composer matches pool house style
    // (lowercase clause, no terminal punctuation — S289 build note: the plan's
    // capitalize+period rule assumed standalone sentences; existing pool lines
    // are clauses, so ledger lines follow the same convention). Null compose =
    // drop this emit slot, never raw $SLOT into LifeHistory.
    if (entry.ledgerLine) {
      var clVenue = "", clUsedContact = false;
      var clSlots = entry.ledgerLine.slots || [];
      for (var cls = 0; cls < clSlots.length; cls++) {
        if (clSlots[cls] === "VENUE") clVenue = pickVenue_(neighborhood) || (mem && mem.lastVenue) || "a familiar corner";
        else if (clSlots[cls] === "CONTACT") clUsedContact = true;
      }
      var composedText = composeContentLine_(entry.ledgerLine, S.contentLedger, {
        VENUE: clVenue,
        INSTITUTION: pickInstitution_(neighborhood) || "a local office",
        CONTACT: contact.name || "someone familiar"
      }, entry.ledgerScopes);
      if (composedText === null) continue; // unfillable at draw — drop the emit slot
      // Rendered-line hard dedup (plan §Composer): the pool filter compares
      // SKELETON text, but cycleSeen stores RENDERED text — same skeleton +
      // same fragment draw would otherwise slip the within-cycle block.
      if (cycleSeen.indexOf(normText_(composedText)) >= 0) continue;
      pick = composedText;
      if (clVenue) { chosenVenue = clVenue; tags = mergeTags(tags, ["venue:local"]); }
      if (clUsedContact && contact && contact.popId) tags = mergeTags(tags, ["contactPopId:" + contact.popId]);
    }

    if (entry.template) {
      // v2.7: Use tone-aware template slotter if cooldown allows
      if (canUseTemplate_(popId) && traitProfile) {
        var slotted = buildTemplateEvent_(popId, neighborhood, contact, traitProfile, nhQoL);
        pick = slotted.text;
        tags = mergeTags(tags, slotted.tags);
        markTemplateUsed_(popId);
        chosenVenue = "local"; // for memory tracking
      } else {
        // Fallback to simple template rendering
        chosenVenue = pickVenue_(neighborhood) || (mem && mem.lastVenue) || "a familiar corner";
        chosenInstitution = pickInstitution_(neighborhood) || "a local office";

        pick = renderTemplate_(pick, {
          VENUE: chosenVenue,
          INSTITUTION: chosenInstitution,
          CONTACT: contact.name || "someone familiar"
        });

        tags = mergeTags(tags, ["source:template"]);
      }
      if (contact && contact.popId) tags = mergeTags(tags, ["contactPopId:" + contact.popId]);
      if (chosenVenue) tags = mergeTags(tags, ["venue:local"]);
    } else if (neighborhood && !chosenVenue && chanceHit(0.12)) {
      // !chosenVenue: a ledger line that filled $VENUE already carries its
      // venue — don't append a second one. "" for every other non-template
      // line, so pre-ledger rng sequence is unchanged (Task 11).
      chosenVenue = pickVenue_(neighborhood);
      if (chosenVenue) {
        pick = pick + " near " + chosenVenue;
        tags = mergeTags(tags, ["venue:local"]);
      }
    }

    if (tags.indexOf("relationship:rivalry") >= 0 && hasRivalry && chanceHit(0.3)) {
      pick += " [rivalry active]";
      tags = mergeTags(tags, ["rivalry:active"]);
    }

    var hasArcTypeTag = false;
    for (var ati = 0; ati < tags.length; ati++) {
      if (tags[ati].indexOf("arcType:") === 0) { hasArcTypeTag = true; break; }
    }
    if (hasArcTypeTag && activeArc) {
      pick += " [" + activeArc.type + " arc]";
    }

    // engine.38 B1 (S283): opinion DRAWN -> intent. Fires only when a bias
    // line is actually selected as the citizen's event — pooled-but-not-drawn
    // leaves no trace. S.biasIntents {popId: [{t,s,o}]} is a cycle-scoped
    // tally (dies with ctx.summary); the Phase-9 compressor drains it into
    // MemoryRegisters.biases same-cycle (Phase5 precedes Phase9, verified
    // both entry points).
    var biasTarget = "", biasSignVal = 0;
    for (var bti = 0; bti < tags.length; bti++) {
      if (tags[bti].indexOf("biasTarget:") === 0) biasTarget = tags[bti].slice(11);
      else if (tags[bti].indexOf("biasSign:") === 0) biasSignVal = Number(tags[bti].slice(9)) || 0;
    }
    if (biasTarget && biasSignVal) {
      if (!S.biasIntents) S.biasIntents = {};
      if (!S.biasIntents[popId]) S.biasIntents[popId] = [];
      S.biasIntents[popId].push({ t: biasTarget, s: biasSignVal, o: "source:bias|c" + cycle });
    }

    // engine.67 step 9b (S325): faith exposure — a DRAWN faith line is lived
    // exposure; bondEngine's processFaithJoins_ rolls the join dice same
    // cycle (Phase5-Bonds runs after Phase5-CitizenEvents). Repeated exposure
    // IS the growth path — no counter, no storage, just more dice.
    if (tags.indexOf("source:faith") >= 0) {
      if (!S.faithExposures) S.faithExposures = [];
      S.faithExposures.push({ popId: String(popId), hood: neighborhood });
    }

    // engine.68 (S325, Mike doctrine: fame is its own attention). A famous
    // citizen's lived week seeds MEDIA attention — a FAME_WATCH hook the
    // newsroom sees, scaled by how famous (25->6%, 40+->10% per active week).
    // Once per citizen per cycle (ev===0), only on weeks they actually lived.
    if (ev === 0 && culturalFame >= 25 && chanceHit(Math.min(0.10, culturalFame / 400))) {
      if (!S.storyHooks) S.storyHooks = [];
      S.storyHooks.push({
        hookType: 'FAME_WATCH', severity: 3, priority: 3,
        description: (((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim()) + ' — the city is watching: ' + pick,
        cycleGenerated: cycle, neighborhood: neighborhood, domain: 'CULTURE', text: pick
      });
    }

    if (occupation) tags = mergeTags(tags, ["occupation:" + occupation]);
    if (ageGroup) tags = mergeTags(tags, ["ageGroup:" + ageGroup]);
    if (neighborhood) tags = mergeTags(tags, ["neighborhood:" + neighborhood]);
    tags = mergeTags(tags, ["tier:" + tier]);

    // v2.6: Add QoL tag
    if (nhQoL <= 0.35) tags = mergeTags(tags, ["qol:low"]);
    else if (nhQoL >= 0.65) tags = mergeTags(tags, ["qol:high"]);
    if (isHotspot) tags = mergeTags(tags, ["hotspot:true"]);

    // v2.7: Add archetype tag
    if (archetype && archetype !== 'Drifter') tags = mergeTags(tags, ["archetype:" + archetype]);

    var primaryTag = primaryFromTags(tags);
    var tagString = [primaryTag].concat(tags).join("|");

    var stamp = inWorldStamp_(ctx);
    var existing = row[iLife] ? row[iLife].toString() : "";
    var line = stamp + " — [" + primaryTag + "] " + pick;

    // engine.58 (S320): a picked GC-surfacing line ticks that GC's emergence
    // count — the mention happened in a real citizen's week.
    if (gcPendingByText[pick]) {
      var gcHit = gcPendingByText[pick];
      if (!gcIncrements[gcHit.sheetRow]) gcIncrements[gcHit.sheetRow] = { entry: gcHit, add: 0, contexts: [] };
      gcIncrements[gcHit.sheetRow].add += 1;
      // engine.59: namer ROSTER, not last-writer — promotion seeds bonds from it
      gcIncrements[gcHit.sheetRow].contexts.push("Named in " + ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim() + "'s week, " + stamp);
    }

    row[iLife] = existing ? existing + "\n" + line : line;
    row[iLastU] = ctx.now;

    if (lifeLog) {
      logRows.push([
        ctx.now,
        row[iPopID],
        ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
        tagString,
        pick,
        neighborhood,
        cycle
      ]);
    }

    rows[r] = row;

    // engine.33 — emit-time neighborhood pulse (public-footprint events move
    // neighborhood metrics; fold at phase08 v3NeighborhoodWriter).
    // engine.38 A1-cont (S277): pulse ONCE per citizen (ev===0). recordPulse_
    // writes neighborhood sentiment/crime/vitality; firing it per-draw would
    // scale those metrics with texture volume and confound the live G-EC33
    // uniformity watch + the engine.38 convergence concern. Once-per-citizen
    // holds the metric grain at exactly today's rate.
    if (ev === 0 && typeof recordPulse_ === 'function') recordPulse_(S, neighborhood, primaryTag, tags, pick);

    // engine.47 Hop 4: attribution — this citizen actually drew tonight's game.
    if (tags.indexOf("gameNight") >= 0) gameNightDrawn.push(String(popId));

    remember(popId, primaryTag, pick, chosenVenue, neighborhood, contact && contact.name, tags);

    // ENGINE_REPAIR Row 33 (S301): publish this cycle's event citizens.
    // Phase5-Bonds (moved after this engine) builds its active-citizen pool
    // from S.citizenEvents — which had NO producer anywhere, so bond
    // detection exited on an empty pool every cycle since landing.
    S.citizenEvents = S.citizenEvents || [];
    S.citizenEvents.push({
      popId: String(popId),
      citizenName: citizenName_(popId),
      text: pick,
      tag: primaryTag,
      neighborhood: neighborhood || ''
    });

    cycleSeen.push(normText_(pick));
    // Ledger lines: also block the SKELETON within-cycle (S289 C102 rehearsal:
    // 201 citizens drew the same skeleton twice with different fragments —
    // the pool filter compares skeleton text, so rendered-only dedup can't
    // stop a re-draw). One skeleton per citizen per cycle.
    if (entry.ledgerLine) cycleSeen.push(normText_(entry.ledgerLine.text));
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    emittedAny = true;
    } // end 1..N atmospheric emit loop

    if (emittedAny) {
      activeSetObj[popId] = true;
      count++;
    }
  }

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  if (count > 0) {
    ctx.ledger.dirty = true;
  }

  if (lifeLog && logRows.length) {
    var startRow = lifeLog.getLastRow() + 1;
    lifeLog.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);
  }

  // engine.58 (S320): batched GC emergence writes — one write per surfaced GC
  // row (this file is a documented Phase-5 direct writer, engine.md SL-writers
  // class). Promotion at threshold happens at the Phase-5 advancement
  // checkpoint (checkEmergencePromotions_), not here.
  if (gcSurfaceSheet && gsE >= 0) {
    for (var gwKey in gcIncrements) {
      var gw = gcIncrements[gwKey];
      // engine.66d (S324 CORRECTION): the tick is RESTORED. A GC citizen
      // named in an on-camera citizen's week is LIVING — these crossings are
      // the Tier-5 road to the ledger (engine.58, Mike-ruled S320: 3 namings
      // = a row). The S324 removal froze every GC dream; that was wrong.
      gcSurfaceSheet.getRange(gw.entry.sheetRow, gsE + 1).setValue(gw.entry.count + gw.add);
      if (gsC >= 0 && gw.contexts.length) {
        // engine.59: accumulate the namer roster — keep any non-namer origin
        // note (intake context) + the last 5 'Named in' entries.
        var parts = (gw.entry.ctx0 ? gw.entry.ctx0.split('; ') : []).concat(gw.contexts);
        var origin = parts.filter(function(p) { return p.indexOf('Named in ') !== 0; });
        // dedupe by namer NAME (repeat encounters tick the count but list once)
        var seenNamer = {};
        var namers = parts.filter(function(p) {
          var nm = (p.match(/Named in (.+?)'s week/) || [])[1];
          if (!nm || seenNamer[nm]) return false;
          seenNamer[nm] = true;
          return true;
        }).slice(-5);
        var roster = origin.slice(0, 1).concat(namers).join('; ').slice(0, 400);
        gcSurfaceSheet.getRange(gw.entry.sheetRow, gsC + 1).setValue(roster);
      }
    }
  }

  // engine.47 Hop 4: one Ripple row — the game reached these citizens' days.
  // Same call shape as applyGameNightMoments_ (S296, shipped tested).
  if (gameNightDrawn.length && gnGame && typeof recordRipple_ === 'function') {
    recordRipple_(ctx, {
      causeType: 'sports',
      causeId: 'Oakland_Sports_Feed.gameNight',
      causeDetail: 'The town watched — game night shaped ' + gameNightDrawn.length + ' citizen day(s)' +
        (gnGame.streak ? ' (streak ' + gnGame.streak + ')' : ''),
      effectType: 'game-night-texture',
      targetScope: 'citizen',
      targetIds: gameNightDrawn,
      neighborhood: '',
      magnitude: gameNightDrawn.length,
      duration: 1,
      sourceEngine: 'generateCitizensEvents_'
    });
  }

  S.cycleActiveCitizens = Object.keys(activeSetObj);
  S.citizenEventMemory = MEM;
  ctx.summary = S;
}


/**
 * ============================================================================
 * CITIZENS EVENTS ENGINE REFERENCE v2.7
 * ============================================================================
 *
 * v2.7 CHANGES (TraitProfile + Template Slotter):
 * - TraitProfile consumption: reads R-TraitProfile from compressLifeHistory v1.1
 * - Archetype-weighted pool selection: Connector +social, Watcher +reflective, etc.
 * - Motif injection: recurring venues/phrases from profile appear organically (20%)
 * - Tone-aware template slotter: plain/noir/bright/tense/tender
 * - Template spam cooldown: 3-cycle minimum between template events per citizen
 * - Continuity penalty: reduces weight for TopTags that appear in recent primary
 * - New tag: archetype:{name} for non-Drifter archetypes
 * - New tags: tone:{plain|noir|bright|tense|tender}, source:slotter
 *
 * TRAITPROFILE INPUT (v2.7):
 * Reads from citizenLookup[popId].TraitProfile (column R or OriginVault fallback)
 * Format: Archetype:X|Mods:a,b|social:0.xx|...|TopTags:...|Motifs:...
 *
 * ARCHETYPES & WEIGHTS:
 * - Connector: +40% social, +30% alliance, +20% neighborhood
 * - Watcher: +40% reflective, +30% continuity, +10% neighborhood
 * - Striver: +40% driven, +30% work, +20% rivalry
 * - Anchor: +40% grounded, +30% neighborhood, +20% continuity
 * - Catalyst: +30% volatile, +20% rivalry, +10% social
 * - Caretaker: +20% social/grounded/alliance
 * - Drifter: +10% reflective/volatile (default)
 *
 * TONE SELECTION:
 * - plain: default, neutral events
 * - noir: high reflective or low QoL + reflective
 * - bright: high social + grounded
 * - tense: high volatile or low QoL + volatile
 * - tender: high social + reflective
 *
 * v2.6 FEATURES (retained):
 * - crimeMetrics v1.2 integration: qualityOfLifeIndex drives event pools
 * - neighborhoodDynamics v2.6 integration via getNeighborhoodDynamics_()
 * - Weather v3.5 full integration (precipitationIntensity, visibility, frontType)
 * - QoL-aware event pools (low QoL = tension/patrol events, high QoL = calm events)
 * - Patrol strategy flavor (suppress_hotspots vs community_presence)
 * - Hotspot awareness (crimeMetrics.hotspots[] boost + events)
 * - Tags: qol:low, qol:high, hotspot:true, patrol:suppress, patrol:community
 *
 * CRIME METRICS INPUT (v2.6):
 * ctx.summary.crimeMetrics = {
 *   qualityOfLifeIndex: 0.0-1.0,
 *   patrolStrategy: 'suppress_hotspots' | 'community_presence' | 'balanced',
 *   enforcementCapacity: number,
 *   hotspots: string[],
 *   neighborhoodBreakdown: { "Fruitvale": { qualityOfLifeIndex: 0.4 }, ... }
 * }
 *
 * NEIGHBORHOOD DYNAMICS (v2.6):
 * Uses getNeighborhoodDynamics_(ctx, neighborhood) if available, else falls back
 * to crimeMetrics.neighborhoodBreakdown.
 *
 * WEATHER v3.5 FIELDS:
 * - precipitationIntensity (0-1)
 * - visibility (0-1)
 * - windSpeed (mph)
 * - frontType ('cold_front', 'warm_front', 'atmospheric_river', 'none')
 *
 * v2.5 FEATURES (retained):
 * - citizenEventMemory in ctx.summary
 * - Template slots with local venues/institutions
 * - Attribute tags (ageGroup, occupation, tier, neighborhood)
 *
 * BACKWARD COMPATIBILITY:
 * - LifeHistory cell format unchanged: "[PrimaryTag] event text"
 * - EventTag column receives: "PrimaryTag|tagA|tagB|..."
 *
 * TARGET: Tier-3 and Tier-4 ENGINE citizens only
 * LIMIT: 10 events per cycle
 *
 * ============================================================================
 */
