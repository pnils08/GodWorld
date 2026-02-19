/**
 * runYouthEngine.js
 *
 * Phase 5 engine: Generates youth-specific events and activities.
 * Gives agency to children who exist as household members.
 *
 * Covers:
 * - School activities and academics
 * - Youth sports and extracurriculars
 * - Coming-of-age milestones
 * - Civic participation (age-appropriate)
 *
 * v1.3 Fixes:
 * - FIX: getNamedYouth_ now computes age from BirthYear when Age column absent
 * - FIX: getGenericYouth_ uses row-based GC-{N} IDs when PopID/ID column absent
 * - FIX: getGenericYouth_ builds name from First+Last (Generic_Citizens has no Name col)
 *
 * v1.2 Fixes:
 * - FIX: No longer creates fake IDs (GEN-N, NAM-N) for citizens without PopID
 * - FIX: getNamedYouth_ now checks POPID column name variant
 * - FIX: Skips rows without valid citizen IDs instead of generating fake ones
 * - FIX: Better name handling (First+Last fallback)
 *
 * v1.1 Enhancements:
 * - crimeMetrics v1.2 integration: QoL-aware probability modifiers
 * - Low-QoL neighborhoods generate more stress/resilience events
 * - Hotspot awareness for youth safety events
 *
 * @version 1.3
 * @tier 6.3
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var YOUTH_ENGINE_VERSION = '1.3';

// Event generation limits
var YOUTH_EVENT_LIMITS = {
  MAX_EVENTS_PER_CYCLE: 25,
  MAX_EVENTS_PER_NEIGHBORHOOD: 5,
  MIN_AGE: 5,
  MAX_AGE: 22
};

// Event probability by school level
var YOUTH_EVENT_PROBS = {
  elementary: 0.15,   // 15% of elementary students get events
  middle: 0.2,        // 20% of middle schoolers
  high: 0.25,         // 25% of high schoolers
  college: 0.15       // 15% of college students
};

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Run the youth events engine.
 * Called during Phase 5 (citizens).
 *
 * @param {Object} ctx - Engine context
 * @return {Array} Generated events
 */
