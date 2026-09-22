#!/usr/bin/env node
/**
 * Civic Cron Chain — scripts/cron-civic-run.js
 *
 * civic.15 Phase 2 (docs/plans/2026-07-28-civic-cron-city-hall.md). The civic
 * sibling of cron-desk-run.js: the Sunday chain that turns a fired cycle into
 * civic government output with no human in the loop.
 *
 *   --stage=prep       Task 2.1 — deterministic port of city-hall-prep Steps 1-4:
 *                      reads world_summary / engine_audit / baseline_briefs /
 *                      initiative_tracker / truesource, routes topics to offices,
 *                      writes per-office pending-decisions packets, lints them
 *                      (lintCivicPackets rules), fails loud on any leak.
 *   --stage=directive  Task 2.2 — headless Mara-directive replacement (later commit)
 *   --stage=decide     Task 2.3 — Mayor decision call (later commit)
 *   --stage=voices     Task 2.3 — Layer-2 office calls (later commit)
 *   --stage=projects   Task 2.3 — Layer-3 project calls (later commit)
 *   --stage=close      Task 2.3 — Clerk + assemble + gated apply (later commit)
 *   --stage=tick       civic.39 — no-model week-boundary stage machine: reads
 *                      output/cron-civic/week_state_c{XX}.json, advances the
 *                      deterministic close half and the apply when their inputs
 *                      exist, tracks (never calls) the model stages. Idempotent.
 *   --stage=batch-submit   civic.39 Task 3 — one OpenRouter batch per
 *                          :batch-eligible hearing-seat model (today: only
 *                          google/gemini-3.7-flash, 0.50x standard). custom_id
 *                          per seat+cycle+attempt; manifest
 *                          output/cron-civic/batch_c{XX}_hearing.json.
 *   --stage=batch-collect  polls submitted batches (GET, no model spend),
 *                          validates + grounds each result like runHearing,
 *                          lands passing seats as ordinary voice JSONs;
 *                          rejected/expired seats resubmit next window. tick
 *                          runs this — it costs no model tokens.
 *
 * Stage order in the chain: directive -> prep -> decide -> voices -> projects
 * -> close. The directive runs FIRST so prep consumes a real directive file
 * (plan Task 2.2 verify: "prep consumes it without falling back").
 *
 * State between stages lives under output/cron-civic/ (mirror of
 * output/cron-compare/). Packets: output/cron-civic/packets/. This chain never
 * writes into output/civic-voice-workspace/ — that is the interactive skill's
 * turf; headless dry runs must not clobber it.
 *
 * Telemetry contract: every packet is prose-only perception (city-hall-prep
 * Step 3 translation contract). Engine numbers are translated by the builders
 * below, never copied; any prose sliced from generated docs passes through the
 * lintCivicPackets rule set line-by-line, and the whole packet is linted again
 * before the stage exits 0.
 *
 * Usage:
 *   node scripts/cron-civic-run.js --stage=prep [--cycle 102]
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');   // postDiscord (--stage=status) — was scoped inside another function, crashed every Sunday 15:00 (rb catch, S432)
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CIVIC = path.join(ROOT, 'output', 'cron-civic');
const PACKETS = path.join(CIVIC, 'packets');

const { lintText } = require('./lintCivicPackets');
const { getDistrictForNeighborhood } = require('../lib/districtMap');
const getCurrentCycle = require('../lib/getCurrentCycle');
const officeWall = require('./officeWall');
const trackerSnapshot = require('./initiativeTrackerSnapshot');
const { buildPack, writePack, childToParentFromAudit, foldHood, gamePromptView } = require('./buildCivicOfficeSlice');
const { CANONICAL_HOODS } = require('../lib/canonNeighborhoods');
const civicSeat = require('./civicSeat');
const { interventionIssue } = require('./civicInterventionValidation');
const cityHallLedger = require('./cityHallLedger');
const chaosCascade = require('./dumpChaosCascade');
const orBatch = require('./orBatch');   // civic.39 Task 3 — batch transport (importable since the require.main guard; key read is lazy)

/** Non-fatal: prior CIVIC positions for holder of agentDir. */
async function positionWallInject(officeMap, agentDir) {
  try {
    const h = officeWall.resolveHolder(officeMap, agentDir);
    if (!h) return '';
    const block = await officeWall.injectBlockForHolder(h, 6);
    return block ? '\n\n' + block + '\n' : '';
  } catch (e) {
    log('position-wall inject failed (' + agentDir + '): ' + e.message);
    return '';
  }
}

/** Non-fatal: save cascade voice JSON statements to holder page. */
async function positionWallRecordCascade(officeMap, agentDir, voiceJson, cycle) {
  try {
    const r = await officeWall.recordCascadeForDir(officeMap, agentDir, voiceJson, cycle);
    if (r.recorded) log('position-wall cascade ' + agentDir + ' → ' + (r.holder && r.holder.popid));
    else if (r.error) log('position-wall cascade skip ' + agentDir + ': ' + r.error);
    return r;
  } catch (e) {
    log('position-wall cascade failed (' + agentDir + '): ' + e.message);
    return { recorded: false, error: e.message };
  }
}

/** Non-fatal: save datawake rec to holder page. */
async function positionWallRecordDatawake(rec) {
  try {
    if (!rec || !rec.popid || !rec.statement) return { recorded: false, error: 'no-rec' };
    const line = officeWall.lineFromDatawake(rec);
    if (!line) return { recorded: false, error: 'no-line' };
    const r = await officeWall.recordPosition(rec.popid, line.text, {
      cycle: rec.cycle,
      key: line.key,
      kind: 'datawake',
      office: rec.agentDir || rec.office,
      holder: rec.holder,
    });
    if (r.recorded) log('position-wall datawake ' + rec.holder + ' → ' + rec.popid);
    else if (r.error) log('position-wall datawake skip: ' + r.error);
    return r;
  } catch (e) {
    log('position-wall datawake failed: ' + e.message);
    return { recorded: false, error: e.message };
  }
}

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}
const STAGE = arg('--stage', null);
const log = (...a) => console.log('[civic]', new Date().toISOString(), ...a);

function detectCycle() {
  const c = getCurrentCycle({ soft: true, noArgv: true });
  if (c === null) throw new Error('could not resolve current cycle (lib/getCurrentCycle)');
  return String(c);
}
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } }
function mustRead(p, why) {
  if (!fs.existsSync(p)) throw new Error('missing required input: ' + path.relative(ROOT, p) + ' (' + why + ')');
  return fs.readFileSync(p, 'utf8');
}
function mustJson(p, why) {
  const j = readJson(p);
  if (!j) throw new Error('missing/unparseable required input: ' + path.relative(ROOT, p) + ' (' + why + ')');
  return j;
}

/** Council roster for packets. Prefer truesource; after a wipe, the office map is enough. */
function loadCouncilRoster(officeMap) {
  const p = path.join(ROOT, 'output', 'desk-packets', 'truesource_reference.json');
  const ts = readJson(p);
  if (ts && Array.isArray(ts.council) && ts.council.length >= 9) return ts.council;
  const council = (officeMap.offices || [])
    .filter(o => /^COUNCIL-/.test(String(o.officeId || '')) && o.district && o.holder)
    .map(o => ({
      name: o.holder,
      district: o.district,
      faction: o.faction,
      status: String(o.status || 'active').toLowerCase(),
    }));
  if (council.length < 9) {
    throw new Error('council roster missing (no truesource, map has ' + council.length + ' seats)');
  }
  log('council roster: civic-office-map.json (truesource file gone)');
  return council;
}

// Initiative name -> owning project/office agent dir. Unmatched initiatives
// route to the Mayor only (no project seat exists for them yet).
const INITIATIVE_AGENT = [
  { re: /stabilization/i, dir: 'civic-project-stabilization-fund' },
  { re: /baylight/i, dir: 'civic-office-baylight-authority' },
  { re: /transit hub/i, dir: 'civic-project-transit-hub' },
  { re: /health center/i, dir: 'civic-project-health-center' },
  { re: /OARI|alternative response/i, dir: 'civic-project-oari' },
];

// ---------------------------------------------------------------------------
// Telemetry -> perception translation (Step 3 contract, deterministic)
// ---------------------------------------------------------------------------

function sentimentWord(v) {
  if (v >= 0.2) return 'clearly upbeat';
  if (v >= 0.05) return 'mildly positive';
  if (v > -0.05) return 'flat';
  if (v > -0.2) return 'soured';
  return 'sharply down';
}
function crimeWord(v) {
  if (v < 1.5) return 'low';
  if (v < 2.5) return 'moderate';
  return 'elevated';
}
function retailWord(v) {
  if (v >= 10) return 'busy';
  if (v >= 7) return 'steady';
  if (v >= 5) return 'slow';
  return 'struggling';
}
function deltaWord(d, up, down, flat) {
  if (d > 0.05) return up;
  if (d < -0.05) return down;
  return flat;
}

// Line filter: any prose line sliced from a generated doc (world_summary,
// tracker summaries, prior voice JSON) is dropped if it trips the packet
// linter's rules. Dropping beats leaking — the builders above carry the signal
// in translated form.
function cleanLines(text) {
  return String(text || '').split('\n')
    .filter(l => lintText(l).length === 0)
    .join('\n');
}
function cleanInline(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return lintText(t).length === 0 ? t : null;
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

function splitSections(md) {
  const sections = {};
  let current = null;
  for (const line of String(md).split('\n')) {
    const m = line.match(/^## (.+)$/);
    if (m) { current = m[1].trim(); sections[current] = []; continue; }
    if (current) sections[current].push(line);
  }
  for (const k of Object.keys(sections)) sections[k] = sections[k].join('\n');
  return sections;
}
function findSection(sections, prefix) {
  const key = Object.keys(sections).find(k => k.startsWith(prefix));
  return key ? sections[key] : '';
}

// | Office | Holder | Faction | Status | Approval | Δ vs C{XX-1} |
function parseApprovalTable(sectionText) {
  const rows = {};
  for (const line of String(sectionText).split('\n')) {
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 7 || cells[1].startsWith('---') || cells[1] === 'Office') continue;
    const holder = cells[2];
    if (!holder) continue;
    rows[holder] = {
      office: cells[1], holder, faction: cells[3], status: cells[4],
      approval: parseInt(cells[5], 10),
      delta: parseInt(String(cells[6]).replace('+', ''), 10) || 0,
    };
  }
  return rows;
}

// | Neighborhood | Sentiment | RetailVitality | EventAttractiveness | CrimeIndex |
function parseHoodTable(cityStateSection) {
  const rows = {};
  for (const line of String(cityStateSection).split('\n')) {
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 6 || cells[1].startsWith('---') || cells[1] === 'Neighborhood') continue;
    const hood = cells[1];
    if (!hood) continue;
    rows[hood] = {
      sentiment: parseFloat(cells[2]), retail: parseFloat(cells[3]),
      event: parseFloat(cells[4]), crime: parseFloat(cells[5]),
    };
  }
  return rows;
}

function hoodPulseLine(hood, snap, briefs) {
  if (!snap) return null;
  const bits = [
    'mood ' + sentimentWord(snap.sentiment),
    'street trade ' + retailWord(snap.retail),
    'crime ' + crimeWord(snap.crime),
  ];
  const hoodBriefs = briefs.filter(b => b.neighborhood === hood);
  for (const b of hoodBriefs.slice(0, 2)) {
    const desc = cleanInline(b.facts && b.facts.description);
    if (desc) bits.push(desc);
    const ns = b.facts && b.facts.neighborhoodState;
    if (ns && ns.sentiment && typeof ns.sentiment.delta === 'number') {
      bits.push('the mood there has ' + deltaWord(ns.sentiment.delta, 'lifted since last cycle', 'slipped since last cycle', 'held steady'));
    }
  }
  return '- **' + hood + '** — ' + [...new Set(bits)].join('; ') + '.';
}

// Translated citywide digest — built from parsed values, NEVER sliced from the
// raw City State block (that block is engine telemetry).
function citywideDigest(sections, audit) {
  const cs = findSection(sections, 'City State');
  const pop = (cs.match(/\*\*Population:\*\* ([\d,]+)/) || [])[1];
  const emp = (cs.match(/Employment ([\d.]+)%/) || [])[1];
  const econ = (cs.match(/Economy (\w+)/) || [])[1];
  const vibe = (cs.match(/\*\*Vibe:\*\* (\w+)/) || [])[1];
  const L = [];
  const empWord = emp ? (parseFloat(emp) >= 88 ? 'nearly everyone who wants work has it' : parseFloat(emp) >= 80 ? 'most people are working' : 'too many people are out of work') : null;
  L.push('The city stands at about ' + (pop ? Number(pop.replace(/,/g, '')).toLocaleString() : 'its usual size') + ' people; ' + (empWord || 'employment is unremarked') + ' and the economy reads ' + (econ || 'steady') + '. The streets feel ' + (vibe || 'ordinary') + ' this cycle.');
  const texture = cleanLines(findSection(sections, 'Evening Texture')).trim();
  if (texture) L.push('', '**Evening texture:**', texture);
  const events = cleanLines(findSection(sections, 'World Events')).trim();
  if (events) L.push('', '**What happened around town:**', events);
  const highs = audit.patterns.filter(p => p.severity === 'high');
  if (highs.length) {
    L.push('', '**Where the city is hurting (this cycle\'s worst signals):**');
    for (const p of highs) L.push('- ' + ailmentPerception(p));
  }
  return L.join('\n');
}

// One HIGH/flagged audit pattern -> one perception sentence.
function ailmentPerception(p) {
  const hoods = (p.affectedEntities && p.affectedEntities.neighborhoods) || [];
  const inits = (p.affectedEntities && p.affectedEntities.initiatives) || [];
  const where = hoods.length ? hoods.join(', ') : 'citywide';
  // evidence.fields varies by detector — math-imbalance carries decaySignals
  // VALUES ("CrimeIndex +2.99"), others carry keyed fields. Scan the whole blob.
  const sig = JSON.stringify((p.evidence && p.evidence.fields) || {});
  const feels = [];
  if (/Sentiment/i.test(sig)) feels.push('the mood is slipping');
  if (/RetailVitality/i.test(sig)) feels.push('storefronts are quieter');
  if (/CrimeIndex/i.test(sig)) feels.push('crime is being felt more');
  if (/HousingPressure/i.test(sig)) feels.push('housing pressure is building');
  switch (p.type) {
    case 'math-imbalance':
      return where + ': daily life is visibly declining — ' + (feels.length ? feels.join(', ') : 'several quality-of-life signals moved the wrong way') + ' — and no city program is currently pointed at it.';
    case 'stuck-initiative':
      return (inits.join(', ') || 'an initiative') + ' has sat in the same stage for ' + (p.cyclesInState || 'several') + ' cycles (' + where + '). The ledger already says that — this cycle you move the phase or take a fail phase.';
    case 'repeating-event':
      return where + ': the same strain keeps recurring cycle after cycle and the city still has no program for it.';
    case 'coverage-gap':
      return where + ': something real happened here and nobody in public life has spoken to it.';
    case 'cascade-failure':
      return where + ': a chain of problems is compounding — each one feeding the next.';
    case 'ledger-completeness':
      return 'part of the city\'s own record-keeping came up short this cycle (' + where + ') — an administration housekeeping item, not a street-level story.';
    default:
      return where + ': ' + p.type.replace(/-/g, ' ') + ' flagged at ' + p.severity + ' severity.';
  }
}

function phaseProse(phase) {
  return String(phase || 'an unspecified stage').replace(/[-_]/g, ' ');
}

// Crisis-and-credit question over a voice's turf: worst hood (lowest mood,
// tie-break highest crime) and best hood (highest mood, tie-break busiest
// street trade), asked as a fight-for-your-constituents decision.
function constituentTopic(hoodNames, hoods, isCitywide) {
  const rows = (hoodNames || []).map(h => ({ h, s: hoods[h] })).filter(x => x.s);
  if (!rows.length) return null;
  const worst = rows.slice().sort((a, b) => a.s.sentiment - b.s.sentiment || b.s.crime - a.s.crime)[0];
  const best = rows.slice().sort((a, b) => b.s.sentiment - a.s.sentiment || b.s.retail - a.s.retail)[0];
  const scope = isCitywide ? 'the city' : 'your neighborhoods';
  const body = [
    'Crisis: **' + worst.h + '** — mood ' + sentimentWord(worst.s.sentiment) + ', street trade ' + retailWord(worst.s.retail) + ', crime ' + crimeWord(worst.s.crime) + '. The people there are living this cycle whether City Hall speaks or not.',
    (best.h !== worst.h ? 'Success: **' + best.h + '** — mood ' + sentimentWord(best.s.sentiment) + ', street trade ' + retailWord(best.s.retail) + '. Somebody\'s work is paying off; say whose, or someone else will claim it.' : null),
    '',
    'You argue the initiatives, but you fight for your constituents. Name what you will do — or defend — for the people of ' + scope + ' this cycle: who answers for ' + worst.h + (best.h !== worst.h ? ', and who gets the credit in ' + best.h : '') + '?',
  ].filter(x => x !== null).join('\n');
  return { kind: 'constituents', title: (isCitywide ? 'The city\'s people this cycle' : 'Your constituents this cycle') + ' — crisis and credit', body };
}

// ---------------------------------------------------------------------------
// civic.17 Task 5 — Sunday packet carries the week (wiki + latest district pack)
// Pointer only: do not dump pack JSON (lint) and do not write the tracker.
// ---------------------------------------------------------------------------

const WEEK_HEAD = '## This week on the wall';

function districtPackRef(agentDir, cycle, officeMap, root) {
  const base = root || ROOT;
  const map = officeMap || {};
  const holder = officeWall.resolveHolder(map, agentDir);
  const rows = [...(map.offices || []), ...(map.projects || [])].filter(o => o.agentDir === agentDir);
  const row = holder
    ? rows.find(r => String(r.popid || '').toUpperCase() === holder.popid) || rows[0]
    : rows[0];
  const id = row && (row.officeId || row.projectId);
  const packsDir = path.join(base, 'output', 'cron-civic', 'packs');
  let abs = id ? path.join(packsDir, id + '_c' + cycle + '.json') : null;
  if (!abs || !fs.existsSync(abs)) {
    abs = null;
    if (fs.existsSync(packsDir)) {
      for (const f of fs.readdirSync(packsDir)) {
        if (!f.endsWith('_c' + cycle + '.json')) continue;
        try {
          const p = JSON.parse(fs.readFileSync(path.join(packsDir, f), 'utf8'));
          if (p && p.actor && p.actor.agentDir === agentDir) {
            abs = path.join(packsDir, f);
            if (id && f.startsWith(id + '_')) break;
          }
        } catch (_) { /* skip unreadable pack */ }
      }
    }
  }
  if (!abs || !fs.existsSync(abs)) return { path: null, lever: '', officeId: id || null };
  let lever = '';
  try {
    const p = JSON.parse(fs.readFileSync(abs, 'utf8'));
    lever = String((p.task && p.task.goal) || (p.pulse && p.pulse.lever) || '').trim();
    if (lintText(lever).length) lever = '';
  } catch (_) { /* pointer still valid without lever */ }
  return { path: path.relative(base, abs), lever, officeId: id || null };
}

function weekCarryBlock(opts) {
  const o = opts || {};
  const L = [WEEK_HEAD, ''];
  L.push('You already lived Mon through Thu. Sunday is decide, not a blank brief.');
  if (o.wallError) {
    const err = cleanInline(o.wallError);
    L.push('_Position wall unread' + (err ? ' (' + err + ')' : '') + ' — fight from the district pack pointer below._');
  } else if (!o.posts || !o.posts.length) {
    L.push('_No CIVIC wall lines this week yet._');
  } else {
    L.push('Your own lines this week (continuity only, not tracker canon):');
    let n = 0;
    for (const p of o.posts) {
      const line = cleanInline(String((p && p.content) || p || '').replace(/\s+/g, ' '));
      if (!line || /\[object Object\]/.test(line)) continue;
      n++;
      L.push(n + '. ' + line.slice(0, 420));
    }
    if (!n) L.push('_Wall lines this week could not ship as packet prose._');
  }
  L.push('');
  if (o.packPath) {
    L.push('Latest district pack on disk: ' + o.packPath);
    if (o.lever) L.push('This week\'s lever from that pack: ' + o.lever);
  } else {
    L.push('No district pack on disk for this office this cycle.');
  }
  return L.join('\n');
}

