'use strict';

const assert = require('assert');
const packages = require('./newsroomWakePackages').loadPackages();
const { buildApiPrompt } = require('./cron-rhea-gate');

const profile = packages['freelance-firebrand'].reviewProfile;
const reviewContext = {
  profile,
  packageVersion: 'JAX-LEP2-1',
  manifest: { id: 'AM-TEST', policy: 'load-bearing' },
  audit: {
    manifestId: 'AM-TEST',
    observations: [
      { code: 'UNAPPROVED_NUMBER', values: ['7th'] },
      { code: 'UNAPPROVED_QUOTE', values: ['Test-only bartender color.'] },
    ],
  },
};
const prompt = buildApiPrompt(
  999,
  '# TEST-ONLY Article\n\nA bartender on 7th spoke.',
  'TEST-ONLY world state',
  { canonNames: 1, verified: [], unverified: [] },
  [],
  [],
  reviewContext
);

assert.ok(prompt.user.includes('PERSONA-SPECIFIC SOURCING AUTHORITY'));
assert.ok(prompt.user.includes('jax-accountability-v1'));
assert.ok(prompt.user.includes('bartender'));
assert.ok(prompt.user.includes('not automatic flags'));
assert.ok(prompt.user.includes('Do not score whether the Article moves the sim'));
assert.ok(prompt.system.includes('canonIntegrity'));

console.log('cronRheaPersonaGate.test.js: PASS');
