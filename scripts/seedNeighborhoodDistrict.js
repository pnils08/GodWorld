#!/usr/bin/env node
/**
 * seedNeighborhoodDistrict.js — Neighborhood_Map District seeder
 * [engine/sheet] — opened civic.10b (S215), repurposed civic.18 Task 4b
 *
 * Makes Neighborhood_Map.District true. Derives every mapping from
 * lib/districtMap.js (the reconciled Node-side mirror) and writes it cell by cell.
 *
 * WHAT CHANGED AT civic.18 (2026-08-15). This was a one-off that seeded 4
 * canon-authorized hoods, on the assumption that the engine writer owned the
 * column from then on ("the engine-side change is the long-term fix — every cycle
 * writes the District col"). That assumption was the defect. v3NeighborhoodWriter
 * held a private 8-entry map and rewrote the WHOLE column every cycle, so the
 * other 14 live hoods were blank-overwritten on every run — the column was a
 * printout of a literal, never a ledger. Task 4a removed that write. District is
 * now hand-authored ledger truth, like CoreSimRank, and THIS script is how it is
 * authored.
 *
 * Idempotent: re-runs are safe.
 *   - Skip column-add if District already present.
 *   - Skip District-update on a row if the value is already correct.
 *   - Never creates a neighborhood unless --add-rows is passed.
 *
 * Usage:
 *   node scripts/seedNeighborhoodDistrict.js               # dry-run
 *   node scripts/seedNeighborhoodDistrict.js --apply       # write to sheet
 *   node scripts/seedNeighborhoodDistrict.js --add-rows    # also CREATE missing hoods (world-shape change)
 *   node scripts/seedNeighborhoodDistrict.js --sheet-id=<id> --apply   # target a SANDBOX
 *
 * TARGETING: use --sheet-id for a sandbox. Do NOT try `GODWORLD_SHEET_ID=<id> node …`
 * — lib/env loads dotenv with override:true, so the .env production id wins and the
 * write lands on LIVE.
 *
 * ORDERING (civic.18): do not --apply until Task 4a is deployed live. Until then
 * v3NeighborhoodWriter still rewrites the District column every cycle and will
 * blank-overwrite whatever this seeds.
 *
 * Canon source: docs/canon/INSTITUTIONS.md §Neighborhoods, as reconciled in
 * docs/plans/2026-08-15-district-map-reconciliation.md §4 (Coliseum + Elmhurst
 * retired to the Baylight successor, KONO at D7, Baylight at D5).
 */

require('/root/GodWorld/lib/env');

// SANDBOX TARGETING — must happen AFTER lib/env loads, and a shell variable will
// NOT work. lib/env calls dotenv with `override: true`, so the .env file's
// GODWORLD_SHEET_ID (PRODUCTION) clobbers anything exported into the shell. Passing
// `GODWORLD_SHEET_ID=<sandbox> node …` therefore silently writes to LIVE — verified
// 2026-08-15, the override resolved straight back to the production id. Set it here,
// after the loader has run, where it sticks.
const sheetIdArg = (process.argv.find(a => a.startsWith('--sheet-id=')) || '').split('=')[1];
if (sheetIdArg) {
  process.env.GODWORLD_SHEET_ID = sheetIdArg;
  console.log(`[target] sheet id overridden -> ${sheetIdArg}`);
}

const sheets = require('/root/GodWorld/lib/sheets');
console.log(`[target] writing against sheet ${process.env.GODWORLD_SHEET_ID}`);

const SHEET_NAME = 'Neighborhood_Map';
const APPLY = process.argv.includes('--apply');
const ADD_ROWS = process.argv.includes('--add-rows');

// civic.18 Task 4b — derived from lib/districtMap.js, not a frozen literal.
//
// This was 4 hand-listed S215 mappings with the note "only four are
// canon-authorized today; the rest stay blank until canon expands." Canon has
// since expanded and the map was reconciled in civic.18: Coliseum and Elmhurst
// removed (INSTITUTIONS §336 makes Baylight the successor on the same land),
// KONO settled at D7, Baylight at D5. lib/districtMap.js is the Node-side mirror
// of that reconciliation, so deriving here keeps one source instead of a fifth copy.
//
// Deliberately NOT reading Neighborhood_Map.District as the source: this script
// is what MAKES that column true. Reading it would be circular.
const { DISTRICT_NEIGHBORHOODS } = require('/root/GodWorld/lib/districtMap');

const DISTRICT_MAP = Object.keys(DISTRICT_NEIGHBORHOODS)
  .sort()
  .flatMap(d => DISTRICT_NEIGHBORHOODS[d].map(n => ({ neighborhood: n, district: d })));

