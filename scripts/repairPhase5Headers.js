/**
 * ============================================================================
 * REPAIR: Phase 5/6 Sheet Headers (Session 44)
 * ============================================================================
 *
 * Adds missing lifecycle columns to:
 *   1. Storyline_Tracker — 8 columns for storylineHealthEngine.js
 *   2. Story_Hook_Deck — 8 columns for hookLifecycleEngine.js
 *
 * Usage:
 *   node scripts/repairPhase5Headers.js --dry-run   (diagnose only)
 *   node scripts/repairPhase5Headers.js              (apply fix)
 *
 * ============================================================================
 */

const sheets = require('../lib/sheets');

// ════════════════════════════════════════════════════════════════════════════
// STORYLINE_TRACKER — lifecycle columns for storylineHealthEngine.js
// ════════════════════════════════════════════════════════════════════════════

const STORYLINE_LIFECYCLE = [
  'StorylineId',
  'Title',
  'LinkedArc',
  'LastMentionedCycle',
  'LastCoverageCycle',
  'MentionCount',
  'CoverageGap',
  'ResolutionCondition',
  'StaleAfterCycles',
  'IsStale',
  'WrapUpGenerated'
];

// ════════════════════════════════════════════════════════════════════════════
// STORY_HOOK_DECK — lifecycle columns for hookLifecycleEngine.js
// ════════════════════════════════════════════════════════════════════════════

const HOOK_LIFECYCLE = [
  'Severity',
  'CreatedCycle',
  'HookAge',
  'ExpiresAfter',
  'IsExpired',
  'PickedUp',
  'PickupCycle'
];


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   Phase 5/6 Sheet Header Repair (Session 44)                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('DRY RUN — no changes will be made\n');
  }

  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`Connected: ${conn.title}\n`);

  // ──────────────────────────────────────────────────────────────────────
  // 1. STORY_HOOK_DECK — fix HookID case + add lifecycle columns
  // ──────────────────────────────────────────────────────────────────────

  console.log('═══ Story_Hook_Deck ═══\n');

  const hookData = await sheets.getSheetData('Story_Hook_Deck');
  const hookHeaders = hookData[0];
  console.log(`Current columns: ${hookHeaders.length}`);
  console.log(`Rows: ${hookData.length - 1}`);

  // Check for HookID → HookId case fix (hookLifecycleEngine uses 'HookId')
  const hookIdIdx = hookHeaders.indexOf('HookID');
  if (hookIdIdx >= 0) {
    console.log(`\n  HookID found at col ${hookIdIdx} — hookLifecycleEngine uses "HookId" (lowercase d)`);
    console.log('  This case mismatch causes indexOf to return -1');
  }

  // Check which lifecycle columns are missing
  const missingHookCols = [];
  for (const col of HOOK_LIFECYCLE) {
    if (!hookHeaders.includes(col)) {
      missingHookCols.push(col);
      console.log(`  MISSING: ${col}`);
    } else {
      console.log(`  Present: ${col}`);
    }
  }

  console.log(`\nMissing lifecycle columns: ${missingHookCols.length}`);

  // ──────────────────────────────────────────────────────────────────────
  // 2. STORYLINE_TRACKER — add lifecycle columns
  // ──────────────────────────────────────────────────────────────────────

  console.log('\n═══ Storyline_Tracker ═══\n');

  const storyData = await sheets.getSheetData('Storyline_Tracker');
  const storyHeaders = storyData[0];
  console.log(`Current columns: ${storyHeaders.length}`);
  console.log(`Rows: ${storyData.length - 1}`);

  const missingStoryCols = [];
  for (const col of STORYLINE_LIFECYCLE) {
    if (!storyHeaders.includes(col)) {
      missingStoryCols.push(col);
      console.log(`  MISSING: ${col}`);
    } else {
      console.log(`  Present: ${col}`);
    }
  }

  console.log(`\nMissing lifecycle columns: ${missingStoryCols.length}`);

  // ──────────────────────────────────────────────────────────────────────
  // APPLY FIXES
  // ──────────────────────────────────────────────────────────────────────

  if (dryRun) {
    console.log('\nDRY RUN complete. Run without --dry-run to apply.\n');
    return;
  }

  const totalFixes = missingHookCols.length + missingStoryCols.length + (hookIdIdx >= 0 ? 1 : 0);
  if (totalFixes === 0) {
    console.log('\nNothing to fix!\n');
    return;
  }

  console.log('\n═══ Applying fixes ═══\n');

  // Fix Story_Hook_Deck
  if (hookIdIdx >= 0) {
    // Fix the case: HookID → HookId
    // We need to write just that one cell
    const colLetter = String.fromCharCode(65 + hookIdIdx); // A=0, B=1, etc.
    const range = `Story_Hook_Deck!${colLetter}1`;
    await sheets.updateRange(range, [['HookId']]);
    console.log(`  Fixed: HookID → HookId (col ${colLetter})`);
  }

  if (missingHookCols.length > 0) {
    const startCol = hookHeaders.length;
    // Check if we need to resize
    const neededCols = startCol + missingHookCols.length;
    try {
      await sheets.resizeSheet('Story_Hook_Deck', neededCols);
    } catch (e) {
      // resize may fail if already big enough
    }
    await sheets.appendColumns('Story_Hook_Deck', 1, startCol, missingHookCols);
    console.log(`  Added ${missingHookCols.length} lifecycle columns: ${missingHookCols.join(', ')}`);
  }

  // Fix Storyline_Tracker
  if (missingStoryCols.length > 0) {
    const startCol = storyHeaders.length;
    const neededCols = startCol + missingStoryCols.length;
    try {
      await sheets.resizeSheet('Storyline_Tracker', neededCols);
    } catch (e) {
      // resize may fail if already big enough
    }
    await sheets.appendColumns('Storyline_Tracker', 1, startCol, missingStoryCols);
    console.log(`  Added ${missingStoryCols.length} lifecycle columns: ${missingStoryCols.join(', ')}`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // VERIFY
  // ──────────────────────────────────────────────────────────────────────

  console.log('\n═══ Verification ═══\n');

  const verifyHook = await sheets.getSheetData('Story_Hook_Deck');
  const verifyStory = await sheets.getSheetData('Storyline_Tracker');

  console.log(`Story_Hook_Deck: ${verifyHook[0].length} columns`);
  for (let i = 0; i < verifyHook[0].length; i++) {
    console.log(`  Col ${i}: "${verifyHook[0][i]}"`);
  }

  console.log(`\nStoryline_Tracker: ${verifyStory[0].length} columns`);
  for (let i = 0; i < verifyStory[0].length; i++) {
    console.log(`  Col ${i}: "${verifyStory[0][i]}"`);
  }

  console.log('\nRepair complete!\n');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
