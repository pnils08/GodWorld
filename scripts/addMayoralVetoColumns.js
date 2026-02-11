/**
 * addMayoralVetoColumns.js
 *
 * Adds 7 columns for Week 1 civic governance enhancement:
 * - Initiative_Tracker: MayoralAction, MayoralActionCycle, VetoReason, OverrideVoteCycle, OverrideOutcome
 * - Civic_Office_Ledger: ExecutiveActions, Approval
 *
 * SAFE: Includes rollback function to restore original state
 */

const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';
const CREDENTIALS_PATH = path.resolve(__dirname, '..', 'credentials', 'service-account.json');

// Column definitions
const INITIATIVE_TRACKER_ADDITIONS = [
  { name: 'MayoralAction', defaultValue: 'none' },
  { name: 'MayoralActionCycle', defaultValue: '' },
  { name: 'VetoReason', defaultValue: '' },
  { name: 'OverrideVoteCycle', defaultValue: '' },
  { name: 'OverrideOutcome', defaultValue: '' }
];

const CIVIC_OFFICE_ADDITIONS = [
  { name: 'ExecutiveActions', defaultValue: '[]' },
  { name: 'Approval', defaultValue: '65' }
];

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('=== Mayoral Veto Columns Migration ===\n');

  // ========================================================================
  // STEP 1: Get sheet metadata (for sheetId lookups)
  // ========================================================================
  console.log('Step 1: Fetching spreadsheet metadata...');
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets(properties(sheetId,title,gridProperties))',
  });

  const sheetMap = {};
  meta.data.sheets.forEach(s => {
    sheetMap[s.properties.title] = {
      sheetId: s.properties.sheetId,
      rows: s.properties.gridProperties.rowCount,
      cols: s.properties.gridProperties.columnCount
    };
  });

  const initTracker = sheetMap['Initiative_Tracker'];
  const civicOffice = sheetMap['Civic_Office_Ledger'];

  if (!initTracker || !civicOffice) {
    console.error('ERROR: Required sheets not found');
    console.log('Available sheets:', Object.keys(sheetMap));
    process.exit(1);
  }

  console.log(`  Initiative_Tracker: ${initTracker.cols} columns, ${initTracker.rows} rows`);
  console.log(`  Civic_Office_Ledger: ${civicOffice.cols} columns, ${civicOffice.rows} rows\n`);

  // ========================================================================
  // STEP 2: Read current headers
  // ========================================================================
  console.log('Step 2: Reading current headers...');

  const initHeaders = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Initiative_Tracker!1:1'
  });
  const initCols = initHeaders.data.values[0];
  console.log(`  Initiative_Tracker current columns (${initCols.length}):`, initCols.join(', '));

  const civicHeaders = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Civic_Office_Ledger!1:1'
  });
  const civicCols = civicHeaders.data.values[0];
  console.log(`  Civic_Office_Ledger current columns (${civicCols.length}):`, civicCols.join(', '));
  console.log();

  // ========================================================================
  // STEP 3: Check for existing columns (prevent duplicate migration)
  // ========================================================================
  console.log('Step 3: Checking for existing columns...');

  const initExists = INITIATIVE_TRACKER_ADDITIONS.map(col => initCols.includes(col.name));
  const civicExists = CIVIC_OFFICE_ADDITIONS.map(col => civicCols.includes(col.name));

  if (initExists.some(e => e) || civicExists.some(e => e)) {
    console.log('  WARNING: Some columns already exist!');
    INITIATIVE_TRACKER_ADDITIONS.forEach((col, i) => {
      if (initExists[i]) console.log(`    - Initiative_Tracker.${col.name} EXISTS`);
    });
    CIVIC_OFFICE_ADDITIONS.forEach((col, i) => {
      if (civicExists[i]) console.log(`    - Civic_Office_Ledger.${col.name} EXISTS`);
    });
    console.log('\n  Aborting to prevent duplicate columns.');
    console.log('  Run rollback first if you need to re-migrate.\n');
    process.exit(0);
  }

  console.log('  ✓ No duplicate columns found. Safe to proceed.\n');

  // ========================================================================
  // STEP 4: Add columns to Initiative_Tracker
  // ========================================================================
  console.log('Step 4: Adding columns to Initiative_Tracker...');

  // Insert columns after last column (PolicyDomain is column 19)
  const initStartCol = initCols.length;
  const initRequests = [];

  // Insert dimension request (add 5 columns)
  initRequests.push({
    insertDimension: {
      range: {
        sheetId: initTracker.sheetId,
        dimension: 'COLUMNS',
        startIndex: initStartCol,
        endIndex: initStartCol + INITIATIVE_TRACKER_ADDITIONS.length
      }
    }
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: initRequests }
  });

  console.log(`  ✓ Inserted ${INITIATIVE_TRACKER_ADDITIONS.length} columns at index ${initStartCol}\n`);

  // Write headers
  const initHeaderValues = INITIATIVE_TRACKER_ADDITIONS.map(col => col.name);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Initiative_Tracker!${columnToLetter(initStartCol)}1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [initHeaderValues]
    }
  });

  console.log('  ✓ Headers written:', initHeaderValues.join(', '));

  // Write default values to all existing rows (skip header)
  const initRowCount = initTracker.rows;
  if (initRowCount > 1) {
    const defaultRow = INITIATIVE_TRACKER_ADDITIONS.map(col => col.defaultValue);
    const defaultData = [];
    for (let i = 2; i <= initRowCount; i++) {
      defaultData.push(defaultRow);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Initiative_Tracker!${columnToLetter(initStartCol)}2:${columnToLetter(initStartCol + INITIATIVE_TRACKER_ADDITIONS.length - 1)}${initRowCount}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: defaultData
      }
    });

    console.log(`  ✓ Default values written to ${initRowCount - 1} rows\n`);
  }

  // ========================================================================
  // STEP 5: Add columns to Civic_Office_Ledger
  // ========================================================================
  console.log('Step 5: Adding columns to Civic_Office_Ledger...');

  const civicStartCol = civicCols.length;
  const civicRequests = [];

  // Insert dimension request (add 2 columns)
  civicRequests.push({
    insertDimension: {
      range: {
        sheetId: civicOffice.sheetId,
        dimension: 'COLUMNS',
        startIndex: civicStartCol,
        endIndex: civicStartCol + CIVIC_OFFICE_ADDITIONS.length
      }
    }
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: civicRequests }
  });

  console.log(`  ✓ Inserted ${CIVIC_OFFICE_ADDITIONS.length} columns at index ${civicStartCol}\n`);

  // Write headers
  const civicHeaderValues = CIVIC_OFFICE_ADDITIONS.map(col => col.name);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Civic_Office_Ledger!${columnToLetter(civicStartCol)}1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [civicHeaderValues]
    }
  });

  console.log('  ✓ Headers written:', civicHeaderValues.join(', '));

  // Write default values to all existing rows
  const civicRowCount = civicOffice.rows;
  if (civicRowCount > 1) {
    const defaultRow = CIVIC_OFFICE_ADDITIONS.map(col => col.defaultValue);
    const defaultData = [];
    for (let i = 2; i <= civicRowCount; i++) {
      defaultData.push(defaultRow);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Civic_Office_Ledger!${columnToLetter(civicStartCol)}2:${columnToLetter(civicStartCol + CIVIC_OFFICE_ADDITIONS.length - 1)}${civicRowCount}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: defaultData
      }
    });

    console.log(`  ✓ Default values written to ${civicRowCount - 1} rows\n`);
  }

  // ========================================================================
  // STEP 6: Verify final state
  // ========================================================================
  console.log('Step 6: Verifying final state...');

  const finalInitHeaders = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Initiative_Tracker!1:1'
  });
  const finalInitCols = finalInitHeaders.data.values[0];

  const finalCivicHeaders = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Civic_Office_Ledger!1:1'
  });
  const finalCivicCols = finalCivicHeaders.data.values[0];

  console.log(`  Initiative_Tracker: ${initCols.length} → ${finalInitCols.length} columns`);
  console.log(`  Civic_Office_Ledger: ${civicCols.length} → ${finalCivicCols.length} columns\n`);

  // ========================================================================
  // DONE
  // ========================================================================
  console.log('=== Migration Complete ===\n');
  console.log('Added columns:');
  console.log('  Initiative_Tracker:', INITIATIVE_TRACKER_ADDITIONS.map(c => c.name).join(', '));
  console.log('  Civic_Office_Ledger:', CIVIC_OFFICE_ADDITIONS.map(c => c.name).join(', '));
  console.log('\nNext steps:');
  console.log('  1. Review columns in Google Sheets');
  console.log('  2. Deploy civicInitiativeEngine.js v1.7 (clasp push)');
  console.log('  3. Test with manual vote\n');
  console.log('To rollback: node scripts/rollbackMayoralVetoColumns.js\n');
}

/**
 * Convert 0-based column index to Excel-style letter (A, B, ..., Z, AA, AB, ...)
 */
function columnToLetter(col) {
  let letter = '';
  let num = col;
  while (num >= 0) {
    letter = String.fromCharCode(65 + (num % 26)) + letter;
    num = Math.floor(num / 26) - 1;
  }
  return letter;
}

main().catch(err => {
  console.error('FATAL ERROR:', err.message);
  if (err.response) {
    console.error('API response:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
