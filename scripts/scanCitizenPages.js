#!/usr/bin/env node
/**
 * scanCitizenPages.js — the citizens' own pages (Supermemory container `citizen-pages`) as a
 * local, deterministic corpus for the newsroom (pipeline.70) and for build-side greps.
 *
 * Two modes:
 *   --dump      mirror the admitted page docs to output/citizen_pages/index.jsonl (+ meta.json).
 *               Incremental and resumable: lists every doc (POST /v3/documents/list, 200/page),
 *               GETs the full content only for docs not already in the index, appends as they land.
 *               Every newsroom reader (street page-line evidence, Celeste's pulse, the letters pool,
 *               Rhea) reads THIS FILE, never Supermemory — one network read, many offline readers,
 *               the same shape as dumpBeatTabs.js → output/beats/.
 *   --pattern   corpus grep (the original use: engine.208 fandom seed overrides, 2026-10-02).
 *               Reads the index when it exists, else the list summaries.
 *
 * ADMISSION (the office/journal/slot/type classes are decided HERE, once, and every reader inherits it;
 * the cycle cap is dropped when no live cycle is on disk (meta.liveCycle null) and real-world dates in page
 * TEXT are not a dump concern — both consumers re-filter: cycle window + content leak guard):
 *   - customId `cp-POP-xxxxx-c<N>-<slot>` (every doc is Cycle-addressable)
 *   - metadata.type `reflection` or `tension` — never `office-position` (civic office statements,
 *     CIVIC-cascade-STMT-* / CIVIC-datawake-*, ~425 docs; they have their own record)
 *   - slot in the wake allowlist: morning|midday|afternoon|evening|night|work|PRESS|CONVO|INTERVIEW|
 *     DISCORD, each with an optional -tension / -tension-resolved tail. Rejected by default: NIGHTLY-*
 *     (the editor's desk journal, not a citizen's page), deskwork-*, SIFT, backfills, anything new.
 *   - cycle <= the live cycle (lib/getCurrentCycle) — C119/C126 docs are bench-run artefacts
 *   - non-empty content
 *   The rule is written into meta.json so an outside check can recompute it.
 *
 * WHY list+GET, not v4 search: v4 hybrid search silently misses docs (lib/citizenPage.js
 * recentPage_ header, S272) — fine for one citizen's recall, useless for coverage.
 *
 * READ-ONLY against Supermemory. Wake-side/build-side only — never from the cycle path.
 *
 * Usage:
 *   node scripts/scanCitizenPages.js --dump [--quiet] [--concurrency 2] [--pace-ms 250]
 *   node scripts/scanCitizenPages.js --pattern "A'?s|Oaks|season ticket" [--out output/x.json] [--min-hits 2] [--hood name]
 */
'use strict';
require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');

const ROOT = '/root/GodWorld';
const API = 'https://api.supermemory.ai';
const CONTAINER = 'citizen-pages';
const LEDGER = path.join(ROOT, 'output', 'simulation_ledger_snapshot.jsonl');
const INDEX_DIR = path.join(ROOT, 'output', 'citizen_pages');
const INDEX_PATH = path.join(INDEX_DIR, 'index.jsonl');
const META_PATH = path.join(INDEX_DIR, 'meta.json');

const ID_RE = /^cp-(POP-\d{5})-c(\d+)-(.+)$/;
const SLOT_RE = /^(?:morning|midday|afternoon|evening|night|work|PRESS|CONVO|INTERVIEW|DISCORD)(?:-tension(?:-resolved)?)?$/;
const TYPES = new Set(['reflection', 'tension']);
const RULE = 'customId cp-POP-xxxxx-c<N>-<slot>; metadata.type in {reflection,tension}; slot matches ' +
  SLOT_RE.source + '; cycle <= live cycle; non-empty content';

function arg(name, dflt) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : dflt; }
const flag = (name) => process.argv.includes('--' + name);
function auth() {
  return { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' };
}

/** admit(listRow, liveCycle) -> { popId, cycle, slot, type } | { reject: 'id'|'type'|'slot'|'cycle' } */
function admit(m, liveCycle) {
  const mm = ID_RE.exec(String(m.customId || ''));
  if (!mm) return { reject: 'id' };
  const type = String(m.metadata && m.metadata.type || '');
  if (!TYPES.has(type)) return { reject: 'type' };
  if (!SLOT_RE.test(mm[3])) return { reject: 'slot' };
  const cycle = Number(mm[2]);
  if (liveCycle != null && cycle > liveCycle) return { reject: 'cycle' };
  return { popId: mm[1], cycle, slot: mm[3], type };
}

async function listAll() {
  const all = [];
  for (let page = 1; page <= 200; page++) {
    const r = await fetch(API + '/v3/documents/list', {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ containerTags: [CONTAINER], limit: 200, page })
    });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error('list: ' + JSON.stringify(j.error || r.status));
    const mems = j.memories || j.documents || [];
    all.push(...mems);
    const total = j.pagination && j.pagination.totalItems;
    if (mems.length < 200 || (total && all.length >= total)) return all;
  }
  return all;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// The key is rate-limited ("API key rate limit exceeded" — first full dump 2026-10-03 lost 1,064 of
