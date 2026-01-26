/**
 * ensureFaithLedger.js
 *
 * Faith and religious community data management.
 * Provides data for Elliot Graye (Faith & Ethics reporter).
 *
 * Includes:
 * - Religious organizations by neighborhood
 * - Faith-based events (services, community programs)
 * - Interfaith moments and dialogue
 *
 * @version 1.0
 * @tier 6.2
 */

// ============================================================================
// SCHEMA DEFINITION (Append-Safe)
// ============================================================================

var FAITH_LEDGER_HEADERS = [
  'Timestamp',
  'Cycle',
  'Organization',
  'FaithTradition',
  'EventType',
  'EventDescription',
  'Neighborhood',
  'Attendance',
  'Status'
];

var FAITH_ORGS_HEADERS = [
  'Organization',
  'FaithTradition',
  'Neighborhood',
  'Founded',
  'Congregation',
  'Leader',
  'Character',
  'ActiveStatus'
];

var FAITH_LEDGER_SHEET_NAME = 'Faith_Ledger';
var FAITH_ORGS_SHEET_NAME = 'Faith_Organizations';

// ============================================================================
// OAKLAND FAITH ORGANIZATIONS
// ============================================================================

/**
 * Representative religious organizations for Oakland.
 * Mix of traditions reflecting real demographics.
 */
var OAKLAND_FAITH_ORGANIZATIONS = [
  // Christian - Protestant
  {
    organization: 'First Presbyterian Church',
    tradition: 'Protestant',
    neighborhood: 'Downtown',
    founded: 1853,
    congregation: 450,
    leader: 'Rev. Margaret Chen',
    character: 'historic mainline, social justice focus'
  },
  {
    organization: 'Allen Temple Baptist Church',
    tradition: 'Baptist',
    neighborhood: 'East Oakland',
    founded: 1919,
    congregation: 3500,
    leader: 'Dr. Jacqueline Thompson',
    character: 'anchor institution, community programs'
  },
  {
    organization: 'Cathedral of Christ the Light',
    tradition: 'Catholic',
    neighborhood: 'Lake Merritt',
    founded: 2008,
    congregation: 2000,
    leader: 'Bishop Michael Barber',
    character: 'architectural landmark, diverse congregation'
  },
  {
    organization: 'St. Columba Catholic Church',
    tradition: 'Catholic',
    neighborhood: 'Fruitvale',
    founded: 1923,
    congregation: 800,
    leader: 'Fr. Ramon Torres',
    character: 'Latino community center, family focus'
  },
  {
    organization: 'Lake Merritt United Methodist',
    tradition: 'Methodist',
    neighborhood: 'Adams Point',
    founded: 1892,
    congregation: 300,
    leader: 'Rev. David Park',
    character: 'progressive, LGBTQ affirming'
  },
  {
    organization: 'Acts Full Gospel Church',
    tradition: 'Pentecostal',
    neighborhood: 'West Oakland',
    founded: 1972,
    congregation: 1200,
    leader: 'Bishop Robert Jackson Sr.',
    character: 'charismatic worship, youth outreach'
  },

  // Jewish
  {
    organization: 'Temple Sinai',
    tradition: 'Reform Jewish',
    neighborhood: 'Rockridge',
    founded: 1875,
    congregation: 700,
    leader: 'Rabbi Jacqueline Mates-Muchin',
    character: 'oldest Jewish congregation, interfaith active'
  },
  {
    organization: 'Beth Jacob Congregation',
    tradition: 'Orthodox Jewish',
    neighborhood: 'Piedmont Ave',
    founded: 1924,
    congregation: 250,
    leader: 'Rabbi Yehuda Ferris',
    character: 'traditional observance, community eruv'
  },

  // Muslim
  {
    organization: 'Islamic Center of Oakland',
    tradition: 'Muslim',
    neighborhood: 'Temescal',
    founded: 1985,
    congregation: 600,
    leader: 'Imam Abdul Rahman',
    character: 'diverse Muslim community, education focus'
  },
  {
    organization: 'Masjid Al-Islam',
    tradition: 'Muslim',
    neighborhood: 'East Oakland',
    founded: 1978,
    congregation: 400,
    leader: 'Imam Faheem Shuaibe',
    character: 'African American Muslim heritage'
  },

  // Buddhist
  {
    organization: 'Oakland Buddhist Temple',
    tradition: 'Buddhist',
    neighborhood: 'Chinatown',
    founded: 1926,
    congregation: 300,
    leader: 'Rev. Kodo Umezu',
    character: 'Jodo Shinshu, Japanese-American heritage'
  },
  {
    organization: 'East Bay Meditation Center',
    tradition: 'Buddhist',
    neighborhood: 'Downtown',
    founded: 2007,
    congregation: 500,
    leader: 'Larry Yang',
    character: 'diverse sangha, social justice dharma'
  },

  // Hindu
  {
    organization: 'Shiva Vishnu Temple',
    tradition: 'Hindu',
    neighborhood: 'Montclair',
    founded: 1990,
    congregation: 400,
    leader: 'Pandit Venkatesh Sharma',
    character: 'South Indian traditions, cultural programs'
  },

  // Sikh
  {
    organization: 'Gurdwara Sahib of Oakland',
    tradition: 'Sikh',
    neighborhood: 'Fruitvale',
    founded: 1982,
    congregation: 350,
    leader: 'Bhai Gurpreet Singh',
    character: 'langar kitchen, community service'
  },

  // Other traditions
  {
    organization: 'Kehilla Community Synagogue',
    tradition: 'Jewish Renewal',
    neighborhood: 'Grand Lake',
    founded: 1984,
    congregation: 400,
    leader: 'Rabbi Dev Noily',
    character: 'progressive, social justice'
  },
  {
    organization: 'First Unitarian Church',
    tradition: 'Unitarian',
    neighborhood: 'Lake Merritt',
    founded: 1889,
    congregation: 350,
    leader: 'Rev. Michelle Collins',
    character: 'interfaith dialogue, humanist welcome'
  }
];

