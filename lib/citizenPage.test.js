/**
 * citizenPage.test.js — offline coverage for the per-citizen Supermemory page.
 *
 * Run: node lib/citizenPage.test.js   (exits 0 pass / 1 fail)
 *
 * NO live API / NO sheet I/O — deterministic CI. Live isolation + round-trip is the throwaway
 * smoke (write two tags, confirm cross-tag search doesn't leak, delete) run manually; the live
 * AW pointer write is exercised at bot-wiring against a sentinel, never a real citizen in CI.
 * Here: the two gotcha-prone pure pieces — page-tag derivation and AW column math.
 */
const cp = require('./citizenPage');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}
function throws(fn) { try { fn(); return false; } catch (e) { return true; } }

console.log('Test 1: pageTagFor derivation');
{
  assert('POP-00042 -> cp-POP-00042', cp.pageTagFor('POP-00042') === 'cp-POP-00042');
  assert('lowercase normalizes', cp.pageTagFor('pop-00042') === 'cp-POP-00042');
  assert('whitespace trimmed', cp.pageTagFor('  POP-00007  ') === 'cp-POP-00007');
  assert('parent tag constant', cp.PARENT_TAG === 'citizen-pages');
}

console.log('\nTest 2: pageTagFor rejects bad input (no silent write to wrong/parent tag)');
{
  assert('empty throws', throws(() => cp.pageTagFor('')));
  assert('null throws', throws(() => cp.pageTagFor(null)));
  assert('non-POPID throws', throws(() => cp.pageTagFor('citizen-pages')));
  assert('malformed POPID throws', throws(() => cp.pageTagFor('POP-XYZ')));
  assert('BIZID throws', throws(() => cp.pageTagFor('BIZ-00035')));
}

console.log('\nTest 3: AW column math lock (col-index gotcha guard)');
{
  assert('col 0 -> A', cp.colLetter_(0) === 'A');
  assert('col 25 -> Z', cp.colLetter_(25) === 'Z');
  assert('col 26 -> AA', cp.colLetter_(26) === 'AA');
  assert('col 47 -> AV (DialState)', cp.colLetter_(47) === 'AV');
  assert('col 48 -> AW (SMPageId, the write target)', cp.colLetter_(48) === 'AW');
}

console.log('\nTest 4: appendReflection_ — no null metadata, readable Supermemory errors (C110 Nia Rook POP-01076)');
async function appendCases() {
  const realFetch = global.fetch;
  let sent;
  const reply = (status, json) => async (url, init) => { sent = JSON.parse(init.body); return { ok: status < 300, status, json: async () => json }; };
  try {
    // a rate-limited classifier hands back event/affect null; Supermemory rejects null metadata with a 400
    global.fetch = reply(200, { id: 'doc1' });
    const ok = await cp.appendReflection_('POP-01076', 'filed: a line', { cycle: 110, daypart: 'PRESS', extra: { affect: null, event: null, ask: 'x' } });
    assert('null affect/event never reach metadata', !('affect' in sent.metadata) && !('event' in sent.metadata) && sent.metadata.ask === 'x');
    assert('no null value anywhere in metadata', Object.values(sent.metadata).every((v) => v != null));
    assert('write still lands', ok.id === 'doc1' && !ok.error);
    await cp.appendReflection_('POP-01076', 'a line', {});
    assert('absent cycle/daypart are omitted, not null', !('cycle' in sent.metadata) && !('daypart' in sent.metadata));
    global.fetch = reply(400, { error: [{ code: 'invalid_union', message: 'expected string, received null' }, { code: 'invalid_union', message: 'expected number, received null' }] });
    const bad = await cp.appendReflection_('POP-01076', 'x', { cycle: 110, daypart: 'PRESS' });
    assert('array error names the field, not [object Object]', bad.error.startsWith('[err] [{') && bad.error.includes('received null') && !bad.error.includes('[object Object]'));
    global.fetch = reply(503, {});
    const bare = await cp.appendReflection_('POP-01076', 'x', { cycle: 110 });
    assert('no error body falls back to the status', bare.error === '[err] 503');
  } finally { global.fetch = realFetch; }
}

