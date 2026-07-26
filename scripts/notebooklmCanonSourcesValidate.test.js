#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { validatePolicy } = require('./notebooklmCanonSourcesValidate');

function fixture() {
  const inventory = {
    notebookId: 'NONCANON_TEST_NOTEBOOK',
    sources: [
      { id: 'NONCANON_TEST_PUBLISHED', title: 'NONCANON_TEST Edition' },
      { id: 'NONCANON_TEST_REFERENCE', title: 'NONCANON_TEST Richmond Origin' },
      { id: 'NONCANON_TEST_EXCLUDED', title: 'NONCANON_TEST Draft' },
    ],
  };
  const policy = {
    policyMode: 'fail_closed',
    notebookId: 'NONCANON_TEST_NOTEBOOK',
    allowedPublishedSourceIds: ['NONCANON_TEST_PUBLISHED'],
    allowedCanonReferenceSourceIds: ['NONCANON_TEST_REFERENCE'],
    excludedSourceIds: ['NONCANON_TEST_EXCLUDED'],
    decisions: {
      NONCANON_TEST_PUBLISHED: {
        title: 'NONCANON_TEST Edition',
        classification: 'published',
        reason: 'NONCANON_TEST published fixture',
        evidence: ['NONCANON_TEST evidence'],
      },
      NONCANON_TEST_REFERENCE: {
        title: 'NONCANON_TEST Richmond Origin',
        classification: 'canon-reference',
        reason: 'NONCANON_TEST verified Richmond Archive fixture',
        evidence: ['NONCANON_TEST evidence'],
      },
      NONCANON_TEST_EXCLUDED: {
        title: 'NONCANON_TEST Draft',
        classification: 'excluded',
        reason: 'NONCANON_TEST excluded fixture',
        evidence: ['NONCANON_TEST evidence'],
      },
    },
  };
  return { inventory, policy };
}

function testValidPolicy() {
  const { inventory, policy } = fixture();
  const result = validatePolicy(inventory, policy);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.inventoryCount, 3);
  assert.deepStrictEqual(result.counts, {
    published: 1,
    'canon-reference': 1,
    excluded: 1,
  });
}

function testCrossBucketDuplicateFails() {
  const { inventory, policy } = fixture();
  policy.excludedSourceIds.push('NONCANON_TEST_PUBLISHED');
  assert.throws(() => validatePolicy(inventory, policy), /appears in both/);
}

function testUnknownAndMissingFail() {
  {
    const { inventory, policy } = fixture();
    policy.allowedPublishedSourceIds.push('NONCANON_TEST_UNKNOWN');
    assert.throws(() => validatePolicy(inventory, policy), /unknown ID/);
  }
  {
    const { inventory, policy } = fixture();
    policy.excludedSourceIds = [];
    assert.throws(() => validatePolicy(inventory, policy), /unclassified/);
  }
}

function testDecisionContractFails() {
  {
    const { inventory, policy } = fixture();
    delete policy.decisions.NONCANON_TEST_EXCLUDED;
    assert.throws(() => validatePolicy(inventory, policy), /missing IDs/);
  }
  {
    const { inventory, policy } = fixture();
    policy.decisions.NONCANON_TEST_REFERENCE.reason = 'NONCANON_TEST reference';
    assert.throws(() => validatePolicy(inventory, policy), /admission basis/);
  }
}

testValidPolicy();
testCrossBucketDuplicateFails();
testUnknownAndMissingFail();
testDecisionContractFails();
console.log('notebooklmCanonSourcesValidate tests: PASS');
