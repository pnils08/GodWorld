/**
 * ============================================================================
 * REPAIR: Event_Arc_Ledger Header Alignment (Session 44)
 * ============================================================================
 *
 * Problem: The sheet has 23 columns but the writer outputs 19.
 * Extra columns (DomainTag duplicate, Holiday duplicate, MakerHold,
 * ForceResolve) were injected mid-sheet, shifting headers out of
 * alignment with the writer's positional data.
 *
 * Fix:
 *   Step 1: Rename 5 headers (positions 3,14,15,16,18) to match
 *           the writer's canonical schema
 *   Step 2: Add real lifecycle columns at the end (position 23+)
 *
 * Usage:
 *   node scripts/repairArcLedgerHeaders.js --dry-run   (diagnose only)
 *   node scripts/repairArcLedgerHeaders.js              (apply fix)
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// CANONICAL WRITER SCHEMA (v3LedgerWriter.js — 19 columns, A-S)
// ════════════════════════════════════════════════════════════════════════════

const WRITER_SCHEMA = [
  'Timestamp',        // 0  A
  'Cycle',            // 1  B
  'ArcId',            // 2  C
  'Type',             // 3  D  ← sheet says "DomainTag"
  'Phase',            // 4  E
  'Tension',          // 5  F
  'Neighborhood',     // 6  G
  'DomainTag',        // 7  H
  'Summary',          // 8  I
  'CitizenCount',     // 9  J
  'CycleCreated',     // 10 K
  'CycleResolved',    // 11 L
  'ArcAge',           // 12 M
  'Holiday',          // 13 N
  'HolidayPriority',  // 14 O  ← sheet says "Holiday"
  'FirstFriday',      // 15 P  ← sheet says "MakerHold"
  'CreationDay',      // 16 Q  ← sheet says "ForceResolve"
  'SportsSeason',     // 17 R
  'CalendarTrigger'   // 18 S  ← sheet says "ResolutionReason_CORRUPTED"
];

// Lifecycle columns that SHOULD exist after the writer's 19 (position 19+)
const LIFECYCLE_COLUMNS = [
  'Escalate',
  'ResolutionType',
  'ResolutionCycle',
  'PrevPhase',
  'MakerHold',
  'ForceResolve',
  'ResolutionReason',
  'Age',
  'AutoAdvance',
  'PhaseStartCycle',
  'PhaseDuration',
  'NextPhaseTransition',
  'TensionDecay'
];


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   Event_Arc_Ledger Header Repair (Session 44)                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN — no changes will be made\n');
  }

  // Connect
  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`✅ Connected: ${conn.title}\n`);

  // Read current headers
  const data = await sheets.getSheetData('Event_Arc_Ledger');
  if (!data || data.length === 0) {
    console.log('❌ Event_Arc_Ledger is empty or not found');
    process.exit(1);
  }

  const currentHeaders = data[0];
  const rowCount = data.length - 1;
  console.log(`Current columns: ${currentHeaders.length}`);
  console.log(`Data rows: ${rowCount}`);
  console.log('');

  // ──────────────────────────────────────────────────────────────────────
  // STEP 1: Diagnose header misalignment (positions 0-18)
  // ──────────────────────────────────────────────────────────────────────

  console.log('═══ STEP 1: Header alignment check (writer positions 0-18) ═══\n');

  const fixes = [];

  for (let i = 0; i < WRITER_SCHEMA.length; i++) {
    const expected = WRITER_SCHEMA[i];
    const actual = currentHeaders[i] || '(missing)';
    const match = actual === expected;

    if (!match) {
      fixes.push({ col: i, from: actual, to: expected });
      console.log(`  Col ${i}: "${actual}" → "${expected}"  ✗ NEEDS FIX`);
    } else {
      console.log(`  Col ${i}: "${actual}"  ✓`);
    }
  }

  console.log(`\nHeader fixes needed: ${fixes.length}`);

  // ──────────────────────────────────────────────────────────────────────
  // STEP 2: Check existing lifecycle columns (position 19+)
  // ──────────────────────────────────────────────────────────────────────

  console.log('\n═══ STEP 2: Lifecycle columns (position 19+) ═══\n');

  const existingLifecycle = [];
  for (let i = 19; i < currentHeaders.length; i++) {
    existingLifecycle.push(currentHeaders[i]);
    console.log(`  Col ${i}: "${currentHeaders[i]}"`);
  }

  // Figure out which lifecycle columns need to be added
  const missingLifecycle = [];
  for (const col of LIFECYCLE_COLUMNS) {
    // Check if it exists at position 19+ (not in the writer zone)
    const existsAfterWriter = existingLifecycle.includes(col);
    if (!existsAfterWriter) {
      missingLifecycle.push(col);
    }
  }

  console.log(`\nExisting lifecycle columns: ${existingLifecycle.length}`);
  console.log(`Missing lifecycle columns: ${missingLifecycle.length}`);
  if (missingLifecycle.length > 0) {
    console.log(`  Need to add: ${missingLifecycle.join(', ')}`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // STEP 3: Spot-check data at misaligned positions
  // ──────────────────────────────────────────────────────────────────────

  if (fixes.length > 0) {
    console.log('\n═══ STEP 3: Data spot-check at misaligned columns ═══\n');

    for (const fix of fixes) {
      const samples = [];
      for (let r = 1; r < Math.min(6, data.length); r++) {
        const val = data[r][fix.col];
        if (val !== '' && val !== null && val !== undefined) {
          samples.push(String(val).substring(0, 40));
        }
      }
      console.log(`  Col ${fix.col} ("${fix.from}" → "${fix.to}"):`);
      console.log(`    Samples: ${samples.join(' | ') || '(all empty)'}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // STEP 4: Apply fixes
  // ──────────────────────────────────────────────────────────────────────

  if (dryRun) {
    console.log('\n🔍 DRY RUN complete. Run without --dry-run to apply.\n');
    return;
  }

  if (fixes.length === 0 && missingLifecycle.length === 0) {
    console.log('\n✅ Nothing to fix — headers are aligned!\n');
    return;
  }

  console.log('\n═══ STEP 4: Applying fixes ═══\n');

  // Fix the writer-zone headers (positions 0-18)
  if (fixes.length > 0) {
    console.log('Fixing writer-zone headers (row 1, cols A-S)...');

    // Write the full correct header row for positions 0-18
    const range = `Event_Arc_Ledger!A1:S1`;
    await sheets.updateRange(range, [WRITER_SCHEMA]);

    console.log(`  ✅ Fixed ${fixes.length} headers in writer zone`);
  }

  // Add missing lifecycle columns at the end
  if (missingLifecycle.length > 0) {
    const startCol = currentHeaders.length;
    console.log(`\nAdding ${missingLifecycle.length} lifecycle columns at position ${startCol}...`);

    await sheets.appendColumns('Event_Arc_Ledger', 1, startCol, missingLifecycle);

    console.log(`  ✅ Added: ${missingLifecycle.join(', ')}`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // STEP 5: Verify
  // ──────────────────────────────────────────────────────────────────────

  console.log('\n═══ STEP 5: Verification ═══\n');

  const verifyData = await sheets.getSheetData('Event_Arc_Ledger');
  const newHeaders = verifyData[0];

  console.log(`Total columns after fix: ${newHeaders.length}`);
  console.log('');

  let allGood = true;
  for (let i = 0; i < WRITER_SCHEMA.length; i++) {
    const ok = newHeaders[i] === WRITER_SCHEMA[i];
    if (!ok) {
      console.log(`  Col ${i}: "${newHeaders[i]}" — STILL WRONG (expected "${WRITER_SCHEMA[i]}")`);
      allGood = false;
    }
  }

  if (allGood) {
    console.log('  Writer zone (0-18): ✅ All headers match canonical schema');
  }

  console.log('  Lifecycle zone (19+):');
  for (let i = 19; i < newHeaders.length; i++) {
    console.log(`    Col ${i}: ${newHeaders[i]}`);
  }

  console.log('\n✅ Repair complete!\n');
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
