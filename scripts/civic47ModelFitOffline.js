#!/usr/bin/env node
/**
 * civic47ModelFitOffline.js — local A5 scenario, contract, and receipt support.
 * Synthetic fixtures only. This module never calls a provider or assigns a token ceiling.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SCENARIOS = path.join(ROOT, 'output', 'civic47-model-fit', 'scenarios.json');
const RECEIPT_SCHEMA = 'civic47-model-fit-receipt/1';
const OUTPUT_SCHEMA = 'civic47-decision/1';

function loadScenarios(file = SCENARIOS) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (parsed.schema !== 'civic47-scenarios/1' || parsed.syntheticOnly !== true || !Array.isArray(parsed.scenarios)) {
    throw new Error('invalid civic.47 synthetic scenario file');
  }
  const ids = new Set();
  for (const s of parsed.scenarios) {
    if (!s.scenarioId || ids.has(s.scenarioId) || s.syntheticOnly !== true) throw new Error('missing, duplicate, or non-synthetic scenario');
    ids.add(s.scenarioId);
    if (!Array.isArray(s.evidence) || !Array.isArray(s.allowedActions) || !Array.isArray(s.requiredEvidence)) {
      throw new Error(s.scenarioId + ': incomplete scenario contract');
    }
  }
  return parsed.scenarios;
}

function serializeScenario(scenario) {
  const payload = {
    schema: 'civic47-seat-input/1', syntheticOnly: true,
    scenarioId: scenario.scenarioId, seat: scenario.seat,
    clock: scenario.clock, freshness: scenario.freshness,
    evidence: scenario.evidence, availableDetails: scenario.availableDetails,
    allowedActions: scenario.allowedActions, requirements: scenario.requirements,
  };
  const text = JSON.stringify(payload, null, 2) + '\n';
  return { text, sha256: crypto.createHash('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text) };
}

function scoreDecision(scenario, rawOutput) {
  const checks = {
    parseable: false, outputSchema: false, evidenceReferences: false,
    requiredEvidence: false, noUnsupportedClaims: false, actionAuthority: false,
    uncertaintyHonest: false, temporalAndGeographic: null,
  };
  let output;
  try { output = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput; checks.parseable = true; }
  catch (e) { return { pass: false, hardFailure: true, checks, reasons: ['output is not valid JSON'] }; }
  const reasons = [];
  if (!output || output.schema !== OUTPUT_SCHEMA || !Array.isArray(output.evidenceUsed) ||
      !Array.isArray(output.claims) || !Array.isArray(output.actions) || !Array.isArray(output.uncertainties)) {
    reasons.push('required civic decision fields are missing');
    return { pass: false, hardFailure: true, checks, reasons };
  }
  checks.outputSchema = true;
  const evidenceById = new Map(scenario.evidence.map(e => [e.id, e]));
  const used = new Set(output.evidenceUsed);
  checks.evidenceReferences = [...used].every(id => evidenceById.has(id));
  if (!checks.evidenceReferences) reasons.push('output cites evidence outside the visible packet');
  checks.requiredEvidence = scenario.requiredEvidence.every(id => used.has(id));
  if (!checks.requiredEvidence) reasons.push('required evidence was not cited');
  checks.noUnsupportedClaims = output.claims.every(c => c && typeof c.text === 'string' &&
    Array.isArray(c.evidenceIds) && c.evidenceIds.length > 0 && c.evidenceIds.every(id => evidenceById.has(id)));
  if (!checks.noUnsupportedClaims) reasons.push('claim lacks visible supporting evidence');
  checks.actionAuthority = output.actions.every(a => a && scenario.allowedActions.some(allowed => allowed.actionId === a.actionId));
  if (!checks.actionAuthority) reasons.push('action is outside the authority/action set');
  const requiredUnknowns = (scenario.requirements && scenario.requirements.uncertainties) || [];
  checks.uncertaintyHonest = requiredUnknowns.every(id => output.uncertainties.some(u => u && u.sourceId === id && u.status === 'unavailable'));
  if (!checks.uncertaintyHonest) reasons.push('required unavailable source was presented without an explicit unknown');
  const expected = scenario.requirements && scenario.requirements.temporalAndGeographic;
  if (expected) {
    checks.temporalAndGeographic = expected.every(x => output.claims.some(c => c && c.kind === x.kind &&
      c.occurredCycle === x.occurredCycle && c.district === x.district &&
      (x.evidenceId ? c.evidenceIds.includes(x.evidenceId) : true)));
    if (!checks.temporalAndGeographic) reasons.push('event time or geography does not match the evidence');
  }
  let scenarioSpecific = true;
  const req = scenario.requirements || {};
  for (const actionId of req.deferIfUnavailable || []) {
    const action = output.actions.find(a => a && a.actionId === actionId);
    if (action && action.status !== 'deferred') scenarioSpecific = false;
  }
  for (const actionId of req.preserveIndependent || []) {
    if (!output.actions.some(a => a && a.actionId === actionId && a.status !== 'deferred')) scenarioSpecific = false;
  }
  if (req.mustHonorBindingVote && !output.claims.some(c => c && c.kind === 'binding-vote' && c.evidenceIds.includes('e-vote-rule'))) scenarioSpecific = false;
  if (req.mustUseGeneration && output.inputGeneration !== req.mustUseGeneration) scenarioSpecific = false;
  if ((req.doNotClaimCompleted || []).some(id => output.claims.some(c => c && c.kind === 'completed' && c.evidenceIds.includes(id)))) scenarioSpecific = false;
  if (req.mustNotImpersonateAbsentOfficial && output.actions.some(a => a && a.actor)) scenarioSpecific = false;
  if (req.mustNotClaimSuccessWithoutReadback && output.claims.some(c => c && c.kind === 'successful-write')) scenarioSpecific = false;
  checks.scenarioRequirements = scenarioSpecific;
  if (!scenarioSpecific) reasons.push('scenario-specific handling requirement failed');
  const hardFailure = !checks.outputSchema || !checks.evidenceReferences || !checks.requiredEvidence ||
    !checks.noUnsupportedClaims || !checks.actionAuthority || !checks.uncertaintyHonest ||
    checks.temporalAndGeographic === false || !checks.scenarioRequirements;
  return { pass: !hardFailure, hardFailure, checks, reasons };
}

function makeReceipt({ scenario, model, provider, requestedModel, answeredModel, inputSha256,
  startedAt, elapsedMs, finishReason, usage, costUsd, attempts = [], output, error = null,
  providerProfile = null, blindRatings = null }) {
  const u = usage || {};
  const exactModel = Boolean(model && requestedModel === model && answeredModel === model);
  const validFinish = finishReason != null && !['length', 'max_tokens', 'content_filter'].includes(finishReason);
  const validCounts = Number.isFinite(u.inputTokens) && u.inputTokens >= 0 && Number.isFinite(u.outputTokens) && u.outputTokens >= 0;
  const score = output == null || error ? null : scoreDecision(scenario, output);
  return {
    schema: RECEIPT_SCHEMA, scenarioId: scenario.scenarioId,
    profile: { model: model || null, provider: provider || null, requestedModel: requestedModel || null, answeredModel: answeredModel || null },
    providerProfile: providerProfile ? structuredClone(providerProfile) : null,
    inputSha256: inputSha256 || null, startedAt: startedAt || null,
    elapsedMs: Number.isFinite(elapsedMs) ? elapsedMs : null,
    attempts: Array.isArray(attempts) ? attempts.map(a => ({ number: a.number ?? null, reason: a.reason || null, elapsedMs: Number.isFinite(a.elapsedMs) ? a.elapsedMs : null })) : [],
    usage: { inputTokens: Number.isFinite(u.inputTokens) ? u.inputTokens : null,
      outputTokens: Number.isFinite(u.outputTokens) ? u.outputTokens : null,
      reasoningTokens: Number.isFinite(u.reasoningTokens) ? u.reasoningTokens : null },
    costUsd: Number.isFinite(costUsd) && costUsd >= 0 ? costUsd : null,
    finishReason: finishReason || null, error: error || null,
    outputValid: score ? score.pass : false,
    decisionChecks: score,
    blindRatings: blindRatings ? structuredClone(blindRatings) : null,
    acceptance: { modelMatched: exactModel, usageComplete: validCounts, completed: validFinish && !error,
      costKnown: Number.isFinite(costUsd) && costUsd >= 0 },
  };
}

function scoreReceipt(receipt) {
  if (!receipt || receipt.schema !== RECEIPT_SCHEMA) return { pass: false, reasons: ['invalid receipt schema'] };
  const reasons = [];
  if (!receipt.acceptance.modelMatched) reasons.push('requested and answered model do not match');
  if (!receipt.acceptance.usageComplete) reasons.push('token usage is incomplete');
  if (!receipt.acceptance.completed) reasons.push('provider call errored or did not finish');
  if (!receipt.outputValid) reasons.push('decision contract failed or output is unavailable');
  // Unknown price remains a recorded unknown; it is never converted to zero or a pass.
  if (!receipt.acceptance.costKnown) reasons.push('cost is unknown');
  return { pass: reasons.length === 0, reasons };
}

function writeJsonl(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

module.exports = { loadScenarios, serializeScenario, scoreDecision, makeReceipt, scoreReceipt, writeJsonl,
  SCENARIOS, RECEIPT_SCHEMA, OUTPUT_SCHEMA };
