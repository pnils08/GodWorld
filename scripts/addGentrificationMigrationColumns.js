/**
 * ============================================================================
 * GENTRIFICATION & MIGRATION TRACKING MIGRATION (Week 4)
 * ============================================================================
 *
 * Adds gentrification phase tracking and individual migration tracking.
 *
 * SCHEMA CHANGES:
 *
 * Neighborhood_Map (+11):
 *   - GentrificationPhase (none, early, accelerating, advanced, stable-affluent)
 *   - DisplacementPressure (0-10: 0=none, 10=severe)
 *   - GentrificationStartCycle (cycle when gentrification began)
 *   - MedianIncome ($ per household)
 *   - MedianIncomeChange5yr (% change)
 *   - MedianRent ($ per month)
 *   - MedianRentChange5yr (% change)
 *   - DemographicShiftIndex (0-10: rapid demographic change)
 *   - WhitePopulationPct (%)
 *   - WhitePopulationChange5yr (% change)
 *   - HighEducationPct (% with bachelor+)
 *
 * Simulation_Ledger (+6):
 *   - DisplacementRisk (0-10: likelihood of forced move)
 *   - MigrationIntent (staying, considering, planning-to-leave, left)
 *   - MigrationReason (job, family, cost, crime, opportunity, displaced)
 *   - MigrationDestination (if left: "SF", "NYC", etc.)
 *   - MigratedCycle (when left Oakland, 0 if never)
 *   - ReturnedCycle (when returned, 0 if never)
 *
 * Migration_Events (NEW SHEET - 9 columns):
 *   - EventId, POPID, EventType, FromNeighborhood, ToNeighborhood,
 *     Reason, Cycle, PushFactors, PullFactors
 *
 * Total: 11 neighborhood columns, 6 citizen columns, 1 new sheet
 *
 * ARCHITECTURE: Extends Neighborhood_Map (no new Neighborhood_Ledger).
 * Consolidates with existing dynamic neighborhood state tracking.
 *
 * Usage:
 *   node scripts/addGentrificationMigrationColumns.js
 *   node scripts/addGentrificationMigrationColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

const NEIGHBORHOOD_MAP_ADDITIONS = [
  { name: 'GentrificationPhase', defaultValue: 'none' },
  { name: 'DisplacementPressure', defaultValue: 0 },
  { name: 'GentrificationStartCycle', defaultValue: 0 },
  { name: 'MedianIncome', defaultValue: 55000 },        // Oakland median
  { name: 'MedianIncomeChange5yr', defaultValue: 0 },
  { name: 'MedianRent', defaultValue: 1800 },           // Oakland median
  { name: 'MedianRentChange5yr', defaultValue: 0 },
  { name: 'DemographicShiftIndex', defaultValue: 0 },
  { name: 'WhitePopulationPct', defaultValue: 30 },     // Oakland avg
  { name: 'WhitePopulationChange5yr', defaultValue: 0 },
  { name: 'HighEducationPct', defaultValue: 45 }        // Oakland avg
];

const SIMULATION_LEDGER_ADDITIONS = [
  { name: 'DisplacementRisk', defaultValue: 0 },
  { name: 'MigrationIntent', defaultValue: 'staying' },
  { name: 'MigrationReason', defaultValue: '' },
  { name: 'MigrationDestination', defaultValue: '' },
  { name: 'MigratedCycle', defaultValue: 0 },
  { name: 'ReturnedCycle', defaultValue: 0 }
];

const MIGRATION_EVENTS_HEADERS = [
  'EventId',
  'POPID',
  'EventType',
  'FromNeighborhood',
  'ToNeighborhood',
  'Reason',
  'Cycle',
  'PushFactors',
  'PullFactors'
];

// Initial gentrification data by neighborhood (Oakland-based reality)
const NEIGHBORHOOD_GENTRIFICATION_DATA = {
  'Rockridge': {
    MedianIncome: 95000,
    MedianRent: 2800,
    WhitePopulationPct: 65,
    HighEducationPct: 72,
    GentrificationPhase: 'stable-affluent',
    DisplacementPressure: 2
  },
  'Piedmont Ave': {
    MedianIncome: 88000,
    MedianRent: 2600,
    WhitePopulationPct: 58,
    HighEducationPct: 68,
    GentrificationPhase: 'stable-affluent',
    DisplacementPressure: 3
  },
  'Grand Lake': {
    MedianIncome: 72000,
    MedianRent: 2200,
    WhitePopulationPct: 48,
    HighEducationPct: 58,
    GentrificationPhase: 'early',
    DisplacementPressure: 4
  },
  'Temescal': {
    MedianIncome: 68000,
    MedianRent: 2100,
    WhitePopulationPct: 45,
    HighEducationPct: 55,
    GentrificationPhase: 'early',
    DisplacementPressure: 5
  },
  'Lake Merritt': {
    MedianIncome: 62000,
    MedianRent: 1950,
    WhitePopulationPct: 42,
    HighEducationPct: 52,
    GentrificationPhase: 'early',
    DisplacementPressure: 4
  },
  'Adams Point': {
    MedianIncome: 58000,
    MedianRent: 1850,
    WhitePopulationPct: 38,
    HighEducationPct: 48,
    GentrificationPhase: 'none',
    DisplacementPressure: 3
  },
  'Downtown': {
    MedianIncome: 52000,
    MedianRent: 1750,
    WhitePopulationPct: 35,
    HighEducationPct: 45,
    GentrificationPhase: 'none',
    DisplacementPressure: 4
  },
  'Uptown': {
    MedianIncome: 48000,
    MedianRent: 1650,
    WhitePopulationPct: 32,
    HighEducationPct: 42,
    GentrificationPhase: 'none',
    DisplacementPressure: 5
  },
  'Jack London': {
    MedianIncome: 55000,
    MedianRent: 1800,
    WhitePopulationPct: 40,
    HighEducationPct: 50,
    GentrificationPhase: 'early',
    DisplacementPressure: 4
  },
  'Laurel': {
    MedianIncome: 50000,
    MedianRent: 1700,
    WhitePopulationPct: 30,
    HighEducationPct: 40,
    GentrificationPhase: 'none',
    DisplacementPressure: 3
  },
  'Chinatown': {
    MedianIncome: 42000,
    MedianRent: 1500,
    WhitePopulationPct: 15,
    HighEducationPct: 35,
    GentrificationPhase: 'none',
    DisplacementPressure: 4
  },
  'Fruitvale': {
    MedianIncome: 38000,
    MedianRent: 1400,
    WhitePopulationPct: 12,
    HighEducationPct: 22,
    GentrificationPhase: 'accelerating',
    DisplacementPressure: 7,
    MedianIncomeChange5yr: 28,
    MedianRentChange5yr: 35
  },
  'West Oakland': {
    MedianIncome: 35000,
    MedianRent: 1350,
    WhitePopulationPct: 18,
    HighEducationPct: 18,
    GentrificationPhase: 'accelerating',
    DisplacementPressure: 8,
    MedianIncomeChange5yr: 32,
    MedianRentChange5yr: 42,
    WhitePopulationChange5yr: 15
  },
  'Brooklyn': {
    MedianIncome: 40000,
    MedianRent: 1450,
    WhitePopulationPct: 20,
    HighEducationPct: 28,
    GentrificationPhase: 'none',
    DisplacementPressure: 4
  },
  'Eastlake': {
    MedianIncome: 43000,
    MedianRent: 1500,
    WhitePopulationPct: 22,
    HighEducationPct: 30,
    GentrificationPhase: 'none',
    DisplacementPressure: 4
  }
};


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

async function populateNeighborhoodGentrificationData(dryRun = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Populating Gentrification Data for Neighborhoods`);
  console.log('='.repeat(70));

  const data = await sheets.getSheetAsObjects('Neighborhood_Map');
  const neighborhoods = data.map(row => row.Neighborhood);

  console.log(`\nFound ${neighborhoods.length} neighborhoods to update`);
  console.log(`Gentrification data defined for ${Object.keys(NEIGHBORHOOD_GENTRIFICATION_DATA).length} neighborhoods`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would populate gentrification data for matched neighborhoods`);
    neighborhoods.forEach(name => {
      if (NEIGHBORHOOD_GENTRIFICATION_DATA[name]) {
        const data = NEIGHBORHOOD_GENTRIFICATION_DATA[name];
        console.log(`   ${name}: ${data.GentrificationPhase}, Income $${data.MedianIncome/1000}k, Rent $${data.MedianRent}, Pressure ${data.DisplacementPressure}/10`);
      } else {
        console.log(`   ${name}: (using defaults - no specific data)`);
      }
    });
    return { populated: 0, wouldPopulate: neighborhoods.length };
  }

  // Re-fetch with new columns
  const updatedData = await sheets.getSheetAsObjects('Neighborhood_Map');
  const headers = Object.keys(updatedData[0]);

  const genPhaseIdx = headers.indexOf('GentrificationPhase');
  const displPressureIdx = headers.indexOf('DisplacementPressure');
  const genStartIdx = headers.indexOf('GentrificationStartCycle');
  const medIncomeIdx = headers.indexOf('MedianIncome');
  const incChange5yrIdx = headers.indexOf('MedianIncomeChange5yr');
  const medRentIdx = headers.indexOf('MedianRent');
  const rentChange5yrIdx = headers.indexOf('MedianRentChange5yr');
  const demoShiftIdx = headers.indexOf('DemographicShiftIndex');
  const whitePctIdx = headers.indexOf('WhitePopulationPct');
  const whiteChange5yrIdx = headers.indexOf('WhitePopulationChange5yr');
  const highEdPctIdx = headers.indexOf('HighEducationPct');

  if (genPhaseIdx === -1) {
    console.log('\n⚠️  Gentrification columns not found - run column addition first');
    return { populated: 0 };
  }

  console.log(`\nUpdating gentrification data...`);

  let populated = 0;
  for (let i = 0; i < updatedData.length; i++) {
    const row = updatedData[i];
    const genData = NEIGHBORHOOD_GENTRIFICATION_DATA[row.Neighborhood];

    if (genData) {
      // Update this row with specific data
      const updateValues = [[
        genData.GentrificationPhase || 'none',
        genData.DisplacementPressure || 0,
        genData.GentrificationStartCycle || 0,
        genData.MedianIncome || 55000,
        genData.MedianIncomeChange5yr || 0,
        genData.MedianRent || 1800,
        genData.MedianRentChange5yr || 0,
        genData.DemographicShiftIndex || 0,
        genData.WhitePopulationPct || 30,
        genData.WhitePopulationChange5yr || 0,
        genData.HighEducationPct || 45
      ]];

      await sheets.updateRangeByPosition('Neighborhood_Map', i + 2, genPhaseIdx, updateValues);
      console.log(`   ✓ ${row.Neighborhood}: ${genData.GentrificationPhase}, Pressure ${genData.DisplacementPressure}/10`);
      populated++;
    }
  }

  console.log(`\n✅ Populated gentrification data for ${populated}/${updatedData.length} neighborhoods`);
  return { populated };
}

async function createMigrationEventsSheet(dryRun = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`New Sheet: Migration_Events`);
  console.log('='.repeat(70));

  console.log(`Columns to create: ${MIGRATION_EVENTS_HEADERS.length}`);
  console.log(`Headers: ${MIGRATION_EVENTS_HEADERS.join(', ')}`);
  console.log(`\nInitial data: Empty (will be populated as migrations occur)`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would create Migration_Events sheet with ${MIGRATION_EVENTS_HEADERS.length} columns`);
    return { created: false, wouldCreate: true };
  }

  try {
    // Check if sheet already exists
    const data = await sheets.getSheetAsObjects('Migration_Events');
    console.log(`\n⏭️  Sheet "Migration_Events" already exists with ${data.length} rows`);
    return { created: false, existed: true };
  } catch (err) {
    // Sheet doesn't exist, create it
    console.log(`\nCreating new sheet "Migration_Events"...`);
    await sheets.createSheet('Migration_Events', MIGRATION_EVENTS_HEADERS);

    console.log(`\n✅ Successfully created sheet "Migration_Events"`);
    console.log(`   Initial state: Empty (event log will grow as migrations occur)`);
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
  console.log('║   GENTRIFICATION & MIGRATION TRACKING MIGRATION (Week 4)          ║');
  console.log('║   Consolidated Architecture - Extends Neighborhood_Map            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}`);

  const results = {
    Neighborhood_Map: { added: 0, skipped: 0 },
    Simulation_Ledger: { added: 0, skipped: 0 },
    Migration_Events: { created: false },
    GentrificationDataPopulated: { populated: 0 }
  };

  // Add columns to Neighborhood_Map
  results.Neighborhood_Map = await addColumnsToSheet(
    'Neighborhood_Map',
    NEIGHBORHOOD_MAP_ADDITIONS,
    dryRun
  );

  // Add columns to Simulation_Ledger
  results.Simulation_Ledger = await addColumnsToSheet(
    'Simulation_Ledger',
    SIMULATION_LEDGER_ADDITIONS,
    dryRun
  );

  // Create Migration_Events sheet
  results.Migration_Events = await createMigrationEventsSheet(dryRun);

  // Populate neighborhood gentrification data
  if (!dryRun && results.Neighborhood_Map.added > 0) {
    results.GentrificationDataPopulated = await populateNeighborhoodGentrificationData(dryRun);
  } else if (dryRun) {
    results.GentrificationDataPopulated = await populateNeighborhoodGentrificationData(dryRun);
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(70));

  const totalColumnsAdded = results.Neighborhood_Map.added + results.Simulation_Ledger.added;
  const sheetsCreated = results.Migration_Events.created ? 1 : 0;
  const neighborhoodsPopulated = results.GentrificationDataPopulated.populated || 0;

  console.log(`\nColumns added to Neighborhood_Map: ${results.Neighborhood_Map.added}`);
  console.log(`Columns added to Simulation_Ledger: ${results.Simulation_Ledger.added}`);
  console.log(`Total columns added: ${totalColumnsAdded}`);
  console.log(`Sheets created: ${sheetsCreated}`);
  console.log(`Neighborhoods with gentrification data: ${neighborhoodsPopulated}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would add ${totalColumnsAdded} columns, create ${sheetsCreated} sheet, populate ${neighborhoodsPopulated} neighborhoods`);
    console.log('\nRun without --dry-run to apply changes');
  } else {
    console.log(`\n✅ Migration complete!`);
    console.log('\nNext steps:');
    console.log('1. Deploy gentrificationEngine.js to Apps Script');
    console.log('2. Deploy migrationTrackingEngine.js to Apps Script');
    console.log('3. Wire both engines into Phase 05');
    console.log('4. Run a test cycle to verify gentrification tracking');
    console.log('\nNote: Gentrification data now in Neighborhood_Map (consolidated)');
    console.log('      Migration event log in Migration_Events (grows over time)');
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
