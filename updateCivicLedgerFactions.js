/**
 * ============================================================================
 * updateCivicOfficeLedgerFactions_ v1.0
 * ============================================================================
 *
 * Adds Faction and VotingPower columns to Civic_Office_Ledger
 * and populates based on known political alignments.
 *
 * FACTIONS:
 * - OPP: Oakland People's Party (progressive)
 * - CRC: Civic Reform Coalition (business-oriented)
 * - IND: Independent (swing voters, non-aligned elected)
 * - STAFF: Appointed officials (no council vote)
 *
 * VOTING POWER:
 * - yes: Can vote on council matters (elected council + mayor)
 * - no: Cannot vote (staff, appointed, commissions)
 *
 * ============================================================================
 */

/**
 * PUBLIC WRAPPER - Run this from the script editor
 */
function updateCivicOfficeLedgerFactions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  updateCivicOfficeLedgerFactions_(ss);
}

/**
 * Main function to update ledger
 */
function updateCivicOfficeLedgerFactions_(ss) {
  
  var sheet = ss.getSheetByName('Civic_Office_Ledger');
  
  if (!sheet) {
    Logger.log('Civic_Office_Ledger not found');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('No data in Civic_Office_Ledger');
    return;
  }
  
  var header = data[0];
  var rows = data.slice(1);
  
  // Check if columns already exist
  var iFaction = header.indexOf('Faction');
  var iVotingPower = header.indexOf('VotingPower');
  
  var columnsAdded = false;
  
  // Add Faction column if missing
  if (iFaction < 0) {
    header.push('Faction');
    iFaction = header.length - 1;
    columnsAdded = true;
    
    // Add empty values to all rows
    for (var r = 0; r < rows.length; r++) {
      rows[r].push('');
    }
  }
  
  // Add VotingPower column if missing
  if (iVotingPower < 0) {
    header.push('VotingPower');
    iVotingPower = header.length - 1;
    columnsAdded = true;
    
    // Add empty values to all rows
    for (var r = 0; r < rows.length; r++) {
      rows[r].push('');
    }
  }
  
  // Get column indices
  var iOfficeId = header.indexOf('OfficeId');
  var iTitle = header.indexOf('Title');
  var iType = header.indexOf('Type');
  var iHolder = header.indexOf('Holder');
  var iPopId = header.indexOf('PopId');
  
  // Known faction assignments
  var factionMap = {
    // By PopId
    'POP-00034': 'OPP',   // Avery Santana - Mayor
    'POP-00042': 'IND',   // Ramon Vega - Council President (swing)
    'POP-00043': 'OPP',   // Janae Rivers - Progressive Caucus
    'POP-00044': 'CRC',   // Elliott Crane - Business Caucus
    'POP-00143': 'IND',   // Clarissa Dane - DA
    'POP-00146': 'OPP',   // Caleb Reyes - Public Defender
  };
  
  // Known voting power by office type
  var votingOffices = {
    'MAYOR': true,
    'COUNCIL': true
  };
  
  // Process each row
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    
    var officeId = (row[iOfficeId] || '').toString();
    var title = (row[iTitle] || '').toString();
    var type = (row[iType] || '').toString().toLowerCase();
    var holder = (row[iHolder] || '').toString();
    var popId = (row[iPopId] || '').toString();
    
    // Determine faction
    var faction = '';
    
    // Check if we have explicit mapping
    if (popId && factionMap[popId]) {
      faction = factionMap[popId];
    }
    // Otherwise assign based on type
    else if (type === 'appointed' || type === 'commission') {
      faction = 'STAFF';
    }
    // Vacant elected seats
    else if (holder === 'TBD' || holder === '' || !holder) {
      faction = 'VACANT';
    }
    // Unknown elected - default to IND
    else if (type === 'elected') {
      faction = 'IND';
    }
    else {
      faction = 'STAFF';
    }
    
    // Determine voting power
    var votingPower = 'no';
    
    // Check office prefix
    var officePrefix = officeId.split('-')[0];
    if (votingOffices[officePrefix]) {
      // Has voting power if seat is filled
      if (holder && holder !== 'TBD' && holder !== '') {
        votingPower = 'yes';
      } else {
        votingPower = 'vacant';
      }
    }
    
    // Set values
    row[iFaction] = faction;
    row[iVotingPower] = votingPower;
    
    rows[r] = row;
  }
  
  // Write back
  var allData = [header].concat(rows);
  sheet.getRange(1, 1, allData.length, allData[0].length).setValues(allData);
  
  // Format new columns if added
  if (columnsAdded) {
    sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }
  
  Logger.log('Updated Civic_Office_Ledger with Faction and VotingPower columns');
  Logger.log('Factions assigned: OPP, CRC, IND, STAFF, VACANT');
  
  // Log summary
  var summary = { OPP: 0, CRC: 0, IND: 0, STAFF: 0, VACANT: 0 };
  var voters = 0;
  
  for (var r = 0; r < rows.length; r++) {
    var f = rows[r][iFaction];
    if (summary.hasOwnProperty(f)) {
      summary[f]++;
    }
    if (rows[r][iVotingPower] === 'yes') {
      voters++;
    }
  }
  
  Logger.log('Faction breakdown: OPP=' + summary.OPP + ', CRC=' + summary.CRC + 
             ', IND=' + summary.IND + ', STAFF=' + summary.STAFF + ', VACANT=' + summary.VACANT);
  Logger.log('Active voting members: ' + voters);
}


