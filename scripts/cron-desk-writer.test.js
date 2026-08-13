#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  normalizeArtifactTag,
  buildOutputSlug,
  formatStrictSourceHygiene,
  renderPacketIntake,
  resolveMaxToolCalls,
} = require('./cron-desk-writer');

assert.strictEqual(resolveMaxToolCalls(0), 0);
assert.strictEqual(resolveMaxToolCalls(6), 6);
assert.strictEqual(resolveMaxToolCalls(undefined), 6);
assert.strictEqual(resolveMaxToolCalls(-1), 6);

assert.strictEqual(normalizeArtifactTag(null), null);
assert.strictEqual(normalizeArtifactTag(''), null);
assert.strictEqual(normalizeArtifactTag('task7-baseline'), 'task7-baseline');
assert.throws(() => normalizeArtifactTag('Task7'), /artifact-tag/);
assert.throws(() => normalizeArtifactTag('../escape'), /artifact-tag/);
assert.throws(() => normalizeArtifactTag('a'.repeat(49)), /artifact-tag/);
assert.strictEqual(
  buildOutputSlug(null, 'dr-lila-mezran', 'deepseek-deepseek-chat'),
  'dr-lila-mezran_deepseek-deepseek-chat'
);
assert.strictEqual(
  buildOutputSlug('freelance-firebrand', null, 'deepseek-deepseek-chat'),
  'freelance-firebrand_deepseek-deepseek-chat'
);

const hygiene = formatStrictSourceHygiene({
  verified: ['NONCANON_TEST Citizen'],
  unverified: ['NONCANON_TEST Invented'],
});
assert.ok(hygiene.includes('STRICT SOURCE HYGIENE'));
assert.ok(hygiene.includes('NONCANON_TEST Citizen'));
assert.ok(hygiene.includes('NONCANON_TEST Invented'));
assert.ok(hygiene.includes('invent no anonymous') || hygiene.includes('Do not invent anonymous'));

const jaxHygiene = formatStrictSourceHygiene({ verified: [], unverified: [] }, {
  manifest: {
    policy: 'load-bearing',
    authorizedTexture: ['generic bar and anonymous bartender color'],
    textureConditions: ['not canon proof'],
  },
});
assert.ok(jaxHygiene.includes('persona profile still authorizes bounded narrative texture'));
assert.ok(jaxHygiene.includes('Anonymous role-only color is not an official source'));
assert.ok(jaxHygiene.includes('role-only anonymous voice may appear solely as authorized texture'));
assert.ok(jaxHygiene.includes('must not be attributed to a named citizen, official, institution, or canon source'));
assert.ok(!jaxHygiene.includes('overrides persona text that permits invented or anonymous sources'));

const normalized = renderPacketIntake(
  '# TEST-ONLY Article\n\nTest Citizen said, "Test concern." TEST-HOOD remains in the story.\n\n' +
  '## INTAKE\nBIZ: None |\nNAMES: Bad, Combined | role\n',
  {
    signal: { hood: 'TEST-HOOD', kind: 'test-signal', nearby: [] },
    exposure: {
      subjects: [{ name: 'Test Citizen' }],
      sources: [{ name: 'Test Citizen', quote: 'Test concern.' }],
    },
    known: [{ t: 'FACT', text: 'TEST-ONLY value | changed', src: 'output/TEST_ONLY.json rows[1]' }],
  }
);
assert.ok(normalized.includes('## INTAKE'));
assert.ok(normalized.includes('NAMES: Test Citizen | quoted-source'));
assert.ok(normalized.includes('STORYLINE: test-hood-test-citizen-test-signal | opened'));
assert.ok(normalized.includes('CLAIM: Test concern. | citizenVoice PRESS Test Citizen'));
assert.ok(!normalized.includes('BIZ: None'));
assert.equal(require('../lib/articleIntake').parse(normalized).errors.length, 0);

const withoutRuntimeClaim = renderPacketIntake('# TEST-ONLY Article\n\nTEST-ONLY sourced fact.\n', {
  signal: { hood: null, kind: 'test-signal', nearby: [] }, exposure: { subjects: [], sources: [] },
  known: [
    { t: 'FACT', text: 'Current cycle: C999', src: 'cron-desk-run explicit cycle argument' },
    { t: 'FACT', text: 'TEST-ONLY sourced fact', src: 'output/TEST_ONLY.json rows[2]' }
  ]
});
assert.ok(withoutRuntimeClaim.includes('CLAIM: TEST-ONLY sourced fact | output/TEST_ONLY.json rows[2]'));
assert.ok(!withoutRuntimeClaim.includes('CLAIM: Current cycle: C999'));

console.log('cron-desk-writer artifact-tag tests: PASS');
