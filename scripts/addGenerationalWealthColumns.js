/**
 * ============================================================================
 * GENERATIONAL WEALTH & INHERITANCE MIGRATION (Week 2)
 * ============================================================================
 *
 * Adds wealth tracking, inheritance mechanics, and home ownership.
 *
 * SCHEMA CHANGES:
 *
 * Simulation_Ledger (+6):
 *   - WealthLevel (0-10 scale: 0=poverty, 5=middle, 10=wealthy)
 *   - Income (annual income in dollars, derived from career)
 *   - InheritanceReceived (total inheritance received, $)
 *   - NetWorth (estimated: savings + home equity - debts)
 *   - SavingsRate (% of income saved per cycle, 0.0-1.0)
 *   - DebtLevel (0-10 scale: 0=debt-free, 10=severe debt)
 *
 * Household_Ledger (+6):
 *   - HouseholdWealth (aggregated wealth level 0-10)
 *   - HomeOwnership (boolean: true if owned, false if rented)
 *   - HomeValue ($, if owned)
 *   - MortgageBalance ($, if owned)
 *   - SavingsBalance ($)
 *   - DebtBalance ($)
 *
 * Family_Relationships (+2):
 *   - InheritanceAmount ($, for parent-child relationships)
 *   - InheritanceCycle (when inheritance transferred)
 *
 * Total: 14 new columns across 3 sheets
 *
 * Usage:
 *   node scripts/addGenerationalWealthColumns.js
 *   node scripts/addGenerationalWealthColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

const SIMULATION_LEDGER_ADDITIONS = [
  { name: 'WealthLevel', defaultValue: 5 },           // Start at middle class
  { name: 'Income', defaultValue: 50000 },            // Estimate, will be recalculated
  { name: 'InheritanceReceived', defaultValue: 0 },
  { name: 'NetWorth', defaultValue: 0 },
  { name: 'SavingsRate', defaultValue: 0.05 },        // 5% savings rate
  { name: 'DebtLevel', defaultValue: 2 }              // Low debt
];

const HOUSEHOLD_LEDGER_ADDITIONS = [
  { name: 'HouseholdWealth', defaultValue: 5 },
  { name: 'HomeOwnership', defaultValue: false },
  { name: 'HomeValue', defaultValue: 0 },
  { name: 'MortgageBalance', defaultValue: 0 },
  { name: 'SavingsBalance', defaultValue: 5000 },
  { name: 'DebtBalance', defaultValue: 0 }
];

const FAMILY_RELATIONSHIPS_ADDITIONS = [
  { name: 'InheritanceAmount', defaultValue: 0 },
  { name: 'InheritanceCycle', defaultValue: '' }
];


// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

async function addColumnsToSheet(sheetName, additions, dryRun = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Sheet: ${sheetName}`);
  console.log('='.repeat(70));

  const data = await sheets.getSheetAsObjects(sheetName);
  if (data.length === 0) {
    console.log(`⚠️  Sheet ${sheetName} is empty or not found`);
    return { added: 0, skipped: 0 };
  }

  const existingHeaders = Object.keys(data[0]);
  console.log(`Current column count: ${existingHeaders.length}`);

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

  const rawData = await sheets.getRawSheetData(sheetName);
  const headers = rawData[0];
  const startCol = headers.length;

  console.log(`\nAdding columns starting at position ${startCol + 1}...`);

  const newHeaders = columnsToAdd.map(c => c.name);
  await sheets.appendColumns(sheetName, 1, startCol, newHeaders);

  const rowCount = rawData.length - 1;
  if (rowCount > 0) {
    console.log(`Filling default values for ${rowCount} existing rows...`);

    const defaultValues = columnsToAdd.map(c => c.defaultValue);
    const fillData = [];
    for (let i = 0; i < rowCount; i++) {
      fillData.push([...defaultValues]);
    }

    await sheets.updateRangeByPosition(sheetName, 2, startCol, fillData);
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
  console.log('║   GENERATIONAL WEALTH & INHERITANCE MIGRATION (Week 2)            ║');
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
    Household_Ledger: { added: 0, skipped: 0 },
    Family_Relationships: { added: 0, skipped: 0 }
  };

  // Add columns to existing sheets
  results.Simulation_Ledger = await addColumnsToSheet('Simulation_Ledger', SIMULATION_LEDGER_ADDITIONS, dryRun);
  results.Household_Ledger = await addColumnsToSheet('Household_Ledger', HOUSEHOLD_LEDGER_ADDITIONS, dryRun);
  results.Family_Relationships = await addColumnsToSheet('Family_Relationships', FAMILY_RELATIONSHIPS_ADDITIONS, dryRun);

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(70));

  const totalAdded = results.Simulation_Ledger.added +
                     results.Household_Ledger.added +
                     results.Family_Relationships.added;

  console.log(`\nColumns added: ${totalAdded}`);
  console.log(`  - Simulation_Ledger: ${results.Simulation_Ledger.added}`);
  console.log(`  - Household_Ledger: ${results.Household_Ledger.added}`);
  console.log(`  - Family_Relationships: ${results.Family_Relationships.added}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would add ${totalAdded} columns across 3 sheets`);
    console.log('\nRun without --dry-run to apply changes');
  } else {
    console.log(`\n✅ Migration complete!`);
    console.log('\nNext steps:');
    console.log('1. Deploy generationalWealthEngine.js to Apps Script');
    console.log('2. Update householdFormationEngine.js to use real income');
    console.log('3. Wire into Phase 05 processing');
    console.log('4. Run a test cycle to verify wealth calculations');
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
