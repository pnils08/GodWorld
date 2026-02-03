/**
 * ============================================================================
 * parseMediaRoomMarkdown_ v1.3
 * ============================================================================
 * 
 * ALIGNED WITH ACTUAL SHEET STRUCTURES
 * 
 * This version writes to intake sheets WITHOUT calendar columns.
 * Calendar context is added by processMediaIntakeV2() when moving to ledgers.
 * 
 * Parses Media Room markdown output and populates intake sheets:
 * - ARTICLE TABLE → Media_Intake (7 columns)
 * - STORYLINES CARRIED FORWARD → Storyline_Intake (6 columns)
 * - CITIZEN USAGE LOG → Citizen_Usage_Intake (5 columns)
 * - CONTINUITY NOTES → Continuity_Intake (5 columns)
 * 
 * USAGE:
 * 1. Paste Media Room output into "MediaRoom_Paste" sheet
 * 2. Run parseMediaRoomMarkdown()
 * 3. Run processMediaIntakeV2() to move to final ledgers
 * 
 * ============================================================================
 */

// ════════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC FUNCTION - Run this first to see what's in the paste sheet
// ════════════════════════════════════════════════════════════════════════════

function diagnosePasteSheet() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var pasteSheet = ss.getSheetByName('MediaRoom_Paste');
  
  if (!pasteSheet) {
    Logger.log('ERROR: MediaRoom_Paste sheet does not exist');
    return;
  }
  
  var lastRow = pasteSheet.getLastRow();
  var lastCol = pasteSheet.getLastColumn();
  Logger.log('Sheet dimensions: ' + lastRow + ' rows x ' + lastCol + ' columns');
  
  if (lastRow === 0) {
    Logger.log('ERROR: Sheet is completely empty');
    return;
  }
  
  // Get all data
  var data = pasteSheet.getDataRange().getValues();
  Logger.log('Data array has ' + data.length + ' rows');
  
  // Build markdown string same way the parser does
  var markdown = '';
  var nonEmptyRows = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i][0]) {
      markdown += data[i][0] + '\n';
      nonEmptyRows++;
    }
  }
  
  Logger.log('Non-empty rows in column A: ' + nonEmptyRows);
  Logger.log('Total markdown length: ' + markdown.length + ' characters');
  Logger.log('');
  Logger.log('=== FIRST 500 CHARACTERS ===');
  Logger.log(markdown.substring(0, 500));
  Logger.log('');
  Logger.log('=== SEARCHING FOR SECTIONS ===');
  
  var sections = ['ARTICLE TABLE', 'STORYLINES CARRIED FORWARD', 'CITIZEN USAGE LOG', 'CONTINUITY NOTES'];
  for (var s = 0; s < sections.length; s++) {
    var idx = markdown.indexOf(sections[s]);
    if (idx >= 0) {
      Logger.log('FOUND: "' + sections[s] + '" at position ' + idx);
    } else {
      Logger.log('NOT FOUND: "' + sections[s] + '"');
    }
  }
  
  Logger.log('');
  Logger.log('=== LAST 500 CHARACTERS ===');
  Logger.log(markdown.substring(Math.max(0, markdown.length - 500)));
}


// ════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ════════════════════════════════════════════════════════════════════════════

