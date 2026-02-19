/**
 * ============================================================================
 * CITIZEN CONTEXT BUILDER v1.2
 * ============================================================================
 *
 * v1.2 FIXES:
 * - Load Neighborhood from Simulation_Ledger (was returning empty)
 * - Match relationships by ID OR exact name (not substring)
 * - Skip resolved/severed bonds in relationship lookup
 * - Filter arc exposure to exclude resolved arcs
 * - Fix empty if block in getReturningCitizens (neighborhood filter)
 *
 * v1.1 FIX:
 * - Age calculation now uses SimYear 2041 instead of 2026
 * - BirthYear upper bound changed from 2020 to 2030
 *
 * Assembles a complete citizen identity from all simulation ledgers.
 * Returns a structured profile that can be passed to an LLM so the citizen
 * can "wake up knowing who they are."
 * 
 * DATA SOURCES:
 * - Simulation_Ledger (named citizens) / Generic_Citizens (population)
 * - LifeHistory_Log (accumulated events)
 * - Relationship_Bonds (connections to others)
 * - Citizen_Media_Usage (coverage history)
 * - Neighborhood_Map (location context)
 * - Event_Arc_Ledger (crises they lived through)
 * - Cultural_Ledger (if public figure)
 * - World_Population (current world state for context)
 * 
 * USAGE:
 *   var profile = buildCitizenContext('Rosa Ochoa');
 *   var profile = buildCitizenContext('POP-00042');
 *   var formatted = formatCitizenForMediaRoom('Rosa Ochoa');
 * 
 * ============================================================================
 */

var SIM_YEAR = 2041;


// ════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Build complete citizen context from all ledgers
 * @param {string} identifier - Citizen name or ID (e.g., "Rosa Ochoa" or "POP-00042")
 * @param {Object} [cache] - Optional sheet cache from createSheetCache_() for performance
 * @returns {Object} Complete citizen profile
 */
function buildCitizenContext(identifier, cache) {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  
  // Initialize profile
  var profile = {
    found: false,
    identifier: identifier,
    id: '',
    name: '',
    age: null,
    neighborhood: '',
    occupation: '',
    origin: '',
    tier: 4,
    source: '',  // 'named' or 'generic'
    
    // Accumulated data
    history: [],
    relationships: [],
    mediaAppearances: [],
    arcExposure: [],
    
    // Derived traits
    sentiment: 'neutral',
    voice: '',
    currentConcerns: [],
    
    // World context
    currentCycle: 0,
    cyclesInOakland: 0
  };
  
  // Get current world state
  var worldState = getWorldState_(ss);
  profile.currentCycle = worldState.cycle;
  
  // Try to find citizen in named ledger first, then generic
  var citizenBase = findCitizenBase_(ss, identifier);
  if (!citizenBase) {
    Logger.log('buildCitizenContext: Citizen not found - ' + identifier);
    return profile;
  }
  
  profile.found = true;
  profile.id = citizenBase.id;
  profile.name = citizenBase.name;
  profile.age = citizenBase.age;
  profile.neighborhood = citizenBase.neighborhood;
  profile.occupation = citizenBase.occupation;
  profile.origin = citizenBase.origin;
  profile.tier = citizenBase.tier;
  profile.source = citizenBase.source;
  
  // Calculate time in Oakland
  if (citizenBase.arrivalCycle) {
    profile.cyclesInOakland = worldState.cycle - citizenBase.arrivalCycle;
  }
  
  // Gather life history
  profile.history = getLifeHistory_(ss, profile.name, profile.id, cache);

  // Gather relationships
  profile.relationships = getRelationships_(ss, profile.name, profile.id, cache);
  
  // Gather media appearances
  profile.mediaAppearances = getMediaAppearances_(ss, profile.name);
  
  // Gather arc exposure (what crises they lived through)
  profile.arcExposure = getArcExposure_(ss, profile.neighborhood, worldState.cycle);
  
  // Check if cultural figure
  var culturalStatus = getCulturalStatus_(ss, profile.name);
  if (culturalStatus) {
    profile.culturalFigure = culturalStatus;
  }
  
  // Derive voice and sentiment from accumulated data
  profile.voice = deriveVoice_(profile);
  profile.sentiment = deriveSentiment_(profile, worldState);
  profile.currentConcerns = deriveConcerns_(profile, worldState);
  
  Logger.log('buildCitizenContext: Built profile for ' + profile.name + ' (' + profile.history.length + ' events, ' + profile.relationships.length + ' relationships)');
  
  return profile;
}


// ════════════════════════════════════════════════════════════════════════════
// DATA GATHERERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get current world state
 */
