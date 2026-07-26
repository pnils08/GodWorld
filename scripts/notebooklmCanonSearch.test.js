#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  parseArgs,
  selectSourceIds,
  buildQueryArgs,
  validateQueryResponse,
  hashQuestion,
  resolveLogPath,
  classifyResultStatus,
  buildRetrievalRecord,
  appendRetrievalLog,
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
    '--log-path',
    'output/codex/NONCANON_TEST-retrieval.jsonl',
  ]);
  assert.strictEqual(args.question, 'NONCANON_TEST question');
  assert.strictEqual(args.sourceClass, 'all');
  assert.strictEqual(args.timeoutSeconds, 90);
  assert.strictEqual(args.logPath, 'output/codex/NONCANON_TEST-retrieval.jsonl');
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

function testRetrievalStatusClassification() {
  assert.strictEqual(
    classifyResultStatus(new Error('policy mismatch'), 'not_run'),
    'not_run'
  );
  assert.strictEqual(
    classifyResultStatus(new Error('authentication required; login again'), 'query'),
    'auth_failure'
  );
  assert.strictEqual(
    classifyResultStatus(new Error('nlm notebook query returned invalid JSON'), 'query'),
    'no_result'
  );
  assert.strictEqual(
    classifyResultStatus(new Error('NotebookLM response has no answer'), 'response_validation'),
    'no_result'
  );
  assert.strictEqual(
    classifyResultStatus(new Error('NotebookLM response has an empty citation map'), 'response_validation'),
    'citation_failure'
  );
}

function testRetrievalLogIsMetadataOnly() {
  const selectedSourceIds = ['NONCANON_TEST_PUBLISHED'];
  const validated = validateQueryResponse(responseFixture(), selectedSourceIds, policyFixture());
  const args = {
    question: 'NONCANON_TEST private raw question',
    sourceClass: 'published',
  };
  const record = buildRetrievalRecord({
    args,
    questionHint: '',
    selectedSourceIds,
    validated,
    resultStatus: 'verified',
    startedAt: 1000,
    finishedAt: 1260,
  });
  assert.strictEqual(record.resultStatus, 'verified');
  assert.strictEqual(record.reconcileVerdict, 'prior-only');
  assert.strictEqual(record.citationCount, 1);
  assert.strictEqual(record.durationMs, 260);
  assert.deepStrictEqual(record.usedSourceIds, ['NONCANON_TEST_PUBLISHED']);
  assert.strictEqual(record.questionHash, hashQuestion(args.question));

  const serialized = JSON.stringify(record);
  assert.ok(!serialized.includes(args.question));
  assert.ok(!serialized.includes('NONCANON_TEST answer'));
  assert.ok(!serialized.includes('NONCANON_TEST cited excerpt'));
  assert.ok(!serialized.includes('NONCANON_TEST_CONVERSATION'));

  const failed = buildRetrievalRecord({
    args,
    questionHint: '',
    selectedSourceIds,
    validated: null,
    resultStatus: 'citation_failure',
    startedAt: 1000,
    finishedAt: 1300,
  });
  assert.strictEqual(failed.reconcileVerdict, 'no-result');
  assert.strictEqual(failed.citationCount, 0);
  assert.deepStrictEqual(failed.usedSourceIds, []);

  assert.throws(
    () => resolveLogPath('docs/NONCANON_TEST-retrieval.jsonl'),
    /inside output/
  );
  assert.throws(
    () => resolveLogPath('output/codex/NONCANON_TEST-retrieval.json'),
    /\.jsonl extension/
  );

  const relativeLogPath =
    'output/codex/NONCANON_TEST-notebooklm-retrieval-' + process.pid + '.jsonl';
  const absoluteLogPath = resolveLogPath(relativeLogPath);
  try {
    appendRetrievalLog(relativeLogPath, record);
    const lines = fs.readFileSync(absoluteLogPath, 'utf8').trim().split('\n');
    assert.strictEqual(lines.length, 1);
    assert.deepStrictEqual(JSON.parse(lines[0]), record);
    assert.strictEqual(path.extname(absoluteLogPath), '.jsonl');
  } finally {
    if (fs.existsSync(absoluteLogPath)) fs.unlinkSync(absoluteLogPath);
  }
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
testRetrievalStatusClassification();
testRetrievalLogIsMetadataOnly();
testValidResponseAndOutput();
testResponseFailures();
console.log('notebooklmCanonSearch tests: PASS');
