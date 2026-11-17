// Builder 2026-11-17 ("Stop handing them back + clean the pages"): Monday 11-16's four worker datawake statements were
// made on the build before the lean shape (template worker/1) — "broken entries from a bad agent build". Each is one page
// doc, its id on the wake's record (positionWall). Each doc is read, checked against the record (customId, and its content
// holds the record's statement), saved whole, then deleted on --apply.
//   node output/repairs/2026-11-17-worker-monday-pages.js [--apply]
require('/root/GodWorld/lib/env');
const fs = require('fs');
const APPLY = process.argv.includes('--apply');
const API = 'https://api.supermemory.ai';
const auth = { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' };
const BEFORE = '/root/GodWorld/output/repairs/2026-11-17-worker-monday-pages-BEFORE.json';
const RECS = ['worker-chief-fire', 'worker-emerg-dir', 'worker-ems-dir', 'worker-med-exam'].map((d) => '/root/GodWorld/output/cron-civic/datawake/' + d + '_2026-11-16.json');
const sq = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, path) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(API + path, { method, headers: auth, signal: AbortSignal.timeout(60000) });
    if (r.status === 429 || r.status >= 500) { await wait(4000); continue; }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  }
  return { status: 0, j: {} };
}
(async () => {
  const plan = [];
  for (const f of RECS) {
    const rec = JSON.parse(fs.readFileSync(f, 'utf8'));
    const pw = rec.positionWall || {};
    if (rec.template !== 'worker/1' || !pw.id) { console.log('SKIP', f, rec.template, pw.id); continue; }
    const g = await call('GET', '/v3/documents/' + pw.id);
    const content = String(g.j.content || '');
    const ok = g.status === 200 && g.j.customId === pw.customId && sq(content).includes(sq(rec.statement).slice(0, 200));   // the page keeps the words with whitespace collapsed
    console.log(rec.holder, rec.popid, pw.id, 'status', g.status, 'customId', g.j.customId === pw.customId, 'matches', ok, content.length + ' chars');
    plan.push({ record: f, popid: rec.popid, holder: rec.holder, id: pw.id, customId: pw.customId, containerTag: pw.tag, ok, doc: g.j });
  }
  fs.writeFileSync(BEFORE, JSON.stringify({ at: new Date().toISOString(), entries: plan }, null, 1));
  console.log('saved', plan.length, 'to', BEFORE);
  if (!APPLY) return;
  for (const p of plan.filter((x) => x.ok)) {
    const d = await call('DELETE', '/v3/documents/' + p.id);
    const back = await call('GET', '/v3/documents/' + p.id);
    console.log('DELETE', p.holder, d.status, '| read back', back.status);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
