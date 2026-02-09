/**
 * ============================================================================
 * PROCESS MEDIA INTAKE v1.2
 * ============================================================================
 *
 * Node.js equivalent of processMediaIntakeV2() from mediaRoomIntake.js.
 * Moves data from intake sheets to final ledger sheets.
 *
 * Usage:
 *   node scripts/processIntake.js [cycle-number]
 *   node scripts/processIntake.js [cycle-number] --cleanup
 *
 * Processes:
 *   1. Media_Intake → Press_Drafts (14 cols with calendar)
 *   2. Storyline_Intake → Storyline_Tracker (14 cols, with resolution)
 *   3. Citizen_Usage_Intake → Citizen_Media_Usage (12 cols)
 *   4. Citizen_Media_Usage → Intake / Advancement_Intake1 (routing)
 *
 * v1.1 Changes:
 * - Calendar context now parsed from Cycle_Packet text (--- CALENDAR --- section)
 *   instead of World_Population which has no calendar columns
 * - Full demographic extraction from citizen name format "Name, Age, Neighborhood, Occupation"
 * - Intake sheet now populated with BirthYear, Neighborhood, and actual RoleType/Occupation
 * - Advancement_Intake1 writes use explicit A:J range to prevent column shift
 * - --cleanup flag fixes broken shifted rows in Advancement_Intake1
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');


// ════════════════════════════════════════════════════════════════════════════
// CALENDAR CONTEXT — Parsed from Cycle_Packet text
// ════════════════════════════════════════════════════════════════════════════

async function getCalendarContext(cycle) {
  const defaults = {
    season: '',
    holiday: 'none',
    holidayPriority: 'none',
    isFirstFriday: false,
    isCreationDay: false,
    sportsSeason: 'off-season',
    month: 0
  };

  try {
    const data = await sheets.getSheetData('Cycle_Packet');
    if (data.length < 2) return defaults;

    const headers = data[0];
    const cycleCol = headers.indexOf('Cycle');
    const textCol = headers.indexOf('PacketText');
    if (textCol < 0) return defaults;

    // Find the packet for the target cycle (search backwards for most recent)
    let packetText = '';
    for (let i = data.length - 1; i >= 1; i--) {
      const rowCycle = parseInt(data[i][cycleCol >= 0 ? cycleCol : 1]) || 0;
      if (rowCycle === cycle) {
        packetText = (data[i][textCol >= 0 ? textCol : 2] || '').toString();
        break;
      }
    }

    if (!packetText) {
      console.log('  Warning: No Cycle_Packet row found for cycle ' + cycle);
      return defaults;
    }

    // Parse --- CALENDAR --- section
    // The section ends at the next --- header or a double newline
    const calMatch = packetText.match(/---\s*CALENDAR\s*---\s*\n([\s\S]*?)(?:\n---|\n\n\n)/i);
    if (!calMatch) {
      console.log('  Warning: No --- CALENDAR --- section found in Cycle_Packet');
      return defaults;
    }

    const calSection = calMatch[1];

    // Season: "Season: Summer"
    const seasonMatch = calSection.match(/Season:\s*(\w+)/i);
    if (seasonMatch) defaults.season = seasonMatch[1];

    // Holiday: "Holiday: Independence [major] @ Lake Merritt"
    const holidayMatch = calSection.match(/Holiday:\s*(\w+)\s*\[(\w+)\]/i);
    if (holidayMatch) {
      defaults.holiday = holidayMatch[1];
      defaults.holidayPriority = holidayMatch[2];
    } else {
      // Check for "Holiday: none"
      const noneMatch = calSection.match(/Holiday:\s*none/i);
      if (noneMatch) {
        defaults.holiday = 'none';
        defaults.holidayPriority = 'none';
      }
    }

    // First Friday: line contains "FIRST FRIDAY"
    if (/FIRST\s+FRIDAY/i.test(calSection)) {
      defaults.isFirstFriday = true;
    }

    // Creation Day
    if (/CREATION\s*DAY/i.test(calSection)) {
      defaults.isCreationDay = true;
    }

    // Month: "Month: 7 (July)"
    const monthMatch = calSection.match(/Month:\s*(\d+)/i);
    if (monthMatch) {
      defaults.month = parseInt(monthMatch[1]);

      // Derive sportsSeason from month (tracks baseball — Oakland A's primary)
      const m = defaults.month;
      if (m >= 2 && m <= 3) defaults.sportsSeason = 'spring-training';
      else if (m >= 4 && m <= 9) defaults.sportsSeason = 'mid-season';
      else if (m === 10) defaults.sportsSeason = 'playoffs';
      else defaults.sportsSeason = 'off-season';
    }

    return defaults;
  } catch (e) {
    console.log(`  Warning: Could not read Cycle_Packet: ${e.message}`);
    return defaults;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// CITIZEN DEMOGRAPHIC PARSING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Parse citizen name field which may contain demographics.
 * Handles formats:
 *   "Bruce Wright, 48, Downtown, Line cook"  → full demographics
 *   "Gloria Santos, Fruitvale, Teacher"       → no age
 *   "Denise Carter"                           → name only
 *   "Gallery Owner Mei Chen"                  → name with title prefix
 *
 * @param {string} fullField - The CitizenName field value
 * @returns {{ first: string, last: string, age: string, neighborhood: string, occupation: string }}
 */
