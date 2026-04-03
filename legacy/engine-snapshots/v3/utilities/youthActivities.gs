/**
 * youthActivities.js
 *
 * Youth and next generation activities data.
 * Provides school activities, youth sports, coming-of-age moments.
 *
 * Youth are citizens aged 5-22 (students in Neighborhood_Demographics).
 *
 * @version 1.0
 * @tier 6.3
 */

// ============================================================================
// SCHEMA DEFINITION (Append-Safe)
// ============================================================================

var YOUTH_EVENTS_HEADERS = [
  'Timestamp',
  'Cycle',
  'YouthName',
  'YouthID',
  'Age',
  'EventType',
  'EventDescription',
  'School',
  'Neighborhood',
  'Outcome',
  'Status'
];

var YOUTH_EVENTS_SHEET_NAME = 'Youth_Events';

// ============================================================================
// OAKLAND SCHOOLS
// ============================================================================

var OAKLAND_SCHOOLS = {
  elementary: [
    { name: 'Chabot Elementary', neighborhood: 'Rockridge', enrollment: 450, character: 'high-performing' },
    { name: 'Crocker Highlands Elementary', neighborhood: 'Grand Lake', enrollment: 380, character: 'diverse' },
    { name: 'Grass Valley Elementary', neighborhood: 'Montclair', enrollment: 320, character: 'hillside community' },
    { name: 'Garfield Elementary', neighborhood: 'Fruitvale', enrollment: 520, character: 'bilingual programs' },
    { name: 'Manzanita Community', neighborhood: 'Temescal', enrollment: 400, character: 'arts focus' },
    { name: 'Lincoln Elementary', neighborhood: 'Chinatown', enrollment: 480, character: 'dual immersion' },
    { name: 'MLK Elementary', neighborhood: 'West Oakland', enrollment: 350, character: 'community anchor' },
    { name: 'Hoover Elementary', neighborhood: 'East Oakland', enrollment: 410, character: 'neighborhood pride' }
  ],
  middle: [
    { name: 'Edna Brewer Middle', neighborhood: 'Grand Lake', enrollment: 650, character: 'arts magnet' },
    { name: 'Claremont Middle', neighborhood: 'Rockridge', enrollment: 580, character: 'STEAM focus' },
    { name: 'Bret Harte Middle', neighborhood: 'Dimond', enrollment: 520, character: 'sports programs' },
    { name: 'Frick Middle', neighborhood: 'Fruitvale', enrollment: 610, character: 'diverse student body' },
    { name: 'Westlake Middle', neighborhood: 'West Oakland', enrollment: 480, character: 'transformation school' },
    { name: 'Coliseum College Prep', neighborhood: 'Coliseum', enrollment: 550, character: 'college-bound mission' }
  ],
  high: [
    { name: 'Oakland Tech High', neighborhood: 'Temescal', enrollment: 1800, character: 'flagship comprehensive' },
    { name: 'Skyline High', neighborhood: 'Montclair', enrollment: 1600, character: 'hillside campus' },
    { name: 'Oakland High', neighborhood: 'Lake Merritt', enrollment: 1400, character: 'downtown diverse' },
    { name: 'Fremont High', neighborhood: 'Elmhurst', enrollment: 1200, character: 'east side pride' },
    { name: 'McClymonds High', neighborhood: 'West Oakland', enrollment: 450, character: 'historic west oakland' },
    { name: 'Castlemont High', neighborhood: 'East Oakland', enrollment: 650, character: 'community resilience' }
  ],
  college: [
    { name: 'Mills College at Northeastern University', neighborhood: 'Glenview', enrollment: 1500, character: 'historic womens college, merged 2022' },
    { name: 'Laney College', neighborhood: 'Lake Merritt', enrollment: 14400, character: 'community college' },
    { name: 'Merritt College', neighborhood: 'Montclair', enrollment: 11000, character: 'hilltop views' }
  ]
};

// ============================================================================
// YOUTH EVENT TYPES
// ============================================================================

var YOUTH_EVENT_TYPES = {
  ACADEMIC: 'academic',
  SPORTS: 'sports',
  ARTS: 'arts',
  CIVIC: 'civic_participation',
  COMING_OF_AGE: 'coming_of_age',
  ACHIEVEMENT: 'achievement',
  CHALLENGE: 'challenge'
};

// ============================================================================
// EVENT POOLS BY TYPE
// ============================================================================

