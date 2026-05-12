/**
 * auditPhase5Headers.contract.test.js — contract test for the Phase 5/6
 * citizen-engine header indexOf() audit. Pairs with `auditPhase5Headers.js`.
 *
 * S217 engine.17 Phase 5.2 — sheet-dep audit coverage.
 *
 * Section A: source-level — SHEET_COLUMNS schema present for all expected
 *   reader sheets, alternates table covers the known SL drift cases.
 * Section B: subprocess smoke when sheets creds available (local dev) — script
 *   exits 0 against live Simulation_Ledger + neighbor sheets. Skipped in CI.
 *
 * Run: node scripts/auditPhase5Headers.contract.test.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'auditPhase5Headers.js');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(SCRIPT_PATH, 'utf8');

const HAS_SHEETS_CREDS = fs.existsSync('/root/.config/godworld/credentials/service-account.json');

let passed = 0;
let failed = 0;
let skipped = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
function skip(label, reason) {
  console.log(`  skip ${label} — ${reason}`);
  skipped++;
}

console.log('═══ Section A — structural');

console.log('\nTest 1: source readable + non-trivial');
{
  assert('script exists', fs.existsSync(SCRIPT_PATH));
  assert('source > 5KB', source.length > 5000, `${source.length} bytes`);
}

console.log('\nTest 2: requires lib/sheets');
{
  assert('lib/sheets imported',
    /require\(['"]\.\.\/lib\/sheets['"]\)/.test(source));
}

console.log('\nTest 3: SHEET_COLUMNS schema covers expected reader sheets');
{
  assert('SHEET_COLUMNS object declared',
    /const\s+SHEET_COLUMNS\s*=\s*\{/.test(source));
  for (const sheet of [
    'Simulation_Ledger', 'Generic_Citizens', 'Household_Ledger',
    'Civic_Office_Ledger', 'Initiative_Tracker', 'Relationship_Bonds',
    'LifeHistory_Log', 'Citizen_Media_Usage', 'Storyline_Tracker',
    'Story_Hook_Deck', 'World_Population'
  ]) {
    assert(`SHEET_COLUMNS includes '${sheet}'`, source.includes(`'${sheet}'`));
  }
}

console.log('\nTest 4: Simulation_Ledger required columns present (load-bearing landmines)');
{
  // These are the columns that every Phase 5/6 citizen engine indexOf-looks-up.
  for (const col of ['POPID', 'First', 'Last', 'Tier', 'RoleType', 'Status',
                     'BirthYear', 'Neighborhood', 'HouseholdId', 'MaritalStatus',
                     'NumChildren', 'ParentIds', 'ChildrenIds', 'Income']) {
    assert(`SL required includes '${col}'`, source.includes(`'${col}'`));
  }
}

console.log('\nTest 5: alternates table covers known SL header drift');
{
  // Middle/Middle space variant + OrginCity/OriginCity typo variant are the
  // load-bearing alternates — the audit catches them, the engine handles both.
  assert("alternates 'Middle' + 'Middle ' variant",
    /'Middle\s*':\s*\[\s*'Middle\s'/.test(source) || source.includes("['Middle ', 'Middle']"));
  assert("alternates 'OriginCity' + 'OrginCity' variant",
    /'OrginCity'/.test(source) && /'OriginCity'/.test(source));
  // LifeHistory_Log Cycle/EngineCycle alternates (the drift case fix)
  assert("LifeHistory_Log Cycle/EngineCycle alternates",
    source.includes("'Cycle', 'EngineCycle'"));
  assert("LifeHistory_Log EventTag/EventType alternates",
    source.includes("'EventTag', 'EventType'"));
}

console.log('\nTest 6: optional columns flagged separately (handled gracefully)');
{
  // Initiative_Tracker SwingVoter2 + LifeHistory_Log Source + World_Population
  // season — code checks if header exists before using.
  assert("'SwingVoter2' optional flag present", source.includes("'SwingVoter2'"));
  assert("LifeHistory_Log Source optional flag",
    /optional:\s*\['Source'\]/.test(source));
  assert("World_Population season optional flag",
    /optional:\s*\['season'\]/.test(source));
}

console.log('\nTest 7: exit-1 on error wired');
{
  assert('process.exit(1) on caught error',
    /main\(\)\.catch.*process\.exit\(1\)/s.test(source));
}

console.log('\n═══ Section B — subprocess smoke (requires sheets credentials)');

console.log('\nTest 8: script runs to completion when creds available');
if (HAS_SHEETS_CREDS) {
  const result = spawnSync('node', [SCRIPT_PATH], {
    cwd: ROOT, encoding: 'utf8', timeout: 60000,
  });
  // OK status (0) or MISSING_COLUMNS status (still exits 0 — the script reports
  // but doesn't fail on missing columns). exit 1 only on connection failure.
  assert('script exits 0 on successful audit', result.status === 0,
    `status=${result.status} stderr=${(result.stderr || '').slice(0, 300)}`);
  assert('output contains "RESULTS" header',
    /RESULTS/.test(result.stdout || ''));
  assert('output contains "SUMMARY:" line',
    /SUMMARY:/.test(result.stdout || ''));
  assert('output references Simulation_Ledger',
    /Simulation_Ledger/.test(result.stdout || ''));
} else {
  skip('script exits 0 on successful audit', 'service-account.json absent (CI)');
  skip('output contains "RESULTS" header', 'service-account.json absent (CI)');
  skip('output contains "SUMMARY:" line', 'service-account.json absent (CI)');
  skip('output references Simulation_Ledger', 'service-account.json absent (CI)');
}

console.log('\n' + '═'.repeat(60));
const skipNote = skipped > 0 ? `, ${skipped} skipped` : '';
console.log(`${passed} passed, ${failed} failed${skipNote}`);
process.exit(failed === 0 ? 0 : 1);
