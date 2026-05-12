/**
 * validateIntakeDerivation.contract.test.js — contract test for the Phase 5
 * intake-side citizen derivation validator. Pairs with
 * `validateIntakeDerivation.js`.
 *
 * S217 engine.17 Phase 5.2 — validator coverage.
 *
 * Section A: source-level — env + lib/citizenDerivation + lib/sheets deps,
 *   5 acceptance gates referenced, fixture array shape, 200-citizen sweep,
 *   ECONOMIC_PARAMETERS embedding parity marker check.
 * Section B: subprocess smoke when sheets creds available — runs the full
 *   validator on the live ledger; asserts exit 0 or 1 (either is a valid
 *   real-state outcome) + presence of the load-bearing report sections.
 *
 * Run: node scripts/validateIntakeDerivation.contract.test.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'validateIntakeDerivation.js');
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
  assert('source > 4KB', source.length > 4000, `${source.length} bytes`);
}

console.log('\nTest 2: env + libs loaded');
{
  assert("require('../lib/env') present",
    /require\(['"]\.\.\/lib\/env['"]\)/.test(source));
  assert('lib/sheets imported',
    /require\(['"]\.\.\/lib\/sheets['"]\)/.test(source));
  assert('lib/citizenDerivation imported',
    /require\(['"]\.\.\/lib\/citizenDerivation['"]\)/.test(source));
}

console.log('\nTest 3: --json flag parsed');
{
  assert("--json flag parsed",
    /process\.argv\.includes\(['"]--json['"]\)/.test(source));
}

console.log('\nTest 4: snapshot built via buildLedgerFreqSnapshot');
{
  assert('buildLedgerFreqSnapshot call present',
    /cd\.buildLedgerFreqSnapshot/.test(source));
  // Snapshot consumed from Simulation_Ledger
  assert("reads 'Simulation_Ledger'",
    /getRawSheetData\(['"]Simulation_Ledger['"]\)/.test(source));
}

console.log('\nTest 5: plan fixture present + 8-field derivation contract');
{
  // Fixture rows from plan §Validation fixture
  for (const popid of ['POP-99001', 'POP-99002', 'POP-99003']) {
    assert(`fixture includes ${popid}`, source.includes(popid));
  }
  // 8 required derived fields
  for (const field of ['RoleType', 'EducationLevel', 'Gender', 'YearsInCareer',
                       'DebtLevel', 'NetWorth', 'MaritalStatus', 'NumChildren']) {
    assert(`required field '${field}'`, source.includes(`'${field}'`));
  }
}

console.log('\nTest 6: all 5 acceptance gates referenced');
{
  for (const gate of ['[Gate 1]', '[Gate 2]', '[Gate 3]', '[Gate 4]', '[Gate 5]']) {
    assert(`'${gate}' label present`, source.includes(gate));
  }
}

console.log('\nTest 7: Gate 2 — zero "Citizen" literal RoleType sweep');
{
  // 200 synthetic citizens
  assert("200-citizen sweep loop", /i\s*<\s*200/.test(source));
  // Citizen-literal detection
  assert("'Citizen' literal RoleType check",
    /RoleType\s*===\s*['"]Citizen['"]/.test(source));
}

console.log('\nTest 8: Gate 3 — determinism (same seed → same values)');
{
  // a/b paired call + JSON.stringify equality
  assert('determinism check via JSON.stringify equality',
    /JSON\.stringify\(a\)\s*!==\s*JSON\.stringify\(b\)/.test(source));
}

console.log('\nTest 9: Gate 4 — distribution non-uniformity');
{
  // Expects ≥4 distinct MaritalStatus + NumChildren + ≥15 distinct RoleTypes
  assert("MaritalStatus distinct ≥ 4 expectation",
    /MaritalStatus only.*\$\{Object\.keys\(ms\)\.length\}/.test(source) ||
    /\.keys\(ms\)\.length\s*<\s*4/.test(source));
  assert("RoleType distinct ≥ 15 expectation",
    /distinctRoles\s*<\s*15/.test(source));
}

console.log('\nTest 10: Gate 5 — Apps Script ECONOMIC_PARAMETERS parity');
{
  // Markers in utilities/citizenDerivation.js
  assert("ECONOMIC_PARAMETERS_START marker",
    source.includes('ECONOMIC_PARAMETERS_START'));
  assert("ECONOMIC_PARAMETERS_END marker",
    source.includes('ECONOMIC_PARAMETERS_END'));
  // Counts "role": entries inside the marker block
  assert("entry count via 'role': regex",
    /["']"role":["']/.test(source) || /"role":/.test(source));
  // Sync script reference for fix path
  assert("syncEconomicParameters.js fix-path reference",
    source.includes('syncEconomicParameters.js'));
}

console.log('\nTest 11: verdict + exit-code contract');
{
  // PASS — all 5 gates green; FAIL — N gate(s)
  assert("'PASS' verdict literal", /PASS\s*—\s*all\s*5\s*gates\s*green/.test(source));
  assert("'FAIL' verdict literal", /FAIL\s*—\s*/.test(source));
  // Exit 0 on success, 1 on failures, 2 on caught error
  assert("process.exit(failures.length === 0 ? 0 : 1)",
    /process\.exit\(failures\.length\s*===\s*0\s*\?\s*0\s*:\s*1\)/.test(source));
  assert("process.exit(2) on caught error",
    /process\.exit\(2\)/.test(source));
}

console.log('\n═══ Section B — subprocess smoke (requires sheets credentials)');

console.log('\nTest 12: script runs to completion when creds available');
if (HAS_SHEETS_CREDS) {
  const result = spawnSync('node', [SCRIPT_PATH], {
    cwd: ROOT, encoding: 'utf8', timeout: 60000,
  });
  // Exit 0 (clean) or 1 (gate failure surfaced) are both valid real-state
  // outcomes. Exit 2 = fatal/caught error, that's the regression.
  assert('script exits 0 or 1 (not 2)', result.status === 0 || result.status === 1,
    `status=${result.status} stderr=${(result.stderr || '').slice(0, 300)}`);
  const out = result.stdout || '';
  assert("output contains 'Phase 5' header",
    /Phase\s*5\s*—\s*Intake derivation validation/.test(out));
  assert("output contains 'Fixture' section",
    /Fixture/.test(out));
  assert("output contains 'Distribution sweep' section",
    /Distribution sweep/.test(out));
  assert("output contains 'Verdict' section",
    /Verdict/.test(out));
  // Either PASS or FAIL must appear
  assert("verdict prints PASS or FAIL",
    /PASS\s*—\s*all\s*5\s*gates|FAIL\s*—\s*\d+\s*gate/.test(out));
} else {
  skip('script exits 0 or 1 (not 2)', 'service-account.json absent (CI)');
  skip("output contains 'Phase 5' header", 'service-account.json absent (CI)');
  skip("output contains 'Fixture' section", 'service-account.json absent (CI)');
  skip("output contains 'Distribution sweep' section", 'service-account.json absent (CI)');
  skip("output contains 'Verdict' section", 'service-account.json absent (CI)');
  skip("verdict prints PASS or FAIL", 'service-account.json absent (CI)');
}

console.log('\n' + '═'.repeat(60));
const skipNote = skipped > 0 ? `, ${skipped} skipped` : '';
console.log(`${passed} passed, ${failed} failed${skipNote}`);
process.exit(failed === 0 ? 0 : 1);
