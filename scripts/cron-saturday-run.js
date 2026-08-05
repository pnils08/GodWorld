#!/usr/bin/env node
/**
 * cron-saturday-run.js — pipeline.45 Phase 3: the Saturday run.
 * Plan: docs/plans/2026-08-04-newsroom-canon-flow.md §Phase 3 (one cron, six
 * steps, in order). This script is the spine; each step is a discrete,
 * separately-runnable stage.
 *
 *   1 audit    — EIC accuracy audit → eic_scorecard_c{N}.{json,md} (the %-to-90
 *                answer; graduation window per plan §Phase 4). LLM: gemini-flash
 *                + deterministic INTAKE-name ledger re-check (hard fail class).
 *   2 curate   — mechanical rank (storyline moves + audit verdict), storyline
 *                dedup, top ~9 → edition_curation_c{N}.json. Canon-violations
 *                never publish.
 *   3 narrate  — Mags narrates the Pulse from the curated set (Sonnet, the one
 *                voice-critical call) → cycle_pulse_c{N}.md
 *   4 publish  — canon door: assemble editions/cycle_pulse_c{N}.txt; --apply
 *                runs ingestEdition + permanent-NotebookLM source add
 *   5 sweep    — per-article Supermemory ingest (ALL staged, curated or not)
 *   6 sheets   — Citizen_Media_Usage rows from the INTAKE sidecar
 *
 * Seats built 2026-08-05 (narrator design adopted — docs/research/
 * 2026-08-04-mags-as-narrator.md). Steps 1-3 write local artifacts only and
 * run without --apply; steps 4-6's external writes stay --apply-gated.
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
// Step 6b — storyline signal aggregation + Storyline_Ledger upsert
// (Mike-direct 2026-08-05: "open the door to ingest storylines to ledgers to
// keep high-signal storylines open, but avoid pigeonholing"; the OLD
// Storyline_Tracker is DISCONTINUED — this replaces it, slim by design).
//
// Anti-pigeonhole contract: slugs are REPORTER-AUTHORED free-form kebab —
// never validated against a pre-approved list. The ledger follows the
// reporting: any advanced/opened signal (re)opens a thread, a closed verb
// with no same-week advance closes it, a bare reference never flips status.
// Dormancy is DERIVED by readers from LastCycle age — deliberately not a
// stored column, so the tab cannot rot the way the old tracker did
// (IsStale/CoverageGap et al. were stored-derived and drifted).
// ---------------------------------------------------------------------------
const STORYLINE_LEDGER_TAB = 'Storyline_Ledger';
const STORYLINE_LEDGER_HEADERS = ['StorylineId', 'FirstCycle', 'LastCycle', 'Status',
  'Advanced', 'Opened', 'Closed', 'Referenced', 'Articles', 'Citizens', 'Hoods', 'Desks'];
const LEDGER_LIST_CAP = 15;

function aggregateStorylineSignals(set) {
  const bySlug = {};
  for (const entry of set) {
    const intake = entry.sidecar.intake;
    if (!intake) continue;
    for (const s of (intake.storylines || [])) {
      const agg = bySlug[s.slug] || (bySlug[s.slug] = {
        slug: s.slug, advanced: 0, opened: 0, closed: 0, referenced: 0,
        articles: [], hoods: [], citizens: [], desks: []
      });
      if (agg[s.verb] !== undefined) agg[s.verb]++;
      agg.articles.push(entry.stem);
      for (const h of (intake.hoods || [])) if (!agg.hoods.includes(h)) agg.hoods.push(h);
      for (const n of (intake.names || [])) if (n.popid && !agg.citizens.includes(n.popid)) agg.citizens.push(n.popid);
      const desk = entry.sidecar.desk;
      if (desk && !agg.desks.includes(desk)) agg.desks.push(desk);
    }
  }
  // High-signal first: moves (advanced+opened+closed) beat passive references.
  return Object.values(bySlug).sort((a, b) =>
    (b.advanced + b.opened + b.closed) - (a.advanced + a.opened + a.closed) ||
    b.articles.length - a.articles.length);
}

// Pure merge: existing sheet data (headers + rows) × week's signals → row ops.
// Update rows keep their sheet position; new slugs append. Counts accumulate;
// list columns dedupe under LEDGER_LIST_CAP.
function mergeStorylineLedger(existing, signals, cycle) {
  const h = (existing[0] && existing[0].length ? existing[0] : STORYLINE_LEDGER_HEADERS).map(c => String(c).trim());
  const idx = {}; h.forEach((c, i) => { idx[c] = i; });
  const byId = new Map();
  existing.slice(1).forEach((r, i) => {
    const id = String(r[idx.StorylineId] || '').trim();
    if (id) byId.set(id, { r, sheetRow: i + 2 });
  });
  const num = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
  const mergeList = (curStr, add) => {
    const list = String(curStr || '').split(',').map(x => x.trim()).filter(Boolean);
    for (const a of (add || [])) if (!list.includes(a) && list.length < LEDGER_LIST_CAP) list.push(a);
    return list.join(',');
  };
  const statusFor = (s, prev) => {
    if (s.advanced + s.opened > 0) return 'open';
    if (s.closed > 0) return 'closed';
    return prev || 'open';   // reference-only weeks never flip status
  };
  const updates = [], appends = [];
  for (const s of signals) {
    const cur = byId.get(s.slug);
    if (cur) {
      const row = cur.r.slice();
      while (row.length < h.length) row.push('');
      row[idx.LastCycle] = String(cycle);
      row[idx.Status] = statusFor(s, String(cur.r[idx.Status] || '').trim());
      row[idx.Advanced] = num(row[idx.Advanced]) + s.advanced;
      row[idx.Opened] = num(row[idx.Opened]) + s.opened;
      row[idx.Closed] = num(row[idx.Closed]) + s.closed;
      row[idx.Referenced] = num(row[idx.Referenced]) + s.referenced;
      row[idx.Articles] = num(row[idx.Articles]) + s.articles.length;
      row[idx.Citizens] = mergeList(row[idx.Citizens], s.citizens);
      row[idx.Hoods] = mergeList(row[idx.Hoods], s.hoods);
      row[idx.Desks] = mergeList(row[idx.Desks], s.desks);
      updates.push({ sheetRow: cur.sheetRow, row });
    } else {
      appends.push(h.map(col => {
        switch (col) {
          case 'StorylineId': return s.slug;
          case 'FirstCycle':  return String(cycle);
          case 'LastCycle':   return String(cycle);
          case 'Status':      return statusFor(s, null);
          case 'Advanced':    return s.advanced;
          case 'Opened':      return s.opened;
          case 'Closed':      return s.closed;
          case 'Referenced':  return s.referenced;
          case 'Articles':    return s.articles.length;
          case 'Citizens':    return s.citizens.slice(0, LEDGER_LIST_CAP).join(',');
          case 'Hoods':       return s.hoods.slice(0, LEDGER_LIST_CAP).join(',');
          case 'Desks':       return s.desks.slice(0, LEDGER_LIST_CAP).join(',');
          default:            return '';
        }
      }));
    }
  }
  return { updates, appends };
}

async function stepSignals(cycle) {
  console.log('--- step 6b: storyline signals → Storyline_Ledger ---');
  const signals = aggregateStorylineSignals(loadStagedSet(cycle));
  const outPath = path.join(ROOT, 'output', 'storyline_signal_c' + cycle + '.json');
  fs.writeFileSync(outPath, JSON.stringify({ cycle: String(cycle), signals }, null, 2));
  console.log(signals.length + ' storyline(s) → ' + path.relative(ROOT, outPath));
  for (const s of signals.slice(0, 8)) {
    console.log('  ' + s.slug + ': ' + s.advanced + ' advanced / ' + s.opened + ' opened / ' +
      s.closed + ' closed / ' + s.referenced + ' referenced (' + s.articles.length + ' article(s))');
  }
  if (!signals.length) return { signals: 0, written: 0 };
  if (!APPLY) {
    console.log('(dry-run) would upsert ' + signals.length + ' row(s) into ' + STORYLINE_LEDGER_TAB);
    return { signals: signals.length, written: 0 };
  }
  const sheets = require(path.join(ROOT, 'lib', 'sheets'));
  const data = await sheets.getRawSheetData(STORYLINE_LEDGER_TAB);
  const { updates, appends } = mergeStorylineLedger(data, signals, cycle);
  for (const u of updates) await sheets.updateRangeByPosition(STORYLINE_LEDGER_TAB, u.sheetRow, 1, [u.row]);
  if (appends.length) await sheets.appendRows(STORYLINE_LEDGER_TAB, appends);
  console.log(updates.length + ' row(s) updated, ' + appends.length + ' appended to ' + STORYLINE_LEDGER_TAB);
  return { signals: signals.length, written: updates.length + appends.length };
}

// ---------------------------------------------------------------------------
// Steps 1–4 — the editorial seats (built 2026-08-05, narrator design adopted;
// docs/research/2026-08-04-mags-as-narrator.md verdict `adopt`).
//
// Model routing: audit rides google/gemini-3.5-flash (the gate's proven
// independent-family reviewer, ~$0.06); narration is the ONE voice-critical
// surface → Anthropic claude-sonnet-4-6 (the desk-map "Sonnet bought no
// quality" finding was about desk articles behind an agent stance; the Pulse
// IS the voice product). Audit + narrate write local artifacts only, so they
// run without --apply; publish is the canon door and is --apply-gated.
// ---------------------------------------------------------------------------
const AUDIT_MODEL = arg('--audit-model', 'google/gemini-3.5-flash');
const NARRATOR_MODEL = arg('--narrator-model', 'claude-sonnet-4-6');

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}
// LLM replies wander (fences, prose) — take the first balanced {...}.
function extractJson(text) {
  const s = String(text || '').replace(/```(?:json)?/g, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no JSON object in LLM reply: ' + s.slice(0, 120));
  return JSON.parse(s.slice(a, b + 1));
}

async function orChat(model, system, user, maxTokens) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing');
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.2,
      response_format: { type: 'json_object' },   // flash drifts into prose without this (c102 seat proof)
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
  });
  const j = await r.json();
  if (j.error) throw new Error('openrouter: ' + (j.error.message || JSON.stringify(j.error)));
  return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '').trim();
}

async function anthropicChat(model, system, user, maxTokens) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({ model, max_tokens: maxTokens, system,
    messages: [{ role: 'user', content: user }] });
  return msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

async function loadLedgerProfiles() {
  const sheets = require(path.join(ROOT, 'lib', 'sheets'));
  const led = await sheets.getRawSheetData('Simulation_Ledger');
  const h = led[0];
  const col = n => h.findIndex(x => String(x).toLowerCase() === n.toLowerCase());
  const iPop = col('POPID'), iName = col('Name'), iFirst = col('First'), iLast = col('Last');
  let iOcc = col('Occupation'); if (iOcc < 0) iOcc = col('RoleType');
  const iNh = col('Neighborhood'), iBirth = col('BirthYear'), iMar = col('MaritalStatus');
  const out = {};
  for (let i = 1; i < led.length; i++) {
    const r = led[i];
    const k = String(r[iPop] || '').toUpperCase();
    if (!k) continue;
    out[k] = {
      name: (iName >= 0 && r[iName]) ? String(r[iName]) : [r[iFirst], r[iLast]].filter(Boolean).join(' '),
      role: iOcc >= 0 ? String(r[iOcc] || '') : '', hood: iNh >= 0 ? String(r[iNh] || '') : '',
      birthYear: iBirth >= 0 ? String(r[iBirth] || '') : '', marital: iMar >= 0 ? String(r[iMar] || '') : ''
    };
  }
  return out;
}

function worldSummaryText(cycle) {
  const p = path.join(ROOT, 'output', 'world_summary_c' + cycle + '.md');
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8').slice(0, 30000);
}

// ---------------------------------------------------------------------------
// Step 1 — EIC accuracy audit. The test Saturday exists for: per-article
// verdict + the weekly %-to-90 answer (plan §Phase 3.1, graduation §Phase 4).
// Deterministic first (INTAKE names re-resolved against the live ledger —
// citizen-bending is a HARD fail per S344), then the LLM verdict on claims.
// ---------------------------------------------------------------------------
const AUDIT_CHARGE = [
  'You are the accuracy desk of an Oakland newsroom, auditing one article against the ground truth supplied.',
  'Verdict enum: "accurate" (every load-bearing claim grounded), "corrections-needed" (engine/system',
  'vocabulary leaking into prose, or a claim stated imprecisely but not bent), "canon-violation" (a person,',
  'role, age, neighborhood, or ledger fact contradicted or invented, or a data value misrepresented).',
  'Severity doctrine: bending a PERSON is the worst class; engine-verbiage is the lesser class.',
  'A person may only be called invented if the LEDGER PROFILES section is non-empty and they are absent',
  'from it AND from the world summary — you cannot see the full ledger, so absence of evidence about a',
  'named person is NOT evidence of invention. A supplied ledger profile IS proof the person is real.',
  'Scene texture (weather, unnamed street life, color) is NEVER a failure — only contradiction is.',
  'Reply STRICT JSON only: {"verdict":"...","failures":[{"what":"...","class":"citizen-bending|data-misrepresentation|engine-verbiage|unsupported-claim","why":"..."}]}'
].join('\n');

async function auditOne(entry, profiles, worldText) {
  const s = entry.sidecar;
  const intake = s.intake || null;
  // Deterministic: every INTAKE name must resolve to the live ledger row it claims.
  const nameFails = [];
  if (intake) {
    for (const n of (intake.names || [])) {
      if (!n.popid) { nameFails.push(n.name + ' (no POPID resolved)'); continue; }
      const prof = profiles[String(n.popid).toUpperCase()];
      if (!prof) { nameFails.push(n.name + ' (' + n.popid + ' not in ledger)'); continue; }
      const a = String(n.name || '').toLowerCase(), b = String(prof.name || '').toLowerCase();
      if (a && b && !a.includes(b) && !b.includes(a)) nameFails.push(n.name + ' ≠ ledger ' + prof.name + ' (' + n.popid + ')');
    }
  }
  // Ground truth for the model: INTAKE names when present; for legacy no-INTAKE
  // articles, text-scan the ledger so quoted REAL citizens are visible as real
  // (c102 seat proof: without this, the audit called Lucia Polito et al.
  // "invented" — they are ledger rows the wake-2 quote pass interviewed).
  const profileLine = (id, p) => id + ': ' + p.name + ' — ' + [p.role, p.hood, p.birthYear && ('b.' + p.birthYear), p.marital].filter(Boolean).join(', ');
  let groundProfiles = '';
  if (intake) {
    groundProfiles = (intake.names || []).map(n => {
      const p = profiles[String(n.popid || '').toUpperCase()];
      return p ? profileLine(n.popid, p) : null;
    }).filter(Boolean).join('\n');
  } else {
    const hits = [];
    const textLower = entry.text.toLowerCase();
    for (const [id, p] of Object.entries(profiles)) {
      if (p.name && p.name.length > 5 && textLower.includes(p.name.toLowerCase())) hits.push(profileLine(id, p));
      if (hits.length >= 20) break;
    }
    groundProfiles = hits.join('\n');
  }
  const user = [
    '=== LEDGER PROFILES (authoritative for every named citizen) ===', groundProfiles || '(none supplied)',
    '', '=== WORLD SUMMARY (authoritative cycle record) ===', worldText || '(missing)',
    '', '=== ARTICLE ===', entry.text.slice(0, 12000),
    '', intake ? '=== INTAKE (the article\'s own claim register) ===\n' + JSON.stringify(intake) : '=== NOTE: legacy article, no INTAKE block — judge the prose directly ===',
    '', 'Reply with the verdict JSON object ONLY. The first character of your reply must be {.'
  ].join('\n');
  let verdict = 'corrections-needed', failures = [];
  for (let attempt = 1; attempt <= 2; attempt++) {   // flash intermittently drifts from JSON — one retry
    try {
      const out = extractJson(await orChat(AUDIT_MODEL, AUDIT_CHARGE, user, 1200));
      verdict = ['accurate', 'corrections-needed', 'canon-violation'].includes(out.verdict) ? out.verdict : 'corrections-needed';
      failures = Array.isArray(out.failures) ? out.failures.slice(0, 10) : [];
      break;
    } catch (e) {
      failures = [{ what: 'audit call failed (attempt ' + attempt + ')', class: 'unsupported-claim', why: String(e.message).slice(0, 160) }];
    }
  }
  // Hard override: a name that fails the ledger check IS citizen-bending, whatever the model said.
  if (nameFails.length) {
    verdict = 'canon-violation';
    for (const nf of nameFails) failures.unshift({ what: nf, class: 'citizen-bending', why: 'INTAKE name failed live-ledger resolution' });
  }
  return { stem: entry.stem, byline: s.byline || '', desk: s.desk || '', intakePresent: !!intake, verdict, failures };
}

async function stepAudit(cycle) {
  console.log('--- step 1: EIC accuracy audit ---');
  const set = loadStagedSet(cycle);
  if (!set.length) { console.log('no staged articles for c' + cycle); return { audited: 0 }; }
  const profiles = await loadLedgerProfiles();
  const worldText = worldSummaryText(cycle);
  if (!worldText) console.log('[warn] no world_summary_c' + cycle + '.md — claims audit runs on ledger + article only');
  const articles = [];
  for (const entry of set) {
    const a = await auditOne(entry, profiles, worldText);
    console.log('  ' + a.verdict.padEnd(18) + ' ' + a.stem + (a.failures.length ? ' (' + a.failures.length + ' finding(s))' : ''));
    articles.push(a);
  }
  const counts = { accurate: 0, 'corrections-needed': 0, 'canon-violation': 0 };
  for (const a of articles) counts[a.verdict]++;
  const accuracyPct = Math.round((counts.accurate / articles.length) * 1000) / 10;
  // Trend: every prior scorecard on disk (the graduation window reads 3 consecutive ≥90 — plan §Phase 4).
  const trend = fs.readdirSync(path.join(ROOT, 'output'))
    .map(f => f.match(/^eic_scorecard_c(\d+)\.json$/)).filter(Boolean)
    .map(m => ({ cycle: Number(m[1]), pct: (readJsonSafe(path.join(ROOT, 'output', 'eic_scorecard_c' + m[1] + '.json')) || {}).accuracyPct }))
    .filter(t => t.cycle !== Number(cycle) && t.pct != null)
    .sort((a, b) => a.cycle - b.cycle);
  const scorecard = { cycle: String(cycle), total: articles.length, counts, accuracyPct, auditModel: AUDIT_MODEL, trend, articles };
  const jsonPath = path.join(ROOT, 'output', 'eic_scorecard_c' + cycle + '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(scorecard, null, 2));
  const gap = 90 - accuracyPct;
  const md = [
    '# EIC Accuracy Scorecard — C' + cycle,
    '',
    '**' + accuracyPct + '% accurate** (' + counts.accurate + '/' + articles.length + ' clean; ' +
      counts['corrections-needed'] + ' corrections-needed; ' + counts['canon-violation'] + ' canon-violation)',
    '',
    gap <= 0
      ? '**AT THE 90% BAR.** ' + ([...trend.slice(-2).map(t => t.pct), accuracyPct].filter(p => p >= 90).length >= 3
          ? 'Third consecutive week at/above 90 — graduation window is OPEN (Mike\'s flip, plan §Phase 4).'
          : 'Graduation needs 3 consecutive weeks at/above 90.')
      : '**' + gap.toFixed(1) + ' points from the 90% autonomy bar.**',
    '',
    trend.length ? 'Trend: ' + trend.map(t => 'C' + t.cycle + ' ' + t.pct + '%').join(' → ') + ' → C' + cycle + ' ' + accuracyPct + '%' : 'Trend: first scored week.',
    '',
    '## Per-article',
    ...articles.map(a => '- **' + a.stem + '** (' + (a.byline || '—') + '): ' + a.verdict +
      (a.failures.length ? '\n' + a.failures.map(f => '  - [' + f.class + '] ' + f.what + ' — ' + f.why).join('\n') : ''))
  ].join('\n');
  const mdPath = path.join(ROOT, 'output', 'eic_scorecard_c' + cycle + '.md');
  fs.writeFileSync(mdPath, md);
  console.log('accuracy ' + accuracyPct + '% → ' + path.relative(ROOT, mdPath) + (gap > 0 ? ' (' + gap.toFixed(1) + ' pts to 90)' : ' (AT BAR)'));
  return scorecard;
}

// ---------------------------------------------------------------------------
// Step 2 — curation. Mechanical rank over the audited set; canon-violations
// never publish; storyline dedup keeps one article per thread in the top set.
// ---------------------------------------------------------------------------
function curationScore(entry, auditRow) {
  const intake = entry.sidecar.intake || {};
  let moves = 0, refs = 0;
  for (const s of (intake.storylines || [])) {
    if (s.verb === 'referenced') refs++; else moves++;
  }
  return 3 * moves + refs
    + 0.5 * ((intake.names || []).length)
    + (auditRow && auditRow.verdict === 'accurate' ? 2 : 0);
}
function primarySlug(entry) {
  const st = (entry.sidecar.intake && entry.sidecar.intake.storylines) || [];
  const mover = st.find(s => s.verb !== 'referenced');
  return (mover || st[0] || {}).slug || null;
}

async function stepCurate(cycle) {
  console.log('--- step 2: curation ---');
  const scorecard = readJsonSafe(path.join(ROOT, 'output', 'eic_scorecard_c' + cycle + '.json'));
  if (!scorecard) throw new Error('no eic_scorecard_c' + cycle + '.json — run --step audit first');
  const byStem = {}; for (const a of scorecard.articles) byStem[a.stem] = a;
  const set = loadStagedSet(cycle);
  const top = Number(arg('--top', 9));
  const ranked = set
    .filter(e => (byStem[e.stem] || {}).verdict !== 'canon-violation')
    .map(e => ({ stem: e.stem, byline: e.sidecar.byline || '', desk: e.sidecar.desk || '',
      score: curationScore(e, byStem[e.stem]), slug: primarySlug(e), verdict: (byStem[e.stem] || {}).verdict || 'unaudited' }))
    .sort((a, b) => b.score - a.score);
  // Two passes: unique storyline threads first, then best remainders fill leftover slots.
  const seen = new Set(), selected = [];
  for (const r of ranked) {
    if (selected.length >= top) break;
    if (r.slug && seen.has(r.slug)) continue;
    if (r.slug) seen.add(r.slug);
    selected.push(r.stem);
  }
  for (const r of ranked) {
    if (selected.length >= top) break;
    if (!selected.includes(r.stem)) selected.push(r.stem);
  }
  const excluded = set.length - ranked.length;
  const out = { cycle: String(cycle), top, selected, ranked, excludedCanonViolations: excluded };
  const p = path.join(ROOT, 'output', 'edition_curation_c' + cycle + '.json');
  fs.writeFileSync(p, JSON.stringify(out, null, 2));
  for (const r of ranked.slice(0, top)) console.log('  ' + String(r.score).padStart(5) + '  ' + r.stem + (selected.includes(r.stem) ? '' : '  (storyline-dedup deferred)'));
  console.log(selected.length + ' selected of ' + set.length + ' staged (' + excluded + ' canon-violation excluded) → ' + path.relative(ROOT, p));
  return out;
}

// ---------------------------------------------------------------------------
// Step 3 — narration. Mags narrates the cycle from the curated set — one voice
// on the Pulse, seventeen in canon; she quotes her own staff's reporting.
// ---------------------------------------------------------------------------
const NARRATOR_CHARGE = (cycle) => [
  'You are Mags Corliss, 56, Editor-in-Chief of the Bay Tribune and the narrator of Oakland\'s week.',
  'You are writing THE CYCLE PULSE for cycle Y2C' + cycle + ' — not assembling an edition, narrating a city.',
  'You have your staff\'s published reporting below. Draw on it the way an editor\'s column draws on the',
  'paper: quote your reporters BY NAME when their reporting carries a moment ("as Dana Reeve reported...").',
  'Never restate a number as the story — the number is the cause; the people living it are the content.',
  'Never use system or engine vocabulary. Never use real-world dates — the clock is Y2C' + cycle + '.',
  'Thread the week: what moved, what contradicts, what nobody has answered yet. End on what you\'re',
  'watching next week. 900-1200 words, plain prose, no headers, no bullet lists.'
].join('\n');

async function stepNarrate(cycle) {
  console.log('--- step 3: narration (Mags) ---');
  const curation = readJsonSafe(path.join(ROOT, 'output', 'edition_curation_c' + cycle + '.json'));
  if (!curation) throw new Error('no edition_curation_c' + cycle + '.json — run --step curate first');
  const set = loadStagedSet(cycle);
  const byStem = {}; for (const e of set) byStem[e.stem] = e;
  const material = curation.selected.map(stem => {
    const e = byStem[stem];
    if (!e) return null;
    return '--- ' + (e.sidecar.byline || 'staff') + ' (' + (e.sidecar.desk || '') + ') — ' + stem + ' ---\n' +
      e.text.replace(/## INTAKE[\s\S]*$/, '').trim().slice(0, 2400);
  }).filter(Boolean).join('\n\n');
  if (!material) throw new Error('curated set resolved to zero articles');
  const pulse = await anthropicChat(NARRATOR_MODEL, NARRATOR_CHARGE(cycle),
    'THE WEEK\'S REPORTING (your staff, already cleared and published):\n\n' + material, 2200);
  const p = path.join(ROOT, 'output', 'cycle_pulse_c' + cycle + '.md');
  fs.writeFileSync(p, pulse + '\n');
  console.log(pulse.split(/\s+/).length + ' words → ' + path.relative(ROOT, p));
  return { words: pulse.split(/\s+/).length, path: p };
}

// ---------------------------------------------------------------------------
// Step 4 — publish: the canon door. Assemble narration + curated articles into
// the edition artifact; --apply runs canon ingest + the permanent-notebook add.
// Byline lines are emitted in the published form ingestEdition regexes
// (`By <Name> | Bay Tribune <Desk>`) — the extractBylineMeta seam, plan §Phase 1.
// ---------------------------------------------------------------------------
async function stepPublish(cycle) {
  console.log('--- step 4: publish (canon door) ---');
  const curation = readJsonSafe(path.join(ROOT, 'output', 'edition_curation_c' + cycle + '.json'));
  const pulsePath = path.join(ROOT, 'output', 'cycle_pulse_c' + cycle + '.md');
  if (!curation) throw new Error('run --step curate first');
  if (!fs.existsSync(pulsePath)) throw new Error('run --step narrate first');
  const set = loadStagedSet(cycle);
  const byStem = {}; for (const e of set) byStem[e.stem] = e;
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const body = curation.selected.map(stem => {
    const e = byStem[stem];
    if (!e) return null;
    return 'By ' + (e.sidecar.byline || 'Bay Tribune Staff') + (e.sidecar.desk ? ' | Bay Tribune ' + cap(e.sidecar.desk) : '') +
      '\n\n' + e.text.trim();
  }).filter(Boolean).join('\n\n============================================================\n\n');
  const edition = [
    'THE CYCLE PULSE — Y2C' + cycle,
    'The Bay Tribune — Oakland',
    'Narrated by Mags Corliss, Editor-in-Chief',
    '',
    '============================================================',
    '',
    fs.readFileSync(pulsePath, 'utf8').trim(),
    '',
    '============================================================',
    '',
    'THE WEEK\'S REPORTING',
    '',
    body,
    '',
    '— The Bay Tribune, Y2C' + cycle
  ].join('\n');
  const outPath = path.join(ROOT, 'editions', 'cycle_pulse_c' + cycle + '.txt');
  fs.writeFileSync(outPath, edition + '\n');
  console.log('edition assembled → ' + path.relative(ROOT, outPath) + ' (' + curation.selected.length + ' article(s) + narration)');
  if (!APPLY) {
    console.log('(dry-run) would run:');
    console.log('  node scripts/ingestEdition.js ' + path.relative(ROOT, outPath) + ' --cycle ' + cycle);
    console.log('  nlm source add <permanent notebookId> --file ' + path.relative(ROOT, outPath));
    console.log('  node scripts/ingestPublishedEntities.js ' + path.relative(ROOT, outPath) + ' --cycle ' + cycle + ' --apply  (NAMES INDEX parser — verify INTAKE compatibility first)');
    return { published: false };
  }
  const { spawnSync } = require('child_process');
  const ing = spawnSync('node', [path.join(ROOT, 'scripts', 'ingestEdition.js'), outPath, '--cycle', String(cycle)], { stdio: 'inherit' });
  if (ing.status !== 0) throw new Error('ingestEdition failed (exit ' + ing.status + ')');
  const config = readJsonSafe(path.join(ROOT, 'config', 'notebooklm.json')) || {};
  if (!config.notebookId) throw new Error('config/notebooklm.json missing notebookId (permanent notebook)');
  const { nlm } = require(path.join(ROOT, 'scripts', 'notebooklmPush'));
  const add = nlm(['source', 'add', config.notebookId, '--file', outPath, '--title', 'The Cycle Pulse — Y2C' + cycle, '--wait']);
  if (add.status !== 0) throw new Error('NotebookLM source add failed: ' + String(add.stderr || add.stdout).slice(0, 200));
  console.log('published: canon ingest + permanent notebook (' + config.notebookName + ')');
  console.log('[follow-up] ingestPublishedEntities (byline-published fame rows) parses NAMES INDEX — run manually until its INTAKE adaptation lands.');
  return { published: true, path: outPath };
}

// ---------------------------------------------------------------------------
async function main() {
  const cycle = arg('--cycle', null);
  if (!cycle) throw new Error('--cycle <N> is required');
  const step = arg('--step', null);
  console.log('Saturday run — c' + cycle + (APPLY ? ' [APPLY]' : ' [dry-run]'));
  const dispatch = {
    audit: () => stepAudit(cycle), curate: () => stepCurate(cycle),
    narrate: () => stepNarrate(cycle), publish: () => stepPublish(cycle),
    sweep: () => stepSweep(cycle), sheets: () => stepSheets(cycle),
    signals: () => stepSignals(cycle)
  };
  if (step) {
    if (!dispatch[step]) throw new Error('unknown --step "' + step + '" (want audit|curate|narrate|publish|sweep|sheets|signals)');
    await dispatch[step]();
  } else {
    // Plan §Phase 3 order: audit → curate → narrate → publish → sweep → sheets → signals.
    await stepAudit(cycle);
    await stepCurate(cycle);
    await stepNarrate(cycle);
    await stepPublish(cycle);
    await stepSweep(cycle);
    await stepSheets(cycle);
    await stepSignals(cycle);
  }
}

if (require.main === module) {
  main().catch(err => { console.error('[saturday] Fatal: ' + err.message); process.exit(1); });
}

module.exports = { loadStagedSet, articleCustomId, articleDoc, usageRowsFor, ROLE_TO_USAGE,
  aggregateStorylineSignals, mergeStorylineLedger, STORYLINE_LEDGER_HEADERS };
