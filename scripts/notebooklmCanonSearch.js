#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { validatePolicy } = require('./notebooklmCanonSourcesValidate');

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'notebooklm.json');
const POLICY_PATH = path.join(__dirname, 'notebooklmCanonSources.json');
const INVENTORY_PATH = path.join(ROOT, 'output', 'codex', 'notebooklm-source-inventory.json');
const NLM = path.join(ROOT, '.venv', 'nlm', 'bin', 'nlm');
const SOURCE_CLASSES = new Set(['published', 'canon-reference', 'all']);
const RESULT_STATUSES = new Set([
  'not_run',
  'no_result',
  'auth_failure',
  'citation_failure',
  'verified',
]);
const RETRIEVAL_LANE = 'prior-published-arc';
const DEFAULT_LOG_PATH = path.join('output', 'retrieval', 'notebooklm-canon-search.jsonl');

function parseArgs(argv) {
  const args = {
    question: '',
    sourceClass: 'published',
    sourceIds: null,
    timeoutSeconds: 180,
    logPath: DEFAULT_LOG_PATH,
  };
  for (let index = 2; index < argv.length; index++) {
    const token = argv[index];
    if (
      token === '--question' ||
      token === '--source-ids' ||
      token === '--source-class' ||
      token === '--timeout' ||
      token === '--log-path'
    ) {
      if (!argv[index + 1]) throw new Error(token + ' requires a value');
      const value = argv[++index];
      if (token === '--question') args.question = value;
      if (token === '--source-ids') args.sourceIds = value.split(',').map((id) => id.trim());
      if (token === '--source-class') args.sourceClass = value;
      if (token === '--timeout') args.timeoutSeconds = Number(value);
      if (token === '--log-path') args.logPath = value;
    } else {
      throw new Error('unknown argument: ' + token);
    }
  }
  args.question = String(args.question || '').trim();
  if (!args.question) throw new Error('--question is required');
  if (args.question.length > 4000) throw new Error('--question exceeds 4000 characters');
  if (!SOURCE_CLASSES.has(args.sourceClass)) {
    throw new Error('--source-class must be published, canon-reference, or all');
  }
  if (
    !Number.isFinite(args.timeoutSeconds) ||
    args.timeoutSeconds < 30 ||
    args.timeoutSeconds > 180
  ) {
    throw new Error('--timeout must be between 30 and 180 seconds');
  }
  if (args.sourceIds && (args.sourceIds.length === 0 || args.sourceIds.some((id) => !id))) {
    throw new Error('--source-ids must contain one or more non-empty IDs');
  }
  return args;
}

function hashQuestion(question) {
  const normalized = String(question || '').trim();
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function questionHintFromArgv(argv) {
  const index = argv.indexOf('--question');
  if (index < 0 || !argv[index + 1]) return '';
  return String(argv[index + 1]).trim();
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(label + ' could not be read as JSON: ' + error.message);
  }
}

function allowedIdsForClass(policy, sourceClass) {
  const published = policy.allowedPublishedSourceIds || [];
  const references = policy.allowedCanonReferenceSourceIds || [];
  if (sourceClass === 'published') return [...published];
  if (sourceClass === 'canon-reference') return [...references];
  return [...published, ...references];
}

function selectSourceIds(policy, sourceClass, requestedIds) {
  const classIds = allowedIdsForClass(policy, sourceClass);
  const allowed = new Set(classIds);
  const excluded = new Set(policy.excludedSourceIds || []);
  const selected = requestedIds ? [...requestedIds] : classIds;
  if (selected.length === 0) throw new Error('resolved source scope is empty');
  if (new Set(selected).size !== selected.length) {
    throw new Error('requested source scope contains duplicate IDs');
  }
  for (const id of selected) {
    if (excluded.has(id)) throw new Error('source ID is explicitly excluded: ' + id);
    if (!allowed.has(id)) {
      throw new Error('source ID is not approved for source class ' + sourceClass + ': ' + id);
    }
  }
  return selected;
}

function buildQueryArgs(notebookId, question, sourceIds, timeoutSeconds) {
  if (!notebookId) throw new Error('notebook ID is required');
  if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
    throw new Error('query source scope must not be empty');
  }
  return [
    'notebook',
    'query',
    notebookId,
    question,
    '--json',
    '--source-ids',
    sourceIds.join(','),
    '--timeout',
    String(timeoutSeconds),
  ];
}

function normalizeCitationMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('NotebookLM response has no citation map');
  }
  const entries = Object.entries(value);
  if (entries.length === 0) throw new Error('NotebookLM response has an empty citation map');
  const result = {};
  for (const [rawNumber, rawSourceId] of entries) {
    const citationNumber = String(rawNumber).trim();
    const sourceId = String(rawSourceId || '').trim();
    if (!/^\d+$/.test(citationNumber) || !sourceId) {
      throw new Error('NotebookLM response contains an invalid citation mapping');
    }
    result[citationNumber] = sourceId;
  }
  return result;
}

