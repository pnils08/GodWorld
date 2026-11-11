#!/usr/bin/env node
'use strict';

// Local disk only. Usage: node scripts/worldViewCheck.js
// This verifies the data contract, not the browser, tag ranking or spoken context.
// A missing POPID is resolved by Name + event neighborhood; ambiguity is a failure.
// Special places count as assigned businesses. Unplaced citywide/alias rows fail
// too: the checker never invents a neighborhood mapping to make coverage pass.
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

function checkWorldView(build, sources, engine, secondBuild) {
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
  const life = arr(sources.life, 'LifeHistory_Log').filter(r => String(r.Cycle) === String(build.CYCLE));
  const reflections = arr(sources.reflections, 'Reflection_Intake');
  const byIdentity = new Map(), byPerson = new Map(), byReflection = new Map();
  for (const row of life) {
    const key = JSON.stringify([row.Name, row.Neighborhood]);
    if (!byIdentity.has(key)) byIdentity.set(key, new Set());
    if (row.POPID) byIdentity.get(key).add(row.POPID);
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
      if (!Number.isInteger(p.b) || p.b < 0 || !biz[p.b]?.id) { fail('placement', h.name, 'invalid business index'); continue; }
      const id = biz[p.b].id;
      if (assigned.has(id)) fail('duplicate', id, 'business assigned to more than one parcel/place');
      assigned.add(id);
    }
    for (const p of arr(h.people, `${h.name}.people`)) {
      if (!p || typeof p.n !== 'string' || !p.n) { fail('identity', h.name, 'person has no name'); continue; }
      const where = `${h.name}/${p.n}`;
      const ids = byIdentity.get(JSON.stringify([p.n, h.name])) || new Set();
      if (ids.size !== 1) { fail('identity', where, `Name + event neighborhood resolves to ${ids.size} POPIDs`); continue; }
      const [id] = ids;
      if (p.id != null && p.id !== id) fail('identity', where, 'exported id disagrees with event identity');
      const rows = byPerson.get(id) || [];
      const events = [['x', p.x]];
      for (const [i, a] of arr(p.all, `${where}.all`).entries()) {
        if (!Array.isArray(a) || a.length !== 2) fail('shape', `${where}.all[${i}]`, 'expected [kind, EventText]');
        else events.push([`all[${i}][1]`, a[1]]);
      }
      for (const [field, text] of events) {
        if (typeof text !== 'string' || !text || !rows.some(r => r.Name === p.n && r.EventText === text && (!r.Neighborhood || r.Neighborhood === h.name))) {
          fail('event', `${where}.${field}`, `no verbatim named C${cycle} LifeHistory_Log row for ${id}: ${JSON.stringify(text)}`);
        }
      }
      const l = ledger.get(id);
      if (!l || nameOf(l) !== p.n) { fail('identity', where, `no matching citizen snapshot name for ${id}`); continue; }
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
      if (p.spouse !== undefined) {
        const match = String(l.SpouseId || '').match(/\bPOP-\d+\b/);
        const spouse = match && ledger.get(match[0]);
        if (!spouse || nameOf(spouse) !== p.spouse) fail('spouse', where, 'name does not resolve through snapshot SpouseId');
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
  for (const b of businesses.values()) {
    if (!assigned.has(b.BIZ_ID)) fail('unplaced', b.BIZ_ID, `${b.Name} (${b.Neighborhood}) has no parcel or place`);
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
    const failures = checkWorldView(first, sources, engine, second);
    for (const failure of failures) io.error(`FAIL ${failure}`);
    if (failures.length) return 1;
    io.log(`PASS world-view C${first.CYCLE}: ${first.hoods.length} neighborhoods; provenance and repeated layouts checked`);
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
