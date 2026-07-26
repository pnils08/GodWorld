#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  parseArgs,
  selectSourceIds,
  buildQueryArgs,
  validateQueryResponse,
  buildOutput,
} = require('./notebooklmCanonSearch');

function policyFixture() {
  return {
    allowedPublishedSourceIds: ['NONCANON_TEST_PUBLISHED'],
    allowedCanonReferenceSourceIds: ['NONCANON_TEST_REFERENCE'],
    excludedSourceIds: ['NONCANON_TEST_EXCLUDED'],
    decisions: {
      NONCANON_TEST_PUBLISHED: { title: 'NONCANON_TEST Edition' },
      NONCANON_TEST_REFERENCE: { title: 'NONCANON_TEST Richmond Origin' },
      NONCANON_TEST_EXCLUDED: { title: 'NONCANON_TEST Draft' },
    },
  };
}

function responseFixture() {
  return {
    answer: 'NONCANON_TEST answer [1]',
    conversation_id: 'NONCANON_TEST_CONVERSATION',
    sources_used: ['NONCANON_TEST_PUBLISHED'],
    citations: { 1: 'NONCANON_TEST_PUBLISHED' },
    references: [{
      source_id: 'NONCANON_TEST_PUBLISHED',
      citation_number: 1,
      cited_text: 'NONCANON_TEST cited excerpt',
    }],
  };
}

function testArgsAndCommand() {
  const args = parseArgs([
    'node',
    'script',
    '--question',
    'NONCANON_TEST question',
    '--source-class',
    'all',
    '--source-ids',
    'NONCANON_TEST_PUBLISHED,NONCANON_TEST_REFERENCE',
    '--timeout',
    '90',
  ]);
  assert.strictEqual(args.question, 'NONCANON_TEST question');
  assert.strictEqual(args.sourceClass, 'all');
  assert.strictEqual(args.timeoutSeconds, 90);
  assert.deepStrictEqual(args.sourceIds, [
    'NONCANON_TEST_PUBLISHED',
    'NONCANON_TEST_REFERENCE',
  ]);
  assert.throws(() => parseArgs(['node', 'script']), /question is required/);
  assert.throws(
    () => parseArgs(['node', 'script', '--question', 'x', '--timeout', '181']),
    /between 30 and 180/
  );

  assert.deepStrictEqual(
    buildQueryArgs('NONCANON_TEST_NOTEBOOK', 'question', ['NONCANON_TEST_PUBLISHED'], 90),
    [
      'notebook',
      'query',
      'NONCANON_TEST_NOTEBOOK',
      'question',
      '--json',
      '--source-ids',
      'NONCANON_TEST_PUBLISHED',
      '--timeout',
      '90',
    ]
  );
}

function testSourceSelectionFailsClosed() {
  const policy = policyFixture();
  assert.deepStrictEqual(
    selectSourceIds(policy, 'published', null),
    ['NONCANON_TEST_PUBLISHED']
  );
  assert.deepStrictEqual(
    selectSourceIds(policy, 'all', null),
    ['NONCANON_TEST_PUBLISHED', 'NONCANON_TEST_REFERENCE']
  );
  assert.throws(
    () => selectSourceIds(policy, 'published', ['NONCANON_TEST_REFERENCE']),
    /not approved for source class/
  );
  assert.throws(
    () => selectSourceIds(policy, 'all', ['NONCANON_TEST_EXCLUDED']),
    /explicitly excluded/
  );
  assert.throws(
    () => selectSourceIds(policy, 'all', ['NONCANON_TEST_UNKNOWN']),
    /not approved/
  );
}

function testValidResponseAndOutput() {
  const policy = policyFixture();
  const validated = validateQueryResponse(
    responseFixture(),
    ['NONCANON_TEST_PUBLISHED'],
    policy
  );
  assert.strictEqual(validated.answer, 'NONCANON_TEST answer [1]');
  assert.strictEqual(validated.sourceExcerpts[0].sourceTitle, 'NONCANON_TEST Edition');

  const output = buildOutput(
    { question: 'NONCANON_TEST question', sourceClass: 'published' },
    { notebookId: 'NONCANON_TEST_NOTEBOOK' },
    policy,
    ['NONCANON_TEST_PUBLISHED'],
    validated
  );
  assert.strictEqual(output.canonStatus, 'UNVERIFIED_SYNTHESIS');
  assert.strictEqual(output.verificationRequired, true);
  assert.match(output.questionHash, /^[a-f0-9]{64}$/);
  assert.ok(!Object.prototype.hasOwnProperty.call(output, 'question'));
}

function testResponseFailures() {
  const policy = policyFixture();
  const selected = ['NONCANON_TEST_PUBLISHED'];

  {
    const response = responseFixture();
    response.citations = {};
    assert.throws(() => validateQueryResponse(response, selected, policy), /empty citation map/);
  }
  {
    const response = responseFixture();
    delete response.conversation_id;
    assert.throws(() => validateQueryResponse(response, selected, policy), /no conversation ID/);
  }
  {
    const response = responseFixture();
    response.references = [];
    assert.throws(() => validateQueryResponse(response, selected, policy), /no source excerpts/);
  }
  {
    const response = responseFixture();
    response.citations[1] = 'NONCANON_TEST_REFERENCE';
    assert.throws(() => validateQueryResponse(response, selected, policy), /outside the selected scope/);
  }
  {
    const response = responseFixture();
    response.references[0].source_id = 'NONCANON_TEST_REFERENCE';
    assert.throws(() => validateQueryResponse(response, selected, policy), /disagrees/);
  }
  {
    const response = responseFixture();
    response.references = [];
    response.citations = { 1: 'NONCANON_TEST_PUBLISHED' };
    assert.throws(() => validateQueryResponse(response, selected, policy), /no source excerpts/);
  }
}

testArgsAndCommand();
testSourceSelectionFailsClosed();
testValidResponseAndOutput();
testResponseFailures();
console.log('notebooklmCanonSearch tests: PASS');
