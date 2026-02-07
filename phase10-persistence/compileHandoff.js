/**
 * ============================================================================
 * COMPILE HANDOFF v1.0 — Automated Media Room Handoff Compiler
 * ============================================================================
 *
 * Compiles cycle data from 10+ sheets into a structured ~30KB handoff document
 * for the Media Room (Claude agents that write The Cycle Pulse).
 *
 * Replaces the manual copy-paste workflow. Spec: docs/media/MEDIA_ROOM_HANDOFF.md
 *
 * ENTRY POINTS:
 *   compileHandoff(cycleNumber)   - Menu-callable, compiles handoff for given cycle
 *   compileHandoffFromMenu()      - Menu wrapper, auto-detects current cycle
 *
 * OUTPUT:
 *   1. Sheet: Handoff_Output (Timestamp, Cycle, HandoffText)
 *   2. Drive: HANDOFF_C{XX}.txt in GodWorld_Exports folder
 *
 * DEPENDENCIES:
 *   - utilities/sheetCache.js (createSheetCache_, createColIndex_, safeColRead_)
 *   - utilities/sheetNames.js (SHEET_NAMES)
 *   - utilities/utilityFunctions.js (openSimSpreadsheet_, ensureSheet_)
 *   - utilities/rosterLookup.js (getRoster_, getAllJournalistNames_)
 *   - phase10-persistence/cycleExportAutomation.js (getOrCreateExportFolder_,
 *     saveTextFile_, getCurrentCycle_, showAlert_)
 *
 * ============================================================================
 */


// ════════════════════════════════════════════════════════════════════════════
// ENTRY POINTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Menu wrapper — prompts user for cycle number and compiles handoff.
 */
function compileHandoffFromMenu() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Compile Handoff',
    'Enter cycle number:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) return;

  var cycle = Number(response.getResponseText());
  if (!cycle || cycle <= 0) {
    showAlert_('Handoff Error', 'Invalid cycle number: ' + response.getResponseText());
    return;
  }

  compileHandoff(cycle);
}


/**
 * Main entry point — compiles a structured handoff document for the given cycle.
 *
 * @param {number} cycleNumber - The cycle to compile
 */
function compileHandoff(cycleNumber) {
  var startTime = new Date();

  if (cycleNumber === undefined || cycleNumber === null || cycleNumber <= 0) {
    showAlert_('Handoff Error', 'No cycle number provided. Use the menu: Compile Handoff.');
    return;
  }

  Logger.log('compileHandoff v1.0: Starting for cycle ' + cycleNumber);
  var ss = openSimSpreadsheet_();

  try {
    var cache = createSheetCache_(ss);

    // Load all data
    var data = loadHandoffData_(cache, cycleNumber);

    // Build sections
    var sections = [];
    sections.push(buildHandoffHeader_(cycleNumber));
    sections.push(buildSectionWrapper_(1, 'EDITORIAL HEADER', buildSection01_EditorialHeader_, data, cycleNumber));
    sections.push(buildSectionWrapper_(2, 'FRONT PAGE RECOMMENDATION', buildSection02_FrontPage_, data));
    sections.push(buildSectionWrapper_(3, 'CIVIC STATUS', buildSection03_CivicStatus_, data));
    sections.push(buildSectionWrapper_(4, 'ACTIVE STORYLINES', buildSection04_Storylines_, data));
    sections.push(buildSectionWrapper_(5, 'STORY ASSIGNMENTS', buildSection05_Assignments_, data));
    sections.push(buildSectionWrapper_(6, 'WORLD EVENTS', buildSection06_WorldEvents_, data));
    sections.push(buildSectionWrapper_(7, 'STORY SEEDS', buildSection07_StorySeeds_, data));
    sections.push(buildSectionWrapper_(8, 'ARC STATUS', buildSection08_ArcStatus_, data));
    sections.push(buildSectionWrapper_(9, 'CALENDAR & TEXTURE', buildSection09_Calendar_, data));
    sections.push(buildSectionWrapper_(10, 'CULTURAL ENTITIES', buildSection10_Cultural_, data));
    sections.push(buildSectionWrapper_(11, 'CONTINUITY REFERENCE (DEDUPLICATED)', buildSection11_Continuity_, data));
    sections.push(buildSectionWrapper_(12, 'SECTION ASSIGNMENTS', buildSection12_SectionAssignments_, data));
    sections.push(buildSectionWrapper_(13, 'RETURNS EXPECTED', buildSection13_ReturnsExpected_));
    sections.push(buildSectionWrapper_(14, 'CANON REFERENCE', buildSection14_CanonReference_, data));
    sections.push('############################################################');
    sections.push('END HANDOFF');
    sections.push('############################################################');

    var handoffText = sections.join('\n');
    var sizeKB = Math.round(handoffText.length / 1024);

    // Write outputs
    writeHandoffSheet_(ss, cycleNumber, handoffText);
    exportHandoffToDrive_(cycleNumber, handoffText);

    var elapsed = ((new Date()).getTime() - startTime.getTime()) / 1000;
    var msg = 'Handoff compiled for Cycle ' + cycleNumber + '\n' +
      'Size: ' + sizeKB + 'KB | Time: ' + elapsed + 's\n' +
      'Written to: Handoff_Output sheet + HANDOFF_C' + cycleNumber + '.txt';
    Logger.log('compileHandoff v1.0: ' + msg);

    if (sizeKB > 50) {
      Logger.log('WARNING: Handoff exceeds 50KB target (' + sizeKB + 'KB). Check for dedup issues.');
    }

    showAlert_('Handoff Complete', msg);

  } catch (e) {
    Logger.log('compileHandoff ERROR: ' + e.message + '\n' + e.stack);
    showAlert_('Handoff Error', 'Failed to compile handoff:\n' + e.message);
  }
}


// ════════════════════════════════════════════════════════════════════════════
// DATA LOADING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Loads all data needed for the handoff from cached sheets.
 *
 * @param {Object} cache - SheetCache instance
 * @param {number} cycle - Target cycle number
 * @returns {Object} Data bag consumed by section builders
 */
function loadHandoffData_(cache, cycle) {
  var data = {
    cycle: cycle,
    briefingRow: null,
    briefingText: '',
    packetText: '',
    storylines: [],
    pressDrafts: [],
    worldEvents: [],
    storySeeds: [],
    civicOfficers: [],
    initiatives: [],
    playerRosters: { as: [], bulls: [] },
    continuityNotes: [],
    culturalEntities: [],
    councilMembers: [],
    roster: null
  };

  data.briefingRow = loadMediaBriefingRow_(cache, cycle);
  if (data.briefingRow) {
    data.briefingText = data.briefingRow.briefingText || '';
  }

  data.packetText = loadCyclePacketText_(cache, cycle);
  data.storylines = loadActiveStorylines_(cache, cycle);
  data.pressDrafts = loadPressDrafts_(cache, cycle);
  data.worldEvents = loadWorldEvents_(cache, cycle);
  data.storySeeds = loadStorySeeds_(cache, cycle);
  data.civicOfficers = loadCivicOfficers_(cache);
  data.councilMembers = extractCouncilMembers_(data.civicOfficers);
  data.initiatives = loadInitiatives_(cache);
  data.playerRosters = loadPlayerRosters_(cache);
  data.continuityNotes = loadContinuityNotes_(cache, cycle);
  data.culturalEntities = loadCulturalEntities_(cache);

  try {
    data.roster = getRoster_();
  } catch (e) {
    Logger.log('loadHandoffData_: Could not load roster: ' + e.message);
    data.roster = { journalists: {} };
  }

  return data;
}


