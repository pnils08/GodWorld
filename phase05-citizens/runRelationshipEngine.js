/**
 * ============================================================================
 * Relationship Engine v2.5
 * ============================================================================
 *
 * v2.5 (S204 B2 / 2026-05-06):
 * - LifeHistory_Log appendRow → queueAppendIntent_ (Phase 42 B2 mechanical migration).
 *   Mirrors S184 B0 runHouseholdEngine pattern. Single caller (godWorldEngine2
 *   Phase5-Relationships); ctx.ss / logSheet handle removed.
 *
 * Enhancements over v2.2:
 * - Holiday-specific relationship pools (30+ holidays)
 * - First Friday social boost and events
 * - Creation Day community effects
 * - Cultural activity and community engagement modifiers
 * - Holiday priority awareness
 * 
 * Previous features (v2.2):
 * - Media Feedback integration (getMediaInfluencedEvent_, getMediaEventModifier_)
 * - Weather Mood integration (getWeatherEventModifier_, getWeatherEvent_)
 * - Economic modifier integration (getEconomicEventModifier_)
 * - Arc involvement pool and tagging
 * 
 * Previous features (v2.1):
 * - Integrates with Bond system (checks for rivalries/alliances)
 * - Bond-aware event pools (tension events for rivals, warmth for allies)
 * - Tracks active citizens for Bond Engine
 * - Uses combined event boost from arcs/alliances
 * 
 * Calendar-aware, weather-aware, chaos-aware social drift generator.
 * Only affects Tier-3 and Tier-4 ENGINE-mode background citizens.
 * Excludes UNI, MED, CIV entirely.
 * Never creates partners or family — strictly minor relational changes.
 * 
 * ============================================================================
 */

