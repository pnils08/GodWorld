/**
 * Education loop in isolation (education plan, S409) — earn a credential as a
 * life event. Proves the three physics and the two non-changes:
 *   1. minors' EducationLevel is derived from age each cycle (E1 analog)
 *   2. [Graduation] WRITES the credential — plural vocab only, never lowers
 *   3. the engine never emits singular `bachelor` / catch-all `graduate`
 *   4. career engines still have zero EducationLevel reads (E2/E3 untouched)
 *   5. runYouthEngine carries no 'Oakland Unified' / OUSD strings
 *
 * Run: node scripts/educationLoop.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const R = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

global.Logger = { log() {} };
// generationalWealthEngine global that updateMinorSchoolQuality_ reaches for
global.heritageRank_ = function () { return 0; };
global.safeRand_ = function (ctx) { return ctx.rng; };
// engine.148: the calendar file carries simYearOf_ / simYearFromCycle_ — loaded first, as the flat Apps Script namespace does
const CAL = R('phase01-config/advanceSimulationCalendar.js') + '\n';

const E = new Function(CAL + R('phase05-citizens/educationCareerEngine.js') + '\nreturn {' +
  'processEducationCareer_, deriveEducationLevels_, deriveMinorEducationStage_, schoolStageForAge_,' +
  'canonicalEducationWrite_, eduRank_, updateCareerProgression_, EDUCATION_LEVELS,' +
  'settleField_, settleYouthCounts_, settleFieldClause_, settleAdulthood_, buildSettleBizPool_,' +
  'SETTLE_FIELDS, SETTLE_ROLES_BY_FIELD, SETTLE_FIELD_ECON_KEYS, SETTLE_ECON_KEYS, skillTagField_, tagsMatchCategory_, setCurrentField_, roleFieldOf_, credentialRank_ };')();
const G = new Function(CAL + R('phase04-events/generationalEventsEngine.js') + '\nreturn {' +
  'checkGraduation_, graduationCredential_, GRADUATION_LADDER_, graduationTradeTrack_, GRADUATION_TRADE_FIELDS_ };')();

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

// ── fixture: cycle 105 → simYear 2042 (2040 + floor(105/52)), matching the engine
const CYCLE = 105, SIM_YEAR = 2042;
const H = ['POPID', 'First', 'Last', 'BirthYear', 'Status', 'ClockMode', 'EconomicProfileKey',
  'EducationLevel', 'SchoolQuality', 'CareerStage', 'YearsInCareer', 'LifeHistory', 'LastUpdated',
  'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'LastPromotionCycle', 'HouseholdId', 'Neighborhood', 'Income', 'RoleType'];
const col = (n) => H.indexOf(n);
function row(o) { const r = H.map(() => ''); Object.keys(o).forEach(k => { r[col(k)] = o[k]; }); return r; }
function ledger(rows) { return { headers: H.slice(), rows: rows.map(r => r.slice()), dirty: false }; }
function ctxOf(rows, rng) {
  return { ledger: ledger(rows), summary: { cycleId: CYCLE }, config: { cycleCount: CYCLE }, rng: rng || (() => 0.5),
    ss: { getSheetByName() { return null; } }, now: 'now' };
}
const kid = (age, edu, extra) => row(Object.assign({ POPID: 'POP-' + age, First: 'K', Last: String(age),
  BirthYear: SIM_YEAR - age, Status: 'Active', ClockMode: 'ENGINE', EducationLevel: edu, HouseholdId: 'HH-1', Neighborhood: 'Temescal' }, extra || {}));

console.log('1. school stage from age:');
check('age 3 -> Pre-K', E.schoolStageForAge_(3) === 'Pre-K');
check('age 7 -> Elementary', E.schoolStageForAge_(7) === 'Elementary');
check('age 12 -> Middle School', E.schoolStageForAge_(12) === 'Middle School');
check('age 16 -> High School', E.schoolStageForAge_(16) === 'High School');
check('age 18 -> null (credential territory)', E.schoolStageForAge_(18) === null);
check('age 40 -> null', E.schoolStageForAge_(40) === null);

console.log('\n2. deriveMinorEducationStage_ — minors restamp, adults untouched:');
{
  const rows = [
    kid(7, 'Pre-K'),                 // heals forward
    kid(12, ''),                     // blank minor
    kid(16, 'bachelors'),            // bad mint — restamped to High School
    kid(16, 'High School'),          // already right — untouched
    kid(30, 'bachelors'),            // adult — untouched
    kid(18, 'hs-diploma'),           // 18 — settlement's, untouched
    kid(9, 'Pre-K', { ClockMode: 'GAME' }),        // sports layer — skipped
    kid(9, 'Pre-K', { ClockMode: 'CIVIC' }),       // outside E1 scope — skipped
    kid(9, 'Pre-K', { Status: 'Deceased' }),       // skipped
  ];
  const ctx = ctxOf(rows);
  const res = E.deriveMinorEducationStage_(ctx, CYCLE);
  const out = ctx.ledger.rows.map(r => r[col('EducationLevel')]);
  check('7yo Pre-K -> Elementary', out[0] === 'Elementary', out[0]);
  check('12yo blank -> Middle School', out[1] === 'Middle School', out[1]);
  check('16yo bachelors (bad mint) -> High School', out[2] === 'High School', out[2]);
  check('16yo High School untouched', out[3] === 'High School');
  check('30yo bachelors untouched', out[4] === 'bachelors');
  check('18yo hs-diploma untouched (settlement owns 18)', out[5] === 'hs-diploma');
  check('GAME / CIVIC / deceased rows untouched', out[6] === 'Pre-K' && out[7] === 'Pre-K' && out[8] === 'Pre-K');
  check('counts: 4 minors in scope, 3 restamped', res.minors === 4 && res.restamped === 3, JSON.stringify(res));
  check('ledger flagged dirty', ctx.ledger.dirty === true);
}

console.log('\n3. deriveEducationLevels_ fill vocab (plural only):');
{
  const rows = [
    kid(30, '', { 'MED (y/n)': 'yes' }),
    kid(30, '', { 'UNI (y/n)': 'y' }),
    kid(30, '', { 'CIV (y/n)': 'yes' }),
    kid(30, '', { LifeHistory: 'Y1C3 — [Graduation] walked the stage' }),
    kid(10, ''),
    kid(30, ''),                       // adult roll at rng 0.5 -> hs-diploma
    kid(30, 'bachelor'),               // set cell: fill-only, never re-rolled
  ];
  const ctx = ctxOf(rows, () => 0.5);
  E.deriveEducationLevels_(ctx, ctx.rng);
  const out = ctx.ledger.rows.map(r => r[col('EducationLevel')]);
  check('MED -> doctorate', out[0] === 'doctorate', out[0]);
  check('UNI -> bachelors (plural)', out[1] === 'bachelors', out[1]);
  check('CIV -> some-college', out[2] === 'some-college');
  check('[Graduation] in history -> bachelors', out[3] === 'bachelors');
  check('blank minor -> school stage, not "none"', out[4] === 'Elementary', out[4]);
  check('adult roll -> hs-diploma', out[5] === 'hs-diploma');
  check('set cell left alone (fill-only)', out[6] === 'bachelor');
  const vals = Object.values(E.EDUCATION_LEVELS);
  check('EDUCATION_LEVELS carries no singular/catch-all token', !vals.includes('bachelor') && !vals.includes('graduate') && !vals.includes('none'));
  check('canonicalEducationWrite_ maps legacy tokens', E.canonicalEducationWrite_('bachelor') === 'bachelors' && E.canonicalEducationWrite_('graduate') === 'masters');
  check('canonicalEducationWrite_ passes live tokens through', E.canonicalEducationWrite_('trade-cert') === 'trade-cert' && E.canonicalEducationWrite_('doctorate') === 'doctorate');
  check('eduRank_ unchanged: bachelors=1, bachelor=1, masters=2, hs-diploma=0', E.eduRank_('bachelors') === 1 && E.eduRank_('bachelor') === 1 && E.eduRank_('masters') === 2 && E.eduRank_('hs-diploma') === 0);
}

console.log('\n4. graduation ladder (pure) — never lowers, plural only:');
{
  const gc = G.graduationCredential_;
  check('hs-dropout -> hs-diploma', gc('hs-dropout', '') === 'hs-diploma');
  check('blank -> hs-diploma', gc('', '') === 'hs-diploma');
  check('child-stage leftover -> hs-diploma', gc('High School', 9) === 'hs-diploma');
  check('hs-diploma + SQ 7 -> associates', gc('hs-diploma', 7) === 'associates');
  check('hs-diploma + SQ 8 -> bachelors', gc('hs-diploma', 8) === 'bachelors');
  check('hs-diploma + blank SQ -> associates', gc('hs-diploma', '') === 'associates');
  check('associates / some-college / trade-cert -> bachelors', gc('associates') === 'bachelors' && gc('some-college') === 'bachelors' && gc('trade-cert') === 'bachelors');
  check('bachelors -> masters (legacy bachelor too)', gc('bachelors') === 'masters' && gc('bachelor') === 'masters');
  check('masters / doctorate -> null (cell stays)', gc('masters') === null && gc('doctorate') === null);
  check('unknown token -> null (never overwrite what we cannot read)', gc('weird-thing') === null);
  // engine.149 (S412): the graduation follows the field — trade-cert on the trades track, whatever the school quality
  check('hs-diploma + current field Construction & Baylight -> trade-cert (SQ 9 too)', gc('hs-diploma', 9, 'Construction & Baylight') === 'trade-cert' && gc('hs-diploma', 5, 'Construction & Baylight|Healthcare') === 'trade-cert');
  check('hs-diploma + Port & Labor / Transit & Infrastructure / legacy Trades -> trade-cert', gc('hs-diploma', 8, 'Port & Labor') === 'trade-cert' && gc('hs-diploma', 8, 'Transit & Infrastructure') === 'trade-cert' && gc('hs-diploma', 8, 'Trades') === 'trade-cert');
  check('the TRAINED field (token 2) does not aim it — only the current one', gc('hs-diploma', 8, 'Healthcare|Trades') === 'bachelors');
  check('non-trade field / athlete / blank tags -> the school-quality draw as before', gc('hs-diploma', 8, 'Healthcare') === 'bachelors' && gc('hs-diploma', 7, 'athlete') === 'associates' && gc('hs-diploma', 7, '') === 'associates');
  check('a trade-cert holder still climbs to bachelors on the ladder', gc('trade-cert', 5, 'Trades') === 'bachelors');
  check('trade-cert ranks as a peer of associates for E2/E3 (builder ruling S412)', E.credentialRank_('trade-cert') === 3 && E.credentialRank_('associates') === 3 && E.credentialRank_('some-college') === 2 && E.credentialRank_('bachelors') === 4 && E.credentialRank_('hs-diploma') === 1);
  const all = Object.values(G.GRADUATION_LADDER_).filter(Boolean).concat(['associates', 'bachelors']);
  check('ladder emits no singular/catch-all', !all.includes('bachelor') && !all.includes('graduate'));
  // never lowers: rank after >= rank before for every input
  const inputs = Object.keys(G.GRADUATION_LADDER_).concat(['hs-diploma']);
  check('rank never drops across every ladder input', inputs.every(k => { const n = gc(k, 8); return n === null || E.eduRank_(n) >= E.eduRank_(k); }));
}

console.log('\n5. checkGraduation_ dice + once-per-life:');
{
  const cal = { season: 'spring', month: 5 };
  const hit = G.checkGraduation_({ rng: () => 0 }, 'POP-1', 24, 'Y1C1 — [Adulthood] x', 3, cal);
  check('dice hit at 24 with no marker -> Graduation milestone', hit && hit.tag === 'Graduation', JSON.stringify(hit));
  const miss = G.checkGraduation_({ rng: () => 0.999 }, 'POP-1', 24, '', 3, cal);
  check('dice miss -> null, cell untouched', miss === null);
  const again = G.checkGraduation_({ rng: () => 0 }, 'POP-1', 24, 'Y1C1 — [Graduation] done', 3, cal);
  check('second call on a life with [Graduation] -> null', again === null);
  const young = G.checkGraduation_({ rng: () => 0 }, 'POP-1', 21, '', 3, cal);
  check('outside 22–28 window -> null', young === null);
}

console.log('\n6. processEducationCareer_ end-to-end on a stub ctx (acceptance 1):');
{
  const rows = [kid(16, 'bachelors'), kid(12, ''), kid(30, 'bachelors', { CareerStage: 'mid-career', YearsInCareer: 8 })];
  const ctx = ctxOf(rows, () => 0.5);
  let res = null, err = null;
  try { res = E.processEducationCareer_(ctx); } catch (e) { err = e; }
  check('orchestrator runs on the stub', !err, err && err.message);
  const out = ctx.ledger.rows.map(r => r[col('EducationLevel')]);
  check('16yo comes out High School', out[0] === 'High School', out[0]);
  check('12yo comes out Middle School', out[1] === 'Middle School', out[1]);
  check('30yo bachelors unchanged', out[2] === 'bachelors', out[2]);
  // the blank 12yo was stamped by the fill step (educationUpdated 1), so the stage step restamps only the 16yo
  check('results carry the minor-stage counters (2 minors, 1 restamp after fill)', res && res.minors === 2 && res.minorStagesRestamped === 1 && res.educationUpdated === 1, JSON.stringify(res));
}

console.log('\n7. career path untouched (grep-as-test):');
{
  const career = R('phase05-citizens/runCareerEngine.js');
  const fn = (src, name) => { const i = src.indexOf('function ' + name); const j = src.indexOf('\nfunction ', i + 1); return src.slice(i, j < 0 ? undefined : j); };
  // engine.144 (S410): applyEmployerSuccess_ reads the credential ONLY through credentialRankOf_ (a secondary sort key), never as a gate
  const emp = fn(career, 'applyEmployerSuccess_');
  check('applyEmployerSuccess_ reads EducationLevel only via credentialRankOf_', (emp.match(/EducationLevel/g) || []).length <= 1 && /credentialRankOf_/.test(emp) && !/EducationLevel[^\n]*(>=|<=|===|<|>)\s*['"]/.test(emp));
  check('matchUnemployedToOpenings_ reads no EducationLevel', !/EducationLevel/.test(fn(career, 'matchUnemployedToOpenings_')));
  const edu = R('phase05-citizens/educationCareerEngine.js');
  check('updateCareerProgression_ reads no EducationLevel', !/idx\('EducationLevel'\)|iEducation\b/.test(fn(edu, 'updateCareerProgression_')));
  check('no "affects career advancement" claim left in the header', !/affects career advancement/.test(edu));
  const youth = R('phase05-citizens/runYouthEngine.js');
  check('runYouthEngine carries no Oakland Unified / OUSD', !/Oakland Unified|OUSD/.test(youth));
}

console.log('\n8. engine.144 loops 1+2 — field-first settlement (S411):');
{
  const F = E.SETTLE_FIELDS, T = E.SETTLE_ROLES_BY_FIELD;
  check('12 fields, all with a rich/solid/rough role', F.length === 12 && F.every(f => T[f] && T[f].rich && T[f].solid && T[f].rough));
  check('no Trades/The Vulnerable/2041-Specific in the field vocabulary', !F.includes('Trades') && !F.includes('The Vulnerable') && !F.includes('2041-Specific'));
  const catalog = JSON.parse(R('data/economic_parameters.json')).map(x => x.role);
  const keys = Object.assign({}, E.SETTLE_ECON_KEYS, E.SETTLE_FIELD_ECON_KEYS);
  check('every econ key names a catalog role', Object.keys(keys).every(k => catalog.includes(keys[k])), Object.keys(keys).filter(k => !catalog.includes(keys[k])).join(','));

  const one = (r) => { let n = 0; const rng = () => { n++; return r; }; rng.count = () => n; return rng; };
  // own tag wins outright
  let rng = one(0.99);
  let pk = E.settleField_('Healthcare', [{ name: 'Ada', tags: 'Food & Culture' }], { 'Small Business': 5 }, {}, {}, rng);
  check('existing canonical tag IS the field (cause own)', pk.field === 'Healthcare' && pk.cause === 'own' && rng.count() === 1);
  check('own-tag clause is empty', E.settleFieldClause_(pk) === '');
  // non-field own tag ignored; parent decides
  pk = E.settleField_('athlete', [{ name: 'Ada', tags: 'Healthcare' }], {}, {}, {}, one(0.5));
  check('parent field with no other source → parent cause, named', pk.field === 'Healthcare' && pk.cause === 'parent' && pk.parentName === 'Ada');
  check('parent clause names the parent and the field', E.settleFieldClause_(pk) === ' (following Ada into Healthcare)');
  // pipe-joined + non-field parent tags filtered
  pk = E.settleField_('', [{ name: 'Bo', tags: 'athlete|Creative & Arts' }, { name: 'Cy', tags: 'coach' }], {}, {}, {}, one(0.1));
  check('pipe-joined parent tag: only the field half counts (sports tags weigh nothing)', pk.field === 'Creative & Arts' && pk.cause === 'parent' && pk.parentName === 'Bo');
  // engine.145: aliased catalog tags are fields
  check('skillTagField_: the twelve pass through, the three aliases resolve, sports tags do not', E.skillTagField_('Healthcare') === 'Healthcare' && E.skillTagField_('Trades') === 'Construction & Baylight' && E.skillTagField_('The Vulnerable') === 'Government & Civic' && E.skillTagField_('2041-Specific') === 'Tech & Innovation' && E.skillTagField_('athlete') === null && E.skillTagField_('') === null);
  check('tagsMatchCategory_: pipe-joined and aliased', E.tagsMatchCategory_('The Vulnerable|Healthcare', 'Healthcare') && E.tagsMatchCategory_('Trades', 'Construction & Baylight') && !E.tagsMatchCategory_('Trades', 'Trades') && !E.tagsMatchCategory_('athlete', 'Small Business'));
  pk = E.settleField_('Trades', [], {}, {}, {}, one(0.5));
  check('own Trades tag settles as Construction & Baylight (cause own)', pk.field === 'Construction & Baylight' && pk.cause === 'own');
  pk = E.settleField_('', [{ name: 'Lu', tags: 'Trades' }], {}, {}, {}, one(0.5));
  check('a Trades parent now weighs: kid follows Lu into Construction & Baylight', pk.field === 'Construction & Baylight' && pk.cause === 'parent' && E.settleFieldClause_(pk) === ' (following Lu into Construction & Baylight)');
  // engine.146: two truths — setCurrentField_ / roleFieldOf_
  global.ECONOMIC_PARAMETERS = JSON.parse(R('data/economic_parameters.json'));
  check('setCurrentField_: blank → the new field', E.setCurrentField_('', 'Healthcare') === 'Healthcare');
  check('setCurrentField_: role change writes current|trained', E.setCurrentField_('Education', 'Trades') === 'Trades|Education');
  check('setCurrentField_: same field again → unchanged', E.setCurrentField_('Trades|Education', 'Trades') === 'Trades|Education' && E.setCurrentField_('Healthcare', 'Healthcare') === 'Healthcare');
  check('setCurrentField_: a second change keeps the ORIGINAL trained field', E.setCurrentField_('Trades|Education', 'Healthcare') === 'Healthcare|Education');
  check('setCurrentField_: aliased equality (Trades ≡ Construction & Baylight) is not a change', E.setCurrentField_('Trades', 'Construction & Baylight') === 'Trades');
  check('setCurrentField_: non-field tokens ride along; a non-field new value is ignored', E.setCurrentField_('athlete', 'Healthcare') === 'Healthcare|athlete' && E.setCurrentField_('Healthcare', 'athlete') === 'Healthcare');
  check('roleFieldOf_: catalog role → its label; unknown → null', E.roleFieldOf_('Plumber') === 'Trades' && E.roleFieldOf_('ER Nurse') === 'Healthcare' && E.roleFieldOf_('Waterfront Resident') === null);
  const eng2 = R('phase01-config/godWorldEngine2.js'), adv = R('phase05-citizens/processAdvancementIntake.js');
  check('both role-change intake sites write the current field', /setCurrentField_\(oldTags146, roleFieldOf_\(givenRole\)\)/.test(eng2) && /setCurrentField_\(ledgerRows\[existingRow\]\[lTags146\], roleFieldOf_\(roleType\)\)/.test(adv));
  delete global.ECONOMIC_PARAMETERS;
  // no source at all → null, legacy path
  pk = E.settleField_('', [{ name: 'Cy', tags: 'athlete' }], {}, {}, {}, one(0.3));
  check('no source → field null', pk.field === null && pk.cause === null);
  // hood normalized: 6 restaurants (3 total) vs one Healthcare parent (3) → 50/50
  const hood6 = { 'Food & Culture': 6 };
  const par = [{ name: 'Ada', tags: 'Healthcare' }];
  const a = E.settleField_('', par, hood6, {}, {}, one(0.49)), b = E.settleField_('', par, hood6, {}, {}, one(0.51));
  check('hood weight normalized to one source: parent wins below .5, hood above', a.field === 'Healthcare' && a.cause === 'parent' && b.field === 'Food & Culture' && b.cause === 'hood');
  check('hood clause', E.settleFieldClause_(b) === " (the neighborhood's trade: Food & Culture)");
  // city-wide counts half, for any hood
  pk = E.settleField_('', [], {}, { 'Government & Civic': 6, 'Education': 2 }, {}, one(0.1));
  check('city-wide businesses reach a hood with none of its own (half weight)', pk.field === 'Education' && pk.cause === 'hood');
  pk = E.settleField_('', [], {}, { 'Government & Civic': 6, 'Education': 2 }, {}, one(0.9));
  check('…and the bigger city-wide category takes the larger slice', pk.field === 'Government & Civic' && pk.cause === 'hood');
  // school years: capped at 3, Team → Education
  const yc = E.settleYouthCounts_('Y1C1 — [Education] read (good)\nY1C2 — [Team] joined (ok)\nY1C3 — [Sports] adult leak\nY1C4 — [Education] x (y)\nY1C5 — [Education] y\nY1C6 — [Education] z');
  check('youth counts read only the five youth dial tags', yc.Education === 4 && yc.Team === 1 && yc.Sports === undefined);
  pk = E.settleField_('', [], {}, {}, yc, one(0.2));
  check('school years alone → Education, cause school', pk.field === 'Education' && pk.cause === 'school');
  check('school clause', E.settleFieldClause_(pk) === ' (the field their school years pointed to: Education)');
  const c1 = E.settleField_('', par, {}, {}, yc, one(0.49)), c2 = E.settleField_('', par, {}, {}, yc, one(0.51));
  check('school years capped at one source weight (3): 5 youth lines tie a parent 50/50', c1.field === 'Healthcare' && c2.field === 'Education');
  // determinism + single draw
  const d1 = E.settleField_('', par, hood6, { Education: 2 }, yc, one(0.37)), d2 = E.settleField_('', par, hood6, { Education: 2 }, yc, one(0.37));
  const rc = one(0.37); E.settleField_('', par, hood6, { Education: 2 }, yc, rc);
  check('deterministic, exactly one rng draw', d1.field === d2.field && d1.cause === d2.cause && rc.count() === 1);

  // end-to-end: settleAdulthood_ on a stub ctx with a parent, a hood, and Business_Ledger
  const H2 = H.concat(['ParentIds', 'SkillTags', 'EmployerBizId', 'DebtLevel', 'NetWorth']);
  const col2 = (n) => H2.indexOf(n);
  const row2 = (o) => { const r = H2.map(() => ''); Object.keys(o).forEach(k => { r[col2(k)] = o[k]; }); return r; };
  const sheets = {
    Household_Ledger: [['HouseholdId', 'HouseholdIncome', 'Status'], ['HH-1', 150000, 'active']],
    Business_Ledger: [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count'],
      ['BIZ-1', 'Temescal Clinic', 'Healthcare', 'Temescal', 5],
      ['BIZ-2', 'Taqueria', 'Restaurant', 'Temescal', 5],
      ['BIZ-3', 'City Hall', 'Municipal Government', 'City-wide', 50]]
  };
  const mkCtx = (rows, seq) => {
    let i = 0;
    return { ledger: { headers: H2.slice(), rows: rows.map(r => r.slice()), dirty: false }, summary: { cycleId: CYCLE }, config: { cycleCount: CYCLE },
      rng: () => seq[(i++) % seq.length], now: 'now',
      ss: { getSheetByName(n) { return sheets[n] ? { getDataRange() { return { getValues() { return sheets[n].map(r => r.slice()); } }; } } : null; } } };
  };
  global.sectorCategory_ = (sec, strict) => (/health/i.test(sec) ? 'Healthcare' : /restaurant/i.test(sec) ? 'Food & Culture' : /government/i.test(sec) ? 'Government & Civic' : (strict ? null : 'Small Business'));
  global.deriveDebtLevel_ = () => 'low'; global.deriveNetWorth_ = () => 1000;
  const parent = row2({ POPID: 'POP-P', First: 'Ada', Last: 'Ng', BirthYear: 1990, Status: 'active', ClockMode: 'ENGINE', EducationLevel: 'masters', SkillTags: 'Healthcare', EconomicProfileKey: 'ER Nurse' });
  const kid = row2({ POPID: 'POP-K', First: 'Kim', Last: 'Ng', BirthYear: SIM_YEAR - 18, Status: 'active', ClockMode: 'ENGINE', HouseholdId: 'HH-1', SchoolQuality: 9, ParentIds: '["POP-P"]', Neighborhood: 'Temescal', LifeHistory: 'Y1C1 — [Education] read (good)' });
  // draws (rich band → no dropout roll): band jitter, field roll (parent Healthcare 3 + school Education 1
  // + hood 1.2 Healthcare / 1.2 Food / 0.6 Gov → Healthcare below ≈.6), income, employer
  let ctx = mkCtx([parent, kid], [0.5, 0.1, 0.5, 0.0]);
  let res = E.settleAdulthood_(ctx, CYCLE, ctx.rng);
  let k = ctx.ledger.rows[1];
  check('settled one, rich band (hh 150k + sq 9 + parent masters)', res.settled === 1 && res.rich === 1);
  check('role = field × band table cell', k[col2('RoleType')] === 'Biotech Lab Assistant', k[col2('RoleType')]);
  check('SkillTags = the field, directly', k[col2('SkillTags')] === 'Healthcare');
  check('[Adulthood] line names the cause', /\[Adulthood\] .* — Biotech Lab Assistant \(following Ada into Healthcare\)/.test(k[col2('LifeHistory')]), k[col2('LifeHistory')].split('\n').pop());
  check('employer is IN the field (the clinic, not City Hall / the taqueria)', k[col2('EmployerBizId')] === 'BIZ-1', k[col2('EmployerBizId')]);
  check('econ key set', k[col2('EconomicProfileKey')] === 'Medical Lab Technician');
  // same kid, hood decides (roll lands past parent + school on the Food & Culture slice)
  ctx = mkCtx([parent, kid], [0.5, 0.93, 0.5, 0.0]);
  res = E.settleAdulthood_(ctx, CYCLE, ctx.rng); k = ctx.ledger.rows[1];
  check('hood-decided: Food & Culture rich role + hood clause', k[col2('RoleType')] === 'Pastry Apprentice' && / \(the neighborhood's trade: Food & Culture\)/.test(k[col2('LifeHistory')]), k[col2('RoleType')] + ' | ' + k[col2('LifeHistory')].split('\n').pop());
  check('field-role econ key from the field table', k[col2('EconomicProfileKey')] === 'Pastry Chef');
  check('hood-decided kid hires into the field (the taqueria)', k[col2('EmployerBizId')] === 'BIZ-2', k[col2('EmployerBizId')]);
  // orphan in a hood with no businesses and no school lines → legacy band draw, tag from the role, no clause
  const orphan = row2({ POPID: 'POP-O', First: 'Ori', Last: 'Lee', BirthYear: SIM_YEAR - 18, Status: 'active', ClockMode: 'ENGINE', Neighborhood: 'Nowhere', LifeHistory: '' });
  sheets.Business_Ledger = [['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count']];
  ctx = mkCtx([orphan], [0.5, 0.9, 0.1, 0.5, 0.0]);
  res = E.settleAdulthood_(ctx, CYCLE, ctx.rng); k = ctx.ledger.rows[0];
  check('no source → legacy band role, no clause', res.settled === 1 && k[col2('RoleType')] !== '' && !/following|school years|neighborhood's trade/.test(k[col2('LifeHistory')]), k[col2('LifeHistory')].split('\n').pop());
  check('legacy tag still stamped from the role', k[col2('SkillTags')] !== '');
  delete global.sectorCategory_; delete global.deriveDebtLevel_; delete global.deriveNetWorth_;
}

console.log('\n9. engine.144 loop 4 — youth texture, the minors\' whole texture (S411):');
{
  global.getCitizenDialBands_ = () => null;
  global.inWorldStamp_ = () => 'Y3C4';
  const intents = [];
  global.queueAppendIntent_ = (ctx, tab, row) => intents.push({ tab, row });
  const Y = new Function(CAL + R('phase05-citizens/runYouthEngine.js') + '\nreturn { runYouthEngine_, getNamedYouth_, selectYouthEventType_, pickYouthEvent_, YOUTH_TEXTURE_POOLS, YOUTH_TYPE_ORDER, YOUTH_DIAL_TAG, youthStage_ };')();
  const mul = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const YH = ['POPID', 'First', 'Last', 'BirthYear', 'Status', 'ClockMode', 'Neighborhood', 'LifeHistory', 'LastUpdated', 'DialState'];
  const yrow = (pop, by, hood) => { const r = YH.map(() => ''); r[0] = pop; r[1] = pop; r[2] = 'T'; r[3] = by; r[4] = 'active'; r[5] = 'ENGINE'; r[6] = hood || 'Temescal'; return r; };
  const yctx = (rows, seed, month) => ({ ss: { getSheetByName() { return null; } }, rng: mul(seed), now: 'now',
    summary: { simYear: 2042, simMonth: month || 1, season: 'winter', absoluteCycle: 108, cycleRef: 'Y3C4', crimeMetrics: {} }, ledger: { headers: YH.slice(), rows: rows.map(r => r.slice()), dirty: false } });
  // vocabulary shape
  const dialOk = Y.YOUTH_TYPE_ORDER.concat(['resilience', 'safety_awareness']).every(t => Y.YOUTH_DIAL_TAG[t]);
  check('every emitted type has a YOUTH_DIAL_TAG route (no silent Education default)', dialOk);
  const allLines = [].concat(...Object.values(Y.YOUTH_TEXTURE_POOLS).map(st => [].concat(...Object.values(st))));
  check('pools carry no real school/team/org names', !/Oakland Unified|OUSD|Skyline|Warriors|Raiders|Athletics|Golden State/.test(allLines.join('\n')) && allLines.length > 90, String(allLines.length));
  check('the four GCE child/teen lines relocated here', ['turned the walk home from school into an expedition', 'built something out of nothing on the living-room floor and defended it fiercely', 'rewrote a text three times before sending it', 'stayed out until the exact minute of curfew, not one minute past'].every(l => allLines.includes(l)));
  const gce = R('phase05-citizens/generateCitizensEvents.js');
  check('…and gone from generateCitizensEvents agePoolFor_', !/turned the walk home from school/.test(gce) && /ageGroup === "child" \|\| ageGroup === "teen"\) return \[\]/.test(gce));
  // age from the calendar year, BirthYear first
  const named = Y.getNamedYouth_(yctx([yrow('P5', 2037), yrow('P4', 2038), yrow('P17', 2025), yrow('P18', 2024), yrow('P30', 2012)], 1));
  const ids = named.map(n => n.id + ':' + n.age).join(',');
  check('getNamedYouth_ reads simYear 2042 (2037-born is 5, in; 2038-born is 4, out; 2024-born is 18, still in the 5–22 window)', ids === 'P5:5,P17:17,P18:18', ids);
  // the texture pass
  let hit5to17 = 0, trials = 0, lineTeen = '', lineChild = '', under5 = 0, adult = 0, suffix = 0;
  for (let i = 0; i < 300; i++) {
    const rows = [yrow('K3', 2039), yrow('K8', 2034), yrow('K15', 2027), yrow('A30', 2012)];
    const ctx = yctx(rows, i + 11, 1);
    Y.runYouthEngine_(ctx);
    const L = (r) => String(ctx.ledger.rows[r][YH.indexOf('LifeHistory')] || '');
    if (L(0)) under5++; if (L(3)) adult++;
    for (const r of [1, 2]) { trials++; if (L(r)) { hit5to17++; if (/\(participated\)|\(recognized\)|\(completed\)/.test(L(r))) suffix++; } }
    if (!lineChild && L(1)) lineChild = L(1).split('\n')[0]; if (!lineTeen && L(2)) lineTeen = L(2).split('\n')[0];
  }
  const rate = hit5to17 / trials;
  check('minors 5–17 draw texture at the adults\' rate (0.5–0.85 in January)', rate > 0.5 && rate < 0.85, rate.toFixed(3));
  check('under-five draws nothing; a 30-year-old draws nothing here', under5 === 0 && adult === 0, under5 + '/' + adult);
  check('no "(participated)" suffix on any line', suffix === 0, String(suffix));
  check('lines are stamped with a routable dial tag', /^Y3C4 — \[(Education|Team|Cultural|Community|Civic|Graduation|Stabilized|Neighborhood)\] /.test(lineChild) && /^Y3C4 — \[/.test(lineTeen), lineChild + ' | ' + lineTeen);
  const tex = intents.filter(x => x.tab === 'LifeHistory_Log' && /\|texture$/.test(x.row[3]));
  const ev = intents.filter(x => x.tab === 'LifeHistory_Log' && !/\|texture$/.test(x.row[3]));
  check('log rows: texture layer carries the |texture token; event layer does not', tex.length > 0 && ev.length > 0 && tex.every(x => /^\w[\w ]*\|youth-[a-z_]+\|texture$/.test(x.row[3])), tex.length + '/' + ev.length);
  check('S.youthTexture reports cohort + generated', (() => { const c = yctx([yrow('K8', 2034)], 5, 1); Y.runYouthEngine_(c); return c.summary.youthTexture && c.summary.youthTexture.cohort === 1 && typeof c.summary.youthTexture.generated === 'number'; })());
  // calendar pulls the type mix; summer cuts academic
  const typeShare = (month, age, type) => { let n = 0; const rng = mul(3); for (let i = 0; i < 2000; i++) if (Y.selectYouthEventType_(age, month, rng) === type) n++; return n / 2000; };
  check('summer (month 7) pulls academic down for a 10-year-old', typeShare(7, 10, 'academic') < typeShare(1, 10, 'academic') * 0.6, typeShare(7, 10, 'academic').toFixed(2) + ' vs ' + typeShare(1, 10, 'academic').toFixed(2));
  check('graduation month (6) pulls coming_of_age up for a 17-year-old, not a 9-year-old', typeShare(6, 17, 'coming_of_age') > 0.15 && typeShare(6, 9, 'coming_of_age') === 0, typeShare(6, 17, 'coming_of_age').toFixed(2));
  // determinism
  const run = (seed) => { const c = yctx([yrow('K8', 2034), yrow('K15', 2027)], seed, 4); Y.runYouthEngine_(c); return c.ledger.rows.map(r => r[YH.indexOf('LifeHistory')]).join('||'); };
  check('deterministic under the same rng', run(42) === run(42) && run(42) !== run(43));
  delete global.getCitizenDialBands_; delete global.inWorldStamp_; delete global.queueAppendIntent_;
}

console.log('\n12. one year formula (engine.148, backlog 7):');
{
  const C = new Function(CAL + '\nreturn { simYearFromCycle_, simYearOf_ };')();
  const calendar = (cycle) => 2040 + (Math.ceil(cycle / 52) - 1);   // Phase1-Calendar arithmetic, advanceSimulationCalendar.js
  const oldFloor = (cycle) => 2040 + Math.floor(cycle / 52);          // the retired per-site formula
  check('helper == calendar at 1, 52, 53, 104, 105, 156, 157', [1, 52, 53, 104, 105, 156, 157].every(c => C.simYearFromCycle_(c) === calendar(c)));
  check('cycles 1-52 → 2040, 53-104 → 2041, 105-156 → 2042', C.simYearFromCycle_(1) === 2040 && C.simYearFromCycle_(52) === 2040 && C.simYearFromCycle_(53) === 2041 && C.simYearFromCycle_(104) === 2041 && C.simYearFromCycle_(105) === 2042 && C.simYearFromCycle_(156) === 2042);
  check('the retired formula disagreed on exactly the last cycle of each year', oldFloor(104) !== calendar(104) && oldFloor(52) !== calendar(52) && oldFloor(105) === calendar(105) && oldFloor(103) === calendar(103));
  check('simYearOf_ reads the calendar first', C.simYearOf_({ summary: { simYear: 2042, cycleId: 52 } }, 52) === 2042);
  check('simYearOf_ derives from the cycle when the calendar has not run', C.simYearOf_({ summary: {} }, 104) === 2041 && C.simYearOf_({ summary: { cycleId: 105 } }) === 2042 && C.simYearOf_({ config: { cycleCount: 156 } }) === 2042);
  check('no engine file re-derives the year itself', !fs.readdirSync(path.resolve(__dirname, '..')).filter(d => /^phase/.test(d)).some(d => fs.readdirSync(path.resolve(__dirname, '..', d)).filter(x => /\.js$/.test(x) && x !== 'advanceSimulationCalendar.js').some(x => /2040 \+ (Math\.floor|\()/.test(fs.readFileSync(path.resolve(__dirname, '..', d, x), 'utf8')))));
}

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
