/**
 * auditSheetHeaders.contract.test.js — contract test for the v3-writer
 * sheet-header alignment audit. Pairs with `auditSheetHeaders.js`.
 *
 * S217 engine.17 Phase 5.2 — sheet-dep audit coverage.
 *
 * Section A: source-level — SCHEMAS table covers v3 writer-paired sheets with
 *   version pin + writerCols arrays.
 * Section B: subprocess smoke when sheets creds available.
 *
 * Run: node scripts/auditSheetHeaders.contract.test.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'auditSheetHeaders.js');
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

console.log('\nTest 2: env + lib/sheets loaded');
{
  assert("require('../lib/env') present",
    /require\(['"]\.\.\/lib\/env['"]\)/.test(source));
  assert('lib/sheets imported',
    /require\(['"]\.\.\/lib\/sheets['"]\)/.test(source));
}

console.log('\nTest 3: SCHEMAS covers v3 writer-paired sheets');
{
  assert('SCHEMAS object declared',
    /const\s+SCHEMAS\s*=\s*\{/.test(source));
  for (const sheet of [
    'Event_Arc_Ledger', 'WorldEvents_V3_Ledger', 'Story_Seed_Deck',
    'Story_Hook_Deck', 'Texture_Trigger_Log', 'Neighborhood_Map',
    'Domain_Tracker', 'Chicago_Feed', 'Cycle_Weather', 'Media_Ledger',
    'Cycle_Packet', 'Handoff_Output'
  ]) {
    assert(`SCHEMAS includes '${sheet}'`, source.includes(`'${sheet}'`));
  }
}

console.log('\nTest 4: version + file pin per schema');
{
  // Each schema entry carries a `version` + `file` pin so writer drift surfaces.
  assert("'version'-keyed entries", /version:\s*['"]v\d/.test(source));
  assert("'file'-keyed entries reference writer js", /file:\s*['"][\w.]+\.js/.test(source));
}

console.log('\nTest 5: WorldEvents_V3_Ledger totalPositions accounts for 29 cols (22 dead)');
{
  // The v3.5 writer outputs 29 positions but only 7 are active — the rest are
  // intentional empty strings (deprecated cols H-AC). audit handles via
  // totalPositions override.
  assert('totalPositions: 29 present',
    /totalPositions:\s*29/.test(source));
}

console.log('\nTest 6: Story_Seed_Deck schema baseline (pre-Engine-A cols)');
{
  // This audit pins the baseline 8 cols. Engine A added PriorityScore /
  // ConsequenceFloor / etc. but those are validated by validatePriorityEngine.
  for (const col of ['Timestamp', 'Cycle', 'SeedID', 'SeedType', 'Domain',
                     'Neighborhood', 'Priority', 'SeedText']) {
    assert(`Story_Seed_Deck writerCols includes '${col}'`, source.includes(`'${col}'`));
  }
}

console.log('\nTest 7: deprecated-position skip logic + extras tally');
{
  // `if (exp === '') continue;  // skip deprecated positions` is the load-
  // bearing line that handles WorldEvents_V3_Ledger.
  assert('deprecated empty-position skip',
    /if\s*\(\s*exp\s*===\s*['"]['"]\s*\)\s*continue/.test(source));
  // Extras (sheet has more cols than writer) get reported separately.
  assert('extras reporting wired',
    /extras\s*=\s*actual\.length\s*-\s*checkLen/.test(source));
}

console.log('\nTest 8: exit-1 on error wired');
{
  assert('process.exit(1) on caught error',
    /main\(\)\.catch.*process\.exit\(1\)/s.test(source));
}

console.log('\n═══ Section B — subprocess smoke (requires sheets credentials)');

console.log('\nTest 9: script runs to completion when creds available');
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
  assert('output references v3 ledger sheets',
    /Event_Arc_Ledger|WorldEvents_V3_Ledger/.test(result.stdout || ''));
} else {
  skip('script exits 0 on successful audit', 'service-account.json absent (CI)');
  skip('output contains "RESULTS" header', 'service-account.json absent (CI)');
  skip('output contains "SUMMARY:" line', 'service-account.json absent (CI)');
  skip('output references v3 ledger sheets', 'service-account.json absent (CI)');
}

console.log('\n' + '═'.repeat(60));
const skipNote = skipped > 0 ? `, ${skipped} skipped` : '';
console.log(`${passed} passed, ${failed} failed${skipNote}`);
process.exit(failed === 0 ? 0 : 1);
