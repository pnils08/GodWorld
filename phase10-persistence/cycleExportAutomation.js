/**
 * ============================================================================
 * CYCLE EXPORT AUTOMATION v1.0
 * ============================================================================
 * 
 * Automates export of cycle data to Google Drive text files.
 * 
 * FEATURES:
 * - Exports cycle data as plain text files to Drive folder
 * - Creates individual cycle snapshots: [DataType]_Cycle_[Number].txt
 * - Appends to running mirror files: [DataType]_Mirror_Full.txt
 * - Custom menu for one-click operation
 * - Configurable data sources
 * 
 * INSTALLATION:
 * 1. Open your GodWorld Engine spreadsheet
 * 2. Extensions → Apps Script
 * 3. Paste this entire script
 * 4. Save (Ctrl+S)
 * 5. Refresh the spreadsheet
 * 6. New menu appears: "🌍 GodWorld Exports"
 * 
 * FIRST RUN:
 * - Click any export function
 * - Authorize when prompted
 * - Script creates "GodWorld_Exports" folder in your Drive
 * 
 * ============================================================================
 */

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

var CONFIG = {
  // Spreadsheet ID - now uses openSimSpreadsheet_() from utilities
  // v2.14: Use configured spreadsheet ID
  SPREADSHEET_ID: null, // Legacy - use getSimSpreadsheetId_() instead
  
  // Drive folder name for exports
  EXPORT_FOLDER_NAME: 'GodWorld_Exports',
  
  // Sheets to export (add/remove as needed)
  EXPORT_SHEETS: [
    'Riley_Digest',
    'Storyline_Intake',
    'Citizen_Media_Usage',
    'Citizen_Usage_Intake',
    'Continuity_Intake',
    'Continuity_Loop',
    'Media_Intake',
    'Health_Cause_Queue',
    'Press_Drafts',
    'Dashboard',
    'Sports_Feed',
    'Cycle_Packet',
    'Media_Briefing',
    'WorldEvents_V3_Ledger',
    'WorldEvents_Ledger',
    'NBA_Game_Intake',
    'MLB_Game_Intake',
    'Storyline_Tracker',
    'Story_Hook_Deck',
    'Story_Seed_Deck',
    'Initiative_Tracker',
    'Intake',
    'Advancement_Intake1',
    'LifeHistory_Log',
    'Generic_Citizens',
    'Cultural_Ledger',
    'Chicago_Citizens',
    'Event_Arc_Ledger',
    'Arc_Ledger',
    'Texture_Trigger_Log',
    'Sports_Calendar',
    'Simulation_Calendar',
    'Civic_Sweep_Report',
    'World_Drift_Report',
    'World_Config',
    'World_Population',
    'Simulation_Ledger',
    'Civic_Office_Ledger',
    'Relationship_Bonds',
    'Chicago_Feed',
    'Sports_Feed',
    'Neighborhood_Map',
    'Domain_Tracker',
    'Engine_Index2',
    'Ledger_Index',
    'Continuity_Log'
  ],
  
  // Sheets for running mirrors (append mode)
  MIRROR_SHEETS: [
    'Riley_Digest',
    'World_Population',
    'Continuity_Log'
  ]
};


// ════════════════════════════════════════════════════════════════════════════
// CUSTOM MENU
// ════════════════════════════════════════════════════════════════════════════

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🌍 GodWorld Exports')
    .addItem('📦 Export Current Cycle (All)', 'exportCurrentCycleAll')
    .addSeparator()
    .addItem('📄 Export Riley_Digest', 'exportRileyDigest')
    .addItem('🌐 Export World_Population', 'exportWorldPopulation')
    .addItem('👥 Export Simulation_Ledger', 'exportSimulationLedger')
    .addItem('🔗 Export Continuity_Log', 'exportContinuityLog')
    .addSeparator()
    .addItem('📚 Update All Running Mirrors', 'updateAllMirrors')
    .addItem('🔄 Full Export + Mirror Update', 'fullExportAndMirror')
    .addSeparator()
    .addItem('📁 Open Export Folder', 'openExportFolder')
    .addItem('⚙️ Show Config', 'showConfig')
    .addToUi();
}


// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Export all configured sheets for current cycle
 */
function exportCurrentCycleAll() {
  var ss = openSimSpreadsheet_() // v2.14: Use configured spreadsheet ID;
  var cycle = getCurrentCycle_(ss);
  var folder = getOrCreateExportFolder_();
  
  var exported = [];
  
  for (var i = 0; i < CONFIG.EXPORT_SHEETS.length; i++) {
    var sheetName = CONFIG.EXPORT_SHEETS[i];
    var sheet = ss.getSheetByName(sheetName);
    
    if (sheet) {
      var fileName = sheetName + '_Cycle_' + cycle + '.txt';
      var content = sheetToText_(sheet);
      saveTextFile_(folder, fileName, content);
      exported.push(sheetName);
    }
  }
  
  var msg = 'Exported ' + exported.length + ' sheets for Cycle ' + cycle + ':\n\n' + exported.join('\n');
  showAlert_('Export Complete', msg);
  Logger.log(msg);
}


/**
 * Update all running mirror files (append mode)
 */
function updateAllMirrors() {
  var ss = openSimSpreadsheet_() // v2.14: Use configured spreadsheet ID;
  var cycle = getCurrentCycle_(ss);
  var folder = getOrCreateExportFolder_();
  
  var updated = [];
  
  for (var i = 0; i < CONFIG.MIRROR_SHEETS.length; i++) {
    var sheetName = CONFIG.MIRROR_SHEETS[i];
    var sheet = ss.getSheetByName(sheetName);
    
    if (sheet) {
      var mirrorName = sheetName + '_Mirror_Full.txt';
      var newContent = formatMirrorEntry_(sheetName, cycle, sheet);
      appendToMirror_(folder, mirrorName, newContent);
      updated.push(sheetName);
    }
  }
  
  var msg = 'Updated ' + updated.length + ' mirrors for Cycle ' + cycle + ':\n\n' + updated.join('\n');
  showAlert_('Mirrors Updated', msg);
  Logger.log(msg);
}


/**
 * Full export: individual cycle files + mirror updates
 */
function fullExportAndMirror() {
  exportCurrentCycleAll();
  Utilities.sleep(500);
  updateAllMirrors();
  showAlert_('Full Export Complete', 'Cycle files exported and mirrors updated.');
}


// ════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL SHEET EXPORTS
// ════════════════════════════════════════════════════════════════════════════

function exportRileyDigest() {
  exportSingleSheet_('Riley_Digest');
}

function exportWorldPopulation() {
  exportSingleSheet_('World_Population');
}

function exportSimulationLedger() {
  exportSingleSheet_('Simulation_Ledger');
}

function exportContinuityLog() {
  exportSingleSheet_('Continuity_Log');
}

function exportSingleSheet_(sheetName) {
  var ss = openSimSpreadsheet_() // v2.14: Use configured spreadsheet ID;
  var cycle = getCurrentCycle_(ss);
  var folder = getOrCreateExportFolder_();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    showAlert_('Error', 'Sheet not found: ' + sheetName);
    return;
  }
  
  var fileName = sheetName + '_Cycle_' + cycle + '.txt';
  var content = sheetToText_(sheet);
  saveTextFile_(folder, fileName, content);
  
  showAlert_('Exported', sheetName + ' → ' + fileName);
}


// ════════════════════════════════════════════════════════════════════════════
// CONVERSION HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Convert sheet data to plain text (tab-separated with headers)
 */
function sheetToText_(sheet) {
  var data = sheet.getDataRange().getValues();
  var lines = [];
  
  // Header line
  lines.push('=' .repeat(60));
  lines.push(sheet.getName().toUpperCase());
  lines.push('Exported: ' + new Date().toISOString());
  lines.push('=' .repeat(60));
  lines.push('');
  
  // Data as tab-separated values
  for (var r = 0; r < data.length; r++) {
    var row = data[r];
    var cells = [];
    
    for (var c = 0; c < row.length; c++) {
      var val = row[c];
      
      // Handle different types
      if (val === null || val === undefined) {
        cells.push('');
      } else if (val instanceof Date) {
        cells.push(val.toISOString());
      } else if (typeof val === 'object') {
        cells.push(JSON.stringify(val));
      } else {
        cells.push(String(val));
      }
    }
    
    lines.push(cells.join('\t'));
  }
  
  return lines.join('\n');
}


