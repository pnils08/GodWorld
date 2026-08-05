#!/usr/bin/env node
/**
 * cron-saturday-run.js — pipeline.45 Phase 3: the Saturday run.
 * Plan: docs/plans/2026-08-04-newsroom-canon-flow.md §Phase 3 (one cron, six
 * steps, in order). This script is the spine; each step is a discrete,
 * separately-runnable stage.
 *
 *   1 audit    — EIC accuracy audit          [SEAT — blocked, see below]
 *   2 curate   — mechanical rank + Mags pick [SEAT — blocked, see below]
 *   3 narrate  — Mags writes the Pulse       [SEAT — blocked, see below]
 *   4 publish  — canon door (NotebookLM permanent notebook + canon ingest)
 *                [depends on 2+3 output — stub until seats land]
 *   5 sweep    — per-article Supermemory ingest (ALL staged, curated or not)
 *   6 sheets   — Citizen_Media_Usage rows from the INTAKE sidecar
 *
 * Steps 1–3 are the two editorial seats (media terminal owns them). Their
 * design is downstream of Mike's mags-as-narrator session
 * (docs/research/2026-08-04-mags-as-narrator.md, verdict `watch`, design
 * incomplete) — this spine ships with those steps as explicit seams that
 * exit loudly, not silently. Steps 5–6 are deterministic sidecar consumers
 * and are LIVE here.
 *
 * Consumer contracts (plan §Phase 1 spec detail):
 * - Sweep: one Supermemory document per article. customId
 *   `article-c<cycle>-<stem>` (engine.91 T1 scheme — Supermemory upserts on
 *   customId, re-runs are idempotent; the sessionSummaryToSupermemory.js
 *   precedent). containerTags: bay-tribune + journalist-<bylinePopid> +
 *   cycle-<N> + <desk>. Metadata (flat strings): byline, bylinePopid, desk,
 *   cycle, popids, hoods, storylines, status.
 * - Sheets: INTAKE names → usage rows. Bind (2026-08-05, engine-sheet) against
 *   EMERGENCE_USAGE_TYPES (phase05-citizens/processAdvancementIntake.js):
 *   subject → 'featured', mentioned → 'mentioned'. quoted-source rows are
 *   NEVER written here — citizenVoice --record already wrote that class at
 *   wake 2 (double-count guard). Header-mapped + dup-checked like
 *   recordBylineUsage; Timestamp is sim clock ('C<n>'), never Gregorian.
 *
 * Usage:
 *   node scripts/cron-saturday-run.js --step sweep  --cycle 102 [--apply]
 *   node scripts/cron-saturday-run.js --step sheets --cycle 102 [--apply]
 *   node scripts/cron-saturday-run.js --cycle 102 [--apply]   # all runnable steps
 *
 * DRY-RUN IS THE DEFAULT (engine.91 T2 convention): without --apply nothing
 * posts to Supermemory and nothing writes a sheet — the run prints what it
 * would do. Supermemory ingest + sheet writes are approval-gated operations;
 * the cron entry (not yet wired) will carry --apply once Mike greenlights.
 */

'use strict';