/**
 * Loads Media_Briefing row for the target cycle.
 */
function loadMediaBriefingRow_(cache, cycle) {
  var values = cache.getValues(SHEET_NAMES.MEDIA_BRIEFING);
  if (values.length < 2) {
    Logger.log('loadMediaBriefingRow_: No data in Media_Briefing');
    return null;
  }

  var header = values[0];
  var idx = createColIndex_(header);
  var iCycle = idx('Cycle');
  var iBriefing = idx('Briefing');
  var iHoliday = idx('Holiday');
  var iHolidayPriority = idx('HolidayPriority');
  var iSportsSeason = idx('SportsSeason');
  var iElectionWindow = idx('ElectionWindow');

  // Search from bottom (most recent first)
  for (var r = values.length - 1; r >= 1; r--) {
    var row = values[r];
    if (Number(safeColRead_(row, iCycle, 0)) === cycle) {
      return {
        briefingText: String(safeColRead_(row, iBriefing, '')),
        holiday: String(safeColRead_(row, iHoliday, 'none')),
        holidayPriority: String(safeColRead_(row, iHolidayPriority, 'none')),
        sportsSeason: String(safeColRead_(row, iSportsSeason, '')),
        electionWindow: String(safeColRead_(row, iElectionWindow, ''))
      };
    }
  }

  Logger.log('loadMediaBriefingRow_: No row for cycle ' + cycle);
  return null;
}


/**
 * Loads Cycle_Packet text for the target cycle.
 */
function loadCyclePacketText_(cache, cycle) {
  var values = cache.getValues(SHEET_NAMES.CYCLE_PACKET);
  if (values.length < 2) return '';

  var header = values[0];
  var idx = createColIndex_(header);
  var iCycle = idx('Cycle');
  var iPacket = idx('PacketText');

  for (var r = values.length - 1; r >= 1; r--) {
    if (Number(safeColRead_(values[r], iCycle, 0)) === cycle) {
      return String(safeColRead_(values[r], iPacket, ''));
    }
  }
  return '';
}


/**
 * Loads active/recent storylines from Storyline_Tracker.
 */
function loadActiveStorylines_(cache, cycle) {
  var values = cache.getValues(SHEET_NAMES.STORYLINE_TRACKER);
  if (values.length < 2) return [];

  var header = values[0];
  var idx = createColIndex_(header);
  var iCycleAdded = idx('CycleAdded');
  var iType = idx('StorylineType');
  var iDesc = idx('Description');
  var iNeighborhood = idx('Neighborhood');
  var iCitizens = idx('RelatedCitizens');
  var iPriority = idx('Priority');
  var iStatus = idx('Status');

  var results = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var cycleAdded = Number(safeColRead_(row, iCycleAdded, 0));
    var status = String(safeColRead_(row, iStatus, '')).toLowerCase();

    // Include: active, new this cycle, recently resolved (last 2 cycles), recent dormant
    var include = false;
    if (status === 'active') include = true;
    if (status === 'new' && cycleAdded === cycle) include = true;
    if (status === 'resolved' && cycleAdded >= cycle - 2) include = true;
    if (status === 'dormant' && cycleAdded >= cycle - 5) include = true;

    if (include) {
      results.push({
        cycleAdded: cycleAdded,
        type: String(safeColRead_(row, iType, '')),
        description: String(safeColRead_(row, iDesc, '')),
        neighborhood: String(safeColRead_(row, iNeighborhood, '')),
        citizens: String(safeColRead_(row, iCitizens, '')),
        priority: String(safeColRead_(row, iPriority, '')),
        status: status
      });
    }
  }
  return results;
}


/**
 * Loads Press_Drafts for the target cycle.
 */
function loadPressDrafts_(cache, cycle) {
  var values = cache.getValues(SHEET_NAMES.PRESS_DRAFTS);
  if (values.length < 2) return [];

  var header = values[0];
  var idx = createColIndex_(header);
  var iCycle = idx('Cycle');
  var iReporter = idx('Reporter');
  var iType = idx('StoryType');
  var iSignal = idx('SignalSource');
  var iPrompt = idx('SummaryPrompt');
  var iDraft = idx('DraftText');

  var results = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (Number(safeColRead_(row, iCycle, 0)) === cycle) {
      results.push({
        reporter: String(safeColRead_(row, iReporter, '')),
        storyType: String(safeColRead_(row, iType, '')),
        signalSource: String(safeColRead_(row, iSignal, '')),
        summaryPrompt: String(safeColRead_(row, iPrompt, '')),
        draftText: String(safeColRead_(row, iDraft, '')).substring(0, 200)
      });
    }
  }
  return results;
}


/**
 * Loads WorldEvents_V3_Ledger for the target cycle, skipping generics.
 */
function loadWorldEvents_(cache, cycle) {
  var values = cache.getValues(SHEET_NAMES.WORLD_EVENTS_V3_LEDGER);
  if (values.length < 2) return [];

  var header = values[0];
  var idx = createColIndex_(header);
  var iCycle = idx('Cycle');
  var iDesc = idx('Description');
  var iSeverity = idx('Severity');
  var iDomain = idx('Domain');
  var iNeighborhood = idx('Neighborhood');

  // Fallback column names
  if (iDesc < 0) iDesc = idx('EventDescription');
  if (iDomain < 0) iDomain = idx('EventType');
  if (iNeighborhood < 0) iNeighborhood = idx('Location');

  var results = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (Number(safeColRead_(row, iCycle, 0)) !== cycle) continue;

    var desc = String(safeColRead_(row, iDesc, ''));
    var severity = String(safeColRead_(row, iSeverity, ''));

    // Skip generic/empty entries
    if (!desc || desc === '' || desc === 'undefined') continue;
    if (desc.toLowerCase().indexOf('no significant') >= 0) continue;
    if (desc.toLowerCase().indexOf('routine activity') >= 0) continue;
    if (!severity || severity === 'none' || severity === '') continue;

    results.push({
      description: desc,
      severity: severity,
      domain: String(safeColRead_(row, iDomain, '')),
      neighborhood: String(safeColRead_(row, iNeighborhood, ''))
    });
  }
  return results;
}


/**
 * Loads Story_Seed_Deck for the target cycle, Priority >= 2.
 */
