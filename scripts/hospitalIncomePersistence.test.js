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
  inWorldStamp_: ctx => 'C' + ctx.summary.cycleId,
  ECONOMIC_PARAMETERS: JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'economic_parameters.json'), 'utf8')) }; // engine.199: live reads the Economic_Parameters tab
vm.createContext(sb);
for (const file of ['phase01-config/advanceSimulationCalendar.js', 'utilities/citizenDerivation.js',
  'phase05-citizens/educationCareerEngine.js', 'phase05-citizens/runCareerEngine.js',
  'phase05-citizens/runHouseholdEngine.js',
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
  ctx.cache = { getData: name => name === 'Hospital_Ledger' ? {
    exists: true, values: [['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause', 'AdmitCycle',
      'StatusNow', 'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare',
      'Kind', 'IntakeType', 'SourceEventId', 'SourceSystem', 'PriorStatus']]
  } : { exists: false, values: [] } };
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

// Task 4: typed in-memory receipts and the existing Phase-10 hospital writer.
// The mock has no external Sheet; its rows live only in this process.
vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase04-events/chaosCarsEngine.js'), 'utf8'), sb,
  { filename: 'phase04-events/chaosCarsEngine.js' });
sb.persistWithRetry_ = fn => fn();
sb.appendRowWithRetry_ = (sheet, row) => sheet.appendRow(row);
sb.requireTab_ = (ss, name) => ss.getSheetByName(name);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase10-persistence/buildCyclePacket.js'), 'utf8'), sb,
  { filename: 'phase10-persistence/buildCyclePacket.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase05-citizens/judicialLifecycle.js'), 'utf8'), sb,
  { filename: 'phase05-citizens/judicialLifecycle.js' });