// 1,558 GETs at concurrency 4). Back off and retry; a doc that still fails stays unfetched and the
// next --dump picks it up (resumable by docId).
async function getContent(id) {
  let wait = 1500;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const r = await fetch(API + '/v3/documents/' + id, { headers: auth() });
    const j = await r.json().catch(() => ({}));
    if (r.ok && !j.error) return { content: typeof j.content === 'string' ? j.content : '', metadata: j.metadata || null };
    const msg = JSON.stringify(j.error || r.status);
    if (r.status === 429 || /rate limit/i.test(msg)) { await sleep(wait); wait = Math.min(wait * 2, 20000); continue; }
    const err = new Error('get ' + id + ': ' + msg); err.status = r.status; throw err;
  }
  const err = new Error('get ' + id + ': rate limited after 6 tries'); err.status = 429; throw err;
}

function liveCycle() {
  try { return require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ soft: true, noArgv: true }); } catch (e) { return null; }
}

/** Some pages were stored with the wake's raw wrapper around them (a ```json block, an {"answer":"quote","quote":"…"} object, a leading "--- "). The citizen's words are inside; take those. */
function citizenText(text) {
  let t = String(text || '');
  const q = t.match(/"quote"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (q) t = q[1].replace(/\\"/g, '"').replace(/\\n/g, ' ');
  t = t.replace(/```(?:json)?/g, ' ').replace(/^\s*(?:---\s*)+/, '').replace(/\s*---\s*$/, '');
  t = t.replace(/\bTENSION(?:-RESOLVED)?\[c\d+\]:\s*/g, '');
  return t;
}

/** loadIndex(root?) -> rows (newest first). Missing index -> []. Never throws on a bad line. */
function loadIndex(root) {
  const p = root ? path.join(root, 'output', 'citizen_pages', 'index.jsonl') : INDEX_PATH;
  if (!fs.existsSync(p)) return [];
  const rows = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch (e) { /* a torn line is skipped, not fatal */ }
  }
  rows.sort((a, b) => (b.cycle - a.cycle) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return rows;
}
function loadMeta(root) {
  const p = root ? path.join(root, 'output', 'citizen_pages', 'meta.json') : META_PATH;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function loadLedger() {
  const m = {};
  if (!fs.existsSync(LEDGER)) return m;
  for (const line of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); m[r.POPID] = r; } catch (e) {}
  }
  return m;
}

async function dumpIndex({ quiet = false, concurrency = 2, paceMs = 250 } = {}) {
  const log = (s) => { if (!quiet) console.error('scanCitizenPages: ' + s); };
  const live = liveCycle();
  if (live == null) log('WARNING no live cycle on disk (world_summary) — no bench-cycle cap this run');
  const docs = await listAll();
  const existing = new Map(loadIndex().map(r => [r.docId, r]));
  const excluded = { id: 0, type: 0, slot: 0, cycle: 0, empty: 0 };
  const admitted = [];
  for (const m of docs) {
    const a = admit(m, live);
    if (a.reject) { excluded[a.reject]++; continue; }
    admitted.push({ m, a });
  }
  const todo = admitted.filter(x => !existing.has(x.m.id));
  log(`listed ${docs.length} · admitted ${admitted.length} · already indexed ${admitted.length - todo.length} · to fetch ${todo.length} · live C${live}`);
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  let fetched = 0, failed = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const { m, a } = todo[cursor++];
      try {
        const g = await getContent(m.id);
        const content = g.content.replace(/\r/g, '').trim();
        if (!content) { excluded.empty++; continue; }
        const md = Object.assign({}, m.metadata || {}, g.metadata || {});
        const row = {
          docId: m.id, customId: m.customId, popId: a.popId, cycle: a.cycle, slot: a.slot, type: a.type,
          daypart: md.daypart || null, affect: md.affect || null, event: md.event || null,
          createdAt: m.createdAt || null, content
        };
        fs.appendFileSync(INDEX_PATH, JSON.stringify(row) + '\n');
        fetched++;
        if (paceMs) await sleep(paceMs);
        if (!quiet && fetched % 100 === 0) log(`fetched ${fetched}/${todo.length}`);
      } catch (e) {
        // Classified before it counts (governance.49): the HTTP status rides on the error, so a 404
        // (doc gone upstream) reads differently from a 429/5xx (retry next --dump) in the log.
        failed++; log('skip ' + (m.customId || m.id) + ' [status ' + (e.status || 'n/a') + ']: ' + e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  // Rows whose doc left the container (deleted upstream) stay — the index is append-only by design;
  // meta names the live-listed admitted count so a reader can tell.
  const rows = loadIndex();
  const byCycle = {};
  for (const r of rows) byCycle[r.cycle] = (byCycle[r.cycle] || 0) + 1;
  const meta = {
    source: CONTAINER, generatedAt: new Date().toISOString(), generatedBy: 'scripts/scanCitizenPages.js --dump',
    liveCycle: live, listed: docs.length, admitted: admitted.length, excluded, fetchedThisRun: fetched, failedThisRun: failed,
    rows: rows.length, citizens: new Set(rows.map(r => r.popId)).size, byCycle, rule: RULE
  };
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  log(`index ${rows.length} rows / ${meta.citizens} citizens → ${path.relative(ROOT, INDEX_PATH)} (fetched ${fetched}, failed ${failed})`);
  return meta;
}

async function grep() {
  const pattern = arg('pattern', null);
  const RE = new RegExp('\\b(' + pattern + ')\\b', 'i');
  const RE_G = new RegExp(RE.source, 'gi');
  const OUT = arg('out', null);
  const MIN = Number(arg('min-hits', 1));
  const HOOD = arg('hood', null);
  let docs = loadIndex().map(r => ({ popId: r.popId, customId: r.customId, docId: r.docId, createdAt: r.createdAt, text: r.content }));
  let via = 'index';
  if (!docs.length) {
    via = 'list summaries';
    docs = (await listAll()).map(m => {
      const a = admit(m, null);
      return { popId: a.popId || null, customId: m.customId || null, docId: m.id, createdAt: m.createdAt,
        text: (typeof m.content === 'string' && m.content) || m.summary || '' };
    });
  }
  const ledger = loadLedger();
  const perDoc = []; const perCitizen = {};
  for (const d of docs) {
    if (!d.text || !RE.test(d.text)) continue;
    const hits = [...d.text.matchAll(RE_G)].map((x) => x[0].toLowerCase());
    const row = ledger[d.popId] || {};
    if (HOOD && String(row.Neighborhood || '') !== HOOD) continue;
    perDoc.push({ popId: d.popId, customId: d.customId, docId: d.docId, createdAt: d.createdAt, hits, excerpt: d.text.replace(/\s+/g, ' ').slice(0, 400) });
    const c = perCitizen[d.popId] || (perCitizen[d.popId] = { popId: d.popId, name: row.Name || '?', clock: row.ClockMode || '?', tier: row.Tier || '?', role: String(row.RoleType || '').replace(/\s+/g, ' ').slice(0, 40), hood: row.Neighborhood || '?', docs: 0, hits: {}, total: 0 });
    c.docs++;
    for (const h of hits) { c.hits[h] = (c.hits[h] || 0) + 1; c.total++; }
  }
  const table = Object.values(perCitizen).filter((c) => c.total >= MIN).sort((a, b) => b.total - a.total);
  console.log(`docs scanned ${docs.length} (${via}) | matching docs ${perDoc.length} | citizens ${table.length} (min-hits ${MIN})`);
  console.log('POPID | Name | Clock | Tier | Role | Hood | docs | hits');
  for (const c of table) console.log([c.popId, c.name, c.clock, c.tier, c.role, c.hood, c.docs, JSON.stringify(c.hits)].join(' | '));
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify({ pattern, container: CONTAINER, via, scanned: docs.length, citizens: table, docs: perDoc }, null, 2)); console.error('->', OUT); }
}

module.exports = { INDEX_DIR, INDEX_PATH, META_PATH, SLOT_RE, TYPES, RULE, admit, loadIndex, loadMeta, dumpIndex, listAll, citizenText };

if (require.main === module) {
  (async () => {
    if (flag('dump')) {
      const meta = await dumpIndex({ quiet: flag('quiet'), concurrency: Number(arg('concurrency', 2)), paceMs: Number(arg('pace-ms', 250)) });
      // governance.49: a counted failure gates the exit code. The index is still valid and resumable;
      // the caller learns that this run did not land everything (the next --dump picks it up).
      const failed = meta.failedThisRun;
      if (failed > 0) { console.error('scanCitizenPages: ' + failed + ' doc(s) failed to fetch — rerun --dump'); process.exit(1); }
      return;
    }
    if (arg('pattern', null)) { await grep(); return; }
    console.error('usage: --dump [--quiet] [--concurrency n] | --pattern <regex> [--out file] [--min-hits n] [--hood name]');
    process.exit(2);
  })().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
}
