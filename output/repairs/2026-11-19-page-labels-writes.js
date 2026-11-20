// pipeline.112 (builder 2026-11-19: "If no one reads back to 104 then the entire sim is broken"): the office docs that
// hold several writes whose label facts differ — 15, all from one rerun of C104's chain — get metadata.writes, each
// write's own topic / speaker / action / signal, taken from the entry as it was stored before the rewrite (the BEFORE
// files). The store kept only the newest write's facts, so the older write was shown under the newer one's topic.
// Metadata only: PATCH /v3/documents/<id> { metadata } merges and leaves the content (probed 2026-11-19). Each doc read
// by id first, its metadata before saved, each read back, and its shown line compared with the old entry.
//   node output/repairs/2026-11-19-page-labels-writes.js [--apply]
require('/root/GodWorld/lib/env');
const fs = require('fs');
const pl = require('/root/GodWorld/lib/pageLabels');
const APPLY = process.argv.includes('--apply');
const API = 'https://api.supermemory.ai';
const auth = { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
async function call(method, p, body) {
  for (let i = 0; i < 6; i++) {
    let r; try { r = await fetch(API + p, { method, headers: auth, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) }); } catch (e) { await wait(4000); continue; }
    if (r.status === 429 || r.status >= 500) { await wait(4000 * (i + 1)); continue; }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  }
  return { status: 0, j: {} };
}
const D = '/root/GodWorld/output/repairs/';
(async () => {
  const want = [];
  for (const f of fs.readdirSync(D).filter((x) => x.startsWith('2026-11-19-page-labels-off-BEFORE-'))) {
    for (const e of JSON.parse(fs.readFileSync(D + f, 'utf8')).entries) {
      const meta = Object.assign({}, e.metadataBefore, e.add);
      if (meta.type !== 'office-position' || !e.old.includes(pl.APPEND_SEP)) continue;
      const parts = e.old.split(pl.APPEND_SEP);
      // each write's facts as its own label carried them
      const writes = parts.map((p) => {
        const hit = pl.splitLabelled(p, { holder: meta.holder });
        const f = {}; for (const k of pl.WRITE_FIELDS) if (hit && hit.meta[k]) f[k] = hit.meta[k];
        return f;
      });
      if (writes.every((w) => JSON.stringify(w) === JSON.stringify(writes[0]))) continue;   // one set of facts: the doc's own metadata says it
      want.push({ id: e.id, customId: e.customId, old: e.old, writes: JSON.stringify(writes) });
    }
  }
  console.log('docs whose writes carry different facts:', want.length);
  const saved = []; let written = 0, failed = 0, same = 0, differ = 0;
  for (const w of want) {
    const g = await call('GET', '/v3/documents/' + w.id);
    if (g.status !== 200) { failed++; console.log('  read failed', w.customId, g.status); continue; }
    const before = g.j.metadata || {};
    saved.push({ id: w.id, customId: w.customId, metadataBefore: before });
    const shownIf = pl.wallLine(g.j.content, Object.assign({}, before, { writes: w.writes }));
    console.log((APPLY ? 'write ' : 'would write ') + w.customId + ' | writes ' + w.writes.length + ' chars | shown as before: ' + (shownIf === flat(w.old)));
    if (!APPLY) continue;
    const r = await call('PATCH', '/v3/documents/' + w.id, { metadata: { writes: w.writes } });
    if (r.status !== 200) { failed++; console.log('  PATCH failed', r.status, JSON.stringify(r.j).slice(0, 200)); continue; }
    written++;
  }
  if (APPLY) {
    const file = D + '2026-11-19-page-labels-writes-BEFORE.json';
    fs.writeFileSync(file, JSON.stringify({ saved }, null, 1));
    await wait(6000);
    for (const w of want) {
      let g; for (let i = 0; i < 10; i++) { g = await call('GET', '/v3/documents/' + w.id); if (g.status === 200 && g.j.status === 'done' && g.j.metadata && g.j.metadata.writes === w.writes) break; await wait(2500); }
      const shown = pl.wallLine(g.j.content, g.j.metadata || {});
      if (g.j.metadata && g.j.metadata.writes === w.writes && shown === flat(w.old)) same++;
      else { differ++; console.log('  READ-BACK DIFFERS', w.customId, '\n   was', flat(w.old).slice(0, 200), '\n   now', shown.slice(0, 200)); }
    }
    console.log('written ' + written + ' | failed ' + failed + ' | read back with writes and shown as the old entry ' + same + ' | differ ' + differ + ' | metadata before: ' + file);
  }
})().catch((e) => { console.error(e); process.exit(1); });
