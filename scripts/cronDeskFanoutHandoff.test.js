#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  stageStem,
  nameSlug,
  writerArtifactTag,
  evaluationStem,
  validateAngleEvaluationOptions,
  validatePackageEvaluationOptions,
  selectTypedSlice,
  buildWriterArgs,
  activateWakeContext,
  stageRoute,
  validateWakeHandoff,
} = require('./cron-desk-run');
const { buildOutputSlug } = require('./cron-desk-writer');

const rosterAssignment = {
  name: 'Dr. Lila Mezran',
  desk: 'civic',
  persona: null,
};
const rosterTag = writerArtifactTag(rosterAssignment, null);
assert.strictEqual(rosterTag, 'dr-lila-mezran');
const rosterArgs = buildWriterArgs(
  'civic',
  'output/cron-compare/civic.state.md',
  null,
  rosterTag
);
assert.deepStrictEqual(
  rosterArgs.slice(1),
  [
    '--desk', 'civic',
    '--state-file', 'output/cron-compare/civic.state.md',
    '--artifact-tag', 'dr-lila-mezran',
    '--provider', 'openrouter',
    '--model', 'deepseek/deepseek-chat',
  ]
);

const expectedRosterDraft =
  stageStem(102, 'civic', rosterTag) + 'deepseek-deepseek-chat.md';
const emittedRosterDraft =
  'civic_c102_' +
  buildOutputSlug(null, rosterTag, 'deepseek-deepseek-chat') +
  '.md';
assert.strictEqual(emittedRosterDraft, expectedRosterDraft);

const personaAssignment = {
  name: 'Jax Caldera',
  desk: 'civic',
  persona: 'freelance-firebrand',
};
assert.strictEqual(
  writerArtifactTag(personaAssignment, personaAssignment.persona),
  null
);
const personaArgs = buildWriterArgs(
  'civic',
  'output/cron-compare/civic.state.md',
  personaAssignment.persona,
  null
);
assert.deepStrictEqual(
  personaArgs.slice(1),
  [
    '--desk', 'civic',
    '--state-file', 'output/cron-compare/civic.state.md',
    '--persona', 'freelance-firebrand',
    '--provider', 'openrouter',
    '--model', 'meta-llama/llama-3.3-70b-instruct',
  ]
);

const livePackageRoute = require('./newsroomWakePackages')
  .routeFor(require('./newsroomWakePackages').loadPackages()['freelance-firebrand'], 'write');
const packagedPersonaArgs = buildWriterArgs(
  'civic',
  'output/cron-compare/civic.state.json',
  personaAssignment.persona,
  'packet-v2',
  livePackageRoute
);
assert.deepStrictEqual(
  packagedPersonaArgs.slice(1),
  [
    '--desk', 'civic',
    '--state-file', 'output/cron-compare/civic.state.json',
    '--persona', 'freelance-firebrand',
    '--artifact-tag', 'packet-v2',
    '--provider', 'openrouter',
    '--model', 'anthropic/claude-sonnet-5',
  ]
);
const sonnetSlug = 'anthropic-claude-sonnet-5';
const expectedPackagedDraft =
  stageStem(102, 'civic', personaAssignment.persona) +
  'packet-v2_' + sonnetSlug + '.md';
const emittedPackagedDraft =
  'civic_c102_' +
  buildOutputSlug(
    personaAssignment.persona,
    'packet-v2',
    sonnetSlug
  ) +
  '.md';
assert.strictEqual(emittedPackagedDraft, expectedPackagedDraft);
// Firebrand routes to llama-3.3-70b (heat seat); slug must match desk-model-map.
const firebrandSlug = 'meta-llama-llama-3-3-70b-instruct';
const expectedPersonaDraft =
  stageStem(102, 'civic', personaAssignment.persona) +
  firebrandSlug + '.md';
const emittedPersonaDraft =
  'civic_c102_' +
  buildOutputSlug(
    personaAssignment.persona,
    null,
    firebrandSlug
  ) +
  '.md';
assert.strictEqual(emittedPersonaDraft, expectedPersonaDraft);

