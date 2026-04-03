/**
 * ============================================================================
 * CITIZEN FAME TRACKER v1.0 (Week 1: Media Exposure)
 * ============================================================================
 *
 * Tracks citizen fame based on media mentions from Citizen_Media_Usage.
 * Updates FameScore, MediaMentions, FameTrend across all citizen ledgers.
 * Flags Generic_Citizens for promotion when media mentions exceed threshold.
 *
 * INTEGRATION:
 * - Called from mediaRoomIntake.js after routeCitizenUsageToIntake_()
 * - Processes Citizen_Media_Usage rows for current cycle
 * - Updates Simulation_Ledger, Generic_Citizens, Chicago_Citizens
 * - Syncs with Cultural_Ledger existing fame system
 * - Updates Storyline_Tracker coverage metrics
 *
 * CITIZEN LEDGERS:
 * 1. Simulation_Ledger: Main ledger (Tier 1-4 citizens)
 * 2. Generic_Citizens: Background pool (not yet promoted)
 * 3. Cultural_Ledger: Cultural entities/venues (existing fame system)
 * 4. Chicago_Citizens: Chicago Bulls players
 *
 * FAME CALCULATION:
 * - MediaMentions: Simple count of mentions
 * - FameScore: 0-100 (mentions × usage type weight × recency decay)
 * - FameTrend: rising (mentions increasing), stable, fading (no recent mentions)
 * - Notoriety: Context-based descriptor (hero/controversial/emerging/etc.)
 *
 * ============================================================================
 */


// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

var USAGE_TYPE_WEIGHTS = {
  'featured': 15,      // Front page feature
  'profiled': 12,      // In-depth profile
  'quoted': 8,         // Direct quote in article
  'mentioned': 3,      // Name mentioned
  'background': 1      // Background reference
};

var FAME_THRESHOLDS = {
  EMERGING: 10,        // 10+ = emerging local figure
  RECOGNIZED: 30,      // 30+ = recognized around Oakland
  PROMINENT: 60,       // 60+ = prominent figure
  CELEBRITY: 85        // 85+ = local celebrity
};

var PROMOTION_THRESHOLD = 3;  // 3+ mentions = flag for promotion from Generic_Citizens

var TREND_LOOKBACK_CYCLES = 5;  // Look back 5 cycles for trend calculation

var NOTORIETY_DESCRIPTORS = {
  'civic': ['local official', 'civic leader', 'council voice', 'city figure'],
  'sports': ['athlete', 'team star', 'sports figure', 'player spotlight'],
  'culture': ['artist', 'cultural figure', 'community voice', 'local talent'],
  'controversy': ['controversial figure', 'polarizing voice', 'debated figure'],
  'hero': ['local hero', 'community champion', 'beloved figure'],
  'emerging': ['rising voice', 'emerging figure', 'new face', 'growing presence']
};


// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Updates citizen fame scores based on media mentions.
 * Called from mediaRoomIntake.js after routeCitizenUsageToIntake_().
 *
 * @param {Spreadsheet} ss - Spreadsheet object
 * @param {number} cycle - Current cycle number
 * @param {Object} cal - Calendar context (optional)
 * @return {Object} Results summary
 */
