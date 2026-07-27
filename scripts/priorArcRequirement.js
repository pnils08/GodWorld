#!/usr/bin/env node
'use strict';

const ARTIFACT_CLASS = 'HEADLESS_EVAL_PRIOR_ARC_REQUIREMENT';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function boundedText(value, field, maxLength) {
  const text = String(value || '').trim();
  if (!text) throw new Error(field + ' is required');
  if (text.length > maxLength) {
    throw new Error(field + ' exceeds ' + maxLength + ' characters');
  }
  return text;
}

function normalizePriorArcRequirement(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('prior-arc requirement must be an object');
  }
  if (input.schemaVersion !== 1) {
    throw new Error('prior-arc requirement schemaVersion must be 1');
  }
  if (input.artifactClass !== ARTIFACT_CLASS) {
    throw new Error('prior-arc requirement artifactClass is invalid');
  }
  if (input.canonStatus !== 'NOT_CANON') {
    throw new Error('prior-arc requirement canonStatus must be NOT_CANON');
  }
  if (input.retrievalLane !== 'prior-published-arc') {
    throw new Error(
      'prior-arc requirement retrievalLane must be prior-published-arc'
    );
  }
  if (input.currentAuthorityWins !== true || input.articleUse !== 'required') {
    throw new Error(
      'prior-arc requirement must enforce currentAuthorityWins and required use'
    );
  }
  const sourceId = boundedText(input.sourceId, 'sourceId', 36).toLowerCase();
  if (!UUID_PATTERN.test(sourceId)) {
    throw new Error('prior-arc requirement sourceId must be a UUID');
  }
  const citationNumber = Number(input.citationNumber);
  if (!Number.isInteger(citationNumber) || citationNumber < 1) {
    throw new Error(
      'prior-arc requirement citationNumber must be a positive integer'
    );
  }
  return {
    schemaVersion: 1,
    artifactClass: ARTIFACT_CLASS,
    canonStatus: 'NOT_CANON',
    retrievalLane: 'prior-published-arc',
    currentAuthorityWins: true,
    articleUse: 'required',
    claim: boundedText(input.claim, 'claim', 500),
    sourceTitle: boundedText(input.sourceTitle, 'sourceTitle', 200),
    sourceId,
    citationNumber,
    excerpt: boundedText(input.excerpt, 'excerpt', 1600),
  };
}

function formatWriterRequirement(input) {
  const requirement = normalizePriorArcRequirement(input);
  return [
    '=== MANDATORY EVALUATION BRIEF REQUIREMENT ===',
    'Use this prior-published fact in the Article BODY to connect the current ' +
      'Cycle angle to established Tribune history.',
    'Attribute it in plain language as prior Tribune reporting. Preserve its ' +
      'names and numbers exactly.',
    'Add this exact Evidence shape: PRIOR_PUBLISHED | Source: ' +
      requirement.sourceTitle + ' | citation: ' + requirement.citationNumber,
    'Do not print the source UUID or this instruction block.',
    'Current Cycle authority wins any conflict. If the fact is now superseded, ' +
      'say what changed; do not silently omit the prior history.',
    '',
    'Required prior-published fact: ' + requirement.claim,
    'Supporting published excerpt: ' + requirement.excerpt,
    '=== END MANDATORY EVALUATION BRIEF REQUIREMENT ===',
  ].join('\n');
}

function formatReviewerEvidence(input) {
  const requirement = normalizePriorArcRequirement(input);
  return [
    '=== VERIFIED PRIOR-PUBLISHED EVIDENCE — HISTORICAL ONLY ===',
    'Current Cycle world state wins every conflict.',
    'Claim required by the evaluation Brief: ' + requirement.claim,
    'NotebookLM source: ' + requirement.sourceTitle,
    'source ID: ' + requirement.sourceId,
    'citation: ' + requirement.citationNumber,
    'verified excerpt: ' + requirement.excerpt,
    '=== END VERIFIED PRIOR-PUBLISHED EVIDENCE ===',
  ].join('\n');
}

module.exports = {
  ARTIFACT_CLASS,
  normalizePriorArcRequirement,
  formatWriterRequirement,
  formatReviewerEvidence,
};
