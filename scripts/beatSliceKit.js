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

/**
 * hooksFor plus a domain fallback: the engine misroutes or bare-carries several
 * hook classes (FAITH → City Desk, EDUCATION → a desk no roster carries,
 * FAME_WATCH / NEIGHBORHOOD_* / DROPOUT_WAVE raw-carried with no desk at all —
 * engine cuts filed 2026-09-10/14). domainRe matches Domain or HookType;
 * name-matched rows win, domain rows dedupe by text.
 */
function domainHooks(beats, cycle, journalistName, domainRe) {
  const named = hooksFor(beats, cycle, journalistName);
  const seen = new Set(named.map(h => h.text));
  const domain = (beats.Story_Hook_Deck || [])
    .filter(r => Number(r.Cycle) === Number(cycle) &&
      (domainRe.test(String(r.Domain || '').toUpperCase()) || domainRe.test(String(r.HookType || '').toUpperCase())))
    .map(r => ({
      text: String(r.HookText || r.Description || '').trim(), angle: String(r.SuggestedAngle || '').trim() || null,
      domain: r.Domain || r.HookType || null, hood: r.Neighborhood || null, priority: num(r.Priority)
    }))
    .filter(h => h.text && !seen.has(h.text));
  return named.concat(domain);
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
      // pipeline.70: what the citizens' own pages say — colour and sourcing, never a number in print.
      pageVoices: body.pageVoices || [],
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
  if ((slice.prewrite.pageVoices || []).length) {
    L.push('## THE PAGES SAY (the citizens\' own words — colour and sourcing, never a number in print)');
    for (const v of slice.prewrite.pageVoices) L.push('- ' + v);
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

// ── engine.254 Task 10: the city's money, the court, the care/custody trail ──
// Three cumulative, Cycle-stamped tabs (City_Treasury, Judicial_Ledger,
// Care_Justice_Census) plus the receipt hooks the engine writes for them. Every
// helper reads one cycle's rows and returns typed facts; an empty tab (nothing
// has fired yet) returns no facts — never a throw, never a fact about silence.
// Internal IDs (case IDs embed the POPID) ride in `src`, never in `text`.

const ATHLETE_RE = /\b(?:athlete|player|pitcher|catcher|fielder|shortstop|baseman|designated hitter|coach|manager, oakland)\b/i;
/** A GAME-clock citizen is the sports desks' — never named as a patient or a defendant on a civic beat. */
function sportsSubject(profiles, popid) {
  const p = profiles && profiles.get(String(popid || '').toUpperCase());
  if (!p) return false;
  return String(p.EconomicProfileKey || '') === 'SPORTS_OVERRIDE' || String(p.ClockMode || '').toUpperCase() === 'GAME' ||
    ATHLETE_RE.test(String(p.RoleType || ''));
}

function money(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n), abs = Math.abs(v);
  const body = abs >= 1e6 ? (Math.round(abs / 1e5) / 10) + 'M' : Math.round(abs).toLocaleString('en-US');
  return (v < 0 ? '-$' : '$') + body;
}

// What each treasury counterparty means, in the words a reporter prints.
const TREASURY_SOURCES = {
  'WEEKLY-ALLOCATION': 'the weekly budget allocation',
  'COURT': 'court money on cleared charges',
  'COURT-NAMED': 'fines paid by named defendants',
  'TICKETS': 'tickets',
  'PROPERTY-TAX': 'property tax',
  'BUSINESS-TAX': 'business tax',
  'GENERAL-FUND': 'the general fund'
};

/**
 * This cycle on City_Treasury: what came in and from where, what went out and to
 * whom, and the balance. `nameOf(counterparty)` turns an initiative ID into its
 * name for the outflow line. Returns { state, facts, income, outflows, opening, closing }.
 */
function treasuryWeek(rows, cycle, src, nameOf) {
  const all = rows || [];
  const week = all.filter(r => Number(r.Cycle) === Number(cycle));
  const out = { state: all.length ? (week.length ? 'ON_RECORD' : 'NO_ROWS_THIS_CYCLE') : 'NO_ROWS', facts: [], income: {}, outflows: [], opening: null, closing: null };
  if (!week.length) return out;
  const first = all.indexOf(week[0]);
  const before = first > 0 ? all[first - 1] : null;
  out.opening = before ? num(before.BalanceAfter) : (num(week[0].BalanceAfter) != null ? num(week[0].BalanceAfter) - (num(week[0].Amount) || 0) : null);
  out.closing = num(week[week.length - 1].BalanceAfter);
  let totalIn = 0, totalOut = 0;
  for (const r of week) {
    const entry = String(r.Entry || '').toUpperCase(), cp = String(r.Counterparty || '').trim(), amt = num(r.Amount) || 0;
    if (entry === 'OPENING') { out.facts.push({ text: 'The city treasury opened this cycle at ' + money(amt), src }); continue; }
    if (entry === 'PREFUNDED') continue;
    if (entry === 'REVENUE') {
      const slot = out.income[cp] || (out.income[cp] = { amount: 0, count: 0, charges: null });
      slot.amount += amt; slot.count += 1; totalIn += amt;
      if (cp === 'COURT') { const m = String(r.Note || '').match(/^(\d+)\s+cleared/); if (m) slot.charges = Number(m[1]); }
      continue;
    }
    if (amt < 0 || entry === 'APPROPRIATION' || entry === 'RENEWAL') {
      out.outflows.push({ entry, counterparty: cp, name: (nameOf && nameOf(cp)) || cp, amount: Math.abs(amt), note: String(r.Note || '').trim() });
      totalOut += Math.abs(amt);
    }
  }
  const parts = Object.keys(out.income).map(cp => {
    const s = out.income[cp];
    let what = TREASURY_SOURCES[cp] || cp.toLowerCase();
    if (cp === 'COURT' && s.charges != null) what = 'court money on ' + s.charges + ' cleared charge' + (s.charges === 1 ? '' : 's');
    if (cp === 'COURT-NAMED') what = 'fines paid by ' + s.count + ' named defendant' + (s.count === 1 ? '' : 's');
    if (cp === 'TICKETS') what = s.count + ' ticket' + (s.count === 1 ? '' : 's');
    return money(s.amount) + ' ' + what;
  });
  if (parts.length) out.facts.push({ text: 'City treasury this cycle took in ' + money(totalIn) + ': ' + parts.join(', '), src });
  if (out.outflows.length) {
    out.facts.push({ text: 'City treasury paid out ' + money(totalOut) + ': ' + out.outflows.map(o => money(o.amount) + ' to ' + o.name + (o.entry === 'RENEWAL' ? ' (renewal)' : '') + (/underfunded/i.test(o.note) ? ' — opened underfunded' : '')).join('; '), src });
  }
  if (out.closing != null) {
    out.facts.push({ text: 'City treasury balance at the close: ' + money(out.closing) + (out.opening != null && out.opening !== out.closing ? ' (from ' + money(out.opening) + ')' : ''), src });
  }
  return out;
}

const CUSTODY_STATES = /^(pending|held)$/i;
const HOSPITAL_OPEN_STATES = /^(hospitalized|critical|serious-condition|injured|recovering)$/i;

/**
 * Judicial_Ledger cases that moved this cycle or still hold someone, joined to the
 * fine the court took (City_Treasury COURT-NAMED, by case ID). A GAME-clock
 * citizen's case is counted, never named. Returns { cases, sportsCases }.
 */
function courtCases(judicialRows, treasuryRows, cycle, profiles, src) {
  const fines = new Map();
  for (const r of treasuryRows || []) {
    if (Number(r.Cycle) !== Number(cycle) || String(r.Counterparty || '') !== 'COURT-NAMED') continue;
    const m = String(r.Note || '').match(/case\s+(\S+)/i);
    if (m) fines.set(m[1].replace(/,$/, ''), num(r.Amount));
  }
  const cases = [];
  let sportsCases = 0;
  for (const c of judicialRows || []) {
    const caseId = String(c.CaseId || '').trim();
    if (!caseId) continue;
    const touched = ['OpenCycle', 'ArrestCycle', 'DecisionCycle', 'ResolveCycle', 'LastTransitionCycle'].some(k => Number(c[k]) === Number(cycle));
    const inCustody = CUSTODY_STATES.test(String(c.StatusNow || '').trim());
    if (!touched && !inCustody) continue;
    const popid = String(c.POPID || '').toUpperCase();
    if (sportsSubject(profiles, popid)) { sportsCases += 1; continue; }
    const name = String(c.Name || '').trim();
    if (!name) continue;
    const hood = String(c.Neighborhood || '').trim() || null;
    const gravity = String(c.ChargeGravity || '').trim();
    const status = String(c.StatusNow || '').trim();
    const outcome = String(c.Outcome || '').trim();
    const held = num(c.CyclesHeld);
    const fine = fines.get(caseId);
    const bits = [name + (hood ? ' (' + hood + ')' : '') + ' — ' + (gravity ? gravity + ' charge' : 'a charge') + (c.ChargeCause ? ' after ' + String(c.ChargeCause).trim() : '')];
    if (Number(c.ArrestCycle) === Number(cycle)) bits.push('arrested this cycle');
    bits.push(inCustody ? 'in custody (' + status + ')' + (held ? ', held ' + held + ' cycle' + (held === 1 ? '' : 's') : '') : status || 'status unrecorded');
    if (outcome) bits.push('outcome ' + outcome + (Number(c.ResolveCycle) === Number(cycle) ? ' this cycle' : ''));
    if (fine != null) bits.push('fined ' + money(fine) + ' by the court');
    cases.push({ caseId, popid, name, hood, gravity, status, outcome, inCustody, cyclesHeld: held, fine: fine != null ? fine : null,
      arrestedThisCycle: Number(c.ArrestCycle) === Number(cycle), resolvedThisCycle: Number(c.ResolveCycle) === Number(cycle),
      text: bits.join(', '), src: src + ' ' + caseId });
  }
  cases.sort((a, b) => (b.arrestedThisCycle - a.arrestedThisCycle) || (b.resolvedThisCycle - a.resolvedThisCycle) || (b.inCustody - a.inCustody) || a.name.localeCompare(b.name));
  return { cases, sportsCases };
}

/**
 * Care_Justice_Census for one system ('judicial' | 'hospital') this cycle, read
 * one scope at a time off the IntakeType `all` rows — the typed rows are never
 * summed on top of them, and `city` is never added to the hoods. A row whose
 * Completeness is not `complete` keeps its numbers off the facts and says so.
 * `demandByHood` (hoodKey → number) is the demand side (charges or sick
 * residents); `namesByHood` (hoodKey → [names]) is the tracked people on the
 * ledger for that system, so every hood line ends in names or "none tracked".
 */
function censusTrail(censusRows, cycle, system, { demandByHood, namesByHood } = {}) {
  const rows = (censusRows || []).filter(r => Number(r.Cycle) === Number(cycle) && String(r.System || '') === system && String(r.IntakeType || '') === 'all');
  const out = { state: rows.length ? 'ON_RECORD' : ((censusRows || []).length ? 'NO_ROWS_THIS_CYCLE' : 'NO_ROWS'), city: null, unallocated: null, hoods: [] };
  const read = r => {
    const complete = String(r.Completeness || '') === 'complete';
    const key = hoodKey(r.Neighborhood);
    return {
      scope: r.GeographicScope, hood: String(r.Neighborhood || '').trim() || null, complete, completeness: String(r.Completeness || '') || 'unrecorded',
      demand: demandByHood && demandByHood.has(key) ? demandByHood.get(key) : null,
      intakes: complete ? num(r.TotalIntakes) : null, tracked: complete ? num(r.TrackedIntakes) : null, other: complete ? num(r.OtherResidentIntakes) : null,
      closing: complete ? num(r.ClosingOccupancy) : null, trackedOcc: complete ? num(r.TrackedOccupancy) : null, otherOcc: complete ? num(r.OtherResidentOccupancy) : null,
      beds: complete && system === 'hospital' ? num(r.BedsOccupied) : null, exits: complete ? num(r.Exits) : null,
      names: (namesByHood && namesByHood.get(key)) || []
    };
  };
  for (const r of rows) {
    const t = read(r);
    if (t.scope === 'city') out.city = t;
    else if (t.scope === 'unallocated') out.unallocated = t;
    else if (t.scope === 'neighborhood' && t.hood) out.hoods.push(t);
  }
  out.hoods.sort((a, b) => ((b.closing || 0) - (a.closing || 0)) || ((b.intakes || 0) - (a.intakes || 0)) || a.hood.localeCompare(b.hood));
  return out;
}

const TRAIL_WORDS = {
  judicial: { demand: 'charges', intake: 'arrest', occ: 'in custody', beds: null },
  hospital: { demand: 'sick residents', intake: 'admission', occ: 'in care', beds: 'beds' }
};
function trailLine(t, system) {
  const w = TRAIL_WORDS[system];
  if (!t.complete) return t.hood + ': census ' + t.completeness + ' this cycle — numbers withheld' + (t.names.length ? '; on the ledger: ' + t.names.join(', ') : '');
  const bits = [];
  if (t.demand != null) bits.push(fmtInt(t.demand) + ' ' + w.demand);
  bits.push(fmtInt(t.intakes) + ' ' + w.intake + ((t.intakes || 0) === 1 ? '' : 's') + (t.tracked ? ' (' + t.tracked + ' tracked)' : ''));
  bits.push(fmtInt(t.closing) + ' ' + w.occ + ' at the close' + (t.otherOcc != null && t.trackedOcc != null ? ' (' + t.trackedOcc + ' tracked, ' + t.otherOcc + ' other residents)' : ''));
  if (w.beds && t.beds != null) bits.push(t.beds + ' ' + w.beds + ' occupied');
  // Names come off the ledger; a tracked count with no name is a sports-clock citizen (the sports desks') or a lost write.
  return t.hood + ': ' + bits.join(' → ') + '; tracked: ' + (t.names.length ? t.names.join(', ') : (t.trackedOcc > 0 ? 'tracked residents not named on this beat' : 'none tracked'));
}
/** Facts off a censusTrail: one city line, then up to `maxHoods` hood lines (one scope each). */
function censusFacts(trail, system, src, maxHoods = 4) {
  const facts = [];
  if (trail.state !== 'ON_RECORD') return facts;
  const w = TRAIL_WORDS[system];
  const c = trail.city;
  if (c) {
    facts.push({
      text: c.complete
        ? 'Citywide ' + (system === 'judicial' ? 'custody' : 'hospital') + ' this cycle: ' + fmtInt(c.intakes) + ' ' + w.intake + ((c.intakes || 0) === 1 ? '' : 's') +
          (c.tracked != null ? ' (' + c.tracked + ' tracked, ' + c.other + ' other residents)' : '') + '; ' + fmtInt(c.closing) + ' ' + w.occ + ' at the close' +
          (w.beds && c.beds != null ? ', ' + c.beds + ' ' + w.beds + ' occupied' : '') + (c.exits ? '; ' + c.exits + ' left' : '')
        : 'Citywide ' + (system === 'judicial' ? 'custody' : 'hospital') + ' census is ' + c.completeness + ' this cycle — the city number is withheld',
      src: src + ' city'
    });
  }
  for (const t of trail.hoods.slice(0, maxHoods)) facts.push({ text: trailLine(t, system), src: src + ' ' + t.hood });
  return facts;
}

/** Tracked names per hood off the two ledgers, for the census trail. */
function custodyNamesByHood(judicialRows, profiles) {
  const m = new Map();
  for (const c of judicialRows || []) {
    if (!CUSTODY_STATES.test(String(c.StatusNow || '').trim()) || !c.Name) continue;
    if (sportsSubject(profiles, c.POPID)) continue;
    const k = hoodKey(c.Neighborhood);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(String(c.Name).trim());
  }
  return m;
}
function careNamesByHood(hospitalRows, profiles) {
  const m = new Map();
  for (const r of hospitalRows || []) {
    if (!HOSPITAL_OPEN_STATES.test(String(r.StatusNow || '').trim()) || !r.Name) continue;
    if (sportsSubject(profiles, r.POPID)) continue;
    const k = hoodKey(r.Neighborhood);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(String(r.Name).trim());
  }
  return m;
}

/** The engine's receipt hooks (numbers in the text are the engine's own) as facts, by HookType; a hood filter when the beat is one block. */
function receiptHookFacts(hookRows, cycle, typeRe, src, hood) {
  const seen = new Set();
  return (hookRows || [])
    .filter(r => Number(r.Cycle) === Number(cycle) && typeRe.test(String(r.HookType || '').toUpperCase()) &&
      (hood === undefined || hoodKey(r.Neighborhood) === hoodKey(hood)))
    // The engine's own fine line names the case ID (it embeds the POPID): the ID stays in src, the prose loses it.
    .map(r => ({ text: String(r.HookText || '').trim().replace(/,?\s*case J-C\d+-POP-\d+/gi, ''), src: src + ' ' + String(r.HookType || '').toUpperCase() + (r.Neighborhood ? ' ' + r.Neighborhood : '') }))
    .filter(f => f.text && !seen.has(f.text) && seen.add(f.text));
}

const DEBT_CRISIS_LINE = 5; // the engine's own line (generationalWealthEngine: debt >= 5 raises DEBT_CRISIS)
function parseDialState(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(String(raw)); } catch (_) { return null; }
}
/**
 * Debt as a pattern this cycle: who defaulted (the ledger's own mark,
 * DialState.debtDefault.l === cycle), where the DEBT_CRISIS / DEBT_DEFAULT hooks
 * landed, and how many on the ledger sit at or over the engine's crisis line.
 * `hood` narrows every count to one block. Returns { defaults, crisisByHood, overLine, overLineByHood, facts }.
 */
