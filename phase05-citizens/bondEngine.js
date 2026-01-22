/**
 * ============================================================================
 * BOND ENGINE V2.3
 * ============================================================================
 *
 * Manages citizen relationships with calendar awareness.
 *
 * v2.3 Enhancements:
 * - Dynamic neighborhood loading from Neighborhood_Map sheet
 * - Removed hardcoded OAKLAND_NEIGHBORHOODS_BOND array
 * - Uses ctx.cache for efficient sheet access
 *
 * v2.2 Enhancements:
 * - Festival/celebration days spark more alliance/community bonds
 * - Holiday gatherings boost neighbor bond formation
 * - Sports seasons boost sports-related rivalry formation
 * - First Friday boosts professional/cultural bonds in arts districts
 * - Creation Day boosts community/neighbor bonds
 * - Calendar-specific bond origins
 * - Calendar context in bond summary and ledger
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Fallback population of cycleActiveCitizens
 * - Citizen_Directory lookup
 * - Diagnostic logging
 *
 * DEPENDENCIES:
 * - Citizen_Directory sheet (for citizenLookup)
 * - Neighborhood_Map sheet (for neighborhood list)
 * - ctx.summary.citizenEvents OR ctx.summary.storySeeds OR eventArcs
 *
 * ============================================================================
 */


// ============================================================
// BOND TYPES & CONSTANTS
// ============================================================

var BOND_TYPES = {
  RIVALRY: 'rivalry',
  ALLIANCE: 'alliance',
  TENSION: 'tension',
  MENTORSHIP: 'mentorship',
  ROMANTIC: 'romantic',
  PROFESSIONAL: 'professional',
  NEIGHBOR: 'neighbor',
  FESTIVAL: 'festival',      // v2.2: Festival connection
  SPORTS_RIVAL: 'sports_rival' // v2.2: Sports rivalry
};

var BOND_ORIGINS = {
  CAREER_OVERLAP: 'career_overlap',
  NEIGHBORHOOD: 'neighborhood',
  ROMANTIC_TRIANGLE: 'romantic_triangle',
  IDEOLOGICAL: 'ideological',
  MENTOR_PROTEGE: 'mentor_protege',
  RANDOM_ENCOUNTER: 'random_encounter',
  ARC_PROXIMITY: 'arc_proximity',
  DOMAIN_CLUSTER: 'domain_cluster',
  // v2.2: Calendar-specific origins
  FESTIVAL_ENCOUNTER: 'festival_encounter',
  HOLIDAY_GATHERING: 'holiday_gathering',
  SPORTS_SEASON: 'sports_season',
  FIRST_FRIDAY: 'first_friday',
  CREATION_DAY: 'creation_day',
  PARADE_PROXIMITY: 'parade_proximity'
};

var BOND_STATUS = {
  ACTIVE: 'active',
  DORMANT: 'dormant',
  RESOLVED: 'resolved',
  SEVERED: 'severed'
};

// v2.3: Neighborhoods now loaded dynamically from Neighborhood_Map sheet
// See loadNeighborhoodsFromSheet_() below
var OAKLAND_NEIGHBORHOODS_BOND = null;  // Populated at runtime by runBondEngine_

// v2.2: Arts district neighborhoods
var ARTS_DISTRICT_NEIGHBORHOODS = ['Temescal', 'Uptown', 'KONO', 'Jack London'];

// v2.2: Festival neighborhoods by holiday
var FESTIVAL_NEIGHBORHOODS = {
  'OaklandPride': ['Downtown', 'Lake Merritt', 'Grand Lake', 'Uptown'],
  'ArtSoulFestival': ['Downtown', 'Jack London'],
  'LunarNewYear': ['Chinatown', 'Downtown'],
  'CincoDeMayo': ['Fruitvale', 'San Antonio'],
  'DiaDeMuertos': ['Fruitvale', 'San Antonio'],
  'Juneteenth': ['West Oakland', 'Downtown']
};


// ============================================================
// NEIGHBORHOOD LOADER (v2.3)
// ============================================================

/**
 * Loads neighborhood names from Neighborhood_Map sheet.
 * Uses ctx.cache if available, falls back to direct sheet access.
 * Returns array of neighborhood names.
 */
function loadNeighborhoodsFromSheet_(ctx) {
  var neighborhoods = [];

  // Try cache first (v2.10+)
  if (ctx.cache) {
    var cached = ctx.cache.getData('Neighborhood_Map');
    if (cached.exists && cached.values.length > 1) {
      var header = cached.header;
      var nhIdx = header.indexOf('Neighborhood');
      if (nhIdx >= 0) {
        for (var r = 1; r < cached.values.length; r++) {
          var nh = (cached.values[r][nhIdx] || '').toString().trim();
          if (nh && neighborhoods.indexOf(nh) < 0) {
            neighborhoods.push(nh);
          }
        }
      }
    }
  }

  // Fallback to direct sheet access
  if (neighborhoods.length === 0 && ctx.ss) {
    var sheet = ctx.ss.getSheetByName('Neighborhood_Map');
    if (sheet) {
      var values = sheet.getDataRange().getValues();
      if (values.length > 1) {
        var header = values[0];
        var nhIdx = header.indexOf('Neighborhood');
        if (nhIdx >= 0) {
          for (var r = 1; r < values.length; r++) {
            var nh = (values[r][nhIdx] || '').toString().trim();
            if (nh && neighborhoods.indexOf(nh) < 0) {
              neighborhoods.push(nh);
            }
          }
        }
      }
    }
  }

  // Fallback defaults if sheet is empty/missing
  if (neighborhoods.length === 0) {
    Logger.log('loadNeighborhoodsFromSheet_: No neighborhoods found, using defaults');
    neighborhoods = [
      'Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt',
      'West Oakland', 'Laurel', 'Rockridge', 'Jack London',
      'Adams Point', 'Grand Lake', 'Piedmont Ave', 'Chinatown'
    ];
  }

  return neighborhoods;
}


// ============================================================
// MAIN ENGINE
// ============================================================

