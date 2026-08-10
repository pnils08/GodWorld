'use strict';

const assert = require('assert');
const packagesApi = require('./newsroomWakePackages');

const packages = packagesApi.loadPackages();
const active = packagesApi.activePackages(packages);
assert.deepStrictEqual(active.map(row => row.key), ['freelance-firebrand', 'carmen-delaine']);

const jax = packages['freelance-firebrand'];
assert.equal(jax.version, 'JAX-LEP2-1');
assert.equal(jax.requiredDaily, true);
assert.equal(jax.assignment.name, 'Jax Caldera');
assert.equal(jax.assignment.popid, 'POP-00799');
assert.equal(jax.packetContract, 'v2');
assert.equal(packagesApi.routeFor(jax, 'angle').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(jax, 'report').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(jax, 'write').model, 'anthropic/claude-sonnet-5');
assert.equal(jax.reviewProfile.canonPolicy, 'load-bearing');
assert.ok(jax.reviewProfile.authorizedTexture.some(v => v.includes('bartender')));
assert.ok(jax.reviewProfile.canonBlockers.some(v => v.includes('official inaction')));

const carmen = packages['carmen-delaine'];
assert.equal(carmen.version, 'CARMEN-LEP2-1');
assert.equal(carmen.requiredDaily, true);
assert.equal(carmen.assignment.desk, 'civic');
assert.equal(carmen.assignment.name, 'Carmen Delaine');
assert.equal(carmen.assignment.popid, 'POP-00011');
assert.equal(carmen.packetContract, 'v2');
assert.equal(packagesApi.routeFor(carmen, 'angle').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(carmen, 'report').model, 'deepseek/deepseek-chat');
assert.equal(packagesApi.routeFor(carmen, 'write').model, 'deepseek/deepseek-chat');
assert.equal(carmen.reviewProfile.canonPolicy, 'load-bearing');
assert.ok(carmen.reviewProfile.textureConditions.some(v => v.includes('all nine seats')));
assert.ok(carmen.reviewProfile.canonBlockers.some(v => v.includes('implementation clock')));

const gate = packagesApi.gateAssignments([
  { desk: 'civic', name: 'Jax Caldera', persona: 'freelance-firebrand' },
  { desk: 'civic', name: 'Carmen Delaine', persona: 'carmen-delaine' },
  { desk: 'sports', name: 'TEST-ONLY Unpackaged Reporter', persona: 'test-only' },
], packages);
assert.equal(gate.eligible.length, 2);
assert.equal(gate.eligible[0].wakePackage, 'JAX-LEP2-1');
assert.equal(gate.eligible[1].wakePackage, 'CARMEN-LEP2-1');
assert.equal(gate.skipped.length, 1);
assert.equal(gate.skipped[0].reason, 'no-active-wake-package');

assert.throws(() => packagesApi.routeFor(jax, 'publish'), /unknown wake stage/);
assert.throws(() => packagesApi.validatePackage('bad', { active: true }), /invalid wake package/);

const { applyWakePackageGate } = require('./newsroom-fanout');
const pinned = applyWakePackageGate([
  { desk: 'civic', name: 'TEST-ONLY Civic One', popid: 'POP-99997', story: { ref: 'TEST-CIVIC-ONE', label: 'Test signal one' } },
  { desk: 'civic', name: 'TEST-ONLY Civic Two', popid: 'POP-99998', story: { ref: 'TEST-CIVIC-TWO', label: 'Test signal two' } },
  { desk: 'sports', name: 'TEST-ONLY Sports Reporter', popid: 'POP-99999' },
], {
  civic: 'generic civic',
  'freelance-firebrand': 'Jax accountability',
  'carmen-delaine': 'Carmen civic ledger',
}, packages);
assert.equal(pinned.assignments.length, 2);
assert.equal(pinned.assignments[0].name, 'Jax Caldera');
assert.equal(pinned.assignments[0].approach, 'Jax accountability');
assert.equal(pinned.assignments[0].story.ref, 'TEST-CIVIC-ONE');
assert.equal(pinned.assignments[1].name, 'Carmen Delaine');
assert.equal(pinned.assignments[1].approach, 'Carmen civic ledger');
assert.equal(pinned.assignments[1].story.ref, 'TEST-CIVIC-TWO');
assert.deepStrictEqual(pinned.pinned.map(row => row.replaced),
  ['TEST-ONLY Civic One', 'TEST-ONLY Civic Two']);
assert.equal(pinned.skipped[0].name, 'TEST-ONLY Sports Reporter');

// Registry order cannot let one required civic package overwrite the other.
const reversedPackages = {
  'carmen-delaine': carmen,
  'freelance-firebrand': jax,
};
const reversed = applyWakePackageGate([
  { desk: 'civic', name: 'Carmen Delaine', popid: 'POP-00011', persona: 'carmen-delaine', story: { ref: 'TEST-CARMEN' } },
  { desk: 'civic', name: 'TEST-ONLY Civic Open Seat', popid: 'POP-99996', story: { ref: 'TEST-JAX' } },
], { civic: 'generic civic', 'freelance-firebrand': 'Jax accountability' }, reversedPackages);
assert.deepStrictEqual(reversed.assignments.map(row => row.persona),
  ['carmen-delaine', 'freelance-firebrand']);
assert.equal(reversed.assignments[0].story.ref, 'TEST-CARMEN');
assert.equal(reversed.assignments[1].story.ref, 'TEST-JAX');

// A desk shortfall adds the missing required civic seat; it never steals sports.
const shortDesk = applyWakePackageGate([
  { desk: 'civic', name: 'TEST-ONLY Civic Solo', popid: 'POP-99995', story: { ref: 'TEST-CIVIC' } },
  { desk: 'sports', name: 'TEST-ONLY Sports Preserved', popid: 'POP-99994', story: { ref: 'TEST-SPORTS' } },
], { civic: 'generic civic' }, packages);
assert.equal(shortDesk.assignments.length, 2);
assert.deepStrictEqual(new Set(shortDesk.assignments.map(row => row.persona)),
  new Set(['freelance-firebrand', 'carmen-delaine']));
assert.ok(shortDesk.skipped.some(row => row.name === 'TEST-ONLY Sports Preserved'));
assert.ok(shortDesk.pinned.some(row => row.replaced === null));

console.log('newsroomWakePackages.test.js: PASS');
