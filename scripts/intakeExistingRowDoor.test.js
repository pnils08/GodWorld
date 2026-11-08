'use strict';
// engine.338 Task 2c — THE INTAKE DOOR, WHOLE. An Advancement_Intake1 row for an EXISTING citizen can now move the three
// cells it never wrote: EmployerBizId, ClockMode, EconomicProfileKey (the key follows the role through the catalog).
// Proves: blank keeps every cell; each cell moves when named; the clock is the row's own cell (a blank clock keeps GAME);
// a GAME re-home sets no key; a tracked re-home grows the business's Employee_Count by one and signals the ripple (not
// for GAME); Income re-prices on employer / key, not role alone; a re-run of the same row changes nothing; a bad clock or
// an unknown business refuses the whole queue before any row is touched; the Advancement line names every cell that
// moved; OwnerOfBizId on an existing row is still refused. Run: node scripts/intakeExistingRowDoor.test.js
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

const intents = [], cellIntents = [], logs = [];
const FIELD = new Function('ECONOMIC_PARAMETERS', 'Logger',
  ['utilities/citizenDerivation.js', 'phase05-citizens/runCareerEngine.js', 'phase05-citizens/generationalWealthEngine.js', 'phase05-citizens/educationCareerEngine.js'].map(R).join('\n') +
  '\nreturn { roleFieldOf_, skillTagField_, sectorCategory_, setCurrentField_, catalogRoleKey_ };')(JSON.parse(R('data/economic_parameters.json')), { log() {} });
const PAY = { 'Accountant / CPA': 132000, 'Cybersecurity Analyst': 178000, 'Club Coach / Instructor': 140000 };
const sandbox = {
  ECONOMIC_PARAMETERS: JSON.parse(R('data/economic_parameters.json')),
  Logger: { log(m) { logs.push(String(m)); } },
  queueAppendIntent_: (ctx, tab, row) => intents.push({ tab, row }),
  queueCellIntent_: (ctx, tab, row, col, value, reason) => cellIntents.push({ tab, row, col, value, reason }),
  recordRipple_: () => {},
  inWorldStamp_: () => 'Y3C2',
  jobReferencePay_: (role) => (PAY[role] === undefined ? null : PAY[role]),
  buildIntakeSalaryPools_: () => ({}), // godWorldEngine2.js live; the role-change price path gates on it, then prices through the catalog
  payProfileFromRow_: () => null,
  estimateRent_: () => 1900,
  inferSexFromFirstName_: () => '',
  getCoreSimNeighborhoods_: () => ['Temescal'],
  resolveHoodOrChild_: (ctx, name) => ({ temescal: 'Temescal', downtown: 'Downtown', rockridge: 'Rockridge' }[String(name).trim().toLowerCase()] || null),
  setCurrentField_: FIELD.setCurrentField_, roleFieldOf_: FIELD.roleFieldOf_, skillTagField_: FIELD.skillTagField_, sectorCategory_: FIELD.sectorCategory_, catalogRoleKey_: FIELD.catalogRoleKey_,
  requireTab_: (ss, name) => ss.getSheetByName(name),
  nextPopIdLocked_: require('../utilities/popIdAllocator').nextPopIdLocked_,
};
const src = R('phase01-config/advanceSimulationCalendar.js') + '\n' + R('utilities/citizenDerivation.js') + '\n' + R('phase05-citizens/processAdvancementIntake.js');
const E = new Function(...Object.keys(sandbox), src + '\nreturn { processAdvancementRows_, readAdvBusinessBook_ };')(...Object.values(sandbox));

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); } }

