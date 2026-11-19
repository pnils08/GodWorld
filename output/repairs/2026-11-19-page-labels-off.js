// pipeline.112 Task 4 (builder 2026-11-16: "yes strip the labels"): the stored citizen-page entries that open with a
// code-written label (TENSION[cN]: / TENSION-RESOLVED[cN]: / TALK[cN]: / stated: / datawake: / filed: / graded:)
// become their plain text; what the label said goes to the doc's metadata (lib/pageLabels.js cleanContent — the same
// split the tests pin, and the shape the writers store from 2026-11-19).
//
// By document id, never by key: PATCH /v3/documents/<id> replaces the content and merges the metadata (probed
// 2026-11-19 on throwaway docs: a POST under a taken customId APPENDS; a PATCH replaces, keeps createdAt and the
// list order). Each doc is read whole by id before it is changed, the old content is saved first, a doc already
// plain is skipped (a rerun changes nothing), every changed doc is read back.
//
//   node output/repairs/2026-11-19-page-labels-off.js                    dry run: counts, samples, the odd ones
//   node output/repairs/2026-11-19-page-labels-off.js --apply [--only <label>] [--limit N]
//   node output/repairs/2026-11-19-page-labels-off.js --restore <before-file>   put the saved content back
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const pl = require('/root/GodWorld/lib/pageLabels');

const argv = process.argv.slice(2);
const flag = (k) => argv.includes('--' + k);
const val = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const APPLY = flag('apply');
const ONLY = val('only');
const LIMIT = val('limit') ? Number(val('limit')) : 0;
const RESTORE = val('restore');
const API = 'https://api.supermemory.ai';
const auth = { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' };
const OUT = '/root/GodWorld/output/repairs';
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ');

async function call(method, p, body) {
  for (let i = 0; i < 6; i++) {
    let r;
    try { r = await fetch(API + p, { method, headers: auth, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) }); }
    catch (e) { await wait(4000); continue; }
    if (r.status === 429 || r.status >= 500) { await wait(4000 * (i + 1)); continue; }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  }
  return { status: 0, j: {} };
}

// which labels a doc of this type may carry: a label on a doc of another type is left alone and reported
const ALLOWED = {
  'TENSION': (m) => m.type === 'tension',
  'TENSION-RESOLVED': (m) => m.type === 'tension',
  'TALK': (m) => m.type === 'talk',
  'stated': (m) => m.type === 'office-position',
  'datawake': (m) => m.type === 'office-position',
  'filed': (m) => m.type === 'reflection' && m.daypart === 'PRESS',
  'graded': (m) => m.type === 'reflection' && m.daypart === 'PRESS',
};
const LABEL_LEAD = /^\s*(?:TENSION(?:-RESOLVED)?\[c\d+\]:|TALK\[c\d+\]:|stated:|datawake:|filed: |graded: )/i;
const anyLabel = (content) => String(content || '').split(pl.APPEND_SEP).some((p) => LABEL_LEAD.test(p));

async function listAll() {
  const all = []; let page = 1;
  for (;;) {
    const r = await call('POST', '/v3/documents/list', { containerTags: ['citizen-pages'], limit: 100, page, sort: 'createdAt', order: 'desc', includeContent: true });
    if (r.status !== 200) throw new Error('list page ' + page + ' -> ' + r.status);
    const d = r.j.memories || r.j.documents || []; all.push(...d);
    if (!r.j.pagination || !r.j.pagination.hasMore || !d.length) break; page++;
  }
  return all;
}

async function readDone(id, tries) {
  for (let i = 0; i < (tries || 12); i++) {
    const g = await call('GET', '/v3/documents/' + id);
    if (g.status === 200 && g.j && g.j.status === 'done') return g;
    if (g.status === 404) return g;
    await wait(2500);
  }
  return call('GET', '/v3/documents/' + id);
}

async function restore(file) {
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  let ok = 0, fail = 0;
  for (const e of saved.entries) {
    const r = await call('PATCH', '/v3/documents/' + e.id, { content: e.old });
    if (r.status >= 200 && r.status < 300) ok++; else { fail++; console.log('  failed', e.customId, r.status); }
    await wait(200);
  }
  console.log('restored ' + ok + ' of ' + saved.entries.length + ' (failed ' + fail + ') from ' + file + '. Metadata keys the rewrite added stay; they are read only beside plain content.');
  process.exit(fail ? 2 : 0);
}