require('../lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const STAGED = path.join(ROOT, 'output', 'cron-compare', 'staged');
const CONTAINER_TAG = 'bay-tribune';
const API_HOST = 'api.supermemory.ai';
const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const APPLY = process.argv.includes('--apply');

// USAGE-TYPE BIND (see header): INTAKE role → Citizen_Media_Usage UsageType.
// quoted-source deliberately absent — wake-2 citizenVoice --record owns it.
const ROLE_TO_USAGE = { subject: 'featured', mentioned: 'mentioned' };

// ---------------------------------------------------------------------------
// Staged-set reader — every .staged.json for the cycle, with its article text.
// ---------------------------------------------------------------------------
function loadStagedSet(cycle) {
  const out = [];
  if (!fs.existsSync(STAGED)) return out;
  for (const f of fs.readdirSync(STAGED).sort()) {
    if (!f.endsWith('.staged.json')) continue;
    let side;
    try { side = JSON.parse(fs.readFileSync(path.join(STAGED, f), 'utf8')); } catch (_) { continue; }
    if (String(side.cycle) !== String(cycle)) continue;
    const artPath = path.join(ROOT, side.article || '');
    if (!fs.existsSync(artPath)) { console.log('[skip] sidecar without article: ' + f); continue; }
    out.push({
      stem: f.replace(/\.staged\.json$/, ''),
      sidecar: side,
      text: fs.readFileSync(artPath, 'utf8')
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Step 5 — Supermemory sweep (per-article, idempotent via customId upsert).
// ---------------------------------------------------------------------------
function articleCustomId(cycle, stem) { return 'article-c' + cycle + '-' + stem; }

function articleDoc(cycle, entry) {
  const s = entry.sidecar;
  const intake = s.intake || null;
  const tags = [CONTAINER_TAG];
  if (s.bylinePopid) tags.push('journalist-' + s.bylinePopid);
  tags.push('cycle-' + cycle);
  if (s.desk) tags.push(s.desk);
  const meta = {
    title: entry.stem,
    source: 'saturday-sweep',
    status: 'staged',
    cycle: String(cycle)
  };
  if (s.byline) meta.byline = s.byline;
  if (s.bylinePopid) meta.bylinePopid = s.bylinePopid;
  if (s.desk) meta.desk = s.desk;
  if (intake) {
    const pops = (intake.names || []).map(n => n.popid).filter(Boolean);
    if (pops.length) meta.popids = pops.join(',');
    if ((intake.hoods || []).length) meta.hoods = intake.hoods.join(',');
    if ((intake.storylines || []).length) meta.storylines = intake.storylines.map(x => x.slug).join(',');
  }
  return { customId: articleCustomId(cycle, entry.stem), containerTags: tags, metadata: meta, content: entry.text };
}

function postDocument(doc) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(doc);
    const req = https.request({
      hostname: API_HOST, path: '/v3/documents', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY,
        'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => (res.statusCode >= 200 && res.statusCode < 300)
        ? resolve({ status: res.statusCode })
        : reject(new Error('HTTP ' + res.statusCode + ': ' + data.slice(0, 200))));
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

async function stepSweep(cycle) {
  console.log('--- step 5: Supermemory sweep (per-article) ---');
  const set = loadStagedSet(cycle);
  if (!set.length) { console.log('no staged articles for c' + cycle); return { swept: 0 }; }
  if (!API_KEY && APPLY) throw new Error('SUPERMEMORY_CC_API_KEY missing');
  let swept = 0;
  for (const entry of set) {
    const doc = articleDoc(cycle, entry);
    if (!APPLY) {
      console.log('(dry-run) would upsert ' + doc.customId + ' tags=[' + doc.containerTags.join(', ') + ']' +
        ' meta.popids=' + (doc.metadata.popids || '-'));
      continue;
    }
    await postDocument(doc);
    console.log('upserted ' + doc.customId);
    swept++;
  }
  console.log((APPLY ? swept : set.length) + ' article(s) ' + (APPLY ? 'swept' : 'in dry-run scope'));
  return { swept };
}

// ---------------------------------------------------------------------------
// Step 6 — sheet ingest: usage rows from the sidecar intake.
// ---------------------------------------------------------------------------
function usageRowsFor(entry) {
  const intake = entry.sidecar.intake;
  if (!intake) return [];
  const rows = [];
  for (const n of (intake.names || [])) {
    const usageType = ROLE_TO_USAGE[n.role];
    if (!usageType) continue;             // quoted-source: wake-2 owns that class
    if (!n.popid) continue;               // unresolved/ambiguous — no fame credit on a guess
    rows.push({ name: n.name, popid: n.popid, usageType, context: entry.stem });
  }
  return rows;
}

async function stepSheets(cycle) {
  console.log('--- step 6: Citizen_Media_Usage ingest from INTAKE ---');
  const set = loadStagedSet(cycle);
  const wanted = set.flatMap(e => usageRowsFor(e));
  if (!wanted.length) { console.log('no INTAKE usage rows for c' + cycle); return { written: 0 }; }
  if (!APPLY) {
    for (const w of wanted) console.log('(dry-run) would append: ' + w.name + ' | ' + w.usageType + ' | ' + w.context);
    console.log(wanted.length + ' row(s) in dry-run scope');
    return { written: 0 };
  }
  const sheets = require(path.join(ROOT, 'lib', 'sheets'));
  const data = await sheets.getRawSheetData('Citizen_Media_Usage');
  const h = data[0] || [];
  const iN = h.indexOf('CitizenName'), iT = h.indexOf('UsageType'), iC = h.indexOf('Context');
  if (iN < 0 || iT < 0) throw new Error('Citizen_Media_Usage headers missing CitizenName/UsageType');
  const existing = new Set(data.slice(1).map(r =>
    [String(r[iN] || '').trim(), String(r[iT] || '').trim(), iC < 0 ? '' : String(r[iC] || '').trim()].join('|')));
  const rows = [];
  for (const w of wanted) {
    if (existing.has([w.name, w.usageType, w.context].join('|'))) { console.log('dup skip: ' + w.name + ' | ' + w.context); continue; }
    rows.push(h.map(col => {
      switch (String(col).trim()) {
        case 'Timestamp':   return 'C' + cycle;      // sim clock, never Gregorian
        case 'Cycle':       return String(cycle);
        case 'CitizenName': return w.name;
        case 'UsageType':   return w.usageType;
        case 'Context':     return w.context;
        case 'Reporter':    return entryByline(w.context);
        default:            return '';
      }
    }));
  }
  if (rows.length) await sheets.appendRows('Citizen_Media_Usage', rows);
  console.log(rows.length + ' row(s) appended (' + (wanted.length - rows.length) + ' dup-skipped)');
  return { written: rows.length };
}
function entryByline(stem) {
  try {
    const side = JSON.parse(fs.readFileSync(path.join(STAGED, stem + '.staged.json'), 'utf8'));
    return side.byline || '';
  } catch (_) { return ''; }
}

// ---------------------------------------------------------------------------
// Step 6b — storyline signal aggregation (Mike-direct 2026-08-05: "open the
// door to ingest storylines to ledgers to keep high-signal storylines open,
// but avoid pigeonholing"). Anti-pigeonhole contract: slugs are REPORTER-
// AUTHORED free-form kebab — never validated against a pre-approved list,
// never constrained by the tracker. The signal file follows the reporting;
// curation (step 2) ranks on it. The Storyline_Tracker WRITE is deliberately
// deferred: the live tab shows header drift (21-cell rows vs 26 headers,
// id-like values in the Timestamp column, checked 2026-08-05) — engine-owned
// tab, rule on the drift before writing rows into it.
// ---------------------------------------------------------------------------
function aggregateStorylineSignals(set) {
  const bySlug = {};
  for (const entry of set) {
    const intake = entry.sidecar.intake;
    if (!intake) continue;
    for (const s of (intake.storylines || [])) {
      const agg = bySlug[s.slug] || (bySlug[s.slug] = {
        slug: s.slug, advanced: 0, opened: 0, closed: 0, referenced: 0,
        articles: [], hoods: [], citizens: []
      });
      if (agg[s.verb] !== undefined) agg[s.verb]++;
      agg.articles.push(entry.stem);
      for (const h of (intake.hoods || [])) if (!agg.hoods.includes(h)) agg.hoods.push(h);
      for (const n of (intake.names || [])) if (n.popid && !agg.citizens.includes(n.popid)) agg.citizens.push(n.popid);
    }
  }
  // High-signal first: moves (advanced+opened+closed) beat passive references.
  return Object.values(bySlug).sort((a, b) =>
    (b.advanced + b.opened + b.closed) - (a.advanced + a.opened + a.closed) ||
    b.articles.length - a.articles.length);
}

function stepSignals(cycle) {
  console.log('--- step 6b: storyline signal aggregation ---');
  const signals = aggregateStorylineSignals(loadStagedSet(cycle));
  const outPath = path.join(ROOT, 'output', 'storyline_signal_c' + cycle + '.json');
  fs.writeFileSync(outPath, JSON.stringify({ cycle: String(cycle), signals }, null, 2));
  console.log(signals.length + ' storyline(s) → ' + path.relative(ROOT, outPath));
  for (const s of signals.slice(0, 8)) {
    console.log('  ' + s.slug + ': ' + s.advanced + ' advanced / ' + s.opened + ' opened / ' +
      s.closed + ' closed / ' + s.referenced + ' referenced (' + s.articles.length + ' article(s))');
  }
  return { signals: signals.length };
}

// ---------------------------------------------------------------------------
// Steps 1–4 — seams. Loud exits, not silent skips.
// ---------------------------------------------------------------------------
function seatBlocked(step) {
  console.log('--- step ' + step + ': NOT BUILT — editorial seat ---');
  console.log('Blocked on the mags-as-narrator design (docs/research/2026-08-04-mags-as-narrator.md,');
  console.log('verdict `watch`). Seats build after Mike\'s narrator session; the plan\'s Phase 3');
  console.log('steps 1-3 + the publish step that consumes their output land together.');
  return { blocked: true };
}

// ---------------------------------------------------------------------------
async function main() {
  const cycle = arg('--cycle', null);
  if (!cycle) throw new Error('--cycle <N> is required');
  const step = arg('--step', null);
  console.log('Saturday run — c' + cycle + (APPLY ? ' [APPLY]' : ' [dry-run]'));
  const dispatch = {
    audit: () => seatBlocked(1), curate: () => seatBlocked(2),
    narrate: () => seatBlocked(3), publish: () => seatBlocked(4),
    sweep: () => stepSweep(cycle), sheets: () => stepSheets(cycle),
    signals: () => stepSignals(cycle)
  };
  if (step) {
    if (!dispatch[step]) throw new Error('unknown --step "' + step + '" (want audit|curate|narrate|publish|sweep|sheets|signals)');
    await dispatch[step]();
  } else {
    await stepSweep(cycle);
    await stepSheets(cycle);
    stepSignals(cycle);
    seatBlocked('1-4 (skipped in all-step mode)');
  }
}

if (require.main === module) {
  main().catch(err => { console.error('[saturday] Fatal: ' + err.message); process.exit(1); });
}

module.exports = { loadStagedSet, articleCustomId, articleDoc, usageRowsFor, ROLE_TO_USAGE, aggregateStorylineSignals };