async function main() {
  console.log(`\n=== seedNeighborhoodDistrict.js — ${APPLY ? '(LIVE WRITE)' : '(DRY RUN)'} ===\n`);

  // Step 1 — read sheet state
  const raw = await sheets.getSheetData(SHEET_NAME);
  const header = raw[0];
  const dataRows = raw.slice(1);
  const nbhdIdx = header.indexOf('Neighborhood');
  let districtIdx = header.indexOf('District');

  console.log(`Sheet: ${dataRows.length} data rows, ${header.length} columns.`);
  console.log(`Neighborhood column index: ${nbhdIdx}`);
  console.log(`District column index: ${districtIdx} (${districtIdx === -1 ? 'NOT PRESENT' : 'present'})`);

  if (nbhdIdx === -1) {
    console.error('[ERROR] Neighborhood column not found — schema unexpected. Abort.');
    process.exit(1);
  }

  // Step 2 — ensure District column exists
  let newDistrictColIdx = districtIdx;
  if (districtIdx === -1) {
    const newColCount = header.length + 1;
    console.log(`\nWould add 'District' header at column ${newColCount}.`);
    if (APPLY) {
      await sheets.resizeSheet(SHEET_NAME, newColCount, null);
      // appendColumns writes header at (startRow, startCol) — col is 0-indexed
      await sheets.appendColumns(SHEET_NAME, 1, header.length, ['District']);
      console.log(`  Column added.`);
    }
    newDistrictColIdx = header.length;
  } else {
    console.log(`District column already exists — skip column add.`);
  }

  // Step 3 — populate canon-authorized rows
  console.log(`\nDistrict assignments:`);
  let updates = 0;
  let skipped = 0;
  let newRowsToAppend = [];
  let missingRows = [];

  for (const mapping of DISTRICT_MAP) {
    const rowIdx = dataRows.findIndex(r => (r[nbhdIdx] || '').trim() === mapping.neighborhood);
    if (rowIdx === -1) {
      // civic.18 Task 4b — appending a row here CREATES A NEIGHBORHOOD, which is a
      // world-shape change, not a data fill. Montclair is the live case: ruled
      // aboard for D6 and already present in 4 derived artifacts (a Crime_Metrics
      // row, 5 Household_Ledger households, a Faith_Organizations entry), but it
      // has no Neighborhood_Map row and adding one makes it the 23rd hood. That is
      // plan Task 1, deliberately separate from seeding District on the 22 that
      // already exist. Gated behind --add-rows so a routine reseed can never
      // silently grow the world.
      if (!ADD_ROWS) {
        console.log(`  ${mapping.neighborhood}: NO ROW in Neighborhood_Map — skipped (pass --add-rows to create it)`);
        missingRows.push(mapping.neighborhood);
        continue;
      }
      // New neighborhood — append a row. Build minimal row with Neighborhood
      // + District; other cols blank until engine cycle fills them.
      const rowData = new Array(Math.max(newDistrictColIdx + 1, header.length + 1)).fill('');
      rowData[nbhdIdx] = mapping.neighborhood;
      rowData[newDistrictColIdx] = mapping.district;
      newRowsToAppend.push(rowData);
      console.log(`  ${mapping.neighborhood} (new row): District=${mapping.district}`);
      continue;
    }

    const existingDistrict = (dataRows[rowIdx][newDistrictColIdx] || '').trim();
    if (existingDistrict === mapping.district) {
      console.log(`  ${mapping.neighborhood}: District=${mapping.district} (already set — skip)`);
      skipped++;
      continue;
    }

    // Row index in sheet is 1-indexed + 1 for header
    const sheetRow = rowIdx + 2;
    console.log(`  ${mapping.neighborhood} (row ${sheetRow}): District="${existingDistrict}" → "${mapping.district}"`);
    if (APPLY) {
      await sheets.updateCell(SHEET_NAME, sheetRow, 'District', mapping.district);
    }
    updates++;
  }

  if (newRowsToAppend.length > 0) {
    if (APPLY) {
      await sheets.appendRows(SHEET_NAME, newRowsToAppend);
      console.log(`\n  Appended ${newRowsToAppend.length} new row(s).`);
    } else {
      console.log(`\n  Would append ${newRowsToAppend.length} new row(s) (dry-run).`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Existing-row updates: ${updates} | Skipped (already current): ${skipped} | New rows appended: ${newRowsToAppend.length}`);
  if (missingRows.length > 0) {
    console.log(`Mapped but absent from Neighborhood_Map (${missingRows.length}): ${missingRows.join(', ')}`);
    console.log(`  -> these are world-shape additions; pass --add-rows to create them.`);
  }
  if (!APPLY) {
    console.log(`\nDry run — use --apply to write.`);
  }
  console.log('');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