function runBondEngine_(ctx) {
  var S = ctx.summary || {};

  // v2.3: Load neighborhoods dynamically from Neighborhood_Map
  OAKLAND_NEIGHBORHOODS_BOND = loadNeighborhoodsFromSheet_(ctx);
  Logger.log('runBondEngine_ v2.3: Loaded ' + OAKLAND_NEIGHBORHOODS_BOND.length + ' neighborhoods from Neighborhood_Map');

  // Initialize bonds array if needed
  ctx.summary.relationshipBonds = ctx.summary.relationshipBonds || [];

  // v2.2: Get calendar context
  var calendarContext = {
    holiday: S.holiday || 'none',
    holidayPriority: S.holidayPriority || 'none',
    isFirstFriday: S.isFirstFriday || false,
    isCreationDay: S.isCreationDay || false,
    sportsSeason: S.sportsSeason || 'off-season'
  };
  ctx.bondCalendarContext = calendarContext;
  
  // v2.1: Ensure we have the data we need
  var dataReady = ensureBondEngineData_(ctx);
  if (!dataReady) {
    Logger.log('runBondEngine_ v2.3: Insufficient data, skipping bond processing');
    return;
  }
  
  // Step 1: Update existing bonds (with calendar modifiers)
  updateExistingBonds_(ctx);
  
  // Step 2: Detect new potential bonds (with calendar awareness)
  var newBonds = detectNewBonds_(ctx);
  
  // Step 3: Add new bonds (with duplicate check)
  for (var i = 0; i < newBonds.length; i++) {
    var bond = newBonds[i];
    if (!bondExists_(ctx, bond.citizenA, bond.citizenB)) {
      ctx.summary.relationshipBonds.push(bond);
      Logger.log('runBondEngine_ v2.3: Created bond ' + bond.citizenA + ' <-> ' + bond.citizenB + ' (' + bond.bondType + ')');
    }
  }
  
  // Step 4: Check for confrontation triggers
  var confrontations = checkConfrontationTriggers_(ctx);
  ctx.summary.pendingConfrontations = confrontations;
  
  // Step 5: Apply alliance benefits
  applyAllianceBenefits_(ctx);
  
  // Step 6: Generate bond summary for packet (with calendar context)
  generateBondSummary_(ctx);
  
  Logger.log('runBondEngine_ v2.3: Complete. Total bonds: ' + ctx.summary.relationshipBonds.length + ' | Calendar: ' + calendarContext.holiday);
}


// ============================================================
// v2.1: DATA POPULATION
// ============================================================

/**
 * Ensures ctx has the data needed for bond detection.
 * Returns true if we have enough data to proceed.
 */
function ensureBondEngineData_(ctx) {
  var S = ctx.summary || {};
  var diagnostics = {
    cycleActiveCitizens: 0,
    citizenLookup: 0,
    sources: []
  };
  
  // ─────────────────────────────────────────────────────────────
  // POPULATE cycleActiveCitizens
  // ─────────────────────────────────────────────────────────────
  if (!S.cycleActiveCitizens || S.cycleActiveCitizens.length === 0) {
    ctx.summary.cycleActiveCitizens = [];
    
    // Source 1: citizenEvents
    var citizenEvents = S.citizenEvents || [];
    for (var i = 0; i < citizenEvents.length; i++) {
      var ev = citizenEvents[i];
      var name = ev.citizenName || ev.citizen || ev.name || '';
      if (name && ctx.summary.cycleActiveCitizens.indexOf(name) === -1) {
        ctx.summary.cycleActiveCitizens.push(name);
      }
    }
    if (citizenEvents.length > 0) diagnostics.sources.push('citizenEvents');
    
    // Source 2: storySeeds
    var storySeeds = S.storySeeds || [];
    for (var j = 0; j < storySeeds.length; j++) {
      var seed = storySeeds[j];
      var seedCitizens = seed.citizens || seed.involvedCitizens || [];
      for (var k = 0; k < seedCitizens.length; k++) {
        var c = seedCitizens[k];
        var cName = typeof c === 'string' ? c : (c.name || c.id || '');
        if (cName && ctx.summary.cycleActiveCitizens.indexOf(cName) === -1) {
          ctx.summary.cycleActiveCitizens.push(cName);
        }
      }
    }
    if (storySeeds.length > 0) diagnostics.sources.push('storySeeds');
    
    // Source 3: eventArcs
    var eventArcs = S.eventArcs || ctx.v3Arcs || [];
    for (var a = 0; a < eventArcs.length; a++) {
      var arc = eventArcs[a];
      if (arc.phase === 'resolved') continue;
      var arcCitizens = arc.involvedCitizens || [];
      for (var b = 0; b < arcCitizens.length; b++) {
        var ac = arcCitizens[b];
        var acName = typeof ac === 'string' ? ac : (ac.name || ac.id || '');
        if (acName && ctx.summary.cycleActiveCitizens.indexOf(acName) === -1) {
          ctx.summary.cycleActiveCitizens.push(acName);
        }
      }
    }
    if (eventArcs.length > 0) diagnostics.sources.push('eventArcs');
    
    // Source 4: worldEvents with citizen mentions
    var worldEvents = S.worldEvents || [];
    for (var w = 0; w < worldEvents.length; w++) {
      var we = worldEvents[w];
      var weCitizens = we.citizens || we.involvedCitizens || [];
      for (var x = 0; x < weCitizens.length; x++) {
        var wc = weCitizens[x];
        var wcName = typeof wc === 'string' ? wc : (wc.name || wc.id || '');
        if (wcName && ctx.summary.cycleActiveCitizens.indexOf(wcName) === -1) {
          ctx.summary.cycleActiveCitizens.push(wcName);
        }
      }
    }
    if (worldEvents.length > 0) diagnostics.sources.push('worldEvents');
  }
  
  diagnostics.cycleActiveCitizens = ctx.summary.cycleActiveCitizens.length;
  
  // ─────────────────────────────────────────────────────────────
  // POPULATE citizenLookup
  // ─────────────────────────────────────────────────────────────
  if (!ctx.citizenLookup || Object.keys(ctx.citizenLookup).length === 0) {
    ctx.citizenLookup = {};
    
    // Try to load from Citizen_Directory sheet
    try {
      var ss = ctx.ss;
      var dirSheet = ss.getSheetByName('Citizen_Directory');
      
      if (dirSheet) {
        var data = dirSheet.getDataRange().getValues();
        var headers = data[0];
        
        // Find column indices
        var nameIdx = findColIndex_(headers, ['Name', 'CitizenName', 'Citizen']);
        var nhIdx = findColIndex_(headers, ['Neighborhood', 'NH']);
        var tierIdx = findColIndex_(headers, ['TierRole', 'Tier']);
        var uniIdx = findColIndex_(headers, ['UNI']);
        var medIdx = findColIndex_(headers, ['MED']);
        var civIdx = findColIndex_(headers, ['CIV']);
        var occIdx = findColIndex_(headers, ['Occupation', 'Job']);
        
        for (var r = 1; r < data.length; r++) {
          var row = data[r];
          var name = nameIdx >= 0 ? row[nameIdx] : '';
          if (!name) continue;
          
          ctx.citizenLookup[name] = {
            Name: name,
            Neighborhood: nhIdx >= 0 ? row[nhIdx] : '',
            TierRole: tierIdx >= 0 ? row[tierIdx] : '',
            UNI: uniIdx >= 0 ? row[uniIdx] : '',
            MED: medIdx >= 0 ? row[medIdx] : '',
            CIV: civIdx >= 0 ? row[civIdx] : '',
            Occupation: occIdx >= 0 ? row[occIdx] : ''
          };
        }
        
        diagnostics.sources.push('Citizen_Directory');
      }
    } catch (e) {
      Logger.log('ensureBondEngineData_: Error loading Citizen_Directory - ' + e.message);
    }
  }
  
  diagnostics.citizenLookup = Object.keys(ctx.citizenLookup).length;
  
  // ─────────────────────────────────────────────────────────────
  // LOG DIAGNOSTICS
  // ─────────────────────────────────────────────────────────────
  Logger.log('ensureBondEngineData_ v2.2: ' +
    'activeCitizens=' + diagnostics.cycleActiveCitizens +
    ', citizenLookup=' + diagnostics.citizenLookup +
    ', sources=[' + diagnostics.sources.join(', ') + ']');
  
  // Need at least 2 active citizens to form bonds
  return diagnostics.cycleActiveCitizens >= 2;
}


