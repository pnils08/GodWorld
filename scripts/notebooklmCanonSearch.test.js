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
  normalizeLiveSources,
  assertScopeReady,
  openPolicyFromSources,
  main,
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

function liveListFixture() {
  return [
    { id: 'NONCANON_TEST_PUBLISHED', title: 'NONCANON_TEST Edition', type: 'pdf', status: 2 },
    { id: 'NONCANON_TEST_EXCLUDED', title: 'NONCANON_TEST Draft', type: 'pdf', status: 2 },
    { id: 'NONCANON_TEST_NEW', title: 'NONCANON_TEST Added Later', type: 'generated_text', status: 2 },
  ];
}

function testOpenPolicyCoversWholeNotebook() {
  const policy = { ...policyFixture(), notebookId: 'NONCANON_TEST_NB' };
  const sources = normalizeLiveSources(liveListFixture());
  const open = openPolicyFromSources(sources, policy);
  const ids = selectSourceIds(open, 'published', null);
  assert.deepStrictEqual(ids, sources.map((source) => source.id));
  assert.strictEqual(open.decisions.NONCANON_TEST_NEW.title, 'NONCANON_TEST Added Later');
  assert.strictEqual(open.decisions.NONCANON_TEST_PUBLISHED.title, 'NONCANON_TEST Edition');
  assert.strictEqual(selectSourceIds(open, 'all', null).length, 3);
  assert.deepStrictEqual(open.excludedSourceIds, []);
  // A policy id no longer in the notebook is out of scope.
  assert.throws(
    () => selectSourceIds(open, 'all', ['NONCANON_TEST_REFERENCE']),
    /not approved/
  );
}

function testLiveListingShapeContract() {
  const ok = normalizeLiveSources([{ source_id: ' NONCANON_TEST_A ', name: 'NONCANON_TEST A', status: 2 }]);
  assert.deepStrictEqual(ok, [{ id: 'NONCANON_TEST_A', title: 'NONCANON_TEST A', status: 2 }]);
  const item = { id: 'NONCANON_TEST_A', title: 'NONCANON_TEST A', status: 2 };
  assert.throws(() => normalizeLiveSources({ sources: [item] }), /JSON array/);
  assert.throws(() => normalizeLiveSources([]), /no sources/);
  assert.throws(() => normalizeLiveSources([null]), /must be an object/);
  assert.throws(() => normalizeLiveSources([{ ...item, id: '' }]), /no source ID/);
  assert.throws(() => normalizeLiveSources([{ ...item, title: ' ' }]), /no title/);
  assert.throws(() => normalizeLiveSources([{ ...item, status: '2' }]), /integer status/);
  assert.throws(() => normalizeLiveSources([{ ...item, status: undefined }]), /integer status/);
  assert.throws(() => normalizeLiveSources([item, { ...item }]), /repeats source ID/);
}

function testNotReadySourcesFailTheCall() {
  const sources = normalizeLiveSources([
    { id: 'NONCANON_TEST_A', title: 'NONCANON_TEST A', status: 2 },
    { id: 'NONCANON_TEST_B', title: 'NONCANON_TEST B', status: 1 },
    { id: 'NONCANON_TEST_C', title: 'NONCANON_TEST C', status: 3 },
  ]);
  assert.throws(
    () => assertScopeReady(sources, null),
    /not ready: NONCANON_TEST_B "NONCANON_TEST B" \(status 1\); NONCANON_TEST_C "NONCANON_TEST C" \(status 3\)/
  );
  assert.doesNotThrow(() => assertScopeReady(sources, ['NONCANON_TEST_A']));
  assert.throws(() => assertScopeReady(sources, ['NONCANON_TEST_B']), /requested source not ready/);
  assert.throws(() => assertScopeReady(sources, ['NONCANON_TEST_GONE']), /not in the notebook/);
  const open = openPolicyFromSources(sources, policyFixture());
  assert.deepStrictEqual(open.allowedPublishedSourceIds, ['NONCANON_TEST_A']);
}

