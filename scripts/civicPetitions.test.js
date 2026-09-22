'use strict';

// Isolated synthetic fixtures only. No Sheets, model calls, or repository output writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { countPetition, loadLocalData, main } = require('./civicPetitions');
let passed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function fixture() {
  return {
    cycle: 999,
    Neighborhood_Map: [
      { Neighborhood: 'East Oakland', ChildAreas: 'Coliseum' },
      { Neighborhood: 'Temescal', ChildAreas: 'Longfellow' },
    ],
    Neighborhood_Demographics: [
      { Neighborhood: 'East Oakland', Students: '10', Adults: '80', Seniors: '10', Sick: '7' },
      { Neighborhood: 'Temescal', Students: '20', Adults: '60', Seniors: '20', Sick: '3' },
    ],
    Household_Ledger: [
      { HouseholdId: 'SYNTHETIC-HH-1', Neighborhood: 'Coliseum', Status: 'active', HousingType: 'rented', MonthlyRent: '1200', HouseholdIncome: '40000' },
      { HouseholdId: 'SYNTHETIC-HH-2', Neighborhood: 'East Oakland', Status: 'active', HousingType: 'rented', MonthlyRent: '1000', HouseholdIncome: '40000' },
      { HouseholdId: 'SYNTHETIC-HH-3', Neighborhood: 'Temescal', Status: 'active', HousingType: 'rented', MonthlyRent: '2000', HouseholdIncome: '40000' },
    ],
    Hospital_Ledger: [
      { AdmissionId: 'SYNTHETIC-A1', POPID: 'POP-99901', Neighborhood: 'Coliseum', StatusNow: 'recovering', DischargeCycle: '', Outcome: '' },
      { AdmissionId: 'SYNTHETIC-A2', POPID: 'POP-99902', Neighborhood: 'East Oakland', StatusNow: 'active', DischargeCycle: '998', Outcome: 'recovered' },
    ],
    Crime_Metrics: [
      { Neighborhood: 'East Oakland', ViolentLevel: '8' },
      { Neighborhood: 'Temescal', ViolentLevel: '2' },
    ],
    Simulation_Ledger: [{ POPID: 'POP-99901', Neighborhood: 'Coliseum' }],
    Reflection_Intake: [
      { POPID: 'POP-99901', Cycle: '999', Tag: 'Civic', Affect: 'Frustrated', Applied: 'yes', ReflectionExcerpt: 'SYNTHETIC complaint.' },
      { POPID: 'POP-99901', Cycle: '999', Tag: 'Civic', Affect: 'Content', Applied: 'no', ReflectionExcerpt: 'SYNTHETIC constructive participation.' },
      { POPID: 'POP-99901', Cycle: '998', Tag: 'Civic', Affect: 'Angry', Applied: 'yes' },
    ],
  };
}
const proposal = domain => ({ policyDomain: domain, hoods: ['East Oakland'] });

