/**
 * ============================================================================
 * EDUCATION PIPELINE & CAREER PATHWAYS MIGRATION (Week 3)
 * ============================================================================
 *
 * Adds education tracking, school quality, and career progression mechanics.
 *
 * SCHEMA CHANGES:
 *
 * NEW SHEET: School_Quality (7 columns)
 *   - Neighborhood, SchoolQualityIndex, GraduationRate, CollegeReadinessRate,
 *     TeacherQuality, Funding, LastUpdatedCycle
 *
 * Simulation_Ledger (+6):
 *   - EducationLevel (none, hs-dropout, hs-diploma, some-college, bachelor, graduate)
 *   - SchoolQuality (quality of school attended, 0-10)
 *   - CareerStage (student, entry-level, mid-career, senior, retired)
 *   - YearsInCareer (tracking career progression)
 *   - CareerMobility (stagnant, advancing, declining)
 *   - LastPromotionCycle (cycle of last promotion)
 *
 * Total: 1 new sheet, 6 new columns
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

// School_Quality sheet headers
const SCHOOL_QUALITY_HEADERS = [
  'Neighborhood',
  'SchoolQualityIndex',
  'GraduationRate',
  'CollegeReadinessRate',
  'TeacherQuality',
  'Funding',
  'LastUpdatedCycle'
];

// Initial school quality data by neighborhood (based on Oakland reality)
const INITIAL_SCHOOL_QUALITY = [
  { Neighborhood: 'Rockridge', SchoolQualityIndex: 9, GraduationRate: 95, CollegeReadinessRate: 78, TeacherQuality: 9, Funding: 15000, LastUpdatedCycle: 0 },
  { Neighborhood: 'Piedmont Ave', SchoolQualityIndex: 8, GraduationRate: 93, CollegeReadinessRate: 72, TeacherQuality: 8, Funding: 14000, LastUpdatedCycle: 0 },
  { Neighborhood: 'Grand Lake', SchoolQualityIndex: 7, GraduationRate: 88, CollegeReadinessRate: 60, TeacherQuality: 7, Funding: 12000, LastUpdatedCycle: 0 },
  { Neighborhood: 'Temescal', SchoolQualityIndex: 7, GraduationRate: 86, CollegeReadinessRate: 58, TeacherQuality: 7, Funding: 11500, LastUpdatedCycle: 0 },
  { Neighborhood: 'Lake Merritt', SchoolQualityIndex: 6, GraduationRate: 82, CollegeReadinessRate: 50, TeacherQuality: 6, Funding: 10500, LastUpdatedCycle: 0 },
  { Neighborhood: 'Adams Point', SchoolQualityIndex: 6, GraduationRate: 80, CollegeReadinessRate: 48, TeacherQuality: 6, Funding: 10000, LastUpdatedCycle: 0 },
  { Neighborhood: 'Downtown', SchoolQualityIndex: 5, GraduationRate: 75, CollegeReadinessRate: 40, TeacherQuality: 5, Funding: 9000, LastUpdatedCycle: 0 },
  { Neighborhood: 'Uptown', SchoolQualityIndex: 5, GraduationRate: 73, CollegeReadinessRate: 38, TeacherQuality: 5, Funding: 8500, LastUpdatedCycle: 0 },
  { Neighborhood: 'Jack London', SchoolQualityIndex: 4, GraduationRate: 70, CollegeReadinessRate: 32, TeacherQuality: 4, Funding: 8000, LastUpdatedCycle: 0 },
  { Neighborhood: 'Laurel', SchoolQualityIndex: 5, GraduationRate: 76, CollegeReadinessRate: 42, TeacherQuality: 5, Funding: 9200, LastUpdatedCycle: 0 },
  { Neighborhood: 'Chinatown', SchoolQualityIndex: 4, GraduationRate: 68, CollegeReadinessRate: 30, TeacherQuality: 4, Funding: 7500, LastUpdatedCycle: 0 },
  { Neighborhood: 'Fruitvale', SchoolQualityIndex: 3, GraduationRate: 65, CollegeReadinessRate: 25, TeacherQuality: 3, Funding: 7000, LastUpdatedCycle: 0 },
  { Neighborhood: 'West Oakland', SchoolQualityIndex: 3, GraduationRate: 62, CollegeReadinessRate: 22, TeacherQuality: 3, Funding: 6500, LastUpdatedCycle: 0 },
  { Neighborhood: 'Brooklyn', SchoolQualityIndex: 4, GraduationRate: 69, CollegeReadinessRate: 28, TeacherQuality: 4, Funding: 7200, LastUpdatedCycle: 0 },
  { Neighborhood: 'Eastlake', SchoolQualityIndex: 4, GraduationRate: 71, CollegeReadinessRate: 33, TeacherQuality: 4, Funding: 7800, LastUpdatedCycle: 0 }
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

async function createSchoolQualitySheet(dryRun = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`New Sheet: School_Quality`);
  console.log('='.repeat(70));

  console.log(`Columns to create: ${SCHOOL_QUALITY_HEADERS.length}`);
  console.log(`Headers: ${SCHOOL_QUALITY_HEADERS.join(', ')}`);
  console.log(`\nInitial data rows: ${INITIAL_SCHOOL_QUALITY.length} neighborhoods`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would create School_Quality sheet with ${SCHOOL_QUALITY_HEADERS.length} columns and ${INITIAL_SCHOOL_QUALITY.length} rows`);
    return { created: false, wouldCreate: true };
  }

  try {
    // Check if sheet already exists
    const data = await sheets.getSheetAsObjects('School_Quality');
    console.log(`\n⏭️  Sheet "School_Quality" already exists with ${data.length} rows`);
    return { created: false, existed: true };
  } catch (err) {
    // Sheet doesn't exist, create it
    console.log(`\nCreating new sheet "School_Quality"...`);
    await sheets.createSheet('School_Quality', SCHOOL_QUALITY_HEADERS);

    // Add initial data
    console.log(`Populating with ${INITIAL_SCHOOL_QUALITY.length} neighborhood school quality records...`);
    const rows = INITIAL_SCHOOL_QUALITY.map(school => [
      school.Neighborhood,
      school.SchoolQualityIndex,
      school.GraduationRate,
      school.CollegeReadinessRate,
      school.TeacherQuality,
      school.Funding,
      school.LastUpdatedCycle
    ]);

    await sheets.appendRows('School_Quality', rows);

    console.log(`\n✅ Successfully created sheet "School_Quality" with ${INITIAL_SCHOOL_QUALITY.length} schools`);
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
  console.log('║   EDUCATION PIPELINE & CAREER PATHWAYS MIGRATION (Week 3)         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}`);

  const results = {
    School_Quality: { created: false },
    Simulation_Ledger: { added: 0, skipped: 0 }
  };

  // Create new sheet with initial data
  results.School_Quality = await createSchoolQualitySheet(dryRun);

  // Add columns to existing sheet
  results.Simulation_Ledger = await addColumnsToSheet('Simulation_Ledger', SIMULATION_LEDGER_ADDITIONS, dryRun);

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(70));

  const sheetsCreated = results.School_Quality.created ? 1 : 0;
  const columnsAdded = results.Simulation_Ledger.added;

  console.log(`\nSheets created: ${sheetsCreated}`);
  console.log(`Columns added: ${columnsAdded}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN: Would create ${sheetsCreated} sheet and add ${columnsAdded} columns`);
    console.log('\nRun without --dry-run to apply changes');
  } else {
    console.log(`\n✅ Migration complete!`);
    console.log('\nNext steps:');
    console.log('1. Deploy educationCareerEngine.js to Apps Script');
    console.log('2. Wire into Phase 05 processing');
    console.log('3. Run a test cycle to verify education tracking');
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
