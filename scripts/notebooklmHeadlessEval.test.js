#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  parseArgs,
  buildEvidencePacket,
  buildSourceSearchPrompt,
  validateCompactSourceSearch,
  buildCompactEvidencePacket,
  buildPriorArcRequirement,
  assessPriorArcBinding,
  questionHash,
  buildTreatmentState,
  sanitizeReporterAngleUnverifiedNames,
  buildComparison,
  executionPlan,
} = require('./notebooklmHeadlessEval');

function argv(extra = []) {
  return [
    'node',
    'script',
    '--cycle', '102',
    '--desk', 'civic',
    '--persona', 'freelance-firebrand',
    '--base-state', 'output/cron-compare/NONCANON_TEST.state.md',
    '--question', 'NONCANON_TEST private retrieval question',
    '--source-ids',
    '00000000-0000-4000-8000-000000000001,00000000-0000-4000-8000-000000000002',
    '--tag', 'task7-noncanon-test',
    ...extra,
  ];
}

function searchFixture() {
  return {
    resultType: 'NOTEBOOKLM_CANON_SEARCH_READ_ONLY',
    canonStatus: 'UNVERIFIED_SYNTHESIS',
    verificationRequired: true,
    questionHash: 'a'.repeat(64),
    answer: 'NONCANON_TEST ANSWER BODY MUST NOT PERSIST',
    conversationId: 'NONCANON_TEST_CONVERSATION',
    selectedSourceIds: [
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ],
    sourcesUsed: ['00000000-0000-4000-8000-000000000001'],
    citationMap: { 1: '00000000-0000-4000-8000-000000000001' },
    sourceExcerpts: [{
      citationNumber: 1,
      sourceId: '00000000-0000-4000-8000-000000000001',
      sourceTitle: 'NONCANON_TEST Edition',
      citedText: 'NONCANON_TEST published excerpt',
    }],
  };
}

function testArgsAreFailClosed() {
  const parsed = parseArgs(argv());
  assert.strictEqual(parsed.execute, false);
  assert.strictEqual(parsed.cycle, '102');
  assert.strictEqual(parsed.tag, 'task7-noncanon-test');
  assert.strictEqual(parsed.sourceIds.length, 2);

  const executing = parseArgs(argv(['--execute']));
  assert.strictEqual(executing.execute, true);
  const compact = parseArgs(argv([
    '--retrieval-mode', 'source-search-compact',
    '--max-digest-chars', '2000',
  ]));
  assert.strictEqual(compact.retrievalMode, 'source-search-compact');
  assert.strictEqual(compact.maxDigestChars, 2000);
  const bound = parseArgs(argv([
    '--retrieval-mode', 'source-search-compact',
    '--reuse-evaluation',
    'output/cron-compare/evaluations/NONCANON_TEST/manifest.json',
    '--bind-claim-index', '3',
  ]));
  assert.strictEqual(bound.bindClaimIndex, 3);
  assert.ok(bound.reuseEvaluation.endsWith('manifest.json'));
  const strict = parseArgs(argv([
    '--retrieval-mode', 'source-search-compact',
    '--reuse-evaluation',
    'output/cron-compare/evaluations/NONCANON_TEST/manifest.json',
    '--bind-claim-index', '3',
    '--strict-source-hygiene',
  ]));
  assert.strictEqual(strict.strictSourceHygiene, true);
  assert.throws(
    () => parseArgs(argv(['--tag', '../escape'])),
    /artifact-tag/
  );
  assert.throws(
    () => parseArgs(argv(['--tag', 'a'.repeat(39)])),
    /38 characters/
  );
  assert.throws(
    () => parseArgs(argv([
      '--source-ids',
      '00000000-0000-4000-8000-000000000001,00000000-0000-4000-8000-000000000001',
    ])),
    /duplicates/
  );
  assert.throws(
    () => parseArgs(argv(['--retrieval-mode', 'unbounded'])),
    /retrieval-mode/
  );
  assert.throws(
    () => parseArgs(argv(['--bind-claim-index', '1'])),
    /source-search-compact/
  );
  assert.throws(
    () => parseArgs(argv([
      '--retrieval-mode', 'source-search-compact',
      '--strict-source-hygiene',
    ])),
    /requires --reuse-evaluation and --bind-claim-index/
  );
  assert.throws(
    () => parseArgs(['node', 'script', '--execute']),
    /cycle/
  );
}

function testEvidencePacketExcludesSynthesis() {
  const fixture = searchFixture();
  const packet = buildEvidencePacket(fixture, 4000);
  assert.strictEqual(packet.includedExcerptCount, 1);
  assert.strictEqual(packet.answerPersisted, false);
  assert.strictEqual(packet.conversationIdPersisted, false);
  assert.ok(packet.text.includes('NONCANON_TEST published excerpt'));
  assert.ok(packet.text.includes('reconcileVerdict: prior-only'));
  assert.ok(!packet.text.includes(fixture.answer));
  assert.ok(!packet.text.includes(fixture.conversationId));

  const treatment = buildTreatmentState(
    'NONCANON_TEST BASE STATE',
    packet.text
  );
  assert.ok(treatment.startsWith('NONCANON_TEST BASE STATE'));
  assert.ok(treatment.includes('NONCANON_TEST published excerpt'));
  assert.ok(!treatment.includes(fixture.answer));
}

