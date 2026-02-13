/**
 * ============================================================================
 * EDUCATION PIPELINE & CAREER PATHWAYS MIGRATION (Week 3 - Consolidated)
 * ============================================================================
 *
 * Adds education tracking, school quality, and career progression mechanics.
 *
 * SCHEMA CHANGES:
 *
 * Neighborhood_Demographics (+5):
 *   - SchoolQualityIndex (0-10 rating)
 *   - GraduationRate (% graduating HS)
 *   - CollegeReadinessRate (% college-ready)
 *   - TeacherQuality (0-10 rating)
 *   - Funding ($ per student)
 *
 * Simulation_Ledger (+6):
 *   - EducationLevel (none, hs-dropout, hs-diploma, some-college, bachelor, graduate)
 *   - SchoolQuality (quality of school attended, 0-10)
 *   - CareerStage (student, entry-level, mid-career, senior, retired)
 *   - YearsInCareer (tracking career progression)
 *   - CareerMobility (stagnant, advancing, declining)
 *   - LastPromotionCycle (cycle of last promotion)
 *
 * Total: 11 new columns (5 neighborhood, 6 citizen)
 *
 * ARCHITECTURE: Consolidates school metrics into Neighborhood_Demographics
 * instead of creating separate School_Quality sheet. Cleaner for media handoff.
 *
 * Usage:
 *   node scripts/addEducationCareerColumns.js
 *   node scripts/addEducationCareerColumns.js --dry-run
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

const SIMULATION_LEDGER_ADDITIONS = [
  { name: 'EducationLevel', defaultValue: 'hs-diploma' },    // Most adults have HS
  { name: 'SchoolQuality', defaultValue: 5 },                 // Adequate
  { name: 'CareerStage', defaultValue: 'mid-career' },       // Most are mid-career
  { name: 'YearsInCareer', defaultValue: 10 },               // 10 years experience
  { name: 'CareerMobility', defaultValue: 'stagnant' },      // Default no movement
  { name: 'LastPromotionCycle', defaultValue: 0 }            // No recent promotion
];

const NEIGHBORHOOD_DEMOGRAPHICS_ADDITIONS = [
  { name: 'SchoolQualityIndex', defaultValue: 5 },       // Adequate default
  { name: 'GraduationRate', defaultValue: 75 },          // 75% grad rate
  { name: 'CollegeReadinessRate', defaultValue: 40 },    // 40% college-ready
  { name: 'TeacherQuality', defaultValue: 5 },           // Adequate teachers
  { name: 'Funding', defaultValue: 9000 }                // $9k per student
];

// Initial school quality data by neighborhood (Oakland-based reality)
const NEIGHBORHOOD_SCHOOL_DATA = {
  'Rockridge': { SchoolQualityIndex: 9, GraduationRate: 95, CollegeReadinessRate: 78, TeacherQuality: 9, Funding: 15000 },
  'Piedmont Ave': { SchoolQualityIndex: 8, GraduationRate: 93, CollegeReadinessRate: 72, TeacherQuality: 8, Funding: 14000 },
  'Grand Lake': { SchoolQualityIndex: 7, GraduationRate: 88, CollegeReadinessRate: 60, TeacherQuality: 7, Funding: 12000 },
  'Temescal': { SchoolQualityIndex: 7, GraduationRate: 86, CollegeReadinessRate: 58, TeacherQuality: 7, Funding: 11500 },
  'Lake Merritt': { SchoolQualityIndex: 6, GraduationRate: 82, CollegeReadinessRate: 50, TeacherQuality: 6, Funding: 10500 },
  'Adams Point': { SchoolQualityIndex: 6, GraduationRate: 80, CollegeReadinessRate: 48, TeacherQuality: 6, Funding: 10000 },
  'Downtown': { SchoolQualityIndex: 5, GraduationRate: 75, CollegeReadinessRate: 40, TeacherQuality: 5, Funding: 9000 },
  'Uptown': { SchoolQualityIndex: 5, GraduationRate: 73, CollegeReadinessRate: 38, TeacherQuality: 5, Funding: 8500 },
  'Jack London': { SchoolQualityIndex: 4, GraduationRate: 70, CollegeReadinessRate: 32, TeacherQuality: 4, Funding: 8000 },
  'Laurel': { SchoolQualityIndex: 5, GraduationRate: 76, CollegeReadinessRate: 42, TeacherQuality: 5, Funding: 9200 },
  'Chinatown': { SchoolQualityIndex: 4, GraduationRate: 68, CollegeReadinessRate: 30, TeacherQuality: 4, Funding: 7500 },
  'Fruitvale': { SchoolQualityIndex: 3, GraduationRate: 65, CollegeReadinessRate: 25, TeacherQuality: 3, Funding: 7000 },
  'West Oakland': { SchoolQualityIndex: 3, GraduationRate: 62, CollegeReadinessRate: 22, TeacherQuality: 3, Funding: 6500 },
  'Brooklyn': { SchoolQualityIndex: 4, GraduationRate: 69, CollegeReadinessRate: 28, TeacherQuality: 4, Funding: 7200 },
  'Eastlake': { SchoolQualityIndex: 4, GraduationRate: 71, CollegeReadinessRate: 33, TeacherQuality: 4, Funding: 7800 }
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
  const neededColumns = startCol + columnsToAdd.length;

  console.log(`\nAdding columns starting at position ${startCol + 1}...`);
  console.log(`Total columns needed: ${neededColumns}`);

  // Resize sheet if needed (add 10 extra columns for future growth)
  await sheets.resizeSheet(sheetName, Math.max(neededColumns + 10, headers.length));

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

async function populateNeighborhoodSchoolData(dryRun = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Populating School Quality Data for Neighborhoods`);
  console.log('='.repeat(70));

  const data = await sheets.getSheetAsObjects('Neighborhood_Demographics');
  const neighborhoods = data.map(row => row.Neighborhood);

  console.log(`\nFound ${neighborhoods.length} neighborhoods to update`);
  console.log(`School data defined for ${Object.keys(NEIGHBORHOOD_SCHOOL_DATA).length} neighborhoods`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would populate school quality data for matched neighborhoods`);
    neighborhoods.forEach(name => {
      if (NEIGHBORHOOD_SCHOOL_DATA[name]) {
        const data = NEIGHBORHOOD_SCHOOL_DATA[name];
        console.log(`   ${name}: Quality ${data.SchoolQualityIndex}/10, Grad ${data.GraduationRate}%, College ${data.CollegeReadinessRate}%`);
      } else {
        console.log(`   ${name}: (using defaults - no specific data)`);
      }
    });
    return { populated: 0, wouldPopulate: neighborhoods.length };
  }

  // Re-fetch with new columns
  const updatedData = await sheets.getSheetAsObjects('Neighborhood_Demographics');
  const headers = Object.keys(updatedData[0]);

  const schoolQualityIdx = headers.indexOf('SchoolQualityIndex');
  const gradRateIdx = headers.indexOf('GraduationRate');
  const collegeReadyIdx = headers.indexOf('CollegeReadinessRate');
  const teacherQualityIdx = headers.indexOf('TeacherQuality');
  const fundingIdx = headers.indexOf('Funding');

  if (schoolQualityIdx === -1) {
    console.log('\n⚠️  School quality columns not found - run column addition first');
    return { populated: 0 };
  }

  console.log(`\nUpdating school quality data...`);

  let populated = 0;
  for (let i = 0; i < updatedData.length; i++) {
    const row = updatedData[i];
    const schoolData = NEIGHBORHOOD_SCHOOL_DATA[row.Neighborhood];

    if (schoolData) {
      // Update this row with specific data
      const updateValues = [[
        schoolData.SchoolQualityIndex,
        schoolData.GraduationRate,
        schoolData.CollegeReadinessRate,
        schoolData.TeacherQuality,
        schoolData.Funding
      ]];

      await sheets.updateRangeByPosition('Neighborhood_Demographics', i + 2, schoolQualityIdx, updateValues);
      console.log(`   ✓ ${row.Neighborhood}: Quality ${schoolData.SchoolQualityIndex}/10, Grad ${schoolData.GraduationRate}%`);
      populated++;
    }
  }

  console.log(`\n✅ Populated school quality data for ${populated}/${updatedData.length} neighborhoods`);
  return { populated };
}


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   EDUCATION PIPELINE & CAREER PATHWAYS MIGRATION (Week 3)         ║');
  console.log('║   Consolidated Architecture - No Separate School_Quality Sheet    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}`);

  const results = {
    Neighborhood_Demographics: { added: 0, skipped: 0 },
    Simulation_Ledger: { added: 0, skipped: 0 },
    SchoolDataPopulated: { populated: 0 }
  };

  // Add columns to Neighborhood_Demographics
  results.Neighborhood_Demographics = await addColumnsToSheet(
    'Neighborhood_Demographics',
    NEIGHBORHOOD_DEMOGRAPHICS_ADDITIONS,
    dryRun
  );

  // Add columns to Simulation_Ledger
  results.Simulation_Ledger = await addColumnsToSheet(
    'Simulation_Ledger',
    SIMULATION_LEDGER_ADDITIONS,
    dryRun
  );

  // Populate neighborhood school quality data (always run — columns may exist but be empty)
  results.SchoolDataPopulated = await populateNeighborhoodSchoolData(dryRun);

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(70));

  const totalColumnsAdded = results.Neighborhood_Demographics.added + results.Simulation_Ledger.added;
  const neighborhoodsPopulated = results.SchoolDataPopulated.populated || 0;

  console.log(`\nColumns added to Neighborhood_Demographics: ${results.Neighborhood_Demographics.added}`);
  console.log(`Columns added to Simulation_Ledger: ${results.Simulation_Ledger.added}`);
  console.log(`Total columns added: ${totalColumnsAdded}`);
  console.log(`Neighborhoods with school data: ${neighborhoodsPopulated}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would add ${totalColumnsAdded} columns and populate ${neighborhoodsPopulated} neighborhoods`);
    console.log('\nRun without --dry-run to apply changes');
  } else {
    console.log(`\n✅ Migration complete!`);
    console.log('\nNext steps:');
    console.log('1. Deploy educationCareerEngine.js to Apps Script');
    console.log('2. Wire into Phase 05 processing');
    console.log('3. Run a test cycle to verify education tracking');
    console.log('\nNote: School quality data now consolidated in Neighborhood_Demographics');
    console.log('      (cleaner architecture for media handoff)');
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