// ============================================================================
// EVENT TYPES AND POOLS
// ============================================================================

var FAITH_EVENT_TYPES = {
  SERVICE: 'regular_service',
  CELEBRATION: 'holy_day',
  COMMUNITY: 'community_program',
  INTERFAITH: 'interfaith_dialogue',
  OUTREACH: 'outreach',
  CRISIS: 'crisis_response'
};

var FAITH_EVENTS_POOL = {
  regular_service: [
    'weekly service draws faithful',
    'special sermon addresses community concerns',
    'choir performance highlights service',
    'guest speaker visits congregation'
  ],
  holy_day: [
    'congregation celebrates $HOLIDAY',
    '$HOLIDAY observance brings community together',
    'special $HOLIDAY service fills sanctuary',
    'traditional $HOLIDAY rituals observed'
  ],
  community_program: [
    'food pantry serves neighbors in need',
    'youth program graduation ceremony',
    'community health fair hosted',
    'job training workshop begins new session',
    'after-school tutoring program expands',
    'seniors lunch program marks milestone'
  ],
  interfaith_dialogue: [
    'interfaith prayer breakfast brings leaders together',
    'dialogue series addresses shared concerns',
    'multi-faith service honors community',
    'religious leaders issue joint statement',
    'interfaith council meeting held'
  ],
  outreach: [
    'congregation volunteers for neighborhood cleanup',
    'clothing drive exceeds donation goals',
    'housing assistance program helps families',
    'prison ministry team visits facility',
    'street outreach team aids unhoused neighbors'
  ],
  crisis_response: [
    'congregation opens doors for community support',
    'vigil held for community healing',
    'emergency assistance fund activated',
    'pastoral counseling services expanded',
    'community grief gathering organized'
  ]
};

// Holy days by tradition (month-based approximation)
var HOLY_DAYS = {
  'Protestant': {
    1: 'Epiphany',
    4: 'Easter',
    5: 'Pentecost',
    12: 'Advent and Christmas'
  },
  'Catholic': {
    1: 'Epiphany',
    3: 'Lent',
    4: 'Easter',
    8: 'Assumption',
    11: 'All Saints',
    12: 'Advent and Christmas'
  },
  'Baptist': {
    4: 'Easter',
    11: 'Thanksgiving',
    12: 'Christmas'
  },
  'Methodist': {
    4: 'Easter',
    5: 'Pentecost',
    12: 'Christmas'
  },
  'Pentecostal': {
    4: 'Easter',
    5: 'Pentecost',
    12: 'Christmas'
  },
  'Reform Jewish': {
    3: 'Purim',
    4: 'Passover',
    9: 'Rosh Hashanah',
    10: 'Yom Kippur',
    12: 'Hanukkah'
  },
  'Orthodox Jewish': {
    3: 'Purim',
    4: 'Passover',
    5: 'Shavuot',
    9: 'Rosh Hashanah',
    10: 'Yom Kippur and Sukkot',
    12: 'Hanukkah'
  },
  'Jewish Renewal': {
    3: 'Purim',
    4: 'Passover',
    9: 'High Holy Days',
    12: 'Hanukkah'
  },
  'Muslim': {
    0: 'Ramadan',  // Variable, placeholder
    0: 'Eid al-Fitr',
    0: 'Eid al-Adha'
  },
  'Buddhist': {
    2: 'Losar (Tibetan New Year)',
    4: 'Vesak (Buddha Day)',
    7: 'Obon'
  },
  'Hindu': {
    3: 'Holi',
    8: 'Janmashtami',
    10: 'Diwali',
    11: 'Diwali celebrations continue'
  },
  'Sikh': {
    4: 'Vaisakhi',
    11: 'Guru Nanak Gurpurab'
  },
  'Unitarian': {
    4: 'Easter (Flower Communion)',
    6: 'General Assembly',
    12: 'Winter Solstice'
  }
};