var YOUTH_EVENT_POOLS = {
  academic: [
    'honor roll recognition',
    'science fair participation',
    'spelling bee competition',
    'math olympiad qualifier',
    'debate team achievement',
    'academic decathlon preparation',
    'college application submitted',
    'scholarship application pending',
    'tutoring program participation'
  ],
  sports: [
    'youth basketball league game',
    'soccer team practice',
    'swim team competition',
    'track and field event',
    'Little League baseball game',
    'youth football program',
    'tennis lessons progress',
    'martial arts belt advancement',
    'dance team performance',
    'cheerleading tryouts'
  ],
  arts: [
    'school play audition',
    'band concert performance',
    'orchestra recital',
    'art show submission',
    'creative writing recognition',
    'choir solo opportunity',
    'photography exhibit',
    'drama club production',
    'dance recital preparation'
  ],
  civic_participation: [
    'student council election',
    'youth advisory board meeting',
    'community service project',
    'environmental club activity',
    'voter registration drive (18+)',
    'neighborhood cleanup volunteer',
    'youth commission participation',
    'school board public comment'
  ],
  coming_of_age: [
    'first day of kindergarten',
    'middle school transition',
    'high school freshman orientation',
    'drivers license obtained',
    'first job application',
    'prom attendance',
    'graduation ceremony',
    'college acceptance letter',
    'eighteenth birthday milestone',
    'moving away for college'
  ],
  achievement: [
    'perfect attendance award',
    'citizenship recognition',
    'most improved student',
    'leadership award',
    'athletic scholarship offer',
    'community service hours milestone',
    'Eagle Scout achievement',
    'Gold Award completion',
    'National Honor Society induction'
  ],
  challenge: [
    'academic probation notice',
    'attendance concerns noted',
    'behavioral intervention needed',
    'tutoring support started',
    'family transition affecting student',
    'transfer to new school',
    'health absence recovery',
    'social adjustment period'
  ]
};

// ============================================================================
// SEASONAL ACADEMIC CALENDAR
// ============================================================================

var ACADEMIC_CALENDAR = {
  1: { period: 'winter_break_return', events: ['new semester begins', 'winter sports season'] },
  2: { period: 'mid_winter', events: ['black history month', 'winter formal dances'] },
  3: { period: 'spring_prep', events: ['spring break approaching', 'standardized testing'] },
  4: { period: 'spring', events: ['spring sports', 'prom season begins'] },
  5: { period: 'end_of_year', events: ['AP exams', 'spring concerts', 'senior activities'] },
  6: { period: 'graduation', events: ['graduation ceremonies', 'summer programs begin'] },
  7: { period: 'summer', events: ['summer camp', 'summer jobs', 'college prep'] },
  8: { period: 'late_summer', events: ['back to school prep', 'fall sports tryouts'] },
  9: { period: 'fall_start', events: ['first day of school', 'fall sports season'] },
  10: { period: 'fall', events: ['homecoming', 'fall plays', 'college applications'] },
  11: { period: 'fall_end', events: ['thanksgiving break', 'early college decisions'] },
  12: { period: 'winter', events: ['winter break', 'winter concerts', 'holiday programs'] }
};

// ============================================================================
// SCHEMA MANAGEMENT
// ============================================================================

/**
 * Ensure Youth_Events sheet exists with correct headers.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @return {SpreadsheetApp.Sheet}
 */
function ensureYouthEventsSchema_(ss) {
  if (!ss) {
    throw new Error('ensureYouthEventsSchema_: spreadsheet required');
  }

  var sheet = ss.getSheetByName(YOUTH_EVENTS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(YOUTH_EVENTS_SHEET_NAME);
    sheet.appendRow(YOUTH_EVENTS_HEADERS);
    sheet.setFrozenRows(1);
    return sheet;
  }

  // Check for missing headers
  var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var missing = [];

  for (var i = 0; i < YOUTH_EVENTS_HEADERS.length; i++) {
    if (existing.indexOf(YOUTH_EVENTS_HEADERS[i]) === -1) {
      missing.push(YOUTH_EVENTS_HEADERS[i]);
    }
  }

  if (missing.length > 0) {
    var lastCol = sheet.getLastColumn();
    for (var j = 0; j < missing.length; j++) {
      sheet.getRange(1, lastCol + j + 1).setValue(missing[j]);
    }
  }

  return sheet;
}

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get schools by neighborhood.
 *
 * @param {string} neighborhood
 * @return {Array} Schools in that neighborhood (all levels)
 */
