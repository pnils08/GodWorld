/**
 * ============================================================================
 * archiveStorySeeds.js v1.0 (Node + service account)
 * ============================================================================
 *
 * Maintenance script: moves old Story_Seed_Deck rows to Story_Seed_Deck_Archive.
 *
 * Sibling to maintenance/archiveLifeHistory.js (Apps Script equivalent for
 * LifeHistory_Log). Node + lib/sheets pattern is used here because (a) the
 * fix doesn't require an Apps Script deploy, (b) engine-sheet's recent
 * pattern for ledger-touching maintenance is direct service-account writes
 * per engine.md, (c) S199 LEDGER_HEAT_MAP refresh promoted Story_Seed_Deck to
 * RED tier and S201 priority #5 calls for investigation + fix in this terminal.
 *
 * Story_Seed_Deck grows ~220 rows per cycle (S199-verified — was 30× the S30
 * estimate of +3-8/cycle). Per-cycle count is structural maturation
 * (applyStorySeeds.js has 50+ deduped push sites), NOT a runaway append bug.
 * The bug is structural: no archival. Both consumers (compileHandoff
 * loadStorySeeds_, buildDeskPackets:1996) filter to current-cycle only — so
 * 92.1% of rows in the active sheet (2,457 of 2,668 at C93) are dead weight,
 * read-then-filtered-out every cycle.
 *
 * USAGE:
 *   node maintenance/archiveStorySeeds.js --dry-run   # preview
 *   node maintenance/archiveStorySeeds.js --apply     # execute
 *
 * BEHAVIOR:
 *   - Reads Story_Seed_Deck via lib/sheets.getRawSheetData
 *   - Identifies rows where Cycle < (maxCycle - RETAIN_CYCLES + 1)
 *   - Verifies sheet is chronological (older cycles precede newer; safe to
 *     deleteDimension a contiguous range from the top)
 *   - Apply:
 *       1. Auto-creates Story_Seed_Deck_Archive with same headers if missing
 *       2. Appends archive rows via lib/sheets.appendRows
 *       3. Verifies archive count matches expected
 *       4. deleteDimension on the source sheet (atomic, in-place row removal)
 *       5. Verifies post-state row counts
 *
 * SAFE TO RUN REPEATEDLY: Each run only archives rows older than the cutoff;
 * already-archived cycles aren't moved twice (they're no longer in the source).
 *
 * RETENTION DECISION (S201, Mike-approved):
 *   N=5 — keep current cycle + 4 prior. Conservative-but-tight choice, since
 *   both readers strict-filter to current cycle only. Provides 4-cycle safety
 *   margin in case any future consumer needs cross-cycle context.
 *
 * @version 1.0
 * @phase maintenance
 * ============================================================================
 */

require('/root/GodWorld/lib/env');
const { getRawSheetData, getClient, appendRows, listSheets, createSheet } = require('/root/GodWorld/lib/sheets');