// engine.304 D10 — the own-words hook. The sheet layer is mocked: no live read or write in CI.
const sheetsMod = require('/root/GodWorld/lib/sheets');
const realSheets = { get: sheetsMod.getRawSheetData, append: sheetsMod.appendRows };
let usageRows, appended;
function mockSheets() {
  usageRows = [['Timestamp', 'Cycle', 'CitizenName', 'UsageType', 'Context', 'Reporter', 'Processed']];
  appended = [];
  sheetsMod.getRawSheetData = async (tab) => {
    if (tab === 'Generic_Citizens') return [['First', 'Last', 'Status', 'FamilyOf', 'FamilyRole', 'MaidenName'],
      ['Amara', 'Davis', 'Family', 'POP-00021', 'spouse', 'Keane'],
      ['Theo', 'Davis', 'Family', 'POP-00021', 'child', 'Ng'],
      ['Rosa', 'Lane', 'Family', 'POP-00999', 'spouse', 'Vo'],
      ['Mia', 'Davis', 'Active', '', '', '']];
    if (tab === 'Citizen_Media_Usage') return usageRows.map((r) => r.slice());
    throw new Error('unexpected tab ' + tab);
  };
  sheetsMod.appendRows = async (tab, rows) => { appended.push({ tab, rows }); rows.forEach((r) => usageRows.push(r)); };
}
async function familyCases() {
  const realFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ id: 'doc9' }) });
  try {
    mockSheets();
    const r1 = await cp.appendReflection_('POP-00021', 'Amara made dinner and Mia stopped by.', { cycle: 113, daypart: 'evening' });
    const row = appended[0] && appended[0].rows[0];
    assert('own words naming a linked spouse write one family-own-words row', r1.familyMentions === 1 && appended.length === 1 && appended[0].tab === 'Citizen_Media_Usage');
    assert('the row: full name, type, Cycle, the page id; Reporter and Processed blank', row && row[2] === 'Amara Davis' && row[3] === 'family-own-words' && row[1] === '113' && row[4] === 'cp-POP-00021-c113-evening' && row[5] === '' && row[6] === '');
    assert('an Active pool row by the same surname is nobody\'s family', !appended.some((a) => a.rows.some((r) => r[2] === 'Mia Davis')));
    const r2 = await cp.appendReflection_('POP-00021', 'Amara made dinner and Mia stopped by.', { cycle: 113, daypart: 'evening' });
    assert('a retried wake (same page id) ticks nobody twice', r2.familyMentions === 0 && appended.length === 1);
    await cp.appendReflection_('POP-00021', 'Theo and Amara at the lake', { cycle: 113, daypart: 'INTERVIEW' });
    assert('two members named on one page → two rows', appended.length === 2 && appended[1].rows.length === 2);
    mockSheets();
    await cp.appendReflection_('POP-00021', 'TENSION[c113]: will Amara stay?', { cycle: 113, daypart: 'evening', key: 'tension', extra: { type: 'tension' } });
    await cp.appendReflection_('POP-00021', 'note: Amara', { cycle: 113, daypart: 'deskwork', key: 'note1', extra: { kind: 'reporter-working-note' } });
    await cp.appendReflection_('POP-00021', 'Amara', { cycle: 113, daypart: 'CIVIC', key: 'position' });
    await cp.appendReflection_('POP-00005', 'Amara', { cycle: 113, daypart: 'NIGHTLY' });
    await cp.appendReflection_('POP-00021', 'Amara', {});
    assert('tension lines, desk notes, office walls, the operator\'s page and an unkeyed write never count', appended.length === 0);
    await cp.appendReflection_('POP-00999', 'I will see Amara', { cycle: 113, daypart: 'morning' });
    assert('someone else\'s family is not mine', appended.length === 0);
    global.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
    const r3 = await cp.appendReflection_('POP-00021', 'Amara', { cycle: 114, daypart: 'morning' });
    assert('a page that did not land writes no usage', r3.error && appended.length === 0);
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ id: 'doc10' }) });
    sheetsMod.getRawSheetData = async () => { throw new Error('sheet down'); };
    const r4 = await cp.appendReflection_('POP-00021', 'Amara', { cycle: 114, daypart: 'morning' });
    assert('a usage failure never fails the page write', r4.id === 'doc10' && !r4.error && /sheet down/.test(r4.familyMentionsError));
  } finally { global.fetch = realFetch; sheetsMod.getRawSheetData = realSheets.get; sheetsMod.appendRows = realSheets.append; }
}

