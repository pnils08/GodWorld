/**
 * faithEventsEngine.js
 *
 * Phase 4 engine: Generates faith and religious community events.
 * Provides content for Elliot Graye (Faith & Ethics reporter).
 *
 * Event types:
 * - Regular services and special sermons
 * - Holy day observances
 * - Community programs (food banks, youth, seniors)
 * - Interfaith dialogue and cooperation
 * - Outreach and charitable work
 * - Crisis response and community healing
 *
 * @version 1.1
 * @tier 6.2
 *
 * v1.1 Changes:
 * - FIX: Use S.simMonth from Phase 1 calendar for holy day lookup (was using real wall clock)
 * - FIX: Rename shuffleFaithOrgs_ to shuffleFaithOrgs_ to prevent flat namespace collision
 * - WIRED: getFaithStorySignals_ consumed in Phase 6 orchestrator
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var FAITH_ENGINE_VERSION = '1.1';

// Event generation probabilities
var FAITH_EVENT_PROBS = {
  REGULAR_SERVICE: 0.4,    // 40% of orgs have notable service this cycle
  COMMUNITY_PROGRAM: 0.25, // 25% run community programs
  OUTREACH: 0.15,          // 15% do outreach events
  INTERFAITH: 0.08,        // 8% participate in interfaith events
  CRISIS_RESPONSE: 0.05    // 5% respond to crises (if crisis exists)
};

// Seasonal modifiers
var FAITH_SEASONAL_MODS = {
  winter: {
    community_program: 1.5,  // More food/shelter programs
    outreach: 1.3,
    holy_day: 1.2
  },
  spring: {
    holy_day: 1.5,  // Easter, Passover, etc.
    interfaith_dialogue: 1.2
  },
  summer: {
    community_program: 1.2,  // Youth programs
    regular_service: 0.9     // Summer attendance dip
  },
  fall: {
    holy_day: 1.3,  // High Holy Days, Diwali
    community_program: 1.1
  }
};

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Generate faith events for the current cycle.
 * Called during Phase 4 (world events).
 *
 * @param {Object} ctx - Engine context
 * @return {Array} Generated faith events
 */
function runFaithEventsEngine_(ctx) {
  var ss = ctx.ss;
  var S = ctx.summary || {};
  var cycle = S.absoluteCycle || 0;
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  // Ensure schemas exist
  if (typeof ensureFaithLedgerSchema_ === 'function') {
    ensureFaithLedgerSchema_(ss);
  }
  if (typeof ensureFaithOrgsSchema_ === 'function') {
    ensureFaithOrgsSchema_(ss);
  }

  // Get organizations
  var organizations = [];
  if (typeof getFaithOrganizations_ === 'function') {
    organizations = getFaithOrganizations_(ss);
  } else {
    organizations = OAKLAND_FAITH_ORGANIZATIONS;
  }

  // Get context
  var season = S.season || 'spring';
  var weather = S.weather || {};
  var cityDynamics = S.cityDynamics || {};
  var sentiment = cityDynamics.sentiment || 0;
  var worldEvents = S.worldEvents || [];

  // Detect crisis conditions
  var hasCrisis = detectCrisisConditions_(worldEvents, sentiment);

  // Get simulation month for holy day lookup (set by Phase 1 calendar)
  var month = S.simMonth || 1;

  // Generate events
  var events = [];
  var seasonMods = FAITH_SEASONAL_MODS[season] || {};

  for (var i = 0; i < organizations.length; i++) {
    var org = organizations[i];
    if (org.activeStatus === 'inactive') continue;

    var orgEvents = generateOrgEvents_(org, {
      month: month,
      season: season,
      seasonMods: seasonMods,
      hasCrisis: hasCrisis,
      weather: weather,
      sentiment: sentiment
    }, rng);

    for (var e = 0; e < orgEvents.length; e++) {
      events.push(orgEvents[e]);
    }
  }

  // Generate interfaith events (city-wide, not org-specific)
  var interfaithEvents = generateInterfaithEvents_(organizations, {
    month: month,
    season: season,
    hasCrisis: hasCrisis,
    sentiment: sentiment
  }, rng);

  for (var f = 0; f < interfaithEvents.length; f++) {
    events.push(interfaithEvents[f]);
  }

  // Record events to ledger
  if (events.length > 0 && typeof batchRecordFaithEvents_ === 'function') {
    batchRecordFaithEvents_(ctx, events);
  }

  // Store in summary for Phase 6 analysis
  S.faithEvents = {
    generated: events.length,
    cycle: cycle,
    byType: countEventsByType_(events),
    hasCrisis: hasCrisis
  };

  // Also add to worldEvents for integration
  var worldEventFormat = events.map(function(e) {
    return {
      description: formatFaithEventDescription_(e),
      severity: e.eventType === 'crisis_response' ? 'medium' : 'low',
      domain: 'FAITH',
      neighborhood: e.neighborhood,
      subtype: e.eventType
    };
  });

  // Append to S.worldEvents if it exists
  if (Array.isArray(S.worldEvents)) {
    for (var w = 0; w < worldEventFormat.length; w++) {
      S.worldEvents.push(worldEventFormat[w]);
    }
  }

  return events;
}

