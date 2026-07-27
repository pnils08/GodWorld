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
 *   node scripts/cron-desk-run.js --wake --desk civic [--no-gate] [--persona freelance-firebrand]
 *
 * Phase 2.3 three-wake cadence (2026-07-24) — one stage per cron call:
 *   node scripts/cron-desk-run.js --stage=angle  --desk civic --persona freelance-firebrand
 *   node scripts/cron-desk-run.js --stage=report --desk civic --persona freelance-firebrand
 *   node scripts/cron-desk-run.js --stage=write  --desk civic --persona freelance-firebrand [--no-gate]
 * Stages hand off via output/cron-compare/<stem>.angle.json / .packet.json;
 * write requires both (no angle/packet, no filing on stale data).
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const COMPARE = path.join(ROOT, 'output', 'cron-compare');
const PUBLISHED = path.join(COMPARE, 'published');
const FLAGGED = path.join(COMPARE, 'flagged');
const STAGED = path.join(COMPARE, 'staged');   // Phase 2 probation wall (S332): M–F articles stage here, NOT canon-ingested
const SAMPLES = path.join(COMPARE, 'samples'); // --no-gate ungated review samples (S332): never canon

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));   // also accept --flag=value (2026-07-24: a missed parse silently ran the wrong mode)
  return eq ? eq.slice(flag.length + 1) : def;
}
const DESK = arg('--desk', 'sports');
const GATE_MODEL = arg('--gate-model', 'sonnet');   // authoritative gate; 'haiku' to cost-test
// --gate-backend (2026-07-25): 'claude' (claude -p tool harness) or 'api' (raw
// OpenRouter, deterministic pre-checks + injected context). API gate model must
// be a different family than the writer — enforced fail-loud inside the gate.
const GATE_BACKEND = arg('--gate-backend', 'claude');
const GATE_API_MODEL = arg('--gate-api-model', 'google/gemini-3.5-flash');
// --no-gate (S332): skip the Rhea gate for SAMPLE generation only. The gate runs
// on `claude -p` (Claude Code / subscription), so it cannot run while Mike's
// subscription usage is depleted; the writer + quotes run on raw API keys. Ungated
// output is NOT canon — it routes to samples/ marked ungated, for review only.
const NO_GATE = process.argv.includes('--no-gate');
// --persona (S332 firebrand lane, plumbed 2026-07-24): run an authored reporter's
// adversarial stance instead of the desk skill. Forwarded to cron-desk-writer.js;
// also keys the draft/artifact filenames so persona runs never overwrite desk runs.
const PERSONA = arg('--persona', null);
const OUT_TAG = (PERSONA ? PERSONA + '_' : '');
// --stage (Phase 2.3, 2026-07-24): run ONE stage of the three-wake cadence
// (angle -> report -> write) instead of the full chain. Stages hand off via
// output/cron-compare/<stem>.angle.json / .packet.json artifacts.
const STAGE = arg('--stage', null);   // 'angle' | 'report' | 'write'
// --fanout (Mike-direct 2026-07-25): run the stage for EVERY assignment in
// today's rotation file (output/cron-compare/fanout-YYYY-MM-DD.json, built by
// the angle wake if missing) instead of a single --desk/--persona run.
const FANOUT = process.argv.includes('--fanout');

// Persona registry (Phase 2.3): personas are real ledger citizens (Jax = POP-00799),
// so a persona run's byline + author-side self-record come from this map, not the
// desk roster. Fail-loud on an unmapped persona. slug defaults to the CLI --persona.
function personaInfo(slug) {
  const s = slug === undefined ? PERSONA : slug;
  if (!s) return null;
  const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'persona-map.json'), 'utf8'));
  const p = map[s];
  if (!p) throw new Error('persona "' + s + '" not found in scripts/persona-map.json');
  return p;
}

const log = (...a) => console.log('[run]', new Date().toISOString(), ...a);

