#!/usr/bin/env node
/**
 * Single-Desk Headless Run (chain) — scripts/cron-desk-run.js
 *
 * Task 4 of docs/plans/2026-07-20-headless-newsroom-pipeline.md. The atomic unit
 * of the continuous newsroom: ONE journalist wakes, writes, is canon-gated, and
 * the result is routed. Chains the two proven pieces:
 *   1. cron-desk-writer.js  (writer-worker; model per desk-model-map.json)
 *   2. cron-rhea-gate.js    (independent headless Rhea canon/fact gate)
 * then routes: pass -> output/cron-compare/published/ ; flagged -> .../flagged/.
 *
 * This is glue over verified scripts — no model logic of its own. In Phase 2 a
 * per-wake cron calls this per active journalist; "published" articles then
 * ingest to canon (ingest mechanism = open question in the plan).
 *
 * Usage:
 *   node scripts/cron-desk-run.js --desk sports
 *   node scripts/cron-desk-run.js --desk business --gate-model haiku
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const COMPARE = path.join(ROOT, 'output', 'cron-compare');
const PUBLISHED = path.join(COMPARE, 'published');
const FLAGGED = path.join(COMPARE, 'flagged');
const STAGED = path.join(COMPARE, 'staged');   // Phase 2 probation wall (S332): M–F articles stage here, NOT canon-ingested
const SAMPLES = path.join(COMPARE, 'samples'); // --no-gate ungated review samples (S332): never canon

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const DESK = arg('--desk', 'sports');
const GATE_MODEL = arg('--gate-model', 'sonnet');   // authoritative gate; 'haiku' to cost-test
// --no-gate (S332): skip the Rhea gate for SAMPLE generation only. The gate runs
// on `claude -p` (Claude Code / subscription), so it cannot run while Mike's
// subscription usage is depleted; the writer + quotes run on raw API keys. Ungated
// output is NOT canon — it routes to samples/ marked ungated, for review only.
const NO_GATE = process.argv.includes('--no-gate');

const log = (...a) => console.log('[run]', new Date().toISOString(), ...a);

function detectCycle() {
  try {
    const nums = fs.readdirSync(path.join(ROOT, 'output'))
      .map(f => (f.match(/^world_summary_c(\d+)\.md$/) || [])[1])
      .filter(Boolean).map(Number);
    if (nums.length) return String(Math.max(...nums));
  } catch (_) {}
  return 'current';
}
function deskRoute(desk) {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'desk-model-map.json'), 'utf8'));
  return m[desk] || m._default;
}
const slug = m => m.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }

// ===========================================================================
// PHASE 2 — daily writer-wake chain (--wake). Assembles the six layers over the
// pieces proven in Phase 1 + W5. Additive: without --wake, main() below runs the
// original Task-4 write→gate→route unchanged.
// ===========================================================================

// desk_signal lane → Bay_Tribune_Oakland beatDomain(s) for byline selection.
// The civic lane spans the whole civic-affairs family of beats (buildBylineRoster
// classifies RoleType into these), so rotation has real depth. sports is Paulson's
// domain (excluded from the Tribune byline pool) and carries no popids anyway.
const LANE_DOMAINS = {
  civic:    ['CIVIC', 'HEALTH', 'SAFETY', 'INFRASTRUCTURE', 'EDUCATION', 'ENVIRONMENT'],
  culture:  ['CULTURE', 'COMMUNITY'],
  business: ['ECONOMIC', 'GENERAL'],
  sports:   []
};
const QUOTE_CITIZEN_CAP = 4;   // per wake — keep the DeepSeek quote pre-pass cheap

// Extract the citizenVoice --batch JSON array from stdout. The `[dotenv@…]`
// startup banner also prints to stdout with inline brackets, so a greedy
// /\[[\s\S]*\]/ grabs the banner and fails to parse. JSON.stringify(_,null,2)
// puts the array's own `[` and `]` each on their own line — the banner never
// does — so anchor on the bare-bracket lines.
function parseBatchQuotes(out) {
  const lines = String(out).split('\n');
  let end = -1;
  for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].trim() === ']') { end = i; break; } }
  let start = -1;
  for (let i = end; i >= 0; i--) { if (lines[i].trim() === '[') { start = i; break; } }
  if (start < 0 || end <= start) return [];
  let parsed;
  try { parsed = JSON.parse(lines.slice(start, end + 1).join('\n')); } catch (_) { return []; }
  return (Array.isArray(parsed) ? parsed : []).filter(q => q.quote && !q.fallback);
}

// Least-used-wins rotation: tally finalAssignment bylines across recent shadow logs.
function readBylineUsage() {
  const usage = {};
  let logs = [];
  try {
    logs = fs.readdirSync(path.join(ROOT, 'output'))
      .filter(f => /^byline_shadow_log_c\d+\.json$/.test(f))
      .sort().slice(-6);
  } catch (_) {}
  for (const f of logs) {
    const j = readJson(path.join(ROOT, 'output', f));
    const rows = Array.isArray(j) ? j : (j && Array.isArray(j.entries) ? j.entries : []);
    for (const r of rows) {
      const name = r && (r.finalAssignment || r.byline || r.assigned);
      if (name) usage[name] = (usage[name] || 0) + 1;
    }
  }
  return usage;
}

// Layer 1 — pick a beat-matched, eligible, POPID-linked byline, least-used first.
async function resolveByline(desk, lane) {
  const { buildBylineRoster } = require(path.join(ROOT, 'scripts', 'engine-auditor', 'bayTribuneRoster'));
  const roster = await buildBylineRoster();
  const domains = LANE_DOMAINS[desk] || [];
  let pool = (roster.included || []).filter(j => j.popid && domains.includes(j.beatDomain));
  if (!pool.length) pool = (roster.included || []).filter(j => j.popid && j.beatDomain === 'GENERAL');
  if (!pool.length) return null;   // no eligible byline — caller handles fallback
  const usage = readBylineUsage();
  pool.sort((a, b) => (usage[a.name] || 0) - (usage[b.name] || 0) || a.name.localeCompare(b.name));
  const pick = pool[0];
  return { name: pick.name, popid: pick.popid, beatDomain: pick.beatDomain, usageCount: usage[pick.name] || 0 };
}

// Layer 4 — collect the lane's affected citizens (distinct POPIDs, capped) and
// their reaction ask (keyed to the entry label). Returns the asks + the source map.
function collectQuoteAsks(lane) {
  const asks = [];
  const seen = new Set();
  for (const e of lane) {
    for (const pop of (e.popids || [])) {
      if (seen.has(pop) || asks.length >= QUOTE_CITIZEN_CAP) continue;
      seen.add(pop);
      asks.push({ pop, ask: 'The Tribune is looking into this in your part of Oakland: "' +
        String(e.label || '').slice(0, 160) + '". Speak about how it touches your life.',
        record: !NO_GATE, maxTokens: 200 });   // S332: --no-gate SAMPLES never write citizen memory (was unconditional record:true — the layer-4 leak Codex caught)
    }
    if (asks.length >= QUOTE_CITIZEN_CAP) break;
  }
  return asks;
}

// Layer 3 — compose the injected state: byline note + lane pointers + real quotes.
// This REPLACES the 40k world_summary blob as the writer's injected state.
function buildLaneState(desk, cycle, lane, byline, quotes) {
  const L = [];
  L.push('## ' + desk.toUpperCase() + ' desk — your lane for cycle ' + cycle);
  L.push('');
  if (byline) {
    // Author-only. Do NOT include the POPID here — a "Name (POP-…)" token reads to
    // the writer as an allowed CITIZEN to name/quote, which invented a fake resident
    // and tripped the canon gate (S332 c102). The byline is who WRITES, never a source.
    L.push('BYLINE (the reporter writing this — write in their voice; NEVER name or quote them in the body): ' + byline.name);
    L.push('');
  }
  L.push('This is your beat\'s signal for the cycle — POINTERS. Reach the raw material yourself');
  L.push('(read the referenced files with your tools for depth). Do NOT invent events not named here.');
  L.push('');
  L.push('### Your storylines (desk_signal lane)');
  for (const e of lane) {
    const tags = [e.kind, e.hood].filter(Boolean).join(' · ');
    L.push('- ' + (e.label || '(no label)') + (tags ? '  [' + tags + ']' : ''));
    L.push('  ref: ' + e.ref);
  }
  L.push('');
  if (quotes && quotes.length) {
    L.push('### Citizen sources for this piece — these are REAL people, already interviewed');
    L.push('Quote FROM these people, by name, when you need a resident voice. Do NOT invent other');
    L.push('residents or attribute a quote to anyone not listed here. If you need no quote, use none —');
    L.push('but never fabricate a source when these are provided.');
    L.push('');
    for (const q of quotes) {
      L.push('- ' + q.name + ' (' + q.pop + '): "' + String(q.quote).replace(/\s+/g, ' ').trim() + '"');
    }
    L.push('');
  } else {
    L.push('### Citizen sources');
    L.push('No pre-interviewed residents this wake. Do NOT invent named residents — write from the');
    L.push('storyline facts and official record only; leave resident reaction as an open question.');
    L.push('');
  }
  return L.join('\n');
}

async function runWake() {
  const cycle = arg('--cycle', null) || detectCycle();
  const signalPath = path.join(ROOT, 'output', 'desk_signal_c' + cycle + '.json');
  const signal = readJson(signalPath);
  if (!signal || !signal.lanes) throw new Error('no desk_signal at ' + path.relative(ROOT, signalPath) + ' — run buildWorldSummary first');

  const lane = signal.lanes[DESK];
  console.log('Daily Writer-Wake — ' + DESK + ' c' + cycle);
  console.log('===================================');
  if (!lane || !lane.length) {   // guarded skip, not a crash (chicago/letters have no lane)
    console.log('[wake] no "' + DESK + '" lane in desk_signal — skipping (not an error).');
    return;
  }
  const route = deskRoute(DESK);
  const draftName = DESK + '_c' + cycle + '_' + slug(route.model) + '.md';
  const draftPath = path.join(COMPARE, draftName);
  const base = draftName.replace(/\.md$/, '');

  // 1. LAYER 1 — byline
  log('resolving byline...');
  const byline = await resolveByline(DESK, lane);
  log('byline: ' + (byline ? byline.name + ' (' + byline.popid + ', ' + byline.beatDomain + ', used ' + byline.usageCount + ')' : 'NONE — fallback, no self-record'));

  // 2. LAYER 4 — citizen quote pre-pass (real POPID-linked voices, recorded PRESS)
  const asks = collectQuoteAsks(lane);
  let quotes = [];
  if (asks.length) {
    log('quote pre-pass: ' + asks.length + ' citizen(s)...');
    const asksPath = path.join(COMPARE, base + '.asks.json');
    fs.mkdirSync(COMPARE, { recursive: true });
    fs.writeFileSync(asksPath, JSON.stringify(asks, null, 2));
    try {
      const out = execFileSync('node', [path.join(ROOT, 'scripts', 'citizenVoice.js'),
        '--batch=' + asksPath, '--cycle=' + cycle], { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
      quotes = parseBatchQuotes(out);
      log('quote parse: ' + quotes.length + ' usable of batch output');
      log('quotes landed: ' + quotes.length + '/' + asks.length + (quotes.length ? ' (' + quotes.map(q => q.name).join(', ') + ')' : ''));
    } catch (e) { log('quote pre-pass failed (non-fatal): ' + e.message); }
  }

  // 3. LAYER 3 — write on-lane (inject the lane + quotes, NOT the 40k blob)
  const stateFile = path.join(COMPARE, base + '.state.md');
  fs.writeFileSync(stateFile, buildLaneState(DESK, cycle, lane, byline, quotes));
  log('writing on lane (' + fs.statSync(stateFile).size + ' B injected state)...');
  execFileSync('node', [path.join(ROOT, 'scripts', 'cron-desk-writer.js'), '--desk', DESK,
    '--state-file', path.relative(ROOT, stateFile)], { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
  if (!fs.existsSync(draftPath)) throw new Error('writer produced no draft at ' + path.relative(ROOT, draftPath));

  // 4. LAYER 2 — gate (existing headless Rhea). Skipped for --no-gate samples
  // (gate needs the subscription; writer/quotes are API-only).
  let rhea = null, pass = false;
  if (NO_GATE) {
    log('gate SKIPPED (--no-gate sample) — output is ungated, NOT canon');
  } else {
    log('gating...');
    try {
      execFileSync('node', [path.join(ROOT, 'scripts', 'cron-rhea-gate.js'), '--draft', path.relative(ROOT, draftPath),
        '--model', GATE_MODEL, '--cycle', cycle], { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
    } catch (_) { /* gate exit 2/3 — verdict json still written */ }
    rhea = readJson(path.join(COMPARE, base + '.rhea.json'));
    pass = rhea && rhea.pass === true;
  }

  // 5. LAYER 5 — THE WALL: stage (probation), never canon-ingest here.
  // --no-gate samples go to samples/ (ungated, review-only, never canon).
  const destDir = NO_GATE ? SAMPLES : (pass ? STAGED : FLAGGED);
  fs.mkdirSync(destDir, { recursive: true });
  const stagedName = (NO_GATE || pass) ? base + (NO_GATE ? '.sample.md' : '.staged.md') : draftName;
  fs.copyFileSync(draftPath, path.join(destDir, stagedName));
  if (NO_GATE) {
    fs.writeFileSync(path.join(SAMPLES, base + '.sample.json'), JSON.stringify({
      status: 'ungated-sample', desk: DESK, cycle, byline: byline ? byline.name : null, bylinePopid: byline ? byline.popid : null,
      article: path.relative(ROOT, path.join(SAMPLES, stagedName)),
      quotesLanded: quotes.length,
      note: 'UNGATED sample (--no-gate, S332): writer+quotes ran on raw API; the Rhea gate was skipped (needs subscription). NOT canon, review-only.',
      builtAt: new Date().toISOString()
    }, null, 2));
  } else if (pass) {
    fs.writeFileSync(path.join(STAGED, base + '.staged.json'), JSON.stringify({
      status: 'staged', desk: DESK, cycle, byline: byline ? byline.name : null, bylinePopid: byline ? byline.popid : null,
      article: path.relative(ROOT, path.join(STAGED, stagedName)),
      note: 'M–F probation wall (S332): retrievable by the Saturday compile ONLY; NOT canon fact. Reporters/sift must not cite staged drafts.',
      stagedAt: new Date().toISOString()
    }, null, 2));
  } else {
    fs.writeFileSync(path.join(FLAGGED, base + '.flags.json'),
      JSON.stringify({ draft: draftName, flags: (rhea && rhea.flags) || [], summary: (rhea && rhea.summary) || 'no rhea verdict' }, null, 2));
  }

  // 6. LAYER 5 — reporter records their own filing (page + gated intake, author-side)
  let selfRecord = null;
  if (byline && pass) {
    const headline = (() => {
      const first = fs.readFileSync(draftPath, 'utf8').split('\n').find(l => l.trim());
      return String(first || '').replace(/^#+\s*/, '').replace(/[*_`]/g, '').slice(0, 100).trim() || (DESK + ' filing c' + cycle);
    })();
    log('reporter self-record: ' + byline.name + ' <- "' + headline + '"');
    try {
      const out = execFileSync('node', [path.join(ROOT, 'scripts', 'citizenVoice.js'),
        '--pop=' + byline.popid, '--record-text=filed: ' + headline, '--cycle=' + cycle],
        { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
      selfRecord = { recorded: true, out: out.trim().slice(-200) };
    } catch (e) { selfRecord = { recorded: false, reason: e.status === 2 ? 'no-dials (fallback)' : e.message }; log('self-record fallback: ' + (selfRecord.reason)); }
  }

  const record = {
    mode: 'wake', desk: DESK, cycle, provider: route.provider, model: route.model, gateModel: GATE_MODEL,
    byline: byline ? { name: byline.name, popid: byline.popid, beatDomain: byline.beatDomain } : null,
    laneEntries: lane.length, quotesRequested: asks.length, quotesLanded: quotes.length,
    disposition: NO_GATE ? 'ungated-sample' : (pass ? 'staged' : 'flagged'),
    rheaPass: rhea ? rhea.pass : null, rheaFlagCount: rhea ? rhea.flagCount : null,
    article: path.relative(ROOT, path.join(destDir, stagedName)),
    selfRecord, ranAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(COMPARE, base + '.wake.json'), JSON.stringify(record, null, 2));
  console.log('\n=== wake disposition: ' + record.disposition.toUpperCase() + ' ===');
  console.log(JSON.stringify(record, null, 2));
}

function main() {
  const cycle = arg('--cycle', null) || detectCycle();
  const route = deskRoute(DESK);
  const draftName = DESK + '_c' + cycle + '_' + slug(route.model) + '.md';
  const draftPath = path.join(COMPARE, draftName);
  const base = draftName.replace(/\.md$/, '');

  console.log('Single-Desk Headless Run — ' + DESK + ' c' + cycle);
  console.log('===================================');
  console.log('write: ' + route.provider + '/' + route.model + ' · gate: ' + GATE_MODEL);

  // 1. WRITE (model resolved from the desk-model-map inside the writer)
  log('writing...');
  execFileSync('node', [path.join(__dirname, 'cron-desk-writer.js'), '--desk', DESK],
    { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
  if (!fs.existsSync(draftPath)) throw new Error('writer produced no draft at ' + path.relative(ROOT, draftPath));

  // 2. GATE (independent Rhea; non-zero exit = flagged/parse, not fatal here)
  log('gating...');
  try {
    execFileSync('node', [path.join(__dirname, 'cron-rhea-gate.js'), '--draft', path.relative(ROOT, draftPath),
      '--model', GATE_MODEL, '--cycle', cycle], { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
  } catch (_) { /* gate exits 2 (flagged) / 3 (parse) — verdict json is still written */ }

  const rhea = readJson(path.join(COMPARE, base + '.rhea.json'));
  const scorecard = readJson(path.join(COMPARE, base + '.scorecard.json'));

  // 3. ROUTE
  const pass = rhea && rhea.pass === true;
  const destDir = pass ? PUBLISHED : FLAGGED;
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(draftPath, path.join(destDir, draftName));
  if (!pass) {
    fs.writeFileSync(path.join(FLAGGED, base + '.flags.json'),
      JSON.stringify({ draft: draftName, flags: (rhea && rhea.flags) || [], summary: (rhea && rhea.summary) || 'no rhea verdict' }, null, 2));
  }

  const record = {
    desk: DESK, cycle, provider: route.provider, model: route.model, gateModel: GATE_MODEL,
    disposition: pass ? 'published' : 'flagged',
    rheaPass: rhea ? rhea.pass : null,
    rheaFlagCount: rhea ? rhea.flagCount : null,
    rheaHighSeverity: rhea ? rhea.highSeverityCount : null,
    scorecard: scorecard ? {
      reporterVoice: scorecard.reporterVoice, factsCorrect: scorecard.factsCorrect,
      hallucinationCount: scorecard.hallucinationCount, wordCount: scorecard.wordCount,
      apiCostUsd: scorecard.apiCostUsd
    } : null,
    gateCostUsd: rhea ? rhea.apiCostUsd : null,
    draft: path.relative(ROOT, path.join(destDir, draftName)),
    ranAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(COMPARE, base + '.run.json'), JSON.stringify(record, null, 2));

  console.log('\n=== disposition: ' + record.disposition.toUpperCase() + ' ===');
  console.log(JSON.stringify(record, null, 2));
}

const WAKE = process.argv.includes('--wake');
Promise.resolve()
  .then(() => (WAKE ? runWake() : main()))
  .catch(err => { console.error('[run] Fatal:', err.message); process.exit(1); });
