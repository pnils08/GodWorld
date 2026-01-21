/**
 * ============================================================================
 * civicInitiativeEngine_ v1.1
 * ============================================================================
 *
 * Tracks civic initiatives and resolves votes/outcomes when cycles match.
 *
 * v1.1 Changes:
 * - Added SwingVoter2 and SwingVoter2Lean columns
 * - Each named IND member gets individual probability calculation
 * - Prevents continuity breaks between Media Room coverage and engine rolls
 * - Only unnamed IND members use sentiment-based random roll
 *
 * FEATURES:
 * - Initiative lifecycle tracking (proposed → active → vote → resolved)
 * - Council vote resolution with faction math
 * - Named swing voter handling (up to 2)
 * - Swing vote probability based on projection/lean
 * - Council member availability (hospitalized/vacant seats affect count)
 * - Federal grant / external decision resolution
 * - Consequence cascades (affects sentiment, political standing)
 *
 * LEDGER: Initiative_Tracker
 * 
 * INTEGRATES WITH:
 * - Civic_Office_Ledger (council member status, factions)
 * - City Dynamics (sentiment for unnamed swing votes)
 * - Media Room (coverage triggers)
 * - Event Arc Engine (initiative arcs)
 *
 * ============================================================================
 */

/**
 * Main entry point - process initiatives for current cycle
 */
function runCivicInitiativeEngine_(ctx) {
  
  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Initiative_Tracker');
  
  if (!sheet) {
    Logger.log('civicInitiativeEngine: Initiative_Tracker sheet not found. Creating...');
    sheet = createInitiativeTrackerSheet_(ss);
  }
  
  var S = ctx.summary;
  var cycle = S.cycleId || ctx.config.cycleCount || 0;
  
  // Get council state
  var councilState = getCouncilState_(ctx);
  
  // Get city sentiment for swing vote calculations
  var dynamics = S.cityDynamics || { sentiment: 0 };
  var sentiment = dynamics.sentiment || 0;
  
  // Initialize tracking
  S.initiativeEvents = S.initiativeEvents || [];
  S.votesThisCycle = [];
  S.grantsThisCycle = [];
  
  // Read initiatives
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('civicInitiativeEngine: No initiatives to process');
    return;
  }
  
  var header = data[0];
  var rows = data.slice(1);
  
  var idx = function(name) { return header.indexOf(name); };
  
  var iID = idx('InitiativeID');
  var iName = idx('Name');
  var iType = idx('Type');
  var iStatus = idx('Status');
  var iBudget = idx('Budget');
  var iVoteReq = idx('VoteRequirement');
  var iVoteCycle = idx('VoteCycle');
  var iProjection = idx('Projection');
  var iFaction = idx('LeadFaction');
  var iOpposition = idx('OppositionFaction');
  var iSwingVoter = idx('SwingVoter');
  var iSwingVoter2 = idx('SwingVoter2');           // v1.1
  var iSwingVoter2Lean = idx('SwingVoter2Lean');   // v1.1
  var iOutcome = idx('Outcome');
  var iConsequences = idx('Consequences');
  var iNotes = idx('Notes');
  var iLastUpdated = idx('LastUpdated');
  
  var updated = false;
  
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    
    var initId = row[iID] || '';
    var name = row[iName] || '';
    var type = (row[iType] || 'vote').toString().toLowerCase();
    var status = (row[iStatus] || '').toString().toLowerCase();
    var voteCycle = Number(row[iVoteCycle]) || 0;
    var voteReq = row[iVoteReq] || '5-4';
    var projection = row[iProjection] || '';
    var leadFaction = row[iFaction] || '';
    var opposition = row[iOpposition] || '';
    var swingVoter = row[iSwingVoter] || '';
    var swingVoter2 = iSwingVoter2 >= 0 ? (row[iSwingVoter2] || '') : '';           // v1.1
    var swingVoter2Lean = iSwingVoter2Lean >= 0 ? (row[iSwingVoter2Lean] || '') : ''; // v1.1
    
    // Skip resolved or inactive
    if (status === 'resolved' || status === 'passed' || status === 'failed' || status === 'inactive') {
      continue;
    }
    
    // Check if this cycle triggers a vote or decision
    if (voteCycle === cycle && (status === 'active' || status === 'pending-vote')) {
      
      var result;
      
      if (type === 'vote' || type === 'council-vote') {
        // v1.1: Pass swing voter info as object
        var swingInfo = {
          primary: swingVoter,
          secondary: swingVoter2,
          secondaryLean: swingVoter2Lean
        };
        result = resolveCouncilVote_(ctx, row, header, councilState, sentiment, swingInfo);
      } else if (type === 'grant' || type === 'federal-grant' || type === 'external') {
        result = resolveExternalDecision_(ctx, row, header, sentiment);
      } else if (type === 'visioning' || type === 'input') {
        result = resolveVisioningPhase_(ctx, row, header);
      } else {
        // Default to council vote
        var swingInfo = {
          primary: swingVoter,
          secondary: swingVoter2,
          secondaryLean: swingVoter2Lean
        };
        result = resolveCouncilVote_(ctx, row, header, councilState, sentiment, swingInfo);
      }
      
      // Update row with result
      if (result) {
        row[iStatus] = result.status;
        row[iOutcome] = result.outcome;
        row[iConsequences] = result.consequences;
        row[iLastUpdated] = ctx.now;
        
        if (iNotes >= 0 && result.notes) {
          var existingNotes = row[iNotes] || '';
          row[iNotes] = existingNotes + (existingNotes ? '\n' : '') + 
                        'Cycle ' + cycle + ': ' + result.notes;
        }
        
        rows[r] = row;
        updated = true;
        
        // Track for summary
        S.initiativeEvents.push({
          id: initId,
          name: name,
          type: type,
          outcome: result.outcome,
          voteCount: result.voteCount || null,
          cycle: cycle
        });
        
        if (type === 'vote' || type === 'council-vote') {
          S.votesThisCycle.push({
            name: name,
            outcome: result.outcome,
            voteCount: result.voteCount,
            swingVoters: result.swingVoters || [],  // v1.1: Array of swing voter results
            swingVoted: result.swingVoted           // Legacy field
          });
        } else if (type === 'grant' || type === 'federal-grant') {
          S.grantsThisCycle.push({
            name: name,
            outcome: result.outcome
          });
        }
        
        // Apply consequences to world state
        applyInitiativeConsequences_(ctx, result, name, type);
      }
    }
    
    // Auto-advance status based on cycle proximity
    if (status === 'proposed' && voteCycle > 0 && (voteCycle - cycle) <= 3) {
      row[iStatus] = 'active';
      row[iLastUpdated] = ctx.now;
      rows[r] = row;
      updated = true;
    }
    
    if (status === 'active' && voteCycle > 0 && voteCycle === cycle + 1) {
      row[iStatus] = 'pending-vote';
      row[iLastUpdated] = ctx.now;
      rows[r] = row;
      updated = true;
    }
  }
  
  // Write back
  if (updated) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  // Update summary
  ctx.summary = S;
  
  Logger.log('civicInitiativeEngine v1.1: Processed ' + S.initiativeEvents.length + 
             ' initiatives | Votes: ' + S.votesThisCycle.length + 
             ' | Grants: ' + S.grantsThisCycle.length);
}