function loadStorySeeds_(cache, cycle) {
  var values = cache.getValues(SHEET_NAMES.STORY_SEED_DECK);
  if (values.length < 2) return [];

  var header = values[0];
  var idx = createColIndex_(header);
  var iCycle = idx('Cycle');
  var iType = idx('SeedType');
  var iDomain = idx('Domain');
  var iNeighborhood = idx('Neighborhood');
  var iPriority = idx('Priority');
  var iText = idx('SeedText');

  var results = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (Number(safeColRead_(row, iCycle, 0)) !== cycle) continue;

    var priority = Number(safeColRead_(row, iPriority, 0));
    if (priority < 2) continue;

    results.push({
      seedType: String(safeColRead_(row, iType, '')),
      domain: String(safeColRead_(row, iDomain, '')),
      neighborhood: String(safeColRead_(row, iNeighborhood, '')),
      priority: priority,
      seedText: String(safeColRead_(row, iText, ''))
    });
  }
  return results;
}


/**
 * Loads all Civic_Office_Ledger rows.
 */
function loadCivicOfficers_(cache) {
  var values = cache.getValues(SHEET_NAMES.CIVIC_OFFICE_LEDGER);
  if (values.length < 2) return [];

  var header = values[0];
  var idx = createColIndex_(header);
  var iOfficeId = idx('OfficeId');
  var iTitle = idx('Title');
  var iType = idx('Type');
  var iDistrict = idx('District');
  var iHolder = idx('Holder');
  var iPopId = idx('PopId');
  var iStatus = idx('Status');
  var iFaction = idx('Faction');
  var iVotingPower = idx('VotingPower');

  var results = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var holder = String(safeColRead_(row, iHolder, ''));
    if (!holder) continue;

    results.push({
      officeId: String(safeColRead_(row, iOfficeId, '')),
      title: String(safeColRead_(row, iTitle, '')),
      type: String(safeColRead_(row, iType, '')).toLowerCase(),
      district: String(safeColRead_(row, iDistrict, '')),
      holder: holder,
      popId: String(safeColRead_(row, iPopId, '')),
      status: String(safeColRead_(row, iStatus, 'active')).toLowerCase(),
      faction: String(safeColRead_(row, iFaction, '')).trim().toUpperCase(),
      votingPower: String(safeColRead_(row, iVotingPower, 'no')).toLowerCase()
    });
  }
  return results;
}


/**
 * Extracts council members (voting seats) from civic officers.
 */
function extractCouncilMembers_(officers) {
  var council = [];
  for (var i = 0; i < officers.length; i++) {
    var o = officers[i];
    if (o.votingPower === 'yes' || o.type === 'elected') {
      // Include council seats and mayor
      council.push(o);
    }
  }
  return council;
}


/**
 * Loads Initiative_Tracker rows (active/pending-vote/passed/failed).
 * "Proposed" initiatives are excluded — they stay hidden until Mara releases them.
 */
function loadInitiatives_(cache) {
  var sheetName = 'Initiative_Tracker';
  var values = cache.getValues(sheetName);
  if (values.length < 2) return [];

  var header = values[0];
  var idx = createColIndex_(header);
  var iId = idx('InitiativeID');
  var iName = idx('Name');
  var iType = idx('Type');
  var iStatus = idx('Status');
  var iBudget = idx('Budget');
  var iVoteReq = idx('VoteRequirement');
  var iVoteCycle = idx('VoteCycle');
  var iProjection = idx('Projection');
  var iLeadFaction = idx('LeadFaction');
  var iOppFaction = idx('OppositionFaction');
  var iSwing1 = idx('SwingVoter');
  var iSwing2 = idx('SwingVoter2');
  var iSwing2Lean = idx('SwingVoter2Lean');
  var iOutcome = idx('Outcome');
  var iConsequences = idx('Consequences');
  var iPolicyDomain = idx('PolicyDomain');

  var results = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var status = String(safeColRead_(row, iStatus, '')).toLowerCase();

    // Include active, pending-vote, and recently passed/failed
    // "proposed" status is excluded — Mara phases these into the media room when ready
    if (status === 'active' || status === 'pending-vote' ||
        status === 'passed' || status === 'failed') {
      results.push({
        id: String(safeColRead_(row, iId, '')),
        name: String(safeColRead_(row, iName, '')),
        type: String(safeColRead_(row, iType, '')),
        status: status,
        budget: String(safeColRead_(row, iBudget, '')),
        voteRequirement: String(safeColRead_(row, iVoteReq, '')),
        voteCycle: Number(safeColRead_(row, iVoteCycle, 0)),
        projection: String(safeColRead_(row, iProjection, '')),
        leadFaction: String(safeColRead_(row, iLeadFaction, '')).trim().toUpperCase(),
        oppositionFaction: String(safeColRead_(row, iOppFaction, '')).trim().toUpperCase(),
        swingVoter: String(safeColRead_(row, iSwing1, '')),
        swingVoter2: String(safeColRead_(row, iSwing2, '')),
        swingVoter2Lean: String(safeColRead_(row, iSwing2Lean, '')),
        outcome: String(safeColRead_(row, iOutcome, '')),
        consequences: String(safeColRead_(row, iConsequences, '')),
        policyDomain: String(safeColRead_(row, iPolicyDomain, ''))
      });
    }
  }
  return results;
}


/**
 * Loads A's and Bulls rosters from Simulation_Ledger + Chicago_Citizens.
 * Caps to Tier 1-2 for A's (key named players only) and deduplicates.
 */