// engine.350 Task 7 (builder 2026-11-16: a line moves a dial by what it says, down as often as up; 2026-11-18
// on the engines still writing a social line as up whatever it said: "we fixing all this"). Every line of
// the everyday pools was a bare Relationship: sociability +5, warmth +2, the size of a wedding — "felt distant
// from people around them" and "had a minor disagreement with someone they know" among them; on a holiday,
// a First Friday or Creation Day the same under a calendar suffix; the culture and community lines a bare
// Cultural (openness +4, out-and-about +3) or Community (sociability +4, warmth +2). Each line is listed
// here under the dial it moves and which way, read off the sentence, and written one step:
// <Kind>-<Dial>-<Up|Down>-S. A line listed plain says nothing the citizen did or felt toward anyone; it
// is drawn, counted and not written, so every other line keeps the odds it had. A line a sentence feels
// something in is signed by what is felt; one that only sees or hears the block is plain.
// The bond lines (Rivalry, Alliance, Mentorship, Arc) are about a bond the citizen holds and keep their kinds;
// engine.350 Task 15 (G-EC65): each is written the same way, under its own kind (BOND_SIGN_LINES_ below). They
// were a bare Rivalry (sociability +2, composure -3), Alliance (sociability +4), Mentorship (warmth +6, drive +2)
// or Arc (drive +4, openness +2) whatever the line said — "avoided someone they've had friction with" pushed
// sociability up.
var BOND_SIGN_LINES_ = {
  "composure:down": [
    "felt a flicker of tension thinking about a competitor", "noticed subtle friction with someone in their circle",
    "sensed unspoken rivalry in a social interaction", "overheard something that stirred old tensions",
    "felt the social weight of unfolding events"
  ],
  "sociability:down": ["avoided someone they've had friction with"],
  "sociability:up": ["coordinated briefly with an ally", "felt drawn into conversations about the ongoing situation"],
  "warmth:up": [
    "received support from a trusted connection", "exchanged knowing looks with an ally",
    "appreciated the loyalty of a close contact", "offered advice to someone newer in their circle"
  ],
  "composure:up": ["felt reassured by a solid friendship"],
  "drive:up": ["reflected on guidance from someone experienced", "felt responsibility toward someone looking up to them"],
  "openness:up": ["appreciated a learning moment from a mentor figure"],
  "plain": [
    "sensed relationships shifting due to larger circumstances",
    "noticed how current events affected their social circle"
  ]
};
var RELATIONSHIP_SIGN_LINES_ = {
  "sociability:up": [
    "reconnected with an old friend", "built a new casual acquaintance",
    "experienced renewed social energy", "connected with new people as spring began",
    "engaged in lively summer social interactions", "joined friends for evening hangouts",
    "reconnected with acquaintances during fall transition", "joined neighbors outside to cool off",
    "discussed recent city events with someone they knew", "felt more comfortable reaching out to others",
    "attended a cultural event with friends", "met someone new at a community gathering",
    "participated in a neighborhood activity", "helped organize something with neighbors",
    "celebrated the turning of the year with others", "exchanged greetings with neighbors on the holiday",
    "connected with neighbors during trick-or-treat", "attended a costume gathering",
    "wandered the First Friday art walk with friends", "met an artist at a gallery opening",
    "ran into acquaintances at First Friday", "made a new connection in the art district",
    "shared stories about the early days with neighbors", "connected with others over shared history"
  ],
  "sociability:down": [
    "felt distant from people around them", "limited social activity due to winter mood",
    "kept interactions brief during heavy fog", "cut short outdoor interactions due to wind",
    "kept social distance due to tense atmosphere"
  ],
  "warmth:up": [
    "spent time with a close friend", "shared a moment of support with a neighbor",
    "felt stronger connection to their block", "shared New Year hopes with a friend",
    "shared gratitude with family and friends", "exchanged gifts and well-wishes with loved ones",
    "felt holiday warmth in community interactions", "exchanged Valentine's greetings with someone special",
    "felt a deep sense of community belonging", "relied on familiar social circles during cold period",
    "felt romantic energy in social interactions"
  ],
  "warmth:down": ["had a minor disagreement with someone they know"],
  "family:up": [
    "gathered with family for Easter", "reconnected with relatives over the holiday",
    "honored family bonds on the holiday", "called a parent to express appreciation"
  ],
  "openness:up": ["felt energized by the city's creative buzz", "felt the creative community energy"],
  "outabout:down": ["stayed indoors and messaged friends remotely"],
  "plain": [
    "felt shift in social energy as routines returned", "felt social atmosphere shift due to today's happenings",
    "sensed something foundational in the air"
  ]
};
function relationshipSignIndex_(table) {
  var out = {};
  for (var sign in table) {
    if (!table.hasOwnProperty(sign)) continue;
    for (var i = 0; i < table[sign].length; i++) out[table[sign][i]] = sign === "plain" ? null : sign;
  }
  return out;
}
var RELATIONSHIP_SIGN_BY_TEXT_ = relationshipSignIndex_(RELATIONSHIP_SIGN_LINES_);
var BOND_SIGN_BY_TEXT_ = relationshipSignIndex_(BOND_SIGN_LINES_);
// The tag a social line is written under: <kind>-<Dial>-<Up|Down>-S, or '' (not written).
// why: 'plain' (listed, no sign) | 'unlisted' (no entry) — the counter key.
function relationshipLineTag_(kind, text) {
  var bond = kind === 'Rivalry' || kind === 'Alliance' || kind === 'Mentorship' || kind === 'Arc';
  var index = bond ? BOND_SIGN_BY_TEXT_ : RELATIONSHIP_SIGN_BY_TEXT_;
  if (!index.hasOwnProperty(text)) return { tag: '', why: 'unlisted' };
  var m = /^([a-z]+):(up|down)$/.exec(index[text] || '');
  if (!m) return { tag: '', why: 'plain' };
  return { tag: kind + '-' + m[1].charAt(0).toUpperCase() + m[1].slice(1) + '-' + (m[2] === 'up' ? 'Up' : 'Down') + '-S', why: '' };
}