/**
 * Helper: Find column index from possible header names
 */
function findColIndex_(headers, possibleNames) {
  for (var i = 0; i < possibleNames.length; i++) {
    for (var j = 0; j < headers.length; j++) {
      if (headers[j] && headers[j].toString().toLowerCase() === possibleNames[i].toLowerCase()) {
        return j;
      }
    }
  }
  return -1;
}


// ============================================================
// BOND UPDATES
// ============================================================

function updateExistingBonds_(ctx) {
  var S = ctx.summary || {};
  var bonds = ctx.summary.relationshipBonds || [];
  var currentCycle = S.cycleId || ctx.config.cycleCount || 0;
  
  // v2.2: Calendar context
  var cal = ctx.bondCalendarContext || {};
  var holiday = cal.holiday || 'none';
  var sportsSeason = cal.sportsSeason || 'off-season';
  var isFirstFriday = cal.isFirstFriday || false;
  var isCreationDay = cal.isCreationDay || false;
  
  var activeCitizensArray = S.cycleActiveCitizens || [];
  var activeCitizens = {};
  for (var i = 0; i < activeCitizensArray.length; i++) {
    activeCitizens[activeCitizensArray[i]] = true;
  }
  
  for (var b = 0; b < bonds.length; b++) {
    var bond = bonds[b];
    if (!bond || bond.status === BOND_STATUS.RESOLVED || bond.status === BOND_STATUS.SEVERED) {
      continue;
    }
    
    var intensity = Number(bond.intensity) || 0;
    var bondAge = currentCycle - (bond.cycleCreated || currentCycle);
    
    var aActive = activeCitizens[bond.citizenA] || false;
    var bActive = activeCitizens[bond.citizenB] || false;
    
    if (aActive && bActive) {
      if (bond.bondType === BOND_TYPES.RIVALRY || bond.bondType === BOND_TYPES.TENSION) {
        intensity += 1.5;
      } else if (bond.bondType === BOND_TYPES.ALLIANCE) {
        intensity += 0.5;
      } else if (bond.bondType === BOND_TYPES.MENTORSHIP) {
        intensity += 0.3;
      } else if (bond.bondType === BOND_TYPES.FESTIVAL) {
        intensity += 0.3;
      } else if (bond.bondType === BOND_TYPES.SPORTS_RIVAL) {
        intensity += 1.0;
      }
      bond.lastUpdate = currentCycle;
    }
    
    if (S.cycleWeight === 'high-signal' && bond.bondType === BOND_TYPES.RIVALRY) {
      intensity += 0.5;
    }
    
    if (S.shockFlag && S.shockFlag !== 'none') {
      if (bond.bondType === BOND_TYPES.RIVALRY) {
        intensity += 1;
      } else if (bond.bondType === BOND_TYPES.ALLIANCE) {
        if (Math.random() < 0.2) intensity -= 0.5;
      }
    }
    
    var sentiment = 0;
    if (S.cityDynamics && typeof S.cityDynamics.sentiment === 'number') {
      sentiment = S.cityDynamics.sentiment;
    }
    if (sentiment <= -0.3 && bond.bondType === BOND_TYPES.TENSION) {
      intensity += 0.3;
    }
    if (sentiment >= 0.3 && bond.bondType === BOND_TYPES.ALLIANCE) {
      intensity += 0.2;
    }
    
    // ─────────────────────────────────────────────────────────────
    // v2.2: CALENDAR-BASED INTENSITY MODIFIERS
    // ─────────────────────────────────────────────────────────────
    
    // Festival bonds strengthen during festivals
    if (bond.bondType === BOND_TYPES.FESTIVAL && holiday !== 'none') {
      intensity += 0.5;
    }
    
    // Sports rivalries intensify during playoffs/championship
    if (bond.bondType === BOND_TYPES.SPORTS_RIVAL) {
      if (sportsSeason === 'championship') {
        intensity += 1.5;
      } else if (sportsSeason === 'playoffs') {
        intensity += 1.0;
      } else if (sportsSeason === 'late-season') {
        intensity += 0.5;
      }
    }
    
    // Neighbor bonds strengthen during family holidays
    var familyHolidays = ['Thanksgiving', 'Easter', 'Holiday', 'MothersDay', 'FathersDay'];
    if (bond.bondType === BOND_TYPES.NEIGHBOR && familyHolidays.indexOf(holiday) >= 0) {
      intensity += 0.5;
    }
    
    // Alliance bonds strengthen during community celebrations
    var communityHolidays = ['Juneteenth', 'MLKDay', 'OaklandPride', 'ArtSoulFestival'];
    if (bond.bondType === BOND_TYPES.ALLIANCE && communityHolidays.indexOf(holiday) >= 0) {
      intensity += 0.5;
    }
    
    // Professional bonds strengthen on First Friday (networking)
    if (bond.bondType === BOND_TYPES.PROFESSIONAL && isFirstFriday) {
      intensity += 0.3;
    }
    
    // Community bonds strengthen on Creation Day
    if ((bond.bondType === BOND_TYPES.NEIGHBOR || bond.bondType === BOND_TYPES.ALLIANCE) && isCreationDay) {
      intensity += 0.4;
    }
    
    // ─────────────────────────────────────────────────────────────
    // ARC PROXIMITY
    // ─────────────────────────────────────────────────────────────
    var arcA = getBondCitizenArc_(ctx, bond.citizenA);
    var arcB = getBondCitizenArc_(ctx, bond.citizenB);
    
    if (arcA && arcB && arcA.arcId === arcB.arcId) {
      intensity += 0.5;
      if (arcA.phase === 'peak') {
        intensity += 0.5;
      }
    }
    
    if (bond.neighborhood && bond.bondType === BOND_TYPES.NEIGHBOR) {
      intensity -= 0.1;
    }
    
    if (!aActive && !bActive) {
      intensity -= 0.2;
    }
    
    if (bondAge > 15 && (currentCycle - (bond.lastUpdate || 0)) > 5) {
      intensity -= 0.5;
    }
    
    // v2.2: Festival bonds decay faster outside festivals
    if (bond.bondType === BOND_TYPES.FESTIVAL && holiday === 'none') {
      intensity -= 0.3;
    }
    
    // v2.2: Sports rivalries decay in off-season
    if (bond.bondType === BOND_TYPES.SPORTS_RIVAL && sportsSeason === 'off-season') {
      intensity -= 0.4;
    }
    
    if (intensity < 0) intensity = 0;
    if (intensity > 10) intensity = 10;
    
    bond.intensity = Math.round(intensity * 100) / 100;
    
    if (intensity <= 1 && bond.status === BOND_STATUS.ACTIVE) {
      bond.status = BOND_STATUS.DORMANT;
    } else if (intensity >= 3 && bond.status === BOND_STATUS.DORMANT) {
      bond.status = BOND_STATUS.ACTIVE;
    }
    
    if (bond.bondType === BOND_TYPES.TENSION) {
      if (intensity >= 6) {
        bond.bondType = BOND_TYPES.RIVALRY;
        bond.notes = (bond.notes || '') + ' [Escalated to rivalry C' + currentCycle + ']';
      } else if (intensity <= 2 && bondAge > 3) {
        bond.bondType = BOND_TYPES.PROFESSIONAL;
        bond.notes = (bond.notes || '') + ' [Settled into professional respect C' + currentCycle + ']';
      }
    }
  }
}