function loadPlayerRosters_(cache) {
  var asRoster = [];
  var bullsRoster = [];
  var seenAs = {};
  var seenBulls = {};

  // Scan Simulation_Ledger for A's and Bulls players
  var values = cache.getValues(SHEET_NAMES.SIMULATION_LEDGER);
  if (values.length >= 2) {
    var header = values[0];
    var idx = createColIndex_(header);
    var iFirst = idx('First');
    var iLast = idx('Last');
    var iOriginGame = idx('OriginGame');
    var iTier = idx('Tier');
    var iRoleType = idx('RoleType');
    var iStatus = idx('Status');
    var iPopId = idx('POPID');

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var origin = String(safeColRead_(row, iOriginGame, '')).toLowerCase();
      var roleType = String(safeColRead_(row, iRoleType, '')).toLowerCase();
      var status = String(safeColRead_(row, iStatus, '')).toLowerCase();
      var first = String(safeColRead_(row, iFirst, ''));
      var last = String(safeColRead_(row, iLast, ''));
      var tier = Number(safeColRead_(row, iTier, 9));
      var popId = String(safeColRead_(row, iPopId, ''));

      if (!first && !last) continue;
      if (status === 'inactive' || status === 'removed') continue;

      var name = first;
      if (last) name = first + ' ' + last;

      // A's / MLB players — Tier 1-2 only for canon reference
      if (origin.indexOf('mlb') >= 0 || origin.indexOf("a's") >= 0 ||
          origin.indexOf('oakland') >= 0 || roleType.indexOf('mlb') >= 0 ||
          roleType.indexOf('baseball') >= 0) {
        if (tier <= 1 && !seenAs[name]) {
          seenAs[name] = true;
          asRoster.push({ name: name, tier: String(tier), popId: popId });
        }
      }

      // Bulls / NBA players from Simulation_Ledger
      if (origin.indexOf('nba') >= 0 || origin.indexOf('bulls') >= 0 ||
          roleType.indexOf('nba') >= 0 || roleType.indexOf('basketball') >= 0) {
        if (!seenBulls[name]) {
          seenBulls[name] = true;
          bullsRoster.push({ name: name, tier: String(tier), popId: popId });
        }
      }
    }
  }

  // Also scan Chicago_Citizens for Bulls players
  var chiValues = cache.getValues(SHEET_NAMES.CHICAGO_CITIZENS);
  if (chiValues.length >= 2) {
    var chiHeader = chiValues[0];
    var chiIdx = createColIndex_(chiHeader);
    var ciFirst = chiIdx('First');
    var ciLast = chiIdx('Last');
    var ciTier = chiIdx('Tier');
    var ciRoleType = chiIdx('RoleType');
    var ciStatus = chiIdx('Status');
    var ciPopId = chiIdx('POPID');
    var ciOrigin = chiIdx('OriginGame');

    for (var cr = 1; cr < chiValues.length; cr++) {
      var crow = chiValues[cr];
      var cStatus = String(safeColRead_(crow, ciStatus, '')).toLowerCase();
      var cFirst = String(safeColRead_(crow, ciFirst, ''));
      var cLast = String(safeColRead_(crow, ciLast, ''));
      var cOrigin = String(safeColRead_(crow, ciOrigin, '')).toLowerCase();
      var cRole = String(safeColRead_(crow, ciRoleType, '')).toLowerCase();

      if (!cFirst && !cLast) continue;
      if (cStatus === 'inactive' || cStatus === 'removed') continue;

      var cName = cFirst;
      if (cLast) cName = cFirst + ' ' + cLast;

      // Include NBA/basketball/Bulls players
      if (cOrigin.indexOf('nba') >= 0 || cOrigin.indexOf('bulls') >= 0 ||
          cRole.indexOf('nba') >= 0 || cRole.indexOf('basketball') >= 0) {
        if (!seenBulls[cName]) {
          seenBulls[cName] = true;
          var cTier = String(safeColRead_(crow, ciTier, ''));
          var cPopId = String(safeColRead_(crow, ciPopId, ''));
          bullsRoster.push({ name: cName, tier: cTier, popId: cPopId });
        }
      }
    }
  }

  return { as: asRoster, bulls: bullsRoster };
}


/**
 * Loads Continuity_Loop notes (recent cycles).
 */
function loadContinuityNotes_(cache, cycle) {
  var values = cache.getValues(SHEET_NAMES.CONTINUITY_LOOP);
  if (values.length < 2) return [];

  var header = values[0];
  var idx = createColIndex_(header);
  var iCycle = idx('Cycle');
  var iNoteType = idx('NoteType');
  var iDesc = idx('Description');
  var iRelatedArc = idx('RelatedArc');
  var iCitizens = idx('AffectedCitizens');
  var iStatus = idx('Status');

  var results = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var noteCycle = Number(safeColRead_(row, iCycle, 0));

    // Include notes from recent cycles (last 10)
    if (noteCycle >= cycle - 10) {
      results.push({
        cycle: noteCycle,
        noteType: String(safeColRead_(row, iNoteType, '')).toLowerCase(),
        description: String(safeColRead_(row, iDesc, '')),
        relatedArc: String(safeColRead_(row, iRelatedArc, '')),
        citizens: String(safeColRead_(row, iCitizens, '')),
        status: String(safeColRead_(row, iStatus, ''))
      });
    }
  }
  return results;
}


/**
 * Loads Cultural_Ledger for active entities.
 */
function loadCulturalEntities_(cache) {
  var values = cache.getValues(SHEET_NAMES.CULTURAL_LEDGER);
  if (values.length < 2) return [];

  var header = values[0];
  var idx = createColIndex_(header);
  var iName = idx('Name');
  var iRoleType = idx('RoleType');
  var iFameCategory = idx('FameCategory');
  var iDomain = idx('CulturalDomain');
  var iFameScore = idx('FameScore');
  var iStatus = idx('Status');
  var iNeighborhood = idx('Neighborhood');

  // Fallback column names
  if (iName < 0) iName = idx('EntityName');
  if (iDomain < 0) iDomain = idx('Domain');

  var results = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var name = String(safeColRead_(row, iName, ''));
    var status = String(safeColRead_(row, iStatus, 'active')).toLowerCase();

    if (!name || status === 'inactive' || status === 'archived') continue;

    results.push({
      name: name,
      roleType: String(safeColRead_(row, iRoleType, '')),
      fameCategory: String(safeColRead_(row, iFameCategory, '')),
      domain: String(safeColRead_(row, iDomain, '')),
      fameScore: String(safeColRead_(row, iFameScore, '')),
      neighborhood: String(safeColRead_(row, iNeighborhood, ''))
    });
  }
  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// SECTION BUILDERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Builds handoff document header.
 */
function buildHandoffHeader_(cycle) {
  var lines = [];
  lines.push('CYCLE HANDOFF — CYCLE ' + cycle);
  lines.push('Compiled: ' + new Date().toISOString());
  lines.push('Generator: compileHandoff v1.0');
  lines.push('');
  return lines.join('\n');
}


/**
 * Wraps a section builder with header/footer and error handling.
 */
function buildSectionWrapper_(num, title, builderFn, data, extra) {
  var lines = [];
  lines.push('');
  lines.push('############################################################');
  lines.push(num + '. ' + title);
  lines.push('############################################################');

  try {
    var content;
    if (extra !== undefined) {
      content = builderFn(data, extra);
    } else {
      content = builderFn(data);
    }
    if (content && content.length > 0) {
      lines.push(content.join('\n'));
    } else {
      lines.push('(No data available)');
    }
  } catch (e) {
    lines.push('[SECTION ' + num + ' UNAVAILABLE: ' + e.message + ']');
    Logger.log('Section ' + num + ' error: ' + e.message);
  }

  return lines.join('\n');
}


/**
 * Section 1: EDITORIAL HEADER
 * Sources: Cycle_Packet text, Media_Briefing row
 */
