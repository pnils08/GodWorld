/**
 * ============================================================================
 * STORYLINE WEAVING ENGINE v1.0
 * ============================================================================
 *
 * Detects cross-storyline connections, assigns citizen roles, and generates
 * weaving hooks when citizens appear in multiple active storylines.
 *
 * Part of: Week 3 Multi-Citizen Storyline Weaving
 *
 * Features:
 * - Citizen role assignment (protagonist, antagonist, witness, victim, ally)
 * - Cross-storyline conflict detection
 * - Relationship web mapping
 * - Weaving story hooks (CROSS_STORYLINE, RELATIONSHIP_CLASH, ALLIANCE_OPPORTUNITY)
 *
 * Integration:
 * - Called from Phase 07 after storyline processing
 * - Uses citizen ledgers (Simulation, Cultural, Chicago, Generic)
 * - Updates Storyline_Tracker with CitizenRoles and CrossStorylineLinks
 *
 * Story Hooks Generated:
 * - CROSS_STORYLINE (severity 7): Citizen in multiple active storylines
 * - RELATIONSHIP_CLASH (severity 6): Rivals both in news this cycle
 * - ALLIANCE_OPPORTUNITY (severity 5): Allies can team up across storylines
 *
 * ============================================================================
 */


// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

var ROLE_TYPES = [
  'protagonist',  // Main character driving the story
  'antagonist',   // Opposition/conflict creator
  'witness',      // Observer/commentator
  'victim',       // Affected by events
  'ally',         // Supporting character
  'background'    // Minor mention
];

var CONFLICT_TYPES = [
  'personal',     // Individual disputes
  'political',    // Governance/policy conflicts
  'economic',     // Financial/resource conflicts
  'romantic',     // Relationship conflicts
  'ideological'   // Values/belief conflicts
];

var RELATIONSHIP_TYPES = {
  'allies': { impact: 'positive', weight: 1.0 },
  'rivals': { impact: 'negative', weight: -1.0 },
  'neutral': { impact: 'neutral', weight: 0.0 }
};


// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Process storyline weaving for current cycle.
 * Detects cross-storyline connections and generates weaving hooks.
 *
 * @param {Object} ctx - Cycle context
 * @returns {Object} - Processing results
 */
function weaveStorylines_(ctx) {
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount;
  var S = ctx.summary;

  var results = {
    processed: 0,
    rolesAssigned: 0,
    crossStorylines: 0,
    clashes: 0,
    alliances: 0,
    errors: []
  };

  try {
    // Load active storylines
    var storylines = loadActiveStorylines_(ss);
    if (storylines.length === 0) {
      return results;
    }

    results.processed = storylines.length;

    // Build citizen-to-storyline map
    var citizenMap = buildCitizenStorylineMap_(storylines);

    // Detect multi-storyline citizens
    var multiStorylineCitizens = findMultiStorylineCitizens_(citizenMap);

    // Assign roles to citizens in each storyline
    assignCitizenRoles_(ss, storylines, cycle);
    results.rolesAssigned = storylines.length;

    // Detect cross-storyline conflicts
    var crossStorylineHooks = detectCrossStorylineConflicts_(
      ss, storylines, multiStorylineCitizens, cycle
    );
    results.crossStorylines = crossStorylineHooks.length;

    // Detect relationship clashes
    var clashHooks = detectRelationshipClashes_(ss, storylines, cycle);
    results.clashes = clashHooks.length;

    // Detect alliance opportunities
    var allianceHooks = detectAllianceOpportunities_(ss, storylines, cycle);
    results.alliances = allianceHooks.length;

    // Update Storyline_Tracker with cross-links
    updateCrossStorylineLinks_(ss, storylines, multiStorylineCitizens);

    // Add hooks to context
    var allHooks = [].concat(crossStorylineHooks, clashHooks, allianceHooks);
    if (!S.storyHooks) S.storyHooks = [];
    S.storyHooks = S.storyHooks.concat(allHooks);

    // Save results to context
    S.storylineWeaving = results;

  } catch (err) {
    results.errors.push(err.toString());
    Logger.log('weaveStorylines_ ERROR: ' + err);
  }

  Logger.log('weaveStorylines_ v1.0: Complete.');
  Logger.log('Processed: ' + results.processed + ', Cross-storylines: ' + results.crossStorylines +
             ', Clashes: ' + results.clashes + ', Alliances: ' + results.alliances);

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// DATA LOADING
// ════════════════════════════════════════════════════════════════════════════

function loadActiveStorylines_(ss) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var storylines = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = String(row[headers.indexOf('Status')] || '').toLowerCase();

    // Only process active storylines
    if (status !== 'active') continue;

    var storyline = {
      rowIndex: i + 1,
      storylineId: row[headers.indexOf('StorylineId')] || '',
      title: row[headers.indexOf('Title')] || '',
      relatedCitizens: String(row[headers.indexOf('RelatedCitizens')] || ''),
      status: status,
      priority: row[headers.indexOf('Priority')] || '',
      citizenRoles: parseJSON(row[headers.indexOf('CitizenRoles')], {}),
      conflictType: row[headers.indexOf('ConflictType')] || '',
      relationshipImpact: parseJSON(row[headers.indexOf('RelationshipImpact')], {}),
      crossStorylineLinks: parseJSON(row[headers.indexOf('CrossStorylineLinks')], [])
    };

    storylines.push(storyline);
  }

  return storylines;
}