function runYouthEngine_(ctx) {
  var ss = ctx.ss;
  var S = ctx.summary || {};
  var cycle = S.absoluteCycle || 0;
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  // Ensure schema exists
  if (typeof ensureYouthEventsSchema_ === 'function') {
    ensureYouthEventsSchema_(ss);
  }

  // Get calendar context
  var now = ctx.now || new Date();
  var month = now.getMonth() + 1;
  var season = S.season || 'spring';

  // v1.1: Get crimeMetrics context for QoL awareness
  var crimeMetrics = S.crimeMetrics || {};
  var neighborhoodCrime = crimeMetrics.neighborhoodBreakdown || {};
  var crimeHotspots = crimeMetrics.hotspots || [];

  function getNeighborhoodQoL_(nh) {
    if (neighborhoodCrime[nh] && typeof neighborhoodCrime[nh].qualityOfLifeIndex === 'number') {
      return neighborhoodCrime[nh].qualityOfLifeIndex;
    }
    return crimeMetrics.qualityOfLifeIndex || 0.5;
  }

  // Get demographics for youth populations
  var demographics = {};
  if (typeof getNeighborhoodDemographics_ === 'function') {
    demographics = getNeighborhoodDemographics_(ss);
  }

  // Get generic citizens (potential youth)
  var genericCitizens = getGenericYouth_(ss);

  // Get named citizens who are youth
  var namedYouth = getNamedYouth_(ss);

  // Combine youth pools
  var allYouth = namedYouth.concat(genericCitizens);

  // Generate events
  var events = [];
  var eventsPerNeighborhood = {};
  var totalEvents = 0;

  // Shuffle youth for variety
  allYouth = shuffleYouth_(allYouth, rng);

  for (var i = 0; i < allYouth.length && totalEvents < YOUTH_EVENT_LIMITS.MAX_EVENTS_PER_CYCLE; i++) {
    var youth = allYouth[i];
    var neighborhood = youth.neighborhood || 'Downtown';

    // Check neighborhood limit
    eventsPerNeighborhood[neighborhood] = eventsPerNeighborhood[neighborhood] || 0;
    if (eventsPerNeighborhood[neighborhood] >= YOUTH_EVENT_LIMITS.MAX_EVENTS_PER_NEIGHBORHOOD) {
      continue;
    }

    // Determine probability based on school level
    var level = getSchoolLevel_(youth.age);
    var prob = YOUTH_EVENT_PROBS[level] || 0.15;

    // Adjust by season
    prob = adjustProbByCalendar_(prob, month, season);

    // v1.1: Adjust by neighborhood QoL
    var nhQoL = getNeighborhoodQoL_(neighborhood);
    var isHotspot = crimeHotspots.indexOf(neighborhood) >= 0;
    if (nhQoL <= 0.35) {
      prob *= 1.15; // More events in stressed neighborhoods (resilience stories)
    } else if (nhQoL >= 0.75) {
      prob *= 1.05; // Slightly more in thriving neighborhoods
    }
    if (isHotspot) {
      prob *= 1.1; // Youth in hotspots have more notable events
    }

    // Roll for event
    if (rng() < prob) {
      // v1.1: Pass QoL context to event generator
      var qolContext = { qol: nhQoL, isHotspot: isHotspot };
      var event = generateYouthEventForCitizen_(youth, month, rng, qolContext);
      if (event) {
        // v1.1: Tag event with QoL context
        event.qolContext = qolContext;
        events.push(event);
        eventsPerNeighborhood[neighborhood]++;
        totalEvents++;
      }
    }
  }

  // Generate school-wide events
  var schoolEvents = generateSchoolWideEvents_(ctx, month, rng);
  for (var s = 0; s < schoolEvents.length; s++) {
    events.push(schoolEvents[s]);
  }

  // Record events
  if (events.length > 0 && typeof batchRecordYouthEvents_ === 'function') {
    batchRecordYouthEvents_(ctx, events);
  }

  // Store in summary for Phase 6
  S.youthEvents = {
    generated: events.length,
    cycle: cycle,
    byType: countYouthEventsByType_(events),
    byLevel: countYouthEventsByLevel_(events)
  };

  // Add to life history log for named youth
  var namedEvents = events.filter(function(e) {
    return e.youthId && e.youthId.indexOf('GEN-') !== 0;
  });

  if (namedEvents.length > 0) {
    recordYouthLifeHistory_(ctx, namedEvents);
  }

  return events;
}

// ============================================================================
// YOUTH RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get generic citizens who are youth-aged.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @return {Array}
 */
function getGenericYouth_(ss) {
  var sheet = ss.getSheetByName('Generic_Citizens');
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };

  var iId = idx('PopID') !== -1 ? idx('PopID') : idx('ID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iName = idx('Name');
  var iAge = idx('Age');
  var iNeighborhood = idx('Neighborhood');
  var iStatus = idx('Status');

  // v1.3: Generic_Citizens may not have a PopID/ID column.
  // Use row-based synthetic ID (GC-{row}) when no ID column exists.
  var hasIdCol = (iId >= 0);

  var result = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var age = Number(row[iAge]) || 0;
    var status = String(row[iStatus] || '').toLowerCase();

    // Build citizen ID: use PopID/ID column if available, otherwise row-based
    var citizenId = hasIdCol ? String(row[iId] || '').trim() : '';
    if (!citizenId) {
      citizenId = 'GC-' + (r + 2); // row index (1-based, +1 for header)
    }

    // Build name: try Name, then First+Last
    var citizenName = '';
    if (iName >= 0 && row[iName]) {
      citizenName = String(row[iName]);
    } else if (iFirst >= 0 || iLast >= 0) {
      var first = iFirst >= 0 ? String(row[iFirst] || '') : '';
      var last = iLast >= 0 ? String(row[iLast] || '') : '';
      citizenName = (first + ' ' + last).trim();
    }

    if (age >= YOUTH_EVENT_LIMITS.MIN_AGE && age <= YOUTH_EVENT_LIMITS.MAX_AGE && status !== 'deceased') {
      result.push({
        id: citizenId,
        name: citizenName,
        age: age,
        neighborhood: String(row[iNeighborhood] || ''),
        source: 'generic'
      });
    }
  }

  return result;
}