// main() end to end with the listing and the query injected: the scope is the
// live listing, and every listing failure is logged with zero query calls.
function testMainScopesToLiveListing() {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'notebooklm.json'), 'utf8'));
  const relativeLogPath =
    'output/codex/NONCANON_TEST-notebooklm-main-' + process.pid + '.jsonl';
  const absoluteLogPath = resolveLogPath(relativeLogPath);
  const argv = (extra) => ['node', 'notebooklmCanonSearch.js', '--question', 'NONCANON_TEST question',
    '--log-path', relativeLogPath].concat(extra || []);
  const records = () => fs.readFileSync(absoluteLogPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  const response = (id) => ({
    answer: 'NONCANON_TEST answer [1]',
    conversation_id: 'NONCANON_TEST_CONVERSATION',
    sources_used: [id],
    citations: { 1: id },
    references: [{ source_id: id, citation_number: 1, cited_text: 'NONCANON_TEST cited excerpt' }],
  });
  const ready = [
    { id: 'NONCANON_TEST_A', title: 'NONCANON_TEST A', status: 2 },
    { id: 'NONCANON_TEST_B', title: 'NONCANON_TEST B', status: 2 },
  ];
  const realLog = console.log;
  try {
    // Success: the query is scoped to every ready live source.
    const queries = [];
    let printed = '';
    let listedFor = null;
    console.log = (text) => { printed += text; };
    try {
      main(argv(), {
        listSources: (notebookId) => { listedFor = notebookId; return ready; },
        runQuery: (queryArgs) => { queries.push(queryArgs); return response('NONCANON_TEST_B'); },
      });
    } finally {
      console.log = realLog;
    }
    assert.strictEqual(listedFor, config.notebookId);
    assert.strictEqual(queries.length, 1);
    assert.strictEqual(queries[0][queries[0].indexOf('--source-ids') + 1], 'NONCANON_TEST_A,NONCANON_TEST_B');
    const output = JSON.parse(printed);
    assert.deepStrictEqual(output.selectedSourceIds, ['NONCANON_TEST_A', 'NONCANON_TEST_B']);
    assert.strictEqual(output.sourceExcerpts[0].sourceTitle, 'NONCANON_TEST B');
    let last = records().pop();
    assert.strictEqual(last.resultStatus, 'verified');
    assert.deepStrictEqual(last.selectedSourceIds, ['NONCANON_TEST_A', 'NONCANON_TEST_B']);

    // Failures: each throws, logs its status, and never queries.
    const cases = [
      { list: () => { throw new Error('nlm source list failed: Authentication expired, run nlm login'); }, status: 'auth_failure', match: /Authentication/ },
      { list: () => { throw new Error('nlm source list failed: spawnSync ETIMEDOUT'); }, status: 'no_result', match: /ETIMEDOUT/ },
      { list: () => ({ sources: ready }), status: 'no_result', match: /JSON array/ },
      { list: () => [], status: 'no_result', match: /no sources/ },
      { list: () => [ready[0], { id: 'NONCANON_TEST_B', status: 2 }], status: 'no_result', match: /no title/ },
      { list: () => [ready[0], { ...ready[0] }], status: 'no_result', match: /repeats/ },
      { list: () => [ready[0], { ...ready[1], status: 1 }], status: 'no_result', match: /not ready: NONCANON_TEST_B/ },
      { list: () => ready, extra: ['--source-ids', 'NONCANON_TEST_GONE'], status: 'no_result', match: /not in the notebook/ },
      { list: () => [ready[0], { ...ready[1], status: 5 }], extra: ['--source-ids', 'NONCANON_TEST_B'], status: 'no_result', match: /requested source not ready/ },
      { list: () => ready, extra: ['--source-ids', 'NONCANON_TEST_A,NONCANON_TEST_A'], status: 'not_run', match: /duplicate/ },
    ];
    for (const testCase of cases) {
      let queried = 0;
      assert.throws(
        () => main(argv(testCase.extra), { listSources: testCase.list, runQuery: () => { queried++; return response('NONCANON_TEST_A'); } }),
        testCase.match
      );
      assert.strictEqual(queried, 0, 'queried on a rejected scope: ' + testCase.match);
      last = records().pop();
      assert.strictEqual(last.resultStatus, testCase.status, String(testCase.match));
      assert.deepStrictEqual(last.usedSourceIds, []);
    }

    // An explicit request is not blocked by an unrelated source that is still processing.
    const explicit = [];
    console.log = () => {};
    try {
      main(argv(['--source-ids', 'NONCANON_TEST_A']), {
        listSources: () => [ready[0], { ...ready[1], status: 1 }],
        runQuery: (queryArgs) => { explicit.push(queryArgs); return response('NONCANON_TEST_A'); },
      });
    } finally {
      console.log = realLog;
    }
    assert.strictEqual(explicit[0][explicit[0].indexOf('--source-ids') + 1], 'NONCANON_TEST_A');
    assert.strictEqual(records().pop().resultStatus, 'verified');
  } finally {
    console.log = realLog;
    if (fs.existsSync(absoluteLogPath)) fs.unlinkSync(absoluteLogPath);
  }
}

testArgsAndCommand();
testOpenPolicyCoversWholeNotebook();
testLiveListingShapeContract();
testNotReadySourcesFailTheCall();
testMainScopesToLiveListing();
testSourceSelectionFailsClosed();
testRetrievalStatusClassification();
testRetrievalLogIsMetadataOnly();
testValidResponseAndOutput();
testResponseFailures();
console.log('notebooklmCanonSearch tests: PASS');
