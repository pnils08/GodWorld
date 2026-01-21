/**
 * ============================================================================
 * MEDIA INTAKE PROCESSOR v2.1
 * ============================================================================
 * 
 * Processes all four Media Room intake sheets:
 * 1. Media_Intake → Cultural_Ledger + Media_Ledger (fame updates)
 * 2. Storyline_Intake → Storyline_Tracker (storyline persistence)
 * 3. Citizen_Usage_Intake → Simulation_Ledger (media appearances)
 * 4. Continuity_Intake → Continuity_Loop (notes for future cycles)
 * 
 * INTEGRATES WITH: parseMediaIntake_v2.1
 * When article text is present, calls parseMediaIntake_() to extract
 * cultural entities and register them via registerCulturalEntity_().
 * 
 * FAME SCORE ADJUSTMENTS:
 * - Article mention (any):        +1 fame
 * - Front page feature:           +5 fame
 * - Profile piece:                +10 fame
 * - Negative coverage:            -2 fame
 * - Repeated coverage (3+ cycle): +3 fame bonus
 * 
 * INTEGRATION:
 * Add to Phase 5 or Phase 8 in runWorldCycle():
 *   processMediaIntake_(ctx);
 * 
 * ============================================================================
 */


/**
 * Main function — process all intake sheets
 */
function processMediaIntake_(ctx) {
  
  var ss = ctx.ss;
  var cycle = ctx.config.cycleCount || 0;
  
  Logger.log('processMediaIntake_ v2.1: Starting intake processing for cycle ' + cycle);
  
  var results = {
    mediaIntake: 0,
    storylineIntake: 0,
    citizenUsage: 0,
    continuityNotes: 0,
    culturalEntities: 0
  };
  
  // Process each intake sheet
  results.mediaIntake = processMediaIntakeSheet_(ss, ctx, cycle);
  results.storylineIntake = processStorylineIntake_(ss, cycle);
  results.citizenUsage = processCitizenUsageIntake_(ss, cycle);
  results.continuityNotes = processContinuityIntake_(ss, cycle);
  
  // Store results in context
  ctx.summary.intakeProcessed = results;
  
  Logger.log('processMediaIntake_ v2.1: Complete. ' + 
    'Media: ' + results.mediaIntake + 
    ', Cultural: ' + results.culturalEntities +
    ', Storylines: ' + results.storylineIntake + 
    ', Citizens: ' + results.citizenUsage + 
    ', Continuity: ' + results.continuityNotes);
  
  return results;
}


/**
 * ============================================================================
 * MEDIA_INTAKE PROCESSING
 * ============================================================================
 * 
 * Schema: Cycle | Section | Headline | Journalist | CitizensMentioned | 
 *         ArticleType | Sentiment | ArticleText | Processed
 * 
 * Updates Cultural_Ledger fame scores based on coverage.
 * Calls parseMediaIntake_() when ArticleText present.
 */