(async () => {
  if (RESTORE) return restore(RESTORE);
  const all = await listAll();
  const cand = all.filter((d) => anyLabel(d.content));
  console.log('docs in citizen-pages: ' + all.length + ' | a part opens with a label (list read): ' + cand.length);

  // plan off the list read (dry); the apply re-reads each doc whole by id and plans again from that
  const planOf = (doc) => {
    const meta = doc.metadata || {};
    const c = pl.cleanContent(doc.content, meta);
    if (!c.changed) return null;
    const wrong = c.labels.filter((l) => !ALLOWED[l](meta));
    const kinds = [...new Set(c.labels)];
    const add = Object.assign({}, c.meta);
    // one doc holding both a filing and a grade (the shared PRESS doc of the first reward-loop Cycles): no single kind
    if (kinds.includes('filed') && kinds.includes('graded')) delete add.kind;
    for (const k of Object.keys(add)) if (add[k] == null || add[k] === '') delete add[k];
    return { id: doc.id, customId: doc.customId, type: meta.type || '', labels: c.labels, kinds, old: String(doc.content), next: c.content, add, wrong };
  };
  let plan = cand.map(planOf).filter(Boolean);
  const odd = plan.filter((p) => p.wrong.length);
  plan = plan.filter((p) => !p.wrong.length);
  if (ONLY) plan = plan.filter((p) => p.kinds.includes(ONLY));
  if (LIMIT) plan = plan.slice(0, LIMIT);

  const count = {};
  for (const p of plan) for (const l of p.labels) count[l] = (count[l] || 0) + 1;
  console.log('to rewrite: ' + plan.length + ' docs | labels taken off, by kind: ' + JSON.stringify(count));
  console.log('multi-part docs: ' + plan.filter((p) => p.old.includes(pl.APPEND_SEP)).length + ' | filing + grade in one doc (no kind set): ' + plan.filter((p) => p.kinds.includes('filed') && p.kinds.includes('graded')).length);
  console.log('left alone — a label on a doc of another type: ' + odd.length);
  odd.slice(0, 8).forEach((p) => console.log('   ', p.customId, '[' + p.type + ']', p.labels.join(','), '|', flat(p.old).slice(0, 90)));
  const still = plan.filter((p) => anyLabel(p.next));
  console.log('still label-led after the split: ' + still.length);
  still.slice(0, 5).forEach((p) => console.log('   ', p.customId, '|', flat(p.next).slice(0, 120)));
  const empty = plan.filter((p) => !p.next.trim());
  console.log('empty after the split: ' + empty.length);
  for (const k of ['TENSION', 'TENSION-RESOLVED', 'TALK', 'stated', 'datawake', 'filed', 'graded']) {
    const ex = plan.filter((p) => p.kinds.includes(k)).slice(0, 2);
    ex.forEach((p) => console.log('\n' + k + '  ' + p.customId + '\n  was: ' + flat(p.old).slice(0, 200) + '\n  now: ' + flat(p.next).slice(0, 200) + '\n  metadata added: ' + JSON.stringify(p.add)));
  }
  // stated: lines where no speaker was taken although a dash follows a short opening — to be read by eye
  const noSp = plan.filter((p) => p.kinds.includes('stated') && !p.add.speaker && /^[^—]{1,80} — /.test(p.next));
  console.log('\nstated: entries with a dash near the front and no speaker taken: ' + noSp.length);
  noSp.slice(0, 12).forEach((p) => console.log('   ', flat(p.next).slice(0, 110)));
  const speakers = {};
  for (const p of plan) if (p.add.speaker) speakers[p.add.speaker] = (speakers[p.add.speaker] || 0) + 1;
  console.log('speakers taken (' + Object.keys(speakers).length + '): ' + Object.entries(speakers).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(' · '));
  if (still.length || empty.length) { console.log('\nstop: the split leaves a label or an empty entry'); process.exit(1); }
  if (!APPLY) { console.log('\ndry run, nothing written'); return; }

  // apply: read each doc whole by id, plan again from that read, save the old content, PATCH, read back
  const BEFORE = path.join(OUT, '2026-11-19-page-labels-off-BEFORE-' + stamp + '.json');
  const entries = []; let ok = 0, fail = 0, skipped = 0;
  const save = () => fs.writeFileSync(BEFORE, JSON.stringify({ at: new Date().toISOString(), only: ONLY, entries }, null, 1));
  for (const p0 of plan) {
    const g = await call('GET', '/v3/documents/' + p0.id);
    if (g.status !== 200 || typeof g.j.content !== 'string') { fail++; console.log('  read failed', p0.customId, g.status); continue; }
    const p = planOf({ id: p0.id, customId: g.j.customId || p0.customId, content: g.j.content, metadata: g.j.metadata || {} });
    if (!p || p.wrong.length) { skipped++; continue; }
    if (anyLabel(p.next) || !p.next.trim()) { fail++; console.log('  not written (split leaves a label or nothing)', p.customId); continue; }
    entries.push({ id: p.id, customId: p.customId, old: p.old, next: p.next, add: p.add, metadataBefore: g.j.metadata || {} });
    save();   // the old content is on disk before the write that replaces it
    const r = await call('PATCH', '/v3/documents/' + p.id, { content: p.next, metadata: p.add });
    if (r.status >= 200 && r.status < 300) ok++; else { fail++; entries[entries.length - 1].failed = r.status; save(); console.log('  write failed', p.customId, r.status); }
    await wait(250);
    if ((ok + fail) % 200 === 0) console.log('  … ' + (ok + fail) + ' of ' + plan.length);
  }
  console.log('written ' + ok + ' | failed ' + fail + ' | already plain at the read ' + skipped + ' | old entries saved: ' + BEFORE);
  await wait(20000);
  let bad = 0, lag = 0;
  for (const e of entries.filter((x) => !x.failed)) {
    const g = await readDone(e.id, 6);
    const now = String((g.j && g.j.content) || '');
    const metaOk = Object.keys(e.add).every((k) => g.j && g.j.metadata && String(g.j.metadata[k]) === String(e.add[k]));
    if (now !== e.next || !metaOk) { if (g.j && g.j.status && g.j.status !== 'done') lag++; else { bad++; if (bad <= 10) console.log('  read-back differs', e.customId, '|', flat(now).slice(0, 100)); } }
    await wait(100);
  }
  console.log('read-back: differs ' + bad + ' | still being processed by the store ' + lag + ' of ' + entries.filter((x) => !x.failed).length);
  process.exit(fail || bad ? 2 : 0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
