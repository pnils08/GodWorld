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
  'utilities/cycleModes.js', 'phase05-citizens/judicialLifecycle.js', // Task 6b: custody clock + seeded dismissal draw
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
    griefSupportMultiplier: 1.25, griefResponseChance: 0.35, judicialDismissAfterCycles: 3 },
    summary: { cycleId: 8002 }, now: 'synthetic', rng: () => 0.6,
    ledger: { headers: H.slice(), rows: [H.map(name => values[name])], dirty: false }, logRows: [],
    ss: { getSheetByName: name => name === 'Business_Ledger' ?
      { getDataRange: () => ({ getValues: () => BIZ.map(row => row.slice()) }) } : null } };
  ctx.cache = { getData: name => name === 'Hospital_Ledger' ? {
    exists: true, values: [['AdmissionId', 'POPID', 'Name', 'Neighborhood', 'Cause', 'AdmitCycle',
      'StatusNow', 'LastTransitionCycle', 'DischargeCycle', 'Outcome', 'CyclesInCare',
      'IntakeType', 'SourceSystem', 'SourceEventId', 'TransferFromId', 'PriorStatus']]
  } : name === 'Judicial_Ledger' ? { exists: true, values: [sb.JUDICIAL_CASE_FIELDS_.slice()] }
    : { exists: false, values: [] } };
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
    'IntakeType', 'SourceSystem', 'SourceEventId', 'TransferFromId', 'PriorStatus']];
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
  // The real caller (runChaosEvent_) stamps the id once the payload eventId is drawn.
  if (receipt.kind === 'intake') receipt.sourceEventId = 'ambulance:SYN-EVENT:' + receipt.popId;
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

// ── engine.254 Task 6b: custody dismissal through the real Career phase (build spec B2, B4) ──
const BH6 = ['BIZ_ID', 'Name', 'Sector', 'Avg_Salary', 'Employee_Count', 'Growth_Rate', 'Key_Personnel'];
const CYC = 113; // arrest at 110 → three Cycles held
if (typeof sb.hoodTexturePool_ !== 'function') sb.hoodTexturePool_ = () => []; // hood texture lines are not under test here
function person(over) {
  return Object.assign({ POPID: 'SYN-6B-DET', First: 'Synthetic', Last: 'Detainee', Tier: 4, ClockMode: 'ENGINE',
    LifeHistory: '', LastUpdated: '', Neighborhood: 'SYNTHETIC_TEST_HOOD', RoleType: 'Plumber', Income: 60000,
    EconomicProfileKey: 'synthetic-priced', EmployerBizId: 'BIZ-999999', EducationLevel: 'trade-cert',
    CareerStage: 'mid-career', YearsInCareer: 8, Status: 'detained', StatusStartCycle: 110, BirthYear: '',
    SkillTags: '', HealthCause: '', TraitProfile: '', DialState: '' }, over || {});
}
function caseRowFor(pop, arrest, over) {
  const c = Object.assign({ CaseId: 'J-C' + arrest + '-' + pop, POPID: pop, EntryType: 'arrest', StatusNow: 'held',
    ArrestCycle: arrest, OpenCycle: arrest, DecisionCycle: arrest + 1, HeldUntilCycle: arrest + 4,
    LastTransitionCycle: arrest + 1, PriorStatus: 'Active', SourceSystem: 'patrol', SourceEventId: 'patrol:' + pop,
    ChargeGravity: 'serious' }, over || {});
  return sb.JUDICIAL_CASE_FIELDS_.map(f => c[f] === undefined ? '' : c[f]);
}
function custody(people, opts) {
  opts = opts || {};
  const biz = [BH6.slice()].concat(opts.biz || [['BIZ-999999', 'SYNTHETIC TEST EMPLOYER', 'Construction', 100000, 5, '', '']]);
  const cases = opts.cases || people.filter(p => p.Status !== 'Active' || opts.caseForAll)
    .map(p => caseRowFor(p.POPID, opts.arrest === undefined ? 110 : opts.arrest));
  const cells = [], errors = [];
  let draws = 0;
  const ctx = { config: { cycleCount: opts.cycle || CYC, judicialDismissAfterCycles: opts.dial === undefined ? 3 : opts.dial },
    summary: Object.assign({ cycleId: opts.cycle || CYC }, opts.summary || {}), now: 'synthetic',
    rng: () => { draws++; return opts.rngValue === undefined ? 0.999 : opts.rngValue; },
    ledger: { headers: H.slice(), rows: people.map(p => H.map(name => p[name])), dirty: false }, logRows: [],
    ss: { getSheetByName: name => name === 'Business_Ledger' ?
      { getDataRange: () => ({ getValues: () => biz.map(row => row.slice()) }) } : null },
    cache: { getData: name => name === 'Judicial_Ledger' && !opts.noTab ?
      { exists: true, values: [sb.JUDICIAL_CASE_FIELDS_.slice()].concat(cases) } : { exists: false, values: [] } } };
  const saved = { cell: sb.queueCellIntent_, err: sb.logEngineError_ };
  sb.queueCellIntent_ = (c, tab, r, col, value) => cells.push({ tab, r, col, value });
  sb.logEngineError_ = (c, phase, err) => errors.push({ phase, message: err.message });
  try { sb.runCareerEngine_(ctx); } finally { sb.queueCellIntent_ = saved.cell; sb.logEngineError_ = saved.err; }
  return { ctx, cells, errors, draws: () => draws, row: i => ctx.ledger.rows[i || 0],
    get: (i, name) => ctx.ledger.rows[i][ix(name)], custody: ctx.summary.careerSignals && ctx.summary.careerSignals.custody };
}
const dismissed = (run, i) => run.get(i || 0, 'EmployerBizId') === '' && /\[Career-Layoff\] Dismissed by /.test(run.get(i || 0, 'LifeHistory'));
const untouchedRow = (run, i, p) => JSON.stringify(run.row(i)) === JSON.stringify(H.map(name => p[name]));

