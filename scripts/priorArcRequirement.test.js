#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  ARTIFACT_CLASS,
  normalizePriorArcRequirement,
  formatWriterRequirement,
  formatReviewerEvidence,
} = require('./priorArcRequirement');

function fixture(overrides = {}) {
  return {
    schemaVersion: 1,
    artifactClass: ARTIFACT_CLASS,
    canonStatus: 'NOT_CANON',
    retrievalLane: 'prior-published-arc',
    currentAuthorityWins: true,
    articleUse: 'required',
    claim: 'NONCANON_TEST fourteen corridors contracted.',
    sourceTitle: 'NONCANON_TEST Edition.pdf',
    sourceId: '00000000-0000-4000-8000-000000000001',
    citationNumber: 8,
    excerpt: 'NONCANON_TEST supporting published excerpt.',
    ...overrides,
  };
}

const normalized = normalizePriorArcRequirement(fixture());
assert.strictEqual(normalized.articleUse, 'required');
assert.strictEqual(normalized.citationNumber, 8);

const writer = formatWriterRequirement(fixture());
assert.ok(writer.includes('Article BODY'));
assert.ok(writer.includes('PRIOR_PUBLISHED'));
assert.ok(writer.includes('NONCANON_TEST Edition.pdf'));
assert.ok(!writer.includes('00000000-0000-4000-8000-000000000001'));

const reviewer = formatReviewerEvidence(fixture());
assert.ok(reviewer.includes('VERIFIED PRIOR-PUBLISHED EVIDENCE'));
assert.ok(reviewer.includes('00000000-0000-4000-8000-000000000001'));

assert.throws(
  () => normalizePriorArcRequirement(fixture({ canonStatus: 'CANON' })),
  /NOT_CANON/
);
assert.throws(
  () => normalizePriorArcRequirement(fixture({ sourceId: '../escape' })),
  /UUID/
);
assert.throws(
  () => normalizePriorArcRequirement(fixture({ articleUse: 'optional' })),
  /required use/
);

console.log('priorArcRequirement tests: PASS');
