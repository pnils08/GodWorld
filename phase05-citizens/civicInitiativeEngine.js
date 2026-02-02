/**
 * ============================================================================
 * civicInitiativeEngine_ v1.5
 * ============================================================================
 *
 * Tracks civic initiatives and resolves votes/outcomes when cycles match.
 *
 * v1.5 Changes:
 * - FIX: Delayed initiatives now retry each cycle instead of getting stuck
 * - FIX: Replaced Math.random() with ctx.rng for deterministic simulation
 * - Added rng parameter to resolveCouncilVote_ and resolveExternalDecision_
 *
 * v1.4 Changes:
 * - Added manualRunVote(initiativeId) for on-demand vote execution
 * - Manual votes bypass cycle checks but respect resolution guards
 * - Notes prefixed with "MANUAL" to distinguish from automatic processing
 *
 * v1.3 Changes:
 * - Integrated Tier 3 Neighborhood Demographics into vote resolution
 * - Swing voter probability modified by initiative's affected neighborhoods
 * - Demographics influence: senior-heavy areas boost senior-benefit initiatives
 * - Added AffectedNeighborhoods column support
 * - Initiative type→demographic alignment mapping
 *
 * v1.2 Changes:
 * - Fixed addSwingVoter2Columns() column insertion bug (0-based vs 1-based)
 * - 9-seat council model: mayor has veto power but doesn't vote
 * - Added required header validation to prevent silent write failures
 * - Clamp unnamed IND probability to 0.15-0.85 (consistency with named voters)
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
  // v1.5 FIX: Use deterministic RNG from context
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

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

  // v1.3: Load neighborhood demographics for vote influence
  var neighborhoodDemographics = {};
  if (typeof getNeighborhoodDemographics_ === 'function') {
    neighborhoodDemographics = getNeighborhoodDemographics_(ss);
  }

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
  var iAffectedNeighborhoods = idx('AffectedNeighborhoods');  // v1.3

  // v1.2: Required header validation to prevent silent write failures
  var required = ['InitiativeID', 'Name', 'Type', 'Status', 'VoteCycle',
                  'VoteRequirement', 'Projection', 'LeadFaction',
                  'OppositionFaction', 'SwingVoter', 'Outcome',
                  'Consequences', 'LastUpdated'];
  for (var h = 0; h < required.length; h++) {
    if (idx(required[h]) < 0) {
      Logger.log('civicInitiativeEngine: Initiative_Tracker missing required header: ' + required[h]);
      return;  // Abort to prevent silent failures
    }
  }

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

    // v1.5 FIX: Re-check delayed initiatives each cycle
    // Delayed initiatives should try again - don't stay stuck forever
    if (status === 'delayed') {
      // Update VoteCycle to current cycle to retry
      row[iVoteCycle] = cycle;
      voteCycle = cycle;
      row[iStatus] = 'pending-vote';  // Reset to pending-vote to allow re-attempt
      status = 'pending-vote';
      rows[r] = row;
      updated = true;
      Logger.log('civicInitiativeEngine: Retrying delayed initiative ' + initId);
    }

    // Check if this cycle triggers a vote or decision
    if (voteCycle === cycle && (status === 'active' || status === 'pending-vote')) {
      
      var result;
      
      // v1.3: Get affected neighborhoods for demographic influence
      var affectedNeighborhoods = [];
      if (iAffectedNeighborhoods >= 0 && row[iAffectedNeighborhoods]) {
        affectedNeighborhoods = String(row[iAffectedNeighborhoods]).split(',').map(function(n) {
          return n.trim();
        }).filter(function(n) { return n !== ''; });
      }

      if (type === 'vote' || type === 'council-vote') {
        // v1.3: Pass swing voter info and demographics
        var swingInfo = {
          primary: swingVoter,
          secondary: swingVoter2,
          secondaryLean: swingVoter2Lean
        };
        var demoContext = {
          demographics: neighborhoodDemographics,
          affectedNeighborhoods: affectedNeighborhoods,
          initiativeType: type,
          initiativeName: name
        };
        result = resolveCouncilVote_(ctx, row, header, councilState, sentiment, swingInfo, demoContext, rng);
      } else if (type === 'grant' || type === 'federal-grant' || type === 'external') {
        result = resolveExternalDecision_(ctx, row, header, sentiment, rng);
      } else if (type === 'visioning' || type === 'input') {
        result = resolveVisioningPhase_(ctx, row, header);
      } else {
        // Default to council vote
        var swingInfo = {
          primary: swingVoter,
          secondary: swingVoter2,
          secondaryLean: swingVoter2Lean
        };
        var demoContext = {
          demographics: neighborhoodDemographics,
          affectedNeighborhoods: affectedNeighborhoods,
          initiativeType: type,
          initiativeName: name
        };
        result = resolveCouncilVote_(ctx, row, header, councilState, sentiment, swingInfo, demoContext, rng);
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
  
  // v1.3: Track demographic influence in summary
  S.civicDemographicContext = {
    neighborhoodsLoaded: Object.keys(neighborhoodDemographics).length,
    demographicsAvailable: Object.keys(neighborhoodDemographics).length > 0
  };

  Logger.log('civicInitiativeEngine v1.5: Processed ' + S.initiativeEvents.length +
             ' initiatives | Votes: ' + S.votesThisCycle.length +
             ' | Grants: ' + S.grantsThisCycle.length +
             ' | Demographics: ' + (Object.keys(neighborhoodDemographics).length > 0 ? 'active' : 'unavailable'));
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
  
  // v1.2: 9-seat council model - mayor has veto power but doesn't vote
  var state = {
    totalSeats: 9,         // Council only (mayor has veto, not vote)
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
    mayor: null,           // Tracked for veto power, not voting
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
    
    // Only process council and mayor positions
    var officePrefix = officeId.split('-')[0];
    if (officePrefix !== 'MAYOR' && officePrefix !== 'COUNCIL') continue;

    // v1.2: Mayor tracked for veto power but doesn't vote on council matters
    if (officePrefix === 'MAYOR') {
      state.mayor = {
        name: holder,
        popId: popId,
        office: officeId,
        title: title,
        status: status,
        faction: faction,
        available: status !== 'hospitalized' && status !== 'deceased'
      };
      continue;  // Skip vote counting for mayor
    }

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
    
    // Track council president
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
  
  // v1.2: 9-seat council model
  var state = {
    totalSeats: 9,
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
    mayor: null,           // Tracked for veto, not voting
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

    // v1.2: Mayor tracked for veto power but doesn't vote
    if (role.indexOf('Mayor') >= 0 && role.indexOf('Council') < 0) {
      state.mayor = {
        name: name,
        popId: popId,
        role: role,
        status: status,
        faction: factionMap[popId] || 'IND',
        available: status !== 'hospitalized' && status !== 'deceased'
      };
      continue;  // Skip vote counting for mayor
    }

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

    // Track council president
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
 * v1.3: Now accepts demoContext with neighborhood demographics for vote influence
 * v1.5: Now accepts rng function for deterministic simulation
 */