const RETAIN_CYCLES = 5;
const SOURCE = 'Story_Seed_Deck';
const ARCHIVE = 'Story_Seed_Deck_Archive';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apply = process.argv.includes('--apply');
  if (!dryRun && !apply) {
    console.error('Usage: node maintenance/archiveStorySeeds.js --dry-run | --apply');
    process.exit(2);
  }

  const allData = await getRawSheetData(SOURCE);
  if (!allData || allData.length < 2) {
    console.log(`${SOURCE} has no data rows; nothing to archive`);
    return;
  }

  const headers = allData[0];
  const dataRows = allData.slice(1);
  const iCycle = headers.indexOf('Cycle');
  if (iCycle < 0) {
    console.error(`Cycle column not found in ${SOURCE} headers: ${headers.join(', ')}`);
    process.exit(3);
  }

  // Find max cycle in data
  let maxCycle = 0;
  for (const r of dataRows) {
    const c = parseInt(r[iCycle], 10);
    if (!isNaN(c) && c > maxCycle) maxCycle = c;
  }
  if (maxCycle === 0) {
    console.error('Could not determine maxCycle from data');
    process.exit(3);
  }

  const cutoff = maxCycle - (RETAIN_CYCLES - 1);

  // Partition + record first-retain-row position (1-based, sheet-row including header offset)
  const archiveRows = [];
  const retainRows = [];
  let firstRetainSheetRow = null;
  for (let i = 0; i < dataRows.length; i++) {
    const c = parseInt(dataRows[i][iCycle], 10);
    if (!isNaN(c) && c >= cutoff) {
      if (firstRetainSheetRow === null) firstRetainSheetRow = i + 2; // +2: header is row 1, dataRows[0] is row 2
      retainRows.push(dataRows[i]);
    } else {
      archiveRows.push(dataRows[i]);
    }
  }

  // Verify chronological assumption — all archive rows must precede all retain rows
  let chronological = true;
  let firstRetainIndex = (firstRetainSheetRow === null) ? dataRows.length : firstRetainSheetRow - 2;
  for (let i = 0; i < dataRows.length; i++) {
    const c = parseInt(dataRows[i][iCycle], 10);
    if (isNaN(c)) continue;
    const isArchive = c < cutoff;
    const inArchivePosition = (i < firstRetainIndex);
    if (isArchive !== inArchivePosition) { chronological = false; break; }
  }

  // Per-cycle breakdown
  const archiveByCycle = {};
  archiveRows.forEach(r => {
    const c = (r[iCycle] || '').toString();
    archiveByCycle[c] = (archiveByCycle[c] || 0) + 1;
  });
  const archiveCycles = Object.entries(archiveByCycle).sort((a, b) => Number(a[0]) - Number(b[0]));

  // Report
  console.log(`Source: ${SOURCE}`);
  console.log(`Total data rows: ${dataRows.length}`);
  console.log(`Max cycle: ${maxCycle}`);
  console.log(`Retain cycles: ${RETAIN_CYCLES} (keeping rows where Cycle >= ${cutoff})`);
  console.log(`Archive (Cycle < ${cutoff}): ${archiveRows.length} rows`);
  console.log(`Retain: ${retainRows.length} rows`);
  if (archiveCycles.length > 0) {
    console.log(`Archive cycle range: C${archiveCycles[0][0]} → C${archiveCycles[archiveCycles.length - 1][0]}`);
  }
  console.log(`Chronological order check: ${chronological ? 'YES (safe deleteDimension)' : 'NO (would need re-write strategy)'}`);
  if (firstRetainSheetRow !== null) {
    console.log(`First retain row (sheet 1-based): ${firstRetainSheetRow}`);
  }

  if (archiveRows.length === 0) {
    console.log('\nNothing to archive (all rows within retention window).');
    return;
  }

  if (dryRun) {
    console.log('\n--- DRY-RUN ---');
    console.log(`Would append ${archiveRows.length} rows to ${ARCHIVE}`);
    if (firstRetainSheetRow !== null) {
      console.log(`Would delete rows 2..${firstRetainSheetRow - 1} from ${SOURCE} (count=${firstRetainSheetRow - 2})`);
    } else {
      console.log(`All rows would be archived; ${SOURCE} would be left header-only`);
    }
    console.log(`Post-state: ${SOURCE} = header + ${retainRows.length} rows; ${ARCHIVE} = (existing) + ${archiveRows.length} rows`);
    return;
  }

  // APPLY
  console.log('\n--- APPLY ---');
  if (!chronological) {
    console.error('NOT chronological — refusing to deleteDimension. Aborting to avoid silent data loss.');
    process.exit(4);
  }

  // Step 1: ensure archive sheet exists
  const sheets = await listSheets();
  const archiveExists = sheets.some(s => s.title === ARCHIVE);
  if (!archiveExists) {
    console.log(`Creating ${ARCHIVE} with ${headers.length} headers matching ${SOURCE}...`);
    await createSheet(ARCHIVE, headers);
  } else {
    console.log(`${ARCHIVE} already exists`);
  }

  // Step 2: read archive pre-count for verification
  const archivePre = await getRawSheetData(ARCHIVE);
  const archivePreCount = Math.max(0, archivePre.length - 1);

  // Step 3: append archive rows
  console.log(`Appending ${archiveRows.length} rows to ${ARCHIVE}...`);
  await appendRows(ARCHIVE, archiveRows);

  // Step 4: verify archive grew by archiveRows.length
  const archiveAfter = await getRawSheetData(ARCHIVE);
  const archiveAfterCount = Math.max(0, archiveAfter.length - 1);
  const grew = archiveAfterCount - archivePreCount;
  if (grew !== archiveRows.length) {
    console.error(`ABORT: archive append mismatch — expected +${archiveRows.length}, got +${grew}. Source untouched.`);
    process.exit(5);
  }
  console.log(`${ARCHIVE} verified: ${archivePreCount} → ${archiveAfterCount} (+${grew})`);

  // Step 5: get source sheetId for deleteDimension
  const client = await getClient();
  const spreadsheetId = process.env.GODWORLD_SHEET_ID;
  if (!spreadsheetId) {
    console.error('GODWORLD_SHEET_ID not set in environment. Archive already appended; manual cleanup needed.');
    process.exit(6);
  }
  const meta = await client.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
  const sourceProps = meta.data.sheets.find(s => s.properties.title === SOURCE);
  if (!sourceProps) {
    console.error(`${SOURCE} not found in metadata — cannot deleteDimension. Archive already appended; manual cleanup needed.`);
    process.exit(6);
  }
  const sourceSheetId = sourceProps.properties.sheetId;

  // Step 6: deleteDimension — atomic in-place row removal
  const deleteCount = firstRetainSheetRow - 2; // rows between header (1) and first retain (firstRetainSheetRow)
  console.log(`Deleting ${deleteCount} rows from ${SOURCE} (rows 2..${firstRetainSheetRow - 1}) via deleteDimension...`);
  await client.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sourceSheetId,
            dimension: 'ROWS',
            startIndex: 1,                // 0-based: skip header
            endIndex: 1 + deleteCount     // exclusive
          }
        }
      }]
    }
  });

  // Step 7: verify source post-state
  const sourceAfter = await getRawSheetData(SOURCE);
  const sourceAfterCount = Math.max(0, sourceAfter.length - 1);
  console.log(`${SOURCE} now has ${sourceAfterCount} data rows (expected ${retainRows.length})`);
  if (sourceAfterCount !== retainRows.length) {
    console.error(`WARN: ${SOURCE} row count mismatch — expected ${retainRows.length}, got ${sourceAfterCount}. Inspect manually.`);
    process.exit(7);
  }

  // Step 8: verify cycle range in remaining rows
  const remainingHeaders = sourceAfter[0];
  const remainingICycle = remainingHeaders.indexOf('Cycle');
  let remainMin = Infinity, remainMax = -Infinity;
  for (let i = 1; i < sourceAfter.length; i++) {
    const c = parseInt(sourceAfter[i][remainingICycle], 10);
    if (!isNaN(c)) {
      if (c < remainMin) remainMin = c;
      if (c > remainMax) remainMax = c;
    }
  }
  console.log(`${SOURCE} retained cycle range: C${remainMin} → C${remainMax}`);
  console.log(`\nArchive complete.`);
}

main().catch(e => { console.error('FATAL:', e.message); console.error(e.stack); process.exit(1); });
