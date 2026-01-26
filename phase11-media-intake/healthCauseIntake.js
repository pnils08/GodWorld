/**
 * ============================================================================
 * HEALTH CAUSE INTAKE v1.1
 * ============================================================================
 *
 * Allows Media Room chat to assign narrative causes to hospitalized citizens.
 * Engine handles mechanics (state transitions), Media Room provides story.
 *
 * WORKFLOW:
 * 1. Engine hospitalizes citizen (generationalEventsEngine)
 * 2. Engine exports pending health cases to Health_Cause_Queue sheet
 * 3. Media Room reviews queue and assigns causes via markdown
 * 4. This script parses intake and updates Simulation_Ledger.HealthCause
 * 5. Engine uses cause in death/recovery descriptions
 *
 * SHEET: Health_Cause_Queue
 * Columns: POPID, Name, Status, StatusStart, Neighborhood, Tier, AssignedCause, MediaCycle
 *
 * v1.1 Changes:
 * - Added normalizeHealthStatus_() to handle all status variants
 * - Recognizes: hospitalized, critical, serious-condition, Serious Condition, injured, Injured
 * - Case-insensitive status matching
 *
 * ============================================================================
 */


// ============================================================
// STATUS NORMALIZATION
// ============================================================

/**
 * Normalizes health status values to handle various formats used in the ledger.
 * Returns a standardized lowercase status or null if not a health status.
 *
 * Recognized health statuses that need cause assignment:
 * - hospitalized, Hospitalized
 * - critical, Critical
 * - serious-condition, Serious Condition, serious condition
 * - injured, Injured
 */
function normalizeHealthStatus_(status) {
  if (!status) return null;

  var s = status.toString().toLowerCase().trim();

  // Direct matches
  if (s === 'hospitalized' || s === 'critical') {
    return s;
  }

  // Handle 'serious-condition' and 'serious condition' variants
  if (s === 'serious-condition' || s === 'serious condition') {
    return 'serious-condition';
  }

  // Handle 'injured'
  if (s === 'injured') {
    return 'injured';
  }

  return null;
}

/**
 * Checks if a status indicates a health condition needing cause assignment.
 */
function isHealthStatusNeedingCause_(status) {
  return normalizeHealthStatus_(status) !== null;
}


// ============================================================
// EXPORT PENDING HEALTH CASES
// ============================================================

/**
 * Exports citizens with health statuses to queue for Media Room assignment.
 * Run this after generationalEventsEngine to populate the queue.
 */
