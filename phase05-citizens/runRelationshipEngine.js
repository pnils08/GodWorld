/**
 * ============================================================================
 * Relationship Engine v2.3
 * ============================================================================
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

function runRelationshipEngine_(ctx) {

  var ss = ctx.ss;
  var ledger = ss.getSheetByName('Simulation_Ledger');
  var logSheet = ss.getSheetByName('LifeHistory_Log');
  if (!ledger) return;

  var values = ledger.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);

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
  if (holiday === "MLKDay") {
    holidayRels.push("discussed legacy and justice with someone");
    holidayRels.push("felt community bond during MLK observances");
  }
  if (holiday === "Easter") {
    holidayRels.push("gathered with family for Easter");
    holidayRels.push("exchanged greetings with neighbors on the holiday");
  }
  if (holiday === "MemorialDay" || holiday === "LaborDay") {
    holidayRels.push("enjoyed long weekend gatherings with friends");
    holidayRels.push("shared a barbecue with neighbors");
  }
  if (holiday === "Juneteenth") {
    holidayRels.push("celebrated Juneteenth with community");
    holidayRels.push("felt cultural pride connecting with others");
  }
  if (holiday === "Independence") {
    holidayRels.push("watched fireworks with friends");
    holidayRels.push("gathered for Fourth of July celebrations");
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
  if (holiday === "CincoDeMayo") {
    holidayRels.push("celebrated with friends at a Cinco de Mayo gathering");
    holidayRels.push("felt cultural bonds strengthen");
  }
  if (holiday === "DiaDeMuertos") {
    holidayRels.push("shared memories of loved ones with family");
    holidayRels.push("felt connected to ancestors and community");
  }
  if (holiday === "PrideMonth" || holiday === "OaklandPride") {
    holidayRels.push("celebrated pride with friends");
    holidayRels.push("felt community solidarity during pride");
  }
  if (holiday === "BlackHistoryMonth") {
    holidayRels.push("discussed heritage and history with friends");
    holidayRels.push("attended a cultural event with community");
  }

  // Oakland-specific
  if (holiday === "OpeningDay") {
    holidayRels.push("connected with fellow fans on Opening Day");
    holidayRels.push("shared baseball excitement with friends");
  }
  if (holiday === "ArtSoulFestival") {
    holidayRels.push("met new people at Art + Soul");
    holidayRels.push("reconnected with friends at the festival");
  }

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
  for (var r = 0; r < rows.length; r++) {

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

    // Cap drift chance
    if (driftChance > 0.15) driftChance = 0.15;

    // ═══════════════════════════════════════════════════════════════════════
    // TRIGGER SOCIAL DRIFT
    // ═══════════════════════════════════════════════════════════════════════
    if (Math.random() < driftChance) {

      // Build contextual pool
      var pool = interactionPool.slice();
      var eventTag = "Relationship";

      // Add bond-aware events based on citizen's bonds
      if (hasRivalry && Math.random() < 0.35) {
        pool = pool.concat(rivalryRels);
      }
      if (hasAlliance && Math.random() < 0.35) {
        pool = pool.concat(allianceRels);
      }
      if (hasMentorship && Math.random() < 0.30) {
        pool = pool.concat(mentorshipRels);
      }

      // Add Arc Events
      if (activeArc && Math.random() < 0.4) {
        pool = pool.concat(arcRels);
      }

      // Add Weather Events
      if (typeof getWeatherEvent_ === 'function' && Math.random() < 0.2) {
        var weatherEvent = getWeatherEvent_(ctx, false);
        if (weatherEvent) {
          pool.push(weatherEvent.text);
        }
      }

      // Add Weather Special Events During Heat Wave
      if (typeof hasWeatherCondition_ === 'function' && hasWeatherCondition_(ctx, 'heat_wave')) {
        if (ctx.summary.weatherEventPools && ctx.summary.weatherEventPools.special) {
          pool = pool.concat(ctx.summary.weatherEventPools.special);
        }
      }

      // Add Media-Influenced Events
      if (typeof getMediaInfluencedEvent_ === 'function' && Math.random() < 0.15) {
        var mediaEvent = getMediaInfluencedEvent_(ctx);
        if (mediaEvent) {
          pool.push(mediaEvent.text);
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PICK EVENT
      // ═══════════════════════════════════════════════════════════════════════
      var pick = pool[Math.floor(Math.random() * pool.length)];

      // Determine event tag based on which pool it came from
      if (rivalryRels.indexOf(pick) >= 0) {
        eventTag = "Rivalry";
      } else if (allianceRels.indexOf(pick) >= 0) {
        eventTag = "Alliance";
      } else if (mentorshipRels.indexOf(pick) >= 0) {
        eventTag = "Mentorship";
      } else if (arcRels.indexOf(pick) >= 0) {
        eventTag = "Arc";
      } else if (holidayRels.indexOf(pick) >= 0) {
        eventTag = "Holiday";
      } else if (firstFridayRels.indexOf(pick) >= 0) {
        eventTag = "FirstFriday";
      } else if (creationDayRels.indexOf(pick) >= 0) {
        eventTag = "CreationDay";
      } else if (culturalRels.indexOf(pick) >= 0) {
        eventTag = "Cultural";
      } else if (communityRels.indexOf(pick) >= 0) {
        eventTag = "Community";
      }

      // Check for Media Event Tag
      var mediaEffects = ctx.summary.mediaEffects;
      if (mediaEffects && mediaEffects.eventPools) {
        var allMediaEvents = [].concat(
          mediaEffects.eventPools.anxious || [],
          mediaEffects.eventPools.hopeful || [],
          mediaEffects.eventPools.crisis || [],
          mediaEffects.eventPools.celebrity || [],
          mediaEffects.eventPools.sports || []
        );
        if (allMediaEvents.indexOf(pick) >= 0) {
          eventTag = "Media";
        }
      }

      // Check for Weather Event Tag
      if (ctx.summary.weatherEventPools) {
        var allWeatherEvents = [].concat(
          ctx.summary.weatherEventPools.base || [],
          ctx.summary.weatherEventPools.enhanced || [],
          ctx.summary.weatherEventPools.special || []
        );
        if (allWeatherEvents.indexOf(pick) >= 0) {
          eventTag = "Weather";
        }
      }

      var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

      var existing = row[iLife] ? row[iLife].toString() : "";
      var line = stamp + " — [" + eventTag + "] " + pick;

      row[iLife] = existing ? existing + "\n" + line : line;
      row[iLastUpdated] = ctx.now;

      // Track active citizen for Bond Engine
      ctx.summary.cycleActiveCitizens.push(popId);

      // Log history
      if (logSheet) {
        logSheet.appendRow([
          ctx.now,
          row[iPopID],
          (row[iFirst] + " " + row[iLast]).trim(),
          eventTag,
          pick,
          "Engine",
          ctx.summary.cycleId || ctx.summary.absoluteCycle
        ]);
      }

      ctx.summary.eventsGenerated++;
      globalEvents++;
    }

    rows[r] = row;
  }

  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets all active bonds for a citizen.
 */
function getCitizenBonds_(ctx, citizenId) {
  var bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(function(b) {
    return b &&
      b.status === 'active' &&
      (b.citizenA === citizenId || b.citizenB === citizenId);
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