function parseMediaRoomMarkdown() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  Logger.log('parseMediaRoomMarkdown v1.3: Starting...');
  
  var pasteSheet = ss.getSheetByName('MediaRoom_Paste');
  if (!pasteSheet) {
    pasteSheet = ss.insertSheet('MediaRoom_Paste');
    pasteSheet.getRange('A1').setValue('Paste Media Room output here, then run parseMediaRoomMarkdown()');
    SpreadsheetApp.getUi().alert('Created MediaRoom_Paste sheet.\n\nPaste your Media Room output into cell A1, then run this function again.');
    return;
  }
  
  var data = pasteSheet.getDataRange().getValues();
  var markdown = '';
  for (var i = 0; i < data.length; i++) {
    if (data[i][0]) {
      markdown += data[i][0] + '\n';
    }
  }
  
  Logger.log('parseMediaRoomMarkdown: Found ' + markdown.length + ' characters in paste sheet');
  Logger.log('parseMediaRoomMarkdown: First 200 chars: ' + markdown.substring(0, 200));
  
  if (!markdown || markdown.trim().length < 50) {
    Logger.log('parseMediaRoomMarkdown: No content - showing alert');
    SpreadsheetApp.getUi().alert('No content found in MediaRoom_Paste sheet.\n\nPaste your Media Room output into column A.');
    return;
  }
  
  var results = parseAllSections_(ss, markdown);
  
  pasteSheet.clear();
  pasteSheet.getRange('A1').setValue(
    'Last parsed: ' + new Date().toLocaleString() +
    '\n\nPaste new Media Room output here.'
  );
  
  var summary = 'Media Room Parse Complete (v1.3):\n\n' +
    '- Articles: ' + results.articles + '\n' +
    '- Storylines: ' + results.storylines + '\n' +
    '- Citizens: ' + results.citizens + '\n' +
    '- Continuity: ' + results.continuity + '\n\n' +
    'Run processMediaIntakeV2() to move to ledgers.';
  
  Logger.log(summary);
  try {
    SpreadsheetApp.getUi().alert(summary);
  } catch(e) {
    Logger.log('UI alert failed: ' + e.message);
  }
  
  return results;
}


function parseAndProcessMediaRoom() {
  var parseResults = parseMediaRoomMarkdown();
  
  if (parseResults && (parseResults.articles > 0 || parseResults.storylines > 0 || parseResults.citizens > 0 || parseResults.continuity > 0)) {
    Utilities.sleep(500);
    if (typeof processMediaIntakeV2 === 'function') {
      processMediaIntakeV2();
    } else {
      try {
        SpreadsheetApp.getUi().alert('Parsing complete. Run processMediaIntakeV2() manually.');
      } catch(e) {}
    }
  }
}


// ════════════════════════════════════════════════════════════════════════════
// CORE PARSER
// ════════════════════════════════════════════════════════════════════════════

function parseAllSections_(ss, markdown) {
  var results = {
    articles: 0,
    storylines: 0,
    citizens: 0,
    continuity: 0
  };
  
  // Normalize the markdown - restore newlines if they were stripped
  markdown = normalizeMarkdown_(markdown);
  
  // ARTICLE TABLE
  var articleSection = extractSection_(markdown, 'ARTICLE TABLE');
  if (articleSection) {
    results.articles = parseArticleTable_(ss, articleSection);
  }
  
  // STORYLINES CARRIED FORWARD (also check for "STORYLINES UPDATED")
  var storylineSection = extractSection_(markdown, 'STORYLINES CARRIED FORWARD');
  if (!storylineSection) {
    storylineSection = extractSection_(markdown, 'STORYLINES UPDATED');
  }
  if (storylineSection) {
    results.storylines = parseStorylines_(ss, storylineSection);
  }
  
  // CITIZEN USAGE LOG
  var citizenSection = extractSection_(markdown, 'CITIZEN USAGE LOG');
  if (citizenSection) {
    results.citizens = parseCitizenUsage_(ss, citizenSection);
  }
  
  // CONTINUITY NOTES
  var continuitySection = extractSection_(markdown, 'CONTINUITY NOTES');
  if (continuitySection) {
    results.continuity = parseContinuityNotes_(ss, continuitySection);
  }
  
  return results;
}


/**
 * Normalize markdown - restore newlines if they were stripped during paste
 */