// ============================================================================
// SCHEMA MANAGEMENT
// ============================================================================

/**
 * Ensure Faith_Ledger sheet exists with correct headers.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @return {SpreadsheetApp.Sheet}
 */
function ensureFaithLedgerSchema_(ss) {
  if (!ss) {
    throw new Error('ensureFaithLedgerSchema_: spreadsheet required');
  }

  var sheet = ss.getSheetByName(FAITH_LEDGER_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(FAITH_LEDGER_SHEET_NAME);
    sheet.appendRow(FAITH_LEDGER_HEADERS);
    sheet.setFrozenRows(1);
    return sheet;
  }

  // Check for missing headers
  var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var missing = [];

  for (var i = 0; i < FAITH_LEDGER_HEADERS.length; i++) {
    if (existing.indexOf(FAITH_LEDGER_HEADERS[i]) === -1) {
      missing.push(FAITH_LEDGER_HEADERS[i]);
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

/**
 * Ensure Faith_Organizations sheet exists and is seeded.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @return {SpreadsheetApp.Sheet}
 */
function ensureFaithOrgsSchema_(ss) {
  if (!ss) {
    throw new Error('ensureFaithOrgsSchema_: spreadsheet required');
  }

  var sheet = ss.getSheetByName(FAITH_ORGS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(FAITH_ORGS_SHEET_NAME);
    sheet.appendRow(FAITH_ORGS_HEADERS);
    sheet.setFrozenRows(1);

    // Seed with organizations
    var rows = [];
    for (var i = 0; i < OAKLAND_FAITH_ORGANIZATIONS.length; i++) {
      var org = OAKLAND_FAITH_ORGANIZATIONS[i];
      rows.push([
        org.organization,
        org.tradition,
        org.neighborhood,
        org.founded,
        org.congregation,
        org.leader,
        org.character,
        'active'
      ]);
    }

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, FAITH_ORGS_HEADERS.length).setValues(rows);
    }

    return sheet;
  }

  return sheet;
}

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all faith organizations.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @return {Array} Array of organization objects
 */
function getFaithOrganizations_(ss) {
  var sheet = ss.getSheetByName(FAITH_ORGS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    // Return default organizations if sheet doesn't exist
    return OAKLAND_FAITH_ORGANIZATIONS.map(function(org) {
      return {
        organization: org.organization,
        tradition: org.tradition,
        neighborhood: org.neighborhood,
        founded: org.founded,
        congregation: org.congregation,
        leader: org.leader,
        character: org.character,
        activeStatus: 'active'
      };
    });
  }

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };

  var result = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var org = String(row[idx('Organization')] || '').trim();
    if (!org) continue;

    result.push({
      organization: org,
      tradition: String(row[idx('FaithTradition')] || ''),
      neighborhood: String(row[idx('Neighborhood')] || ''),
      founded: Number(row[idx('Founded')]) || 0,
      congregation: Number(row[idx('Congregation')]) || 0,
      leader: String(row[idx('Leader')] || ''),
      character: String(row[idx('Character')] || ''),
      activeStatus: String(row[idx('ActiveStatus')] || 'active')
    });
  }

  return result;
}

/**
 * Get organizations by neighborhood.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {string} neighborhood
 * @return {Array}
 */
function getFaithOrgsByNeighborhood_(ss, neighborhood) {
  var all = getFaithOrganizations_(ss);
  return all.filter(function(org) {
    return org.neighborhood === neighborhood && org.activeStatus === 'active';
  });
}

/**
 * Get organizations by tradition.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {string} tradition
 * @return {Array}
 */
function getFaithOrgsByTradition_(ss, tradition) {
  var all = getFaithOrganizations_(ss);
  return all.filter(function(org) {
    return org.tradition === tradition && org.activeStatus === 'active';
  });
}

