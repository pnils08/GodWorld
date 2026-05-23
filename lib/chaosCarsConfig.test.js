/**
 * chaosCarsConfig.test.js — S229 engine.11 T1.4 universal no-death constraint coverage.
 *
 * Pairs with lib/chaosCarsConfig.js. If you change FORBIDDEN_OUTCOMES,
 * validateOutcome, or validateVehicleConfig — confirm the assertions
 * below still match the new behavior.
 *
 * Run: node lib/chaosCarsConfig.test.js
 * Exits 0 on pass, 1 on failure.
 *
 * Plan reference: docs/plans/2026-05-07-chaos-cars-engine.md §T1.4 Verify
 *   "unit test in file footer — feed `'died in accident'` → throws;
 *    feed `'minor injury'` → returns true."
 *
 * Project convention deviates from the plan's "file footer" — tests live
 * in a parallel `.test.js` file picked up by scripts/run-tests.js.
 */

'use strict';

const helper = require('./chaosCarsConfig');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

function assertThrows(label, fn, expectedMessageFragment) {
  let threw = false;
  let actualMessage = '';
  try { fn(); } catch (e) { threw = true; actualMessage = e.message; }
  if (!threw) {
    console.error(`  FAIL ${label}: expected throw, no error raised`);
    failed++;
    return;
  }
  if (expectedMessageFragment && actualMessage.indexOf(expectedMessageFragment) < 0) {
    console.error(
      `  FAIL ${label}: error message missing "${expectedMessageFragment}"; got: "${actualMessage}"`
    );
    failed++;
    return;
  }
  console.log(`  ok   ${label}`);
  passed++;
}

