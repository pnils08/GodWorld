/**
 * validateIntakeDerivation.contract.test.js — contract test for the Phase 5
 * intake-side citizen derivation validator. Pairs with
 * `validateIntakeDerivation.js`.
 *
 * S217 engine.17 Phase 5.2 — validator coverage.
 *
 * Section A: source-level — env + lib/citizenDerivation + lib/sheets deps,
 *   5 acceptance gates referenced, fixture array shape, 200-citizen sweep,
 *   Gate 5 no-embedded-catalog check + the engine.199 sheet-read round trip.
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

const LIVE_SHEETS = process.env.GODWORLD_TEST_LIVE === '1';
const HAS_SHEETS_CREDS = LIVE_SHEETS &&
  fs.existsSync('/root/.config/godworld/credentials/service-account.json');
const SHEETS_SKIP_REASON = LIVE_SHEETS
  ? 'service-account.json absent'
  : 'live Sheets integration disabled (run npm test -- --live)';

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

console.log('\nTest 10: Gate 5 + engine.199 — the job catalog has one runtime source');
{
  const vm = require('vm');
  const sync = require('./syncEconomicParameters.js');
  const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'economic_parameters.json'), 'utf8'));
  const cdSrc = fs.readFileSync(path.join(ROOT, 'utilities', 'citizenDerivation.js'), 'utf8');
  // The Gate 5 scan fires on this tree: no Apps Script file embeds the catalog.
  assert('Gate 5 scans utilities/ + phase*/ for an embedded catalog',
    /ECONOMIC_PARAMETERS_START/.test(source) && /phase\\d/.test(source));
  const { scanEmbeddedCatalogs } = require('./validateIntakeDerivation.js');
  assert('Gate 5 scan (offline): no utilities/ or phase*/ file embeds the catalog', scanEmbeddedCatalogs().length === 0,
    JSON.stringify(scanEmbeddedCatalogs()));
  {
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate5-'));
    fs.mkdirSync(path.join(tmp, 'utilities'));
    const unquoted = Array.from({ length: 12 }, (_, i) => `  { role: 'R${i}', category: 'C', medianIncome: 1 },`).join('\n');
    fs.writeFileSync(path.join(tmp, 'utilities', 'x.js'), 'var CAT = [\n' + unquoted + '\n];\n');
    fs.writeFileSync(path.join(tmp, 'utilities', 'y.js'), "var a = { role: 'Plumber' };\n");
    const hits = scanEmbeddedCatalogs(tmp);
    assert('Gate 5 catches an unquoted-key catalog and ignores a lone role field', hits.length === 1 && hits[0] === 'utilities/x.js', JSON.stringify(hits));
  }
  // Round trip: JSON → the rows the sync script pushes → economicParameters_ → the same catalog.
  const load = (values, seed) => {
    const logs = [];
    let opens = 0;
    const sb = { Logger: { log: m => logs.push(String(m)) },
      openSimSpreadsheet_: () => { opens++; return { getSheetByName: n => (n === sync.SHEET_NAME && values) ? { getDataRange: () => ({ getValues: () => values }) } : null }; } };
    if (seed !== undefined) sb.ECONOMIC_PARAMETERS = seed;
    vm.createContext(sb);
    vm.runInContext(cdSrc, sb);
    return { sb, logs, opens: () => opens };
  };
  const tab = [sync.SHEET_COLUMNS.map(c => c[0])].concat(json.map(sync.toSheetRow));
  const L = load(tab);
  const got = L.sb.economicParameters_();
  L.sb.economicParameters_(); L.sb.lookupIncome_('Plumber'); L.sb.canonicalRolesSet_();
  const pick = p => JSON.stringify([p.role, p.category, p.incomeRange, p.medianIncome, p.effectiveTaxRate, p.economicOutputCategory, p.housingBurdenPct, p.consumerProfile, p.notes || '']);
  assert('sheet read reproduces every JSON role, field for field',
    got.length === json.length && got.every((p, i) => pick(p) === pick(json[i])),
    `got ${got.length} of ${json.length}`);
  assert('one sheet open per execution, logged once', L.opens() === 1 && L.logs.filter(m => /Economic_Parameters: loaded 306 roles/.test(m)).length === 1,
    `opens=${L.opens()} logs=${JSON.stringify(L.logs)}`);
  assert('lookupIncome_ reads the sheet catalog', L.sb.lookupIncome_('Longshoreman') === 138000);
  const throws = (values, seed) => { try { load(values, seed).sb.economicParameters_(); return null; } catch (e) { return e.message; } };
  assert('missing tab throws', /tab missing/.test(throws(null) || ''));
  assert('header without MedianIncome throws', /needs Role/.test(throws([['Role', 'Category', 'IncomeMin', 'IncomeMax']]) || ''));
  assert('header-only tab throws', /no roles/.test(throws([tab[0]]) || ''));
  const bad = tab.map(r => r.slice()); bad[3][4] = '56,000';
  assert('a text-formatted MedianIncome throws, naming row and column', /row 4 MedianIncome is "56,000"/.test(throws(bad) || ''));
  const blankOpt = tab.map(r => r.slice()); blankOpt[2][5] = '';
  assert('a blank optional EffectiveTaxRate reads null, not 0', load(blankOpt).sb.economicParameters_()[1].effectiveTaxRate === null);
  assert('a seeded empty catalog is not "loaded" — it reads the tab', load(tab, []).sb.economicParameters_().length === json.length);
  assert('a seeded catalog is kept (harness path) — no tab behind it, so a read would throw', throws(null, json) === null);
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
  skip('script exits 0 or 1 (not 2)', SHEETS_SKIP_REASON);
  skip("output contains 'Phase 5' header", SHEETS_SKIP_REASON);
  skip("output contains 'Fixture' section", SHEETS_SKIP_REASON);
  skip("output contains 'Distribution sweep' section", SHEETS_SKIP_REASON);
  skip("output contains 'Verdict' section", SHEETS_SKIP_REASON);
  skip("verdict prints PASS or FAIL", SHEETS_SKIP_REASON);
}

console.log('\n' + '═'.repeat(60));
const skipNote = skipped > 0 ? `, ${skipped} skipped` : '';
console.log(`${passed} passed, ${failed} failed${skipNote}`);
process.exit(failed === 0 ? 0 : 1);