function debtPattern(profiles, hookRows, cycle, src, hood) {
  const want = hood === undefined ? null : hoodKey(hood);
  const defaults = [];
  let overLine = 0;
  const overLineByHood = new Map();
  for (const p of (profiles || new Map()).values()) {
    const h = String(p.Neighborhood || '').trim();
    if (want != null && hoodKey(h) !== want) continue;
    const lvl = num(p.DebtLevel);
    if (lvl != null && lvl >= DEBT_CRISIS_LINE && !sportsSubject(profiles, p.POPID)) {
      overLine += 1;
      overLineByHood.set(h, (overLineByHood.get(h) || 0) + 1);
    }
    const ds = parseDialState(p.DialState);
    if (ds && ds.debtDefault && Number(ds.debtDefault.l) === Number(cycle) && !sportsSubject(profiles, p.POPID)) {
      defaults.push(person(String(p.POPID).toUpperCase(), String(p.Name || '').trim(), String(p.RoleType || '').trim() || null, h || null,
        'defaulted on the debts this cycle (Simulation_Ledger)'));
    }
  }
  const crisisByHood = new Map();
  for (const r of hookRows || []) {
    if (Number(r.Cycle) !== Number(cycle)) continue;
    const t = String(r.HookType || '').toUpperCase();
    if (t !== 'DEBT_CRISIS' && t !== 'DEBT_DEFAULT') continue;
    const h = String(r.Neighborhood || '').trim() || 'unplaced';
    if (want != null && hoodKey(h) !== want) continue;
    if (!crisisByHood.has(h)) crisisByHood.set(h, { crisis: 0, defaults: 0 });
    crisisByHood.get(h)[t === 'DEBT_CRISIS' ? 'crisis' : 'defaults'] += 1;
  }
  const facts = [];
  const crisisTotal = [...crisisByHood.values()].reduce((a, v) => a + v.crisis, 0);
  const defaultHooks = [...crisisByHood.values()].reduce((a, v) => a + v.defaults, 0);
  if (crisisTotal || defaultHooks || defaults.length) {
    const bits = [];
    if (crisisTotal) bits.push(crisisTotal + ' household' + (crisisTotal === 1 ? "'s" : "s'") + ' debts crossed the line this cycle' +
      (want == null ? ' (' + [...crisisByHood].filter(([, v]) => v.crisis).map(([h, v]) => h + ' ' + v.crisis).join(', ') + ')' : ''));
    const d = Math.max(defaultHooks, defaults.length);
    if (d) bits.push(d + ' defaulted' + (defaults.length ? ': ' + defaults.map(p => p.name + (want == null && p.neighborhood ? ' (' + p.neighborhood + ')' : '')).join(', ') : ''));
    facts.push({ text: (want == null ? 'Debt this cycle: ' : hood + ' debt this cycle: ') + bits.join('; '), src: src + ' DEBT_CRISIS/DEBT_DEFAULT' + (defaults.length ? ' + Simulation_Ledger DialState' : '') });
  }
  // The over-the-line count is standing state, not an event: it rides only as
  // context in a cycle where a debt crossed the line or a default landed, so a
  // weekly piece never echoes the same number back into canon.
  if (overLine && facts.length) {
    const top = [...overLineByHood].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h, n]) => h + ' ' + n).join(', ');
    facts.push({ text: (want == null ? overLine + ' tracked residents on the ledger carry debt at or over the crisis line' + (top ? ' — most in ' + top : '')
      : overLine + ' tracked residents of ' + hood + ' carry debt at or over the crisis line'), src: 'output/simulation_ledger_snapshot.jsonl DebtLevel >= ' + DEBT_CRISIS_LINE });
  }
  return { defaults, crisisByHood, overLine, overLineByHood, facts };
}

module.exports = {
  ROOT, SCHEMA, FACTS_TAIL, FORBIDDEN,
  num, hoodKey, fmtInt, loadJson, arg,
  loadBeatTabs, loadProfiles, prevTabRows, rosterAtSectors, hooksFor, domainHooks, seedsFor,
  person, personFromProfile, citizenTags, makeSlice, emptySlice, formatMarkdown, wire,
  // engine.254 Task 10
  sportsSubject, money, TREASURY_SOURCES, treasuryWeek, courtCases, censusTrail, censusFacts,
  custodyNamesByHood, careNamesByHood, receiptHookFacts, debtPattern, DEBT_CRISIS_LINE
};
