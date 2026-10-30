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
    // pipeline.94 — the weekday rides after the daypart, before any key; two weekdays are two docs
    global.fetch = reply(200, { id: 'doc2' });
    const thu = await cp.appendReflection_('POP-00121', 'a', { cycle: 113, daypart: 'morning', day: 'thu' });
    const fri = await cp.appendReflection_('POP-00121', 'b', { cycle: 113, daypart: 'morning', day: 'fri' });
    assert('pipeline.94: a weekday keys the page doc', thu.customId === 'cp-POP-00121-c113-morning-thu' && sent.customId === 'cp-POP-00121-c113-morning-fri' && thu.customId !== fri.customId);
    const ten = await cp.appendReflection_('POP-00121', 'TENSION[c113]: q', { cycle: 113, daypart: 'morning', day: 'thu', key: 'tension', extra: { type: 'tension' } });
    assert('pipeline.94: a keyed doc of the same wake carries the weekday before its key', ten.customId === 'cp-POP-00121-c113-morning-thu-tension');
    const noDay = await cp.appendReflection_('POP-00121', 'c', { cycle: 113, daypart: 'morning' });
    assert('pipeline.94: no day = the old key, unchanged', noDay.customId === 'cp-POP-00121-c113-morning');
    let posted = false;
    global.fetch = async () => { posted = true; return { ok: true, status: 200, json: async () => ({ id: 'x' }) }; };
    const badDay = await cp.appendReflection_('POP-00121', 'd', { cycle: 113, daypart: 'morning', day: '2026-10-30' });
    assert('pipeline.94: a day that is not a weekday is refused before any write', /invalid day/.test(badDay.error || '') && !posted);
    assert('pipeline.94: pageDayOf is the Central weekday (Thu 22:00 Chicago is Fri in UTC)', cp.pageDayOf(new Date('2026-10-30T03:00:00Z')) === 'thu' && cp.pageDayOf(new Date('2026-10-30T12:30:00Z')) === 'fri');
    assert('pipeline.94: pageDayOf throws on a bad date', throws(() => cp.pageDayOf(new Date('nope'))));
    // pipeline.96 — an interview's ref rides after the weekday, before any key; it needs a day and six letters a–p
    global.fetch = reply(200, { id: 'doc3' });
    const refA = cp.pageRefOf('You filed a story for the Tribune: filed: Harbor Night'), refB = cp.pageRefOf('What did the council vote mean for your block?');
    assert('pipeline.96: pageRefOf is six letters a-p, the same ask the same ref, two asks two refs',
      cp.PAGE_REF_RE.test(refA) && cp.PAGE_REF_RE.test(refB) && refA === cp.pageRefOf('You filed a story for the Tribune: filed: Harbor Night') && refA !== refB);
    assert('pipeline.96: pageRefOf is sha1 hex read as letters (0=a .. f=p)', cp.pageRefOf('') === 'nkdjkd'); // sha1('') = da39a3…
    const pr = await cp.appendReflection_('POP-00121', 'e', { cycle: 113, daypart: 'PRESS', day: 'thu', ref: refA });
    const prT = await cp.appendReflection_('POP-00121', 'TENSION[c113]: q', { cycle: 113, daypart: 'PRESS', day: 'thu', ref: refA, key: 'tension', extra: { type: 'tension' } });
    assert('pipeline.96: an interview page carries day then ref; its tension line carries both before its key',
      pr.customId === 'cp-POP-00121-c113-PRESS-thu-' + refA && prT.customId === 'cp-POP-00121-c113-PRESS-thu-' + refA + '-tension');
    posted = false;
    global.fetch = async () => { posted = true; return { ok: true, status: 200, json: async () => ({ id: 'x' }) }; };
    const refNoDay = await cp.appendReflection_('POP-00121', 'f', { cycle: 113, daypart: 'PRESS', ref: refA });
    const refBad = await cp.appendReflection_('POP-00121', 'g', { cycle: 113, daypart: 'PRESS', day: 'thu', ref: 'note12' });
    assert('pipeline.96: a ref without a day, or not six letters a-p, is refused before any write',
      /invalid ref/.test(refNoDay.error || '') && /invalid ref/.test(refBad.error || '') && !posted);
    // pipeline.96 — through a store that appends under a taken customId (the duplicate rule): three asks on Thursday are
    // three docs, the first ask rerun lands in its own doc again; every id the writer builds is one the scanner admits.
    const store = new Map();
    global.fetch = async (url, init) => {
      const b = JSON.parse(init.body);
      store.set(b.customId, store.has(b.customId) ? store.get(b.customId) + '\n\n---\n\n' + b.content : b.content);
      return { ok: true, status: 200, json: async () => ({ id: b.customId }) };
    };
    const asks = ['Ask one', 'Ask two', 'You filed a story for the Tribune: filed: Harbor Night', 'Ask one'];
    const ids = [];
    for (const [i, a] of asks.entries()) ids.push((await cp.appendReflection_('POP-00121', 'answer ' + i, { cycle: 113, daypart: 'PRESS', day: 'thu', ref: cp.pageRefOf(a) })).customId);
    assert('pipeline.96: three asks one Thursday = three docs; the rerun ask appends into its own', store.size === 3 && store.get(ids[0]) === 'answer 0\n\n---\n\nanswer 3' && store.get(ids[1]) === 'answer 1');
    ids.push((await cp.appendReflection_('POP-00121', 'TENSION[c113]: q', { cycle: 113, daypart: 'PRESS', day: 'thu', ref: cp.pageRefOf('Ask two'), key: 'tension-resolved', extra: { type: 'tension' } })).customId);
    ids.push((await cp.appendReflection_('POP-00121', 'shift', { cycle: 113, daypart: 'work', day: 'tue' })).customId);
    ids.push((await cp.appendReflection_('POP-00121', 'talk', { cycle: 113, daypart: 'CONVO', day: 'wed', key: 'tension', extra: { type: 'tension' } })).customId);
    const scan = require('../scripts/scanCitizenPages');
    const adm = ids.map((id) => scan.admit({ customId: id, metadata: { type: /tension/.test(id) ? 'tension' : 'reflection' } }, 113));
    assert('pipeline.96: the scanner admits every new id, slot back to the daypart grammar',
      adm.map((a) => a.slot).join(',') === 'PRESS,PRESS,PRESS,PRESS,PRESS-tension-resolved,work,CONVO-tension' &&
      adm[0].ref === cp.pageRefOf('Ask one') && adm[4].ref === cp.pageRefOf('Ask two') && adm[5].day === 'tue' && adm[5].ref === null);
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
    const r2d = await cp.appendReflection_('POP-00021', 'Amara made dinner again.', { cycle: 113, daypart: 'evening', day: 'tue' });
    assert('pipeline.94: a weekday-keyed wake is still own words — its own page id, one row', r2d.familyMentions === 1 && appended.length === 3 && appended[2].rows[0][4] === 'cp-POP-00021-c113-evening-tue');
    const r2r = await cp.appendReflection_('POP-00021', 'Amara asked about the vote.', { cycle: 113, daypart: 'PRESS', day: 'thu', ref: 'kfbmdp' });
    assert('pipeline.96: an interview keyed by day and ref is still own words — its own page id, one row', r2r.familyMentions === 1 && appended.length === 4 && appended[3].rows[0][4] === 'cp-POP-00021-c113-PRESS-thu-kfbmdp');
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
  const otherNightly = { content: LEAK, metadata: { daypart: 'NIGHTLY' } };
  assert('a NIGHTLY doc on another citizen\'s page untouched — same object', s('POP-00810', otherNightly) === otherNightly);
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