function updateCitizenFameFromMedia_(ss, cycle, cal) {
  Logger.log('updateCitizenFameFromMedia_ v1.0: Starting fame tracking for cycle ' + cycle);

  var results = {
    processed: 0,
    simulationUpdates: 0,
    genericPromotions: 0,
    chicagoUpdates: 0,
    culturalSyncs: 0,
    storylineUpdates: 0,
    errors: []
  };

  try {
    // Load all citizen ledgers
    var ledgers = loadCitizenLedgers_(ss);

    // Get unprocessed media mentions for this cycle
    var mentions = getUnprocessedMediaMentions_(ss, cycle);
    results.processed = mentions.length;

    if (mentions.length === 0) {
      Logger.log('updateCitizenFameFromMedia_: No unprocessed mentions found');
      return results;
    }

    Logger.log('updateCitizenFameFromMedia_: Processing ' + mentions.length + ' mentions');

    // Group mentions by citizen
    var citizenMentions = groupMentionsByCitizen_(mentions);

    // Process each citizen's mentions
    for (var citizenName in citizenMentions) {
      if (!citizenMentions.hasOwnProperty(citizenName)) continue;

      var mentionList = citizenMentions[citizenName];
      var citizenResult = processCitizenMentions_(ss, ledgers, citizenName, mentionList, cycle);

      results.simulationUpdates += citizenResult.simulationUpdated ? 1 : 0;
      results.genericPromotions += citizenResult.genericPromoted ? 1 : 0;
      results.chicagoUpdates += citizenResult.chicagoUpdated ? 1 : 0;
      results.culturalSyncs += citizenResult.culturalSynced ? 1 : 0;

      if (citizenResult.error) {
        results.errors.push(citizenResult.error);
      }
    }

    // Update storyline coverage metrics
    results.storylineUpdates = updateStorylineCoverage_(ss, cycle);

    Logger.log('updateCitizenFameFromMedia_ v1.0: Complete. ' +
      'Processed: ' + results.processed +
      ', Sim updates: ' + results.simulationUpdates +
      ', Generic promotions: ' + results.genericPromotions +
      ', Chicago updates: ' + results.chicagoUpdates);

  } catch (e) {
    Logger.log('updateCitizenFameFromMedia_ ERROR: ' + e.message);
    results.errors.push(e.message);
  }

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// LEDGER LOADING
// ════════════════════════════════════════════════════════════════════════════

function loadCitizenLedgers_(ss) {
  var ledgers = {
    simulation: { sheet: null, data: [], headers: [], map: {} },
    generic: { sheet: null, data: [], headers: [], map: {} },
    cultural: { sheet: null, data: [], headers: [], map: {} },
    chicago: { sheet: null, data: [], headers: [], map: {} }
  };

  // Simulation_Ledger
  ledgers.simulation.sheet = ss.getSheetByName('Simulation_Ledger');
  if (ledgers.simulation.sheet) {
    ledgers.simulation.data = ledgers.simulation.sheet.getDataRange().getValues();
    ledgers.simulation.headers = ledgers.simulation.data[0];
    ledgers.simulation.map = buildNameMap_(ledgers.simulation.data, ledgers.simulation.headers);
  }

  // Generic_Citizens
  ledgers.generic.sheet = ss.getSheetByName('Generic_Citizens');
  if (ledgers.generic.sheet) {
    ledgers.generic.data = ledgers.generic.sheet.getDataRange().getValues();
    ledgers.generic.headers = ledgers.generic.data[0];
    ledgers.generic.map = buildNameMap_(ledgers.generic.data, ledgers.generic.headers);
  }

  // Cultural_Ledger
  ledgers.cultural.sheet = ss.getSheetByName('Cultural_Ledger');
  if (ledgers.cultural.sheet) {
    ledgers.cultural.data = ledgers.cultural.sheet.getDataRange().getValues();
    ledgers.cultural.headers = ledgers.cultural.data[0];
    ledgers.cultural.map = buildNameMap_(ledgers.cultural.data, ledgers.cultural.headers, 'Name');
  }

  // Chicago_Citizens
  ledgers.chicago.sheet = ss.getSheetByName('Chicago_Citizens');
  if (ledgers.chicago.sheet) {
    ledgers.chicago.data = ledgers.chicago.sheet.getDataRange().getValues();
    ledgers.chicago.headers = ledgers.chicago.data[0];
    ledgers.chicago.map = buildNameMap_(ledgers.chicago.data, ledgers.chicago.headers, 'Name');
  }

  return ledgers;
}


function buildNameMap_(data, headers, nameCol) {
  var map = {};
  var firstCol = headers.indexOf('First');
  var lastCol = headers.indexOf('Last');
  var singleNameCol = nameCol ? headers.indexOf(nameCol) : -1;

  for (var i = 1; i < data.length; i++) {
    var key;
    if (singleNameCol >= 0) {
      // Cultural_Ledger, Chicago_Citizens use single Name column
      key = normalizeIdentity_(data[i][singleNameCol]);
    } else {
      // Simulation_Ledger, Generic_Citizens use First + Last
      if (firstCol < 0 || lastCol < 0) continue;
      var first = normalizeIdentity_(data[i][firstCol]);
      var last = normalizeIdentity_(data[i][lastCol]);
      key = first + '|' + last;
    }

    if (key) {
      map[key] = i; // Store row index
    }
  }

  return map;
}


// ════════════════════════════════════════════════════════════════════════════
// MEDIA MENTION LOADING
// ════════════════════════════════════════════════════════════════════════════

function getUnprocessedMediaMentions_(ss, cycle) {
  var usageSheet = ss.getSheetByName('Citizen_Media_Usage');
  if (!usageSheet) return [];

  var data = usageSheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var cycleCol = headers.indexOf('Cycle');
  var nameCol = headers.indexOf('CitizenName');
  var usageTypeCol = headers.indexOf('UsageType');
  var contextCol = headers.indexOf('Context');
  var processedCol = headers.indexOf('FameProcessed');

  // Add FameProcessed column if missing
  if (processedCol < 0) {
    processedCol = headers.length;
    usageSheet.getRange(1, processedCol + 1).setValue('FameProcessed');
  }

  var mentions = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Only process current cycle
    if (cycleCol >= 0 && Number(row[cycleCol]) !== cycle) continue;

    // Skip already processed
    if (processedCol < row.length && row[processedCol] === 'Y') continue;

    var citizenName = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
    if (!citizenName) continue;

    mentions.push({
      rowIndex: i + 1,
      citizenName: citizenName,
      usageType: usageTypeCol >= 0 ? String(row[usageTypeCol] || 'mentioned').trim() : 'mentioned',
      context: contextCol >= 0 ? String(row[contextCol] || '').trim() : '',
      cycle: cycle
    });
  }

  return mentions;
}


