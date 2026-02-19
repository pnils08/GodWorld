/**
 * ============================================================================
 * runCivicElections_ v1.1
 * ============================================================================
 * 
 * Lightweight election engine for GodWorld civic positions.
 * Runs during November election window (Cycles 45-48 of even years).
 * 
 * DESIGN PHILOSOPHY:
 * - Elections are "dramatic promotions" — simple mechanics, rich storytelling
 * - Generate story seeds for Media Room rather than detailed vote simulation
 * - Margin determines narrative flavor (landslide vs nail-biter)
 * 
 * FEATURES:
 * - Detects election window from cycle/year
 * - Identifies seats up for election by group (A/B stagger)
 * - Generates challengers from Tier 2-3 civic-adjacent citizens
 * - Rolls weighted outcomes based on factors
 * - Updates Civic_Office_Ledger with winners
 * - Creates Election_Log entries for Media Room
 * - Handles incumbent advantage, economic mood, neighborhood sentiment
 * 
 * INTEGRATION:
 * - Call in Phase 5 (after citizens, before analysis)
 * - Reads: Civic_Office_Ledger, Simulation_Ledger
 * - Writes: Civic_Office_Ledger (winner), Election_Log
 * - Outputs: ctx.summary.electionResults for Media_Briefing
 * 
 * ============================================================================
 */

