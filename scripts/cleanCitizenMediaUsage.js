#!/usr/bin/env node
/**
 * cleanCitizenMediaUsage.js — Clean garbage from Citizen_Media_Usage sheet
 *
 * Problems found:
 *   1. 676 duplicate name+cycle rows (same citizen counted multiple times)
 *   2. 346 dirty CitizenName values (age, neighborhood, occupation jammed into name field)
 *   3. Cycle 79 contains ~400 rows re-imported from C73-C75
 *
 * This script reads the sheet, cleans names, deduplicates, removes C79 backlog,
 * and rewrites the sheet with clean data. Resets processing flags so the engine
 * can re-process with correct name matching.
 *
 * Usage:
 *   node -r dotenv/config scripts/cleanCitizenMediaUsage.js --dry-run
 *   node -r dotenv/config scripts/cleanCitizenMediaUsage.js --apply
 */

const { getSheetData, updateRange, getClient } = require('../lib/sheets');

// ── Name Cleaning ──────────────────────────────────────────────────────────

/**
 * Clean a dirty CitizenName value.
 * Strips ages, neighborhoods, occupations, annotations, titles.
 *
 * Examples:
 *   "Kevin Park, 36, Laurel" → "Kevin Park"
 *   "Rabbi Miriam Adler, Beth Jacob Congregation" → "Miriam Adler"
 *   "Mara Vance (City Planning Director) — FIRST CANON APPEARANCE" → "Mara Vance"
 *   "Linda Chow, 51, Rockridge, Product Operations Manager (NEW)" → "Linda Chow"
 *   "Dr. Vanessa Tran-Muñoz" → "Vanessa Tran-Muñoz"
 */
function cleanCitizenName(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let name = raw.trim();

  // Strip parenthetical annotations: "(City Planning Director)", "(NEW)", etc.
  name = name.replace(/\s*\(.*?\)/g, '');

  // Strip em-dash annotations: "— FIRST CANON APPEARANCE"
  name = name.replace(/\s*[—–-]{1,2}\s+[A-Z].*$/, '');

  // Strip everything after first comma (age, neighborhood, occupation)
  if (name.includes(',')) {
    name = name.split(',')[0].trim();
  }

  // Strip common title prefixes
  name = name.replace(/^(Mayor|Chief|Dr\.|Rabbi|Rev\.|Pastor|Officer|Detective|Director|Commissioner|Councilmember|Deputy Mayor|Council President)\s+/i, '');

  return name.trim();
}

// ── C79 Backlog Detection ──────────────────────────────────────────────────

/**
 * Detect if a C79 row is actually a re-import from an earlier cycle.
 * We check if the Context field matches rows from C73-C75 exactly.
 */
