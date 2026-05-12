/**
 * auditSimulationLedger.contract.test.js — contract test for the
 * Simulation_Ledger health-snapshot audit. Pairs with
 * `auditSimulationLedger.js` (boot quick-state script).
 *
 * S217 engine.17 Phase 5.2 — sheet-dep audit coverage.
 *
 * Section A: source-level — argv flags (--json + --since), CANON12 set,
 *   summary keys, 2041 anchor, brief vs json output paths.
 * Section B: subprocess smoke with --json when sheets creds available;
 *   parses stdout JSON, asserts headcount range + Status enum present +
 *   POPID range valid.
 *
 * Run: node scripts/auditSimulationLedger.contract.test.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'auditSimulationLedger.js');
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

console.log('\nTest 2: env loaded + googleapis client wired');
{
  assert("require('../lib/env') present",
    /require\(['"]\.\.\/lib\/env['"]\)/.test(source));
  assert("googleapis required", /require\(['"]googleapis['"]\)/.test(source));
  assert('GOOGLE_APPLICATION_CREDENTIALS read',
    /process\.env\.GOOGLE_APPLICATION_CREDENTIALS/.test(source));
}

console.log('\nTest 3: CLI flags parsed (--json + --since=)');
{
  assert("--json flag parsed",
    /argv\.includes\(['"]--json['"]\)/.test(source));
  assert("--since= flag parsed",
    /argv\.find\(a\s*=>\s*a\.startsWith\(['"]--since=['"]\)\)/.test(source));
  // Default cutoff is POP-00789 per docstring (first post-S94 ID)
  assert("default sinceN cutoff 789", /789/.test(source));
}

console.log('\nTest 4: CANON12 set covers all 12 canonical Oakland neighborhoods');
{
  assert('CANON12 Set declared',
    /const\s+CANON12\s*=\s*new\s+Set\(/.test(source));
  for (const nbhd of [
    'Downtown', 'West Oakland', 'East Oakland', 'Fruitvale',
    'Temescal', 'Rockridge', 'Lake Merritt', 'Jack London',
    'Chinatown', 'Montclair', 'Piedmont Avenue', 'Adams Point'
  ]) {
    assert(`CANON12 includes '${nbhd}'`, source.includes(`'${nbhd}'`));
  }
}

console.log('\nTest 5: 2041 anchor (canon age = 2041 − BirthYear)');
{
  // The age computation references 2041 explicitly (per project_age-2041-anchor-convention).
  assert("2041 anchor in age formula", /2041\s*-\s*by/.test(source));
}

console.log('\nTest 6: summary object exposes load-bearing keys');
{
  // Accept both `key:` and shorthand `key,` / `key\n` (ES6 property shorthand).
  for (const key of [
    'snapshotDate', 'sheet', 'columns', 'totalRows', 'extantCitizens',
    'popidRange', 'popidGapCount', 'tierClockMatrix', 'statusEnum',
    'roleTypeCitizenCount', 'birthYearOOB', 'nonCanonNeighborhoodCounts',
    'narrative', 'completeness', 'postSinceCount', 'postSinceRows'
  ]) {
    const re = new RegExp(`\\b${key}\\b\\s*[,:\\n}]`);
    assert(`summary includes '${key}'`, re.test(source));
  }
}

console.log('\nTest 7: parsePopId regex extracts numeric tail from POP-NNNNN');
{
  // Regex: /POP-0*(\d+)/ — strips leading zeros, returns numeric.
  assert('parsePopId regex',
    /\/POP-0\*\(\\d\+\)\//.test(source));
}

console.log('\nTest 8: --json mode short-circuits brief output');
{
  // wantJson path: console.log(JSON.stringify(summary, null, 2)); return;
  assert("wantJson JSON.stringify + return",
    /if\s*\(wantJson\)\s*\{[\s\S]*JSON\.stringify\(summary[\s\S]*return/.test(source));
}

console.log('\nTest 9: drift sentinels — RoleType="Citizen" + BirthYear OOB');
{
  assert("RoleType 'Citizen' sentinel check",
    /role\s*===\s*['"]Citizen['"]/.test(source));
  // 2041 - by < 0 || 2041 - by > 110 — OOB bound
  assert("BirthYear OOB bounds (0-110)",
    /2041\s*-\s*by\s*>\s*110/.test(source));
}

console.log('\nTest 10: exit-1 on caught error');
{
  assert('process.exit(1) on caught error',
    /main\(\)\.catch.*process\.exit\(1\)/s.test(source));
}

console.log('\n═══ Section B — subprocess smoke (requires sheets credentials)');

console.log('\nTest 11: --json mode produces parseable summary');
if (HAS_SHEETS_CREDS) {
  const result = spawnSync('node', [SCRIPT_PATH, '--json'], {
    cwd: ROOT, encoding: 'utf8', timeout: 60000,
  });
  assert('script exits 0 on --json run', result.status === 0,
    `status=${result.status} stderr=${(result.stderr || '').slice(0, 300)}`);
  // dotenv prints a banner + the config object to stdout on load — locate the
  // pretty-printed JSON payload by its `{\n  "snapshotDate"` opening signature.
  const stdout = result.stdout || '';
  const m = stdout.match(/\{\s*\n\s*"snapshotDate"/);
  let parsed = null;
  if (m) {
    try { parsed = JSON.parse(stdout.slice(m.index)); } catch { /* leave null */ }
  }
  assert('stdout is valid JSON (after stripping dotenv banner)', parsed !== null,
    `match=${!!m} first 200 chars: ${stdout.slice(0, 200)}`);
  if (parsed) {
    assert("sheet === 'Simulation_Ledger'", parsed.sheet === 'Simulation_Ledger');
    assert('columns is numeric', typeof parsed.columns === 'number');
    assert('extantCitizens > 0',
      parsed.extantCitizens > 0, `got ${parsed.extantCitizens}`);
    assert('extantCitizens in expected range (500-2000)',
      parsed.extantCitizens > 500 && parsed.extantCitizens < 2000,
      `got ${parsed.extantCitizens}`);
    assert('statusEnum is object',
      parsed.statusEnum && typeof parsed.statusEnum === 'object');
    assert('popidRange has min + max',
      parsed.popidRange && typeof parsed.popidRange.min === 'number' &&
      typeof parsed.popidRange.max === 'number');
    assert('completeness is array',
      Array.isArray(parsed.completeness));
  }
} else {
  skip('script exits 0 on --json run', 'service-account.json absent (CI)');
  skip('stdout is valid JSON', 'service-account.json absent (CI)');
  skip("sheet === 'Simulation_Ledger'", 'service-account.json absent (CI)');
  skip('columns is numeric', 'service-account.json absent (CI)');
  skip('extantCitizens > 0', 'service-account.json absent (CI)');
  skip('extantCitizens in expected range (500-2000)', 'service-account.json absent (CI)');
  skip('statusEnum is object', 'service-account.json absent (CI)');
  skip('popidRange has min + max', 'service-account.json absent (CI)');
  skip('completeness is array', 'service-account.json absent (CI)');
}

console.log('\n' + '═'.repeat(60));
const skipNote = skipped > 0 ? `, ${skipped} skipped` : '';
console.log(`${passed} passed, ${failed} failed${skipNote}`);
process.exit(failed === 0 ? 0 : 1);
