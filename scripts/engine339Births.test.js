#!/usr/bin/env node
'use strict';
/**
 * engine339Births.test.js — engine.339 (builder 2026-11-20): "no one over 40 would have a newborn , no one under 21 can
 * have a kid". The birth roll's window tops at 40 (was 42); a spouse on the ledger outside 21–40 blocks the couple's
 * birth on either partner's roll. Synthetic citizens only; no external calls.
 * Plan: docs/plans/2026-11-08-how-kids-are-minted.md §Builder's words 2026-11-20.
 *
 * Run: node scripts/engine339Births.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

const sb = { Logger: { log() {} }, safeRand_: ctx => ctx.rng,
  queueBatchAppendIntent_: () => {}, queueAppendIntent_: () => {}, queueCellIntent_: () => {},
  inWorldStamp_: ctx => 'C' + ctx.summary.cycleId,
  ECONOMIC_PARAMETERS: JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'economic_parameters.json'), 'utf8')) };
vm.createContext(sb);
// the file set scripts/hospitalIncomePersistence.test.js drives runGenerationalEngine_ with
for (const file of ['phase01-config/advanceSimulationCalendar.js', 'utilities/citizenDerivation.js',
  'phase05-citizens/educationCareerEngine.js', 'phase05-citizens/runCivicRoleEngine.js', 'phase05-citizens/runCareerEngine.js',
  'utilities/cycleModes.js', 'phase05-citizens/judicialLifecycle.js', 'phase05-citizens/runHouseholdEngine.js',
  'phase05-citizens/generationalWealthEngine.js', 'phase04-events/generationalEventsEngine.js',
  'utilities/citizenMemory.js', 'utilities/citizenDialMap.js', 'utilities/compressLifeHistory.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sb, { filename: file });
}

const H = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'RoleType',
  'Status', 'BirthYear', 'MaritalStatus', 'NumChildren', 'HouseholdId', 'SpouseId', 'Gender', 'ChildrenIds', 'CIV (y/n)'];
const CYC = 117;
const YEAR = sb.simYearOf_({ config: { cycleCount: CYC }, summary: { cycleId: CYC } }, CYC);
const person = (o) => H.map(n => (o[n] === undefined ? '' : o[n]));
const couple = (ageA, ageB) => [
  person({ POPID: 'POP-90001', First: 'Ana', Last: 'Test', Tier: 4, ClockMode: 'ENGINE', Status: 'Active', BirthYear: YEAR - ageA,
    MaritalStatus: 'married', NumChildren: 0, HouseholdId: 'HH-T1', SpouseId: 'POP-90002', Gender: 'female', Neighborhood: 'Temescal', 'CIV (y/n)': 'no' }),
  person({ POPID: 'POP-90002', First: 'Ben', Last: 'Test', Tier: 4, ClockMode: 'ENGINE', Status: 'Active', BirthYear: YEAR - ageB,
    MaritalStatus: 'married', NumChildren: 0, HouseholdId: 'HH-T1', SpouseId: 'POP-90001', Gender: 'male', Neighborhood: 'Temescal', 'CIV (y/n)': 'no' })];

function rollsFor(rows) {
  const ctx = { config: { cycleCount: CYC, griefDurationCycles: 3, griefHolidayDurationCycles: 5, griefParticipationMultiplier: 0.8,
      griefPublicActivityMultiplier: 0.75, griefSupportMultiplier: 1.25, griefResponseChance: 0.35 },
    summary: { cycleId: CYC, season: 'fall', month: 11 }, rng: () => 0.999,
    ledger: { headers: H.slice(), rows, dirty: false }, ss: null };
  const rolled = [];
  const prior = { checkBirth_: sb.checkBirth_, checkHealthEvent_: sb.checkHealthEvent_ };
  sb.checkBirth_ = (c, popId) => { rolled.push(popId); return null; }; // who reaches the roll
  sb.checkHealthEvent_ = () => null; // not under test
  try { sb.runGenerationalEngine_(ctx); } finally { sb.checkBirth_ = prior.checkBirth_; sb.checkHealthEvent_ = prior.checkHealthEvent_; }
  return rolled.sort();
}

let pass = 0, fail = 0;
const check = (name, fn) => { try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); } };

check('the birth window tops at 40 (was 42); the roll still starts at 26', () => {
  assert.strictEqual(sb.AGE_RANGES.BIRTH.max, 40);
  assert.strictEqual(sb.AGE_RANGES.BIRTH.min, 26);
});
check('checkBirth_ refuses a 41-year-old and a 25-year-old before any die', () => {
  const cal = { month: 11, season: 'fall' };
  const ctx = { rng: () => 0, summary: {}, config: {} };
  assert.strictEqual(sb.checkBirth_(ctx, 'POP-1', 41, '', cal, true, 'married', 'family'), null);
  assert.strictEqual(sb.checkBirth_(ctx, 'POP-1', 25, '', cal, true, 'married', 'family'), null);
  assert.ok(sb.checkBirth_(ctx, 'POP-1', 40, '', cal, true, 'married', 'family'), 'a 40-year-old still can, at rng 0');
});
check('a couple both inside 21–40 both reach the roll', () => {
  assert.deepStrictEqual(rollsFor(couple(30, 33)), ['POP-90001', 'POP-90002']);
});
check('a 30-year-old married to a 45-year-old on the ledger does not reach the roll; the 45-year-old reaches it and is too old', () => {
  assert.deepStrictEqual(rollsFor(couple(30, 45)), ['POP-90002']);
});
check('a spouse under 21 on the ledger blocks the partner\'s roll', () => {
  assert.deepStrictEqual(rollsFor(couple(30, 20)), ['POP-90002']);
});
check('a spouse off camera (no POPID on the ledger) blocks nothing', () => {
  const rows = couple(30, 33).slice(0, 1);
  rows[0][H.indexOf('SpouseId')] = '';
  assert.deepStrictEqual(rollsFor(rows), ['POP-90001']);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
