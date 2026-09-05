'use strict';
// engine.109 (S419) — THE HOUSEHOLD DOOR. A complete household on the Intake
// tab mints to Simulation_Ledger through the promotion populator; a lone name
// still earns its row (S320). Proves: the plan (grouping, boundaries, queue
// order), the mint (every column the ascent path fills), the wiring (spouse
// both ways, kids ← both parents, no phantom children), the household (one
// HouseholdId, one Household_Ledger row, one register row), and the provenance
// (no household line claims a lottery). Run: node scripts/householdIntake.test.js
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

const intents = [], logs = [];
const sandbox = {
  Logger: { log(m) { logs.push(String(m)); } },
  queueAppendIntent_: (ctx, tab, row) => intents.push({ tab, row }),
  queueCellIntent_: () => {},
  recordRipple_: () => {},
  inWorldStamp_: () => 'Y3C2',
  hoodReferencePay_: (ctx, hood, role) => (role === 'student' ? null : 61000),
  estimateRent_: (hood) => (hood === 'Temescal' ? 2200 : 1900),
  inferSexFromFirstName_: (f) => ({ marcus: 'male', dana: 'female', theo: 'male', ivy: 'female', rosa: 'female' }[String(f).toLowerCase()] || ''),
  getCoreSimNeighborhoods_: () => ['Temescal'],
  setCurrentField_: (a) => a, roleFieldOf_: () => null,
};
const src = R('phase01-config/advanceSimulationCalendar.js') + '\n' + R('utilities/citizenDerivation.js') + '\n' + R('phase05-citizens/processAdvancementIntake.js');
const E = new Function(...Object.keys(sandbox), src + '\nreturn { queueHouseholdIntake_, processAdvancementRows_, formIntakeHouseholds_, wireFamilyMatch_, ensureHouseholdQueueSheet_, HOUSEHOLD_QUEUE_COLS_, normalizeCitizenName_, buildNameIndex_ };')(...Object.values(sandbox));

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); } }

