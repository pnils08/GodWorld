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
 *   2 curate   — grade first (pipeline.79), then storyline moves + audit verdict; storyline
 *                dedup, top ~9 → edition_curation_c{N}.json. Canon-violations
 *                never publish.
 *   3 narrate  — Mags narrates the Pulse from the curated set (Sonnet, the one
 *                voice-critical call) → cycle_pulse_c{N}.md
 *   4 publish  — canon door: assemble editions/cycle_pulse_c{N}.txt; --apply
 *   4b coverage — rate the published edition into Edition_Coverage_Ratings
 *                (pipeline.62); non-fatal, pre-flight catches a miss next cycle
 *                runs ingestEdition + permanent-NotebookLM source add
 *   5 sweep    — per-article canon ingest (ALL staged, curated or not)
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
 *   node scripts/cron-saturday-run.js [--cycle 102] [--apply]        # full run
 *   node scripts/cron-saturday-run.js --step audit [--cycle 102]     # one step
 *   (--cycle optional — defaults to lib/getCurrentCycle, the engine.81 truth
 *    source; the Saturday crontab entry passes no cycle and no step)
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
const crypto = require('crypto');
const articleContamination = require('./articleContamination');
const { readerCopy } = require('../lib/articleIntake');   // canon content is article prose; the INTAKE register lives in the metadata

const ROOT = path.resolve(__dirname, '..');
const STAGED = path.join(ROOT, 'output', 'cron-compare', 'staged');
const CONTAINER_TAG = 'bay-tribune';
const API_HOST = 'api.supermemory.ai';
const API_KEY = process.env.SUPERMEMORY_CC_API_KEY;

// Accepts BOTH `--flag value` and `--flag=value`. It used to read only the
// spaced form, and an unrecognised `--step=publish` fell through to the default
// — which is "run the whole chain". Combined with --apply that silently ran
// every step, publish included, when one step was asked for (hit live
// 2026-08-31). A flag this script gets wrong writes canon, so it takes both.
function arg(flag, def) {
  const eq = process.argv.find(a => a.indexOf(flag + '=') === 0);
  if (eq) return eq.slice(flag.length + 1) || def;
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const APPLY = process.argv.includes('--apply');
// --waive-style-gate "<reason>" — recovery-batch override (Mike-direct 2026-08-15,
// post-wipe heat-slice rebuild in progress). Skips ONLY isCodeRenderedBrief
// (prose-voice classifier). Rhea pass-hash + contamination scan stay hard gates,
// no waiver path exists for either — this flag cannot make an unverified or
// contaminated article publishable, only a factually-verified one that reads
// in "auditor voice" instead of narrative voice.
const WAIVE_STYLE_GATE_REASON = arg('--waive-style-gate', null);

// USAGE-TYPE BIND (see header): INTAKE role → Citizen_Media_Usage UsageType.
// engine.152/S412 (builder 2026-09-02): quoted citizens are credited HERE, at the canon door —
// the interview wake (citizenVoice --record) writes the page + a reflection row, never a usage
// row, so 'quoted-source' had fallen on the floor since the handoff (0 credits, C90→C105).
const ROLE_TO_USAGE = { subject: 'featured', mentioned: 'mentioned', 'quoted-source': 'quoted' };

// ---------------------------------------------------------------------------
// Staged-set reader — every .staged.json for the cycle, with its article text.
// ---------------------------------------------------------------------------
function isCodeRenderedBrief(articleText) {
  return require('./livedArticleShape').isSummaryArticle(articleText).fail;
}

// The write wake scans against its packet, so a phrase grounded by the story's
// own assignment (articleContamination `groundedBy`) stages clean; this door
// re-scanned with no packet and would turn the same Article away. Read the
// SAME packet the write wake scanned against. pipeline.78 (codex #3): the root
// `.state.json` is rewritten by every later write of the base, so a filing's
// own copy (staged-packets/, bound at stage time) comes first; the root state
// is used only when its manifest is the one Rhea proved. Otherwise no packet —
// the strict reading.
function stagedWritePacket(side) {
  const intake = require('../lib/articleIntake');
  const art = path.basename(String(side && side.article || ''));
  if (!/\.staged(?:-\d{3,4})?\.md$/.test(art)) return null;
  const want = side.rhea && side.rhea.manifestId || null;
  const idOf = st => st && st.manifest && st.manifest.id || null;
  const read = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; } };
  const bound = read(path.join(ROOT, 'output', 'cron-compare', 'staged-packets', intake.stagedPacketName(art)));
  if (bound && (!want || idOf(bound) === want)) return bound;
  const base = art.replace(/\.staged(?:-\d{3,4})?\.md$/, '');
  const root = read(path.join(ROOT, 'output', 'cron-compare', base + '.state.json'));
  return root && want && idOf(root) === want ? root : null;
}

// pipeline.79 (builder 2026-10-15: "highlight the best articles of the week on Saturday") —
// the seat-contract grade (0-4) of THESE bytes: the sidecar's own proof first, else the root
// verdict only when it proved the same hash. null = never graded (pre-loop filings, lore).
function stagedGrade(side, fallbackVerdict, articleSha256) {
  for (const proof of [side && side.rhea, fallbackVerdict]) {
    if (!proof || proof.pass !== true || proof.draftSha256 !== articleSha256) continue;
    const cs = proof.contractScore;
    // codex .79 #1: the score must be for these bytes (when it carries its own hash) and in 0-4.
    if (cs && cs.draftSha256 && cs.draftSha256 !== articleSha256) continue;
    if (cs && Number.isInteger(cs.score) && cs.score >= 0 && cs.score <= 4) return cs.score;
  }
  return null;
}

function verifyStagedProof(side, articleText, fallbackVerdict) {
  if (!side || side.status !== 'staged') return { ok: false, reason: 'sidecar status is not staged' };
  const articleSha256 = crypto.createHash('sha256').update(articleText).digest('hex');
  const proofs = [side.rhea, fallbackVerdict].filter(Boolean);
  const matched = proofs.find(proof => proof.pass === true && proof.draftSha256 === articleSha256);
  if (!matched) {
    const passed = proofs.some(proof => proof.pass === true);
    return { ok: false, reason: passed ? 'Rhea pass hash does not match staged Article' : 'no exact Rhea pass proof' };
  }
  const contamination = articleContamination.scan(articleText, { desk: side.desk, packet: stagedWritePacket(side) });
  if (contamination.fail) {
    return { ok: false, articleSha256,
      reason: 'deterministic world-contamination blocker failed', contamination };
  }
  if (isCodeRenderedBrief(articleText)) {
    if (WAIVE_STYLE_GATE_REASON) {
      console.log('[waived] style gate bypassed for Rhea-verified, contamination-clean article — reason: ' + WAIVE_STYLE_GATE_REASON);
      return { ok: true, articleSha256, contamination, styleGateWaived: true };
    }
    return { ok: false, articleSha256,
      reason: 'code-rendered source/records brief is not an Article' };
  }
  return { ok: true, articleSha256, contamination };
}

