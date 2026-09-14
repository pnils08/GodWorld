#!/usr/bin/env node
'use strict';

// Isolated synthetic citizens/business. No external calls or canon writes.
// Real Career -> income initialization -> both floors, in production order;
// a JSON round trip represents the persisted ledger at the Cycle boundary.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const ENGINE_ROOT = process.env.HOSPITAL_ENGINE_ROOT || ROOT; // isolated proposed substrate tree
const H = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'LifeHistory', 'LastUpdated',
  'Neighborhood', 'RoleType', 'Income', 'EconomicProfileKey', 'EmployerBizId',
  'EducationLevel', 'CareerStage', 'YearsInCareer', 'Status', 'StatusStartCycle', 'BirthYear', 'SkillTags',
  'HealthCause', 'TraitProfile', 'DialState'];
const ix = name => H.indexOf(name);
const BIZ = [['BIZ_ID', 'Name', 'Sector', 'Avg_Salary'],
  ['BIZ-999999', 'SYNTHETIC TEST EMPLOYER', 'Construction', 100000]];
const sb = { Logger: { log() {} }, safeRand_: ctx => ctx.rng,
  queueBatchAppendIntent_: (ctx, tab, rows) => { ctx.logRows.push(...rows); },
  queueCellIntent_: () => { throw new Error('Unexpected external write in isolated income test'); },
  queueAppendIntent_: (ctx, tab, row) => { ctx.logRows.push(row); },
  inWorldStamp_: ctx => 'C' + ctx.summary.cycleId };
