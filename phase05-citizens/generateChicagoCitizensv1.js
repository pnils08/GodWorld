/**
 * ============================================================================
 * CHICAGO GENERIC CITIZEN GENERATOR v1.0
 * ============================================================================
 * 
 * Creates and maintains a Chicago citizen pool for Media Room reference.
 * Separate from Oakland — no cross-contamination.
 * 
 * INTEGRATION:
 * Add to Phase 8 in runWorldCycle():
 *   generateChicagoCitizens_(ctx);
 * 
 * Run before saveV3Chicago_() so citizens are available for Chicago feed.
 * 
 * ============================================================================
 */


/**
 * Main function — generates and maintains Chicago citizen pool
 */
function generateChicagoCitizens_(ctx) {
  
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount || 0;
  
  // Get or create Chicago_Citizens sheet
  var sheet = ss.getSheetByName('Chicago_Citizens');
  if (!sheet) {
    sheet = createChicagoCitizensSheet_(ss);
    Logger.log('generateChicagoCitizens_: Created Chicago_Citizens sheet');
  }
  
  // Load existing citizens
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var citizens = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {  // Has CitizenId
      citizens.push({
        row: i + 1,
        citizenId: data[i][0],
        name: data[i][1],
        age: data[i][2],
        gender: data[i][3],
        neighborhood: data[i][4],
        occupation: data[i][5],
        tier: data[i][6],
        createdCycle: data[i][7],
        lastActive: data[i][8],
        status: data[i][9]
      });
    }
  }
  
  var activeCitizens = citizens.filter(function(c) { return c.status === 'active'; });
  var targetPool = 75;  // Target 50-100, aim for 75
  var minPool = 50;
  var maxPool = 100;
  
  Logger.log('generateChicagoCitizens_: Current pool = ' + activeCitizens.length);
  
  // SEED: If pool too small, generate citizens
  if (activeCitizens.length < minPool) {
    var needed = targetPool - activeCitizens.length;
    Logger.log('generateChicagoCitizens_: Seeding ' + needed + ' citizens');
    
    var newCitizens = [];
    for (var n = 0; n < needed; n++) {
      newCitizens.push(generateChicagoCitizen_(cycle));
    }
    
    // Write new citizens
    for (var w = 0; w < newCitizens.length; w++) {
      var c = newCitizens[w];
      sheet.appendRow([
        c.citizenId,
        c.name,
        c.age,
        c.gender,
        c.neighborhood,
        c.occupation,
        c.tier,
        c.createdCycle,
        c.lastActive,
        c.status
      ]);
    }
    
    activeCitizens = activeCitizens.concat(newCitizens);
  }
  
  // MAINTAIN: Add 2-5 new citizens per cycle if below target
  else if (activeCitizens.length < targetPool) {
    var toAdd = Math.floor(Math.random() * 4) + 2;  // 2-5
    Logger.log('generateChicagoCitizens_: Adding ' + toAdd + ' citizens');
    
    for (var a = 0; a < toAdd; a++) {
      var newC = generateChicagoCitizen_(cycle);
      sheet.appendRow([
        newC.citizenId,
        newC.name,
        newC.age,
        newC.gender,
        newC.neighborhood,
        newC.occupation,
        newC.tier,
        newC.createdCycle,
        newC.lastActive,
        newC.status
      ]);
      activeCitizens.push(newC);
    }
  }
  
  // CHURN: Remove 0-2 citizens per cycle if above minimum (moved away)
  if (activeCitizens.length > minPool + 5) {
    var toRemove = Math.floor(Math.random() * 3);  // 0-2
    if (toRemove > 0) {
      Logger.log('generateChicagoCitizens_: Removing ' + toRemove + ' citizens (moved away)');
      
      // Mark random citizens as inactive
      var removeIndices = [];
      while (removeIndices.length < toRemove && removeIndices.length < activeCitizens.length - minPool) {
        var idx = Math.floor(Math.random() * activeCitizens.length);
        if (removeIndices.indexOf(idx) === -1) {
          removeIndices.push(idx);
        }
      }
      
      for (var r = 0; r < removeIndices.length; r++) {
        var citizen = activeCitizens[removeIndices[r]];
        if (citizen.row) {
          sheet.getRange(citizen.row, 10).setValue('inactive');  // Status column
        }
      }
    }
  }
  
  // Reload active citizens after changes
  data = sheet.getDataRange().getValues();
  var finalCitizens = [];
  for (var f = 1; f < data.length; f++) {
    if (data[f][0] && data[f][9] === 'active') {
      finalCitizens.push({
        citizenId: data[f][0],
        name: data[f][1],
        age: data[f][2],
        gender: data[f][3],
        neighborhood: data[f][4],
        occupation: data[f][5],
        tier: data[f][6]
      });
    }
  }
  
  // Store in context for Chicago feed
  ctx.summary.chicagoCitizens = finalCitizens;
  ctx.summary.chicagoPopulation = finalCitizens.length;
  
  Logger.log('generateChicagoCitizens_: Final pool = ' + finalCitizens.length);
  
  return finalCitizens;
}


