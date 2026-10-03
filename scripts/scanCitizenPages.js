#!/usr/bin/env node
/**
 * scanCitizenPages.js — corpus grep over the citizen pages (Supermemory container `citizen-pages`).
 *
 * The citizens' own words are a searchable corpus (builder, 2026-10-02: "search the citizen wiki pages").
 * This lists EVERY page doc (POST /v3/documents/list, containerTags ['citizen-pages'], 200/page — 2,077
 * docs / 11 pages at C109), regex-matches the summary each doc carries, maps the doc's cp-POP tag to a
 * POPID and joins the ledger snapshot (Name, ClockMode, Tier, RoleType, Neighborhood). First use: the
 * engine.208 fandom seed overrides (data/fandom_seed_overrides.json).
 *
 * WHY list+summary, not v4 search: v4 hybrid search silently misses docs (lib/citizenPage.js recentPage_
 * header, S272) — fine for one citizen's recall, useless for coverage. The list endpoint returns the
 * auto-summary, which is enough for a corpus grep; add --raw to GET each matched doc's full content.
 *
 * READ-ONLY. Never writes to Supermemory. Wake-side/build-side only — never from the cycle path.
 *
 * Usage:
 *   node scripts/scanCitizenPages.js --pattern "A'?s|Oaks|season ticket" [--out output/x.json] [--raw] [--min-hits 2]
 *   node scripts/scanCitizenPages.js --pattern "evict|rent" --hood "West Oakland"
 * Prints a per-citizen table (strongest first) to stdout; --out writes the full per-doc JSON.
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const API = 'https://api.supermemory.ai';
const CONTAINER = 'citizen-pages';
const LEDGER = '/root/GodWorld/output/simulation_ledger_snapshot.jsonl';

function arg(name, dflt) { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : dflt; }
const flag = (name) => process.argv.includes('--' + name);
const pattern = arg('pattern', null);
if (!pattern) { console.error('usage: --pattern <regex> [--out file] [--raw] [--min-hits n] [--hood name]'); process.exit(2); }
const RE = new RegExp('\\b(' + pattern + ')\\b', 'i');
const RE_G = new RegExp(RE.source, 'gi');
const OUT = arg('out', null);
const MIN = Number(arg('min-hits', 1));
const HOOD = arg('hood', null);
const auth = { Authorization: 'Bearer ' + process.env.SUPERMEMORY_CC_API_KEY, 'Content-Type': 'application/json' };

async function listAll() {
  const all = [];
  for (let page = 1; page <= 100; page++) {
    const r = await fetch(API + '/v3/documents/list', { method: 'POST', headers: auth, body: JSON.stringify({ containerTags: [CONTAINER], limit: 200, page }) });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error('list: ' + JSON.stringify(j.error || r.status));
    const mems = j.memories || j.documents || [];
    all.push(...mems);
    const total = j.pagination && j.pagination.totalItems;
    if (mems.length < 200 || (total && all.length >= total)) return all;
  }
  return all;
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

(async () => {
  const docs = await listAll();
  const ledger = loadLedger();
  const perDoc = []; const perCitizen = {};
  for (const m of docs) {
    const tags = m.containerTags || m.container_tags || [];
    const cp = tags.find((t) => /^cp-POP-\d{5}$/.test(t)) || (String(m.customId || '').match(/cp-POP-\d{5}/) || [])[0];
    const popId = cp ? cp.replace(/^cp-/, '') : null;
    let text = (typeof m.content === 'string' && m.content) || m.summary || '';
    if (!text || !RE.test(text)) continue;
    if (flag('raw')) {
      try { const gr = await fetch(API + '/v3/documents/' + m.id, { headers: auth }); const gj = await gr.json(); if (gj && gj.content) text = gj.content; } catch (e) {}
    }
    const hits = [...text.matchAll(RE_G)].map((x) => x[0].toLowerCase());
    const row = ledger[popId] || {};
    if (HOOD && String(row.Neighborhood || '') !== HOOD) continue;
    perDoc.push({ popId, customId: m.customId || null, docId: m.id, createdAt: m.createdAt, hits, excerpt: text.replace(/\s+/g, ' ').slice(0, 400) });
    const c = perCitizen[popId] || (perCitizen[popId] = { popId, name: row.Name || '?', clock: row.ClockMode || '?', tier: row.Tier || '?', role: String(row.RoleType || '').replace(/\s+/g, ' ').slice(0, 40), hood: row.Neighborhood || '?', docs: 0, hits: {}, total: 0 });
    c.docs++;
    for (const h of hits) { c.hits[h] = (c.hits[h] || 0) + 1; c.total++; }
  }
  const table = Object.values(perCitizen).filter((c) => c.total >= MIN).sort((a, b) => b.total - a.total);
  console.log(`docs listed ${docs.length} | matching docs ${perDoc.length} | citizens ${table.length} (min-hits ${MIN})`);
  console.log('POPID | Name | Clock | Tier | Role | Hood | docs | hits');
  for (const c of table) console.log([c.popId, c.name, c.clock, c.tier, c.role, c.hood, c.docs, JSON.stringify(c.hits)].join(' | '));
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify({ pattern, container: CONTAINER, listed: docs.length, citizens: table, docs: perDoc }, null, 2)); console.error('->', OUT); }
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