function getWorldState_(ss) {
  var state = {
    cycle: 0,
    season: '',
    weather: '',
    sentiment: 0,
    activeArcs: [],
    migrationDrift: 0
  };
  
  try {
    var sheet = ss.getSheetByName('World_Population');
    if (!sheet) return state;
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return state;
    
    var headers = data[0];
    var row = data[1];
    
    var getVal = function(col) {
      var idx = headers.indexOf(col);
      return idx >= 0 ? row[idx] : null;
    };
    
    state.cycle = Number(getVal('cycle')) || 0;
    state.weather = getVal('weatherType') || '';
    state.sentiment = Number(getVal('sentiment')) || 0;
    state.migrationDrift = Number(getVal('migrationDrift')) || 0;
    
    // Derive season from cycle (roughly)
    var cycleInYear = state.cycle % 52;
    if (cycleInYear < 13) state.season = 'Winter';
    else if (cycleInYear < 26) state.season = 'Spring';
    else if (cycleInYear < 39) state.season = 'Summer';
    else state.season = 'Fall';
    
  } catch (e) {
    Logger.log('getWorldState_ error: ' + e.message);
  }
  
  // Get active arcs
  try {
    var arcSheet = ss.getSheetByName('Event_Arc_Ledger');
    if (arcSheet) {
      var arcData = arcSheet.getDataRange().getValues();
      var arcHeaders = arcData[0];
      
      var phaseCol = arcHeaders.indexOf('Phase');
      var typeCol = arcHeaders.indexOf('Type');
      var neighborhoodCol = arcHeaders.indexOf('Neighborhood');
      var summaryCol = arcHeaders.indexOf('Summary');
      var tensionCol = arcHeaders.indexOf('Tension');
      
      for (var i = 1; i < arcData.length; i++) {
        var phase = phaseCol >= 0 ? arcData[i][phaseCol] : '';
        if (phase && phase !== 'resolved') {
          state.activeArcs.push({
            type: typeCol >= 0 ? arcData[i][typeCol] : '',
            neighborhood: neighborhoodCol >= 0 ? arcData[i][neighborhoodCol] : '',
            summary: summaryCol >= 0 ? arcData[i][summaryCol] : '',
            tension: tensionCol >= 0 ? arcData[i][tensionCol] : 0,
            phase: phase
          });
        }
      }
    }
  } catch (e) {
    Logger.log('getWorldState_ arcs error: ' + e.message);
  }
  
  return state;
}


/**
 * Find citizen base data from Simulation_Ledger or Generic_Citizens
 */
function findCitizenBase_(ss, identifier) {
  var citizen = null;
  
  // Try Simulation_Ledger first (named citizens)
  citizen = findInSimulationLedger_(ss, identifier);
  if (citizen) {
    citizen.source = 'named';
    return citizen;
  }
  
  // Try Generic_Citizens
  citizen = findInGenericCitizens_(ss, identifier);
  if (citizen) {
    citizen.source = 'generic';
    return citizen;
  }
  
  return null;
}


function findInSimulationLedger_(ss, identifier) {
  try {
    var sheet = ss.getSheetByName('Simulation_Ledger');
    if (!sheet) return null;
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;
    
    var headers = data[0];
    
    var idCol = headers.indexOf('POPID');
    var firstCol = headers.indexOf('First');
    var middleCol = headers.indexOf('Middle ') >= 0 ? headers.indexOf('Middle ') : headers.indexOf('Middle');
    var lastCol = headers.indexOf('Last');
    var tierCol = headers.indexOf('Tier');
    var roleCol = headers.indexOf('RoleType');
    var statusCol = headers.indexOf('Status');
    var birthYearCol = headers.indexOf('BirthYear');
    var originCityCol = headers.indexOf('OrginCity') >= 0 ? headers.indexOf('OrginCity') : headers.indexOf('OriginCity');
    var neighborhoodCol = headers.indexOf('Neighborhood');

    var identifierLower = identifier.toLowerCase().trim();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      // Build full name from First + Last
      var first = firstCol >= 0 ? String(row[firstCol] || '').trim() : '';
      var last = lastCol >= 0 ? String(row[lastCol] || '').trim() : '';
      var fullName = (first + ' ' + last).trim();
      var fullNameLower = fullName.toLowerCase();
      
      var id = idCol >= 0 ? String(row[idCol] || '').toLowerCase() : '';
      
      // Match by ID, full name, or partial name
      if (id === identifierLower || 
          fullNameLower === identifierLower || 
          fullNameLower.indexOf(identifierLower) >= 0 ||
          identifierLower.indexOf(fullNameLower) >= 0) {
        
        // v1.1 FIX: Calculate age from birth year using SimYear 2041
        var age = null;
        if (birthYearCol >= 0 && row[birthYearCol]) {
          var birthYear = Number(row[birthYearCol]);
          if (birthYear > 1900 && birthYear < 2030) {
            age = SIM_YEAR - birthYear;
          }
        }
        
        return {
          id: idCol >= 0 ? row[idCol] : '',
          name: fullName,
          age: age,
          neighborhood: neighborhoodCol >= 0 ? row[neighborhoodCol] : '',
          occupation: roleCol >= 0 ? row[roleCol] : '',
          origin: originCityCol >= 0 ? row[originCityCol] : '',
          tier: tierCol >= 0 ? (Number(row[tierCol]) || 4) : 4,
          arrivalCycle: null,  // Would need to derive from CreatedAt
          status: statusCol >= 0 ? row[statusCol] : ''
        };
      }
    }
  } catch (e) {
    Logger.log('findInSimulationLedger_ error: ' + e.message);
  }
  
  return null;
}