/**
 * Create Chicago_Citizens sheet with headers
 */
function createChicagoCitizensSheet_(ss) {
  var sheet = ss.insertSheet('Chicago_Citizens');
  sheet.appendRow([
    'CitizenId',
    'Name',
    'Age',
    'Gender',
    'Neighborhood',
    'Occupation',
    'Tier',
    'CreatedCycle',
    'LastActive',
    'Status'
  ]);
  sheet.setFrozenRows(1);
  return sheet;
}


/**
 * Generate a single Chicago citizen
 */
function generateChicagoCitizen_(cycle) {
  
  var gender = Math.random() < 0.5 ? 'M' : 'F';
  var firstName = gender === 'M' ? pickRandom_(CHICAGO_FIRST_NAMES_M_) : pickRandom_(CHICAGO_FIRST_NAMES_F_);
  var lastName = pickRandom_(CHICAGO_LAST_NAMES_);
  
  var neighborhood = pickWeightedRandom_(CHICAGO_NEIGHBORHOODS_);
  var occupation = getChicagoOccupation_(neighborhood);
  var age = generateAge_();
  var tier = generateTier_();
  
  return {
    citizenId: 'CHI-' + generateId_(),
    name: firstName + ' ' + lastName,
    age: age,
    gender: gender,
    neighborhood: neighborhood,
    occupation: occupation,
    tier: tier,
    createdCycle: cycle,
    lastActive: cycle,
    status: 'active'
  };
}


/**
 * Generate age with realistic distribution
 */
function generateAge_() {
  // Weighted toward working age
  var roll = Math.random();
  if (roll < 0.05) return Math.floor(Math.random() * 10) + 18;       // 18-27: 5%
  if (roll < 0.30) return Math.floor(Math.random() * 10) + 25;       // 25-34: 25%
  if (roll < 0.55) return Math.floor(Math.random() * 10) + 35;       // 35-44: 25%
  if (roll < 0.75) return Math.floor(Math.random() * 10) + 45;       // 45-54: 20%
  if (roll < 0.90) return Math.floor(Math.random() * 10) + 55;       // 55-64: 15%
  return Math.floor(Math.random() * 15) + 65;                         // 65-79: 10%
}


/**
 * Generate tier (most are Tier 4)
 */
function generateTier_() {
  var roll = Math.random();
  if (roll < 0.70) return 4;   // 70% Tier 4
  if (roll < 0.90) return 3;   // 20% Tier 3
  if (roll < 0.98) return 2;   // 8% Tier 2
  return 1;                     // 2% Tier 1
}


/**
 * Get occupation weighted by neighborhood
 */
function getChicagoOccupation_(neighborhood) {
  var occupations = CHICAGO_OCCUPATIONS_BY_NEIGHBORHOOD_[neighborhood];
  if (!occupations) {
    occupations = CHICAGO_OCCUPATIONS_DEFAULT_;
  }
  return pickRandom_(occupations);
}