function loadArcSeeds(cycle) {
  const COMPARE = path.join(ROOT, 'output', 'cron-compare');
  const out = [];
  if (!fs.existsSync(COMPARE)) return out;
  for (const f of fs.readdirSync(COMPARE).sort()) {
    if (!f.endsWith('_arc.json')) continue;
    let side;
    try { side = JSON.parse(fs.readFileSync(path.join(COMPARE, f), 'utf8')); } catch (_) { continue; }
    if (!side || side.status !== 'arc-seed') continue;
    if (String(side.cycle) !== String(cycle)) continue;
    if (!(side.quotes || []).length) continue;
    out.push({
      stem: f.replace(/\.json$/, ''),
      sidecar: {
        desk: side.desk,
        cycle: side.cycle,
        intake: {
          storylines: side.storyline ? [side.storyline] : [],
          hoods: side.hood ? [side.hood] : [],
          names: side.quotes.map(q => ({
            name: q.name, popid: q.pop, role: 'quoted-source'
          }))
        }
      },
      text: side.quotes.map(q => q.name + ': ' + q.quote).join('\n')
    });
  }
  return out;
}

const STAGED_SIDECAR_BY_STEM = new Map();   // stem -> the sidecar file loadStagedSet read it from

function loadStagedSet(cycle) {
  const out = [];
  const seenSha = new Set(); // pipeline.78: one Article under two sidecar names lands once
  const seenStem = new Set();
  if (!fs.existsSync(STAGED)) return out;
  for (const f of fs.readdirSync(STAGED).sort()) {
    const named = require('../lib/articleIntake').parseStagedSidecar(f); // pipeline.78: plain or S492 suffix
    if (!named) continue;
    let side;
    try { side = JSON.parse(fs.readFileSync(path.join(STAGED, f), 'utf8')); } catch (_) { continue; }
    if (String(side.cycle) !== String(cycle)) continue;
    const artPath = path.resolve(ROOT, side.article || '');
    if (path.dirname(artPath) !== STAGED) {
      console.log('[skip] staged sidecar points outside staged/: ' + f);
      continue;
    }
    if (!fs.existsSync(artPath)) { console.log('[skip] sidecar without article: ' + f); continue; }
    const text = fs.readFileSync(artPath, 'utf8');
    let fallbackVerdict = null;
    try {
      fallbackVerdict = JSON.parse(fs.readFileSync(path.join(ROOT, 'output', 'cron-compare',
        named.base + '.rhea.json'), 'utf8'));   // the root verdict carries the base name
    } catch (_) { /* reconciled sidecars carry the proof inline */ }
    const proof = verifyStagedProof(side, text, fallbackVerdict);
    if (!proof.ok) {
      console.log('[skip] unproved staged Article ' + f + ': ' + proof.reason);
      continue;
    }
    if (seenSha.has(proof.articleSha256)) { console.log('[skip] duplicate Article bytes under a second sidecar: ' + f); continue; }
    seenSha.add(proof.articleSha256);
    // pipeline.78 (codex #2): X.staged-2316 and a plain X-2316.staged both read stem X-2316 —
    // a second filing on a taken stem gets its bytes' hash so two articles never share a customId.
    let stem = named.stem;   // X, or X-HHMM for a suffixed filing — distinct canon customIds
    if (seenStem.has(stem)) {
      stem += '-' + proof.articleSha256.slice(0, 8);
      console.log('[stem] ' + f + ' collides with an earlier filing — landing as ' + stem);
    }
    seenStem.add(stem);
    STAGED_SIDECAR_BY_STEM.set(stem, f);
    out.push({
      stem,
      sidecarFile: f,
      grade: stagedGrade(side, fallbackVerdict, proof.articleSha256),
      sidecar: side,
      text,
      articleSha256: proof.articleSha256
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Step 5 — Supermemory sweep (per-article, idempotent via customId upsert).
// ---------------------------------------------------------------------------
function articleCustomId(cycle, stem) {
  const id = 'article-c' + cycle + '-' + stem;
  if (id.length <= 100) return id; // Supermemory customId hard cap
  // Found live 2026-08-15: a long stem (doubled "benchmark-benchmark" in the
  // source filename) produced a 102-char id and the API rejected it with a
  // plain 400, no upsert, no retry. Truncate + hash suffix so it always fits
  // and stays unique even if two long stems share a long common prefix.
  const prefix = 'article-c' + cycle + '-';
  const hash = crypto.createHash('sha256').update(stem).digest('hex').slice(0, 8);
  const budget = 100 - prefix.length - 1 - hash.length;
  return prefix + stem.slice(0, budget) + '-' + hash;
}

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
    status: 'canon',
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
  // Canon search reads prose. The INTAKE register (names, claims, source cites,
  // self-score) is already carried as filterable metadata above, and as its own
  // chunk it shows up beside the prose in name searches (builder 2026-10-08).
  return { customId: articleCustomId(cycle, entry.stem), containerTags: tags, metadata: meta, content: readerCopy(entry.text) };
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

// Shared by sweep/sheets/signals — stepCurate already excludes canon-violation
// verdicts from the curated Edition, but these three steps called
// loadStagedSet(cycle) directly with no such filter, so a confirmed
// canon-violation article (Rhea-passed but factually wrong per the EIC audit)
// could still reach Supermemory canon, Citizen_Media_Usage, and storyline
// signals even after being correctly excluded from curation. Found live
// 2026-08-15: sweep upserted Elliot Graye's wrong-venue Claire Ashford piece
// to Supermemory before this fix landed; deleted by hand, see session record.
function loadStagedSetExcludingCanonViolations(cycle) {
  const set = loadStagedSet(cycle);
  const scorecard = readJsonSafe(path.join(ROOT, 'output', 'eic_scorecard_c' + cycle + '.json'));
  if (!scorecard) return set; // no audit run yet — nothing to exclude by
  const violations = new Set(scorecard.articles.filter(a => a.verdict === 'canon-violation').map(a => a.stem));
  return set.filter(e => !violations.has(e.stem));
}

async function stepSweep(cycle) {
  console.log('--- step 5: Supermemory sweep (per-article, PUBLISHED set only) ---');
  // Builder ruling 2026-09-07 (S433): published articles are canon. Before this
  // the sweep upserted EVERY staged article (35 over the last 14 days) while the
  // edition carried ~9 — paying to canonize copy nobody reads. Scope = the
  // curated/published stems; a missing curation file fails loud, never widens.
  const curation = readJsonSafe(path.join(ROOT, 'output', 'edition_curation_c' + cycle + '.json'));
  if (!curation || !Array.isArray(curation.selected)) throw new Error('no edition_curation_c' + cycle + '.json — run --step curate first (sweep is published-only)');
  const published = new Set(curation.selected);
  const set = loadStagedSetExcludingCanonViolations(cycle).filter(e => published.has(e.stem));
  if (!set.length) { console.log('no published articles for c' + cycle); return { swept: 0 }; }
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
    if (!usageType) continue;
    if (!n.popid) continue;               // unresolved/ambiguous — no fame credit on a guess
    rows.push({ name: n.name, popid: n.popid, usageType, context: entry.stem, snippet: citationSnippet(entry.text, n.name) });
  }
  return rows;
}

// engine.152 (S412): the sentences of the article that name the citizen — what the
// light classifier reads. Pure. Empty when the name is not in the text.
function citationSnippet(text, name) {
  const body = String(text || '').replace(/\s+/g, ' ');
  const nm = String(name || '').trim();
  if (!nm || body.indexOf(nm) < 0) return '';
  const last = nm.split(' ').pop();
  const sentences = body.split(/(?<=[.!?])\s+/);
  const hits = sentences.filter(s => s.indexOf(nm) >= 0 || (last.length > 3 && s.indexOf(last) >= 0));
  return hits.slice(0, 4).join(' ').slice(0, 1200);
}

// pipeline.79 (builder 2026-10-15: print is "where journalist usage for tiers come from") —
// each printed filing earns its author 'byline-published' (processAdvancementIntake engine.88:
// MEDIA climbs on these alone). ingestPublishedEntities' ARTICLE TABLE path never matched this
// edition shape, so none were written after C102. Context = the stem, like byline-landed.
// Builder ruling 2026-10-16 ("the cycle pulse that mags runs accounts for the only
// usagecount recorded"): a citizen earns coverage credit only from the filings the Cycle
// Pulse printed — the canon door's own record (edition_published_c<N>.json, the same set
// byline-published reads). No record, no credit. Pure.
function printedStems(cycle) {
  const pub = readJsonSafe(path.join(ROOT, 'output', 'edition_published_c' + cycle + '.json'));
  if (!pub || !Array.isArray(pub.selected)) return null;
  return new Set(pub.selected);
}
function printedOnly(set, printed) {
  if (!printed) return [];
  return (set || []).filter(e => e && printed.has(e.stem));
}

function bylinePublishedRows(cycle, set) {
  // Credit only what the canon door published (stepPublish writes this after ingest + notebook).
  const pub = readJsonSafe(path.join(ROOT, 'output', 'edition_published_c' + cycle + '.json'));
  if (!pub || !Array.isArray(pub.selected)) {
    console.log('[byline-published] none: c' + cycle + ' edition not published (recover: --step publish --apply, then --step sheets --apply)');
    return [];
  }
  const printed = new Set(pub.selected);
  return set.filter(e => printed.has(e.stem) && e.sidecar.byline)
    .map(e => ({ name: e.sidecar.byline, popid: e.sidecar.bylinePopid || null,
      usageType: 'byline-published', context: e.stem, snippet: '', byline: true }));
}

// The engine credits by name (processAdvancementIntake splitUsageName_: one leading honorific off,
// then First Last). A byline row lands only when that name is the sidecar's own POPID on the
// ledger — a miss or a mismatch is loud and skipped, never a credit to the wrong citizen.
function bylineResolves(row, ledger) {
  const h = ledger[0] || [];
  const iP = h.indexOf('POPID'), iF = h.indexOf('First'), iL = h.indexOf('Last');
  const norm = x => String(x || '').toLowerCase().replace(/[^a-z\s'-]/g, '').replace(/\s+/g, ' ').trim();
  const name = norm(String(row.name).replace(/^\s*[A-Za-z]{1,5}\.\s+/, ''));
  const hits = ledger.slice(1).filter(r => norm(r[iF] + ' ' + r[iL]) === name);
  if (hits.length !== 1) return { ok: false, why: hits.length ? 'ambiguous name (' + hits.length + ' ledger rows)' : 'name not on the ledger' };
  if (row.popid && String(hits[0][iP]).trim() !== String(row.popid).trim()) {
    return { ok: false, why: 'name resolves to ' + hits[0][iP] + ', sidecar says ' + row.popid };
  }
  return { ok: true, popid: String(hits[0][iP]).trim() };
}

async function stepSheets(cycle) {
  console.log('--- step 6: Citizen_Media_Usage ingest from INTAKE ---');
  const set = loadStagedSetExcludingCanonViolations(cycle);
  const printed = printedStems(cycle);
  if (!printed) console.log('[coverage] none: c' + cycle + ' edition not published — the Pulse is the only usage door (recover: --step publish --apply, then --step sheets --apply)');
  else console.log('[coverage] crediting ' + printedOnly(set, printed).length + ' printed filing(s) of ' + set.length + ' staged');
  const wanted = printedOnly(set, printed).flatMap(e => usageRowsFor(e)).concat(bylinePublishedRows(cycle, set));
  if (!wanted.length) { console.log('no INTAKE usage rows for c' + cycle); return { written: 0 }; }
  if (!APPLY) {
    for (const w of wanted) console.log('(dry-run) would append: ' + w.name + ' | ' + w.usageType + ' | ' + w.context + (w.snippet ? ' | light: (classified on --apply)' : ' | light: no snippet'));
    console.log(wanted.length + ' row(s) in dry-run scope');
    return { written: 0 };
  }
  const sheets = require(path.join(ROOT, 'lib', 'sheets'));
  const data = await sheets.getRawSheetData('Citizen_Media_Usage');
  const h = data[0] || [];
  const iN = h.indexOf('CitizenName'), iT = h.indexOf('UsageType'), iC = h.indexOf('Context');
  if (wanted.some(w => w.byline)) {
    const ledger = await sheets.getRawSheetData('Simulation_Ledger');
    for (let i = wanted.length - 1; i >= 0; i--) {
      if (!wanted[i].byline) continue;
      const r = bylineResolves(wanted[i], ledger);
      if (!r.ok) { console.error('[byline-published] SKIPPED ' + wanted[i].name + ' (' + wanted[i].context + '): ' + r.why); wanted.splice(i, 1); }
    }
  }
  // engine.152: classify the light each citation casts (cheap model, one call per row).
  // A failed or absent judgment leaves the cell blank — the engine reads blank as neutral.
  const { classifyCitationLight } = require(path.join(ROOT, 'lib', 'reflectionClassifier'));
  for (const w of wanted) {
    if (w.byline) continue;   // the author's own work is never coverage of them (engine.152)
    const res = await classifyCitationLight(w.name, w.snippet);
    w.sentiment = res.light || '';
    console.log('light: ' + w.name + ' -> ' + (res.light || '(unclassified: ' + String(res.raw).slice(0, 60) + ')'));
  }
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
        case 'Reporter':    return w.byline ? w.name : entryByline(w.context);
        case 'Sentiment':   return w.sentiment || '';   // engine.152
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
    // pipeline.78 (codex #2): the exact sidecar loadStagedSet read, never a reverse map of the stem.
    const name = STAGED_SIDECAR_BY_STEM.get(stem) ||
      require('../lib/articleIntake').stagedSidecarNames(stem).find(n => fs.existsSync(path.join(STAGED, n)));
    const side = JSON.parse(fs.readFileSync(path.join(STAGED, name || stem + '.staged.json'), 'utf8'));
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
      // A sidecar hood entry can itself be a comma list ("West Oakland, Fruitvale").
      // Stored whole, the next merge re-split it and the row carried each hood twice.
      for (const raw of (intake.hoods || [])) {
        for (const h of String(raw).split(',').map(x => x.trim()).filter(Boolean)) {
          if (!agg.hoods.includes(h)) agg.hoods.push(h);
        }
      }
      // The people the piece is ABOUT or QUOTES. `mentioned` names used to ride
      // along too, which put four much-quoted citizens on 11-24 threads each.
      for (const n of (intake.names || [])) {
        if (!n.popid || n.role === 'mentioned') continue;
        if (!agg.citizens.includes(n.popid)) agg.citizens.push(n.popid);
      }
      const desk = entry.sidecar.desk;
      if (desk && !agg.desks.includes(desk)) agg.desks.push(desk);
    }
  }
  // High-signal first: moves (advanced+opened+closed) beat passive references.
  return Object.values(bySlug).sort((a, b) =>
    (b.advanced + b.opened + b.closed) - (a.advanced + a.opened + a.closed) ||
    b.articles.length - a.articles.length);
}

// engine.270 — a storyline ID is an ENGINE ID: a crisis arc or an initiative
// stage. Anything else is the retired `hood-citizen-kind` slug.
const ENGINE_STORYLINE_ID = /^(CRISIS-\d+-[A-Z0-9]+|[A-Z]+-\d+:.+)$/;
function isEngineStorylineId(id) { return ENGINE_STORYLINE_ID.test(String(id || '')); }

// Pure merge: existing sheet data (headers + rows) × week's coverage signals ×
// the engine's storyline registry → row ops. Update rows keep their sheet
// position; new IDs append. Counts accumulate; list columns dedupe under
// LEDGER_LIST_CAP.
//
// Status belongs to the ENGINE. For a registry entry it is the registry's
// status, covered or not. LastCycle means last COVERAGE cycle: a registry
// upsert with no article leaves it alone, and a storyline nobody has covered
// yet carries it blank with Articles 0 — the "did we miss it" reading.
function mergeStorylineLedger(existing, signals, cycle, registry) {
  const reg = new Map((Array.isArray(registry) ? registry : []).filter(e => e && e.id).map(e => [e.id, e]));
  const h = (existing[0] && existing[0].length ? existing[0] : STORYLINE_LEDGER_HEADERS).map(c => String(c).trim());
  const idx = {}; h.forEach((c, i) => { idx[c] = i; });
  const byId = new Map();
  existing.slice(1).forEach((r, i) => {
    const id = String(r[idx.StorylineId] || '').trim();
    if (id) byId.set(id, { r, sheetRow: i + 2 });
  });
  const num = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
  const mergeList = (curStr, add) => {
    const list = Array.from(new Set(String(curStr || '').split(',').map(x => x.trim()).filter(Boolean)));
    for (const a of (add || [])) if (!list.includes(a) && list.length < LEDGER_LIST_CAP) list.push(a);
    return list.join(',');
  };
  const statusFor = (s, prev) => {
    const e = reg.get(s.slug);
    if (e) return e.status === 'closed' ? 'closed' : 'open';
    if (s.advanced + s.opened > 0) return 'open';
    if (s.closed > 0) return 'closed';
    return prev || 'open';   // reference-only weeks never flip status
  };
  const updates = [], appends = [];
  const covered = new Set();
  for (const s of signals) {
    covered.add(s.slug);
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
          case 'FirstCycle':  return String((reg.get(s.slug) && reg.get(s.slug).startCycle) || cycle);
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
  // Registry entries nobody covered this week: the row still exists and its
  // status still follows the engine.
  for (const e of reg.values()) {
    if (covered.has(e.id)) continue;
    const status = e.status === 'closed' ? 'closed' : 'open';
    const cur = byId.get(e.id);
    if (cur) {
      if (String(cur.r[idx.Status] || '').trim() === status) continue;
      const row = cur.r.slice();
      while (row.length < h.length) row.push('');
      row[idx.Status] = status;
      updates.push({ sheetRow: cur.sheetRow, row });
    } else {
      appends.push(h.map(col => {
        switch (col) {
          case 'StorylineId': return e.id;
          case 'FirstCycle':  return String(e.startCycle || cycle);
          case 'LastCycle':   return '';
          case 'Status':      return status;
          case 'Advanced': case 'Opened': case 'Closed': case 'Referenced': case 'Articles': return 0;
          case 'Hoods':       return (e.hoods || []).slice(0, LEDGER_LIST_CAP).join(',');
          case 'Desks':       return (e.desks || []).slice(0, LEDGER_LIST_CAP).join(',');
          default:            return '';
        }
      }));
    }
  }
  return { updates, appends };
}

function loadStorylineRegistry(cycle) {
  try {
    const signal = JSON.parse(fs.readFileSync(path.join(ROOT, 'output', 'desk_signal_c' + cycle + '.json'), 'utf8'));
    return Array.isArray(signal.storylineRegistry) ? signal.storylineRegistry : [];
  } catch (_) { return []; }
}

async function stepSignals(cycle) {
  console.log('--- step 6b: storyline signals → Storyline_Ledger ---');
  const registry = loadStorylineRegistry(cycle);
  const all = aggregateStorylineSignals(loadStagedSetExcludingCanonViolations(cycle).concat(loadArcSeeds(cycle)));
  // Sidecars staged before engine.270 still carry `hood-citizen-kind` slugs.
  // They are not storylines; they stay in the signal file as a count only.
  const signals = all.filter(s => isEngineStorylineId(s.slug));
  const retired = all.length - signals.length;
  if (retired) console.log(retired + ' retired-format slug(s) ignored (not engine storylines)');
  if (!registry.length) console.log('WARNING: no storyline registry in desk_signal_c' + cycle + '.json — status cannot follow the engine this run');
  const outPath = path.join(ROOT, 'output', 'storyline_signal_c' + cycle + '.json');
  fs.writeFileSync(outPath, JSON.stringify({ cycle: String(cycle), signals, registry: registry.map(e => ({ id: e.id, status: e.status, stage: e.stage })), retiredSlugsIgnored: retired }, null, 2));
  console.log(signals.length + ' storyline(s) → ' + path.relative(ROOT, outPath));
  for (const s of signals.slice(0, 8)) {
    console.log('  ' + s.slug + ': ' + s.advanced + ' advanced / ' + s.opened + ' opened / ' +
      s.closed + ' closed / ' + s.referenced + ' referenced (' + s.articles.length + ' article(s))');
  }
  if (!signals.length && !registry.length) return { signals: 0, written: 0 };
  if (!APPLY) {
    console.log('(dry-run) would merge ' + signals.length + ' coverage signal(s) and ' + registry.length +
      ' registry entr(ies) into ' + STORYLINE_LEDGER_TAB);
    return { signals: signals.length, written: 0 };
  }
  const sheets = require(path.join(ROOT, 'lib', 'sheets'));
  const data = await sheets.getRawSheetData(STORYLINE_LEDGER_TAB);
  const { updates, appends } = mergeStorylineLedger(data, signals, cycle, registry);
  // startCol is 0-INDEXED (lib/sheets.columnIndexToLetter): 0 = col A. Passing 1
  // here wrote the 12-value row at B..M and left the stale slug in A, so every
  // cross-week update shifted the row one column right (5 rows corrupted on the
  // 2026-08-29 run; same class as the S366 engine82 incident).
  for (const u of updates) await sheets.updateRangeByPosition(STORYLINE_LEDGER_TAB, u.sheetRow, 0, [u.row]);
  if (appends.length) await sheets.appendRows(STORYLINE_LEDGER_TAB, appends);
  console.log(updates.length + ' row(s) updated, ' + appends.length + ' appended to ' + STORYLINE_LEDGER_TAB);
  return { signals: signals.length, written: updates.length + appends.length };
}

// ---------------------------------------------------------------------------
// Steps 1–4 — the editorial seats (built 2026-08-05, narrator design adopted;
// docs/research/2026-08-04-mags-as-narrator.md verdict `adopt`).
//
// Model routing: audit rides google/gemini-3.7-flash (the gate's proven
// independent-family reviewer, ~$0.06); narration is the ONE voice-critical
// surface → Anthropic claude-sonnet-4-6 (the desk-map "Sonnet bought no
// quality" finding was about desk articles behind an agent stance; the Pulse
// IS the voice product). Audit + narrate write local artifacts only, so they
// run without --apply; publish is the canon door and is --apply-gated.
// ---------------------------------------------------------------------------
const AUDIT_MODEL = arg('--audit-model', 'google/gemini-3.7-flash');
// Sonnet 5.5 since 2026-10-01 (research.28: +1.5/+1.0 blind over 4.6, clean on facts and length,
// per-token cheaper; docs/research/2026-10-01-model-fit-open-character-results.md).
const NARRATOR_MODEL = arg('--narrator-model', 'anthropic/claude-sonnet-5.5');

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

// infrastructure.7 (2026-08-20): the narrator keeps the SAME model — the routing
// note above is a deliberate voice decision, not a cost one — and only changes
// rail, onto OpenRouter's Anthropic-compatible /v1/messages endpoint. Rates are
// exact pass-through. NARRATOR_PROVIDER=anthropic reverts to the direct key.
// A bare slug passed via --narrator-model is normalised to the OpenRouter form
// so the old flag value keeps working.
const NARRATOR_PROVIDER = process.env.NARRATOR_PROVIDER || 'openrouter';
function anthropicSlug(model) {
  if (NARRATOR_PROVIDER === 'anthropic') return String(model).replace(/^anthropic\//, '').replace(/(\d)\.(\d)/, '$1-$2');
  return String(model).includes('/') ? model : 'anthropic/' + String(model).replace(/-(\d)-(\d)$/, '-$1.$2');
}
async function anthropicChat(model, system, user, maxTokens) {
  const Anthropic = require('@anthropic-ai/sdk');
  let client;
  if (NARRATOR_PROVIDER === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } else {
    if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing');
    client = new Anthropic({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api' });
  }
  const msg = await client.messages.create({ model: anthropicSlug(model), max_tokens: maxTokens, system,
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
  'The word "cycle" is the city\'s canonical time unit and engine NUMBERS are ordinary journalism (newsroom rule) — neither is engine-verbiage.',
  'A council member\'s district is the SEAT they hold, not the neighborhood they live in: never judge a district claim from the ledger home neighborhood.',
  'Scene texture (weather, unnamed street life, color) is NEVER a failure — only contradiction is.',
  'Reply STRICT JSON only: {"verdict":"...","failures":[{"what":"...","class":"citizen-bending|data-misrepresentation|engine-verbiage|unsupported-claim","why":"..."}]}'
].join('\n');

// UNDOCKED is the city's serialized reality show (plan 2026-08-07-spacemolt-game-show). The audit's
// ground truth is the world summary, which carries no show record: C109/C110 failed the digest as
// invented (the pilots "were" a principal and a nurse) and C111 flagged the show's own scoring words
// as engine leakage. The board is the show's authoritative record, so an UNDOCKED piece is audited
// against it.
function undockedGroundTruth(rows) {
  const board = (rows || []).filter(r => r && r.Holder);
  if (!board.length) return '';
  return 'UNDOCKED is a serialized in-world reality program the city watches: real citizens fly a ship each episode and are scored. ' +
    'Its own scoring words (flights, episodes, standings, credits, combat, mishaps, magnitude, cycles led, streak) are in-world, not engine vocabulary, ' +
    'and a citizen who flies is still the citizen the ledger says — flying is not bending them. Raw snake_case identifiers, field names and prompt ' +
    'scaffolding in prose remain engine-verbiage. The board is as of this audit and standings move every episode: a daily written earlier in the week may state an earlier standing, which is not a violation — only the weekly digest is held to these totals.\nBOARD (authoritative for who flew and their totals):\n' +
    board.map(r => r.Rank + '. ' + r.Holder + (r.POPID ? ' (' + r.POPID + ')' : '') + ' — ' + r.Episodes + ' episodes, ' + r.CreditsTotal +
      ' credits, combat ' + r.CombatTotal + ', mishaps ' + r.MishapTotal + ', best magnitude ' + r.BestMagnitude + ', cycles led ' + r.CyclesLed +
      ', streak ' + r.CurrentStreak + ', last aired C' + r.LastAiredCycle).join('\n');
}

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
    ...(deskSystem(s.desk) === 'undocked' ? ['', '=== UNDOCKED SHOW RECORD (authoritative for the show) ===', undockedGroundTruth((readJsonSafe(path.join(ROOT, 'output', 'spacemolt-show', 'standings.json')) || {}).rows) || '(board missing)'] : []),
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
  // pipeline.80 (codex Saturday-readers review hunt 4): the floor's automatic mention-only
  // entries are indexing, not reporting — they never move the rank. A floor entry the weekly
  // pilot credit promoted to `subject` still counts (it keeps floor:true).
  const counted = (intake.names || []).filter(n => !(n && n.floor === true && n.role === 'mentioned'));
  return 3 * moves + refs
    + 0.5 * counted.length
    + (auditRow && auditRow.verdict === 'accurate' ? 2 : 0);
}
function primarySlug(entry) {
  const st = (entry.sidecar.intake && entry.sidecar.intake.storylines) || [];
  const mover = st.find(s => s.verb !== 'referenced');
  return (mover || st[0] || {}).slug || null;
}

// research.29 Move 5 (builder 2026-10-16, ruling 2: "whoever is the trending
// journalist … and likely what Mags would pick up on Saturday to combine all
// the angles to give citizens that are correctly crossing over their
// attention"). Detection is code; the framing stays in the narrator's charge
// (detector-framer split). A crossover = one citizen present in pieces from
// two or more of the paper's systems in the same cycle — Eric Taveras in Nia's
// UNDOCKED recap and in the sports desk's week; Clarissa Dane the DA on the
// board. Present = named in the piece's INTAKE, or the full name in the
// article body (INTAKE is often empty on the daily solos; the body is what
// printed). Candidates are bounded: every INTAKE name across the set plus the
// UNDOCKED board's holders. In curation a crossing citizen is worth a storyline
// move on the tie-break INSIDE a grade — the grade still leads (pipeline.79).
const SYSTEM_OF_DESK = { 'undocked-digest': 'undocked' };
function deskSystem(desk) {
  const d = String(desk || '').toLowerCase().trim();
  return SYSTEM_OF_DESK[d] || d || 'unknown';
}
function undockedBoardCandidates() {
  const s = readJsonSafe(path.join(ROOT, 'output', 'spacemolt-show', 'standings.json'));
  return ((s && s.rows) || []).filter(r => r.Holder && r.POPID)
    .map(r => ({ name: String(r.Holder).trim(), popid: String(r.POPID).trim() }));
}
function crossoverCitizens(set, extraCandidates) {
  const keyOf = c => (c.popid ? String(c.popid).toUpperCase() : 'name:' + String(c.name).toLowerCase());
  const cands = new Map();
  const add = c => { if (c && c.name) { const k = keyOf(c); if (!cands.has(k)) cands.set(k, { name: String(c.name).trim(), popid: c.popid || null }); } };
  for (const e of set) for (const n of ((e.sidecar.intake && e.sidecar.intake.names) || [])) add(n);
  for (const c of (extraCandidates || [])) add(c);
  const out = [];
  for (const [k, c] of cands) {
    const pieces = [];
    for (const e of set) {
      const names = (e.sidecar.intake && e.sidecar.intake.names) || [];
      const inIntake = names.find(n => n && n.name && keyOf(n) === k);
      const body = String(e.text || '').replace(/## INTAKE[\s\S]*$/, '');
      if (!inIntake && !body.includes(c.name)) continue;
      pieces.push({ stem: e.stem, desk: e.sidecar.desk || '', system: deskSystem(e.sidecar.desk),
        byline: e.sidecar.byline || '', role: inIntake ? (inIntake.role || 'named') : 'named-in-body' });
    }
    const systems = [...new Set(pieces.map(p => p.system))];
    if (systems.length >= 2) out.push({ name: c.name, popid: c.popid, systems, pieces });
  }
  return out.sort((a, b) => b.systems.length - a.systems.length || b.pieces.length - a.pieces.length || a.name.localeCompare(b.name));
}
// Move 5 read (Sat 10-17): every crossing had one printed side, so the narration sent readers to
// Mason Ortega's pages and Nia's reporting, neither of which printed. The narrator names a crossing
// only where two systems both printed it; the whole-set list still drives the curation tie-break.
// UNDOCKED's weekly digest holds a standing Saturday seat (builder 2026-10-18: "make sure undocked gets
// coverage that gets citizens potential usage" — C111's playoff MVP and board leader earned 0 because
// the digest, where the weekly pilot credit tags every pilot a subject, lost the cut on grade 3/4
// against ten 4/4 filings). Print is still the only door to usage: the seat gets the digest PRINTED,
// it earns nothing by being exempt. Canon-violations and unaudited filings never reach `ranked`, so a
// failed digest still sits out. The paper stays at `top`: a full list gives up its last pick.
function reserveDigestSeat(selected, ranked, top) {
  const digest = (ranked || []).find(r => r.desk === 'undocked-digest');
  if (!digest || selected.includes(digest.stem)) return { selected, stem: null };
  const next = selected.length >= top ? selected.slice(0, top - 1) : selected.slice();
  next.push(digest.stem);
  return { selected: next, stem: digest.stem };
}
function printedCrossovers(crossovers, selected) {
  const printed = new Set(selected || []);
  return (crossovers || []).map(x => {
    const pieces = x.pieces.filter(p => printed.has(p.stem));
    return Object.assign({}, x, { pieces, systems: [...new Set(pieces.map(p => p.system))] });
  }).filter(x => x.systems.length >= 2);
}
function crossoverBonus(entry, crossovers) {
  let n = 0;
  for (const x of (crossovers || [])) if (x.pieces.some(p => p.stem === entry.stem)) n++;
  return 2 * n;
}
function crossoverBlock(crossovers) {
  if (!crossovers || !crossovers.length) return '';
  return 'CITIZENS CROSSING THE CITY\'S SYSTEMS THIS WEEK (one person in more than one desk\'s reporting — ' +
    'thread those angles into one life; the crossing is where the city becomes one city):\n' +
    crossovers.map(x => '- ' + x.name + ' — ' + x.systems.map(sys =>
      sys + ' (' + x.pieces.filter(p => p.system === sys).map(p => p.byline || 'staff').filter((v, i, a) => a.indexOf(v) === i).join(', ') + ')'
    ).join('; ')).join('\n') + '\n\n';
}

async function stepCurate(cycle) {
  console.log('--- step 2: curation ---');
  const scorecard = readJsonSafe(path.join(ROOT, 'output', 'eic_scorecard_c' + cycle + '.json'));
  if (!scorecard) throw new Error('no eic_scorecard_c' + cycle + '.json — run --step audit first');
  const byStem = {}; for (const a of scorecard.articles) byStem[a.stem] = a;
  const set = loadStagedSet(cycle);
  const top = Number(arg('--top', 9));
  // codex .79 #2: only filings the EIC audit actually read are eligible — a stem staged or renamed
  // after the audit has no verdict and waits for next week's.
  const unaudited = set.filter(e => !byStem[e.stem]).map(e => e.stem);
  for (const st of unaudited) console.log('  [skip] not in the EIC scorecard: ' + st);
  // research.29 Move 5: citizens crossing systems this week, from the whole staged set
  const crossovers = crossoverCitizens(set, undockedBoardCandidates());
  for (const x of crossovers) console.log('  [crossover] ' + x.name + ' — ' + x.systems.join(' + ') + ' (' + x.pieces.length + ' piece(s))');
  const ranked = set
    .filter(e => byStem[e.stem] && byStem[e.stem].verdict !== 'canon-violation')
    .map(e => ({ stem: e.stem, byline: e.sidecar.byline || '', desk: e.sidecar.desk || '',
      grade: e.grade == null ? null : e.grade,
      score: curationScore(e, byStem[e.stem]) + crossoverBonus(e, crossovers), slug: primarySlug(e), verdict: byStem[e.stem].verdict }))
    // pipeline.79: the week's best-graded work leads; the storyline/names/audit count breaks
    // ties; an ungraded filing ranks below every graded one.
    .sort((a, b) => ((b.grade == null ? -1 : b.grade) - (a.grade == null ? -1 : a.grade)) || (b.score - a.score));
  // Storyline variety works INSIDE a grade (codex .79 #2): a lower grade never takes a slot from a
  // higher one for being on a fresh thread. Per grade: unique threads first, then that grade's rest.
  const seen = new Set(); let selected = [];
  const tiers = [...new Set(ranked.map(r => r.grade))];
  for (const g of tiers) {
    const tier = ranked.filter(r => r.grade === g);
    for (const r of tier) {
      if (selected.length >= top) break;
      if (r.slug && seen.has(r.slug)) continue;
      if (r.slug) seen.add(r.slug);
      selected.push(r.stem);
    }
    for (const r of tier) {
      if (selected.length >= top) break;
      if (!selected.includes(r.stem)) selected.push(r.stem);
    }
  }
  const seat = reserveDigestSeat(selected, ranked, top);
  selected = seat.selected;
  if (seat.stem) console.log('  [seat] UNDOCKED weekly digest seated: ' + seat.stem);
  const excluded = set.length - ranked.length - unaudited.length;
  const out = { cycle: String(cycle), top, selected, ranked, excludedCanonViolations: excluded, unaudited, crossovers, digestSeat: seat.stem };
  const p = path.join(ROOT, 'output', 'edition_curation_c' + cycle + '.json');
  fs.writeFileSync(p, JSON.stringify(out, null, 2));
  for (const r of ranked) console.log((selected.includes(r.stem) ? '  PRINT ' : '        ') + (r.grade == null ? '-  ' : r.grade + '/4') + ' ' + String(r.score).padStart(5) + '  ' + r.stem);
  console.log(selected.length + ' selected of ' + set.length + ' staged (' + excluded + ' canon-violation excluded) → ' + path.relative(ROOT, p));
  return out;
}

// ---------------------------------------------------------------------------
// Step 3 — narration. Mags narrates the cycle from the curated set — one voice
// on the Pulse, seventeen in canon; she quotes her own staff's reporting.
// ---------------------------------------------------------------------------
// In-world clock for a cycle number: year = ceil(cycle/52), cycle-of-year = ((cycle-1)%52)+1 —
// the same formula as buildDeskPackets deriveDeskCalendar_ (C110 = Y3C6, C111 = Y3C7). The
// The hard-coded Y2C prefix this replaced titled every Pulse from C103 on with the wrong year.
function simClock(cycle) { const c = Number(cycle); return 'Y' + Math.ceil(c / 52) + 'C' + (((c - 1) % 52) + 1); }

const NARRATOR_CHARGE = (cycle, crossoverCount) => [
  'You are Mags Corliss, 56, Editor-in-Chief of the Bay Tribune and the narrator of Oakland\'s week.',
  'You are writing THE CYCLE PULSE for cycle ' + simClock(cycle) + ' — not assembling an edition, narrating a city.',
  'You have your staff\'s published reporting below. Draw on it the way an editor\'s column draws on the',
  'paper: quote your reporters BY NAME when their reporting carries a moment ("as Dana Reeve reported...").',
  'Never restate a number as the story — the number is the cause; the people living it are the content.',
  'Never use system or engine vocabulary. Never use real-world dates — the clock is ' + simClock(cycle) + '.',
  'Thread the week: what moved, what contradicts, what nobody has answered yet. End on what you\'re',
  'watching next week. 900-1200 words, plain prose, no headers, no bullet lists.'
].concat(crossoverCount ? [
  // research.29 Move 5 (builder ruling 2): the editor combines the angles for a citizen crossing systems
  'When one citizen appears in more than one desk\'s reporting this week, draw those angles together into',
  'one life — a ballplayer in a cockpit is still the ballplayer, the district attorney on a game show is',
  'still the DA. Name what the crossing means for them and for the city. The crossing is yours to name.'
] : []).join('\n');

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
  // research.29 Move 5: the crossing citizens the curation step found, ahead of the reporting
  const crossovers = printedCrossovers(curation.crossovers, curation.selected);
  const pulse = await anthropicChat(NARRATOR_MODEL, NARRATOR_CHARGE(cycle, crossovers.length),
    // 3600, not 2200: Sonnet 5.5 reasons before it writes and OpenRouter cannot turn that off,
    // so ~800 thinking tokens share this cap with the ~1500-token narration (research.28 run).
    crossoverBlock(crossovers) + 'THE WEEK\'S REPORTING (your staff, already cleared and published):\n\n' + material, 3600);
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
    'THE CYCLE PULSE — ' + simClock(cycle),
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
    '— The Bay Tribune, ' + simClock(cycle)
  ].join('\n');
  const outPath = path.join(ROOT, 'editions', 'cycle_pulse_c' + cycle + '.txt');
  fs.writeFileSync(outPath, edition + '\n');
  console.log('edition assembled → ' + path.relative(ROOT, outPath) + ' (' + curation.selected.length + ' article(s) + narration)');
  if (!APPLY) {
    console.log('(dry-run) would run:');
    console.log('  node scripts/ingestEdition.js ' + path.relative(ROOT, outPath) + ' --cycle ' + cycle);
    console.log('  nlm source add <permanent notebookId> --file ' + path.relative(ROOT, outPath));
    return { published: false };
  }
  const { spawnSync } = require('child_process');
  const ing = spawnSync('node', [path.join(ROOT, 'scripts', 'ingestEdition.js'), outPath, '--cycle', String(cycle)], { stdio: 'inherit' });
  if (ing.status !== 0) throw new Error('ingestEdition failed (exit ' + ing.status + ')');
  const config = readJsonSafe(path.join(ROOT, 'config', 'notebooklm.json')) || {};
  if (!config.notebookId) throw new Error('config/notebooklm.json missing notebookId (permanent notebook)');
  const { nlm } = require(path.join(ROOT, 'scripts', 'notebooklmPush'));
  const add = nlm(['source', 'add', config.notebookId, '--file', outPath, '--title', 'The Cycle Pulse — ' + simClock(cycle), '--wait']);
  // nlm() returns {ok, out} (see notebooklmPush.js) — this checked {status,
  // stdout, stderr}, which don't exist on that shape, so a successful push
  // reported "Fatal: ... undefined" every time. Found live 2026-08-15 when a
  // real publish threw despite the source landing in the notebook correctly.
  if (!add.ok) throw new Error('NotebookLM source add failed: ' + String(add.out || '').slice(0, 200));
  console.log('published: canon ingest + permanent notebook (' + config.notebookName + ')');
  // pipeline.79 (codex .79 #3): the canon door completed for exactly these stems — the only thing
  // that lets stepSheets write byline-published (MEDIA tier credit).
  fs.writeFileSync(path.join(ROOT, 'output', 'edition_published_c' + cycle + '.json'), JSON.stringify({
    cycle: String(cycle), selected: curation.selected, edition: path.relative(ROOT, outPath),
    editionSha256: crypto.createHash('sha256').update(fs.readFileSync(outPath)).digest('hex'),
    publishedAt: new Date().toISOString() }, null, 2));
  const sourceIdMatch = String(add.out || '').match(/Source ID:\s*(\S+)/);
  const sourceId = sourceIdMatch ? sourceIdMatch[1] : null;
  // S429 — the edition is canon the moment it lands; record it in the fail-closed source
  // policy or notebooklmCanonSourcesValidate.js reports it unclassified (C104 + C105 were).
  const { recordCanonSource } = require(path.join(ROOT, 'scripts', 'notebooklmPush'));
  recordCanonSource(sourceId, 'allowedPublishedSourceIds', {
    title: 'The Cycle Pulse — ' + simClock(cycle),
    classification: 'published',
    reason: 'Published Cycle Pulse edition, added to the permanent notebook by the Saturday run (cron-saturday-run.js stepPublish).',
    evidence: [path.relative(ROOT, outPath)],
  });
  if (config.saturdayAudio !== false) {
    try {
      const { generateAndDeliverEditionAudio } = require(path.join(ROOT, 'scripts', 'notebooklmPush'));
      const audio = await generateAndDeliverEditionAudio({
        notebookId: config.notebookId,
        sourceId: sourceId,
        cycle: cycle,
        config: config,
        format: config.audioFormat || 'deep_dive',
        length: 'long',
        label: 'The Cycle Pulse — ' + simClock(cycle),
        focus: 'The Cycle Pulse edition C' + cycle,
        content: '🎧 **The Cycle Pulse — ' + simClock(cycle) + '**\nSaturday edition audio · deep_dive/long',
        driveDest: config.driveDest || 'edition',
      });
      if (audio && audio.audioPath) {
        console.log('saturday audio → ' + path.relative(ROOT, audio.audioPath));
      }
    } catch (e) {
      console.log('SATURDAY AUDIO SKIPPED (non-blocking): ' + e.message);
    }
  }
  // pipeline.79: byline-published rows are written by stepSheets from the curated set.
  return { published: true, path: outPath };
}

// ---------------------------------------------------------------------------
// pipeline.62 — rate the edition that was just published.
//
// This ran as a manual step and so ran never: Edition_Coverage_Ratings stopped
// at C102 and C103/C104 published with no media-feedback signal at all, which
// nothing noticed until pre-flight was chased by hand. Hanging it off the
// edition artifact rather than a second cron line means it cannot fire before
// the file exists or drift onto a different cycle's edition.
//
// Deliberately NON-FATAL to the chain. Publish has already succeeded by this
// point — canon is ingested and the notebook is pushed — so throwing here would
// strand sweep/sheets/signals over a ratings row. The failure is instead made
// loud in the log AND independently caught next cycle: preflightInputCheck.js
// reports missing coverage for the previous cycle, so a silent miss is not
// possible the way it was for C103/C104.
async function stepCoverage(cycle) {
  console.log('--- step 4b: edition coverage ratings ---');
  const editionPath = path.join(ROOT, 'editions', 'cycle_pulse_c' + cycle + '.txt');
  if (!fs.existsSync(editionPath)) {
    console.error('[COVERAGE SKIPPED] no edition at ' + path.relative(ROOT, editionPath) + ' — publish must run first.');
    return { rated: false, reason: 'no-edition' };
  }
  const { spawnSync } = require('child_process');
  const r = spawnSync('node',
    [path.join(ROOT, 'scripts', 'rateEditionCoverage.js'), editionPath, APPLY ? '--apply' : '--dry-run'],
    { stdio: 'inherit' });
  if (r.status !== 0) {
    // exit 2 = the rater's own gates: no articles, or nothing resolved to a
    // domain. Both mean the edition format moved and the rater needs a look.
    console.error('[COVERAGE FAIL] rateEditionCoverage exited ' + r.status + ' for c' + cycle + '.');
    console.error('  The edition published fine; its media-feedback signal did NOT land.');
    console.error('  Next pre-flight will report coverage missing for c' + cycle + '.');
    return { rated: false, reason: 'rater-exit-' + r.status };
  }
  console.log('coverage ratings ' + (APPLY ? 'written' : 'dry-run only') + ' for c' + cycle);
  return { rated: true };
}

// ---------------------------------------------------------------------------
async function main() {
  // --cycle overrides; otherwise the single source of truth (engine.81 —
  // freshest world_summary; noArgv because this script parses its own flags
  // and getCurrentCycle's argv scan would eat e.g. `--top 9`). Exits loudly
  // on failure — a cron must never run against a guessed cycle.
  const cycle = arg('--cycle', null) || require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ noArgv: true });
  const step = arg('--step', null);
  console.log('Saturday run — c' + cycle + (APPLY ? ' [APPLY]' : ' [dry-run]'));
  const dispatch = {
    audit: () => stepAudit(cycle), curate: () => stepCurate(cycle),
    narrate: () => stepNarrate(cycle), publish: () => stepPublish(cycle),
    coverage: () => stepCoverage(cycle),
    sweep: () => stepSweep(cycle), sheets: () => stepSheets(cycle),
    signals: () => stepSignals(cycle)
  };
  if (step) {
    if (!dispatch[step]) throw new Error('unknown --step "' + step + '" (want audit|curate|narrate|publish|coverage|sweep|sheets|signals)');
    await dispatch[step]();
  } else {
    // Plan §Phase 3 order: audit → curate → narrate → publish → sweep → sheets → signals.
    // pipeline.62 inserts coverage straight after publish — it reads the file
    // publish just wrote, and it must not gate the steps behind it.
    await stepAudit(cycle);
    await stepCurate(cycle);
    await stepNarrate(cycle);
    // engine.114 (S427): stepPublish can throw on either armed gate — the
    // ingestEdition exit-code check or the NotebookLM `source add` check —
    // and until now an uncaught throw here aborted every step below it.
    // coverage/sweep/signals read the staged set and the scorecard, never the
    // edition file. stepSheets reads the publish receipt (edition_published_c<N>.json)
    // since 2026-10-16: with no receipt it writes no coverage or byline-published
    // credit and logs the recover line, so a canon-door failure still has no reason
    // to take Storyline_Ledger down with it. Surface it loud, keep going, still
    // fail the run at the end so this doesn't become a new silent false-clear.
    let publishErr = null;
    try {
      await stepPublish(cycle);
    } catch (e) {
      publishErr = e;
      const recover = 'node scripts/cron-saturday-run.js --cycle ' + cycle + ' --step publish --apply';
      console.error('[PUBLISH FAILED] ' + e.message);
      console.error('  Canon door did not complete; coverage/sweep/sheets/signals will still run.');
      console.error('  Recover: ' + recover);
      try {
        const { sendDiscordText } = require(path.join(ROOT, 'scripts', 'notebooklmPush'));
        await sendDiscordText('🚨 **Saturday canon door failed (c' + cycle + ')**: ' + e.message +
          '\nRecover: `' + recover + '`');
      } catch (e2) {
        console.error('[DISCORD PING FAILED] (non-blocking): ' + e2.message);
      }
    }
    await stepCoverage(cycle);
    await stepSweep(cycle);
    await stepSheets(cycle);
    await stepSignals(cycle);
    if (publishErr) throw publishErr;
  }
}

if (require.main === module) {
  main().catch(err => { console.error('[saturday] Fatal: ' + err.message); process.exit(1); });
}

module.exports = { loadStagedSet, loadArcSeeds, articleCustomId, articleDoc, usageRowsFor, printedStems, printedOnly, citationSnippet, ROLE_TO_USAGE,
  aggregateStorylineSignals, mergeStorylineLedger, STORYLINE_LEDGER_HEADERS, verifyStagedProof,
  isCodeRenderedBrief, stagedGrade, bylinePublishedRows, bylineResolves,
  auditOne, loadLedgerProfiles, worldSummaryText, deskSystem, crossoverCitizens, printedCrossovers, reserveDigestSeat, undockedGroundTruth, crossoverBonus, crossoverBlock, undockedBoardCandidates, NARRATOR_CHARGE, curationScore };