function parseCitizenDemographics(fullField) {
  const result = { first: '', last: '', age: '', neighborhood: '', occupation: '' };
  if (!fullField) return result;

  const parts = fullField.split(',').map(p => p.trim());

  if (parts.length >= 4) {
    // Full format: "Bruce Wright, 48, Downtown, Line cook"
    const nameParts = parts[0].split(/\s+/);
    result.first = nameParts[0] || '';
    result.last = nameParts.slice(1).join(' ') || '';
    result.age = parts[1] || '';
    result.neighborhood = parts[2] || '';
    result.occupation = parts.slice(3).join(', ').trim();
  } else if (parts.length === 3) {
    // "Name, Neighborhood, Occupation" or "Name, Age, Neighborhood"
    const nameParts = parts[0].split(/\s+/);
    result.first = nameParts[0] || '';
    result.last = nameParts.slice(1).join(' ') || '';

    if (/^\d+$/.test(parts[1])) {
      // Second part is a number → age
      result.age = parts[1];
      result.neighborhood = parts[2];
    } else {
      result.neighborhood = parts[1];
      result.occupation = parts[2];
    }
  } else if (parts.length === 2) {
    // "Name, Neighborhood" or "Name, Age"
    const nameParts = parts[0].split(/\s+/);
    result.first = nameParts[0] || '';
    result.last = nameParts.slice(1).join(' ') || '';

    if (/^\d+$/.test(parts[1])) {
      result.age = parts[1];
    } else {
      result.neighborhood = parts[1];
    }
  } else {
    // Just a name, possibly with parenthetical: "Name (details)"
    const cleaned = parts[0].replace(/\s*\([^)]*\)\s*$/, '').trim();
    const nameParts = cleaned.split(/\s+/);
    result.first = nameParts[0] || '';
    result.last = nameParts.slice(1).join(' ') || '';
  }

  return result;
}

/**
 * Calculate birth year from age string.
 * GodWorld simulation year is fixed at 2026.
 */
function birthYearFromAge(ageStr) {
  const age = parseInt(ageStr);
  if (isNaN(age) || age <= 0 || age > 120) return '';
  return 2026 - age;
}


// ════════════════════════════════════════════════════════════════════════════
// 1. ARTICLE INTAKE → PRESS_DRAFTS
// ════════════════════════════════════════════════════════════════════════════