function exportHealthCauseQueue_(ctx) {
  var ss = ctx.ss || SpreadsheetApp.getActiveSpreadsheet();
  var ledger = ss.getSheetByName('Simulation_Ledger');
  if (!ledger) return;
  
  var cycle = ctx.summary ? (ctx.summary.cycleId || ctx.config.cycleCount || 0) : 0;
  
  // Get or create queue sheet
  var queue = ss.getSheetByName('Health_Cause_Queue');
  if (!queue) {
    queue = ss.insertSheet('Health_Cause_Queue');
    queue.appendRow([
      'POPID', 'Name', 'Status', 'StatusStartCycle', 'CyclesSick',
      'Neighborhood', 'Tier', 'Age', 'AssignedCause', 'MediaCycle', 'Processed'
    ]);
    queue.getRange(1, 1, 1, 11).setFontWeight('bold');
  }
  
  var queueData = queue.getDataRange().getValues();
  var queueHeader = queueData[0];
  var existingPopIds = {};
  
  // Build map of existing entries
  var qPopId = queueHeader.indexOf('POPID');
  var qProcessed = queueHeader.indexOf('Processed');
  
  for (var q = 1; q < queueData.length; q++) {
    var pid = queueData[q][qPopId];
    var processed = queueData[q][qProcessed];
    if (pid && processed !== 'YES') {
      existingPopIds[pid] = true;
    }
  }
  
  // Scan ledger for health cases
  var values = ledger.getDataRange().getValues();
  var header = values[0];
  
  var idx = function(n) { return header.indexOf(n); };
  var iPopID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iStatus = idx('Status');
  var iStatusStart = idx('StatusStartCycle');
  var iNeighborhood = idx('Neighborhood');
  var iTier = idx('Tier');
  var iBirthYear = idx('BirthYear');
  var iHealthCause = idx('HealthCause');
  
  var simYear = ctx.summary ? (ctx.summary.simYear || 2040) : 2040;
  var newEntries = [];
  
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var rawStatus = (row[iStatus] || '').toString();
    var normalizedStatus = normalizeHealthStatus_(rawStatus);

    // Only queue citizens with health conditions (hospitalized, critical, serious-condition, injured)
    if (!normalizedStatus) continue;
    
    var popId = row[iPopID];
    var existingCause = iHealthCause >= 0 ? row[iHealthCause] : '';
    
    // Skip if already in queue or has cause
    if (existingPopIds[popId]) continue;
    if (existingCause && existingCause.toString().trim() !== '') continue;
    
    var name = (row[iFirst] + ' ' + row[iLast]).trim();
    var statusStart = iStatusStart >= 0 ? (Number(row[iStatusStart]) || cycle) : cycle;
    var cyclesSick = cycle - statusStart;
    var neighborhood = iNeighborhood >= 0 ? row[iNeighborhood] : '';
    var tier = iTier >= 0 ? row[iTier] : '';
    var birthYear = iBirthYear >= 0 ? Number(row[iBirthYear]) : 0;
    var age = birthYear ? (simYear - birthYear) : 'unknown';
    
    newEntries.push([
      popId,
      name,
      normalizedStatus,  // Use normalized status for consistency
      statusStart,
      cyclesSick,
      neighborhood,
      tier,
      age,
      '',  // AssignedCause - to be filled by Media Room
      '',  // MediaCycle - when cause was assigned
      ''   // Processed
    ]);
  }
  
  // Append new entries
  if (newEntries.length > 0) {
    queue.getRange(queue.getLastRow() + 1, 1, newEntries.length, 11).setValues(newEntries);
  }
  
  Logger.log('exportHealthCauseQueue_: Added ' + newEntries.length + ' new cases to queue');
  
  return newEntries.length;
}


// ============================================================
// PARSE MEDIA ROOM CAUSE ASSIGNMENTS
// ============================================================

/**
 * Parses markdown from Media Room assigning health causes.
 * 
 * Expected format:
 * ```
 * ## Health Cause Assignments
 * 
 * - **Marcus Osei** (OAK-00042): Complications from a car accident on I-880
 * - **Diana Crane** (OAK-00156): Severe pneumonia following flu complications
 * ```
 * 
 * OR table format:
 * ```
 * | POPID | Cause |
 * |-------|-------|
 * | OAK-00042 | Complications from a car accident on I-880 |
 * | OAK-00156 | Severe pneumonia following flu complications |
 * ```
 */
function parseHealthCauseMarkdown_(markdown) {
  var assignments = [];
  
  if (!markdown || typeof markdown !== 'string') {
    return assignments;
  }
  
  var lines = markdown.split('\n');
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    
    // Try bullet format: - **Name** (POPID): Cause
    var bulletMatch = line.match(/^[-*]\s*\*?\*?([^*]+)\*?\*?\s*\(([A-Z]{2,4}-\d+)\)\s*:\s*(.+)$/i);
    if (bulletMatch) {
      assignments.push({
        name: bulletMatch[1].trim(),
        popId: bulletMatch[2].trim().toUpperCase(),
        cause: bulletMatch[3].trim()
      });
      continue;
    }
    
    // Try simple bullet: - POPID: Cause
    var simpleBullet = line.match(/^[-*]\s*([A-Z]{2,4}-\d+)\s*:\s*(.+)$/i);
    if (simpleBullet) {
      assignments.push({
        popId: simpleBullet[1].trim().toUpperCase(),
        cause: simpleBullet[2].trim()
      });
      continue;
    }
    
    // Try table row: | POPID | Cause |
    var tableMatch = line.match(/^\|\s*([A-Z]{2,4}-\d+)\s*\|\s*(.+?)\s*\|?$/i);
    if (tableMatch) {
      var cause = tableMatch[2].trim();
      // Skip header rows
      if (cause.toLowerCase() === 'cause' || cause.match(/^[-:]+$/)) continue;
      
      assignments.push({
        popId: tableMatch[1].trim().toUpperCase(),
        cause: cause
      });
      continue;
    }
  }
  
  return assignments;
}


