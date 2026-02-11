/**
 * ============================================================================
 * ARC LIFECYCLE AUTOMATION MIGRATION (Week 2)
 * ============================================================================
 *
 * Adds 8 new columns across 2 sheets to automate arc phase progression
 * and resolution tracking.
 *
 * SCHEMA CHANGES:
 *
 * Arc_Ledger (+5):
 *   - AutoAdvance (yes/no - should this arc auto-progress through phases?)
 *   - PhaseStartCycle (cycle when current phase started)
 *   - PhaseDuration (how many cycles in current phase so far)
 *   - NextPhaseTransition (cycle when next phase transition should happen)
 *   - TensionDecay (tension decay rate per cycle: 0.0-1.0)
 *
 * Event_Arc_Ledger (+3):
 *   - ResolutionTrigger (condition that triggers resolution)
 *   - ResolutionCycle (cycle when arc was resolved)
 *   - ResolutionNotes (how the arc was resolved)
 *
 * Total: 8 new columns
 *
 * Usage:
 *   node scripts/addArcLifecycleColumns.js
 *   node scripts/addArcLifecycleColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

const ARC_LEDGER_ADDITIONS = [
  { name: 'AutoAdvance', defaultValue: 'yes' },
  { name: 'PhaseStartCycle', defaultValue: '' },
  { name: 'PhaseDuration', defaultValue: 0 },
  { name: 'NextPhaseTransition', defaultValue: '' },
  { name: 'TensionDecay', defaultValue: 0.1 }
];

const EVENT_ARC_LEDGER_ADDITIONS = [
  { name: 'ResolutionTrigger', defaultValue: '' },
  { name: 'ResolutionCycle', defaultValue: '' },
  { name: 'ResolutionNotes', defaultValue: '' }
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
  console.log('║   ARC LIFECYCLE AUTOMATION MIGRATION (Week 2)                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}`);

  const results = {
    Arc_Ledger: { added: 0, skipped: 0 },
    Event_Arc_Ledger: { added: 0, skipped: 0 }
  };

  // Add columns to each sheet
  results.Arc_Ledger = await addColumnsToSheet('Arc_Ledger', ARC_LEDGER_ADDITIONS, dryRun);
  results.Event_Arc_Ledger = await addColumnsToSheet('Event_Arc_Ledger', EVENT_ARC_LEDGER_ADDITIONS, dryRun);

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
    console.log('1. Deploy arcLifecycleEngine.js to Apps Script');
    console.log('2. Wire advanceArcLifecycles_() into godWorldEngine2.js Phase 6');
    console.log('3. Run a test cycle to verify arc progression');
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