async function processArticleIntake(cycle, cal) {
  const data = await sheets.getSheetData('Media_Intake');
  if (data.length < 2) return 0;

  const drafts = [];
  const processedRows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1] && !row[2]) continue;
    if ((row[6] || '').toString().toLowerCase() === 'processed') continue;

    drafts.push({
      reporter: row[0] || 'Unknown',
      storyType: row[1] || 'general',
      signalSource: row[2] || 'editorial',
      headline: row[3] || '',
      articleText: row[4] || '',
      culturalMentions: row[5] || ''
    });

    processedRows.push(i + 1); // 1-indexed sheet row
  }

  if (drafts.length === 0) return 0;

  // Write to Press_Drafts (14 columns with calendar)
  const now = new Date().toISOString();
  const rows = drafts.map(d => [
    now,                    // A  Timestamp
    cycle,                  // B  Cycle
    d.reporter,             // C  Reporter
    d.storyType,            // D  StoryType
    d.signalSource,         // E  SignalSource
    d.headline,             // F  SummaryPrompt
    d.articleText,          // G  DraftText
    'draft',                // H  Status
    cal.season,             // I  Season
    cal.holiday,            // J  Holiday
    cal.holidayPriority,    // K  HolidayPriority
    cal.isFirstFriday,      // L  IsFirstFriday
    cal.isCreationDay,      // M  IsCreationDay
    cal.sportsSeason        // N  SportsSeason
  ]);

  await sheets.appendRows('Press_Drafts', rows);

  // Mark as processed in Media_Intake
  const updates = processedRows.map(r => ({
    range: `Media_Intake!G${r}`,
    values: [['processed']]
  }));
  await sheets.batchUpdate(updates);

  return drafts.length;
}


// ════════════════════════════════════════════════════════════════════════════
// 2. STORYLINE INTAKE → STORYLINE_TRACKER
// ════════════════════════════════════════════════════════════════════════════

async function processStorylineIntake(cycle, cal) {
  const data = await sheets.getSheetData('Storyline_Intake');
  if (data.length < 2) return 0;

  const newStorylines = [];
  const resolveDescriptions = [];
  const processedRows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;
    if ((row[5] || '').toString().toLowerCase() === 'processed') continue;

    let type, description, neighborhood, citizens, priority;

    // Check if pipe-separated in column A
    const colA = (row[0] || '').toString().trim();
    if (colA.includes('|') && !row[1]) {
      const parts = colA.replace(/^[—–\-]\s*/, '').split('|');
      type = (parts[0] || '').trim().toLowerCase();
      description = (parts[1] || '').trim();
      neighborhood = (parts[2] || '').trim();
      citizens = (parts[3] || '').trim();
      priority = (parts[4] || '').trim();
    } else {
      type = colA.toLowerCase();
      description = (row[1] || '').toString().trim();
      neighborhood = (row[2] || '').toString().trim();
      citizens = (row[3] || '').toString().trim();
      priority = (row[4] || '').toString().trim();
    }

    if (type === 'resolved') {
      resolveDescriptions.push(description);
    } else {
      newStorylines.push({
        storylineType: type || 'arc',
        description,
        neighborhood,
        relatedCitizens: citizens,
        priority: priority || 'normal'
      });
    }

    processedRows.push(i + 1);
  }

  let totalProcessed = 0;

  // Resolve matching storylines in tracker
  if (resolveDescriptions.length > 0) {
    const trackerData = await sheets.getSheetData('Storyline_Tracker');
    if (trackerData.length > 1) {
      const headers = trackerData[0];
      const descCol = headers.indexOf('Description');
      const statusCol = headers.indexOf('Status');

      if (descCol >= 0 && statusCol >= 0) {
        const resolveUpdates = [];

        for (let r = 1; r < trackerData.length; r++) {
          const trackerDesc = (trackerData[r][descCol] || '').toString().trim().toLowerCase();
          const trackerStatus = (trackerData[r][statusCol] || '').toString().trim().toLowerCase();

          if (trackerStatus !== 'active') continue;

          for (const resolveKey of resolveDescriptions) {
            const key = resolveKey.toLowerCase();
            if (trackerDesc.includes(key) || key.includes(trackerDesc)) {
              const colLetter = String.fromCharCode(65 + statusCol);
              resolveUpdates.push({
                range: `Storyline_Tracker!${colLetter}${r + 1}`,
                values: [['resolved']]
              });
              totalProcessed++;
              break;
            }
          }
        }

        if (resolveUpdates.length > 0) {
          await sheets.batchUpdate(resolveUpdates);
        }
      }
    }
  }

  // Add new storylines to tracker (14 columns with calendar)
  if (newStorylines.length > 0) {
    const now = new Date().toISOString();
    const rows = newStorylines.map(s => [
      now,                    // A  Timestamp
      cycle,                  // B  CycleAdded
      s.storylineType,        // C  StorylineType
      s.description,          // D  Description
      s.neighborhood,         // E  Neighborhood
      s.relatedCitizens,      // F  RelatedCitizens
      s.priority,             // G  Priority
      'active',               // H  Status
      cal.season,             // I  Season
      cal.holiday,            // J  Holiday
      cal.holidayPriority,    // K  HolidayPriority
      cal.isFirstFriday,      // L  IsFirstFriday
      cal.isCreationDay,      // M  IsCreationDay
      cal.sportsSeason        // N  SportsSeason
    ]);

    await sheets.appendRows('Storyline_Tracker', rows);
    totalProcessed += newStorylines.length;
  }

  // Mark as processed in Storyline_Intake
  if (processedRows.length > 0) {
    const updates = processedRows.map(r => ({
      range: `Storyline_Intake!F${r}`,
      values: [['processed']]
    }));
    await sheets.batchUpdate(updates);
  }

  console.log(`    New: ${newStorylines.length}, Resolved: ${resolveDescriptions.length}`);
  return totalProcessed;
}