// ============================================================
// PROCESS INTAKE AND UPDATE LEDGER
// ============================================================

/**
 * Main intake processor. Reads from Health_Cause_Intake sheet or accepts markdown directly.
 */
function processHealthCauseIntake_(ctx, markdownInput) {
  var ss = ctx.ss || SpreadsheetApp.getActiveSpreadsheet();
  var cycle = ctx.summary ? (ctx.summary.cycleId || ctx.config.cycleCount || 0) : 0;
  
  var markdown = markdownInput;
  
  // If no markdown provided, check intake sheet
  if (!markdown) {
    var intake = ss.getSheetByName('Health_Cause_Intake');
    if (intake) {
      var intakeData = intake.getDataRange().getValues();
      // Expect markdown in A2
      if (intakeData.length > 1 && intakeData[1][0]) {
        markdown = intakeData[1][0].toString();
      }
    }
  }
  
  if (!markdown) {
    Logger.log('processHealthCauseIntake_: No intake data found');
    return { processed: 0, errors: [] };
  }
  
  var assignments = parseHealthCauseMarkdown_(markdown);
  
  if (assignments.length === 0) {
    Logger.log('processHealthCauseIntake_: No valid assignments parsed');
    return { processed: 0, errors: ['No valid assignments found in markdown'] };
  }
  
  // Update Simulation_Ledger
  var ledger = ss.getSheetByName('Simulation_Ledger');
  if (!ledger) {
    return { processed: 0, errors: ['Simulation_Ledger not found'] };
  }
  
  var values = ledger.getDataRange().getValues();
  var header = values[0];
  
  var iPopID = header.indexOf('POPID');
  var iHealthCause = header.indexOf('HealthCause');
  
  // Add HealthCause column if missing
  if (iHealthCause < 0) {
    ledger.getRange(1, header.length + 1).setValue('HealthCause');
    iHealthCause = header.length;
    // Extend all rows
    for (var r = 1; r < values.length; r++) {
      values[r].push('');
    }
  }
  
  var processed = 0;
  var errors = [];
  var updated = [];
  
  // Build POPID to row index map
  var popIdMap = {};
  for (var r = 1; r < values.length; r++) {
    var pid = values[r][iPopID];
    if (pid) {
      popIdMap[pid.toString().toUpperCase()] = r;
    }
  }
  
  // Apply assignments
  for (var a = 0; a < assignments.length; a++) {
    var assignment = assignments[a];
    var popId = assignment.popId.toUpperCase();
    
    var rowIdx = popIdMap[popId];
    if (rowIdx === undefined) {
      errors.push('POPID not found: ' + popId);
      continue;
    }
    
    values[rowIdx][iHealthCause] = assignment.cause;
    updated.push(rowIdx);
    processed++;
  }
  
  // Write back to ledger
  if (updated.length > 0) {
    ledger.getRange(1, 1, values.length, values[0].length).setValues(values);
  }
  
  // Update queue sheet
  updateHealthCauseQueue_(ss, assignments, cycle);
  
  // Clear intake sheet
  var intake = ss.getSheetByName('Health_Cause_Intake');
  if (intake && intake.getLastRow() > 1) {
    intake.getRange(2, 1, intake.getLastRow() - 1, 1).clearContent();
  }
  
  Logger.log('processHealthCauseIntake_: Processed ' + processed + ' assignments, ' + errors.length + ' errors');
  
  return {
    processed: processed,
    errors: errors,
    assignments: assignments
  };
}


/**
 * Updates the Health_Cause_Queue sheet with processed assignments.
 */
