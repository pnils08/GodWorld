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

appendCases().then(() => {
  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
});
