'use strict';

// civic.47 M1 item 7 — Mara's memory is her own citizen page (cp-POP-00507,
// builder 2026-11-03: "mara should be using her wiki container"). The
// manual-era `mara` container holds out-of-world material; nothing here
// reads it. Her desk records ride on the page with a non-reflection type,
// so the page scanners that read citizens' own words skip them.
// Unlike lib/supermemory (fail-soft to []), every call says whether the
// memory answered, so "no match" is never confused with "unavailable".

const API = 'https://api.supermemory.ai';
const POP = 'POP-00507';
const PARENT = 'citizen-pages';
const CONTAINER = 'cp-' + POP;

function key() { return process.env.SUPERMEMORY_CC_API_KEY || ''; }
async function call(method, pathname, body, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs || 15000);
  try {
    const r = await fetch(API + pathname, {
      method, signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + key(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    let j = null;
    try { j = await r.json(); } catch (e) { return { error: 'bad JSON (HTTP ' + r.status + ')' }; }
    if (!r.ok || (j && j.error)) return { error: 'HTTP ' + r.status + (j && j.error ? ': ' + (typeof j.error === 'string' ? j.error : JSON.stringify(j.error)) : '') };
    return { json: j };
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally { clearTimeout(t); }
}
const post = (p, b, t) => call('POST', p, b, t);

// { status: 'ok', results: [{text, cycle, customId}] } | { status: 'unavailable', why }
async function search(query, opts) {
  if (!key()) return { status: 'unavailable', why: 'no Supermemory key in this run' };
  const r = await post('/v3/search', { q: String(query || ''), containerTags: [CONTAINER], limit: (opts && opts.limit) || 8 });
  if (r.error) return { status: 'unavailable', why: r.error };
  const results = (r.json.results || []).map(x => {
    const chunks = (x.chunks || []).filter(c => c.isRelevant);
    const text = (chunks.length ? chunks : (x.chunks || []).slice(0, 2)).map(c => String(c.content || '')).join(' ').replace(/\s+/g, ' ').trim();
    const m = x.metadata || {};
    return { text, cycle: m.cycle != null ? m.cycle : null, customId: x.customId || null };
  }).filter(x => x.text);
  return { status: 'ok', results };
}

// The seeded desk records plus the newest docs on her page, full text, read by
// list + get: search can miss a fresh doc for a while (seen 2026-11-03 — the
// three seeds were indexed "done" and no query returned them). { status, results } like search.
const isSeed = d => /-seed-/.test(String((d && d.customId) || ''));
async function recent(limit) {
  if (!key()) return { status: 'unavailable', why: 'no Supermemory key in this run' };
  const n = Math.max(limit || 5, 1);
  const l = await post('/v3/documents/list', { containerTags: [CONTAINER], limit: 200 });
  if (l.error) return { status: 'unavailable', why: l.error };
  const all = (l.json.memories || l.json.documents || []).filter(d => d && d.id)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const docs = all.filter(d => !isSeed(d)).slice(0, n).concat(all.filter(isSeed));
  const results = [];
  for (const d of docs) {
    const g = await call('GET', '/v3/documents/' + d.id);
    if (g.error) return { status: 'unavailable', why: g.error };
    const m = g.json.metadata || d.metadata || {};
    const text = String(g.json.content || '').replace(/\s+/g, ' ').trim();
    if (text) results.push({ text, cycle: m.cycle != null ? m.cycle : null, customId: d.customId || null });
  }
  return { status: 'ok', results };
}

async function hasDoc(customId) {
  for (let p = 1; p <= 5; p++) {
    const r = await post('/v3/documents/list', { containerTags: [CONTAINER], limit: 200, page: p });
    if (r.error) return null;
    const docs = r.json.memories || r.json.documents || [];
    if (docs.some(d => d && d.customId === customId)) return true;
    if (docs.length < 200) return false;
  }
  return null;
}

// Upsert a desk record on her page by customId, then read back. { ok, customId, why? }
async function upsert(customId, content, metadata) {
  if (!key()) return { ok: false, customId, why: 'no Supermemory key in this run' };
  const meta = { popId: POP };
  for (const [k, v] of Object.entries(metadata || {})) if (v != null) meta[k] = v;
  if (!meta.type || meta.type === 'reflection' || meta.type === 'tension') return { ok: false, customId, why: 'a desk record needs its own type' };
  const r = await post('/v3/documents', { content: String(content || ''), customId, containerTags: [PARENT, CONTAINER], metadata: meta });
  if (r.error) return { ok: false, customId, why: r.error };
  const back = await hasDoc(customId);
  return back === true ? { ok: true, customId } : { ok: false, customId, why: back === false ? 'readback: not found' : 'readback: unknown' };
}

module.exports = { CONTAINER, POP, search, recent, upsert, hasDoc };