function buildSection01_EditorialHeader_(data, cycle) {
  var lines = [];

  lines.push('Cycle: ' + cycle);

  // Parse from packet text
  var packet = data.packetText;
  lines.push('Season: ' + parsePacketField_(packet, 'Season'));
  lines.push('Month: ' + parsePacketField_(packet, 'Month'));

  // Holiday from briefing row
  if (data.briefingRow) {
    var holiday = data.briefingRow.holiday || 'none';
    if (holiday !== 'none') {
      lines.push('Holiday: ' + holiday + ' [' + (data.briefingRow.holidayPriority || '') + ']');
    } else {
      lines.push('Holiday: none');
    }
    if (data.briefingRow.sportsSeason) {
      lines.push('SportsSeason: ' + data.briefingRow.sportsSeason);
    }
  }

  // Weather from packet
  lines.push('Weather: ' + parsePacketField_(packet, 'Type') + ' / ' +
    parsePacketField_(packet, 'Temp'));
  lines.push('Sentiment: ' + parsePacketField_(packet, 'Sentiment'));
  lines.push('MigrationDrift: ' + parsePacketField_(packet, 'MigrationDrift'));
  lines.push('PatternFlag: ' + parsePacketField_(packet, 'PatternFlag'));
  lines.push('CycleWeight: ' + parsePacketField_(packet, 'CycleWeight'));

  // Editorial direction from briefing section 2
  var frontPageSection = extractBriefingSection_(data.briefingText, 2);
  if (frontPageSection) {
    var firstLine = frontPageSection.split('\n')[0];
    if (firstLine) {
      lines.push('');
      lines.push('Editorial Direction: ' + firstLine.replace(/^[-*#\s]+/, ''));
    }
  }

  return lines;
}


/**
 * Section 2: FRONT PAGE RECOMMENDATION
 * Source: Media_Briefing briefing blob Section 2
 */
function buildSection02_FrontPage_(data) {
  var section = extractBriefingSection_(data.briefingText, 2);
  if (!section) return ['(No front page recommendation in briefing)'];

  // Clean up and return (the briefing already has this formatted)
  var lines = section.split('\n');
  var cleaned = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line) cleaned.push(line);
  }
  return cleaned.length > 0 ? cleaned : ['(No front page recommendation in briefing)'];
}


/**
 * Section 3: CIVIC STATUS
 * Sources: Civic_Office_Ledger, Initiative_Tracker
 */
function buildSection03_CivicStatus_(data) {
  var lines = [];
  var officers = data.civicOfficers;
  var council = data.councilMembers;

  // Counts
  var totalOfficials = officers.length;
  var vacancies = 0;
  var healthAlerts = [];
  for (var i = 0; i < officers.length; i++) {
    if (officers[i].status === 'vacant' || officers[i].holder === 'TBD' || officers[i].holder === '') {
      vacancies++;
    }
    if (officers[i].status !== 'active' && officers[i].status !== 'vacant') {
      healthAlerts.push(officers[i].holder + ' (' + officers[i].title + '): ' + officers[i].status);
    }
  }

  lines.push('Officials: ' + totalOfficials + ' | Vacancies: ' + vacancies);
  if (healthAlerts.length > 0) {
    lines.push('Status Alerts:');
    for (var h = 0; h < healthAlerts.length; h++) {
      lines.push('  - ' + healthAlerts[h]);
    }
  }

  // Council composition (ONE copy)
  lines.push('');
  lines.push('COUNCIL COMPOSITION:');
  lines.push('District | Member | Faction | Status');
  lines.push('---------|--------|---------|-------');

  // Sort council by district for consistent output
  var sortedCouncil = council.slice().sort(function(a, b) {
    return a.district.localeCompare(b.district);
  });

  for (var c = 0; c < sortedCouncil.length; c++) {
    var m = sortedCouncil[c];
    lines.push(m.district + ' | ' + m.holder + ' | ' + m.faction + ' | ' + m.status);
  }

  // Vote math for active initiatives (ONE copy)
  var activeInitiatives = [];
  for (var j = 0; j < data.initiatives.length; j++) {
    var init = data.initiatives[j];
    if (init.status === 'active' || init.status === 'pending-vote' || init.status === 'proposed') {
      activeInitiatives.push(init);
    }
  }

  if (activeInitiatives.length > 0) {
    lines.push('');
    lines.push('PENDING VOTES:');
    for (var v = 0; v < activeInitiatives.length; v++) {
      var initiative = activeInitiatives[v];
      lines.push('');
      lines.push(initiative.name + ' (' + initiative.type + ')');
      lines.push('  Status: ' + initiative.status + ' | Requirement: ' + initiative.voteRequirement);
      lines.push('  Projection: ' + initiative.projection);
      lines.push('  Lead: ' + initiative.leadFaction + ' | Opposition: ' + initiative.oppositionFaction);
      if (initiative.swingVoter) {
        lines.push('  Swing: ' + initiative.swingVoter);
      }
      if (initiative.swingVoter2) {
        lines.push('  Swing 2: ' + initiative.swingVoter2 + ' (lean: ' + initiative.swingVoter2Lean + ')');
      }
      if (initiative.voteCycle > 0) {
        lines.push('  Vote Cycle: ' + initiative.voteCycle);
      }

      // Map faction members to YES/NO
      var yesVotes = [];
      var noVotes = [];
      var swingVotes = [];
      for (var cm = 0; cm < sortedCouncil.length; cm++) {
        var member = sortedCouncil[cm];
        if (member.votingPower !== 'yes' && member.type !== 'elected') continue;
        if (member.status !== 'active') continue;

        if (member.faction === initiative.leadFaction) {
          yesVotes.push(member.holder + ' (' + member.district + ')');
        } else if (member.faction === initiative.oppositionFaction) {
          noVotes.push(member.holder + ' (' + member.district + ')');
        } else {
          swingVotes.push(member.holder + ' (' + member.district + ', ' + member.faction + ')');
        }
      }
      if (yesVotes.length > 0) {
        lines.push('  Expected YES (' + yesVotes.length + '): ' + yesVotes.join(', '));
      }
      if (noVotes.length > 0) {
        lines.push('  Expected NO (' + noVotes.length + '): ' + noVotes.join(', '));
      }
      if (swingVotes.length > 0) {
        lines.push('  SWING (' + swingVotes.length + '): ' + swingVotes.join(', '));
      }
    }
  }

  // Recently passed/failed
  var recentOutcomes = [];
  for (var k = 0; k < data.initiatives.length; k++) {
    var ri = data.initiatives[k];
    if (ri.status === 'passed' || ri.status === 'failed') {
      recentOutcomes.push(ri);
    }
  }
  if (recentOutcomes.length > 0) {
    lines.push('');
    lines.push('RECENT OUTCOMES:');
    for (var o = 0; o < recentOutcomes.length; o++) {
      var outcome = recentOutcomes[o];
      lines.push('- ' + outcome.name + ': ' + outcome.outcome +
        (outcome.consequences ? ' — ' + outcome.consequences : ''));
    }
  }

  return lines;
}


/**
 * Section 4: ACTIVE STORYLINES
 * Source: Storyline_Tracker
 */
function buildSection04_Storylines_(data) {
  var lines = [];
  var storylines = data.storylines;

  if (storylines.length === 0) {
    return ['(No active storylines)'];
  }

  // Group by status
  var groups = { active: [], 'new': [], resolved: [], dormant: [] };
  for (var i = 0; i < storylines.length; i++) {
    var s = storylines[i];
    var key = s.status === 'new' ? 'new' : s.status;
    if (groups[key]) {
      groups[key].push(s);
    } else {
      groups.active.push(s);
    }
  }

  if (groups['new'].length > 0) {
    lines.push('NEW THIS CYCLE:');
    for (var n = 0; n < groups['new'].length; n++) {
      var ns = groups['new'][n];
      lines.push('- [' + ns.type + '] ' + ns.description +
        (ns.neighborhood ? ' @ ' + ns.neighborhood : '') +
        (ns.citizens ? ' | Citizens: ' + ns.citizens : ''));
    }
    lines.push('');
  }

  if (groups.active.length > 0) {
    lines.push('ACTIVE:');
    for (var a = 0; a < groups.active.length; a++) {
      var as = groups.active[a];
      lines.push('- [' + as.type + '] ' + as.description +
        (as.neighborhood ? ' @ ' + as.neighborhood : '') +
        ' (since C' + as.cycleAdded + ')' +
        (as.citizens ? ' | Citizens: ' + as.citizens : ''));
    }
    lines.push('');
  }

  if (groups.resolved.length > 0) {
    lines.push('RESOLVED:');
    for (var rv = 0; rv < groups.resolved.length; rv++) {
      var rs = groups.resolved[rv];
      lines.push('- [' + rs.type + '] ' + rs.description +
        (rs.neighborhood ? ' @ ' + rs.neighborhood : ''));
    }
    lines.push('');
  }

  if (groups.dormant.length > 0) {
    lines.push('DORMANT (may reactivate):');
    for (var d = 0; d < groups.dormant.length; d++) {
      var ds = groups.dormant[d];
      lines.push('- [' + ds.type + '] ' + ds.description +
        ' (since C' + ds.cycleAdded + ')');
    }
  }

  return lines;
}


/**
 * Section 5: STORY ASSIGNMENTS
 * Source: Press_Drafts
 */
function buildSection05_Assignments_(data) {
  var lines = [];
  var drafts = data.pressDrafts;

  if (drafts.length === 0) {
    return ['(No press drafts for this cycle)'];
  }

  for (var i = 0; i < drafts.length; i++) {
    var d = drafts[i];
    lines.push('- ' + d.reporter + ' | ' + d.storyType +
      (d.signalSource ? ' | Signal: ' + d.signalSource : ''));
    if (d.summaryPrompt) {
      lines.push('  Prompt: ' + d.summaryPrompt);
    }
    if (d.draftText) {
      lines.push('  Draft: ' + d.draftText + (d.draftText.length >= 200 ? '...' : ''));
    }
  }

  return lines;
}


/**
 * Section 6: WORLD EVENTS
 * Source: WorldEvents_V3_Ledger
 */
function buildSection06_WorldEvents_(data) {
  var lines = [];
  var events = data.worldEvents;

  if (events.length === 0) {
    return ['(No significant world events this cycle)'];
  }

  lines.push('Events: ' + events.length);
  lines.push('');

  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var loc = e.neighborhood ? ' @ ' + e.neighborhood : '';
    lines.push('- [' + e.severity + '] ' + e.domain + loc + ': ' + e.description);
  }

  return lines;
}


