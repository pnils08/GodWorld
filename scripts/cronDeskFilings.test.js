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
const { yesterdaysFilings, buildIntakeSidecar, injectPrintedCitizens, injectWeeklyPilotCredit } = require('./cron-desk-run');

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

// Synthetic, non-canon snapshot in memory only; exercise the real checker/resolver.
const cncPath = require.resolve('./canon-name-check');
const originalCnc = require.cache[cncPath];
const originalRead = fs.readFileSync;
const snapshot = path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl');
const archive = path.join(ROOT, 'output', 'citizen_archive_snapshot.jsonl');
const synthetic = [
  ['Testa Alpha', 'SYNTHETIC-A', 'Active'], ['Testb Beta', 'SYNTHETIC-B', 'Active'],
  ['Testc Author', 'SYNTHETIC-C', 'Active'], ['Testd Shared', 'SYNTHETIC-D', 'Active'],
  ['Testd Shared', 'SYNTHETIC-E', 'Active'], ['Teste Retired', 'SYNTHETIC-F', 'Retired'],
  ['Testf Missing', 'SYNTHETIC-G', null], ['Testg Absent', 'SYNTHETIC-H', 'Active'],
  ['Testh Window', 'SYNTHETIC-I', 'Active'], ['Testi Case', 'SYNTHETIC-J', 'Active']
].map(([Name, POPID, Status]) => ({ Name, POPID, Status }));
try {
  fs.readFileSync = function(file, ...args) {
    if (String(file) === snapshot) return synthetic.map(r => JSON.stringify(r)).join('\n');
    if (String(file) === archive) return JSON.stringify({ Name: 'Testj Archived', POPID: 'SYNTHETIC-K', Status: 'Deceased' });
    return originalRead.call(this, file, ...args);
  };
  delete require.cache[cncPath];
  console.log('Test 4: printed citizen floor (synthetic snapshot)');
  const body = 'Testa Alpha spoke. Testb Beta listened. Testc Author filed.\n## INTAKE\n';
  const side = injectPrintedCitizens(buildIntakeSidecar(body, []), body, { name: 'Sgt. Testc Author' });
  assert('empty NAMES gains exactly two mentioned citizens with ids',
    side.names.length === 2 && side.names.every(n => n.role === 'mentioned' && n.floor === true) &&
    side.names.map(n => n.popid).join(',') === 'SYNTHETIC-A,SYNTHETIC-B');
  assert('title-stripped byline excluded', !side.names.some(n => n.name === 'Testc Author'));
  const existing = { name: 'testa alpha', role: 'quoted-source', popid: 'SYNTHETIC-KEEP' };
  const kept = { names: [existing] };
  injectPrintedCitizens(kept, body, 'Sgt. Testc Author');
  assert('case-insensitive existing role and id untouched', kept.names.length === 2 &&
    kept.names[0] === existing && existing.role === 'quoted-source' && existing.popid === 'SYNTHETIC-KEEP' && !existing.floor);
  assert('no INTAKE remains null', injectPrintedCitizens(buildIntakeSidecar('Testa Alpha spoke.', []), body, null) === null);
  const malformed = {};
  assert('missing names array unchanged', injectPrintedCitizens(malformed, body, null) === malformed);
  injectWeeklyPilotCredit(side, body, [{ name: 'Testa Alpha', POPID: 'SYNTHETIC-A' }]);
  assert('floor then pilot credit becomes subject', side.names[0].role === 'subject' && side.names[0].floor === true);
  const ambiguous = injectPrintedCitizens({ names: [] }, 'Testd Shared spoke.', null).names[0];
  assert('ambiguous name retains null id and marker', ambiguous && ambiguous.popid === null && ambiguous.ambiguous === true);
  const filtered = injectPrintedCitizens({ names: [] },
    'Teste Retired spoke. Testf Missing spoke. Testj Archived spoke.\n' +
    '<!-- Testa Alpha -->\n```\nTestb Beta\n```\n## INTAKE\nNAMES: Testg Absent | mentioned', null);
  assert('non-Active, archived, comments, code and INTAKE-only names excluded', filtered.names.length === 0);
  const cnc = require('./canon-name-check');
  assert('checker really verifies non-Active and archive names', cnc.checkText('Teste Retired spoke. Testj Archived spoke.').verified.length === 2);
  // A line break inside the two-word window verifies, but is not the whole printed name.
  assert('checker window can normalize non-contiguous whitespace', cnc.checkText('Testh  Window Extra spoke.').verified.includes('Testh Window'));
  assert('whole-name includes recheck rejects normalized window', injectPrintedCitizens({ names: [] }, 'Testh  Window Extra spoke.', null).names.length === 0);
  assert('contiguous name inside three-word candidate survives', injectPrintedCitizens({ names: [] }, 'Testh Window Extra spoke.', null).names.length === 1);
  assert('exact casing recheck rejects case-only checker match', injectPrintedCitizens({ names: [] }, 'Testi CASE spoke.', null).names.length === 0);
  injectPrintedCitizens(kept, body, 'Sgt. Testc Author');
  assert('repeat injection adds no duplicate', kept.names.length === 2);
} finally {
  fs.readFileSync = originalRead;
  if (originalCnc) require.cache[cncPath] = originalCnc;
  else delete require.cache[cncPath];
}

const leftovers = fs.existsSync(STAGED) ? fs.readdirSync(STAGED).filter(f => f.startsWith('zztest_')) : [];
assert('fixture cleanup complete', leftovers.length === 0, leftovers.join(', '));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