function mkSheet(rows) {
  const s = { rows, appended: [], cleared: [] };
  s.getDataRange = () => ({ getValues: () => s.rows.map(r => r.slice()) });
  s.getLastColumn = () => (s.rows[0] || []).length;
  s.getLastRow = () => s.rows.length;
  s.appendRow = (r) => { s.rows.push(r.slice()); s.appended.push(r.slice()); };
  s.getRange = (r, c, nr, nc) => ({
    getValues: () => [s.rows[r - 1].slice(c - 1, c - 1 + (nc || 1))],
    setValue: (v) => { while (s.rows[r - 1].length < c) s.rows[r - 1].push(''); s.rows[r - 1][c - 1] = v; },
    clearContent: () => { for (let k = 0; k < (nr || 1); k++) { s.cleared.push(r + k); if (s.rows[r + k - 1]) s.rows[r + k - 1] = s.rows[r + k - 1].map(() => ''); } },
    setValues: (vals) => { for (let k = 0; k < vals.length; k++) { while (!s.rows[r + k - 1]) s.rows.push([]); for (let m = 0; m < vals[k].length; m++) { while (s.rows[r + k - 1].length < c + m) s.rows[r + k - 1].push(''); s.rows[r + k - 1][c + m - 1] = vals[k][m]; } } },
  });
  return s;
}
const SL = ['POPID','First','MaidenName','Last','OriginGame','UNI (y/n)','MED (y/n)','CIV (y/n)','ClockMode','Tier','RoleType','Status','BirthYear','OrginCity','LifeHistory','SpouseId','LastUpdated','TraitProfile','UsageCount','Neighborhood','HouseholdId','MaritalStatus','NumChildren','ParentIds','ChildrenIds','WealthLevel','Income','InheritanceReceived','NetWorth','SavingsRate','DebtLevel','EducationLevel','SchoolQuality','CareerStage','YearsInCareer','CareerMobility','LastPromotionCycle','DisplacementRisk','MigrationIntent','MigrationReason','MigrationDestination','MigratedCycle','ReturnedCycle','EconomicProfileKey','EmployerBizId','CitizenBio','Gender','DialState','SMPageId','MemoryRegisters','StatusStartCycle','HealthCause','LineageId','SkillTags','Famous'];
const col = (n) => SL.indexOf(n);
const slRow = (o) => { const r = SL.map(() => ''); Object.keys(o).forEach(k => { r[col(k)] = o[k]; }); return r; };
// the live tab's 22 columns (schemas/SCHEMA_HEADERS.md)
const ADV_H = ['First','Middle','Last','RoleType','Tier','ClockMode','CIV','MED','UNI','Notes','BirthYear','Neighborhood','MatchPopId','MatchType','MaidenName','','EmployerBizId','OwnerOfBizId','Gender','CitizenBio','MatchName','HouseholdKey'];
const BIZ_H = ['BIZ_ID','Name','Sector','Neighborhood','Employee_Count','Avg_Salary','Annual_Revenue','Growth_Rate','Key_Personnel'];
const CYCLE = 115;
const a = (n) => ADV_H.indexOf(n);
function advRow(o) { const r = ADV_H.map(() => ''); Object.keys(o).forEach(k => { r[a(k)] = o[k]; }); return r; }
function world(advRows, opts) {
  opts = opts || {};
  const sheets = {
    Advancement_Intake1: mkSheet([ADV_H.slice()].concat(advRows)),
    LifeHistory_Log: mkSheet([['Timestamp','POPID','Name','EventTag','EventText','Neighborhood','Cycle']]),
    Business_Ledger: mkSheet([BIZ_H.slice(),
      ['BIZ-00005', 'Oakland Athletics', 'Sports Franchise', 'Baylight District', 520, 3342924, 54078571, 6.55, ''],
      ['BIZ-00050', 'Bay Tribune', 'Media', 'Downtown', 12, 98000, 8000000, 2.1, ''],
      ['BIZ-00060', 'Temescal Books', 'Retail', 'Temescal', '', 48000, 400000, 1.0, ''],
      ['BIZ-00070', 'Ledger & Loom CPAs', 'Professional Services', 'Rockridge', 9, 120000, 2000000, 3.0, '']]),
    Generic_Citizens: mkSheet([['First','Last','Age','BirthYear','Neighborhood','Occupation','EmergenceCount','EmergedCycle','EmergenceContext','Status','Sex','EmployerBizId','FamilyOf','FamilyRole','MaidenName']]),
  };
  const ledgerRows = [
    // the row after the flip (engine.333/338 2a): Former player, ENGINE, Active, key blank, tier figure
    slRow({ POPID: 'POP-00001', First: 'Vinnie', Last: 'Keane', Tier: 1, ClockMode: 'ENGINE', Status: 'Active', BirthYear: 2003, Neighborhood: 'Rockridge', RoleType: "Former Designated Hitter, Oakland A's Legend", EmployerBizId: 'BIZ-00005', EconomicProfileKey: '', Income: 250000, SkillTags: 'athlete', CareerStage: 'established' }),
    // an ordinary ENGINE citizen with a catalog job and key
    slRow({ POPID: 'POP-00900', First: 'Rosa', Last: 'Nguyen', Tier: 3, ClockMode: 'ENGINE', Status: 'Active', BirthYear: 1990, Neighborhood: 'Temescal', RoleType: 'Junior Accountant', EmployerBizId: 'BIZ-00060', EconomicProfileKey: 'Accountant / CPA', Income: 75000, SkillTags: 'Professional', CareerStage: 'early' }),
    // a club staffer on the GAME clock
    slRow({ POPID: 'POP-00527', First: 'Mike', Last: 'Paulson', Tier: 1, ClockMode: 'GAME', Status: 'Active', BirthYear: 1985, Neighborhood: 'Jack London', RoleType: "General Manager, Oakland A's & The Oaks", EmployerBizId: 'BIZ-00005', EconomicProfileKey: 'SPORTS_OVERRIDE', Income: 2000000 }),
  ].concat(opts.extraRows || []);
  let i = 0; const seq = [0.3, 0.7, 0.5];
  const ctx = {
    ledger: { headers: SL.slice(), rows: ledgerRows, dirty: false },
    summary: { cycleId: CYCLE, neighborhoodState: {}, storyHooks: [], careerSignals: { businessDeltas: {} } },
    config: { cycleCount: CYCLE }, now: 'C' + CYCLE,
    rng: () => seq[(i++) % seq.length],
    ss: { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => { sheets[n] = mkSheet([]); return sheets[n]; } },
  };
  return { ctx, sheets };
}
const rowOf = (w, id) => w.ctx.ledger.rows.find(r => r[col('POPID')] === id);
const lineFor = (w, id) => w.sheets.LifeHistory_Log.rows.filter(r => r[1] === id).map(r => r[4]);
const snapshot = (w) => JSON.stringify(w.ctx.ledger.rows);
function run(w) { intents.length = 0; cellIntents.length = 0; logs.length = 0; return E.processAdvancementRows_(w.ctx, 'C' + CYCLE, CYCLE); }

