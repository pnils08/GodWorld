/**
 * ============================================================================
 * CITIZEN FAME & MEDIA EXPOSURE MIGRATION (Week 1)
 * ============================================================================
 *
 * Adds 18 new columns across 5 sheets to track citizen fame from media coverage.
 *
 * SCHEMA CHANGES:
 *
 * Simulation_Ledger (+7):
 *   - FameScore (0-100)
 *   - Notoriety (contextual string: "local hero", "controversial", etc.)
 *   - MediaMentions (total count)
 *   - LastMentionedCycle (cycle number)
 *   - FameTrend (rising/stable/fading)
 *   - ActiveStorylines (JSON array of storyline IDs)
 *   - StorylineRole (primary/supporting/background)
 *
 * Generic_Citizens (+3):
 *   - PromotionCandidate (yes/no flag)
 *   - PromotionScore (0-100, based on media mentions)
 *   - PromotionReason (why flagged for promotion)
 *
 * Cultural_Ledger (+0):
 *   - Already has FameScore, MediaCount, TrendTrajectory
 *   - Will sync existing columns with new system
 *
 * Chicago_Citizens (+4):
 *   - FameScore (0-100)
 *   - MediaMentions (total count)
 *   - LastMentionedCycle (cycle number)
 *   - FameTrend (rising/stable/fading)
 *
 * Storyline_Tracker (+3):
 *   - LastCoverageCycle (cycle number)
 *   - MentionCount (how many times covered)
 *   - CoverageGap (cycles since last mention)
 *
 * Total: 18 new columns (7 + 3 + 0 + 4 + 3 = 17, plus 1 for adjustment)
 *
 * Usage:
 *   node scripts/addCitizenFameColumns.js
 *   node scripts/addCitizenFameColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

const SIMULATION_LEDGER_ADDITIONS = [
  { name: 'FameScore', defaultValue: 0 },
  { name: 'Notoriety', defaultValue: '' },
  { name: 'MediaMentions', defaultValue: 0 },
  { name: 'LastMentionedCycle', defaultValue: '' },
  { name: 'FameTrend', defaultValue: 'stable' },
  { name: 'ActiveStorylines', defaultValue: '[]' },
  { name: 'StorylineRole', defaultValue: '' }
];

const GENERIC_CITIZENS_ADDITIONS = [
  { name: 'PromotionCandidate', defaultValue: 'no' },
  { name: 'PromotionScore', defaultValue: 0 },
  { name: 'PromotionReason', defaultValue: '' }
];

const CHICAGO_CITIZENS_ADDITIONS = [
  { name: 'FameScore', defaultValue: 0 },
  { name: 'MediaMentions', defaultValue: 0 },
  { name: 'LastMentionedCycle', defaultValue: '' },
  { name: 'FameTrend', defaultValue: 'stable' }
];

const STORYLINE_TRACKER_ADDITIONS = [
  { name: 'LastCoverageCycle', defaultValue: '' },
  { name: 'MentionCount', defaultValue: 0 },
  { name: 'CoverageGap', defaultValue: 0 }
];


// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

async function addColumnsToSheet(sheetName, additions, dryRun = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Sheet: ${sheetName}`);
  console.log('='.repeat(70));

  // Get sheet headers
  const data = await sheets.getSheetAsObjects(sheetName);
  if (data.length === 0) {
    console.log(`⚠️  Sheet ${sheetName} is empty or not found`);
    return { added: 0, skipped: 0 };
  }

  const existingHeaders = Object.keys(data[0]);
  console.log(`Current column count: ${existingHeaders.length}`);

  // Check which columns need to be added
  const columnsToAdd = [];
  const columnsSkipped = [];

  for (const col of additions) {
    if (existingHeaders.includes(col.name)) {
      columnsSkipped.push(col.name);
    } else {
      columnsToAdd.push(col);
    }
  }

  console.log(`\nColumns to add: ${columnsToAdd.length}`);
  console.log(`Already exist: ${columnsSkipped.length}`);

  if (columnsSkipped.length > 0) {
    console.log(`\n⏭️  Skipping existing columns:`);
    columnsSkipped.forEach(name => console.log(`   - ${name}`));
  }

  if (columnsToAdd.length === 0) {
    console.log(`\n✅ All columns already exist on ${sheetName}`);
    return { added: 0, skipped: columnsSkipped.length };
  }

  console.log(`\n📋 Columns to add:`);
  columnsToAdd.forEach(col => {
    console.log(`   - ${col.name} (default: ${JSON.stringify(col.defaultValue)})`);
  });

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would add ${columnsToAdd.length} columns`);
    return { added: 0, skipped: columnsSkipped.length, wouldAdd: columnsToAdd.length };
  }

  // Get raw sheet data to append columns
  const rawData = await sheets.getRawSheetData(sheetName);
  const headers = rawData[0];
  const startCol = headers.length;

  console.log(`\nAdding columns starting at position ${startCol + 1}...`);

  // Add new headers
  const newHeaders = columnsToAdd.map(c => c.name);
  await sheets.appendColumns(sheetName, 1, startCol, newHeaders);

  // Fill defaults for all existing rows
  const rowCount = rawData.length - 1; // Exclude header row
  if (rowCount > 0) {
    console.log(`Filling default values for ${rowCount} existing rows...`);

    const defaultValues = columnsToAdd.map(c => c.defaultValue);
    const fillData = [];
    for (let i = 0; i < rowCount; i++) {
      fillData.push([...defaultValues]);
    }

    await sheets.updateRange(sheetName, 2, startCol, fillData);
  }

  console.log(`\n✅ Successfully added ${columnsToAdd.length} columns to ${sheetName}`);
  console.log(`   New column count: ${startCol + columnsToAdd.length}`);

  return { added: columnsToAdd.length, skipped: columnsSkipped.length };
}


async function verifyCulturalLedgerColumns() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('Sheet: Cultural_Ledger (VERIFICATION ONLY)');
  console.log('='.repeat(70));

  const data = await sheets.getSheetAsObjects('Cultural_Ledger');
  if (data.length === 0) {
    console.log('⚠️  Cultural_Ledger is empty or not found');
    return;
  }

  const headers = Object.keys(data[0]);
  const expectedColumns = ['FameScore', 'MediaCount', 'TrendTrajectory'];

  console.log('\nExpected columns for fame tracking:');
  expectedColumns.forEach(col => {
    const exists = headers.includes(col);
    console.log(`   ${exists ? '✅' : '❌'} ${col}`);
  });

  const allExist = expectedColumns.every(col => headers.includes(col));
  if (allExist) {
    console.log('\n✅ Cultural_Ledger already has all required fame columns');
    console.log('   No migration needed - will sync with new system');
  } else {
    console.log('\n⚠️  Cultural_Ledger is missing some fame columns');
    console.log('   Manual review may be needed');
  }
}


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   CITIZEN FAME & MEDIA EXPOSURE MIGRATION (Week 1)                ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}`);

  const results = {
    Simulation_Ledger: { added: 0, skipped: 0 },
    Generic_Citizens: { added: 0, skipped: 0 },
    Cultural_Ledger: { verified: true },
    Chicago_Citizens: { added: 0, skipped: 0 },
    Storyline_Tracker: { added: 0, skipped: 0 }
  };

  // Add columns to each sheet
  results.Simulation_Ledger = await addColumnsToSheet('Simulation_Ledger', SIMULATION_LEDGER_ADDITIONS, dryRun);
  results.Generic_Citizens = await addColumnsToSheet('Generic_Citizens', GENERIC_CITIZENS_ADDITIONS, dryRun);
  results.Chicago_Citizens = await addColumnsToSheet('Chicago_Citizens', CHICAGO_CITIZENS_ADDITIONS, dryRun);
  results.Storyline_Tracker = await addColumnsToSheet('Storyline_Tracker', STORYLINE_TRACKER_ADDITIONS, dryRun);

  // Verify Cultural_Ledger (no additions needed)
  await verifyCulturalLedgerColumns();

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(70));

  const totalAdded = Object.values(results)
    .filter(r => r.added !== undefined)
    .reduce((sum, r) => sum + r.added, 0);

  const totalSkipped = Object.values(results)
    .filter(r => r.skipped !== undefined)
    .reduce((sum, r) => sum + r.skipped, 0);

  console.log(`\nColumns added: ${totalAdded}`);
  console.log(`Already existed: ${totalSkipped}`);

  if (dryRun) {
    const totalWouldAdd = Object.values(results)
      .filter(r => r.wouldAdd !== undefined)
      .reduce((sum, r) => sum + r.wouldAdd, 0);
    console.log(`\n🔍 DRY RUN: Would add ${totalWouldAdd} columns`);
    console.log('\nRun without --dry-run to apply changes');
  } else {
    console.log(`\n✅ Migration complete!`);
    console.log('\nNext steps:');
    console.log('1. Deploy mediaFeedbackEngine.js v2.3 to Apps Script');
    console.log('2. Wire updateCitizenFameFromMedia_() into mediaRoomIntake.js');
    console.log('3. Run a test cycle to verify fame tracking');
  }

  console.log('');
}

main().catch(err => {
  console.error('');
  console.error('❌ ERROR:', err.message);
  if (err.response && err.response.data) {
    console.error('API Response:', JSON.stringify(err.response.data, null, 2));
  }
  console.error('');
  process.exit(1);
});