console.log('\nTest 6: scrubPageResult_ — Mags\'s NIGHTLY journal is scrubbed on read, every other doc untouched (engine.197 M1)');
const LEAK = '### Nightly Reflection — 2026-10-16\n\nOn Moltbook today someone said agents log what they did. Robert made soup.';
{
  const s = (pop, r) => cp.scrubPageResult_(pop, r);
  const n = s('POP-00005', { content: LEAK, metadata: { daypart: 'NIGHTLY' } });
  assert('NIGHTLY content scrubbed', n.content === 'Robert made soup.', n.content);
  assert('metadata-less doc on her page scrubbed (fail-safe)', s('POP-00005', { content: LEAK, metadata: null }).content === 'Robert made soup.');
  assert('her doc with metadata but no daypart scrubbed', s('POP-00005', { content: LEAK, metadata: { type: 'reflection' } }).content === 'Robert made soup.');
  const wake = { content: 'My agent called about the lease.', metadata: { daypart: 'morning' } };
  assert('her own wake doc (other daypart) untouched — same object', s('POP-00005', wake) === wake);
  const other = { content: 'My agent called about the lease.', metadata: null };
  assert('metadata-less non-Mags doc untouched — same object', s('POP-00810', other) === other);
  const chunk = s('POP-00005', { chunk: LEAK, metadata: { daypart: 'NIGHTLY' } });
  assert('search chunk carrier scrubbed', chunk.chunk === 'Robert made soup.', chunk.chunk);
  const chunks = s('POP-00005', { chunks: [{ content: LEAK }, { content: 'Discord again.' }], metadata: { daypart: 'NIGHTLY' } });
  assert('chunks[].content scrubbed', chunks.chunks[0].content === 'Robert made soup.' && chunks.chunks[1].content === '');
  assert('empty after scrub -> null', s('POP-00005', { content: '### Nightly Reflection — 2026-10-16\n\nOn Moltbook today.', metadata: { daypart: 'NIGHTLY' } }) === null);
}

async function readCases() {
  const realFetch = global.fetch;
  const ok = (json) => ({ ok: true, status: 200, json: async () => json });
  try {
    global.fetch = async () => ok({ results: [{ chunk: LEAK, metadata: { daypart: 'NIGHTLY' } }, { chunk: 'On Moltbook.', metadata: { daypart: 'NIGHTLY' } }] });
    const rs = await cp.readPage_('POP-00005', 'soup', 5);
    assert('readPage_ scrubs + drops empty', rs.results.length === 1 && rs.results[0].chunk === 'Robert made soup.', JSON.stringify(rs.results));
    const rr = await cp.readPage_('POP-00005', 'soup', 5, { raw: true });
    assert('readPage_ raw opt-out returns the API results', rr.results.length === 2 && rr.results[0].chunk === LEAK);
    global.fetch = async (url) => (String(url).includes('/list')
      ? ok({ memories: [{ id: 'a', createdAt: '2', customId: 'cp-POP-00005-c111-NIGHTLY-x' }] })
      : ok({ content: LEAK, metadata: { daypart: 'NIGHTLY' } }));
    const rc = await cp.recentPage_('POP-00005', 1);
    assert('recentPage_ scrubs NIGHTLY', rc.results.length === 1 && rc.results[0].content === 'Robert made soup.', JSON.stringify(rc.results));
    const rcr = await cp.recentPage_('POP-00005', 1, { raw: true });
    assert('recentPage_ raw opt-out', rcr.results[0].content === LEAK);
  } finally { global.fetch = realFetch; }
}

mockSheets();
console.log('\nTest 5: engine.304 — own words naming linked family');
appendCases().then(familyCases).then(readCases).then(() => {
  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
});