function groupMentionsByCitizen_(mentions) {
  var grouped = {};

  for (var i = 0; i < mentions.length; i++) {
    var mention = mentions[i];
    var key = normalizeIdentity_(mention.citizenName);

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(mention);
  }

  return grouped;
}


// ════════════════════════════════════════════════════════════════════════════
// CITIZEN MENTION PROCESSING
// ════════════════════════════════════════════════════════════════════════════

function processCitizenMentions_(ss, ledgers, citizenName, mentions, cycle) {
  var result = {
    simulationUpdated: false,
    genericPromoted: false,
    chicagoUpdated: false,
    culturalSynced: false,
    error: null
  };

  var nameParts = splitName_(citizenName);
  var normalizedKey = normalizeIdentity_(nameParts.first) + '|' + normalizeIdentity_(nameParts.last);
  var singleNameKey = normalizeIdentity_(citizenName);

  // Try to find citizen in ledgers (priority order: Simulation → Chicago → Cultural → Generic)

  // 1. Check Simulation_Ledger
  if (ledgers.simulation.map[normalizedKey] !== undefined) {
    updateSimulationLedgerCitizen_(ss, ledgers.simulation, normalizedKey, mentions, cycle);
    result.simulationUpdated = true;
    markMentionsProcessed_(ss, mentions);
    return result;
  }

  // 2. Check Chicago_Citizens
  if (ledgers.chicago.map[singleNameKey] !== undefined) {
    updateChicagoCitizen_(ss, ledgers.chicago, singleNameKey, mentions, cycle);
    result.chicagoUpdated = true;
    markMentionsProcessed_(ss, mentions);
    return result;
  }

  // 3. Check Cultural_Ledger
  if (ledgers.cultural.map[singleNameKey] !== undefined) {
    syncCulturalLedgerFame_(ss, ledgers.cultural, singleNameKey, mentions, cycle);
    result.culturalSynced = true;
    markMentionsProcessed_(ss, mentions);
    return result;
  }

  // 4. Check Generic_Citizens
  if (ledgers.generic.map[normalizedKey] !== undefined) {
    var promoted = updateGenericCitizen_(ss, ledgers.generic, normalizedKey, mentions, cycle);
    result.genericPromoted = promoted;
    markMentionsProcessed_(ss, mentions);
    return result;
  }

  // Not found in any ledger
  result.error = 'Citizen not found in any ledger: ' + citizenName;
  Logger.log('processCitizenMentions_: ' + result.error);

  return result;
}


// ════════════════════════════════════════════════════════════════════════════
// SIMULATION_LEDGER UPDATES
// ════════════════════════════════════════════════════════════════════════════