function spliceWeekCarry(md, block) {
  let body = String(md || '');
  const at = body.search(/^## This week on the wall\s*$/m);
  if (at !== -1) {
    const afterHead = body.slice(at);
    const next = afterHead.slice(WEEK_HEAD.length).search(/\n## /);
    body = body.slice(0, at) + (next === -1 ? '' : afterHead.slice(WEEK_HEAD.length + next + 1));
  }
  const insert = String(block || '').replace(/\s+$/, '') + '\n';
  const dec = body.search(/^## DECISION /m);
  if (dec === -1) return body.replace(/\s+$/, '') + '\n\n' + insert;
  return body.slice(0, dec).replace(/\s+$/, '') + '\n\n' + insert + '\n' + body.slice(dec);
}

async function loadWeekCarry(officeMap, agentDir, cycle) {
  const holder = officeWall.resolveHolder(officeMap, agentDir);
  let posts = [];
  let wallError = null;
  if (!holder) wallError = 'no-holder';
  else {
    try {
      const wall = await officeWall.loadPositionWall(holder.popid, 6);
      if (wall && wall.error) wallError = wall.error;
      else posts = (wall && wall.posts) || [];
    } catch (e) {
      wallError = e.message;
    }
  }
  const pack = districtPackRef(agentDir, cycle, officeMap, ROOT);
  return weekCarryBlock({ posts, wallError, packPath: pack.path, lever: pack.lever });
}

// ---------------------------------------------------------------------------
// Stage: prep
// ---------------------------------------------------------------------------

async function runPrep() {
  const cycle = arg('--cycle', null) || detectCycle();
  const prev = String(Number(cycle) - 1);
  console.log('Civic PREP — c' + cycle);
  console.log('===================================');

  // --- Step 1: read inputs (disk-primary, fail-loud on required) ---
  const summaryMd = mustRead(path.join(ROOT, 'output', 'world_summary_c' + cycle + '.md'), 'run /build-world-summary first');
  const audit = mustJson(path.join(ROOT, 'output', 'engine_audit_c' + cycle + '.json'), 'run /engine-review first');
  const briefsFile = mustJson(path.join(ROOT, 'output', 'baseline_briefs_c' + cycle + '.json'), 'engine review baseline briefs');
  const briefs = briefsFile.briefs || [];
  const tracker = trackerSnapshot.loadOrRebuild(cycle);
  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'civic.15 Task 0.2 office map');
  const truesource = { council: loadCouncilRoster(officeMap) };

  // Mara directive: manual beats AUTO (the directive stage writes the AUTO file
  // before prep in the chain). Absent both -> warn; the packet ships without a
  // Mara cross-check block (SKILL treats the directive as optional input).
  const dirDir = path.join(ROOT, 'output', 'mara-directives');
  const directivePath = ['mara_directive_c' + cycle + '.txt', 'mara_directive_c' + cycle + '.md', 'mara_directive_c' + cycle + '_AUTO.txt']
    .map(f => path.join(dirDir, f)).find(p => fs.existsSync(p)) || null;
  const directive = directivePath ? fs.readFileSync(directivePath, 'utf8') : null;
  log(directive ? 'directive: ' + path.relative(ROOT, directivePath) : 'directive: NONE (run --stage=directive first in the chain) — packets ship without Mara cross-check');

  // Prior-cycle voice JSONs (continuity)
  const voiceDir = path.join(ROOT, 'output', 'civic-voice');
  const priorVoice = {};
  if (fs.existsSync(voiceDir)) {
    for (const f of fs.readdirSync(voiceDir)) {
      const m = f.match(/^(.+)_c(\d+)\.json$/);
      if (m && m[2] === prev) priorVoice[m[1]] = readJson(path.join(voiceDir, f));
    }
  }
  log('prior-cycle voice outputs (c' + prev + '): ' + Object.keys(priorVoice).length);

  // --- Step 1: council roster reconciliation (BUNDLE-PREP-A — HIGH, blocks) ---
  const mismatches = [];
  for (const m of truesource.council) {
    const row = officeMap.offices.find(o => o.district === m.district);
    if (!row) { mismatches.push(m.district + ': missing from civic-office-map.json'); continue; }
    if (row.faction !== m.faction) mismatches.push(m.district + ': map says ' + row.faction + ', truesource says ' + m.faction + ' (' + m.name + ')');
  }
  if (mismatches.length) {
    console.error('HALT: council roster reconciliation failed (truesource wins — fix the static map):');
    for (const x of mismatches) console.error('  ✗ ' + x);
    process.exit(2);
  }
  log('roster reconciliation: 9/9 districts match truesource');

  // --- Step 1.5: ledger snapshot freshness (S252/S329 — quote the meta) ---
  const metaPath = path.join(ROOT, 'output', 'simulation_ledger_snapshot.meta.json');
  // G-PF35 (S407): the test is NOT-OLDER, not equal. A civic leg re-run at an
  // older cycle than the engine's (chasing C104 while the engine sits at C105)
  // read a perfectly current snapshot as stale, refreshed it, and stamped it
  // BACKWARD — and with dumpLedger now refusing that downgrade, an equality
  // test would have halted the run outright on a snapshot that is fresher than
  // it asked for. Older is the failure the S252/S329 halt exists for; newer is
  // the same live sheet and is fine.
  const staleFor = (m, c) => !m || !Number.isFinite(Number(m.cycle)) || Number(m.cycle) < Number(c);
  let meta = readJson(metaPath);
  if (staleFor(meta, cycle)) {
    log('ledger snapshot stale (' + (meta ? 'cycle ' + meta.cycle : 'missing') + ' vs working cycle ' + cycle + ') — refreshing via dumpLedger.js');
    execFileSync('node', [path.join(ROOT, 'scripts', 'dumpLedger.js'), cycle, '--quiet'], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
    meta = readJson(metaPath);
    if (staleFor(meta, cycle)) throw new Error('ledger snapshot still stale after refresh: ' + JSON.stringify(meta));
  }
  log('ledger snapshot meta (verbatim): cycle=' + meta.cycle + ' rowCount=' + meta.rowCount + ' generatedAt=' + meta.generatedAt);

  // --- parse world_summary ---
  const sections = splitSections(summaryMd);
  const approvals = parseApprovalTable(findSection(sections, 'Approval Ratings'));
  const hoods = parseHoodTable(findSection(sections, 'City State'));
  if (!Object.keys(approvals).length) throw new Error('world_summary Approval Ratings table parsed to 0 rows — format drift');
  if (!Object.keys(hoods).length) throw new Error('world_summary Neighborhood snapshot table parsed to 0 rows — format drift');

  // --- Step 2: deterministic topic assignments ---
  // assignments: agentDir -> [{kind, title, body}]
  const assignments = {};
  const assign = (dir, topic) => {
    if (!dir) return;
    (assignments[dir] = assignments[dir] || []).push(topic);
  };
  const auditByInit = {};
  for (const p of audit.patterns) {
    for (const id of (p.affectedEntities && p.affectedEntities.initiatives) || []) {
      (auditByInit[id] = auditByInit[id] || []).push(p);
    }
  }

  // Initiatives: hot = next action due, vote pending, or engine-flagged.
  const initiatives = (tracker.initiatives || []).filter(i => !/^(completed|rejected|dead)$/i.test(i.status || ''));
  const hotInits = [];
  for (const init of initiatives) {
    const impl = init.implementation || {};
    const flagged = auditByInit[init.id] || [];
    const voteReady = /vote-ready/i.test(impl.phase || '') || /vote-ready/i.test(init.status || '');
    const due = impl.nextActionCycle && Number(impl.nextActionCycle) <= Number(cycle);
    if (!(voteReady || due || flagged.length)) continue;
    hotInits.push(init);
    const ownerRule = INITIATIVE_AGENT.find(r => r.re.test(init.name));
    const owner = ownerRule ? ownerRule.dir : null;
    const flagNotes = flagged.map(p => 'The engine\'s own review flags this: ' + ailmentPerception(p));
    // civic.29: the Sunday packet had the same blind spot as the weekday pack
    // (initFact() fix, same session) — budget was on the tracker but never
    // handed to the seat, so mayor_open_c104 invented "$412,000" and "$1.2
    // million" instead of citing the real $28M/$12.5M figures that exist.
    const body = [
      cleanInline(impl.summary) ? 'Where it stands: ' + cleanInline(impl.summary) : 'Where it stands: in ' + phaseProse(impl.phase) + '.',
      init.budget ? 'Budget: ' + init.budget + '.' : null,
      impl.nextScheduledAction && cleanInline(impl.nextScheduledAction) ? 'On the calendar: ' + cleanInline(impl.nextScheduledAction) + (due ? ' — due THIS cycle.' : '.') : null,
      ...flagNotes,
    ].filter(Boolean).join('\n');
    const topic = { kind: 'initiative', id: init.id, title: init.name + (voteReady ? ' — VOTE PENDING' : due ? ' — action due this cycle' : ' — engine-flagged'), body };
    assign('civic-office-mayor', topic);
    assign(owner, topic);
    if (/stabilization/i.test(init.name)) assign('civic-office-okoro', topic);
    // District routing: initiative hoods -> that seat's agentDir (civic.24)
    const seatsHit = new Set();
    for (const hood of init.neighborhoods || []) {
      const d = getDistrictForNeighborhood(hood);
      const seat = d && truesource.council.find(c => c.district === d);
      if (seat) seatsHit.add(civicSeat.councilDir(seat.district));
    }
    // G-R11: a pending vote goes to ALL 9 districts
    if (voteReady && (!impl.nextActionCycle || due)) {
      civicSeat.councilAgentDirs(officeMap).forEach(d => seatsHit.add(d));
    }
    for (const b of seatsHit) assign(b, topic);
  }

  // HIGH ailments: hood -> district bloc; initiative -> owner (already above);
  // crime-flavored -> police chief; ownerless hoods roll up to the Mayor digest.
  for (const p of audit.patterns.filter(p => p.severity === 'high')) {
    const topic = { kind: 'ailment', title: 'Engine review HIGH: ' + p.type.replace(/-/g, ' '), body: ailmentPerception(p) + (p.type === 'stuck-initiative'
      ? '\nThis is a decision demand, not a briefing. Advance the phase or take a fail phase. Silence fails the apply gate.'
      : '\nNo city program currently answers this. Make a move this cycle — silence is a choice you will be charged for.') };
    const sig = JSON.stringify((p.evidence && p.evidence.fields) || {});
    if (p.type !== 'ledger-completeness') {
      for (const hood of (p.affectedEntities && p.affectedEntities.neighborhoods) || []) {
        const d = getDistrictForNeighborhood(hood);
        const seat = d && truesource.council.find(c => c.district === d);
        if (seat) assign(civicSeat.councilDir(seat.district), topic);
      }
      if (/CrimeIndex/i.test(sig)) assign('civic-office-police-chief', topic);
    }
  }

  const assignedDirs = Object.keys(assignments);
  log('topic assignments: ' + assignedDirs.length + ' offices, ' + hotInits.length + ' hot initiatives, ' + audit.patterns.filter(p => p.severity === 'high').length + ' HIGH patterns');

  // --- Step 3: write packets ---
  // Offices = unique agentDirs from the map. A bloc dir carries its member rows.
  const officesByDir = {};
  for (const o of officeMap.offices) {
    if (!o.agentDir) continue;
    (officesByDir[o.agentDir] = officesByDir[o.agentDir] || []).push(o);
  }
  // Project directors are chain seats outside the Civic_Office_Ledger mirror —
  // they carry their own neighborhoods list for the district pulse.
  for (const p of officeMap.projects || []) {
    if (p.agentDir) officesByDir[p.agentDir] = [p];
  }
  // Mayor always gets a packet (she opens the cascade) even with zero hot topics.
  if (!assignments['civic-office-mayor']) assignments['civic-office-mayor'] = [];
  // civic.24: every seated district speaks Sunday even with an empty week.
  // Omission is a record; a missing packet is an absence of data. C104's
  // unattended prep wrote 13 packets and skipped D4/D6/D9 because no INIT
  // or HIGH hood intersected them — Task 9 cannot meet "nine hearing files"
  // unless those seats still get a packet.
  for (const d of civicSeat.councilAgentDirs(officeMap)) {
    if (!assignments[d]) assignments[d] = [];
  }

  // engine.11 T5.3 — chaos cascade: a Tier-1 chaos-cars hit is citywide news,
  // every packet gets the block regardless of topic assignment (city-hall-prep
  // SKILL.md Step 2/3 — this is the deterministic-cron port of that rule; the
  // SKILL.md itself carries disable-model-invocation:true and does not run on
  // this path, so the check has to live here too or it never fires headless).
  const chaosHits = await chaosCascade.readTier1Hits(cycle).catch(() => []);
  if (chaosHits.length) log('chaos cascade: ' + chaosHits.length + ' Tier-1 hit(s) this cycle — prepending to every packet');

  fs.mkdirSync(PACKETS, { recursive: true });
  const written = [];
  const activeSeats = truesource.council.filter(c => c.status === 'active').length;
  for (const dir of Object.keys(assignments)) {
    const rows = officesByDir[dir];
    if (!rows) { log('skip: assignment for ' + dir + ' but no office-map rows with that agentDir'); continue; }
    const topics = assignments[dir];
    const isCouncil = civicSeat.isCouncilOffice(rows[0]);
    const citywide = rows.every(r => r.district === 'citywide' || !r.district);
    const L = [];

    if (isCouncil) {
      const o = rows[0];
      L.push('# Pending Decisions — ' + o.title + ' ' + o.holder + ' — Cycle ' + cycle);
      L.push('');
      L.push('## Live roster status (whip-read off THIS, not memory)');
      for (const m of truesource.council) {
        L.push('- ' + m.district + ' ' + m.name + ' (' + m.faction + ') — ' + m.status.toUpperCase() + (m.status !== 'active' ? ' (named absentee, not voting)' : '') + (approvals[m.name] ? '. Approval ' + approvals[m.name].approval + (approvals[m.name].delta ? ' (' + (approvals[m.name].delta > 0 ? 'up' : 'down') + ' ' + Math.abs(approvals[m.name].delta) + ' since last cycle)' : ' (holding)') : ''));
      }
      L.push('- Full council: ' + activeSeats + ' active of 9 → a majority is ' + (Math.floor(activeSeats / 2) + 1) + '.');
      const appr = approvals[o.holder];
      if (appr) L.push('Your approval stands at ' + appr.approval + (appr.delta ? ' — ' + (appr.delta > 0 ? 'up' : 'down') + ' ' + Math.abs(appr.delta) + ' since last cycle.' : ' — holding.'));
    } else {
      const o = rows[0];
      const appr = approvals[o.holder];
      L.push('# Pending Decisions — ' + o.title + ' ' + o.holder + ' — Cycle ' + cycle);
      L.push('');
      if (appr) L.push('Your approval stands at ' + appr.approval + (appr.delta ? ' — ' + (appr.delta > 0 ? 'up' : 'down') + ' ' + Math.abs(appr.delta) + ' since last cycle.' : ' — holding.'));
    }

    // civic.29: an owner only had a legal way to cite their own initiative's
    // budget when it happened to be hot THIS cycle — Baylight Authority's
    // packet carried nothing in a quiet week, so her office had no citable
    // figure for her own $2.1B project and the Sunday grounding gate flagged
    // her citing it. Standing identity, not a this-week decision — no "your
    // call" framing, so it doesn't get pulled into the DECISION count.
    const ownInit = initiatives.find(i => INITIATIVE_AGENT.some(r => r.re.test(i.name) && r.dir === dir));
    if (ownInit && ownInit.budget) {
      L.push('', '## What you run', ownInit.name + ' — Budget: ' + ownInit.budget + '.');
    }

    if (chaosHits.length) {
      const voice = rows[0].title + ' ' + rows[0].holder;
      for (const hit of chaosHits) L.push('', chaosCascade.reactionBlockFor(hit, voice));
    }

    L.push('', '## City This Cycle');
    const projectHoods = rows[0].neighborhoods || null;   // project seats carry their own turf
    let turfHoods;
    if (citywide && !projectHoods) {
      L.push(citywideDigest(sections, audit));
      turfHoods = Object.keys(hoods);
    } else {
      const myHoods = new Set(projectHoods || []);
      for (const r of rows) {
        for (const h of Object.keys(hoods)) {
          if (getDistrictForNeighborhood(h) === r.district) myHoods.add(h);
        }
      }
      for (const h of myHoods) {
        const line = hoodPulseLine(h, hoods[h], briefs);
        if (line) L.push(line);
      }
      if (!myHoods.size) L.push('- No neighborhood pulse rows resolved for your district(s) this cycle.');
      turfHoods = [...myHoods];
    }

    // Continuity — what this voice said last cycle
    const voiceKey = dir.replace(/^civic-(office|project)-/, '').replace(/-/g, '_');
    const pv = priorVoice[voiceKey] || priorVoice[voiceKey.replace('_authority', '')];
    if (pv) {
      // mayor JSON carries cascadeSummary; faction/project JSONs carry statements[]
      let cont = pv.cascadeSummary || null;
      if (!cont && Array.isArray(pv.statements)) {
        cont = pv.statements.map(s => s.decision || s.summary || s.topic)
          .filter(Boolean).slice(0, 3).join(' — ');
      }
      cont = cleanInline(cont);
      if (cont) L.push('', '## What you did last cycle (the public remembers)', cont);
    }

    // Mara cross-check — the office's section of the directive, if one exists
    if (directive) {
      const sect = directive.split(/\n## /).find(s => s.includes('`' + dir + '`') || s.includes(dir));
      if (sect) {
        const clean = cleanLines('## ' + sect).trim();
        if (clean) L.push('', '## Directive from Mara Vance, City Planning Director — answer it; silence is a choice you will be charged for', clean);
      }
    }

    // Constituent question — crisis and credit in the voice's own turf
    // (Mike-direct S344: they argue initiatives, but they fight for their
    // constituents — every packet asks about the people, not just the process).
    const constituent = constituentTopic(turfHoods, hoods, citywide && !projectHoods);
    if (constituent) topics.push(constituent);

    // Decisions
    let n = 0;
    for (const t of topics) {
      n++;
      L.push('', '## DECISION ' + n + ' — ' + t.title, '', t.body, '');
      L.push('Your call — make your own move, in your own voice, with real consequences. No decision is not an option this cycle.');
    }
    if (!topics.length) {
      L.push('', '## DECISION 1 — Set the cycle\'s direction', '', 'No initiative demands action and no crisis forces your hand this cycle. Say what the city should make of that — where your attention goes when nothing is on fire.', '', 'No decision is not an option this cycle.');
    }

    const week = await loadWeekCarry(officeMap, dir, cycle);
    const outPath = path.join(PACKETS, dir + '_pending_decisions_c' + cycle + '.md');
    fs.writeFileSync(outPath, spliceWeekCarry(L.join('\n'), week).replace(/\s+$/, '') + '\n');
    written.push({ dir, path: path.relative(ROOT, outPath), topics: topics.length });
  }

  // --- Step 4: verify — lint every packet, fail loud ---
  let leaks = 0;
  for (const w of written) {
    const issues = lintText(fs.readFileSync(path.join(ROOT, w.path), 'utf8'));
    console.log('  [' + (issues.length ? '✗' : '✓') + '] ' + w.path + ' — ' + issues.length + ' leak(s), ' + w.topics + ' topic(s)');
    for (const it of issues) console.error('      ✗ [' + it.rule + '] "' + it.match + '" «' + it.context + '»');
    leaks += issues.length;
  }
  const missingSeats = civicSeat.councilAgentDirs(officeMap).filter(d => !written.some(w => w.dir === d));
  if (missingSeats.length) {
    console.error('HALT: civic.24 Sunday needs all 9 district packets; missing: ' + missingSeats.join(', '));
    process.exit(2);
  }

  // Vote-ready routing check (G-R11)
  const voteInits = hotInits.filter(i => /vote-ready/i.test((i.implementation || {}).phase || '') || /vote-ready/i.test(i.status || ''));
  for (const vi of voteInits) {
    for (const seatDir of civicSeat.councilAgentDirs(officeMap)) {
      const has = (assignments[seatDir] || []).some(t => t.id === vi.id);
      if (!has) { console.error('  ✗ G-R11: vote-pending ' + vi.id + ' not routed to ' + seatDir); leaks++; }
    }
  }

  // Manifest + production-log section
  fs.mkdirSync(CIVIC, { recursive: true });
  const manifest = {
    stage: 'prep', cycle: Number(cycle),
    directive: directivePath ? path.relative(ROOT, directivePath) : null,
    ledgerSnapshot: meta,
    offices: written,
    hotInitiatives: hotInits.map(i => i.id),
    highPatterns: audit.patterns.filter(p => p.severity === 'high').length,
    lintLeaks: leaks,
    ranAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(CIVIC, 'prep_c' + cycle + '.json'), JSON.stringify(manifest, null, 2));

  const plog = path.join(ROOT, 'output', 'production_log_c' + cycle + '.md');
  const plogSection = [
    '', '## /city-hall-prep (AUTO — cron-civic-run.js)',
    '- Pressure (AUTO path, S215 G-5): ' + audit.patterns.filter(p => p.severity === 'high').length + ' HIGH engine patterns + ' + (directive ? 'Mara directive ' + path.basename(directivePath) : 'no Mara directive'),
    '- Ledger snapshot: cycle=' + meta.cycle + ' rowCount=' + meta.rowCount,
    '- Packets: ' + written.map(w => w.dir + '(' + w.topics + ')').join(', '),
    '- Lint: ' + (leaks ? leaks + ' LEAK(S) — HALTED' : 'clean'),
    '- Chaos cascade (engine.11 T5.3): ' + (chaosHits.length
      ? chaosHits.length + ' Tier-1 hit(s) — CHAOS CASCADE block in every packet: ' + chaosHits.map(h => h.targetName + ' via ' + h.vehicle).join(', ')
      : 'none this cycle'),
    '',
  ].join('\n');
  if (!fs.existsSync(plog)) fs.writeFileSync(plog, '# Production Log — Cycle ' + cycle + '\n\n(Opened by cron-civic-run.js --stage=prep)\n');
  // Re-runs replace their own section(s) instead of stacking duplicates:
  // drop every existing AUTO-prep section, then append the fresh one.
  const marker = '## /city-hall-prep (AUTO — cron-civic-run.js)';
  const kept = [];
  let dropping = false;
  for (const line of fs.readFileSync(plog, 'utf8').split('\n')) {
    if (line.trim() === marker) { dropping = true; continue; }
    if (dropping && /^## /.test(line)) dropping = false;
    if (!dropping) kept.push(line);
  }
  fs.writeFileSync(plog, kept.join('\n').replace(/\n+$/, '\n') + plogSection);

  if (leaks) {
    console.error('\nHALT: prep produced ' + leaks + ' telemetry leak(s)/routing failure(s) — packets staged but chain must not proceed.');
    process.exit(1);
  }
  console.log('\n=== prep complete: ' + written.length + ' packets, lint clean → ' + path.relative(ROOT, PACKETS) + ' ===');
}

// ---------------------------------------------------------------------------
// Stage: directive (Task 2.2 — the Mara-on-claude.ai replacement)
// ---------------------------------------------------------------------------

// Local OpenRouter helper — same shape as cron-civic-eval.js / cron-desk-writer.js
// (the eval script guards argv at module top, so it can't be required).
function callOpenRouter(model, system, user, maxTokens) {
  const https = require('https');
  const body = JSON.stringify({
    model, max_tokens: maxTokens || 4000,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'openrouter.ai', path: '/api/v1/chat/completions', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }, timeout: 180000
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try {
          const j = JSON.parse(b);
          // civic.26 — say WHAT went wrong. OpenRouter's j.error.message is the
          // generic "Provider returned error"; the diagnosis (HTTP code, and
          // the upstream's own text — e.g. "temporarily rate-limited upstream …
          // shared pool") lives in j.error.code / j.error.metadata.raw. Logging
          // only the message turned a transient 429 into two weeks of a string
          // that reads like a dead model.
          if (j.error) {
            const bits = [j.error.message || 'error'];
            if (j.error.code) bits.push('HTTP ' + j.error.code);
            const meta = j.error.metadata || {};
            const raw = typeof meta.raw === 'string' ? meta.raw : (meta.raw ? JSON.stringify(meta.raw) : '');
            if (raw) bits.push(raw.slice(0, 220));
            else if (!j.error.message) bits.push(JSON.stringify(j.error).slice(0, 220));
            return reject(new Error(model + ': ' + bits.join(' — ')));
          }
          resolve({ text: j.choices[0].message.content, usage: j.usage || {}, provider: j.provider || null });
        } catch (e) { reject(new Error(model + ': bad response — ' + b.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(model + ': timeout')); });
    req.write(body); req.end();
  });
}
const modelFamily = slug => String(slug).split('/')[0];

async function runDirective() {
  const cycle = arg('--cycle', null) || detectCycle();
  const prev = String(Number(cycle) - 1);
  console.log('Civic DIRECTIVE — c' + cycle);
  console.log('===================================');

  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const summaryMd = mustRead(path.join(ROOT, 'output', 'world_summary_c' + cycle + '.md'), 'run /build-world-summary first');
  const audit = mustJson(path.join(ROOT, 'output', 'engine_audit_c' + cycle + '.json'), 'run /engine-review first');
  const tracker = trackerSnapshot.loadOrRebuild(cycle);

  // Friction rule (plan Task 2.2): the directive's model family must differ
  // from the Mayor's writer family.
  const mayorModel = (officeMap.offices.find(o => o.officeId === 'MAYOR-01') || {}).model || '';
  const MODEL = arg('--model', 'google/gemini-3.7-flash');
  if (modelFamily(MODEL) === modelFamily(mayorModel)) {
    console.error('FRICTION VIOLATION: directive model family "' + modelFamily(MODEL) + '" matches the Mayor\'s writer family. Pick a different --model.');
    process.exit(2);
  }

  // Mara persona: IN_WORLD_CHARACTER.md only (Mike-direct S344). The
  // VOICE_DIRECTIVE_TEMPLATE is an apparatus doc (.claude paths, audit paths,
  // owner sign-off) — feeding it whole put out-of-sim framing in her context.
  // The directive craft is distilled into the in-world brief below instead.
  // civic.38 Task 8: the directive is a CONFRONTATION aimed at the elected
  // seats — what the seat could have seen (its own district data, its
  // petition pool, its board) and must now answer.
  const DIRECTIVE_BRIEF = [
    '## Your cycle directive — how you work this desk',
    '',
    'Each cycle you review the city\'s live record and confront the elected seats that owe',
    'the public an answer. You are the city\'s institutional memory: you catch the unresolved',
    'thread, the number nobody published, the seat gone quiet while its district moves the',
    'wrong way. Project directors and staff are not your addressees — their work is',
    'operational. You confront the people the city can vote out.',
    '',
    'Issue one block per addressee, exactly this shape:',
    '',
    '## [Full Name] — [Role]',
    '',
    '- **Agent:** `.claude/agents/<seat>/`  (routing line — copy the seat id exactly as listed for that person)',
    '- **Address:** one sentence, action-shaped — what they must say, publish, or do this cycle',
    '- **Why:** the unresolved thread. Cite cycles by number. Name the decision that depends on this.',
    '- **Acceptance:** what counts as resolved — a number, a position, a filed deliverable, observable next cycle',
    '- **Silence consequence:** what breaks if they stay silent. Silence is also a position.',
    '',
    'All five fields, every block. Order by urgency: vote-gating first, then',
    'record-corrections, then coverage gaps, then escalations of prior directives that went',
    'unanswered. Maximum 12 blocks. If you cannot write a clean Acceptance line, the',
    'directive is not ready — cut it. Thin directives are noise; issuing fewer, sharper',
    'directives is always the better cycle.',
    '',
    'A demand must be traceable to something the seat could see: a district hood moving the',
    'wrong way, constituents complaining on the record with no proposal filed in answer, or an',
    'initiative on the seat\'s board about to hit its stall clock. Name the evidence.',
  ].join('\n');
  const persona = [
    mustRead(path.join(ROOT, 'docs', 'mara-vance', 'IN_WORLD_CHARACTER.md'), 'Mara persona'),
    DIRECTIVE_BRIEF,
  ].join('\n\n---\n\n');

  // civic.38 Task 8 step 1: valid addressees = the 10 ELECTED seats (mayor +
  // 9 council). Project directors, DA, Okoro, Baylight leave the pool — their
  // operational read moves to work-wake (Task 9).
  const seats = [];
  for (const o of officeMap.offices || []) {
    if (!o.agentDir) continue;
    const id = String(o.officeId || '');
    if (id !== 'MAYOR-01' && !/^COUNCIL-D\d$/.test(id)) continue;
    seats.push({ agentDir: o.agentDir, holder: o.holder, title: o.title, office: o });
  }

  // Task 8 step 2 — per-seat material built from the SAME inputs the seats
  // get: district hood movement (engine audit), the petition pool (beats
  // Reflection_Intake once dumped), the seat's board (beats tracker dump).
  // A confrontation confronts with what the seat could have seen.
  const slice = require('./buildCivicOfficeSlice');
  const c2p = slice.childToParentFromAudit(audit);
  const trackerRows = slice.loadTrackerRows(ROOT, cycle);
  if (trackerRows === null) throw new Error('Directive board unavailable: Initiative_Tracker dump absent');
  const hoodScores = slice.scoreHoods(audit);
  // Petition visibility line (default the builder may overrule): a district
  // with this many Civic complaints on the record and no answering proposal is
  // confrontable.
  const PETITION_VISIBILITY_LINE = 3;
  const pendingProposals = (function () {
    const folded = loadMoveLedgerFolded(ROOT, cycle);
    if (!folded) return [];
    return [...folded.values()].filter(m => m.status === 'pending' && m.type === 'propose');
  })();
  const seatMaterial = seats.map(s => {
    const o = s.office;
    const hoods = slice.turfHoods(o);
    const turfSet = new Set(hoods.map(h => String(h).toLowerCase()));
    const lines = ['### ' + s.holder + ' (' + s.title + (o.district ? ', ' + o.district : '') + ') — ' + s.agentDir];
    // (a) hood data moving the wrong way
    const hot = hoodScores.filter(h => turfSet.has(String(h.hood).toLowerCase()) && (h.outlier || h.traj === 'decay'));
    if (hot.length) lines.push('- district heat: ' + hot.slice(0, 3).map(h => h.hood + ' (' + h.why.join('; ') + ')').join(' | '));
    // (b) petitions above the visibility line with no proposal filed
    const pool = slice.loadPetitionPool(ROOT, o, hoods, officeMap, c2p, cycle);
    if (pool.available) {
      const answered = pendingProposals.filter(m => m.agentDir === o.agentDir).length;
      lines.push('- petition pool: ' + pool.complaints.length + ' complaint(s) on the record' +
        (pool.complaints.length >= PETITION_VISIBILITY_LINE && !answered
          ? ' — ABOVE the visibility line (' + PETITION_VISIBILITY_LINE + ') with NO proposal filed by this seat'
          : answered ? ' — ' + answered + ' proposal(s) pending from this seat' : ''));
    }
    // (c) board rows inside one cycle of the stall clock. Stage columns land
    // with Task 4; until then the honest proxy is a tracker row whose
    // NextActionCycle is due now or next cycle.
    const board = slice.boardRowsFor(o, trackerRows, c2p);
    const dueSoon = board.filter(b => {
      const row = trackerRows.find(r => r.InitiativeID === b.id) || {};
      const nac = Number(row.NextActionCycle);
      return Number.isFinite(nac) && nac <= Number(cycle) + 1;
    });
    if (board.length) lines.push('- board: ' + board.map(b => b.id + ' [' + (b.phase || '—') + ']').join(', '));
    if (dueSoon.length) lines.push('- stall-clock proximity (NextActionCycle ≤ C' + (Number(cycle) + 1) + '): ' + dueSoon.map(b => b.id).join(', '));
    return lines.join('\n');
  });

  // Cycle material: summary slices + HIGH patterns + tracker + last cycle's
  // voice record + prior directive (escalation detection). Mara sits at the
  // fourth wall — she MAY see raw engine data; the prep-side line filter keeps
  // it out of voice packets.
  const sections = splitSections(summaryMd);
  const priorDirective = ['mara_directive_c' + prev + '.md', 'mara_directive_c' + prev + '.txt', 'mara_directive_c' + prev + '_AUTO.txt']
    .map(f => path.join(ROOT, 'output', 'mara-directives', f)).find(p => fs.existsSync(p));
  const voiceDir = path.join(ROOT, 'output', 'civic-voice');
  const priorSaid = [];
  if (fs.existsSync(voiceDir)) {
    for (const f of fs.readdirSync(voiceDir)) {
      const m = f.match(/^(.+)_c(\d+)\.json$/);
      if (!m || m[2] !== prev) continue;
      const j = readJson(path.join(voiceDir, f));
      if (!j) continue;
      const gist = j.cascadeSummary || (Array.isArray(j.statements) ? j.statements.map(s => s.decision || s.topic).filter(Boolean).join(' — ') : '');
      if (gist) priorSaid.push('- ' + m[1] + ': ' + String(gist).replace(/\s+/g, ' ').slice(0, 400));
    }
  }
  const highs = audit.patterns.filter(p => p.severity === 'high')
    .map(p => '- [' + p.type + '] ' + ((p.affectedEntities || {}).neighborhoods || []).join(', ') +
      ((p.affectedEntities || {}).initiatives || []).map(i => ' ' + i).join('') +
      ' — evidence: ' + JSON.stringify((p.evidence || {}).fields || {}).slice(0, 300));
  const initLines = (tracker.initiatives || []).map(i => {
    const impl = i.implementation || {};
    return '- ' + i.id + ' ' + i.name + ' [' + (impl.phase || i.status) + '] next: ' + (impl.nextScheduledAction || '—') + ' (cycle ' + (impl.nextActionCycle || '—') + '). ' + String(impl.summary || '').slice(0, 300);
  });

  const user = [
    'Produce your voice directive for cycle ' + cycle + ' as output text only — the structured block-per-addressee format from your template, with the cycle header. No prose outside the format.',
    '',
    'HARD RULES:',
    '- Addressees MUST come from this seat list only (use the agentDir in the Agent field, formatted as `.claude/agents/<agentDir>/`):',
    ...seats.map(s => '  - ' + s.agentDir + ' — ' + s.holder + ' (' + s.title + ')'),
    '- Maximum 12 blocks. Every block carries all five fields (Agent, Address, Why, Acceptance, Silence consequence).',
    '- Only issue a directive where the cycle material below gives you a real unresolved thread, gap, or dependency. Thin directives are noise.',
    '- Do not limit directives to initiative process. Press offices on the crisis and the success in their neighborhoods, their programs, and the city — they argue the initiatives, but they must fight for their constituents.',
    '- Cite cycles by number (C' + prev + ', C' + cycle + '). Never invent citizens, numbers, or events not present below.',
    '',
    '=== PER-SEAT MATERIAL (the same data each seat was given — confront them with what they could have seen) ===',
    ...seatMaterial,
    '',
    '=== CYCLE ' + cycle + ' MATERIAL ===',
    '',
    '## City State (engine summary)',
    findSection(sections, 'City State').slice(0, 3000),
    '',
    '## Three-Cycle Trends',
    findSection(sections, 'Three-Cycle Trends').slice(0, 2000),
    '',
    '## Approval Ratings',
    findSection(sections, 'Approval Ratings').slice(0, 1500),
    '',
    '## Engine review HIGH-severity patterns (' + highs.length + ')',
    ...highs,
    '',
    '## Initiative Tracker (live)',
    ...initLines,
    '',
    '## What the offices said last cycle (C' + prev + ')',
    ...(priorSaid.length ? priorSaid : ['(no prior voice record on disk)']),
    '',
    '## Your prior directive (C' + prev + ') — check satisfaction, escalate what went unanswered',
    priorDirective ? fs.readFileSync(priorDirective, 'utf8').slice(0, 6000) : '(none found on disk)',
  ].join('\n');

  log('model=' + MODEL + ' (mayor=' + mayorModel + ') seats=' + seats.length + ' user=' + user.length + 'ch');
  const MAX_TOKENS = 8000;
  const r = await callOpenRouter(MODEL, persona, user, MAX_TOKENS);
  if (r.usage && r.usage.completion_tokens >= MAX_TOKENS - 8) {
    log('WARNING: output hit the ' + MAX_TOKENS + '-token cap — tail block(s) may be truncated (field validation below drops them)');
  }

  // Validate: keep only blocks addressed to real seats AND carrying all five
  // mandatory template fields (a truncated tail block fails the field check).
  const text = r.text.replace(/^```(?:markdown)?\s*/i, '').replace(/\s*```\s*$/, '');
  let blocks = text.split(/\n(?=## )/).filter(p => /^## /.test(p));
  const known = new Set(seats.map(s => s.agentDir));
  const FIELDS = ['**Agent', '**Address', '**Why', '**Acceptance', '**Silence consequence'];
  const rejected = [];
  blocks = blocks.filter(b => {
    const m = b.match(/\.claude\/agents\/([a-z0-9-]+)\/?/i);
    if (!m || !known.has(m[1])) { rejected.push({ head: (b.split('\n')[0] || '').slice(0, 80), why: 'unknown addressee' }); return false; }
    const missing = FIELDS.filter(f => !b.includes(f));
    if (missing.length) { rejected.push({ head: (b.split('\n')[0] || '').slice(0, 80), why: 'missing fields: ' + missing.join(', ') }); return false; }
    return true;
  });
  if (blocks.length > 12) { log('truncating ' + blocks.length + ' blocks to the template max of 12'); blocks = blocks.slice(0, 12); }
  if (!blocks.length) {
    console.error('HALT: directive model produced no block addressed to a known seat (' + rejected.length + ' rejected). Raw output kept at output/cron-civic/directive_c' + cycle + '.raw.txt');
    fs.mkdirSync(CIVIC, { recursive: true });
    fs.writeFileSync(path.join(CIVIC, 'directive_c' + cycle + '.raw.txt'), r.text);
    process.exit(1);
  }

  // Canonical header is OURS, never the model's — no Gregorian dates in
  // sim-facing content (no-real-world-clock rule); sim clock only.
  const outDir = path.join(ROOT, 'output', 'mara-directives');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'mara_directive_c' + cycle + '_AUTO.txt');
  const canonHeader = [
    '# C' + cycle + ' Voice Directives — Mara Vance (AUTO)',
    '',
    '**Cycle:** ' + cycle,
    '**Issued:** C' + cycle + ' (auto-derived, cron-civic-run.js --stage=directive)',
    '**Source:** world_summary_c' + cycle + ' + engine review HIGHs + tracker + C' + prev + ' voice record',
    '',
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(outPath, canonHeader + blocks.join('\n') + '\n');

  fs.mkdirSync(CIVIC, { recursive: true });
  fs.writeFileSync(path.join(CIVIC, 'directive_c' + cycle + '.json'), JSON.stringify({
    stage: 'directive', cycle: Number(cycle), model: MODEL, mayorModel,
    blocks: blocks.map(b => (b.split('\n')[0] || '').replace(/^## /, '').slice(0, 100)),
    rejectedBlocks: rejected, usage: r.usage,
    directive: path.relative(ROOT, outPath), ranAt: new Date().toISOString(),
  }, null, 2));
  console.log('\n=== directive complete: ' + blocks.length + ' block(s)' + (rejected.length ? ' (' + rejected.length + ' rejected — unknown addressee)' : '') + ' → ' + path.relative(ROOT, outPath) + ' ===');
}

// ---------------------------------------------------------------------------
// Task 2.3 — cascade stages: decide -> voices -> projects -> close
// ---------------------------------------------------------------------------

// Canonical 20-value ImplementationPhase vocabulary (INITIATIVE_TRACKER_CONTRACT
// §2) — same set cron-civic-eval.js scores against.
const PHASES = new Set([
  'announced', 'legislation-filed', 'vote-scheduled', 'vote-ready',
  'visioning', 'visioning-complete', 'design-phase', 'construction-planning',
  'construction-active', 'implementation-active', 'disbursement-active',
  'dispatch-live', 'pilot-active', 'pilot_evaluation', 'operational',
  'complete', 'stalled', 'blocked', 'suspended', 'defunded'
]);

const voiceSlug = dir => dir.replace(/^civic-(office|project)-/, '').replace(/-/g, '_');
const agentPath = dir => path.join(ROOT, '.claude', 'agents', dir);
function readPersonaDir(dir) {
  const files = [];
  if (/^civic-office-council-d\d$/.test(dir)) {
    const shared = agentPath('civic-office-council-seat');
    for (const f of ['LENS.md', 'RULES.md']) {
      const p = path.join(shared, f);
      if (fs.existsSync(p)) files.push(p);
    }
  }
  for (const f of ['IDENTITY.md', 'LENS.md', 'RULES.md']) {
    const p = path.join(agentPath(dir), f);
    if (fs.existsSync(p)) files.push(p);
  }
  if (!files.length) throw new Error('no persona files under .claude/agents/' + dir);
  return files.map(f => fs.readFileSync(f, 'utf8')).join('\n\n---\n\n');
}
function stripFences(t) {
  const s = String(t).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  return (a !== -1 && b > a) ? s.slice(a, b + 1) : s;
}
function outputContract(officeSlug, cycle, initiatives, opts) {
  // FLAT trackerUpdates + InitiativeID — the shape validateTrackerUpdates and
  // applyTrackerUpdates actually write. (First C102 chain run used the eval
  // harness's keyed-by-name shape; every write validated as unresolvable/dark.)
  const forbidPhase = !!(opts && opts.forbidPhase);
  const initList = (initiatives || []).map(i => '  - ' + i.id + ' = ' + i.name).join('\n');
  const schema = '\nRespond with ONLY a JSON object (no markdown fences, no prose before or after):\n' +
    JSON.stringify({
      office: officeSlug, cycle: Number(cycle), speaker: '<the office-holder\'s full name>',
      cascadeSummary: '<2-4 sentences: what you decided and why>',
      statements: [{
        statementId: 'STMT-' + cycle + '-' + officeSlug + '-001', type: '<statement type>',
        topic: '<topic>', initiative: '<exact initiative name from the list below, or null>',
        decision: '<the concrete decision>', quote: '<one strong pull-quote in your voice>',
        fullStatement: '<the full public statement in your voice>', trackerUpdates: {}
      }]
    }, null, 2);
  const known = 'Known initiatives:\n' + initList + '\n' +
    'Never invent citizens, businesses, statistics, or votes not present in your packet.';
  if (forbidPhase) {
    return schema +
      '\ntrackerUpdates MUST be {}. Do not set ImplementationPhase or MayoralAction this turn — the Mayor\'s gavel stamps phases after the hearing.\n' +
      known;
  }
  return schema +
    '\nIf a statement changes an initiative\'s state, fill trackerUpdates as a FLAT object whose "initiative" field is the INIT id (this exact key/format — the pipeline attributes the write by it):\n' +
    '{"initiative": "INIT-XXX", "ImplementationPhase": "<value or omit if unchanged>", "MilestoneNotes": "C' + cycle + ': <one sentence, max 200 chars>", "NextScheduledAction": "<optional>", "NextActionCycle": <optional number>}\n' +
    'A statement with no state change keeps trackerUpdates as {} (empty).\n' +
    'ImplementationPhase MUST be one of: ' + [...PHASES].join(', ') + '.\n' +
    known;
}
function validateVoiceJson(raw) {
  const v = { ok: false, why: null, json: null };
  let j;
  try { j = JSON.parse(stripFences(raw)); } catch (e) { v.why = 'JSON parse failed: ' + e.message; return v; }
  if (!(j.office && j.speaker && Array.isArray(j.statements) && j.statements.length &&
    j.statements.every(st => st.decision && st.quote && st.fullStatement && 'trackerUpdates' in st))) {
    v.why = 'schema incomplete (office/speaker/statements[].decision/quote/fullStatement/trackerUpdates)';
    return v;
  }
  for (const st of j.statements) {
    const tu = st.trackerUpdates || {};
    const rewrite = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      const p = obj.ImplementationPhase;
      if (!p) return;
      if (PHASES.has(p)) return;
      const hyphen = String(p).replace(/_/g, '-');
      if (PHASES.has(hyphen)) { obj.ImplementationPhase = hyphen; return; }
    };
    rewrite(tu);
    for (const u of Object.values(tu)) {
      if (u && typeof u === 'object') rewrite(u);
    }
    const phases = [tu.ImplementationPhase, ...Object.values(tu).map(u => u && typeof u === 'object' ? u.ImplementationPhase : null)];
    for (const p of phases) {
      if (p && !PHASES.has(p)) { v.why = 'ImplementationPhase outside contract vocabulary: "' + p + '"'; return v; }
    }
  }
  v.ok = true; v.json = j;
  return v;
}

// One voice call with a single retry (models flake on JSON discipline; the
// retry names the failure). Fail returns null — caller decides fatality.
function prepTargetDirForHood(hood, officeMap) {
  const d = getDistrictForNeighborhood(hood);
  if (!d) return null;
  const row = (officeMap.offices || []).find(o => o.district === d);
  return (row && row.agentDir) || civicSeat.councilDir(d);
}

// Reads BOTH shapes validateVoiceJson tolerates — the flat contract shape and
// the keyed-by-name shape drifted models emit — so a phase can't route past the
// agenda/hearing wall by arriving in the keyed form.
function hearingHasPhase(json) {
  for (const st of (json && json.statements) || []) {
    const tu = (st && st.trackerUpdates) || {};
    if (tu.ImplementationPhase) return true;
    for (const u of Object.values(tu)) {
      if (u && typeof u === 'object' && u.ImplementationPhase) return true;
    }
  }
  return false;
}

// Agenda + hearing turns may not stamp a phase; only the gavel does. Passed to
// callVoice as an extra check so the constraint is enforced INSIDE the retry
// loop and the model is told what it broke (house precedent: the daily-news
// quote wall, 1d67333a — keep the wall, give the writer one repair pass).
function noPhaseCheck(json) {
  if (!hearingHasPhase(json)) return null;
  return 'this turn must NOT set trackerUpdates.ImplementationPhase — the Mayor\'s gavel stamps phases after the hearing. '
    + 'Keep trackerUpdates as {} or omit ImplementationPhase, and re-send the whole JSON object.';
}

// civic.29: the weekday datawake gate (ungroundedNumbers) never covered the
// Sunday chain — mayor_open_c104's actual published statement invented
// "Thirty-two eligible applicants... clear the backlog in 60 days" with
// nothing in her packet naming 32 or 60. Nothing caught it; it sat as citable
// civic-voice source material for a full week.
//
// civic.35 (builder-ruled S433): GATE THE FACTS, NOT THE COLOR. The check
// runs against the tracker fields only — MilestoneNotes and NextScheduledAction,
// the fields that propagate into a future cycle's known[] via initFact() and
// become ground truth for every seat after them. Speech (decision / quote /
// fullStatement) is NOT gated: a mayor saying "over two hundred residents
// showed up" is a mayor talking, and the desk quotes her as her claim. Gating
// speech made the offices drones of the engine's numbers; the C106 mayor open
// (2026-09-06 21:43, mistral) was rejected on "sixty-nine families" — a correct
// 57+12 from her own packet — and "two hundred residents". Neither was a
// tracker fact. Arithmetic on packet figures is also accepted now (see
// ungroundedNumbers). Doctrine: docs/SIM_DOCTRINE.md §13.
const TRACKER_FACT_FIELDS = ['MilestoneNotes', 'NextScheduledAction'];
function trackerFactTexts(tu) {
  if (!tu || typeof tu !== 'object') return [];
  const out = [];
  const take = (obj) => { for (const f of TRACKER_FACT_FIELDS) if (obj && obj[f] != null) out.push(obj[f]); };
  take(tu);                                   // flat contract shape
  for (const v of Object.values(tu)) if (v && typeof v === 'object') take(v);   // legacy nested-by-initiative shape
  return out;
}
function statementNumberCheck(hay, context) {
  return function (json) {
    const bad = new Set();
    for (const st of (json && json.statements) || []) {
      const texts = trackerFactTexts(st && st.trackerUpdates);
      for (const n of ungroundedNumbers(hay, texts, context)) bad.add(n);
    }
    if (!bad.size) return null;
    return 'cited number(s) not in your packet: [' + [...bad].join(', ') + ']. Use only quantities present in the material above, or say it in words without inventing figures.';
  };
}
function composeChecks() {
  const fns = Array.prototype.slice.call(arguments).filter(Boolean);
  return function (json) {
    for (const fn of fns) {
      const why = fn(json);
      if (why) return why;
    }
    return null;
  };
}

// civic.26 — seats a voice can fall back to when its own model is unreachable.
// Ordered by how little the fleet already leans on them, so a fallback costs
// as little voice distinctiveness as it can: a seat that borrows deepseek
// sounds like thirty other seats.
//
// civic.34 (2026-09-06): qwen/qwen3-235b-a22b dropped after the fleet's own
// number-gate log named it the worst offender by a wide margin — 12 ungrounded-
// number incidents across its 4 seats (D1/D3/D5/D9) vs deepseek's 8 across its
// ~30, a per-seat rate roughly 10x worse. A fallback exists to rescue a seat
// from a CALL failure (429/timeout); one that reliably reintroduces the exact
// defect the two-attempt VALIDITY gate exists to catch is not a rescue.
const FALLBACK_MODELS = ['moonshotai/kimi-k2', 'deepseek/deepseek-chat'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// civic.26 — the chain for one seat: its own model first, then any fallback
// from a DIFFERENT provider family. Same-family fallbacks are dropped because
// the failure this exists for is provider-wide (an upstream 429 on Mistral's
// shared pool takes every mistralai/* slug with it), not model-specific.
function modelChainFor(model) {
  const chain = [model];
  for (const m of FALLBACK_MODELS) {
    if (modelFamily(m) !== modelFamily(model) && !chain.includes(m)) chain.push(m);
  }
  return chain;
}

// Two failure classes, two responses (civic.26):
//   CALL failure (throw from callOpenRouter — 429, timeout, provider error):
//     the model never spoke. Back off, retry it, then hand the turn to the next
//     provider. Before this, mayor-open made two calls 0.4s apart against one
//     model and HALTed the whole Sunday chain on a transient shared-pool 429
//     (2026-08-30, twice) — a retry policy that fast cannot outlast a throttle.
//   VALIDITY failure (!v.ok): the model spoke and broke contract. That is its
//     own mistake to repair, so keep the existing same-model repair pass with
//     the rejection reason appended. Switching providers there would just lose
//     the seat's voice over a fixable JSON slip.
// Returns the model that actually answered so the record shows who spoke.
async function callVoice(dir, model, userPrompt, maxTokens, officeMap, extraCheck) {
  const row = officeMap ? civicSeat.resolveOfficeRow(officeMap, dir) : null;
  const persona = readPersonaDir((row && civicSeat.personaDirFor(row, ROOT)) || dir);
  const chain = modelChainFor(model);
  let prompt = userPrompt;
  let lastErr = 'no result';

  for (let mi = 0; mi < chain.length; mi++) {
    const active = chain[mi];
    if (mi > 0) log(dir + ' falling back to ' + active + ' (after ' + chain[mi - 1] + ': ' + lastErr + ')');

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const r = await callOpenRouter(active, persona, prompt, maxTokens || 4000);
        const v = validateVoiceJson(r.text);
        if (v.ok && extraCheck) {
          const why = extraCheck(v.json);
          if (why) { v.ok = false; v.why = why; }
        }
        if (v.ok) {
          if (active !== model) log(dir + ' answered by fallback ' + active);
          return { json: v.json, usage: r.usage, attempts: attempt, model: active, fellBackFrom: active === model ? null : model };
        }
        log(dir + ' attempt ' + attempt + ' invalid: ' + v.why);
        lastErr = v.why;
        // Contract break — repair with the same model, do not burn the chain.
        if (attempt === 2) return { error: v.why, raw: r.text, model: active };
        prompt += '\n\nYOUR PREVIOUS ATTEMPT WAS REJECTED: ' + v.why + '. Respond with ONLY the corrected JSON object.';
      } catch (e) {
        lastErr = e.message;
        log(dir + ' attempt ' + attempt + ' call failed: ' + e.message);
        if (attempt < 2) await sleep(2000 * attempt);   // 2s, then move on
      }
    }
  }
  return { error: lastErr + ' (all ' + chain.length + ' model(s) tried: ' + chain.join(', ') + ')' };
}

function packetPathFor(dir, cycle) {
  return path.join(PACKETS, dir + '_pending_decisions_c' + cycle + '.md');
}
function writeVoiceJson(slug, cycle, json) {
  const p = path.join(ROOT, 'output', 'civic-voice', slug + '_c' + cycle + '.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(json, null, 2));
  return path.relative(ROOT, p);
}
// Re-entry reuse (S432, engine-sheet): a seat that already passed this cycle
// keeps its output. The Sunday chain re-enters after a HALT (the 21:00 retry,
// or by hand) and re-rolling seats that already passed just hands each of
// them a fresh chance to fail the number check — C105: council_d1 halted the
// 14:30 run, then the mayor (passed at 14:31) halted the 14:36 re-entry. This
// is the "file-idempotent stages" contract runChain's guard comment promises.
// To re-roll one seat, delete its output/civic-voice/<slug>_c<N>.json.
function existingVoice(slug, cycle) {
  const p = path.join(ROOT, 'output', 'civic-voice', slug + '_c' + cycle + '.json');
  const j = readJson(p);
  if (!j || !Array.isArray(j.statements)) return null;
  log('reusing ' + path.relative(ROOT, p) + ' — delete it to re-roll');
  return { json: j, output: path.relative(ROOT, p), attempts: 0, model: '(reused)', reused: true };
}
function officeModel(officeMap, dir) {
  const row = civicSeat.resolveOfficeRow(officeMap, dir)
    || [...officeMap.offices, ...(officeMap.projects || [])].find(o => o.agentDir === dir && o.model);
  if (!row || !row.model) throw new Error('no model in civic-office-map.json for ' + dir);
  return row.model;
}
function mayorModel(officeMap) {
  return arg('--mayor-model', null) || officeModel(officeMap, 'civic-office-mayor');
}
// Baylight is a project seat behind an office-dir name (S229 G-R3); her
// initiative lives here because the offices[] mirror carries no initiative field.
const BAYLIGHT = { agentDir: 'civic-office-baylight-authority', initiative: 'INIT-006' };
function projectSeats(officeMap) {
  const seats = (officeMap.projects || []).map(p => ({ agentDir: p.agentDir, initiative: p.initiative }));
  seats.push(BAYLIGHT);
  return seats;
}
const LAYER3_DIRS = new Set(['civic-office-baylight-authority', 'civic-project-stabilization-fund',
  'civic-project-oari', 'civic-project-health-center', 'civic-project-transit-hub']);

// Statements that touch an initiative (by INIT id or tracker name) — the Step 5
// trigger rule: a project runs only when a voice decision touched its initiative.
function statementsTouching(voiceJsons, initId, tracker) {
  const init = (tracker.initiatives || []).find(i => i.id === initId);
  const name = init ? init.name : null;
  const hits = [];
  for (const [slug, j] of Object.entries(voiceJsons)) {
    for (const st of (j && j.statements) || []) {
      const hay = [st.initiative, st.topic, ...Object.keys(st.trackerUpdates || {})].filter(Boolean).join(' | ');
      if (hay.includes(initId) || (name && hay.toLowerCase().includes(name.toLowerCase()))) {
        hits.push({ slug, st });
      }
    }
  }
  return hits;
}
function loadVoiceJsons(cycle) {
  const dir = path.join(ROOT, 'output', 'civic-voice');
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(.+)_c(\d+)\.json$/);
    if (m && m[2] === String(cycle)) out[m[1]] = readJson(path.join(dir, f));
  }
  return out;
}

const AGENDA_MARK = "## MAYOR'S AGENDA THIS CYCLE";

function injectPacketSection(cycle, marker, lines, skipPrefix) {
  let injected = 0;
  if (!fs.existsSync(PACKETS)) return 0;
  for (const f of fs.readdirSync(PACKETS)) {
    if (!f.endsWith('_c' + cycle + '.md') || (skipPrefix && f.startsWith(skipPrefix))) continue;
    const p = path.join(PACKETS, f);
    let body = fs.readFileSync(p, 'utf8');
    const at = body.indexOf(marker);
    if (at !== -1) body = body.slice(0, at).replace(/\n+$/, '\n');
    fs.writeFileSync(p, body.replace(/\n+$/, '\n') + '\n' + lines.join('\n') + '\n');
    const issues = lintText(fs.readFileSync(p, 'utf8'));
    if (issues.length) { console.error('HALT: packet inject leaked telemetry into ' + f + ' — ' + issues.map(i => i.match).join(', ')); process.exit(1); }
    injected++;
  }
  return injected;
}

// civic.24: Mayor opens the floor (agenda only). trackerUpdates forbidden.
async function runMayorOpen() {
  const cycle = arg('--cycle', null) || detectCycle();
  console.log('Civic MAYOR-OPEN — c' + cycle);
  console.log('===================================');
  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const initiatives = (trackerSnapshot.loadOrRebuild(cycle).initiatives) || [];
  const packet = mustRead(packetPathFor('civic-office-mayor', cycle), 'run --stage=prep first');
  const model = mayorModel(officeMap);
  log('mayor model=' + model);
  let r = existingVoice('mayor_open', cycle);
  let outPath = r ? r.output : null;
  if (!r) {
    const wallInj = await positionWallInject(officeMap, 'civic-office-mayor');
    const user = [
      'YOUR PENDING DECISIONS PACKET (cycle ' + cycle + '):',
      '', packet, wallInj || '',
      'This is the AGENDA turn. Name what is on the floor. Do NOT emit trackerUpdates.ImplementationPhase or MayoralAction. The gavel comes after the hearing.',
      outputContract('mayor_open', cycle, initiatives, { forbidPhase: true }),
    ].join('\n');
    const hay = packet + '\n' + (wallInj || '');
    r = await callVoice('civic-office-mayor', model, user, 5000, officeMap,
      composeChecks(noPhaseCheck, statementNumberCheck(hay, { cycle })));
    if (!r || r.error) {
      console.error('HALT: Mayor open failed — ' + (r ? r.error : 'no result') + '. Hearing must not start.');
      if (r && r.raw) { fs.mkdirSync(CIVIC, { recursive: true }); fs.writeFileSync(path.join(CIVIC, 'mayor_open_c' + cycle + '.raw.txt'), r.raw); }
      process.exit(1);
    }
    if (hearingHasPhase(r.json)) {
      console.error('HALT: Mayor open emitted ImplementationPhase — agenda cannot stamp the tracker.');
      process.exit(1);
    }
    outPath = writeVoiceJson('mayor_open', cycle, r.json);
    await positionWallRecordCascade(officeMap, 'civic-office-mayor', r.json, cycle);
  }
  // The agenda is re-injected on every pass — prep regenerates the packets.
  const cascade = [AGENDA_MARK, ''];
  for (const st of r.json.statements) {
    const line = cleanInline([st.topic ? st.topic + ': ' : '', st.decision, st.quote ? ' — "' + st.quote + '"' : ''].join(''));
    if (line) cascade.push('- ' + line);
  }
  cascade.push('', 'The Mayor has set the agenda. Speak as yourself. Do not stamp ImplementationPhase — that is the gavel.');
  const injected = injectPacketSection(cycle, AGENDA_MARK, cascade, 'civic-office-mayor');
  fs.mkdirSync(CIVIC, { recursive: true });
  fs.writeFileSync(path.join(CIVIC, 'mayor_open_c' + cycle + '.json'), JSON.stringify({
    stage: 'mayor-open', cycle: Number(cycle), model: r.model || model, configuredModel: model,
    fellBackFrom: r.fellBackFrom || null, output: outPath, reused: !!r.reused,
    statements: r.json.statements.length, cascadeInjected: injected,
    attempts: r.attempts, usage: r.usage, ranAt: new Date().toISOString(),
  }, null, 2));
  console.log('\n=== mayor-open complete: ' + r.json.statements.length + ' statement(s) → ' + outPath + '; agenda into ' + injected + ' packet(s) ===');
}

// civic.24 hearing: 9 districts + invited cabinet, parallel, no tracker phase.
async function runHearing() {
  const cycle = arg('--cycle', null) || detectCycle();
  console.log('Civic HEARING — c' + cycle);
  console.log('===================================');
  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const initiatives = (trackerSnapshot.loadOrRebuild(cycle).initiatives) || [];
  if (!fs.existsSync(path.join(ROOT, 'output', 'civic-voice', 'mayor_open_c' + cycle + '.json'))) {
    throw new Error('no mayor_open_c' + cycle + '.json — run --stage=mayor-open first');
  }
  const dirs = fs.readdirSync(PACKETS)
    .filter(f => f.endsWith('_c' + cycle + '.md'))
    .map(f => f.replace('_pending_decisions_c' + cycle + '.md', ''))
    .filter(d => d !== 'civic-office-mayor' && !LAYER3_DIRS.has(d));
  log('hearing seats with packets: ' + dirs.join(', '));
  let ledger = cityHallLedger.loadOrCreate(cycle, ROOT);
  const roster = loadCouncilRoster(officeMap).map(m => {
    const row = civicSeat.councilSeats(officeMap).find(s => s.district === m.district);
    return Object.assign({}, m, { officeId: row ? row.officeId : ('COUNCIL-' + m.district) });
  });
  const results = [];
  const batchInFlight = batchInFlightSlugs(cycle);
  await Promise.all(dirs.map(async dir => {
    const slug = voiceSlug(dir);
    try {
      const model = officeModel(officeMap, dir);
      const prior = existingVoice(slug, cycle);
      if (prior) {
        const packRef0 = districtPackRef(dir, cycle, officeMap, ROOT);
        results.push({
          dir, slug, model: prior.model, ok: true, output: prior.output,
          statements: prior.json.statements.length, attempts: 0, reused: true,
          seat: civicSeat.resolveOfficeRow(officeMap, dir), voiceJson: prior.json, lever: (packRef0 && packRef0.lever) || '',
        });
        return;
      }
      // civic.39 Task 3: a seat with a live batch in flight is pending, not a
      // synchronous call — no double spend. It lands via batch-collect (tick
      // polls it) or is resubmitted next window.
      if (batchInFlight.has(slug)) {
        results.push({ dir, slug, model, ok: false, pending: true, error: 'batch in flight — lands via --stage=batch-collect or resubmits next window' });
        return;
      }
      const hp = await hearingSeatPrompt(dir, cycle, officeMap, initiatives);
      const r = await callVoice(dir, model, hp.user, 4000, officeMap,
        composeChecks(noPhaseCheck, statementNumberCheck(hp.hay, { district: hp.seat && hp.seat.district, cycle })));
      if (!r || r.error) { results.push({ dir, slug, model, ok: false, error: r ? r.error : 'no result' }); return; }
      if (hearingHasPhase(r.json)) {
        results.push({ dir, slug, model, ok: false, error: 'hearing emitted ImplementationPhase' });
        return;
      }
      const out = writeVoiceJson(slug, cycle, r.json);
      await positionWallRecordCascade(officeMap, dir, r.json, cycle);
      const seat = civicSeat.resolveOfficeRow(officeMap, dir);
      const packRef = districtPackRef(dir, cycle, officeMap, ROOT);
      results.push({
        dir, slug, model, ok: true, output: out,
        statements: r.json.statements.length, attempts: r.attempts,
        seat, voiceJson: r.json, lever: (packRef && packRef.lever) || '',
      });
    } catch (e) { results.push({ dir, slug, ok: false, error: e.message }); }
  }));
  for (const x of results.filter(r => r.ok && r.seat)) {
    ledger = cityHallLedger.appendHearing(ledger, cityHallLedger.hearingRow(x.seat, x.voiceJson, x.output, {
      seatStatus: civicSeat.seatStatus(x.seat, roster),
      lever: x.lever,
    }));
  }
  cityHallLedger.save(ledger, ROOT);
  fs.writeFileSync(path.join(CIVIC, 'hearing_c' + cycle + '.json'), JSON.stringify({
    stage: 'hearing', cycle: Number(cycle), results, ranAt: new Date().toISOString(),
  }, null, 2));
  fs.writeFileSync(path.join(CIVIC, 'voices_c' + cycle + '.json'), JSON.stringify({
    stage: 'hearing', cycle: Number(cycle), results, ranAt: new Date().toISOString(),
  }, null, 2));
  const failed = results.filter(x => !x.ok);
  for (const x of results) console.log('  [' + (x.ok ? '✓' : '✗') + '] ' + x.slug + (x.ok ? ' — ' + x.statements + ' statement(s) (' + x.model + ')' : ' — ' + x.error));
  // civic.39 Task 2 (ruling 2): a failed or missing voice is PENDING, never a
  // halt — the C108 chain died here on two bad seat outputs and the mechanical
  // close sat behind them. Pending seats are resubmitted next window (the
  // Sunday retry re-enters this stage; existingVoice reuses what arrived).
  if (failed.length) {
    console.log('\n[civic] ' + failed.length + ' voice(s) pending this window: ' + failed.map(x => x.slug).join(', ') + ' — the close proceeds on the arrived voices.');
  }
  console.log('\n=== hearing complete: ' + (results.length - failed.length) + '/' + results.length + ' ok' + (failed.length ? ' (' + failed.length + ' pending)' : '') + ' ===');
}

// ---------------------------------------------------------------------------
// civic.39 Task 3 — batch transport for the hearing seats (OpenRouter Batch
// API, 50% off, 24h window). A seat goes by batch only where its model has a
// working :batch endpoint priced at or below standard (builder ruling
// 2026-09-21); every other seat stays on the synchronous callVoice path.
// Measured against the OpenRouter model list 2026-09-22: of the seat models
// in civic-office-map.json, only google/gemini-3.7-flash qualifies
// ($0.375/$1.875 per MTok, exactly half of standard). kimi-k2, llama-3.3-70b,
// deepseek-chat and qwen3-235b have no :batch variant; deepseek-v4-pro's is
// priced ABOVE standard. anthropic/claude-haiku-4.5 is listed at half price
// but its :batch route rejected every submit on 2026-09-21 (research
// 2026-09-21-batch-cost-and-model-variety §3) — it joins BATCH_PROFILES only
// after a live one-request probe passes.
// ---------------------------------------------------------------------------

const BATCH_PROFILES = {
  'google/gemini-3.7-flash': {
    // Reasoning is MANDATORY on this endpoint (2026-09-21 probe: a
    // reasoning:{enabled:false} request failed the whole batch) — send no
    // reasoning field, and keep max_tokens sized for reasoning + answer
    // (measured: ~88% of completion tokens were reasoning on a small JSON).
    reasoning: null,
    minMaxTokens: 1200,
  },
};

const batchEligible = model => Object.prototype.hasOwnProperty.call(BATCH_PROFILES, model);

function batchManifestPath(cycle, root) {
  return path.join(root || ROOT, 'output', 'cron-civic', 'batch_c' + cycle + '_hearing.json');
}
function loadBatchManifest(cycle, root) {
  const m = readJson(batchManifestPath(cycle, root));
  return (m && m.seats) ? m : null;
}
// Slugs with a live batch in flight — runHearing must not double-spend a
// synchronous call on them; they land via batch-collect or are resubmitted.
function batchInFlightSlugs(cycle, root) {
  const m = loadBatchManifest(cycle, root);
  if (!m) return new Set();
  return new Set(Object.keys(m.seats).filter(s => m.seats[s].status === 'submitted'));
}

// The seat's hearing prompt — shared by runHearing (synchronous) and
// batchSubmitHearing (batch). Same packet, same wall inject, same output
// contract: only the transport changes.
async function hearingSeatPrompt(dir, cycle, officeMap, initiatives, opts) {
  opts = opts || {};
  const root = opts.root || ROOT;
  const slug = voiceSlug(dir);
  const packet = fs.readFileSync(path.join(root, 'output', 'cron-civic', 'packets', dir + '_pending_decisions_c' + cycle + '.md'), 'utf8');
  const wallInj = await (opts.wallInject || positionWallInject)(officeMap, dir);
  const user = [
    'YOUR PENDING DECISIONS PACKET (cycle ' + cycle + ') — the Mayor\'s AGENDA is in the packet; react as yourself.',
    '', packet, wallInj || '',
    'Do NOT emit trackerUpdates.ImplementationPhase. That is the Mayor\'s gavel after you speak.',
    outputContract(slug, cycle, initiatives, { forbidPhase: true }),
  ].join('\n');
  return {
    dir, slug, model: officeModel(officeMap, dir), user,
    hay: packet + '\n' + (wallInj || ''),
    seat: civicSeat.resolveOfficeRow(officeMap, dir),
  };
}

// --stage=batch-submit — one batch per batch-eligible model among the hearing
// seats still missing a voice. custom_id = c<cycle>-<slug>-a<attempt> (unique
// by construction). Seats already submitted, already landed, or on a
// non-batching model are skipped; seats previously rejected/expired are
// resubmitted with attempt+1 — never inline.
async function batchSubmitHearing(cycle, opts) {
  opts = opts || {};
  const root = opts.root || ROOT;
  const client = opts.client || require('./orBatch');
  const officeMap = opts.officeMap || mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const initiatives = opts.initiatives || (trackerSnapshot.loadOrRebuild(cycle).initiatives || []);
  if (!fs.existsSync(path.join(root, 'output', 'civic-voice', 'mayor_open_c' + cycle + '.json'))) {
    throw new Error('no mayor_open_c' + cycle + '.json — run --stage=mayor-open first');
  }
  const packetsDir = path.join(root, 'output', 'cron-civic', 'packets');
  const dirs = !fs.existsSync(packetsDir) ? [] : fs.readdirSync(packetsDir)
    .filter(f => f.endsWith('_c' + cycle + '.md'))
    .map(f => f.replace('_pending_decisions_c' + cycle + '.md', ''))
    .filter(d => d !== 'civic-office-mayor' && !LAYER3_DIRS.has(d));
  const manifest = loadBatchManifest(cycle, root)
    || { version: 1, stage: 'hearing', cycle: Number(cycle), batches: [], seats: {} };

  const byModel = new Map(); // one batch = one model (measured: mixed-model submit is rejected)
  const skipped = [];
  for (const dir of dirs) {
    const slug = voiceSlug(dir);
    const model = officeModel(officeMap, dir);
    if (!batchEligible(model)) { skipped.push(slug + ' (sync model ' + model + ')'); continue; }
    if (fs.existsSync(path.join(root, 'output', 'civic-voice', slug + '_c' + cycle + '.json'))) { skipped.push(slug + ' (voice landed)'); continue; }
    const prev = manifest.seats[slug];
    if (prev && prev.status === 'submitted') { skipped.push(slug + ' (batch in flight ' + prev.batchId + ')'); continue; }
    const attempt = ((prev && prev.attempt) || 0) + 1;
    const hp = await hearingSeatPrompt(dir, cycle, officeMap, initiatives, opts);
    const persona = (opts.personaFor || readPersonaDir)(dir);
    const profile = BATCH_PROFILES[model];
    const body = {
      messages: [{ role: 'system', content: persona }, { role: 'user', content: hp.user }],
      max_tokens: Math.max(4000, profile.minMaxTokens || 0),
    };
    if (profile.reasoning) body.reasoning = profile.reasoning;
    const customId = 'c' + cycle + '-' + slug + '-a' + attempt;
    if (!byModel.has(model)) byModel.set(model, []);
    byModel.get(model).push({ dir, slug, attempt, customId, body });
  }

  const submitted = [], failures = [];
  for (const [model, seats] of byModel) {
    try {
      const res = await client.submitBatch(model, seats.map(s => ({ custom_id: s.customId, body: s.body })),
        { label: 'civic-hearing-c' + cycle, extra: { stage: 'hearing', cycle: Number(cycle) } });
      manifest.batches.push({ id: res.id, model, customIds: seats.map(s => s.customId), submittedAt: new Date().toISOString() });
      for (const s of seats) {
        manifest.seats[s.slug] = { dir: s.dir, customId: s.customId, batchId: res.id, model, attempt: s.attempt, status: 'submitted', updated: new Date().toISOString() };
        submitted.push(s.slug);
      }
      log('batch submitted: ' + res.id + ' (' + model + ', ' + seats.length + ' seat(s): ' + seats.map(s => s.slug).join(', ') + ')');
    } catch (e) {
      // Whole-batch submit failure (validation, balance, a dead :batch route):
      // these seats keep no voice file, so runHearing picks them up
      // synchronously — the batch path defers, it never blocks the week.
      for (const s of seats) {
        manifest.seats[s.slug] = { dir: s.dir, customId: s.customId, batchId: null, model, attempt: s.attempt, status: 'submit-failed', error: e.message, updated: new Date().toISOString() };
      }
      failures.push(model + ': ' + e.message);
      console.error('[civic] batch submit failed for ' + model + ' — its seat(s) stay on the sync path: ' + e.message);
    }
  }
  fs.mkdirSync(path.dirname(batchManifestPath(cycle, root)), { recursive: true });
  fs.writeFileSync(batchManifestPath(cycle, root), JSON.stringify(manifest, null, 2) + '\n');
  return { submitted, failed: failures, skipped, manifest };
}

// --stage=batch-collect — polls submitted batches (GET only, no model spend),
// matches results by custom_id (order is not preserved), runs the SAME
// validation + grounding runHearing runs, and lands passing seats as ordinary
// voice JSONs (existingVoice reuses them from then on). Invalid, errored,
// truncated or expired seats are marked rejected and wait for the next submit
// window — collect never retries inline.
async function batchCollectHearing(cycle, opts) {
  opts = opts || {};
  const root = opts.root || ROOT;
  const client = opts.client || require('./orBatch');
  const officeMap = opts.officeMap || mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const initiatives = opts.initiatives || (trackerSnapshot.loadOrRebuild(cycle).initiatives || []);
  const manifest = loadBatchManifest(cycle, root);
  if (!manifest) return { collected: [], rejected: [], pending: [], expired: [], note: 'no batch manifest for c' + cycle };

  const byBatch = new Map();
  for (const [slug, s] of Object.entries(manifest.seats)) {
    if (s.status !== 'submitted') continue;
    if (!byBatch.has(s.batchId)) byBatch.set(s.batchId, []);
    byBatch.get(s.batchId).push(slug);
  }
  const collected = [], rejected = [], pending = [], expired = [];
  for (const [batchId, slugs] of byBatch) {
    const b = await client.getBatch(batchId);
    if (b.status !== 'completed') {
      if (b.status === 'failed' || b.status === 'expired' || b.status === 'cancelled') {
        for (const slug of slugs) {
          manifest.seats[slug].status = b.status;
          manifest.seats[slug].error = 'batch ' + b.status;
          manifest.seats[slug].updated = new Date().toISOString();
          expired.push(slug);
        }
      } else {
        pending.push.apply(pending, slugs); // validating / in_progress / finalizing
      }
      continue;
    }
    const results = b.results || [];
    for (const slug of slugs) {
      const seat = manifest.seats[slug];
      const fail = why => {
        seat.status = 'rejected'; seat.error = why; seat.updated = new Date().toISOString();
        rejected.push(slug);
      };
      // Per-seat isolation, matching runHearing's per-dir try/catch: one bad
      // seat (a missing packet, a read failure) must reject that seat only,
      // not abort the sibling seats in the same batch or skip the manifest
      // write below (found in adversarial review of 9e076842, Finding 3).
      try {
        const r = results.find(x => x && x.custom_id === seat.customId);
        if (!r) { fail('no result for ' + seat.customId + ' in batch ' + batchId); continue; }
        const ex = orBatch.resultText(r);
        if (ex.error) { fail(ex.error); continue; }
        const hp = await hearingSeatPrompt(seat.dir, cycle, officeMap, initiatives, opts);
        const v = validateVoiceJson(ex.text);
        if (v.ok) {
          const why = composeChecks(noPhaseCheck,
            statementNumberCheck(hp.hay, { district: hp.seat && hp.seat.district, cycle }))(v.json);
          if (why) { v.ok = false; v.why = why; }
        }
        if (!v.ok) { fail(v.why); continue; }
        const voicePath = path.join(root, 'output', 'civic-voice', slug + '_c' + cycle + '.json');
        fs.mkdirSync(path.dirname(voicePath), { recursive: true });
        fs.writeFileSync(voicePath, JSON.stringify(v.json, null, 2));
        seat.status = 'collected'; seat.usage = ex.usage || null; seat.error = null; seat.updated = new Date().toISOString();
        collected.push(slug);
        await (opts.wallRecord || positionWallRecordCascade)(officeMap, seat.dir, v.json, cycle);

        // Heal the seat back into the synchronous hearing stage's own records.
        // runHearing already wrote hearing_c/voices_c with ok:false,pending:true
        // for this seat (it went by batch, not synchronously) and never
        // appended it to cityHallLedger. Without this, the seat's voice sits
        // on disk but stays permanently invisible to runMayorGavel's
        // `.filter(r => r.ok)`, runClose's arrived/pending split, and
        // refreshWeekState's hearingPending — the seat is silenced from the
        // gavel transcript and the ledger forever (adversarial review of
        // 9e076842, Finding 2).
        const seatRow = civicSeat.resolveOfficeRow(officeMap, seat.dir);
        const packRef = districtPackRef(seat.dir, cycle, officeMap, root);
        if (seatRow) {
          let ledger = cityHallLedger.loadOrCreate(cycle, root);
          ledger = cityHallLedger.appendHearing(ledger, cityHallLedger.hearingRow(seatRow, v.json, voicePath, {
            seatStatus: civicSeat.seatStatus(seatRow),
            lever: (packRef && packRef.lever) || '',
          }));
          cityHallLedger.save(ledger, root);
        }
        for (const manName of ['hearing_c' + cycle + '.json', 'voices_c' + cycle + '.json']) {
          const manPath = path.join(root, 'output', 'cron-civic', manName);
          const man = readJson(manPath);
          if (man && Array.isArray(man.results)) {
            const idx = man.results.findIndex(x => x.slug === slug);
            const entry = {
              dir: seat.dir, slug, model: seat.model, ok: true, output: voicePath,
              statements: v.json.statements.length, attempts: seat.attempt || 0,
              seat: seatRow, voiceJson: v.json, lever: (packRef && packRef.lever) || '',
            };
            if (idx >= 0) man.results[idx] = entry; else man.results.push(entry);
            fs.writeFileSync(manPath, JSON.stringify(man, null, 2) + '\n');
          }
        }
        log('collected ' + slug + ' (' + seat.model + ', batch ' + batchId + ', attempt ' + seat.attempt + ')');
      } catch (e) {
        fail('collect threw: ' + e.message);
      }
    }
  }
  fs.writeFileSync(batchManifestPath(cycle, root), JSON.stringify(manifest, null, 2) + '\n');
  return { collected, rejected, pending, expired, manifest };
}

async function runBatchSubmit() {
  const cycle = arg('--cycle', null) || detectCycle();
  console.log('Civic BATCH-SUBMIT — c' + cycle);
  console.log('===================================');
  const r = await batchSubmitHearing(cycle, {});
  console.log('submitted: ' + (r.submitted.join(', ') || 'none'));
  if (r.skipped.length) console.log('skipped: ' + r.skipped.join(', '));
  if (r.failed.length) { console.error('submit failure(s): ' + r.failed.join(' | ')); process.exit(1); }
}

async function runBatchCollect() {
  const cycle = arg('--cycle', null) || detectCycle();
  console.log('Civic BATCH-COLLECT — c' + cycle);
  console.log('===================================');
  const r = await batchCollectHearing(cycle, {});
  console.log('collected: ' + r.collected.length + ', rejected: ' + r.rejected.length +
    ', in flight: ' + r.pending.length + ', expired/failed: ' + r.expired.length);
  if (r.rejected.length) console.log('rejected (resubmitted next window): ' + r.rejected.join(', '));
}

async function runMayorGavel() {
  const cycle = arg('--cycle', null) || detectCycle();
  console.log('Civic MAYOR-GAVEL — c' + cycle);
  console.log('===================================');
  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const initiatives = (trackerSnapshot.loadOrRebuild(cycle).initiatives) || [];
  if (!fs.existsSync(path.join(ROOT, 'output', 'civic-voice', 'mayor_open_c' + cycle + '.json'))) {
    throw new Error('no mayor_open_c' + cycle + '.json — run --stage=mayor-open first');
  }
  const hearingMan = readJson(path.join(CIVIC, 'hearing_c' + cycle + '.json'));
  if (!hearingMan) throw new Error('no hearing_c' + cycle + '.json — run --stage=hearing first');
  const packet = mustRead(packetPathFor('civic-office-mayor', cycle), 'mayor packet');
  const transcript = [];
  for (const x of (hearingMan.results || []).filter(r => r.ok)) {
    const j = readJson(path.join(ROOT, 'output', 'civic-voice', x.slug + '_c' + cycle + '.json'));
    const st = ((j && j.statements) || [])[0] || {};
    const line = cleanInline((x.slug || '') + ': ' + (st.decision || st.quote || ''));
    if (line) transcript.push('- ' + line);
  }
  const wallInj = await positionWallInject(officeMap, 'civic-office-mayor');
  const model = mayorModel(officeMap);
  const user = [
    'YOUR PENDING DECISIONS PACKET (cycle ' + cycle + '):',
    '', packet, wallInj || '',
    'THE HEARING HAS SPOKEN. These are the nine districts and invited cabinet, as themselves:',
    transcript.join('\n') || '(no hearing lines)',
    '',
    'This is the GAVEL. You may now stamp trackerUpdates (ImplementationPhase / MayoralAction) for initiatives that moved. Hearing voices do not stamp.',
    outputContract('mayor_gavel', cycle, initiatives),
  ].join('\n');
  // Transcript is included in hay — a hearing figure was already checked when
  // spoken, so the gavel citing it back is legitimate, not a new fabrication.
  const gavelHay = packet + '\n' + (wallInj || '') + '\n' + transcript.join('\n');
  let r = existingVoice('mayor_gavel', cycle);
  let outPath = r ? r.output : null;
  if (!r) {
    r = await callVoice('civic-office-mayor', model, user, 5000, officeMap,
      statementNumberCheck(gavelHay, { cycle }));
    if (!r || r.error) {
      console.error('HALT: Mayor gavel failed — ' + (r ? r.error : 'no result'));
      if (r && r.raw) fs.writeFileSync(path.join(CIVIC, 'mayor_gavel_c' + cycle + '.raw.txt'), r.raw);
      process.exit(1);
    }
    outPath = writeVoiceJson('mayor_gavel', cycle, r.json);
    await positionWallRecordCascade(officeMap, 'civic-office-mayor', r.json, cycle);
  }
  const mayorRow = civicSeat.resolveOfficeRow(officeMap, 'civic-office-mayor');
  let ledger = cityHallLedger.loadOrCreate(cycle, ROOT);
  ledger = cityHallLedger.writeGavel(ledger, mayorRow || { officeId: 'MAYOR-01', holder: 'Avery Santana', popid: 'POP-00034' }, r.json, outPath, cityHallLedger.gavelPhases(r.json));
  cityHallLedger.save(ledger, ROOT);
  fs.writeFileSync(path.join(CIVIC, 'mayor_gavel_c' + cycle + '.json'), JSON.stringify({
    stage: 'mayor-gavel', cycle: Number(cycle), model, output: outPath, reused: !!r.reused,
    statements: r.json.statements.length, attempts: r.attempts, usage: r.usage,
    ranAt: new Date().toISOString(),
  }, null, 2));
  console.log('\n=== mayor-gavel complete: ' + r.json.statements.length + ' statement(s) → ' + outPath + ' ===');
}

// --- stage: projects (Layer 3 — only where a decision touched their initiative) ---
async function runProjects() {
  const cycle = arg('--cycle', null) || detectCycle();
  console.log('Civic PROJECTS (Layer 3) — c' + cycle);
  console.log('===================================');
  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const tracker = trackerSnapshot.loadOrRebuild(cycle);
  const voiceJsons = loadVoiceJsons(cycle);
  if (!voiceJsons.mayor_gavel && !voiceJsons.mayor) throw new Error('no mayor_gavel_c' + cycle + '.json — run --stage=mayor-gavel first');
  const layer12 = Object.fromEntries(Object.entries(voiceJsons).filter(([s]) => !['baylight_authority', 'stabilization_fund', 'oari', 'health_center', 'transit_hub'].includes(s)));

  const results = [];
  for (const seat of projectSeats(officeMap)) {
    const slug = voiceSlug(seat.agentDir);
    const touches = statementsTouching(layer12, seat.initiative, tracker);
    if (!touches.length) { log('skip ' + slug + ' — no voice decision touched ' + seat.initiative + ' (Step 5 trigger rule)'); continue; }
    try {
      const model = officeModel(officeMap, seat.agentDir);
      const prior = existingVoice(slug, cycle);
      if (prior) {
        results.push({ slug, model: prior.model, ok: true, output: prior.output, statements: prior.json.statements.length, reused: true, triggeredBy: touches.map(t => t.slug) });
        continue;
      }
      // civic.29: a Layer-3 seat only gets a packet file when its OWN
      // initiative is independently hot this cycle — Baylight Authority
      // speaks here via the Step 5 trigger (the mayor touched her initiative)
      // even on a quiet week for her own desk, so `packet` is empty and she
      // had no legal way to cite her own project's own budget (her real
      // C104 turn cited "$2.1B" with nothing in hay grounding it).
      const packet = fs.existsSync(packetPathFor(seat.agentDir, cycle)) ? fs.readFileSync(packetPathFor(seat.agentDir, cycle), 'utf8') : '';
      const ownInit = (tracker.initiatives || []).find(i => (i.id || i.InitiativeID) === seat.initiative);
      const identity = ownInit && ownInit.budget ? 'What you run: ' + ownInit.name + ' — Budget: ' + ownInit.budget + '.' : '';
      const frame = touches.map(t => '- [' + t.slug + '] ' + (t.st.decision || '') + (t.st.quote ? ' — "' + t.st.quote + '"' : '')).join('\n');
      const wallInj = await positionWallInject(officeMap, seat.agentDir);
      const user = [
        identity,
        'Here is what city hall decided this cycle (the political frame is LOCKED — you do not override it, stall it, or create political conflict):',
        '', frame, '',
        packet ? 'YOUR OWN DESK (from prep):\n\n' + packet + '\n' : '',
        wallInj,
        'Your job: describe what happens next operationally on your initiative.',
        '- What does this look like on the ground?',
        '- What details emerge from implementation?',
        '- What would a reporter see if they visited?',
        'You may invent operational details — names of facilities, timelines, specifics — but never citizens, statistics, or votes beyond your material.',
        outputContract(slug, cycle, tracker.initiatives || []),
      ].join('\n');
      const projectHay = identity + '\n' + frame + '\n' + packet + '\n' + (wallInj || '');
      const r = await callVoice(seat.agentDir, model, user, 4000, officeMap,
        statementNumberCheck(projectHay, { cycle }));
      if (!r || r.error) { results.push({ slug, model, ok: false, error: r ? r.error : 'no result' }); continue; }
      const out = writeVoiceJson(slug, cycle, r.json);
      await positionWallRecordCascade(officeMap, seat.agentDir, r.json, cycle);
      results.push({ slug, model, ok: true, output: out, statements: r.json.statements.length, triggeredBy: touches.map(t => t.slug) });
    } catch (e) { results.push({ slug, ok: false, error: e.message }); }
  }
  fs.writeFileSync(path.join(CIVIC, 'projects_c' + cycle + '.json'), JSON.stringify({
    stage: 'projects', cycle: Number(cycle), results, ranAt: new Date().toISOString(),
  }, null, 2));
  const failed = results.filter(x => !x.ok);
  for (const x of results) console.log('  [' + (x.ok ? '✓' : '✗') + '] ' + x.slug + (x.ok ? ' — ' + x.statements + ' statement(s), triggered by ' + x.triggeredBy.join('/') : ' — ' + x.error));
  // civic.39 Task 2 (ruling 2): pending, never a halt — same rule as the hearing.
  if (failed.length) console.log('\n[civic] ' + failed.length + ' project seat(s) pending this window: ' + failed.map(x => x.slug).join(', '));
  console.log('\n=== projects complete: ' + results.length + ' ran ===');
}

// --- stage: close (clerk verdict -> deterministic close -> gate -> [apply] -> log) ---
async function runClose() {
  const cycle = arg('--cycle', null) || detectCycle();
  const APPLY = process.argv.includes('--apply');
  console.log('Civic CLOSE — c' + cycle + (APPLY ? ' (APPLY)' : ' (dry — decisions staged, no sheet write)'));
  console.log('===================================');
  const state = refreshWeekState(loadWeekState(cycle));
  const voiceJsons = loadVoiceJsons(cycle);

  // civic.39 Task 2, ruling 2: missing voices are PENDING, never a halt (the
  // C108 failure). Only voices that arrived flow into the fold; a missing seat
  // is listed in the run record and resubmitted next window (the Sunday retry
  // re-enters the voice stages; existingVoice reuses whatever landed).
  const expected = ['mayor_gavel'];
  const vMan = readJson(path.join(CIVIC, 'hearing_c' + cycle + '.json')) || readJson(path.join(CIVIC, 'voices_c' + cycle + '.json'));
  const pMan = readJson(path.join(CIVIC, 'projects_c' + cycle + '.json'));
  if (!vMan && !pMan) log('no hearing/projects manifests — closing on the arrived voice files + the move ledger only');
  const seatResults = [...(vMan ? vMan.results || [] : []), ...(pMan ? pMan.results || [] : [])];
  const pendingVoices = seatResults.filter(x => !x.ok || !voiceJsons[x.slug]).map(x => x.slug);
  if (!voiceJsons.mayor_gavel && (vMan || pMan)) pendingVoices.unshift('mayor_gavel');
  const arrived = expected.concat(seatResults.filter(x => x.ok).map(x => x.slug)).filter(s => voiceJsons[s]);
  if (pendingVoices.length) log('pending voices (resubmit next window): ' + pendingVoices.join(', '));
  log('completeness: ' + arrived.length + ' voice JSON(s) arrived' + (pendingVoices.length ? ', ' + pendingVoices.length + ' pending' : '') + ' (' + arrived.join(', ') + ')');

  // Clerk — a deferred verdict stage (civic.39 ruling 3): an unreachable or
  // unparseable clerk is DEFERRED (retried next window; the apply holds until
  // the 6h verdict cutoff), never treated as a FAIL. Only overall === 'fail'
  // blocks. Check 1 (every office produced statements) is a report line now —
  // a missing voice is pending, not a failed check.
  const clerkModel = arg('--clerk-model', 'deepseek/deepseek-chat');
  const clerkPersona = readPersonaDir('city-clerk');
  // civic.38 Task 2 step 4 — the clerk sees this week's candidate proposals
  // (pending `propose` moves off the move ledger) alongside the voice outputs.
  const foldedMoves = loadMoveLedgerFolded(ROOT, cycle);
  const clerkCandidates = foldedMoves
    ? [...foldedMoves.values()].filter(m => m.status === 'pending' && m.type === 'propose')
    : [];
  let clerk;
  if (!arrived.length) {
    clerk = { overall: 'skipped-empty', issues: [], missingVoices: pendingVoices, note: 'no voice outputs arrived this cycle — nothing to verify' };
  } else {
    const clerkUser = [
      'Cycle ' + cycle + ' civic outputs for verification. For each check answer pass/fail with one line of evidence.',
      'Checks: (1) no single office contradicts ITSELF within its own statements; (2) tracker updates use only contract phases; (3) statements read as in-world civic voice (no engine/system language).',
      'Voice completeness is NOT a check: seats whose voice JSON never arrived are PENDING (listed below) and will be resubmitted next window — report them under "missingVoices", never as a failed check.',
      'Cross-office disagreement (two offices naming different figures or phases) is EXPECTED POLITICS, not a failure — list any you see under "observations", never under failed checks; the apply gate separately audits the final write-set.',
      '',
      'Pending (missing) seats this cycle: ' + (pendingVoices.join(', ') || 'none'),
      '',
      ...arrived.map(s => {
        const j = voiceJsons[s];
        return '## ' + s + '\n' + (j.statements || []).map(st => '- ' + (st.decision || '') + ' | trackerUpdates: ' + JSON.stringify(st.trackerUpdates || {})).join('\n');
      }),
      '',
      '## Candidate initiatives proposed by council seats this week (' + clerkCandidates.length + ')',
      ...(clerkCandidates.length
        ? clerkCandidates.map(m => '- ' + m.moveId + ' (' + m.agentDir + '): "' + ((m.payload || {}).title || '') + '" — ' + String((m.payload || {}).problem || '').slice(0, 200) + ' | hoods: ' + (((m.payload || {}).hoods) || []).join(', ') + ' | intervention: ' + ((m.payload || {}).intervention || '?'))
        : ['(none — no pending propose moves on the ledger)']),
      '',
      'Respond with ONLY JSON: {"cycle": ' + cycle + ', "checks": [{"check": "<name>", "pass": true|false, "evidence": "<one line>"}], "overall": "pass"|"fail", "issues": ["..."], "missingVoices": ["..."]}',
    ].join('\n');
    try {
      const cr = await callOpenRouter(clerkModel, clerkPersona, clerkUser, 3000);
      clerk = JSON.parse(stripFences(cr.text));
    } catch (e) {
      clerk = { overall: 'deferred', issues: ['clerk call/parse failed (deferred — retried next window, never a FAIL): ' + e.message] };
    }
  }
  const clerkDir = path.join(ROOT, 'output', 'city-civic-database');
  fs.mkdirSync(clerkDir, { recursive: true });
  fs.writeFileSync(path.join(clerkDir, 'clerk_audit_c' + cycle + '.json'), JSON.stringify(clerk, null, 2));
  log('clerk: ' + (clerk.overall || 'unknown') + ((clerk.issues || []).length ? ' — ' + clerk.issues.join('; ').slice(0, 300) : ''));

  // Deterministic half (assemble → milestone-note normalize → Sunday fold →
  // petition sweep → tracker dry-run). No model calls — `tick` runs the same
  // path. A failure here is a REAL block: these are the checks that cannot be
  // wrong about the sheet (civic.39 ruling 1).
  const det = closeDeterministic(cycle);
  if (!det.ok) {
    console.error('BLOCKED: deterministic close failed: ' + det.error);
    fs.writeFileSync(path.join(CIVIC, 'close_c' + cycle + '.json'), JSON.stringify({
      stage: 'close', cycle: Number(cycle), arrived, pendingVoices,
      clerk: clerk.overall || 'unknown', clerkModel,
      error: 'deterministic close failed: ' + det.error,
      gatePass: false, applied: false, ranAt: new Date().toISOString(),
    }, null, 2));
    refreshWeekState(state); state._dirty = true; saveWeekState(state);
    process.exit(1);
  }

  // Mechanical gate (Task 2.4 + civic.39 ruling 3): deterministic prechecks
  // are the block; the model sanity-read is a deferred verdict — an
  // unreachable sanity model never blocks, a real FAIL verdict always does.
  const gate = runGate(cycle, { sanity: true });
  const gatePass = gate.deterministicPass;
  if (!gatePass) console.error('[civic] gate deterministic checks BLOCKED (exit ' + gate.exitCode + ') — decisions remain staged, no sheet write.');

  // The apply decision (civic.39 rulings 1+3+4): deterministic checks must
  // pass, no verdict may be a FAIL, and either both verdicts are in or the
  // 6h-after-engine-fire cutoff has expired (flagged, never silent).
  const decision = decideApply({
    dryOk: det.dryOk, deterministicPass: gate.deterministicPass,
    clerkStatus: clerk.overall || 'unknown', sanityStatus: gate.sanityStatus,
    firedAt: state.engineFiredAt,
  });
  let applied = false;
  if (decision.apply && APPLY) {
    applied = maybeApply(cycle, decision, APPLY, 'close');
  } else if (APPLY && !decision.apply) {
    console.error('[civic] --apply requested but ' + decision.reason +
      (decision.waitingOn ? ' (waiting on: ' + decision.waitingOn.join(', ') + ')' : '') + ' — NOT applying.');
  }

  // Production log: ## /city-hall section (idempotent replace) + media handoff.
  const plog = path.join(ROOT, 'output', 'production_log_c' + cycle + '.md');
  const rows = arrived.map(s => {
    const j = voiceJsons[s];
    const st = (j.statements || [])[0] || {};
    return '| ' + (j.speaker || s) + ' | ' + cleanInline(st.decision || '—') + ' | "' + cleanInline(st.quote || '') + '" |';
  });
  const trackerRows = [];
  for (const s of arrived) {
    for (const st of (voiceJsons[s].statements || [])) {
      for (const [name, u] of Object.entries(st.trackerUpdates || {})) {
        if (u && u.ImplementationPhase) trackerRows.push('| ' + name + ' | ' + u.ImplementationPhase + ' | ' + cleanInline(u.MilestoneNotes || '') + ' |');
      }
    }
  }
  const section = [
    '', '## /city-hall (AUTO — cron-civic-run.js)',
    '**Cycle:** ' + cycle,
    '**Mode:** ' + (applied ? 'APPLIED to tracker' : 'DRY — decisions staged, tracker untouched'),
    '**Clerk:** ' + (clerk.overall || 'unknown') + ' | **Gate (deterministic):** ' + (gatePass ? 'pass' : 'BLOCKED') + ' | **Sanity-read:** ' + gate.sanityStatus + (pendingVoices.length ? ' | **Pending voices:** ' + pendingVoices.join(', ') : ''),
    '', '### Voice Decisions', '| Voice | Decision | Key Quote |', '|---|---|---|', ...rows,
    '', '### Tracker Updates ' + (applied ? '(applied)' : '(staged)'), '| Initiative | Phase | Milestone |', '|---|---|---|',
    ...(trackerRows.length ? trackerRows : ['| — | — | no phase moves this cycle |']),
    '', '### Media Handoff',
    'City hall ran headless this cycle. The voice decisions above are locked canon; project operational details live in output/civic-voice/*_c' + cycle + '.json. Desks report FROM this section.',
    '',
  ].join('\n');
  const M2 = '## /city-hall (AUTO — cron-civic-run.js)';
  const kept2 = [];
  let drop2 = false;
  if (!fs.existsSync(plog)) fs.writeFileSync(plog, '# Production Log — Cycle ' + cycle + '\n');
  for (const line of fs.readFileSync(plog, 'utf8').split('\n')) {
    if (line.trim() === M2) { drop2 = true; continue; }
    if (drop2 && /^## /.test(line)) drop2 = false;
    if (!drop2) kept2.push(line);
  }
  fs.writeFileSync(plog, kept2.join('\n').replace(/\n+$/, '\n') + section);

  // Gap-log leg (gapLogGate contract) — headless runs still file the leg.
  const gapLog = path.join(ROOT, 'output', 'production_log_run_cycle_c' + cycle + '_gaps.md');
  const LEG = '## LEG: /city-hall (G-R)';
  const gapBody = fs.existsSync(gapLog) ? fs.readFileSync(gapLog, 'utf8') : '# Cycle ' + cycle + ' gap log\n';
  if (!gapBody.includes(LEG)) {
    const legLines = [LEG, ''];
    if (!gatePass) legLines.push('- G-R (AUTO): apply gate deterministic checks failed — see output/cron-civic/gate_c' + cycle + '.json');
    if (gate.sanityStatus === 'fail') legLines.push('- G-R (AUTO): sanity-read verdict FAIL — see output/cron-civic/gate_c' + cycle + '.json');
    if (clerk.overall === 'fail') legLines.push('- G-R (AUTO): clerk verdict fail — see clerk_audit_c' + cycle + '.json');
    if (applied && decision.via === 'cutoff') legLines.push('- G-R (AUTO): applied under the 6h verdict cutoff — missing verdicts: ' + (decision.missingVerdicts || []).join(', '));
    if (pendingVoices.length) legLines.push('- G-R (AUTO): ' + pendingVoices.length + ' voice(s) pending this window: ' + pendingVoices.join(', '));
    if (legLines.length === 2) legLines.push('No gaps this run.');
    fs.writeFileSync(gapLog, gapBody.replace(/\n+$/, '\n') + '\n' + legLines.join('\n') + '\n');
  }

  // Media handoff, lane half (S344, Mike's "how will the media know" probe):
  // desk_signal_c{XX}.json is built by buildWorldSummary BEFORE city hall runs,
  // so Sunday's decisions never land in it. Write them as lane-shaped entries;
  // cron-desk-run loadLane merges this file into the civic desk lane all week.
  const laneMap = readJson(path.join(ROOT, 'scripts', 'civic-office-map.json')) || { offices: [] };
  const popidBySlug = {};
  for (const o of [...(laneMap.offices || []), ...(laneMap.projects || [])]) {
    if (o.agentDir) popidBySlug[voiceSlug(o.agentDir)] = popidBySlug[voiceSlug(o.agentDir)] || o.popid;
  }
  const laneEntries = [];
  for (const s of arrived) {
    for (const st of (voiceJsons[s].statements || [])) {
      const label = cleanInline((voiceJsons[s].speaker || s) + ' (' + s.replace(/_/g, ' ') + '): ' + (st.decision || st.topic || '') + (st.quote ? ' — "' + st.quote + '"' : ''));
      if (label) laneEntries.push({
        label: label.slice(0, 220), kind: 'civic-decision',
        ref: 'output/civic-voice/' + s + '_c' + cycle + '.json',
        popids: popidBySlug[s] ? [popidBySlug[s]] : [],
      });
    }
  }
  fs.writeFileSync(path.join(CIVIC, 'decisions_lane_c' + cycle + '.json'), JSON.stringify({ cycle: Number(cycle), entries: laneEntries, builtAt: new Date().toISOString() }, null, 2));
  log('media lane handoff: ' + laneEntries.length + ' civic-decision entries → decisions_lane_c' + cycle + '.json');

  fs.writeFileSync(path.join(CIVIC, 'close_c' + cycle + '.json'), JSON.stringify({
    stage: 'close', cycle: Number(cycle), expected: arrived, pendingVoices,
    clerk: clerk.overall || 'unknown', clerkModel,
    gatePass, deterministicPass: gate.deterministicPass, sanityStatus: gate.sanityStatus,
    applyDecision: { apply: decision.apply, via: decision.via || null, reason: decision.reason || null, missingVerdicts: decision.missingVerdicts || [] },
    applied, laneEntries: laneEntries.length, ranAt: new Date().toISOString(),
  }, null, 2));
  refreshWeekState(state); state._dirty = true; saveWeekState(state);
  console.log('\n=== close complete: clerk=' + (clerk.overall || 'unknown') + ' gate(det)=' + (gatePass ? 'PASS' : 'BLOCKED') + ' sanity=' + gate.sanityStatus + ' applied=' + applied + (pendingVoices.length ? ' pending=' + pendingVoices.length : '') + ' ===');
  // Blocked = a REAL failure (deterministic checks or a FAIL verdict). A
  // deferred verdict is the week WAITING, not failing — exit 0 so the cron row
  // stays quiet and the next window (chain retry / tick) re-enters.
  if (decision.blocked) process.exit(1);
}

// ---------------------------------------------------------------------------
// Task 3.1/3.2 — Mon-Thu datawakes: office-holders voice their city-data domain
// ---------------------------------------------------------------------------

const DATAWAKE_DIR = path.join(CIVIC, 'datawake');

// A bloc agent's datawake speaks through the bloc SPOKESPERSON (civic.md
// faction table: OPP=Rivers D5, CRC=Ashford D7; IND datawakes go to Vega D4 as
// Council President), not whichever member row happens to sort first.
const BLOC_SPOKESPERSON_DISTRICT = {
  'civic-office-opp-faction': 'D5',
  'civic-office-crc-faction': 'D7',
  'civic-office-ind-swing': 'D4',
};

// LRU rota: least-recently-woken duty seats first (scan existing datawake files).
// civic.38 Task 9 step 1: the datawake is the POLITICAL turn — elected seats
// (9 council + mayor) plus the police chief (standing builder ruling,
// civic.37). Project directors, DA, Okoro and Baylight move off this rota;
// the directors' operational read is a work-wake pack (Task 9 step 2).
const DATAWAKE_SEAT = /^(MAYOR-01|COUNCIL-D\d|CHIEF-POLICE)$/;
function datawakeRota(officeMap, limit) {
  const seats = [];
  const byDir = {};
  for (const o of [...officeMap.offices, ...(officeMap.projects || [])]) {
    if (!o.agentDir) continue;
    if (!DATAWAKE_SEAT.test(String(o.officeId || o.projectId || ''))) continue;
    (byDir[o.agentDir] = byDir[o.agentDir] || []).push(o);
  }
  for (const [dir, rows] of Object.entries(byDir)) {
    const wantDistrict = BLOC_SPOKESPERSON_DISTRICT[dir];
    seats.push(wantDistrict ? (rows.find(r => r.district === wantDistrict) || rows[0]) : rows[0]);
  }
  // civic.29: datawake_<date>.results.json is written every run regardless of
  // per-office outcome (unlike the success-only files in DATAWAKE_DIR). A seat
  // that keeps failing its grounding gate never wrote a success file, so its
  // lastWake stayed empty and it looked permanently overdue — winning every
  // rota slot and starving healthy seats for weeks (mayor fabrication chase,
  // 2026-08-31). Scanning attempts, not just successes, gives failing seats
  // their turn and then moves on like everyone else.
  const lastWake = {};
  const bump = (dir, date) => { if (date && (lastWake[dir] || '') < date) lastWake[dir] = date; };
  if (fs.existsSync(DATAWAKE_DIR)) {
    for (const f of fs.readdirSync(DATAWAKE_DIR)) {
      const m = f.match(/^(.+)_(\d{4}-\d{2}-\d{2})\.json$/);
      if (m) bump(m[1], m[2]);
    }
  }
  if (fs.existsSync(CIVIC)) {
    for (const f of fs.readdirSync(CIVIC)) {
      const m = f.match(/^datawake_(\d{4}-\d{2}-\d{2})\.results\.json$/);
      if (!m) continue;
      const rec = readJson(path.join(CIVIC, f));
      for (const r of (rec && rec.results) || []) bump(r.office, m[1]);
    }
  }
  seats.sort((a, b) => (lastWake[a.agentDir] || '').localeCompare(lastWake[b.agentDir] || '') || a.agentDir.localeCompare(b.agentDir));
  return seats.slice(0, limit);
}

// Pack + lever last: the prior wiki wall used to sit immediately before the
// output schema, so the model reused old stated: lines instead of this week's
// task.goal (civic.17 Task 4 / Ashford D7, 2026-08-15).
function datawakeUserPrompt(pack, wallInj, office) {
  const hay = JSON.stringify(pack && pack.game ? { ...pack, game: gamePromptView(pack.game) } : pack);
  const lever = String(
    (pack && pack.task && pack.task.goal) ||
    (pack && pack.pulse && pack.pulse.lever) ||
    ''
  ).trim();
  const game = (pack && pack.game) || {};
  const conf = game.confrontation || null;
  return [
    wallInj || '',
    'Prior wall is continuity only. Do not reuse its wording as this week\'s statement.',
    lever ? 'THIS WEEK\'S LEVER (respond to this): ' + lever : '',
    hay,
    'JSON only: {"office":"' + voiceSlug(office.agentDir) + '","holder":"' + office.holder + '","statement":"","moves":[],"numberMoved":""}',
    'statement is one string that answers THIS WEEK\'S LEVER from the pack. Not a statement object. Not a prior-wall quote.',
    // civic.38 Task 1 — the closed move set. One consequential move per wake.
    'moves: at most ONE move from this closed set — {"type":"propose","title":"","intervention":"<catalog key>","hoods":[""],"problem":""} | {"type":"work","initiativeId":"INIT-…"} | {"type":"answer","confrontationId":"…","text":""} | {"type":"canvass","hood":"","note":""} | {"type":"call-vote","initiativeId":"INIT-…"}. ' +
      'work only names an initiative on YOUR board (game.boardIds). propose and canvass name only hoods inside your own district' +
      (/^D\d$/.test(String(office.district || '')) ? '' : ' (your seat is citywide — any real neighborhood)') +
      '. call-vote names a petition-pending row (proposed, no vote scheduled) whose domain has no petition rule — the mayor may call any such row, a district seat only one whose hoods sit in their district, once per row per week' +
      '. propose.intervention comes only from the intervention catalog named in your pack. A move that breaks these rules is discarded, not corrected.',
    conf ? 'YOU HAVE AN UNANSWERED DIRECTIVE (' + conf.id + '). An {"type":"answer",...} move responding to it is expected. Bind confrontationId exactly to that directive; only one answer is accepted per directive and seat. No new consequence is attached.' : 'No answer move is available unless game.confrontationIds names an unanswered directive for this seat.',
    'No headcount, percentage, or dollar figure unless that exact number appears above. Progress with no cited metric is described in words ("ahead of schedule", "significant headway") — never estimated.',
  ].join('\n');
}

// Only accepted structured moves belong to new records. Historical wall
// readers retain legacy action support, but model extras never reach them.
function datawakeRecord({ office, cycle, date, answeredModel, j, mv }) {
  return {
    office: voiceSlug(office.agentDir), agentDir: office.agentDir, holder: office.holder,
    popid: office.popid, title: office.title, date, cycle: Number(cycle),
    model: answeredModel, statement: j.statement,
    moves: mv.accepted,
    movesRejected: mv.rejected.map(r => ({ type: (r.move && r.move.type) || null, reason: r.reason })),
    numberMoved: j.numberMoved || null, ranAt: new Date().toISOString(),
    fellBackFrom: answeredModel === (office.model || 'deepseek/deepseek-chat') ? null : office.model,
  };
}

function datawakeStatementText(cand) {
  if (!cand) return '';
  if (typeof cand.statement === 'string') return cand.statement.trim();
  const o = cand.statement;
  if (o && typeof o === 'object') {
    return String(o.fullStatement || o.quote || o.text || '').trim();
  }
  return '';
}

// ---------------------------------------------------------------------------
// civic.38 Task 1 — the closed move set. A datawake is a turn in a game: at
// most ONE consequential move per wake (the scarce resource); speech
// (statement) is free and ungrounded (standing rule — the number gate never
// covered it, :2161-2162 pre-civic.38). The move gate below is the grounding
// gate for moves: an initiative not on the seat's board, a hood outside its
// district, an unknown move type — dropped with a loud line, never fatal.
// ---------------------------------------------------------------------------

const MOVE_TYPES = ['propose', 'work', 'answer', 'canvass', 'call-vote'];

// The beats dump of the tracker — the same rows petitionGateSweep counts
// against. Shared by the call-vote validator (datawake) and sweep (Sunday).
function trackerBeatRows(root) {
  const f = path.join(root || ROOT, 'output', 'beats', 'Initiative_Tracker.jsonl');
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
}

// game-loop plan amendment (builder 2026-09-21): the call-vote escape hatch.
// A petition-pending row (Status proposed, blank VoteCycle) whose domain has
// NO petition rule — the counter reports domain-rules-deferred — can be sent
// to next cycle's vote by the mayor, or by the district seat whose district
// holds one of the row's hoods. One per row per week. It can never bypass a
// real band (a banded domain reports cleared/blocked, not deferred) and never
// touches an unplayable one (housing/safety report domain-not-playable).
// Returns null when eligible, else the rejection reason.
function callVoteEligibility(initId, office, ctx) {
  const row = (ctx.trackerRows || []).find(r => String(r.InitiativeID || '') === initId);
  if (!row) return 'call-vote-row-not-found(' + initId + ')';
  if (String(row.Status || '').trim() !== 'proposed' || String(row.VoteCycle || '').trim()) {
    return 'call-vote-row-not-petition-pending(' + initId + ' — Status=' + (row.Status || '?') + ', VoteCycle=' + (row.VoteCycle || 'blank') + ')';
  }
  const ledger = ctx.moveLedger;
  if (ledger) {
    for (const mv of ledger.values()) {
      if (mv && mv.type === 'call-vote' && mv.status === 'pending' && mv.payload && mv.payload.initiativeId === initId) {
        return 'call-vote-already-filed-this-week(' + initId + ' by ' + mv.agentDir + ')';
      }
    }
  }
  const hoods = String(row.AffectedNeighborhoods || '').split(',').map(s => s.trim()).filter(Boolean);
  const isMayor = /^MAYOR/.test(String(office.officeId || '')) || String(office.agentDir || '') === 'civic-office-mayor';
  if (!isMayor) {
    const district = String(office.district || '');
    if (!/^D\d$/.test(district)) return 'call-vote-seat-not-eligible(' + (office.officeId || office.agentDir || '?') + ' — only the mayor or a district seat holding the row\'s hoods)';
    if (ctx.geographyIssue) return 'geography-unavailable(' + ctx.geographyIssue + ')';
    const c2p = ctx.childToParent || {};
    if (!hoods.some(h => getDistrictForNeighborhood(foldHood(h, c2p)) === district)) {
      return 'call-vote-district-mismatch(' + initId + ' hoods ' + (hoods.join('/') || 'none') + ' — none in ' + district + ')';
    }
  }
  const domain = String(row.PolicyDomain || '').trim().toLowerCase();
  if (ctx.petitionData === undefined && typeof ctx.loadPetitionData === 'function') ctx.petitionData = ctx.loadPetitionData();
  if (!ctx.petitionData) return 'call-vote-counter-unavailable';
  let res;
  try {
    res = require('./civicPetitions').countPetition({ policyDomain: domain, hoods }, ctx.petitionData,
      { supportBand: PETITION_SUPPORT_BANDS[domain] != null ? PETITION_SUPPORT_BANDS[domain] : undefined });
  } catch (e) {
    // Datawakes run synchronously inside runDatawake() — an uncaught throw here
    // would abort the whole seat's turn, not just this move. Fail the move, not
    // the run (found in adversarial review, 2026-09-22; callVoteSweep already
    // guards the same call this way).
    return 'call-vote-counter-error(' + e.message + ')';
  }
  const why = res && res.support && res.support.reason;
  if (why !== 'domain-rules-deferred') return 'call-vote-not-a-deferred-domain(' + initId + ' — counter says ' + (why || 'unknown') + ')';
  return null;
}

// The intervention catalog lives in lib/initiativePhaseContract.js (Task 4
// step 0, engine-sheet's file). Until it lands, propose is unvalidatable and
// every propose is refused loudly — never validated against a local copy
// (mechanism decision 5: one catalog, shared, so scripts and engine can't drift).
function loadInterventionCatalog() {
  try {
    const c = require('../lib/initiativePhaseContract').INTERVENTION_CATALOG;
    return c && typeof c === 'object' && Object.keys(c).length ? c : null;
  } catch (_) { return null; }
}

// Hood authority: council seats are district-bound (child areas fold to
// parents first — an intersect test would let one local hood carry in
// unauthorized ones); citywide seats (mayor, police chief) may name any
// canonical hood (ruling 2 names the mayor; the chief has no district to be
// bound to). Returns null when OK, else the rejection reason.
function hoodAuthorityReason(office, hoodRaw, childToParent) {
  const folded = foldHood(hoodRaw, childToParent);
  if (!CANONICAL_HOODS.has(String(hoodRaw).trim().toLowerCase()) &&
      !CANONICAL_HOODS.has(folded.toLowerCase())) {
    return 'unknown-hood("' + hoodRaw + '")';
  }
  const district = String(office.district || '');
  if (/^D\d$/.test(district)) {
    if (getDistrictForNeighborhood(folded) !== district) {
      return 'hood-out-of-district("' + hoodRaw + '" folds to ' + folded + ', not in ' + district + ')';
    }
  }
  return null;
}

// Validate one wake's moves. ctx: { office, boardIds:Set, catalog,
// childToParent }. Returns { accepted:[{type,payload}], rejected:[{move,reason}] }.
// Every move type is consequential — the first valid one stands, the rest are
// rejected on their own lines (plan Task 1 step 1).
function validateDatawakeMoves(rawMoves, ctx) {
  const accepted = [];
  const rejected = [];
  if (rawMoves == null) return { accepted, rejected };
  if (!Array.isArray(rawMoves)) {
    return { accepted, rejected: [{ move: rawMoves, reason: 'moves-not-an-array' }] };
  }
  const office = ctx.office || {};
  const boardIds = ctx.boardIds || new Set();
  const catalog = ctx.catalog === undefined ? loadInterventionCatalog() : ctx.catalog;
  const c2p = ctx.childToParent || {};
  const isChief = String(office.officeId || '') === 'CHIEF-POLICE';

  for (const m of rawMoves) {
    const type = m && typeof m === 'object' ? m.type : null;
    if (!type || MOVE_TYPES.indexOf(type) === -1) {
      rejected.push({ move: m, reason: 'unknown-move-type(' + (type == null ? typeof m : type) + ')' });
      continue;
    }
    let reason = null;
    if (ctx.geographyIssue && ['propose', 'canvass', 'work'].includes(type)) {
      rejected.push({ move: m, reason: 'geography-unavailable(' + ctx.geographyIssue + ')' });
      continue;
    }
    if (type === 'propose') {
      if (isChief) reason = 'seat-cannot-propose(CHIEF-POLICE is not an elected seat)';
      else if (!String(m.title || '').trim()) reason = 'propose-missing-title';
      else if (!String(m.problem || '').trim()) reason = 'propose-missing-problem';
      else if (!Array.isArray(m.hoods) || !m.hoods.length) reason = 'propose-missing-hoods';
      else if (!String(m.intervention || '').trim()) reason = 'propose-missing-intervention';
      else if (!catalog) reason = 'catalog-not-landed(lib/initiativePhaseContract.js INTERVENTION_CATALOG — Task 4 step 0, engine-sheet)';
      else if (interventionIssue(catalog, m.intervention)) reason = interventionIssue(catalog, m.intervention) + '(' + String(m.intervention) + ')';
      if (!reason) {
        for (const h of m.hoods) {
          reason = hoodAuthorityReason(office, h, c2p);
          if (reason) break;
        }
      }
    } else if (type === 'work') {
      const id = String(m.initiativeId || '').trim();
      if (!id) reason = 'work-missing-initiativeId';
      else if (!boardIds.has(id)) reason = 'initiative-not-on-board(' + id + ')';
    } else if (type === 'answer') {
      if (!String(m.text || '').trim()) reason = 'answer-missing-text';
      else if (ctx.answerEvidenceAvailable === false) reason = 'answer-evidence-unavailable';
      else if ((ctx.answeredConfrontationIds || new Set()).has(m.confrontationId)) reason = 'directive-already-answered';
      else {
        const directive = (ctx.confrontations || []).find(c => c.id === m.confrontationId);
        if (!directive || directive.agentDir !== office.agentDir ||
            directive.id !== 'CONF-' + directive.cycle + '-' + office.agentDir ||
            !Number.isInteger(Number(ctx.cycle)) || Number(ctx.cycle) < directive.cycle) reason = 'answer-not-bound-to-seat-directive';
      }
    } else if (type === 'canvass') {
      if (!String(m.hood || '').trim()) reason = 'canvass-missing-hood';
      else reason = hoodAuthorityReason(office, m.hood, c2p);
    } else if (type === 'call-vote') {
      const id = String(m.initiativeId || '').trim();
      if (!id) reason = 'call-vote-missing-initiativeId';
      else if (!boardIds.has(id)) reason = 'initiative-not-on-board(' + id + ')';
      else reason = callVoteEligibility(id, office, ctx);
    }
    if (reason) {
      rejected.push({ move: m, reason });
      continue;
    }
    if (accepted.length) {
      rejected.push({ move: m, reason: 'second-consequential-move(one per wake — the first valid one stands)' });
      continue;
    }
    const payload = {};
    for (const k of Object.keys(m)) {
      if (k !== 'type') payload[k] = m[k];
    }
    if (type === 'answer') {
      const directive = ctx.confrontations.find(c => c.id === m.confrontationId);
      payload.directiveCycle = directive.cycle;
      payload.confrontationSeat = office.agentDir;
    }
    accepted.push({ type, payload });
  }
  return { accepted, rejected };
}

// Append-only move ledger (Task 2 step 1): one JSON line per event, status
// changes are new lines for the same moveId, a reader folds last-line-wins.
// moveId = MV-{cycle}-{agentDir}-{date} — one consequential move per wake
// makes it unique; a re-run of the same wake writes the same id.
function appendMoveLedger(root, cycle, lines) {
  if (!lines.length) return null;
  const dir = path.join(root, 'output', 'cron-civic', 'moves');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'moves_c' + cycle + '.jsonl');
  fs.appendFileSync(file, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  return file;
}

function moveLedgerLines(office, cycle, date, mv) {
  const moveId = 'MV-' + cycle + '-' + office.agentDir + '-' + date;
  const at = new Date().toISOString();
  const lines = mv.accepted.map(m => ({
    moveId, cycle: Number(cycle), date, agentDir: office.agentDir, popid: office.popid || null,
    type: m.type, payload: m.payload, status: 'pending', at,
  }));
  mv.rejected.forEach((r, i) => lines.push({
    moveId: moveId + ':rej' + i, cycle: Number(cycle), date, agentDir: office.agentDir,
    popid: office.popid || null, type: (r.move && r.move.type) || null,
    payload: (r.move && typeof r.move === 'object') ? r.move : { raw: String(r.move) },
    status: 'rejected', detail: r.reason, at,
  }));
  return lines;
}

// ---------------------------------------------------------------------------
// civic.38 Task 2 — the Sunday fold. The decisions envelope cannot carry a
// week of moves (one initiative + one flat trackerUpdates per file, rewritten
// every Sunday — review F2), so moves ride their own ledger and the fold
// turns the closing cycle's PENDING moves into per-initiative tracker fields
// plus a candidate-row set, handing both to the existing gate + clerk +
// normalizeTrackerWrite path. Idempotent: values are set absolute, never
// appended, so a chain re-run folds to byte-identical files.
// ---------------------------------------------------------------------------

function loadMoveLedgerFolded(root, cycle) {
  const file = path.join(root, 'output', 'cron-civic', 'moves', 'moves_c' + cycle + '.jsonl');
  if (!fs.existsSync(file)) return null;
  const byId = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let m; try { m = JSON.parse(line); } catch (_) { continue; }
    if (m && m.moveId) byId.set(m.moveId, m);   // last line wins
  }
  return byId;
}

// initiative → decisions-dir slug. The static map lives in
// assembleDecisions.js:52 (INIT_TO_SLUG, not exported — not my file); the
// fold derives it from the existing decisions files themselves and falls back
// to the same slug transform assemble uses (assembleDecisions.js:322).
function slugForInitiative(decisionsDir, initId) {
  if (fs.existsSync(decisionsDir)) {
    const dirs = fs.readdirSync(decisionsDir).filter(d => {
      try { return fs.statSync(path.join(decisionsDir, d)).isDirectory() && d !== '_candidates'; } catch (_) { return false; }
    });
    let best = null;
    for (const d of dirs) {
      const files = fs.readdirSync(path.join(decisionsDir, d))
        .filter(f => /^decisions_c\d+\.json$/i.test(f))
        .sort((a, b) => Number((b.match(/\d+/) || [0])[0]) - Number((a.match(/\d+/) || [0])[0]));
      for (const f of files) {
        const j = readJson(path.join(decisionsDir, d, f));
        if (j && (j.initiativeId === initId || j.initiative === initId)) { best = d; break; }
      }
      if (best) break;
    }
    if (best) return best;
  }
  return String(initId).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// Fold one closing cycle. Returns { workMoves, workInitiatives, candidates,
// files } and writes: merged decisions files (work) + _candidates file
// (propose) + a fold manifest the apply step reads to post ledger outcomes.
function foldMovesIntoDecisions(root, cycle, officeMap) {
  const folded = loadMoveLedgerFolded(root, cycle);
  const manifestPath = path.join(root, 'output', 'cron-civic', 'moves', 'fold_c' + cycle + '.json');
  if (!folded) {
    log('move fold: no ledger for c' + cycle + ' — nothing to fold');
    return { workMoves: 0, workInitiatives: 0, candidates: 0, files: [] };
  }
  const pending = [...folded.values()].filter(m => m.status === 'pending');
  const works = pending.filter(m => m.type === 'work' && m.payload && m.payload.initiativeId);
  const proposes = pending.filter(m => m.type === 'propose');
  const out = { workMoves: works.length, workInitiatives: 0, candidates: proposes.length, files: [] };

  const decisionsDir = path.join(root, 'output', 'city-civic-database', 'initiatives');
  const byInit = new Map();
  for (const w of works) {
    const id = w.payload.initiativeId;
    if (!byInit.has(id)) byInit.set(id, []);
    byInit.get(id).push(w);
  }
  for (const [initId, list] of byInit) {
    const seats = [...new Set(list.map(m => m.agentDir))].sort();
    const slug = slugForInitiative(decisionsDir, initId);
    const dir = path.join(decisionsDir, slug);
    const file = path.join(dir, 'decisions_c' + cycle + '.json');
    let d = readJson(file);
    if (!d) {
      d = { initiative: initId, initiativeId: initId, cycle: Number(cycle),
        primaryVoice: 'move-fold', consolidatedFrom: [], trackerUpdates: {} };
    }
    d.trackerUpdates = d.trackerUpdates || {};
    // The fold owns these two fields; every other field belongs to the voice
    // that wrote the file and is left untouched (mechanism decision 1/2).
    d.trackerUpdates.LastWorkCycle = Number(cycle);
    d.trackerUpdates.LastWorkSeat = seats.join(', ');
    // No timestamp here: the fold must be byte-idempotent (plan Task 2 verify:
    // "fold twice → identical decisions + candidates files"). The ledger lines
    // already carry their own `at`.
    d._moveFold = { moveIds: list.map(m => m.moveId).sort() };
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
    out.files.push(path.relative(root, file));
    out.workInitiatives++;
  }

  if (proposes.length) {
    const officeByDir = {};
    for (const o of [...(officeMap.offices || []), ...(officeMap.projects || [])]) {
      if (o.agentDir) officeByDir[o.agentDir] = o;
    }
    const candidates = {};
    for (const p of proposes) {
      const seat = officeByDir[p.agentDir] || {};
      candidates[p.moveId] = {
        moveId: p.moveId, cycle: Number(cycle), date: p.date,
        agentDir: p.agentDir, popid: p.popid || seat.popid || null,
        proposingOffice: seat.officeId || seat.projectId || null,
        title: p.payload.title, intervention: p.payload.intervention,
        hoods: p.payload.hoods, problem: p.payload.problem,
        status: 'pending',
      };
    }
    const candDir = path.join(decisionsDir, '_candidates');
    fs.mkdirSync(candDir, { recursive: true });
    const candFile = path.join(candDir, 'candidates_c' + cycle + '.json');
    // keyed by moveId — a re-run replaces the file, never appends
    fs.writeFileSync(candFile, JSON.stringify({ cycle: Number(cycle), candidates }, null, 2) + '\n');
    out.files.push(path.relative(root, candFile));
  } else {
    // no proposals this week — a stale candidates file from a prior fold of
    // THIS cycle must not survive a re-run
    const candFile = path.join(decisionsDir, '_candidates', 'candidates_c' + cycle + '.json');
    if (fs.existsSync(candFile)) { fs.unlinkSync(candFile); log('move fold: removed stale candidates file (no pending proposes)'); }
  }

  fs.writeFileSync(manifestPath, JSON.stringify({
    cycle: Number(cycle),
    work: Object.fromEntries([...byInit].map(([id, list]) => [id, list.map(m => m.moveId)])),
    candidates: proposes.map(p => p.moveId),
    foldedAt: new Date().toISOString(),
  }, null, 2) + '\n');
  log('move fold: ' + out.workMoves + ' work move(s) across ' + out.workInitiatives +
    ' initiative(s), ' + out.candidates + ' candidate(s)' +
    (out.files.length ? ' → ' + out.files.join(', ') : ''));
  return out;
}

// ---------------------------------------------------------------------------
// civic.38 Task 6.3 — the petition sweep. Every petition-pending tracker row
// (Status=proposed, blank VoteCycle — petition-pending by definition,
// mechanism decision 3) is counted by codex's deterministic counter
// (scripts/civicPetitions.js, no LLM) against the local beats dumps. The count
// TABLE prints every Sunday regardless. A row only moves to a vote when its
// count clears the domain's support band — and the band is builder-set
// (SUPPORT_BANDS below; unset = counts print, nothing gates). Per the
// research-build reconciliation (e1314bd7) housing and safety NEVER clear
// here — the counter returns domain-not-playable until their engine levers
// exist. The seat never schedules its own vote.
// ---------------------------------------------------------------------------

// Builder-tunable: share of affected-hood population that sends a proposal to
// a vote (design record §11: the tracked ledger is a sample, never the
// denominator — bands scale against hood population inside countPetition).
// Empty = dry visibility only; no proposal has ever been gated live.
const PETITION_SUPPORT_BANDS = {
  // health: 0.05,   // example only — the builder sets the first real band
};

function petitionGateSweep(root, cycle) {
  const rows = (function () {
    const f = path.join(root, 'output', 'beats', 'Initiative_Tracker.jsonl');
    if (!fs.existsSync(f)) return null;
    return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
  })();
  if (!rows) { log('petition sweep: no beats Initiative_Tracker dump — skipped'); return { pending: 0, gated: 0 }; }
  const pending = rows.filter(r =>
    String(r.Status || '').trim() === 'proposed' && !String(r.VoteCycle || '').trim());
  if (!pending.length) { log('petition sweep: no petition-pending rows on the tracker'); return { pending: 0, gated: 0 }; }

  const petitions = require('./civicPetitions');
  let data;
  try {
    data = petitions.loadLocalData({ root, cycle: Number(cycle) });
  } catch (e) {
    log('petition sweep: local data load failed (non-fatal): ' + e.message);
    return { pending: pending.length, gated: 0, error: e.message };
  }
  const decisionsDir = path.join(root, 'output', 'city-civic-database', 'initiatives');
  let gated = 0;
  for (const row of pending) {
    const id = row.InitiativeID;
    const domain = String(row.PolicyDomain || '').trim().toLowerCase();
    const hoods = String(row.AffectedNeighborhoods || '').split(',').map(s => s.trim()).filter(Boolean);
    let res;
    try {
      res = petitions.countPetition({ policyDomain: domain, hoods }, data,
        { supportBand: PETITION_SUPPORT_BANDS[domain] != null ? PETITION_SUPPORT_BANDS[domain] : undefined });
    } catch (e) {
      log('petition sweep: ' + id + ' count failed (non-fatal): ' + e.message);
      continue;
    }
    const s = res.support || {};
    log('petition sweep: ' + id + ' [' + domain + '] ' +
      'numerator=' + (s.numerator == null ? 'n/a' : s.numerator) + ' ' + (s.unit || '') +
      ' required=' + (s.requiredCount == null ? 'unset' : s.requiredCount) +
      ' → ' + (s.cleared ? 'CLEARS THE BAND' : s.reason));
    if (!s.cleared) continue;
    // The gated write, through the same fold channel a work move uses.
    const slug = slugForInitiative(decisionsDir, id);
    const dir = path.join(decisionsDir, slug);
    const file = path.join(dir, 'decisions_c' + cycle + '.json');
    const d = readJson(file) || { initiative: id, initiativeId: id, cycle: Number(cycle),
      primaryVoice: 'petition-sweep', consolidatedFrom: [], trackerUpdates: {} };
    d.trackerUpdates = d.trackerUpdates || {};
    d.trackerUpdates.Status = 'pending-vote';
    d.trackerUpdates.ImplementationPhase = 'vote-scheduled';
    d.trackerUpdates.VoteCycle = Number(cycle) + 1;
    d._petitionGate = { numerator: s.numerator, requiredCount: s.requiredCount, band: s.band };
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
    gated++;
    log('petition sweep: ' + id + ' petition CLEARED — vote-scheduled write staged in ' + path.relative(root, file) + ' (gate + clerk still apply)');
  }
  return { pending: pending.length, gated };
}

// ---------------------------------------------------------------------------
// game-loop plan amendment (builder 2026-09-21): the call-vote fold. Pending
// call-vote moves on the week's ledger schedule a vote for a petition-pending
// row whose domain has no petition rule — the escape hatch for rows like
// INIT-003 that no band will ever clear. The seat was validated at file time
// (mayor or the district seat holding the row's hoods; one per row per week);
// the sweep re-checks the world at fold time: the row must still be
// petition-pending and the counter must still say domain-rules-deferred (a
// band landing mid-week closes the hatch). The write rides the petition
// sweep's gated channel — same holding decisions file, same legal Status
// transition, same validator + gate + normalizeTrackerWrite path.
// ---------------------------------------------------------------------------
function callVoteSweep(root, cycle) {
  const folded = loadMoveLedgerFolded(root, cycle);
  if (!folded) return { filed: 0, scheduled: 0 };
  const calls = [...folded.values()].filter(m => m.status === 'pending' && m.type === 'call-vote' && m.payload && m.payload.initiativeId);
  if (!calls.length) return { filed: 0, scheduled: 0 };
  // One per row per week — enforced at filing; first ledger line wins here too.
  const byInit = new Map();
  for (const m of calls) if (!byInit.has(m.payload.initiativeId)) byInit.set(m.payload.initiativeId, m);

  const rows = trackerBeatRows(root);
  if (!rows) { log('call-vote: no beats Initiative_Tracker dump — skipped'); return { filed: byInit.size, scheduled: 0 }; }
  const petitions = require('./civicPetitions');
  let data;
  try {
    data = petitions.loadLocalData({ root, cycle: Number(cycle) });
  } catch (e) {
    log('call-vote: local data load failed (non-fatal): ' + e.message);
    return { filed: byInit.size, scheduled: 0, error: e.message };
  }
  const decisionsDir = path.join(root, 'output', 'city-civic-database', 'initiatives');
  const scheduledMoves = {};
  for (const [initId, m] of byInit) {
    const row = rows.find(r => String(r.InitiativeID || '') === initId);
    if (!row) { log('call-vote: ' + initId + ' not on the tracker dump — skipped (' + m.moveId + ')'); continue; }
    if (String(row.Status || '').trim() !== 'proposed' || String(row.VoteCycle || '').trim()) {
      log('call-vote: ' + initId + ' no longer petition-pending (Status=' + row.Status + ', VoteCycle=' + (row.VoteCycle || 'blank') + ') — skipped');
      continue;
    }
    const domain = String(row.PolicyDomain || '').trim().toLowerCase();
    const hoods = String(row.AffectedNeighborhoods || '').split(',').map(s => s.trim()).filter(Boolean);
    let res;
    try {
      res = petitions.countPetition({ policyDomain: domain, hoods }, data,
        { supportBand: PETITION_SUPPORT_BANDS[domain] != null ? PETITION_SUPPORT_BANDS[domain] : undefined });
    } catch (e) {
      log('call-vote: ' + initId + ' recount failed (non-fatal): ' + e.message);
      continue;
    }
    const why = res && res.support && res.support.reason;
    if (why !== 'domain-rules-deferred') {
      log('call-vote: ' + initId + ' counter now says ' + (why || 'unknown') + ' — escape hatch closed, skipped (' + m.moveId + ')');
      continue;
    }
    const slug = slugForInitiative(decisionsDir, initId);
    const dir = path.join(decisionsDir, slug);
    const file = path.join(dir, 'decisions_c' + cycle + '.json');
    const d = readJson(file) || { initiative: initId, initiativeId: initId, cycle: Number(cycle),
      primaryVoice: 'call-vote', consolidatedFrom: [], trackerUpdates: {} };
    d.trackerUpdates = d.trackerUpdates || {};
    d.trackerUpdates.Status = 'pending-vote';
    d.trackerUpdates.ImplementationPhase = 'vote-scheduled';
    d.trackerUpdates.VoteCycle = Number(cycle) + 1;
    d._callVote = { moveId: m.moveId, agentDir: m.agentDir };
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
    scheduledMoves[initId] = m.moveId;
    log('call-vote: ' + initId + ' vote called by ' + m.agentDir + ' (' + m.moveId + ') — vote-scheduled write staged in ' + path.relative(root, file) + ' (gate + clerk still apply)');
  }
  const scheduled = Object.keys(scheduledMoves).length;
  if (scheduled) {
    // Join the fold manifest so the apply posts each move's outcome line.
    const manifestPath = path.join(root, 'output', 'cron-civic', 'moves', 'fold_c' + cycle + '.json');
    const manifest = readJson(manifestPath) || { cycle: Number(cycle) };
    manifest.callVotes = scheduledMoves;
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
  return { filed: byInit.size, scheduled };
}

// Numeric grounding: every digit-token in a datawake's output must appear in
// the office's own data slice (commas stripped). Worded quantities ("seven
// neighborhoods") pass; invented statistics ("renewals up 8%") don't — this
// output is media-lane source material, so a fabricated number is contamination.
const NUM_ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const NUM_TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const NUM_SCALE = { hundred: 100, thousand: 1000, million: 1000000, billion: 1000000000 };
// civic.29: mayor_open_c104's fabricated "Thirty-two eligible applicants" was
// spelled out, not digits — the digit-only regex below never saw it. Scoped
// to unambiguous compound number-words (21-99 compounds, "N hundred/thousand/
// million/billion") rather than bare "one"/"two"/"twenty", which read as real
// quantities constantly in ordinary prose ("one of three bidders") and would
// flood this with false positives.
function spelledNumberTokens(text) {
  const out = [];
  const compound = /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-](one|two|three|four|five|six|seven|eight|nine)\b/gi;
  let m;
  while ((m = compound.exec(text))) out.push(String(NUM_TENS[m[1].toLowerCase()] + NUM_ONES[m[2].toLowerCase()]));
  const scaled = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(hundred|thousand|million|billion)\b/gi;
  while ((m = scaled.exec(text))) {
    const w = m[1].toLowerCase();
    const base = NUM_ONES[w] !== undefined ? NUM_ONES[w] : NUM_TENS[w];
    if (base !== undefined) out.push(String(base * NUM_SCALE[m[2].toLowerCase()]));
  }
  return out;
}

function ungroundedNumbers(slice, texts, context) {
  const norm = s => String(s || '').replace(/,/g, '');
  const hay = norm(slice);
  // Identity numbers an office legitimately says without them being in its data
  // slice: its own district ("District 4"), the cycle it's living in, and the
  // prior cycle it cites. First live cron run rejected all three as fabricated
  // (IND on "4", Okoro on "102") — false positives, not invented statistics.
  const allowed = new Set();
  let hayNums = null;   // civic.35 lazy cache for derivedFromHay
  const ctx = context || {};
  const d = String(ctx.district || '').match(/\d+/);
  if (d) allowed.add(d[0]);
  if (ctx.cycle) { allowed.add(String(ctx.cycle)); allowed.add(String(Number(ctx.cycle) - 1)); }
  allowed.add('911');   // the emergency line, not a statistic — the C105 mayor re-roll (2026-09-06 14:37) was rejected on it
  const bad = new Set();
  for (const t of texts) {
    const nt = norm(t);
    // "51st", "3rd" are street/ordinal names, not quantity claims — the Sunday
    // gate's first live run flagged "51st" from "sound barriers along 51st".
    // A lookahead embedded in the greedy \d+ backtracks around itself (5|1st
    // still matches "5"), so filter by index against the source string instead.
    const digitTokens = [];
    for (const m of nt.matchAll(/\d+(?:\.\d+)?%?/g)) {
      const after = nt.slice(m.index + m[0].length, m.index + m[0].length + 2);
      if (/^(?:st|nd|rd|th)\b/.test(after)) continue;
      digitTokens.push(m[0]);
    }
    const tokens = digitTokens.concat(spelledNumberTokens(String(t || '')));
    for (const tok of tokens) {
      const bare = tok.replace(/%$/, '');
      if (allowed.has(bare) || hay.includes(bare) || derivedFromHay(bare)) continue;
      bad.add(tok);
    }
  }
  return [...bad];

  // civic.35: a number that is the sum or difference of two figures in the
  // packet is grounded — "12 households; total 57/280" grounds 69. The gate
  // used to reject the office for doing its own arithmetic correctly.
  function derivedFromHay(bare) {
    if (!/^\d+(?:\.\d+)?$/.test(bare)) return false;
    const target = Number(bare);
    if (!hayNums) {
      hayNums = [...new Set((hay.match(/\d+(?:\.\d+)?/g) || []).map(Number))].slice(0, 400);
    }
    for (let i = 0; i < hayNums.length; i++) {
      for (let j = i; j < hayNums.length; j++) {
        const a = hayNums[i], b = hayNums[j];
        if (Math.abs(a + b - target) < 1e-9 || Math.abs(Math.abs(a - b) - target) < 1e-9) return true;
      }
    }
    return false;
  }
}

async function runDatawake() {
  const cycle = arg('--cycle', null) || detectCycle();
  const date = arg('--date', new Date().toISOString().slice(0, 10));
  const LIMIT = parseInt(arg('--limit', '3'), 10);
  const ONLY = arg('--office', null);
  const day = new Date(date + 'T12:00:00Z').getUTCDay();   // 0=Sun..6=Sat
  console.log('Civic DATAWAKE — ' + date + ' (c' + cycle + ')');
  console.log('===================================');
  // Task 3.2: offices work Sun-Thu; datawakes run Mon-Thu (Sunday is the chain).
  // Fri/Sat the office-holders are citizens — their wakes belong to the
  // citizen-loop (whose pool already includes them; no office wake here, ever).
  if (day === 5 || day === 6 || day === 0) {
    console.log('[datawake] ' + date + ' is ' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] + ' — no office wakes (Fri-Sat = citizen life days; Sun = decision chain). Exiting clean.');
    return;
  }
  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const tracker = trackerSnapshot.loadOrRebuild(cycle);
  const audit = mustJson(path.join(ROOT, 'output', 'engine_audit_c' + cycle + '.json'), 'engine audit');
  const briefsFile = readJson(path.join(ROOT, 'output', 'baseline_briefs_c' + cycle + '.json')) || {};
  const briefs = briefsFile.briefs || [];
  const sections = splitSections(mustRead(path.join(ROOT, 'output', 'world_summary_c' + cycle + '.md'), 'world summary'));
  const hoods = parseHoodTable(findSection(sections, 'City State'));

  let rota;
  if (ONLY) {
    const row = civicSeat.resolveOfficeRow(officeMap, ONLY);
    rota = row ? [row] : [];
  } else {
    rota = datawakeRota(officeMap, LIMIT);
  }
  if (!rota.length) throw new Error('no duty seats matched');
  log('rota: ' + rota.map(o => o.agentDir).join(', '));

  if (process.argv.includes('--dry-run')) {
    for (const office of rota) {
      const pack = buildPack({ cycle, agentDir: office.agentDir, root: ROOT });
      const persona = readPersonaDir(civicSeat.personaDirFor(office, ROOT) || office.agentDir);
      const game = pack.game || {};
      log('DRY ' + office.agentDir + ' holder=' + office.holder +
        ' district=' + (office.district || '') +
        ' personaBytes=' + (persona ? persona.length : 0) +
        ' facts=' + (pack.known || []).length +
        ' people=' + ((pack.exposure && pack.exposure.subjects) || []).length +
        ' board=' + (game.boardIds || []).length +
        ' petitions=' + (game.petitionPool && game.petitionPool.available ? (game.petitionPool.complaints || []).length : 'n/a') +
        ' interventions=' + (game.interventions && game.interventions.available ? game.interventions.playable.length : 'no-catalog') +
        (game.confrontation ? ' confrontation=' + game.confrontation.id : ''));
      if (!persona) throw new Error('no IDENTITY/RULES for ' + office.agentDir);
    }
    console.log('=== datawake dry-run: ' + rota.length + ' seats, no model call ===');
    return;
  }

  fs.mkdirSync(DATAWAKE_DIR, { recursive: true });
  const results = [];
  for (const office of rota) {
    try {
      const pack = buildPack({ cycle, agentDir: office.agentDir, root: ROOT });
      const packFile = writePack(pack, ROOT, cycle);
      log('pack ' + path.relative(ROOT, packFile));
      const hay = JSON.stringify(pack);
      const wallInj = await positionWallInject(officeMap, office.agentDir);
      const user = datawakeUserPrompt(pack, wallInj, office);
      const persona = readPersonaDir(civicSeat.personaDirFor(office, ROOT) || office.agentDir);
      let j = null;
      let answeredModel = office.model || 'deepseek/deepseek-chat';
      let attemptUser = user;
      // civic.29: a CALL failure (429, timeout, provider outage) used to burn
      // both attempts on the office's own model and mute the seat for the day
      // — the mayor's 08-31 Mistral 429 (Sunday chain already fixed this via
      // callVoice's modelChainFor, civic.26; datawake never got the same fix).
      // A VALIDITY failure (empty JSON, fabricated number) still repairs on the
      // SAME model only — switching providers to dodge the grounding gate would
      // weaken it, not fix it.
      const chain = modelChainFor(answeredModel);
      chainLoop:
      for (let mi = 0; mi < chain.length; mi++) {
        const active = chain[mi];
        if (mi > 0) log(office.agentDir + ' falling back to ' + active + ' (after ' + chain[mi - 1] + ')');
        for (let attempt = 1; attempt <= 2; attempt++) {
          let r;
          try {
            r = await callOpenRouter(active, persona, attemptUser, 1500);
          } catch (e) {
            log(office.agentDir + ' ' + active + ' attempt ' + attempt + ' call failed: ' + e.message);
            if (attempt < 2) { await sleep(2000 * attempt); continue; }
            break; // this model's attempts are exhausted — try the next in chain
          }
          let cand = null;
          try { cand = JSON.parse(stripFences(r.text)); } catch (_) { cand = null; }
          // kimi-k2 returned empty content on the first live IND wake (same class
          // as the glm-4.7 bake-off failure) — JSON.parse('') / 'null' yields null.
          const statement = datawakeStatementText(cand);
          if (!cand || typeof cand !== 'object' || !statement) {
            if (attempt === 2) throw new Error('no usable JSON statement after retry (model returned empty/invalid content)');
            log(office.agentDir + ' attempt ' + attempt + ': empty/invalid model output — retrying');
            attemptUser = user + '\n\nYOUR PREVIOUS ATTEMPT RETURNED NO USABLE JSON. Respond with ONLY the JSON object described above.';
            continue;
          }
          cand.statement = statement;
          // civic.35: facts only — numberMoved feeds the office wall and desk
          // slices; statement is speech. (civic.38: the free-text action field
          // is replaced by the closed moves array, gated below.)
          const bad = ungroundedNumbers(hay, [cand.numberMoved], { district: office.district, cycle });
          if (!bad.length) { j = cand; answeredModel = active; break chainLoop; }
          log(office.agentDir + ' attempt ' + attempt + ': ungrounded number(s) ' + bad.join(', '));
          if (attempt === 2) throw new Error('fabricated statistic(s) after retry: ' + bad.join(', '));
          attemptUser = user + '\n\nYOUR PREVIOUS ATTEMPT WAS REJECTED: it cited number(s) [' + bad.join(', ') + '] that are NOT in your data. Use only quantities present in the material above, or say it in words without inventing figures.';
        }
      }
      if (!j) throw new Error('no result after trying ' + chain.length + ' model(s): ' + chain.join(', '));
      // civic.38 Task 1 — closed move set. The seat's pack carries its board
      // (game.boardIds); the move gate grounds work/propose/canvass against it
      // and the district map. Rejected moves drop with a loud line and still
      // land on the ledger (the next pack shows the seat what it tried).
      const mv = validateDatawakeMoves(j.moves, {
        office,
        boardIds: new Set((pack.game && pack.game.boardIds) || []),
        catalog: loadInterventionCatalog(),
        childToParent: pack.game && pack.game.geographyIssue ? {} : childToParentFromAudit(audit),
        geographyIssue: pack.game && pack.game.geographyIssue,
        cycle: Number(cycle),
        confrontations: ((pack.game || {}).confrontations || {}).open || [],
        answeredConfrontationIds: new Set((((pack.game || {}).confrontations || {}).answeredIds) || []),
        answerEvidenceAvailable: ((pack.game || {}).confrontations || {}).available === true,
        // call-vote (game-loop amendment 2026-09-21): the petition-pending rows
        // off the beats dump, the week's ledger re-read per seat (a move filed
        // by an earlier seat THIS run is already visible), and a lazy counter.
        trackerRows: trackerBeatRows(ROOT) || [],
        moveLedger: loadMoveLedgerFolded(ROOT, cycle),
        loadPetitionData: () => require('./civicPetitions').loadLocalData({ root: ROOT, cycle: Number(cycle) }),
      });
      for (const rj of mv.rejected) {
        log('[datawake] MOVE REJECTED ' + office.agentDir + ' — ' + rj.reason + ' :: ' + JSON.stringify(rj.move).slice(0, 160));
      }
      if (mv.accepted.length) {
        log('[datawake] MOVE ' + office.agentDir + ' — ' + mv.accepted[0].type + ' ' + JSON.stringify(mv.accepted[0].payload).slice(0, 120));
      }
      const rec = datawakeRecord({ office, cycle, date, answeredModel, j, mv });
      const outPath = path.join(DATAWAKE_DIR, office.agentDir + '_' + date + '.json');
      fs.writeFileSync(outPath, JSON.stringify(rec, null, 2));
      const ledgerFile = appendMoveLedger(ROOT, cycle, moveLedgerLines(office, cycle, date, mv));
      if (ledgerFile && (mv.accepted.length || mv.rejected.length)) {
        log('move ledger ← ' + mv.accepted.length + ' accepted / ' + mv.rejected.length + ' rejected (' + path.relative(ROOT, ledgerFile) + ')');
      }
      await positionWallRecordDatawake(rec);
      results.push({ office: office.agentDir, ok: true, out: path.relative(ROOT, outPath) });
      console.log('  [✓] ' + office.agentDir + ' — "' + String(j.numberMoved || j.statement).slice(0, 80) + '"');
    } catch (e) {
      results.push({ office: office.agentDir, ok: false, error: e.message });
      console.error('  [✗] ' + office.agentDir + ' — ' + e.message);
    }
  }
  fs.writeFileSync(path.join(CIVIC, 'datawake_' + date + '.results.json'), JSON.stringify({ date, cycle: Number(cycle), results, ranAt: new Date().toISOString() }, null, 2));
  const failed = results.filter(x => !x.ok);
  console.log('\n=== datawake: ' + (results.length - failed.length) + '/' + results.length + ' ok ===');
  if (failed.length) process.exit(1);
}

// ---------------------------------------------------------------------------
// Task 4.1 — the guarded Sunday runner: the engine fire is manual, so the cron
// can't be timed to it. This wrapper self-checks (engine fired this cycle?
// chain already ran?) and exits clean when there's nothing to do — safe to
// schedule more than once per Sunday.
// ---------------------------------------------------------------------------
async function runChain() {
  const cycle = arg('--cycle', null) || detectCycle();
  console.log('Civic SUNDAY CHAIN — c' + cycle + (process.argv.includes('--apply') ? ' (APPLY)' : ' (dry)'));
  console.log('===================================');
  // Idempotence guard: skip only when a PRIOR close actually WROTE the tracker.
  // A close that ran and staged (gate blocked / clerk fail / dry) leaves
  // close_c{XX}.json with applied:false — treating that as "already ran" strands
  // the cycle permanently, since the Sunday cron is the only apply path. C103 sat
  // unwritten from 2026-08-15 to 2026-08-19 exactly this way: the gate was fixed
  // (civic.26) and went green, but every scheduled retry short-circuited here and
  // no sheet write ever happened. Re-entering a staged cycle is safe — the stages
  // are file-idempotent and applyTrackerUpdates re-derives from staged decisions.
  const priorClose = readJson(path.join(CIVIC, 'close_c' + cycle + '.json'));
  if (priorClose && priorClose.applied === true) {
    console.log('[chain] close_c' + cycle + '.json shows applied:true — chain already wrote this cycle. Exiting clean.');
    return;
  }
  if (priorClose) {
    console.log('[chain] close_c' + cycle + '.json exists but applied:' + priorClose.applied + ' — prior run staged without writing. Re-running chain.');
  }
  const need = ['world_summary_c' + cycle + '.md', 'engine_audit_c' + cycle + '.json'];
  const missing = need.filter(f => !fs.existsSync(path.join(ROOT, 'output', f)));
  if (missing.length) {
    console.log('[chain] engine has not fired for c' + cycle + ' yet (missing: ' + missing.join(', ') + '). Exiting clean.');
    return;
  }
  for (const stage of [runDirective, runPrep, runMayorOpen, runHearing, runMayorGavel, runProjects, runClose]) {
    await stage();   // mayor stages + prep still fail loud (process.exit) and halt the chain; hearing/projects
                     // record pending seats and continue (civic.39 ruling 2); runClose exits 1 only on a real block
  }
}

// ---------------------------------------------------------------------------
// --stage=status — Sunday 15:00 check-in (builder ask, S431): did the 14:30
// chain run and WRITE? One Discord line via DISCORD_WEBHOOK_URL (the same
// channel cron-civic-gate.js alerts on), so the silent-exit guards above
// (engine not fired / already applied / staged-not-applied) become visible
// without opening a log. --no-post prints the line and skips the webhook.
// Never writes anything. Exit 0 always — a check-in must not fail a cron row.
// ---------------------------------------------------------------------------
function postDiscord(content) {
  return new Promise((resolve) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) { log('Discord post skipped: DISCORD_WEBHOOK_URL not set'); return resolve(false); }
    const parsed = new URL(webhookUrl);
    const payload = JSON.stringify({ content });
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => { res.resume(); res.on('end', () => { log('Discord post sent (' + res.statusCode + ')'); resolve(res.statusCode < 300); }); });
    req.on('error', (e) => { log('Discord post failed (non-blocking): ' + e.message); resolve(false); });
    req.write(payload); req.end();
  });
}

function civicStatusLine(cycle) {
  const close = readJson(path.join(CIVIC, 'close_c' + cycle + '.json'));
  const hhmm = (iso) => { try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Chicago' }); } catch (_) { return iso || '?'; } };
  if (close && close.applied === true) {
    return '✅ **City-hall C' + cycle + ' ran and wrote the tracker** at ' + hhmm(close.ranAt) + ' — clerk ' + (close.clerk || '?') + ', ' + (close.laneEntries || 0) + ' lane entries. Cycle C' + (Number(cycle) + 1) + ' is clear to fire.';
  }
  if (close) {
    return '⚠️ **City-hall C' + cycle + ' ran but did NOT write** (clerk ' + (close.clerk || '?') + ', gate ' + (close.gatePass ? 'pass' : 'blocked') + ') at ' + hhmm(close.ranAt) + '. The 21:00 retry re-enters the chain; decisions staged under output/cron-civic/staged/c' + cycle + '/. Do not fire the cycle yet.';
  }
  const need = ['world_summary_c' + cycle + '.md', 'engine_audit_c' + cycle + '.json'];
  const missing = need.filter(f => !fs.existsSync(path.join(ROOT, 'output', f)));
  if (missing.length) {
    return 'ℹ️ **City-hall C' + cycle + ': nothing to do** — engine outputs missing (' + missing.join(', ') + '), so the chain exited clean. Run /engine-review + /build-world-summary for C' + cycle + ' first.';
  }
  const prep = readJson(path.join(CIVIC, 'prep_c' + cycle + '.json'));
  return '❌ **City-hall C' + cycle + ' has not closed** — inputs are on disk but no close record' + (prep ? ' (prep ran; a later stage failed)' : ' (chain never started)') + '. Read logs/civic-cron.log; the 21:00 retry will try again. Do not fire the cycle yet.';
}

async function runStatus() {
  const cycle = arg('--cycle', null) || detectCycle();
  const line = civicStatusLine(cycle);
  console.log(line);
  if (!process.argv.includes('--no-post')) await postDiscord(line);
}

// ---------------------------------------------------------------------------
// civic.39 — week-boundary stage machine (plan:
// docs/plans/2026-09-21-civic-sunday-stage-machine.md). A per-cycle state file
// tracks every stage; a cheap no-model `tick` advances the stages whose inputs
// exist. The fold, petition sweep, vote stamping and the deterministic checks
// never wait on a model or a missing voice; the model audits (clerk, gate
// sanity-read) are deferred verdicts that gate the apply without being able to
// halt the week. Until Task 3's batch submit/collect lands, the model stages
// themselves are still executed by the Sunday chain — tick only TRACKS them.
// ---------------------------------------------------------------------------

const WEEK_STATE_VERSION = 1;
const WEEK_STAGES = ['prep', 'directive', 'mayor-open', 'hearing', 'mayor-gavel', 'projects', 'close-det', 'verdict-clerk', 'verdict-sanity', 'apply'];
// Ruling 4 (research-build, builder-delegated 2026-09-21): a verdict still
// missing 6 hours after the engine fires no longer holds the apply. Lands
// before the Monday 05:45 datawake for a Sunday 21:00 fire.
const VERDICT_CUTOFF_MS = 6 * 60 * 60 * 1000;

function weekStatePath(cycle, root) {
  return path.join(root || ROOT, 'output', 'cron-civic', 'week_state_c' + cycle + '.json');
}

function blankWeekState(cycle) {
  const stages = {};
  for (const s of WEEK_STAGES) stages[s] = { stage: s, status: 'waiting', inputs: {}, attempts: 0, updated: null };
  return { version: WEEK_STATE_VERSION, cycle: Number(cycle), engineFiredAt: null, stages };
}

function loadWeekState(cycle, root) {
  const s = readJson(weekStatePath(cycle, root));
  if (!s || !s.stages) return blankWeekState(cycle);
  const blank = blankWeekState(cycle);
  for (const name of WEEK_STAGES) if (!s.stages[name]) s.stages[name] = blank.stages[name];
  return s;
}

// Writes only when something actually changed (or the file is absent) — a
// second tick on an unchanged week does nothing, including no file rewrite.
function saveWeekState(state, root) {
  const p = weekStatePath(state.cycle, root);
  if (!state._dirty && fs.existsSync(p)) return false;
  delete state._dirty;
  state.updated = new Date().toISOString();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(state, null, 2) + '\n');
  return true;
}

// The engine fire is a manual event; its on-disk witness is the pair of
// compile artifacts every fire produces. firedAt = the later of the two
// mtimes (the moment the pair was complete). Never wall-clock-facing — this
// only feeds the verdict cutoff clock.
function engineFireInfo(cycle, root) {
  root = root || ROOT;
  const files = ['world_summary_c' + cycle + '.md', 'engine_audit_c' + cycle + '.json']
    .map(f => path.join(root, 'output', f));
  if (!files.every(f => fs.existsSync(f))) return { fired: false, firedAt: null };
  const mtimes = files.map(f => fs.statSync(f).mtimeMs);
  return { fired: true, firedAt: new Date(Math.max.apply(null, mtimes)).toISOString() };
}

// Stage statuses: waiting | ready | done | failed | deferred (deferred is the
// verdict stages' "no verdict yet — apply holds until the cutoff"). Every
// status is DERIVED from on-disk artifacts on each pass — the state file is a
// cache of the derivation, never the source of truth.
function refreshWeekState(state, root) {
  root = root || ROOT;
  const cycle = state.cycle;
  const civic = path.join(root, 'output', 'cron-civic');
  const voiceDir = path.join(root, 'output', 'civic-voice');
  const nowIso = new Date().toISOString();
  const set = (name, status, inputs) => {
    const s = state.stages[name];
    if (s.status === status && JSON.stringify(s.inputs) === JSON.stringify(inputs || {})) return;
    s.status = status; s.inputs = inputs || {}; s.updated = nowIso; state._dirty = true;
  };
  const voiceExists = slug => fs.existsSync(path.join(voiceDir, slug + '_c' + cycle + '.json'));

  const fire = engineFireInfo(cycle, root);
  if (state.engineFiredAt !== fire.firedAt) { state.engineFiredAt = fire.firedAt; state._dirty = true; }
  const cutoffExpired = !!(fire.fired && (Date.now() - new Date(fire.firedAt).getTime() > VERDICT_CUTOFF_MS));

  const prepDone = fs.existsSync(path.join(civic, 'prep_c' + cycle + '.json'));
  set('prep', prepDone ? 'done' : (fire.fired ? 'ready' : 'waiting'));

  const directiveDone = fs.existsSync(path.join(civic, 'directive_c' + cycle + '.json'));
  set('directive', directiveDone ? 'done' : (fire.fired ? 'ready' : 'waiting'));

  const mayorOpenRaw = fs.existsSync(path.join(civic, 'mayor_open_c' + cycle + '.raw.txt'));
  set('mayor-open', voiceExists('mayor_open') ? 'done' : (mayorOpenRaw ? 'failed' : (prepDone ? 'ready' : 'waiting')));

  const hearingMan = readJson(path.join(civic, 'hearing_c' + cycle + '.json')) || readJson(path.join(civic, 'voices_c' + cycle + '.json'));
  const hearingPending = hearingMan ? (hearingMan.results || []).filter(x => !x.ok || !voiceExists(x.slug)).map(x => x.slug) : [];
  const batchMan = loadBatchManifest(cycle, root);
  const batchPending = batchMan ? Object.keys(batchMan.seats).filter(s => batchMan.seats[s].status === 'submitted') : [];
  set('hearing', hearingMan ? 'done' : (voiceExists('mayor_open') ? 'ready' : 'waiting'),
    hearingMan ? { pending: hearingPending } : (batchPending.length ? { batchPending } : {}));

  const gavelRaw = fs.existsSync(path.join(civic, 'mayor_gavel_c' + cycle + '.raw.txt'));
  set('mayor-gavel', voiceExists('mayor_gavel') ? 'done' : (gavelRaw ? 'failed' : (hearingMan ? 'ready' : 'waiting')));

  const projectsMan = readJson(path.join(civic, 'projects_c' + cycle + '.json'));
  const projectsPending = projectsMan ? (projectsMan.results || []).filter(x => !x.ok || !voiceExists(x.slug)).map(x => x.slug) : [];
  set('projects', projectsMan ? 'done' : (voiceExists('mayor_gavel') ? 'ready' : 'waiting'),
    projectsMan ? { pending: projectsPending } : {});

  // close-det: the gate record is the last artifact the deterministic half
  // writes (a dry-run failure stops before the gate, so its presence means the
  // dry-run passed). Ready once the voices had their window (hearing manifest)
  // or the verdict cutoff expired — the fold/sweep/stamping run even if every
  // model stage failed (ruling 2).
  const gateRec = readJson(path.join(civic, 'gate_c' + cycle + '.json'));
  const detPass = gateRec ? (gateRec.deterministicPass !== undefined ? gateRec.deterministicPass
    : (gateRec.pass || (gateRec.failures || []).every(f => f.check === 'sanity-read'))) : null;
  set('close-det', gateRec ? 'done' : ((hearingMan || cutoffExpired) ? 'ready' : 'waiting'),
    gateRec ? { deterministicPass: detPass } : { cutoffExpired });

  const clerkRec = readJson(path.join(root, 'output', 'city-civic-database', 'clerk_audit_c' + cycle + '.json'));
  const clerkStatus = clerkRec ? (clerkRec.overall || 'unknown') : 'missing';
  set('verdict-clerk', !clerkRec ? (gateRec ? 'ready' : 'waiting')
    : clerkStatus === 'fail' ? 'failed'
    : clerkStatus === 'deferred' ? 'deferred'
    : 'done', { verdict: clerkStatus });

  const sanityStatus = gateRec
    ? (gateRec.sanityStatus || (gateRec.sanity ? (gateRec.sanity.pass ? 'pass' : 'fail') : 'missing'))
    : 'missing';
  set('verdict-sanity', !gateRec ? 'waiting'
    : sanityStatus === 'fail' ? 'failed'
    : (sanityStatus === 'pass' || sanityStatus === 'skipped-empty') ? 'done'
    : 'deferred', { verdict: sanityStatus });

  const closeRec = readJson(path.join(civic, 'close_c' + cycle + '.json'));
  const applied = !!(closeRec && closeRec.applied === true);
  const decision = detPass === null ? null : decideApply({
    dryOk: true, deterministicPass: detPass, clerkStatus, sanityStatus, firedAt: fire.firedAt,
  });
  set('apply', applied ? 'done'
    : (decision && decision.apply) ? 'ready'
    : (decision && decision.blocked) ? 'failed'
    : 'waiting',
    { decision: decision ? { apply: decision.apply, blocked: !!decision.blocked, via: decision.via || null, reason: decision.reason || null, missingVerdicts: decision.missingVerdicts || [] } : null });
  return state;
}

// The single apply rule (civic.39 rulings 1+3+4): the deterministic checks are
// the gate that cannot be wrong about the sheet; a FAIL verdict blocks at any
// time; an unreachable or late model verdict is deferred and stops holding the
// apply 6h after the engine fire — flagged in the decision, never silent.
function decideApply(opts) {
  const clerkStatus = opts.clerkStatus || 'missing';
  const sanityStatus = opts.sanityStatus || 'missing';
  if (opts.dryOk === false) return { apply: false, blocked: true, reason: 'applyTrackerUpdates dry-run failed' };
  if (!opts.deterministicPass) return { apply: false, blocked: true, reason: 'deterministic gate checks failed' };
  if (clerkStatus === 'fail') return { apply: false, blocked: true, reason: 'clerk verdict FAIL' };
  if (sanityStatus === 'fail') return { apply: false, blocked: true, reason: 'sanity-read verdict FAIL' };
  const clerkSettled = clerkStatus === 'pass' || clerkStatus === 'skipped-empty';
  const sanitySettled = sanityStatus === 'pass' || sanityStatus === 'skipped-empty';
  if (clerkSettled && sanitySettled) return { apply: true, via: 'verdicts' };
  const t = opts.firedAt ? new Date(opts.firedAt).getTime() : NaN;
  const now = opts.now || Date.now();
  const waitingOn = [];
  if (!clerkSettled) waitingOn.push('clerk:' + clerkStatus);
  if (!sanitySettled) waitingOn.push('sanity-read:' + sanityStatus);
  if (isFinite(t) && now - t > VERDICT_CUTOFF_MS) {
    return { apply: true, via: 'cutoff', missingVerdicts: waitingOn };
  }
  return { apply: false, blocked: false, reason: 'model verdicts not in yet — the apply holds until they pass or the 6h cutoff', waitingOn };
}

// The deterministic half of the close: assemble → milestone-note normalize →
// Sunday fold → petition sweep → tracker dry-run. No model calls, no sheet
// writes — the same path `tick` runs. Returns {ok, dryOk, error}; a failure is
// a real block, never a deferral.
function closeDeterministic(cycle) {
  try {
    execFileSync('node', [path.join(ROOT, 'scripts', 'assembleDecisions.js'), String(cycle), '--apply'], { cwd: ROOT, stdio: 'inherit', timeout: 120000 });

    // Headless-only normalization (S344, post-Mike write-set ruling): the assembly
    // concatenates every voice's MilestoneNotes ("primary / others…"), which in a
    // multi-model cascade re-imports cross-voice disagreement into the tracker's
    // official record (C102 first run: 45-vs-47 figures, submitted-vs-stalled in
    // one note). The tracker note becomes the PRIMARY voice's note only; the other
    // voices' full statements stay in civic-voice JSONs + the production log for
    // media. Interactive runs (operator-curated) are untouched — this rewrites
    // only what this chain is about to apply.
    const decisionsDir = path.join(ROOT, 'output', 'city-civic-database', 'initiatives');
    let normalized = 0;
    for (const slug of fs.existsSync(decisionsDir) ? fs.readdirSync(decisionsDir) : []) {
      const p = path.join(decisionsDir, slug, 'decisions_c' + cycle + '.json');
      const d = readJson(p);
      if (!d || !d.trackerUpdates || typeof d.trackerUpdates.MilestoneNotes !== 'string') continue;
      if (d.trackerUpdates.MilestoneNotes.includes(' / ')) {
        d.trackerUpdates.MilestoneNotes = d.trackerUpdates.MilestoneNotes.split(' / ')[0].trim();
        d._notesNormalized = 'primary-only (cron-civic-run close, S344)';
        fs.writeFileSync(p, JSON.stringify(d, null, 2));
        normalized++;
      }
    }
    if (normalized) log('milestone notes normalized to primary voice: ' + normalized + ' decisions file(s)');

    // civic.38 Task 2 step 2 — Sunday fold: the week's pending moves become
    // tracker fields (work) and a candidate-row set (propose) BEFORE the
    // dry-run, so the gate + clerk + normalizeTrackerWrite see everything.
    const officeMapForFold = readJson(path.join(ROOT, 'scripts', 'civic-office-map.json')) || { offices: [], projects: [] };
    foldMovesIntoDecisions(ROOT, cycle, officeMapForFold);

    // civic.38 Task 6.3 — petition → vote: a petition-pending row whose count
    // clears its support band gets the gated write through the ordinary
    // decisions channel (Status pending-vote, phase vote-scheduled,
    // VoteCycle cycle+1 — the one legal Status transition).
    petitionGateSweep(ROOT, cycle);

    // game-loop amendment (builder 2026-09-21): the call-vote escape hatch
    // rides the same gated channel, after the sweep — a band that cleared
    // already scheduled the row, and a deferred domain is the hatch's
    // precondition, so the two never write the same row.
    callVoteSweep(ROOT, cycle);

    execFileSync('node', [path.join(ROOT, 'scripts', 'applyTrackerUpdates.js'), String(cycle)], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
    return { ok: true, dryOk: true };
  } catch (e) {
    return { ok: false, dryOk: false, error: e.message };
  }
}

// The apply gate as a verdict source: the deterministic prechecks always run;
// the model sanity-read runs only with sanity:true — a `tick` never spends.
function runGate(cycle, opts) {
  const sanity = !opts || opts.sanity !== false;
  const args = [path.join(ROOT, 'scripts', 'cron-civic-gate.js'), '--cycle', String(cycle)];
  if (!sanity) args.push('--no-sanity');
  let exitCode = 0;
  try {
    execFileSync('node', args, { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
  } catch (e) {
    exitCode = e.status == null ? 1 : e.status;
  }
  const rec = readJson(path.join(CIVIC, 'gate_c' + cycle + '.json'));
  if (exitCode === 1) {
    // FATAL — the gate died before writing a fresh record; anything on disk is
    // from an earlier pass and must not stand in for this run's checks.
    return { exitCode, deterministicPass: false, sanityStatus: 'missing', record: null, fatal: true };
  }
  return {
    exitCode,
    deterministicPass: rec ? (rec.deterministicPass !== undefined ? rec.deterministicPass
      : (rec.pass || (rec.failures || []).every(f => f.check === 'sanity-read'))) : false,
    sanityStatus: rec ? (rec.sanityStatus || (rec.sanity ? (rec.sanity.pass ? 'pass' : 'fail') : 'missing')) : 'missing',
    record: rec,
  };
}

// The single executor for the tracker write. Callers write their own close
// record. Only reached when decideApply said apply — the write itself stays
// exactly what applyTrackerUpdates has always done.
function maybeApply(cycle, decision, APPLY, source) {
  if (!decision || !decision.apply) return false;
  if (!APPLY) { log('apply decision is APPLY but this run is dry — re-run with --apply'); return false; }
  if (decision.via === 'cutoff') {
    log('APPLYING UNDER THE VERDICT CUTOFF — missing verdicts: ' + (decision.missingVerdicts || []).join(', ') +
      ' (flagged in the run record; a late FAIL is still a real finding and still blocks any later write)');
  }
  execFileSync('node', [path.join(ROOT, 'scripts', 'applyTrackerUpdates.js'), String(cycle), '--apply'], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
  log('tracker write applied (' + source + ', via ' + (decision.via || 'verdicts') + ')');
  return true;
}

// --stage=tick — the cheap no-model heartbeat (builder-ruled schedule shape:
// hourly all week). Reads the week state, advances the stages whose inputs
// exist WITHOUT spending on a model: the deterministic close half and the
// apply. Idempotent — a second tick on an unchanged week advances nothing and
// does not even rewrite the state file (acceptance 2).
async function runTick() {
  const cycle = arg('--cycle', null) || detectCycle();
  const APPLY = process.argv.includes('--apply');
  console.log('Civic TICK — c' + cycle + (APPLY ? ' (APPLY)' : ' (dry)'));
  console.log('===================================');
  const state = refreshWeekState(loadWeekState(cycle));
  if (!state.engineFiredAt) {
    console.log('[tick] engine has not fired for c' + cycle + ' — nothing to do.');
    // Don't materialize a state file for a week that hasn't opened.
    if (fs.existsSync(weekStatePath(cycle))) saveWeekState(state);
    return;
  }
  if (state.stages.apply.status === 'done') {
    console.log('[tick] c' + cycle + ' already applied — week closed. Nothing to do.');
    saveWeekState(state);
    return;
  }

  // 0. Batch collect — polling a submitted batch is an HTTP GET, not a model
  //    call, so tick may run it. Finished batches land voice JSONs; rejected
  //    or expired seats wait for the next submit window (never inline retry).
  const batchMan = loadBatchManifest(cycle);
  if (batchMan && Object.keys(batchMan.seats).some(s => batchMan.seats[s].status === 'submitted')) {
    try {
      const bc = await batchCollectHearing(cycle, {});
      if (bc.collected.length || bc.rejected.length || bc.expired.length) {
        console.log('[tick] batch-collect: ' + bc.collected.length + ' collected, ' + bc.rejected.length +
          ' rejected, ' + bc.expired.length + ' expired/failed, ' + bc.pending.length + ' still in flight');
      }
    } catch (e) {
      console.error('[tick] batch-collect failed: ' + e.message + ' — retried on a later tick');
    }
  }

  // 1. The deterministic close half (fold, petition sweep, vote stamping, the
  //    deterministic gate checks) — never waits on a model or a missing voice.
  const cd = state.stages['close-det'];
  if (cd.status === 'ready') {
    cd.attempts++; state._dirty = true;
    console.log('[tick] advancing close-det (attempt ' + cd.attempts + ')');
    const det = closeDeterministic(cycle);
    if (!det.ok) {
      console.error('[tick] close-det failed: ' + det.error + ' — stays ready, retried on a later tick');
    } else {
      runGate(cycle, { sanity: false });
    }
    refreshWeekState(state);
  }

  // 2. The apply — itself a no-model write. Fires when decideApply says so:
  //    deterministic pass, no FAIL verdict, verdicts in or cutoff expired.
  const ap = state.stages.apply;
  if (ap.status === 'ready' && ap.inputs.decision && ap.inputs.decision.apply) {
    const decision = ap.inputs.decision;
    if (APPLY) {
      ap.attempts++; state._dirty = true;
      const applied = maybeApply(cycle, decision, true, 'tick');
      if (applied) {
        const p = path.join(CIVIC, 'close_c' + cycle + '.json');
        const prev = readJson(p) || { stage: 'close', cycle: Number(cycle) };
        fs.writeFileSync(p, JSON.stringify(Object.assign(prev, {
          applied: true,
          appliedVia: 'tick:' + (decision.via || 'verdicts'),
          missingVerdicts: decision.missingVerdicts || [],
          clerk: prev.clerk || state.stages['verdict-clerk'].inputs.verdict || 'unknown',
          gatePass: prev.gatePass !== undefined ? prev.gatePass : !!state.stages['close-det'].inputs.deterministicPass,
          sanityStatus: state.stages['verdict-sanity'].inputs.verdict || 'missing',
          laneEntries: prev.laneEntries || 0,
          ranAt: new Date().toISOString(),
        }), null, 2));
      }
      refreshWeekState(state);
    } else {
      console.log('[tick] apply is READY (' + (decision.via || 'verdicts') + (decision.missingVerdicts && decision.missingVerdicts.length ? ', missing: ' + decision.missingVerdicts.join(', ') : '') + ') — dry tick, re-run with --apply to write.');
    }
  }

  saveWeekState(state);
  console.log('[tick] stage board:');
  for (const name of WEEK_STAGES) {
    const s = state.stages[name];
    console.log('  ' + name + ': ' + s.status +
      (s.inputs && s.inputs.pending && s.inputs.pending.length ? ' (pending: ' + s.inputs.pending.join(', ') + ')' : '') +
      (s.inputs && s.inputs.verdict ? ' [' + s.inputs.verdict + ']' : '') +
      (s.inputs && s.inputs.decision && s.inputs.decision.reason ? ' — ' + s.inputs.decision.reason : ''));
  }
}

const STAGES = {
  prep: runPrep, directive: runDirective,
  decide: runMayorOpen, 'mayor-open': runMayorOpen,
  voices: runHearing, hearing: runHearing,
  'mayor-gavel': runMayorGavel,
  projects: runProjects, close: runClose, datawake: runDatawake, chain: runChain, status: runStatus,
  'batch-submit': runBatchSubmit, 'batch-collect': runBatchCollect,
  tick: runTick,
};
if (require.main === module) {
  if (!STAGE || !STAGES[STAGE]) {
    console.error('[civic] unknown or missing --stage (built so far: ' + Object.keys(STAGES).join(', ') + ')');
    process.exit(1);
  }
  Promise.resolve().then(() => STAGES[STAGE]())
    .catch(err => { console.error('[civic] Fatal:', err.message); process.exit(1); });
}

module.exports = { modelChainFor, FALLBACK_MODELS, sentimentWord, crimeWord, retailWord, ailmentPerception, cleanLines, parseApprovalTable, parseHoodTable, outputContract, datawakeUserPrompt, datawakeStatementText, districtPackRef, weekCarryBlock, spliceWeekCarry, loadWeekCarry, hearingHasPhase, noPhaseCheck, prepTargetDirForHood, validateVoiceJson, ungroundedNumbers, statementNumberCheck, composeChecks,
  // civic.38 Task 1 — closed move set (exported for scripts/cron-civic-game.test.js)
  MOVE_TYPES, validateDatawakeMoves, loadInterventionCatalog, hoodAuthorityReason, appendMoveLedger, moveLedgerLines, datawakeRecord,
  // civic.38 Task 2 — move ledger fold (Sunday close)
  loadMoveLedgerFolded, foldMovesIntoDecisions, slugForInitiative,
  // civic.38 Task 6.3 — petition sweep
  petitionGateSweep, PETITION_SUPPORT_BANDS,
  // game-loop amendment 2026-09-21 — the call-vote escape hatch
  callVoteEligibility, callVoteSweep, trackerBeatRows,
  // civic.39 — week-boundary stage machine (exported for scripts/cron-civic-tick.test.js)
  WEEK_STAGES, VERDICT_CUTOFF_MS, weekStatePath, blankWeekState, loadWeekState, saveWeekState,
  engineFireInfo, refreshWeekState, decideApply, closeDeterministic, runGate, maybeApply, runTick,
  // civic.39 Task 3 — batch transport (hearing seats on :batch-eligible models)
  BATCH_PROFILES, batchEligible, batchManifestPath, loadBatchManifest, batchInFlightSlugs,
  hearingSeatPrompt, batchSubmitHearing, batchCollectHearing };
