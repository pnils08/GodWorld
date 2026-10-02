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
// engine.278: the mint's employer pick and tag stamp read the real field resolvers
// (a stub returning null sent every adult down the no-field path)
const FIELD = new Function('ECONOMIC_PARAMETERS', 'Logger',
  ['utilities/citizenDerivation.js', 'phase05-citizens/runCareerEngine.js', 'phase05-citizens/generationalWealthEngine.js', 'phase05-citizens/educationCareerEngine.js'].map(R).join('\n') +
  '\nreturn { roleFieldOf_, skillTagField_, sectorCategory_, setCurrentField_ };')(JSON.parse(R('data/economic_parameters.json')), { log() {} });
const sandbox = {
  ECONOMIC_PARAMETERS: JSON.parse(R('data/economic_parameters.json')), // engine.199: live reads the Economic_Parameters tab
  Logger: { log(m) { logs.push(String(m)); } },
  queueAppendIntent_: (ctx, tab, row) => intents.push({ tab, row }),
  queueCellIntent_: () => {},
  recordRipple_: () => {},
  inWorldStamp_: () => 'Y3C2',
  jobReferencePay_: (role) => (role === 'student' ? null : 61000),
  estimateRent_: (hood) => (hood === 'Temescal' ? 2200 : 1900),
  inferSexFromFirstName_: (f) => ({ marcus: 'male', dana: 'female', theo: 'male', ivy: 'female', rosa: 'female' }[String(f).toLowerCase()] || ''),
  getCoreSimNeighborhoods_: () => ['Temescal'],
  // engine.148 P3: the door folds an authored hood to the map; off-map → null
  resolveHoodOrChild_: (ctx, name) => ({ temescal: 'Temescal', downtown: 'Downtown', 'old oakland': 'Downtown' }[String(name).trim().toLowerCase()] || null),
  setCurrentField_: FIELD.setCurrentField_, roleFieldOf_: FIELD.roleFieldOf_, skillTagField_: FIELD.skillTagField_, sectorCategory_: FIELD.sectorCategory_,
  requireTab_: (ss, name) => ss.getSheetByName(name), // engine.119 (utilities/utilityFunctions.js)
  nextPopIdLocked_: require('../utilities/popIdAllocator').nextPopIdLocked_, // engine.90: the real allocator
};
const src = R('phase01-config/advanceSimulationCalendar.js') + '\n' + R('utilities/citizenDerivation.js') + '\n' + R('phase05-citizens/processAdvancementIntake.js');
const E = new Function(...Object.keys(sandbox), src + '\nreturn { queueHouseholdIntake_, processAdvancementRows_, formIntakeHouseholds_, wireFamilyMatch_, ensureHouseholdQueueSheet_, HOUSEHOLD_QUEUE_COLS_, normalizeCitizenName_, buildNameIndex_, simYearFromCycle_ };')(...Object.values(sandbox));

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); } }

