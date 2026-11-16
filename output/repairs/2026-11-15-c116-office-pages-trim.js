#!/usr/bin/env node
/**
 * C116 office pages: the first hearing (rewound fire, 21:17–21:26Z) and the second (01:17–01:26Z) wrote under the same
 * per-Cycle keys; the store appended the second statement into the first entry. This keeps the SECOND hearing only.
 *   merged entry (old --- new)            -> content replaced by the last part (in place)
 *   single entry created before 00:00Z    -> first hearing only, no second statement under that key -> deleted
 *   single entry created after 00:00Z     -> second hearing only -> left alone
 * Also Varek's journal entry for the Cycle (cp-POP-00789-c116-journal), same rule.
 *   node output/repairs/2026-11-15-c116-office-pages-trim.js            # dry run
 *   node output/repairs/2026-11-15-c116-office-pages-trim.js --apply    # saves every old entry first, then writes, then reads back
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const { pageTagFor } = require('/root/GodWorld/lib/citizenPage');
const APPLY = process.argv.includes('--apply');
const API = 'https://api.supermemory.ai';
const key = process.env.SUPERMEMORY_CC_API_KEY;
if (!key) { console.error('no key'); process.exit(1); }
const auth = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
const OFFICES = ['POP-00034', 'POP-00506', 'POP-00043', 'POP-00037', 'POP-00504', 'POP-00503', 'POP-00502', 'POP-00042', 'POP-00505', 'POP-00044', 'POP-00790', 'POP-01021', 'POP-00792', 'POP-00791', 'POP-00041'];
const SECOND_RUN_START = Date.parse('2026-11-16T00:00:00Z');
const SEP = /\n\s*---\s*\n/;
const BEFORE = '/root/GodWorld/output/repairs/2026-11-15-c116-office-pages-BEFORE.json';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, path, body) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(API + path, { method, headers: auth, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
    if (r.status === 429 || r.status >= 500) { await wait(4000); continue; }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  }
  return { status: 0, j: {} };
}
async function listAll(tag) {
  const out = []; let page = 1;
  for (;;) {
    const r = await call('POST', '/v3/documents/list', { containerTags: [tag], limit: 100, page, sort: 'createdAt', order: 'desc' });
    const docs = (r.j && (r.j.memories || r.j.documents || r.j.results)) || [];
    out.push(...docs);
    if (docs.length < 100 || page >= 10) break; page++;
  }
  return out;
}
(async () => {
  const plan = [];
  for (const pop of OFFICES.concat(['POP-00789'])) {
    const tag = pageTagFor(pop);
    const want = pop === 'POP-00789' ? /-c116-journal$/ : /-c116-CIVIC-/;
    const docs = (await listAll(tag)).filter((d) => d && want.test(String(d.customId || '')));
    for (const d of docs) {
      const g = await call('GET', '/v3/documents/' + d.id);
      const content = String((g.j && g.j.content) || '');
      const parts = content.split(SEP).map((s) => s.trim()).filter(Boolean);
      const created = Date.parse(d.createdAt || (g.j && g.j.createdAt) || 0);
      let action = 'keep', next = null;
      if (parts.length > 1) { action = 'trim'; next = parts[parts.length - 1]; }
      else if (created < SECOND_RUN_START) action = 'delete';
      plan.push({ pop, id: d.id, customId: d.customId, createdAt: d.createdAt, parts: parts.length, action, content, next });
      await wait(150);
    }
    const mine = plan.filter((p) => p.pop === pop);
    console.log(`${pop}: ${mine.length} entries — trim ${mine.filter((p) => p.action === 'trim').length}, delete ${mine.filter((p) => p.action === 'delete').length}, keep ${mine.filter((p) => p.action === 'keep').length}`);
  }
  const t = plan.filter((p) => p.action === 'trim'), del = plan.filter((p) => p.action === 'delete');
  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${plan.length} entries: trim ${t.length}, delete ${del.length}, keep ${plan.length - t.length - del.length}`);
  const s = t[0]; if (s) console.log(`sample trim ${s.customId}\n   was : ${s.content.replace(/\s+/g, ' ').slice(0, 300)}\n   now : ${s.next.replace(/\s+/g, ' ').slice(0, 300)}`);
  del.slice(0, 3).forEach((d) => console.log(`sample delete ${d.customId} (${d.createdAt}): ${d.content.replace(/\s+/g, ' ').slice(0, 140)}`));
  if (!APPLY) { console.log('\nDry run only. Nothing written.'); return; }
  fs.writeFileSync(BEFORE, JSON.stringify({ at: new Date().toISOString(), entries: plan }, null, 1));
  console.log('old entries saved: ' + BEFORE);
  let ok = 0, bad = 0;
  for (const p of t) { const r = await call('PATCH', '/v3/documents/' + p.id, { content: p.next }); r.status >= 200 && r.status < 300 ? ok++ : (bad++, console.log('  PATCH failed', p.customId, r.status)); await wait(200); }
  for (const p of del) { const r = await call('DELETE', '/v3/documents/' + p.id); r.status >= 200 && r.status < 300 ? ok++ : (bad++, console.log('  DELETE failed', p.customId, r.status)); await wait(200); }
  console.log(`written: ${ok} ok, ${bad} failed`);
  await wait(15000);
  let still = 0;
  for (const p of t) { const g = await call('GET', '/v3/documents/' + p.id); if (String((g.j && g.j.content) || '').split(SEP).filter((x) => x.trim()).length > 1) still++; await wait(120); }
  let gone = 0;
  for (const p of del) { const g = await call('GET', '/v3/documents/' + p.id); if (g.status === 404 || !(g.j && g.j.content)) gone++; await wait(120); }
  console.log(`read-back: entries still holding two statements ${still}; deleted entries gone ${gone}/${del.length}`);
  process.exit(bad || still ? 2 : 0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
