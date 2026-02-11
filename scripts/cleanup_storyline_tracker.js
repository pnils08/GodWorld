const { google } = require('googleapis');
require('dotenv').config({ path: '/root/GodWorld/.env' });

const SPREADSHEET_ID = process.env.GODWORLD_SHEET_ID;
const TAB_NAME = 'Storyline_Tracker';

async function main() {
  // --- Auth ---
  const auth = new google.auth.GoogleAuth({
    keyFile: '/root/GodWorld/credentials/service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  console.log(`Spreadsheet ID: ${SPREADSHEET_ID}`);
  console.log(`Tab: ${TAB_NAME}\n`);

  // --- Step 1: Read all data ---
  console.log('=== STEP 1: Reading all data from Storyline_Tracker ===\n');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}`,
  });

  const rows = res.data.values || [];
  console.log(`Total rows returned (including header): ${rows.length}`);

  if (rows.length === 0) {
    console.log('No data found. Exiting.');
    return;
  }

  // Header row
  const header = rows[0];
  console.log(`Header columns: ${header.join(' | ')}`);

  // Find the Status column
  const statusColIndex = header.findIndex(
    (col) => col && col.trim().toLowerCase() === 'status'
  );
  if (statusColIndex === -1) {
    console.error('ERROR: Could not find a "Status" column in the header row.');
    console.log('Available columns:', header);
    return;
  }
  console.log(`Status column found at index ${statusColIndex} (column "${header[statusColIndex]}")\n`);

  // --- Step 2: Categorize rows ---
  console.log('=== STEP 2: Row Summary ===\n');

  const keepRows = [];    // indices (0-based) of rows to KEEP (header + active/resolved)
  const deleteRows = [];  // indices (0-based) of rows to DELETE
  const statusCounts = {};

  keepRows.push(0); // Always keep header

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const status = (row[statusColIndex] || '').trim().toLowerCase();

    // Count statuses
    const displayStatus = status || '(blank)';
    statusCounts[displayStatus] = (statusCounts[displayStatus] || 0) + 1;

    if (status === 'active' || status === 'resolved') {
      keepRows.push(i);
    } else {
      deleteRows.push(i);
    }
  }

  console.log('Status breakdown:');
  const sortedStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
  for (const [status, count] of sortedStatuses) {
    console.log(`  ${status}: ${count}`);
  }

  console.log(`\nRows to KEEP (header + active + resolved): ${keepRows.length}`);
  console.log(`Rows to DELETE: ${deleteRows.length}`);
  console.log();

  if (deleteRows.length === 0) {
    console.log('Nothing to delete. Exiting.');
    return;
  }

  // --- Step 3: Get the sheetId for Storyline_Tracker ---
  console.log('=== STEP 3: Getting sheetId for batchUpdate ===\n');
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = spreadsheet.data.sheets.find(
    (s) => s.properties.title === TAB_NAME
  );
  if (!sheet) {
    console.error(`ERROR: Tab "${TAB_NAME}" not found in spreadsheet.`);
    return;
  }
  const sheetId = sheet.properties.sheetId;
  console.log(`Sheet ID: ${sheetId}\n`);

  // --- Step 4: Build delete requests (bottom-to-top) ---
  console.log('=== STEP 4: Deleting rows (bottom to top) ===\n');

  // Sort delete indices descending so we delete from bottom to top
  deleteRows.sort((a, b) => b - a);

  // Merge consecutive rows into ranges for efficiency
  // Since sorted descending, consecutive means row[i] === row[i+1] + 1
  const deleteRanges = [];
  let rangeStart = deleteRows[0]; // bottom-most row of current range
  let rangeEnd = deleteRows[0];   // top-most row of current range

  for (let i = 1; i < deleteRows.length; i++) {
    if (deleteRows[i] === rangeEnd - 1) {
      // Consecutive (going upward), extend range
      rangeEnd = deleteRows[i];
    } else {
      // Gap — push current range and start new one
      deleteRanges.push({ startIndex: rangeEnd, endIndex: rangeStart + 1 });
      rangeStart = deleteRows[i];
      rangeEnd = deleteRows[i];
    }
  }
  // Push final range
  deleteRanges.push({ startIndex: rangeEnd, endIndex: rangeStart + 1 });

  console.log(`Consolidated into ${deleteRanges.length} delete range(s).`);

  // Build batchUpdate requests
  const requests = deleteRanges.map((range) => ({
    deleteDimension: {
      range: {
        sheetId: sheetId,
        dimension: 'ROWS',
        startIndex: range.startIndex,
        endIndex: range.endIndex,
      },
    },
  }));

  // Log first and last few for sanity
  console.log(`First delete range: rows ${deleteRanges[0].startIndex}–${deleteRanges[0].endIndex - 1} (0-indexed)`);
  console.log(`Last delete range:  rows ${deleteRanges[deleteRanges.length - 1].startIndex}–${deleteRanges[deleteRanges.length - 1].endIndex - 1} (0-indexed)`);
  console.log();

  // Execute
  console.log('Executing batchUpdate...');
  const batchRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });
  console.log(`batchUpdate completed. ${batchRes.data.replies.length} operations executed.\n`);

  // --- Step 5: Verify final row count ---
  console.log('=== STEP 5: Verification ===\n');
  const verifyRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB_NAME}`,
  });
  const finalRows = verifyRes.data.values || [];
  console.log(`Final row count (including header): ${finalRows.length}`);
  console.log(`Expected: ${keepRows.length}`);

  if (finalRows.length === keepRows.length) {
    console.log('SUCCESS — row counts match.');
  } else {
    console.log('WARNING — row counts do not match. Please verify manually.');
  }

  // Quick status check on final data
  const finalStatusCounts = {};
  for (let i = 1; i < finalRows.length; i++) {
    const status = (finalRows[i][statusColIndex] || '').trim().toLowerCase();
    const displayStatus = status || '(blank)';
    finalStatusCounts[displayStatus] = (finalStatusCounts[displayStatus] || 0) + 1;
  }
  console.log('\nFinal status breakdown:');
  for (const [status, count] of Object.entries(finalStatusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status}: ${count}`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('FATAL ERROR:', err.message);
  if (err.response) {
    console.error('Response data:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
