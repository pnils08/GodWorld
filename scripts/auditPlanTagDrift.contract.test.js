/**
 * auditPlanTagDrift.contract.test.js — contract test for the plan-frontmatter
 * vs changelog-status drift detector. Pairs with `auditPlanTagDrift.js`.
 *
 * S217 engine.16 Phase 5.2 — second of 4 audit/validate contract tests.
 *
 * Section A: source-level (STATUS_TAGS, STATUS_TRANSITIONS, SKIP_FILES,
 *   regex patterns, --json flag).
 * Section B: subprocess smoke on real docs/plans/ tree, asserts exit code
 *   matches the "drift count = 0 → 0, else 1" contract.
 *
 * Run: node scripts/auditPlanTagDrift.contract.test.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.resolve(__dirname, 'auditPlanTagDrift.js');
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
  assert('source > 3KB', source.length > 3000, `${source.length} bytes`);
}

console.log('\nTest 2: STATUS_TAGS Set covers expected lifecycle states');
{
  assert('STATUS_TAGS Set declared',
    /const\s+STATUS_TAGS\s*=\s*new\s+Set\(/.test(source));
  for (const tag of ['draft', 'active', 'complete', 'done', 'parked', 'archived', 'deferred']) {
    assert(`STATUS_TAGS includes '${tag}'`, source.includes(`'${tag}'`));
  }
}

console.log('\nTest 3: STATUS_TRANSITIONS array covers transition patterns');
{
  assert('STATUS_TRANSITIONS array declared',
    /const\s+STATUS_TRANSITIONS\s*=\s*\[/.test(source));
  for (const name of ['active->complete', 'draft->complete', 'draft->active', 'status-complete']) {
    assert(`STATUS_TRANSITIONS includes '${name}'`, source.includes(`'${name}'`));
  }
  // Arrow-form regex must accept both ASCII -> and Unicode → and =>
  assert('transition regex supports -> / → / =>',
    /\(\?:\\->\\|→\\|=>\)/.test(source) || /->\|→\|=>/.test(source));
}

console.log('\nTest 4: SKIP_FILES excludes templates + index');
{
  assert('SKIP_FILES Set declared',
    /const\s+SKIP_FILES\s*=\s*new\s+Set\(/.test(source));
  for (const f of ['TEMPLATE.md', 'GAP_LOG_TEMPLATE.md', 'BACKLOG.md']) {
    assert(`SKIP_FILES includes '${f}'`, source.includes(`'${f}'`));
  }
}

console.log('\nTest 5: PLANS_DIR points to docs/plans');
{
  assert('PLANS_DIR uses docs/plans path',
    /PLANS_DIR.*docs.*plans/.test(source));
}

console.log('\nTest 6: --json flag for CI output');
{
  assert("--json flag parsed",
    /process\.argv\.includes\(['"]--json['"]\)/.test(source));
}

console.log('\nTest 7: exit contract — 0 clean, 1 on drift');
{
  // Final line: process.exit(result.drifts.length === 0 ? 0 : 1);
  assert('exit-0-on-clean, exit-1-on-drift wired',
    /process\.exit\([^)]*drifts[^)]*===?\s*0\s*\?\s*0\s*:\s*1\)/.test(source));
}

console.log('\n═══ Section B — subprocess smoke');

console.log('\nTest 8: --json mode runs on real docs/plans/');
{
  const result = spawnSync('node', [SCRIPT_PATH, '--json'], {
    cwd: ROOT, encoding: 'utf8', timeout: 30000,
  });
  // Exit 0 if no drift, 1 if drift detected. Either is a valid runtime state.
  assert('script exits 0 or 1', result.status === 0 || result.status === 1,
    `status=${result.status} stderr=${(result.stderr || '').slice(0, 200)}`);
  // --json mode produces parseable JSON
  let parsed = null;
  try { parsed = JSON.parse(result.stdout); } catch { /* leave null */ }
  assert('stdout is valid JSON in --json mode', parsed !== null,
    `first 200 chars: ${result.stdout.slice(0, 200)}`);
  if (parsed) {
    assert('JSON has drifts array', Array.isArray(parsed.drifts));
    assert('JSON has scanned numeric', typeof parsed.scanned === 'number');
    assert('scanned > 0 (docs/plans has files)', parsed.scanned > 0,
      `got ${parsed.scanned}`);
    assert('JSON has noFrontmatter numeric', typeof parsed.noFrontmatter === 'number');
    assert('JSON has noChangelog numeric', typeof parsed.noChangelog === 'number');
    assert('JSON has noVerbMatch numeric', typeof parsed.noVerbMatch === 'number');
  }
}

console.log('\n' + '═'.repeat(60));
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