function findInGenericCitizens_(ss, identifier) {
  try {
    var sheet = ss.getSheetByName('Generic_Citizens');
    if (!sheet) return null;
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;
    
    var headers = data[0];
    
    var firstCol = headers.indexOf('First');
    var lastCol = headers.indexOf('Last');
    var ageCol = headers.indexOf('Age');
    var birthYearCol = headers.indexOf('BirthYear');
    var neighborhoodCol = headers.indexOf('Neighborhood');
    var occupationCol = headers.indexOf('Occupation');
    var emergenceCol = headers.indexOf('EmergenceCount');
    var statusCol = headers.indexOf('Status');
    
    var identifierLower = identifier.toLowerCase().trim();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      // Build full name from First + Last
      var first = firstCol >= 0 ? String(row[firstCol] || '').trim() : '';
      var last = lastCol >= 0 ? String(row[lastCol] || '').trim() : '';
      var fullName = (first + ' ' + last).trim();
      var fullNameLower = fullName.toLowerCase();
      
      // Match by full name or partial
      if (fullNameLower === identifierLower || 
          fullNameLower.indexOf(identifierLower) >= 0 ||
          identifierLower.indexOf(fullNameLower) >= 0) {
        
        // Determine tier from EmergenceCount
        var emergence = emergenceCol >= 0 ? Number(row[emergenceCol]) || 0 : 0;
        var tier = 4;
        if (emergence >= 6) tier = 2;
        else if (emergence >= 3) tier = 3;
        
        // v1.1: Support both Age and BirthYear columns
        var age = null;
        if (birthYearCol >= 0 && row[birthYearCol]) {
          var birthYear = Number(row[birthYearCol]);
          if (birthYear > 1900 && birthYear < 2030) {
            age = SIM_YEAR - birthYear;
          }
        } else if (ageCol >= 0 && row[ageCol]) {
          age = Number(row[ageCol]) || null;
        }
        
        return {
          id: 'GEN-' + i,  // Generate an ID
          name: fullName,
          age: age,
          neighborhood: neighborhoodCol >= 0 ? row[neighborhoodCol] : '',
          occupation: occupationCol >= 0 ? row[occupationCol] : '',
          origin: '',
          tier: tier,
          arrivalCycle: null,
          emergenceCount: emergence
        };
      }
    }
  } catch (e) {
    Logger.log('findInGenericCitizens_ error: ' + e.message);
  }
  
  return null;
}


/**
 * Get life history events for citizen
 * @param {Object} [cache] - Optional sheet cache for performance
 */
function getLifeHistory_(ss, name, id, cache) {
  var history = [];

  try {
    // Use cache if available, otherwise read directly
    var data;
    if (cache) {
      data = cache.getValues('LifeHistory_Log');
    } else {
      var sheet = ss.getSheetByName('LifeHistory_Log');
      if (!sheet) return history;
      data = sheet.getDataRange().getValues();
    }
    if (!data || data.length < 2) return history;
    
    var headers = data[0];
    
    var idCol = headers.indexOf('POPID');
    var cycleCol = headers.indexOf('Cycle') >= 0 ? headers.indexOf('Cycle') : headers.indexOf('EngineCycle');
    var eventTypeCol = headers.indexOf('EventTag') >= 0 ? headers.indexOf('EventTag') : headers.indexOf('EventType');
    var descCol = headers.indexOf('EventText') >= 0 ? headers.indexOf('EventText') : headers.indexOf('Description');
    var sourceCol = headers.indexOf('Source');
    var timestampCol = headers.indexOf('Timestamp');
    
    var idUpper = id ? id.toUpperCase() : '';
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowId = idCol >= 0 ? String(row[idCol] || '').toUpperCase() : '';
      
      if (rowId === idUpper) {
        history.push({
          cycle: cycleCol >= 0 ? row[cycleCol] : '',
          event: descCol >= 0 ? row[descCol] : '',
          category: eventTypeCol >= 0 ? row[eventTypeCol] : '',
          source: sourceCol >= 0 ? row[sourceCol] : '',
          timestamp: timestampCol >= 0 ? row[timestampCol] : ''
        });
      }
    }
    
    // Sort by cycle (oldest first), then timestamp
    history.sort(function(a, b) {
      var cycleA = Number(a.cycle) || 0;
      var cycleB = Number(b.cycle) || 0;
      if (cycleA !== cycleB) return cycleA - cycleB;
      return String(a.timestamp).localeCompare(String(b.timestamp));
    });
    
  } catch (e) {
    Logger.log('getLifeHistory_ error: ' + e.message);
  }
  
  return history;
}


/**
 * Get relationships for citizen
 * @param {Object} [cache] - Optional sheet cache for performance
 */
