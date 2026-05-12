/**
 * citizenDerivation.test.js — coverage for the canon-protected citizen
 * derivation library. Hash determinism, age brackets, per-field derivations,
 * orchestrator stability.
 *
 * Run: node lib/citizenDerivation.test.js
 * Exits 0 on pass, 1 on failure.
 */

const cd = require('./citizenDerivation');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: hashSeed — deterministic + non-zero for non-empty');
{
  assert('same input → same hash', cd.hashSeed('foo|bar|POP-001') === cd.hashSeed('foo|bar|POP-001'));
  assert('different input → different hash', cd.hashSeed('foo|bar|POP-001') !== cd.hashSeed('foo|bar|POP-002'));
  assert('non-zero result', cd.hashSeed('test') > 0);
  assert('null input → 0 hash (empty string path)', typeof cd.hashSeed(null) === 'number');
}

console.log('\nTest 2: rand01 — deterministic [0, 1) values');
{
  const a = cd.rand01('seed1', 'salt1');
  const b = cd.rand01('seed1', 'salt1');
  assert('same seed+salt → same value', a === b);
  assert('value in [0, 1)', a >= 0 && a < 1);
  const c = cd.rand01('seed1', 'salt2');
  assert('different salt → different value (most cases)', a !== c);
}

console.log('\nTest 3: ageBracket — 5-bracket structure');
{
  assert("18 → '18-29'", cd.ageBracket(18) === '18-29');
  assert("29 → '18-29'", cd.ageBracket(29) === '18-29');
  assert("30 → '30-44'", cd.ageBracket(30) === '30-44');
  assert("44 → '30-44'", cd.ageBracket(44) === '30-44');
  assert("45 → '45-59'", cd.ageBracket(45) === '45-59');
  assert("59 → '45-59'", cd.ageBracket(59) === '45-59');
  assert("60 → '60-74'", cd.ageBracket(60) === '60-74');
  assert("74 → '60-74'", cd.ageBracket(74) === '60-74');
  assert("75 → '75+'", cd.ageBracket(75) === '75+');
  assert("100 → '75+'", cd.ageBracket(100) === '75+');
}

console.log('\nTest 4: ANCHOR_YEAR canon');
{
  assert('ANCHOR_YEAR = 2041', cd.ANCHOR_YEAR === 2041);
}

console.log('\nTest 5: pickFromCDF — returns correct value per threshold');
{
  const cdf = [['a', 0.3], ['b', 0.7], ['c', 1.0]];
  assert('r=0.1 → a', cd.pickFromCDF(0.1, cdf) === 'a');
  assert('r=0.5 → b', cd.pickFromCDF(0.5, cdf) === 'b');
  assert('r=0.9 → c', cd.pickFromCDF(0.9, cdf) === 'c');
  assert('r=1.0 (off-end) → last', cd.pickFromCDF(1.0, cdf) === 'c');
}

console.log('\nTest 6: deriveGender — neighborhood variance applied');
{
  // Run 200 draws for a known-variance neighborhood; expect roughly the configured female pct.
  let femaleCount = 0;
  for (let i = 0; i < 200; i++) {
    if (cd.deriveGender(`POP-${i}`, 'Adams Point') === 'female') femaleCount++;
  }
  // Adams Point configured at 0.53 — allow ±10% tolerance for sample noise
  const ratio = femaleCount / 200;
  assert(`Adams Point ratio ~0.53 (got ${ratio.toFixed(2)})`, ratio > 0.43 && ratio < 0.63);
}

console.log('\nTest 7: deriveGender — unknown neighborhood uses base 0.51');
{
  let femaleCount = 0;
  for (let i = 0; i < 200; i++) {
    if (cd.deriveGender(`POP-${i}`, 'Mars Colony') === 'female') femaleCount++;
  }
  const ratio = femaleCount / 200;
  assert(`unknown neighborhood ratio ~0.51 (got ${ratio.toFixed(2)})`, ratio > 0.41 && ratio < 0.61);
}

console.log('\nTest 8: deriveGender — deterministic per seed');
{
  const a = cd.deriveGender('POP-001', 'Temescal');
  const b = cd.deriveGender('POP-001', 'Temescal');
  assert('same seed → same gender', a === b);
}

console.log('\nTest 9: computeCareerStage — age bands');
{
  assert("age 22 → 'early'", cd.computeCareerStage('seed', 22) === 'early');
  assert("age 35 → 'mid'", cd.computeCareerStage('seed', 35) === 'mid');
  assert("age 65 → 'retired'", cd.computeCareerStage('seed', 65) === 'retired');
  assert("age 80 → 'retired'", cd.computeCareerStage('seed', 80) === 'retired');
}

console.log('\nTest 10: deriveYearsInCareer — clamped + age-aware');
{
  // Age 19 → maxYears = 1 → result <= 1
  const young = cd.deriveYearsInCareer('seed', 19);
  assert('age 19 → years <= 1', young <= 1);
  // Age 18 (minStart) → 0
  const min = cd.deriveYearsInCareer('seed', 18);
  assert('age 18 → 0 years', min === 0);
  // Retired stage ignores age, returns 35-45
  const ret = cd.deriveYearsInCareer('seed', 80, 'retired');
  assert('retired stage → 35-45 years', ret >= 35 && ret <= 45);
}