function compactDigest() {
  return [
    'retrievalLane: prior-published-arc',
    '- [prior-published] NONCANON_TEST claim one.  [NotebookLM source: NONCANON_TEST Edition A.pdf, source ID: 00000000-0000-4000-8000-000000000001, citation: 1]',
    '> NONCANON_TEST excerpt one.',
    '- [prior-published] NONCANON_TEST claim two.  [NotebookLM source: NONCANON_TEST Edition B.pdf, source ID: 00000000-0000-4000-8000-000000000002, citation: 2]',
    '> NONCANON_TEST excerpt two.',
    '- [prior-published] NONCANON_TEST claim three.  [NotebookLM source: NONCANON_TEST Edition A.pdf, source ID: 00000000-0000-4000-8000-000000000001, citation: 3]',
    '> NONCANON_TEST excerpt three.',
    'strongest signal: NONCANON_TEST claim two.',
    'why: NONCANON_TEST reason.',
    'sources opened:',
    '- scripts/notebooklmCanonSearch.js',
    'reconcileVerdict: prior-only',
  ].join('\n');
}

function testCompactSourceSearchContract() {
  const args = parseArgs(argv([
    '--retrieval-mode', 'source-search-compact',
  ]));
  const prompt = buildSourceSearchPrompt(
    args,
    '/root/GodWorld/output/cron-compare/evaluations/task7-noncanon-test/retrieval.jsonl'
  );
  assert.ok(prompt.includes('exactly 3 strongest claims'));
  assert.ok(prompt.includes('task7-noncanon-test/retrieval.jsonl'));
  assert.ok(!prompt.includes('NONCANON_TEST ANSWER BODY MUST NOT PERSIST'));

  const compact = validateCompactSourceSearch(compactDigest(), args);
  assert.strictEqual(compact.claimCount, 3);
  assert.strictEqual(compact.citations.length, 3);
  assert.strictEqual(
    compact.citations[2].claim,
    'NONCANON_TEST claim three.'
  );
  assert.strictEqual(
    compact.citations[2].excerpt,
    'NONCANON_TEST excerpt three.'
  );
  assert.ok(compact.characterCount <= 2200);

  assert.throws(
    () => validateCompactSourceSearch(
      compactDigest().replace(
        'scripts/notebooklmCanonSearch.js',
        'output/pdfs/NONCANON_TEST.pdf'
      ),
      args
    ),
    /escaped/
  );
  assert.throws(
    () => validateCompactSourceSearch(
      compactDigest().replace(
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000099'
      ),
      args
    ),
    /unapproved/
  );

  const retrievalEvent = {
    questionHash: 'b'.repeat(64),
    selectedSourceIds: args.sourceIds,
    usedSourceIds: args.sourceIds,
  };
  const evidence = buildCompactEvidencePacket(compact, retrievalEvent, 0.02);
  assert.strictEqual(evidence.sourceSearchInvoked, true);
  assert.strictEqual(evidence.citationCount, 3);
  assert.strictEqual(evidence.sourceSearchReportedCostUsd, 0.02);
  assert.ok(evidence.text.includes(compactDigest()));

  const requirement = buildPriorArcRequirement(compact, 3);
  assert.strictEqual(requirement.articleUse, 'required');
  assert.strictEqual(requirement.claim, 'NONCANON_TEST claim three.');
  assert.strictEqual(requirement.citationNumber, 3);
  const assessment = assessPriorArcBinding(
    [
      '# NONCANON_TEST Article',
      'NONCANON_TEST claim three.',
      'EVIDENCE:',
      'PRIOR_PUBLISHED | Source: NONCANON_TEST Edition A.pdf | citation: 3',
    ].join('\n'),
    requirement
  );
  assert.strictEqual(assessment.satisfied, true);
  assert.strictEqual(assessment.bodyUsesClaim, true);
  assert.strictEqual(assessment.sourceUuidLeaked, false);
  const possessive = assessPriorArcBinding(
    [
      '# NONCANON_TEST Article',
      "NONCANON_TEST claim three's.",
      'EVIDENCE:',
      'PRIOR_PUBLISHED | Source: NONCANON_TEST Edition A.pdf | citation: 3',
    ].join('\n'),
    requirement
  );
  assert.strictEqual(possessive.bodyUsesClaim, true);
  const insertedArticle = assessPriorArcBinding(
    [
      '# NONCANON_TEST Article',
      'NONCANON_TEST claim is a part of three.',
      'EVIDENCE:',
      'PRIOR_PUBLISHED | Source: NONCANON_TEST Edition A.pdf | citation: 3',
    ].join('\n'),
    {
      ...requirement,
      claim: 'NONCANON_TEST claim is part of three.',
    }
  );
  assert.strictEqual(insertedArticle.bodyUsesClaim, true);
  const leaked = assessPriorArcBinding(
    'NONCANON_TEST claim three.\nEVIDENCE:\nPRIOR_PUBLISHED | Source: ' +
      'NONCANON_TEST Edition A.pdf | citation: 3 | ' + requirement.sourceId,
    requirement
  );
  assert.strictEqual(leaked.satisfied, false);
  assert.strictEqual(leaked.sourceUuidLeaked, true);
  assert.strictEqual(
    questionHash('NONCANON_TEST private retrieval question').length,
    64
  );
}