function getRelationships_(ss, name, id, cache) {
  var relationships = [];

  try {
    // Use cache if available, otherwise read directly
    var data;
    if (cache) {
      data = cache.getValues('Relationship_Bonds');
    } else {
      var sheet = ss.getSheetByName('Relationship_Bonds');
      if (!sheet) return relationships;
      data = sheet.getDataRange().getValues();
    }
    if (!data || data.length < 2) return relationships;
    
    var headers = data[0];
    
    var citizenACol = headers.indexOf('CitizenA');
    var citizenBCol = headers.indexOf('CitizenB');
    var typeCol = headers.indexOf('BondType');
    var intensityCol = headers.indexOf('Intensity');
    var statusCol = headers.indexOf('Status');
    var sinceCol = headers.indexOf('CycleCreated');
    var neighborhoodCol = headers.indexOf('Neighborhood');

    // v1.2: Build keys map for exact matching (ID and name)
    var keys = {};
    var idKey = (id || '').toString().trim().toLowerCase();
    var nameKey = (name || '').toString().trim().toLowerCase();
    if (idKey) keys[idKey] = true;
    if (nameKey) keys[nameKey] = true;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];

      // v1.2: Skip resolved/severed bonds
      var bondStatus = statusCol >= 0 ? String(row[statusCol] || '').toLowerCase() : '';
      if (bondStatus === 'resolved' || bondStatus === 'severed') continue;

      var citizenA = citizenACol >= 0 ? String(row[citizenACol] || '') : '';
      var citizenB = citizenBCol >= 0 ? String(row[citizenBCol] || '') : '';
      var aKey = citizenA.toLowerCase().trim();
      var bKey = citizenB.toLowerCase().trim();

      // v1.2: Exact match only (by ID or name)
      if (keys[aKey]) {
        relationships.push({
          name: citizenB,
          type: typeCol >= 0 ? row[typeCol] : 'connection',
          strength: intensityCol >= 0 ? row[intensityCol] : 'casual',
          since: sinceCol >= 0 ? row[sinceCol] : '',
          neighborhood: neighborhoodCol >= 0 ? row[neighborhoodCol] : ''
        });
      } else if (keys[bKey]) {
        relationships.push({
          name: citizenA,
          type: typeCol >= 0 ? row[typeCol] : 'connection',
          strength: intensityCol >= 0 ? row[intensityCol] : 'casual',
          since: sinceCol >= 0 ? row[sinceCol] : '',
          neighborhood: neighborhoodCol >= 0 ? row[neighborhoodCol] : ''
        });
      }
    }
    
  } catch (e) {
    Logger.log('getRelationships_ error: ' + e.message);
  }
  
  return relationships;
}


/**
 * Get media appearances for citizen
 */
function getMediaAppearances_(ss, name) {
  var appearances = [];
  
  try {
    var sheet = ss.getSheetByName('Citizen_Media_Usage');
    if (!sheet) return appearances;
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return appearances;
    
    var headers = data[0];
    var nameCol = headers.indexOf('CitizenName') >= 0 ? headers.indexOf('CitizenName') : headers.indexOf('Name');
    var cycleCol = headers.indexOf('Cycle');
    var usageCol = headers.indexOf('UsageType');
    var contextCol = headers.indexOf('Context');
    var reporterCol = headers.indexOf('Reporter');
    
    var nameLower = name.toLowerCase();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowName = nameCol >= 0 ? String(row[nameCol]).toLowerCase() : '';
      
      if (rowName === nameLower || rowName.indexOf(nameLower) >= 0) {
        appearances.push({
          cycle: cycleCol >= 0 ? row[cycleCol] : '',
          usageType: usageCol >= 0 ? row[usageCol] : 'mentioned',
          context: contextCol >= 0 ? row[contextCol] : '',
          reporter: reporterCol >= 0 ? row[reporterCol] : ''
        });
      }
    }
    
    // Sort by cycle
    appearances.sort(function(a, b) {
      return (Number(a.cycle) || 0) - (Number(b.cycle) || 0);
    });
    
  } catch (e) {
    Logger.log('getMediaAppearances_ error: ' + e.message);
  }
  
  return appearances;
}


/**
 * Get arc exposure based on neighborhood
 */
function getArcExposure_(ss, neighborhood, currentCycle) {
  var exposure = [];
  
  try {
    var sheet = ss.getSheetByName('Event_Arc_Ledger');
    if (!sheet) return exposure;
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return exposure;
    
    var headers = data[0];
    var neighborhoodCol = headers.indexOf('Neighborhood');
    var typeCol = headers.indexOf('Type');
    var phaseCol = headers.indexOf('Phase');
    var summaryCol = headers.indexOf('Summary');
    var cycleCol = headers.indexOf('CycleCreated') >= 0 ? headers.indexOf('CycleCreated') : headers.indexOf('Cycle');
    
    var neighborhoodLower = (neighborhood || '').toLowerCase();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var arcNeighborhood = neighborhoodCol >= 0 ? String(row[neighborhoodCol]).toLowerCase() : '';

      // v1.2: Skip resolved arcs (only show active exposure)
      var phase = phaseCol >= 0 ? String(row[phaseCol] || '').toLowerCase() : '';
      if (phase === 'resolved') continue;

      // Include if same neighborhood or city-wide arc
      if (arcNeighborhood === neighborhoodLower || arcNeighborhood === 'citywide' || arcNeighborhood === 'oakland') {
        exposure.push({
          type: typeCol >= 0 ? row[typeCol] : '',
          phase: phaseCol >= 0 ? row[phaseCol] : '',
          summary: summaryCol >= 0 ? row[summaryCol] : '',
          neighborhood: neighborhoodCol >= 0 ? row[neighborhoodCol] : '',
          cycle: cycleCol >= 0 ? row[cycleCol] : ''
        });
      }
    }
    
  } catch (e) {
    Logger.log('getArcExposure_ error: ' + e.message);
  }
  
  return exposure;
}


