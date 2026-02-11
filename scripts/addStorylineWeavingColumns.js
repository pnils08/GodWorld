/**
 * ============================================================================
 * STORYLINE WEAVING MIGRATION (Week 3)
 * ============================================================================
 *
 * Adds 4 new columns to Storyline_Tracker for multi-citizen storyline weaving,
 * cross-storyline conflict detection, and relationship impact tracking.
 *
 * SCHEMA CHANGES:
 *
 * Storyline_Tracker (+4):
 *   - CitizenRoles (JSON) - Role mapping: {"POP-123": "protagonist", "CUL-045": "witness"}
 *   - ConflictType (enum) - personal/political/economic/romantic/ideological
 *   - RelationshipImpact (JSON) - Predicted relationship changes
 *   - CrossStorylineLinks (JSON) - Other storylines with shared citizens
 *
 * Total: 4 new columns
 *
 * Usage:
 *   node scripts/addStorylineWeavingColumns.js
 *   node scripts/addStorylineWeavingColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

const STORYLINE_TRACKER_ADDITIONS = [
  { name: 'CitizenRoles', defaultValue: '{}' },
  { name: 'ConflictType', defaultValue: '' },
  { name: 'RelationshipImpact', defaultValue: '{}' },
  { name: 'CrossStorylineLinks', defaultValue: '[]' }
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
  console.log('║   STORYLINE WEAVING MIGRATION (Week 3)                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}`);

  const results = {
    Storyline_Tracker: { added: 0, skipped: 0 }
  };

  // Add columns to Storyline_Tracker
  results.Storyline_Tracker = await addColumnsToSheet('Storyline_Tracker', STORYLINE_TRACKER_ADDITIONS, dryRun);

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
    console.log('1. Deploy storylineWeavingEngine.js to Apps Script');
    console.log('2. Wire into Phase 07 media processing');
    console.log('3. Run a test cycle to verify cross-storyline detection');
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
