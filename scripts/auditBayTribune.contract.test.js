/**
 * auditBayTribune.contract.test.js — contract test for the bay-tribune
 * container enumeration + content-shape classifier audit. Pairs with
 * `auditBayTribune.js`.
 *
 * S217 engine.17 Phase 5.2 — Supermemory-dep audit coverage. Source-only
 * pattern: script hits Supermemory live API + exits 1 without API key, so
 * subprocess testing requires either CI secrets or a stubbed network. Catches
 * source-level regressions in classifier shape / pagination constants /
 * credential check without runtime cost. (Same precedent as
 * auditBayTribuneUnknowns.contract.test.js from S217.)
 *
 * Run: node scripts/auditBayTribune.contract.test.js
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.resolve(__dirname, 'auditBayTribune.js');
const source = fs.readFileSync(SCRIPT_PATH, 'utf8');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('═══ Section A — structural (source-only; runtime hits live API)');

console.log('\nTest 1: source readable + non-trivial');
{
  assert('script exists', fs.existsSync(SCRIPT_PATH));
  assert('source > 10KB', source.length > 10000, `${source.length} bytes`);
}

console.log('\nTest 2: env + credential check');
{
  assert("require lib/env present",
    /require\(['"][^'"]*\/lib\/env['"]\)/.test(source));
  assert('SUPERMEMORY_CC_API_KEY read',
    /process\.env\.SUPERMEMORY_CC_API_KEY/.test(source));
  assert('exits 1 if API key missing',
    /if\s*\(!API_KEY\)\s*\{[\s\S]*process\.exit\(1\)/.test(source));
}

console.log('\nTest 3: API constants pin the Supermemory v3 endpoint');
{
  assert("API_HOST = 'api.supermemory.ai'",
    /API_HOST\s*=\s*['"]api\.supermemory\.ai['"]/.test(source));
  assert('PAGE_SIZE = 100', /PAGE_SIZE\s*=\s*100/.test(source));
  assert('PAGE_SLEEP_MS pace control', /PAGE_SLEEP_MS\s*=\s*\d+/.test(source));
  assert('SAMPLES_PER_CLASS sampling cap',
    /SAMPLES_PER_CLASS\s*=\s*\d+/.test(source));
}

console.log('\nTest 4: OUTPUT_PATH lives under output/');
{
  assert("output/bay_tribune_inventory.json target",
    /OUTPUT_PATH\s*=\s*path\.join\([^)]*['"]output['"][^)]*['"]bay_tribune_inventory\.json['"]/.test(source));
}

console.log('\nTest 5: CLI flags parsed');
{
  for (const flag of ['--verbose', '--max-pages', '--max-fetch', '--concurrency']) {
    assert(`flag '${flag}' parsed`,
      source.includes(`'${flag}'`) || source.includes(`"${flag}"`));
  }
}

console.log('\nTest 6: detectCanonWrapper signature ([CANON:type:date])');
{
  assert('detectCanonWrapper function declared',
    /function\s+detectCanonWrapper\s*\(/.test(source));
  // Regex shape: /^\[CANON:([a-z0-9-]+):[^\]]+\]/m
  assert('CANON wrapper regex present',
    source.includes('\\[CANON:([a-z0-9-]+):'));
}

console.log('\nTest 7: detectMastheadType covers all publication types');
{
  assert('detectMastheadType function declared',
    /function\s+detectMastheadType\s*\(/.test(source));
  for (const cls of [
    "'bt-edition'",
    "'bt-dispatch'",
    "'bt-interview-article'",
    "'bt-interview-transcript'",
    "'bt-supplemental'",
    "'bt-published-other'"
  ]) {
    assert(`masthead class ${cls}`, source.includes(cls));
  }
  // THE CYCLE PULSE masthead pattern is load-bearing
  assert('CYCLE PULSE — EDITION masthead pattern',
    /THE CYCLE PULSE/.test(source) && /EDITION/.test(source));
}

console.log('\nTest 8: WIKI_PATTERNS covers all 5 wiki doc shapes');
{
  assert('WIKI_PATTERNS map declared',
    /const\s+WIKI_PATTERNS\s*=\s*\{/.test(source));
  for (const cls of [
    "'bt-wiki-appearance'",
    "'bt-wiki-returning'",
    "'bt-wiki-new'",
    "'bt-wiki-storyline'",
    "'bt-wiki-continuity'"
  ]) {
    assert(`wiki shape ${cls}`, source.includes(cls));
  }
  // [TYPE: x | Cn] prefix is the post-S189 convention
  assert('[TYPE: x | Cn] prefix regex present',
    source.includes('\\[TYPE:\\s*\\w+\\s*\\|\\s*C\\d+\\]'));
}

console.log('\nTest 9: METADATA_TYPE_TO_CLASS fallback covers chunked editions');
{
  assert('METADATA_TYPE_TO_CLASS map declared',
    /const\s+METADATA_TYPE_TO_CLASS\s*=\s*\{/.test(source));
  for (const cls of [
    "'bt-edition-chunk'",
    "'bt-supplemental-chunk'",
    "'bt-dispatch-chunk'",
    "'bt-interview-chunk'"
  ]) {
    assert(`metadata fallback class ${cls}`, source.includes(cls));
  }
}

console.log('\nTest 10: classify() orchestrates canon + wiki + masthead + metadata');
{
  assert('classify function declared',
    /function\s+classify\s*\(content,\s*metadata\)/.test(source));
  // Falls through to 'unknown' if no signature matches
  assert("'unknown' bucket fallthrough", /['"]unknown['"]/.test(source));
  // multiMatch flag for anomaly detection
  assert('multiMatch flag set when matches > 1',
    /multiMatch:\s*matches\.length\s*>\s*1/.test(source));
}

console.log('\nTest 11: two-pass enumeration shape (list + GET-classify)');
{
  assert('pass1EnumerateBayTribuneIds declared',
    /async\s+function\s+pass1EnumerateBayTribuneIds/.test(source));
  assert('pass2FetchAndClassify declared',
    /async\s+function\s+pass2FetchAndClassify/.test(source));
  // Pass 1 uses POST /v3/documents/list with pagination
  assert("/v3/documents/list POST",
    /POST['"]?,\s*['"]\/v3\/documents\/list['"]/.test(source));
  // Pass 2 uses GET /v3/documents/{id}
  assert("/v3/documents/<id> GET",
    /GET['"]?,\s*['"]\/v3\/documents\/['"]\s*\+\s*rec\.id/.test(source));
}

console.log('\nTest 12: client-side bay-tribune tag filter');
{
  // Server-side filter is ignored per docstring; client filters.
  assert("client-side 'bay-tribune' tag filter",
    /tags\.includes\(['"]bay-tribune['"]\)/.test(source));
}

console.log('\nTest 13: inventory output schema');
{
  // Output JSON exposes load-bearing summary fields for the Phase 1.2 decision pass.
  for (const key of ['auditedAt', 'plan', 'method', 'scope', 'classes',
                     'secondaryTagsObserved', 'anomalies']) {
    assert(`inventory exposes '${key}'`, source.includes(`${key}:`));
  }
  // dual_tagged + customId_present counts surfaced
  assert("'dualTaggedCount' in scope", /dualTaggedCount/.test(source));
  assert("'customIdPresent' in scope", /customIdPresent/.test(source));
}

console.log('\nTest 14: exit-1 on fatal error');
{
  assert('main().catch process.exit(1)',
    /main\(\)\.catch[\s\S]*process\.exit\(1\)/.test(source));
}

console.log('\n' + '═'.repeat(60));
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