function updateSimulationLedgerCitizen_(ss, ledger, citizenKey, mentions, cycle) {
  var rowIndex = ledger.map[citizenKey];
  var row = ledger.data[rowIndex];
  var headers = ledger.headers;

  // Get column indices
  var fameCol = headers.indexOf('FameScore');
  var notorietyCol = headers.indexOf('Notoriety');
  var mentionsCol = headers.indexOf('MediaMentions');
  var lastMentionCol = headers.indexOf('LastMentionedCycle');
  var trendCol = headers.indexOf('FameTrend');

  if (fameCol < 0) {
    Logger.log('updateSimulationLedgerCitizen_: FameScore column not found. Run migration first.');
    return;
  }

  // Calculate new fame metrics
  var currentFame = Number(row[fameCol]) || 0;
  var currentMentions = Number(row[mentionsCol]) || 0;
  var lastMentionCycle = row[lastMentionCol] ? Number(row[lastMentionCol]) : 0;

  var mentionCount = mentions.length;
  var mentionPoints = calculateMentionPoints_(mentions);

  var newFame = Math.min(100, currentFame + mentionPoints);
  var newMentions = currentMentions + mentionCount;

  // Calculate trend
  var trend = calculateFameTrend_(currentFame, newFame, lastMentionCycle, cycle);

  // Determine notoriety
  var notoriety = determineNotoriety_(mentions, newFame);

  // Update row
  var updates = [];
  if (fameCol >= 0) updates.push({ col: fameCol + 1, value: newFame });
  if (notorietyCol >= 0) updates.push({ col: notorietyCol + 1, value: notoriety });
  if (mentionsCol >= 0) updates.push({ col: mentionsCol + 1, value: newMentions });
  if (lastMentionCol >= 0) updates.push({ col: lastMentionCol + 1, value: cycle });
  if (trendCol >= 0) updates.push({ col: trendCol + 1, value: trend });

  for (var i = 0; i < updates.length; i++) {
    ledger.sheet.getRange(rowIndex + 1, updates[i].col).setValue(updates[i].value);
  }

  Logger.log('updateSimulationLedgerCitizen_: Updated row ' + (rowIndex + 1) +
    ' | Fame: ' + currentFame + ' → ' + newFame +
    ' | Mentions: ' + newMentions +
    ' | Trend: ' + trend);
}


// ════════════════════════════════════════════════════════════════════════════
// GENERIC_CITIZENS UPDATES
// ════════════════════════════════════════════════════════════════════════════

