/**
 * ============================================================================
 * STORYLINE RESOLUTION & HOOK LIFECYCLE MIGRATION (Week 4)
 * ============================================================================
 *
 * Adds 8 new columns across 2 sheets for storyline health monitoring,
 * resolution triggers, and hook lifecycle management.
 *
 * SCHEMA CHANGES:
 *
 * Storyline_Tracker (+4):
 *   - ResolutionCondition (text) - What makes this story "done"?
 *   - StaleAfterCycles (number) - Mark stale if no coverage for N cycles (default 10)
 *   - IsStale (bool) - Flag for dormant storylines
 *   - WrapUpGenerated (bool) - Has wrap-up hook been created?
 *
 * Story_Hook_Deck (+4):
 *   - HookAge (number) - Cycles since generation
 *   - ExpiresAfter (number) - Remove if unused for N cycles (default 5)
 *   - IsExpired (bool) - Should be archived
 *   - PickupCycle (number) - When hook was used in edition
 *
 * Total: 8 new columns
 *
 * Usage:
 *   node scripts/addStorylineResolutionColumns.js
 *   node scripts/addStorylineResolutionColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

const STORYLINE_TRACKER_ADDITIONS = [
  { name: 'ResolutionCondition', defaultValue: '' },
  { name: 'StaleAfterCycles', defaultValue: 10 },
  { name: 'IsStale', defaultValue: false },
  { name: 'WrapUpGenerated', defaultValue: false }
];

const STORY_HOOK_DECK_ADDITIONS = [
  { name: 'HookAge', defaultValue: 0 },
  { name: 'ExpiresAfter', defaultValue: 5 },
  { name: 'IsExpired', defaultValue: false },
  { name: 'PickupCycle', defaultValue: '' }
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


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   STORYLINE RESOLUTION & HOOK LIFECYCLE MIGRATION (Week 4)        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}`);

  const results = {
    Storyline_Tracker: { added: 0, skipped: 0 },
    Story_Hook_Deck: { added: 0, skipped: 0 }
  };

  // Add columns to each sheet
  results.Storyline_Tracker = await addColumnsToSheet('Storyline_Tracker', STORYLINE_TRACKER_ADDITIONS, dryRun);
  results.Story_Hook_Deck = await addColumnsToSheet('Story_Hook_Deck', STORY_HOOK_DECK_ADDITIONS, dryRun);

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(70));

  const totalAdded = Object.values(results)
    .reduce((sum, r) => sum + r.added, 0);

  const totalSkipped = Object.values(results)
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
    console.log('1. Deploy storylineHealthEngine.js to Apps Script');
    console.log('2. Update storyHook.js to v4.0 (hook lifecycle)');
    console.log('3. Wire into Phase 06 processing');
    console.log('4. Run a test cycle to verify stale detection');
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