function buildEarlierCycleFingerprints(rows, headers) {
  const nameCol = headers.indexOf('CitizenName');
  const cycleCol = headers.indexOf('Cycle');
  const contextCol = headers.indexOf('Context');
  const usageCol = headers.indexOf('UsageType');

  const fingerprints = new Set();
  for (const row of rows) {
    const cycle = Number(row[cycleCol]);
    if (cycle >= 73 && cycle <= 75) {
      // Fingerprint: name|usageType|context
      const fp = `${row[nameCol]}|${row[usageCol]}|${row[contextCol]}`;
      fingerprints.add(fp);
    }
  }
  return { fingerprints, nameCol, cycleCol, contextCol, usageCol };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = !process.argv.includes('--apply');

  if (dryRun) {
    console.log('DRY RUN — no changes will be made. Use --apply to write.\n');
  } else {
    console.log('APPLY MODE — will rewrite Citizen_Media_Usage sheet.\n');
  }

  // 1. Read current data
  console.log('Reading Citizen_Media_Usage...');
  const data = await getSheetData('Citizen_Media_Usage');
  if (data.length < 2) {
    console.log('Sheet is empty or has only headers.');
    return;
  }

  const headers = data[0];
  const rows = data.slice(1);
  console.log(`  ${rows.length} data rows, ${headers.length} columns`);
  console.log(`  Headers: ${headers.join(', ')}\n`);

  const nameCol = headers.indexOf('CitizenName');
  const cycleCol = headers.indexOf('Cycle');
  const contextCol = headers.indexOf('Context');
  const usageCol = headers.indexOf('UsageType');
  const reporterCol = headers.indexOf('Reporter');
  const processedCol = headers.indexOf('Processed');
  const routedCol = headers.indexOf('Routed');
  const fameCol = headers.indexOf('FameProcessed');

  if (nameCol === -1 || cycleCol === -1) {
    console.error('Cannot find CitizenName or Cycle column. Aborting.');
    process.exit(1);
  }

  // 2. Build C73-C75 fingerprints for backlog detection
  const { fingerprints: earlierFingerprints } = buildEarlierCycleFingerprints(rows, headers);
  console.log(`C73-C75 fingerprints for backlog detection: ${earlierFingerprints.size}\n`);

  // 3. Process each row
  const stats = {
    total: rows.length,
    kept: 0,
    removedDuplicate: 0,
    removedBacklog: 0,
    namesCleaned: 0,
    flagsReset: 0
  };

  const seen = new Set(); // track name+cycle for dedup
  const cleanRows = [];

  for (let i = 0; i < rows.length; i++) {
    const row = [...rows[i]]; // copy
    const cycle = Number(row[cycleCol]);
    const rawName = String(row[nameCol] || '');
    const context = String(row[contextCol] || '');
    const usage = String(row[usageCol] || '');

    // 3a. C79 backlog detection — is this a C73-C75 row re-stamped as C79?
    if (cycle === 79) {
      const fp = `${rawName}|${usage}|${context}`;
      if (earlierFingerprints.has(fp)) {
        stats.removedBacklog++;
        continue;
      }
    }

    // 3b. Clean the name
    const cleanName = cleanCitizenName(rawName);
    if (!cleanName) {
      stats.removedDuplicate++; // empty name after cleaning = garbage
      continue;
    }

    if (cleanName !== rawName) {
      stats.namesCleaned++;
      row[nameCol] = cleanName;
    }

    // 3c. Deduplicate — keep first occurrence per cleanName + cycle + usageType
    const dedupKey = `${cleanName.toLowerCase()}|${cycle}|${usage.toLowerCase()}`;
    if (seen.has(dedupKey)) {
      stats.removedDuplicate++;
      continue;
    }
    seen.add(dedupKey);

    // 3d. Reset processing flags so engine can re-process with clean names
    if (processedCol !== -1 && row[processedCol]) {
      row[processedCol] = '';
      stats.flagsReset++;
    }
    if (routedCol !== -1 && row[routedCol]) {
      row[routedCol] = '';
    }
    if (fameCol !== -1 && row[fameCol]) {
      row[fameCol] = '';
    }

    cleanRows.push(row);
    stats.kept++;
  }

  // 4. Report
  console.log('=== CLEANUP REPORT ===');
  console.log(`  Total rows:        ${stats.total}`);
  console.log(`  Kept:              ${stats.kept}`);
  console.log(`  Removed (dupes):   ${stats.removedDuplicate}`);
  console.log(`  Removed (backlog): ${stats.removedBacklog}`);
  console.log(`  Names cleaned:     ${stats.namesCleaned}`);
  console.log(`  Flags reset:       ${stats.flagsReset}`);
  console.log(`  Reduction:         ${stats.total - stats.kept} rows (${Math.round((1 - stats.kept / stats.total) * 100)}%)`);
  console.log('');

  // Show sample of cleaned names
  const cleanedExamples = [];
  for (let i = 0; i < rows.length && cleanedExamples.length < 10; i++) {
    const raw = String(rows[i][nameCol] || '');
    const clean = cleanCitizenName(raw);
    if (clean && clean !== raw) {
      cleanedExamples.push({ raw, clean });
    }
  }
  if (cleanedExamples.length > 0) {
    console.log('Sample name cleanups:');
    for (const ex of cleanedExamples) {
      console.log(`  "${ex.raw}" → "${ex.clean}"`);
    }
    console.log('');
  }

  // Show per-cycle breakdown
  const cycleCounts = {};
  for (const row of cleanRows) {
    const c = row[cycleCol];
    cycleCounts[c] = (cycleCounts[c] || 0) + 1;
  }
  console.log('Clean rows per cycle:');
  for (const [c, count] of Object.entries(cycleCounts).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`  C${c}: ${count} rows`);
  }
  console.log('');

  if (dryRun) {
    console.log('DRY RUN complete. Run with --apply to write changes.');
    return;
  }

  // 5. Apply — clear sheet and rewrite with clean data
  console.log('Applying changes to live sheet...');

  const client = await getClient();
  const spreadsheetId = process.env.GODWORLD_SHEET_ID;

  // 5a. Get sheet ID for clearing
  const metadata = await client.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties'
  });
  const sheetMeta = metadata.data.sheets.find(s => s.properties.title === 'Citizen_Media_Usage');
  if (!sheetMeta) {
    console.error('Citizen_Media_Usage sheet not found!');
    process.exit(1);
  }

  // 5b. Clear all data rows (keep header)
  const clearRange = `Citizen_Media_Usage!A2:Z${rows.length + 1}`;
  await client.spreadsheets.values.clear({
    spreadsheetId,
    range: clearRange
  });
  console.log(`  Cleared ${rows.length} rows`);

  // 5c. Write clean data
  // Pad all rows to same column count as headers
  const paddedRows = cleanRows.map(row => {
    const padded = [...row];
    while (padded.length < headers.length) padded.push('');
    return padded.slice(0, headers.length);
  });

  if (paddedRows.length > 0) {
    const writeRange = `Citizen_Media_Usage!A2`;
    await updateRange(writeRange, paddedRows);
    console.log(`  Wrote ${paddedRows.length} clean rows`);
  }

  console.log('\nDone. Sheet cleaned successfully.');
  console.log(`  Before: ${stats.total} rows → After: ${stats.kept} rows`);
  console.log('  Processing flags reset — engine will re-process on next cycle run.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
