/**
 * ============================================================================
 * CONTINUITY NOTES PARSER v1.0
 * ============================================================================
 * 
 * Parses free-form Media Room continuity notes into structured intake rows.
 * 
 * Media Room outputs text like:
 *   Stadium: 35,000 (42,000 expanded)
 *   Total Investment: $2.8 billion
 *   - C74: Planning Committee
 *   - Year 3 Q2: Construction Start
 * 
 * Parser converts to Continuity_Intake rows:
 *   | NoteType | Description | RelatedArc | AffectedCitizens | Status |
 * 
 * USAGE:
 * 1. Paste raw continuity text into "Raw_Continuity_Paste" sheet (column A)
 * 2. Put the arc name in cell B1 (e.g., "Baylight Development")
 * 3. Run parseContinuityNotes()
 * 4. Review Continuity_Intake, then run processMediaIntakeV2()
 * 
 * ============================================================================
 */

/**
 * Main parser function
 */
function parseContinuityNotes() {
  var ss = openSimSpreadsheet_();  // v2.14: Use configured spreadsheet ID
  
  // Get raw paste sheet
  var rawSheet = ss.getSheetByName('Raw_Continuity_Paste');
  if (!rawSheet) {
    SpreadsheetApp.getUi().alert('Create a sheet named "Raw_Continuity_Paste" and paste the continuity notes in column A.\nPut the arc name in cell B1.');
    return;
  }
  
  var data = rawSheet.getDataRange().getValues();
  if (data.length < 1) {
    SpreadsheetApp.getUi().alert('No data found in Raw_Continuity_Paste');
    return;
  }
  
  // Get arc name from B1 (or default)
  var arcName = (data[0][1] || '').toString().trim() || 'Unknown Arc';
  
  // Collect all text lines
  var lines = [];
  for (var i = 0; i < data.length; i++) {
    var line = (data[i][0] || '').toString().trim();
    if (line && line.length > 0) {
      lines.push(line);
    }
  }
  
  if (lines.length === 0) {
    SpreadsheetApp.getUi().alert('No content found in column A');
    return;
  }
  
  // Parse lines into structured notes
  var parsedNotes = parseLines_(lines, arcName);
  
  if (parsedNotes.length === 0) {
    SpreadsheetApp.getUi().alert('Could not parse any notes from the content');
    return;
  }
  
  // Write to Continuity_Intake
  var intakeSheet = ss.getSheetByName('Continuity_Intake');
  if (!intakeSheet) {
    intakeSheet = ss.insertSheet('Continuity_Intake');
    intakeSheet.appendRow(['NoteType', 'Description', 'RelatedArc', 'AffectedCitizens', 'Status']);
    intakeSheet.setFrozenRows(1);
  }
  
  var rows = [];
  for (var j = 0; j < parsedNotes.length; j++) {
    var note = parsedNotes[j];
    rows.push([
      note.noteType,
      note.description,
      note.relatedArc,
      note.affectedCitizens,
      ''  // Status blank for processing
    ]);
  }
  
  var startRow = intakeSheet.getLastRow() + 1;
  intakeSheet.getRange(startRow, 1, rows.length, 5).setValues(rows);
  
  // Clear raw paste sheet (optional - comment out to keep)
  // rawSheet.getRange(2, 1, rawSheet.getLastRow(), 1).clearContent();
  
  var summary = 'Parsed ' + parsedNotes.length + ' continuity notes for arc: ' + arcName + '\n\n' +
                'Notes added to Continuity_Intake.\n' +
                'Run processMediaIntakeV2() to complete processing.';
  
  Logger.log(summary);
  SpreadsheetApp.getUi().alert(summary);
  
  return parsedNotes.length;
}


/**
 * Parse lines into structured note objects
 */