function getSchoolsInNeighborhood_(neighborhood) {
  var result = [];

  var levels = ['elementary', 'middle', 'high', 'college'];
  for (var i = 0; i < levels.length; i++) {
    var schools = OAKLAND_SCHOOLS[levels[i]] || [];
    for (var j = 0; j < schools.length; j++) {
      if (schools[j].neighborhood === neighborhood) {
        result.push({
          name: schools[j].name,
          level: levels[i],
          enrollment: schools[j].enrollment,
          character: schools[j].character,
          neighborhood: neighborhood
        });
      }
    }
  }

  return result;
}

/**
 * Get school for a youth based on age.
 *
 * @param {number} age
 * @param {string} neighborhood
 * @param {Function} rng
 * @return {Object|null} School object
 */
function assignSchoolForYouth_(age, neighborhood, rng) {
  var level = null;
  if (age >= 5 && age <= 10) {
    level = 'elementary';
  } else if (age >= 11 && age <= 13) {
    level = 'middle';
  } else if (age >= 14 && age <= 17) {
    level = 'high';
  } else if (age >= 18 && age <= 22) {
    level = 'college';
  } else {
    return null;
  }

  // First try to find a school in the neighborhood
  var localSchools = OAKLAND_SCHOOLS[level].filter(function(s) {
    return s.neighborhood === neighborhood;
  });

  if (localSchools.length > 0) {
    return localSchools[Math.floor(rng() * localSchools.length)];
  }

  // Otherwise pick any school of that level
  var allSchools = OAKLAND_SCHOOLS[level];
  if (allSchools && allSchools.length > 0) {
    return allSchools[Math.floor(rng() * allSchools.length)];
  }

  return null;
}

/**
 * Get recent youth events.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {number} cyclesBack
 * @return {Array}
 */
function getRecentYouthEvents_(ss, cyclesBack) {
  var lookback = cyclesBack || 3;
  var sheet = ss.getSheetByName(YOUTH_EVENTS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };
  var iCycle = idx('Cycle');

  var maxCycle = 0;
  for (var r = 0; r < rows.length; r++) {
    var c = Number(rows[r][iCycle]) || 0;
    if (c > maxCycle) maxCycle = c;
  }

  var result = [];
  for (var r2 = 0; r2 < rows.length; r2++) {
    var row = rows[r2];
    var cycle = Number(row[iCycle]) || 0;
    if (cycle >= maxCycle - lookback) {
      result.push({
        timestamp: row[idx('Timestamp')],
        cycle: cycle,
        youthName: String(row[idx('YouthName')] || ''),
        youthId: String(row[idx('YouthID')] || ''),
        age: Number(row[idx('Age')]) || 0,
        eventType: String(row[idx('EventType')] || ''),
        description: String(row[idx('EventDescription')] || ''),
        school: String(row[idx('School')] || ''),
        neighborhood: String(row[idx('Neighborhood')] || ''),
        outcome: String(row[idx('Outcome')] || ''),
        status: String(row[idx('Status')] || '')
      });
    }
  }

  return result;
}

/**
 * Get youth events for a specific citizen.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {string} youthId
 * @return {Array}
 */
function getYouthEventsForCitizen_(ss, youthId) {
  var sheet = ss.getSheetByName(YOUTH_EVENTS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };
  var iId = idx('YouthID');

  var result = [];
  for (var r = 0; r < rows.length; r++) {
    var id = String(rows[r][iId] || '');
    if (id === youthId) {
      result.push({
        timestamp: rows[r][idx('Timestamp')],
        cycle: Number(rows[r][idx('Cycle')]) || 0,
        eventType: String(rows[r][idx('EventType')] || ''),
        description: String(rows[r][idx('EventDescription')] || ''),
        school: String(rows[r][idx('School')] || ''),
        outcome: String(rows[r][idx('Outcome')] || '')
      });
    }
  }

  return result;
}

// ============================================================================
// EVENT RECORDING
// ============================================================================

/**
 * Record a youth event.
 *
 * @param {Object} ctx - Engine context
 * @param {Object} event - Event data
 */
function recordYouthEvent_(ctx, event) {
  var cycle = (ctx.summary && ctx.summary.absoluteCycle) || 0;
  var timestamp = ctx.now || new Date();

  var rowData = [
    timestamp,
    cycle,
    event.youthName || '',
    event.youthId || '',
    event.age || 0,
    event.eventType || '',
    event.description || '',
    event.school || '',
    event.neighborhood || '',
    event.outcome || '',
    event.status || 'occurred'
  ];

  if (typeof queueAppendIntent_ === 'function') {
    queueAppendIntent_(ctx, YOUTH_EVENTS_SHEET_NAME, rowData,
      'record youth event', 'citizens', 100);
  } else {
    var ss = ctx.ss;
    var sheet = ensureYouthEventsSchema_(ss);
    sheet.appendRow(rowData);
  }
}