function updateHealthCauseQueue_(ss, assignments, cycle) {
  var queue = ss.getSheetByName('Health_Cause_Queue');
  if (!queue) return;
  
  var data = queue.getDataRange().getValues();
  var header = data[0];
  
  var qPopId = header.indexOf('POPID');
  var qCause = header.indexOf('AssignedCause');
  var qMediaCycle = header.indexOf('MediaCycle');
  var qProcessed = header.indexOf('Processed');
  
  if (qPopId < 0 || qCause < 0) return;
  
  // Build assignment map
  var assignmentMap = {};
  for (var a = 0; a < assignments.length; a++) {
    assignmentMap[assignments[a].popId.toUpperCase()] = assignments[a].cause;
  }
  
  var updated = false;
  
  for (var r = 1; r < data.length; r++) {
    var popId = data[r][qPopId];
    if (!popId) continue;
    
    var cause = assignmentMap[popId.toString().toUpperCase()];
    if (cause) {
      data[r][qCause] = cause;
      if (qMediaCycle >= 0) data[r][qMediaCycle] = cycle;
      if (qProcessed >= 0) data[r][qProcessed] = 'YES';
      updated = true;
    }
  }
  
  if (updated) {
    queue.getRange(1, 1, data.length, data[0].length).setValues(data);
  }
}


// ============================================================
// GENERATE MEDIA ROOM BRIEFING
// ============================================================

/**
 * Generates a briefing for Media Room about pending health cases.
 * Include in cycle packet or separate briefing.
 */
function generateHealthCauseBriefing_(ctx) {
  var ss = ctx.ss || SpreadsheetApp.getActiveSpreadsheet();
  var queue = ss.getSheetByName('Health_Cause_Queue');
  
  if (!queue) {
    return {
      hasPendingCases: false,
      markdown: ''
    };
  }
  
  var data = queue.getDataRange().getValues();
  var header = data[0];
  
  var qPopId = header.indexOf('POPID');
  var qName = header.indexOf('Name');
  var qStatus = header.indexOf('Status');
  var qCyclesSick = header.indexOf('CyclesSick');
  var qNeighborhood = header.indexOf('Neighborhood');
  var qTier = header.indexOf('Tier');
  var qAge = header.indexOf('Age');
  var qCause = header.indexOf('AssignedCause');
  var qProcessed = header.indexOf('Processed');
  
  var pendingCases = [];
  
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var processed = qProcessed >= 0 ? row[qProcessed] : '';
    var cause = qCause >= 0 ? row[qCause] : '';
    
    // Skip already processed
    if (processed === 'YES' || (cause && cause.toString().trim() !== '')) continue;
    
    pendingCases.push({
      popId: row[qPopId],
      name: row[qName],
      status: row[qStatus],
      cyclesSick: row[qCyclesSick],
      neighborhood: row[qNeighborhood],
      tier: row[qTier],
      age: row[qAge]
    });
  }
  
  if (pendingCases.length === 0) {
    return {
      hasPendingCases: false,
      markdown: ''
    };
  }
  
  // Generate markdown briefing
  var md = '## Pending Health Cause Assignments\n\n';
  md += 'The following citizens are hospitalized or in critical condition and need narrative causes assigned:\n\n';
  md += '| POPID | Name | Status | Cycles | Neighborhood | Tier | Age |\n';
  md += '|-------|------|--------|--------|--------------|------|-----|\n';
  
  for (var i = 0; i < pendingCases.length; i++) {
    var c = pendingCases[i];
    md += '| ' + c.popId + ' | ' + c.name + ' | ' + c.status + ' | ' + c.cyclesSick;
    md += ' | ' + c.neighborhood + ' | ' + c.tier + ' | ' + c.age + ' |\n';
  }
  
  md += '\n### Response Format\n\n';
  md += 'Please assign causes using this format:\n\n';
  md += '```\n';
  md += '## Health Cause Assignments\n\n';
  md += '- **' + pendingCases[0].name + '** (' + pendingCases[0].popId + '): [describe cause here]\n';
  if (pendingCases.length > 1) {
    md += '- **' + pendingCases[1].name + '** (' + pendingCases[1].popId + '): [describe cause here]\n';
  }
  md += '```\n\n';
  md += 'Causes should be specific and narratively interesting. Examples:\n';
  md += '- "Complications from a car accident on I-880"\n';
  md += '- "Severe pneumonia following flu complications"\n';
  md += '- "Heart attack during morning jog"\n';
  md += '- "Injuries sustained in warehouse fire"\n';
  
  return {
    hasPendingCases: true,
    pendingCount: pendingCases.length,
    cases: pendingCases,
    markdown: md
  };
}


