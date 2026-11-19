// pipeline.112 Task 4, the plan's text ("the label in metadata"; Task 2: a grade carries score and max, kind on every entry):
// stored grade docs get score + scoreMax from their newest line, stored talk docs get kind talk. Metadata only —
// PATCH /v3/documents/<id> { metadata } merges and leaves the content (probed 2026-11-19). Each doc read by id first,
// the metadata before saved, each read back.   node …-metadata.js [--apply]
require('/root/GodWorld/lib/env');
const fs = require('fs');
const pl = require('/root/GodWorld/lib/pageLabels');
const APPLY = process.argv.includes('--apply');
const API = 'https://api.supermemory.ai';
const auth = { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, p, body) {
  for (let i = 0; i < 6; i++) {
    let r; try { r = await fetch(API + p, { method, headers: auth, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) }); } catch (e) { await wait(4000); continue; }
    if (r.status === 429 || r.status >= 500) { await wait(4000 * (i + 1)); continue; }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  }
  return { status: 0, j: {} };
}
(async () => {
  const all = []; let page = 1;
  for (;;) {
    const r = await call('POST', '/v3/documents/list', { containerTags: ['citizen-pages'], limit: 100, page, sort: 'createdAt', order: 'desc', includeContent: true });
    if (r.status !== 200) throw new Error('list ' + r.status);
    const d = r.j.memories || []; all.push(...d);
    if (!r.j.pagination || !r.j.pagination.hasMore || !d.length) break; page++;
  }
  const want = (doc) => {
    const m = doc.metadata || {}; const id = String(doc.customId || '');
    if (/-PRESS-graded(?:-|$)/.test(id) && m.score == null) {
      const last = String(doc.content || '').split(pl.APPEND_SEP).pop().trim().replace(/^graded: /, '');
      const g = last.match(/^(\d)\/([34])\b/);
      return g ? { score: Number(g[1]), scoreMax: Number(g[2]), ...(m.kind ? {} : { kind: 'graded' }) } : { unread: last.slice(0, 60) };
    }
    if (m.type === 'talk' && !m.kind) return { kind: 'talk' };
    return null;
  };
  const plan = all.map((d) => ({ d, add: want(d) })).filter((x) => x.add);
  const unread = plan.filter((x) => x.add.unread);
  const todo = plan.filter((x) => !x.add.unread);
  console.log('docs ' + all.length + ' | grade docs to get a score ' + todo.filter((x) => x.add.score != null).length + ' | talk docs to get a kind ' + todo.filter((x) => x.add.kind === 'talk').length + ' | grade docs whose newest line has no score ' + unread.length);
  unread.slice(0, 5).forEach((x) => console.log('   ', x.d.customId, '|', x.add.unread));
  todo.slice(0, 3).forEach((x) => console.log('   ', x.d.customId, JSON.stringify(x.add)));
  if (!APPLY) { console.log('dry run, nothing written'); return; }
  const BEFORE = '/root/GodWorld/output/repairs/2026-11-19-page-labels-metadata-BEFORE.json';
  const entries = []; let ok = 0, fail = 0;
  for (const x of todo) {
    const g = await call('GET', '/v3/documents/' + x.d.id);
    if (g.status !== 200) { fail++; console.log('  read failed', x.d.customId, g.status); continue; }
    const add = want({ customId: g.j.customId || x.d.customId, content: g.j.content, metadata: g.j.metadata || {} });
    if (!add || add.unread) continue;
    entries.push({ id: x.d.id, customId: x.d.customId, metadataBefore: g.j.metadata || {}, add, content: g.j.content });
    fs.writeFileSync(BEFORE, JSON.stringify({ at: new Date().toISOString(), entries }, null, 1));
    const r = await call('PATCH', '/v3/documents/' + x.d.id, { metadata: add });
    if (r.status >= 200 && r.status < 300) ok++; else { fail++; entries[entries.length - 1].failed = r.status; console.log('  write failed', x.d.customId, r.status); }
    await wait(250);
  }
  console.log('written ' + ok + ' | failed ' + fail + ' | before: ' + BEFORE);
  await wait(15000);
  let bad = 0;
  for (const e of entries.filter((z) => !z.failed)) {
    const g = await call('GET', '/v3/documents/' + e.id);
    const metaOk = Object.keys(e.add).every((k) => g.j && g.j.metadata && String(g.j.metadata[k]) === String(e.add[k]));
    if (!metaOk || g.j.content !== e.content) { bad++; if (bad <= 8) console.log('  read-back differs', e.customId); }
    await wait(100);
  }
  console.log('read-back: metadata or content differs ' + bad + ' of ' + entries.filter((z) => !z.failed).length);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