/**
 * Get named citizens who are youth-aged.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @return {Array}
 */
function getNamedYouth_(ss) {
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };

  var iId = idx('PopID') !== -1 ? idx('PopID') : idx('POPID');
  if (iId < 0) iId = idx('ID');
  var iName = idx('Name');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iAge = idx('Age');
  var iBirthYear = idx('BirthYear');
  var iNeighborhood = idx('Neighborhood');
  var iStatus = idx('Status');

  // v1.2 FIX: Require valid ID column
  if (iId < 0) {
    Logger.log('getNamedYouth_: No PopID, POPID, or ID column found in Simulation_Ledger');
    return [];
  }

  // v1.3: Compute current simulation year for age calculation from BirthYear
  var currentYear = 2041; // Simulation year — aligned with roster intake

  var result = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    // v1.3: Compute age from BirthYear if Age column doesn't exist
    var age = 0;
    if (iAge >= 0 && row[iAge]) {
      age = Number(row[iAge]) || 0;
    } else if (iBirthYear >= 0 && row[iBirthYear]) {
      age = currentYear - (Number(row[iBirthYear]) || currentYear);
    }
    var status = String(row[iStatus] || '').toLowerCase();
    var citizenId = String(row[iId] || '').trim();

    // v1.2 FIX: Skip rows without valid citizen ID
    if (!citizenId) {
      continue;
    }

    // Get name - try Name first, then First+Last
    var citizenName = '';
    if (iName >= 0 && row[iName]) {
      citizenName = String(row[iName]);
    } else if (iFirst >= 0 || iLast >= 0) {
      var first = iFirst >= 0 ? String(row[iFirst] || '') : '';
      var last = iLast >= 0 ? String(row[iLast] || '') : '';
      citizenName = (first + ' ' + last).trim();
    }

    if (age >= YOUTH_EVENT_LIMITS.MIN_AGE && age <= YOUTH_EVENT_LIMITS.MAX_AGE && status !== 'deceased') {
      result.push({
        id: citizenId,
        name: citizenName,
        age: age,
        neighborhood: String(row[iNeighborhood] || ''),
        source: 'named'
      });
    }
  }

  return result;
}

// ============================================================================
// EVENT GENERATION
// ============================================================================

/**
 * Generate an event for a specific youth.
 *
 * @param {Object} youth - { id, name, age, neighborhood }
 * @param {number} month
 * @param {Function} rng
 * @param {Object} qolContext - v1.1: { qol, isHotspot }
 * @return {Object|null}
 */
