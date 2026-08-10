'use strict';

const assert = require('assert');
const packagesApi = require('./newsroomWakePackages');

const packages = packagesApi.loadPackages();
const active = packagesApi.activePackages(packages);
assert.deepStrictEqual(active.map(row => row.key), ['freelance-firebrand']);

const jax = packages['freelance-firebrand'];
assert.equal(jax.packetContract, 'v2');
assert.equal(packagesApi.routeFor(jax, 'angle').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(jax, 'report').model, 'meta-llama/llama-3.3-70b-instruct');
assert.equal(packagesApi.routeFor(jax, 'write').model, 'anthropic/claude-sonnet-5');
assert.equal(jax.reviewProfile.canonPolicy, 'load-bearing');
assert.ok(jax.reviewProfile.authorizedTexture.some(v => v.includes('bartender')));
assert.ok(jax.reviewProfile.canonBlockers.some(v => v.includes('official inaction')));

const gate = packagesApi.gateAssignments([
  { desk: 'civic', name: 'Jax Caldera', persona: 'freelance-firebrand' },
  { desk: 'sports', name: 'TEST-ONLY Unpackaged Reporter', persona: 'test-only' },
], packages);
assert.equal(gate.eligible.length, 1);
assert.equal(gate.eligible[0].wakePackage, 'JAX-LEP2-1');
assert.equal(gate.skipped.length, 1);
assert.equal(gate.skipped[0].reason, 'no-active-wake-package');

assert.throws(() => packagesApi.routeFor(jax, 'publish'), /unknown wake stage/);
assert.throws(() => packagesApi.validatePackage('bad', { active: true }), /invalid wake package/);

const { applyWakePackageGate } = require('./newsroom-fanout');
const pinned = applyWakePackageGate([
  { desk: 'civic', name: 'TEST-ONLY Civic Reporter', popid: 'POP-99998', story: { ref: 'TEST-ONLY', label: 'Test signal' } },
  { desk: 'sports', name: 'TEST-ONLY Sports Reporter', popid: 'POP-99999' },
], { civic: 'generic civic', 'freelance-firebrand': 'Jax accountability' }, packages);
assert.equal(pinned.assignments.length, 1);
assert.equal(pinned.assignments[0].name, 'Jax Caldera');
assert.equal(pinned.assignments[0].approach, 'Jax accountability');
assert.equal(pinned.assignments[0].story.ref, 'TEST-ONLY');
assert.equal(pinned.pinned[0].replaced, 'TEST-ONLY Civic Reporter');
assert.equal(pinned.skipped[0].name, 'TEST-ONLY Sports Reporter');

console.log('newsroomWakePackages.test.js: PASS');