// ============================================================================
// EVENT GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate events for a single organization.
 *
 * @param {Object} org - Organization data
 * @param {Object} context - { month, season, seasonMods, hasCrisis, weather, sentiment }
 * @param {Function} rng
 * @return {Array} Events for this organization
 */
function generateOrgEvents_(org, context, rng) {
  var events = [];
  var seasonMods = context.seasonMods || {};

  // Check for holy day
  var holyDay = null;
  if (typeof getHolyDayForTradition_ === 'function') {
    holyDay = getHolyDayForTradition_(org.tradition, context.month);
  }

  // Holy day event (high priority if applicable)
  if (holyDay && rng() < 0.7) {
    var holyDayDesc = pickFaithEvent_('holy_day', rng)
      .replace('$HOLIDAY', holyDay);

    events.push({
      organization: org.organization,
      tradition: org.tradition,
      neighborhood: org.neighborhood,
      eventType: 'holy_day',
      description: holyDayDesc,
      attendance: calculateAttendance_(org.congregation, 'holy_day', rng),
      holyDay: holyDay
    });
  }

  // Regular service (notable moment)
  var serviceProb = FAITH_EVENT_PROBS.REGULAR_SERVICE * (seasonMods.regular_service || 1);
  if (rng() < serviceProb) {
    events.push({
      organization: org.organization,
      tradition: org.tradition,
      neighborhood: org.neighborhood,
      eventType: 'regular_service',
      description: pickFaithEvent_('regular_service', rng),
      attendance: calculateAttendance_(org.congregation, 'regular_service', rng)
    });
  }

  // Community program
  var progProb = FAITH_EVENT_PROBS.COMMUNITY_PROGRAM * (seasonMods.community_program || 1);
  // Larger congregations more likely to run programs
  if (org.congregation > 300) progProb *= 1.3;
  if (rng() < progProb) {
    events.push({
      organization: org.organization,
      tradition: org.tradition,
      neighborhood: org.neighborhood,
      eventType: 'community_program',
      description: pickFaithEvent_('community_program', rng),
      attendance: calculateAttendance_(org.congregation, 'community_program', rng)
    });
  }

  // Outreach
  var outreachProb = FAITH_EVENT_PROBS.OUTREACH * (seasonMods.outreach || 1);
  // Poor sentiment increases outreach efforts
  if (context.sentiment < -0.2) outreachProb *= 1.4;
  if (rng() < outreachProb) {
    events.push({
      organization: org.organization,
      tradition: org.tradition,
      neighborhood: org.neighborhood,
      eventType: 'outreach',
      description: pickFaithEvent_('outreach', rng),
      attendance: calculateAttendance_(org.congregation, 'outreach', rng)
    });
  }

  // Crisis response (only if crisis detected)
  if (context.hasCrisis) {
    var crisisProb = FAITH_EVENT_PROBS.CRISIS_RESPONSE;
    // Anchor institutions more likely to respond
    if (org.congregation > 500) crisisProb *= 2;
    if (rng() < crisisProb) {
      events.push({
        organization: org.organization,
        tradition: org.tradition,
        neighborhood: org.neighborhood,
        eventType: 'crisis_response',
        description: pickFaithEvent_('crisis_response', rng),
        attendance: calculateAttendance_(org.congregation, 'crisis_response', rng)
      });
    }
  }

  return events;
}

/**
 * Generate city-wide interfaith events.
 *
 * @param {Array} organizations
 * @param {Object} context
 * @param {Function} rng
 * @return {Array}
 */