/**
 * Format a mirror entry with cycle header
 */
function formatMirrorEntry_(sheetName, cycle, sheet) {
  var lines = [];
  
  lines.push('');
  lines.push('#'.repeat(60));
  lines.push('# CYCLE ' + cycle + ' — ' + new Date().toISOString());
  lines.push('#'.repeat(60));
  lines.push('');
  
  // For mirrors, we want a more readable format
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  if (sheetName === 'Riley_Digest' || sheetName === 'World_Population') {
    // Key-value format for state sheets (use last row)
    var lastRow = data[data.length - 1];
    
    for (var i = 0; i < headers.length; i++) {
      var key = headers[i];
      var val = lastRow[i];
      
      if (key && val !== '' && val !== null && val !== undefined) {
        if (val instanceof Date) {
          val = val.toISOString();
        }
        lines.push(key + ': ' + val);
      }
    }
  } else if (sheetName === 'Continuity_Log') {
    // For continuity, get the last entry
    if (data.length > 1) {
      var lastEntry = data[data.length - 1];
      
      for (var j = 0; j < headers.length; j++) {
        var hdr = headers[j];
        var value = lastEntry[j];
        
        if (hdr && value !== '' && value !== null) {
          if (value instanceof Date) {
            value = value.toISOString();
          }
          lines.push(hdr + ': ' + value);
        }
      }
    }
  } else {
    // Full table format for other sheets
    lines.push(sheetToText_(sheet));
  }
  
  return lines.join('\n');
}


// ════════════════════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get or create the export folder
 */
function getOrCreateExportFolder_() {
  var folders = DriveApp.getFoldersByName(CONFIG.EXPORT_FOLDER_NAME);
  
  if (folders.hasNext()) {
    return folders.next();
  }
  
  // Create folder
  var folder = DriveApp.createFolder(CONFIG.EXPORT_FOLDER_NAME);
  Logger.log('Created export folder: ' + CONFIG.EXPORT_FOLDER_NAME);
  return folder;
}


/**
 * Save text content to a file (overwrites if exists)
 */
function saveTextFile_(folder, fileName, content) {
  // Check if file exists
  var files = folder.getFilesByName(fileName);
  
  if (files.hasNext()) {
    // Update existing file
    var file = files.next();
    file.setContent(content);
    Logger.log('Updated: ' + fileName);
  } else {
    // Create new file
    folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
    Logger.log('Created: ' + fileName);
  }
}


/**
 * Append content to a mirror file (creates if doesn't exist)
 */
function appendToMirror_(folder, fileName, newContent) {
  var files = folder.getFilesByName(fileName);
  
  if (files.hasNext()) {
    // Append to existing
    var file = files.next();
    var existing = file.getBlob().getDataAsString();
    file.setContent(existing + '\n' + newContent);
    Logger.log('Appended to: ' + fileName);
  } else {
    // Create new mirror with header
    var header = '=' .repeat(60) + '\n';
    header += fileName.replace('.txt', '').toUpperCase() + '\n';
    header += 'Created: ' + new Date().toISOString() + '\n';
    header += '=' .repeat(60) + '\n';
    
    folder.createFile(fileName, header + newContent, MimeType.PLAIN_TEXT);
    Logger.log('Created mirror: ' + fileName);
  }
}


// ════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get current cycle number from World_Population
 */
function getCurrentCycle_(ss) {
  var sheet = ss.getSheetByName('World_Population');
  if (!sheet) return 0;
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;
  
  var headers = data[0];
  var row = data[1];
  
  var cycleIdx = headers.indexOf('cycle');
  if (cycleIdx < 0) cycleIdx = headers.indexOf('Cycle');
  if (cycleIdx < 0) cycleIdx = headers.indexOf('AbsoluteCycle');
  
  return cycleIdx >= 0 ? (Number(row[cycleIdx]) || 0) : 0;
}


