/**
 * rollbackMayoralVetoColumns.js
 *
 * ROLLBACK script - removes the 7 columns added by addMayoralVetoColumns.js
 *
 * SAFE: Only removes columns if they match expected names
 */

const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';
const CREDENTIALS_PATH = path.resolve(__dirname, '..', 'credentials', 'service-account.json');

// Columns to remove (must match migration script)
const INITIATIVE_TRACKER_REMOVALS = [
  'MayoralAction',
  'MayoralActionCycle',
  'VetoReason',
  'OverrideVoteCycle',
  'OverrideOutcome'
];

const CIVIC_OFFICE_REMOVALS = [
  'ExecutiveActions',
  'Approval'
];

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('=== Mayoral Veto Columns Rollback ===\n');
  console.log('WARNING: This will permanently delete the following columns:');
  console.log('  Initiative_Tracker:', INITIATIVE_TRACKER_REMOVALS.join(', '));
  console.log('  Civic_Office_Ledger:', CIVIC_OFFICE_REMOVALS.join(', '));
  console.log('\nWaiting 5 seconds... (Ctrl+C to cancel)\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // ========================================================================
  // STEP 1: Get sheet metadata
  // ========================================================================
  console.log('Step 1: Fetching spreadsheet metadata...');
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets(properties(sheetId,title))',
  });

  const sheetMap = {};
  meta.data.sheets.forEach(s => {
    sheetMap[s.properties.title] = s.properties.sheetId;
  });

  const initSheetId = sheetMap['Initiative_Tracker'];
  const civicSheetId = sheetMap['Civic_Office_Ledger'];

  if (!initSheetId || !civicSheetId) {
    console.error('ERROR: Required sheets not found');
    process.exit(1);
  }

  console.log('  ✓ Sheet IDs located\n');

  // ========================================================================
  // STEP 2: Read current headers
  // ========================================================================
  console.log('Step 2: Reading current headers...');

  const initHeaders = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Initiative_Tracker!1:1'
  });
  const initCols = initHeaders.data.values[0];

  const civicHeaders = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Civic_Office_Ledger!1:1'
  });
  const civicCols = civicHeaders.data.values[0];

  console.log(`  Initiative_Tracker: ${initCols.length} columns`);
  console.log(`  Civic_Office_Ledger: ${civicCols.length} columns\n`);

  // ========================================================================
  // STEP 3: Find columns to delete
  // ========================================================================
  console.log('Step 3: Locating columns to delete...');

  // Initiative_Tracker
  const initToDelete = [];
  INITIATIVE_TRACKER_REMOVALS.forEach(name => {
    const idx = initCols.indexOf(name);
    if (idx >= 0) {
      initToDelete.push({ name, index: idx });
      console.log(`  Found: Initiative_Tracker.${name} at column ${idx}`);
    } else {
      console.log(`  WARNING: Initiative_Tracker.${name} not found (already removed?)`);
    }
  });

  // Civic_Office_Ledger
  const civicToDelete = [];
  CIVIC_OFFICE_REMOVALS.forEach(name => {
    const idx = civicCols.indexOf(name);
    if (idx >= 0) {
      civicToDelete.push({ name, index: idx });
      console.log(`  Found: Civic_Office_Ledger.${name} at column ${idx}`);
    } else {
      console.log(`  WARNING: Civic_Office_Ledger.${name} not found (already removed?)`);
    }
  });

  if (initToDelete.length === 0 && civicToDelete.length === 0) {
    console.log('\n  No columns to delete. Exiting.\n');
    process.exit(0);
  }

  console.log();

  // ========================================================================
  // STEP 4: Delete columns (in reverse order to preserve indices)
  // ========================================================================
  console.log('Step 4: Deleting columns...');

  const requests = [];

  // Sort by index descending (delete from right to left)
  initToDelete.sort((a, b) => b.index - a.index);
  civicToDelete.sort((a, b) => b.index - a.index);

  // Delete Initiative_Tracker columns
  initToDelete.forEach(col => {
    requests.push({
      deleteDimension: {
        range: {
          sheetId: initSheetId,
          dimension: 'COLUMNS',
          startIndex: col.index,
          endIndex: col.index + 1
        }
      }
    });
    console.log(`  Deleting Initiative_Tracker column ${col.index} (${col.name})`);
  });

  // Delete Civic_Office_Ledger columns
  civicToDelete.forEach(col => {
    requests.push({
      deleteDimension: {
        range: {
          sheetId: civicSheetId,
          dimension: 'COLUMNS',
          startIndex: col.index,
          endIndex: col.index + 1
        }
      }
    });
    console.log(`  Deleting Civic_Office_Ledger column ${col.index} (${col.name})`);
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests }
  });

  console.log(`\n  ✓ Deleted ${requests.length} columns\n`);

  // ========================================================================
  // STEP 5: Verify final state
  // ========================================================================
  console.log('Step 5: Verifying final state...');

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
  console.log('=== Rollback Complete ===\n');
  console.log('Removed columns:');
  console.log('  Initiative_Tracker:', initToDelete.map(c => c.name).join(', '));
  console.log('  Civic_Office_Ledger:', civicToDelete.map(c => c.name).join(', '));
  console.log('\nYou can now re-run the migration if needed.\n');
}

main().catch(err => {
  console.error('FATAL ERROR:', err.message);
  if (err.response) {
    console.error('API response:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