// ── 1. the whole door: role + employer + clock on an existing ENGINE / Active / Tier-1 row (Acceptance 1)
{
  const w = world([advRow({ First: 'Vinnie', Last: 'Keane', RoleType: 'Cybersecurity Analyst', EmployerBizId: 'BIZ-00050', ClockMode: 'MEDIA', Notes: 'his words: the booth, not the bench' })]);
  run(w);
  const v = rowOf(w, 'POP-00001');
  check('RoleType moves', v[col('RoleType')] === 'Cybersecurity Analyst', v[col('RoleType')]);
  check('EmployerBizId moves to the named business', v[col('EmployerBizId')] === 'BIZ-00050', v[col('EmployerBizId')]);
  check('ClockMode moves to the row\'s own cell', v[col('ClockMode')] === 'MEDIA', v[col('ClockMode')]);
  check('EconomicProfileKey = the catalog key of the new title', v[col('EconomicProfileKey')] === 'Cybersecurity Analyst', v[col('EconomicProfileKey')]);
  check('SkillTags led by the new field', String(v[col('SkillTags')]).split('|')[0] === 'Tech & Innovation', v[col('SkillTags')]);
  check('Income re-priced to the catalog band (the tier figure ends)', v[col('Income')] === 178000, String(v[col('Income')]));
  check('Tier never lowered on an intake row', v[col('Tier')] === 1, String(v[col('Tier')]));
  const line = lineFor(w, 'POP-00001')[0] || '';
  check('one Advancement line names every cell that moved', /RoleType -> Cybersecurity Analyst; ClockMode ENGINE -> MEDIA; EmployerBizId BIZ-00005 -> BIZ-00050; EconomicProfileKey \(blank\) -> Cybersecurity Analyst; Income 250000 -> 178000\. his words/.test(line), line);
  check('the business grows by one in this pass (Employee_Count 12 -> 13, a Phase-10 intent)', cellIntents.length === 1 && cellIntents[0].tab === 'Business_Ledger' && cellIntents[0].row === 3 && cellIntents[0].col === BIZ_H.indexOf('Employee_Count') + 1 && cellIntents[0].value === 13, JSON.stringify(cellIntents));
  check('the Phase-6 ripple hears the hire', w.ctx.summary.careerSignals.businessDeltas['BIZ-00050'] && w.ctx.summary.careerSignals.businessDeltas['BIZ-00050'].gained === 1, JSON.stringify(w.ctx.summary.careerSignals.businessDeltas));
  check('the queue row is cleared, ledger dirty', w.sheets.Advancement_Intake1.cleared.length === 1 && w.ctx.ledger.dirty === true);
  // the same row again: idempotent
  const before = snapshot(w);
  w.sheets.Advancement_Intake1.appendRow(advRow({ First: 'Vinnie', Last: 'Keane', RoleType: 'Cybersecurity Analyst', EmployerBizId: 'BIZ-00050', ClockMode: 'MEDIA', Notes: 'again' }));
  run(w);
  const after = w.ctx.ledger.rows.map(r => r.slice()); after.forEach(r => { r[col('LastUpdated')] = ''; });
  const beforeRows = JSON.parse(before); beforeRows.forEach(r => { r[col('LastUpdated')] = ''; });
  check('a re-run of the same row changes no cell', JSON.stringify(after) === JSON.stringify(beforeRows));
  check('…and grows no headcount, signals nothing', cellIntents.length === 0 && w.ctx.summary.careerSignals.businessDeltas['BIZ-00050'].gained === 1);
  const line2 = lineFor(w, 'POP-00001')[1] || '';
  check('the re-run line names no moved cell', /^Intake at Tier 1\. again$/.test(line2), line2);
}