function parseJSON(value, defaultValue) {
  if (!value || value === '') return defaultValue;
  try {
    return JSON.parse(value);
  } catch (err) {
    return defaultValue;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// CITIZEN MAPPING
// ════════════════════════════════════════════════════════════════════════════

function buildCitizenStorylineMap_(storylines) {
  var map = {};

  for (var i = 0; i < storylines.length; i++) {
    var storyline = storylines[i];
    var citizens = parseCitizenList_(storyline.relatedCitizens);

    for (var j = 0; j < citizens.length; j++) {
      var citizen = citizens[j];
      if (!map[citizen]) {
        map[citizen] = [];
      }
      map[citizen].push(storyline.storylineId);
    }
  }

  return map;
}

function parseCitizenList_(citizenString) {
  if (!citizenString) return [];

  // Handle comma-separated list
  return citizenString
    .split(',')
    .map(function(c) { return c.trim(); })
    .filter(function(c) { return c.length > 0; });
}

function findMultiStorylineCitizens_(citizenMap) {
  var multi = [];

  for (var citizen in citizenMap) {
    if (citizenMap[citizen].length > 1) {
      multi.push({
        citizen: citizen,
        storylines: citizenMap[citizen]
      });
    }
  }

  return multi;
}


// ════════════════════════════════════════════════════════════════════════════
// ROLE ASSIGNMENT
// ════════════════════════════════════════════════════════════════════════════

function assignCitizenRoles_(ss, storylines, cycle) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rolesColIndex = headers.indexOf('CitizenRoles') + 1;
  var conflictColIndex = headers.indexOf('ConflictType') + 1;

  if (rolesColIndex === 0) {
    Logger.log('Warning: CitizenRoles column not found. Run migration first.');
    return;
  }

  for (var i = 0; i < storylines.length; i++) {
    var storyline = storylines[i];

    // If roles already assigned, skip
    if (Object.keys(storyline.citizenRoles).length > 0) continue;

    // Auto-assign roles based on citizen list
    var citizens = parseCitizenList_(storyline.relatedCitizens);
    var roles = autoAssignRoles_(citizens, storyline);

    // Infer conflict type if not set
    var conflictType = storyline.conflictType;
    if (!conflictType) {
      conflictType = inferConflictType_(storyline, roles);
    }

    // Update sheet
    sheet.getRange(storyline.rowIndex, rolesColIndex).setValue(JSON.stringify(roles));
    if (conflictColIndex > 0 && conflictType) {
      sheet.getRange(storyline.rowIndex, conflictColIndex).setValue(conflictType);
    }

    // Update in-memory object
    storyline.citizenRoles = roles;
    storyline.conflictType = conflictType;
  }
}

function autoAssignRoles_(citizens, storyline) {
  var roles = {};

  if (citizens.length === 0) return roles;

  // First citizen = protagonist (default)
  if (citizens.length >= 1) {
    roles[citizens[0]] = 'protagonist';
  }

  // Second citizen = antagonist or ally (check title for clues)
  if (citizens.length >= 2) {
    var title = storyline.title.toLowerCase();
    if (title.indexOf('vs') > -1 || title.indexOf('oppose') > -1 ||
        title.indexOf('clash') > -1 || title.indexOf('conflict') > -1) {
      roles[citizens[1]] = 'antagonist';
    } else {
      roles[citizens[1]] = 'ally';
    }
  }

  // Remaining citizens = witnesses (default)
  for (var i = 2; i < citizens.length; i++) {
    roles[citizens[i]] = 'witness';
  }

  return roles;
}

function inferConflictType_(storyline, roles) {
  var title = storyline.title.toLowerCase();

  // Check for political keywords
  if (title.indexOf('vote') > -1 || title.indexOf('initiative') > -1 ||
      title.indexOf('council') > -1 || title.indexOf('policy') > -1) {
    return 'political';
  }

  // Check for economic keywords
  if (title.indexOf('fund') > -1 || title.indexOf('budget') > -1 ||
      title.indexOf('housing') > -1 || title.indexOf('business') > -1) {
    return 'economic';
  }

  // Check for personal keywords
  if (title.indexOf('feud') > -1 || title.indexOf('rivalry') > -1 ||
      title.indexOf('dispute') > -1) {
    return 'personal';
  }

  // Check for antagonist presence
  var hasAntagonist = false;
  for (var citizen in roles) {
    if (roles[citizen] === 'antagonist') {
      hasAntagonist = true;
      break;
    }
  }

  return hasAntagonist ? 'personal' : 'political';
}


// ════════════════════════════════════════════════════════════════════════════
// CROSS-STORYLINE DETECTION
// ════════════════════════════════════════════════════════════════════════════

function detectCrossStorylineConflicts_(ss, storylines, multiCitizens, cycle) {
  var hooks = [];

  for (var i = 0; i < multiCitizens.length; i++) {
    var mc = multiCitizens[i];
    var citizen = mc.citizen;
    var storylineIds = mc.storylines;

    // Get roles in each storyline
    var roles = [];
    for (var j = 0; j < storylineIds.length; j++) {
      var storyline = findStorylineById_(storylines, storylineIds[j]);
      if (storyline && storyline.citizenRoles[citizen]) {
        roles.push({
          storylineId: storyline.storylineId,
          title: storyline.title,
          role: storyline.citizenRoles[citizen]
        });
      }
    }

    // Check for conflicting roles (protagonist in one, antagonist in another)
    var hasProtagonist = false;
    var hasAntagonist = false;
    for (var k = 0; k < roles.length; k++) {
      if (roles[k].role === 'protagonist') hasProtagonist = true;
      if (roles[k].role === 'antagonist') hasAntagonist = true;
    }

    if (hasProtagonist && hasAntagonist) {
      // Generate CROSS_STORYLINE hook
      hooks.push({
        hookType: 'CROSS_STORYLINE',
        citizen: citizen,
        storylines: storylineIds,
        roles: roles,
        severity: 7,
        description: citizen + ' appears in ' + storylineIds.length + ' storylines with conflicting roles'
      });
    } else if (roles.length >= 2) {
      // Multiple storylines, but not conflicting roles
      hooks.push({
        hookType: 'CROSS_STORYLINE',
        citizen: citizen,
        storylines: storylineIds,
        roles: roles,
        severity: 6,
        description: citizen + ' appears in ' + storylineIds.length + ' active storylines'
      });
    }
  }

  return hooks;
}

function findStorylineById_(storylines, storylineId) {
  for (var i = 0; i < storylines.length; i++) {
    if (storylines[i].storylineId === storylineId) {
      return storylines[i];
    }
  }
  return null;
}


// ════════════════════════════════════════════════════════════════════════════
// RELATIONSHIP DETECTION
// ════════════════════════════════════════════════════════════════════════════

function detectRelationshipClashes_(ss, storylines, cycle) {
  var hooks = [];

  // Check for antagonist pairs across storylines
  for (var i = 0; i < storylines.length; i++) {
    for (var j = i + 1; j < storylines.length; j++) {
      var s1 = storylines[i];
      var s2 = storylines[j];

      // Find antagonists in each storyline
      var antagonists1 = getCitizensByRole_(s1, 'antagonist');
      var antagonists2 = getCitizensByRole_(s2, 'antagonist');

      // Check if any antagonist appears in both
      for (var k = 0; k < antagonists1.length; k++) {
        for (var m = 0; m < antagonists2.length; m++) {
          if (antagonists1[k] === antagonists2[m]) {
            hooks.push({
              hookType: 'RELATIONSHIP_CLASH',
              citizen: antagonists1[k],
              storyline1: s1.storylineId,
              storyline2: s2.storylineId,
              severity: 6,
              description: antagonists1[k] + ' is antagonist in both "' + s1.title + '" and "' + s2.title + '"'
            });
          }
        }
      }
    }
  }

  return hooks;
}

function detectAllianceOpportunities_(ss, storylines, cycle) {
  var hooks = [];

  // Check for protagonist/ally pairs across storylines
  for (var i = 0; i < storylines.length; i++) {
    for (var j = i + 1; j < storylines.length; j++) {
      var s1 = storylines[i];
      var s2 = storylines[j];

      // Find protagonists and allies in each storyline
      var heroes1 = getCitizensByRole_(s1, 'protagonist').concat(getCitizensByRole_(s1, 'ally'));
      var heroes2 = getCitizensByRole_(s2, 'protagonist').concat(getCitizensByRole_(s2, 'ally'));

      // Check if any hero appears in both
      for (var k = 0; k < heroes1.length; k++) {
        for (var m = 0; m < heroes2.length; m++) {
          if (heroes1[k] === heroes2[m]) {
            hooks.push({
              hookType: 'ALLIANCE_OPPORTUNITY',
              citizen: heroes1[k],
              storyline1: s1.storylineId,
              storyline2: s2.storylineId,
              severity: 5,
              description: heroes1[k] + ' could bridge "' + s1.title + '" and "' + s2.title + '"'
            });
          }
        }
      }
    }
  }

  return hooks;
}

function getCitizensByRole_(storyline, role) {
  var citizens = [];
  for (var citizen in storyline.citizenRoles) {
    if (storyline.citizenRoles[citizen] === role) {
      citizens.push(citizen);
    }
  }
  return citizens;
}


// ════════════════════════════════════════════════════════════════════════════
// UPDATES
// ════════════════════════════════════════════════════════════════════════════

function updateCrossStorylineLinks_(ss, storylines, multiCitizens) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var linksColIndex = headers.indexOf('CrossStorylineLinks') + 1;

  if (linksColIndex === 0) {
    Logger.log('Warning: CrossStorylineLinks column not found. Run migration first.');
    return;
  }

  // Build storyline-to-storyline link map
  var linkMap = {};
  for (var i = 0; i < multiCitizens.length; i++) {
    var mc = multiCitizens[i];
    var storylineIds = mc.storylines;

    // Each storyline links to the others
    for (var j = 0; j < storylineIds.length; j++) {
      var sid = storylineIds[j];
      if (!linkMap[sid]) linkMap[sid] = [];

      for (var k = 0; k < storylineIds.length; k++) {
        if (j !== k && linkMap[sid].indexOf(storylineIds[k]) === -1) {
          linkMap[sid].push(storylineIds[k]);
        }
      }
    }
  }

  // Update sheet
  for (var i = 0; i < storylines.length; i++) {
    var storyline = storylines[i];
    var links = linkMap[storyline.storylineId] || [];

    if (links.length > 0) {
      sheet.getRange(storyline.rowIndex, linksColIndex).setValue(JSON.stringify(links));
    }
  }
}


// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

// Main function for external calls