function validateQueryResponse(raw, selectedSourceIds, policy) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('NotebookLM response must be an object');
  }
  const answer = String(raw.answer || '').trim();
  if (!answer) throw new Error('NotebookLM response has no answer');
  const conversationId = String(raw.conversation_id || '').trim();
  if (!conversationId) throw new Error('NotebookLM response has no conversation ID');

  const selected = new Set(selectedSourceIds);
  const approved = new Set([
    ...(policy.allowedPublishedSourceIds || []),
    ...(policy.allowedCanonReferenceSourceIds || []),
  ]);
  const citationMap = normalizeCitationMap(raw.citations);
  const sourcesUsed = Array.isArray(raw.sources_used)
    ? raw.sources_used.map((id) => String(id || '').trim())
    : [];
  if (sourcesUsed.length === 0 || sourcesUsed.some((id) => !id)) {
    throw new Error('NotebookLM response has no valid sources_used');
  }

  for (const sourceId of sourcesUsed) {
    if (!approved.has(sourceId)) {
      throw new Error('NotebookLM used a source outside the approved policy: ' + sourceId);
    }
    if (!selected.has(sourceId)) {
      throw new Error('NotebookLM used a source outside the selected scope: ' + sourceId);
    }
  }
  for (const sourceId of Object.values(citationMap)) {
    if (!approved.has(sourceId)) {
      throw new Error('NotebookLM cited a source outside the approved policy: ' + sourceId);
    }
    if (!selected.has(sourceId)) {
      throw new Error('NotebookLM cited a source outside the selected scope: ' + sourceId);
    }
    if (!sourcesUsed.includes(sourceId)) {
      throw new Error('NotebookLM citation source is absent from sources_used: ' + sourceId);
    }
  }

  if (!Array.isArray(raw.references) || raw.references.length === 0) {
    throw new Error('NotebookLM response has no source excerpts');
  }
  const sourceExcerpts = raw.references.map((reference, index) => {
    if (!reference || typeof reference !== 'object') {
      throw new Error('NotebookLM reference ' + index + ' is invalid');
    }
    const sourceId = String(reference.source_id || '').trim();
    const citationNumber = String(reference.citation_number || '').trim();
    const citedText = String(reference.cited_text || '').trim();
    if (!sourceId || !/^\d+$/.test(citationNumber) || !citedText) {
      throw new Error('NotebookLM reference ' + index + ' is incomplete');
    }
    if (citationMap[citationNumber] !== sourceId) {
      throw new Error('NotebookLM reference ' + index + ' disagrees with citation map');
    }
    if (!selected.has(sourceId) || !approved.has(sourceId)) {
      throw new Error('NotebookLM reference ' + index + ' is outside approved scope');
    }
    const decision = policy.decisions[sourceId];
    if (!decision) throw new Error('policy has no decision metadata for source ' + sourceId);
    return {
      citationNumber: Number(citationNumber),
      sourceId,
      sourceTitle: decision.title,
      citedText,
    };
  });

  const referencedNumbers = new Set(sourceExcerpts.map((item) => String(item.citationNumber)));
  const missingReferences = Object.keys(citationMap).filter((number) => !referencedNumbers.has(number));
  if (missingReferences.length) {
    throw new Error('NotebookLM citation map lacks excerpts for: ' + missingReferences.join(', '));
  }

  return {
    answer,
    conversationId,
    sourcesUsed,
    citationMap,
    sourceExcerpts,
  };
}

function runQuery(queryArgs, timeoutSeconds) {
  if (!fs.existsSync(NLM)) throw new Error('nlm CLI missing at ' + NLM);
  const result = spawnSync(NLM, queryArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: (timeoutSeconds + 20) * 1000,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      'nlm notebook query failed: ' +
      String(result.stderr || result.stdout || '').trim().slice(0, 500)
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error('nlm notebook query returned invalid JSON: ' + error.message);
  }
}

function resolveLogPath(requestedPath) {
  const value = String(requestedPath || '').trim();
  if (!value) throw new Error('retrieval log path must not be empty');
  const outputRoot = path.join(ROOT, 'output');
  const resolved = path.resolve(ROOT, value);
  const relative = path.relative(outputRoot, resolved);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    throw new Error('retrieval log path must be a file inside output/');
  }
  if (path.extname(resolved) !== '.jsonl') {
    throw new Error('retrieval log path must use the .jsonl extension');
  }

  let current = outputRoot;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error('retrieval log path must not traverse a symbolic link');
    }
  }
  return resolved;
}

function classifyResultStatus(error, stage) {
  if (stage === 'not_run') return 'not_run';
  const message = String(error && error.message || error || '');
  if (
    /(?:auth(?:entication|orization)?|unauthori[sz]ed|forbidden|log(?:ged)? in|sign in|cookie|csrf|credentials?|\b401\b|\b403\b)/i.test(message)
  ) {
    return 'auth_failure';
  }
  if (stage === 'query') return 'no_result';
  if (
    /(?:must be an object|has no answer|has no conversation ID)/i.test(message)
  ) {
    return 'no_result';
  }
  return 'citation_failure';
}