// ── mock sheets ──
function mkSheet(rows) {
  // writes: one entry per setValues call; reads: whole-tab reads; failWrites: an injected Sheets failure;
  // failAfterWrite: the write lands and the call still throws (a timeout that landed)
  const s = { rows, appended: [], cleared: [], setCells: [], writes: [], reads: 0, failWrites: false, failAfterWrite: false };
  s.getDataRange = () => ({ getValues: () => { s.reads++; return s.rows.map(r => r.slice()); } });
  s.getLastColumn = () => (s.rows[0] || []).length;
  s.getLastRow = () => s.rows.length;
  s.appendRow = (r) => { s.rows.push(r.slice()); s.appended.push(r.slice()); };
  s.getRange = (r, c, nr, nc) => ({
    getValues: () => [s.rows[r - 1].slice(c - 1, c - 1 + (nc || 1))],
    setValue: (v) => { while (s.rows[r - 1].length < c) s.rows[r - 1].push(''); s.rows[r - 1][c - 1] = v; s.setCells.push([r, c, v]); },
    clearContent: () => { for (let k = 0; k < (nr || 1); k++) { s.cleared.push(r + k); if (s.rows[r + k - 1]) s.rows[r + k - 1] = s.rows[r + k - 1].map(() => ''); } },
    setValues: (vals) => { if (s.failWrites) throw new Error('Service Spreadsheets failed (injected)'); s.writes.push({ row: r, rows: vals.length, width: vals[0].length }); for (let k = 0; k < vals.length; k++) { while (!s.rows[r + k - 1]) s.rows.push([]); for (let m = 0; m < vals[k].length; m++) { while (s.rows[r + k - 1].length < c + m) s.rows[r + k - 1].push(''); s.rows[r + k - 1][c + m - 1] = vals[k][m]; s.setCells.push([r + k, c + m, vals[k][m]]); } } if (s.failAfterWrite) throw new Error('Service timed out (injected, after the write landed)'); },
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
  check('children queue as student with BirthYear from Age', q.appended[2][qc('RoleType')] === 'student' && q.appended[2][qc('BirthYear')] === E.simYearFromCycle_(CYCLE) - 9 && q.appended[3][qc('BirthYear')] === E.simYearFromCycle_(CYCLE) - 5);
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
  const lh = w.sheets.LifeHistory_Log.rows.slice(1); // engine.279: the pass's lines land in one write, not appendRow
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

console.log('\n2c. a spouse the name pool does not know takes the opposite of a known head (live C109):');
{
  const w = world([
    ['Marcus','Vidal',41,'Temescal','Electrician','','Vidal','','','head'],
    ['Zoraida','Vidal',39,'','ER Nurse','','Vidal','','','spouse'],
  ]);
  runPlan(w);
  const q = w.sheets.Advancement_Intake1; const qh = q.rows[0]; const qc = (n) => qh.indexOf(n);
  check('known head male, unknown spouse female — no dice', q.appended[0][qc('Gender')] === 'male' && q.appended[1][qc('Gender')] === 'female');
  const before = w.ctx.ledger.rows.length;
  E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE);
  const nu = w.ctx.ledger.rows.slice(before);
  const fr = w.sheets.Family_Relationships.appended[0];
  check('he is the husband, she is the wife, in the register', nu[0][col('Gender')] === 'male' && nu[1][col('Gender')] === 'female' && /Marcus Vidal/.test(fr[1]) && /Zoraida Vidal/.test(fr[2]));
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

console.log('\n7. engine.148 P3 — the door refuses an off-map hood and folds a child area:');
{
  const w = world([]);
  const adv = w.sheets.Advancement_Intake1;
  E.ensureHouseholdQueueSheet_(w.ctx.ss);
  const qh = adv.rows[0]; const qc = (n) => qh.indexOf(n);
  const typo = new Array(qh.length).fill(''); typo[qc('First')] = 'Nadia'; typo[qc('Last')] = 'Okafor'; typo[qc('Tier')] = 4; typo[qc('ClockMode')] = 'ENGINE'; typo[qc('BirthYear')] = 1991; typo[qc('Neighborhood')] = 'Atlantis';
  adv.appendRow(typo);
  let err = null; try { E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE); } catch (e) { err = e; }
  check('a typo hood throws at the door, naming the row', !!err && /Advancement_Intake row for "Nadia Okafor" names neighborhood "Atlantis", which is not on Neighborhood_Map/.test(err.message), err && err.message);
  const w2 = world([]);
  const adv2 = w2.sheets.Advancement_Intake1;
  E.ensureHouseholdQueueSheet_(w2.ctx.ss);
  const q2 = adv2.rows[0]; const c2 = (n) => q2.indexOf(n);
  const kid = new Array(q2.length).fill(''); kid[c2('First')] = 'Nadia'; kid[c2('Last')] = 'Okafor'; kid[c2('Tier')] = 4; kid[c2('ClockMode')] = 'ENGINE'; kid[c2('BirthYear')] = 1991; kid[c2('Neighborhood')] = 'Old Oakland';
  adv2.appendRow(kid);
  const before2 = w2.ctx.ledger.rows.length;
  E.processAdvancementRows_(w2.ctx, 'C' + CYCLE, CYCLE);
  const minted = w2.ctx.ledger.rows[before2];
  check('a child-area hood folds to its parent on the minted row', w2.ctx.ledger.rows.length === before2 + 1 && minted[col('Neighborhood')] === 'Downtown', minted && minted[col('Neighborhood')]);
}

console.log('\n8. engine.279 — the pass logs once and reads Generic_Citizens once:');
{
  const GC_H = ['First','Last','Age','BirthYear','Neighborhood','Occupation','EmergenceCount','EmergedCycle','EmergenceContext','Status','Sex','EmployerBizId'];
  const gcRow = (f, l, status) => { const r = GC_H.map(() => ''); r[0] = f; r[1] = l; r[9] = status; return r; };
  // A household of four, two plain mints (one from Generic_Citizens), and an existing citizen, in one pass.
  const build = () => {
    const w = world(bell);
    runPlan(w);
    const adv = w.sheets.Advancement_Intake1, qh = adv.rows[0], qc = (n) => qh.indexOf(n);
    const plain = (f, l, by) => { const r = new Array(qh.length).fill(''); r[qc('First')] = f; r[qc('Last')] = l; r[qc('Tier')] = 4; r[qc('ClockMode')] = 'ENGINE'; r[qc('BirthYear')] = by; r[qc('Neighborhood')] = 'Temescal'; r[qc('Notes')] = 'note ' + f; return r; };
    adv.appendRow(plain('Nadia', 'Okafor', 1991));
    adv.appendRow(plain('Rosa', 'Nguyen', 1990));          // already on the ledger → an Advancement line
    adv.appendRow(plain('Jonah', 'Pike', 1988));
    const gc = w.sheets.Generic_Citizens;
    gc.rows.push(gcRow('Jonah', 'Pike', 'Emerged'));        // first hit, already Emerged
    gc.rows.push(gcRow('Nadia', 'Okafor', 'Active'));
    gc.rows.push(gcRow('Jonah', 'Pike', 'Active'));         // a second row of the same name
    return w;
  };
  const w = build();
  const log = w.sheets.LifeHistory_Log, gc = w.sheets.Generic_Citizens, adv = w.sheets.Advancement_Intake1;
  const res = E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE);
  const lines = log.rows.slice(1).map(r => r[3] + ' | ' + r[2] + ' | ' + String(r[4]).replace(/\s+/g, ' ').slice(0, 44));
  const want = [
    'Promotion | Marcus Bell | Added to Simulation_Ledger as Tier 4. Househ',
    'Promotion | Dana Bell | Added to Simulation_Ledger as Tier 4. ',
    'Family | Dana Bell | Arrived with the household — ',
    'Promotion | Theo Bell | Added to Simulation_Ledger as Tier 4. ',
    'Family | Theo Bell | Arrived with the household — ',
    'Promotion | Ivy Bell | Added to Simulation_Ledger as Tier 4. ',
    'Family | Ivy Bell | Arrived with the household — ',
    'Promotion | Nadia Okafor | Added to Simulation_Ledger as Tier 4. note N',
    'Advancement | Rosa Nguyen | Intake at Tier 4. note Rosa',
    'Promotion | Jonah Pike | Added to Simulation_Ledger as Tier 4. note J',
    'Household | Marcus Bell | 4-member household arrived through intake —',
  ];
  check('the lines land in the order the per-row appends wrote them', lines.length === want.length && lines.every((l, i) => l.indexOf(want[i]) === 0), '\n    ' + lines.join('\n    '));
  check('one write for the whole pass, at the tab\'s tail, seven wide, no appendRow', log.writes.length === 1 && log.writes[0].row === 2 && log.writes[0].rows === want.length && log.writes[0].width === 7 && log.appended.length === 0, JSON.stringify(log.writes));
  check('every line carries the timestamp and the Cycle as before', log.rows.slice(1).every(r => r[0] === 'C' + CYCLE && r[6] === CYCLE && r.length === 7));
  check('all seven queue rows processed and cleared after the log landed', res.processed === 7 && adv.cleared.length === 7);
  check('Generic_Citizens is read once for six mints', gc.reads === 1, 'reads ' + gc.reads);
  check('the first name hit is the row marked, as before — an already-Emerged first hit stays the one written', gc.setCells.filter(c => c[2] === 'Emerged').map(c => c[0]).join() === '3,2' && gc.rows[3][9] === 'Active', JSON.stringify(gc.setCells));

  // Nothing to log → no write.
  const quiet = world([]);
  E.ensureHouseholdQueueSheet_(quiet.ctx.ss);
  E.processAdvancementRows_(quiet.ctx, 'C' + CYCLE, CYCLE);
  check('a pass with nothing to log writes nothing to the log', quiet.sheets.LifeHistory_Log.writes.length === 0 && quiet.sheets.LifeHistory_Log.rows.length === 1);

  // The log write fails: that error is the pass's error, and the queue is left as it was.
  const f = build();
  f.sheets.LifeHistory_Log.failWrites = true;
  let ferr = null; try { E.processAdvancementRows_(f.ctx, 'C' + CYCLE, CYCLE); } catch (e) { ferr = e; }
  check('a failed log write throws its own error and clears no queue row', !!ferr && /injected/.test(ferr.message) && f.sheets.Advancement_Intake1.cleared.length === 0 && f.sheets.LifeHistory_Log.rows.length === 1, ferr && ferr.message);

  // The log write lands and the call still throws: the lines are there once, never written a second time.
  const t = build();
  t.sheets.LifeHistory_Log.failAfterWrite = true;
  let terr = null; try { E.processAdvancementRows_(t.ctx, 'C' + CYCLE, CYCLE); } catch (e) { terr = e; }
  check('a log write that landed and still threw is not written again', !!terr && /timed out/.test(terr.message) && t.sheets.LifeHistory_Log.writes.length === 1 && t.sheets.LifeHistory_Log.rows.length === 1 + 11 && t.sheets.Advancement_Intake1.cleared.length === 0, (terr && terr.message) + ' | writes ' + t.sheets.LifeHistory_Log.writes.length + ' rows ' + t.sheets.LifeHistory_Log.rows.length);

  // The body throws mid-pass (an off-map hood on the last row): the lines buffered before it still land, and the body's error is thrown.
  const badRow = (w) => { const adv = w.sheets.Advancement_Intake1, qh = adv.rows[0], qc = (n) => qh.indexOf(n); const r = new Array(qh.length).fill(''); r[qc('First')] = 'Lost'; r[qc('Last')] = 'Soul'; r[qc('Tier')] = 4; r[qc('ClockMode')] = 'ENGINE'; r[qc('BirthYear')] = 1990; r[qc('Neighborhood')] = 'Atlantis'; adv.appendRow(r); };
  const b = build(); badRow(b);
  let berr = null; try { E.processAdvancementRows_(b.ctx, 'C' + CYCLE, CYCLE); } catch (e) { berr = e; }
  const blog = b.sheets.LifeHistory_Log;
  check('a body throw still lands the lines buffered before it, in one write', !!berr && /Atlantis/.test(berr.message) && blog.writes.length === 1 && blog.rows.length === 1 + 10 && blog.rows[1][2] === 'Marcus Bell' && blog.rows[10][2] === 'Jonah Pike', (berr && berr.message) + ' | rows ' + blog.rows.length);
  check('…and no queue row was cleared', b.sheets.Advancement_Intake1.cleared.length === 0);

  // Both fail: the body's error is the one thrown.
  const d = build(); badRow(d);
  d.sheets.LifeHistory_Log.failWrites = true;
  let derr = null; try { E.processAdvancementRows_(d.ctx, 'C' + CYCLE, CYCLE); } catch (e) { derr = e; }
  check('body throw and log failure together: the body\'s error is thrown, not the write\'s', !!derr && /Atlantis/.test(derr.message) && !/injected/.test(derr.message), derr && derr.message);
}

console.log('\n9. engine.278 — the minted row carries the pick (field employer, sentinel, tag):');
{
  const w = world([]);
  w.sheets.Business_Ledger.rows.push(
    ['BIZ-00901', 'Northgate Construction', 'Construction', 'Temescal', 35, '', '', '', ''],
    ['BIZ-00902', 'City of Oakland', 'Municipal Government', 'City-wide', 900, '', '', '', ''],
    ['BIZ-00903', 'Corner Market', 'Retail', 'Temescal', 6, '', '', '', '']);
  E.ensureHouseholdQueueSheet_(w.ctx.ss);
  const adv = w.sheets.Advancement_Intake1, qh = adv.rows[0], qc = (n) => qh.indexOf(n);
  qh.push('EmployerBizId'); // the queue column live carries (the owner door ensures it there)
  const add = (first, role, extra) => { const r = new Array(qh.length).fill(''); r[qc('First')] = first; r[qc('Last')] = 'Pickett'; r[qc('RoleType')] = role; r[qc('Tier')] = 4; r[qc('ClockMode')] = 'ENGINE'; r[qc('BirthYear')] = 1990; r[qc('Neighborhood')] = 'Temescal'; Object.assign(r, extra || {}); adv.appendRow(r); };
  add('Pia', 'Plumber'); add('Tad', 'Taxi driver'); add('Cleo', 'Climate Adaptation Specialist');
  const carriedSE = {}; carriedSE[qc('EmployerBizId')] = 'SELF_EMPLOYED'; add('Sol', 'Plumber', carriedSE);
  add('Ret', 'Retired');
  const before = w.ctx.ledger.rows.length;
  E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE);
  const [pia, tad, cleo, sol, ret] = w.ctx.ledger.rows.slice(before);
  check('a retiree is minted with no employer and no seeking-work line', ret && ret[col('RoleType')] === 'Retired' && ret[col('EmployerBizId')] === '' && !/Seeking work/.test(ret[col('LifeHistory')]), ret && (ret[col('RoleType')] + '/' + ret[col('EmployerBizId')]));
  check('a Plumber is minted at the hood\'s construction employer, never City Hall or the shop', pia && pia[col('EmployerBizId')] === 'BIZ-00901', pia && pia[col('EmployerBizId')]);
  check('…tagged with the role\'s own field, not a bucket', pia && pia[col('SkillTags')] === FIELD.roleFieldOf_('Plumber') && pia[col('SkillTags')] !== 'Small Business', pia && pia[col('SkillTags')]);
  check('a Taxi driver is minted SELF_EMPLOYED, with no seeking-work line', tad && tad[col('EmployerBizId')] === 'SELF_EMPLOYED' && !/Seeking work/.test(tad[col('LifeHistory')]), tad && tad[col('EmployerBizId')]);
  check('a role with no field is minted UNTRACKED, untagged, with no seeking-work line', cleo && cleo[col('EmployerBizId')] === 'UNTRACKED' && cleo[col('SkillTags')] === '' && !/Seeking work/.test(cleo[col('LifeHistory')]), cleo && (cleo[col('EmployerBizId')] + '/' + cleo[col('SkillTags')]));
  check('an authored SELF_EMPLOYED on the queue row is kept', sol && sol[col('EmployerBizId')] === 'SELF_EMPLOYED', sol && sol[col('EmployerBizId')]);
  const sig = w.ctx.summary.careerSignals;
  check('a sentinel reserves no slot and sends no headcount signal', !sig || !sig.businessDeltas || (!sig.businessDeltas.SELF_EMPLOYED && !sig.businessDeltas.UNTRACKED));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