function testReporterAngleSanitizerIsBounded() {
  const state = [
    '# NONCANON_TEST state',
    '## Reporter',
    '### Your own read on this cycle',
    'Marisol Garcia described the Produce Market proposal.',
    'Marisol Garcia would return tomorrow.',
    '## CIVIC desk',
    'Marisol Garcia remains unchanged outside the reporter angle.',
  ].join('\n');
  const result = sanitizeReporterAngleUnverifiedNames(
    state,
    (angle) => {
      assert.ok(angle.includes('Marisol Garcia'));
      assert.ok(!angle.includes('## CIVIC desk'));
      return {
        verified: ['NONCANON_TEST Citizen'],
        unverified: ['Marisol Garcia', 'Produce Market'],
      };
    }
  );
  assert.ok(!result.text.includes(
    'Marisol Garcia described the Produce Market proposal.'
  ));
  assert.ok(result.text.includes(
    'Marisol Garcia remains unchanged outside the reporter angle.'
  ));
  assert.strictEqual(result.report.scope, 'reporter-angle-only');
  assert.deepStrictEqual(
    result.report.redactedCandidates,
    ['Marisol Garcia', 'Produce Market']
  );
  assert.strictEqual(result.report.redactionCount, 3);
}

function testComparisonAndDryPlan() {
  const baseline = {
    writerCostUsd: 0.003,
    rheaCostUsd: 0.06,
    rheaPass: false,
    rheaFlagCount: 3,
    rheaHighSeverityCount: 2,
    wordCount: 900,
  };
  const treatment = {
    writerCostUsd: 0.004,
    rheaCostUsd: 0.06,
    rheaPass: true,
    rheaFlagCount: 1,
    rheaHighSeverityCount: 0,
    wordCount: 1050,
  };
  const comparison = buildComparison(baseline, treatment);
  assert.strictEqual(comparison.decision, 'REVIEW_REQUIRED');
  assert.strictEqual(comparison.rheaFlagCountDelta, -2);
  assert.strictEqual(comparison.rheaHighSeverityDelta, -2);
  assert.strictEqual(comparison.totalApiCostUsd, 0.127);
  assert.strictEqual(comparison.sourceSearchReportedCostUsd, 0);
  assert.strictEqual(comparison.totalIncludingReportedRetrievalUsd, 0.127);

  const withRetrieval = buildComparison(baseline, treatment, 0.02);
  assert.strictEqual(withRetrieval.sourceSearchReportedCostUsd, 0.02);
  assert.strictEqual(withRetrieval.totalIncludingReportedRetrievalUsd, 0.147);

  const plan = executionPlan(parseArgs(argv()));
  assert.strictEqual(plan.canonStatus, 'NOT_CANON');
  assert.strictEqual(plan.execute, false);
  assert.deepStrictEqual(plan.externalCalls, []);
  assert.strictEqual(plan.sourceSearchInvoked, false);
  assert.strictEqual(plan.questionStored, false);

  const compactPlan = executionPlan(parseArgs(argv([
    '--retrieval-mode', 'source-search-compact',
  ])));
  assert.strictEqual(
    compactPlan.retrievalMode,
    'source-search-compact-verified-digest'
  );
  assert.deepStrictEqual(compactPlan.externalCalls, []);

  const boundExecutionPlan = executionPlan(parseArgs(argv([
    '--execute',
    '--retrieval-mode', 'source-search-compact',
    '--reuse-evaluation',
    'output/cron-compare/evaluations/NONCANON_TEST/manifest.json',
    '--bind-claim-index', '3',
  ])));
  assert.strictEqual(boundExecutionPlan.retrievalReused, true);
  assert.strictEqual(boundExecutionPlan.bindClaimIndex, 3);
  assert.deepStrictEqual(
    boundExecutionPlan.externalCalls,
    ['DeepSeek writer/score ×2', 'Gemini Rhea gate ×2']
  );
  const strictPlan = executionPlan(parseArgs(argv([
    '--execute',
    '--retrieval-mode', 'source-search-compact',
    '--reuse-evaluation',
    'output/cron-compare/evaluations/NONCANON_TEST/manifest.json',
    '--bind-claim-index', '3',
    '--strict-source-hygiene',
  ])));
  assert.strictEqual(strictPlan.strictSourceHygieneApplied, true);
  assert.deepStrictEqual(
    strictPlan.externalCalls,
    ['DeepSeek writer/score ×2', 'Gemini Rhea gate ×2']
  );
}

testArgsAreFailClosed();
testEvidencePacketExcludesSynthesis();
testCompactSourceSearchContract();
testReporterAngleSanitizerIsBounded();
testComparisonAndDryPlan();
console.log('notebooklmHeadlessEval tests: PASS');
