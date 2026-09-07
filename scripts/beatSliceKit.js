'use strict';
/**
 * beatSliceKit.js — the shared mechanics behind every per-journalist beat slice
 * (pipeline.68 Task 4). One builder file per journalist; this is the part they
 * would otherwise each copy: dump loading (fail loud), roster/profile joins,
 * hook-deck lookup, artifact paths, cache-by-version, markdown, assignment
 * enrichment and the CLI main.
 *
 * Ruling (docs/SIM_DOCTRINE.md §13): the facts are the names, places, roles and
 * numbers on the slice — every fact line carries its dump source. Everything
 * else about the beat is the reporter's to paint.
 */

const fs = require('fs');
const path = require('path');
const { loadBeatTabs } = require('./buildEconomicSlice');

const ROOT = path.join(__dirname, '..');
const SCHEMA = 'BEAT-SLICE-1';

const FACTS_TAIL =
  'Facts on this slice: the names, places, roles and numbers listed. Those are real; do not invent ' +
  'people or places. Everything else about this beat — what it looks like, who is there, what they ' +
  'want and hate — is yours to paint.';

const FORBIDDEN = [
  'Do not invent a named person, place, station, school, clinic, congregation or number that is not on this slice',
  'Do not contradict a role, employer or neighborhood listed here',
  'Do not print internal IDs (POP-/BIZ-) or raw ledger decimals in prose'
];

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
function hoodKey(h) {
  return String(h || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function fmtInt(n) {
  return n == null ? '—' : Number(n).toLocaleString('en-US');
}
function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}
function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

/** Simulation_Ledger snapshot rows keyed by POPID (absence = no profile, never a throw). */
function loadProfiles(root = ROOT) {
  const out = new Map();
  try {
    for (const line of fs.readFileSync(path.join(root, 'output', 'simulation_ledger_snapshot.jsonl'), 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      const popid = String(row.POPID || '').trim().toUpperCase();
      if (popid) out.set(popid, row);
    }
  } catch (_) { /* no snapshot on disk */ }
  return out;
}

/** Prior-cycle rows for a snapshot tab from output/beats/prev/ — a typed first-cycle state, never a throw. */
function prevTabRows(root, tab) {
  const dir = path.join(root, 'output', 'beats', 'prev');
  const meta = loadJson(path.join(dir, 'meta.json'));
  if (!meta) return { state: 'NO_PRIOR_CYCLE', vs: null, rows: [] };
  try {
    const rows = fs.readFileSync(path.join(dir, tab + '.jsonl'), 'utf8').split('\n')
      .filter(Boolean).map(line => JSON.parse(line));
    return { state: 'PRIOR_CYCLE_ON_DISK', vs: Number(meta.cycle), rows };
  } catch (_) {
    return { state: 'NO_PRIOR_CYCLE', vs: null, rows: [] };
  }
}

/** Active roster rows at businesses whose ledger Sector matches — a BIZ_ID join, never a RoleType regex. */
function rosterAtSectors(beats, sectorRe) {
  const ids = new Set((beats.Business_Ledger || []).filter(b => sectorRe.test(String(b.Sector || ''))).map(b => b.BIZ_ID));
  const byBiz = new Map((beats.Business_Ledger || []).map(b => [b.BIZ_ID, b.Name]));
  return (beats.Employment_Roster || [])
    .filter(r => ids.has(r.BIZ_ID) && String(r.Status || '').toUpperCase() === 'ACTIVE' && r.POP_ID && r.CitizenName)
    .map(r => ({
      popid: r.POP_ID, name: String(r.CitizenName).trim(), role: String(r.RoleType || '').trim() || null,
      business: byBiz.get(r.BIZ_ID) || r.BIZ_ID
    }));
}

/** Story_Hook_Deck rows for this cycle addressed to a journalist — colour and pointers, never facts. */
function hooksFor(beats, cycle, journalistName) {
  return (beats.Story_Hook_Deck || [])
    .filter(r => Number(r.Cycle) === Number(cycle) &&
      String(r.SuggestedJournalist || '').trim().toLowerCase() === String(journalistName).toLowerCase())
    .map(r => ({
      text: String(r.HookText || '').trim(), angle: String(r.SuggestedAngle || '').trim() || null,
      domain: r.Domain || null, hood: r.Neighborhood || null, priority: num(r.Priority)
    }))
    .filter(h => h.text);
}

/** Story_Seed_Deck rows for this cycle on a desk — citizens/businesses/colour lines, never the What/Why metric strings. */
function seedsFor(beats, cycle, deskRe) {
  return (beats.Story_Seed_Deck || [])
    .filter(r => Number(r.Cycle) === Number(cycle) && deskRe.test(String(r.Desk || '')))
    .map(r => ({
      seedId: r.SeedID || null, hood: r.Neighborhood || null, domain: r.Domain || null,
      citizens: String(r.Citizens || '').split(';').map(t => t.trim()).filter(Boolean).map(t => {
        const m = t.match(/^(POP-\d+)\s+(.+)$/i);
        return m ? { popid: m[1].toUpperCase(), name: m[2].trim() } : { popid: null, name: t };
      }),
      citizenEvents: String(r.CitizenEvents || '').split('|').map(t => t.trim()).filter(Boolean),
      businesses: String(r.Businesses || '').split(';').map(t => t.trim()).filter(Boolean)
        .map(t => t.replace(/^BIZ-\d+\s+/i, ''))
    }));
}

/** A citizen row in the shape livedExperiencePacket.candidateRows reads (slice.citizens first). */
function person(popid, name, role, hood, why, business) {
  return {
    popid, name, role: role || null, neighborhood: hood || null, business: business || null,
    profile: [name, role, business ? business + (hood ? ', ' + hood : '') : hood].filter(Boolean).join(' — '),
    why: why || 'on the beat record this cycle'
  };
}
function personFromProfile(profiles, popid, why, hoodFallback) {
  const p = profiles.get(String(popid).toUpperCase());
  if (!p) return null;
  return person(String(popid).toUpperCase(), String(p.Name || '').trim(), String(p.RoleType || '').trim() || null,
    String(p.Neighborhood || '').trim() || hoodFallback || null, why);
}
function citizenTags(people) {
  return people.map(p => p.name + ' (' + p.popid + ')');
}

/**
 * Assemble the common slice shape. `seat` = { slug, name, popid, desk, kind, domain, approach, roomIsYours }.
 * `body` = { hood, label, angle, hookLine, facts:[{text,src}], people:[person], deltas, hooks, note, extra }.
 */
function makeSlice(seat, cycle, beats, body) {
  const people = body.people || [];
  const facts = body.facts || [];
  return {
    version: seat.version, empty: false, cycle: Number(cycle), kind: seat.kind, seat: {
      slug: seat.slug, name: seat.name, popid: seat.popid, desk: seat.desk, domain: seat.domain
    },
    hood: body.hood || null,
    pulse: { className: seat.kind, score: 100, label: body.label, hood: body.hood || null, source: body.ref },
    story: {
      kind: seat.kind, angle: body.angle, label: body.label, hookLine: body.hookLine, hood: body.hood || null,
      citizens: citizenTags(people), popids: people.map(p => p.popid), ref: body.ref, cycle: Number(cycle)
    },
    approach: seat.approach + ' ' + FACTS_TAIL,
    citizens: people,
    facts,
    prewrite: {
      schema: SCHEMA, method: 'BEAT_TAB_FACTS', missing: [],
      angle: body.angle, hookLine: body.hookLine,
      anchorFacts: facts.map(f => f.text), evidence: facts,
      forbidden: FORBIDDEN,
      deltas: body.deltas || null, hooks: body.hooks || [], note: body.note || null,
      roomIsYours: seat.roomIsYours
    },
    ...(body.extra || {}),
    pointers: [body.ref].concat((body.hooks || []).length ? ['output/beats/Story_Hook_Deck.jsonl (hooks for ' + seat.name + ' this cycle)'] : [])
      .concat(['docs/plans/2026-09-07-beat-slices-from-sheets-plan.md Task 4'])
  };
}

function emptySlice(seat, cycle, reason) {
  return { version: seat.version, empty: true, cycle: Number(cycle), kind: seat.kind,
    seat: { slug: seat.slug, name: seat.name, popid: seat.popid, desk: seat.desk, domain: seat.domain },
    reason, approach: seat.approach + ' ' + FACTS_TAIL };
}

function formatMarkdown(slice) {
  if (!slice || slice.empty) {
    return '# ' + ((slice && slice.seat && slice.seat.name) || 'beat') + ' slice (EMPTY)\n\n_' + ((slice && slice.reason) || 'no slice') + '_\n';
  }
  const L = [];
  L.push('# ' + slice.seat.name + ' — ' + slice.seat.domain + ' slice');
  L.push('');
  L.push('Cycle **C' + slice.cycle + '** · kind `' + slice.kind + '`' + (slice.hood ? ' · hood **' + slice.hood + '**' : ''));
  L.push('');
  L.push('## THE SLICE');
  L.push('- Angle: ' + slice.story.angle);
  L.push('- Hook: ' + slice.story.hookLine);
  if (slice.prewrite.note) L.push('- Note: ' + slice.prewrite.note);
  if (slice.prewrite.deltas) L.push('- Prior cycle: ' + slice.prewrite.deltas.state + (slice.prewrite.deltas.vs != null ? ' (C' + slice.prewrite.deltas.vs + ')' : ''));
  L.push('');
  L.push('## FACTS (each line is a row on the record)');
  for (const f of slice.facts) L.push('- ' + f.text + '  _[' + f.src + ']_');
  L.push('');
  L.push('## PEOPLE ON THE RECORD (your sources — real; never invent another)');
  if (!slice.citizens.length) L.push('_none named on this beat this cycle — the people in the room are yours to paint, unnamed_');
  for (const c of slice.citizens) L.push('- ' + c.profile + ' — ' + c.why);
  L.push('');
  if ((slice.prewrite.hooks || []).length) {
    L.push('## ENGINE HOOKS FOR YOU (colour, not fact)');
    for (const h of slice.prewrite.hooks) L.push('- ' + h.text + (h.angle ? ' (' + h.angle + ')' : ''));
    L.push('');
  }
  L.push('## THE ROOM IS YOURS');
  L.push(slice.prewrite.roomIsYours || '');
  L.push('');
  L.push('## APPROACH');
  L.push(slice.approach);
  L.push('');
  L.push('## FORBIDDEN');
  for (const f of slice.prewrite.forbidden) L.push('- ' + f);
  L.push('');
  L.push('## POINTERS');
  for (const p of slice.pointers) L.push('- ' + p);
  L.push('');
  L.push('_Generated by scripts/' + slice.seat.builder + ' — no LLM. Facts are the rows; the room is the reporter\'s._');
  return L.join('\n') + '\n';
}

/**
 * Wire a builder: returns { paths, write, load, assignmentFromSlice, enrichAssignment, isSeat, main }.
 * `seat.build(cycle, { root, beats, profiles })` is the per-beat function.
 */
function wire(seat) {
  function paths(cycle, root = ROOT) {
    return {
      json: path.join(root, 'output', 'cron-compare', seat.artifact + '_slice_c' + cycle + '.json'),
      md: path.join(root, 'output', 'slices', 'c' + cycle, seat.slug + '.md')
    };
  }
  function build(cycle, opts = {}) {
    const root = opts.root || ROOT;
    const beats = opts.beats || loadBeatTabs(root, cycle, seat.tabs);
    const profiles = opts.profiles || loadProfiles(root);
    const slice = seat.build(Number(cycle), { root, beats, profiles });
    if (slice && !slice.empty) slice.seat.builder = seat.builder;
    return slice;
  }
  function write(cycle, slice, root = ROOT) {
    const p = paths(cycle, root);
    fs.mkdirSync(path.dirname(p.json), { recursive: true });
    fs.mkdirSync(path.dirname(p.md), { recursive: true });
    fs.writeFileSync(p.json, JSON.stringify(slice, null, 2));
    fs.writeFileSync(p.md, formatMarkdown(slice));
    return p;
  }
  function load(cycle, root = ROOT) {
    const cached = loadJson(paths(cycle, root).json);
    if (cached && cached.version === seat.version && !cached.empty) return cached;
    const slice = build(cycle, { root });
    write(cycle, slice, root);
    return slice.empty ? null : slice;
  }
  function isSeat(assign) {
    if (!assign) return false;
    if (String(assign.persona || '') === seat.slug) return true;
    return seat.nameRe.test(String(assign.name || ''));
  }
  function assignmentFromSlice(slice, assign) {
    if (!slice || slice.empty) return null;
    return Object.assign({}, assign || {}, {
      desk: (assign && assign.desk) || seat.desk,
      name: (assign && assign.name) || seat.name,
      popid: (assign && assign.popid) || seat.popid,
      beatDomain: (assign && assign.beatDomain) || seat.domain.toUpperCase(),
      persona: (assign && assign.persona) || seat.slug,
      approach: slice.approach,
      story: slice.story,
      beatSlice: true,
      beatSeat: seat.slug,
      pulse: slice.pulse,
      prewrite: slice.prewrite
    });
  }
  // A missing or stale dump throws through here on purpose — no seat is staged on nothing.
  function enrichAssignment(assign, cycle, root = ROOT) {
    if (!isSeat(assign)) return assign;
    const slice = load(cycle, root);
    return slice ? assignmentFromSlice(slice, assign) : assign;
  }
  function main() {
    const cycle = arg('--cycle', null) || (() => {
      try { return require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ soft: true, noArgv: true }); } catch (_) { return null; }
    })();
    if (cycle == null) { console.error(seat.builder + ': pass --cycle N'); process.exit(1); }
    let slice;
    try { slice = build(cycle); } catch (e) { console.error(seat.builder + ': ' + e.message); process.exit(2); }
    const p = write(cycle, slice);
    if (process.argv.includes('--json')) console.log(JSON.stringify(slice, null, 2));
    else {
      console.log(seat.slug + ' slice c' + cycle + (slice.empty ? ' EMPTY — ' + slice.reason
        : ' hood=' + (slice.hood || '—') + ' facts=' + slice.facts.length + ' people=' + slice.citizens.length + ' hooks=' + slice.prewrite.hooks.length));
      if (!slice.empty) console.log('  ' + slice.story.hookLine);
      console.log('→ ' + path.relative(ROOT, p.md));
      console.log('→ ' + path.relative(ROOT, p.json));
    }
  }
  return { paths, build, write, load, isSeat, assignmentFromSlice, enrichAssignment, main, formatMarkdown };
}

module.exports = {
  ROOT, SCHEMA, FACTS_TAIL, FORBIDDEN,
  num, hoodKey, fmtInt, loadJson, arg,
  loadBeatTabs, loadProfiles, prevTabRows, rosterAtSectors, hooksFor, seedsFor,
  person, personFromProfile, citizenTags, makeSlice, emptySlice, formatMarkdown, wire
};
