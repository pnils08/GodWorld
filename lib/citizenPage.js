/* citizenPage — citizen-loop Phase 2 narrative store (engine-sheet, S262).
 *
 * Each rotated citizen accretes a private "page" of their own reflections — the subjective
 * memory layer that rides ALONGSIDE the objective LifeHistory/dials (two-layer ownership, plan
 * §write-side). One isolated Supermemory container, one tag per citizen.
 *
 * Container:  citizen-pages  (NEW, dedicated — NOT in the plugin config, NOT read at boot, NOT
 *   touched by desk agents / MCP lookup_citizen / search_world / Mike's MCP). Isolation is the
 *   contamination guard: a citizen's first-person prose ("I'm furious at my boss") can never leak
 *   into canon (bay-tribune), city-state lookups (world-data), or Mags' brain (mags).
 * Per-citizen tag:  cp-POP-XXXXX  — its own queryable namespace; a v4 search by that tag returns
 *   ONLY that citizen's page. Stored (denormalized) in Simulation_Ledger col AW (SMPageId).
 *
 * ── DETERMINISM — convention, not structure (S262 advisor). ──────────────────────────────────
 * Unlike reflectionClassifier (which imports nothing from the engine and is therefore *structurally*
 * cycle-safe), this module imports lib/sheets — it is inherently I/O. Its replay-safety is therefore
 * CONVENTION you must keep: **wake-side only. NEVER call any function here from the cycle path.**
 * Replay re-running the cycle would re-hit Supermemory (non-reproducible) and break the invariant
 * ctx.rng protects. The page is written/read at wake-time; the cycle only ever reads the persisted
 * TAG (col AW / the classifier intake), never this store. (Same class as media intake.)
 *
 * Not gated: the narrative store is inside the Phase-1 "perception + reflection + narrative-store"
 * allowance — it touches no dials/LifeHistory/cycle state. Only the dial write-back (piece 4) is gated.
 *
 * Fence contract: this module stores/returns RAW prose. Whenever a page is injected into a
 * downstream model (a citizen wake prompt, an edition interview), the CONSUMER wraps it with
 * lib/memoryFence.js — recalled citizen prose is exactly the injection surface the fence exists for.
 * One exception on READ (engine.197 M1): Mags's NIGHTLY journal docs come back through
 * memoryFence.scrubNightly unless the caller passes { raw: true } — see scrubPageResult_.
 */
require('/root/GodWorld/lib/env'); // SUPERMEMORY_CC_API_KEY
const sheets = require('/root/GodWorld/lib/sheets');
const memoryFence = require('/root/GodWorld/lib/memoryFence');

const API = 'https://api.supermemory.ai';
const PARENT_TAG = 'citizen-pages';
const TERMINAL = 'engine/sheet';
const LEDGER = 'Simulation_Ledger';
const SM_COL_HEADER = 'SMPageId';

const POPID_RE = /^POP-\d+$/i;

// pageTagFor(popId) -> the citizen's page tag. Deterministic; the single source of truth (col AW
// is a denormalized copy + a "has a page yet" marker, not the lookup key). Throws on bad POPID so
// a malformed id can never silently write to a wrong/parent tag.
function pageTagFor(popId) {
  const id = String(popId || '').trim().toUpperCase();
  if (!POPID_RE.test(id)) throw new Error('citizenPage: invalid POPID ' + JSON.stringify(popId));
  return 'cp-' + id;
}

