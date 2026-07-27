#!/usr/bin/env node
'use strict';

/**
 * Task 7 evaluation harness: compare the existing headless writer state against
 * the same state plus a bounded prior-published evidence packet selected by the
 * fail-closed NotebookLM wrapper.
 *
 * Safety:
 * - no external call or output write without --execute;
 * - NotebookLM answer prose is never persisted or injected;
 * - only validated citation/excerpt pairs or a gated source-search digest enter
 *   the treatment state;
 * - writer artifacts are namespaced with --artifact-tag;
 * - the existing Rhea gate runs on both drafts;
 * - no cron, citizen recording, staging, publication, or ingestion path runs.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { normalizeArtifactTag } = require('./cron-desk-writer');
const {
  ARTIFACT_CLASS: PRIOR_ARC_ARTIFACT_CLASS,
  normalizePriorArcRequirement,
} = require('./priorArcRequirement');
const { checkText: checkCanonNames } = require('./canon-name-check');

const ROOT = path.join(__dirname, '..');
const COMPARE_DIR = path.join(ROOT, 'output', 'cron-compare');
const EVALUATION_ROOT = path.join(COMPARE_DIR, 'evaluations');
const SEARCH_SCRIPT = path.join(ROOT, 'scripts', 'notebooklmCanonSearch.js');
const WRITER_SCRIPT = path.join(ROOT, 'scripts', 'cron-desk-writer.js');
const GATE_SCRIPT = path.join(ROOT, 'scripts', 'cron-rhea-gate.js');
const CLAUDE_BIN = process.env.CLAUDE_BIN || '/root/.local/bin/claude';
const SOURCE_SEARCH_BUDGET_USD = 0.25;

function parseArgs(argv) {
  const args = {
    execute: false,
    cycle: '',
    desk: 'civic',
    persona: 'freelance-firebrand',
    baseState: '',
    question: '',
    sourceIds: [],
    tag: '',
    timeoutSeconds: 120,
    writerProvider: 'openrouter',
    writerModel: 'deepseek/deepseek-chat',
    gateModel: 'google/gemini-3.5-flash',
    retrievalMode: 'direct-excerpts',
    reuseEvaluation: '',
    bindClaimIndex: 0,
    strictSourceHygiene: false,
    maxEvidenceChars: 16000,
    maxDigestChars: 2200,
  };
  const valueFlags = new Set([
    '--cycle',
    '--desk',
    '--persona',
    '--base-state',
    '--question',
    '--source-ids',
    '--tag',
    '--timeout',
    '--writer-provider',
    '--writer-model',
    '--gate-model',
    '--retrieval-mode',
    '--reuse-evaluation',
    '--bind-claim-index',
    '--max-evidence-chars',
    '--max-digest-chars',
  ]);
  for (let index = 2; index < argv.length; index++) {
    let token = argv[index];
    if (token === '--execute') {
      args.execute = true;
      continue;
    }
    if (token === '--strict-source-hygiene') {
      args.strictSourceHygiene = true;
      continue;
    }
    let value = null;
    const equals = token.indexOf('=');
    if (equals !== -1) {
      value = token.slice(equals + 1);
      token = token.slice(0, equals);
    }
    if (!valueFlags.has(token)) throw new Error('unknown argument: ' + token);
    if (value == null) {
      if (!argv[index + 1]) throw new Error(token + ' requires a value');
      value = argv[++index];
    }
    if (token === '--cycle') args.cycle = value;
    if (token === '--desk') args.desk = value;
    if (token === '--persona') args.persona = value;
    if (token === '--base-state') args.baseState = value;
    if (token === '--question') args.question = value;
    if (token === '--source-ids') {
      args.sourceIds = value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    if (token === '--tag') args.tag = value;
    if (token === '--timeout') args.timeoutSeconds = Number(value);
    if (token === '--writer-provider') args.writerProvider = value;
    if (token === '--writer-model') args.writerModel = value;
    if (token === '--gate-model') args.gateModel = value;
    if (token === '--retrieval-mode') args.retrievalMode = value;
    if (token === '--reuse-evaluation') args.reuseEvaluation = value;
    if (token === '--bind-claim-index') args.bindClaimIndex = Number(value);
    if (token === '--max-evidence-chars') args.maxEvidenceChars = Number(value);
    if (token === '--max-digest-chars') args.maxDigestChars = Number(value);
  }

  args.cycle = String(args.cycle || '').trim();
  args.desk = String(args.desk || '').trim();
  args.persona = String(args.persona || '').trim();
  args.baseState = String(args.baseState || '').trim();
  args.question = String(args.question || '').trim();
  args.reuseEvaluation = String(args.reuseEvaluation || '').trim();
  args.tag = normalizeArtifactTag(args.tag);

  if (!/^\d+$/.test(args.cycle)) throw new Error('--cycle must be numeric');
  if (!/^[a-z][a-z0-9-]*$/.test(args.desk)) throw new Error('--desk is invalid');
  if (!args.persona || !/^[a-z][a-z0-9-]*$/.test(args.persona)) {
    throw new Error('--persona is invalid');
  }
  if (!args.baseState) throw new Error('--base-state is required');
  if (!args.question) throw new Error('--question is required');
  if (args.question.length > 4000) throw new Error('--question exceeds 4000 characters');
  if (args.sourceIds.length === 0) throw new Error('--source-ids is required');
  if (new Set(args.sourceIds).size !== args.sourceIds.length) {
    throw new Error('--source-ids contains duplicates');
  }
  if (!args.tag) throw new Error('--tag is required');
  if (args.tag.length > 38) {
    throw new Error('--tag must be 38 characters or fewer to leave room for pair suffixes');
  }
  if (
    !Number.isFinite(args.timeoutSeconds) ||
    args.timeoutSeconds < 30 ||
    args.timeoutSeconds > 180
  ) {
    throw new Error('--timeout must be between 30 and 180 seconds');
  }
  if (
    !Number.isInteger(args.maxEvidenceChars) ||
    args.maxEvidenceChars < 2000 ||
    args.maxEvidenceChars > 30000
  ) {
    throw new Error('--max-evidence-chars must be between 2000 and 30000');
  }
  if (!['direct-excerpts', 'source-search-compact'].includes(args.retrievalMode)) {
    throw new Error(
      '--retrieval-mode must be direct-excerpts or source-search-compact'
    );
  }
  if (
    !Number.isInteger(args.maxDigestChars) ||
    args.maxDigestChars < 1000 ||
    args.maxDigestChars > 3000
  ) {
    throw new Error('--max-digest-chars must be between 1000 and 3000');
  }
  if (
    !Number.isInteger(args.bindClaimIndex) ||
    args.bindClaimIndex < 0 ||
    args.bindClaimIndex > 3
  ) {
    throw new Error('--bind-claim-index must be between 0 and 3');
  }
  if (
    (args.reuseEvaluation || args.bindClaimIndex > 0) &&
    args.retrievalMode !== 'source-search-compact'
  ) {
    throw new Error(
      '--reuse-evaluation and --bind-claim-index require source-search-compact'
    );
  }
  if (
    args.strictSourceHygiene &&
    (!args.reuseEvaluation || args.bindClaimIndex < 1)
  ) {
    throw new Error(
      '--strict-source-hygiene requires --reuse-evaluation and --bind-claim-index'
    );
  }
  return args;
}

function resolveRepoFile(filePath, label) {
  const resolved = path.resolve(ROOT, filePath);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error(label + ' escapes the repository');
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(label + ' not found: ' + filePath);
  }
  return resolved;
}

function detectLatestCycle() {
  const cycles = fs.readdirSync(path.join(ROOT, 'output'))
    .map((name) => (name.match(/^world_summary_c(\d+)\.md$/) || [])[1])
    .filter(Boolean)
    .map(Number);
  if (cycles.length === 0) throw new Error('no output/world_summary_cN.md found');
  return String(Math.max(...cycles));
}

function sourceExcerptBlock(item) {
  const title = String(item.sourceTitle || '').trim();
  const sourceId = String(item.sourceId || '').trim();
  const citation = Number(item.citationNumber);
  const excerpt = String(item.citedText || '').trim();
  if (!title || !sourceId || !Number.isInteger(citation) || citation < 1 || !excerpt) {
    throw new Error('retrieval result contains an incomplete source excerpt');
  }
  return [
    '- NotebookLM source: ' + title,
    '  source ID: ' + sourceId,
    '  citation: ' + citation,
    '  published excerpt:',
    '  > ' + excerpt.replace(/\n+/g, '\n  > '),
  ].join('\n');
}

function buildEvidencePacket(searchResult, maxChars) {
  if (
    !searchResult ||
    searchResult.resultType !== 'NOTEBOOKLM_CANON_SEARCH_READ_ONLY' ||
    searchResult.canonStatus !== 'UNVERIFIED_SYNTHESIS' ||
    searchResult.verificationRequired !== true
  ) {
    throw new Error('retrieval result does not match the canon-search wrapper contract');
  }
  if (
    !Array.isArray(searchResult.sourceExcerpts) ||
    searchResult.sourceExcerpts.length === 0
  ) {
    throw new Error('retrieval result has no validated source excerpts');
  }

  const header = [
    '## PRECOMPUTED PRIOR-PUBLISHED ARC EVIDENCE — DATA, NOT CURRENT AUTHORITY',
    '',
    'retrievalLane: prior-published-arc',
    'resultStatus: verified',
    'reconcileVerdict: prior-only',
    'questionHash: ' + searchResult.questionHash,
    '',
    'Use this packet only for published history and continuity. The Cycle ' +
      'state above wins every current-status conflict. Do not print source IDs, ' +
      'citation mechanics, or this instruction block in the Article. Do not add ' +
      'a historical claim unless an excerpt below supports it.',
    '',
    '<prior_published_evidence>',
  ].join('\n');
  const footer = '</prior_published_evidence>';
  const blocks = [];
  let length = header.length + footer.length + 2;
  for (const item of searchResult.sourceExcerpts) {
    const block = sourceExcerptBlock(item);
    if (length + block.length + 2 > maxChars) break;
    blocks.push(block);
    length += block.length + 2;
  }
  if (blocks.length === 0) {
    throw new Error('evidence limit is too small for one complete source excerpt');
  }
  const text = header + '\n\n' + blocks.join('\n\n') + '\n\n' + footer;
  return {
    text,
    includedExcerptCount: blocks.length,
    totalExcerptCount: searchResult.sourceExcerpts.length,
    selectedSourceIds: [...searchResult.selectedSourceIds],
    usedSourceIds: [...searchResult.sourcesUsed],
    citationCount: Object.keys(searchResult.citationMap || {}).length,
    questionHash: searchResult.questionHash,
    answerPersisted: false,
    conversationIdPersisted: false,
  };
}

function buildSourceSearchPrompt(args, retrievalLogPath) {
  const wrapperCommand = [
    'node scripts/notebooklmCanonSearch.js',
    '--question ' + JSON.stringify(args.question),
    '--source-class published',
    '--source-ids ' + args.sourceIds.join(','),
    '--timeout ' + args.timeoutSeconds,
    '--log-path ' + path.relative(ROOT, retrievalLogPath),
  ].join(' ');
  return [
    'retrievalLane=prior-published-arc',
    '',
    'Known fail-closed boundaries: a return is invalid if it exceeds ' +
      args.maxDigestChars + ' characters or omits the required source IDs or ' +
      'evaluation-local log path.',
    '',
    'Run this exact command once, verbatim. Do not omit, add, or change flags:',
    wrapperCommand,
    '',
    'Return a compact writer-ready evidence digest, not an Article and not the ' +
      'NotebookLM answer. Hard requirements:',
    '- first line exactly: retrievalLane: prior-published-arc',
    '- exactly 3 strongest claims, each in the required [prior-published] citation shape',
    '- each claim is at most 25 words before its citation',
    '- every claim includes an approved source UUID, citation number, and exactly one single-line supporting excerpt of at most 35 words',
    '- excerpts and claims together must stay within ' + args.maxDigestChars + ' characters total',
    '- strongest-signal note is exactly 2 short lines; sources-opened lists only scripts/notebooklmCanonSearch.js',
    '- last line exactly: reconcileVerdict: prior-only',
    '- do not read Edition files, PDFs, archives, or any source outside the wrapper',
    '- do not include unsupported synthesis or current-state claims',
  ].join('\n');
}

function validateCompactSourceSearch(text, args) {
  const digest = String(text || '').trim();
  if (!digest) throw new Error('source-search returned an empty digest');
  if (digest.length > args.maxDigestChars) {
    throw new Error(
      'source-search digest exceeds ' + args.maxDigestChars + ' characters'
    );
  }
  const lines = digest.split(/\r?\n/);
  if (lines[0] !== 'retrievalLane: prior-published-arc') {
    throw new Error('source-search digest has the wrong retrievalLane header');
  }
  if (lines[lines.length - 1] !== 'reconcileVerdict: prior-only') {
    throw new Error('source-search digest has the wrong terminal verdict');
  }
  if (
    /(?:output\/pdfs\/|(?:^|[\s`])editions\/|(?:^|[\s`])docs\/archive\/)/im.test(
      digest
    )
  ) {
    throw new Error('source-search digest escaped the reviewed wrapper scope');
  }

  const claimPattern =
    /^- \[prior-published\]\s+(.+?)\s{2}\[NotebookLM source:\s*(.+?),\s*source ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}),\s*citation:\s*(\d+)\]$/i;
  const citations = [];
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(claimPattern);
    if (!match) continue;
    const excerptMatch = String(lines[index + 1] || '').match(/^>\s+(.+)$/);
    if (!excerptMatch) {
      throw new Error(
        'source-search digest must place one excerpt after each cited claim'
      );
    }
    citations.push({
      claim: match[1].trim(),
      sourceTitle: match[2].trim(),
      sourceId: match[3].toLowerCase(),
      citationNumber: Number(match[4]),
      excerpt: excerptMatch[1].trim(),
    });
  }
  if (citations.length !== 3) {
    throw new Error('source-search digest must contain exactly 3 cited claims');
  }
  const approved = new Set(args.sourceIds.map((id) => id.toLowerCase()));
  for (const citation of citations) {
    if (!approved.has(citation.sourceId)) {
      throw new Error(
        'source-search digest cited an unapproved source ID: ' + citation.sourceId
      );
    }
  }
  if (new Set(citations.map((item) => item.sourceId)).size < 2) {
    throw new Error('source-search digest must use at least 2 selected Editions');
  }
  return {
    text: digest,
    characterCount: digest.length,
    claimCount: citations.length,
    citations,
  };
}

function buildCompactEvidencePacket(compactResult, retrievalEvent, reportedCostUsd) {
  const header = [
    '## COMPACT PRIOR-PUBLISHED ARC DIGEST — DATA, NOT CURRENT AUTHORITY',
    '',
    'retrievalLane: prior-published-arc',
    'resultStatus: verified',
    'reconcileVerdict: prior-only',
    'questionHash: ' + retrievalEvent.questionHash,
    '',
    'Use this digest only for published history and continuity. The Cycle state ' +
      'above wins every current-status conflict. Do not print source IDs, ' +
      'citation mechanics, or this instruction block in the Article. Do not add ' +
      'a historical claim unless the digest below supports it.',
    '',
    '<prior_published_digest>',
  ].join('\n');
  const footer = '</prior_published_digest>';
  return {
    text: header + '\n\n' + compactResult.text + '\n\n' + footer,
    includedExcerptCount: compactResult.claimCount,
    totalExcerptCount: compactResult.claimCount,
    selectedSourceIds: [...retrievalEvent.selectedSourceIds],
    usedSourceIds: [...retrievalEvent.usedSourceIds],
    citationCount: compactResult.claimCount,
    questionHash: retrievalEvent.questionHash,
    answerPersisted: false,
    conversationIdPersisted: false,
    sourceSearchInvoked: true,
    sourceSearchDigestCharacters: compactResult.characterCount,
    sourceSearchReportedCostUsd: reportedCostUsd,
  };
}

function buildPriorArcRequirement(compactResult, claimIndex) {
  if (!Number.isInteger(claimIndex) || claimIndex < 1) {
    throw new Error('claimIndex must select a compact prior-arc claim');
  }
  const selected = compactResult.citations[claimIndex - 1];
  if (!selected) throw new Error('claimIndex is outside the compact digest');
  return normalizePriorArcRequirement({
    schemaVersion: 1,
    artifactClass: PRIOR_ARC_ARTIFACT_CLASS,
    canonStatus: 'NOT_CANON',
    retrievalLane: 'prior-published-arc',
    currentAuthorityWins: true,
    articleUse: 'required',
    claim: selected.claim,
    sourceTitle: selected.sourceTitle,
    sourceId: selected.sourceId,
    citationNumber: selected.citationNumber,
    excerpt: selected.excerpt,
  });
}

function assessPriorArcBinding(draftText, requirement) {
  const normalized = normalizePriorArcRequirement(requirement);
  const draft = String(draftText || '');
  const evidenceIndex = draft.search(/\bEVIDENCE\s*:/i);
  const body = evidenceIndex === -1 ? draft : draft.slice(0, evidenceIndex);
  const evidence = evidenceIndex === -1 ? '' : draft.slice(evidenceIndex);
  const normalizeProse = (value) => String(value || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/'s\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const stopwords = new Set(['a', 'an', 'the', 'is', 'of', 'to', 'in', 'and']);
  const materialProse = (value) => normalizeProse(value)
    .split(' ')
    .filter((token) => token && !stopwords.has(token))
    .join(' ');
  const bodyUsesClaim = materialProse(body).includes(
    materialProse(normalized.claim)
  );
  const evidenceHasMarker = /\bPRIOR_PUBLISHED\b/.test(evidence);
  const evidenceHasSource = evidence.includes(normalized.sourceTitle);
  const citationPattern = new RegExp(
    '\\bcitation\\s*:\\s*' + normalized.citationNumber + '\\b',
    'i'
  );
  const evidenceHasCitation = citationPattern.test(evidence);
  const sourceUuidLeaked = draft.toLowerCase().includes(normalized.sourceId);
  return {
    bodyUsesClaim,
    evidenceHasMarker,
    evidenceHasSource,
    evidenceHasCitation,
    sourceUuidLeaked,
    satisfied:
      bodyUsesClaim &&
      evidenceHasMarker &&
      evidenceHasSource &&
      evidenceHasCitation &&
      !sourceUuidLeaked,
  };
}

function questionHash(question) {
  return crypto.createHash('sha256').update(question, 'utf8').digest('hex');
}

function loadReusedCompactEvidence(args, evaluationDir) {
  const manifestPath = resolveRepoFile(
    args.reuseEvaluation,
    'reuse evaluation manifest'
  );
  const prior = readJson(manifestPath, 'reuse evaluation manifest');
  if (
    prior.canonStatus !== 'NOT_CANON' ||
    prior.sourceSearchInvoked !== true ||
    !prior.retrieval ||
    prior.retrieval.answerPersisted !== false ||
    prior.retrieval.conversationIdPersisted !== false
  ) {
    throw new Error('reuse evaluation is not a safe source-search proof');
  }
  if (prior.retrieval.questionHash !== questionHash(args.question)) {
    throw new Error('reuse evaluation question hash does not match');
  }
  const selectedSourceIds = Array.isArray(prior.retrieval.selectedSourceIds)
    ? prior.retrieval.selectedSourceIds
    : [];
  if (
    selectedSourceIds.length !== args.sourceIds.length ||
    selectedSourceIds.some((id, index) => id !== args.sourceIds[index])
  ) {
    throw new Error('reuse evaluation selected scope does not match');
  }
  const usedSourceIds = Array.isArray(prior.retrieval.usedSourceIds)
    ? prior.retrieval.usedSourceIds
    : [];
  if (
    usedSourceIds.length === 0 ||
    usedSourceIds.some((id) => !selectedSourceIds.includes(id))
  ) {
    throw new Error('reuse evaluation used-source scope is invalid');
  }
  const digestPath = resolveRepoFile(
    prior.retrieval.sourceSearchDigest,
    'reuse source-search digest'
  );
  const digestText = fs.readFileSync(digestPath, 'utf8');
  const compact = validateCompactSourceSearch(digestText, args);
  const retrievalEvent = {
    questionHash: prior.retrieval.questionHash,
    selectedSourceIds,
    usedSourceIds,
  };
  const evidence = buildCompactEvidencePacket(compact, retrievalEvent, 0);
  evidence.sourceSearchInvoked = false;
  evidence.retrievalReused = true;
  evidence.reusedSourceSearchReportedCostUsd =
    numeric(prior.retrieval.sourceSearchReportedCostUsd);
  const copiedDigestPath = path.join(evaluationDir, 'source-search.result.md');
  fs.writeFileSync(copiedDigestPath, compact.text + '\n');
  return {
    compact,
    retrievalEvent,
    retrievalEventCount: 0,
    reportedCostUsd: 0,
    durationMs: 0,
    reusedFrom: path.relative(ROOT, manifestPath),
    copiedDigestPath,
    evidence,
  };
}

function buildTreatmentState(baseState, evidenceText) {
  return String(baseState).trimEnd() +
    '\n\n---\n\n' +
    String(evidenceText).trim() +
    '\n';
}

function sanitizeReporterAngleUnverifiedNames(
  baseState,
  checker = checkCanonNames
) {
  const state = String(baseState || '');
  const start = state.indexOf('### Your own read on this cycle');
  const end = state.indexOf('\n## ', start + 1);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      'strict source hygiene requires a bounded reporter-angle section'
    );
  }
  const angle = state.slice(start, end);
  const nameCheck = checker(angle);
  const redactedCandidates = Array.isArray(nameCheck.unverified)
    ? [...nameCheck.unverified]
    : [];
  let sanitizedAngle = angle;
  for (const candidate of redactedCandidates) {
    sanitizedAngle = sanitizedAngle.split(candidate).join(
      '[unverified reference removed]'
    );
  }
  return {
    text: state.slice(0, start) + sanitizedAngle + state.slice(end),
    report: {
      scope: 'reporter-angle-only',
      verifiedPeople: Array.isArray(nameCheck.verified)
        ? [...nameCheck.verified]
        : [],
      redactedCandidates,
      redactionCount: redactedCandidates.reduce((total, candidate) => {
        return total + angle.split(candidate).length - 1;
      }, 0),
    },
  };
}

function modelSlug(model) {
  return String(model).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function writerOutSlug(args, artifactTag) {
  return (
    (args.persona ? args.persona + '_' : '') +
    artifactTag + '_' +
    modelSlug(args.writerModel)
  );
}

function writerMetaPath(args, artifactTag) {
  return path.join(
    COMPARE_DIR,
    args.desk + '_c' + args.cycle + '_' + artifactTag + '_cron.meta.json'
  );
}

function writerScorecardPath(args, artifactTag) {
  return path.join(
    COMPARE_DIR,
    args.desk + '_c' + args.cycle + '_' +
      writerOutSlug(args, artifactTag) +
      '.scorecard.json'
  );
}

function runCaptured(label, command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: options.timeout || 700000,
    maxBuffer: 30 * 1024 * 1024,
  });
  if (result.error) throw new Error(label + ' failed: ' + result.error.message);
  const allowedStatuses = options.allowedStatuses || [0];
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(
      label + ' exited ' + result.status + ': ' +
      String(result.stderr || result.stdout || '').trim().slice(0, 500)
    );
  }
  return result;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(label + ' is not valid JSON: ' + error.message);
  }
}

function readVerifiedRetrievalEvent(filePath, args) {
  if (!fs.existsSync(filePath)) {
    throw new Error('source-search did not create its retrieval metadata log');
  }
  const events = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(
          'retrieval metadata line ' + (index + 1) + ' is invalid JSON'
        );
      }
    });
  const event = events[events.length - 1];
  if (
    !event ||
    event.resultStatus !== 'verified' ||
    event.reconcileVerdict !== 'prior-only'
  ) {
    throw new Error('source-search retrieval metadata is not verified prior-only');
  }
  if (!/^[0-9a-f]{64}$/.test(String(event.questionHash || ''))) {
    throw new Error('source-search retrieval metadata lacks a question hash');
  }
  const selected = Array.isArray(event.selectedSourceIds)
    ? event.selectedSourceIds
    : [];
  const used = Array.isArray(event.usedSourceIds) ? event.usedSourceIds : [];
  if (
    selected.length !== args.sourceIds.length ||
    selected.some((id, index) => id !== args.sourceIds[index])
  ) {
    throw new Error('source-search retrieval metadata changed the selected scope');
  }
  if (
    used.length === 0 ||
    used.some((id) => !selected.includes(id))
  ) {
    throw new Error('source-search retrieval metadata has invalid used sources');
  }
  return { event, eventCount: events.length };
}

function runCompactSourceSearch(args, evaluationDir, retrievalLogPath) {
  const prompt = buildSourceSearchPrompt(args, retrievalLogPath);
  const started = Date.now();
  const result = runCaptured(
    'source-search compact retrieval',
    CLAUDE_BIN,
    [
      '-p',
      prompt,
      '--agent', 'source-search',
      '--output-format', 'json',
      '--permission-mode', 'dontAsk',
      '--no-session-persistence',
      '--max-budget-usd', String(SOURCE_SEARCH_BUDGET_USD),
      '--allowedTools', 'Read', 'Glob', 'Grep', 'Bash',
    ]
  );
  let envelope;
  try {
    envelope = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error('source-search Claude envelope is not JSON: ' + error.message);
  }
  if (envelope.is_error === true || typeof envelope.result !== 'string') {
    throw new Error('source-search Claude envelope did not contain a valid result');
  }
  const retrieval = readVerifiedRetrievalEvent(retrievalLogPath, args);
  const compact = validateCompactSourceSearch(envelope.result, args);
  fs.writeFileSync(
    path.join(evaluationDir, 'source-search.result.md'),
    compact.text + '\n'
  );
  return {
    compact,
    retrievalEvent: retrieval.event,
    retrievalEventCount: retrieval.eventCount,
    reportedCostUsd: numeric(envelope.total_cost_usd),
    durationMs: Date.now() - started,
  };
}

function summarizeRun(args, artifactTag) {
  const metaPath = writerMetaPath(args, artifactTag);
  const scorecardPath = writerScorecardPath(args, artifactTag);
  const meta = readJson(metaPath, 'writer metadata');
  if (!Array.isArray(meta.savedFiles) || meta.savedFiles.length !== 1) {
    throw new Error('writer metadata must contain exactly one saved draft');
  }
  const draftPath = resolveRepoFile(meta.savedFiles[0], 'writer draft');
  const scorecard = readJson(scorecardPath, 'writer scorecard');
  const rheaPath = path.join(
    COMPARE_DIR,
    path.basename(draftPath).replace(/\.md$/, '.rhea.json')
  );
  const rhea = readJson(rheaPath, 'Rhea verdict');
  return {
    artifactTag,
    draft: path.relative(ROOT, draftPath),
    writerMeta: path.relative(ROOT, metaPath),
    scorecard: path.relative(ROOT, scorecardPath),
    rheaVerdict: path.relative(ROOT, rheaPath),
    writerModel: meta.model,
    writerCostUsd: scorecard.apiCostUsd,
    wordCount: scorecard.wordCount,
    selfReportedHallucinationCount: scorecard.hallucinationCount,
    rheaModel: rhea.model,
    rheaPass: rhea.pass,
    rheaFlagCount: rhea.flagCount,
    rheaHighSeverityCount: rhea.highSeverityCount,
    rheaCostUsd: rhea.apiCostUsd,
    rheaFlags: rhea.flags,
  };
}

function numeric(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function buildComparison(baseline, treatment, retrievalCostUsd = 0) {
  const baselineCost =
    numeric(baseline.writerCostUsd) + numeric(baseline.rheaCostUsd);
  const treatmentCost =
    numeric(treatment.writerCostUsd) + numeric(treatment.rheaCostUsd);
  const reportedRetrievalCost = numeric(retrievalCostUsd);
  return {
    decision: 'REVIEW_REQUIRED',
    baselinePass: baseline.rheaPass,
    treatmentPass: treatment.rheaPass,
    rheaFlagCountDelta:
      numeric(treatment.rheaFlagCount) - numeric(baseline.rheaFlagCount),
    rheaHighSeverityDelta:
      numeric(treatment.rheaHighSeverityCount) -
      numeric(baseline.rheaHighSeverityCount),
    wordCountDelta: numeric(treatment.wordCount) - numeric(baseline.wordCount),
    baselineCostUsd: +baselineCost.toFixed(4),
    treatmentCostUsd: +treatmentCost.toFixed(4),
    totalApiCostUsd: +(baselineCost + treatmentCost).toFixed(4),
    sourceSearchReportedCostUsd: +reportedRetrievalCost.toFixed(4),
    totalIncludingReportedRetrievalUsd:
      +(baselineCost + treatmentCost + reportedRetrievalCost).toFixed(4),
    reviewQuestions: [
      'Did the treatment use prior published evidence that the baseline missed?',
      'Are every treatment-only historical claim supported by an injected excerpt?',
      'Did either draft contradict current Cycle authority or invent a named person?',
      'Did the prior evidence improve depth enough to justify retrieval latency and cost?',
    ],
  };
}

function executionPlan(args) {
  const evaluationDir = path.join(EVALUATION_ROOT, args.tag);
  const compactMode = args.retrievalMode === 'source-search-compact';
  const retrievalReused = Boolean(args.reuseEvaluation);
  const externalCalls = [];
  if (args.execute) {
    if (!retrievalReused) {
      externalCalls.push(
        compactMode
          ? 'Claude source-search ×1 (includes NotebookLM query ×1)'
          : 'NotebookLM query ×1'
      );
    }
    externalCalls.push('DeepSeek writer/score ×2', 'Gemini Rhea gate ×2');
  }
  return {
    artifactClass: 'NOTEBOOKLM_HEADLESS_TASK7_EVALUATION',
    canonStatus: 'NOT_CANON',
    execute: args.execute,
    cycle: args.cycle,
    desk: args.desk,
    persona: args.persona,
    baseState: args.baseState,
    sourceIds: args.sourceIds,
    questionStored: false,
    evaluationDir: path.relative(ROOT, evaluationDir),
    retrievalMode: compactMode
      ? 'source-search-compact-verified-digest'
      : 'validated-wrapper-excerpts-only',
    retrievalReused,
    reuseEvaluation: args.reuseEvaluation || null,
    bindClaimIndex: args.bindClaimIndex || null,
    briefBindingApplied: false,
    strictSourceHygieneApplied: args.strictSourceHygiene,
    sourceSearchInvoked: false,
    externalCalls,
    forbiddenPaths: [
      'cron-desk-run.js',
      'citizenVoice.js',
      'staged/',
      'published/',
      'post-publish',
      'canon ingestion',
    ],
  };
}

function runWriter(
  args,
  artifactTag,
  statePath,
  evaluationDir,
  priorArcRequirementPath = null,
  strictSourceHygiene = false
) {
  const metaPath = writerMetaPath(args, artifactTag);
  const scorecardPath = writerScorecardPath(args, artifactTag);
  if (fs.existsSync(metaPath) || fs.existsSync(scorecardPath)) {
    throw new Error('refusing to overwrite existing writer artifacts for ' + artifactTag);
  }
  const commandArgs = [
    WRITER_SCRIPT,
    '--desk', args.desk,
    '--persona', args.persona,
    '--state-file', path.relative(ROOT, statePath),
    '--provider', args.writerProvider,
    '--model', args.writerModel,
    '--artifact-tag', artifactTag,
  ];
  if (priorArcRequirementPath) {
    commandArgs.push(
      '--brief-requirement-file',
      path.relative(ROOT, priorArcRequirementPath)
    );
  }
  if (strictSourceHygiene) {
    commandArgs.push('--strict-source-hygiene');
  }
  const result = runCaptured('writer ' + artifactTag, 'node', commandArgs);
  fs.writeFileSync(
    path.join(evaluationDir, artifactTag + '.writer.log'),
    String(result.stdout || '') + String(result.stderr || '')
  );

  const meta = readJson(metaPath, 'writer metadata');
  if (!Array.isArray(meta.savedFiles) || meta.savedFiles.length !== 1) {
    throw new Error('writer did not report exactly one draft for ' + artifactTag);
  }
  const draftPath = resolveRepoFile(meta.savedFiles[0], 'writer draft');
  const gateArgs = [
    GATE_SCRIPT,
    '--draft', path.relative(ROOT, draftPath),
    '--cycle', args.cycle,
    '--backend', 'api',
    '--api-model', args.gateModel,
  ];
  if (priorArcRequirementPath) {
    gateArgs.push(
      '--evidence-file',
      path.relative(ROOT, priorArcRequirementPath)
    );
  }
  const gateResult = runCaptured(
    'Rhea gate ' + artifactTag,
    'node',
    gateArgs,
    { allowedStatuses: [0, 2] }
  );
  fs.writeFileSync(
    path.join(evaluationDir, artifactTag + '.rhea.log'),
    String(gateResult.stdout || '') + String(gateResult.stderr || '')
  );
}

function executeExperiment(args) {
  const latestCycle = detectLatestCycle();
  if (latestCycle !== args.cycle) {
    throw new Error(
      'writer detects Cycle ' + latestCycle +
      ', but the evaluation requested Cycle ' + args.cycle
    );
  }
  const baseStatePath = resolveRepoFile(args.baseState, 'base state');
  const evaluationDir = path.join(EVALUATION_ROOT, args.tag);
  if (fs.existsSync(evaluationDir)) {
    throw new Error('refusing to overwrite evaluation directory: ' + evaluationDir);
  }
  fs.mkdirSync(evaluationDir, { recursive: true });

  const retrievalLogPath = path.join(evaluationDir, 'retrieval.jsonl');
  let evidence;
  let compactRun = null;
  if (args.retrievalMode === 'source-search-compact') {
    if (args.reuseEvaluation) {
      compactRun = loadReusedCompactEvidence(args, evaluationDir);
      evidence = compactRun.evidence;
    } else {
      compactRun = runCompactSourceSearch(args, evaluationDir, retrievalLogPath);
      evidence = buildCompactEvidencePacket(
        compactRun.compact,
        compactRun.retrievalEvent,
        compactRun.reportedCostUsd
      );
    }
  } else {
    const searchResult = runCaptured(
      'NotebookLM retrieval',
      'node',
      [
        SEARCH_SCRIPT,
        '--question', args.question,
        '--source-class', 'published',
        '--source-ids', args.sourceIds.join(','),
        '--timeout', String(args.timeoutSeconds),
        '--log-path', path.relative(ROOT, retrievalLogPath),
      ]
    );
    let parsedSearch;
    try {
      parsedSearch = JSON.parse(searchResult.stdout);
    } catch (error) {
      throw new Error('NotebookLM wrapper output is not JSON: ' + error.message);
    }
    evidence = buildEvidencePacket(parsedSearch, args.maxEvidenceChars);
  }
  const baseState = fs.readFileSync(baseStatePath, 'utf8');
  const baselineStatePath = path.join(evaluationDir, 'baseline.state.md');
  const treatmentStatePath = path.join(evaluationDir, 'treatment.state.md');
  const hygiene = args.strictSourceHygiene
    ? sanitizeReporterAngleUnverifiedNames(baseState)
    : null;
  const baselineState = args.strictSourceHygiene
    ? buildTreatmentState(baseState, evidence.text)
    : baseState;
  const treatmentBaseState = hygiene ? hygiene.text : baseState;
  fs.writeFileSync(baselineStatePath, baselineState);
  fs.writeFileSync(
    treatmentStatePath,
    buildTreatmentState(treatmentBaseState, evidence.text)
  );
  let priorArcRequirement = null;
  let priorArcRequirementPath = null;
  if (args.bindClaimIndex > 0) {
    if (!compactRun) {
      throw new Error('prior-arc binding requires a compact source-search result');
    }
    priorArcRequirement = buildPriorArcRequirement(
      compactRun.compact,
      args.bindClaimIndex
    );
    priorArcRequirementPath = path.join(
      evaluationDir,
      'prior-arc-requirement.json'
    );
    fs.writeFileSync(
      priorArcRequirementPath,
      JSON.stringify(priorArcRequirement, null, 2)
    );
  }

  const baselineTag = args.tag + '-baseline';
  const treatmentTag = args.tag + '-treatment';
  runWriter(
    args,
    baselineTag,
    baselineStatePath,
    evaluationDir,
    args.strictSourceHygiene ? priorArcRequirementPath : null
  );
  runWriter(
    args,
    treatmentTag,
    treatmentStatePath,
    evaluationDir,
    priorArcRequirementPath,
    args.strictSourceHygiene
  );

  const baseline = summarizeRun(args, baselineTag);
  const treatment = summarizeRun(args, treatmentTag);
  const bindingAssessment = priorArcRequirement
    ? {
        baseline: assessPriorArcBinding(
          fs.readFileSync(
            resolveRepoFile(baseline.draft, 'baseline draft'),
            'utf8'
          ),
          priorArcRequirement
        ),
        treatment: assessPriorArcBinding(
          fs.readFileSync(
            resolveRepoFile(treatment.draft, 'treatment draft'),
            'utf8'
          ),
          priorArcRequirement
        ),
      }
    : null;
  const manifest = {
    ...executionPlan(args),
    sourceSearchInvoked: evidence.sourceSearchInvoked === true,
    briefBindingApplied: Boolean(priorArcRequirement),
    strictSourceHygieneApplied: Boolean(hygiene),
    ranAt: new Date().toISOString(),
    hygiene: hygiene ? hygiene.report : null,
    retrieval: {
      log: args.reuseEvaluation ? null : path.relative(ROOT, retrievalLogPath),
      reusedFrom: compactRun && compactRun.reusedFrom
        ? compactRun.reusedFrom
        : null,
      questionHash: evidence.questionHash,
      selectedSourceIds: evidence.selectedSourceIds,
      usedSourceIds: evidence.usedSourceIds,
      citationCount: evidence.citationCount,
      includedExcerptCount: evidence.includedExcerptCount,
      totalExcerptCount: evidence.totalExcerptCount,
      answerPersisted: evidence.answerPersisted,
      conversationIdPersisted: evidence.conversationIdPersisted,
      baselineState: path.relative(ROOT, baselineStatePath),
      treatmentState: path.relative(ROOT, treatmentStatePath),
      sourceSearchDigest:
        compactRun
          ? path.relative(
              ROOT,
              path.join(evaluationDir, 'source-search.result.md')
            )
          : null,
      sourceSearchDigestCharacters:
        evidence.sourceSearchDigestCharacters || null,
      sourceSearchReportedCostUsd:
        evidence.sourceSearchReportedCostUsd || 0,
      reusedSourceSearchReportedCostUsd:
        evidence.reusedSourceSearchReportedCostUsd || 0,
      sourceSearchDurationMs: compactRun ? compactRun.durationMs : null,
      retrievalEventCount:
        compactRun ? compactRun.retrievalEventCount : null,
    },
    binding: priorArcRequirement
      ? {
          requirement: path.relative(ROOT, priorArcRequirementPath),
          claimIndex: args.bindClaimIndex,
          claim: priorArcRequirement.claim,
          sourceTitle: priorArcRequirement.sourceTitle,
          sourceId: priorArcRequirement.sourceId,
          citationNumber: priorArcRequirement.citationNumber,
          articleUse: priorArcRequirement.articleUse,
          currentAuthorityWins: priorArcRequirement.currentAuthorityWins,
          assessmentMethod: 'ordered-material-token-sequence-v1',
          assessment: bindingAssessment.treatment,
          baselineAssessment: bindingAssessment.baseline,
          treatmentAssessment: bindingAssessment.treatment,
        }
      : null,
    baseline,
    treatment,
    comparison: buildComparison(
      baseline,
      treatment,
      evidence.sourceSearchReportedCostUsd
    ),
  };
  const manifestPath = path.join(evaluationDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return { manifest, manifestPath };
}

function main(argv) {
  const args = parseArgs(argv);
  const plan = executionPlan(args);
  if (!args.execute) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  const { manifest, manifestPath } = executeExperiment(args);
  console.log(JSON.stringify({
    manifest: path.relative(ROOT, manifestPath),
    retrieval: manifest.retrieval,
    comparison: manifest.comparison,
  }, null, 2));
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (error) {
    console.error('NotebookLM headless evaluation failed: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  sourceExcerptBlock,
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
};
