/**
 * cronDeskFilings.test.js — pipeline.45 Phase 2 (yesterdaysFilings) +
 * Phase 1 sidecar enrichment (buildIntakeSidecar) from cron-desk-run.js.
 *
 * yesterdaysFilings coverage uses synthetic zz-test-desk artifacts written
 * into the real staged/ dir and removed in finally — no production desk
 * matches the test desk, and cleanup runs on every exit path.
 *
 * Run: node scripts/cronDeskFilings.test.js
 * Exits 0 on pass, 1 on failure.
 */

const fs = require('fs');
const path = require('path');
const { yesterdaysFilings, buildIntakeSidecar } = require('./cron-desk-run');

const ROOT = path.resolve(__dirname, '..');
const STAGED = path.join(ROOT, 'output', 'cron-compare', 'staged');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const DESK = 'zz-test-desk';
const CYCLE = '999';
const yday = new Date(Date.now() - 86400000).toISOString();
const today = new Date().toISOString();

const ARTICLE = [
  '# Test Headline About Fruitvale',
  '',
  'Body prose. '.repeat(80),   // > excerpt cap
  '',
  '## INTAKE',
  'NAMES: Carlos Presti | quoted-source',
  'HOOD: Fruitvale',
  'CLAIM: A test claim | world_summary_c999',
  '<!-- SELF-SCORE: question-answered=yes -->'
].join('\n');

const fixtures = [];
function stage(name, sidecar, articleText) {
  const mdPath = path.join(STAGED, name + '.staged.md');
  const jsonPath = path.join(STAGED, name + '.staged.json');
  fs.writeFileSync(mdPath, articleText);
  fs.writeFileSync(jsonPath, JSON.stringify({ ...sidecar, article: path.relative(ROOT, mdPath) }, null, 2));
  fixtures.push(mdPath, jsonPath);
}

try {
  fs.mkdirSync(STAGED, { recursive: true });
  stage('zztest_c999_yesterday', { status: 'staged', desk: DESK, cycle: CYCLE, byline: 'Test Byline', stagedAt: yday }, ARTICLE);
  stage('zztest_c999_today', { status: 'staged', desk: DESK, cycle: CYCLE, byline: 'Test Byline', stagedAt: today }, ARTICLE);
  stage('zztest_c999_otherdesk', { status: 'staged', desk: 'zz-other-desk', cycle: CYCLE, byline: 'X', stagedAt: yday }, ARTICLE);

  console.log('Test 1: yesterdaysFilings picks yesterday + same desk only');
  {
    const r = yesterdaysFilings(DESK, CYCLE);
    assert('exactly 1 filing (today + other-desk excluded)', r.length === 1, 'got ' + r.length);
    const f = r[0] || {};
    assert('headline extracted', f.headline === 'Test Headline About Fruitvale');
    assert('byline carried', f.byline === 'Test Byline');
    assert('INTAKE block included, self-score stripped',
      !!f.intakeBlock && f.intakeBlock.includes('NAMES: Carlos Presti') && !f.intakeBlock.includes('SELF-SCORE'));
    assert('excerpt capped', !!f.excerpt && f.excerpt.length <= 610 && f.excerpt.endsWith('[…]'));
    assert('excerpt excludes INTAKE', !f.excerpt.includes('## INTAKE'));
  }

  console.log('Test 2: yesterdaysFilings — wrong cycle excluded, missing desk empty');
  {
    assert('cycle filter', yesterdaysFilings(DESK, '998').length === 0);
    assert('unknown desk empty', yesterdaysFilings('never-a-desk', CYCLE).length === 0);
  }

  console.log('Test 3: buildIntakeSidecar enrichment');
  {
    const side = buildIntakeSidecar(ARTICLE, [{ name: 'Carlos Presti', pop: 'POP-00048', quote: 'hi' }]);
    assert('names enriched from packet quotes', side && side.names[0].popid === 'POP-00048' && side.names[0].role === 'quoted-source');
    assert('hoods flat strings', JSON.stringify(side.hoods) === JSON.stringify(['Fruitvale']));
    assert('claims carried', side.claims.length === 1 && side.claims[0].sourceRef === 'world_summary_c999');
    const ledger = buildIntakeSidecar(ARTICLE, []);   // no packet hit → ledger snapshot resolution
    assert('ledger fallback resolution', ledger && ledger.names[0].popid === 'POP-00048');
    assert('no INTAKE → null', buildIntakeSidecar('# No block here\nprose', []) === null);
  }
} finally {
  for (const f of fixtures) { try { fs.unlinkSync(f); } catch (_) { /* already gone */ } }
}

const leftovers = fs.existsSync(STAGED) ? fs.readdirSync(STAGED).filter(f => f.startsWith('zztest_')) : [];
assert('fixture cleanup complete', leftovers.length === 0, leftovers.join(', '));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