console.log('\nTest 11: deriveDebtLevel — income-inverse + age curve');
{
  // High income, mid age → low base
  const high = cd.deriveDebtLevel('seed', 40, 300000);
  // Low income, young → high base
  const low = cd.deriveDebtLevel('seed', 25, 30000);
  // Both should be in 0-10 range
  assert('high-income result in [0, 10]', high >= 0 && high <= 10);
  assert('low-income result in [0, 10]', low >= 0 && low <= 10);
}

console.log('\nTest 12: deriveNetWorth — age + income scaling');
{
  // Young + low income → small net worth
  const young = cd.deriveNetWorth('seed-y', 22, 30000);
  // Older + high income → much larger net worth
  const old = cd.deriveNetWorth('seed-o', 60, 500000);
  assert('older+wealthy >> young+poor', old > young * 5);
  assert('young+poor < $200k', young < 200000);
  assert('values rounded to nearest $1000', young % 1000 === 0 && old % 1000 === 0);
}

console.log('\nTest 13: deriveMaritalStatus — bracket-conditional CDF');
{
  // Run draws to verify outputs are valid statuses
  const valid = new Set(['single', 'partnered', 'married', 'divorced', 'widowed']);
  for (let i = 0; i < 50; i++) {
    const s = cd.deriveMaritalStatus(`seed-${i}`, 30 + i);
    if (!valid.has(s)) {
      assert(`age ${30 + i}: ${s} is valid`, false, s);
      break;
    }
  }
  assert('50 deriveMaritalStatus calls produced only valid statuses', true);
  // Widowed only appears in 45+ brackets
  const young = cd.deriveMaritalStatus('seed-young', 25);
  assert("age 25 never returns 'widowed'", young !== 'widowed');
}

console.log('\nTest 14: deriveNumChildren — partnered effect');
{
  // Compute averages — partnered should produce higher numbers than single
  let singleSum = 0, partneredSum = 0;
  for (let i = 0; i < 100; i++) {
    singleSum += cd.deriveNumChildren(`s-${i}`, 40, 'single');
    partneredSum += cd.deriveNumChildren(`s-${i}`, 40, 'partnered');
  }
  assert('partnered avg > single avg at age 40', partneredSum / 100 > singleSum / 100);
}

console.log('\nTest 15: deriveCitizenProfile — orchestrator returns all fields');
{
  const profile = cd.deriveCitizenProfile('POP-TEST-001', 35, 'Temescal', null);
  assert('RoleType set', typeof profile.RoleType === 'string' && profile.RoleType.length > 0);
  assert('EducationLevel set', typeof profile.EducationLevel === 'string');
  assert('Gender in {male, female}', ['male', 'female'].includes(profile.Gender));
  assert('YearsInCareer numeric', typeof profile.YearsInCareer === 'number');
  assert('DebtLevel in [0, 10]', profile.DebtLevel >= 0 && profile.DebtLevel <= 10);
  assert('NetWorth numeric', typeof profile.NetWorth === 'number');
  assert('MaritalStatus string', typeof profile.MaritalStatus === 'string');
  assert('NumChildren numeric', typeof profile.NumChildren === 'number');
  assert('_neighborhood preserved', profile._neighborhood === 'Temescal');
}

console.log('\nTest 16: deriveCitizenProfile — deterministic for same seed');
{
  const a = cd.deriveCitizenProfile('POP-DET', 40, 'Rockridge', null);
  const b = cd.deriveCitizenProfile('POP-DET', 40, 'Rockridge', null);
  assert('same seed → same RoleType', a.RoleType === b.RoleType);
  assert('same seed → same Gender', a.Gender === b.Gender);
  assert('same seed → same NetWorth', a.NetWorth === b.NetWorth);
  assert('same seed → same MaritalStatus', a.MaritalStatus === b.MaritalStatus);
}

console.log('\nTest 17: lookupNeighborhood — sentinels rejected');
{
  // Engine + Generational are not real neighborhoods (sentinel values)
  const r1 = cd.lookupNeighborhood('Engine', 'seed', null);
  const r2 = cd.lookupNeighborhood('Generational', 'seed', null);
  assert("'Engine' rejected, falls back to canon-12", r1 !== 'Engine');
  assert("'Generational' rejected, falls back to canon-12", r2 !== 'Generational');
  // Real neighborhoods pass through
  assert("'Temescal' returned as-is", cd.lookupNeighborhood('Temescal', 'seed', null) === 'Temescal');
}

console.log('\nTest 18: CANONICAL_ROLES is a non-empty Set');
{
  assert('Set instance', cd.CANONICAL_ROLES instanceof Set);
  assert('non-empty', cd.CANONICAL_ROLES.size > 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
