/**
 * ============================================================================
 * applyNamedCitizenSpotlights_ v2.3
 * ============================================================================
 *
 * Identifies Named citizens who gained meaningful cycle-level
 * narrative "spotlight" significance with GodWorld Calendar awareness.
 *
 * v2.3 Fixes:
 * - Arc involvement check fixed: handles objects {id, role, cycleJoined}
 * - Removed non-existent "mid" phase, added "decline" handling
 * - Score inflation fix: cycle-level signals apply ONCE per pid
 * - Neighborhood selection: picks most frequent, not first-seen
 * - Full ES5 compatibility
 *
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods
 * - Holiday spotlight boost (citizens in events during holidays)
 * - First Friday cultural spotlight
 * - Creation Day community spotlight
 * - Sports season relevance for sports-related events
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Uses:
 * - event frequency
 * - severity
 * - event type importance
 * - chaos influence
 * - sentiment & civic load
 * - economic mood
 * - weather mood
 * - arc involvement
 * - pattern / shock flags
 * - Oakland neighborhoods (12)
 * - holiday context (v2.2)
 * - calendar signals (v2.2)
 *
 * Output stored in:
 * ctx.summary.namedSpotlights = [ { popId, name, score, neighborhood, reasons } ]
 *
 * ============================================================================
 */