/**
 * Get recent faith events.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {number} cyclesBack - How many cycles to look back (default 3)
 * @return {Array}
 */
function getRecentFaithEvents_(ss, cyclesBack) {
  var lookback = cyclesBack || 3;
  var sheet = ss.getSheetByName(FAITH_LEDGER_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var rows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };
  var iCycle = idx('Cycle');

  // Find max cycle
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
        organization: String(row[idx('Organization')] || ''),
        tradition: String(row[idx('FaithTradition')] || ''),
        eventType: String(row[idx('EventType')] || ''),
        description: String(row[idx('EventDescription')] || ''),
        neighborhood: String(row[idx('Neighborhood')] || ''),
        attendance: Number(row[idx('Attendance')]) || 0,
        status: String(row[idx('Status')] || '')
      });
    }
  }

  return result;
}

// ============================================================================
// EVENT RECORDING
// ============================================================================

/**
 * Record a faith event.
 *
 * @param {Object} ctx - Engine context
 * @param {Object} event - Event data
 */
function recordFaithEvent_(ctx, event) {
  var cycle = (ctx.summary && ctx.summary.absoluteCycle) || 0;
  var timestamp = ctx.now || new Date();

  var rowData = [
    timestamp,
    cycle,
    event.organization || '',
    event.tradition || '',
    event.eventType || '',
    event.description || '',
    event.neighborhood || '',
    event.attendance || 0,
    event.status || 'occurred'
  ];

  if (typeof queueAppendIntent_ === 'function') {
    queueAppendIntent_(ctx, FAITH_LEDGER_SHEET_NAME, rowData,
      'record faith event', 'events', 100);
  } else {
    var ss = ctx.ss;
    var sheet = ensureFaithLedgerSchema_(ss);
    sheet.appendRow(rowData);
  }
}

/**
 * Batch record multiple faith events.
 *
 * @param {Object} ctx - Engine context
 * @param {Array} events - Array of event objects
 */
function batchRecordFaithEvents_(ctx, events) {
  if (!events || events.length === 0) return;

  var cycle = (ctx.summary && ctx.summary.absoluteCycle) || 0;
  var timestamp = ctx.now || new Date();

  var rows = [];
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    rows.push([
      timestamp,
      cycle,
      e.organization || '',
      e.tradition || '',
      e.eventType || '',
      e.description || '',
      e.neighborhood || '',
      e.attendance || 0,
      e.status || 'occurred'
    ]);
  }

  if (typeof queueBatchAppendIntent_ === 'function') {
    queueBatchAppendIntent_(ctx, FAITH_LEDGER_SHEET_NAME, rows,
      'batch record faith events', 'events', 100);
  } else {
    var ss = ctx.ss;
    var sheet = ensureFaithLedgerSchema_(ss);
    for (var j = 0; j < rows.length; j++) {
      sheet.appendRow(rows[j]);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get holy day for a tradition in given month.
 *
 * @param {string} tradition
 * @param {number} month - 1-12
 * @return {string|null}
 */
function getHolyDayForTradition_(tradition, month) {
  var days = HOLY_DAYS[tradition];
  if (!days) return null;
  return days[month] || null;
}

/**
 * Get a random event from a pool.
 *
 * @param {string} eventType
 * @param {Function} rng
 * @return {string}
 */
function pickFaithEvent_(eventType, rng) {
  var pool = FAITH_EVENTS_POOL[eventType];
  if (!pool || pool.length === 0) {
    return 'community gathering';
  }
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Calculate attendance based on congregation size and event type.
 *
 * @param {number} congregation
 * @param {string} eventType
 * @param {Function} rng
 * @return {number}
 */
function calculateAttendance_(congregation, eventType, rng) {
  var base = congregation * 0.3; // 30% baseline attendance

  var multipliers = {
    regular_service: 1.0,
    holy_day: 1.8,
    community_program: 0.4,
    interfaith_dialogue: 0.15,
    outreach: 0.2,
    crisis_response: 0.5
  };

  var mult = multipliers[eventType] || 1.0;
  var variance = 0.8 + (rng() * 0.4); // 80-120% variance

  return Math.round(base * mult * variance);
}

/**
 * Get leader for reporter briefing.
 *
 * @param {string} organization
 * @return {string}
 */
function getFaithLeader_(organization) {
  for (var i = 0; i < OAKLAND_FAITH_ORGANIZATIONS.length; i++) {
    if (OAKLAND_FAITH_ORGANIZATIONS[i].organization === organization) {
      return OAKLAND_FAITH_ORGANIZATIONS[i].leader;
    }
  }
  return 'congregation leader';
}
