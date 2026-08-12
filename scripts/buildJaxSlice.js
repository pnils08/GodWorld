#!/usr/bin/env node
/**
 * buildJaxSlice.js — Grok-owned firebrand stink slice (pipeline.46)
 *
 * Not Mags desk-slice. Emits a Jax assignment pack: top stink + contradiction
 * frame + citizens with RoleType + scene-color from existing cycle artifacts
 * (weather, neighborhood_texture, Who Lived It, Chaos_Cars, bonds).
 *
 * Color is bounded: only pointers and ledger-backed profiles. Jax may invent
 * bar/street texture that contradicts nothing; he may not invent careers or
 * people. Scene pack is what the data cannot *be* — sensory room to write into.
 *
 * Usage:
 *   node scripts/buildJaxSlice.js --cycle 102
 *   node scripts/buildJaxSlice.js --cycle 102 --json
 *   const { buildJaxSlice, loadJaxSlice, writeJaxSlice } = require('./buildJaxSlice');
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COMPARE = path.join(ROOT, 'output', 'cron-compare');

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}
function loadText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return null; }
}

function extractSection(md, heading) {
  if (!md) return null;
  const re = new RegExp('^##\\s+' + heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'mi');
  const m = md.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^##\s+/m);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

function extractHoodTexture(textureMd, hood) {
  if (!textureMd || !hood) return null;
  // ### Fruitvale
  const re = new RegExp('^###\\s+' + hood.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'mi');
  const m = textureMd.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = textureMd.slice(start);
  const next = rest.search(/^###\s+/m);
  const body = (next < 0 ? rest : rest.slice(0, next)).trim();
  return body || null;
}

function weatherLine(summary) {
  if (!summary) return null;
  const m = summary.match(/\*\*Season:\*\*[^\n]+/i);
  return m ? m[0].replace(/\*\*/g, '').trim() : null;
}

function chaosLinesForHood(summary, hood) {
  if (!summary || !hood) return [];
  const sec = extractSection(summary, 'Chaos Events') || '';
  const lines = [];
  for (const line of sec.split('\n')) {
    if (line.includes(hood) || (hood === 'Jack London' && line.includes('Jack London'))) {
      lines.push(line.trim());
    }
  }
  return lines.slice(0, 6);
}

function whoLivedForHood(summary, hood) {
  if (!summary || !hood) return [];
  const sec = extractSection(summary, 'Who Lived It') || '';
  const out = [];
  for (const line of sec.split('\n')) {
    if (line.includes('(' + hood + ')') || line.includes('— ' + hood) || line.endsWith(hood)) {
      out.push(line.replace(/^-\s*/, '').trim());
    }
  }
  return out.slice(0, 8);
}

function loadBondEdges(root, popids) {
  const want = new Set((popids || []).map(String));
  if (!want.size) return [];
  const p = path.join(root, 'output', 'bond-ledger-live.tsv');
  let text;
  try { text = fs.readFileSync(p, 'utf8'); } catch (_) { return []; }
  const lines = text.split('\n');
  let header = null;
  const edges = [];
  for (const line of lines) {
    if (!line || line.startsWith('RELATIONSHIP')) continue;
    if (line.startsWith('BondId')) {
      header = line.split('\t');
      continue;
    }
    if (!header) continue;
    const cols = line.split('\t');
    const row = {};
    header.forEach((h, i) => { row[h] = cols[i]; });
    const a = row.CitizenA, b = row.CitizenB;
    if (!want.has(a) && !want.has(b)) continue;
    if (String(row.Status || '').toLowerCase() !== 'active') continue;
    edges.push({
      bondId: row.BondId,
      a, b,
      type: row.BondType,
      intensity: row.Intensity,
      origin: row.Origin,
      neighborhood: row.Neighborhood || null
    });
  }
  return edges.slice(0, 24);
}

function popidToName(rowsByPop, pop) {
  const r = rowsByPop.get(pop);
  return r ? String(r.Name || '').replace(/\s+/g, ' ').trim() : pop;
}