function resolveCouncilVote_(ctx, row, header, councilState, sentiment, swingInfo, demoContext, rng) {
  // v1.5: Use passed rng or fallback
  rng = rng || Math.random;

  // v1.3: Demographics context (optional for backwards compatibility)
  demoContext = demoContext || { demographics: {}, affectedNeighborhoods: [] };
  
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
  // v1.3: Calculate demographic influence for this initiative
  var demographicInfluence = calculateDemographicInfluence_(demoContext);

  if (swingVoter) {
    var primaryAvailable = isSwingVoterAvailable_(swingVoter, councilState, availableIndMembers);

    if (primaryAvailable) {
      // Use projection-based probability for primary swing voter
      var primaryProb = calculateSwingProbability_(projection, sentiment, isSupermajority);
      // v1.3: Apply demographic influence
      primaryProb += demographicInfluence;
      if (primaryProb < 0.15) primaryProb = 0.15;
      if (primaryProb > 0.85) primaryProb = 0.85;
      var primaryVotedYes = rng() < primaryProb;
      
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
      // v1.3: Apply demographic influence
      secondaryProb += demographicInfluence;
      if (secondaryProb < 0.15) secondaryProb = 0.15;
      if (secondaryProb > 0.85) secondaryProb = 0.85;
      var secondaryVotedYes = rng() < secondaryProb;
      
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
    // v1.3: Apply demographic influence to unnamed members too
    unnamedProb += demographicInfluence;
    // v1.2: Clamp to match named swing voter bounds
    if (unnamedProb < 0.15) unnamedProb = 0.15;
    if (unnamedProb > 0.85) unnamedProb = 0.85;
    var unnamedVotedYes = rng() < unnamedProb;
    
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
    notes: '',
    affectedNeighborhoods: demoContext.affectedNeighborhoods || []  // v1.3: For ripple effects
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
 * DEMOGRAPHIC INFLUENCE (v1.3)
 * ============================================================================
 */

/**
 * v1.3: Calculate demographic influence on swing vote probability
 * Initiatives that benefit underserved demographics get boosted support
 *
 * @param {Object} demoContext - Demographics context from vote resolution
 * @param {string} initiativeName - Name of the initiative
 * @return {number} Probability modifier (-0.15 to +0.15)
 */
function calculateDemographicInfluence_(demoContext) {
  var modifier = 0;

  if (!demoContext || !demoContext.demographics) return modifier;

  var demographics = demoContext.demographics;
  var affected = demoContext.affectedNeighborhoods || [];
  var name = (demoContext.initiativeName || '').toLowerCase();

  // No affected neighborhoods specified = neutral
  if (affected.length === 0) return modifier;

  // Calculate aggregate demographics of affected neighborhoods
  var totalStudents = 0;
  var totalAdults = 0;
  var totalSeniors = 0;
  var totalUnemployed = 0;
  var totalSick = 0;
  var totalPop = 0;

  for (var i = 0; i < affected.length; i++) {
    var hood = affected[i];
    var demo = demographics[hood];
    if (demo) {
      totalStudents += demo.students || 0;
      totalAdults += demo.adults || 0;
      totalSeniors += demo.seniors || 0;
      totalUnemployed += demo.unemployed || 0;
      totalSick += demo.sick || 0;
      totalPop += (demo.students || 0) + (demo.adults || 0) + (demo.seniors || 0);
    }
  }

  if (totalPop === 0) return modifier;

  // Calculate demographic ratios
  var seniorRatio = totalSeniors / totalPop;
  var studentRatio = totalStudents / totalPop;
  var unemploymentRate = totalUnemployed / totalPop;
  var sicknessRate = totalSick / totalPop;

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIATIVE TYPE → DEMOGRAPHIC ALIGNMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // Health initiatives get boost from areas with high senior/sick populations
  if (name.indexOf('health') >= 0 || name.indexOf('clinic') >= 0 ||
      name.indexOf('hospital') >= 0 || name.indexOf('medical') >= 0) {
    if (seniorRatio > 0.25) modifier += 0.08;
    if (sicknessRate > 0.08) modifier += 0.06;
  }

  // Housing/stabilization initiatives get boost from areas with high unemployment
  if (name.indexOf('housing') >= 0 || name.indexOf('stabiliz') >= 0 ||
      name.indexOf('afford') >= 0 || name.indexOf('rent') >= 0) {
    if (unemploymentRate > 0.12) modifier += 0.10;
    if (seniorRatio > 0.20) modifier += 0.05;
  }

  // Transit initiatives benefit working adults
  if (name.indexOf('transit') >= 0 || name.indexOf('bart') >= 0 ||
      name.indexOf('bus') >= 0 || name.indexOf('transportation') >= 0) {
    var adultRatio = totalAdults / totalPop;
    if (adultRatio > 0.55) modifier += 0.06;
    if (studentRatio > 0.20) modifier += 0.05;
  }

  // Education/youth initiatives benefit areas with high student population
  if (name.indexOf('school') >= 0 || name.indexOf('education') >= 0 ||
      name.indexOf('youth') >= 0 || name.indexOf('student') >= 0) {
    if (studentRatio > 0.25) modifier += 0.10;
  }

  // Jobs/economic initiatives benefit areas with high unemployment
  if (name.indexOf('job') >= 0 || name.indexOf('employment') >= 0 ||
      name.indexOf('business') >= 0 || name.indexOf('economic') >= 0) {
    if (unemploymentRate > 0.10) modifier += 0.08;
  }

  // Senior-specific initiatives
  if (name.indexOf('senior') >= 0 || name.indexOf('elder') >= 0 ||
      name.indexOf('aging') >= 0 || name.indexOf('retire') >= 0) {
    if (seniorRatio > 0.20) modifier += 0.12;
  }

  // Alternative/progressive policing gets mixed response based on demographics
  if (name.indexOf('alternative') >= 0 || name.indexOf('response') >= 0 ||
      name.indexOf('police') >= 0 || name.indexOf('safety') >= 0) {
    // Young areas more supportive
    if (studentRatio > 0.20) modifier += 0.05;
    // Senior areas more cautious
    if (seniorRatio > 0.25) modifier -= 0.03;
  }

  // Clamp modifier
  if (modifier > 0.15) modifier = 0.15;
  if (modifier < -0.15) modifier = -0.15;

  return modifier;
}


/**
 * ============================================================================
 * EXTERNAL DECISIONS (Grants, Federal)
 * ============================================================================
 */

/**
 * Resolve federal grant or external binary decision
 * v1.5: Now accepts rng function for deterministic simulation
 */
function resolveExternalDecision_(ctx, row, header, sentiment, rng) {
  rng = rng || Math.random;
  
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
  
  var approved = rng() < baseProb;
  
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
 * v1.3: Added neighborhood ripple effects based on initiative type
 */
function applyInitiativeConsequences_(ctx, result, name, type) {

  var S = ctx.summary;
  var dynamics = S.cityDynamics || { sentiment: 0 };
  var nameLower = (name || '').toLowerCase();

  // Initialize ripple tracking
  S.initiativeRipples = S.initiativeRipples || [];

  // Get affected neighborhoods from result (set during vote resolution)
  var affectedNeighborhoods = result.affectedNeighborhoods || [];

  // Sentiment shifts based on outcome
  if (result.outcome === 'PASSED' || result.outcome === 'APPROVED') {
    // Positive outcome boosts sentiment slightly
    dynamics.sentiment = (dynamics.sentiment || 0) + 0.05;

    // Track for narrative
    S.positiveInitiatives = S.positiveInitiatives || [];
    S.positiveInitiatives.push(name);

    // v1.3: Apply neighborhood ripple effects
    applyNeighborhoodRipple_(ctx, name, 'positive', affectedNeighborhoods);

  } else if (result.outcome === 'FAILED' || result.outcome === 'DENIED') {
    // Negative outcome dampens sentiment
    dynamics.sentiment = (dynamics.sentiment || 0) - 0.05;

    // Track for narrative
    S.failedInitiatives = S.failedInitiatives || [];
    S.failedInitiatives.push(name);

    // v1.3: Apply negative neighborhood ripple
    applyNeighborhoodRipple_(ctx, name, 'negative', affectedNeighborhoods);
  }

  // Clamp sentiment
  if (dynamics.sentiment > 1) dynamics.sentiment = 1;
  if (dynamics.sentiment < -1) dynamics.sentiment = -1;

  S.cityDynamics = dynamics;
  ctx.summary = S;
}


/**
 * ============================================================================
 * NEIGHBORHOOD RIPPLE EFFECTS (v1.3 - Tier 4.4)
 * ============================================================================
 */

/**
 * v1.3: Apply ripple effects to affected neighborhoods based on initiative outcome
 *
 * Initiative types and their ripple effects:
 * - Health → sick_rate ↓, sentiment ↑
 * - Transit → retail ↑, traffic impact
 * - Economic/Business → unemployment ↓, retail ↑
 * - Housing → sentiment ↑, community stability
 * - Safety/Policing → sentiment varies
 * - Environment/Park → sentiment ↑, sick_rate ↓
 */
function applyNeighborhoodRipple_(ctx, initiativeName, direction, affectedNeighborhoods) {

  var S = ctx.summary;
  var nameLower = (initiativeName || '').toLowerCase();
  var isPositive = direction === 'positive';

  // Default duration in cycles
  var rippleDuration = 8;
  var rippleStrength = isPositive ? 1.0 : -0.6;

  // Determine ripple type based on initiative name keywords
  var rippleType = 'general';
  var effects = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIATIVE TYPE → RIPPLE EFFECTS MAPPING
  // ═══════════════════════════════════════════════════════════════════════════

  if (nameLower.indexOf('health') >= 0 || nameLower.indexOf('clinic') >= 0 ||
      nameLower.indexOf('hospital') >= 0 || nameLower.indexOf('medical') >= 0) {
    rippleType = 'health';
    rippleDuration = 12;
    effects = {
      sick_modifier: isPositive ? -0.02 : 0.01,
      sentiment_modifier: isPositive ? 0.08 : -0.05,
      community_modifier: isPositive ? 0.05 : -0.02
    };
  }

  else if (nameLower.indexOf('transit') >= 0 || nameLower.indexOf('bart') >= 0 ||
           nameLower.indexOf('bus') >= 0 || nameLower.indexOf('hub') >= 0) {
    rippleType = 'transit';
    rippleDuration = 10;
    effects = {
      retail_modifier: isPositive ? 0.08 : -0.04,
      traffic_modifier: isPositive ? 0.15 : -0.08,
      sentiment_modifier: isPositive ? 0.05 : -0.03
    };
  }

  else if (nameLower.indexOf('business') >= 0 || nameLower.indexOf('economic') >= 0 ||
           nameLower.indexOf('job') >= 0 || nameLower.indexOf('employment') >= 0) {
    rippleType = 'economic';
    rippleDuration = 15;
    effects = {
      unemployment_modifier: isPositive ? -0.03 : 0.02,
      retail_modifier: isPositive ? 0.10 : -0.06,
      sentiment_modifier: isPositive ? 0.06 : -0.04
    };
  }

  else if (nameLower.indexOf('housing') >= 0 || nameLower.indexOf('stabiliz') >= 0 ||
           nameLower.indexOf('afford') >= 0 || nameLower.indexOf('rent') >= 0) {
    rippleType = 'housing';
    rippleDuration = 20;
    effects = {
      sentiment_modifier: isPositive ? 0.10 : -0.08,
      community_modifier: isPositive ? 0.08 : -0.05,
      population_stability: isPositive ? 0.05 : -0.03
    };
  }

  else if (nameLower.indexOf('safety') >= 0 || nameLower.indexOf('police') >= 0 ||
           nameLower.indexOf('alternative') >= 0 || nameLower.indexOf('response') >= 0) {
    rippleType = 'safety';
    rippleDuration = 8;
    // Safety initiatives have mixed reception
    effects = {
      sentiment_modifier: isPositive ? 0.03 : -0.06,
      community_modifier: isPositive ? 0.05 : -0.04
    };
  }

  else if (nameLower.indexOf('park') >= 0 || nameLower.indexOf('green') >= 0 ||
           nameLower.indexOf('environment') >= 0 || nameLower.indexOf('earth') >= 0) {
    rippleType = 'environment';
    rippleDuration = 12;
    effects = {
      sentiment_modifier: isPositive ? 0.08 : -0.04,
      sick_modifier: isPositive ? -0.01 : 0.005,
      publicSpaces_modifier: isPositive ? 0.10 : -0.05
    };
  }

  else if (nameLower.indexOf('stadium') >= 0 || nameLower.indexOf('arena') >= 0 ||
           nameLower.indexOf('sports') >= 0) {
    rippleType = 'sports';
    rippleDuration = 20;
    effects = {
      retail_modifier: isPositive ? 0.12 : -0.06,
      traffic_modifier: isPositive ? 0.20 : -0.10,
      nightlife_modifier: isPositive ? 0.15 : -0.08,
      sentiment_modifier: isPositive ? 0.05 : -0.08 // Failed sports = big disappointment
    };
  }

  else if (nameLower.indexOf('school') >= 0 || nameLower.indexOf('education') >= 0 ||
           nameLower.indexOf('youth') >= 0) {
    rippleType = 'education';
    rippleDuration = 15;
    effects = {
      sentiment_modifier: isPositive ? 0.06 : -0.05,
      community_modifier: isPositive ? 0.08 : -0.04,
      student_attraction: isPositive ? 0.05 : -0.03
    };
  }

  else {
    // Generic initiative
    rippleType = 'general';
    rippleDuration = 6;
    effects = {
      sentiment_modifier: isPositive ? 0.04 : -0.03
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE RIPPLE RECORD
  // ═══════════════════════════════════════════════════════════════════════════

  var cycle = S.cycleId || S.absoluteCycle || 0;
  var ripple = {
    initiativeName: initiativeName,
    rippleType: rippleType,
    direction: direction,
    strength: rippleStrength,
    effects: effects,
    affectedNeighborhoods: affectedNeighborhoods || [],
    startCycle: cycle,
    duration: rippleDuration,
    endCycle: cycle + rippleDuration,
    status: 'active'
  };

  S.initiativeRipples.push(ripple);

  // ═══════════════════════════════════════════════════════════════════════════
  // IMMEDIATE EFFECTS (first cycle impact)
  // ═══════════════════════════════════════════════════════════════════════════

  // Apply immediate sentiment effect to city dynamics
  var dynamics = S.cityDynamics || {};
  if (effects.sentiment_modifier) {
    dynamics.sentiment = (dynamics.sentiment || 0) + (effects.sentiment_modifier * 0.5);
    if (dynamics.sentiment > 1) dynamics.sentiment = 1;
    if (dynamics.sentiment < -1) dynamics.sentiment = -1;
  }
  S.cityDynamics = dynamics;

  // Log ripple creation
  Logger.log('initiativeRipple: ' + initiativeName + ' → ' + rippleType + ' ripple (' +
             direction + ') affecting ' + (affectedNeighborhoods || []).length +
             ' neighborhoods for ' + rippleDuration + ' cycles');
}


/**
 * ============================================================================
 * RIPPLE CONSUMER (v1.5 - Tier 4.4)
 * ============================================================================
 *
 * Processes active initiative ripples each cycle, applying their effects with
 * decay over time. Call from Phase 02 or 06 to apply ongoing ripple effects.
 */

/**
 * v1.5: Apply active initiative ripple effects to city/neighborhood state
 *
 * @param {Object} ctx - Engine context
 */
function applyActiveInitiativeRipples_(ctx) {
  var S = ctx.summary || {};
  var ripples = S.initiativeRipples || [];
  var cycle = S.absoluteCycle || S.cycleId || 0;

  if (ripples.length === 0) return;

  var activeRipples = [];
  var expiredCount = 0;

  for (var i = 0; i < ripples.length; i++) {
    var ripple = ripples[i];

    // Skip already expired/completed ripples
    if (ripple.status === 'expired' || ripple.status === 'completed') {
      continue;
    }

    // Check if ripple has expired this cycle
    if (cycle >= ripple.endCycle) {
      ripple.status = 'expired';
      expiredCount++;
      Logger.log('initiativeRipple: "' + ripple.initiativeName + '" ripple expired after ' + ripple.duration + ' cycles');
      continue;
    }

    // Calculate decay factor (linear decay from 1.0 to 0.2 over duration)
    var cyclesActive = cycle - ripple.startCycle;
    var decayFactor = 1.0 - (cyclesActive / ripple.duration) * 0.8;
    if (decayFactor < 0.2) decayFactor = 0.2;

    // Apply effects to city dynamics
    var dynamics = S.cityDynamics || {};
    var effects = ripple.effects || {};

    // Sentiment effects (applied city-wide)
    if (effects.sentiment_modifier) {
      var sentimentDelta = effects.sentiment_modifier * decayFactor * 0.1; // Gradual application
      dynamics.sentiment = (dynamics.sentiment || 0) + sentimentDelta;
      if (dynamics.sentiment > 1) dynamics.sentiment = 1;
      if (dynamics.sentiment < -1) dynamics.sentiment = -1;
    }

    // Community effects
    if (effects.community_modifier) {
      dynamics.communityEngagement = (dynamics.communityEngagement || 1) +
        (effects.community_modifier * decayFactor * 0.1);
    }

    // Retail/economic effects
    if (effects.retail_modifier) {
      dynamics.retailActivity = (dynamics.retailActivity || 1) +
        (effects.retail_modifier * decayFactor * 0.1);
    }

    // Nightlife effects
    if (effects.nightlife_modifier) {
      dynamics.nightlife = (dynamics.nightlife || 1) +
        (effects.nightlife_modifier * decayFactor * 0.1);
    }

    S.cityDynamics = dynamics;

    // Track active ripples for neighborhood-specific effects
    activeRipples.push({
      name: ripple.initiativeName,
      type: ripple.rippleType,
      neighborhoods: ripple.affectedNeighborhoods || [],
      effects: effects,
      decayFactor: decayFactor,
      cyclesRemaining: ripple.endCycle - cycle
    });

    // Mark as still active
    ripple.status = 'active';
  }

  // Store active ripple summary for other engines
  S.activeRipples = activeRipples;
  S.activeRippleCount = activeRipples.length;

  // Update ripples array with status changes
  S.initiativeRipples = ripples.filter(function(r) {
    return r.status !== 'expired';
  });

  if (activeRipples.length > 0 || expiredCount > 0) {
    Logger.log('applyActiveInitiativeRipples_: ' + activeRipples.length + ' active, ' +
               expiredCount + ' expired this cycle');
  }
}


/**
 * v1.5: Get active ripple effects for a specific neighborhood
 * Helper function for other engines to query ripple state
 *
 * @param {Object} ctx - Engine context
 * @param {string} neighborhood - Neighborhood name
 * @return {Object} Combined effects for this neighborhood
 */
function getRippleEffectsForNeighborhood_(ctx, neighborhood) {
  var S = ctx.summary || {};
  var activeRipples = S.activeRipples || [];

  var combinedEffects = {
    sentiment: 0,
    sick: 0,
    unemployment: 0,
    retail: 0,
    traffic: 0,
    community: 0
  };

  for (var i = 0; i < activeRipples.length; i++) {
    var ripple = activeRipples[i];
    var affectsThisHood = ripple.neighborhoods.length === 0 || // City-wide
                          ripple.neighborhoods.indexOf(neighborhood) >= 0;

    if (!affectsThisHood) continue;

    var effects = ripple.effects || {};
    var decay = ripple.decayFactor || 1.0;

    if (effects.sentiment_modifier) combinedEffects.sentiment += effects.sentiment_modifier * decay;
    if (effects.sick_modifier) combinedEffects.sick += effects.sick_modifier * decay;
    if (effects.unemployment_modifier) combinedEffects.unemployment += effects.unemployment_modifier * decay;
    if (effects.retail_modifier) combinedEffects.retail += effects.retail_modifier * decay;
    if (effects.traffic_modifier) combinedEffects.traffic += effects.traffic_modifier * decay;
    if (effects.community_modifier) combinedEffects.community += effects.community_modifier * decay;
  }

  return combinedEffects;
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
  var swingVoterIdx0 = header.indexOf('SwingVoter');  // 0-based
  if (swingVoterIdx0 < 0) {
    Logger.log('SwingVoter column not found');
    return;
  }

  // v1.2: Fixed column insertion - convert to 1-based for insertColumnsAfter
  var swingVoterCol1 = swingVoterIdx0 + 1;  // 1-based column number
  sheet.insertColumnsAfter(swingVoterCol1, 2);

  // Set headers
  sheet.getRange(1, swingVoterCol1 + 1).setValue('SwingVoter2');
  sheet.getRange(1, swingVoterCol1 + 2).setValue('SwingVoter2Lean');

  // Set column widths
  sheet.setColumnWidth(swingVoterCol1 + 1, 120);
  sheet.setColumnWidth(swingVoterCol1 + 2, 100);
  
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


/**
 * ============================================================================
 * MANUAL VOTE EXECUTION
 * ============================================================================
 * Run this from the script editor to manually trigger a vote for a specific
 * initiative, bypassing the cycle check.
 *
 * Usage: manualRunVote('INIT-001')
 *
 * SAFETY:
 * - Will NOT process already-resolved initiatives (passed/failed/resolved)
 * - Logs results to console
 * - Updates the sheet like normal cycle processing would
 */
function manualRunVote(initiativeId) {
  if (!initiativeId) {
    Logger.log('manualRunVote: Please provide an initiative ID (e.g., "INIT-001")');
    return { error: 'No initiative ID provided' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Initiative_Tracker');

  if (!sheet) {
    Logger.log('manualRunVote: Initiative_Tracker sheet not found');
    return { error: 'Initiative_Tracker not found' };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('manualRunVote: No initiatives in tracker');
    return { error: 'No initiatives found' };
  }

  var header = data[0];
  var rows = data.slice(1);

  var idx = function(name) { return header.indexOf(name); };

  var iID = idx('InitiativeID');
  var iName = idx('Name');
  var iType = idx('Type');
  var iStatus = idx('Status');
  var iVoteCycle = idx('VoteCycle');
  var iProjection = idx('Projection');
  var iSwingVoter = idx('SwingVoter');
  var iSwingVoter2 = idx('SwingVoter2');
  var iSwingVoter2Lean = idx('SwingVoter2Lean');
  var iOutcome = idx('Outcome');
  var iConsequences = idx('Consequences');
  var iNotes = idx('Notes');
  var iLastUpdated = idx('LastUpdated');
  var iAffectedNeighborhoods = idx('AffectedNeighborhoods');

  // Find the initiative
  var targetRow = -1;
  for (var r = 0; r < rows.length; r++) {
    if (rows[r][iID] === initiativeId) {
      targetRow = r;
      break;
    }
  }

  if (targetRow < 0) {
    Logger.log('manualRunVote: Initiative "' + initiativeId + '" not found');
    return { error: 'Initiative not found: ' + initiativeId };
  }

  var row = rows[targetRow];
  var name = row[iName] || 'Unknown';
  var status = (row[iStatus] || '').toString().toLowerCase();
  var type = (row[iType] || 'vote').toString().toLowerCase();

  // Check if already resolved
  if (status === 'resolved' || status === 'passed' || status === 'failed' || status === 'inactive') {
    Logger.log('manualRunVote: Initiative "' + initiativeId + '" already resolved (status: ' + status + ')');
    return { error: 'Already resolved', status: status, outcome: row[iOutcome] };
  }

  // Build minimal context
  var now = new Date();
  var configSheet = ss.getSheetByName('Simulation_Config');
  var cycleCount = 0;
  if (configSheet) {
    var configData = configSheet.getDataRange().getValues();
    for (var c = 0; c < configData.length; c++) {
      if (configData[c][0] === 'cycleCount') {
        cycleCount = Number(configData[c][1]) || 0;
        break;
      }
    }
  }

  var ctx = {
    ss: ss,
    now: now,
    config: { cycleCount: cycleCount },
    summary: {
      cycleId: cycleCount,
      cityDynamics: { sentiment: 0 },
      initiativeEvents: [],
      votesThisCycle: [],
      grantsThisCycle: []
    }
  };

  // Try to get actual sentiment from City_Dynamics
  var dynamicsSheet = ss.getSheetByName('City_Dynamics');
  if (dynamicsSheet) {
    var dynData = dynamicsSheet.getDataRange().getValues();
    for (var d = 0; d < dynData.length; d++) {
      if (dynData[d][0] === 'Sentiment' || dynData[d][0] === 'sentiment') {
        ctx.summary.cityDynamics.sentiment = Number(dynData[d][1]) || 0;
        break;
      }
    }
  }

  // Get council state
  var councilState = getCouncilState_(ctx);
  var sentiment = ctx.summary.cityDynamics.sentiment;

  // Load neighborhood demographics
  var neighborhoodDemographics = {};
  if (typeof getNeighborhoodDemographics_ === 'function') {
    neighborhoodDemographics = getNeighborhoodDemographics_(ss);
  }

  // Prepare swing voter info
  var swingVoter = row[iSwingVoter] || '';
  var swingVoter2 = iSwingVoter2 >= 0 ? (row[iSwingVoter2] || '') : '';
  var swingVoter2Lean = iSwingVoter2Lean >= 0 ? (row[iSwingVoter2Lean] || '') : '';

  var swingInfo = {
    primary: swingVoter,
    secondary: swingVoter2,
    secondaryLean: swingVoter2Lean
  };

  // Prepare affected neighborhoods
  var affectedNeighborhoods = [];
  if (iAffectedNeighborhoods >= 0 && row[iAffectedNeighborhoods]) {
    affectedNeighborhoods = String(row[iAffectedNeighborhoods]).split(',').map(function(n) {
      return n.trim();
    }).filter(function(n) { return n !== ''; });
  }

  var demoContext = {
    demographics: neighborhoodDemographics,
    affectedNeighborhoods: affectedNeighborhoods,
    initiativeType: type,
    initiativeName: name
  };

  // v1.5: Use Math.random for manual votes (no ctx.rng available outside cycle)
  var rng = Math.random;

  // Resolve the vote based on type
  var result;
  if (type === 'vote' || type === 'council-vote') {
    result = resolveCouncilVote_(ctx, row, header, councilState, sentiment, swingInfo, demoContext, rng);
  } else if (type === 'grant' || type === 'federal-grant' || type === 'external') {
    result = resolveExternalDecision_(ctx, row, header, sentiment, rng);
  } else if (type === 'visioning' || type === 'input') {
    result = resolveVisioningPhase_(ctx, row, header);
  } else {
    result = resolveCouncilVote_(ctx, row, header, councilState, sentiment, swingInfo, demoContext, rng);
  }

  // Update the row
  if (result) {
    row[iStatus] = result.status;
    row[iOutcome] = result.outcome;
    row[iConsequences] = result.consequences;
    row[iLastUpdated] = now;

    if (iNotes >= 0 && result.notes) {
      var existingNotes = row[iNotes] || '';
      row[iNotes] = existingNotes + (existingNotes ? '\n' : '') +
                    'MANUAL Cycle ' + cycleCount + ': ' + result.notes;
    }

    // Write back to sheet (row index is 0-based in rows array, +2 for header and 1-based)
    sheet.getRange(targetRow + 2, 1, 1, row.length).setValues([row]);

    // Apply consequences
    applyInitiativeConsequences_(ctx, result, name, type);

    Logger.log('═══════════════════════════════════════════════════════════════');
    Logger.log('manualRunVote: ' + initiativeId + ' — ' + name);
    Logger.log('Type: ' + type);
    Logger.log('Outcome: ' + result.outcome + ' (' + (result.voteCount || 'N/A') + ')');
    Logger.log('Swing Voters: ' + JSON.stringify(result.swingVoters || []));
    Logger.log('Consequences: ' + result.consequences);
    Logger.log('Notes: ' + result.notes);
    Logger.log('═══════════════════════════════════════════════════════════════');

    return {
      success: true,
      initiativeId: initiativeId,
      name: name,
      type: type,
      outcome: result.outcome,
      voteCount: result.voteCount,
      swingVoters: result.swingVoters,
      notes: result.notes
    };
  }

  return { error: 'No result returned from vote resolution' };
}

/**
 * Wrapper to run manualRunVote from Apps Script editor.
 * Change the initiative ID below and run this function.
 */
function runVoteForInitiative() {
  var initiativeId = 'INIT-001';  // <-- Change this ID as needed
  var result = manualRunVote(initiativeId);
  Logger.log(JSON.stringify(result, null, 2));
  return result;
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
 * REFERENCE v1.5
 * ============================================================================
 *
 * MANUAL VOTE EXECUTION (v1.4):
 * - manualRunVote('INIT-001') — Force a vote on any initiative
 * - Bypasses cycle check but respects already-resolved guards
 * - Builds context automatically (council state, sentiment, demographics)
 * - Notes prefixed with "MANUAL Cycle X:" for audit trail
 * - Returns result object with outcome, voteCount, swingVoters
 * - Will NOT double-process passed/failed/resolved initiatives
 *
 * v1.3 DEMOGRAPHIC INTEGRATION:
 * - Reads Neighborhood_Demographics for affected areas
 * - Swing vote probability modified by demographic alignment:
 *   - Health initiatives: +8% if >25% seniors, +6% if >8% sick
 *   - Housing/stabilization: +10% if >12% unemployed, +5% if >20% seniors
 *   - Transit: +6% if >55% working adults, +5% if >20% students
 *   - Education/youth: +10% if >25% students
 *   - Jobs/economic: +8% if >10% unemployed
 *   - Senior-specific: +12% if >20% seniors
 *   - Alternative policing: +5% if young area, -3% if senior area
 * - Maximum demographic modifier: ±15%
 * - AffectedNeighborhoods column (comma-separated) specifies target areas
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
 * GOVERNANCE MODEL (v1.2):
 * - 9-seat council votes on initiatives
 * - Mayor has VETO POWER but does NOT vote on council matters
 * - This matches Oakland's real governance structure
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