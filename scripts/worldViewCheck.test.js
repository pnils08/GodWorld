'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkWorldView, loadEngine, run } = require('./worldViewCheck');
const ROOT = path.resolve(__dirname, '..');
const engine = loadEngine(ROOT);

// Entirely synthetic identities/data. Fixtures stay in memory or a private /tmp
// directory, never in GodWorld output, Sheets, Drive or canon.
function fixture() {
  const name = 'SYNTHETIC Citizen One', hood = 'SYNTHETIC District';
  const person = {
    id: 'POP-90001', lives: hood, n: name, x: 'SYNTHETIC event — exact punctuation.', all: [['p', 'SYNTHETIC event — exact punctuation.']],
    g: 'f', ab: 'adult', role: 'SYNTHETIC role',
    said: { x: 'SYNTHETIC reflection.', c: 114 },
    saidMore: [{ x: 'SYNTHETIC older thought.', c: 99 }],
    hh: 'HH-SYNTHETIC', home: { type: 'couple', housing: 'rented', with: ['SYNTHETIC Citizen Two'] },
    emp: 'SYNTHETIC Business',
    runs: [{ n: 'SYNTHETIC Business', hood }],
  };
  const hoods = [{ name: hood, people: [person], biz: [
    { id: 'BIZ-SYNTHETIC-1', n: 'SYNTHETIC Business', s: 'SYNTHETIC sector', e: 1 },
    { id: 'BIZ-SYNTHETIC-2', n: 'SYNTHETIC Venue', s: 'SYNTHETIC venue sector', e: 1 },
  ], lay: { L: 110, water: 0, slope: 0, parcels: [{ id: 'synthetic-e01', b: 0 }, { id: 'synthetic-e02' }], places: [{ type: 'theater', b: 1 }] } }];
  const style = { [hood]: { q: 'SYNTHETIC canon phrase', set: [] }, LANDMARKS: {} };
  const build = { CYCLE: '115', SIM_YEAR: 2042, canonProblems: [], hoods,
    data: { cycle: 115, hoods, notShown: [], unplacedBiz: [], style: { [hood]: style[hood] } } };
  const sources = {
    meta: { cycle: 115 }, ledgerMeta: { cycle: 115 }, style, canon: 'SYNTHETIC canon phrase',
    life: [{ POPID: 'POP-90001', Name: name, Neighborhood: hood, Cycle: '115', EventText: person.x }],
    ledger: [
      { POPID: 'POP-90001', Name: name, Neighborhood: hood, BirthYear: 2000, Gender: ' female ', RoleType: ' SYNTHETIC role ',
        SpouseId: 'POP-90002 stale display suffix', HouseholdId: 'HH-SYNTHETIC', EmployerBizId: 'BIZ-SYNTHETIC-1' },
      { POPID: 'POP-90002', Name: 'SYNTHETIC Citizen Two', Neighborhood: hood },
    ],
    households: [{ HouseholdId: 'HH-SYNTHETIC', Members: '["POP-90001","POP-90002"]', HouseholdType: 'couple', HousingType: 'rented' }],
    businesses: [
      { BIZ_ID: 'BIZ-SYNTHETIC-1', Name: 'SYNTHETIC Business', Neighborhood: hood, Sector: 'SYNTHETIC sector', Key_Personnel: 'POP-90001 (SYNTHETIC)' },
      { BIZ_ID: 'BIZ-SYNTHETIC-2', Name: 'SYNTHETIC Venue', Neighborhood: hood, Sector: 'SYNTHETIC venue sector', Key_Personnel: '' },
    ],
    reflections: [
      { POPID: 'POP-90001', Cycle: '114', Timestamp: '2042-01-01T00:00:00Z', ReflectionExcerpt: 'SYNTHETIC  reflection.\nMore source words.' },
      { POPID: 'POP-90001', Cycle: '99', Timestamp: 'C99', ReflectionExcerpt: 'SYNTHETIC older thought.' },
    ],
  };
  return { build, sources, second: structuredClone(build), person, hood: hoods[0] };
}
const check = f => checkWorldView(f.build, f.sources, engine, f.second);
function rejects(code, mutate) {
  const f = fixture(); mutate(f);
  const failures = check(f);
  assert.ok(failures.some(s => s.startsWith(code + ' ')), `expected ${code}, got ${JSON.stringify(failures)}`);
  assert.ok(failures.every(s => !/[\r\n]/.test(s)), 'each failure is one physical line');
}