// ============================================================
// NEW BOND DETECTION
// ============================================================

function detectNewBonds_(ctx) {
  var S = ctx.summary || {};
  var currentCycle = S.cycleId || ctx.config.cycleCount || 0;
  var newBonds = [];
  
  var activeCitizens = S.cycleActiveCitizens || [];
  if (activeCitizens.length < 2) {
    Logger.log('detectNewBonds_: Less than 2 active citizens, skipping');
    return newBonds;
  }
  
  var citizenData = ctx.citizenLookup || {};
  
  // v2.2: Calendar context
  var cal = ctx.bondCalendarContext || {};
  var holiday = cal.holiday || 'none';
  var holidayPriority = cal.holidayPriority || 'none';
  var sportsSeason = cal.sportsSeason || 'off-season';
  var isFirstFriday = cal.isFirstFriday || false;
  var isCreationDay = cal.isCreationDay || false;
  
  // v2.2: Adjust max bonds based on calendar
  var maxNewBonds = 2;
  if (holiday !== 'none' && (holidayPriority === 'oakland' || holidayPriority === 'major')) {
    maxNewBonds = 4; // More bonds form during major celebrations
  }
  if (isFirstFriday) {
    maxNewBonds = Math.max(maxNewBonds, 3);
  }
  if (sportsSeason === 'championship') {
    maxNewBonds = Math.max(maxNewBonds, 3);
  }
  
  var bondsCreated = 0;
  
  for (var i = 0; i < activeCitizens.length && bondsCreated < maxNewBonds; i++) {
    for (var j = i + 1; j < activeCitizens.length && bondsCreated < maxNewBonds; j++) {
      var citizenA = activeCitizens[i];
      var citizenB = activeCitizens[j];
      
      if (bondExists_(ctx, citizenA, citizenB)) continue;
      
      var dataA = citizenData[citizenA] || {};
      var dataB = citizenData[citizenB] || {};
      
      var sharedDomains = [];
      if (dataA.UNI === 'y' && dataB.UNI === 'y') sharedDomains.push('UNI');
      if (dataA.MED === 'y' && dataB.MED === 'y') sharedDomains.push('MED');
      if (dataA.CIV === 'y' && dataB.CIV === 'y') sharedDomains.push('CIV');
      
      var sameTier = dataA.TierRole && dataA.TierRole === dataB.TierRole;
      
      var nhA = dataA.Neighborhood || '';
      var nhB = dataB.Neighborhood || '';
      var sameNeighborhood = nhA && nhA === nhB && OAKLAND_NEIGHBORHOODS_BOND.indexOf(nhA) >= 0;
      
      // ─────────────────────────────────────────────────────────────
      // v2.2: CALENDAR-SPECIFIC BOND DETECTION
      // ─────────────────────────────────────────────────────────────
      
      // FESTIVAL BONDS during major Oakland celebrations
      if (holiday !== 'none' && (holidayPriority === 'oakland' || holidayPriority === 'major')) {
        var festivalHoods = FESTIVAL_NEIGHBORHOODS[holiday] || ['Downtown'];
        var inFestivalZone = festivalHoods.indexOf(nhA) >= 0 || festivalHoods.indexOf(nhB) >= 0;
        
        if (inFestivalZone && Math.random() < 0.4) {
          newBonds.push(makeBond_(
            citizenA, citizenB,
            BOND_TYPES.FESTIVAL,
            BOND_ORIGINS.FESTIVAL_ENCOUNTER,
            'COMMUNITY',
            nhA || nhB || 'Downtown',
            4,
            currentCycle,
            'Met during ' + holiday + ' celebrations.'
          ));
          bondsCreated++;
          continue;
        }
      }
      
      // SPORTS RIVALRIES during playoffs/championship
      if (sportsSeason === 'championship' || sportsSeason === 'playoffs') {
        var sportsHoods = ['Jack London', 'Downtown'];
        var inSportsZone = sportsHoods.indexOf(nhA) >= 0 || sportsHoods.indexOf(nhB) >= 0;
        
        if (inSportsZone && Math.random() < 0.3) {
          newBonds.push(makeBond_(
            citizenA, citizenB,
            BOND_TYPES.SPORTS_RIVAL,
            BOND_ORIGINS.SPORTS_SEASON,
            'SPORTS',
            nhA || nhB || 'Jack London',
            5,
            currentCycle,
            sportsSeason === 'championship' ? 'Championship rivalry sparked.' : 'Playoff debate turned heated.'
          ));
          bondsCreated++;
          continue;
        }
      }
      
      // FIRST FRIDAY professional/creative bonds
      if (isFirstFriday) {
        var inArtsDistrict = ARTS_DISTRICT_NEIGHBORHOODS.indexOf(nhA) >= 0 || 
                           ARTS_DISTRICT_NEIGHBORHOODS.indexOf(nhB) >= 0;
        
        if (inArtsDistrict && Math.random() < 0.35) {
          newBonds.push(makeBond_(
            citizenA, citizenB,
            BOND_TYPES.PROFESSIONAL,
            BOND_ORIGINS.FIRST_FRIDAY,
            'CULTURE',
            nhA || nhB || 'Uptown',
            4,
            currentCycle,
            'Connected at First Friday gallery crawl.'
          ));
          bondsCreated++;
          continue;
        }
      }
      
      // CREATION DAY community bonds
      if (isCreationDay && sameNeighborhood) {
        if (Math.random() < 0.35) {
          newBonds.push(makeBond_(
            citizenA, citizenB,
            BOND_TYPES.ALLIANCE,
            BOND_ORIGINS.CREATION_DAY,
            'COMMUNITY',
            nhA,
            4,
            currentCycle,
            'Bonded over Oakland heritage at Creation Day.'
          ));
          bondsCreated++;
          continue;
        }
      }
      
      // HOLIDAY GATHERINGS boost neighbor bonds
      var familyHolidays = ['Thanksgiving', 'Holiday', 'Easter', 'MothersDay', 'FathersDay'];
      if (familyHolidays.indexOf(holiday) >= 0 && sameNeighborhood) {
        if (Math.random() < 0.35) {
          newBonds.push(makeBond_(
            citizenA, citizenB,
            BOND_TYPES.NEIGHBOR,
            BOND_ORIGINS.HOLIDAY_GATHERING,
            'COMMUNITY',
            nhA,
            4,
            currentCycle,
            'Connected during ' + holiday + ' neighborhood gathering.'
          ));
          bondsCreated++;
          continue;
        }
      }
      
      // ─────────────────────────────────────────────────────────────
      // EXISTING BOND DETECTION (preserved from v2.1)
      // ─────────────────────────────────────────────────────────────
      
      // High overlap + same tier = rivalry potential
      if (sharedDomains.length >= 2 && sameTier) {
        newBonds.push(makeBond_(
          citizenA, citizenB,
          BOND_TYPES.TENSION,
          BOND_ORIGINS.CAREER_OVERLAP,
          sharedDomains.join('/'),
          sameNeighborhood ? nhA : '',
          4,
          currentCycle,
          'Competing in overlapping domains.'
        ));
        bondsCreated++;
        continue;
      }
      
      // Same neighborhood = neighbor bond (reduced chance if calendar bonds took priority)
      if (sameNeighborhood && Math.random() < 0.2) {
        newBonds.push(makeBond_(
          citizenA, citizenB,
          BOND_TYPES.NEIGHBOR,
          BOND_ORIGINS.NEIGHBORHOOD,
          '',
          nhA,
          3,
          currentCycle,
          'Neighbors in ' + nhA + '.'
        ));
        bondsCreated++;
        continue;
      }
      
      // Single shared domain = professional connection
      if (sharedDomains.length === 1 && Math.random() < 0.25) {
        newBonds.push(makeBond_(
          citizenA, citizenB,
          BOND_TYPES.PROFESSIONAL,
          BOND_ORIGINS.CAREER_OVERLAP,
          sharedDomains[0],
          sameNeighborhood ? nhA : '',
          3,
          currentCycle,
          'Colleagues in ' + sharedDomains[0] + ' sphere.'
        ));
        bondsCreated++;
        continue;
      }
      
      // Arc-based bond detection
      var arcA = getBondCitizenArc_(ctx, citizenA);
      var arcB = getBondCitizenArc_(ctx, citizenB);
      
      if (arcA && arcB && arcA.arcId === arcB.arcId) {
        var bondType = arcA.type === 'rivalry' ? BOND_TYPES.RIVALRY : BOND_TYPES.ALLIANCE;
        newBonds.push(makeBond_(
          citizenA, citizenB,
          bondType,
          BOND_ORIGINS.ARC_PROXIMITY,
          arcA.domainTag || '',
          arcA.neighborhood || '',
          5,
          currentCycle,
          'Brought together by ' + arcA.type + ' arc in ' + (arcA.neighborhood || 'the city') + '.'
        ));
        bondsCreated++;
        continue;
      }
      
      // Tier disparity = mentorship potential
      var tierA = parseTierLevel_(dataA.TierRole);
      var tierB = parseTierLevel_(dataB.TierRole);
      
      if (Math.abs(tierA - tierB) >= 2 && sharedDomains.length >= 1 && Math.random() < 0.15) {
        var mentor = tierA > tierB ? citizenA : citizenB;
        var protege = tierA > tierB ? citizenB : citizenA;
        newBonds.push(makeBond_(
          mentor, protege,
          BOND_TYPES.MENTORSHIP,
          BOND_ORIGINS.MENTOR_PROTEGE,
          sharedDomains[0],
          sameNeighborhood ? nhA : '',
          4,
          currentCycle,
          'Mentorship forming in ' + sharedDomains[0] + '.'
        ));
        bondsCreated++;
      }
    }
  }
  
  Logger.log('detectNewBonds_ v2.2: Found ' + newBonds.length + ' potential bonds from ' + activeCitizens.length + ' active citizens (calendar: ' + holiday + ')');
  return newBonds;
}


