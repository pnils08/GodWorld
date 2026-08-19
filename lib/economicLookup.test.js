/**
 * economicLookup.test.js — coverage for buildParamIndex, lookupProfile,
 * calculateIncome, deriveSavingsRate, isRetiredRole.
 *
 * Run: node lib/economicLookup.test.js
 * Exits 0 on pass, 1 on failure.
 */

const econ = require('./economicLookup');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// Seeded RNG for determinism
function makeRng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

console.log('Test 1: buildParamIndex builds lookup map');
{
  const params = [
    { role: 'Longshoreman', medianIncome: 80000, incomeRange: [50000, 120000] },
    { role: 'Teacher', medianIncome: 60000, incomeRange: [40000, 90000] },
  ];
  const idx = econ.buildParamIndex(params);
  assert('Longshoreman lookup', idx.Longshoreman && idx.Longshoreman.medianIncome === 80000);
  assert('Teacher lookup', idx.Teacher && idx.Teacher.medianIncome === 60000);
  assert('unknown role → undefined', idx.Astronaut === undefined);
}

console.log('\nTest 2: lookupProfile happy path');
{
  const params = [{ role: 'Longshoreman', medianIncome: 80000, incomeRange: [50000, 120000] }];
  const idx = econ.buildParamIndex(params);
  const mapping = { 'Longshoreman (Port of Oakland)': 'Longshoreman' };
  const profile = econ.lookupProfile('Longshoreman (Port of Oakland)', mapping, idx);
  assert('profile returned', profile && profile.medianIncome === 80000);
}

console.log('\nTest 3: lookupProfile — null inputs');
{
  const idx = {};
  assert('null roleType → null', econ.lookupProfile(null, {}, idx) === null);
  assert('empty roleType → null', econ.lookupProfile('', {}, idx) === null);
  assert('unmapped roleType → null', econ.lookupProfile('Astronaut', {}, idx) === null);
}

console.log('\nTest 4: lookupProfile — SPORTS_OVERRIDE returns null');
{
  const mapping = { 'Pitcher': 'SPORTS_OVERRIDE' };
  assert('SPORTS_OVERRIDE → null', econ.lookupProfile('Pitcher', mapping, {}) === null);
}

console.log('\nTest 5: calculateIncome — null profile returns 0');
{
  assert('null profile → 0', econ.calculateIncome(null, 3, makeRng(1)) === 0);
}

console.log('\nTest 6: calculateIncome — within range for median+spread path');
{
  const profile = { incomeRange: [40000, 100000], medianIncome: 60000 };
  const rng = makeRng(123);
  const inc = econ.calculateIncome(profile, 3, rng);
  assert('income > 0', inc > 0);
  // Tier 3 modifier 1.0; ceiling = max * 1.0 * 1.1 = 110000
  assert('income within reasonable range', inc >= 30000 && inc <= 130000, `got ${inc}`);
}

console.log('\nTest 7: calculateIncome — tier modifier scales income');
{
  const profile = { incomeRange: [40000, 100000], medianIncome: 60000 };
  // Same RNG seed → tier 1 should produce higher income than tier 4
  let total1 = 0, total4 = 0;
  for (let i = 0; i < 100; i++) {
    total1 += econ.calculateIncome(profile, 1, makeRng(100 + i));
    total4 += econ.calculateIncome(profile, 4, makeRng(100 + i));
  }
  assert('tier 1 average > tier 4 average', total1 / 100 > total4 / 100, `t1=${total1/100}, t4=${total4/100}`);
}

console.log('\nTest 8: calculateIncome — retirement modifier reduces income');
{
  const profile = { incomeRange: [40000, 100000], medianIncome: 60000 };
  let workingTotal = 0, retiredTotal = 0;
  for (let i = 0; i < 50; i++) {
    workingTotal += econ.calculateIncome(profile, 3, makeRng(200 + i));
    retiredTotal += econ.calculateIncome(profile, 3, makeRng(200 + i), { isRetired: true });
  }
  assert('retired average < working average', retiredTotal / 50 < workingTotal / 50);
}

// Tests 9 & 10 (deriveWealthLevel thresholds / net-worth boost) removed engine.120 S381 —
// the v14.2 income-proxy formula they asserted was deleted from economicLookup.js.
// WealthLevel is owned solely by generationalWealthEngine.js deriveWealthLevel_ (v15).

console.log('\nTest 11: deriveSavingsRate — bracket mapping');
{
  const rng = () => 0.5;
  assert('low profile range', econ.deriveSavingsRate('low', 50000, rng) >= 0.02 && econ.deriveSavingsRate('low', 50000, rng) <= 0.05);
  assert('moderate profile range', econ.deriveSavingsRate('moderate', 50000, rng) >= 0.05 && econ.deriveSavingsRate('moderate', 50000, rng) <= 0.12);
  assert('high-discretionary range', econ.deriveSavingsRate('high-discretionary', 50000, rng) >= 0.12 && econ.deriveSavingsRate('high-discretionary', 50000, rng) <= 0.20);
  assert('unknown profile defaults to moderate', econ.deriveSavingsRate('unknown', 50000, rng) >= 0.05 && econ.deriveSavingsRate('unknown', 50000, rng) <= 0.12);
}

console.log('\nTest 12: isRetiredRole regex');
{
  assert("'Retired teacher' → true", econ.isRetiredRole('Retired teacher') === true);
  assert("'retired police officer' → true", econ.isRetiredRole('retired police officer') === true);
  assert("'Retired ' (trailing space) → true", econ.isRetiredRole('Retired ') === true);
  assert("'Teacher' → false", econ.isRetiredRole('Teacher') === false);
  assert("'Retiree' → false (no word boundary match)", econ.isRetiredRole('Retiree') === false);
  assert("null → false", econ.isRetiredRole(null) === false);
  assert("empty → false", econ.isRetiredRole('') === false);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
