/**
 * ingestEdition.test.js — pipeline.45 INTAKE-aware ingest + engine.91 T1
 * customId idempotency scheme + extractCycle fail-loud (no default-cycle
 * guess).
 *
 * Run: node scripts/ingestEdition.test.js
 * Exits 0 on pass, 1 on failure.
 */

const { extractCycle, intakeMeta, deriveCustomId } = require('./ingestEdition');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: extractCycle');
{
  assert('_c88 suffix', extractCycle('', 'supplemental_education_c88.txt') === 88);
  assert('c100_ prefix', extractCycle('', 'c100_martin_richards_trade.txt') === 100);
  assert('edition_88', extractCycle('', 'cycle_pulse_edition_88.txt') === 88);
  assert('content fallback', extractCycle('The Cycle 92 Pulse', 'nocycle.txt') === 92);
  assert('no match → null, never a guessed default', extractCycle('no cycle here', 'plain.txt') === null);
}

console.log('Test 2: deriveCustomId');
{
  assert('scheme', deriveCustomId('dispatch', 102, 'c102_oaks_credibility.md', 1) === 'dispatch-c102-c102_oaks_credibility-1'.replace(/_/g, '-'));
  assert('sanitizes', deriveCustomId('edition', 88, 'Cycle Pulse #88 (final).txt', 2) === 'edition-c88-cycle-pulse-88-final-2');
  assert('chunk-distinct', deriveCustomId('edition', 88, 'x.txt', 1) !== deriveCustomId('edition', 88, 'x.txt', 2));
  assert('deterministic', deriveCustomId('edition', 88, 'x.txt', 1) === deriveCustomId('edition', 88, 'x.txt', 1));
}

console.log('Test 3: intakeMeta');
{
  const withBlock = [
    '# Article', '', 'Prose.', '',
    '## INTAKE',
    'NAMES: Carlos Presti | quoted-source',
    'NAMES: Totally Fake Person | subject',
    'HOOD: Fruitvale',
    'HOOD: Uptown',
    'STORYLINE: fruitvale-transit-hub | advanced',
    'CLAIM: A claim | world_summary_c102'
  ].join('\n');
  const r = intakeMeta(withBlock);
  assert('parsed.found', r.parsed.found === true);
  assert('popids resolved from ledger (fake name dropped)', r.meta.popids === 'POP-00048');
  assert('hoods flattened', r.meta.hoods === 'Fruitvale,Uptown');
  assert('storylines flattened', r.meta.storylines === 'fruitvale-transit-hub');
  assert('claim count', r.meta.intakeClaims === 1);

  const without = intakeMeta('# Article\n\nNo block.');
  assert('absent → empty meta', without.parsed.found === false && Object.keys(without.meta).length === 0);

  const explicit = intakeMeta('## INTAKE\nNAMES: Anyone AtAll | POP-00777 | subject');
  assert('explicit id wins without resolution', explicit.meta.popids === 'POP-00777');
}

console.log('Test 4: engine.114 — a partial ingest exits non-zero');
{
  // Every chunk fails (bogus key → HTTP 401, or no route → request error);
  // either way the counter must reach the exit code. Before engine.114 this
  // printed "[DONE] Success: 0, Errors: N" and exited 0. The env file is
  // pointed at a fixture so the real key never loads (lib/env override:true).
  const fs = require('fs'), os = require('os'), path = require('path');
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest114-'));
  const envFile = path.join(dir, 'test.env');
  const fixture = path.join(dir, 'cycle_pulse_c1.txt');
  fs.writeFileSync(envFile, 'SUPERMEMORY_CC_API_KEY=engine114-bogus-key\n');
  fs.writeFileSync(fixture, 'THE CYCLE PULSE — Y2C1\n\nA one-paragraph fixture that must never land in canon.\n');
  const r = spawnSync('node', [path.join(__dirname, 'ingestEdition.js'), fixture, '--cycle', '1'],
    { env: Object.assign({}, process.env, { GODWORLD_ENV_FILE: envFile, SUPERMEMORY_CC_API_KEY: 'engine114-bogus-key' }), encoding: 'utf8', timeout: 60000 });
  const out = String(r.stdout || '') + String(r.stderr || '');
  assert('reached the ingest loop', /\[DONE\] Success: 0, Errors: [1-9]/.test(out), out.slice(-300));
  assert('exit code is 1 on partial/total failure', r.status === 1, 'status=' + r.status);
  assert('names the rerun', /rerun/.test(out));
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
