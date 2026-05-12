/**
 * auditFunctionCollisions.contract.test.js — contract test for the Apps Script
 * flat-namespace duplicate detector. Pairs with `auditFunctionCollisions.js`.
 *
 * S217 engine.16 Phase 5.2 — first of 4 audit/validate script contract tests.
 *
 * Section A: source-level structural (regex + CLASP_DIRS + JSDoc skip + flags).
 * Section B: subprocess smoke (runs on real codebase in dry-run, asserts
 *   exit code + output structure + that the walker actually found functions).
 *
 * Run: node scripts/auditFunctionCollisions.contract.test.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'auditFunctionCollisions.js');
const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(SCRIPT_PATH, 'utf8');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('═══ Section A — structural');

console.log('\nTest 1: source readable + non-trivial');
{
  assert('script exists', fs.existsSync(SCRIPT_PATH));
  assert('source > 2KB', source.length > 2000, `${source.length} bytes`);
}

console.log('\nTest 2: CLASP_DIRS array covers 12 phase dirs');
{
  assert('CLASP_DIRS array declared', /const\s+CLASP_DIRS\s*=\s*\[/.test(source));
  // The phases that must be in scope — if any are missing the audit silently
  // skips that dir and collisions in it go undetected.
  const required = [
    'phase01-config', 'phase02-world-state', 'phase03-population',
    'phase04-events', 'phase05-citizens', 'phase06-analysis',
    'phase07-evening-media', 'phase08-v3-chicago', 'phase09-rollups',
    'phase10-persistence', 'phase11-misc', 'utilities',
  ];
  for (const dir of required) {
    assert(`CLASP_DIRS includes '${dir}'`, source.includes(`'${dir}'`));
  }
}

console.log('\nTest 3: FN_RE regex matches function declarations');
{
  assert('FN_RE regex declared',
    /const\s+FN_RE\s*=\s*\/\^function/.test(source));
  // Sanity-test the regex itself against known shapes
  const FN_RE = /^function\s+([A-Za-z_\$][A-Za-z0-9_\$]*)\s*\(/;
  assert('matches "function foo("', FN_RE.test('function foo()'));
  assert('matches "function _bar_(arg)"', FN_RE.test('function _bar_(arg)'));
  assert('matches "function $x()"', FN_RE.test('function $x()'));
  assert('rejects "  function foo("', !FN_RE.test('  function foo('));
  assert('rejects "// function foo("', !FN_RE.test('// function foo('));
}

console.log('\nTest 4: JSDoc skip logic present');
{
  // The `if (/^\s*\*/.test(line)) return;` line that skips JSDoc continuation
  // (S199 c596718 false-positive class — engineCycleAudit Math.random sweep).
  assert('JSDoc skip regex present',
    /\/\^\\s\*\\\*\//.test(source) || /\^\\s\*\\\*\//.test(source));
}

console.log('\nTest 5: dry-run + --write modes');
{
  assert('--write flag parsed', /process\.argv\.includes\(['"]--write['"]\)/.test(source));
  assert('dry-run is default (writeMode = ...includes)',
    /const\s+writeMode\s*=\s*process\.argv\.includes/.test(source));
  assert('persisted target path declared',
    /audit_function_collisions\.md/.test(source));
}

console.log('\n═══ Section B — subprocess smoke');

console.log('\nTest 6: dry-run on real codebase');
{
  const result = spawnSync('node', [SCRIPT_PATH], {
    cwd: ROOT, encoding: 'utf8', timeout: 30000,
  });
  // Exit code from main() — script doesn't explicitly process.exit. Node default
  // is 0 on clean run; treat any non-zero as a crash.
  assert('script exits 0 (no crash)', result.status === 0,
    `status=${result.status} stderr=${(result.stderr || '').slice(0, 200)}`);
  assert('stdout contains markdown header',
    /^# Function-Name Collision Audit/m.test(result.stdout));
  assert('stdout reports file count',
    /(\d+) files/.test(result.stdout));
  // The walker should find SOME functions on the real codebase. If 0, the
  // walker is broken (or CLASP_DIRS drifted).
  const fileMatch = result.stdout.match(/(\d+) files/);
  const fileCount = fileMatch ? parseInt(fileMatch[1], 10) : 0;
  assert('walker found > 100 files (real codebase has 150+)',
    fileCount > 100, `found ${fileCount}`);
  const nameMatch = result.stdout.match(/(\d+) unique top-level function names/);
  const nameCount = nameMatch ? parseInt(nameMatch[1], 10) : 0;
  assert('regex extracted > 500 function names',
    nameCount > 500, `found ${nameCount}`);
  assert('stderr summary line present',
    /\[dry-run\]/.test(result.stderr));
}

console.log('\n' + '═'.repeat(60));
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
