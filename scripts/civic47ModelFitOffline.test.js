#!/usr/bin/env node
'use strict';
const assert = require('assert');
const civic47 = require('./civic47ModelFitOffline');

const scenarios = civic47.loadScenarios();
assert.strictEqual(scenarios.length, 15, 'complete synthetic A5 matrix is frozen');
assert(scenarios.every(s => s.syntheticOnly), 'every case is visibly synthetic');
const byId = id => scenarios.find(s => s.scenarioId === id);

const parade = byId('SYN-C47-C111-DOWNTOWN-PARADE');
const serializedA = civic47.serializeScenario(parade);
const serializedB = civic47.serializeScenario(parade);
assert.strictEqual(serializedA.sha256, serializedB.sha256, 'same frozen input produces same hash');
assert.match(serializedA.text, /"occurredCycle": 111/, 'parade input preserves historical event age');
assert.match(serializedA.text, /"districts": \[\s+"D2"/, 'parade input preserves typed district');
assert(!/max_tokens|token ceiling|token budget/i.test(serializedA.text), 'frozen fixture imposes no token ceiling');

function validOutput(scenario) {
  const claims = scenario.requiredEvidence.map(id => {
    const ev = scenario.evidence.find(e => e.id === id);
    const temporal = (scenario.requirements.temporalAndGeographic || []).find(x => x.evidenceId === id);
    return { text: 'Synthetic claim grounded in visible evidence.', evidenceIds: [id],
      ...(temporal ? { kind: temporal.kind, occurredCycle: temporal.occurredCycle, district: temporal.district } : {}) };
  });
  if (scenario.requirements.mustHonorBindingVote) claims.push({ text: 'Synthetic binding vote acknowledged.', kind: 'binding-vote', evidenceIds: ['e-vote-rule'] });
  return { schema: civic47.OUTPUT_SCHEMA, evidenceUsed: [...scenario.requiredEvidence], claims,
    actions: scenario.allowedActions.filter(a => !scenario.requirements.deferIfUnavailable || !scenario.requirements.deferIfUnavailable.includes(a.actionId))
      .map(a => ({ actionId: a.actionId })),
    uncertainties: (scenario.requirements.uncertainties || []).map(sourceId => ({ sourceId, status: 'unavailable' })),
    ...(scenario.requirements.mustUseGeneration ? { inputGeneration: scenario.requirements.mustUseGeneration } : {}) };
}

for (const scenario of scenarios) {
  const result = civic47.scoreDecision(scenario, validOutput(scenario));
  assert.strictEqual(result.pass, true, `${scenario.scenarioId} should pass its synthetic reference output: ${result.reasons.join('; ')}`);
}

const wrongCycle = validOutput(parade);
wrongCycle.claims[0].occurredCycle = 120;
const wrongGeo = civic47.scoreDecision(parade, wrongCycle);
assert.strictEqual(wrongGeo.pass, false, 'discovery cycle cannot replace actual occurred cycle');
assert.strictEqual(wrongGeo.checks.temporalAndGeographic, false);
const wrongDistrictAction = validOutput(parade);
wrongDistrictAction.actions.push({ actionId: 'a-d1-response' });
assert.strictEqual(civic47.scoreDecision(parade, wrongDistrictAction).checks.actionAuthority, false,
  'ambiguous geography cannot authorize a different district action');

const fabricated = validOutput(byId('SYN-C47-STABLE-POSITIVE'));
fabricated.claims.push({ text: 'Unsupported synthetic claim', evidenceIds: ['not-visible'] });
const fabricatedResult = civic47.scoreDecision(byId('SYN-C47-STABLE-POSITIVE'), fabricated);
assert.strictEqual(fabricatedResult.pass, false, 'invisible retrieval must not receive grounding credit');
assert.strictEqual(fabricatedResult.checks.noUnsupportedClaims, false);

const unavailable = byId('SYN-C47-UNAVAILABLE-RESOURCE');
const dependentAction = validOutput(unavailable);
dependentAction.actions.push({ actionId: 'a-resource-dependent', status: 'executed' });
assert.strictEqual(civic47.scoreDecision(unavailable, dependentAction).pass, false,
  'unavailable evidence defers dependent action while preserving independent action');

const vote = byId('SYN-C47-BINDING-VOTE');
const voteIgnored = validOutput(vote);
voteIgnored.claims = voteIgnored.claims.filter(c => c.kind !== 'binding-vote');
assert.strictEqual(civic47.scoreDecision(vote, voteIgnored).pass, false, 'binding vote cannot be treated as optional direction');

const corrected = byId('SYN-C47-SAME-CYCLE-UPDATE');
const staleGeneration = validOutput(corrected);
staleGeneration.inputGeneration = 'syn-gen-12a';
assert.strictEqual(civic47.scoreDecision(corrected, staleGeneration).pass, false, 'same-cycle refresh invalidates the prior generation');

const clean = byId('SYN-C47-STABLE-POSITIVE');
const cleanOut = JSON.stringify(validOutput(clean));
const receipt = civic47.makeReceipt({ scenario: clean, model: 'provider/model-x', provider: 'synthetic',
  requestedModel: 'provider/model-x', answeredModel: 'provider/model-x', inputSha256: serializedA.sha256,
  startedAt: '2026-11-01T00:00:00.000Z', elapsedMs: 20, finishReason: 'stop',
  usage: { inputTokens: 1234, outputTokens: 456, reasoningTokens: 12 }, output: cleanOut });
assert.strictEqual(receipt.usage.inputTokens, 1234);
assert.strictEqual(receipt.costUsd, null, 'unknown cost stays null');
assert.strictEqual(receipt.providerProfile, null, 'unverified provider profile stays explicitly absent');
assert.strictEqual(civic47.scoreReceipt(receipt).pass, false, 'unknown cost cannot pass budget/cost acceptance');
assert(civic47.scoreReceipt(receipt).reasons.includes('cost is unknown'));
const mismatch = civic47.makeReceipt({ scenario: clean, model: 'provider/model-x', provider: 'synthetic',
  requestedModel: 'provider/model-x', answeredModel: 'provider/fallback-y', finishReason: 'stop',
  usage: { inputTokens: 1, outputTokens: 1 }, costUsd: 0, output: cleanOut });
assert.strictEqual(civic47.scoreReceipt(mismatch).pass, false, 'silent fallback fails receipt acceptance');
const truncated = civic47.makeReceipt({ scenario: clean, model: 'provider/model-x', provider: 'synthetic',
  requestedModel: 'provider/model-x', answeredModel: 'provider/model-x', finishReason: 'length',
  usage: { inputTokens: 1, outputTokens: 1 }, costUsd: 0, output: cleanOut });
assert.strictEqual(civic47.scoreReceipt(truncated).pass, false, 'truncated output cannot pass as complete');
const errored = civic47.makeReceipt({ scenario: clean, model: 'provider/model-x', provider: 'synthetic',
  requestedModel: 'provider/model-x', answeredModel: 'provider/model-x', finishReason: null,
  usage: { inputTokens: 0, outputTokens: 0 }, error: 'synthetic transport failure' });
assert.strictEqual(errored.outputValid, false, 'transport error cannot become empty success');

console.log(`civic47ModelFitOffline.test.js: PASS (${scenarios.length} scenarios; grounding, age/geography, dependencies, receipts)`);
