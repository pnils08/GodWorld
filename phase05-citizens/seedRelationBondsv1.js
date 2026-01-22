/**
 * ============================================================================
 * BOND SEEDING v1.0
 * ============================================================================
 * 
 * Seeds initial relationship bonds between Oakland citizens.
 * Run once to populate Relationship_Bonds, then bondEngine handles updates.
 * 
 * BOND TYPES:
 * - family: Parent/child, siblings, extended
 * - friendship: Neighbors, coworkers, shared interests
 * - professional: Boss/employee, mentor/mentee, partners
 * - romantic: Dating, married, ex
 * - rivalry: Competition, grudge, feud
 * - alliance: Political, business, community
 * 
 * INTEGRATION:
 * Run seedRelationshipBonds_(ctx) once, or call if bonds < threshold.
 * Add check to Phase 5: if (countBonds < 500) seedRelationshipBonds_(ctx);
 * 
 * ============================================================================
 */


/**
 * Main seeding function
 */
function seedRelationshipBonds_(ctx) {
  
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount || 0;
  
  // Get or create Relationship_Bonds sheet
  var sheet = ss.getSheetByName('Relationship_Bonds');
  if (!sheet) {
    sheet = createRelationshipBondsSheet_(ss);
    Logger.log('seedRelationshipBonds_: Created Relationship_Bonds sheet');
  }
  
  // Check existing bond count
  var existingData = sheet.getDataRange().getValues();
  var existingCount = existingData.length - 1;  // Minus header
  
  if (existingCount >= 500) {
    Logger.log('seedRelationshipBonds_: Already have ' + existingCount + ' bonds, skipping seed');
    return existingCount;
  }
  
  Logger.log('seedRelationshipBonds_: Starting seed (current: ' + existingCount + ')');
  
  // Load citizens from Simulation_Ledger
  var ledgerSheet = ss.getSheetByName('Simulation_Ledger');
  if (!ledgerSheet) {
    Logger.log('seedRelationshipBonds_: No Simulation_Ledger found');
    return 0;
  }
  
  var ledgerData = ledgerSheet.getDataRange().getValues();
  var headers = ledgerData[0];
  
  // Find column indices
  var cols = {
    citizenId: findColumnIndex_(headers, ['CitizenId', 'citizenId', 'ID']),
    name: findColumnIndex_(headers, ['Name', 'name', 'CitizenName']),
    neighborhood: findColumnIndex_(headers, ['Neighborhood', 'neighborhood']),
    occupation: findColumnIndex_(headers, ['Occupation', 'occupation']),
    tier: findColumnIndex_(headers, ['Tier', 'tier']),
    household: findColumnIndex_(headers, ['Household', 'household', 'HouseholdId']),
    status: findColumnIndex_(headers, ['Status', 'status'])
  };
  
  // Build citizen array
  var citizens = [];
  for (var i = 1; i < ledgerData.length; i++) {
    var row = ledgerData[i];
    var status = cols.status >= 0 ? String(row[cols.status] || '').toLowerCase() : 'active';

    if (status === 'active' || status === '') {
      citizens.push({
        citizenId: row[cols.citizenId] || '',
        name: row[cols.name] || '',
        neighborhood: row[cols.neighborhood] || '',
        occupation: row[cols.occupation] || '',
        tier: row[cols.tier] || 4,
        household: row[cols.household] || ''
      });
    }
  }
  
  Logger.log('seedRelationshipBonds_: Loaded ' + citizens.length + ' active citizens');
  
  if (citizens.length < 10) {
    Logger.log('seedRelationshipBonds_: Not enough citizens to seed bonds');
    return 0;
  }
  
  // Build neighborhood and occupation indexes for faster lookups
  var byNeighborhood = {};
  var byOccupation = {};
  var byHousehold = {};
  
  for (var c = 0; c < citizens.length; c++) {
    var cit = citizens[c];
    
    if (cit.neighborhood) {
      if (!byNeighborhood[cit.neighborhood]) byNeighborhood[cit.neighborhood] = [];
      byNeighborhood[cit.neighborhood].push(cit);
    }
    
    if (cit.occupation) {
      if (!byOccupation[cit.occupation]) byOccupation[cit.occupation] = [];
      byOccupation[cit.occupation].push(cit);
    }
    
    if (cit.household) {
      if (!byHousehold[cit.household]) byHousehold[cit.household] = [];
      byHousehold[cit.household].push(cit);
    }
  }
  
  var bonds = [];
  var bondSet = {};  // Track to avoid duplicates
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: FAMILY BONDS (from household groupings)
  // ═══════════════════════════════════════════════════════════════════════════
  
  for (var hh in byHousehold) {
    var members = byHousehold[hh];
    if (members.length < 2) continue;
    
    for (var m1 = 0; m1 < members.length; m1++) {
      for (var m2 = m1 + 1; m2 < members.length; m2++) {
        var bond = createBond_(
          members[m1],
          members[m2],
          'family',
          Math.floor(Math.random() * 3) + 8,  // 8-10 intensity
          'household',
          cycle
        );
        
        var key = makeBondKey_(members[m1].citizenId, members[m2].citizenId);
        if (!bondSet[key]) {
          bondSet[key] = true;
          bonds.push(bond);
        }
      }
    }
  }
  
  Logger.log('seedRelationshipBonds_: Created ' + bonds.length + ' family bonds');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: NEIGHBORHOOD BONDS (proximity)
  // ═══════════════════════════════════════════════════════════════════════════
  
  var neighborhoodBondCount = 0;
  
  for (var hood in byNeighborhood) {
    var neighbors = byNeighborhood[hood];
    if (neighbors.length < 2) continue;
    
    // 20% chance of bond between any two neighbors (capped)
    var maxNeighborBonds = Math.min(50, Math.floor(neighbors.length * 0.3));
    var attempts = 0;
    var created = 0;
    
    while (created < maxNeighborBonds && attempts < maxNeighborBonds * 5) {
      attempts++;
      
      var n1 = Math.floor(Math.random() * neighbors.length);
      var n2 = Math.floor(Math.random() * neighbors.length);
      
      if (n1 === n2) continue;
      
      var key = makeBondKey_(neighbors[n1].citizenId, neighbors[n2].citizenId);
      if (bondSet[key]) continue;
      
      // 20% chance
      if (Math.random() > 0.20) continue;
      
      var bondType = Math.random() < 0.7 ? 'friendship' : 'professional';
      
      var bond = createBond_(
        neighbors[n1],
        neighbors[n2],
        bondType,
        Math.floor(Math.random() * 4) + 3,  // 3-6 intensity
        'neighbor',
        cycle
      );
      
      bondSet[key] = true;
      bonds.push(bond);
      created++;
      neighborhoodBondCount++;
    }
  }
  
  Logger.log('seedRelationshipBonds_: Created ' + neighborhoodBondCount + ' neighborhood bonds');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: OCCUPATION BONDS (workplace)
  // ═══════════════════════════════════════════════════════════════════════════
  
  var occupationBondCount = 0;
  
  for (var occ in byOccupation) {
    var coworkers = byOccupation[occ];
    if (coworkers.length < 2) continue;
    
    // 15% chance of bond between coworkers
    var maxOccBonds = Math.min(30, Math.floor(coworkers.length * 0.25));
    var attempts = 0;
    var created = 0;
    
    while (created < maxOccBonds && attempts < maxOccBonds * 5) {
      attempts++;
      
      var c1 = Math.floor(Math.random() * coworkers.length);
      var c2 = Math.floor(Math.random() * coworkers.length);
      
      if (c1 === c2) continue;
      
      var key = makeBondKey_(coworkers[c1].citizenId, coworkers[c2].citizenId);
      if (bondSet[key]) continue;
      
      // 15% chance
      if (Math.random() > 0.15) continue;
      
      var bondType = Math.random() < 0.6 ? 'professional' : 'friendship';
      
      var bond = createBond_(
        coworkers[c1],
        coworkers[c2],
        bondType,
        Math.floor(Math.random() * 4) + 4,  // 4-7 intensity
        'work',
        cycle
      );
      
      bondSet[key] = true;
      bonds.push(bond);
      created++;
      occupationBondCount++;
    }
  }
  
  Logger.log('seedRelationshipBonds_: Created ' + occupationBondCount + ' occupation bonds');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: RANDOM CROSS-NEIGHBORHOOD BONDS (chaos)
  // ═══════════════════════════════════════════════════════════════════════════
  
  var randomBondCount = 0;
  var targetRandom = Math.floor(citizens.length * 0.05);  // 5% get random bonds
  
  for (var r = 0; r < targetRandom; r++) {
    var r1 = Math.floor(Math.random() * citizens.length);
    var r2 = Math.floor(Math.random() * citizens.length);
    
    if (r1 === r2) continue;
    if (citizens[r1].neighborhood === citizens[r2].neighborhood) continue;  // Must be cross-neighborhood
    
    var key = makeBondKey_(citizens[r1].citizenId, citizens[r2].citizenId);
    if (bondSet[key]) continue;
    
    var typeRoll = Math.random();
    var bondType;
    if (typeRoll < 0.4) bondType = 'friendship';
    else if (typeRoll < 0.7) bondType = 'professional';
    else if (typeRoll < 0.85) bondType = 'alliance';
    else bondType = 'rivalry';
    
    var bond = createBond_(
      citizens[r1],
      citizens[r2],
      bondType,
      Math.floor(Math.random() * 4) + 2,  // 2-5 intensity
      'random',
      cycle
    );
    
    bondSet[key] = true;
    bonds.push(bond);
    randomBondCount++;
  }
  
  Logger.log('seedRelationshipBonds_: Created ' + randomBondCount + ' random bonds');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE BONDS TO SHEET
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (bonds.length > 0) {
    var rows = [];
    for (var b = 0; b < bonds.length; b++) {
      var bond = bonds[b];
      rows.push([
        bond.bondId,
        bond.citizenA,
        bond.nameA,
        bond.citizenB,
        bond.nameB,
        bond.type,
        bond.intensity,
        bond.origin,
        bond.startCycle,
        bond.lastInteraction,
        bond.status,
        bond.neighborhood
      ]);
    }
    
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    Logger.log('seedRelationshipBonds_: Wrote ' + rows.length + ' bonds to sheet');
  }
  
  // Store in context
  ctx.summary.bondSummary = {
    activeBonds: bonds.length,
    familyBonds: bonds.filter(function(b) { return b.type === 'family'; }).length,
    friendships: bonds.filter(function(b) { return b.type === 'friendship'; }).length,
    professional: bonds.filter(function(b) { return b.type === 'professional'; }).length,
    rivalries: bonds.filter(function(b) { return b.type === 'rivalry'; }).length,
    alliances: bonds.filter(function(b) { return b.type === 'alliance'; }).length
  };
  
  Logger.log('seedRelationshipBonds_: Complete. Total bonds: ' + bonds.length);
  
  return bonds.length;
}