// ============================================================
// CONFRONTATION TRIGGERS
// ============================================================

function checkConfrontationTriggers_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var confrontations = [];
  var currentCycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;
  
  // v2.2: Calendar context
  var cal = ctx.bondCalendarContext || {};
  var sportsSeason = cal.sportsSeason || 'off-season';
  
  for (var i = 0; i < bonds.length; i++) {
    var bond = bonds[i];
    if (!bond) continue;
    if (bond.bondType !== BOND_TYPES.RIVALRY && bond.bondType !== BOND_TYPES.SPORTS_RIVAL) continue;
    if (bond.status !== BOND_STATUS.ACTIVE) continue;
    
    // v2.2: Sports rivalries have lower confrontation threshold during championship
    var threshold = 8;
    if (bond.bondType === BOND_TYPES.SPORTS_RIVAL && sportsSeason === 'championship') {
      threshold = 6;
    }
    
    if (bond.intensity >= threshold) {
      confrontations.push({
        type: 'CONFRONTATION_EVENT',
        citizenA: bond.citizenA,
        citizenB: bond.citizenB,
        bondId: bond.bondId,
        intensity: bond.intensity,
        domain: bond.domainTag,
        neighborhood: bond.neighborhood || '',
        cycle: currentCycle,
        // v2.2: Calendar context
        sportsSeason: sportsSeason,
        bondType: bond.bondType
      });
      
      bond.notes = (bond.notes || '') + ' [Confrontation C' + currentCycle + ']';
      bond.intensity -= 2;
    }
  }
  
  return confrontations;
}


