/**
 * ============================================================================
 * ROLLBACK: STORYLINE WEAVING COLUMNS (Week 3)
 * ============================================================================
 *
 * Removes the 4 columns added by addStorylineWeavingColumns.js migration.
 *
 * WARNING: This will delete all storyline weaving data. Use only if you
 * need to completely roll back the Week 3 enhancement.
 *
 * Columns removed:
 * - Storyline_Tracker: CitizenRoles, ConflictType, RelationshipImpact,
 *   CrossStorylineLinks (4 columns)
 *
 * Usage:
 *   node scripts/rollbackStorylineWeavingColumns.js
 *   node scripts/rollbackStorylineWeavingColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMNS TO REMOVE
// ════════════════════════════════════════════════════════════════════════════

const ROLLBACK_DEFINITIONS = {
  'Storyline_Tracker': [
    'CitizenRoles',
    'ConflictType',
    'RelationshipImpact',
    'CrossStorylineLinks'
  ]
};


// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

async function removeColumnsFromSheet(sheetName, columnsToRemove, dryRun = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Sheet: ${sheetName}`);
  console.log('='.repeat(70));

  const data = await sheets.getSheetAsObjects(sheetName);
  if (data.length === 0) {
    console.log(`⚠️  Sheet ${sheetName} is empty or not found`);
    return { removed: 0, notFound: 0 };
  }

  const existingHeaders = Object.keys(data[0]);
  console.log(`Current column count: ${existingHeaders.length}`);

  const columnsFound = [];
  const columnsNotFound = [];

  for (const colName of columnsToRemove) {
    if (existingHeaders.includes(colName)) {
      columnsFound.push(colName);
    } else {
      columnsNotFound.push(colName);
    }
  }

  console.log(`\nColumns to remove: ${columnsFound.length}`);
  console.log(`Not found: ${columnsNotFound.length}`);

  if (columnsNotFound.length > 0) {
    console.log(`\n⏭️  Columns not found (already removed?):`);
    columnsNotFound.forEach(name => console.log(`   - ${name}`));
  }

  if (columnsFound.length === 0) {
    console.log(`\n✅ No columns to remove from ${sheetName}`);
    return { removed: 0, notFound: columnsNotFound.length };
  }

  console.log(`\n🗑️  Columns to remove:`);
  columnsFound.forEach(col => console.log(`   - ${col}`));

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would remove ${columnsFound.length} columns`);
    return { removed: 0, notFound: columnsNotFound.length, wouldRemove: columnsFound.length };
  }

  // WARNING: Ask for confirmation
  console.log(`\n⚠️  WARNING: This will delete all data in these columns!`);
  console.log(`   Waiting 5 seconds before proceeding...`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Delete columns (in reverse order to preserve indices)
  const rawData = await sheets.getRawSheetData(sheetName);
  const headers = rawData[0];

  const indicesToRemove = columnsFound
    .map(colName => headers.indexOf(colName))
    .filter(idx => idx >= 0)
    .sort((a, b) => b - a); // Reverse order

  for (const colIndex of indicesToRemove) {
    await sheets.deleteColumn(sheetName, colIndex);
    console.log(`   Deleted column ${colIndex + 1}: ${headers[colIndex]}`);
  }

  console.log(`\n✅ Successfully removed ${columnsFound.length} columns from ${sheetName}`);
  console.log(`   New column count: ${existingHeaders.length - columnsFound.length}`);

  return { removed: columnsFound.length, notFound: columnsNotFound.length };
}


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   ROLLBACK: STORYLINE WEAVING MIGRATION (Week 3)                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  } else {
    console.log('⚠️  WARNING: This will DELETE all storyline weaving columns and data!');
    console.log('   This action cannot be undone.');
    console.log('');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}`);

  const results = {};

  for (const sheetName of Object.keys(ROLLBACK_DEFINITIONS)) {
    const columnsToRemove = ROLLBACK_DEFINITIONS[sheetName];
    results[sheetName] = await removeColumnsFromSheet(sheetName, columnsToRemove, dryRun);
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('ROLLBACK SUMMARY');
  console.log('='.repeat(70));

  const totalRemoved = Object.values(results)
    .reduce((sum, r) => sum + r.removed, 0);

  const totalNotFound = Object.values(results)
    .reduce((sum, r) => sum + r.notFound, 0);

  console.log(`\nColumns removed: ${totalRemoved}`);
  console.log(`Not found: ${totalNotFound}`);

  if (dryRun) {
    const totalWouldRemove = Object.values(results)
      .filter(r => r.wouldRemove !== undefined)
      .reduce((sum, r) => sum + r.wouldRemove, 0);
    console.log(`\n🔍 DRY RUN: Would remove ${totalWouldRemove} columns`);
    console.log('\nRun without --dry-run to apply rollback');
  } else {
    console.log(`\n✅ Rollback complete!`);
    console.log('\nNext steps:');
    console.log('1. Remove storylineWeavingEngine.js from Apps Script');
    console.log('2. Remove weaveStorylines_() call from Phase 07 processing');
    console.log('3. Verify simulation runs without errors');
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