test('valid synthetic provenance including special place, blank parcel and legacy timestamp passes', () => {
  assert.deepEqual(check(fixture()), []);
});
test('event checks are exact and person/cycle bound, including every secondary line', () => {
  rejects('event', f => { f.person.x += ' invented'; });
  rejects('event', f => { f.person.all.push(['h', 'SYNTHETIC invented secondary line\nwith newline']); });
  rejects('event', f => { f.sources.life[0].EventText = 'SYNTHETIC changed punctuation!'; });
  rejects('identity', f => { f.sources.life[0].Cycle = '114'; });
  const f = fixture();
  f.person.all.push(['m', 'SYNTHETIC blank-name event']);
  f.sources.life.push({ POPID: 'POP-90001', Name: '', Neighborhood: '', Cycle: '115', EventText: 'SYNTHETIC blank-name event' });
  assert.deepEqual(check(f), []);
  rejects('event', f => {
    f.person.all.push(['m', 'SYNTHETIC someone else event']);
    f.sources.life.push({ POPID: 'POP-90002', Name: f.person.n, Neighborhood: 'SYNTHETIC Elsewhere', Cycle: '115', EventText: 'SYNTHETIC someone else event' });
  });
});
test('POPID distinguishes same-name citizens and is required', () => {
  rejects('identity', f => { delete f.person.id; });
  rejects('identity', f => { f.person.id = 'POP-99999'; });
  rejects('identity', f => { f.sources.ledger[0].Name = 'SYNTHETIC unrelated person'; });
  rejects('identity', f => { f.person.id = 'POP-90002'; });
  const f = fixture();
  f.sources.ledger[1] = { ...f.sources.ledger[0], POPID: 'POP-90002' };
  f.person.home.with = [f.person.n];
  const second = { ...structuredClone(f.person), id: 'POP-90002' };
  for (const key of ['said', 'saidMore', 'emp', 'runs']) delete second[key];
  f.hood.people.push(second);
  f.sources.life.push({ ...f.sources.life[0], POPID: second.id, Name: '' });
  assert.deepEqual(check(f), [], 'same name and street do not erase explicit POPIDs');
});
test('residence is ledger home, distinct from event location', () => {
  rejects('lives', f => { delete f.person.lives; });
  rejects('lives', f => { f.person.lives = 'SYNTHETIC invented home'; });
  const f = fixture();
  f.person.lives = f.sources.ledger[0].Neighborhood = 'SYNTHETIC Different Home';
  assert.deepEqual(check(f), []);
});
test('noPlace discloses only locationless events placed at ledger home', () => {
  const f = fixture(); f.sources.life[0].Name = ''; f.sources.life[0].Neighborhood = ''; f.person.noPlace = 1;
  assert.deepEqual(check(f), []);
  delete f.person.noPlace;
  assert.ok(check(f).some(s => s.startsWith('noPlace ')));
  rejects('noPlace', f => { f.person.noPlace = 1; });
  rejects('noPlace', f => { f.person.noPlace = 'yes'; });
  rejects('noPlace', f => { f.person.noPlace = 1; f.sources.life[0].Neighborhood = ''; f.person.lives = f.sources.ledger[0].Neighborhood = 'SYNTHETIC Elsewhere'; });
});
test('notShown accounts for omitted event citizens without excusing invented or ambiguous names', () => {
  const f = fixture(); f.hood.people = [];
  assert.ok(check(f).some(s => s.startsWith('missing-person ')));
  f.build.data.notShown = [{ n: f.person.n, role: f.person.role, why: 'SYNTHETIC capacity omission' }];
  assert.deepEqual(check(f), []);
  f.build.data.notShown.push(f.build.data.notShown[0]);
  assert.ok(check(f).some(s => s.startsWith('notShown ')));
  f.build.data.notShown.pop();
  f.sources.ledger[1].Name = f.person.n;
  f.sources.life.push({ ...f.sources.life[0], POPID: 'POP-90002' });
  assert.ok(check(f).some(s => s.startsWith('notShown ')));
  rejects('notShown', f => { f.build.data.notShown = [{ n: 'SYNTHETIC Nobody', why: 'SYNTHETIC absent' }]; });
  const partial = fixture();
  partial.build.data.notShown = [{ n: partial.person.n, why: 'SYNTHETIC omitted from a second street' }];
  assert.deepEqual(check(partial), [], 'per-street omission need not mean missing everywhere');
});
test('reflection prefix permits whitespace normalization and word-trim ellipsis', () => {
  const f = fixture();
  f.sources.reflections[0].ReflectionExcerpt = 'SYNTHETIC '.repeat(40);
  f.person.said.x = 'SYNTHETIC '.repeat(29).trim() + '…';
  assert.deepEqual(check(f), []);
});
test('reflections reject altered, empty, overlong, wrong-person and wrong-cycle excerpts', () => {
  rejects('reflection', f => { f.person.said.x = 'SYNTHETIC never said'; });
  rejects('reflection', f => { f.person.said.x = '…'; });
  rejects('reflection', f => { f.person.said.x = 'x'.repeat(301); f.sources.reflections[0].ReflectionExcerpt = f.person.said.x; });
  rejects('reflection', f => { f.sources.reflections[0].POPID = 'POP-90002'; });
  rejects('reflection', f => { f.person.saidMore[0].c = 100; });
  rejects('reflection', f => { f.person.said = null; });
  rejects('future', f => { f.person.said.c = 119; f.sources.reflections[0].Cycle = '119'; });
});
test('business row and placement coverage cannot pass by filtering or duplication', () => {
  rejects('business', f => { f.hood.biz[0].n = 'SYNTHETIC invented business'; });
  rejects('business', f => { f.sources.businesses[0].Neighborhood = 'SYNTHETIC Elsewhere'; });
  rejects('duplicate', f => { f.hood.lay.places.push({ b: 0 }); });
  rejects('duplicate', f => { f.hood.biz.push(f.hood.biz[0]); });
  rejects('placement', f => { f.hood.lay.parcels[0].b = 999; });
  rejects('unplaced', f => { delete f.hood.lay.parcels[0].b; });
  rejects('unplaced', f => { f.hood.lay.places = []; });
  rejects('unplaced', f => f.sources.businesses.push({ BIZ_ID: 'BIZ-SYNTHETIC-3', Name: 'SYNTHETIC outside map', Neighborhood: 'SYNTHETIC City-wide' }));
});
function addUnplaced(f) {
  const b = { BIZ_ID: 'BIZ-SYNTHETIC-3', Name: 'SYNTHETIC outside map', Neighborhood: 'SYNTHETIC City-wide' };
  f.sources.businesses.push(b);
  f.build.data.unplacedBiz.push({ n: b.Name, hood: b.Neighborhood });
}
test('listed off-map businesses report known-unplaced; fake, duplicate and on-street exemptions fail', () => {
  const f = fixture(), reports = []; addUnplaced(f);
  assert.deepEqual(checkWorldView(f.build, f.sources, engine, f.second, reports), []);
  assert.equal(reports.length, 1); assert.match(reports[0], /^KNOWN-UNPLACED BIZ-SYNTHETIC-3:/);
  rejects('unplaced-list', f => { addUnplaced(f); f.build.data.unplacedBiz[0].n = 'SYNTHETIC forged'; });
  rejects('unplaced-list', f => { addUnplaced(f); f.build.data.unplacedBiz.push(f.build.data.unplacedBiz[0]); });
  rejects('unplaced-list', f => { delete f.hood.lay.parcels[0].b; f.build.data.unplacedBiz.push({ n: f.hood.biz[0].n, hood: f.hood.name }); });
  rejects('shape', f => { delete f.build.data.unplacedBiz; });
  rejects('shape', f => { delete f.build.data.notShown; });
});
test('duplicate/missing parcel ids and divergent builds fail', () => {
  rejects('duplicate', f => { f.hood.lay.parcels[1].id = f.hood.lay.parcels[0].id; });
  rejects('parcel', f => { delete f.hood.lay.parcels[0].id; });
  rejects('layout', f => { f.second.hoods[0].lay.L++; });
});
test('canon is checked independently of canonProblems and catches changed screen phrase', () => {
  rejects('canon', f => { f.sources.canon = 'SYNTHETIC unrelated'; });
  rejects('canon', f => { delete f.sources.style[f.hood.name]; });
  rejects('canon', f => { f.build.data.style[f.hood.name] = { q: 'SYNTHETIC invented' }; });
  rejects('canon', f => { f.build.canonProblems.push('SYNTHETIC missing landmark'); });
  rejects('canon', f => { f.sources.style[f.hood.name].set = ['synthetic']; f.sources.style.LANDMARKS.synthetic = 'SYNTHETIC absent landmark'; });
});
test('sex and role resolve to the actual snapshot rather than arbitrary prefix guesses', () => {
  rejects('sex', f => { f.person.g = 'm'; });
  rejects('sex', f => { f.sources.ledger[0].Gender = 'fictional'; });
  rejects('role', f => { f.person.role = 'SYNTHETIC invented role'; });
  const f = fixture(); f.sources.ledger[0].Gender = ''; f.person.g = '';
  assert.deepEqual(check(f), []);
});
test('actual engine age edges and unknown BirthYear behavior are exercised', () => {
  for (const [age, band] of [[12,'child'],[13,'teen'],[17,'teen'],[18,'youth'],[22,'youth'],[23,'youngAdult'],[35,'youngAdult'],[36,'adult'],[64,'adult'],[65,'senior']]) {
    const f = fixture(); f.sources.ledger[0].BirthYear = 2042 - age; f.person.ab = band;
    assert.deepEqual(check(f), [], `age ${age}`);
    f.person.ab = band === 'senior' ? 'child' : 'senior';
    assert.ok(check(f).some(s => s.startsWith('band ')), `wrong age ${age} must fail`);
  }
  for (const birthYear of ['', null, 'invalid', 1900, 2100]) {
    const f = fixture(); f.sources.ledger[0].BirthYear = birthYear; f.person.ab = 'adult';
    assert.deepEqual(check(f), []);
  }
});
test('calendar year boundaries, invalid cycles and stale metadata fail appropriately', () => {
  for (const [cycle, year] of [[1,2040],[52,2040],[53,2041],[104,2041],[105,2042]]) assert.equal(engine.year(cycle), year);
  rejects('year', f => { f.build.SIM_YEAR = 2043; });
  rejects('cycle', f => { f.sources.ledgerMeta.cycle = 114; });
  rejects('cycle', f => { f.sources.meta.cycle = 116; });
  rejects('cycle', f => { f.build.CYCLE = 0; });
});
test('home resolves complete membership, not just plausible names', () => {
  rejects('home', f => { f.person.home.with = ['SYNTHETIC stranger']; });
  rejects('home', f => { f.person.home.with = []; });
  rejects('home', f => { f.sources.households[0].Members = 'broken'; });
  rejects('home', f => { f.sources.households[0].Members = '{}'; });
  rejects('home', f => { f.sources.households[0].Members = '["POP-90002"]'; });
  rejects('home', f => { f.sources.households[0].Members = '["POP-90001","POP-99999"]'; });
  rejects('home', f => { f.person.hh = 'HH-SYNTHETIC-OTHER'; });
  rejects('home', f => { f.person.home.housing = 'owned'; });
});
test('employer/key person links must resolve via the linked id', () => {
  rejects('employer', f => { f.person.emp = 'SYNTHETIC Venue'; });
  rejects('runs', f => { f.sources.businesses[0].Key_Personnel = 'POP-900010'; });
  rejects('runs', f => { f.person.runs[0].hood = 'SYNTHETIC Elsewhere'; });
  rejects('runs', f => { f.person.runs.push(f.person.runs[0]); });
});
test('missing optional relationships are not invented', () => {
  const f = fixture(); for (const key of ['home','hh','emp','runs','said','saidMore','role']) delete f.person[key];
  delete f.sources.ledger[0].RoleType;
  assert.deepEqual(check(f), []);
});
test('empty or malformed rendered scope and duplicate source ids cannot pass vacuously', () => {
  rejects('shape', f => { f.build.data.hoods = f.build.hoods = []; });
  rejects('shape', f => { f.person.all = null; });
  rejects('source', f => { f.sources.ledger.push(f.sources.ledger[0]); });
  rejects('source', f => { f.sources.businesses.push(f.sources.businesses[0]); });
});

function diskFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-view-check-synthetic-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const f = fixture();
  const write = (relative, text) => { const p = path.join(dir, relative); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
  write('output/beats/meta.json', JSON.stringify(f.sources.meta));
  write('output/simulation_ledger_snapshot.meta.json', JSON.stringify(f.sources.ledgerMeta));
  for (const [name, key] of [['LifeHistory_Log','life'],['Reflection_Intake','reflections'],['Business_Ledger','businesses'],['Household_Ledger','households']]) {
    write(`output/beats/${name}.jsonl`, f.sources[key].map(r => JSON.stringify(r)).join('\n'));
  }
  write('output/simulation_ledger_snapshot.jsonl', f.sources.ledger.map(r => JSON.stringify(r)).join('\n'));
  write('docs/canon/INSTITUTIONS.md', f.sources.canon);
  write('world-view/hoods.js', 'module.exports = ' + JSON.stringify(f.sources.style));
  write('world-view/build.js', 'module.exports = ' + JSON.stringify(f.build));
  for (const relative of ['phase01-config/advanceSimulationCalendar.js','phase05-citizens/citizenContextBuilder.js']) write(relative, fs.readFileSync(path.join(ROOT, relative), 'utf8'));
  const messages = { out: [], err: [] }, io = { log: s => messages.out.push(s), error: s => messages.err.push(s) };
  return { dir, write, io, messages, f };
}
test('disk runner requires two builds and returns nonzero with one line per failure', t => {
  const d = diskFixture(t);
  assert.equal(run(d.dir, d.io), 0); assert.match(d.messages.out[0], /^PASS world-view/);
  d.write('world-view/build.js', `const count = require('./count'); count.n++; module.exports = ${JSON.stringify(d.f.build)}; module.exports.data.hoods[0].lay.L += count.n;`);
  d.write('world-view/count.js', 'module.exports = { n: 0 };');
  assert.equal(run(d.dir, d.io), 1); assert.ok(d.messages.err.some(s => s.startsWith('FAIL layout ')));
  assert.ok(d.messages.err.every(s => !/[\r\n]/.test(s)));
});
test('disk runner fails loud on missing and malformed source files', t => {
  const d = diskFixture(t);
  d.write('output/beats/Household_Ledger.jsonl', '{bad JSON}\n');
  assert.equal(run(d.dir, d.io), 1); assert.match(d.messages.err[0], /Household_Ledger\.jsonl:1:/);
  fs.unlinkSync(path.join(d.dir, 'output/beats/Household_Ledger.jsonl'));
  assert.equal(run(d.dir, d.io), 1); assert.match(d.messages.err[1], /ENOENT/);
});
test('disk runner refuses sources changed during module construction', t => {
  const d = diskFixture(t);
  d.write('world-view/build.js', `require('node:fs').writeFileSync(require('node:path').join(__dirname,'../output/beats/meta.json'), '{"cycle":116}'); module.exports = ${JSON.stringify(d.f.build)};`);
  assert.equal(run(d.dir, d.io), 1); assert.match(d.messages.err[0], /source files changed during check/);
});

test('disk runner reports known-unplaced separately and still fails genuine missing placements', t => {
  const d = diskFixture(t); addUnplaced(d.f);
  d.write('output/beats/Business_Ledger.jsonl', d.f.sources.businesses.map(r => JSON.stringify(r)).join('\n'));
  d.write('world-view/build.js', 'module.exports = ' + JSON.stringify(d.f.build));
  assert.equal(run(d.dir, d.io), 0);
  assert.match(d.messages.out[0], /^KNOWN-UNPLACED BIZ-SYNTHETIC-3:/);
  assert.match(d.messages.out[1], /1 known-unplaced businesses/);
  delete d.f.hood.lay.parcels[0].b;
  d.write('world-view/build.js', 'module.exports = ' + JSON.stringify(d.f.build));
  assert.equal(run(d.dir, d.io), 1);
  assert.ok(d.messages.err.some(s => s.startsWith('FAIL unplaced ')));
});