// ============================================================
// ALLIANCE BENEFITS
// ============================================================

function applyAllianceBenefits_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var allianceBenefits = {};
  
  for (var i = 0; i < bonds.length; i++) {
    var bond = bonds[i];
    if (!bond) continue;
    if (bond.bondType !== BOND_TYPES.ALLIANCE &&
        bond.bondType !== BOND_TYPES.MENTORSHIP &&
        bond.bondType !== BOND_TYPES.NEIGHBOR &&
        bond.bondType !== BOND_TYPES.FESTIVAL) continue;  // v2.2: Festival bonds give benefits
    if (bond.status !== BOND_STATUS.ACTIVE) continue;
    
    var boost = 1.0;
    if (bond.bondType === BOND_TYPES.MENTORSHIP) boost = 1.3;
    else if (bond.bondType === BOND_TYPES.ALLIANCE) boost = 1.2;
    else if (bond.bondType === BOND_TYPES.NEIGHBOR) boost = 1.1;
    else if (bond.bondType === BOND_TYPES.FESTIVAL) boost = 1.15;  // v2.2
    
    var citizens = [bond.citizenA, bond.citizenB];
    for (var c = 0; c < citizens.length; c++) {
      var citizen = citizens[c];
      if (!allianceBenefits[citizen]) {
        allianceBenefits[citizen] = { boost: 1.0, allies: [], neighbors: [], festivalFriends: [] };
      }
      allianceBenefits[citizen].boost *= boost;
      
      var other = citizen === bond.citizenA ? bond.citizenB : bond.citizenA;
      if (bond.bondType === BOND_TYPES.NEIGHBOR) {
        allianceBenefits[citizen].neighbors.push(other);
      } else if (bond.bondType === BOND_TYPES.FESTIVAL) {
        allianceBenefits[citizen].festivalFriends.push(other);
      } else {
        allianceBenefits[citizen].allies.push(other);
      }
    }
  }
  
  for (var citizen in allianceBenefits) {
    if (allianceBenefits[citizen].boost > 2.0) {
      allianceBenefits[citizen].boost = 2.0;
    }
    allianceBenefits[citizen].boost = Math.round(allianceBenefits[citizen].boost * 100) / 100;
  }
  
  ctx.summary.allianceBenefits = allianceBenefits;
}


// ============================================================
// BOND SUMMARY
// ============================================================