/**
 * ============================================================================
 * COUNCIL STATE
 * ============================================================================
 */

/**
 * Get current council composition and availability
 * Uses Civic_Office_Ledger with Faction and VotingPower columns
 */
function getCouncilState_(ctx) {
  
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
    indMembers: [],        // v1.1: Track IND members individually
    unavailable: [],
    mayor: null,
    president: null
  };
  
  if (!sheet) {
    Logger.log('getCouncilState_: Civic_Office_Ledger not found, falling back to Simulation_Ledger');
    return getCouncilStateFromSimLedger_(ctx);
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
  
  // Check if Faction column exists
  if (iFaction < 0) {
    Logger.log('getCouncilState_: Faction column not found. Run updateCivicOfficeLedgerFactions() first.');
    return getCouncilStateFromSimLedger_(ctx);
  }
  
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    
    var officeId = (row[iOfficeId] || '').toString();
    var title = (row[iTitle] || '').toString();
    var holder = (row[iHolder] || '').toString();
    var popId = (row[iPopId] || '').toString();
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    var faction = (row[iFaction] || '').toString().toUpperCase();
    var votingPower = iVotingPower >= 0 ? (row[iVotingPower] || 'no').toString().toLowerCase() : 'no';
    
    // Only process voting positions (Mayor + Council)
    var officePrefix = officeId.split('-')[0];
    if (officePrefix !== 'MAYOR' && officePrefix !== 'COUNCIL') continue;
    
    // Track vacant seats
    if (votingPower === 'vacant' || holder === 'TBD' || !holder || holder === '') {
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
    
    // v1.1: Track IND members individually for swing vote handling
    if (faction === 'IND' && isAvailable) {
      state.indMembers.push({
        name: holder,
        popId: popId,
        title: title
      });
    }
    
    // Track special roles
    if (officeId === 'MAYOR-01') {
      state.mayor = member;
    }
    if (title.indexOf('Council President') >= 0 || title.indexOf('President') >= 0) {
      state.president = member;
    }
  }
  
  return state;
}


/**
 * Fallback: Get council state from Simulation_Ledger (legacy method)
 */