function applyNamedCitizenSpotlights_(ctx) {

  var S = ctx.summary;
  if (!S || !S.engineEvents) return;
  if (!ctx.namedCitizenMap) return;

  var events = S.engineEvents;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var sentiment = dynamics.sentiment || 0;
  var civicLoad = S.civicLoad || "";
  var pattern = S.patternFlag || "";
  var shock = S.shockFlag || "";
  var econMood = S.economicMood || 50;
  var weatherMood = S.weatherMood || {};
  var activeArcs = S.eventArcs || [];

  // Calendar context (v2.2)
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var holidayNeighborhood = S.holidayNeighborhood || "";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  var scores = {}; // popId → numeric score
  var reasons = {}; // popId → array of reason tags
  var neighborhoods = {}; // popId → neighborhood (final, picked at end)
  var nhCounts = {}; // popId → { nh: count } (v2.3: track all neighborhoods)
  var appliedCycleSignals = {}; // popId → { signalKey: true } (v2.3: prevent inflation)

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  function addReason(pid, msg) {
    if (!reasons[pid]) reasons[pid] = [];
    if (reasons[pid].indexOf(msg) === -1) {
      reasons[pid].push(msg);
    }
  }

  // v2.3: Apply cycle-level signal only once per pid
  function applyOnce(pid, key, points, reasonTag) {
    if (!appliedCycleSignals[pid]) appliedCycleSignals[pid] = {};
    if (appliedCycleSignals[pid][key]) return;
    appliedCycleSignals[pid][key] = true;
    scores[pid] += points;
    if (reasonTag) addReason(pid, reasonTag);
  }

  // v2.3: Track neighborhood counts
  function noteNeighborhood(pid, nh) {
    if (!nh) return;
    if (!nhCounts[pid]) nhCounts[pid] = {};
    nhCounts[pid][nh] = (nhCounts[pid][nh] || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT DOMAIN PRIORITY (both cases)
  // ═══════════════════════════════════════════════════════════════════════════
  var domainWeight = {
    // Uppercase
    "HEALTH": 6,
    "CIVIC": 6,
    "SAFETY": 6,
    "ECONOMIC": 5,
    "INFRASTRUCTURE": 4,
    "ENVIRONMENT": 3,
    "CULTURE": 3,
    "COMMUNITY": 3,
    "SPORTS": 3,
    "HOUSEHOLD": 2,
    "MICRO": 1,
    // Lowercase
    "health": 6,
    "civic": 6,
    "safety": 6,
    "economic": 5,
    "infrastructure": 4,
    "crime": 5,
    "environment": 3,
    "culture": 3,
    "community": 3,
    "sports": 3,
    "household": 2,
    "micro": 1
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SEVERITY WEIGHT
  // ═══════════════════════════════════════════════════════════════════════════
  var severityWeight = {
    "high": 6,
    "major": 6,
    "critical": 8,
    "medium": 3,
    "moderate": 3,
    "low": 1
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD SPOTLIGHT BONUS (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodBonus = {
    'Downtown': 2,
    'West Oakland': 1.5,
    'Jack London': 1.5,
    'Uptown': 1.5,
    'Fruitvale': 1,
    'Chinatown': 1,
    'Temescal': 1,
    'KONO': 1,
    'Lake Merritt': 0.5,
    'Rockridge': 0.5,
    'Piedmont Ave': 0,
    'Laurel': 0
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY-DOMAIN SPOTLIGHT BOOST (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayDomainBoost = {
    "MLKDay": { civic: 3, community: 2 },
    "Juneteenth": { civic: 2, community: 3, culture: 3 },
    "Independence": { civic: 2, community: 2 },
    "Thanksgiving": { community: 3 },
    "Holiday": { community: 2, economic: 2 },
    "NewYear": { civic: 2 },
    "OpeningDay": { sports: 4, community: 2 },
    "OaklandPride": { culture: 4, community: 3 },
    "DiaDeMuertos": { culture: 4, community: 2 },
    "CincoDeMayo": { culture: 3, community: 2 },
    "BlackHistoryMonth": { culture: 3, community: 2 },
    "PrideMonth": { culture: 3, community: 3 },
    "EarthDay": { environment: 3, community: 2 }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ARC INVOLVEMENT CHECK (v2.3: fixed for object-based involvedCitizens)
  // ═══════════════════════════════════════════════════════════════════════════
  function getArcBonus(pid) {
    for (var ai = 0; ai < activeArcs.length; ai++) {
      var arc = activeArcs[ai];
      var list = (arc && arc.involvedCitizens) ? arc.involvedCitizens : [];

      // Check if pid is in the list (handles both string and object formats)
      var inArc = false;
      for (var ci = 0; ci < list.length; ci++) {
        var c = list[ci];
        if (c && (c === pid || c.id === pid || c.popId === pid)) {
          inArc = true;
          break;
        }
      }

      if (inArc) {
        if (arc.phase === 'peak') return { bonus: 5, reason: 'arc-peak' };
        if (arc.phase === 'rising') return { bonus: 3, reason: 'arc-active' };
        if (arc.phase === 'early') return { bonus: 1, reason: 'arc-emerging' };
        if (arc.phase === 'decline') return { bonus: 2, reason: 'arc-decline' };
      }
    }
    return { bonus: 0, reason: null };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD SCORING PER NAMED CITIZEN
  // ═══════════════════════════════════════════════════════════════════════════
  for (var ei = 0; ei < events.length; ei++) {
    var ev = events[ei];

    var pid = ev.popId;
    if (!pid) continue;
    if (!ctx.namedCitizenMap[pid]) continue; // only Named citizens

    if (!scores[pid]) scores[pid] = 0;

    var evType = ev.type || ev.domain || '';
    var evTypeLower = evType.toLowerCase();
    var evSeverity = (ev.severity || '').toString().toLowerCase();
    var evTag = (ev.tag || '').toString().toLowerCase();
    var neighborhood = ev.neighborhood || ev.location || '';

    // Track neighborhood (v2.3: count all occurrences)
    noteNeighborhood(pid, neighborhood);

    // ═══════════════════════════════════════════════════════════════════════
    // DOMAIN WEIGHT (per-event, correct)
    // ═══════════════════════════════════════════════════════════════════════
    var dw = domainWeight[evType] || domainWeight[evTypeLower] || 1;
    scores[pid] += dw;
    addReason(pid, "domain:" + evTypeLower);

    // ═══════════════════════════════════════════════════════════════════════
    // SEVERITY WEIGHT (per-event, correct)
    // ═══════════════════════════════════════════════════════════════════════
    var sw = severityWeight[evSeverity] || 1;
    scores[pid] += sw;
    if (evSeverity && evSeverity !== 'low') {
      addReason(pid, "severity:" + evSeverity);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NEIGHBORHOOD BONUS (per-event, correct)
    // ═══════════════════════════════════════════════════════════════════════
    var nb = neighborhoodBonus[neighborhood] || 0;
    if (nb > 0) {
      scores[pid] += nb;
      addReason(pid, "spotlight:" + neighborhood);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CYCLE-LEVEL SIGNALS (v2.3: apply ONCE per pid)
    // ═══════════════════════════════════════════════════════════════════════
    if (chaos.length > 0) {
      applyOnce(pid, "chaos", 2, "chaos-cycle");
    }

    if (sentiment <= -0.3) {
      applyOnce(pid, "tension", 2, "public-tension");
    }
    if (sentiment >= 0.3) {
      applyOnce(pid, "lift", 1, "public-lift");
    }

    if (civicLoad === "load-strain" && evTypeLower === "civic") {
      scores[pid] += 3; // This IS event-specific (civic event during strain)
      addReason(pid, "civic-strain");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ECONOMIC MOOD INFLUENCE (v2.3: cycle signal once, event-specific separate)
    // ═══════════════════════════════════════════════════════════════════════
    if (econMood <= 35 && evTypeLower === "economic") {
      scores[pid] += 2; // Event-specific: economic event during stress
      addReason(pid, "economic-stress");
    }
    if (econMood >= 65) {
      applyOnce(pid, "econBoom", 1, "economic-boom");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WEATHER MOOD INFLUENCE (per-event, correct - tied to event context)
    // ═══════════════════════════════════════════════════════════════════════
    if (weatherMood.conflictPotential && weatherMood.conflictPotential > 0.3) {
      applyOnce(pid, "weatherTension", 1, "weather-tension");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PATTERN/SHOCK EMPHASIS (v2.3: cycle signals apply once)
    // ═══════════════════════════════════════════════════════════════════════
    if (pattern === "micro-event-wave") {
      applyOnce(pid, "microWave", 1, "micro-wave");
    }
    if (pattern === "strain-trend") {
      applyOnce(pid, "strainTrend", 2, "strain-trend");
    }
    if (shock && shock !== "none") {
      applyOnce(pid, "shock", 4, "shock-cycle");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOLIDAY SPOTLIGHT BOOST (v2.2) - event-specific boosts stay per-event
    // ═══════════════════════════════════════════════════════════════════════
    if (holiday !== "none") {
      // Holiday-domain affinity boost (event-specific)
      if (holidayDomainBoost[holiday] && holidayDomainBoost[holiday][evTypeLower]) {
        var hBoost = holidayDomainBoost[holiday][evTypeLower];
        scores[pid] += hBoost;
        addReason(pid, "holiday:" + holiday);
      }

      // Holiday priority general boost (cycle-level, once)
      if (holidayPriority === "major") {
        applyOnce(pid, "majorHoliday", 2, "major-holiday");
      } else if (holidayPriority === "oakland") {
        applyOnce(pid, "oaklandHoliday", 2, "oakland-holiday");
      } else if (holidayPriority === "cultural") {
        applyOnce(pid, "culturalHoliday", 1, "cultural-holiday");
      }

      // Holiday neighborhood spotlight boost (event-specific)
      if (holidayNeighborhood && neighborhood === holidayNeighborhood) {
        scores[pid] += 3;
        addReason(pid, "holiday-neighborhood:" + neighborhood);
      }

      // Holiday-tagged event boost (event-specific)
      if (evTag.indexOf("holiday") !== -1) {
        scores[pid] += 2;
        addReason(pid, "holiday-event");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FIRST FRIDAY SPOTLIGHT BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (isFirstFriday) {
      if (evTypeLower === "culture") {
        scores[pid] += 3; // Event-specific
        addReason(pid, "first-friday-culture");
      }
      if (evTypeLower === "community") {
        scores[pid] += 2; // Event-specific
        addReason(pid, "first-friday-community");
      }
      if (evTag.indexOf("firstfriday") !== -1) {
        scores[pid] += 2; // Event-specific
        addReason(pid, "first-friday-event");
      }
      // First Friday neighborhoods (event-specific)
      if (neighborhood === "Uptown" || neighborhood === "KONO" ||
          neighborhood === "Temescal" || neighborhood === "Jack London") {
        scores[pid] += 2;
        addReason(pid, "first-friday-neighborhood");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CREATION DAY SPOTLIGHT BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (isCreationDay) {
      if (evTypeLower === "community") {
        scores[pid] += 3; // Event-specific
        addReason(pid, "creation-day-community");
      }
      if (evTypeLower === "civic") {
        scores[pid] += 2; // Event-specific
        addReason(pid, "creation-day-civic");
      }
      if (evTag.indexOf("creationday") !== -1) {
        scores[pid] += 2; // Event-specific
        addReason(pid, "creation-day-event");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SPORTS SEASON SPOTLIGHT BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (evTypeLower === "sports") {
      if (sportsSeason === "championship") {
        scores[pid] += 5; // Event-specific (sports event during championship)
        addReason(pid, "championship");
      } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
        scores[pid] += 3;
        addReason(pid, "playoffs");
      } else if (sportsSeason === "late-season") {
        scores[pid] += 1;
        addReason(pid, "late-season");
      }
      // Opening Day
      if (holiday === "OpeningDay") {
        scores[pid] += 3;
        addReason(pid, "opening-day");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CULTURAL ACTIVITY BOOST (v2.2) - event-specific
    // ═══════════════════════════════════════════════════════════════════════
    if (dynamics.culturalActivity >= 1.4 && evTypeLower === "culture") {
      scores[pid] += 2;
      addReason(pid, "cultural-surge");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COMMUNITY ENGAGEMENT BOOST (v2.2) - event-specific
    // ═══════════════════════════════════════════════════════════════════════
    if (dynamics.communityEngagement >= 1.3 && evTypeLower === "community") {
      scores[pid] += 2;
      addReason(pid, "community-surge");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD ARC INVOLVEMENT BONUSES
  // ═══════════════════════════════════════════════════════════════════════════
  for (var pid in scores) {
    if (scores.hasOwnProperty(pid)) {
      var arcInfo = getArcBonus(pid);
      if (arcInfo.bonus > 0) {
        scores[pid] += arcInfo.bonus;
        addReason(pid, arcInfo.reason);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOLVE NEIGHBORHOODS (v2.3: pick most frequent)
  // ═══════════════════════════════════════════════════════════════════════════
  for (var pid in nhCounts) {
    if (nhCounts.hasOwnProperty(pid)) {
      var counts = nhCounts[pid];
      var bestNh = '';
      var bestCount = 0;
      for (var nh in counts) {
        if (counts.hasOwnProperty(nh) && counts[nh] > bestCount) {
          bestCount = counts[nh];
          bestNh = nh;
        }
      }
      neighborhoods[pid] = bestNh;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THRESHOLD LOGIC (WORLD-AWARE + CALENDAR-AWARE)
  // ═══════════════════════════════════════════════════════════════════════════
  var baseThreshold = 6;

  // World factors
  if (chaos.length > 0) baseThreshold -= 1;
  if (shock && shock !== "none") baseThreshold -= 2;
  if (econMood <= 35) baseThreshold -= 1;

  // Calendar factors (v2.2) - lower threshold during special events
  if (holidayPriority === "major" || holidayPriority === "oakland") {
    baseThreshold -= 1;
  }
  if (isFirstFriday) baseThreshold -= 0.5;
  if (isCreationDay) baseThreshold -= 0.5;
  if (sportsSeason === "championship") baseThreshold -= 1;

  // Safety minimum
  if (baseThreshold < 3) baseThreshold = 3;

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD SPOTLIGHT LIST
  // ═══════════════════════════════════════════════════════════════════════════
  var result = [];

  for (var pid in scores) {
    if (scores.hasOwnProperty(pid)) {
      var score = scores[pid];
      if (score >= baseThreshold) {
        var citizenData = ctx.namedCitizenMap[pid] || {};
        result.push({
          popId: pid,
          name: citizenData.name || pid,
          score: score,
          neighborhood: neighborhoods[pid] || citizenData.neighborhood || '',
          reasons: reasons[pid] || []
        });
      }
    }
  }

  // Sort by score descending
  result.sort(function(a, b) { return b.score - a.score; });

  // Store in summary
  S.namedSpotlights = result;

  // Add summary stats
  S.spotlightStats = {
    total: result.length,
    topScore: result.length > 0 ? result[0].score : 0,
    threshold: baseThreshold,
    // v2.2: Calendar context
    calendarContext: {
      holiday: holiday,
      holidayPriority: holidayPriority,
      isFirstFriday: isFirstFriday,
      isCreationDay: isCreationDay,
      sportsSeason: sportsSeason
    }
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * NAMED CITIZEN SPOTLIGHT REFERENCE
 * ============================================================================
 *
 * Scoring Factors:
 * - Domain weight: civic/health/safety (6), economic (5), etc.
 * - Severity weight: critical (8), high/major (6), medium (3)
 * - Neighborhood bonus: Downtown (2), West Oakland/Jack London/Uptown (1.5), etc.
 * - Chaos cycle: +2 (once per pid)
 * - Public tension: +2 (once per pid, negative sentiment)
 * - Civic strain: +3 (per civic event during strain)
 * - Economic stress: +2 (per economic event during stress)
 * - Shock cycle: +4 (once per pid)
 * - Arc involvement: peak (5), active (3), decline (2), emerging (1)
 *
 * Calendar Boosts (v2.2):
 * - Major/Oakland holiday: +2 (once per pid)
 * - Cultural holiday: +1 (once per pid)
 * - Holiday neighborhood match: +3 (per event)
 * - Holiday-tagged event: +2 (per event)
 * - First Friday culture: +3 (per event)
 * - First Friday community: +2 (per event)
 * - First Friday neighborhoods: +2 (per event)
 * - Creation Day community: +3 (per event)
 * - Creation Day civic: +2 (per event)
 * - Championship sports: +5 (per sports event)
 * - Playoffs sports: +3 (per sports event)
 * - Opening Day sports: +3 (per sports event)
 * - Cultural surge: +2 (per culture event)
 * - Community surge: +2 (per community event)
 *
 * Holiday-Domain Affinity:
 * - MLKDay → civic +3, community +2
 * - OpeningDay → sports +4, community +2
 * - OaklandPride → culture +4, community +3
 * - etc.
 *
 * Threshold Adjustments (v2.2):
 * - Base: 6
 * - Chaos: -1
 * - Shock: -2
 * - Economic stress: -1
 * - Major/Oakland holiday: -1
 * - First Friday: -0.5
 * - Creation Day: -0.5
 * - Championship: -1
 * - Minimum: 3
 *
 * Neighborhood Bonus (12 total):
 * - Downtown: 2
 * - West Oakland/Jack London/Uptown: 1.5
 * - Fruitvale/Chinatown/Temescal/KONO: 1
 * - Lake Merritt/Rockridge: 0.5
 * - Piedmont Ave/Laurel: 0
 *
 * v2.3 Notes:
 * - Cycle-level signals (chaos, tension, lift, econBoom, shock, patterns) now
 *   apply ONCE per citizen per cycle, not per-event
 * - Neighborhood is picked by most frequent occurrence, not first-seen
 * - Arc involvement correctly handles object-based involvedCitizens
 * - Arc phases: early/rising/peak/decline (removed non-existent "mid")
 *
 * ============================================================================
 */
