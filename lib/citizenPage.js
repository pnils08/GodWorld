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
 */
require('/root/GodWorld/lib/env'); // SUPERMEMORY_CC_API_KEY
const sheets = require('/root/GodWorld/lib/sheets');

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

// appendReflection_(popId, text, {cycle, daypart, extra}) -> { id, tag, customId } | { error }
//   Writes one reflection doc to the citizen's page (Supermemory only — NO sheet I/O). Idempotent
//   per (popId, cycle, daypart) via customId, so a network-retried wake is a no-op, not a dup.
async function appendReflection_(popId, text, opts) {
  const o = opts || {};
  let tag;
  try { tag = pageTagFor(popId); } catch (e) { return { error: e.message }; }
  const customId = (o.cycle != null)
    ? `${tag}-c${o.cycle}-${o.daypart || 'wake'}`
    : undefined; // no stable wake key -> non-idempotent write (caller should pass cycle)
  const body = {
    content: String(text || ''),
    containerTags: [PARENT_TAG, tag],
    metadata: {
      type: 'reflection',
      popId: String(popId).toUpperCase(),
      cycle: o.cycle != null ? o.cycle : null,
      daypart: o.daypart || null,
      terminal: TERMINAL,
      ...(o.extra || {}),
    },
  };
  if (customId) body.customId = customId;
  try {
    const r = await fetch(API + '/v3/documents', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok || j.error) return { error: '[err] ' + (j.error || r.status), tag, customId };
    return { id: j.id || j.documentId || null, tag, customId };
  } catch (e) {
    return { error: '[err] ' + e.message, tag, customId };
  }
}

// readPage_(popId, query, limit) -> { results } | { error }
//   Returns ONLY that citizen's page (v4 search scoped to their tag). Raw prose — the consumer fences.
async function readPage_(popId, query, limit) {
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
    return { results: j.results || [], tag };
  } catch (e) {
    return { error: '[err] ' + e.message, tag };
  }
}

// recentPage_(popId, limit) -> { results: [{content, createdAt, customId}] } | { error }
//   RECENCY retrieval (NOT relevance). Lists the citizen's docs by containerTag, takes the most
//   recent `limit`, fetches RAW first-person content per doc via GET /v3/documents/{id}.
//   Why not readPage_ (v4 search): v4 hybrid search silently MISSES docs — it returns 0 for a
//   citizen who provably has a page (verified S272 — `cp-POP-00004`'s doc is returned by
//   /v3/documents/list but EVERY v4 query, incl. the exact content + name, returns total=0). For
//   "my recent reflections" the read must be recency + reliable, which list→get gives; relevance
//   search is the wrong tool and (as personaProvider's fail-open recall shows) was silently dead.
//   /v3/documents/list returns the auto-SUMMARY not raw content, so the per-id GET is required.
//   WAKE-SIDE ONLY (I/O, non-reproducible) — same contract as readPage_. Consumer still fences.
async function recentPage_(popId, limit) {
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
        if (content.trim()) results.push({ content, createdAt: m.createdAt, customId: m.customId });
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
  appendReflection_,
  readPage_,
  recentPage_,
  ensurePagePointer_,
};
