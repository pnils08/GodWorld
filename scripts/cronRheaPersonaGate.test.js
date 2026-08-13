'use strict';

const assert = require('assert');
const packages = require('./newsroomWakePackages').loadPackages();
const { buildApiPrompt } = require('./cron-rhea-gate');

const profile = packages['freelance-firebrand'].reviewProfile;
const reviewContext = {
  profile,
  packageVersion: 'JAX-LEP2-1',
  manifest: {
    id: 'AM-TEST',
    policy: 'load-bearing',
    approvedQuotes: [{
      id: 'Q-TEST',
      speakerName: 'Test Citizen',
      text: 'This exact Packet quote is supplied.',
      src: 'packet.W2[TEST-CITIZEN]',
      factIds: ['F-TEST'],
    }],
  },
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
  '# TEST-ONLY Article\n\nA bartender on 7th spoke.\n\n## INTAKE\nCLAIM: Test-only | Initiative_Tracker row 4',
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
const draftSection = prompt.user.split('=== DRAFT TO VERIFY ===')[1].split('Your job is TWO flag classes')[0];
assert.ok(draftSection.includes('A bartender on 7th spoke.'));
assert.ok(!draftSection.includes('Initiative_Tracker'));
assert.ok(prompt.user.includes('machine-only ## INTAKE provenance block was validated separately'));
assert.ok(prompt.user.includes('EXACT PACKET QUOTE PROVENANCE'));
assert.ok(prompt.user.includes('Test Citizen: "This exact Packet quote is supplied."'));
assert.ok(prompt.user.includes('packet.W2[TEST-CITIZEN]; supports F-TEST'));
assert.ok(prompt.user.includes('Do not call an exact listed quote fabricated'));

const faithPrompt = buildApiPrompt(
  999,
  "# TEST-ONLY\n\nA visitor was spotted at B'nai Tikvah Synagogue.\n\n## INTAKE\nCLAIM: Test-only | source",
  'TEST-ONLY raw signal names Beth Jacob Congregation.',
  { canonNames: 0, verified: [], unverified: ["B'nai Tikvah Synagogue"] },
  [],
  [],
  null
);
assert.ok(faithPrompt.user.includes('AUTHORITATIVE FAITH CORRECTIONS FORWARD'));
assert.ok(faithPrompt.user.includes('BLOCKED "Beth Jacob Congregation" => CANON "B\'nai Tikvah Synagogue"'));
assert.ok(faithPrompt.user.includes('canon name on the right is not an invention'));

console.log('cronRheaPersonaGate.test.js: PASS');