/**
 * Section 7: STORY SEEDS (Priority 2-3 only)
 * Source: Story_Seed_Deck
 */
function buildSection07_StorySeeds_(data) {
  var lines = [];
  var seeds = data.storySeeds;

  if (seeds.length === 0) {
    return ['(No actionable story seeds this cycle)'];
  }

  lines.push('Seeds: ' + seeds.length + ' (Priority 2+ only, filler dropped)');
  lines.push('');

  for (var i = 0; i < seeds.length; i++) {
    var s = seeds[i];
    var loc = s.neighborhood ? ' / ' + s.neighborhood : '';
    lines.push('- [P' + s.priority + '] ' + s.domain + loc + ': "' + s.seedText + '"');
  }

  return lines;
}


/**
 * Section 8: ARC STATUS
 * Source: Media_Briefing briefing blob Section 6
 */
function buildSection08_ArcStatus_(data) {
  var section = extractBriefingSection_(data.briefingText, 6);
  if (!section) return ['(No arc status in briefing)'];

  var lines = section.split('\n');
  var cleaned = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line) cleaned.push(line);
  }
  return cleaned.length > 0 ? cleaned : ['(No arc status in briefing)'];
}


/**
 * Section 9: CALENDAR & TEXTURE
 * Sources: Cycle_Packet text, Media_Briefing row
 */
function buildSection09_Calendar_(data) {
  var lines = [];
  var packet = data.packetText;

  // Calendar from packet
  var calSection = extractPacketSection_(packet, 'CALENDAR');
  if (calSection) {
    lines.push('CALENDAR:');
    var calLines = calSection.split('\n');
    for (var c = 0; c < calLines.length; c++) {
      if (calLines[c].trim()) lines.push(calLines[c]);
    }
    lines.push('');
  }

  // Holiday from briefing
  if (data.briefingRow && data.briefingRow.holiday !== 'none') {
    // Pull holiday story ideas from briefing Section 4
    var holidaySection = extractBriefingSection_(data.briefingText, 4);
    if (holidaySection) {
      lines.push('HOLIDAY GUIDANCE:');
      var hLines = holidaySection.split('\n');
      for (var h = 0; h < hLines.length; h++) {
        if (hLines[h].trim()) lines.push(hLines[h].trim());
      }
      lines.push('');
    }
  }

  // Texture triggers from packet
  var textureSection = extractPacketSection_(packet, 'TEXTURE TRIGGERS');
  if (textureSection) {
    lines.push('TEXTURE TRIGGERS:');
    var tLines = textureSection.split('\n');
    for (var t = 0; t < tLines.length; t++) {
      if (tLines[t].trim()) lines.push(tLines[t]);
    }
    lines.push('');
  }

  // Weather mood from packet
  var weatherSection = extractPacketSection_(packet, 'WEATHER MOOD');
  if (weatherSection) {
    lines.push('WEATHER:');
    var wLines = weatherSection.split('\n');
    for (var w = 0; w < wLines.length; w++) {
      if (wLines[w].trim()) lines.push(wLines[w]);
    }
  }

  if (lines.length === 0) {
    return ['(No calendar/texture data available)'];
  }

  return lines;
}


/**
 * Section 10: CULTURAL ENTITIES
 * Source: Cultural_Ledger
 */
function buildSection10_Cultural_(data) {
  var lines = [];
  var entities = data.culturalEntities;

  if (entities.length === 0) {
    return ['(No active cultural entities)'];
  }

  lines.push('Active Figures: ' + entities.length);
  lines.push('');

  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    var detail = e.domain || '';
    if (e.fameCategory) detail += (detail ? ', ' : '') + e.fameCategory;
    if (e.fameScore) detail += ' (fame: ' + e.fameScore + ')';
    if (e.neighborhood) detail += ' @ ' + e.neighborhood;

    lines.push('- ' + e.name + (e.roleType ? ' [' + e.roleType + ']' : '') +
      (detail ? ' — ' + detail : ''));
  }

  return lines;
}


/**
 * Section 11: CONTINUITY REFERENCE (DEDUPLICATED)
 * Sources: Continuity_Loop (deduped), Civic_Office_Ledger, Initiative_Tracker
 */
