#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  normalizeArtifactTag,
  buildOutputSlug,
  formatStrictSourceHygiene,
} = require('./cron-desk-writer');

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

console.log('cron-desk-writer artifact-tag tests: PASS');
