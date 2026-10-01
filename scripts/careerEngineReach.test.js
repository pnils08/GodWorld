#!/usr/bin/env node
'use strict';

/**
 * careerEngineReach.test.js — engine.274: the career walk reaches every row; the cap
 * counts texture events only; the capped events rotate.
 *
 * The FULL runCareerEngine_ runs in an isolated VM with the real pressure functions,
 * the real dial accessor and the real Phase-9 fold. Citizens and the one business are
 * synthetic and exist only in this sandbox; no Sheet is opened.
 *
 * Run: node scripts/careerEngineReach.test.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); passed++; }
  else { console.error('  FAIL ' + label + (detail !== undefined ? ': ' + detail : '')); failed++; }
}

// ---------------------------------------------------------------------------
// sandbox
// ---------------------------------------------------------------------------
const writes = [], errors = [];
const w = {
  console, Math, JSON, Object, Array, String, Number, Date, RegExp, isNaN, isFinite, parseInt, parseFloat,
  Logger: { log: m => { if (/failed|error/i.test(String(m))) errors.push(String(m)); } },
  safeRand_: ctx => ctx.rng,
  inWorldStamp_: ctx => 'C' + ctx.summary.absoluteCycle,
  queueAppendIntent_: (ctx, tab, row) => writes.push({ tab, row: row.slice() }),
  queueBatchAppendIntent_: (ctx, tab, rows) => rows.forEach(row => writes.push({ tab, row: row.slice() })),
  queueCellIntent_: () => {},
  logEngineError_: (ctx, phase, err) => errors.push(phase + ': ' + (err && err.message)),
  hoodTexturePool_: () => [],          // canonNeighborhoodLoader's hood lines are colour, not under test
  ECONOMIC_PARAMETERS: JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'economic_parameters.json'), 'utf8'))
};
vm.createContext(w);
for (const rel of [
  'utilities/citizenMemory.js', 'utilities/citizenDialMap.js', 'utilities/compressLifeHistory.js',
  'utilities/citizenDerivation.js', 'phase01-config/advanceSimulationCalendar.js',
  'phase05-citizens/educationCareerEngine.js', 'phase05-citizens/maneuverEngine.js',
  'utilities/cycleModes.js', 'phase05-citizens/judicialLifecycle.js',
  'phase05-citizens/generationalWealthEngine.js',   // hospitalIncomeHit_ / setHospitalIncomeState_
  'phase05-citizens/runCareerEngine.js'
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), w, { filename: rel });
}
w.inWorldStamp_ = ctx => 'C' + ctx.summary.absoluteCycle;   // the calendar file defines the real one; keep the stub

const H = ['POPID', 'First', 'Last', 'Neighborhood', 'RoleType', 'Status', 'StatusStartCycle', 'Tier', 'BirthYear', 'CareerStage',
  'YearsInCareer', 'EducationLevel', 'LastPromotionCycle', 'LifeHistory', 'LastUpdated', 'ClockMode', 'EconomicProfileKey',
  'Income', 'NetWorth', 'WealthLevel', 'EmployerBizId', 'SkillTags', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'TraitProfile', 'DialState'];
const I = n => H.indexOf(n);
const BL = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary', 'Annual_Revenue', 'Growth_Rate'],
  ['BIZ-SYNTH', 'Synthetic Reach Employer', 'Bakery', 'Temescal', 500, 50000, 1000000, 0]];
const SEED_LINE = 'C150 — [CareerState] industry=service|employer=small|level=1|tenure=4|skill=general:0.2';

function dial(base) {
  const c = w.newCitizen_(); c.folded = 199;
  Object.keys(base || {}).forEach(k => { c.base[k] = base[k]; });
  return w.serializeDialState_(c);
}
const OVERWORK = { drive: 85, composure: 50 };   // drive band +2, composure band 0
function row(o) {
  const d = { POPID: 'SYN-X', First: 'Synthetic', Last: 'Reach', Neighborhood: 'Temescal', RoleType: 'Baker', Status: 'Active',
    StatusStartCycle: '', Tier: 4, BirthYear: 1990, CareerStage: 'mid-career', YearsInCareer: 8, EducationLevel: 'hs-diploma',
    LastPromotionCycle: 190, LifeHistory: SEED_LINE, LastUpdated: '', ClockMode: 'ENGINE', EconomicProfileKey: 'Baker',
    Income: 50000, NetWorth: 10000, WealthLevel: 2, EmployerBizId: 'BIZ-SYNTH', SkillTags: '', 'UNI (y/n)': 'no', 'MED (y/n)': 'no',
    'CIV (y/n)': 'no', TraitProfile: 'Updated:c199', DialState: dial() };
  Object.assign(d, o);
  return H.map(k => d[k]);
}
const N = 40;
function fixture() {
  const rows = [];
  for (let i = 0; i < N; i++) rows.push(row({ POPID: 'SYN-' + String(i).padStart(2, '0') }));
  const set = (i, o) => { rows[i] = row(Object.assign({ POPID: 'SYN-' + String(i).padStart(2, '0') }, o)); };
  set(3, { DialState: dial(OVERWORK) });                                                     // overwork AND a texture event
  set(12, { DialState: dial(OVERWORK) });                                                    // overwork, past the cap
  set(13, { Status: 'hospitalized', StatusStartCycle: 198 });                                // two Cycles in: takes the pay hit
  set(14, { Status: 'hospitalized', StatusStartCycle: 198, DialState: dial(OVERWORK) });     // hit, and never an overwork tag
  set(15, { Status: 'critical', StatusStartCycle: 200, DialState: dial(OVERWORK) });         // too new for the hit; no tag
  set(16, { Status: 'detained', DialState: dial(OVERWORK) });
  set(17, { BirthYear: 2030, DialState: dial(OVERWORK) });                                   // minor
  set(18, { CareerStage: 'retired', DialState: dial(OVERWORK) });
  set(19, { Tier: 2, DialState: dial(OVERWORK) });
  set(39, { DialState: dial(OVERWORK) });                                                    // the last row
  return rows;
}
function makeCtx(rows, cycle, rngFn) {
  const trace = { draws: 0 };
  return {
    trace,
    mode: {}, config: { cycleCount: cycle, judicialDismissAfterCycles: 3 }, now: 'C' + cycle,
    cache: { getData: tab => tab === 'Judicial_Ledger' ? { exists: true, values: [w.JUDICIAL_CASE_FIELDS_.slice()] } : { exists: false, values: [] } },
    summary: { absoluteCycle: cycle, simYear: 2042 },
    rng: () => { trace.draws++; return rngFn ? rngFn() : 0.0001; },      // 0.0001: every eligible row before the cap draws an event
    ledger: { headers: H.slice(), rows, dirty: false },
    ss: { getSheetByName: tab => tab === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => BL.map(r => r.slice()) }) } : null }
  };
}
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const TEXTURE = /^Career(-Training|-Holiday|-FirstFriday|-CreationDay)?$/;
function run(rows, cycle, rngFn) {
  writes.length = 0; errors.length = 0;
  const ctx = makeCtx(rows, cycle, rngFn);
  w.runCareerEngine_(ctx);
  const log = writes.map(x => x.row);
  return { ctx, log, texture: log.filter(r => TEXTURE.test(String(r[3]))), errors: errors.slice() };
}
const life = (rows, i) => String(rows[i][I('LifeHistory')]);
const lines = (rows, i, re) => life(rows, i).split('\n').filter(l => re.test(l));

// ---------------------------------------------------------------------------
console.log('═══ 1 — C200 (walk starts at row 0): reach, cap, hospital, overwork');
const rowsA = fixture();
const beforeIds = rowsA.map(r => r[I('POPID')]);
const beforeLife = rowsA.map(r => r[I('LifeHistory')]);
assert('1.0 this Cycle\'s walk starts at row 0', w.rotatedScanStart_(N, 200) === 0);
const A = run(rowsA, 200);
assert('1.1 no engine error', A.errors.length === 0, A.errors.join(' | '));
assert('1.2 exactly LIMIT texture events, and the counter agrees', A.texture.length === 10 && A.ctx.summary.careerEvents === 10, A.texture.length + ' / ' + A.ctx.summary.careerEvents);
assert('1.3 the ten go to the first ten eligible rows in walk order', A.texture.map(r => r[1]).join(',') === beforeIds.slice(0, 10).join(','), A.texture.map(r => r[1]).join(','));
assert('1.4 rows 10 and 11 (past the cap) draw no event', lines(rowsA, 10, /\[Career/).length === 1 && lines(rowsA, 11, /\[Career/).length === 1);

// overwork + event on one citizen, inside the cap
assert('1.5 row 3 keeps BOTH lines in the cell (the Strain line is not overwritten)',
  lines(rowsA, 3, /^C200 — \[Strain\]/).length === 1 && lines(rowsA, 3, /^C200 — \[Career\]/).length === 1, life(rowsA, 3));
const ds3 = JSON.parse(rowsA[3][I('DialState')]);
assert('1.6 row 3 pressure record written', ds3.pressure && ds3.pressure.overwork && ds3.pressure.overwork.l === 200 && ds3.pressure.overwork.n === 1);
assert('1.7 row 3 has both log rows', A.log.some(r => r[1] === 'SYN-03' && r[3] === 'Strain') && A.texture.some(r => r[1] === 'SYN-03'));

// overwork past the cap, and on the last row
assert('1.8 row 12 (past the cap) takes the overwork tag and no event', lines(rowsA, 12, /^C200 — \[Strain\]/).length === 1 && lines(rowsA, 12, /^C200 — \[Career/).length === 0);
assert('1.9 the LAST row is visited', lines(rowsA, 39, /^C200 — \[Strain\]/).length === 1 && JSON.parse(rowsA[39][I('DialState')]).pressure.overwork.l === 200);

// the hospital pay hit, past the cap
assert('1.10 row 13 (hospitalized two Cycles, past the cap) takes the pay hit',
  rowsA[13][I('Income')] < 50000 && rowsA[13][I('Income')] >= 46000 && /\[IncomeHit A198\]/.test(life(rowsA, 13)), rowsA[13][I('Income')] + ' | ' + life(rowsA, 13));
assert('1.11 ...with its own Career-Health log row, outside the event cap', A.log.filter(r => r[3] === 'Career-Health').map(r => r[1]).sort().join(',') === 'SYN-13,SYN-14');
assert('1.12 row 14 takes the hit and NO overwork tag (hospital gate first)', rowsA[14][I('Income')] < 50000 && !/\[Strain\]/.test(life(rowsA, 14)) && !JSON.parse(rowsA[14][I('DialState')]).pressure);
assert('1.13 row 15 (critical, admitted this Cycle): no hit yet, no tag', rowsA[15][I('Income')] === 50000 && !/\[Strain\]/.test(life(rowsA, 15)));
[[16, 'detained'], [17, 'minor'], [18, 'retired stage'], [19, 'Tier 2']].forEach(p => {
  assert('1.14 row ' + p[0] + ' (' + p[1] + ') gains no pressure tag and no event',
    rowsA[p[0]][I('LifeHistory')] === beforeLife[p[0]] && !JSON.parse(rowsA[p[0]][I('DialState')]).pressure);
});
assert('1.15 ordinary rows past the cap are untouched', [20, 25, 30, 38].every(i => rowsA[i][I('LifeHistory')] === beforeLife[i]));
assert('1.16 physical row order and identity unchanged', rowsA.map(r => r[I('POPID')]).join(',') === beforeIds.join(','));

// the Strain line reaches the dial fold
w.compressLifeHistory_(A.ctx, {});
const folded3 = JSON.parse(rowsA[3][I('DialState')]);
assert('1.17 the fold sees row 3\'s overwork line (family down, the cause\'s own dial) and the event (drive up)',
  folded3.mood.family < 0 && folded3.mood.drive > 0 && folded3.folded === 200, JSON.stringify(folded3.mood));

// ---------------------------------------------------------------------------
console.log('═══ 2 — C201 after a ledger round trip: no repeat hit, the events move');
const rowsB = JSON.parse(JSON.stringify(rowsA));
const income13 = rowsB[13][I('Income')];
const B = run(rowsB, 201);
assert('2.0 the walk starts somewhere else', w.rotatedScanStart_(N, 201) === 23);
assert('2.1 no second pay hit for the same admission', rowsB[13][I('Income')] === income13 && !B.log.some(r => r[1] === 'SYN-13' && r[3] === 'Career-Health'));
assert('2.2 still exactly LIMIT texture events', B.texture.length === 10);
assert('2.3 they go to the first ten eligible rows from row 23 (wrapping)',
  B.texture.map(r => r[1]).join(',') === 'SYN-23,SYN-24,SYN-25,SYN-26,SYN-27,SYN-28,SYN-29,SYN-30,SYN-31,SYN-32', B.texture.map(r => r[1]).join(','));
assert('2.4 no recipient repeats from the Cycle before', B.texture.every(r => !A.texture.some(a => a[1] === r[1])));
assert('2.5 overwork continues as Strain for the late-row citizen (second Cycle of the run)', JSON.parse(rowsB[39][I('DialState')]).pressure.overwork.n === 2);

// ---------------------------------------------------------------------------
console.log('═══ 3 — determinism and the draw trace');
(function() {
  const r1 = fixture(), r2 = fixture();
  const x = run(r1, 207, mulberry32(42)); const xl = JSON.stringify(x.log), xd = x.ctx.trace.draws;
  const y = run(r2, 207, mulberry32(42));
  assert('3.1 same seed and Cycle: same ledger, same log, same number of draws',
    JSON.stringify(r1) === JSON.stringify(r2) && xl === JSON.stringify(y.log) && xd === y.ctx.trace.draws && xd > 0, xd + ' / ' + y.ctx.trace.draws);
  assert('3.2 under an ordinary seed the cap still holds', x.texture.length <= 10);

  // a late hospital hit adds exactly its one draw to the stream
  const base = fixture(); base[13] = row({ POPID: 'SYN-13' }); base[14] = row({ POPID: 'SYN-14' });
  base[13][I('Status')] = 'hospitalized'; base[13][I('StatusStartCycle')] = 200;             // too new: no hit, no draw
  base[14][I('Status')] = 'hospitalized'; base[14][I('StatusStartCycle')] = 200;
  const noHit = run(base, 200);
  const withHit = run(fixture(), 200);
  assert('3.3 hospital hits are outside the cap and each draws once', withHit.ctx.trace.draws - noHit.ctx.trace.draws === 2,
    withHit.ctx.trace.draws + ' vs ' + noHit.ctx.trace.draws);

  // changing the physical order changes who is reached first
  const sw = fixture(); const t = sw[0]; sw[0] = sw[30]; sw[30] = t;
  const s = run(sw, 200);
  assert('3.4 a changed row order changes the recipients', s.texture[0][1] === 'SYN-30' && !s.texture.some(r => r[1] === 'SYN-00'));
})();

// ---------------------------------------------------------------------------
console.log('═══ 4 — the rotation helper');
(function() {
  function inlineWas(n, cycle) {          // runConductEngine.js as it stood before engine.274
    var scanStride = Math.max(1, Math.floor(n * 0.618033988749895));
    while (scanStride > 1) {
      var scanA = n, scanB = scanStride;
      while (scanB) { var scanRem = scanA % scanB; scanA = scanB; scanB = scanRem; }
      if (scanA === 1) break;
      scanStride--;
    }
    var scanCycle = Math.floor(Number(cycle) || 0);
    return (((scanCycle % n) * scanStride) % n + n) % n;
  }
  let diff = 0;
  [1, 2, 40, 963, 1105].forEach(n => { for (let c = 0; c < 200; c++) if (w.rotatedScanStart_(n, c) !== inlineWas(n, c)) diff++; });
  assert('4.1 equals the conduct engine\'s former inline value (n = 1, 2, 40, 963, 1105; 200 Cycles each)', diff === 0, diff + ' differ');
  assert('4.2 an empty ledger starts at 0', w.rotatedScanStart_(0, 110) === 0 && w.rotatedScanStart_(undefined, 110) === 0);
  assert('4.3 odd Cycle values read as the conduct engine read them', w.rotatedScanStart_(963, '110') === inlineWas(963, 110) && w.rotatedScanStart_(963, undefined) === 0 && w.rotatedScanStart_(963, 110.9) === inlineWas(963, 110));
  [40, 963].forEach(n => {
    const seen = {}; for (let c = 0; c < n; c++) seen[w.rotatedScanStart_(n, c)] = (seen[w.rotatedScanStart_(n, c)] || 0) + 1;
    assert('4.4 n = ' + n + ': every start occurs exactly once in n Cycles', Object.keys(seen).length === n && Object.keys(seen).every(k => seen[k] === 1));
  });
  assert('4.5 consecutive Cycles start at different rows', w.rotatedScanStart_(963, 110) !== w.rotatedScanStart_(963, 111));
})();

// ---------------------------------------------------------------------------
console.log('═══ 5 — the conduct engine draws exactly as before');
(function() {
  const cur = fs.readFileSync(path.join(ROOT, 'phase05-citizens/runConductEngine.js'), 'utf8');
  const call = '  var scanStart = rotatedScanStart_(rows.length, cycle);\n';
  assert('5.0 the conduct engine calls the shared helper', cur.split(call).length === 2);
  const was = cur.replace(call,
    '  var scanStride = Math.max(1, Math.floor(rows.length * 0.618033988749895));\n' +
    '  while (scanStride > 1) {\n' +
    '    var scanA = rows.length, scanB = scanStride;\n' +
    '    while (scanB) { var scanRem = scanA % scanB; scanA = scanB; scanB = scanRem; }\n' +
    '    if (scanA === 1) break;\n' +
    '    scanStride--;\n' +
    '  }\n' +
    '  var scanCycle = Math.floor(Number(cycle) || 0);\n' +
    '  var scanStart = (((scanCycle % rows.length) * scanStride) % rows.length + rows.length) % rows.length;\n');
  const CH = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'BirthYear', 'DialState', 'Status'];
  function conductRun(src) {
    const out = [], draws = [];
    const box = { console, Math, JSON, Object, Array, String, Number, Date, RegExp, isNaN, isFinite, parseInt, parseFloat,
      Logger: { log() {} }, safeRand_: ctx => ctx.rng, inWorldStamp_: ctx => 'C' + ctx.summary.absoluteCycle,
      queueAppendIntent_: (ctx, tab, r) => out.push(ctx.summary.absoluteCycle + '|' + r[1] + '|' + r[3] + '|' + r[4]) };
    vm.createContext(box);
    for (const rel of ['utilities/citizenMemory.js', 'utilities/citizenDialMap.js', 'utilities/compressLifeHistory.js', 'phase01-config/advanceSimulationCalendar.js']) {
      vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), box, { filename: rel });
    }
    box.inWorldStamp_ = ctx => 'C' + ctx.summary.absoluteCycle;
    vm.runInContext(src, box, { filename: 'runConductEngine.js' });
    const rows = [];
    for (let i = 0; i < 311; i++) {
      const c = box.newCitizen_(); c.base.integrity = (i % 7 === 0) ? 8 : (i % 5 === 0 ? 30 : 50); c.base.composure = (i % 11 === 0) ? 12 : 50;
      rows.push(['CP-' + i, 'Syn', 'Conduct', i % 13 === 0 ? 2 : 4, i % 17 === 0 ? 'GAME' : 'ENGINE', 'n', 'n', i % 19 === 0 ? 'y' : 'n', '', '',
        'Temescal', i % 23 === 0 ? 2030 : 1990, box.serializeDialState_(c), i % 29 === 0 ? 'Deceased' : 'Active']);
    }
    for (let cycle = 100; cycle < 160; cycle++) {
      let n = 0; const rng = mulberry32(cycle * 31 + 7);
      const ctx = { now: 'C' + cycle, config: {}, summary: { absoluteCycle: cycle, simYear: 2042, economicMood: 50 },
        rng: () => { n++; return rng(); }, ledger: { headers: CH.slice(), rows, dirty: false } };
      box.runConductEngine_(ctx);
      draws.push(n);
    }
    return { out, draws };
  }
  const a = conductRun(cur), b = conductRun(was);
  assert('5.1 sixty Cycles on 311 rows: same recipients, same tags, same lines, in the same order', a.out.length > 20 && a.out.join('\n') === b.out.join('\n'), a.out.length + ' vs ' + b.out.length);
  assert('5.2 ...and the same number of RNG draws every Cycle', a.draws.join(',') === b.draws.join(','));
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
