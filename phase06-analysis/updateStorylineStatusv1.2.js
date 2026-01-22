/**
 * ============================================================================
 * STORYLINE STATUS UPDATER v1.2
 * ============================================================================
 *
 * v1.2 CHANGES:
 * - Fixed column name mapping to match actual Storyline_Tracker schema
 * - Added fallback column names: CycleAdded/StartCycle, StorylineType/Type
 * - Removed reference to non-existent StorylineId column
 * - Updated logging to use Description field for storyline identification
 * - LastMentionedCycle falls back to CycleAdded when not present
 *
 * v1.1 CHANGES:
 * - Renamed findCol_ to findColByArray_ to avoid collision with
 *   processAdvancementIntake which uses string-based findCol_
 * - Function name collision was causing TypeError: name.toLowerCase is not a function
 * 
 * Ages storylines and manages status transitions:
 * - active: Currently being tracked
 * - dormant: No coverage for 5+ cycles
 * - concluded: Story wrapped up or linked arc resolved
 * - abandoned: No coverage for 15+ cycles (auto-close)
 * 
 * INTEGRATION:
 * Add to Phase 6 in runWorldCycle():
 *   updateStorylineStatus_(ctx);
 * 
 * Run AFTER processMediaIntake_() so new mentions are counted first.
 * 
 * ============================================================================
 */


// ════════════════════════════════════════════════════════════════════════════
// HELPER: FIND COLUMN INDEX BY ARRAY OF NAMES
// ════════════════════════════════════════════════════════════════════════════
// RENAMED from findCol_ to findColByArray_ to avoid collision with
// processAdvancementIntake which uses string-based findCol_

function findColByArray_(headers, names) {
  for (var i = 0; i < names.length; i++) {
    var idx = headers.indexOf(names[i]);
    if (idx >= 0) return idx;
  }
  return -1;
}


/**
 * Main function — update all storyline statuses
 */