function loadLedgerIndex(root) {
  const p = path.join(root, 'output', 'simulation_ledger_snapshot.jsonl');
  const byPop = new Map();
  const byName = new Map();
  try {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!line) continue;
      let r;
      try { r = JSON.parse(line); } catch (_) { continue; }
      const pop = r.POPID;
      if (pop) byPop.set(pop, r);
      const name = String(r.Name || '').replace(/\s+/g, ' ').trim();
      if (name) byName.set(name.toLowerCase(), r);
    }
  } catch (_) { /* no snapshot */ }
  return { byPop, byName };
}

function profileLine(row) {
  if (!row) return null;
  const name = String(row.Name || '').replace(/\s+/g, ' ').trim();
  const bits = [
    row.RoleType && ('role: ' + row.RoleType),
    row.Neighborhood && ('neighborhood: ' + row.Neighborhood),
    row.BirthYear && ('born: ' + row.BirthYear),
    row.CareerStage && ('careerStage: ' + row.CareerStage),
    row.WealthLevel != null && row.WealthLevel !== '' && ('wealth: ' + row.WealthLevel),
    row.EmployerBizId && ('employerBiz: ' + row.EmployerBizId),
    row.SkillTags && ('skills: ' + String(row.SkillTags).slice(0, 80)),
    row.Tier && ('tier: ' + row.Tier)
  ].filter(Boolean);
  return name + ' (' + (row.POPID || '?') + ') — ' + bits.join('; ');
}