function runRelationshipEngine_(ctx) {

  var rng = safeRand_(ctx);

  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  // LifeHistory_Log handle removed S204 B2 — appends route through queueAppendIntent_.
  if (!ctx.ledger) {
    throw new Error('runRelationshipEngine_: ctx.ledger not initialized');
  }
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;

  var idx = function(name) { return header.indexOf(name); };

  var iPopID = idx('POPID');
  var iTier = idx('Tier');
  var iClockMode = idx('ClockMode');
  var iUNI = idx('UNI (y/n)');
  var iMED = idx('MED (y/n)');
  var iCIV = idx('CIV (y/n)');
  var iLife = idx('LifeHistory');
  var iLastUpdated = idx('LastUpdated');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iNeighborhood = idx('Neighborhood');
  var iDialState = idx('DialState'); // engine.32 T5 — Sociability dial -> social-event frequency
  var iStatus = idx('Status'); // engine.67 step 3 (S325) — gone citizens don't socialize

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL GODWORLD STATE
  // ═══════════════════════════════════════════════════════════════════════════
  var season = ctx.summary.season;
  var holiday = ctx.summary.holiday || "none";
  var holidayPriority = ctx.summary.holidayPriority || "none";
  var holidayNeighborhood = ctx.summary.holidayNeighborhood || null;
  var isFirstFriday = ctx.summary.isFirstFriday || false;
  var isCreationDay = ctx.summary.isCreationDay || false;
  var weather = ctx.summary.weather || { type: "clear", impact: 1 };
  var dynamics = ctx.summary.cityDynamics || {
    traffic: 1, publicSpaces: 1, sentiment: 0,
    culturalActivity: 1, communityEngagement: 1
  };
  var chaos = ctx.summary.worldEvents || [];

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE TRACKING FOR BOND ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.summary.cycleActiveCitizens = ctx.summary.cycleActiveCitizens || [];

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT CAP
  // ═══════════════════════════════════════════════════════════════════════════
  var globalEvents = 0;
  var LIMIT = 8;

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var baseRels = [
    "reconnected with an old friend",
    "felt distant from people around them",
    "spent time with a close friend",
    "had a minor disagreement with someone they know",
    "shared a moment of support with a neighbor",
    "built a new casual acquaintance"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL SOCIAL BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════
  var seasonalRels = [];

  if (season === "Winter") {
    seasonalRels.push("limited social activity due to winter mood");
    seasonalRels.push("relied on familiar social circles during cold period");
  }

  if (season === "Spring") {
    seasonalRels.push("experienced renewed social energy");
    seasonalRels.push("connected with new people as spring began");
  }

  if (season === "Summer") {
    seasonalRels.push("engaged in lively summer social interactions");
    seasonalRels.push("joined friends for evening hangouts");
  }

  if (season === "Fall") {
    seasonalRels.push("felt shift in social energy as routines returned");
    seasonalRels.push("reconnected with acquaintances during fall transition");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER SOCIAL EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  var weatherRels = [];

  if (weather.type === "rain") {
    weatherRels.push("stayed indoors and messaged friends remotely");
  }
  if (weather.type === "fog") {
    weatherRels.push("kept interactions brief during heavy fog");
  }
  if (weather.type === "hot") {
    weatherRels.push("joined neighbors outside to cool off");
  }
  if (weather.type === "wind") {
    weatherRels.push("cut short outdoor interactions due to wind");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS SOCIAL EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  var chaosRels = chaos.length > 0 ? [
    "discussed recent city events with someone they knew",
    "felt social atmosphere shift due to today's happenings"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC SENTIMENT EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  var sentimentRels = [];

  if (dynamics.sentiment >= 0.4) {
    sentimentRels.push("felt more comfortable reaching out to others");
  }
  if (dynamics.sentiment <= -0.4) {
    sentimentRels.push("kept social distance due to tense atmosphere");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EFFECTS (NEW v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var culturalRels = [];

  if (dynamics.culturalActivity >= 1.4) {
    culturalRels.push("attended a cultural event with friends");
    culturalRels.push("met someone new at a community gathering");
    culturalRels.push("felt energized by the city's creative buzz");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EFFECTS (NEW v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var communityRels = [];

  if (dynamics.communityEngagement >= 1.3) {
    communityRels.push("participated in a neighborhood activity");
    communityRels.push("felt stronger connection to their block");
    communityRels.push("helped organize something with neighbors");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY SOCIAL EFFECTS (NEW v2.3 - 30+ holidays)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayRels = [];

  // Major holidays
  if (holiday === "NewYear" || holiday === "NewYearsEve") {
    holidayRels.push("shared New Year hopes with a friend");
    holidayRels.push("celebrated the turning of the year with others");
  }
  if (holiday === "Easter") {
    holidayRels.push("gathered with family for Easter");
    holidayRels.push("exchanged greetings with neighbors on the holiday");
  }
  if (holiday === "Halloween") {
    holidayRels.push("connected with neighbors during trick-or-treat");
    holidayRels.push("attended a costume gathering");
  }
  if (holiday === "Thanksgiving") {
    holidayRels.push("shared gratitude with family and friends");
    holidayRels.push("reconnected with relatives over the holiday");
  }
  if (holiday === "Holiday") {  // Christmas
    holidayRels.push("exchanged gifts and well-wishes with loved ones");
    holidayRels.push("felt holiday warmth in community interactions");
  }

  // Cultural holidays

  // Oakland-specific

  // Minor holidays
  if (holiday === "Valentine") {
    holidayRels.push("exchanged Valentine's greetings with someone special");
    holidayRels.push("felt romantic energy in social interactions");
  }
  if (holiday === "MothersDay" || holiday === "FathersDay") {
    holidayRels.push("honored family bonds on the holiday");
    holidayRels.push("called a parent to express appreciation");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY EVENTS (NEW v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var firstFridayRels = isFirstFriday ? [
    "wandered the First Friday art walk with friends",
    "met an artist at a gallery opening",
    "ran into acquaintances at First Friday",
    "felt the creative community energy",
    "made a new connection in the art district"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY EVENTS (NEW v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  var creationDayRels = isCreationDay ? [
    "felt a deep sense of community belonging",
    "shared stories about the early days with neighbors",
    "sensed something foundational in the air",
    "connected with others over shared history"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // BOND-AWARE EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  var rivalryRels = [
    "felt a flicker of tension thinking about a competitor",
    "noticed subtle friction with someone in their circle",
    "sensed unspoken rivalry in a social interaction",
    "overheard something that stirred old tensions",
    "avoided someone they've had friction with"
  ];

  var allianceRels = [
    "received support from a trusted connection",
    "coordinated briefly with an ally",
    "felt reassured by a solid friendship",
    "exchanged knowing looks with an ally",
    "appreciated the loyalty of a close contact"
  ];

  var mentorshipRels = [
    "reflected on guidance from someone experienced",
    "offered advice to someone newer in their circle",
    "appreciated a learning moment from a mentor figure",
    "felt responsibility toward someone looking up to them"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ARC INVOLVEMENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var arcRels = [
    "felt the social weight of unfolding events",
    "sensed relationships shifting due to larger circumstances",
    "noticed how current events affected their social circle",
    "felt drawn into conversations about the ongoing situation"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIFIED INTERACTION POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var basePool = [].concat(
    baseRels,
    seasonalRels,
    weatherRels,
    chaosRels,
    sentimentRels,
    culturalRels,
    communityRels,
    holidayRels,
    firstFridayRels,
    creationDayRels
  );

  // Ensure non-empty pool
  var interactionPool = basePool.length > 0 ? basePool : baseRels;

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE THROUGH CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  // engine.350 Task 15 (G-EC65): the walk starts at a row drawn once a Cycle and wraps. It started at row 0
  // and stopped at LIMIT lines written, so the citizens at the top of the ledger drew this engine's lines.
  var relStart = Math.floor(rng() * rows.length);
  for (var relStep = 0; relStep < rows.length; relStep++) {
    var r = (relStart + relStep) % rows.length;

    if (globalEvents >= LIMIT) break;

    var row = rows[r];
    var popId = row[iPopID];
    var neighborhood = iNeighborhood >= 0 ? row[iNeighborhood] : '';

    var tier = Number(row[iTier] || 0);
    var mode = row[iClockMode] || "ENGINE";
    var isUNI = (row[iUNI] || "").toString().toLowerCase() === "yes";
    var isMED = (row[iMED] || "").toString().toLowerCase() === "yes";
    var isCIV = (row[iCIV] || "").toString().toLowerCase() === "yes";

    // Only Tier-3/4 background citizens
    if (tier !== 3 && tier !== 4) continue;
    if (mode !== "ENGINE") continue;
    if (isUNI || isMED || isCIV) continue;
    // engine.67 step 3 (S325 matrix): this engine had NO Status filter, and it
    // feeds S.cycleActiveCitizens — bondEngine's formation pool — so deceased/
    // traded citizens could keep socializing AND keep forming bonds. The gone
    // draw no social drift and never enter the bond pool. (Hospitalized stay:
    // people visit; bondEngine handles its own romance gates.)
    if (iStatus >= 0) {
      var relStatus = (row[iStatus] || "").toString().trim().toLowerCase();
      if (relStatus === "deceased" || relStatus === "inactive" || relStatus === "traded" || relStatus === "pending") continue;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT PROBABILITY
    // ═══════════════════════════════════════════════════════════════════════
    var driftChance = 0.02; // base chance

    // Seasonal adjustments
    if (season === "Winter") driftChance += 0.005;
    if (season === "Spring") driftChance += 0.010;
    if (season === "Summer") driftChance += 0.015;
    if (season === "Fall") driftChance += 0.008;

    // Weather adjustments
    if (weather.type === "rain") driftChance += 0.005;
    if (weather.type === "fog") driftChance += 0.007;
    if (weather.type === "hot") driftChance += 0.005;

    // City sentiment
    if (dynamics.sentiment >= 0.4) driftChance += 0.005;
    if (dynamics.sentiment <= -0.4) driftChance += 0.010;

    // Cultural activity boost (NEW v2.3)
    if (dynamics.culturalActivity >= 1.4) driftChance += 0.01;

    // Community engagement boost (NEW v2.3)
    if (dynamics.communityEngagement >= 1.3) driftChance += 0.008;

    // Chaos-driven social conversation
    if (chaos.length > 0) driftChance += 0.015;

    // Holiday priority boost (NEW v2.3)
    if (holidayPriority === "major") driftChance += 0.015;
    else if (holidayPriority === "cultural") driftChance += 0.012;
    else if (holidayPriority === "oakland") driftChance += 0.01;
    else if (holidayPriority === "minor") driftChance += 0.005;

    // First Friday boost (NEW v2.3)
    if (isFirstFriday) driftChance += 0.015;

    // Creation Day boost (NEW v2.3)
    if (isCreationDay) driftChance += 0.012;

    // Neighborhood-specific holiday boost (NEW v2.3)
    if (holidayNeighborhood && neighborhood === holidayNeighborhood) {
      driftChance += 0.02;  // Extra boost if in the holiday's focal neighborhood
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BOND & ARC BOOST
    // ═══════════════════════════════════════════════════════════════════════
    var eventBoost = getCombinedEventBoost_(ctx, popId);
    driftChance *= eventBoost;

    // Check for active bonds
    var citizenBonds = getCitizenBonds_(ctx, popId);
    var hasRivalry = citizenBonds.some(function(b) { return b.bondType === 'rivalry'; });
    var hasAlliance = citizenBonds.some(function(b) { return b.bondType === 'alliance'; });
    var hasMentorship = citizenBonds.some(function(b) { return b.bondType === 'mentorship'; });

    // Rivalry increases social event chance (drama)
    if (hasRivalry) driftChance += 0.015;

    // Arc Involvement Check
    var activeArc = citizenInActiveArc_(ctx, popId);
    if (activeArc) {
      var arcPhaseBoost = {
        'early': 0.005,
        'mid': 0.01,
        'peak': 0.02,
        'decline': 0.008
      };
      driftChance += arcPhaseBoost[activeArc.phase] || 0.005;
    }

    // Weather Mood Modifier
    if (typeof getWeatherEventModifier_ === 'function') {
      var weatherMod = getWeatherEventModifier_(ctx, 'social');
      driftChance *= weatherMod;
    }

    // Economic Modifier
    if (typeof getEconomicEventModifier_ === 'function') {
      var econMod = getEconomicEventModifier_(ctx, 'social');
      driftChance *= econMod;
    }

    // Media Modifier
    if (typeof getMediaEventModifier_ === 'function') {
      var mediaMod = getMediaEventModifier_(ctx, 'social');
      driftChance *= mediaMod;
    }

    // Heat Wave Boost
    if (typeof hasWeatherCondition_ === 'function' && hasWeatherCondition_(ctx, 'heat_wave')) {
      driftChance += 0.01;
    }

    // engine.32 T5 — Sociability dial scales social-event frequency (0.5..1.5).
    // null bands (no DialState) -> base rates unchanged.
    var dialBands = getCitizenDialBands_(ctx, popId, iDialState >= 0 ? (row[iDialState] || "") : "");
    if (dialBands) driftChance *= dialBands.mult.sociability;

    // Cap drift chance
    if (driftChance > 0.15) driftChance = 0.15;

    // ═══════════════════════════════════════════════════════════════════════
    // TRIGGER SOCIAL DRIFT
    // ═══════════════════════════════════════════════════════════════════════
    if (rng() < driftChance) {

      // Build contextual pool
      var pool = interactionPool.slice();
      var eventTag = "Relationship";

      // Add bond-aware events based on citizen's bonds
      if (hasRivalry && rng() < 0.35) {
        pool = pool.concat(rivalryRels);
      }
      if (hasAlliance && rng() < 0.35) {
        pool = pool.concat(allianceRels);
      }
      if (hasMentorship && rng() < 0.30) {
        pool = pool.concat(mentorshipRels);
      }

      // Add Arc Events
      if (activeArc && rng() < 0.4) {
        pool = pool.concat(arcRels);
      }

      // engine.350 (agy 2026-11-18): this engine used to take a weather line (getWeatherEvent_, and every
      // heat-wave special), and a media line (getMediaInfluencedEvent_) into its pool and write them as social
      // lines — "walked through drizzle" as a bare Relationship (sociability +5), a news-climate line as a bare
      // Media. Neither is a social line and neither is in the list above; the weather and the news reach a
      // citizen through the engines that own them (the generator's weather and media pools, each line signed).

      // ═══════════════════════════════════════════════════════════════════════
      // PICK EVENT
      // ═══════════════════════════════════════════════════════════════════════
      var pick = pool[Math.floor(rng() * pool.length)];

      // Determine event tag based on which pool it came from
      // engine.350: a social line is written under the dial it names, one step. The bond, culture and community
      // lines keep their kinds (Task 15: the bond kinds too); a holiday, First Friday or Creation Day line is a
      // Relationship line (the calendar suffixes were bare Relationship: +5 / +2 whatever the line said). A plain
      // line is drawn, counted in S.engine299.noDialBySource and not written — every other line keeps the odds
      // it had. It does not count against the cap (the cap is on lines written, as in the household engine). The
      // citizen still counts as out among people this Cycle (the bond engine's pool), as before.
      {
        var relKind = rivalryRels.indexOf(pick) >= 0 ? "Rivalry"
          : allianceRels.indexOf(pick) >= 0 ? "Alliance"
          : mentorshipRels.indexOf(pick) >= 0 ? "Mentorship"
          : arcRels.indexOf(pick) >= 0 ? "Arc"
          : culturalRels.indexOf(pick) >= 0 ? "Cultural"
          : communityRels.indexOf(pick) >= 0 ? "Community" : "Relationship";
        var relSigned = relationshipLineTag_(relKind, pick);
        if (!relSigned.tag) {
          ctx.summary.engine299 = ctx.summary.engine299 || { noDial: 0, noDialBySource: {} };
          ctx.summary.engine299.noDial++;
          var relKey = 'runRelationshipEngine:' + relKind + ':' + relSigned.why;
          ctx.summary.engine299.noDialBySource[relKey] = (ctx.summary.engine299.noDialBySource[relKey] || 0) + 1;
          ctx.summary.cycleActiveCitizens.push(popId);
          continue;
        }
        eventTag = relSigned.tag;
      }

      var stamp = inWorldStamp_(ctx);

      var existing = row[iLife] ? row[iLife].toString() : "";
      var line = stamp + " — [" + eventTag + "] " + pick;

      row[iLife] = existing ? existing + "\n" + line : line;
      row[iLastUpdated] = ctx.now;

      // Track active citizen for Bond Engine
      ctx.summary.cycleActiveCitizens.push(popId);

      // Log history
      queueAppendIntent_(
        ctx,
        'LifeHistory_Log',
        [
          ctx.now,
          row[iPopID],
          ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
          eventTag,
          pick,
          neighborhood,
          ctx.summary.cycleId || ctx.summary.absoluteCycle
        ],
        'relationship event',
        'citizens'
      );

      ctx.summary.eventsGenerated++;
      globalEvents++;
    }

    rows[r] = row;
  }

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  ctx.ledger.dirty = true;
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets all active bonds for a citizen.
 */
function getCitizenBonds_(ctx, citizenId) {
  var bonds = ctx.summary.relationshipBonds || [];
  var normalized = String(citizenId || '').trim().toUpperCase();
  return bonds.filter(function(b) {
    return b &&
      b.status === 'active' &&
      (String(b.citizenA || '').trim().toUpperCase() === normalized || String(b.citizenB || '').trim().toUpperCase() === normalized);
  });
}

/**
 * Gets combined event probability boost from arc involvement and alliances.
 */
function getCombinedEventBoost_(ctx, citizenId) {
  // Arc boost
  var arcBoost = 1.0;
  var arc = citizenInActiveArc_(ctx, citizenId);
  if (arc) {
    var phaseBoosts = {
      'early': 1.2,
      'mid': 1.5,
      'peak': 2.0,
      'decline': 1.3,
      'resolved': 1.0
    };
    arcBoost = phaseBoosts[arc.phase] || 1.0;
  }

  // Alliance boost
  var allianceBenefits = ctx.summary.allianceBenefits || {};
  var allianceData = allianceBenefits[citizenId];
  var allianceBoost = (allianceData && allianceData.boost) ? allianceData.boost : 1.0;

  // Multiply boosts, cap at 3.0
  return Math.min(arcBoost * allianceBoost, 3.0);
}

/**
 * Check if citizen is in any active arc.
 */
function citizenInActiveArc_(ctx, citizenId) {
  var arcs = (ctx.summary && ctx.summary.eventArcs) ? ctx.summary.eventArcs : [];

  for (var i = 0; i < arcs.length; i++) {
    var arc = arcs[i];
    if (!arc || arc.phase === 'resolved') continue;
    var involvedCitizens = arc.involvedCitizens || [];
    var found = involvedCitizens.some(function(c) { return c.id === citizenId; });
    if (found) {
      return arc;
    }
  }

  return null;
}


/**
 * ============================================================================
 * EVENT TAG REFERENCE
 * ============================================================================
 * 
 * Tag          | Source
 * ─────────────────────────────────────────────────────────────────────────
 * Relationship | Base social events
 * Rivalry      | Bond-based tension
 * Alliance     | Bond-based support
 * Mentorship   | Bond-based guidance
 * Arc          | Story arc involvement
 * Holiday      | Holiday-specific events (NEW v2.3)
 * FirstFriday  | Monthly art walk events (NEW v2.3)
 * CreationDay  | GodWorld founding events (NEW v2.3)
 * Cultural     | Cultural activity events (NEW v2.3)
 * Community    | Community engagement events (NEW v2.3)
 * Media        | Media-influenced events
 * Weather      | Weather-specific events
 * 
 * ============================================================================
 */