function generateYouthEventForCitizen_(youth, month, rng, qolContext) {
  qolContext = qolContext || { qol: 0.5, isHotspot: false };

  // Get school assignment
  var school = null;
  if (typeof assignSchoolForYouth_ === 'function') {
    school = assignSchoolForYouth_(youth.age, youth.neighborhood, rng);
  }

  // Select event type
  var eventType = 'academic';
  if (typeof selectYouthEventType_ === 'function') {
    eventType = selectYouthEventType_(youth.age, month, rng);
  }

  // v1.1: QoL-influenced event type selection
  if (qolContext.qol <= 0.35 && rng() < 0.25) {
    // Low-QoL neighborhoods: resilience/challenge events
    var stressTypes = ['resilience', 'community_support', 'safety_awareness'];
    eventType = stressTypes[Math.floor(rng() * stressTypes.length)];
  } else if (qolContext.isHotspot && rng() < 0.15) {
    eventType = 'safety_awareness';
  }

  // Get event description
  var description = '';
  if (typeof pickYouthEvent_ === 'function') {
    description = pickYouthEvent_(eventType, rng);
  } else {
    // v1.1: Fallback descriptions for new types
    if (eventType === 'resilience') {
      description = 'showed resilience amid neighborhood challenges';
    } else if (eventType === 'community_support') {
      description = 'received support from community mentors';
    } else if (eventType === 'safety_awareness') {
      description = 'participated in youth safety program';
    } else {
      description = 'youth activity';
    }
  }

  // Generate outcome
  var outcome = 'participated';
  if (typeof generateYouthOutcome_ === 'function') {
    outcome = generateYouthOutcome_(eventType, rng);
  }

  return {
    youthName: youth.name,
    youthId: youth.id,
    age: youth.age,
    eventType: eventType,
    description: description,
    school: school ? school.name : '',
    neighborhood: youth.neighborhood,
    outcome: outcome,
    status: 'occurred',
    source: youth.source
  };
}

/**
 * Generate school-wide events (not tied to individuals).
 *
 * @param {Object} ctx
 * @param {number} month
 * @param {Function} rng
 * @return {Array}
 */
