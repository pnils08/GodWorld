/**
 * ============================================================================
 * prioritizeEvents_ v2.3
 * ============================================================================
 *
 * World-aware event prioritization with GodWorld Calendar integration.
 *
 * v2.3 Enhancements:
 * - Integrated Tier 3 Neighborhood Demographics for story signals
 * - Demographic shifts boost related event types
 * - Population shifts → migration/community/economic events
 * - Unemployment shifts → economic/civic events
 * - Illness shifts → health/community events
 * - Age demographic shifts → community/health events
 * - Large shifts (>10%) get extra priority
 *
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods
 * - Holiday priority scoring (holiday-relevant events boosted)
 * - First Friday cultural event boost
 * - Creation Day community event boost
 * - Sports season event relevance
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Scoring factors:
 * - severity
 * - chaos category
 * - civic load
 * - weather impact + weather mood
 * - sentiment
 * - economic mood
 * - tier relevance
 * - event domain
 * - neighborhood importance
 * - holiday context (v2.2)
 * - calendar signals (v2.2)
 * - demographic shifts (v2.3)
 *
 * Produces a clean, sorted, high-signal event list for Media Room use.
 * 
 * ============================================================================
 */

function prioritizeEvents_(ctx) {

  var S = ctx.summary;
  if (!S || !S.engineEvents) return;

  var events = S.engineEvents;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var civicLoad = S.civicLoad || "";
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var sentiment = dynamics.sentiment || 0;
  var chaos = S.worldEvents || [];
  var pattern = S.patternFlag || "";
  var shock = S.shockFlag || "";
  var econMood = S.economicMood || 50;
  var mediaEffects = S.mediaEffects || {};

  // Calendar context (v2.2)
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var holidayNeighborhood = S.holidayNeighborhood || "";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // Demographic context (v2.3 - Tier 3)
  var demographicShifts = S.demographicShifts || [];
  var neighborhoodDemographics = S.neighborhoodDemographics || {};

  // Build demographic shift lookup for fast neighborhood matching
  var shiftsByNeighborhood = {};
  for (var i = 0; i < demographicShifts.length; i++) {
    var shift = demographicShifts[i];
    if (shift.neighborhood) {
      if (!shiftsByNeighborhood[shift.neighborhood]) {
        shiftsByNeighborhood[shift.neighborhood] = [];
      }
      shiftsByNeighborhood[shift.neighborhood].push(shift);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN PRIORITY (lowercase and uppercase)
  // ═══════════════════════════════════════════════════════════════════════════
  var domainPriority = {
    // Uppercase (standard)
    "CIVIC": 1,
    "SAFETY": 2,
    "ECONOMIC": 3,
    "HEALTH": 4,
    "INFRASTRUCTURE": 5,
    "ENVIRONMENT": 6,
    "CULTURE": 7,
    "MIGRATION": 8,
    "COMMUNITY": 9,
    "HOUSEHOLD": 10,
    "MICRO": 11,
    // Lowercase (legacy support)
    "civic": 1,
    "safety": 2,
    "economic": 3,
    "health": 4,
    "infrastructure": 5,
    "environment": 6,
    "culture": 7,
    "migration": 8,
    "crime": 2,
    "weather": 6,
    "community": 9,
    "household": 10,
    "micro": 11,
    // v2.2: Sports domain
    "sports": 7
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD IMPORTANCE (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodWeight = {
    'Downtown': 1.3,
    'West Oakland': 1.2,
    'Jack London': 1.15,
    'Uptown': 1.15,
    'Fruitvale': 1.1,
    'Chinatown': 1.1,
    'Temescal': 1.0,
    'KONO': 1.0,
    'Lake Merritt': 0.95,
    'Rockridge': 0.9,
    'Piedmont Ave': 0.85,
    'Laurel': 0.8
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY-DOMAIN AFFINITY (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayDomainBoost = {
    // Major holidays
    "Independence": { civic: 3, community: 3, safety: 2 },
    "Thanksgiving": { community: 4, household: 3 },
    "Holiday": { community: 3, economic: 3, household: 2 },
    "NewYear": { civic: 2, community: 2, economic: 2 },
    "MemorialDay": { civic: 3, community: 2 },
    "LaborDay": { economic: 3, community: 2 },
    "VeteransDay": { civic: 4, community: 2 },
    
    // Cultural holidays
    "MLKDay": { civic: 4, community: 3, culture: 3 },
    "Juneteenth": { civic: 3, community: 4, culture: 4 },
    "BlackHistoryMonth": { culture: 4, community: 3, civic: 2 },
    "PrideMonth": { culture: 4, community: 4, civic: 2 },
    "OaklandPride": { culture: 5, community: 4, civic: 2 },
    "CincoDeMayo": { culture: 4, community: 3 },
    "DiaDeMuertos": { culture: 5, community: 3 },
    "IndigenousPeoplesDay": { culture: 3, civic: 3, community: 2 },
    
    // Oakland-specific
    "OpeningDay": { sports: 5, community: 3, culture: 2, economic: 2 },
    "ArtSoulFestival": { culture: 5, community: 4 },
    
    // Minor holidays
    "Halloween": { community: 3, culture: 2 },
    "Valentine": { community: 2, economic: 2 },
    "StPatricksDay": { community: 2, culture: 2 },
    "EarthDay": { environment: 4, community: 2, civic: 2 }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD-STATE MODIFIER FUNCTION
  // ═══════════════════════════════════════════════════════════════════════════
  function worldModifier(ev) {

    var score = 0;
    var evType = (ev.type || ev.domain || '').toLowerCase();
    var evSeverity = (ev.severity || '').toString().toLowerCase();
    var evNeighborhood = ev.neighborhood || ev.location || '';
    var evTag = (ev.tag || '').toLowerCase();

    // ═══════════════════════════════════════════════════════════════════════
    // SEVERITY (highest weight)
    // ═══════════════════════════════════════════════════════════════════════
    if (evSeverity === "medium" || evSeverity === "moderate") score += 8;
    if (evSeverity === "high" || evSeverity === "major" || evSeverity === "critical") score += 16;

    // ═══════════════════════════════════════════════════════════════════════
    // WEATHER EFFECTS
    // ═══════════════════════════════════════════════════════════════════════
    if (weather.impact >= 1.3 && (evType === "weather" || evType === "infrastructure")) score += 4;
    if (weatherMood.conflictPotential && weatherMood.conflictPotential > 0.3) score += 2;

    // ═══════════════════════════════════════════════════════════════════════
    // CIVIC LOAD EFFECTS
    // ═══════════════════════════════════════════════════════════════════════
    if (civicLoad === "load-strain" && evType === "civic") score += 5;
    if (civicLoad === "minor-variance" && evType === "civic") score += 2;

    // ═══════════════════════════════════════════════════════════════════════
    // SENTIMENT VOLATILITY
    // ═══════════════════════════════════════════════════════════════════════
    if (sentiment <= -0.3 && evType !== "micro") score += 3;
    if (sentiment >= 0.3 && evType === "community") score += 2;

    // ═══════════════════════════════════════════════════════════════════════
    // ECONOMIC MOOD EFFECTS
    // ═══════════════════════════════════════════════════════════════════════
    if (econMood <= 35 && evType === "economic") score += 4;
    if (econMood >= 65 && evType === "economic") score += 1;

    // ═══════════════════════════════════════════════════════════════════════
    // CHAOS AMPLIFICATION
    // ═══════════════════════════════════════════════════════════════════════
    if (chaos.length > 0 && evType !== "micro") score += 3;
    if (chaos.length >= 5) score += 2;

    // ═══════════════════════════════════════════════════════════════════════
    // PATTERN/SHOCK SIGNALS
    // ═══════════════════════════════════════════════════════════════════════
    if (pattern === "micro-event-wave") score += 2;
    if (pattern === "strain-trend") score += 3;
    if (shock && shock !== "none") score += 6;

    // ═══════════════════════════════════════════════════════════════════════
    // MEDIA SATURATION
    // ═══════════════════════════════════════════════════════════════════════
    if (mediaEffects.crisisSaturation && mediaEffects.crisisSaturation >= 0.6) {
      if (evType === "safety" || evType === "health" || evType === "civic") score += 3;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOLIDAY-DOMAIN AFFINITY (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (holiday !== "none" && holidayDomainBoost[holiday]) {
      const boost = holidayDomainBoost[holiday][evType] || 0;
      score += boost;
    }

    // Holiday priority general boost
    if (holidayPriority === "major" && evType !== "micro") score += 2;
    else if (holidayPriority === "oakland" && evType !== "micro") score += 2;
    else if (holidayPriority === "cultural" && (evType === "culture" || evType === "community")) score += 3;

    // Holiday neighborhood match boost (v2.2)
    if (holidayNeighborhood && evNeighborhood === holidayNeighborhood) {
      score += 4;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FIRST FRIDAY BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (isFirstFriday) {
      if (evType === "culture" || evType === "community") score += 4;
      if (evTag.indexOf("firstfriday") !== -1) score += 3;
      // First Friday neighborhoods
      if (evNeighborhood === "Uptown" || evNeighborhood === "KONO" || evNeighborhood === "Temescal") {
        score += 2;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CREATION DAY BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (isCreationDay) {
      if (evType === "community" || evType === "civic") score += 3;
      if (evTag.indexOf("creationday") !== -1) score += 3;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SPORTS SEASON BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    if (evType === "sports") {
      if (sportsSeason === "championship") score += 6;
      else if (sportsSeason === "playoffs" || sportsSeason === "post-season") score += 4;
      else if (sportsSeason === "late-season") score += 2;
    }

    // Opening Day special boost
    if (holiday === "OpeningDay" && evType === "sports") score += 5;

    // ═══════════════════════════════════════════════════════════════════════
    // CULTURAL ACTIVITY BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    var culturalActivity = dynamics.culturalActivity || 1;
    if (culturalActivity >= 1.4 && evType === "culture") score += 3;
    else if (culturalActivity >= 1.2 && evType === "culture") score += 1;

    // ═══════════════════════════════════════════════════════════════════════
    // COMMUNITY ENGAGEMENT BOOST (v2.2)
    // ═══════════════════════════════════════════════════════════════════════
    var communityEngagement = dynamics.communityEngagement || 1;
    if (communityEngagement >= 1.3 && evType === "community") score += 3;
    else if (communityEngagement >= 1.15 && evType === "community") score += 1;

    // ═══════════════════════════════════════════════════════════════════════
    // DEMOGRAPHIC SHIFT BOOST (v2.3 - Tier 3)
    // ═══════════════════════════════════════════════════════════════════════
    var neighborhoodShifts = shiftsByNeighborhood[evNeighborhood] || [];
    if (neighborhoodShifts.length > 0) {
      // Events in neighborhoods with demographic shifts get priority
      for (var s = 0; s < neighborhoodShifts.length; s++) {
        var shiftItem = neighborhoodShifts[s];

        // Population shifts affect migration/community events
        if (shiftItem.type === 'population_shift') {
          if (evType === 'migration') score += 4;
          if (evType === 'community') score += 3;
          if (evType === 'economic') score += 2;
        }

        // Unemployment shifts affect economic events
        if (shiftItem.type === 'unemployed_shift') {
          if (evType === 'economic') score += 4;
          if (evType === 'civic') score += 2;
        }

        // Illness shifts affect health events
        if (shiftItem.type === 'sick_shift') {
          if (evType === 'health') score += 4;
          if (evType === 'community') score += 2;
        }

        // Age demographic shifts
        if (shiftItem.type === 'students_shift') {
          if (evType === 'community') score += 2;
        }
        if (shiftItem.type === 'seniors_shift') {
          if (evType === 'health') score += 2;
          if (evType === 'community') score += 2;
        }

        // Large shifts (>10%) get extra boost
        if (shiftItem.percentage && shiftItem.percentage >= 10) {
          score += 2;
        }
      }
    }

    // Demographic event tag boost
    if (evTag.indexOf('demographic') !== -1 || evTag.indexOf('population') !== -1) score += 3;

    // ═══════════════════════════════════════════════════════════════════════
    // NEIGHBORHOOD IMPORTANCE (applied last as multiplier)
    // ═══════════════════════════════════════════════════════════════════════
    var nWeight = neighborhoodWeight[evNeighborhood] || 1.0;
    score = Math.round(score * nWeight);

    return score;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SORT EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  // Priority order:
  // 1. domain priority
  // 2. world-state modifier score
  // 3. severity fallback
  // 4. timestamp fallback

  S.engineEvents.sort(function(a, b) {

    var typeA = a.type || a.domain || '';
    var typeB = b.type || b.domain || '';

    var pa = domainPriority[typeA] || domainPriority[typeA.toLowerCase()] || 50;
    var pb = domainPriority[typeB] || domainPriority[typeB.toLowerCase()] || 50;

    if (pa !== pb) return pa - pb;

    var wa = worldModifier(a);
    var wb = worldModifier(b);

    if (wa !== wb) return wb - wa; // higher world-impact first

    // Severity fallback
    var sevRank = {
      low: 1,
      medium: 2,
      moderate: 2,
      high: 3,
      major: 3,
      critical: 4
    };
    var sevA = (a.severity || '').toString().toLowerCase();
    var sevB = (b.severity || '').toString().toLowerCase();
    var sa = sevRank[sevA] || 0;
    var sb = sevRank[sevB] || 0;

    if (sa !== sb) return sb - sa;

    // Older events last
    return (a.timestamp || 0) - (b.timestamp || 0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE PRIORITIZATION METADATA
  // ═══════════════════════════════════════════════════════════════════════════
  S.eventPrioritization = {
    totalEvents: events.length,
    topDomain: events.length > 0 ? (events[0].type || events[0].domain || 'unknown') : 'none',
    highPriorityCount: events.filter(function(e) {
      var sev = (e.severity || '').toString().toLowerCase();
      return sev === 'high' || sev === 'major' || sev === 'critical';
    }).length,
    // v2.2: Calendar context in prioritization
    calendarContext: {
      holiday: holiday,
      holidayPriority: holidayPriority,
      isFirstFriday: isFirstFriday,
      isCreationDay: isCreationDay,
      sportsSeason: sportsSeason
    },
    // v2.3: Demographic context in prioritization
    demographicContext: {
      shiftsCount: demographicShifts.length,
      neighborhoodsWithShifts: Object.keys(shiftsByNeighborhood).length,
      significantShifts: demographicShifts.filter(function(s) {
        return s.percentage && s.percentage >= 8;
      }).length
    }
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * PRIORITIZATION REFERENCE
 * ============================================================================
 * 
 * Domain Priority Order:
 * 1. CIVIC
 * 2. SAFETY
 * 3. ECONOMIC
 * 4. HEALTH
 * 5. INFRASTRUCTURE
 * 6. ENVIRONMENT
 * 7. CULTURE / SPORTS
 * 8. MIGRATION
 * 9. COMMUNITY
 * 10. HOUSEHOLD
 * 11. MICRO
 * 
 * Neighborhood Weights (v2.2 - 12 neighborhoods):
 * - Downtown: 1.3
 * - West Oakland: 1.2
 * - Jack London / Uptown: 1.15
 * - Fruitvale / Chinatown: 1.1
 * - Temescal / KONO: 1.0
 * - Lake Merritt: 0.95
 * - Rockridge: 0.9
 * - Piedmont Ave: 0.85
 * - Laurel: 0.8
 * 
 * Holiday-Domain Affinity (v2.2):
 * - MLKDay → civic +4, community +3, culture +3
 * - Juneteenth → civic +3, community +4, culture +4
 * - OpeningDay → sports +5, community +3
 * - OaklandPride → culture +5, community +4
 * - EarthDay → environment +4
 * - etc.
 * 
 * Calendar Boosts (v2.2):
 * - Holiday neighborhood match: +4
 * - First Friday (culture/community): +4
 * - First Friday tag: +3
 * - First Friday neighborhoods: +2
 * - Creation Day (community/civic): +3
 * - Championship sports: +6
 * - Playoffs sports: +4
 * - High cultural activity: +3
 * - High community engagement: +3
 * 
 * ============================================================================
 */