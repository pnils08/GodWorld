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
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CIVIC = path.join(ROOT, 'output', 'cron-civic');
const PACKETS = path.join(CIVIC, 'packets');

const { lintText } = require('./lintCivicPackets');
const { getDistrictForNeighborhood } = require('../lib/districtMap');
const getCurrentCycle = require('../lib/getCurrentCycle');
const officeWall = require('./officeWall');

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

// Faction -> bloc agent dir (agent topology G-10: 3 bloc agents speak for 9 seats)
const FACTION_AGENT = {
  OPP: 'civic-office-opp-faction',
  CRC: 'civic-office-crc-faction',
  IND: 'civic-office-ind-swing',
};

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
      office: cells[1], faction: cells[3], status: cells[4],
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
      return (inits.join(', ') || 'an initiative') + ' has sat in the same stage for ' + (p.cyclesInState || 'several') + ' cycles without visible movement (' + where + ').';
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
  const tracker = mustJson(path.join(ROOT, 'output', 'initiative_tracker.json'), 'tracker snapshot');
  const truesource = mustJson(path.join(ROOT, 'output', 'desk-packets', 'truesource_reference.json'), 'council truesource');
  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'civic.15 Task 0.2 office map');

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
  let meta = readJson(metaPath);
  if (!meta || String(meta.cycle) !== String(cycle)) {
    log('ledger snapshot stale (' + (meta ? 'cycle ' + meta.cycle : 'missing') + ') — refreshing via dumpLedger.js');
    execFileSync('node', [path.join(ROOT, 'scripts', 'dumpLedger.js'), cycle, '--quiet'], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
    meta = readJson(metaPath);
    if (!meta || String(meta.cycle) !== String(cycle)) throw new Error('ledger snapshot still stale after refresh: ' + JSON.stringify(meta));
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
    const body = [
      cleanInline(impl.summary) ? 'Where it stands: ' + cleanInline(impl.summary) : 'Where it stands: in ' + phaseProse(impl.phase) + '.',
      impl.nextScheduledAction && cleanInline(impl.nextScheduledAction) ? 'On the calendar: ' + cleanInline(impl.nextScheduledAction) + (due ? ' — due THIS cycle.' : '.') : null,
      ...flagNotes,
    ].filter(Boolean).join('\n');
    const topic = { kind: 'initiative', id: init.id, title: init.name + (voteReady ? ' — VOTE PENDING' : due ? ' — action due this cycle' : ' — engine-flagged'), body };
    assign('civic-office-mayor', topic);
    assign(owner, topic);
    if (/stabilization/i.test(init.name)) assign('civic-office-okoro', topic);
    // District routing: initiative hoods -> districts -> faction blocs
    const blocs = new Set();
    for (const hood of init.neighborhoods || []) {
      const d = getDistrictForNeighborhood(hood);
      const seat = d && truesource.council.find(c => c.district === d);
      if (seat) blocs.add(FACTION_AGENT[seat.faction]);
    }
    // G-R11: a pending vote goes to ALL blocs so all 9 positions surface
    if (voteReady && (!impl.nextActionCycle || due)) Object.values(FACTION_AGENT).forEach(d => blocs.add(d));
    for (const b of blocs) assign(b, topic);
  }

  // HIGH ailments: hood -> district bloc; initiative -> owner (already above);
  // crime-flavored -> police chief; ownerless hoods roll up to the Mayor digest.
  for (const p of audit.patterns.filter(p => p.severity === 'high')) {
    const topic = { kind: 'ailment', title: 'Engine review HIGH: ' + p.type.replace(/-/g, ' '), body: ailmentPerception(p) + '\nNo city program currently answers this. Speak to it or own the silence.' };
    const sig = JSON.stringify((p.evidence && p.evidence.fields) || {});
    if (p.type !== 'ledger-completeness') {
      for (const hood of (p.affectedEntities && p.affectedEntities.neighborhoods) || []) {
        const d = getDistrictForNeighborhood(hood);
        const seat = d && truesource.council.find(c => c.district === d);
        if (seat) assign(FACTION_AGENT[seat.faction], topic);
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

  fs.mkdirSync(PACKETS, { recursive: true });
  const written = [];
  const activeSeats = truesource.council.filter(c => c.status === 'active').length;
  for (const dir of Object.keys(assignments)) {
    const rows = officesByDir[dir];
    if (!rows) { log('skip: assignment for ' + dir + ' but no office-map rows with that agentDir'); continue; }
    const topics = assignments[dir];
    const isBloc = Object.values(FACTION_AGENT).includes(dir);
    const citywide = rows.every(r => r.district === 'citywide' || !r.district);
    const L = [];

    if (isBloc) {
      const members = truesource.council.filter(c => FACTION_AGENT[c.faction] === dir);
      L.push('# Pending Decisions — ' + rows[0].faction + ' bloc (' + members.map(m => m.name.split(' ').pop() + ' ' + m.district).join(', ') + ') — Cycle ' + cycle);
      L.push('');
      L.push('## Live roster status (whip-read off THIS, not memory)');
      for (const m of truesource.council) {
        L.push('- ' + m.district + ' ' + m.name + ' (' + m.faction + ') — ' + m.status.toUpperCase() + (m.status !== 'active' ? ' (named absentee, not voting)' : '') + (approvals[m.name] ? '. Approval ' + approvals[m.name].approval + (approvals[m.name].delta ? ' (' + (approvals[m.name].delta > 0 ? 'up' : 'down') + ' ' + Math.abs(approvals[m.name].delta) + ' since last cycle)' : ' (holding)') : ''));
      }
      L.push('- Full council: ' + activeSeats + ' active of 9 → a majority is ' + (Math.floor(activeSeats / 2) + 1) + '.');
    } else {
      const o = rows[0];
      const appr = approvals[o.holder];
      L.push('# Pending Decisions — ' + o.title + ' ' + o.holder + ' — Cycle ' + cycle);
      L.push('');
      if (appr) L.push('Your approval stands at ' + appr.approval + (appr.delta ? ' — ' + (appr.delta > 0 ? 'up' : 'down') + ' ' + Math.abs(appr.delta) + ' since last cycle.' : ' — holding.'));
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
        if (clean) L.push('', '## Directive from Mara Vance, City Planning Director — answer it or own the silence', clean);
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

    const outPath = path.join(PACKETS, dir + '_pending_decisions_c' + cycle + '.md');
    fs.writeFileSync(outPath, L.join('\n') + '\n');
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
  // Vote-ready routing check (G-R11)
  const voteInits = hotInits.filter(i => /vote-ready/i.test((i.implementation || {}).phase || '') || /vote-ready/i.test(i.status || ''));
  for (const vi of voteInits) {
    for (const blocDir of Object.values(FACTION_AGENT)) {
      const has = (assignments[blocDir] || []).some(t => t.id === vi.id);
      if (!has) { console.error('  ✗ G-R11: vote-pending ' + vi.id + ' not routed to ' + blocDir); leaks++; }
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
          if (j.error) return reject(new Error(model + ': ' + (j.error.message || JSON.stringify(j.error))));
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
  const tracker = mustJson(path.join(ROOT, 'output', 'initiative_tracker.json'), 'tracker snapshot');

  // Friction rule (plan Task 2.2): the directive's model family must differ
  // from the Mayor's writer family.
  const mayorModel = (officeMap.offices.find(o => o.officeId === 'MAYOR-01') || {}).model || '';
  const MODEL = arg('--model', 'google/gemini-3.5-flash');
  if (modelFamily(MODEL) === modelFamily(mayorModel)) {
    console.error('FRICTION VIOLATION: directive model family "' + modelFamily(MODEL) + '" matches the Mayor\'s writer family. Pick a different --model.');
    process.exit(2);
  }

  // Mara persona: IN_WORLD_CHARACTER.md only (Mike-direct S344). The
  // VOICE_DIRECTIVE_TEMPLATE is an apparatus doc (.claude paths, audit paths,
  // owner sign-off) — feeding it whole put out-of-sim framing in her context.
  // The directive craft is distilled into the in-world brief below instead.
  const DIRECTIVE_BRIEF = [
    '## Your cycle directive — how you work this desk',
    '',
    'Each cycle you review the city\'s live record and issue directives to the offices and',
    'program directors who owe the public an answer. You are the city\'s institutional',
    'memory: you catch the unresolved thread, the number nobody published, the office gone',
    'quiet while a decision depends on them.',
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
  ].join('\n');
  const persona = [
    mustRead(path.join(ROOT, 'docs', 'mara-vance', 'IN_WORLD_CHARACTER.md'), 'Mara persona'),
    DIRECTIVE_BRIEF,
  ].join('\n\n---\n\n');

  // Valid addressees = the chain's live seats (office map, agented only).
  const seats = [];
  const seen = new Set();
  for (const o of [...officeMap.offices, ...(officeMap.projects || [])]) {
    if (!o.agentDir || seen.has(o.agentDir)) continue;
    seen.add(o.agentDir);
    seats.push({ agentDir: o.agentDir, holder: o.holder, title: o.title });
  }

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
  const files = ['IDENTITY.md', 'LENS.md', 'RULES.md']
    .map(f => path.join(agentPath(dir), f)).filter(fs.existsSync);
  if (!files.length) throw new Error('no persona files under .claude/agents/' + dir);
  return files.map(f => fs.readFileSync(f, 'utf8')).join('\n\n---\n\n');
}
function stripFences(t) {
  const s = String(t).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  return (a !== -1 && b > a) ? s.slice(a, b + 1) : s;
}
function outputContract(officeSlug, cycle, initiatives) {
  // FLAT trackerUpdates + InitiativeID — the shape validateTrackerUpdates and
  // applyTrackerUpdates actually write. (First C102 chain run used the eval
  // harness's keyed-by-name shape; every write validated as unresolvable/dark.)
  const initList = (initiatives || []).map(i => '  - ' + i.id + ' = ' + i.name).join('\n');
  return '\nRespond with ONLY a JSON object (no markdown fences, no prose before or after):\n' +
    JSON.stringify({
      office: officeSlug, cycle: Number(cycle), speaker: '<the office-holder\'s full name>',
      cascadeSummary: '<2-4 sentences: what you decided and why>',
      statements: [{
        statementId: 'STMT-' + cycle + '-' + officeSlug + '-001', type: '<statement type>',
        topic: '<topic>', initiative: '<exact initiative name from the list below, or null>',
        decision: '<the concrete decision>', quote: '<one strong pull-quote in your voice>',
        fullStatement: '<the full public statement in your voice>', trackerUpdates: {}
      }]
    }, null, 2) +
    '\nIf (and only if) a statement changes an initiative\'s state, fill trackerUpdates as a FLAT object whose "initiative" field is the INIT id (this exact key/format — the pipeline attributes the write by it):\n' +
    '{"initiative": "INIT-XXX", "ImplementationPhase": "<value or omit if unchanged>", "MilestoneNotes": "C' + cycle + ': <one sentence, max 200 chars>", "NextScheduledAction": "<optional>", "NextActionCycle": <optional number>}\n' +
    'Known initiatives:\n' + initList + '\n' +
    'A statement with no state change keeps trackerUpdates as {} (empty).\n' +
    'ImplementationPhase MUST be one of: ' + [...PHASES].join(', ') + '.\n' +
    'Never invent citizens, businesses, statistics, or votes not present in your packet.';
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
    // flat shape (the contract) — plus keyed-by-name tolerance for drifted models
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
async function callVoice(dir, model, userPrompt, maxTokens) {
  const persona = readPersonaDir(dir);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await callOpenRouter(model, persona, userPrompt, maxTokens || 4000);
      const v = validateVoiceJson(r.text);
      if (v.ok) return { json: v.json, usage: r.usage, attempts: attempt };
      log(dir + ' attempt ' + attempt + ' invalid: ' + v.why);
      if (attempt === 2) return { error: v.why, raw: r.text };
      userPrompt += '\n\nYOUR PREVIOUS ATTEMPT WAS REJECTED: ' + v.why + '. Respond with ONLY the corrected JSON object.';
    } catch (e) {
      log(dir + ' attempt ' + attempt + ' call failed: ' + e.message);
      if (attempt === 2) return { error: e.message };
    }
  }
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
function officeModel(officeMap, dir) {
  const row = [...officeMap.offices, ...(officeMap.projects || [])].find(o => o.agentDir === dir && o.model);
  if (!row) throw new Error('no model in civic-office-map.json for ' + dir);
  return row.model;
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

// --- stage: decide (Mayor only, then cascade injection) ---
async function runDecide() {
  const cycle = arg('--cycle', null) || detectCycle();
  console.log('Civic DECIDE (Mayor) — c' + cycle);
  console.log('===================================');
  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const initiatives = (mustJson(path.join(ROOT, 'output', 'initiative_tracker.json'), 'tracker snapshot').initiatives) || [];
  const packet = mustRead(packetPathFor('civic-office-mayor', cycle), 'run --stage=prep first');
  const model = officeModel(officeMap, 'civic-office-mayor');
  log('mayor model=' + model);
  const wallInj = await positionWallInject(officeMap, 'civic-office-mayor');
  const user = 'YOUR PENDING DECISIONS PACKET (cycle ' + cycle + '):\n\n' + packet + wallInj + '\n\n' + outputContract('mayor', cycle, initiatives);
  const r = await callVoice('civic-office-mayor', model, user, 5000);
  if (!r || r.error) {
    console.error('HALT: Mayor call failed — ' + (r ? r.error : 'no result') + '. Chain must not proceed (everything cascades from her).');
    if (r && r.raw) { fs.mkdirSync(CIVIC, { recursive: true }); fs.writeFileSync(path.join(CIVIC, 'decide_c' + cycle + '.raw.txt'), r.raw); }
    process.exit(1);
  }
  const outPath = writeVoiceJson('mayor', cycle, r.json);
  await positionWallRecordCascade(officeMap, 'civic-office-mayor', r.json, cycle);

  // Cascade: strip-then-append the Mayor's decisions into every other packet
  // (idempotent — a re-run replaces the section, it never stacks).
  const MARKER = "## MAYOR'S DECISIONS THIS CYCLE";
  const cascade = [MARKER, ''];
  for (const st of r.json.statements) {
    const line = cleanInline([st.topic ? st.topic + ': ' : '', st.decision, st.quote ? ' — "' + st.quote + '"' : ''].join(''));
    if (line) cascade.push('- ' + line);
  }
  cascade.push('', 'The Mayor has spoken. React in your own voice — support, oppose, or go your own way.');
  let injected = 0;
  for (const f of fs.readdirSync(PACKETS)) {
    if (!f.endsWith('_c' + cycle + '.md') || f.startsWith('civic-office-mayor')) continue;
    const p = path.join(PACKETS, f);
    let body = fs.readFileSync(p, 'utf8');
    const at = body.indexOf(MARKER);
    if (at !== -1) body = body.slice(0, at).replace(/\n+$/, '\n');
    fs.writeFileSync(p, body.replace(/\n+$/, '\n') + '\n' + cascade.join('\n') + '\n');
    const issues = lintText(fs.readFileSync(p, 'utf8'));
    if (issues.length) { console.error('HALT: cascade injection leaked telemetry into ' + f + ' — ' + issues.map(i => i.match).join(', ')); process.exit(1); }
    injected++;
  }
  fs.mkdirSync(CIVIC, { recursive: true });
  fs.writeFileSync(path.join(CIVIC, 'decide_c' + cycle + '.json'), JSON.stringify({
    stage: 'decide', cycle: Number(cycle), model, output: outPath,
    statements: r.json.statements.length, cascadeInjected: injected,
    attempts: r.attempts, usage: r.usage, ranAt: new Date().toISOString(),
  }, null, 2));
  console.log('\n=== decide complete: ' + r.json.statements.length + ' statement(s) → ' + outPath + '; cascade into ' + injected + ' packet(s) ===');
}

// --- stage: voices (Layer 2, parallel, per-office models) ---
async function runVoices() {
  const cycle = arg('--cycle', null) || detectCycle();
  console.log('Civic VOICES (Layer 2) — c' + cycle);
  console.log('===================================');
  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const initiatives = (mustJson(path.join(ROOT, 'output', 'initiative_tracker.json'), 'tracker snapshot').initiatives) || [];
  if (!fs.existsSync(path.join(ROOT, 'output', 'civic-voice', 'mayor_c' + cycle + '.json'))) {
    throw new Error('no mayor_c' + cycle + '.json — run --stage=decide first (the cascade order is canonical)');
  }
  const dirs = fs.readdirSync(PACKETS)
    .filter(f => f.endsWith('_c' + cycle + '.md'))
    .map(f => f.replace('_pending_decisions_c' + cycle + '.md', ''))
    .filter(d => d !== 'civic-office-mayor' && !LAYER3_DIRS.has(d));
  log('layer-2 seats with packets: ' + dirs.join(', '));
  const results = [];
  await Promise.all(dirs.map(async dir => {
    const slug = voiceSlug(dir);
    try {
      const model = officeModel(officeMap, dir);
      const packet = fs.readFileSync(packetPathFor(dir, cycle), 'utf8');
      const wallInj = await positionWallInject(officeMap, dir);
      const user = 'YOUR PENDING DECISIONS PACKET (cycle ' + cycle + ') — the Mayor\'s decisions are at the bottom; react to them:\n\n' + packet + wallInj + '\n\n' + outputContract(slug, cycle, initiatives);
      const r = await callVoice(dir, model, user, 4000);
      if (!r || r.error) { results.push({ dir, slug, model, ok: false, error: r ? r.error : 'no result' }); return; }
      const out = writeVoiceJson(slug, cycle, r.json);
      await positionWallRecordCascade(officeMap, dir, r.json, cycle);
      results.push({ dir, slug, model, ok: true, output: out, statements: r.json.statements.length, attempts: r.attempts });
    } catch (e) { results.push({ dir, slug, ok: false, error: e.message }); }
  }));
  fs.writeFileSync(path.join(CIVIC, 'voices_c' + cycle + '.json'), JSON.stringify({
    stage: 'voices', cycle: Number(cycle), results, ranAt: new Date().toISOString(),
  }, null, 2));
  const failed = results.filter(x => !x.ok);
  for (const x of results) console.log('  [' + (x.ok ? '✓' : '✗') + '] ' + x.slug + (x.ok ? ' — ' + x.statements + ' statement(s) (' + x.model + ')' : ' — ' + x.error));
  if (failed.length) {
    console.error('\nHALT: ' + failed.length + ' voice(s) failed — fix or rerun before projects (Step 5.5 completeness).');
    process.exit(1);
  }
  console.log('\n=== voices complete: ' + results.length + '/' + results.length + ' ok ===');
}

// --- stage: projects (Layer 3 — only where a decision touched their initiative) ---
async function runProjects() {
  const cycle = arg('--cycle', null) || detectCycle();
  console.log('Civic PROJECTS (Layer 3) — c' + cycle);
  console.log('===================================');
  const officeMap = mustJson(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'office map');
  const tracker = mustJson(path.join(ROOT, 'output', 'initiative_tracker.json'), 'tracker snapshot');
  const voiceJsons = loadVoiceJsons(cycle);
  if (!voiceJsons.mayor) throw new Error('no mayor_c' + cycle + '.json — run decide/voices first');
  const layer12 = Object.fromEntries(Object.entries(voiceJsons).filter(([s]) => !['baylight_authority', 'stabilization_fund', 'oari', 'health_center', 'transit_hub'].includes(s)));

  const results = [];
  for (const seat of projectSeats(officeMap)) {
    const slug = voiceSlug(seat.agentDir);
    const touches = statementsTouching(layer12, seat.initiative, tracker);
    if (!touches.length) { log('skip ' + slug + ' — no voice decision touched ' + seat.initiative + ' (Step 5 trigger rule)'); continue; }
    try {
      const model = officeModel(officeMap, seat.agentDir);
      const packet = fs.existsSync(packetPathFor(seat.agentDir, cycle)) ? fs.readFileSync(packetPathFor(seat.agentDir, cycle), 'utf8') : '';
      const frame = touches.map(t => '- [' + t.slug + '] ' + (t.st.decision || '') + (t.st.quote ? ' — "' + t.st.quote + '"' : '')).join('\n');
      const wallInj = await positionWallInject(officeMap, seat.agentDir);
      const user = [
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
      const r = await callVoice(seat.agentDir, model, user, 4000);
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
  if (failed.length) { console.error('\nHALT: ' + failed.length + ' project(s) failed.'); process.exit(1); }
  console.log('\n=== projects complete: ' + results.length + ' ran ===');
}

// --- stage: close (Clerk -> assemble -> dry-run -> gate -> [--apply] -> log) ---
async function runClose() {
  const cycle = arg('--cycle', null) || detectCycle();
  const APPLY = process.argv.includes('--apply');
  console.log('Civic CLOSE — c' + cycle + (APPLY ? ' (APPLY)' : ' (dry — decisions staged, no sheet write)'));
  console.log('===================================');
  const voiceJsons = loadVoiceJsons(cycle);

  // Step 5.5 completeness: everything decide/voices/projects reported as ok.
  const expected = ['mayor'];
  const vMan = readJson(path.join(CIVIC, 'voices_c' + cycle + '.json'));
  const pMan = readJson(path.join(CIVIC, 'projects_c' + cycle + '.json'));
  if (!vMan || !pMan) throw new Error('missing voices/projects manifest under output/cron-civic/ — run the earlier stages first');
  expected.push(...vMan.results.filter(x => x.ok).map(x => x.slug));
  expected.push(...pMan.results.filter(x => x.ok).map(x => x.slug));
  const missing = expected.filter(s => !voiceJsons[s]);
  if (missing.length) { console.error('HALT: expected voice JSON(s) missing: ' + missing.join(', ')); process.exit(1); }
  log('completeness: ' + expected.length + ' voice JSONs present (' + expected.join(', ') + ')');

  // Clerk verification — headless call on the STAFF model (deepseek per Task 1.2).
  const clerkModel = arg('--clerk-model', 'deepseek/deepseek-chat');
  const clerkPersona = readPersonaDir('city-clerk');
  const clerkUser = [
    'Cycle ' + cycle + ' civic outputs for verification. For each check answer pass/fail with one line of evidence.',
    'Checks: (1) every expected office produced statements; (2) no single office contradicts ITSELF within its own statements; (3) tracker updates use only contract phases; (4) statements read as in-world civic voice (no engine/system language).',
    'Cross-office disagreement (two offices naming different figures or phases) is EXPECTED POLITICS, not a failure — list any you see under "observations", never under failed checks; the apply gate separately audits the final write-set.',
    '',
    ...expected.map(s => {
      const j = voiceJsons[s];
      return '## ' + s + '\n' + (j.statements || []).map(st => '- ' + (st.decision || '') + ' | trackerUpdates: ' + JSON.stringify(st.trackerUpdates || {})).join('\n');
    }),
    '',
    'Respond with ONLY JSON: {"cycle": ' + cycle + ', "checks": [{"check": "<name>", "pass": true|false, "evidence": "<one line>"}], "overall": "pass"|"fail", "issues": ["..."]}',
  ].join('\n');
  let clerk = null;
  try {
    const cr = await callOpenRouter(clerkModel, clerkPersona, clerkUser, 3000);
    clerk = JSON.parse(stripFences(cr.text));
  } catch (e) {
    clerk = { overall: 'fail', issues: ['clerk call/parse failed: ' + e.message] };
  }
  const clerkDir = path.join(ROOT, 'output', 'city-civic-database');
  fs.mkdirSync(clerkDir, { recursive: true });
  fs.writeFileSync(path.join(clerkDir, 'clerk_audit_c' + cycle + '.json'), JSON.stringify(clerk, null, 2));
  log('clerk: ' + (clerk.overall || 'unknown') + ((clerk.issues || []).length ? ' — ' + clerk.issues.join('; ').slice(0, 300) : ''));

  // Assemble decisions files, then tracker dry-run (both existing scripts).
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
  let dryOut = '';
  try {
    dryOut = execFileSync('node', [path.join(ROOT, 'scripts', 'applyTrackerUpdates.js'), String(cycle)], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
    process.stdout.write(dryOut);
  } catch (e) {
    console.error('HALT: applyTrackerUpdates dry-run failed: ' + e.message);
    process.exit(1);
  }

  // Mechanical gate (Task 2.4) — fail-closed: gate exit != 0 means staged, no apply.
  let gatePass = false;
  try {
    execFileSync('node', [path.join(ROOT, 'scripts', 'cron-civic-gate.js'), '--cycle', String(cycle)], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
    gatePass = true;
  } catch (e) {
    console.error('[civic] gate BLOCKED (exit ' + (e.status == null ? '?' : e.status) + ') — decisions remain staged, no sheet write.');
  }

  let applied = false;
  if (gatePass && APPLY && clerk.overall === 'pass') {
    execFileSync('node', [path.join(ROOT, 'scripts', 'applyTrackerUpdates.js'), String(cycle), '--apply'], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
    applied = true;
    // Refresh the local snapshot the datawakes read (output/initiative_tracker.json)
    // so Mon-Thu office wakes see the state this close just filed — without this,
    // the snapshot serves pre-apply state until the next engine export and every
    // daily slice all week contradicts what the officials decided on Sunday.
    try {
      execFileSync('node', [path.join(ROOT, 'scripts', 'buildInitiativePackets.js')], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
    } catch (e2) {
      console.error('[civic] snapshot refresh failed (sheet is applied; datawakes will read stale snapshot until next refresh): ' + e2.message);
    }
  } else if (APPLY) {
    console.error('[civic] --apply requested but ' + (gatePass ? 'clerk verdict is not pass' : 'gate blocked') + ' — NOT applying.');
  }

  // Production log: ## /city-hall section (idempotent replace) + media handoff.
  const plog = path.join(ROOT, 'output', 'production_log_c' + cycle + '.md');
  const rows = expected.map(s => {
    const j = voiceJsons[s];
    const st = (j.statements || [])[0] || {};
    return '| ' + (j.speaker || s) + ' | ' + cleanInline(st.decision || '—') + ' | "' + cleanInline(st.quote || '') + '" |';
  });
  const trackerRows = [];
  for (const s of expected) {
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
    '**Clerk:** ' + (clerk.overall || 'unknown'),
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
    if (!gatePass) legLines.push('- G-R (AUTO): apply gate blocked — see output/cron-civic/gate_c' + cycle + '.json');
    if (clerk.overall !== 'pass') legLines.push('- G-R (AUTO): clerk verdict ' + (clerk.overall || 'unknown') + ' — see clerk_audit_c' + cycle + '.json');
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
  for (const s of expected) {
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
    stage: 'close', cycle: Number(cycle), expected, clerk: clerk.overall || 'unknown',
    gatePass, applied, clerkModel, laneEntries: laneEntries.length, ranAt: new Date().toISOString(),
  }, null, 2));
  console.log('\n=== close complete: clerk=' + (clerk.overall || 'unknown') + ' gate=' + (gatePass ? 'PASS' : 'BLOCKED') + ' applied=' + applied + ' ===');
  if (!gatePass || clerk.overall !== 'pass') process.exit(1);
}

// ---------------------------------------------------------------------------
// Task 3.1/3.2 — Mon-Thu datawakes: office-holders voice their city-data domain
// ---------------------------------------------------------------------------

const DATAWAKE_DIR = path.join(CIVIC, 'datawake');

// Deterministic domain-data slice per office — perception-translated, bounded.
// Keyed on the map's dataDomain (the dataSources strings are loose candidates;
// the structured world_summary parse is the reliable substrate).
function domainSlice(office, sections, hoods, briefs, tracker, audit) {
  const L = [];
  const domain = String(office.dataDomain || '');
  const initLines = (ids) => (tracker.initiatives || [])
    .filter(i => ids.includes(i.id))
    .map(i => cleanInline('- ' + i.name + ': ' + (i.implementation || {}).summary))
    .filter(Boolean);
  if (office.district && /^D\d$/.test(office.district)) {
    for (const h of Object.keys(hoods)) {
      if (getDistrictForNeighborhood(h) === office.district) {
        const line = hoodPulseLine(h, hoods[h], briefs);
        if (line) L.push(line);
      }
    }
  } else if (office.neighborhoods) {
    for (const h of office.neighborhoods) {
      const line = hoodPulseLine(h, hoods[h], briefs);
      if (line) L.push(line);
    }
    if (office.initiative) L.push(...initLines([office.initiative]));
  } else if (/justice|crime|safety|police|emergency/i.test(domain)) {
    for (const [h, s] of Object.entries(hoods)) {
      if (s.crime >= 2.5) L.push('- ' + h + ': crime running ' + crimeWord(s.crime) + '.');
    }
    L.push(...initLines(['INIT-002']));
    const ev = cleanLines(findSection(sections, 'World Events')).split('\n').filter(l => /SAFETY|CRIME/i.test(l));
    L.push(...ev.slice(0, 4));
  } else if (/econom|business|development/i.test(domain)) {
    for (const [h, s] of Object.entries(hoods)) {
      if (s.retail < 5 || s.retail >= 10) L.push('- ' + h + ': street trade ' + retailWord(s.retail) + '.');
    }
    L.push(...initLines(['INIT-001', 'INIT-006', 'INIT-007']));
  } else if (/health/i.test(domain)) {
    const cs = findSection(sections, 'City State');
    const ill = (cs.match(/Illness rate ([\d.]+)%/) || [])[1];
    if (ill) L.push('- Roughly ' + (parseFloat(ill) >= 9 ? 'one in ten' : 'fewer than one in ten') + ' residents are sick this cycle.');
    L.push(...initLines(['INIT-005']));
  } else {
    // citywide-governance and everything else: the translated city digest
    L.push(citywideDigest(sections, audit).split('\n').slice(0, 8).join('\n'));
  }
  return L.filter(Boolean).join('\n').slice(0, 2200);
}

// A bloc agent's datawake speaks through the bloc SPOKESPERSON (civic.md
// faction table: OPP=Rivers D5, CRC=Ashford D7; IND datawakes go to Vega D4 as
// Council President), not whichever member row happens to sort first.
const BLOC_SPOKESPERSON_DISTRICT = {
  'civic-office-opp-faction': 'D5',
  'civic-office-crc-faction': 'D7',
  'civic-office-ind-swing': 'D4',
};

// LRU rota: least-recently-woken duty seats first (scan existing datawake files).
function datawakeRota(officeMap, limit) {
  const seats = [];
  const byDir = {};
  for (const o of [...officeMap.offices, ...(officeMap.projects || [])]) {
    if (!o.agentDir) continue;
    (byDir[o.agentDir] = byDir[o.agentDir] || []).push(o);
  }
  for (const [dir, rows] of Object.entries(byDir)) {
    const wantDistrict = BLOC_SPOKESPERSON_DISTRICT[dir];
    seats.push(wantDistrict ? (rows.find(r => r.district === wantDistrict) || rows[0]) : rows[0]);
  }
  const lastWake = {};
  if (fs.existsSync(DATAWAKE_DIR)) {
    for (const f of fs.readdirSync(DATAWAKE_DIR)) {
      const m = f.match(/^(.+)_(\d{4}-\d{2}-\d{2})\.json$/);
      if (m) lastWake[m[1]] = (lastWake[m[1]] || '') < m[2] ? m[2] : lastWake[m[1]];
    }
  }
  seats.sort((a, b) => (lastWake[a.agentDir] || '').localeCompare(lastWake[b.agentDir] || '') || a.agentDir.localeCompare(b.agentDir));
  return seats.slice(0, limit);
}

// Numeric grounding: every digit-token in a datawake's output must appear in
// the office's own data slice (commas stripped). Worded quantities ("seven
// neighborhoods") pass; invented statistics ("renewals up 8%") don't — this
// output is media-lane source material, so a fabricated number is contamination.
function ungroundedNumbers(slice, texts, context) {
  const norm = s => String(s || '').replace(/,/g, '');
  const hay = norm(slice);
  // Identity numbers an office legitimately says without them being in its data
  // slice: its own district ("District 4"), the cycle it's living in, and the
  // prior cycle it cites. First live cron run rejected all three as fabricated
  // (IND on "4", Okoro on "102") — false positives, not invented statistics.
  const allowed = new Set();
  const ctx = context || {};
  const d = String(ctx.district || '').match(/\d+/);
  if (d) allowed.add(d[0]);
  if (ctx.cycle) { allowed.add(String(ctx.cycle)); allowed.add(String(Number(ctx.cycle) - 1)); }
  const bad = new Set();
  for (const t of texts) {
    for (const tok of norm(t).match(/\d+(?:\.\d+)?%?/g) || []) {
      const bare = tok.replace(/%$/, '');
      if (allowed.has(bare) || hay.includes(bare)) continue;
      bad.add(tok);
    }
  }
  return [...bad];
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
  const tracker = mustJson(path.join(ROOT, 'output', 'initiative_tracker.json'), 'tracker snapshot');
  const audit = mustJson(path.join(ROOT, 'output', 'engine_audit_c' + cycle + '.json'), 'engine audit');
  const briefsFile = readJson(path.join(ROOT, 'output', 'baseline_briefs_c' + cycle + '.json')) || {};
  const briefs = briefsFile.briefs || [];
  const sections = splitSections(mustRead(path.join(ROOT, 'output', 'world_summary_c' + cycle + '.md'), 'world summary'));
  const hoods = parseHoodTable(findSection(sections, 'City State'));

  let rota;
  if (ONLY) {
    const rows = [...officeMap.offices, ...(officeMap.projects || [])].filter(o => o.agentDir === ONLY);
    const wantDistrict = BLOC_SPOKESPERSON_DISTRICT[ONLY];
    rota = rows.length ? [wantDistrict ? (rows.find(r => r.district === wantDistrict) || rows[0]) : rows[0]] : [];
  } else {
    rota = datawakeRota(officeMap, LIMIT);
  }
  if (!rota.length) throw new Error('no duty seats matched');
  log('rota: ' + rota.map(o => o.agentDir).join(', '));

  fs.mkdirSync(DATAWAKE_DIR, { recursive: true });
  const results = [];
  for (const office of rota) {
    try {
      const slice = domainSlice(office, sections, hoods, briefs, tracker, audit);
      const wallInj = await positionWallInject(officeMap, office.agentDir);
      const user = [
        'It\'s a working ' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] + 'day at your office. This is your domain\'s live picture this cycle:',
        '', slice, '',
        wallInj,
        'Speak as yourself doing the job — one public statement or action about what these numbers mean for the people you serve. You argue initiatives on Sundays; today you fight for your constituents with what your desk shows you.',
        'Respond with ONLY JSON (no fences): {"office": "' + voiceSlug(office.agentDir) + '", "holder": "' + office.holder + '", "statement": "<2-4 sentences in your voice>", "action": "<the one concrete thing you are doing about it today, or null>", "numberMoved": "<the single most important number/shift in plain words>"}',
        'Never invent citizens, statistics, or events not present above.',
      ].join('\n');
      const persona = readPersonaDir(office.agentDir);
      let j = null;
      let attemptUser = user;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const r = await callOpenRouter(office.model || 'deepseek/deepseek-chat', persona, attemptUser, 1500);
        let cand = null;
        try { cand = JSON.parse(stripFences(r.text)); } catch (_) { cand = null; }
        // kimi-k2 returned empty content on the first live IND wake (same class
        // as the glm-4.7 bake-off failure) — JSON.parse('') / 'null' yields null.
        if (!cand || typeof cand !== 'object' || !cand.statement) {
          if (attempt === 2) throw new Error('no usable JSON statement after retry (model returned empty/invalid content)');
          log(office.agentDir + ' attempt ' + attempt + ': empty/invalid model output — retrying');
          attemptUser = user + '\n\nYOUR PREVIOUS ATTEMPT RETURNED NO USABLE JSON. Respond with ONLY the JSON object described above.';
          continue;
        }
        const bad = ungroundedNumbers(slice, [cand.statement, cand.action, cand.numberMoved], { district: office.district, cycle });
        if (!bad.length) { j = cand; break; }
        log(office.agentDir + ' attempt ' + attempt + ': ungrounded number(s) ' + bad.join(', '));
        if (attempt === 2) throw new Error('fabricated statistic(s) after retry: ' + bad.join(', '));
        attemptUser = user + '\n\nYOUR PREVIOUS ATTEMPT WAS REJECTED: it cited number(s) [' + bad.join(', ') + '] that are NOT in your data. Use only quantities present in the material above, or say it in words without inventing figures.';
      }
      const rec = {
        office: voiceSlug(office.agentDir), agentDir: office.agentDir, holder: office.holder,
        popid: office.popid, title: office.title, date, cycle: Number(cycle),
        model: office.model, statement: j.statement, action: j.action || null,
        numberMoved: j.numberMoved || null, ranAt: new Date().toISOString(),
      };
      const outPath = path.join(DATAWAKE_DIR, office.agentDir + '_' + date + '.json');
      fs.writeFileSync(outPath, JSON.stringify(rec, null, 2));
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
  if (readJson(path.join(CIVIC, 'close_c' + cycle + '.json'))) {
    console.log('[chain] close_c' + cycle + '.json already exists — chain already ran this cycle. Exiting clean.');
    return;
  }
  const need = ['world_summary_c' + cycle + '.md', 'engine_audit_c' + cycle + '.json'];
  const missing = need.filter(f => !fs.existsSync(path.join(ROOT, 'output', f)));
  if (missing.length) {
    console.log('[chain] engine has not fired for c' + cycle + ' yet (missing: ' + missing.join(', ') + '). Exiting clean.');
    return;
  }
  for (const stage of [runDirective, runPrep, runDecide, runVoices, runProjects, runClose]) {
    await stage();   // each stage fails loud (process.exit) — a failure halts the chain with state staged
  }
}

const STAGES = { prep: runPrep, directive: runDirective, decide: runDecide, voices: runVoices, projects: runProjects, close: runClose, datawake: runDatawake, chain: runChain };
if (require.main === module) {
  if (!STAGE || !STAGES[STAGE]) {
    console.error('[civic] unknown or missing --stage (built so far: ' + Object.keys(STAGES).join(', ') + ')');
    process.exit(1);
  }
  Promise.resolve().then(() => STAGES[STAGE]())
    .catch(err => { console.error('[civic] Fatal:', err.message); process.exit(1); });
}

module.exports = { sentimentWord, crimeWord, retailWord, ailmentPerception, cleanLines, parseApprovalTable, parseHoodTable };