function updateStorylineStatus_(ctx) {
  
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount || 0;
  
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) {
    Logger.log('updateStorylineStatus_: No Storyline_Tracker found');
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('updateStorylineStatus_: No storylines to process');
    return;
  }
  
  var headers = data[0];
  // v1.2: Support both legacy and current schema column names
  var cols = {
    startCycle: findColByArray_(headers, ['CycleAdded', 'StartCycle']),
    type: findColByArray_(headers, ['StorylineType', 'Type']),
    description: findColByArray_(headers, ['Description']),
    neighborhood: findColByArray_(headers, ['Neighborhood']),
    linkedArc: findColByArray_(headers, ['LinkedArc']),
    status: findColByArray_(headers, ['Status']),
    lastMentioned: findColByArray_(headers, ['LastMentionedCycle', 'CycleAdded']),
    mentionCount: findColByArray_(headers, ['MentionCount']),
    priority: findColByArray_(headers, ['Priority'])
  };
  
  // Load arc statuses for linked arc checking
  var arcStatuses = loadArcStatuses_(ss);
  
  var updates = {
    dormant: 0,
    concluded: 0,
    abandoned: 0,
    reactivated: 0
  };
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowNum = i + 1;
    
    var status = row[cols.status] || 'active';
    var lastMentioned = row[cols.lastMentioned] || row[cols.startCycle] || 0;
    var linkedArc = row[cols.linkedArc] || '';
    
    // Skip already concluded/abandoned
    if (status === 'concluded' || status === 'abandoned') continue;
    
    var cyclesSinceLastMention = cycle - lastMentioned;
    var newStatus = status;
    var newPriority = row[cols.priority] || 'normal';
    
    // ═══════════════════════════════════════════════════════════════════════
    // CHECK LINKED ARC STATUS
    // ═══════════════════════════════════════════════════════════════════════
    
    if (linkedArc && arcStatuses[linkedArc]) {
      var arcStatus = arcStatuses[linkedArc];
      
      if (arcStatus.phase === 'resolved') {
        // Arc resolved — flag storyline for wrap-up
        newStatus = 'concluded';
        newPriority = 'wrap-up';
        updates.concluded++;
        Logger.log('updateStorylineStatus_: Storyline "' + (row[cols.description] || 'Row ' + rowNum) + '" concluded (linked arc resolved)');
      } else if (arcStatus.phase === 'peak' || arcStatus.tension >= 7) {
        // Arc escalating — boost priority
        newPriority = 'high';
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // AGE-BASED STATUS TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════
    
    if (newStatus !== 'concluded') {
      
      // Dormant: No mention for 5+ cycles
      if (cyclesSinceLastMention >= 5 && cyclesSinceLastMention < 15) {
        if (status === 'active') {
          newStatus = 'dormant';
          updates.dormant++;
          Logger.log('updateStorylineStatus_: Storyline "' + (row[cols.description] || 'Row ' + rowNum) + '" now dormant');
        }
      }
      
      // Abandoned: No mention for 15+ cycles
      else if (cyclesSinceLastMention >= 15) {
        newStatus = 'abandoned';
        updates.abandoned++;
        Logger.log('updateStorylineStatus_: Storyline "' + (row[cols.description] || 'Row ' + rowNum) + '" abandoned');
      }
      
      // Reactivate if dormant but recently mentioned
      else if (status === 'dormant' && cyclesSinceLastMention < 5) {
        newStatus = 'active';
        updates.reactivated++;
        Logger.log('updateStorylineStatus_: Storyline "' + (row[cols.description] || 'Row ' + rowNum) + '" reactivated');
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // WRITE UPDATES
    // ═══════════════════════════════════════════════════════════════════════
    
    if (newStatus !== status) {
      sheet.getRange(rowNum, cols.status + 1).setValue(newStatus);
    }
    
    if (newPriority !== row[cols.priority]) {
      sheet.getRange(rowNum, cols.priority + 1).setValue(newPriority);
    }
  }
  
  // Store results in context
  ctx.summary.storylineUpdates = updates;
  
  Logger.log('updateStorylineStatus_ v1.2: Complete. Dormant: ' + updates.dormant +
    ', Concluded: ' + updates.concluded +
    ', Abandoned: ' + updates.abandoned +
    ', Reactivated: ' + updates.reactivated);
}


/**
 * Load arc statuses for linked arc checking
 */
function loadArcStatuses_(ss) {
  var sheet = ss.getSheetByName('Event_Arc_Ledger');
  if (!sheet) return {};
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var arcIdCol = headers.indexOf('ArcId');
  var phaseCol = headers.indexOf('Phase');
  var tensionCol = headers.indexOf('Tension');
  
  if (arcIdCol < 0) return {};
  
  var statuses = {};
  
  for (var i = 1; i < data.length; i++) {
    var arcId = data[i][arcIdCol];
    if (arcId) {
      statuses[arcId] = {
        phase: phaseCol >= 0 ? data[i][phaseCol] : 'unknown',
        tension: tensionCol >= 0 ? data[i][tensionCol] : 0
      };
    }
  }
  
  return statuses;
}


/**
 * ============================================================================
 * STORYLINE BRIEFING GENERATOR
 * ============================================================================
 * 
 * Generates storyline section for Media_Briefing.
 * Called by generateMediaBriefing_() to add storyline context.
 */
function generateStorylineBriefingSection_(ss, cycle) {
  
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  var headers = data[0];
  var cols = {
    storylineId: headers.indexOf('StorylineId'),
    type: headers.indexOf('Type'),
    description: headers.indexOf('Description'),
    neighborhood: headers.indexOf('Neighborhood'),
    linkedArc: headers.indexOf('LinkedArc'),
    status: headers.indexOf('Status'),
    lastMentioned: headers.indexOf('LastMentionedCycle'),
    priority: headers.indexOf('Priority')
  };
  
  var lines = [];
  var active = [];
  var dormant = [];
  var wrapUp = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = row[cols.status] || '';
    var priority = row[cols.priority] || 'normal';
    
    var storyline = {
      id: row[cols.storylineId],
      type: row[cols.type],
      description: row[cols.description],
      neighborhood: row[cols.neighborhood],
      linkedArc: row[cols.linkedArc],
      lastMentioned: row[cols.lastMentioned],
      priority: priority
    };
    
    if (status === 'active') {
      active.push(storyline);
    } else if (status === 'dormant') {
      dormant.push(storyline);
    } else if (priority === 'wrap-up') {
      wrapUp.push(storyline);
    }
  }
  
  if (active.length > 0) {
    lines.push('ACTIVE STORYLINES:');
    for (var a = 0; a < active.length; a++) {
      var s = active[a];
      var line = '- [' + s.type + '] ' + s.description;
      if (s.neighborhood) line += ' (' + s.neighborhood + ')';
      if (s.priority === 'high') line += ' ★ HIGH PRIORITY';
      lines.push(line);
    }
    lines.push('');
  }
  
  if (wrapUp.length > 0) {
    lines.push('NEEDS WRAP-UP (linked arc resolved):');
    for (var w = 0; w < wrapUp.length; w++) {
      var s = wrapUp[w];
      lines.push('- [' + s.type + '] ' + s.description + ' — conclude this storyline');
    }
    lines.push('');
  }
  
  if (dormant.length > 0 && dormant.length <= 5) {
    lines.push('DORMANT (consider revisiting):');
    for (var d = 0; d < dormant.length; d++) {
      var s = dormant[d];
      var cyclesSince = cycle - s.lastMentioned;
      lines.push('- [' + s.type + '] ' + s.description + ' (last mentioned ' + cyclesSince + ' cycles ago)');
    }
    lines.push('');
  }
  
  return lines;
}


// ════════════════════════════════════════════════════════════════════════════
// REFERENCE v1.2
// ════════════════════════════════════════════════════════════════════════════
/**
 * STATUS TRANSITIONS:
 * - active → dormant: No coverage for 5+ cycles
 * - active → concluded: Linked arc resolved
 * - dormant → active: Recently mentioned (< 5 cycles)
 * - dormant → abandoned: No coverage for 15+ cycles
 *
 * PRIORITY CHANGES:
 * - normal → high: Linked arc at peak or tension >= 7
 * - any → wrap-up: Linked arc resolved
 *
 * ENGINE INTEGRATION:
 * Add to Phase 6 in godWorldEngine2.gs after processArcLifecycle_(ctx):
 *   updateStorylineStatus_(ctx);
 *
 * v1.2 FIX:
 * Fixed column name mapping to match actual Storyline_Tracker schema:
 * - CycleAdded (not StartCycle)
 * - StorylineType (not Type)
 * - Uses Description for log identification (no StorylineId column)
 *
 * v1.1 FIX:
 * Renamed findCol_ to findColByArray_ to avoid collision with
 * processAdvancementIntake which uses string-based findCol_
 */