/**
 * Check if citizen is a cultural figure
 */
function getCulturalStatus_(ss, name) {
  try {
    var sheet = ss.getSheetByName('Cultural_Ledger');
    if (!sheet) return null;
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return null;
    
    var headers = data[0];
    
    var nameCol = headers.indexOf('Name');
    var categoryCol = headers.indexOf('FameCategory');
    var fameCol = headers.indexOf('FameScore');
    var trajectoryCol = headers.indexOf('TrendTrajectory');
    var domainCol = headers.indexOf('CulturalDomain');
    var roleCol = headers.indexOf('RoleType');
    var tierCol = headers.indexOf('CityTier');
    var neighborhoodCol = headers.indexOf('Neighborhood');
    
    var nameLower = name.toLowerCase();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowName = nameCol >= 0 ? String(row[nameCol] || '').toLowerCase() : '';
      
      if (rowName === nameLower || rowName.indexOf(nameLower) >= 0 || nameLower.indexOf(rowName) >= 0) {
        return {
          category: categoryCol >= 0 ? row[categoryCol] : '',
          fameScore: fameCol >= 0 ? Number(row[fameCol]) || 0 : 0,
          trajectory: trajectoryCol >= 0 ? row[trajectoryCol] : 'stable',
          domain: domainCol >= 0 ? row[domainCol] : '',
          role: roleCol >= 0 ? row[roleCol] : '',
          cityTier: tierCol >= 0 ? row[tierCol] : '',
          neighborhood: neighborhoodCol >= 0 ? row[neighborhoodCol] : ''
        };
      }
    }
    
  } catch (e) {
    Logger.log('getCulturalStatus_ error: ' + e.message);
  }
  
  return null;
}


// ════════════════════════════════════════════════════════════════════════════
// DERIVATION FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Derive voice/personality from accumulated data
 */
function deriveVoice_(profile) {
  var traits = [];
  
  // Based on occupation
  var occ = (profile.occupation || '').toLowerCase();
  if (occ.indexOf('teacher') >= 0 || occ.indexOf('professor') >= 0) {
    traits.push('thoughtful');
    traits.push('articulate');
  } else if (occ.indexOf('nurse') >= 0 || occ.indexOf('doctor') >= 0 || occ.indexOf('health') >= 0) {
    traits.push('caring');
    traits.push('practical');
  } else if (occ.indexOf('artist') >= 0 || occ.indexOf('musician') >= 0 || occ.indexOf('writer') >= 0) {
    traits.push('creative');
    traits.push('expressive');
  } else if (occ.indexOf('engineer') >= 0 || occ.indexOf('developer') >= 0 || occ.indexOf('analyst') >= 0) {
    traits.push('analytical');
    traits.push('precise');
  } else if (occ.indexOf('bartender') >= 0 || occ.indexOf('server') >= 0 || occ.indexOf('retail') >= 0) {
    traits.push('personable');
    traits.push('observant');
  } else if (occ.indexOf('construction') >= 0 || occ.indexOf('mechanic') >= 0 || occ.indexOf('trade') >= 0) {
    traits.push('direct');
    traits.push('practical');
  }
  
  // Based on time in Oakland
  if (profile.cyclesInOakland > 100) {
    traits.push('rooted');
    traits.push('community-minded');
  } else if (profile.cyclesInOakland < 10) {
    traits.push('newcomer perspective');
    traits.push('curious');
  }
  
  // Based on tier
  if (profile.tier <= 2) {
    traits.push('established voice');
  }
  
  // Based on arc exposure
  var crisisCount = 0;
  for (var i = 0; i < profile.arcExposure.length; i++) {
    if (profile.arcExposure[i].type && profile.arcExposure[i].type.indexOf('crisis') >= 0) {
      crisisCount++;
    }
  }
  if (crisisCount >= 2) {
    traits.push('resilient');
    traits.push('skeptical of promises');
  }
  
  // Based on neighborhood
  var hood = (profile.neighborhood || '').toLowerCase();
  if (hood === 'temescal') {
    traits.push('progressive');
  } else if (hood === 'west oakland') {
    traits.push('historically aware');
  } else if (hood === 'downtown') {
    traits.push('urban professional');
  } else if (hood === 'fruitvale') {
    traits.push('community-oriented');
  } else if (hood === 'laurel') {
    traits.push('family-focused');
  }
  
  return traits.length > 0 ? traits.join(', ') : 'everyday Oakland resident';
}