/**
 * Create Relationship_Bonds sheet with headers
 */
function createRelationshipBondsSheet_(ss) {
  var sheet = ss.insertSheet('Relationship_Bonds');
  sheet.appendRow([
    'BondId',
    'CitizenA',
    'NameA',
    'CitizenB',
    'NameB',
    'Type',
    'Intensity',
    'Origin',
    'StartCycle',
    'LastInteraction',
    'Status',
    'Neighborhood'
  ]);
  sheet.setFrozenRows(1);
  return sheet;
}


/**
 * Create a bond object
 */
function createBond_(citizenA, citizenB, type, intensity, origin, cycle) {
  return {
    bondId: 'BOND-' + generateBondId_(),
    citizenA: citizenA.citizenId,
    nameA: citizenA.name,
    citizenB: citizenB.citizenId,
    nameB: citizenB.name,
    type: type,
    intensity: intensity,
    origin: origin,
    startCycle: cycle,
    lastInteraction: cycle,
    status: 'active',
    neighborhood: citizenA.neighborhood === citizenB.neighborhood ? citizenA.neighborhood : 'cross-neighborhood'
  };
}


/**
 * Make bond key for duplicate checking (order-independent)
 */
function makeBondKey_(idA, idB) {
  if (idA < idB) return idA + '|' + idB;
  return idB + '|' + idA;
}


/**
 * Generate unique bond ID
 */
function generateBondId_() {
  var chars = '0123456789ABCDEF';
  var id = '';
  for (var i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * 16)];
  }
  return id;
}


/**
 * Find column index from possible header names
 */
function findColumnIndex_(headers, possibleNames) {
  for (var i = 0; i < possibleNames.length; i++) {
    var idx = headers.indexOf(possibleNames[i]);
    if (idx >= 0) return idx;
  }
  return -1;
}


// ════════════════════════════════════════════════════════════════════════════
// STANDALONE TEST FUNCTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Test function — run manually
 */
function testBondSeeding_() {
  var SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';  // Replace with your ID
  var ss = SpreadsheetApp.openById(SIM_SSID);
  
  var ctx = {
    ss: ss,
    config: { cycleCount: 70 },
    summary: {}
  };
  
  var count = seedRelationshipBonds_(ctx);
  Logger.log('Test complete. Bonds created: ' + count);
  Logger.log('Bond summary: ' + JSON.stringify(ctx.summary.bondSummary));
}