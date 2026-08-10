#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  stageStem,
  nameSlug,
  writerArtifactTag,
  buildWriterArgs,
  activateWakeContext,
  stageRoute,
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

console.log('cron fan-out filename handoff tests: PASS');
