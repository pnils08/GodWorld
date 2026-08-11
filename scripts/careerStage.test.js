#!/usr/bin/env node
'use strict';

/**
 * Run: node scripts/careerStage.test.js
 *
 * Purpose: Node proof test for engine.82 (S366, plan
 * docs/plans/2026-08-11-careerstage-salary-coherence.md Tasks 1-2).
 * Bench 0720 is gone (Mike-direct 2026-08-11), so this harness is the
 * proving mechanism before prod push. Verifies:
 *   - canonical enum: CAREER_STAGES emits student|entry|mid|senior|retired
 *   - roleIsActive_ predicate (blank / student / "Retired X" are inactive)
 *   - deriveCareerStage_: role+status beat age; YearsInCareer clamped to
 *     age-18 (the retired-at-25 fossil class must not repair into senior)
 *   - updateCareerProgression_: age stamps only fire on roleless rows; an
 *     active-role citizen mislabeled student/retired self-heals; blank stage
 *     on an active-role citizen self-heals; advancement still fires
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) {
    passed++;
    console.log('ok ' + label);
  } else {
    failed++;
    console.log('FAIL ' + label + ': ' + (detail || 'condition false'));
  }
}

const sandbox = {
  Logger: { log: function () {} },
  console: console,
  Math: Math,
  Number: Number,
  String: String,
  Array: Array,
  Object: Object,
  JSON: JSON,
  Date: Date
};
vm.createContext(sandbox);

const engineSrc = fs.readFileSync(
  path.join(__dirname, '..', 'phase05-citizens', 'educationCareerEngine.js'),
  'utf8'
);
vm.runInContext(engineSrc, sandbox, { filename: 'educationCareerEngine.js' });

// ═══ canonical enum ═══
const CS = sandbox.CAREER_STAGES;
assert('enum ENTRY is short form', CS.ENTRY === 'entry');
assert('enum MID is short form', CS.MID === 'mid');
assert('enum values all canonical', ['student', 'entry', 'mid', 'senior', 'retired']
  .every(v => Object.keys(CS).some(k => CS[k] === v)));

// ═══ roleIsActive_ ═══
assert('blank role inactive', sandbox.roleIsActive_('') === false);
assert('student role inactive', sandbox.roleIsActive_('student') === false);
assert('"Retired PG&E Engineer" inactive', sandbox.roleIsActive_('Retired PG&E Engineer') === false);
assert('Mayor active', sandbox.roleIsActive_('Mayor') === true);
assert('Starting Pitcher active', sandbox.roleIsActive_('Starting Pitcher') === true);

// ═══ deriveCareerStage_ ═══
const d = sandbox.deriveCareerStage_;
assert('Status retired wins', d('retired', 'Mayor', 50, 20) === 'retired');
assert('Status deceased wins', d('deceased', 'Plumber', 40, 10) === 'retired');
assert('"Retired X" role → retired', d('active', 'Retired PG&E Engineer', 68, 40) === 'retired');
// The Mayor class: active role, age irrelevant
assert('Mayor age 60 yrs 20 → senior', d('active', 'Mayor', 60, 20) === 'senior');
// The ace class: age 21, $24M starter — role beats the <22 student stamp
assert('age-21 ace yrs 2 → entry', d('active', 'Starting Pitcher', 21, 2) === 'entry');
// The Arturo Ramos fossil class: 25yo carrying 38 fossil years — clamp to age-18=7 → mid, NOT senior
assert('25yo with 38-yr fossil → mid (clamped)', d('active', 'Starting Pitcher', 25, 38) === 'mid');
assert('19yo with 40-yr fossil → entry (clamped)', d('active', 'Outfielder', 19, 40) === 'entry');
// Bands
assert('yrs 0 → entry', d('active', 'Barista', 24, 0) === 'entry');
assert('yrs 3 → mid', d('active', 'Teacher', 30, 3) === 'mid');
assert('yrs 10 → senior', d('active', 'Engineer', 45, 10) === 'senior');
// Roleless
assert('roleless age 12 → student', d('active', '', 12, 0) === 'student');
assert('role student age 30 → student', d('active', 'student', 30, 0) === 'student');
assert('roleless age 70 → retired', d('active', '', 70, 0) === 'retired');
assert('roleless age 40 → blank', d('active', '', 40, 0) === '');

// ═══ careerStageClass_ still accepts legacy + canonical ═══
assert('class entry-level → ENTRY', sandbox.careerStageClass_('entry-level') === 'ENTRY');
assert('class entry → ENTRY', sandbox.careerStageClass_('entry') === 'ENTRY');
assert('class mid-career → MID', sandbox.careerStageClass_('mid-career') === 'MID');
assert('class early → ENTRY', sandbox.careerStageClass_('early') === 'ENTRY');

// ═══ updateCareerProgression_ behavior ═══
const HEADERS = ['POPID', 'First', 'Last', 'Status', 'BirthYear', 'RoleType',
  'CareerStage', 'YearsInCareer', 'EducationLevel', 'LastPromotionCycle',
  'LifeHistory', 'Neighborhood', 'Occupation', 'LastUpdated'];
function mkRow(o) {
  return HEADERS.map(h => (h in o ? o[h] : ''));
}
function runProgression(rows, cycle, rngVal) {
  const ctx = {
    ledger: { headers: HEADERS, rows: rows, dirty: false },
    summary: {}
  };
  const res = sandbox.updateCareerProgression_(ctx, cycle, function () { return rngVal; });
  return { ctx, res };
}
const iStage = HEADERS.indexOf('CareerStage');

// Mayor mislabeled retired (age 52, active role) → self-heals to senior
let rows = [mkRow({ POPID: 'POP-00034', First: 'Avery', Last: 'Santana', Status: 'Active', BirthYear: 1989, RoleType: 'Mayor', CareerStage: 'retired', YearsInCareer: 20 })];
runProgression(rows, 50, 0.99);
assert('mislabeled Mayor heals retired→senior', rows[0][iStage] === 'senior', 'got ' + rows[0][iStage]);

// 21yo ace mislabeled student → heals to entry (role beats <22 stamp)
rows = [mkRow({ POPID: 'POP-00533', First: 'Travis', Last: 'Coles', Status: 'Active', BirthYear: 2020, RoleType: 'Starting Pitcher', CareerStage: 'student', YearsInCareer: 2 })];
runProgression(rows, 50, 0.99);
assert('21yo active ace heals student→entry', rows[0][iStage] === 'entry', 'got ' + rows[0][iStage]);

// Blank stage on active-role GM → heals
rows = [mkRow({ POPID: 'POP-01046', First: 'Elliot', Last: 'Abraham', Status: 'Active', BirthYear: 1993, RoleType: 'General Manager', CareerStage: '', YearsInCareer: 12 })];
runProgression(rows, 50, 0.99);
assert('blank stage on active GM heals → senior', rows[0][iStage] === 'senior', 'got ' + rows[0][iStage]);

// Roleless 12yo still stamps student; roleless 70yo still stamps retired
rows = [
  mkRow({ POPID: 'POP-X1', Status: 'Active', BirthYear: 2029, RoleType: '', CareerStage: '', YearsInCareer: 0 }),
  mkRow({ POPID: 'POP-X2', Status: 'Active', BirthYear: 1970, RoleType: '', CareerStage: 'senior', YearsInCareer: 30 })
];
runProgression(rows, 50, 0.99);
assert('roleless 12yo stamped student', rows[0][iStage] === 'student', 'got ' + rows[0][iStage]);
assert('roleless 70yo stamped retired', rows[1][iStage] === 'retired', 'got ' + rows[1][iStage]);

// "Retired X" RoleType at working age stamps retired (Robert Corliss class)
rows = [mkRow({ POPID: 'POP-00594', First: 'Robert', Last: 'Corliss', Status: 'Active', BirthYear: 1978, RoleType: 'Retired PG&E Engineer', CareerStage: 'mid-career', YearsInCareer: 30 })];
runProgression(rows, 50, 0.99);
assert('"Retired X" role stamped retired', rows[0][iStage] === 'retired', 'got ' + rows[0][iStage]);

// Advancement still fires: entry + eligible + rng below 0.15 → mid, canonical spelling
rows = [mkRow({ POPID: 'POP-X3', Status: 'Active', BirthYear: 2011, RoleType: 'Teacher', CareerStage: 'entry', YearsInCareer: 6, LastPromotionCycle: 0 })];
let out = runProgression(rows, 20, 0.01);
assert('entry→mid advancement fires', rows[0][iStage] === 'mid', 'got ' + rows[0][iStage]);
assert('advancement counted', out.res.advanced === 1, 'got ' + out.res.advanced);

// Legacy spelling advances too (read-normalizer intact): entry-level → mid
rows = [mkRow({ POPID: 'POP-X4', Status: 'Active', BirthYear: 2011, RoleType: 'Teacher', CareerStage: 'entry-level', YearsInCareer: 6, LastPromotionCycle: 0 })];
runProgression(rows, 20, 0.01);
assert('legacy entry-level advances → canonical mid', rows[0][iStage] === 'mid', 'got ' + rows[0][iStage]);

// Coherent active-role stage is NOT churned when no advancement roll hits
rows = [mkRow({ POPID: 'POP-X5', Status: 'Active', BirthYear: 2001, RoleType: 'Chef', CareerStage: 'mid', YearsInCareer: 6, LastPromotionCycle: 19 })];
runProgression(rows, 20, 0.99);
assert('coherent mid untouched', rows[0][iStage] === 'mid', 'got ' + rows[0][iStage]);

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
