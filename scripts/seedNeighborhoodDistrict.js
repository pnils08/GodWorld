#!/usr/bin/env node
/**
 * seedNeighborhoodDistrict.js — One-off Neighborhood_Map sheet seed
 * [engine/sheet] — closes civic.10b (S215)
 *
 * Adds the District column to Neighborhood_Map sheet AND populates the four
 * canon-authorized neighborhoods (KONO, Temescal, Downtown, Adams Point). Adds
 * KONO as a new row (it doesn't exist in the engine's NMAP_NEIGHBORHOODS list
 * pre-fix; the engine writer addition in `phase08-v3-chicago/v3NeighborhoodWriter.js`
 * lands KONO permanently once clasp push deploys).
 *
 * Why both layers: the engine-side change is the long-term fix (every cycle
 * writes the District col), but Apps Script side won't pick up the new column
 * + KONO row until `clasp push` runs. This script seeds the current sheet
 * state so civic.10c's orphan-ailment hard-stop sees real district data right
 * away, not next-cycle data.
 *
 * Idempotent: re-runs are safe.
 *   - Skip column-add if District already present.
 *   - Skip row-add if KONO row already present.
 *   - Skip District-update on a row if value already correct.
 *
 * Usage:
 *   node scripts/seedNeighborhoodDistrict.js              # dry-run
 *   node scripts/seedNeighborhoodDistrict.js --apply      # write to sheet
 *
 * Canon source: docs/canon/INSTITUTIONS.md §Neighborhoods (KONO entry, S215
 * civic.10a). Only four mappings are canon-authorized today; the rest stay
 * blank until canon expands.
 */

require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');

const SHEET_NAME = 'Neighborhood_Map';
const APPLY = process.argv.includes('--apply');

// Canon-authorized mappings per docs/canon/INSTITUTIONS.md §Neighborhoods.
// Order matters for the KONO new-row insertion (Temescal+Downtown+Adams Point
// already exist; only KONO needs to be appended).
const DISTRICT_MAP = [
  { neighborhood: 'KONO',         district: 'D7' },  // Ashford CRC — primary canon anchor
  { neighborhood: 'Temescal',     district: 'D7' },  // KONO/Temescal corridor adjacency
  { neighborhood: 'Downtown',     district: 'D2' },  // KONO entry §Neighborhoods adjacency
  { neighborhood: 'Adams Point',  district: 'D8' },  // KONO entry §Neighborhoods adjacency
];

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

  for (const mapping of DISTRICT_MAP) {
    const rowIdx = dataRows.findIndex(r => (r[nbhdIdx] || '').trim() === mapping.neighborhood);
    if (rowIdx === -1) {
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
  if (!APPLY) {
    console.log(`\nDry run — use --apply to write.`);
  }
  console.log('');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
