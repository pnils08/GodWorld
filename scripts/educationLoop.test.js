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

const E = new Function(R('phase05-citizens/educationCareerEngine.js') + '\nreturn {' +
  'processEducationCareer_, deriveEducationLevels_, deriveMinorEducationStage_, schoolStageForAge_,' +
  'canonicalEducationWrite_, eduRank_, updateCareerProgression_, EDUCATION_LEVELS };')();
const G = new Function(R('phase04-events/generationalEventsEngine.js') + '\nreturn {' +
  'checkGraduation_, graduationCredential_, GRADUATION_LADDER_ };')();

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
  check('applyEmployerSuccess_ reads no EducationLevel', !/EducationLevel/.test(fn(career, 'applyEmployerSuccess_')));
  check('matchUnemployedToOpenings_ reads no EducationLevel', !/EducationLevel/.test(fn(career, 'matchUnemployedToOpenings_')));
  const edu = R('phase05-citizens/educationCareerEngine.js');
  check('updateCareerProgression_ reads no EducationLevel', !/idx\('EducationLevel'\)|iEducation\b/.test(fn(edu, 'updateCareerProgression_')));
  check('no "affects career advancement" claim left in the header', !/affects career advancement/.test(edu));
  const youth = R('phase05-citizens/runYouthEngine.js');
  check('runYouthEngine carries no Oakland Unified / OUSD', !/Oakland Unified|OUSD/.test(youth));
}

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