// ════════════════════════════════════════════════════════════════════════════
// 3. CITIZEN USAGE INTAKE → CITIZEN_MEDIA_USAGE
// ════════════════════════════════════════════════════════════════════════════

async function processCitizenUsageIntake(cycle, cal) {
  const data = await sheets.getSheetData('Citizen_Usage_Intake');
  if (data.length < 2) return 0;

  const usages = [];
  const processedRows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    if ((row[4] || '').toString().toLowerCase() === 'processed') continue;

    usages.push({
      citizenName: row[0] || '',
      usageType: row[1] || 'mentioned',
      context: row[2] || '',
      reporter: row[3] || ''
    });

    processedRows.push(i + 1);
  }

  if (usages.length === 0) return 0;

  // Write to Citizen_Media_Usage (12 columns with calendar)
  const now = new Date().toISOString();
  const rows = usages.map(u => [
    now,                    // A  Timestamp
    cycle,                  // B  Cycle
    u.citizenName,          // C  CitizenName
    u.usageType,            // D  UsageType
    u.context,              // E  Context
    u.reporter,             // F  Reporter
    cal.season,             // G  Season
    cal.holiday,            // H  Holiday
    cal.holidayPriority,    // I  HolidayPriority
    cal.isFirstFriday,      // J  IsFirstFriday
    cal.isCreationDay,      // K  IsCreationDay
    cal.sportsSeason        // L  SportsSeason
  ]);

  await sheets.appendRows('Citizen_Media_Usage', rows);

  // Mark as processed in Citizen_Usage_Intake
  const updates = processedRows.map(r => ({
    range: `Citizen_Usage_Intake!E${r}`,
    values: [['processed']]
  }));
  await sheets.batchUpdate(updates);

  return usages.length;
}


// ════════════════════════════════════════════════════════════════════════════
// 4. CITIZEN ROUTING → INTAKE / ADVANCEMENT_INTAKE1
// ════════════════════════════════════════════════════════════════════════════

function citizenExistsInLedger(ledgerData, firstName, lastName) {
  if (ledgerData.length < 2) return false;

  const headers = ledgerData[0];
  const firstCol = headers.indexOf('First');
  const lastCol = headers.indexOf('Last');
  if (firstCol < 0 || lastCol < 0) return false;

  const normFirst = firstName.toLowerCase().trim();
  const normLast = lastName.toLowerCase().trim();

  for (let r = 1; r < ledgerData.length; r++) {
    const f = (ledgerData[r][firstCol] || '').toString().toLowerCase().trim();
    const l = (ledgerData[r][lastCol] || '').toString().toLowerCase().trim();
    if (f === normFirst && l === normLast) return true;
  }
  return false;
}

