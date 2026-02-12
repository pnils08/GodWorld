/**
 * Verify Migration Columns Script
 * Quick verification that Week 1-4 Population & Demographics migrations worked
 *
 * Checks:
 * 1. New sheets exist (Household_Ledger, Family_Relationships, Migration_Events)
 * 2. Simulation_Ledger has 23 new columns
 * 3. Neighborhood_Demographics has 5 new columns (Week 3)
 * 4. Neighborhood_Map has 11 new columns (Week 4)
 */

const { listSheets, getSheetData } = require('../lib/sheets');

/**
 * Get just the headers (first row) from a sheet
 */
async function getSheetHeaders(sheetName) {
  const data = await getSheetData(sheetName);
  return data.length > 0 ? data[0] : [];
}

// Expected columns by sheet
const EXPECTED_COLUMNS = {
  // Week 1: 5 columns
  Simulation_Ledger_Week1: [
    'InRelationship',
    'PartnerID',
    'HouseholdID',
    'HouseholdRole',
    'HouseholdSize'
  ],

  // Week 2: 6 columns
  Simulation_Ledger_Week2: [
    'WealthLevel',
    'Income',
    'InheritanceReceived',
    'NetWorth',
    'SavingsRate',
    'DebtLevel'
  ],

  // Week 3: 6 columns
  Simulation_Ledger_Week3: [
    'EducationLevel',
    'SchoolQualityIndex',
    'CareerPath',
    'CurrentCareerStage',
    'JobSatisfaction',
    'UnemploymentRisk'
  ],

  // Week 4: 6 columns
  Simulation_Ledger_Week4: [
    'GentrificationRisk',
    'DisplacementPressure',
    'MigrationIntent',
    'YearsInNeighborhood',
    'MovedThisCycle',
    'MigrationReason'
  ],

  // Week 1: New sheets
  Household_Ledger: [
    'HouseholdID',
    'FormationDate',
    'DissolutionDate',
    'HouseholdType',
    'MemberIDs',
    'MemberCount',
    'PrimaryResidence',
    'CombinedIncome',
    'MonthlyRent',
    'RentBurden',
    'HousingStability',
    'FinancialStress',
    'ActiveRelationships',
    'Notes'
  ],

  Family_Relationships: [
    'RelationshipID',
    'CitizenID_A',
    'CitizenID_B',
    'RelationshipType',
    'FormationCycle',
    'DissolutionCycle'
  ],

  // Week 3: Neighborhood_Demographics additions
  Neighborhood_Demographics_Week3: [
    'SchoolQualityIndex',
    'GraduationRate',
    'CollegeReadinessRate',
    'TeacherQuality',
    'Funding'
  ],

  // Week 4: Neighborhood_Map additions
  Neighborhood_Map_Week4: [
    'MedianIncome',
    'MedianRent',
    'WhitePopulationPct',
    'HighEducationPct',
    'GentrificationPhase',
    'DisplacementPressure',
    'MedianIncomeChange5yr',
    'MedianRentChange5yr',
    'WhitePopChange5yr',
    'HighEdChange5yr',
    'GentrificationTrend'
  ],

  // Week 4: Migration_Events
  Migration_Events: [
    'EventID',
    'CitizenID',
    'Cycle',
    'EventType',
    'FromNeighborhood',
    'ToNeighborhood',
    'Reason',
    'DisplacementPressure',
    'Notes'
  ]
};