/**
 * Derive current sentiment based on profile and world state
 */
function deriveSentiment_(profile, worldState) {
  var sentiment = 'neutral';
  
  // Start with world sentiment
  var worldSent = worldState.sentiment || 0;
  
  // Adjust based on personal factors
  var personalMod = 0;
  
  // Recent media coverage is generally positive (being noticed)
  if (profile.mediaAppearances.length > 0) {
    var recentAppearances = profile.mediaAppearances.filter(function(a) {
      return (worldState.cycle - (Number(a.cycle) || 0)) < 10;
    });
    if (recentAppearances.length > 0) {
      personalMod += 0.1;
    }
  }
  
  // Active crisis in neighborhood is negative
  for (var i = 0; i < worldState.activeArcs.length; i++) {
    var arc = worldState.activeArcs[i];
    if (arc.neighborhood && arc.neighborhood.toLowerCase() === (profile.neighborhood || '').toLowerCase()) {
      if (arc.type && arc.type.indexOf('crisis') >= 0) {
        personalMod -= 0.2;
      }
    }
  }
  
  // High migration drift is concerning
  if (worldState.migrationDrift < -30) {
    personalMod -= 0.1;
  }
  
  // Calculate final
  var finalSent = worldSent + personalMod;
  
  if (finalSent > 0.3) {
    sentiment = 'optimistic';
  } else if (finalSent > 0.1) {
    sentiment = 'cautiously hopeful';
  } else if (finalSent < -0.3) {
    sentiment = 'worried';
  } else if (finalSent < -0.1) {
    sentiment = 'concerned';
  } else {
    sentiment = 'watchful';
  }
  
  return sentiment;
}


/**
 * Derive current concerns based on profile and world state
 */
function deriveConcerns_(profile, worldState) {
  var concerns = [];
  
  // Active arcs in their neighborhood
  for (var i = 0; i < worldState.activeArcs.length; i++) {
    var arc = worldState.activeArcs[i];
    var arcHood = (arc.neighborhood || '').toLowerCase();
    var profileHood = (profile.neighborhood || '').toLowerCase();
    
    if (arcHood === profileHood || arcHood === 'citywide' || arcHood === 'oakland') {
      concerns.push(arc.summary || arc.type);
    }
  }
  
  // Migration drift affects everyone
  if (worldState.migrationDrift < -30) {
    concerns.push('neighbors leaving');
  }
  
  // Long-time residents worry about change
  if (profile.cyclesInOakland > 50) {
    concerns.push('neighborhood changing');
  }
  
  // Newcomers worry about belonging
  if (profile.cyclesInOakland < 10) {
    concerns.push('finding community');
  }
  
  return concerns;
}


// ════════════════════════════════════════════════════════════════════════════
// OUTPUT FORMATTERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Format citizen profile for Media Room consumption
 * Returns a text block that can be pasted into a prompt
 */