// ── mock sheets ──
function mkSheet(rows) {
  const s = { rows, appended: [], cleared: [], setCells: [] };
  s.getDataRange = () => ({ getValues: () => s.rows.map(r => r.slice()) });
  s.getLastColumn = () => (s.rows[0] || []).length;
  s.getLastRow = () => s.rows.length;
  s.appendRow = (r) => { s.rows.push(r.slice()); s.appended.push(r.slice()); };
  s.getRange = (r, c, nr, nc) => ({
    getValues: () => [s.rows[r - 1].slice(c - 1, c - 1 + (nc || 1))],
    setValue: (v) => { while (s.rows[r - 1].length < c) s.rows[r - 1].push(''); s.rows[r - 1][c - 1] = v; s.setCells.push([r, c, v]); },
    clearContent: () => { s.cleared.push(r); s.rows[r - 1] = s.rows[r - 1].map(() => ''); },
  });
  return s;
}
const SL = ['POPID','First','MaidenName','Last','OriginGame','UNI (y/n)','MED (y/n)','CIV (y/n)','ClockMode','Tier','RoleType','Status','BirthYear','OrginCity','LifeHistory','SpouseId','LastUpdated','TraitProfile','UsageCount','Neighborhood','HouseholdId','MaritalStatus','NumChildren','ParentIds','ChildrenIds','WealthLevel','Income','InheritanceReceived','NetWorth','SavingsRate','DebtLevel','EducationLevel','SchoolQuality','CareerStage','YearsInCareer','CareerMobility','LastPromotionCycle','DisplacementRisk','MigrationIntent','MigrationReason','MigrationDestination','MigratedCycle','ReturnedCycle','EconomicProfileKey','EmployerBizId','CitizenBio','Gender','DialState','SMPageId','MemoryRegisters','StatusStartCycle','HealthCause','LineageId','SkillTags','Famous'];
const col = (n) => SL.indexOf(n);
const slRow = (o) => { const r = SL.map(() => ''); Object.keys(o).forEach(k => { r[col(k)] = o[k]; }); return r; };
const INTAKE_H = ['First','Last','Age','Neighborhood','RoleType','Category','Family','Notes','IntakeStatus','Relation'];
const ADV_H = ['First','Middle','Last','RoleType','Tier','ClockMode','CIV','MED','UNI','Notes'];
const HH_H = ['HouseholdId','HeadOfHousehold','HouseholdType','Members','Neighborhood','HousingType','MonthlyRent','HousingCost','HouseholdIncome','FormedCycle','DissolvedCycle','Status','HouseholdSavings'];
const CYCLE = 106;
function world(intakeRows, opts) {
  opts = opts || {};
  const sheets = {
    Intake: mkSheet([(opts.intakeHeader || INTAKE_H).slice()].concat(intakeRows)),
    Advancement_Intake1: mkSheet([ADV_H.slice()]),
    LifeHistory_Log: mkSheet([['Timestamp','POPID','Name','EventTag','EventText','Neighborhood','Cycle']]),
    Household_Ledger: mkSheet([HH_H.slice()]),
    Family_Relationships: mkSheet([['HouseholdId','Husband','Wife','RelationshipType','SinceCycle','Status','Child1','Child2','Child3','Child4','Child5']]),
    Business_Ledger: mkSheet([['BIZ_ID','Name','Sector','Neighborhood','Employee_Count','Avg_Salary','Annual_Revenue','Growth_Rate','Key_Personnel']]),
    Generic_Citizens: mkSheet([['First','Last','Age','BirthYear','Neighborhood','Occupation','EmergenceCount','EmergedCycle','EmergenceContext','Status','Sex','EmployerBizId']]),
  };
  let i = 0; const seq = opts.seq || [0.3, 0.7, 0.5, 0.2, 0.9, 0.1];
  const ledgerRows = [
    slRow({ POPID: 'POP-00034', First: 'Avery', Last: 'Santana', Tier: 1, ClockMode: 'CIVIC', Status: 'Active', BirthYear: 1986, Neighborhood: 'Downtown', MaritalStatus: 'married', NumChildren: 0, HouseholdId: 'HH-0001-F001' }),
    slRow({ POPID: 'POP-00900', First: 'Rosa', Last: 'Nguyen', Tier: 4, ClockMode: 'ENGINE', Status: 'Active', BirthYear: 1990, Neighborhood: 'Temescal', MaritalStatus: 'single', NumChildren: 0 }),
  ].concat(opts.extraRows || []);
  const ctx = {
    ledger: { headers: SL.slice(), rows: ledgerRows, dirty: false },
    summary: { cycleId: CYCLE, neighborhoodState: { Temescal: { medianRent: 2200 }, Downtown: { medianRent: 2600 } }, storyHooks: [] },
    config: { cycleCount: CYCLE }, now: 'C' + CYCLE,
    rng: () => seq[(i++) % seq.length],
    ss: { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => { sheets[n] = mkSheet([]); return sheets[n]; } },
  };
  return { ctx, sheets };
}
const bell = [
  ['Marcus','Bell',40,'Temescal','Electrician','blue-collar','Bell','the Bells from Vallejo','','head'],
  ['Dana','Bell',38,'','Nurse','white-collar','Bell','','','spouse'],
  ['Theo','Bell',9,'','','','Bell','','','child'],
  ['Ivy','Bell',5,'','','','Bell','','','child'],
];
function runPlan(w) {
  const ivals = w.sheets.Intake.rows.map(r => r.slice());
  const nameIndex = E.buildNameIndex_(w.ctx.ledger.rows, col('First'), col('Last'), null, 0);
  return E.queueHouseholdIntake_(w.ctx, w.sheets.Intake, ivals, ivals[0], nameIndex, CYCLE);
}