async function verifyMigrations() {
  console.log('=== MIGRATION VERIFICATION ===\n');

  try {
    // Get all sheet names
    const allSheets = await listSheets();
    const sheets = allSheets.map(s => s.title);
    console.log(`Total sheets found: ${sheets.length}\n`);

    const results = {
      newSheets: { expected: 3, found: 0, missing: [] },
      simulationLedger: { expected: 23, found: 0, missing: [] },
      neighborhoodDemographics: { expected: 5, found: 0, missing: [] },
      neighborhoodMap: { expected: 11, found: 0, missing: [] }
    };

    // Check new sheets exist
    const newSheets = ['Household_Ledger', 'Family_Relationships', 'Migration_Events'];
    for (const sheetName of newSheets) {
      if (sheets.includes(sheetName)) {
        results.newSheets.found++;
        console.log(`✓ ${sheetName} exists`);

        // Verify headers
        const headers = await getSheetHeaders(sheetName);
        const expected = EXPECTED_COLUMNS[sheetName];
        const missing = expected.filter(col => !headers.includes(col));

        if (missing.length === 0) {
          console.log(`  ✓ All ${expected.length} columns present`);
        } else {
          console.log(`  ✗ Missing ${missing.length} columns: ${missing.join(', ')}`);
        }
      } else {
        results.newSheets.missing.push(sheetName);
        console.log(`✗ ${sheetName} NOT FOUND`);
      }
    }

    console.log('');

    // Check Simulation_Ledger columns
    if (sheets.includes('Simulation_Ledger')) {
      console.log('Checking Simulation_Ledger...');
      const headers = await getSheetHeaders('Simulation_Ledger');
      console.log(`  Total columns: ${headers.length}`);

      // Check each week's additions
      for (let week = 1; week <= 4; week++) {
        const weekKey = `Simulation_Ledger_Week${week}`;
        const expected = EXPECTED_COLUMNS[weekKey];
        const missing = expected.filter(col => !headers.includes(col));

        if (missing.length === 0) {
          console.log(`  ✓ Week ${week}: All ${expected.length} columns present`);
          results.simulationLedger.found += expected.length;
        } else {
          console.log(`  ✗ Week ${week}: Missing ${missing.length}/${expected.length} columns`);
          console.log(`    Missing: ${missing.join(', ')}`);
          results.simulationLedger.missing.push(...missing);
        }
      }
    } else {
      console.log('✗ Simulation_Ledger NOT FOUND');
    }

    console.log('');

    // Check Neighborhood_Demographics columns (Week 3)
    if (sheets.includes('Neighborhood_Demographics')) {
      console.log('Checking Neighborhood_Demographics...');
      const headers = await getSheetHeaders('Neighborhood_Demographics');
      const expected = EXPECTED_COLUMNS.Neighborhood_Demographics_Week3;
      const missing = expected.filter(col => !headers.includes(col));

      if (missing.length === 0) {
        console.log(`  ✓ All ${expected.length} Week 3 columns present`);
        results.neighborhoodDemographics.found = expected.length;
      } else {
        console.log(`  ✗ Missing ${missing.length}/${expected.length} columns`);
        console.log(`    Missing: ${missing.join(', ')}`);
        results.neighborhoodDemographics.missing = missing;
      }
    } else {
      console.log('✗ Neighborhood_Demographics NOT FOUND');
    }

    console.log('');

    // Check Neighborhood_Map columns (Week 4)
    if (sheets.includes('Neighborhood_Map')) {
      console.log('Checking Neighborhood_Map...');
      const headers = await getSheetHeaders('Neighborhood_Map');
      const expected = EXPECTED_COLUMNS.Neighborhood_Map_Week4;
      const missing = expected.filter(col => !headers.includes(col));

      if (missing.length === 0) {
        console.log(`  ✓ All ${expected.length} Week 4 columns present`);
        results.neighborhoodMap.found = expected.length;
      } else {
        console.log(`  ✗ Missing ${missing.length}/${expected.length} columns`);
        console.log(`    Missing: ${missing.join(', ')}`);
        results.neighborhoodMap.missing = missing;
      }
    } else {
      console.log('✗ Neighborhood_Map NOT FOUND');
    }

    console.log('\n=== SUMMARY ===\n');

    let allGood = true;

    // New sheets
    if (results.newSheets.found === results.newSheets.expected) {
      console.log(`✓ New Sheets: ${results.newSheets.found}/${results.newSheets.expected}`);
    } else {
      console.log(`✗ New Sheets: ${results.newSheets.found}/${results.newSheets.expected}`);
      console.log(`  Missing: ${results.newSheets.missing.join(', ')}`);
      allGood = false;
    }

    // Simulation_Ledger
    if (results.simulationLedger.found === results.simulationLedger.expected) {
      console.log(`✓ Simulation_Ledger: ${results.simulationLedger.found}/${results.simulationLedger.expected} columns`);
    } else {
      console.log(`✗ Simulation_Ledger: ${results.simulationLedger.found}/${results.simulationLedger.expected} columns`);
      console.log(`  Missing: ${results.simulationLedger.missing.join(', ')}`);
      allGood = false;
    }

    // Neighborhood_Demographics
    if (results.neighborhoodDemographics.found === results.neighborhoodDemographics.expected) {
      console.log(`✓ Neighborhood_Demographics: ${results.neighborhoodDemographics.found}/${results.neighborhoodDemographics.expected} columns`);
    } else {
      console.log(`✗ Neighborhood_Demographics: ${results.neighborhoodDemographics.found}/${results.neighborhoodDemographics.expected} columns`);
      console.log(`  Missing: ${results.neighborhoodDemographics.missing.join(', ')}`);
      allGood = false;
    }

    // Neighborhood_Map
    if (results.neighborhoodMap.found === results.neighborhoodMap.expected) {
      console.log(`✓ Neighborhood_Map: ${results.neighborhoodMap.found}/${results.neighborhoodMap.expected} columns`);
    } else {
      console.log(`✗ Neighborhood_Map: ${results.neighborhoodMap.found}/${results.neighborhoodMap.expected} columns`);
      console.log(`  Missing: ${results.neighborhoodMap.missing.join(', ')}`);
      allGood = false;
    }

    console.log('');

    if (allGood) {
      console.log('✓ ALL MIGRATIONS VERIFIED SUCCESSFULLY');
      console.log('\nReady to run new engine cycle.');
    } else {
      console.log('✗ SOME MIGRATIONS INCOMPLETE');
      console.log('\nRun missing migration scripts before proceeding.');
    }

  } catch (error) {
    console.error('Error during verification:', error.message);
    throw error;
  }
}

// Run verification
verifyMigrations()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