/**
 * pickRandom_() moved to utilities/utilityFunctions.js (v2.9 consolidation)
 */


/**
 * Pick weighted random from object {name: weight}
 */
function pickWeightedRandom_(weightedObj) {
  var items = [];
  var weights = [];
  var total = 0;
  
  for (var key in weightedObj) {
    items.push(key);
    weights.push(weightedObj[key]);
    total += weightedObj[key];
  }
  
  var roll = Math.random() * total;
  var cumulative = 0;
  
  for (var i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (roll <= cumulative) {
      return items[i];
    }
  }
  
  return items[items.length - 1];
}


/**
 * Generate unique ID
 */
function generateId_() {
  var chars = '0123456789ABCDEF';
  var id = '';
  for (var i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * 16)];
  }
  return id;
}


// ════════════════════════════════════════════════════════════════════════════
// CHICAGO DATA POOLS
// ════════════════════════════════════════════════════════════════════════════

var CHICAGO_NEIGHBORHOODS_ = {
  'Loop': 15,
  'River North': 12,
  'Wicker Park': 10,
  'Lincoln Park': 12,
  'Pilsen': 8,
  'Hyde Park': 10,
  'Bronzeville': 8,
  'Chinatown': 5,
  'South Shore': 10,
  'Oak Park': 10
};

var CHICAGO_FIRST_NAMES_M_ = [
  'James', 'Michael', 'David', 'Marcus', 'Anthony',
  'DeShawn', 'Carlos', 'Wei', 'Jamal', 'Patrick',
  'Brian', 'Kevin', 'Terrence', 'Jose', 'William',
  'Andre', 'Raymond', 'Daryl', 'Miguel', 'Jerome',
  'Kenneth', 'Robert', 'Thomas', 'Christopher', 'Daniel',
  'Eric', 'Malik', 'Tyrone', 'Vincent', 'Ricardo',
  'Howard', 'Leroy', 'Darnell', 'Omar', 'Felix',
  'Rashid', 'Clarence', 'Emmanuel', 'Corey', 'Derek'
];

var CHICAGO_FIRST_NAMES_F_ = [
  'Jessica', 'Michelle', 'Keisha', 'Maria', 'Tanya',
  'Linda', 'Patricia', 'Carmen', 'Mei', 'Angela',
  'Brenda', 'Latoya', 'Jennifer', 'Stephanie', 'Nicole',
  'Yolanda', 'Rosa', 'Denise', 'Crystal', 'Tamara',
  'Sandra', 'Lisa', 'Diane', 'Jasmine', 'Monica',
  'Vanessa', 'Alejandra', 'Tiffany', 'Rochelle', 'Kimberly',
  'Lakisha', 'Yvonne', 'Fatima', 'Ebony', 'Priscilla',
  'Sheryl', 'Wendy', 'Adriana', 'Dominique', 'Renee'
];

var CHICAGO_LAST_NAMES_ = [
  'Johnson', 'Williams', 'Jones', 'Brown', 'Davis',
  'Jackson', 'Wilson', 'Anderson', 'Thomas', 'Garcia',
  'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis',
  'Lee', 'Walker', 'Hall', 'Allen', 'Young',
  'Hernandez', 'King', 'Wright', 'Lopez', 'Hill',
  'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez',
  'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts',
  'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans',
  'Chen', 'Washington', 'Murphy', 'Rivera', 'Cook',
  'Rogers', 'Morgan', 'Peterson', 'Cooper', 'Reed',
  'Bailey', 'Bell', 'Gomez', 'Kelly', 'Howard',
  'Ward', 'Cox', 'Diaz', 'Richardson', 'Wood'
];