function formatCitizenForMediaRoom(identifier) {
  var profile = buildCitizenContext(identifier);
  
  if (!profile.found) {
    return 'CITIZEN NOT FOUND: ' + identifier;
  }
  
  var lines = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('CITIZEN PROFILE: ' + profile.name);
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('IDENTITY:');
  lines.push('  Name: ' + profile.name);
  lines.push('  Age: ' + (profile.age || 'unknown'));
  lines.push('  Neighborhood: ' + (profile.neighborhood || 'unknown'));
  lines.push('  Occupation: ' + (profile.occupation || 'unknown'));
  if (profile.origin) {
    lines.push('  Origin: ' + profile.origin);
  }
  lines.push('  Tier: ' + profile.tier);
  lines.push('  Time in Oakland: ' + profile.cyclesInOakland + ' cycles');
  lines.push('');
  
  if (profile.culturalFigure) {
    lines.push('CULTURAL STATUS:');
    lines.push('  Category: ' + profile.culturalFigure.category);
    lines.push('  Fame Score: ' + profile.culturalFigure.fameScore);
    lines.push('  Trajectory: ' + profile.culturalFigure.trajectory);
    lines.push('');
  }
  
  lines.push('VOICE: ' + profile.voice);
  lines.push('CURRENT MOOD: ' + profile.sentiment);
  lines.push('');
  
  if (profile.currentConcerns.length > 0) {
    lines.push('CURRENT CONCERNS:');
    for (var c = 0; c < profile.currentConcerns.length; c++) {
      lines.push('  - ' + profile.currentConcerns[c]);
    }
    lines.push('');
  }
  
  if (profile.history.length > 0) {
    lines.push('LIFE HISTORY (' + profile.history.length + ' events):');
    // Show last 10 events
    var historyStart = Math.max(0, profile.history.length - 10);
    for (var h = historyStart; h < profile.history.length; h++) {
      var evt = profile.history[h];
      var evtLine = '  C' + evt.cycle + ': ';
      if (evt.category) {
        evtLine += '[' + evt.category + '] ';
      }
      evtLine += evt.event;
      lines.push(evtLine);
    }
    if (historyStart > 0) {
      lines.push('  (' + historyStart + ' earlier events omitted)');
    }
    lines.push('');
  }
  
  if (profile.relationships.length > 0) {
    lines.push('RELATIONSHIPS:');
    for (var r = 0; r < profile.relationships.length; r++) {
      var rel = profile.relationships[r];
      lines.push('  - ' + rel.name + ' (' + rel.type + ', ' + rel.strength + ')');
    }
    lines.push('');
  }
  
  if (profile.mediaAppearances.length > 0) {
    lines.push('MEDIA HISTORY (' + profile.mediaAppearances.length + ' appearances):');
    // Show last 5
    var mediaStart = Math.max(0, profile.mediaAppearances.length - 5);
    for (var m = mediaStart; m < profile.mediaAppearances.length; m++) {
      var app = profile.mediaAppearances[m];
      lines.push('  C' + app.cycle + ': ' + app.usageType + (app.context ? ' — ' + app.context : ''));
    }
    lines.push('');
  }
  
  if (profile.arcExposure.length > 0) {
    lines.push('LIVED THROUGH:');
    for (var a = 0; a < profile.arcExposure.length; a++) {
      var arc = profile.arcExposure[a];
      lines.push('  - ' + (arc.summary || arc.type) + ' (' + arc.phase + ')');
    }
    lines.push('');
  }
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('When voicing this citizen, speak from their accumulated');
  lines.push('experience. They know their own history.');
  lines.push('═══════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}


/**
 * Test function - run this to see a sample profile
 */
function testCitizenContext() {
  var testNames = ['Vinnie Keane', 'Amara Keane'];
  
  for (var i = 0; i < testNames.length; i++) {
    Logger.log('\n════════════════════════════════════════');
    Logger.log('Looking up: ' + testNames[i]);
    Logger.log('════════════════════════════════════════\n');
    Logger.log(formatCitizenForMediaRoom(testNames[i]));
  }
}


/**
 * Quick test - look up a single citizen
 */
function lookupCitizen(name) {
  if (!name) name = 'Amara Keane';
  Logger.log(formatCitizenForMediaRoom(name));
  return buildCitizenContext(name);
}


/**
 * List all named citizens in Simulation_Ledger (for reference)
 */
function listNamedCitizens() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var sheet = ss.getSheetByName('Simulation_Ledger');
  if (!sheet) {
    Logger.log('Simulation_Ledger not found');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var firstCol = headers.indexOf('First');
  var lastCol = headers.indexOf('Last');
  var tierCol = headers.indexOf('Tier');
  
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('NAMED CITIZENS IN SIMULATION_LEDGER');
  Logger.log('═══════════════════════════════════════════════════════════');
  
  for (var i = 1; i < Math.min(data.length, 50); i++) {
    var first = firstCol >= 0 ? data[i][firstCol] : '';
    var last = lastCol >= 0 ? data[i][lastCol] : '';
    var tier = tierCol >= 0 ? data[i][tierCol] : '';
    var name = (first + ' ' + last).trim();
    if (name) {
      Logger.log('  ' + name + ' (Tier ' + tier + ')');
    }
  }
  
  Logger.log('\nTotal: ' + (data.length - 1) + ' citizens');
}


/**
 * Diagnostic - show ledger structure so we can fix lookups
 */
function diagnoseLedgerStructure() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  
  var sheetsToCheck = [
    'Simulation_Ledger',
    'Generic_Citizens', 
    'Citizens_Ledger',
    'World_Population',
    'LifeHistory_Log',
    'LifeEvents_Log',
    'Citizens_LifeEvents',
    'Relationship_Bonds',
    'Citizen_Media_Usage',
    'Cultural_Ledger',
    'Event_Arc_Ledger'
  ];
  
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('LEDGER STRUCTURE DIAGNOSTIC');
  Logger.log('═══════════════════════════════════════════════════════════');
  
  for (var i = 0; i < sheetsToCheck.length; i++) {
    var sheetName = sheetsToCheck[i];
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log('\n' + sheetName + ': NOT FOUND');
      continue;
    }
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    
    Logger.log('\n' + sheetName + ': ' + lastRow + ' rows x ' + lastCol + ' cols');
    
    if (lastRow > 0 && lastCol > 0) {
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      Logger.log('  Headers: ' + headers.join(', '));
      
      if (lastRow > 1) {
        var firstRow = sheet.getRange(2, 1, 1, Math.min(lastCol, 6)).getValues()[0];
        Logger.log('  Sample row: ' + firstRow.join(' | '));
      }
    }
  }
  
  Logger.log('\n═══════════════════════════════════════════════════════════');
}


/**
 * Get random citizens from a neighborhood for Media Room to quote
 */
