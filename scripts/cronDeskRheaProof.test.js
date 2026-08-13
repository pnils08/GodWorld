'use strict';

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const { exactRheaProof, stagedRheaProof } = require('./cron-desk-run');

const article = '# TEST-ONLY Article\n\nSupplied fact.\n';
const sha = crypto.createHash('sha256').update(article).digest('hex');
const verdict = {
  pass: true,
  model: 'test-only-reviewer',
  draftSha256: sha,
  reviewProfile: { manifestId: 'TEST-ONLY-MANIFEST' },
  ranAt: 'TEST-ONLY-TIME'
};

assert.equal(exactRheaProof(verdict, article).ok, true);
assert.equal(exactRheaProof({ ...verdict, pass: false }, article).ok, false);
assert.equal(exactRheaProof({ ...verdict, draftSha256: '0'.repeat(64) }, article).ok, false);
assert.equal(exactRheaProof(verdict, article + 'mutation').ok, false);

const sidecarProof = stagedRheaProof(verdict, sha, path.join(__dirname, '..', 'output', 'cron-compare', 'test-only.rhea.json'));
assert.deepStrictEqual(sidecarProof, {
  pass: true,
  model: 'test-only-reviewer',
  manifestId: 'TEST-ONLY-MANIFEST',
  draftSha256: sha,
  verdict: 'output/cron-compare/test-only.rhea.json',
  ranAt: 'TEST-ONLY-TIME'
});

console.log('cron desk Rhea proof tests: PASS');