/**
 * Open the export folder in Drive
 */
function openExportFolder() {
  var folder = getOrCreateExportFolder_();
  var url = folder.getUrl();
  
  var html = '<script>window.open("' + url + '", "_blank");google.script.host.close();</script>';
  var userInterface = HtmlService.createHtmlOutput(html)
    .setWidth(100)
    .setHeight(50);
  
  SpreadsheetApp.getUi().showModalDialog(userInterface, 'Opening folder...');
}


/**
 * Show current configuration
 */
function showConfig() {
  var ss = openSimSpreadsheet_() // v2.14: Use configured spreadsheet ID;
  var cycle = getCurrentCycle_(ss);
  
  var msg = 'Current Configuration:\n\n' +
    'Spreadsheet ID: (using openSimSpreadsheet_())\\n' +
    'Export Folder: ' + CONFIG.EXPORT_FOLDER_NAME + '\n' +
    'Current Cycle: ' + cycle + '\n\n' +
    'Export Sheets (' + CONFIG.EXPORT_SHEETS.length + '):\n' + 
    CONFIG.EXPORT_SHEETS.join(', ') + '\n\n' +
    'Mirror Sheets (' + CONFIG.MIRROR_SHEETS.length + '):\n' +
    CONFIG.MIRROR_SHEETS.join(', ');
  
  showAlert_('GodWorld Export Config', msg);
}


/**
 * Show alert (with fallback for trigger context)
 */
function showAlert_(title, message) {
  try {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {
    Logger.log(title + ': ' + message);
  }
}


// ════════════════════════════════════════════════════════════════════════════
// TRIGGER SETUP (Optional - for automatic exports)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create a time-based trigger to auto-export
 * Run this once manually to set up automatic exports
 */
function setupAutoExportTrigger() {
  // Remove existing triggers for this function
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'fullExportAndMirror') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create new trigger - runs every 6 hours
  ScriptApp.newTrigger('fullExportAndMirror')
    .timeBased()
    .everyHours(6)
    .create();
  
  Logger.log('Auto-export trigger created (every 6 hours)');
  showAlert_('Trigger Created', 'Auto-export will run every 6 hours.');
}


/**
 * Remove auto-export trigger
 */
function removeAutoExportTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'fullExportAndMirror') {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  
  showAlert_('Trigger Removed', 'Removed ' + removed + ' auto-export trigger(s).');
}


/**
 * ============================================================================
 * USAGE REFERENCE
 * ============================================================================
 * 
 * MENU OPTIONS:
 * 
 * 📦 Export Current Cycle (All)
 *    - Exports all configured sheets as individual files
 *    - Files named: [SheetName]_Cycle_[Number].txt
 * 
 * 📄 Export [SheetName]
 *    - Export a single sheet
 * 
 * 📚 Update All Running Mirrors
 *    - Appends current cycle data to mirror files
 *    - Files named: [SheetName]_Mirror_Full.txt
 *    - Mirrors grow over time (full history)
 * 
 * 🔄 Full Export + Mirror Update
 *    - Does both: individual cycle files + mirror append
 *    - Recommended for end-of-cycle export
 * 
 * 📁 Open Export Folder
 *    - Opens the Drive folder in a new tab
 * 
 * ⚙️ Show Config
 *    - Displays current settings
 * 
 * FILE STRUCTURE:
 * 
 * GodWorld_Exports/
 * ├── Riley_Digest_Cycle_72.txt      (snapshot)
 * ├── Riley_Digest_Cycle_73.txt      (snapshot)
 * ├── Riley_Digest_Mirror_Full.txt   (running history)
 * ├── World_Population_Cycle_72.txt
 * ├── World_Population_Mirror_Full.txt
 * ├── Simulation_Ledger_Cycle_72.txt
 * └── Continuity_Log_Mirror_Full.txt
 * 
 * CUSTOMIZATION:
 * 
 * Edit CONFIG at top of script to:
 * - Change export folder name
 * - Add/remove sheets from exports
 * - Add/remove sheets from mirrors
 * 
 * ============================================================================
 */