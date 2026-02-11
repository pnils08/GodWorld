/**
 * ============================================================================
 * ROLLBACK: HOUSEHOLD FORMATION & FAMILY TREES (Week 1)
 * ============================================================================
 *
 * Removes columns and sheets added by addHouseholdFamilyColumns.js migration.
 *
 * WARNING: This will delete all household and family relationship data.
 * Use only if you need to completely roll back the Week 1 enhancement.
 *
 * Columns removed:
 * - Simulation_Ledger: HouseholdId, MaritalStatus, NumChildren,
 *   ParentIds, ChildrenIds (5 columns)
 *
 * Sheets deleted:
 * - Household_Ledger
 * - Family_Relationships
 *
 * Usage:
 *   node scripts/rollbackHouseholdFamilyColumns.js
 *   node scripts/rollbackHouseholdFamilyColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMNS TO REMOVE
// ════════════════════════════════════════════════════════════════════════════

const ROLLBACK_DEFINITIONS = {
  'Simulation_Ledger': [
    'HouseholdId',
    'MaritalStatus',
    'NumChildren',
    'ParentIds',
    'ChildrenIds'
  ]
};

const SHEETS_TO_DELETE = [
  'Household_Ledger',
  'Family_Relationships'
];


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

  console.log(`\n⚠️  WARNING: This will delete all data in these columns!`);
  console.log(`   Waiting 5 seconds before proceeding...`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  const rawData = await sheets.getRawSheetData(sheetName);
  const headers = rawData[0];

  const indicesToRemove = columnsFound
    .map(colName => headers.indexOf(colName))
    .filter(idx => idx >= 0)
    .sort((a, b) => b - a);

  for (const colIndex of indicesToRemove) {
    await sheets.deleteColumn(sheetName, colIndex);
    console.log(`   Deleted column ${colIndex + 1}: ${headers[colIndex]}`);
  }

  console.log(`\n✅ Successfully removed ${columnsFound.length} columns from ${sheetName}`);
  console.log(`   New column count: ${existingHeaders.length - columnsFound.length}`);

  return { removed: columnsFound.length, notFound: columnsNotFound.length };
}

async function deleteSheet(sheetName, dryRun = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Sheet to delete: ${sheetName}`);
  console.log('='.repeat(70));

  try {
    const data = await sheets.getSheetAsObjects(sheetName);
    console.log(`Sheet exists with ${data.length} rows`);

    if (dryRun) {
      console.log(`\n🔍 DRY RUN: Would delete sheet "${sheetName}"`);
      return { deleted: false, wouldDelete: true };
    }

    console.log(`\n⚠️  WARNING: This will permanently delete sheet "${sheetName}"!`);
    console.log(`   Waiting 3 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    await sheets.deleteSheet(sheetName);
    console.log(`\n✅ Successfully deleted sheet "${sheetName}"`);
    return { deleted: true };

  } catch (err) {
    console.log(`\n⏭️  Sheet "${sheetName}" does not exist`);
    return { deleted: false, notFound: true };
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
  console.log('║   ROLLBACK: HOUSEHOLD FORMATION & FAMILY TREES (Week 1)           ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  } else {
    console.log('⚠️  WARNING: This will DELETE all household and family data!');
    console.log('   This action cannot be undone.');
    console.log('');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}`);

  const results = {
    columns: {},
    sheets: {}
  };

  // Remove columns
  for (const sheetName of Object.keys(ROLLBACK_DEFINITIONS)) {
    const columnsToRemove = ROLLBACK_DEFINITIONS[sheetName];
    results.columns[sheetName] = await removeColumnsFromSheet(sheetName, columnsToRemove, dryRun);
  }

  // Delete sheets
  for (const sheetName of SHEETS_TO_DELETE) {
    results.sheets[sheetName] = await deleteSheet(sheetName, dryRun);
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('ROLLBACK SUMMARY');
  console.log('='.repeat(70));

  const totalRemoved = Object.values(results.columns)
    .reduce((sum, r) => sum + r.removed, 0);

  const sheetsDeleted = Object.values(results.sheets)
    .filter(r => r.deleted).length;

  console.log(`\nColumns removed: ${totalRemoved}`);
  console.log(`Sheets deleted: ${sheetsDeleted}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would remove ${totalRemoved} columns and delete ${sheetsDeleted} sheets`);
    console.log('\nRun without --dry-run to apply rollback');
  } else {
    console.log(`\n✅ Rollback complete!`);
    console.log('\nNext steps:');
    console.log('1. Remove householdFormationEngine.js from Apps Script');
    console.log('2. Remove processHouseholdFormation_() call from Phase 05');
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