function normalizeMarkdown_(text) {
  // Check if newlines exist
  if (text.indexOf('\n') >= 0 && text.split('\n').length > 10) {
    // Has newlines, probably fine
    return text;
  }
  
  Logger.log('normalizeMarkdown_: Detected stripped newlines, restoring...');
  
  // Restore newlines before common patterns
  var restored = text;
  
  // Before section headers (####)
  restored = restored.replace(/\s*(#{3,})/g, '\n$1');
  
  // Before table rows (|)
  restored = restored.replace(/\s*(\|[^|])/g, '\n$1');
  
  // Before bullet points (— or - at word boundary)
  restored = restored.replace(/\s+(—\s+)/g, '\n$1');
  restored = restored.replace(/\s+(-\s+[A-Z])/g, '\n$1');
  
  // Before category headers (ALL CAPS followed by :)
  restored = restored.replace(/\s+([A-Z][A-Z\s]{3,}:)/g, '\n$1');
  
  // Before "RESOLVED:", "STILL ACTIVE:", "NEW THREADS:", etc.
  restored = restored.replace(/\s+(RESOLVED)/g, '\n$1');
  restored = restored.replace(/\s+(STILL ACTIVE)/g, '\n$1');
  restored = restored.replace(/\s+(NEW THREAD)/g, '\n$1');
  restored = restored.replace(/\s+(NEW INFORMATION)/g, '\n$1');
  restored = restored.replace(/\s+(PHASE CHANGE)/g, '\n$1');
  restored = restored.replace(/\s+(QUESTIONS)/g, '\n$1');
  restored = restored.replace(/\s+(BUILT ON)/g, '\n$1');
  restored = restored.replace(/\s+(KEY NUMBERS)/g, '\n$1');
  restored = restored.replace(/\s+(TIMELINE)/g, '\n$1');
  restored = restored.replace(/\s+(CALENDAR)/g, '\n$1');
  restored = restored.replace(/\s+(PIPELINE)/g, '\n$1');
  
  // Before citizen category headers
  restored = restored.replace(/\s+(A'S PLAYERS)/g, '\n$1');
  restored = restored.replace(/\s+(BULLS PLAYERS)/g, '\n$1');
  restored = restored.replace(/\s+(OTHER NBA)/g, '\n$1');
  restored = restored.replace(/\s+(CIVIC OFFICIALS)/g, '\n$1');
  restored = restored.replace(/\s+(OWNERSHIP)/g, '\n$1');
  restored = restored.replace(/\s+(CULTURAL LEDGER)/g, '\n$1');
  restored = restored.replace(/\s+(JOURNALISTS)/g, '\n$1');
  restored = restored.replace(/\s+(OTHER CITIZENS)/g, '\n$1');
  restored = restored.replace(/\s+(CITIZENS QUOTED)/g, '\n$1');
  
  // Clean up multiple spaces
  restored = restored.replace(/  +/g, ' ');
  
  Logger.log('normalizeMarkdown_: Restored, now ' + restored.split('\n').length + ' lines');
  
  return restored;
}


// ════════════════════════════════════════════════════════════════════════════
// SECTION EXTRACTION
// ════════════════════════════════════════════════════════════════════════════

function extractSection_(markdown, sectionName) {
  Logger.log('extractSection_: Looking for "' + sectionName + '"');
  
  // Strategy: Find the section name anywhere, then work backwards/forwards to find boundaries
  
  // First, just find where the section name appears
  var namePattern = new RegExp(sectionName, 'i');
  var nameMatch = markdown.match(namePattern);
  
  if (!nameMatch) {
    Logger.log('extractSection_: NOT FOUND - ' + sectionName);
    return null;
  }
  
  Logger.log('extractSection_: FOUND "' + sectionName + '" at position ' + nameMatch.index);
  
  // Find the end of the header block (look for the closing ### line after the section name)
  var afterName = markdown.substring(nameMatch.index);
  var headerEndMatch = afterName.match(/\n#{3,}\s*\n/);
  
  var startIdx;
  if (headerEndMatch) {
    startIdx = nameMatch.index + headerEndMatch.index + headerEndMatch[0].length;
  } else {
    // No ### closer, just start after the line with the section name
    var lineEndMatch = afterName.match(/\n/);
    startIdx = nameMatch.index + (lineEndMatch ? lineEndMatch.index + 1 : afterName.length);
  }
  
  // Find end at next major section (### followed by text)
  var remaining = markdown.substring(startIdx);
  var endPattern = /\n#{3,}\s*\n[A-Z]/;
  var endMatch = remaining.match(endPattern);
  var endIdx = endMatch ? startIdx + endMatch.index : markdown.length;
  
  // Also check for "---" followed by "###" as section separator
  var dashPattern = /\n---+\s*\n\s*#{3,}/;
  var dashMatch = remaining.match(dashPattern);
  if (dashMatch && startIdx + dashMatch.index < endIdx) {
    endIdx = startIdx + dashMatch.index;
  }
  
  // Also check for ===== separator lines (used in some formats)
  var equalsPattern = /\n={3,}\s*\n[A-Z]/;
  var equalsMatch = remaining.match(equalsPattern);
  if (equalsMatch && startIdx + equalsMatch.index < endIdx) {
    endIdx = startIdx + equalsMatch.index;
  }
  
  var extracted = markdown.substring(startIdx, endIdx).trim();
  Logger.log('extractSection_: Extracted ' + extracted.length + ' chars for ' + sectionName);
  Logger.log('extractSection_: First 100 chars: ' + extracted.substring(0, 100));
  
  return extracted;
}


// ════════════════════════════════════════════════════════════════════════════
// ARTICLE TABLE PARSER
// Media_Intake: Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status
// ════════════════════════════════════════════════════════════════════════════

function parseArticleTable_(ss, section) {
  var lines = section.split('\n');
  var articles = [];
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    
    if (!line) continue;
    if (line.match(/^\|\s*Reporter\s*\|/i)) continue;
    if (line.match(/^\|[-\s|]+\|$/)) continue;
    if (line.match(/^---+$/)) continue;
    
    if (line.startsWith('|')) {
      var cells = line.split('|').map(function(c) { return c.trim(); });
      cells = cells.filter(function(c, idx) { return idx > 0 && idx < cells.length; });
      
      if (cells.length >= 4) {
        articles.push({
          reporter: cells[0] || '',
          storyType: cells[1] || '',
          signalSource: cells[2] || '',
          headline: cells[3] || '',
          articleText: cells[4] || '',
          culturalMentions: cells[5] || ''
        });
      }
    }
  }
  
  if (articles.length === 0) return 0;
  
  var sheet = ensureMediaIntakeSheet_(ss);
  
  var rows = [];
  for (var j = 0; j < articles.length; j++) {
    var a = articles[j];
    rows.push([
      a.reporter,
      a.storyType,
      a.signalSource,
      a.headline,
      a.articleText,
      a.culturalMentions,
      ''  // Status
    ]);
  }
  
  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, 7).setValues(rows);
  
  Logger.log('parseArticleTable_: Added ' + articles.length + ' articles');
  return articles.length;
}


// ════════════════════════════════════════════════════════════════════════════
// STORYLINES PARSER
// Storyline_Intake: StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status
// ════════════════════════════════════════════════════════════════════════════

function parseStorylines_(ss, section) {
  var lines = section.split('\n');
  var storylines = [];
  var currentCategory = 'active';
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    
    // Category headers
    if (line.match(/^RESOLVED/i)) {
      currentCategory = 'resolved';
      continue;
    }
    if (line.match(/^PHASE CHANGES/i)) {
      currentCategory = 'phase-change';
      continue;
    }
    if (line.match(/^STILL ACTIVE/i) || line.match(/^ACTIVE/i)) {
      currentCategory = 'active';
      continue;
    }
    if (line.match(/^NEW THREAD/i) || line.match(/^NEW THIS CYCLE/i) || line.match(/^NEW:/i)) {
      currentCategory = 'new';
      continue;
    }
    if (line.match(/^QUESTIONS/i)) {
      currentCategory = 'question';
      continue;
    }
    
    // Parse entries (— or - prefix)
    if (line.match(/^[—\-]\s+/)) {
      var content = line.replace(/^[—\-]\s+/, '').trim();
      
      // Extract name: description format
      var colonIdx = content.indexOf(':');
      var storylineName = '';
      var description = content;
      
      if (colonIdx > 0 && colonIdx < 50) {
        storylineName = content.substring(0, colonIdx).trim();
        description = content.substring(colonIdx + 1).trim();
      }
      
      // Determine type
      var storyType = currentCategory;
      if (currentCategory === 'question') {
        storyType = 'question';
      } else if (currentCategory === 'resolved') {
        storyType = 'resolved';
      } else if (currentCategory === 'phase-change') {
        storyType = 'phase-change';
      } else if (currentCategory === 'new') {
        storyType = 'new';
      } else {
        storyType = 'active';
      }

      // Determine priority
      var priority = 'normal';
      if (currentCategory === 'new' || currentCategory === 'phase-change') {
        priority = 'high';
      }
      
      // Extract neighborhood if mentioned
      var neighborhood = '';
      var neighborhoods = ['Temescal', 'Downtown', 'West Oakland', 'Fruitvale', 'Laurel', 
                          'Jack London', 'Lake Merritt', 'Chinatown', 'Rockridge', 'Piedmont'];
      for (var n = 0; n < neighborhoods.length; n++) {
        if (content.indexOf(neighborhoods[n]) >= 0) {
          neighborhood = neighborhoods[n];
          break;
        }
      }
      
      storylines.push({
        storylineType: storyType,
        description: storylineName ? storylineName + ': ' + description : description,
        neighborhood: neighborhood,
        relatedCitizens: '',
        priority: priority
      });
    }
  }
  
  if (storylines.length === 0) return 0;
  
  var sheet = ensureStorylineIntakeSheet_(ss);
  
  var rows = [];
  for (var j = 0; j < storylines.length; j++) {
    var s = storylines[j];
    rows.push([
      s.storylineType,
      s.description,
      s.neighborhood,
      s.relatedCitizens,
      s.priority,
      ''  // Status
    ]);
  }
  
  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, 6).setValues(rows);
  
  Logger.log('parseStorylines_: Added ' + storylines.length + ' storylines');
  return storylines.length;
}


// ════════════════════════════════════════════════════════════════════════════
// CITIZEN USAGE PARSER
// Citizen_Usage_Intake: CitizenName, UsageType, Context, Reporter, Status
// ════════════════════════════════════════════════════════════════════════════

function parseCitizenUsage_(ss, section) {
  var lines = section.split('\n');
  var usages = [];
  var currentCategory = 'citizen';
  var currentContext = 'CITIZEN';

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    // Category headers
    var headerLower = line.toLowerCase();
    if (headerLower.indexOf('journalist') >= 0 || headerLower.indexOf('reporter') >= 0) {
      currentCategory = 'journalist';
      currentContext = 'JOURNALIST';
      continue;
    }
    if (headerLower.indexOf('sports') >= 0 || headerLower.indexOf('player') >= 0 || headerLower.indexOf('a\'s') >= 0 ||
        headerLower.indexOf('bulls') >= 0 || headerLower.indexOf('nba') >= 0) {
      currentCategory = 'uni';
      currentContext = 'UNI';
      continue;
    }
    if (headerLower.indexOf('civic') >= 0 || headerLower.indexOf('official') >= 0) {
      currentCategory = 'official';
      currentContext = 'CIVIC';
      continue;
    }
    if (headerLower.indexOf('cultural') >= 0) {
      currentCategory = 'cultural';
      currentContext = 'CULTURAL';
      continue;
    }
    if (headerLower.indexOf('owner') >= 0 || headerLower.indexOf('executive') >= 0) {
      currentCategory = 'executive';
      currentContext = 'EXECUTIVE';
      continue;
    }
    if (headerLower.indexOf('quoted') >= 0) {
      currentCategory = 'quoted';
      currentContext = 'QUOTED';
      continue;
    }
    if (headerLower.indexOf('letters') >= 0) {
      currentCategory = 'letters';
      currentContext = 'LETTERS';
      continue;
    }
    if (headerLower.indexOf('citizen') >= 0 || headerLower.indexOf('other') >= 0) {
      currentCategory = 'citizen';
      currentContext = 'CITIZEN';
      continue;
    }

    // Parse entries
    if (line.match(/^[—\-]\s+/)) {
      var content = line.replace(/^[—\-]\s+/, '').trim();

      // Parse "Name (context)" format
      var name = content;
      var context = '';

      var parenMatch = content.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (parenMatch) {
        name = parenMatch[1].trim();
        context = parenMatch[2].trim();
      }

      // Determine usage type based on category
      var usageType = 'mentioned';
      if (!context) {
        context = currentContext;
      }

      if (name) {
        usages.push({
          citizenName: name,
          usageType: usageType,
          context: context,
          reporter: ''
        });
      }
    }
  }
  
  if (usages.length === 0) return 0;
  
  var sheet = ensureCitizenUsageIntakeSheet_(ss);
  
  var rows = [];
  for (var j = 0; j < usages.length; j++) {
    var u = usages[j];
    rows.push([
      u.citizenName,
      u.usageType,
      u.context,
      u.reporter,
      ''  // Status
    ]);
  }
  
  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, 5).setValues(rows);
  
  Logger.log('parseCitizenUsage_: Added ' + usages.length + ' citizen usages');
  return usages.length;
}