// ── 2. blank keeps: a role-only row leaves employer and clock as they were; the key follows the role
{
  const w = world([advRow({ First: 'Rosa', Last: 'Nguyen', RoleType: 'Accountant / CPA', Notes: 'promoted in place' })]);
  run(w);
  const r = rowOf(w, 'POP-00900');
  check('blank EmployerBizId keeps the cell', r[col('EmployerBizId')] === 'BIZ-00060');
  check('blank ClockMode keeps the cell (ENGINE)', r[col('ClockMode')] === 'ENGINE');
  check('key follows the new catalog title', r[col('EconomicProfileKey')] === 'Accountant / CPA');
  check('role change prices the role (the existing T5 path)', r[col('Income')] === 132000, String(r[col('Income')]));
  check('no headcount write when the employer did not move', cellIntents.length === 0);
}

// ── 3. a title with no catalog key clears the stale key — never priced as the job he left
{
  const w = world([advRow({ First: 'Rosa', Last: 'Nguyen', RoleType: 'Neighborhood Historian', Notes: '' })]);
  run(w);
  const r = rowOf(w, 'POP-00900');
  check('an off-catalog title leaves the key blank', r[col('EconomicProfileKey')] === '', r[col('EconomicProfileKey')]);
  check('Income untouched when nothing can price the title', r[col('Income')] === 75000, String(r[col('Income')]));
  check('the line says the key cleared', /EconomicProfileKey Accountant \/ CPA -> \(blank\)/.test(lineFor(w, 'POP-00900')[0]), lineFor(w, 'POP-00900')[0]);
}

// ── 4. a blank clock keeps GAME (agy F4.2: rawClockMode, never the mint's ENGINE default)
{
  const w = world([advRow({ First: 'Mike', Last: 'Paulson', RoleType: "General Manager, Oakland A's & The Oaks", Tier: 1, Notes: 'a mention' })]);
  run(w);
  const m = rowOf(w, 'POP-00527');
  check('a GAME row with a blank intake clock stays GAME', m[col('ClockMode')] === 'GAME', m[col('ClockMode')]);
  check('key untouched on a GAME row', m[col('EconomicProfileKey')] === 'SPORTS_OVERRIDE');
}