/**
 * Batch record multiple youth events.
 *
 * @param {Object} ctx
 * @param {Array} events
 */
function batchRecordYouthEvents_(ctx, events) {
  if (!events || events.length === 0) return;

  var cycle = (ctx.summary && ctx.summary.absoluteCycle) || 0;
  var timestamp = ctx.now || new Date();

  var rows = [];
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    rows.push([
      timestamp,
      cycle,
      e.youthName || '',
      e.youthId || '',
      e.age || 0,
      e.eventType || '',
      e.description || '',
      e.school || '',
      e.neighborhood || '',
      e.outcome || '',
      e.status || 'occurred'
    ]);
  }

  if (typeof queueBatchAppendIntent_ === 'function') {
    queueBatchAppendIntent_(ctx, YOUTH_EVENTS_SHEET_NAME, rows,
      'batch record youth events', 'citizens', 100);
  } else {
    var ss = ctx.ss;
    var sheet = ensureYouthEventsSchema_(ss);
    for (var j = 0; j < rows.length; j++) {
      sheet.appendRow(rows[j]);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Pick an event from a pool by type.
 *
 * @param {string} eventType
 * @param {Function} rng
 * @return {string}
 */
function pickYouthEvent_(eventType, rng) {
  var pool = YOUTH_EVENT_POOLS[eventType];
  if (!pool || pool.length === 0) {
    return 'youth activity';
  }
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Get calendar period for a month.
 *
 * @param {number} month - 1-12
 * @return {Object}
 */
function getAcademicPeriod_(month) {
  return ACADEMIC_CALENDAR[month] || { period: 'general', events: ['school activities'] };
}

/**
 * Determine appropriate event type for age and time of year.
 *
 * @param {number} age
 * @param {number} month
 * @param {Function} rng
 * @return {string}
 */
function selectYouthEventType_(age, month, rng) {
  var calendar = ACADEMIC_CALENDAR[month] || {};
  var period = calendar.period || 'general';

  // Weight by period
  var weights = {
    academic: 0.2,
    sports: 0.2,
    arts: 0.15,
    civic_participation: 0.1,
    coming_of_age: 0.15,
    achievement: 0.15,
    challenge: 0.05
  };

  // Adjust weights by period
  if (period === 'graduation') {
    weights.coming_of_age = 0.4;
    weights.achievement = 0.3;
  } else if (period === 'fall_start') {
    weights.coming_of_age = 0.25;
    weights.academic = 0.25;
  } else if (period === 'spring') {
    weights.sports = 0.3;
    weights.arts = 0.25;
  } else if (period === 'end_of_year') {
    weights.academic = 0.3;
    weights.achievement = 0.25;
  }

  // Adjust by age
  if (age <= 10) {
    weights.civic_participation = 0.05;
    weights.coming_of_age = 0.1;
  } else if (age >= 14 && age <= 18) {
    weights.civic_participation = 0.15;
    weights.coming_of_age = 0.2;
  } else if (age >= 18) {
    weights.civic_participation = 0.2;
  }

  // Weighted random selection
  var types = Object.keys(weights);
  var totalWeight = 0;
  for (var i = 0; i < types.length; i++) {
    totalWeight += weights[types[i]];
  }

  var roll = rng() * totalWeight;
  var cumulative = 0;
  for (var j = 0; j < types.length; j++) {
    cumulative += weights[types[j]];
    if (roll < cumulative) {
      return types[j];
    }
  }

  return 'academic';
}

/**
 * Generate outcome for an event type.
 *
 * @param {string} eventType
 * @param {Function} rng
 * @return {string}
 */
function generateYouthOutcome_(eventType, rng) {
  if (eventType === 'challenge') {
    var outcomes = ['in progress', 'support initiated', 'monitoring'];
    return outcomes[Math.floor(rng() * outcomes.length)];
  }

  var positiveOutcomes = ['successful', 'completed', 'recognized', 'participated'];
  var roll = rng();

  if (roll < 0.6) {
    return positiveOutcomes[Math.floor(rng() * positiveOutcomes.length)];
  } else if (roll < 0.85) {
    return 'in progress';
  } else {
    return 'participated';
  }
}
