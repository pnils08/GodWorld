/**
 * delete-continuity-tabs.js
 * 
 * Deletes 3 dead sheet tabs from the GodWorld spreadsheet that were part of
 * the continuity pipeline eliminated in Session 8:
 *   - Continuity_Loop
 *   - Continuity_Intake
 *   - Raw_Continuity_Paste
 */

const { google } = require('googleapis');
const path = require('path');

const TABS_TO_DELETE = ['Continuity_Loop', 'Continuity_Intake', 'Raw_Continuity_Paste'];
const SPREADSHEET_ID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';
const CREDENTIALS_PATH = path.resolve(__dirname, '..', 'credentials', 'service-account.json');

async function main() {
  // Authenticate with service account
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Step 1: Get spreadsheet metadata to find numeric sheetIds
  console.log('Fetching spreadsheet metadata...');
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets(properties(sheetId,title))',
  });

  const allSheets = meta.data.sheets.map(s => s.properties);
  console.log(`Found ${allSheets.length} total tabs in the spreadsheet.\n`);

  // Build a map of tab name -> sheetId for the ones we want to delete
  const deleteTargets = [];
  const missing = [];

  for (const tabName of TABS_TO_DELETE) {
    const found = allSheets.find(s => s.title === tabName);
    if (found) {
      deleteTargets.push({ title: found.title, sheetId: found.sheetId });
      console.log(`  Found tab: "${found.title}" (sheetId: ${found.sheetId})`);
    } else {
      missing.push(tabName);
      console.log(`  NOT FOUND: "${tabName}" — skipping`);
    }
  }

  if (missing.length > 0) {
    console.log(`\nWarning: ${missing.length} tab(s) were not found and will be skipped.`);
  }

  if (deleteTargets.length === 0) {
    console.log('\nNo tabs to delete. Exiting.');
    return;
  }

  // Step 2: Build batchUpdate with deleteSheet requests
  console.log(`\nDeleting ${deleteTargets.length} tab(s)...`);

  const requests = deleteTargets.map(t => ({
    deleteSheet: { sheetId: t.sheetId },
  }));

  const result = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  console.log(`\nbatchUpdate completed. ${result.data.replies.length} operation(s) executed.\n`);

  for (const target of deleteTargets) {
    console.log(`  Deleted: "${target.title}" (sheetId: ${target.sheetId})`);
  }

  console.log('\nDone. All dead continuity tabs have been removed.');
}

main().catch(err => {
  console.error('Error:', err.message);
  if (err.response) {
    console.error('API response:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
