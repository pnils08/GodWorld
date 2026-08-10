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
// Submission budget (headless plan "What's left" #2, S339): hard weekly ceiling
// on gate-cleared (staged) articles per cycle-week — the ~20–28/wk cost envelope.
// At the cap a write wake exits BEFORE any writer spend. --no-gate samples are
// exempt (they never stage). Override: --budget-cap N or NEWSROOM_WEEKLY_CAP env.
const WEEKLY_CAP = parseInt(arg('--budget-cap', process.env.NEWSROOM_WEEKLY_CAP || '28'), 10);
// --persona (S332 firebrand lane, plumbed 2026-07-24): run an authored reporter's
// adversarial stance instead of the desk skill. Forwarded to cron-desk-writer.js;
// also keys the draft/artifact filenames so persona runs never overwrite desk runs.
const PERSONA = arg('--persona', null);
const OUT_TAG = (PERSONA ? PERSONA + '_' : '');
// --stage (Phase 2.3, 2026-07-24): run ONE stage of the three-wake cadence
// (angle -> report -> write) instead of the full chain. Stages hand off via
// output/cron-compare/<stem>.angle.json / .packet.json artifacts.
const STAGE = arg('--stage', null);   // 'angle' | 'report' | 'write'
// pipeline.54 / ADR-0017. An explicit flag remains a samples-only evaluation
// override. Live scheduled fanout gets its Packet contract and models from the
// journalist's active wake package instead; no package means no scheduled wake.
const PACKET_CONTRACT_FLAG = arg('--packet-contract', null);
const wakePackages = require('./newsroomWakePackages');
let ACTIVE_WAKE_PACKAGE = null;
let PACKET_CONTRACT = null;
let PACKET_ACTIVE = false;
let livedPacket = require('./livedExperiencePacket');

function activateWakeContext(assign, personaSlug) {
  const packageAssignment = assign || (personaSlug ? { persona: personaSlug } : null);
  ACTIVE_WAKE_PACKAGE = wakePackages.packageForAssignment(packageAssignment);
  PACKET_CONTRACT = PACKET_CONTRACT_FLAG ||
    (ACTIVE_WAKE_PACKAGE && ACTIVE_WAKE_PACKAGE.packetContract) || null;
  PACKET_ACTIVE = PACKET_CONTRACT === 'v1' || PACKET_CONTRACT === 'v2';
  livedPacket = PACKET_CONTRACT === 'v2'
    ? require('./livedExperiencePacketV2')
    : require('./livedExperiencePacket');
  return {
    wakePackage: ACTIVE_WAKE_PACKAGE,
    packetContract: PACKET_CONTRACT,
    packetActive: PACKET_ACTIVE,
    livedPacket,
  };
}
// --fanout (Mike-direct 2026-07-25): run the stage for every PACKAGE-ELIGIBLE
// assignment in today's rotation file. ADR-0017 forbids a legacy generic
// fallback for unupgraded journalists.
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
function deskRoute(desk, persona) {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'desk-model-map.json'), 'utf8'));
  // Persona key wins (freelance-firebrand heat model) — do not inherit civic DeepSeek.
  if (persona && m[persona]) return m[persona];
  return m[desk] || m._default;
}
function stageRoute(desk, persona, stage) {
  return ACTIVE_WAKE_PACKAGE
    ? wakePackages.routeFor(ACTIVE_WAKE_PACKAGE, stage)
    : deskRoute(desk, persona);
}
const slug = m => m.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }

// engine.88 (S339): journalist usage→tier→fame. A gate-PASSED (staged) article
// earns its author one Citizen_Media_Usage row, UsageType 'byline-landed'.
// Phase 5 processMediaUsage_ counts it into the author's SL UsageCount next
// cycle; the existing 3/6/9 tier bars + engine.69 decay do the rest. Saturday
// edition selection adds 'byline-published' on top (ingestPublishedEntities.js).
// Idempotent on (CitizenName, UsageType, Context=stage stem) so a rerun of the
// same wake never double-counts. Row is header-mapped, robust to column order.
// A failed append NEVER blocks article routing — logged, reported in the record.
async function recordBylineUsage(cycle, byline, context) {
  if (!byline || !byline.name) return { recorded: false, reason: 'no byline' };
  try {
    const sheets = require(path.join(ROOT, 'lib', 'sheets'));
    const data = await sheets.getRawSheetData('Citizen_Media_Usage');
    const h = data[0] || [];
    const iN = h.indexOf('CitizenName'), iT = h.indexOf('UsageType'), iC = h.indexOf('Context');
    if (iN < 0 || iT < 0) return { recorded: false, reason: 'Citizen_Media_Usage headers missing CitizenName/UsageType' };
    const dup = data.slice(1).some(r =>
      String(r[iN] || '').trim() === byline.name &&
      String(r[iT] || '').trim() === 'byline-landed' &&
      (iC < 0 || String(r[iC] || '').trim() === context));
    if (dup) return { recorded: false, reason: 'duplicate — this stem already credited' };
    const row = h.map(col => {
      switch (String(col).trim()) {
        case 'Timestamp':   return 'C' + cycle;       // sim clock, never Gregorian
        case 'Cycle':       return String(cycle);
        case 'CitizenName': return byline.name;
        case 'UsageType':   return 'byline-landed';
        case 'Context':     return context;
        case 'Reporter':    return byline.name;
        default:            return '';
      }
    });
    await sheets.appendRows('Citizen_Media_Usage', [row]);
    return { recorded: true };
  } catch (e) {
    return { recorded: false, reason: e.message };
  }
}

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
  sports:   ['SPORTS']  // 2026-08-07: real sports bylines (was empty / Paulson-exclude hangover)
};
const QUOTE_CITIZEN_CAP = 4;   // per wake — keep the DeepSeek quote pre-pass cheap

// Extract the citizenVoice --batch JSON array from stdout. The `[dotenv@…]`
// startup banner also prints to stdout with inline brackets, so a greedy
// /\[[\s\S]*\]/ grabs the banner and fails to parse. JSON.stringify(_,null,2)
// puts the array's own `[` and `]` each on their own line — the banner never
// does — so anchor on the bare-bracket lines.
function parseBatchResults(out) {
  const lines = String(out).split('\n');
  let end = -1;
  for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].trim() === ']') { end = i; break; } }
  let start = -1;
  for (let i = end; i >= 0; i--) { if (lines[i].trim() === '[') { start = i; break; } }
  if (start < 0 || end <= start) return [];
  let parsed;
  try { parsed = JSON.parse(lines.slice(start, end + 1).join('\n')); } catch (_) { return []; }
  return Array.isArray(parsed) ? parsed : [];
}

