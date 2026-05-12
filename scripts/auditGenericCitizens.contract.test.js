/**
 * auditGenericCitizens.contract.test.js — contract test for the
 * Generic_Citizens vs Simulation_Ledger cross-reference audit. Pairs with
 * `auditGenericCitizens.js`.
 *
 * S217 engine.17 Phase 5.2 — sheet-dep audit coverage.
 *
 * Section A: source-level — env + sheets loaded, header indexOf targets,
 *   emergence-pipeline logic (Active / Emerged status branches), SL
 *   cross-reference index, neighborhood + occupation tallies.
 * Section B: subprocess smoke when sheets creds available; asserts the
 *   audit completes against live Generic_Citizens + Simulation_Ledger.
 *
 * Run: node scripts/auditGenericCitizens.contract.test.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'auditGenericCitizens.js');
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
  assert('source > 3KB', source.length > 3000, `${source.length} bytes`);
}

console.log('\nTest 2: env + lib/sheets loaded');
{
  assert("require lib/env present",
    /require\(['"][^'"]*\/lib\/env['"]\)/.test(source));
  assert('lib/sheets imported',
    /require\(['"]\.\.\/lib\/sheets['"]\)/.test(source));
}

console.log('\nTest 3: reads both Generic_Citizens + Simulation_Ledger');
{
  assert("getSheetData('Generic_Citizens')",
    source.includes("getSheetData('Generic_Citizens')"));
  assert("getSheetData('Simulation_Ledger')",
    source.includes("getSheetData('Simulation_Ledger')"));
}

console.log('\nTest 4: indexOf header targets on Generic_Citizens');
{
  for (const col of ['First', 'Last', 'Age', 'BirthYear', 'Neighborhood',
                     'Occupation', 'EmergenceCount', 'EmergedCycle',
                     'EmergenceContext', 'Status']) {
    assert(`indexOf target '${col}'`, source.includes(`'${col}'`));
  }
}

console.log('\nTest 5: emergence pipeline status branches');
{
  // Active = extras pool; Emerged = promoted to SL.
  assert("'Active' status branch",
    /status\s*===\s*['"]Active['"]/.test(source));
  assert("'Emerged' status branch",
    /status\s*===\s*['"]Emerged['"]/.test(source));
}

console.log('\nTest 6: SL name-key cross-reference index');
{
  // Builds `slNames[first + ' ' + last] = popid` index for lookup.
  assert('SL name index assembled',
    /slNames\[\s*first\s*\+\s*['"]\s+['"]\s*\+\s*last\s*\]/.test(source));
  assert('lowercase + trim for name key',
    /toLowerCase\(\)/.test(source) && /trim\(\)/.test(source));
}

console.log('\nTest 7: gap detection — emerged but not on SL');
{
  assert('emergedMissingSL accumulator',
    /emergedMissingSL/.test(source));
  // Reports gap explicitly in stdout
  assert("gap header label in output",
    /EMERGED BUT NOT ON SIMULATION_LEDGER/.test(source));
}

console.log('\nTest 8: neighborhood + occupation tallies');
{
  assert('neighborhoods tally', /stats\.neighborhoods/.test(source));
  assert('occupations tally', /stats\.occupations/.test(source));
  assert('NEIGHBORHOOD DISTRIBUTION report',
    /NEIGHBORHOOD DISTRIBUTION/.test(source));
  assert('OCCUPATION BREAKDOWN report',
    /OCCUPATION BREAKDOWN/.test(source));
}

console.log('\nTest 9: exit-1 + stack trace on caught error');
{
  assert('process.exit(1) on caught error',
    /main\(\)\.catch.*process\.exit\(1\)/s.test(source));
  assert('err.stack printed on failure',
    /err\.stack/.test(source));
}

console.log('\n═══ Section B — subprocess smoke (requires sheets credentials)');

console.log('\nTest 10: script runs to completion when creds available');
if (HAS_SHEETS_CREDS) {
  const result = spawnSync('node', [SCRIPT_PATH], {
    cwd: ROOT, encoding: 'utf8', timeout: 60000,
  });
  assert('script exits 0 on successful audit', result.status === 0,
    `status=${result.status} stderr=${(result.stderr || '').slice(0, 300)}`);
  const out = result.stdout || '';
  assert('output contains GENERIC_CITIZENS AUDIT header',
    /GENERIC_CITIZENS AUDIT/.test(out));
  assert('output contains STATUS BREAKDOWN section',
    /STATUS BREAKDOWN/.test(out));
  assert('output contains AUDIT COMPLETE footer',
    /AUDIT COMPLETE/.test(out));
} else {
  skip('script exits 0 on successful audit', 'service-account.json absent (CI)');
  skip('output contains GENERIC_CITIZENS AUDIT header', 'service-account.json absent (CI)');
  skip('output contains STATUS BREAKDOWN section', 'service-account.json absent (CI)');
  skip('output contains AUDIT COMPLETE footer', 'service-account.json absent (CI)');
}

console.log('\n' + '═'.repeat(60));
const skipNote = skipped > 0 ? `, ${skipped} skipped` : '';
console.log(`${passed} passed, ${failed} failed${skipNote}`);
process.exit(failed === 0 ? 0 : 1);