function processMediaIntakeSheet_(ss, ctx, cycle) {
  
  var sheet = ss.getSheetByName('Media_Intake');
  if (!sheet) {
    Logger.log('processMediaIntakeSheet_: No Media_Intake sheet found');
    return 0;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  
  var headers = data[0];
  var cols = {
    cycle: findColIntake_(headers, ['Cycle']),
    section: findColIntake_(headers, ['Section']),
    headline: findColIntake_(headers, ['Headline']),
    journalist: findColIntake_(headers, ['Journalist']),
    citizens: findColIntake_(headers, ['CitizensMentioned', 'Citizens']),
    articleType: findColIntake_(headers, ['ArticleType', 'Type']),
    sentiment: findColIntake_(headers, ['Sentiment']),
    articleText: findColIntake_(headers, ['ArticleText', 'Text', 'Content']),
    processed: findColIntake_(headers, ['Processed'])
  };
  
  // Load Cultural_Ledger for fame updates
  var culturalLedger = loadCulturalLedger_(ss);
  var mediaLedger = ensureMediaLedger_(ss);
  
  var processedCount = 0;
  var culturalCount = 0;
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    // Skip already processed rows
    if (row[cols.processed] === 'yes' || row[cols.processed] === true) continue;
    
    // Skip empty rows
    if (!row[cols.headline] && !row[cols.citizens] && !row[cols.articleText]) continue;
    
    var rowCycle = row[cols.cycle] || cycle;
    var section = row[cols.section] || '';
    var headline = row[cols.headline] || '';
    var journalist = row[cols.journalist] || '';
    var citizensRaw = row[cols.citizens] || '';
    var articleType = row[cols.articleType] || 'mention';
    var sentiment = row[cols.sentiment] || 'neutral';
    var articleText = cols.articleText >= 0 ? row[cols.articleText] : '';
    
    // ═══════════════════════════════════════════════════════════
    // INTEGRATION: Call parseMediaIntake_ if article text exists
    // ═══════════════════════════════════════════════════════════
    if (articleText && typeof parseMediaIntake_ === 'function') {
      try {
        var parseResult = parseMediaIntake_(ctx, articleText);
        
        // parseMediaIntake_ already calls registerCulturalEntity_
        // Just track what was found
        if (parseResult.journalist) {
          journalist = parseResult.journalist;
        }
        
        // Add parsed names to citizens list
        if (parseResult.names && parseResult.names.length > 0) {
          var existingCitizens = parseCitizenList_(citizensRaw);
          for (var n = 0; n < parseResult.names.length; n++) {
            if (existingCitizens.indexOf(parseResult.names[n]) === -1) {
              existingCitizens.push(parseResult.names[n]);
            }
          }
          citizensRaw = existingCitizens.join(', ');
          culturalCount += parseResult.entries ? parseResult.entries.length : 0;
        }
        
        Logger.log('processMediaIntakeSheet_: Parsed article, found ' + 
          (parseResult.names ? parseResult.names.length : 0) + ' cultural entities');
          
      } catch (e) {
        Logger.log('processMediaIntakeSheet_: parseMediaIntake_ error: ' + e.message);
      }
    }
    
    // Parse citizens mentioned (manual list or from parse)
    var citizens = parseCitizenList_(citizensRaw);
    
    // Calculate fame adjustment based on article type
    var fameAdjust = getFameAdjustment_(section, articleType, sentiment);
    
    // Update Cultural_Ledger for each citizen
    for (var c = 0; c < citizens.length; c++) {
      var citizenName = citizens[c];
      updateCitizenFame_(culturalLedger, citizenName, fameAdjust, rowCycle);
    }
    
    // Log to Media_Ledger
    if (mediaLedger && (citizens.length > 0 || headline)) {
      mediaLedger.appendRow([
        new Date(),
        rowCycle,
        journalist,
        citizens.join(', '),
        headline,
        section,
        articleType,
        fameAdjust
      ]);
    }
    
    // Mark as processed
    if (cols.processed >= 0) {
      sheet.getRange(i + 1, cols.processed + 1).setValue('yes');
    }
    
    processedCount++;
  }
  
  // Save Cultural_Ledger updates
  if (processedCount > 0) {
    saveCulturalLedger_(ss, culturalLedger);
  }
  
  // Store cultural count in context
  if (ctx.summary && ctx.summary.intakeProcessed) {
    ctx.summary.intakeProcessed.culturalEntities = culturalCount;
  }
  
  Logger.log('processMediaIntakeSheet_: Processed ' + processedCount + ' articles, ' + culturalCount + ' cultural entities');
  return processedCount;
}


/**
 * Get fame adjustment based on article type and placement
 */
function getFameAdjustment_(section, articleType, sentiment) {
  var base = 1;  // Default mention
  
  // Section bonuses
  if (section === 'Front Page' || section === 'FRONT PAGE') {
    base = 5;
  }
  
  // Article type adjustments
  if (articleType === 'profile' || articleType === 'feature') {
    base = 10;
  } else if (articleType === 'brief' || articleType === 'ticker') {
    base = 1;
  } else if (articleType === 'investigation') {
    base = 7;
  }
  
  // Sentiment adjustments
  if (sentiment === 'negative' || sentiment === 'critical') {
    base = -2;
  } else if (sentiment === 'positive' || sentiment === 'praise') {
    base += 2;
  }
  
  return base;
}


/**
 * ============================================================================
 * STORYLINE_INTAKE PROCESSING
 * ============================================================================
 * 
 * Schema: Cycle | StorylineType | Description | Neighborhood | LinkedArc | 
 *         Status | Processed
 * 
 * Creates/updates Storyline_Tracker entries.
 */
function processStorylineIntake_(ss, cycle) {
  
  var sheet = ss.getSheetByName('Storyline_Intake');
  if (!sheet) {
    Logger.log('processStorylineIntake_: No Storyline_Intake sheet found');
    return 0;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  
  var headers = data[0];
  var cols = {
    cycle: findColIntake_(headers, ['Cycle']),
    type: findColIntake_(headers, ['StorylineType', 'Type']),
    description: findColIntake_(headers, ['Description']),
    neighborhood: findColIntake_(headers, ['Neighborhood']),
    linkedArc: findColIntake_(headers, ['LinkedArc', 'ArcId']),
    status: findColIntake_(headers, ['Status']),
    processed: findColIntake_(headers, ['Processed'])
  };
  
  // Get or create Storyline_Tracker
  var tracker = ensureStorylineTracker_(ss);
  
  var processedCount = 0;
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    if (row[cols.processed] === 'yes' || row[cols.processed] === true) continue;
    if (!row[cols.description]) continue;
    
    var storylineId = 'SL-' + cycle + '-' + generateShortId_();
    
    tracker.appendRow([
      storylineId,
      row[cols.cycle] || cycle,
      row[cols.type] || 'developing',
      row[cols.description] || '',
      row[cols.neighborhood] || '',
      row[cols.linkedArc] || '',
      '',  // LinkedCitizens
      row[cols.status] || 'active',
      cycle,  // LastMentionedCycle
      1,      // MentionCount
      'normal'  // Priority
    ]);
    
    if (cols.processed >= 0) {
      sheet.getRange(i + 1, cols.processed + 1).setValue('yes');
    }
    
    processedCount++;
  }
  
  Logger.log('processStorylineIntake_: Processed ' + processedCount + ' storylines');
  return processedCount;
}


