#!/usr/bin/env node
'use strict';

// Local disk only. Usage: node scripts/worldViewCheck.js
// This verifies the data contract, not the browser, tag ranking or spoken context.
// People and events resolve through POPID; residence comes from the ledger.
// Explicitly listed businesses outside the street map are known-unplaced.
// Missing placements on rendered streets still fail; no alias mapping is guessed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { isDeepStrictEqual: equal } = require('node:util');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function readRows(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line, i) => {
    if (!line.trim()) return [];
    try {
      const row = JSON.parse(line);
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('expected object');
      return [row];
    } catch (e) {
      throw new Error(`${file}:${i + 1}: ${e.message}`);
    }
  });
}
function readSources(root) {
  const beats = path.join(root, 'output/beats');
  return {
    meta: readJson(path.join(beats, 'meta.json')),
    ledgerMeta: readJson(path.join(root, 'output/simulation_ledger_snapshot.meta.json')),
    life: readRows(path.join(beats, 'LifeHistory_Log.jsonl')),
    reflections: readRows(path.join(beats, 'Reflection_Intake.jsonl')),
    businesses: readRows(path.join(beats, 'Business_Ledger.jsonl')),
    households: readRows(path.join(beats, 'Household_Ledger.jsonl')),
    ledger: readRows(path.join(root, 'output/simulation_ledger_snapshot.jsonl')),
    canon: fs.readFileSync(path.join(root, 'docs/canon/INSTITUTIONS.md'), 'utf8'),
    style: require(path.join(root, 'world-view/hoods.js')),
    // the engine's own list of stations by neighborhood (the page draws a rail line where it names one)
    stations: (() => { const out = {}; try { new Function(fs.readFileSync(path.join(root, 'utilities/ensureTransitMetrics.js'), 'utf8') + '\nreturn OAKLAND_BART_STATIONS;')().forEach(s => { (out[s.neighborhood] = out[s.neighborhood] || []).push(s.station); }); } catch (e) { return null; } return out; })(),
    // each street's state this cycle, the engine's own row (absent from a dump made before the tab was added to it)
    nmap: (() => { try { return readRows(path.join(beats, 'Neighborhood_Map.jsonl')); } catch (e) { return null; } })(),
    // who knows whom: the bond engine's master state (absent from a dump made before the tab was added to it)
    bonds: (() => { try { return readRows(path.join(beats, 'Relationship_Bonds.jsonl')); } catch (e) { return null; } })(),
    // the saved conversations between bonded pairs (scripts/citizen-exchange.js), by file name
    exchanges: (() => { const out = {}, dir = path.join(root, 'output/exchanges'); try { for (const f of fs.readdirSync(dir).sort()) if (/_conversation\.md$/.test(f)) out[f] = fs.readFileSync(path.join(dir, f), 'utf8'); } catch (e) { return null; } return out; })(),
    // the cycle's world summary, where the Chaos_Cars rows are printed (absent before the summary is built)
    worldSummary: (() => { try { return fs.readFileSync(path.join(root, 'output', `world_summary_c${readJson(path.join(beats, 'meta.json')).cycle}.md`), 'utf8'); } catch (e) { return null; } })(),
  };
}
function loadEngine(root) {
  // These files declare functions only; no Apps Script services are supplied.
  // Execute the engine's own rules instead of copying the thresholds under test.
  const context = vm.createContext({});
  for (const relative of ['phase01-config/advanceSimulationCalendar.js', 'phase05-citizens/citizenContextBuilder.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), context,
      { filename: relative, timeout: 1000 });
  }
  if (typeof context.simYearFromCycle_ !== 'function' || typeof context.deriveLifeState_ !== 'function') {
    throw new Error('engine calendar/life-state functions unavailable');
  }
  return {
    year: cycle => context.simYearFromCycle_(cycle),
    band: (birthYear, simYear) => context.deriveLifeState_({ birthYear, simYear }).band,
  };
}
const nameOf = row => row.Name || `${row.First || ''} ${row.Last || ''}`.trim();
const normalize = text => String(text || '').replace(/\s+/g, ' ').trim();
const sexOf = value => ({ m: 'm', male: 'm', f: 'f', female: 'f' })[String(value || '').trim().toLowerCase()] || '';
const validCycle = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

