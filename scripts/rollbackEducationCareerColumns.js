/**
 * ============================================================================
 * ROLLBACK: EDUCATION PIPELINE & CAREER PATHWAYS (Week 3 - Consolidated)
 * ============================================================================
 *
 * Removes columns added by addEducationCareerColumns.js migration.
 *
 * WARNING: This will delete all education and career progression data.
 * Use only if you need to completely roll back the Week 3 enhancement.
 *
 * Columns removed:
 * - Neighborhood_Demographics: SchoolQualityIndex, GraduationRate,
 *   CollegeReadinessRate, TeacherQuality, Funding (5 columns)
 * - Simulation_Ledger: EducationLevel, SchoolQuality, CareerStage,
 *   YearsInCareer, CareerMobility, LastPromotionCycle (6 columns)
 *
 * Total: 11 columns removed
 *
 * Note: Week 3 consolidated version does NOT create a separate School_Quality
 * sheet, so no sheet deletion is needed.
 *
 * Usage:
 *   node scripts/rollbackEducationCareerColumns.js
 *   node scripts/rollbackEducationCareerColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMNS TO REMOVE
// ════════════════════════════════════════════════════════════════════════════

const ROLLBACK_DEFINITIONS = {
  'Neighborhood_Demographics': [
    'SchoolQualityIndex',
    'GraduationRate',
    'CollegeReadinessRate',
    'TeacherQuality',
    'Funding'
  ],
  'Simulation_Ledger': [
    'EducationLevel',
    'SchoolQuality',
    'CareerStage',
    'YearsInCareer',
    'CareerMobility',
    'LastPromotionCycle'
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
    console.log(`\n⏭️  Columns not found (already removed?):`)
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


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   ROLLBACK: EDUCATION PIPELINE & CAREER PATHWAYS (Week 3)         ║');
  console.log('║   Consolidated Architecture Version                               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  } else {
    console.log('⚠️  WARNING: This will DELETE all education and career data!');
    console.log('   This action cannot be undone.');
    console.log('');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}`);

  const results = {
    columns: {}
  };

  // Remove columns
  for (const sheetName of Object.keys(ROLLBACK_DEFINITIONS)) {
    const columnsToRemove = ROLLBACK_DEFINITIONS[sheetName];
    results.columns[sheetName] = await removeColumnsFromSheet(sheetName, columnsToRemove, dryRun);
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('ROLLBACK SUMMARY');
  console.log('='.repeat(70));

  const totalRemoved = Object.values(results.columns)
    .reduce((sum, r) => sum + r.removed, 0);

  console.log(`\nColumns removed from Neighborhood_Demographics: ${results.columns['Neighborhood_Demographics'].removed}`);
  console.log(`Columns removed from Simulation_Ledger: ${results.columns['Simulation_Ledger'].removed}`);
  console.log(`Total columns removed: ${totalRemoved}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would remove ${totalRemoved} columns total`);
    console.log('\nRun without --dry-run to apply rollback');
  } else {
    console.log(`\n✅ Rollback complete!`);
    console.log('\nNext steps:');
    console.log('1. Remove educationCareerEngine.js from Apps Script');
    console.log('2. Remove processEducationCareer_() call from Phase 05');
    console.log('3. Verify simulation runs without errors');
    console.log('\nNote: No sheets deleted (consolidated architecture)');
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
