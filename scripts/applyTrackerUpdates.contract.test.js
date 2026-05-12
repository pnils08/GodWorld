/**
 * applyTrackerUpdates.contract.test.js — structural safety contract for
 * the dry-run gate. Verifies the script's source enforces:
 *   1. APPLY flag is parsed from process.argv (--apply opt-in)
 *   2. The only sheet write call (sheets.updateRowFields) is gated behind
 *      an `if (APPLY)` check
 *   3. The dry-run path logs "WOULD WRITE" instead of writing
 *
 * This is a structural test — it reads the script's source rather than
 * executing it. Catches regressions like "someone removed the if (APPLY)
 * guard" or "someone added a second write call outside the guard" without
 * needing service-account credentials in CI.
 *
 * Pairs with scripts/applyTrackerUpdates.js. If you refactor that script,
 * confirm the assertions below still match the new structure.
 *
 * Run: node scripts/applyTrackerUpdates.contract.test.js
 * Exits 0 on pass, 1 on failure.
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const SCRIPT_PATH = path.resolve(__dirname, 'applyTrackerUpdates.js');
const source = fs.readFileSync(SCRIPT_PATH, 'utf8');

console.log('Test 1: source readable + non-trivial size');
{
  assert('script exists', fs.existsSync(SCRIPT_PATH));
  assert('source > 5KB (non-trivial)', source.length > 5000, `${source.length} bytes`);
}

console.log('\nTest 2: APPLY flag parsed from --apply argv');
{
  // Match: const APPLY = process.argv.includes('--apply');  (or var/let)
  const flagPattern = /(?:const|let|var)\s+APPLY\s*=\s*process\.argv\.includes\(['"]--apply['"]\)/;
  assert('APPLY = process.argv.includes("--apply") present', flagPattern.test(source));
}

console.log('\nTest 3: dry-run is the default (APPLY only true with --apply)');
{
  // The flag is presence-based — without --apply, APPLY is false.
  // Verify there's no override / default-true path elsewhere.
  const overrides = source.match(/APPLY\s*=\s*true/g) || [];
  // The only assignment should be the argv check; explicit `APPLY = true`
  // assignments would break the dry-run-default contract.
  assert('no `APPLY = true` overrides in source', overrides.length === 0,
    `found ${overrides.length} occurrence(s)`);
}

console.log('\nTest 4: sheet writes are gated behind if (APPLY)');
{
  // The destructive write surface is sheets.updateRowFields(SHEET_NAME, ...).
  // Find every occurrence and verify each is inside an `if (APPLY)` block.
  const writeCallPattern = /sheets\.updateRowFields\s*\(/g;
  const writeMatches = [...source.matchAll(writeCallPattern)];
  assert('at least 1 sheet write call exists', writeMatches.length >= 1);

  // For each write call, walk backwards to find the nearest `if (APPLY)` or
  // top-of-function. Heuristic: a window of ~600 chars before the call must
  // contain `if (APPLY)`.
  for (const m of writeMatches) {
    const idx = m.index;
    const window = source.substring(Math.max(0, idx - 600), idx);
    const gated = /if\s*\(\s*APPLY\s*\)/.test(window);
    assert(`write call at offset ${idx} is gated behind if (APPLY)`, gated,
      'window did not contain `if (APPLY)`');
  }
}

console.log('\nTest 5: dry-run path logs "WOULD WRITE"');
{
  // The else branch of `if (APPLY)` should log a "WOULD WRITE" line so
  // operators can verify what dry-run intended to do.
  assert('source contains "WOULD WRITE" log marker', source.includes('WOULD WRITE'));
}

console.log('\nTest 6: --apply path logs "WRITTEN to row"');
{
  // Symmetric: the write path logs WRITTEN so operators can confirm actual
  // writes happened (vs. silent failures).
  assert('source contains "WRITTEN to row" log marker', source.includes('WRITTEN to row'));
}

console.log('\nTest 7: WRITEBACK_FIELDS allowlist constrains write surface');
{
  // The script declares the columns it's allowed to write. Verify the
  // allowlist exists and includes the load-bearing fields per the docstring.
  const allowlistPattern = /WRITEBACK_FIELDS\s*=\s*\[/;
  assert('WRITEBACK_FIELDS allowlist declared', allowlistPattern.test(source));
  // Required fields per script docstring (must match Initiative_Tracker columns)
  assert('allowlist includes ImplementationPhase', source.includes("'ImplementationPhase'"));
  assert('allowlist includes MilestoneNotes', source.includes("'MilestoneNotes'"));
  assert('allowlist includes NextScheduledAction', source.includes("'NextScheduledAction'"));
  assert('allowlist includes NextActionCycle', source.includes("'NextActionCycle'"));
}

console.log('\nTest 8: trackerOwner schema constants present (S215 civic.9b)');
{
  // The S215 trackerOwner schema layer should still be wired.
  assert("VALID_OWNERS = ['primary', 'secondary', 'advisory']",
    /VALID_OWNERS\s*=\s*\[\s*['"]primary['"]\s*,\s*['"]secondary['"]\s*,\s*['"]advisory['"]\s*\]/.test(source));
  assert('SECONDARY_FOLD_CAP constant present', /SECONDARY_FOLD_CAP\s*=\s*\d+/.test(source));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