console.log('\n1. the plan — grouping and boundaries:');
{
  const w = world(bell.concat([
    ['Solo','Person',30,'Temescal','Barista','service','','','',''],          // no Family → S320's
    ['Only','Child',12,'Temescal','','','Only','','','child'],               // group of one → S320's
  ]));
  const plan = runPlan(w);
  check('one household, four members; the lone rows are not claimed', plan.households === 1 && plan.members === 4 && Object.keys(plan.rows).sort().join() === '2,3,4,5', JSON.stringify(plan));
  const q = w.sheets.Advancement_Intake1;
  const qh = q.rows[0]; const qc = (n) => qh.indexOf(n);
  check('queue self-armed the household columns', E.HOUSEHOLD_QUEUE_COLS_.every(c => qc(c) >= 0), qh.join('|'));
  check('four queue rows, head first', q.appended.length === 4 && q.appended[0][qc('First')] === 'Marcus' && q.appended[0][qc('MatchType')] === '' && q.appended[0][qc('MatchName')] === '');
  check('spouse then children, each naming the head', q.appended[1][qc('MatchType')] === 'spouse' && q.appended[1][qc('MatchName')] === 'Marcus Bell' && q.appended[2][qc('MatchType')] === 'child' && q.appended[3][qc('MatchType')] === 'child');
  check('Tier 4 / ENGINE / HouseholdKey / the head\'s hood on every row', q.appended.every(r => r[qc('Tier')] === 4 && r[qc('ClockMode')] === 'ENGINE' && r[qc('HouseholdKey')] === 'bell' && r[qc('Neighborhood')] === 'Temescal'));
  check('children queue as student with BirthYear from Age', q.appended[2][qc('RoleType')] === 'student' && q.appended[2][qc('BirthYear')] === 2041 - 9 && q.appended[3][qc('BirthYear')] === 2041 - 5);
  check('adults keep their intake role; gender inferred', q.appended[1][qc('RoleType')] === 'Nurse' && q.appended[1][qc('Gender')] === 'female' && q.appended[0][qc('Gender')] === 'male');
  check('statuses say queued, per member', plan.statusWrites.length === 4 && plan.statusWrites.every(s => /queued household "Bell" \(4 members/.test(s[1])));
}
{
  const w = world([
    ['Marcus','Bell',40,'Temescal','','','Bell','','','head'],
    ['Rosa','Nguyen',35,'','','','Bell','','','spouse'],                     // already on the ledger
    ['Ken','Oda',44,'Temescal','','','Oda','','','head'],
    ['Mia','Oda',43,'','','','Oda','','','head'],                            // two heads
    ['Lee','Park',50,'Nowhere','','','Park','','','head'],
    ['Sun','Park',48,'','','','Park','','','spouse'],                        // hood without rent
    ['Ann','Rey',30,'Temescal','','','Rey','','','spouse'],
    ['Bo','Rey',31,'','','','Rey','','','spouse'],                           // no head
  ]);
  const plan = runPlan(w);
  const st = Object.fromEntries(plan.statusWrites.map(s => [s[0], s[1]]));
  check('every failing group is claimed and reviewed, nothing queued', plan.households === 0 && w.sheets.Advancement_Intake1.appended.length === 0 && Object.keys(plan.rows).length === 8);
  check('existing citizen → the join door is not this door', /Rosa Nguyen is already on the ledger/.test(st[2]) && /review — household "Bell"/.test(st[3]));
  check('two heads → review', /two members are marked head/.test(st[4]));
  check('no canon rent → review', /no canon rent for hood "Nowhere"/.test(st[6]));
  check('no head → review', /no member is marked head/.test(st[8]));
}
{
  const w = world([['Marcus','Bell',40,'Temescal','','','Bell','','',''], ['Dana','Bell',38,'','','','Bell','','','']], { intakeHeader: INTAKE_H.slice(0, 9) });
  const plan = runPlan(w);
  check('Intake without a Relation column self-arms it, then reviews the unmarked rows', w.sheets.Intake.rows[0][9] === 'Relation' && plan.households === 0 && /has no Relation/.test(plan.statusWrites[0][1]));
}

console.log('\n2. the mint — through the populator, wired, one household:');
{
  const w = world(bell);
  runPlan(w);
  const before = w.ctx.ledger.rows.length;
  const res = E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE);
  const rows = w.ctx.ledger.rows, nu = rows.slice(before);
  const byName = {}; nu.forEach(r => { byName[r[col('First')]] = r; });
  const M = byName.Marcus, D = byName.Dana, T = byName.Theo, I = byName.Ivy;
  check('four new ledger rows, one household formed, queue cleared', nu.length === 4 && res.processed === 4 && res.householdsFormed === 1 && w.sheets.Advancement_Intake1.cleared.length === 4);
  check('POPIDs continue the ledger', M[col('POPID')] === 'POP-00901' && I[col('POPID')] === 'POP-00904');
  check('spouse both ways, both married', M[col('SpouseId')] === D[col('POPID')] && D[col('SpouseId')] === M[col('POPID')] && M[col('MaritalStatus')] === 'married' && D[col('MaritalStatus')] === 'married');
  const kids = JSON.stringify([T[col('POPID')], I[col('POPID')]]);
  check('children on both parents, counted — no phantom kids for the drip', M[col('ChildrenIds')] === kids && D[col('ChildrenIds')] === kids && M[col('NumChildren')] === 2 && D[col('NumChildren')] === 2);
  check('kids carry both parents', JSON.parse(T[col('ParentIds')]).sort().join() === [M[col('POPID')], D[col('POPID')]].sort().join() && JSON.parse(I[col('ParentIds')]).length === 2);
  check('kids are students, single, childless', T[col('RoleType')] === 'student' && T[col('CareerStage')] === 'student' && T[col('MaritalStatus')] === 'single' && T[col('NumChildren')] === 0);
  check('kids hold no employer and earn nothing; the adults were placed', T[col('EmployerBizId')] === '' && I[col('EmployerBizId')] === '' && !/Seeking work/.test(T[col('LifeHistory')]) && T[col('Income')] === '' && M[col('EmployerBizId')] !== undefined);
  check('one HouseholdId on all four, in the intake series', nu.every(r => r[col('HouseholdId')] === 'HH-0106-I001'));
  check('the ascent columns are filled (education, income, net worth, gender, tags)', M[col('EducationLevel')] && M[col('Income')] === 61000 && M[col('NetWorth')] !== '' && M[col('Gender')] === 'male' && D[col('Gender')] === 'female' && M[col('SkillTags')] !== '');
  const hh = w.sheets.Household_Ledger.appended;
  const hc = (n) => HH_H.indexOf(n);
  check('one Household_Ledger row: family of four, head, rent from the hood rule', hh.length === 1 && hh[0][hc('HouseholdType')] === 'family' && hh[0][hc('HeadOfHousehold')] === M[col('POPID')] && JSON.parse(hh[0][hc('Members')]).length === 4 && hh[0][hc('MonthlyRent')] === 2200 && hh[0][hc('HouseholdIncome')] === 122000);
  const fr = w.sheets.Family_Relationships.appended[0];
  check('register row: husband / wife / two children', fr && fr[1].indexOf('Marcus Bell') > 0 && fr[2].indexOf('Dana Bell') > 0 && fr[3] === 'married' && /Theo Bell/.test(fr[6]) && /Ivy Bell/.test(fr[7]) && fr[8] === '');
  const lifeAll = nu.map(r => r[col('LifeHistory')]).join('\n');
  check('no household line claims a lottery', /\(household intake\)/.test(lifeAll) && !/drip lottery/.test(lifeAll) && /\[Household\] A 4-person household begins in Temescal/.test(M[col('LifeHistory')]));
  const lh = w.sheets.LifeHistory_Log.appended;
  check('log: three Family arrivals + one Household line, none a lottery', lh.filter(r => r[3] === 'Family' && /Arrived with the household/.test(r[4])).length === 3 && lh.filter(r => r[3] === 'Household').length === 1 && !lh.some(r => /lottery/.test(r[4])));
  const hooks = w.ctx.summary.storyHooks;
  check('hooks: three FAMILY_REALIZED + one HOUSEHOLD_ARRIVED', hooks.filter(h => h.hookType === 'FAMILY_REALIZED').length === 3 && hooks.filter(h => h.hookType === 'HOUSEHOLD_ARRIVED').length === 1 && !hooks.some(h => /lottery/.test(h.text)));
  check('the head\'s hood on everyone', nu.every(r => r[col('Neighborhood')] === 'Temescal'));
}

