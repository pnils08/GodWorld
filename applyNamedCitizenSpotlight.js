/**
 * ============================================================================
 * applyNamedCitizenSpotlights_ v2.2
 * ============================================================================
 *
 * Identifies Named citizens who gained meaningful cycle-level
 * narrative "spotlight" significance with GodWorld Calendar awareness.
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

  const S = ctx.summary;
  if (!S || !S.engineEvents) return;
  if (!ctx.namedCitizenMap) return;

  const events = S.engineEvents;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  const sentiment = dynamics.sentiment || 0;
  const civicLoad = S.civicLoad || "";
  const pattern = S.patternFlag || "";
  const shock = S.shockFlag || "";
  const econMood = S.economicMood || 50;
  const weatherMood = S.weatherMood || {};
  const activeArcs = S.eventArcs || [];

  // Calendar context (v2.2)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const holidayNeighborhood = S.holidayNeighborhood || "";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  const scores = {}; // popId → numeric score
  const reasons = {}; // popId → array of reason tags
  const neighborhoods = {}; // popId → neighborhood

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  function addReason(pid, msg) {
    if (!reasons[pid]) reasons[pid] = [];
    if (!reasons[pid].includes(msg)) {
      reasons[pid].push(msg);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT DOMAIN PRIORITY (both cases)
  // ═══════════════════════════════════════════════════════════════════════════
  const domainWeight = {
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
  const severityWeight = {
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
  const neighborhoodBonus = {
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
  const holidayDomainBoost = {
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
  // ARC INVOLVEMENT CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  function getArcBonus(pid) {
    for (const arc of activeArcs) {
      if (arc.involvedCitizens && arc.involvedCitizens.includes(pid)) {
        if (arc.phase === 'peak') return { bonus: 5, reason: 'arc-peak' };
        if (arc.phase === 'rising' || arc.phase === 'mid') return { bonus: 3, reason: 'arc-active' };
        if (arc.phase === 'early') return { bonus: 1, reason: 'arc-emerging' };
      }
    }
    return { bonus: 0, reason: null };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD SCORING PER NAMED CITIZEN
  // ═══════════════════════════════════════════════════════════════════════════
  for (let ev of events) {

    const pid = ev.popId;
    if (!pid) continue;
    if (!ctx.namedCitizenMap[pid]) continue; // only Named citizens

    if (!scores[pid]) scores[pid] = 0;

    const evType = ev.type || ev.domain || '';
    const evTypeLower = evType.toLowerCase();
    const evSeverity = (ev.severity || '').toString().toLowerCase();
    const evTag = (ev.tag || '').toString().toLowerCase();
    const neighborhood = ev.neighborhood || ev.location || '';

    // Track neighborhood
    if (neighborhood && !neighborhoods[pid]) {
      neighborhoods[pid] = neighborhood;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DOMAIN WEIGHT
    // ═══════════════════════════════════════════════════════════════════════
    const dw = domainWeight[evType] || domainWeight[evTypeLower] || 1;
    scores[pid] += dw;
    addReason(pid, `domain:${evTypeLower}`);

    // ═══════════════════════════════════════════════════════════════════════
    // SEVERITY WEIGHT
    // ═══════════════════════════════════════════════════════════════════════
    const sw = severityWeight[evSeverity] || 1;
    scores[pid] += sw;
    if (evSeverity && evSeverity !== 'low') {
      addReason(pid, `severity:${evSeverity}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NEIGHBORHOOD BONUS
    // ═══════════════════════════════════════════════════════════════════════
    const nb = neighborhoodBonus[neighborhood] || 0;
    if (nb > 0) {
      scores[pid] += nb;
      addReason(pid, `spotlight:${neighborhood}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CHAOS MULTIPLIER
    // ═══════════════════════════════════════════════════════════════════════
    if (chaos.length > 0) {
      scores[pid] += 2;
      addReason(pid, "chaos-cycle");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SENTIMENT + CIVIC LOAD INFLUENCE
    // ═══════════════════════════════════════════════════════════════════════
    if (sentiment <= -0.3) {
      scores[pid] += 2;
      addReason(pid, "public-tension");
    }
    if (sentiment >= 0.3) {
      scores[pid] += 1;
      addReason(pid, "public-lift");
    }
    if (civicLoad === "load-strain" && (evTypeLower === "civic")) {
      scores[pid] += 3;
      addReason(pid, "civic-strain");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ECONOMIC MOOD INFLUENCE
    // ═══════════════════════════════════════════════════════════════════════
    if (econMood <= 35 && evTypeLower === "economic") {
      scores[pid] += 2;
      addReason(pid, "economic-stress");
    }
    if (econMood >= 65) {
      scores[pid] += 1;
      addReason(pid, "economic-boom");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WEATHER MOOD INFLUENCE
    // ═══════════════════════════════════════════════════════════════════════
    if (weatherMood.conflictPotential && weatherMood.conflictPotential > 0.3) {
      scores[pid] += 1;
      addReason(pid, "weather-tension");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PATTERN/SHOCK EMPHASIS
    // ═══════════════════════════════════════════════════════════════════════
    if (pattern === "micro-event-wave") {
      scores[pid] += 1;
      addReason(pid, "micro-wave");
    }
    if (pattern === "strain-trend") {
      scores[pid] += 2;
      addReason(pid, "strain-trend");
    }
    if (shock && shock !== "none") {
      scores[pid] += 4;
      addReason(pid, "shock-cycle");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOLIDAY SPOTLIGHT BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (holiday !== "none") {
      // Holiday-domain affinity boost
      if (holidayDomainBoost[holiday] && holidayDomainBoost[holiday][evTypeLower]) {
        const hBoost = holidayDomainBoost[holiday][evTypeLower];
        scores[pid] += hBoost;
        addReason(pid, `holiday:${holiday}`);
      }

      // Holiday priority general boost
      if (holidayPriority === "major") {
        scores[pid] += 2;
        addReason(pid, "major-holiday");
      } else if (holidayPriority === "oakland") {
        scores[pid] += 2;
        addReason(pid, "oakland-holiday");
      } else if (holidayPriority === "cultural") {
        scores[pid] += 1;
        addReason(pid, "cultural-holiday");
      }

      // Holiday neighborhood spotlight boost
      if (holidayNeighborhood && neighborhood === holidayNeighborhood) {
        scores[pid] += 3;
        addReason(pid, `holiday-neighborhood:${neighborhood}`);
      }

      // Holiday-tagged event boost
      if (evTag.includes("holiday")) {
        scores[pid] += 2;
        addReason(pid, "holiday-event");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FIRST FRIDAY SPOTLIGHT BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (isFirstFriday) {
      if (evTypeLower === "culture") {
        scores[pid] += 3;
        addReason(pid, "first-friday-culture");
      }
      if (evTypeLower === "community") {
        scores[pid] += 2;
        addReason(pid, "first-friday-community");
      }
      if (evTag.includes("firstfriday")) {
        scores[pid] += 2;
        addReason(pid, "first-friday-event");
      }
      // First Friday neighborhoods
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
        scores[pid] += 3;
        addReason(pid, "creation-day-community");
      }
      if (evTypeLower === "civic") {
        scores[pid] += 2;
        addReason(pid, "creation-day-civic");
      }
      if (evTag.includes("creationday")) {
        scores[pid] += 2;
        addReason(pid, "creation-day-event");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SPORTS SEASON SPOTLIGHT BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (evTypeLower === "sports") {
      if (sportsSeason === "championship") {
        scores[pid] += 5;
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
    // CULTURAL ACTIVITY BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (dynamics.culturalActivity >= 1.4 && evTypeLower === "culture") {
      scores[pid] += 2;
      addReason(pid, "cultural-surge");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COMMUNITY ENGAGEMENT BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (dynamics.communityEngagement >= 1.3 && evTypeLower === "community") {
      scores[pid] += 2;
      addReason(pid, "community-surge");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD ARC INVOLVEMENT BONUSES
  // ═══════════════════════════════════════════════════════════════════════════
  for (const pid in scores) {
    const arcInfo = getArcBonus(pid);
    if (arcInfo.bonus > 0) {
      scores[pid] += arcInfo.bonus;
      addReason(pid, arcInfo.reason);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THRESHOLD LOGIC (WORLD-AWARE + CALENDAR-AWARE)
  // ═══════════════════════════════════════════════════════════════════════════
  let baseThreshold = 6;
  
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
  const result = [];

  for (const pid in scores) {
    const score = scores[pid];
    if (score >= baseThreshold) {
      const citizenData = ctx.namedCitizenMap[pid] || {};
      result.push({
        popId: pid,
        name: citizenData.name || pid,
        score: score,
        neighborhood: neighborhoods[pid] || citizenData.neighborhood || '',
        reasons: reasons[pid] || []
      });
    }
  }

  // Sort by score descending
  result.sort((a, b) => b.score - a.score);

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
 * - Chaos cycle: +2
 * - Public tension: +2 (negative sentiment)
 * - Civic strain: +3
 * - Economic stress: +2
 * - Shock cycle: +4
 * - Arc involvement: peak (5), active (3), emerging (1)
 * 
 * Calendar Boosts (v2.2):
 * - Major/Oakland holiday: +2
 * - Cultural holiday: +1
 * - Holiday neighborhood match: +3
 * - Holiday-tagged event: +2
 * - First Friday culture: +3
 * - First Friday community: +2
 * - First Friday neighborhoods: +2
 * - Creation Day community: +3
 * - Creation Day civic: +2
 * - Championship sports: +5
 * - Playoffs sports: +3
 * - Opening Day sports: +3
 * - Cultural surge: +2
 * - Community surge: +2
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
 * ============================================================================
 */