function getCitizensForQuotes(neighborhood, count) {
  var rng = Math.random; // centralization prep — no ctx in scope
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var citizens = [];
  
  try {
    var sheet = ss.getSheetByName('Generic_Citizens');
    if (!sheet) return citizens;
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var firstCol = headers.indexOf('First');
    var lastCol = headers.indexOf('Last');
    var neighborhoodCol = headers.indexOf('Neighborhood');
    
    var matches = [];
    var neighborhoodLower = (neighborhood || '').toLowerCase();
    
    for (var i = 1; i < data.length; i++) {
      var hood = neighborhoodCol >= 0 ? String(data[i][neighborhoodCol] || '').toLowerCase() : '';
      
      if (!neighborhood || hood === neighborhoodLower || hood.indexOf(neighborhoodLower) >= 0) {
        var first = firstCol >= 0 ? String(data[i][firstCol] || '').trim() : '';
        var last = lastCol >= 0 ? String(data[i][lastCol] || '').trim() : '';
        var fullName = (first + ' ' + last).trim();
        
        if (fullName && fullName.length > 2) {
          matches.push(fullName);
        }
      }
    }
    
    Logger.log('getCitizensForQuotes: Found ' + matches.length + ' citizens in ' + (neighborhood || 'all neighborhoods'));
    
    // Shuffle and take requested count
    for (var j = matches.length - 1; j > 0; j--) {
      var k = Math.floor(rng() * (j + 1));
      var temp = matches[j];
      matches[j] = matches[k];
      matches[k] = temp;
    }
    
    var selected = matches.slice(0, count || 3);
    
    for (var s = 0; s < selected.length; s++) {
      if (selected[s]) {
        var profile = buildCitizenContext(selected[s]);
        if (profile && profile.found) {
          citizens.push(profile);
        }
      }
    }
    
  } catch (e) {
    Logger.log('getCitizensForQuotes error: ' + e.message);
  }
  
  return citizens;
}


/**
 * Get citizens who have been mentioned in media before (established voices)
 */
function getReturningCitizens(neighborhood, count) {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var citizens = [];
  
  try {
    var sheet = ss.getSheetByName('Citizen_Media_Usage');
    if (!sheet) return citizens;
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var nameCol = headers.indexOf('CitizenName');
    var contextCol = headers.indexOf('Context');
    
    var nameCounts = {};
    var neighborhoodLower = (neighborhood || '').toLowerCase();
    
    for (var i = 1; i < data.length; i++) {
      var name = nameCol >= 0 ? String(data[i][nameCol] || '').trim() : '';
      var context = contextCol >= 0 ? String(data[i][contextCol] || '').toLowerCase() : '';
      
      if (!name || name.length < 3) continue;
      
      // v1.2: Filter by neighborhood if specified
      if (neighborhood && context.indexOf(neighborhoodLower) < 0) {
        continue;
      }
      
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    }
    
    var sorted = Object.keys(nameCounts).sort(function(a, b) {
      return nameCounts[b] - nameCounts[a];
    });
    
    Logger.log('getReturningCitizens: Found ' + sorted.length + ' citizens with media history');
    
    var selected = sorted.slice(0, count || 5);
    
    for (var s = 0; s < selected.length; s++) {
      var profile = buildCitizenContext(selected[s]);
      if (profile && profile.found) {
        profile.mentionCount = nameCounts[selected[s]];
        citizens.push(profile);
      }
    }
    
  } catch (e) {
    Logger.log('getReturningCitizens error: ' + e.message);
  }
  
  return citizens;
}


/**
 * ============================================================================
 * REFERENCE v1.2
 * ============================================================================
 *
 * v1.2 CHANGES:
 * - Load Neighborhood from Simulation_Ledger (was returning empty)
 * - Match relationships by ID OR exact name (not substring)
 * - Skip resolved/severed bonds in relationship lookup
 * - Filter arc exposure to exclude resolved arcs
 * - Fix neighborhood filter in getReturningCitizens
 *
 * v1.1 CHANGES:
 * - Age calculation uses SIM_YEAR (2041) instead of hardcoded 2026
 * - BirthYear upper bound changed from 2020 to 2030
 * - Generic_Citizens supports both Age and BirthYear columns
 * 
 * FUNCTIONS:
 *   buildCitizenContext(identifier)     - Returns full profile object
 *   formatCitizenForMediaRoom(identifier) - Returns formatted text for prompts
 *   getCitizensForQuotes(neighborhood, count) - Returns array of profiles
 *   testCitizenContext()                - Test function for debugging
 * 
 * PROFILE OBJECT STRUCTURE:
 *   {
 *     found: boolean,
 *     name: string,
 *     age: number,
 *     neighborhood: string,
 *     occupation: string,
 *     origin: string,
 *     tier: number (1-4),
 *     source: 'named' | 'generic',
 *     history: [{cycle, event, category}],
 *     relationships: [{name, type, strength}],
 *     mediaAppearances: [{cycle, usageType, context}],
 *     arcExposure: [{type, phase, summary}],
 *     culturalFigure: {category, fameScore, trajectory} | null,
 *     voice: string (derived traits),
 *     sentiment: string (current mood),
 *     currentConcerns: [string]
 *   }
 * 
 * ============================================================================
 */