assert.strictEqual(writerArtifactTag(null, null), null);
assert.strictEqual(nameSlug(' Farrah Del Rio '), 'farrah-del-rio');
assert.strictEqual(
  evaluationStem('sports_c103_anthony-raines_packet-v2_', 'Llama 3.3'),
  'sports_c103_anthony-raines_packet-v2_benchmark-llama-3-3_'
);
assert.throws(() => evaluationStem('sports_c103_', '---'), /evaluation tag/);
assert.throws(() => validateAngleEvaluationOptions({ model: 'model-only' }), /supplied together/);
assert.throws(() => validateAngleEvaluationOptions({
  model: 'meta-llama/llama-3.3-70b-instruct', tag: 'llama', stage: 'write',
  packetContract: 'v2', noGate: true, fanout: false,
}), /requires --stage=angle/);
assert.throws(() => validateAngleEvaluationOptions({
  model: 'meta-llama/llama-3.3-70b-instruct', tag: 'llama', stage: 'angle',
  packetContract: 'v2', noGate: true, fanout: true,
}), /forbids --fanout/);
assert.strictEqual(validateAngleEvaluationOptions({
  model: 'meta-llama/llama-3.3-70b-instruct', tag: 'llama', stage: 'angle',
  packetContract: 'v2', noGate: true, fanout: false,
}), true);
assert.throws(() => validatePackageEvaluationOptions({ packageKey: 'hal-richmond',
  tag: null, stage: 'report', noGate: true, fanout: false }), /requires --evaluation-tag/);
assert.throws(() => validatePackageEvaluationOptions({ packageKey: 'hal-richmond',
  tag: 'deepseek', stage: 'report', noGate: true, fanout: true }), /forbids --fanout/);
assert.strictEqual(validatePackageEvaluationOptions({ packageKey: 'hal-richmond',
  tag: 'deepseek', stage: 'write', noGate: true, fanout: false }), true);
const halTypedSlice = { kind: 'hal-archive', empty: false };
assert.strictEqual(selectTypedSlice([null, { empty: true }, halTypedSlice]), halTypedSlice);
assert.throws(
  () => writerArtifactTag({ name: '---' }, null),
  /no usable reporter name/
);
assert.throws(
  () => writerArtifactTag({ name: 'a'.repeat(49) }, null),
  /exceeds the writer tag contract/
);

const liveContext = activateWakeContext(personaAssignment, personaAssignment.persona);
assert.equal(liveContext.packetContract, 'v2');
assert.equal(liveContext.wakePackage.version, 'JAX-LEP2-1');
assert.equal(stageRoute('civic', personaAssignment.persona, 'angle').model,
  'meta-llama/llama-3.3-70b-instruct');
assert.equal(stageRoute('civic', personaAssignment.persona, 'write').model,
  'anthropic/claude-sonnet-5');

const jordanAssignment = {
  name: 'Jordan Velez',
  popid: 'POP-00153',
  desk: 'business',
  beatDomain: 'ECONOMIC',
  persona: 'business-desk',
};
const jordanContext = activateWakeContext(jordanAssignment, jordanAssignment.persona);
assert.equal(jordanContext.packetContract, 'v2');
assert.equal(jordanContext.wakePackage.version, 'JORDAN-LEP2-1');
for (const file of ['IDENTITY.md', 'LENS.md', 'RULES.md']) {
  assert.ok(fs.existsSync(path.join(__dirname, '..', '.claude', 'agents',
    jordanAssignment.persona, file)), 'Jordan control-plane identity missing ' + file);
}
assert.equal(stageRoute('business', jordanAssignment.persona, 'angle').model,
  'deepseek/deepseek-chat');
assert.equal(stageRoute('business', jordanAssignment.persona, 'report').model,
  'deepseek/deepseek-chat');
assert.equal(stageRoute('business', jordanAssignment.persona, 'write').model,
  'deepseek/deepseek-chat');

const kaiAssignment = {
  name: 'Kai Marston',
  popid: 'POP-00158',
  desk: 'culture',
  beatDomain: 'CULTURE',
  persona: 'kai-marston',
};
const kaiContext = activateWakeContext(kaiAssignment, kaiAssignment.persona);
assert.equal(kaiContext.packetContract, 'v2');
assert.equal(kaiContext.wakePackage.version, 'KAI-LEP2-1');
assert.equal(stageRoute('culture', kaiAssignment.persona, 'angle').model,
  'meta-llama/llama-3.3-70b-instruct');
assert.equal(stageRoute('culture', kaiAssignment.persona, 'report').model,
  'meta-llama/llama-3.3-70b-instruct');
assert.equal(stageRoute('culture', kaiAssignment.persona, 'write').model,
  'meta-llama/llama-3.3-70b-instruct');