function generateInterfaithEvents_(organizations, context, rng) {
  var events = [];
  var seasonMods = FAITH_SEASONAL_MODS[context.season] || {};

  // Base probability for interfaith events
  var interfaithProb = FAITH_EVENT_PROBS.INTERFAITH * (seasonMods.interfaith_dialogue || 1);

  // Crisis increases interfaith cooperation
  if (context.hasCrisis) interfaithProb *= 2;

  // Poor sentiment increases dialogue
  if (context.sentiment < -0.3) interfaithProb *= 1.5;

  // Generate 0-2 interfaith events per cycle
  var count = 0;
  while (count < 2 && rng() < interfaithProb) {
    // Pick 2-4 participating organizations
    var shuffled = shuffleFaithOrgs_(organizations.slice(), rng);
    var participants = shuffled.slice(0, 2 + Math.floor(rng() * 3));

    if (participants.length >= 2) {
      // Pick host neighborhood (first participant's neighborhood)
      var host = participants[0];

      events.push({
        organization: 'Interfaith Council',
        tradition: 'Interfaith',
        neighborhood: host.neighborhood,
        eventType: 'interfaith_dialogue',
        description: pickFaithEvent_('interfaith_dialogue', rng),
        attendance: participants.reduce(function(sum, p) {
          return sum + Math.round(p.congregation * 0.05);
        }, 0),
        participants: participants.map(function(p) { return p.organization; })
      });
    }

    count++;
    interfaithProb *= 0.4; // Diminishing returns
  }

  return events;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect if crisis conditions exist based on world events.
 *
 * @param {Array} worldEvents
 * @param {number} sentiment
 * @return {boolean}
 */
function detectCrisisConditions_(worldEvents, sentiment) {
  // Crisis if sentiment is very negative
  if (sentiment < -0.5) return true;

  // Check for crisis-indicating events
  var crisisKeywords = ['tragedy', 'death', 'shooting', 'fire', 'disaster', 'emergency', 'crisis'];

  for (var i = 0; i < worldEvents.length; i++) {
    var evt = worldEvents[i];
    var desc = (evt.description || '').toLowerCase();
    var severity = (evt.severity || '').toLowerCase();

    if (severity === 'high' || severity === 'critical') return true;

    for (var k = 0; k < crisisKeywords.length; k++) {
      if (desc.indexOf(crisisKeywords[k]) !== -1) return true;
    }
  }

  return false;
}

/**
 * Format faith event for world events display.
 *
 * @param {Object} event
 * @return {string}
 */
function formatFaithEventDescription_(event) {
  var desc = event.description || 'faith gathering';

  if (event.eventType === 'holy_day' && event.holyDay) {
    desc = event.organization + ' observes ' + event.holyDay;
  } else if (event.eventType === 'interfaith_dialogue') {
    desc = desc + ' at ' + event.neighborhood;
  } else {
    desc = event.organization + ': ' + desc;
  }

  return desc;
}

/**
 * Count events by type.
 *
 * @param {Array} events
 * @return {Object}
 */
function countEventsByType_(events) {
  var counts = {
    regular_service: 0,
    holy_day: 0,
    community_program: 0,
    interfaith_dialogue: 0,
    outreach: 0,
    crisis_response: 0
  };

  for (var i = 0; i < events.length; i++) {
    var type = events[i].eventType || 'regular_service';
    if (counts[type] !== undefined) {
      counts[type]++;
    }
  }

  return counts;
}

/**
 * Shuffle array (Fisher-Yates).
 *
 * @param {Array} arr
 * @param {Function} rng
 * @return {Array}
 */
function shuffleFaithOrgs_(arr, rng) {
  var result = arr.slice();
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

// ============================================================================
// STORY SIGNALS FOR PHASE 6
// ============================================================================

/**
 * Get story signals from faith events.
 *
 * @param {Object} ctx - Engine context
 * @return {Array}
 */
function getFaithStorySignals_(ctx) {
  var S = ctx.summary || {};
  var faithData = S.faithEvents || {};
  var byType = faithData.byType || {};

  var signals = [];

  // Holy day coverage opportunities
  if (byType.holy_day > 0) {
    signals.push({
      type: 'faith_holy_day',
      priority: 2,
      headline: 'Religious communities observe holy days',
      desk: 'faith',
      reporter: 'Elliot Graye',
      data: { count: byType.holy_day }
    });
  }

  // Interfaith dialogue (always newsworthy)
  if (byType.interfaith_dialogue > 0) {
    signals.push({
      type: 'faith_interfaith',
      priority: 3,
      headline: 'Interfaith leaders gather for dialogue',
      desk: 'faith',
      reporter: 'Elliot Graye',
      data: { count: byType.interfaith_dialogue }
    });
  }

  // Crisis response (high priority)
  if (byType.crisis_response > 0) {
    signals.push({
      type: 'faith_crisis',
      priority: 4,
      headline: 'Faith communities respond to community crisis',
      desk: 'faith',
      reporter: 'Elliot Graye',
      data: { count: byType.crisis_response }
    });
  }

  // Community programs (feature potential)
  if (byType.community_program >= 3) {
    signals.push({
      type: 'faith_community',
      priority: 2,
      headline: 'Faith-based programs serve Oakland neighbors',
      desk: 'faith',
      reporter: 'Elliot Graye',
      data: { count: byType.community_program }
    });
  }

  return signals;
}