function runCivicElections_(ctx) {

  var ss = ctx.ss;
  var S = ctx.summary;
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK ELECTION WINDOW
  // ═══════════════════════════════════════════════════════════════════════════
  
  var cycleOfYear = S.cycleOfYear || ((S.absoluteCycle - 1) % 52) + 1;
  var godWorldYear = S.godWorldYear || Math.ceil(S.absoluteCycle / 52);
  var cycle = S.absoluteCycle || ctx.config.cycleCount || 0;
  
  // Election window: Cycles 45-48 (November)
  var inElectionWindow = (cycleOfYear >= 45 && cycleOfYear <= 48);
  
  // Only even years have elections
  var isElectionYear = (godWorldYear % 2 === 0);
  
  // Only run on first cycle of window (45) to prevent duplicate elections
  var isElectionTriggerCycle = (cycleOfYear === 45);
  
  if (!inElectionWindow || !isElectionYear || !isElectionTriggerCycle) {
    S.electionResults = null;
    ctx.summary = S;
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD CIVIC OFFICE LEDGER
  // ═══════════════════════════════════════════════════════════════════════════
  
  var officeLedger = ss.getSheetByName('Civic_Office_Ledger');
  if (!officeLedger) {
    S.electionResults = { error: 'Civic_Office_Ledger not found' };
    ctx.summary = S;
    return;
  }
  
  var officeData = officeLedger.getDataRange().getValues();
  var officeHeader = officeData[0];
  
  var oCol = function(h) { return officeHeader.indexOf(h); };
  
  var iOfficeId = oCol('OfficeId');
  var iTitle = oCol('Title');
  var iType = oCol('Type');
  var iDistrict = oCol('District');
  var iHolder = oCol('Holder');
  var iPopId = oCol('PopId');
  var iTermStart = oCol('TermStart');
  var iTermEnd = oCol('TermEnd');
  var iElectionGroup = oCol('ElectionGroup');
  var iStatus = oCol('Status');
  var iLastElection = oCol('LastElection');
  var iNextElection = oCol('NextElection');
  
  // Determine which group is up
  // Year 2, 6, 10... = Group A
  // Year 4, 8, 12... = Group B
  var isGroupAYear = (godWorldYear % 4 === 2);
  var isGroupBYear = (godWorldYear % 4 === 0);
  var activeGroup = isGroupAYear ? 'A' : 'B';
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FIND SEATS UP FOR ELECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  var seatsUp = [];
  
  for (var o = 1; o < officeData.length; o++) {
    var row = officeData[o];
    var officeType = (row[iType] || '').toString().toLowerCase();
    var electionGroup = (row[iElectionGroup] || '').toString().toUpperCase();
    var status = (row[iStatus] || '').toString().toLowerCase();
    
    // Only elected positions
    if (officeType !== 'elected') continue;
    
    // Check if this group is up
    if (electionGroup === activeGroup) {
      seatsUp.push({
        rowIndex: o,
        officeId: row[iOfficeId],
        title: row[iTitle],
        district: row[iDistrict],
        currentHolder: row[iHolder],
        currentPopId: row[iPopId],
        status: status,
        isVacant: status === 'vacant' || !row[iHolder] || row[iHolder] === 'TBD'
      });
    }
  }
  
  if (seatsUp.length === 0) {
    S.electionResults = { message: 'No seats up for election this cycle' };
    ctx.summary = S;
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD POTENTIAL CHALLENGERS FROM SIMULATION LEDGER
  // ═══════════════════════════════════════════════════════════════════════════
  
  var simLedger = ss.getSheetByName('Simulation_Ledger');
  var simData = simLedger.getDataRange().getValues();
  var simHeader = simData[0];
  
  var sCol = function(h) { return simHeader.indexOf(h); };
  
  var iSPopId = sCol('POPID');
  var iSFirst = sCol('First');
  var iSLast = sCol('Last');
  var iSFullName = sCol('FullName');
  var iSTier = sCol('Tier');
  var iSNeighborhood = sCol('Neighborhood');
  var iSCIV = sCol('CIV (y/n)');
  var iSStatus = sCol('Status');
  var iSTierRole = sCol('TierRole');
  
  // Build candidate pool: Tier 2-3 citizens, preferably with civic-adjacent roles
  var candidatePool = [];
  
  for (var s = 1; s < simData.length; s++) {
    var srow = simData[s];
    var tier = Number(srow[iSTier]) || 5;
    var civFlag = (srow[iSCIV] || '').toString().toLowerCase();
    var sStatus = (srow[iSStatus] || '').toString().toLowerCase();
    var tierRole = (srow[iSTierRole] || '').toString().toLowerCase();
    
    // Skip if already CIV (they're in office or media)
    // Unless they're a journalist who might run
    var isJournalist = tierRole.indexOf('journalist') >= 0 || 
                       tierRole.indexOf('reporter') >= 0 ||
                       tierRole.indexOf('writer') >= 0;
    
    if (civFlag === 'y' && !isJournalist) continue;
    
    // Skip if not active
    if (sStatus !== 'active') continue;
    
    // Tier 2-3 preferred, Tier 4 possible
    if (tier < 2 || tier > 4) continue;
    
    var fullName = srow[iSFullName] || (srow[iSFirst] + ' ' + srow[iSLast]);
    
    candidatePool.push({
      rowIndex: s,
      popId: srow[iSPopId],
      name: fullName.trim(),
      tier: tier,
      neighborhood: srow[iSNeighborhood] || 'Unknown',
      tierRole: tierRole,
      // Civic-adjacent bonus
      civicAdjacent: tierRole.indexOf('community') >= 0 ||
                     tierRole.indexOf('advocate') >= 0 ||
                     tierRole.indexOf('organizer') >= 0 ||
                     tierRole.indexOf('business') >= 0 ||
                     tierRole.indexOf('attorney') >= 0 ||
                     tierRole.indexOf('educator') >= 0
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RUN ELECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  var econMood = S.economicMood || 50;
  var sentiment = (S.cityDynamics && S.cityDynamics.sentiment) || 0;
  
  var results = [];
  var electionLog = ss.getSheetByName('Election_Log');
  
  // Create Election_Log if missing
  if (!electionLog) {
    electionLog = ss.insertSheet('Election_Log');
    electionLog.appendRow([
      'Timestamp', 'Cycle', 'GodWorldYear', 'OfficeId', 'Title', 'District',
      'Incumbent', 'Challenger', 'Winner', 'Margin', 'MarginType',
      'IncumbentAdvantage', 'EconFactor', 'Narrative'
    ]);
    electionLog.setFrozenRows(1);
  }
  
  for (var e = 0; e < seatsUp.length; e++) {
    var seat = seatsUp[e];
    
    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE CHALLENGER
    // ─────────────────────────────────────────────────────────────────────────
    
    var challenger = null;
    
    // Prefer candidates from same district/neighborhood
    var districtCandidates = [];
    var otherCandidates = [];
    
    for (var c = 0; c < candidatePool.length; c++) {
      var cand = candidatePool[c];
      // Simple district matching by neighborhood
      if (seat.district !== 'citywide') {
        // District seats prefer local candidates
        if (cand.neighborhood && seat.title.indexOf(cand.neighborhood) >= 0) {
          districtCandidates.push(cand);
        } else {
          otherCandidates.push(cand);
        }
      } else {
        // Citywide races draw from anywhere
        otherCandidates.push(cand);
      }
    }
    
    // Pick challenger
    var challengerSource = districtCandidates.length > 0 ? districtCandidates : otherCandidates;
    
    if (challengerSource.length > 0) {
      // Weight by tier and civic-adjacent status
      var weighted = [];
      for (var w = 0; w < challengerSource.length; w++) {
        var weight = 1;
        if (challengerSource[w].tier === 2) weight = 3;
        if (challengerSource[w].tier === 3) weight = 2;
        if (challengerSource[w].civicAdjacent) weight += 2;
        for (var ww = 0; ww < weight; ww++) {
          weighted.push(challengerSource[w]);
        }
      }
      challenger = weighted[Math.floor(rng() * weighted.length)];
      
      // Remove from pool so they don't run for multiple seats
      var poolIdx = candidatePool.indexOf(challenger);
      if (poolIdx >= 0) {
        candidatePool.splice(poolIdx, 1);
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // CALCULATE OUTCOME
    // ─────────────────────────────────────────────────────────────────────────
    
    var incumbentName = seat.currentHolder || 'Vacant';
    var challengerName = challenger ? challenger.name : 'Unopposed';
    var winner = null;
    var margin = 0;
    var marginType = '';
    var narrative = '';
    
    if (seat.isVacant) {
      // Open seat: challenger wins by default
      winner = challenger ? challenger.name : 'TBD';
      margin = 55 + Math.floor(rng() * 20); // 55-75%
      marginType = 'comfortable';
      narrative = 'Open seat won without incumbent opposition.';
      
    } else if (!challenger) {
      // No challenger: incumbent wins unopposed
      winner = incumbentName;
      margin = 100;
      marginType = 'unopposed';
      narrative = 'Incumbent ran unopposed.';
      
    } else {
      // Contested race: calculate odds
      var incumbentScore = 50; // Base 50%
      
      // Incumbent advantage (+15% base)
      incumbentScore += 15;
      
      // Economic mood affects incumbent
      // Bad economy (< 40) hurts incumbent
      // Good economy (> 60) helps incumbent
      var econEffect = (econMood - 50) * 0.3; // -15 to +15
      incumbentScore += econEffect;
      
      // Public sentiment affects incumbent
      // Negative sentiment hurts incumbent
      var sentimentEffect = sentiment * 10; // -10 to +10
      incumbentScore += sentimentEffect;
      
      // Scandal/injury hurts incumbent significantly
      if (seat.status === 'scandal') {
        incumbentScore -= 25;
      } else if (seat.status === 'injured' || seat.status === 'serious-condition') {
        incumbentScore -= 10;
      }
      
      // Challenger quality (tier + civic-adjacent)
      if (challenger.tier === 2) incumbentScore -= 5;
      if (challenger.civicAdjacent) incumbentScore -= 5;
      
      // Random variance (-10 to +10)
      var variance = (rng() * 20) - 10;
      incumbentScore += variance;
      
      // Clamp to realistic range
      incumbentScore = Math.max(25, Math.min(75, incumbentScore));
      
      // Roll the dice
      var roll = rng() * 100;
      
      if (roll < incumbentScore) {
        winner = incumbentName;
        margin = Math.round(incumbentScore);
      } else {
        winner = challengerName;
        margin = Math.round(100 - incumbentScore);
      }
      
      // Determine margin type for narrative
      var winMargin = Math.abs(margin - 50);
      if (winMargin < 3) {
        marginType = 'razor-thin';
        narrative = 'Decided by fewer than 3 points in a nail-biter finish.';
      } else if (winMargin < 8) {
        marginType = 'tight';
        narrative = 'A competitive race that remained close throughout.';
      } else if (winMargin < 15) {
        marginType = 'comfortable';
        narrative = 'A clear victory with solid margin.';
      } else {
        marginType = 'landslide';
        narrative = 'A decisive mandate from voters.';
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE CIVIC OFFICE LEDGER
    // ─────────────────────────────────────────────────────────────────────────
    
    var newTermStart = cycle;
    var newTermEnd = cycle + 208; // 4-year term
    var newPopId = '';
    
    if (winner === challengerName && challenger) {
      newPopId = challenger.popId;
    } else if (winner === incumbentName) {
      newPopId = seat.currentPopId;
    }
    
    // Update the row
    var officeRow = officeData[seat.rowIndex];
    officeRow[iHolder] = winner;
    officeRow[iPopId] = newPopId;
    officeRow[iTermStart] = newTermStart;
    officeRow[iTermEnd] = newTermEnd;
    officeRow[iStatus] = 'active';
    officeRow[iLastElection] = cycle;
    officeRow[iNextElection] = 'Cycles ' + (newTermEnd - 3) + '-' + newTermEnd;
    
    officeData[seat.rowIndex] = officeRow;
    
    // ─────────────────────────────────────────────────────────────────────────
    // LOG ELECTION RESULT
    // ─────────────────────────────────────────────────────────────────────────
    
    electionLog.appendRow([
      new Date(),
      cycle,
      godWorldYear,
      seat.officeId,
      seat.title,
      seat.district,
      incumbentName,
      challengerName,
      winner,
      margin + '%',
      marginType,
      seat.isVacant ? 'N/A' : 'Yes',
      econMood,
      narrative
    ]);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STORE RESULT FOR MEDIA BRIEFING
    // ─────────────────────────────────────────────────────────────────────────
    
    results.push({
      office: seat.title,
      district: seat.district,
      incumbent: incumbentName,
      challenger: challengerName,
      winner: winner,
      margin: margin,
      marginType: marginType,
      narrative: narrative,
      upset: winner === challengerName && !seat.isVacant
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE BACK CIVIC OFFICE LEDGER
  // ═══════════════════════════════════════════════════════════════════════════
  
  officeLedger.getRange(1, 1, officeData.length, officeData[0].length).setValues(officeData);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE SIMULATION LEDGER FOR NEW OFFICEHOLDERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Mark new officeholders as CIV
  for (var r = 0; r < results.length; r++) {
    var res = results[r];
    if (res.upset && res.challenger !== 'Unopposed') {
      // Find challenger in sim ledger and mark CIV
      for (var sl = 1; sl < simData.length; sl++) {
        var simRow = simData[sl];
        var simName = simRow[iSFullName] || (simRow[iSFirst] + ' ' + simRow[iSLast]);
        if (simName.trim() === res.challenger) {
          simRow[iSCIV] = 'y';
          simRow[iSTierRole] = res.office;
          simData[sl] = simRow;
          break;
        }
      }
    }
  }
  
  simLedger.getRange(1, 1, simData.length, simData[0].length).setValues(simData);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT TO CTX
  // ═══════════════════════════════════════════════════════════════════════════
  
  S.electionResults = {
    cycle: cycle,
    year: godWorldYear,
    group: activeGroup,
    seatsContested: seatsUp.length,
    results: results,
    upsets: results.filter(function(r) { return r.upset; }).length
  };
  
  ctx.summary = S;
}


/**
 * ============================================================================
 * ELECTION LOG SCHEMA
 * ============================================================================
 * 
 * Column | Name              | Description
 * ─────────────────────────────────────────────────────────────────────────
 * A      | Timestamp         | When election was processed
 * B      | Cycle             | Absolute cycle number
 * C      | GodWorldYear      | Election year
 * D      | OfficeId          | Office identifier
 * E      | Title             | Office title
 * F      | District          | District or citywide
 * G      | Incumbent         | Previous holder
 * H      | Challenger        | Challenger name
 * I      | Winner            | Election winner
 * J      | Margin            | Win percentage
 * K      | MarginType        | razor-thin/tight/comfortable/landslide/unopposed
 * L      | IncumbentAdvantage| Whether incumbent ran
 * M      | EconFactor        | Economic mood at time
 * N      | Narrative         | Story seed for Media Room
 * 
 * ============================================================================
 * MARGIN TYPES
 * ============================================================================
 * 
 * razor-thin:  < 3 points (50-53%)  — "nail-biter"
 * tight:       3-7 points (53-57%)  — "competitive"
 * comfortable: 8-14 points (58-64%) — "clear win"
 * landslide:   15+ points (65%+)    — "mandate"
 * unopposed:   No challenger
 * 
 * ============================================================================
 * ELECTION SCHEDULE
 * ============================================================================
 * 
 * GROUP A (Year 2, 6, 10...):
 * - Council Districts 1, 3, 5, 7, 9
 * 
 * GROUP B (Year 4, 8, 12...):
 * - Mayor
 * - District Attorney
 * - Public Defender
 * - Council Districts 2, 4, 6, 8
 * 
 * ============================================================================
 * FACTORS AFFECTING OUTCOME
 * ============================================================================
 * 
 * Incumbent Advantages:
 * - Base +15%
 * - Good economy (>60 mood): up to +15%
 * - Positive sentiment: up to +10%
 * 
 * Incumbent Disadvantages:
 * - Bad economy (<40 mood): up to -15%
 * - Negative sentiment: up to -10%
 * - Scandal status: -25%
 * - Injury/illness: -10%
 * 
 * Challenger Bonuses:
 * - Tier 2 citizen: -5% incumbent
 * - Civic-adjacent role: -5% incumbent
 * 
 * Random Variance: ±10%
 * 
 * ============================================================================
 */