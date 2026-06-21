/**
 * chaosCarsConfig.test.js — engine.11 chaos-cars config + no-death coverage.
 *
 * Pairs with utilities/chaosCarsConfig.js (RELOCATED S265 from lib/ — see that
 * file's header for why). Tests 1–8: T1.4 no-death validator (unchanged behavior
 * after the var/global rewrite). Tests 9–10: T2 config table + validateAllChaosConfigs_.
 *
 * Run: node utilities/chaosCarsConfig.test.js   (exit 0 pass / 1 fail)
 * Claspignored via *.test.js — Node-only, never pushed.
 *
 * Plan: docs/plans/2026-05-07-chaos-cars-engine.md §T1.4 / §T2 / §S265.
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
  assert('exports.VEHICLE_CONFIGS present', Array.isArray(helper.VEHICLE_CONFIGS));
  assert('exports.loadChaosCarsConfig_ is function', typeof helper.loadChaosCarsConfig_ === 'function');
  assert('exports.validateAllChaosConfigs_ is function', typeof helper.validateAllChaosConfigs_ === 'function');
  assert('FORBIDDEN_OUTCOMES is frozen', Object.isFrozen(helper.FORBIDDEN_OUTCOMES));
  for (const required of ['death', 'died', 'dying', 'fatal', 'killed', 'kill', 'deceased', 'dead']) {
    assert(`FORBIDDEN_OUTCOMES contains "${required}"`, helper.FORBIDDEN_OUTCOMES.indexOf(required) >= 0);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Test 2: validateOutcome — plan-spec'd cases
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 2: validateOutcome plan-spec acceptance');
{
  assertThrows('died in accident → throws', () => helper.validateOutcome('died in accident'), 'died');
  assert('minor injury → returns true', helper.validateOutcome('minor injury') === true);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 3: validateOutcome — common chaos-cars outcomes
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
    assertThrows(`rejects "${wrapped}"`, () => helper.validateOutcome(wrapped), token);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Test 5: validateOutcome — word boundaries (avoid false positives)
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 5: validateOutcome word boundaries — avoid false-positive on substring matches');
{
  assert('"deadline approached" passes', helper.validateOutcome('deadline approached') === true);
  assert('"killdeer flew overhead" passes', helper.validateOutcome('killdeer flew overhead') === true);
  assert('"dieseling engine" passes', helper.validateOutcome('dieseling engine') === true);
  assert('"fatalism in voice" passes (no \\b break inside fatalism)',
    helper.validateOutcome('fatalism in voice') === true);
  assertThrows('"the dead are buried" → throws (whole-word "dead")',
    () => helper.validateOutcome('the dead are buried'), 'dead');
  assertThrows('"fatal accident reported" → throws (whole-word "fatal")',
    () => helper.validateOutcome('fatal accident reported'), 'fatal');
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
    name: 'ice_cream_truck', displayName: 'Ice cream truck', scopes: ['citizen'],
    textureOutcomes: [
      { outcome: 'mood boost', weight: 0.5, severity: 'low' },
      { outcome: 'ice cream sales spike', weight: 0.3, severity: 'low' },
      { outcome: 'kid frenzy', weight: 0.2, severity: 'low' },
    ],
  };
  assert('clean config passes', helper.validateVehicleConfig(cleanConfig) === true);

  const dirtyConfig = {
    name: 'cop_car',
    textureOutcomes: [
      { outcome: 'ticket', weight: 0.5, severity: 'low' },
      { outcome: 'fatal shooting', weight: 0.1, severity: 'high' },
      { outcome: 'helped_by_police', weight: 0.4, severity: 'low' },
    ],
  };
  assertThrows('config with banned outcome → throws + names vehicle',
    () => helper.validateVehicleConfig(dirtyConfig), 'cop_car');
  assertThrows('config with banned outcome → throws + names forbidden token',
    () => helper.validateVehicleConfig(dirtyConfig), 'fatal');

  assertThrows('null config → throws', () => helper.validateVehicleConfig(null), 'expects an object');
  assert('config with empty textureOutcomes passes',
    helper.validateVehicleConfig({ name: 'x', textureOutcomes: [] }) === true);
  assert('config with missing textureOutcomes passes',
    helper.validateVehicleConfig({ name: 'x' }) === true);
  assert('entries without outcome string are skipped',
    helper.validateVehicleConfig({ name: 'partial', textureOutcomes: [{ weight: 0.5 }, { outcome: 'ok' }] }) === true);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 9: VEHICLE_CONFIGS table — §S265 finalized shape
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 9: VEHICLE_CONFIGS finalized 10-vehicle table');
{
  const cfgs = helper.loadChaosCarsConfig_();
  assert('loadChaosCarsConfig_ returns the array', cfgs === helper.VEHICLE_CONFIGS);
  assert('exactly 10 vehicles', cfgs.length === 10);

  const EXPECTED = ['cop_car', 'fire_engine', 'ambulance', 'oari_van', 'building_inspector',
    'garbage_truck', 'mail_truck', 'ice_cream_truck', 'street_sweeper', 'pge_truck'];
  const names = cfgs.map((c) => c.name);
  for (const n of EXPECTED) assert(`vehicle "${n}" present`, names.indexOf(n) >= 0);

  const VALID_SCOPES = { citizen: 1, business: 1, neighborhood: 1 };
  const VALID_COLS = {
    Sentiment: 1, CrimeIndex: 1, RetailVitality: 1, EventAttractiveness: 1,
    Annual_Revenue: 1, Employee_Count: 1,
  };
  for (const c of cfgs) {
    assert(`${c.name}: has baseFrequencyWeight > 0`, Number(c.baseFrequencyWeight) > 0);
    assert(`${c.name}: scopes non-empty`, Array.isArray(c.scopes) && c.scopes.length > 0);
    assert(`${c.name}: all scopes valid`, c.scopes.every((s) => VALID_SCOPES[s]));
    // texture weights sum ~1.0
    const sum = c.textureOutcomes.reduce((a, o) => a + (Number(o.weight) || 0), 0);
    assert(`${c.name}: texture weights sum ~1.0 (got ${sum.toFixed(3)})`, Math.abs(sum - 1) <= 0.001);
    // every outcome string passes no-death
    for (const o of c.textureOutcomes) {
      assert(`${c.name}/${o.outcome}: outcome passes no-death`, helper.validateOutcome(o.outcome) === true);
    }
    // metricImpacts: real columns, valid scope, no citizen-scope impact
    for (const m of (c.metricImpacts || [])) {
      assert(`${c.name}: impact column "${m.column}" is real`, !!VALID_COLS[m.column]);
      assert(`${c.name}: impact scope "${m.scope}" is biz|nbhd`,
        m.scope === 'business' || m.scope === 'neighborhood');
      assert(`${c.name}: impact direction valid`, m.direction === 'up' || m.direction === 'down');
      assert(`${c.name}: magnitudeRange [min<=max]`,
        Array.isArray(m.magnitudeRange) && m.magnitudeRange[0] <= m.magnitudeRange[1]);
    }
  }

  // §S265 specifics: arrest is the agent/integrity tag; OARI carries coverageContribution;
  // ice_cream + street_sweeper carry NO high-severity outcome.
  const cop = cfgs.find((c) => c.name === 'cop_car');
  const arrest = cop.textureOutcomes.find((o) => o.outcome === 'arrested');
  assert('cop arrested → Transgression-Serious tag', arrest.lifeHistoryTag === 'Transgression-Serious');
  assert('cop arrested → role agent', arrest.role === 'agent');
  assert('cop arrested → severity high', arrest.severity === 'high');

  const oari = cfgs.find((c) => c.name === 'oari_van');
  assert('oari has a coverageContribution outcome',
    oari.textureOutcomes.some((o) => o.coverageContribution === true));

  for (const lo of ['ice_cream_truck', 'street_sweeper']) {
    const v = cfgs.find((c) => c.name === lo);
    assert(`${lo}: no high-severity outcome (never cascades)`,
      v.textureOutcomes.every((o) => o.severity !== 'high'));
  }

  // building_inspector Employee_Count impact is outcome-conditional
  const insp = cfgs.find((c) => c.name === 'building_inspector');
  const empImpact = insp.metricImpacts.find((m) => m.column === 'Employee_Count');
  assert('inspector Employee_Count impact is gated onOutcome',
    !!empImpact && empImpact.onOutcome === 'forced_temporary_closure');
}

// ────────────────────────────────────────────────────────────────────────────
// Test 10: validateAllChaosConfigs_ passes on the live table
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 10: validateAllChaosConfigs_ on the finalized table');
{
  assert('validateAllChaosConfigs_ returns true', helper.validateAllChaosConfigs_() === true);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 11: B11 (verify-fix) — lifeHistoryTags validated against the REAL DIAL_MAP
// ────────────────────────────────────────────────────────────────────────────
console.log('\nTest 11: lifeHistoryTag validated against DIAL_MAP when in scope');
{
  const dialMod = require('./citizenDialMap');
  global.DIAL_MAP = dialMod.DIAL_MAP;
  assert('all config lifeHistoryTags are real DIAL_MAP keys', helper.validateAllChaosConfigs_() === true);
  // every tag the table uses resolves
  const tags = [];
  for (const v of helper.VEHICLE_CONFIGS) for (const o of v.textureOutcomes) if (o.lifeHistoryTag) tags.push(o.lifeHistoryTag);
  assert('config uses >=1 tag', tags.length > 0);
  assert('every used tag exists in DIAL_MAP', tags.every((t) => !!dialMod.DIAL_MAP[t]));
  // a typo'd tag must throw (would fold to +composure otherwise)
  const orig = helper.VEHICLE_CONFIGS[0].textureOutcomes[0].lifeHistoryTag;
  helper.VEHICLE_CONFIGS[0].textureOutcomes[0].lifeHistoryTag = 'Setbck'; // typo
  let threw = false;
  try { helper.validateAllChaosConfigs_(); } catch (e) { threw = /not a DIAL_MAP key/.test(e.message); }
  assert('typo tag → throws at config-load', threw);
  helper.VEHICLE_CONFIGS[0].textureOutcomes[0].lifeHistoryTag = orig; // restore
  delete global.DIAL_MAP;
}

// ────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
if (failed === 0) {
  console.log(`✓ all ${passed} assertions passed`);
  process.exit(0);
} else {
  console.error(`✗ ${failed}/${passed + failed} assertion(s) failed`);
  process.exit(1);
}