function collectCitizens(top, signal, ledger) {
  const out = [];
  const seen = new Set();
  const pushPop = (pop, why) => {
    if (!pop || seen.has(pop)) return;
    const row = ledger.byPop.get(pop);
    if (!row) return;
    seen.add(pop);
    out.push({
      popid: pop,
      name: String(row.Name || '').replace(/\s+/g, ' ').trim(),
      role: row.RoleType || null,
      neighborhood: row.Neighborhood || null,
      careerStage: row.CareerStage || null,
      employerBizId: row.EmployerBizId || null,
      profile: profileLine(row),
      why: why || 'stink-pool'
    });
  };
  // From top stink story/handle
  for (const pop of (top.popids || (top.story && top.story.popids) || [])) pushPop(pop, 'stink-handle');
  const citizens = (top.handle && top.handle.citizens) || (top.story && top.story.citizens) || [];
  for (const c of citizens) {
    const s = String(c);
    const m = s.match(/POP-\d+/);
    if (m) pushPop(m[0], 'stink-handle');
    else {
      const row = ledger.byName.get(s.replace(/\s*\(POP-.*$/, '').trim().toLowerCase());
      if (row) pushPop(row.POPID, 'stink-handle');
    }
  }
  // Same-hood residents from signal entries matching hood
  const hood = top.hood || (top.story && top.story.hood);
  if (hood && signal && signal.lanes) {
    for (const entries of Object.values(signal.lanes)) {
      for (const e of entries || []) {
        if (e.hood && String(e.hood).includes(hood)) {
          for (const pop of (e.popids || [])) pushPop(pop, 'same-hood-signal');
        }
      }
    }
  }
  // Fallback: ledger residents in that neighborhood (metric-imbalance rows often
  // carry no popids — without this, quote pool is empty and Jax loses street voices).
  if (hood && out.length < 4) {
    for (const row of ledger.byPop.values()) {
      if (out.length >= 12) break;
      if (String(row.Neighborhood || '') !== String(hood)) continue;
      // Prefer non-athlete street texture when RoleType looks sports-only? Keep all —
      // Jax can still interview; RoleType is on the profile line.
      pushPop(row.POPID, 'same-hood-ledger');
    }
  }
  return out.slice(0, 12);
}

function publicStuckFact(top) {
  const hook = String(top && top.handle && top.handle.hookLine || '').trim();
  if (hook && !/\b(?:stuck-initiative|construction-planning|severity)\b/i.test(hook)) return hook;
  const label = String(top && top.label || '');
  const initiative = (label.match(/Initiative\s+["“]([^"”]+)["”]/i) || [])[1];
  const cycles = (label.match(/\bfor\s+(\d+)\s+cycles?\b/i) || [])[1];
  return (initiative ? 'The ' + initiative + ' Initiative' : 'The supplied Initiative') +
    ' has not advanced' + (cycles ? ' in ' + cycles + ' cycles' : ' over the supplied span') + '.';
}

function buildContradiction(top, illnessRate) {
  if (!top) return null;
  const label = top.label || '';
  // metric-imbalance style: "decay [..] with no matching active initiative"
  if (/math-imbalance/i.test(label) || /no matching active initiative/i.test(label)) {
    return {
      a: label.replace(/^[^|]*\|\s*/, '').trim(),
      b: 'No active initiative (or mitigator) owns this break on the record',
      frame: 'The map says decay; the program roster does not answer it.'
    };
  }
  if (/stuck-initiative/i.test(label)) {
    return {
      a: publicStuckFact(top),
      b: 'The Initiative remains listed in the supplied tracker.',
      frame: 'The record shows an Initiative that remains listed but has not advanced; what explains the stall?'
    };
  }
  if (top.className === 'crisis-unattended' || illnessRate >= 8) {
    return {
      a: 'City illness ' + (illnessRate != null ? illnessRate + '%' : 'elevated'),
      b: 'Page attention still on process timelines / non-health leads',
      frame: 'A hard city number with no owner on the front of the paper.'
    };
  }
  return {
    a: label,
    b: 'The tidy official read of the same cycle',
    frame: 'Something does not line up — write into the gap.'
  };
}

const FIREBRAND_APPROACH =
  'Firebrand approach (sim stink-audit): do NOT open from the official timeline. ' +
  'Find what does not line up — metric vs claim, money vs outcome, boomtown copy vs decay, crisis with no owner. ' +
  'Write into the contradiction. Name who must answer. End on the unanswered question. ' +
  'Scene color is yours (weather, street, bar) so long as it contradicts nothing on this slice. ' +
  'Never invent careers for named people — RoleType lines are immutable. Never invent citizen names.';

/**
 * Build full Jax slice object for a cycle (disk artifacts only; no Sheets API).
 */
function buildJaxSlice(cycle, opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const scanner = require(path.join(__dirname, 'stink-scanner'));
  const report = o.report || scanner.scanCycle(cycle, { root });
  let top = report.top;
  const signal = loadJson(path.join(root, 'output', 'desk_signal_c' + cycle + '.json'));
  const summary = loadText(path.join(root, 'output', 'world_summary_c' + cycle + '.md'));
  const texture = loadText(path.join(root, 'output', 'neighborhood_texture_c' + cycle + '.md'));
  const ledger = loadLedgerIndex(root);

  if (!top) {
    return {
      cycle: Number(cycle),
      builtAt: new Date().toISOString(),
      empty: true,
      reason: 'no-stink-candidates',
      report
    };
  }

  // Prefer a high-score stink that still yields an interview pool. Some hoods
  // appear on Neighborhood_Map (e.g. Brooklyn) with ZERO ledger residents —
  // force-slotting that stink leaves Jax without voices. Walk candidates by score.
  let citizens = collectCitizens(top, signal, ledger);
  let chosen = top;
  if (!citizens.length && Array.isArray(report.candidates)) {
    for (const cand of report.candidates) {
      const pool = collectCitizens(cand, signal, ledger);
      if (pool.length) {
        chosen = cand;
        citizens = pool;
        break;
      }
    }
  }
  top = chosen;

  const hood = top.hood || null;
  const popids = citizens.map(c => c.popid);
  const bonds = loadBondEdges(root, popids).map(e => ({
    ...e,
    aName: popidToName(ledger.byPop, e.a),
    bName: popidToName(ledger.byPop, e.b),
    note: 'Real bond — voice may reference this edge; do not invent careers for either party'
  }));

  // Bond-hop: add bonded neighbors not already in pool (for quote depth)
  for (const e of bonds) {
    const other = popids.includes(e.a) ? e.b : e.a;
    if (!popids.includes(other) && citizens.length < 12) {
      const row = ledger.byPop.get(other);
      if (row) {
        citizens.push({
          popid: other,
          name: String(row.Name || '').replace(/\s+/g, ' ').trim(),
          role: row.RoleType || null,
          neighborhood: row.Neighborhood || null,
          careerStage: row.CareerStage || null,
          employerBizId: row.EmployerBizId || null,
          profile: profileLine(row),
          why: 'bond-hop from interview pool'
        });
        popids.push(other);
      }
    }
  }

  const contradiction = buildContradiction(top, report.illnessRate);
  const scene = {
    weather: weatherLine(summary),
    hood,
    neighborhoodTexture: extractHoodTexture(texture, hood),
    whoLivedIt: whoLivedForHood(summary, hood),
    chaos: chaosLinesForHood(summary, hood),
    colorRoom:
      'You may invent bar/street/sensory color that contradicts nothing above. ' +
      'Named people must stay on the CITIZENS list or be unnamed ("a bartender who asked not to be named"). ' +
      'RoleType is immutable — do not reassign careers. Soft side-work color only if it does not replace RoleType.'
  };

  const rawStoryLabel = String(top.label || '');
  const stuckStory = /stuck-initiative/i.test(rawStoryLabel);
  const publicStoryLabel = stuckStory ? publicStuckFact(top) : rawStoryLabel;
  const publicStoryAngle = stuckStory
    ? publicStoryLabel + ' What record explains the stall?'
    : ((top.handle && top.handle.angle) || rawStoryLabel);
  const story = {
    ref: top.ref,
    label: publicStoryLabel,
    kind: top.kind || 'anomaly',
    angle: publicStoryAngle,
    hookLine: stuckStory
      ? publicStoryLabel
      : ((top.handle && top.handle.hookLine) || (contradiction && contradiction.frame) || null),
    hood,
    popids: citizens.map(c => c.popid),
    citizens: citizens.map(c => c.name + (c.role ? ' — ' + c.role : '') + (c.neighborhood ? ', ' + c.neighborhood : '')),
    stinkClass: top.className,
    stinkScore: top.score
  };

  const gaps = {
    note: 'Ledgers/surfaces that would deepen Jax further if wired or fixed',
    missingOrThin: [
      {
        source: 'EmployerBizId → Business_Ledger name/address',
        status: 'gap',
        why: 'RoleType alone; no shop name/street for employer scene color without inventing'
      },
      {
        source: 'Cultural_Ledger venues by neighborhood',
        status: 'gap-on-disk',
        why: 'Bar/venue canon list not auto-attached to slice — Jax opens in bars; needs hood venue pointer'
      },
      {
        source: 'Faith_Ledger / Faith_Organizations by hood',
        status: 'partial',
        why: 'Texture file sometimes names congregations; not joined to stink hood systematically'
      },
      {
        source: 'LifeHistory_Log raw (beyond Who Lived It digest)',
        status: 'partial',
        why: 'Digest is tag-summary; full event prose would deepen street color without inventing people'
      },
      {
        source: 'Relationship_Bonds live refresh',
        status: 'stale-risk',
        why: 'bond-ledger-live.tsv may lag; bond-hop quality depends on export freshness'
      },
      {
        source: 'Neighborhood_Map row metrics on slice',
        status: 'partial',
        why: 'Stink label carries some decay numbers; full hood board not embedded as color (avoid engine jargon in prose)'
      },
      {
        source: 'Map hoods with zero Simulation_Ledger residents (e.g. Brooklyn on C102)',
        status: 'sim-gap',
        why: 'Audit can flag decay for a hood nobody lives in on the ledger — stink is real, interview pool empty; slice walks to next candidate with residents'
      },
      {
        source: 'Citizen pages / DialState',
        status: 'via-citizenVoice',
        why: 'Quote stage loads dials; slice does not pre-print dial prose (correct — voice owns it)'
      }
    ],
    colorAllowed: [
      'Weather line from Riley/world_summary',
      'neighborhood_texture paragraph (perception-only, often nameless)',
      'Who Lived It lines for this hood',
      'Chaos_Cars rows touching hood/citizen',
      'Bond edges among pool (professional/friend/family)'
    ]
  };

  return {
    cycle: Number(cycle),
    builtAt: new Date().toISOString(),
    empty: false,
    journalist: { name: 'Jax Caldera', popid: 'POP-00799', persona: 'freelance-firebrand' },
    approach: FIREBRAND_APPROACH,
    stink: {
      className: top.className,
      score: top.score,
      label: top.label,
      ref: top.ref,
      kind: top.kind,
      desk: top.desk
    },
    contradiction,
    story,
    citizens,
    bonds,
    scene,
    gaps,
    pointers: [
      'output/cron-compare/stink_c' + cycle + '.json',
      'output/desk_signal_c' + cycle + '.json',
      'output/world_summary_c' + cycle + '.md',
      'output/neighborhood_texture_c' + cycle + '.md',
      'output/engine_audit_c' + cycle + '.json',
      top.ref
    ].filter(Boolean),
    reportMeta: {
      illnessRate: report.illnessRate,
      maxScore: report.maxScore,
      shouldForce: report.shouldForce,
      candidateCount: report.candidateCount
    }
  };
}

function formatJaxSliceMarkdown(slice) {
  if (!slice || slice.empty) {
    return '# SLICE — firebrand (Jax Caldera), Cycle ' + (slice && slice.cycle) + '\n\n_No stink candidates — do not force a column._\n';
  }
  const L = [];
  L.push('# SLICE — firebrand (Jax Caldera), Cycle ' + slice.cycle);
  L.push('JOURNALIST: Jax Caldera (POP-00799) · persona freelance-firebrand · Grok seat');
  L.push('');
  L.push('## STINK');
  L.push('CLASS: ' + slice.stink.className + ' · SCORE: ' + slice.stink.score);
  L.push('LABEL: ' + slice.stink.label);
  L.push('REF: ' + slice.stink.ref);
  L.push('');
  L.push('## CONTRADICTION');
  if (slice.contradiction) {
    L.push('A: ' + slice.contradiction.a);
    L.push('B: ' + slice.contradiction.b);
    L.push('FRAME: ' + slice.contradiction.frame);
  }
  L.push('');
  L.push('## APPROACH');
  L.push(slice.approach);
  L.push('');
  L.push('## CITIZENS (interview / name pool — RoleType immutable)');
  for (const c of slice.citizens) {
    L.push('- ' + c.profile + (c.why ? '  [' + c.why + ']' : ''));
  }
  if (!slice.citizens.length) L.push('_No POPID pool on this stink — quote stage may fall back to lane; still no invented names._');
  L.push('');
  L.push('## BONDS (real edges — color social graph, do not invent)');
  if (slice.bonds.length) {
    for (const b of slice.bonds) {
      L.push('- ' + b.aName + ' ↔ ' + b.bName + ' (' + b.type + ', ' + (b.origin || '?') +
        (b.neighborhood ? ', ' + b.neighborhood : '') + ')');
    }
  } else {
    L.push('_No active bonds among pool in bond-ledger-live.tsv (or export missing)._');
  }
  L.push('');
  L.push('## SCENE COLOR (data you cannot see as pure metrics — write into this room)');
  if (slice.scene.weather) L.push('WEATHER: ' + slice.scene.weather);
  if (slice.scene.hood) L.push('HOOD: ' + slice.scene.hood);
  if (slice.scene.neighborhoodTexture) {
    L.push('TEXTURE:');
    L.push(slice.scene.neighborhoodTexture);
  } else {
    L.push('TEXTURE: _(none for hood — quiet week or missing neighborhood_texture file)_');
  }
  if (slice.scene.whoLivedIt.length) {
    L.push('WHO LIVED IT (this hood):');
    for (const w of slice.scene.whoLivedIt) L.push('- ' + w);
  }
  if (slice.scene.chaos.length) {
    L.push('CHAOS (touching hood):');
    for (const c of slice.scene.chaos) L.push('- ' + c);
  }
  L.push('COLOR ROOM: ' + slice.scene.colorRoom);
  L.push('');
  L.push('## GAPS (deepen later)');
  for (const g of slice.gaps.missingOrThin) {
    L.push('- **' + g.source + '** [' + g.status + ']: ' + g.why);
  }
  L.push('');
  L.push('## POINTERS');
  for (const p of slice.pointers) L.push('- ' + p);
  L.push('');
  L.push('_Generated by scripts/buildJaxSlice.js — no LLM. Not a Mags desk-slice._');
  return L.join('\n') + '\n';
}

function slicePaths(cycle, root) {
  const r = root || ROOT;
  return {
    md: path.join(r, 'output', 'slices', 'c' + cycle, 'firebrand.md'),
    json: path.join(r, 'output', 'cron-compare', 'jax_slice_c' + cycle + '.json')
  };
}

function writeJaxSlice(cycle, slice, root) {
  const paths = slicePaths(cycle, root);
  fs.mkdirSync(path.dirname(paths.md), { recursive: true });
  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  fs.writeFileSync(paths.json, JSON.stringify(slice, null, 2));
  fs.writeFileSync(paths.md, formatJaxSliceMarkdown(slice));
  // keep stink report in sync when we build from live scan
  try {
    const scanner = require(path.join(__dirname, 'stink-scanner'));
    if (slice.reportMeta) {
      const report = scanner.scanCycle(cycle, { root: root || ROOT });
      scanner.writeReport(cycle, report, root || ROOT);
    }
  } catch (_) { /* non-fatal */ }
  return paths;
}

function loadJaxSlice(cycle, root) {
  const paths = slicePaths(cycle, root);
  const j = loadJson(paths.json);
  if (j && !j.empty) return j;
  // build on demand
  const slice = buildJaxSlice(cycle, { root: root || ROOT });
  if (!slice.empty) writeJaxSlice(cycle, slice, root);
  return slice.empty ? null : slice;
}

/** Assignment shape for newsroom-fanout / cron-desk-run */
function assignmentFromSlice(slice) {
  if (!slice || slice.empty) return null;
  return {
    desk: 'civic',
    name: 'Jax Caldera',
    popid: 'POP-00799',
    beatDomain: 'CIVIC',
    persona: 'freelance-firebrand',
    approach: slice.approach,
    story: slice.story,
    stinkForce: true,
    stink: slice.stink,
    jaxSlice: true
  };
}

if (require.main === module) {
  const cycle = arg('--cycle', null) || (() => {
    try {
      return require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ soft: true, noArgv: true });
    } catch (_) { return null; }
  })();
  if (cycle == null) {
    console.error('buildJaxSlice: pass --cycle N');
    process.exit(1);
  }
  const slice = buildJaxSlice(cycle);
  const paths = writeJaxSlice(cycle, slice);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(slice, null, 2));
  } else {
    console.log('jax slice c' + cycle +
      (slice.empty ? ' EMPTY' : ' stink=' + slice.stink.className + ' score=' + slice.stink.score +
        ' citizens=' + slice.citizens.length + ' bonds=' + slice.bonds.length));
    if (!slice.empty) {
      console.log('  ' + String(slice.stink.label).slice(0, 100));
      if (slice.scene.neighborhoodTexture) {
        console.log('  texture: ' + slice.scene.neighborhoodTexture.slice(0, 80) + '…');
      }
    }
    console.log('→ ' + path.relative(ROOT, paths.md));
    console.log('→ ' + path.relative(ROOT, paths.json));
  }
}

module.exports = {
  buildJaxSlice,
  writeJaxSlice,
  loadJaxSlice,
  formatJaxSliceMarkdown,
  assignmentFromSlice,
  slicePaths,
  publicStuckFact,
  buildContradiction,
  FIREBRAND_APPROACH
};