async function routeCitizenUsageToIntake(cycle, cal) {
  const results = { routed: 0, newCitizens: 0, existingCitizens: 0 };

  const data = await sheets.getSheetData('Citizen_Media_Usage');
  if (data.length < 2) return results;

  const headers = data[0];

  // Find columns
  let routedCol = headers.indexOf('Routed');
  const nameCol = headers.findIndex(h => h === 'CitizenName' || h === 'Name');
  const usageTypeCol = headers.indexOf('UsageType');
  const contextCol = headers.indexOf('Context');

  if (nameCol < 0) {
    console.log('    Warning: CitizenName column not found in Citizen_Media_Usage');
    return results;
  }

  // If no Routed column exists, it's the column after the last header
  if (routedCol < 0) {
    routedCol = headers.length;
    const colLetter = String.fromCharCode(65 + routedCol);
    await sheets.updateRange(`Citizen_Media_Usage!${colLetter}1`, [['Routed']]);
  }

  // Load Simulation_Ledger for existence checks
  console.log('    Loading Simulation_Ledger for existence checks...');
  let ledgerData = [];
  try {
    ledgerData = await sheets.getSheetData('Simulation_Ledger');
    console.log(`    Loaded ${ledgerData.length - 1} ledger entries`);
  } catch (e) {
    console.log(`    Warning: Could not read Simulation_Ledger: ${e.message}`);
  }

  // Check which target sheets exist
  const sheetList = await sheets.listSheets();
  const sheetNames = sheetList.map(s => s.title);
  const hasIntake = sheetNames.includes('Intake');
  const hasAdvancement = sheetNames.includes('Advancement_Intake1') || sheetNames.includes('Advancement_Intake');
  const advSheetName = sheetNames.includes('Advancement_Intake1') ? 'Advancement_Intake1' : 'Advancement_Intake';

  const intakeRows = [];
  const advancementRows = [];
  const routeUpdates = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Skip already routed
    if (routedCol < row.length && row[routedCol] === 'Y') continue;

    const citizenName = nameCol >= 0 ? (row[nameCol] || '').toString().trim() : '';
    if (!citizenName) continue;

    const usageType = usageTypeCol >= 0 ? (row[usageTypeCol] || '').toString().trim() : '';
    const context = contextCol >= 0 ? (row[contextCol] || '').toString().trim() : '';

    // Parse full demographics from citizen name field
    const demo = parseCitizenDemographics(citizenName);
    const exists = citizenExistsInLedger(ledgerData, demo.first, demo.last);

    if (exists) {
      // Existing citizen → Advancement_Intake1
      advancementRows.push([
        demo.first,                   // A: First
        '',                           // B: Middle
        demo.last,                    // C: Last
        demo.occupation || '',        // D: RoleType (from demographics)
        '',                           // E: Tier
        '',                           // F: ClockMode
        '',                           // G: CIV
        '',                           // H: MED
        '',                           // I: UNI
        `Media usage C${cycle} (${usageType}): ${context}` // J: Notes
      ]);
      results.existingCitizens++;
    } else {
      // New citizen → Intake (16 columns)
      const birthYear = birthYearFromAge(demo.age);
      intakeRows.push([
        demo.first,                   // A: First
        '',                           // B: Middle
        demo.last,                    // C: Last
        '',                           // D: OriginGame
        'no',                         // E: UNI
        'no',                         // F: MED
        'no',                         // G: CIV
        'ENGINE',                     // H: ClockMode
        4,                            // I: Tier
        demo.occupation || 'Citizen', // J: RoleType (from demographics)
        'Active',                     // K: Status
        birthYear,                    // L: BirthYear (from age)
        'Oakland',                    // M: OriginCity
        `Introduced via Media Room C${cycle}. ${context}`, // N: LifeHistory
        '',                           // O: OriginVault
        demo.neighborhood || ''       // P: Neighborhood (from demographics)
      ]);
      results.newCitizens++;
    }

    // Mark as routed
    const colLetter = String.fromCharCode(65 + routedCol);
    routeUpdates.push({
      range: `Citizen_Media_Usage!${colLetter}${i + 1}`,
      values: [['Y']]
    });
    results.routed++;
  }

  // Write Intake rows — use explicit column range A:P
  if (intakeRows.length > 0 && hasIntake) {
    await sheets.appendRows('Intake!A:P', intakeRows);
  }

  // Write Advancement rows — use explicit column range A:J to prevent column shift
  if (advancementRows.length > 0 && hasAdvancement) {
    await sheets.appendRows(`${advSheetName}!A:J`, advancementRows);
  }

  // Mark as routed in batches of 50
  if (routeUpdates.length > 0) {
    for (let i = 0; i < routeUpdates.length; i += 50) {
      await sheets.batchUpdate(routeUpdates.slice(i, i + 50));
    }
  }

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// CLEANUP: Fix broken Advancement_Intake1 rows
// ════════════════════════════════════════════════════════════════════════════