function getCouncilStateFromSimLedger_(ctx) {
  
  var ss = ctx.ss;
  var ledger = ss.getSheetByName('Simulation_Ledger');
  
  var state = {
    totalSeats: 10,
    filledSeats: 0,
    availableVotes: 0,
    vacantSeats: 6,
    members: [],
    factions: {
      'OPP': { count: 0, available: 0, members: [] },
      'CRC': { count: 0, available: 0, members: [] },
      'IND': { count: 0, available: 0, members: [] }
    },
    indMembers: [],        // v1.1
    unavailable: [],
    mayor: null,
    president: null
  };
  
  if (!ledger) return state;
  
  var data = ledger.getDataRange().getValues();
  if (data.length < 2) return state;
  
  var header = data[0];
  var rows = data.slice(1);
  
  var idx = function(n) { return header.indexOf(n); };
  
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iCIV = idx('CIV (y/n)');
  var iRole = idx('RoleType');
  var iStatus = idx('Status');
  var iPopID = idx('POPID');
  
  // Known faction mappings
  var factionMap = {
    'POP-00034': 'OPP',   // Santana
    'POP-00042': 'IND',   // Vega
    'POP-00043': 'OPP',   // Rivers
    'POP-00044': 'CRC'    // Crane
  };
  
  // Council roles to look for
  var councilRoles = ['Mayor', 'Council President', 'Progressive Caucus Leader', 
                      'Business Caucus Leader', 'Council Member', 'Councilmember'];
  
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    
    var isCIV = (row[iCIV] || '').toString().toLowerCase();
    if (isCIV !== 'y' && isCIV !== 'yes') continue;
    
    var role = (row[iRole] || '').toString();
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    var name = ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim();
    var popId = (row[iPopID] || '').toString();
    
    // Check if voting council member
    var isVoter = false;
    for (var i = 0; i < councilRoles.length; i++) {
      if (role.indexOf(councilRoles[i]) >= 0) {
        isVoter = true;
        break;
      }
    }
    
    if (!isVoter) continue;
    
    // Get faction
    var faction = factionMap[popId] || 'IND';
    
    state.filledSeats++;
    
    var member = {
      name: name,
      popId: popId,
      role: role,
      status: status,
      faction: faction,
      available: true
    };
    
    // Check availability
    if (status === 'hospitalized' || status === 'serious-condition' || 
        status === 'critical' || status === 'injured' ||
        status === 'deceased' || status === 'resigned' || status === 'retired') {
      member.available = false;
      state.unavailable.push({ name: name, reason: status, faction: faction });
    } else {
      state.availableVotes++;
      state.factions[faction].available++;
      
      // v1.1: Track IND members
      if (faction === 'IND') {
        state.indMembers.push({
          name: name,
          popId: popId,
          title: role
        });
      }
    }
    
    state.members.push(member);
    state.factions[faction].count++;
    state.factions[faction].members.push(name);
    
    if (role.indexOf('Mayor') >= 0) {
      state.mayor = member;
    }
    if (role.indexOf('President') >= 0) {
      state.president = member;
    }
  }
  
  return state;
}


/**
 * ============================================================================
 * VOTE RESOLUTION v1.1
 * ============================================================================
 */

/**
 * Resolve a council vote
 * v1.1: Now accepts swingInfo object with primary, secondary, and secondaryLean
 */