var CHICAGO_OCCUPATIONS_BY_NEIGHBORHOOD_ = {
  'Loop': [
    'Financial Analyst', 'Corporate Attorney', 'Investment Banker', 'Accountant',
    'Marketing Executive', 'Insurance Broker', 'Management Consultant', 'HR Director',
    'Office Manager', 'Executive Assistant', 'Security Guard', 'Janitor'
  ],
  'River North': [
    'Restaurant Manager', 'Chef', 'Bartender', 'Art Gallery Owner',
    'Real Estate Agent', 'Tech Startup Founder', 'Graphic Designer', 'Photographer',
    'Hotel Concierge', 'Event Planner', 'DJ', 'Server'
  ],
  'Wicker Park': [
    'Musician', 'Artist', 'Tattoo Artist', 'Vintage Shop Owner',
    'Coffee Shop Barista', 'Web Developer', 'Freelance Writer', 'Yoga Instructor',
    'Record Store Clerk', 'Brewery Worker', 'Bike Messenger', 'Social Worker'
  ],
  'Lincoln Park': [
    'Physician', 'Nurse', 'Physical Therapist', 'Dentist',
    'Professor', 'Elementary Teacher', 'Architect', 'Attorney',
    'Financial Planner', 'Veterinarian', 'Personal Trainer', 'Nanny'
  ],
  'Pilsen': [
    'Muralist', 'Gallery Curator', 'Community Organizer', 'Teacher',
    'Restaurant Owner', 'Baker', 'Auto Mechanic', 'Construction Worker',
    'Social Worker', 'Nonprofit Director', 'Street Vendor', 'Carpenter'
  ],
  'Hyde Park': [
    'University Professor', 'Graduate Student', 'Research Scientist', 'Librarian',
    'Museum Curator', 'Book Store Owner', 'Campus Security', 'Administrator',
    'Policy Analyst', 'Economist', 'Archivist', 'Teaching Assistant'
  ],
  'Bronzeville': [
    'Jazz Musician', 'Gospel Singer', 'Barbershop Owner', 'Soul Food Chef',
    'Real Estate Developer', 'Community Pastor', 'Historian', 'Photographer',
    'Nurse', 'Bus Driver', 'Teacher', 'Small Business Owner'
  ],
  'Chinatown': [
    'Restaurant Owner', 'Dim Sum Chef', 'Herbalist', 'Import/Export Trader',
    'Grocery Store Owner', 'Acupuncturist', 'Bakery Owner', 'Jewelry Maker',
    'Tour Guide', 'Translator', 'Bank Teller', 'Accountant'
  ],
  'South Shore': [
    'Postal Worker', 'CTA Bus Driver', 'Teacher', 'Nurse',
    'Security Guard', 'Hair Stylist', 'Church Deacon', 'Grocery Store Clerk',
    'Home Health Aide', 'Electrician', 'Plumber', 'Daycare Provider'
  ],
  'Oak Park': [
    'Architect', 'Urban Planner', 'High School Teacher', 'Librarian',
    'Small Business Owner', 'Therapist', 'Realtor', 'Insurance Agent',
    'Graphic Designer', 'Writer', 'Nonprofit Manager', 'Retired Professional'
  ]
};

var CHICAGO_OCCUPATIONS_DEFAULT_ = [
  'Teacher', 'Nurse', 'Office Worker', 'Retail Clerk',
  'Bus Driver', 'Cook', 'Security Guard', 'Janitor',
  'Hair Stylist', 'Mechanic', 'Cashier', 'Warehouse Worker'
];


// ════════════════════════════════════════════════════════════════════════════
// STANDALONE TEST FUNCTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Test function — run manually to verify generation
 */
function testChicagoCitizenGeneration_() {
  Logger.log('=== CHICAGO CITIZEN TEST ===');
  
  for (var i = 0; i < 10; i++) {
    var c = generateChicagoCitizen_(69);
    Logger.log(c.name + ' | ' + c.age + ' | ' + c.gender + ' | ' + c.neighborhood + ' | ' + c.occupation + ' | Tier ' + c.tier);
  }
  
  Logger.log('=== END TEST ===');
}