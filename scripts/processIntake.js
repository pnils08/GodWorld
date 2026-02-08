/**
 * ============================================================================
 * PROCESS MEDIA INTAKE v1.0
 * ============================================================================
 *
 * Node.js equivalent of processMediaIntakeV2() from mediaRoomIntake.js.
 * Moves data from intake sheets to final ledger sheets.
 *
 * Usage:
 *   node scripts/processIntake.js [cycle-number]
 *
 * Processes:
 *   1. Media_Intake → Press_Drafts (14 cols with calendar)
 *   2. Storyline_Intake → Storyline_Tracker (14 cols, with resolution)
 *   3. Citizen_Usage_Intake → Citizen_Media_Usage (12 cols)
 *   4. Citizen_Media_Usage → Intake / Advancement_Intake1 (routing)
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');


// ════════════════════════════════════════════════════════════════════════════
// CALENDAR CONTEXT
// ════════════════════════════════════════════════════════════════════════════

async function getCalendarContext() {
  const defaults = {
    season: '',
    holiday: 'none',
    holidayPriority: 'none',
    isFirstFriday: false,
    isCreationDay: false,
    sportsSeason: 'off-season'
  };

  try {
    const data = await sheets.getSheetData('World_Population');
    if (data.length < 2) return defaults;

    const headers = data[0];
    const row = data[1];
    const idx = (name) => headers.indexOf(name);

    if (idx('season') >= 0) defaults.season = row[idx('season')] || '';
    if (idx('holiday') >= 0) defaults.holiday = row[idx('holiday')] || 'none';
    if (idx('holidayPriority') >= 0) defaults.holidayPriority = row[idx('holidayPriority')] || 'none';
    if (idx('isFirstFriday') >= 0) defaults.isFirstFriday = row[idx('isFirstFriday')] === true || row[idx('isFirstFriday')] === 'TRUE';
    if (idx('isCreationDay') >= 0) defaults.isCreationDay = row[idx('isCreationDay')] === true || row[idx('isCreationDay')] === 'TRUE';
    if (idx('sportsSeason') >= 0) defaults.sportsSeason = row[idx('sportsSeason')] || 'off-season';

    return defaults;
  } catch (e) {
    console.log(`  Warning: Could not read World_Population: ${e.message}`);
    return defaults;
  }
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
              // Use 1-indexed row, and column letter from index
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

function splitName(fullField) {
  // Handle "Name, Age, Neighborhood, Occupation" format
  const namePart = fullField.split(',')[0].trim();
  const parts = namePart.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

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
    // Add the header
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

    const nameParts = splitName(citizenName);
    const exists = citizenExistsInLedger(ledgerData, nameParts.first, nameParts.last);

    if (exists) {
      advancementRows.push([
        nameParts.first,          // A: First
        '',                       // B: Middle
        nameParts.last,           // C: Last
        '',                       // D: RoleType
        '',                       // E: Tier
        '',                       // F: ClockMode
        '',                       // G: CIV
        '',                       // H: MED
        '',                       // I: UNI
        `Media usage C${cycle} (${usageType}): ${context}` // J: Notes
      ]);
      results.existingCitizens++;
    } else {
      intakeRows.push([
        nameParts.first,          // A: First
        '',                       // B: Middle
        nameParts.last,           // C: Last
        '',                       // D: OriginGame
        'no',                     // E: UNI
        'no',                     // F: MED
        'no',                     // G: CIV
        'ENGINE',                 // H: ClockMode
        4,                        // I: Tier
        'Citizen',                // J: RoleType
        'Active',                 // K: Status
        '',                       // L: BirthYear
        'Oakland',                // M: OriginCity
        `Introduced via Media Room C${cycle}. ${context}`, // N: LifeHistory
        '',                       // O: OriginVault
        ''                        // P: Neighborhood
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

  // Write batches
  if (intakeRows.length > 0 && hasIntake) {
    await sheets.appendRows('Intake', intakeRows);
  }
  if (advancementRows.length > 0 && hasAdvancement) {
    await sheets.appendRows(advSheetName, advancementRows);
  }
  if (routeUpdates.length > 0) {
    // Batch in chunks of 50 to avoid API limits
    for (let i = 0; i < routeUpdates.length; i += 50) {
      await sheets.batchUpdate(routeUpdates.slice(i, i + 50));
    }
  }

  return results;
}


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const cycle = parseInt(process.argv[2]) || 79;

  console.log('');
  console.log('=== PROCESS MEDIA INTAKE v1.0 ===');
  console.log(`Cycle: ${cycle}`);
  console.log('');

  // Connect
  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`Connected: ${conn.title}`);
  console.log('');

  // Get calendar context
  console.log('Reading calendar context...');
  const cal = await getCalendarContext();
  console.log(`  Season: ${cal.season}, Holiday: ${cal.holiday} (${cal.holidayPriority})`);
  console.log(`  FirstFriday: ${cal.isFirstFriday}, Sports: ${cal.sportsSeason}`);
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
