/* resonanceRecall — B4 v1 memory selection for the citizen wake (S281 seams plan, Design B4 / Task 2).
 *
 * The wake's own-page read-back stops being recency-blind: candidates (recent page reflections +
 * latest milestone; B2 tensions + B3 unlived join via Task 4) are scored
 *
 *   score = W.context * contextMatch + W.staleness * staleness + W.affect * affectWeight
 *
 * - contextMatch : plain token overlap between the memory and today's perception slices (hood
 *                  texture, sports slice, bond names, wake frame). Deliberately no embeddings —
 *                  cheap, deterministic, debuggable. v2 question only if v1 reads flat.
 * - staleness    : cycles since this memory last fed a prompt (bookkeeping below). Not-recently-
 *                  recalled scores higher — stops the same reflections looping forever.
 * - affectWeight : |affect-tag delta| magnitude at write time (doc metadata.affect via DIAL_MAP);
 *                  docs without one (all pre-Task-2 docs, milestones, tensions) get a flat mid.
 *
 * Tiebreak is seeded-deterministic per (popId, cycle, wake, memKey) — same discipline as
 * selectProvocation. Recall bookkeeping: logs/citizen-recall-state.json
 * ({ popId: { memKey: lastRecalledCycle } }) — written by markRecalled, which the wake calls
 * only on non-dry runs (dry-run writes NOTHING, including state).
 *
 * Loop-side only: no engine change, no schema change, no dial writes, no sheet writes.
 */
const fs = require('fs');
const path = require('path');
const dialMap = require('/root/GodWorld/utilities/citizenDialMap');
const { _hash53 } = require('/root/GodWorld/lib/provocationBank');

const STATE_FILE = path.join(__dirname, '..', 'logs', 'citizen-recall-state.json');
const STALENESS_CAP = 12; // cycles at which "not recently recalled" saturates (matches B2 tension expiry window)
const W = { context: 0.4, staleness: 0.35, affect: 0.25 };
const AFFECT_NORM = 5;    // |Resentful| = 5 is the largest affect delta today; cap keeps the term 0..1

const STOP = new Set(['that', 'this', 'with', 'have', 'from', 'they', 'their', 'them', 'what', 'were',
  'been', 'like', 'just', 'about', 'when', 'your', 'youre', 'there', 'where', 'still', 'into', 'over',
  'some', 'something', 'today', 'lately', 'around', 'after', 'before', 'while', 'because', 'dont',
  'even', 'much', 'more', 'most', 'than', 'then', 'here', 'himself', 'herself', 'itself']);

function tokenize(s) {
  return String(s || '').toLowerCase().split(/[^a-z']+/)
    .map((t) => t.replace(/'/g, ''))
    .filter((t) => t.length >= 4 && !STOP.has(t));
}

// stable identity for a memory across wakes — first 200 chars is enough (truncation-stable vs the
// per-reflection render cap, content-addressed so re-fetched docs map to the same bookkeeping row).
function memKey(text) {
  return 'm' + _hash53(String(text || '').slice(0, 200), 0x5eed);
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return {}; }
}
function saveState(st) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2)); } catch (e) {}
}

function contextMatch(memTokens, ctxTokens) {
  if (!memTokens.size || !ctxTokens.size) return 0;
  let hits = 0;
  for (const t of memTokens) { if (ctxTokens.has(t)) hits++; }
  return Math.min(1, hits / 5); // 5 shared meaningful tokens = full match; plain and debuggable
}

function staleness(key, recalled, cycle) {
  if (cycle == null) return 1; // no cycle signal -> can't age; treat as fresh candidate
  const last = recalled && recalled[key];
  if (last == null) return 1;  // never fed a prompt -> max
  return Math.min(1, Math.max(0, (cycle - Number(last)) / STALENESS_CAP));
}

function affectWeight(meta) {
  const affect = meta && meta.affect;
  if (!affect) return 0.5; // flat mid: pre-Task-2 docs, milestones, tensions, unlived
  const fx = dialMap.nudgesForEvent_(String(affect), 1, '');
  const mag = Object.values(fx).reduce((s, v) => s + Math.abs(v), 0);
  return Math.min(1, mag / AFFECT_NORM);
}

/* selectMemories({ popId, cycle, wake, candidates, contextText, cap })
 *   candidates: [{ text, meta?, kind? }] — text is the render-ready string; meta.affect optional.
 *   -> { selected: [candidate], keys: [memKey] }  (selected in score order, capped)
 * Pure read: does NOT touch the state file's recalled marks — call markRecalled after a live wake. */
function selectMemories(opts) {
  const o = opts || {};
  const cands = (o.candidates || []).filter((c) => c && String(c.text || '').trim());
  if (!cands.length) return { selected: [], keys: [] };
  const ctxTokens = new Set(tokenize(o.contextText));
  const state = loadState();
  const recalled = state[String(o.popId || '').toUpperCase()] || {};
  const scored = cands.map((c) => {
    const key = memKey(c.text);
    const score = W.context * contextMatch(new Set(tokenize(c.text)), ctxTokens)
      + W.staleness * staleness(key, recalled, o.cycle)
      + W.affect * affectWeight(c.meta);
    const tie = _hash53(`${o.popId}|${o.cycle}|${o.wake}|${key}`, 0x5eed);
    return { c, key, score, tie };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.tie - b.tie));
  const top = scored.slice(0, Math.max(1, o.cap || 3));
  return { selected: top.map((s) => s.c), keys: top.map((s) => s.key) };
}

// Bookkeeping write — the staleness input. Live wakes only (caller gates on !DRY).
function markRecalled(popId, cycle, keys) {
  if (cycle == null || !keys || !keys.length) return;
  const st = loadState();
  const id = String(popId || '').toUpperCase();
  st[id] = st[id] || {};
  for (const k of keys) st[id][k] = cycle;
  saveState(st);
}

module.exports = { selectMemories, markRecalled, memKey, _internals: { tokenize, contextMatch, staleness, affectWeight, W, STALENESS_CAP } };