// column-letter for a 0-indexed column (A=0). Mirrors lib/sheets columnIndexToLetter contract.
function colLetter_(i) {
  let s = '';
  let n = i + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// appendReflection_(popId, text, {cycle, daypart, day, key, extra}) -> { id, tag, customId } | { error }
//   Writes one reflection doc to the citizen's page (Supermemory only — NO sheet I/O). One doc per
//   (popId, cycle, daypart[, day][, key]) via customId.
// pipeline.94 — the store's duplicate rule (read 2026-10-30: Supermemory docs, "same customId = same document";
//   328 of 2,167 indexed page docs carry it): a write under a customId already taken lands IN that doc, the new
//   content appended ("old\n\n---\n\nnew") — not a second doc, not a refusal. So two wakes that share a key share
//   one doc. `day` is the in-world weekday (pageDayOf): a Cycle is one week, so daypart + weekday is one wake.
//   A weekday, never a calendar date — the customId is read by models (review context, slice sources, letter
//   cites), and a page never carries a real-world date.
const PAGE_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
function pageDayOf(date) {
  const d = String((date || new Date()).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Chicago' })).toLowerCase();
  if (!PAGE_DAYS.includes(d)) throw new Error('citizenPage: no weekday for ' + JSON.stringify(date) + ' (got ' + JSON.stringify(d) + ')');
  return d;
}
// engine.304 (builder 2026-10-19, R18; plan engine.286 §engine.304 D10): a citizen's own words that name a family
// member still waiting in the background pool (Generic_Citizens Status Family, FamilyOf = this citizen) are that
// member's usage: one Citizen_Media_Usage row per member per page, typed family-own-words. The cycle's
// processMediaUsage_ ticks that background citizen's EmergenceCount and nothing else (no ledger UsageCount, no
// citation, no media appearance). Own words only — the scanCitizenPages.js admission rule, reflections only:
// never tension lines, office walls, desk notes, NIGHTLY or keyed docs; never the operator's page (Mags).
const OWN_WORDS_SLOT_RE = /^(?:morning|midday|afternoon|evening|night|work|PRESS|CONVO|INTERVIEW|DISCORD)$/;
const OPERATOR_POPIDS = new Set(['POP-00005']);
const FAMILY_USAGE_TYPE = 'family-own-words';
function isOwnWords_(popId, meta, slot) {
  return meta.type === 'reflection' && OWN_WORDS_SLOT_RE.test(slot) && !OPERATOR_POPIDS.has(String(popId).toUpperCase());
}
// A linked member is named by full name, or by first name as a whole capitalised word (case-sensitive: "Will"
// the son, not "will"; a sentence-initial common word that is also the name still reads as the name).
function namesMember_(text, m) {
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, (ch) => '\\' + ch);
  const word = (s, flags) => new RegExp('(?<![\\p{L}\\p{N}])' + esc(s) + '(?![\\p{L}\\p{N}])', flags);
  return word(m.first + ' ' + m.last, 'iu').test(text) || word(m.first, 'u').test(text);
}
async function recordFamilyMentions_(popId, text, customId, cycle) {
  const pop = String(popId).toUpperCase();
  const gc = await sheets.getRawSheetData('Generic_Citizens');
  const gh = gc[0] || [];
  const gF = gh.indexOf('First'), gL = gh.indexOf('Last'), gS = gh.indexOf('Status'), gOf = gh.indexOf('FamilyOf'), gR = gh.indexOf('FamilyRole');
  if (gF < 0 || gL < 0 || gS < 0 || gOf < 0 || gR < 0) return 0; // no link columns yet — nothing is linked
  const members = gc.slice(1)
    .filter((r) => String(r[gS] || '').trim().toLowerCase() === 'family' && String(r[gOf] || '').trim().toUpperCase() === pop && String(r[gR] || '').trim())
    .map((r) => ({ first: String(r[gF] || '').trim(), last: String(r[gL] || '').trim() }))
    .filter((m) => m.first && m.last && namesMember_(text, m));
  if (!members.length) return 0;
  const us = await sheets.getRawSheetData('Citizen_Media_Usage');
  const h = us[0] || [];
  const iN = h.indexOf('CitizenName') >= 0 ? h.indexOf('CitizenName') : h.indexOf('Name'), iT = h.indexOf('UsageType'), iC = h.indexOf('Context');
  if (iN < 0 || iT < 0 || iC < 0) return 0;
  const rows = [];
  for (const m of members) {
    const full = m.first + ' ' + m.last;
    const dup = us.slice(1).some((r) => String(r[iN] || '').trim() === full && String(r[iT] || '').trim() === FAMILY_USAGE_TYPE && String(r[iC] || '').trim() === customId);
    if (dup) continue; // a retried wake ticks nobody twice
    rows.push(h.map((col) => {
      switch (String(col).trim()) {
        case 'Timestamp': return 'C' + cycle; // sim clock, never Gregorian
        case 'Cycle': return String(cycle);
        case 'CitizenName': case 'Name': return full;
        case 'UsageType': return FAMILY_USAGE_TYPE;
        case 'Context': return customId;
        default: return '';
      }
    }));
  }
  if (rows.length) await sheets.appendRows('Citizen_Media_Usage', rows);
  return rows.length;
}

async function appendReflection_(popId, text, opts) {
  const o = opts || {};
  let tag;
  try { tag = pageTagFor(popId); } catch (e) { return { error: e.message }; }
  if (o.day != null && !PAGE_DAYS.includes(o.day)) return { error: 'citizenPage: invalid day ' + JSON.stringify(o.day) + ' (sun..sat)', tag };
  const customId = (o.cycle != null)
    ? `${tag}-c${o.cycle}-${o.daypart || 'wake'}${o.day ? '-' + o.day : ''}${o.key ? '-' + o.key : ''}` // o.key: extra docs same wake (e.g. tension lines) must not collide with the reflection doc
    : undefined; // no stable wake key -> non-idempotent write (caller should pass cycle)
  // Supermemory metadata takes string|number|boolean only — a null (a rate-limited classifier returns
  // event/affect null) is a 400 that drops the whole reflection. Absent keys, never nulls.
  const meta = {
    type: 'reflection',
    popId: String(popId).toUpperCase(),
    cycle: o.cycle,
    daypart: o.daypart,
    terminal: TERMINAL,
    ...(o.extra || {}),
  };
  for (const k of Object.keys(meta)) if (meta[k] == null) delete meta[k];
  const body = {
    content: String(text || ''),
    containerTags: [PARENT_TAG, tag],
    metadata: meta,
  };
  if (customId) body.customId = customId;
  try {
    const r = await fetch(API + '/v3/documents', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok || j.error) {
      // Supermemory returns validation failures as an array of objects — String() of that is "[object Object]".
      const why = j.error ? (typeof j.error === 'string' ? j.error : JSON.stringify(j.error)) : r.status;
      return { error: '[err] ' + why, tag, customId };
    }
    const out = { id: j.id || j.documentId || null, tag, customId };
    // engine.304 D10: only after the page landed, only own words, only with a stable id to dedupe on. A failure here
    // never fails the page write — it is logged on the result.
    if (customId && isOwnWords_(popId, meta, `${o.daypart || 'wake'}${o.key ? '-' + o.key : ''}`)) {
      try { out.familyMentions = await recordFamilyMentions_(popId, String(text || ''), customId, o.cycle); }
      catch (eF) { // a missed tick is a mention that did not land — said once, in the cron log, never retried
        out.familyMentionsError = eF.message;
        console.error(`[citizenPage] engine.304: family usage not recorded for ${String(popId).toUpperCase()} (${customId}): ${eF.message}`);
      }
    }
    return out;
  } catch (e) {
    return { error: '[err] ' + e.message, tag, customId };
  }
}

// engine.197 M1 — scrubPageResult_(popId, r) -> r | scrubbed copy | null. Mags's journal
// (discord-reflection.js, daypart NIGHTLY, POP-00005 only) is composed from builder-side
// conversations; every citizen-side reader gets it scrubbed. On her page only: a NIGHTLY doc, or a doc
// with no daypart (fail-safe), is scrubbed. Every other doc — any other citizen's, any other daypart —
// returns untouched (same object). Every text carrier a reader uses is scrubbed: content, chunk,
// chunks[].content. Empty after scrub -> null.
const NIGHTLY_PAGE_POP = 'POP-00005';
function scrubPageResult_(popId, r) {
  if (!r) return r;
  if (String(popId).toUpperCase() !== NIGHTLY_PAGE_POP) return r;
  const dp = r.metadata && r.metadata.daypart;
  if (dp && dp !== 'NIGHTLY') return r;
  const out = { ...r };
  if (typeof out.content === 'string') out.content = memoryFence.scrubNightly(out.content);
  if (typeof out.chunk === 'string') out.chunk = memoryFence.scrubNightly(out.chunk);
  if (Array.isArray(out.chunks)) out.chunks = out.chunks.map((c) => ((c && typeof c.content === 'string') ? { ...c, content: memoryFence.scrubNightly(c.content) } : c));
  const texts = [out.content, out.chunk, ...(Array.isArray(out.chunks) ? out.chunks.map((c) => c && c.content) : [])];
  return texts.some((t) => typeof t === 'string' && t.trim()) ? out : null;
}

// readPage_(popId, query, limit, opts) -> { results } | { error }. opts.raw: skip the M1 scrub.
//   Returns ONLY that citizen's page (v4 search scoped to their tag). Raw prose — the consumer fences.
async function readPage_(popId, query, limit, opts) {
  let tag;
  try { tag = pageTagFor(popId); } catch (e) { return { error: e.message }; }
  const body = { q: String(query || ''), containerTag: tag, limit: limit || 10, searchMode: 'hybrid' };
  try {
    const r = await fetch(API + '/v4/search', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok || j.error) return { error: '[err] ' + (j.error || r.status), tag };
    const raw = !!(opts && opts.raw);
    return { results: (j.results || []).map((x) => (raw ? x : scrubPageResult_(popId, x))).filter(Boolean), tag };
  } catch (e) {
    return { error: '[err] ' + e.message, tag };
  }
}

// recentPage_(popId, limit, opts) -> { results: [{content, createdAt, customId, metadata}] } | { error }
//   RECENCY retrieval (NOT relevance). Lists the citizen's docs by containerTag, takes the most
//   recent `limit`, fetches RAW first-person content per doc via GET /v3/documents/{id}.
//   Why not readPage_ (v4 search): v4 hybrid search silently MISSES docs — it returns 0 for a
//   citizen who provably has a page (verified S272 — `cp-POP-00004`'s doc is returned by
//   /v3/documents/list but EVERY v4 query, incl. the exact content + name, returns total=0). For
//   "my recent reflections" the read must be recency + reliable, which list→get gives; relevance
//   search is the wrong tool and (as personaProvider's fail-open recall shows) was silently dead.
//   /v3/documents/list returns the auto-SUMMARY not raw content, so the per-id GET is required.
//   WAKE-SIDE ONLY (I/O, non-reproducible) — same contract as readPage_. Consumer still fences.
async function recentPage_(popId, limit, opts) {
  let tag;
  try { tag = pageTagFor(popId); } catch (e) { return { error: e.message }; }
  const n = Math.max(limit || 3, 1);
  const auth = { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' };
  try {
    const lr = await fetch(API + '/v3/documents/list', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ containerTags: [tag], limit: n * 3 }),
    });
    const lj = await lr.json();
    if (!lr.ok || lj.error) return { error: '[err] ' + (typeof lj.error === 'object' ? JSON.stringify(lj.error) : (lj.error || lr.status)), tag };
    const mems = (lj.memories || lj.documents || [])
      .filter((m) => m && m.id)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))) // newest first
      .slice(0, n);
    const results = [];
    for (const m of mems) {
      try {
        const gr = await fetch(API + '/v3/documents/' + m.id, { method: 'GET', headers: auth });
        const gj = await gr.json();
        const content = (gj && typeof gj.content === 'string') ? gj.content : '';
        // metadata rides along (affect/event tags, seams Task 2) — resonanceRecall's affectWeight input
        const doc = { content, createdAt: m.createdAt, customId: m.customId, metadata: (gj && gj.metadata) || m.metadata || null };
        const kept = (opts && opts.raw) ? doc : scrubPageResult_(popId, doc); // engine.197 M1
        if (kept && kept.content.trim()) results.push(kept);
      } catch (e) { /* a single failed doc-fetch drops that reflection, not the whole read */ }
    }
    return { results, tag };
  } catch (e) {
    return { error: '[err] ' + e.message, tag };
  }
}