function updateGenericCitizen_(ss, ledger, citizenKey, mentions, cycle) {
  var rowIndex = ledger.map[citizenKey];
  var row = ledger.data[rowIndex];
  var headers = ledger.headers;

  var candidateCol = headers.indexOf('PromotionCandidate');
  var scoreCol = headers.indexOf('PromotionScore');
  var reasonCol = headers.indexOf('PromotionReason');

  if (candidateCol < 0) {
    Logger.log('updateGenericCitizen_: PromotionCandidate column not found. Run migration first.');
    return false;
  }

  var mentionCount = mentions.length;
  var mentionPoints = calculateMentionPoints_(mentions);

  var currentScore = Number(row[scoreCol]) || 0;
  var newScore = Math.min(100, currentScore + mentionPoints);

  var shouldPromote = mentionCount >= PROMOTION_THRESHOLD || newScore >= 30;

  if (shouldPromote) {
    var reason = 'Media coverage: ' + mentionCount + ' mention' + (mentionCount > 1 ? 's' : '') +
      ' in cycle ' + cycle;

    ledger.sheet.getRange(rowIndex + 1, candidateCol + 1).setValue('yes');
    ledger.sheet.getRange(rowIndex + 1, scoreCol + 1).setValue(newScore);
    ledger.sheet.getRange(rowIndex + 1, reasonCol + 1).setValue(reason);

    Logger.log('updateGenericCitizen_: Flagged row ' + (rowIndex + 1) +
      ' for promotion | Score: ' + newScore + ' | Mentions: ' + mentionCount);

    return true;
  } else {
    // Update score even if not promoting yet
    ledger.sheet.getRange(rowIndex + 1, scoreCol + 1).setValue(newScore);
    return false;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// CHICAGO_CITIZENS UPDATES
// ════════════════════════════════════════════════════════════════════════════

function updateChicagoCitizen_(ss, ledger, citizenKey, mentions, cycle) {
  var rowIndex = ledger.map[citizenKey];
  var row = ledger.data[rowIndex];
  var headers = ledger.headers;

  var fameCol = headers.indexOf('FameScore');
  var mentionsCol = headers.indexOf('MediaMentions');
  var lastMentionCol = headers.indexOf('LastMentionedCycle');
  var trendCol = headers.indexOf('FameTrend');

  if (fameCol < 0) {
    Logger.log('updateChicagoCitizen_: FameScore column not found. Run migration first.');
    return;
  }

  var currentFame = Number(row[fameCol]) || 0;
  var currentMentions = Number(row[mentionsCol]) || 0;
  var lastMentionCycle = row[lastMentionCol] ? Number(row[lastMentionCol]) : 0;

  var mentionCount = mentions.length;
  var mentionPoints = calculateMentionPoints_(mentions);

  var newFame = Math.min(100, currentFame + mentionPoints);
  var newMentions = currentMentions + mentionCount;

  var trend = calculateFameTrend_(currentFame, newFame, lastMentionCycle, cycle);

  ledger.sheet.getRange(rowIndex + 1, fameCol + 1).setValue(newFame);
  ledger.sheet.getRange(rowIndex + 1, mentionsCol + 1).setValue(newMentions);
  ledger.sheet.getRange(rowIndex + 1, lastMentionCol + 1).setValue(cycle);
  ledger.sheet.getRange(rowIndex + 1, trendCol + 1).setValue(trend);

  Logger.log('updateChicagoCitizen_: Updated row ' + (rowIndex + 1) +
    ' | Fame: ' + currentFame + ' → ' + newFame + ' | Trend: ' + trend);
}


// ════════════════════════════════════════════════════════════════════════════
// CULTURAL_LEDGER SYNC
// ════════════════════════════════════════════════════════════════════════════

function syncCulturalLedgerFame_(ss, ledger, citizenKey, mentions, cycle) {
  var rowIndex = ledger.map[citizenKey];
  var row = ledger.data[rowIndex];
  var headers = ledger.headers;

  // Cultural_Ledger already has FameScore, MediaCount, TrendTrajectory
  // Just sync with new mention data

  var fameCol = headers.indexOf('FameScore');
  var mediaCountCol = headers.indexOf('MediaCount');
  var trendCol = headers.indexOf('TrendTrajectory');

  if (fameCol < 0 || mediaCountCol < 0) {
    Logger.log('syncCulturalLedgerFame_: FameScore or MediaCount not found');
    return;
  }

  var currentFame = Number(row[fameCol]) || 0;
  var currentCount = Number(row[mediaCountCol]) || 0;

  var mentionCount = mentions.length;
  var mentionPoints = calculateMentionPoints_(mentions);

  var newFame = Math.min(100, currentFame + mentionPoints);
  var newCount = currentCount + mentionCount;

  // TrendTrajectory in Cultural_Ledger uses different format (ascending/stable/declining)
  var trend = 'stable';
  if (newFame > currentFame + 5) trend = 'ascending';
  else if (newFame < currentFame) trend = 'declining';

  ledger.sheet.getRange(rowIndex + 1, fameCol + 1).setValue(newFame);
  ledger.sheet.getRange(rowIndex + 1, mediaCountCol + 1).setValue(newCount);
  if (trendCol >= 0) {
    ledger.sheet.getRange(rowIndex + 1, trendCol + 1).setValue(trend);
  }

  Logger.log('syncCulturalLedgerFame_: Synced row ' + (rowIndex + 1) +
    ' | Fame: ' + currentFame + ' → ' + newFame);
}


// ════════════════════════════════════════════════════════════════════════════
// STORYLINE COVERAGE UPDATES
// ════════════════════════════════════════════════════════════════════════════

function updateStorylineCoverage_(ss, cycle) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) return 0;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;

  var headers = data[0];
  var lastCoverageCol = headers.indexOf('LastCoverageCycle');
  var mentionCountCol = headers.indexOf('MentionCount');
  var coverageGapCol = headers.indexOf('CoverageGap');
  var statusCol = headers.indexOf('Status');

  if (lastCoverageCol < 0) {
    Logger.log('updateStorylineCoverage_: Columns not found. Run migration first.');
    return 0;
  }

  var updated = 0;

  // For now, just update coverage gaps based on last mention
  // Future: parse Citizen_Media_Usage context to match storylines
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = statusCol >= 0 ? String(row[statusCol] || '').toLowerCase() : '';

    if (status === 'resolved') continue;

    var lastCoverage = row[lastCoverageCol] ? Number(row[lastCoverageCol]) : 0;
    var gap = lastCoverage > 0 ? cycle - lastCoverage : 0;

    if (coverageGapCol >= 0) {
      sheet.getRange(i + 1, coverageGapCol + 1).setValue(gap);
      updated++;
    }
  }

  Logger.log('updateStorylineCoverage_: Updated coverage gaps for ' + updated + ' storylines');
  return updated;
}


// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function calculateMentionPoints_(mentions) {
  var points = 0;

  for (var i = 0; i < mentions.length; i++) {
    var usageType = mentions[i].usageType.toLowerCase();
    var weight = USAGE_TYPE_WEIGHTS[usageType] || USAGE_TYPE_WEIGHTS['mentioned'];
    points += weight;
  }

  return points;
}