/**
 * Fixes rows in Advancement_Intake1 where data was shifted right by N columns
 * due to the Sheets API append table-detection bug. Detects rows where column A
 * is empty but later columns contain data, then shifts the data back to column A.
 */
async function cleanupAdvancementIntake() {
  console.log('  Reading Advancement_Intake1...');
  const data = await sheets.getSheetData('Advancement_Intake1');
  if (data.length < 2) {
    console.log('  No data to clean up');
    return 0;
  }

  const headers = data[0];
  const expectedCols = headers.length; // 10 columns (A:J)
  const fixes = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const aVal = (row[0] || '').toString().trim();

    // Skip rows that already have data in column A (these are fine)
    if (aVal) continue;

    // Find first non-empty cell in this row
    let firstDataCol = -1;
    for (let c = 1; c < row.length; c++) {
      if (row[c] && row[c].toString().trim()) {
        firstDataCol = c;
        break;
      }
    }

    if (firstDataCol < 0) continue; // Completely empty row

    // This row is shifted — extract the data starting at firstDataCol
    const shiftedData = row.slice(firstDataCol, firstDataCol + expectedCols);

    // Pad to expected column count
    while (shiftedData.length < expectedCols) {
      shiftedData.push('');
    }

    const sheetRow = i + 1; // 1-indexed
    fixes.push({
      row: sheetRow,
      corrected: shiftedData,
      totalColsToWrite: Math.max(expectedCols, row.length) // need to clear the old shifted data too
    });
  }

  if (fixes.length === 0) {
    console.log('  No broken rows found');
    return 0;
  }

  console.log(`  Found ${fixes.length} broken rows to fix`);

  // Build batch updates: write corrected data to A:J and clear excess columns
  const updates = [];
  for (const fix of fixes) {
    // Write corrected data to columns A through J
    updates.push({
      range: `Advancement_Intake1!A${fix.row}:J${fix.row}`,
      values: [fix.corrected.slice(0, expectedCols)]
    });

    // Clear excess columns (K onwards) that still have old shifted data
    if (fix.totalColsToWrite > expectedCols) {
      const clearCount = fix.totalColsToWrite - expectedCols;
      const startCol = String.fromCharCode(65 + expectedCols); // 'K'
      const endCol = String.fromCharCode(65 + expectedCols + clearCount - 1);
      const clearRow = new Array(clearCount).fill('');
      updates.push({
        range: `Advancement_Intake1!${startCol}${fix.row}:${endCol}${fix.row}`,
        values: [clearRow]
      });
    }
  }

  // Execute in batches of 50
  for (let i = 0; i < updates.length; i += 50) {
    await sheets.batchUpdate(updates.slice(i, i + 50));
  }

  console.log(`  Fixed ${fixes.length} rows`);
  return fixes.length;
}


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  let cycle = parseInt(args.find(a => /^\d+$/.test(a))) || 0;
  const doCleanup = args.includes('--cleanup');

  console.log('');
  console.log('=== PROCESS MEDIA INTAKE v1.2 ===');
  console.log('');

  // Connect
  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`Connected: ${conn.title}`);
  console.log('');

  // Cleanup mode — fix broken rows then exit
  if (doCleanup) {
    console.log('=== CLEANUP MODE ===');
    console.log('');
    console.log('Fixing Advancement_Intake1 shifted rows...');
    const fixed = await cleanupAdvancementIntake();
    console.log('');
    console.log(`=== CLEANUP COMPLETE: ${fixed} rows fixed ===`);
    console.log('');
    return;
  }

  // Auto-detect cycle from Cycle_Packet if not provided
  if (!cycle) {
    const cpData = await sheets.getSheetData('Cycle_Packet');
    if (cpData.length >= 2) {
      const cycleCol = cpData[0].indexOf('Cycle');
      let maxCycle = 0;
      for (let i = 1; i < cpData.length; i++) {
        const c = parseInt(cpData[i][cycleCol >= 0 ? cycleCol : 1]) || 0;
        if (c > maxCycle) maxCycle = c;
      }
      cycle = maxCycle;
    }
    if (!cycle) {
      console.error('ERROR: Could not detect cycle. Pass it explicitly:');
      console.error('  node scripts/processIntake.js <cycle-number>');
      process.exit(1);
    }
    console.log(`Cycle: ${cycle} (auto-detected from Cycle_Packet)`);
  } else {
    console.log(`Cycle: ${cycle}`);
  }
  console.log('');

  // Get calendar context from Cycle_Packet
  console.log('Reading calendar context from Cycle_Packet...');
  const cal = await getCalendarContext(cycle);
  console.log(`  Season: ${cal.season}, Holiday: ${cal.holiday} (${cal.holidayPriority})`);
  console.log(`  FirstFriday: ${cal.isFirstFriday}, Sports: ${cal.sportsSeason}, Month: ${cal.month}`);
  console.log('');

  // Step 1: Articles
  console.log('Step 1: Processing articles (Media_Intake -> Press_Drafts)...');
  const articleCount = await processArticleIntake(cycle, cal);
  console.log(`  -> ${articleCount} articles written to Press_Drafts`);
  console.log('');

  // Step 2: Storylines
  console.log('Step 2: Processing storylines (Storyline_Intake -> Storyline_Tracker)...');
  const storylineCount = await processStorylineIntake(cycle, cal);
  console.log(`  -> ${storylineCount} storylines processed`);
  console.log('');

  // Step 3: Citizen Usage
  console.log('Step 3: Processing citizens (Citizen_Usage_Intake -> Citizen_Media_Usage)...');
  const citizenCount = await processCitizenUsageIntake(cycle, cal);
  console.log(`  -> ${citizenCount} citizen usages written to Citizen_Media_Usage`);
  console.log('');

  // Step 4: Citizen Routing
  console.log('Step 4: Routing citizens (Citizen_Media_Usage -> Intake/Advancement)...');
  const routing = await routeCitizenUsageToIntake(cycle, cal);
  console.log(`  -> Routed: ${routing.routed} (new: ${routing.newCitizens}, existing: ${routing.existingCitizens})`);
  console.log('');

  // Summary
  console.log('=== PROCESSING COMPLETE ===');
  console.log(`  Articles:   ${articleCount} -> Press_Drafts`);
  console.log(`  Storylines: ${storylineCount} -> Storyline_Tracker`);
  console.log(`  Citizens:   ${citizenCount} -> Citizen_Media_Usage`);
  console.log(`  Routing:    ${routing.routed} (${routing.newCitizens} new, ${routing.existingCitizens} existing)`);
  console.log(`  Calendar:   ${cal.season} / ${cal.holiday} (${cal.holidayPriority}) / FF:${cal.isFirstFriday}`);
  console.log('');
}

main().catch(err => {
  console.error('');
  console.error('ERROR:', err.message);
  if (err.response && err.response.data) {
    console.error('API Response:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