/**
 * ============================================================================
 * GET COUNCIL VOTE STATE
 * ============================================================================
 * Updated function for civicInitiativeEngine to use
 */

/**
 * Get council state from Civic_Office_Ledger
 * Returns faction counts and member availability
 */
function getCouncilStateFromLedger_(ctx) {
  
  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Civic_Office_Ledger');
  
  var state = {
    totalSeats: 10,        // Mayor + 9 Council
    filledSeats: 0,
    availableVotes: 0,
    vacantSeats: 0,
    members: [],
    factions: {
      'OPP': { count: 0, available: 0, members: [] },
      'CRC': { count: 0, available: 0, members: [] },
      'IND': { count: 0, available: 0, members: [] }
    },
    unavailable: [],
    mayor: null,
    president: null
  };
  
  if (!sheet) {
    Logger.log('getCouncilStateFromLedger_: Civic_Office_Ledger not found');
    return state;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return state;
  
  var header = data[0];
  var rows = data.slice(1);
  
  var idx = function(n) { return header.indexOf(n); };
  
  var iOfficeId = idx('OfficeId');
  var iTitle = idx('Title');
  var iHolder = idx('Holder');
  var iPopId = idx('PopId');
  var iStatus = idx('Status');
  var iFaction = idx('Faction');
  var iVotingPower = idx('VotingPower');
  
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    
    var officeId = (row[iOfficeId] || '').toString();
    var title = (row[iTitle] || '').toString();
    var holder = (row[iHolder] || '').toString();
    var popId = (row[iPopId] || '').toString();
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    var faction = (row[iFaction] || '').toString().toUpperCase();
    var votingPower = (row[iVotingPower] || 'no').toString().toLowerCase();
    
    // Only process voting positions
    if (votingPower !== 'yes' && votingPower !== 'vacant') continue;
    
    // Track vacant seats
    if (votingPower === 'vacant' || holder === 'TBD' || !holder) {
      state.vacantSeats++;
      continue;
    }
    
    state.filledSeats++;
    
    // Check availability
    var isAvailable = true;
    if (status === 'hospitalized' || status === 'serious-condition' || 
        status === 'critical' || status === 'injured' ||
        status === 'deceased' || status === 'resigned' || status === 'retired') {
      isAvailable = false;
      state.unavailable.push({ 
        name: holder, 
        reason: status,
        faction: faction 
      });
    }
    
    var member = {
      name: holder,
      popId: popId,
      office: officeId,
      title: title,
      status: status,
      faction: faction,
      available: isAvailable
    };
    
    state.members.push(member);
    
    // Count by faction
    if (state.factions[faction]) {
      state.factions[faction].count++;
      state.factions[faction].members.push(holder);
      
      if (isAvailable) {
        state.factions[faction].available++;
        state.availableVotes++;
      }
    }
    
    // Track special roles
    if (officeId === 'MAYOR-01') {
      state.mayor = member;
    }
    if (title.indexOf('Council President') >= 0) {
      state.president = member;
    }
  }
  
  return state;
}


/**
 * ============================================================================
 * REFERENCE
 * ============================================================================
 *
 * FACTION CODES:
 * - OPP: Oakland People's Party (progressive coalition)
 *   - Santana (Mayor), Rivers (Progressive Caucus), Reyes (PD)
 * - CRC: Civic Reform Coalition (business-oriented)
 *   - Crane (Business Caucus)
 * - IND: Independent (non-aligned, potential swing votes)
 *   - Vega (Council President), Dane (DA)
 * - STAFF: Appointed officials (no voting power)
 *   - All department heads, chiefs, staff positions
 * - VACANT: Unfilled elected seat
 *
 * VOTING POWER:
 * - yes: Can vote on council matters
 * - no: Cannot vote (appointed/staff)
 * - vacant: Seat exists but unfilled
 *
 * CURRENT COUNCIL STATE (based on your ledger):
 * - 10 voting positions (Mayor + 9 Council)
 * - 4 filled (Santana, Vega, Rivers, Crane)
 * - 6 vacant (D1, D2, D3, D7, D8, D9)
 * - 2 unavailable (Osei serious-condition, Crane injured)
 *   Note: Osei is STAFF, doesn't affect vote count
 *         Crane IS council, reduces available CRC votes
 *
 * VOTE MATH WITH CURRENT STATE:
 * - Available voters: 3 (Santana, Vega, Rivers) - Crane injured
 * - OPP: 2 available (Santana, Rivers)
 * - CRC: 0 available (Crane injured)
 * - IND: 1 available (Vega)
 * 
 * This means 5-4 votes are IMPOSSIBLE until seats fill or Crane recovers!
 * Maximum possible YES votes: 3
 *
 * ============================================================================
 */