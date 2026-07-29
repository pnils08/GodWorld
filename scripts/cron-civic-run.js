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
    if (citywide && !projectHoods) {
      L.push(citywideDigest(sections, audit));
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
        if (clean) L.push('', '## Editorial pressure (Mara Vance, Bay Tribune — answer it or own the silence)', clean);
      }
    }

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

const STAGES = { prep: runPrep };
if (require.main === module) {
  if (!STAGE || !STAGES[STAGE]) {
    console.error('[civic] unknown or missing --stage (built so far: ' + Object.keys(STAGES).join(', ') + ')');
    process.exit(1);
  }
  Promise.resolve().then(() => STAGES[STAGE]())
    .catch(err => { console.error('[civic] Fatal:', err.message); process.exit(1); });
}

module.exports = { sentimentWord, crimeWord, retailWord, ailmentPerception, cleanLines, parseApprovalTable, parseHoodTable };