function generateBondSummary_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var confrontations = ctx.summary.pendingConfrontations || [];
  
  // v2.2: Calendar context
  var cal = ctx.bondCalendarContext || {};
  
  var activeBonds = [];
  for (var i = 0; i < bonds.length; i++) {
    if (bonds[i] && bonds[i].status === BOND_STATUS.ACTIVE) {
      activeBonds.push(bonds[i]);
    }
  }
  
  var summary = {
    totalBonds: bonds.length,
    activeBonds: activeBonds.length,
    rivalries: 0,
    alliances: 0,
    tensions: 0,
    mentorships: 0,
    neighbors: 0,
    professional: 0,
    festival: 0,        // v2.2
    sportsRival: 0,     // v2.2
    pendingConfrontations: confrontations.length,
    highIntensityBonds: 0,
    hottestBonds: [],
    // v2.2: Calendar context
    calendarContext: {
      holiday: cal.holiday || 'none',
      holidayPriority: cal.holidayPriority || 'none',
      isFirstFriday: cal.isFirstFriday || false,
      isCreationDay: cal.isCreationDay || false,
      sportsSeason: cal.sportsSeason || 'off-season'
    }
  };
  
  for (var j = 0; j < activeBonds.length; j++) {
    var b = activeBonds[j];
    if (b.bondType === BOND_TYPES.RIVALRY) summary.rivalries++;
    if (b.bondType === BOND_TYPES.ALLIANCE) summary.alliances++;
    if (b.bondType === BOND_TYPES.TENSION) summary.tensions++;
    if (b.bondType === BOND_TYPES.MENTORSHIP) summary.mentorships++;
    if (b.bondType === BOND_TYPES.NEIGHBOR) summary.neighbors++;
    if (b.bondType === BOND_TYPES.PROFESSIONAL) summary.professional++;
    if (b.bondType === BOND_TYPES.FESTIVAL) summary.festival++;
    if (b.bondType === BOND_TYPES.SPORTS_RIVAL) summary.sportsRival++;
    if (b.intensity >= 7) summary.highIntensityBonds++;
  }
  
  var hottestBonds = activeBonds.filter(function(b) { return b.intensity >= 5; });
  hottestBonds.sort(function(a, b) { return b.intensity - a.intensity; });
  hottestBonds = hottestBonds.slice(0, 5);
  
  summary.hottestBonds = hottestBonds.map(function(b) {
    return {
      citizens: b.citizenA + ' <-> ' + b.citizenB,
      type: b.bondType,
      intensity: b.intensity,
      neighborhood: b.neighborhood || '',
      origin: b.origin || ''  // v2.2: Include origin for calendar bonds
    };
  });
  
  ctx.summary.bondSummary = summary;
}


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function makeBond_(citizenA, citizenB, bondType, origin, domainTag, neighborhood, intensity, cycle, notes) {
  return {
    bondId: generateBondId_(),
    cycleCreated: cycle,
    citizenA: citizenA,
    citizenB: citizenB,
    bondType: bondType,
    intensity: intensity,
    origin: origin,
    domainTag: domainTag || '',
    neighborhood: neighborhood || '',
    status: BOND_STATUS.ACTIVE,
    lastUpdate: cycle,
    notes: notes || ''
  };
}

function generateBondId_() {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var id = '';
  for (var i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function bondExists_(ctx, citizenA, citizenB) {
  var bonds = ctx.summary.relationshipBonds || [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && (
      (b.citizenA === citizenA && b.citizenB === citizenB) ||
      (b.citizenA === citizenB && b.citizenB === citizenA)
    )) {
      return true;
    }
  }
  return false;
}

function getCitizenBonds_(ctx, citizenId) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.status === BOND_STATUS.ACTIVE &&
        (b.citizenA === citizenId || b.citizenB === citizenId)) {
      result.push(b);
    }
  }
  return result;
}

function getRivalryIntensity_(ctx, citizenA, citizenB) {
  var bonds = ctx.summary.relationshipBonds || [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && (b.bondType === BOND_TYPES.RIVALRY || b.bondType === BOND_TYPES.SPORTS_RIVAL) &&
        ((b.citizenA === citizenA && b.citizenB === citizenB) ||
         (b.citizenA === citizenB && b.citizenB === citizenA))) {
      return b.intensity;
    }
  }
  return 0;
}

function parseTierLevel_(tierRole) {
  if (!tierRole) return 0;
  var match = tierRole.toString().match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getBondCitizenArc_(ctx, citizenId) {
  var arcs = ctx.summary.eventArcs || [];
  
  for (var i = 0; i < arcs.length; i++) {
    var arc = arcs[i];
    if (!arc || arc.phase === 'resolved') continue;
    var involved = arc.involvedCitizens || [];
    for (var j = 0; j < involved.length; j++) {
      var c = involved[j];
      var cId = typeof c === 'string' ? c : (c.id || c.name || '');
      if (cId === citizenId) {
        return arc;
      }
    }
  }
  
  return null;
}

function getCombinedEventBoost_(ctx, citizenId) {
  var arc = getBondCitizenArc_(ctx, citizenId);
  var arcBoost = 1.0;
  if (arc) {
    var phaseBoosts = { 'early': 1.2, 'rising': 1.5, 'peak': 2.0, 'decline': 1.3 };
    arcBoost = phaseBoosts[arc.phase] || 1.0;
  }
  
  var allianceData = ctx.summary.allianceBenefits ? ctx.summary.allianceBenefits[citizenId] : null;
  var allianceBoost = allianceData ? allianceData.boost : 1.0;
  
  return Math.min(arcBoost * allianceBoost, 3.0);
}


// ============================================================
// RESOLUTION FUNCTIONS
// ============================================================

function resolveRivalry_(ctx, bondId, outcome) {
  var bonds = ctx.summary.relationshipBonds || [];
  var bond = null;
  for (var i = 0; i < bonds.length; i++) {
    if (bonds[i] && bonds[i].bondId === bondId) {
      bond = bonds[i];
      break;
    }
  }
  
  if (!bond) return;
  
  var currentCycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;
  
  if (outcome === 'continued') {
    bond.intensity = 5;
    bond.notes += ' [Rivalry continues C' + currentCycle + ']';
  } else if (outcome === 'truce') {
    bond.bondType = BOND_TYPES.TENSION;
    bond.intensity = 3;
    bond.notes += ' [Uneasy truce C' + currentCycle + ']';
  } else if (outcome === 'alliance') {
    bond.bondType = BOND_TYPES.ALLIANCE;
    bond.intensity = 6;
    bond.notes += ' [Unexpected alliance C' + currentCycle + ']';
  } else if (outcome === 'severed') {
    bond.status = BOND_STATUS.SEVERED;
    bond.intensity = 0;
    bond.notes += ' [Bond severed C' + currentCycle + ']';
  }
  
  bond.lastUpdate = currentCycle;
}

function createBond_(ctx, citizenA, citizenB, bondType, origin, domainTag, neighborhood, notes) {
  var currentCycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;
  
  if (bondExists_(ctx, citizenA, citizenB)) {
    return null;
  }
  
  var bond = makeBond_(
    citizenA, citizenB,
    bondType,
    origin,
    domainTag,
    neighborhood,
    3,
    currentCycle,
    notes
  );
  
  ctx.summary.relationshipBonds = ctx.summary.relationshipBonds || [];
  ctx.summary.relationshipBonds.push(bond);
  
  return bond;
}


// ============================================================
// LEDGER WRITER (v2.2: with calendar columns)
// ============================================================

function saveV3BondsToLedger_(ctx) {
  var ss = ctx.ss;
  var bonds = ctx.summary.relationshipBonds || [];
  
  if (!bonds.length) {
    Logger.log('saveV3BondsToLedger_: No bonds to write');
    return;
  }

  // v2.2: Expanded headers with calendar columns
  var headers = [
    'Timestamp', 'Cycle', 'BondId', 'CitizenA', 'CitizenB',
    'BondType', 'Intensity', 'Status', 'Origin', 'DomainTag',
    'Neighborhood', 'CycleCreated', 'LastUpdate', 'Notes',
    'Holiday', 'HolidayPriority', 'FirstFriday', 'CreationDay', 'SportsSeason'
  ];

  var sheet;
  if (typeof ensureSheet_ === 'function') {
    sheet = ensureSheet_(ss, 'Relationship_Bonds', headers);
  } else {
    sheet = ss.getSheetByName('Relationship_Bonds');
    if (!sheet) {
      sheet = ss.insertSheet('Relationship_Bonds');
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
  }

  var cycle = ctx.config.cycleCount || ctx.summary.cycleId || 0;
  var now = ctx.now || new Date();
  
  // v2.2: Calendar context
  var cal = ctx.bondCalendarContext || {};

  var updatedBonds = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.lastUpdate === cycle) {
      updatedBonds.push(b);
    }
  }

  if (!updatedBonds.length) {
    Logger.log('saveV3BondsToLedger_: No bonds updated this cycle');
    return;
  }

  var rows = [];
  for (var j = 0; j < updatedBonds.length; j++) {
    var bond = updatedBonds[j];
    rows.push([
      now,
      cycle,
      bond.bondId || '',
      bond.citizenA || '',
      bond.citizenB || '',
      bond.bondType || '',
      bond.intensity || 0,
      bond.status || '',
      bond.origin || '',
      bond.domainTag || '',
      bond.neighborhood || '',
      bond.cycleCreated || '',
      bond.lastUpdate || '',
      bond.notes || '',
      // v2.2: Calendar columns
      cal.holiday || 'none',
      cal.holidayPriority || 'none',
      cal.isFirstFriday || false,
      cal.isCreationDay || false,
      cal.sportsSeason || 'off-season'
    ]);
  }

  var startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  
  Logger.log('saveV3BondsToLedger_ v2.2: Wrote ' + rows.length + ' bond(s) for Cycle ' + cycle);
}