function resolveCouncilVote_(ctx, row, header, councilState, sentiment, swingInfo) {
  
  var idx = function(n) { return header.indexOf(n); };
  
  var name = row[idx('Name')] || 'Unknown Initiative';
  var voteReq = (row[idx('VoteRequirement')] || '5-4').toString();
  var projection = (row[idx('Projection')] || '').toString().toLowerCase();
  var leadFaction = row[idx('LeadFaction')] || 'OPP';
  var opposition = row[idx('OppositionFaction')] || 'CRC';
  var budget = row[idx('Budget')] || '';
  
  // v1.1: Extract swing voter info
  var swingVoter = swingInfo ? swingInfo.primary : '';
  var swingVoter2 = swingInfo ? swingInfo.secondary : '';
  var swingVoter2Lean = swingInfo ? swingInfo.secondaryLean : '';
  
  // Parse vote requirement
  var reqParts = voteReq.split('-');
  var votesNeeded = parseInt(reqParts[0]) || 5;
  var isSupermajority = votesNeeded >= 6;
  
  // Check if vote is even possible
  var totalAvailable = councilState.availableVotes;
  var totalFilled = councilState.filledSeats;
  var vacantSeats = councilState.vacantSeats;
  
  // If not enough seats filled for quorum, vote is delayed
  if (totalAvailable < votesNeeded) {
    return {
      status: 'delayed',
      outcome: 'DELAYED',
      voteCount: totalAvailable + ' available, ' + votesNeeded + ' needed',
      consequences: 'Insufficient council members for vote. Delayed pending appointments.',
      notes: 'Vote delayed. Only ' + totalAvailable + ' votes available; ' + 
             votesNeeded + ' required. ' + vacantSeats + ' seats vacant.',
      swingVoters: []
    };
  }
  
  // Count base votes by faction
  var yesVotes = 0;
  var noVotes = 0;
  
  // Lead faction votes yes
  if (councilState.factions[leadFaction]) {
    yesVotes += councilState.factions[leadFaction].available;
  }
  
  // Opposition faction votes no
  if (councilState.factions[opposition]) {
    noVotes += councilState.factions[opposition].available;
  }
  
  // v1.1: Track which IND members have been processed
  var processedIndMembers = {};
  var swingVoterResults = [];
  
  // Get list of available IND members
  var availableIndMembers = councilState.indMembers || [];
  var remainingIndCount = availableIndMembers.length;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v1.1: PROCESS PRIMARY SWING VOTER
  // ═══════════════════════════════════════════════════════════════════════════
  if (swingVoter) {
    var primaryAvailable = isSwingVoterAvailable_(swingVoter, councilState, availableIndMembers);
    
    if (primaryAvailable) {
      // Use projection-based probability for primary swing voter
      var primaryProb = calculateSwingProbability_(projection, sentiment, isSupermajority);
      var primaryVotedYes = Math.random() < primaryProb;
      
      if (primaryVotedYes) {
        yesVotes++;
      } else {
        noVotes++;
      }
      
      processedIndMembers[swingVoter] = true;
      remainingIndCount--;
      
      swingVoterResults.push({
        name: swingVoter,
        vote: primaryVotedYes ? 'yes' : 'no',
        probability: primaryProb,
        source: 'projection'
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v1.1: PROCESS SECONDARY SWING VOTER
  // ═══════════════════════════════════════════════════════════════════════════
  if (swingVoter2 && !processedIndMembers[swingVoter2]) {
    var secondaryAvailable = isSwingVoterAvailable_(swingVoter2, councilState, availableIndMembers);
    
    if (secondaryAvailable) {
      // Use lean-based probability for secondary swing voter
      var secondaryProb = calculateLeanProbability_(swingVoter2Lean, sentiment);
      var secondaryVotedYes = Math.random() < secondaryProb;
      
      if (secondaryVotedYes) {
        yesVotes++;
      } else {
        noVotes++;
      }
      
      processedIndMembers[swingVoter2] = true;
      remainingIndCount--;
      
      swingVoterResults.push({
        name: swingVoter2,
        vote: secondaryVotedYes ? 'yes' : 'no',
        probability: secondaryProb,
        lean: swingVoter2Lean,
        source: 'lean'
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v1.1: PROCESS REMAINING UNNAMED IND MEMBERS
  // ═══════════════════════════════════════════════════════════════════════════
  for (var i = 0; i < availableIndMembers.length; i++) {
    var indMember = availableIndMembers[i];
    
    // Skip if already processed as named swing voter
    if (processedIndMembers[indMember.name]) continue;
    
    // Unnamed IND members use pure sentiment-based probability
    var unnamedProb = 0.5 + (sentiment * 0.15);
    var unnamedVotedYes = Math.random() < unnamedProb;
    
    if (unnamedVotedYes) {
      yesVotes++;
    } else {
      noVotes++;
    }
    
    swingVoterResults.push({
      name: indMember.name,
      vote: unnamedVotedYes ? 'yes' : 'no',
      probability: unnamedProb,
      source: 'sentiment'
    });
  }
  
  // Determine outcome
  var passed = yesVotes >= votesNeeded;
  var voteCount = yesVotes + '-' + noVotes;
  
  // Build result
  var result = {
    status: passed ? 'passed' : 'failed',
    outcome: passed ? 'PASSED' : 'FAILED',
    voteCount: voteCount,
    swingVoters: swingVoterResults,
    swingVoted: swingVoterResults.length > 0 ? swingVoterResults[0].vote : null,  // Legacy field
    consequences: '',
    notes: ''
  };
  
  // Generate consequences and notes
  if (passed) {
    result.consequences = 'Initiative approved. Implementation begins.';
    result.notes = 'Passed ' + voteCount + '.';
  } else {
    result.consequences = 'Initiative defeated. Political fallout expected.';
    result.notes = 'Failed ' + voteCount + '.';
    if (isSupermajority) {
      result.notes += ' Supermajority requirement not met.';
    }
  }
  
  // v1.1: Add swing voter details to notes
  for (var s = 0; s < swingVoterResults.length; s++) {
    var sv = swingVoterResults[s];
    if (sv.source === 'projection' || sv.source === 'lean') {
      result.notes += ' ' + sv.name + ' voted ' + sv.vote + '.';
    }
  }
  
  // Add unavailable member impact
  if (councilState.unavailable.length > 0) {
    var unavailNames = [];
    for (var k = 0; k < councilState.unavailable.length; k++) {
      unavailNames.push(councilState.unavailable[k].name);
    }
    result.notes += ' (' + unavailNames.join(', ') + ' absent)';
  }
  
  // Note vacant seats if relevant
  if (vacantSeats > 0) {
    result.notes += ' [' + vacantSeats + ' seats vacant]';
  }
  
  return result;
}


/**
 * v1.1: Check if a named swing voter is available
 */
function isSwingVoterAvailable_(voterName, councilState, availableIndMembers) {
  if (!voterName) return false;
  
  // Check if in unavailable list
  for (var i = 0; i < councilState.unavailable.length; i++) {
    if (councilState.unavailable[i].name === voterName) {
      return false;
    }
  }
  
  // Check if in available IND members
  for (var j = 0; j < availableIndMembers.length; j++) {
    if (availableIndMembers[j].name === voterName) {
      return true;
    }
  }
  
  return false;
}


/**
 * Calculate swing vote probability from projection (for primary swing voter)
 */
function calculateSwingProbability_(projection, sentiment, isSupermajority) {
  
  var baseProb = 0.5; // True toss-up default
  
  // Adjust based on projection
  if (projection.indexOf('likely pass') >= 0) {
    baseProb = 0.70;
  } else if (projection.indexOf('lean') >= 0 && projection.indexOf('pass') >= 0) {
    baseProb = 0.60;
  } else if (projection.indexOf('likely fail') >= 0) {
    baseProb = 0.30;
  } else if (projection.indexOf('lean') >= 0 && projection.indexOf('fail') >= 0) {
    baseProb = 0.40;
  } else if (projection.indexOf('toss-up') >= 0 || projection.indexOf('uncertain') >= 0) {
    baseProb = 0.50;
  } else if (projection.indexOf('needs') >= 0) {
    baseProb = 0.45; // Slightly under if explicitly noted as needing swing
  }
  
  // Sentiment modifier (-1 to +1 scale)
  baseProb += sentiment * 0.1;
  
  // Supermajority items face higher bar
  if (isSupermajority) {
    baseProb -= 0.05;
  }
  
  // Clamp
  if (baseProb < 0.15) baseProb = 0.15;
  if (baseProb > 0.85) baseProb = 0.85;
  
  return baseProb;
}


/**
 * v1.1: Calculate swing vote probability from lean field (for secondary swing voter)
 */
function calculateLeanProbability_(lean, sentiment) {
  
  var baseProb = 0.5; // Default if no lean specified
  
  if (!lean) return baseProb;
  
  var leanLower = lean.toString().toLowerCase();
  
  // Parse lean values
  if (leanLower === 'lean-yes' || leanLower === 'lean yes' || leanLower === 'leaning yes') {
    baseProb = 0.65;
  } else if (leanLower === 'likely-yes' || leanLower === 'likely yes') {
    baseProb = 0.75;
  } else if (leanLower === 'lean-no' || leanLower === 'lean no' || leanLower === 'leaning no') {
    baseProb = 0.35;
  } else if (leanLower === 'likely-no' || leanLower === 'likely no') {
    baseProb = 0.25;
  } else if (leanLower === 'toss-up' || leanLower === 'undecided' || leanLower === 'uncertain') {
    baseProb = 0.50;
  }
  
  // Smaller sentiment modifier for lean-based votes (Media Room already factored context)
  baseProb += sentiment * 0.05;
  
  // Clamp
  if (baseProb < 0.15) baseProb = 0.15;
  if (baseProb > 0.85) baseProb = 0.85;
  
  return baseProb;
}


/**
 * ============================================================================
 * EXTERNAL DECISIONS (Grants, Federal)
 * ============================================================================
 */

/**
 * Resolve federal grant or external binary decision
 */
function resolveExternalDecision_(ctx, row, header, sentiment) {
  
  var idx = function(n) { return header.indexOf(n); };
  
  var name = row[idx('Name')] || 'Unknown Grant';
  var projection = (row[idx('Projection')] || '').toString().toLowerCase();
  var budget = row[idx('Budget')] || '';
  
  // Base probability for grant approval
  var baseProb = 0.50;
  
  // Adjust based on projection notes
  if (projection.indexOf('likely') >= 0 && projection.indexOf('approv') >= 0) {
    baseProb = 0.70;
  } else if (projection.indexOf('compet') >= 0) {
    baseProb = 0.45;
  } else if (projection.indexOf('strong') >= 0) {
    baseProb = 0.65;
  }
  
  // Slight sentiment boost (city doing well = better application)
  baseProb += sentiment * 0.05;
  
  // Clamp
  if (baseProb < 0.25) baseProb = 0.25;
  if (baseProb > 0.75) baseProb = 0.75;
  
  var approved = Math.random() < baseProb;
  
  var result = {
    status: approved ? 'passed' : 'failed',
    outcome: approved ? 'APPROVED' : 'DENIED',
    consequences: '',
    notes: '',
    swingVoters: []
  };
  
  if (approved) {
    result.consequences = 'Federal funding secured. Project accelerates.';
    result.notes = 'Grant approved. Full funding confirmed.';
  } else {
    result.consequences = 'Grant denied. Timeline delayed, scope reduced.';
    result.notes = 'Grant denied. Contingency planning required.';
  }
  
  return result;
}


/**
 * ============================================================================
 * VISIONING / INPUT PHASES
 * ============================================================================
 */

/**
 * Resolve visioning/community input phase (always "completes")
 */
function resolveVisioningPhase_(ctx, row, header) {
  
  var idx = function(n) { return header.indexOf(n); };
  var name = row[idx('Name')] || 'Unknown Initiative';
  
  // Visioning phases complete, they don't pass/fail
  var result = {
    status: 'visioning-complete',
    outcome: 'COMPLETED',
    consequences: 'Community input gathered. Next phase: formal proposal.',
    notes: 'Visioning phase concluded. Input documented.',
    swingVoters: []
  };
  
  return result;
}


/**
 * ============================================================================
 * CONSEQUENCES
 * ============================================================================
 */

/**
 * Apply consequences of initiative outcome to world state
 */
function applyInitiativeConsequences_(ctx, result, name, type) {
  
  var S = ctx.summary;
  var dynamics = S.cityDynamics || { sentiment: 0 };
  
  // Sentiment shifts based on outcome
  if (result.outcome === 'PASSED' || result.outcome === 'APPROVED') {
    // Positive outcome boosts sentiment slightly
    dynamics.sentiment = (dynamics.sentiment || 0) + 0.05;
    
    // Track for narrative
    S.positiveInitiatives = S.positiveInitiatives || [];
    S.positiveInitiatives.push(name);
    
  } else if (result.outcome === 'FAILED' || result.outcome === 'DENIED') {
    // Negative outcome dampens sentiment
    dynamics.sentiment = (dynamics.sentiment || 0) - 0.05;
    
    // Track for narrative
    S.failedInitiatives = S.failedInitiatives || [];
    S.failedInitiatives.push(name);
  }
  
  // Clamp sentiment
  if (dynamics.sentiment > 1) dynamics.sentiment = 1;
  if (dynamics.sentiment < -1) dynamics.sentiment = -1;
  
  S.cityDynamics = dynamics;
  ctx.summary = S;
}


/**
 * ============================================================================
 * SHEET INITIALIZATION v1.1
 * ============================================================================
 */

/**
 * Create Initiative_Tracker sheet with headers
 * v1.1: Added SwingVoter2 and SwingVoter2Lean columns
 */
function createInitiativeTrackerSheet_(ss) {
  
  var sheet = ss.insertSheet('Initiative_Tracker');
  
  var headers = [
    'InitiativeID',      // A - Unique ID (INIT-001, etc.)
    'Name',              // B - Initiative name
    'Type',              // C - vote, grant, visioning, external
    'Status',            // D - proposed, active, pending-vote, passed, failed, resolved
    'Budget',            // E - Dollar amount
    'VoteRequirement',   // F - 5-4, 6-3, etc.
    'VoteCycle',         // G - Cycle when vote/decision occurs
    'Projection',        // H - likely passes, toss-up, needs 1 swing, etc.
    'LeadFaction',       // I - OPP, CRC
    'OppositionFaction', // J - CRC, OPP
    'SwingVoter',        // K - Primary swing voter name
    'SwingVoter2',       // L - Secondary swing voter name (v1.1)
    'SwingVoter2Lean',   // M - Secondary swing voter lean: lean-yes, lean-no, toss-up (v1.1)
    'Outcome',           // N - PASSED, FAILED, APPROVED, DENIED
    'Consequences',      // O - What happens as result
    'Notes',             // P - Running notes
    'LastUpdated'        // Q - Timestamp
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  // Set column widths
  sheet.setColumnWidth(1, 100);  // InitiativeID
  sheet.setColumnWidth(2, 250);  // Name
  sheet.setColumnWidth(3, 80);   // Type
  sheet.setColumnWidth(4, 100);  // Status
  sheet.setColumnWidth(5, 100);  // Budget
  sheet.setColumnWidth(6, 100);  // VoteRequirement
  sheet.setColumnWidth(7, 80);   // VoteCycle
  sheet.setColumnWidth(8, 150);  // Projection
  sheet.setColumnWidth(9, 80);   // LeadFaction
  sheet.setColumnWidth(10, 100); // OppositionFaction
  sheet.setColumnWidth(11, 120); // SwingVoter
  sheet.setColumnWidth(12, 120); // SwingVoter2 (v1.1)
  sheet.setColumnWidth(13, 100); // SwingVoter2Lean (v1.1)
  sheet.setColumnWidth(14, 80);  // Outcome
  sheet.setColumnWidth(15, 250); // Consequences
  sheet.setColumnWidth(16, 300); // Notes
  sheet.setColumnWidth(17, 120); // LastUpdated
  
  Logger.log('Created Initiative_Tracker sheet with v1.1 schema');
  
  return sheet;
}


/**
 * ============================================================================
 * ADD COLUMNS TO EXISTING SHEET (Run manually if sheet exists)
 * ============================================================================
 */

function addSwingVoter2Columns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Initiative_Tracker');
  
  if (!sheet) {
    Logger.log('Initiative_Tracker not found');
    return;
  }
  
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Check if columns already exist
  if (header.indexOf('SwingVoter2') >= 0) {
    Logger.log('SwingVoter2 column already exists');
    return;
  }
  
  // Find SwingVoter column position
  var swingVoterIdx = header.indexOf('SwingVoter');
  if (swingVoterIdx < 0) {
    Logger.log('SwingVoter column not found');
    return;
  }
  
  // Insert 2 columns after SwingVoter
  var insertAfter = swingVoterIdx + 2; // +1 for 1-index, +1 for after
  sheet.insertColumnsAfter(insertAfter, 2);
  
  // Set headers
  sheet.getRange(1, insertAfter + 1).setValue('SwingVoter2');
  sheet.getRange(1, insertAfter + 2).setValue('SwingVoter2Lean');
  
  // Set column widths
  sheet.setColumnWidth(insertAfter + 1, 120);
  sheet.setColumnWidth(insertAfter + 2, 100);
  
  Logger.log('Added SwingVoter2 and SwingVoter2Lean columns after SwingVoter');
}


/**
 * ============================================================================
 * SEED DATA FUNCTION v1.1
 * ============================================================================
 * Run manually to populate initial initiatives from your planning document
 */

/**
 * PUBLIC WRAPPER - Run this from the script editor
 */
function seedInitiativeTracker() {
  seedInitiativeTracker_();
}

function seedInitiativeTracker_() {
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Initiative_Tracker');
  
  if (!sheet) {
    sheet = createInitiativeTrackerSheet_(ss);
  }
  
  // v1.1: Updated seed data with SwingVoter2 and SwingVoter2Lean
  var initiatives = [
    // West Oakland Stabilization Fund
    ['INIT-001', 'West Oakland Stabilization Fund', 'vote', 'active', '$28M', '6-3', 78,
     '5-4 OPP — needs 1 swing', 'OPP', 'CRC', 'Ramon Vega', 'Leonard Tran', 'lean-yes', '', '', '', ''],
    
    // Oakland Alternative Response Initiative
    ['INIT-002', 'Oakland Alternative Response Initiative', 'vote', 'proposed', '$12.5M', '5-4', 82,
     'Uncertain — true toss-up', 'OPP', 'CRC', 'Ramon Vega', 'Leonard Tran', 'toss-up', '', '', '', ''],
    
    // Fruitvale Transit Hub Phase II - Visioning
    ['INIT-003', 'Fruitvale Transit Hub Phase II — Visioning', 'visioning', 'proposed', '$230M', '', 86,
     'Input phase — no vote', 'OPP', '', '', '', '', '', '', '', ''],
    
    // Port Green Modernization - Federal Grant
    ['INIT-004', 'Port of Oakland Green Modernization — Federal Grant', 'grant', 'proposed', '$320M', '', 89,
     'Competitive — external decision', '', '', '', '', '', '', '', '', ''],
    
    // Temescal Health Center
    ['INIT-005', 'Temescal Community Health Center', 'vote', 'proposed', '$45M', '5-4', 80,
     'Likely passes', 'OPP', 'CRC', '', 'Marcus Tran', 'lean-yes', '', '', '', ''],
    
    // Baylight Final Vote
    ['INIT-006', 'Baylight District — Final Council Vote', 'vote', 'active', '$2.1B', '5-4', 83,
     'Likely passes with conditions', 'OPP', 'CRC', 'Ramon Vega', 'Leonard Tran', 'lean-yes', '', '', '', '']
  ];
  
  // Write seed data
  if (initiatives.length > 0) {
    sheet.getRange(2, 1, initiatives.length, initiatives[0].length).setValues(initiatives);
  }
  
  Logger.log('Seeded ' + initiatives.length + ' initiatives to Initiative_Tracker (v1.1 schema)');
}


/**
 * ============================================================================
 * UTILITY: Get Initiative Summary for Media Room
 * ============================================================================
 */

function getInitiativeSummaryForMedia_(ctx) {
  
  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Initiative_Tracker');
  
  if (!sheet) return { active: [], pending: [], recent: [] };
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { active: [], pending: [], recent: [] };
  
  var header = data[0];
  var rows = data.slice(1);
  
  var idx = function(n) { return header.indexOf(n); };
  var cycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;
  
  var summary = {
    active: [],
    pending: [],
    recent: []
  };
  
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    
    var name = row[idx('Name')] || '';
    var status = (row[idx('Status')] || '').toString().toLowerCase();
    var voteCycle = Number(row[idx('VoteCycle')]) || 0;
    var outcome = row[idx('Outcome')] || '';
    var type = row[idx('Type')] || '';
    var swingVoter = row[idx('SwingVoter')] || '';
    var swingVoter2 = idx('SwingVoter2') >= 0 ? (row[idx('SwingVoter2')] || '') : '';
    var swingVoter2Lean = idx('SwingVoter2Lean') >= 0 ? (row[idx('SwingVoter2Lean')] || '') : '';
    
    if (status === 'active') {
      summary.active.push({
        name: name,
        voteCycle: voteCycle,
        cyclesUntilVote: voteCycle - cycle,
        swingVoter: swingVoter,
        swingVoter2: swingVoter2,
        swingVoter2Lean: swingVoter2Lean
      });
    }
    
    if (status === 'pending-vote') {
      summary.pending.push({
        name: name,
        voteCycle: voteCycle,
        swingVoter: swingVoter,
        swingVoter2: swingVoter2,
        swingVoter2Lean: swingVoter2Lean
      });
    }
    
    // Recent = resolved in last 3 cycles
    if ((status === 'passed' || status === 'failed') && 
        voteCycle >= (cycle - 3)) {
      summary.recent.push({
        name: name,
        outcome: outcome,
        cycle: voteCycle
      });
    }
  }
  
  return summary;
}


/**
 * ============================================================================
 * REFERENCE v1.1
 * ============================================================================
 *
 * INITIATIVE TYPES:
 * - vote / council-vote: Requires council vote, uses faction math
 * - grant / federal-grant: Binary external decision, probability roll
 * - visioning / input: Community input phase, always completes
 * - external: Other binary decisions
 *
 * STATUS LIFECYCLE:
 * proposed → active → pending-vote → passed/failed
 *
 * VOTE REQUIREMENTS:
 * - 5-4: Simple majority (5 of 9 needed)
 * - 6-3: Supermajority (reserve fund draws, charter amendments)
 *
 * FACTION CODES:
 * - OPP: Oakland People's Party (progressive)
 * - CRC: Civic Reform Coalition (business-oriented)
 * - IND: Independent (swing voters)
 *
 * SWING VOTER HANDLING (v1.1):
 * 
 * | Field | Source | Probability Calculation |
 * |-------|--------|-------------------------|
 * | SwingVoter | Projection field | 0.30-0.70 based on "likely pass/fail" keywords |
 * | SwingVoter2 | SwingVoter2Lean field | 0.25-0.75 based on lean-yes/lean-no/toss-up |
 * | Unnamed IND | Sentiment | 0.5 + (sentiment × 0.15) |
 *
 * SWING VOTER 2 LEAN VALUES:
 * - lean-yes / leaning yes: 65% yes probability
 * - likely-yes: 75% yes probability
 * - lean-no / leaning no: 35% yes probability
 * - likely-no: 25% yes probability
 * - toss-up / undecided: 50% yes probability
 *
 * PROJECTION KEYWORDS (for primary swing voter):
 * - "likely passes" → 70% swing vote probability
 * - "likely fails" → 30% swing vote probability
 * - "toss-up" / "uncertain" → 50% swing vote probability
 * - "needs 1 swing" → 45% swing vote probability
 *
 * COUNCIL MEMBER AVAILABILITY:
 * Members with these statuses are excluded from vote count:
 * - hospitalized, serious condition, critical, injured
 * - deceased, resigned, retired
 *
 * SCHEMA (17 columns):
 * A - InitiativeID
 * B - Name
 * C - Type
 * D - Status
 * E - Budget
 * F - VoteRequirement
 * G - VoteCycle
 * H - Projection
 * I - LeadFaction
 * J - OppositionFaction
 * K - SwingVoter (primary)
 * L - SwingVoter2 (secondary) [v1.1]
 * M - SwingVoter2Lean [v1.1]
 * N - Outcome
 * O - Consequences
 * P - Notes
 * Q - LastUpdated
 *
 * ============================================================================
 */