// pipeline.95 — the key before the send, list-stage type skip, and "did it land" never guessed.
async function showCases() {
  console.log('\nTest 7: pipeline.95 — pageCustomId_, recentPage_ skipTypes, pageHasDoc_');
  const realFetch = global.fetch;
  try {
    const o = { cycle: 113, daypart: 'UNDOCKED', day: 'tue', ref: 'abcdef', extra: { type: 'show' } };
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ id: 'd' }) });
    const w = await cp.appendReflection_('POP-90001', 'x', o);
    assert('pageCustomId_ is the key appendReflection_ writes', cp.pageCustomId_(cp.pageTagFor('POP-90001'), o) === w.customId && w.customId === 'cp-POP-90001-c113-UNDOCKED-tue-abcdef');
    const docs = [
      { id: 's1', customId: 'k1', createdAt: '2026-10-30T03:00:00Z', metadata: { type: 'show' } },
      { id: 's2', customId: 'k2', createdAt: '2026-10-30T02:00:00Z', metadata: { type: 'show' } },
      { id: 'r1', customId: 'k3', createdAt: '2026-10-29T01:00:00Z', metadata: { type: 'reflection' } },
      { id: 'r2', customId: 'k4', createdAt: '2026-10-28T01:00:00Z', metadata: { type: 'reflection' } },
    ];
    const gets = [];
    global.fetch = async (url) => {
      if (/documents\/list/.test(url)) return { ok: true, status: 200, json: async () => ({ memories: docs }) };
      const id = url.split('/').pop(); gets.push(id);
      return { ok: true, status: 200, json: async () => ({ content: 'c-' + id, metadata: docs.find((d) => d.id === id).metadata }) };
    };
    const plain = await cp.recentPage_('POP-90001', 2);
    assert('without skipTypes: the two newest, as before', plain.results.map((r) => r.content).join() === 'c-s1,c-s2');
    gets.length = 0;
    const skipped = await cp.recentPage_('POP-90001', 2, { skipTypes: ['show'] });
    assert('skipTypes drops show docs before the newest n are taken', skipped.results.map((r) => r.content).join() === 'c-r1,c-r2' && gets.join() === 'r1,r2');
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ memories: docs }) });
    assert('pageHasDoc_: a key on the page', (await cp.pageHasDoc_('POP-90001', 'k3')) === true);
    assert('pageHasDoc_: a key not on a short page is absent', (await cp.pageHasDoc_('POP-90001', 'nope')) === false);
    global.fetch = async () => ({ ok: false, status: 500, json: async () => ({ error: 'down' }) });
    assert('pageHasDoc_: a failed read is unknown, never absent', (await cp.pageHasDoc_('POP-90001', 'k3')) === null);
    const full = Array.from({ length: 200 }, (_, i) => ({ id: 'f' + i, customId: 'f' + i }));
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ memories: full }) });
    assert('pageHasDoc_: more docs than it reads is unknown, never a guessed absence', (await cp.pageHasDoc_('POP-90001', 'nope', { pages: 2 })) === null);
  } finally { global.fetch = realFetch; }
}

mockSheets();
console.log('\nTest 5: engine.304 — own words naming linked family');
appendCases().then(familyCases).then(readCases).then(showCases).then(() => {
  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
});