const lilaAssignment = {
  name: 'Dr. Lila Mezran', popid: 'POP-00154', desk: 'civic',
  beatDomain: 'HEALTH', persona: 'lila-mezran',
};
const lilaContext = activateWakeContext(lilaAssignment, lilaAssignment.persona);
assert.equal(lilaContext.packetContract, 'v2');
assert.equal(lilaContext.wakePackage.version, 'LILA-LEP2-1');
assert.equal(stageRoute('civic', lilaAssignment.persona, 'angle').model,
  'deepseek/deepseek-chat');
assert.equal(stageRoute('civic', lilaAssignment.persona, 'report').model,
  'deepseek/deepseek-chat');
assert.equal(stageRoute('civic', lilaAssignment.persona, 'write').model,
  'deepseek/deepseek-chat');

const angelaAssignment = {
  name: 'Angela Reyes', popid: 'POP-00156', desk: 'civic',
  beatDomain: 'EDUCATION', persona: 'angela-reyes',
};
const angelaContext = activateWakeContext(angelaAssignment, angelaAssignment.persona);
assert.equal(angelaContext.packetContract, 'v2');
assert.equal(angelaContext.wakePackage.version, 'ANGELA-LEP2-1');
for (const file of [
  path.join(__dirname, '..', 'docs', 'media', 'voices', 'angela_reyes.md'),
  path.join(__dirname, '..', 'docs', 'media', 'ANGELA_EDUCATION_BAG.md'),
  path.join(__dirname, '..', 'docs', 'mara-vance', 'AGENT_INVENTORY.md'),
]) {
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'),
    /\bOUSD\b|Oakland Unified|Laurel Elementary|real Oakland school geography/i,
    'Angela active newsroom source carries a real-world school reference: ' + file);
}
assert.equal(stageRoute('civic', angelaAssignment.persona, 'angle').model,
  'deepseek/deepseek-chat');
assert.equal(stageRoute('civic', angelaAssignment.persona, 'report').model,
  'deepseek/deepseek-chat');
assert.equal(stageRoute('civic', angelaAssignment.persona, 'write').model,
  'deepseek/deepseek-chat');

const noahAssignment = {
  name: 'Noah Tan', popid: 'POP-00157', desk: 'civic',
  beatDomain: 'ENVIRONMENT', persona: 'noah-tan',
};
const noahContext = activateWakeContext(noahAssignment, noahAssignment.persona);
assert.equal(noahContext.packetContract, 'v2');
assert.equal(noahContext.wakePackage.version, 'NOAH-LEP2-1');
assert.equal(stageRoute('civic', noahAssignment.persona, 'angle').model,
  'deepseek/deepseek-chat');
assert.equal(stageRoute('civic', noahAssignment.persona, 'write').model,
  'deepseek/deepseek-chat');

const handoffAngle = {
  stage: 'angle', cycle: '103', persona: 'luis-navarro', packetContract: 'v2',
  reporter: { name: 'Luis Navarro', popid: 'POP-00636' },
  assignment: { story: { ref: 'TEST-SIGNAL', label: 'Test signal' }, approach: 'Test approach' },
  ranAt: '2026-08-13T11:16:54.979Z',
};
const handoffPacket = {
  stage: 'report', cycle: '103', persona: 'luis-navarro', packetContract: 'v2',
  reporter: { name: 'Luis Navarro', popid: 'POP-00636' },
  assignment: { story: { ref: 'TEST-SIGNAL', label: 'Test signal' } },
  angle: 'output/cron-compare/civic_c103_luis-navarro_packet-v2_angle.json',
  ranAt: '2026-08-13T18:16:09.946Z',
};
const handoffExpected = {
  cycle: '103', persona: 'luis-navarro',
  reporter: { name: 'Luis Navarro', popid: 'POP-00636' },
  anglePath: 'output/cron-compare/civic_c103_luis-navarro_packet-v2_angle.json',
};
assert.equal(validateWakeHandoff(handoffAngle, handoffPacket, handoffExpected), true);
assert.throws(() => validateWakeHandoff(handoffAngle,
  Object.assign({}, handoffPacket, { ranAt: '2026-08-12T18:16:09.946Z' }),
  handoffExpected), /not newer than angle/);
assert.throws(() => validateWakeHandoff(handoffAngle,
  Object.assign({}, handoffPacket, { reporter: { name: 'Wrong', popid: 'POP-99999' } }),
  handoffExpected), /reporter POPID mismatch/);
assert.throws(() => validateWakeHandoff(handoffAngle,
  Object.assign({}, handoffPacket, { assignment: { story: { ref: 'TEST-OTHER' } } }),
  handoffExpected), /assigned story mismatch/);

console.log('cron fan-out filename handoff tests: PASS');