function checkWorldView(build, sources, engine, secondBuild, reports = []) {
  const failures = [];
  const fail = (code, where, message) => failures.push(`${code} ${JSON.stringify(where)}: ${String(message).replace(/[\r\n]+/g, ' ')}`);
  const arr = (value, where) => {
    if (!Array.isArray(value)) { fail('shape', where, 'expected array'); return []; }
    return value;
  };
  const index = (rows, key, label) => {
    const map = new Map();
    for (const [i, row] of arr(rows, label).entries()) {
      if (!row || typeof row !== 'object' || !row[key]) { fail('source', `${label}:${i + 1}`, `missing ${key}`); continue; }
      if (map.has(row[key])) fail('source', `${label}:${i + 1}`, `duplicate ${key} ${row[key]}`);
      map.set(row[key], row);
    }
    return map;
  };
  const cycle = Number(build.CYCLE);
  if (!validCycle(build.CYCLE)) fail('cycle', 'build.CYCLE', 'expected positive integer');
  for (const [label, value] of [['meta.cycle', sources.meta?.cycle], ['ledgerMeta.cycle', sources.ledgerMeta?.cycle], ['data.cycle', build.data?.cycle]]) {
    if (!validCycle(value) || Number(value) !== cycle) fail('cycle', label, `must match build cycle ${build.CYCLE}`);
  }
  const simYear = engine.year(cycle);
  if (build.SIM_YEAR !== simYear) fail('year', 'SIM_YEAR', `expected engine year ${simYear}, got ${build.SIM_YEAR}`);
  const ledger = index(sources.ledger, 'POPID', 'Simulation_Ledger');
  const businesses = index(sources.businesses, 'BIZ_ID', 'Business_Ledger');
  const households = index(sources.households, 'HouseholdId', 'Household_Ledger');
  const life = arr(sources.life, 'LifeHistory_Log').filter(r => String(r.Cycle) === String(build.CYCLE) && r.EventText && !/^CareerState/.test(r.EventTag || ''));
  const reflections = arr(sources.reflections, 'Reflection_Intake');
  const byPerson = new Map(), byReflection = new Map(), shownPeople = new Set();
  for (const row of life) {
    if (!byPerson.has(row.POPID)) byPerson.set(row.POPID, []);
    byPerson.get(row.POPID).push(row);
  }
  for (const row of reflections) {
    if (!byReflection.has(row.POPID)) byReflection.set(row.POPID, []);
    byReflection.get(row.POPID).push(row);
  }
  for (const issue of arr(build.canonProblems, 'canonProblems')) fail('canon', 'build', issue);
  if (typeof sources.canon !== 'string' || !sources.canon.trim()) fail('canon', 'INSTITUTIONS.md', 'missing canon text');
  const hoods = arr(build.data?.hoods, 'data.hoods');
  if (!hoods.length) fail('shape', 'data.hoods', 'no neighborhoods rendered');
  if (!equal(build.hoods, hoods)) fail('shape', 'hoods', 'export differs from rendered data.hoods');
  const hoodNames = new Set(), parcelIds = new Set(), displayedBiz = new Set(), assigned = new Set();
  for (const h of hoods) {
    if (!h || typeof h.name !== 'string') { fail('shape', 'neighborhood', 'missing name'); continue; }
    if (hoodNames.has(h.name)) fail('duplicate', h.name, 'neighborhood appears twice');
    hoodNames.add(h.name);
    const st = sources.style?.[h.name];
    if (!st || typeof st.q !== 'string' || !st.q || !sources.canon?.includes(st.q)) {
      fail('canon', h.name, 'missing drawing entry or phrase absent from INSTITUTIONS.md');
    }
    if (!equal(build.data?.style?.[h.name], st)) fail('canon', h.name, 'rendered style differs from hoods.js');
    for (const key of st?.set || []) {
      const landmark = sources.style?.LANDMARKS?.[key];
      if (landmark && !sources.canon?.includes(landmark)) fail('canon', h.name, `landmark absent from canon: ${landmark}`);
    }
    const biz = arr(h.biz, `${h.name}.biz`);
    for (const b of biz) {
      if (!b || !b.id) { fail('business', h.name, 'missing business id'); continue; }
      if (displayedBiz.has(b.id)) fail('duplicate', b.id, 'business listed more than once');
      displayedBiz.add(b.id);
      const source = businesses.get(b.id);
      if (!source || source.Neighborhood !== h.name || source.Name !== b.n || source.Sector !== b.s) {
        fail('business', `${h.name}/${b.id}`, 'name, sector or neighborhood does not match Business_Ledger');
      }
    }
    const placements = [
      ...arr(h.lay?.parcels, `${h.name}.parcels`).map(p => ({ p, parcel: true })),
      ...arr(h.lay?.places, `${h.name}.places`).map(p => ({ p, parcel: false })),
    ];
    for (const { p, parcel } of placements) {
      if (!p || typeof p !== 'object') { fail('shape', h.name, 'invalid placement'); continue; }
      if (parcel) {
        if (typeof p.id !== 'string' || !p.id) fail('parcel', h.name, 'missing parcel id');
        else if (parcelIds.has(p.id)) fail('duplicate', p.id, 'parcel id is not unique');
        else parcelIds.add(p.id);
      }
      if (p.b == null && parcel) continue; // unoccupied scenery is legitimate
      if (!parcel && p.type === 'rail' && p.b == null) { // a bare rail crossing: no business of its own, there because the engine lists a station for this neighborhood
        if (sources.stations && !sources.stations[h.name]) fail('rail', h.name, 'rail crossing on a street the engine lists no station for');
        continue;
      }
      if (!Number.isInteger(p.b) || p.b < 0 || !biz[p.b]?.id) { fail('placement', h.name, 'invalid business index'); continue; }
      const id = biz[p.b].id;
      if (assigned.has(id)) fail('duplicate', id, 'business assigned to more than one parcel/place');
      assigned.add(id);
    }
    for (const p of arr(h.people, `${h.name}.people`)) {
      if (!p || typeof p.n !== 'string' || !p.n) { fail('identity', h.name, 'person has no name'); continue; }
      const where = `${h.name}/${p.n}`;
      const id = p.id;
      if (typeof id !== 'string' || !/^POP-\d{5}$/.test(id) || !ledger.has(id)) {
        fail('identity', where, 'missing or unknown POPID'); continue;
      }
      shownPeople.add(id);
      const rows = byPerson.get(id) || [];
      if (!rows.length) fail('identity', where, `no current event rows for ${id}`);
      const events = [['x', p.x]];
      for (const [i, a] of arr(p.all, `${where}.all`).entries()) {
        if (!Array.isArray(a) || a.length !== 2) fail('shape', `${where}.all[${i}]`, 'expected [kind, EventText]');
        else events.push([`all[${i}][1]`, a[1]]);
      }
      for (const [field, text] of events) {
        if (typeof text !== 'string' || !text || !rows.some(r => r.EventText === text)) {
          fail('event', `${where}.${field}`, `no verbatim C${cycle} LifeHistory_Log row for ${id}: ${JSON.stringify(text)}`);
        }
      }
      const l = ledger.get(id);
      if (!l || nameOf(l) !== p.n) { fail('identity', where, `no matching citizen snapshot name for ${id}`); continue; }
      const residence = String(l.Neighborhood || '').trim();
      if ((p.lives || '') !== residence) fail('lives', where, 'does not match snapshot Neighborhood');
      if (p.noPlace !== undefined && p.noPlace !== 1 && p.noPlace !== true) fail('noPlace', where, 'expected 1 or true when present');
      if (p.noPlace) {
        if (!residence || h.name !== residence || rows.some(r => r.Neighborhood)) {
          fail('noPlace', where, 'requires locationless events and placement at ledger home');
        }
      } else if (!rows.some(r => r.Neighborhood === h.name)) {
        fail('noPlace', where, 'no current event locates this person on this street; home placement must be disclosed');
      }
      if (p.g !== sexOf(l.Gender)) fail('sex', where, 'does not match snapshot Gender');
      if (p.ab !== engine.band(l.BirthYear, simYear)) fail('band', where, 'does not match engine deriveLifeState_');
      if ((p.role || '') !== String(l.RoleType || '').trim()) fail('role', where, 'does not match snapshot RoleType');
      const quotes = [];
      if (p.said !== undefined) quotes.push(['said', p.said]);
      if (p.saidMore !== undefined) quotes.push(...arr(p.saidMore, `${where}.saidMore`).map((s, i) => [`saidMore[${i}]`, s]));
      for (const [field, q] of quotes) {
        const prefix = typeof q?.x === 'string' ? q.x.replace(/…$/, '') : '';
        if (!prefix || q.x.length > 300 || !validCycle(q.c) || !(byReflection.get(id) || []).some(r =>
          Number(r.Cycle) === Number(q.c) && normalize(r.ReflectionExcerpt).startsWith(prefix))) {
          fail('reflection', `${where}.${field}`, `no matching excerpt prefix and cycle for ${id}`);
        }
        if (Number(q?.c) > cycle) fail('future', `${where}.${field}`, `reflection C${q.c} is later than page C${cycle}`);
      }
      if (p.home !== undefined || p.hh !== undefined) {
        const home = households.get(l.HouseholdId);
        if (!home || p.hh !== l.HouseholdId || !p.home || !Array.isArray(p.home.with)) {
          fail('home', where, 'no matching HouseholdId/household/with array');
        } else {
          let members;
          try { members = JSON.parse(home.Members); } catch { members = null; }
          if (!Array.isArray(members) || members.some(m => typeof m !== 'string') || !members.includes(id)) {
            fail('home', where, 'household Members is malformed or does not include this person');
          } else {
            const missing = members.filter(m => !ledger.has(m));
            if (missing.length) fail('home', where, `unresolved member ids: ${missing.join(', ')}`);
            const expected = members.filter(m => m !== id).map(m => ledger.has(m) ? nameOf(ledger.get(m)) : null);
            if (!equal(p.home.with.slice().sort(), expected.slice().sort())) fail('home', where, 'with names do not match household members');
          }
          if (p.home.type !== (home.HouseholdType || '') || p.home.housing !== (home.HousingType || '')) fail('home', where, 'household type/housing mismatch');
        }
      }
      if (p.emp !== undefined) {
        const emp = businesses.get(l.EmployerBizId);
        if (!emp || emp.Name !== p.emp) fail('employer', where, 'name does not resolve through EmployerBizId');
      }
      if (p.runs !== undefined) {
        const seenRuns = new Set();
        for (const run of arr(p.runs, `${where}.runs`)) {
          const matches = Array.from(businesses.values()).filter(b => b.Name === run?.n && b.Neighborhood === run?.hood &&
            (String(b.Key_Personnel || '').match(/\bPOP-\d+\b/g) || []).includes(id));
          if (matches.length !== 1) fail('runs', where, 'business name/neighborhood does not resolve uniquely through Key_Personnel');
          else if (seenRuns.has(matches[0].BIZ_ID)) fail('runs', where, 'duplicate business');
          else seenRuns.add(matches[0].BIZ_ID);
        }
      }
    }
  }
  // notShown has names rather than ids. Prefer citizens missing everywhere;
  // a per-street cap can also omit someone who appears on a different street.
  const omitted = new Set(), omissionEntries = new Set();
  for (const p of arr(build.data?.notShown, 'data.notShown')) {
    const candidates = Array.from(byPerson.keys()).filter(id => ledger.has(id) && nameOf(ledger.get(id)) === p?.n);
    const unseen = candidates.filter(id => !shownPeople.has(id));
    const matches = unseen.length ? unseen : candidates;
    if (matches.length !== 1 || !p?.why || typeof p.why !== 'string') {
      fail('notShown', p?.n || 'entry', 'must identify one omitted current-event citizen and explain omission'); continue;
    }
    const id = matches[0];
    const entry = JSON.stringify([id, p.why]);
    if (omissionEntries.has(entry)) fail('notShown', id, 'duplicate omission');
    omissionEntries.add(entry);
    omitted.add(id);
    if (p.role && p.role !== String(ledger.get(id).RoleType || '').trim()) fail('notShown', id, 'role does not match snapshot');
  }
  for (const id of byPerson.keys()) {
    if (!shownPeople.has(id) && !omitted.has(id)) fail('missing-person', id, 'current events have neither a person nor a notShown entry');
  }
  const knownUnplaced = new Set();
  for (const b of arr(build.data?.unplacedBiz, 'data.unplacedBiz')) {
    const matches = Array.from(businesses.values()).filter(source => source.Name === b?.n && source.Neighborhood === b?.hood);
    if (matches.length !== 1 || hoodNames.has(b?.hood) || assigned.has(matches[0]?.BIZ_ID)) {
      fail('unplaced-list', b?.n || 'entry', 'must identify one ledger business outside the rendered streets'); continue;
    }
    const id = matches[0].BIZ_ID;
    if (knownUnplaced.has(id)) { fail('unplaced-list', id, 'duplicate known-unplaced entry'); continue; }
    knownUnplaced.add(id);
    reports.push(`KNOWN-UNPLACED ${id}: ${JSON.stringify(b.n)} (${JSON.stringify(b.hood)})`);
  }
  for (const b of businesses.values()) {
    if (!assigned.has(b.BIZ_ID) && !knownUnplaced.has(b.BIZ_ID)) fail('unplaced', b.BIZ_ID, `${b.Name} (${b.Neighborhood}) has no parcel or place and is not listed as known-unplaced`);
  }
  // the rail line: a street says it has stations exactly when the engine's list does
  if (sources.stations) for (const h of hoods) if (!equal(h.rail || [], sources.stations[h.name] || [])) fail('rail', h.name, 'stations differ from the engine list (OAKLAND_BART_STATIONS)');
  // chaos cars: every one on a street is a row of the world summary's Chaos Events table, on the street that row
  // points to, with the summary's own seed line; every row of the table is on a street or listed as elsewhere
  if (sources.worldSummary !== undefined) {
    const section = /^## Chaos Events[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(sources.worldSummary || '');
    const tableRows = section ? section[1].split('\n').filter(l => /^\| [a-z_]+ \|/.test(l)).map(l => l.split('|').map(x => x.trim())) : [];
    const pool = tableRows.map(c => `${c[1]}|${c[2]}|${c[3].replace(/\s+\(T\d\)$/, '')}`);
    const drawn = [];
    for (const h of hoods) for (const ev of arr(h.chaos || [], `${h.name}.chaos`)) {
      const key = `${ev?.v}|${ev?.o}|${ev?.scope} ${ev?.id}`, at = pool.indexOf(key);
      if (ev?.test) { fail('chaos', h.name, 'look-test chaos car in a build'); continue; }
      if (at < 0) { fail('chaos', h.name, `no Chaos Events row for ${key}`); continue; }
      pool.splice(at, 1); drawn.push(key);
      if (ev.seed && !sources.worldSummary.includes(ev.seed)) fail('chaos', h.name, `seed line is not the summary's: ${JSON.stringify(ev.seed)}`);
      if (ev.scope === 'neighborhood' && ev.id !== h.name) fail('chaos', h.name, `neighborhood row for ${ev.id} drawn here`);
      if (ev.scope === 'business' && businesses.get(ev.id)?.Neighborhood !== h.name) fail('chaos', h.name, `business ${ev.id} is not on this street`);
      if (ev.scope === 'port' && !arr(h.biz, `${h.name}.biz`).some(b => b.n === ev.id)) fail('chaos', h.name, `${ev.id} is not on this street`);
      if (ev.v === 'bart_train' && !arr(h.lay?.places || [], `${h.name}.places`).some(p => p.type === 'station' || p.type === 'rail')) fail('chaos', h.name, 'a train on a street with no line');
      if (ev.scope === 'citizen' && !arr(h.people, `${h.name}.people`).some(p => p.id === ev.id) && String(ledger.get(ev.id)?.Neighborhood || '').trim() !== h.name) fail('chaos', h.name, `citizen ${ev.id} is neither shown nor living on this street`);
    }
    for (const ev of arr(build.data?.chaos?.elsewhere || [], 'data.chaos.elsewhere')) { const key = `${ev?.v}|${ev?.o}|${ev?.scope} ${ev?.id}`, at = pool.indexOf(key); if (at < 0) fail('chaos', 'elsewhere', `no Chaos Events row for ${key}`); else pool.splice(at, 1); }
    for (const key of pool) fail('chaos', 'missing', `Chaos Events row neither on a street nor listed elsewhere: ${key}`);
    if (drawn.length) reports.push(`CHAOS ${drawn.length} on streets: ${drawn.join('; ')}`);
  }
  // direction scale: where a street stands is the engine's own Neighborhood_Map row for it this cycle, never the
  // page's. The word is NeighborhoodTrajectory; the scale is TrajectoryMomentum - 5 (a blank cell is 5, as the engine
  // reads it); since is TrajectoryStartCycle.
  {
    const rows = new Map(arr(sources.nmap || [], 'Neighborhood_Map').filter(r => String(r.Cycle) === String(build.CYCLE)).map(r => [r.Neighborhood, r]));
    let matched = 0;
    for (const h of hoods) {
      const st = h?.state, row = rows.get(h?.name);
      if (st?.test) { fail('state', h.name, 'look-test scale in a build'); continue; }
      if (!row) { if (st) fail('state', h.name, 'a state with no Neighborhood_Map row for this cycle'); continue; }
      const m = row.TrajectoryMomentum === '' || row.TrajectoryMomentum == null ? 5 : Number(row.TrajectoryMomentum);
      const want = Number.isFinite(m) ? { dir: String(row.NeighborhoodTrajectory || '').trim().toLowerCase(), scale: Math.max(-5, Math.min(5, Math.round(m) - 5)) } : null;
      if (want && /^\d+$/.test(String(row.TrajectoryStartCycle))) want.since = Number(row.TrajectoryStartCycle);
      if (!equal(st || null, want)) fail('state', h.name, `does not match its Neighborhood_Map row: page ${JSON.stringify(st || null)}, row ${JSON.stringify(want)}`);
      else matched++;
    }
    if (matched) reports.push(`STATE ${matched} streets on the direction scale, each matched to its Neighborhood_Map row`);
  }
  // ties: every tie on the page is an active Relationship_Bonds row between two citizen ids, in the row's own
  // order, with the row's type, intensity, note (less the seeding mark) and cycles; every such row with someone on
  // a street is on the page; a name given for someone off the streets is the ledger's; and a conversation shown on
  // a tie is that pair's latest saved one at or before the page's cycle, line for line.
  {
    const ties = arr(build.data?.ties || [], 'data.ties'), off = build.data?.offStreet || {};
    const isPop = v => /^POP-\d+$/.test(String(v || '')), key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const rows = new Map();
    for (const r of arr(sources.bonds || [], 'Relationship_Bonds')) {
      if (String(r?.Status || '').trim().toLowerCase() !== 'active' || !isPop(r.CitizenA) || !isPop(r.CitizenB) || r.CitizenA === r.CitizenB) continue;
      if (rows.has(key(r.CitizenA, r.CitizenB))) fail('tie', key(r.CitizenA, r.CitizenB), 'two active Relationship_Bonds rows for one pair');
      rows.set(key(r.CitizenA, r.CitizenB), r);
    }
    const latest = new Map();
    for (const [f, text] of Object.entries(sources.exchanges || {})) {
      const m = /^exchange_c(\d+)_(\d{4}-\d{2}-\d{2})_conversation\.md$/.exec(f); if (!m || Number(m[1]) > cycle) continue;
      const pm = /^- participants: (.+)$/m.exec(text), ps = pm ? pm[1].split(' | ').map(x => /^(POP-\d+) (.+)$/.exec(x.trim())) : [];
      if (ps.length !== 2 || ps.some(x => !x)) continue;
      const lines = []; let stray = 0;
      for (const l of text.split('\n')) { const lm = /^\*\*(.+?):\*\* (.*)$/.exec(l); if (!lm) continue; const i = lm[1] === ps[0][2] ? 0 : lm[1] === ps[1][2] ? 1 : -1; if (i < 0) stray++; else lines.push([ps[i][1], lm[2].trim()]); }
      if (stray || !lines.length) continue;
      const k = key(ps[0][1], ps[1][1]), prev = latest.get(k);
      if (!prev || prev.c < Number(m[1]) || (prev.c === Number(m[1]) && prev.date < m[2])) latest.set(k, { c: Number(m[1]), date: m[2], lines });
    }
    const seen = new Set(); let talks = 0;
    for (const t of ties) {
      const where = `${t?.a}~${t?.b}`, row = rows.get(key(t?.a, t?.b));
      if (!row) { fail('tie', where, 'no active Relationship_Bonds row between these two citizen ids'); continue; }
      if (seen.has(key(t.a, t.b))) { fail('tie', where, 'tie listed twice'); continue; }
      seen.add(key(t.a, t.b));
      if (t.a !== row.CitizenA || t.b !== row.CitizenB) fail('tie', where, 'not in the row\'s own order (CitizenA, CitizenB)');
      if (!shownPeople.has(t.a) && !shownPeople.has(t.b)) fail('tie', where, 'neither person is on a street');
      const want = { a: row.CitizenA, b: row.CitizenB, t: String(row.BondType || '').trim().toLowerCase(), i: Number(row.Intensity) || 0 };
      const note = String(row.Notes || '').replace(/^seeded\s*/, '').trim(); if (note) want.note = note;
      if (/^\d+$/.test(String(row.CycleCreated))) want.since = Number(row.CycleCreated);
      if (/^\d+$/.test(String(row.LastUpdate))) want.up = Number(row.LastUpdate);
      const tk = latest.get(key(t.a, t.b));
      if (tk) { want.talk = { c: tk.c, lines: tk.lines.map(l => [l[0] === row.CitizenA ? 0 : 1, l[1]]) }; talks++; }
      if (!equal(t, want)) fail('tie', where, `does not match its Relationship_Bonds row${tk || t.talk ? ' and saved conversation' : ''}: page ${JSON.stringify(t).slice(0, 300)}, source ${JSON.stringify(want).slice(0, 300)}`);
      for (const id of [t.a, t.b]) if (!shownPeople.has(id) && (!ledger.get(id) || off[id] !== nameOf(ledger.get(id)))) fail('tie', where, `${id} is off the streets and its name is not the ledger's`);
    }
    for (const [k, row] of rows) {
      if (seen.has(k) || (!shownPeople.has(row.CitizenA) && !shownPeople.has(row.CitizenB))) continue;
      const away = shownPeople.has(row.CitizenA) ? row.CitizenB : row.CitizenA;
      if (shownPeople.has(away) || (ledger.get(away) && nameOf(ledger.get(away)))) fail('tie', k, 'an active bond with someone on a street is missing from the page');
    }
    for (const id of Object.keys(off)) if (!ties.some(t => t?.a === id || t?.b === id)) fail('tie', id, 'named as off the streets but on no tie');
    if (ties.length) reports.push(`TIES ${ties.length} matched to active Relationship_Bonds rows; ${talks} carry the pair's latest saved conversation`);
  }
  // homes: every home on the page is an active Household_Ledger row of that street's neighborhood, with the row's
  // own housing type, kind, head, members (named from the ledger), rent (a renter's) and cycle; it stands on a lot
  // of that street that points back at it, alone in a house or in a unit nobody else has; and every active
  // household of a shown neighborhood has exactly one home (one in a neighborhood with no street is listed).
  {
    const seen = new Set(); let matched = 0;
    for (const h of hoods) {
      const lots = new Map(arr(h?.lay?.parcels || [], `${h?.name}.parcels`).map(p => [p?.id, p])), taken = new Set(), homes = arr(h?.homes || [], `${h?.name}.homes`);
      homes.forEach((hm, k) => {
        const where = `${h.name}/${hm?.hh}`, row = households.get(hm?.hh);
        if (!row || String(row.Status || '').trim().toLowerCase() !== 'active') { fail('home', where, 'no active Household_Ledger row'); return; }
        if (seen.has(hm.hh)) { fail('home', where, 'household has more than one home'); return; }
        seen.add(hm.hh);
        if (row.Neighborhood !== h.name) fail('home', where, `the household's neighborhood is ${row.Neighborhood}`);
        let mem = []; try { mem = JSON.parse(row.Members || '[]'); } catch (e) { mem = []; }
        const own = /^own/i.test(String(row.HousingType || '')) ? 1 : 0;
        const want = { hh: row.HouseholdId, own, type: String(row.HouseholdType || ''), mem: (Array.isArray(mem) ? mem : []).map(id => [id, ledger.get(id) ? nameOf(ledger.get(id)) : '']).filter(m => m[1]) };
        if (row.HeadOfHousehold) want.head = String(row.HeadOfHousehold);
        if (!own && Number(row.MonthlyRent) > 0) want.rent = Number(row.MonthlyRent);
        if (/^\d+$/.test(String(row.FormedCycle))) want.since = Number(row.FormedCycle);
        const got = Object.assign({}, hm); delete got.lot; delete got.unit;
        if (!equal(got, want)) fail('home', where, `does not match its Household_Ledger row: page ${JSON.stringify(got).slice(0, 260)}, row ${JSON.stringify(want).slice(0, 260)}`);
        else matched++;
        const lot = lots.get(hm.lot);
        if (!lot) { fail('home', where, `lot ${hm.lot} is not a parcel of this street`); return; }
        if (!Array.isArray(lot.hm) || !lot.hm.includes(k)) fail('home', where, `lot ${hm.lot} does not point back at this home`);
        const spot = lot.k === 'h' ? lot.id : `${lot.id}/${hm.unit}`;
        if (lot.k === 'h' ? hm.unit !== undefined : !hm.unit) fail('home', where, lot.k === 'h' ? 'a unit in a house' : 'no unit in a building');
        if (taken.has(spot)) fail('home', where, `${spot} already has a household`);
        taken.add(spot);
      });
      for (const p of lots.values()) for (const k of arr(p?.hm || [], `${h.name}.${p?.id}.hm`)) if (homes[k]?.lot !== p.id) fail('home', `${h.name}/${p.id}`, 'lot points at a home that is not on it');
    }
    const elsewhere = new Set(arr(build.data?.homesElsewhere || [], 'data.homesElsewhere').map(e => e?.hh));
    for (const row of households.values()) {
      if (String(row.Status || '').trim().toLowerCase() !== 'active' || !row.Neighborhood) continue;
      if (hoodNames.has(row.Neighborhood) ? !seen.has(row.HouseholdId) : !elsewhere.has(row.HouseholdId)) fail('home', row.HouseholdId, hoodNames.has(row.Neighborhood) ? `active household of ${row.Neighborhood} has no home on the page` : 'active household of a neighborhood with no street is not listed');
    }
    if (matched) reports.push(`HOMES ${matched} households matched to active Household_Ledger rows, each on one lot of its street`);
  }
  if (!secondBuild?.data?.hoods || !equal(
    hoods.map(h => ({ name: h.name, lay: h.lay })),
    secondBuild.data.hoods.map(h => ({ name: h.name, lay: h.lay })))) {
    fail('layout', 'two builds', 'layouts differ or second build is missing');
  }
  return failures;
}