// engine.81 (S336): delegates to lib/getCurrentCycle — ONE cycle source, with
// the base_context divergence guard. noArgv: this cron parses its own flags.
const getCurrentCycle = require('../lib/getCurrentCycle');
function detectCycle() {
  const c = getCurrentCycle({ soft: true, noArgv: true });
  return c === null ? 'current' : String(c);
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
function collectQuoteAsks(lane, persona) {
  const asks = [];
  const seen = new Set();
  for (const e of lane) {
    for (const pop of (e.popids || [])) {
      if (seen.has(pop) || asks.length >= QUOTE_CITIZEN_CAP) continue;
      seen.add(pop);
      // Phase 2.3: voice the ask in the persona's register — the question's voice
      // shapes the answer's friction (the Antigravity/Jax lesson, 2026-07-24).
      const label = String(e.label || '').slice(0, 160);
      const askText = persona
        ? 'I\'m ' + persona.name + ' — Tribune. Something smells off about "' + label + '" and I\'m not letting it go. What have you seen with your own eyes?'
        : 'The Tribune is looking into this in your part of Oakland: "' + label + '". Speak about how it touches your life.';
      asks.push({ pop, ask: askText,
        record: !NO_GATE, maxTokens: 200 });   // S332: --no-gate SAMPLES never write citizen memory (was unconditional record:true — the layer-4 leak Codex caught)
    }
    if (asks.length >= QUOTE_CITIZEN_CAP) break;
  }
  return asks;
}

// Layer 3 — compose the injected state: byline note + lane pointers + real quotes.
// This REPLACES the 40k world_summary blob as the writer's injected state.
function buildLaneState(desk, cycle, lane, byline, quotes, persona, angleRead) {
  const L = [];
  if (persona) {
    // Stance anchor (Phase 2.3, 2026-07-24 tuning fix): the injected lane is
    // EVIDENCE, not assignments. Without this the desk framing dilutes the
    // persona's adversarial stance back into roundup.
    L.push('YOU ARE ' + persona.name.toUpperCase() + '. The material below is evidence, not assignments.');
    L.push('Find the contradiction in it and write INTO it — name who must answer, and demand');
    L.push('the answer. Never file the roundup. Anonymous scene texture you observed is yours');
    L.push('(that\'s what you saw); named people come from the storyline record and the quoted');
    L.push('citizens below.');
    L.push('');
  }
  if (angleRead) {
    // Phase 2.3: the reporter's own angle-wake read — this IS the story. Applies
    // to personas AND fan-out roster reporters (their angle wake ran too).
    L.push('### Your own read on this cycle (from your earlier wake — this IS the story, report it out)');
    L.push(angleRead);
    L.push('');
  }
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

// ---------------------------------------------------------------------------
// Phase 2.3 — three-wake cadence (angle -> report -> write), 2026-07-24
// Each stage is a small, separately-inspectable artifact; cron fans them across
// the day (06:00 / 13:00 / 18:00) and the morning digest reviews the results.
// ---------------------------------------------------------------------------

function loadLane(cycle, desk) {
  const signalPath = path.join(ROOT, 'output', 'desk_signal_c' + cycle + '.json');
  const signal = readJson(signalPath);
  if (!signal || !signal.lanes) throw new Error('no desk_signal at ' + path.relative(ROOT, signalPath) + ' — run buildWorldSummary first');
  const lane = signal.lanes[desk || DESK];
  return (lane && lane.length) ? lane : null;
}

// tag discriminates same-desk same-cycle artifacts: persona slug in single-desk
// mode (OUT_TAG), reporter name-slug in fanout mode (two civic journalists must
// not share one stem and clobber each other's angle/packet).
function stageStem(cycle, desk, tag) {
  const t = tag !== undefined ? (tag ? tag + '_' : '') : OUT_TAG;
  return (desk || DESK) + '_c' + cycle + '_' + t;
}
const nameSlug = n => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Review copies accumulate (Mike-direct 2026-07-24): a same-cycle rerun must not
// clobber the earlier sample/staged copy — suffix -HHMM when the name is taken.
function uniqueDest(dir, name) {
  const p = path.join(dir, name);
  if (!fs.existsSync(p)) return p;
  const stamp = new Date().toISOString().slice(11, 16).replace(':', '');
  return path.join(dir, name.replace(/\.md$/, '-' + stamp + '.md'));
}

// WAKE 1 — ANGLE: the reporter's own citizen voice reads the beat and says what
// smells off (the Antigravity/Jax pattern: ask in the reporter's lingo, get
// friction leads back in their voice). Persona reporters get their authored
// stance; roster reporters answer as themselves. Deterministic assembly otherwise.
// assign (fanout mode): {desk, name, popid, beatDomain, persona} from newsroom-fanout.
async function runAngle(assign) {
  const cycle = arg('--cycle', null) || detectCycle();
  const desk = assign ? assign.desk : DESK;
  const personaSlug = assign ? assign.persona : PERSONA;
  const stem = assign ? stageStem(cycle, desk, personaSlug || nameSlug(assign.name)) : stageStem(cycle);
  console.log('Wake 1 ANGLE — ' + desk + ' c' + cycle + (personaSlug ? ' (' + personaSlug + ')' : '') + (assign ? ' [' + assign.name + ']' : ''));
  console.log('===================================');
  const lane = loadLane(cycle, desk);
  if (!lane) { console.log('[angle] no "' + desk + '" lane in desk_signal — skipping (not an error).'); return; }
  const persona = personaInfo(personaSlug);
  const asker = persona || (assign ? { name: assign.name, popid: assign.popid } : null);
  const digest = lane.slice(0, 12).map(e => '- ' + (e.label || '(no label)') + (e.hood ? ' [' + e.hood + ']' : '')).join('\n');
  let angleRead = null;
  if (asker) {
    const ask = 'You\'re ' + asker.name + ', between stories. This is the ' + desk + ' beat\'s raw signal this cycle:\n' + digest +
      '\n\nWhat\'s smelling off to you? Point at the ONE thing nobody\'s touching — and name who should answer for it.';
    log('asking ' + asker.name + ' (' + asker.popid + ') what smells off...');
    const out = execFileSync('node', [path.join(ROOT, 'scripts', 'citizenVoice.js'),
      '--pop=' + asker.popid, '--ask=' + ask, '--cycle=' + cycle, '--json', '--max-tokens=320'],
      { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
    const outTrim = out.trim();
    // tolerate dotenv banner lines before the JSON — line-anchored: the rotating
    // dotenv tip sometimes contains "{ debug: true }" mid-line, so first-'{' slicing
    // randomly broke here ("Expected property name or '}' at position 2").
    const jsonStart = outTrim.search(/^\{/m);
    if (jsonStart === -1) throw new Error('citizenVoice --json returned no JSON envelope: ' + outTrim.slice(0, 200));
    const r = JSON.parse(outTrim.slice(jsonStart));
    angleRead = { name: r.name, popid: r.popId, text: r.text };
    log('angle read: "' + String(r.text).replace(/\s+/g, ' ').slice(0, 140) + '..."');
  }
  const anglePath = path.join(COMPARE, stem + 'angle.json');
  fs.mkdirSync(COMPARE, { recursive: true });
  fs.writeFileSync(anglePath, JSON.stringify({
    stage: 'angle', desk, cycle, persona: personaSlug,
    reporter: assign ? { name: assign.name, popid: assign.popid } : null,
    angleRead,
    lanePicks: lane.slice(0, 5).map(e => ({ label: e.label, kind: e.kind, hood: e.hood, ref: e.ref, popids: e.popids || [] })),
    laneEntries: lane.length,
    ranAt: new Date().toISOString()
  }, null, 2));
  console.log('angle → ' + path.relative(ROOT, anglePath));
}

// WAKE 2 — REPORT: persona-voiced questions to the affected citizens (batch
// quote pass) → packet.json. Requires the angle artifact (stage discipline).
async function runReport(assign) {
  const cycle = arg('--cycle', null) || detectCycle();
  const desk = assign ? assign.desk : DESK;
  const personaSlug = assign ? assign.persona : PERSONA;
  const stem = assign ? stageStem(cycle, desk, personaSlug || nameSlug(assign.name)) : stageStem(cycle);
  console.log('Wake 2 REPORT — ' + desk + ' c' + cycle + (personaSlug ? ' (' + personaSlug + ')' : '') + (assign ? ' [' + assign.name + ']' : ''));
  console.log('===================================');
  const anglePath = path.join(COMPARE, stem + 'angle.json');
  if (!fs.existsSync(anglePath)) throw new Error('no angle artifact at ' + path.relative(ROOT, anglePath) + ' — run --stage=angle first');
  const lane = loadLane(cycle, desk);
  if (!lane) { console.log('[report] no "' + desk + '" lane in desk_signal — skipping (not an error).'); return; }
  const persona = personaInfo(personaSlug);
  // voice the asks in the reporter's register even without an authored persona —
  // the question's voice shapes the answer's friction (the Antigravity/Jax lesson)
  const askVoice = persona || (assign ? { name: assign.name } : null);
  const asks = collectQuoteAsks(lane, askVoice);
  let quotes = [];
  if (asks.length) {
    log('quote pre-pass (reporter-voiced): ' + asks.length + ' citizen(s)...');
    const asksPath = path.join(COMPARE, stem + 'asks.json');
    fs.writeFileSync(asksPath, JSON.stringify(asks, null, 2));
    try {
      const out = execFileSync('node', [path.join(ROOT, 'scripts', 'citizenVoice.js'),
        '--batch=' + asksPath, '--cycle=' + cycle], { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
      quotes = parseBatchQuotes(out);
      log('quotes landed: ' + quotes.length + '/' + asks.length + (quotes.length ? ' (' + quotes.map(q => q.name).join(', ') + ')' : ''));
    } catch (e) { log('quote pre-pass failed (non-fatal): ' + e.message); }
  } else {
    log('no candidate citizens in the lane this cycle — packet will be quoteless');
  }
  const packetPath = path.join(COMPARE, stem + 'packet.json');
  fs.writeFileSync(packetPath, JSON.stringify({
    stage: 'report', desk, cycle, persona: personaSlug,
    reporter: assign ? { name: assign.name, popid: assign.popid } : null,
    angle: path.relative(ROOT, anglePath),
    quotesRequested: asks.length, quotesLanded: quotes.length, quotes,
    ranAt: new Date().toISOString()
  }, null, 2));
  console.log('packet → ' + path.relative(ROOT, packetPath) + ' (' + quotes.length + ' quotes)');
}

// WAKE 3 — WRITE (+ gate + route + self-record): requires angle + packet
// artifacts — no angle, no write (no filing on stale data).
async function runWrite(assign) {
  const cycle = arg('--cycle', null) || detectCycle();
  const desk = assign ? assign.desk : DESK;
  const personaSlug = assign ? assign.persona : PERSONA;
  const stem = assign ? stageStem(cycle, desk, personaSlug || nameSlug(assign.name)) : stageStem(cycle);
  console.log('Wake 3 WRITE — ' + desk + ' c' + cycle + (personaSlug ? ' (' + personaSlug + ')' : '') + (assign ? ' [' + assign.name + ']' : ''));
  console.log('===================================');
  const anglePath = path.join(COMPARE, stem + 'angle.json');
  const packetPath = path.join(COMPARE, stem + 'packet.json');
  if (!fs.existsSync(anglePath)) throw new Error('no angle artifact at ' + path.relative(ROOT, anglePath) + ' — run --stage=angle first');
  if (!fs.existsSync(packetPath)) throw new Error('no packet artifact at ' + path.relative(ROOT, packetPath) + ' — run --stage=report first');
  const lane = loadLane(cycle, desk);
  if (!lane) { console.log('[write] no "' + desk + '" lane in desk_signal — skipping (not an error).'); return; }
  const angle = readJson(anglePath);
  const packet = readJson(packetPath);
  const persona = personaInfo(personaSlug);
  const route = deskRoute(desk);
  const draftName = stem + slug(route.model) + '.md';
  const draftPath = path.join(COMPARE, draftName);
  const base = draftName.replace(/\.md$/, '');

  // byline: persona's own ledger identity when set, else the fan-out assignment's
  // reporter (the rotation already picked least-used), else the desk roster
  const byline = persona
    ? { name: persona.name, popid: persona.popid, beatDomain: persona.beatDomain }
    : assign
      ? { name: assign.name, popid: assign.popid, beatDomain: assign.beatDomain }
      : await resolveByline(desk, lane);
  log('byline: ' + (byline ? byline.name + ' (' + byline.popid + (persona ? ', persona' : (assign ? ', fanout ' + byline.beatDomain : ', ' + byline.beatDomain + ', used ' + byline.usageCount)) + ')' : 'NONE — fallback, no self-record'));

  const quotes = (packet && packet.quotes) || [];
  const stateFile = path.join(COMPARE, base + '.state.md');
  fs.writeFileSync(stateFile, buildLaneState(desk, cycle, lane, byline, quotes, persona,
    angle && angle.angleRead ? angle.angleRead.text : null));
  log('writing on lane (' + fs.statSync(stateFile).size + ' B injected state' + (persona ? ' + stance anchor' : '') + ')...');
  execFileSync('node', [path.join(ROOT, 'scripts', 'cron-desk-writer.js'), '--desk', desk,
    '--state-file', path.relative(ROOT, stateFile),
    ...(personaSlug ? ['--persona', personaSlug] : [])], { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
  if (!fs.existsSync(draftPath)) throw new Error('writer produced no draft at ' + path.relative(ROOT, draftPath));

  // gate (skipped for --no-gate samples)
  let rhea = null, pass = false;
  if (NO_GATE) {
    log('gate SKIPPED (--no-gate sample) — output is ungated, NOT canon');
  } else {
    log('gating...');
    try {
      execFileSync('node', [path.join(ROOT, 'scripts', 'cron-rhea-gate.js'), '--draft', path.relative(ROOT, draftPath),
        '--model', GATE_MODEL, '--backend', GATE_BACKEND, '--api-model', GATE_API_MODEL, '--cycle', cycle], { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
    } catch (_) { /* gate exit 2/3 — verdict json still written */ }
    rhea = readJson(path.join(COMPARE, base + '.rhea.json'));
    pass = rhea && rhea.pass === true;
  }

  // route (the wall — identical semantics to runWake)
  const destDir = NO_GATE ? SAMPLES : (pass ? STAGED : FLAGGED);
  fs.mkdirSync(destDir, { recursive: true });
  const stagedName = (NO_GATE || pass) ? base + (NO_GATE ? '.sample.md' : '.staged.md') : draftName;
  const destPath = uniqueDest(destDir, stagedName);
  fs.copyFileSync(draftPath, destPath);
  if (NO_GATE) {
    fs.writeFileSync(path.join(SAMPLES, base + '.sample.json'), JSON.stringify({
      status: 'ungated-sample', desk, cycle, persona: personaSlug, byline: byline ? byline.name : null, bylinePopid: byline ? byline.popid : null,
      article: path.relative(ROOT, destPath),
      quotesLanded: quotes.length,
      note: 'UNGATED sample (--no-gate, S332): writer+quotes ran on raw API; the Rhea gate was skipped (needs subscription). NOT canon, review-only.',
      builtAt: new Date().toISOString()
    }, null, 2));
  } else if (pass) {
    fs.writeFileSync(path.join(STAGED, base + '.staged.json'), JSON.stringify({
      status: 'staged', desk, cycle, persona: personaSlug, byline: byline ? byline.name : null, bylinePopid: byline ? byline.popid : null,
      article: path.relative(ROOT, destPath),
      note: 'M–F probation wall (S332): retrievable by the Saturday compile ONLY; NOT canon fact. Reporters/sift must not cite staged drafts.',
      stagedAt: new Date().toISOString()
    }, null, 2));
  } else {
    fs.writeFileSync(path.join(FLAGGED, base + '.flags.json'),
      JSON.stringify({ draft: draftName, flags: (rhea && rhea.flags) || [], summary: (rhea && rhea.summary) || 'no rhea verdict' }, null, 2));
  }

  // reporter self-record (author-side; persona POPID when set)
  let selfRecord = null;
  if (byline && pass) {
    const headline = (() => {
      const first = fs.readFileSync(draftPath, 'utf8').split('\n').find(l => l.trim());
      return String(first || '').replace(/^#+\s*/, '').replace(/[*_`]/g, '').slice(0, 100).trim() || (desk + ' filing c' + cycle);
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
    mode: 'wake-write', desk, cycle, provider: route.provider, model: route.model, gateModel: GATE_BACKEND === 'api' ? GATE_API_MODEL : GATE_MODEL,
    persona: personaSlug,
    byline: byline ? { name: byline.name, popid: byline.popid, beatDomain: byline.beatDomain } : null,
    laneEntries: lane.length, quotesLanded: quotes.length,
    disposition: NO_GATE ? 'ungated-sample' : (pass ? 'staged' : 'flagged'),
    rheaPass: rhea ? rhea.pass : null, rheaFlagCount: rhea ? rhea.flagCount : null,
    article: path.relative(ROOT, destPath),
    selfRecord, ranAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(COMPARE, base + '.wake.json'), JSON.stringify(record, null, 2));
  console.log('\n=== write disposition: ' + record.disposition.toUpperCase() + ' ===');
  console.log(JSON.stringify(record, null, 2));
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
  const draftName = DESK + '_c' + cycle + '_' + OUT_TAG + slug(route.model) + '.md';
  const draftPath = path.join(COMPARE, draftName);
  const base = draftName.replace(/\.md$/, '');

  // 1. LAYER 1 — byline (persona's own ledger identity when --persona is set)
  log('resolving byline...');
  const wakePersona = personaInfo();
  const byline = wakePersona
    ? { name: wakePersona.name, popid: wakePersona.popid, beatDomain: wakePersona.beatDomain }
    : await resolveByline(DESK, lane);
  log('byline: ' + (byline ? byline.name + ' (' + byline.popid + (wakePersona ? ', persona' : ', ' + byline.beatDomain + ', used ' + byline.usageCount) + ')' : 'NONE — fallback, no self-record'));

  // 2. LAYER 4 — citizen quote pre-pass (real POPID-linked voices, recorded PRESS)
  const asks = collectQuoteAsks(lane, wakePersona);
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
  fs.writeFileSync(stateFile, buildLaneState(DESK, cycle, lane, byline, quotes, wakePersona, null));
  log('writing on lane (' + fs.statSync(stateFile).size + ' B injected state' + (wakePersona ? ' + stance anchor' : '') + ')...');
  execFileSync('node', [path.join(ROOT, 'scripts', 'cron-desk-writer.js'), '--desk', DESK,
    '--state-file', path.relative(ROOT, stateFile),
    ...(PERSONA ? ['--persona', PERSONA] : [])], { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
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
        '--model', GATE_MODEL, '--backend', GATE_BACKEND, '--api-model', GATE_API_MODEL, '--cycle', cycle], { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
    } catch (_) { /* gate exit 2/3 — verdict json still written */ }
    rhea = readJson(path.join(COMPARE, base + '.rhea.json'));
    pass = rhea && rhea.pass === true;
  }

  // 5. LAYER 5 — THE WALL: stage (probation), never canon-ingest here.
  // --no-gate samples go to samples/ (ungated, review-only, never canon).
  const destDir = NO_GATE ? SAMPLES : (pass ? STAGED : FLAGGED);
  fs.mkdirSync(destDir, { recursive: true });
  const stagedName = (NO_GATE || pass) ? base + (NO_GATE ? '.sample.md' : '.staged.md') : draftName;
  const destPath = uniqueDest(destDir, stagedName);   // 2026-07-25: a rerun must not clobber the earlier review copy
  fs.copyFileSync(draftPath, destPath);
  if (NO_GATE) {
    fs.writeFileSync(path.join(SAMPLES, base + '.sample.json'), JSON.stringify({
      status: 'ungated-sample', desk: DESK, cycle, byline: byline ? byline.name : null, bylinePopid: byline ? byline.popid : null,
      article: path.relative(ROOT, destPath),
      quotesLanded: quotes.length,
      note: 'UNGATED sample (--no-gate, S332): writer+quotes ran on raw API; the Rhea gate was skipped (needs subscription). NOT canon, review-only.',
      builtAt: new Date().toISOString()
    }, null, 2));
  } else if (pass) {
    fs.writeFileSync(path.join(STAGED, base + '.staged.json'), JSON.stringify({
      status: 'staged', desk: DESK, cycle, byline: byline ? byline.name : null, bylinePopid: byline ? byline.popid : null,
      article: path.relative(ROOT, destPath),
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
    mode: 'wake', desk: DESK, cycle, provider: route.provider, model: route.model, gateModel: GATE_BACKEND === 'api' ? GATE_API_MODEL : GATE_MODEL,
    persona: PERSONA,
    byline: byline ? { name: byline.name, popid: byline.popid, beatDomain: byline.beatDomain } : null,
    laneEntries: lane.length, quotesRequested: asks.length, quotesLanded: quotes.length,
    disposition: NO_GATE ? 'ungated-sample' : (pass ? 'staged' : 'flagged'),
    rheaPass: rhea ? rhea.pass : null, rheaFlagCount: rhea ? rhea.flagCount : null,
    article: path.relative(ROOT, destPath),
    selfRecord, ranAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(COMPARE, base + '.wake.json'), JSON.stringify(record, null, 2));
  console.log('\n=== wake disposition: ' + record.disposition.toUpperCase() + ' ===');
  console.log(JSON.stringify(record, null, 2));
}

function main() {
  const cycle = arg('--cycle', null) || detectCycle();
  const route = deskRoute(DESK);
  const draftName = DESK + '_c' + cycle + '_' + OUT_TAG + slug(route.model) + '.md';
  const draftPath = path.join(COMPARE, draftName);
  const base = draftName.replace(/\.md$/, '');

  console.log('Single-Desk Headless Run — ' + DESK + ' c' + cycle);
  console.log('===================================');
  console.log('write: ' + route.provider + '/' + route.model + ' · gate: ' + GATE_MODEL);

  // 1. WRITE (model resolved from the desk-model-map inside the writer)
  log('writing...');
  execFileSync('node', [path.join(__dirname, 'cron-desk-writer.js'), '--desk', DESK,
    ...(PERSONA ? ['--persona', PERSONA] : [])],
    { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
  if (!fs.existsSync(draftPath)) throw new Error('writer produced no draft at ' + path.relative(ROOT, draftPath));

  // 2. GATE (independent Rhea; non-zero exit = flagged/parse, not fatal here)
  log('gating...');
  try {
    execFileSync('node', [path.join(__dirname, 'cron-rhea-gate.js'), '--draft', path.relative(ROOT, draftPath),
      '--model', GATE_MODEL, '--backend', GATE_BACKEND, '--api-model', GATE_API_MODEL, '--cycle', cycle], { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
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
    desk: DESK, cycle, provider: route.provider, model: route.model, gateModel: GATE_BACKEND === 'api' ? GATE_API_MODEL : GATE_MODEL,
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

// ---------------------------------------------------------------------------
// Fan-out runner (Phase 2.3, Mike-direct 2026-07-25): one stage × today's full
// rotation. The angle wake builds today's fanout file if missing; report/write
// require it. One assignment's failure never kills the rest of the rota.
// ---------------------------------------------------------------------------
async function runFanoutStage() {
  const date = new Date().toISOString().slice(0, 10);
  const fanoutApi = require('./newsroom-fanout');
  let fanout = fanoutApi.loadFanout(date);
  if (!fanout) {
    if (STAGE !== 'angle') throw new Error('no fanout file for ' + date + ' — the angle wake builds it');
    log('no fanout file for ' + date + ' — building the rotation...');
    fanout = await fanoutApi.writeFanout(date);
    console.log('fanout built: ' + fanout.assignments.length + ' assignments → output/cron-compare/fanout-' + date + '.json');
  }
  const only = arg('--only', null);
  const limit = parseInt(arg('--limit', '0'), 10);
  let list = fanout.assignments || [];
  if (only) list = list.filter(a => a.name === only || a.persona === only || a.desk === only);
  if (limit > 0) list = list.slice(0, limit);
  console.log('Fan-out ' + STAGE.toUpperCase() + ' — ' + date + ', ' + list.length + ' assignment(s)');
  console.log('===================================');
  const results = [];
  for (const a of list) {
    try {
      if (STAGE === 'angle') await runAngle(a);
      else if (STAGE === 'report') await runReport(a);
      else await runWrite(a);
      results.push({ name: a.name, desk: a.desk, ok: true });
    } catch (e) {
      console.error('[fanout] ' + a.name + ' (' + a.desk + ') FAILED: ' + e.message);
      results.push({ name: a.name, desk: a.desk, ok: false, error: e.message });
    }
  }
  const rPath = path.join(COMPARE, 'fanout-' + date + '.' + STAGE + '.results.json');
  fs.writeFileSync(rPath, JSON.stringify({ date, stage: STAGE, results, ranAt: new Date().toISOString() }, null, 2));
  const failed = results.filter(r => !r.ok);
  console.log('\n=== fan-out ' + STAGE + ': ' + (results.length - failed.length) + '/' + results.length + ' ok' +
    (failed.length ? ' — FAILED: ' + failed.map(f => f.name).join(', ') : '') + ' ===');
  console.log('results → ' + path.relative(ROOT, rPath));
  if (failed.length) await notifyFanoutFailures(date, failed, results.length);
}

// Failure ping (2026-07-26): a failed wake should reach Mike's phone, not wait
// for a terminal boot to read the log. Webhook pattern per notify-paulson-interview.js.
// Non-blocking: a dead webhook must never fail the wake itself.
function notifyFanoutFailures(date, failed, total) {
  return new Promise((resolve) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) { console.log('[fanout] failure ping skipped: DISCORD_WEBHOOK_URL not set'); return resolve(); }
    const lines = ['**NEWSROOM WAKE FAILURES — ' + date + ' ' + STAGE + '** (' + failed.length + '/' + total + ')'];
    for (const f of failed) lines.push('- ' + f.name + ' (' + f.desk + '): ' + String(f.error).slice(0, 140));
    lines.push('log: `logs/newsroom-fanout.log` — recover: `cron-desk-run.js --stage=' + STAGE + ' --fanout --only "<name>"`');
    const parsed = new URL(webhookUrl);
    const payload = JSON.stringify({ content: lines.join('\n') });
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => { res.resume(); res.on('end', () => { console.log('[fanout] failure ping sent (' + res.statusCode + ')'); resolve(); }); });
    req.on('error', (e) => { console.log('[fanout] failure ping failed (non-blocking): ' + e.message); resolve(); });
    req.write(payload); req.end();
  });
}

const WAKE = process.argv.includes('--wake');
if (STAGE && !['angle', 'report', 'write'].includes(STAGE)) {
  console.error('[run] unknown --stage "' + STAGE + '" (want angle | report | write)');
  process.exit(1);
}
Promise.resolve()
  .then(() => (STAGE && FANOUT ? runFanoutStage()
    : STAGE === 'angle' ? runAngle()
    : STAGE === 'report' ? runReport()
    : STAGE === 'write' ? runWrite()
    : (WAKE ? runWake() : main())))
  .catch(err => { console.error('[run] Fatal:', err.message); process.exit(1); });
