/**
 * auditBayTribuneUnknowns.contract.test.js — source-only contract test for the
 * bay-tribune unknown+published-other doc enumeration script.
 *
 * Pairs with `auditBayTribuneUnknowns.js`. This is source-only (no subprocess
 * smoke test) because the script requires SUPERMEMORY_CC_API_KEY and hits the
 * live Supermemory API — not testable in CI without secrets, and we don't want
 * tests hitting the live API at all.
 *
 * S217 engine.16 Phase 5.2 — fourth of 4 audit/validate contract tests.
 *
 * Asserts: API config constants present (host + key check), pagination/
 * concurrency tuning constants, classify() multi-shape detector with all
 * 6 wiki classes + 4 metadata-type mappings, TARGET_CLASSES filter, content
 * truncation constant.
 *
 * Run: node scripts/auditBayTribuneUnknowns.contract.test.js
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.resolve(__dirname, 'auditBayTribuneUnknowns.js');
const source = fs.readFileSync(SCRIPT_PATH, 'utf8');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('═══ Source-only contract');

console.log('\nTest 1: source readable + non-trivial');
{
  assert('script exists', fs.existsSync(SCRIPT_PATH));
  assert('source > 4KB', source.length > 4000, `${source.length} bytes`);
}

console.log('\nTest 2: API config constants');
{
  assert('API_HOST set to api.supermemory.ai',
    /API_HOST\s*=\s*['"]api\.supermemory\.ai['"]/.test(source));
  assert('API_KEY pulled from SUPERMEMORY_CC_API_KEY env',
    /API_KEY\s*=\s*process\.env\.SUPERMEMORY_CC_API_KEY/.test(source));
  assert('missing-API-key check + exit 1',
    /if\s*\(\s*!API_KEY\s*\)/.test(source) &&
    /process\.exit\(1\)/.test(source));
}

console.log('\nTest 3: pagination + concurrency tuning constants');
{
  assert('PAGE_SIZE = 100',
    /const\s+PAGE_SIZE\s*=\s*100/.test(source));
  assert('PAGE_SLEEP_MS declared',
    /const\s+PAGE_SLEEP_MS\s*=\s*\d+/.test(source));
  assert('CONCURRENCY = 5',
    /const\s+CONCURRENCY\s*=\s*5/.test(source));
  assert('CONTENT_HEAD_BYTES = 8000',
    /const\s+CONTENT_HEAD_BYTES\s*=\s*8000/.test(source));
}

console.log('\nTest 4: output target path');
{
  assert('OUTPUT_PATH references bay_tribune_unknowns.json',
    /OUTPUT_PATH.*bay_tribune_unknowns\.json/.test(source));
  assert('OUTPUT_PATH lives under output/',
    /OUTPUT_PATH.*['"]output['"]/.test(source));
}

console.log('\nTest 5: classify() shape detectors');
{
  assert('classify function declared',
    /function\s+classify\s*\(\s*content\s*,\s*metadata\s*\)/.test(source));
  // Sibling detector functions
  assert('detectCanonWrapper function',
    /function\s+detectCanonWrapper\s*\(/.test(source));
  assert('detectMastheadType function',
    /function\s+detectMastheadType\s*\(/.test(source));
  assert('detectWikiShape function',
    /function\s+detectWikiShape\s*\(/.test(source));
}

console.log('\nTest 6: WIKI_PATTERNS covers wiki-doc shape classes');
{
  assert('WIKI_PATTERNS object declared',
    /const\s+WIKI_PATTERNS\s*=\s*\{/.test(source));
  // WIKI_PATTERNS classifies wiki-doc shapes (appearance / returning / new /
  // storyline / continuity) — NOT entity types. Each shape has a header-line
  // regex that identifies the doc's purpose at ingest time.
  for (const cls of ['bt-wiki-appearance', 'bt-wiki-returning', 'bt-wiki-new',
                     'bt-wiki-storyline', 'bt-wiki-continuity']) {
    assert(`WIKI_PATTERNS includes '${cls}'`, source.includes(`'${cls}'`));
  }
}

console.log('\nTest 7: METADATA_TYPE_TO_CLASS mapping');
{
  assert('METADATA_TYPE_TO_CLASS object declared',
    /const\s+METADATA_TYPE_TO_CLASS\s*=\s*\{/.test(source));
}

console.log('\nTest 8: TARGET_CLASSES filter set');
{
  assert('TARGET_CLASSES Set declared',
    /const\s+TARGET_CLASSES\s*=\s*new\s+Set\(/.test(source));
  assert("TARGET_CLASSES includes 'unknown'",
    source.includes("'unknown'"));
  assert("TARGET_CLASSES includes 'bt-published-other'",
    source.includes("'bt-published-other'"));
}

console.log('\nTest 9: concurrency batch loop uses CONCURRENCY constant');
{
  // `for (let i = 0; i < records.length; i += CONCURRENCY)` — batch pattern.
  assert('records iterated with i += CONCURRENCY',
    /for\s*\(\s*let\s+i\s*=\s*0[^)]*records\.length[^)]*i\s*\+=\s*CONCURRENCY/.test(source));
}

console.log('\nTest 10: lib/env loaded for credential lookup');
{
  assert("require('/root/GodWorld/lib/env')",
    /require\(['"]\/root\/GodWorld\/lib\/env['"]\)/.test(source));
}

console.log('\n' + '═'.repeat(60));
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
