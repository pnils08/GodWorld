// Builder 2026-11-16 ("clean the 60 entries"): citizen memory-page entries holding machine output instead of the
// citizen's words. (a) interview entries whose content is the model's raw JSON reply (fact_ids, basis, abstain_reason):
// each part of the entry (parts joined by "---") that is such a reply becomes its quote, or is dropped when it carries none;
// prose parts stay. (b) two office entries carrying "[object Object]": that piece is cut. Old content saved first.
//   node output/repairs/2026-11-16-page-machine-output.js [--apply]
require('/root/GodWorld/lib/env');
const fs = require('fs');
const { extractSpoken } = require('/root/GodWorld/scripts/newsroomInterviewContract');
const APPLY = process.argv.includes('--apply');
const key = process.env.SUPERMEMORY_CC_API_KEY;
const API = 'https://api.supermemory.ai';
const auth = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
const BEFORE = '/root/GodWorld/output/repairs/2026-11-16-page-machine-output-BEFORE.json';
const SEP = /\n\s*---\s*\n/;
const ENV = /"(abstain_reason|fact_ids|unverifiedLead)"\s*:/;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, path, body) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(API + path, { method, headers: auth, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
    if (r.status === 429 || r.status >= 500) { await wait(4000); continue; }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  }
  return { status: 0, j: {} };
}
(async () => {
  const all = []; let cursor = null, page = 1;
  for (;;) {
    const b = { containerTags: ['citizen-pages'], limit: 100, page, sort: 'createdAt', order: 'desc', includeContent: true }; if (cursor) b.cursor = cursor;
    const r = await call('POST', '/v3/documents/list', b); const d = r.j.memories || []; all.push(...d);
    if (!r.j.pagination || !r.j.pagination.hasMore || !d.length) break; cursor = r.j.pagination.nextCursor; page++;
  }
  const plan = [];
  for (const d of all) {
    const c = String(d.content || '');
    if (ENV.test(c)) {
      const parts = c.split(SEP).map((p) => p.trim()).filter(Boolean);
      const kept = [];
      for (const p of parts) {
        if (!ENV.test(p)) { kept.push(p); continue; }
        const s = extractSpoken(p);
        if (!s.abstain && s.spoken && !ENV.test(s.spoken)) kept.push(s.spoken);
      }
      // a part that restates a kept quote word for word is the same thing said twice
      const uniq = kept.filter((p, i) => kept.indexOf(p) === i);
      plan.push({ id: d.id, customId: d.customId, kind: 'envelope', old: c, next: uniq.join('\n\n---\n\n'), action: uniq.length ? 'patch' : 'delete' });
    } else if (/\[object Object\]/.test(c)) {
      const next = c.replace(/datawake: \[object Object\] \| action: /g, 'datawake: ').replace(/ \| (action|signal): \[object Object\]/g, '').replace(/\[object Object\]/g, '').trim();
      plan.push({ id: d.id, customId: d.customId, kind: 'object', old: c, next, action: 'patch' });
    }
  }
  const bad = plan.filter((p) => ENV.test(p.next) || /\[object Object\]/.test(p.next));
  console.log('docs read', all.length, '| to fix', plan.length, '(patch', plan.filter((p) => p.action === 'patch').length + ', delete', plan.filter((p) => p.action === 'delete').length + ') | still machine after fix', bad.length);
  plan.slice(0, 3).concat(plan.filter((p) => p.kind === 'object')).forEach((p) => console.log('\n' + p.customId, p.action, '\n  was:', p.old.replace(/\s+/g, ' ').slice(0, 220), '\n  now:', p.next.replace(/\s+/g, ' ').slice(0, 220)));
  if (bad.length) { console.log('stop'); process.exit(1); }
  if (!APPLY) { console.log('\ndry run, nothing written'); return; }
  fs.writeFileSync(BEFORE, JSON.stringify({ at: new Date().toISOString(), entries: plan }, null, 1));
  let ok = 0, fail = 0;
  for (const p of plan) {
    const r = p.action === 'patch' ? await call('PATCH', '/v3/documents/' + p.id, { content: p.next }) : await call('DELETE', '/v3/documents/' + p.id);
    if (r.status >= 200 && r.status < 300) ok++; else { fail++; console.log('  failed', p.customId, r.status); }
    await wait(250);
  }
  console.log('written ' + ok + ' ok, ' + fail + ' failed; old entries saved: ' + BEFORE);
  await wait(15000);
  let still = 0;
  for (const p of plan) { const g = await call('GET', '/v3/documents/' + p.id); const t = String((g.j && g.j.content) || ''); if (p.action === 'patch' ? (ENV.test(t) || /\[object Object\]/.test(t)) : (g.status === 200 && t)) still++; await wait(120); }
  console.log('read-back: entries still holding machine output ' + still);
  process.exit(fail || still ? 2 : 0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