// ensurePagePointer_(popId) -> { tag, row, created } | { error }
//   Denormalizes the page tag into col AW (SMPageId) so "which citizens have a page" is queryable
//   from the ledger without hitting Supermemory. Deterministic POPID->row scan (NOT semantic).
//   Idempotent: writes AW only when blank. Explicit-A1 write + read-back verify (the third distinct
//   sheet-write shape this phase — grid-resize + col-index gotchas already bit us; verify the cell).
//   WAKE-SIDE ONLY — never call from the cycle path.
async function ensurePagePointer_(popId) {
  let tag;
  try { tag = pageTagFor(popId); } catch (e) { return { error: e.message }; }
  const rows = await sheets.getRawSheetData(LEDGER);
  const header = rows[0];
  const iPop = header.findIndex((x) => String(x).toLowerCase() === 'popid');
  const iSM = header.findIndex((x) => String(x) === SM_COL_HEADER);
  if (iPop < 0) return { error: 'POPID column not found' };
  if (iSM < 0) return { error: SM_COL_HEADER + ' column not found (run the AW schema add first)' };
  const want = String(popId).toUpperCase();
  let rowIdx = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][iPop]).toUpperCase() === want) { rowIdx = i; break; }
  }
  if (rowIdx < 0) return { error: 'POPID not in ledger: ' + want };
  const sheetRow = rowIdx + 1; // 1-based
  const existing = rows[rowIdx][iSM];
  if (existing) return { tag: existing, row: sheetRow, created: false }; // already pointed
  const a1 = `${LEDGER}!${colLetter_(iSM)}${sheetRow}`;
  await sheets.updateRange(a1, [[tag]]);
  const back = await sheets.getRawSheetData(LEDGER);
  if (String(back[rowIdx][iSM]) !== tag) return { error: 'write verify failed at ' + a1 };
  return { tag, row: sheetRow, created: true };
}

module.exports = {
  PARENT_TAG,
  pageTagFor,
  colLetter_, // exported for the offline column-math lock (col-index gotcha history)
  PAGE_DAYS,
  pageDayOf, // pipeline.94 — the weekday a wake keys its page by
  appendReflection_,
  readPage_,
  recentPage_,
  scrubPageResult_, // engine.197 M1 — exported for the offline scrub-scope lock
  ensurePagePointer_,
};
