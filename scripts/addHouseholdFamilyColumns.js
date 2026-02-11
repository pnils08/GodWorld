/**
 * ============================================================================
 * HOUSEHOLD FORMATION & FAMILY TREES MIGRATION (Week 1)
 * ============================================================================
 *
 * Adds household tracking, family relationships, and household lifecycle.
 *
 * SCHEMA CHANGES:
 *
 * NEW SHEETS:
 * - Household_Ledger (14 columns)
 * - Family_Relationships (5 columns)
 *
 * Simulation_Ledger (+5):
 *   - HouseholdId (link to Household_Ledger)
 *   - MaritalStatus (single, married, partnered, divorced, widowed)
 *   - NumChildren (count)
 *   - ParentIds (JSON array - who are this citizen's parents?)
 *   - ChildrenIds (JSON array - who are this citizen's children?)
 *
 * Total: 2 new sheets, 5 new columns
 *
 * Usage:
 *   node scripts/addHouseholdFamilyColumns.js
 *   node scripts/addHouseholdFamilyColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

const SIMULATION_LEDGER_ADDITIONS = [
  { name: 'HouseholdId', defaultValue: '' },
  { name: 'MaritalStatus', defaultValue: 'single' },
  { name: 'NumChildren', defaultValue: 0 },
  { name: 'ParentIds', defaultValue: '[]' },
  { name: 'ChildrenIds', defaultValue: '[]' }
];

// Household_Ledger columns
const HOUSEHOLD_LEDGER_HEADERS = [
  'HouseholdId',
  'HeadOfHousehold',
  'HouseholdType',
  'Members',
  'Neighborhood',
  'HousingType',
  'MonthlyRent',
  'HousingCost',
  'HouseholdIncome',
  'FormedCycle',
  'DissolvedCycle',
  'Status',
  'CreatedAt',
  'LastUpdated'
];

// Family_Relationships columns
const FAMILY_RELATIONSHIPS_HEADERS = [
  'RelationshipId',
  'Citizen1',
  'Citizen2',
  'RelationshipType',
  'SinceCycle',
  'Status'
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

    await sheets.updateRange(sheetName, 2, startCol, fillData);
  }

  console.log(`\n✅ Successfully added ${columnsToAdd.length} columns to ${sheetName}`);
  console.log(`   New column count: ${startCol + columnsToAdd.length}`);

  return { added: columnsToAdd.length, skipped: columnsSkipped.length };
}

async function createSheet(sheetName, headers, dryRun = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`New Sheet: ${sheetName}`);
  console.log('='.repeat(70));

  console.log(`Columns to create: ${headers.length}`);
  console.log(`Headers: ${headers.join(', ')}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would create sheet "${sheetName}" with ${headers.length} columns`);
    return { created: false, wouldCreate: true };
  }

  try {
    // Check if sheet already exists
    const data = await sheets.getSheetAsObjects(sheetName);
    console.log(`\n⏭️  Sheet "${sheetName}" already exists with ${data.length} rows`);
    return { created: false, existed: true };
  } catch (err) {
    // Sheet doesn't exist, create it
    console.log(`\nCreating new sheet "${sheetName}"...`);
    await sheets.createSheet(sheetName, headers);
    console.log(`\n✅ Successfully created sheet "${sheetName}"`);
    return { created: true };
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
  console.log('║   HOUSEHOLD FORMATION & FAMILY TREES MIGRATION (Week 1)           ║');
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
    Household_Ledger: { created: false },
    Family_Relationships: { created: false }
  };

  // Create new sheets
  results.Household_Ledger = await createSheet('Household_Ledger', HOUSEHOLD_LEDGER_HEADERS, dryRun);
  results.Family_Relationships = await createSheet('Family_Relationships', FAMILY_RELATIONSHIPS_HEADERS, dryRun);

  // Add columns to existing sheet
  results.Simulation_Ledger = await addColumnsToSheet('Simulation_Ledger', SIMULATION_LEDGER_ADDITIONS, dryRun);

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(70));

  const sheetsCreated = (results.Household_Ledger.created ? 1 : 0) +
                        (results.Family_Relationships.created ? 1 : 0);
  const columnsAdded = results.Simulation_Ledger.added;

  console.log(`\nSheets created: ${sheetsCreated}`);
  console.log(`Columns added: ${columnsAdded}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would create ${sheetsCreated} sheets and add ${columnsAdded} columns`);
    console.log('\nRun without --dry-run to apply changes');
  } else {
    console.log(`\n✅ Migration complete!`);
    console.log('\nNext steps:');
    console.log('1. Deploy householdFormationEngine.js to Apps Script');
    console.log('2. Wire into Phase 05 processing');
    console.log('3. Run a test cycle to verify household formation');
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
