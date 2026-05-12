/**
 * auditRemainingHeaders.contract.test.js — contract test for the
 * non-Phase-10 / non-Phase-5 sheet-header audit. Pairs with
 * `auditRemainingHeaders.js`.
 *
 * S217 engine.17 Phase 5.2 — sheet-dep audit coverage.
 *
 * Section A: source-level — SCHEMAS table covers the expected writer-paired
 *   sheets, writerCols arrays sourced from actual writer code.
 * Section B: subprocess smoke when sheets creds available.
 *
 * Run: node scripts/auditRemainingHeaders.contract.test.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'auditRemainingHeaders.js');
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

console.log('\nTest 2: env + lib/sheets loaded');
{
  assert("require('../lib/env') present",
    /require\(['"]\.\.\/lib\/env['"]\)/.test(source));
  assert('lib/sheets imported',
    /require\(['"]\.\.\/lib\/sheets['"]\)/.test(source));
}

console.log('\nTest 3: SCHEMAS covers expected writer-paired sheets');
{
  assert('SCHEMAS object declared',
    /const\s+SCHEMAS\s*=\s*\{/.test(source));
  for (const sheet of [
    'Riley_Digest', 'Engine_Errors', 'Chicago_Citizens', 'Election_Log',
    'Health_Cause_Queue', 'Relationship_Bond_Ledger', 'Crime_Metrics',
    'Transit_Metrics'
  ]) {
    assert(`SCHEMAS includes '${sheet}'`, source.includes(`'${sheet}'`));
  }
}

console.log('\nTest 4: Engine_Errors schema is the 5-col baseline');
{
  // Phase 3 expanded Engine_Errors to 10 cols (S216 engine.15 — Class/Source/
  // Severity/Resolved/Hash). This audit script still pins the 5-col baseline
  // schema; the expanded cols are documented elsewhere. Test asserts the
  // baseline 5 are present.
  for (const col of ['Timestamp', 'Cycle', 'Phase', 'Error', 'Stack']) {
    assert(`Engine_Errors writerCols includes '${col}'`, source.includes(`'${col}'`));
  }
}

console.log('\nTest 5: Riley_Digest covers cycle-summary columns');
{
  // Sample of load-bearing Riley_Digest writer cols — full set is 28 fields.
  for (const col of ['IntakeProcessed', 'CitizensAged', 'EventsGenerated',
                     'CycleWeight', 'CitySentiment']) {
    assert(`Riley_Digest writerCols includes '${col}'`, source.includes(`'${col}'`));
  }
}

console.log('\nTest 6: Election_Log + Health_Cause_Queue load-bearing cols');
{
  // Election_Log post-S141 schema landmines
  for (const col of ['OfficeId', 'Incumbent', 'Challenger', 'Winner', 'MarginType']) {
    assert(`Election_Log writerCols includes '${col}'`, source.includes(`'${col}'`));
  }
  // Health_Cause_Queue intake schema
  for (const col of ['StatusStartCycle', 'CyclesSick', 'AssignedCause', 'Processed']) {
    assert(`Health_Cause_Queue writerCols includes '${col}'`, source.includes(`'${col}'`));
  }
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
  assert('script exits 0 on successful audit', result.status === 0,
    `status=${result.status} stderr=${(result.stderr || '').slice(0, 300)}`);
  assert('output contains "RESULTS" header',
    /RESULTS/.test(result.stdout || ''));
  assert('output contains "SUMMARY:" line',
    /SUMMARY:/.test(result.stdout || ''));
} else {
  skip('script exits 0 on successful audit', 'service-account.json absent (CI)');
  skip('output contains "RESULTS" header', 'service-account.json absent (CI)');
  skip('output contains "SUMMARY:" line', 'service-account.json absent (CI)');
}

console.log('\n' + '═'.repeat(60));
const skipNote = skipped > 0 ? `, ${skipped} skipped` : '';
console.log(`${passed} passed, ${failed} failed${skipNote}`);
process.exit(failed === 0 ? 0 : 1);