function generateSchoolWideEvents_(ctx, month, rng) {
  var events = [];
  var calendar = ACADEMIC_CALENDAR ? ACADEMIC_CALENDAR[month] : null;

  if (!calendar) return events;

  var period = calendar.period;
  var seasonalEvents = calendar.events || [];

  // Major school events during key periods
  if (period === 'graduation' && rng() < 0.8) {
    var highSchools = OAKLAND_SCHOOLS ? OAKLAND_SCHOOLS.high : [];
    for (var h = 0; h < highSchools.length; h++) {
      if (rng() < 0.5) {
        events.push({
          youthName: 'Class of ' + (new Date().getFullYear()),
          youthId: 'SCHOOL-' + highSchools[h].name.replace(/\s/g, '-'),
          age: 18,
          eventType: 'coming_of_age',
          description: 'graduation ceremony at ' + highSchools[h].name,
          school: highSchools[h].name,
          neighborhood: highSchools[h].neighborhood,
          outcome: 'celebrated',
          status: 'school_event'
        });
      }
    }
  }

  // Fall sports season kickoff
  if (period === 'fall_start' && rng() < 0.6) {
    events.push({
      youthName: 'Oakland Unified',
      youthId: 'SCHOOL-OUSD',
      age: 0,
      eventType: 'sports',
      description: 'fall sports season begins across Oakland schools',
      school: 'Oakland Unified',
      neighborhood: 'Downtown',
      outcome: 'announced',
      status: 'school_event'
    });
  }

  // Homecoming season
  if (period === 'fall' && rng() < 0.7) {
    var homecomingSchool = OAKLAND_SCHOOLS.high[Math.floor(rng() * OAKLAND_SCHOOLS.high.length)];
    events.push({
      youthName: homecomingSchool.name + ' community',
      youthId: 'SCHOOL-' + homecomingSchool.name.replace(/\s/g, '-'),
      age: 0,
      eventType: 'coming_of_age',
      description: 'homecoming celebration at ' + homecomingSchool.name,
      school: homecomingSchool.name,
      neighborhood: homecomingSchool.neighborhood,
      outcome: 'celebrated',
      status: 'school_event'
    });
  }

  return events;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get school level from age.
 *
 * @param {number} age
 * @return {string}
 */
function getSchoolLevel_(age) {
  if (age >= 5 && age <= 10) return 'elementary';
  if (age >= 11 && age <= 13) return 'middle';
  if (age >= 14 && age <= 17) return 'high';
  if (age >= 18 && age <= 22) return 'college';
  return 'elementary';
}

/**
 * Adjust event probability by calendar period.
 *
 * @param {number} baseProb
 * @param {number} month
 * @param {string} season
 * @return {number}
 */
function adjustProbByCalendar_(baseProb, month, season) {
  var calendar = ACADEMIC_CALENDAR ? ACADEMIC_CALENDAR[month] : null;

  if (!calendar) return baseProb;

  var period = calendar.period;

  // More events during key periods
  if (period === 'graduation' || period === 'end_of_year') {
    return baseProb * 1.5;
  }
  if (period === 'fall_start' || period === 'fall') {
    return baseProb * 1.3;
  }
  if (period === 'summer') {
    return baseProb * 0.7; // Fewer school events in summer
  }

  return baseProb;
}

/**
 * Shuffle array of youth.
 *
 * @param {Array} arr
 * @param {Function} rng
 * @return {Array}
 */
function shuffleYouth_(arr, rng) {
  var result = arr.slice();
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Count events by type.
 *
 * @param {Array} events
 * @return {Object}
 */
function countYouthEventsByType_(events) {
  var counts = {};
  for (var i = 0; i < events.length; i++) {
    var type = events[i].eventType || 'other';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

/**
 * Count events by school level.
 *
 * @param {Array} events
 * @return {Object}
 */
function countYouthEventsByLevel_(events) {
  var counts = { elementary: 0, middle: 0, high: 0, college: 0, school_event: 0 };
  for (var i = 0; i < events.length; i++) {
    var age = events[i].age || 0;
    var status = events[i].status || '';

    if (status === 'school_event') {
      counts.school_event++;
    } else {
      var level = getSchoolLevel_(age);
      counts[level]++;
    }
  }
  return counts;
}

/**
 * Record youth events to life history log for named citizens.
 *
 * @param {Object} ctx
 * @param {Array} events
 */
function recordYouthLifeHistory_(ctx, events) {
  var cycle = (ctx.summary && ctx.summary.absoluteCycle) || 0;
  var timestamp = ctx.now || new Date();

  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    if (typeof queueAppendIntent_ === 'function') {
      queueAppendIntent_(ctx, 'LifeHistory_Log', [
        timestamp,
        e.youthId,
        e.youthName,
        'youth-' + e.eventType,
        e.description + ' (' + e.outcome + ')',
        e.neighborhood,
        cycle
      ], 'youth life history', 'citizens', 100);
    }
  }
}

// ============================================================================
// STORY SIGNALS FOR PHASE 6
// ============================================================================

/**
 * Get story signals from youth events.
 *
 * @param {Object} ctx
 * @return {Array}
 */
function getYouthStorySignals_(ctx) {
  var S = ctx.summary || {};
  var youthData = S.youthEvents || {};
  var byType = youthData.byType || {};
  var byLevel = youthData.byLevel || {};

  var signals = [];

  // Graduation stories (high priority in May/June)
  if (byType.coming_of_age >= 3) {
    signals.push({
      type: 'youth_milestone',
      priority: 3,
      headline: 'Oakland youth celebrate milestones',
      desk: 'education',
      data: { count: byType.coming_of_age }
    });
  }

  // Academic achievement cluster
  if (byType.academic >= 4) {
    signals.push({
      type: 'youth_academic',
      priority: 2,
      headline: 'Students excel across Oakland schools',
      desk: 'education',
      data: { count: byType.academic }
    });
  }

  // Youth sports coverage
  if (byType.sports >= 3) {
    signals.push({
      type: 'youth_sports',
      priority: 2,
      headline: 'Youth athletics update',
      desk: 'sports',
      data: { count: byType.sports }
    });
  }

  // Civic participation (notable)
  if (byType.civic_participation >= 2) {
    signals.push({
      type: 'youth_civic',
      priority: 3,
      headline: 'Youth voices heard in Oakland civic life',
      desk: 'metro',
      data: { count: byType.civic_participation }
    });
  }

  // Arts & culture
  if (byType.arts >= 3) {
    signals.push({
      type: 'youth_arts',
      priority: 2,
      headline: 'Young artists shine',
      desk: 'culture',
      data: { count: byType.arts }
    });
  }

  return signals;
}