check('6b held 2 Cycles: not dismissed', () => {
  const p = person();
  const run = custody([p], { arrest: 111 });
  assert(untouchedRow(run, 0, p), 'row untouched before the dial');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(run.custody)), { dismissed: 0, skipped: 0 });
});
check('6b held 3 Cycles: dismissed — employer cleared, Income cut 12–20%, layoff line, counters, seat delta', () => {
  const run = custody([person()]);
  const income = run.get(0, 'Income');
  assert(dismissed(run), 'employer cleared and Career-Layoff line written');
  assert(income >= 4110 && income <= 52800 && income !== 60000, 'Income × 0.80–0.88, got ' + income);
  assert(/Dismissed by SYNTHETIC TEST EMPLOYER after 3 weeks in custody$/.test(run.get(0, 'LifeHistory')), 'text names employer and weeks');
  assert.strictEqual(run.get(0, 'Status'), 'detained', 'Status is custody\'s, not the dismissal\'s');
  assert.strictEqual(run.ctx.logRows.filter(l => l[3] === 'Career-Layoff').length, 1);
  assert.strictEqual(run.ctx.summary.careerSignals.layoffs, 1);
  assert.strictEqual(run.ctx.summary.careerSignals.transitions, 1);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(run.ctx.summary.careerSignals.businessDeltas['BIZ-999999'])), { gained: 0, lost: 1 });
  assert.deepStrictEqual(run.cells.map(c => [c.tab, c.value]), [['Business_Ledger', 4]], 'write-back lowers the stated count 5 → 4');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(run.custody)), { dismissed: 1, skipped: 0 });
  assert.strictEqual(run.errors.length, 0);
});
check('6b the dismissal draw is the case\'s own: same case same Cycle → same figure, and the career stream does not move', () => {
  const a = custody([person()]), b = custody([person()]);
  assert.strictEqual(a.get(0, 'Income'), b.get(0, 'Income'));
  const expected = Math.round(60000 * (0.80 + sb.seededRngFor_(CYC, 'custody-dismiss:J-C110-SYN-6B-DET')() * 0.08));
  assert.strictEqual(a.get(0, 'Income'), expected);
  const bystander = person({ POPID: 'SYN-6B-FREE', Last: 'Bystander', Status: 'Active', EmployerBizId: 'UNTRACKED' });
  const withDismissal = custody([person(), bystander], { rngValue: 0 });
  const without = custody([person(), bystander], { rngValue: 0, arrest: 111 });
  assert(dismissed(withDismissal) && !dismissed(without), 'fixture splits on the dismissal');
  assert.strictEqual(withDismissal.draws(), without.draws(), 'ctx.rng draw count identical with and without a dismissal');
  assert.strictEqual(JSON.stringify(withDismissal.row(1)), JSON.stringify(without.row(1)), 'the other citizen\'s row is identical');
});
check('6b once per case: the next Cycle neither dismisses again nor cuts again', () => {
  const run = custody([person()]);
  const after = Object.assign(person(), { EmployerBizId: '', Income: run.get(0, 'Income'), LifeHistory: run.get(0, 'LifeHistory') });
  const next = custody([after], { cycle: CYC + 1 });
  assert.strictEqual(next.get(0, 'Income'), after.Income);
  assert.strictEqual((next.get(0, 'LifeHistory').match(/Career-Layoff/g) || []).length, 1);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(next.custody)), { dismissed: 0, skipped: 1 });
});
check('6b a detainee past the tenth career event is still dismissed (the loop cap cannot hide them)', () => {
  const crowd = [];
  for (let i = 0; i < 14; i++) crowd.push(person({ POPID: 'SYN-6B-A' + String(i).padStart(2, '0'), Last: 'Worker' + i, Status: 'Active', EmployerBizId: 'UNTRACKED' }));
  const run = custody(crowd.concat([person()]), { rngValue: 0, cases: [caseRowFor('SYN-6B-DET', 110)] });
  const moved = crowd.filter((p, i) => run.get(i, 'LifeHistory') !== '').length;
  assert.strictEqual(moved, 10, 'the citizen loop stopped at its ten-event cap (got ' + moved + ')');
  assert(dismissed(run, 14), 'row 15 dismissed by the case-keyed pass');
});
check('6b seat already shed: no headcount delta, and the Active bystander is not fired', () => {
  const mate = person({ POPID: 'SYN-6B-MATE', Last: 'Colleague', Status: 'Active' });
  const run = custody([person(), mate], { biz: [['BIZ-999999', 'SYNTHETIC TEST EMPLOYER', 'Construction', 100000, 1, '', '']],
    cases: [caseRowFor('SYN-6B-DET', 110)] });
  assert(dismissed(run, 0), 'detainee dismissed');
  assert.strictEqual(run.ctx.summary.careerSignals.businessDeltas['BIZ-999999'], undefined, 'no delta');
  assert.strictEqual(run.get(1, 'EmployerBizId'), 'BIZ-999999', 'colleague keeps the job');
  assert.strictEqual(run.cells.length, 0, 'stated count untouched');
  assert.strictEqual(run.ctx.summary.careerSignals.headcountWriteBack.fired, 0);
});
check('6b a decline during custody takes the seat first: the dismissal adds no second loss', () => {
  const mate = person({ POPID: 'SYN-6B-MATE', Last: 'Colleague', Status: 'Active' });
  const run = custody([person(), mate], { biz: [['BIZ-999999', 'SYNTHETIC TEST EMPLOYER', 'Construction', 100000, 2, '', '']],
    cases: [caseRowFor('SYN-6B-DET', 110)], summary: { businessDeclines: { 'BIZ-999999': 1 } } });
  assert(dismissed(run, 0));
  assert.strictEqual(run.ctx.summary.careerSignals.businessDeltas['BIZ-999999'].lost, 1, 'only the decline\'s own loss');
  assert.strictEqual(run.get(1, 'EmployerBizId'), 'BIZ-999999', 'colleague keeps the job');
  assert.strictEqual(run.ctx.summary.careerSignals.headcountWriteBack.fired, 0);
});
check('6b blank stated count: dismissed, no delta; no Business_Ledger row: not dismissed', () => {
  const blank = custody([person()], { biz: [['BIZ-999999', 'SYNTHETIC TEST EMPLOYER', 'Construction', 100000, '', '', '']] });
  assert(dismissed(blank) && blank.ctx.summary.careerSignals.businessDeltas['BIZ-999999'] === undefined);
  const p = person();
  const missing = custody([p], { biz: [['BIZ-000001', 'SOMEONE ELSE', 'Construction', 100000, 5, '', '']] });
  assert(untouchedRow(missing, 0, p), 'no employer row → untouched');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(missing.custody)), { dismissed: 0, skipped: 1 });
});
check('6b owners are never dismissed from their own business — every Key_Personnel shape', () => {
  const kp = k => ({ biz: [['BIZ-999999', 'SYNTHETIC TEST EMPLOYER', 'Construction', 100000, 5, '', k]] });
  for (const shape of ['Synthetic Detainee (Founder)', 'POP-00000 Other Person (Owner); Synthetic Detainee (Co-Founder)']) {
    const p = person();
    assert(untouchedRow(custody([p], kp(shape)), 0, p), 'owner by name "' + shape + '" kept');
  }
  const idName = person({ POPID: 'POP-99001' });
  assert(untouchedRow(custody([idName], Object.assign(kp('POP-99001 Synthetic Detainee (Owner)'), { cases: [caseRowFor('POP-99001', 110)] })), 0, idName), 'id + name + owner tag kept');
  const idInTag = person({ POPID: 'POP-99001' });
  assert(untouchedRow(custody([idInTag], Object.assign(kp('POP-99001 (Synthetic Detainee, Owner)'), { cases: [caseRowFor('POP-99001', 110)] })), 0, idInTag), 'name inside the tag kept');
  const idOnly = person({ POPID: 'POP-99001' });
  assert(untouchedRow(custody([idOnly], Object.assign(kp('POP-99001 Synthetic Detainee'), { cases: [caseRowFor('POP-99001', 110)] })), 0, idOnly), 'bare id + name (minted-owner form) kept');
  const mismatch = person({ POPID: 'POP-99001' });
  assert(dismissed(custody([mismatch], Object.assign(kp('POP-99001 Somebody Else (Owner)'), { cases: [caseRowFor('POP-99001', 110)] }))), 'id beside another name resolves nobody → an employee, dismissed');
  assert(dismissed(custody([person()], kp('Synthetic Detainee (Site Manager)'))), 'named staff with a job tag is not an owner');
});
check('6b scope: only an ENGINE-clock Tier 3–4 working adult with a tracked employer is dismissed', () => {
  for (const over of [{ EmployerBizId: 'SELF_EMPLOYED' }, { EmployerBizId: 'UNTRACKED' }, { EmployerBizId: '' }, { Tier: 2 }, { Tier: 1 },
    { ClockMode: 'CIVIC' }, { ClockMode: 'MEDIA' }, { ClockMode: 'GAME' }, { CareerStage: 'retired' },
    { EconomicProfileKey: 'SPORTS_OVERRIDE' }, { Status: 'deceased' }, { Status: 'traded' }, { Status: 'inactive' }]) {
    const p = person(over);
    const run = custody([p], { cases: [caseRowFor(p.POPID, 110)] });
    assert(untouchedRow(run, 0, p), JSON.stringify(over) + ' must not be dismissed');
  }
  const minor = person({ BirthYear: sb.simYearOf_({ summary: { cycleId: CYC }, config: { cycleCount: CYC } }, CYC) - 16 });
  assert(untouchedRow(custody([minor]), 0, minor), 'a minor is not dismissed');
  const zero = custody([person({ Income: 0 })]);
  assert(dismissed(zero) && zero.get(0, 'Income') === 0, 'Income 0: dismissed, nothing to cut');
});
check('6b in care inside custody past the dial: dismissed (the clock is the case)', () => {
  for (const status of ['hospitalized', 'critical', 'recovering']) {
    const p = person({ Status: status });
    assert(dismissed(custody([p], { cases: [caseRowFor(p.POPID, 110)] })), status);
  }
});
check('6b an open case over a free ledger row is skipped this Cycle and dismissed the next', () => {
  const free = person({ Status: 'Active', SkillTags: 'Construction' });
  const run = custody([free], { cases: [caseRowFor(free.POPID, 110)],
    biz: [['BIZ-999999', 'SYNTHETIC TEST EMPLOYER', 'Construction', 100000, 5, 60, '']] });
  assert.strictEqual(run.get(0, 'EmployerBizId'), 'BIZ-999999', 'not dismissed while the ledger shows them free');
  assert(!/Career-Layoff|Career-Hired/.test(run.get(0, 'LifeHistory')), 'never handed to the rehire matcher');
  assert.strictEqual(run.custody.skipped, 1);
  const reasserted = person();
  assert(dismissed(custody([reasserted], { cycle: CYC + 1 })), 'dismissed once custody is re-asserted');
});
check('6b failure policy: no tab → career completes, Phase5-CustodyDismissal logged, nothing dismissed; lands next Cycle', () => {
  const p = person();
  const run = custody([p], { noTab: true });
  assert(untouchedRow(run, 0, p));
  assert.strictEqual(run.errors.length, 1);
  assert.strictEqual(run.errors[0].phase, 'Phase5-CustodyDismissal');
  assert(/Judicial_Ledger tab missing \(0 dismissal\(s\) committed before the fault\)/.test(run.errors[0].message), run.errors[0].message);
  assert(run.ctx.summary.careerSignals.headcountWriteBack, 'the rest of the career run completed');
  assert(dismissed(custody([person()], { cycle: CYC + 1 })), 'next Cycle still finds the case past the dial');
});
check('6b failure policy: a bad dial is reported the same way', () => {
  const p = person();
  const run = custody([p], { dial: 2.5 });
  assert(untouchedRow(run, 0, p) && run.errors.length === 1 && /judicialDismissAfterCycles/.test(run.errors[0].message));
});
check('6b stage then commit: a fault on the second case leaves it untouched; the first stands', () => {
  const first = person({ POPID: 'SYN-6B-AAA', Last: 'First' }), second = person({ POPID: 'SYN-6B-ZZZ', Last: 'Second' });
  const real = sb.parseKeyPersonnelOwners_;
  let calls = 0;
  sb.parseKeyPersonnelOwners_ = cell => { if (++calls === 2) throw new Error('synthetic stage fault'); return real(cell); };
  let run;
  try { run = custody([first, second]); } finally { sb.parseKeyPersonnelOwners_ = real; }
  assert(dismissed(run, 0), 'first committed');
  assert(untouchedRow(run, 1, second), 'second untouched');
  assert(/synthetic stage fault \(1 dismissal\(s\) committed before the fault\)/.test(run.errors[0].message), run.errors[0].message);
  assert.strictEqual(run.ctx.summary.careerSignals.layoffs, 1);
});
check('6b headcount reconcile firing: zero-income victim draws nothing, positive-income victim one draw (B4 extraction)', () => {
  for (const income of [0, 60000]) {
    const a = person({ POPID: 'SYN-6B-W1', Last: 'One', Status: 'Active', Income: income });
    const b = person({ POPID: 'SYN-6B-W2', Last: 'Two', Status: 'Active', Income: 90000 });
    const run = custody([a, b], { cases: [], biz: [['BIZ-999999', 'SYNTHETIC TEST EMPLOYER', 'Construction', 100000, 1, '', '']] });
    assert.strictEqual(run.get(0, 'EmployerBizId'), '', 'lowest earner fired');
    assert(/\[Career-Layoff\] Lost their job when SYNTHETIC TEST EMPLOYER cut 1 position$/.test(run.get(0, 'LifeHistory')));
    assert.strictEqual(run.get(0, 'LastUpdated'), 'synthetic');
    assert.strictEqual(run.get(1, 'EmployerBizId'), 'BIZ-999999');
    assert.strictEqual(run.ctx.summary.careerSignals.headcountWriteBack.fired, 1);
    assert.strictEqual(run.ctx.summary.careerSignals.businessDeltas['BIZ-999999'].lost, 1);
    if (income === 0) assert.strictEqual(run.get(0, 'Income'), 0);
    else assert(run.get(0, 'Income') >= 4110 && run.get(0, 'Income') <= 52800);
    run.firedDraws = run.draws();
    custody.lastDraws = custody.lastDraws || {};
    custody.lastDraws[income] = run.draws();
  }
  assert.strictEqual(custody.lastDraws[60000] - custody.lastDraws[0], 1, 'exactly one extra career draw for the positive-income cut');
});
check('6b dismissed, then released: the savings charge is at the reduced figure for every week held', () => {
  const HX = H.concat(['NetWorth', 'DebtLevel']);
  const p = person();
  const run = custody([p]);
  const reduced = run.get(0, 'Income');
  const row = run.row(0).concat([20000, 0]);
  const c = {}; sb.JUDICIAL_CASE_FIELDS_.forEach((f, i) => { c[f] = caseRowFor(p.POPID, 110)[i]; });
  c.Outcome = 'held-served'; c.CyclesHeld = 4; c.ResolveCycle = 114;
  const cols = { iClock: HX.indexOf('ClockMode'), iBirth: HX.indexOf('BirthYear'),
    iIncome: HX.indexOf('Income'), iNW: HX.indexOf('NetWorth'), iDebt: HX.indexOf('DebtLevel'), iLife: HX.indexOf('LifeHistory') };
  const res = sb.judicialSettleLostPay_({ ledger: { dirty: false }, logRows: [], now: 'synthetic', summary: { cycleId: 114 }, config: { cycleCount: 114 } },
    row, c, 114, cols, 'detained');
  assert.strictEqual(res.charge, Math.round(reduced / 52 * 4));
  assert.strictEqual(row[cols.iNW], 20000 - res.charge);
  assert.strictEqual(row[cols.iIncome], reduced, 'Income untouched by the settlement');
});
// ── Task 8 R2-1: the stamps the census is derived from (L IntakeType, M SourceSystem,
// N SourceEventId, O TransferFromId) ──────────────────────────────────────────
function intake(pop, type, system, extra) {
  return Object.assign({ popId: pop, name: 'Synthetic Fixture', neighborhood: 'SYNTHETIC_TEST_HOOD',
    cause: 'synthetic cause', from: 'Active', to: 'hospitalized', cycle: 8002, priorStatus: 'Active',
    kind: 'intake', intakeType: type, sourceSystem: system,
    sourceEventId: system + ':C8002:' + type + ':' + pop }, extra || {});
}
check('T8 ambulance intake stamps L–O from its receipt', () => {
  const ctx = make('UNTRACKED');
  ctx.ledger.rows[0][ix('HealthCause')] = '';
  const receipt = syntheticAmbulance(ctx, 'active', '');
  const row = persistOnMock(ctx).sheet.rows[1];
  assert.strictEqual(row.length, 16);
  assert.deepStrictEqual([...row.slice(11, 15)], ['illness', 'ambulance', receipt.sourceEventId, '']);
  assert.strictEqual(row[0], 'H-C8002-' + receipt.popId);
});
check('T8 heat and ordinary-health intakes stamp their own type and source', () => {
  for (const [type, system] of [['heat', 'heat-wave'], ['injury', 'health-engine'], ['illness', 'health-engine']]) {
    const ctx = make('UNTRACKED');
    const pop = ctx.ledger.rows[0][ix('POPID')];
    ctx.ledger.rows[0][ix('Status')] = 'hospitalized';
    ctx.summary.hospitalEvents = [intake(pop, type, system)];
    const row = persistOnMock(ctx).sheet.rows[1];
    assert.deepStrictEqual([...row.slice(11, 16)], [type, system, system + ':C8002:' + type + ':' + pop, '', 'Active']);
  }
});
check('T8 missed-admission row is a reconcile row with the no-event id', () => {
  const ctx = make('UNTRACKED');
  const pop = ctx.ledger.rows[0][ix('POPID')];
  ctx.ledger.rows[0][ix('Status')] = 'critical';
  ctx.ledger.rows[0][ix('StatusStartCycle')] = 8000;
  ctx.summary.hospitalEvents = [];
  const row = persistOnMock(ctx).sheet.rows[1];
  assert.strictEqual(row[5], 8000, 'AdmitCycle stays the Cycle care began');
  assert.deepStrictEqual([...row.slice(11, 16)], ['unclassified', 'reconcile', 'reconcile:C8002:unclassified:' + pop, '', '']);
});
check('T8 a transition with no open row is a reconcile row, never an intake', () => {
  const ctx = make('UNTRACKED');
  const pop = ctx.ledger.rows[0][ix('POPID')];
  ctx.ledger.rows[0][ix('Status')] = 'critical';
  ctx.summary.hospitalEvents = [{ popId: pop, cycle: 8002, from: 'hospitalized',
    to: 'critical', kind: 'transition', cause: 'synthetic illness' }];
  const result = persistOnMock(ctx);
  assert.strictEqual(result.sheet.rows.length, 2, 'one row: the missed-admission pass sees the bed');
  assert.deepStrictEqual([...result.sheet.rows[1].slice(11, 16)],
    ['unclassified', 'reconcile', 'reconcile:C8002:unclassified:' + pop, '', '']);
});
check('T8 an intake whose SourceEventId already has a row opens no second intake row', () => {
  const ctx = make('UNTRACKED');
  const pop = ctx.ledger.rows[0][ix('POPID')];
  const ev = intake(pop, 'illness', 'health-engine');
  const closed = ['H-C8002-' + pop, pop, '', '', '', 8002, 'active', 8002, 8002, 'recovered', 0,
    'illness', 'health-engine', ev.sourceEventId, '', 'Active'];
  ctx.ledger.rows[0][ix('Status')] = 'active';
  ctx.summary.hospitalEvents = [ev];
  const result = persistOnMock(ctx, closed);
  assert.strictEqual(result.sheet.rows.length, 2);
  assert.strictEqual(result.census.admitsThisCycle, 0);
});
check('T8 a second admission in the Cycle of a closed row takes the next free id', () => {
  const ctx = make('UNTRACKED');
  const pop = ctx.ledger.rows[0][ix('POPID')];
  const closed = ['H-C8002-' + pop, pop, '', '', '', 8002, 'active', 8002, 8002, 'recovered', 0,
    'illness', 'health-engine', 'health-engine:C8002:illness:' + pop, '', 'Active'];
  ctx.ledger.rows[0][ix('Status')] = 'hospitalized';
  ctx.summary.hospitalEvents = [intake(pop, 'injury', 'ambulance', { sourceEventId: 'ambulance:SYN-2:' + pop })];
  const result = persistOnMock(ctx, closed);
  assert.strictEqual(result.sheet.rows.length, 3);
  assert.strictEqual(result.sheet.rows[2][0], 'H-C8002-' + pop + '-2');
  // The missed-admission id is checked the same way (it is built from StatusStartCycle).
  const ctx2 = make('UNTRACKED');
  ctx2.ledger.rows[0][ix('Status')] = 'injured';
  ctx2.ledger.rows[0][ix('StatusStartCycle')] = 8002;
  ctx2.summary.hospitalEvents = [];
  const result2 = persistOnMock(ctx2, closed);
  assert.strictEqual(result2.sheet.rows[2][0], 'H-C8002-' + pop + '-2');
});
check('T8 an intake without SourceEventId, or with an unknown type, fails the writer before any write', () => {
  const ctx = make('UNTRACKED');
  const pop = ctx.ledger.rows[0][ix('POPID')];
  ctx.ledger.rows[0][ix('Status')] = 'hospitalized';
  ctx.summary.hospitalEvents = [intake(pop + '-OTHER', 'illness', 'health-engine'),
    intake(pop, 'illness', 'health-engine', { sourceEventId: '' })];
  const sheet = hospitalSheet();
  ctx.ss = { getSheetByName: name => name === 'Hospital_Ledger' ? sheet : null };
  assert.throws(() => sb.persistHospitalLedger_(ctx), /without SourceEventId/);
  assert.strictEqual(sheet.rows.length, 1, 'nothing written, not even the valid first receipt');
  ctx.summary.hospitalEvents = [intake(pop + '-OTHER', 'illness', 'health-engine'),
    intake(pop, 'broken-leg', 'health-engine')];
  assert.throws(() => sb.persistHospitalLedger_(ctx), /unknown IntakeType/);
  assert.strictEqual(sheet.rows.length, 1, 'nothing written ahead of the unknown type either');
});
check('T8 a tab whose L–O headers are out of place is refused', () => {
  const ctx = make('UNTRACKED');
  ctx.summary.hospitalEvents = [];
  const sheet = hospitalSheet();
  sheet.rows[0][12] = 'SourceEventId'; sheet.rows[0][13] = 'SourceSystem';
  ctx.ss = { getSheetByName: name => name === 'Hospital_Ledger' ? sheet : null };
  assert.throws(() => sb.persistHospitalLedger_(ctx), /SourceSystem header missing at column M/);
});
console.log(passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