test('annual burden, exact boundary, child fold, and duplicate target hoods', () => {
  const r = countPetition({ policyDomain: 'housing', hoods: ['East Oakland', 'Coliseum'] }, fixture());
  assert.deepEqual(r.hoods, ['East Oakland']);
  assert.equal(r.counts.activeRentedHouseholds, 2);
  assert.equal(r.counts.hardshipHouseholds, 1);
  assert.equal(r.population.value, 100);
  assert.equal(r.support.band, null);
  assert.equal(r.support.cleared, false);
});
test('missing, zero, malformed income and rent are counted explicitly; no owned/dissolved signatures', () => {
  const d = fixture(), base = d.Household_Ledger[0];
  for (const [n, income] of ['0', '', 'bad', '-1'].entries()) d.Household_Ledger.push({ ...base, HouseholdId: 'SYNTHETIC-I' + n, HouseholdIncome: income });
  d.Household_Ledger.push({ ...base, HouseholdId: 'SYNTHETIC-RENT', MonthlyRent: '' });
  d.Household_Ledger.push({ ...base, HouseholdId: 'SYNTHETIC-OWN', HousingType: 'owned' });
  d.Household_Ledger.push({ ...base, HouseholdId: 'SYNTHETIC-OLD', Status: 'dissolved' });
  const r = countPetition(proposal('housing'), d, { supportBand: 0.001 });
  assert.equal(r.counts.zeroIncomeHouseholds, 1);
  assert.equal(r.counts.missingIncomeHouseholds, 1);
  assert.equal(r.counts.invalidIncomeHouseholds, 2);
  assert.equal(r.counts.missingOrInvalidRentHouseholds, 1);
  assert.equal(r.counts.hardshipHouseholds, 1);
  assert.equal(r.support.requiredCount, 1);
  assert.equal(r.support.cleared, false);
  assert.equal(r.support.reason, 'domain-not-playable');
});
test('health support uses Sick, counts open people once, and excludes discharges', () => {
  const d = fixture();
  d.Hospital_Ledger.push({ ...d.Hospital_Ledger[0], AdmissionId: 'SYNTHETIC-A3' });
  const r = countPetition(proposal('health'), d, { supportBand: 0.01 });
  assert.equal(r.counts.inCareCitizens, 1);
  assert.equal(r.counts.openAdmissions, 2);
  assert.equal(r.counts.sickResidents, 7);
  assert.equal(r.support.numerator, 7);
  assert.equal(r.support.unit, 'sick-residents');
  assert.equal(r.support.requiredCount, 1);
  assert.equal(r.support.cleared, true);
  assert.equal(countPetition(proposal('health'), d, { supportBand: 0.0625 }).support.cleared, true);
  assert.equal(countPetition(proposal('health'), d, { supportBand: 0.071 }).support.cleared, false);
});
test('health Sick support folds and deduplicates target hoods, independent of hospital coverage', () => {
  const d = fixture();
  d.Hospital_Ledger = [];
  const r = countPetition({ policyDomain: 'health', hoods: ['Coliseum', 'East Oakland', 'Longfellow'] }, d,
    { supportBand: 0.05 });
  assert.equal(r.support.numerator, 10);
  assert.equal(r.population.value, 200);
  assert.equal(r.support.requiredCount, 10);
  assert.equal(r.support.cleared, true);
  assert.equal(r.counts.inCareCitizens, 0);
});
test('missing or invalid Sick in any target hood blocks support; zero is a valid count', () => {
  for (const sick of [undefined, '', 'bad', '-1']) {
    const d = fixture();
    d.Neighborhood_Demographics[1].Sick = sick;
    const r = countPetition({ policyDomain: 'health', hoods: ['East Oakland', 'Temescal'] }, d,
      { supportBand: 0.01 });
    assert.equal(r.counts.sickResidents, null);
    assert.equal(r.support.numerator, null);
    assert.equal(r.support.cleared, false);
    assert.equal(r.support.reason, 'condition-incomplete');
    assert.equal(countPetition(proposal('health'), d, { supportBand: 0.01 }).support.cleared, true,
      'a missing count outside the target must not block support');
  }
  const d = fixture();
  d.Neighborhood_Demographics[0].Sick = '0';
  const r = countPetition(proposal('health'), d, { supportBand: 0.01 });
  assert.equal(r.support.numerator, 0);
  assert.equal(r.counts.inCareCitizens, 1);
  assert.equal(r.support.reason, 'below-support-band');
  assert.equal(r.support.cleared, false);
});
test('support threshold uses hood population, not tracked people; never inferred from hardship band', () => {
  const d = fixture();
  d.Neighborhood_Demographics[0].Adults = '980';
  const r = countPetition(proposal('health'), d, { supportBand: 0.01, hardshipBand: 0.9 });
  assert.equal(r.support.requiredCount, 10);
  assert.equal(r.support.cleared, false);
  assert.equal(countPetition(proposal('health'), d).support.reason, 'support-band-unset');
});
test('bad care rows are printed warnings, scoped to the district and never a citywide veto', () => {
  const d = fixture(), base = d.Hospital_Ledger[0];
  d.Hospital_Ledger.push({ ...base, POPID: 'POP-99903', Neighborhood: 'SYNTHETIC OFF MAP' });
  let r = countPetition(proposal('health'), d, { supportBand: 0.01 });
  assert.equal(r.support.cleared, true, 'unlocated row must not veto valid district support');
  assert.equal(r.quality.unlocatedConditionRows, 1);
  d.Hospital_Ledger.push({ POPID: 'POP-99904', Neighborhood: 'Temescal' });
  r = countPetition(proposal('health'), d, { supportBand: 0.01 });
  assert.equal(r.support.cleared, true);
  assert.equal(r.quality.invalidConditionRows, 0, 'other district invalid rows are not target defects');
  d.Hospital_Ledger.push({ POPID: 'POP-99905', Neighborhood: 'Coliseum' });
  r = countPetition(proposal('health'), d, { supportBand: 0.01 });
  assert.equal(r.quality.invalidConditionRows, 1, 'child-area invalid row belongs to target');
  assert.equal(r.counts.inCareCitizens, 1, 'bad rows never become signatures');
  assert.equal(r.support.cleared, true, 'invalid target row is a warning, not a veto');
  assert.equal(countPetition(proposal('health'), d, { supportBand: 0.08 }).support.reason, 'below-support-band');
});
test('safety compares the entire city median, reports hood conditions, and cannot clear', () => {
  const r = countPetition(proposal('safety'), fixture(), { supportBand: 0.001 });
  assert.equal(r.counts.cityMedianViolentLevel, 5);
  assert.equal(r.counts.aboveMedianHoods, 1);
  assert.equal(r.support.numerator, null);
  assert.equal(r.support.cleared, false);
});
test('reflections are visibility only, include applied and unapplied, filter cycles and affects', () => {
  const d = fixture();
  const r = countPetition(proposal('health'), d);
  assert.equal(r.visibility.civicRows, 2);
  assert.equal(r.visibility.complaintRows, 1);
  assert.equal(r.visibility.uniqueCitizens, 1);
  assert.equal(r.support.numerator, 7);
  assert.equal(countPetition(proposal('health'), d, { sinceCycle: 998 }).visibility.civicRows, 3);
  d.Reflection_Intake.push({ POPID: 'POP-99999', Cycle: '999', Tag: 'Civic' });
  assert.equal(countPetition(proposal('health'), d).visibility.unlocatedRows, 1);
  d.Reflection_Intake = null;
  assert.equal(countPetition(proposal('health'), d).visibility.available, false);
});
test('sheet parent map wins over cached membership, and ambiguous parents fail loudly', () => {
  const d = fixture();
  d.Neighborhood_Map[0].ChildAreas = 'SYNTHETIC CHILD';
  d.Household_Ledger[0].Neighborhood = 'SYNTHETIC CHILD';
  assert.equal(countPetition({ policyDomain: 'housing', hoods: ['SYNTHETIC CHILD'] }, d).counts.hardshipHouseholds, 1);
  d.Neighborhood_Map[1].ChildAreas = 'SYNTHETIC CHILD';
  assert.throws(() => countPetition(proposal('housing'), d), /multiple parents/);
});
test('unknown targets and missing schema fail; unsupported domains explicitly defer', () => {
  assert.throws(() => countPetition({ policyDomain: 'health', hoods: ['SYNTHETIC UNKNOWN'] }, fixture()), /Unknown neighborhood/);
  const d = fixture(); delete d.Neighborhood_Map[0].ChildAreas;
  assert.throws(() => countPetition(proposal('health'), d), /ChildAreas/);
  assert.equal(countPetition(proposal('education'), fixture()).support.reason, 'domain-rules-deferred');
  assert.throws(() => countPetition(proposal('health'), fixture(), { supportBand: 0 }), /supportBand/);
});
test('duplicates do not inflate housing; conflicting identities and missing input fail', () => {
  const d = fixture(); d.Household_Ledger.push({ ...d.Household_Ledger[0] });
  assert.equal(countPetition(proposal('housing'), d).counts.hardshipHouseholds, 1);
  d.Household_Ledger.push({ ...d.Household_Ledger[0], HouseholdIncome: '100' });
  assert.throws(() => countPetition(proposal('housing'), d), /Conflicting HouseholdId/);
  d.Household_Ledger = null;
  assert.throws(() => countPetition(proposal('housing'), d), /Household_Ledger/);
});
test('housing identity checks are local to the target hoods; unlocated households are printed', () => {
  const d = fixture();
  d.Household_Ledger.push({ ...d.Household_Ledger[2], HouseholdId: '' });
  d.Household_Ledger.push({ ...d.Household_Ledger[0], HouseholdId: '', Neighborhood: 'SYNTHETIC OFF MAP' });
  const r = countPetition(proposal('housing'), d);
  assert.equal(r.counts.activeRentedHouseholds, 2);
  assert.equal(r.quality.unlocatedConditionRows, 1);
  assert.equal(r.support.cleared, false);
});
test('incomplete population blocks support; incomplete crime city cannot supply a median', () => {
  const d = fixture(); d.Neighborhood_Demographics[0].Adults = '';
  assert.equal(countPetition(proposal('health'), d, { supportBand: 0.01 }).support.reason, 'population-incomplete');
  d.Crime_Metrics.pop();
  assert.throws(() => countPetition(proposal('safety'), d), /Crime_Metrics.*Temescal/);
});
test('counter is deterministic and does not mutate caller data', () => {
  const d = fixture(), before = JSON.stringify(d);
  const a = countPetition(proposal('housing'), d);
  assert.deepEqual(a, countPetition(proposal('housing'), d));
  assert.equal(JSON.stringify(d), before);
});
test('disk loader and CLI are local-only, read-only, cycle checked and fail loudly on corrupt JSONL', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'civic-petitions-synthetic-'));
  try {
    const out = path.join(root, 'output'), beats = path.join(out, 'beats'); fs.mkdirSync(beats, { recursive: true });
    const d = fixture();
    for (const [tab, rows] of Object.entries(d)) if (Array.isArray(rows) && !['Neighborhood_Map', 'Simulation_Ledger'].includes(tab)) fs.writeFileSync(path.join(beats, tab + '.jsonl'), rows.map(r => JSON.stringify(r)).join('\n'));
    fs.writeFileSync(path.join(beats, 'meta.json'), JSON.stringify({ cycle: 999 }));
    fs.writeFileSync(path.join(out, 'engine_audit_c999.json'), JSON.stringify({ cycle: 999, snapshots: { Neighborhood_Map: d.Neighborhood_Map } }));
    fs.writeFileSync(path.join(out, 'simulation_ledger_snapshot.jsonl'), d.Simulation_Ledger.map(r => JSON.stringify(r)).join('\n'));
    fs.writeFileSync(path.join(out, 'simulation_ledger_snapshot.meta.json'), JSON.stringify({ cycle: 999 }));
    const loaded = loadLocalData({ root });
    assert.equal(countPetition(proposal('health'), loaded).visibility.civicRows, 2);
    const before = fs.readdirSync(beats).map(f => [f, fs.readFileSync(path.join(beats, f), 'utf8')]);
    const printed = [], log = console.log;
    try {
      console.log = line => printed.push(line);
      main(['--dry-run', '--root', root, '--domain', 'housing', '--hood', 'Coliseum', '--json']);
    } finally { console.log = log; }
    assert.equal(JSON.parse(printed.join('\n')).results[0].counts.hardshipHouseholds, 1);
    assert.deepEqual(fs.readdirSync(beats).map(f => [f, fs.readFileSync(path.join(beats, f), 'utf8')]), before);
    assert.throws(() => loadLocalData({ root, cycle: 998 }), /cycle/i);
    assert.throws(() => main(['--apply']), /Unknown or missing option/);
    fs.appendFileSync(path.join(beats, 'Household_Ledger.jsonl'), '\n{broken');
    assert.throws(() => loadLocalData({ root }), /Household_Ledger.jsonl:4/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('beats dump treats Reflection_Intake as optional, including empty and present cases', async () => {
  const source = fs.readFileSync(path.join(__dirname, 'dumpBeatTabs.js'), 'utf8');
  const required = ['Business_Ledger', 'Employment_Roster', 'Casino_Ledger', 'Transit_Metrics', 'Crime_Metrics',
    'Neighborhood_Demographics', 'Hospital_Ledger', 'Health_Cause_Queue', 'Community_Programs',
    'Faith_Organizations', 'Faith_Ledger', 'Cycle_Weather', 'Household_Ledger', 'Story_Seed_Deck', 'Story_Hook_Deck'];
  for (const present of [false, true]) {
    const writes = new Map(), reads = [], errors = [];
    const synthetic = [{ POPID: 'POP-99901', Cycle: '999', Tag: 'Civic', ReflectionExcerpt: 'SYNTHETIC' }];
    const fakeFs = { mkdirSync() {}, existsSync() { return false; }, readFileSync() { throw new Error('no prior dump'); },
      writeFileSync(file, data) { writes.set(path.basename(file), data); } };
    vm.runInNewContext(source, {
      __dirname, console: { log() {}, error(...m) { errors.push(m.join(' ')); } },
      process: { argv: ['node', 'dumpBeatTabs.js', '999', '--quiet'], exit(code) { throw new Error('dump exited ' + code); } },
      require(name) {
        if (name.endsWith('/lib/env')) return {};
        if (name === 'fs') return fakeFs;
        if (name === 'path') return path;
        if (name === '../lib/sheets') return {
          async listSheets() { return required.concat(present ? ['Reflection_Intake'] : []).map(title => ({ title })); },
          async getSheetAsObjects(tab) { reads.push(tab); return tab === 'Reflection_Intake' ? synthetic : []; },
        };
        throw new Error('Unexpected dependency ' + name);
      },
    }, { filename: 'dumpBeatTabs.js' });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(errors, []);
    assert.equal(writes.get('Reflection_Intake.jsonl'), present ? JSON.stringify(synthetic[0]) + '\n' : '');
    assert.equal(JSON.parse(writes.get('meta.json')).rows.Reflection_Intake, present ? 1 : 0);
    assert.equal(reads.includes('Reflection_Intake'), present);
  }
});
(async () => {
  for (const { name, fn } of tests) { await fn(); passed++; console.log('ok ' + name); }
  console.log('civicPetitions: ' + passed + ' tests passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