// ============================================================
// STANDALONE RUNNERS
// ============================================================

/**
 * Manual trigger to export queue.
 */
function runExportHealthCauseQueue() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = { ss: ss, summary: {}, config: {} };
  var count = exportHealthCauseQueue_(ctx);
  SpreadsheetApp.getUi().alert('Exported ' + count + ' cases to Health_Cause_Queue');
}

/**
 * Manual trigger to process intake.
 */
function runProcessHealthCauseIntake() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = { ss: ss, summary: {}, config: {} };
  var result = processHealthCauseIntake_(ctx);
  SpreadsheetApp.getUi().alert(
    'Processed: ' + result.processed + '\nErrors: ' + result.errors.join(', ')
  );
}

/**
 * Manual trigger to generate briefing.
 */
function runGenerateHealthBriefing() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ctx = { ss: ss };
  var briefing = generateHealthCauseBriefing_(ctx);
  
  if (briefing.hasPendingCases) {
    Logger.log(briefing.markdown);
    SpreadsheetApp.getUi().alert(
      'Found ' + briefing.pendingCount + ' pending cases. Check logs for markdown.'
    );
  } else {
    SpreadsheetApp.getUi().alert('No pending health cases.');
  }
}


/**
 * ============================================================================
 * HEALTH CAUSE INTAKE REFERENCE v1.1
 * ============================================================================
 *
 * WORKFLOW:
 *
 * 1. Engine runs → citizen hospitalized → no cause assigned
 * 2. exportHealthCauseQueue_() → adds to Health_Cause_Queue sheet
 * 3. generateHealthCauseBriefing_() → creates markdown for Media Room
 * 4. Media Room responds with cause assignments
 * 5. processHealthCauseIntake_() → updates Simulation_Ledger.HealthCause
 * 6. Next engine run → uses cause in death/recovery descriptions
 *
 * RECOGNIZED HEALTH STATUSES (v1.1):
 *
 * | Input Value | Normalized To |
 * |-------------|---------------|
 * | hospitalized, Hospitalized | hospitalized |
 * | critical, Critical | critical |
 * | serious-condition, Serious Condition | serious-condition |
 * | injured, Injured | injured |
 *
 * SHEETS:
 *
 * Health_Cause_Queue:
 * - POPID, Name, Status, StatusStartCycle, CyclesSick
 * - Neighborhood, Tier, Age, AssignedCause, MediaCycle, Processed
 *
 * Health_Cause_Intake:
 * - Column A: Raw markdown from Media Room
 *
 * MARKDOWN FORMATS ACCEPTED:
 *
 * Bullet format:
 * - **Name** (POPID): Cause description
 * - POPID: Cause description
 *
 * Table format:
 * | POPID | Cause |
 * |-------|-------|
 * | OAK-00042 | Cause description |
 *
 * INTEGRATION WITH CYCLE:
 *
 * Add to godWorldEngine2.gs after generationalEventsEngine:
 *
 *   exportHealthCauseQueue_(ctx);
 *
 *   // Include in cycle packet
 *   var healthBriefing = generateHealthCauseBriefing_(ctx);
 *   if (healthBriefing.hasPendingCases) {
 *     ctx.summary.healthCauseBriefing = healthBriefing.markdown;
 *   }
 *
 * Add to mediaRoomIntake processing:
 *
 *   processHealthCauseIntake_(ctx, intakeMarkdown);
 *
 * ============================================================================
 */