function hospitalSheet(open) {
  const rows = [['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause', 'AdmitCycle',
    'StatusNow', 'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare',
    'Kind', 'IntakeType', 'SourceEventId', 'SourceSystem', 'PriorStatus']];
  if (open) rows.push(open.slice());
  return { rows, getDataRange: () => ({ getValues: () => rows.map(row => row.slice()) }),
    appendRow: row => rows.push(row.slice()),
    getRange: (r, c) => ({
      setValues: values => values[0].forEach((value, offset) => { rows[r - 1][c - 1 + offset] = value; }),
      setValue: value => { rows[r - 1][c - 1] = value; }
    }) };
}
function persistOnMock(ctx, open) {
  const sheet = hospitalSheet(open);
  ctx.ss = { getSheetByName: name => name === 'Hospital_Ledger' ? sheet : null };
  return { sheet, census: sb.persistHospitalLedger_(ctx) };
}
function syntheticAmbulance(ctx, status, cause) {
  const row = ctx.ledger.rows[0];
  row[ix('Status')] = status;
  row[ix('HealthCause')] = cause;
  const receipt = sb.writeCitizenEvent_(ctx,
    { rowIndex: 0, popId: row[ix('POPID')], neighborhood: row[ix('Neighborhood')], tier: 4 },
    { name: 'ambulance' },
    { outcome: 'medical_emergency', severity: 'high', lifeHistoryTag: 'Setback' },
    ctx.summary.cycleId, 'synthetic medical emergency');
  ctx.summary.hospitalEvents = [receipt];
  return receipt;
}
function withEngineStubs(stubs, fn) {
  const prior = {};
  for (const key of Object.keys(stubs)) { prior[key] = sb[key]; sb[key] = stubs[key]; }
  try { return fn(); } finally { for (const key of Object.keys(stubs)) sb[key] = prior[key]; }
}
check('T4-2 ambulance admit rolls first next week; a next-week death closes its row', () => {
  const ctx = make('UNTRACKED');
  ctx.ledger.rows[0][ix('HealthCause')] = '';
  const receipt = syntheticAmbulance(ctx, 'active', '');
  assert.strictEqual(receipt.kind, 'intake');
  let rolls = 0;
  const death = () => { rolls++; return { type: 'health', tag: 'Death', description: 'synthetic lifecycle death', newStatus: 'deceased' }; };
  withEngineStubs({ processHealthLifecycle_: death, triggerDeathCascade_: () => {} }, () => sb.runGenerationalEngine_(ctx));
  assert.strictEqual(rolls, 0, 'no health roll the week of admission');
  assert.strictEqual(ctx.ledger.rows[0][ix('Status')], 'critical');
  const week1 = persistOnMock(ctx);
  assert.strictEqual(week1.sheet.rows.length, 2);
  assert.strictEqual(week1.sheet.rows[1][8], '');
  assert.strictEqual(week1.census.admitsThisCycle, 1);
  ctx.summary = { cycleId: 8003 };
  withEngineStubs({ processHealthLifecycle_: death, triggerDeathCascade_: () => {} }, () => sb.runGenerationalEngine_(ctx));
  assert.strictEqual(rolls, 1, 'first roll the week after');
  const sheet = week1.sheet;
  ctx.ss = { getSheetByName: name => name === 'Hospital_Ledger' ? sheet : null };
  const census2 = sb.persistHospitalLedger_(ctx);
  assert.strictEqual(sheet.rows.length, 2);
  assert.strictEqual(sheet.rows[1][9], 'deceased');
  assert.strictEqual(census2.deathsThisCycle, 1);
});
check('T4-3 recovering re-escalation updates its open row without intake', () => {
  const ctx = make('UNTRACKED');
  const receipt = syntheticAmbulance(ctx, 'recovering', 'synthetic prior illness');
  const open = ['H-C7999-SYNTHETIC', receipt.popId, receipt.name, receipt.neighborhood,
    receipt.cause, 7999, 'recovering', 8001, '', '', ''];
  const result = persistOnMock(ctx, open);
  assert.strictEqual(receipt.kind, 'transition');
  assert.strictEqual(receipt.sourceEventId, '');
  assert.strictEqual(result.sheet.rows.length, 2);
  assert.strictEqual(result.sheet.rows[1][6], 'critical');
  assert.strictEqual(result.sheet.rows[1][15] || '', '');
  assert.strictEqual(result.census.admitsThisCycle, 0);
});
check('T4-4 ordinary injury has a typed health-engine intake', () => {
  const ctx = make('UNTRACKED');
  ctx.ledger.rows[0][ix('HealthCause')] = '';
  withEngineStubs({
    checkHealthEvent_: () => ({ type: 'health', tag: 'Injury', severity: 'moderate', description: 'synthetic injury' }),
    chance_: (_ctx, p) => p !== 0.35
  }, () => sb.runGenerationalEngine_(ctx));
  const receipt = ctx.summary.hospitalEvents[0];
  assert.strictEqual(ctx.ledger.rows[0][ix('Status')], 'injured');
  assert.strictEqual(receipt.kind, 'intake');
  assert.strictEqual(receipt.intakeType, 'injury');
  assert.strictEqual(receipt.sourceSystem, 'health-engine');
  assert.strictEqual(receipt.sourceEventId, 'health-engine:C8002:injury:SYNTHETIC_HOSPITAL_TEST');
  assert.strictEqual(receipt.cause, ctx.ledger.rows[0][ix('HealthCause')]);
});
check('T4-5 lifecycle step has blank intake and source fields', () => {
  const ctx = make('UNTRACKED');
  ctx.ledger.rows[0][ix('Status')] = 'hospitalized';
  withEngineStubs({ processHealthLifecycle_: () => ({
    type: 'health', tag: 'Critical', description: 'synthetic deterioration', newStatus: 'critical'
  }) }, () => sb.runGenerationalEngine_(ctx));
  const receipt = ctx.summary.hospitalEvents[0];
  assert.strictEqual(receipt.kind, 'transition');
  assert.strictEqual(receipt.intakeType, '');
  assert.strictEqual(receipt.sourceSystem, '');
  assert.strictEqual(receipt.sourceEventId, '');
});
check('T4-7 heat-wave victim has typed heat intake and row cause', () => {
  const ctx = make('UNTRACKED');
  ctx.ledger.rows[0][ix('BirthYear')] = sb.simYearOf_(ctx, 8002) - 75;
  ctx.ledger.rows[0][ix('HealthCause')] = '';
  ctx.summary.weatherEvents = [{ type: 'heat_wave', salient: true, hoods: ['SYNTHETIC_TEST_HOOD'] }];
  withEngineStubs({ processHealthLifecycle_: () => null, checkDeath_: () => null,
    checkBirth_: () => null, checkRetirement_: () => null, checkGraduation_: () => null,
    checkHealthEvent_: () => null }, () => sb.runGenerationalEngine_(ctx));
  const receipt = ctx.summary.hospitalEvents[0];
  assert.strictEqual(receipt.kind, 'intake');
  assert.strictEqual(receipt.intakeType, 'heat');
  assert.strictEqual(receipt.sourceSystem, 'heat-wave');
  assert.strictEqual(receipt.sourceEventId, 'heat-wave:C8002:heat:SYNTHETIC_HOSPITAL_TEST');
  assert.strictEqual(receipt.cause, ctx.ledger.rows[0][ix('HealthCause')]);
});
check('T4-7b recovering heat-wave victim is a transition that keeps its prior cause', () => {
  const ctx = make('UNTRACKED');
  ctx.ledger.rows[0][ix('BirthYear')] = sb.simYearOf_(ctx, 8002) - 75;
  ctx.ledger.rows[0][ix('Status')] = 'recovering';
  ctx.ledger.rows[0][ix('HealthCause')] = 'a prior synthetic illness';
  ctx.summary.weatherEvents = [{ type: 'heat_wave', salient: true, hoods: ['SYNTHETIC_TEST_HOOD'] }];
  withEngineStubs({ processHealthLifecycle_: () => null, checkDeath_: () => null,
    checkBirth_: () => null, checkRetirement_: () => null, checkGraduation_: () => null,
    checkHealthEvent_: () => null }, () => sb.runGenerationalEngine_(ctx));
  const receipt = ctx.summary.hospitalEvents[0];
  assert.strictEqual(receipt.kind, 'transition');
  assert.strictEqual(receipt.from, 'recovering');
  assert.strictEqual(receipt.intakeType, '');
  assert.strictEqual(receipt.sourceEventId, '');
  assert.strictEqual(receipt.cause, 'a prior synthetic illness');
});
check('T4-9 missing receipt is visibly reconciled from patient Status', () => {
  const ctx = make('UNTRACKED');
  ctx.ledger.rows[0][ix('Status')] = 'critical';
  ctx.summary.hospitalEvents = [];
  const result = persistOnMock(ctx);
  assert.strictEqual(result.sheet.rows.length, 2);
  assert.strictEqual(result.census.missedAdmitsReconciled, 1);
});
check('T4-10 same-row death stops before ordinary health draw', () => {
  const ctx = make('UNTRACKED');
  ctx.ledger.rows[0][ix('BirthYear')] = sb.simYearOf_(ctx, 8002) - 30;
  let healthDraws = 0;
  withEngineStubs({ getSeasonalLimits_: () => ({ graduations: 0, births: 0, retirements: 0, deaths: 1 }),
    checkDeath_: () => ({ type: 'death', tag: 'Death', description: 'synthetic death' }),
    triggerDeathCascade_: () => {}, checkHealthEvent_: () => { healthDraws++; return null; }
  }, () => sb.runGenerationalEngine_(ctx));
  assert.strictEqual(ctx.ledger.rows[0][ix('Status')], 'deceased');
  assert.strictEqual(healthDraws, 0);
  assert.strictEqual((ctx.summary.hospitalEvents || []).length, 0);
});
check('T4-11 receipt kinds fold through care-justice accounting', () => {
  const fold = require('../utilities/careJusticeAccounting.js').foldCareJusticeReceipts_;
  const ctx = make('UNTRACKED');
  ctx.ledger.rows[0][ix('HealthCause')] = '';
  const intake = syntheticAmbulance(ctx, 'active', '');
  intake.sourceEventId = 'ambulance:synthetic-event:SYNTHETIC_HOSPITAL_TEST';
  const transition = { ...intake, kind: 'transition', intakeType: '', sourceSystem: '', sourceEventId: '' };
  const result = fold([{ ...intake, system: 'hospital' }, { ...transition, system: 'hospital' }]);
  assert.strictEqual(result.receipts.length, 1);
  assert.strictEqual(result.transitions, 1);
});
check('T6 detained ordinary admission stores case PriorStatus in hospital P', () => {
  const ctx = make('UNTRACKED');
  const pop = ctx.ledger.rows[0][ix('POPID')];
  ctx.ledger.rows[0][ix('Status')] = 'detained';
  const fields = Array.from(sb.JUDICIAL_CASE_FIELDS_);
  const open = sb.openCaseFromReceipt_({ popId: pop, cycle: 8001, kind: 'intake', entryType: 'arrest',
    sourceEventId: 'patrol:synthetic:' + pop, sourceSystem: 'patrol', priorStatus: 'Retired' });
  const oldCache = ctx.cache.getData;
  ctx.cache.getData = name => name === 'Judicial_Ledger' ?
    { exists: true, values: [fields, fields.map(field => open[field])] } : oldCache(name);
  withEngineStubs({
    checkHealthEvent_: () => ({ type: 'health', tag: 'Injury', severity: 'moderate', description: 'synthetic injury' }),
    chance_: (_ctx, p) => p !== 0.35
  }, () => sb.runGenerationalEngine_(ctx));
  const receipt = ctx.summary.hospitalEvents[0];
  const result = persistOnMock(ctx);
  assert.strictEqual(receipt.from, 'detained');
  assert.strictEqual(receipt.priorStatus, 'Retired');
  assert.strictEqual(result.sheet.rows[1][15], 'Retired');
});
check('T6 discharge restores hospital P casing and closes its row', () => {
  const ctx = make('UNTRACKED');
  const pop = ctx.ledger.rows[0][ix('POPID')];
  const open = ['H-C8000-' + pop, pop, 'Synthetic Fixture', 'SYNTHETIC_TEST_HOOD',
    'synthetic condition', 8000, 'recovering', 8001, '', '', '', '', '', '', '', 'Retired'];
  ctx.ledger.rows[0][ix('Status')] = 'recovering';
  ctx.ledger.rows[0][ix('StatusStartCycle')] = 8000;
  const hospital = hospitalSheet(open);
  ctx.cache.getData = name => name === 'Hospital_Ledger' ?
    { exists: true, values: hospital.rows.map(row => row.slice()) } : { exists: false, values: [] };
  withEngineStubs({ processHealthLifecycle_: () => ({ type: 'health', tag: 'Recovery',
    description: 'synthetic recovery', newStatus: 'active' }) }, () => sb.runGenerationalEngine_(ctx));
  const receipt = ctx.summary.hospitalEvents[0];
  ctx.ss = { getSheetByName: name => name === 'Hospital_Ledger' ? hospital : null };
  sb.persistHospitalLedger_(ctx);
  assert.strictEqual(ctx.ledger.rows[0][ix('Status')], 'Retired');
  assert.strictEqual(receipt.to, 'Retired');
  assert.strictEqual(hospital.rows[1][8], 8002);
  assert.strictEqual(hospital.rows[1][9], 'recovered');
});
check('T6 pre-P blank discharge restores active', () => {
  const ctx = make('UNTRACKED');
  const pop = ctx.ledger.rows[0][ix('POPID')];
  const hospital = hospitalSheet(['H-C8000-' + pop, pop, '', '', '', 8000,
    'recovering', 8001, '', '', '', '', '', '', '', '']);
  ctx.ledger.rows[0][ix('Status')] = 'recovering';
  ctx.ledger.rows[0][ix('StatusStartCycle')] = 8000;
  ctx.cache.getData = () => ({ exists: true, values: hospital.rows.map(row => row.slice()) });
  withEngineStubs({ processHealthLifecycle_: () => ({ type: 'health', tag: 'Recovery',
    description: 'synthetic recovery', newStatus: 'active' }) }, () => sb.runGenerationalEngine_(ctx));
  assert.strictEqual(ctx.ledger.rows[0][ix('Status')], 'active');
});
check('T6 missing-bed lifecycle transition admits with blank P, never a health state', () => {
  const ctx = make('UNTRACKED');
  const pop = ctx.ledger.rows[0][ix('POPID')];
  ctx.ledger.rows[0][ix('Status')] = 'critical';
  ctx.summary.hospitalEvents = [{ popId: pop, cycle: 8002, from: 'hospitalized',
    to: 'critical', kind: 'transition', cause: 'synthetic illness' }];
  const result = persistOnMock(ctx);
  assert.strictEqual(result.sheet.rows[1][15], '');
});
check('T6 ordinary, heat, and ambulance admission receipts preserve Status casing', () => {
  const ordinary = make('UNTRACKED');
  ordinary.ledger.rows[0][ix('Status')] = 'Active';
  withEngineStubs({
    checkHealthEvent_: () => ({ type: 'health', tag: 'Injury', severity: 'moderate', description: 'synthetic injury' }),
    chance_: (_ctx, p) => p !== 0.35
  }, () => sb.runGenerationalEngine_(ordinary));
  assert.strictEqual(ordinary.summary.hospitalEvents[0].from, 'Active');
  const heat = make('UNTRACKED');
  heat.ledger.rows[0][ix('Status')] = 'Active';
  heat.ledger.rows[0][ix('BirthYear')] = sb.simYearOf_(heat, 8002) - 75;
  heat.summary.weatherEvents = [{ type: 'heat_wave', salient: true, hoods: ['SYNTHETIC_TEST_HOOD'] }];
  withEngineStubs({ processHealthLifecycle_: () => null, checkDeath_: () => null,
    checkBirth_: () => null, checkRetirement_: () => null, checkGraduation_: () => null,
    checkHealthEvent_: () => null }, () => sb.runGenerationalEngine_(heat));
  assert.strictEqual(heat.summary.hospitalEvents[0].from, 'Active');
  const ambulance = make('UNTRACKED');
  const receipt = syntheticAmbulance(ambulance, 'Active', '');
  assert.strictEqual(receipt.from, 'Active');
});
check('T6 detained citizen is gated from career and household events', () => {
  const ctx = make('UNTRACKED');
  const row = ctx.ledger.rows[0];
  row[ix('Status')] = 'detained';
  const before = JSON.stringify(row);
  let draws = 0;
  ctx.rng = () => { draws++; return 0; };
  sb.runCareerEngine_(ctx);
  sb.runHouseholdEngine_(ctx);
  assert.strictEqual(JSON.stringify(row), before);
  assert.strictEqual(draws, 0);
  assert.strictEqual(ctx.logRows.length, 0);
});
console.log(passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