function run(root = path.resolve(__dirname, '..'), io = console) {
  try {
    const sources = readSources(root);
    const engine = loadEngine(root);
    const file = require.resolve(path.join(root, 'world-view/build.js'));
    delete require.cache[file];
    const first = require(file); // module mode: no HTML/ambient reads or writes
    delete require.cache[file];
    delete require.cache[require.resolve(path.join(root, 'world-view/hoods.js'))];
    const second = require(file);
    // Reject inputs changing underneath the two builds instead of validating a mix.
    if (!equal(sources, readSources(root))) throw new Error('source files changed during check; rerun on a stable snapshot');
    const reports = [];
    const failures = checkWorldView(first, sources, engine, second, reports);
    for (const report of reports) io.log(report);
    for (const failure of failures) io.error(`FAIL ${failure}`);
    if (failures.length) return 1;
    io.log(`PASS world-view C${first.CYCLE}: ${first.hoods.length} neighborhoods; ${reports.filter(r => r.startsWith('KNOWN-UNPLACED')).length} known-unplaced businesses; ${reports.filter(r => r.startsWith('CHAOS')).length ? 'chaos cars matched to the world summary; ' : ''}provenance and repeated layouts checked`);
    return 0;
  } catch (e) {
    io.error(`FAIL input: ${String(e.message).replace(/[\r\n]+/g, ' ')}`);
    return 1;
  }
}
if (require.main === module) {
  if (process.argv.length > 2) { console.error('FAIL usage: node scripts/worldViewCheck.js (no arguments)'); process.exitCode = 1; }
  else process.exitCode = run();
}
module.exports = { checkWorldView, loadEngine, readSources, run };