// ============================================================
// DIAGNOSTIC FUNCTION
// ============================================================

function diagnoseBondEngine() {
  var SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';
  var ss = SpreadsheetApp.openById(SIM_SSID);
  
  Logger.log('=== BOND ENGINE DIAGNOSTIC v2.2 ===');
  
  // Check Citizen_Directory
  var dirSheet = ss.getSheetByName('Citizen_Directory');
  if (dirSheet) {
    var data = dirSheet.getDataRange().getValues();
    Logger.log('Citizen_Directory: ' + (data.length - 1) + ' citizens');
    Logger.log('Headers: ' + data[0].join(', '));
  } else {
    Logger.log('Citizen_Directory: NOT FOUND');
  }
  
  // Check Relationship_Bonds
  var bondSheet = ss.getSheetByName('Relationship_Bonds');
  if (bondSheet) {
    var bondData = bondSheet.getDataRange().getValues();
    Logger.log('Relationship_Bonds: ' + (bondData.length - 1) + ' rows');
    
    // v2.2: Count bond types
    var typeCounts = {};
    for (var i = 1; i < bondData.length; i++) {
      var type = bondData[i][5] || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
    Logger.log('Bond types: ' + JSON.stringify(typeCounts));
  } else {
    Logger.log('Relationship_Bonds: NOT FOUND');
  }
  
  // Check for citizens with domain tags
  if (dirSheet) {
    var headers = dirSheet.getDataRange().getValues()[0];
    var hasUNI = headers.indexOf('UNI') >= 0;
    var hasMED = headers.indexOf('MED') >= 0;
    var hasCIV = headers.indexOf('CIV') >= 0;
    var hasNH = headers.indexOf('Neighborhood') >= 0 || headers.indexOf('NH') >= 0;
    
    Logger.log('Domain columns: UNI=' + hasUNI + ', MED=' + hasMED + ', CIV=' + hasCIV + ', Neighborhood=' + hasNH);
  }
  
  Logger.log('=== END DIAGNOSTIC ===');
}


/**
 * ============================================================================
 * BOND ENGINE REFERENCE v2.2
 * ============================================================================
 * 
 * NEW BOND TYPES (v2.2):
 * - festival: Festival/celebration connection
 * - sports_rival: Sports-based rivalry
 * 
 * NEW BOND ORIGINS (v2.2):
 * - festival_encounter: Met during Oakland celebration
 * - holiday_gathering: Connected at holiday event
 * - sports_season: Playoff/championship rivalry
 * - first_friday: Connected at gallery crawl
 * - creation_day: Bonded over Oakland heritage
 * - parade_proximity: Met at parade
 * 
 * CALENDAR-BASED BOND FORMATION:
 * 
 * | Context | Bond Type | Neighborhood | Chance |
 * |---------|-----------|--------------|--------|
 * | Oakland/Major holiday | festival | Festival zone | 40% |
 * | Championship/Playoffs | sports_rival | Jack London/Downtown | 30% |
 * | First Friday | professional | Arts district | 35% |
 * | Creation Day | alliance | Same neighborhood | 35% |
 * | Family holidays | neighbor | Same neighborhood | 35% |
 * 
 * CALENDAR-BASED INTENSITY MODIFIERS:
 * - Festival bonds +0.5 during holidays
 * - Sports rivalries +1.5 championship, +1.0 playoffs
 * - Neighbor bonds +0.5 during family holidays
 * - Alliance bonds +0.5 during community holidays
 * - Professional bonds +0.3 on First Friday
 * - Community bonds +0.4 on Creation Day
 * 
 * LEDGER COLUMNS (19):
 * Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity,
 * Status, Origin, DomainTag, Neighborhood, CycleCreated, LastUpdate, Notes,
 * Holiday, HolidayPriority, FirstFriday, CreationDay, SportsSeason
 * 
 * ============================================================================
 */