// ════════════════════════════════════════════════════════════════════════════
// CONTINUITY NOTES PARSER
// Continuity_Intake: NoteType, Description, RelatedArc, AffectedCitizens, Status
// ════════════════════════════════════════════════════════════════════════════

function parseContinuityNotes_(ss, section) {
  if (!section || section.trim().length < 10) return 0;
  
  var lines = section.split(/[\r\n]+/);
  var notes = [];
  var currentSubsection = '';
  var relatedArc = '';
  
  // First pass: find ARC: line if present
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    var arcMatch = line.match(/^ARC:\s*(.+)$/i);
    if (arcMatch) {
      relatedArc = arcMatch[1].trim();
      break;
    }
  }
  
  // Second pass: parse content
  for (var j = 0; j < lines.length; j++) {
    var line = lines[j].trim();
    
    // Skip empty, decorators, ARC: line
    if (!line || line.match(/^[#=]{3,}$/) || line.match(/^ARC:/i)) continue;
    
    // Detect subsection headers
    if (isSubsectionHeader_(line)) {
      currentSubsection = cleanSubsectionName_(line);
      continue;
    }
    
    // Parse content line
    var note = parseNoteLine_(line, currentSubsection, relatedArc);
    if (note) {
      notes.push(note);
    }
  }
  
  if (notes.length === 0) return 0;
  
  var sheet = ensureContinuityIntakeSheet_(ss);
  
  var rows = [];
  for (var k = 0; k < notes.length; k++) {
    var n = notes[k];
    rows.push([
      n.noteType,
      n.description,
      n.relatedArc,
      n.affectedCitizens,
      ''  // Status
    ]);
  }
  
  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, 5).setValues(rows);
  
  Logger.log('parseContinuityNotes_: Added ' + notes.length + ' continuity notes');
  return notes.length;
}


function isSubsectionHeader_(line) {
  // ALL CAPS headers
  if (line === line.toUpperCase() && line.length > 3 && line.length < 60) {
    if (!line.match(/^[A-Z\s]+:\s+\S/)) {  // Not "KEY: value" format
      return true;
    }
  }
  // "Header:" format (ends with colon, no value)
  if (line.match(/^[A-Za-z\s]+:$/) && line.length < 40) {
    return true;
  }
  return false;
}


function cleanSubsectionName_(line) {
  return line.replace(/[:#]+$/, '').trim();
}


function parseNoteLine_(line, subsection, relatedArc) {
  // Clean leading bullets/dashes
  var clean = line.replace(/^\s*[-—•*]\s*/, '').trim();
  if (!clean || clean.length < 3) return null;
  
  // Determine note type
  var noteType = determineNoteType_(clean, subsection);
  
  // Build description
  var description = clean;
  if (subsection && clean.toLowerCase().indexOf(subsection.toLowerCase().substring(0, 8)) < 0) {
    description = '[' + subsection + '] ' + clean;
  }
  
  // Extract citizen names
  var citizens = extractCitizenNames_(clean);
  
  return {
    noteType: noteType,
    description: description,
    relatedArc: relatedArc || '',
    affectedCitizens: citizens
  };
}


function determineNoteType_(line, subsection) {
  var lower = line.toLowerCase();
  var subLower = (subsection || '').toLowerCase();
  
  // Timeline patterns
  if (line.match(/^C\d+[:\s\-]/i) || line.match(/^Year\s+\d/i) || line.match(/^Q[1-4]\s/i)) {
    return 'introduced';
  }
  if (subLower.indexOf('timeline') >= 0) {
    return 'introduced';
  }
  
  // Key numbers/reference patterns
  if (subLower.indexOf('number') >= 0 || subLower.indexOf('reference') >= 0 || 
      subLower.indexOf('target') >= 0 || subLower.indexOf('key') >= 0) {
    return 'introduced';
  }
  
  // Built on patterns
  if (subLower.indexOf('built on') >= 0 || subLower.indexOf('previous') >= 0) {
    return 'builton';
  }
  
  // New threads patterns
  if (subLower.indexOf('new thread') >= 0 || subLower.indexOf('introduced') >= 0) {
    return 'introduced';
  }
  
  // Calendar notes
  if (subLower.indexOf('calendar') >= 0) {
    return 'introduced';
  }
  
  // Question patterns
  if (line.charAt(line.length - 1) === '?') {
    return 'question';
  }
  
  // Resolution patterns
  if (lower.indexOf('resolved') >= 0 || lower.indexOf('completed') >= 0) {
    return 'resolved';
  }
  
  // Callback patterns
  if (lower.indexOf('callback') >= 0 || lower.indexOf('refer back') >= 0) {
    return 'callback';
  }
  
  // Key: Value format = introduced data
  if (line.match(/^[^:]+:\s+\S/)) {
    return 'introduced';
  }
  
  return 'builton';
}


function extractCitizenNames_(line) {
  var skipTerms = [
    'Year One', 'Year Two', 'Year Three', 'Year Four', 'Year Five',
    'Total Investment', 'Local Hire', 'Community Fund', 'Opening Day',
    'Construction Start', 'Council Vote', 'Public Comment', 'Planning Committee',
    'Environmental Review', 'High School', 'Young Adult', 'Direct Baylight',
    'Jack London', 'Lake Merritt', 'West Oakland', 'Piedmont Ave',
    'NBA Cup', 'First Friday'
  ];
  
  var pattern = /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g;
  var matches = line.match(pattern) || [];
  var citizens = [];
  
  for (var i = 0; i < matches.length; i++) {
    var skip = false;
    for (var j = 0; j < skipTerms.length; j++) {
      if (matches[i] === skipTerms[j]) {
        skip = true;
        break;
      }
    }
    if (!skip) {
      citizens.push(matches[i]);
    }
  }
  
  return citizens.join(', ');
}


// ════════════════════════════════════════════════════════════════════════════
// SHEET HELPERS - Creates sheets matching ACTUAL current structure
// ════════════════════════════════════════════════════════════════════════════

function ensureMediaIntakeSheet_(ss) {
  var HEADERS = ['Reporter', 'StoryType', 'SignalSource', 'Headline', 'ArticleText', 'CulturalMentions', 'Status'];
  
  var sheet = ss.getSheetByName('Media_Intake');
  if (!sheet) {
    sheet = ss.insertSheet('Media_Intake');
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}


function ensureStorylineIntakeSheet_(ss) {
  var HEADERS = ['StorylineType', 'Description', 'Neighborhood', 'RelatedCitizens', 'Priority', 'Status'];
  
  var sheet = ss.getSheetByName('Storyline_Intake');
  if (!sheet) {
    sheet = ss.insertSheet('Storyline_Intake');
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}


function ensureCitizenUsageIntakeSheet_(ss) {
  var HEADERS = ['CitizenName', 'UsageType', 'Context', 'Reporter', 'Status'];
  
  var sheet = ss.getSheetByName('Citizen_Usage_Intake');
  if (!sheet) {
    sheet = ss.insertSheet('Citizen_Usage_Intake');
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}


function ensureContinuityIntakeSheet_(ss) {
  var HEADERS = ['NoteType', 'Description', 'RelatedArc', 'AffectedCitizens', 'Status'];
  
  var sheet = ss.getSheetByName('Continuity_Intake');
  if (!sheet) {
    sheet = ss.insertSheet('Continuity_Intake');
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    
    var noteTypes = SpreadsheetApp.newDataValidation()
      .requireValueInList(['builton', 'introduced', 'question', 'resolved', 'callback', 'seasonal'])
      .build();
    sheet.getRange('A2:A500').setDataValidation(noteTypes);
  }
  return sheet;
}


/**
 * ============================================================================
 * REFERENCE v1.3
 * ============================================================================
 * 
 * INTAKE SHEET SCHEMAS (no calendar columns):
 * 
 * Media_Intake (7 columns):
 *   Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status
 * 
 * Storyline_Intake (6 columns):
 *   StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status
 * 
 * Citizen_Usage_Intake (5 columns):
 *   CitizenName, UsageType, Context, Reporter, Status
 * 
 * Continuity_Intake (5 columns):
 *   NoteType, Description, RelatedArc, AffectedCitizens, Status
 * 
 * CONTINUITY NOTE TYPES:
 *   builton     - Building on previous coverage
 *   introduced  - New data/facts/timeline items
 *   question    - Open questions
 *   resolved    - Completed threads
 *   callback    - References to past events
 *   seasonal    - Calendar-related
 * 
 * WORKFLOW:
 *   1. Paste Media Room output → MediaRoom_Paste
 *   2. Run parseMediaRoomMarkdown()
 *   3. Run processMediaIntakeV2() to move to ledgers
 *
 * ============================================================================
 */