/**
 * ============================================================================
 * CITIZEN_USAGE_INTAKE PROCESSING
 * ============================================================================
 * 
 * Schema: Cycle | CitizenName | UsageType | Article | Journalist | Processed
 * 
 * Updates Simulation_Ledger with media appearance counts.
 */
function processCitizenUsageIntake_(ss, cycle) {
  
  var sheet = ss.getSheetByName('Citizen_Usage_Intake');
  if (!sheet) {
    Logger.log('processCitizenUsageIntake_: No Citizen_Usage_Intake sheet found');
    return 0;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  
  var headers = data[0];
  var cols = {
    cycle: findColIntake_(headers, ['Cycle']),
    citizenName: findColIntake_(headers, ['CitizenName', 'Name', 'Citizen']),
    usageType: findColIntake_(headers, ['UsageType', 'Type']),
    article: findColIntake_(headers, ['Article', 'Headline']),
    journalist: findColIntake_(headers, ['Journalist']),
    processed: findColIntake_(headers, ['Processed'])
  };
  
  // Load Simulation_Ledger
  var ledgerSheet = ss.getSheetByName('Simulation_Ledger');
  if (!ledgerSheet) {
    Logger.log('processCitizenUsageIntake_: No Simulation_Ledger found');
    return 0;
  }
  
  var ledgerData = ledgerSheet.getDataRange().getValues();
  var ledgerHeaders = ledgerData[0];
  var nameCol = findColIntake_(ledgerHeaders, ['Name', 'name', 'CitizenName']);
  var mediaAppCol = findColIntake_(ledgerHeaders, ['MediaAppearances', 'mediaAppearances']);
  var lastMediaCol = findColIntake_(ledgerHeaders, ['LastMediaCycle', 'lastMediaCycle']);
  
  // Build citizen row lookup
  var citizenRows = {};
  for (var l = 1; l < ledgerData.length; l++) {
    var name = ledgerData[l][nameCol];
    if (name) citizenRows[name] = l + 1;  // 1-indexed row
  }
  
  var processedCount = 0;
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    if (row[cols.processed] === 'yes' || row[cols.processed] === true) continue;
    if (!row[cols.citizenName]) continue;
    
    var citizenName = row[cols.citizenName];
    var rowNum = citizenRows[citizenName];
    
    if (rowNum && mediaAppCol >= 0) {
      var currentCount = ledgerSheet.getRange(rowNum, mediaAppCol + 1).getValue() || 0;
      ledgerSheet.getRange(rowNum, mediaAppCol + 1).setValue(currentCount + 1);
      
      if (lastMediaCol >= 0) {
        ledgerSheet.getRange(rowNum, lastMediaCol + 1).setValue(cycle);
      }
    }
    
    if (cols.processed >= 0) {
      sheet.getRange(i + 1, cols.processed + 1).setValue('yes');
    }
    
    processedCount++;
  }
  
  Logger.log('processCitizenUsageIntake_: Processed ' + processedCount + ' citizen usages');
  return processedCount;
}


/**
 * ============================================================================
 * CONTINUITY_INTAKE PROCESSING
 * ============================================================================
 * 
 * Schema: Cycle | NoteType | Description | RelatedArc | Neighborhood | Processed
 * 
 * Stores continuity notes for future cycle reference.
 */