vm.createContext(sb);
for (const file of ['phase01-config/advanceSimulationCalendar.js', 'utilities/citizenDerivation.js',
  'phase05-citizens/educationCareerEngine.js', 'phase05-citizens/runCareerEngine.js',
  'phase05-citizens/generationalWealthEngine.js', 'phase04-events/generationalEventsEngine.js',
  'utilities/citizenMemory.js', 'utilities/citizenDialMap.js', 'utilities/compressLifeHistory.js']) {
  const candidate = path.join(ENGINE_ROOT, file);
  vm.runInContext(fs.readFileSync(fs.existsSync(candidate) ? candidate : path.join(ROOT, file), 'utf8'), sb, { filename: file });
}
function make(employer) {
  const values = { POPID: 'SYNTHETIC_HOSPITAL_TEST', First: 'Synthetic', Last: 'Fixture',
    Tier: 4, ClockMode: 'ENGINE', LifeHistory: '', LastUpdated: '', Neighborhood: 'SYNTHETIC_TEST_HOOD',
    RoleType: 'Plumber', Income: 1, EconomicProfileKey: 'synthetic-priced', EmployerBizId: employer,
    EducationLevel: 'trade-cert', CareerStage: 'mid-career', YearsInCareer: 8,
    Status: 'active', StatusStartCycle: 8000, BirthYear: '', SkillTags: '',
    HealthCause: 'SYNTHETIC TEST CAUSE', TraitProfile: '', DialState: '' };
  const ctx = { config: { cycleCount: 8002, griefDurationCycles: 3, griefHolidayDurationCycles: 5,
    griefParticipationMultiplier: 0.8, griefPublicActivityMultiplier: 0.75,
    griefSupportMultiplier: 1.25, griefResponseChance: 0.35 },
    summary: { cycleId: 8002 }, now: 'synthetic', rng: () => 0.6,
    ledger: { headers: H.slice(), rows: [H.map(name => values[name])], dirty: false }, logRows: [],
    ss: { getSheetByName: name => name === 'Business_Ledger' ?
      { getDataRange: () => ({ getValues: () => BIZ.map(row => row.slice()) }) } : null } };
  floors(ctx);
  return ctx;
}
function floors(ctx) {
  sb.applyTrackedEmployerFloor_(ctx);
  sb.applyUntrackedJobReference_(ctx);
}
function nextCycle(ctx, cycle) {
  ctx.ledger = JSON.parse(JSON.stringify(ctx.ledger));
  ctx.summary = { cycleId: cycle };
  ctx.config.cycleCount = cycle;
}
function careerAndFloors(ctx) {
  sb.runCareerEngine_(ctx);
  sb.calculateCitizenIncomes_(ctx);
  floors(ctx);
}
let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}
for (const employer of ['UNTRACKED', 'SELF_EMPLOYED', 'BIZ-999999']) {
  for (const status of ['hospitalized', 'critical']) {
    check(employer + ' ' + status + ': recorded loss survives two Cycles', () => {
      const ctx = make(employer);
      let row = ctx.ledger.rows[0];
      const reference = row[ix('Income')];
      assert(reference > 1, 'ordinary reference correction initialized pay');
      row[ix('Status')] = status;
      sb.runCareerEngine_(ctx);
      const reduced = row[ix('Income')];
      assert(reduced < reference, 'real Career phase records an income loss');
      assert(row[ix('LifeHistory')].includes('[IncomeHit A8000]'), 'loss belongs to current admission');
      sb.calculateCitizenIncomes_(ctx);
      floors(ctx);
      assert.strictEqual(row[ix('Income')], reduced, 'wealth floors must preserve the Career loss');
      ctx.ledger = JSON.parse(JSON.stringify(ctx.ledger));
      row = ctx.ledger.rows[0];
      ctx.summary = { cycleId: 8003 };
      ctx.config.cycleCount = 8003;
      sb.runCareerEngine_(ctx);
      sb.calculateCitizenIncomes_(ctx);
      floors(ctx);
      assert.strictEqual(row[ix('Income')], reduced, 'continued admission neither re-cuts nor restores pay');
      assert.strictEqual(ctx.logRows.filter(log => log[3] === 'Career-Health').length, 1, 'one recorded loss per admission');
    });
    check(employer + ' ' + status + ': health transition preserves loss without another cut', () => {
      const ctx = make(employer);
      let row = ctx.ledger.rows[0];
      row[ix('Status')] = status;
      sb.runCareerEngine_(ctx);
      const reduced = row[ix('Income')];
      nextCycle(ctx, 8003);
      row = ctx.ledger.rows[0];
      sb.runCareerEngine_(ctx); // actual scheduler: Career -> Generational -> Wealth
      // Real weighted lifecycle: hospitalized -> critical at 0; critical -> hospitalized at .65.
      ctx.rng = () => status === 'hospitalized' ? 0 : 0.65;
      sb.runGenerationalEngine_(ctx);
      assert.strictEqual(row[ix('Status')], status === 'hospitalized' ? 'critical' : 'hospitalized');
      assert.strictEqual(row[ix('StatusStartCycle')], 8003, 'health status duration still resets');
      ctx.rng = () => 0.6;
      sb.calculateCitizenIncomes_(ctx);
      floors(ctx);
      assert.strictEqual(row[ix('Income')], reduced, 'continued hospitalization keeps the same loss');
      nextCycle(ctx, 8005);
      careerAndFloors(ctx);
      assert.strictEqual(ctx.ledger.rows[0][ix('Income')], reduced, 'transition must not enable a second hit');
      assert.strictEqual(ctx.logRows.filter(log => log[3] === 'Career-Health').length, 1);
    });
    check(employer + ' ' + status + ': real compression preserves loss and one-hit guard', () => {
      const ctx = make(employer), row = ctx.ledger.rows[0];
      row[ix('Status')] = status;
      sb.runCareerEngine_(ctx);
      const reduced = row[ix('Income')];
      for (let n = 0; n < 30; n++) row[ix('LifeHistory')] += '\nC8002 — [Background] SYNTHETIC filler ' + n;
      sb.compressLifeHistory_(ctx, { forceAll: true });
      assert(row[ix('LifeHistory')].includes('[Compressed:'), 'real compressor actually trimmed the row');
      nextCycle(ctx, 8003);
      careerAndFloors(ctx);
      assert.strictEqual(ctx.ledger.rows[0][ix('Income')], reduced, 'compression neither re-cuts nor restores pay');
      assert.strictEqual(ctx.logRows.filter(log => log[3] === 'Career-Health').length, 1);
    });
  }
  check(employer + ': healthy underpaid citizen still receives reference correction', () => {
    const ctx = make(employer), row = ctx.ledger.rows[0], reference = row[ix('Income')];
    row[ix('Income')] = Math.round(reference * 0.9);
    floors(ctx);
    assert.strictEqual(row[ix('Income')], reference);
  });
  check(employer + ': admission without its own recorded loss does not disable correction', () => {
    const ctx = make(employer), row = ctx.ledger.rows[0], reference = row[ix('Income')];
    row[ix('Status')] = 'hospitalized';
    row[ix('LifeHistory')] = 'C7990 — [Career-Health] synthetic old admission [IncomeHit A7990]';
    row[ix('Income')] = Math.round(reference * 0.9);
    floors(ctx);
    assert.strictEqual(row[ix('Income')], reference);
  });
  check(employer + ': recovery ends the admission exception', () => {
    const ctx = make(employer), row = ctx.ledger.rows[0], reference = row[ix('Income')];
    row[ix('LifeHistory')] = 'C8002 — [Career-Health] synthetic loss [IncomeHit A8000]';
    row[ix('Income')] = Math.round(reference * 0.9);
    floors(ctx);
    assert.strictEqual(row[ix('Income')], reference);
  });
  check(employer + ': real recovery clears loss state; a later admission gets its own single loss', () => {
    const ctx = make(employer);
    let row = ctx.ledger.rows[0];
    const reference = row[ix('Income')];
    row[ix('Status')] = 'hospitalized';
    sb.runCareerEngine_(ctx);
    nextCycle(ctx, 8003);
    row = ctx.ledger.rows[0];
    sb.runCareerEngine_(ctx);
    ctx.rng = () => 0.3; // real hospitalized -> recovering outcome
    sb.runGenerationalEngine_(ctx);
    assert.strictEqual(row[ix('Status')], 'recovering');
    floors(ctx);
    assert.strictEqual(row[ix('Income')], reference, 'recovery resumes ordinary reference eligibility');
    assert(!row[ix('LifeHistory')].includes('[HospitalIncomeState]'), 'no stale active loss state after recovery');
    // Distinct later admission, using the real lifecycle recovering -> hospitalized outcome.
    nextCycle(ctx, 8010);
    sb.runCareerEngine_(ctx);
    ctx.rng = () => 0;
    sb.runGenerationalEngine_(ctx);
    row = ctx.ledger.rows[0];
    assert.strictEqual(row[ix('Status')], 'hospitalized');
    assert.strictEqual(row[ix('StatusStartCycle')], 8010);
    ctx.rng = () => 0.6;
    careerAndFloors(ctx);
    assert.strictEqual(row[ix('Income')], reference, 'new admission does not inherit old loss');
    nextCycle(ctx, 8012);
    careerAndFloors(ctx);
    const reduced = ctx.ledger.rows[0][ix('Income')];
    assert(reduced < reference, 'later extended admission has its own loss');
    nextCycle(ctx, 8013);
    careerAndFloors(ctx);
    assert.strictEqual(ctx.ledger.rows[0][ix('Income')], reduced);
    assert.strictEqual(ctx.logRows.filter(log => log[3] === 'Career-Health').length, 2);
  });
}
for (const badStart of ['', 0, -1, 'invalid', Infinity]) {
  check('invalid status start ' + String(badStart) + ' does not disable reference correction', () => {
    const ctx = make('UNTRACKED'), row = ctx.ledger.rows[0], reference = row[ix('Income')];
    row[ix('Status')] = 'hospitalized';
    row[ix('StatusStartCycle')] = badStart;
    row[ix('LifeHistory')] = 'C8002 — [Career-Health] SYNTHETIC [IncomeHit A' + badStart + ']';
    row[ix('Income')] = reference - 100;
    floors(ctx);
    assert.strictEqual(row[ix('Income')], reference);
  });
}
check('hospital pay metadata never changes event folding or grows across repeated compression', () => {
  const ctx = make('UNTRACKED'), row = ctx.ledger.rows[0];
  row[ix('Status')] = 'hospitalized';
  sb.runCareerEngine_(ctx);
  for (let n = 0; n < 30; n++) row[ix('LifeHistory')] += '\nC8002 — [Background] SYNTHETIC filler ' + n;
  const control = { ...ctx, summary: { ...ctx.summary }, ledger: JSON.parse(JSON.stringify(ctx.ledger)) };
  control.ledger.rows[0][ix('LifeHistory')] = row[ix('LifeHistory')].split('\n')
    .filter(line => !line.startsWith('[HospitalIncomeState]')).join('\n');
  sb.compressLifeHistory_(ctx, { forceAll: true });
  sb.compressLifeHistory_(control, { forceAll: true });
  assert.strictEqual(row[ix('DialState')], control.ledger.rows[0][ix('DialState')], 'state metadata has zero dial effect');
  assert.strictEqual(row[ix('TraitProfile')], control.ledger.rows[0][ix('TraitProfile')], 'state metadata never becomes personality or desk texture');
  const reduced = row[ix('Income')];
  for (let cycle = 8003; cycle <= 8006; cycle++) {
    nextCycle(ctx, cycle);
    const carried = ctx.ledger.rows[0];
    for (let n = 0; n < 25; n++) carried[ix('LifeHistory')] += '\nC' + cycle + ' — [Background] SYNTHETIC filler ' + n;
    sb.compressLifeHistory_(ctx, { forceAll: true });
    careerAndFloors(ctx);
    assert.strictEqual(carried[ix('Income')], reduced);
    assert.strictEqual(carried[ix('LifeHistory')].split('\n').filter(line => line.startsWith('[HospitalIncomeState]')).length, 1);
  }
  assert.strictEqual(ctx.logRows.filter(log => log[3] === 'Career-Health').length, 1);
});
check('malformed hospital income metadata fails loudly before a floor changes pay', () => {
  const ctx = make('UNTRACKED'), row = ctx.ledger.rows[0];
  row[ix('Status')] = 'hospitalized';
  row[ix('LifeHistory')] = '[HospitalIncomeState] statusStart=8000|hit=invalid';
  row[ix('Income')] = 12345;
  assert.throws(() => floors(ctx), /Invalid HospitalIncomeState/);
  assert.strictEqual(row[ix('Income')], 12345);
});
check('hospital income metadata does not trigger compression of a sparse history', () => {
  const ctx = make('UNTRACKED'), row = ctx.ledger.rows[0];
  row[ix('LifeHistory')] = '[Background] SYNTHETIC one\n[Background] SYNTHETIC two\n[HospitalIncomeState] statusStart=8000|hit=8000';
  const before = row.slice();
  sb.compressLifeHistory_(ctx, { forceAll: true });
  assert.deepStrictEqual(row, before, 'two events remain compression-ineligible');
});
check('cleared employer keeps a layoff cut', () => {
  const ctx = make('UNTRACKED'), row = ctx.ledger.rows[0];
  row[ix('EmployerBizId')] = '';
  row[ix('Income')] = 12345;
  floors(ctx);
  assert.strictEqual(row[ix('Income')], 12345);
});
console.log(passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
