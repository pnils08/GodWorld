/**
 * auditWorldData.contract.test.js — contract test for the world-data container
 * enumeration + content-shape classifier audit. Pairs with `auditWorldData.js`.
 *
 * S217 engine.17 Phase 5.2 — Supermemory-dep audit coverage. Source-only
 * pattern (same as auditBayTribune): script hits Supermemory live API + exits
 * 1 without API key, so subprocess testing requires CI secrets. Catches
 * regressions in classifier shape / pagination constants / credential check.
 *
 * Run: node scripts/auditWorldData.contract.test.js
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.resolve(__dirname, 'auditWorldData.js');
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
  assert('source > 9KB', source.length > 9000, `${source.length} bytes`);
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
}

console.log('\nTest 4: OUTPUT_PATH lives under output/');
{
  assert("output/world_data_inventory.json target",
    /OUTPUT_PATH\s*=\s*path\.join\([^)]*['"]output['"][^)]*['"]world_data_inventory\.json['"]/.test(source));
}

console.log('\nTest 5: CLI flags parsed');
{
  for (const flag of ['--verbose', '--max-pages', '--max-fetch', '--concurrency']) {
    assert(`flag '${flag}' parsed`,
      source.includes(`'${flag}'`) || source.includes(`"${flag}"`));
  }
}

console.log('\nTest 6: PATTERNS regex map covers the 4 wd-* id-prefix card shapes');
{
  assert('PATTERNS object declared',
    /const\s+PATTERNS\s*=\s*\{/.test(source));
  for (const cls of [
    "'citizen-card'",
    "'business-card'",
    "'faith-card'",
    "'initiative-card'"
  ]) {
    assert(`PATTERNS class ${cls}`, source.includes(cls));
  }
  // The 4 id-prefix regexes — POP/BIZ/FAITH/INIT
  assert("POP-NNNN regex", source.includes('\\(POP-\\d{4,}\\)'));
  assert("BIZ-NNN regex", source.includes('\\(BIZ-\\d{3,}\\)'));
  assert("FAITH-NN regex", source.includes('\\(FAITH-\\d{2,}\\)'));
  assert("INIT-NN regex", source.includes('\\(INIT-\\d{2,}\\)'));
}

console.log('\nTest 7: shape detectors — neighborhood + cultural + player-truesource + registry');
{
  assert('looksLikeNeighborhood declared',
    /function\s+looksLikeNeighborhood/.test(source));
  // District: D\d signature
  assert('District: D\\d neighborhood signature',
    source.includes('District:\\s*D\\d'));

  assert('looksLikeCultural declared',
    /function\s+looksLikeCultural/.test(source));
  // Domain: Music|Visual|... | Fame tier | Active since signatures
  assert('cultural Domain enum',
    /Music\|Visual\|Literary\|Theater\|Film\|Dance\|Culinary\|Performance/.test(source));
  assert('Fame tier or Active since signal',
    /Fame tier\|Active since/.test(source));

  assert('looksLikePlayerTrueSource declared',
    /function\s+looksLikePlayerTrueSource/.test(source));
  // metadata.source match against ingestPlayerTrueSource
  assert('metadata.source ingestPlayerTrueSource match',
    /ingestPlayerTrueSource/.test(source));
  // TRUE SOURCE content marker
  assert("TRUE SOURCE content marker",
    source.includes('TRUE\\s*SOURCE'));

  assert('looksLikeRegistryOneLiner declared',
    /function\s+looksLikeRegistryOneLiner/.test(source));
  // Short single-line content with no newline
  assert('one-liner length < 200 + no newline',
    /length\s*<\s*200/.test(source) && /indexOf\(['"]\\n['"]\)/.test(source));
}

console.log('\nTest 8: classify() orchestrates pattern + shape detectors');
{
  assert('classify function declared',
    /function\s+classify\s*\(content,\s*metadata\)/.test(source));
  // Registry-one-liner is a fallback when no other shape matches
  assert("'registry-one-liner' fallback class",
    source.includes("'registry-one-liner'"));
  assert("'unknown' bucket fallthrough", /['"]unknown['"]/.test(source));
  assert('multiMatch flag set when matches > 1',
    /multiMatch:\s*matches\.length\s*>\s*1/.test(source));
}

console.log('\nTest 9: two-pass enumeration shape (list + GET-classify)');
{
  assert('pass1EnumerateWorldDataIds declared',
    /async\s+function\s+pass1EnumerateWorldDataIds/.test(source));
  assert('pass2FetchAndClassify declared',
    /async\s+function\s+pass2FetchAndClassify/.test(source));
  assert("/v3/documents/list POST",
    /POST['"]?,\s*['"]\/v3\/documents\/list['"]/.test(source));
  assert("/v3/documents/<id> GET",
    /GET['"]?,\s*['"]\/v3\/documents\/['"]\s*\+\s*rec\.id/.test(source));
}

console.log('\nTest 10: client-side world-data tag filter');
{
  assert("client-side 'world-data' tag filter",
    /tags\.includes\(['"]world-data['"]\)/.test(source));
}

console.log('\nTest 11: inventory output schema');
{
  for (const key of ['auditedAt', 'plan', 'method', 'scope', 'classes',
                     'secondaryTagsObserved', 'anomalies']) {
    assert(`inventory exposes '${key}'`, source.includes(`${key}:`));
  }
  // Sole-world-data-tag count surfaces wd-* migration progress.
  assert("'worldDataNoSecondaryTag' in scope",
    /worldDataNoSecondaryTag/.test(source));
}

console.log('\nTest 12: exit-1 on fatal error');
{
  assert('main().catch process.exit(1)',
    /main\(\)\.catch[\s\S]*process\.exit\(1\)/.test(source));
}

console.log('\n' + '═'.repeat(60));
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