// ────────────────────────────────────────────────────────────────────────────
// Test 1: exports + FORBIDDEN_OUTCOMES shape
// ────────────────────────────────────────────────────────────────────────────
console.log('Test 1: module exports + FORBIDDEN_OUTCOMES shape');
{
  assert('exports.FORBIDDEN_OUTCOMES present', Array.isArray(helper.FORBIDDEN_OUTCOMES));
  assert('exports.validateOutcome is function', typeof helper.validateOutcome === 'function');
  assert('exports.validateVehicleConfig is function', typeof helper.validateVehicleConfig === 'function');
  assert('FORBIDDEN_OUTCOMES is frozen', Object.isFrozen(helper.FORBIDDEN_OUTCOMES));
  // Plan §T1.4 named the minimum set:
  for (const required of ['death', 'died', 'dying', 'fatal', 'killed', 'kill', 'deceased', 'dead']) {
    assert(`FORBIDDEN_OUTCOMES contains "${required}"`, helper.FORBIDDEN_OUTCOMES.indexOf(required) >= 0);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Test 2: validateOutcome — plan-spec'd cases
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 2: validateOutcome plan-spec acceptance');
{
  // Plan §T1.4 Verify: "feed 'died in accident' → throws"
  assertThrows(
    'died in accident → throws',
    () => helper.validateOutcome('died in accident'),
    'died'
  );
  // Plan §T1.4 Verify: "feed 'minor injury' → returns true"
  assert('minor injury → returns true', helper.validateOutcome('minor injury') === true);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 3: validateOutcome — common chaos-cars outcomes (per plan Phase 2 vehicle examples)
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 3: validateOutcome accepts canonical chaos outcomes');
{
  const acceptable = [
    'ticket', 'arrested', 'helped_by_police', 'ice cream sales spike',
    'pothole repaired', 'garbage piled up', 'protest dispersed',
    'minor injury', 'business loss', 'fundraiser windfall',
  ];
  for (const o of acceptable) {
    assert(`accepts "${o}"`, helper.validateOutcome(o) === true);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Test 4: validateOutcome — every forbidden token rejected
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 4: validateOutcome rejects every FORBIDDEN_OUTCOMES token');
{
  for (const token of helper.FORBIDDEN_OUTCOMES) {
    const wrapped = 'event: ' + token + ' in the street';
    assertThrows(
      `rejects "${wrapped}"`,
      () => helper.validateOutcome(wrapped),
      token
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Test 5: validateOutcome — word boundaries (avoid false positives)
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 5: validateOutcome word boundaries — avoid false-positive on substring matches');
{
  // `deadline`, `killdeer` (bird), `dieseling` should NOT trip the forbidden list
  // because the forbidden tokens are word-boundary anchored. `fatalism` likewise —
  // \b matches between word/non-word, so `\bfatal\b` doesn't fire inside `fatalism`
  // (both `l` and `i` are word chars, no boundary between them).
  assert('"deadline approached" passes', helper.validateOutcome('deadline approached') === true);
  assert('"killdeer flew overhead" passes', helper.validateOutcome('killdeer flew overhead') === true);
  assert('"dieseling engine" passes', helper.validateOutcome('dieseling engine') === true);
  assert('"fatalism in voice" passes (no \\b break inside fatalism)',
    helper.validateOutcome('fatalism in voice') === true);

  // But standalone forbidden words inside larger strings SHOULD trip:
  assertThrows(
    '"the dead are buried" → throws (whole-word "dead")',
    () => helper.validateOutcome('the dead are buried'),
    'dead'
  );
  assertThrows(
    '"fatal accident reported" → throws (whole-word "fatal")',
    () => helper.validateOutcome('fatal accident reported'),
    'fatal'
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Test 6: validateOutcome — case insensitivity
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 6: validateOutcome case-insensitive');
{
  assertThrows('"DIED in accident" → throws', () => helper.validateOutcome('DIED in accident'), 'died');
  assertThrows('"KILLED the project" → throws', () => helper.validateOutcome('KILLED the project'), 'killed');
  assertThrows('"Deceased account holder" → throws',
    () => helper.validateOutcome('Deceased account holder'), 'deceased');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 7: validateOutcome — type + emptiness guards
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 7: validateOutcome input-shape guards');
{
  assertThrows('null → throws', () => helper.validateOutcome(null), 'expects a string');
  assertThrows('undefined → throws', () => helper.validateOutcome(undefined), 'expects a string');
  assertThrows('number → throws', () => helper.validateOutcome(42), 'expects a string');
  assertThrows('object → throws', () => helper.validateOutcome({ outcome: 'fine' }), 'expects a string');
  assertThrows('empty string → throws', () => helper.validateOutcome(''), 'empty outcome string');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 8: validateVehicleConfig — config-level scan
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 8: validateVehicleConfig scans full textureOutcomes[]');
{
  const cleanConfig = {
    name: 'ice_cream_truck',
    displayName: 'Ice cream truck',
    scopes: ['citizen'],
    textureOutcomes: [
      { outcome: 'mood boost',          weight: 0.5, severity: 'low' },
      { outcome: 'ice cream sales spike', weight: 0.3, severity: 'low' },
      { outcome: 'kid frenzy',          weight: 0.2, severity: 'low' },
    ],
  };
  assert('clean config passes', helper.validateVehicleConfig(cleanConfig) === true);

  const dirtyConfig = {
    name: 'cop_car',
    textureOutcomes: [
      { outcome: 'ticket',               weight: 0.5, severity: 'low' },
      { outcome: 'fatal shooting',       weight: 0.1, severity: 'high' }, // BANNED
      { outcome: 'helped_by_police',     weight: 0.4, severity: 'low' },
    ],
  };
  assertThrows(
    'config with banned outcome → throws + names vehicle',
    () => helper.validateVehicleConfig(dirtyConfig),
    'cop_car'
  );
  assertThrows(
    'config with banned outcome → throws + names forbidden token',
    () => helper.validateVehicleConfig(dirtyConfig),
    'fatal'
  );

  // Edge cases
  assertThrows('null config → throws', () => helper.validateVehicleConfig(null), 'expects an object');
  assert('config with empty textureOutcomes passes',
    helper.validateVehicleConfig({ name: 'x', textureOutcomes: [] }) === true);
  assert('config with missing textureOutcomes passes (Phase 2 schema validates)',
    helper.validateVehicleConfig({ name: 'x' }) === true);
  // Shape-mismatched entries skipped (Phase 2 schema validator's job, per T1.4 source comment)
  assert('entries without outcome string are skipped (Phase 2 problem)',
    helper.validateVehicleConfig({
      name: 'partial',
      textureOutcomes: [{ weight: 0.5 }, { outcome: 'ok' }],
    }) === true);
}

// ────────────────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
if (failed === 0) {
  console.log(`✓ all ${passed} assertions passed`);
  process.exit(0);
} else {
  console.error(`✗ ${failed}/${passed + failed} assertion(s) failed`);
  process.exit(1);
}