// ── 5. to GAME with the club: clock and employer move, no key, no ripple signal; the club still counts the hire
{
  const w = world([advRow({ First: 'Vinnie', Last: 'Keane', RoleType: 'Club Coach / Instructor', EmployerBizId: 'BIZ-00005', ClockMode: 'GAME', Notes: 'the cage' })]);
  const vBefore = rowOf(w, 'POP-00001')[col('EmployerBizId')];
  run(w);
  const v = rowOf(w, 'POP-00001');
  check('clock GAME', v[col('ClockMode')] === 'GAME');
  check('employer the club (already of record, so unchanged)', vBefore === 'BIZ-00005' && v[col('EmployerBizId')] === 'BIZ-00005');
  check('a row moving to GAME sets no key (the roster\'s word)', v[col('EconomicProfileKey')] === '', v[col('EconomicProfileKey')]);
  check('the role still prices through the catalog (C3: a job taken re-prices to its band)', v[col('Income')] === 140000, String(v[col('Income')]));
  check('no headcount write when the employer did not move', cellIntents.length === 0);
  // a different GAME-clock citizen joining the club from elsewhere: the count grows, the ripple hears nothing (a staffer is not a hire)
  const w2 = world([advRow({ First: 'Rosa', Last: 'Nguyen', RoleType: 'Club Coach / Instructor', EmployerBizId: 'BIZ-00005', ClockMode: 'GAME' })]);
  run(w2);
  check('a GAME re-home grows the club\'s count (520 -> 521) …', cellIntents.length === 1 && cellIntents[0].value === 521 && cellIntents[0].row === 2, JSON.stringify(cellIntents));
  check('… and sends no Phase-6 headcount signal', !w2.ctx.summary.careerSignals.businessDeltas['BIZ-00005']);
}

// ── 6. employer-only move re-prices the row's own role (agy F5); a blank-count business is never invented
{
  const w = world([advRow({ First: 'Rosa', Last: 'Nguyen', EmployerBizId: 'BIZ-00070', Notes: 'new firm, same desk' })]);
  run(w);
  const r = rowOf(w, 'POP-00900');
  check('employer moves; role kept', r[col('EmployerBizId')] === 'BIZ-00070' && r[col('RoleType')] === 'Junior Accountant');
  check('Income re-priced on the row\'s own role (Junior Accountant has no stub price → the salary pools / untouched)', r[col('Income')] === 75000 || typeof r[col('Income')] === 'number');
  check('Ledger & Loom grows 9 -> 10', cellIntents.length === 1 && cellIntents[0].value === 10 && cellIntents[0].row === 5, JSON.stringify(cellIntents));
  const w2 = world([advRow({ First: 'Vinnie', Last: 'Keane', EmployerBizId: 'BIZ-00060' })]);
  run(w2);
  check('a blank Employee_Count is never invented (no intent), the employer still moves', cellIntents.length === 0 && rowOf(w2, 'POP-00001')[col('EmployerBizId')] === 'BIZ-00060');
  check('…but the ripple still hears the hire', w2.ctx.summary.careerSignals.businessDeltas['BIZ-00060'].gained === 1);
  const w3 = world([advRow({ First: 'Vinnie', Last: 'Keane', EmployerBizId: 'self_employed' })]);
  run(w3);
  check('SELF_EMPLOYED folds to the sentinel, no headcount, no signal', rowOf(w3, 'POP-00001')[col('EmployerBizId')] === 'SELF_EMPLOYED' && cellIntents.length === 0 && !w3.ctx.summary.careerSignals.businessDeltas['SELF_EMPLOYED']);
}

