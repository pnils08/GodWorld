#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  stageStem,
  nameSlug,
  writerArtifactTag,
  buildWriterArgs,
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
  ]
);
const expectedPersonaDraft =
  stageStem(102, 'civic', personaAssignment.persona) +
  'deepseek-deepseek-chat.md';
const emittedPersonaDraft =
  'civic_c102_' +
  buildOutputSlug(
    personaAssignment.persona,
    null,
    'deepseek-deepseek-chat'
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

console.log('cron fan-out filename handoff tests: PASS');