console.log('\n2b. an operator Sex column wins over name inference:');
{
  const w = world([
    ['Jordan','Okafor',36,'Temescal','Teacher','white-collar','Okafor','','','head','female'],
    ['Sam','Okafor',37,'','Chef','service','Okafor','','','spouse','male'],
    ['Remy','Okafor',3,'','','','Okafor','','','child',''],
  ], { intakeHeader: INTAKE_H.concat(['Sex']) });
  runPlan(w);
  const q = w.sheets.Advancement_Intake1; const qh = q.rows[0]; const qc = (n) => qh.indexOf(n);
  check('Sex read from the tab; blank falls back to inference', q.appended[0][qc('Gender')] === 'female' && q.appended[1][qc('Gender')] === 'male' && q.appended[2][qc('Gender')] === '');
  const before = w.ctx.ledger.rows.length;
  E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE);
  const nu = w.ctx.ledger.rows.slice(before); const J = nu[0], Sm = nu[1];
  const fr = w.sheets.Family_Relationships.appended[0];
  check('a female head is the wife, her husband beside her, in the register', J[col('Gender')] === 'female' && Sm[col('Gender')] === 'male' && /Sam Okafor/.test(fr[1]) && /Jordan Okafor/.test(fr[2]));
}

console.log('\n3. the drip path is untouched, and collisions are refused:');
{
  const w = world([]);
  const adv = w.sheets.Advancement_Intake1;
  E.ensureHouseholdQueueSheet_(w.ctx.ss);
  const qh = adv.rows[0]; const qc = (n) => qh.indexOf(n);
  const drip = new Array(qh.length).fill(''); drip[qc('First')] = 'Sam'; drip[qc('Last')] = 'Santana'; drip[qc('Tier')] = 4; drip[qc('ClockMode')] = 'ENGINE'; drip[qc('BirthYear')] = 1988; drip[qc('Neighborhood')] = 'Downtown'; drip[qc('MatchPopId')] = 'POP-00034'; drip[qc('MatchType')] = 'spouse'; drip[qc('MaidenName')] = 'Lopez';
  adv.appendRow(drip);
  const coll = new Array(qh.length).fill(''); coll[qc('First')] = 'Rosa'; coll[qc('Last')] = 'Nguyen'; coll[qc('Tier')] = 4; coll[qc('HouseholdKey')] = 'nguyen'; coll[qc('BirthYear')] = 1990; coll[qc('Neighborhood')] = 'Temescal';
  adv.appendRow(coll);
  const before = w.ctx.ledger.rows.length;
  E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE);
  const rows = w.ctx.ledger.rows, sam = rows[before];
  check('drip spouse wired to the mayor with the lottery wording kept', rows.length === before + 1 && sam[col('SpouseId')] === 'POP-00034' && rows[0][col('SpouseId')] === sam[col('POPID')] && /\(drip lottery\)/.test(sam[col('LifeHistory')]) && sam[col('HouseholdId')] === 'HH-0001-F001');
  check('a household row naming an existing citizen is skipped, not bumped', rows[1][col('Tier')] === 4 && rows[1][col('HouseholdId')] === '' && logs.some(m => /household row "Rosa Nguyen" collides/.test(m)));
}

console.log('\n4. Task 6 — Advancement_Intake handles solely promotion:');
check('processIntakeRows_ is gone', !/function processIntakeRows_/.test(R('phase05-citizens/processAdvancementIntake.js')));
check('processIntake_ hands the household door its rows and skips them', /queueHouseholdIntake_\(ctx, intake, intakeVals, intakeHeader, nameIndex, cycle\)/.test(R('phase01-config/godWorldEngine2.js')) && /if \(hhPlan\.rows\[r \+ 1\]\) continue;/.test(R('phase01-config/godWorldEngine2.js')));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
