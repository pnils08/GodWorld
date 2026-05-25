/**
 * ingestPublishedEntities.popid-aliases.test.js — T11 canon.3 / ADR-0007 contract
 *
 * Verifies the name-scoped POPID alias resolver. The key invariant: aliases
 * fire ONLY when the surface name matches the alias's canonical citizen,
 * never on the POPID alone — otherwise Sim_Ledger rows that occupy the
 * alias key for a different citizen would be silently shimmed (S233 caught
 * this pre-cut: POP-00020 is live Elena Vásquez, not phantom).
 *
 * Plan-premise correction: plan §T11 step 2 specified a naive `{POP-00020:
 * POP-00003}` map. Shipped semantic is name-scoped; this test enforces the
 * stricter contract.
 */

'use strict';

var assert = require('assert');
var mod = require('./ingestPublishedEntities.js');

function passing(name, fn) {
  try { fn(); console.log('  PASS  ' + name); return 1; }
  catch (e) { console.error('  FAIL  ' + name); console.error('        ' + (e.message || e)); return 0; }
}

var passed = 0;
var total = 0;

console.log('\n[T11] ingestPublishedEntities POPID aliases — name-scoped contract\n');

// ---------------------------------------------------------------------------
console.log('Group 1 — POPID_ALIASES table structure');

total++; passed += passing('table exports as an object', function () {
  assert.strictEqual(typeof mod.POPID_ALIASES, 'object');
  assert.ok(mod.POPID_ALIASES !== null);
});

total++; passed += passing('POP-00020 entry present with Aitken canonical', function () {
  var alias = mod.POPID_ALIASES['POP-00020'];
  assert.ok(alias, 'POP-00020 must be aliased');
  assert.strictEqual(alias.canonicalPopId, 'POP-00003');
  assert.ok(alias.surfaceNamePattern instanceof RegExp, 'surfaceNamePattern must be a regex (name-scoped contract)');
});

// ---------------------------------------------------------------------------
console.log('\nGroup 2 — resolvePopIdAlias — name-scoped fire conditions');

total++; passed += passing('POP-00020 + "Mark Aitken" → resolves to POP-00003', function () {
  assert.strictEqual(mod.resolvePopIdAlias('POP-00020', 'Mark Aitken'), 'POP-00003');
});

total++; passed += passing('POP-00020 + "mark aitken" (lowercase) → resolves (case-insensitive)', function () {
  assert.strictEqual(mod.resolvePopIdAlias('POP-00020', 'mark aitken'), 'POP-00003');
});

total++; passed += passing('POP-00020 + "Mark  Aitken" (double space) → resolves (whitespace tolerant)', function () {
  assert.strictEqual(mod.resolvePopIdAlias('POP-00020', 'Mark  Aitken'), 'POP-00003');
});

total++; passed += passing('POP-00020 + "Elena Vásquez" → returns POP-00020 unchanged (NO contamination)', function () {
  // The whole point of name-scoping. Sim_Ledger live state: POP-00020 = Elena Vásquez.
  // A naive map would shim Elena to Aitken and produce silent name drift on every
  // legitimate POP-00020 reference. Name-scope preserves the live row.
  assert.strictEqual(mod.resolvePopIdAlias('POP-00020', 'Elena Vásquez'), 'POP-00020');
});

total++; passed += passing('POP-00020 + "Random Other" → returns POP-00020 unchanged', function () {
  assert.strictEqual(mod.resolvePopIdAlias('POP-00020', 'Random Other'), 'POP-00020');
});

total++; passed += passing('POP-00020 + empty/null name → returns POP-00020 unchanged (defensive)', function () {
  assert.strictEqual(mod.resolvePopIdAlias('POP-00020', ''), 'POP-00020');
  assert.strictEqual(mod.resolvePopIdAlias('POP-00020', null), 'POP-00020');
  assert.strictEqual(mod.resolvePopIdAlias('POP-00020', undefined), 'POP-00020');
});

total++; passed += passing('POP-00003 + "Mark Aitken" → passthrough (no-op on canonical)', function () {
  // Canonical IDs never get aliased; a reporter writing the canonical form
  // continues to land correctly.
  assert.strictEqual(mod.resolvePopIdAlias('POP-00003', 'Mark Aitken'), 'POP-00003');
});

total++; passed += passing('unmapped POPID → passthrough', function () {
  assert.strictEqual(mod.resolvePopIdAlias('POP-99999', 'Whoever Anyone'), 'POP-99999');
  assert.strictEqual(mod.resolvePopIdAlias('POP-00500', 'Some Citizen'), 'POP-00500');
});

total++; passed += passing('non-POP prefixes pass through unaffected', function () {
  // BIZ-/CUL-/FAITH- IDs are not in the citizen alias table; alias resolver
  // returns them unchanged so the route to non-citizen handlers stays clean.
  assert.strictEqual(mod.resolvePopIdAlias('BIZ-00020', 'Some Business'), 'BIZ-00020');
  assert.strictEqual(mod.resolvePopIdAlias('CUL-00020', 'Some Cultural'), 'CUL-00020');
});

// ---------------------------------------------------------------------------
console.log('\nGroup 3 — defensive: name regex anchoring (no substring contamination)');

total++; passed += passing('POP-00020 + "Mark Aitken Foundation" → does NOT match (anchored)', function () {
  // surfaceNamePattern is anchored ^...$ so "Mark Aitken" as a substring of a
  // longer name does not fire the alias.
  assert.strictEqual(mod.resolvePopIdAlias('POP-00020', 'Mark Aitken Foundation'), 'POP-00020');
});

total++; passed += passing('POP-00020 + "Sir Mark Aitken" → does NOT match (anchored)', function () {
  assert.strictEqual(mod.resolvePopIdAlias('POP-00020', 'Sir Mark Aitken'), 'POP-00020');
});

// ---------------------------------------------------------------------------
console.log('\n[T11] ' + passed + '/' + total + ' assertions passed');
if (passed !== total) process.exit(1);