function calculateFameTrend_(oldFame, newFame, lastMentionCycle, currentCycle) {
  var fameChange = newFame - oldFame;
  var cyclesSinceLastMention = currentCycle - lastMentionCycle;

  // Rising: significant fame gain
  if (fameChange >= 10) return 'rising';

  // Fading: no mentions for 5+ cycles or fame declining
  if (cyclesSinceLastMention >= TREND_LOOKBACK_CYCLES || fameChange < 0) return 'fading';

  // Stable: minor changes
  return 'stable';
}


function determineNotoriety_(mentions, fameScore) {
  // Analyze mention contexts to determine notoriety type
  var contexts = mentions.map(function(m) { return m.context.toLowerCase(); });
  var allContexts = contexts.join(' ');

  // Check for category keywords
  var category = 'emerging';

  if (allContexts.indexOf('civic') >= 0 || allContexts.indexOf('council') >= 0 ||
      allContexts.indexOf('mayor') >= 0 || allContexts.indexOf('official') >= 0) {
    category = 'civic';
  } else if (allContexts.indexOf('hero') >= 0 || allContexts.indexOf('champion') >= 0 ||
             allContexts.indexOf('beloved') >= 0) {
    category = 'hero';
  } else if (allContexts.indexOf('sports') >= 0 || allContexts.indexOf('athlete') >= 0 ||
             allContexts.indexOf('player') >= 0) {
    category = 'sports';
  } else if (allContexts.indexOf('artist') >= 0 || allContexts.indexOf('culture') >= 0 ||
             allContexts.indexOf('music') >= 0) {
    category = 'culture';
  } else if (allContexts.indexOf('controversy') >= 0 || allContexts.indexOf('polarizing') >= 0 ||
             allContexts.indexOf('debate') >= 0) {
    category = 'controversy';
  }

  var descriptors = NOTORIETY_DESCRIPTORS[category] || NOTORIETY_DESCRIPTORS['emerging'];
  var index = Math.min(Math.floor(fameScore / 25), descriptors.length - 1);

  return descriptors[index];
}


function markMentionsProcessed_(ss, mentions) {
  var usageSheet = ss.getSheetByName('Citizen_Media_Usage');
  if (!usageSheet) return;

  var headers = usageSheet.getRange(1, 1, 1, usageSheet.getLastColumn()).getValues()[0];
  var processedCol = headers.indexOf('FameProcessed');

  if (processedCol < 0) {
    processedCol = headers.length;
    usageSheet.getRange(1, processedCol + 1).setValue('FameProcessed');
  }

  for (var i = 0; i < mentions.length; i++) {
    usageSheet.getRange(mentions[i].rowIndex, processedCol + 1).setValue('Y');
  }
}


function splitName_(fullName) {
  var parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0], last: '' };
  }
  return {
    first: parts[0],
    last: parts.slice(1).join(' ')
  };
}


function normalizeIdentity_(str) {
  return String(str || '').trim().toLowerCase();
}


/**
 * ============================================================================
 * CITIZEN FAME TRACKER REFERENCE v1.0
 * ============================================================================
 *
 * FAME SCORE CALCULATION:
 * - featured: +15 points
 * - profiled: +12 points
 * - quoted: +8 points
 * - mentioned: +3 points
 * - background: +1 point
 * - Max: 100
 *
 * FAME THRESHOLDS:
 * - 10+: Emerging local figure
 * - 30+: Recognized around Oakland
 * - 60+: Prominent figure
 * - 85+: Local celebrity
 *
 * FAME TREND:
 * - rising: +10 or more fame this cycle
 * - stable: minor changes, recent mentions
 * - fading: no mentions for 5+ cycles or declining
 *
 * NOTORIETY TYPES:
 * - civic: local official, civic leader, council voice
 * - sports: athlete, team star, sports figure
 * - culture: artist, cultural figure, community voice
 * - hero: local hero, community champion, beloved figure
 * - controversy: controversial figure, polarizing voice
 * - emerging: rising voice, emerging figure, new face
 *
 * PROMOTION THRESHOLD (Generic_Citizens):
 * - 3+ mentions OR 30+ PromotionScore = flagged for promotion
 *
 * INTEGRATION:
 * - Called from mediaRoomIntake.js after routeCitizenUsageToIntake_()
 * - Processes Citizen_Media_Usage rows marked for current cycle
 * - Marks processed rows with FameProcessed = 'Y'
 *
 * ============================================================================
 */