// ── 7. refusals: a bad clock or an unknown business on an EXISTING row refuses the whole queue before any row is touched
{
  const good = advRow({ First: 'Rosa', Last: 'Nguyen', RoleType: 'Accountant / CPA' });
  const w = world([good, advRow({ First: 'Vinnie', Last: 'Keane', ClockMode: 'Booth' })]);
  const before = snapshot(w);
  let err = null; try { run(w); } catch (e) { err = e; }
  check('bad clock on an existing row: refused, naming the row', !!err && /"Vinnie Keane" carries ClockMode "Booth"/.test(err.message), err && err.message);
  check('…nothing processed ahead of it: ledger unchanged, nothing cleared, no log line', snapshot(w) === before && w.sheets.Advancement_Intake1.cleared.length === 0 && w.sheets.LifeHistory_Log.rows.length === 1);
  const w2 = world([good, advRow({ First: 'Vinnie', Last: 'Keane', EmployerBizId: 'BIZ-09999' })]);
  const before2 = snapshot(w2);
  err = null; try { run(w2); } catch (e) { err = e; }
  check('unknown business on an existing row: refused, naming the row and the id', !!err && /"Vinnie Keane" names EmployerBizId "BIZ-09999", which is not on Business_Ledger/.test(err.message), err && err.message);
  check('…ledger unchanged, nothing cleared', snapshot(w2) === before2 && w2.sheets.Advancement_Intake1.cleared.length === 0);
  const w3 = world([advRow({ First: 'Vinnie', Last: 'Keane', EmployerBizId: 'the A\'s' })]);
  err = null; try { run(w3); } catch (e) { err = e; }
  check('a word that is no BIZ- id and no sentinel is refused', !!err && /not a BIZ- id, SELF_EMPLOYED or UNTRACKED/.test(err.message), err && err.message);
  // OwnerOfBizId on an existing row stays the owner doors' — the row is skipped, not applied
  const w4 = world([advRow({ First: 'Vinnie', Last: 'Keane', RoleType: 'Owner', OwnerOfBizId: 'BIZ-00103' })]);
  run(w4);
  check('OwnerOfBizId on an existing row is skipped (ownership is the owner doors\')', rowOf(w4, 'POP-00001')[col('RoleType')] !== 'Owner' && w4.sheets.Advancement_Intake1.cleared.length === 1 && logs.some(m => /owner-door row "Vinnie Keane" collides/.test(m)));
}

// ── 8. the book
{
  const w = world([]);
  const book = E.readAdvBusinessBook_(w.ctx.ss);
  check('readAdvBusinessBook_: ids, sheet rows, stated counts (blank → null), count column', book.byId['BIZ-00005'].sheetRow === 2 && book.byId['BIZ-00005'].stated === 520 && book.byId['BIZ-00060'].stated === null && book.countCol === 4 && book.byId['BIZ-00050'].name === 'Bay Tribune');
  check('no Business_Ledger → null', E.readAdvBusinessBook_({ getSheetByName: () => null }) === null);
}

// ── 9. Task 2d: the post-sports pool is in the catalog — six exact titles, nine fields, EXISTING field categories (agy F1:
// a new `Sports` category would price and tag nothing), appended at the tail, each a key of its own through catalogRoleKey_
{
  const E9 = JSON.parse(R('data/economic_parameters.json'));
  const POOL = { 'Sports Broadcaster / Color Analyst': 'Creative & Arts', 'Sports Analyst (Front Office)': 'Professional', 'Club Coach / Instructor': 'Education', 'Scout': 'Professional', 'College Coach': 'Education', 'Youth Academy Director': 'Education' };
  const FIELDS9 = ['role', 'category', 'incomeRange', 'medianIncome', 'effectiveTaxRate', 'economicOutputCategory', 'housingBurdenPct', 'consumerProfile', 'notes'];
  const tail = E9.slice(-6).map(x => x.role);
  check('the six pool titles sit at the catalog tail, in the plan\'s order', JSON.stringify(tail) === JSON.stringify(Object.keys(POOL)), JSON.stringify(tail));
  Object.keys(POOL).forEach(title => {
    const e = E9.find(x => x.role === title);
    check('catalog entry: ' + title, !!e && e.category === POOL[title] && JSON.stringify(Object.keys(e)) === JSON.stringify(FIELDS9) && e.incomeRange[0] < e.medianIncome && e.medianIncome < e.incomeRange[1] && FIELD.skillTagField_(e.category) === e.category, e && JSON.stringify(e));
    check('…is its own key and field', FIELD.catalogRoleKey_(title.toLowerCase()) === title && FIELD.roleFieldOf_(title) === POOL[title]);
  });
  check('no `Sports` category anywhere in the catalog', !E9.some(x => x.category === 'Sports'));
  check('every title is unique', new Set(E9.map(x => x.role)).size === E9.length);
}

console.log(`intakeExistingRowDoor: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