function parseLines_(lines, arcName) {
  var notes = [];
  var currentSection = '';
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    
    // Skip section dividers
    if (line.match(/^#{3,}/) || line.match(/^={3,}/) || line.match(/^-{3,}/)) {
      continue;
    }
    
    // Detect section headers
    if (isSectionHeader_(line)) {
      currentSection = cleanSectionName_(line);
      continue;
    }
    
    // Parse the line
    var parsed = parseLine_(line, currentSection, arcName);
    if (parsed) {
      notes.push(parsed);
    }
  }
  
  return notes;
}


/**
 * Check if line is a section header
 */
function isSectionHeader_(line) {
  // All caps with spaces
  if (line === line.toUpperCase() && line.length > 5 && line.indexOf(':') === -1) {
    return true;
  }
  // Ends with colon and is short
  if (line.endsWith(':') && line.length < 50 && !line.match(/^\s*-/)) {
    return true;
  }
  return false;
}


/**
 * Clean section name for context
 */
function cleanSectionName_(line) {
  return line.replace(/[:#]+/g, '').trim();
}


/**
 * Parse a single line into a note object
 */
function parseLine_(line, section, arcName) {
  // Skip empty or too short
  if (!line || line.length < 3) return null;
  
  // Clean leading dashes/bullets
  var cleanLine = line.replace(/^\s*[-•*]\s*/, '').trim();
  if (!cleanLine) return null;
  
  // Determine note type based on content
  var noteType = determineNoteType_(cleanLine, section);
  
  // Extract any citizen names (basic pattern: capitalized names)
  var citizens = extractCitizens_(cleanLine);
  
  // Build description with section context if useful
  var description = cleanLine;
  if (section && !cleanLine.toLowerCase().includes(section.toLowerCase())) {
    // Add section context for clarity
    description = '[' + section + '] ' + cleanLine;
  }
  
  return {
    noteType: noteType,
    description: description,
    relatedArc: arcName,
    affectedCitizens: citizens
  };
}


/**
 * Determine note type based on content patterns
 */
function determineNoteType_(line, section) {
  var lower = line.toLowerCase();
  var sectionLower = (section || '').toLowerCase();
  
  // Timeline patterns
  if (line.match(/^C\d+[:\s]/i) || 
      line.match(/^Year\s+\d/i) || 
      line.match(/^Q[1-4]\s/i) ||
      sectionLower.includes('timeline')) {
    return 'introduced';  // Timeline items are new introductions
  }
  
  // Target/goal patterns
  if (lower.includes('target') || 
      lower.includes('goal') || 
      sectionLower.includes('target') ||
      sectionLower.includes('pipeline')) {
    return 'introduced';
  }
  
  // Question patterns
  if (line.endsWith('?') || 
      lower.startsWith('will ') || 
      lower.startsWith('can ') ||
      lower.startsWith('how ')) {
    return 'question';
  }
  
  // Resolution patterns
  if (lower.includes('resolved') || 
      lower.includes('completed') || 
      lower.includes('finished') ||
      lower.includes('concluded')) {
    return 'resolved';
  }
  
  // Callback patterns
  if (lower.includes('callback') || 
      lower.includes('refer back') || 
      lower.includes('previously')) {
    return 'callback';
  }
  
  // Seasonal patterns
  if (lower.includes('seasonal') || 
      lower.includes('holiday') || 
      lower.includes('annual')) {
    return 'seasonal';
  }
  
  // Key numbers section is typically new data
  if (sectionLower.includes('number') || 
      sectionLower.includes('reference') ||
      sectionLower.includes('key')) {
    return 'introduced';
  }
  
  // Default: if it has a colon with value, it's introducing data
  if (line.match(/^[^:]+:\s*.+/)) {
    return 'introduced';
  }
  
  // Default to builton (building on existing story)
  return 'builton';
}


/**
 * Extract citizen names from line (basic pattern matching)
 */
function extractCitizens_(line) {
  // This is a simple extraction - looks for patterns like "Name Name"
  // Could be enhanced with a lookup against Simulation_Ledger
  
  var citizens = [];
  
  // Pattern: Two capitalized words together that aren't common terms
  var namePattern = /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g;
  var matches = line.match(namePattern);
  
  if (matches) {
    var skipTerms = [
      'Year One', 'Year Two', 'Year Three', 'Year Four', 'Year Five',
      'Total Investment', 'Local Hire', 'Community Fund', 'Opening Day',
      'Construction Start', 'Council Vote', 'Public Comment',
      'Environmental Review', 'Planning Committee', 'High School',
      'Young Adult', 'Direct Baylight'
    ];
    
    for (var i = 0; i < matches.length; i++) {
      var match = matches[i];
      var skip = false;
      for (var j = 0; j < skipTerms.length; j++) {
        if (match === skipTerms[j]) {
          skip = true;
          break;
        }
      }
      if (!skip) {
        citizens.push(match);
      }
    }
  }
  
  return citizens.join(', ');
}


/**
 * Setup function - creates Raw_Continuity_Paste sheet
 */
function setupContinuityParser() {
  var ss = openSimSpreadsheet_();  // v2.14: Use configured spreadsheet ID
  
  var sheet = ss.getSheetByName('Raw_Continuity_Paste');
  if (!sheet) {
    sheet = ss.insertSheet('Raw_Continuity_Paste');
    sheet.getRange('A1').setValue('PASTE RAW CONTINUITY NOTES HERE (one line per row, or all in A1)');
    sheet.getRange('B1').setValue('Arc Name Here');
    sheet.getRange('A1:B1').setFontWeight('bold');
    sheet.getRange('A1:B1').setBackground('#fffacd');
    sheet.setColumnWidth(1, 600);
    sheet.setColumnWidth(2, 200);
    
    // Add instructions
    sheet.getRange('A3').setValue('Instructions:');
    sheet.getRange('A4').setValue('1. Clear row 1 and paste your continuity notes in column A');
    sheet.getRange('A5').setValue('2. Put the arc name (e.g., "Baylight Development") in cell B1');
    sheet.getRange('A6').setValue('3. Run parseContinuityNotes() from the script menu');
    sheet.getRange('A7').setValue('4. Review Continuity_Intake sheet');
    sheet.getRange('A8').setValue('5. Run processMediaIntakeV2() to complete');
    
    SpreadsheetApp.getUi().alert('Created "Raw_Continuity_Paste" sheet.\n\nPaste your continuity notes in column A and put the arc name in B1.');
  } else {
    SpreadsheetApp.getUi().alert('Raw_Continuity_Paste sheet already exists.');
  }
}


/**
 * Alternative: Parse from a single text block (for API/programmatic use)
 */
function parseContinuityText(textBlock, arcName) {
  if (!textBlock) return [];
  
  var lines = textBlock.split(/[\r\n]+/);
  return parseLines_(lines, arcName || 'Unknown Arc');
}


/**
 * ============================================================================
 * CONTINUITY NOTES PARSER REFERENCE v1.0
 * ============================================================================
 * 
 * NOTE TYPE DETECTION:
 * 
 * | Pattern | NoteType |
 * |---------|----------|
 * | C74:, Year 3, Q2 | introduced (timeline) |
 * | Target, Goal | introduced |
 * | Ends with ? | question |
 * | Resolved, Completed | resolved |
 * | Callback, Previously | callback |
 * | Seasonal, Holiday | seasonal |
 * | Key: Value format | introduced |
 * | Default | builton |
 * 
 * SECTION CONTEXT:
 * - Parser detects ALL CAPS headers or "Header:" patterns
 * - Section name added to description for context
 * - e.g., "[Pipeline Targets] High School Enrollment: 280"
 * 
 * CITIZEN EXTRACTION:
 * - Basic pattern: Two capitalized words
 * - Filters out common terms (Year One, Opening Day, etc.)
 * - Can be enhanced with Simulation_Ledger lookup
 * 
 * WORKFLOW:
 * 1. setupContinuityParser() - creates paste sheet
 * 2. Paste Media Room output
 * 3. parseContinuityNotes() - converts to intake rows
 * 4. processMediaIntakeV2() - processes into Continuity_Loop
 * 
 * ============================================================================
 */