function processContinuityIntake_(ss, cycle) {
  
  var sheet = ss.getSheetByName('Continuity_Intake');
  if (!sheet) {
    Logger.log('processContinuityIntake_: No Continuity_Intake sheet found');
    return 0;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  
  var headers = data[0];
  var cols = {
    cycle: findColIntake_(headers, ['Cycle']),
    noteType: findColIntake_(headers, ['NoteType', 'Type']),
    description: findColIntake_(headers, ['Description', 'Note']),
    relatedArc: findColIntake_(headers, ['RelatedArc', 'ArcId']),
    neighborhood: findColIntake_(headers, ['Neighborhood']),
    processed: findColIntake_(headers, ['Processed'])
  };
  
  // Get or create Continuity_Loop
  var loopSheet = ensureContinuityLoop_(ss);
  
  var processedCount = 0;
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    if (row[cols.processed] === 'yes' || row[cols.processed] === true) continue;
    if (!row[cols.description]) continue;
    
    var noteId = 'CN-' + cycle + '-' + generateShortId_();
    
    loopSheet.appendRow([
      noteId,
      row[cols.cycle] || cycle,
      row[cols.noteType] || 'note',
      row[cols.description] || '',
      row[cols.relatedArc] || '',
      row[cols.neighborhood] || '',
      'active'  // Status
    ]);
    
    if (cols.processed >= 0) {
      sheet.getRange(i + 1, cols.processed + 1).setValue('yes');
    }
    
    processedCount++;
  }
  
  Logger.log('processContinuityIntake_: Processed ' + processedCount + ' continuity notes');
  return processedCount;
}


// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (namespaced to avoid collisions with parseMediaIntake_)
// ════════════════════════════════════════════════════════════════════════════

function findColIntake_(headers, names) {
  for (var i = 0; i < names.length; i++) {
    var idx = headers.indexOf(names[i]);
    if (idx >= 0) return idx;
  }
  return -1;
}


function parseCitizenList_(raw) {
  if (!raw) return [];
  var str = String(raw);
  // Split by comma, semicolon, or newline
  var parts = str.split(/[,;\n]+/);
  var result = [];
  for (var i = 0; i < parts.length; i++) {
    var name = parts[i].trim();
    if (name) result.push(name);
  }
  return result;
}


function generateShortId_() {
  var chars = '0123456789ABCDEF';
  var id = '';
  for (var i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * 16)];
  }
  return id;
}


function loadCulturalLedger_(ss) {
  var sheet = ss.getSheetByName('Cultural_Ledger');
  if (!sheet) return {};
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var nameCol = findColIntake_(headers, ['Name', 'name']);
  var fameCol = findColIntake_(headers, ['FameScore', 'fameScore', 'Fame']);
  var mediaCountCol = findColIntake_(headers, ['MediaCount', 'mediaCount']);
  
  var ledger = {
    sheet: sheet,
    nameCol: nameCol,
    fameCol: fameCol,
    mediaCountCol: mediaCountCol,
    rows: {}
  };
  
  for (var i = 1; i < data.length; i++) {
    var name = data[i][nameCol];
    if (name) {
      ledger.rows[name] = {
        row: i + 1,
        fame: data[i][fameCol] || 0,
        mediaCount: data[i][mediaCountCol] || 0
      };
    }
  }
  
  return ledger;
}


function updateCitizenFame_(ledger, citizenName, adjustment, cycle) {
  if (!ledger.rows[citizenName]) return;
  
  var citizen = ledger.rows[citizenName];
  citizen.fame = (citizen.fame || 0) + adjustment;
  citizen.mediaCount = (citizen.mediaCount || 0) + 1;
  citizen.updated = true;
}


function saveCulturalLedger_(ss, ledger) {
  if (!ledger.sheet) return;
  
  for (var name in ledger.rows) {
    var citizen = ledger.rows[name];
    if (citizen.updated) {
      if (ledger.fameCol >= 0) {
        ledger.sheet.getRange(citizen.row, ledger.fameCol + 1).setValue(citizen.fame);
      }
      if (ledger.mediaCountCol >= 0) {
        ledger.sheet.getRange(citizen.row, ledger.mediaCountCol + 1).setValue(citizen.mediaCount);
      }
    }
  }
}


function ensureMediaLedger_(ss) {
  var sheet = ss.getSheetByName('Media_Ledger');
  if (!sheet) {
    sheet = ss.insertSheet('Media_Ledger');
    sheet.appendRow([
      'Timestamp', 'Cycle', 'Journalist', 'Citizens', 
      'Headline', 'Section', 'ArticleType', 'FameAdjust'
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}


function ensureStorylineTracker_(ss) {
  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) {
    sheet = ss.insertSheet('Storyline_Tracker');
    sheet.appendRow([
      'StorylineId', 'StartCycle', 'Type', 'Description', 
      'Neighborhood', 'LinkedArc', 'LinkedCitizens', 'Status',
      'LastMentionedCycle', 'MentionCount', 'Priority'
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}


function ensureContinuityLoop_(ss) {
  var sheet = ss.getSheetByName('Continuity_Loop');
  if (!sheet) {
    sheet = ss.insertSheet('Continuity_Loop');
    sheet.appendRow([
      'NoteId', 'Cycle', 'Type', 'Description', 
      'RelatedArc', 'Neighborhood', 'Status'
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}