function buildRetrievalRecord({
  args,
  questionHint,
  selectedSourceIds,
  validated,
  resultStatus,
  startedAt,
  finishedAt,
}) {
  if (!RESULT_STATUSES.has(resultStatus)) {
    throw new Error('invalid retrieval result status: ' + resultStatus);
  }
  const question = args && args.question ? args.question : questionHint;
  const selected = Array.isArray(selectedSourceIds) ? [...selectedSourceIds] : [];
  const used = validated && Array.isArray(validated.sourcesUsed)
    ? [...validated.sourcesUsed]
    : [];
  const citationCount = validated && validated.citationMap
    ? Object.keys(validated.citationMap).length
    : 0;
  return {
    schemaVersion: 1,
    eventType: 'NOTEBOOKLM_CANON_SEARCH_RETRIEVAL',
    occurredAt: new Date(startedAt).toISOString(),
    lane: RETRIEVAL_LANE,
    resultStatus,
    questionHash: hashQuestion(question),
    sourceClass: args ? args.sourceClass : null,
    selectedSourceIds: selected,
    usedSourceIds: used,
    citationCount,
    durationMs: Math.max(0, finishedAt - startedAt),
    reconcileVerdict: resultStatus === 'verified' ? 'prior-only' : 'no-result',
  };
}

function appendRetrievalLog(requestedPath, record) {
  const resolved = resolveLogPath(requestedPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  resolveLogPath(resolved);
  fs.appendFileSync(resolved, JSON.stringify(record) + '\n', {
    encoding: 'utf8',
    flag: 'a',
    mode: 0o600,
  });
  return resolved;
}

function buildOutput(args, config, policy, selectedSourceIds, validated) {
  return {
    schemaVersion: 1,
    resultType: 'NOTEBOOKLM_CANON_SEARCH_READ_ONLY',
    canonStatus: 'UNVERIFIED_SYNTHESIS',
    verificationRequired: true,
    notebookId: config.notebookId,
    sourceClass: args.sourceClass,
    selectedSourceIds,
    questionHash: hashQuestion(args.question),
    answer: validated.answer,
    conversationId: validated.conversationId,
    sourcesUsed: validated.sourcesUsed,
    citationMap: validated.citationMap,
    sourceExcerpts: validated.sourceExcerpts,
  };
}

function main(argv) {
  const startedAt = Date.now();
  const questionHint = questionHintFromArgv(argv);
  let args = null;
  let selectedSourceIds = [];
  let validated = null;
  let stage = 'not_run';
  let logPath = DEFAULT_LOG_PATH;
  let output = null;

  try {
    args = parseArgs(argv);
    logPath = resolveLogPath(args.logPath);
    const config = readJson(CONFIG_PATH, 'NotebookLM configuration');
    const policy = readJson(POLICY_PATH, 'NotebookLM canon-source policy');
    const inventory = readJson(INVENTORY_PATH, 'NotebookLM source inventory');
    validatePolicy(inventory, policy);
    if (!config.notebookId || config.notebookId !== policy.notebookId) {
      throw new Error('configured notebook ID does not match canon-source policy');
    }
    selectedSourceIds = selectSourceIds(policy, args.sourceClass, args.sourceIds);
    const queryArgs = buildQueryArgs(
      config.notebookId,
      args.question,
      selectedSourceIds,
      args.timeoutSeconds
    );
    stage = 'query';
    const raw = runQuery(queryArgs, args.timeoutSeconds);
    stage = 'response_validation';
    validated = validateQueryResponse(raw, selectedSourceIds, policy);
    output = buildOutput(args, config, policy, selectedSourceIds, validated);
  } catch (error) {
    const record = buildRetrievalRecord({
      args,
      questionHint,
      selectedSourceIds,
      validated: null,
      resultStatus: classifyResultStatus(error, stage),
      startedAt,
      finishedAt: Date.now(),
    });
    try {
      appendRetrievalLog(logPath, record);
    } catch (logError) {
      throw new Error(
        error.message + '; retrieval observability log failed: ' + logError.message
      );
    }
    throw error;
  }

  appendRetrievalLog(logPath, buildRetrievalRecord({
    args,
    questionHint,
    selectedSourceIds,
    validated,
    resultStatus: 'verified',
    startedAt,
    finishedAt: Date.now(),
  }));
  console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (error) {
    console.error('NotebookLM canon search failed: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  allowedIdsForClass,
  selectSourceIds,
  buildQueryArgs,
  normalizeCitationMap,
  validateQueryResponse,
  hashQuestion,
  resolveLogPath,
  classifyResultStatus,
  buildRetrievalRecord,
  appendRetrievalLog,
  buildOutput,
};