function buildSection11_Continuity_(data) {
  var lines = [];

  // Council and vote data come from LIVE sheets (Section 3 already has them)
  // Here we include a compact reference plus deduped continuity notes

  lines.push('NOTE: Council composition and vote math are in Section 3 (live data).');
  lines.push('Below: deduped continuity notes from recent cycles.');
  lines.push('');

  // Deduplicate continuity notes
  var notes = data.continuityNotes;
  var deduped = deduplicateContinuity_(notes);

  if (deduped.length === 0) {
    lines.push('(No continuity notes in recent cycles)');
    return lines;
  }

  // Group by noteType
  var groups = {};
  for (var i = 0; i < deduped.length; i++) {
    var note = deduped[i];
    var key = note.noteType || 'general';
    if (!groups[key]) groups[key] = [];
    groups[key].push(note);
  }

  var typeOrder = ['introduced', 'callback', 'builton', 'seasonal', 'question', 'resolved', 'general'];
  for (var t = 0; t < typeOrder.length; t++) {
    var type = typeOrder[t];
    if (!groups[type] || groups[type].length === 0) continue;

    lines.push(type.toUpperCase() + ':');
    for (var n = 0; n < groups[type].length; n++) {
      var entry = groups[type][n];
      var suffix = entry.citizens ? ' [Citizens: ' + entry.citizens + ']' : '';
      lines.push('- (C' + entry.cycle + ') ' + entry.description + suffix);
    }
    lines.push('');
  }

  return lines;
}


/**
 * Section 12: SECTION ASSIGNMENTS
 * Source: Media_Briefing briefing blob Section 13
 */
function buildSection12_SectionAssignments_(data) {
  var section = extractBriefingSection_(data.briefingText, 13);
  if (!section) return ['(No section assignments in briefing)'];

  var lines = section.split('\n');
  var cleaned = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line) cleaned.push(line);
  }
  return cleaned.length > 0 ? cleaned : ['(No section assignments in briefing)'];
}


/**
 * Section 13: RETURNS EXPECTED
 * Static template — no data extraction needed.
 */
function buildSection13_ReturnsExpected_() {
  var lines = [];

  lines.push('After writing the edition, return these structured sections:');
  lines.push('');
  lines.push('ARTICLE TABLE:');
  lines.push('|Reporter|StoryType|SignalSource|Headline|ArticleText|CulturalMentions|');
  lines.push('(One row per article)');
  lines.push('');
  lines.push('STORYLINES UPDATED:');
  lines.push('NEW THIS CYCLE: (bullet list of new storylines introduced)');
  lines.push('PHASE CHANGES: (bullet list of status changes)');
  lines.push('STILL ACTIVE: (bullet list of ongoing storylines)');
  lines.push('RESOLVED: (bullet list of concluded storylines)');
  lines.push('');
  lines.push('CITIZEN USAGE LOG:');
  lines.push('CIVIC OFFICIALS: (name, title — for each official mentioned)');
  lines.push('SPORTS — A\'S: (name, position — for each player mentioned)');
  lines.push('SPORTS — BULLS: (name, position — for each player mentioned)');
  lines.push('JOURNALISTS: (name, article count)');
  lines.push('CITIZENS QUOTED: (name, age, neighborhood, occupation, context)');
  lines.push('CITIZENS IN LETTERS: (name, age, neighborhood, occupation)');
  lines.push('');
  lines.push('CONTINUITY NOTES — CYCLE ' + 'N:');
  lines.push('Council composition (current state)');
  lines.push('Vote counts for pending initiatives');
  lines.push('Civic staff status changes');
  lines.push('Sports records and key facts');
  lines.push('New canon figures introduced');
  lines.push('Cultural notes');

  return lines;
}


/**
 * Section 14: CANON REFERENCE
 * Sources: Simulation_Ledger, Civic_Office_Ledger, Initiative_Tracker, Roster
 */
function buildSection14_CanonReference_(data) {
  var lines = [];

  lines.push('RULE: Every name in the edition must match this reference or the');
  lines.push('citizen ledgers. Do not invent names, backstories, or vote positions.');
  lines.push('No engine metrics in article text (tension scores, severity levels,');
  lines.push('event counts, sentiment values).');
  lines.push('');

  // A's Roster
  lines.push('A\'S ROSTER:');
  if (data.playerRosters.as.length > 0) {
    for (var a = 0; a < data.playerRosters.as.length; a++) {
      var ap = data.playerRosters.as[a];
      lines.push('- ' + ap.name + (ap.tier ? ' (Tier ' + ap.tier + ')' : ''));
    }
  } else {
    lines.push('(No A\'s players found in Simulation_Ledger)');
  }
  lines.push('');

  // Bulls Roster
  lines.push('BULLS ROSTER:');
  if (data.playerRosters.bulls.length > 0) {
    for (var b = 0; b < data.playerRosters.bulls.length; b++) {
      var bp = data.playerRosters.bulls[b];
      lines.push('- ' + bp.name + (bp.tier ? ' (Tier ' + bp.tier + ')' : ''));
    }
  } else {
    lines.push('(No Bulls players found in Simulation_Ledger)');
  }
  lines.push('');

  // Council Composition
  lines.push('COUNCIL:');
  var council = data.councilMembers;
  var sortedCouncil = council.slice().sort(function(a, b) {
    return a.district.localeCompare(b.district);
  });
  for (var c = 0; c < sortedCouncil.length; c++) {
    var cm = sortedCouncil[c];
    lines.push('- ' + cm.district + ': ' + cm.holder + ' (' + cm.faction + ') — ' + cm.status);
  }
  lines.push('');

  // Vote Positions for active initiatives
  var activeInits = [];
  for (var iv = 0; iv < data.initiatives.length; iv++) {
    var init = data.initiatives[iv];
    if (init.status === 'active' || init.status === 'pending-vote' || init.status === 'proposed') {
      activeInits.push(init);
    }
  }

  if (activeInits.length > 0) {
    lines.push('VOTE POSITIONS:');
    for (var vi = 0; vi < activeInits.length; vi++) {
      var vote = activeInits[vi];
      lines.push(vote.name + ':');
      lines.push('  Requirement: ' + vote.voteRequirement + ' | Projection: ' + vote.projection);

      // Map faction to YES/NO
      var yes = [];
      var no = [];
      var swing = [];
      for (var fc = 0; fc < sortedCouncil.length; fc++) {
        var member = sortedCouncil[fc];
        if (member.status !== 'active') continue;

        if (member.faction === vote.leadFaction) {
          yes.push(member.holder + ' (' + member.district + ')');
        } else if (member.faction === vote.oppositionFaction) {
          no.push(member.holder + ' (' + member.district + ')');
        } else {
          swing.push(member.holder + ' (' + member.district + ')');
        }
      }
      if (yes.length > 0) lines.push('  YES (' + yes.length + '): ' + yes.join(', '));
      if (no.length > 0) lines.push('  NO (' + no.length + '): ' + no.join(', '));
      if (swing.length > 0) lines.push('  SWING (' + swing.length + '): ' + swing.join(', '));
      if (vote.swingVoter) lines.push('  Named Swing: ' + vote.swingVoter);
      if (vote.swingVoter2) lines.push('  Named Swing 2: ' + vote.swingVoter2 + ' (lean: ' + vote.swingVoter2Lean + ')');
    }
    lines.push('');
  }

  // Reporter Names
  lines.push('REPORTERS:');
  var roster = data.roster;
  if (roster && roster.journalists) {
    var names = Object.keys(roster.journalists);
    for (var rn = 0; rn < names.length; rn++) {
      var journo = roster.journalists[names[rn]];
      lines.push('- ' + names[rn] + ' (' + (journo.desk || '') + ', ' + (journo.role || '') + ')');
    }
  } else {
    lines.push('(Roster unavailable)');
  }
  lines.push('');

  // Recurring citizens from continuity notes
  var citizenNames = extractHandoffCitizenNames_(data);
  if (citizenNames.length > 0) {
    lines.push('RECURRING CITIZENS THIS CYCLE:');
    for (var cn = 0; cn < citizenNames.length; cn++) {
      lines.push('- ' + citizenNames[cn]);
    }
  }

  return lines;
}


// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Extracts a named section from the Media_Briefing briefing text blob.
 * Briefing sections use the format: ## N. SECTION_NAME
 *
 * @param {string} text - Full briefing text
 * @param {number} sectionNum - Section number to extract
 * @returns {string|null} Section content or null
 */
function extractBriefingSection_(text, sectionNum) {
  if (!text) return null;

  // Remove leading apostrophe (Sheets protection character)
  if (text.charAt(0) === "'") {
    text = text.substring(1);
  }

  var lines = text.split('\n');
  var capturing = false;
  var result = [];
  var headerPattern = new RegExp('^## ' + sectionNum + '\\. ');
  var nextSectionPattern = /^## \d+\. /;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    if (!capturing) {
      if (headerPattern.test(line)) {
        capturing = true;
        // Don't include the header itself
      }
    } else {
      // Stop at the next section header
      if (nextSectionPattern.test(line)) {
        break;
      }
      result.push(line);
    }
  }

  if (result.length === 0) return null;

  // Trim leading/trailing empty lines
  while (result.length > 0 && result[0].trim() === '') result.shift();
  while (result.length > 0 && result[result.length - 1].trim() === '') result.pop();

  return result.join('\n');
}


/**
 * Extracts a named section from Cycle_Packet text.
 * Packet sections use the format: --- SECTION_NAME ---
 *
 * @param {string} text - Full packet text
 * @param {string} sectionName - Section name to extract
 * @returns {string|null} Section content or null
 */
function extractPacketSection_(text, sectionName) {
  if (!text) return null;

  // Remove leading apostrophe
  if (text.charAt(0) === "'") {
    text = text.substring(1);
  }

  var lines = text.split('\n');
  var capturing = false;
  var result = [];
  var headerStr = '--- ' + sectionName;
  var nextSectionPattern = /^--- [A-Z]/;
  var endPattern = /^=== END/;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    if (!capturing) {
      if (line.indexOf(headerStr) === 0) {
        capturing = true;
      }
    } else {
      if (nextSectionPattern.test(line) || endPattern.test(line)) {
        break;
      }
      result.push(line);
    }
  }

  if (result.length === 0) return null;

  while (result.length > 0 && result[0].trim() === '') result.shift();
  while (result.length > 0 && result[result.length - 1].trim() === '') result.pop();

  return result.join('\n');
}


/**
 * Parses a single key: value field from Cycle_Packet text.
 *
 * @param {string} text - Full packet text
 * @param {string} fieldName - Field name to extract
 * @returns {string} Field value or 'n/a'
 */
function parsePacketField_(text, fieldName) {
  if (!text) return 'n/a';

  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf(fieldName + ':') === 0 || line.indexOf(fieldName + ': ') === 0) {
      return line.substring(fieldName.length + 1).trim();
    }
  }
  return 'n/a';
}


/**
 * Deduplicates continuity notes.
 * Strategy: category-keyed latest-wins. Group by noteType + truncated description.
 * Discard council/vote note types (replaced by live sheet data).
 *
 * @param {Array} notes - Raw continuity note objects
 * @returns {Array} Deduplicated notes
 */
function deduplicateContinuity_(notes) {
  if (!notes || notes.length === 0) return [];

  // Skip note types that are replaced by live data
  var skipTypes = ['council', 'vote', 'composition', 'vote-math'];

  var seen = {};
  var results = [];

  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    var type = note.noteType || 'general';

    // Skip types replaced by live sheet data
    var skip = false;
    for (var s = 0; s < skipTypes.length; s++) {
      if (type.indexOf(skipTypes[s]) >= 0) {
        skip = true;
        break;
      }
    }
    if (skip) continue;

    // Build dedup key: noteType + first 50 chars of description
    var descKey = (note.description || '').substring(0, 50).toLowerCase().replace(/\s+/g, ' ');
    var key = type + '|' + descKey;

    if (!seen[key] || seen[key].cycle < note.cycle) {
      seen[key] = note;
    }
  }

  var keys = Object.keys(seen);
  for (var k = 0; k < keys.length; k++) {
    results.push(seen[keys[k]]);
  }

  // Sort by cycle descending
  results.sort(function(a, b) { return b.cycle - a.cycle; });

  return results;
}


/**
 * Extracts citizen names mentioned in continuity notes and press drafts.
 *
 * @param {Object} data - Full data bag
 * @returns {Array} List of citizen name strings
 */
function extractHandoffCitizenNames_(data) {
  var names = {};

  // From continuity notes
  for (var i = 0; i < data.continuityNotes.length; i++) {
    var citizens = data.continuityNotes[i].citizens;
    if (citizens) {
      var parts = citizens.split(',');
      for (var p = 0; p < parts.length; p++) {
        var name = parts[p].trim();
        if (name && name.length > 2) {
          names[name] = true;
        }
      }
    }
  }

  // From storyline related citizens
  for (var j = 0; j < data.storylines.length; j++) {
    var sCitizens = data.storylines[j].citizens;
    if (sCitizens) {
      var sParts = sCitizens.split(',');
      for (var sp = 0; sp < sParts.length; sp++) {
        var sName = sParts[sp].trim();
        if (sName && sName.length > 2) {
          names[sName] = true;
        }
      }
    }
  }

  return Object.keys(names).sort();
}


// ════════════════════════════════════════════════════════════════════════════
// OUTPUT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Writes compiled handoff to Handoff_Output sheet.
 */
function writeHandoffSheet_(ss, cycle, handoffText) {
  var HEADERS = ['Timestamp', 'Cycle', 'HandoffText'];
  var sheet = ensureSheet_(ss, 'Handoff_Output', HEADERS);

  var startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, 1, 3).setValues([
    [new Date(), cycle, "'" + handoffText]
  ]);

  Logger.log('writeHandoffSheet_: Written to row ' + startRow);
}


/**
 * Exports compiled handoff to Google Drive as text file.
 */
function exportHandoffToDrive_(cycle, handoffText) {
  try {
    var folder = getOrCreateExportFolder_();
    var fileName = 'HANDOFF_C' + cycle + '.txt';
    saveTextFile_(folder, fileName, handoffText);
    Logger.log('exportHandoffToDrive_: Saved ' + fileName);
  } catch (e) {
    Logger.log('exportHandoffToDrive_ ERROR: ' + e.message);
  }
}