function parseBatchQuotes(out) {
  return parseBatchResults(out).filter(q => q.quote && !q.fallback);
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
// S339 soft no-repeat: bylines with no staged article this cycle-week come first;
// when all have filed, degrades to least-staged + least-used (never drops the article).
async function resolveByline(desk, lane, cycle) {
  const { buildBylineRoster } = require(path.join(ROOT, 'scripts', 'engine-auditor', 'bayTribuneRoster'));
  const roster = await buildBylineRoster();
  const domains = LANE_DOMAINS[desk] || [];
  let pool = (roster.included || []).filter(j => j.popid && domains.includes(j.beatDomain));
  if (!pool.length) pool = (roster.included || []).filter(j => j.popid && j.beatDomain === 'GENERAL');
  if (!pool.length) return null;   // no eligible byline — caller handles fallback
  const usage = readBylineUsage();
  const stagedBy = require('./newsroom-fanout').stagedTally(cycle).byByline;
  pool.sort((a, b) => (stagedBy[a.name] || 0) - (stagedBy[b.name] || 0)
    || (usage[a.name] || 0) - (usage[b.name] || 0) || a.name.localeCompare(b.name));
  const pick = pool[0];
  if (stagedBy[pick.name]) log('[budget] all ' + desk + ' bylines already filed c' + cycle + ' — soft fallback: ' + pick.name + ' repeats');
  return { name: pick.name, popid: pick.popid, beatDomain: pick.beatDomain, usageCount: usage[pick.name] || 0 };
}

// S339 budget gate — call at the top of any wake that can spend writer tokens.
// Returns true when the wake should stop (cap reached). --no-gate samples never
// stage, so they don't consume budget and aren't gated.
function budgetReached(cycle) {
  if (NO_GATE) return false;
  const t = require('./newsroom-fanout').stagedTally(cycle);
  if (t.total >= WEEKLY_CAP) {
    console.log('[budget] weekly cap reached — ' + t.total + '/' + WEEKLY_CAP + ' staged for c' + cycle + '. Skipping wake, no writer spend.');
    return true;
  }
  log('[budget] ' + t.total + '/' + WEEKLY_CAP + ' staged for c' + cycle);
  return false;
}

// Interview rest-cycles (Task 2.5.4 pressure-test #4, Mike-direct 2026-08-01
// "just because a citizen is higher on the list doesn't mean use her every
// single time"): tally who landed quotes in recent packet artifacts; a citizen
// at the cap sits out this wake and the pool moves down the list — spread the
// light (universal protagonism). Soft: if EVERY candidate is rested the cap is
// waived rather than running a quoteless wake on a seeded assignment.
const REST_CAP = 2;              // interviews inside the window before a rest
const REST_WINDOW_H = 72;        // hours of packet history that count
function interviewTally() {
  const tally = {};
  const cutoff = Date.now() - REST_WINDOW_H * 3600 * 1000;
  let files = [];
  try { files = fs.readdirSync(COMPARE).filter(f => f.endsWith('packet.json')); } catch (_) { return tally; }
  for (const f of files) {
    const p = path.join(COMPARE, f);
    try { if (fs.statSync(p).mtimeMs < cutoff) continue; } catch (_) { continue; }
    const j = readJson(p);
    for (const q of ((j && j.quotes) || [])) if (q.pop) tally[q.pop] = (tally[q.pop] || 0) + 1;
  }
  return tally;
}

// Layer 4 — collect the affected citizens (distinct POPIDs, capped) and their
// reaction ask. Task 2.5.4: the assigned story's citizens fill the pool FIRST —
// they are the engine's actual affected residents for this angle — with the
// lane's popids as fallback. Kills the fabricated-resident class at the root.
function collectQuoteAsks(lane, persona, story, angleArt) {
  const asks = [];
  const seen = new Set();
  const rested = [];
  const tally = interviewTally();
  const packetCandidates = story
    ? livedPacket.candidateRows(story, angleArt && (angleArt.jaxSlice || angleArt.pslayerSlice))
      .reduce((m, c) => m.set(c.pop, c), new Map())
    : new Map();
  const push = (pop, label, ignoreRest) => {
    if (!pop || seen.has(pop) || asks.length >= QUOTE_CITIZEN_CAP) return;
    // The A/B treatment holds the candidate pool fixed across retries. The
    // production rest window remains unchanged on the baseline path.
    if (!PACKET_ACTIVE && !ignoreRest && (tally[pop] || 0) >= REST_CAP) { rested.push({ pop, label }); return; }
    seen.add(pop);
    // Phase 2.3: voice the ask in the persona's register — the question's voice
    // shapes the answer's friction (the Antigravity/Jax lesson, 2026-07-24).
    const l = String(label || '').slice(0, 160);
    let askText;
    let inputPacket = null;
    if (PACKET_ACTIVE) {
      const candidate = packetCandidates.get(pop) || {
        pop, name: null, role: null, hood: story && story.hood || null,
        profile: null, why: 'desk-signal candidate',
      };
      inputPacket = livedPacket.buildReportPacket({
        cycle: angleArt && angleArt.cycle,
        desk: angleArt && angleArt.desk,
        reporter: persona,
        angleInput: angleArt && angleArt.inputPacket,
        anglePlan: angleArt && angleArt.angleRead && angleArt.angleRead.plan,
        story,
        candidate,
      });
      askText = livedPacket.prompt(inputPacket);
    } else {
      askText = persona
        ? 'I\'m ' + persona.name + ' — Tribune. Something smells off about "' + l + '" and I\'m not letting it go. What have you seen with your own eyes?'
        : 'The Tribune is looking into this in your part of Oakland: "' + l + '". Speak about how it touches your life.';
    }
    asks.push({ pop, ask: askText,
      ...(inputPacket ? { packetContract: livedPacket.VERSION, inputPacket, evidenceBound: true } : {}),
      ...(ACTIVE_WAKE_PACKAGE ? { model: wakePackages.routeFor(ACTIVE_WAKE_PACKAGE, 'report').model } : {}),
      record: PACKET_ACTIVE ? false : !NO_GATE, maxTokens: PACKET_ACTIVE ? 420 : 200 });   // S332: --no-gate SAMPLES never write citizen memory (was unconditional record:true — the layer-4 leak Codex caught)
  };
  if (story) for (const pop of (story.popids || [])) push(pop, story.angle || story.label);
  for (const e of lane) {
    for (const pop of (e.popids || [])) push(pop, e.label);
    if (asks.length >= QUOTE_CITIZEN_CAP) break;
  }
  // soft floor: everyone rested -> waive the cap rather than run quoteless
  if (!asks.length && rested.length) {
    log('[rest] all candidates rested (' + rested.length + ') — cap waived for this wake');
    for (const r of rested) { push(r.pop, r.label, true); if (asks.length >= QUOTE_CITIZEN_CAP) break; }
  } else if (rested.length) {
    log('[rest] resting ' + rested.length + ' recently-interviewed citizen(s): ' + rested.map(r => r.pop).join(', '));
  }
  return asks;
}

// Layer 3 — compose the injected state: byline note + lane pointers + real quotes.
// This REPLACES the 40k world_summary blob as the writer's injected state.
// Task 2.5.2/2.5.3: an assigned story leads the state — the angle is the
// editor's, the words are the reporter's — and the color doctrine draws the
// wall: canon facts immutable, scene texture free.
// wallPosts: HARD-INJECTED social wiki wall lines (reporterWall) — not optional tool.
function buildLaneState(desk, cycle, lane, byline, quotes, persona, angleRead, assignment, wallBlock) {
  const L = [];
  const story = assignment && assignment.story;
  if (story) {
    const brief = citizenBrief(story.citizens);
    L.push('### YOUR ASSIGNMENT (from your editor — the angle is fixed; the story is yours)');
    L.push('ANGLE: ' + (story.angle || story.label));
    if (story.hookLine) L.push('HOOK: ' + story.hookLine);
    if (brief.names.length) L.push('AFFECTED CITIZENS (real people from the record — your sources): ' + brief.names.join('; '));
    if (brief.profiles.length) {
      L.push('WHO THEY ARE (ledger record — these facts are immutable; never contradict them):');
      for (const p of brief.profiles) L.push('  - ' + p);
    }
    if (story.hood) L.push('WHERE: ' + story.hood);
    if (assignment.approach) L.push('APPROACH: ' + assignment.approach);
    if (assignment.canonFacts && assignment.canonFacts.length) {
      L.push('');
      L.push('CANON FACTS (researched wake 1 — validated against the record; cite them, never bend them):');
      for (const f of assignment.canonFacts) L.push('  - ' + f.fact + '  [' + f.ref + ']');
    }
    L.push('');
    L.push('THE WALL: facts from the record — names, ages, roles, neighborhoods, numbers, events — are');
    L.push('load-bearing and immutable. Never bend one, never invent a statistic, never import a');
    L.push('real-world person. Never print internal IDs (POP-numbers) or raw system decimals in prose.');
    L.push('Everything else is yours: the weather that day, the street sounds, what the block felt');
    L.push('like. That color is the job — invent it freely so long as it contradicts nothing.');
    L.push('');
  }
  // grok pipeline.52: economic / storefront pack for business desk (shared substrate).
  if (desk === 'business') {
    try {
      const { loadEconomicSlice } = require(path.join(__dirname, 'buildEconomicSlice'));
      const es = loadEconomicSlice(cycle);
      if (es && !es.empty) {
        L.push('### ECONOMIC / STOREFRONT SLICE (business pack — not civic process filler)');
        L.push('PULSE: ' + es.pulse.className + ' · score ' + es.pulse.score + ' · ' + es.pulse.label);
        if ((es.pulse.namedBusinesses || []).length) {
          L.push('NAMED BUSINESSES (sources only): ' + es.pulse.namedBusinesses.join('; '));
        }
        if (es.texture) {
          if ((es.texture.cooling || []).length) {
            L.push('COOLING: ' + es.texture.cooling.slice(0, 8).join('; '));
          }
          if ((es.texture.rising || []).length) {
            L.push('RISING: ' + es.texture.rising.slice(0, 8).join('; '));
          }
          if ((es.texture.venues || []).length) {
            L.push('EVENING VENUES: ' +
              es.texture.venues.slice(0, 6).map(v => v.name + (v.hood ? ' (' + v.hood + ')' : '')).join('; '));
          }
          if (es.texture.ledgerSource) {
            L.push('LEDGER SNAPSHOT: ' + es.texture.ledgerCount + ' rows (`' + es.texture.ledgerSource +
              '`) — headcount only when listed; never invent Employee_Count or Key_Personnel.');
          }
        }
        if (es.prewrite && es.prewrite.anchorFacts) {
          L.push('ANCHORS:');
          for (const a of es.prewrite.anchorFacts.slice(0, 6)) L.push('  - ' + a);
        }
        if (es.scene && es.scene.colorRoom) L.push('COLOR: ' + es.scene.colorRoom);
        L.push('');
      }
    } catch (_) { /* optional */ }
  }
  if (persona) {
    // Stance anchor (Phase 2.3, 2026-07-24 tuning fix): the injected lane is
    // EVIDENCE, not assignments. Without this the desk framing dilutes the
    // persona's adversarial stance back into roundup.
    L.push('YOU ARE ' + persona.name.toUpperCase() + '. The material below is evidence, not assignments.');
    L.push('Find the contradiction in it and write INTO it — name who must answer, and demand');
    L.push('the answer. Never file the roundup. Anonymous scene texture you observed is yours');
    L.push('(that\'s what you saw); named people come from the storyline record and the quoted');
    L.push('citizens below.');
    if (persona.name && /jax|caldera/i.test(persona.name)) {
      L.push('HEAT: short, hot, first-person. Specific bar/street open. Lead with what does not line up.');
      L.push('Do the count in prose — no bullet inventory of numbers. Translate officialese into the street read.');
      L.push('If signals fight (decay vs recovery, money vs jobs, illness with no owner) — that fight IS the story.');
      L.push('End on ONE unanswered question, then tipline. Never sand the contradiction into a process status piece.');
      L.push('RoleType lines are immutable — soft side-work color must not replace someone\'s career.');
      // Inject Jax stink-slice scene pack when present (buildJaxSlice).
      try {
        const { loadJaxSlice } = require(path.join(__dirname, 'buildJaxSlice'));
        const js = loadJaxSlice(cycle);
        if (js && !js.empty && js.scene) {
          L.push('');
          L.push('### JAX STINK SLICE (assignment + color room — not a Mags desk-slice)');
          if (js.contradiction) {
            L.push('CONTRADICTION A: ' + js.contradiction.a);
            L.push('CONTRADICTION B: ' + js.contradiction.b);
            L.push('FRAME: ' + js.contradiction.frame);
          }
          if (js.scene.weather) L.push('WEATHER: ' + js.scene.weather);
          if (js.scene.neighborhoodTexture) L.push('HOOD TEXTURE: ' + js.scene.neighborhoodTexture);
          if (js.scene.whoLivedIt && js.scene.whoLivedIt.length) {
            L.push('WHO LIVED IT (hood): ' + js.scene.whoLivedIt.slice(0, 5).join(' | '));
          }
          if (js.bonds && js.bonds.length) {
            L.push('BONDS: ' + js.bonds.slice(0, 6).map(b => b.aName + '↔' + b.bName + '(' + b.type + ')').join('; '));
          }
          L.push('COLOR: ' + (js.scene.colorRoom || ''));
        }
      } catch (_) { /* optional */ }
    } else if (persona.name && /p\.?\s*slayer/i.test(persona.name)) {
      L.push('HEAT: first-person I/we fan column. Gut or Oakland sensory open. Charge most of the time.');
      L.push('Friction pivot required. Metrics are foils, not Anthony analysis. Hate-the-move / I-was-wrong arc OK.');
      L.push('ONE column — not multi-voice sports-desk average.');
      // Inject fan-pulse slice when present (buildPSlayerSlice).
      try {
        const { loadPSlayerSlice } = require(path.join(__dirname, 'buildPSlayerSlice'));
        const ps = loadPSlayerSlice(cycle);
        if (ps && !ps.empty) {
          L.push('');
          L.push('### P SLAYER FAN-PULSE SLICE (charge assignment — not a Mags desk-slice, not Jax stink)');
          L.push('PULSE: ' + ps.pulse.className + ' · score ' + ps.pulse.score + ' · ' + ps.pulse.label);
          if (ps.charge) {
            L.push('BAG MODES: ' + (ps.charge.bagModes || []).map(m => m.id + ' ' + m.name).join('; '));
            L.push('FAN CHARGE: ' + ps.charge.fanCharge);
            if (ps.charge.foilNumber) L.push('FOIL NUMBER: ' + ps.charge.foilNumber);
            L.push('CENTRAL FEELING: ' + ps.charge.centralFeeling);
          }
          if (ps.friction) {
            L.push('FRICTION A: ' + ps.friction.a);
            L.push('FRICTION B: ' + ps.friction.b);
            L.push('FRAME: ' + ps.friction.frame);
          }
          if (ps.priorTakes && ps.priorTakes.length) {
            L.push('PRIOR TAKES:');
            for (const p of ps.priorTakes.slice(0, 3)) {
              L.push('  - C' + (p.cycle != null ? p.cycle : '?') + ' ' + p.headline + ' [' + p.why + ']');
            }
          }
          if (ps.prewrite && ps.prewrite.anchorFacts) {
            L.push('ANCHOR FACTS (feed only):');
            for (const a of ps.prewrite.anchorFacts.slice(0, 4)) L.push('  - ' + a);
          }
          if (ps.scene && ps.scene.colorRoom) L.push('COLOR: ' + ps.scene.colorRoom);
        }
      } catch (_) { /* optional */ }
    } else if (persona.name && /anthony\s*raines/i.test(persona.name)) {
      L.push('STANCE: third-person analytic beat. One claim on verifiable numbers. Fit and process over bleacher heat.');
      L.push('Never invent contracts/stats. ONE piece — not multi-voice sports-desk average.');
      // grok pipeline.52: analytic pack from shared sports substrate + analysis bag.
      try {
        const { loadAnthonySlice } = require(path.join(__dirname, 'buildAnthonySlice'));
        const ant = loadAnthonySlice(cycle);
        if (ant && !ant.empty) {
          L.push('');
          L.push('### ANTHONY ANALYTIC SLICE (board assignment — not fan heat, not Hal elegy)');
          L.push('PULSE: ' + ant.pulse.className + ' · score ' + ant.pulse.score + ' · ' + ant.pulse.label);
          if (ant.bag && ant.bag.tools) {
            L.push('BAG TOOLS: ' + ant.bag.tools.map(t => t.id + ' ' + t.name).join('; '));
          }
          if (ant.bag && ant.bag.claim) L.push('CLAIM: ' + ant.bag.claim);
          if (ant.pulse.foilNumber) L.push('FOIL (feed only): ' + ant.pulse.foilNumber);
          if (ant.prewrite && ant.prewrite.lineFacts) {
            L.push('LINE FACTS (feed only):');
            for (const f of ant.prewrite.lineFacts.slice(0, 5)) L.push('  - ' + f);
          }
          if (ant.prewrite && ant.prewrite.missing) {
            L.push('MISSING (do not invent): ' + ant.prewrite.missing.slice(0, 3).join('; '));
          }
          if (ant.players && ant.players.length) {
            L.push('PLAYERS: ' + ant.players.slice(0, 6).map(p =>
              p.name + (p.popid ? ' (' + p.popid + ')' : '')).join('; '));
          }
          if (ant.scene && ant.scene.colorRoom) L.push('COLOR: ' + ant.scene.colorRoom);
        }
      } catch (_) { /* optional */ }
    } else if (persona.name && /hal\s*richmond/i.test(persona.name)) {
      L.push('STANCE: first-person reflective historian. Present fact then era echo. Literary, not wire.');
      L.push('Numbers as poetry of time. ONE piece — not multi-voice sports-desk average. Never business desk.');
      // grok pipeline.52: archive pack from shared sports substrate + HAL_ARCHIVE_BAG.
      try {
        const { loadHalSlice } = require(path.join(__dirname, 'buildHalSlice'));
        const hs = loadHalSlice(cycle);
        if (hs && !hs.empty) {
          L.push('');
          L.push('### HAL ARCHIVE SLICE (historian assignment — not fan heat, not Anthony board, not business)');
          L.push('PULSE: ' + hs.pulse.className + ' · score ' + hs.pulse.score + ' · ' + hs.pulse.label);
          L.push('CLOSING NOTE: ' + hs.pulse.closingNote);
          if (hs.bag && hs.bag.modes) {
            L.push('BAG MODES: ' + hs.bag.modes.map(m => m.id + ' ' + m.name).join('; '));
          }
          if (hs.bag && hs.bag.historicalAnchor) L.push('HISTORICAL ANCHOR: ' + hs.bag.historicalAnchor);
          if (hs.prewrite && hs.prewrite.presentFacts) {
            L.push('PRESENT FACTS (feed only):');
            for (const f of hs.prewrite.presentFacts.slice(0, 4)) L.push('  - ' + f);
          }
          if (hs.pulse.foilNumber) L.push('RECEIPT (feed only): ' + hs.pulse.foilNumber);
          if (hs.priorTakes && hs.priorTakes.length) {
            L.push('PRIOR FILINGS:');
            for (const p of hs.priorTakes.slice(0, 3)) {
              L.push('  - C' + (p.cycle != null ? p.cycle : '?') + ' ' + p.headline + ' [' + p.why + ']');
            }
          }
          if (hs.players && hs.players.length) {
            L.push('PLAYERS: ' + hs.players.slice(0, 6).map(p =>
              p.name + (p.popid ? ' (' + p.popid + ')' : '')).join('; '));
          }
          if (hs.scene && hs.scene.colorRoom) L.push('COLOR: ' + hs.scene.colorRoom);
        }
      } catch (_) { /* optional */ }
    } else if (persona.name && /carmen\s*delaine/i.test(persona.name)) {
      L.push('STANCE: third-person civic ledger. Money, clocks, vote math. Accretion not press-release.');
      L.push('ONE piece — not multi-voice civic-desk average.');
    } else if (persona.name && /luis\s*navarro/i.test(persona.name)) {
      L.push('STANCE: investigation. Know/don\'t-know. Silence clocks. Fair pressure, not Jax theater.');
      L.push('ONE piece — not multi-voice civic-desk average.');
    } else if (persona.name && /trevor\s*shimizu/i.test(persona.name)) {
      L.push('STANCE: systems/infrastructure. Timestamp + pattern. Dry, technical.');
      L.push('ONE piece — not multi-voice civic-desk average.');
    } else if (persona.name && /rachel\s*torres/i.test(persona.name)) {
      L.push('STANCE: public safety. Incident structure + classification gaps. Measured.');
      L.push('ONE piece — not multi-voice civic-desk average.');
    } else if (persona.name && /lila\s*mezran/i.test(persona.name)) {
      L.push('STANCE: health. Clinical calm + human cost. Packet counts only. No diagnosis.');
      L.push('ONE piece — not multi-voice civic-desk average.');
    } else if (persona.name && /maria\s*keen/i.test(persona.name)) {
      L.push('STANCE: culture ground. First-person witness. One block one truth.');
      L.push('ONE piece — not multi-voice culture-desk average.');
    } else if (persona.name && /elliot\s*graye/i.test(persona.name)) {
      L.push('STANCE: faith/quiet work. Dignity. Packet institutions only.');
      L.push('ONE piece — not multi-voice culture-desk average.');
    } else if (persona.name && /kai\s*marston/i.test(persona.name)) {
      L.push('STANCE: arts present-tense. Neighborhood act not gallery PR.');
      L.push('ONE piece — not multi-voice culture-desk average.');
    } else if (persona.name && /mason\s*ortega/i.test(persona.name)) {
      L.push('STANCE: kitchen workplaces first. Packet-named workers only.');
      L.push('ONE piece — not multi-voice culture-desk average.');
    } else if (persona.name && /angela\s*reyes/i.test(persona.name)) {
      L.push('STANCE: education stability. Warm brief. No invented scores.');
      L.push('ONE piece — not multi-voice culture-desk average.');
    } else if (persona.name && /noah\s*tan/i.test(persona.name)) {
      L.push('STANCE: weather/environment science-first ground translation.');
      L.push('ONE piece — not multi-voice culture-desk average.');
    } else if (persona.name && /tanya\s*cruz/i.test(persona.name)) {
      L.push('STANCE: sideline dispatch. Clubhouse signal. Packet quotes only.');
      L.push('ONE piece — not multi-voice sports-desk average.');
    } else if (persona.name && /simon\s*leary/i.test(persona.name)) {
      L.push('STANCE: long view. Sports as civic architecture. Quiet continuity.');
      L.push('ONE piece — not multi-voice sports-desk average.');
    } else if (persona.name && /elliot\s*marbury/i.test(persona.name)) {
      L.push('STANCE: deep analysis data desk. As_Roster+TrueSource audit. Show sample floors.');
      L.push('ONE memo-grade piece for canon path — not multi-voice sports-desk footnote.');
    } else if (persona.name && /ariana\s*reyes/i.test(persona.name)) {
      L.push('STANCE: sports analytics deep. As_Roster+TrueSource. Sample floors. Sports-lane memo.');
      L.push('ONE memo-grade piece for canon path — not multi-voice sports-desk average.');
    } else if (persona.name && /sharon\s*okafor/i.test(persona.name)) {
      L.push('STANCE: lifestyle behavior patterns. Warm analytical. Packet venues/people.');
      L.push('ONE piece — not multi-voice culture-desk average.');
    } else if (persona.name && /(dj\s*)?hartley|deshawn\s*hartley/i.test(persona.name)) {
      L.push('STANCE: senior photographer. Visual record/prompts. Not prose articles.');
      L.push('ONE visual assignment set — not multi-voice desk average.');
    }
    // grok pipeline.52: economic pack when this is a business-desk assignment (desk via assignment approach).
    // (Persona-named inject for culture evening follows; business often has no solo persona.)
    // grok pipeline.52: shared evening-life pack for culture consumers (mason/kai/sharon/maria/graye).
    if (persona.name &&
        /maria\s*keen|elliot\s*graye|kai\s*marston|mason\s*ortega|sharon\s*okafor/i.test(persona.name)) {
      try {
        const { loadEveningSlice, pickPulseForPersona, EVENING_CONSUMERS } =
          require(path.join(__dirname, 'buildEveningSlice'));
        const es = loadEveningSlice(cycle);
        if (es && !es.empty) {
          const slug = Object.keys(EVENING_CONSUMERS).find(s =>
            EVENING_CONSUMERS[s].popid === persona.popid ||
            new RegExp(EVENING_CONSUMERS[s].name.split(' ')[0], 'i').test(persona.name)
          );
          const pulse = pickPulseForPersona(es.pulses || [], slug) ||
            (es.pulses && es.pulses[0]);
          L.push('');
          L.push('### EVENING LIFE SLICE (shared culture pack — not a Mags desk-slice)');
          if (pulse) {
            L.push('PULSE: ' + pulse.className + ' · score ' + pulse.score + ' · ' + pulse.label);
            if (pulse.angle) L.push('ANGLE: ' + pulse.angle);
            if (pulse.hookLine) L.push('HOOK: ' + pulse.hookLine);
            if (pulse.sceneBits && pulse.sceneBits.length) {
              L.push('SCENE:');
              for (const b of pulse.sceneBits.slice(0, 6)) L.push('  - ' + b);
            }
          } else if (es.pulse) {
            L.push('PULSE: ' + es.pulse.className + ' · score ' + es.pulse.score + ' · ' + es.pulse.label);
          }
          if (es.recommend && es.recommend.bag) {
            L.push('RECOMMENDED BAG (fit, not force): ' + es.recommend.bag +
              (es.recommend.slug ? ' (`' + es.recommend.slug + '`)' : '') +
              ' — ' + (es.recommend.reason || ''));
          }
          const t = es.texture || {};
          if ((t.restaurants || []).length) {
            L.push('RESTAURANTS (named only): ' +
              t.restaurants.map(v => v.name + (v.hood ? ' (' + v.hood + ')' : '')).join('; '));
          }
          if ((t.nightlife || []).length) {
            L.push('NIGHTLIFE (named only): ' +
              t.nightlife.map(v => v.name + (v.hood ? ' (' + v.hood + ')' : '')).join('; '));
          }
          if (t.nightlifeMeta && (t.nightlifeMeta.volume != null || t.nightlifeMeta.vibe)) {
            L.push('NIGHTLIFE META: volume ' + (t.nightlifeMeta.volume ?? '—') +
              ', vibe ' + (t.nightlifeMeta.vibe || '—') +
              ', movement ' + (t.nightlifeMeta.movement || '—') +
              ' — figures are Civis Systems city data and may be cited by name; lead with the people, not the index.');
          }
          if ((t.cityEvents || []).length) L.push('CITY EVENTS: ' + t.cityEvents.join('; '));
          if ((t.tv || []).length) L.push('TV SLATE: ' + t.tv.join('; '));
          if ((t.movies || []).length) L.push('MOVIES: ' + t.movies.join('; '));
          if ((es.signals && es.signals.sightings || []).length) {
            L.push('SIGHTINGS:');
            for (const s of es.signals.sightings.slice(0, 4)) {
              L.push('  - ' + (s.name || '?') + (s.venue ? ' @ ' + s.venue : '') +
                (s.hood ? ' (' + s.hood + ')' : ''));
            }
          }
          if (es.scene && es.scene.colorRoom) L.push('COLOR: ' + es.scene.colorRoom);
          L.push('Never invent venues, employees, or neighbors. Named places only from this pack.');
        }
      } catch (_) { /* optional */ }
    }
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
  // Social wiki wall — mandatory first-wake hook when loaded (journalist = citizen).
  if (wallBlock) {
    L.push(wallBlock);
    L.push('');
  }
  L.push('This is your beat\'s signal for the cycle — POINTERS. Reach the raw material yourself');
  L.push('(read the referenced files with your tools for depth). Do NOT invent events not named here.');
  L.push('');
  L.push('### Your storylines (desk_signal lane)');
  // S361 — a storyline named people and handed over nothing but their name, so the
  // writer invented the rest (a 10-year-old became a hardware-store owner of 17
  // years; residents were invented for a hood the lane named with nobody attached).
  // Grok's Jax pack already had the answer: attach the ledger profile to the people
  // in the assignment. Same profilesFor already used for quotes — it simply never
  // reached this block.
  const laneProfiles = new Map();
  {
    const lanePops = [...new Set(lane.flatMap(e => e.popids || []))];
    if (lanePops.length) {
      try {
        for (const line of require('./canon-name-check').profilesForPopids(lanePops)) {
          const m = String(line).match(/popid: (POP-\d+)/);
          if (m) laneProfiles.set(m[1], line);
        }
      } catch (_) { /* resolver unavailable — entries still render without profiles */ }
    }
  }
  for (const e of lane) {
    const tags = [e.kind, e.hood].filter(Boolean).join(' · ');
    L.push('- ' + (e.label || '(no label)') + (tags ? '  [' + tags + ']' : ''));
    L.push('  ref: ' + e.ref);
    const known = (e.popids || []).map(p => laneProfiles.get(p)).filter(Boolean);
    for (const p of known) L.push('    who: ' + p.replace(/; popid: POP-\d+/, ''));
  }
  L.push('');
  if (laneProfiles.size) {
    L.push('The `who:` lines are the ledger record — immutable. Never give a named person a job,');
    L.push('an age, or a history that contradicts them. Street and scene texture around them is');
    L.push('yours to write; their life is not.');
    L.push('');
  }
  if (quotes && quotes.length) {
    L.push('### Citizen sources for this piece — these are REAL people, already interviewed');
    L.push('Quote FROM these people, by name, when you need a resident voice. Do NOT invent other');
    L.push('residents or attribute a quote to anyone not listed here. If you need no quote, use none —');
    L.push('but never fabricate a source when these are provided. Never print their ID numbers.');
    L.push('');
    // POPIDs deliberately absent — "Name (POP-…)" in the state taught the writer
    // to print literal POPIDs in prose (gate flag class, first 2.5.2 live run).
    const qProfiles = citizenBrief(quotes.map(q => q.name)).profiles;
    for (const q of quotes) {
      L.push('- ' + q.name + ': "' + String(q.quote).replace(/\s+/g, ' ').trim() + '"');
    }
    if (qProfiles.length) {
      L.push('');
      L.push('Who they are (ledger record — immutable, never contradict):');
      for (const p of qProfiles) L.push('  - ' + p);
    }
    L.push('');
  } else {
    L.push('### Citizen sources');
    L.push('No pre-interviewed residents this wake. Do NOT invent named residents — write from the');
    L.push('storyline facts and official record only; leave resident reaction as an open question.');
    L.push('');
  }
  // Task 2.5.3 — the room's wire: what colleagues already filed this cycle.
  const wire = readWire(cycle, 10);
  if (wire.length) {
    L.push('### The room\'s wire — already filed this cycle (do NOT re-report these; new angles only)');
    for (const w of wire) L.push(w);
    L.push('');
  }
  // pipeline.45 Phase 2 — previous day's staged filings for THIS desk ride the
  // wake state (Mike-direct 2026-08-04, supersedes the S332 zero-staged-
  // retrieval wall in-week): the newsroom's own prior filings, retrievable as
  // "what we've filed this week", never as canon fact.
  const filings = yesterdaysFilings(desk, cycle);
  if (filings.length) {
    L.push('### Your desk\'s filings from yesterday (our own prior reporting this week — NOT');
    L.push('established canon: follow the thread, reference it as "our reporting", but never');
    L.push('treat an unverified claim from it as settled fact; do NOT re-report the same story)');
    for (const f of filings) {
      L.push('');
      L.push('FILED: "' + f.headline + '"' + (f.byline ? ' — ' + f.byline : ''));
      if (f.intakeBlock) L.push(f.intakeBlock);
      if (f.excerpt) L.push(f.excerpt);
    }
    L.push('');
  }
  // pipeline.45 Phase 1 — INTAKE block: the machine-parseable index of the
  // piece. Parsed by lib/articleIntake.js at the gate; ids deliberately NOT
  // asked for — the writer state carries no POPIDs (prose-leak class) and the
  // gate resolves name->id deterministically into the .staged.json sidecar.
  L.push('END your article with this exact two-part tail (working metadata, not prose):');
  L.push('');
  L.push('First, an INTAKE section indexing what you printed. Strict line grammar — one fact');
  L.push('per line, pipe-separated fields, nothing else in the section:');
  L.push('## INTAKE');
  L.push('NAMES: <citizen name as printed> | <quoted-source OR subject OR mentioned>');
  L.push('BIZ: <business/org name as printed> | <quoted-source OR subject OR mentioned>');
  L.push('STORYLINE: <short-kebab-case-slug for the storyline this piece moves> | <advanced OR opened OR closed OR referenced>');
  L.push('HOOD: <one neighborhood the story lives in>');
  L.push('CLAIM: <one load-bearing fact or number from your article> | <the source ref backing it, from your state above>');
  L.push('One NAMES line per named citizen, one BIZ line per named business/org, one HOOD line');
  L.push('per neighborhood, one CLAIM line per load-bearing fact. Index ONLY what your article');
  L.push('actually prints — never add a person or claim to INTAKE that is not in the piece.');
  L.push('');
  // Task 2.5.3 — self-scoring footer (pressure-test #6): declared, machine-
  // checkable, stripped before publication by the Saturday compile.
  L.push('Second, this exact one-line footer:');
  L.push('<!-- SELF-SCORE: question-answered=yes|no; affected-citizen-shown=yes|no; sim-state-cited=yes|no -->');
  L.push('');
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
  const lane = (signal.lanes[desk || DESK] || []).slice();
  // civic.15 Task 3.1 (S344): the civic lane also carries today's office
  // datawakes — an office-holder voicing their domain's live numbers is beat
  // signal for the civic desk. Additive; absent dir or no wakes = no-op.
  if ((desk || DESK) === 'civic') {
    // Sunday chain decisions (S344): desk_signal is built BEFORE city hall
    // runs, so the close stage exports the cycle's decisions as lane entries.
    const civicFirst = [];
    const dl = readJson(path.join(ROOT, 'output', 'cron-civic', 'decisions_lane_c' + cycle + '.json'));
    // popids deliberately dropped: the official ALREADY spoke this cycle (their
    // words are in the label + ref file). Leaving their POPIDs in would spend the
    // 4-citizen quote pre-pass re-interviewing officials and crowd out the
    // affected residents the civic beat requires (feedback_civic-story-needs-
    // affected-citizen). Government leads the story; residents still get quoted.
    if (dl && Array.isArray(dl.entries)) civicFirst.push(...dl.entries.map(e => ({ ...e, popids: [] })));
    const dwDir = path.join(ROOT, 'output', 'cron-civic', 'datawake');
    const today = new Date().toISOString().slice(0, 10);
    if (fs.existsSync(dwDir)) {
      for (const f of fs.readdirSync(dwDir)) {
        if (!f.endsWith('_' + today + '.json')) continue;
        const w = readJson(path.join(dwDir, f));
        if (!w || !w.statement) continue;
        civicFirst.push({
          label: w.holder + ' (' + w.title + '): ' + (w.numberMoved || String(w.statement).slice(0, 100)),
          kind: 'civic-datawake',
          ref: 'output/cron-civic/datawake/' + f,
          popids: w.popid ? [w.popid] : [],
        });
      }
    }
    // PREPEND, not append (S344 verification catch): the angle wake digests
    // only lane.slice(0,12) and collectQuoteAsks caps at 4 citizens, so
    // appended civic entries sat at index 53+ and the story-picking reporter
    // never saw city hall at all. Government action leads the civic beat.
    if (civicFirst.length) lane.unshift(...civicFirst);
  }
  return lane.length ? lane : null;
}

// tag discriminates same-desk same-cycle artifacts: persona slug in single-desk
// mode (OUT_TAG), reporter name-slug in fanout mode (two civic journalists must
// not share one stem and clobber each other's angle/packet).
function stageStem(cycle, desk, tag) {
  const t = tag !== undefined ? (tag ? tag + '_' : '') : OUT_TAG;
  return (desk || DESK) + '_c' + cycle + '_' + t;
}
const nameSlug = n => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function wakeStageStem(cycle, desk, assign, personaSlug) {
  if (assign && !personaSlug) {
    const tag = nameSlug(assign.name) + (PACKET_ACTIVE ? '-packet-' + PACKET_CONTRACT : '');
    return stageStem(cycle, desk, tag);
  }
  const base = assign ? stageStem(cycle, desk, personaSlug) : stageStem(cycle, desk);
  return PACKET_ACTIVE ? base + 'packet-' + PACKET_CONTRACT + '_' : base;
}

function writerArtifactTag(assign, personaSlug) {
  if (!assign || personaSlug) return null;
  const tag = nameSlug(assign.name);
  if (!tag) throw new Error('fan-out assignment has no usable reporter name');
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(tag)) {
    throw new Error('fan-out reporter slug exceeds the writer tag contract');
  }
  return tag;
}

function buildWriterArgs(desk, stateFile, personaSlug, artifactTag, routeOverride) {
  const route = routeOverride || deskRoute(desk, personaSlug);
  return [
    path.join(ROOT, 'scripts', 'cron-desk-writer.js'),
    '--desk', desk,
    '--state-file', stateFile,
    ...(personaSlug ? ['--persona', personaSlug] : []),
    ...(artifactTag ? ['--artifact-tag', artifactTag] : []),
    // Explicit route so persona model is never lost if writer defaults shift.
    ...(route && route.provider ? ['--provider', route.provider] : []),
    ...(route && route.model ? ['--model', route.model] : []),
  ];
}

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
  activateWakeContext(assign, personaSlug);
  const stem = wakeStageStem(cycle, desk, assign, personaSlug);
  console.log('Wake 1 ANGLE — ' + desk + ' c' + cycle + (personaSlug ? ' (' + personaSlug + ')' : '') + (assign ? ' [' + assign.name + ']' : ''));
  console.log('===================================');
  const lane = loadLane(cycle, desk);
  if (!lane) { console.log('[angle] no "' + desk + '" lane in desk_signal — skipping (not an error).'); return; }
  const persona = personaInfo(personaSlug);
  const asker = persona || (assign ? { name: assign.name, popid: assign.popid } : null);
  const digest = lane.slice(0, 12).map(e => '- ' + (e.label || '(no label)') + (e.hood ? ' [' + e.hood + ']' : '')).join('\n');
  // Social wiki wall (cp-POP-*) — HARD load before angle, not optional tool.
  let wallBlock = null;
  let wallMeta = null;
  if (asker && asker.popid && !PACKET_ACTIVE) {
    try {
      const { loadReporterWall, formatWallBlock, wallAskSnippet, ensureReporterWall } =
        require(path.join(__dirname, 'reporterWall'));
      await ensureReporterWall(asker.popid);
      const wall = await loadReporterWall(asker.popid, 6);
      wallMeta = { tag: wall.tag, postCount: wall.posts.length, error: wall.error || null };
      wallBlock = formatWallBlock(wall, { name: asker.name });
      log('reporter wall: ' + (wall.tag || asker.popid) + ' posts=' + wall.posts.length +
        (wall.error ? ' err=' + wall.error : ''));
      // stash snippet for ask construction
      asker._wallSnippet = wallAskSnippet(wall, 3);
    } catch (e) {
      log('reporter wall load failed (non-fatal): ' + e.message);
    }
  }
  // Task 2.5.2/2.5.3 wake-1 shape: an ASSIGNED reporter opens the assignment and
  // plans the chase in their own voice — they never pick the angle. Personas keep
  // their authored smells-off stance (persona-only, per the plan's lane note).
  // grok: firebrand prefers Jax stink-slice over free civic firehose / Mags civic slice.
  // grok: p-slayer prefers fan-pulse slice (feed heat + charge bag) over soft sports seed.
  // grok pipeline.52: culture evening consumers prefer evening-life pack over bare hood seed.
  let story = assign && assign.story;
  let approach = assign && assign.approach;
  let jaxSlice = null;
  let pslayerSlice = null;
  let eveningSlice = null;
  let anthonySlice = null;
  let halSlice = null;
  let economicSlice = null;
  const EVENING_SLUGS = {
    'mason-ortega': 1, 'kai-marston': 1, 'sharon-okafor': 1,
    'maria-keen': 1, 'elliot-graye': 1
  };
  if (personaSlug === 'freelance-firebrand' && !story) {
    try {
      const { loadJaxSlice } = require(path.join(__dirname, 'buildJaxSlice'));
      jaxSlice = loadJaxSlice(cycle);
      if (jaxSlice && !jaxSlice.empty) {
        story = jaxSlice.story;
        approach = jaxSlice.approach || approach;
        log('jax slice loaded — stink ' + jaxSlice.stink.className + ' score ' + jaxSlice.stink.score);
      }
    } catch (e) {
      log('jax slice load failed (non-fatal): ' + e.message);
    }
  } else if (personaSlug === 'freelance-firebrand' && story) {
    try {
      const { loadJaxSlice } = require(path.join(__dirname, 'buildJaxSlice'));
      jaxSlice = loadJaxSlice(cycle);
    } catch (_) { /* optional scene pack */ }
  } else if (personaSlug === 'p-slayer') {
    try {
      const { loadPSlayerSlice } = require(path.join(__dirname, 'buildPSlayerSlice'));
      pslayerSlice = loadPSlayerSlice(cycle);
      if (pslayerSlice && !pslayerSlice.empty) {
        // Fan-heat pulse wins over generic sports lane seed when present.
        story = pslayerSlice.story || story;
        approach = pslayerSlice.approach || approach;
        log('pslayer slice loaded — pulse ' + pslayerSlice.pulse.className +
          ' score ' + pslayerSlice.pulse.score + ' charge ' + pslayerSlice.charge.fanCharge);
      }
    } catch (e) {
      log('pslayer slice load failed (non-fatal): ' + e.message);
    }
  } else if (personaSlug === 'anthony-raines') {
    try {
      const { loadAnthonySlice } = require(path.join(__dirname, 'buildAnthonySlice'));
      anthonySlice = loadAnthonySlice(cycle);
      if (anthonySlice && !anthonySlice.empty) {
        story = anthonySlice.story || story;
        approach = anthonySlice.approach || approach;
        log('anthony slice loaded — pulse ' + anthonySlice.pulse.className +
          ' score ' + anthonySlice.pulse.score +
          ' foil ' + (anthonySlice.pulse.foilNumber || '—'));
      }
    } catch (e) {
      log('anthony slice load failed (non-fatal): ' + e.message);
    }
  } else if (personaSlug === 'hal-richmond') {
    try {
      const { loadHalSlice } = require(path.join(__dirname, 'buildHalSlice'));
      halSlice = loadHalSlice(cycle);
      if (halSlice && !halSlice.empty) {
        story = halSlice.story || story;
        approach = halSlice.approach || approach;
        log('hal slice loaded — pulse ' + halSlice.pulse.className +
          ' score ' + halSlice.pulse.score +
          ' close ' + (halSlice.pulse.closingNote || '—'));
      }
    } catch (e) {
      log('hal slice load failed (non-fatal): ' + e.message);
    }
  } else if (desk === 'business') {
    try {
      const { loadEconomicSlice } = require(path.join(__dirname, 'buildEconomicSlice'));
      economicSlice = loadEconomicSlice(cycle);
      if (economicSlice && !economicSlice.empty) {
        story = economicSlice.story || story;
        approach = economicSlice.approach || approach;
        log('economic slice loaded — pulse ' + economicSlice.pulse.className +
          ' score ' + economicSlice.pulse.score +
          ' hood ' + (economicSlice.pulse.hood || '—'));
      }
    } catch (e) {
      log('economic slice load failed (non-fatal): ' + e.message);
    }
  } else if (personaSlug && EVENING_SLUGS[personaSlug]) {
    try {
      const {
        loadEveningSlice, assignmentFromSlice
      } = require(path.join(__dirname, 'buildEveningSlice'));
      eveningSlice = loadEveningSlice(cycle);
      if (eveningSlice && !eveningSlice.empty) {
        const from = assignmentFromSlice(eveningSlice, personaSlug);
        if (from) {
          // Graye keeps a prior non-faith story when pack has no faith heat.
          if (personaSlug === 'elliot-graye' && from.pulse &&
              from.pulse.className !== 'faith-overlap' && story) {
            approach = from.approach || approach;
          } else {
            story = from.story || story;
            approach = from.approach || approach;
          }
        }
        log('evening slice loaded — pulse ' +
          (eveningSlice.pulse && eveningSlice.pulse.className) +
          ' score ' + (eveningSlice.pulse && eveningSlice.pulse.score) +
          ' bag=' + ((from && from.bag) ||
            (eveningSlice.recommend && eveningSlice.recommend.bag) || '—'));
      }
    } catch (e) {
      log('evening slice load failed (non-fatal): ' + e.message);
    }
  }
  let angleRead = null;
  let inputPacket = null;
  if (asker) {
    const brief = story ? citizenBrief(story.citizens) : { names: [], profiles: [] };
    // grok 2026-08-06: persona + stink seed → lead with the contradiction (not free
    // digest only, not civic "official action first"). Roster + story stays EIC-fixed.
    // Persona without story keeps the original smells-off digest ask.
    // grok 2026-08-07: p-slayer gets fan-heat ask (not Jax stink register).
    let ask;
    if (persona && personaSlug === 'p-slayer' && story) {
      const sceneBits = [];
      if (pslayerSlice) {
        if (pslayerSlice.pulse) {
          sceneBits.push('PULSE CLASS: ' + pslayerSlice.pulse.className + ' · score ' + pslayerSlice.pulse.score);
          if (pslayerSlice.pulse.record) {
            sceneBits.push('RECORD/STREAK: ' + pslayerSlice.pulse.record + ' / ' + (pslayerSlice.pulse.streak || '—'));
          }
          if (pslayerSlice.pulse.fanSentiment) {
            sceneBits.push('FAN SENTIMENT: ' + pslayerSlice.pulse.fanSentiment +
              (pslayerSlice.pulse.mood ? ' · mood ' + pslayerSlice.pulse.mood : ''));
          }
        }
        if (pslayerSlice.charge) {
          sceneBits.push('BAG MODES: ' + (pslayerSlice.charge.bagModes || []).map(m => m.id + ' ' + m.name).join('; '));
          sceneBits.push('FAN CHARGE: ' + pslayerSlice.charge.fanCharge);
          if (pslayerSlice.charge.foilNumber) sceneBits.push('FOIL NUMBER: ' + pslayerSlice.charge.foilNumber);
        }
        if (pslayerSlice.friction) {
          sceneBits.push('FRICTION A: ' + pslayerSlice.friction.a);
          sceneBits.push('FRICTION B: ' + pslayerSlice.friction.b);
          sceneBits.push('FRAME: ' + pslayerSlice.friction.frame);
        }
        if (pslayerSlice.priorTakes && pslayerSlice.priorTakes.length) {
          sceneBits.push('PRIOR TAKES (eat or double down):');
          for (const p of pslayerSlice.priorTakes.slice(0, 3)) {
            sceneBits.push('  - C' + (p.cycle != null ? p.cycle : '?') + ' ' + p.headline + ' [' + p.why + ']');
          }
        }
      }
      ask = 'You\'re ' + asker.name + '. This is the fan-heat pulse you\'re writing into — not the press box:\n' +
        'PULSE: ' + (story.angle || story.label) +
        (story.pulseClass ? '\nCLASS: ' + story.pulseClass : '') +
        (story.hookLine ? '\nHOOK: ' + story.hookLine : '') +
        (brief.names.length ? '\nPLAYERS / NAMES (feed + ledger — do not invent):\n' +
          brief.names.map(n => '  - ' + n).join('\n') : '') +
        (story.hood ? '\nWHERE (feed neighborhood): ' + story.hood : '') +
        (sceneBits.length ? '\nCHARGE PACK:\n' + sceneBits.join('\n') : '') +
        (approach ? '\n\n' + approach : '') +
        (asker._wallSnippet ? '\n\n' + asker._wallSnippet : '') +
        '\n\nIn your own voice (I/we): what does this feel like in the stands, which charge-bag mode you\'re riding, ' +
        'and what prior take you\'re eating or doubling down on? Name the friction pivot. ' +
        'Do not open with FO process or Anthony board math. One heat. End on dare, confession, or update.';
    } else if (persona && personaSlug === 'anthony-raines' && story) {
      const sceneBits = [];
      if (anthonySlice && !anthonySlice.empty) {
        if (anthonySlice.pulse) {
          sceneBits.push('PULSE CLASS: ' + anthonySlice.pulse.className + ' · score ' + anthonySlice.pulse.score);
          if (anthonySlice.pulse.foilNumber) sceneBits.push('FOIL (feed): ' + anthonySlice.pulse.foilNumber);
          if (anthonySlice.pulse.record) {
            sceneBits.push('RECORD/STREAK: ' + anthonySlice.pulse.record + ' / ' +
              (anthonySlice.pulse.streak || '—'));
          }
        }
        if (anthonySlice.bag && anthonySlice.bag.tools) {
          sceneBits.push('BAG TOOLS: ' + anthonySlice.bag.tools.map(t => t.id + ' ' + t.name).join('; '));
        }
        if (anthonySlice.bag && anthonySlice.bag.claim) sceneBits.push('CLAIM: ' + anthonySlice.bag.claim);
        if (anthonySlice.prewrite && anthonySlice.prewrite.lineFacts) {
          sceneBits.push('LINE FACTS:');
          for (const f of anthonySlice.prewrite.lineFacts.slice(0, 4)) sceneBits.push('  - ' + f);
        }
        if (anthonySlice.prewrite && anthonySlice.prewrite.missing) {
          sceneBits.push('MISSING: ' + anthonySlice.prewrite.missing.slice(0, 3).join('; '));
        }
      }
      ask = 'You\'re ' + asker.name + '. This is the analytic board pulse — not the bleachers:\n' +
        'PULSE: ' + (story.angle || story.label) +
        (story.pulseClass ? '\nCLASS: ' + story.pulseClass : '') +
        (story.hookLine ? '\nHOOK: ' + story.hookLine : '') +
        (brief.names.length ? '\nPLAYERS / NAMES (feed + ledger — do not invent):\n' +
          brief.names.map(n => '  - ' + n).join('\n') : '') +
        (story.hood ? '\nWHERE: ' + story.hood : '') +
        (sceneBits.length ? '\nBOARD PACK:\n' + sceneBits.join('\n') : '') +
        (approach ? '\n\n' + approach : '') +
        (asker._wallSnippet ? '\n\n' + asker._wallSnippet : '') +
        '\n\nIn third person: what is the one evaluative claim, which bag tools you ride, and which feed line numbers ' +
        'must appear? Do not open with fan we or Hal elegy. Never invent x-stats. One argument spine.';
    } else if (persona && personaSlug === 'hal-richmond' && story) {
      const sceneBits = [];
      if (halSlice && !halSlice.empty) {
        if (halSlice.pulse) {
          sceneBits.push('PULSE CLASS: ' + halSlice.pulse.className + ' · score ' + halSlice.pulse.score);
          sceneBits.push('CLOSING NOTE: ' + halSlice.pulse.closingNote);
          if (halSlice.pulse.foilNumber) sceneBits.push('RECEIPT (feed): ' + halSlice.pulse.foilNumber);
        }
        if (halSlice.bag && halSlice.bag.modes) {
          sceneBits.push('BAG MODES: ' + halSlice.bag.modes.map(m => m.id + ' ' + m.name).join('; '));
        }
        if (halSlice.bag && halSlice.bag.historicalAnchor) {
          sceneBits.push('HISTORICAL ANCHOR: ' + halSlice.bag.historicalAnchor);
        }
        if (halSlice.prewrite && halSlice.prewrite.presentFacts) {
          sceneBits.push('PRESENT FACTS:');
          for (const f of halSlice.prewrite.presentFacts.slice(0, 4)) sceneBits.push('  - ' + f);
        }
        if (halSlice.priorTakes && halSlice.priorTakes.length) {
          sceneBits.push('PRIOR FILINGS:');
          for (const p of halSlice.priorTakes.slice(0, 3)) {
            sceneBits.push('  - C' + (p.cycle != null ? p.cycle : '?') + ' ' + p.headline);
          }
        }
      }
      ask = 'You\'re ' + asker.name + '. This is the archive pulse — present fact first, then time:\n' +
        'PULSE: ' + (story.angle || story.label) +
        (story.pulseClass ? '\nCLASS: ' + story.pulseClass : '') +
        (story.closingNote ? '\nCLOSING NOTE: ' + story.closingNote : '') +
        (story.hookLine ? '\nHOOK: ' + story.hookLine : '') +
        (brief.names.length ? '\nPLAYERS / NAMES (feed + ledger — do not invent):\n' +
          brief.names.map(n => '  - ' + n).join('\n') : '') +
        (story.hood ? '\nWHERE: ' + story.hood : '') +
        (sceneBits.length ? '\nARCHIVE PACK:\n' + sceneBits.join('\n') : '') +
        (approach ? '\n\n' + approach : '') +
        (asker._wallSnippet ? '\n\n' + asker._wallSnippet : '') +
        '\n\nIn first-person reflective voice: name the present fact, the era echo you will touch, ' +
        'and which closing note you ride. Not fan we. Not Anthony board. Not business storefront. Not wire copy.';
    } else if (desk === 'business' && story && economicSlice && !economicSlice.empty) {
      const sceneBits = [];
      if (economicSlice.pulse) {
        sceneBits.push('PULSE: ' + economicSlice.pulse.className + ' · score ' + economicSlice.pulse.score +
          ' · ' + economicSlice.pulse.label);
      }
      if ((economicSlice.pulse.namedBusinesses || []).length) {
        sceneBits.push('NAMED BUSINESSES (sources only): ' + economicSlice.pulse.namedBusinesses.join('; '));
      }
      if (economicSlice.texture) {
        if ((economicSlice.texture.cooling || []).length) {
          sceneBits.push('COOLING HOODS: ' + economicSlice.texture.cooling.slice(0, 6).join('; '));
        }
        if ((economicSlice.texture.rising || []).length) {
          sceneBits.push('RISING HOODS: ' + economicSlice.texture.rising.slice(0, 6).join('; '));
        }
      }
      if (economicSlice.prewrite && economicSlice.prewrite.forbidden) {
        sceneBits.push('FORBIDDEN: ' + economicSlice.prewrite.forbidden.join('; '));
      }
      ask = 'You\'re ' + asker.name + '. This is the economic / storefront pulse — named places only:\n' +
        'PULSE: ' + (story.angle || story.label) +
        (story.pulseClass ? '\nCLASS: ' + story.pulseClass : '') +
        (story.hookLine ? '\nHOOK: ' + story.hookLine : '') +
        (brief.names.length ? '\nCITIZENS (packet only):\n' + brief.names.map(n => '  - ' + n).join('\n') : '') +
        (story.hood ? '\nWHERE: ' + story.hood : '') +
        (sceneBits.length ? '\nSTOREFRONT PACK:\n' + sceneBits.join('\n') : '') +
        (approach ? '\n\n' + approach : '') +
        (asker._wallSnippet ? '\n\n' + asker._wallSnippet : '') +
        '\n\nIn your own voice: which hood or named business is moving, what does the block feel like, ' +
        'and what must not be invented (employees, owners, counts)? One economic claim. Not civic process filler.';
    } else if (persona && EVENING_SLUGS[personaSlug] && story) {
      const sceneBits = [];
      if (eveningSlice && !eveningSlice.empty) {
        if (eveningSlice.pulse) {
          sceneBits.push('TOP PULSE: ' + eveningSlice.pulse.className + ' · score ' + eveningSlice.pulse.score +
            ' · ' + eveningSlice.pulse.label);
        }
        if (story.pulseClass) sceneBits.push('YOUR PULSE CLASS: ' + story.pulseClass);
        if (eveningSlice.recommend && eveningSlice.recommend.bag) {
          sceneBits.push('RECOMMENDED BAG: ' + eveningSlice.recommend.bag +
            (eveningSlice.recommend.slug ? ' (`' + eveningSlice.recommend.slug + '`)' : ''));
        }
        const t = eveningSlice.texture || {};
        if ((t.restaurants || []).length) {
          sceneBits.push('RESTAURANTS: ' +
            t.restaurants.map(v => v.name + (v.hood ? ' (' + v.hood + ')' : '')).join('; '));
        }
        if ((t.nightlife || []).length) {
          sceneBits.push('NIGHTLIFE: ' +
            t.nightlife.map(v => v.name + (v.hood ? ' (' + v.hood + ')' : '')).join('; '));
        }
        if (t.nightlifeMeta && t.nightlifeMeta.vibe) {
          sceneBits.push('NIGHT META: volume ' + (t.nightlifeMeta.volume ?? '—') +
            ', vibe ' + t.nightlifeMeta.vibe + ', movement ' + (t.nightlifeMeta.movement || '—'));
        }
        if ((t.cityEvents || []).length) sceneBits.push('CITY EVENTS: ' + t.cityEvents.join('; '));
        if ((eveningSlice.signals && eveningSlice.signals.sightings || []).length) {
          for (const s of eveningSlice.signals.sightings.slice(0, 3)) {
            sceneBits.push('SIGHTING: ' + (s.name || '?') + (s.venue ? ' @ ' + s.venue : ''));
          }
        }
      }
      ask = 'You\'re ' + asker.name + '. This is the evening-life pulse you\'re writing into — named places only:\n' +
        'PULSE: ' + (story.angle || story.label) +
        (story.pulseClass ? '\nCLASS: ' + story.pulseClass : '') +
        (story.hookLine ? '\nHOOK: ' + story.hookLine : '') +
        (story.venue || story.named ? '\nNAMED: ' + (story.venue || story.named) : '') +
        (brief.names.length ? '\nNAMES (packet only — do not invent):\n' +
          brief.names.map(n => '  - ' + n).join('\n') : '') +
        (story.hood ? '\nWHERE: ' + story.hood : '') +
        (sceneBits.length ? '\nEVENING PACK:\n' + sceneBits.join('\n') : '') +
        (approach ? '\n\n' + approach : '') +
        (asker._wallSnippet ? '\n\n' + asker._wallSnippet : '') +
        '\n\nIn your own voice: which named room or sighting are you standing in, what is true there tonight, ' +
        'and what question or image ends the piece? Never invent venues or employees. One pulse. Not multi-voice culture average.';
    } else if (persona && story) {
      const sceneBits = [];
      if (jaxSlice && jaxSlice.scene) {
        if (jaxSlice.scene.weather) sceneBits.push('WEATHER: ' + jaxSlice.scene.weather);
        if (jaxSlice.scene.neighborhoodTexture) sceneBits.push('HOOD TEXTURE: ' + jaxSlice.scene.neighborhoodTexture);
        if (jaxSlice.contradiction) {
          sceneBits.push('CONTRADICTION A: ' + jaxSlice.contradiction.a);
          sceneBits.push('CONTRADICTION B: ' + jaxSlice.contradiction.b);
        }
      }
      ask = 'You\'re ' + asker.name + '. Something stinks and this is the lead you\'re not walking past:\n' +
        'STINK: ' + (story.angle || story.label) +
        (story.stinkClass ? '\nCLASS: ' + story.stinkClass : '') +
        (story.hookLine ? '\nHOOK: ' + story.hookLine : '') +
        (brief.names.length ? '\nAFFECTED CITIZENS (real, from the record): ' + brief.names.join('; ') : '') +
        (brief.profiles.length ? '\nWHO THEY ARE (ledger — RoleType immutable):\n' + brief.profiles.map(p => '  - ' + p).join('\n') : '') +
        (story.hood ? '\nWHERE: ' + story.hood : '') +
        (sceneBits.length ? '\nSCENE PACK:\n' + sceneBits.join('\n') : '') +
        (approach ? '\n\n' + approach : '') +
        (asker._wallSnippet ? '\n\n' + asker._wallSnippet : '') +
        '\n\nIn your own voice: what does not line up, who should answer, and what question ends the piece? ' +
        'Hook your wall posts for continuity (do not amnesia). Color the room from the scene pack without inventing careers or named people. ' +
        'Do not file a process roundup. One stink. Name names of canon officials only.';
    } else if (!persona && story) {
      ask = 'You\'re ' + asker.name + ', ' + desk + ' desk. Your editor just handed you today\'s assignment:\n' +
        'ASSIGNED ANGLE: ' + (story.angle || story.label) +
        (story.hookLine ? '\nHOOK: ' + story.hookLine : '') +
        (brief.names.length ? '\nAFFECTED CITIZENS (real, from the record): ' + brief.names.join('; ') : '') +
        (brief.profiles.length ? '\nWHO THEY ARE (ledger — plan around who they actually are):\n' + brief.profiles.map(p => '  - ' + p).join('\n') : '') +
        (story.hood ? '\nWHERE: ' + story.hood : '') +
        (approach ? '\n\n' + approach : '') +
        (asker._wallSnippet ? '\n\n' + asker._wallSnippet : '') +
        '\n\nThe angle is fixed — the story is yours to create from it. In your own voice: how do you ' +
        'chase this today? What will you verify in the record first, and who do you want to talk to?';
    } else {
      ask = 'You\'re ' + asker.name + ', between stories. This is the ' + desk + ' beat\'s raw signal this cycle:\n' + digest +
        (asker._wallSnippet ? '\n\n' + asker._wallSnippet : '') +
        '\n\nWhat\'s smelling off to you? Point at the ONE thing nobody\'s touching — and name who should answer for it.';
    }
    if (PACKET_ACTIVE) {
      inputPacket = livedPacket.buildAnglePacket({
        cycle, desk, reporter: asker, story, approach,
        slice: jaxSlice || pslayerSlice, lane,
      });
      ask = livedPacket.prompt(inputPacket);
    }
    log('asking ' + asker.name + ' (' + asker.popid + ') ' +
      (PACKET_ACTIVE ? 'for a typed reporter plan...' : 'what smells off...'));
    const out = execFileSync('node', [path.join(ROOT, 'scripts', 'citizenVoice.js'),
      '--pop=' + asker.popid, '--ask=' + ask, '--cycle=' + cycle, '--json',
      ...(PACKET_ACTIVE ? ['--evidence-bound'] : []),
      ...(ACTIVE_WAKE_PACKAGE ? ['--model=' + wakePackages.routeFor(ACTIVE_WAKE_PACKAGE, 'angle').model] : []),
      '--max-tokens=' + (PACKET_ACTIVE ? '700' : '320')],
      { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
    const outTrim = out.trim();
    // tolerate dotenv banner lines before the JSON — line-anchored: the rotating
    // dotenv tip sometimes contains "{ debug: true }" mid-line, so first-'{' slicing
    // randomly broke here ("Expected property name or '}' at position 2").
    const jsonStart = outTrim.search(/^\{/m);
    if (jsonStart === -1) throw new Error('citizenVoice --json returned no JSON envelope: ' + outTrim.slice(0, 200));
    const r = JSON.parse(outTrim.slice(jsonStart));
    const plan = PACKET_ACTIVE ? livedPacket.validateAngleOutput(r.text, inputPacket) : null;
    angleRead = { name: r.name, popid: r.popId,
      text: PACKET_ACTIVE ? JSON.stringify(plan, null, 2) : r.text,
      ...(plan ? { plan } : {}) };
    log('angle read: "' + String(r.text).replace(/\s+/g, ' ').slice(0, 140) + '..."');
  }
  // Task 2.5.3 §2 — canon research through the 2.5.5 tool loop, validated
  // deterministically. Non-fatal: a research failure never kills the wake.
  let canonResearch = null;
  if (!persona && story) {
    try { canonResearch = await runCanonResearch(cycle, desk, story, asker, stem); }
    catch (e) { log('canon research failed (non-fatal): ' + e.message); }
  }
  const anglePath = path.join(COMPARE, stem + 'angle.json');
  fs.mkdirSync(COMPARE, { recursive: true });
  fs.writeFileSync(anglePath, JSON.stringify({
    stage: 'angle', desk, cycle, persona: personaSlug,
    ...(PACKET_ACTIVE ? { packetContract: livedPacket.VERSION, inputPacket } : {}),
    reporter: assign ? { name: assign.name, popid: assign.popid } : (persona ? { name: persona.name, popid: persona.popid } : null),
    assignment: story ? { story, approach } : null,   // Task 2.5.2: the EIC assignment rides the handoff
    jaxSlice: jaxSlice ? {
      stink: jaxSlice.stink,
      contradiction: jaxSlice.contradiction,
      scene: jaxSlice.scene,
      citizens: jaxSlice.citizens,
      bonds: (jaxSlice.bonds || []).slice(0, 12),
      gaps: jaxSlice.gaps
    } : null,
    pslayerSlice: pslayerSlice && !pslayerSlice.empty ? {
      pulse: pslayerSlice.pulse,
      charge: pslayerSlice.charge,
      prewrite: pslayerSlice.prewrite,
      friction: pslayerSlice.friction,
      priorTakes: pslayerSlice.priorTakes,
      players: pslayerSlice.players,
      scene: pslayerSlice.scene,
      candidates: (pslayerSlice.candidates || []).slice(0, 6)
    } : null,
    eveningSlice: eveningSlice && !eveningSlice.empty ? {
      pulse: eveningSlice.pulse,
      recommend: eveningSlice.recommend,
      prewrite: eveningSlice.prewrite,
      texture: eveningSlice.texture,
      signals: {
        fameCount: eveningSlice.signals && eveningSlice.signals.fameCount,
        sightingCount: eveningSlice.signals && eveningSlice.signals.sightingCount,
        sightings: (eveningSlice.signals && eveningSlice.signals.sightings || []).slice(0, 6)
      },
      scene: eveningSlice.scene,
      candidates: (eveningSlice.candidates || []).slice(0, 8),
      perSeat: eveningSlice.perSeat
    } : null,
    anthonySlice: anthonySlice && !anthonySlice.empty ? {
      pulse: anthonySlice.pulse,
      bag: anthonySlice.bag,
      prewrite: anthonySlice.prewrite,
      friction: anthonySlice.friction,
      players: anthonySlice.players,
      scene: anthonySlice.scene,
      candidates: (anthonySlice.candidates || []).slice(0, 6)
    } : null,
    halSlice: halSlice && !halSlice.empty ? {
      pulse: halSlice.pulse,
      bag: halSlice.bag,
      prewrite: halSlice.prewrite,
      friction: halSlice.friction,
      priorTakes: (halSlice.priorTakes || []).slice(0, 4),
      players: halSlice.players,
      scene: halSlice.scene,
      candidates: (halSlice.candidates || []).slice(0, 6)
    } : null,
    economicSlice: economicSlice && !economicSlice.empty ? {
      pulse: economicSlice.pulse,
      prewrite: economicSlice.prewrite,
      texture: {
        rising: economicSlice.texture && economicSlice.texture.rising,
        cooling: economicSlice.texture && economicSlice.texture.cooling,
        ledgerCount: economicSlice.texture && economicSlice.texture.ledgerCount,
        ledgerSource: economicSlice.texture && economicSlice.texture.ledgerSource,
        venues: (economicSlice.texture && economicSlice.texture.venues || []).slice(0, 8)
      },
      scene: economicSlice.scene,
      candidates: (economicSlice.candidates || []).slice(0, 8)
    } : null,
    reporterWall: wallMeta,
    canonResearch,                                    // Task 2.5.3 §2: ≥3 validated canon facts + tool trace
    angleRead,
    lanePicks: lane.slice(0, 5).map(e => ({ label: e.label, kind: e.kind, hood: e.hood, ref: e.ref, popids: e.popids || [] })),
    laneEntries: lane.length,
    ranAt: new Date().toISOString()
  }, null, 2));
  console.log('angle → ' + path.relative(ROOT, anglePath));
  // Task 2.5.3 — one growing template per story: wake 1 opens it (§1 assignment
  // + §2 the reporter's plan); wake 2 appends interviews; wake 3 appends the
  // article pointer. Uniform shape, one inspectable doc per story.
  storyDocOpen(stem, { desk, cycle, reporter: asker, story, approach, angleRead });
  if (canonResearch) {
    storyDocAppend(stem, '§2b CANON RESEARCH (wake 1 — validated, refs resolve, ≥1 deep thread)',
      canonResearch.facts.map(f => '- ' + f.fact + '\n  ref: ' + f.ref).join('\n') +
      '\n\nselection: ' + canonResearch.source +
      '\nnlm archive brief: ' + (canonResearch.nlmBrief || 'none (grep floor only)') +
      (canonResearch.trace.length
        ? '\ntool trace (2.5.5 scoreboard): ' + canonResearch.trace.map(t => t.tool + '(' + JSON.stringify(t.input) + ')→' + t.resultChars + 'ch').join('; ')
        : '\ntool trace: none — composed from the gathered floor'));
  }
}

// Task 2.5.3 §3 — the assignment's citizens presented WITH their ledger
// profiles. Names alone invited invented bios (first live run: the writer made
// 10-year-old student Tomas Renteria a long-time hardware-store owner); the
// profile line is the deterministic kill for that class. POPIDs are stripped
// from every writer-facing surface — literals in prose are a gate flag.
function citizenBrief(citizens) {
  const names = (citizens || []).map(c => String(c).replace(/\s*\(POP-[\d]+\)\s*/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  let profiles = [];
  try { profiles = require('./canon-name-check').profilesFor(names); } catch (_) { /* no snapshot -> names only */ }
  return { names, profiles };
}

// ---------------------------------------------------------------------------
// Task 2.5.3 §2 — canon research, mechanically enforced. The raw-API model
// cannot search on its own initiative alone, so the SCRIPT gathers the floor
// (edition-archive grep + world-summary slices + the assignment's evidence
// ref) and the model selects + cites its facts through the bounded 2.5.5 tool
// loop — digging PAST the floor is the point. The depth validator is the
// deterministic wall: ≥3 facts, every ref resolves, ≥2 distinct sources,
// ≥1 predating the current cycle (pressure-test #3 — same-paragraph citation
// gaming fails).
// ---------------------------------------------------------------------------
function grepLines(args, capN) {
  try {
    const out = execFileSync('grep', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    return out.split('\n').filter(Boolean).slice(0, capN);
  } catch (_) { return []; }   // grep exit 1 = no match
}

function gatherCanonCandidates(cycle, story) {
  const terms = [];
  if (story.hood) terms.push(...String(story.hood).split(',').map(s => s.trim()).filter(Boolean));
  const { profilesFor } = require('./canon-name-check');
  const names = (story.citizens || []).map(c => String(c).replace(/\s*\(POP-[\d]+\)\s*/g, '').trim()).filter(Boolean);
  const lines = [];
  for (const t of terms.slice(0, 2)) {
    for (const l of grepLines(['-rni', '-m', '2', '--include=*.txt', '--', t, 'editions'], 6)) lines.push(l);
  }
  for (const n of names.slice(0, 3)) {
    for (const l of grepLines(['-rni', '-m', '1', '--include=*.txt', '--', n, 'editions'], 3)) lines.push(l);
  }
  for (const t of terms.slice(0, 1)) {
    for (const l of grepLines(['-ni', '-m', '4', '--', t, 'output/world_summary_c' + cycle + '.md'], 4)) {
      lines.push('output/world_summary_c' + cycle + '.md:' + l);
    }
  }
  const profiles = profilesFor(names);
  return { lines: [...new Set(lines)].slice(0, 16), profiles };
}

// ref shapes accepted: "editions/foo.txt:123: text", "output/world_summary_c102.md:9",
// or the assignment's own evidence ref. A ref resolves when its file exists.
function refFile(ref) {
  const head = String(ref || '').split(/[\s;]/)[0];
  return head.split(':')[0];
}
function refCycleNum(ref) {
  const m = String(ref || '').match(/_c?(\d+)[_.]/) || String(ref || '').match(/c(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}
function validateCanonFacts(facts, cycle, storyRef) {
  const errs = [];
  const list = Array.isArray(facts) ? facts.filter(f => f && f.fact && f.ref) : [];
  if (list.length < 3) errs.push('fewer than 3 facts with fact+ref');
  const files = new Set();
  let priorCount = 0;
  for (const f of list) {
    const file = refFile(f.ref);
    const isStoryRef = storyRef && String(f.ref).startsWith(refFile(storyRef));
    if (!isStoryRef && !fs.existsSync(path.join(ROOT, file))) errs.push('ref does not resolve: ' + f.ref);
    files.add(file);
    const cn = refCycleNum(f.ref);
    if (cn !== null && cn < parseInt(cycle, 10)) priorCount++;
  }
  if (files.size < 2) errs.push('facts span fewer than 2 distinct sources');
  if (!priorCount) errs.push('no fact predates the current cycle (deep-thread rule)');
  return { ok: errs.length === 0, errs, facts: list };
}

// pipeline.51b — NotebookLM archive continuity joins the canon-research floor.
// The published-record notebook answers a per-assignment continuity query; the
// cited answer is saved as a ref-able file in the run dir so the validator
// accepts it like any other source. Non-blocking by bridge contract: auth rot
// (cookies die every 2-4 weeks), rate limits, and CLI absence all degrade to
// the grep floor — a hard NLM gate would kill every wake the week auth expires.
function nlmCanonBrief(cycle, story, stem) {
  try {
    const cfg = readJson(path.join(ROOT, 'config/notebooklm.json'));
    if (!cfg || !cfg.notebookId) return null;
    const { NLM, nlm } = require('./notebooklmPush');
    if (!fs.existsSync(NLM)) return null;
    const names = (story.citizens || []).map(c => String(c).replace(/\s*\(POP-[\d]+\)\s*/g, '').trim()).filter(Boolean);
    const prompt = [
      'Using only the published sources in this notebook, prepare a cited continuity brief for this newsroom assignment for Cycle ' + cycle + ':',
      '- Assignment: ' + (story.angle || story.label) + (story.hood ? ' — ' + story.hood : ''),
      names.length ? '- Named citizens: ' + names.slice(0, 5).join(', ') : null,
      'Trace prior events, promises, institutions, and unresolved storylines that bear on this assignment.',
      'Separate direct published fact from inference. Do not invent missing history, quotes, figures, or current-cycle outcomes.'
    ].filter(Boolean).join('\n');
    const q = nlm(['notebook', 'query', cfg.notebookId, prompt, '--json', '--timeout', '180'], { timeoutMs: 200 * 1000 });
    if (!q.ok) { log('[research] nlm archive query skipped (non-fatal): ' + q.out.slice(0, 160)); return null; }
    let answer = '';
    try {
      const j = JSON.parse(q.out);
      answer = String(j.answer || j.response || j.text || '').trim();
    } catch (_) {}
    if (!answer) return null;
    const file = path.join(COMPARE, stem + 'nlm-canon.md');
    fs.mkdirSync(COMPARE, { recursive: true });
    fs.writeFileSync(file,
      '# Archive continuity brief — NotebookLM over the published record\n\n' +
      'Assignment: ' + (story.angle || story.label) + '\nCycle: ' + cycle + '\n\n' + answer + '\n');
    return { rel: path.relative(ROOT, file), answer };
  } catch (e) {
    log('[research] nlm archive query failed (non-fatal): ' + e.message);
    return null;
  }
}

async function runCanonResearch(cycle, desk, story, reporter, stem) {
  const { openRouterToolLoop } = require('./cron-desk-writer');
  const cand = gatherCanonCandidates(cycle, story);
  const brief = stem ? nlmCanonBrief(cycle, story, stem) : null;
  const briefLines = brief
    ? brief.answer.slice(0, 2400).split('\n').slice(0, 40)
      .map((l, i) => String(i + 1).padStart(3) + ': ' + l)
    : [];
  const material = [
    'CANDIDATE MATERIAL (each line is "file:line: text" — usable as a ref):',
    ...cand.lines.map(l => '- ' + l.slice(0, 300)),
    '',
    'LEDGER PROFILES (immutable):',
    ...cand.profiles.map(p => '- ' + p),
    '',
    ...(brief ? [
      'ARCHIVE CONTINUITY BRIEF (NotebookLM synthesis over the published record — cite a line as "' + brief.rel + ':<line>"):',
      ...briefLines,
      '',
    ] : []),
    'ASSIGNMENT EVIDENCE REF (usable as a ref): ' + story.ref
  ].join('\n');
  const system = 'You are a newsroom researcher. You verify against the record and cite precisely. Return ONLY strict JSON.';
  const user = 'Assignment (' + desk + ' desk): ' + (story.angle || story.label) +
    (story.hood ? ' — ' + story.hood : '') + '\n\n' + material +
    '\n\nSelect AT LEAST 3 canon facts that ground this assignment — current AND deep threads. Rules:\n' +
    '- every fact carries a ref: a file:line from the material, the assignment evidence ref, or a file you found via canon_search\n' +
    (brief ? '- the archive continuity brief is the deepest source here — prefer its threads where they are specific\n' : '') +
    '- facts must span at least 2 distinct source files\n' +
    '- at least 1 fact must come from a PAST cycle (an earlier edition or earlier-cycle file)\n' +
    '- use canon_search to dig past the material where it runs thin\n' +
    'Return ONLY JSON: {"facts":[{"fact":"...","ref":"..."}]}';
  let trace = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await openRouterToolLoop({ model: 'deepseek/deepseek-chat', system, user, maxToolCalls: 3, maxTokens: 900 });
    trace = trace.concat(r.trace);
    let parsed = null;
    try {
      const m = String(r.text).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch (_) {}
    const v = validateCanonFacts(parsed && parsed.facts, cycle, story.ref);
    if (v.ok) return { facts: v.facts, source: 'model', trace, nlmBrief: brief ? brief.rel : null };
    log('[research] attempt ' + (attempt + 1) + ' failed validation: ' + v.errs.join('; '));
  }
  // Deterministic fallback — the floor itself, validator-passing by construction:
  // one edition line (prior cycle), one world-summary line (current), the evidence ref.
  const fallback = [];
  const editionLine = cand.lines.find(l => l.startsWith('editions/'));
  const summaryLine = cand.lines.find(l => l.startsWith('output/world_summary'));
  if (editionLine) fallback.push({ fact: editionLine.split(':').slice(2).join(':').trim().slice(0, 200), ref: editionLine.split(':').slice(0, 2).join(':') });
  if (summaryLine) fallback.push({ fact: summaryLine.split(':').slice(2).join(':').trim().slice(0, 200), ref: summaryLine.split(':').slice(0, 2).join(':') });
  fallback.push({ fact: story.label || story.angle, ref: story.ref });
  const v = validateCanonFacts(fallback, cycle, story.ref);
  return { facts: fallback, source: 'script-fallback' + (v.ok ? '' : ' (validator: ' + v.errs.join('; ') + ')'), trace, nlmBrief: brief ? brief.rel : null };
}

// ---------------------------------------------------------------------------
// pipeline.45 Phase 2 — daily continuity feed: yesterday's staged filings for
// one desk, bounded (≤3 filings, headline + INTAKE + 600-char excerpt) so the
// pack never regrows the 40k blob. Content comes from the ARTICLE TEXT — the
// model-form, id-free INTAKE — never the sidecar `intake:` object, which
// carries resolved POPIDs (prose-leak class; ids stay out of writer state).
// ---------------------------------------------------------------------------
const FILINGS_MAX = 3, FILINGS_EXCERPT_CAP = 600;
function yesterdaysFilings(desk, cycle) {
  const out = [];
  try {
    if (!fs.existsSync(STAGED)) return out;
    const yday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    for (const f of fs.readdirSync(STAGED)) {
      if (!f.endsWith('.staged.json') || out.length >= FILINGS_MAX) continue;
      const side = readJson(path.join(STAGED, f));
      if (!side || side.desk !== desk || String(side.cycle) !== String(cycle)) continue;
      if (String(side.stagedAt || '').slice(0, 10) !== yday) continue;
      const artPath = path.join(ROOT, side.article || '');
      if (!fs.existsSync(artPath)) continue;
      const text = fs.readFileSync(artPath, 'utf8');
      const headline = String(text.split('\n').find(l => l.trim()) || '')
        .replace(/^#+\s*/, '').replace(/[*_`]/g, '').slice(0, 90).trim();
      // split body / INTAKE on the block heading; strip the self-score comment
      const m = text.match(/^##\s+INTAKE\s*$/im);
      const body = (m ? text.slice(0, m.index) : text).trim();
      const intakeBlock = m ? text.slice(m.index).replace(/<!--[\s\S]*?-->/g, '').trim() : null;
      const excerpt = body.length > FILINGS_EXCERPT_CAP
        ? body.slice(0, FILINGS_EXCERPT_CAP).replace(/\S+$/, '').trim() + ' […]'
        : body;
      out.push({ headline, byline: side.byline || null, intakeBlock, excerpt });
    }
  } catch (e) { log('yesterdays-filings read failed (non-fatal): ' + e.message); }
  return out;
}

// ---------------------------------------------------------------------------
// Task 2.5.3 — media-room wire pulse: every STAGED filing appends a one-line
// entry to the cycle's production log (newest first, under one AUTO header);
// wake 3 reads the current wire so each writer knows what the room already
// filed (kills five-articles-one-story). Sim clock only — no Gregorian dates.
// ---------------------------------------------------------------------------
const WIRE_HEADER = '## Newsroom wire (AUTO — cron-desk-run.js)';
function wirePath(cycle) { return path.join(ROOT, 'output', 'production_log_c' + cycle + '.md'); }
function appendWireEntry(cycle, line) {
  try {
    const p = wirePath(cycle);
    let txt = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '# Production log — C' + cycle + '\n';
    if (!txt.includes(WIRE_HEADER)) txt = txt.trimEnd() + '\n\n' + WIRE_HEADER + '\n';
    const lines = txt.split('\n');
    lines.splice(lines.findIndex(l => l.trim() === WIRE_HEADER) + 1, 0, line);
    fs.writeFileSync(p, lines.join('\n'));
  } catch (e) { log('wire append failed (non-fatal): ' + e.message); }
}
function readWire(cycle, max) {
  try {
    const txt = fs.readFileSync(wirePath(cycle), 'utf8');
    const lines = txt.split('\n');
    const start = lines.findIndex(l => l.trim() === WIRE_HEADER);
    if (start < 0) return [];
    const out = [];
    for (let i = start + 1; i < lines.length && out.length < (max || 12); i++) {
      if (/^## /.test(lines[i])) break;
      if (lines[i].trim().startsWith('- ')) out.push(lines[i].trim());
    }
    return out;
  } catch (_) { return []; }
}

// ---------------------------------------------------------------------------
// Task 2.5.3 — the growing story template (docs/media/wake_templates/
// STORY_TEMPLATE.md defines the shape). Each wake appends its section in order;
// the doc is the per-story audit trail the Saturday compile reads.
// ---------------------------------------------------------------------------
function storyDocPath(stem) { return path.join(COMPARE, stem + 'story.md'); }

function storyDocOpen(stem, s) {
  const L = [];
  L.push('# STORY — ' + s.desk + ' c' + s.cycle + (s.reporter ? ' — ' + s.reporter.name : ''));
  L.push('');
  L.push('## §1 ASSIGNMENT');
  if (s.story) {
    L.push('- ANGLE (assigned by the editor — fixed): ' + (s.story.angle || s.story.label));
    if (s.story.hookLine) L.push('- HOOK: ' + s.story.hookLine);
    if (s.story.citizens && s.story.citizens.length) L.push('- AFFECTED CITIZENS: ' + s.story.citizens.join('; '));
    if (s.story.hood) L.push('- WHERE: ' + s.story.hood);
    L.push('- SOURCE: ' + s.story.ref);
  } else {
    L.push('- OPEN BEAT (no seed this wake) — reporter\'s own read leads.');
  }
  if (s.approach) L.push('- DESK APPROACH: ' + s.approach);
  L.push('');
  L.push('## §2 THE REPORTER\'S PLAN (wake 1, their own voice)');
  L.push(s.angleRead && s.angleRead.text ? String(s.angleRead.text).trim() : '(no angle read this wake)');
  L.push('');
  try { fs.writeFileSync(storyDocPath(stem), L.join('\n')); } catch (e) { log('story doc open failed (non-fatal): ' + e.message); }
}

function storyDocAppend(stem, header, body) {
  const p = storyDocPath(stem);
  if (!fs.existsSync(p)) return;   // wake 1 didn't open one (old artifact chain) — skip quietly
  try { fs.appendFileSync(p, '## ' + header + '\n' + body + '\n\n'); } catch (e) { log('story doc append failed (non-fatal): ' + e.message); }
}

// WAKE 2 — REPORT: persona-voiced questions to the affected citizens (batch
// quote pass) → packet.json. Requires the angle artifact (stage discipline).
async function runReport(assign) {
  const cycle = arg('--cycle', null) || detectCycle();
  const desk = assign ? assign.desk : DESK;
  const personaSlug = assign ? assign.persona : PERSONA;
  activateWakeContext(assign, personaSlug);
  const stem = wakeStageStem(cycle, desk, assign, personaSlug);
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
  // Task 2.5.4: the assignment's citizens lead the quote pool. The assignment
  // rides the angle artifact (wake-1 handoff), so a report wake fired without
  // today's fanout entry still sees it.
  const angleArt = readJson(anglePath);
  const story = (assign && assign.story) || (angleArt && angleArt.assignment && angleArt.assignment.story) || null;
  const asks = collectQuoteAsks(lane, askVoice, story, angleArt);
  let quotes = [];
  let interviews = [];
  if (asks.length) {
    log('quote pre-pass (reporter-voiced): ' + asks.length + ' citizen(s)...');
    const asksPath = path.join(COMPARE, stem + 'asks.json');
    fs.writeFileSync(asksPath, JSON.stringify(asks, null, 2));
    try {
      const out = execFileSync('node', [path.join(ROOT, 'scripts', 'citizenVoice.js'),
        '--batch=' + asksPath, '--cycle=' + cycle], { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
      if (PACKET_ACTIVE) {
        const inputByPop = new Map(asks.map(a => [a.pop, a.inputPacket]));
        interviews = parseBatchResults(out).map(q => {
          const inputPacket = inputByPop.get(q.pop);
          if (!q.quote || q.fallback) return { ...q, claims: null,
            ...(livedPacket.VERSION === 'LEP/2' ? { inputPacket } : {}) };
          try {
            const claims = livedPacket.validateReportOutput(q.quote, inputPacket);
            return { ...q, raw: q.quote, quote: claims.publishableQuote, claims,
              ...(livedPacket.VERSION === 'LEP/2' ? { inputPacket } : {}) };
          } catch (e) {
            return { ...q, raw: q.quote, quote: null, claims: null,
              ...(livedPacket.VERSION === 'LEP/2' ? { inputPacket } : {}),
              fallback: 'contract-invalid: ' + e.message };
          }
        });
        quotes = interviews.filter(q => q.quote && q.claims && !q.fallback);
      } else {
        quotes = parseBatchQuotes(out);
      }
      log('quotes landed: ' + quotes.length + '/' + asks.length + (quotes.length ? ' (' + quotes.map(q => q.name).join(', ') + ')' : ''));
    } catch (e) { log('quote pre-pass failed (non-fatal): ' + e.message); }
  } else {
    log('no candidate citizens in the lane this cycle — packet will be quoteless');
  }
  const packetPath = path.join(COMPARE, stem + 'packet.json');
  fs.writeFileSync(packetPath, JSON.stringify({
    stage: 'report', desk, cycle, persona: personaSlug,
    ...(PACKET_ACTIVE ? { packetContract: livedPacket.VERSION } : {}),
    reporter: assign ? { name: assign.name, popid: assign.popid } : null,
    assignment: story ? { story } : null,   // Task 2.5.4: what the quote pool was seeded from
    angle: path.relative(ROOT, anglePath),
    quotesRequested: asks.length, quotesLanded: quotes.length, quotes,
    ...(PACKET_ACTIVE ? { interviews } : {}),
    ranAt: new Date().toISOString()
  }, null, 2));
  console.log('packet → ' + path.relative(ROOT, packetPath) + ' (' + quotes.length + ' quotes)');
  // Task 2.5.3 — §3: the interviews land in the growing story doc.
  storyDocAppend(stem, '§3 INTERVIEWS (wake 2 — real citizens, real quotes)',
    quotes.length
      ? quotes.map(q => '- ' + q.name + ' (' + q.pop + '): "' + String(q.quote).replace(/\s+/g, ' ').trim() + '"').join('\n')
      : '(no quotes landed this wake — write from the record; do not invent residents)');
}

// pipeline.45 Phase 1 — enrich the parsed INTAKE with ids for the sidecar.
// The model emits no ids (prose-leak class); quoted-source ids come from the
// wake-2 packet (exact records), the rest resolve against the ledger snapshot.
// bizId stays null until a business snapshot exists (Saturday sheets
// bind-point). Downstream consumers read THIS object, never the prose.
function buildIntakeSidecar(draftText, quotes) {
  const parsed = require('../lib/articleIntake').parse(draftText);
  if (!parsed.found) return null;
  const byQuote = new Map((quotes || []).filter(q => q.pop).map(q => [String(q.name).toLowerCase(), q.pop]));
  const resolved = new Map(require('./canon-name-check').resolveCitizens(parsed.names.map(n => n.name))
    .map(r => [String(r.name).toLowerCase(), r]));
  return {
    names: parsed.names.map(n => {
      const k = String(n.name).toLowerCase();
      const r = resolved.get(k);
      return { name: n.name, role: n.role,
        popid: n.popid || byQuote.get(k) || (r && r.popid) || null,
        ...(r && r.ambiguous ? { ambiguous: true } : {}) };
    }),
    businesses: parsed.businesses.map(b => ({ name: b.name, bizId: b.bizId, role: b.role })),
    storylines: parsed.storylines.map(s => ({ slug: s.slug, verb: s.verb })),
    hoods: parsed.hoods.map(h => h.name),
    claims: parsed.claims.map(c => ({ claim: c.claim, sourceRef: c.sourceRef }))
  };
}

// WAKE 3 — WRITE (+ gate + route + self-record): requires angle + packet
// artifacts — no angle, no write (no filing on stale data).
async function runWrite(assign) {
  const cycle = arg('--cycle', null) || detectCycle();
  const desk = assign ? assign.desk : DESK;
  const personaSlug = assign ? assign.persona : PERSONA;
  activateWakeContext(assign, personaSlug);
  const stem = wakeStageStem(cycle, desk, assign, personaSlug);
  console.log('Wake 3 WRITE — ' + desk + ' c' + cycle + (personaSlug ? ' (' + personaSlug + ')' : '') + (assign ? ' [' + assign.name + ']' : ''));
  console.log('===================================');
  const anglePath = path.join(COMPARE, stem + 'angle.json');
  const packetPath = path.join(COMPARE, stem + 'packet.json');
  if (!fs.existsSync(anglePath)) throw new Error('no angle artifact at ' + path.relative(ROOT, anglePath) + ' — run --stage=angle first');
  if (!fs.existsSync(packetPath)) throw new Error('no packet artifact at ' + path.relative(ROOT, packetPath) + ' — run --stage=report first');
  const lane = loadLane(cycle, desk);
  if (!lane) { console.log('[write] no "' + desk + '" lane in desk_signal — skipping (not an error).'); return; }
  if (budgetReached(cycle)) return;   // S339 submission budget — exit before writer spend
  const angle = readJson(anglePath);
  const packet = readJson(packetPath);
  const persona = personaInfo(personaSlug);
  const route = stageRoute(desk, personaSlug, 'write');
  const draftName = stem + slug(route.model) + '.md';
  const draftPath = path.join(COMPARE, draftName);
  const base = draftName.replace(/\.md$/, '');

  // byline: persona's own ledger identity when set, else the fan-out assignment's
  // reporter (the rotation already picked least-used), else the desk roster
  const byline = persona
    ? { name: persona.name, popid: persona.popid, beatDomain: persona.beatDomain }
    : assign
      ? { name: assign.name, popid: assign.popid, beatDomain: assign.beatDomain }
      : await resolveByline(desk, lane, cycle);
  log('byline: ' + (byline ? byline.name + ' (' + byline.popid + (persona ? ', persona' : (assign ? ', fanout ' + byline.beatDomain : ', ' + byline.beatDomain + ', used ' + byline.usageCount)) + ')' : 'NONE — fallback, no self-record'));

  const quotes = (packet && packet.quotes) || [];
  // Task 2.5.2: the assignment reaches the writer — from today's fanout entry,
  // falling back to the wake-1 angle artifact's copy. The wake-1 canon facts
  // (2.5.3 §2) ride along whichever path supplied the assignment.
  const assignment = (assign && assign.story ? { story: assign.story, approach: assign.approach } : null)
    || (angle && angle.assignment) || null;
  if (assignment && angle && angle.canonResearch && Array.isArray(angle.canonResearch.facts)) {
    assignment.canonFacts = angle.canonResearch.facts;
  }
  // Social wiki wall — HARD inject into writer state (not optional memory_recall).
  let wallBlock = null;
  if (byline && byline.popid && !PACKET_ACTIVE) {
    try {
      const { loadReporterWall, formatWallBlock, ensureReporterWall } =
        require(path.join(__dirname, 'reporterWall'));
      await ensureReporterWall(byline.popid);
      const wall = await loadReporterWall(byline.popid, 6);
      wallBlock = formatWallBlock(wall, { name: byline.name });
      log('reporter wall: ' + (wall.tag || byline.popid) + ' posts=' + wall.posts.length);
    } catch (e) {
      log('reporter wall load failed (non-fatal): ' + e.message);
    }
  }
  const stateFile = path.join(COMPARE, base + (PACKET_ACTIVE ? '.state.json' : '.state.md'));
  if (PACKET_ACTIVE) {
    const writePacket = livedPacket.buildWritePacket({
      cycle, desk, reporter: byline,
      story: assignment && assignment.story,
      approach: assignment && assignment.approach,
      angleInput: angle && angle.inputPacket,
      anglePlan: angle && angle.angleRead && angle.angleRead.plan,
      interviews: packet && packet.interviews || [],
      lane,
      reviewProfile: ACTIVE_WAKE_PACKAGE && ACTIVE_WAKE_PACKAGE.reviewProfile,
    });
    fs.writeFileSync(stateFile, JSON.stringify(writePacket, null, 2));
  } else {
    fs.writeFileSync(stateFile, buildLaneState(desk, cycle, lane, byline, quotes, persona,
      angle && angle.angleRead ? angle.angleRead.text : null, assignment, wallBlock));
  }
  log('writing on ' + (PACKET_ACTIVE ? 'typed Packet' : 'lane') + ' (' + fs.statSync(stateFile).size +
    ' B injected state' + (persona ? ' + stance anchor' : '') + (wallBlock ? ' + wall' : '') + ')...');
  const baseArtifactTag = writerArtifactTag(assign, personaSlug);
  const artifactTag = PACKET_ACTIVE
    ? (baseArtifactTag ? baseArtifactTag + '-packet-' + PACKET_CONTRACT : 'packet-' + PACKET_CONTRACT)
    : baseArtifactTag;
  const writerArgs = buildWriterArgs(
    desk,
    path.relative(ROOT, stateFile),
    personaSlug,
    artifactTag,
    route
  );
  // Task 2.5.5: hand the writer the byline's POPID so the memory tool pair
  // (own citizen page, cp-<popid>) joins the tool loop.
  if (PACKET_ACTIVE) writerArgs.push('--strict-source-hygiene', '--packet-only');
  else if (byline && byline.popid) writerArgs.push('--byline-popid', byline.popid);
  execFileSync('node', writerArgs, { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
  if (!fs.existsSync(draftPath)) throw new Error('writer produced no draft at ' + path.relative(ROOT, draftPath));

  // gate (skipped for --no-gate samples)
  let rhea = null, pass = false;
  if (NO_GATE) {
    log('gate SKIPPED (--no-gate sample) — output is ungated, NOT canon');
  } else {
    log('gating...');
    try {
      execFileSync('node', [path.join(ROOT, 'scripts', 'cron-rhea-gate.js'), '--draft', path.relative(ROOT, draftPath),
        '--model', GATE_MODEL, '--backend', GATE_BACKEND, '--api-model', GATE_API_MODEL, '--cycle', cycle,
        ...(personaSlug ? ['--persona', personaSlug] : []),
        ...(PACKET_ACTIVE ? ['--article-packet', path.relative(ROOT, stateFile)] : []),
        // pipeline.45: the wake-2 packet backs the INTAKE quoted-source check.
        '--packet', path.relative(ROOT, packetPath),
        // Task 2.5.3: wake-1 validated canon facts ride into the gate as
        // verified prior coverage (cited history is not a contradiction).
        ...(angle && angle.canonResearch ? ['--canon-facts', path.relative(ROOT, anglePath)] : [])],
        { cwd: ROOT, stdio: 'inherit', timeout: 600000 });
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
    const bylineUsage = await recordBylineUsage(cycle, byline, base);   // engine.88: author earns byline-landed
    log('byline-landed: ' + (bylineUsage.recorded ? 'recorded for ' + byline.name : 'skipped — ' + bylineUsage.reason));
    fs.writeFileSync(path.join(STAGED, base + '.staged.json'), JSON.stringify({
      status: 'staged', desk, cycle, persona: personaSlug, byline: byline ? byline.name : null, bylinePopid: byline ? byline.popid : null,
      article: path.relative(ROOT, destPath),
      bylineUsage,
      // pipeline.45 Phase 1: the id-enriched INTAKE — the one surface the
      // Saturday run (sheets, Supermemory tags, EIC audit) reads.
      intake: buildIntakeSidecar(fs.readFileSync(draftPath, 'utf8'), quotes),
      note: 'M–F probation wall (S332): retrievable by the Saturday compile ONLY; NOT canon fact. Reporters/sift must not cite staged drafts.',
      stagedAt: new Date().toISOString()
    }, null, 2));
    // Task 2.5.3 — wire pulse: the staged filing hits the room's wire.
    const headline = String(fs.readFileSync(draftPath, 'utf8').split('\n').find(l => l.trim()) || '')
      .replace(/^#+\s*/, '').replace(/[*_`]/g, '').slice(0, 90).trim();
    appendWireEntry(cycle, '- c' + cycle + ' ' + desk + ' | ' + (byline ? byline.name : 'desk') + ': "' + headline + '" (staged)');
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

  // Task 2.5.3 — self-scoring footer check (pressure-test #6, deterministic).
  const footerPresent = /<!--\s*SELF-SCORE:/.test(fs.readFileSync(draftPath, 'utf8'));
  // Task 2.5.5 — tool-use scoreboard column (pressure-test #5): did the writer dig?
  const traceArt = readJson(path.join(COMPARE, (artifactTag ? desk + '_c' + cycle + '_' + artifactTag : desk + '_c' + cycle) + '.tooltrace.json'));
  const record = {
    mode: 'wake-write', desk, cycle, provider: route.provider, model: route.model, gateModel: GATE_BACKEND === 'api' ? GATE_API_MODEL : GATE_MODEL,
    persona: personaSlug,
    byline: byline ? { name: byline.name, popid: byline.popid, beatDomain: byline.beatDomain } : null,
    laneEntries: lane.length, quotesLanded: quotes.length,
    disposition: NO_GATE ? 'ungated-sample' : (pass ? 'staged' : 'flagged'),
    rheaPass: rhea ? rhea.pass : null, rheaFlagCount: rhea ? rhea.flagCount : null,
    footerPresent,
    toolUse: traceArt ? traceArt.calls.map(t => t.tool) : [],
    article: path.relative(ROOT, destPath),
    selfRecord, ranAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(COMPARE, base + '.wake.json'), JSON.stringify(record, null, 2));
  // Task 2.5.3 — §4 closes the growing story doc: where the article landed.
  storyDocAppend(stem, '§4 THE ARTICLE (wake 3)',
    '- draft: ' + path.relative(ROOT, destPath) + '\n- disposition: ' + record.disposition +
    (rhea ? '\n- rhea: ' + (rhea.pass ? 'PASS' : 'flagged (' + rhea.flagCount + ')') : '') +
    '\n- self-score footer: ' + (footerPresent ? 'present' : 'MISSING') +
    '\n- tool use: ' + (record.toolUse.length ? record.toolUse.join(', ') : 'none'));
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
  if (budgetReached(cycle)) return;   // S339 submission budget — exit before writer spend
  const route = deskRoute(DESK);
  const draftName = DESK + '_c' + cycle + '_' + OUT_TAG + slug(route.model) + '.md';
  const draftPath = path.join(COMPARE, draftName);
  const base = draftName.replace(/\.md$/, '');

  // 1. LAYER 1 — byline (persona's own ledger identity when --persona is set)
  log('resolving byline...');
  const wakePersona = personaInfo();
  const byline = wakePersona
    ? { name: wakePersona.name, popid: wakePersona.popid, beatDomain: wakePersona.beatDomain }
    : await resolveByline(DESK, lane, cycle);
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
    const bylineUsage = await recordBylineUsage(cycle, byline, base);   // engine.88: author earns byline-landed
    log('byline-landed: ' + (bylineUsage.recorded ? 'recorded for ' + byline.name : 'skipped — ' + bylineUsage.reason));
    fs.writeFileSync(path.join(STAGED, base + '.staged.json'), JSON.stringify({
      status: 'staged', desk: DESK, cycle, byline: byline ? byline.name : null, bylinePopid: byline ? byline.popid : null,
      article: path.relative(ROOT, destPath),
      bylineUsage,
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
  const packageGate = wakePackages.gateAssignments(list);
  for (const skipped of packageGate.skipped) {
    log('[package-gate] skipped ' + skipped.name + ' (' + skipped.desk + '): ' + skipped.reason);
  }
  list = packageGate.eligible;
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
if (PACKET_CONTRACT_FLAG && !['v1', 'v2'].includes(PACKET_CONTRACT_FLAG)) {
  console.error('[run] unknown --packet-contract "' + PACKET_CONTRACT_FLAG + '" (want v1 or v2)');
  process.exit(1);
}
if (PACKET_CONTRACT_FLAG && !NO_GATE) {
  console.error('[run] explicit --packet-contract=' + PACKET_CONTRACT_FLAG + ' is evaluation-only and requires --no-gate');
  process.exit(1);
}
if (PACKET_CONTRACT_FLAG && !STAGE) {
  console.error('[run] explicit --packet-contract=' + PACKET_CONTRACT_FLAG + ' requires one --stage=angle|report|write');
  process.exit(1);
}
if (require.main === module) {
  Promise.resolve()
    .then(() => (STAGE && FANOUT ? runFanoutStage()
      : STAGE === 'angle' ? runAngle()
      : STAGE === 'report' ? runReport()
      : STAGE === 'write' ? runWrite()
      : (WAKE ? runWake() : main())))
    .catch(err => { console.error('[run] Fatal:', err.message); process.exit(1); });
}

module.exports = {
  stageStem,
  nameSlug,
  writerArtifactTag,
  buildWriterArgs,
  activateWakeContext,
  stageRoute,
  loadLane,
  yesterdaysFilings,
  buildIntakeSidecar,
};
